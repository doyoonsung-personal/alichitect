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

# Brief: agent interoperability standards and Alibaba Cloud support

Goal: the workflow diagram will show how tools and agents connect. The app needs accurate, current facts about the protocols.

Cover:
1. Model Context Protocol (MCP): the current specification version and transports (stdio, streamable HTTP), authorization model, remote MCP servers, registries; adoption by major vendors.
2. Agent2Agent (A2A): what it is, its governance (Linux Foundation?), version, adoption.
3. Other relevant standards: AG-UI, the OpenAI-compatible Chat Completions and Responses APIs as de-facto interfaces, Agent Skills, OpenTelemetry GenAI semantic conventions for tracing agents.
4. Alibaba Cloud support for each, internationally: which products expose or consume MCP (Model Studio, AI Gateway's MCP features, AgentRun's tool hub, AgentCore, Function Compute MCP hosting, the Alibaba Cloud OpenAPI MCP server), A2A support, OpenTelemetry support in SLS or ARMS for LLM traces. Cite alibabacloud.com pages and say when a fact is only on the China site.
5. Security guidance for MCP in production (tool poisoning, over-permissioned servers, authentication), from the MCP spec and security vendors.
