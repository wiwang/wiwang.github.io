## Grounding an agent in work evidence

A fluent answer can still be wrong about a project. The source may be outdated, the query may omit an important filter, or the agent may combine correct facts into an unsupported conclusion. A retrieval system and an evaluation system address different parts of that problem: retrieval supplies evidence, while evaluation checks whether the complete execution used it correctly.

At Tempo, I designed and implemented an OpenSearch-based RAG pipeline covering document ingestion, embedding generation, semantic retrieval, and contextual grounding. I also developed an automated agent evaluation harness combining LLM-as-a-Judge, deterministic validation, and execution trace analysis. It assessed retrieval relevance, tool-calling accuracy, Snowflake query correctness, response groundedness, and end-to-end task completion.

The following architecture and evaluation examples explain this work at a technical level. They are illustrative designs rather than disclosures of proprietary schemas, customer records, or internal benchmark results.

## Two connected loops

[![Knowledge ingestion and retrieval feed agent answers, while evaluation traces diagnose failures and guide revisions.](/projects/agent-retrieval-evaluation.svg)](/projects/agent-retrieval-evaluation.svg)

_Conceptual evidence lifecycle: prepare knowledge, retrieve within scope, generate with tools, then evaluate the execution._

The first loop is the knowledge lifecycle. Source records become versioned searchable evidence, retrieved passages are selected for a question, and the agent uses them with live tools. The second loop is the improvement lifecycle. A labeled task produces a trace, evaluators identify the failure layer, and a revision is tested against the same release gates.

Treating these as connected loops helps avoid a common mistake: responding to every incorrect answer by changing the prompt. If the necessary document was not indexed, a better prompt cannot retrieve it. If retrieval succeeded but the warehouse query used the wrong time window, an embedding change targets the wrong component.

## Ingestion is part of retrieval quality

A robust ingestion design preserves source identity, source revision, availability time, project scope, and access-policy references alongside the text and embedding. Chunking should preserve a decision or explanation with enough context to interpret it; arbitrary character boundaries can separate a conclusion from its conditions.

[OpenSearch vector search](https://docs.opensearch.org/latest/vector-search/) supports storing and querying embeddings alongside other data. The important application decision is how that index relates to source truth. Updates, deletions, permission changes, and encoder migrations all need a path into the searchable representation.

| Ingestion concern                | Why it matters                                     | Illustrative verification                                             |
| -------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------- |
| Stable source and revision IDs   | Attribute evidence to a specific source version    | Retrieved citations resolve to the expected revision                  |
| Update and deletion propagation  | Avoid stale or removed knowledge                   | A deleted record no longer appears in eligible results                |
| Scope and authorization metadata | Restrict the candidate universe                    | Cross-project and cross-tenant test cases return no forbidden content |
| Embedding version                | Keep query and document representations compatible | Index migration tests use matching encoders                           |
| Chunk context                    | Preserve qualifications and relationships          | A decision and its scope remain interpretable together                |

The index is a derived representation, not an independent source of business truth. Operational facts such as current issue counts should come from exhaustive, scoped queries when completeness is required.

## Retrieval that supplies enough evidence

For a question such as “Why might the release slip?”, finding one relevant passage is not sufficient if the answer also requires a delivery commitment, an unresolved blocker, and the current dependency state. Retrieval evaluation therefore needs to distinguish relevance from evidence coverage.

A practical design can combine lexical matching for exact issue keys and technical identifiers with semantic matching for differently worded questions. It can then rerank and select evidence under a context budget. These are architectural options, not a claim that every retrieval stage listed here was deployed in the same Tempo configuration.

Selection should consider redundancy and conflicting versions, not only the highest individual similarity score. Multiple near-duplicate passages can crowd out the one record that changes the conclusion. Citations should retain stable source references so an answer can be audited after the source changes.

The dedicated [RAG article](/rag-tempo-loop/) develops these tradeoffs and includes an explicitly synthetic retrieval study. Those toy results are not production performance measurements for this project.

## Evaluate the execution, not just the final text

The evaluation harness I built combined complementary evidence. Deterministic checks establish properties with explicit expected outcomes. Trace analysis reveals what the agent actually did. A model-based judge can assess semantic qualities that are difficult to express as exact string matches, provided its rubric and reliability are tested.

| Layer        | Example question                                  | Evaluation approach                                                      |
| ------------ | ------------------------------------------------- | ------------------------------------------------------------------------ |
| Scope        | Did “this project” resolve correctly?             | Compare resolved project and interval with the labeled task              |
| Retrieval    | Were the required evidence units available?       | Inspect retrieved IDs against relevance and coverage labels              |
| Tool choice  | Did the agent choose the appropriate operation?   | Validate allowed tool names and required step relationships              |
| Arguments    | Were filters and time boundaries correct?         | Check structured arguments and types deterministically                   |
| Query result | Did the data operation return the intended facts? | Compare constrained fixture results; inspect truncation and completeness |
| Grounding    | Are the answer’s factual claims supported?        | Claim-to-source checks plus a calibrated judge rubric                    |
| Completion   | Did the requested task succeed?                   | Task-specific outcome checks and trace review                            |

An agent can produce correct text for the wrong reason. For example, a fixture may happen to give the same count for two projects. Inspecting the query scope catches that error even when a final-answer comparison passes.

## Snowflake correctness beyond valid SQL

Syntactically valid SQL is only one requirement. A query can run successfully while using the wrong join grain, duplicating rows, shifting a reporting interval, or treating missing data as zero. These failure modes deserve targeted cases.

In an illustrative evaluation fixture, a project has multiple worklog records per issue and multiple issue-history records per issue. Joining both tables before aggregation can multiply worklog totals. A result-based test with known expected totals exposes this more effectively than checking whether the SQL contains a particular keyword.

Useful checks include allowed resources, required scope filters, explicit time zones, aggregation grain, duplicate handling, and bounds on returned rows. Execution should occur in an appropriately constrained environment. SQL text inspection can complement those controls, but it is not a substitute for permissions or result validation.

## Making LLM judges useful

A judge needs a narrow rubric. Groundedness asks whether factual claims follow from the supplied evidence; it does not ask whether the prose sounds persuasive. Task completion asks whether the requested outcome was achieved; it should not reward mentioning every expected keyword.

A defensible workflow compares judge decisions with reviewed labels, examines disagreements, and measures consistency across representative task categories. The judge should not receive the candidate system’s identity, and source text must be treated as untrusted evidence rather than instructions. Changes to judge prompts or models should be versioned because they can move scores without changing the agent.

For nondeterministic agents, repeated runs reveal variability. Report the task distribution, number of runs, and failure categories alongside aggregates. A small average improvement should not conceal a regression on permission handling or a frequently used workflow.

## Release decisions and production feedback

Version the task set, labels, prompts, model configuration, tools, retriever, and judge rubric together. Keep tuning cases separate from held-out evaluation cases, and use difficult historical failures as regression fixtures after their diagnosis.

A release gate should combine essential invariants with quality and operational budgets. Authorization failures require a different response from a slightly weaker prose score. Latency, cost, retrieval coverage, and completion must also be interpreted together: an agent that succeeds only by repeatedly searching may be operationally unsuitable.

The result of this project was an evidence-grounding pipeline and a structured way to diagnose agent quality across retrieval, tools, data access, and answers. No private benchmark size or numerical quality gain is claimed here. Related work: [the agent platform](/projects/agentic-ai-platform/), [MLOps operations](/mlops-production-systems/), and [the Tempo Loop agent design](/agentic-ai-tempo-loop/).
