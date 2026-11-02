# Research briefs for the AI workflow view (Qwen deep research, 2026-11-02)

Each brief below is sent to qwen3.8-max through `tools/qwen/research.ts` (Responses API, reasoning effort xhigh, web search), with the shared context prepended. Raw reports land in `research/ai-workflows/qwen/` and are unverified until checked.

=== CONTEXT ===
# Shared context (read first)

Today is 2026-11-02. You are researching for an app that Alibaba Cloud pre-sales staff and their customers use. A user types a request in plain language, and the app's AI draws a live diagram while it chats with the user. The app already draws cloud architectures (VPCs, databases, load balancers). We are adding a second focus: **AI solutions and agentic workflows**. Example request: "I want to set up an agentic workflow that reads incoming support emails, answers the routine ones from our help-centre articles and sends the rest to a human with a draft reply." For a request like that, the app will draw the workflow (trigger, steps, tools, the model used at each step, human approval, loops), name the Alibaba Cloud products behind each part, estimate cost, and later export a proposal for business readers.

Who reads your report: an engineer and a pre-sales architect who will turn it into the app's product catalog, its drawing rules and its test cases. They will open your cited pages to verify every load-bearing fact, so precise citations matter more than prose.

Customers are international (Southeast Asia, Korea, Japan, Europe, the US), not mainland China. Singapore (ap-southeast-1) is the default region. Facts already verified on 2026-10-31 (report it explicitly if you find newer information that contradicts one):
- Model Studio's no-code agent and workflow apps and its knowledge base are open only to accounts that created Singapore apps before 2025-04-21, so new international customers build agents from Model Studio's model APIs plus their own runtime (AgentCore, AgentRun, Dify on ACK, or code on Function Compute or ACS).
- qwen3.8-max costs $2 per 1M input tokens and $6 per 1M output tokens in Singapore. Model Studio's international regions are Singapore, Virginia, Frankfurt, Tokyo and Hong Kong (not Seoul).
- Model Studio fine-tuning and batch exist only in Singapore (and Beijing) among the regions that matter; Model Studio PrivateLink is documented for Beijing and Hong Kong only.
- AgentLoop (agent observability) runs internationally only in Hong Kong. AgentRun's only international endpoint is Singapore. AI Search Open Platform is documented for Shanghai and Frankfurt only.

Rules for your answer:
- Search the web many times and answer only from what you find. Your own memory of Alibaba products, model names and prices is out of date.
- Put the source URL in brackets right after each fact. Prefer official pages: alibabacloud.com (international) over aliyun.com (China); for general practice, the vendors' own engineering pages and docs (Anthropic, OpenAI, Google, Microsoft, AWS, LangChain), papers, and named practitioners over SEO blogs.
- Mark facts you could not confirm as "unconfirmed", and facts found only on the China site as "China site only".
- Be thorough and structured: tables where the brief asks for them. Do not pad with general explanations.

=== BRIEF models-text ===
# Brief: Model Studio text, reasoning and coding models (international)

Goal: a catalog of every text-generation model a new international customer can call on Alibaba Cloud Model Studio today, so the app can pick the right model for each workflow step and estimate its cost.

Cover:
1. Qwen flagship, balanced and fast tiers (for example qwen3.8-max, qwen3.8-plus or qwen3.7-plus, qwen3.8-flash, and any newer ones), their snapshot versus "latest" naming, and which are recommended for new builds.
2. Thinking and reasoning modes: which models have hybrid thinking, how it is switched on and how thinking tokens are billed.
3. Coding models (Qwen3-Coder or newer) and long-context or document models (for example qwen-long, if still offered).
4. Open-weight Qwen models served on Model Studio (sizes such as 235B-A22B, 32B, 30B-A3B, 8B) and whether they cost less.
5. Third-party models on Model Studio's international site (for example DeepSeek, Kimi, GLM, MiniMax): which, and in which regions.
6. Translation models (qwen-mt or newer).

For every model give a table row with: model id, tier or purpose, context window, max output, price per 1M input and output tokens in Singapore (and any tiered pricing by input length), thinking support, function calling and structured output support, international regions, status (GA, preview, deprecated, with dates), free quota for new users.

Then add:
- Model Studio's own guidance on choosing between tiers.
- Deprecations and retirements announced for 2026-2027.
- Context cache and batch discounts as they apply to these models (percentages, which models).

=== BRIEF models-multimodal ===
# Brief: Model Studio multimodal, speech, embedding, rerank and generation models (international)

Goal: the non-text half of the model catalog, for workflow steps that read images or documents, listen or speak, retrieve, or generate media.

Cover, for the international site (Singapore first, then other international regions):
1. Vision-language models (Qwen-VL family, for example qwen3-vl-plus, qwen3-vl-flash or newer), and OCR or document-parsing models (for example qwen-vl-ocr).
2. Omni and realtime models (Qwen-Omni, realtime voice conversation), and how realtime is accessed (WebSocket API).
3. Speech recognition (for example Fun-ASR, Paraformer, qwen3-asr) and speech synthesis (CosyVoice, qwen3-tts), including languages (Korean, Japanese, English, Thai, Vietnamese, Indonesian, Malay), streaming support and price units.
4. Embedding models: text-embedding-v4 and v3, multimodal embedding, dimensions, max input, price; batch price.
5. Rerank models (for example gte-rerank-v2 or qwen3-rerank) and price.
6. Image generation and editing (Wan, Qwen-Image), and video generation (Wan text-to-video and image-to-video): ids, price per image or second, regions.

For every model give a table row with: model id, what it is for in a workflow step, inputs and outputs, limits (context, audio length, image size), price and unit in Singapore, international regions, status. Note which ones are China site only.

=== BRIEF api-features ===
# Brief: Model Studio API features for building agents (international)

Goal: what an agent built on Model Studio's APIs can rely on, so the app does not promise features that do not exist internationally.

Cover, each with how it works, which models support it, international availability and the doc URL:
1. API surfaces: OpenAI-compatible Chat Completions, the Responses API, the native DashScope API, the Anthropic-compatible API (if any), and SDKs.
2. Function calling: parallel tool calls, tool_choice, streaming tool calls, limits on the number of tools.
3. Structured output: JSON mode and JSON Schema (strict or not), which models.
4. Built-in tools in the Responses API or elsewhere: web search, web extractor or page reader, code interpreter, file search, image search, and remote MCP servers as tools. For each, the price per call and whether file search depends on the knowledge base that is closed to new international accounts.
5. MCP: does Model Studio offer an MCP marketplace or hosted MCP servers internationally? Can the APIs call a customer's remote MCP server directly?
6. Context cache (implicit and explicit): discount percentage, minimum length, time to live, which models.
7. Batch API: discount, turnaround, regions, which models.
8. Reasoning controls: thinking on or off, thinking budget, reasoning effort levels, how reasoning tokens are billed.
9. Rate limits: default requests and tokens per minute for the main models, and how to raise them.
10. Content safety: Model Studio's built-in input and output moderation, the error it returns when content is blocked (for example data_inspection_failed), whether it can be turned off or tuned, and how AI Guardrails relates to it.
11. Data handling: whether customer data is used for training, data retention, where data is processed for the Singapore endpoint, and any compliance certifications listed for Model Studio internationally.
12. Workspaces, API keys, sub-accounts (RAM) and per-workspace usage and cost tracking.
13. Assistants or Agents APIs, and the application (app_id) calling API: what remains usable for new international accounts.

End with a short table: feature | available internationally (yes, no, partly) | notes | source.

=== BRIEF platforms-runtime ===
# Brief: Alibaba Cloud platforms that run and orchestrate agentic workflows (international)

Goal: for each product that can host, orchestrate or trigger an agentic workflow, what it does, which part of a workflow it covers, and whether a new international customer can use it in Singapore.

Products to research (and any others you find):
1. AgentCore (formerly the Multi-agent Governance and Collaboration Platform or AgentTeams): no-code and pro-code agents, skills, MCP tools, knowledge bases, human review, governance, which IM channels it connects (DingTalk, Lark, Slack, Microsoft Teams, WhatsApp, LINE, Telegram, web widget?), pricing model, regions.
2. AgentRun: supported frameworks (LangChain, LangGraph, Google ADK, AgentScope, CrewAI?), built-in sandbox, model gateway, MCP tool hub, memory, tracing, triggers, pricing, regions.
3. Function Compute 3.0 for AI: triggers (HTTP, timer, OSS, EventBridge, message queues), long-running and async invocations, GPU functions, hosting MCP servers, AI application templates.
4. CloudFlow (Serverless Workflow): is it available internationally? Does it support waiting for a callback (human approval), parallel branches, loops, retries, and calling LLMs directly?
5. EventBridge and message queues (MNS/SMQ, RocketMQ) as workflow triggers.
6. Dify on ACK and Dify on PAI-EAS: what Alibaba provides, versions, and limits.
7. Open-source agent frameworks Alibaba maintains and documents for Alibaba Cloud: AgentScope, Spring AI Alibaba, Qwen-Agent. Which are recommended, and how they deploy to Alibaba Cloud.
8. Cloud Application Platform (CAP, Function AI): China only or international?

For each product: one-paragraph description; workflow parts it covers (trigger, orchestration, agent loop, tool hosting, memory, knowledge, channel, human approval, observability); international regions and status; pricing model; doc URLs; and limits that matter for a design (timeouts, concurrency, quotas).

Finish with a table that maps workflow parts to the products that can implement them, marking international availability.

=== BRIEF platforms-tools ===
# Brief: tools, knowledge, memory, safety and observability for agents on Alibaba Cloud (international)

Goal: the supporting products an agentic workflow uses around the model, with what each does and international availability.

Cover:
1. AI Gateway's agent features: MCP server proxying, turning REST APIs into MCP tools, model routing and fallback, token rate limits, semantic caching, content safety plug-ins; regions.
2. MCP servers that Alibaba Cloud hosts or lists internationally (for example in Model Studio, AgentRun's tool hub, Function Compute templates, or the Cloud Agent Catalog).
3. Knowledge and retrieval for RAG: Vector Retrieval Service for Milvus, OpenSearch (vector search and LLM-based conversational search editions), Elasticsearch AI search, AnalyticDB PostgreSQL vector, Hologres vector, PolarDB vector, Lindorm vector, DashVector, and document parsing services (for example Document Mind or the AI Search Open Platform). For each: what it adds for RAG (hybrid search, rerank, chunking, parsing), regions, and a short pick-when.
4. Agent memory: Tablestore's agent memory features, Mem0 integrations, Tair, and what AgentRun and AgentCore use for short-term and long-term memory.
5. Sandboxes for agent actions: Agent Sandbox (Flash and Container editions), AgentBay, and browser automation options.
6. Safety and identity: AI Guardrails (prompt injection, jailbreak, data-leak and harmful-content detection), Content Moderation, Agent Identity (workload identities, token vault, on-behalf-of access), Agent Security Center; regions and status.
7. Observability and evaluation: AgentLoop, SLS and ARMS LLM observability (traces of LLM calls, token cost dashboards), CloudMonitor 2.0 AI observability, and any LLM evaluation service.
8. Integration with business systems: connectors for email, IM, CRM or ERP that Alibaba Cloud documents for agents (for example in AgentCore or Function Compute).

For each product: what it does for an agent, international regions and status, pricing model, doc URL. Finish with a table: workflow need | product(s) | international availability | note.

=== BRIEF reference-solutions ===
# Brief: official Alibaba Cloud reference architectures, solutions and customer cases for agentic AI (international)

Goal: the patterns Alibaba Cloud itself publishes, so the app can say "this follows Alibaba Cloud's documented solution" when that is true, and "custom design" when it is not.

Find, on alibabacloud.com (solutions pages, help-centre best practices, Architecture Center or solution tech docs, blog, webinars, case studies) and in Alibaba Cloud's official GitHub repositories:
1. Reference architectures or solution guides for: customer-service agents, enterprise knowledge assistants (RAG), document and contract processing, marketing content generation, e-commerce (product descriptions, multilingual listings, shopping assistants), voice agents and call centres, data analysis agents (natural language to SQL), coding agents, and multi-agent systems.
2. For each: the products used, the steps of the workflow, the region it was written for, whether it uses a China-only product, and the URL.
3. Customer case studies of agentic AI on Alibaba Cloud with named international customers (Southeast Asia, Korea, Japan, Middle East, Europe): what they built, which products, and any measured results.
4. Alibaba Cloud's own published guidance on building agents (for example blog series, white papers, or "Agent" best-practice docs), with their main recommendations.

Report a table of solutions (name | use case | products | workflow steps | region | China-only parts | URL), then the case studies, then the guidance.

=== BRIEF patterns ===
# Brief: canonical agentic workflow patterns (vendor-neutral best practice)

Goal: a catalog of the workflow and agent patterns that leading practitioners recommend, precise enough for the app to draw each one as a diagram and to choose between them.

Primary sources to search and cite: Anthropic's "Building effective agents" and its multi-agent research system write-up and context-engineering posts; OpenAI's "A practical guide to building agents" and Agents SDK docs; Google's Agent Development Kit docs (sequential, parallel and loop agents, multi-agent systems) and Google Cloud's agent design pattern guidance; LangGraph docs (workflows versus agents, human-in-the-loop interrupts, persistence); Microsoft's Azure Architecture Center "AI agent orchestration patterns" and Microsoft Agent Framework; AWS prescriptive guidance on agentic AI patterns; well-known papers (ReAct, Reflexion, plan-and-execute, LLM compiler) where they define a pattern.

Cover at least: prompt chaining with gates; routing (classifier to specialised handlers); parallelisation (sectioning and voting); orchestrator-workers; evaluator-optimizer (generate and critique loops); the autonomous tool-using agent loop (ReAct); plan-and-execute; multi-agent handoffs and supervisor or hierarchical teams; group chat or debate; human-in-the-loop approval and escalation; retrieval-augmented generation and agentic RAG; event-driven and long-running or scheduled agents; and deep-research style agents.

For each pattern give: a definition; its structure as nodes and edges (what each node does, where loops are); when to use it and when not to; the model choice per node (where sources recommend a small fast model versus a large reasoning model); typical failure modes and how practitioners mitigate them; its cost and latency profile; where humans approve; and sources.

Also report: the "workflow versus agent" decision guidance (when fixed code paths beat autonomous agents), the "start simple, add complexity only when it pays" principle with its sources, and any published decision tree for choosing a pattern.

=== BRIEF production-practices ===
# Brief: production best practices for agentic AI systems (vendor-neutral)

Goal: the practices that make an agentic workflow reliable, safe and affordable in production, so the app's designs and proposals include them where they matter and explain why.

Cover, citing primary sources (vendor engineering blogs and docs, OWASP, NIST, papers, named practitioners):
1. Tool design: how to write tool definitions and descriptions, tool count limits, idempotent and reversible tools, read versus write tools, returning concise results ("agent-computer interface").
2. Context engineering and memory: system prompt structure, context window management, compaction or summarisation, short-term versus long-term memory, retrieval of memory, and caching stable prefixes.
3. Guardrails and security: prompt injection (direct and indirect), the "lethal trifecta" of private data plus untrusted content plus outbound actions, least-privilege credentials for agents, sandboxing code execution, input and output filters, PII handling, and the OWASP Top 10 for LLM applications and for agentic AI.
4. Human-in-the-loop: which actions need approval (irreversible, financial, external communication), confidence thresholds for escalation, review queues, and how approval is implemented (interrupts, callbacks).
5. Reliability: retries and backoff, timeouts, max iterations and budget caps for agent loops, fallback models, validating structured outputs, idempotency keys, and durable execution for long-running workflows.
6. Evaluation: building an eval set before launch, offline evals, LLM-as-judge and its pitfalls, regression testing, online monitoring, tracing every step, and the metrics that matter (task success, escalation rate, cost per task, latency).
7. Cost and latency: model cascading and routing (cheap model first), prompt caching, batching, limiting reasoning effort, streaming, and parallel steps.
8. RAG quality: chunking strategies, hybrid search (keyword plus vector), reranking, metadata filters, query rewriting, citations, freshness, and evaluating retrieval.
9. Governance: audit logs, data residency, model and prompt versioning, change management, and responsible-AI review.

For each area: 4 to 8 concrete practices, each with a one-line rationale and source. Then list the ten practices with the biggest impact for a first production deployment, in order.

=== BRIEF usecases-service ===
# Brief: customer-service and conversational agentic workflows (common enterprise use cases, 2025-2026)

Goal: reference workflows for the customer-facing requests the app will hear most, so it can draw a good first design and ask the right questions.

Cover these use cases in depth: customer-support email or ticket triage and auto-resolution; live chat and messaging agents (WhatsApp, LINE, KakaoTalk, web chat) with handoff to humans; voice agents for call centres (inbound and outbound); shopping assistants and product recommendations; travel or booking assistants; and personalised education or tutoring.

For each use case give:
- Trigger (what starts a run) and the systems it touches.
- Steps in order, each typed as one of: classify, extract, retrieve, generate, decide or route, act (calls a system), approve (human), notify. Mark loops and parallel branches.
- The model capability each step needs (small fast LLM, large reasoning LLM, vision or OCR, speech recognition, speech synthesis, embeddings plus rerank, code execution) and why.
- Tools and integrations, and where a human approves or takes over.
- Guardrails that matter for this use case (accuracy thresholds, PII, audit).
- Business value and KPIs, with published figures where they exist (cite them).
- Common pitfalls and the discovery questions a pre-sales architect should ask.

Note anything specific to Asia-Pacific markets (languages, messaging apps, regulations such as Korea's PIPA or Singapore's PDPA) where you find sources.

=== BRIEF usecases-revenue ===
# Brief: sales, marketing and commerce agentic workflows (common enterprise use cases, 2025-2026)

Goal: reference workflows for revenue-side requests.

Cover these use cases in depth: sales prospect research and outreach drafting; RFP and security-questionnaire answering; meeting notes to CRM updates; marketing content generation and localisation (multilingual); social listening and review analysis; and e-commerce product listing creation and catalog enrichment from product images.

For each use case give:
- Trigger (what starts a run) and the systems it touches.
- Steps in order, each typed as one of: classify, extract, retrieve, generate, decide or route, act (calls a system), approve (human), notify. Mark loops and parallel branches.
- The model capability each step needs (small fast LLM, large reasoning LLM, vision or OCR, speech recognition, speech synthesis, embeddings plus rerank, code execution) and why.
- Tools and integrations, and where a human approves or takes over.
- Guardrails that matter for this use case (accuracy thresholds, PII, audit).
- Business value and KPIs, with published figures where they exist (cite them).
- Common pitfalls and the discovery questions a pre-sales architect should ask.

Note anything specific to Asia-Pacific markets (languages, messaging apps, regulations such as Korea's PIPA or Singapore's PDPA) where you find sources.

=== BRIEF usecases-documents ===
# Brief: document-heavy back-office agentic workflows (common enterprise use cases, 2025-2026)

Goal: reference workflows for internal document processing requests.

Cover these use cases in depth: invoice, receipt and purchase-order processing; contract review and clause extraction; KYC and customer onboarding document checks; insurance claims processing; financial report analysis and summarisation; compliance monitoring and policy Q&A; and document translation and localisation pipelines.

For each use case give:
- Trigger (what starts a run) and the systems it touches.
- Steps in order, each typed as one of: classify, extract, retrieve, generate, decide or route, act (calls a system), approve (human), notify. Mark loops and parallel branches.
- The model capability each step needs (small fast LLM, large reasoning LLM, vision or OCR, speech recognition, speech synthesis, embeddings plus rerank, code execution) and why.
- Tools and integrations, and where a human approves or takes over.
- Guardrails that matter for this use case (accuracy thresholds, PII, audit).
- Business value and KPIs, with published figures where they exist (cite them).
- Common pitfalls and the discovery questions a pre-sales architect should ask.

Note anything specific to Asia-Pacific markets (languages, messaging apps, regulations such as Korea's PIPA or Singapore's PDPA) where you find sources.

=== BRIEF usecases-operations ===
# Brief: IT, engineering, data and people-operations agentic workflows (common enterprise use cases, 2025-2026)

Goal: reference workflows for internal operations requests.

Cover these use cases in depth: HR recruiting (résumé screening, interview scheduling) and employee onboarding Q&A; internal IT helpdesk; SRE incident triage and root-cause analysis; data analysis agents (natural language to SQL, charts, reports); code review and pull-request agents; supply-chain exception handling; and enterprise search or knowledge assistants over internal documents.

For each use case give:
- Trigger (what starts a run) and the systems it touches.
- Steps in order, each typed as one of: classify, extract, retrieve, generate, decide or route, act (calls a system), approve (human), notify. Mark loops and parallel branches.
- The model capability each step needs (small fast LLM, large reasoning LLM, vision or OCR, speech recognition, speech synthesis, embeddings plus rerank, code execution) and why.
- Tools and integrations, and where a human approves or takes over.
- Guardrails that matter for this use case (accuracy thresholds, PII, audit).
- Business value and KPIs, with published figures where they exist (cite them).
- Common pitfalls and the discovery questions a pre-sales architect should ask.

Note anything specific to Asia-Pacific markets (languages, messaging apps, regulations such as Korea's PIPA or Singapore's PDPA) where you find sources.

=== BRIEF diagram-notation ===
# Brief: how agentic workflows are drawn (notations and builder tools)

Goal: a node and edge vocabulary for the app's workflow diagram that matches what customers already know from popular builders, and lessons on laying such diagrams out.

Research how these tools and docs represent agentic workflows: n8n (AI Agent node with attached model, memory and tools), Dify (workflow and chatflow node types), Coze and Coze Studio, LangGraph and LangGraph Studio, Langflow, Flowise, OpenAI Agent Builder (AgentKit), Google ADK visual builder or Agent Designer, Microsoft Copilot Studio and Azure AI Foundry workflows, AWS Bedrock Flows and Bedrock AgentCore, Zapier Agents, and Alibaba's own builders (Model Studio workflow apps, AgentCore). Also look for published notations: BPMN applied to agents, and diagrams in vendor reference architectures.

Report:
1. A comparison table of node types across these tools: start or trigger, LLM call, agent (with tools), tool or HTTP call, knowledge retrieval, condition or router, loop or iteration, parallel branches, human input or approval, code, sub-workflow or sub-agent, memory, variable or aggregator, end or output.
2. How each tool shows an agent's tools: attached to the agent node (like n8n's sub-nodes) or as separate steps; and how they show model choice per node.
3. How loops, retries, parallel branches and handoffs between agents are drawn.
4. Layout: direction (left to right or top to bottom), auto-layout algorithms they use, and how they keep large graphs readable.
5. Natural-language-to-workflow features (for example n8n's AI workflow builder, Copilot Studio's "describe it" creation): what they generate and known weaknesses.
6. A recommended minimal node and edge vocabulary (8 to 12 node kinds) for a diagram that pre-sales staff and business readers can follow, with a one-line justification each.

=== BRIEF cost-sizing ===
# Brief: estimating the cost and latency of agentic workflows

Goal: a method the app can use to show "about $X per run and $Y per month" for a drawn workflow, with honest ranges.

Cover:
1. How practitioners estimate tokens per step: system prompt, instructions, retrieved context, tool results, conversation history, output, and reasoning or thinking tokens. Typical token counts for common step types (classification, extraction from a one-page document, RAG answer with five chunks, drafting an email, an agent loop with N tool calls), with sources where published.
2. Multipliers that blow up costs: agent loop iterations, retries, growing history, multi-agent fan-out (cite published numbers such as multi-agent systems using several times more tokens than chat), and how to cap them.
3. Savings levers and their typical effect: prompt and context caching (with Model Studio's own discount figures), batch processing discounts, model cascading, shorter outputs, lower reasoning effort.
4. Non-model costs in an agentic workflow on Alibaba Cloud: vector database instances, Function Compute invocations, AgentRun or AgentCore fees, sandboxes, gateways, logging. How each is billed (with links to pricing pages).
5. Latency: typical time to first token and tokens per second for large versus small models, how parallel steps help, and how to present latency in a proposal.
6. A worked example: a support-email triage workflow handling 10,000 emails a month on Model Studio (Singapore prices), step by step, with assumptions stated.

Give formulas and a table of default assumptions the app can use, each with a source or marked as an assumption.

=== BRIEF presales ===
# Brief: what pre-sales architects need when proposing agentic AI solutions

Goal: the discovery questions, objections, scoping and proposal content that make an AI solution proposal useful to a customer's business and technical readers.

Cover, citing vendor field guides, solution-architect blogs (AWS, Google Cloud, Microsoft, Alibaba Cloud), consulting and analyst reports, and practitioner write-ups:
1. Discovery questions for agentic AI projects: the business process and its volume, data sources and their quality, systems to integrate, accuracy and latency requirements, tolerance for automation versus human review, languages, compliance and data residency, success metrics, and budget.
2. The objections customers raise most (hallucination, data privacy and training on customer data, cost unpredictability, vendor lock-in, using a China-headquartered cloud for international data, security of agents taking actions, job displacement) and evidence-based answers to each.
3. How to scope a proof of concept: picking a narrow, high-volume process, defining success criteria and an evaluation set up front, timeboxing, and what usually goes wrong between PoC and production (published failure rates, with sources).
4. ROI framing: how published case studies quantify value (hours saved, resolution rate, cost per ticket), and how to present cost per run against the human baseline.
5. What a good AI solution proposal contains for executives versus engineers, including risk and governance sections.
6. Phased rollout patterns (assistive, then supervised automation, then autonomous for low-risk cases).

End with a checklist of the 15 questions an AI-solution diagram tool should ask or assume, in priority order.
