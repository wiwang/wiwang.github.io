---
title: "RAG for Tempo Loop: Retrieving Evidence an Agent Can Trust"
description: "Build a RAG layer for Tempo Loop with UI-aware scope, hybrid retrieval, versioned Jira knowledge, evidence selection, citations, and evaluation beyond top-K search."
date: "2025-11-11"
updated: "2026-10-24"
slug: rag-tempo-loop
tags: ["rag", "agentic-ai", "information-retrieval", "context-engineering"]
draft: false
featured: false
---

A user opens a project in Tempo Loop and asks, “Why might this release slip?” A search engine can find passages containing _release_, _delay_, or _blocker_. A useful agent needs something more precise: evidence about the selected project, visible to this user, valid at the relevant time, and sufficient to explain a particular delivery risk.

Retrieval-augmented generation—RAG—is the layer that connects the question to that evidence. Its job is not simply to fill the model's context window. It must preserve what a source says, where it came from, when it applies, and whether the user can access it.

At Tempo, my work included an OpenSearch-based RAG pipeline with document ingestion, embedding generation, semantic retrieval, and contextual grounding, alongside tool-using agents and evaluation. This article develops an illustrative RAG design for a Tempo Loop agent. The architecture, document schemas, fictional projects, and experiments are examples, not disclosures of private Tempo systems or customer data.

The central distinction is between **finding something related** and **retrieving enough authorized evidence to support the answer**.

## 1. Decide when the agent needs RAG

The [original RAG paper](https://arxiv.org/abs/2005.11401) combines parametric generation with retrieved external knowledge. In a work-management product, external knowledge includes documents, issue descriptions, comments, decisions, and other records whose contents change independently of the language model.

Different questions require different retrieval or computation paths:

| Loop question                             | RAG contribution                                                    | Other source or tool needed                                            |
| ----------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| “Summarize what changed in this project.” | Relevant decisions, issue discussions, and change explanations      | An exhaustive change/event query for the requested period              |
| “Why is the release at risk?”             | Evidence about blockers, scope commitments, and acceptance criteria | Current dependency graph and issue state                               |
| “Which task should I prioritize?”         | Context about milestones and dependency rationale                   | Assignments, explicit priorities, capacity, and ranking policy         |
| “Why did you warn me about this issue?”   | Source evidence supporting the warning                              | The exact alert rule, prediction trace, and issue snapshot             |
| “When will the project finish?”           | Documented assumptions and scope decisions                          | A forecasting tool with duration, dependency, and calendar assumptions |

A top-$K$ text search cannot establish the total number of overdue issues. Absence from its results does not establish that no blocker exists. Use structured queries for exhaustive counts and current operational facts; use RAG to retrieve their explanation and supporting knowledge.

The [Tempo Loop agent article](/agentic-ai-tempo-loop/) describes the broader combination of user profile, historical activities, interaction memory, the current UI view, tools, and RAG. Here, the focus is the retrieval and evidence contract inside that system.

**Key point:** route the question to the right source before optimizing the retriever.

## 2. Build a versioned knowledge layer

The ingestion pipeline converts source records into searchable evidence. It should preserve meaning and provenance before it produces vectors.

[![An illustrative RAG pipeline connects versioned ingestion and UI-aware query scope to authorized retrieval, fusion, reranking, evidence selection, agent tools, and answer verification.](/posts/rag-tempo-loop/rag-architecture.svg)](/posts/rag-tempo-loop/rag-architecture.svg)

_Figure 1. A reference design for Tempo Loop-style questions. Authorization and time constraints define the candidate universe; relevance ranks within it. Retrieved content remains evidence, not application instructions._

A chunk record might include:

```json
{
  "chunk_id": "synthetic-org:DEMOA:decision-01:v3:section-2",
  "source_id": "decision-01",
  "source_revision": "v3",
  "project_id": "DEMOA",
  "jira_instance_id": "synthetic-instance",
  "tenant_id": "synthetic-org",
  "section_path": ["Release plan", "Acceptance criteria"],
  "source_updated_at": "2025-11-10T09:00:00Z",
  "available_at": "2025-11-10T09:05:00Z",
  "valid_from": "2025-11-10T09:00:00Z",
  "content_hash": "example-content-digest",
  "embedding_version": "example-encoder-v2",
  "access_policy_ref": "example-resource-policy"
}
```

This is an illustrative schema, not a Tempo or OpenSearch API. Some sources do not provide explicit business-validity intervals; do not invent them. Preserve source revisions and the times at which the system learned about them, and distinguish an inferred supersession relationship from a confirmed one.

### Separate source time from ingestion time

An issue may be updated at 09:00 but not appear in the retrieval index until 09:05. A historical evaluation at 09:02 must not retrieve the later indexed revision as if the agent already had it.

For a record with explicit validity semantics, a candidate can require

$$
t_{\mathrm{available}}\le t_{\mathrm{query}},
\qquad
 t_{\mathrm{valid\_from}}\le t_{\mathrm{as\_of}}<t_{\mathrm{valid\_to}}.
$$

The query execution time and the requested business “as of” time can differ. A retrospective question may intentionally ask about an earlier plan, while an explanation of an old prediction needs the version the system could actually access then. State which mode is being evaluated.

The [MLOps article](/mlops-production-systems/) develops the same distinction for historical and served features. RAG has a similar temporal problem, but its artifacts are source revisions, chunks, embeddings, and retrieval policies.

### Use incremental updates with explicit invalidation

Use stable source IDs and revision-specific chunk IDs. Re-ingesting the same revision should not create duplicate evidence. When content changes, replace or retire the appropriate index entries and invalidate dependent caches.

A deletion or permission change is not merely a ranking update. It must affect retrieval, cached evidence packs, source links, and memories that retain protected content. An old answer may need to be hidden or regenerated under current access rules; previously observed content does not grant permanent access.

**Key point:** the unit you operate is a source-backed, permission-aware revision—not an anonymous vector.

## 3. Chunk for the claims the agent will need

Fixed-size chunks are convenient, but document boundaries often carry the meaning needed for risk and priority analysis.

Consider a decision paragraph:

> The API integration is required for the initial release. The reporting dashboard is deferred and does not block that release.

This is an invented example. If chunking separates the second sentence from its subject or drops the release qualifier, retrieval can turn a deferred feature into a supposed release blocker.

| Chunking choice          | What it preserves                                       | Typical failure                                         |
| ------------------------ | ------------------------------------------------------- | ------------------------------------------------------- |
| Fixed token windows      | Predictable size and straightforward indexing           | Conditions and conclusions split across boundaries      |
| Structure-aware sections | Headings, decisions, lists, and local relationships     | Long sections still need controlled subdivision         |
| Parent–child retrieval   | Small searchable units with a larger explanatory parent | Parent expansion can overwhelm the context budget       |
| Context-enriched chunks  | Project/document/section identity alongside text        | Generated enrichment can invent context or become stale |

A practical representation can combine a concise source-derived header—project, document title, section, revision—with the unchanged passage. Keep enrichment distinguishable from original evidence.

[Anthropic's Contextual Retrieval discussion](https://www.anthropic.com/engineering/contextual-retrieval) explores adding chunk-specific context before embedding and lexical indexing. That is a useful design option, not a universal guarantee that generated contextualization improves every corpus. Validate that enrichment is source-supported and does not encode answer labels from the evaluation set.

For tables and issue threads, retain relationships: column names, the relevant row key, parent issue identity, and the chronology of replies. A comment saying “resolved” is not interpretable without knowing what was resolved and when.

## 4. Resolve UI scope before semantic similarity

Tempo Loop provides information beyond the user's sentence: selected project, selected issue, date range, filters, and a view revision. That context can disambiguate “this release” or “my current tasks.” It is not a permission grant.

An illustrative scope contract is

$$
\mathcal D_q=\{d:\operatorname{authorized}(u,d)\land
\operatorname{in\_scope}(q,\mathrm{UI},d)\land
\operatorname{temporally\_valid}(q,d)\}.
$$

The retriever ranks within $\mathcal D_q$. Authorization is a hard constraint, not a negative term in a relevance score.

Use explicit user scope over an implicit UI reference. If the view shows Project A but the user asks about Project B, validate access to B and retrieve B. If “this project” could refer to multiple selections, ask rather than retrieve an arbitrary project.

A UI filter can also narrow the displayed data without narrowing the question. A view filtered to the current assignee does not make that subset a complete project-risk dataset. Record whether the agent expanded to a wider authorized scope or assessed only the visible subset.

Capture the view at request start. A later UI navigation must not silently change the meaning of the in-flight answer. Include view revision, requested scope, source snapshot/index version, and effective access scope in evidence-cache keys.

### Filter placement affects both security and recall

A server must enforce access before evidence reaches the model. Separately, an approximate vector search can lose recall if a restrictive project filter is applied only after a small global top-$K$ list is retrieved. There may be many relevant permitted passages just below the global cutoff.

[OpenSearch documents several vector-filtering strategies](https://docs.opensearch.org/latest/vector-search/filter-search-knn/index/). Their behavior depends on the engine, index configuration, selectivity, and query shape. Test retrieval quality inside the allowed universe under realistic filters. Never “solve” a recall problem by removing the authorization constraint.

**Key point:** a perfectly relevant passage from the wrong project or an unauthorized resource is still the wrong retrieval result.

## 5. Use hybrid retrieval for identifiers and meaning

Jira issue keys, project names, error strings, and technical identifiers benefit from exact lexical matching. Questions such as “what is holding up the release?” may instead require matching _blocker_, _dependency_, or a more indirect explanation.

### Lexical retrieval with BM25

A common BM25 form is

$$
\operatorname{BM25}(q,d)=
\sum_{w\in q}\operatorname{IDF}(w)
\frac{f(w,d)(k_1+1)}{f(w,d)+k_1\left(1-b+b\frac{|d|}{\operatorname{avgdl}}\right)}.
$$

Here $f(w,d)$ is term frequency; $k_1$ controls saturation; $b$ controls document-length normalization. Preserve issue-key tokens and test the analyzer's treatment of punctuation and identifiers. Tokenizing an exact key inconsistently between query and index can break an otherwise simple lookup.

### Dense retrieval with compatible embeddings

An embedding retriever can score

$$
s_{\mathrm{dense}}(q,d)=\operatorname{sim}\left(E_q(q,\mathrm{context}),E_d(d)\right).
$$

Query and document encoders must be compatible. A change in embedding dimension or representation can require an index migration and re-embedding; do not mix incompatible vectors under one undifferentiated index version.

Approximate nearest-neighbor indexing trades search cost against candidate recall. Evaluate that stage against an exact or carefully constructed reference under the same access and project constraints. Downstream reranking cannot recover evidence that the candidate retriever never produced.

### Fuse ranks, then rerank richer candidates

One fusion method is reciprocal rank fusion:

$$
\operatorname{RRF}(d)=\sum_{m:d\in L_m}\frac{1}{k+\operatorname{rank}_m(d)},\qquad k>0.
$$

A missing result contributes zero for that list. The constant is a smoothing parameter, not the number of returned candidates. [OpenSearch's RRF documentation](https://docs.opensearch.org/latest/vector-search/ai-search/hybrid-search/rrf/) describes the rank-fusion approach. Raw BM25 and vector scores have different scales; a fusion or normalization policy should be explicit and evaluated.

A cross-encoder reranker can inspect the question and passage jointly. [OpenSearch's reranking documentation](https://docs.opensearch.org/latest/search-plugins/search-relevance/reranking-search-results/) describes a search-time reranking stage. Separate candidate-set recall, final ranking quality, and added latency when assessing it.

Neither a high similarity score nor a high reranker score establishes that a passage is true, current, or sufficient to support the requested claim.

## 6. Select an evidence set, not just the first passages

A project-risk answer may need both the approved deadline and the dependency that threatens it. Retrieving one strongly relevant blocker passage is not enough if the answer also claims that the blocker affects a particular milestone.

Let $G_q$ be a defined set of required evidence units for a question, and $R_{q,K}$ the first $K$ retrieved units. Two useful retrieval measures are

$$
\operatorname{RequiredRecall@K}(q)
=\frac{|G_q\cap R_{q,K}|}{|G_q|},
$$

$$
\operatorname{CompleteEvidence@K}(q)
=\mathbb{1}[G_q\subseteq R_{q,K}].
$$

The second measure is stricter: a question requiring two facts remains incomplete when only one is found. A real task may have alternative sufficient evidence sets; labels should model those alternatives rather than insist on one arbitrary chunk ID. Version-specific IDs also need a stable mapping to the evidence unit being evaluated.

### Budget for coverage and redundancy

With chunk utility $u_d$, token cost $c_d$, and selection $z_d$, evidence packing can be described as

$$
\max_z\left[\sum_dz_du_d-\lambda\sum_{d<e}z_dz_e\operatorname{redundancy}(d,e)\right]
\quad\text{subject to}\quad\sum_dz_dc_d\le B.
$$

This is a conceptual objective, not a claim that the application needs to solve that optimization exactly. Add hard requirements for critical source types or claims where the task demands them. Summarizing away a contradictory passage because it costs tokens can produce a more concise but less defensible answer.

Keep source identity, dates, and original supporting spans available after compression. The [Lost in the Middle study](https://arxiv.org/abs/2307.03172) shows that the position of evidence in long contexts can affect tested models' performance. Its results motivate measuring context use; they do not establish a universal placement rule for every current model.

**Key point:** measure whether the selected context supports all material claims, not merely whether it contains a relevant document.

## 7. A reproducible UI-scoped retrieval demonstration

To make scope and evidence coverage concrete, I built a small deterministic corpus of fictional Jira/project records. **This is a constructed retrieval demonstration, not a held-out production benchmark or an LLM evaluation.**

| Setting             | Value                                                                     |
| ------------------- | ------------------------------------------------------------------------- |
| Organizations       | Two synthetic organizations                                               |
| Projects            | Six fictional projects per organization                                   |
| Evidence types      | Deadline, blocker, owner, acceptance, capacity, and progress              |
| Versions            | Old, current, and future versions for each evidence type                  |
| Corpus size         | 216 versioned records plus one private same-organization record           |
| Query-time snapshot | November 11, 2025                                                         |
| Eligible corpus     | 36 current, authorized records in the requesting organization             |
| Questions           | Five fixed question templates for each of six selected projects: 30 cases |
| Required support    | One or two gold evidence units per question                               |

The templates include “When can this ship?”, “Why might this slip?”, “Who should clear this dependency?”, “Is this ready?”, and “Do we have bandwidth?” The project comes from the captured UI selection, not the sentence itself.

The required evidence is explicit. For “Why might this slip?”, the gold set contains the project's current deadline and blocker records. For “Who should clear this dependency?”, it contains owner and blocker records.

Every method applies the same organization, resource-visibility, availability-time, and validity filters. **The comparison never disables authorization.** It varies project scoping and a deliberately simple lexical expansion policy:

1. **BM25 without UI scope:** rank all 36 authorized current records using only the question text.
2. **UI-scoped BM25:** rank only the six records belonging to the selected project.
3. **UI scope + term expansion:** apply the same project scope and append a fixed, hand-written vocabulary mapping.

| Query term | Added terms in the toy expansion policy |
| ---------- | --------------------------------------- |
| ship       | release, deadline, milestone, target    |
| slip       | blocker, dependency, release, deadline  |
| clear      | owner, ownership, blocker, dependency   |
| ready      | acceptance, verification, blocker       |
| bandwidth  | capacity, allocation, availability      |

The expansion dictionary was designed for these templates. It is not a learned semantic model, and it would not justify an estimate of generalization performance on new user questions. This study does **not** compare BM25 with a neural embedding retriever.

The implementation uses $k_1=1.2$, $b=0.75$, unique query terms, a fixed English stopword list, and stable document-ID tie breaking. Document-frequency and length statistics come from the same 36-record eligible corpus for all methods. Project filtering changes candidates, not those shared scoring statistics.

### What is available at K = 3?

<!-- RAG_RESULTS_START -->

| Retrieval setup           | Required-evidence recall@3 | Complete-evidence rate@3 |
| ------------------------- | -------------------------- | ------------------------ |
| BM25 without UI scope     | 13.3%                      | 10.0%                    |
| UI-scoped BM25            | 70.0%                      | 60.0%                    |
| UI scope + term expansion | 100.0%                     | 100.0%                   |

<!-- RAG_RESULTS_END -->

_Macro averages across the 30 deterministic cases. Required evidence labels identify the facts needed for these constructed questions, not an exhaustive relevance annotation. No confidence intervals, answer-accuracy estimates, or Tempo production claims follow from this table._

[![A bar chart compares required-evidence recall and complete-evidence rate at three results for BM25 without UI scope, UI-scoped BM25, and UI scope with manual term expansion.](/posts/rag-tempo-loop/retrieval-at-three.svg)](/posts/rag-tempo-loop/retrieval-at-three.svg)

_Figure 2. The perfect result for the last policy reflects a tiny corpus and an expansion dictionary tailored to the question templates. It is a demonstration of information made available to generation, not proof of an accurate answer._

Without the UI project, repeated wording across projects makes scope ambiguous. Project filtering removes the wrong-project candidates but does not resolve every vocabulary mismatch. The tailored expansion policy addresses those specific mismatches.

[![Complete-evidence coverage is plotted against the number of retrieved units for the three toy retrieval policies.](/posts/rag-tempo-loop/evidence-coverage.svg)](/posts/rag-tempo-loop/evidence-coverage.svg)

_Figure 3. Retrieving more evidence can improve coverage on this corpus. It also consumes context and can increase distraction in a real agent. This experiment stops at retrieval and contains no language-model generation._

The useful lesson is methodological: hold authorization, corpus time, scoring statistics, and labels constant when isolating a scope or query-processing change. Do not attribute a gain from better project resolution to an embedding model.

Download the [synthetic source records](/posts/rag-tempo-loop/synthetic-corpus.json), [questions and required evidence](/posts/rag-tempo-loop/synthetic-queries.json), [per-question rankings](/posts/rag-tempo-loop/query-rankings.csv), and [aggregate results](/posts/rag-tempo-loop/retrieval-summary.csv).

## 8. Connect retrieved evidence to an agent answer

The agent should receive a structured evidence pack, not only concatenated text:

```yaml
# Illustrative result contract.
scope:
  project_id: DEMOA
  as_of: "2025-11-11"
  view_revision: 17
coverage:
  requested: [approved_deadline, active_blocker]
  retrieved: [approved_deadline, active_blocker]
  unresolved: []
evidence:
  - evidence_id: E1
    source_id: synthetic-decision-01
    revision: current
    supports: approved_deadline
  - evidence_id: E2
    source_id: synthetic-issue-202
    revision: current
    supports: active_blocker
```

A material claim should have a supporting source span or a recorded computation. A risk conclusion may depend on both: the source establishes a blocker, while a dependency tool establishes that it sits on the release path.

### Keep facts, analysis, and suggested action distinct

| Output element       | Example                                                     | Verification                                                              |
| -------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------- |
| Fact                 | “The API issue is blocked.”                                 | Current authorized issue state/source                                     |
| Dependency inference | “That issue gates integration.”                             | Validated dependency edge or explicit source statement                    |
| Forecast statement   | “The blocker scenario has a wider completion range.”        | Forecast tool output and assumptions                                      |
| Recommendation       | “Investigate the contract approval before expanding scope.” | Explain the objective and evidence; do not present it as a factual record |

RAG should not make the agent conceal missing evidence. If no authoritative deadline is available, say that the schedule-risk conclusion is incomplete. If two documents conflict, identify the discrepancy and check whether one supersedes the other. Recency alone is not authority.

[Amazon Bedrock's retrieval documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-how-retrieval.html) describes both retrieval-only and combined retrieval/generation interfaces. Separating retrieval from generation can make application-specific checks and evidence packing easier to inspect; using a managed combined operation does not remove the need to validate its results.

### Retrieved text is not an instruction channel

A Jira comment can contain “ignore previous rules” or an instruction to send data elsewhere. Treat that as untrusted source content. It cannot change the authenticated user, tool permissions, or answer policy.

Restrict tool execution and external destinations independently of the model. A citation link should be rendered as data, not executed as a command. Test indirect prompt injection through source text, titles, metadata, and remembered summaries.

## 9. Evaluate retrieval, generation, and operations separately

A retrieval score cannot diagnose every agent failure. A source can be found and then misread; an answer can cite the right document while asserting something it does not support.

| Layer                 | Measure or test                                                              | What a failure suggests                                   |
| --------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------- |
| Scope resolution      | Correct project, user, period, and UI snapshot                               | Fix reference resolution or ask for clarification         |
| Eligibility           | Unauthorized/stale/future evidence never enters context                      | Repair policy enforcement or version handling             |
| Candidate retrieval   | Required-evidence recall within a fixed universe                             | Improve query/indexing/candidate retrieval                |
| Reranking and packing | Complete evidence under a fixed token budget                                 | Improve ordering, deduplication, and coverage selection   |
| Generation            | Factual claims supported by cited spans or computations                      | Improve answer structure, verification, or model behavior |
| Uncertainty handling  | Correct abstention or qualification when support is missing                  | Fix unsupported-answer incentives and confidence policy   |
| Operations            | Latency percentiles, empty-result rate, indexing lag, cache/version mismatch | Repair dependencies, freshness, or rollout compatibility  |

Use deterministic checks for IDs, permissions, dates, arithmetic, and citation existence. Human review and rubric-based model judges can assess support and usefulness, but a judge's score is not automatically ground truth. Validate agreement and inspect disagreements.

Build evaluation cases for exact Jira keys, paraphrases, cross-project ambiguity, permission revocation, delayed ingestion, stale summaries, conflicting decisions, missing integrations, and questions requiring multiple sources. Include genuinely unanswerable requests; a system that always produces a confident answer can look helpful while failing its evidence contract.

### Avoid leakage when building a serious benchmark

Separate development queries from held-out cases. Do not tune chunk size, synonyms, reranker settings, or prompts repeatedly on the final test set. Split by document families or project/time boundaries where appropriate so near-duplicate source revisions do not make the task trivial.

Freeze index/source versions and record the effective access scope. Construct gold evidence using the requested time semantics. If a question asks about a historical prediction, future revisions must not improve the answer retroactively.

The demonstration above intentionally uses known templates and a tailored dictionary. A production claim needs a substantially broader held-out set and evaluation of the full answer, not an extrapolation from those 30 cases.

**Key point:** instrument the stage that failed before replacing the entire RAG stack.

## 10. Make retrieval releases observable and reversible

Version the source transformation, chunking policy, embedding model, index snapshot, analyzer, fusion settings, reranker, evidence packer, prompt, and evaluator. A retriever release can change behavior even when the generative model stays fixed.

Compare a candidate index or policy against the same authorized query snapshots before routing live traffic. Shadow retrieval can reveal differences without changing user-visible answers, but its logs still contain protected evidence and need the same access and retention controls.

Use a compatible rollback bundle. Reverting an embedding model while keeping an incompatible new index is not a rollback. Handle index migrations, changed chunk IDs, citations, caches, and memories together.

For an incident, ask in order:

1. Did the request resolve to the correct project and period?
2. Were the expected source records available and authorized?
3. Did ingestion and chunking preserve the necessary relationships?
4. Did candidate retrieval find the evidence?
5. Did reranking or token packing remove it?
6. Did generation misinterpret or overstate it?
7. Did the answer's citations and assumptions make the gap visible?

This sequence separates a missing-source problem from a relevance problem and a relevance problem from an unsupported inference. Each calls for a different intervention.

## What dependable RAG adds to Tempo Loop

A useful RAG layer makes the agent's context more precise: which project, which revision, which facts, which sources, and which gaps. It gives the model evidence it can cite, while leaving exact counts, permissions, and numerical forecasts with the systems designed to establish them.

That is how retrieval supports summaries, risk analysis, prioritization, warnings, and completion estimates without turning every nearby passage into apparent truth. The goal is not the largest context window or the most sophisticated retriever. It is an answer whose important claims can be traced to sufficient, current, authorized evidence.

## Reproduce the figures

The [deterministic generator](https://github.com/wiwang/wiwang.github.io/blob/master/scripts/articles/generate_rag_figures.py) creates all fictional records and query labels, implements the lexical baselines, and writes the plots and tables. It makes no LLM or embedding API calls and uses no customer data.

```bash
python3 -m venv .venv-articles
.venv-articles/bin/pip install -r scripts/articles/requirements.txt
.venv-articles/bin/python scripts/articles/generate_rag_figures.py
```

Pinned dependencies and interpretation notes are in `scripts/articles/README.md`. The website serves committed figures; readers do not need to run Python.

## References

- [Lewis et al. (2020): Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks](https://arxiv.org/abs/2005.11401).
- [Anthropic (2024): Introducing Contextual Retrieval](https://www.anthropic.com/engineering/contextual-retrieval).
- [OpenSearch: Filtering vector search results](https://docs.opensearch.org/latest/vector-search/filter-search-knn/index/).
- [OpenSearch: Reciprocal rank fusion](https://docs.opensearch.org/latest/vector-search/ai-search/hybrid-search/rrf/).
- [OpenSearch: Reranking search results](https://docs.opensearch.org/latest/search-plugins/search-relevance/reranking-search-results/).
- [Liu et al.: Lost in the Middle](https://arxiv.org/abs/2307.03172).
- [Amazon Bedrock: Retrieving information from data sources](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-how-retrieval.html).

_Written November 11, 2025; revised October 24, 2026. The current revision links to companion articles and platform documentation that may be newer than the original article date._
