---
title: "Inferring Jira Issues and Ranking Timesheet Suggestions"
description: "Connect activity signals to Jira issue inference: candidate retrieval, semantic context, collaborative ranking, implicit feedback, and evaluation for recurring work."
date: "2021-07-21"
updated: "2026-10-24"
slug: recomendation
tags: ["machine-learning", "recommendation-systems", "ranking", "mlops"]
draft: false
featured: false
---

A useful timesheet suggestion starts with a difficult inference: **which Jira issue was the person working on?** Activity signals can be incomplete, an explicit issue key may be missing, and the same person can move between several tasks in a short period.

At Tempo, my work included activity-aware time management, learning-to-rank and time-awareness models, semantic search over Jira tickets, and feature pipelines supporting training and inference. The project context for this article is inferring the active Jira issue from activity signals, then ranking timesheet suggestions.

That context changes the recommendation problem. Previously worked issues remain valid candidates. Organization boundaries and issue permissions constrain retrieval. User history helps, but the current activity window may indicate that the person has changed tasks.

The examples, feature names, and experiments below are an illustrative design for that problem. All downloadable records and plotted results are synthetic; they are not Tempo customer data, a reproduction of Tempo's implementation, or its production model scores.

## Define the decision at the activity-window level

Let $u$ be a user, $o$ an organization, $a$ an activity window, and $t$ the decision time. A model scores a candidate Jira issue $i$:

$$
s_\theta(u,i,a,t)
=f_\theta\left(\text{user history},\text{issue state},\text{activity context},\text{request context}\right).
$$

The system first infers plausible issues, then constructs ranked timesheet suggestions. If a suggestion also includes a time interval or duration, that introduces another prediction problem with its own labels and error measures. Correct issue ranking alone does not establish correct time attribution.

| Question | Example decision | What it changes |
| --- | --- | --- |
| What is the prediction unit? | One bounded activity window | Keep that window's candidates together in evaluation |
| What is the target? | The confirmed active Jira issue | Define confirmation, corrections, and unresolved windows |
| Which issues are eligible? | Issues visible to this user and valid for this workflow | Apply organization and permission checks independently of relevance |
| Can an issue repeat? | Yes: work often continues on an existing issue | Do not exclude an issue merely because it appeared in history |
| Can the system abstain? | Offer alternatives or ask for confirmation when evidence is weak | Evaluate coverage and error among accepted suggestions |

A missing key is not an invitation to invent one. The output should resolve to a real, eligible issue ID. If a source contains an explicit key, validate it against the relevant Jira instance and authorization context rather than treating the string as proof of access or relevance.

**Key point:** infer a grounded issue for the current context; do not simply recommend an unfamiliar ticket.

## Retrieval, ranking, and suggestion construction

A large organization may have too many visible issues for a complex model to score exhaustively on every request. Separate the stages:

| Stage | Role in the Jira workflow | Failure to measure separately |
| --- | --- | --- |
| Candidate generation | Retrieve plausible issues using recent work, assignment, semantic similarity, and other permitted context | The correct issue never reaches the ranker |
| Ranking | Combine current activity evidence with user–issue history and issue attributes | A familiar issue outranks the issue implied by the current activity |
| Suggestion construction | Resolve eligible IDs, deduplicate, apply confidence/fallback rules, and present timesheet suggestions | A high-scoring but inaccessible or invalid issue is surfaced |

This separation follows a general pattern described in [Google's recommendation-system overview](https://developers.google.com/machine-learning/recommendation/overview/types). The [2016 YouTube paper](https://research.google/pubs/deep-neural-networks-for-youtube-recommendations/) provides a historical example of separate candidate-generation and ranking models; the Jira task has different eligibility and repetition semantics.

A semantic retriever can encode the activity context and issue description separately:

$$
s_{\mathrm{semantic}}(a,i)=q_\theta(a)^Tv_\phi(i).
$$

Precomputed issue embeddings support approximate nearest-neighbor retrieval. A later ranker can add recency, assignment, previous confirmed links, source coverage, and richer user–issue interaction features.

The candidate policy sets an upper bound on attainable ranking recall: a ranker cannot recover an omitted issue. Log candidate-source provenance and evaluate candidate recall before judging the ranker. Permission filtering must happen before disclosure and remain correct if permissions change between retrieval and presentation.

## Turn activity into evidence, not a surrogate label

The useful distinction is between a signal that was available before prediction and an outcome learned afterward.

| Illustrative signal | How it can help | What can go wrong |
| --- | --- | --- |
| Recent confirmed user–issue associations | Provides a continuity prior | A frequent historical issue dominates a real task switch |
| Similarity between activity context and issue text | Supports inference when a key is absent | Issue text is stale, or evaluation uses a future edited description |
| Time since the user's last issue interaction | Captures recency | An absent integration is mistaken for inactivity |
| Issue assignment and workflow state | Narrows plausible candidates | Present-day state leaks into historical evaluation |
| Calendar or IDE source coverage | Expresses uncertainty about the context | Missing evidence is encoded as a confident zero |

These are candidate features, not a claim that each was used in Tempo's deployed model. Raw activity content can contain sensitive information. Minimize collection, separate organizations, restrict access, and define retention and derived-data deletion policies.

A displayed suggestion is not a confirmed association. A click is not always a final timesheet decision. Preserve confirmation, rejection, correction, and unresolved states rather than collapsing them into a single binary event.

For an observed interaction $C$ requiring exposure $E$,

$$
P(C=1\mid u,i,a)
=P(E=1\mid u,i,a)\,P(C=1\mid E=1,u,i,a).
$$

The absence of a click can mean the issue was never shown. A confirmation log collected under an old policy is also shaped by what that policy exposed. This is why “unobserved issue” and “wrong issue” should not be treated as identical concepts.

## Collaborative history and semantic context answer different questions

Consider an illustrative confirmation matrix:

| User | DEMO-101 | DEMO-102 | DEMO-103 | DEMO-104 |
| --- | --- | --- | --- | --- |
| User A | 3 | 1 | ? | ? |
| User B | 2 | ? | 2 | ? |
| User C | ? | ? | 1 | 4 |

Numbers represent historical confirmed links; question marks mean no recorded positive evidence. These are fictional keys, not real Jira tickets.

Collaborative history asks, “Which issues tend to be relevant to this user?” Activity semantics asks, “Which issue matches what is happening now?” A strong continuity prior can be useful, but it should not overpower fresh evidence of a task change.

### Confidence-weighted factorization

For historical link counts $r_{ui}$, define

$$
y_{ui}=\mathbb{1}[r_{ui}>0],\qquad c_{ui}=1+\alpha r_{ui}.
$$

A confidence-weighted factor model minimizes

$$
\sum_{u,i}c_{ui}(y_{ui}-p_u^Tq_i)^2
+\lambda\left(\sum_u\|p_u\|_2^2+\sum_i\|q_i\|_2^2\right).
$$

The target encodes observed preference while the weight reflects confidence. It does not prove that an unobserved issue is irrelevant. [Hu, Koren, and Volinsky (2008)](https://yifanhu.net/PUB/cf.pdf) develop this distinction for implicit feedback.

With item factors fixed, a user update is a weighted ridge solve:

$$
p_u=(Q^TC_uQ+\lambda I)^{-1}Q^TC_uy_u.
$$

The identity $C_u=I+(C_u-I)$ allows reuse of $Q^TQ$ while processing sparse confidence corrections. Alternating user and issue updates yields alternating least squares.

An ID-only factor model has a cold-start problem: a new issue has no learned history. A text encoder can represent a new issue, although permissions and eligibility still apply.

### BPR: train a relative ordering

For a user $u$, confirmed historical issue $i$, and sampled unobserved issue $j$, define

$$
\Delta_{uij}=p_u^Tq_i-p_u^Tq_j.
$$

A sampled-triple version of Bayesian Personalized Ranking uses

$$
\ell(u,i,j)=-\log\sigma(\Delta_{uij})
+\frac{\lambda}{2}\left(\|p_u\|^2+\|q_i\|^2+\|q_j\|^2\right).
$$

Writing $g=\sigma(-\Delta_{uij})$, the gradients are

$$
\begin{aligned}
\nabla_{p_u}\ell&=-g(q_i-q_j)+\lambda p_u,\\
\nabla_{q_i}\ell&=-g p_u+\lambda q_i,\\
\nabla_{q_j}\ell&=g p_u+\lambda q_j.
\end{aligned}
$$

[Rendle and colleagues](https://arxiv.org/abs/1205.2618) introduced BPR as a ranking objective for implicit feedback. Here regularization applies to the sampled vectors, matching the toy implementation; the effective penalty depends on sampling frequency.

BPR learns a history-based prior. Without activity features, it cannot distinguish two current windows for the same user. Its score is not a calibrated probability, and the pairwise loss does not directly optimize Top-1 accuracy or NDCG.

The negative sampler is part of the model design. Restrict real training comparisons to an appropriate eligibility universe and recognize that an unobserved issue may become the correct issue tomorrow. “Hard” negatives can also be mislabeled plausible alternatives.

## A synthetic Jira-shaped activity-to-issue experiment

The experiment below tests an intentionally narrow question: **does current activity context add information beyond user–issue history?** It generates a small organization, fictional issues, activity windows, and confirmed issue links. No actual Tempo or Jira customer records are used.

| Setting | Value |
| --- | --- |
| Organization | One synthetic organization; all 150 issues are eligible |
| Users and issues | 200 users, 150 fictional keys DEMO-101 through DEMO-250 |
| Work structure | Five latent workstreams, 30 issues each |
| User history | One primary workstream per user; 85% probability mass on that stream |
| Request sequence | 20 issue-linked activity windows per user, sampled with replacement |
| Temporal split | First 16 windows train history; last four are evaluation requests |
| Activity representation | Noisy synthetic semantic vector correlated with the active issue |
| Evaluation universe | All 150 eligible issues, including previously worked issues |
| Repetitions | Five generated datasets/fits, seeds 7, 17, 27, 37, 47 |

The synthetic issue descriptor has 13 dimensions: a five-dimensional workstream indicator plus eight independent Gaussian coordinates with standard deviation 0.35, followed by unit normalization. Each evaluation activity vector adds independent Gaussian noise with standard deviation 0.35 to its active issue descriptor and is normalized again.

This is a generative proxy for noisy semantic evidence, not a real embedding model. The target key is not included as an activity feature. Topic labels organize the generator; BPR receives only link history, while the semantic baselines receive the generated descriptors.

Historical confirmations are assumed available before evaluation starts. Model factors and history statistics remain frozen throughout the evaluation period. The process is stationary and much simpler than a real workday.

[![Synthetic historical confirmation counts form workstream-related blocks in a user–Jira issue matrix.](/posts/recomendation/jira-interactions.svg)](/posts/recomendation/jira-interactions.svg)

*Figure 1. Training link counts for seed 7, sorted by latent workstream only for visualization. Darker cells represent more repeated confirmations. Historical issues remain valid candidates.*

### Compare four signals under the same candidate policy

1. **Issue popularity:** rank by total training confirmations across users.
2. **User–issue BPR:** rank with 16-dimensional dot-product factors learned from training links.
3. **Activity similarity:** rank by cosine similarity between the current activity vector and each issue descriptor.
4. **Context + history:** combine activity similarity with a small history prior:

$$
s_{\mathrm{hybrid}}(u,i,a)=s_{\mathrm{semantic}}(a,i)+0.1\,z_u(s_{\mathrm{BPR}}(u,i)),
$$

where $z_u$ standardizes BPR scores across the user's 150 candidates, using their mean and population standard deviation. This is a fixed illustrative combination, not a calibrated probability or a tuned production objective.

BPR runs 50 epochs of 3,200 sampled triples with learning rate 0.04 and sampled-vector regularization 0.01. Factors initialize from Gaussian noise with standard deviation 0.1. Sampling a positive from the user's 16 training events weights repeated issues more often; negatives are uniform among issues with no training positive for that user. Test confirmations do not enter sampling or fitting.

No hyperparameters are selected on the held-out requests. The settings are fixed for the demonstration, not an equally tuned comparison of model families.

### Measure issue inference at the request level

Each evaluation window has one ground-truth issue and its ranked position $r_q$. Define

$$
\operatorname{TopKAccuracy}=\frac{1}{N}\sum_{q=1}^{N}\mathbb{1}[r_q\le K],
\qquad
\operatorname{MRR}=\frac{1}{N}\sum_{q=1}^{N}\frac{1}{r_q}.
$$

Top-1 measures how often the first suggestion is correct. Top-5 measures how often the user can find the correct issue among five suggestions. MRR distinguishes a result at rank 2 from one at rank 50. All 800 evaluation windows per run receive equal weight; ties break by issue ID.

For a request with correct issue DEMO-103 and ranked list `[DEMO-101, DEMO-103, DEMO-105]`, Top-1 is 0, Top-5 is 1, and reciprocal rank is 0.5. For a single relevant issue, Top-$K$ also equals Recall@$K$; this equivalence does not hold when multiple issues can be relevant to a window.

<!-- JIRA_TABLE_START -->

| Model | Top-1 accuracy | Top-5 accuracy | MRR |
| --- | --- | --- | --- |
| Issue popularity | 0.006 ± 0.003 | 0.029 ± 0.003 | 0.035 ± 0.003 |
| User–issue BPR | 0.032 ± 0.004 | 0.142 ± 0.010 | 0.116 ± 0.002 |
| Activity similarity | 0.325 ± 0.010 | 0.693 ± 0.021 | 0.489 ± 0.011 |
| Context + history | 0.324 ± 0.015 | 0.706 ± 0.012 | 0.494 ± 0.010 |

<!-- JIRA_TABLE_END -->

*Mean ± sample standard deviation across five generated datasets and fits. These are synthetic issue-inference results, not Tempo's reported production results. The deviations are not confidence intervals.*

[![Top-1 and Top-5 accuracy compare popularity, user–issue BPR, activity similarity, and a context-plus-history combination on synthetic Jira-shaped requests.](/posts/recomendation/jira-ranking-results.svg)](/posts/recomendation/jira-ranking-results.svg)

*Figure 2. Every method ranks the same complete 150-issue candidate universe. The experiment is constructed to contain informative current context; it tests that assumption rather than proving a universal advantage for semantic models.*

The distinction to look for is **history versus current evidence**. A history-only user model produces the same ranking for every evaluation window belonging to that user. The activity vector can change from window to window and disambiguate issues within the same workstream.

The hybrid coefficient controls how much continuity can override semantics. Its fixed value is illustrative; a real system needs a development set, task-switch cohorts, and a confidence/abstention policy. An offline improvement in issue inference still does not establish better duration estimates or less user correction effort.

The generated [activity context vectors](/posts/recomendation/synthetic-test-context.csv), [event records](/posts/recomendation/synthetic-jira-events.csv), [issue catalog](/posts/recomendation/synthetic-issue-catalog.csv), [per-run metrics](/posts/recomendation/jira-experiment-runs.csv), and [aggregate results](/posts/recomendation/jira-experiment-summary.csv) are downloadable.

## Evaluation mistakes that matter for this workflow

### Removing seen issues changes the task

A benchmark that removes every historical issue asks the system to discover new work. A timesheet assistant often needs to recognize continuing work. Choose the candidate policy from the product requirement, then apply it identically to every evaluated model.

The synthetic experiment allows all prior issues. It does not simulate authorization changes, deleted issues, multiple Jira instances, or an enormous catalog; those need dedicated tests and cohorts.

### Future issue state creates leakage

At decision time, the system may know a ticket's current description, assignment, and status. It cannot use edits, confirmed time entries, or activity events that arrive afterward.

A temporal split alone is insufficient if feature construction joins today's issue snapshot onto historical requests. Reconstruct availability and publication time, keep candidates for one request in the same split, and wait for outcome labels to mature. [The MLOps article](/mlops-production-systems/) develops these contracts and the feature-store design in detail.

### Sampled negatives can make a ranking look better

A correct issue ranked against a handful of random alternatives faces an easier task than one ranked against every eligible issue. [Krichene and Rendle (2020)](https://research.google/pubs/on-sampled-metrics-for-item-recommendation/) show that naive sampled metrics can even change relative model comparisons.

Use a stable candidate-universe definition. If full-candidate scoring is infeasible, report the retrieval policy, sampling method, candidate counts, and the task actually measured. Do not compare sampled Top-5 with a full-catalog Top-5 as if they were interchangeable.

### One average hides task switches and sparse context

Report metrics for recurring work, task changes, new issues, new users, sparse integrations, short activity windows, and cross-project transitions. In a multi-organization product, inspect organization-level behavior without exposing one customer's data to another.

An apparently strong average can be dominated by users who work on one issue repeatedly. A deterministic recent-issue baseline is valuable in that cohort; semantic context should justify its cost on the windows where history is insufficient.

### Offline correctness is only one product outcome

Log candidate recall, issue inference, and user correction outcomes separately. Track the accuracy–coverage trade-off if the system abstains. Raising a confidence threshold can improve accepted-suggestion precision simply by serving fewer suggestions.

A controlled online experiment should measure the real task—such as confirmed useful suggestions or reduction in correction effort—under a predeclared outcome window and guardrails. Exposure bias, delayed confirmations, and interface changes can make offline and online improvements disagree.

## A practical serving design

| Situation | Intended behavior | What to monitor |
| --- | --- | --- |
| Strong validated issue evidence | Rank the eligible issue with supporting context | Incorrect high-confidence suggestions |
| Ambiguous semantic evidence | Offer a short list or ask for confirmation | Accuracy versus coverage and correction rate |
| New issue with little history | Use content/context signals rather than an untrained issue ID | New-issue recall |
| Missing or stale integration signals | Follow a missingness-aware or fallback path | Source coverage, feature age, fallback frequency |
| Permission or organization mismatch | Exclude the issue regardless of score | Authorization failures and candidate-policy tests |
| Incompatible feature/encoder release | Reject deployment or use a compatible bundle | Version mismatch and rollback success |

An LLM can help encode text or interpret activity context, but generated issue keys still need grounding and authorization. If a model gives an explanation, it should refer only to evidence the system actually has. A plausible explanation is not a substitute for measured issue-inference quality.

## What this changes about recommendation engineering

For a timesheet assistant, personalization is not only a question of long-term taste. It is a question of **current work under uncertainty**. Historical links establish a prior; fresh context provides evidence; the candidate policy constrains what can be shown; and the product decides how to handle ambiguity.

That framing leads to concrete choices: retain recurring issues, separate retrieval misses from ranking errors, reconstruct features as of each decision, evaluate task switches, and connect predictions to confirmed outcomes. A more complex model is useful only when those measurements show that it improves the complete workflow.

## Reproduce the figures

The [Jira-shaped experiment generator](https://github.com/wiwang/wiwang.github.io/blob/master/scripts/articles/generate_tempo_ranking_figures.py) creates all example records, fits the history model, and evaluates each activity request. It needs no Tempo credentials or external data.

```bash
python3 -m venv .venv-articles
.venv-articles/bin/pip install -r scripts/articles/requirements.txt
.venv-articles/bin/python scripts/articles/generate_tempo_ranking_figures.py
```

Pinned dependencies and notes are in `scripts/articles/README.md`. The generated vectors are a controlled proxy for semantics, not a trained sentence-transformer benchmark.

## References

- [Google: Recommendation systems overview](https://developers.google.com/machine-learning/recommendation/overview/types).
- [Covington, Adams, and Sargin (2016): Deep Neural Networks for YouTube Recommendations](https://research.google/pubs/deep-neural-networks-for-youtube-recommendations/).
- [Hu, Koren, and Volinsky (2008): Collaborative Filtering for Implicit Feedback Datasets](https://yifanhu.net/PUB/cf.pdf).
- [Rendle et al. (2009): BPR: Bayesian Personalized Ranking from Implicit Feedback](https://arxiv.org/abs/1205.2618).
- [Krichene and Rendle (2020): On Sampled Metrics for Item Recommendation](https://research.google/pubs/on-sampled-metrics-for-item-recommendation/).
