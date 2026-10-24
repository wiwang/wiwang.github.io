"use client";
import { useState } from "react";
import {
  activities,
  defaultInput,
  presets,
  rankIssues,
  type DemoInput,
} from "@/lib/ranking-demo";

const percent = (value: number) => `${Math.round(value * 100)}%`;
export function RankingDemo() {
  const [input, setInput] = useState<DemoInput>(defaultInput);
  const [chosen, setChosen] = useState<string | null>(null);
  const { results, weights, margin, hasSignal } = rankIssues(input);
  function update(next: DemoInput) {
    setInput(next);
    setChosen(null);
  }
  return (
    <div className="ranking-demo">
      <div className="demo-presets">
        <span className="eyebrow">TRY A SCENARIO</span>
        {presets.map((preset) => (
          <button key={preset.label} onClick={() => update(preset.input)}>
            {preset.label}
          </button>
        ))}
        <button onClick={() => update(defaultInput)}>Reset</button>
      </div>
      <a className="demo-jump text-link" href="#ranking-heading">
        View updated suggestions ↓
      </a>
      <div className="demo-flow" aria-label="Demo pipeline">
        <div>
          <span>01</span>
          <strong>Activity signals</strong>
          <small>No issue key supplied</small>
        </div>
        <span aria-hidden="true">→</span>
        <div>
          <span>02</span>
          <strong>Candidate filtering</strong>
          <small>{results.length} eligible issues</small>
        </div>
        <span aria-hidden="true">→</span>
        <div>
          <span>03</span>
          <strong>Timesheet ranking</strong>
          <small>Explain, then review</small>
        </div>
      </div>
      <div className="demo-workspace">
        <section className="demo-controls" aria-labelledby="signals-heading">
          <h2 id="signals-heading">Build the context</h2>
          <p>Imagine a 30-minute work window. What signals describe it?</p>
          <label>
            IDE activity
            <select
              value={input.ide}
              onChange={(e) =>
                update({ ...input, ide: Number(e.target.value) })
              }
            >
              {activities.map((a, i) => (
                <option key={a.id} value={i}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Calendar context
            <select
              value={input.meeting}
              onChange={(e) =>
                update({ ...input, meeting: Number(e.target.value) })
              }
            >
              {activities.map((a, i) => (
                <option key={a.id} value={i}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Activity mix{" "}
            <span>
              {percent(input.ideShare)} IDE · {percent(1 - input.ideShare)}{" "}
              calendar
            </span>
            <input
              aria-label="IDE share of activity context"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={input.ideShare}
              onChange={(e) =>
                update({ ...input, ideShare: Number(e.target.value) })
              }
            />
          </label>
          <label>
            Project scope
            <select
              value={input.project}
              onChange={(e) =>
                update({
                  ...input,
                  project: e.target.value as DemoInput["project"],
                })
              }
            >
              <option value="DEMO">DEMO · product engineering</option>
              <option value="OPS">OPS · platform operations</option>
              <option value="ALL">All accessible projects</option>
            </select>
          </label>
          <h3>Balance the ranking</h3>
          <p>
            Weights are normalized automatically. Try increasing history to
            favor familiar work.
          </p>
          {(["semantic", "history", "recency"] as const).map((key) => (
            <label key={key} className={`weight-${key}`}>
              {key === "semantic"
                ? "Activity similarity"
                : key === "history"
                  ? "User–issue history"
                  : "Recent issue activity"}
              <span>{percent(weights[key])} of score</span>
              <input
                type="range"
                min="0"
                max="100"
                value={input.weights[key]}
                onChange={(e) =>
                  update({
                    ...input,
                    weights: {
                      ...input.weights,
                      [key]: Number(e.target.value),
                    },
                  })
                }
              />
            </label>
          ))}
        </section>
        <section className="demo-results" aria-labelledby="ranking-heading">
          <div className="demo-results-heading">
            <h2 id="ranking-heading">Ranked suggestions</h2>
            <a className="demo-jump text-link" href="#signals-heading">
              Adjust signals ↑
            </a>
            <span className="demo-badge">SYNTHETIC DATA</span>
          </div>
          <div className="demo-insight" role="status" aria-live="polite">
            {!hasSignal ? (
              <>
                <strong>No ranking signal</strong>
                <p>Raise at least one weight to produce a suggestion.</p>
              </>
            ) : (
              <>
                <strong>
                  {margin < 0.06
                    ? "Close match — review before assigning"
                    : `Leading suggestion: ${results[0].key}`}
                </strong>
                <p>
                  Top-two score gap: {margin.toFixed(3)}.{" "}
                  {margin < 0.06
                    ? "The evidence does not clearly separate the leading issues."
                    : "Compare the evidence below before choosing an issue."}
                </p>
              </>
            )}
          </div>
          <div className="demo-legend">
            <span className="weight-semantic">Activity similarity</span>
            <span className="weight-history">History</span>
            <span className="weight-recency">Recency</span>
          </div>
          <ol className="demo-ranking">
            {results.map((issue, i) => (
              <li key={issue.key}>
                <div className="demo-rank-top">
                  <span className="demo-rank-number">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <span className="demo-issue-key">{issue.key}</span>
                    <h3>{issue.title}</h3>
                  </div>
                  <span className="demo-score">
                    {hasSignal ? issue.score.toFixed(3) : "—"}
                    <small>score / 1</small>
                  </span>
                </div>
                <div
                  className="demo-score-track"
                  role="img"
                  aria-label={`Weighted score contributions: activity ${issue.contributions.semantic.toFixed(3)}, history ${issue.contributions.history.toFixed(3)}, recency ${issue.contributions.recency.toFixed(3)}`}
                >
                  {(["semantic", "history", "recency"] as const).map((key) => (
                    <span
                      key={key}
                      className={`contribution-${key}`}
                      style={{ width: `${issue.contributions[key] * 100}%` }}
                    />
                  ))}
                </div>
                <div className="demo-evidence">
                  <span>Similarity {issue.semantic.toFixed(2)}</span>
                  <span>History {issue.history.toFixed(2)}</span>
                  <span>Updated {issue.ageHours}h ago</span>
                </div>
                <button
                  className="demo-choose"
                  disabled={!hasSignal}
                  aria-pressed={chosen === issue.key}
                  onClick={() => setChosen(issue.key)}
                >
                  {chosen === issue.key
                    ? "Selected for this demo ✓"
                    : `Choose ${issue.key}`}
                </button>
              </li>
            ))}
          </ol>
          {chosen && (
            <p className="demo-selection" role="status">
              You chose {chosen} for the fictional 30-minute window. Nothing is
              submitted or saved to Jira or Tempo.
            </p>
          )}
        </section>
      </div>
      <details className="demo-method">
        <summary>How the demo calculates scores</summary>
        <div className="prose">
          <p>
            This is a transparent scoring simulation, not a trained Tempo model.
            Four hand-authored topic dimensions represent authentication,
            interface work, ingestion, and planning. IDE and calendar vectors
            are blended using the activity-mix slider. Cosine similarity
            compares that context with each synthetic issue vector.
          </p>
          <pre>
            <code>{`score = w_similarity × cosine(context, issue)
      + w_history × synthetic_history
      + w_recency × exp(-hours_since_update / 24)`}</code>
          </pre>
          <p>
            The three weights sum to 1 unless all are zero. The stacked bars
            show weighted contributions on the same 0–1 scale. History is a
            fixed synthetic feature; recency uses fictional timestamps. Scores
            are not probabilities or accuracy measurements. The 0.06 review
            threshold is illustrative and uncalibrated.
          </p>
          <p>
            Permission filtering runs before ranking, regardless of project
            scope. One deliberately restricted synthetic record is always
            excluded. In production, permissions would come from a trusted
            backend. Here the full fictional fixture is public client-side data,
            not an access-control implementation.
          </p>
          <p>
            A production system would learn representations, evaluate candidate
            recall and ranking on held-out activity windows, and use user
            corrections with care. This demo runs entirely in your browser; your
            choices and slider values are not sent to a server.
          </p>
        </div>
      </details>
    </div>
  );
}
