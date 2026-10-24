export const resume = {
  role: "Agentic AI Engineer",
  summary:
    "AI engineer with 1+ year shipping agentic AI in production: MCP clients and servers, tool-calling agents with memory systems, and multi-step workflow automation on Amazon Bedrock and LangChain/LangGraph. 4+ years of production ML and 10+ years of software engineering across big data, distributed systems, and cloud.",
  skills: [
    { label: "Languages", text: "Python, C/C++; familiar with Java and Scala" },
    {
      label: "AI & LLM",
      text: "LangChain/LangGraph, Amazon Bedrock, MCP clients and servers, tool-calling agents, memory systems, prompt-driven workflows",
    },
    {
      label: "Cloud & infrastructure",
      text: "AWS S3, EMR, Lambda, API Gateway, DynamoDB, ECS, EKS, Athena, OpenSearch; Kubernetes; Linux",
    },
    {
      label: "Machine learning",
      text: "PyTorch, scikit-learn, LightGBM/XGBoost, MLflow, AWS SageMaker, Tecton feature stores",
    },
    {
      label: "Data engineering",
      text: "Apache Spark, Kafka, Databricks, Airflow, Snowflake, SQL (MySQL, PostgreSQL), Redis",
    },
    { label: "Tools", text: "Git, Jupyter, Anaconda, Streamlit" },
  ],
  experience: [
    {
      title: "Machine Learning Engineer",
      company: "Tempo.io",
      type: "Full-time",
      dates: "Oct 2021 – Sep 2026",
      highlights: [
        "Built MCP clients and servers enabling AI agents to query Snowflake through structured tool calls, implementing robust tool interfaces, error handling, and reliable multi-step execution.",
        "Developed AI agents integrating multiple MCP servers, external tools, and persistent memory to automate time management, task prioritization, and complex user workflows.",
        "Designed and implemented a RAG pipeline using Amazon OpenSearch as a vector database, integrating document ingestion, embedding generation, semantic retrieval, and contextual grounding to improve agent response accuracy.",
        "Deployed containerized AI agents and MCP servers on Amazon EKS (Kubernetes), implementing horizontal pod autoscaling, health probes, rolling deployments, and centralized logging.",
        "Developed an automated AI agent evaluation harness combining LLM-as-a-Judge, deterministic validation, and execution trace analysis to assess retrieval relevance, tool-calling accuracy, Snowflake query correctness, response groundedness, and end-to-end task completion.",
        "Designed and built an automatic time-management system collecting user activity signals from Jira, Google Calendar, and VS Code/IDEs, rendering ranked task suggestions and time-awareness insights.",
        "Fine-tuned a sentence-transformer (bi-encoder) model on Jira ticket data for semantic similarity search, achieving a 5.3% improvement across all metrics over the baseline NLU-based ticket search.",
        "Built, trained, and deployed learning-to-rank and time-awareness models with SageMaker, scikit-learn, and PyTorch: Top-1 accuracy 75%, Top-5 accuracy 91.5%, and NDCG 0.86.",
        "Built evaluation pipelines with labeled Jira datasets, tracking Top-1/Top-5 accuracy and NDCG and running regression checks before each production release.",
        "Designed feature-engineering pipelines and implemented them in a Tecton feature store serving both training and inference.",
        "Built and deployed a real-time analytics dashboard on AWS (API Gateway, Lambda, DynamoDB, OpenSearch) for user activity data.",
        "Productionized models through automated training-and-deployment pipelines with Airflow and SageMaker, with production monitoring dashboards on AWS.",
      ],
    },
    {
      title: "Machine Learning Engineer",
      company: "Expedia",
      type: "Contract",
      dates: "Aug 2021 – Oct 2021",
      highlights: [
        "Built Spark data pipelines on Databricks, orchestrated with Airflow, feeding a feature store for ML models.",
        "Developed ML models with SageMaker, scikit-learn, and PyTorch predicting click-through and booking rates for travel packages (flights, hotels, car rentals).",
        "Deployed a Streamlit dashboard on AWS for real-time airplane and hotel booking analytics.",
      ],
    },
    {
      title: "Staff Software Engineer",
      company: "Calix Inc.",
      dates: "Oct 2012 – Jul 2019",
      highlights: [
        "Designed and developed a big-data platform for smart-home systems: real-time and batch processing with Spark SQL, DataFrames, and Structured Streaming.",
        "Built ML models with Spark MLlib, scikit-learn, and PyTorch (regression, classification, clustering, LightGBM) and evaluated them at scale.",
        "Owned microservices end to end, built RESTful APIs with Java/Spring, and optimized MySQL/Redis schemas and queries.",
      ],
    },
    {
      title: "Senior Software Engineer",
      company: "ZTE Corp",
      dates: "Aug 2004 – Aug 2012",
      highlights: [
        "Designed and developed distributed in-memory databases and fault-tolerant telecom systems in C/C++; debugged complex systems with the GNU toolchain (gdb, gprof).",
      ],
    },
  ],
  education: [
    { degree: "M.S., Data Science", school: "University of British Columbia" },
    {
      degree: "M.S., Electrical & Computer Engineering",
      school: "University of Massachusetts Amherst",
    },
    {
      degree: "B.S., Electric Information Science and Technology",
      school: "Nanjing University of Posts and Telecommunications",
    },
  ],
};
