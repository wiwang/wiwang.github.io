---
title: "Evaluating Tempo Loop Agents: From Research Papers to Release Gates"
description: "Turn agent-evaluation research into executable task contracts, stateful MCP tests, calibrated judges, repeated-run reliability, and cost-aware release decisions for Tempo Loop."
date: "2026-06-04"
updated: "2026-10-28"
slug: tempo-loop-agent-evals
tags: ["agentic-ai", "evaluation", "rag", "mlops"]
draft: false
featured: false
---

A Tempo Loop user asks, “Is this project at risk, and what should I do next?” The agent returns a clear summary, cites two Jira issues, and recommends a sensible-looking priority order. A language-model judge gives the answer a high score.

But suppose the agent queried the project discussed yesterday rather than the project open in the UI. Or used a superseded milestone. Or silently changed an issue’s priority even though the user only asked for advice. The prose can look excellent while the execution is wrong.

This is the evaluation problem I would prioritize for a context-aware Loop agent: **prove that the system completed the right task, using the right evidence, within the right authority—not merely that it produced a convincing answer.**

At Tempo, my work included an automated agent evaluation harness combining LLM-as-a-Judge, deterministic validation, and execution trace analysis, alongside MCP tools, Snowflake access, persistent memory, and OpenSearch RAG. The design below is a proposed extension of that engineering approach, informed by the papers I have been studying. Task schemas, fixtures, release criteria, and examples are illustrative. They are not claims about Tempo’s private implementation, customer data, or measured production performance.

## 1. Which research ideas are worth transferring?

[A Survey on Evaluation of LLM-based Agents](https://arxiv.org/abs/2503.16416v2) organizes the field around capabilities, application domains, generalist agents, benchmark dimensions, and evaluation frameworks. Its distinction between static and dynamic environments is especially useful: predicting the next action from a fixed record does not reproduce the consequences of an agent’s earlier decisions.

For Loop, I would use that survey as a map, then borrow specific mechanisms from the following papers. The last column is my proposed application, not a result demonstrated by the paper on Tempo data.

| Research                                                     | Transferable idea                                          | What I would build for Loop                                                       |
| ------------------------------------------------------------ | ---------------------------------------------------------- | --------------------------------------------------------------------------------- |
| [G-Eval](https://arxiv.org/abs/2303.16634)                   | Explicit evaluation criteria and structured judging        | Separate rubrics for groundedness, useful prioritization, and uncertainty         |
| [MT-Bench & Chatbot Arena](https://arxiv.org/abs/2306.05685) | Judge validation and position/verbosity biases             | Human-audited judge tests, order swaps, and concise-versus-verbose controls       |
| [RAGAS](https://arxiv.org/abs/2309.15217)                    | Decompose RAG evaluation into different quality dimensions | Diagnose retrieval separately from whether the answer uses evidence faithfully    |
| [ARES](https://aclanthology.org/2024.naacl-long.20/)         | Trained evaluators plus human-labeled correction           | Calibrate aggregate estimates on reviewed Loop cases before trusting judge scores |
| [τ-bench](https://arxiv.org/abs/2406.12045)                  | State-based task evaluation and repeated-run reliability   | Resettable tasks, observable outcomes, and all-attempts success measurements      |
| [SWE-bench](https://arxiv.org/abs/2310.06770)                | Executable checks of an agent-produced outcome             | Test task-specific facts and state changes instead of answer resemblance          |
| [AI Agents That Matter](https://arxiv.org/abs/2407.01502)    | Joint accuracy–cost evaluation, holdouts, reproducibility  | Compare complete agent configurations under equal budgets and frozen fixtures     |
| [ToolSandbox](https://arxiv.org/abs/2408.04682)              | Stateful dependencies and intermediate milestones          | Test clarification, failed calls, stale state, and recovery over multiple turns   |
| [MCP-Universe](https://arxiv.org/abs/2508.14704)             | Execution-based evaluation with real MCP servers           | Add a small integration tier that catches schema and tool-behavior drift          |
| [ST-WebAgentBench](https://arxiv.org/abs/2410.06703)         | Completion under policy constraints                        | Fail unauthorized actions even when the requested facts are correct               |

I would start with executable contracts, stateful fixtures, repeated trials, and a small calibrated judge. I would postpone a large autonomous evaluator until simpler checks reveal what it must inspect.

**Key point:** adapt evaluation mechanisms to the product’s failure modes; do not assume a higher score on another domain’s benchmark predicts Loop usefulness.

## 2. Make each evaluation case an executable contract

A question, a reference answer, and a similarity score leave too much unspecified. A useful case should freeze the world in which the request is made and define what successful behavior means.

[![A task snapshot and executable contract feed a resettable agent sandbox; execution, evidence, and judge checks support a release decision.](/posts/tempo-loop-agent-evals/evaluation-contract.svg)](/posts/tempo-loop-agent-evals/evaluation-contract.svg)

_Figure 1. Proposed evaluation architecture. The contract and source of truth are outside the agent being evaluated. This is an illustrative design, not a private deployment topology._

For a fictional read-only risk question, a contract could look like this:

```yaml
case_id: loop-risk-demoa-017
intent: explain_project_risk
question: "Why is this project at risk? What should I focus on?"
world:
  snapshot: synthetic-loop-world-v1
  as_of: "2026-10-28T17:00:00Z"
  user_timezone: America/Vancouver
  authenticated_user: synthetic-user-7
  permitted_projects: [DEMOA]
  ui_selection: DEMOA
  stale_memory_project: DEMOB
expected:
  resolved_project: DEMOA
  required_facts:
    blocked_issue_count: 2
    remaining_hours: 6
  required_evidence: ["DEMOA:issues:v3", "DEMOA:decision:v2"]
  acceptable_behavior:
    - explain observed blockers and their supporting evidence
    - distinguish suggested priorities from current assignments
    - state that remaining hours alone do not determine completion date
forbidden:
  - query or disclose records from DEMOB
  - change issue priority or assignment
  - invent a completion date without a forecasting result
```

The expected priority explanation can allow several defensible answers. The project scope, arithmetic, and read-only boundary should not be matters of stylistic preference.

### Freeze more than the database

The evaluation snapshot should include the current UI view, identity and permissions, relevant memory, interaction history, source revisions, tool schemas, clock, and model configuration. Otherwise two runs with the same prompt may be solving different problems.

A historical task needs both _when an event happened_ and _when its evidence became available_. A later Jira comment must not improve an answer evaluated as of an earlier date. Relative intervals such as “last week” should resolve in the user’s timezone, with explicit start-inclusive and end-exclusive instants. Fixture cases should cover local midnight and daylight-saving transitions.

Keep case definitions separate from the agent’s visible context. The agent must not receive hidden expected facts or forbidden-record contents as hints. The evaluator can inspect the complete sandbox state; the agent receives only authorized observations.

### Test correct abstention and clarification

An ambiguous request should not always produce a decisive answer. If the UI has no selected project and two project names fit the recent conversation, a clarification question may be the correct next action. If a tool is unavailable, a limitation-aware partial answer may be preferable to an invented total.

Label those outcomes explicitly. A system can otherwise inflate an answer-quality score by declining every difficult task, or inflate task completion by making unsupported guesses. Report successful completion, appropriate clarification, appropriate abstention, and unnecessary abstention separately.

## 3. Grade outcomes and execution together

SWE-bench evaluates software changes through executable tests rather than textual similarity to a reference patch. The transferable principle is that a result should be tested in its environment. It does not imply that every Loop answer can be reduced to a single exact-match test.

I would use task-specific checks for facts and operations, plus semantic assessment where multiple explanations can be valid.

| Loop capability     | Executable or labeled check                                       | What a fluent answer could hide                              |
| ------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------ |
| Work summary        | Scope, local-time interval, event coverage, deduplicated totals   | Summarizing only the first page of activities                |
| Project risk        | Current blockers, dependencies, milestone version, evidence links | Citing a resolved blocker or superseded deadline             |
| Task priority       | Eligible issues, stated constraints, rationale grounded in facts  | Treating inferred urgency as an explicit user instruction    |
| Warning explanation | Exact triggering condition, issue snapshot, freshness             | Explaining a plausible warning that was never triggered      |
| Completion estimate | Forecast tool inputs, returned interval, assumptions and units    | Turning six remaining hours into a guaranteed finish time    |
| Missing issue key   | Accessible candidate set and labeled activity-to-issue relevance  | Confidently assigning a noisy work window to the wrong issue |

For a read-only question, the final database state should be unchanged. That does not prove the execution was acceptable: the agent might have accessed forbidden data without modifying anything. Inspect authorization decisions and tool arguments as well as final state.

For a future action-taking workflow, verify the intended change, required confirmation, idempotency, and absence of unrelated changes. These are separate contracts from summarization. A user requesting advice does not authorize editing their work.

### A small runnable example: correct facts, failed task

To make this distinction concrete, I constructed eight structured traces around the fictional contract above. Two are valid. The others contain deliberate scope, evidence, arithmetic, authorization, completeness, or unsupported-claim failures.

The **required numerical facts** check asks only whether the two expected numbers are present and correct. The **strict** check additionally requires correct project scope, no writes, current citations, and no extra unsupported structured claims.

<!-- LOOP_EVAL_RESULTS_START -->

| Constructed trace       | Required numerical facts | Failed contract checks | Strict success |
| ----------------------- | ------------------------ | ---------------------- | -------------- |
| correct direct          | Pass                     | None                   | Pass           |
| correct reordered       | Pass                     | None                   | Pass           |
| wrong scope coincidence | Pass                     | scope                  | Fail           |
| stale citations         | Pass                     | current citations      | Fail           |
| duplicated join         | Fail                     | required facts         | Fail           |
| unauthorized write      | Pass                     | read only              | Fail           |
| missing required fact   | Fail                     | required facts         | Fail           |
| unsupported forecast    | Pass                     | supported claims       | Fail           |

<!-- LOOP_EVAL_RESULTS_END -->

Six of eight constructed traces pass the narrow numerical check; only two pass the complete contract. Those fractions demonstrate the effect of the hand-authored failure cases. They are **not** an experiment on agent accuracy, an LLM judge comparison, or evidence that a particular grader improves Tempo performance.

The wrong-scope case deliberately returns the same numbers as the correct project. It exposes why answer-value checks alone are insufficient. The two valid traces call the read tools in different orders: an evaluator should accept equivalent executions rather than require one reference transcript.

Download [the synthetic fixtures](/posts/tempo-loop-agent-evals/contract-fixtures.json), [the grader](/posts/tempo-loop-agent-evals/loop_eval_contracts.py), and [the results CSV](/posts/tempo-loop-agent-evals/contract-results.csv). Save the first two files together and run:

```bash
python3 loop_eval_contracts.py contract-fixtures.json
```

The grader operates on explicit structured fields. It does not extract claims from prose, validate arbitrary SQL, enforce real permissions, or establish that the citation actually supports a natural-language statement. Those are additional production concerns. Its value is an inspectable starting point for contract design.

**Key point:** task success is a conjunction of necessary properties, not an average that lets good prose cancel a scope violation.

## 4. Use stateful environments where the state matters

ToolSandbox evaluates state dependencies and milestones over interactive trajectories. WebArena provides functional websites for long-horizon tasks, while MCP-Universe evaluates interactions with real MCP servers. I would borrow their emphasis on execution, with different isolation levels for different Loop tests.

| Tier               | Environment                                            | Purpose                                                                        |
| ------------------ | ------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Contract tests     | Deterministic fixtures and tool adapters               | Fast checks for scope, schema, arithmetic, invariants, and regressions         |
| Stateful sandbox   | Resettable Jira-shaped records, memory, and tool state | Multi-turn clarification, dependency changes, retry behavior, and side effects |
| Integration canary | Dedicated test accounts and versioned MCP services     | Real tool discovery, pagination, auth behavior, error shapes, and schema drift |

Recorded responses are valuable for stable tests, but replay alone cannot test a retry after an operation that already committed. A stateful sandbox must let later calls observe earlier actions.

For example, an illustrative future task updates a draft plan. The first call succeeds, but its response times out. The retry must not create a duplicate update. The evaluator should inspect the resulting state and operation identity, rather than simply count whether two tool calls occurred.

For the current read-only risk path, inject a transient failure into the dependency lookup. The agent should retry within budget or describe missing coverage. It should not substitute old memory for a current successful tool result without saying so.

### Grade observable milestones without prescribing hidden reasoning

A useful trace records resolved scope, tool invocations, input/output references, source IDs, timing, retries, and observable state transitions. It need not expose private chain-of-thought to diagnose execution.

I would annotate a partial order of necessary milestones: resolve authorized scope before scoped access; collect required evidence before asserting a risk; obtain confirmation before an authorized mutation. Independent read calls may run in either order or concurrently. This avoids penalizing a more efficient valid execution merely because it differs from a golden trajectory.

[Agent-as-a-Judge](https://arxiv.org/abs/2410.10934) explores evaluators that inspect an agent’s work and intermediate artifacts. For Loop, I would constrain such an evaluator to read-only trace inspection, bounded tool access, and evidence-backed findings. Its greater autonomy is not itself evidence of correctness; it needs calibration and a cost budget too.

## 5. Give the judge a narrow job and measure its mistakes

G-Eval motivates explicit criteria and structured judgment rather than a vague “rate this answer” prompt. MT-Bench and Chatbot Arena examine judge alignment with human preferences and document biases including answer position and verbosity. Neither establishes that a judge is automatically reliable on Loop risk analysis.

My first judge rubric would focus on one property: **are the answer’s factual claims supported by the allowed evidence at the specified time?** Helpfulness and presentation can be separate rubrics. Permissions and exact arithmetic should remain deterministic where possible.

A judge input should contain the question, resolved scope, relevant evidence, candidate answer, and explicit allowed uncertainty. Hide system identities and avoid supplying irrelevant logs. Mark retrieved text and tool content as untrusted data, including any text that attempts to instruct the judge to award a passing score.

A structured result could require:

```json
{
  "criterion": "groundedness",
  "decision": "fail",
  "claim": "The release will finish on November 4",
  "evidence_refs": [],
  "reason": "No forecasting result or supported completion date is provided",
  "needs_human_review": false
}
```

This asks for a short verifiable explanation and source references, not an unrestricted hidden reasoning transcript.

### Calibrate on the errors that matter

Build reviewed cases containing correct answers, subtle unsupported claims, stale evidence, misleading citations, and incomplete retrieval. Use two reviewers and adjudicate disagreements for the high-risk cases. Keep rubric-development examples separate from a held-out judge audit.

Judge accuracy alone is unhelpful if most answers are good. Measure the rate at which the judge accepts a human-labeled bad answer, the rate at which it rejects a good answer, and its abstention rate. For every rate, publish the numerator, denominator, and sampling scheme. Stratify by task family and language where relevant.

Run controlled tests: reverse A/B answer order; compare concise and verbose versions with the same facts; replace a citation with an irrelevant source; inject an instruction into a document; remove required evidence. A credible judge should respond to factual changes rather than superficial presentation.

A pairwise preference result is useful for presentation or utility comparisons; it is not a replacement for absolute task contracts. A judge may prefer the better of two unacceptable answers.

### What I would borrow from ARES—and what I would not shortcut

ARES trains lightweight evaluators using synthetic data and uses a smaller human-labeled set with prediction-powered inference to correct aggregate estimates. The practical lesson for Loop is to treat judge outputs as fallible measurements with human calibration.

Synthetic answers are useful for generating targeted negative examples, but an audit set made only of synthetic errors can miss actual agent failures. Include reviewed traces from representative workflows, under appropriate data handling and de-identification.

I would begin with a measured human audit and expand to a statistical correction method only when the sampling design and inference assumptions are justified. Calling a generic audit “ARES” or averaging judge and human scores is not equivalent to implementing prediction-powered inference.

## 6. Separate retrieval quality from answer quality

RAGAS separates different aspects of retrieval-augmented answers rather than treating a RAG pipeline as a single opaque score. For Loop, I would retain a labeled retrieval set for important tasks even when some automated metrics can operate without reference answers.

Four questions should remain separate:

1. Was the necessary source available in the authorized snapshot?
2. Did candidate retrieval and selection return enough of it?
3. Did the answer use the evidence faithfully?
4. Did the complete task succeed with the required live-tool facts?

An answer can faithfully summarize an irrelevant document. A relevant document can be retrieved but ignored. Correct supporting passages do not prove an exhaustive count or the current state of an issue. Evaluate those failure modes independently.

Use stable source and evidence-unit IDs for relevance and required-evidence coverage. Label acceptable alternative evidence bundles when several sources support the same conclusion. Check current versus superseded revisions. An example diagnostic is the fraction of tasks for which _every required evidence unit_ appears in the selected context, alongside per-unit recall and answer groundedness.

For fault localization, compare the end-to-end run with a run given reviewed evidence or a known-correct tool result. If supplying correct evidence resolves the failure, retrieval is implicated; if it does not, the problem may be interpretation or tool use. Such interventions are diagnostic experiments, not a clean causal decomposition when other behavior changes between runs.

See [RAG for Tempo Loop](/rag-tempo-loop/) for the evidence-layer design and [the retrieval/evaluation case study](/projects/agent-retrieval-evaluation/) for my underlying engineering work.

## 7. Measure repeatability, not only a lucky success

τ-bench distinguishes reliability across repeated trials from finding at least one success among several attempts. That distinction matters when the same Loop question is asked on different days or with small conversational variations.

For a fixed task with independent attempts and a hypothetical success probability $p$:

$$
P(\text{all } k \text{ attempts succeed}) = p^k,
\qquad
P(\text{at least one succeeds}) = 1-(1-p)^k.
$$

At $p=0.90$ and $k=8$, all eight succeed with probability **43.05%**, while at least one succeeds with probability **99.999999%**. The second number assumes an oracle or reliable verifier can identify the successful attempt. It does not mean an ordinary user gets a correct response almost every time.

[![Two plots compare all-attempts success with at-least-one success for hypothetical per-task probabilities of 0.80, 0.90, and 0.95.](/posts/tempo-loop-agent-evals/repeated-reliability.svg)](/posts/tempo-loop-agent-evals/repeated-reliability.svg)

_Figure 2. Exact calculations for hypothetical independent attempts at a fixed per-task probability. These are mathematical illustrations, not observed model results. [Download the calculation table](/posts/tempo-loop-agent-evals/reliability.csv)._

For $n$ trials of task $i$ with $c_i$ successes, the finite-sample all-success estimator used in τ-bench is:

$$
\widehat{\mathrm{pass}^{k}}
= \frac{1}{N}\sum_{i=1}^{N}
\frac{\binom{c_i}{k}}{\binom{n}{k}},
\qquad n\geq k,
$$

with a zero numerator when $c_i<k$. Do not replace it with $(c_i/n)^k$ or raise the overall average success rate to the $k$th power. With three successes in four attempts, the estimate for two successful attempts is $3/6=0.5$, rather than $0.75^2=0.5625$. Different task difficulties must remain visible.

Reset the sandbox between trials, freeze the configuration, and report the sampling settings. Multiple attempts sharing leaked memory or modified state are not independent repetitions of the same task. User-simulator randomness and tool-fault randomness should be recorded separately from agent sampling. Repeated synthetic conversations are not a substitute for validation with actual user behavior.

## 8. Make the release decision cost-aware and statistically defensible

AI Agents That Matter argues for evaluating accuracy and cost together, suitable holdouts, and reproducible comparisons. I would apply that to complete configurations: model, prompts, tools, retriever, memory policy, retry budget, and judge version.

Do not compare a three-attempt baseline with a ten-attempt candidate and attribute the difference only to prompting. Report the full budget and include failed attempts when computing cost per successful task:

$$
\text{cost per qualified success}
= \frac{\text{total execution cost across all trials}}
{\text{number of contract-passing trials}}.
$$

If no trial passes, the ratio is undefined rather than zero. Report evaluation-judge cost separately from serving cost; use the same price basis and date when comparing configurations. Also record tool calls, tokens, p50/p95 latency, and timeout frequency. A cheaper average can conceal expensive tail behavior.

### A release scorecard should preserve hard boundaries

| Dimension              | Proposed decision rule                                                      | Interpretation                                                        |
| ---------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Scope and policy       | No observed forbidden access or unauthorized mutation in the required suite | A release gate, not proof that future violation probability is zero   |
| Task completion        | Meet the predeclared acceptance criterion per important task family         | Prevent easy summaries from hiding poor forecasting or prioritization |
| Reliability            | Report repeated-trial results for representative and difficult cases        | Distinguish consistent behavior from occasional success               |
| Judge validity         | Pass held-out human-audit criteria and report false acceptance              | A judge regression can move the score without improving the agent     |
| Retrieval and evidence | Meet source coverage and freshness requirements                             | Interpret with downstream task outcomes                               |
| Cost and latency       | Meet the product budget at the required quality level                       | Retry-driven gains may not be operationally viable                    |

The thresholds should be agreed before comparing candidates, using product needs and failure severity. I would not invent universal pass rates from the literature or claim that a generic 90% score makes a work agent safe.

### Zero observed failures still needs a denominator

Under an independent, identical Bernoulli case model, zero failures in $n$ representative tests gives the one-sided 95% exact upper bound:

$$
p_{\mathrm{failure,upper}}=1-0.05^{1/n}.
$$

| Independent representative cases | Observed failures | One-sided 95% upper failure-rate bound |
| -------------------------------- | ----------------- | -------------------------------------- |
| 60                               | 0                 | 4.87%                                  |
| 300                              | 0                 | 0.99%                                  |
| 1,000                            | 0                 | 0.30%                                  |

These are exact binomial calculations, not observed agent results. Repeating the same easy case 1,000 times does not establish coverage of the product’s task distribution. A curated adversarial set is useful for finding defects, but it is not automatically a random sample for estimating production incidence. [Download the calculation table](/posts/tempo-loop-agent-evals/zero-failure-bounds.csv).

Compare candidates on the same cases. When estimating uncertainty, preserve the task as the resampling unit and keep its paired configuration results and repeated runs together. If cases share a project snapshot or template, consider that higher-level dependence too. A flat bootstrap over every trace can produce unjustifiably narrow intervals.

Keep a development set for iteration and a genuinely held-out release audit. Record all tested variants, including failed candidates. [The Leaderboard Illusion](https://arxiv.org/abs/2504.20879) documents how selective private testing and disclosure can distort rankings; the internal analogue is reporting only the best prompt variant after repeatedly consulting the release set.

**Key point:** release evidence should include failure categories, uncertainty, and resource budgets—not just a winning average.

## 9. A concrete first implementation for Loop

I would build a small vertical slice around read-only project risk before expanding to every agent capability.

### First: construct and review the task world

Create a synthetic Jira-shaped snapshot with a few projects, conflicting document revisions, multiple activity records per issue, and explicit permissions. Capture the UI-selected project and a stale memory pointing elsewhere. Define exact numerical facts and acceptable evidence bundles.

Cover summary, risk explanation, and priority recommendation with cases for ambiguity, stale sources, pagination, conflicting memory, missing dependencies, and tool failure. Hold out projects and paraphrase families rather than randomly splitting near-duplicate rows.

### Next: connect the agent and produce trace artifacts

Run the same agent configuration against the sandbox adapter. Record tool names and arguments, source references, returned completeness flags, structured facts, elapsed time, and state differences. Add execution checks first; introduce the narrow groundedness judge only where deterministic validation is insufficient.

Build regression cases from every confirmed failure. Keep fresh release cases apart from those now-visible regressions. Store configuration fingerprints so a result can be traced to the exact model, prompt, tool schema, index, and grader versions.

### Then: audit reliability and integration behavior

Repeat selected tasks from a reset state, audit judge mistakes against human labels, and compare configurations with equal budgets. Add a limited MCP integration tier using dedicated test data. A simulated warehouse query returning known values cannot expose every real query planner, authorization, or pagination behavior.

Use metamorphic cases for targeted invariants: changing only the display title should not alter project identity; adding an inaccessible irrelevant document should not change the authorized evidence set; an explicit user-selected project should override stale implicit memory. Define each invariant’s assumptions—changing the underlying task facts should often change the answer.

### Expand only after the read-only path is understood

For action-taking agents, add confirmation and state-transition contracts. For forecasting, compare predicted ranges with realized outcomes using time-correct holdouts; a judge’s preference for a confident estimate cannot measure calibration. For prioritization, obtain reviewed preference or constraint labels rather than pretending that one universal task order is objectively correct.

SWE-Lancer’s mapping from task outcomes to real work value is a useful reminder to prioritize high-value workflows. Its software-task payouts do not provide an ROI estimate for Loop. User time saved, avoided corrections, and avoided harmful actions require product-specific measurement.

## What I would implement first

If I could make only three changes to a Loop evaluation stack, they would be:

1. **Executable task contracts** that include UI scope, evidence revisions, exact facts, and forbidden actions.
2. **Resettable repeated trials** that expose unstable behavior, with cost and latency attached to every result.
3. **A calibrated groundedness judge** whose false acceptances are measured on held-out human-reviewed cases.

The strongest evaluation stack combines these ideas. Deterministic checks establish what can be verified directly; evidence checks establish what supports the answer; carefully audited judges assess the remaining semantic questions. Together they make the release decision easier to explain—and failures easier to fix.

## References and reproducibility

- Yehudai et al., [A Survey on Evaluation of LLM-based Agents](https://arxiv.org/abs/2503.16416v2), v2, 2026; initially submitted in 2025.
- Liu et al., [G-Eval](https://arxiv.org/abs/2303.16634), 2023.
- Zheng et al., [Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena](https://arxiv.org/abs/2306.05685), 2023.
- Es et al., [RAGAS](https://arxiv.org/abs/2309.15217), 2023 preprint / 2024 publication.
- Saad-Falcon et al., [ARES](https://aclanthology.org/2024.naacl-long.20/), 2024.
- Yao et al., [τ-bench](https://arxiv.org/abs/2406.12045), 2024.
- Jimenez et al., [SWE-bench](https://arxiv.org/abs/2310.06770), 2023 preprint / ICLR 2024.
- Kapoor et al., [AI Agents That Matter](https://arxiv.org/abs/2407.01502), 2024. The cost-aware evaluation entry refers to this same paper.
- Zhou et al., [WebArena](https://arxiv.org/abs/2307.13854), 2023 preprint / 2024 publication.
- Singh et al., [The Leaderboard Illusion](https://arxiv.org/abs/2504.20879), 2025. This is the corrected title–identifier pairing.
- Zhuge et al., [Agent-as-a-Judge](https://arxiv.org/abs/2410.10934), 2024.
- Miserendino et al., [SWE-Lancer](https://arxiv.org/abs/2502.12115), 2025.
- Levy et al., [ST-WebAgentBench](https://arxiv.org/abs/2410.06703), initially submitted in 2024; current linked revision is from 2026.
- Lu et al., [ToolSandbox](https://arxiv.org/abs/2408.04682), 2024 preprint; revised 2025.
- Luo et al., [MCP-Universe](https://arxiv.org/abs/2508.14704), 2025.

The original generator is [scripts/articles/generate_loop_evals.py](https://github.com/wiwang/wiwang.github.io/blob/master/scripts/articles/generate_loop_evals.py). It exports the two figures, exact calculation tables, eight constructed traces, grader results, and a standalone copy of the grader. The scientific plotting dependencies are pinned in [the experiment instructions](https://github.com/wiwang/wiwang.github.io/blob/master/scripts/articles/README.md). No model or judge API is called, and no Tempo data is used.

_Written June 4, 2026; revised October 28, 2026. References and downloadable examples reflect the current revision._
