---
title: "MLOps for Activity-Aware Jira Ranking: From Features to Reliable Predictions"
description: "Design feature pipelines, point-in-time feature stores, reproducible ML releases, orchestration, and monitoring for Jira issue inference and timesheet ranking."
date: "2024-10-01"
updated: "2026-10-28"
slug: mlops-production-systems
tags: ["machine-learning", "mlops", "feature-stores", "ranking"]
draft: false
featured: false
---

A timesheet suggestion can fail while every service returns HTTP 200. The model loads, the feature lookup succeeds, and the ranker emits scores—but the activity features are stale, the candidate list contains an inaccessible issue, or a training join quietly included information that did not exist at prediction time.

MLOps is the engineering discipline that makes those failure modes observable and recoverable. It connects the meaning of an event to the meaning of a deployed prediction.

My engineering experience includes collecting activity signals from Jira, Google Calendar, and IDEs; building learning-to-rank and time-awareness models; implementing feature pipelines in Tecton for training and inference; and productionizing models with Airflow, SageMaker, and AWS monitoring dashboards. The application context here is **inferring the active Jira issue from activity signals, then ranking timesheet suggestions**.

The architecture, feature names, SLAs, pseudocode, and experiments below are illustrative designs for that problem. They do not reproduce private infrastructure, use customer data, or describe actual incidents.

## The system has five responsibilities

It helps to separate responsibilities before choosing products:

| Component               | Responsibility                                                           | A failure it must make visible                                          |
| ----------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| Feature pipeline        | Turn source records into versioned, meaningful measurements              | Duplicate events inflate recent activity                                |
| Feature store           | Make feature definitions and their historical/serving semantics reusable | Offline values disagree with what serving could retrieve                |
| ML pipeline             | Produce an evaluated, traceable candidate release                        | A new ranker improves the aggregate but regresses for a customer cohort |
| Orchestrator            | Coordinate work, dependencies, retries, and resource use                 | A retry reads different input and publishes a different artifact        |
| Monitoring and response | Detect problems and select a justified intervention                      | Freshness breaks, but the response incorrectly retrains the model       |

A feature pipeline is not the same thing as a training pipeline. User activity may need updating more frequently than model parameters. The model can remain unchanged while its input state changes thousands of times.

[![A reference architecture connects activity events to versioned feature pipelines, historical and online feature views, training and serving, and feedback monitoring.](/posts/mlops-production-systems/architecture.svg)](/posts/mlops-production-systems/architecture.svg)

_Figure 1. An illustrative separation of the data path and the training control path. The orange arrow represents promoting a compatible model/feature release, not copying training data into the request service. Open the figure for a larger view._

**Key point:** operate the data, feature, model, and deployment lifecycles separately, while giving them explicit compatibility contracts.

## 1. Define the prediction contract

Let a request contain user $u$, organization $o$, activity context $a$, and decision time $t$. We want to infer a likely Jira issue and rank eligible timesheet suggestions.

A candidate scorer might have the form

$$
s_\theta(u,i,a,t)=f_\theta\left(\phi_u(t),\phi_i(t),\phi_{u,i}(t),\phi_a(t)\right).
$$

The feature groups represent user history, issue state, user–issue relationships, and the current activity window. The candidate set is

$$
\mathcal C(u,o,t)=\{i:\operatorname{visible}(u,i,t)\land\operatorname{eligible}(i,t)\}.
$$

Eligibility is a product and authorization decision; a score does not grant access. Organization and Jira-instance identity must be part of entity keys. A bare issue number or account ID is not necessarily globally unique.

Previously worked issues remain relevant. A person can continue the same ticket across multiple days. This is different from recommending an unwatched movie: blindly removing training-history issues can remove the correct answer.

Decide what the label means. An explicitly confirmed issue assignment is stronger evidence than a displayed suggestion. A suggestion shown but ignored is not necessarily a verified negative. Corrections and edits need their own semantics. Define an attribution window and preserve the original prediction ID when attaching a later outcome.

The ranking and label-design discussion in [my recommendation-system article](/recomendation/) complements the operational design here.

## 2. Feature pipelines are temporal data products

### Write a feature contract before a transformation

An illustrative contract might look like this:

```yaml
name: user_issue_activity_count_30m
version: 3
entity_keys: [organization_id, jira_instance_id, user_id, issue_id]
value_type: int64
window: "[prediction_time - 30 minutes, prediction_time)"
event_time_field: event_time
source_record_key: [source, source_event_id, source_revision]
missing_semantics: "unknown if source coverage is incomplete"
zero_semantics: "complete coverage, no matching event"
owner: example-ranking-team
```

This is a design example, not a Tecton SDK configuration. It specifies the meaning of the number rather than only its storage type.

| Example feature                                             | Why it may help                              | Important constraint                                         |
| ----------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------ |
| Recent user–issue interaction count                         | Captures local continuity of work            | Deduplicate retries and define the event-time window         |
| Time since the user's last issue interaction                | Captures recency                             | Preserve unknown separately from a long elapsed time         |
| Semantic similarity between activity context and issue text | Helps infer an issue without an explicit key | Version the encoder and issue-text snapshot together         |
| Issue assignment or workflow state                          | Constrains plausibility                      | Reconstruct state as of the request, not today's state       |
| Calendar/IDE source coverage                                | Indicates confidence in the context          | Missing integrations must not look like confirmed inactivity |

Not every signal should be persisted in raw form. Collect only what the application needs, restrict access, and prefer bounded, purpose-specific derived features where possible. Deletion and retention rules must propagate to derived datasets and training eligibility.

### Event time is not availability time

At minimum, distinguish:

- **Event time:** when the source says something happened.
- **Availability time:** when the pipeline could first use that source record or revision.
- **Publication time:** when a particular feature value became available to serving.

For a 30-minute count, an information-correct reconstruction at time $t$ includes records satisfying

$$
t-30\text{ min}\le t_{\mathrm{event}}<t,
\qquad t_{\mathrm{available}}\le t.
$$

That is necessary but may not reproduce the served feature exactly: a record can be available upstream but not yet incorporated into an online materialization.

Consider a prediction at **10:05**. All rows below belong to the same illustrative user–issue pair and count as one event:

| Event time | Available upstream | First reflected in serving | Include in an exact 10:05 serving replay? |
| ---------- | ------------------ | -------------------------- | ----------------------------------------- |
| 10:01      | 10:02              | 10:03                      | Yes                                       |
| 10:03      | 10:09              | 10:10                      | No: late arrival                          |
| 10:06      | 10:06              | 10:07                      | No: future event                          |
| 10:04      | 10:04:30           | 10:06                      | No: not published yet                     |

An event-time-only reconstruction after all records arrive counts three pre-decision events. An availability-aware recomputation counts two. The exact serving replay counts one.

These are three different datasets, even though each can be called “historical features.” Choose deliberately between a hindsight-corrected history and an as-served history; record which one trained the model.

### Handle revisions and backfills deliberately

An event ID prevents duplicate delivery from being counted twice. It does not by itself handle an edited event. Preserve revisions or change records so that a replay can select the latest revision available by the historical cutoff.

Backfills should read frozen input snapshots, write to a versioned namespace, and reconcile counts before publication. A historical backfill should not overwrite a newer online value simply because it finished later. Publication needs an explicit version and ordering policy.

**Key point:** a correct feature value is a function of identity, time, source availability, and transformation version—not merely a SQL expression.

## 3. A feature store is a consistency boundary

An offline store supports historical joins and large training reads. An online store supports bounded-latency lookup for current inference. A feature platform can also manage definitions, materialization, lineage, and observability. [Tecton's conceptual documentation](https://docs.tecton.ai/docs/concepts/tecton-concepts) describes feature views and feature services spanning these use cases.

Shared definitions reduce duplication, but they do not automatically prove online/offline equality. Check the retrieval contract, aggregation boundaries, TTL behavior, data availability, and materialization schedule. Tecton's [offline retrieval documentation](https://docs.tecton.ai/docs/1.1/reading-feature-data/reading-feature-data-for-training/offline-retrieval-methods) illustrates why historical validity must account for what an online lookup would have returned.

### Build point-in-time joins over published feature versions

For a feature log that records serving-visible versions, the following conceptual SQL selects a compatible value per request and candidate:

```sql
WITH eligible_versions AS (
  SELECT
    r.request_id, r.candidate_issue_id,
    f.value, f.published_at, f.revision,
    ROW_NUMBER() OVER (
      PARTITION BY r.request_id, r.candidate_issue_id
      ORDER BY f.published_at DESC, f.revision DESC
    ) AS position
  FROM prediction_requests r
  LEFT JOIN feature_versions f
    ON f.organization_id = r.organization_id
   AND f.user_id = r.user_id
   AND f.issue_id = r.candidate_issue_id
   AND f.feature_set_version = :feature_set_version
   AND f.effective_at <= r.prediction_time
   AND f.published_at <= r.prediction_time
   AND f.expires_at > r.prediction_time
)
SELECT * FROM eligible_versions WHERE position = 1;
```

This assumes each feature version has a unique ordering key, a non-null expiry, and a source-to-feature history that already respects record availability. A join cannot reconstruct publication facts that were never logged. In a multi-instance deployment, include Jira-instance identity in the actual keys too.

### Distinguish freshness, completeness, and expiry

A freshly published count may be based on an upstream source that stopped sending events. A long-idle user may have old event timestamps while the feature pipeline is perfectly healthy.

Monitor multiple ages:

$$
\begin{aligned}
\text{publication age} &= t_{\mathrm{request}}-t_{\mathrm{published}},\\
\text{source progress lag} &= t_{\mathrm{request}}-t_{\mathrm{source\ watermark}}.
\end{aligned}
$$

A source watermark is a statement about progress/completeness under a lateness policy, not necessarily the last event observed for that user. Explain that policy and the handling of idle sources.

TTL is an expiry rule. It is not a freshness guarantee. If a feature is present, stale, or absent, serving still needs a defined response: use a missingness-aware model path, a compatible baseline, or suppress an unreliable suggestion. Returning zero for every failed lookup silently changes feature semantics.

### Test parity with an explicit error budget

For a sampled request with logged served value $x^{\mathrm{online}}_{rj}$ and replay value $x^{\mathrm{replay}}_{rj}$, measure

$$
\operatorname{mismatch}_j=
\frac{1}{N}\sum_{r=1}^{N}
\mathbb{1}\left[|x^{\mathrm{online}}_{rj}-x^{\mathrm{replay}}_{rj}|>\epsilon_j\right].
$$

Compare presence/missingness separately. Use exact equality for integers and categories; choose tolerances for floating-point transformations intentionally. Segment by feature version, integration, and serving path. A global average can hide a broken source affecting a small customer cohort.

**Key point:** test the feature values the model actually saw, including missingness and timing.

## 4. The ML pipeline should produce a release bundle

A repeatable pipeline binds a prediction problem to an evaluated artifact:

1. Freeze source and label snapshots.
2. Construct point-in-time features with a pinned feature-set version.
3. Split by decision time and appropriate user/organization boundaries.
4. Fit preprocessing on training data only, then train the ranker.
5. Evaluate retrieval, issue inference, ranking, and operational constraints.
6. Register an immutable candidate with evidence and compatibility metadata.
7. Promote through a controlled rollout.

The [Google MLOps architecture guide](https://cloud.google.com/architecture/mlops-continuous-delivery-and-automation-pipelines-in-machine-learning) separates continuous integration, delivery, and training. Automating training is useful; automatically releasing every successful training job is a different and riskier policy.

### Respect label maturity and request boundaries

If a timesheet association is finalized after a horizon $H$ and a delay allowance $L$, a simple fixed-horizon dataset builder includes only requests satisfying

$$
t_{\mathrm{decision}}+H+L\le t_{\mathrm{snapshot}}.
$$

If records can still arrive later, treat the allowance as a documented approximation and measure residual incompleteness. Recent requests with no confirmed outcome are not automatically negatives.

Keep every candidate for a ranking request in the same split. Otherwise, pairwise or listwise losses can learn from part of the evaluation request. Time-aware evaluation should reconstruct issue text, permissions, candidate eligibility, and user history as of each request. Evaluate new-user and new-organization cohorts separately when those are deployment requirements.

### Version more than the weights

A release manifest should identify:

```yaml
# Illustrative logical manifest; values below are example identifiers.
release_id: jira-ranker-example-017
training_snapshot: activity-snapshot-2026-09-01
label_snapshot: confirmed-issue-links-example-004
feature_set_version: activity-features-v3
issue_encoder_version: issue-text-encoder-v2
candidate_policy_version: authorized-issues-v4
code_revision: example-commit-id
container_digest: example-image-digest
model_artifact: immutable-example-model-reference
label_definition_version: confirmed-issue-association-v2
```

Persist preprocessing, normalization, tokenizer/encoder versions, and dependencies too. Record seeds and resource settings; some parallel or GPU computations still have nondeterministic behavior, so “reproducible” may mean bounded numerical agreement rather than byte-identical weights.

[MLflow's registry workflow](https://mlflow.org/docs/latest/ml/model-registry/workflow/) supports model versions and aliases. An alias is a useful routing reference, but it is mutable. Resolve it to an exact model version for the deployment record, and bind the compatible feature and preprocessing versions alongside it.

### Release gates should describe decisions

| Gate                  | Example requirement                                                                    | If it fails                              |
| --------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------- |
| Data integrity        | No cross-organization key collisions; no future feature publications in training rows  | Stop before training or registration     |
| Candidate quality     | Correct issues are retrievable within the authorized candidate set                     | Fix retrieval or eligibility logic       |
| Model quality         | Top-1, Top-5, MRR/NDCG and important cohort results meet a predeclared comparison rule | Keep the current release                 |
| Serving compatibility | Feature schema, encoder, and model signatures agree                                    | Reject deployment                        |
| Reliability           | Measured latency, missing-feature rate, and fallback behavior meet budgets             | Reduce workload or repair the path       |
| Rollout evidence      | Canary guardrails and matured outcomes remain acceptable                               | Pause or roll back the compatible bundle |

No numerical thresholds here are production SLAs. Derive budgets from the product's risk, traffic, outcome delays, and operational capacity.

**Key point:** promote the exact model/feature/encoder/candidate-policy combination that was evaluated.

## 5. Orchestration makes failure semantics explicit

Airflow can coordinate cross-system batch dependencies; an ML-native workflow can coordinate training-specific jobs. [SageMaker Pipelines](https://docs.aws.amazon.com/sagemaker/latest/dg/pipelines.html) is one such service. If both are used, define a single owner for each dependency and retry policy. Two orchestrators repeatedly restarting the same training job do not make the system more reliable.

A logical batch flow is:

```text
source snapshots → source validation → historical features
                                      ↓
label snapshot → mature request set → training dataset
                                      ↓
                               train → evaluate → register
                                                   ↓
                                           approval / rollout
```

A near-real-time feature path runs independently. Do not place Airflow in the synchronous request path, and do not wait for retraining to refresh a user's activity state.

### Idempotence is a publication property

Define a logical run key using immutable inputs:

$$
K=\operatorname{hash}(\text{code revision},\text{input manifests},
\text{feature version},\text{interval},\text{parameters}).
$$

Write outputs to an attempt-specific staging location. Validate them, then publish a small manifest or transactional pointer once. A retry with the same logical key should reuse or deterministically replace the same logical output, rather than append a duplicate dataset or register another supposedly distinct model.

An object store does not provide a general atomic rename for a directory of objects. Implement publication with supported conditional writes, a transactional metadata system, or a documented table-format commit mechanism. Cleanup of abandoned attempts is a separate task.

[Airflow's best practices](https://airflow.apache.org/docs/apache-airflow/stable/best-practices.html) recommend retry-safe tasks and explicit input partitions rather than reading whatever happens to be “latest.” Use XCom-like mechanisms for small references, with datasets in appropriate shared storage.

### A scheduler success is not a data-readiness proof

Track the logical interval, source snapshot, watermark, validation result, and publication manifest. Distinguish **no events for a complete interval** from **an interval whose source is missing**.

Retries help transient failures. They cannot fix an incompatible schema, invalid permissions, or a permanently incomplete source. Bound retries, set timeouts, and make the failure actionable. Backfills need separate concurrency and resource budgets so they do not starve current feature updates or create a cascade of model releases.

## 6. Monitor the path, the prediction, and the outcome

A healthy CPU graph says very little about ranking quality.

| Layer           | Signals                                                              | Likely first response                                         |
| --------------- | -------------------------------------------------------------------- | ------------------------------------------------------------- |
| Service         | Error rate, latency, timeouts, fallback frequency                    | Investigate serving or dependencies                           |
| Feature health  | Missingness, source coverage, publication age, watermark lag, parity | Repair the source/materialization path                        |
| Distribution    | Feature histograms, categorical mix, score distribution              | Segment and investigate; do not equate drift with degradation |
| Model quality   | Matured Top-1, Top-5, MRR/NDCG, calibration where relevant           | Compare cohorts and release versions                          |
| Product outcome | Confirmed suggestions, corrections, successful timesheet completion  | Test whether the serving policy improves the user task        |

A ranking score is not necessarily a probability. Log loss or calibration metrics make sense only for an explicitly probabilistic target and suitable model output. For issue ranking, Top-$K$, rank-based metrics, and candidate recall are usually more direct; monitor them under a clear label and candidate-set definition.

For each sampled prediction, retain the minimum trace needed to connect outcomes to the decision: request ID, decision time, exact model/release versions, candidate-policy version, selected issue IDs, relevant feature-version/freshness information, and fallback state. Limit raw content logging, enforce tenant boundaries, and control retention.

### A synthetic experiment: drift, feature failure, and delayed labels

The following experiment isolates three things that are often conflated. It is a **binary prediction surrogate**, not a production ranker or a production replay.

For 60 days and 4,000 requests per day, generate $x\sim\mathcal N(0,1)$ and

$$
Y\sim\operatorname{Bernoulli}(\sigma(1.5x)).
$$

The healthy model uses the correct conditional probability. A separate monitored context feature has no effect on the label or prediction:

- On day 15, only that context feature's mean changes from 0 to 1.2.
- During days 30–39, an injected assembly defect changes the predictive input to $x-1.5$. Independently, the simulation raises the distribution of feature publication ages to make an operational signal visible.
- On day 40, both injected faults are removed.
- Every outcome becomes observable exactly seven days after prediction.

The age increase and input corruption are deliberately injected together; the plot does not claim that feature age causes a particular log-loss increase. The experiment demonstrates observability timing, not a learned relationship between staleness and error.

[![Three panels show a benign context shift on day 15, higher feature ages during days 30–39, and a log-loss increase whose label-based confirmation appears seven days later.](/posts/mlops-production-systems/monitoring-lag.svg)](/posts/mlops-production-systems/monitoring-lag.svg)

_Figure 2. Shading marks the injected incident. The solid quality curve is available retrospectively; the dashed curve shows when that same daily cohort's loss becomes observable. The rightmost outcomes arrive after the 60-day request-generation window._

<!-- MLOPS_TABLE_START -->

| Period (event days)        | Context mean | Mean daily p95 age (min) | Mean daily log loss |
| -------------------------- | ------------ | ------------------------ | ------------------- |
| Baseline (0–14)            | -0.004       | 1.78                     | 0.529               |
| Context shift only (15–29) | 1.203        | 1.78                     | 0.529               |
| Injected incident (30–39)  | 1.204        | 44.62                    | 0.944               |
| Recovered (40–59)          | 1.196        | 1.78                     | 0.525               |

<!-- MLOPS_TABLE_END -->

_Values are from one seeded synthetic run. The age column is the average of daily p95 ages, not a pooled p95. These are not customer measurements or service-level targets._

The benign context shift leaves mean loss essentially unchanged. The operational fault is detectable before its fully labeled outcome cohort is available. Waiting only for model-quality metrics therefore creates a blind period; retraining on immature labels creates a different problem.

A production dashboard should show both event-time cohort quality and the time at which that cohort became observable. Include label coverage, maturity, and sample size. Otherwise, a sudden improvement can simply mean that slow or difficult cases have not yet been labeled.

### Drift should trigger diagnosis, not an unconditional retrain

Changing $P(X)$ does not necessarily mean $P(Y\mid X)$ changed. A histogram alarm can reflect a seasonal workload, a new integration, an instrumentation change, or a harmless shift in a weak feature. Conversely, conditional performance can deteriorate without an obvious marginal input shift.

Use fixed, versioned histogram bins for comparable distribution summaries, distinguish missingness from numeric values, and inspect cohorts. Statistical significance alone can over-alert at high volume; require an effect size, persistence rule, and owner. Repeated comparisons across many features need an alerting strategy that accounts for the resulting noise.

Retrain when evidence supports a modeling or population-adaptation problem, suitable mature training data exist, and the candidate passes evaluation. A broken event feed calls for a data-path repair, not a new model trained on broken features.

**Key point:** monitoring is useful when each signal connects to a diagnosis and a bounded response.

## 7. Incident response needs compatible rollback

For an illustrative spike in wrong Jira issue suggestions:

1. **Contain:** pause a new rollout or activate a documented fallback when an explicit trigger fires.
2. **Locate:** compare candidate eligibility/recall, feature coverage and parity, source freshness, and quality by release and integration.
3. **Repair the failing layer:** restore a materialization job for a stale feature; fix a permission filter for an eligibility defect; roll back a model when its behavior regressed.
4. **Restore a compatible bundle:** model weights alone may not work with a changed encoder, feature schema, or candidate policy.
5. **Reconcile:** replay permitted historical data into a new version, re-evaluate mature cohorts, and record affected predictions without rewriting the original serving trace.
6. **Close the loop:** add a regression check that would have detected the failure and a runbook entry explaining the response.

Separate a bad release from a bad dependency. Rolling back model weights cannot fix a source outage shared by both the old and new model. Retain a baseline that can operate under the failure conditions it is intended to cover.

## What I would carry into the next ML system

The difficult boundary is often not between training and deployment. It is between **what was eventually known** and **what the system could know when it made a decision**.

For activity-aware Jira ranking, I would make those facts explicit in four artifacts: a temporal feature contract, an immutable training manifest, a compatible release bundle, and an outcome-linked prediction trace. Orchestration moves those artifacts through controlled states. Monitoring checks whether their assumptions still hold.

That is the core of dependable MLOps: a model can change, its data can change, and its workload can change without losing the ability to explain, evaluate, and recover the resulting predictions.

## Reproduce the figures

The architecture is illustrative. The monitoring plot and [daily CSV results](/posts/mlops-production-systems/monitoring.csv) come from a seeded simulation with no external or customer data. The [generator](https://github.com/wiwang/wiwang.github.io/blob/master/scripts/articles/generate_mlops_figures.py) uses seed 20261024; the feature-age distribution is lognormal with log-space standard deviation 0.35 and median 1 minute normally or 25 minutes during the incident.

```bash
python3 -m venv .venv-articles
.venv-articles/bin/pip install -r scripts/articles/requirements.txt
.venv-articles/bin/python scripts/articles/generate_mlops_figures.py
```

The pinned scientific dependencies and interpretation notes live in `scripts/articles/README.md`. The website uses committed figures and does not require Python to build.

## References

- [Tecton: Feature views and feature services](https://docs.tecton.ai/docs/concepts/tecton-concepts).
- [Tecton 1.1: Offline retrieval and historical validity semantics](https://docs.tecton.ai/docs/1.1/reading-feature-data/reading-feature-data-for-training/offline-retrieval-methods). This versioned reference is linked for its concrete timing examples, not as a claim about every current configuration.
- [Apache Airflow: Best practices](https://airflow.apache.org/docs/apache-airflow/stable/best-practices.html).
- [Amazon SageMaker Pipelines](https://docs.aws.amazon.com/sagemaker/latest/dg/pipelines.html).
- [MLflow: Model Registry workflows](https://mlflow.org/docs/latest/ml/model-registry/workflow/).
- [Google Cloud: Continuous delivery and automation pipelines in machine learning](https://cloud.google.com/architecture/mlops-continuous-delivery-and-automation-pipelines-in-machine-learning).

_Written October 1, 2024; revised October 28, 2026. The current version includes later experience and links to current platform documentation._
