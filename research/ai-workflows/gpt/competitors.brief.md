# Shared context (read first)

Today is 2026-11-02. You are researching for an app that Alibaba Cloud pre-sales staff and their customers use. A user types a request in plain language, and the app's AI draws a live diagram while it chats with the user. The app already draws cloud architectures (VPCs, databases, load balancers). We are adding a second focus: **AI solutions and agentic workflows**. Example request: "I want to set up an agentic workflow that reads incoming support emails, answers the routine ones from our help-centre articles and sends the rest to a human with a draft reply." For a request like that, the app will draw the workflow (trigger, steps, tools, the model used at each step, human approval, loops), name the Alibaba Cloud products behind each part, estimate cost, and later export a proposal for business readers.

Who reads your report: an engineer and a pre-sales architect who will turn it into the app's product catalog, its drawing rules and its test cases. They will open your cited pages to verify every load-bearing fact, so precise citations matter more than prose.

Customers are international (Southeast Asia, Korea, Japan, Europe, the US), not mainland China. Singapore (ap-southeast-1) is the default region. Facts already verified on 2026-10-31 (report it explicitly if you find newer information that contradicts one):
- Model Studio's no-code agent and workflow apps and its knowledge base are open only to accounts that created Singapore apps before 2025-04-21, so new international customers build agents from Model Studio's model APIs plus their own runtime (AgentCore, AgentRun, Dify on ACK, or code on Function Compute or ACS).
- qwen3.8-max costs $2 per 1M input tokens and $6 per 1M output tokens in Singapore. Model Studio's international regions are Singapore, Virginia, Frankfurt, Tokyo and Hong Kong (not Seoul).
- Model Studio fine-tuning and batch exist only in Singapore (and Beijing) among the regions that matter; Model Studio PrivateLink is documented for Beijing and Hong Kong only.
- AgentLoop (agent observability) runs internationally only in Hong Kong. AgentRun's only international endpoint is Singapore. AI Search Open Platform is documented for Shanghai and Frankfurt only.

Rules for your answer:
- This is a read-only research task: do not edit or create files. Use live web search and open the pages you cite; do not answer from memory, which is out of date for products, prices and laws.
- Put the source URL in brackets right after each fact. Prefer official pages: alibabacloud.com (international) over aliyun.com (China); for general practice, the vendors' own engineering pages and docs (Anthropic, OpenAI, Google, Microsoft, AWS, LangChain), papers, and named practitioners over SEO blogs.
- Mark facts you could not confirm as "unconfirmed", and facts found only on the China site as "China site only".
- Be thorough and structured: tables where the brief asks for them. Do not pad with general explanations.

---

# Brief: how AWS, Azure and Google Cloud package agentic AI, mapped to Alibaba Cloud

Goal: customers often arrive saying "we use Bedrock Agents" or "we are looking at Azure AI Foundry". The app must map those services to Alibaba Cloud equivalents and explain differences honestly.

Cover, for AWS (Bedrock, Bedrock Agents, Bedrock AgentCore with Runtime, Gateway, Memory, Identity, Browser, Code Interpreter, Observability; Bedrock Flows; Bedrock Knowledge Bases; Bedrock Guardrails; Step Functions for orchestration), Microsoft Azure (AI Foundry Agent Service, Foundry workflows, Azure AI Search, Content Safety, Logic Apps, Copilot Studio) and Google Cloud (Vertex AI Agent Builder, Agent Engine, ADK, Agentspace or Gemini Enterprise, Vertex AI Search, Model Armor, Workflows):
1. Each service's role in an agentic workflow (runtime, tool gateway, memory, identity, sandbox, observability, knowledge retrieval, guardrails, orchestration, low-code builder).
2. A mapping table: workflow part | AWS | Azure | Google Cloud | Alibaba Cloud equivalent (use only these Alibaba ids: model-studio, agentcore, agentrun, agent-sandbox, acs-agent-sandbox, agentbay, ai-gateway, tablestore, milvus, opensearch, elasticsearch, ai-guardrails, agent-identity, agentloop, sls, arms, fc, eventbridge, dify-on-ack, pai-eas) | how close the match is (same, similar, partial, none) | the main difference.
3. Where Alibaba Cloud has no equivalent internationally, say so.
4. Prices or billing models of the AWS AgentCore components, as a reference for comparisons (cite the pricing pages).
Cite official docs for every row.
