## The vocabulary gap in Jira search

People describe the same work in different ways. A user might search for “session expires after login” while an issue title says “authentication token refresh failure.” Exact word matching can miss that connection. At the same time, an explicit Jira issue key should remain an exact identifier, not be treated as an approximate semantic concept.

At Tempo, I fine-tuned a sentence-transformer bi-encoder on Jira ticket data for semantic similarity search. My resume records a **5.3% improvement across the evaluated metrics over the baseline NLU-based ticket search**. The original metric definitions, dataset size, and whether that number is relative or percentage-point change are not provided in the public material, so I do not reconstruct them or present a new benchmark here.

This case study explains the representation-learning problem, an illustrative retrieval architecture, and the evaluation decisions needed to interpret such a result. Training schemas, example tickets, and design alternatives below are explanatory, not private project artifacts.

## Architecture: encode once, retrieve efficiently

[![Jira tickets are prepared and embedded offline; a query encoder retrieves scoped candidates and produces ranked issue results.](/projects/semantic-search-jira.svg)](/projects/semantic-search-jira.svg)

_Conceptual bi-encoder flow. Ticket embeddings are reusable; candidate eligibility and exact identifiers remain explicit._

A bi-encoder maps a query and an issue representation into a shared vector space. Issue vectors can be computed ahead of time, while the query is encoded when the user searches. Retrieval then finds high-scoring eligible candidates. A cross-encoder, by contrast, jointly scores query–candidate text and generally belongs after a candidate-retrieval stage when its additional cost is justified.

The model’s notion of similarity has to match the task. Two tickets can share a component while describing different failures. Two descriptions can concern the same failure while sharing few keywords. Domain adaptation aims to make those useful relationships visible in the representation. The [Sentence Transformers training guide](https://sbert.net/docs/sentence_transformer/training_overview.html) explains why training examples and objectives must reflect the intended similarity task.

## Representing a Jira issue

An issue is more than its title, but blindly concatenating every field can drown the useful description in repetitive metadata. A deliberate representation chooses which fields contribute meaning and which remain structured filters.

| Input                       | Representation role                      | Failure to watch                                                  |
| --------------------------- | ---------------------------------------- | ----------------------------------------------------------------- |
| Summary and description     | Primary semantic content                 | Boilerplate overwhelms the actual task                            |
| Component and product terms | Domain context                           | Overfitting to a narrow component taxonomy                        |
| Issue key                   | Exact identifier and provenance          | Approximate matching substitutes a different issue                |
| Project and tenant          | Candidate eligibility and scope          | Ranking retrieves inaccessible records                            |
| Status and update time      | Operational filters or ranking context   | Stale resolved issues dominate current work                       |
| Comments                    | Optional evidence with source boundaries | Long, noisy discussion or later information leaks into evaluation |

The precise input template and truncation policy should be versioned with the encoder. A model trained on title-plus-description may behave differently if inference suddenly adds hundreds of lines of comments. Issue updates also require an embedding refresh strategy; otherwise the index describes an older task state than the UI displays.

## Fine-tuning: teach the relevant distinctions

An illustrative contrastive training example pairs a query with a relevant issue and contrasts it with competing issues. The important work is not merely choosing a loss function. It is defining what counts as a positive, which negatives are genuinely negative, and which examples represent real search intent.

Easy negatives from unrelated projects can make a training loss improve without teaching the model to separate two very similar tickets. Hard negatives—candidates retrieved by a baseline but judged unsuitable—provide more useful distinctions, but they need review. A supposedly negative issue might be an acceptable alternative or a duplicate of the positive.

A generic contrastive objective raises the positive score relative to negative scores. Its behavior depends on sampling, batch composition, and temperature. In-batch negatives are convenient, but can introduce false negatives when different examples refer to equivalent work. This objective discussion is a technical explanation of the model family; it does not assert the exact loss or mining recipe used internally.

## Prevent leakage before measuring improvement

Jira datasets often contain near-duplicate titles, cloned issues, recurring incidents, and successive revisions of the same issue. A random row split can put essentially the same content on both sides of an evaluation boundary.

A stronger protocol groups related issues before splitting, defines which fields were available at the query’s timestamp, and separates training, tuning, and held-out evaluation. If historical user activity is used to create search examples, future issue edits and later worklog confirmations must not become current-query features.

Candidate eligibility also affects results. Ranking among ten easy candidates is not comparable to ranking among every accessible issue. Report the candidate universe, project scope, issue-status policy, and treatment of previously worked issues together with the score.

## Evaluate retrieval and ranking separately

A candidate retriever must first include the relevant issue; a later ranker cannot recover an item it never receives. That makes candidate recall and ordering quality different diagnostic signals.

| Measure                     | What it answers                                     | Interpretation limit                                             |
| --------------------------- | --------------------------------------------------- | ---------------------------------------------------------------- |
| Recall at K                 | Is relevant work in the candidate set?              | Does not establish the first result is useful                    |
| Top-1 accuracy              | Is the first suggestion labeled correct?            | Depends on how multiple valid issues are labeled                 |
| MRR                         | How early does the first relevant item appear?      | Ignores additional relevant items after the first                |
| NDCG                        | Does the ranking place highly relevant items early? | Requires meaningful relevance grades and a defined cutoff        |
| Latency and index freshness | Is the result timely enough for the workflow?       | Good offline relevance does not establish operational usefulness |

Compare methods on identical eligible candidates and held-out queries. Inspect difficult slices—short queries, jargon, exact keys, cross-project wording, and newly created issues—rather than relying on a single aggregate. Confidence intervals or paired per-query comparisons help establish whether a small movement is stable.

The reported 5.3% result belongs to this semantic search project. The separate Top-1, Top-5, and NDCG numbers in my resume belong to learning-to-rank and time-awareness models; they should not be merged into a synthetic comparison table for this encoder.

## Connecting search to missing issue keys and timesheet ranking

This representation work is relevant to the wider Tempo workflow: infer the active Jira issue from activity signals, then rank timesheet suggestions. A calendar event, IDE activity window, or work description can supply evidence about what someone was doing when no issue key is explicitly present.

That inference is not identical to ordinary search. Activity can refer to several issues, a meeting can concern a project rather than a ticket, and a user may have changed tasks within the window. The system should retain uncertainty and permit correction rather than force every interval onto the nearest vector.

An illustrative architecture uses semantic retrieval to form candidates, then combines semantic evidence with activity recency, prior user–issue interactions, and operational eligibility in a downstream ranker. Candidate scope, temporal validity, and feature availability must be consistent between offline evaluation and serving. The [recommendation systems article](/recomendation/) develops this workflow and includes synthetic experiments; its plots are not measurements from this search project.

## Serving and model updates

An encoder change implies an index change. Query vectors from a new model should not silently search old vectors from an incompatible representation. A versioned index and coordinated cutover make the dependency explicit and provide a rollback path.

Useful production checks include query-encoding failures, embedding freshness, candidate counts after filtering, retrieval latency, and changes in accepted or corrected suggestions. User feedback is valuable but biased by what the system already displayed; a click is not automatically a clean relevance label.

This project demonstrates domain-specific representation learning connected to a concrete work-management problem. Its value is the combination of model adaptation, Jira-aware data preparation, and careful evaluation—not semantic similarity in isolation. Read more about [MLOps and feature pipelines](/mlops-production-systems/) or the complementary [retrieval and evaluation project](/projects/agent-retrieval-evaluation/).
