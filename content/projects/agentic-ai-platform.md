## From questions to dependable execution

In a work-management product, “What should I focus on today?” depends on more than a language model’s general knowledge. It requires the user’s current scope, recent activity, unfinished work, and access to operational data. A useful answer must connect a recommendation to the facts behind it, and a useful automation must make its execution inspectable.

At Tempo, I built MCP clients and servers that enabled agents to query Snowflake through structured tool calls. I developed agents integrating multiple MCP servers, external tools, and persistent memory, and deployed containerized agents and MCP services on Amazon EKS. My work included robust interfaces, error handling, reliable multi-step execution, horizontal pod autoscaling, health probes, rolling deployments, and centralized logging.

The technical walkthrough below describes the design decisions behind this class of platform. Schemas, examples, and architectural boundaries are illustrative; they are not an inventory of Tempo’s internal services.

## Architecture and responsibility boundaries

[![A scoped user request passes through context resolution, agent planning, structured tools, and validated results.](/projects/agentic-ai-platform.svg)](/projects/agentic-ai-platform.svg)

_Conceptual execution flow. Application identity and authorization remain outside the model’s discretion._

The central engineering boundary is between **reasoning about an operation** and **being authorized to execute it**. The agent can propose a tool and its arguments. The application establishes identity, checks scope, validates arguments, invokes the tool, and decides whether the returned result is sufficient for the next step.

| Layer               | Responsibility                                                                 | Failure to prevent                                    |
| ------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------- |
| Request context     | Capture authenticated user, active project, current UI selection, and question | Resolving “this project” to an unrelated project      |
| Agent orchestration | Choose a bounded sequence of steps and track intermediate results              | Unbounded retries or repeating a failed action        |
| MCP interface       | Expose discoverable tools with explicit schemas and predictable results        | Guessing arguments from ambiguous tool descriptions   |
| Data access         | Apply access controls and execute bounded queries                              | Treating model-provided tenant IDs as authority       |
| Response validation | Separate facts, inferences, missing evidence, and suggested actions            | Presenting a partial tool result as a complete answer |

The [MCP tools specification](https://modelcontextprotocol.io/specification/2025-11-25/server/tools) defines discoverable tool schemas and invocation results. A good application still needs its own authorization, execution limits, observability, and recovery policy around that protocol.

## Designing a useful tool contract

A tool interface should expose the smallest useful business operation. A generic “run arbitrary SQL” surface is flexible, but it puts a large correctness burden on the agent. A narrower operation can make required filters, time ranges, and result limits explicit.

For example, an illustrative project-summary tool could accept a project reference and reporting interval:

```json
{
  "project_ref": "DEMOA",
  "period": { "start": "2026-10-01", "end_exclusive": "2026-10-08" },
  "include": ["open_work", "recent_changes", "blocking_dependencies"]
}
```

The authenticated tenant and user would come from trusted request context, not from this JSON. A response should carry the resolved scope, observation time, completeness, and structured records. “No records found,” “not authorized,” and “upstream unavailable” are different results; collapsing them into an empty list encourages false conclusions.

A reliable contract also needs semantics for pagination, truncation, timestamp zones, and missing fields. If a result is truncated, the answer cannot claim to summarize the entire project without further retrieval. If the tool cannot establish a dependency, the agent should identify that uncertainty rather than fill it with a plausible narrative.

## Multi-step execution as a state machine

Consider a user asking for a project risk summary followed by a prioritized action list. An illustrative execution plan is: resolve project scope, fetch current state, retrieve relevant decisions, inspect dependencies, propose priorities, and verify the answer against the collected results.

Each step should retain its inputs, output reference, completion state, and attempt count. That makes the difference between a retryable transport failure and an invalid request visible to the orchestrator. Retry transient failures with a bounded budget; changing the arguments or asking the user for scope may be appropriate for a semantic failure.

For tools that mutate state, retries require stronger care: a response timeout does not prove the operation failed. An idempotency key and a way to check the prior operation’s status avoid repeating an action blindly. The concrete Snowflake query work on this project was data access; this mutation example explains how the same execution architecture should be extended when adding workflow actions.

The agent should also have explicit stop conditions. Exhausting a latency budget, repeatedly failing a schema check, or lacking required evidence should lead to a useful partial result with limitations, rather than another planning loop.

## Persistent memory with provenance

Persistent memory helps an agent carry preferences and prior context across sessions, but stored text can become stale. A statement such as “I’m focused on DEMOA this week” is not a permanent assignment and does not override the current project selected in the UI.

A useful memory record distinguishes the fact or preference, its source, when it was observed, its intended scope, and when it expires or should be reconfirmed. Current operational state belongs in tools; durable user preferences belong in memory; historical decisions belong in retrievable evidence. Keeping those roles distinct reduces accidental dependence on outdated context.

Memory retrieval should be bounded by relevance and permission. Storing more history is not automatically better: irrelevant previous conversations can distract from a precise current request. The system also needs an invalidation path for corrected preferences and deleted source records.

## Operating the platform on EKS

Production deployment changes the problem from “can the agent answer?” to “can the service fail and recover predictably?” My implementation work included containerized deployment, autoscaling, health probes, rolling updates, and centralized logs.

For an agent service, readiness should reflect whether a pod can accept a request; liveness should detect a stuck process without turning a short downstream outage into a restart storm. Autoscaling also needs to consider concurrent long-running requests and downstream quotas: adding pods does not increase a model provider’s or data warehouse’s capacity.

| Operational signal                   | What it helps diagnose                  | Useful follow-up                                 |
| ------------------------------------ | --------------------------------------- | ------------------------------------------------ |
| End-to-end latency and tool latency  | Slow reasoning versus slow dependencies | Inspect the critical path in the execution trace |
| Tool schema and execution errors     | Contract drift versus transient failure | Compare tool versions and error categories       |
| Attempts and steps per request       | Retry amplification or planning loops   | Review execution budgets and stop conditions     |
| Queue depth and active requests      | Saturation during long-running tasks    | Revisit concurrency and scaling limits           |
| Result completeness and task outcome | Fast but insufficient answers           | Review validation and missing-evidence handling  |

Traces should connect the user request, agent steps, MCP invocation, and data operation using correlation IDs. Logging every raw prompt or query result is rarely necessary for diagnosis; structured summaries and controlled access to sensitive debugging data are more manageable.

## What this project demonstrates

The work brought together agent orchestration, protocol integration, persistent memory, warehouse access, and Kubernetes operations. The engineering contribution was making those pieces execute as a service with explicit contracts and observable failure modes. I do not report an unverified latency, cost, or task-success improvement here.

The next layer is evaluating whether each execution actually answered the user’s question. See the [retrieval and evaluation project](/projects/agent-retrieval-evaluation/) and the [Agentic Loop Agent article](/agentic-ai-tempo-loop/) for deeper treatment of context, grounding, and task completion.
