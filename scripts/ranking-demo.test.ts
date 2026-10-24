import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultInput, presets, rankIssues } from "../src/lib/ranking-demo";
test("eligibility is enforced before ranking for every project scope", () => {
  for (const project of ["ALL", "DEMO", "OPS"] as const) {
    const { results } = rankIssues({ ...defaultInput, project });
    assert(results.length > 0);
    assert(
      results.every(
        (issue) =>
          issue.allowed && (project === "ALL" || issue.project === project),
      ),
    );
    assert(!results.some((issue) => issue.key === "PRIVATE-301"));
  }
});
test("contributions sum to a bounded score and weights are scale invariant", () => {
  const base = rankIssues(defaultInput);
  const scaled = rankIssues({
    ...defaultInput,
    weights: { semantic: 150, history: 30, recency: 20 },
  });
  assert(
    Math.abs(Object.values(base.weights).reduce((a, b) => a + b, 0) - 1) <
      1e-12,
  );
  assert.deepEqual(
    base.results.map((r) => r.score),
    scaled.results.map((r) => r.score),
  );
  for (const issue of base.results) {
    assert(issue.score >= 0 && issue.score <= 1);
    assert.equal(
      issue.score,
      Object.values(issue.contributions).reduce((a, b) => a + b, 0),
    );
  }
});
test("history weighting changes the leader while balanced context produces a review gap", () => {
  assert.equal(rankIssues(presets[0].input).results[0].key, "DEMO-101");
  assert.equal(rankIssues(presets[1].input).results[0].key, "DEMO-102");
  assert(rankIssues(presets[2].input).margin < 0.06);
});
test("zero weights yield no recommendation signal and deterministic tie ordering", () => {
  const { hasSignal, results } = rankIssues({
    ...defaultInput,
    weights: { semantic: 0, history: 0, recency: 0 },
  });
  assert.equal(hasSignal, false);
  assert(results.every((r) => r.score === 0));
  assert.deepEqual(
    results.map((r) => r.key),
    [...results.map((r) => r.key)].sort(),
  );
});
