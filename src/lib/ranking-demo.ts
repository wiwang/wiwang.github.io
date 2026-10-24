// Hand-authored synthetic topic vectors, not embeddings from a trained model.
// Dimensions: authentication, interface, data pipelines, scheduling.
export const activities = [
  {
    id: "auth",
    label: "Authentication / token refresh",
    vector: [1, 0.05, 0, 0],
  },
  { id: "ui", label: "Timesheet UI / accessibility", vector: [0, 1, 0, 0.15] },
  {
    id: "data",
    label: "Activity ingestion / data sync",
    vector: [0.1, 0, 1, 0],
  },
  {
    id: "planning",
    label: "Planning / schedule discussion",
    vector: [0, 0.15, 0, 1],
  },
] as const;
export const issues = [
  {
    key: "DEMO-101",
    project: "DEMO",
    title: "Fix expired authentication tokens",
    vector: [1, 0.05, 0.1, 0],
    history: 0.35,
    ageHours: 5,
    allowed: true,
  },
  {
    key: "DEMO-102",
    project: "DEMO",
    title: "Improve keyboard navigation in timesheets",
    vector: [0, 1, 0, 0.1],
    history: 0.9,
    ageHours: 1,
    allowed: true,
  },
  {
    key: "DEMO-103",
    project: "DEMO",
    title: "Repair delayed activity ingestion",
    vector: [0.1, 0, 1, 0.1],
    history: 0.55,
    ageHours: 18,
    allowed: true,
  },
  {
    key: "DEMO-104",
    project: "DEMO",
    title: "Review sprint capacity and milestones",
    vector: [0, 0.15, 0.1, 1],
    history: 0.6,
    ageHours: 30,
    allowed: true,
  },
  {
    key: "OPS-201",
    project: "OPS",
    title: "Rotate service authentication credentials",
    vector: [1, 0, 0.15, 0],
    history: 0.15,
    ageHours: 2,
    allowed: true,
  },
  {
    key: "OPS-202",
    project: "OPS",
    title: "Backfill missing activity records",
    vector: [0, 0, 1, 0.05],
    history: 0.25,
    ageHours: 8,
    allowed: true,
  },
  {
    key: "PRIVATE-301",
    project: "DEMO",
    title: "Restricted synthetic issue",
    vector: [1, 0, 0, 0],
    history: 1,
    ageHours: 0,
    allowed: false,
  },
] as const;
export type DemoInput = {
  ide: number;
  meeting: number;
  ideShare: number;
  project: "DEMO" | "OPS" | "ALL";
  weights: { semantic: number; history: number; recency: number };
};
export const defaultInput: DemoInput = {
  ide: 0,
  meeting: 3,
  ideShare: 0.8,
  project: "DEMO",
  weights: { semantic: 75, history: 15, recency: 10 },
};
export const presets: { label: string; input: DemoInput }[] = [
  { label: "Deep work", input: defaultInput },
  {
    label: "Familiar task",
    input: {
      ...defaultInput,
      weights: { semantic: 15, history: 60, recency: 25 },
    },
  },
  {
    label: "Split context",
    input: {
      ...defaultInput,
      ide: 0,
      meeting: 1,
      ideShare: 0.5,
      weights: { semantic: 100, history: 0, recency: 0 },
    },
  },
];
export function rankIssues(input: DemoInput) {
  const total = Object.values(input.weights).reduce(
    (sum, value) => sum + value,
    0,
  );
  const weights = {
    semantic: total ? input.weights.semantic / total : 0,
    history: total ? input.weights.history / total : 0,
    recency: total ? input.weights.recency / total : 0,
  };
  const a = activities[input.ide].vector;
  const b = activities[input.meeting].vector;
  const context = a.map(
    (value, i) => input.ideShare * value + (1 - input.ideShare) * b[i],
  );
  const norm = (v: readonly number[]) =>
    Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
  const results = issues
    .filter(
      (issue) =>
        issue.allowed &&
        (input.project === "ALL" || issue.project === input.project),
    )
    .map((issue) => {
      const semantic =
        context.reduce((sum, value, i) => sum + value * issue.vector[i], 0) /
        (norm(context) * norm(issue.vector));
      const recency = Math.exp(-issue.ageHours / 24);
      const contributions = {
        semantic: semantic * weights.semantic,
        history: issue.history * weights.history,
        recency: recency * weights.recency,
      };
      return {
        ...issue,
        semantic,
        recency,
        contributions,
        score: Object.values(contributions).reduce(
          (sum, value) => sum + value,
          0,
        ),
      };
    })
    .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
  const margin = results.length > 1 ? results[0].score - results[1].score : 0;
  return { results, weights, margin, hasSignal: total > 0 };
}
