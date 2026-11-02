I'll research this systematically, starting with the core agent platforms.

Let me dig into AgentCore specifics — regions, pricing, channels.

Now let me get specifics on regions, billing, and channels.

Let me close two design-critical gaps: email ingestion triggers and native human-approval steps.

# Alibaba Cloud platforms that run and orchestrate agentic workflows — international (Singapore-first)

Research date: 2026-11-02. All URLs were reached via search-result snippets; where a page's full table could not be read from the snippet, I say so and mark it **partially confirmed** or **unconfirmed**. "China site only" = the fact appears only on `help.aliyun.com` / `aliyun.com`, not on `alibabacloud.com`.

---

## 0. Delta against the 2026-10-31 verified baseline

I found **no contradiction** of any baseline fact. Confirmations:

| Baseline fact | Status | Source |
|---|---|---|
| Model Studio agent/workflow app **API** calls restricted to accounts that created Singapore apps before 2025-04-21 | **Still stated** on 4 separate international pages | [application-introduction](https://www.alibabacloud.com/help/en/model-studio/application-introduction), [single-agent-application](https://www.alibabacloud.com/help/en/model-studio/single-agent-application), [workflow-application](https://www.alibabacloud.com/help/en/model-studio/workflow-application), [build-knowledge-base-qa-assistant-without-coding](https://www.alibabacloud.com/help/en/model-studio/build-knowledge-base-qa-assistant-without-coding) |
| Model Studio international regions = Singapore, Virginia, Frankfurt, Tokyo, Hong Kong (+ Beijing) | Confirmed | [Regions and endpoints](https://www.alibabacloud.com/help/en/model-studio/regions) |
| Model Studio PrivateLink = Beijing + Hong Kong only | Confirmed | [access-model-studio-through-privatelink](https://www.alibabacloud.com/help/en/model-studio/access-model-studio-through-privatelink) |
| AI Search Open Platform = Shanghai + Frankfurt only | Confirmed | [ai-getting-started](https://www.alibabacloud.com/help/en/open-search/search-platform/getting-started/ai-getting-started) |
| AgentLoop internationally = Hong Kong only | Confirmed — space creation offers `cn-hangzhou`, `cn-shanghai`, `cn-hongkong` only | [AgentLoop quickstart](https://www.alibabacloud.com/help/en/agentloop/agentloop-quickstart-whole-process-practice) |
| AgentRun's only international region = Singapore | Confirmed | [AgentRun supported regions](https://help.aliyun.com/en/agentrun/open-service-area) (China site) and the same page published in es/tr/pt-br on the international site, e.g. [alibabacloud.com/help/es/agentrun/open-service-area](https://www.alibabacloud.com/help/es/agentrun/open-service-area) |
| qwen3.8-max = $2 in / $6 out per 1M tokens in Singapore | Corroborated by three independent 2026 pricing trackers; the primary page is [Model inference pricing](https://www.alibabacloud.com/help/en/model-studio/model-pricing) | [cloudzero](https://www.cloudzero.com/blog/qwen-api-pricing/), [morphllm](https://www.morphllm.com/qwen-api), [lindy.ai](https://www.lindy.ai/blog/qwen-3-8) |

**New information the app's catalog must absorb** (all found on the international site unless noted):

1. **AgentTeams no longer exists as a product** — it has been migrated into **AgentCore**; Alibaba publishes a migration procedure for control-plane resources [agentteams-has-been-migrated-to-agentcore](https://www.alibabacloud.com/help/en/agentcore/agentteams-has-been-migrated-to-agentcore). AgentCore's API version is `2026-08-04` [API overview](https://www.alibabacloud.com/help/en/agentcore/api-agentcore-2026-08-04-overview.md).
2. **AgentCore is available in Singapore (`ap-southeast-1`)** — the international product overview lists `ap-southeast-1` in its supported-regions table [AgentCore Overview](https://www.alibabacloud.com/help/en/agentcore/agentcore-product-overview), and the endpoint table lists `agentcore.ap-southeast-1.aliyuncs.com` [Endpoints](https://help.aliyun.com/en/agentcore/api-agentcore-2026-08-04-endpoint) (**China site only** for the endpoint table).
3. **AgentCore started billing on 2026-09-18 00:00 (UTC+8)**; it is in **public preview** and activation itself is free [AgentCore billing activation](https://www.alibabacloud.com/help/en/agentcore/agentcore-billing-activation), [AgentCore Billing](https://help.aliyun.com/en/agentcore/agentcore-billing-instructions).
4. **CloudFlow's new version is billed from 2025-10-10** and the international docs cover both CloudFlow (new) and legacy Serverless Workflow [Billing overview for new and previous versions](https://www.alibabacloud.com/help/en/serverless-workflow/latest/billing-overview), [docs llms.txt](https://www.alibabacloud.com/help/en/serverless-workflow/llms.txt).
5. **AgentRun Flow can import Dify and n8n DSLs** and serve Dify Workflow / Dify Chatflow protocols — directly relevant to your drawing rules [ConvertFlowDSL](https://www.alibabacloud.com/help/en/agentrun/api-agentrun-2025-09-10-convertflowdsl.md), [Quick start: create a Flow Agent](https://www.alibabacloud.com/help/doc-detail/3049290.html).
6. A **whole agent-infra product family** now exists internationally that was not in your brief: Agent Sandbox, AgentBay, AgentLoop, Agent Identity / Agent ID Guard, Agent Security Center, Agentic Computer (JVS). See §9.
7. **CAP / Function AI is China-site-only** — see §8.

---

## 1. AgentCore (ex-AgentTeams / ex-Multi-agent Governance and Collaboration Platform)

**What it does.** "AgentCore is an agent building and governance platform that supports creating and managing Agents in a unified console"; the product page calls it "a unified platform for building, governing, and executing enterprise AI agents … through three core" capability groups [AgentCore Overview](https://www.alibabacloud.com/help/en/agentcore/agentcore-product-overview), [product page](https://www.alibabacloud.com/en/product/agentcore?_p_lc=1). The three capabilities are **building and running**, **collaboration and governance**, and **observability and evaluation** [AgentCore Overview](https://www.alibabacloud.com/help/en/agentcore/agentcore-product-overview). It is positioned as the successor to AgentTeams, "a one-stop enterprise multi-agent governance and collaboration platform" [What Does Alibaba Cloud's Agent Infra Look Like](https://www.alibabacloud.com/blog/what-does-alibaba-clouds-agent-infra-look-like_603177).

**Agent forms (three, per the docs and API):**

| Form | How | Source |
|---|---|---|
| Managed Harness (no/low code) | Two harness types: **QwenPaw** and **Qoder**; configure model, role, tools, Skills, Subagents, MCP, credentials | [Managed Harness Agent user guide](https://www.alibabacloud.com/help/en/agentcore/agent-instructions-managed-harness) |
| Custom / high-code agent | Container image **or** code package; `runtime` must include `compute` + `sessionPolicy`; creation is asynchronous | [CreateCustomAgent](https://www.alibabacloud.com/help/en/agentcore/api-agentcore-2026-08-04-createcustomagent), [Deploy and use a high-code Agent](https://www.alibabacloud.com/help/en/agentcore/high-code-agent-deployment-guide) |
| External agent (register only) | Register an agent that runs elsewhere | [UpdateExternalAgent](https://www.alibabacloud.com/help/en/agentcore/api-agentcore-2026-08-04-updateexternalagent) |

The product page summarises this as "Onboard agents (both pro-code and Harness forms) from any source in one place … (managed by Alibaba Cloud, bring-your-own, registration)" and "Native High-Code Integration: Deploy existing Pro-code Agents directly to the AgentCore runtime without any modifications" [product page](https://www.alibabacloud.com/en/product/agentcore?_p_lc=1).

**Serving protocol.** A high-code agent must expose **AG-UI** or **OpenAI Chat Completions** to participate in team collaboration [AgentCore SDK Pro-Code Collaboration Guide](https://help.aliyun.com/en/agentcore/agentcore-sdk-high-code-collaboration-guide) (**China site only**); the SDK doc on the international site says you "select a serving protocol" [AgentCore SDK Overview](https://www.alibabacloud.com/help/en/agentcore/agentcore-sdk-overview).

**Assets: models, MCP tools, Skills, memory, knowledge.** "When you build an agent application on AgentCore, the platform manages the models, MCP tools, Skills, memory, and credentials" [AgentCore SDK Overview](https://www.alibabacloud.com/help/en/agentcore/agentcore-sdk-overview); "Unified Asset Orchestration: Models, tools, skills, memory, and knowledge" plus "an integrated Marketplace for enterprise-owned skills and MCP" [product page](https://www.alibabacloud.com/en/product/agentcore?_p_lc=1). MCP tools are first-class: `ListMcpTools` "queries the list of tools exposed by a specified MCP service and their input/output schemas" [ListMcpTools](https://www.alibabacloud.com/help/en/agentcore/api-agentcore-2026-08-04-listmcptools).

**Knowledge base.** AgentCore knowledge bases are *connections*, not a store: "An AgentCore knowledge base can connect to an existing Alibaba Cloud Model Studio knowledge base" [Connect an Alibaba Cloud Model Studio Knowledge Base](https://www.alibabacloud.com/help/en/agentcore/connect-the-refined-knowledge-base-in-the-agentcore.md); creating a connection from an official template makes AgentCore "generate an MCP tool" [Overview of Knowledge Base Connections](https://www.alibabacloud.com/help/en/agentcore/overview-of-knowledge-base-connections). ⚠️ Design consequence: because Model Studio's Singapore KB is reachable by API but Model Studio *application* APIs are gated to pre-2025-04-21 accounts (see §0), whether a **new** Singapore customer can create the Model Studio KB that AgentCore connects to is **unconfirmed** — the KB itself is documented as an independent, separately billed feature [What is Model Studio](https://www.alibabacloud.com/help/en/model-studio/what-is-model-studio), but I did not find a page stating KB creation is open to new Singapore accounts.

**Memory.** "Memory Space is an independent resource in AgentCore that provides Agents with persistent memory capabilities. MCP exposes memory read and write" [Memory Space overview](https://www.alibabacloud.com/help/en/agentcore/memory-space-overview.md); long-term memory CRUD + semantic search APIs exist [SearchMemories](https://www.alibabacloud.com/help/en/agentcore/api-agentcore-2026-08-04-searchmemories.md), [API overview](https://www.alibabacloud.com/help/en/agentcore/api-agentcore-2026-08-04-overview.md).

**IM channels — this is the important negative finding.** AgentCore supports exactly **three**: `DINGTALK`, `FEISHU` (Lark), `WECOM` [CreateAgentIMChannel](https://www.alibabacloud.com/help/en/agentcore/api-agentcore-2026-08-04-createagentimchannel), [ListAgentIMChannels](https://help.aliyun.com/en/agentcore/api-agentcore-2026-08-04-listagentimchannels) (**China site only**), [Connect an Agent to an IM Bot](https://www.alibabacloud.com/help/en/agentcore/integrate-the-agent-into-the-im-channel.md). The overview additionally names "DingTalk, WeChat, and Lark" for account integration [AgentCore Overview](https://www.alibabacloud.com/help/en/agentcore/agentcore-product-overview). **No Slack, Microsoft Teams, WhatsApp, LINE or Telegram connector is documented anywhere in AgentCore — unconfirmed/absent.** For an international customer that means the IM channel layer must be built by the customer (web widget, Slack/Teams bot) or taken from a sibling product (Agentic Computer, §9).

**Human review / governance.** The product page claims "Collaborate with agents in visible and controllable processes to split tasks intelligently and **take over failures automatically**", credential isolation "via control-plane secret management, preventing plaintext exposure to Agents", and "Runtime protection includes log sanitization" [product page](https://www.alibabacloud.com/en/product/agentcore?_p_lc=1). Team constructs exist: TeamHarness, team tasks, **scheduled** team tasks ("automatically run a specified task at a preset time or frequency", depends on the scheduling service), user management [Team collaboration guide (TeamHarness)](https://www.alibabacloud.com/help/en/agentcore/team-collaboration-instructions-collaboration-teamharness.md), [Use Team to Schedule Tasks](https://www.alibabacloud.com/help/en/agentcore/use-team-web-to-set-tasks), [AgentTeams Dashboard blog](https://www.alibabacloud.com/blog/agentteams-dashboard-unified-management-of-teams-projects-and-assets_603683). A **dedicated "pause-for-approval before this tool call" primitive is not documented — unconfirmed**; the Human-in-the-Loop language is at blog level ("Employees can initiate tasks, supervise in real time, and approve") [What Does Alibaba Cloud's Agent Infra Look Like](https://www.alibabacloud.com/blog/what-does-alibaba-clouds-agent-infra-look-like_603177).

**Observability/eval.** "AgentCore deeply integrates with Alibaba Cloud AgentLoop: Code Judge …" [What Makes Alibaba Cloud's Newly Released AgentCore Different](https://www.alibabacloud.com/blog/what-makes-alibaba-cloud%E2%80%99s-newly-released-agentcore-different_603627); "The unified Agent Governance layer also embeds observability, evaluation, and tuning" [product page](https://www.alibabacloud.com/en/product/agentcore?_p_lc=1). ⚠️ Since AgentLoop internationally is Hong Kong only (§0), AgentCore's evaluation layer is effectively **HK-only for international customers** — a cross-region dependency your diagram rules should surface.

**Networking.** Per-workspace choice of "public network access, VPC access, or the collaboration access method" [Configure AgentCore networking](https://www.alibabacloud.com/help/en/agentcore/configure-the-agentcore-network). An **Image Cache** feature is in public preview, free during preview [Image Cache (Public Preview)](https://www.alibabacloud.com/help/en/agentcore/mirrored-cache).

**Regions.** International overview lists China (Hangzhou) `cn-hangzhou`, China (Beijing) `cn-beijing`, … and `ap-southeast-1` (Singapore) [AgentCore Overview](https://www.alibabacloud.com/help/en/agentcore/agentcore-product-overview) — **partially confirmed**: the middle rows of the table were not readable in my results. The endpoint table adds `cn-shanghai` and `cn-hongkong` [Endpoints](https://help.aliyun.com/en/agentcore/api-agentcore-2026-08-04-endpoint) (**China site only**). Treat the full list as needing console verification.

**Pricing.** Pay-as-you-go; billable items are **Compute CU, Gateway CU, Storage CU, and an optional dedicated collaboration control plane** [AgentCore Billing](https://help.aliyun.com/en/agentcore/agentcore-billing-instructions) (**China site only** for the item list; the international page exists at [agentcore-billing-instructions](https://www.alibabacloud.com/help/en/agentcore/agentcore-billing-instructions)). CU conversion is published on the international page: **1 vCPU × 1 s = 1 CU; 1 GB memory × 1 s = 0.5 CU; reference price USD 0.00001 per Compute CU in China (Shanghai)** [AgentCore Billing](https://www.alibabacloud.com/help/en/agentcore/agentcore-billing-instructions). Unit prices "vary by region", with a separate table for **"Singapore and Hong Kong (China) regions"** whose values I could not read — **unconfirmed** [same page]. *Derived arithmetic (mine, not a quoted price):* at USD 0.00001/CU, 1 vCPU-hour ≈ USD 0.036 and 1 GB-hour ≈ USD 0.018. The collaboration control plane is currently **CNY 0 during a limited-time free period** [collaboration control plane limited-time free offer](https://www.alibabacloud.com/help/en/agentcore/acentcore-collaboration-control-face-exemption-description). Billing starts 2026-09-18 [billing activation](https://www.alibabacloud.com/help/en/agentcore/agentcore-billing-activation).

**Limits.** Not found as a dedicated quota page — **unconfirmed**. Runtime shape is expressed through `compute`, `sessionPolicy` (session affinity mode, idle timeout) and `elasticPolicy` [UpdateCustomAgent](https://www.alibabacloud.com/help/en/agentcore/api-agentcore-2026-08-04-updatecustomagent), [GetCustomAgent](https://www.alibabacloud.com/help/en/agentcore/api-agentcore-2026-08-04-getcustomagent.md).

**Key doc URLs:** [product page](https://www.alibabacloud.com/en/product/agentcore?_p_lc=1) · [doc home](https://www.alibabacloud.com/help/en/agentcore/) · [overview](https://www.alibabacloud.com/help/en/agentcore/agentcore-product-overview) · [SDK overview](https://www.alibabacloud.com/help/en/agentcore/agentcore-sdk-overview) · [Management Skill](https://www.alibabacloud.com/help/en/agentcore/agentcore-management-skill.md) · [billing](https://www.alibabacloud.com/help/en/agentcore/agentcore-billing-instructions).

---

## 2. AgentRun (Function Compute's agentic infra platform)

**What it does.** "AgentRun is an all-in-one serverless infrastructure platform for enterprise-grade Agentic AI applications, providing full lifecycle" management; "code-centric, open, and composable" [What is AgentRun](https://www.alibabacloud.com/help/en/agentrun/what-is-agentrun). It runs on Function Compute [Giving Your AI Agent a Disposable Workspace](https://www.alibabacloud.com/blog/giving-your-ai-agent-a-disposable-workspace-with-alibaba-cloud-agentrun_603324), [Does "DO NOT" Work on AI Agents?](https://www.alibabacloud.com/blog/does-do-not-work-on-ai-agents-900-tests-with-agentrun-mcp-tool-hooks_603668).

**Three build modes** (this is the no-code story for international customers, and it is *not* gated the way Model Studio's is):
- **Quick Creation (no-code)** — "create an agent using a visual configuration interface without any programming experience" [Create an agent with Quick Creation (no-code)](https://www.alibabacloud.com/help/en/agentrun/quickly-create-agent-no-code); "selecting a model, writing a prompt, and configuring tools and a sandbox" [What is AgentRun](https://www.alibabacloud.com/help/en/agentrun/what-is-agentrun).
- **Flow (low-code)** — visual drag-and-drop canvas, "custom code execution: built-in code execution node and Function Compute", publishable as a chat endpoint [Quick start: create a Flow Agent](https://www.alibabacloud.com/help/doc-detail/3049290.html). The low-code creation feature is described as being in preview [Quick start (China site)](https://help.aliyun.com/en/agentrun/quick-start-to-low-code-agent-creation-1) (**China site only**).
- **Code (high-code)** — custom container image from an Alibaba Cloud image registry, or code + runtime [Create an agent using code (high-code)](https://www.alibabacloud.com/help/en/functioncompute/create-agent-by-code-high-code).

**Frameworks.** "AgentRun integrates with mainstream agent frameworks like **LangChain, AgentScope, CrewAI, and Google ADK**" [What is AgentRun](https://www.alibabacloud.com/help/en/agentrun/what-is-agentrun). **LangGraph is not named** in that list — unconfirmed. A LangChain-specific session-state adapter exists (`OTSChatMessageHistory` → Tablestore) [Using session state in LangChain](https://www.alibabacloud.com/help/en/agentrun/using-session-state-in-langchain-1.md).

**Runtime mechanics.** Session affinity "ensures that requests from the same session are routed to the same instance"; container mode; configurable **session idle timeout** and **max concurrent sessions per runtime instance**; idle instances are billed in idle mode [What is AgentRun](https://www.alibabacloud.com/help/en/agentrun/what-is-agentrun), [AgentRuntime struct](https://www.alibabacloud.com/help/en/agentrun/api-agentrun-2025-09-10-struct-agentruntime), [UpdateAgentRuntimeInput](https://www.alibabacloud.com/help/en/agentrun/api-agentrun-2025-09-10-updateagentruntimeinput.md), [CreateAgentRuntime](https://www.alibabacloud.com/help/en/agentrun/api-agentrun-2025-09-10-createagentruntime). Versioning + canary release, and multi-protocol exposure: "**Native, OpenAI-compatible, Dify Workflow, and Dify Chatflow protocols**" [Quick start: create a Flow Agent](https://www.alibabacloud.com/help/doc-detail/3049290.html). Terraform/ROS support: `ALIYUN::AgentRun::Template` [ROS resource type index](https://www.alibabacloud.com/help/en/ros/developer-reference/list-of-resource-types-by-service); CLI at [Serverless-Devs/agentrun-cli](https://github.com/Serverless-Devs/agentrun-cli).

**Sandbox.** "Multiple sandbox types: **Code Interpreter and Browser Use**, with future support for All-in-One, Reinforcement Learning (RL)"; Code Interpreter runs "Python, Node.js, and Java, with support for file and session management"; integration "through SDK calls or as an MCP tool"; "built-in support for over 50" (items not readable — **partially confirmed**); light-sleep state adjusts billing [What is AgentRun](https://www.alibabacloud.com/help/en/agentrun/what-is-agentrun). AIO Sandbox (headless browser + code interpreter + terminal + filesystem, CDP endpoint) is documented on the China site [AIO Sandbox](https://help.aliyun.com/en/agentrun/aio-sandbox-1) and blogged internationally [blog](https://www.alibabacloud.com/blog/giving-your-ai-agent-a-disposable-workspace-with-alibaba-cloud-agentrun_603324). AgentRun Sandbox is being migrated to **FC Agent Sandbox** with "prices for vCPU, memory, and disk … reduced … bringing overall costs down by 50% to 70%" [Upgrade AgentRun Sandbox to FC Cloud Sandbox](https://www.alibabacloud.com/help/en/agentrun/agenrun-sandbox-upgrade-fc-cloud-sandbox-scheme).

**Model gateway.** "Model proxy: A high-performance LLM gateway deployed on Alibaba Cloud Function Compute (FC), built on the open source **LiteLLM** project" [Large language models](https://www.alibabacloud.com/help/en/agentrun/large-language-model-1.md); connect "any model service … compatible with the OpenAI API", including VPC-deployed models; supports Qwen, DeepSeek and open-source models, and **FunModel** to host open-source models [Large language models](https://www.alibabacloud.com/help/en/agentrun/large-language-model-1.md), [What is AgentRun](https://www.alibabacloud.com/help/en/agentrun/what-is-agentrun). Tracing separates "gateway latency and model latency" [same]. Billing note: "If you choose the pay-as-you-go model, **Model Studio bills you directly**" [FunClaw](https://www.alibabacloud.com/help/en/agentrun/topic-funclaw.md).

**MCP tool hub.** Three integration methods: "remote connection, creation from code or a code package, and" (third not readable — a template; `ActivateTemplateMCP` exists) [Create an MCP tool](https://www.alibabacloud.com/help/en/agentrun/create-the-mcp-tool-1), [ActivateTemplateMCP](https://www.alibabacloud.com/help/en/agentrun/api-agentrun-2025-09-10-activatetemplatemcp.md). Tools/skills include "Alibaba Cloud Model Studio … remote MCP aggregating multiple MCP" servers [Tools and skills](https://help.aliyun.com/en/agentrun/introduction-to-tools-and-skills) (**China site only**). **MCP Tool Hooks** allow pre/post tool-call interception — Alibaba published a 900-test study on them [blog](https://www.alibabacloud.com/blog/does-do-not-work-on-ai-agents-900-tests-with-agentrun-mcp-tool-hooks_603668). This is the closest thing to a policy/approval gate in AgentRun.

**Memory.** Memory Store "combines long-term memory, conversation history, and conversation" summary [Memory store](https://www.alibabacloud.com/help/en/agentrun/memory-storage-overview.md); two backends — Tablestore (pay-as-you-go, "more cost-effective for large data volumes") or RDS ("instance-based billing") [same]. Tablestore integration provides "three persistent memory types: session history, long-term memory (cross-session)" and one more [Implement Tablestore memory storage in AgentRun](https://www.alibabacloud.com/help/en/tablestore/memory-storage-service-sub-product-test/agentrun-tablestore-memory). Tablestore Memory Storage Service is live in **China (Hong Kong) and Singapore** among others [Tablestore news](https://www.alibabacloud.com/help/en/tablestore/memory-storage-service-sub-product-test/news-and-announcements).

**Knowledge.** "AgentRun supports knowledge base integration with **Alibaba Cloud Model Studio and RAGFlow**" [Knowledge base integration guide](https://www.alibabacloud.com/help/en/agentrun/knowledge-base-integration-guide). Same Model Studio gating caveat as §1.

**Tracing/observability.** "End-to-end observability … based on **OpenTelemetry** for the entire request lifecycle" and cost analysis [What is AgentRun](https://www.alibabacloud.com/help/en/agentrun/what-is-agentrun); "consistent tracing from the initial request through the gateway, agent, model, tools, and external dependencies" [Getting started](https://www.alibabacloud.com/help/en/agentrun/start-using/); ARMS probe install guide for Python agents [Install the ARMS agent](https://www.alibabacloud.com/help/en/agentrun/installing-the-arms-probe-for-python-agent-applications-1.md).

**Credentials.** Centralised credential management for "LLM and cloud service API credentials" used by agents/tools [Credential management](https://www.alibabacloud.com/help/en/agentrun/voucher-management-1).

**Channels.** WeCom integration is documented internationally [Integrate an agent with WeCom](https://www.alibabacloud.com/help/en/agentrun/agent-integrated-enterprise-micro). The **AgentRun Open Platform (codename FunAgent)** — "an AI agent operations and management hub for enterprises" — supports "custom skill uploads and MCP tools" and "**DingTalk, Lark, WeCom, and personal WeChat**. All channels except DingTalk support pairing via QR code scan" [Open platform](https://www.alibabacloud.com/help/en/agentrun/open-platform-introduction.md). Again: **no Slack / Teams / WhatsApp / LINE / Telegram**.

**Triggers.** No native timer/event trigger found for AgentRun. Exposure is via **AI Gateway as a standard HTTP API** ("for frontend applications, mobile clients, and third-party systems") [Call a Flow Agent using AI Gateway](https://www.alibabacloud.com/help/en/agentrun/call-flow-agent-using-ai-gateway-1.md), custom domains ([ListCustomDomains](https://error-center.alibabacloud.com/api/AgentRun/2025-09-10/ListCustomDomains)), and **PrivateLink** from a VPC [Access AgentRun over VPC using PrivateLink](https://www.alibabacloud.com/help/en/functioncompute/access-agenrun-resources-through-privatelink-intranet). Scheduled/event triggers must come from EventBridge/CloudFlow/FC calling that endpoint — **unconfirmed as a built-in**.

**Regions.** International: **Singapore `ap-southeast-1`** [AgentRun supported regions](https://help.aliyun.com/en/agentrun/open-service-area) (China site; the same page is published on alibabacloud.com in es/tr/pt-br, e.g. [es](https://www.alibabacloud.com/help/es/agentrun/open-service-area)). The Open Platform is "available in the **China (Hong Kong) and Singapore** regions" [Open platform](https://www.alibabacloud.com/help/en/agentrun/open-platform-introduction.md). There are two consoles: "AgentRun console (China) or the AgentRun console (International)" [AIO Sandbox](https://help.aliyun.com/en/agentrun/aio-sandbox-1) (**China site only**).

**Pricing.** No AgentRun-specific price card found — **unconfirmed**. Costs are Function Compute CU + sandbox compute + Model Studio tokens (billed directly by Model Studio) [FunClaw](https://www.alibabacloud.com/help/en/agentrun/topic-funclaw.md), [FC Agent Sandbox billing](https://www.alibabacloud.com/help/en/functioncompute/billing-overview-of-fc-agent-sandbox).

**Key doc URLs:** [doc home](https://www.alibabacloud.com/help/en/agentrun/) · [What is AgentRun](https://www.alibabacloud.com/help/en/agentrun/what-is-agentrun) · [llms.txt index](https://www.alibabacloud.com/help/en/agentrun/llms.txt) · [OpenAPI 2025-09-10](https://api.alibabacloud.com/api/AgentRun/2025-09-10).

---

## 3. Function Compute 3.0 for AI

**What it does.** "Function Compute (FC) is an event-driven, fully managed computing service. Write and upload your code, and Function Compute automatically prepares the elastic, reliable computing resources" [What is Function Compute](https://www.alibabacloud.com/help/en/functioncompute/what-is-function-compute). It is the substrate under AgentRun and FC Agent Sandbox [blog](https://www.alibabacloud.com/blog/does-do-not-work-on-ai-agents-900-tests-with-agentrun-mcp-tool-hooks_603668).

**Triggers.** Two categories: "native triggers (such as scheduled tasks and API operations) and cloud product event triggers" [Overview of event triggers](https://www.alibabacloud.com/help/en/functioncompute/cloud-product-event-triggers-overview) — the latter "powered by EventBridge, which acts as a centralized event hub for virtually all Alibaba Cloud services" [same]. Documented trigger types include **HTTP (synchronous), time/timer, OSS event, EventBridge-based (incl. ApsaraMQ for Kafka, MNS/SMQ, OSS, Log Service, Tablestore), and two-way integrated triggers** [Trigger types and use scenarios](https://www.alibabacloud.com/help/en/functioncompute/trigger-overview), [CreateTrigger API](https://www.alibabacloud.com/help/en/functioncompute/api-createtrigger). Product page lists HTTP, time, EventBridge triggers [Function Compute product page](https://www.alibabacloud.com/en/product/function-compute?_p_lc=1).
> **No inbound-email (IMAP/SMTP) trigger exists.** DirectMail is send-only and its EventBridge source `acs.dm` emits *outbound* events ("email sent, email clicked, email opened") [Alibaba Cloud service event sources](https://www.alibabacloud.com/help/en/eventbridge/user-guide/alibaba-cloud-service-event-sources), [Configure EventBridge event routing for DirectMail](https://www.alibabacloud.com/help/en/direct-mail/user-guide/set-up-eventbridge). For the support-email use case the app must draw a **custom polling function (timer trigger + IMAP/Graph API)** or a customer-owned webhook. Mark as a design constraint, not a product.

**Long-running / async.** "Function Compute support a running duration of up to **86,400 seconds (24 hours)**. You can use GPU-accelerated instances alongside" [Offline asynchronous task scenarios](https://www.alibabacloud.com/help/en/functioncompute/fc/user-guide/offline-asynchronous-task-scenario). Asynchronous invocation is the recommended pattern "for functions with long-running, resource-intensive, or error-prone logic" [Asynchronous invocation](https://www.alibabacloud.com/help/en/functioncompute/fc-asynchronous-invocation); async **task mode** has its own lifecycle/status management and "is not suitable for latency-sensitive processing (response times under 100 ms)" [Terms](https://www.alibabacloud.com/help/en/functioncompute/terms-of-fc), [Asynchronous tasks](https://www.alibabacloud.com/help/en/functioncompute/asynchronous-task) (the latter lists the supported regions).

**GPU.** Three GPU instance types: "elastic instances, resident instances, and resident + elastic instances (hybrid)" [Instance types and specifications](https://www.alibabacloud.com/help/en/functioncompute/instance-types-and-specifications). **Tesla-series GPU regions include Singapore and US (Virginia)**; **Ada-series GPU regions include Singapore** [same page]. All GPU types support request-volume auto-scaling; CPU and GPU on-demand instances support delayed release; OSS dynamic mounting is available in "Hong Kong (China), US West, and Singapore" [Release notes in 2025](https://www.alibabacloud.com/help/en/functioncompute/release-notes-2025). **Idle mode** for provisioned GPU instances bills at a lower rate [Real-time inference scenarios](https://www.alibabacloud.com/help/en/functioncompute/fc/user-guide/real-time-inference-scenarios-1), [Billing overview](https://www.alibabacloud.com/help/en/functioncompute/billing-fc/). **Resident resource pools (subscription) exist in US (Virginia), Germany (Frankfurt) and Singapore**, disk at USD 0.21/GB/month [Resident resource pools](https://www.alibabacloud.com/help/en/functioncompute/resident-resource-pool).

**Agent / AI-app features on the international site.** FC docs now carry agent-building pages directly: [Create an agent using code (high-code)](https://www.alibabacloud.com/help/en/functioncompute/create-agent-by-code-high-code) and [Create a sandbox function](https://www.alibabacloud.com/help/en/functioncompute/create-a-sandbox-function-template) (default template: Code Interpreter image, 2 vCPU / 4096 MB). "Use Sandbox Agent & Skills (Public Preview)" — the AIO Sandbox page — is **China site only** [link](https://help.aliyun.com/en/functioncompute/using-sandbox-agent-skills-in-beta). The rich **AI application template catalogue (ComfyUI, Ollama, CosyVoice, QwQ-32B, FunArt, LoRA training)** lives under **CAP / Function AI**, which is China-site-only (§8) [CAP: deploy QwQ-32B](https://help.aliyun.com/en/cap/use-cases/two-ways-to-quickly-deploy-qwq-32b-reasoning-model), [CAP MCP services intro](https://help.aliyun.com/en/cap/user-guide/mcp-service-introduction/). International customers still get GPU + container-image deployment of those same workloads, just without the one-click template [Create a GPU function](https://www.alibabacloud.com/help/en/functioncompute/creating-a-gpu-function/).

**Hosting MCP servers.** FC is Alibaba's stated MCP runtime: "Function Compute (FC) is an ideal runtime for hosting MCP services on the cloud and provides elastic invocation capabilities" [CAP: Introduction to MCP services](https://help.aliyun.com/en/cap/user-guide/mcp-service-introduction/) (**China site only**); the China-native blog confirms "函数计算 FC 为阿里云百炼 MCP 提供弹性" (FC provides elasticity for Model Studio MCP) [cnblogs/Alibaba Cloud Native](https://www.cnblogs.com/alisystemsoftware?p=77) (**China site only, Chinese**). Internationally, MCP hosting is surfaced through **AgentRun's MCP tools** (§2) and the open-source [aliyun/alibabacloud-fc-mcp-server](https://github.com/aliyun/alibabacloud-fc-mcp-server). Treat "FC hosts your MCP server" as architecturally true but **not documented as a feature on the international site**.

**Pricing.** Unified **CU** billable item: "CU usage is derived by multiplying each billing factor — function invocations, active vCPU usage, idle vCPU usage, memory usage, disk usage" [Billing overview](https://www.alibabacloud.com/help/en/functioncompute/billing-fc/); conversion factors: vCPU 1 CU/(vCPU·s), memory 0.5 CU/(GB·s), GPU factors per series (tesla.1 = 2.1, ampere.1 = 1.8, ada.1 = …) [Billing overview](https://www.alibabacloud.com/help/en/functioncompute/billing-overview-of-fc). Published tier-1 unit price **USD 0.000020/CU** (discounted USD 0.0000160/CU) for the window "August 27, 2024 to August 27, 2025" — verify the current tier table before quoting [CU billing and billable items](https://www.alibabacloud.com/help/en/functioncompute/product-changes-changes-of-billable-items-resource-plans-and-trial-quota-of-function-compute). Three billing methods: free trial quotas, pay-as-you-go, resource plans [Billing overview](https://www.alibabacloud.com/help/en/functioncompute/billing-fc/); first-time console users get a free trial package [Trial quota](https://www.alibabacloud.com/help/en/functioncompute/trial-quota-1). Singapore pay-as-you-go vCPU rate historically listed at 0.117 (currency/unit per the pricing page) [Function Compute pricing](https://www.alibabacloud.com/en/product/function-compute/pricing).

**Limits that matter.** Timeout up to **86,400 s** [Quotas and limits](https://www.alibabacloud.com/help/en/functioncompute/limits-of-usage). **Default 300 concurrent instances per region per account**; per-function maximum quota configurable [Quotas and limits](https://www.alibabacloud.com/help/en/functioncompute/limits-of-usage), [Set function quotas](https://www.alibabacloud.com/help/en/functioncompute/overview-of-configuring-the-maximum-number-of-on-demand-instances). Code-package size is 100 MB in most regions but larger in "Hangzhou, Shanghai, Beijing, Shenzhen, **Singapore, Japan (Tokyo), US (Virginia), and Germany (Frankfurt)**" [Quotas and limits](https://www.alibabacloud.com/help/en/functioncompute/limits-of-usage). Container images up to 30 GB per a practitioner write-up (**not an official source**) [albertoroura.com](https://albertoroura.com/deploying-qwen-3-as-private-api-on-alibaba-cloud-function-compute/). Max **50 EventBridge-based OSS triggers** [Configure an EventBridge-based OSS trigger](https://www.alibabacloud.com/help/en/functioncompute/fc/configure-an-eventbridge-based-oss-trigger).

**Regions.** FC publishes a region × feature matrix (custom container runtime, GPU instance, Tablestore, session affinity, etc.) at [Supported regions](https://www.alibabacloud.com/help/en/functioncompute/regions) (last updated Jun 24, 2026). From the readable fragments: Germany (Frankfurt) `eu-central-1` = support, UK (London) `eu-west-1` = mixed support/unsupport, US (Virginia) listed; **Singapore `ap-southeast-1` is listed** [same page], [Configure network](https://www.alibabacloud.com/help/en/functioncompute/configure-network-settings) (Singapore zones `ap-southeast-1a`…). The per-feature cells for Singapore were not readable — **partially confirmed**; open the page to verify GPU/session-affinity/custom-container for `ap-southeast-1` before drawing.

---

## 4. CloudFlow (Serverless Workflow)

**International availability: yes, including Singapore.** CloudFlow has an international product page [CloudFlow](https://www.alibabacloud.com/en/product/serverless-workflow?_p_lc=1) and a full international doc set covering "CloudFlow (new) and legacy Serverless Workflow" [docs llms.txt](https://www.alibabacloud.com/help/en/serverless-workflow/llms.txt). API endpoints follow `{region-id}.fnf.aliyuncs.com` and the published table includes **`ap-southeast-1.fnf.aliyuncs.com` / `ap-southeast-1-internal.fnf.aliyuncs.com`** [Make API requests](https://www.alibabacloud.com/help/doc-detail/2782151.html); the same table on the China site lists "Singapore, ap-southeast-1" [Endpoints](https://help.aliyun.com/en/document_detail/2590630.html) (**China site only**). A `DescribeRegions` API exists for programmatic verification [DescribeRegions](https://www.alibabacloud.com/help/en/serverless-workflow/latest/api-fnf-2019-03-15-describeregions). The complete international region list was not readable — **partially confirmed**.

**Capability checklist against your brief:**

| Requirement | Supported? | Evidence |
|---|---|---|
| Wait for callback / human approval | **Yes** — `pattern: waitForCallback` in a Task step; "the flow invokes the resource … passes a task token … pauses until it receives a callback or timeout" | [Perform callbacks on asynchronous tasks](https://www.alibabacloud.com/help/en/serverless-workflow/latest/perform-callbacks-on-asynchronous-tasks), [Task steps](https://www.alibabacloud.com/help/en/serverless-workflow/latest/task-steps), [Service integration overview](https://www.alibabacloud.com/help/en/serverless-workflow/latest/service-integration-overview). Worked example with an SMQ queue + task token: [Integrate an SMQ queue](https://www.alibabacloud.com/help/en/serverless-workflow/latest/mns-queues-workflow). Explicit approval framing: "Pause the workflow until an external system sends a callback with the task token. Human approvals, long-running external processes" [Task state](https://help.aliyun.com/en/document_detail/2642848.html) (**China site only**) |
| Parallel branches | **Yes** — "A parallel step can have a maximum of **100 branches**" | [Parallel steps](https://www.alibabacloud.com/help/en/serverless-workflow/latest/parallel-steps) |
| Loops | **Yes** — `foreach` step, "one iteration for each element … runs the iterations concurrently", configurable concurrency; plus `choice` for branching | [Foreach step](https://www.alibabacloud.com/help/en/serverless-workflow/latest/foreach-steps), [Flow Definition Language](https://www.alibabacloud.com/help/en/serverless-workflow/latest/flow-definition-language-overview), [blog](https://www.alibabacloud.com/blog/multi-step-orchestration-on-alibaba-cloud-serverless-workflow_603189) |
| Retries / catch | **Yes** — `maxAttempts` default 3, `intervalSeconds` max 86400 default 1, `multiplier`, plus Catch policies | [Task steps](https://www.alibabacloud.com/help/en/serverless-workflow/latest/task-steps), [Error handling](https://www.alibabacloud.com/help/en/serverless-workflow/latest/error-handling), [Troubleshooting](https://www.alibabacloud.com/help/en/serverless-workflow/latest/troubleshooting) |
| Call LLMs directly | **No first-class LLM/Model Studio step found — unconfirmed.** Task states call "Function Compute functions, Alibaba Cloud service APIs, or third-party services over HTTP/HTTPS", so an LLM call is an HTTP task to the Model Studio endpoint | [Task state](https://www.alibabacloud.com/help/en/serverless-workflow/latest/task-task), [Service integration overview](https://www.alibabacloud.com/help/en/serverless-workflow/latest/service-integration-overview) |
| Scheduled trigger | **Yes** — cron time-based schedules | [Create a time-based schedule](https://www.alibabacloud.com/help/en/serverless-workflow/latest/create-a-time-based-schedule) |
| Event trigger | **Yes** — EventBridge routes custom events to a CloudFlow workflow; EventBridge "event schedules trigger a workflow execution when a specified event reaches CloudFlow" | [Route custom events to a CloudFlow workflow](https://www.alibabacloud.com/help/en/eventbridge/user-guide/routing-to-a-serverless-workflow), [EventBridge event schedules](https://help.aliyun.com/en/document_detail/2513229.html) (**China site only**) |
| Visual designer + AI generation | **Yes** — CloudFlow Studio drag-and-drop + YAML mode; "Describe your business needs in natural language" to auto-generate a workflow | [Workflow Studio interface overview](https://www.alibabacloud.com/help/en/serverless-workflow/latest/interface-overview), [Create an AI-generated workflow](https://www.alibabacloud.com/help/en/serverless-workflow/latest/ai-based-fast-generated-workflow-framework) |

**Two execution modes — this is the biggest design constraint.**

| Dimension | Standard mode | Express mode |
|---|---|---|
| Max execution duration | **1 year** | **5 minutes** |
| Execution model | Asynchronous; each step's status persisted | Synchronous |
| Integration modes | Three | `RequestComplete` only |
| Invocation API | `StartExecution` (async only) | `StartSyncExecution` |

Sources: [Standard mode and express mode](https://help.aliyun.com/en/document_detail/2504569.html) (**China site only**), [CloudFlow: Terms](https://www.alibabacloud.com/help/doc-detail/2840077.html), [Create a service (API Gateway)](https://www.alibabacloud.com/help/en/api-gateway/cloud-native-api-gateway/user-guide/create-service), FAQ "A single flow execution can run for up to one year" [CloudFlow FAQ](https://www.alibabacloud.com/help/en/serverless-workflow/latest/faq-faq). Sub-workflows can be either mode, with a fault-tolerance policy [Distributed mode](https://www.alibabacloud.com/help/en/serverless-workflow/latest/distributed-mode).

**Pricing.** Pay-as-you-go on **step transitions**: "Free quota **5,000 free step transitions per month**, per Alibaba Cloud [account]. Unit price **USD 0.25 per 10,000 step transitions**"; "Each step type contributes differently to the total transition count" [Serverless product billing overview](https://www.alibabacloud.com/help/en/serverless-workflow/latest/billing-billing). ⚠️ A second international page says "the first **1000** transitions free monthly" [Understand CloudFlow Pay-As-You-Go Execution Pricing](https://www.alibabacloud.com/help/en/serverless-workflow/latest/serverless-workflow-billing) — the two pages disagree; verify in console. New-version billing started **2025-10-10** [Billing overview](https://www.alibabacloud.com/help/en/serverless-workflow/latest/billing-overview).

**Limits.** "CloudFlow enforces limits on naming, resource quotas, API call rates, and execution parameters. Limits marked Adjustable can be increased"; **Maximum number of flows: 10,000** [Limits](https://www.alibabacloud.com/help/en/serverless-workflow/latest/limits). Task-step `timeoutSeconds` max/default **86,400** [Task steps](https://www.alibabacloud.com/help/en/serverless-workflow/latest/task-steps). Execution history retention period — **unconfirmed** ([View execution history](https://help.aliyun.com/en/document_detail/123157.html), China site only).

---

## 5. EventBridge and message queues as workflow triggers

**EventBridge.** "A serverless event bus service that connects to Alibaba Cloud services, custom applications, and SaaS applications as a centralized hub" [product page](https://www.alibabacloud.com/en/product/eventbridge?_p_lc=1). **Singapore `ap-southeast-1` is listed as a service region**, with per-region feature availability [EventBridge service regions](https://www.alibabacloud.com/help/en/eventbridge/product-overview/supported-regions); endpoint `eventbridge-console.ap-southeast-1.aliyuncs.com` [Endpoints and regions](https://www.alibabacloud.com/help/doc-detail/2384626.html). **12 target types across seven categories**, including SMQ, HTTP/HTTPS endpoints, Function Compute, ApsaraMQ for RocketMQ and DingTalk [Event targets overview](https://www.alibabacloud.com/help/en/eventbridge/user-guide/event-target-overview), [What is EventBridge?](https://www.alibabacloud.com/help/en/eventbridge/product-overview/what-is-eventbridge). Third-party SaaS is reached via an **HTTP source** ("such as GitHub, Jenkins, and Gitee") [Functions and features](https://www.alibabacloud.com/help/en/eventbridge/product-overview/product-function-node-eventbridge) — so an inbound support-email webhook from an external mail provider is feasible via HTTP source → rule → FC/CloudFlow. **Rule limit: max 5 event targets per rule, all targets in the same region as the rule** [Manage event rules](https://www.alibabacloud.com/help/en/eventbridge/user-guide/manage-event-rules). Billing: pay-as-you-go and subscription with free-tier quotas; a worked example prices **10 million events at 10 × USD 0.82** [Billing of event buses](https://www.alibabacloud.com/help/en/eventbridge/product-overview/billing-of-event-buses), [Billing](https://www.alibabacloud.com/help/en/eventbridge/product-overview/eventbridge-billing/), [Billing overview](https://www.alibabacloud.com/help/en/eventbridge/product-overview/billing-overview).

**Simple Message Queue (SMQ, formerly MNS).** "All regions support queue-based messaging. Topic-based messaging, event notifications, and log management vary by region"; **Singapore `ap-southeast-1` supports Queue, HTTP server, SMS, Direct…** [Regions and endpoints](https://www.alibabacloud.com/help/en/mns/product-overview/regions-and-endpoints); endpoint `mns-open.ap-southeast-1.aliyuncs.com` [Endpoints](https://www.alibabacloud.com/help/en/mns/developer-reference/api-mns-open-2022-01-19-endpoint). **20 million free requests per month per account**; only normal messages count [Billing](https://www.alibabacloud.com/help/en/mns/product-overview/billing-overview). Log management added in Singapore in 2025 [Release notes](https://help.aliyun.com/en/mns/product-overview/announcements-and-updates/) (**China site only**). SMQ is the queue CloudFlow uses in its task-token/callback example [Integrate an SMQ queue](https://www.alibabacloud.com/help/en/serverless-workflow/latest/mns-queues-workflow).

**ApsaraMQ for RocketMQ.** 5.x is available in `ap-southeast-1` Singapore (plus China and other AP regions) [Supported regions (5.x)](https://help.aliyun.com/en/apsaramq-for-rocketmq/cloud-message-queue-rocketmq-5-x-series/product-overview/supported-regions) (**China site only**); the international llms.txt confirms "Asia Pacific (ap-southeast-1 Singapore, ap-…)" [RocketMQ 5.x llms.txt](https://www.alibabacloud.com/help/en/apsaramq-for-rocketmq/cloud-message-queue-rocketmq-5-x-series/llms.txt). 4.x is "available in 20 regions across Asia Pacific, Europe & Americas, and the Middle East", Singapore supported [Supported regions (4.x)](https://www.alibabacloud.com/help/en/apsaramq-for-rocketmq/cloud-message-queue-rocketmq-4-x-series/product-overview/supported-regions). Endpoint `rocketmq.ap-southeast-1.aliyuncs.com` [Endpoints](https://www.alibabacloud.com/help/en/apsaramq-for-rocketmq/cloud-message-queue-rocketmq-5-x-series/developer-reference/api-rocketmq-2022-08-01-endpoint). EventBridge can push RocketMQ events to Function Compute [use case](https://help.aliyun.com/en/eventbridge/use-cases/push-events-from-message-queue-for-apache-rocketmq-to-function-compute) (**China site only**).

**Recommendation for the app's drawing rules.** For an email-support workflow in Singapore, the trigger chain is: external mail/webhook → **EventBridge custom event bus (HTTP source)** → **Function Compute** (classify/draft) or → **CloudFlow** (durable orchestration + human callback). SMQ is the cheapest durable hand-off queue; RocketMQ only if the customer already runs it.

---

## 6. Dify on ACK and Dify on PAI-EAS

**Dify on ACK (`ack-dify`).** "Dify on ACK is a **Helm deployment solution** that adapts the open-source Dify project for the Alibaba Cloud ACK environment to enable rapid deployment" [Upgrade the ack-dify component](https://www.alibabacloud.com/help/en/ack/cloud-native-ai-suite/use-cases/update-the-dify-component-in-ack-clusters). It ships from the **ACK App Marketplace**; the documented quick path "deploys a **single-instance** Dify application via the ack-dify Helm template … suitable for development and" testing [Build an AI Q&A assistant with Dify](https://www.alibabacloud.com/help/en/ack/cloud-native-ai-suite/use-cases/building-customized-ai-question-and-answer-assistant-based-on-dify). Upgrade path exists for versions earlier than v1.0.0 (backup data first) [same]. Two packaged technical solutions on the international site both pin **Dify version 1.11.4**: a single-instance **testing** deployment [tech-solution-deploy/2870155](https://www.alibabacloud.com/en/solution/tech-solution-deploy/2870155) and a private **high-availability production** deployment [tech-solution-deploy/2871859](https://www.alibabacloud.com/en/solution/tech-solution-deploy/2871859), under the solution umbrella [Deploy Dify and build AI applications](https://www.alibabacloud.com/en/solution/tech-solution/rapidly-deploy-dify-to-accelerate-ai-application-development). Also deployable on **ACS** (Container Compute Service) with the same `ack-dify` component [Build a Dify AI Q&A assistant on ACS](https://www.alibabacloud.com/help/en/cs/user-guide/build-customized-ai-q-a-assistant-based-on-dify-in-acs). **Limit worth flagging:** "ACK does not provide" workflow scheduling — Alibaba's own doc tells you to schedule Dify workflows with **XXL-JOB** [Schedule Dify workflows with XXL-JOB](https://help.aliyun.com/en/ack/cloud-native-ai-suite/use-cases/scheduling-a-dify-workflow-via-xxl-job) (**China site only**). HA/performance best practices: [blog](https://www.alibabacloud.com/blog/high-availability-and-performance-best-practices-for-deploying-dify-based-on-ack_601874); a serverless alternative on **SAE + SLS** [blog](https://www.alibabacloud.com/blog/beyond-demo-grade-architecture-building-a-highly-available-production-foundation-for-dify-with-sae-%C3%97-sls_603213); front Dify with **Higress AI Gateway** for HA [blog](https://www.alibabacloud.com/blog/dify-performance-bottleneck-higress-ai-gateway-injects-it-with-the-soul-of-high-availability_602527). Observability: instrument Dify via Cloud Monitor 2.0 by updating `ack-dify` [Instrument a Dify application](https://www.alibabacloud.com/help/en/cms/cloudmonitor-2-0/cms-2-0-access-the-dify-application). Dify's own docs confirm Alibaba Cloud Monitor support via LoongSuite/OTel agents [Dify docs](https://docs.dify.ai/en/cloud/use-dify/monitor/integrations/integrate-aliyun). A Dify solution page exists in the international marketplace [Dify on Alibaba Cloud](https://www.alibabacloud.com/en/market/dify?_p_lc=1), and Model Studio publishes a Dify integration guide [Build Qwen-Powered Chat Agents on Dify](https://www.alibabacloud.com/help/en/model-studio/dify).

**Dify on PAI-EAS.** "Dify on PAI-EAS provides a **managed service with elastic scaling**, which eliminates infrastructure maintenance" [Deploy the Dify large model application platform on PAI-EAS](https://www.alibabacloud.com/help/en/pai/deploy-dify). Hard constraint: "To avoid network connectivity issues, ensure that all these resources are in the **same region and VPC** as the PAI-EAS" service [same]. EAS itself "allows you to deploy trained models as an online inference service or an AI web application", with no fixed model-size limit (bounded by memory/VRAM) [EAS overview](https://www.alibabacloud.com/help/en/pai/overview-2); EAS billing is per instance type and region, plus a **dedicated gateway** billed per node-minute [EAS billing](https://www.alibabacloud.com/help/en/pai/product-overview/billing-of-eas). Dify versions/limits for the EAS deployment were not readable — **unconfirmed**. EAS + ComfyUI can be called from Dify as a tool [use case](https://help.aliyun.com/en/pai/use-cases/call-the-comfyui-service-deployed-by-eas-in-dify) (**China site only**).

**PAI also has its own agent/workflow builder** worth cataloguing alongside Dify: **LangStudio** workflow applications with "pre-built workflow nodes for flow control, LLMs, agents, data retrieval, document parsing, speech recognition, and Python" [Workflow node reference](https://www.alibabacloud.com/help/en/pai/node-reference), [Create a workflow application](https://www.alibabacloud.com/help/en/pai/create-a-workflow-application); and a code-based agent quick start supporting "tool calling, skills, and streaming output in less than 5 minutes" [Create a code-based application](https://www.alibabacloud.com/help/en/pai/create-a-code-based-application); plus PAI-managed knowledge bases from OSS [Manage knowledge bases](https://www.alibabacloud.com/help/en/pai/knowledge-base-management). PAI regional availability was not verified for this report — **unconfirmed**.

---

## 7. Open-source agent frameworks Alibaba maintains

| Framework | What it is | Alibaba Cloud deployment path | Recommendation signal |
|---|---|---|---|
| **AgentScope** (Python 2.0 + Java 2.0) | "open-source multi-agent platform … drag-and-drop workflows, runtime management"; spans "the core framework, to runtime hosting, to memory and evaluation, to fine-tuning, to ready-to-use applications" [agentscope.io](https://agentscope.io/), [GitHub](https://github.com/agentscope-ai/agentscope) | **AgentScope Runtime** "supports serverless deployment … e.g. Alibaba Cloud Function Compute"; "For large-scale remote/production deployments, we recommend using Kubernetes (K8s), Function Compute (FC), or Alibaba Cloud Container Service for Kubernetes (ACK)" [agentscope-runtime README](https://github.com/agentscope-ai/agentscope-runtime), [Advanced Deployment Guide](https://runtime.agentscope.io/en/advanced_deployment.html). Named as a supported framework inside **AgentRun** [What is AgentRun](https://www.alibabacloud.com/help/en/agentrun/what-is-agentrun). Service channels support "Feishu, DingTalk, and Discord" [AgentScope channel docs](https://docs.agentscope.io/en/versions/2.0.9/deploy/channel/overview). Peer-reviewed description incl. runtime sandbox: [arXiv 2508.16279](https://arxiv.org/html/2508.16279v1) | **Strongest fit** for the Python path: it is the only framework that is simultaneously open-source, has its own runtime/sandbox layer, and is a named AgentRun integration. Java 2.0 adds distributed enterprise features [blog](https://www.alibabacloud.com/blog/agentscope-java-2-0-building-a-distributed-enterprise-grade-foundation-for-ai-agents_603231) |
| **Spring AI Alibaba** | "Agentic AI Framework for Java Developers. Built on the core concept of **DAG Graph** … single agent, multi-agent, and complex" workflows [java2ai.com](https://java2ai.com/), [GitHub](https://github.com/alibaba/spring-ai-alibaba) | Deep Model Studio/DashScope integration (`spring-ai-alibaba-starter-dashscope` on Maven Central) [Maven Central](https://central.sonatype.com/artifact/com.alibaba.cloud.ai/spring-ai-alibaba-starter-dashscope); Model Studio publishes integration guides for LLM apps and knowledge bases (**China site only**) [integrate-llm-application](https://help.aliyun.com/en/model-studio/spring-ai-alibaba-integrate-llm-application), [integrate-knowledge-base](https://help.aliyun.com/en/model-studio/spring-ai-alibaba-integrate-knowledge-base). **Graph supports interrupting workflow execution at specific points, enabling human-in-the-loop** [graph-core README](https://github.com/alibaba/spring-ai-alibaba/blob/main/spring-ai-alibaba-graph-core/README.md), [Human Feedback tutorial](https://java2ai.com/en/docs/1.0.0.2/tutorials/graph/human-in-the-loop/). **Spring AI Alibaba Admin** = "one-stop Agent platform … visualized Agent development, observability, evaluation, and MCP management" [GitHub](https://github.com/alibaba/spring-ai-alibaba). Agent Framework 2.0.0-M1.1 published [javadoc](https://javadoc.io/doc/com.alibaba.cloud.ai/spring-ai-alibaba-agent-framework/latest/index.html) | **Recommended for Java/Korea/Japan/Europe enterprise stacks.** It is the only Alibaba framework with a *documented, native* human-approval interrupt — important for your draft-reply-to-human step. Alibaba calls it "Alibaba Cloud's enterprise-level best practice and comprehensive solution for AI agent development" [FAQ](https://java2ai.com/en/docs/1.0.0.2/faq/) |
| **Qwen-Agent** | "framework for developing LLM applications based on the instruction following, tool usage, planning, and memory capabilities of Qwen" [GitHub](https://github.com/QwenLM/Qwen-Agent) | Connects to DashScope/Model Studio or any OpenAI-compatible server [qwen docs](https://qwen.readthedocs.io/en/latest/framework/qwen_agent.html), [Turing Post](https://www.turingpost.com/p/qwen); listed on Alibaba's international Qwen solutions page [Qwen](https://www.alibabacloud.com/en/solutions/generative-ai/qwen?_p_lc=1). Official docs site last updated 2026-03-04 [qwenlm.github.io](https://qwenlm.github.io/Qwen-Agent/en/) | **Legacy / model-companion, not a production orchestration recommendation.** Not listed among AgentRun's supported frameworks [What is AgentRun](https://www.alibabacloud.com/help/en/agentrun/what-is-agentrun). Security note: **CVE-2026-82275**, unauthenticated arbitrary file read (path traversal) in Qwen-Agent ≤ 0.0.34 [ionix.io](https://www.ionix.io/threat-center/cve-2026-82275/) |
| **Alibaba Cloud Agent Toolkit** (bonus) | "Official Alibaba Cloud MCP servers, skills, and plugins to help AI agents build on Alibaba Cloud" [GitHub](https://github.com/aliyun/alibabacloud-agent-toolkit) | Ships the AgentCore Management Skill and `alibabacloud-aiops-skills` (incl. an AgentLoop evaluation skill) [AgentCore Management Skill](https://www.alibabacloud.com/help/en/agentcore/agentcore-management-skill.md), [aiops-skills](https://github.com/aliyun/alibabacloud-aiops-skills/blob/master/skills/aiml/agentloop/alibabacloud-agentloop-evaluation/SKILL.md) | Useful for the app's own tool-calling layer against Alibaba Cloud APIs |

---

## 8. Cloud Application Platform (CAP) / Function AI — **China site only**

CAP is "云原生应用开发平台 CAP … 一站式云应用托管平台，内置丰富的 Serverless + AI 应用模板" (one-stop cloud application hosting platform with rich Serverless + AI application templates) [aliyun.com/product/cap](https://www.aliyun.com/product/cap) (**China site only**). English docs exist **only** under `help.aliyun.com/en/cap/` [CAP doc home](https://help.aliyun.com/en/cap/) — I found **no `alibabacloud.com/help/en/cap` page and no international product page**; searches for one returned only China-site URLs and blog mentions. **Function AI** is CAP's AI sub-product: "Alibaba Cloud Function Compute (FC), **Function AI** now provides two deployment methods, **model service and application template**" [Deploy the QwQ-32B inference model with one click](https://help.aliyun.com/en/cap/use-cases/two-ways-to-quickly-deploy-qwq-32b-reasoning-model) (**China site only**), [Model service FAQ](https://help.aliyun.com/en/cap/model-service-faq) (**China site only**), [Function AI Go SDK](https://help.aliyun.com/en/cap/llms.txt) (**China site only**). CAP itself is free; "在使用该产品过程中涉及到的其他产品会根据资源使用情况收取费用" (underlying resources are billed) [CAP public-preview notice](https://www.aliyun.com/product/news/25714) (**China site only**). International blogs do reference CAP as the place to pick "Ollama, ComfyUI, CosyVoice, and Embedding" foundation-model services [AI-native Applications Based on Event-driven Architectures](https://www.alibabacloud.com/blog/ai-native-applications-based-on-event-driven-architectures_601838), but that describes the China product.

**Residual international coupling:** AgentRun's `CreateAgentRuntime` API exposes a **`CAPConfig`** struct [CAPConfig](https://www.alibabacloud.com/help/en/agentrun/api-agentrun-2025-09-10-capconfig), i.e. the international AgentRun API surface carries CAP plumbing. Whether `CAPConfig` is usable from Singapore is **unconfirmed**.

**Conclusion for the catalog:** do **not** offer CAP/Function AI to international customers; offer FC GPU functions + container images, PAI-EAS, or AgentRun instead.

---

## 9. Adjacent products found that the catalog should include

| Product | What it covers | International status | Pricing | Source |
|---|---|---|---|---|
| **Agent Sandbox** (standalone; also as **FC Agent Sandbox** and **ACS Agent Sandbox**) | Isolated execution: "run code and processes, operate on files, access the network, and manage state"; Flash Edition + Container Edition; **E2B SDK/CLI compatible** | International doc set exists; two editions "available in different regions" (list not readable — **partially confirmed**) | Per-second, **three QoS compute classes** sharing the same billing rules; compute fee + cloud-service resource fee; ACS: first 30 GiB ephemeral storage free | [overview](https://www.alibabacloud.com/help/en/agent-sandbox/product-overview/agent-sandbox-overview), [regions](https://www.alibabacloud.com/help/en/agent-sandbox/product-overview/open-service-area), [billing](https://www.alibabacloud.com/help/en/agent-sandbox/product-overview/billing-overview), [limits](https://www.alibabacloud.com/help/en/agent-sandbox/product-overview/limits-of-agent-sandbox) — **instance concurrency 200 per sandbox, not adjustable**; [E2B compatibility](https://www.alibabacloud.com/help/en/agent-sandbox/e2b-compatibility-explanation), [FC billing](https://www.alibabacloud.com/help/en/functioncompute/billing-overview-of-fc-agent-sandbox), [ACS](https://www.alibabacloud.com/help/en/cs/user-guide/agent-sandbox/) |
| **AgentBay** (WuYing) | Cloud-native execution platform for agents: browser, desktop, mobile, code automation | International product page + docs; free trial coupon of **100 points** | Points-based | [product page](https://www.alibabacloud.com/en/product/agentbay?_p_lc=1), [What is AgentBay](https://www.alibabacloud.com/help/en/agentbay/product-overview/what-is-eds-agentbay), [SDK quick start](https://www.alibabacloud.com/help/en/agentbay/use-sdk-for-quick-access); a Dify plugin exists [marketplace](https://marketplace.dify.ai/plugin/5101good/agentbay) |
| **AgentLoop** | Full-stack agent observability, auditing, **Agent-as-a-Judge evaluation**, experimentation, asset management, context/memory; Trace2Dataset | **cn-hangzhou, cn-shanghai, cn-hongkong only** → HK for international | One-time free trial package for new customers in the first month after activation | [What is AgentLoop](https://www.alibabacloud.com/help/en/agentloop/product-overview/what-is-agentloop), [quickstart (regions)](https://www.alibabacloud.com/help/en/agentloop/agentloop-quickstart-whole-process-practice), [billing](https://www.alibabacloud.com/help/en/agentloop/product-overview/agentloop-billing-overview.md), [product page](https://www.alibabacloud.com/en/product/agentloop?_p_lc=1) |
| **Agent Identity** / **Agent ID Guard** (IDaaS EIAM) | Agent digital identity, centralised API keys/OAuth tokens, inbound auth → **Workload Access Token**; e.g. securely call DingTalk Open Platform | International doc set for both | **unconfirmed** | [Obtain credentials](https://www.alibabacloud.com/help/en/agentidentity/obtain-credentials/), [Securely access DingTalk from an agent](https://www.alibabacloud.com/help/en/agentidentity/secure-access-to-dingtalk-in-agent), [What is Agent Identity](https://help.aliyun.com/en/agentidentity/what-is-agent-identity) (China site), [Agent ID Guard overview](https://www.alibabacloud.com/help/en/idaas/eiam/user-guide/what-is-agent-id-guard) |
| **Agent Security Center (ASC)** | Protects agents from vulnerabilities, prompt injection, data leaks; process-level runtime protection and behaviour-chain monitoring | International doc set | Pay-as-you-go, T+1 bills; **defense seat fee per protected agent instance** + excess usage | [billing overview](https://www.alibabacloud.com/help/en/asc/product-overview/billing-overview), [commercial billing announcement](https://www.alibabacloud.com/help/en/asc/product-overview/agent-security-center-defense-capabilities-official-commercial-billing-announcement), [purchase](https://www.alibabacloud.com/help/en/asc/user-guide/purchase-agent-security-center), [What is ASC](https://help.aliyun.com/en/asc/product-overview/what-is-the-agent-security-center) (China site) |
| **Agentic Computer (JVS)** | "Enterprise-grade, 24/7 cloud computer for agents with built-in framework hosting, model and credit management, security auditing, and **multi-channel**" access; **four interaction modes: Web Chat, CLI, cloud desktop, and IM messaging channels** | International doc set + campaign page; part of the **JVS Agent Suite** launched for global customers | Subscription tiers with monthly credits: **Standard 1,600 credits USD 75.45/mo; Premium 4,000 credits USD 139.53/mo; Ultimate 8,000 credits**; model usage metered in credits across five tiers (Auto, Ultimate 4×, Advanced 2×, Efficient 1.5×, Light 1×) | [doc home](https://www.alibabacloud.com/help/en/jvs/), [billing](https://www.alibabacloud.com/help/en/jvs/agentic-computer-billing-instructions), [create and use](https://www.alibabacloud.com/help/en/jvs/quickly-create-and-use-an-agentic-computer), [Chat with an agent](https://www.alibabacloud.com/help/en/jvs/chat-with-agent.md), [credit tiers](https://help.aliyun.com/en/jvs/what-is-an-agentic-computer) (China site), [campaign](https://www.alibabacloud.com/campaign/jvs?_p_lc=1), [press release](https://www.alibabacloud.com/en/press-room/alibaba-cloud-unveil-advanced-agentic-ai-ecosystem?_p_lc=1) |
| **AI Gateway** (Cloud-native API Gateway) | "unified proxy for LLMs and MCP Server. Provides an officially maintained **MCP marketplace**"; providers incl. Model Studio/Qwen, OpenAI-compatible; Anthropic-protocol support | Regions include **Singapore `ap-southeast-1`, Indonesia (Jakarta), US (Virginia), Germany (Frankfurt)**; the **Serverless** edition public preview is China-only | Gateway instance pay-as-you-go or subscription, incl. built-in SLB | [product page](https://www.alibabacloud.com/en/product/api-gateway?_p_lc=1), [Supported regions](https://www.alibabacloud.com/help/en/api-gateway/ai-gateway/product-overview/supported-regions), [Create a service](https://www.alibabacloud.com/help/en/api-gateway/ai-gateway/user-guide/creating-services), [Model APIs](https://help.aliyun.com/en/api-gateway/ai-gateway/user-guide/managing-the-model-api) (China site), [Serverless preview regions](https://www.alibabacloud.com/help/en/api-gateway/ai-gateway/product-overview/announcement-new-serverless-version-of-the-ai-gateway-now-in-public-beta), [billing](https://www.alibabacloud.com/help/en/api-gateway/cloud-native-api-gateway/product-overview/billing-overview) |
| **Tablestore Memory Storage Service / AgentStorage** | Managed agent memory backend for AgentRun, OpenClaw, Hermes Agent | "available in … China (Hong Kong), and **Singapore**" (public preview 2026-07-30) | Pay-as-you-go or instance-based | [news](https://www.alibabacloud.com/help/en/tablestore/memory-storage-service-sub-product-test/news-and-announcements), [AgentStorage instances](https://help.aliyun.com/en/tablestore/memory-storage-service-sub-product-test/agentstorage-instance-11) (China site) |
| **DashVector** | Managed vector retrieval for RAG when Model Studio KB is unavailable | "The **US (Virginia) and Singapore** regions are supported"; three instance types | Instance-based | [Activate DashVector](https://www.alibabacloud.com/help/en/vrs/latest/opening-service), [product page](https://www.alibabacloud.com/en/product/dashvector?_p_lc=1) |
| **DirectMail** | Outbound email for the "send the reply / send to human" step | Four clusters: China (Hangzhou), **Singapore**, US, Germany; sender addresses are region-isolated | **USD 0.29 per 1,000 messages**; initial daily quota 2,000 emails, reputation-adjusted | [pricing](https://www.alibabacloud.com/en/product/directmail/pricing?_p_lc=1), [clusters](https://help.aliyun.com/en/direct-mail/getting-started/simplified-procedure-of-sending-by-api-and-smtp) (China site), [limits](https://www.alibabacloud.com/help/en/direct-mail/product-overview/limits), [region choice FAQ](https://www.alibabacloud.com/help/en/direct-mail/email-sending-faqs) |

---

## 10. Master mapping: workflow part → product (Singapore-first)

Legend: 🟢 = documented available in Singapore / internationally · 🟡 = international but region-limited or preview · 🔴 = China site only · ❓ = unconfirmed

| Workflow part | Best options | Availability | Notes / citations |
|---|---|---|---|
| **Inbound email ingestion (trigger)** | Custom FC function on timer/HTTP polling IMAP or Graph API; EventBridge HTTP source for a mail-provider webhook | 🟢 FC + EventBridge in Singapore | **No native email trigger exists.** FC trigger list has no mail source [Trigger types](https://www.alibabacloud.com/help/en/functioncompute/trigger-overview); EventBridge third-party SaaS arrives via HTTP source [Functions and features](https://www.alibabacloud.com/help/en/eventbridge/product-overview/product-function-node-eventbridge); DirectMail is outbound-only [DirectMail](https://www.alibabacloud.com/en/product/directmail/pricing?_p_lc=1) |
| **Scheduled / cron trigger** | FC time trigger; CloudFlow time-based schedule; AgentCore Team scheduled tasks | 🟢 | [FC triggers](https://www.alibabacloud.com/help/en/functioncompute/trigger-overview) · [CloudFlow schedule](https://www.alibabacloud.com/help/en/serverless-workflow/latest/create-a-time-based-schedule) · [AgentCore Team schedule](https://www.alibabacloud.com/help/en/agentcore/use-team-web-to-set-tasks) |
| **Event trigger (OSS/queue/stream/cloud-service)** | EventBridge → FC / CloudFlow / SMQ / RocketMQ / HTTP | 🟢 Singapore | [EventBridge regions](https://www.alibabacloud.com/help/en/eventbridge/product-overview/supported-regions), [targets](https://www.alibabacloud.com/help/en/eventbridge/user-guide/event-target-overview), [route to FC](https://www.alibabacloud.com/help/en/eventbridge/user-guide/route-events-to-function-compute), [route to CloudFlow](https://www.alibabacloud.com/help/en/eventbridge/user-guide/routing-to-a-serverless-workflow) |
| **Durable orchestration, branching, loops, retries, long waits** | **CloudFlow** (primary); Dify workflow; AgentRun Flow | 🟢 CloudFlow in `ap-southeast-1` | Standard mode = 1-year max execution; parallel ≤100 branches; foreach with concurrency; retry/catch; waitForCallback [modes](https://help.aliyun.com/en/document_detail/2504569.html), [parallel](https://www.alibabacloud.com/help/en/serverless-workflow/latest/parallel-steps), [foreach](https://www.alibabacloud.com/help/en/serverless-workflow/latest/foreach-steps), [task steps](https://www.alibabacloud.com/help/en/serverless-workflow/latest/task-steps), [endpoints](https://www.alibabacloud.com/help/doc-detail/2782151.html) |
| **Agent loop / ReAct harness** | AgentCore Managed Harness (QwenPaw, Qoder); AgentRun Quick-Create/Flow/code; AgentScope; Spring AI Alibaba Graph | 🟢 AgentCore + AgentRun in Singapore | [Managed Harness](https://www.alibabacloud.com/help/en/agentcore/agent-instructions-managed-harness), [AgentRun no-code](https://www.alibabacloud.com/help/en/agentrun/quickly-create-agent-no-code), [AgentScope Runtime](https://github.com/agentscope-ai/agentscope-runtime), [Spring AI Alibaba Graph](https://github.com/alibaba/spring-ai-alibaba/blob/main/spring-ai-alibaba-graph-core/README.md) |
| **Model gateway / multi-model routing** | AgentRun model proxy (LiteLLM on FC); AI Gateway; Model Studio API direct | 🟢 Singapore | [AgentRun LLMs](https://www.alibabacloud.com/help/en/agentrun/large-language-model-1.md), [AI Gateway regions](https://www.alibabacloud.com/help/en/api-gateway/ai-gateway/product-overview/supported-regions), [Model Studio regions](https://www.alibabacloud.com/help/en/model-studio/regions) |
| **Tool hosting (MCP servers, functions)** | AgentRun MCP tools (remote / code / template) + MCP Tool Hooks; AgentCore MCP + Skills marketplace; FC custom container; AI Gateway MCP marketplace | 🟢 | [AgentRun MCP](https://www.alibabacloud.com/help/en/agentrun/create-the-mcp-tool-1), [Tool Hooks blog](https://www.alibabacloud.com/blog/does-do-not-work-on-ai-agents-900-tests-with-agentrun-mcp-tool-hooks_603668), [AgentCore ListMcpTools](https://www.alibabacloud.com/help/en/agentcore/api-agentcore-2026-08-04-listmcptools), [AI Gateway](https://www.alibabacloud.com/en/product/api-gateway?_p_lc=1). "FC as MCP runtime" is 🔴 China-site-only [CAP MCP intro](https://help.aliyun.com/en/cap/user-guide/mcp-service-introduction/) |
| **Code interpreter / browser-use sandbox** | AgentRun Sandbox; Agent Sandbox (Flash/Container); ACS Agent Sandbox; AgentBay | 🟢 / 🟡 | [AgentRun sandbox](https://www.alibabacloud.com/help/en/agentrun/what-is-agentrun), [Agent Sandbox](https://www.alibabacloud.com/help/en/agent-sandbox/product-overview/agent-sandbox-overview), [ACS](https://www.alibabacloud.com/help/en/cs/user-guide/agent-sandbox/), [AgentBay](https://www.alibabacloud.com/en/product/agentbay?_p_lc=1) |
| **Conversation + long-term memory** | AgentRun Memory Store (Tablestore / RDS); AgentCore Memory Space; Tablestore Memory Storage Service | 🟢 Singapore (Tablestore MSS in HK + SG) | [AgentRun memory](https://www.alibabacloud.com/help/en/agentrun/memory-storage-overview.md), [Tablestore in AgentRun](https://www.alibabacloud.com/help/en/tablestore/memory-storage-service-sub-product-test/agentrun-tablestore-memory), [AgentCore Memory Space](https://www.alibabacloud.com/help/en/agentcore/memory-space-overview.md), [Tablestore regions](https://www.alibabacloud.com/help/en/tablestore/memory-storage-service-sub-product-test/news-and-announcements) |
| **Knowledge base / RAG over help-centre articles** | AgentRun KB (Model Studio **or RAGFlow**); AgentCore KB connection; PAI knowledge base; DashVector + own retriever; AI Search Open Platform | 🟡 / 🔴 | AgentRun KB [guide](https://www.alibabacloud.com/help/en/agentrun/knowledge-base-integration-guide); AgentCore connects to Model Studio KB [doc](https://www.alibabacloud.com/help/en/agentcore/connect-the-refined-knowledge-base-in-the-agentcore.md); Model Studio KB is separately billed [What is Model Studio](https://www.alibabacloud.com/help/en/model-studio/what-is-model-studio) but new-Singapore-account access ❓; **AI Search Open Platform = Shanghai + Frankfurt only** 🔴 [doc](https://www.alibabacloud.com/help/en/open-search/search-platform/getting-started/ai-getting-started); DashVector in SG + Virginia 🟢 [doc](https://www.alibabacloud.com/help/en/vrs/latest/opening-service); PAI KB [doc](https://www.alibabacloud.com/help/en/pai/knowledge-base-management) |
| **Human approval / draft-to-human handoff** | **CloudFlow `waitForCallback` + task token** (strongest, durable, 1-year wait); Spring AI Alibaba Graph interrupt; AgentRun MCP Tool Hooks; AgentCore "take over failures" | 🟢 CloudFlow; 🟡 others | [waitForCallback](https://www.alibabacloud.com/help/en/serverless-workflow/latest/perform-callbacks-on-asynchronous-tasks), [SMQ token example](https://www.alibabacloud.com/help/en/serverless-workflow/latest/mns-queues-workflow), [Graph HITL](https://java2ai.com/en/docs/1.0.0.2/tutorials/graph/human-in-the-loop/), [AgentCore product page](https://www.alibabacloud.com/en/product/agentcore?_p_lc=1). A managed approval-queue UI is ❓ not documented |
| **Chat / IM channel to end users** | Agentic Computer (Web Chat, CLI, cloud desktop, IM); AgentCore IM (DingTalk/Lark/WeCom); AgentRun Open Platform (DingTalk/Lark/WeCom/personal WeChat) + WeCom integration; AI Gateway-exposed HTTP API for your own web widget | 🟡 | **Slack, Teams, WhatsApp, LINE, Telegram: not documented anywhere — ❓/absent.** [Agentic Computer channels](https://www.alibabacloud.com/help/en/jvs/chat-with-agent.md), [AgentCore IM](https://www.alibabacloud.com/help/en/agentcore/integrate-the-agent-into-the-im-channel.md), [CreateAgentIMChannel enum](https://www.alibabacloud.com/help/en/agentcore/api-agentcore-2026-08-04-createagentimchannel), [AgentRun Open Platform](https://www.alibabacloud.com/help/en/agentrun/open-platform-introduction.md), [AgentRun WeCom](https://www.alibabacloud.com/help/en/agentrun/agent-integrated-enterprise-micro) |
| **Outbound email (send reply / notify agent)** | DirectMail (Singapore cluster) | 🟢 | USD 0.29/1,000; 2,000/day initial quota [pricing](https://www.alibabacloud.com/en/product/directmail/pricing?_p_lc=1), [limits](https://www.alibabacloud.com/help/en/direct-mail/product-overview/limits) |
| **Observability / tracing** | AgentRun built-in OTel end-to-end tracing + cost analysis; ARMS probe; AgentLoop (full-stack, eval); Cloud Monitor 2.0 AI Application Observability; SLS | 🟢 AgentRun/ARMS/SLS; 🟡 AgentLoop = **HK only** internationally | [AgentRun](https://www.alibabacloud.com/help/en/agentrun/what-is-agentrun), [ARMS probe](https://www.alibabacloud.com/help/en/agentrun/installing-the-arms-probe-for-python-agent-applications-1.md), [AgentLoop regions](https://www.alibabacloud.com/help/en/agentloop/agentloop-quickstart-whole-process-practice), [Cloud Monitor 2.0](https://www.alibabacloud.com/help/en/cms/cloudmonitor-2-0/what-is-cloud-monitor-2-0) |
| **Evaluation / quality gates** | AgentLoop (Agent-as-a-Judge, 20+ built-in evaluators, Trace2Dataset); AgentCore↔AgentLoop Code Judge | 🟡 HK only internationally | [What is AgentLoop](https://www.alibabacloud.com/help/en/agentloop/product-overview/what-is-agentloop), [blog](https://www.alibabacloud.com/blog/what-is-the-newly-released-agentloop-by-alibaba-cloud_603378), [AgentCore integration](https://www.alibabacloud.com/blog/what-makes-alibaba-cloud%E2%80%99s-newly-released-agentcore-different_603627) |
| **Agent identity / secrets** | Agent Identity (Workload Access Token); Agent ID Guard (IDaaS EIAM); AgentCore control-plane secret management | 🟢 / ❓ pricing | [Agent Identity](https://www.alibabacloud.com/help/en/agentidentity/obtain-credentials/), [Agent ID Guard](https://www.alibabacloud.com/help/en/idaas/eiam/user-guide/what-is-agent-id-guard), [AgentCore](https://www.alibabacloud.com/en/product/agentcore?_p_lc=1) |
| **Agent runtime security** | Agent Security Center (prompt-injection, data-leak, runtime behaviour) | 🟢 | [ASC billing](https://www.alibabacloud.com/help/en/asc/product-overview/billing-overview) |
| **Governance / registry / permissions across many agents** | **AgentCore** (workspaces, external+custom+managed agents, marketplace for enterprise skills/MCP, user & permission mgmt) | 🟢 Singapore | [overview](https://www.alibabacloud.com/help/en/agentcore/agentcore-product-overview), [product page](https://www.alibabacloud.com/en/product/agentcore?_p_lc=1), [Dashboard blog](https://www.alibabacloud.com/blog/agentteams-dashboard-unified-management-of-teams-projects-and-assets_603683) |
| **Visual no-code builder for business users** | AgentRun Quick Creation + Flow canvas; Dify on ACK/EAS; PAI LangStudio; CloudFlow Studio (+ AI workflow generation) — **Model Studio's own app builder is closed to new SG accounts** | 🟢 | [AgentRun](https://www.alibabacloud.com/help/en/agentrun/quickly-create-agent-no-code), [Dify on ACK](https://www.alibabacloud.com/help/en/ack/cloud-native-ai-suite/use-cases/building-customized-ai-question-and-answer-assistant-based-on-dify), [LangStudio](https://www.alibabacloud.com/help/en/pai/create-a-workflow-application), [CloudFlow Studio](https://www.alibabacloud.com/help/en/serverless-workflow/latest/interface-overview), [Model Studio restriction](https://www.alibabacloud.com/help/en/model-studio/application-introduction) |
| **Import an existing Dify/n8n design** | **AgentRun `ConvertFlowDSL`**; Model Studio "Import Dify DSL" (gated); Spring AI Alibaba Dify DSL adapter | 🟢 AgentRun | [ConvertFlowDSL](https://www.alibabacloud.com/help/en/agentrun/api-agentrun-2025-09-10-convertflowdsl.md) — "converts a third-party workflow DSL, such as Dify or n8n, into an AgentRun Flow definition … performs compatibility checks"; Flow serves "Dify Workflow and Dify Chatflow protocols" [quickstart](https://www.alibabacloud.com/help/doc-detail/3049290.html); Model Studio import 🔒 [workflow overview](https://help.aliyun.com/en/model-studio/workflow/introduction) (China site); Spring AI Alibaba Dify adapter has an open bug on `agent` node type [issue #2077](https://github.com/alibaba/spring-ai-alibaba/issues/2077) |
| **One-click AI app templates (ComfyUI, Ollama, voice)** | **CAP / Function AI** | 🔴 **China site only** | [CAP](https://www.aliyun.com/product/cap), [Function AI](https://help.aliyun.com/en/cap/use-cases/two-ways-to-quickly-deploy-qwq-32b-reasoning-model). International equivalent = FC GPU function + container image, or PAI-EAS |

---

## 11. Open items to verify in console (blocked by search-snippet access)

1. **AgentCore's complete supported-region table** and its **Singapore/Hong Kong Compute CU, Gateway CU, Storage CU unit prices** — the international billing page has a "Singapore and Hong Kong (China) regions" table whose values I could not read [AgentCore Billing](https://www.alibabacloud.com/help/en/agentcore/agentcore-billing-instructions).
2. **AgentCore quotas page** (max agents per workspace, runtime specs, session limits) — not found; **unconfirmed**.
3. **AgentCore: a first-class human-approval gate** before a tool call — not found in docs; only "take over failures automatically" and blog-level HITL language. **Unconfirmed.**
4. **AgentRun price card** — none found; **unconfirmed**. Costs are FC CU + sandbox + Model Studio tokens.
5. **AgentRun's complete international region list** — only Singapore is evidenced; whether HK is a separate AgentRun region or only an Open-Platform region needs checking [supported regions](https://help.aliyun.com/en/agentrun/open-service-area) vs [Open platform](https://www.alibabacloud.com/help/en/agentrun/open-platform-introduction.md).
6. **CloudFlow's full international region list** and the **free-tier discrepancy** (5,000 vs 1,000 step transitions/month) [billing-billing](https://www.alibabacloud.com/help/en/serverless-workflow/latest/billing-billing) vs [serverless-workflow-billing](https://www.alibabacloud.com/help/en/serverless-workflow/latest/serverless-workflow-billing).
7. **CloudFlow: a native LLM/Model Studio step** — none found; assume HTTP Task. **Unconfirmed.**
8. **FC region × feature matrix cells for `ap-southeast-1`** (custom container, GPU, session affinity, Tablestore) — page exists, cells unread [Supported regions](https://www.alibabacloud.com/help/en/functioncompute/regions).
9. **Current FC CU unit price for Singapore** — the published USD 0.000020/CU tier carries an expired date window [CU billing change](https://www.alibabacloud.com/help/en/functioncompute/product-changes-changes-of-billable-items-resource-plans-and-trial-quota-of-function-compute).
10. **Whether a brand-new Singapore account can create a Model Studio knowledge base** (as opposed to a Model Studio *application*) — this decides whether AgentCore/AgentRun KB connections are viable for new customers. **Unconfirmed**, and it is the single highest-risk fact for the support-email use case.
11. **Dify version/limits on PAI-EAS** — not readable; ACK path pins **1.11.4** [tech solution](https://www.alibabacloud.com/en/solution/tech-solution-deploy/2871859).
12. **`CAPConfig` in AgentRun's `CreateAgentRuntime`** — usable from Singapore? **Unconfirmed** [CAPConfig](https://www.alibabacloud.com/help/en/agentrun/api-agentrun-2025-09-10-capconfig).

---

## Searches run (283)

- Alibaba Cloud AgentCore product page
- Alibaba Cloud AgentRun serverless agent runtime Singapore
- Alibaba Cloud Function Compute 3.0 AI agent MCP
- Alibaba Cloud CloudFlow Serverless Workflow international availability
- Dify on ACK Alibaba Cloud marketplace
- AgentScope Alibaba Cloud open source agent framework
- Spring AI Alibaba documentation
- Qwen-Agent GitHub Alibaba
- AgentCore Alibaba Cloud billing pricing regions Singapore
- AgentCore Alibaba Cloud DingTalk Lark Slack WhatsApp channel integration
- AgentCore MAGIC Alibaba Cloud AI Worker
- AgentCore Alibaba Cloud skills MCP tools knowledge base human review
- AgentRun Alibaba Cloud supported frameworks LangGraph AgentScope CrewAI
- AgentRun Alibaba Cloud pricing billing regions
- AgentRun Alibaba Cloud model gateway MCP tool hub memory tracing
- AgentRun Alibaba Cloud sandbox browser code interpreter
- AgentCore supported regions Singapore "China (Hangzhou)" agent building governance platform
- AgentCore billing "Singapore and Hong Kong" AI Worker price per
- CreateAgentIMChannel AgentCore DINGTALK LARK FEISHU channel types
- AgentCore Alibaba Cloud formerly AgentTeams Multi-agent Governance Collaboration Platform
- AgentRun "what is AgentRun" supported frameworks LangChain LangGraph Google ADK AgentScope CrewAI regions
- AgentRun billing overview pay-as-you-go vCPU GB-second Singapore
- AgentRun runtime limits timeout concurrency session
- AgentRun open platform China Hong Kong Singapore region
- AgentCore Alibaba Cloud "AI Worker" MAGIC multi-model providers activate
- AgentCore product overview three core capabilities build govern execute
- AgentCore Alibaba Cloud regions supported Singapore Beijing Hangzhou product overview supported regions
- AgentCore billing instructions pay-as-you-go AI Worker instance hour
- CloudFlow Alibaba Cloud supported regions Singapore Serverless Workflow available
- CloudFlow Serverless Workflow wait for callback human approval parallel branches
- CloudFlow Serverless Workflow limits execution duration quota
- CloudFlow Alibaba Cloud pricing billing per transition
- CloudFlow Serverless Workflow DescribeRegions supported regions list Singapore ap-southeast-1
- "Serverless Workflow" Alibaba Cloud available regions "Singapore" endpoint fnf
- CloudFlow limits maximum execution duration steps Alibaba Cloud
- CloudFlow wait state callback task token Alibaba Cloud human in the loop
- Alibaba Cloud CAP Cloud Application Platform Function AI regions China only
- Function AI Alibaba Cloud CAP serverless application international
- Alibaba Cloud EventBridge supported regions Singapore
- Alibaba Cloud Simple Message Queue SMQ formerly MNS regions Singapore
- Alibaba Cloud "Cloud Application Platform" CAP Function AI 函数计算 AI
- "Function AI" Alibaba Cloud CAP regions
- Function Compute 3.0 GPU instance types AI Alibaba Cloud regions
- Function Compute async invocation task mode long running Alibaba Cloud 24 hours
- Function Compute MCP server hosting Alibaba Cloud runtime
- Function Compute triggers list HTTP timer OSS EventBridge MNS Kafka Alibaba Cloud
- Function Compute limits timeout 86400 concurrency quota Alibaba Cloud international
- Function Compute AI application templates Alibaba Cloud web app ComfyUI
- alibabacloud.com Function AI CAP Cloud Application Platform English documentation
- "Function AI" Alibaba Cloud serverless AI application deployment Model Studio ComfyUI regions
- Dify on PAI-EAS Alibaba Cloud deployment
- AgentRun Alibaba Cloud supported regions Singapore ap-southeast-1 endpoint
- AgentLoop Alibaba Cloud agent observability regions Hong Kong
- Alibaba Cloud Model Studio agent application workflow application Singapore 2025-04-21 restriction
- Alibaba Cloud AI Gateway Cloud Native API Gateway MCP marketplace regions
- Alibaba Cloud Model Studio knowledge base RAG Singapore international
- site:alibabacloud.com cap Cloud Application Platform Function AI
- Alibaba Cloud Function Compute supported regions Singapore GPU instance feature availability
- Dify PAI-EAS version supported regions Alibaba Cloud deploy Dify large model application platform
- ack-dify component ACK App Marketplace version limits Alibaba Cloud
- EventBridge Alibaba Cloud supported regions Singapore feature availability table
- RocketMQ Alibaba Cloud ApsaraMQ regions Singapore international
- AgentScope runtime Alibaba Cloud deploy AgentScope Studio sandbox
- Spring AI Alibaba deploy Alibaba Cloud ACK SAE Model Studio DashScope
- "AgentCore" alibabacloud "Supported regions" "Singapore" "ap-southeast-1" region ID
- AgentCore Alibaba Cloud "Agent Builder" "Agent Runtime" "Agent Governance" three core modules
- AgentCore Alibaba Cloud knowledge base human approval review workflow governance
- AgentCore Alibaba Cloud billing "AI Worker" price unit Singapore Hong Kong
- "AgentRun" Alibaba Cloud billing overview resource plan pay-as-you-go
- AgentRun Alibaba Cloud runtime types custom container image session affinity idle mode
- AgentRun Alibaba Cloud model gateway unified API OpenAI compatible providers
- AgentRun Alibaba Cloud tracing observability agent evaluation
- alibabacloud.com help en agentcore llms.txt
- alibabacloud.com help en agentrun llms.txt AgentRun documentation index
- AgentCore product overview "China (Hangzhou)" "China (Beijing)" "Singapore" "China (Hong Kong)" fees
- AgentCore Alibaba Cloud agent runtime compute specifications session policy container
- Function Compute "create an agent" high-code low-code Alibaba Cloud agent runtime
- Function Compute FunModel FunClaw Alibaba Cloud AI
- Function Compute MCP runtime hosting session Alibaba Cloud 2025 release notes
- Function Compute supported regions Singapore GPU feature availability table
- alibabacloud.com/help/en/agentcore/llms.txt AgentCore documentation index
- "AgentRun" llms.txt agent runtime sandbox model gateway tools memory
- AgentCore workspace agent registry governance evaluation Alibaba Cloud documentation index
- AgentRun Flow low-code agent node types human approval condition loop
- Function Compute Alibaba Cloud regions "Singapore" "GPU" "Session affinity" feature support table 2026
- "Cloud Application Platform" CAP Alibaba Cloud international site available
- Alibaba Cloud Function AI console international Singapore
- Alibaba Cloud CAP Function AI regions cn-hangzhou only
- "alibabacloud.com/help/en/cap" Cloud Application Platform
- AgentCore "Supported regions" table "China (Hangzhou)" "China (Beijing)" "Singapore" "China (Hong Kong)" ap-southeast-1
- AgentRun billing "Singapore" region unit price vCPU memory GB
- CloudFlow endpoints regions "ap-southeast-1.fnf.aliyuncs.com" Singapore
- AgentCore Alibaba Cloud pricing page buy resource plan subscription
- AgentCore Alibaba Cloud free trial public preview billing
- AgentRun Alibaba Cloud free quota trial credits new user
- Alibaba Cloud Agent Sandbox ACS product overview regions Singapore billing
- AgentCore billing Compute CU Gateway CU Storage CU price per CU hour Singapore
- AgentCore billing activation September 18 2026 public preview free
- CloudFlow endpoints regions list Alibaba Cloud Hangzhou Beijing Singapore Frankfurt Virginia
- AgentRun billing overview Agent Sandbox compute CU price Alibaba Cloud
- Agent Sandbox Alibaba Cloud regions open service area Singapore Hong Kong
- Alibaba Cloud CloudFlow supported regions 2026 available regions list
- CloudFlow standard mode express mode Alibaba Cloud differences
- CloudFlow Serverless Workflow integrate Model Studio LLM Bailian task step
- Agent Sandbox billing overview Alibaba Cloud vCPU-second GiB-second Default Economy Flash Container Edition price
- Agent Sandbox regions Flash Edition Container Edition supported Singapore
- Function Compute regions Alibaba Cloud "Singapore" GPU instance support feature availability
- EventBridge Alibaba Cloud Singapore supported features event bus rule target
- Qwen-Agent framework maintained status 2026 recommended
- AgentScope 2.0 Alibaba recommended production framework deployment AgentRun
- Spring AI Alibaba Graph workflow human-in-the-loop interrupt resume
- Qwen-Agent vs AgentScope vs Spring AI Alibaba which to use Alibaba Cloud documentation
- "AgentCore" "ap-southeast-1" supported regions "China (Hangzhou)" "China (Beijing)" "Singapore"
- AgentCore Alibaba Cloud product page three core capabilities agent construction governance execution
- AgentCore workspace agent registry credential management memory space Alibaba Cloud features
- AgentCore Alibaba Cloud external agent custom agent managed agent types
- "AgentRun" supported regions "Singapore" "ap-southeast-1" open-service-area
- AgentRun pricing billing items runtime sandbox model gateway tool Alibaba Cloud documentation
- AgentRun limits quotas concurrency instances Alibaba Cloud
- AgentRun AgentRuntime network configuration VPC internet access Alibaba Cloud
- AgentRun supported regions table "China (Hangzhou)" "China (Beijing)" "Singapore" "US" full list
- AgentCore supported regions table full list China Shanghai Shenzhen Singapore Hong Kong
- Function Compute supported regions Singapore "GPU instance" availability international regions list
- CloudFlow Alibaba Cloud supported regions list China Hangzhou Shanghai Beijing Shenzhen Singapore
- Deploy Dify PAI-EAS Alibaba Cloud steps version limits regions
- ack-dify component version Dify 1.11.4 ACK App Marketplace limits single instance
- Alibaba Cloud Dify technical solution high availability architecture ACK components
- Dify on ACS Alibaba Cloud agent sandbox ack-dify
- Function Compute supported regions table Singapore Malaysia Indonesia Japan Germany US Virginia GPU instance feature
- EventBridge service regions Singapore "ap-southeast-1" supported features event streaming schema registry
- CloudFlow "Make API requests" endpoints regions Hangzhou Shanghai Beijing Shenzhen Singapore Frankfurt
- Alibaba Cloud Model Studio Singapore region supported features agent workflow knowledge base fine-tuning 2026
- Alibaba Cloud AI Search Open Platform regions Shanghai Frankfurt international
- Model Studio qwen3-max price Singapore per 1M tokens input output 2026
- Alibaba Cloud Model Studio model pricing Singapore qwen-max qwen-plus 2026
- Alibaba Cloud Model Studio PrivateLink regions Beijing Hong Kong
- AgentCore "human" approval review intervention Alibaba Cloud agent governance audit
- AgentCore Alibaba Cloud skills Skills marketplace managed harness QwenPaw Qoder
- AgentCore memory space long-term memory MCP Alibaba Cloud
- AgentCore agent gateway Alibaba Cloud MCP service credential management
- AgentRun Flow low-code human approval node Alibaba Cloud
- AgentRun triggers scheduled timer event HTTP invoke agent Alibaba Cloud
- AgentRun Alibaba Cloud WeCom integration agent IM channel
- AgentRun version canary release gray deployment Alibaba Cloud
- CloudFlow regions endpoints "cn-hangzhou.fnf.aliyuncs.com" "ap-southeast-1.fnf.aliyuncs.com" "eu-central-1.fnf.aliyuncs.com" list
- apizie Alibaba Cloud CloudFlow API 30 endpoints regions list
- Function Compute Alibaba Cloud regions "Japan (Tokyo)" "Germany (Frankfurt)" "US (Virginia)" "Singapore" GPU supported
- EventBridge Alibaba Cloud supported regions list Singapore Malaysia Indonesia Japan Germany US Virginia
- 阿里云 云应用开发平台 CAP 国际站 是否支持 海外
- Alibaba Cloud CAP Cloud Application Function AI only China regions Hangzhou
- Function Compute console AgentRun Flow Function AI international console availability
- Alibaba Cloud serverless AI agent stack international Singapore AgentRun AgentCore Function Compute 2026
- CloudFlow "Regions and endpoints" Alibaba Cloud international site supported regions table
- CloudFlow limits Alibaba Cloud number of flows per region execution history retention
- Function Compute regions table "Singapore" "support" GPU "session affinity" "custom container"
- FC Agent Sandbox E2B compatible Alibaba Cloud international Singapore billing
- Alibaba Cloud AgentCore public preview release date 2026 international launch
- Alibaba Cloud AgentCore press release agentic cloud stack AgentCore AgentBay 2026
- Alibaba Cloud Apsara Conference 2026 AgentCore AgentRun AgentLoop announcement regions
- Alibaba Cloud AI Gateway supported regions Singapore international MCP marketplace
- "CloudFlow" endpoints "China (Hangzhou)" "China (Shanghai)" "China (Beijing)" "China (Shenzhen)" "Singapore" "Germany (Frankfurt)" "US (Virginia)"
- alibabacloud CloudFlow "Make API requests" region public endpoint internal endpoint table
- Function Compute "Supported regions" "Singapore" "GPU" "Instance type" support unsupport table international
- EventBridge "service regions" Alibaba Cloud Singapore "event streaming" "schema" supported unsupported
- Alibaba Cloud Serverless Workflow CloudFlow available international regions console Singapore create flow
- CloudFlow pricing international USD step transitions free quota monthly
- CloudFlow schedule trigger timed trigger Alibaba Cloud flow
- CloudFlow integrate Function Compute HTTP third party service task state Alibaba Cloud
- Function Compute regions Alibaba Cloud Singapore "GPU" support unsupported feature table 2026
- AI Gateway Alibaba Cloud supported regions Singapore Japan Tokyo Germany Frankfurt US Virginia
- EventBridge Alibaba Cloud Singapore supported event bus event rule event stream schema
- AgentCore billing Compute CU definition 1 CU vCPU memory Alibaba Cloud
- Model Studio Singapore regional access information supported features list
- Model Studio application API restriction Singapore April 21 2025 agent application workflow application
- Alibaba Cloud Model Studio agent application channels web embed API DingTalk
- Model Studio knowledge base billing specification duration Singapore international
- Alibaba Cloud Agent Identity product overview regions agent credential OAuth
- AgentBay Alibaba Cloud WuYing sandbox international regions pricing
- AgentCore billing "Compute CU" "Gateway CU" "Storage CU" unit price USD
- Alibaba Cloud AgentCore dedicated gateway instance fee billing
- "Function Compute" Alibaba Cloud "Supported regions" Singapore GPU instance "unsupport"
- EventBridge Alibaba Cloud "supported regions" table Singapore Japan Tokyo Germany Frankfurt US Virginia event streaming
- Alibaba Cloud Function Compute Singapore region features available custom container GPU session
- Alibaba Cloud serverless products availability international regions comparison Function Compute SAE CloudFlow EventBridge
- "AgentCore Billing" alibabacloud "Compute CU" "USD" per CU hour reference price
- AgentCore billing billable item billing method description Compute CU Gateway CU Storage CU dedicated gateway
- Function Compute GPU instance Tesla Ada Hopper Singapore Frankfurt regions available
- Alibaba Cloud Function Compute Singapore GPU fc.gpu.tesla fc.gpu.ampere availability
- AgentBay Alibaba Cloud regions supported Singapore international pricing points
- Agent Identity Alibaba Cloud supported regions billing
- Alibaba Cloud agentic AI product matrix AgentCore AgentRun AgentLoop AgentBay Agent Identity overview
- Alibaba Cloud agent products international availability Singapore 2026 list
- Function Compute "Ada series GPU-accelerated instances are supported in the following regions" Singapore
- Function Compute Tesla GPU regions Singapore US Virginia Germany Frankfurt instance types specifications
- AgentCore billing "Singapore and Hong Kong" regional pricing Compute CU USD
- Agent Security Center Alibaba Cloud regions billing overview agent security
- Alibaba Cloud Function Compute 3.0 AI features session affinity MCP runtime agent sandbox international
- Function Compute "AI application" templates Alibaba Cloud international console Singapore
- Function Compute Alibaba Cloud web function GPU ComfyUI Singapore deploy
- Function Compute billing CU price Singapore international per vCPU second
- CloudFlow service integration overview list Function Compute MNS SLS Model Studio LLM Bailian
- CloudFlow "Task" state call third-party HTTP service Alibaba Cloud integration list
- AgentCore regions "China (Hangzhou)" "China (Beijing)" "China (Shanghai)" "Singapore" "China (Hong Kong)" supported
- Function Compute pay-as-you-go CU price Singapore USD per CU vCPU second memory
- AgentCore Alibaba Cloud agent building "Skills" "MCP" "knowledge base" "memory" features list overview
- AgentCore Alibaba Cloud collaboration governance "AI Worker" team dashboard approval
- AgentCore observability evaluation Alibaba Cloud AgentLoop integration
- AgentCore Alibaba Cloud quick start create agent workspace console international
- AgentCore supported regions "China (Shanghai)" "China (Shenzhen)" "China (Hong Kong)" "Singapore" ap-southeast-1 fees
- CloudFlow service integration list Function Compute Simple Message Queue Tablestore SLS Model Studio supported services
- Function Compute "create an agent" international documentation Singapore AgentRun console
- AgentCore Alibaba Cloud "public preview" regions activation Singapore console
- Alibaba Cloud Model Studio workflow nodes LLM API Function Compute knowledge base human review
- Alibaba Cloud intelligent customer service email agent solution Alibaba Cloud international
- Alibaba Cloud DirectMail email sending product international regions
- Alibaba Cloud support email agent workflow reference architecture Model Studio Function Compute
- CloudFlow service integration overview supported services Function Compute MNS CloudFlow optimized integration list
- EventBridge event targets overview 12 target types Function Compute MNS RocketMQ HTTP HTTPS CloudFlow
- AgentCore "cn-hangzhou" "cn-beijing" "cn-shanghai" "ap-southeast-1" region name region ID table
- ApsaraMQ RocketMQ 5.x supported regions Singapore ap-southeast-1 international
- Alibaba Cloud AgentCore documentation "Account Integration" DingTalk WeChat Lark connect agent
- AgentCore "Connect an Agent to an IM Bot" DingTalk Feishu WeCom configuration web widget
- AgentRun open platform FunAgent multi-channel IM DingTalk Lark WeCom personal WeChat web
- Alibaba Cloud agent web chat widget embed website AgentCore AgentRun
- Agentic Computer Alibaba Cloud product overview regions JVS
- AgentRun supported regions "China (Hangzhou)" "China (Beijing)" "Singapore" "China (Hong Kong)" full list table
- CloudFlow Alibaba Cloud "ap-southeast-1" console available Singapore region flow create
- AgentCore region ID "cn-shanghai" "cn-shenzhen" "cn-hongkong" "ap-southeast-1" fees billing
- AgentRun Alibaba Cloud "Agent Toolkit" skills plugins MCP configuration Terraform
- AgentRun memory store Tablestore session history long-term memory Singapore
- AgentRun model proxy LiteLLM Function Compute model gateway
- AgentRun sandbox Code Interpreter Browser Use AIO 50 languages MCP
- AgentCore endpoints "agentcore.ap-southeast-1.aliyuncs.com" Asia Pacific
- Agentic Computer JVS Alibaba Cloud international regions availability pricing credits
- CloudFlow service integration list Function Compute MNS OSS SLS "Model Studio" Bailian supported services optimized
- Function Compute trigger types overview HTTP timer OSS EventBridge MNS Kafka CDN SLS list
- Alibaba Cloud Model Studio Singapore supported features list agent application workflow application not available new users
- Alibaba Cloud "AI Search Open Platform" alternative Singapore RAG knowledge base international
- Alibaba Cloud OpenSearch LLM-based Q&A international regions
- Alibaba Cloud DashVector Milvus Elasticsearch vector database Singapore international regions
- "AgentRun supported regions" Singapore only international China Hangzhou Beijing Shanghai Shenzhen
- Function Compute Alibaba Cloud international docs create agent runtime code high-code low-code
- Model Studio MCP service marketplace Singapore international regions
- CloudFlow AI-generated workflow natural language available regions
- Alibaba Cloud Model Studio MCP servers Singapore region available
- AgentRun Alibaba Cloud pricing free during public preview
- AgentCore Alibaba Cloud public preview free period collaboration control plane CNY 0
- Alibaba Cloud Function Compute CU price Singapore 0.000020 per CU
- CloudFlow Alibaba Cloud "Regions" endpoint doc international "China (Hangzhou)" "Singapore" "US (Virginia)" "Germany (Frankfurt)"
- Model Studio Singapore agent application workflow application available new users 2026 change announcement
- Alibaba Cloud Model Studio application console Singapore "not available" international agent app 2026
- CloudFlow Alibaba Cloud product international serverless workflow Singapore purchase activate
- Alibaba Cloud AgentCore human-in-the-loop task approval AgentTeams team schedule tasks
- AgentCore "Use Team to Schedule Tasks" Alibaba Cloud
- AgentCore Alibaba Cloud agent evaluation AgentLoop Code Judge tuning
- AgentCore Alibaba Cloud high-code agent deployment Python SDK pro-code agent serve protocol
- alibabacloud CloudFlow "Serverless Workflow (Old Version)" vs CloudFlow new version international documentation
- CloudFlow Alibaba Cloud release notes 2026 new version regions
- CloudFlow Alibaba Cloud "standard mode" "express mode" which regions supported
- alibabacloud.com serverless-workflow latest supported regions CloudFlow
- CloudFlow Alibaba Cloud billing "USD 0.25 per 10,000" step transitions free 1000 monthly regions
- CloudFlow limits "Maximum number of flows" "10,000" execution history retention days
- CloudFlow task step timeoutSeconds 86400 retry maxAttempts Alibaba Cloud
- CloudFlow Loop step foreach iteration Alibaba Cloud workflow
- CloudFlow new version billing overview October 10 2025 price step transitions CU
- CloudFlow service integration list Function Compute MNS SMQ Tablestore SLS supported services optimized integration
- CloudFlow call Model Studio LLM API task step HTTP Alibaba Cloud workflow AI node
- CloudFlow new version features state machine Spec YAML IO constructors Workflow Studio
- Alibaba Cloud EventBridge route events to Function Compute CloudFlow target types list
- Simple Message Queue SMQ supported regions Singapore features queue topic
- Alibaba Cloud EventBridge billing pricing international free tier
- Alibaba Cloud EventBridge scheduled events cron trigger Alibaba Cloud
- Function Compute quotas limits 86400 seconds timeout 300 instances per region code package size disk
- AgentRun invoke agent runtime HTTP endpoint custom domain AI Gateway Alibaba Cloud
- Function Compute instance lifecycle idle mode provisioned instances Alibaba Cloud
- AgentCore networking configuration VPC internet access dedicated gateway Alibaba Cloud
- Alibaba Cloud Function Compute email trigger IMAP SMTP incoming email event source
- Alibaba Cloud EventBridge SaaS event sources list third-party email
- AgentCore human approval task confirmation approve reject agent action Alibaba Cloud
- AgentRun Flow node types approval human intervention condition iteration Alibaba Cloud
- AgentRun ConvertFlowDSLData Dify DSL import flow Alibaba Cloud
- AgentRun Flow import Dify workflow DSL compatibility Alibaba Cloud
- AgentRun Flow node types LLM knowledge base code HTTP condition iteration agent Alibaba Cloud documentation

## Sources returned by search (1661)

- https://www.alibabacloud.com/en/product/agentcore?_p_lc=1
- https://www.alibabacloud.com/help/en/agentcore/agentcore-product-overview
- https://www.alibabacloud.com/blog/what-makes-alibaba-cloud%E2%80%99s-newly-released-agentcore-different_603627
- https://www.linkedin.com/pulse/what-makes-alibaba-clouds-newly-released-agentcore-q6q5e
- https://help.aliyun.com/en/agentcore/product-overview/
- https://www.alibabacloud.com/help/en/agentcore/
- https://www.crnasia.com/news/2026/cloud/alibaba-cloud-rolls-out-agentic-cloud-stack-with-agentcore-a
- https://aws.amazon.com/bedrock/agentcore/
- https://www.alibabacloud.com/help/en/agentcore/agentcore-sdk-overview
- https://x.com/alibaba_cloud/status/2109891282378297843
- https://www.alibabacloud.com/help/en/agentrun/what-is-agentrun
- https://www.alibabacloud.com/blog/giving-your-ai-agent-a-disposable-workspace-with-alibaba-cloud-agentrun_603324
- https://www.alibabacloud.com/help/en/agentrun/start-using/
- https://help.aliyun.com/en/agentrun/aio-sandbox-1
- https://api.alibabacloud.com/api/AgentRun/2025-09-10
- https://github.com/Serverless-Devs/agentrun-cli
- https://www.alibabacloud.com/blog/what-does-alibaba-clouds-agent-infra-look-like_603177
- https://www.alibabacloud.com/help/en/agentrun/open-platform-introduction.md
- https://www.alibabacloud.com/en/press-room/alibaba-cloud-unveil-advanced-agentic-ai-ecosystem?_p_lc=1
- https://www.mii.co.id/giving-your-ai-agent-a-disposable-workspace-with-alibaba-cloud-agentrun-en
- https://www.alibabacloud.com/help/en/functioncompute/user-guide/
- https://www.alibabacloud.com/blog/frontline-practice-of-implementing-a-new-paradigm-of-ai-application-architecture-based-on-mcp_602144
- https://github.com/aliyun/alibabacloud-fc-mcp-server
- https://www.alibabacloud.com/en/product/function-compute?_p_lc=1
- https://skywork.ai/skypage/en/alibaba-cloud-function-compute/1981253406036295680
- https://mcpmarket.com/server/alibaba-cloud-fc
- https://www.alibabacloud.com/blog/building-real-time-ai-applications-with-alibaba-cloud-function-compute-and-event-driven-architecture_603585
- https://www.alibabacloud.com/blog/complete-beginners-guide-building-your-first-ai-agent-on-alibaba-cloud_602346
- https://www.alibabacloud.com/blog/accelerating-ai-integration-with-alibaba-cloud%E2%80%99s-model-context-protocol-mcp_602490
- https://help.aliyun.com/en/maxcompute/user-guide/mcp-overview-and-access
- https://www.alibabacloud.com/en/product/serverless-workflow?_p_lc=1
- https://www.alibabacloud.com/blog/multi-step-orchestration-on-alibaba-cloud-serverless-workflow_603189
- https://www.alibabacloud.com/blog/cloudflow-streamlined-development-makes-it-easier-to-build-applications-on-the-cloud_600726
- https://www.alibabacloud.com/help/en/serverless-workflow/latest/service-integration-overview
- https://www.alibabacloud.com/help/en/serverless-workflow/latest/release-notice
- https://www.alibabacloud.com/help/en/serverless-workflow/latest/ai-based-fast-generated-workflow-framework
- https://help.aliyun.com/en/document_detail/114020.html
- https://www.alibabacloud.com/blog/step-into-the-future-of-streamlined-business-processes-with-cloudflow_601192
- https://www.alibabacloud.com/blog/unleashing-the-potential-of-alibaba-cloud-a-basic-overview_601083
- https://www.chinafy.com/partners/alibaba-cloud
- https://www.alibabacloud.com/help/en/ack/cloud-native-ai-suite/use-cases/building-customized-ai-question-and-answer-assistant-based-on-dify
- https://www.alibabacloud.com/blog/high-availability-and-performance-best-practices-for-deploying-dify-based-on-ack_601874
- https://www.alibabacloud.com/help/en/ack/cloud-native-ai-suite/use-cases/update-the-dify-component-in-ack-clusters
- https://www.alibabacloud.com/en/solution/tech-solution/rapidly-deploy-dify-to-accelerate-ai-application-development
- https://www.alibabacloud.com/en/solution/tech-solution-deploy/2870155
- https://github.com/alibaba/dify
- https://help.aliyun.com/en/ack/cloud-native-ai-suite/use-cases/scheduling-a-dify-workflow-via-xxl-job
- https://www.alibabacloud.com/en/market/dify?_p_lc=1
- https://marketplace.dify.ai/plugin/sawyer-shi/aliyun_oss
- https://community.alibabacloud.com/tags/type_blog-tagid_38436
- https://agentscope.io/
- https://www.alibabacloud.com/blog/agentscope-java-2-0-building-a-distributed-enterprise-grade-foundation-for-ai-agents_603231
- https://github.com/agentscope-ai/agentscope
- https://www.alibabacloud.com/blog/agentscope-java-v1-0-has-been-released-allowing-java-developers-to-easily-build-enterprise-level-agentic-applications_602736
- https://www.alibabacloud.com/blog/hello-agentscope-java_602686
- https://www.facebook.com/0xSojalSec/posts/chinas-alibaba-dropped-a-python-framework-for-building-multi-agent-appsagentscop/1429302292057503/
- https://www.youtube.com/watch?v=m8y6CUMxbYk
- https://www.alibabacloud.com/blog/the-more-the-agent-is-used-the-smarter-it-becomes-the-agentscope-java-online-training-plugin-is-here_602866
- https://flowtivity.ai/blog/why-businesses-should-consider-agentscope-ai-framework/
- https://arxiv.org/html/2508.16279v1
- https://github.com/alibaba/spring-ai-alibaba
- https://sca.aliyun.com/en/ai/
- https://java2ai.com/
- https://www.alibabacloud.com/blog/spring-ai-alibaba-1-0-ga-officially-released-marking-the-advent-of-a-new-era-in-java-agent-development_602299
- https://springdevpro.com/spring-ai-alibaba/
- https://spring.io/projects/spring-cloud-alibaba
- https://javadoc.io/doc/com.alibaba.cloud.ai/spring-ai-alibaba-agent-framework/latest/index.html
- https://landscape.jimmysong.io/projects/spring-ai-alibaba/
- https://github.com/spring-ai-alibaba/spring-ai-extensions
- https://mvnrepository.com/artifact/com.alibaba.cloud.ai/spring-ai-alibaba-agent-framework
- https://github.com/QwenLM/Qwen-Agent
- https://github.com/QwenLM
- https://qwen.ai/qwencode
- https://tongyi-mai.github.io/Qwen-UI-Agent/
- https://aiagentstore.ai/ai-agent/qwen-agent
- https://www.alibabacloud.com/en/solutions/generative-ai/qwen?_p_lc=1
- https://github.com/QwenLM/qwen
- https://rits.shanghai.nyu.edu/ai/introducing-qwen-code-alibabas-open%E2%80%91source-cli-for-agentic-coding-with-qwen3%E2%80%91coder/
- https://www.turingpost.com/p/qwen
- https://help.aliyun.com/en/agentcore/agentcore-billing-instructions
- https://www.news.climate.columbia.edu/cloud-computing-pricing-6b2249
- https://www.alibabacloud.com/en/pricing?_p_lc=1
- https://www.alibabacloud.com/help/en/model-studio/model-pricing
- https://builder.aws.com/content/3KC60kJzFVDfHVxJ5CNecLZVPmA/amazon-bedrock-agentcore-pricing-hidden-costs-that-bill-while-your-agent-idles
- https://www.alibabacloud.com/blog/friday-blog---week-30---understanding-network-traffic-costs---part-2_598154
- https://getdeploying.com/alibaba-cloud-vs-aws
- https://aws.amazon.com/bedrock/agentcore/pricing/
- https://www.alibabacloud.com/help/en/cdt/inter-region-data-transfers
- https://www.alibabacloud.com/help/en/agentcore/api-agentcore-2026-08-04-createagentimchannel
- https://www.alibabacloud.com/help/en/sls/create-a-webhook
- https://help.aliyun.com/en/alinux/connect-im-bot
- https://slashdot.org/software/comparison/DingTalk-vs-Lark-vs-Slack/
- https://www.alibabacloud.com/help/en/support/latest/slack-channel
- https://aws.amazon.com/blogs/machine-learning/integrating-amazon-bedrock-agentcore-with-slack/
- https://appnicorn.com/workplace-communication-and-collaboration-a-focus-on-dingtalk/
- https://www.multica.ai/docs/channels
- https://www.alibabacloud.com/help/en/dms/use-dingtalk-exclusive-nail-flying-book-notification-message
- https://www.alibabacloud.com/help/en/agentcore/agentcore-management-skill
- https://www.reddit.com/r/LLMDevs/comments/1tukc23/%D1%81ompared_agent_platforms_cloudflare_agents_aws/
- https://business.google.com/reviews
- https://schema.org/Review
- https://store.hbr.org/
- https://www.frontiersin.org/journals/physiology
- https://competition-policy.ec.europa.eu/mergers/review-merger-guidelines_en
- https://www.sciencedirect.com/journal/children-and-youth-services-review
- https://www.dpreview.com/reviews/
- https://addyosmani.com/blog/agentic-code-review/
- https://www.epa.gov/pesticide-reevaluation/registration-review-process
- https://www.theparisreview.org/interviews/3439/the-art-of-fiction-no-71-joan-didion
- https://www.langchain.com/resources/ai-agent-frameworks
- https://sotaaz.com/post/agentscope-vs-langgraph-vs-crewai-en
- https://www.reddit.com/r/LangChain/comments/1sgh77s/managed_agents_vs_open_frameworks_langgraph/
- https://www.facebook.com/groups/chiefai/posts/3046926825500599/
- https://www.speakeasy.com/blog/ai-agent-framework-comparison
- https://www.ayautomate.com/blog/best-multi-agent-frameworks
- https://flowtivity.ai/blog/agentscope-review-production-multi-agent-framework/
- https://developer.ibm.com/articles/awb-comparing-ai-agent-frameworks-crewai-langgraph-and-beeai/
- https://www.alibabacloud.com/help/en/agent-sandbox/product-overview/billing-overview
- https://www.alibabacloud.com/help/en/pai/product-overview/billing-of-eas
- https://www.alibabacloud.com/en/press-room/alibaba-cloud-introduces-new-pricing-strategy?_p_lc=1
- https://wise.com/gb/blog/alibaba-cloud-pricing
- https://www.alibabacloud.com/help/en/express-connect/product-overview/outbound-data-transfer-fees
- https://www.alibabacloud.com/help/en/tablestore/memory-storage-service-sub-product-test/agentrun-tablestore-memory
- https://www.alibabacloud.com/blog/does-do-not-work-on-ai-agents-900-tests-with-agentrun-mcp-tool-hooks_603668
- https://www.alibabacloud.com/help/en/agentrun/large-language-model-1.md
- https://help.aliyun.com/en/agentrun/introduction-to-tools-and-skills
- https://skywork.ai/skypage/en/alibaba-cloud-observability-ai-gateway/1978710232358232064
- https://www.alibabacloud.com/help/en/agentrun/create-the-mcp-tool-1
- https://mcp.aibase.com/explore/AI%20Infrastructure
- https://github.com/devsapp/agentrun-sandbox-demos
- https://api.alibabacloud.com/api-tools/cli/AgentRun
- https://www.alibabacloud.com/help/en/agent-sandbox/product-overview/agent-sandbox-overview
- https://www.alibabacloud.com/help/en/cs/user-guide/agent-sandbox/
- https://medium.com/coding-nexus/alibaba-just-open-sourced-the-sandbox-infrastructure-they-use-internally-e0c430172e9a
- https://e2b.dev/
- https://www.alibabacloud.com/blog/zero-code-transformation-making-the-ai-agent-sandbox-no-longer-a-black-box_603571
- https://hidekazu-konishi.com/entry/amazon_bedrock_agentcore_implementation_guide_part1_foundation.html
- https://docs.pingidentity.com/pingoneaic/app-management/applications-agent-governance/aws-bedrock-agentcore.html
- https://builder.aws.com/content/3C6E3gd0zibedeZII2ig0gZv98c/building-a-multi-agent-aws-platform-with-amazon-bedrock-agentcore-part-3-tool-integration-code-interpreter-and-browser-tool
- https://medium.com/@servifyspheresolutions/amazon-bedrock-agentcore-explained-51ff42ca68c0
- https://builder.aws.com/content/3Ccu2kfaCVfmCZzueXBWWlq9GAw/building-ai-agents-with-real-time-ml-predictions-how-amazon-bedrock-agentcore-unifies-ai-and-ml-at-scale
- https://www.westloop.io/post/amazon-bedrock-agentcore-now-available-in-four-additional-aws-regions
- https://www.linkedin.com/pulse/aws-bedrock-agentcore-production-platform-ai-agents-actually-qadir-gcyoc
- https://builder.aws.com/content/3Je6ZDmMke7Ej8AZH0jdMd7GJte/amazon-bedrock-agentcore-runtime-how-aws-runs-ai-agents-in-production
- https://www.westloop.io/post/amazon-bedrock-agentcore-expands-to-two-new-regions
- https://pages.awscloud.com/rs/112-TZM-766/images/26-APAC-en-US-omdia-other-ardm-agentic-ai-development-platform-in-asia-and-oceania-reprint.pdf?version=1&trk=5629f7ca-87c3-4795-a6f3-7e634468f9a3&sc_channel=el
- https://omdia.tech.informa.com/om145362/omdia-market-radar-agentic-ai-cloud-titans-in-asia-amp-oceania-2026
- https://sg.linkedin.com/in/greg-russell-29257a4
- https://dmscdn.successfactors.com/338302d47d38afc6004a50dd5bd61a46fe01603fcf52d66c8b416467599a46ff/static_content/241cd42d4aa54e089b8c/GIP2026_Job_Openings_Graduate_Internship_Track_20260220.pdf
- https://blog.barrack.ai/cyberstrikeai-fortigate-breach/
- https://onebench.com/archive
- https://novadata.io/resources/news
- https://gigabit.agency/llms-full.txt
- https://telefonicatech.com/en/blog/author/telefonicatech
- https://sg.linkedin.com/in/benjamin-lim-%E6%9E%97%E6%98%80%E8%81%AA-4784a1b8
- https://help.aliyun.com/en/agentcore/api-agentcore-2026-08-04-listagentimchannels
- https://docs.agentscope.io/en/versions/2.0.9/deploy/channel/overview
- https://github.com/tinyhumansai/openhuman/issues/2048
- https://ragflow.io/docs/chat_channels_overview
- https://www.jetservices.com.cn/blogs/feishu-vs-dingtalk-vs-wecom-best-collaboration-tools-in-china/
- https://open-claw.me/channels/feishu
- https://docs.deeptutor.info/partners/feishu/
- https://www.alibabacloud.com/help/en/agentcore/integrate-the-agent-into-the-im-channel.md
- https://help.aliyun.com/en/agentteams/agentteams-has-been-migrated-to-agentcore
- https://www.alibabacloud.com/blog/agentteams-and-claude-tag-both-enter-group-chatmode-is-it-a-new-paradigm-or-a-new-narrative_603358
- https://www.facebook.com/alibabacloud/posts/struggling-with-agent-chaos-%EF%B8%8F-alibaba-clouds-new-agent-infra-solves-5-key-pain-p/1435761375262617/
- https://www.nexusai-tech.com/ai-insights/alibaba-agentcore-unifies-multi-model-agents-mcp-governance
- https://aws.amazon.com/blogs/machine-learning/build-a-multi-account-ai-agent-with-agentcore-gateway-and-mcp/
- https://help.aliyun.com/zh/agentrun/what-is-agentrun
- https://cloud.google.com/run/pricing
- https://www.alibabacloud.com/help/en/sae/product-overview/billing-new
- https://help.aliyun.com/en/functioncompute/pay-as-you-go-billing-methods
- https://azure.microsoft.com/en-us/pricing
- https://www.agent37.com/pricing
- https://accuweb.cloud/pay-as-you-go-cloud-hosting
- https://intl.cloud.tencent.com/document/product/436/32534
- https://docs.nebius.com/signup-billing/billing-models/payg
- https://docs.cloudblue.com/cbc/services/ci/18.0/content/Provider%27s-Guide-18.0/Pay-As-You-Go-Billing-Model.htm
- https://cloudchipr.com/blog/cloud-run-pricing
- https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/bedrock-agentcore-limits.html
- https://www.alibabacloud.com/help/en/agentrun/api-agentrun-2025-09-10-updateagentruntimeinput.md
- https://docs.browserbase.com/optimizations/concurrency/overview
- https://learn.microsoft.com/en-us/fabric/data-engineering/high-concurrency-overview
- https://help.aliyun.com/en/agentrun/api-agentrun-2025-09-10-struct-agentruntime.md
- https://builder.aws.com/content/3GiIWaXD2tKjqefFedsyvYvWB4b/agentcore-runtime-scale-ai-agents-and-watch-sessions
- https://docs.cloud.google.com/run/docs/about-concurrency
- https://repost.aws/questions/QUhfwmq7eYSsyio5zbJKLCYw/why-is-the-idle-session-timeout-in-amazon-bedrock-only-1-hour
- https://justb.dk/blog/2025/03/optimizing-spark-with-high-concurrency-mode/
- https://docs.livekit.io/deploy/admin/quotas-and-limits/
- https://www.ptsconsulting.com.hk/blog/ai-tools-compared-hong-kong-china
- https://help.aliyun.com/en/agentrun/open-service-area
- https://www.francisokafor.com/field-notes/china-available-llm-apis-from-mainland
- https://www.scmp.com/tech/tech-trends/article/3371814/asia-pacific-ai-agent-market-surge-14-fold-us112-billion-2030-omdia-says
- https://www.tencentcloud.com/techpedia/144926
- https://www.rapiddata.com/solutions/ai-agents/enterprise-ai-agents-hong-kong-china-sar.html
- https://www.facebook.com/iux24official/posts/chinese-ai-powerhouse-moonshot-is-accelerating-its-global-footprint-with-a-strat/122132393973147019/
- https://intl.cloud.baidu.com/en/article/9149997
- https://www.youtube.com/watch?v=SRHjKdMsxY0
- https://help.aliyun.com/en/agentcore/operating-guide/
- https://awesome-pi.site/extensions/
- https://www.tryplox.com/news
- https://free.theresanaiforthat.com/news/?topic=consumer-preferences
- https://www.udemy.com/course/the-complete-agentic-ai-engineering-course/?srsltid=AYCX9vKPY099ivd3E-MokElXO7OLF_fFzWlxbIfXpGvB5ObUA6oYSSxd
- https://www.facebook.com/thaideveloper/posts/7-%E0%B8%8A%E0%B8%B1%E0%B9%89%E0%B8%99%E0%B8%AA%E0%B9%88%E0%B8%A7%E0%B8%99%E0%B8%9B%E0%B8%A3%E0%B8%B0%E0%B8%81%E0%B8%AD%E0%B8%9A%E0%B8%82%E0%B8%AD%E0%B8%87%E0%B8%A3%E0%B8%B0%E0%B8%9A%E0%B8%9A-ai-agent1-interface-layer-%E0%B8%8A%E0%B8%B1%E0%B9%89%E0%B8%99%E0%B8%81%E0%B8%B2%E0%B8%A3%E0%B8%95%E0%B8%B4%E0%B8%94%E0%B8%95%E0%B9%88%E0%B8%AD%E0%B8%9C%E0%B8%B9%E0%B9%89%E0%B9%83%E0%B8%8A%E0%B9%89-%E0%B8%A3%E0%B8%B1%E0%B8%9A%E0%B8%82%E0%B9%89%E0%B8%AD%E0%B8%A1%E0%B8%B9%E0%B8%A5%E0%B8%88/1313255600594830/
- https://mirrors.aliyun.com/pypi/simple/
- https://www.youtube.com/watch?v=ZGElhJmN_8o
- https://temporal.io/blog/amazon-bedrock-agentcore-with-temporal-serverless-workers
- https://tutorialsdojo.com/what-is-amazon-bedrock-agentcore/
- https://joudwawad.medium.com/aws-bedrock-agentcore-deep-dive-6822e4071774
- https://www.youtube.com/watch?v=Gcje6pRGr1g
- https://www.youtube.com/watch?v=N7FGbBq1mI4&vl=en
- https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/what-is-bedrock-agentcore.html
- https://omidsaffari.com/blog/bedrock-agentcore
- https://www.pump.co/blog/amazon-bedrock-agentcore/
- https://www.alibabacloud.com/en/global-locations?_p_lc=1
- https://www.alibabacloud.com/help/en/cloud-migration-guide-for-beginners/latest/regions-and-zones
- https://www.alibabacloud.com/help/en/eci/product-overview/regions-and-zones
- https://stackoverflow.com/questions/52562959/where-does-ali-cloud-keep-a-full-list-of-availability-zones
- https://www.alibabacloud.com/help/en/ims/service-region
- https://www.amazonaws.cn/en/new/2026/amazon-bedrock-agentcore-is-available/
- https://help.aliyun.com/en/ecs/user-guide/regions-and-zones
- https://interconnected.blog/data-center-coverage-aws-alibaba-azure-gcp/
- https://www.cloudinfrastructuremap.com/
- https://camelai.com/blog/camelrun-vs-aws-bedrock-agentcore
- https://hidekazu-konishi.com/entry/amazon_bedrock_agentcore_beginners_guide.html
- https://www.cipherprojects.com/blog/posts/amazon-bedrock-agentcore-pricing-2026/
- https://www.youtube.com/watch?v=7_Z0wgr-mjI
- https://www.doit.com/blog/blog-bedrock-agentcore-per-tenant-cost-attribution
- https://www.alibabacloud.com/help/en/serverless-workflow/latest/api-fnf-2019-03-15-describeregions
- https://en.wikipedia.org/wiki/Alibaba_Cloud
- https://resource.alibabacloud.com/webinar/detail.html?id=1467
- https://www.alibabacloud.com/help/en/serverless-workflow/latest/troubleshooting
- https://www.sitepoint.com/community/t/alibaba-cloud-architecture-devops-tips/307989
- https://docs.aws.amazon.com/step-functions/latest/dg/tutorial-human-approval.html
- https://serverlessland.com/workflows/parallel-human-approval
- https://darryl-ruggles.cloud/aws-lambda-durable-functions/
- https://annpastushko.substack.com/p/step-functions-for-human-in-the-loop
- https://learn.microsoft.com/en-us/power-automate/parallel-modern-approvals
- https://oneuptime.com/blog/post/2026-02-12-build-human-approval-workflows-with-step-functions/view
- https://docs.temporal.io/design-patterns/approval
- https://builder.aws.com/content/3K1oy2mbl4Kcp1GvxBVkSShuNlP/orchestrating-workflows-with-step-functions
- https://docs.oracle.com/en/cloud/paas/application-integration/human-loop/model-parallel-approvals.html?embed=1
- https://docs.cloud.google.com/workflows/quotas
- https://docs.aws.amazon.com/step-functions/latest/dg/service-quotas.html
- https://stackoverflow.com/questions/69539297/google-cloud-workflows-concurrent-executions-limit
- https://community.n8n.io/t/execution-quota-management-set-limits-per-project-and-per-workflow/261598?tl=en
- https://www.alibabacloud.com/help/en/serverless-workflow/latest/limits
- https://learn.microsoft.com/en-us/power-automate/limits-and-config
- https://awsfundamentals.com/limits/airflow-serverless
- https://wenjinfeng.github.io/data/ICWS21-A%20Measurement%20Study%20on%20Serverless%20Workflow%20Services.pdf
- https://arxiv.org/html/2505.21899
- https://community.atlassian.com/forums/discussion/2595166/how-many-execution-quota-is-used-by-this-automation-need-a-clarification-about-monthly-usage
- https://www.alibabacloud.com/help/en/serverless-workflow/latest/billing-billing
- https://www.alibabacloud.com/help/en/serverless-workflow/latest/serverless-workflow-billing
- https://www.alibabacloud.com/help/en/functioncompute/billing-overview-of-fc
- https://help.aliyun.com/en/user-center/product-overview/quickly-understand-the-billing-modes-of-alibaba-cloud-products
- https://www.alibabacloud.com/help/en/ecs/pay-as-you-go-1
- https://www.alibabacloud.com/product/function-compute/pricing
- https://www.elastic.co/docs/reference/cloud/cloud-hosted/regions
- https://docs.confluent.io/cloud/current/get-started/regions.html
- https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.RegionsAndAvailabilityZones.html
- https://www.devopsschool.com/blog/list-of-aws-regions-and-availability-zones/
- https://www.aws-services.info/serverlessrepo.html
- https://awslabs.github.io/sensitive-data-protection-on-aws/en/plan-deployment/regions/
- https://stelligent.com/2014/05/02/list-all-the-availability-zones/
- https://cloud.google.com/about/locations
- https://github.com/serverless/serverless/issues/13035
- https://docs.temporal.io/evaluate/cloud/regions
- https://help.aliyun.com/en/document_detail/2590630.html
- https://www.alibabacloud.com/help/en/serverless-workflow/latest/task-steps
- https://www.alibabacloud.com/help/en/serverless-workflow/latest/parallel-steps
- https://stackoverflow.com/questions/57308375/what-is-the-function-time-out-limit-at-alibaba-function-compute
- https://www.alibabacloud.com/help/en/serverless-workflow/latest/faq-faq
- https://help.aliyun.com/en/document_detail/2504569.html
- https://www.alibabacloud.com/help/en/serverless-workflow/latest/perform-callbacks-on-asynchronous-tasks
- https://www.alibabacloud.com/help/en/serverless-workflow/latest/task-task
- https://www.alibabacloud.com/help/en/serverless-workflow/latest/wait-wait
- https://help.aliyun.com/en/document_detail/2642848.html
- https://www.alibabacloud.com/help/doc-detail/2840077.html
- https://help.aliyun.com/en/document_detail/2400200.html
- https://www.alibabacloud.com/help/en/serverless-workflow/latest/mns-queues-workflow
- https://www.alibabacloud.com/blog/human-in-the-loop-ai-systems-balancing-automation-and-oversight-in-enterprise-workflows_603587
- https://www.alibabacloud.com/en/press-room/alibaba-cloud-expands-global-infrastructure-and-ai?_p_lc=1
- https://appinchina.co/a-guide-to-alibaba-cloud-in-china/
- https://www.alibabacloud.com/blog/598922
- https://baike.baidu.com/en/item/Alibaba%20Cloud%20Computing%20Co.%20Ltd./998106
- https://www.alibabacloud.com/en/press-room/alibaba-cloud-expands-european-footprint-with-two?_p_lc=1
- https://www.grax.com/blog/salesforce-alibaba-cloud/
- https://www.facebook.com/alibabacloud/videos/alibaba-cloud-partner-connect-2026-turning-complex-ai-into-customer-centric-busi/3146209925587414/
- https://help.aliyun.com/en/account/aliyun-vs-alibaba-cloud
- https://www.alibabacloud.com/en/knowledge/what-is-serverless?_p_lc=1
- https://www.alibabacloud.com/blog/%EF%BB%BFbuilding-serverless-applications-with-alibaba-cloud-function-compute_602684
- https://www.alibabacloud.com/blog/embracing-the-serverless-future-alibaba-cloud-serverless-computing_602570
- https://www.youtube.com/watch?v=KmAvN42-E1k
- https://www.quora.com/What-is-Alibaba-Cloud-Function-Compute-2
- https://www.alibabacloud.com/blog/alibaba-cloud-serverless-%7C-function-compute-%C2%B7-debugging-and-deploying_600088
- https://www.alibabacloud.com/en/product/severless-application-engine?_p_lc=1
- https://www.alibabacloud.com/blog/alibaba-cloud-unveils-serverless-solution-to-harness-gen-ai-capabilities-for-enterprises_600815
- https://www.alibabacloud.com/help/en/eventbridge/product-overview/supported-regions
- https://www.alibabacloud.com/en/product/eventbridge?_p_lc=1
- https://www.alibabacloud.com/help/doc-detail/176667.htm
- https://help.aliyun.com/en/eventbridge/regions-and-endpoints
- https://www.alibabacloud.com/blog/embrace-the-future-of-event-driven-architectures-with-alibaba-clouds-eventbridge_601199
- https://www.alibabacloud.com/help/doc-detail/2384626.html
- https://aws.amazon.com/blogs/compute/expanding-cross-region-event-routing-with-amazon-eventbridge/
- https://www.alibabacloud.com/help/en/eventbridge/developer-reference/api-eventbridge-2020-04-01-createeventsource
- https://alibaba-cloud.medium.com/alibaba-cloud-releases-eventbridge-to-support-cloud-native-architecture-2b304f2bcede
- https://www.facebook.com/fb-answers/alibaba-cloud-singapore-availability-zones-2021/?locale=he_IL
- https://www.alibabacloud.com/help/en/mns/product-overview/regions-and-endpoints
- https://www.alibabacloud.com/help/en/mns/product-overview/what-is-mns
- https://www.alibabacloud.com/help/en/mns/product-overview/billing-overview
- https://www.alibabacloud.com/help/doc-detail/179380.html
- https://www.alibabacloud.com/en/product/message-service?_p_lc=1
- https://help.aliyun.com/en/mns/user-guide/message-channel-between-cloud-products/
- https://www.alibabacloud.com/help/en/vod/user-guide/smq-callbacks
- https://www.alibabacloud.com/help/en/mns/developer-reference/queue-queue
- https://www.alibabacloud.com/help/en/mns/developer-reference/api-mns-open-2022-01-19-endpoint
- https://www.alibabacloud.com/help/es/mns/product-overview/regions-and-endpoints
- https://developer.aliyun.com/article/1643032
- https://www.bsigroup.com/en-ID/products-and-services/assessment-and-certification/validation-and-verification/client-directory-certificate/IS%20591687
- https://segmentfault.com/a/1190000045430808
- https://www.cnblogs.com/alisystemsoftware?page=77
- https://ai.jotoai.com/blog/archive/2025032561234
- https://rocketmq-learning.com/learning/rocketmq_learning-gvr7dx_awbbpb_pcbrubpma2wvclbt/
- https://www.bsigroup.com/en-ID/products-and-services/assessment-and-certification/validation-and-verification/client-directory-certificate/FS%20681384
- https://developer.aliyun.com/article/1659807
- https://www.bsigroup.com/en-ID/products-and-services/assessment-and-certification/validation-and-verification/client-directory-certificate/ITMS%20649827
- https://www.cnblogs.com/alisystemsoftware/p/archive/2025/04
- https://help.aliyun.com/en/cap/use-cases/two-ways-to-quickly-deploy-qwq-32b-reasoning-model
- https://lobehub.com/fr/mcp/aliyun-alibaba-cloud-ops-mcp-server
- https://help.aliyun.com/en/functioncompute/use-function-compute-to-realize-ai-dialogue
- https://www.marketsandmarkets.com/Market-Reports/artificial-intelligence-ai-as-a-service-market-121842268.html
- https://www.linkedin.com/posts/%E7%9B%9B%E7%A5%A5-%E5%BB%96-a3883412b_this-is-our-newly-developed-product-the-activity-7366647523446308865-pHnD
- https://www.intuz.com/blog/use-cases-and-advantages-of-aiot-merging-ai-and-iot-technologies/
- https://ca.linkedin.com/in/inaam-rana-22394a9
- https://lobehub.com/ru/skills/buhaiqing-aliyun-skills-alicloud-fc-ops
- https://www.alibaba.com/product-detail/Waveshare-Tuya-T5-E1-1-75inch_1601949687816.html
- https://www.deloitte.com/us/en/insights/topics/technology-management/tech-trends/2019/driving-ai-potential-organizations.html
- https://www.alibabacloud.com/help/en/functioncompute/instance-types-and-specifications
- https://www.alibabacloud.com/help/en/functioncompute/release-notes-2025
- https://www.alibabacloud.com/blog/scaling-genai-globally-with-alibaba-cloud-platform-for-ai-pai-%26-eas_603465
- https://dataoorts.com/top-5-plus-gpu-cloud-providers-in-china/
- https://www.alibabacloud.com/help/en/functioncompute/regions
- https://www.linkedin.com/posts/alibaba-cloud-computing-company_cloudwalker-cloudwalker-alibabacloud-activity-7388886745813061632-LjeR
- https://help.aliyun.com/en/functioncompute/function-fc-1/
- https://oecd.ai/en/ai-compute
- https://www.alibabacloud.com/help/en/ecs/user-guide/gpu-accelerated-compute-optimized-and-vgpu-accelerated-instance-families-1
- https://www.alibabacloud.com/help/en/functioncompute/fc-asynchronous-invocation
- https://www.alibabacloud.com/help/tr/functioncompute/fc-asynchronous-invocation
- https://www.alibabacloud.com/help/en/functioncompute/terms-of-fc
- https://www.alibabacloud.com/help/en/functioncompute/fc/user-guide/offline-asynchronous-task-scenario
- https://www.alibabacloud.com/blog/detailed-asynchronous-tasks-task-status-and-lifecycle-management_599261
- https://www.alibabacloud.com/blog/how-does-the-asynchronous-task-processing-system-solve-the-problems-of-time-consuming-and-high-concurrency_599382
- https://help.aliyun.com/en/model-studio/asynchronous-call-api-reference
- https://www.reddit.com/r/googlecloud/comments/mpc8qq/what_are_my_options_for_handling_longrunning_tasks/
- https://help.aliyun.com/en/cap/user-guide/mcp-service-introduction/
- https://mcp.pub/servers/alibaba-cloud-function-compute/
- https://www.youtube.com/watch?v=ShjwpwHBoGw
- https://www.alibabacloud.com/help/en/functioncompute/trigger-overview
- https://www.alibabacloud.com/help/en/functioncompute/fc/configure-an-eventbridge-based-oss-trigger
- https://www.alibabacloud.com/blog/event-driven-architecture-on-alibaba-cloud-with-eventbridge-and-function-compute_603113
- https://registry.terraform.io/providers/aliyun/alicloud/latest/docs/resources/fc_function
- https://www.alibabacloud.com/blog/598841
- https://help.aliyun.com/en/functioncompute/formats-of-event-for-different-triggers-1
- https://www.alibabacloud.com/help/en/functioncompute/api-fc-open-2021-04-06-struct-eventsourceconfig
- https://www.alibabacloud.com/help/en/functioncompute/limits-of-usage
- https://www.alibabacloud.com/help/en/functioncompute/overview-of-configuring-the-maximum-number-of-on-demand-instances
- https://www.alibabacloud.com/help/en/model-studio/rate-limit
- https://www.alibabacloud.com/help/en/ga/product-overview/quotas-and-limits
- https://middleware.io/blog/aws-lambda-limits/
- https://help.aliyun.com/en/cs/product-overview/restrictions-on-use
- https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html
- https://repost.aws/questions/QUg8sHdF0XTKmRp94Iitb-Jw/increasing-lambda-function-memory-limits-on-new-accounts
- https://www.alibabacloud.com/help/en/pai/use-comfyui-to-deploy-an-ai-video-generation-model-service/
- https://help.aliyun.com/en/functioncompute/best-practices-for-model-warm-up
- https://www.alibabacloud.com/blog/launch-a-stable-diffusion-api-environment-with-function-compute_601125
- https://comfy.org/cloud/
- https://www.alibabacloud.com/blog/generative-ai-with-function-compute_601032
- https://www.alibabacloud.com/blog/601370
- https://www.youtube.com/watch?v=E0ZxS-pR8uo
- https://www.alibabacloud.com/
- https://www.alibabacloud.com/help/en
- https://www.alibabacloud.com/blog/how-to-manage-ai-costs-when-developing-a-cloud-application-on-alibaba-cloud_603227
- https://www.alibabacloud.com/help/en/pai/create-a-code-based-application
- https://next.api.alibabacloud.com/product/APIG
- https://www.alibabacloud.com/help/en/model-studio/rag-knowledge-base
- https://help.aliyun.com/en/cap/getting-started/quickly-deploy-web-projects-to-function-compute-through-templates
- https://www.alibabacloud.com/help/en/pai/
- https://www.youtube.com/watch?v=QmB2qxcQx88&vl=en-US
- https://help.aliyun.com/en/cap/llms.txt
- https://help.aliyun.com/en/functioncompute/function-compute-based-deployment-of-gpt-sovits-speech-generation-model-for-ai-sound-cloning
- https://www.layer3labs.io/guides
- https://glossary.kaitrust.ai/
- https://help.aliyun.com/en/cap/model-service-faq
- https://help.aliyun.com/en/functioncompute/fc/return-results-forcibly-downloaded-when-i-access-an-http-function-through-a-browser
- https://help.aliyun.com/en/functioncompute/fc/how-to-reference-dependencies-in-a-layer-in-a-custom-runtime
- https://www.alibabacloud.com/help/en/pai/deploy-dify
- https://www.alibabacloud.com/help/en/pai/overview-2
- https://www.alibabacloud.com/help/en/pai/deploy-an-llm/
- https://help.aliyun.com/en/pai/use-cases/call-the-comfyui-service-deployed-by-eas-in-dify
- https://www.alibabacloud.com/help/en/pai/model-service-deployment-by-using-the-pai-console/
- https://k-farruh.medium.com/streamlined-deployment-and-integration-of-large-language-models-with-pai-eas-bb8da7ec39bd
- https://www.alibabacloud.com/help/en/pai/deploy-a-model-service-by-using-a-custom-image
- https://www.alibabacloud.com/blog/600520
- https://www.alibabacloud.com/help/en/model-studio/regions
- https://www.alibabacloud.com/help/en/oss/user-guide/regions-and-endpoints
- https://www.alibabacloud.com/help/en/model-studio/singapore-regional-access-information
- https://www.alibabacloud.com/help/en/cms/cloudmonitor-2-0/developer-reference/api-cms-2024-03-30-endpoint
- https://www.alibabacloud.com/help/en/vms/api-dyvmsapi-intl-2021-10-15-endpoint
- https://www.alibabacloud.com/help/en/cloudsso/developer-reference/api-cloudsso-2021-05-15-endpoint
- https://www.alibabacloud.com/help/en/cloud-backup/product-overview/supported-regions
- https://www.alibabacloud.com/blog/what-are-the-region-code-and-availability-zone-az-code-of-alibaba-cloud-apsaradb_600164
- https://docs.temporal.io/cloud/references/regions/awsregions
- https://www.alibabacloud.com/help/en/agentloop/product-overview/what-is-agentloop
- https://www.facebook.com/alibabacloud/posts/stuck-in-manual-agent-evals-alibaba-cloud-agentloop-builds-a-self-evolution-flyw/1469778651860889/
- https://www.alibabacloud.com/blog/what-is-the-newly-released-agentloop-by-alibaba-cloud_603378
- https://www.alibabacloud.com/help/en/agentloop/agentloop-quickstart-whole-process-practice
- https://help.aliyun.com/en/agentloop/product-overview/what-is-agentloop
- https://www.linkedin.com/posts/alibabacloudglobal_ai-agentloop-llmops-activity-7478267913800613888-jPKO
- https://www.alibabacloud.com/help/en/agentloop/user-guide/agent-space
- https://www.alibabacloud.com/help/en/cms/cloudmonitor-2-0/memory-module-overview
- https://www.alibabacloud.com/blog/603239
- https://www.alibabacloud.com/help/en/model-studio/application-introduction
- https://www.alibabacloud.com/help/en/model-studio/single-agent-application
- https://www.alibabacloud.com/help/en/model-studio/application-data/
- https://www.alibabacloud.com/help/en/model-studio/build-knowledge-base-qa-assistant-without-coding
- https://www.alibabacloud.com/help/en/model-studio/workflow-application
- https://www.alibabacloud.com/blog/one-key-one-cli-%E2%80%94-manage-your-alibaba-cloud-model-studio-token-plan-from-terminal-or-ai-agent_603453
- https://www.developersdigest.tech/models/fine-tuning/alibaba-model-studio
- https://www.alibabacloud.com/blog/setting-up-an-ai-chatbot-for-marketing-automation-with-alibaba-cloud-model-studio_603115
- https://x.com/alibaba_cloud/status/2113160099443220872
- https://www.alibabacloud.com/en/product/api-gateway?_p_lc=1
- https://www.alibabacloud.com/help/en/api-gateway/product-overview/
- https://www.alibabacloud.com/blog/the-ai-gateway-has-become-a-symbol-of-ai-evolution-this-year_602783
- https://help.aliyun.com/en/api-gateway/ai-gateway/
- https://www.alibabacloud.com/blog/the-essential-course-that-ai-agent-engineers-cannot-avoid-api-gateway-vs-api-management_602254
- https://github.com/higress-group/higress
- https://www.alibabacloud.com/blog/602608
- https://traefik.io/glossary/api-gateway-vs-ai-gateway-vs-mcp-gateway
- https://vercel.com/ai-gateway/models/labs/alibaba
- https://www.alibabacloud.com/help/en/model-studio/what-is-model-studio
- https://help.aliyun.com/en/model-studio/what-is-model-studio
- https://www.alibabacloud.com/blog/introducing-alibaba-cloud-model-studio_601390
- https://www.alibabacloud.com/blog/603615
- https://www.youtube.com/watch?v=VKJnpO7MtDQ
- https://bailian.console.alibabacloud.com/
- https://www.alibabacloud.com/blog/601386
- https://www.youtube.com/watch?v=gfqytnlfx2s
- https://www.alibabacloud.com/help/en/model-studio/rag-knowledge-base-api-guide
- https://www.alibabacloud.com/blog/ai-native-applications-based-on-event-driven-architectures_601838
- https://www.alibabacloud.com/blog/603213
- https://marketplace.alibabacloud.com/doc/userguide/Polaris_AI_Platform-sgcmfw00036433.html
- https://www.alibabacloud.com/blog/stop-building-ai-demos--start-shipping-enterprise-ai--the-sa-%26-fde-playbook-for-qwen_603651
- https://www.alibabacloud.com/help/en/agentrun/api-agentrun-2025-09-10-capconfig
- https://www.alibabacloud.com/blog/how-to-prioritize-ai-use-cases-before-2027-six-types-and-one-2x2_603616
- https://www.alibabacloud.com/blog/602870
- https://www.alibabacloud.com/blog/alibaba-cloud-recognized-as-a-leader-in-two-gartner%C2%AE-reports_602632
- https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0
- https://www.alibabacloud.com/help/en/functioncompute/fc/product-overview/release-notes-2024
- https://docs.databricks.com/gcp/en/resources/feature-region-support
- https://docs.cloud.google.com/compute/docs/regions-zones/gpu-regions-zones
- https://www.alibabacloud.com/blog/next-generation-software-and-hardware-architecture-collaborative-optimization-revealed_598847
- https://www.alibabacloud.com/help/doc-detail/2848764.html
- https://www.economyinsights.com/p/cloud-providers-with-the-most-active-regions-worldwide
- https://www.alibabacloud.com/blog/beyond-demo-grade-architecture-building-a-highly-available-production-foundation-for-dify-with-sae-%C3%97-sls_603213
- https://help.aliyun.com/en/pai/deploy-exclusive-qwenpaw-using-pai-eas-for-5-minutes
- https://dify.ai/
- https://dify.ai/blog/open-source-llmops-platform-define-your-ai-native-apps
- https://help.aliyun.com/en/cs/user-guide/build-customized-ai-q-a-assistant-based-on-dify-in-acs
- https://www.alibabacloud.com/help/en/ack/product-overview/limits
- https://www.alibabacloud.com/help/en/ack/product-overview/historical-release-notes-2025
- https://www.youtube.com/watch?v=GQk0IBQjQ5E
- https://docs.aws.amazon.com/eventbridge/latest/userguide/feature-availability.html
- https://www.nops.io/blog/understanding-aws-eventbridge-basics-benefits-and-use-cases/
- https://www.dash0.com/knowledge/amazon-eventbridge
- https://repost.aws/questions/QU7LIiJG1ZRZ-bftkRwVQFQQ/multi-region-infrastructure-for-cloudfront-and-eventbridge
- https://sourceforge.net/software/compare/Alibaba-Cloud-EventBridge-vs-Amazon-EventBridge/
- https://www.alibabacloud.com/en/product/mq?_p_lc=1
- https://www.alibabacloud.com/help/en/apsaramq-for-rocketmq/cloud-message-queue-rocketmq-5-x-series/llms.txt
- https://www.alibabacloud.com/help/en/apsaramq-for-rocketmq/cloud-message-queue-rocketmq-4-x-series/product-overview/supported-regions
- https://help.aliyun.com/en/apsaramq-for-rocketmq/cloud-message-queue-rocketmq-4-x-series/user-guide/instructions-for-use-1
- https://www.alibabacloud.com/blog/601263
- https://rocketmq.apache.org/docs/
- https://www.alibabacloud.com/help/en/apsaramq-for-rocketmq/
- https://fluffystack.dev/services/alibaba-rocketmq/
- https://www.alibabacloud.com/en/notice/apsaramq_for_rocketmq_november_2024_upgrade_notice_3e2
- https://github.com/alibaba/spring-cloud-alibaba/wiki/RocketMQ-en
- https://github.com/agentscope-ai/agentscope-runtime
- https://runtime.agentscope.io/en/sandbox/training_sandbox.html
- https://tekai.dev/catalog/agentscope-runtime
- https://runtime.agentscope.io/
- https://github.com/agentscope-ai/agentscope/discussions/3259
- https://www.alibabacloud.com/help/en/model-studio/qwen-api-via-dashscope
- https://help.aliyun.com/en/model-studio/spring-ai-alibaba-integrate-llm-application
- https://central.sonatype.com/artifact/com.alibaba.cloud.ai/spring-ai-alibaba-starter-dashscope
- https://mvnrepository.com/artifact/com.alibaba.cloud.ai/spring-ai-alibaba-dashscope
- https://www.alibabacloud.com/blog/601911
- https://help.aliyun.com/en/model-studio/spring-ai-alibaba-integrate-knowledge-base
- https://help.aliyun.com/en/document_detail/40654.html
- https://www.alibabacloud.com/help/en/cloud-firewall/cloudfirewall/product-overview/supported-regions
- https://help.aliyun.com/en/csg/product-overview/supported-regions
- https://help.aliyun.com/en/emr/emr-on-ecs/user-guide/supported-regions
- https://www.alibabacloud.com/help/en/security-center/user-guide/enabling-and-disabling-agentic-agentless-detection
- https://help.aliyun.com/en/arms/prometheus-monitoring/product-overview/managed-service-for-prometheus-supported-regions
- https://www.alibabacloud.com/help/en/maxcompute/endpoints
- https://rpabotsworld.com/alibaba-cloud-agent-native-cloud-agentrun-agentloop-agentteams-guide/
- https://www.pixelmatters.com/insights/ai-agent-development-platforms
- https://www.facebook.com/groups/aiagentcircle/posts/671809445957010/
- https://github.com/uhub/awesome-agent
- https://therouter.ai/news/
- https://htek.dev/articles/all-agent-harnesses-live-comparison
- https://agentapihub.com/
- https://aisafetypriorities.org/
- https://techjacksolutions.com/ai-tools/
- https://mirrors.aliyun.com/pypi/simple/?spm=a2c6h.13046898.publish-article.23.ee036ffaRjpFiW
- https://aws.amazon.com/blogs/publicsector/human-in-the-loop-claims-processing-with-amazon-bedrock-agentcore/
- https://builder.aws.com/content/3C6RKnGhT7pBovw7sj1urk5ZeuK/building-a-production-grade-multi-agent-platform-with-zero-trust-governance-on-amazon-bedrock-agentcore
- https://medium.com/aws-tip/getting-started-with-amazon-bedrock-agentcore-knowledge-bases-a612616860d3
- https://www.alibabacloud.com/blog/from-models-to-agents-how-alibaba-cloud-qwen-is-reshaping-workplace-collaboration_603518
- https://xebia.com/blog/govern-and-discover-ai-agents-and-tools-with-amazon-bedrock-agentcore-registry/
- https://www.facebook.com/alibabacloud/posts/the-distance-between-a-working-prototype-and-an-agent-you-can-run-in-production-/1575339537971466/
- https://www.pulpmatrix.com/radar
- https://www.alibabacloud.com/help/en/agentrun/topic-funclaw.md
- https://www.alibabacloud.com/help/en/tablestore/memory-storage-service-sub-product-test/product-billing
- https://www.alibabacloud.com/help/en/ros/developer-reference/list-of-resource-types-by-service
- https://www.alibabacloud.com/help/doc-detail/3049292.html
- https://www.alibabacloud.com/blog/entering-the-ai-native-era-how-das-leverages-llms-to-revolutionize-database-autonomy_602960
- https://www.alibabacloud.com/help/en/agentrun/memory-storage-overview.md
- https://www.alibabacloud.com/help/en/agentrun/api-agentrun-2025-09-10-activatetemplatemcp.md
- https://sandbox0.ai/alternatives/superserve
- https://www.alibabacloud.com/blog/alibaba-cloud-elasticsearch-an-overview-of-data-search-and-visualization_599984
- https://www.alibabacloud.com/help/id/llms.txt?spm=a2c6h.13046898.publish-article.27.da656ffaY1fHxV&file=llms.txt
- https://www.alibabacloud.com/help/en/agentrun/api-agentrun-2025-09-10-struct-createagentruntimeinput
- https://www.alibabacloud.com/help/en/agentrun/api-agentrun-2025-09-10-struct-agentruntime
- https://www.alibabacloud.com/help/en/functioncompute/create-agent-by-code-high-code
- https://github.com/agentscope-ai/agentscope-runtime/blob/main/cookbook/en/advanced_deployment.md?plain=true
- https://help.aliyun.com/en/agentcore/api-agentcore-2026-08-04-createcustomagent
- https://www.alibabacloud.com/help/en/agentcore/api-agentcore-2026-08-04-updatecustomagent
- https://docs.daocloud.io/native/commerce/
- https://www.alibabacloud.com/blog/open-container-initiative-oci-specifications_594397
- https://alibaba-cloud.medium.com/up-and-running-with-alibaba-cloud-container-registry-bd46ac2bd140
- https://www.alibabacloud.com/help/en/api-gateway/ai-gateway/user-guide/creating-services
- https://www.alibabacloud.com/help/en/model-studio/qwen-api-via-openai-chat-completions
- https://ai-sdk.dev/providers/ai-sdk-providers/alibaba
- https://community.cloudflare.com/t/ai-gateway-ai-gateway-adds-openai-compatible-endpoint/897118
- https://www.alibabacloud.com/blog/building-secure-enterprise-ai-apis-with-alibaba-cloud-api-gateway-and-model-studio_603583
- https://help.aliyun.com/en/api-gateway/ai-gateway/user-guide/managing-the-model-api
- https://www.braintrust.dev/articles/best-unified-llm-api-providers-2026
- https://www.digitalapplied.com/blog/alibaba-agent-native-cloud-waic-agentrun-agentloop-2026
- https://www.alibabacloud.com/help/en/agentrun/knowledge-base-integration-guide
- https://www.alibabacloud.com/help/en/cms/cloudmonitor-2-0/what-is-an-agentloop
- https://help.aliyun.com/en/cms/cloudmonitor-2-0/alibaba-cloud-end-to-end-link-tracing-best-practices
- https://www.alibabacloud.com/help/en/agentcore/api-agentcore-2026-08-04-updateexternalagent
- https://www.alibabacloud.com/help/en/agentcore/api-agentcore-2026-08-04-listmcptools
- https://github.com/awslabs/agentcore-samples/issues/168
- https://www.youtube.com/watch?v=RaNDHWixeJI
- https://www.alibabacloud.com/blog/alibaba-cloud-customer-service-agent-thoughts-design-and-practices-from-concept-to-implementation_601555
- https://www.alibabacloud.com/help/en/agentcore/agentcore-management-skill.md
- https://dev.to/hayerhans/what-is-llmstxt-1hgg
- https://www.alibabacloud.com/help/en/agentrun/using-session-state-in-langchain-1.md
- https://www.alibabacloud.com/help/en/agentrun/voucher-management-1
- https://www.alibabacloud.com/help/en/agentrun/installing-the-arms-probe-for-python-agent-applications-1.md
- https://github.com/google/adk-docs/issues/726
- https://help.aliyun.com/en/tablestore/product-overview/release-notes
- https://help.aliyun.com/en/rds/apsaradb-rds-for-sql-server/upgrade-and-commercial-release-of-the-backup-download-feature
- https://www.alibabacloud.com/help/en/dataworks/user-guide/differences-among-dataworks-editions
- https://help.aliyun.com/en/nas/product-overview/agenticfs-overview
- https://www.alibabacloud.com/help/en/slb/classic-load-balancer/product-overview/pay-as-you-go
- https://help.aliyun.com/en/vpn/sub-product-ssl-vpn/user-guide/configure-ipsec-vpn-servers/
- https://www.alibabacloud.com/help/en/agentcore/api-agentcore-2026-08-04-createcustomagent
- https://www.alibabacloud.com/help/en/agentcore/api-agentcore-2026-08-04-getcustomagent.md
- https://aws.amazon.com/blogs/aws/runtime-instances-persistent-compute-for-production-ai-agents-on-amazon-bedrock-agentcore/
- https://help.aliyun.com/en/agentcore/api-agentcore-2026-08-04-updatecustomagent
- https://dev.to/aws-heroes/amazon-bedrock-agentcore-runtime-part-1-introduction-e5i
- https://www.orchestra-labs.ai/blog/aws-bedrock-agentcore-runtime
- https://www.alibabacloud.com/help/doc-detail/3049290.html
- https://www.alibabacloud.com/help/en/agentrun/quickly-create-agent-no-code
- https://www.alibabacloud.com/help/en/agentrun/llms.txt
- https://help.aliyun.com/en/agentrun/call-flow-agent-using-ai-gateway-1
- https://www.alibabacloud.com/help/en/agentrun/agent-integrated-enterprise-micro
- https://www.alibabacloud.com/blog/personal-agent-in-focus-dissecting-the-technical-challenges-of-247-operation_603682
- https://medium.com/jin-system-architect/alibaba-cloud-may-not-be-selling-an-agent-builder-at-all-da8012e939c3
- https://www.alibabacloud.com/help/en/cs/user-guide/create-an-agent-sandbox
- https://help.aliyun.com/en/functioncompute/start-using-of-funmodel/
- https://www.alibabacloud.com/help/en/functioncompute/what-is-function-compute
- https://www.alibabacloud.com/help/en/functioncompute/product-overview-fc/
- https://www.alibabacloud.com/help/en/functioncompute/
- https://medium.com/@wanghq/the-alibaba-cloud-function-compute-programming-model-76b755b8900c
- https://www.alibabacloud.com/blog/limitless-development-with-function-compute_596885
- https://help.aliyun.com/en/functioncompute/release-notes-2025
- https://www.alibabacloud.com/help/en/functioncompute/release-notes-1/
- https://docs.cloud.google.com/run/docs/release-notes
- https://www.usenix.org/conference/atc21/presentation/wang-ao
- https://mcpservers.org/servers/aliyun/alibaba-cloud-ops-mcp-server
- https://docs.databricks.com/aws/en/resources/feature-region-support
- https://learn.microsoft.com/en-us/azure/databricks/resources/feature-region-support
- https://docs.azure.cn/en-us/databricks/resources/feature-region-support
- https://discuss.hashicorp.com/t/create-a-cloud-resource-according-its-availability-of-gpu-resources-in-a-region/70270
- https://www.spheron.network/blog/gpu-cloud-providers-asia-pacific-2026/
- https://aws.amazon.com/about-aws/global-infrastructure/regions_az/
- https://docs.snowflake.com/en/user-guide/intro-regions
- https://learn.microsoft.com/en-us/azure/databricks/resources/supported-regions
- https://www.alibabacloud.com/help/en/agentcore/connect-the-refined-knowledge-base-in-the-agentcore.md
- https://docs.aws.amazon.com/bedrock-agentcore/
- https://www.elastic.co/search-labs/blog/elastic-mcp-server-amazon-bedrock-agentcore-runtime
- https://www.alibabacloud.com/help/en/agentcore/api-agentcore-2026-08-04-searchmemories.md
- https://www.alibabacloud.com/help/en/agentcore/memory-space-overview
- https://help.aliyun.com/en/product/3049178.html/llms.txt
- https://java.agentscope.io/v2/en/docs/harness/filesystem
- https://github.com/demondamon/agenticx
- https://pydantic.dev/docs/ai/core-concepts/agent/
- https://vercel.com/i/ai-agent-frameworks
- https://help.aliyun.com/en/agentrun/what-is-agentrun
- https://codepointer.dev/p/what-actually-runs-when-you-start
- https://wengjialin.com/blog/agent-sandbox/
- https://docs.uselayerup.com/runtime/runtime
- https://aws.amazon.com/blogs/machine-learning/the-future-of-managing-agents-at-scale-aws-agent-registry-now-in-preview/
- https://help.aliyun.com/en/agentcore/agentcore-product-overview
- https://medium.com/@adnanmasood/where-agents-live-part-1-the-key-evaluation-dimensions-f3e45b6aeff1
- https://www.alibabacloud.com/help/en/agentcore/api-agentcore-2026-08-04-createcustomagent.md
- https://arxiv.org/html/2508.03095v3
- https://medium.com/@alessandro.a.pagliaro/hello-agentic-ai-human-in-the-loop-workflows-8e6449513a11
- https://learn.microsoft.com/en-us/agent-framework/agents/tools/tool-approval
- https://www.youtube.com/watch?v=-mbPPno8OWE
- https://openai.github.io/openai-agents-python/human_in_the_loop/
- https://www.facebook.com/n8nio/videos/human-in-the-loop-for-ai-tool-calls-lets-you-require-explicit-approval-before-an/1395120988479480/
- https://docs.temporal.io/ai/cookbook/human-in-the-loop-python
- https://promptessor.com/blog/human-in-the-loop-ai-agents
- https://www.daytona.io/dotfiles/best-ai-agent-frameworks
- https://www.langchain.com/langgraph
- https://developers.cloudflare.com/agents/concepts/agentic-patterns/human-in-the-loop/
- https://support.huaweicloud.com/intl/en-us/bestpractice-cce/cce-bestpractice_HK-EN-pdf.pdf
- https://legalagent.co.jp/en/legal-lab/ai-news/
- https://docs.ovhcloud.com/en/guides/web-cloud/web-hosting/htaccess-how-to-block-a-specific-ip-address-from-accessing-your-website
- https://www.scribd.com/document/1057708262/Distributed-AI-Systems-TRUE-PDF
- https://www.hyperdine.com/
- https://github.com/cuihuan/awesome-ai-gateway
- https://ai.danand.me/
- https://erfi.dev/guides/magic-wan-interop/
- https://www.alibabacloud.com/blog/alibaba-cloud-unveils-new-services-to-solve-generative-ai-development-issues-for-global-customers_600426
- https://help.aliyun.com/en/cap/
- https://www.featuredcustomers.com/software/cloud-computing-platforms
- https://pandaily.com/alibaba-cloud-unveils-new-services-to-solve-generative-ai-development-issues/
- https://www.cncf.io/announcements/2017/11/13/cloud-native-computing-foundation-launches-certified-kubernetes-program-32-conformant-distributions-platforms/
- https://www.kubermatic.com/blog/understanding-kkp-multi-cloud-application/
- https://www.wiseguyreports.com/reports/cloud-application-platform-market
- https://www.facebook.com/itgroupincorporated/posts/were-excited-to-share-that-it-group-inc-is-now-the-first-red-hat-specialized-par/1593513669456508/
- https://www.alibabacloud.com/blog/alibaba-cloud-celebrates-10-years-in-singapore-with-new-data-centers-and-ai-global-competency-center_602337
- https://www.cdomagazine.tech/aiml/alibaba-cloud-launches-global-ai-innovation-hub-in-singapore
- https://sg.linkedin.com/in/run-he-61677b2b
- https://www.alibabacloud.com/en/events/ai-growthday-sg2025?_p_lc=1
- https://help.aliyun.com/en/management-console/console-home-1
- https://www.alibabacloud.com/blog/alibaba-cloud-in-action-technical-insights-into-its-modern-architecture_601770
- https://www.datacenters.com/providers/alibaba-cloud-04967c11-f07a-4b84-befe-fb8e99b38658
- https://www.cliffsnotes.com/study-notes/34263028
- https://www.linkedin.com/pulse/beginners-guide-alibaba-cloud-building-global-scale-aslam-cdfos--zb1wf
- https://www.alibabacloud.com/help/en/account/step-1-register-an-alibaba-cloud-account
- https://help.aliyun.com/en/cap/support/contact-us
- https://www.alibabacloud.com/help/en/sae/llms.txt
- https://www.alibabacloud.com/en/academy/dts/cloudcomputing?_p_lc=1
- https://www.youtube.com/watch?v=YNtguMwYHAo
- https://www.facebook.com/alibabacloud/videos/alibaba-cloud-token-plan-small-teams-dont-need-an-ai-tool-for-every-job-title/27920117524344176/
- https://www.alibabacloud.com/help/en/agent-sandbox/product-overview/open-service-area
- https://www.alibabacloud.com/help/en/sls/storage-redundancy
- https://help.aliyun.com/en/sls/sls-supported-regions1
- https://modelavailability.com/platforms/gcp/regions/asia-southeast1
- https://awsfundamentals.com/regions/ap-southeast-1
- https://modelavailability.com/platforms/aws/regions/ap-southeast-1
- https://zhuoqidev.com/en/posts/model-gateway-cloudflare-vs-china-cloud/
- https://www.alibabacloud.com/help/en/eci/user-guide/specify-the-number-of-vcpus-and-memory-size-to-create-a-pod-1
- https://docs.cloud.google.com/vertex-ai/generative-ai/docs/release-notes
- https://virtarix.com/blog/vps-guides/cheap-cloud-vps/
- https://shattered.io/deploy-aws-bedrock-agentcore-agent-2026/
- https://docs.aws.amazon.com/pdfs/transform/latest/userguide/AWSTransformUserGuide.pdf
- https://www.elastic.co/docs/release-notes/cloud-serverless
- https://support.huaweicloud.com/intl/en-us/sms_faq/sms-faq-pdf.pdf
- https://www.prisma.io/llms-full.txt
- https://docs.ankra.ai/changelog
- https://www.alibabacloud.com/help/doc-detail/2782151.html
- https://www.alibabacloud.com/help/fr/serverless-workflow/latest/call-method
- https://www.alibabacloud.com/help/en/user-center/support/resource-plan-faq
- https://www.alibabacloud.com/help/en/oss/purchase-resource-plans
- https://www.alibabacloud.com/help/en/slb/application-load-balancer/introduction-to-alb-resource-plans
- https://www.alibabacloud.com/help/en/cloud-backup/product-overview/purchase-resource-plans
- https://www.betterclaw.io/blog/aws-bedrock-agentcore-pricing-alternatives
- https://www.alibabacloud.com/help/en/agentcore/agentcore-billing-activation
- https://www.alibabacloud.com/help/en/user-center/product-overview/learn-about-free-trials
- https://www.alibabacloud.com/help/en/agentcore/acentcore-collaboration-control-face-exemption-description
- https://www.alibabacloud.com/en/free?_p_lc=1
- https://www.youtube.com/watch?v=RuA__gUGgWs
- https://cloudburn.io/blog/amazon-bedrock-agentcore-pricing
- https://www.alibabacloud.com/help/en/agentloop/product-overview/agentloop-billing-overview.md
- https://alibaba-cloud.medium.com/free-trials-the-key-to-successful-cloud-computing-e7ec8000ddc5
- https://www.alibabacloud.com/help/en/model-studio/new-free-quota
- https://help.aliyun.com/en/model-studio/new-free-quota
- https://www.sitepoint.com/community/t/how-to-use-alibaba-cloud-services-for-free-solved/307980
- https://github.com/yvlgw01/alibabacloud
- https://www.alibabacloud.com/en/campaign/smb-coupon?_p_lc=1
- https://www.digitalapplied.com/blog/alibaba-token-plan-qwen-pricing-credits-agent-seats-2026
- https://www.reddit.com/r/Qwen_AI/comments/1v2khid/anyone_using_alibabaqwens_18_token_plan_daily_how/
- https://www.alibabacloud.com/blog/loongcollector-%2B-acs-agent-sandbox-build-a-production-grade-ai-agent-runtime-platform_603172
- https://help.aliyun.com/en/agent-sandbox/product-overview/limits-of-agent-sandbox
- https://www.alibabacloud.com/blog/one-click-openclaw-deployment-building-enterprise-grade-ai-agent-applications-with-acs-agent-sandbox_602980
- https://www.alibabacloud.com/help/en/cs/product-overview/product-billing-rules
- https://createos.sh/vs/alibaba-ack
- https://baike.baidu.com/en/item/Alibaba%20Cloud%20ACS%20Agent%20Sandbox/6233165
- https://www.alibabacloud.com/blog/602942
- https://www.tech42consulting.com/aws-agentcore-cost-calculator
- https://devopsity.com/blog/amazon-bedrock-agentcore-architecture-components-and-pricing/
- https://akalcloud.ai/blog/bedrock-agentcore-pricing/
- https://help.aliyun.com/en/agentcore/agentcore-billing-activation
- https://aws-news.com/article/2026-09-18-the-new-agentcore-runtime-is-now-available-in-amazon-bedrock-agentcore
- https://www.alibabacloud.com/help/en/cms/cloudmonitor-1-0/developer-reference/api-arms-2019-08-08-endpoint
- https://www.alibabacloud.com/help/en/dlf/dlf-1-0/regions-and-endpoints
- https://www.alibabacloud.com/help/en/functioncompute/billing-overview-of-fc-agent-sandbox
- https://help.aliyun.com/en/functioncompute/cloud-sandbox-new-billing-model-online-announcement
- https://createos.sh/vs/alibaba-agentrun
- https://sandboxer.com/compare/alibaba-cloud-agent-sandbox
- https://www.alibabacloud.com/help/en/agentrun/agenrun-sandbox-upgrade-fc-cloud-sandbox-scheme
- https://www.digitalapplied.com/blog/alibaba-opensandbox-open-source-ai-agent-execution
- https://northflank.com/blog/alibaba-opensandbox-architecture-use-cases
- https://www.facebook.com/thenewstack/posts/icymi-researchers-hid-a-message-for-rogue-ai-agents-probing-alibabas-amap-from-t/2030664568365727/
- https://arxiv.org/html/2512.04367v1
- https://help.aliyun.com/en/agent-sandbox/product-overview/open-service-area
- https://www.alibabacloud.com/help/en/slb/gateway-based-load-balancing-gwlb/product-overview/regions-and-zones-supported-by-gwlb
- https://www.facebook.com/hostingdiscussion/posts/alibaba-cloud-just-announced-its-next-round-of-expansion-with-new-regions-coming/1441248401522540/
- https://live.deutsche-boerse.com/news/Alibaba-Cloud-Expands-European-Footprint-with-Two-Availability-Zones-in-France-074c8155-15dc-4524-8429-298d29e68460
- https://www.alibabacloud.com/help/en/serverless-workflow/latest/create-workflow
- https://www.reddit.com/r/opencodeCLI/comments/1rlti8a/honest_review_of_alibaba_clouds_new_ai_coding_pro/
- https://www.alibabacloud.com/help/tr/serverless-workflow/latest/standard-workflow-and-express-workflow
- https://alibaba-cloud.medium.com/connect-environments-with-alibaba-cloud-express-connect-part-2-use-cases-fca6cfc28998
- https://www.alibabacloud.com/help/en/ecs/user-guide/economical-mode
- https://www.subconscious.dev/compare/alibaba-cloud-vs-morph
- https://help.aliyun.com/en/model-studio/workflow/introduction
- https://www.alibabacloud.com/blog/alibaba-unveils-plan-to-develop-next-generation-ai-model-and-unify-ai-assistant_603189
- https://help.aliyun.com/en/document_detail/2834315.html
- https://help.aliyun.com/en/model-studio/rag/channels
- https://docs.bailian.console.aliyun.com/en/model-studio/what-is-model-studio
- https://docs-pd.nocoly.com/en/hap/faq/integrate/ai/workflow/bailian/
- https://albertoroura.com/testing-alibaba-cloud-model-studio/
- https://help.aliyun.com/en/cs/user-guide/agent-sandbox/
- https://fly.io/learn/ai-sandbox-pricing/
- https://www.agent37.com/blog/cheapest-sandbox-for-ai-agents
- https://www.alibabacloud.com/help/en/agent-sandbox/
- https://northflank.com/blog/ai-sandbox-pricing
- https://www.alibabacloud.com/help/en/agent-sandbox/product-overview/limits-of-agent-sandbox
- https://cosmonic.com/ai-sandbox/choosing-an-agent-sandbox/
- https://agent-sandbox.sigs.k8s.io/docs/
- https://www.langchain.com/resources/best-agent-sandboxes
- https://northflank.com/blog/platforms-ai-agent-sandboxes-customer-cloud
- https://edera.dev/stories/what-is-an-ai-agent-sandbox
- https://medium.com/@balajibal/agent-sandboxes-the-runtime-layer-for-enterprise-ai-agents-88f207ac5e2e
- https://mastra.ai/articles/best-ai-agent-sandbox-platforms
- https://agent-sandbox.sigs.k8s.io/
- https://www.alibabacloud.com/help/en/functioncompute/image-usage-notes-1
- https://www.alibabacloud.com/help/en/functioncompute/configure-network-settings
- https://www.alibabacloud.com/help/en/functioncompute/resident-resource-pool
- https://modal.com/resources/best-cloud-platforms-rent-a10-gpus
- https://www.digitalocean.com/resources/articles/alibaba-cloud-alternatives
- https://www.datacenters.com/alibaba-cloud-cn-hongkong
- https://www.alibabacloud.com/en/product/function-compute/pricing
- https://www.alibabacloud.com/help/en/eventbridge/user-guide/manage-event-rules
- https://www.alibabacloud.com/help/en/eventbridge/user-guide/event-target-overview
- https://www.alibabacloud.com/help/en/eventbridge/user-guide/route-events-to-tablestore
- https://www.reddit.com/r/aws/comments/ystxxn/confused_about_eventbridge_5_targets_per_rule/
- https://stackoverflow.com/questions/77141029/event-bridge-targets
- https://aws.amazon.com/blogs/compute/introducing-cross-account-targets-for-amazon-eventbridge-event-buses/
- https://repost.aws/questions/QU_44fKiFOSQuahDFIjemWZg/can-eventbridge-send-the-same-event-to-the-target-at-regular-intervals-while-it-matches-the-event-pattern
- https://qwen.readthedocs.io/en/latest/framework/qwen_agent.html
- https://qwen.ai/blog?id=qwen-agentworld
- https://www.scrapingbee.com/blog/qwen-agent-framework/
- https://shattered.io/qwen-coding-agent-self-modification-secrets-2026/
- https://www.ionix.io/threat-center/cve-2026-82275/
- https://qwenlm.github.io/Qwen-Agent/en/
- https://arxiv.org/html/2606.24597v1
- https://huggingface.co/blog/Kseniase/qwen
- https://dev.to/wonderlab/open-source-project-of-the-day-104-agentscope-20-alibabas-production-ready-agent-framework-4o4d
- https://runtime.agentscope.io/en/advanced_deployment.html
- https://www.youtube.com/watch?v=TI8BrwGFyuI
- https://www.facebook.com/groups/techtitansgroup/posts/1549896209671025/
- https://www.i-scoop.eu/agentscope-alibaba-ai-agents/
- https://www.linkedin.com/posts/sumanth077_build-and-run-ai-agents-you-can-see-understand-activity-7467181428510863360-CJ0F
- https://thetalkingapp.medium.com/spring-ai-recipe-adding-human-in-the-loop-to-a-graph-based-agentic-workflow-4a826cf89902
- https://java2ai.com/en/docs/1.0.0.2/tutorials/graph/human-in-the-loop/
- https://www.reddit.com/r/LangChain/comments/1s6qidj/how_i_implemented_humanintheloop_with_langgraphs/
- https://github.com/alibaba/spring-ai-alibaba/blob/main/spring-ai-alibaba-graph-core/README.md
- https://forum.langchain.com/t/how-to-resume-the-agent-workflow-after-interrupt/434
- https://www.baeldung.com/spring-ai-alibaba-graph-based-workflows
- https://www.alibabacloud.com/blog/602455
- https://www.youtube.com/watch?v=dSKsl_AYlKQ
- https://pub.towardsai.net/langgraph-human-in-the-loop-pausing-reviewing-and-rewinding-your-agent-4028bd05b049
- https://springdevpro.com/spring-ai-alibaba/source-code/workflow/
- https://java2ai.com/en/docs/1.0.0.2/faq/
- https://www.reddit.com/r/Qwen_AI/comments/1j7q6i4/anybody_have_any_experience_with_alibaba_clouds/
- https://innfactory.ai/en/ai-harness/qwen-code/
- https://www.subconscious.dev/providers/alibaba-cloud
- https://help.aliyun.com/en/oss/user-guide/regions-and-endpoints
- https://www.alibabacloud.com/blog/agent-as-a-service-the-service-architecture-powering-personal-agents-and-enterprise-agents_603695
- https://www.instagram.com/reel/DXG4sEXAGUk/
- https://www.alibabacloud.com/blog/alibaba-cloud-al-agent-security-solution%E2%80%94%E2%80%94security-risks-and-mitigations-for-enterprise-ai-agent-adoption_603175
- https://www.alibabacloud.com/help/en/agentcore/api-agentcore-2026-08-04-verifyworkspaceossmountramauthorization
- https://www.rackspace.com/blog/amazon-bedrock-agentcore-preview-agentic-ai-platform
- https://github.com/aliyun/alibabacloud-kms-agent
- https://www.alibabacloud.com/help/en/agentcore/agent-instructions-managed-harness
- https://www.alibabacloud.com/help/en/agentcore/api-agentcore-2026-08-04-overview.md
- https://builder.aws.com/content/3BfYvUNKt1db2KOxfT2j9SOPVsX/choosing-between-managed-vs-modular-ai-agents-amazon-bedrock-agents-vs-amazon-bedrock-agentcore
- https://www.alibabacloud.com/help/tr/agentrun/open-service-area
- https://www.alibabacloud.com/help/es/agentrun/open-service-area
- https://www.alibabacloud.com/help/pt-br/agentrun/open-service-area
- https://vn.linkedin.com/in/tunglamnguyenba
- https://www.alibabacloud.com/help/en/tablestore/memory-storage-service-sub-product-test/news-and-announcements
- https://www.alibabacloud.com/en/news/product/supports-mcpskill-data-connections-ohv?_p_lc=1
- https://www.alibabacloud.com/blog/deepseek-v4-flash-dalam-skala-besar-panduan-deployment-berbasis-benchmark_603312
- https://www.alibabacloud.com/blog/%EC%8B%A4%EC%8B%9C%EA%B0%84-%EB%A9%80%ED%8B%B0%EB%AA%A8%EB%8B%AC-ai-agent-%EA%B5%AC%EC%B6%95%ED%95%98%EA%B8%B0_602768
- https://www.alibabacloud.com/blog/603462
- https://help.aliyun.com/en/model-studio/sandbox-billing
- https://www.alibabacloud.com/help/en/functioncompute/can-a-service-process-more-than-300-requests-per-second
- https://help.aliyun.com/en/functioncompute/overview-of-configuring-the-maximum-number-of-on-demand-instances
- https://www.alibabacloud.com/help/en/vpc/understanding-vpc-quotas-in-alibaba-cloud
- https://www.alibabacloud.com/help/en/ecs/user-guide/limitations
- https://www.alibabacloud.com/help/en/agent-sandbox/quota-management.md
- https://www.alibabacloud.com/help/en/quota-center/product-overview/what-is-quota-center
- https://www.alibabacloud.com/help/en/vpc/public-network-access/
- https://www.alibabacloud.com/help/en/functioncompute/access-agenrun-resources-through-privatelink-intranet
- https://www.alibabacloud.com/help/en/agentrun/practice-configure-and-use-the-agent-open-platform-from-0
- https://www.alibabacloud.com/blog/a-tangled-web-advanced-networking-on-alibaba-cloud---friday-blog-week-58_598875
- https://help.aliyun.com/en/agentrun/practice-configure-and-use-the-agent-open-platform-from-0
- https://www.alibabacloud.com/blog/designing-production-network-architecture-on-alibaba-cloud-vpc_603141
- https://www.alibabacloud.com/help/en/ga/product-overview/acceleration-regions-supported-by-global-acceleration
- https://help.aliyun.com/en/sls/developer-reference/api-reference-appendix/
- https://www.alibabacloud.com/help/en/api-gateway/ai-gateway/product-overview/supported-regions
- https://help.aliyun.com/en/dataworks/user-guide/new-data-agent
- https://help.aliyun.com/en/maxcompute/open-storage-overview-1
- https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agentcore-regions.html
- https://github.com/aws/agentcore-cli/blob/v1.x/docs/china-regions.md
- https://awsfundamentals.com/regions/service/amazon-bedrock-agentcore
- https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/cross-region-inference.html
- https://www.aws-services.info/bedrock-agentcore.html
- https://www.linkedin.com/pulse/amazon-bedrock-agentcore-now-generally-available-aws-china-zhu-d8jhe
- https://baike.baidu.com/en/item/Amazon%20Bedrock%20AgentCore/7189945
- https://awsinsider.net/articles/2025/10/23/amazon-bedrock-agentcore-now-generally-available-for-building-and-scaling-ai-agents.aspx
- https://docs.cloud.google.com/compute/docs/release-notes
- https://www.facebook.com/61570176031653/videos/new-aws-accounts-have-a-gpu-quota-of-zero-not-low-zero-every-g5-launch-fails-ins/1575702654041851/
- https://www.runpod.io/articles/guides/top-cloud-gpu-providers
- https://docs.databricks.com/aws/en/release-notes/product/
- https://lambda.ai/
- https://aws.amazon.com/ec2/faqs/
- https://www.ovhcloud.com/en/public-cloud/gpu/
- https://www.linkedin.com/pulse/2026-week-32-3-aug-9-ankur-patel-o4pdf
- https://arxiv.org/html/2201.06372v2
- https://www.alibabacloud.com/help/en/ecs/user-guide/regions-and-zones
- https://www.alibabacloud.com/help/en/slb/application-load-balancer/supported-regions-and-zones
- https://baike.baidu.com/en/item/Alibaba%20Cloud%20Global%20Infrastructure/5164732
- https://www.datacenters.com/providers/alibaba-cloud-04967c11-f07a-4b84-befe-fb8e99b38658/locations/china
- https://help.aliyun.com/en/pai/deploy-an-llm/
- https://www.alibabacloud.com/help/en/pai/faq-about-eas
- https://www.alibabacloud.com/blog/end-to-end-mlops-pipeline-with-alibaba-cloud-pai-dsw-pai-dlc-oss-and-pai-eas_603081
- https://www.alibabacloud.com/help/en/pai/methods-for-calling-services/
- https://help.aliyun.com/en/ack/cloud-native-ai-suite/use-cases/building-customized-ai-question-and-answer-assistant-based-on-dify
- https://github.com/langgenius/dify/releases
- https://dify.ai/blog
- https://dokploy.com/templates/dify
- https://docs.asksage.ai/integrations/dify/
- https://northflank.com/stacks/deploy-dify
- https://dify.ai/blog/dify-v1-0-building-a-vibrant-plugin-ecosystem
- https://www.alibabacloud.com/en/solution/tech-solution-deploy/2871859
- https://www.alibabacloud.com/blog/dify-performance-bottleneck-higress-ai-gateway-injects-it-with-the-soul-of-high-availability_602527
- https://www.alibabacloud.com/help/en/ack/ack-managed-and-ack-dedicated/user-guide/cluster-high-availability-architecture-recommend-configuration
- https://www.alibabacloud.com/en/solution/tech-solution/hablog
- https://www.alibabacloud.com/help/en/cs/user-guide/build-customized-ai-q-a-assistant-based-on-dify-in-acs
- https://marketplace.dify.ai/plugin/5101good/agentbay
- https://www.alibabacloud.com/help/en/cms/cloudmonitor-2-0/cms-2-0-access-the-dify-application
- https://docs.cloud.google.com/compute/docs/regions-zones
- https://docs.aws.amazon.com/ec2/latest/instancetypes/ec2-instance-regions.html
- https://docs.oracle.com/iaas/Content/General/Concepts/regions.htm
- https://help.sigmacomputing.com/docs/region-warehouse-and-feature-support
- https://docs.unqork.io/docs/cloud-service-providers-supported-regions
- https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-quota.html
- https://docs.aws.amazon.com/general/latest/gr/eventbridgeschemas.html
- https://www.scribd.com/document/570687812/eventbridge-user-guide
- https://www.alibabacloud.com/help/en/model-studio/qwen-omni
- https://bsky.app/profile/awsrecentnews.bsky.social
- https://help.aliyun.com/en/model-studio/qwen-structured-output
- https://fortinetweb.s3.amazonaws.com/docs.fortinet.com/v2/attachments/efa6671b-a0ce-11f1-8c5a-8e4c95ff11ac/FortiSIEM-7.6.1-External_Systems_Configuration_Guide.pdf
- https://noise.getoto.net/tag/aws-cloud-development-kit/
- https://docs.mendix.com/developerportal/deploy/mendix-ip-addresses/
- https://docs.trendmicro.com/en-us/documentation/article/trend-vision-one-deploying-cli
- https://www.tencentcloud.com/document/product/1147/46679
- https://apizie.tech/api/cloud/aliyun-fnf
- https://docs.langflow.org/api-reference-api-examples
- https://www.alibabacloud.com/help/en/dataworks/developer-reference/api-dataworks-public-2024-05-18-endpoint
- https://turbopuffer.com/docs/regions
- https://intl.cloud.tencent.com/pt/document/product/1150/49445
- https://help.aliyun.com/en/model-studio/regions
- https://docs.pipecat.ai/api-reference/cli/cloud/regions
- https://www.alibabacloud.com/help/en/model-studio/model-training-overview
- https://www.alibabacloud.com/blog/fine-tuning-ai-models-on-alibaba-cloud-pai-a-practical-guide_603422
- https://www.alizila.com/alibaba-cloud-announced-the-latest-ai-models-tools-and-infrastructure-available-to-drive-more-efficient-global-ai-community/
- https://www.alibabacloud.com/help/en/open-search/search-platform/getting-started/ai-getting-started
- https://www.scmp.com/tech/big-tech/article/3368454/alibaba-cloud-set-open-new-data-centres-europe-next-year-overseas-push-speeds
- https://pytorch.org/blog/alibaba-cloud-ant-group-cambricon-and-huawei-come-together-in-shanghai-to-advance-the-open-source-ai-stack-at-pytorch-conference-china/
- https://www.facebook.com/euronewsnext/videos/alibabas-ai-push-reaches-deeper-into-europe-with-new-cloud-regions-and-data-cent/1975828543098858/
- https://www.alibabacloud.com/en?_p_lc=1
- https://www.cloudzero.com/blog/qwen-api-pricing/
- https://www.morphllm.com/qwen-api
- https://deepinfra.com/blog/qwen-api-pricing-2026-guide
- https://www.spheron.network/blog/qwen-api-pricing-vs-self-hosted-llms-cost-privacy-2026/
- https://www.therundown.ai/tools/qwen3-max-thinking
- https://www.digitalapplied.com/blog/qwen3-max-thinking-alibaba-reasoning-model-guide
- https://www.aipricing.guru/qwen-pricing/
- https://aivancity.ai/en/blog/qwen3-8-max-codage-agents-ia-performances-limites/
- https://www.lindy.ai/blog/qwen-3-8
- https://www.alibabacloud.com/help/en/model-studio/models
- https://www.requesty.ai/models/alibaba
- https://modelstudio.alibabacloud.com/
- https://www.reddit.com/r/Qwen_AI/comments/1tl4if5/i_finally_figured_out_how_to_sign_up_for_qwens/
- https://www.eesel.ai/blog/qwen-pricing
- https://models.litellm.ai/providers/dashscope
- https://www.activepieces.com/blog/qwen-api-pricing-costs-tiers-and-models-2026
- https://x.com/Alibaba_Qwen/status/2024136381308805564?lang=en
- https://www.alibabacloud.com/help/en/model-studio/access-model-studio-through-privatelink
- https://www.alibabacloud.com/help/tr/model-studio/access-model-studio-through-privatelink
- https://help.aliyun.com/en/model-studio/access-model-studio-through-privatelink
- https://www.alibabacloud.com/help/en/model-studio/base-url
- https://www.alibabacloud.com/help/doc-detail/469318.html
- https://chozan.co/alibaba-cloud/
- https://www.alibabacloud.com/blog/cloud-use-when-agents-start-using-the-cloud-for-real_603634
- https://www.alibabacloud.com/blog/agentteams-dashboard-unified-management-of-teams-projects-and-assets_603683
- https://www.alibabacloud.com/help/en/lingma/cloud-agents-cn-update-log
- https://www.linkedin.com/posts/xavier-w-tsang-0777172ab_agenticai-enterpriseai-aigovernance-activity-7484702950695784448-8uFG
- https://aiagentstore.ai/ai-agent-news/2026-july
- https://www.facebook.com/alibabacloud/posts/ai-coding-agents-can-write-impressive-code-but-when-your-agent-swears-its-fixed-/1504357085069712/
- https://aws.amazon.com/blogs/machine-learning/how-amazon-uses-ai-agents-to-support-compliance-screening-of-billions-of-transactions-per-day/
- https://www.alibabacloud.com/blog/digital-employees-or-digital-twins-improving-end-to-end-software-delivery-in-practice_603694
- https://qoder.com/marketplace?type=plugin
- https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/harness-skills.html
- https://caylent.com/blog/creating-ai-agents-in-minutes-with-agent-core-harness
- https://github.com/hoodini/ai-agents-skills/blob/master/skills/aws-harness/SKILL.md
- https://help.aliyun.com/en/agentcore/agentcore-management-skill
- https://cloudelligent.com/blog/agentcore-harness/
- https://www.reddit.com/r/aws/comments/1tw2fhp/all_the_aws_bedrock_agentcore_best_practices_in/
- https://builder.aws.com/content/3FnHhfxJMm5BtfIDVDNPFQRD68C/what-agentcore-managed-harness-takes-over-what-it-leaves-to-you
- https://www.alibabacloud.com/help/en/agentcore/memory-space-overview.md
- https://aws.amazon.com/blogs/machine-learning/building-smarter-ai-agents-agentcore-long-term-memory-deep-dive/
- https://www.alibabacloud.com/blog/from-long-term-memory-to-self-evolution_603343
- https://dev.to/aws/bring-ai-agents-with-long-term-memory-into-production-in-minutes-338l
- https://github.com/aws-samples/sample-amazon-bedrock-agentcore-memory-mcp-server
- https://awslabs.github.io/mcp/servers/amazon-bedrock-agentcore-mcp-server
- https://www.developersdigest.tech/agent-memory/aws-agentcore-memory
- https://medium.com/aws-tip/your-ai-agents-memory-can-now-expire-amazon-bedrock-agentcore-changes-what-you-need-to-know-about-6e61703e489a
- https://www.reddit.com/r/aws/comments/1pwtc53/how_to_integrate_aws_agentcore_with_a_remote_mcp/
- https://www.youtube.com/watch?v=atWXM5lziY8
- https://repost.aws/questions/QUoyIgV3v4Qg2Q0S4XmlCEcg/aws-agentcore-gateway-mcp-target-issue
- https://auth0.com/blog/securing-amazon-bedrock-agentcore-agents-auth0-for-ai-agents/
- https://dev.to/aws-heroes/amazon-bedrock-agentcore-gateway-part-1-introduction-1pjl
- https://www.tecracer.com/blog/2025/10/mcp-authentication-for-agent-connections-in-amazon-bedrock-agentcore.html
- https://www.reddit.com/r/ClaudeWorkflows/comments/1x9pl7b/workflow_multilayered_strategy_to_prevent_runaway/
- https://github.com/alibabacloud-go/agentrun-20250910
- https://www.youtube.com/watch?v=fv7Pt3Uyags
- https://www.alibabacloud.com/help/en/agentrun/api-agentrun-2025-09-10-createagentruntime
- https://www.alibabacloud.com/help/en/functioncompute/configure-a-native-oss-trigger-1
- https://www.linkedin.com/posts/shreyassub_schedule-your-agentic-work-quick-1-min-video-activity-7397672657858531328-6QBa
- https://ecweb.ecer.com/topic/en/detail-162213-alibaba_cloud_launches_function_compute_timers_for_scheduled_tasks.html
- https://cronhooks.io/blog/schedule-ai-workflow-to-run-at-a-later-date
- https://help.aliyun.com/en/agentrun/quick-start-to-low-code-agent-creation-1
- https://www.alibabagroup.com/document-2016703577908576256
- https://yusmpgroup.com/news/alibaba-agent-native-cloud
- https://www.alibabacloud.com/help/en/well-architected/change-publishing-policy
- https://www.alibabacloud.com/blog/practice-of-end-to-end-canary-release-by-using-kruise-rollout_600923
- https://www.alibabacloud.com/blog/use-openkruise-to-implement-end-to-end-canary-release-based-on-higress_600400
- https://help.aliyun.com/en/yunxiao/user-guide/ack-nginx-ingress-grayscale-release
- https://www.alibabacloud.com/help/en/pai/manage-service-groups
- https://decagon.ai/glossary/what-is-canary-deployment
- https://stackoverflow.com/questions/62092338/canary-vs-a-b-release-strategy
- https://www.alibabacloud.com/blog/end-to-end-canary-release-through-alibaba-cloud-asm-lanes-and-kruise-rollout_602111
- https://www.alibabacloud.com/blog/release-strategy---alibaba-devops-practice-part-22_598650
- https://semaphore.io/blog/what-is-canary-deployment
- https://www.alibabacloud.com/help/en/dedicated-host/developer-reference/api-ecs-2014-05-26-endpoint-ddh
- https://www.apizie.tech/api/cloud/aliyun-fnf
- https://www.cloudping.cloud/endpoints
- https://docs.aws.amazon.com/general/latest/gr/rande.html
- https://www.economize.cloud/resources/aws/regions-zones-map/
- https://www.alibabacloud.com/help/en/functioncompute/service-endpoints
- https://holori.com/list-of-all-aws-regions-and-availability-zones/
- https://www.aws-services.info/cloudfront.html
- https://www.alibabacloud.com/help/en/model-studio/usa-virginia-global
- https://developers.cloudflare.com/api/
- https://www.srvrlss.io/provider/alibabacloud-function-compute/
- https://www.alibabacloud.com/blog/big-data-%26-ai-platform-monthly-newsletter-%E2%80%94-april-2026_603131
- https://innfactory.ai/en/ai-models/qwen/
- https://learn.microsoft.com/en-us/azure/reliability/regions-list
- https://help.aliyun.com/en/vpc/regions-that-support-vpc-features
- https://www.aws-services.info/eventbridge.html
- https://www.aliyun.com/product/cap
- https://help.aliyun.com/zh/cap/
- https://www.aliyun.com/product/list
- https://help.aliyun.com/zh/cap/product-overview/
- https://developer.aliyun.com/topic/cloud-application-platform
- https://www.cnblogs.com/alisystemsoftware/p/18422165
- https://www.alibabacloud.com/zh?_p_lc=1
- https://www.aliyun.com/product/news/25714
- https://www.aliyun.com/partner
- https://zhuanlan.zhihu.com/p/1943307501626984284
- https://www.alibabacloud.com/blog/alibaba-cloud-expands-global-infrastructure-and-ai-portfolio-to-accelerate-enterprise-ai-adoption_603594
- https://www.alibabacloud.com/blog/alibaba-cloud-earns-industry-leading-recognition_602827
- https://www.linkedin.com/company/alibabacloudglobal
- https://www.al-jammaz.com/vendors/alibaba-cloud
- https://dealroom.co/companies/alibaba-cloud/
- https://help.aliyun.com/en/functioncompute/what-is-function-compute
- https://longbridge.com/en/news/269303088
- https://alibaba-cloud.medium.com/using-api-gateway-with-alibaba-clouds-function-compute-3c7aad4acbbb
- https://news.futunn.com/en/flash/19719606/alibaba-cloud-officially-launches-function-compute-agentrun
- https://www.forrester.com/blogs/alibabas-next-chapter-from-ai-native-to-agent-native/
- https://www.alibabacloud.com/en/press-room/alibaba-unveils-roadmap-on-full-stack-ai-strategy?_p_lc=1
- https://www.youtube.com/watch?v=K-4zGeIejE4&vl=en-US
- https://www.alibabacloud.com/help/en/oss/user-guide/what-is-oss
- https://www.alibabacloud.com/help/en/oss/developer-reference/v2-access-tracking
- https://www.alibabacloud.com/help/en/oss/developer-reference/use-aws-sdks-to-access-oss
- https://www.alibabacloud.com/help/en/hologres/user-guide/create-a-foreign-table
- https://www.alibabacloud.com/help/en/oss/user-guide/oss-deployed-in-cloudbox-overview
- https://www.alibabacloud.com/help/en/oss/developer-reference/ossutil-overview/
- https://www.alibabacloud.com/help/en/maxcompute/access-external-tables/
- https://www.alibabacloud.com/help/en/vpc/vpc-flow-logs
- https://www.alibabacloud.com/blog/alibaba-cloud-announces-industry-leading-availability-commitments_595664
- https://help.aliyun.com/en/document_detail/123157.html
- https://www.alibabacloud.com/help/en/privatelink/quotas-and-limits
- https://docs.cloud.google.com/run/quotas
- https://docs.cloud.google.com/run/docs/tutorials/gcloud
- https://ruk-com.cloud/en/knowledge-base/paas/litespeed-web-adc/
- https://www.scribd.com/document/585516124/AKS-Doc
- https://www.develeap.com/news/unpatched-argo-cd-repo-server-flaw-could-let-attackers-take-7bc9e0a3/
- https://reference-global.com/download/chapter/9789355516886/10.0000/9789355516886-001.pdf
- https://www.alibabacloud.com/help/en/functioncompute/e2b-compatibility-explanation
- https://github.com/Alibaba-Agent-Sandbox/agent-sandbox/issues/4
- https://www.alibabacloud.com/help/en/agent-sandbox/e2b-compatibility-explanation
- https://upstash.com/blog/ai-agent-sandbox-providers-compared-2026
- https://www.alibabacloud.com/blog/security-new-features-in-march-2026_603033
- https://aws.amazon.com/about-aws/whats-new/2025/07/amazon-bedrock-agentcore-preview/
- https://www.alibabacloud.com/help/en/agentcore/mirrored-cache
- https://www.facebook.com/alibabacloud/videos/the-foundation-for-global-ai-innovation-how-alibaba-cloud-built-a-stack-for-the-/859373597087493/
- https://www.alibabacloud.com/blog/alibaba-cloud-launches-first-cloud-region-in-brazil-to-accelerate-cloud-and-ai-transformation_603507
- https://www.facebook.com/AlibabaCloudSEA/posts/empowering-enterprises-with-native-ai-agentsat-apsaraconference2026-qi-zhou-vice/1115373814390517/
- https://pandaily.com/alibaba-cloud-agentic-cloud-agentcore-cpfs-hpn-8-0-pro
- https://www.computelabs.ai/research/2026-09-27/alibaba-cloud-introduced-agentcore-other-agent-runtime-infrastructure-part
- https://www.alibabacloud.com/blog/alibaba-clouds-2026-apsara-conference-full-stack-ai-roadmap-along-with-global-market-expansion-plan_603598
- https://www.facebook.com/alibabagroupofficial/videos/the-countdown-to-apsara-conference-2026-is-on-follow-the-paper-airplane-as-it-so/2113455816206196/
- https://www.alibabacloud.com/en/apsara-conference/2026-exhibition
- https://www.facebook.com/alibabacloud/videos/apsara-conference-2026-agenda/2664150320769935/
- https://www.youtube.com/playlist?list=PLCvsxpOGutwU
- https://www.alibabacloud.com/apsara-conference/2026-agenda
- https://www.alibabacloud.com/help/en/api-gateway/cloud-native-api-gateway/product-overview/regions
- https://help.aliyun.com/en/api-gateway/ai-gateway/product-overview/supported-regions
- https://www.alibabacloud.com/help/en/api-gateway/ai-gateway/product-overview/announcement-new-serverless-version-of-the-ai-gateway-now-in-public-beta
- https://www.alibabacloud.com/blog/603186
- https://www.alibabacloud.com/blog/alibaba-cloud-unveils-advanced-agentic-ai-ecosystem-for-global-customers_603179
- https://www.alibabacloud.com/help/en/api-gateway/ai-gateway/user-guide/create-a-gateway-instance
- https://dig.watch/updates/alibaba-cloud-opens-ai-centre-in-singapore-to-drive-regional-innovation
- https://www.alibabacloud.com/help/en/vpc/traffic-mirroring-overview/
- https://help.aliyun.com/en/analyticdb/analyticdb-for-mysql/developer-reference/api-adb-2019-03-15-endpoint
- https://www.alibabacloud.com/help/en/functioncompute/asynchronous-task
- https://help.aliyun.com/en/functioncompute/fc-endpoints
- https://help.altair.com/2024.1.0/PBS%20Professional/PBSCloudGuide2024.1.pdf
- https://www.alibabacloud.com/help/en/ack/ack-managed-and-ack-dedicated/user-guide/create-an-eci-pod
- https://www.tencentcloud.com/document/product/213/15753
- https://intl.cloud.tencent.com/ind/document/product/213/15753
- https://docs.redhat.com/en/documentation/openshift_container_platform/4.21/observability/installing_on_aws/index
- https://docs.aws.amazon.com/pdfs/omics/latest/dev/healthomics-dev.pdf
- https://libcloud.readthedocs.io/en/stable/changelog.html
- https://noise.getoto.net/tag/aws-outposts/
- https://docs.omnissa.com/HorizonCloudService-next-gen-ReleaseNotes/HorizonCloudService-nextgen-ReleaseNotes
- https://libcloud.apache.org/blog/tags/news.html
- https://www.alibabacloud.com/help/en/eventbridge/user-guide/event-stream-overview
- https://help.aliyun.com/en/eventbridge/product-overview/what-is-eventbridge
- https://www.alibabacloud.com/blog/alibaba-cloud-releases-eventbridge-to-support-cloud-native-architecture_596974
- https://www.alibabacloud.com/blog/converged-database-ecosystem-building-cdc-applications-with-eventbridge_599648
- https://aws.amazon.com/blogs/compute/sending-and-receiving-cloudevents-with-amazon-eventbridge/
- https://registry.terraform.io/providers/aliyun/alicloud/latest/docs/resources/event_bridge_rule
- https://www.reddit.com/r/aws/comments/r1jcav/eventbridge_does_the_default_bus_receive_events/
- https://www.alibabacloud.com/help/en/serverless-workflow/latest/orchestration-functions-create-a-flow
- https://www.alibabacloud.com/help/en/serverless-workflow/latest/simple-flow-create-a-flow
- https://www.youtube.com/watch?v=-kJSKmAhDHw
- https://help.aliyun.com/en/document_detail/122485.html
- https://www.facebook.com/QwenCloud/posts/fully-managed-locally-deployed-alibaba-cloud-infrastructure-and-services-with-co/206683305287175/
- https://cloudflow.jivrus.com/pricing
- https://flows.sh/pricing
- https://www.doit.com/products/cloudflow
- https://www.capterra.com/p/10053394/CloudFlow/pricing/
- https://heyflow.com/pricing/
- https://blog.blazingcdn.com/en-us/cloudflare-prices-2025-free-pro-business-enterprise
- https://webflow.com/pricing
- https://skyflo.ai/pricing
- https://www.alibabacloud.com/help/en/serverless-workflow/latest/create-a-time-based-schedule
- https://learn.microsoft.com/en-us/power-automate/run-scheduled-tasks
- https://www.reddit.com/r/MicrosoftFlow/comments/12r491i/how_can_i_trigger_a_flow_once_from_a_certain_time/
- https://www.alibabacloud.com/help/en/dms/terms-2.md
- https://www.youtube.com/watch?v=YwyY7y7QNzo
- https://community.powerplatform.com/forums/thread/details/?threadid=018c68ab-4bb6-ef11-b8e8-000d3a4fc588
- https://stackoverflow.com/questions/68174645/how-to-trigger-a-power-automate-flow-at-a-specific-time-not-schedule-using-can
- https://help.aliyun.com/en/document_detail/168926.html
- https://www.alibabacloud.com/help/en/dataworks/function-release-record
- https://www.alibabacloud.com/help/en/model-studio/error-code
- https://www.alibabacloud.com/help/en/hologres/user-guide/use-hologres-managed-models
- https://www.clustermax.ai/cloudreview/alibabacloud
- https://www.gateway.ga.gov/access/
- https://www.ilgateways.com/
- https://www.acer.com/us-en/gateway
- https://gateway.ifionline.org/
- https://www.nasa.gov/gateway-space-station-news/
- https://istio.io/latest/docs/reference/config/networking/gateway/
- https://www.gtc.edu/
- https://apps.apple.com/us/app/bible-gateway/id506512797
- https://atthegateway.com/
- https://www.alibabacloud.com/help/en/eventbridge/product-overview/what-is-eventbridge
- https://www.alibabacloud.com/help/en/eventbridge/product-overview/product-function-node-eventbridge
- https://www.alibabacloud.com/blog/596974
- https://camel.apache.org/components/next/alibaba-eventbridge-component.html
- https://razorops.com/blog/amazon-eventbridge/
- https://aws.amazon.com/blogs/compute/introducing-amazon-eventbridge-schema-registry-and-discovery-in-preview/
- https://www.alibabacloud.com/help/en/functioncompute/billing-fc/
- https://ai.google.dev/gemini-api/docs/available-regions
- https://www.alibabacloud.com/help/en/model-studio/germany-frankfurt-global
- https://vietnamnews.vn/media-outreach/1656172/alibaba-cloud-announces-new-availability-zones-and-global-investment-to-fuel-ai-innovation.html
- https://learn.microsoft.com/en-us/power-platform/important-changes-coming
- https://www.facebook.com/jetsoftprollc/videos/most-enterprise-software-still-relies-on-people-to-coordinate-workflows-across-a/2497804150727671/
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/build-knowledge-base-qa-assistant-without-coding
- https://docs.azure.cn/en-us/entra/agent-id/migrate-custom-app-registrations-to-agent-id
- https://reshmeeauckloo.com/posts/copilot-powerplatformapi/
- https://help.aliyun.com/en/model-studio/share-an-application
- https://aixsociety.com/insights/deploying-moltbot-on-alibaba-cloud-with-qwen-and-connecting-it-to-dingtalk
- https://www.alibabacloud.com/help/en/agentidentity/secure-access-to-dingtalk-in-agent
- https://help.aliyun.com/en/model-studio/billing-for-knowledge-base
- https://www.alibabacloud.com/help/en/model-studio/bill-query-and-cost-management
- https://baike.baidu.com/en/item/Model%20Studio/6428040
- https://freellmapihub.com/p/alibaba-model-studio
- https://www.computerweekly.com/news/366570512/Alibaba-Cloud-debuts-Model-Studio
- https://support.google.com/merchants/answer/7052112?hl=en
- https://www.alibabacloud.com/help/doc-detail/3036577.html
- https://www.alibabacloud.com/help/en/idaas/eiam/user-guide/what-is-agent-id-guard
- https://www.alibabacloud.com/blog/alibaba-clouds-new-launch-agent-id-guard-who-will-manage-the-identity-security-of-these-claws_602954
- https://help.aliyun.com/en/agentidentity/what-is-agent-identity
- https://www.alibabacloud.com/help/en/idaas/eiam/user-guide/agent-id-configuration-guide
- https://docs.cloud.google.com/iam/docs/agent-identity-overview
- https://www.alibabacloud.com/help/en/agentidentity/obtain-credentials/
- https://www.youtube.com/watch?v=blmAkayzE8M
- https://www.alibabacloud.com/help/en/agentbay/product-overview/what-is-eds-agentbay
- https://www.alibabacloud.com/en/product/agentbay?_p_lc=1
- https://github.com/aliyun/wuying-agentbay-sdk/blob/main/README.md
- https://www.alibabacloud.com/help/en/agentbay/use-sdk-for-quick-access
- https://www.alibabacloud.com/blog/unlock-the-future-of-automation-introducing-alibaba-cloud-agentbay_602649
- https://mcpservers.org/servers/Michael98671/agentbay
- https://www.modelscope.cn/mcp/servers/AgentBay/wuying-agentbay-mcp-server
- https://help.aliyun.com/en/agent-sandbox/product-overview/billing-overview
- https://www.alibabacloud.com/help/en/agentcore/agentcore-billing-instructions
- https://www.alibabacloud.com/help/en/api-gateway/ai-gateway/product-overview/free-product-templates
- https://www.alibabacloud.com/help/en/api-gateway/traditional-api-gateway/product-overview/dedicated-instance
- https://www.alibabacloud.com/help/en/api-gateway/cloud-native-api-gateway/product-overview/billing-overview
- https://help.aliyun.com/en/eventbridge/product-overview/supported-regions
- https://aws.amazon.com/blogs/compute/introducing-cross-region-event-routing-with-amazon-eventbridge/
- https://www.alibabacloud.com/help/en/maxcompute/product-overview/fees-for-exclusive-resource-groups-in-dts
- https://www.alibabacloud.com/help/en/polardb/polardb-for-mysql/user-guide/global-database-network
- https://www.alibabacloud.com/help/en/functioncompute/create-a-custom-container-function-in-a-container-runtime
- https://www.alibabacloud.com/help/en/functioncompute/creating-a-gpu-function/
- https://www.srvrlss.io/compare/alibabacloud-function-compute-vs-render/
- https://albertoroura.com/deploying-qwen-3-as-private-api-on-alibaba-cloud-function-compute/
- https://www.alibabacloud.com/blog/alibaba-cloud-serverless-products-reaches-66%25-of-serverless-users-in-china_596913
- https://www.alibabacloud.com/blog/comprehensive-and-deep-integration-of-alibaba-cloud-function-compute-and-eventbridge_598841
- https://www.alibabacloud.com/blog/alibaba-cloud-serverless-%7C-serverless-app-engine-%C2%B7-high-availability_600167
- https://www.srvrlss.io/compare/alibabacloud-function-compute-vs-serverless-framework/
- https://cloudonaut.io/comparing-serverless-offerings-from-alibaba-cloud-and-aws/
- https://community.spiceworks.com/t/alibaba-cloud-vs-aws-service-and-pricing-comparison/718442
- https://github.com/aws-solutions-library-samples/guidance-for-cost-analysis-and-optimization-with-amazon-bedrock-agentcore/blob/main/README.md
- https://help.aliyun.com/en/functioncompute/resident-resource-pool
- https://docs.cloud.google.com/compute/docs/gpus
- https://www.nvidia.com/en-us/data-center/technologies/hopper-architecture/
- https://www.datacenters.com/providers/jarvislabs
- https://smc.co/gpu-instances
- https://www.together.ai/gpu-clusters
- https://aws.amazon.com/blogs/machine-learning/a-review-of-purpose-built-accelerators-for-financial-services/
- https://computecomparison.com/regions
- https://news.ycombinator.com/item?id=45643163
- https://getdeploying.com/alibaba-cloud
- https://nvidianews.nvidia.com/news/china-s-top-cloud-providers-adopt-nvidia-volta-gpus-to-supercharge-next-gen-ai-services
- https://stackoverflow.com/questions/69674590/which-gpu-should-i-use-on-google-cloud-platform-gcp
- https://help.aliyun.com/en/agentbay/agentbay-security-white-paper
- https://sandbox0.ai/alternatives/alibaba-agentbay
- https://www.alibabacloud.com/help/en/express-connect/getting-started/locations-of-access-points
- https://www.alibabacloud.com/help/en/aidbs/user-guide/agent-gateway/
- https://next.api.alibabacloud.com/product/Ecs
- https://www.alibabacloud.com/help/en/asc/product-overview/billing-overview
- https://aws.amazon.com/blogs/machine-learning/building-an-agentic-ai-platform-on-amazon-bedrock-agentcore/
- https://builder.aws.com/content/34ohfAa1zLeelsXX9Z4sdVVKhU8/blueprint-vs-the-toolbox-understanding-the-difference-between-agentic-ai-and-agentcore
- https://www.youtube.com/watch?v=0CStw3NHsSY
- https://www.alibabacloud.com/blog/alibaba-cloud-brings-full-stack-ai-ecosystem-to-global-customers-for-the-agentic-era_603186
- https://www.facebook.com/alibabacloud/videos/alibaba-cloud-singapore-at-atxenterprise-2026-ai-cloud-and-data-innovation/1388429546671739/
- https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-privacy-policy
- https://careers.alibaba.com/
- https://theirstack.com/en/technology/alibaba-cloud/sg
- https://www.amazonaws.cn/en/ec2/instance-types/
- https://www.thundercompute.com/blog/ec2-gpu-instances
- https://blogs.oracle.com/cloud-infrastructure/general-availability-of-virtual-machines-with-nvidia-gpus-on-oracle-cloud-infrastructure
- https://www.ibm.com/docs/en/tarm/8.20.5?topic=resources-supported-aws-ec2-instance-types
- https://docs.coreweave.com/platform/instances/gpu-instances
- https://deeptalk.lambda.ai/t/is-there-a-list-of-instance-types-by-region-somewhere/4722
- https://www.alibabacloud.com/help/en/asc/user-guide/purchase-agent-security-center
- https://www.alibabacloud.com/help/en/security-center/billing-overview
- https://www.alibabacloud.com/blog/alibaba-clouds-major-new-release-agent-security-center-an-integrated-defense-platform-for-ai-agents-under-a-new-security-framework_602949
- https://www.alibabacloud.com/help/en/asc/product-overview/agent-security-center-defense-capabilities-official-commercial-billing-announcement
- https://help.aliyun.com/en/asc/product-overview/what-is-the-agent-security-center
- https://www.alibabacloud.com/help/en/security-center/feature-release-notes-2
- https://www.alibabacloud.com/en/product/security_center?_p_lc=1
- https://www.sentinelone.com/cybersecurity-101/cloud-security/alibaba-cloud-security/
- https://www.alibabacloud.com/help/en/functioncompute/create-a-sandbox-function-template
- https://www.alibabacloud.com/help/en/waf/web-application-firewall-3-0/product-overview/function-release-record
- https://help.aliyun.com/en/model-studio/add-an-ai-assistant-to-your-work-wechat
- https://www.alibabacloud.com/help/en/intelligent-computing-lingjun/what-is-lingjun-intelligent-calculation-service
- https://www.alibabacloud.com/blog/building-a-self-routing-multi-llm-architecture-with-alibaba-cloud-ai-gateway_603381
- https://www.chatglobal.com/AI_Agent/Agent/index.php?_a=ai_index&f=detail&id=123&lang=si
- https://www.alibabacloud.com/help/en/waf/web-application-firewall-3-0/llms.txt
- https://www.facebook.com/AlibabaCloudSEA/posts/-6-years-in-a-row-we-are-honored-to-announce-that-alibaba-cloud-has-been-recogni/882630677664833/
- https://www.alibabacloud.com/help/en/cms/cloudmonitor-2-0/what-is-cloud-monitor-2-0
- https://omdia.tech.informa.com/om145547/omdia-market-radar-cloud-service-for-chinese-enterprises-going-global-2026
- https://www.alibabacloud.com/blog/597301
- https://platform.softwareone.com/product/alibaba-cloud-function-compute-fc/PCP-6226-8204
- https://medium.com/@quetuliokervin/hands-on-guide-migrating-from-aws-lambda-to-alibaba-cloud-function-compute-7f20d5e3d4e4
- https://www.nops.io/blog/cloud-run-functions-pricing/
- https://modal.com/blog/google-cloud-function-pricing-guide
- https://azure.microsoft.com/en-us/pricing/details/functions/
- https://www.eon.io/blog/google-cloud-pricing
- https://cloudpricecalculators.com/alibaba-calculator/
- https://www.oracle.com/cloud/price-list/
- https://www.alibabacloud.com/help/en/functioncompute/pay-as-you-go-billing-methods
- https://help.aliyun.com/en/model-studio/list-models
- https://help.aliyun.com/en/model-studio/bailian-service-linked-role
- https://help.aliyun.com/en/document_detail/2400140.html
- https://www.alibabacloud.com/help/en/functioncompute/cloud-service-integration/
- https://help.aliyun.com/en/agentrun/model-management-1/
- https://www.alibabacloud.com/help/en/model-studio/cli/overview
- https://www.alibabacloud.com/help/en/analyticdb/analyticdb-for-mysql/user-guide/managed-ray-service
- https://help.aliyun.com/en/document_detail/149828.html
- https://www.alibabacloud.com/help/en/maxcompute/user-guide/maxcompute-security-white-paper
- https://www.alibabacloud.com/help/en/acr/product-overview/supported-regions
- https://www.alibabacloud.com/help/en/tablestore/use-cases/implementation-of-tablestore-memory-storage-in-hermes
- https://help.aliyun.com/en/acr/product-overview/supported-regions
- https://www.dawiso.com/glossary/microsoft-fabric-pricing
- https://www.agilytic.com/blog/microsoft-fabric-pricing
- https://help.aliyun.com/en/agentcore/overview-of-knowledge-base-connections
- https://www.alibabacloud.com/help/en/dataworks/user-guide/new-data-agent
- https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-target-connector-managed-kb.html
- https://www.facebook.com/alibabacloud/posts/nacos-32-is-out-bridging-the-gap-between-ai-experimentation-and-enterprise-grade/1372686141570141/
- https://help.aliyun.com/en/agentcore/agentcore-basic-concepts
- https://aiagentstore.ai/ai-agent-news/this-week
- https://pk.linkedin.com/in/zeeshanhanif
- https://www.computerweekly.com/resources/Cloud-computing-services
- https://www.reddit.com/user/TroyNoah6677/
- https://agents.dancingteeth.net/
- https://www.alibabacloud.com/en/product/agentloop?_p_lc=1
- https://help.aliyun.com/en/cms/cloudmonitor-2-0/what-is-an-agentloop
- https://aws.amazon.com/blogs/machine-learning/evaluate-any-agent-framework-with-amazon-bedrock-agentcore-evaluations/
- https://www.youtube.com/watch?v=4_d8lxSO9LY
- https://arize.com/blog/aws-bedrock-agentcore-observability-operationalizing-ai-agents-at-scale/
- https://www.alibabacloud.com/help/en/agentcore/high-code-agent-deployment-guide
- https://www.alibabacloud.com/help/en/agentcore/agentteams-has-been-migrated-to-agentcore
- https://www.youtube.com/watch?v=Q-tYIAuv9WI
- https://www.reddit.com/r/aicuriosity/comments/1o5pq9l/amazon_bedrock_agentcore_now_live_easy_guide_to/
- https://www.youtube.com/watch?v=cTBGIKAckKE
- https://www.alibabacloud.com/help/en/security-center/user-guide/cloud-platform-configuration-check/
- https://kestra.io/plugins/plugin-alibaba
- https://www.youtube.com/watch?v=0Za9ipwi3hg
- https://help.aliyun.com/en/maxcompute/user-guide/supported-cloud-services
- https://www.promptfoo.dev/docs/providers/alibaba/
- https://www.alibabacloud.com/help/en/clickhouse/user-guide/create-an-agent-lens-application
- https://docs.cloud.google.com/vertex-ai/docs/release-notes
- https://www.centron.de/en/tutorials/build-multi-agent-ai-systems-with-agno-ai-agent-guide
- https://docs.trendmicro.com/en-us/documentation/article/trend-vision-one-agent-package-integrity-check
- https://docs.aws.amazon.com/pdfs/securityagent/latest/userguide/securityagent.pdf
- https://dokumen.pub/agents-and-multi-agent-systems-development-platforms-toolkits-technologies.html
- https://gist.github.com/AjayRay9
- https://noise.getoto.net/tag/news/
- https://www.scribd.com/document/989237149/Microsoft-Copilot-Studio
- https://aws.amazon.com/blogs/aws/category/open-source/feed/
- https://github.com/vxcontrol/pentagi/blob/main/README.md
- https://www.scribd.com/document/991481645/Instana-Observability-1-0-309-Documentation
- https://www.donvitocodes.com/ai-news
- https://www.alibabacloud.com/blog/designing-enterprise-ai-agent-architectures-with-alibaba-cloud_603528
- https://www.alibabacloud.com/help/en/pai/knowledge-base-management
- https://help.aliyun.com/en/sdk/contact-us
- https://www.alibabacloud.com/en/press-room/alibaba-cloud-named-a-leader-in-omdia-latest-agent?_p_lc=1
- https://www.facebook.com/alibabacloud/videos/dr-feifei-li-cto-and-president-of-international-business-at-alibaba-cloud-shared/1317192583277433/
- https://www.alibabacloud.com/help/en/advisor
- https://resource.alibabacloud.com/webinar/detail.html?id=1409
- https://www.alibabacloud.com/en/product/directmail?_p_lc=1
- https://www.alibabacloud.com/help/en/direct-mail/email-sending-faqs
- https://www.alibabacloud.com/en/product/directmail/pricing?_p_lc=1
- https://www.alibabacloud.com/help/en/direct-mail/user-guide/overview
- https://help.aliyun.com/en/direct-mail/getting-started/simplified-procedure-of-sending-by-api-and-smtp
- https://www.alibabacloud.com/help/en/direct-mail/getting-started/product-rules/
- https://alibaba-cloud.medium.com/what-is-alibaba-cloud-directmail-6a5d6d20f60a
- https://www.alibabacloud.com/help/en/direct-mail/product-overview/limits
- https://sourceforge.net/software/compare/Alibaba-Cloud-Direct-Mail-vs-Alibaba-Mail/
- https://www.devopsschool.com/tutorials/alibaba-cloud-direct-mail-tutorial-architecture-pricing-use-cases-and-hands-on-guide-for-enterprise-services-cloud-communication/
- https://www.alibabacloud.com/blog/602227
- https://www.alibabacloud.com/blog/603585
- https://help.aliyun.com/en/model-studio/workflow/fc-node
- https://www.devopsschool.com/tutorials/alibaba-cloud-model-studio-tutorial-architecture-pricing-use-cases-and-hands-on-guide-for-ai-machine-learning/
- https://www.alibabacloud.com/blog/designing-multi-agent-enterprise-systems-with-alibaba-cloud_603591
- https://www.oracle.com/integration/
- https://cloud.google.com/functions
- https://support.controlup.com/docs/current-integrations
- https://axoflow.com/docs/axoflow/integrations/
- https://docs.cloud.google.com/application-integration/docs/configure-cloud-function-task
- https://docs.opsramp.com/integrations/public-cloud/oracle-cloud/supported-services/oci-functions/
- https://docs.rapid7.com/insightcloudsec/integrations-overview/
- https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-targets.html
- https://help.aliyun.com/en/eventbridge/use-cases/push-events-from-message-queue-for-apache-rocketmq-to-function-compute
- https://rocketmq.apache.org/docs/eventbridge/01RocketMQEventBridgeConcepts/
- https://rocketmq.apache.org/docs/eventbridge/03RocketMQEventBridgeQuickStart/
- https://docs.localstack.cloud/aws/services/events/
- https://serverlessland.com/serverless/visuals/eventbridge/understanding-eventbridge-targets
- https://fourtheorem.com/what-can-you-do-with-eventbridge/
- https://www.alibabacloud.com/help/en/maxcompute/user-guide/read-paimon-data-on-lake-based-on-dlf1-0-oss
- https://www.mcpinstall.com/skills/aliyun/alibabacloud-aiops-skills/alibabacloud-dts-task-manager
- https://www.alibabacloud.com/help/tr/tablestore/table-store-service/product-overview/basic-concepts
- https://help.aliyun.com/en/apsaramq-for-rocketmq/cloud-message-queue-rocketmq-5-x-series/product-overview/supported-regions
- https://help.aliyun.com/en/apsaramq-for-rocketmq/cloud-message-queue-rocketmq-4-x-series/product-overview/supported-regions
- https://www.tencentcloud.com/document/product/1113/71848
- https://rocketmq.apache.org/docs/sdk/01overview/
- https://www.alibabacloud.com/help/en/apsaramq-for-rocketmq/cloud-message-queue-rocketmq-5-x-series/developer-reference/api-rocketmq-2022-08-01-endpoint
- https://rocketmq.apache.org/
- https://help.aliyun.com/en/agentcore/agentcore-configure-dingtalk-account-integration
- https://help.aliyun.com/en/lingma/im-channel
- https://hermes-agent.nousresearch.com/docs/user-guide/messaging/weixin
- https://docs.langbot.app/en/insight/features
- https://autoclaws.org/im-integration/
- https://docs.cowagent.ai/channels
- https://agenta.ai/blog/best-open-source-ai-agent-platforms
- https://www.bloomberg.com/news/articles/2026-06-24/tencent-tests-deepseek-powered-ai-agent-for-wechat-corporate-app
- https://olano.ai/resources/wecom-dingtalk-feishu-ai-agents
- https://www.eigent.ai/blog/wechatclaw-vs-openclaw
- https://www.alibabacloud.com/help/en/jvs/chat-with-agent.md
- https://agenta.ai/docs/self-host/channels/embed-widget
- https://help.aliyun.com/en/agentrun/knowledge-base-integration-guide
- https://www.alibabacloud.com/help/en/jvs/
- https://help.aliyun.com/en/jvs/what-is-an-agentic-computer
- https://www.alibabacloud.com/campaign/jvs?_p_lc=1
- https://www.mobileworldlive.com/ai-cloud/alibaba-cloud-expands-agentic-ai-push-to-france/
- https://thepaypers.com/payments/news/alibaba-cloud-launches-agentic-ai-ecosystem-for-global-customers
- https://www.youtube.com/watch?v=PlDk2FjRmP4
- https://help.aliyun.com/en/tablestore/memory-storage-service-sub-product-test/agentstorage-instance-11
- https://www.alibabacloud.com/help/en/slb/application-load-balancer/developer-reference/api-alb-2020-06-16-endpoint
- https://www.alibabacloud.com/help/en/nas/developer-reference/api-nas-2017-06-26-endpoint
- https://www.alibabacloud.com/help/en/ecs/developer-reference/api-ecs-2014-05-26-runinstances
- https://www.alibabacloud.com/help/en/model-studio/video-to-video-guide
- https://www.alibabacloud.com/help/en/cen/support/faq-1
- https://help.aliyun.com/en/agentcore/api-agentcore-2026-08-04-endpoint
- https://help.aliyun.com/en/kms/key-management-service/developer-reference/api-kms-2016-01-20-endpoint
- https://www.alibabacloud.com/help/en/sms/developer-reference/api-dysmsapi-2018-05-01-endpoint
- https://next.api.alibabacloud.com/api/AgentRun/2025-09-10/UpdateTool?RegionId=
- https://github.com/aliyun/alibabacloud-agent-toolkit
- https://next.api.alibabacloud.com/api/AgentRun/2025-09-10/UpdateAgentRuntime?RegionId=
- https://error-center.alibabacloud.com/api/AgentRun/2025-09-10/ListCustomDomains
- https://next.api.alibabacloud.com/api/AgentRun/2025-09-10/GetCodeInterpreter
- https://error-center.alibabacloud.com/api/AgentRun/2025-09-10/UpdateWorkspace
- https://error-center.alibabacloud.com/api/AgentRun/2025-09-10/UpdateWorkspaceDiscoveryEndpoints
- https://api.alibabacloud.com/api/vpc/undefined
- https://next.api.alibabacloud.com/api/Rds/2014-08-15/DescribeBackupDatabase?RegionId=cn-beijing
- https://next.api.alibabacloud.com/api/tdsr
- https://help.aliyun.com/en/tablestore/memory-storage-service-sub-product-test/memory-storage-overview
- https://mem0.ai/library/agent-memory/short-term-vs-long-term-memory-in-ai
- https://atlan.com/know/long-term-vs-short-term-ai-memory/
- https://supermemory.ai/blog/what-is-long-term-memory-ai/
- https://www.youtube.com/watch?v=KZPo15M2DbM&vl=en-US
- https://arxiv.org/html/2601.01885v3
- https://propelius.tech/blogs/agent-memory-patterns-langchain/
- https://www.linkedin.com/posts/ashpreetbedi_mastering-agentic-memory-3-types-of-activity-7254922382144942080-gVZy
- https://docs.litellm.ai/docs/simple_proxy
- https://medium.com/data-science-collective/running-litellm-as-a-proxy-in-front-of-multiple-llm-providers-528f74ebb30b
- https://docs.litellm.ai/
- https://www.youtube.com/watch?v=WyW4Ifu4rSo
- https://builder.aws.com/content/3FSm2sdhLGlHbGFc4kLvPDleEFa/build-a-local-litellm-ai-gateway-to-test-model-routing-and-cost-attribution
- https://www.spheron.network/blog/ai-gateway-litellm-portkey-kong-gpu-cloud/
- https://arize.com/docs/ax/cookbooks/instrument/litellm-guide
- https://agenta.ai/blog/top-llm-gateways
- https://www.litellm.ai/about
- https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/code-interpreter-tool.html
- https://sandbox.agent-infra.com/blog/announcing-0
- https://www.facebook.com/groups/vibecodingforbeginners/posts/1636038131411418/
- https://modal.com/resources/best-code-execution-sandboxes-mcp-servers
- https://www.reddit.com/r/mcp/comments/1m69xtx/is_there_an_mcp_for_a_code_sandbox_to_execute/
- https://github.com/agent-infra/sandbox
- https://help.aliyun.com/en/functioncompute/using-sandbox-agent-skills-in-beta
- https://www.philschmid.de/code-sandbox-mcp
- https://www.marktechpost.com/2026/03/29/agent-infra-releases-aio-sandbox-an-all-in-one-runtime-for-ai-agents-with-browser-shell-shared-filesystem-and-mcp/
- https://www.alibabacloud.com/help/en/jvs/agentic-computer-billing-instructions
- https://www.alibabacloud.com/help/en/jvs/quickly-create-and-use-an-agentic-computer
- https://www.youtube.com/watch?v=x2HenpowB4Y
- https://alexmarket.medium.com/getting-started-with-alibaba-cloud-pros-cons-and-key-differences-95e570e52a2c
- https://www.alibabacloud.com/blog/alibaba-cloud-a-legacy-that-goes-beyond-cloud-computing_598180
- https://help.aliyun.com/en/model-studio/model-log-backflow
- https://www.alibabacloud.com/help/en/model-studio/data-import-instructions
- https://www.alibabacloud.com/help/en/serverless-workflow/latest/develop-reference
- https://airflow.apache.org/docs/apache-airflow-providers-common-ai/stable/supported_services.html
- https://help.aliyun.com/en/functioncompute/cloud-product-event-triggers-overview
- https://alibaba-cloud.medium.com/use-fun-and-function-compute-together-with-the-oss-trigger-6aa2bca0836b
- https://www.youtube.com/watch?v=ZsVcig8-JUo
- https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-what-is.html
- https://registry.terraform.io/providers/aliyun/alicloud/latest/docs/resources/event_bridge_event_source_v2
- https://docs.openfaas.com/reference/triggers/
- https://dev.to/slsbytheodo/9-surprises-using-aws-eventbridge-scheduler-13b6
- https://www.alibabacloud.com/help/en/model-studio/faq-about-alibaba-cloud-model-studio
- https://help.aliyun.com/en/model-studio/faq-about-alibaba-cloud-model-studio
- https://community.n8n.io/t/new-ai-agent-gcp-vertex-ai-agent-studio-support/318703
- https://www.alibabacloud.com/help/en/open-search/search-platform/product-overview/introduction-to-search-platform
- https://www.alibabacloud.com/blog/alibaba-cloud-ai-search-solution-explained-intelligent-search-driven-by-large-language-models-helping-enterprises-in-digital_601971
- https://help.aliyun.com/en/open-search/search-platform/
- https://digitalmarket.world/content-en/success-stories/36_li-yanhong-baidu-ai.html
- https://www.alibabacloud.com/en/product/opensearch?_p_lc=1
- https://www.alibabacloud.com/help/en/open-search/search-platform/getting-started/knowledge-base-management
- https://www.alibabacloud.com/blog/opensearch-a-one-stop-solution-to-easily-integrate-llm-generative-ai-in-your-application_600509
- https://www.alibabacloud.com/blog/build-conversational-search-based-on-opensearch-vector-search-edition-integrated-with-a-large-language-model_600119
- https://www.linkedin.com/posts/alibaba-cloud-computing-company_alibaba-cloud-opensearch-activity-7194606679261396992-31GI
- https://www.alibabacloud.com/help/en/open-search/
- https://technologymagazine.com/articles/alibaba-cloud-solution-helping-enterprises-harness-gen-ai
- https://www.alibabacloud.com/help/en/pai/use-cases/build-rag-dialogue-system-based-on-eas-and-opensearch
- https://aws.amazon.com/blogs/big-data/build-conversational-ai-search-with-amazon-opensearch-service/
- https://www.alibabacloud.com/en/product/milvus?_p_lc=1
- https://www.alibabacloud.com/blog/what%E2%80%99s-a-vector-database-really-and-why-your-ai-stack-might-be-overcomplicated_602907
- https://www.alibabacloud.com/help/en/vrs/latest/opening-service
- https://milvus.io/
- https://medium.com/@zzzeko2024/vector-search-using-alibaba-cloud-inference-api-and-semantic-text-4c5095b8abea
- https://zilliz.com/comparison/milvus-vs-elastic
- https://www.alibabacloud.com/blog/unlock-the-power-of-vector-search-alibaba-cloud-elasticsearch-with-the-aliyun-knn-plugin_601101
- https://help.aliyun.com/en/milvus/product-overview/what-is-the-vector-retrieval-milvus-version
- https://www.alibabacloud.com/en/product/dashvector?_p_lc=1
- https://milvus.io/blog/elasticsearch-is-dead-long-live-lexical-search.md
- https://www.instagram.com/reel/DemRRL9TXjM/
- https://www.facebook.com/groups/1051140380161347/posts/1135676538374397/
- https://www.linkedin.com/posts/limseeyew_if-china-can-build-different-ai-economies-activity-7492225934360686592-JV39
- https://www.antgroup.com/en/about/our-offices
- https://www.youtube.com/watch?v=b0-Gc5A1Dyo
- https://www.tencentcloud.com/document/product/215/31786
- https://www.ant-intl.com/en/locations/
- https://www.facebook.com/lengdungtungchamma/videos/the-regent-international-apartment-building-in-hangzhou-china-is-renowned-for-ho/951084361172117/
- https://www.youtube.com/watch?v=ocx2IP3o_lI
- https://www.alibabacloud.com/blog/what-is-low-code_597659
- https://github.com/aliyun/iac-code
- https://www.facebook.com/alibabacloud/videos/model-studio-finalmp4/874348851197500/
- https://www.alibabacloud.com/help/en/model-studio/mcp
- https://developers.zoom.us/docs/mcp/
- https://docs.aws.amazon.com/marketplace/latest/developerguide/marketplace-mcp-server.html
- https://infrabase.ai/inference-apis/alibaba-cloud-model-studio
- https://www.youtube.com/watch?v=HCYc8Z6WS5c
- https://learn.microsoft.com/en-us/power-platform/release-plan/2024wave2/power-automate/use-natural-language-create-teams
- https://arxiv.org/html/2407.12821v1
- https://www.reddit.com/r/MicrosoftFlow/comments/10s5o5q/create_cloud_flows_with_ai_share_your_thoughts/
- https://kissflow.com/workflow/workflow-automation-meets-natural-language-processing/
- https://epinium.com/en/blog/natural-language-to-workflows-the-future-of-automation/
- https://docs.cloud.google.com/gemini/enterprise/docs/workflow-builder/create-natural-language
- https://flowwright.com/blog/natural-language-programming-using-flowwright
- https://docs.oracle.com/en/cloud/paas/application-integration/oracle-integration-oci/ai-feature-availability.html
- https://www.alibabacloud.com/help/es/model-studio/mcp
- https://www.developersdigest.tech/reference/api-compatibility/qwen
- https://www.alibabacloud.com/blog/an-introduction-to-alibaba-cloud-free-trial_599913
- https://help.aliyun.com/en/viapi/support/billing-pricing-class
- https://builder.aws.com/content/38T0GFGjjCXK9PRFgrDqZSpstw6/agentcore-gateway-a-control-plane-moment-for-agentic-tools-development
- https://www.alibabacloud.com/help/en/agentcore/product-overview.md
- https://www.alibabacloud.com/help/en/functioncompute/product-changes-changes-of-billable-items-resource-plans-and-trial-quota-of-function-compute
- https://www.alibabacloud.com/help/en/functioncompute/trial-quota-1
- https://faun.dev/toolbox/alibaba-cloud-function-compute-vs-kubeless/
- https://www.alibabacloud.com/help/en/functioncompute/endpoints
- https://www.alibabacloud.com/help/en/dataworks/developer-reference/api-dataworks-public-2020-05-18-endpoint
- https://www.oracle.com/news/announcement/oracle-expands-ai-agent-studio-for-fusion-applications-with-agentic-applications-builder-2026-03-24/
- https://www.elire.com/blog/oracle-ai-agent-studio-26c-four-key-updates
- https://community.hyland.com/kb/articles/330-2026-release-notes-agent-builder
- https://about.fb.com/news/2026/09/introducing-muse-personal-ai-agent/
- https://www.microsoft.com/en-us/copilot/blog/copilot-studio/new-and-improved-computer-using-agents-a-new-workflows-experience-and-real-time-voice-experiences/
- https://www.prnewswire.com/news-releases/oracle-ai-agent-studio-for-industry-applications-helps-accelerate-business-outcomes-302914801.html
- https://help.make.com/2026?1s=%24%28id%29&1t=%24%28id%29&2c=%24%28id%29&2v=%24%28id%29&2x=%24%28id%29&3a=%24%28id%29&3e=%24%28id%29&6e=%24%28id%29&8j=%24%28id%29&View=%24%28id%29&WEB-INF=%24%28id%29&a9=%24%28id%29&add_comment=%24%28id%29&add_tag=%24%28id%29&aid=%24%28id%29&allowed=%24%28id%29&arg=%24%28id%29&bitops=%24%28id%29&bm=%24%28id%29&boolean=%24%28id%29&bytes=%24%28id%29&cd=%24%28id%29&columns=%24%28id%29&d4=%24%28id%29&data=%24%28id%29&date=%24%28id%29&dy=%24%28id%29&endpoint=%24%28id%29&entrypoint=%24%28id%29&eo=%24%28id%29&errors=%24%28id%29&etc=%24%28id%29&fh=%24%28id%29&filter_relational_operator_3=%24%28id%29&graphics=%24%28id%29&ha=%24%28id%29&hideliu=%24%28id%29&historyfile=%24%28id%29&hr=%24%28id%29&is=%24%28id%29&j8=%24%28id%29&ja_JP=%24%28id%29&libraries=%24%28id%29&m32r=%24%28id%29&map=%24%28id%29&md=%24%28id%29&memory=%24%28id%29&month=%24%28id%29&musb=%24%28id%29&nd=%24%28id%29&o4=%24%28id%29&on=%24%28id%29&pag=%24%28id%29&phy=%24%28id%29&playback=%24%28id%29&post_type=%24%28id%29&printable=%24%28id%29&progress=%24%28id%29&ps=%24%28id%29&redirection_url=%24%28id%29&rev=%24%28id%29&rm=%24%28id%29&runtime=%24%28id%29&staticfile=%24%28id%29&subscribe=%24%28id%29&testdata=%24%28id%29&time=%24%28id%29&transferfile=%24%28id%29&trigger=%24%28id%29&v7=%24%28id%29&viewfile=%24%28id%29&web=%24%28id%29&webfile=%24%28id%29&withdraw=%24%28id%29&xw=%24%28id%29&xz=%24%28id%29&z4=%24%28id%29
- https://www.sap.com/topics/events/sapphire/innovation-news-guide-2026
- https://erp.today/oracle-launches-fusion-agentic-applications-and-expands-ai-agent-studio-to-operationalize-enterprise-workflows/
- https://www.alibabacloud.com/help/en/model-studio/kimi-api
- https://www.alibabacloud.com/en/campaign/promo-singapore-2025?_p_lc=1
- https://www.alibabacloud.com/blog/603043
- https://www.alibabacloud.com/help/en/model-studio/qwen-livetranslate-java-sdk
- https://techjacksolutions.com/ai-tools/qwen/qwen-api-guide/
- https://puppyip.com/en/resources/alibaba-model-studio-workspace-domain-migration-guide
- https://www.alibabacloud.com/help/en/serverless-workflow/latest/product-dynamics
- https://www.alibabacloud.com/blog/accelerate-business-workflows-a-deep-dive-into-cloudflows-stateful-application-orchestration_600667
- https://aws.amazon.com/blogs/machine-learning/human-in-the-loop-constructs-for-agentic-workflows-in-healthcare-and-life-sciences/
- https://www.alibabacloud.com/help/en/agentcore/team-collaboration-instructions-collaboration-teamharness.md
- https://www.reddit.com/r/AI_Agents/comments/1wjmxy0/whats_one_ai_agent_task_that_became_much_easier/
- https://www.youtube.com/watch?v=SC3pHo-CycI
- https://learn.microsoft.com/en-us/agent-framework/workflows/human-in-the-loop
- https://t0ggles.com/for/ai-agents
- https://www.alibabacloud.com/help/en/agentcore/use-team-web-to-set-tasks
- https://help.aliyun.com/en/agentcore/
- https://www.alibabacloud.com/help/en/agentcore/guidelines-for-the-use-of-local-nanoagent
- https://www.alibabacloud.com/help/en/agentcore/overview-of-knowledge-base-connections
- https://help.aliyun.com/en/agentcore/team-collaboration-instructions-collaboration-teamharness
- https://help.aliyun.com/en/agentcore/using-team-tasks
- https://help.aliyun.com/en/agentcore/set-up-team-collaboration
- https://vinayakpandey-7997.medium.com/build-an-auto-evaluating-ai-agent-amazon-bedrock-agentcore-llm-as-a-judge-2f3b13a6ac08
- https://aws.amazon.com/blogs/machine-learning/automated-agent-evaluation-with-amazon-bedrock-agentcore-and-github-actions/
- https://github.com/aliyun/alibabacloud-aiops-skills/blob/master/skills/aiml/agentloop/alibabacloud-agentloop-evaluation/SKILL.md
- https://www.alibabacloud.com/help/en/agentcore/create-a-high-code-agent-using-the-python-sdk
- https://aws.amazon.com/blogs/developer/building-and-deploying-net-ai-agents-with-amazon-bedrock-agentcore/
- https://help.aliyun.com/en/agentcore/agentcore-sdk-high-code-collaboration-guide
- https://dev.to/aws/deploying-ai-agents-on-aws-without-creating-a-security-mess-4i
- https://github.com/aws/bedrock-agentcore-sdk-python/blob/main/README.md
- https://www.alibabacloud.com/help/en/serverless-workflow/llms.txt
- https://help.aliyun.com/en/document_detail/2507664.html
- https://help.aliyun.com/en/document_detail/164476.html
- https://www.alibabacloud.com/help/en/serverless-workflow/latest/getting-started-overview
- https://help.aliyun.com/en/document_detail/2500862.html
- https://help.aliyun.com/en/document_detail/2593755.html/llms.txt
- https://www.alibabacloud.com/help/ja/serverless-workflow/llms.txt
- https://www.alibabacloud.com/help/en/simple-application-server/product-overview/release-notes
- https://www.alibabacloud.com/help/en/resource-management/product-overview/release-notes
- https://help.aliyun.com/en/alinux/product-overview/release-notes-for-alibaba-cloud-linux
- https://www.eqs-news.com/news/corporate/alibaba-cloud-launches-first-public-cloud-region-in-the-netherlands/20d26c01-314d-41a0-86f1-de1e2a03203d_en
- https://www.alibabacloud.com/help/en/cdn/product-overview/release-notes
- https://www.alibabacloud.com/help/en/api-gateway/cloud-native-api-gateway/user-guide/create-service
- https://help.aliyun.com/en/document_detail/113557.html/llms.txt
- https://www.alibabacloud.com/help/en/serverless-workflow/latest/distributed-mode
- https://help.aliyun.com/en/functioncompute/speed-mode-cu-pricing-change-and-new-resource-package-monthly-package
- https://help.aliyun.com/en/document_detail/2400186.html
- https://www.alibabacloud.com/help/en/serverless-workflow/latest/interface-overview
- https://www.alibabacloud.com/help/en/serverless-workflow
- https://www.alibabacloud.com/help/en/serverless-workflow/latest/flow-definition-language-overview
- https://www.alibabacloud.com/help/doc-detail/2693271.html
- https://www.alibabacloud.com/help/en/eventbridge/user-guide/routing-to-a-serverless-workflow
- https://www.alibabacloud.com/help/en/serverless-workflow/latest/billing-overview
- https://help.aliyun.com/en/document_detail/2597497.html
- https://help.aliyun.com/en/document_detail/2594531.html
- https://www.cncloudsecond.com/en/blog/alibaba-cloud-international-billing-complete-guide-pricing-cloudstack-authorized/
- https://platform.softwareone.com/product/cloudflow/PCP-1756-9927
- https://digioffly.com/activepieces-review/
- https://www.alibabacloud.com/help/en/serverless-workflow/latest/error-handling
- https://www.alibabacloud.com/help/en/serverless-workflow/latest/reliably-process-distributed-multi-step-transactions
- https://help.aliyun.com/en/document_detail/2579617.html
- https://www.alibabacloud.com/help/en/serverless-workflow/latest/poll-for-task-status
- https://docs.cloud.google.com/tasks/docs/configuring-queues
- https://www.alibabacloud.com/help/en/serverless-workflow/latest/foreach-steps
- https://www.alibabacloud.com/help/en/serverless-workflow/latest/terms
- https://developer.sailpoint.com/discuss/t/workflow-loops-not-working/113170
- https://www.reddit.com/r/MicrosoftFlow/comments/1ktb4zi/for_each_loops_in_cloud_flows_is_it_possible_to/
- https://help.aliyun.com/en/dataphin/fullmanaged/user-guide/foreach-loop
- https://www.youtube.com/watch?v=kEa27SAmkMA
- https://docs.cloud.google.com/billing/docs/release-notes
- https://www.section.io/docs/explanations/billing/
- https://billingplatform.com/blog/product-update-enhancements-to-leading-cloud-billing-system
- https://v2.support.procore.com/process-guides/modernized-owner-invoicing-transition-guide/transition-steps
- https://www.youtube.com/watch?v=CtVFHQ6mE9M
- https://www.instagram.com/reel/DNt7Qs12iAs/?hl=en
- https://www.facebook.com/stpeterunningcompany32/posts/the-long-awaited-update-to-the-on-cloudflow-has-happened-and-its-a-good-one-they/829935052468264/
- https://docs.cloudzero.com/docs/cost-types
- https://docs.opsramp.com/integrations/public-cloud/alibaba/supported-services/alibaba-function-compute/
- https://alibaba-cloud.medium.com/flexibly-managed-compute-resources-using-function-compute-11ab58953403
- https://help.doit.com/docs/operate/cloudflow/intro
- https://www.sumologic.com/help/docs/integrations/automation-integrations/google-cloud-functions/
- https://docs.aws.amazon.com/decision-guides/latest/decision-guides/application-integration-on-aws-how-to-choose.html
- https://community.n8n.io/t/how-to-create-ai-agent-using-alibaba-llm-qwen-plus/248502?tl=en
- https://www.alibabacloud.com/help/en/pai/create-a-workflow-application
- https://docs.aws.amazon.com/step-functions/latest/dg/workflow-studio.html
- https://www.youtube.com/watch?v=o9tn7ZxPYhc
- https://constructs.dev/packages/@matthewbonig/state-machine/
- https://dev.to/aws-builders/supercharge-your-stepfunctions-productivity-with-local-file-system-sync-in-workflow-studio-4ab9
- https://help.nintex.com/en-us/nintex2019/current/sp2019/Workflow/ActionsCore/StateMachine.htm
- https://learn.microsoft.com/en-us/dotnet/framework/windows-workflow-foundation/state-machine-workflows
- https://community.temporal.io/t/workflow-maintainability-abstract-into-a-state-machine-vs-standard-workflow-function/7220
- https://www.servicenow.com/docs/r/store-release-notes/store-platcap-rn-workflow-studio.html?contentId=qD4Zf9T8oyfVN2ESU9Ic1Q
- https://symfony.com/doc/current/workflow/workflow-and-state-machine.html
- https://www.alibabacloud.com/help/en/eventbridge/user-guide/route-events-to-function-compute
- https://www.alibabacloud.com/help/en/eventbridge/user-guide/event-target-parameters
- https://www.alibabacloud.com/help/en/eventbridge/latest/event-bus-overview
- https://help.aliyun.com/en/eventbridge/user-guide/routing-to-a-serverless-workflow
- https://slashdot.org/software/comparison/Alibaba-Cloud-EventBridge-vs-Alibaba-Function-Compute/
- https://aws.amazon.com/blogs/compute/simplifying-cross-account-access-with-amazon-eventbridge-resource-policies/
- https://help.aliyun.com/en/mns/product-overview/announcements-and-updates/
- https://upsun.com/blog/introduction-to-message-queues/
- https://www.reddit.com/r/softwarearchitecture/comments/1kn63sj/whats_your_goto_message_queue_in_2025/
- https://www.linkedin.com/posts/sina-riyahi_message-queue-a-message-queue-is-a-communication-activity-7329045384427663360-TuZk
- https://jasongiroux.com/2025/11/11/building-smq-a-lightweight-scheduled-message-queue-in-go/
- https://vivekbansal.substack.com/p/message-queues-vs-message-brokers
- https://www.geeksforgeeks.org/system-design/message-queues-system-design/
- https://dev.to/icepanel/top-6-message-queues-for-distributed-architectures-3hmb
- https://www.alibabacloud.com/help/en/eventbridge/product-overview/billing-overview
- https://aws.amazon.com/eventbridge/pricing/
- https://www.alibabacloud.com/help/en/eventbridge/product-overview/eventbridge-billing/
- https://cloudburn.io/blog/amazon-eventbridge-pricing
- https://www.cloudzero.com/blog/aws-eventbridge-pricing/
- https://www.alibabacloud.com/help/en/eventbridge/product-overview/billing-of-event-buses
- https://repost.aws/questions/QUNWhNp8a_TA6NfiiDp50Gcw/pricing-for-amazon-bridge-schedule
- https://awsfundamentals.com/blog/aws-eventbridge-pricing-guide
- https://www.reddit.com/r/aws/comments/iukfky/eventbridge_pricing/
- https://www.alibabacloud.com/help/en/functioncompute/cloud-product-event-triggers-overview
- https://stackoverflow.com/questions/51148070/how-to-create-a-scheduled-task-in-alibaba-cloud
- https://help.aliyun.com/en/document_detail/2513229.html
- https://www.alibabacloud.com/help/en/eventbridge/use-cases/publish-and-route-custom-application-events
- https://sourceforge.net/software/compare/Alibaba-Cloud-EventBridge-vs-Temporal/
- https://docs.cloud.google.com/functions/quotas
- https://hidekazu-konishi.com/entry/aws_service_quotas_practical_cheat_sheet.html
- https://learn.microsoft.com/en-us/azure/azure-functions/functions-scale
- https://awsfundamentals.com/limits
- https://trendmicro.com/trendaivisiononecloudriskmanagement/knowledge-base/aws/EC2/account-instance-limit.html
- https://firebase.google.com/docs/functions/quotas
- https://docs.oracle.com/iaas/Content/General/service-limits/default.htm
- https://www.alibabacloud.com/help/en/agentrun/call-flow-agent-using-ai-gateway-1.md
- https://www.alibabacloud.com/help/en/agentrun/agenrun-hint-variable-dynamic-injection.md
- https://camelai.com/run
- https://agentrun.ai/
- https://www.alibabacloud.com/help/en/functioncompute/fc/user-guide/real-time-inference-scenarios-1
- https://www.alibabacloud.com/help/en/functioncompute/instance-scaling-restrictions-and-rules
- https://registry.terraform.io/providers/aliyun/alicloud/latest/docs/resources/fcv3_function
- https://stackoverflow.com/questions/62005562/aws-lambda-the-function-is-idle
- https://aws.amazon.com/blogs/machine-learning/secure-ingress-connectivity-to-amazon-bedrock-agentcore-gateway-using-interface-vpc-endpoints/
- https://www.alibabacloud.com/help/en/agentcore/configure-the-agentcore-network
- https://builder.aws.com/content/3DG5AhVuXBxmEFKQG99tHMC0nFi/securing-agentic-ai-on-amazon-bedrock-agentcore-zero-trust-private-networking-and-identity-patterns
- https://repost.aws/questions/QUFSqmbGXbTMWD48izOZDfoA/connect-aws-agentcore-bedrock-gateway-target-to-private-apis-within-a-vpc
- https://trendmicro.com/trendaivisiononecloudriskmanagement/knowledge-base/aws/BedrockAgentCore/protect-agentcore-runtime-with-vpc.html
- https://www.alibabacloud.com/help/en/pai/dedicated-service-gateway/
- https://www.youtube.com/watch?v=MmYsSkAyGVU
- https://www.alibabacloud.com/help/en/pai/configure-network-connectivity
- https://www.alibabacloud.com/help/en/direct-mail/user-guide/set-up-eventbridge
- https://stackoverflow.com/questions/51582792/receving-email-using-alibaba-cloud-direct-mail
- https://community.n8n.io/t/built-in-mailhooks-for-triggering-workflows-by-sending-mail/54737?tl=en
- https://www.alibabacloud.com/help/en/functioncompute/api-createtrigger
- https://community.home-assistant.io/t/using-the-imap-integration-to-create-a-custom-event-from-an-email-help-please/608818
- https://github.com/argoproj/argo-events/issues/2497
- https://www.alibabacloud.com/help/en/eventbridge/user-guide/alibaba-cloud-service-event-sources
- https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-saas.html
- https://community.genesys.com/discussion/eventbridge-partner-event-source
- https://oneuptime.com/blog/post/2026-02-12-eventbridge-saas-integrations/view
- https://repost.aws/questions/QU7X2K9l8WQ8GW6_9q05O1SQ/event-sources-of-an-event-bus-in-aws-eventbridge
- https://sourceforge.net/software/product/Alibaba-Cloud-EventBridge/alternatives
- https://www.alibabacloud.com/help/en/ecs/user-guide/use-eventbridge-to-quickly-subscribe-to-ecs-events
- https://www.youtube.com/watch?v=28B4L1fnnGM
- https://builder.aws.com/content/3Hf9FvKpqwNHpsFAwwK6HPjqC2E/securing-ai-agent-actions-with-temporal-policies-and-rate-limiting-in-amazon-bedrock-agentcore
- https://aws.amazon.com/blogs/machine-learning/securing-ai-agents-with-temporal-policies-in-amazon-bedrock-agentcore/
- https://www.alibabacloud.com/blog/stop-rebuilding-your-app-for-ai--add-an-agent-instead-_603680
- https://repost.aws/questions/QUxF-cmDlzTdmxgydtfe3BOw/validationexception-when-configuring-invoking-bedrock-agent-with-qwen-qwen3-32b-v1-0
- https://www.facebook.com/AlibabaCloudSEA/posts/consider-a-customer-service-workflow-an-agent-checks-a-delivery-status-and-draft/1145397018054863/
- https://towardsaws.com/agentcore-for-health-insurance-prior-authorization-fast-approvals-human-denials-8ba42dbed5f9
- https://www.linkedin.com/posts/rmprado_implement-human-in-the-loop-confirmation-activity-7319096025657294848-4chn
- https://www.alibabacloud.com/help/en/agentrun/api-agentrun-2025-09-10-flow
- https://www.alibabacloud.com/help/en/agentrun/api-agentrun-2025-09-10-convertflowdsldata.md
- https://www.alibabacloud.com/help/en/doc-detail/424711.html
- https://www.alibabacloud.com/help/en/starops/user-guide/task-execution-and-human-intervention
- https://www.alibabacloud.com/help/en/agentrun/api-agentrun-2025-09-10-convertflowdsl.md
- https://www.alibabacloud.com/help/en/agentrun/api-agentrun-2025-09-10-convertflowdslinput.md
- https://help.aliyun.com/en/agentrun/api-agentrun-2025-09-10-convertflowdsl
- https://github.com/alibaba/spring-ai-alibaba/issues/2077
- https://docs.dify.ai/en/cloud/use-dify/monitor/integrations/integrate-aliyun
- https://www.alibabacloud.com/help/en/model-studio/dify
- https://docs.dify.ai/en/cloud/use-dify/workspace/export-import-apps
- https://www.alibabacloud.com/help/doc-detail/3032987.html
- https://github.com/langgenius/dify/discussions/34916
- https://www.youtube.com/watch?v=IwSkscKac4Q
- https://www.alibabacloud.com/blog/602527
- https://www.alibabacloud.com/help/en/pai/node-reference
- https://www.youtube.com/watch?v=6wNPZxq5opU
- https://medium.com/@kunalkushwaha/building-ai-agents-with-agentflow-a-beginners-journey-f997a0af36d3
