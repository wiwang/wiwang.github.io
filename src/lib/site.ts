export const site = {
  name: "Zhiyong Wang",
  photo: "/images/zhiyong-wang-profile.jpg",
  url: "https://wiwang.github.io",
  description: "Notes on machine learning, AI, and building useful systems.",
  email: "william.calix.cn@gmail.com",
  github: "https://github.com/wiwang",
  linkedin: "https://www.linkedin.com/in/zhiyong-wang-a8359375/",
};
export const projects = [
  {
    number: "01",
    title: "Agentic AI platform",
    category: "MCP & agent orchestration",
    description:
      "At Tempo, built MCP clients and servers connecting AI agents to Snowflake through structured tool calls, with persistent memory across sessions. Deployed on Amazon EKS with autoscaling, health probes, and centralized logging.",
  },
  {
    number: "02",
    title: "Agent retrieval & evaluation",
    category: "RAG & evaluation",
    description:
      "Designed an Amazon OpenSearch RAG pipeline and an automated evaluation harness combining LLM-as-a-Judge, deterministic validation, and trace analysis to assess retrieval, tool calls, and end-to-end task completion.",
  },
  {
    number: "03",
    title: "Semantic search for Jira",
    category: "Representation learning",
    description:
      "Fine-tuned a sentence-transformer bi-encoder on Jira ticket data for semantic similarity search, achieving a 5.3% improvement across all metrics over the baseline NLU-based ticket search.",
  },
];
