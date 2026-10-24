# Article experiments

These generators use no external or customer data. Each writes committed SVG/PNG figures and downloadable results, then synchronizes its marked result table in the corresponding article. The website build does not need Python.

## Run

```bash
python3 -m venv .venv-articles
.venv-articles/bin/pip install -r scripts/articles/requirements.txt
# Bias–variance experiment:
.venv-articles/bin/python scripts/articles/generate_figures.py
# Jira-shaped issue inference and timesheet suggestion ranking:
.venv-articles/bin/python scripts/articles/generate_tempo_ranking_figures.py
# MLOps reference architecture and monitoring-delay simulation:
.venv-articles/bin/python scripts/articles/generate_mlops_figures.py
# Tempo Loop agent reference design and conditional schedule forecasts:
.venv-articles/bin/python scripts/articles/generate_agentic_ai_figures.py
```

Published environment: Python 3.12, NumPy 2.5.4, Matplotlib 3.11.2. Dependencies are pinned in `requirements.txt`. Small floating-point differences can occur across BLAS/platform versions. SVG font outlines are embedded so the published figures do not depend on readers having a particular font installed.

If you change a protocol, review the surrounding article prose as well as the regenerated plots and tables.

## Bias and variance

The simulation conditions on a fixed 25-point input design and varies Gaussian training noise across 500 repetitions (seed 42). It measures squared bias and variance on a 401-point grid, with ddof=0 so the finite-collection decomposition is exact. Noise variance is added analytically to estimate future-outcome MSE. Training error uses the coarser training grid and is not guaranteed to be below grid-averaged test risk for every degree. Individual curves show the first 20 fits; the mean uses all 500.

## Jira-shaped activity inference

Five seeds (7, 17, 27, 37, 47) generate 200 users, 150 fictional Jira-like issues and 20 activity windows per user. Sampling allows recurring issues. The first 16 windows form training history; the final four are evaluated without updating history or model factors. All 150 issues are eligible in this deliberately simplified single-organization example. Previously worked issues are retained as candidates.

Issue descriptors combine a five-dimensional workstream indicator and eight Gaussian coordinates, followed by unit normalization. Evaluation context is a noisy version of the active issue's descriptor. This is a generative proxy for semantic evidence, not an actual sentence-transformer model. Ground-truth keys are not model inputs. BPR receives training links only; its positive sampling weights repeated links, and its negative sampling excludes training positives. Test labels never enter fitting. The semantic and hybrid methods use current context and static descriptors. Their scores are not calibrated probabilities.

Methods are compared using Top-1, Top-5, and MRR over all candidates, with stable issue-ID tie breaking. The hybrid uses a fixed coefficient of 0.1 on per-user z-normalized BPR scores. No settings are selected using test labels. Reported deviations are sample standard deviations across generated datasets/fits, not confidence intervals. The generator exports the seed-7 issue catalog (including synthetic descriptors), event records, and held-out activity vectors along with all per-run and aggregate metrics. These data do not reproduce Tempo's customers, production topology, or model performance.

## MLOps monitoring

The architecture is an illustrative reference design. The monitoring simulation (seed 20261024) generates 60 days with 4,000 binary-classification requests daily. A nonpredictive context feature shifts on day 15. During days 30–39, predictive inputs are offset by -1.5, and a separate lognormal feature-age distribution increases. Those two injected faults are deliberately coincident, not a causal model linking feature age to log loss. All outcomes become available exactly seven days after prediction. The plot shows both event-day loss and the same loss at its availability day. The summary averages daily p95 ages; it is not a pooled percentile. These are not ranking metrics, customer incidents, or Tempo SLAs.

## Tempo Loop agent scenarios

`generate_agentic_ai_figures.py` draws a reference context architecture and a fictional six-task dependency graph, then compares 40,000 paired duration scenarios (seed 20261024). Task durations are independent lognormal draws with log-space standard deviation 0.35 and medians 2, 6, 4, 3, 4, and 1 working days. The API and UI branches run concurrently; no shared-resource, holiday, scope-change, or correlated-delay effects are modeled. The blocker scenario independently adds a uniform 3–8 working-day delay to the API task with probability 0.35. Both scenarios reuse the same primitive duration draws.

Quantiles and deadline probabilities are conditional on chosen illustrative assumptions, not calibrated production forecasts or LLM performance measurements. CSV outputs include the task graph, summary, and every paired simulation result. The generator asserts that the blocker scenario never finishes earlier than the baseline for the same sample. No Tempo data or LLM API calls are used. The article is dated May 6, 2026 and revised October 24, 2026; MLOps is dated October 1, 2024 and revised October 24, 2026.
