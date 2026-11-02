I'll research this systematically, starting with broad searches on Alibaba Cloud's official agentic AI solutions and reference architectures.

Good starting points. Let me dig into the Architecture Center and specific solution pages.

Let me explore the Reference Architecture Center and solution pages in more detail.

Found the "tech-solution" section. Let me explore it thoroughly.

Let me enumerate the tech-solution catalog more fully.

Now let me dig into specific verticals and the key guidance blogs.

Now let me focus on customer case studies with named international customers.

Found the official AI Agent Handbook on GitHub. Let me dig into it.

Let me verify two important details before writing up.

# Alibaba Cloud official reference architectures, solutions and customer cases for agentic AI (international)

**Research date: 2026-11-02.** Everything below was found on alibabacloud.com (international), help.aliyun.com (flagged **China site only**), alibabagroup.com, or Alibaba's official GitHub orgs. Where a search snippet did not expose a detail (notably the *region* tables inside Technical Solution pages), I have marked it **unconfirmed — open the page** rather than guessing.

---

## 0. Three findings that change your verified-facts baseline

| # | Finding | Source |
|---|---|---|
| 1 | **PAI-LangStudio is being retired.** "Due to product strategy changes, the LangStudio feature for building LLM-based applications will be officially retired on **March 9, 2027 at 16:00**." LangStudio is the PAI agent-dev platform that owns the knowledge-base and workflow-node features. Do **not** put it in the catalog as a target runtime. | https://www.alibabacloud.com/help/en/pai/product-overview/pai-langstudio-feature-retirement-and-migration-guide ; https://www.alibabacloud.com/help/en/pai/langstudio-overview/ ; https://www.alibabacloud.com/help/en/pai/create-a-code-based-application |
| 2 | **AgentCore does list Singapore.** The international product-overview page's region table reads "China (Hangzhou). cn-hangzhou. China (Beijing). cn-beijing." and also "Singapore. ap-southeast-1." — consistent with your plan to offer AgentCore to international customers, but the table leads with China regions so verify the full list in-console. | https://www.alibabacloud.com/help/en/agentcore/agentcore-product-overview |
| 3 | **AgentRun Open Platform (FunAgent) is in Hong Kong *and* Singapore**, not Singapore alone: "The Open Platform is available in the China (Hong Kong) and Singapore regions." This refines (does not contradict) your "AgentRun's only international endpoint is Singapore" note — the *platform* sub-feature adds HK. | https://www.alibabacloud.com/help/en/agentrun/open-platform-introduction.md |

I found nothing contradicting the qwen3.8-max price, the Model Studio region list, the 2025-04-21 application gate, or the AgentLoop/AI Search Open Platform region limits. The gate is re-confirmed verbatim in three international docs: "Only users who created Alibaba Cloud Model Studio applications in the Singapore region before April 21, 2025 can …" [https://www.alibabacloud.com/help/en/model-studio/rag-knowledge-base] [https://www.alibabacloud.com/help/en/model-studio/single-agent-application] [https://www.alibabacloud.com/help/en/model-studio/application-introduction].

---

## 1. Where Alibaba Cloud actually publishes agentic patterns

There is **no agentic-AI entry in the Architecture Center reference-architecture catalog**. The Architecture Center (https://www.alibabacloud.com/en/architecture/index, https://www.alibabacloud.com/en/architecture/ref-architecture/index, https://www.alibabacloud.com/en/architecture/quick-start) surfaces Well-Architected guidance and Quick Start templates; the AI-agent material lives in four other places:

1. **Technical Solutions** — deployable, click-to-deploy guides: https://www.alibabacloud.com/en/solution/tech-solution/ ("End-to-end technical solutions and ready-to-use deployment guides"). Its "Popular solutions" row already includes *Build a private Q&A app with RAGFlow*, *Multimodal data extraction*, *Deploy Dify and build AI applications* [https://www.alibabacloud.com/en/solution/tech-solution/]. Free-trial variants: https://www.alibabacloud.com/en/solutions/free
2. **Solution landing pages** — https://www.alibabacloud.com/en/solutions/generative-ai, /generative-ai/build, /generative-ai/rag, /generative-ai/qwen, /ai-chatbots, /ai-application/real-time-interaction, /ai-application-information-extraction
3. **Help-centre best practices** — per-product `use-cases` / `best-practices` trees (ACK, ACS, Function Compute, Tablestore, AnalyticDB, IMS, AgentRun, Agent Sandbox)
4. **Blog + open-source** — the enterprise-agent blog series, the `aliyun/ai-agent-handbook` repo, and the Well-Architected AI pillar

---

## 2. TABLE A — Deployable Technical Solutions (the closest thing to official reference architectures)

| Solution | Use case | Products | Workflow steps as documented | Region | China-only parts | URL |
|---|---|---|---|---|---|---|
| **Build a private Q&A application with RAGFlow** | Enterprise knowledge assistant (RAG) | RAGFlow, one-click deploy on Alibaba Cloud; "solves common problems with local deployment, such as long deployment times" | Single-click deployment; steps not exposed in snippet — **open page** | **unconfirmed** | None identified; RAGFlow also offered as a managed integration inside AI-Native Database Service | https://www.alibabacloud.com/solution/tech-solution-deploy/2926764 |
| **Deploy Dify and build AI applications** | Agent + workflow platform, RAG | Container Service for Kubernetes (ACK); Dify **v1.11.4**; "cloud-native, high-availability architecture" | Two variants: **testing** = "single-instance version of Dify … for a staging environment"; **production** = "private, high-availability version of Dify … for production" → then "Build an AI application with Dify" | **unconfirmed** (ACK is broadly international) | None | Landing: https://www.alibabacloud.com/en/solution/tech-solution/rapidly-deploy-dify-to-accelerate-ai-application-development · Test: https://www.alibabacloud.com/en/solution/tech-solution-deploy/2870155 · Prod: https://www.alibabacloud.com/en/solution/tech-solution-deploy/2871859 |
| **Extract insights from multimodal data** (a.k.a. Multimodal Content Extraction) | Document / image / video parsing and extraction | Model Studio multimodal inference; sub-deployment uses **Function Compute + Object Storage Service (OSS) + Model Studio** | Image OCR sub-flow, verbatim: "a web service built on Function Compute receives user requests. The function uploads the image to Object Storage Service (OSS) and then sends the image URL and a prompt to Alibaba Cloud Model Studio. Model Studio calls the [model]" | **unconfirmed** | None | Solution: https://www.alibabacloud.com/en/solution/tech-solution/information-extraction · OCR deploy: https://www.alibabacloud.com/en/solution/tech-solution-deploy/2856973 · Marketing page: https://www.alibabacloud.com/en/solutions/ai-application-information-extraction |
| **Agency Agents: Domain experts on demand** | Multi-agent systems / coding & domain experts | **Function Compute** application template + **Claude Code**; "open-source AI agent suite that features **232 specialized agents across 16 domains**… supports end-to-end workflows in engineering and …" | "Click **Go to deployment** to open the Function Compute application template. Configure the parameters as described in the following table, and then click **Create**" | **unconfirmed** (FC template) | None identified | Solution: https://www.alibabacloud.com/en/solution/tech-solution/agency-agents/3044083 · Deploy: https://www.alibabacloud.com/en/solution/tech-solution-deploy/3044083 |
| **Deploy QwenPaw in 5 minutes** | Personal assistant agent (single agent + tools + memory) | **ECS**; QwenPaw (formerly CoPaw), "an open-source personal AI assistant from the **AgentScope** team"; connects to Model Studio via **Token Plan Personal / Token Plan Team / Coding Plan / Pay-as-you-go**; Telegram control channel | "quickly deploy QwenPaw on an ECS instance… With the privacy benefits of **local data storage** and a **scheduled heartbeat mechanism**, you can build a dedicated AI assistant that you can control from **Telegram**." Free-trial blurb: "build a dedicated AI agent equipped with **memory, task execution capabilities, and multi-platform support**" | **unconfirmed** | None | Solution: https://www.alibabacloud.com/en/solution/tech-solution/copaw · Deploy: https://www.alibabacloud.com/en/solution/tech-solution-deploy/3023684 · Model doc: https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwenpaw · Trial blurb: https://www.alibabacloud.com/en/solutions/free |
| **Deploy HiClaw — custom AI digital employee team** (Team Edition OpenClaw) | Multi-agent systems / "digital employees" | **ECS** + **Higress AI Gateway** + **MCP service hosting**; HiClaw is "the open-source Team edition of OpenClaw from Alibaba Cloud" | "It uses a **Manager Agent** to automatically break down tasks and orchestrate multiple **Worker** [agents]"; "The Manager Agent intelligently decomposes tasks and coordinates multiple Worker Agents for **parallel execution**"; Higress "safeguard[s] credentials and ensure[s] efficient task scheduling" (v1.0.6 = "Credential-Zero: Keys stay in Higress, not the Agent") | **unconfirmed** | Solution page found only at the `/tc/` (Traditional-Chinese) locale of the international site; the **English** deployment guide is in the help centre | Solution page: https://www.alibabacloud.com/tc/solution/tech-solution/hiclaw · **English deploy guide**: https://www.alibabacloud.com/help/en/alibaba-cloud-technology-solutions/latest/deploying-a-copaw ("Deploy a HiClaw multi-agent AI team_Deployment… quickly deploy a controllable and trustworthy AI agent team on an ECS instance") · https://higress.ai/en/hiclaw/ · https://www.alibabacloud.com/blog/team-edition-openclaw-hiclaw-open-source-build-a-one-person-company-in-5-minutes_602926 · https://www.alibabacloud.com/blog/40%2B-commits-daily-hiclaw-v1-0-6-lands-credential-zero-security-skills-%2B-mcp-%3E-2_602956 |
| **DeepSeek Harness: Build plugin-based agents** | Single agent with plugin/tool architecture | **ECS** + **Model Studio**; DeepSeek Harness ("open-source AI Agent framework by DeepSeek, supporting both Web UI and CLI modes") | "quickly deploy DeepSeek Harness on ECS and integrate it with Alibaba Cloud Model Studio to build an AI agent that uses a …"; "everything-as-a-plugin" architecture | **unconfirmed** | None | Solution: https://www.alibabacloud.com/tc/solution/tech-solution/deepseek-harness · Deploy: https://www.alibabacloud.com/en/solution/tech-solution-deploy/3052071 · Model doc: https://www.alibabacloud.com/help/en/model-studio/deepseek-harness |
| **OpenClaw on Simple Application Server** | Personal agent, low-cost entry | **Simple Application Server (SAS)** application image, "open-source community standard version (**MIT license**)"; alternatives: **Compute Nest on ECS**, **PAI-EAS** | One-click: console → Simple Application Server → Create Server → select OpenClaw application image. Pricing stated as "as little as **USD $8/month**" (blog) and "**$0.99/month**" (social post) — treat the blog figure as authoritative | **unconfirmed** | None | https://www.alibabacloud.com/help/en/simple-application-server/use-cases/quickly-deploy-and-use-openclaw · FAQ https://www.alibabacloud.com/help/en/simple-application-server/use-cases/openclaw-faq · https://www.alibabacloud.com/blog/openclaw-launches-on-alibaba-cloud-simple-application-server_602845 · Compute Nest https://www.alibabacloud.com/blog/new-launch-openclaw-solution-on-alibaba-cloud-compute-nest_602884 · PAI-EAS https://www.alibabacloud.com/help/en/pai/deploy-exclusive-openclaw-using-pai-eas-for-5-minutes |

**Gap for your app:** none of the Technical Solution pages exposed a "Supported regions" table in search results. Since your default is ap-southeast-1, **each of these needs a manual region check before it can be offered as "follows Alibaba Cloud's documented solution."** Mark as unconfirmed until then.

---

## 3. TABLE B — Solution landing pages and product-level solution guides

| Solution | Use case | Products | Workflow steps | Region | China-only parts | URL |
|---|---|---|---|---|---|---|
| **AI Service for Conversational Chatbots** | Customer-service agents | "Artificial Intelligence Service… build various types of **multi-language customer service chatbots** to enable **text, voice, and image** [interaction]" | Not exposed in snippet — **open page** | **unconfirmed** | Underlying Intelligent Speech Interaction "is currently available in Mandarin Chinese, Cantonese Chinese, English, Japanese, Korean, French and Indonesian" | https://www.alibabacloud.com/en/solutions/ai-chatbots · blog https://www.alibabacloud.com/blog/transform-customer-service-with-alibaba-clouds-conversational-ai-service_601243 · https://www.alibabacloud.com/en/product/intelligent-speech-interaction |
| **Real-Time Audio and Video Calls with AI Agents** | Voice agents / call centres | **ARTC** network (ApsaraVideo Real-time Communication) via **Intelligent Media Services (IMS)**; Model Studio realtime models — "For real-time audio/video conversations, use **qwen3.8-omni-flash-realtime**. Note: For non-real-time audio output, use **qwen3.5-omni-plus**" | "Deploy AI agents for real-time audio and video calls… Configure a custom AI agent"; billing is "**Hourly billing by agent spec**" + ARTC fees; worked example: "agent in the Chinese mainland region, The cost is **USD 0.28 (20 minutes × USD 0.014/minute)**" | **unconfirmed** for the solution page; the pricing example is written for a Chinese-mainland agent | **The Model Studio ↔ Real-time Conversational AI best-practice doc is China site only**: https://help.aliyun.com/en/ims/user-guide/use-ai-real-time-interaction-with-alibaba-cloud-model-studio . **Alibaba Cloud Intelligent Contact Center (AICCS) is China site only**: https://help.aliyun.com/en/aiccs/product-overview/what-is-artificial-intelligence-cloud-call-service | Solution: https://www.alibabacloud.com/en/solutions/ai-application/real-time-interaction (indexed via /th/ locale) · Overview https://www.alibabacloud.com/help/en/ims/user-guide/real-time-conversational-ai-overview · Billing https://www.alibabacloud.com/help/en/ims/real-time-conversational-ai-standard-billing · Data archiving (compliance + LLM fine-tuning) https://www.alibabacloud.com/help/en/ims/user-guide/how-to-achieve-data-archiving · AI speaking tutor https://www.alibabacloud.com/help/en/ims/user-guide/ai-speaking-partner · Product https://www.alibabacloud.com/en/product/ims |
| **Retrieval-Augmented Generation (RAG)** | Enterprise knowledge assistant | **Model Studio + Compute Nest + AnalyticDB for PostgreSQL** | "a **step-by-step guide** on how to set up a RAG service using Alibaba Cloud Model Studio, Compute Nest, and AnalyticDB for PostgreSQL" | **unconfirmed** | None | https://www.alibabacloud.com/en/solutions/generative-ai/rag · blog https://www.alibabacloud.com/blog/601412 · https://alibaba-cloud.medium.com/building-rag-services-on-compute-nest-with-alibaba-cloud-model-studio-and-analyticdb-for-8f26bee20273 |
| **Build with Generative AI** (catalog page) | Cross-cutting | Lists **OpenSearch** "conversational search service that tailors your Q&A system, leveraging vector retrieval and LLMs" and **Qwen-Agent** "framework for developing LLM applications… orchestrates intelligent agents that follow instructions and execute complex tasks" | n/a (catalog) | n/a | OpenSearch LLM-Based Conversational Search Edition availability **unconfirmed** | https://www.alibabacloud.com/en/solutions/generative-ai/build · parent https://www.alibabacloud.com/en/solutions/generative-ai · https://www.alibabacloud.com/en/solutions/generative-ai/qwen |
| **AI Tools for E-Commerce & Advertising** | E-commerce content, multilingual listings | Qwen models (copy, imagery, video) | "Turn a single product asset into a global campaign. Qwen models generate your **copy, imagery, and video end-to-end** — localized for **92 languages** at up to **80% lower cost**" | Campaign page (no region stated) | None | https://www.alibabacloud.com/campaign/ai-tools-for-e-commerse-and-advertising |
| **Smart Studio** | Model-as-a-Service resale / private deployment | Self-Service Edition ("Start in minutes, Auto Deployment, Out-of-box") and Commercial Edition ("From GPU to API, Resell Model APIs"); "you can complete activation and on-premises deployment on your own **with our agent**" | Announced at Apsara 2026 as one of **three new AI solutions for international businesses** (Smart Studio, Smart Fusion, Smart Video) | International (announced for global) | None | https://www.alibabacloud.com/en/solutions/smart-studio · https://www.alibabacloud.com/blog/alibaba-cloud-smart-studio-self-service-edition-now-live-internationally_603440 · https://www.alibabacloud.com/en/press-room/alibaba-cloud-expands-global-infrastructure-and-ai |
| **QwenWork (International Edition)** | Workplace AI agent / marketing content | QwenWork; "supports both Google [Workspace and …]" | "one-stop AI productivity platform deeply integrated with the enterprise IM ecosystem… multimodal content generation" | International edition launched; "Built for fast-growing markets across **Asia, the Middle East, and Latin America**" (LinkedIn, secondary) | QwenWork's China e-commerce merchant tool is separate | https://www.alibabacloud.com/help/en/qwenwork/ · https://www.alibabacloud.com/blog/alibaba-launches-qwenwork-international-edition-extending-its-all-in-one-workplace-ai-agent-to-global-markets_603500 · China merchant tool: https://www.alibabacloud.com/blog/qwenwork-unveiled-e-commerce-tool-to-help-merchants-in-china-boost-efficiency_603637 |
| **Agentic Computer (JVS)** / **Agentic Mobile** | Agent execution substrate (desktop / mobile) | Agentic Computer built on **Elastic Desktop Service (EDS)**; Agentic Mobile on **Cloud Phone (ECP)**, "deeply integrated with the Qwen model and native OpenClaw" | AC: admin console → Security & Operations → Team Management → create team → create node | **unconfirmed** | Agentic Computer overview doc also on China site | https://www.alibabacloud.com/product/jvs · https://www.alibabacloud.com/help/en/jvs/ · https://www.alibabacloud.com/help/en/jvs/quickly-create-and-use-an-agentic-computer · https://www.alibabacloud.com/en/campaign/agenticmobile · https://www.alibabacloud.com/help/en/ecp/quickly-experience-and-create-cloud-phone-jvs-mobile |

---

## 4. TABLE C — Help-centre best practices & tutorials, by your nine use cases

| Use case | Best-practice doc | Products | Steps / capabilities | Region | China-only? | URL |
|---|---|---|---|---|---|---|
| **Customer-service agents** | *Alibaba Cloud Customer Service Agent: Thoughts, Design and Practices* (Alibaba's own agent) | Fine-tuned **Qwen** + **RAG** | "achieved by **fine-tuning the Qwen model and utilizing RAG**"; result: "the agent solution achieves a **self-service resolution rate that is over 10% higher** compared to the traditional [approach]" | n/a (internal practice write-up) | No — on alibabacloud.com | https://www.alibabacloud.com/blog/alibaba-cloud-customer-service-agent-thoughts-design-and-practices-from-concept-to-implementation_601555 |
| Customer-service agents | *Turn Your WeChat Official Account into an AI Customer [Service]* | Model Studio LLM application + WeChat | "First, create an LLM application in Alibaba Cloud Model Studio. Then get the credentials you need to call the application's API." | n/a | **China site only** (WeChat channel) | https://help.aliyun.com/en/model-studio/add-an-ai-assistant-to-your-wechat-in-10-minutes |
| **Enterprise knowledge assistant (RAG)** | *Build a private knowledge Q&A application with zero code* | Model Studio **agent application** + **Knowledge Base** + Qwen | "connect your own documents to an agent application—no code required—so users get accurate, grounded answers"; KB "splits files into chunks"; recommends **Qwen-Plus / Qwen-Plus-Latest** ("testing shows these models provide the best [results]"); auto-update via **OSS + FC + KB APIs** | Singapore (gated) | No, but **gated**: "Only users who created… applications in the Singapore region **before April 21, 2025**" | https://www.alibabacloud.com/help/en/model-studio/build-knowledge-base-qa-assistant-without-coding · https://www.alibabacloud.com/help/en/model-studio/rag-knowledge-base |
| Enterprise knowledge assistant | *Build an AI Q&A assistant with Dify* (ACK) | **ACK** + `ack-dify` component + enterprise knowledge base | "Set up a dedicated AI Q&A assistant in **three steps**: Install the ack-dify component: Create an ACK cluster and install the ack-dify component …" | ACK regions (international) | No | https://www.alibabacloud.com/help/en/ack/cloud-native-ai-suite/use-cases/building-customized-ai-question-and-answer-assistant-based-on-dify |
| Enterprise knowledge assistant | *Build a Dify AI Q&A assistant on ACS* | **ACS** + `ack-dify` | "Deploy the ack-dify component on your cluster… ACS console → Clusters …" | ACS regions | No | https://www.alibabacloud.com/help/en/cs/user-guide/build-customized-ai-q-a-assistant-based-on-dify-in-acs |
| Enterprise knowledge assistant | *Build a RAG application with Dify and Tablestore* | **Dify + Tablestore**; "we recommend deploying it on **ACK**" for production HA | Best-practice tree | International | No | https://www.alibabacloud.com/help/en/tablestore/use-cases/rag-based-on-dify-and-tablestore |
| Enterprise knowledge assistant | *Elasticsearch Agent Engine Edition* | Alibaba Cloud Elasticsearch | "cloud-native search engine for **retrieval-augmented generation (RAG), code search**, …" | **unconfirmed** | No | https://www.alibabacloud.com/help/en/es/user-guide/ai-engine-edition/ |
| Enterprise knowledge assistant | *AI Search Open Platform* | OpenSearch | "a service for intelligent search and **RAG scenarios** with built-in services like **document parsing and chunking**" | Your verified fact: **Shanghai + Frankfurt only** | Partially | https://www.alibabacloud.com/help/en/open-search/search-platform/product-overview/introduction-to-search-platform |
| Enterprise knowledge assistant | AgentRun knowledge-base integration | **AgentRun** + Model Studio KB **or RAGFlow** | "Click Create Knowledge Base to attach a knowledge base from Alibaba Cloud Model Studio… Attach a RAGFlow knowledge base"; Model Studio attach needs "BaseURL, the API-KEY, and the dataset ID" | Singapore (+HK for Open Platform) | No | https://www.alibabacloud.com/help/en/agentrun/knowledge-base-integration-guide |
| **Document & contract processing** | *Image OCR text extraction* (see Table A) | FC + OSS + Model Studio | see Table A | unconfirmed | No | https://www.alibabacloud.com/en/solution/tech-solution-deploy/2856973 |
| Document & contract processing | **Qwen-OCR** model doc | Model Studio | "Qwen-OCR is a visual understanding model that extracts text and structured data from images — **scanned documents, tables, receipts**, and more" | Model Studio intl regions | No | https://www.alibabacloud.com/help/en/model-studio/qwen-vl-ocr |
| Document & contract processing | *AI-Powered Document Processing and Intelligent Extraction* | Model Studio (extraction, classification, analysis, workflow) | "Model Studio can support AI-driven document applications that combine **extraction, classification, analysis, and workflow**" | n/a (blog) | No | https://www.alibabacloud.com/blog/ai-powered-document-processing-and-intelligent-extraction-on-alibaba-cloud_603592 |
| Document & contract processing | **Document Mind** (DAMO Academy multimodal document engine) | Document Mind | "multimodal document recognition and understanding engine" | **China site only** | **Yes** | https://help.aliyun.com/en/document-mind/product-overview/product-introduction/ |
| Document & contract processing | IMM document text extraction / Document AI Assistant plugin | Intelligent Media Management | "automatically extracts plain text from documents… various formats and languages"; plugin "powered by… Tongyi Qianwen" | **unconfirmed** | No | https://www.alibabacloud.com/help/en/imm/user-guide/extract-text-from-a-document · https://www.alibabacloud.com/help/en/imm/user-guide/weboffice-plugin-ai |
| **Marketing content generation** | *Setting Up an AI Chatbot for Marketing Automation* | Model Studio **no-code agent** + **RAG KB** + Qwen | "**Step 1** Create an Agent Application in Model Studio · **Step 2** Select and Configure the Model · **Step 3** Write the System Prompt · **Step 4** Build the [Knowledge Base]…" | Singapore (gated) | No, but **gated** by the 2025-04-21 rule | https://www.alibabacloud.com/blog/setting-up-an-ai-chatbot-for-marketing-automation-with-alibaba-cloud-model-studio_603115 |
| Marketing content generation | *Generative AI for Marketing Content: Using Qwen… to Scale Copywriting* | Model Studio + **DashScope API** + Qwen | "you built a working AI copywriting pipeline… covering: Setting up Model Studio and the DashScope API" | Intl (API-based) | No | https://www.alibabacloud.com/blog/generative-ai-for-marketing-content-using-qwen-on-alibaba-cloud-to-scale-copywriting_603082 |
| Marketing content generation | *Plan a Month of Social Content from One Product Brief* | QwenWork | "transforms a single product brief into a strategic, platform-native monthly social media content calendar" | QwenWork International | No | https://www.alibabacloud.com/blog/603687 |
| **E-commerce / shopping assistants** | *Build an intelligent shopping guide* | Model Studio, **multi-agent architecture**, pre-configured **Function Compute application template** | "You can access our pre-configured Function Compute application template to quickly build a website with an integrated intelligent shopping guide" | **China site only** | **Yes** | https://help.aliyun.com/en/model-studio/create-an-ai-shopping-assistant |
| E-commerce / shopping assistants | *Build a proactive AI shopping assistant* | **Function Compute + Model Studio**, multi-agent | "build an intelligent shopping assistant that helps merchants automate customer service around the clock" | **China site only** | **Yes** | https://help.aliyun.com/en/functioncompute/build-an-ai-shopping-assistant |
| E-commerce / shopping assistants | Model Studio **Workflow application** — "Example 2: Smart shopping assistant" | Model Studio workflow nodes (LLM, API, **Function Compute**) | "create a smart shopping assistant using a **workflow** that helps users select mobile [phones]"; FR locale shows the node prompt "You are a smart shopping assistant responsible for recommending **refrigerators**…" and slot format "For small commercial use\|300L\|Level 1" | Singapore (gated) | No, but **gated** | https://www.alibabacloud.com/help/en/model-studio/workflow-application · https://www.alibabacloud.com/help/fr/model-studio/workflow-application |
| E-commerce analytics | **Quick BI Smart Q** | Quick BI | "my agents… chat with them to build a custom AI analytics assistant"; blog: "Smart Q **Skill Package**… helps ecommerce teams gain actionable business insights via **natural language**" | **unconfirmed** | No | https://www.alibabacloud.com/help/en/quick-bi/user-guide/smartq · https://www.alibabacloud.com/blog/ai-native-ecommerce-analytics-with-quick-bi_603237 |
| **Voice agents / call centres** | see Table B (Real-Time Audio and Video Calls with AI Agents) | IMS/ARTC + Model Studio realtime | see Table B | unconfirmed | Best-practice doc is **China site only** | see Table B |
| **Data analysis agents (NL→SQL)** | **ADBAgent** (AnalyticDB for MySQL) | AnalyticDB for MySQL | "perform professional data analysis using **natural language instead of writing SQL**, and **save your analysis workflows as reusable Skills**"; has a **Quickstart** and a **RESTful OpenAPI** ("authentication, session management") | **unconfirmed** | No | https://www.alibabacloud.com/help/en/analyticdb/analyticdb-for-mysql/adbagent/ · https://www.alibabacloud.com/help/en/analyticdb/analyticdb-for-mysql/adbagent-quickstart · https://www.alibabacloud.com/help/en/analyticdb/analyticdb-for-mysql/adbagent-openapi-usage-guide |
| Data analysis agents | **Data Agent** (AnalyticDB for PostgreSQL) | AnalyticDB for PostgreSQL | "uses **natural language as the interaction interface** and provides two core capabilities: **read-only query analysis** and **DBA read-only diagnostics**" | **unconfirmed** | No | https://www.alibabacloud.com/help/en/analyticdb/analyticdb-for-postgresql/data-agent/ |
| Data analysis agents | **AIDBS Analytics Agent** | AI-Native Database Service | "get started with the core analytics features of Analytics Agent. Prerequisites: An Alibaba Cloud account…"; AIDBS = "enterprise data platform that combines **natural language querying, autonomous database operations**, and AI" | **unconfirmed** | No | https://www.alibabacloud.com/help/en/aidbs/getting-started/get-started-with-analytics-agent · https://www.alibabacloud.com/en/product/ai-native-database-service |
| Data analysis agents | **Official MCP server** (GitHub `aliyun`) | AnalyticDB PG MCP server | "enables seamless communication between **AI Agents** and AnalyticDB PostgreSQL, helping AI Agents **retrieve database metadata and execute SQL operations**" | n/a (OSS) | No | https://github.com/aliyun/alibabacloud-adbpg-mcp-server |
| Data analysis agents | *Generating SQL Queries with Alibaba Cloud's Qwen* / *Bring AI to Your Data (Dify + DMS)* | Qwen; Dify + **DMS** + Qwen | "build a text-to-SQL chatbot"; "hybrid AI architecture combines **Dify's workflow orchestration** with Alibaba Cloud **DMS** and Qwen to create a **governed, data-grounded** [system]" | Intl (API) | No | https://www.alibabacloud.com/blog/generating-sql-queries-with-alibaba-clouds-qwen_602329 · https://www.alibabacloud.com/blog/bring-ai-to-your-data-orchestrating-web-research-and-internal-databases-with-dify_602897 · https://www.alibabacloud.com/blog/evolution-of-text-to-sql-technology---an-analysis-of-alibaba-cloud-opensearch-sql_601919 |
| **Coding agents** | **Qoder** (agentic coding platform) | Qoder | "intelligent **model routing**, **enterprise knowledge engines**, and **SOC 2 compliant security**"; **SOC 2 Type II** completed "covering the Security, Availability, and Confidentiality Trust Services Categories"; **Experts Mode** = "multi-agent collaboration… the system automatically **breaks down tasks, assembles an expert team**, and executes solution design" | Global product | Note: **Qoder CN (formerly Lingma)** docs have moved to docs.qoder.cn | https://www.alibabacloud.com/en/product/lingma · https://www.alibabacloud.com/en/campaign/qoder-promotion · https://www.alibabacloud.com/blog/qoder-completes-independent-soc-2-type-ii-examination_603516 · https://www.alibabacloud.com/blog/ai-coding-enters-the-agent-teamwork-era-introducing-qoder-experts-mode_603406 · https://www.alibabacloud.com/help/en/lingma/introduction-of-lingma |
| Coding agents | **Model Studio Coding Plan** | Model Studio + Qwen/GLM/Kimi/MiniMax in third-party coding tools | "access to models… in popular AI coding tools. For a fixed monthly fee"; "**Price $50/month · Quota Up to 6,000 requests per 5 [hours]**"; "Simple tasks typically use 5–10 calls" | Intl | No | https://www.alibabacloud.com/help/en/model-studio/coding-plan |
| Coding agents | Harness tools wired to Model Studio: **Claude Code**, **Qwen Code**, **Hermes Agent**, **DeepSeek Harness** | Model Studio (PAYG / Coding Plan / Token Plan) | Each doc = connect-and-run guide | Intl | No | https://www.alibabacloud.com/help/en/model-studio/claude-code · https://www.alibabacloud.com/help/en/model-studio/qwen-code · https://www.alibabacloud.com/help/en/model-studio/hermes-agent · https://www.alibabacloud.com/help/en/model-studio/deepseek-harness |
| Coding agents | **FC Claude Code Template** / **GStack engineering team** | Function Compute; Claude Code; GStack | "Claude Code is Anthropic's terminal-based AI coding agent that can read code, modify files, and **execute commands within a sandbox**"; "GStack transforms Claude Code from a coding assistant into a **complete AI engineering team**" | **unconfirmed** | No | https://www.alibabacloud.com/help/doc-detail/3047403.html · https://www.alibabacloud.com/help/doc-detail/3050657.html |
| Coding agents | **Create an agent using code (high-code)** | Function Compute | "Upload code packages, deploy code from local storage or **OSS**, edit code online, or deploy agent [images]" | FC regions | No | https://www.alibabacloud.com/help/en/functioncompute/create-agent-by-code-high-code · AI best-practice index https://www.alibabacloud.com/help/en/functioncompute/ai-best-practices/ · FC Agent Sandbox best practices https://www.alibabacloud.com/help/en/functioncompute/best-practices-of-fc-agent-sandbox/ |
| **Multi-agent systems** | HiClaw, Agency Agents (Table A); **AgentCore**; **Agentic SOC** | AgentCore = "unified platform for **building, governing, and executing** enterprise AI agents… covers the entire agent lifecycle through **three core** [modules]"; Agentic SOC "uses a **layered, multi-agent collaborative architecture. A Team Leader coordinates** …" | AgentCore: "connecting multiple AI model providers, integrating external tools (**MCP services**), and monitoring the running status of Agents" | AgentCore: cn-hangzhou, cn-beijing, **ap-southeast-1** | No | https://www.alibabacloud.com/en/product/agentcore · https://www.alibabacloud.com/help/en/agentcore/agentcore-product-overview · https://www.alibabacloud.com/help/en/security-center/user-guide/agentic-soc-agent-architecture |
| Multi-agent systems | *Build an auto-planning multi-agent system with Assistant API* | Model Studio **Assistant API** | "When a user asks a question, the [system auto-plans]" | **China site only** | **Yes** | https://help.aliyun.com/en/model-studio/use-multi-agent-to-query-alibaba-cloud-resource-information |
| Multi-agent systems | **AgentRun** (serverless agent infra on FC) | Function Compute; runtime + sandbox + observability + evaluation + memory + KB | "**Low-code (Quick Create Agent)**: build a runnable agent by selecting a model, writing a prompt, and configuring tools and a sandbox"; high-code: "Upload a code package (local or OSS), online editor, or custom image"; "agent runtime supports **Python, Node.js, Java**; sandbox runtime supports **50+ languages**"; FunAgent Open Platform = "end-to-end, from preparing a database and creating an instance to running your first agent", "deployment spans Function Compute (FC)"; publish a **Flow Agent** to **AI Gateway** as a standard HTTP API | Public cloud regions incl. cn-hangzhou, cn-shanghai…; **Open Platform = HK + Singapore** | No | https://www.alibabacloud.com/help/en/agentrun/what-is-agentrun · https://www.alibabacloud.com/help/en/agentrun/agenrun-best-practices-1/ · https://www.alibabacloud.com/help/en/agentrun/practice-configure-and-use-the-agent-open-platform-from-0 · https://www.alibabacloud.com/help/doc-detail/3049292.html · regions https://www.alibabacloud.com/help/doc-detail/3049222.html |
| Multi-agent systems | **Agent Sandbox** (ACS / FC editions) | ACS cluster add-ons + **warm pool**; FC Cloud Sandbox | "create an Agent Sandbox **Container Edition**… in an ACS cluster by installing the required add-ons, **creating a warm pool**"; "secure, isolated execution environment where AI agents run code and processes, operate on files, access the network" | **unconfirmed** | No | https://www.alibabacloud.com/help/en/agent-sandbox/quick-start1/ · https://www.alibabacloud.com/help/en/agent-sandbox/product-overview/agent-sandbox-overview · https://www.alibabacloud.com/help/en/cs/user-guide/agent-sandbox/ · https://www.alibabacloud.com/help/en/functioncompute/product-overview-of-fc-agent-sandbox |
| Multi-agent systems | **AgentBay** | AgentBay (browser / desktop / GUI automation) | "cloud-native execution platform for AI agents… automate **browsers, desktop applications**, [and custom GUI]"; paper: "secure, isolated execution environments spanning **Windows, Linux, Android, Web Browsers, and Code interpreters**" | **unconfirmed** | No | https://www.alibabacloud.com/help/en/agentbay/product-overview/what-is-eds-agentbay · https://www.alibabacloud.com/en/product/agentbay · https://arxiv.org/html/2512.04367v1 · billing https://www.alibabacloud.com/help/en/agentbay/product-overview/agentbay-billing-instructions |

### Coverage verdict per use case (for your "documented solution" vs "custom design" flag)

| Use case | Verdict |
|---|---|
| Customer-service agents | **Custom design.** No international reference architecture. Only a solution landing page (ai-chatbots) and Alibaba's own internal-practice blog. The step-by-step tutorials are gated (Model Studio no-code) or China-only (WeChat). |
| Enterprise knowledge assistant (RAG) | **Documented** — five independent paths (RAGFlow tech solution, Dify-on-ACK, Dify-on-ACS, Dify+Tablestore, Model Studio+Compute Nest+AnalyticDB PG). Strongest area. |
| Document & contract processing | **Partly documented** — multimodal extraction tech solution + FC/OSS/Model Studio OCR flow. **No contract-specific reference architecture found.** Document Mind is China-only. |
| Marketing content generation | **Blog-level only.** Two step-by-step blogs, one of which is gated. No Architecture Center or tech-solution entry. |
| E-commerce (descriptions, multilingual listings, shopping assistants) | **China site only** for the two multi-agent shopping-assistant tutorials. The only international artefact is the gated Model Studio Workflow "Smart shopping assistant" example plus the 92-language campaign page. Treat international shopping-assistant designs as **custom**. |
| Voice agents & call centres | **Partly documented** internationally (solution page + IMS Real-time Conversational AI docs + billing). The Model Studio↔ARTC best practice and AICCS are **China site only**. |
| Data analysis agents (NL→SQL) | **Documented as product features**, not as a solution architecture: ADBAgent, ADB-PG Data Agent, AIDBS Analytics Agent, Quick BI Smart Q, official MCP server. Regions unconfirmed. |
| Coding agents | **Documented** — Qoder (with SOC 2 Type II), Coding Plan, four harness integrations, FC templates. |
| Multi-agent systems | **Documented** — HiClaw (Manager/Worker), Agency Agents (232 agents/16 domains), AgentCore, Agentic SOC (Team Leader pattern), plus Spring AI Alibaba / AgentScope OSS. |

---

## 5. Customer case studies — agentic AI, named international customers

| Customer | Market | What they built | Products | Measured results | URL |
|---|---|---|---|---|---|
| **ReN3** | **Singapore** | "agentic AI platform for **regulated enterprises**" | Alibaba **Qwen** models | "**40% lower inference costs · 30% higher output quality · 30%** [faster response times]"; "meeting data [residency requirements]" | https://www.alibabacloud.com/en/customers/ren3 · https://www.alibabagroup.com/en-US/ai-governance/success-cases |
| **PT Cerita Inovasi Kopi Indonesia (CIK)** | **Indonesia** | Adopted **QwenWork** ("AI Agent Workforce") "to generate campaign videos and images **in-house** and to draft **operational reports**" | QwenWork | "projected **efficiency gains of 30–50%** while keeping all company data inside its own **private, encrypted environment**" | https://www.alibabacloud.com/en/customers/pt-cerita-inovasi-kopi-indonesia · https://www.alibabagroup.com/en-US/ai-governance/success-cases |
| **Lion Parcel** | **Indonesia** | "intelligent **logistics agent**"; "Automated **OCR extraction for both printed and handwritten**" Delivery Orders; finance & document-processing workflows | **Qwen-VL-Plus** | "automating numerous tasks in their daily workflow, resulting in [efficiency gains]" — the numeric result is truncated in the customers-page snippet; **open the case page for the figure**. Network context: "connect[s] shipment across 9-nine percent of Indonesia and 50 plus countries… 7000s plus agents" | https://www.alibabacloud.com/customers/lion-parcel · https://www.alibabacloud.com/en/press-room/alibaba-cloud-expands-global-infrastructure-and-ai · https://www.alibabagroup.com/en-US/ai-governance/success-cases |
| **TIGEREYE, Inc.** | **Japan** | "accelerating the development of **conversational AI agents for the Japanese market**"; multimodal AI that can "understand and communicate" in real time by integrating recognition-based AI such as facial [recognition] | "Alibaba Cloud's comprehensive **technical support**" — specific products **not enumerated** on the case page snippet | "25% faster voice… **87%+ dialogue success rate**" — **from Alibaba Cloud's LinkedIn post, not the case page; treat as unconfirmed until verified on alibabacloud.com** | https://www.alibabacloud.com/en/customers/tigereye · https://www.linkedin.com/posts/alibaba-cloud-computing-company_alibabacloud-successstory-tigereye-activity-7386636226587586561-QsnP |
| **Hamilton** | **unconfirmed** (not stated in snippet) | "accounting automation engine… rapid and cost-effective deployment of intelligent financial [workflows]"; "transforms accounting from static record-keeping to **predictive, audit-ready** insights" | **Qwen** | Third-party aggregator headline: "Hamilton **cuts manual review time by 80%**" — **not confirmed on alibabacloud.com** | https://www.alibabacloud.com/en/customers/hamilton · https://www.casestudies.com/company/alibaba-cloud/case-study/hamilton-cuts-manual-review-time-by-80-with-alibaba-cloud |
| **Ignite Vision** | **unconfirmed** | "AI-driven **influencer marketing platform**… AI creator matching"; "replace manual KOL screening with **semantic matching**, turning brand briefs and creator signals into directly [actionable matches]" | **Qwen LLM** + Alibaba Cloud **database infrastructure** | "screening cut from **hours of manual work to minutes**, across **millions of KOL profiles**" | https://www.alibabacloud.com/customers/ignitevision · https://www.alibabagroup.com/en-US/ai-governance/success-cases |
| **ZenCreator** | **unconfirmed** | AI content production platform | **Model Studio**, **Wan** + **Qwen** model families | "**1M+ generations monthly**" (~500k video + ~500k image, per a partner write-up); "serving **1.5M+ creators**" | https://www.alibabacloud.com/en/customers/zencreator |
| **TrueFoundry** | **US (San Francisco)** | Integrated Qwen into **TrueForge**, "an open-source, **vendor-neutral agent harness**" | Qwen (founding model partner) | Rationale given: "**Broadest open-model spectrum**"; TrueFoundry's own benchmark claims "30%–75% cheaper task completion than Claude Managed Agents" (vendor source, not Alibaba) | https://www.alibabacloud.com/en/customers/truefoundry · https://www.truefoundry.com/blog/engineering/trueforge-vs-claude-managed-agents-benchmark/ |
| **Akool** | **unconfirmed** | "AI **video generation** and **real-time interaction** solutions, addressing **e-commerce** use cases" | **Wan2.6**, **Qwen-VL**, full-stack AI | Partner post claims "**40–60% cost reduction** via flexible deployment, **180+ languages**, 60% less flickering" — **not confirmed on alibabacloud.com** | https://www.alibabacloud.com/customers/akool · https://www.alibabagroup.com/en-US/ai-governance/success-cases |
| **EaseMate** | **unconfirmed** | Generative-AI consumer platform with content safety | Alibaba Cloud **AIGC** services, **LLMs**, **generative AI content safety** | "achieved **rapid user acquisition** and **reduced operational risks**" (qualitative) | https://www.alibabacloud.com/en/customers/easemate |
| **AstraZeneca** | **China entity of a European company** — flag carefully | "the industry's **first adverse event summary system**" for pharmacovigilance; also **Eagle AI**, a "dedicated AI data analysis and insight assistant" | **Tongyi Qwen LLM** + **Dedicated Model Studio** (Model Studio: Exclusive) | "accuracy of the adverse event reports has increased from **90% to 95%**"; "**300% increase in reporting efficiency**" | https://www.alibabacloud.com/en/customers/astrazeneca · https://www.alibabacloud.com/blog/alibaba-cloud-announces-international-expansion-plans-to-power-the-next-generation-ai-innovations_602561 ("AstraZeneca **China** uses…") · https://www.alibabacloud.com/blog/alibaba-cloud-named-a-leader-in-gartner%C2%AE-magic-quadrant%E2%84%A2-for-cloud-database-management-systems-for-sixth-consecutive-year_602747 |
| **PRO-NET** (Proton EV) | **Malaysia** | EV platform; "develop its **internal chatbot**, which will later expand to **customer-facing** applications and future vehicle [features]" | **Model Studio** | No metric published | https://www.alibabacloud.com/en/press-room/alibaba-cloud-accelerates-worldwide-ai-innovation · https://emas.proton.com/pro-net-and-alibaba-cloud-advance-malaysias-ev-ecosystem-through-strategic-collaboration/ |
| **Agrinesia** | **Indonesia** | Consolidated infrastructure as "a scalable foundation for **AI-driven innovation**… readiness with Qwen" | Alibaba Cloud compute/data + **Qwen** | "seamless migration with **zero data loss**" (aggregator) | https://www.alibabacloud.com/customers/agrinesia |
| **Kimi (Moonshot AI)** | **China** — architecturally useful, not an international reference | Runs its AI agent on Alibaba Cloud | **ACK + ACS** — "secure, instantly elastic infrastructure" | n/a | https://www.alibabacloud.com/blog/deep-dive-how-kimis-ai-agent-runs-on-alibaba-cloud_602942 |

**Honest assessment for pre-sales:** the international agentic case-study bench is thin on *hard* numbers. Only **ReN3 (Singapore)**, **AstraZeneca (China)** and **CIK (Indonesia)** carry quantitative claims on Alibaba-owned pages; several other figures (TIGEREYE 87%, Hamilton 80%, Akool 40–60%) appear only on LinkedIn or third-party aggregators and should be marked **unconfirmed** in the app. **No Korea, Middle East or continental-Europe agentic-AI case study with a named customer was found** — Korea appears only as infrastructure news (third data centre: https://www.alibabacloud.com/en/press-room/alibaba-cloud-launches-third-data-center-in-south) and a hackathon recap (https://www.alibabacloud.com/blog/a-week-of-qwen-in-korea-recap-of-the-alibaba-cloud-%26-flock-io-ai-hackathon_602484); the Middle East appears only as an AI Empowerment Program with SCCC in Saudi Arabia (social posts). Also note the customer index is filterable by country incl. "Saudi Arabia; Singapore; South Korea; Spain; Thailand; Turkey; United Arab […]" — https://www.alibabacloud.com/en/customers.

---

## 6. Alibaba Cloud's own published guidance on building agents

### 6.1 `aliyun/ai-agent-handbook` — the flagship, and the one your drawing rules should mirror

Repo: https://github.com/aliyun/ai-agent-handbook · English README: https://github.com/aliyun/ai-agent-handbook/blob/main/README_EN.md · Site: https://aliyun.github.io/ai-agent-handbook/

- Positioning: "A practical guide to building **enterprise AI agents across their full lifecycle**" — "cycle (**architecture, building, operations, governance, and optimization**)" — drawn from "practical experience, lessons learned, and insights from Alibaba Cloud, enterprise customers on the cloud".
- **Repository structure (verbatim section → folder → chapters → purpose):**

| Section | Folder | Chapters | Purpose |
|---|---|---|---|
| Architecture | `01-architecture/` | 1–2 | "Define the system, **select an application form**, **assess maturity**, and **establish a reference architecture**" |
| Building | `02-build/` | 3–6 | (harness / context / tools) |
| Runtime | `03-run/` | 7–12 | (running, observing, constraining) |
| Governance | `04-governance/` | 13–16 | — |
| Optimization | `05-optimization/` | 17–24 | "**Continuous improvement of both models and agents**" |
| Practice | `06-case-study/` | 25–29 | "**Jev topic, and Personal Agent topic**" |

- Target reader for the engineering sections: "**Engineering methods for harnesses, context, state, tools, sandboxes, trajectories, and evaluation. Architects and platform engineers**".
- Published **reading path** for the multi-agent case: "**Building a multi-agent system: Chapters 4–6 → Chapters 10–12 → Chapters 13 and …**" — this maps directly onto your drawing order (build → runtime → governance).
- **Critical caveat, verbatim:** "**The linked chapters and case studies are currently written in Chinese; this English README is a guide to the existing content, not a translation of the entire** [handbook]." So the app can cite the *structure* in English but cannot quote chapter text.
- Licensing: Apache-2.0 (https://github.com/aliyun/ai-agent-handbook/blob/main/LICENSE).
- Chapter-count discrepancy: README sections sum to 29 chapters; secondary coverage says "30-chapter Apache-2.0 guide" (https://hermes-ai.net/news/alibaba-cloud-s-ai-agent-handbook-reveals-only-10-hit-90-task-success/, https://alphasignal.ai/news/alibaba-cloud-s-ai-agent-handbook-reveals-only-10-hit-90-task-success). **Unconfirmed — count from the repo tree.**
- Statistics quoted by secondary coverage (not verified on an Alibaba page): "a 2026 survey where about **46%** of organisations have Agents in development or completed, but only about **18%** have deployed to production. **Coding is the first use case to scale, with about 57%** procuring coding […]" (https://aitop.news/item/51388). Announced alongside Alibaba joining the **Agentic AI Foundation (AAIF) as Gold Member** (China site: https://developer.aliyun.com/article/1774447).

### 6.2 The enterprise-agent blog series (all on alibabacloud.com, all cross-linked in a "You may also like" rail — treat as one curriculum)

| Article | Main recommendation (as stated) | URL |
|---|---|---|
| **Designing Enterprise AI Agent Architectures with Alibaba Cloud** | The canonical loop to draw: "**User → Intent → Planning → Knowledge → Tools → Execution → Validation → Response**"; "A practical enterprise architecture can be organized into several **layers**: User […]" | https://www.alibabacloud.com/blog/designing-enterprise-ai-agent-architectures-with-alibaba-cloud_603528 |
| **Building Enterprise AI Agents with Alibaba Cloud** | An enterprise agent needs "**a foundation model for reasoning and generation · Enterprise knowledge for grounded responses · Tools and APIs for accessing business systems**"; "It requires an architecture that connects models with enterprise knowledge, tools, workflows, **security controls, and human oversight**" | https://www.alibabacloud.com/blog/building-enterprise-ai-agents-with-alibaba-cloud_603562 |
| **From Documents to Enterprise Knowledge** | "The objective is **not simply to store documents**" — design the KB for retrieval quality | https://www.alibabacloud.com/blog/from-documents-to-intelligence-designing-enterprise-knowledge-bases-with-alibaba-cloud_603563 |
| **Beyond RAG: Designing Enterprise AI Workflows with Models, APIs and Functions** | Composition of models + APIs + functions, not RAG alone | https://www.alibabacloud.com/blog/603578 |
| **Designing Multi-Agent Enterprise Systems with Alibaba Cloud** | "A multi-agent system consists of multiple AI agents that work together… **Each agent may have a specific** [role]"; Model Studio "can support… design[ing] multi-agent architectures" | https://www.alibabacloud.com/blog/603591 |
| **AI Agents Need Observability: Monitoring, Debugging and […]** | "Observability helps organizations **monitor agent behavior, identify issues, and maintain operational control**" | https://www.alibabacloud.com/blog/603577 |
| **From AI Prototype to Production: How to Evaluate Enterprise AI Applications with Model Studio** | Evaluation as a production gate | https://www.alibabacloud.com/blog/from-ai-prototype-to-production-how-to-evaluate-enterprise-ai-applications-with-alibaba-cloud-model-studio_603579 |
| **Why Enterprise AI APIs Need a Security Layer** | "enterprise applications also need controls around **who can call the service**" | https://www.alibabacloud.com/blog/603583 |
| **Enterprise AI Security Guardrails: Protecting Sensitive Data** | "Why AI Security Requires **Additional** Controls" | https://www.alibabacloud.com/blog/enterprise-ai-security-guardrails-protecting-sensitive-data-with-alibaba-cloud_603590 |
| **Vector Databases for Enterprise AI** | Designing high-performance semantic search | https://www.alibabacloud.com/blog/vector-databases-for-enterprise-ai-designing-high-performance-semantic-search-on-alibaba-cloud_603588 |
| **Should This Workflow Be an Agent? A Three-Question Test** ⭐ | "**Three questions decide whether a workflow should be an agent, a fixed workflow with model calls, or a plain script. I call them the Fork, Read, […]**"; "Operations and product leaders are probably holding **two kinds of** [workflows]"; guardrails cost note: "Model Studio offers **input and output checks through the Guardrails service, billed per token**" | https://www.alibabacloud.com/blog/should-this-workflow-be-an-agent-a-three-question-test-before-you-build_603614 |
| **Prompt, RAG, or Fine-Tune? A Decision Guide Priced in Dollars** ⭐ | "**Wrong facts call for RAG**"; sections "RAG vs fine-tuning: what are you actually trying to change?" and "What does [it cost]"; instruction: "**Read the table by rows, not columns**" | https://www.alibabacloud.com/blog/prompt-rag-or-fine-tune-a-decision-guide-priced-in-dollars_603615 |
| **Stop Building AI Demos. Start Shipping Enterprise AI. (The SA & FDE Playbook for Qwen)** ⭐ | Directly aimed at your audience: "The **SA checks if the results meet the business and security targets**. They might set **baseline goals like: 95% accuracy on standard, grounded FAQs**" | https://www.alibabacloud.com/blog/603651 |
| **Forward Deployment Engineering Using Alibaba Cloud** | Steps "**1. Understand the Customer's Problem · 2. Build and Customize · 3. Deploy in the Customer's** [environment]"; "The FDE uses **Model Studio to manage prompt engineering, orchestrate complex AI agents, and manage enterprise knowledge bases**… writes the [integration code]"; example: "build a **secure API gateway** to bridge the customer's on-premises inventory [system]" | https://www.alibabacloud.com/blog/forward-deployment-engineering-using-alibaba-cloud_603601 |

⭐ = highest value for the app's decision logic (whether to draw an agent vs. a workflow; whether to draw RAG vs. fine-tune; what SLA to put in the proposal).

**Harness / context / memory sub-series** (the "how to make it reliable" layer):
- Harness Engineering: https://www.alibabacloud.com/blog/4-real-cases-%7C-harness-engineering-is-becoming-the-new-moat_602970 · https://www.alibabacloud.com/blog/harness-engineering-a-new-paradigm-for-software-production-in-the-ai-era_603486 ("ensures AI coding quality through **checkpoints, acceptance criteria, and automated** [verification]") · https://www.alibabacloud.com/blog/code-harness-or-natural-language-harnesses_603240 · https://www.alibabacloud.com/blog/engineering-knowledge-engine-the-knowledge-layer-behind-harness-engineering_603402 ("a **multi-dimensional code cognition system** that integrates code files, commit history, RepoWiki, memory") · https://www.alibabacloud.com/blog/a-self-iterating-knowledge-engine-for-ai-native-software-engineering_603446
- Context engineering: https://www.alibabacloud.com/blog/the-moat-of-ai-agents-context-engineering_602376 — "outlines **retrieval, isolation, pruning, and compression** strategies"
- Memory: https://www.alibabacloud.com/blog/from-long-term-memory-to-self-evolution_603343 · https://www.alibabacloud.com/blog/how-we-built-a-self-evolving-memory-system-for-qoder_603368 · product doc https://www.alibabacloud.com/help/en/cms/cloudmonitor-2-0/memory-module-overview ("**MemoryStore**… holds all short-term and long-term memory for an AI agent")
- Cost tiering (multi-agent coordinator): "**let the flagship model plan and synthesize while token-heavy reading goes** [to a cheaper model]" — **China site only**: https://help.aliyun.com/en/model-studio/managed-agents-cost-tiering
- Agent Infra map: https://www.alibabacloud.com/blog/what-does-alibaba-clouds-agent-infra-look-like_603177 — "**Built on Function Compute**, AgentRun is a one-stop Agentic AI infrastructure platform centered on **high-code**… provides complete modules such as **runtime, sandbox, observability, agent evaluation, memory and knowledge bases (Context Engineering)**"; AgentCore https://www.alibabacloud.com/blog/what-makes-alibaba-cloud%E2%80%99s-newly-released-agentcore-different_603627; AgentLoop https://www.alibabacloud.com/blog/what-is-the-newly-released-agentloop-by-alibaba-cloud_603378
- Agent security: https://www.alibabacloud.com/blog/alibaba-cloud-al-agent-security-solution%E2%80%94%E2%80%94security-risks-and-mitigations-for-enterprise-ai-agent-adoption_603175 — philosophies "**Agent Native Security**" and "**Defending AI with AI**"; "**Agent Security Best Practice 1: Comprehensive Asset ID with Lineage Mapping** — Alibaba Cloud's **Agent SPM** builds a cross-cloud '**Agent Asset Map**'"; Agent Security Center https://www.alibabacloud.com/help/en/asc/product-overview/what-is-the-agent-security-center ("end-to-end security **closed loop**") + https://www.alibabacloud.com/blog/alibaba-clouds-major-new-release-agent-security-center-an-integrated-defense-platform-for-ai-agents-under-a-new-security-framework_602949; AI Guardrails https://www.alibabacloud.com/en/product/ai_guardrails ("**API integration and one-click activation through Model Studio**") + https://www.alibabacloud.com/blog/ai-guardrails-real-time-protection-for-llms-and-ai-agents%C2%A0_603442
- Sandbox runtime: https://www.alibabacloud.com/blog/zero-code-transformation-making-the-ai-agent-sandbox-no-longer-a-black-box_603571 (OBI zero-code observability in ACS Agent Sandboxes) · https://www.alibabacloud.com/blog/loongcollector-%2B-acs-agent-sandbox-build-a-production-grade-ai-agent-runtime-platform_603172 · https://www.alibabacloud.com/blog/602980 · China-site security best practices: https://help.aliyun.com/en/cs/user-guide/acs-agent-sandbox-security-best-practices ("network isolation, storage security, credential and identity management, and [a fourth dimension]")
- Patterns: **The Deep Research Agent Pattern** https://www.alibabacloud.com/blog/603244 · **Real-Time AI Inference Architecture** https://www.alibabacloud.com/blog/real-time-ai-inference-architecture-on-alibaba-cloud_603286 · **Real-Time Fraud Detection Pipeline** https://www.alibabacloud.com/blog/real-time-fraud-detection-pipeline-architecture-on-alibaba-cloud_603297 · **Building Real-Time AI Applications with FC and Event-Driven Architecture** https://www.alibabacloud.com/blog/603585
- Trends/evolution: https://www.alibabacloud.com/blog/development-trends-and-architecture-evolution-of-ai-agents_602529 ("Alibaba Cloud has defined a **panoramic view of AI native application development**"; RAG caution: "pay attention to whether the retrieved corpus is **relevant**") · https://www.alibabacloud.com/blog/development-trends-and-open-source-technology-practices-of-ai-agents_602037 ("solving over **95% of consulting issues**") · https://www.alibabacloud.com/blog/building-and-deploying-ai-agents-on-alibaba-cloud-using-pai-and-vector-databases_602227 · https://www.alibabacloud.com/blog/model-studio-architecture-a-deep-dive-into-alibaba-cloud%E2%80%99s-genai-application-platform_603243 ("**model service layer, application layer**, …") · https://www.alibabacloud.com/blog/complete-beginners-guide-building-your-first-ai-agent-on-alibaba-cloud_602346 · https://www.alibabacloud.com/blog/from-models-to-agents-how-alibaba-cloud-qwen-is-reshaping-workplace-collaboration_603518 ("Enterprise Use Cases. **AIOps and IT automation**. An agent can …")

### 6.3 Well-Architected Framework — AI pillar (the only *normative* Alibaba guidance)

| Doc | Key recommendations | URL |
|---|---|---|
| **AI architecture decision framework** | "**five systematic decision trees** to help architects make **evidence-based choices** at critical junctures in AI architecture"; "By triggering API calls through **Function Compute (FC)** or using the **managed inference services on Model Studio (Bailian)**, you avoid managing [infrastructure]"; "The **inference architecture directly determines** the system's response speed, scalability, availability, and operational cost"; self-hosting threshold: "suitable for **stable, large-scale traffic where GPU utilization can be maintained above 60%**; extreme latency requirements that […]"; "At this stage, it is recommended to build a **performance monitoring** [capability]" | https://www.alibabacloud.com/help/en/well-architected/decision-framework-for-ai-architecture |
| **AI-native transformation** | "dissects the unique challenges that distinguish **AI workloads from traditional systems**, explores the core, recurring tensions" | https://www.alibabacloud.com/help/en/well-architected/ai-native-transformation |
| **Well-Architected for the AI Era** | Five pillars: "Security, Reliability, Cost Optimization, Operational Excellence, and […]" | https://www.alibabacloud.com/help/en/well-architected/excellent-architecture-in-the-ai-era · index https://www.alibabacloud.com/help/en/well-architected/ · machine-readable https://www.alibabacloud.com/help/en/well-architected/llms.txt |
| **Recommended actions** | "Organizations can request an **AI Well-Architected review** from the Alibaba Cloud **Professional Services** team, conducted as a **structured workshop**"; mentions "The Alibaba Cloud **AI Cloud Governance Center** provides automated […] reference architectures to best practices" | https://www.alibabacloud.com/help/en/well-architected/concluding-remarks-1 · service page https://www.alibabacloud.com/en/services/well-architected_service |

### 6.4 Official open-source repos to name in the catalog

| Repo | What it is (as stated) | URL |
|---|---|---|
| `aliyun/ai-agent-handbook` | Lifecycle handbook (6.1) | https://github.com/aliyun/ai-agent-handbook |
| `alibaba/spring-ai-alibaba` | "**Agentic AI Framework for Java**"; "Agent Framework… can quickly develop agents with built-in **Context Engineering and Human In The Loop**"; "**Spring AI Alibaba Admin** is a one-stop Agent platform that supports **visualized Agent development, observability, evaluation, and MCP management**" | https://github.com/alibaba/spring-ai-alibaba · https://github.com/spring-ai-alibaba · https://java2ai.com/en/docs/1.0.0.2/get-started/agent/ ("**Spring AI Alibaba Graph** can be used to develop both **workflow applications and multi-agent applications**") |
| `agentscope-ai/agentscope` | "**AgentScope 2.0** is a production-ready, easy-to-use agent framework"; "spans the full agent lifecycle — from the core framework, to **runtime hosting, memory and evaluation, fine-tuning**, to ready-to-use applications" | https://github.com/agentscope-ai/agentscope · https://agentscope.io/ |
| `alibaba/dify` | Official Alibaba fork/mirror with Alibaba deployment paths: "Using **Alibaba Cloud Computing Nest**. Quickly deploy Dify… Using **Alibaba Cloud Data Management**. One-Click […]" | https://github.com/alibaba/dify · Marketplace https://www.alibabacloud.com/en/market/dify |
| `higress-group/higress` | "**AI Gateway \| AI Native API Gateway**… can be used as a security gateway, supporting **WAF** and various authentication strategies (**key-auth, hmac-auth, jwt-auth, basic-auth, oidc**)" | https://github.com/higress-group/higress · https://higress.ai/en/ai-gateway/ |
| `aliyun/alibabacloud-adbpg-mcp-server` | NL→SQL MCP bridge (Table C) | https://github.com/aliyun/alibabacloud-adbpg-mcp-server |
| **Qwen-Agent** | "framework for developing LLM applications based on the **instruction following, tool usage, planning, and memory** capabilities of Qwen models" | referenced on https://www.alibabacloud.com/en/solutions/generative-ai/qwen (repo URL not surfaced in results — **unconfirmed**) |
| Agent Skills portal | "a platform where you can **discover and install cloud operation skills** for your AI agent"; AgentCore management Skill "describes **resource dependencies, operating procedures, parameter contracts, and error handling**" | https://www.alibabacloud.com/help/en/skillsportal/learn-about-the-alibaba-cloud-agent-skills-portal · https://www.alibabacloud.com/help/en/agentcore/agentcore-management-skill · AgentLoop onboarding skill https://www.alibabacloud.com/help/en/agentloop/integrate-with-agentloop-application-monitoring-via-ai-agent ("enables AI Agents such as **Cursor, Claude Code, and QoderWork** to onboard applications") |

---

## 7. Unconfirmed / needs a page-open before it goes in the catalog

1. **Region support for every Technical Solution in Table A** — no "Supported regions" table surfaced. Blocking for a Singapore-default app.
2. **AgentCore's complete region list** — snippet shows cn-hangzhou, cn-beijing, ap-southeast-1; the table was truncated. https://www.alibabacloud.com/help/en/agentcore/agentcore-product-overview
3. **AgentRun's full region list** — https://www.alibabacloud.com/help/doc-detail/3049222.html (snippet cut at "China (Shanghai) cn-…").
4. **AgentBay, Agent Sandbox, Agentic Computer, Agentic Mobile region availability** — no region doc found.
5. **ADBAgent / ADB-PG Data Agent / AIDBS Analytics Agent / Quick BI Smart Q international region availability.**
6. **Whether an English (`/en/`) page exists for the HiClaw and DeepSeek Harness tech solutions** — only `/tc/` locale surfaced for the solution pages (the HiClaw *deployment* guide is in English in the help centre).
7. **Lion Parcel's numeric result, TIGEREYE's product list, Hamilton's and Ignite Vision's and ZenCreator's and Akool's and EaseMate's countries.**
8. **AI Agent Handbook exact chapter count (29 vs 30)** and whether any chapter has since been translated to English.
9. **Qwen-Agent's official repository URL.**
10. **Whether OpenSearch LLM-Based Conversational Search Edition is purchasable outside China** (your verified note covers only AI Search Open Platform = Shanghai + Frankfurt).

---

## Searches run (229)

- alibabacloud.com agentic AI solution reference architecture Model Studio agent
- Alibaba Cloud customer service agent solution Model Studio Qwen documentation
- site:alibabacloud.com agentic AI solutions
- Alibaba Cloud Architecture Center agentic AI reference architecture
- alibabacloud.com best practices build agent Model Studio RAG knowledge base
- Alibaba Cloud AgentBay AgentRun AgentCore documentation
- alibabacloud.com architecture center generative AI best practice reference architecture list
- alibabacloud.com solutions generative ai customer service solution
- alibabacloud.com help best practice intelligent customer service Qwen Model Studio workflow
- alibabacloud.com natural language to SQL best practice AnalyticDB Qwen data analysis agent
- alibabacloud.com document intelligence contract processing solution Qwen
- alibabacloud.com voice agent call center solution intelligent contact center
- alibabacloud.com reference architecture center AI agent Model Studio Function Compute
- alibabacloud.com solutions ai-application list generative AI e-commerce marketing
- alibabacloud.com solutions ecommerce product description multilingual listing Qwen
- alibabacloud.com customer case study agentic AI Singapore Qwen Model Studio results
- alibabacloud.com customers case study AI agent Japan Korea Southeast Asia
- Alibaba Cloud case study Middle East AI agent Qwen enterprise
- "alibabacloud.com/en/architecture" AI agent best practice
- alibabacloud.com architecture center "Build a" agent Model Studio Function Compute quick start
- Alibaba Cloud well-architected "AI architecture decision framework"
- alibabacloud.com solutions ai-chatbots Artificial Intelligence Service for Conversational Chatbots products
- alibabacloud.com "real-time interaction" AI agents solution ARTC products
- alibabacloud.com solutions ai-application generative AI list of solutions
- alibabacloud.com en solution tech-solution list agent RAG Qwen
- alibabacloud.com tech-solution "Deploy QwenPaw in 5 minutes"
- alibabacloud.com tech-solution build private Q&A app RAGFlow
- alibabacloud.com tech solution "AI agent" deploy Function Compute Dify step by step
- alibabacloud.com solution tech-solution agency-agents domain experts on demand
- alibabacloud.com "tech solution" intelligent shopping assistant Function Compute template
- alibabacloud.com en solution tech-solution Deploy Dify and build AI applications
- alibabacloud.com en solution tech-solution multimodal data extraction
- alibabacloud.com en solution tech-solution OpenClaw HiClaw MCP
- alibabacloud.com tech-solution AI agent multi-agent AgentScope Spring AI Alibaba deploy
- alibabacloud.com en solution tech-solution n8n workflow automation AI
- alibabacloud.com tech solution customer service chatbot Model Studio deploy ECS
- "Designing Enterprise AI Agent Architectures with Alibaba Cloud" reference architecture blog 603528
- Alibaba Cloud Customer Service Agent Thoughts Design and Practices 601555 architecture RAG fine-tuning
- alibabacloud.com help en model-studio create-an-ai-shopping-assistant intelligent shopping guide
- alibabacloud.com campaign ai-tools-for-e-commerce-and-advertising Qwen product listing
- Alibaba Cloud coding agent Qoder Lingma solution documentation international
- alibabacloud.com marketing content generation Qwen blog 603082 copywriting pipeline steps
- alibabacloud.com customers ReN3 Singapore agentic AI Qwen inference cost 40%
- PT Cerita Inovasi Kopi Indonesia QwenWork Alibaba Cloud case study
- alibabacloud.com customers Japan AI agents case study Model Studio Qwen
- alibabacloud.com/en/customers AI agent case study Singapore Thailand Indonesia Malaysia
- Alibaba Cloud customer story Qwen Model Studio enterprise agent Korea
- alibabacloud.com customer case study Middle East Saudi UAE Qwen AI agent
- alibabacloud.com customers ZenCreator Model Studio Wan Qwen generations monthly
- alibabacloud.com customers "AI agents for the Japanese market" case study
- alibabagroup.com ai-governance success cases Qwen list customers
- alibabacloud.com customers case study Qwen agent bank telco retail Europe
- Alibaba Cloud case study agentic AI customer service deflection rate percent international
- alibabacloud.com/en/customers AI chatbot Qwen Model Studio efficiency improvement percent
- TIGEREYE Alibaba Cloud conversational AI agents Japanese market case study products
- Hamilton Qwen accounting automation Alibaba Cloud case study
- Ignite Vision Qwen influencer marketing Alibaba Cloud case study
- "Designing Multi-Agent Enterprise Systems with Alibaba Cloud" blog 603591 supervisor pattern
- alibabacloud.com blog 602227 Building and Deploying AI Agents on Alibaba Cloud AgentBay
- Alibaba Cloud well-architected AI architecture decision framework agent recommendations
- alibabacloud.com blog "Building Enterprise AI Agents with Alibaba Cloud" series 603562 list of articles
- alibabacloud.com blog "Enterprise AI Security Guardrails" Protecting Sensitive Data agent series
- alibabacloud.com blog "What Does Alibaba Cloud's Agent Infra Look Like" 603177 products
- alibabacloud.com blog agent memory state management sandbox observability enterprise agent series
- alibabacloud.com blog "Prompt, RAG, or Fine-Tune" decision guide 603615
- alibabacloud.com blog agent evaluation testing guardrails best practice Model Studio
- github.com aliyun ai-agent-handbook README_EN chapters architecture build run governance
- Alibaba Cloud AI Agent Handbook 30 chapters open source 10% hit 90% task success
- aliyun ai-agent-handbook github repository contents chapters list
- alibabacloud.com blog "Should This Workflow Be an Agent" three-question test 603614
- alibabacloud.com blog "The Deep Research Agent Pattern" 603244
- alibabacloud.com blog AI Agents Need Observability Monitoring Debugging 603577 AgentLoop
- "ai-agent-handbook" aliyun github "Chapter" list 30 chapters titles
- ai-agent-handbook alibaba "harness" "sandbox" "gateway" chapter table of contents English
- aliyun ai-agent-handbook README_EN "10%" "90%" agent task success rate
- alibabacloud.com blog 603578 "Designing Enterprise AI Workflows with Models, APIs and Functions" beyond RAG
- alibabacloud.com blog 603579 evaluate enterprise AI applications Model Studio evaluation
- alibabacloud.com blog 603583 "Why Enterprise AI APIs Need a Security Layer" Higress AI Gateway
- ai-agent-handbook github chapters "01" "02" architecture harness run governance optimization directory
- hermes-ai.net alibaba cloud ai agent handbook 10% hit 90% task success chapters
- aitop.news Alibaba Cloud Open-Sources AI Agent Handbook enterprise Agent lifecycle details
- alibabacloud.com help en model-studio best practices agent application workflow app
- alibabacloud.com help en model-studio workflow application nodes branch loop
- alibabacloud.com help en agentrun best practices deploy agent
- "ai-agent-handbook" "01-architecture" "02-build" "03-run" "04-governance" "05-optimization" chapters
- github aliyun ai-agent-handbook README_EN "Building" "Running" "Governance" "Optimization" chapter numbers range
- ai-agent-handbook Harness context engineering tools chapters Alibaba
- alibabacloud.com help en model-studio shopping assistant agent best practice international site
- help.aliyun.com model-studio create-an-ai-shopping-assistant multi-agent architecture Function Compute
- alibabacloud.com help en model-studio use cases best practices list
- www.alibabacloud.com/help/en/model-studio shopping assistant multi-agent Function Compute
- www.alibabacloud.com/help/en/functioncompute build an AI shopping assistant
- www.alibabacloud.com/help/en/model-studio Assistant API multi-agent query Alibaba Cloud resource information
- github aliyun ai-agent-handbook 05-optimization 06 chapters 25 26 27 28 29 30
- ai-agent-handbook aliyun repository structure sections chapters total 30
- aliyun ai-agent-handbook docs folder chapter titles English
- alibabacloud.com help en model-studio workflow-application "Smart shopping assistant" example nodes
- alibabacloud.com help en model-studio agent orchestration multi-agent application
- alibabacloud.com help en model-studio token-plan-best-practice Integrate Harness tools web search MCP
- alibabacloud.com help en functioncompute examples AI agent best practice
- alibabacloud.com help en ack best practice Dify RAG agent deploy
- alibabacloud.com help en apsaradb rds supabase AI agent best practice
- alibabacloud.com en solutions ai-chatbots architecture products Intelligent Speech Interaction Chatbot region
- alibabacloud.com solutions ai-application real-time-interaction ARTC Model Studio agent region products
- alibabacloud.com en solution tech-solution agency-agents Function Compute Claude Code architecture steps region
- alibabacloud.com help en analyticdb adbagent ADBAgent getting started natural language data analysis region availability
- alibabacloud.com help en analyticdb analyticdb-for-postgresql data-agent region availability international
- alibabacloud.com Qoder agentic coding enterprise SOC 2 product page features
- alibabacloud.com en solutions list all AI agent solution pages 2026
- alibabacloud.com Agentic Lake solution data lake agents products
- alibabacloud.com OpenClaw managed solution Simple Application Server pricing region
- alibabacloud.com customers TrueFoundry TrueForge Qwen agent harness case study
- alibabacloud.com/en/customers case study Indonesia Thailand Philippines Vietnam Qwen agent
- alibabacloud.com customer case study Korea Qwen Model Studio AI agent
- alibabacloud.com customers Lion Parcel Qwen-VL-Plus intelligent logistics agent case study
- alibabacloud.com/en/customers Lion Parcel Indonesia AI agent results percent
- alibabacloud.com Qwen solutions page customer cases adverse event reports medical literature
- alibabacloud.com customers case study AI agent Malaysia Philippines Vietnam Qwen
- alibabacloud.com customer case study Europe Germany UK Qwen Model Studio agent
- alibabacloud.com customers "QwenWork" case study enterprise agent results
- alibabacloud.com customers astrazeneca Qwen adverse event reporting case study details region
- AstraZeneca Alibaba Cloud Qwen Model Studio adverse event report accuracy 90% to 95%
- alibabacloud.com/en/solution/tech-solution popular solutions list RAGFlow Dify multimodal data extraction
- alibabacloud.com tech-solution region "Singapore" deployment supported regions agent
- alibabacloud.com help en alibaba-cloud-technology-solutions latest deploying list
- alibabacloud.com solution tech-solution-deploy HiClaw manager agent worker agents Higress MCP
- alibabacloud.com blog 603594 "Alibaba Cloud Expands Global Infrastructure and AI Portfolio" three new AI solutions
- alibabacloud.com press room "Alibaba Cloud Unveils Advanced Agentic AI Ecosystem" AgentCore AgentRun AgentBay details
- Alibaba Cloud AgentCore product page build govern execute enterprise AI agents three core
- alibabacloud.com help en agentcore product overview regions availability international
- alibabacloud.com help en agentrun what-is-agentrun regions Singapore endpoint
- alibabacloud.com help en agentbay product overview regions availability
- alibabacloud.com Document Mind document intelligence product international site contract extraction
- alibabacloud.com help en docmind document intelligence region availability
- alibabacloud.com Intelligent Contact Center AICCS international availability region
- alibabacloud.com help en ims real-time conversational AI agent solution Model Studio best practice international
- alibabacloud.com help en ims use-ai-real-time-interaction-with-alibaba-cloud-model-studio
- alibabacloud.com solutions ai-application real-time-interaction products ARTC intelligent media services region
- Alibaba Cloud launched three new AI solutions international businesses production-grade applications Apsara 2026 details
- alibabacloud.com press-room alibaba-cloud-expands-global-infrastructure-and-ai three new AI solutions names
- Alibaba Cloud Agentic Mobile Agentic Computer JVS product page details
- alibabacloud.com help en ims real-time conversational ai overview region supported Singapore
- alibabacloud.com help en ims AI real-time interaction billing agent spec region
- alibabacloud.com help en model-studio qwen-audio-realtime region availability Singapore
- cloudresellernews.com "three new AI solutions" Alibaba Cloud international production-grade "Smart"
- alibabacloud.com press room "Smart Studio" "Agentic" three new AI solutions international businesses 2026 Apsara
- alibabacloud.com blog 603598 Apsara Conference full-stack AI roadmap global market expansion three new AI solutions
- alibabacloud.com blog Smart Studio Self-Service Edition internationally 603440 private deployment agent
- alibabacloud.com Model Studio Exclusive private cloud international region availability
- alibabacloud.com help en model-studio agent orchestration multi-agent orchestration application international
- alibabacloud.com help en model-studio managed agents multiagent coordinator cost tiering
- alibabacloud.com help en model-studio agent best practices list deep research web research
- github alibaba spring-ai-alibaba AgentScope Qwen-Agent official repositories agent framework
- alibabacloud.com blog 4 real cases harness engineering becoming the new moat 602970
- alibabacloud.com blog engineering knowledge engine knowledge layer behind harness engineering 603402
- alibabacloud.com blog from long-term memory to self-evolution 603343 agent memory
- alibabacloud.com en solution tech-solution deepseek-harness plugin-based agents ECS Model Studio
- alibabacloud.com solution tech-solution-deploy 2926764 RAGFlow products region ECS
- alibabacloud.com en solution tech-solution information-extraction multimodal Model Studio Function Compute OSS steps
- alibabacloud.com customer case study South Korea Qwen AI agent Naver Coupang
- alibabacloud.com customer case study Saudi Arabia UAE Qwen AI SCCC agent
- alibabacloud.com customer case study Germany France UK Netherlands Qwen agent AI
- alibabacloud.com en solutions generative-ai qwen customer cases AstraZeneca Lion Parcel list
- alibabagroup.com en-US ai-governance success-cases full list Qwen organizations
- alibabacloud.com customers Agrinesia Indonesia AI case study Qwen
- alibabacloud.com en solution tech-solution "AI" category list all solutions agents 2026
- alibabacloud.com solutions free trial tech solution AI agent list
- alibabacloud.com en solution tech-solution chatbot customer service deploy
- alibabacloud.com en solutions free trial list AI agent Model Studio dedicated AI agent memory task execution
- alibabacloud.com help doc-detail 3050657 "Build an engineering team with Claude Code and GStack"
- alibabacloud.com help en agentrun agenrun-best-practices-1 list of best practices
- alibabacloud.com OpenSearch LLM intelligent search agent solution AI Search Open Platform international
- alibabacloud.com help en opensearch industry algorithm edition LLM question answering agent
- alibabacloud.com help en elasticsearch AI search RAG agent best practice
- alibabacloud.com en solutions generative-ai build page products OpenSearch Qwen-Agent PAI Model Studio
- alibabacloud.com en solutions generative-ai qwen page customer cases industries
- alibabacloud.com tech solution deployment "Supported regions" agent solution ECS Function Compute
- alibabacloud.com customer case study Qwen agent Thailand CFNT retail
- alibabacloud.com customers case study AI agent Vietnam Philippines Qwen
- alibabacloud.com customer case study "Model Studio" agent Middle East Dubai Saudi enterprise
- alibabacloud.com customers PRO-NET Malaysia Model Studio internal chatbot case study
- alibabacloud.com customers Akool Wan2.6 Qwen-VL case study AI video real-time interaction
- alibabacloud.com solutions ai-chatbots products Intelligent Service Robot ChatApp region availability
- alibabacloud.com en solution tech-solution-deploy 3044083 Agency Agents architecture Function Compute steps parameters
- alibabacloud.com help en alibaba-cloud-technology-solutions latest deploying-a-copaw HiClaw architecture ECS steps
- alibabacloud.com en solution tech-solution rapidly-deploy-dify ACK products architecture steps
- alibabacloud.com blog 601555 customer service agent architecture intent recognition RAG escalation human self-service resolution rate 10%
- alibabacloud.com customers EaseMate case study AI agent products
- alibabacloud.com blog customer service agent email triage draft reply human handoff Model Studio
- alibabacloud.com blog 603115 marketing automation chatbot Model Studio steps knowledge base agent region Singapore
- alibabacloud.com help en model-studio single-agent-application agent applications region availability Singapore created before 2025-04-21
- alibabacloud.com help en model-studio application-introduction agent workflow applications availability regions note
- alibabacloud.com blog "Fork, Read" three-question test workflow agent 603614 details
- alibabacloud.com AI Agent Security Solution Agent SPM prompt injection guardrails products 603175
- alibabacloud.com blog 603562 building enterprise AI agents Model Studio knowledge base tools requirements
- alibabacloud.com en solution tech-solution all AI solutions list "AI" filter technical solutions catalog
- alibabacloud.com solution tech-solution n8n deploy workflow automation
- alibabacloud.com solution tech-solution OpenClaw Simple Application Server deploy one click
- alibabacloud.com blog 603563 "From Documents to Enterprise Knowledge Bases" Model Studio RAG chunking
- alibabacloud.com help en asc what-is-the-agent-security-center region availability international
- alibabacloud.com blog series enterprise AI agents 603562 603563 603577 603578 603579 603583 603590 603591 list
- alibabacloud.com blog 603591 multi-agent enterprise systems Alibaba Cloud patterns handoff orchestrator recommendation
- alibabacloud.com blog 603528 reference architecture enterprise AI agent user intent planning knowledge tools layers
- alibabacloud.com blog 603577 AI agents observability AgentLoop SLS Cloud Monitor recommendations
- alibabacloud.com help en agentcore agentcore-product-overview supported regions Singapore China
- alibabacloud.com en architecture ref-architecture AI machine learning reference architectures list
- alibabacloud.com reference architecture center "generative AI" "RAG" architecture diagram
- alibabacloud.com help en agentrun what-is-agentrun regions Singapore China Hong Kong supported
- alibabacloud.com help en agentloop regions supported Hong Kong international
- alibabacloud.com help en agent-sandbox product overview regions ACS Function Compute
- "AgentCore" Alibaba Cloud supported regions "Singapore" "cn-hangzhou" "cn-beijing" product overview
- alibabacloud.com help doc-detail 3049222 AgentRun supported regions list Singapore
- alibabacloud.com help en agentloop server-launch-regions-of-agentloop supported regions list
- alibabacloud.com blog 603651 "Stop Building AI Demos" SA FDE playbook Qwen recommendations
- alibabacloud.com blog 603601 forward deployment engineering Alibaba Cloud agent pattern
- alibabacloud.com blog real-time AI inference architecture 603286 agent patterns
- alibabacloud.com blog 603651 SA FDE Playbook Qwen 95% accuracy grounded FAQs architecture recommendations RAG
- alibabacloud.com en architecture ref-architecture index list categories AI agent 2026
- alibabacloud.com architecture center quick starts AI agent templates deploy
- alibabacloud.com blog 602529 development trends architecture evolution AI agents open source AgentScope Spring AI Alibaba recommendations
- alibabacloud.com blog 603243 Model Studio architecture deep dive layers model service application
- alibabacloud.com blog 602037 development trends open source technology practices AI agents 95% consulting issues
- alibabacloud.com en solutions generative-ai rag page products vector search knowledge base architecture
- alibabacloud.com en solutions generative-ai page list RAG agent fine-tune deploy sub-pages
- alibabacloud.com en solutions ai-application list all pages information extraction real-time interaction
- alibabacloud.com PAI-LangStudio Retirement and Migration Guide reason date Model Studio
- alibabacloud.com help en pai pai-langstudio-feature-retirement-and-migration-guide details
- alibabacloud.com help en agentcore agentcore-product-overview "Singapore" supported regions ap-southeast-1
- Alibaba Cloud AgentCore available regions international Singapore launch 2026

## Sources returned by search (1142)

- https://www.alibabacloud.com/en/press-room/alibaba-cloud-unveil-advanced-agentic-ai-ecosystem?_p_lc=1
- https://www.alibabacloud.com/blog/602529
- https://www.alibabacloud.com/help/en/model-studio/single-agent-application
- https://www.alibabacloud.com/blog/from-models-to-agents-how-alibaba-cloud-qwen-is-reshaping-workplace-collaboration_603518
- https://www.alibabacloud.com/blog/designing-enterprise-ai-agent-architectures-with-alibaba-cloud_603528
- https://cloud.google.com/blog/topics/partners/building-scalable-ai-agents-design-patterns-with-agent-engine-on-google-cloud
- https://www.youtube.com/watch?v=QmB2qxcQx88&vl=en-US
- https://docs.cloud.google.com/architecture/multiagent-ai-system
- https://www.alibabacloud.com/en/developer/agentic-ai-agent-competition?_p_lc=1
- https://architecture.learning.sap.com/docs/ref-arch/98efa0
- https://www.alibabacloud.com/en/solutions/generative-ai/qwen?_p_lc=1
- https://www.alibabacloud.com/help/en/model-studio/faq-about-alibaba-cloud-model-studio
- https://www.alibabacloud.com/
- https://www.alibabacloud.com/help/en/model-studio/qwen-code
- https://help.aliyun.com/en/model-studio/faq-about-alibaba-cloud-model-studio
- https://www.alibabacloud.com/blog/unlock-the-power-of-conversational-ai-create-your-own-chatbot-using-qwen-model-studio-and-fc_602087
- https://www.alibabagroup.com/en-US/ai-governance/grow-your-business
- https://www.alibabacloud.com/blog/setting-up-an-ai-chatbot-for-marketing-automation-with-alibaba-cloud-model-studio_603115
- https://www.alibabacloud.com/press-room/omdia-market-radar-agentic-ai-cloud-titans-in-asia
- https://www.alibabacloud.com/en/press-room/alibaba-cloud-named-a-leader-in-omdia-latest-agent?_p_lc=1
- https://www.alibabacloud.com/blog/alibaba-cloud-named-a-leader-in-omdia%E2%80%99s-latest-agentic-ai-report_602917
- https://www.alibabacloud.com/en/press-room/alibaba-unveils-qwen3-6-plus-to-accelerate-agentic?_p_lc=1
- https://www.alibabacloud.com/en/campaign/agenticmobile?_p_lc=1
- https://www.alibabacloud.com/en/customers/ren3?_p_lc=1
- https://www.alibabacloud.com/help/en/security-center/user-guide/agentic-soc-agent-architecture
- https://www.alibabacloud.com/product/jvs
- https://docs.cloud.google.com/architecture/choose-agentic-ai-architecture-components
- https://www.alibabacloud.com/en/architecture/index?_p_lc=1
- https://docs.cloud.google.com/architecture/agentic-ai-overview
- https://aws.amazon.com/blogs/architecture/architecting-for-agentic-ai-development-on-aws/
- https://www.ibm.com/think/topics/agentic-architecture
- https://learn.microsoft.com/en-us/azure/architecture/ai-ml/ai-get-started
- https://kenhuangus.medium.com/7-layered-agentic-ai-reference-architecture-20276f83b7ee
- https://www.alibabacloud.com/help/en/model-studio/rag-knowledge-base
- https://www.alibabacloud.com/help/en/model-studio/build-knowledge-base-qa-assistant-without-coding
- https://www.alibabacloud.com/help/en/agentrun/knowledge-base-integration-guide
- https://www.alibabacloud.com/blog/building-a-rag-pipeline-on-alibaba-cloud-with-vector-search_603155
- https://help.aliyun.com/en/agentrun/knowledge-base-integration-guide
- https://www.reddit.com/r/Rag/comments/1glleej/improve_your_knowledge_base_for_retrieval/
- https://www.alibabacloud.com/help/en/pai/knowledge-base-management
- https://www.alibabacloud.com/help/en/agentbay/product-overview/what-is-eds-agentbay
- https://www.alibabacloud.com/help/en/agentcore/agentcore-management-skill
- https://www.alibabacloud.com/en/product/agentcore?_p_lc=1
- https://www.alibabacloud.com/blog/unlock-the-future-of-automation-introducing-alibaba-cloud-agentbay_602649
- https://help.aliyun.com/en/agentcore/agentcore-product-overview
- https://github.com/michael98671/agentbay
- https://www.alibabacloud.com/en/product/agentbay?_p_lc=1
- https://www.crnasia.com/news/2026/cloud/alibaba-cloud-rolls-out-agentic-cloud-stack-with-agentcore-a
- https://arxiv.org/html/2512.04367v1
- https://www.youtube.com/watch?v=Tvcib0pQi4Q
- https://www.alibabacloud.com/help/en/well-architected/concluding-remarks-1
- https://docs.cloud.google.com/architecture/ai-ml
- https://www.alibabacloud.com/en/architecture/ref-architecture/index?_p_lc=1
- https://www.hhs.texas.gov/sites/default/files/documents/ai-guidelines-and-reference-architecture.pdf
- https://blogs.nvidia.com/blog/ai-cloud-providers-reference-architecture/
- https://www.f5.com/resources/reference-architectures/ai-overview
- https://www.alibabacloud.com/help/en/well-architected/excellent-architecture-in-the-ai-era
- https://www.alibabacloud.com/blog/transform-customer-service-with-alibaba-clouds-conversational-ai-service_601243
- https://www.alibabacloud.com/en/solutions/generative-ai?_p_lc=1
- https://www.alibabacloud.com/blog/601661
- https://www.alibabacloud.com/blog/alibaba-cloud-customer-service-agent-thoughts-design-and-practices-from-concept-to-implementation_601555
- https://www.alibabacloud.com/blog/transform-your-business-with-alibaba-clouds-generative-ai_600289
- https://www.alibabacloud.com/en/customers?_p_lc=1
- https://cloud.google.com/blog/products/ai-machine-learning/how-gen-ai-is-transforming-the-customer-service-experience
- https://www.alibabacloud.com/help/en/airec/
- https://macaubusiness.com/alibaba-cloud-unveils-new-services-to-solve-generative-ai-development-issues-for-global-customers/
- https://www.alibabacloud.com/help/en/model-studio/models
- https://www.facebook.com/alibabacloud/videos/ai-can-do-more-than-generate-ideas-it-can-get-work-donediscover-how-agent-applic/4530527223888382/
- https://www.alibabacloud.com/blog/603321
- https://www.alibabacloud.com/blog/alibaba-cloud-smart-studio-self-service-edition-now-live-internationally_603440
- https://www.alibabacloud.com/help/en/analyticdb/analyticdb-for-mysql/adbagent/
- https://www.alibabacloud.com/blog/generating-sql-queries-with-alibaba-clouds-qwen_602329
- https://www.alibabacloud.com/blog/evolution-of-text-to-sql-technology---an-analysis-of-alibaba-cloud-opensearch-sql_601919
- https://www.alibabacloud.com/blog/is-your-ai-agent-getting-dumber-alibaba-cloud-analyticdb-unveils-ai-context-engineering_602803
- https://www.alibabacloud.com/help/en/analyticdb/analyticdb-for-postgresql/data-agent/
- https://www.alibabacloud.com/en/product/hybriddb-postgresql?_p_lc=1
- https://www.youtube.com/watch?v=ay_sYadoxgk
- https://www.alibabacloud.com/blog/simplify-your-delivery-process-in-easydispatch-with-generative-ai-and-analyticdb_600125
- https://help.aliyun.com/en/analyticdb/analyticdb-for-postgresql/data-agent-user-guide
- https://learn.microsoft.com/en-us/answers/questions/2169690/what-is-best-ai-model-for-sql-and-mongodb-query-ge
- https://www.alibabacloud.com/blog/ai-powered-document-processing-and-intelligent-extraction-on-alibaba-cloud_603592
- https://www.alibabacloud.com/help/en/model-studio/qwen-vl-ocr
- https://www.facebook.com/alibabacloud/videos/qwen-intelligence-files-the-all-in-one-vision-%EF%B8%8F%EF%B8%8F/2165118047622894/
- https://www.alibabacloud.com/blog/qwen-for-enterprise-ai-from-model-capability-to-business-applications_603564
- https://www.alibabacloud.com/blog/qwen3-7-the-agent-frontier_603154
- https://aimagazine.com/articles/alibaba-cloud-expands-ai-portfolio-with-qwen2-5-release
- https://help.aliyun.com/en/model-studio/qwen-office-assistant
- https://www.alibabacloud.com/blog/enterprise-call-center-on-the-cloud_597450
- https://www.alibabacloud.com/en/solutions/ai-application/real-time-interaction?_p_lc=1
- https://help.aliyun.com/en/aiccs/product-overview/what-is-artificial-intelligence-cloud-call-service
- https://www.dialpad.com/blog/how-ai-voice-agents-impact-contact-centers/
- https://www.goodcall.com/voice-ai/best-voice-ai-call-center-provider
- https://www.zendesk.com/blog/ai/productivity/ai-call-center/
- https://www.alibabacloud.com/en/solutions/ai-chatbots?_p_lc=1
- https://aidevgen.org/ai-call-center/
- https://insighto.ai/blog/how-voice-ai-is-shaping-the-next-generation-of-call-center-agents/
- https://www.domo.com/glossary/call-center-ai-agents
- https://www.alibabacloud.com/help/en/well-architected/decision-framework-for-ai-architecture
- https://www.alibabacloud.com/blog/602227
- https://www.alibabacloud.com/blog/model-studio-architecture-a-deep-dive-into-alibaba-cloud%E2%80%99s-genai-application-platform_603243
- https://www.devopsschool.com/tutorials/alibaba-cloud-model-studio-tutorial-architecture-pricing-use-cases-and-hands-on-guide-for-ai-machine-learning/
- https://www.alibabacloud.com/blog/one-key-one-cli-%E2%80%94-manage-your-alibaba-cloud-model-studio-token-plan-from-terminal-or-ai-agent_603453
- https://www.youtube.com/watch?v=gfqytnlfx2s
- https://www.alibabacloud.com/blog/generative-ai-in-2025-transforming-industries-with-use-cases-%26-trends_602526
- https://www.alizila.com/alibaba-cloud-debuts-generative-ai-model-for-corporate-users/
- https://www.alibabacloud.com/blog/ai-tools-for-business-how-to-work-smarter-not-harder_602495
- https://www.facebook.com/SocialLocalAds/videos/alibaba-cloud-is-leading-the-charge-in-global-ai-growththeir-new-models-and-too/691893243255978/
- https://www.codica.com/blog/top-artificial-intelligence-examples/
- https://jefftowson.com/membership_content/alibabas-4-big-ai-apps-part-2-of-2-from-my-visit-to-alibaba-tech-strategy/
- https://www.elpdata.com/app/alibaba-cloud
- https://www.alibabacloud.com/blog/generative-ai-for-marketing-content-using-qwen-on-alibaba-cloud-to-scale-copywriting_603082
- https://www.alibabacloud.com/blog/alibaba-cloud-rolls-out-multi-lingual-llm_600884
- https://www.facebook.com/alibabacloud/videos/explore-how-qwen-cloud-powers-the-next-generation-of-ainative-development/1067923842333603/
- https://www.facebook.com/alibabacloud/posts/one-picture-to-understand-the-qwen-familymeet-the-powerful-lineup-behind-alibaba/1265802655591824/
- https://www.alibabacloud.com/pt-BR/campaign/ai-tools-for-e-commerse-and-advertising?_p_lc=1
- https://resource.alibabacloud.com/webinar/detail.html?id=491&topic=
- https://www.alibabacloud.com/help/en/qwenwork/
- https://www.alibabacloud.com/blog/603186
- https://www.alibabagroup.com/en-US/ai-governance/success-cases
- https://www.linkedin.com/posts/alibaba-cloud-computing-company_alibabacloudsg-aicontentcreation-qwen-activity-7488535339037474818-cvve
- https://www.alibabacloud.com/blog/introduction-to-alibaba-cloud-model-studio_601386
- https://www.instagram.com/reel/Dbaeg7BiFHm/
- https://www.alibabacloud.com/blog/alibaba-cloud-research-reveals-asian-enterprises-accelerating-ai-adoption-but-calls-for-secure-end%E2%80%91to%E2%80%91end-solutions_603413
- https://www.alibabacloud.com/en/press-room/alibaba-cloud-launches-third-data-center-in-south?_p_lc=1
- https://www.alibabacloud.com/blog/alibaba-cloud-research-reveals-key-insights-on-ai-deployment-across-asian-companies_603391
- https://www.alibabacloud.com/en/press-room?_p_lc=1
- https://www.linkedin.com/posts/alibabacloudglobal_apsaraconference2026-agenticera-agentnative-activity-7508104234811211776-9vAm
- https://www.alibabacloud.com/blog/602942
- https://www.facebook.com/alibabacloud/posts/in-japan-alibaba-clouds-2024-journey-has-impacted-multiple-industries-our-cloud-/1016482060523886/
- https://www.alibabacloud.com/blog/alibaba-launches-qwenwork-international-edition-extending-its-all-in-one-workplace-ai-agent-to-global-markets_603500
- https://www.facebook.com/alibabacloud/videos/what-does-it-take-for-ai-to-earn-trust-in-the-enterpriseat-apsaraconference2026-/2040542960236332/
- https://www.linkedin.com/posts/alibabacloudglobal_ai-spotlight-ep3-qwenwork-activity-7504031557683159040-yj8F
- https://www.eqs-news.com/news/corporate/alibaba-cloud-unveils-advanced-agentic-ai-ecosystem-for-global-customers/a191d39b-db45-48ed-b194-9cce5071b556_en
- https://www.alibabacloud.com/blog/603518
- https://www.linkedin.com/posts/datascienceme_alibabacloud-qwen-qwenwork-activity-7520842713542496256-kmdf
- https://pub.towardsai.net/inside-alibabas-qwen-how-china-built-one-of-the-world-s-fastest-growing-ai-models-32d815475f7b
- https://www.alibabacloud.com/blog/development-trends-and-open-source-technology-practices-of-ai-agents_602037
- https://www.alibabacloud.com/blog/frontline-practice-of-implementing-a-new-paradigm-of-ai-application-architecture-based-on-mcp_602144
- https://www.patronus.ai/ai-agent-development/ai-agent-architecture
- https://www.facebook.com/alibabacloud/posts/what-does-it-take-for-ai-agents-to-deliver-real-world-impactmoving-ai-agents-fro/1572517818253638/
- https://www.alibabacloud.com/blog/alibaba-cloud-al-agent-security-solution%E2%80%94%E2%80%94security-risks-and-mitigations-for-enterprise-ai-agent-adoption_603175
- https://resources.anthropic.com/hubfs/Building%20Effective%20AI%20Agents-%20Architecture%20Patterns%20and%20Implementation%20Frameworks.pdf
- https://www.forrester.com/blogs/alibabas-next-chapter-from-ai-native-to-agent-native/
- https://www.alibabacloud.com/en/solution/tech-solution/agency-agents/3044083
- https://www.alibabacloud.com/help/en/quick-bi/user-guide/smartq
- https://www.alibabacloud.com/help/en/agentrun/what-is-agentrun
- https://help.aliyun.com/en/model-studio/create-an-ai-shopping-assistant
- https://www.alibabacloud.com/blog/openclaw-managed-solution-by-alibaba-cloud_602961
- https://www.alibabacloud.com/blog/deep-dive-how-kimis-ai-agent-runs-on-alibaba-cloud_602942
- https://resource.alibabacloud.com/webinar/detail.html?id=1467
- https://www.alibabacloud.com/blog/forward-deployment-engineering-using-alibaba-cloud_603601
- https://www.facebook.com/alibabacloud/posts/anolisa-cut-30-token-costs-at-the-os-levelanolisa-alibaba-cloud-linux-4-agentic-/1512701480901939/
- https://www.alibabacloud.com/help/en/well-architected/
- https://www.alibabacloud.com/help/en/well-architected/ai-excellence-architecture/
- https://help.aliyun.com/en/well-architected/concluding-remarks-1
- https://www.alibabacloud.com/help/en/well-architected/llms.txt
- https://help.aliyun.com/en/well-architected/learning/
- https://www.alibabacloud.com/help/en/well-architected/application-disaster-tolerance
- https://help.aliyun.com/en/well-architected/decision-framework-for-ai-architecture
- https://www.alibabacloud.com/help/en/well-architected/budget-and-cost-management
- https://help.aliyun.com/en/well-architected/ai-native-transformation
- https://www.alibabacloud.com/blog/601599
- https://www.facebook.com/alibabacloud/videos/introducing-the-chat-app-ai-assistant-powered-by-alibaba-cloudai-flow-design-go-/1334649608132494/
- https://www.alibabacloud.com/blog/593814
- https://aibusiness.com/ml/the-alibaba-challenge-how-to-effectively-engage-with-a-billion-customers-
- https://www.youtube.com/watch?v=GcIfMhmnJjo
- https://www.alibabacloud.com/blog/ai-chatbots-from-limitations-to-possibilities-%7C-practical-guide-to-enhance-ai-chatbot-capabilities_600627
- https://www.alibabacloud.com/th/solutions/ai-application/real-time-interaction?_p_lc=1
- https://www.alibabacloud.com/help/en/ims/developer-reference/interactive-streaming-overview
- https://help.aliyun.com/en/ims/user-guide/use-ai-real-time-interaction-with-alibaba-cloud-model-studio
- https://www.alibabacloud.com/help/en/ims/llms.txt
- https://help.aliyun.com/en/ims/user-guide/artc-sdk-based-solution
- https://www.alibabacloud.com/help/en/live/windows-alirtcengine-interface.md
- https://help.aliyun.com/en/ims/user-guide/integrate-artc-with-embodied-ai-systems
- https://www.alibabacloud.com/help/en/live/ios-alirtcengine-class.md
- https://www.alibabacloud.com/help/id/llms.txt?spm=a2c6h.13046898.publish-article.27.da656ffaY1fHxV&file=llms.txt
- https://www.alibabacloud.com/help/id/model-studio/happyoyster-android-sdk-integration-guide
- https://www.alibabacloud.com/en/press-room/alibaba-cloud-announced-the-latest-ai-models?_p_lc=1
- https://www.alibabacloud.com/blog/how-to-use-alibaba-cloud-model-studio-for-generative-ai-applications_603321
- https://edu.alibabacloud.com/training/aca-generative-ai
- https://www.facebook.com/TheNationThailand/posts/alibaba-cloud-recently-unveiled-new-products-and-services-in-a-bid-to-meet-the-b/695645242588813/
- https://aimagazine.com/top10/top-10-companies-offering-ai-solutions-over-the-cloud
- https://www.alibabacloud.com/blog/602496
- https://www.alibabagroup.com/document-2016703577908576256
- https://www.alibabacloud.com/en/solution/tech-solution/copaw
- https://www.alibabacloud.com/en/solution/tech-solution-deploy/3023684
- https://help.aliyun.com/en/pai/deploy-exclusive-qwenpaw-using-pai-eas-for-5-minutes
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwenpaw
- https://help.aliyun.com/en/model-studio/qwenpaw
- https://docs.modelstudio.console.alibabacloud.com/tc/model-studio/qwenpaw
- https://github.com/neal1iu/QwenPaw-dev
- https://www.alibabacloud.com/solution/tech-solution-deploy/2926764
- https://www.alibabacloud.com/en/solution/tech-solution/
- https://www.alibabacloud.com/help/en/aidbs/user-guide/ragflow-overview-and-use
- https://www.alibabacloud.com/tc/solution/tech-solution/hiclaw
- https://github.com/infiniflow/ragflow
- https://www.reddit.com/r/Rag/comments/1o4lolr/ragflow/
- https://www.alibabacloud.com/blog/beyond-demo-grade-architecture-building-a-highly-available-production-foundation-for-dify-with-sae-%C3%97-sls_603213
- https://www.alibabacloud.com/help/en/agentloop/integrate-with-agentloop-application-monitoring-via-ai-agent
- https://www.alibabacloud.com/blog/602515
- https://www.facebook.com/alibabacloud/photos/dify-community-edition-is-now-available-in-alibaba-clould-marketpalcedifyai-is-a/1122028333302591/
- https://www.alibabacloud.com/tc/solution/tech-solution/deepseek-harness
- https://www.alibabacloud.com/blog/602852
- https://www.instagram.com/p/DUpBD5lFXZG/
- https://help.aliyun.com/en/polardb/polardb-for-mysql/polardb-agent-memory-emotional-companion-robot
- https://www.alibabacloud.com/en/solution/tech-solution-deploy/3044083
- https://www.alibabacloud.com/blog/ai-coding-enters-the-agent-teamwork-era-introducing-qoder-experts-mode_603406
- https://resource.alibabacloud.com/tc/webinar/detail.html?id=2536
- https://www.youtube.com/watch?v=yBppXdk2Wqo
- https://www.alibabacloud.com/help/en/wuying-workspace/user-guide/expert-agent
- https://www.alibabacloud.com/en/press-room/press-release?_p_lc=1
- https://www.facebook.com/munayyergroup/posts/companies-are-still-investing-billions-in-ai-infrastructure-but-the-focus-is-sta/1595869525661568/
- https://relevanceai.com/integrations
- https://agenticindex.lovable.app/technologies
- https://www.sec.gov/Archives/edgar/data/1899830/000110465922112496/tm2227810-1_f1.htm
- https://www.therecursive.com/llms-full.txt
- https://www.quora.com/What-is-smart-computing-technology
- https://onlinelibrary.wiley.com/doi/10.1111/dsji.12303
- https://www.alibabacloud.com/en/solution/tech-solution/rapidly-deploy-dify-to-accelerate-ai-application-development
- https://www.alibabacloud.com/en/solution/tech-solution-deploy/2870155
- https://www.alibabacloud.com/en/solution/tech-solution-deploy/2871859
- https://github.com/alibaba/dify
- https://www.alibabacloud.com/en/market/dify?_p_lc=1
- https://help.aliyun.com/en/ack/cloud-native-ai-suite/use-cases/building-customized-ai-question-and-answer-assistant-based-on-dify
- https://www.alibabacloud.com/blog/bring-ai-to-your-data-orchestrating-web-research-and-internal-databases-with-dify_602897
- https://www.youtube.com/watch?v=Y5BuJjViloE
- https://www.alibabacloud.com/en/solution/tech-solution/information-extraction
- https://www.alibabacloud.com/en/solution/tech-solution-deploy/2856973
- https://www.alibabacloud.com/tr/solutions/ai-application-information-extraction?_p_lc=1
- https://www.alibabacloud.com/blog/601971
- https://www.alibabacloud.com/blog/alibaba-cloud-emr-serverless-starrocks-lakehouse-multimodal-retrieval-one-sql-for-full-text-scalar-and-vector-hybrid-search_603345
- https://help.aliyun.com/en/pai/use-cases/multimodal-search-solution
- https://www.alibabacloud.com/blog/enhance-your-ai-capabilities-with-alibaba-clouds-ai-acceleration-solution_600275
- https://www.alibabacloud.com/blog/alibaba-cloud-big-data-solutions-for-real-time-analysis-and-decision-making-for-enterprises_597169
- https://www.alibabacloud.com/blog/team-edition-openclaw-hiclaw-open-source-build-a-one-person-company-in-5-minutes_602926
- https://www.alibabacloud.com/help/en/alibaba-cloud-technology-solutions/latest/deploying-a-copaw
- https://www.facebook.com/alibabacloud/posts/hiclaw-v106-the-secret-to-secure-ai-agent-orchestration-hiclaw-just-bridged-the-/1375377554634333/
- https://www.alibabacloud.com/blog/40%2B-commits-daily-hiclaw-v1-0-6-lands-credential-zero-security-skills-%2B-mcp-%3E-2_602956
- https://www.youtube.com/watch?v=7_FL9_RbLMY&vl=en
- https://www.alibabacloud.com/blog/achieve-operational-control-for-openclaw-with-alibaba-cloud-sls-one-click-integration_603034
- https://www.alibabacloud.com/blog/thinking-of-deploying-openclaw-what-are-your-best-options_602957
- https://www.facebook.com/alibabacloud/videos/openclaw-ai-on-alibaba-cloud-one-click-setup-starting-at-099month/800724546374358/
- https://www.alibabacloud.com/blog/agentscope-java-2-0-building-a-distributed-enterprise-grade-foundation-for-ai-agents_603231
- https://www.alibabacloud.com/blog/spring-ai-alibaba-1-0-ga-officially-released-marking-the-advent-of-a-new-era-in-java-agent-development_602299
- https://github.com/alibaba/spring-ai-alibaba
- https://www.facebook.com/alibabacloud/posts/-agentscope-java-11-build-self-evolving-agents-claw-local-minqwenpaw-with-shell-/1441638698008218/
- https://www.zenml.io/llmops-database/building-a-data-centric-multi-agent-platform-for-enterprise-ai
- https://www.alibabacloud.com/blog/the-more-the-agent-is-used-the-smarter-it-becomes-the-agentscope-java-online-training-plugin-is-here_602866
- https://java2ai.com/en/docs/1.0.0.2/get-started/agent/
- https://www.alibabacloud.com/blog/602455
- https://central.sonatype.com/artifact/com.alibaba.cloud.ai/spring-ai-alibaba-starter-agentscope/1.1.2.2
- https://www.alibabacloud.com/blog/build-a-rag-platform-with-hologres-and-n8n-a-step-by-step-guide_602963
- https://n8n.io/
- https://www.youtube.com/watch?v=Fy1UCBcgF2o
- https://www.alibabacloud.com/blog/industry-practices-and-cloud-native-solutions_597393
- https://www.linkedin.com/posts/alibaba-cloud-computing-company_qwen-is-now-one-click-away-in-n8n-no-api-activity-7506297808430260224-SaYn
- https://codalent.com/services/ai/n8n
- https://www.gentechbridge.com/services/n8n-automation
- https://aztechtraining.com/articles/n8n-ai-automation-training-build-no-code-ai-agents-and-smart-workflows
- https://click.alibabacloud.com/m/20000001014/
- https://www.alibabacloud.com/blog/building-a-custom-chatbot-with-web-scraping-and-alibaba-cloud-model-studio_601863
- https://www.alibabacloud.com/blog/602978
- https://www.alibabacloud.com/blog/602087
- https://help.aliyun.com/en/ecs/user-guide/user-guide-for-ai-assistant
- https://neurons-lab.com/articles/a-step-by-step-guide-to-prototyping-and-deploying-a-chatbot-on-aws-ecs-fargate/
- https://www.alibabacloud.com/blog/designing-multi-agent-enterprise-systems-with-alibaba-cloud_603591
- https://www.alibabacloud.com/blog/601555
- https://www.alibabacloud.com/blog/bridging-the-gap-in-generative-ai-fine-tuning-meets-rag-on-alibaba-cloud_602142
- https://www.alibabacloud.com/blog/fine-tuning-ai-models-on-alibaba-cloud-pai-a-practical-guide_603422
- https://help.aliyun.com/en/document_detail/3034756.html
- https://www.linkedin.com/posts/alibaba-cloud-computing-company_master-the-creation-of-an-ai-powered-rag-activity-7198591967390281728-QajC
- https://www.alibabacloud.com/blog/603615
- https://alibaba-cloud.medium.com/building-rag-services-on-compute-nest-with-alibaba-cloud-model-studio-and-analyticdb-for-8f26bee20273
- https://www.reddit.com/r/unsloth/comments/1k0vip7/need_help_finetuning_an_llm_for_a_customer/
- https://www.facebook.com/alibabacloud/videos/model-studio-finalmp4/874348851197500/
- https://www.alibabacloud.com/help/en/model-studio/token-plan-team-quickstart
- https://www.alibabacloud.com/blog/599104
- https://davidokeyode.medium.com/step-by-step-guide-connect-ai-models-in-alibaba-cloud-model-studio-with-openclaw-ada70b6977cb
- https://www.alibabacloud.com/campaign/ai-tools-for-e-commerse-and-advertising
- https://www.alibabacloud.com/blog/qwenwork-unveiled-e-commerce-tool-to-help-merchants-in-china-boost-efficiency_603637
- https://www.facebook.com/AlibabaCloudSEA/posts/-multimodal-creation-is-now-live-on-qwenwork-drop-in-a-few-product-images-and-te/1098851526042746/
- https://www.alibabacloud.com/blog/ai-native-ecommerce-analytics-with-quick-bi_603237
- https://www.youtube.com/watch?v=qSO145PZYws&vl=en
- https://www.alizila.com/alibaba-cloud-announced-the-latest-ai-models-tools-and-infrastructure-available-to-drive-more-efficient-global-ai-community/
- https://www.alibabacloud.com/en/product/lingma?_p_lc=1
- https://www.alibabacloud.com/help/en/lingma/introduction-of-lingma
- https://www.alibabacloud.com/help/en/model-studio/coding-plan
- https://qoder.com/
- https://help.aliyun.com/en/lingma/
- https://baike.baidu.com/en/item/Qoder/1427525
- https://plugins.jetbrains.com/plugin/17809-lingma--alibaba-cloud-ai-coding-assistant/versions
- https://www.alibabacloud.com/help/en/lingma/qoder-cn-update-log
- https://www.alibabacloud.com/blog/603082
- https://www.alibabacloud.com/blog/qwen-image-3-0-rich-content-authentic-details-deep-knowledge_603385
- https://www.facebook.com/alibabacloud/videos/-multimodal-creation-is-now-live-on-qwenwork/1412090857548699/
- https://www.facebook.com/alibabacloud/videos/multimodal-creation-on-qwenwork-from-raw-assets-to-finished-creative-in-one-conv/1633929041719598/
- https://www.alibabacloud.com/blog/603687
- https://www.facebook.com/alibabacloud/posts/how-can-regulated-enterprises-scale-ai-without-compromising-cost-accuracy-or-dat/1508127031359384/
- https://www.alibabacloud.com/help/en/model-studio/model-pricing
- https://www.reddit.com/r/AISEOInsider/comments/1m7h8p5/how_chinas_secret_qwen_3_ai_beats_every_paid/
- https://www.linkedin.com/posts/alibaba-cloud-computing-company_alibabacloudsg-qwen-modelstudio-activity-7493933893255950336-4QyY
- https://www.reuters.com/world/china/alibaba-unveils-new-qwen35-model-agentic-ai-era-2026-02-16/
- https://www.subconscious.dev/providers/alibaba-cloud
- https://www.alibabacloud.com/en/customers/pt-cerita-inovasi-kopi-indonesia?_p_lc=1
- https://www.linkedin.com/posts/easternstack_cerita-inovasi-kopi-use-case-activity-7501164948908244992-5BVf
- https://www.youtube.com/watch?v=c-IsbJFPbFY
- https://jdi.group/from-qwen-to-qwenwork-alibaba-clouds-vision-for-ai-driven-business-in-vietnam/
- https://www.linkedin.com/posts/deiby-diana-pangemanan-76180979_cerita-inovasi-kopi-use-case-activity-7501193372452401152-RfPB
- https://www.alizila.com/alibaba-launches-qwenwork-international-edition-extending-its-all-in-one-workplace-ai-agent-to-global-markets/
- https://www.instagram.com/p/DdIndU4SPCv/
- https://www.alibabacloud.com/blog/alibaba-cloud-expands-ai-infrastructure-in-japan-with-launch-of-fifth-data-center-and-new-model-service-platform_603269
- https://x.com/alibaba_cloud/status/2067563795136786790
- https://technologymagazine.com/news/alibabas-model-studio-powers-trusted-ai-in-private-clouds
- https://www.youtube.com/watch?v=9yRStXvKhbo
- https://www.alibabacloud.com/blog/alibaba-cloud-establishes-second-data-center-in-thailand-with-richer-product-portfolio-for-generative-ai-and-industry-specific-solutions_601985
- https://www.alizila.com/alibaba-clouds-ai-models-power-real-world-applications-across-industries-in-china/
- https://www.linkedin.com/posts/alibaba-cloud-computing-company_lighthousecustomerstories-qwen-wan-activity-7506303517163249664-lhhv
- https://www.instagram.com/reel/DF9RNTzSWOl/
- https://www.facebook.com/alibabacloud/posts/-alibaba-cloud-brings-qwen-to-saudi-arabia-at-leap-2025-alibaba-cloud-in-collabo/1047552840750141/
- https://www.alibabacloud.com/en/customers/zencreator?_p_lc=1
- https://www.alibabacloud.com/product/model-studio
- https://x.com/alibaba_cloud/status/2100537775099380141
- https://www.instagram.com/reel/DdYr1sPDH-A/
- https://modelstudio.alibabacloud.com/
- https://www.alibabacloud.com/blog/wan3-0-30-second-ai-video-generation-from-any-input_603452
- https://www.facebook.com/alibabacloud/videos/zencreator-scaling-ai-content-production-with-qwen-wan-models/2274377419799671/
- https://www.facebook.com/alibabacloud/posts/scaling-high-volume-ai-image-and-video-generation-is-no-small-task-for-platforms/1539656121539808/
- https://www.alibabacloud.com/help/en/model-studio/newly-released-models
- https://www.linkedin.com/pulse/zencreator-scaling-ai-content-production-qwen-wan-models-qfuse
- https://www.alibabagroup.com/en-US/ai-governance
- https://www.alibabagroup.com/en-US/ai-governance/governance
- https://www.alibabagroup.com/document-1907873420045975552
- https://www.alibabagroup.com/en-US/ai-governance/our-approach
- https://www.alibabagroup.com/document-1973816100088971264
- https://ai.engineer/orgs/alibaba-group-qwen
- https://www.linkedin.com/posts/cnrobopedia_alibaba-upgrades-qwen-ai-platform-to-bring-activity-7508442831368286208-f3qM
- https://www.alibabacloud.com/blog/qwen-agentworld-language-world-models-for-general-agents_603304
- https://www.instagram.com/p/DHacc9KOize/
- https://www.digitalapplied.com/blog/case-study-agentic-customer-support-fintech-50-deflection-2026
- https://www.cygnet.one/feeds/blog/agentic-ai-platforms-measurable-roi-customer-service
- https://www.reddit.com/r/SaaS/comments/1sshmo3/we_built_a_customer_support_ai_with_395/
- https://coworker.ai/blog/ai-customer-service-statistics
- https://fin.ai/learn/resolution-rate-vs-deflection-rate
- https://decagon.ai/glossary/deflection-rate
- https://aissist.io/industries/ai-customer-service-benchmark-2026
- https://mlq.ai/news/alibaba-launches-qwen-35-ai-model-with-superior-efficiency-and-agentic-features/
- https://www.quora.com/What-are-Alibabas-Qwen-AI-models-and-how-might-they-impact-the-AI-market
- https://kingy.ai/news/alibaba-cloud-ai-review-model-studio-qwen-explained-2025/
- https://www.reddit.com/r/opencode/comments/1vkamb2/outrageous_charging_by_alibaba_cloud_model_studio/
- https://www.alibabacloud.com/en/customers/tigereye?_p_lc=1
- https://www.linkedin.com/pulse/from-recognition-communication-empowering-tigereyes-jacce
- https://www.linkedin.com/posts/alibaba-cloud-computing-company_alibabacloud-successstory-tigereye-activity-7386636226587586561-QsnP
- https://www.marketsandmarkets.com/Market-Reports/geography/conversational-ai-market/Japan
- https://www.youtube.com/watch?v=K-4zGeIejE4&vl=en-US
- https://www.imarcgroup.com/japan-conversational-ai-market
- https://www.alibabacloud.com/en/customers/hamilton?_p_lc=1
- https://www.casestudies.com/company/alibaba-cloud/case-study/hamilton-cuts-manual-review-time-by-80-with-alibaba-cloud
- https://www.linkedin.com/posts/alibaba-cloud-computing-company_cloudcomputing-accounting-digitaltransformation-activity-7411589876510285824-pgs0
- https://x.com/alibaba_cloud/status/2005824056575037490
- https://www.facebook.com/alibabacloud/videos/alibaba-cloud-ai-with-heart-caring-for-malaysias-people-and-culture/2364368234000190/
- https://interconnect.substack.com/p/alibabas-ai-drama
- https://k-farruh.medium.com/generating-sql-queries-with-alibaba-clouds-qwen-acf763299f92
- https://www.alibabacloud.com/customers/ignitevision
- https://www.linkedin.com/pulse/ignite-vision-alibaba-cloud-scaling-ai-influencer-marketing-5k8le
- https://x.com/alibaba_cloud/status/2108110086765674538/photo/1
- https://www.facebook.com/AlibabaCloudSEA/posts/influencer-discovery-shouldnt-take-hoursignite-vision-leveraged-qwen-to-replace-/1124771646784067/
- https://www.linkedin.com/posts/alibabacloudglobal_ignite-vision-alibaba-cloud-scaling-ai-activity-7496507104132894720-WVvL
- https://www.linkedin.com/posts/alibabacloudglobal_alibabacloud-ainnovation-alibabacloudglobalsummit2025-activity-7363885530368929792-v2j0
- https://aiproem.substack.com/p/alibaba-cloud-summit-hk-the-2b-ai
- https://www.scribd.com/document/1076336409/Alibaba-Qwen-Case-Study
- https://www.alibabacloud.com/blog/603591
- https://domino.ai/blog/multi-agent-orchestration-patterns
- https://www.kore.ai/blog/choosing-the-right-orchestration-pattern-for-multi-agent-systems
- https://www.databricks.com/blog/multi-agent-supervisor-architecture-orchestrating-enterprise-ai-scale
- https://www.mygreatlearning.com/blog/multi-agent-systems-patterns-architectures-explained-with-examples/
- https://www.confluent.io/blog/event-driven-multi-agent-systems/
- https://cohere.com/blog/multi-agent-systems
- https://medium.com/@dataninsight/building-enterprise-multi-agent-system-2df68dcf11d4
- https://www.alibabacloud.com/blog/building-enterprise-ai-agents-with-alibaba-cloud_603562
- https://www.alibabacloud.com/help/en/agentbay/support/faq
- https://www.youtube.com/watch?v=RroLKPcosqI
- https://www.alibabacloud.com/blog/what-does-alibaba-clouds-agent-infra-look-like_603177
- https://www.alibabacloud.com/blog/complete-beginners-guide-building-your-first-ai-agent-on-alibaba-cloud_602346
- https://www.alibabacloud.com/help/en/well-architected/ai-native-transformation
- https://aws.amazon.com/blogs/aws/announcing-aws-well-architected-agent-an-ai-powered-intelligence-to-optimize-your-cloud-environment-preview/
- https://www.linkedin.com/pulse/aws-well-architected-agent-bringing-agentic-ai-continuous-rich-lee-f3alc
- https://www.alibabacloud.com/en/services/well-architected_service?_p_lc=1
- https://theaieconomy.substack.com/p/aws-well-architected-agent-cloud-review
- https://aws.plainenglish.io/aws-well-architected-agent-i-let-ai-review-a-cloud-architecture-heres-what-it-found-5bf5bda0b48b
- https://www.alibabacloud.com/blog/603562
- https://alphasignal.ai/news/alibaba-cloud-s-ai-agent-handbook-reveals-only-10-hit-90-task-success
- https://www.alibabacloud.com/blog/enterprise-ai-security-guardrails-protecting-sensitive-data-with-alibaba-cloud_603590
- https://community.alibabacloud.com/tags/type_blog-tagid_39139/
- https://www.alibabacloud.com/blog/603583
- https://www.alibabacloud.com/blog/beyond-rag-designing-enterprise-ai-workflows-with-models-apis-and-functions_603578
- https://www.alibabacloud.com/blog/603577
- https://www.alibabacloud.com/blog/from-ai-prototype-to-production-how-to-evaluate-enterprise-ai-applications-with-alibaba-cloud-model-studio_603579
- https://www.alibabacloud.com/blog/strengthen-your-cloud-security-comprehensive-protection-with-security-center_601242
- https://www.alibabacloud.com/blog/the-deep-research-agent-pattern_603244
- https://www.alibabacloud.com/blog/603177
- https://www.alibabacloud.com/blog/zero-code-transformation-making-the-ai-agent-sandbox-no-longer-a-black-box_603571
- https://www.alibabacloud.com/help/en/agent-sandbox/product-overview/agent-sandbox-overview
- https://www.alibabacloud.com/blog/from-long-term-memory-to-self-evolution_603343
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/scale/memory-bank
- https://github.com/aliyun/ai-agent-handbook/blob/main/README_EN.md
- https://www.alibabacloud.com/help/en/cs/user-guide/agent-sandbox/
- https://www.youtube.com/watch?v=KZPo15M2DbM&vl=en-US
- https://www.alibabacloud.com/blog/603614
- https://www.alibabacloud.com/en/product/ai_guardrails?_p_lc=1
- https://www.facebook.com/alibabacloud/posts/ai-guardrails-real-time-protection-for-llms-and-ai-agents-%EF%B8%8Fsecurity-is-mandatory/1505252311646856/
- https://www.alibabacloud.com/blog/alibabas-latest-ai-agent-benchmark-awarded-best-resource-paper-at-acl-2026_603341
- https://www.alibabacloud.com/help/en/model-studio/model-evaluation-introduction/
- https://developers.googleblog.com/evaluating-ai-agents-moving-past-the-vibe-check/
- https://github.com/aliyun/ai-agent-handbook
- https://www.bestblogs.dev/en/article/4d2f52cac6?entry=landing_todays_picks
- https://github.com/bojieli/ai-agent-book/blob/main/book-en/chapter1.md
- https://github.com/aliyun/ai-agent-handbook/blob/main/package.json
- https://github.com/aliyun/ai-agent-handbook/blob/main/.gitignore
- https://github.com/aliyun/ai-agent-handbook/security
- https://llmrepos.com/repos/aliyun/ai-agent-handbook
- https://danielmeppiel.github.io/agentic-sdlc-handbook/handbook/ch05-governance-for-ai-assisted-delivery.html
- https://www.alibabacloud.com/blog/from-black-box-to-transparent-alibaba-cloud-agent-observability-and-audit-data-collection-in-practice_603239
- https://www.alibabacloud.com/blog/when-ai-coding-agent-becomes-infrastructure-why-we-open-sourced-loongsuite-pilot_603387
- https://www.instagram.com/reel/DRFWV6-CSNq/?hl=en
- https://help.aliyun.com/en/model-studio/rag/agent-cli
- https://www.linkedin.com/posts/rakeshgohel01_9-github-repos-you-should-bookmark-while-activity-7348388830074310656-M_JM
- https://www.productmap.io/blog/git-product-knowledge-repository-ai-agents
- https://levelup.gitconnected.com/the-practical-guide-to-building-ai-agents-hands-on-github-agent-in-5-minutes-720c5950ca0e
- https://github.com/aliyun/ai-agent-handbook/issues/views
- https://medium.com/@iduryodhanrao/a-practical-guide-to-structuring-an-ai-agent-repository-and-why-every-folder-matters-d1627a6dd022
- https://www.alibabacloud.com/blog/603244
- https://www.alibabacloud.com/help/doc-detail/3042598.html
- https://www.alibabacloud.com/blog/say-goodbye-to-complex-onboarding-ai-agent-skills-drive-cloud-monitors-observability-integration_603437
- https://www.truefoundry.com/blog/ai-agent-observability-tools
- https://www.facebook.com/alibabacloud/posts/stuck-in-manual-agent-evals-alibaba-cloud-agentloop-builds-a-self-evolution-flyw/1469778651860889/
- https://www.comet.com/site/blog/what-is-ai-observability/
- https://laminar.sh/article/agent-observability
- https://blog.sentry.io/ai-agent-observability-developers-guide-to-agent-monitoring/
- https://www.youtube.com/watch?v=R0VZUKST1Ek&vl=en
- https://hermes-ai.net/news/alibaba-cloud-s-ai-agent-handbook-reveals-only-10-hit-90-task-success/
- https://openmodeldrops.com/links/
- https://airanks.app/zh/repo/fastai/course20
- https://aitop.news/item/51388
- https://aldenwangexis.github.io/posts/ai-agent-handbook-offline-bundle/
- https://github.com/keyuchen21/agentic-engineering-handbook
- https://wakelatencyreport.com/posts/coding-harness-design-for-sandboxed-ai-agents
- https://www.clawbot.blog/blog/ai-agents-vs-gateways-vs-harnesses-deconstructing-the-ecosystem-after-the-hn-cla/
- https://developer.aliyun.com/article/1774447
- https://link.springer.com/content/pdf/10.1007/978-981-96-6963-9.pdf
- https://www.alibabacloud.com/blog/603578
- https://www.alibabacloud.com/blog/transform-your-ai-journey-with-alibaba-cloud-model-studio-simplify-secure-and-innovate_601490
- https://www.gartner.com/reviews/product/alibaba-cloud-model-studio
- https://chozan.co/alibaba-cloud/
- https://www.alibabacloud.com/blog/higress-ai-officially-launches-effortlessly-unlock-new-ai-capabilities-and-start-global-services_602096
- https://higress.ai/en/api-gateway/
- https://www.alibabacloud.com/blog/ai-gateway-analysis-openrouter-vs-higress_602401
- https://higress.ai/en/docs/ai/scene-guide/application-safety/
- https://www.alibabacloud.com/blog/vercel-ai-gateway-vs-higress-which-one-is-more-suitable-for-your-ai-application_602278
- https://higress.ai/en/comparison/
- https://github.com/higress-group/higress
- https://www.alibabacloud.com/blog/the-essential-course-that-ai-agent-engineers-cannot-avoid-api-gateway-vs-api-management_602254
- https://higress.ai/en/ai-gateway/
- https://github.com/bojieli/ai-agent-book/blob/main/book-en/chapter2.md
- https://github.com/minicoohei/ai-agent-camp
- https://www.anthropic.com/research/building-effective-agents
- https://github.com/bojieli/ai-agent-book/blob/main/book-en/chapter4.md
- https://www.youtube.com/watch?v=Zqno_vux6d8&vl=en-US
- https://www.scribd.com/document/1075676827/AI-Agents-in-Depth-En
- https://www.youtube.com/watch?v=LeALSSsbzHU
- https://ratipcanuysal.com/ai-handbook
- https://mbrenndoerfer.com/writing/speeding-up-ai-agents-performance-optimization
- https://hermes-ai.net/news/page/2/
- https://hermes-ai.net/news/topic/agents/
- https://www.alibabacloud.com/help/en/model-studio/hermes-agent
- https://www.youtube.com/watch?v=mTYxpIRK7xA
- https://hermes-ai.net/news/topic/open_source/
- https://www.youtube.com/watch?v=QwaoMihNh44
- https://hermes-agent.nousresearch.com/docs/getting-started/quickstart
- https://help.aliyun.com/en/alinux/agentic-os
- https://www.alizila.com/alibaba-international-unveils-enterprise-ai-agent-platform-for-global-smes/
- https://www.aalpha.net/blog/ai-agent-development-lifecycle/
- https://www.alibabacloud.com/help/en/model-studio/application-introduction
- https://www.alibabacloud.com/help/en/model-studio/application-data/
- https://help.aliyun.com/en/model-studio/workflow/introduction
- https://www.alibabacloud.com/help/en/model-studio/application-calling-guide
- https://www.alibabacloud.com/help/en/model-studio/workflow-application
- https://www.alibabacloud.com/help/en/pai/node-reference
- https://www.alibabacloud.com/help/en/agentrun/agenrun-best-practices-1/
- https://www.facebook.com/alibabacloud/posts/struggling-with-agent-chaos-%EF%B8%8F-alibaba-clouds-new-agent-infra-solves-5-key-pain-p/1435761375262617/
- https://www.alibabacloud.com/help/en/functioncompute/create-agent-by-code-high-code
- https://www.alibabacloud.com/help/en/agentrun/practice-configure-and-use-the-agent-open-platform-from-0
- https://www.alibabacloud.com/blog/giving-your-ai-agent-a-disposable-workspace-with-alibaba-cloud-agentrun_603324
- https://www.alibabacloud.com/help/en/agentrun/open-platform-introduction.md
- https://ardor.cloud/blog/7-best-practices-for-deploying-ai-agents-in-production
- https://epoch.ai/data/generated/large_scale_ai_models.csv
- https://epoch.ai/data/notable_ai_models.csv
- https://www.youtube.com/watch?v=_R83pFpUWyM
- https://www.alibabacloud.com/blog/engineering-knowledge-engine-the-knowledge-layer-behind-harness-engineering_603402
- https://mastra.ai/articles/context-engineering
- https://hugobowne.substack.com/p/ai-agent-harness-3-principles-for
- https://arxiv.org/html/2603.05344v1
- https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus
- https://harness-engineering.ai/blog/ai-agent-development-kits-a-beginners-guide/
- https://modelstudio.alibabacloud.com/intl/blog/
- https://www.alibabacloud.com/help/en/model-studio/cli/quickstart
- https://help.aliyun.com/en/functioncompute/build-an-ai-shopping-assistant
- https://help.aliyun.com/en/model-studio/use-multi-agent-to-query-alibaba-cloud-resource-information
- https://help.aliyun.com/en/model-studio/build-knowledge-base-qa-assistant-without-coding
- https://help.aliyun.com/en/model-studio/add-an-ai-assistant-to-your-wechat-in-10-minutes
- https://www.aliyun.com/
- https://www.alibabacloud.com/help/en/model-studio/token-plan-best-practice/
- https://www.youtube.com/watch?v=gO174prdB8c
- https://www.alibabacloud.com/blog/building-multimodal-services-with-qwen-and-model-studio_600962
- https://www.alibabacloud.com/en/notice/model_studio_update_notice_for_qwen38max_models_863?_p_lc=1
- https://help.aliyun.com/en/model-studio/qwen-image-api
- https://www.alibabacloud.com/help/en/model-studio/qwen-image-generation-and-editing-api-reference
- https://www.alibabacloud.com/blog/alibaba%E2%80%99s-qwen-app-advances-agentic-ai-strategy-by-turning-core-ecosystem-services-into-executable-ai-capabilities_602801
- https://www.alibabacloud.com/help/en/model-studio/qwen-audio-realtime-user-guides
- https://www.alibabacloud.com/help/en/model-studio/text-to-image
- https://www.alibabacloud.com/help/en/maxcompute/subqueries
- https://www.alibabacloud.com/en/ai-assistant?_p_lc=1
- https://www.alibabacloud.com/help/en/functioncompute/example/
- https://www.intuz.com/blog/maximize-ecommerce-sales-with-ai-shopping-assistant/
- https://www.alibabacloud.com/blog/transform-supply-chain-efficiency-with-alibaba-cloud-ai-agile-intelligent-and-economical-solutions_601251
- https://www.facebook.com/Alibaba.comGlobal/videos/business-sourcing-now-as-simple-as-a-text-stop-searching-and-start-finding-with/961028176345951/
- https://www.alibabacloud.com/help/en/model-studio/get-api-key
- https://www.alibabacloud.com/help/en/model-studio/error-code
- https://www.alibabacloud.com/help/en
- https://github.com/aliyun/ai-agent-handbook/blob/main/LICENSE
- https://aliyun.github.io/ai-agent-handbook/
- https://help.aliyun.com/en/agentloop/user-guide/ai-agent-observability-list/
- https://sidsaladi.substack.com/p/agent-frameworks-101-the-complete
- https://www.freecodecamp.org/news/ai-agent-engineers-guide-60-patterns-for-building-autonomous-systems-book/
- https://www.audoir.com/blog/ai-agent-masterclass
- https://www.aihero.dev/a-complete-guide-to-agents-md
- https://cloud.google.com/resources/content/ai-agent-handbook
- https://www.scribd.com/document/948678163/Ai-Agents-Handbook
- https://mbrenndoerfer.com/books/ai-agent-handbook
- https://dokumen.pub/the-ai-agent-handbook-explore-10-practical-hacks-to-use-ai-agents-for-business-1.html
- https://www.linkedin.com/posts/chorouk-malmoum_google-ai-agent-handbook-activity-7371500775287570432-IbXR
- https://www.facebook.com/groups/aimlmalaysia/posts/2562211560845729/
- https://www.alibabacloud.com/help/fr/model-studio/workflow-application
- https://app.engr-sng.com/glossary/detail/image
- https://app.engr-sng.com/glossary/detail/append
- https://help.aliyun.com/en/model-studio/multimodal-call-app
- https://www.alibabacloud.com/help/en/model-studio/token-plan-overview
- https://www.alibabacloud.com/help/en/model-studio/web-search-for-coding-plan
- https://www.alibabacloud.com/blog/model-studio-token-plan-for-individual-one-subscription-for-every-ai-model-up-to-3x-more-value_603426
- https://www.alibabacloud.com/help/en/model-studio/token-plan-personal-overview
- https://github.com/apache/maka/issues/3680
- https://help.aliyun.com/en/model-studio/token-plan-harness-tool
- https://www.alibabacloud.com/help/en/model-studio/token-plan-team-faq
- https://www.alibabacloud.com/blog/603585
- https://www.alibabacloud.com/help/en/functioncompute/what-is-function-compute
- https://www.alibabacloud.com/help/en/functioncompute/ai-best-practices/
- https://www.alibabacloud.com/help/en/functioncompute/best-practices-of-fc-agent-sandbox/
- https://www.youtube.com/watch?v=KmAvN42-E1k
- https://www.facebook.com/alibabacloud/posts/the-distance-between-a-working-prototype-and-an-agent-you-can-run-in-production-/1573397821498971/
- https://www.alibabacloud.com/help/en/functioncompute/product-overview-fc/
- https://juvchan.medium.com/best-practices-for-working-with-alibaba-cloud-function-compute-917e102dfd95
- https://www.alibabacloud.com/blog/high-availability-and-performance-best-practices-for-deploying-dify-based-on-ack_601874
- https://www.alibabacloud.com/help/en/ack/cloud-native-ai-suite/use-cases/building-customized-ai-question-and-answer-assistant-based-on-dify
- https://community.alibabacloud.com/tags/type_blog-tagid_38436
- https://www.alibabacloud.com/blog/unlock-the-potential-of-rag-and-use-ai-gateways-to-help-dify-applications-cheat_602528
- https://www.alibabacloud.com/help/en/cs/user-guide/build-customized-ai-q-a-assistant-based-on-dify-in-acs
- https://www.alibabacloud.com/help/en/tablestore/use-cases/rag-based-on-dify-and-tablestore
- https://dify.ai/blog/enhance-dify-rag-with-infranodus-expand-your-llm-s-context
- https://www.alibabacloud.com/blog/alibaba-cloud-apsaradb-rds-for-postgresql-18-the-premier-data-foundation-for-ai-applications_602802
- https://www.alibabacloud.com/help/en/rds/apsaradb-rds-for-postgresql/supabase
- https://www.alibabacloud.com/blog/what-kind-of-postgresql-do-we-need-when-80%25-of-databases-are-automatically-created-by-ai_603524
- https://www.alibabacloud.com/blog/apsaradb-rds-debuts-rdshermes-empowering-database-ai-agents-to-evolve-autonomously_603310
- https://www.alibabacloud.com/en/product/apsaradb-for-rds-postgresql?_p_lc=1
- https://www.alibabacloud.com/help/en/rds/apsaradb-rds-for-mysql/rds-copilot-overview
- https://www.reddit.com/r/Supabase/comments/1l1c56c/supabase_native_ai_agent_infrastructureframework/
- https://www.alibabacloud.com/blog/alibaba-cloud-apsaradb-data-agent-enterprise-edition-helps-you-master-your-data-with-ease_603389
- https://skillselion.com/skills/cinience/alicloud-skills/alicloud-database-rds-supabase
- https://www.alibabacloud.com/en/product/apsaradb-rds?_p_lc=1
- https://www.alibabacloud.com/en/product/intelligent-speech-interaction?_p_lc=1
- https://www.alibabacloud.com/help/en/isi/developer-reference/overview-2
- https://www.alibabacloud.com/help/en/isi/user-guide/real-time-speech-recognition.md
- https://www.alibabacloud.com/help/en/ims/real-time-conversational-ai-standard-billing
- https://www.alibabacloud.com/blog/experience-the-power-of-ai-with-alibaba-cloud-model-studio_601353
- https://www.alibabacloud.com/help/en/model-studio/claude-code
- https://www.alibabacloud.com/help/doc-detail/3050657.html
- https://www.alibabacloud.com/help/doc-detail/3047403.html
- https://www.alibabacloud.com/blog/unleashing-the-potential-of-alibaba-cloud-a-basic-overview_601083
- https://www.linkedin.com/posts/alibaba-cloud-computing-company_agentictalks-alibabacloud-aicoding-activity-7492410235291156480-I9Sj
- https://www.alibabacloud.com/blog/building-and-deploying-ai-agents-on-alibaba-cloud-using-pai-and-vector-databases_602227
- https://www.alibabacloud.com/help/en/analyticdb/analyticdb-for-mysql/adbagent-getting-started
- https://www.alibabacloud.com/help/en/analyticdb/analyticdb-for-mysql/adbagent-quickstart
- https://www.alibabacloud.com/blog/new-product-launch-alibaba-cloud-analyticdb_593690
- https://www.alibabacloud.com/help/en/aidbs/getting-started/get-started-with-analytics-agent
- https://www.alibabacloud.com/help/en/analyticdb/analyticdb-for-mysql/adbagent-openapi-usage-guide
- https://db-engines.com/en/system/Alibaba+Cloud+AnalyticDB+for+PostgreSQL
- https://www.alibabacloud.com/blog/agenticdb-born-from-alibaba-cloud-analyticdb-built-for-ai-native-enterprises_603302
- https://help.aliyun.com/en/analyticdb/support/overview-for-getting-started
- https://www.alibabacloud.com/help/en/dataworks/user-guide/create-an-analyticdb-for-postgresql-data-source
- https://www.alibabacloud.com/en/product/analyticdb-for-mysql?_p_lc=1
- https://www.vldb.org/pvldb/vol18/p5139-zhou.pdf
- https://www.alibabacloud.com/help/en/analyticdb/analyticdb-for-postgresql/user-guide/create-an-instance-instance-management
- https://help.aliyun.com/en/analyticdb/analyticdb-for-postgresql/product-overview/analyticdb-for-postgresql-overview
- https://github.com/aliyun/alibabacloud-adbpg-mcp-server
- https://www.alibabacloud.com/en/product/analyticdb-for-postgresql/analyticdb-supabase?_p_lc=1
- https://www.alibabacloud.com/en/campaign/qoder-promotion?_p_lc=1
- https://www.alibabacloud.com/blog/qoder-completes-independent-soc-2-type-ii-examination_603516
- https://www.alibabacloud.com/blog/603392
- https://www.alibabacloud.com/help/en/lingma/qoder-cn/user-guide/enterprise-edition/
- https://qoder.com/en/blog
- https://www.alibabacloud.com/blog/603260
- https://www.facebook.com/AlibabaCloudSEA/videos/meet-qoder-architecture-drafted-code-generated-shipped-in-minutes/1015389314610033/
- https://www.linkedin.com/posts/alibabacloudglobal_agentictalks-alibabacloud-aicoding-activity-7492410237224656896-dmzX
- https://www.alibabacloud.com/help/en/skillsportal/learn-about-the-alibaba-cloud-agent-skills-portal
- https://www.alibabacloud.com/blog/how-ai-agents-integrate-with-cloud-computing_602577
- https://www.alibabacloud.com/blog
- https://www.facebook.com/alibabacloud/posts/data-lakes-were-designed-for-people-dashboards-sql-notebooks-but-as-ai-agents-ta/1510683744437046/
- https://www.alibabacloud.com/campaign/campaign/agentic-talks-s1?_p_lc=1
- https://www.alibabacloud.com/help/en/openlake/what-is-openlake
- https://www.alibabacloud.com/blog/603313
- https://www.linkedin.com/posts/alibaba-cloud-computing-company_agentictalks-alibabacloud-datalake-activity-7494928925983285248-r5lq
- https://resource.alibabacloud.com/activity/webinar/detail.html?id=LS20260005
- https://aws.amazon.com/blogs/big-data/multi-cloud-lakehouse-architecture-on-aws-for-agentic-ai-part-1-architecture-and-best-practices/
- https://help.aliyun.com/en/dlf/dlf-2-0/use-cases/agentic-lakehouse
- https://www.alibabacloud.com/blog/openclaw-launches-on-alibaba-cloud-simple-application-server_602845
- https://www.alibabacloud.com/help/en/simple-application-server/use-cases/openclaw-faq
- https://www.alibabacloud.com/help/en/simple-application-server/use-cases/quickly-deploy-and-use-openclaw
- https://myclaw.ai/solutions/alibaba-cloud-openclaw
- https://www.facebook.com/alibabacloud/posts/openclaw-ai-on-alibaba-cloud-one-click-setup-starting-at-099monthbuild-your-own-/1344715721033850/
- https://www.alibabacloud.com/blog/602884
- https://www.alibabacloud.com/en/customers/truefoundry?_p_lc=1
- https://www.instagram.com/p/DcgA_bEGj4d/
- https://www.linkedin.com/posts/alibaba-cloud-computing-company_lighthousecustomerstories-qwen-ai-activity-7498327996802523136-gbiz
- https://www.alibabacloud.com/blog/4-real-cases-%7C-harness-engineering-is-becoming-the-new-moat_602970
- https://venturebeat.com/orchestration/truefoundrys-open-source-ai-agent-harness-trueforge-boasts-30-75-cheaper-task-completion-than-claude-managed-agents
- https://www.truefoundry.com/blog/engineering/trueforge-vs-claude-managed-agents-benchmark/
- https://www.youtube.com/watch?v=ZS2RBjh1A5Y
- https://github.com/truefoundry/trueforge
- https://www.alibabacloud.com/blog/qwencloud-at-qwen-conference-thailand-2026_603549
- https://www.secondtalent.com/resources/qwen-2-5-max/
- https://www.facebook.com/alibabacloud/posts/first-qwen-meetup-in-jakarta-join-us-for-the-first-qwen-community-gathering-in-i/1213726777466079/
- https://www.alibabacloud.com/customers/lion-parcel
- https://www.facebook.com/alibabacloud/videos/scaling-a-logistics-network-across-indonesia-requires-more-than-just-fleetsit-re/2100652670839618/
- https://www.linkedin.com/posts/alibabacloudglobal_lion-parcel-alibaba-cloud-scaling-logistics-activity-7515740877382905856-kzwu
- https://www.youtube.com/watch?v=uHqRifS5gzE
- https://www.alibabacloud.com/en/press-room/alibaba-cloud-expands-global-infrastructure-and-ai?_p_lc=1
- https://www.instagram.com/reel/Debu7nmy1P3/
- https://www.linkedin.com/posts/alibabacloudglobal_logistics-qwen-ai-activity-7515727388941504512-AjcR
- https://yellow.ai/case-study/lion-parcel/
- https://www.facebook.com/AlibabaCloudSEA/posts/scaling-a-logistics-network-across-indonesia-requires-more-than-just-fleetsit-re/1129564396304792/
- https://www.alibabacloud.com/en/customers/astrazeneca?_p_lc=1
- https://www.instagram.com/p/DAaqX1iSRwB/
- https://www.linkedin.com/posts/chris-hill-a6b51aa5_inspiring-collaboration-between-alibaba-cloud-activity-7206969637119344641-F8tA
- https://www.facebook.com/alibabacloud/videos/most-teams-keep-their-asset-inventory-in-a-spreadsheet-while-vulnerability-data-/1094867909848754/
- https://botco.ai/ai-agents-can-support-adverse-event-reporting/
- https://www.botminds.ai/solutions/adverse-event-case-intake
- https://resource.alibabacloud.com/webinar/detail.html?id=10080
- https://www.facebook.com/groups/developerkaki/posts/2486878421658056/
- https://www.facebook.com/alibabacloud/videos/ai-spotlight-ep3-qwenwork/853512487755293/
- https://www.alibabacloud.com/blog/603121
- https://www.facebook.com/alibabacloud/posts/ai-built-with-enterprises-in-mindat-apsaraconference2026-yusen-chen-vp-of-alibab/1545262714312482/
- https://www.facebook.com/alibabacloud/posts/ai-can-do-more-than-generate-ideas-it-can-get-work-donediscover-how-agent-applic/1574339894738097/
- https://www.alibabacloud.com/blog/603196
- https://x.com/alibaba_cloud/status/1839593544580788540
- https://contactazmedical.astrazeneca.com/global/en/amp-form.html
- https://www.alibabacloud.com/blog/alibaba-cloud-announces-international-expansion-plans-to-power-the-next-generation-ai-innovations_602561
- https://pubmed.ncbi.nlm.nih.gov/33923530/
- https://www.facebook.com/AlibabaCloudSEA/videos/introducing-eagle-ai-your-dedicated-ai-data-analysis-and-insight-assistant/1428277202005373/
- https://www.astrazeneca.com/content/az-in/adverse-event-reporting.html
- https://www.linkedin.com/posts/alibaba-cloud-computing-company_alibabacloud-astrazeneca-aiinhealthcare-activity-7245360011386707969-JAUL
- https://cohere.com/blog/concerning-behaviour-popular-open-weight-ai-model
- https://www.alibabacloud.com/blog/alibaba-cloud-named-a-leader-in-gartner%C2%AE-magic-quadrant%E2%84%A2-for-cloud-database-management-systems-for-sixth-consecutive-year_602747
- https://www.tiktok.com/@alibaba__cloud/video/7610723986917330232
- https://www.reuters.com/legal/litigation/alibaba-ai-model-secretly-tried-reach-beijing-server-test-rival-cohere-says-2026-10-26/
- https://www.alibabacloud.com/en/solutions/ai-application-information-extraction?_p_lc=1
- https://bestarion.com/ragflow-explained/
- https://www.youtube.com/watch?v=jDFpEnJeSVg
- https://ragflow.io/blog/ragflow-0.21.0-ingestion-pipeline-long-context-rag-and-admin-cli
- https://www.alibabacloud.com/blog/alibaba-cloud-launches-first-cloud-region-in-brazil-to-accelerate-cloud-and-ai-transformation_603507
- https://www.alibabacloud.com/blog/603278
- https://www.alibabacloud.com/help/en/iot/product-overview/supported-regions
- https://www.facebook.com/alibabacloud/posts/alibaba-cloud-launches-first-public-cloud-region-in-the-netherlands-located-in-a/1582247623947324/
- https://www.facebook.com/AlibabaCloudSEA/videos/alibaba-cloud-launches-first-public-cloud-region-in-the-netherlands/1125725860210479/
- https://www.alibabacloud.com/en/news/product/copilot-newly-supported-in-multiple-regions-at-the-alibaba-cloud-international-site-k6y?_p_lc=1
- https://www.al-jammaz.com/vendors/alibaba-cloud
- https://www.media-outreach.com/news/singapore/2026/06/17/471102/alibaba-cloud-expands-european-footprint-with-two-availability-zones-in-france/
- https://www.alibabacloud.com/blog/alibaba-cloud-expands-global-infrastructure-and-ai-portfolio-to-accelerate-enterprise-ai-adoption_603594
- https://www.alibabacloud.com/en/solutions/why-alibaba-cloud?_p_lc=1
- https://alibaba-cloud.medium.com/managing-software-and-site-deployment-on-alibaba-cloud-488c99b91c04?source=post_internal_links---------5----------------------------
- https://www.alibabacloud.com/help/en/cloud-migration-guide-for-beginners/latest/regions-and-zones
- https://www.facebook.com/bobreyesdotcom/posts/alibaba-cloud-the-digital-technology-arm-of-alibaba-group-has-unveiled-an-array-/601347162679798/
- https://www.alibabacloud.com/blog/602956
- https://higress.ai/en/hiclaw/
- https://www.alibabacloud.com/blog/602926
- https://higress.ai/en/docs/hiclaw/hiclaw-introduction/
- https://swarms.world/agent/42287d83-8471-4c04-bf12-0bbcd4798256
- https://www.alibabacloud.com/blog/603594
- https://www.alibabacloud.com/en/press-room/alibaba-unveils-roadmap-on-full-stack-ai-strategy?_p_lc=1
- https://www.alibabacloud.com/blog/alibaba-cloud-brings-full-stack-ai-ecosystem-to-global-customers-for-the-agentic-era_603186
- https://www.facebook.com/alibabacloud/videos/alibaba-cloud-officially-unveils-agentic-soc/928445176663484/
- https://www.linkedin.com/pulse/alibaba-cloud-you-want-sound-credible-agentic-ai-start-andrew-martin-hyr3c
- https://www.alibabacloud.com/help/en/agentbay/
- https://www.alibabacloud.com/blog/what-makes-alibaba-cloud%E2%80%99s-newly-released-agentcore-different_603627
- https://www.facebook.com/alibabacloud/posts/the-distance-between-a-working-prototype-and-an-agent-you-can-run-in-production-/1575339537971466/
- https://www.alibabacloud.com/help/en/agentcore/agentcore-product-overview
- https://aws.amazon.com/blogs/machine-learning/ai-agents-in-enterprises-best-practices-with-amazon-bedrock-agentcore/
- https://www.youtube.com/watch?v=cTBGIKAckKE
- https://www.linkedin.com/pulse/what-makes-alibaba-clouds-newly-released-agentcore-q6q5e
- https://www.nexusai-tech.com/ai-insights/alibaba-agentcore-unifies-multi-model-agents-mcp-governance
- https://www.alibabacloud.com/en/global-locations?_p_lc=1
- https://www.alibabacloud.com/help/en/agentcore/api-agentcore-2026-08-04-updateexternalagent
- https://www.alibabacloud.com/help/en/agentcore/agentcore-sdk-high-code-collaboration-guide
- https://aws.amazon.com/about-aws/whats-new/2026/06/amazon-bedrock-agentcore-four-additional-regions/
- https://stackoverflow.com/questions/52562959/where-does-ali-cloud-keep-a-full-list-of-availability-zones
- https://www.alibabacloud.com/help/en/functioncompute/access-agenrun-resources-through-privatelink-intranet
- https://www.alibabacloud.com/help/en/model-studio/singapore-regional-access-information
- https://www.alibabacloud.com/help/en/oss/user-guide/regions-and-endpoints
- https://www.alibabacloud.com/help/en/model-studio/regions
- https://api.alibabacloud.com/api/AgentRun/2025-09-10
- https://github.com/alibabacloud-go/agentrun-20250910
- https://www.alibabacloud.com/blog/602649
- https://www.alibabacloud.com/blog/alibaba-cloud-expands-european-footprint-with-two-availability-zones-in-france_603265
- https://help.aliyun.com/en/agentbay/product-overview/what-is-eds-agentbay
- https://www.alibabacloud.com/help/en/agentbay/product-overview/agentbay-billing-instructions
- https://www.alibabacloud.com/help/en/imm/user-guide/extract-text-from-a-document
- https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/prebuilt/contract?view=doc-intel-4.0.0
- https://community.alibabacloud.com/tags/type_blog-tagid_40634
- https://help.aliyun.com/en/document-mind/product-overview/product-introduction/
- https://cloud.google.com/document-ai
- https://www.alibabacloud.com/help/en/energy-expert/developer-reference/api-energyexpertexternal-2022-09-23-submitdocextractiontask
- https://www.pandadoc.com/features/ai-data-extraction/
- https://www.alibabacloud.com/help/en/imm/user-guide/weboffice-plugin-ai
- https://azure.microsoft.com/en-us/products/ai-foundry/tools/document-intelligence
- https://www.alibabacloud.com/help/en/pds/drive-and-photo-service-ent/user-guide/open-smart-creation
- https://help.aliyun.com/en/document-mind/support/faq/
- https://learn.microsoft.com/en-us/answers/questions/2156548/availability-and-replication-info-on-azure-documen
- https://www.alibabacloud.com/en/press-room/alibaba-cloud-launch-first-cloud-region-in-brazil?_p_lc=1
- https://www.alibabacloud.com/en/press-room/alibaba-cloud-expands-european-footprint-with-two?_p_lc=1
- https://www.alibabacloud.com/blog/597450
- https://help.aliyun.com/en/aiccs/product-overview/billing/
- https://en.wikipedia.org/wiki/Alibaba_Cloud
- https://baike.baidu.com/en/item/Alibaba%20Cloud%20Global%20Infrastructure/5164732
- https://www.alibabacloud.com/help/en/ims/user-guide/real-time-conversational-ai-overview
- https://www.alibabacloud.com/help/en/ims/user-guide/how-to-achieve-data-archiving
- https://elevenlabs.io/conversational-ai
- https://cloud.google.com/gemini-enterprise-cx/cx-agent-studio
- https://www.alibabacloud.com/help/en/ims/user-guide/ai-speaking-partner
- https://www.alibabacloud.com/en/product/ims?_p_lc=1
- https://www.alibabacloud.com/blog/video-ai%253A-next-generation-intelligent-video-production_594220
- https://help.aliyun.com/en/ims/use-cases/real-time-interaction
- https://www.eqs-news.com/news/corporate/alibaba-cloud-expands-global-infrastructure-and-ai-portfolio-to-accelerate-enterprise-ai-adoption/6add7b50-724b-458a-a718-d64caa2ea833_en
- https://www.alibabacloud.com/blog/alibaba-clouds-2026-apsara-conference-full-stack-ai-roadmap-along-with-global-market-expansion-plan_603598
- https://www.facebook.com/alibabacloud/posts/at-apsara2026-alibaba-cloud-introduced-a-suite-of-upgrades-for-its-agentic-cloud/1545725997599487/
- https://www.facebook.com/alibabacloud/posts/just-3-days-to-go-the-2026-alibaba-cloud-apsara-conference-is-almost-herestep-in/1541198684718885/
- https://www.alibabacloud.com/en/apsara-conference/2026-exhibition
- https://cloudresellernews.com/future-plans-revealed-at-alibaba-clouds-apsara-conference-2026/
- https://www.facebook.com/alibabagroupofficial/videos/the-countdown-to-apsara-conference-2026-is-on-follow-the-paper-airplane-as-it-so/2113455816206196/
- https://www.alibabacloud.com/apsara-conference
- https://www.alibabacloud.com/apsara-conference/2026-agenda
- https://www.alibabacloud.com/en/press-room/alibaba-cloud-accelerates-worldwide-ai-innovation?_p_lc=1
- https://www.facebook.com/DotDailyDose/posts/alibaba-cloud-recently-announced-its-latest-global-infrastructure-expansion-plan/1547399070737441/
- https://www.alibabacloud.com/en/press-room/alibaba-cloud-expands-ai-infrastructure-in-japan?_p_lc=1
- https://www.alibabacloud.com/en/events/alibabacloud-developer-summit-2025?_p_lc=1&utm_content=m_1000400427
- https://www.facebook.com/alibabacloud/videos/apsaraconference2026-pavilion-4-the-industry-panorama/3209938066063800/
- https://www.alibabacloud.com/campaign/jvs?_p_lc=1
- https://www.alibabacloud.com/help/en/jvs/quickly-create-and-use-an-agentic-computer
- https://help.aliyun.com/en/jvs/what-is-an-agentic-computer
- https://www.alibabacloud.com/help/en/jvs/
- https://allclaw.org/claw/jvs-claw
- https://halmob.com/blog/alibaba-agent-native-cloud-jvs-mobile-agentteams
- https://www.alibabacloud.com/help/en/ecp/quickly-experience-and-create-cloud-phone-jvs-mobile
- https://www.mobileworldlive.com/ai-cloud/alibaba-cloud-expands-agentic-ai-push-to-france/
- https://help.aliyun.com/en/ims/user-guide/ai-companions
- https://www.youtube.com/watch?v=zeAc2Z7Ovts
- https://www.alibabacloud.com/de/partner/ai-alliance?_p_lc=1
- https://www.alibabacloud.com/blog/alibaba-ai-broadcasted-live-with-real-time-translation-in-214-languages_596952
- https://help.aliyun.com/en/ims/real-time-conversational-ai-standard-billing
- https://www.alibabacloud.com/help/en/model-studio/qwen-audio-3-1-realtime-plus
- https://www.alibabacloud.com/help/en/model-studio/real-time-speech-recognition-user-guide
- https://www.alibabacloud.com/help/en/model-studio/realtime-tts-user-guide
- https://help.aliyun.com/en/model-studio/qwen-audio-3-1-realtime-flash
- https://www.facebook.com/alibabacloud/posts/giving-ai-agents-the-context-to-understand-your-enterpriseat-apsaraconference202/1560996822739071/
- https://www.instagram.com/p/Dd5NkScjzoT/
- https://www.instagram.com/reel/Dabs4fJgoq-/
- https://markets.ft.com/data/announce/detail?dockey=600-202609222300DGAP____ASPR_____corporate_2403542_en-1
- https://www.facebook.com/AlibabaCloudSEA/videos/sgcloudsummit-lancelot-guo/413656199475976/
- https://www.linkedin.com/posts/kit-yu-27753534_we-highlight-key-takeaways-from-the-alibaba-activity-7508090400272961536-j1R8
- https://www.facebook.com/alibabacloud/videos/curious-about-how-cloud-native-databases-are-transforming-to-power-the-ai-era/1575940443379648/
- https://www.instagram.com/reel/DVxStL8Ew_S/
- https://www.alibabacloud.com/blog/aliviews-eddie-wu-shares-alibabas-strategic-full-stack-ai-roadmap-at-the-2026-apsara-conference_603595
- https://www.alizila.com/apsara-conference/
- https://www.facebook.com/MindanaoTimes/posts/alibaba-recently-announced-comprehensive-updates-with-a-roadmap-for-its-full-sta/1747036867425633/
- https://www.alibabacloud.com/blog/alibaba-cloud-unveils-strategic-roadmaps-for-the-next-generation-ai-innovations_602560
- https://www.alibabacloud.com/blog/603440
- https://www.alibabacloud.com/en/solutions/smart-studio?_p_lc=1
- https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0
- https://x.com/alibaba_cloud/status/2091762845008425444
- https://www.instagram.com/p/DcuohrPD8fO/
- https://help.aliyun.com/en/model-studio/rag-api-agent-deploy
- https://www.alibabacloud.com/blog/alibaba-cloud-launches-%E2%80%9Cmodel-studio-exclusive%E2%80%9D-at-indonesia-ai-conference-2025_602465
- https://www.alibabacloud.com/help/en/model-studio/new-free-quota
- https://atlas.verdantix.com/alibaba-cloud-2/alibaba-cloud-model-studio-qwen
- https://trustedrouter.com/providers/alibaba
- https://www.alibabacloud.com/blog/alibaba-cloud-empowers-global-enterprises-with-expanded-ai-services_602929
- https://help.aliyun.com/en/model-studio/managed-agents-cost-tiering
- https://www.dataiku.com/blog/agent-orchestration-explained
- https://slashdot.org/software/comparison/01.AI-vs-Alibaba-Cloud-Model-Studio/
- https://www.alibabacloud.com/help/en/model-studio/model-qwen-deep-research
- https://www.alibabacloud.com/help/tr/model-studio/rag-knowledge-base
- https://help.aliyun.com/en/model-studio/model-qwen-deep-research
- https://www.firecrawl.dev/blog/deep-research-for-ai-agents
- https://github.com/agentscope-ai/agentscope
- https://github.com/spring-ai-alibaba
- https://agentscope.io/
- https://github.com/agentscope-ai/agentscope/issues/1291
- https://github.com/alibaba/spring-ai-alibaba/discussions/4356
- https://medium.com/@algoinsights/agentscope-alibabas-open-source-framework-for-building-multi-agent-apps-85d5f2a2711a
- https://mvnrepository.com/artifact/com.alibaba.cloud.ai/spring-ai-alibaba-agent-framework
- https://www.alibabacloud.com/blog/603486
- https://x.com/alibaba_cloud/status/2036794199115194422
- https://www.alibabacloud.com/blog/code-harness-or-natural-language-harnesses_603240
- https://www.alibabacloud.com/blog/the-moat-of-ai-agents-context-engineering_602376
- https://medium.com/@sakti.bagchi/the-rise-of-harness-engineering-why-the-wrapper-is-the-new-moat-b8594c982d99
- https://bdtechtalks.com/2026/04/06/ai-harness-engineering-claude-code-leak/
- https://www.epsilla.com/blogs/2026-04-18-harnesses-are-dead-the-tool-layer-is-dying-the-tru
- https://www.youtube.com/watch?v=mGYr9VqQnEI
- https://www.alibabacloud.com/blog/a-self-iterating-knowledge-engine-for-ai-native-software-engineering_603446
- https://www.alibabacloud.com/blog/harness-engineering-a-new-paradigm-for-software-production-in-the-ai-era_603486
- https://milvus.io/blog/harness-engineering-ai-agents.md
- https://www.youtube.com/watch?v=UmZytjgs2eo
- https://shiftasia.com/column/harness-engineering-and-ai-agent-harnesses-the-missing-layer-behind-reliable-ai-agents/
- https://www.jamasoftware.com/blog/harness-engineering/
- https://www.harness.io/blog/knowledge-graphs-for-ai-software-delivery
- https://www.alibabacloud.com/blog/how-we-built-a-self-evolving-memory-system-for-qoder_603368
- https://www.alibabacloud.com/help/en/cms/cloudmonitor-2-0/memory-module-overview
- https://arxiv.org/abs/2410.15665
- https://mem0.ai/library/agent-memory/long-term-memory
- https://www.alphaxiv.org/abs/2410.15665
- https://medium.com/illuminations-mirror/building-ai-agents-that-evolve-over-time-cbca780ea49e
- https://aiagentmemory.hashnode.dev/long-term-memory-the-foundation-of-ai-self-evolution
- https://www.linkedin.com/pulse/long-term-memory-foundation-ai-self-evolution-rohan-paul-cdxkc
- https://www.alibabacloud.com/en/solution/tech-solution-deploy/3052071
- https://www.alibabacloud.com/en/solutions/free
- https://www.alibabacloud.com/help/en/model-studio/deepseek-harness
- https://deepinfra.com/blog/deepseek-harness-review
- https://medium.com/coding-nexus/deepseek-harness-a-new-open-source-agent-harness-built-around-plugins-0b958911a568
- https://github.com/deepseek-ai/deepseek-harness
- https://www.alibabacloud.com/blog/tracing-deepseek-harness-with-opentelemetry_603485
- https://www.youtube.com/watch?v=MxbsbHr2lrE
- https://www.udemy.com/course/deepseek-harness-build-plugins-tools-ai-agents/?srsltid=AYCX9vKgpzJ6V4kI4EqpToLKUWw0EdzF5aUylpnmqd3PmL23SNgmw0h-
- https://www.alibabacloud.com/help/en/ecs/user-guide/what-is-ecs
- https://www.alibabacloud.com/blog/automated-web-app-deployment-from-github-push-using-alibaba-cloud-edas_594687
- https://www.alibabacloud.com/help/en/ecs/user-guide/overview-43
- https://www.alibabacloud.com/help/en/dts/user-guide/create-and-use-a-ragflow-instance
- https://www.alibabacloud.com/en/architecture/quick-start?_p_lc=1
- https://help.aliyun.com/en/cli/use-alibaba-cloud-cli-to-migrate-ecs-instances-across-regions
- https://www.alibabacloud.com/help/en/ecs/user-guide/regions-and-zones
- https://oneuptime.com/blog/post/2026-03-04-deploy-rhel-9-alibaba-cloud-ecs/view
- https://www.alibabacloud.com/blog/building-a-catalog-from-book-images-using-alibaba-cloud-oss-and-model-studio_601862
- https://www.alibabacloud.com/blog/real-world-implementation-of-data-analytics-with-alibaba-cloud-adding-value-with-dataworks-part-3_597109
- https://www.youtube.com/watch?v=xgY7k8hVS20
- https://www.alibabacloud.com/help/en/dataworks/user-guide/introduction-to-data-integration-and-multimodal-data-processing-capabilities
- https://www.alibabacloud.com/blog/a-week-of-qwen-in-korea-recap-of-the-alibaba-cloud-%26-flock-io-ai-hackathon_602484
- https://www.alibabacloud.com/blog/602801
- https://www.scmp.com/tech/big-tech/article/3315061/alibaba-cloud-open-second-data-centre-south-korea-ai-demand-rises
- https://www.quora.com/What-are-the-chances-that-Qwen-Alibabas-AI-assistant-could-help-Alibaba-dominate-Chinas-next-generation-digital-gateway
- https://qwen.ai/blog?id=qwen3.5
- https://leventech.hu/en/blog/ai-2026-09-22-alibaba-cloud-europai-regiok-qwen-beszerzes-2026
- https://www.alibabacloud.com/blog/602944
- https://www.linkedin.com/posts/alibaba-cloud-computing-company_logistics-qwen-ai-activity-7515739569112113152-OV3x
- https://www.facebook.com/alibabagroupofficial/videos/ai-is-moving-from-possibility-to-priority-across-asias-businesses-a-new-alibaba-/1973529013325648/
- https://en.wikipedia.org/wiki/Alibaba_Group
- https://www.alibabacloud.com/customers/agrinesia
- https://www.linkedin.com/pulse/agrinesia-alibaba-cloud-moving-beyond-fragmentation-c6dqe
- https://www.facebook.com/AlibabaCloudSEA/posts/indonesia-weaving-the-future-with-ai-innovation-a-legacy-reimagineddiscover-how-/932586819335885/
- https://www.casestudies.com/company/alibaba-cloud/case-study/agrinesia-unifies-5-facilities-with-alibaba-cloud-for-zero-data-loss-migration
- https://agrinesia.co.id/en/news/detail/agrinesia-partners-with-alibaba-cloud-to-accelerate-digital-transformation
- https://www.facebook.com/alibabacloud/videos/how-to-alibaba-cloud-landing-zone-solution-part1/579801766414098/
- https://www.alibabacloud.com/help/en/skillsportal/api-agentexplorer-2026-03-17-struct-category.md
- https://www.facebook.com/MindanaoTimes/posts/at-the-world-artificial-intelligence-conference-waic-2026-alibaba-cloud-introduc/1683691557093498/
- https://int.alibabacloud.com/m/1000135645/
- https://www.alibabacloud.com/help/en/sase/product-overview/apply-for-free-trial
- https://www.alibabacloud.com/en/free?_p_lc=1
- https://help.aliyun.com/en/user-center/support/solutions-free-trial-faq
- https://www.alibabacloud.com/blog/an-introduction-to-alibaba-cloud-free-trial_599913
- https://www.alibabacloud.com/en/academy/client_engagement_ai_innovation_challenge?_p_lc=1
- https://www.alibabacloud.com/help/doc-detail/3049292.html
- https://www.alibabacloud.com/en/solutions?_p_lc=1
- https://www.youtube.com/watch?v=aEv4sr294ME
- https://www.alibabacloud.com/help/en/agentrun/agenrun-sandbox-upgrade-fc-cloud-sandbox-scheme
- https://resource.alibabacloud.com/bestpractice/index.html
- https://www.alibabacloud.com/blog/6-best-practices-for-deploying-an-application-on-alibaba-cloud-part-1_596536
- https://trendmicro.com/trendaivisiononecloudriskmanagement/knowledge-base/alibaba-cloud/
- https://www.quora.com/Whats-the-best-approach-for-building-reliable-AI-agent-workflows
- https://onereach.ai/blog/best-practices-for-ai-agent-implementations/
- https://www.alibabacloud.com/help/en/open-search/search-platform/product-overview/introduction-to-search-platform
- https://www.alibabacloud.com/en/product/opensearch?_p_lc=1
- https://www.alibabacloud.com/blog/opensearch-a-one-stop-solution-to-easily-integrate-llm-generative-ai-in-your-application_600509
- https://www.alibabacloud.com/blog/build-conversational-search-based-on-opensearch-vector-search-edition-integrated-with-a-large-language-model_600119
- https://www.alibabacloud.com/en/solutions/generative-ai/build?_p_lc=1
- https://www.facebook.com/alibabacloud/videos/how-are-ai-leaders-shaping-the-next-era-of-enterprise-aiat-apsaraconference2026-/1271074311869997/
- https://help.aliyun.com/en/open-search/search-platform/
- https://aws.amazon.com/blogs/big-data/build-conversational-ai-search-with-amazon-opensearch-service/
- https://www.alibabacloud.com/blog/optimize-intelligent-search-with-alibaba-clouds-opensearchs-versatile-capabilities_601057
- https://opensearch.org/platform/machine-learning/
- https://www.alibabacloud.com/blog/600119
- https://www.alibabacloud.com/help/en/open-search/
- https://www.alibabacloud.com/help/en/open-search/announcements-and-updates/
- https://help.aliyun.com/en/open-search/industry-algorithm-edition/
- https://www.alibabacloud.com/blog/alibaba-cloud-unleashes-new-ai-search-solution-with-elasticsearch-8-9-release_601027
- https://www.alibabacloud.com/blog/601902
- https://www.alibabacloud.com/en/product/elasticsearch?_p_lc=1
- https://www.alibabacloud.com/blog/mastering-vector-search-how-alibaba-cloud%E2%80%99s-inference-api-enhances-elasticsearch%C2%A0_602005
- https://www.reddit.com/r/Rag/comments/1rfd4md/building_rag_pipelines_using_elasticsearch/
- https://www.alibabacloud.com/blog/from-enterprise-rag-to-ai-assistant%E2%80%94alibaba-cloud-elasticsearch-technology-practice-in-ai-search_601952
- https://help.aliyun.com/en/es/user-guide/using-rag-to-build-knowledge-base-online-q-a-based-on-alibaba-cloud-elasticsearch
- https://www.youtube.com/watch?v=uGQBCv2kIIE
- https://www.elastic.co/search-labs/blog/rag-agent-tool-elasticsearch-langchain
- https://www.alibabacloud.com/help/en/es/user-guide/ai-engine-edition/
- https://www.alibabacloud.com/blog/601581
- https://www.alibabacloud.com/blog/infographic-one-page-guide-qwen-models-ecosystem-and-use-cases_602637
- https://www.alibabacloud.com/help/en/ack/ack-managed-and-ack-dedicated/user-guide/create-an-eci-pod
- https://www.alibabacloud.com/help/en/ecs/release-notes
- https://www.alibabacloud.com/help/en/vpc/public-network-access/
- https://www.alibabacloud.com/help/en/dms/dms-mlflow-operation-guide
- https://www.alibabacloud.com/help/en/starops/user-guide/mcp-service-configuration
- https://www.alibabacloud.com/help/en/arms/application-monitoring/getting-started/install-the-node-js-agent-in-ack-and-acs-clusters-by-using-the-ack-onepilot-component
- https://help.aliyun.com/en/ecs/user-guide/build-a-tdx-confidential-computing-environment
- https://www.alibabacloud.com/help/en/eip/elastic-ip-address
- https://static-aliyun-doc.oss-cn-hangzhou.aliyuncs.com/download%2Fpdf%2F62361%2FProduct_Introduction_intl_en-US.pdf
- https://www.alibabacloud.com/help/en/pai/product-overview/pai-langstudio-feature-retirement-and-migration-guide
- https://www.facebook.com/alibabacloud/posts/2025-a-year-of-global-momentum-at-alibaba-cloud-were-not-just-delivering-technol/1327116672793755/
- https://www.linkedin.com/company/alibaba-cloud-computing-company
- https://www.alibabacloud.com/help/en/cms/cloudmonitor-1-0/developer-reference/api-arms-2019-08-08-endpoint
- https://www.alibabacloud.com/help/en/security-center/user-guide/enabling-and-disabling-agentic-agentless-detection
- https://www.bastillepost.com/global/article/5685620-alibaba-cloud-accelerates-worldwide-ai-innovation-and-adoption-across-industries
- https://www.facebook.com/AiEverythingAbuDhabi/videos/build-the-future-of-ai-with-alibaba-cloud-meet-us-at-ai-everything-abu-dhabi-adn/1757772195256716/
- https://www.linkedin.com/posts/alibabacloudglobal_alibabacloud-pronet-ev-activity-7404000772788535297-G0JD
- https://emas.proton.com/pro-net-and-alibaba-cloud-advance-malaysias-ev-ecosystem-through-strategic-collaboration/
- https://www.alibabacloud.com/blog/601863
- https://www.alibabacloud.com/customers/akool
- https://www.linkedin.com/pulse/alibaba-cloud-akool-redefining-b2b-ai-video-generation-hkqlf
- https://www.alibabacloud.com/en/customers/easemate?_p_lc=1
- https://www.facebook.com/alibabacloud/videos/wan-by-alibaba-cloud-transforms-ideas-into-high-quality-video-at-scale/2316709678803284/
- https://akool.com/blog-posts/wan-2-6-is-here-15-second-multi-scene-audio-synced-ai-video-on-akool
- https://www.alibabacloud.com/blog/alibaba-unveiled-multimodal-models-on-image-and-audio_603395
- https://www.instagram.com/reel/DXrOzV5D57X/
- https://www.alibabacloud.com/blog/chatbots---technology-and-the-future_596402
- https://www.alibabacloud.com/blog/601613
- https://community.alibabacloud.com/go/1/311
- https://slashdot.org/software/chatbot/for-alibaba-cloud/
- https://www.alibabacloud.com/en/product/function-compute?_p_lc=1
- https://www.alibabacloud.com/help/en/functioncompute/create-a-custom-container-function-in-a-container-runtime
- https://www.alibabacloud.com/blog/%EF%BB%BFbuilding-serverless-applications-with-alibaba-cloud-function-compute_602684
- https://www.alibabacloud.com/help/en/agentrun/practice-configure-and-use-the-agent-open-platform-from-0.md
- https://www.tiktok.com/@alibaba__cloud/video/7695684722441178389
- https://www.alibabacloud.com/blog/602950
- https://x.com/alibaba_cloud/status/2033778438293622928
- https://www.alibabacloud.com/help/en/oss/dicom-works-on-alibaba-cloud
- https://edu.alibabacloud.com/learningpath/academic_cloudcomputing
- https://www.sitepoint.com/community/t/alibaba-cloud-architecture-devops-tips/307989
- https://www.facebook.com/alibabacloud/posts/meet-the-new-powerhouse-hiclaw-copaw-running-multiple-ai-agents-can-be-memory-in/1373675281471227/
- https://help.aliyun.com/en/cs/user-guide/build-customized-ai-q-a-assistant-based-on-dify-in-acs
- https://www.youtube.com/watch?v=GQk0IBQjQ5E
- https://www.alibabacloud.com/blog/introduction-to-alibaba-cloud-intelligent-service-robot_593814
- https://www.searchunify.com/resource-center/blog/ai-agent-use-cases-in-customer-service-from-deflection-to-execution/
- https://adp.tencentcloud.com/en/blog/build-a-customer-service-ai-agent-in-6-steps
- https://rasa.com/blog/ai-customer-service-guide
- https://www.automationlabz.com/automations/ai-chatbot-customer-service
- https://x.com/alibaba_cloud/status/2116039001698189664
- https://www.instagram.com/reel/DbF-VGzALYC/
- https://blog.superhuman.com/ai-agent-useful-case-studies/
- https://www.agentmail.to/blog/give-your-support-agent-an-email-inbox
- https://www.sortd.com/usecases/agents-support-triage
- https://www.facebook.com/alibabacloud/posts/consider-a-customer-service-workflow-an-agent-checks-a-delivery-status-and-draft/1583253963846690/
- https://ticnote.com/en/blog/best-ai-agent-customer-service
- https://blog.hubspot.com/service/ai-customer-service-automation
- https://botcadence.com/blogs/ai-email-agent-customer-support-guide
- https://www.alibabacloud.com/blog/should-this-workflow-be-an-agent-a-three-question-test-before-you-build_603614
- https://www.alibabacloud.com/blog/603115
- https://www.alibabacloud.com/blog/ai-guardrails-real-time-protection-for-llms-and-ai-agents%C2%A0_603442
- https://www.alibabacloud.com/help/en/asc/product-overview/what-is-the-agent-security-center
- https://www.linkedin.com/posts/alibaba-cloud-computing-company_alibabacloud-cybersecurity-security-activity-7492780818201817088-MkN6
- https://www.alibabacloud.com/help/en/content-moderation/latest/what-is-ai-security-barrier
- https://www.alibabacloud.com/blog/602949
- https://www.linkedin.com/posts/alibabacloudglobal_ai-aiagent-security-activity-7465597917752438784-fcA0
- https://codenotary.com/blog/ai-agent-security-guardrails
- https://www.alibabacloud.com/blog/from-documents-to-intelligence-designing-enterprise-knowledge-bases-with-alibaba-cloud_603563
- https://www.alibabacloud.com/en/product/quickbi?_p_lc=1
- https://www.alibabacloud.com/en/product/apsarastack?_p_lc=1
- https://www.alibabacloud.com/en/product/content-moderation?_p_lc=1
- https://www.alibabacloud.com/help/en/cms/cloudmonitor-2-0/developer-reference/api-cms-2024-03-30-filter
- https://www.alibabacloud.com/help/en/airec
- https://www.alibabacloud.com/en/product/ivpd?_p_lc=1
- https://www.alibabacloud.com/en/news/product?_p_lc=1
- https://datanorth.ai/blog/getting-started-with-n8n-workflow-automation
- https://aws.amazon.com/marketplace/pp/prodview-mg6uchejq7npq
- https://www.deployhq.com/blog/deploying-n8n-on-alibaba-cloud-using-docker
- https://ones.com/blog/ones-solutions/building-your-first-project-with-workflow-automation-n8n/
- https://www.solutelabs.com/n8n-workflow-automation
- https://hatchworks.com/blog/ai-agents/no-code-workflow-automation-with-n8n/
- https://x.com/alibaba_cloud/status/2021446216530248136
- https://www.alibabacloud.com/blog/new-launch-openclaw-solution-on-alibaba-cloud-compute-nest_602884
- https://www.alibabacloud.com/help/en/pai/deploy-exclusive-openclaw-using-pai-eas-for-5-minutes
- https://cohere.com/blog/chunking-for-rag-maximize-enterprise-knowledge-retrieval
- https://www.reddit.com/r/Rag/comments/1vf3yr6/before_embeddings_how_are_you_handling_messy/
- https://help.aliyun.com/en/model-studio/knowledge-base/
- https://www.facebook.com/alibabacloud/posts/taking-rag-from-prototype-to-production-is-where-most-enterprise-ai-projects-str/1379203414251747/
- https://adp.tencentcloud.com/en/blog/enterprise-rag-guide
- https://www.alibabacloud.com/blog/alibaba-clouds-major-new-release-agent-security-center-an-integrated-defense-platform-for-ai-agents-under-a-new-security-framework_602949
- https://www.alibabacloud.com/help/en/security-center/install-the-security-center-agent
- https://www.alibabacloud.com/en/product/security_center?_p_lc=1
- https://help.aliyun.com/en/asc/user-guide/agent-security-center-overview
- https://www.alibabacloud.com/help/id/legal/latest/alibaba-cloud-international-website-agent-security-center-service-level-agreement
- https://orca.security/resources/blog/what-is-alibaba-cloud-security/
- https://www.alibabacloud.com/en/product/ai-native-database-service?_p_lc=1
- https://www.noxus.ai/blog/enterprise-ai-agents-guide
- https://jetruby.com/blog/enterprise-ai-agents/
- https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns
- https://www.youtube.com/watch?v=2czYyrTzILg
- https://www.reddit.com/r/AgentsOfAI/comments/1pejcbt/breaking_down_5_multiagent_orchestration_for/
- https://halmob.com/blog/alibaba-agent-native-cloud-multi-agent-orchestration
- https://www.celigo.com/blog/ai-agent-architecture/
- https://www.linkedin.com/pulse/enterprise-ai-agent-architecture-explained-frameworks-srikanth-r-asqnf
- https://kanerika.com/blogs/enterprise-ai-architecture/
- https://www.glean.com/blog/7-core-components-of-an-ai-agent-architecture-explained
- https://www.emergentsoftware.net/resources/insights/ai-architecture-a-five-layer-framework-for-enterprise-ai/
- https://atlan.com/know/ai-agent/ai-agent-architecture-explained/
- https://www.alibabacloud.com/help/en/cms/cloudmonitor-2-0/list-of-ai-agents
- https://www.alibabacloud.com/help/en/cms/cloudmonitor-2-0/agentloop/
- https://www.alibabacloud.com/blog/what-is-the-newly-released-agentloop-by-alibaba-cloud_603378
- https://www.splunk.com/en_us/blog/learn/best-agent-observability-platforms.html
- https://www.alibabacloud.com/help/en/agentloop/user-guide/agent-space
- https://arize.com/blog/best-ai-observability-tools-for-autonomous-agents-in-2026/
- https://www.groundcover.com/learn/observability/ai-agent-observability
- https://help.aliyun.com/en/agentcore/agentcore-billing-instructions
- https://www.alibabacloud.com/blog/603627
- https://www.alibabacloud.com/help/en/agentcore/api-agentcore-2026-08-04-listexternalagents
- https://aws.amazon.com/bedrock/agentcore/
- https://www.amazonaws.cn/en/new/2026/amazon-bedrock-agentcore-is-available/
- https://www.alibabacloud.com/help/en/agentcore/api-agentcore-2026-08-04-overview.md
- https://www.alibabacloud.com/help/en/agentcore/product-overview.md
- https://baike.baidu.com/en/item/Amazon%20Bedrock%20AgentCore/7189945
- https://www.alibabacloud.com/blog/real-time-ai-inference-architecture-on-alibaba-cloud_603286
- https://www.alibabacloud.com/blog/redefining-tech-with-machine-learning-and-ai-part-2_597675
- https://www.alibabacloud.com/help/en/pai/product-overview/service-architecture
- https://www.alibabacloud.com/blog/stop-building-ai-demos--start-shipping-enterprise-ai--the-sa-%26-fde-playbook-for-qwen_603651
- https://www.alibabacloud.com/blog/scaling-genai-globally-with-alibaba-cloud-platform-for-ai-pai-%26-eas_603465
- https://www.alibabacloud.com/blog/in-depth-exploration-of-the-rag-optimization-scheme-and-practice_601580
- https://www.alibabacloud.com/blog/alibaba-cloud-gaming-architecture-for-infrastructure-whitepaper_598322
- https://www.alibabacloud.com/blog/601604
- https://help.aliyun.com/en/analyticdb/analyticdb-for-postgresql/use-cases/use-analyticdb-for-postgresql-to-build-a-product-doctor-app-in-model-studio
- https://www.alibabacloud.com/blog/602120
- https://www.facebook.com/alibabacloud/posts/most-ai-forgets-who-you-are-when-you-close-the-tab-introducing-the-mulerun-knowl/1392188929619862/
- https://www.alibabacloud.com/help/doc-detail/3049222.html
- https://appinchina.co/a-guide-to-alibaba-cloud-in-china/
- https://www.alibabacloud.com/help/en/agentloop/product-overview/server-launch-regions-of-agentloop
- https://www.alibabacloud.com/help/en/agentloop/agentloop-quickstart-whole-process-practice
- https://www.alibabacloud.com/en/notice/model_studio_hong_kong_region_now_available_6ed?_p_lc=1
- https://help.aliyun.com/en/document_detail/3041139.html
- https://www.alibabacloud.com/blog/alibaba-cloud-celebrates-10th-anniversary-in-hong-kong-with-pledges-to-strengthen-ecosystem-and-ai-capabilities_601080
- https://www.alibabacloud.com/help/en/agent-sandbox/quick-start1/
- https://www.alibabacloud.com/help/en/functioncompute/product-overview-of-fc-agent-sandbox
- https://www.alibabacloud.com/blog/602980
- https://www.alibabacloud.com/help/en/agent-sandbox/product-overview/limits-of-agent-sandbox
- https://help.aliyun.com/en/cs/user-guide/acs-agent-sandbox-security-best-practices
- https://www.alibabacloud.com/help/en/cs/
- https://www.alibabacloud.com/blog/loongcollector-%2B-acs-agent-sandbox-build-a-production-grade-ai-agent-runtime-platform_603172
- https://e2b.dev/
- https://www.alibabacloud.com/help/en/eci/product-overview/regions-and-zones
- https://help.aliyun.com/en/document_detail/40654.html
- https://www.alibabacloud.com/help/en/acr/product-overview/supported-regions
- https://www.alibabacloud.com/help/en/polardb/api-polardb-2017-08-01-endpoint
- https://www.alibabacloud.com/help/tr/tablestore/table-store-service/product-overview/basic-concepts
- https://www.alibabacloud.com/help/en/nas/developer-reference/api-nas-2017-06-26-endpoint
- https://help.aliyun.com/en/ecs/user-guide/regions-and-zones
- https://www.alibabacloud.com/help/en/ack/distributed-cloud-container-platform-for-kubernetes/developer-reference/api-adcp-2022-01-01-endpoint
- https://www.alibabacloud.com/help/en/cloud-backup/product-overview/feature-availability-by-alibaba-cloud-region
- https://alicloud-common.oss-ap-southeast-1.aliyuncs.com/2022/Trust%20Center/Final%20Alibaba%20Cloud_Macau%20Whitepaper_20200120.pdf
- https://help.aliyun.com/en/asc/user-guide/agent-oop
- https://docs.blaxel.ai/Infrastructure/Regions
- https://www.alibabacloud.com/help/en/agentloop/developer-reference/api-agentloop-2026-05-20-dir-region/
- https://www.alibabacloud.com/help/en/arms/product-overview/arms-supported-regions
- https://www.alibabacloud.com/blog/603651
- https://www.alibabacloud.com/blog/603601
- https://www.alibabacloud.com/blog/602970
- https://community.alibabacloud.com/tags/tagid_40654
- https://www.entrans.ai/blog/forward-deployed-engineers-deploy-ai-agents
- https://www.alibabacloud.com/blog/development-trends-and-architecture-evolution-of-ai-agents_602529
- https://aws.amazon.com/blogs/machine-learning/scaling-agentic-ai-enterprise-patterns-without-vendor-lock-in/
- https://www.alibabacloud.com/blog/602608
- https://www.speakeasy.com/mcp/using-mcp/ai-agents/architecture-patterns
- https://www.alibabacloud.com/blog/real-time-fraud-detection-pipeline-architecture-on-alibaba-cloud_603297
- https://priyankavergadia.substack.com/p/6-types-of-ai-inference-architecture
- https://www.alibabacloud.com/blog/forward-deployed-engineering-using-alibaba-cloud_603601
- https://www.alibabacloud.com/blog/alibabas-quark-unveils-revamped-ai-browser-deeply-integrated-with-qwen_602896
- https://www.alibabacloud.com/blog/prompt-rag-or-fine-tune-a-decision-guide-priced-in-dollars_603615
- https://www.facebook.com/alibabacloud/posts/our-latest-blog-provides-a-step-by-step-guide-to-setting-up-a-retrieval-augmente/905232051648888/
- https://www.alibabacloud.com/en/solutions/generative-ai/rag?_p_lc=1
- https://milvus.io/blog/hands-on-with-qwen-3-and-milvus-building-rag-with-the-latest-hybrid-inference-models.md
- https://www.turingpost.com/p/qwen
- https://mlflow.org/articles/types-of-ai-agent-architectures-2026-developer-guide/
- https://valuestreamai.com/blog/ai-system-architecture-essential-guide-2026
- https://anci.app/7-types-of-ai-agents
- https://www.alibabacloud.com/blog/achieve-manus-in-a-dozen-lines-of-code-a-quick-preview-of-spring-ai-alibaba-graph_602455
- https://www.alibabacloud.com/blog/spring-ai-alibaba-alibaba-cloud-open-source-ai-application-development-framework_601911
- https://medium.com/@higress_ai/the-changes-in-the-agent-development-toolchain-and-the-invariance-of-the-application-architecture-f27b2436855a
- https://www.alibabacloud.com/blog/hello-agentscope-java_602686
- https://www.alibabacloud.com/blog/603243
- https://www.alibabacloud.com/blog/cloud-application-architecture-hosting-%26-things-to-remember_596539
- https://www.alibabacloud.com/blog/601386
- https://www.facebook.com/scmp/posts/the-alibaba-cloud-founder-says-open-source-and-closed-source-ai-philosophies-are/1525638892945491/
- https://www.linkedin.com/posts/gxjansen_95-of-ai-projects-fail-has-come-up-a-lot-activity-7370055142441721856-aR1c
- https://www.wildnetedge.com/blogs/ai-agent-development-mistakes
- https://www.alibabacloud.com/blog/vector-databases-for-enterprise-ai-designing-high-performance-semantic-search-on-alibaba-cloud_603588
- https://www.alibabacloud.com/blog/602142
- https://aws.amazon.com/what-is/retrieval-augmented-generation/
- https://www.youtube.com/watch?v=9ODYjyFEbaw
- https://www.alibabacloud.com/blog/what%E2%80%99s-a-vector-database-really-and-why-your-ai-stack-might-be-overcomplicated_602907
- https://docs.cloud.google.com/architecture/gen-ai-rag-vertex-ai-vector-search
- https://www.alibabacloud.com/blog/601412
- https://discuss.huggingface.co/t/automating-rag-infrastructure-deployment-with-ai/147507
- https://www.alibabacloud.com/help/en/machine-learning-platform-for-ai/latest/product-advantages
- https://www.alibabacloud.com/blog/large-model-applications-in-networked-search-redefining-interaction-and-decision-making-in-the-era-of-intelligence_602074
- https://www.alibabacloud.com/blog/modern-web-scraping-evolving-with-ai-and-cloud-integration_602275
- https://help.aliyun.com/en/es/user-guide/alibaba-cloud-ai-search-solution
- https://medium.com/@alibaba-cloud/selecting-a-cloud-based-ai-solution-e544721553d7
- https://www.alibabacloud.com/help/en/pai/create-a-code-based-application
- https://help.aliyun.com/en/pai/product-overview/pai-langstudio-feature-retirement-and-migration-guide
- https://www.alibabacloud.com/help/en/pai/langstudio-overview/
- https://www.alibabacloud.com/help/en/pai/application-flow-development/
- https://www.alibabacloud.com/en/notice/detail?_p_lc=1&id=2217
- https://www.youtube.com/watch?v=VKJnpO7MtDQ
- https://www.alibabacloud.com/help/en/pai/user-guide/faq
- https://www.alibabacloud.com/help/ja/pai/product-overview/pai-langstudio-feature-retirement-and-migration-guide
- https://help.aliyun.com/en/pai/cloud-product-dependency-and-authorization-langstudio
- https://www.alibabacloud.com/blog/empowering-generative-ai-with-alibaba-cloud-pais-advanced-llm-and-langchain-features_600577
- https://www.alibabacloud.com/blog/alibaba-cloud-pai-new-features-of-alibaba-clouds-machine-learning-platform_596820
- https://www.alibabacloud.com/help/en/cloud-firewall/cloudfirewall/product-overview/supported-regions
- https://help.aliyun.com/en/agentcore/operating-guide/
- https://www.alibabacloud.com/help/tr/model-studio/base-url
- https://www.elastic.co/docs/reference/cloud/cloud-hosted/regions
- https://www.alibabacloud.com/help/en/cen/support/faq-1
- https://www.facebook.com/alibabacloud/videos/alibaba-cloud-singapore-at-atxenterprise-2026-ai-cloud-and-data-innovation/1388429546671739/
