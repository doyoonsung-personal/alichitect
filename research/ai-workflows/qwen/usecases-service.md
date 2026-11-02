I'll research this thoroughly across several passes: Alibaba Cloud product/pricing pages, vendor engineering guidance on agent design, published customer-service metrics, and APAC messaging/regulatory specifics.

Let me pull the specific Alibaba Cloud product and model pages I'll need for mapping.

Now the published metrics and vendor engineering guidance for each use case.

# Customer-service & conversational agentic workflows on Alibaba Cloud
### Reference-workflow research for the diagram app's second focus area
Research date: 2026-11-02 · Default region: Singapore (ap-southeast-1) · Audience: international (SEA, KR, JP, EU, US)

---

## 0. Status of the 2026-10-31 verified facts (re-checked)

All five pre-verified facts still hold on the official international pages as of 2026-11-02:

| Verified fact | Re-confirmation |
|---|---|
| Model Studio agent apps restricted to accounts that created Singapore apps before 2025-04-21 | "Only users who created Alibaba Cloud Model Studio applications in the Singapore region before April 21, 2025 can call the …" [https://www.alibabacloud.com/help/en/model-studio/single-agent-application] |
| Workflow apps same restriction | [https://www.alibabacloud.com/help/en/model-studio/application-introduction] |
| Knowledge base same restriction | "Console access restrictions: Only users who created … before April 21, 2025 can …" [https://www.alibabacloud.com/help/en/model-studio/rag-knowledge-base]; application-data/knowledge-base API calls likewise [https://www.alibabacloud.com/help/en/model-studio/bailian-application-calling/] |
| Model Studio international regions = Singapore, Virginia, Frankfurt, Tokyo, Hong Kong (no Seoul) | "Model Studio is available in the following regions: China (Beijing), US (Virginia), Singapore, Japan (Tokyo), Germany (Frankfurt), and China (Hong Kong)" [https://www.alibabacloud.com/help/en/model-studio/what-is-model-studio] |
| qwen3.8-max = $2 / $6 per 1M tokens in Singapore | Model-pricing page lists Qwen-Max at "$2 $6 … 1 million tokens" for Singapore [https://www.alibabacloud.com/help/en/model-studio/model-pricing]; Alibaba Cloud's own token-plan campaign page repeats $2 input / $6 output [https://www.alibabacloud.com/en/campaign/ai-landing-page-token?_p_lc=1] |
| Fine-tuning international = Singapore only | "Supported regions: The features described in this topic are only available in the Singapore region" [https://www.alibabacloud.com/help/en/model-studio/create-fine-tuning-job-api] |
| PrivateLink = Beijing + Hong Kong only | "Public cloud: China (Beijing) and China (Hong Kong). Private network access is not currently supported …" [https://www.alibabacloud.com/help/en/model-studio/access-model-studio-through-privatelink] |
| AgentLoop international = Hong Kong only | Supported regions = Hangzhou, Shanghai, Hong Kong [https://www.alibabacloud.com/help/en/agentloop/product-overview/server-launch-regions-of-agentloop] |
| AgentRun international endpoint = Singapore only | "Singapore ap-southeast-1" [https://help.aliyun.com/en/agentrun/open-service-area] — **China site only** (the international mirror exists at [https://www.alibabacloud.com/help/en/agentrun/open-service-area.md] but the region table rendered in search only on the China page) |
| AI Search Open Platform = Shanghai + Frankfurt only | "AI Search Open Platform is available only in the China (Shanghai) and Germany (Frankfurt) regions" [https://www.alibabacloud.com/help/en/open-search/search-platform/getting-started/ai-getting-started] |

### Newer information the app should know about

1. **⚠️ Possible price-page ambiguity on qwen3.8-max.** The dedicated model page shows "Input 1.65 / Output 4.951 per 1M tokens" in one region column [https://www.alibabacloud.com/help/en/model-studio/qwen3-8-max], while the Singapore column on the aggregate pricing page shows $2/$6 [https://www.alibabacloud.com/help/en/model-studio/model-pricing]. Third-party trackers attribute $1.65/$4.951 to the US (Virginia) / "Global" deployment scope, not Singapore [https://ai-on-mac.com/articles/qwen3-8-max-pricing-benchmarks-mac-en/][https://www.layer3labs.io/guides/qwen3-8-max-pricing]. **Which column belongs to which region is unconfirmed from the snippets**; the app should read the pricing page live rather than cache a number.
2. **Peak/off-peak pricing now exists in Model Studio.** "Some models use peak/off-peak pricing … Busy hours are 08:00 to 22:00 and idle hours are 22:00 to 08:00 (UTC+8)" [https://www.alibabacloud.com/help/en/model-studio/model-pricing]. Alibaba has advertised off-peak discounts of up to 80% on some Qwen3.7 models [https://www.facebook.com/alibabacloud/videos/run-your-workloads-during-off-peak-hours-with-alibaba-cloud-model-studio/2060340144693947/]. Any cost estimate the app draws must state whether it uses busy-hour or idle-hour rates.
3. **Qwen Cloud launched globally from Singapore on 26 May 2026**, described as "a new AI-native cloud platform … for both businesses and AI agents" [https://www.alibabacloud.com/blog/alibaba-cloud-launches-qwen-cloud-for-global-markets_603191][https://www.alibabacloud.com/en/press-room/alibaba-cloud-unveil-advanced-agentic-ai-ecosystem?_p_lc=1]. This is a *new* front door alongside Model Studio; its relationship to Model Studio app restrictions is **unconfirmed**.
4. **AgentCore is available in Singapore.** Supported regions include "Singapore ap-southeast-1" [https://www.alibabacloud.com/help/en/agentcore/agentcore-product-overview]. AgentCore is "a unified platform for building, governing, and executing enterprise AI agents" [https://www.alibabacloud.com/en/product/agentcore?_p_lc=1].
5. **Speech-to-speech is available in Singapore.** "Qwen-Omni-Realtime … Supported regions: Singapore, China (Beijing)", over WebSocket or WebRTC, full-duplex [https://www.alibabacloud.com/help/en/model-studio/realtime]; qwen3.8-omni-flash-realtime likewise "China (Beijing) and Singapore" [https://www.alibabacloud.com/help/en/model-studio/qwen3-8-omni-flash-realtime].
6. **AgentBay is deployed in Singapore** [https://www.alibabacloud.com/en/product/agentbay?_p_lc=1]; FC Agent Sandbox supports Singapore [https://www.alibabacloud.com/help/en/functioncompute/supported-regions-of-fc-agent-sandbox].
7. **WhatsApp commercial model changed twice.** Per-message pricing from 1 July 2025 [https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing]; from 1 Oct 2026 Meta also charges per-message for utility/service messages inside the 24-hour window [https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/non-template-messages]. Any cost estimate for a WhatsApp agent that omits Meta's per-message fee will be wrong.
8. **EU AI Act Article 50 transparency has been applicable since 2 August 2026** [https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act][https://artificialintelligenceact.eu/article/50/] — chatbots must disclose they are AI.
9. **Korea's AI Basic Act took effect 22 January 2026**, including advance notification for generative AI [https://www.trade.gov/market-intelligence/south-korea-ai-basic-act][https://www.kimchang.com/en/insights/detail.kc?sch_section=4&idx=33805].
10. **Singapore published the Model AI Governance Framework for Agentic AI** (v1.0 Jan 2026, v1.5 May 2026) [https://www.imda.gov.sg/about-imda/emerging-technologies-and-research/artificial-intelligence][https://www.insideglobaltech.com/2026-06-18/singapore-updates-model-ai-governance-framework-for-agentic-ai/].

---

## 1. Product catalog: the blocks the app can draw

### 1.1 Runtime & orchestration (what replaces Model Studio's no-code apps for new accounts)

| Block | What it is | Region reality for intl. customers | Source |
|---|---|---|---|
| **Model Studio (model APIs)** | "one-stop model service platform … full Qwen series and mainstream third-party LLMs" | Singapore, Virginia, Frankfurt, Tokyo, Hong Kong | [https://www.alibabacloud.com/help/en/model-studio/what-is-model-studio] |
| Model Studio **agent application** | "connect an LLM to external tools and knowledge bases without code … the model autonomously decide[s] which tools to use" | Restricted to pre-2025-04-21 Singapore accounts | [https://www.alibabacloud.com/help/en/model-studio/single-agent-application] |
| Model Studio **workflow application** | "visual node orchestration to chain multi-step, complex tasks into a stable, controllable, and repeatable execution path"; nodes include "large models, APIs, and Function Compute"; supports an **agent group** whose "different agents process in parallel" | Same restriction | [https://www.alibabacloud.com/help/en/model-studio/application-introduction][https://www.alibabacloud.com/help/en/model-studio/workflow-application] |
| Model Studio **Parameter Extractor node** | "leverages LLMs to extract structured parameters from unstructured content" | **China site only** | [https://help.aliyun.com/en/model-studio/workflow/parameter-extraction-node] |
| **AgentRun** | "all-in-one serverless infrastructure platform for enterprise-grade Agentic AI applications"; three modes: **no-code (AI Studio)**, **low-code (Flow canvas)**, **pro-code** | Singapore is the international region | [https://www.alibabacloud.com/help/en/agentrun/what-is-agentrun]; [https://help.aliyun.com/en/agentrun/open-service-area] (**China site only**) |
| AgentRun **Flow** | "visual flow canvas for building agent workflows through low-code orchestration … supports multiple node [types]" | — | [https://www.alibabacloud.com/help/doc-detail/3049290.html] |
| AgentRun **knowledge base** | "supports knowledge base integration with Alibaba Cloud Model Studio and RAGFlow" | — | [https://www.alibabacloud.com/help/en/agentrun/knowledge-base-integration-guide] |
| AgentRun **memory store** | "persistent memory management … long-term memory, conversation history, and conversation [summary]" | — | [https://www.alibabacloud.com/help/en/agentrun/memory-storage-overview.md] |
| AgentRun **LLM management** | "connect, proxy, and observe commercial, open source, or private models from a single [console]" | — | [https://www.alibabacloud.com/help/en/agentrun/large-language-model-1.md] |
| AgentRun **Tool Marketplace** | MCP tools, with integration guides for Model Studio, Cursor, Cline, ModelScope, Dify | — | [https://www.alibabacloud.com/help/en/agentrun/tool-market] |
| **AgentCore** | "unified platform for building, governing, and executing enterprise AI agents … entire agent lifecycle" | Singapore ap-southeast-1 | [https://www.alibabacloud.com/en/product/agentcore?_p_lc=1][https://www.alibabacloud.com/help/en/agentcore/agentcore-product-overview] |
| **AgentBay** | "Linux desktop automation, a browser, and a code execution engine … standardized, out-of-the-box runtime"; "Deployed in Singapore … second-level elastic scaling" | Singapore | [https://www.alibabacloud.com/help/en/agentbay/developer-reference/all-in-one-sandbox][https://www.alibabacloud.com/en/product/agentbay?_p_lc=1] |
| **Agent Sandbox (ACS)** | "Code Interpreter and Browser Use" sandbox scenarios | — | [https://www.alibabacloud.com/help/en/cs/user-guide/agent-sandbox/] |
| **FC Agent Sandbox** | E2B-compatible sandbox on Function Compute | Singapore, Virginia, Silicon Valley… | [https://www.alibabacloud.com/help/en/functioncompute/supported-regions-of-fc-agent-sandbox] |
| **Function Compute** | "event-driven, fully managed computing service" | All intl. regions | [https://www.alibabacloud.com/help/en/functioncompute/what-is-function-compute] |
| **Dify on ACK** | `ack-dify` Helm component; HA/scaling best practices published | ACK regions | [https://www.alibabacloud.com/help/en/ack/cloud-native-ai-suite/use-cases/building-customized-ai-question-and-answer-assistant-based-on-dify][https://www.alibabacloud.com/blog/high-availability-and-performance-best-practices-for-deploying-dify-based-on-ack_601874] |
| **PAI LangStudio** | "pre-built workflow nodes for flow control, LLMs, agents, data retrieval, document parsing, speech recognition, and Python" | — | [https://www.alibabacloud.com/help/en/pai/node-reference] |
| **AgentLoop** | observability + evaluation; "Agent-as-a-Judge" evaluation paradigm; explicitly measures "resolution rate and user satisfaction of your customer service agent" | Hangzhou / Shanghai / **Hong Kong** only internationally | [https://www.alibabacloud.com/help/en/cms/cloudmonitor-2-0/what-is-an-agentloop][https://www.alibabacloud.com/help/en/agentloop/product-overview/what-is-agentloop][https://www.alibabacloud.com/help/en/agentloop/product-overview/server-launch-regions-of-agentloop] |
| **AI Gateway (Higress-based)** | "Alibaba Cloud offers two API gateway products: Cloud-native API Gateway … and AI Gateway" | — | [https://www.alibabacloud.com/help/en/api-gateway/product-overview/] |

### 1.2 Channels (what the diagram plugs into)

| Channel product | Coverage | Notes | Source |
|---|---|---|---|
| **Chat App Message Service (CAMS)** | WhatsApp, Viber, Messenger, Instagram, **LINE**, Telegram; "One API connects WhatsApp, Viber, Messenger, Instagram, LINE, and Telegram" | Singapore region endpoint; Alibaba Cloud is "an official WhatsApp Business Solution Provider"; inbound-message webhook documented for WhatsApp (text, location, …) | [https://www.alibabacloud.com/help/en/chatapp/product-overview/what-is-chatapp-message-service][https://www.alibabacloud.com/help/en/chatapp/developer-reference/api-cams-2020-06-06-endpoint][https://www.alibabacloud.com/blog/601496][https://www.alibabacloud.com/help/en/chatapp/webhook-parameters] |
| CAMS pricing | "Free channels — Facebook Messenger, Instagram DMs, Telegram, and LINE messages are currently free of message fees and Chat App service fees"; elsewhere "Platform service fee: USD 0.005 per message" | WhatsApp/Viber fees are pass-through on top | [https://www.alibabacloud.com/help/en/chatapp/product-overview/chatapp-message-service-pricing][https://www.alibabacloud.com/help/en/chatapp/pricing-change-for-chat-app-channels] |
| **KakaoTalk** | **Not in CAMS.** Must go via Kakao's own Kakao Talk Channel REST API, or a CPaaS (Infobip, Sinch, Braze) | Business-channel verification required; Korean business registration commonly needed for foreign brands | [https://developers.kakao.com/docs/en/kakaotalk-channel/rest-api][https://www.infobip.com/docs/kakaotalk/getting-started][https://www.bestar-kr.com/post/setting-up-korean-kakaotalk-business-channel] (secondary) |
| **DirectMail** | Sending; clusters "China (Hangzhou), Singapore, US, and Germany"; sender addresses are region-isolated; initial daily quota 2,000 emails | Inbound mail needs the customer's own mail gateway → EventBridge/FC | [https://help.aliyun.com/en/direct-mail/getting-started/simplified-procedure-of-sending-by-api-and-smtp] (**China site only**)[https://www.alibabacloud.com/help/en/direct-mail/user-guide/overview][https://www.alibabacloud.com/help/en/direct-mail/product-overview/limits] |
| **EventBridge** | Event routing; DirectMail delivery notifications can route to DingTalk / RocketMQ / FC; "EventBridge can use an LLM's output to trigger a subsequent action" | This is the trigger spine for the diagrams | [https://www.alibabacloud.com/help/en/direct-mail/user-guide/set-up-eventbridge][https://www.alibabacloud.com/blog/apache-rocketmq-eventbridge-why-your-genai-needs-eda_602745] |
| **Voice Service (VMS)** | "Voice Service is deployed in the Singapore region and supports expansion to other regions"; provides DID numbers, single voice calls, group voice calls, international telephony; international SIP trunking | **China site** states "Voice Service currently does not support outbound international calls"; and "the updates to the voice notification and voice verification code services have been stopped in regions outside the Chinese mainland" → **treat international voice as SIP-trunk/DID oriented, not a full CCaaS. Mark as a discovery blocker.** | [https://www.alibabacloud.com/help/en/vms/product-overview/what-is-voice-service][https://www.alibabacloud.com/en/product/vms?_p_lc=1][https://help.aliyun.com/en/vms/product-overview/what-is-voice-service] (**China site only**)[https://next.api.alibabacloud.com/document/Dyvmsapi/2017-05-25/SingleCallByVoice] |
| **Cloud Contact Center (CCC)** | Product code `ccc` exists in the quota-center catalogue and on the international OpenAPI portal | No international product/marketing page surfaced; docs are China-oriented → **international availability unconfirmed; likely China site only** | [https://www.alibabacloud.com/help/quota-center/product-overview/alibaba-cloud-services-that-support-quota-center][https://next.api.alibabacloud.com/product/CCC] |
| **Intelligent Speech Interaction (ISI)** | Singapore endpoint documented; "available in Mandarin Chinese, Cantonese Chinese, English, Japanese, Korean, French and Indonesian" | China-site region page lists only Shanghai/Beijing/Shenzhen — the international page adds Singapore | [https://www.alibabacloud.com/help/en/isi/getting-started/regions-and-domain-names][https://www.alibabacloud.com/en/product/intelligent-speech-interaction?_p_lc=1][https://help.aliyun.com/en/isi/getting-started/regions-and-domain-names] (**China site only**) |

### 1.3 Retrieval, memory, data

| Block | Note | Source |
|---|---|---|
| **AnalyticDB for PostgreSQL** (vector) | RAG quickstart via OpenAPI; GraphRAG service; "On the Alibaba Cloud International Website you can create only pay-as-you-go instances … in Serverless mode" | [https://www.alibabacloud.com/help/en/analyticdb/analyticdb-for-postgresql/openapi-based-rag-applications-1][https://www.alibabacloud.com/help/en/analyticdb/analyticdb-for-postgresql/user-guide/use-the-graphrag-service][https://www.alibabacloud.com/help/en/analyticdb/analyticdb-for-postgresql/product-overview/serverless-mode-released-for-analyticdb-for-postgresql] |
| **Hologres** (vector) | Production RAG pipeline pattern with Model Studio | [https://www.alibabacloud.com/blog/building-a-rag-pipeline-on-alibaba-cloud-with-vector-search_603155] |
| **Tablestore Memory Storage** | Managed agent memory; "now available in the China (Shanghai), China (Shenzhen), China (Hong Kong), and **Singapore** regions"; AgentRun integrates it for "session history … long-term memory" | [https://www.alibabacloud.com/help/en/tablestore/memory-storage-service-sub-product-test/news-and-announcements][https://www.alibabacloud.com/help/en/tablestore/memory-storage-service-sub-product-test/agentrun-tablestore-memory] |
| **Tablestore Knowledge Storage** (serverless RAG) | "end-to-end pipeline—document import, parsing, chunking, vectorization, and hybrid search"; documented region list **begins with China regions** — Singapore availability **unconfirmed** | [https://www.alibabacloud.com/help/en/tablestore/table-store-service/knowledge-storage-introduction][https://www.alibabacloud.com/help/en/tablestore/memory-storage-service-sub-product-test/overview] |
| **OpenSearch LLM-Based Conversational Search Edition** | "helps enterprises quickly build a dedicated conversational search system based on the built-in LLM" | [https://www.alibabacloud.com/en/product/opensearch?_p_lc=1] |
| **OpenSearch Industry Algorithm Edition** | "pre-built semantic understanding and machine learning algorithms tuned for e-commerce, content communities…" | [https://www.alibabacloud.com/help/en/open-search/scenarios.md] |
| **AI Search Open Platform** | Shanghai + Frankfurt only → for Singapore customers, build RAG yourself | [https://www.alibabacloud.com/help/en/open-search/search-platform/getting-started/ai-getting-started] |
| **AIRec** | "personalized recommendation services"; "supports more than 1,000 QPS"; "Captures and analyzes user behavior in seconds and provides personalized recommendations within milliseconds" | [https://www.alibabacloud.com/help/en/airec/airec/product-overview/what-is-airec][https://www.alibabacloud.com/en/product/airec?_p_lc=1] |
| **Model Studio MCP** | "enables large language models to use external tools and data … how to connect to MCP" | [https://www.alibabacloud.com/help/en/model-studio/mcp] |

### 1.4 Guardrails & security

| Block | Note | Source |
|---|---|---|
| **AI Guardrails / Content Moderation** | Console "currently supports the China East 2 (Shanghai), China (Hong Kong), **Singapore**, Germany (Frankfurt), and US (Virginia) regions"; pricing page shows "Region: Asia Pacific SE 1 (Singapore)" | [https://www.alibabacloud.com/help/en/content-moderation/latest/what-is-ai-security-barrier][https://www.alibabacloud.com/en/product/content-moderation/pricing?_p_lc=1] |
| — engine | "Deeply integrates Qwen3-Guard with a moderation large model fine-tuned on the Qwen series"; Qwen3Guard gives "real-time, token-level moderation of prompts and [responses]"; streaming moderation "<2s latency" (vendor claim) | [https://www.alibabacloud.com/help/en/content-moderation/latest/product-advantages][https://www.alibabacloud.com/blog/qwen3guard-real-time-safety-for-your-token-stream_602582][https://www.facebook.com/alibabacloud/posts/1505252311646856/] |
| — language coverage | Qwen3Guard "covers up to 119 languages", Apache-2.0 | [https://docs.mozilla.ai/any-guardrail/api-reference/index/content-safety/qwen3-guard-stream][https://arxiv.org/html/2510.14276v1] |
| — Model Studio integration | "Guardrails service for Alibaba Cloud Model Studio users … enhances security moderation for the text input and output of LLMs" | [https://help.aliyun.com/en/document_detail/2923687.html] (**China site only**) |
| **Data Security Center (DSC)** | "supports both static and dynamic data masking"; discovers/classifies sensitive data | [https://www.alibabacloud.com/help/en/dsc/data-security-center/user-guide/data-de-identification][https://www.alibabacloud.com/help/en/dsc/data-security-center/] |
| **SLS sensitive-data masking** | "secures sensitive AI logs via multi-stage masking and encryption while preserving analytical value" | [https://www.alibabacloud.com/blog/plaintext-stays-put-logs-stay-useful-sensitive-data-protection-with-alibaba-cloud-observability_603543] |
| **HITL plug-in** | "intercepts medium- and high-risk cloud operations initiated by AI Agents" | [https://www.alibabacloud.com/help/en/skillsportal/aliyun-hitl-agent-security-guide] |

### 1.5 Model capability → Qwen model, with Singapore list prices

| Capability the step needs | Model(s) | Singapore / International list price | Source |
|---|---|---|---|
| Small fast LLM (classify, extract, route, short reply) | **qwen3.8-flash** | **$0.15 in / $0.47 out** per 1M tokens (Alibaba announcement for EU launch: "$0.15 per 1 million input tokens and $0.47 per 1 million output tokens"); Alibaba blog gives the China price as ¥1 (≈$0.16) in / ¥3 (≈$0.47) out | [https://www.facebook.com/alibabacloud/posts/qwen38-flash-is-now-available-in-the-european-union-on-alibaba-cloud-model-studi/1582315680607185/][https://www.alibabacloud.com/blog/alibaba-releases-qwen3-8-flash-with-innovative-model-architecture-delivering-optimal-price-performance_603503] |
| Mid-tier LLM (grounded drafting, tool use) | **qwen-plus** | Singapore tiered: **Token≤256K → $0.165 in / $0.99 out**; 256K<Token≤1M → $0.66 / $3.96 | [https://www.alibabacloud.com/help/en/model-studio/model-pricing] |
| Large reasoning LLM (hard escalations, planning, policy conflicts) | **qwen3.8-max** | **$2 in / $6 out** per 1M tokens (Singapore) — see §0 caveat about the $1.65/$4.951 column | [https://www.alibabacloud.com/help/en/model-studio/model-pricing][https://www.alibabacloud.com/help/en/model-studio/qwen3-8-max] |
| Vision / OCR (screenshots, receipts, damaged-goods photos, scanned forms) | **Qwen-OCR (qwen-vl-ocr)**; Qwen-VL family | Qwen-VL Singapore from **$0.215 in / $2.15 out** (tiered); "Qwen-OCR is a visual understanding model that extracts text and structured data from images — scanned documents, tables, receipts" | [https://www.alibabacloud.com/help/en/model-studio/model-pricing][https://www.alibabacloud.com/help/en/model-studio/qwen-vl-ocr] |
| Long-document parsing | **qwen-long** | "supports parsing and dialogue for text files (TXT, DOCX, PDF, XLSX, EPUB, MOBI, MD, CSV) and image files" | [https://www.alibabacloud.com/help/en/model-studio/qwen-long] |
| Embeddings | **text-embedding-v4** | **$0.07 per 1M tokens (International)**; batch-file embedding $0.036 per 1M | [https://www.alibabacloud.com/help/en/model-studio/model-pricing][https://www.alibabacloud.com/help/en/model-studio/text-embedding-v4] |
| Rerank | **gte-rerank-v2** | **$0.115 per 1M text-input tokens** | [https://www.alibabacloud.com/help/en/model-studio/model-pricing] |
| Speech recognition (streaming) | **qwen3-asr-flash-realtime** | **$0.000047 / second** | [https://www.alibabacloud.com/help/en/model-studio/model-pricing] |
| Speech recognition (file) | qwen-audio-3.x-asr-flash-filetrans, Fun-ASR, Paraformer series | billed by input audio duration in seconds | [https://www.alibabacloud.com/help/en/model-studio/non-realtime-speech-recognition-user-guide][https://www.alibabacloud.com/help/en/model-studio/model-pricing] |
| Speech synthesis | **cosyvoice-v3-plus** $0.26 / 10k chars (Singapore, International scope); **qwen-audio-3.0-tts-plus** $0.20 / 10k chars; **qwen-audio-3.1-tts-plus** $0.30 / 10k chars | per 10,000 characters | [https://www.alibabacloud.com/help/en/model-studio/cosyvoice-v3-plus][https://www.alibabacloud.com/help/en/model-studio/qwen-audio-3-0-tts-plus][https://www.alibabacloud.com/help/en/model-studio/qwen-audio-3-1-tts-plus] |
| Speech-to-speech / full-duplex voice agent | **Qwen-Omni-Realtime**, **qwen3.8-omni-flash-realtime** | Regions: **Singapore** + Beijing; WebSocket/WebRTC; "Omni-Realtime models bill only the audio; the corresponding text is not charged" | [https://www.alibabacloud.com/help/en/model-studio/realtime][https://www.alibabacloud.com/help/en/model-studio/qwen3-8-omni-flash-realtime][https://www.alibabacloud.com/help/en/model-studio/model-pricing] |
| Multilingual voice coverage | CosyVoice: 9 languages incl. Chinese, English, **Japanese, Korean**, German, Spanish, French, Italian, Russian + 18 Chinese dialects. Qwen3-TTS: 10 languages incl. Japanese, Korean, Portuguese | — | [https://github.com/QwenAudio/CosyVoice][https://www.alibabacloud.com/blog/qwen3-tts-family-is-now-open-sourced-voice-design-clone-and-generation_602826] |
| Code execution / tool sandbox | AgentBay AIO Sandbox, FC Agent Sandbox Code Interpreter | — | [https://www.alibabacloud.com/help/en/agentbay/developer-reference/all-in-one-sandbox][https://www.alibabacloud.com/help/en/functioncompute/code-interpreter-of-fc-agent-sandbox/] |
| Guardrail model | Qwen3Guard (Gen + Stream variants), 119 languages | — | [https://arxiv.org/html/2510.14276v1][https://docs.mozilla.ai/any-guardrail/api-reference/index/content-safety/qwen3-guard-stream] |
| SEA-language specialist | **Qwen-SEA-LION-v4** (AI Singapore model whose "technical backbone is the open-source Qwen"); Alibaba Cloud "supports the release" | Free download via AISG/Hugging Face — not a Model Studio hosted SKU (unconfirmed) | [https://www.alibabacloud.com/blog/alibaba%E2%80%99s-qwen-powers-ai-singapore%E2%80%99s-latest-llm-to-strengthen-multilingual-performance-in-southeast-asia_602692][https://www.facebook.com/alibabacloud/posts/1282315870607169/] |

**Cost levers the app should always draw as a switch on the model node:**
- Batch inference = **50% of real-time price** for both input and output [https://www.alibabacloud.com/help/en/model-studio/batch-inference]
- Context cache: creation **125%** of standard input price, cache hits **10%** [https://www.alibabacloud.com/help/en/model-studio/context-cache][https://www.alibabacloud.com/help/en/model-studio/explicit-cache-guide]
- Batch and cache discounts **cannot apply simultaneously** [https://www.alibabacloud.com/help/en/model-studio/model-pricing]
- Savings plans / resource plans: "discounts of up to 47%" [https://www.alibabacloud.com/help/en/model-studio/savings-plan-and-resource-package]
- New-user free quota: typically **1,000,000 tokens per model, valid 90 days, Singapore region only** [https://www.alibabacloud.com/help/en/model-studio/new-free-quota][https://www.alibabacloud.com/help/en/model-studio/new-free-quota-validity-adjustment]
- Structured output (JSON Object / JSON Schema) to keep downstream steps deterministic [https://www.alibabacloud.com/help/en/model-studio/qwen-structured-output]

---

## 2. Drawing grammar the app should adopt

### 2.1 Step-type vocabulary → visual + default model

| Step type | Draw as | Default model capability | Why |
|---|---|---|---|
| **classify** | diamond, single in-edge | small fast LLM (qwen3.8-flash) w/ JSON Schema output | Routing is a short, high-volume call; cost dominates. Structured output "ensures the model returns a valid JSON string … JSON Schema mode also gives you precise control" [https://www.alibabacloud.com/help/en/model-studio/qwen-structured-output] |
| **extract** | rectangle w/ schema badge | small fast LLM + JSON Schema | Parameter extraction is exactly what Model Studio's Parameter Extractor node does with an LLM [https://help.aliyun.com/en/model-studio/workflow/parameter-extraction-node] (**China site only**) |
| **retrieve** | cylinder + magnifier | embeddings + rerank, **not** a chat LLM | Model Studio's own retrieval "retrieves chunks … reranks them using a reranking model, and selects the top [N]" [https://www.alibabacloud.com/help/en/model-studio/rag-knowledge-base] |
| **generate** | rectangle w/ document icon | mid or large LLM, grounded on retrieved chunks | RAG "provide[s] the model with reference materials … and strictly limit[s] its answers to the scope of the retrieved [content]" [https://www.alibabacloud.com/help/en/model-studio/faq-about-alibaba-cloud-model-studio] |
| **decide / route** | diamond | small LLM or deterministic rules | Anthropic's **routing** pattern: "classifies an input and directs it to a specialized followup task" [https://www.anthropic.com/research/building-effective-agents] |
| **act** | rectangle w/ plug + system name | tool call via function calling / MCP | "Function Calling enables models to call external tools, such as APIs, databases, and user-defined functions" [https://www.alibabacloud.com/help/en/model-studio/qwen-function-calling]; MCP for external tools [https://www.alibabacloud.com/help/en/model-studio/mcp] |
| **approve** | hexagon w/ person icon, **always a hard stop** | — | LangChain HITL: "pause execution, present the pending action to the user, and resume only after explicit approval" [https://docs.langchain.com/oss/python/langchain/frontend/human-in-the-loop]; Alibaba Cloud HITL plug-in intercepts "medium- and high-risk … operations initiated by AI Agents" [https://www.alibabacloud.com/help/en/skillsportal/aliyun-hitl-agent-security-guide] |
| **notify** | bell / envelope | — | DirectMail, CAMS, DingTalk/webhook via EventBridge [https://www.alibabacloud.com/help/en/direct-mail/user-guide/set-up-eventbridge] |
| **loop** | back-edge with a labelled counter and a **max-iterations guard** | — | Anthropic's **evaluator-optimizer**: "one LLM call generates a response while another provides evaluation and feedback in a loop" [https://www.anthropic.com/research/building-effective-agents] |
| **parallel** | fork/join bar | — | Model Studio workflow "agent group … different agents process in parallel" [https://www.alibabacloud.com/help/en/model-studio/workflow-application]; Anthropic **parallelization** [https://www.anthropic.com/research/building-effective-agents] |

### 2.2 Pattern library the app should offer as presets
Anthropic's five workflow patterns — **prompt chaining, routing, parallelization, orchestrator-workers, evaluator-optimizer** — plus the autonomous agent loop [https://www.anthropic.com/research/building-effective-agents][https://resources.anthropic.com/hubfs/Building%20Effective%20AI%20Agents-%20Architecture%20Patterns%20and%20Implementation%20Frameworks.pdf]. Anthropic's guidance is to prefer "simple, composable patterns" over frameworks [https://www.anthropic.com/research/building-effective-agents].
OpenAI's guide adds the guardrail layer taxonomy: "relevance classifiers, safety filters, PII protection, moderation, and rules-based protections", plus explicit human-intervention triggers [https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf].
Google's pattern-selection doc is a good source for the app's "which pattern?" wizard [https://docs.cloud.google.com/architecture/choose-design-pattern-agentic-ai-system].
AWS's **Well-Architected Agentic AI Lens** — "150 best practices across 41 questions and six pillars, each with a risk level and a desired outcome" — is the best checklist source for the proposal export [https://aws.amazon.com/blogs/architecture/automating-agentic-ai-well-architected-reviews-with-the-aws-agentic-ai-lens/][https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentic-ai-lens.html].

### 2.3 Alibaba Cloud's own reference: DualLane
Alibaba Cloud's internal support-ticket agent is published as **DualLane: Fast and Reliable LLM Agents for Interactive AIOps via Dual-Path Planning** — "a novel parallel dual-path planning architecture" that raises "operational efficiency and resolution accuracy" [https://dl.acm.org/doi/10.1145/3770855.3818380]. Alibaba Cloud's engineering blog describes the design and results [https://www.alibabacloud.com/blog/alibaba-cloud-customer-service-agent-thoughts-design-and-practices-from-concept-to-implementation_601555]. Trade coverage: it "routes customer support tickets away from large language models whenever possible" using a fast path, and "outperforms other tools that schedule work for processing by LLMs, including LLMCompiler and React" [https://www.techzine.eu/news/infrastructure/143542/alibaba-cloud-reduces-llm-use-in-support-ticket-handling/][https://www.theregister.com/ai-and-ml/2026-08-11/alibaba-cloud-is-using-ai-to-help-it-use-less-ai/5285815]. **Drawing rule this justifies:** always offer a *dual-path* variant — cheap deterministic/fast-model lane in parallel with the LLM lane, joined by a comparator — and show the cost delta.

---

## 3. Use case 1 — Support email / ticket triage and auto-resolution

### 3.1 Trigger & systems touched
- **Trigger:** inbound email (customer's mail gateway → webhook/EventBridge) or ticket created in Zendesk/Salesforce/Jira/Freshdesk. EventBridge is the natural spine: it can "filter, transform, and forward these events to downstream" targets from an HTTP webhook [https://help.aliyun.com/en/eventbridge/user-guide/event-source-overview] (**China site only**) and can "use an LLM's output to trigger a subsequent action" [https://www.alibabacloud.com/blog/apache-rocketmq-eventbridge-why-your-genai-needs-eda_602745].
- **Systems:** mailbox/helpdesk, CRM/order system, knowledge base (help-centre), shipping/logistics API, billing/refund API, agent desktop, audit log.

### 3.2 Steps

| # | Step | Type | Model capability & why | Alibaba Cloud block | Human gate |
|---|---|---|---|---|---|
| 1 | Ingest email, strip signatures/quotes, detect language, detect attachments | act | none (deterministic) | FC function + EventBridge | — |
| 2 | **Prompt-injection screen on the raw body** | classify | small fast LLM or Qwen3Guard-Stream; inbound email is untrusted input — "an injection … can now make an agent send an email, exfiltrate data, or execute code" [https://www.sysdig.com/learn-cloud-native/prompt-injection] | AI Guardrails (Singapore region) [https://www.alibabacloud.com/help/en/content-moderation/latest/what-is-ai-security-barrier] | — |
| 3 | PII detect + tokenize | classify/act | DSC-style sensitive-data discovery & masking, or AI Guardrails "Sensitive content detection: Detects potential leaks of personal information" [https://www.alibabacloud.com/help/en/content-moderation/latest/billing-overview] | Data Security Center [https://www.alibabacloud.com/help/en/dsc/data-security-center/user-guide/data-de-identification] | — |
| 4 | OCR any attached image (screenshot, receipt, damage photo) | extract | **vision/OCR** — "extracts text and structured data from images — scanned documents, tables, receipts" [https://www.alibabacloud.com/help/en/model-studio/qwen-vl-ocr] | qwen-vl-ocr / Qwen-VL | — |
| 5 | Classify intent + urgency + sentiment; emit confidence | classify | small fast LLM w/ JSON Schema; this is the cheapest high-volume call | qwen3.8-flash | — |
| 6 | **⫘ Fork (parallel)** 6a retrieve help-centre chunks; 6b fetch account/order/entitlement facts | retrieve ‖ act | 6a embeddings + rerank; 6b deterministic API | text-embedding-v4 + gte-rerank-v2 → AnalyticDB-PG/Hologres vector store; MCP tool via AgentRun Tool Marketplace | — |
| 7 | Join; decide: **auto-answer / draft-for-human / escalate-now / reject-as-out-of-scope** | decide/route | small LLM for the policy match; escalate to large reasoning LLM when policies conflict or money is involved | qwen3.8-flash → qwen3.8-max on the hard branch | — |
| 8 | Generate grounded answer **with citations** | generate | mid LLM; grounding limits hallucination | qwen-plus (≤256K tier) | — |
| 9 | **Evaluate** answer against retrieved evidence + policy (loop back to 8, max 2×) | generate/decide (loop) | evaluator-optimizer loop [https://www.anthropic.com/research/building-effective-agents] | second qwen-plus call, or AgentLoop **Agent-as-a-Judge** [https://www.alibabacloud.com/help/en/cms/cloudmonitor-2-0/what-is-an-agentloop] | — |
| 10 | Output guardrail scan (claims, price/refund commitments, tone, PII leakage) | classify | Qwen3Guard token-level moderation [https://www.alibabacloud.com/blog/qwen3guard-real-time-safety-for-your-token-stream_602582] | AI Guardrails | — |
| 11a | **Auto-send** (only if confidence ≥ threshold AND action is read-only AND no money movement) | act + notify | — | DirectMail (Singapore cluster) [https://help.aliyun.com/en/direct-mail/getting-started/simplified-procedure-of-sending-by-api-and-smtp] (**China site only**) | none — this is the risky branch |
| 11b | **Human approve** draft: agent edits/sends | **approve** | — | Agent desktop; LangChain-style interrupt/resume [https://docs.langchain.com/oss/python/langchain/human-in-the-loop] | ✅ hard stop |
| 11c | Escalate with full context pack + suggested next action | notify | — | EventBridge → helpdesk webhook | ✅ |
| 12 | Write trace, label, feed eval set | act | — | AgentLoop ("Trace2Dataset" auto dataset pipeline) [https://www.facebook.com/alibabacloud/posts/1469778651860889/] — but **Hong Kong region only** internationally [https://www.alibabacloud.com/help/en/agentloop/product-overview/server-launch-regions-of-agentloop] | — |

**Loop:** step 9 → 8 (bounded). **Parallel:** 6a ‖ 6b. Optional outer loop: if the customer replies "that didn't work", re-enter at 5 with conversation memory from Tablestore Memory Storage [https://www.alibabacloud.com/help/en/tablestore/memory-storage-service-sub-product-test/news-and-announcements].

### 3.3 Guardrails that matter here
- **Authority limits.** The Chevrolet dealer bot "agreed to sell a 2024 Chevy Tahoe for just $1" after a user's crafted prompt [https://incidentdatabase.ai/cite/622/][https://www.businessinsider.com/car-dealership-chevrolet-chatbot-chatgpt-pranks-chevy-2023-12]. Rule: no monetary or contractual commitment without a deterministic policy check + human approve.
- **Legal liability for what the bot says.** In *Moffatt v. Air Canada* the BC Civil Resolution Tribunal held Air Canada liable for its chatbot's misinformation and ordered **$812.02** in damages and fees [https://www.bbc.com/travel/article/20240222-air-canada-chatbot-misinformation-what-travellers-should-know][https://www.americanbar.org/groups/business_law/resources/business-law-today/2024-february/bc-tribunal-confirms-companies-remain-liable-information-provided-ai-chatbot/]. The tribunal rejected the argument that the chatbot was a separate entity [https://www.mccarthy.ca/en/insights/blogs/techlex/moffatt-v-air-canada-misrepresentation-ai-chatbot].
- **Indirect prompt injection is the top email-specific risk.** "When AI Agents Read Your Email, Every Message Is a [potential attack]"; Google researchers observed "a 32% increase in malicious prompt injections between November 2025 and [early 2026]" in scanned public-web archives [https://www.kuppingercole.com/blog/gardiner/when-ai-agents-read-your-email]. Defence-in-depth per OWASP [https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html].
- **Audit.** Every run must persist: input hash, retrieved chunk IDs + versions, model + version, tool calls with arguments, guardrail verdicts, approver identity, final text. Alibaba Cloud markets exactly this ("Alibaba Cloud Agent Observability and Audit Data [Collection]" via LoongSuite) [https://www.alibabacloud.com/blog/603239].
- **PII / residency.** Singapore PDPC Advisory Guidelines on the Use of Personal Data in AI Recommendation and Decision Systems (1 Mar 2024) clarify how the PDPA applies when organisations use personal data to develop and deploy AI [https://www.pdpc.gov.sg/organisations/regulations-decisions/regulatory-guidance/advisory-guidelines-on-use-of-personal-data-in-ai-recommendation-and-decision-systems]. A **Proposed Advisory Guidelines on Use of Personal Data in Generative AI** went to consultation 2 Jun – 1 Jul 2026 [https://digitalpolicyalert.org/event/40304-personal-data-protection-commission-opened-consultation-on-proposed-advisory-guidelines-on-use-of-personal-data-in-generative-ai][https://iapp.org/news/a/notes-from-the-asia-pacific-region-singapore-issues-draft-guidelines-on-personal-data-use-in-generative-ai]; one tracker dates the final guidelines 20 July 2026 [https://docs.modulos.ai/frameworks/singapore-mgf-agentic] — **final status unconfirmed on pdpc.gov.sg**.
- **EU customers:** Article 50 requires the deployer to ensure the AI discloses it is AI, applicable since 2 Aug 2026 [https://artificialintelligenceact.eu/article/50/][https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act].

### 3.4 Business value & KPIs (published figures)

| Figure | Value | Source |
|---|---|---|
| Gartner forecast | By 2029 agentic AI will autonomously resolve **80%** of common customer-service issues without human intervention → **30%** reduction in operational costs | [https://www.gartner.com/en/newsroom/press-releases/2025-03-05-gartner-predicts-agentic-ai-will-autonomously-resolve-80-percent-of-common-customer-service-issues-without-human-intervention-by-20290] |
| Gartner counter-forecast | **>40%** of agentic AI projects canceled by end-2027 | [https://www.gartner.com/en/newsroom/press-releases/2025-06-25-gartner-predicts-over-40-percent-of-agentic-ai-projects-will-be-canceled-by-end-of-2027] |
| McKinsey | GenAI applied to customer care could raise productivity by **30–45%** of current function cost | [https://www.mckinsey.com/capabilities/tech-and-ai/our-insights/the-economic-potential-of-generative-ai-the-next-productivity-frontier] |
| Klarna (OpenAI-powered assistant, month 1) | **2.3M conversations** = two-thirds of chats; work of **700 FTEs**; CSAT on par with humans; est. **$40M** 2024 profit improvement | [https://www.klarna.com/international/press/klarna-ai-assistant-handles-two-thirds-of-customer-service-chats-in-its-first-month/][https://openai.com/index/klarna/] |
| Klarna (later) | AI agent doing the work of **853** employees | [https://www.customerexperiencedive.com/news/klarna-says-ai-agent-work-853-employees/805987/] |
| Klarna walk-back | Klarna subsequently re-introduced humans; ~80% automated (secondary analysis) | [https://conversationaltechsummit.com/klarnas-ai-u-turn-80-of-customer-service-is-automated-so-why-did-humans-come-back/] — *secondary* |
| Intercom Fin | **76%** average resolution rate across **12,000+** customers, improving ~1%/month | [https://fin.ai/glossary/resolution-rate][https://www.intercom.com/learning-center/fin-ai-agent-copilot-reduce-handle-time-boost-productivity] |
| Fin realistic ramp | Industry average **40–60%** on initial deployment, growing to **60%+** within 6–12 months | [https://fin.ai/learn/roi-ai-customer-service-agents-benchmarks] |
| Fin industry benchmarks | Top-10 customers by industry, automation/resolution/involvement rates | [https://fin.ai/benchmarks] |
| Salesforce Agentforce | **62%** case resolution; "resolved **50%** of inquiries autonomously" in customer service | [https://www.salesforce.com/agentforce/metrics/] |
| Agentforce customers | The Forum: **75%** first-time case resolution; another: Agentforce to handle **40%** of call volume | [https://www.salesforce.com/news/stories/agentforce-customer-success-stories/] |
| Lyft (Claude via Bedrock) | **87%** reduction in average resolution time; **>30%** improvement in decision-making accuracy | [https://claude.com/customers/lyft][https://www.anthropic.com/news/lyft-announcement] |
| Unit-economics anchor | Per-resolution pricing in market: Fin at **$0.99 per outcome** | [https://aissist.io/insights/intercom-fin-review] — *secondary*; Salesforce Help Agent at **$2 per resolution** [https://www.linkedin.com/pulse/agentforce-pay-per-resolution-new-model-ai-customer-service-patnaik-47yme] — *secondary* |

**KPI set the proposal should offer:** resolution rate (end-to-end, no human touch), involvement rate, first-response time, cost per resolution, escalation rate, edit-distance on drafts (agent acceptance rate), CSAT delta, repeat-contact rate, hallucination/incorrect-commitment rate, injection-block rate, audit completeness. Definition source for "AI resolution rate": "the percentage of customer or employee issues an AI system fully resolves end-to-end without human intervention" [https://www.zendesk.com/blog/ai/productivity/ai-resolution-rate/].

### 3.5 Pitfalls
1. **Shipping a single-lane LLM for everything** → cost and latency blow up; Alibaba's own DualLane exists precisely to avoid it [https://www.theregister.com/ai-and-ml/2026-08-11/alibaba-cloud-is-using-ai-to-help-it-use-less-ai/5285815].
2. **Counting deflection as resolution.** "The contact center reports a 60% deflection rate and the brand loses customers it never knew it had" [https://www.teneo.ai/blog/call-deflection-vs-resolution]. PolyAI: "the strongest correlation we see … is between relative resolution and CSAT: at 80%+, you hit 4.5+ CSAT" [https://www.linkedin.com/posts/nikola-mrksic_we-deflected-70-of-all-contact-that-activity-7459683757642588160-b7wq].
3. **Unbounded loops** — evaluator-optimizer must have a max-iteration cap [https://www.anthropic.com/research/building-effective-agents].
4. **Naive RAG.** Anthropic's contextual retrieval "reduce[s] the number of failed retrievals by 49% and, when combined with reranking, by 67%" [https://www.anthropic.com/research/contextual-retrieval] — i.e., chunking + rerank is not optional.
5. **Assuming Model Studio's no-code app is available.** It is not, for new international accounts [https://www.alibabacloud.com/help/en/model-studio/single-agent-application].
6. **Project cancellation risk** — Gartner's >40% figure should appear in every proposal's risk section [https://www.gartner.com/en/newsroom/press-releases/2025-06-25-gartner-predicts-over-40-percent-of-agentic-ai-projects-will-be-canceled-by-end-of-2027].

### 3.6 Discovery questions
1. How many tickets/month, by channel and language? What is today's first-response and resolution SLA?
2. What share is genuinely routine and *read-only*? What share moves money or changes an entitlement?
3. Where does the help-centre content live, who owns it, and how stale is it? Is there a versioned source of truth for policy (refund windows, warranty)?
4. What systems must the agent *write* to (CRM, OMS, billing)? Do those APIs support idempotency and dry-run?
5. What is the customer's tolerance for a wrong answer — is there a legal/PR precedent (see Air Canada)?
6. Which actions are non-negotiably human-approved? Who is the approver, and what is their queue SLA?
7. What PII appears in tickets, and where must it not leave (residency)? Which regulator applies (PDPA / PIPA / APPI / GDPR / AI Act)?
8. Is there an existing eval set or golden tickets? If not, who labels?
9. Where will traces be stored, and for how long? Note AgentLoop is Hong Kong-only internationally [https://www.alibabacloud.com/help/en/agentloop/product-overview/server-launch-regions-of-agentloop] — is that acceptable?
10. What is the target cost per resolution, and does the buyer want per-resolution commercial terms like the market's $0.99–$2 anchors?

---

## 4. Use case 2 — Live chat & messaging agents (WhatsApp, LINE, KakaoTalk, web chat) with human handoff

### 4.1 Trigger & systems
- **Trigger:** inbound message webhook. CAMS provides an "inbound message webhook … to receive messages that are sent by using WhatsApp", supporting "text, location, …" [https://www.alibabacloud.com/help/en/chatapp/webhook-parameters].
- **Systems:** WhatsApp Business Platform (via Alibaba Cloud as BSP [https://www.alibabacloud.com/blog/601496]), LINE Official Account, KakaoTalk Channel, web chat widget, CRM, order system, agent inbox.

### 4.2 Steps

| # | Step | Type | Model capability & why | Alibaba Cloud block | Human gate |
|---|---|---|---|---|---|
| 1 | Receive webhook, normalise channel schema, load session | act | none | FC + EventBridge; CAMS | — |
| 2 | Load conversation memory + user profile | retrieve | none / vector recall | Tablestore Memory Storage (Singapore) [https://www.alibabacloud.com/help/en/tablestore/memory-storage-service-sub-product-test/news-and-announcements]; AgentRun memory store [https://www.alibabacloud.com/help/en/agentrun/memory-storage-overview.md] | — |
| 3 | Language ID + translation if needed | classify | small LLM; note SEA code-mixing → Qwen-SEA-LION-v4 exists for this [https://www.alibabacloud.com/blog/alibaba%E2%80%99s-qwen-powers-ai-singapore%E2%80%99s-latest-llm-to-strengthen-multilingual-performance-in-southeast-asia_602692] | qwen3.8-flash | — |
| 4 | Intent + sentiment + "wants a human?" detection | classify | small fast LLM; low latency matters more than depth in chat | qwen3.8-flash | — |
| 5 | **⫘ Fork:** 5a KB retrieval ‖ 5b transactional lookup (order status, balance, delivery) ‖ 5c image understanding if the user sent a photo | retrieve ‖ act ‖ extract | embeddings+rerank; API; **vision** for photos of parcels/products | text-embedding-v4 + gte-rerank-v2; MCP tools; qwen-vl-ocr | — |
| 6 | Decide: answer / perform action / handoff / offer callback | decide | small LLM + deterministic policy table | qwen3.8-flash | — |
| 7 | Generate short reply respecting channel constraints (WhatsApp templates vs free-form, LINE message limits) | generate | mid LLM; tone control | qwen-plus | — |
| 8 | Guardrail scan (streaming, token-level) | classify | Qwen3Guard-Stream is built for "real-time, token-level moderation" [https://www.alibabacloud.com/blog/qwen3guard-real-time-safety-for-your-token-stream_602582] | AI Guardrails, Singapore region | — |
| 9 | Send via channel | act + notify | — | CAMS (WhatsApp/Viber/Messenger/Instagram/LINE/Telegram) [https://www.alibabacloud.com/help/en/chatapp/product-overview/what-is-chatapp-message-service] | — |
| 10 | **Handoff:** freeze bot, push transcript + summary + suggested reply to human; bot stays as copilot | **approve / notify** | — | Agent inbox; Alibaba Cloud HITL patterns [https://www.alibabacloud.com/blog/human-in-the-loop-ai-systems-balancing-automation-and-oversight-in-enterprise-workflows_603587] | ✅ |
| 11 | After human resolves, bot resumes with a "return-to-bot" message | act | — | — | — |
| 12 | Post-conversation: CSAT prompt, trace write, dataset append | act | — | AgentLoop (HK only intl.) | — |

**Loop:** the conversational turn loop 3→9 repeats until resolution/handoff. **Parallel:** 5a ‖ 5b ‖ 5c.

### 4.3 Channel-specific constraints the app must encode

| Channel | Constraint | Source |
|---|---|---|
| **WhatsApp** | "You may use automation when responding during the 24-hour window, but must also have available **prompt, clear, and direct escalation paths**" | [https://whatsappbusiness.com/policy/] |
| WhatsApp | Per-message pricing since 1 Jul 2025; **from 1 Oct 2026** utility/service messages inside the 24h window are also chargeable per message | [https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing][https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/non-template-messages] |
| WhatsApp via Alibaba Cloud | Free channels (Messenger, Instagram DM, Telegram, **LINE**) currently incur no message fee and no Chat App service fee; elsewhere platform service fee **USD 0.005/message** | [https://www.alibabacloud.com/help/en/chatapp/product-overview/chatapp-message-service-pricing][https://www.alibabacloud.com/help/en/chatapp/pricing-change-for-chat-app-channels] |
| **LINE** | Messaging API is the integration surface; LINE Official Account plans have free monthly message quotas that differ by market | [https://developers.line.biz/en/reference/messaging-api/][https://developers.line.biz/en/docs/messaging-api/pricing/] |
| LINE | LINE revised Official Account pricing in **Taiwan effective 1 Nov 2026** | [https://developers.line.biz/] |
| LINE reach | 200M+ MAU across Japan, Taiwan, Thailand, Indonesia (secondary) | [https://apis.io/providers/line/][https://www.chatwoot.com/features/line-integration] — *secondary* |
| **KakaoTalk** | Not covered by Alibaba Cloud CAMS; use Kakao Talk Channel REST API or a CPaaS | [https://developers.kakao.com/docs/en/kakaotalk-channel/rest-api][https://www.infobip.com/kakao-business] |
| KakaoTalk | Business-channel verification takes ~3–5 days; foreign brands typically need a Korean entity/partner (secondary) | [https://www.infobip.com/docs/kakaotalk/getting-started][https://krwork.co/kakaotalk-for-business-guide/] — *secondary* |
| Kakao ecosystem | Kakao has embedded ChatGPT directly in KakaoTalk chat rooms (announced 16 June) — raises user expectations | [https://www.thelec.net/news/articleView.html?idxno=11367] |

### 4.4 Guardrails
- **Disclose the bot.** EU AI Act Art. 50 (from 2 Aug 2026) [https://artificialintelligenceact.eu/article/50/]; Korea AI Basic Act Art. 31 requires operators to "notify users in advance that certain operations use generative or high-impact [AI]" (effective 22 Jan 2026) [https://www.kimchang.com/en/insights/detail.kc?sch_section=4&idx=33805][https://intelligence.dlapiper.com/artificial-intelligence/countries/south-korea/07-controls-on-generative-ai.html][https://www.trade.gov/market-intelligence/south-korea-ai-basic-act].
- **Brand-safety.** DPD disabled part of its chatbot after a customer made it swear and write a poem calling DPD "useless" [https://www.bbc.com/news/technology-68025677][https://www.theguardian.com/technology/2024/jan/20/dpd-ai-chatbot-swears-calls-itself-useless-and-criticises-firm].
- **Korea-specific automated-decision rights.** PIPA Art. 37-2 gives a data subject "the right to refuse to accept a decision made through a fully automated processing of personal information or to request an explanation thereof" [https://elaw.klri.re.kr/eng_service/lawView.do?hseq=62389&lang=ENG]; Art. 37-2(1) covers AI-based systems and 37-2(4) requires criteria/procedures to be published [https://www.nature.com/articles/s41599-024-03470-y][https://datalaw.kr/en/automated-decisions/]. **Design consequence:** a Korea-facing chat agent that decides something with legal/significant effect must expose an explanation + refusal path, and human review must be reachable.
- **Korea precedent on chatbot data handling:** PIPC sanctioned the "Iruda" chatbot — "the first time PIPC sanctioned an AI technology company for indiscriminate personal information processing" [https://fpf.org/blog/south-korea-the-first-case-where-the-personal-information-protection-act-was-applied-to-an-ai-system/]. PIPC's generative-AI guideline "places special emphasis on establishing AI privacy governance" and recommends enterprise APIs for sensitive data [https://www.kimchang.com/en/insights/detail.kc?sch_section=4&idx=32699][https://www.lexology.com/library/detail.aspx?g=c280d3c1-d919-49fb-8bc3-3fcb3b54aa62].
- **Cross-border from Korea:** PIPA requires data subjects to be informed of and consent to overseas transfer matters [https://www.dlapiperdataprotection.com/?t=transfer&c=KR] — relevant because **Model Studio has no Seoul region** [https://www.alibabacloud.com/help/en/model-studio/what-is-model-studio].

### 4.5 KPIs & published figures
- 74% of consumers expect 24/7 service; 88% expect faster responses than a year ago; **85% of CX leaders say customers will drop brands over unresolved issues—even on first contact** [https://cxtrends.zendesk.com/].
- **51% of consumers prefer bots over humans when they want immediate service** [https://www.zendesk.com/blog/ai/productivity/ai-customer-service-statistics/].
- Gartner: by 2028, **≥70%** of customers will start their service journey in a conversational AI interface [https://www.gartner.com/en/articles/customer-service-ai].
- Resolution-rate benchmarks: field median ~**70%**, half of deployments between 56% and 80% [https://www.thecontextcompany.com/knowledge-base/what-is-a-good-ai-agent-resolution-rate] — *aggregator, secondary*.
- Decagon published case-study range: 32% increase (Rippling) to 90% resolution (Substack), headline 80% deflection [https://myaskai.com/blog/decagon-ai-complete-guide-2026] — *secondary*; primary case-study index at [https://decagon.ai/case-studies].
- Sierra: 4.5/5 CSAT and "up to 90% resolution rates on transactional, repeatable workflows" [https://www.assembled.com/page/sierra-ai] — *secondary*.

### 4.6 Pitfalls & discovery questions
**Pitfalls:** (a) building for one channel and bolting others on — CAMS gives one API across six channels, use it [https://www.alibabacloud.com/help/en/chatapp/product-overview/what-is-chatapp-message-service]; (b) forgetting KakaoTalk is not in CAMS; (c) ignoring WhatsApp's 24-hour window and its escalation-path requirement [https://whatsappbusiness.com/policy/]; (d) omitting Meta's per-message fees from the cost model [https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing]; (e) no human-handoff path (violates WhatsApp policy and Korea's Art. 37-2 expectations); (f) translating literally instead of localising for code-mixed SEA speech.

**Discovery questions:** Which channels, in which markets, at what monthly message volume? Do you already have a WhatsApp BSP and can the number be migrated (CAMS supports "number migration") [https://www.alibabacloud.com/help/en/chatapp/send-chat-app-messages-through-the-console]? What is the human-agent staffing model and shift pattern per market? Which languages and dialects, and is code-mixing common? What is the escalation policy and the SLA for a human to pick up? Do you need KakaoTalk (⇒ Korean entity/partner)? What consent and disclosure language is already in your privacy notice for each market? Do you have template-message approval workflows for WhatsApp?

---

## 5. Use case 3 — Voice agents for call centres (inbound & outbound)

### 5.1 Reality check on Alibaba Cloud's voice stack for international customers
- **Voice Service is deployed in the Singapore region** and provides DID numbers, single/group voice calls and international telephony [https://www.alibabacloud.com/help/en/vms/product-overview/what-is-voice-service]; Singapore API endpoint `dyvmsapi-intl.ap-southeast-1.aliyuncs.com` [https://www.alibabacloud.com/help/en/vms/api-dyvmsapi-intl-2021-10-15-endpoint]; international pricing is DID monthly + per-minute, e.g. Thailand rates [https://www.alibabacloud.com/help/en/vms/product-overview/international-voice-service-pricing].
- **But** the China-site overview says Voice Service "does not support outbound international calls" [https://help.aliyun.com/en/vms/product-overview/what-is-voice-service] (**China site only**), and the international API portal notes "the updates to the voice notification and voice verification code services have been stopped in regions outside the Chinese mainland" [https://next.api.alibabacloud.com/document/Dyvmsapi/2017-05-25/SingleCallByVoice].
- **Cloud Contact Center (CCC)** has an API surface on the international portal but no international product page surfaced in research → **treat as unconfirmed / likely China-only** [https://next.api.alibabacloud.com/product/CCC][https://www.alibabacloud.com/help/quota-center/product-overview/alibaba-cloud-services-that-support-quota-center].
- **Consequence for the diagram:** the realistic international pattern is **customer's own CCaaS/SIP trunk (or Alibaba Cloud international SIP trunking [https://www.alibabacloud.com/blog/introduction-to-sip-trunking_600630]) → media bridge → Model Studio speech models in Singapore → agent runtime on AgentRun/FC.** The app should draw the telephony edge as *customer-supplied or partner-supplied* and flag it as a dependency.

### 5.2 Steps (inbound)

| # | Step | Type | Model capability & why | Alibaba Cloud block | Human gate |
|---|---|---|---|---|---|
| 1 | Call arrives; media stream established | act | none | SIP trunk / partner CCaaS → FC or container media bridge | — |
| 2 | **Streaming ASR** | extract | speech recognition; must be streaming to hit latency budget | `qwen3-asr-flash-realtime` @ $0.000047/sec [https://www.alibabacloud.com/help/en/model-studio/model-pricing]; or Paraformer/Fun-ASR realtime [https://www.alibabacloud.com/help/en/model-studio/real-time-speech-recognition-user-guide] | — |
| 2′ | *Alternative:* end-to-end speech-to-speech | generate | full-duplex omni model removes the ASR→LLM→TTS chain | **Qwen-Omni-Realtime / qwen3.8-omni-flash-realtime**, Singapore region, WebSocket or WebRTC [https://www.alibabacloud.com/help/en/model-studio/realtime][https://www.alibabacloud.com/help/en/model-studio/qwen3-8-omni-flash-realtime] | — |
| 3 | Turn detection / endpointing (semantic) | decide | "you need a semantic turn detection model that decides when the customer has finished speaking based on context" [https://cresta.com/blog/engineering-for-real-time-voice-agent-latency] | small model or dedicated endpointer | — |
| 4 | Intent + slot extraction | classify/extract | small fast LLM, JSON Schema | qwen3.8-flash | — |
| 5 | **⫘ Fork:** KB retrieval ‖ account/CRM lookup ‖ policy check | retrieve ‖ act | embeddings+rerank; APIs | vector store + MCP tools | — |
| 6 | Plan the response; check whether the action is permitted | decide | mid/large LLM for multi-step; small for FAQ | qwen-plus / qwen3.8-max | — |
| 7 | Generate **speakable** text (short, numbers spelled, no markdown) | generate | mid LLM | qwen-plus | — |
| 8 | **Streaming TTS** with barge-in support | act | speech synthesis | cosyvoice-v3-plus ($0.26/10k chars, Singapore International) [https://www.alibabacloud.com/help/en/model-studio/cosyvoice-v3-plus] or qwen-audio-3.0-tts-plus ($0.20/10k) [https://www.alibabacloud.com/help/en/model-studio/qwen-audio-3-0-tts-plus] | — |
| 9 | Barge-in / interruption handling | decide | "Most voice AI systems ship with barge-in turned off. It's the safer choice" [https://poly.ai/blog/barge-in-voice-ai-interruption-handling]; runbook covers VAD thresholds, backchannels, silence timeouts [https://hamming.ai/resources/voice-agent-interruption-handling-runbook] | — | — |
| 10 | Execute transaction (payment, reschedule, address change) | act | tool call; **needs auth + idempotency** | MCP tool; AgentBay/FC sandbox for anything code-like | ✅ if money/PII change |
| 11 | **Warm transfer** to human with transcript + summary + intent | **approve / notify** | — | CCaaS transfer | ✅ |
| 12 | Post-call: summarise, QA score, compliance check | generate/classify | batch (50% price) — no latency constraint | Batch inference [https://www.alibabacloud.com/help/en/model-studio/batch-inference] | — |
| 13 | Recording retention + masking of PII in transcripts | act | — | DSC masking [https://www.alibabacloud.com/help/en/dsc/data-security-center/user-guide/data-de-identification]; SLS log masking [https://www.alibabacloud.com/blog/plaintext-stays-put-logs-stay-useful-sensitive-data-protection-with-alibaba-cloud-observability_603543] | — |

**Outbound variant** adds: campaign eligibility filter → consent/DNC check (**hard gate before dialling**) → dial → disclose AI + recording → same 2–13 → opt-out capture.

### 5.3 Latency budget (cite this in the proposal)
- Target **~800 ms median voice-to-voice latency**: "A good rule of thumb is that you should be aiming for 800ms median voice-to-voice latency (eventually)" [https://www.daily.co/blog/advice-on-building-voice-ai-in-june-2025/].
- Twilio: "Minimizing latency involves strategic service placement, avoiding unnecessary network traversals, and prioritizing audio services" [https://www.twilio.com/en-us/blog/developers/best-practices/guide-core-latency-ai-voice-agents].
- Endpointing is now the bottleneck: "TTS and LLM latency keep falling, so endpointing now sets the ceiling on voice-agent responsiveness" [https://www.google.com/goto?url=CAESdAHrOzAVN1Sp5mzR4Fo3lqMfd_FxK19iP4rT1mY5yGzuAu8XjQWGxCUsG743nQ3vNz9RqoSFxpOBLaP9SedFuClaf-S4SJkGijzbf_OGzWMW590VzmZ21_NzuJmVQ] (Roark AI).
- Decagon Voice 2.0 reports a **65% reduction in latency** plus gains in intent recognition [https://modal.com/blog/decagon-case-study].
- **Regional note:** keeping ASR+LLM+TTS all in Singapore avoids extra network traversals — this is the strongest argument for the Singapore default region.

### 5.4 Guardrails specific to voice
- **Recording consent.** In the US, 12 states including California and Florida require all-party consent [https://dialzara.com/blog/call-recording-laws-ai-agents-by-state]; notification alone is not consent in two-party states [https://roark.ai/blog/testing-call-recording-consent-voice-agents] — *secondary legal sources*.
- **Outbound consent (US).** The FCC's Feb 2024 ruling treats AI-generated voice as an "artificial voice" under TCPA, so consent is mandatory [https://www.henson-legal.com/ai-voice-compliance]; the one-to-one consent rule took effect 27 Jan 2025 [https://www.workforcewave.com/compliance/tcpa]; penalties $500–$1,500 per call [https://www.retellai.com/blog/tcpa-compliance-playbook-voice-ai-outbound] — *secondary*.
- **Emotion recognition is prohibited in the EU workplace and education** under AI Act Art. 5(1)(f), applicable since 2 Feb 2025 [https://artificialintelligenceact.eu/article/5/][https://ai-act-service-desk.ec.europa.eu/en/ai-act/faq/what-systems-are-prohibited-under-article-5-ai-act-eg-social-scoring-emotion-recognition]. **Diagram rule:** never draw a "customer emotion inference" node for an EU agent-assist or tutoring deployment; use *sentiment* on the transcript for routing only, and get legal sign-off.
- **AI disclosure** at call start (EU AI Act Art. 50; Korea AI Basic Act Art. 31) — see §4.4 citations.
- Paraformer/Qwen ASR support sensitive-word filtering: "Specifies sensitive words to process during speech recognition and supports setting different processing methods for different sensitive words" [https://www.alibabacloud.com/help/en/model-studio/paraformer-recorded-speech-recognition-restful-api].

### 5.5 KPIs & published figures

| Figure | Value | Source |
|---|---|---|
| PG&E + PolyAI | **35,000 labor hours saved**; **CSAT +22%** on outage calls; millions of utility calls/yr | [https://poly.ai/customers/pge] |
| PG&E payment flow | transaction time **~7 min → 3.5 min** (2025 case study) | [https://poly.ai/guides/call-center-voice-ai] |
| PG&E scale | 16M calls/yr, **67% call resolution**, **25%** customer-effort reduction | [https://growwstacks.com/blog/polyai-voice-agents-reduce-handling-time/][https://zenn.dev/kiiwami/articles/7afb9d136edead03?locale=en] — *secondary* |
| PolyAI Forrester TEI | **391% ROI**, payback **<6 months**, $10.3M average savings per enterprise | [https://tei.forrester.com/go/polyAI/PolyAITEI/][https://www.prnewswire.com/news-releases/polyai-customers-achieved-391-return-on-investment-according-to-total-economic-impact-study-302515545.html] |
| Agent-time waste | "30–60% of agent time is spent answering queries that could be easily resolved online" | [https://poly.ai/blog/8-metrics-you-must-know-to-evaluate-the-impact-of-call-center-voice-ai] |
| Deflection benchmarks | median tier-1 deflection ~**41%**; best performers **58–90%** on quick-win intents | [https://parallellabs.app/poly-ai-review-4/] — *secondary* |
| Complaints vs general | complaints reach FCR **48%** vs **73%** for general inquiries | [https://poly.ai/blog/call-deflection] |
| Decagon voice | **50%+ resolution on voice** (customer story) | [https://decagon.ai/case-studies] |
| Lorikeet voice | **41%** of genuine parent calls fully resolved (Wonderschool) | [https://www.lorikeetcx.ai/articles/ai-customer-service-statistics] |
| Voice resolution pricing | Lorikeet: **$1.50**/voice resolution (Start), **$1.20** (Scale), based on a 3-minute call | [https://www.lorikeetcx.ai/product/voice] |
| Gartner (contact centres) | conversational AI in contact centres will reduce agent labor costs (by 2026) | [https://www.nice.com/blog/future-of-customer-service] — *secondary citing Gartner* |

### 5.6 Pitfalls & discovery questions
**Pitfalls:** over-engineering turn detection instead of using a tested endpointer [https://www.forasoft.com/blog/article/livekit-ai-agents-guide]; obsessing over latency while ignoring task completion — "Most companies building voice AI start in the same place: obsessing over latency, transcription accuracy, turn detection" and then miss the real problem [https://decagon.ai/blog/beyond-latency-the-art-of-building-a-truly-great-voice-agent]; measuring deflection rather than resolution [https://www.teneo.ai/blog/call-deflection-vs-resolution]; assuming Alibaba Cloud has an international CCaaS (unconfirmed, §5.1).

**Discovery:** What telephony/CCaaS do you have today, and does it expose SIP or a media fork? Which countries and languages must be supported (CosyVoice covers 9 incl. JP/KR [https://github.com/QwenAudio/CosyVoice]; ISI lists EN/JP/KR/ID + Chinese variants [https://www.alibabacloud.com/en/product/intelligent-speech-interaction?_p_lc=1])? What is the current IVR containment and abandon rate? Which intents are transactional vs informational? What is the recording-consent posture per jurisdiction? Is outbound in scope, and do you have prior express consent records? What is the target voice-to-voice latency and the acceptable barge-in behaviour? Who owns the escalation script?

---

## 6. Use case 4 — Shopping assistants & product recommendations

### 6.1 Trigger & systems
- **Trigger:** user opens the assistant, searches, views a PDP, adds to cart, or an event (price drop, back-in-stock, cart abandonment).
- **Systems:** product catalogue, inventory, pricing/promotions, search engine, recommender, CRM/CDP, order management, payment.

### 6.2 Steps

| # | Step | Type | Model capability & why | Alibaba Cloud block | Human gate |
|---|---|---|---|---|---|
| 1 | Capture query + context (page, cart, history, locale) | act | none | FC / API Gateway | — |
| 2 | Query understanding: intent, attributes, constraints, budget | extract | small LLM w/ JSON Schema | qwen3.8-flash | — |
| 3 | **⫘ Fork:** 3a semantic product search ‖ 3b personalisation/recall ‖ 3c content retrieval (reviews, size guides, policies) | retrieve (parallel) | embeddings + rerank for 3a/3c; collaborative-filtering/CTR models for 3b | OpenSearch (Industry Algorithm Edition "tuned for e-commerce" [https://www.alibabacloud.com/help/en/open-search/scenarios.md]); **AIRec** ("Captures and analyzes user behavior in seconds and provides personalized recommendations within milliseconds … supports more than 1,000 QPS" [https://www.alibabacloud.com/en/product/airec?_p_lc=1]) | — |
| 4 | Rank / re-rank candidates against the stated constraints | decide | rerank model + business rules | gte-rerank-v2 @ $0.115/1M [https://www.alibabacloud.com/help/en/model-studio/model-pricing] | — |
| 5 | Optional **vision**: virtual try-on, "find similar from a photo", style match | generate/extract | vision + image generation | Qwen-VL / Qwen-OCR [https://www.alibabacloud.com/help/en/model-studio/qwen-vl-ocr]; Taobao's Qwen assistant ships "virtual try-on, 30-day price tracking, and one-tap coupon tools" [https://www.alibabacloud.com/blog/alibaba-opens-all-of-taobao-to-qwen-ai-ushering-in-a-new-agentic-shopping-experience_603104] | — |
| 6 | Generate conversational recommendation with reasons + comparison table | generate | mid LLM; must be grounded in catalogue facts | qwen-plus | — |
| 7 | Guardrail: no fabricated stock/price/claim; no prohibited category advice | classify | Qwen3Guard + deterministic price/stock re-check against source of truth | AI Guardrails | — |
| 8 | Act: add to cart / apply coupon / start checkout / save for later | act | tool call | MCP tool | ✅ for payment or irreversible commitment |
| 9 | Post-purchase support (order status, returns) → routes into Use Case 1/2 | route | — | — | — |
| 10 | Feedback loop: click/add-to-cart/purchase → retrain recall & ranking | act | — | AIRec experiment reporting ("After an experiment is published, you can view its performance analysis report" [https://www.alibabacloud.com/help/doc-detail/331870.html]) | — |

**Loop:** 6→7→6 (bounded regeneration when the guardrail fails). **Parallel:** 3a ‖ 3b ‖ 3c.

### 6.3 Reference implementations to cite
- **Alibaba's own agentic shopping:** "Alibaba fully connected its Qwen App to Taobao's entire product catalog and launched a Qwen-powered shopping assistant inside the Taobao app" [https://www.alibabacloud.com/solutions/retail]; users reach the "Qwen Shopping Assistant" through the messages tab, with virtual try-ons and 30-day price tracking [https://www.alibabacloud.com/blog/alibaba-opens-all-of-taobao-to-qwen-ai-ushering-in-a-new-agentic-shopping-experience_603104][https://www.reuters.com/world/asia-pacific/alibaba-integrate-qwen-ai-with-taobao-launch-agentic-shopping-source-says-2026-05-10/].
- **Beauty/skincare advisor (China mainland):** Shiseido's Drunk Elephant "DRUNKGPT" on Alibaba Cloud + Qwen — "customized skincare advice and product recommendations through Drunk Elephant's WeChat mini program", rolled across 270 Sephora stores [https://www.alibabacloud.com/en/customers/shiseido_drunk_elephant?_p_lc=1][https://www.casestudies.com/company/alibaba-cloud/case-study/shiseido-drunk-elephant-launches-drunk-gpt-across-270-sephora-stores-with-alibaba-cloud][https://www.alibabacloud.com/en/press-room/alibaba-cloud-collaborates-with-shiseido-china-on?_p_lc=1]. *Note: China-mainland market — use as a pattern, not a regional proof point.*
- **B2B sourcing agent (Accio):** "B2B Search Engine Accio surpasses **2 million users within 9 months** of launch" [https://www.prnewswire.com/news-releases/alibaba-international-releases-the-worlds-first-ai-agent-for-global-trade-302530000.html]; claims to automate up to **70%** of sourcing tasks [https://www.okoone.com/spark/technology-innovation/how-alibabas-new-ai-agent-is-shaking-up-global-sourcing/][https://www.success.com/alibaba-accio-ai-agent-small-business] — *secondary*.

### 6.4 KPIs & published figures

| Figure | Value | Source |
|---|---|---|
| Amazon Rufus / Alexa for Shopping | "Customers who use it while shopping are **over 60% more likely** to make a purchase during that shopping trip" | [https://www.aboutamazon.com/news/retail/amazon-rufus-ai-assistant-personalized-shopping-features] |
| Same, AWS engineering blog | "customers that use Rufus during a shopping journey are **60% more likely** to complete a purchase" | [https://aws.amazon.com/blogs/machine-learning/how-rufus-scales-conversational-shopping-experiences-to-millions-of-amazon-customers-with-amazon-bedrock/] |
| Incremental sales | ~**$12B** incremental annualized sales attributed in Q4 2025 (up from ~$10B run-rate cited in Q3 2025) | [https://perpetua.io/blog-alexa-for-shopping-amazon-rufus-the-complete-guide-for-brands-and-sellers/][https://presenc.ai/research/alexa-for-shopping-statistics-2026] — *secondary* |
| AIRec algorithmic claim | Alibaba claims AIRec algorithms outperform "self-managed" algorithms by **20–100%** | [https://emerj.com/artificial-intelligence-at-alibaba/] — *secondary* |
| Gartner trust gap | **54%** of US customers trust human agents more than AI for product/service recommendations vs **32%** who trust AI more | [https://www.lorikeetcx.ai/articles/ai-customer-service-statistics] — *secondary, citing Gartner via Business Wire, Apr 2026* |

**KPI set:** assisted-session conversion rate, incremental revenue per assisted session, AOV, search-to-cart rate, zero-result rate, recommendation CTR, containment into self-service, return rate on AI-recommended items, share of sessions with a fabricated claim (must be ~0).

### 6.5 Guardrails, pitfalls, discovery
**Guardrails:** price/stock/availability must be re-verified against the system of record *after* generation, not trusted from the model (the $1 Tahoe failure mode [https://incidentdatabase.ai/cite/622/]); promotional claims must come from a whitelisted offer service; personalisation must be explainable and opt-outable under Singapore PDPC's AI Recommendation and Decision Systems guidelines [https://www.pdpc.gov.sg/organisations/regulations-decisions/regulatory-guidance/advisory-guidelines-on-use-of-personal-data-in-ai-recommendation-and-decision-systems]; **no emotion inference** in EU contexts (AI Act Art. 5(1)(f)) [https://artificialintelligenceact.eu/article/5/].

**Pitfalls:** recommending out-of-stock items; hallucinating specifications; conflating "personalisation" with profiling without a lawful basis; letting the LLM do recall when a recommender should (latency + cost); cold start — AIRec explicitly "tackles cold-start and low-CTR challenges using collaborative filtering and deep learning CTR models" [https://www.alibabacloud.com/help/en/airec/airec/getting-started/product-introduction/].

**Discovery:** Catalogue size, feed freshness, and how attributes are normalised? Do you have a recommender today, or is this greenfield? Is search lexical, semantic, or both? What is the returns policy exposure if the assistant over-promises? Which markets/languages? Do you need virtual try-on or image search? What consent exists for behavioural personalisation per market? What is the incrementality measurement plan (holdout)?

---

## 7. Use case 5 — Travel & booking assistants

### 7.1 Trigger & systems
- **Trigger:** user asks a planning question, searches a route/date, an itinerary event fires (flight change, check-in window), or a post-booking service need arises.
- **Systems:** GDS/flight & hotel inventory, fare/pricing engine, ancillaries, loyalty, payment, CRM, disruption/ops feeds, policy engine (visa, baggage, fare rules).

### 7.2 Steps

| # | Step | Type | Model capability & why | Alibaba Cloud block | Human gate |
|---|---|---|---|---|---|
| 1 | Parse trip request: origin, dates, pax, budget, constraints | extract | small LLM + JSON Schema | qwen3.8-flash | — |
| 2 | **⫘ Fork (orchestrator-workers):** flight search ‖ hotel search ‖ activities ‖ visa/passport rules ‖ weather/events | retrieve/act (parallel) | tool calls, not model knowledge — fares and availability are volatile | MCP tools via AgentRun Tool Marketplace [https://www.alibabacloud.com/help/en/agentrun/tool-market]; AgentBay browser sandbox for sources without APIs [https://www.alibabacloud.com/help/en/agentbay/developer-reference/all-in-one-sandbox] | — |
| 3 | Constraint satisfaction + fare-rule validation | decide | **large reasoning LLM** — fare rules, change/cancel penalties and multi-city logic are where small models fail | qwen3.8-max ($2/$6) [https://www.alibabacloud.com/help/en/model-studio/model-pricing] | — |
| 4 | Build 2–3 itinerary options with total cost and trade-offs | generate | mid LLM | qwen-plus | — |
| 5 | Grounding check: every claim (price, availability, visa rule) must cite a tool result | decide (loop → 4) | evaluator-optimizer loop | second model call; AgentLoop Agent-as-a-Judge [https://www.alibabacloud.com/help/en/cms/cloudmonitor-2-0/what-is-an-agentloop] (HK only intl.) | — |
| 6 | **Present options; user picks / edits** (conversational refinement loop) | decide | — | — | ✅ (user choice is the gate) |
| 7 | Pre-book summary: total price, cancellation terms, baggage, payment method | generate | mid LLM | qwen-plus | — |
| 8 | **Human/user explicit confirmation** before any charge | **approve** | — | HITL interrupt [https://docs.langchain.com/oss/python/langchain/human-in-the-loop]; Alibaba Cloud HITL guidance [https://www.alibabacloud.com/blog/human-in-the-loop-ai-systems-balancing-automation-and-oversight-in-enterprise-workflows_603587] | ✅ **mandatory** |
| 9 | Book (PNR create, payment authorise, ancillaries) | act | tool call, idempotent, with compensation/reversal path | MCP tool + Saga-style compensation on FC | — |
| 10 | Confirm + issue documents | notify | — | DirectMail (Singapore) / CAMS WhatsApp | — |
| 11 | **Disruption loop (long-running):** monitor flight status → detect irregularity → re-shop options → propose rebooking → approve → rebook | act/decide/approve (loop) | agent with memory; needs long-running state | AgentRun runtime + Tablestore Memory Storage [https://www.alibabacloud.com/help/en/tablestore/memory-storage-service-sub-product-test/agentrun-tablestore-memory] | ✅ for any fare difference/refund |
| 12 | In-trip support (check-in, upgrades, "where's my transfer") → routes to Use Case 2/3 | route | — | — | — |

**Loops:** 4↔5 (quality), 6 (refinement), 11 (disruption, long-running). **Parallel:** step 2 fan-out — this is Anthropic's *parallelization* and *orchestrator-workers* patterns [https://www.anthropic.com/research/building-effective-agents].

### 7.3 Reference implementations
- **Trip.com TripGenie**: "With **twice the order conversion rate** and a retention rate **30–40% higher** than average users" [https://www.trip.com/newsroom/introducing-tripgenie-groundbreaking-ai-travel-assistant/]; "average session duration … nearly double that of other users" [https://www.phocuswire.com/ai-check-in-tripcom-tripgenie].
- **TripGenie on Google Cloud (Gemini)**: "Months after the launch of the upgraded version, we achieved **3X user growth** and a **73% increase in the 7-day retention rate**" [https://cloud.google.com/customers/tripgenie]. *Useful counter-evidence: the biggest APAC OTA runs its assistant on a competitor cloud — the app should not over-claim.*
- **Trip.com 3-year TripGenie data**: "AI-assisted bookings surge **400% year-on-year**"; real-time tools (menu assistant, live translation) up ~**300%**; a creator-driven feature produced "**20% increase in traffic and a 10% increase in bookings** for over 1,500 [properties]" [https://www.facebook.com/tripcomgroup/posts/three-years-of-tripgenie-how-travellers-around-the-world-are-using-ai-differentl/1613255320307037/] — *vendor social post*.
- **Trip.com customer service**: AI "handling around **75% of routine queries** instantly" [https://www.tti.org/post/harnessing-the-power-of-trip-com-s-ai-assistant-tripgenie] — *secondary*.
- **Trip.com/Ctrip runs its internal AI gateway on Alibaba's Higress**: "Ctrip built its internal AI gateway on Higress due to its battle-tested Istio/Envoy architecture and extensible Wasm framework" [https://www.alibabacloud.com/blog/602498][https://hosted-files.sched.co/kccnceu2026/b4/KubeConEU-bof.pdf][https://www.alibabacloud.com/blog/beyond-nginx-ingress-higress-as-the-kubernetes-gateway-for-the-ai-era_603010]. **This is the strongest Alibaba Cloud travel proof point** — sell the AI-gateway/multi-model governance layer, not just the model.
- Reference architectures for the pattern (non-Alibaba): AWS "Building Travel Assistants Using Amazon Bedrock Agents" [https://docs.aws.amazon.com/solutions/building-travel-assistants-using-amazon-bedrock-agents/]; voice travel concierge with AgentCore + Nova Sonic [https://aws.amazon.com/blogs/machine-learning/build-a-voice-travel-concierge-with-amazon-bedrock-agentcore-managed-knowledge-base-and-nova-sonic/]; Google ADK multi-agent travel (FlightAgent / HotelAgent / SightseeingAgent) [https://cloud.google.com/blog/products/ai-machine-learning/build-multi-agentic-systems-using-google-adk].

### 7.4 Guardrails & pitfalls specific to travel
- **Air Canada is the canonical travel-sector failure**: the chatbot invented a bereavement-fare policy; the tribunal held the airline liable and awarded **$812.02** [https://www.bbc.com/travel/article/20240222-air-canada-chatbot-misinformation-what-travellers-should-know][https://en.wikipedia.org/wiki/Moffatt_v._Air_Canada]. **Rule:** policy answers (fares, refunds, baggage, visa) must be retrieved from a versioned policy service, never generated.
- **Money movement:** booking is irreversible-ish → always an explicit `approve` node before charge; require idempotency keys and a compensation path.
- **Hallucinated inventory:** fares/availability must be re-validated at booking time, not at search time.
- **Visa/health advice:** treat as regulated information; require a sourced citation and a "verify with the embassy" disclaimer.
- **PII at scale:** passport numbers, dates of birth → DSC masking before any log or trace store [https://www.alibabacloud.com/help/en/dsc/data-security-center/user-guide/data-de-identification].
- **Adoption reality check:** "only **35%** of travel brands use AI in guest experiences, while just **12.5%** feel prepared to scale AI investments" [https://amperity.com/announcements/amperity-releases-2025-state-of-ai-in-travel-and-airlines-report-revealing].

### 7.5 Discovery questions
Which inventory sources have APIs vs need screen automation? Are you an OTA, airline, hotel, or TMC — and who owns the fare rules? What is the average booking value and the cost of a wrong rebooking? Do you need disruption management (IROPS) in scope, and what is the rebooking authority limit for the agent? Which markets and languages? What payment/PSD2 or 3DS constraints apply to agent-initiated charges? Do you already run an AI gateway / multi-model strategy (Higress pattern)? What is the holdout design to prove incremental conversion?

---

## 8. Use case 6 — Personalised education & tutoring

### 8.1 Trigger & systems
- **Trigger:** student starts a session, submits an answer, asks a question, or a scheduled review/practice job fires.
- **Systems:** LMS, curriculum/knowledge-graph, item bank, assessment/grading service, learner profile & mastery model, content store, teacher dashboard, parent notifications.

### 8.2 Steps

| # | Step | Type | Model capability & why | Alibaba Cloud block | Human gate |
|---|---|---|---|---|---|
| 1 | Load learner state: mastery per skill, misconceptions, pace, accessibility needs | retrieve | none/vector | Tablestore Memory Storage (Singapore) [https://www.alibabacloud.com/help/en/tablestore/memory-storage-service-sub-product-test/news-and-announcements] | — |
| 2 | Diagnose the current question/answer: which skill, what error type | classify/extract | small LLM w/ JSON Schema | qwen3.8-flash | — |
| 3 | **⫘ Fork:** 3a select next item from the knowledge graph ‖ 3b retrieve the relevant explanation/scaffold | decide ‖ retrieve | item selection should be a *policy* (knowledge-tracing/BKT or RL), not a free LLM choice; explanation needs grounded retrieval | AIRec-style ranking for item recall [https://www.alibabacloud.com/help/en/airec/airec/product-overview/what-is-airec]; embeddings + rerank | — |
| 4 | Generate Socratic hint — **not the answer** | generate | mid LLM with a strict "never reveal the final answer" system policy | qwen-plus | — |
| 5 | **Vision/OCR** for handwritten maths, diagrams, photos of worksheets | extract | OCR/vision — "extracts text and structured data from images" [https://www.alibabacloud.com/help/en/model-studio/qwen-vl-ocr]; qwen-long parses images too [https://www.alibabacloud.com/help/en/model-studio/qwen-long] | qwen-vl-ocr | — |
| 6 | **Code execution** for STEM: verify the student's algebra/plot numerically | act | sandboxed execution — never trust the LLM's arithmetic | AgentBay AIO Sandbox (code engine) [https://www.alibabacloud.com/help/en/agentbay/developer-reference/all-in-one-sandbox]; FC Agent Sandbox Code Interpreter [https://www.alibabacloud.com/help/en/functioncompute/code-interpreter-of-fc-agent-sandbox/] | — |
| 7 | Check hint correctness + age-appropriateness + safeguarding | classify (loop → 4) | evaluator-optimizer | AI Guardrails / Qwen3Guard [https://www.alibabacloud.com/help/en/content-moderation/latest/what-is-ai-security-barrier] | — |
| 8 | Speak the hint (younger learners, language learning) | act | TTS with JP/KR/EN etc. | cosyvoice-v3-plus [https://www.alibabacloud.com/help/en/model-studio/cosyvoice-v3-plus]; Qwen3-TTS 10 languages [https://www.alibabacloud.com/blog/qwen3-tts-family-is-now-open-sourced-voice-design-clone-and-generation_602826] | — |
| 9 | Update mastery model; decide continue / remediate / advance | decide | deterministic + small LLM | — | — |
| 10 | **Teacher review** of flagged sessions, low-confidence grading, and any wellbeing signal | **approve** | — | Teacher dashboard; HITL [https://www.alibabacloud.com/blog/human-in-the-loop-ai-systems-balancing-automation-and-oversight-in-enterprise-workflows_603587] | ✅ |
| 11 | Parent/teacher progress report (weekly, batch) | generate + notify | **batch inference at 50%** — no latency need | Batch [https://www.alibabacloud.com/help/en/model-studio/batch-inference] + DirectMail | ✅ teacher sign-off for anything evaluative |
| 12 | Content authoring assist for teachers (lesson plans, rubrics, quizzes) | generate | mid/large LLM | Pattern shipped by Alibaba Cloud as "Qwen Work for Teachers": teachers "rapidly generate customized lesson plans, grading rubrics, and interactive quizzes" [https://www.alibabacloud.com/blog/qwen-work-for-teachers_603576] | ✅ |

**Loops:** 4↔7 (hint quality), 2→9→3 (the tutoring loop across a session). **Parallel:** 3a ‖ 3b.

### 8.3 Alibaba Cloud education assets
- **Wuying AI Tutor**: "Students can interact with an educational chatbot able of responding to students' questions and guide them to solve mathematics or IT problems", powered by Qwen [https://www.alibabacloud.com/blog/alibaba-clouds-wuying-unveils-ai-tutor_601591].
- **Cloud for Youth**: AI-transformed classrooms using Wuying infrastructure + Qwen [https://www.alibabacloud.com/blog/alibabas-cloud-for-youth-wins-education-innovation-award-for-bridging-china%E2%80%99s-rural-digital-divide_602555] — *China programme*.
- **Qwen Work for Teachers** [https://www.alibabacloud.com/blog/qwen-work-for-teachers_603576].

### 8.4 KPIs — and the most important published *negative* result

| Figure | Value | Source |
|---|---|---|
| **Khanmigo two-year cluster RCT (18 Tennessee middle schools)** | Assignment to Khan Academy raises math achievement by **1.3 national percentile ranks per term** (≈**0.06–0.08 SD** over a school year) | [https://ideas.repec.org/p/nbr/nberwo/35620.html][https://www.nber.org/system/files/working_papers/w35620/w35620.pdf] |
| Same study | Adding the **Khanmigo AI tutor did not improve math performance above Khan Academy practice alone** | [https://hechingerreport.org/proof-points-khanmigo-math-ai-tutor/] |
| Study framing | "Some of the first large-scale experimental evidence" on AI tutoring; notes low engagement — only a minority of exercise sessions used the tutor | [https://www.nber.org/people/philip_oreopoulos][https://scale.stanford.edu/ai/repository/one-click-away-ai-tutoring-khanmigo-two-year-school-experiment] |
| Squirrel AI / Yixue adaptive system (2018, peer-reviewed) | "students achieved better performance using Yixue adaptive learning system than both traditional classroom instruction by expert teachers [and …]" | [https://ieeexplore.ieee.org/document/8623327/] |
| Squirrel AI vendor claim | mastery rate **56% → 89%** in one month | [https://hundred.org/en/innovations/squirrel-ai-learning] — *vendor-supplied* |
| Duolingo Max | Video Call available to Max subscribers on iOS/Android (v13+) for EN/FR/ES/IT/DE/PT | [https://www.duolingo.com/help/what-is-duolingo-max] |
| Duolingo Max penetration | ~**9%** of subscribers (secondary, LinkedIn) | [https://www.linkedin.com/posts/gianlucamauro_soduolingo-took-a-beating-these-are-their-activity-7392249625010745344-rZDj] — *unconfirmed* |

**Business-value framing that survives scrutiny:** the honest KPI set is *engagement/dosage* (sessions per week, minutes on task, completion), *teacher time saved* (grading, lesson prep), and *learning gain vs. a measured baseline* — not "AI tutor = 2 sigma". Cite the NBER result explicitly in the proposal's risk section; it is the strongest published evidence and it is modest.

### 8.5 Guardrails specific to education
- **Minors' data.** UNESCO's *Guidance for generative AI in education and research* "proposes steps for governments to regulate GenAI, including data privacy protection and **age limits**" and is "anchored in a human-centred approach that promotes human agency" [https://www.unesco.org/en/articles/guidance-generative-ai-education-and-research].
- **EU: emotion inference in education is prohibited** — AI Act Art. 5(1)(f), applicable since 2 Feb 2025 [https://artificialintelligenceact.eu/article/5/][https://ai-act-service-desk.ec.europa.eu/en/ai-act/faq/what-systems-are-prohibited-under-article-5-ai-act-eg-social-scoring-emotion-recognition]. **Drawing rule: forbid an "engagement/emotion detection from video or voice" node for EU education deployments.**
- **US state child-safety chatbot laws are expanding fast:** "States introduced nearly 300 children's online safety laws targeting age verification, social media design, and AI chatbots" [https://www.multistate.us/insider/2026/4/30/state-childrens-online-safety-laws-expand-beyond-social-media-in-2026]; California SB 243 regulates companion chatbots with child-safety duties including periodic interface-design testing [https://www.hunton.com/privacy-and-cybersecurity-law-blog/california-enacts-companion-chatbot-child-safety-requirements]; Newsom signed further child-safety chatbot laws on 10 Sep 2026 [https://www.gov.ca.gov/2026-09-10/governor-newsom-signs-the-strongest-child-safety-chatbot-and-social-media-laws-in-the-nation/].
- **Academic-integrity guardrail:** never return a full answer for graded work; the Socratic-hint pattern plus a code-verified scaffold is the defensible design.
- **Korea:** AI Basic Act transparency (Art. 31) applies to generative AI services [https://intelligence.dlapiper.com/artificial-intelligence/countries/south-korea/07-controls-on-generative-ai.html]; PIPA Art. 37-2 automated-decision rights may attach to algorithmic grading/placement [https://elaw.klri.re.kr/eng_service/lawView.do?hseq=62389&lang=ENG].
- **Japan:** APPI requires consent before providing personal information to third parties [https://iapp.org/news/a/japan-s-dpa-publishes-interim-summary-of-amendments-to-data-protection-regulations]; the PPC has published instructions for generative AI services [https://securiti.ai/blog/japan-instructions-for-generative-ai-services/]; Japan's AI Promotion Act (2025) imposes duties on "AI Business Operators, encompassing both developers and deployers" [https://fpf.org/blog/understanding-japans-ai-promotion-act-an-innovation-first-blueprint-for-ai-regulation/] and applies to foreign operators targeting Japanese users [https://www.gov-online.go.jp/hlj/en/november_2025/november_2025-08.html].

### 8.6 Pitfalls & discovery
**Pitfalls:** answer-giving instead of tutoring (kills learning gain and creates integrity risk); trusting LLM arithmetic instead of executing code; over-claiming outcomes against the NBER evidence; low dosage — the RCT notes only a minority of sessions actually used the tutor [https://www.nber.org/system/files/working_papers/w35620/w35620.pdf]; deploying emotion detection in an EU school; ignoring teacher workflow (teachers, not students, are the retention lever — hence Alibaba's "Qwen Work for Teachers" angle [https://www.alibabacloud.com/blog/qwen-work-for-teachers_603576]).

**Discovery:** Who is the buyer — school, district, publisher, or consumer app? Age range and safeguarding owner? Is the content curriculum-aligned and licensed? Is there an existing knowledge graph / item bank, or does one need building? What is the assessment regime (formative vs summative, graded vs practice)? Which languages and scripts (handwriting recognition needs)? What data can legally leave the country (Korea/Japan/Indonesia/Thailand all differ)? Is there a baseline and a control group for measuring gain? What is the teacher's role and their review queue capacity?

---

## 9. APAC cross-cutting table (channels, languages, regulation)

| Market | Dominant conversational channel | Language/model note | Key regulation for a CX agent | Source |
|---|---|---|---|---|
| **Singapore** | WhatsApp, web chat | English + Mandarin + Malay + Tamil; **Qwen-SEA-LION-v4** built for SEA multilingual/mixed-language use | PDPA + PDPC Advisory Guidelines on Personal Data in AI Recommendation & Decision Systems (1 Mar 2024); Proposed GenAI Advisory Guidelines (consultation Jun–Jul 2026); **IMDA Model AI Governance Framework for Agentic AI** v1.0 Jan 2026 / v1.5 May 2026 (voluntary) | [https://www.pdpc.gov.sg/organisations/regulations-decisions/regulatory-guidance/advisory-guidelines-on-use-of-personal-data-in-ai-recommendation-and-decision-systems][https://digitalpolicyalert.org/event/40304-personal-data-protection-commission-opened-consultation-on-proposed-advisory-guidelines-on-use-of-personal-data-in-generative-ai][https://www.imda.gov.sg/about-imda/emerging-technologies-and-research/artificial-intelligence][https://www.alibabacloud.com/blog/alibaba%E2%80%99s-qwen-powers-ai-singapore%E2%80%99s-latest-llm-to-strengthen-multilingual-performance-in-southeast-asia_602692] |
| **Korea** | **KakaoTalk** (not in Alibaba CAMS) | Korean; CosyVoice/Qwen3-TTS cover Korean; **no Model Studio Seoul region** → inference runs in Singapore/Tokyo | PIPA (Art. 37-2 automated-decision refusal/explanation; cross-border transfer consent) + **AI Basic Act** in force 22 Jan 2026 (Art. 31 advance notice for generative/high-impact AI, extraterritorial) + PIPC generative-AI guideline; PIPC's Iruda sanction is the enforcement precedent | [https://elaw.klri.re.kr/eng_service/lawView.do?hseq=62389&lang=ENG][https://www.trade.gov/market-intelligence/south-korea-ai-basic-act][https://www.kimchang.com/en/insights/detail.kc?sch_section=4&idx=33805][https://fpf.org/blog/south-korea-the-first-case-where-the-personal-information-protection-act-was-applied-to-an-ai-system/][https://www.alibabacloud.com/help/en/model-studio/what-is-model-studio] |
| **Japan** | **LINE** (in Alibaba CAMS, currently a free channel) | Japanese; ISI lists Japanese; CosyVoice/Qwen3-TTS cover Japanese | APPI (consent for third-party provision; PPC generative-AI instructions) + **AI Promotion Act 2025** (duties on developers *and* deployers; applies to foreign operators targeting Japan); AI Guidelines for Business (updated Mar 2025) | [https://www.alibabacloud.com/help/en/chatapp/product-overview/chatapp-message-service-pricing][https://iapp.org/news/a/japan-s-dpa-publishes-interim-summary-of-amendments-to-data-protection-regulations][https://securiti.ai/blog/japan-instructions-for-generative-ai-services/][https://fpf.org/blog/understanding-japans-ai-promotion-act-an-innovation-first-blueprint-for-ai-regulation/][https://www.gov-online.go.jp/hlj/en/november_2025/november_2025-08.html][https://www.whitecase.com/insight-our-thinking/ai-watch-global-regulatory-tracker-japan] |
| **Thailand** | **LINE** is "the default customer-support channel in Thailand, Japan, and Taiwan" (secondary) | Thai; SEA-LION targets SEA languages | PDPA in full force since 1 Jun 2022; **PDPC's first AI-specific guidance** on applying the PDPA to AI, advising that "consent should be a last resort, not the first option" | [https://faqsure.com/blog/line-chatbot-for-business][https://www.dlapiperdataprotection.com/index.html?t=law&c=TH][https://www.tilleke.com/insights/thailand-issues-personal-data-protection-guidelines-for-ai-systems/] |
| **Indonesia** | WhatsApp (SEA conversational-commerce leader; $12.68B transaction value in 2023, secondary) | Bahasa Indonesia — **ISI lists Indonesian** | PDP Law No. 27/2022, GDPR-modelled; layered cross-border transfer requirements | [https://www.id.sb-telecom.com/news/how-whatsapp-business-api-helps-indonesia-business-build-strong-customer-relationship-2025/][https://www.alibabacloud.com/en/product/intelligent-speech-interaction?_p_lc=1][https://www.onetrust.com/glossary/indonesia-personal-data-protection-law/][https://practiceguides.chambers.com/practice-guides/data-protection-privacy-2026/indonesia/trends-and-developments] |
| **Malaysia** | WhatsApp | Malay/English | PDPA Amendment Act 2024 (mandatory breach notification) + National Guidelines on AI Governance & Ethics (Sep 2024) | [https://fpf.org/blog/malaysia-charts-its-digital-course-a-guide-to-the-new-frameworks-for-data-protection-and-ai-ethics/][https://www.dmhubtraining.com/ai-governance-malaysia/] |
| **EU** | Web chat, email, WhatsApp | 24 languages; Qwen3Guard covers up to 119 languages | **AI Act Art. 50** transparency (chatbot must disclose it is AI) applicable since **2 Aug 2026**; **Art. 5(1)(f)** emotion recognition banned in workplace/education since **2 Feb 2025** | [https://artificialintelligenceact.eu/article/50/][https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act][https://artificialintelligenceact.eu/article/5/][https://docs.mozilla.ai/any-guardrail/api-reference/index/content-safety/qwen3-guard-stream] |
| **US** | Email, web chat, SMS, voice | English/Spanish (Lyft's agent is "available 24/7 in English and Spanish" [https://www.customerexperiencedive.com/news/lyfts-agentic-ai-resolution-times/806558/]) | TCPA: FCC treats AI voice as "artificial voice"; one-to-one consent rule from 27 Jan 2025; state child-chatbot laws | [https://www.henson-legal.com/ai-voice-compliance][https://www.workforcewave.com/compliance/tcpa][https://www.multistate.us/insider/2026/4/30/state-childrens-online-safety-laws-expand-beyond-social-media-in-2026] |

**Regional infrastructure note for the app:** Alibaba Cloud now runs **107 availability zones across 31 regions**, with Türkiye, Finland and the Netherlands announced as new regions over the following 12 months and expansion in Malaysia, Germany, UAE, France and Hong Kong [https://www.alibabacloud.com/en/press-room/alibaba-cloud-expands-global-infrastructure-and-ai?_p_lc=1][https://www.alibabacloud.com/en/global-locations?_p_lc=1]. Two new availability zones launched in France [https://www.alibabacloud.com/en/press-room/alibaba-cloud-expands-european-footprint-with-two?_p_lc=1]. Singapore hosts the international HQ and the first AI Global Competency Center [https://www.alibabacloud.com/blog/alibaba-cloud-celebrates-10-years-in-singapore-with-new-data-centers-and-ai-global-competency-center_602337].

---

## 10. Worked cost model the app can reuse

All unit prices below are Alibaba Cloud Singapore / International list prices from the cited pages. Token volumes are **assumptions for illustration**, not vendor data — the app should let the user edit them.

### 10.1 Email ticket, auto-resolution path (per ticket)

| Step | Model | In tok | Out tok | Price in / out (per 1M) | Cost |
|---|---|---|---|---|---|
| Classify intent+urgency | qwen3.8-flash | 1,200 | 60 | $0.15 / $0.47 [https://www.facebook.com/alibabacloud/posts/qwen38-flash-is-now-available-in-the-european-union-on-alibaba-cloud-model-studi/1582315680607185/] | $0.000208 |
| Embed query | text-embedding-v4 | 300 | — | $0.07 [https://www.alibabacloud.com/help/en/model-studio/model-pricing] | $0.000021 |
| Rerank 20 chunks | gte-rerank-v2 | 2,000 | — | $0.115 [https://www.alibabacloud.com/help/en/model-studio/model-pricing] | $0.000230 |
| Grounded draft | qwen-plus (≤256K tier) | 6,000 | 400 | $0.165 / $0.99 [https://www.alibabacloud.com/help/en/model-studio/model-pricing] | $0.001386 |
| Evaluator pass | qwen-plus | 3,000 | 150 | $0.165 / $0.99 | $0.000644 |
| **Subtotal (auto path)** | | | | | **≈ $0.0025** |
| Hard escalation reasoning | qwen3.8-max | 8,000 | 800 | $2 / $6 [https://www.alibabacloud.com/help/en/model-studio/model-pricing] | $0.0208 |
| **Worst-case total** | | | | | **≈ $0.023 / ticket** |

At 100k tickets/month: **≈ $250** if all auto-path, **≈ $2,300** if every ticket hits the max-model branch. With **batch at 50%** [https://www.alibabacloud.com/help/en/model-studio/batch-inference] on anything non-real-time, and **cache hits at 10%** of input price on the repeated system prompt + policy block [https://www.alibabacloud.com/help/en/model-studio/explicit-cache-guide], realistic spend is materially lower — the app should draw both a "list" and an "optimised" number.

### 10.2 Voice call, 3 minutes (per call)

| Component | Unit | Qty | Price | Cost |
|---|---|---|---|---|
| Streaming ASR (qwen3-asr-flash-realtime) | seconds | 180 | $0.000047/sec [https://www.alibabacloud.com/help/en/model-studio/model-pricing] | $0.00846 |
| Dialogue LLM (qwen3.8-flash, 8 turns × 2,000 in / 120 out) | tokens | 16,000 / 960 | $0.15 / $0.47 | $0.00285 |
| TTS (cosyvoice-v3-plus) | chars | 1,200 | $0.26 / 10k chars [https://www.alibabacloud.com/help/en/model-studio/cosyvoice-v3-plus] | $0.03120 |
| **Model subtotal** | | | | **≈ $0.0425 / call** |
| TTS alternative (qwen-audio-3.0-tts-plus) | chars | 1,200 | $0.20 / 10k [https://www.alibabacloud.com/help/en/model-studio/qwen-audio-3-0-tts-plus] | $0.0240 → total ≈ $0.0353 |
| Telephony | minutes | 3 | Alibaba Cloud International Voice Service per-minute + DID monthly [https://www.alibabacloud.com/help/en/vms/product-overview/international-voice-service-pricing] | **quote required** |

Compare with market per-resolution voice pricing of **$1.20–$1.50** [https://www.lorikeetcx.ai/product/voice] — the model+media cost is a small fraction, which is the margin story for a build-your-own proposal. Note: for Qwen-Omni-Realtime, "models bill only the audio; the corresponding text is not charged" [https://www.alibabacloud.com/help/en/model-studio/model-pricing] — a different cost shape that needs its own row.

### 10.3 WhatsApp chat conversation (per conversation)
Add to the model cost: CAMS platform service fee **$0.005/message** where applicable (LINE/Messenger/Instagram/Telegram currently free) [https://www.alibabacloud.com/help/en/chatapp/pricing-change-for-chat-app-channels][https://www.alibabacloud.com/help/en/chatapp/product-overview/chatapp-message-service-pricing] **plus Meta's per-message charge** by category and market [https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing] — from **1 Oct 2026** service/utility messages inside the 24-hour window are chargeable too [https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/non-template-messages]. Third-party rate cards put marketing messages between roughly **$0.0109 and $0.1597** per delivered message depending on market [https://www.engagelab.com/blog/whatsapp-api-pricing] — *secondary*.

### 10.4 Non-model line items to always include
Function Compute (CU-based: vCPU + memory + invocations + disk, 10 GB free disk quota) [https://www.alibabacloud.com/help/en/functioncompute/billing-overview-of-fc][https://www.alibabacloud.com/help/en/functioncompute/pay-as-you-go-billing-methods]; Agent Sandbox compute + cloud resource fees [https://www.alibabacloud.com/help/en/agent-sandbox/product-overview/billing-overview]; AnalyticDB-PG serverless (international site: pay-as-you-go only) [https://www.alibabacloud.com/help/en/analyticdb/analyticdb-for-postgresql/product-overview/serverless-mode-released-for-analyticdb-for-postgresql]; Hologres (Singapore prepaid example on the pricing page) [https://www.alibabacloud.com/help/en/hologres/product-overview/billing-overview]; DirectMail (initial quota 2,000 emails/day) [https://www.alibabacloud.com/help/en/direct-mail/product-overview/limits]; AI Guardrails pay-as-you-go [https://www.alibabacloud.com/en/product/content-moderation/pricing?_p_lc=1]; AgentCore billed by Compute CU (China reference price CNY 0.0000694/CU in Shanghai — **international price unconfirmed**) [https://help.aliyun.com/en/agentcore/agentcore-billing-instructions] (**China site only**).

---

## 11. Cross-use-case guardrail reference architecture (draw this as a layer, not a node)

| Layer | Control | Alibaba Cloud product | Source |
|---|---|---|---|
| Input | Prompt-injection / jailbreak detection; relevance classification | AI Guardrails (Qwen3Guard-powered), Singapore region | [https://www.alibabacloud.com/help/en/content-moderation/latest/what-is-ai-security-barrier][https://www.alibabacloud.com/blog/qwen3guard-real-time-safety-for-your-token-stream_602582] |
| Input | PII discovery + static/dynamic masking | Data Security Center | [https://www.alibabacloud.com/help/en/dsc/data-security-center/user-guide/data-de-identification] |
| Retrieval | Grounding: answer only from retrieved chunks; cite chunk IDs | Model Studio RAG semantics ("strictly limit its answers to the scope of the retrieved [content]") | [https://www.alibabacloud.com/help/en/model-studio/faq-about-alibaba-cloud-model-studio] |
| Tool | Least-privilege, allow-listed tools; MCP governance | AgentRun Tool Marketplace; AgentCore governance | [https://www.alibabacloud.com/help/en/agentrun/tool-market][https://www.alibabacloud.com/en/product/agentcore?_p_lc=1] |
| Action | Deterministic policy check before any write; idempotency; compensation | custom code on FC — no managed product | pattern from [https://dev.to/aws/ai-agent-guardrails-rules-that-llms-cannot-bypass-596d] |
| Action | Human approval on medium/high-risk operations | Alibaba Cloud HITL plug-in | [https://www.alibabacloud.com/help/en/skillsportal/aliyun-hitl-agent-security-guide] |
| Output | Token-level streaming moderation (<2s vendor claim) | AI Guardrails / Qwen3Guard-Stream | [https://www.facebook.com/alibabacloud/posts/1505252311646856/][https://docs.mozilla.ai/any-guardrail/api-reference/index/content-safety/qwen3-guard-stream] |
| Runtime | Sandboxed browser/code execution for untrusted work | AgentBay / FC Agent Sandbox / ACS Agent Sandbox | [https://www.alibabacloud.com/help/en/agentbay/developer-reference/all-in-one-sandbox][https://www.alibabacloud.com/help/en/functioncompute/supported-regions-of-fc-agent-sandbox][https://www.alibabacloud.com/help/en/cs/user-guide/agent-sandbox/] |
| Observability | Full trajectory traces, evaluation, dataset flywheel | AgentLoop (**Hong Kong only internationally**) | [https://www.alibabacloud.com/help/en/agentloop/product-overview/what-is-agentloop][https://www.alibabacloud.com/help/en/agentloop/product-overview/server-launch-regions-of-agentloop] |
| Audit | Agent observability + audit data collection | LoongSuite on Alibaba Cloud | [https://www.alibabacloud.com/blog/603239] |
| Log hygiene | Mask sensitive data in AI logs while keeping analytics | SLS multi-stage masking | [https://www.alibabacloud.com/blog/plaintext-stays-put-logs-stay-useful-sensitive-data-protection-with-alibaba-cloud-observability_603543] |
| Governance framework | Agentic-AI governance controls, agent identity/permissions, approvals | Singapore IMDA MGF for Agentic AI (voluntary, but the local buyer will ask) | [https://www.imda.gov.sg/about-imda/emerging-technologies-and-research/artificial-intelligence][https://nhimg.org/singapore-agentic-ai-governance-framework-guide] |

---

## 12. Test cases the app should pass

| # | Prompt the app should handle | Expected drawing behaviour |
|---|---|---|
| T1 | The brief's example: "agentic workflow that reads incoming support emails, answers routine ones from help-centre articles, sends the rest to a human with a draft reply" | Trigger = EventBridge/mail webhook; classify (flash) → parallel [retrieve (embedding+rerank) ‖ account lookup] → decide → generate (plus) → evaluate loop (max 2) → guardrail → **two exits: auto-send OR human-approve** → notify. Must *not* draw Model Studio's no-code agent app [https://www.alibabacloud.com/help/en/model-studio/single-agent-application] |
| T2 | "WhatsApp support bot for Indonesia and Japan" | CAMS node with WhatsApp + LINE; Meta per-message fee line item; 24-hour window + escalation-path note [https://whatsappbusiness.com/policy/]; PDPA/PDP-Law residency callout |
| T3 | "Korean-language KakaoTalk agent for our Seoul customers" | **Must flag:** KakaoTalk not in CAMS; **no Model Studio Seoul region** → Singapore/Tokyo inference; PIPA cross-border consent + Art. 37-2 explanation/refusal path; AI Basic Act Art. 31 notice |
| T4 | "Voice bot for our Manila call centre" | **Must flag:** Alibaba Cloud international voice is DID/SIP-oriented; CCC international availability unconfirmed; customer/partner CCaaS at the edge; ASR+LLM+TTS all in Singapore for latency; 800 ms target; Art. 5 emotion-recognition ban if EU callers |
| T5 | "AI tutor for our chain of tuition centres in Singapore and KL" | Socratic hint loop with a "never reveal the answer" policy; OCR for handwriting; sandboxed code verification; teacher `approve` node; UNESCO age-limit/privacy note; **no emotion-inference node** |
| T6 | "Shopping assistant that recommends products and applies coupons" | Parallel recall (OpenSearch/AIRec ‖ content retrieval); rerank; **deterministic price/stock re-check after generation**; `approve` before charge; cites the $1 Tahoe failure mode |
| T7 | "Travel agent that rebooks passengers when flights are cancelled" | Long-running disruption loop with memory (Tablestore/AgentRun); orchestrator-workers fan-out; fare-rule validation on the large reasoning model; **mandatory human/user approve before charge**; Air Canada policy-grounding rule |
| T8 | Any prompt | Every model node shows model ID + Singapore price; a toggle for batch (−50%), cache-hit (−90% on cached input), savings plan (up to −47%), and busy/idle hours; a warning if AgentLoop (HK) or AI Search Open Platform (Shanghai/Frankfurt) is drawn in a Singapore-only design |
| T9 | "Make it cheap" | Offer the DualLane dual-path variant (fast deterministic lane ‖ LLM lane) with the cost delta [https://dl.acm.org/doi/10.1145/3770855.3818380][https://www.theregister.com/ai-and-ml/2026-08-11/alibaba-cloud-is-using-ai-to-help-it-use-less-ai/5285815] |
| T10 | Proposal export | Business-reader section must carry Gartner's 80%/30% opportunity **and** the >40% cancellation risk, the Khanmigo RCT for education, and a stated KPI baseline |

---

## 13. Items I could not confirm

| Item | Status |
|---|---|
| Which region column on the qwen3.8-max model page carries $1.65/$4.951 | **unconfirmed** — Singapore is $2/$6 on the aggregate pricing page; third parties attribute $1.65/$4.951 to US (Virginia)/Global |
| International availability of Cloud Contact Center (CCC) | **unconfirmed / likely China-only** — no international product page found |
| Whether Voice Service can place outbound international calls for an international account | **conflicting**: China site says no [https://help.aliyun.com/en/vms/product-overview/what-is-voice-service]; international product page advertises international SIP trunking and DID numbers [https://www.alibabacloud.com/en/product/vms?_p_lc=1] |
| Tablestore **Knowledge** Storage in Singapore | **unconfirmed** — Memory Storage is confirmed in Singapore; the Knowledge Storage region list rendered with China regions first |
| AgentCore international pricing (CU rate) | **unconfirmed** — only a China (Shanghai) reference price found, on the China site |
| Whether Qwen Cloud (launched Singapore, 26 May 2026) lifts the Model Studio application restriction for new international accounts | **unconfirmed** — the restriction text is still on the Model Studio docs pages |
| Final publication status/date of Singapore PDPC's Advisory Guidelines on Use of Personal Data in Generative AI | **unconfirmed** — consultation closed 1 Jul 2026; one tracker dates the guidelines 20 Jul 2026; not verified on pdpc.gov.sg |
| AIRec region availability for international accounts | **unconfirmed** — product and docs pages exist on alibabacloud.com but no region table surfaced |
| Duolingo Max subscriber share (~9%) | **unconfirmed** — LinkedIn post only |
| Klarna's subsequent re-hiring of human agents | **secondary source only** |
| Sierra per-resolution rates (up to 90% on transactional workflows) and its pricing | **secondary**; Sierra publishes no per-resolution rate [https://www.cekura.ai/blogs/sierra-ai-pricing] |

---

### One-line summary for the product team
For international customers the drawable Alibaba Cloud CX-agent stack is: **channel (CAMS / DirectMail / partner CCaaS-SIP) → EventBridge trigger → agent runtime on AgentRun or AgentCore in Singapore (never Model Studio's no-code apps) → Qwen models by capability tier (flash $0.15/$0.47, plus $0.165/$0.99 ≤256K, max $2/$6, VL/OCR, embedding $0.07, rerank $0.115, ASR $0.000047/s, TTS $0.20–$0.30/10k chars, Omni-Realtime for speech-to-speech) → retrieval on AnalyticDB-PG/Hologres/OpenSearch/AIRec → memory on Tablestore → tools via MCP and sandboxes on AgentBay/FC → guardrails via AI Guardrails (Qwen3Guard) + DSC → observability via AgentLoop (Hong Kong only)**, with a mandatory `approve` node before any money movement or irreversible write, and with region/eligibility flags raised automatically for Korea (no Seoul region, KakaoTalk not in CAMS, PIPA + AI Basic Act), EU (AI Act Art. 50 and Art. 5(1)(f)), and voice (no confirmed international CCaaS).

---

## Searches run (243)

- Alibaba Cloud Model Studio agent application Singapore region availability 2025
- Alibaba Cloud Model Studio workflow application documentation
- Anthropic building effective agents patterns
- OpenAI a practical guide to building agents PDF
- Alibaba Cloud Intelligent Contact Center international site
- Alibaba Cloud customer service AI agent case study
- Qwen model list Model Studio Singapore pricing 2026
- Model Studio supported models qwen-vl paraformer cosyvoice speech recognition text-to-speech Singapore
- Alibaba Cloud Model Studio text-embedding-v4 gte-rerank pricing
- Alibaba Cloud AgentRun serverless agent runtime Singapore
- Alibaba Cloud AgentBay sandbox browser code execution
- Alibaba Cloud customer service agent thoughts design and practices blog 601555
- Alibaba Cloud AI Search Open Platform regions Shanghai Frankfurt
- Alibaba Cloud OpenSearch LLM intelligent search version international
- Alibaba Cloud Function Compute AI agent workflow
- Intercom Fin AI agent resolution rate published benchmark 2025
- Klarna AI assistant 700 full-time agents OpenAI press release
- Sierra AI customer service agent published resolution rate
- Salesforce Agentforce customer results resolution rate case study
- Gartner agentic AI customer service 2026 prediction conversational AI reduce agent workload
- Zendesk AI customer service report 2025 statistics resolution rate
- McKinsey generative AI customer service value 2025
- email triage LLM classifier accuracy handoff to human best practices
- voice AI agent call centre latency turn detection best practices engineering blog 2025
- Alibaba Cloud Intelligent Contact Center CCC product international
- Paraformer real-time speech recognition Alibaba Cloud Model Studio latency
- CosyVoice streaming text-to-speech Alibaba Cloud languages supported
- WhatsApp Business Platform API conversational commerce Southeast Asia statistics 2025
- LINE Messaging API Japan Thailand AI chatbot enterprise
- KakaoTalk business channel Korea AI chatbot Kakao i Open Builder
- Korea PIPA personal information AI chatbot requirements 2025
- Alibaba Cloud customer service agent blog results resolution rate design practices
- Alibaba Cloud agentic AI ecosystem press release AgentRun AgentBay QwenWork
- Amazon Rufus shopping assistant published metrics 2025 conversion
- Alibaba Cloud AIRec intelligent recommendation product international
- Trip.com TripGenie AI assistant results metrics
- Klook AI travel assistant Alibaba Cloud case study
- Khanmigo tutoring published results study 2025
- Alibaba Cloud education AI tutor case study international
- Singapore PDPC advisory guidelines use of personal data in AI systems 2024
- EU AI Act Article 50 transparency obligations chatbot disclosure 2026
- Alibaba Cloud Model Studio content moderation safety guardrails green net
- Alibaba Cloud Model Studio knowledge base RAG limits documents Singapore
- Alibaba Cloud Model Studio model pricing qwen-plus qwen-flash Singapore per million tokens
- Alibaba Cloud Dify on ACK Container Service for Kubernetes deploy
- Alibaba Cloud AnalyticDB PostgreSQL vector database RAG
- Alibaba Cloud AgentLoop observability regions Hong Kong
- Alibaba Cloud AgentCore what is it enterprise agent platform governance
- Qwen3Guard Alibaba Cloud AI Guardrails streaming moderation languages
- Qwen3-Omni realtime voice Model Studio API international
- Alibaba Cloud Model Studio qwen-plus price Singapore USD per 1M tokens 2026
- PolyAI voice agent published results call centre deflection rate
- Parloa Cresta voice AI agent metrics case study 2025
- Khanmigo randomized controlled trial results learning outcomes
- Duolingo Max AI video call customer support metrics
- "Intelligent Contact Center" Alibaba Cloud AICCS international regions availability
- Alibaba Cloud customer service agent blog 601555 intent recognition tool calling results accuracy
- Meta WhatsApp Business Platform per-message pricing 2025 utility authentication marketing
- prompt injection email agent guardrails Google Microsoft engineering guidance 2025
- Alibaba Cloud case study retail shopping assistant Qwen Southeast Asia
- Alibaba Cloud Lazada AI customer service chatbot case study
- Alibaba Cloud travel airline hotel case study AI assistant international
- Alibaba Cloud Model Studio speech synthesis pricing per 10000 characters Singapore
- Alibaba Cloud Model Studio speech recognition pricing qwen3-asr-flash paraformer-realtime per hour Singapore USD
- Alibaba Cloud "Cloud Contact Center" product page alibabacloud.com
- Alibaba Cloud Tablestore agent memory conversation history
- Alibaba Cloud MCP marketplace Model Studio tools
- "customer service agent" Alibaba Cloud blog ticket classification RAG tool "resolution rate" design practices
- Alibaba Cloud AgentCore regions supported Singapore
- Alibaba Cloud AgentRun human-in-the-loop approval interrupt
- Alibaba Cloud Model Studio batch inference discount 50% Singapore
- alibabacloud.com blog 601555 customer service agent intent routing knowledge base tool call escalation
- Alibaba Cloud blog customer service agent design practices "pre-sales" ticket LLM architecture multi-agent
- Alibaba Cloud Accio B2B sourcing agent metrics users
- Shiseido Drunk Elephant Alibaba Cloud AI WeChat personalized skincare case study
- LINE Official Account Messaging API webhook quota Japan Thailand monthly active users 2025
- KakaoTalk Channel chatbot API Korea requirements business verification
- Japan APPI generative AI personal data guidelines PPC 2024
- Thailand PDPA Indonesia PDP Law AI chatbot personal data consent
- fin.ai benchmarks median resolution rate by industry customer support
- Decagon AI agent resolution rate published customer case study 2025
- Lorikeet AI voice agent customer case study resolution rate Australia
- Amazon Connect generative AI agent assist published results case study
- Alibaba Cloud Lingyang AgentOne customer service marketing roadmap
- techzine Alibaba Cloud reduces LLM use in support ticket handling
- Alibaba Cloud Intelligent Robot chatbot product features knowledge
- Google Cloud Contact Center AI Platform published metrics case study deflection
- DualLane Alibaba Cloud support ticket LLM routing paper arxiv
- Alibaba Cloud ChatApp Message Service WhatsApp Business international product
- Alibaba Cloud Chatbot Intelligent Robot product regions international availability
- Alibaba Cloud Voice Service international outbound call product page
- Alibaba Cloud Model Studio workflow application node types LLM classifier knowledge retrieval
- Alibaba Cloud Model Studio agent application tool calling function calling docs
- Alibaba Cloud AgentRun Flow agent canvas node types low-code orchestration
- Alibaba Cloud Model Studio application evaluation observability docs
- Alibaba Cloud Chat App Message Service supported channels WhatsApp LINE Zalo Viber regions
- Chat App Message Service pricing Alibaba Cloud WhatsApp message fee service fee
- The Register Alibaba Cloud DualLane support ticket AI paper details
- Alibaba Cloud Voice Service international SIP trunking DID outbound calls regions
- Model Studio workflow application nodes list start large model knowledge base script classifier parameter extractor
- Alibaba Cloud AgentRun supported regions endpoint Singapore ap-southeast-1
- Alibaba Cloud AgentRun pricing billing
- Alibaba Cloud AgentBay regions supported international
- DualLane fast reliable LLM agents interactive AIOps dual-path arxiv
- Alibaba Cloud Model Studio Singapore region supported features service deployment scope International
- Chat App Message Service inbound webhook two-way conversation WhatsApp Alibaba Cloud
- Model Studio qwen-flash price Singapore USD 1M tokens tiered
- Anthropic building effective agents routing parallelization orchestrator-workers evaluator-optimizer definitions
- OpenAI practical guide building agents guardrails relevance classifier safety classifier human intervention
- LangChain human in the loop agent design patterns documentation
- Google agents whitepaper 2025 agent design patterns routing
- Model Studio qwen-plus Singapore price per 1M tokens input output International scope
- qwen-vl-ocr Model Studio OCR document extraction price Singapore
- Model Studio knowledge base restriction April 21 2025 Singapore created applications
- Alibaba Cloud AI Gateway Higress cloud-native API gateway model routing guardrails international
- Model Studio qwen3-vl-plus price Singapore vision model
- Model Studio document parsing qwen-long price Singapore
- Alibaba Cloud Model Studio prompt engineering structured output JSON schema
- Alibaba Cloud Model Studio context cache pricing
- Moffatt v Air Canada chatbot tribunal ruling damages
- DPD chatbot swearing poem incident AI guardrails
- New York City MyCity chatbot illegal advice investigation
- Chevrolet dealership chatbot $1 car prompt injection
- call recording consent two-party states AI voice agent disclosure requirement
- WhatsApp Business Platform 24 hour customer service window rules automation policy
- UNESCO guidance generative AI education research 2023 recommendations
- Squirrel AI adaptive learning China results published
- AgentRun Singapore region GA AgentRun AI Studio no-code agent builder Alibaba Cloud international
- Model Studio Qwen-Omni-Realtime pricing Singapore per 1M tokens audio
- Alibaba Cloud Model Studio context cache hit price 10% input tokens
- Alibaba Cloud OpenSearch industry algorithm edition e-commerce international regions
- Trip.com Ctrip AI gateway Higress Alibaba Cloud case study blog 602498
- Alibaba Cloud education case study international AI tutoring Qwen school
- Alibaba Cloud retail solution Qwen shopping assistant Taobao page
- Alibaba Cloud AIRec regions availability Singapore international
- Klarna AI assistant press release 2.3 million conversations $40 million profit improvement
- aboutamazon Rufus 60% more likely to complete purchase official
- Oreopoulos Khanmigo two-year school experiment NBER results findings no significant
- Alibaba Cloud Wuying AI Tutor Qwen education blog 601591
- Korea PIPA automated decision making Article 37-2 right to refuse AI
- PIPC guidelines generative AI personal information Korea anonymization
- Singapore Model AI Governance Framework Generative AI IMDA PDPC 2024
- Alibaba Cloud AgentRun supported regions list
- AgentRun supported regions Singapore ap-southeast-1 international alibabacloud help
- PDPC Advisory Guidelines Use of Personal Data in Generative AI July 2026
- IMDA Model AI Governance Framework Agentic AI January 2026 contents
- Korea AI Basic Act Framework Act on Development of Artificial Intelligence effective January 2026 obligations
- Japan AI Promotion Act 2025 obligations business operators
- Indonesia PDP Law AI personal data 2024 enforcement
- Malaysia AI governance guidelines personal data protection act 2024 AI
- EU AI Act prohibited practices customer service emotion recognition workplace
- Model Studio model pricing Singapore qwen3.8-flash $0.15 input $0.47 output
- Model Studio pricing gte-rerank-v2 Singapore per 1M tokens
- Alibaba Cloud AI Guardrails pricing regions international Content Moderation
- Model Studio qwen3-asr-flash price per second Singapore International
- "Cloud Contact Center" site:alibabacloud.com product
- Alibaba Cloud AI assistant support ticket console generative AI
- Accio Alibaba 2 million users 9 months AI sourcing agent press release
- Alibaba Cloud Qwen SEA-LION AI Singapore multilingual Southeast Asia languages
- Alibaba Cloud international Voice Service voice notification verification code SIP trunking outside Mainland China regions
- Alibaba Cloud Wuying AI Tutor Qwen education features blog
- Anthropic contextual retrieval RAG reranking accuracy improvement
- Alibaba Cloud Model Studio knowledge base hybrid search rerank chunking settings
- PolyAI benchmark voice AI resolution rate report 2025 relative resolution CSAT
- Alibaba Cloud AgentLoop evaluation LLM-as-a-judge agent evaluation docs
- voice agent barge-in interruption handling design best practices vendor engineering
- outbound AI voice agent compliance TCPA consent requirements 2025
- Alibaba Cloud Voice Service international regions stopped voice notification verification code outside Chinese mainland
- Alibaba Cloud international SIP trunking product voice number DID inbound outbound Thailand
- Qwen-Omni-Realtime Model Studio Singapore region supported full-duplex WebRTC WebSocket
- Tablestore Knowledge Storage Service serverless RAG Alibaba Cloud regions
- AgentRun knowledge base integration guide Alibaba Cloud retrieval document
- Alibaba Cloud Model Studio application scenarios customer service use cases official
- AWS Well-Architected generative AI lens customer service agent design
- Intercom Fin email agent triage draft reply human review workflow
- Tablestore Knowledge Storage Memory Storage supported regions Singapore ap-southeast-1
- Korea AI Basic Act generative AI transparency notification obligation user January 2026 detail
- Trip.com TripGenie AI assistant statistics users conversion 2025
- Alibaba Cloud AIRec uplift CTR conversion published results case study
- travel booking AI agent architecture multi-agent flight hotel search book confirm human approval reference architecture
- AWS Bedrock travel concierge agent example architecture
- Google ADK travel planning multi-agent sample
- AI tutor safeguarding minors child safety chatbot requirements regulation
- Alibaba Cloud Model Studio regions endpoints Singapore Virginia Frankfurt Tokyo Hong Kong list
- Alibaba Cloud Model Studio fine-tuning supported regions Singapore Beijing
- cost per contact AI versus human agent support primary source benchmark 2025 2026
- Alibaba Cloud AIRec supported regions international Singapore
- Zendesk CX Trends 2026 customers want human agent escalation statistics
- Alibaba Cloud Intelligent Speech Interaction international availability regions
- Alibaba Cloud PAI EAS model deployment regions Singapore
- Alibaba Cloud Sensitive Data Discovery data security center PII masking regions
- alibabacloud.com model-studio qwen-plus model info price Singapore International per 1M tokens
- alibabacloud.com model pricing qwen3-asr-flash realtime per second International Singapore
- alibabacloud.com model-studio qwen3.8-plus price Singapore
- alibabacloud.com model pricing text-embedding-v4 gte-rerank-v2 International Singapore
- alibabacloud.com Intelligent Speech Interaction regions and domain names Singapore
- Alibaba Cloud Data Security Center supported regions Singapore international
- Alibaba Cloud for Retail solution page Qwen shopping assistant AIRec OpenSearch
- Alibaba Cloud Object Storage Service OSS regions Singapore pricing agent
- alibabacloud.com help model-studio qwen3-8-flash model info price Singapore input output
- alibabacloud.com AI Guardrails Content Moderation supported regions Singapore
- alibabacloud.com model-studio new free quota 1 million tokens 90 days Singapore validity
- alibabacloud.com model-studio qwen3-vl-plus model info price Singapore
- Alibaba Cloud Model Studio application orchestration multi-agent docs international
- Alibaba Cloud Function Compute Agent Sandbox regions Singapore code interpreter browser
- Alibaba Cloud RocketMQ EventBridge trigger email inbound webhook agent
- Alibaba Cloud DirectMail email sending service international regions
- Model Studio night hours off-peak pricing discount 22:00 08:00 UTC+8 qwen
- qwen3.8-max price $1.65 $4.95 Model Studio Singapore off-peak
- Alibaba Cloud Model Studio application Singapore April 21 2025 restriction change 2026
- Alibaba Cloud AgentLoop Singapore region availability 2026
- Alibaba Cloud AI Search Open Platform Singapore region 2026
- Alibaba Cloud Model Studio knowledge base new accounts 2026 international restriction lifted
- Alibaba Cloud Model Studio PrivateLink regions Beijing Hong Kong
- Alibaba Cloud AgentCore product overview supported regions Singapore Beijing
- "qwen3.8-max" Model Studio busy hours idle hours price 1.65 4.95 Singapore
- AgentCore supported regions "Singapore" ap-southeast-1 Alibaba Cloud agentcore-product-overview
- Alibaba Cloud Model Studio peak off-peak pricing busy hours idle hours which models
- qwen3.8-max pricing $2 input $6 output Singapore Model Studio November 2026
- Alibaba Cloud AgentRun pricing billing serverless CU agent runtime cost
- Alibaba Cloud Function Compute pricing Singapore CU per hour vCPU GB second
- Alibaba Cloud AnalyticDB PostgreSQL serverless pricing Singapore
- Alibaba Cloud Hologres pricing Singapore instance
- Fin AI Agent email channel resolution rate Intercom published
- Decagon voice AI agent case study resolution rate published
- PolyAI PG&E case study voice agent results 2025
- airline hotel AI chatbot published customer service results 2025 case study official
- Alibaba Cloud agentic AI ecosystem May 2026 Singapore press release AgentRun AgentCore AgentBay availability regions
- Alibaba Cloud Model Studio application alternative new international accounts AgentRun AI Studio 2026
- Alibaba Cloud Qwen App international availability Singapore
- Alibaba Cloud AI Search Open Platform Frankfurt region only international 2026
- Alibaba Cloud AIRec supported regions international Singapore availability
- Alibaba Cloud OpenSearch supported regions international Singapore
- Alibaba Cloud Qwen Cloud launch Singapore May 2026 what is it agents
- AWS Well-Architected Agentic AI Lens pillars design principles
- Lyft AI assistant 87% drop resolution time official
- Verizon ING United Airlines generative AI customer service results econsultancy
- Forrester Total Economic Impact PolyAI 391% ROI
- customer service AI agent hallucination refund policy guardrail accuracy threshold published guidance
- Chat App Message Service supported channels LINE Zalo Viber inbound messages regions Alibaba Cloud international
- Alibaba Cloud AgentRun billing pricing page international
- Model Studio agent orchestration application multi-agent Alibaba Cloud docs
- Alibaba Cloud Chat App Message Service supported regions Singapore

## Sources returned by search (1756)

- https://www.alibabacloud.com/help/en/model-studio/single-agent-application
- https://www.alibabacloud.com/help/en/model-studio/application-introduction
- https://www.alibabacloud.com/help/en/model-studio/regions
- https://www.alibabacloud.com/blog/alibaba-cloud-launches-%E2%80%9Cmodel-studio-exclusive%E2%80%9D-at-indonesia-ai-conference-2025_602465
- https://www.alibabacloud.com/blog/setting-up-an-ai-chatbot-for-marketing-automation-with-alibaba-cloud-model-studio_603115
- https://www.alibabacloud.com/help/en/model-studio/new-free-quota
- https://technologymagazine.com/news/alibabas-model-studio-powers-trusted-ai-in-private-clouds
- https://www.alibabacloud.com/
- https://help.aliyun.com/en/model-studio/what-is-model-studio
- https://www.alizila.com/alibaba-cloud-announced-the-latest-ai-models-tools-and-infrastructure-available-to-drive-more-efficient-global-ai-community/
- https://aistudio.google.com/welcome
- https://studio.youtube.com/
- https://studio.com/
- https://www.studiotheatre.org/
- https://libeskind.com/
- https://yourstudio.com/
- https://studioforcreativeinquiry.org/
- https://www.unstudio.com/
- https://www.instagram.com/ruby_marylennox/?hl=en
- https://studio.x.com/
- https://www.anthropic.com/research/building-effective-agents
- https://resources.anthropic.com/hubfs/Building%20Effective%20AI%20Agents-%20Architecture%20Patterns%20and%20Implementation%20Frameworks.pdf
- https://www.linkedin.com/posts/sytaylor_this-breakdown-of-building-ai-agents-is-a-activity-7462089606201593856-T0m-
- https://www.anthropic.com/research/multi-agent-research-system
- https://pub.towardsai.net/agent-workflow-patterns-beyond-anthropics-playbook-1bd76a48d63d
- https://www.reddit.com/r/ClaudeAI/comments/1hiww4y/i_just_read_anthropics_blog_on_building_effective/
- https://github.com/machinedge/building-effective-agents/blob/main/building-effective-agents.md
- https://resources.anthropic.com/building-effective-ai-agents
- https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf
- https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/
- https://www.reddit.com/r/AI_Agents/comments/1k590pq/a_practical_guide_to_building_agents/
- https://github.com/AniruddhaChattopadhyay/Books/blob/main/6.openAI%20guide%20to%20building%20practical%20agents.pdf
- https://medium.com/@charly-wargnier/this-34-page-guide-from-openai-is-the-best-resource-on-ai-agents-yet-15838e785fd2
- https://news.ycombinator.com/item?id=44181700
- https://www.youtube.com/watch?v=0tvsX3BacZY
- https://richturrin.substack.com/p/openai-a-practical-guide-to-building
- https://www.scribd.com/document/1002437397/OpenAI-a-Practical-Guide-to-Building-Agents-1750270540
- https://www.skool.com/ai-automation-society/openais-free-practical-guide-to-building-agents
- https://www.alibabacloud.com/blog/enterprise-call-center-on-the-cloud_597450
- https://www.alibabacloud.com/en/campaign/mnc-overview?_p_lc=1
- https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-privacy-policy
- https://next.api.alibabacloud.com/product/CCC
- https://help.aliyun.com/en/sdk/contact-us
- https://www.alibabacloud.com/en/press-room?_p_lc=1
- https://www.alibabagroup.com/about-alibaba-businesses-1747835448811585536
- https://alibaba-cloud.pissedconsumer.com/customer-service.html
- https://www.alibabacloud.com/en/customers?_p_lc=1
- https://www.alibabacloud.com/blog/alibaba-cloud-customer-service-agent-thoughts-design-and-practices-from-concept-to-implementation_601555
- https://aibusiness.com/ml/the-alibaba-challenge-how-to-effectively-engage-with-a-billion-customers-
- https://www.alibabacloud.com/blog/how-ai-agents-integrate-with-cloud-computing_602577
- https://www.zenml.io/llmops-database/building-a-data-centric-multi-agent-platform-for-enterprise-ai
- https://www.alibabacloud.com/en/press-room/alibaba-cloud-unveil-advanced-agentic-ai-ecosystem?_p_lc=1
- https://www.linkedin.com/pulse/alibabas-ai-transformation-case-study-from-china-wee-kiat-lau-wacrc
- https://cobbai.com/blog/ai-in-customer-service-case-studies
- https://aiexpert.network/ai-at-alibaba/
- https://www.alibabacloud.com/help/en/model-studio/models
- https://www.spheron.network/blog/qwen-api-pricing-vs-self-hosted-llms-cost-privacy-2026/
- https://models.litellm.ai/providers/dashscope
- https://en.wikipedia.org/wiki/Qwen
- https://techjacksolutions.com/ai-tools/qwen/qwen-pricing/
- https://www.reddit.com/r/Qwen_AI/comments/1slf03s/qwen_coding_plan/
- https://benchlm.ai/alibaba/api-pricing
- https://try-qwen-ai.com/pricing/
- https://x.com/Alibaba_Qwen/status/2024136381308805564?lang=en
- https://www.eesel.ai/blog/qwen-pricing
- https://www.alibabacloud.com/help/en/model-studio/non-realtime-speech-recognition-user-guide
- https://help.aliyun.com/en/model-studio/realtime-tts-user-guide
- https://alibaba-cloud.medium.com/developing-multimodal-services-using-qwen-and-model-studio-ab9eb3b91459
- https://www.alibabacloud.com/en/solutions/generative-ai/qwen?_p_lc=1
- https://arxiv.org/html/2505.17589v2
- https://qwen.ai/blog?id=qwen-vl
- https://runware.ai/creators/alibaba
- https://qwen.readthedocs.io/en/stable/getting_started/concepts.html
- https://www.youtube.com/watch?v=oFerD0aKHns
- https://www.alibabacloud.com/help/en/model-studio/model-pricing
- https://www.alibabacloud.com/help/en/model-studio/embedding-rerank-model/
- https://www.alibabacloud.com/help/en/model-studio/embedding
- https://help.aliyun.com/en/model-studio/embedding-rerank-model/
- https://www.alibabacloud.com/help/en/model-studio/text-embedding-v4
- https://www.alibabacloud.com/help/en/model-studio/text-embedding-synchronous-api
- https://www.alibabacloud.com/blog/mastering-text-embedding-and-reranker-with-qwen3_602308
- https://help.aliyun.com/en/model-studio/text-embedding-v4
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/model-list-embedding-reranking
- https://www.alibabacloud.com/help/en/agentrun/what-is-agentrun
- https://www.alibabacloud.com/blog/giving-your-ai-agent-a-disposable-workspace-with-alibaba-cloud-agentrun_603324
- https://www.alibabacloud.com/help/en/agentrun/start-using/
- https://help.aliyun.com/en/agentrun/aio-sandbox-1
- https://api.alibabacloud.com/api/AgentRun/2025-09-10
- https://www.alibabacloud.com/blog/what-does-alibaba-clouds-agent-infra-look-like_603177
- https://www.alibabacloud.com/help/en/agentrun/api-agentrun-2025-09-10-struct-agentruntime
- https://www.alibabacloud.com/blog/602608
- https://rpabotsworld.com/alibaba-cloud-agent-native-cloud-agentrun-agentloop-agentteams-guide/
- https://github.com/Serverless-Devs/agentrun-sdk-nodejs
- https://www.alibabacloud.com/help/en/agentbay/developer-reference/all-in-one-sandbox
- https://www.alibabacloud.com/help/en/agentbay/product-overview/what-is-eds-agentbay
- https://arxiv.org/html/2512.04367v1
- https://github.com/agentbay-ai/wuying-agentbay-sdk
- https://www.alibabacloud.com/en/product/agentbay?_p_lc=1
- https://www.alibabacloud.com/help/en/agentbay/use-sdk-for-quick-access
- https://www.digitalapplied.com/blog/alibaba-opensandbox-open-source-ai-agent-execution
- https://www.alibabacloud.com/help/en/agent-sandbox/product-overview/agent-sandbox-overview
- https://northflank.com/blog/alibaba-opensandbox-architecture-use-cases
- https://www.alibabacloud.com/blog/unlock-the-future-of-automation-introducing-alibaba-cloud-agentbay_602649
- https://www.alibabacloud.com/blog/601555
- https://www.alibabacloud.com/blog/603177
- https://www.alibabacloud.com/blog
- https://www.alibabacloud.com/blog/602227
- https://www.facebook.com/AlibabaCloudSEA/posts/consider-a-customer-service-workflow-an-agent-checks-a-delivery-status-and-draft/1145397018054863/
- https://www.alibabacloud.com/blog/development-trends-and-open-source-technology-practices-of-ai-agents_602037
- https://www.sitepoint.com/community/t/alibaba-cloud-architecture-devops-tips/307989
- https://www.alibabacloud.com/blog/from-models-to-agents-how-alibaba-cloud-qwen-is-reshaping-workplace-collaboration_603518
- https://x.com/alibaba_cloud/status/2116039001698189664
- https://resource.alibabacloud.com/webinar/detail.html?id=1409
- https://www.alibabacloud.com/help/en/open-search/search-platform/getting-started/ai-getting-started
- https://www.alibabacloud.com/en/press-room/alibaba-cloud-expands-global-infrastructure-and-ai?_p_lc=1
- https://www.alibabacloud.com/help/en/open-search/search-platform/user-guide/get-service-call-address
- https://www.alibabacloud.com/en/global-locations?_p_lc=1
- https://pytorch.org/blog/alibaba-cloud-ant-group-cambricon-and-huawei-come-together-in-shanghai-to-advance-the-open-source-ai-stack-at-pytorch-conference-china/
- https://en.wikipedia.org/wiki/Alibaba_Cloud
- https://www.scmp.com/tech/big-tech/article/3368454/alibaba-cloud-set-open-new-data-centres-europe-next-year-overseas-push-speeds
- https://www.facebook.com/euronewsnext/videos/alibabas-ai-push-reaches-deeper-into-europe-with-new-cloud-regions-and-data-cent/1975828543098858/
- https://help.aliyun.com/en/document_detail/40654.html
- https://www.alibabacloud.com/en/press-room/alibaba-cloud-expands-european-footprint-with-two?_p_lc=1
- https://www.alibabacloud.com/en/product/opensearch?_p_lc=1
- https://www.alibabacloud.com/blog/opensearch-a-one-stop-solution-to-easily-integrate-llm-generative-ai-in-your-application_600509
- https://www.alibabacloud.com/blog/build-conversational-search-based-on-opensearch-vector-search-edition-integrated-with-a-large-language-model_600119
- https://www.alibabacloud.com/help/en/open-search/
- https://www.linkedin.com/posts/alibaba-cloud-computing-company_alibaba-cloud-opensearch-activity-7194606679261396992-31GI
- https://www.alibabacloud.com/blog/optimize-intelligent-search-with-alibaba-clouds-opensearchs-versatile-capabilities_601057
- https://help.aliyun.com/en/open-search/search-platform/getting-started/knowledge-base-management
- https://slashdot.org/software/comparison/Alibaba-Cloud-OpenSearch-vs-OpenSearch/
- https://www.alibabacloud.com/help/doc-detail/2666077.html
- https://technologymagazine.com/articles/alibaba-cloud-solution-helping-enterprises-harness-gen-ai
- https://www.alibabacloud.com/blog/building-real-time-ai-applications-with-alibaba-cloud-function-compute-and-event-driven-architecture_603585
- https://www.alibabacloud.com/help/doc-detail/3049290.html
- https://www.alibabacloud.com/help/en/functioncompute/product-overview-fc/
- https://www.alibabacloud.com/blog/building-and-deploying-ai-agents-on-alibaba-cloud-using-pai-and-vector-databases_602227
- https://www.alibabacloud.com/help/en/functioncompute/what-is-function-compute
- https://www.alibabacloud.com/blog/building-enterprise-ai-agents-with-alibaba-cloud_603562
- https://www.alibabacloud.com/blog/designing-multi-agent-enterprise-systems-with-alibaba-cloud_603591
- https://skywork.ai/skypage/en/alibaba-cloud-function-compute/1981253406036295680
- https://www.alibabacloud.com/en/product/function-compute?_p_lc=1
- https://fin.ai/benchmarks
- https://www.intercom.com/help/en/articles/8205718-fin-ai-agent-outcomes
- https://aissist.io/insights/intercom-fin-review
- https://fayedigital.com/blog/fin-ai-agent/
- https://www.intercom.com/blog/videos/the-secret-to-sustaining-75-ai-resolution-rates
- https://www.linkedin.com/posts/medinism_intercoms-ceo-bet-1m-on-their-ai-agent-activity-7350831254201651201-qf4j
- https://www.linkedin.com/posts/kyle-poyar_the-ai-growth-re-acceleration-at-intercom-activity-7342964507259920384-EHPU
- https://www.ibbaka.com/ibbaka-market-blog/comparing-the-value-model-and-pricing-model-of-intercoms-fin-ai-agent
- https://www.getmacha.com/blog/intercom-fin-ai-explained
- https://myaskai.com/blog/my-askai-intercom-fin-ai-agent-comparison-2026
- https://openai.com/index/klarna/
- https://www.klarna.com/international/press/klarna-ai-assistant-handles-two-thirds-of-customer-service-chats-in-its-first-month/
- https://getperspective.ai/blog/klarna-ai-customer-service-replacing-700-agents-conversational-ai-case-study
- https://www.researchgate.net/publication/415898375_Klarna's_AI_Assistant_The_700-Agent_Claim_and_What_It_Measured
- https://www.customerexperiencedive.com/news/klarna-says-ai-agent-work-853-employees/805987/
- https://www.hrgrapevine.com/us/content/article/2024-02-29-klarna-asked-to-be-openais-guinea-pig-now-its-chatbot-does-the-work-of-700-employees
- https://www.usefini.com/blog/klarna-automates-two-thirds-of-customer-service-with-ai-assistant
- https://www.youtube.com/watch?v=v89UE1PbgJw
- https://fin.ai/learn/sierra-ai-pricing
- https://www.cekura.ai/blogs/sierra-ai-pricing
- https://www.assembled.com/page/sierra-ai
- https://cxfoundation.com/news/sierra-ai-customer-service-revenue-engine
- https://www.getmacha.com/blog/sierra-ai-complete-guide
- https://sierra.ai/blog/let-your-customers-shape-your-agents
- https://blog.blazingcdn.com/en-us/sierra-conversational-ai-agents
- https://atlan.com/know/ai-agent/ai-agent-applications/what-is-sierra-ai/
- https://www.youtube.com/shorts/hBVXy7_r7RI
- https://www.lorikeetcx.ai/articles/sierra-ai-pricing-alternatives
- https://www.salesforce.com/news/stories/agentforce-customer-success-stories/
- https://www.accelirate.com/agentforce-case-studies/
- https://www.supportlogic.com/salesforce-case-study/
- https://www.salesforce.com/plus/experience/dreamforce_2025/series/salesforce_on_salesforce_at_dreamforce_2025/episode/episode-s1e39
- https://www.salesforce.com/agentforce/metrics/
- https://www.facebook.com/salesforce/videos/how-salesforce-uses-agentforce-for-customer-support/1278986516483004/
- https://sptechusa.com/blog/salesforce-service-cloud-einstein-for-ai-case-resolution/
- https://rizexlabs.com/salesforce-agentforce-use-cases-examples/
- https://routine-automation.com/case-studies/customer-service-case-prioritization-salesforce-ai/
- https://www.linkedin.com/pulse/agentforce-pay-per-resolution-new-model-ai-customer-service-patnaik-47yme
- https://www.gartner.com/en/newsroom/press-releases/2025-03-05-gartner-predicts-agentic-ai-will-autonomously-resolve-80-percent-of-common-customer-service-issues-without-human-intervention-by-20290
- https://www.gartner.com/en/newsroom/press-releases/2025-06-25-gartner-predicts-over-40-percent-of-agentic-ai-projects-will-be-canceled-by-end-of-2027
- https://www.gartner.com/en/articles/customer-service-ai
- https://www.gartner.com/en/newsroom/press-releases/2025-08-26-gartner-predicts-40-percent-of-enterprise-apps-will-feature-task-specific-ai-agents-by-2026-up-from-less-than-5-percent-in-2025
- https://www.nice.com/blog/future-of-customer-service
- https://www.mavenagi.com/resources/one-year-since-gartners-ai-resolution-prediction
- https://www.linkedin.com/posts/kevinsieck_by-2029-agentic-ai-will-autonomously-resolve-activity-7366113914100539393-rcoW
- https://www.digitalapplied.com/blog/agentic-ai-project-cancellations-gartner-40-percent-2026
- https://www.ibm.com/think/insights/contact-center-automation-trends
- https://www.gartner.com/reviews/market/ai-agents-for-customer-service-and-support
- https://www.zendesk.com/blog/ai/productivity/ai-customer-service-statistics/
- https://www.zendesk.com/blog/customer-service/satisfaction/customer-service-statistics/
- https://www.zendesk.com/service/ai/
- https://www.lorikeetcx.ai/articles/ai-customer-service-statistics
- https://www.articsledge.com/post/ai-customer-service
- https://yourgpt.ai/blog/growth/ai-customer-service-statistics
- https://www.chatbase.co/blog/ai-customer-service-statistics
- https://cxtrends.zendesk.com/
- https://coworker.ai/blog/ai-customer-service-statistics
- https://www.zendesk.com/blog/ai/productivity/ai-resolution-rate/
- https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai
- https://www.mckinsey.com/capabilities/tech-and-ai/our-insights/the-economic-potential-of-generative-ai-the-next-productivity-frontier
- https://www.mckinsey.com/capabilities/tech-and-ai/our-insights/superagency-in-the-workplace-empowering-people-to-unlock-ais-full-potential-at-work
- https://www.mckinsey.com/capabilities/growth-marketing-and-sales/our-insights/new-front-door-to-the-internet-winning-in-the-age-of-ai-search
- https://www.linkedin.com/pulse/ais-2025-reality-widespread-adoption-narrow-impact-high-krishnan-3gope
- https://www.mckinsey.com/capabilities/growth-marketing-and-sales/our-insights/unlocking-the-next-frontier-of-personalized-marketing
- https://www.linkedin.com/posts/eduardo-haros-79444630_according-to-a-2025-mckinsey-study-88-of-activity-7417203970781376513-MV7j
- https://drstorm.substack.com/p/the-state-of-ai-2025-from-mckinseys
- https://iaim.ai/ai-insights/mckinsey-state-of-ai-2025-use-versus-impact/
- https://cli.nylas.com/guides/build-ai-email-triage-agent
- https://jinlow.medium.com/the-inbox-is-a-chain-of-handoffs-how-to-build-an-auditable-ai-email-triage-system-with-n8n-and-0caaf0ffab86
- https://www.articsledge.com/post/ai-email-automation
- https://www.stackai.com/insights/how-to-build-an-email-triage-and-auto-response-agent-on-stackai-(step-by-step-guide)
- https://cloudtech.com/feeds/blog/ai-chatbot-human-handoff
- https://dev.to/qasim157/build-an-email-support-triage-agent-with-its-own-inbox-3c10
- https://arxiv.org/html/2506.14337v1
- https://adamwiggins.com/posts/triage-embedding-classifier/
- https://www.sortd.com/usecases/agents-handoff
- https://www.automationlabz.com/automations/email-triage-classification
- https://www.twilio.com/en-us/blog/developers/best-practices/guide-core-latency-ai-voice-agents
- https://www.daily.co/blog/advice-on-building-voice-ai-in-june-2025/
- https://cresta.com/blog/engineering-for-real-time-voice-agent-latency
- https://decagon.ai/blog/beyond-latency-the-art-of-building-a-truly-great-voice-agent
- https://www.reddit.com/r/VoiceAutomationAI/comments/1wgp1im/i_built_a_voice_ai_agent_with_600ms_latency_heres/
- https://www.google.com/goto?url=CAESmQEB6zswFaZg_BxO2Ebw1dny-CiSXkEAB6Dyc4BCouYXeBQ4Lwh9lx0FmeLOjfEw3Gub-QqlhDT10YsnYJ78rqAU8F4cmGuh6xINDowRKrfRUZelOeGtjcqN06y3ryV-3ICXTGve7jAFC4Pd74ySrsns_t64LW5kuS8uAPco7rQei6JC06VrYDj097m7OhokuVzmZ21_NzuJmVQ
- https://hamming.ai/blog/how-to-optimize-latency-in-voice-agents
- https://www.forasoft.com/blog/article/livekit-ai-agents-guide
- https://www.google.com/goto?url=CAESdAHrOzAVN1Sp5mzR4Fo3lqMfd_FxK19iP4rT1mY5yGzuAu8XjQWGxCUsG743nQ3vNz9RqoSFxpOBLaP9SedFuClaf-S4SJqGijzbf_OGzWMZQAZWtRzpzWr1YP7jhde_lgLp20EeZ8eMGORbO8Ya8QLXxGi-
- https://prodinit.com/blog/production-voice-ai-agents-latency-architecture
- https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0
- https://www.linkedin.com/company/alibaba-cloud-computing-company
- https://www.alibabacloud.com/blog/beebot-alibaba-clouds-intelligent-customer-service-platform_594203
- https://help.aliyun.com/en/aiccs/product-overview/billing/
- https://www.businesswire.com/news/home/20230108005098/en/Alibaba-Cloud-Unveils-Its-First-International-Product-Innovation-Center-and-Partner-Management-Center
- https://www.alibabacloud.com/help/en/model-studio/real-time-speech-recognition-user-guide
- https://www.alibabacloud.com/help/en/model-studio/paraformer-recorded-speech-recognition-restful-api
- https://www.alibabacloud.com/help/en/model-studio/paraformer-real-time-speech-recognition-python-sdk
- https://help.aliyun.com/en/model-studio/android-sdk-for-paraformer-real-time-service
- https://www.alibabacloud.com/help/en/model-studio/model-list-speech-recognition/
- https://www.reddit.com/r/aicuriosity/comments/1nbrynj/qwen3asrflash_alibabas_new_speech_recognition/
- https://www.lecsync.com/blog/lecsync-vs-alibaba-cloud-realtime-asr-api
- https://www.alibabacloud.com/help/en/model-studio/non-realtime-asr-model-apis/
- https://www.modelscope.cn/models/damo/speech_paraformer-large_asr_nat-zh-cn-16k-common-vocab8404-pytorch/summary
- https://www.alibabacloud.com/help/en/model-studio/non-realtime-tts-user-guide
- https://www.alibabacloud.com/help/en/model-studio/realtime-tts-user-guide
- https://github.com/QwenAudio/CosyVoice
- https://www.alibabacloud.com/help/en/model-studio/tts-model
- https://www.reddit.com/r/LocalLLaMA/comments/1pnusp9/alibaba_opensources_cosyvoice_3_a_new_tts_model/
- https://cosyvoice.org/cosyvoice-3
- https://sourceforge.net/software/compare/CosyVoice-vs-Qwen3-TTS/
- https://www.alibabacloud.com/blog/qwen3-tts-family-is-now-open-sourced-voice-design-clone-and-generation_602826
- https://help.aliyun.com/en/isi/user-guide/siso-text-to-speech-synthesis-for-cosyvoice-interface-description
- https://www.facebook.com/alibabacloud/posts/meet-cosyvoice-3-an-open-source-multilingual-speech-synthesis-model-delivering-h/1319870710185018/
- https://www.id.sb-telecom.com/news/how-whatsapp-business-api-helps-indonesia-business-build-strong-customer-relationship-2025/
- https://dataintelo.com/report/whatsapp-business-messaging-platform-market
- https://whatsappbusiness.com/products/business-platform/
- https://www.amraandelma.com/whatsapp-marketing-statistics/
- https://whatsable.app/blog/whatsapp-business-availability-by-region-2026-guide
- https://www.qiscus.com/en/blog/benefit-whatsapp-business-api/
- https://www.sobot.io/blog/10-best-whatsapp-business-api-platforms-customer-service-2026/
- https://www.mordorintelligence.com/industry-reports/conversational-commerce-market
- https://www.useinvent.com/blog/the-usd45b-whatsapp-business-economy-how-to-capture-your-share-2026-guide
- https://www.egrow.com/en/blog/whatsapp-commerce-statistics-2026-the-numbers-every-e-commerce-owner-should-know
- https://developers.line.biz/en/community/
- https://anythingmcp.com/guides/connect-line-messaging-to-claude
- https://cookbook.chat-data.com/docs/line-integration
- https://apis.io/providers/line/
- https://www.infobip.com/line
- https://docs.customer.io/release-notes/2026-03-09-line-messaging/
- https://faqsure.com/blog/line-chatbot-for-business
- https://vocui.com/blog/line-chatbot-for-business
- https://asia.nikkei.com/business/technology/artificial-intelligence/line-aims-to-be-thailand-s-everyday-ai-app-in-key-market
- https://www.linecorp.com/pr/news/global/2023/135
- https://www.infobip.com/kakao-business
- https://help.alcmeon.ai/en_US/kakaotalk/kakaotalk-overview-global
- https://www.justg.com/knowledgebase/312/Build-an-AI-Customer-Service-Bot-for-LINE-or-KakaoTalk-on-a-Tokyo-or-Seoul-VPS.html
- https://www.thelec.net/news/articleView.html?idxno=11367
- https://www.kakaocorp.com/page/service/service/KakaoTalkChannel?lang=ENG
- https://developers.kakao.com/docs/en/kakaotalk-channel/common
- https://help.openai.com/en/articles/12677933-chatgpt-for-kakao-overview-and-kakao-tools
- https://360smsapp.com/salesforce-kakao/
- https://www.kakaocorp.com/page/detail/11725?lang=ENG
- https://www.braze.com/docs/user_guide/channels/kakaotalk/kakaotalk_setup
- https://pipc.go.kr/eng/user/ltn/new/noticeDetail.do?bbsId=BBSMSTR_000000000001&nttId=2784
- https://www.mofo.com/artificial-intelligence/south-korea
- https://securiti.ai/south-korea-personal-information-protection-act/
- https://www.dlapiperdataprotection.com/?t=transfer&c=KR
- https://fpf.org/blog/south-korea-the-first-case-where-the-personal-information-protection-act-was-applied-to-an-ai-system/
- https://www.linkedin.com/pulse/korean-privacy-commissions-guidelines-ai-based-automated-min-fvmnc
- https://practiceguides.chambers.com/practice-guides/comparison/1129/18521/29027-29028-29029-29030-29031
- https://www.lexology.com/library/detail.aspx?g=c280d3c1-d919-49fb-8bc3-3fcb3b54aa62
- https://www.researchgate.net/publication/382653936_Automated_decision-making_in_South_Korea_a_critical_review_of_the_revised_Personal_Information_Protection_Act
- https://regulations.ai/regulations/RAI-KR-NA-SUMMARY-2026
- https://www.alibabacloud.com/blog/what-makes-alibaba-cloud%E2%80%99s-newly-released-agentcore-different_603627
- https://adp.tencentcloud.com/en/blog/build-a-customer-service-ai-agent-in-6-steps
- https://www.reddit.com/r/AI_Agents/comments/1xc217k/are_ai_customer_support_resolution_rates/
- https://www.nexgencloud.com/blog/case-studies/how-ai-and-rag-chatbots-cut-customer-service-costs-by-millions
- https://www.klaviyo.com/blog/ai-customer-service-resolution-rate
- https://www.alibabacloud.com/blog/alibaba-cloud-brings-full-stack-ai-ecosystem-to-global-customers-for-the-agentic-era_603186
- https://www.facebook.com/alibabacloud/posts/how-can-ai-agents-better-understand-your-businessat-apsaraconference2026-yusen-c/1573433671495386/
- https://www.facebook.com/alibabacloud/posts/the-latest-episode-of-ai-spotlight-is-here-this-time-we-explore-qwenwork-interna/1533971848774902/
- https://thepaypers.com/payments/news/alibaba-cloud-launches-agentic-ai-ecosystem-for-global-customers
- https://www.alibabacloud.com/blog/alibaba-cloud-al-agent-security-solution%E2%80%94%E2%80%94security-risks-and-mitigations-for-enterprise-ai-agent-adoption_603175
- https://www.mobileworldlive.com/ai-cloud/alibaba-cloud-expands-agentic-ai-push-to-france/
- https://www.alibabacloud.com/en/press-room/alibaba-unveils-roadmap-on-full-stack-ai-strategy?_p_lc=1
- https://www.alibabagroup.com/document-2016703577908576256
- https://aws.amazon.com/blogs/machine-learning/how-rufus-scales-conversational-shopping-experiences-to-millions-of-amazon-customers-with-amazon-bedrock/
- https://finance.yahoo.com/news/amazon-says-ai-shopping-assistant-152500992.html
- https://www.linkedin.com/posts/patrickjjohnston_ecommerce-aimarketing-productdata-activity-7426659007362424832-uvkc
- https://www.techbuzz.ai/articles/amazon-s-rufus-ai-chatbot-drives-5x-higher-sales-conversion
- https://novadata.io/resources/blog/amazon-rufus-impact-sellers-analytics
- https://www.ecomtent.ai/blog-page/best-amazon-rufus-optimisation-tools
- https://www.azoma.ai/insights/what-percentage-of-amazon-shoppers-use-rufus-2026
- https://www.aboutamazon.com/news/retail/amazon-rufus-ai-assistant-personalized-shopping-features
- https://perpetua.io/blog-alexa-for-shopping-amazon-rufus-the-complete-guide-for-brands-and-sellers/
- https://presenc.ai/research/alexa-for-shopping-statistics-2026
- https://www.alibabacloud.com/en/product/airec?_p_lc=1
- https://www.alibabacloud.com/help/en/airec/airec/product-overview/what-is-airec
- https://www.alibabacloud.com/help/en/airec/
- https://www.alibabacloud.com/blog/ai-powered-recommendation-systems-on-alibaba-cloud_603163
- https://help.aliyun.com/en/airec/product-overview
- https://www.alibabacloud.com/blog/discover-personalized-recommendations-with-alibaba-cloud-airec_601055
- https://www.alibabacloud.com/help/en/airec/airec/getting-started/product-introduction/
- https://emerj.com/artificial-intelligence-at-alibaba/
- https://www.alibabacloud.com/help/en/airec/airec/getting-started/get-started-with-airec
- https://www.trip.com/newsroom/introducing-tripgenie-groundbreaking-ai-travel-assistant/
- https://us.trip.com/tripgenie/
- https://cloud.google.com/customers/tripgenie
- https://www.facebook.com/tripcomgroup/videos/from-questions-to-solutions-how-tripgenie-powers-every-step-of-your-trip-%EF%B8%8Fno-mor/927259713568069/
- https://www.facebook.com/tripcomgroup/posts/three-years-of-tripgenie-how-travellers-around-the-world-are-using-ai-differentl/1613255320307037/
- https://www.phocuswire.com/ai-check-in-tripcom-tripgenie
- https://digitaltravelapac.wbresearch.com/blog/tripgenie-the-future-of-ai-driven-tavel-itineraries
- https://www.linkedin.com/posts/tripcomgroup_follow-us-meet-tripgenie-the-enhanced-activity-7090284693815791616-TNVa
- https://sg.trip.com/ask/questions/tripgenie-trip.com.html
- https://www.googlecloudpresscorner.com/2024-10-24-Klook-Deepens-Partnership-with-Google-Cloud-to-Enhance-Travel-Experiences-and-Supercharge-Developer-Productivity-with-Generative-AI
- https://www.facebook.com/marketingmagazine.group/posts/travel-experience-platform-klook-has-teamed-up-with-googlecloud-to-improve-its-s/989400289888171/
- https://aws.amazon.com/blogs/containers/klook-case-study/
- https://www.linkedin.com/posts/sanjaygupta2021_ai-activity-7320347214520762369-AJ5-
- https://www.frontier-enterprise.com/klook-books-google-cloud-to-harness-generative-ai-for-customers-staff/
- https://www.webintravel.com/klook-leverages-google-cloud-to-enhance-customer-engagement-via-advanced-generative-ai/
- https://softblues.io/case-studies/ai-powered-multi-agent-travel-assistant
- https://www.alibabagroup.com/en-US/ai-governance/success-cases
- https://www.phocuswire.com/klook-google-cloud-ai-infrastructure-partnership-expansion
- https://en.wikipedia.org/wiki/2025
- https://www.aclu.org/project-2025-explained
- https://www.unep.org/en/publications/report/adaptation-gap-report-2025
- https://elsevier.digitalcommonsdata.com/datasets/btchxktzyw/8
- https://www.ndss-symposium.org/ndss2025/
- https://www.youtube.com/watch?v=jbG0LEzn33A
- https://www.oecd.org/en/publications/2026/09/pisa-2025-results-volume-i_5265bfb1.html
- https://www.alzint.org/resource/world-alzheimer-report-2025/
- https://www.youtube.com/watch?v=ZEobLPh82-w
- https://reports.weforum.org/docs/WEF_Global_Risks_Report_2025.pdf
- https://www.alibabacloud.com/blog/case-study-how-alibaba-cloud-supports-online-education_597577
- https://edu.alibabacloud.com/training/aca-generative-ai
- https://www.youtube.com/watch?v=SD4eIqQ1VaY
- https://www.alibabacloud.com/blog/alibabas-cloud-for-youth-wins-education-innovation-award-for-bridging-china%E2%80%99s-rural-digital-divide_602555
- https://eric.ed.gov/?q=AI&ff1=souEducation+and+Information+Technologies&id=EJ1457848
- https://www.facebook.com/dlltours35/posts/-a-great-learning-experience-at-alibaba-group-inspiring-our-students-through-inn/1481073680706404/
- https://www.scribd.com/document/945386676/Alibaba-Cloud-Case-Study
- https://sonar.ch/fernuni/documents/331655
- https://www.pdpc.gov.sg/-/media/files/pdpc/pdf-files/advisory-guidelines/advisory-guidelines-on-the-use-of-personal-data-in-ai-recommendation-and-decision-systems.pdf
- https://www.pdpc.gov.sg/organisations/regulations-decisions/regulatory-guidance/advisory-guidelines-on-use-of-personal-data-in-ai-recommendation-and-decision-systems
- https://www.nortonrosefulbright.com/en/inside-fintech/blog/2024/03/singapore-releases-new-guidelines-on-the-use-of-personal-data-in-ai-systems
- https://aicura.app/frameworks/pdpc-ai-advisory-guidelines/
- https://www.linkedin.com/pulse/advisory-guidelines-use-personal-data-ai-decision-hendro--kmhqc
- https://www.twobirds.com/en/insights/2024/singapore/pdpc-advisory-guidelines-on-the-use-of-personal-data-in-ai-recommendation-and-decision-systems
- https://aipolicytracker.org/policies/singapore-pdpc-ai-advisory-guidelines
- https://regulations.ai/regulations/RAI-SG-NA-AGUPDXX-2024
- https://www.privacyworld.blog/2024/03/singapore-issues-data-privacy-guidelines-for-deterministic-artificial-intelligence-ai/
- https://sgai.md/policies/pdpc-advisory-guidelines-on-use-of-personal-data-in-ai/
- https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act
- https://artificialintelligenceact.eu/transparency-rules-article-50/
- https://artificialintelligenceact.eu/article/50/
- https://www.morganlewis.com/blogs/sourcingatmorganlewis/2026/08/eu-ai-acts-transparency-rules-what-went-into-effect-on-2-august
- https://www.bakerbotts.com/thought-leadership/publications/2026/september/eu-ai-act-article-50-transparency-obligations-go-live
- https://www.openlayer.com/blog/eu-ai-act-transparency-obligations-compliance-guide
- https://labs.cloudsecurityalliance.org/research/csa-research-note-eu-ai-act-article-50-transparency-20260729/
- https://www.facebook.com/CorpCounselMag/posts/the-eu-ai-acts-article-50-guidance-effective-august-2026-expands-compliance-obli/1710432394419598/
- https://www.praxikon.com/en/ai-act/artikel/50
- https://digital-strategy.ec.europa.eu/en/policies/code-practice-ai-generated-content
- https://www.alibabacloud.com/en/product/content-moderation?_p_lc=1
- https://www.alibabacloud.com/help/en/content-moderation
- https://docs.api7.ai/ai-gateway/traffic-controls/guardrails/alibaba-cloud-ai
- https://www.alibabacloud.com/help/en/content-moderation/latest/product-advantages
- https://www.facebook.com/alibabacloud/posts/ai-guardrails-real-time-protection-for-llms-and-ai-agents-%EF%B8%8Fsecurity-is-mandatory/1505252311646856/
- https://help.aliyun.com/en/document_detail/2923687.html
- https://www.alibabacloud.com/help/en/content-moderation/latest/product-overview
- https://www.alibabacloud.com/help/en/content-moderation/latest/what-is-content-moderation
- https://qwen.ai/blog?id=qwen3guard
- https://www.alibabacloud.com/blog/how-alibaba-cloud-protects-ai-usage_602551
- https://www.alibabacloud.com/help/en/model-studio/rag-knowledge-base
- https://www.alibabacloud.com/help/en/model-studio/build-knowledge-base-qa-assistant-without-coding
- https://www.alibabacloud.com/help/en/pai/knowledge-base-management
- https://www.alibabacloud.com/blog/building-a-rag-pipeline-on-alibaba-cloud-with-vector-search_603155
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/rag-knowledge-base-specifications
- https://help.aliyun.com/en/model-studio/faq-about-alibaba-cloud-model-studio
- https://www.alibabacloud.com/help/en/model-studio/faq-about-alibaba-cloud-model-studio
- https://www.youtube.com/watch?v=VKJnpO7MtDQ
- https://freellmapihub.com/p/alibaba-model-studio
- https://cabina.ai/blog/qwen-api-pricing/
- https://www.reddit.com/r/Qwen_AI/comments/1v2khid/anyone_using_alibabaqwens_18_token_plan_daily_how/
- https://www.activepieces.com/blog/qwen-api-pricing-costs-tiers-and-models-2026
- https://www.alibabacloud.com/en/campaign/ai-landing-page-token?_p_lc=1
- https://www.alibabacloud.com/help/en/ack/cloud-native-ai-suite/use-cases/building-customized-ai-question-and-answer-assistant-based-on-dify
- https://www.alibabacloud.com/blog/high-availability-and-performance-best-practices-for-deploying-dify-based-on-ack_601874
- https://www.alibabacloud.com/en/solution/tech-solution-deploy/2870155
- https://www.alibabacloud.com/en/product/kubernetes?_p_lc=1
- https://www.alibabacloud.com/en/solution/tech-solution/rapidly-deploy-dify-to-accelerate-ai-application-development
- https://www.alibabacloud.com/help/en/ack/ack-managed-and-ack-dedicated/user-guide/use-helm-to-simplify-application-deployment/
- https://docs.solace.com/Cloud/Deployment-Considerations/installing-ps-cloud-k8s-ack-specific-req.htm
- https://help.aliyun.com/en/ack/cloud-native-ai-suite/use-cases/update-the-dify-component-in-ack-clusters
- https://www.youtube.com/watch?v=JLdc4D9kAss
- https://alibaba-cloud.medium.com/demystifying-kubernetes-as-a-service-how-alibaba-cloud-manages-tens-of-thousands-of-kubernetes-174fc0a142a2
- https://www.alibabacloud.com/en/product/hybriddb-postgresql?_p_lc=1
- https://www.alibabacloud.com/help/en/analyticdb/analyticdb-for-postgresql/openapi-based-rag-applications-1
- https://www.alibabacloud.com/help/en/analyticdb/analyticdb-for-postgresql/user-guide/use-the-graphrag-service
- https://www.alibabacloud.com/blog/600692
- https://www.alibabacloud.com/en/solutions/generative-ai/rag?_p_lc=1
- https://www.alibabacloud.com/blog/building-a-retrieval-augmented-generation-rag-service-on-compute-nest-with-alibaba-cloud-model-studio-and-analyticdb-for-postgresql_601412
- https://www.vldb.org/pvldb/vol18/p5139-zhou.pdf
- https://help.aliyun.com/en/analyticdb/vector-analysis-overview
- https://www.alibabacloud.com/en/product/analyticdb?_p_lc=1
- https://www.alibabacloud.com/blog/analyticdb-for-postgresql-%2B-llm-building-the-enterprise-specific-chatbot-in-the-generative-ai-era_600111
- https://www.alibabacloud.com/help/en/agentloop/agentloop-quickstart-whole-process-practice
- https://www.alibabacloud.com/help/en/cms/cloudmonitor-2-0/what-is-an-agentloop
- https://www.facebook.com/alibabacloud/posts/stuck-in-manual-agent-evals-alibaba-cloud-agentloop-builds-a-self-evolution-flyw/1469778651860889/
- https://www.alibabacloud.com/blog/what-is-the-newly-released-agentloop-by-alibaba-cloud_603378
- https://help.aliyun.com/en/cms/cloudmonitor-2-0/agentloop-overview
- https://www.linkedin.com/posts/alibabacloudglobal_agentloop-llmops-aiagents-activity-7485499098033319937-sD0l
- https://www.alibabacloud.com/help/en/agentloop/user-guide/agent-space
- https://baike.baidu.com/en/item/Alibaba%20Cloud%20Global%20Infrastructure/5164732
- https://www.alibabacloud.com/help/en/agentloop/product-overview/server-launch-regions-of-agentloop
- https://www.alibabacloud.com/en/product/agentcore?_p_lc=1
- https://www.alibabacloud.com/help/en/agentcore/agentcore-product-overview
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/govern
- https://www.nexusai-tech.com/ai-insights/alibaba-agentcore-unifies-multi-model-agents-mcp-governance
- https://aws.amazon.com/blogs/machine-learning/govern-ai-agent-tool-access-with-amazon-bedrock-agentcore-gateway/
- https://www.gate.com/news/detail/alibaba-cloud-releases-agentcore-enterprise-agent-platform-24487800
- https://www.lyzr.ai/blog/platforms-for-governing-multi-agent-architectures/
- https://www.alibabacloud.com/blog/qwen3guard-real-time-safety-for-your-token-stream_602582
- https://therouter.ai/news/qwen3guard-streaming-safety-guardrail-open-source/
- https://arxiv.org/html/2510.14276v1
- https://www.linkedin.com/posts/alibaba-cloud-computing-company_alibabacloud-cybersecurity-security-activity-7492780818201817088-MkN6
- https://ai.onlinezone.com.ua/en/blog/qwen3guard-real-time-ai-content-safety
- https://docs.mozilla.ai/any-guardrail/api-reference/index/content-safety/qwen3-guard-stream
- https://redeep.blog/posts/qwen3-guard/
- https://www.alibabacloud.com/help/en/model-studio/realtime
- https://github.com/QwenLM/Qwen3-Omni
- https://qwen.ai/blog?id=qwen3.5-omni
- https://www.reddit.com/r/LocalLLaMA/comments/1nntdok/qwen3omni_looks_insane/
- https://www.therundown.ai/tools/qwen3-5-omni
- https://arxiv.org/html/2509.17765v1
- https://www.reddit.com/r/LocalLLaMA/comments/1nbqa1p/qwen_released_api_only_qwen3asr_the_allinone/
- https://medium.com/data-science-in-your-pocket/qwen3-omni-one-llm-for-text-images-audio-and-videos-aad51ea1a4e3
- https://www.youtube.com/watch?v=CWSYLPJz8j0&vl=en
- https://www.facebook.com/fb-answers/alibaba-cloud-model-studio-pricing-per-model-token-cost/
- https://poly.ai/blog/call-deflection
- https://www.cloudtalk.io/blog/best-voice-ai-agents-for-call-deflection/
- https://www.reddit.com/r/SaaS/comments/1sshmo3/we_built_a_customer_support_ai_with_395/
- https://poly.ai/blog/8-metrics-you-must-know-to-evaluate-the-impact-of-call-center-voice-ai
- https://www.retellai.com/blog/call-deflection
- https://www.balto.ai/blog/call-deflection-rate/
- https://www.teneo.ai/blog/call-deflection-vs-resolution
- https://parallellabs.app/poly-ai-review-4/
- https://www.gladly.ai/glossary/deflection-rate/
- https://www.linkedin.com/posts/nikola-mrksic_we-deflected-70-of-all-contact-that-activity-7459683757642588160-b7wq
- https://cresta.com/guides/best-parloa-alternatives
- https://www.parloa.com/knowledge-hub/ai-voice-agents-for-retail/
- https://cresta.com/ai-agent
- https://www.youtube.com/watch?v=Es2DBepRfMA
- https://www.parloa.com/knowledge-hub/ai-virtual-agents/
- https://getperspective.ai/blog/best-ai-voice-agents-customer-conversations-2026-10-platforms-ranked
- https://www.eesel.ai/blog/parloa-vs-cresta
- https://cresta.com/videos/introducing-conversation-intelligence-for-ai-agents
- https://cresta.com/guides/best-ai-voice-agents-customer-service
- https://www.reddit.com/r/AIReceptionists/comments/1xi3q58/which_cresta_ai_agent_use_cases_deliver_the_most/
- https://www.linkedin.com/pulse/what-i-found-compelling-new-randomized-trial-khan-academy-sal-khan-gaume
- https://www.socialscienceregistry.org/trials/13519
- https://www.researchgate.net/publication/396808798_Leveraging_Khanmigo_Generative_AI-Powered_Tool_for_Personalized_Tutoring_to_Learn_Scientific_Concepts
- https://blog.khanacademy.org/what-a-randomized-control-trial-in-uttar-pradesh-india-teaches-us-about-improving-math-learning-with-khan-academy/
- https://edworkingpapers.com/sites/default/files/ai26-1551.pdf
- https://www.buildmvpfast.com/blog/ai-tutoring-khanmigo-case-study-2026
- https://eric.ed.gov/?id=EJ1487444
- https://jtl.uwindsor.ca/index.php/jtl/article/view/10052
- https://scale.stanford.edu/ai/repository/one-click-away-ai-tutoring-khanmigo-two-year-school-experiment
- https://www.nber.org/system/files/working_papers/w35620/w35620.pdf?ref=2ndbreakfast.audreywatters.com
- https://www.duolingo.com/help/what-is-duolingo-max
- https://www.facebook.com/groups/duolingo.all.languages/posts/1585288062799457/
- https://www.reddit.com/r/duolingo/comments/1jukvxa/is_the_video_call_thing_with_real_people_or_ai/
- https://blog.duolingo.com/video-call/
- https://theowlandme.blog/2026/01/10/review-duolingo-max-video-calls/
- https://blog.duolingo.com/duolingo-max/
- https://www.linkedin.com/posts/gianlucamauro_soduolingo-took-a-beating-these-are-their-activity-7392249625010745344-rZDj
- https://www.facebook.com/bloombergbusiness/posts/meet-lily-duolingos-new-ai-video-chatbot-that-can-have-real-time-conversations-w/949458117040282/
- https://chiefaiofficer.com/duolingos-ai-strategy-fuels-51-user-growth-and-1b-revenue/
- https://practiceme.app/vs/duolingo-max
- https://www.alibabacloud.com/blog/alibaba-cloud-expands-global-infrastructure-and-ai-portfolio-to-accelerate-enterprise-ai-adoption_603594
- https://www.alibabacloud.com/en/press-room/alibaba-cloud-launch-first-cloud-region-in-brazil?_p_lc=1
- https://www.facebook.com/DotDailyDose/posts/alibaba-cloud-the-digital-technology-and-intelligence-backbone-of-alibaba-group-/1241009264709758/
- https://www.fierce-network.com/newswire/alibaba-cloud-beefs-its-presence-europe-apac-middle-east
- https://www.revesoft.com/blog/cloud-telephony/cloud-contact-center-providers/
- https://www.alibabacloud.com/blog/cloud-use-when-agents-start-using-the-cloud-for-real_603634
- https://www.alibabacloud.com/blog/603239
- https://www.alibabacloud.com/blog/ride-the-ai-lift-alibaba-cloud-cios-insights-into-results-as-a-service-raas_602533
- https://www.alibabacloud.com/help/en/pai/use-cases/llm-based-intent-recognition-solution
- https://dialzara.com/blog/ai-intent-recognition-for-customer-satisfaction
- https://help.aliyun.com/en/aiccs/product-overview/what-is-artificial-intelligence-cloud-call-service
- https://kayako.com/blog/ai-in-customer-service/
- https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing
- https://whatsappbusiness.com/products/platform-pricing/
- https://www.reddit.com/r/WhatsappBusinessAPI/comments/1ump3y1/pricing_updates_on_the_whatsapp_business_platform/
- https://sleekflow.io/en-us/blog/whatsapp-business-price
- https://www.engagelab.com/blog/whatsapp-api-pricing
- https://www.cm.com/blog/whatsapp-business-platform-pricing/
- https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/non-template-messages
- https://respond.io/blog/whatsapp-business-api-pricing
- https://www.youtube.com/watch?v=6g7gip-fKP4
- https://help.zoho.com/portal/en/community/topic/whatsapp-message-pricing-changes-effective-july-1-2025
- https://www.sysdig.com/learn-cloud-native/prompt-injection
- https://www.microsoft.com/en-us/security/blog/2026/03/12/detecting-analyzing-prompt-abuse-in-ai-tools/
- https://www.immersivelabs.com/resources/c7-blog/weaponizing-llms-bypassing-email-security-products-via-indirect-prompt-injection
- https://www.facebook.com/groups/aifire.co/posts/1739318516673450/
- https://arxiv.org/html/2603.21642v1
- https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html
- https://www.kuppingercole.com/blog/gardiner/when-ai-agents-read-your-email
- https://www.reddit.com/r/aiagents/comments/1spsidw/how_do_you_protect_autonomous_agents_that_read/
- https://www.mdpi.com/2078-2489/17/1/54
- https://cetas.turing.ac.uk/publications/indirect-prompt-injection-generative-ais-greatest-security-flaw
- https://www.facebook.com/alibabacloud/posts/turning-ai-into-tangible-business-value-across-southeast-asiaat-apsaraconference/1575508017954618/
- https://www.alibabacloud.com/en/press-room/alibaba-qwen-powers-ai-singapore-latest-llm?_p_lc=1
- https://www.facebook.com/alibabagroupofficial/videos/ai-is-moving-from-possibility-to-priority-across-asias-businesses-a-new-alibaba-/1973529013325648/
- https://www.quora.com/What-are-the-chances-that-Qwen-Alibabas-AI-assistant-could-help-Alibaba-dominate-Chinas-next-generation-digital-gateway
- https://jdi.group/from-qwen-to-qwenwork-alibaba-clouds-vision-for-ai-driven-business-in-vietnam/
- https://www.alibabacloud.com/solutions/retail
- https://www.facebook.com/RetailAsiaMagazine/videos/taobao-just-turned-shopping-travel-payments-into-one-ai-screen-with-qwen-taobao-/1437432558113168/
- https://www.alizila.com/alibaba-and-sap-expand-strategic-partnership-to-bring-ai-powered-enterprise-solutions-to-china-and-global-markets/
- https://www.alibabacloud.com/en/customers/lazada?_p_lc=1
- https://www.linkedin.com/posts/minhyeyoon_ai-in-customer-service-a-double-edged-activity-7379001009043329024-Iurf
- https://www.facebook.com/mysoyacincau/posts/lazadas-focusing-on-improving-their-customer-experience-learning-from-their-coun/942623785890659/
- https://www.researchgate.net/publication/388942412_The_Effect_of_Chatbot_Usage_on_Customer_Satisfaction_A_Quantitative_Study_of_Shopee_Tokopedia_and_Lazada_Using_SmartPLS
- https://www.crescendo.ai/blog/automated-customer-service-examples
- https://www.codica.com/blog/top-artificial-intelligence-examples/
- https://www.facebook.com/alibabacloud/posts/ready-to-hack-the-future-of-travel-%EF%B8%8Fthe-alibaba-cloud-x-atlas-agentic-ai-hackath/1499801188858635/
- https://www.ottotheagent.com/blog/hotel-ai-booking-systems-case-studies
- https://www.alibabacloud.com/blog/ai-training-models-in-action-real-use-cases-across-key-industries_602556
- https://www.altexsoft.com/blog/data-science-and-ai-in-the-travel-industry-9-real-life-use-cases/
- https://www.quora.com/What-are-some-interesting-use-cases-of-generative-AI-in-the-travel-industry
- https://coaxsoft.com/blog/ai-and-machine-learning-in-travel
- https://aws.amazon.com/travel-and-hospitality/artificial-intelligence/
- https://www.alibabacloud.com/help/en/model-studio/qwen-audio-3-1-tts-plus
- https://www.alibabacloud.com/help/en/model-studio/cosyvoice-v3-plus
- https://help.aliyun.com/en/model-studio/qwen-audio-3-1-tts-plus
- https://www.alibabacloud.com/blog/model-studio-token-plan-for-individual-one-subscription-for-every-ai-model-up-to-3x-more-value_603426
- https://apimart.ai/blog/qwen-audio-3-0-tts-api-guide-pricing-voice-controls
- https://www.alibabacloud.com/help/en/model-studio/qwen-audio-3-0-tts-plus
- https://www.developersdigest.tech/models/speech/alibaba
- https://www.alibabacloud.com/help/en/model-studio/speech-synthesis/
- https://www.alibabacloud.com/help/en/model-studio/asr-model
- https://help.aliyun.com/en/model-studio/qwen3-asr-flash
- https://cloudprice.net/models/alibaba-qwen3-asr-flash-realtime
- https://marketplace.alibabacloud.com/doc/blog/detail/mplace-sgcmgj00035096.html
- https://www.alibabacloud.com/help/en/user-center/splitting-bill
- https://help.aliyun.com/en/ccs/cccai/getting-started/check-network-and-hardware-before-using-cloud-contact-center
- https://github.com/cinience/alicloud-skills/blob/main/README.md
- https://next.api.alibabacloud.com/document/Dyvmsapi/2017-05-25/errorCode
- https://slashdot.org/software/comparison/Alibaba-Cloud-Intelligent-Speech-Interaction-vs-SpeechVox/
- https://www.facebook.com/alibabacloud/videos/learn-how-to-collect-the-latest-news-with-copaw-in-our-tutorial/797821816246509/
- https://alicloud-common.oss-ap-southeast-1.aliyuncs.com/2022/Trust%20Center/Alibaba%20Cloud%20-%20PCI%20DSS%204.0%20AOC%20-%20Service%20Provider%20-%20International%20Public%20Cloud%20Services%20.pdf
- https://next.api.alibabacloud.com/document/ccc/2020-07-01/GetAudioFileUploadParameters
- https://www.alibabacloud.com/help/en/tablestore/memory-storage-service-sub-product-test/agentrun-tablestore-memory
- https://www.alibabacloud.com/blog/openclaw-ai-agent-memory-loss-extend-your-agents-memory-easily-with-tablestore-skill-plugin_602977
- https://www.alibabacloud.com/help/en/tablestore/memory-storage-service-sub-product-test/agent-memory-quick-start/
- https://www.linkedin.com/pulse/episode-03-solving-ai-agent-memory-loss-alibabacloudglobal-h6slc
- https://www.alibabacloud.com/help/en/tablestore/table-store-service/memory-storage-introduction
- https://help.aliyun.com/en/tablestore/memory-storage-service-sub-product-test/memory-storage-overview
- https://github.com/bububa/tablestore-memory
- https://www.alibabacloud.com/help/en/agentrun/memory-storage-overview.md
- https://www.alibabacloud.com/blog/add-enterprise-memory-to-openclaw-and-your-agent-finally-doesn%E2%80%99t-have-to-ask-again_603173
- https://www.alibabacloud.com/blog/tablestore-low-cost-vector-retrieval-services-to-help-ai-retrieval_601793
- https://www.alibabacloud.com/help/en/model-studio/mcp
- https://github.com/aliyun/alibaba-cloud-ops-mcp-server
- https://www.alibabacloud.com/blog/accelerating-ai-integration-with-alibaba-cloud%E2%80%99s-model-context-protocol-mcp_602490
- https://www.alibabacloud.com/help/en/model-studio/web-search-for-coding-plan
- https://www.alibabacloud.com/blog/602162
- https://help.aliyun.com/en/model-studio/mcp-introduction
- https://www.alibabacloud.com/help/en/agentrun/tool-market
- https://www.gartner.com/reviews/product/alibaba-cloud-model-studio
- https://www.youtube.com/watch?v=gfqytnlfx2s
- https://www.alibabacloud.com/blog/mcp-for-observability-2-0---six-practices-for-making-good-use-of-mcp_602423
- https://www.alibabacloud.com/help/en/agentloop/product-overview/what-is-agentloop
- https://aimultiple.com/ai-agents-customer-service
- https://sourceforge.net/software/product/SparrowDesk/alternatives
- https://academy.theartofservice.com/course/view.php?id=1503&guest=true
- https://www.thegoodinvestors.sg/category/investing/page/2/
- https://reference-global.com/download/chapter/9781806691449/10.0000/9781806691449-001.pdf
- https://theaidatabase.com/
- https://www.alibabacloud.com/blog/alibaba-cloud-celebrates-10-years-in-singapore-with-new-data-centers-and-ai-global-competency-center_602337
- https://www.linkedin.com/pulse/what-makes-alibaba-clouds-newly-released-agentcore-q6q5e
- https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agentcore-regions.html
- https://www.crnasia.com/news/2026/cloud/alibaba-cloud-rolls-out-agentic-cloud-stack-with-agentcore-a
- https://www.alibabacloud.com/help/en/functioncompute/supported-regions-of-fc-agent-sandbox
- https://www.alibabacloud.com/blog/choosing-the-best-hosting-region-for-you_595805
- https://www.alibabacloud.com/blog/human-in-the-loop-ai-systems-balancing-automation-and-oversight-in-enterprise-workflows_603587
- https://www.alibabacloud.com/help/en/skillsportal/aliyun-hitl-agent-security-guide
- https://github.com/strands-agents/harness-sdk/discussions/1713
- https://www.youtube.com/watch?v=ET8uzwF8Q0A
- https://www.copilotkit.ai/learning/what-is-human-in-the-loop
- https://www.threatlocker.com/blog/human-in-the-loop-ai-what-should-requre-human-approval-when-using-ai-agents
- https://www.dataiku.com/blog/human-in-the-loop-ai-agents
- https://www.reddit.com/r/LangChain/comments/1s6qidj/how_i_implemented_humanintheloop_with_langgraphs/
- https://learn.microsoft.com/en-us/agent-framework/integrations/by-component/ui/ag-ui/human-in-the-loop
- https://www.flowhunt.io/blog/human-in-the-loop-middleware-python-safe-ai-agents/
- https://www.alibabacloud.com/help/en/model-studio/batch-inference
- https://help.aliyun.com/en/model-studio/model-pricing
- https://www.alibabacloud.com/help/en/model-studio/savings-plan-and-resource-package
- https://www.reddit.com/r/AIToolsPerformance/comments/1rgue16/openclaw_alibaba_cloud_coding_plan_8_frontier/
- https://www.developersdigest.tech/models/fine-tuning/alibaba-model-studio
- https://www.alibabacloud.com/help/en/model-studio/model-high-speed-inference/
- https://www.youtube.com/watch?v=QmB2qxcQx88&vl=en-US
- https://www.microsoft.com/en-us/dynamics-365/blog/it-professional/2025/05/29/intent-based-routing-transforms-customer-support-with-ai/
- https://www.alibabacloud.com/help/en/agentrun/knowledge-base-integration-guide
- https://medium.com/@bhuvaneswarbaranikam/intent-detection-for-customer-support-using-ai-72a89b7a5ca8
- https://www.dialpad.com/blog/customer-service-automation/
- https://heybento.ai/blog/how-to-set-up-ai-customer-service-small-business
- https://www.alibabacloud.com/blog/intelligent-robot-by-alibaba-cloud-transforming-interaction-with-advanced-features_600551
- https://www.alibabacloud.com/blog/602560
- https://www.aalpha.net/blog/how-to-build-an-ai-agent-for-customer-support/
- https://inkeep.com/blog/AI-Customer-Experience
- https://www.alibabacloud.com/blog/forward-deployment-engineering-using-alibaba-cloud_603601
- https://www.facebook.com/startupdisrupt/posts/-enterprise-ai-messy-fragmented-and-hard-to-scaleat-innovationsunited2025-apoco-/1341269131332794/
- https://de.linkedin.com/in/song24
- https://www.sundeepteki.org/blog.html
- https://www.guance.com/en/billing
- https://www.techzine.eu/blogs/infrastructure/130627/what-will-the-sustainable-data-center-of-the-future-look-like/
- https://www.examheist.com/papers/nvidia/ncp-aai/1/
- https://www.digitalcommerce360.com/2026/07/24/alibaba-accio-work-agentic-ai-b2b-sourcing/
- https://www.accio.com/
- https://www.youtube.com/watch?v=i5hXC-k-Ozk
- https://www.okoone.com/spark/technology-innovation/how-alibabas-new-ai-agent-is-shaking-up-global-sourcing/
- https://apps.apple.com/us/app/accio-alibaba-ai-agent/id6739872836
- https://www.reddit.com/r/chinaglobalsignals/comments/1s5me18/alibaba_just_launched_accio_work_an_ai_agent/
- https://skywork.ai/skypage/en/Accio-AI-Review-A-Hands-On-Test-of-Alibaba%27s-AI-Sourcing-Agent/1974505145238220800
- https://www.prnewswire.com/news-releases/alibaba-international-releases-the-worlds-first-ai-agent-for-global-trade-302530000.html
- https://www.facebook.com/Alibaba.comGlobal/posts/meet-accio-the-worlds-first-ai-powered-sourcing-engine-designed-for-ecommerce-se/1093292842836958/
- https://play.google.com/store/apps/details?id=com.accio.android.app&hl=en_US
- https://www.alibabacloud.com/en/customers/shiseido_drunk_elephant?_p_lc=1
- https://www.casestudies.com/company/alibaba-cloud/case-study/shiseido-drunk-elephant-launches-drunk-gpt-across-270-sephora-stores-with-alibaba-cloud
- https://alicloud-common.oss-ap-southeast-1.aliyuncs.com/2024/Documents_Collection/eMagazine_ai_pioneers.pdf
- https://beautymatter.com/articles/drunkgpt-drunk-elephants-alibaba-powered-chatbot
- https://futurecio.tech/alibaba-cloud-and-shiseido-china-partner-for-ai-driven-drunkgpt/
- https://www.facebook.com/alibabacloud/videos/refresh-your-skincare-routine-with-the-power-of-ai-/930331968992723/
- https://www.alibabacloud.com/en/press-room/alibaba-cloud-collaborates-with-shiseido-china-on?_p_lc=1
- https://www.facebook.com/alibabacloud/photos/meet-drunkgpt-were-shining-the-spotlight-on-drunk-elephant-skin-care-who-launche/939747724863987/
- https://www.idcnova.com/news/Alibaba-Cloud-Collaborates-with-Shiseido-China-on-AI-Driven-DRUNKGPT-2250
- https://www.conferbot.com/chatbot/line
- https://developers.line.biz/en/reference/messaging-api/
- https://hk.imbee.io/resource/line-official-account
- https://help.aliyun.com/en/chatapp/user-guide/line-channel-faq
- https://developers.line.biz/
- https://www.chatwoot.com/features/line-integration
- https://www.ongito.com/blog/line-messaging-api-vs-line-official-account/
- https://developers.line.biz/en/docs/messaging-api/pricing/
- https://apis.apievangelist.com/store/line-webhook/
- https://www.bestar-kr.com/post/setting-up-korean-kakaotalk-business-channel
- https://developers.kakao.com/docs/en/kakaotalk-channel/rest-api
- https://www.zwightx.in/blog/kakaotalk-customer-support-automation-channel-chatbot-cs-talk-2026
- https://www.zoelumos.com/blog/kakaotalk-channel-us-korean-business
- https://www.infobip.com/docs/kakaotalk/getting-started
- https://community.sinch.com/t5/KakaoTalk/Registering-your-Business-KakaoTalk-Channel-with-Sinch/ta-p/9748
- https://krwork.co/kakaotalk-for-business-guide/
- https://developers.kakao.com/docs/en/business-auth/common
- https://www.ppc.go.jp/en/
- https://iclg.com/practice-areas/data-protection-laws-and-regulations/japan/
- https://practiceguides.chambers.com/practice-guides/data-protection-privacy-2026/japan/trends-and-developments
- https://www.dlapiperdataprotection.com/?t=law&c=JP
- https://securiti.ai/blog/japan-instructions-for-generative-ai-services/
- https://iapp.org/news/a/japan-s-dpa-publishes-interim-summary-of-amendments-to-data-protection-regulations
- https://www.nishimura.com/en/knowledge/newsletters/data_protection_260120
- https://www.linkedin.com/posts/luisalbertomontezuma_japan-activity-7511764623113760770-LQvd
- https://www.japaneselawtranslation.go.jp/en/laws/view/4241/en
- https://www.bitraser.com/article/japan-appi-data-protection-law.php?srsltid=AYCX9vIM2QWoy7UnXnuhsr2k9pyb-s97P_u7p_dqyrRfLDBjCICJIR5s
- https://www.tilleke.com/insights/thailand-issues-personal-data-protection-guidelines-for-ai-systems/
- https://www.dlapiperdataprotection.com/index.html?t=law&c=TH
- https://www.onetrust.com/glossary/indonesia-personal-data-protection-law/
- https://www.facebook.com/tillekegibbins/posts/thailands-pdpc-has-issued-its-first-ai-specific-guidance-on-the-application-of-t/1792164919575995/
- https://trustarc.com/regulations/thailand-pdpa/
- https://bigid.com/blog/thailand-pdpa-compliance/
- https://www.dataguidance.com/jurisdictions/thailand
- https://www.legal500.com/intelligence/thailand/privacy/ai-governance-in-thailand-the-pdpa-isnt-waiting-neither-should-you
- https://securiti.ai/thailand-personal-data-protection-act-pdpa/
- https://www.termsfeed.com/blog/thailand-pdpa-personal-data-protection-act/
- https://fin.ai/learn/ai-resolution-rate
- https://fin.ai/learn/roi-ai-customer-service-agents-benchmarks
- https://fin.ai/glossary/resolution-rate
- https://myaskai.com/blog/ai-resolution-rate-benchmarks
- https://www.intercom.com/help/en/articles/13533623-fin-ai-agent-automation-rate
- https://www.linkedin.com/posts/maudiebrown_what-is-fin-the-1-ai-agent-for-customer-activity-7518759284659273728-eWhG
- https://fin.ai/learn/fin-vs-ada
- https://fin.ai/learn/per-resolution-vs-per-conversation-ai-pricing
- https://www.thecontextcompany.com/knowledge-base/what-is-a-good-ai-agent-resolution-rate
- https://decagon.ai/case-studies
- https://decagon.ai/blog/ai-customer-service
- https://decagon.ai/case-studies/duolingo
- https://cresta.com/guides/decagon-vs-cresta
- https://myaskai.com/blog/decagon-ai-complete-guide-2026
- https://sitegpt.ai/resources/decagon-review
- https://www.assembled.com/page/decagon-ai
- https://fin.ai/learn/fin-vs-decagon
- https://decagon.ai/blog/customer-service-best-practices
- https://www.crescendo.ai/blog/decagon-vs-sierra-vs-crescendo
- https://www.lorikeetcx.ai/product/voice
- https://www.lorikeetcx.ai/articles/voice-ai-multi-step-workflows-2026
- https://www.getmacha.com/blog/lorikeet-ai-complete-guide
- https://www.lorikeetcx.ai/
- https://www.linkedin.com/posts/shind_the-dna-of-voice-ai-that-works-i-lorikeet-activity-7402466861667565568-LI0m
- https://www.youtube.com/watch?v=eZj1xSiyd9U
- https://gradient-labs.ai/guides/best-lorikeet-alternatives
- https://www.lorikeetcx.ai/product/ai-agents
- https://www.prnewswire.com/news-releases/lorikeet-launches-industry-first-team-of-agents-with-voice-integration-to-deliver-end-to-end-customer-problem-resolution-302579515.html
- https://docs.aws.amazon.com/connect/latest/adminguide/create-ai-agents.html
- https://aws.amazon.com/ai/generative-ai/use-cases/agent-assist/
- https://www.youtube.com/watch?v=qROzGYdWCDo
- https://aws.amazon.com/video/watch/81750125e9d/
- https://docs.aws.amazon.com/connect/latest/adminguide/use-generative-ai-email.html
- https://builder.aws.com/content/39uH1Yt5IU1SeiVkSz6cnsVhJbb/generative-ai-and-ai-use-cases-in-bpo-and-contact-centers
- https://www.forbes.com/sites/maribellopez/2025/12/16/amazon-connect-at-aws-reinvent-how-ai-agents-and-unified-platforms-transform-contact-centers-and-cx/
- https://aws.amazon.com/products/connect/customer/ai-agents/
- https://www.youtube.com/watch?v=sq5FNe2_JzI
- https://www.techtarget.com/news/AWS-loads-Amazon-Connect-with-customer-service-AI-agents/848753/
- https://www.linkedin.com/posts/yinomad_aiagent-digitalemployee-alibabacloud-activity-7377329957175250944-yXXF
- https://www.alibabacloud.com/blog/navigating-the-future-of-marketing-automation-with-alibaba-cloud_600902
- https://eu.36kr.com/en/p/3483384622619523
- https://www.alibabacloud.com/en/product/quickaudience?_p_lc=1
- https://help.aliyun.com/en/document_detail/2938856.html
- https://www.alibabacloud.com/blog/the-role-of-alibaba-cloud-in-personalizing-customer-experiences-for-marketers_600852
- https://www.alibabacloud.com/blog/lingyang-debuts-at-the-qwen-conference-in-singapore-quick-bi-deconstructs-enterprise-grade-data-solutions-for-the-ai-era_603196
- https://www.techzine.eu/news/infrastructure/143542/alibaba-cloud-reduces-llm-use-in-support-ticket-handling/
- https://www.techzine.eu/news/infrastructure/145376/alibaba-cloud-opens-first-cloud-region-in-the-netherlands/
- https://www.alibabacloud.com/help/en/agentrun/large-language-model-1.md
- https://news.ycombinator.com/item?id=45643163
- https://www.facebook.com/AlibabaCloudSEA/posts/missed-the-live-session-the-replay-is-uphot-take-most-teams-dont-have-an-llm-cos/1141442808450284/
- https://endroid.com/2026/alibaba-dualane-llm-routing-support-efficiency/
- https://www.alibabacloud.com/en/press-room/alibaba-cloud-introduces-new-pricing-strategy?_p_lc=1
- https://www.linkedin.com/posts/michael-tchuindjang-38829317b_alibaba-cloud-is-using-ai-to-help-it-use-activity-7493318793918865408-AXCe
- https://www.alibabacloud.com/en/product/bot?_p_lc=1
- https://www.alibabacloud.com/blog/introduction-to-alibaba-cloud-intelligent-service-robot_593814
- https://slashdot.org/software/comparison/Alibaba-Cloud-Intelligent-Robot-vs-Sales-Robots/
- https://help.aliyun.com/en/beebot/intelligent-dialogue-robot-old-version/product-overview/what-is-intelligent-chatbot
- https://platform.softwareone.com/product/alibaba-cloud-intelligent-robot/PCP-0641-2115
- https://www.alibabacloud.com/blog/chatbots---technology-and-the-future_596402
- https://sourceforge.net/software/compare/Alibaba-Cloud-Intelligent-Robot-vs-Convai/
- https://www.alibabacloud.com/en/solutions/ai-chatbots?_p_lc=1
- https://cloud.google.com/solutions/contact-center-ai-platform
- https://docs.cloud.google.com/contact-center/ccai-platform/docs
- https://www.kenwayconsulting.com/blog/how-kenway-enhanced-telecom-cx-with-google-ccai-virtual-assistant/
- https://www.tryvium.ai/blog/google-contact-center-ai/
- https://www.youtube.com/watch?v=xBsQhXvPBa8
- https://medium.com/@rubenszimbres/google-cloud-contact-center-artificial-intelligence-ccai-a-managerial-view-97776f3cd97
- https://www.researchgate.net/publication/399569526_Google_Cloud_Platform_Services_in_Build_Out_of_a_Digital_Contact_Center
- https://callcenterstudio.com/blog/best-google-cloud-contact-center-platforms/
- https://ujet.cx/resources/white-papers/google-cloud-contact-center-ai-platform-wp-lp
- https://www.leeboonstra.dev/videos/video-ccai-platform/
- https://arxiv.org/html/2507.15553v2
- https://arxiv.org/html/2508.12491v2
- https://www.alibabacloud.com/blog/use-alibaba-cloud-asm-to-efficiently-manage-llm-traffic-part-1-traffic-routing_601608
- https://ennanzhai.github.io/pub/sigcomm24-hpn.pdf
- https://arxiv.org/abs/2609.37362
- https://openreview.net/pdf?id=ka82fvJ5f1
- https://www.theregister.com/ai-and-ml/2026/08/11/alibaba-cloud-is-using-ai-to-help-it-use-less-ai/5285815
- https://github.com/MilkThink-Lab/Awesome-Routing-LLMs
- https://kdd.org/exploration_files/p107_Omnirouter_camera_ready.pdf
- https://www.alibabacloud.com/en/product/chatapp?_p_lc=1
- https://www.alibabacloud.com/help/en/chatapp/product-overview/what-is-chatapp-message-service
- https://www.alibabacloud.com/help/en/chatapp/send-chat-app-messages-through-the-console
- https://www.facebook.com/alibabacloud/videos/alibaba-clouds-new-chat-app-message-service/1159656862934252/
- https://www.alibabacloud.com/blog/follow-alibaba-cloud-chat-app-onboarding-guideline-to-begin-your-whatsapp-business-communication_601438
- https://www.alibabacloud.com/help/en/chatapp/send-chat-app-messages-through-api
- https://help.aliyun.com/en/chatapp/product-overview/what-is-chatapp-message-service
- https://www.alibabacloud.com/blog/601496
- https://www.youtube.com/watch?v=JdCPDL98G8o
- https://www.alibabacloud.com/help/en/chatapp/product-overview/chatapp-message-service-pricing
- https://www.alibabacloud.com/blog/593814
- https://www.alibabacloud.com/en/press-room/alibaba-cloud-announces-international-expansion-pi?_p_lc=1
- https://slashdot.org/software/comparison/Alibaba-Cloud-Intelligent-Robot-vs-Mercury-AI/
- https://www.alibabacloud.com/blog/601613
- https://www.facebook.com/DotDailyDose/posts/alibaba-recently-unveiled-the-international-edition-of-qwenwork-its-latest-all-i/1526456606165021/
- https://www.alibabacloud.com/help/en/vms/product-overview/international-voice-service-pricing
- https://www.alibabacloud.com/help/en/vms/product-overview/what-is-voice-service
- https://www.alibabacloud.com/blog/streamline-global-communication-with-alibaba-clouds-voice-service-a-comprehensive-solution_601221
- https://help.aliyun.com/en/vms/support/number-using-the-faq
- https://www.alibabacloud.com/en/product/vms?_p_lc=1
- https://www.alibabacloud.com/help/en/vms/user-guide/number-management
- https://api.alibabacloud.com/document/Dyvmsapi/2017-05-25
- https://www.alibabacloud.com/blog/alibaba-clouds-international-sms-solution-your-gateway-to-global-customer-engagement_601953
- https://www.instadesk.com/customers/alibaba
- https://www.alibabacloud.com/help/en/model-studio/workflow-application
- https://www.alibabacloud.com/help/tr/model-studio/rag-knowledge-base
- https://help.aliyun.com/en/model-studio/workflow/introduction
- https://www.alibabacloud.com/blog/model-studio-architecture-a-deep-dive-into-alibaba-cloud%E2%80%99s-genai-application-platform_603243
- https://www.alibabacloud.com/help/en/pai/node-reference
- https://www.alibabacloud.com/help/en/model-studio/function-calling
- https://www.alibabacloud.com/help/en/model-studio/application-calling-guide
- https://www.alibabacloud.com/help/en/model-studio/qwen-function-calling
- https://help.aliyun.com/en/model-studio/rag/multi-turn-chat
- https://qwen.readthedocs.io/en/latest/framework/function_call.html
- https://www.alibabacloud.com/help/en/model-studio/qwen-api-reference/
- https://learn.microsoft.com/en-us/dotnet/ai/conceptual/calling-tools
- https://help.aliyun.com/en/agentrun/introduction-to-tools-and-skills
- https://www.alibabacloud.com/help/en/agentrun/api-agentrun-2025-09-10-createflow
- https://agenta.ai/blog/best-ai-agent-orchestration-platforms
- https://www.facebook.com/alibabacloud/posts/struggling-with-agent-chaos-%EF%B8%8F-alibaba-clouds-new-agent-infra-solves-5-key-pain-p/1435761375262617/
- https://www.youtube.com/watch?v=7_FL9_RbLMY&vl=en
- https://www.alibabacloud.com/blog/602529
- https://www.alibabacloud.com/help/en/model-studio/what-is-model-studio
- https://www.alibabacloud.com/blog/exploring-ai-assisted-sre-with-alibaba-cloud-model-studio-and-qwen_603568
- https://docs.bailian.console.aliyun.com/en/model-studio/what-is-model-studio
- https://www.alibabacloud.com/help/en/model-studio/model-monitoring/
- https://www.alibabacloud.com/blog/ai-agents-need-observability-monitoring-debugging-and-governing-agentic-applications-on-alibaba-cloud_603577
- https://albertoroura.com/testing-alibaba-cloud-model-studio/
- https://www.alibabacloud.com/help/en/chatapp/user-guide/channel-management/
- https://www.alibabacloud.com/help/en/chatapp/pricing-change-for-chat-app-channels
- https://help.aliyun.com/en/chatapp/product-overview/product-pricing/
- https://www.alibabacloud.com/help/en/chatapp/beginner-guide
- https://www.alibabacloud.com/help/en/chatapp/whatsapp-message-rate-adjustments-and-service-conversation-message-billing
- https://www.facebook.com/alibabacloud/posts/we-are-excited-to-announce-a-fantastic-promotion-on-cloud-communication-products/960845339420892/
- https://www.alibabacloud.com/help/en/chatapp/support/faq
- https://blog.omnichat.ai/whatsapp-business-api-service-messages-pricing/
- https://www.linkedin.com/posts/ai-in-business-official_alibaba-cloud-is-using-ai-to-help-it-use-activity-7492886294541291520-0aoz
- https://www.alibabacloud.com/help/en/pai/register-and-manage-models
- https://www.alibabacloud.com/help/en/ticket-system-api/latest/api-workorder-2021-06-10-createticket
- https://www.alibabacloud.com/blog/code-harness-or-natural-language-harnesses_603240
- https://www.alibabacloud.com/blog/introduction-to-sip-trunking_600630
- https://www.unitedworldtelecom.com/blog/achieve-global-voice-connectivity-with-sip-trunking/
- https://www.linkedin.com/posts/alibaba-cloud-computing-company_voice-messaging-service-activity-7140260755697745920-ybDC
- https://telcobridges.com/learning/sip-trunking/international-sip-trunking/
- https://docs.docsgpt.cloud/Agents/nodes
- https://help.aliyun.com/en/model-studio/workflow/parameter-extraction-node
- https://www.alibabacloud.com/help/en/model-studio/api-bailian-2023-12-29-listchunks.md
- https://context7.com/djeknet/n8n-master-workflows
- https://help.runwayml.com/hc/en-us/articles/45763528999699-Introduction-to-Workflows
- https://wpaiworkflowautomation.com/docs/ai-model-node/
- https://www.mindstudio.ai/blog/getting-started-drag-and-drop-ai-workflow-builders
- https://www.alibabacloud.com/help/en/oss/user-guide/regions-and-endpoints
- https://www.alibabacloud.com/help/en/vms/api-dyvmsapi-intl-2021-10-15-endpoint
- https://www.alibabacloud.com/help/en/model-studio/singapore-regional-access-information
- https://www.alibabacloud.com/help/en/cloudsso/developer-reference/api-cloudsso-2021-05-15-endpoint
- https://stackoverflow.com/questions/52562959/where-does-ali-cloud-keep-a-full-list-of-availability-zones
- https://help.aliyun.com/en/ecs/user-guide/regions-and-zones
- https://www.alibabacloud.com/help/en/cloud-backup/product-overview/supported-regions
- https://www.alibabacloud.com/help/en/functioncompute/access-agenrun-resources-through-privatelink-intranet
- https://aws.amazon.com/about-aws/global-infrastructure/regions_az/
- https://www.alibabacloud.com/en/pricing?_p_lc=1
- https://www.alibabacloud.com/help/en/pai/product-overview/billing-of-eas
- https://www.alibabacloud.com/help/en/model-studio/tpm-reservation-billing
- https://www.alibabacloud.com/help/en/api-gateway/cloud-native-api-gateway/product-overview/billing-overview
- https://www.alibabacloud.com/help/en/agent-sandbox/product-overview/billing-overview
- https://wise.com/gb/blog/alibaba-cloud-pricing
- https://vercel.com/ai-gateway/models/labs/alibaba
- https://www.alibabacloud.com/help/en/functioncompute/billing-overview-of-fc
- https://www.alibabacloud.com/blog/alibaba-cloud-introduces-new-pricing-strategy-and-service-availability-for-international-customers_601016
- https://www.alibabacloud.com/help/en/agentbay/
- https://www.alibabacloud.com/help/en/agentbay/support/faq
- https://sandbox0.ai/alternatives/alibaba-agentbay
- https://help.aliyun.com/en/agentbay/agentbay-security-white-paper
- https://mcpservers.org/servers/Michael98671/agentbay
- https://dl.acm.org/doi/10.1145/3770855.3818380
- https://arxiv.org/abs/2512.20660
- https://arxiv.org/html/2602.21548v1
- https://oipub.com/papers/408899400
- https://arxiv.org/html/2603.18897v1
- https://dl.acm.org/doi/pdf/10.1145/3770855.3818380
- https://arxiv.org/abs/2601.17346
- https://arxiv.org/abs/2605.14290
- https://arxiv.org/abs/2607.11250
- https://arxiv.org/pdf/2602.21548
- https://www.alibabacloud.com/help/en/model-studio/germany-frankfurt-global
- https://www.alibabacloud.com/blog/alibaba-cloud-empowers-global-enterprises-with-expanded-ai-services_602929
- https://ai-sdk.dev/providers/ai-sdk-providers/alibaba
- https://github.com/sipeed/picoclaw/issues/265
- https://www.alibabacloud.com/help/en/chatapp/webhook-parameters
- https://stackoverflow.com/questions/72930906/not-receiving-some-messages-via-whatsapp-cloud-api-webhook
- https://felloai.com/qwen-pricing/
- https://tech-insider.org/how-to-use-qwen3-8-flash-api-2026/
- https://cloud.google.com/model-garden/pricing
- https://www.youtube.com/watch?v=vGueJIZWLL8
- https://medium.com/@sathishkraju/the-ai-agentic-workflow-patterns-that-actually-matter-in-2026-08955ac6f398
- https://aimultiple.com/building-ai-agents
- https://www.aihero.dev/building-effective-agents
- https://agentpatterns.ai/patterns/agent-design/anthropic-effective-agents-framework/
- https://www.linkedin.com/pulse/anthropics-guide-building-effective-ai-agents-mehdi-mirzapour-phd-5nahf
- https://blog.devgenius.io/why-anthropics-building-effective-agents-raises-the-bar-and-which-agent-patterns-to-avoid-e60a143940df
- https://www.scribd.com/document/811579416/Building-Effective-Agents-by-Anthropic
- https://www.linkedin.com/posts/rakeshgohel01_openai-a-practical-guide-to-building-agents-activity-7318615273907933186-YpNw
- https://www.facebook.com/groups/chatgptpromptsandaitools/posts/1328266395347794/
- https://ai.rundatarun.io/ai-development-agents/building-effective-ai-agents-openai-guide
- https://www.reddit.com/r/AgentsOfAI/comments/1mi68ly/a_practical_guide_on_building_agents_by_openai/
- https://pub.towardsai.net/trust-by-design-four-essential-layers-of-ai-agent-guardrails-f58bc71fd81d
- https://medium.com/@Micheal-Lanham/building-real-time-guardrails-for-multi-step-ai-agents-a-practical-guide-7f61d8d5de89
- https://docs.langchain.com/oss/python/langchain/human-in-the-loop
- https://www.langchain.com/langgraph
- https://docs.langchain.com/oss/python/langchain/frontend/human-in-the-loop
- https://www.youtube.com/watch?v=tdOeUVERukA
- https://oleg-dubetcky.medium.com/building-smarter-agents-a-human-in-the-loop-guide-to-langgraph-dfe1673d8b7b
- https://www.langchain.com/blog/the-art-of-loop-engineering
- https://www.reddit.com/r/LangChain/comments/1n9atjt/how_to_set_up_human_in_the_loop_for_langchain/
- https://www.elastic.co/search-labs/blog/human-in-the-loop-hitllanggraph-elasticsearch
- https://www.permit.io/blog/human-in-the-loop-for-ai-agents-best-practices-frameworks-use-cases-and-demo
- https://docs.cloud.google.com/architecture/choose-design-pattern-agentic-ai-system
- https://cloud.google.com/blog/topics/partners/building-scalable-ai-agents-design-patterns-with-agent-engine-on-google-cloud
- https://www.youtube.com/watch?v=GDm_uH6VxPY&vl=en-US
- https://ppc.land/google-engineer-releases-free-400-page-guide-to-agentic-ai-systems/
- https://www.reddit.com/r/AgentsOfAI/comments/1px0y6h/a_senior_google_engineer_dropped_a_424page_doc/
- https://www.facebook.com/groups/aimlmalaysia/posts/2521771231556429/
- https://www.linkedin.com/posts/rakeshgohel01_google-whitepaper-introduction-to-ai-agents-activity-7393700837929226241-mSfz
- https://medium.com/google-cloud/getting-ready-for-a-wave-of-agentic-apps-in-2025-check-out-these-articles-89b605c41e54
- https://www.mongodb.com/resources/basics/artificial-intelligence/agentic-systems
- https://books.google.com/books/about/Agentic_Design_Patterns.html?id=QqR20QEACAAJ
- https://www.cloudzero.com/blog/qwen-api-pricing/
- https://usagebox.com/articles/qwen-api-pricing-2026
- https://www.aipricing.guru/qwen-pricing/
- https://www.requesty.ai/models/alibaba/qwen-plus
- https://www.maximem.ai/blog/qwen-api-pricing-2026
- https://qwen.ai/blog?id=qwen3.5
- https://www.alibabacloud.com/help/en/model-studio/qwen-vl-ocr
- https://developer.puter.com/ai/qwen/qwen-vl-ocr/
- https://custom.typingmind.com/tools/estimate-llm-usage-costs/alibaba/qwen-vl-ocr
- https://www.reddit.com/r/LocalLLaMA/comments/1jm4agx/qwen2572b_is_now_the_best_open_source_ocr_model/
- https://www.llamaindex.ai/glossary/what-is-qwen-vl
- https://www.youtube.com/watch?v=ZOsg0WTqiEc
- https://llmtr.com/en/models/qwen/qwen-vl-ocr-2025-11-20
- https://cloudprice.net/models/alibaba-qwen-vl-ocr
- https://www.linkedin.com/posts/analytics-vidhya_deepseek-ocr-vs-qwen-3-vl-activity-7394335800886226945-l6ZM
- https://roboflow.com/blog/best-open-source-ocr-models
- https://try-qwen-ai.com/api/alibaba-cloud/
- https://www.youtube.com/watch?v=_xQnSNlBP_w
- https://docs.oracle.com/iaas/releasenotes/services/generative-ai/
- https://support.talkdesk.com/hc/en-us
- https://www.alibabacloud.com/help/en/model-studio/bailian-application-calling/
- https://playbooks.aip.gov.sg/rag-playbook/appendix_sndgo/
- https://aistudio.com.sg/blog/ai-web-application-development-singapore.html
- https://www.alibabacloud.com/blog/higress-ai-officially-launches-effortlessly-unlock-new-ai-capabilities-and-start-global-services_602096
- https://higress.ai/en/docs/latest/overview/what-is-higress/
- https://www.alibabacloud.com/help/en/api-gateway/product-overview/
- https://github.com/higress-group/higress
- https://www.alibabacloud.com/blog/beyond-nginx-ingress-higress-as-the-kubernetes-gateway-for-the-ai-era_603010
- https://higress.ai/en/ai-gateway/
- https://www.alibabacloud.com/blog/vercel-ai-gateway-vs-higress-which-one-is-more-suitable-for-your-ai-application_602278
- https://higress.ai/en/comparison/
- https://www.alibabacloud.com/blog/602498
- https://higress.ai/en/api-gateway/
- https://opper.ai/alibaba/qwen3-vl-plus
- https://www.alibabacloud.com/help/en/model-studio/vision
- https://aimlapi.com/models/qwen3-vl-plus
- https://www.facebook.com/alibabacloud/posts/model-studio-price-drop-up-to-92-savingswe-heard-you-and-reduced-prices-for-cert/1284659137039509/
- https://getdeploying.com/llms/qwen3-vl-plus
- https://big-agi.com/alibaba
- https://trustedrouter.com/providers/alibaba
- https://www.morphllm.com/qwen-api
- https://help.aliyun.com/en/model-studio/qwen-long
- https://github.com/Tongyi-Zhiwen/Qwen-Doc
- https://try-qwen-ai.com/models/qwen-ocr-models-api/
- https://www.alibabacloud.com/help/en/model-studio/qwen-long
- https://arxiv.org/html/2512.12967v1
- https://www.alibabacloud.com/help/en/model-studio/qwen-structured-output
- https://help.aliyun.com/en/model-studio/qwen-structured-output
- https://medium.com/@marketing_novita.ai/enhance-ai-models-prompt-engineering-with-json-output-ca450f62159a
- https://www.promptquorum.com/prompt-engineering/structured-output-and-json-mode
- https://arxiv.org/html/2608.08254v1
- https://www.glukhov.org/llm-performance/benchmarks/structured-output-comparison-popular-llm-providers/
- https://github.com/QwenLM/Qwen3/issues/1619
- https://community.openai.com/t/how-to-effectively-prompt-for-structured-output/1355135
- https://www.youtube.com/watch?v=fmBu51tlMJw&vl=en-US
- https://www.alibabacloud.com/help/en/model-studio/context-cache
- https://help.aliyun.com/en/model-studio/context-cache
- https://www.alibabacloud.com/en/notice/model_studio_context_cache_price_reduction_for_certain_models_578?_p_lc=1
- https://www.reddit.com/r/Qwen_AI/comments/1s48o3e/question_very_high_token_charges_using_claude/
- https://www.alibabacloud.com/help/en/model-studio/explicit-cache-guide
- https://www.subconscious.dev/providers/alibaba-cloud
- https://www.alibabacloud.com/blog/603613
- https://www.americanbar.org/groups/business_law/resources/business-law-today/2024-february/bc-tribunal-confirms-companies-remain-liable-information-provided-ai-chatbot/
- https://www.mccarthy.ca/en/insights/blogs/techlex/moffatt-v-air-canada-misrepresentation-ai-chatbot
- https://www.canlii.org/en/commentary/doc/2025CanLIIDocs1963
- https://www.bbc.com/travel/article/20240222-air-canada-chatbot-misinformation-what-travellers-should-know
- https://en.wikipedia.org/wiki/Moffatt_v._Air_Canada
- https://incidentdatabase.ai/cite/639/
- https://commons.allard.ubc.ca/cgi/viewcontent.cgi?article=1376&context=ubclawreview
- https://github.com/vectara/awesome-agent-failures/blob/main/docs/case-studies/air-canada-chatbot-legal-ruling.md
- https://www.litigate.com/whose-responsibility-is-it-anyway-chatbots-and-legal-issues-in-moffatt-v-air-canada/pdf
- https://www.theguardian.com/technology/2024/jan/20/dpd-ai-chatbot-swears-calls-itself-useless-and-criticises-firm
- https://www.bbc.com/news/technology-68025677
- https://www.youtube.com/watch?v=dnCO89xRzJs
- https://wraith.sh/incidents/dpd-chatbot-rogue
- https://www.facebook.com/groups/2600net/posts/3770226569867107/
- https://nhimg.org/dpd-chatbot-incident-2024-prompt-manipulation
- https://drkittyhung.com/home/dr-kitty-hungs-profile-page/lesson-learnt-from-the-dpd-ai-chatbot-swearing-blunder/
- https://incidentdatabase.ai/cite/631/
- https://github.com/vectara/awesome-agent-failures/blob/main/docs/case-studies/dpd-chatbot-swearing-incident.md
- https://themarkup.org/artificial-intelligence/2024/03/29/nycs-ai-chatbot-tells-businesses-to-break-the-law
- https://www.reuters.com/technology/new-york-city-defends-ai-chatbot-that-advised-entrepreneurs-break-laws-2024-04-04/
- https://www.nyc.gov/main/error/chatbot-maintenance
- https://museumoffailure.com/exhibition/nyc-ai-crime
- https://www.nyc.gov/mayors-office/news/2023/10/mayor-adams-releases-first-of-its-kind-plan-responsible-artificial-intelligence-use-nyc
- https://www.shrm.org/topics-tools/employment-law-compliance/nyc-ai-chatbot-faulty-legal-advice
- https://www.reddit.com/r/artificial/comments/1br0mql/new_york_citys_official_ai_chatbot_is/
- https://www.youtube.com/watch?v=QyF1QD2dBN0
- https://oecd.ai/en/incidents/2024-03-29-3dce
- https://www.facebook.com/Gothamist/posts/nyc-proposes-crackdown-down-on-ai-customer-service-chatbots/1576497457845550/
- https://medium.com/@celestineriza/the-day-chevrolets-ai-chatbot-tried-to-sell-a-70-000-suv-for-1-29f4a1e954d9
- https://incidentdatabase.ai/cite/622/
- https://www.reddit.com/r/cars/comments/18lj7g3/chevy_dealers_ai_chatbot_allegedly_sold_new_tahoe/
- https://www.businessinsider.com/car-dealership-chevrolet-chatbot-chatgpt-pranks-chevy-2023-12
- https://cybermaniacs.com/news/chevrolet-chatbot-incident-the-1-tahoe-problem
- https://www.youtube.com/shorts/8OwxOpFtkAU
- https://www.itsupportperth.net.au/blog/how-a-dealership-chatbot-was-tricked-into-offering-a-car-for-1
- https://www.facebook.com/yourwaytothetop/videos/ai-ever-dreamt-of-a-brand-new-chevrolet-for-1-that-dream-took-an-interesting-tur/6981776961938305/
- https://nhimg.org/chevrolet-dealer-chatbot-prompt-injection-2023-1-dollar-tahoe
- https://dialzara.com/blog/call-recording-laws-ai-agents-by-state
- https://pyai.com/voice-ai-compliance/call-recording-consent-by-state
- https://roark.ai/blog/testing-call-recording-consent-voice-ai-agents
- https://exoserva.com/blog/ai-voice-privacy-compliance
- https://resolvepay.com/blog/ai-collection-calls-b2b-rules-voice-agents
- https://commlawgroup.com/2025/using-ai-in-customer-service-and-telemarketing-top-7-legal-tips/
- https://trustednetworx.com/blog/ai-call-recording-consent-requirements
- https://whatsappbusiness.com/policy/
- https://www.ycloud.com/blog/whatsapp-service-messages-24-hour-window-pricing
- https://developers.facebook.com/community/threads/1328420532772816/
- https://www.instagram.com/p/DeqJNLbIO5n/
- https://www.reddit.com/r/WhatsappBusinessAPI/comments/1tq9hqk/does_the_24_hour_whatsapp_messaging_window_kill/
- https://wasenderapi.com/blog/how-to-bypass-the-whatsapp-business-api-24-hour-window-in-2025
- https://ask4lead.com/whatsapp-24-hour-rule/
- https://www.linkedin.com/posts/whatrite_whatsappbusiness-businessmessaging-customerexperience-activity-7491727501774278658-Gn7j
- https://www.enchant.com/whatsapp-business-platform-24-hour-rule
- https://www.unesco.org/en/articles/guidance-generative-ai-education-and-research
- https://policycommons.net/artifacts/6942367/guidance-for-generative-ai-in-education-and-research/7852269/
- https://www.scirp.org/reference/referencespapers?referenceid=3846909
- https://school-education.ec.europa.eu/en/discover/publications/guidance-generative-ai-education-and-research
- https://www.oph.fi/sites/default/files/documents/Guidance%20for%20generative%20AI%20in%20education%20and%20research.pdf
- https://discovery.ucl.ac.uk/id/eprint/10176438/
- https://www.researchgate.net/publication/385105010_UNESCO_Proposal_for_the_use_of_Generative_AI_in_Education_Eight_Challenges_and_Seven_Actions
- https://www.facebook.com/groups/703007927897194/posts/843660733831912/
- https://www.cedefop.europa.eu/en/tools/vet-toolkit-tackling-early-leaving/resources/guidance-generative-ai-education-and-research-unesco
- https://gcedclearinghouse.org/en/node/129341
- https://squirrelai.com/
- https://www.researchgate.net/publication/389306045_The_Squirrel_AI_Adaptive_Learning_System_Accompanying_Millions_of_Children_in_Their_Growth
- https://www.prnewswire.com/news-releases/squirrel-ai-learning-provides-answers-for-chinas-education-dilemmas-at-the-fire-of-innovation-hosted-by-geekpark-300721467.html
- https://www.weforum.org/organizations/squirrel-ai-learning
- https://www.linkedin.com/company/squirrelai
- https://ieeexplore.ieee.org/document/8623327/
- https://hundred.org/en/innovations/squirrel-ai-learning
- https://baike.baidu.com/en/item/Squirrel%20AI/998683
- https://syncedreview.com/2018/10/03/adaptive-learning-startup-squirrel-ai-raises-cn%C2%A51b/
- https://squirrelai.com/faqs/
- https://help.aliyun.com/en/agentrun/knowledge-base-integration-guide
- https://www.alibabacloud.com/blog/one-key-one-cli-%E2%80%94-manage-your-alibaba-cloud-model-studio-token-plan-from-terminal-or-ai-agent_603453
- https://medium.com/jin-system-architect/alibaba-cloud-may-not-be-selling-an-agent-builder-at-all-da8012e939c3
- https://github.com/earendil-works/pi/issues/6850
- https://cloud.google.com/products/gemini-enterprise-agent-platform
- https://www.digitalapplied.com/blog/qwen3-8-omni-flash-omnimodal-agents-audio-video-cost
- https://www.alibabacloud.com/help/en/model-studio/qwen-omni
- https://qwen.ai/blog?id=qwen3.8-omni-flash
- https://wavespeed.ai/blog/posts/qwen3-5-omni-api-pricing-2026/
- https://www.instagram.com/p/De8dYqLlwrR/
- https://x.com/alibaba_cloud/status/2114579704569041267
- https://www.alibabacloud.com/blog/603236
- https://www.alibabacloud.com/help/en/open-search/scenarios.md
- https://help.aliyun.com/en/open-search/industry-algorithm-edition/
- https://slashdot.org/software/comparison/Alibaba-Cloud-OpenSearch-vs-Amazon-OpenSearch-Service/
- https://www.alibabacloud.com/blog/maxcompute-%2B-open-search-based-search-and-development-practices-in-e-commerce-and-retail-industries_598157
- https://sourceforge.net/software/product/Alibaba-Cloud-OpenSearch/alternatives
- https://hosted-files.sched.co/kccnceu2026/b4/KubeConEU-bof.pdf
- https://x.com/alibaba_cloud/status/1927625569145151601
- https://skywork.ai/skypage/en/Unlocking-AI%27s-Potential-with-Higress-An-In-Depth-Review/1976465744525848576
- https://higress.ai/en/docs/ai/scene-guide/application-safety/
- https://www.facebook.com/AlibabaCloudSEA/posts/-see-how-higress-ai-gateway-decouples-model-config-from-the-gateway-add-provider/927736326487601/
- https://www.alibabacloud.com/blog/qwen-work-for-teachers_603576
- https://www.alibabacloud.com/blog/alibaba-clouds-wuying-unveils-ai-tutor_601591
- https://www.facebook.com/alibabacloud/videos/alibaba-cloud-ai-with-heart-caring-for-malaysias-people-and-culture/2364368234000190/
- https://www.quora.com/What-are-Alibabas-Qwen-AI-models-and-how-might-they-impact-the-AI-market
- https://www.datacamp.com/tutorial/qwen-alibaba-cloud
- https://www.scribd.com/document/1076336409/Alibaba-Qwen-Case-Study
- https://galileo.ai/blog/qwen-ai-models
- https://www.alibabacloud.com/blog/generative-ai-for-marketing-content-using-qwen-on-alibaba-cloud-to-scale-copywriting_603082
- https://www.alibabacloud.com/blog/alibaba-opens-all-of-taobao-to-qwen-ai-ushering-in-a-new-agentic-shopping-experience_603104
- https://www.facebook.com/alibabagroupofficial/posts/shopping-just-got-a-major-ai-upgrade-meet-the-qwen-app-taobao-integration-from-p/1307804064899057/
- https://www.facebook.com/Reuters/posts/alibaba-to-integrate-qwen-ai-with-taobao-launch-agentic-shopping-source-saysclic/1542477407742986/
- https://www.alibabacloud.com/blog/601285
- https://www.reuters.com/world/asia-pacific/alibaba-integrate-qwen-ai-with-taobao-launch-agentic-shopping-source-says-2026-05-10/
- https://www.reddit.com/r/technology/comments/1t93h89/alibaba_to_integrate_qwen_ai_with_taobao_launch/
- https://apps.apple.com/pe/app/qwen-alibaba-ai-assistant/id6757738627?l=en-GB
- https://www.alibabacloud.com/help/en/cloud-migration-guide-for-beginners/latest/regions-and-zones
- https://www.facebook.com/fb-answers/alibaba-cloud-regions/
- https://next.api.alibabacloud.com/product/Airec
- https://slashdot.org/software/comparison/Alibaba-Cloud-AIRec-vs-Manago-AI/
- https://www.linkedin.com/posts/wmerick_ai-agents-astound-me-klarna-the-swedish-activity-7392536268036808704-SVRi
- https://conversationaltechsummit.com/klarnas-ai-u-turn-80-of-customer-service-is-automated-so-why-did-humans-come-back/
- https://www.facebook.com/Entrepreneur/posts/klarna-additionally-reports-that-the-chatbot-could-improve-the-companys-profits-/795016192496595/
- https://www.twig.so/blog/ai-customer-support-lessons-klarna
- https://ai-best-practices.com/case-studies/klarna-s-ai-assistant-handles-two-thirds-of-customer-service-chats-in-mo
- https://businessanalytics.substack.com/p/klarnas-customer-support-transformation
- https://blog.pragmaticengineer.com/klarnas-ai-chatbot/
- https://www.reddit.com/r/amazonprime/comments/1on1580/amazon_says_its_ai_shopping_assistant_rufus_is_so/
- https://www.modernretail.co/technology/amazon-says-its-ai-shopping-assistant-is-gaining-traction-with-rufus-users-up-115/
- https://jarvio.io/blog/amazon-rufus-ai-search
- https://www.youtube.com/watch?v=Jd8FsAlh8UI
- https://retailtechinnovationhub.com/home/2026/1/5/rufus-and-the-ai-shopping-war-why-amazons-assistant-reveals-the-battle-for-customer-intent
- https://ideas.repec.org/p/nbr/nberwo/35620.html
- https://www.nber.org/people/philip_oreopoulos
- https://www.winssolutions.org/khanmigo-ai-tutoring-two-year-trial/
- https://blog.khanacademy.org/what-i-found-compelling-in-a-new-randomized-trial-of-khan-academy-in-math-intervention/
- https://hechingerreport.org/proof-points-khanmigo-math-ai-tutor/
- https://www.researchgate.net/publication/413252383_One_Click_Away_AI_Tutoring_with_Khanmigo_in_a_Two-Year_School_Experiment
- https://www.nber.org/system/files/working_papers/w34683/w34683.pdf
- https://www.youtube.com/post/UgkxtR4v0uxYwPnCOBBH2FDkPQXp9_gCOpoQ
- https://www.alibabacloud.com/blog/603576
- https://www.alibabacloud.com/blog/alibaba-cloud%E2%80%99s-model-studio-tops-200000-registrations-qwen-attracts-over-20m-model-downloads_601368
- https://www.facebook.com/alibabacloud/videos/ai-can-do-more-than-generate-ideas-it-can-get-work-donediscover-how-agent-applic/4530527223888382/
- https://www.youtube.com/watch?v=nDbohgg-BoA
- https://x.com/alibaba_cloud/with_replies
- https://www.nature.com/articles/s41599-024-03470-y
- https://www.kimchang.com/en/insights/detail.kc?sch_section=4&idx=29898
- https://scholar.gist.ac.kr/bitstream/local/9484/2/Automated%20decision_making%20in%20South%20Korea.pdf
- https://ideas.repec.org/a/pal/palcom/v11y2024i1d10.1057_s41599-024-03470-y.html
- https://aicura.app/frameworks/korea-pipa-automated-decisions/
- https://elaw.klri.re.kr/eng_service/lawView.do?hseq=62389&lang=ENG
- https://datalaw.kr/en/automated-decisions/
- https://regulations.ai/regulations/RAI-KR-NA-ADRGPXX-2024
- https://www.kimchang.com/en/insights/detail.kc?sch_section=4&idx=32699
- https://pipc.go.kr/eng/user/ltn/new/noticeDetail.do?bbsId=BBSMSTR_000000000001&nttId=2275
- https://www.linkedin.com/posts/kyoungsicmin_complete-catalog-of-south-koreas-privacy-activity-7441722947741884416-i4GK
- https://www.grcreport.com/post/south-korea-rethinks-privacy-rules-as-ai-strains-the-logic-of-consent
- https://digital.nemko.com/news/south-korea-generative-ai-privacy-law-implementation-guide
- https://regulations.ai/regulations/RAI-KR-NA-PIPAIXX-2023
- https://www.instagram.com/p/DZECBLnEgDY/
- https://www.imda.gov.sg/resources/press-releases-factsheets-and-speeches/press-releases/2024/public-consult-model-ai-governance-framework-genai
- https://www.pertamapartners.com/insights/singapore-model-ai-governance-framework-genai-agentic
- https://aiverifyfoundation.sg/resources/mgf-gen-ai/
- https://www.imda.gov.sg/about-imda/emerging-technologies-and-research/artificial-intelligence
- https://ink.library.smu.edu.sg/cgi/viewcontent.cgi?article=6527&context=sol_research
- https://www.pdpc.gov.sg/-/media/files/pdpc/pdf-files/resource-for-organisation/ai/sgmodelaigovframework2.pdf
- https://www.morganlewis.com/pubs/2024/07/singapore-expands-its-ai-governance-approach-to-include-generative-ai
- https://oecd.ai/en/catalogue/tools/model-ai-governance-framework-for-generative-ai
- https://docs.modulos.ai/frameworks/singapore-mgf-agentic
- https://www.aigovernancecore.com/ai-regulation-tracker/singapore-model-ai-governance
- https://www.alibabacloud.com/help/doc-detail/3049222.html
- https://www.alibabacloud.com/help/en/agentrun/open-service-area.md
- https://www.alibabacloud.com/blog/alibaba-cloud-expands-european-footprint-with-two-availability-zones-in-france_603265
- https://www.economyinsights.com/p/cloud-providers-with-the-most-active-regions-worldwide
- https://help.aliyun.com/en/model-studio/regions
- https://www.alizila.com/alibaba-cloud-expands-southeast-asian-footprint-with-new-data-centers/
- https://dev.to/mrboogiej/what-are-the-region-codes-and-az-codes-of-alibaba-cloud-apsaradb-4bij
- https://help.aliyun.com/en/agentrun/open-service-area
- https://www.tencentcloud.com/document/product/236/8458
- https://alibaba-cloud.medium.com/connecting-regions-with-alibaba-cloud-enterprise-network-23046f23525a
- https://www.linkedin.com/posts/alibabacloudglobal_alibabacloud-cloudcomputing-ai-activity-7470054491824824321-2yvN
- https://www.linkedin.com/pulse/breakdown-singapores-new-pdpc-guidelines-generative-ai-data-0ovbc
- https://www.lexology.com/library/detail.aspx?g=672d0893-7f7c-4a33-a076-14e1750d11bb
- https://iapp.org/news/a/notes-from-the-asia-pacific-region-singapore-issues-draft-guidelines-on-personal-data-use-in-generative-ai
- https://digitalpolicyalert.org/event/40304-personal-data-protection-commission-opened-consultation-on-proposed-advisory-guidelines-on-use-of-personal-data-in-generative-ai
- https://x.com/DSCI_Connect/status/2067864470349840634
- https://www.scribd.com/document/1054572749/Proposed-Advisory-Guidelines-on-Use-of-Personal-Data-in-Generative-AI
- https://www.dataguidance.com/news/singapore-pdpc-issues-advisory-guidelines-responsible
- https://www.asifma.org/wp-content/uploads/2026/07/asifma-response-to-singapore-pdpc-ai-consultation-final-20260701.pdf
- https://www.instagram.com/p/DZwh2Y4mrJJ/
- https://www.lexology.com/library/detail.aspx?g=7dbb8dda-27ed-40df-a70f-cf3cc7dff28b
- https://www.stephensonharwood.com/insights/launch-of-a-new-model-ai-governance-framework-for-agentic-ai/
- https://www.linkedin.com/posts/oliver-patel_singapore-published-the-worlds-first-agentic-activity-7430924096638545920-Ra1L
- https://www.researchgate.net/publication/408066854_A_Structural_Audit_of_Singapore's_Model_AI_Governance_Framework_for_Agentic_AI
- https://www.reddit.com/r/AI_Governance/comments/1tjmugu/singapores_new_agentic_ai_framework_is_a_wild/
- https://nhimg.org/singapore-agentic-ai-governance-framework-guide
- https://www.insideglobaltech.com/2026/06/18/singapore-updates-model-ai-governance-framework-for-agentic-ai/
- https://fpf.org/blog/south-koreas-new-ai-framework-act-a-balancing-act-between-innovation-and-regulation/
- https://cset.georgetown.edu/publication/south-korea-ai-law-2025/
- https://aibasicact.kr/
- https://www.littler.com/news-analysis/asap/understanding-south-koreas-new-ai-law-key-considerations-multinational-employers
- https://www.kimchang.com/en/insights/detail.kc?sch_section=4&idx=33805
- https://www.cooley.com/news/insight/2026/2026-01-27-south-koreas-ai-basic-act-overview-and-key-takeaways
- https://artificialintelligenceact.com/south-korean-ai-basic-law/
- https://regulations.ai/regulations/RAI-KR-NA-SOUTHKO-2025
- https://www.onetrust.com/resources/south-koreas-ai-basic-act-what-businesses-need-to-know-and-how-to-comply-ebook/
- https://www.trade.gov/market-intelligence/south-korea-artificial-intelligence-ai-basic-act
- https://fpf.org/blog/understanding-japans-ai-promotion-act-an-innovation-first-blueprint-for-ai-regulation/
- https://www.ibanet.org/japan-emerging-framework-ai-legislation-guidelines
- https://www.whitecase.com/insight-our-thinking/ai-watch-global-regulatory-tracker-japan
- https://www.gov-online.go.jp/hlj/en/november_2025/november_2025-08.html
- https://regulations.ai/regulations/RAI-JP-NA-PRDUAXX-2025
- https://montrealethics.ai/ai-policy-corner-japans-ai-promotion-act/
- https://zelojapan.com/en/lawsquare/56899
- https://nhimg.org/japan-ai-promotion-act-guide
- https://www.linkedin.com/posts/airockstar_japan-passes-innovation-focused-ai-governance-activity-7353530568518586370-UTAa
- https://www.twobirds.com/en/capabilities/artificial-intelligence/ai-legal-services/ai-regulatory-horizon-tracker/japan
- https://www.dlapiperdataprotection.com/index.html?t=law&c=ID
- https://practiceguides.chambers.com/practice-guides/data-protection-privacy-2026/indonesia/trends-and-developments
- https://www.researchgate.net/publication/386107720_Indonesia%27s_Legal_Policy_on_Protecting_Personal_Data_from_Artificial_Intelligence_Abuse
- https://securiti.ai/solutions/indonesia-pdp-regulations/
- https://www.dataguidance.com/jurisdictions/indonesia
- https://news.microsoft.com/id-id/2024/10/14/accelerate-your-pdp-law-compliance-with-microsoft-cloud/
- https://cpl.thalesgroup.com/compliance/apac/indonesia-personal-data-protection-law
- https://www.facebook.com/AsiaBusinessLawJournal/posts/after-more-than-three-years-of-waiting-indonesia-has-finally-issued-the-implemen/1556675353144054/
- https://iclg.com/practice-areas/data-protection-laws-and-regulations/indonesia/
- https://www.shs-conferences.org/articles/shsconf/pdf/2024/24/shsconf_diges-grace2024_07002.pdf
- https://fpf.org/blog/malaysia-charts-its-digital-course-a-guide-to-the-new-frameworks-for-data-protection-and-ai-ethics/
- https://www.facebook.com/TheStarOnline/posts/malaysia-is-drafting-a-new-ai-bill-that-will-impose-stricter-safety-controls-tes/1587625166733336/
- https://securiti.ai/malaysia-national-guidelines-on-ai-governance-and-thics/
- https://ai.gov.my/governance/
- https://www.dlapiperdataprotection.com/?t=law&c=MY
- https://chambers.com/articles/insight-into-malaysia-s-newly-launched-ai-governance-ethics-guidelines
- https://www.krinstitute.org/publications/navigating-malaysias-ai-future-toward-coordinated-and-adaptive-governance
- https://www.linkedin.com/pulse/upcoming-malaysian-ai-governance-bill-key-regulations-expect-j94ce
- https://www.dmhubtraining.com/ai-governance-malaysia/
- https://www.isis.org.my/wp-content/uploads/2024/12/AI-Governance.pdf
- https://legalblogs.wolterskluwer.com/global-workplace-law-and-policy/the-prohibition-of-ai-emotion-recognition-technologies-in-the-workplace-under-the-ai-act/
- https://oliverpatel.substack.com/p/emotion-recognition-and-the-eu-ai
- https://artificialintelligenceact.eu/article/5/
- https://www.technologyslegaledge.com/2025/04/eu-ai-act-spotlight-on-emotional-recognition-systems-in-the-workplace/
- https://ai-act-service-desk.ec.europa.eu/en/ai-act/faq/what-systems-are-prohibited-under-article-5-ai-act-eg-social-scoring-emotion-recognition
- https://www.linkedin.com/pulse/ai-act-guidelines-prohibited-practices-analysis-field-iren-phd-pmp-y3the
- https://www.teamed.global/insights/is-emotion-recognition-at-work-legal-in-eu
- https://bluearrow.ai/emotion-recognition/
- https://www.williamfry.com/knowledge/the-time-to-ai-act-is-now-a-practical-guide-to-emotion-recognition-systems-under-the-ai-act/
- https://www.autoriteitpersoonsgegevens.nl/en/system/files?file=2024-10/Call%20for%20input_emotion%20recognition_DCA-2024-02.pdf
- https://www.requesty.ai/models/alibaba/qwen3.8-flash
- https://help.aliyun.com/en/model-studio/qwen3-8-flash
- https://www.facebook.com/QwenCloud/posts/qwen38-flash-api-is-live-on-qwencloud-262k-native-context-extensible-to-1m-and-p/1063883256233838/
- https://getdeploying.com/llms/qwen3.8-flash-next
- https://aitokenprice.com/pricing/qwen
- https://custom.typingmind.com/tools/estimate-llm-usage-costs/alibaba/qwen3-8-flash
- https://ai-api-hub.com/providers/alibaba/pricing/
- https://www.alibabacloud.com/en/product/modelstudio?_p_lc=1
- https://rankllms.com/reviews/alibaba-model-studio-token-plan-review/
- https://www.alibabacloud.com/help/en/model-studio/newly-released-models
- https://www.alibabacloud.com/en/product/content-moderation/pricing?_p_lc=1
- https://www.alibabacloud.com/en/product/ai_guardrails?_p_lc=1
- https://cybersectools.com/compare/ai-model-guardrails-vs-alibaba-cloud-platform-for-ai
- https://www.alibabacloud.com/help/en/content-moderation/latest/billing-overview
- https://www.alizila.com/alibaba-cloud-price-cuts-abroad-international-customers-boost-ai-growth/
- https://help.aliyun.com/en/document_detail/2642717.html
- https://openrouter.ai/qwen/qwen3-asr-flash-2026-02-10
- https://modelstudio.alibabacloud.com/
- https://custom.typingmind.com/tools/estimate-llm-usage-costs/alibaba-cn/qwen3-asr-flash
- https://www.alibabacloud.com/help/quota-center/product-overview/alibaba-cloud-services-that-support-quota-center
- https://error-center.alibabacloud.com/api/CCC/2020-07-01/CreateChatMediaUrl
- https://www.alibabacloud.com/help/id/quota-center/product-overview/alibaba-cloud-services-that-support-quota-center
- https://next.api.alibabacloud.com/api/Dyvmsapi
- https://error-center.alibabacloud.com/document/CCC/2020-07-01/ListVisitorChatMessages
- https://next.api.alibabacloud.com/api-tools/cli/Dyvmsapi
- https://www.alibabacloud.com/en?_p_lc=1
- https://www.alibabacloud.com/help/en/marketplace/how-to-submit-a-ticket
- https://www.alibabacloud.com/en/product/machine-learning?_p_lc=1
- https://www.alibabacloud.com/en/press-room/alibaba-cloud-announced-the-latest-ai-models?_p_lc=1
- https://help.aliyun.com/en/yunxiao/getting-started/cloudeffect-ai-assistant-user-guide
- https://www.youtube.com/watch?v=mFqGBltycTI
- https://resource.alibabacloud.com/webinar/detail.html?id=491&topic=
- https://www.alibabacloud.com/blog/601517
- https://skywork.ai/skypage/en/Accio-AI-Review-A-Hands-On-Test-of-Alibaba's-AI-Sourcing-Agent/1974505145238220800
- https://www.success.com/alibaba-accio-ai-agent-small-business
- https://growbusinesswithai.substack.com/p/alibabas-accio-work-your-small-business
- https://www.instagram.com/reel/DdWOCmAo4Xg/
- https://www.alibabacloud.com/blog/alibaba%E2%80%99s-qwen-powers-ai-singapore%E2%80%99s-latest-llm-to-strengthen-multilingual-performance-in-southeast-asia_602692
- https://x.com/alibaba_cloud/status/1993200360412807475
- https://baike.baidu.com/en/item/SEA-LION/6036806
- https://sg.finance.yahoo.com/news/alibaba-cloud-partners-ai-singapore-014329402.html
- https://sea-lion.ai/
- https://www.instagram.com/p/DReAf-4DjzJ/
- https://www.alibabacloud.com/en/press-room/alibaba-cloud-accelerates-worldwide-ai-innovation?_p_lc=1
- https://www.facebook.com/nbdnews/posts/ai-singapore-aisg-launched-qwen-sea-lion-v4-a-top-performing-multilingual-model-/1413389390791597/
- https://docs.oracle.com/iaas/Content/generative-ai/imported-ai-singapore-models.htm
- https://ecommercenews.asia/story/ai-singapore-alibaba-unveil-regional-model-for-1-200-languages
- https://learn.microsoft.com/en-us/answers/questions/5544816/azure-ai-speech-voice-cloning-service-is-not-avail
- https://next.api.alibabacloud.com/document/Dyvmsapi/2017-05-25/SingleCallByVoice
- https://appinchina.co/a-guide-to-alibaba-cloud-in-china/
- https://www.cyberclick.net/numericalblogen/qwen-what-it-is-and-how-it-works
- https://www.anthropic.com/research/contextual-retrieval
- https://platform.claude.com/cookbook/capabilities-contextual-embeddings-guide
- https://www.reddit.com/r/Rag/comments/1fl2wma/introducing_contextual_retrieval_by_anthropic/
- https://techcommunity.microsoft.com/blog/azure-ai-foundry-blog/building-a-contextual-retrieval-system-for-improving-rag-accuracy/4271924
- https://www.youtube.com/watch?v=tmiBae2goJM
- https://medium.com/@reliabledataengineering/building-production-rag-with-anthropics-contextual-retrieval-complete-python-implementation-f8a436095860
- https://arxiv.org/html/2504.19754v1
- https://www.facebook.com/100057410380953/posts/contextual-retrieval-improve-na%C3%AFve-ragthe-idea-of-contextual-retrieval-was-sugge/1420114006578932/
- https://www.datacamp.com/tutorial/contextual-retrieval-anthropic
- https://hidekazu-konishi.com/entry/amazon_bedrock_knowledge_bases_retrieval_quality_engineering.html
- https://www.alibabacloud.com/help/en/model-studio/api-bailian-2023-12-29-retrieve
- https://sailor.sh/blog/aws-ai-practitioner-bedrock-knowledge-bases-rag-pipeline-chunking-vector-stores-retrieval/
- https://repost.aws/questions/QUHIkn2BhgQm6kKaR05Dy12g/amazon-knowledge-base-increasing-source-chunks
- https://www.alibabacloud.com/help/en/tablestore/table-store-service/knowledge-storage-introduction
- https://builder.aws.com/content/3IcXVXaS3xrA1NbAjG1PiPynNww/chunking-strategies-for-amazon-bedrock-knowledge-bases
- https://superlinked.com/blog/optimizing-rag-with-hybrid-search-reranking
- https://irisagent.com/blog/voice-ai-customer-service-2026-benchmarks/
- https://poly.ai/guides/call-center-voice-ai
- https://www.digitalapplied.com/blog/customer-service-ai-agent-statistics-2026-data
- https://www.bland.ai/blog/polyai-alternatives
- https://www.assembled.com/page/polyai
- https://www.sobot.io/blog/ai-resolution-rate-measuring-the-true-impact-of-ai-in-customer-experience/
- https://mlflow.org/llm-as-a-judge
- https://docs.datadoghq.com/llm_observability/investigate/evaluations/llm_as_a_judge_evaluations/
- https://www.confident-ai.com/docs/resources/core-concepts/llm-as-a-judge
- https://arize.com/blog/agent-as-a-judge-agentic-evaluation/
- https://arxiv.org/html/2508.02994v1
- https://deepeval.com/blog/llm-as-a-judge
- https://montecarlo.ai/blog-llm-as-judge
- https://www.alibabacloud.com/help/en/agentloop/faqs
- https://github.com/aliyun/alibabacloud-aiops-skills/blob/master/skills/aiml/agentloop/alibabacloud-agentloop-evaluation/SKILL.md
- https://hamming.ai/resources/voice-agent-interruption-handling-runbook
- https://poly.ai/blog/barge-in-voice-ai-interruption-handling
- https://deepgram.com/learn/elevenlabs-barge-in-interruptions-turn-taking
- https://www.reddit.com/r/AI_Agents/comments/1wuevjq/how_are_you_handling_bargein_on_voice_agents/
- https://decagon.ai/glossary/what-is-voice-agent-barge-in
- https://www.runedge.ai/blog/barge-in-interruption-handling-on-device-voice
- https://www.icertglobal.com/community/handling-voice-interruption-in-livekit-agents
- https://sparkco.ai/blog/master-voice-agent-barge-in-detection-handling
- https://www.linkedin.com/posts/mishal-q-8b8053249_voiceai-aiengineering-voiceagents-activity-7492910004547796992-VMAm
- https://quantumautomations.ai/blog/voice-agent-barge-in-handling.html
- https://teamsplus.com/perspectives/tcpa-compliance-ai-voice-agents
- https://dialzara.com/blog/ai-voice-calls-tcpa-rules-compliance-guide
- https://www.henson-legal.com/ai-voice-compliance
- https://www.reddit.com/r/AI_Agents/comments/1ly1zx3/how_to_stay_within_tcpa_regulations_with_outbound/
- https://fin.ai/glossary/tcpa-compliance
- https://www.retellai.com/blog/tcpa-compliance-playbook-voice-ai-outbound
- https://www.lumay.ai/blogs/tcpa-compliance-ai-voice-agents-checklist
- https://revmo.ai/blog/tcpa-compliance-guide-ai
- https://www.plura.ai/articles/ai-voice-agent-tcpa-compliance
- https://www.workforcewave.com/compliance/tcpa
- https://help.aliyun.com/en/vms/support/voice-notification-or-voice-verification-code-faq
- https://help.aliyun.com/en/vms/product-overview/what-is-voice-service
- https://platform.softwareone.com/product/voice-service-vs/PCP-0087-5768
- https://statusgator.com/services/alibaba-cloud/voice-service
- https://help.aliyun.com/en/vms/getting-started/new-guidelines
- https://www.globalcallforwarding.com/sip-trunking/thailand-sip-trunking/
- https://dasha.ai/blog/best-sip-trunk-providers-for-voice-ai
- https://uctoday.com/top-sip-trunk-providers-2025-power-your-global-cloud-voice-strategy
- https://www.didww.com/voice/global-sip-trunking/Thailand
- https://www.vobiz.ai/sip-trunking/coverage/th/
- https://www.youtube.com/watch?v=5WWY_rmADc0
- https://wavespeed.ai/blog/audio-and-voice-models/what-is-qwen-audio-3-realtime/
- https://help.aliyun.com/en/model-studio/qwen-audio-realtime-user-guides
- https://www.reddit.com/r/LLMDevs/comments/1mpcb3a/pushing_limits_of_qwen_25_omni_realtime_voice/
- https://github.com/vllm-project/vllm-omni/issues/7055
- https://aireiter.com/blog/qwen-audio-3-realtime
- https://wiki.sipeed.com/hardware/en/kvm/NanoKVM_Go/realtime_voice_bridge.html
- https://www.agentduet.com/integrations/qwen-audio-realtime
- https://www.alibabacloud.com/help/en/tablestore/memory-storage-service-sub-product-test/overview
- https://help.aliyun.com/en/tablestore/memory-storage-service-sub-product-test/task-operation-class
- https://www.alibabacloud.com/help/en/tablestore/knowledge-storage-architecture
- https://www.alibabacloud.com/blog/603384
- https://www.youtube.com/watch?v=DV768PnBOxI
- https://aws.amazon.com/blogs/machine-learning/build-secure-rag-applications-with-aws-serverless-data-lakes/
- https://www.alibabacloud.com/help/en/tablestore/memory-storage-service-sub-product-test/build-rag-service-based-on-eas-and-tablestore
- https://repost.aws/questions/QU5Ddrw9ooSaGtMe0B8RrDHw/separating-knowledge-in-rag-solutions
- https://www.alibabacloud.com/help/en
- https://www.alibabacloud.com/help/en/agentrun/open-platform-introduction.md
- https://github.com/alibabacloud-go/agentrun-20250910
- https://www.alibabacloud.com/product/model-studio
- https://www.youtube.com/watch?v=gO174prdB8c
- https://docs.aws.amazon.com/wellarchitected/latest/generative-ai-lens/generative-ai-lens.html
- https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentic-ai-lens.html
- https://aws.amazon.com/blogs/architecture/announcing-the-updated-aws-well-architected-generative-ai-lens/
- https://aws.amazon.com/blogs/aws/announcing-aws-well-architected-agent-an-ai-powered-intelligence-to-optimize-your-cloud-environment-preview/
- https://www.youtube.com/watch?v=0sfKGUZ6kcg
- https://aws.amazon.com/blogs/industries/announcing-the-well-architected-fsi-lens-updated-for-generative-ai-and-agentic-ai/
- https://www.reddit.com/r/softwarearchitecture/comments/1pqsbt7/aws_expands_wellarchitected_framework_with/
- https://docs.aws.amazon.com/wellarchitected/latest/generative-ai-lens/definitions.html
- https://www.linkedin.com/posts/flahahmad_aws-well-architected-generative-ai-lens-activity-7320716289004482560-6AHp
- https://aws.amazon.com/blogs/machine-learning/accelerate-aws-well-architected-reviews-with-generative-ai/
- https://www.intercom.com/help/en/articles/9356221-deploy-fin-ai-agent-over-email
- https://www.intercom.com/help/en/articles/9631297-let-fin-ai-agent-answer-first
- https://www.intercom.com/learning-center/fin-ai-agent-copilot-reduce-handle-time-boost-productivity
- https://www.intercom.com/help/en/articles/10210126-provide-fin-ai-agent-with-specific-guidance
- https://www.reddit.com/r/CustomerSuccess/comments/1uchs8l/ai_agent_assistant_recommendation/
- https://reply.io/blog/intercom-ai-review/
- https://coworker.ai/blog/intercom-fin-pricing
- https://myaskai.com/features/copilot-internal-note-reply
- https://community.intercom.com/ideas/fin-ai-draft-email-replies-for-human-review-14419
- https://www.alibabacloud.com/help/en/tablestore/table-store-service/product-overview/basic-concepts
- https://docs.cloud.google.com/compute/docs/regions-zones
- https://help.aliyun.com/en/tablestore/user-guide-10/
- https://docs.aws.amazon.com/global-infrastructure/latest/regions/aws-availability-zones.html
- https://cloud.google.com/about/locations
- https://docs.wasabi.com/docs/where-is-my-data-stored-and-how-are-wasabis-storage-regions-secured
- https://northflank.com/cloud/aws/regions/ap-southeast-1
- https://weiyuan-liu.medium.com/aws-ap-southeast-5-is-live-in-malaysia-what-does-that-mean-for-all-of-us-b88972c6dc72
- https://support.hpe.com/hpesc/public/docDisplay?docId=sd00003463en_us&page=dom_sup_regions_dscc.html&docLocale=en_US
- https://www.alibabacloud.com/help/en/tablestore/memory-storage-service-sub-product-test/news-and-announcements
- https://intelligence.dlapiper.com/artificial-intelligence/countries/south-korea/07-controls-on-generative-ai.html
- https://www.trade.gov/market-intelligence/south-korea-ai-basic-act
- https://securiti.ai/south-korea-basic-act-on-development-of-ai/
- https://www.stimson.org/2026/south-koreas-ai-basic-act-seeking-balance-between-industry-innovation-and-social-risk/
- https://www.linkedin.com/posts/alisarmustafa1_south-korea-enacts-the-ai-basic-act-the-activity-7421975660513935360-Pf7N
- https://aibasicact.kr/explorer/
- https://www.tti.org/post/harnessing-the-power-of-trip-com-s-ai-assistant-tripgenie
- https://www.webintravel.com/tripgenie-turns-two-expands-ai-capabilities-to-enhance-travel-assistance/
- https://traveltomorrow.com/trip-com-introduces-smarter-travel-planning-with-ai-assistant-tripgenie/
- https://www.linkedin.com/posts/trip-com_three-years-of-tripgenie-activity-7432741272731422720-yj0L
- https://www.alibabacloud.com/product/airec?spm=a3c0i.aigen-81073921.1905590772.109
- https://www.alibabacloud.com/help/doc-detail/331870.html
- https://www.alibabacloud.com/blog/601055
- https://www.alibabacloud.com/blog/increase-conversion-rates-and-revenue-with-ai-powered-personalized-recommendations%C2%A0_598432
- https://www.youngurbanproject.com/alibaba-case-study/
- https://platform.softwareone.com/product/airec/PCP-9285-6488
- https://www.alibabacloud.com/help/doc-detail/331865.html
- https://www.lift-ai.com/success-stories
- https://alphacrc.com/resources/case-studies/alibaba-cloud-content-creation-services/
- https://sourceforge.net/software/compare/Alibaba-Cloud-AIRec-vs-Alie/
- https://www.linkedin.com/posts/parthasarathik_ai-travel-planner-multi-agent-system-an-activity-7480200070307471360-Zxl_
- https://nayakpplaban.medium.com/building-a-multi-agent-travel-planning-system-with-agent2agent-protocol-b870b58decff
- https://link.springer.com/article/10.1007/s44163-026-01090-w
- https://vstorm.co/agentic-ai/human-in-the-loop-ai-agents-permission-to-change-the-plan/
- https://www.youtube.com/watch?v=OACqJpzb9P0
- https://www.tothenew.com/blog/beyond-itineraries-building-an-ai-powered-smart-travel-planner-with-agents-maps-voice-more/
- https://pub.towardsai.net/multi-agent-travel-planner-with-agno-workflows-and-langfuse-observability-f0f6ec21a7ad
- https://www.ottotheagent.com/product-marketing/the-fastest-way-to-book-business-travel-an-ai-travel-agent-that-does-it-for-you
- https://payhawk.com/help/overview-of-the-travel-ai-agent
- https://aws.amazon.com/blogs/machine-learning/build-a-voice-travel-concierge-with-amazon-bedrock-agentcore-managed-knowledge-base-and-nova-sonic/
- https://docs.aws.amazon.com/solutions/building-travel-assistants-using-amazon-bedrock-agents/
- https://dev.to/aws-builders/building-a-proactive-ai-travel-agent-on-aws-my-journey-with-bedrock-agentcore-part-2-199i
- https://github.com/hvmathan/bedrock-travel-agent
- https://builder.aws.com/content/3CoTN3Aga6kB8LKiAONnL81og5i/building-a-production-grade-multi-agent-ai-travel-concierge-with-aws-step-functions-and-amazon-bedrock
- https://aws.amazon.com/blogs/machine-learning/build-real-time-travel-recommendations-using-ai-agents-on-amazon-bedrock/
- https://www.youtube.com/watch?v=O7e5Hvguvt0
- https://repost.aws/questions/QU8Y6AGkSCRiW5cMibH7tadw/agentic-generative-ai-architecture-opinions
- https://medium.com/@ahsan.shaokat/building-a-multi-agent-travel-planner-on-amazon-bedrock-873277d045b9
- https://aws.amazon.com/blogs/machine-learning/creating-asynchronous-ai-agents-with-amazon-bedrock/
- https://codelabs.developers.google.com/codelabs/production-ready-ai-with-gc/3-developing-agents/build-a-multi-agent-system-with-adk
- https://cloud.google.com/blog/products/ai-machine-learning/build-multi-agentic-systems-using-google-adk
- https://developers.google.com/workspace/add-ons/samples/travel-concierge
- https://github.com/AashiDutt/Google-Agent-Development-Kit-Demo
- https://medium.com/google-cloud/google-adk-2-collaborative-multi-agent-patterns-a-practical-guide-5c696ba556d2
- https://www.youtube.com/watch?v=m0fPTVlHEH0
- https://www.datacamp.com/tutorial/agent-development-kit-adk
- https://arjunprabhulal.com/adk-multi-agent-systems/
- https://www.linkedin.com/pulse/from-spreadsheet-suitcase-guide-building-travel-agents-patnaik-rjr3c
- https://www.codecademy.com/article/build-an-ai-travel-assistant-with-google-agent-development-kit-adk
- https://www.multistate.us/insider/2026/4/30/state-childrens-online-safety-laws-expand-beyond-social-media-in-2026
- https://www.gov.ca.gov/2026/09/10/governor-newsom-signs-the-strongest-child-safety-chatbot-and-social-media-laws-in-the-nation/
- https://www.facebook.com/laurenskids/videos/when-ai-companies-create-features-that-could-put-children-at-risk-who-should-be-/2217141732521644/
- https://www.law.georgetown.edu/tech-institute/research-insights/insights/how-existing-laws-apply-to-ai-chatbots-for-kids-and-teens-2/
- https://csgsouth.org/policies/artificial-intelligence-and-youth-online/
- https://www.facebook.com/News12LI/posts/ai-safeguards-could-an-ai-chatbot-pose-as-your-childs-friend-new-yorks-new-laws-/1552356316921201/
- https://www.billtrack50.com/info/blog/regulating-ai-companions-before-they-raise-our-kids
- https://industryselfregulation.org/media-resource/media/blog/ai-chatbot-regulations
- https://www.hunton.com/privacy-and-cybersecurity-law-blog/california-enacts-companion-chatbot-child-safety-requirements
- https://withpersona.com/blog/ai-companion-chatbot-apps-age-assurance-regulations/
- https://www.alibabacloud.com/help/en/model-studio/base-url
- https://www.alibabacloud.com/help/tr/model-studio/what-is-model-studio
- https://www.ntop.org/wp-content/uploads/2026/06/Ntop_Qwen_0626.pdf
- https://sovereignsky.no/datacenters/alibaba/
- https://www.alibabacloud.com/help/en/model-studio/fine-tuning-api-guide
- https://www.alibabacloud.com/help/en/model-studio/create-fine-tuning-job-api
- https://www.alibabacloud.com/blog/fine-tuning-ai-models-on-alibaba-cloud-pai-a-practical-guide_603422
- https://www.alibabacloud.com/help/en/model-studio/model-training-overview
- https://chozan.co/alibaba-cloud/
- https://www.digitalapplied.com/blog/ai-customer-support-statistics-2026-adoption-roi-data
- https://crisp.chat/en/reports/state-of-ai-support/
- https://www.getmacha.com/blog/customer-service-ai-statistics
- https://fin.ai/learn/ai-customer-service-cost-savings-industry
- https://wonderchat.io/blog/ai-customer-support-benchmarks
- https://aissist.io/industries/ai-customer-service-benchmark-2026
- https://unthread.io/blog/customer-support-cost-per-resolution-statistics/
- https://www.tommasomariaricci.com/blog/ai-for-customer-service-guide-2026
- https://theirstack.com/en/technology/alibaba-cloud/sg
- https://www.sdxcentral.com/news/alibaba-cloud-eyes-expansion-into-southeast-asia-with-new-products-partners/
- https://www.youtube.com/watch?v=K-4zGeIejE4&vl=en-US
- https://resource.alibabacloud.com/webinar/detail.html?id=1467
- https://www.nextiva.com/blog/customer-service-statistics.html
- https://cxtrends.zendesk.com/gb/
- https://www.youtube.com/watch?v=elVLpMw0GiE
- https://www.zendesk.com/blog/ccaas/contact-center/top-contact-center-trends/
- https://www.linkedin.com/posts/zendesk_cxtrends26-activity-7425529078998335488-eyJd
- https://cxtrends.zendesk.com/about/
- https://www.alibabacloud.com/en/product/intelligent-speech-interaction?_p_lc=1
- https://www.alibabacloud.com/help/en/isi/getting-started/regions-and-domain-names
- https://www.alibabacloud.com/help/en/isi/user-guide/real-time-speech-recognition/
- https://help.aliyun.com/en/isi/getting-started/regions-and-domain-names
- https://www.alibabacloud.com/blog/transcribe-speech-to-text-in-real-time-using-alibaba-cloud-intelligent-speech-interaction_598700
- https://sourceforge.net/software/compare/Alibaba-Cloud-Intelligent-Speech-Interaction-vs-Soniox/
- https://statusgator.com/services/alibaba-cloud/intelligent-speech-interaction
- https://medium.com/@santhakumar.munuswamy/kickstart-with-intelligent-speech-interaction-in-alibaba-cloud-part-1-ec841c21c9b6
- https://www.alibabacloud.com/help/intelligent-speech-interaction/
- https://www.alibabacloud.com/blog/scaling-genai-globally-with-alibaba-cloud-platform-for-ai-pai-%26-eas_603465
- https://www.alibabacloud.com/help/en/pai/overview-2
- https://www.alibabacloud.com/help/en/pai/deploy-an-llm/
- https://www.alibabacloud.com/help/en/pai/deploy-a-model-service-by-using-a-custom-image
- https://www.alibabacloud.com/blog/600704
- https://www.alibabacloud.com/help/en/pai/product-overview/eas-quick-start
- https://www.alibabacloud.com/help/en/pai/model-service-deployment-by-using-the-pai-console/
- https://www.facebook.com/alibabacloud/videos/model-studio-finalmp4/874348851197500/
- https://www.alibabacloud.com/blog/end-to-end-mlops-pipeline-with-alibaba-cloud-pai-dsw-pai-dlc-oss-and-pai-eas_603081
- https://www.alibabacloud.com/en/product/sddp?_p_lc=1
- https://www.alibabacloud.com/help/en/dsc/data-security-center/user-guide/data-de-identification
- https://www.alibabacloud.com/help/en/dataworks/user-guide/create-a-data-masking-rule
- https://www.alibabacloud.com/help/en/dsc/data-security-center/product-overview/release-notes
- https://help.aliyun.com/en/document_detail/3013010.html
- https://www.alibabacloud.com/help/en/security-center/supported-regions
- https://www.alibabacloud.com/help/en/dsc/data-security-center/
- https://www.alibabacloud.com/blog/599994
- https://www.alibabacloud.com/blog/plaintext-stays-put-logs-stay-useful-sensitive-data-protection-with-alibaba-cloud-observability_603543
- https://www.alibabacloud.com/help/en/oss/user-guide/oss-sensitive-data-desensitization
- https://www.requesty.ai/models/alibaba
- https://www.alibabacloud.com/help/en/model-studio/qwen-plus
- https://www.alibabacloud.com/help/en/model-studio/qwen3-asr-flash-realtime
- https://www.facebook.com/alibabacloud/posts/qwen38-flash-is-now-live-in-hong-kong-on-alibaba-cloud-model-studio-bringing-pow/1581974067308013/
- https://ottermind.ai/skills/alicloud-ai-audio-asr
- https://www.alibabacloud.com/help/en/model-studio/qwen3-8-27b
- https://www.alibabacloud.com/help/en/model-studio/text-rerank-api
- https://www.alibabacloud.com/help/doc-detail/3026956.html
- https://www.alibabacloud.com/help/en/model-studio/qwen3-7-text-embedding
- https://www.alibabacloud.com/help/en/isi/llms.txt
- https://www.alibabacloud.com/help/tr/isi/getting-started/regions-and-domain-names
- https://www.alibabacloud.com/help/en/isi/
- https://slashdot.org/software/comparison/Alibaba-Cloud-Intelligent-Speech-Interaction-vs-Voicv/
- https://sourceforge.net/software/compare/AccuSpeechMobile-vs-Alibaba-Cloud-Intelligent-Speech-Interaction/
- https://www.alibabacloud.com/blog/intelligent-speech-interaction-transforming-human-computer-interaction_601043
- https://www.alibabacloud.com/help/en/starops/security-and-compliance/data-security-compliance-instructions
- https://www.alibabacloud.com/blog/alibaba-cloud-data-security-center_603202
- https://www.imda.gov.sg/-/media/imda/files/industry-development/infrastructure/csp-selfdisclosure-formalibaba-cloudsigned.pdf
- https://help.aliyun.com/en/starops/product-overview/supported-regions-of-starops
- https://www.alibabacloud.com/en/product/security_center?_p_lc=1
- https://www.alibabacloud.com/help/en/open-search/search-platform/developer-reference/text-generation-api-details
- https://builder.aws.com/content/3FyL8ge8GfUEY00lSL6vw2loRZA/crossing-clouds-with-qwen-ai-and-alibaba-cloud
- https://help.aliyun.com/en/model-studio/web-search-agent-guide
- https://apps.apple.com/ye/app/qwen-alibaba-ai-assistant/id6757738627
- https://www.alibabacloud.com/en/product/oss/pricing?_p_lc=1
- https://www.alibabacloud.com/help/en/oss/user-guide/what-is-oss
- https://www.alibabacloud.com/en/product/object-storage-service?_p_lc=1
- https://www.alibabacloud.com/blog/alibaba-cloud-oss-from-object-storage-to-ai-native-data-infrastructure-with-vector-bucket-%26-metaquery_602863
- https://docs.cyberduck.io/protocols/s3/alibaba/
- https://medium.com/@rajak.rohit786/alibaba-object-storage-service-oss-migration-48d9496d039
- https://www.alibabacloud.com/help/en/oss/faq-15
- https://technologychecker.io/technology/alibaba-cloud-object-storage-service
- https://www.youtube.com/watch?v=SffwBpWvH6Q
- https://www.alibabacloud.com/help/en/model-studio/qwen3-8-max
- https://www.facebook.com/alibabacloud/posts/qwen38-flash-is-now-available-in-the-european-union-on-alibaba-cloud-model-studi/1582315680607185/
- https://www.alibabacloud.com/help/en/model-studio/qwen3-8-omni-flash-realtime
- https://www.alibabacloud.com/blog/alibaba-releases-qwen3-8-flash-with-innovative-model-architecture-delivering-optimal-price-performance_603503
- https://sourceforge.net/software/compare/Alibaba-Cloud-Model-Studio-vs-Qwen3.8-Flash-Next/
- https://www.alibabacloud.com/help/en/model-studio/qwen3-5-flash
- https://www.alibabacloud.com/help/en/content-moderation/latest/access-guide
- https://www.alibabacloud.com/help/en/content-moderation/latest/what-is-ai-security-barrier
- https://www.alibabacloud.com/help/en/content-moderation/latest/text-moderation-enhanced-multilingual-service-api
- https://www.alibabacloud.com/blog/ai-guardrails-real-time-protection-for-llms-and-ai-agents%C2%A0_603442
- https://help.aliyun.com/en/pai/content-security-configuration
- https://help.aliyun.com/en/model-studio/new-free-quota
- https://www.alibabacloud.com/help/en/model-studio/new-free-quota-validity-adjustment
- https://x.com/konig0000/status/2100641615903907960
- https://www.alibabacloud.com/help/en/model-studio/token-plan-personal-overview
- https://www.facebook.com/alibabacloud/posts/one-plan-every-modality-great-valuethe-alibaba-cloud-token-plan-for-individuals-/1484920713680016/
- https://www.alibabacloud.com/en/notice/model_studio_update_of_qwen_vlplus_4fa?_p_lc=1
- https://www.alibabacloud.com/blog/designing-enterprise-ai-agent-architectures-with-alibaba-cloud_603528
- https://help.aliyun.com/en/model-studio/managed-agents-cost-tiering
- https://agentswitchboard.dev/agents/model-studio-cli
- https://www.alibabacloud.com/help/en/functioncompute/create-a-sandbox-function-template
- https://www.alibabacloud.com/help/en/functioncompute/using-the-cloud-sandbox-via-the-cli
- https://www.alibabacloud.com/help/en/cs/user-guide/agent-sandbox/
- https://www.alibabacloud.com/help/doc-detail/3045121.html
- https://e2b.dev/
- https://www.alibabacloud.com/help/en/functioncompute/code-interpreter-of-fc-agent-sandbox/
- https://github.com/opensandbox-group/OpenSandbox
- https://www.alibabacloud.com/help/en/direct-mail/user-guide/set-up-eventbridge
- https://www.alibabacloud.com/blog/apache-rocketmq-eventbridge-why-your-genai-needs-eda_602745
- https://www.alibabacloud.com/help/en/eventbridge/use-cases/integrate-yuque
- https://www.alibabacloud.com/blog/rocketmq-5-0-what-characteristics-does-event-driven-in-the-cloud-era-have_601273
- https://help.aliyun.com/en/eventbridge/user-guide/event-source-overview
- https://www.alibabacloud.com/help/en/functioncompute/api-fc-open-2021-04-06-struct-eventsourceconfig
- https://rocketmq.apache.org/docs/
- https://repost.aws/questions/QUKeMOKETSQ5qMP8JDbooAvQ/advice-on-receiving-webhooks-and-generating-eventbridge-events
- https://www.alibabacloud.com/help/en/sls/notification-methods
- https://www.alibabacloud.com/blog/apache-rocketmq-eventbridge-build-the-next-generation-of-event-driven-engines_600608
- https://www.alibabacloud.com/help/en/direct-mail/email-sending-faqs
- https://www.alibabacloud.com/en/product/directmail/pricing?_p_lc=1
- https://www.alibabacloud.com/help/en/direct-mail/user-guide/overview
- https://help.aliyun.com/en/direct-mail/getting-started/simplified-procedure-of-sending-by-api-and-smtp
- https://www.alibabacloud.com/help/en/direct-mail/product-overview/limits
- https://www.alibabacloud.com/blog/how-to-send-emails-using-directmail-on-alibaba-cloud_599605
- https://www.alibabacloud.com/help/en/direct-mail/user-guide/dedicated-ip
- https://sourceforge.net/software/compare/Alibaba-Cloud-Direct-Mail-vs-SMTP-Provider/
- https://www.youtube.com/watch?v=6XR9QRM1Cn4
- https://www.quora.com/How-can-we-use-the-Alibaba-Cloud-DirectMail-service-as-the-SMTP-provider-for-our-WordPress-applications-transactional-emails
- https://www.facebook.com/alibabacloud/videos/run-your-workloads-during-off-peak-hours-with-alibaba-cloud-model-studio/2060340144693947/
- https://docs.qoder.com/events/offpeakrate
- https://finance.yahoo.com/technology/ai/articles/qoder-introduces-time-day-credits-055700158.html
- https://www.instagram.com/p/DbpqvqejAtx/
- https://x.com/alibaba_cloud/status/2069608611266060456
- https://www.eesel.ai/blog/qwen38-max-pricing
- https://www.facebook.com/alibabacloud/posts/-your-workday-just-got-cheaperoff-peak-rates-are-now-available-across-all-qoder-/1462275869277834/
- https://computeprices.com/models/qwen3-8-max
- https://qwen.ai/blog?id=qwen3.8
- https://www.facebook.com/alibabacloud/posts/qwen38-max-just-got-upgraded-meet-qwen38-max-090224t-parameters-1m-context-token/1525132512992169/
- https://aivancity.ai/en/blog/qwen3-8-max-codage-agents-ia-performances-limites/
- https://coursiv.io/blog/qwen-3-8
- https://neomanex.com/news/qwen3-8-max-conditional-published-pricing
- https://datanorth.ai/news/alibaba-releases-qwen3-8-max
- https://llm-stats.com/models/compare/qwen3.5-27b-vs-qwen3.8-max
- https://www.facebook.com/alibabacloud/posts/qwen-conference-2026-invites-you-to-step-inside-the-innovation-following-our-glo/1423089846529770/
- https://www.alibabacloud.com/en/notice/model_studio_update_notice_for_qwen3max_6a2?_p_lc=1
- https://home.alibabagroup.com/en-US/document-2041268239081668608
- https://www.facebook.com/alibabacloud/videos/alibaba-cloud-singapore-at-atxenterprise-2026-ai-cloud-and-data-innovation/1388429546671739/
- https://www.digitalapplied.com/blog/alibaba-agent-native-cloud-waic-agentrun-agentloop-2026
- https://www.alibabacloud.com/help/en/agentloop/developer-reference/api-agentloop-2026-05-20-dir-region/
- https://kaopiz.com/en/articles/cloud-service-providers/
- https://www.facebook.com/hostingdiscussion/posts/alibaba-cloud-just-announced-its-next-round-of-expansion-with-new-regions-coming/1441248401522540/
- https://www.alibabacloud.com/blog/alibaba-cloud-accelerates-worldwide-ai-innovation-and-adoption-across-industries_602944
- https://sgai.md/ecosystem/alibaba-cloud/
- https://help.aliyun.com/en/es/user-guide/alibaba-cloud-ai-search-solution
- https://www.alibabacloud.com/en/events/ai-big-data-summit-2024?_p_lc=1
- https://www.reddit.com/r/Qwen_AI/comments/1sl01h3/the_alibaba_coding_plan_lite_can_no_longer_be/
- https://www.youtube.com/watch?v=x2HenpowB4Y
- https://www.alibabacloud.com/help/en/model-studio/access-model-studio-through-privatelink
- https://www.alibabacloud.com/help/tr/model-studio/access-model-studio-through-privatelink
- https://help.aliyun.com/en/model-studio/access-model-studio-through-privatelink
- https://www.alibabacloud.com/help/doc-detail/469318.html
- https://www.alibabacloud.com/help/en/functioncompute/regions
- https://rainvent.ai/coding-models-in-october-2026-benchmarks-prices-and-flat-rate-plans-open-weights-against-claude-gpt-and-gemini/
- https://www.alibabacloud.com/help/en/cloud-firewall/cloudfirewall/product-overview/supported-regions
- https://help.aliyun.com/en/agentcore/operating-guide/
- https://www.alibabacloud.com/help/en/mse/product-overview/supported-regions
- https://www.alibabacloud.com/help/en/nas/developer-reference/api-nas-2017-06-26-endpoint
- https://ai-security-docs.akto.io/akto-argus-agentic-ai-security-for-homegrown-ai/connectors/ai-agent-security/connect-akto-with-alibaba-cloud
- https://www.elastic.co/docs/reference/cloud/cloud-hosted/regions
- https://www.alibabacloud.com/help/en/cadt/llms.txt
- https://www.youtube.com/shorts/hL55xUR9hbM
- https://www.alibabacloud.com/help/en/model-studio/token-plan-team-faq
- https://www.quora.com/What-is-Alibaba-Cloud-Model-Studio
- https://pub.towardsai.net/qwen-3-8-max-is-one-of-the-best-models-and-its-cheap-fb20a27b90f3
- https://ai-on-mac.com/articles/qwen3-8-max-pricing-benchmarks-mac-en/
- https://www.layer3labs.io/guides/qwen3-8-max-pricing
- https://www.yottalabs.ai/post/qwen-3-8-max-release-date-specs-how-to-access-2026
- https://www.techrepublic.com/article/news-alibaba-qwen3-8-max-pricing-open-weights/
- https://www.alibabacloud.com/help/en/sae/product-overview/billing-new
- https://help.aliyun.com/en/agentcore/agentcore-billing-instructions
- https://sandbox0.ai/alternatives/alibaba-agentrun
- https://getdeploying.com/alibaba-cloud
- https://cloudinsight.cc/en/blog/tencent-vs-alibaba-cloud-comparison
- https://www.alibabacloud.com/en/product/function-compute/pricing
- https://www.alibabacloud.com/help/en/functioncompute/pay-as-you-go-billing-methods
- https://cloudpricecalculators.com/alibaba-calculator/
- https://www.alibabacloud.com/help/en/functioncompute/billing-fc/
- https://www.alibabacloud.com/notice/fc20231024
- https://paazmaya.fi/price-tier-comparison-of-cloud-function-providers/
- https://www.alibabacloud.com/help/tr/sae/product-overview/billing-new
- https://www.alibabacloud.com/help/en/analyticdb/analyticdb-for-postgresql/product-overview/pricing-1
- https://www.alibabacloud.com/help/en/analyticdb/analyticdb-for-postgresql/product-overview/serverless-mode-released-for-analyticdb-for-postgresql
- https://db-engines.com/en/system/Alibaba+Cloud+AnalyticDB+for+PostgreSQL
- https://www.alibabacloud.com/help/en/analyticdb/analyticdb-for-postgresql/product-overview/selection-of-instance-types-and-specifications
- https://www.rfp.wiki/cloud-computing/cloud-database-management-systems/amazon-aurora/alibaba-cloud-analyticdb
- https://apsarastackdocument.oss-cn-hangzhou.aliyuncs.com/%E5%9B%BD%E9%99%85%E7%89%88%E6%96%87%E6%A1%A3/v3.18.6%E7%89%88%E6%9C%AC%E6%96%87%E6%A1%A3/%E4%BA%91%E5%8E%9F%E7%94%9F%E6%95%B0%E6%8D%AE%E4%BB%93%E5%BA%93%20AnalyticDB%20PostgreSQL%E7%89%88/Alibaba%20Cloud%20Apsara%20Stack%20V3.18.6%20AnalyticDB%20AnalyticDB%20for%20PostgreSQL%20User%20Guide%2020250616.pdf
- https://www.alibabacloud.com/help/en/analyticdb/product-overview/product-overview-3
- https://www.alibabacloud.com/help/en/hologres/product-overview/billing-overview
- https://www.alibabacloud.com/en/product/hologres?_p_lc=1
- https://www.alibabacloud.com/help/en/hologres/product-overview/pay-as-you-go
- https://www.alibabacloud.com/help/en/hologres/user-guide/serverless-instance-usage-guide
- https://help.aliyun.com/en/hologres/user-guide/billing
- https://www.alibabacloud.com/help/en/hologres/user-guide/endpoints-for-connecting-to-hologres
- https://superset.apache.org/user-docs/databases/supported/hologres/
- https://www.alibabacloud.com/help/en/hologres/getting-started/purchase-a-hologres-instance
- https://fin.ai/learn/global-customer-service-ai-agent
- https://fin.ai/channels/email
- https://www.reddit.com/r/customerexperience/comments/1mh1u17/is_70_resolution_rate_achievable_with_intercoms/
- https://www.intercom.com/blog/fin-over-email-how-we-built
- https://www.vocallabs.ai/blogs/decagon-ai-voice-agents-enterprise-review-2026
- https://modal.com/blog/decagon-case-study
- https://decagon.ai/guides/driving-revenue-with-outbound-voice-ai
- https://decagon.ai/blog/pricing-ai-agents
- https://stonly.com/blog/decagon-alternatives/
- https://poly.ai/customers/pge
- https://www.linkedin.com/posts/nikola-mrksic_this-case-study-is-a-must-watch-and-it-might-activity-7361473508712849408-9Wrz
- https://growwstacks.com/blog/polyai-voice-agents-reduce-handling-time/
- https://zenn.dev/kiiwami/articles/7afb9d136edead03?locale=en
- https://poly.ai/resources/case-studies
- https://www.youtube.com/playlist?list=PL0uPNmCXE46GzRw8cI099bx_ub1vh88wl
- https://www.youtube.com/watch?v=u8iZY64MWxM
- https://poly.ai/customers
- https://sales.stevieawards.com/awards/sascs-winners/2026/gold-winner/polyai-customer-support-solution-new-or-new-version/
- https://www.mdpi.com/0718-1876/21/8/251
- https://amperity.com/announcements/amperity-releases-2025-state-of-ai-in-travel-and-airlines-report-revealing
- https://intellias.com/ai-agents-airline-customer-service-case-study/
- https://www.emerald.com/jhtt/article/16/5/986/1253084/Airline-chatbot-examining-the-response-of-outcome
- https://ray.yorksj.ac.uk/id/eprint/13831/1/Evaluating%20the%20Impact%20of%20AI-Powered%20Chatbots%20on%20Customer%20Service%20Management%20and%20Satisfaction%20in%20a%20Multinational%20Corporation%20A%20Case%20Study%20of%20Nestl%C3%A9%20Nigeria.pdf
- https://www.tandfonline.com/doi/full/10.1080/29931282.2025.2496475
- https://econsultancy.com/genai-customer-service-results-verizon-ing-united-airlines/
- https://rasa.com/blog/conversational-ai-for-airlines
- https://masterofcode.com/blog/airline-chatbot
- https://sitegpt.ai/blog/companies-using-chatbots-for-customer-service
- https://www.forrester.com/blogs/alibabas-next-chapter-from-ai-native-to-agent-native/
- https://www.facebook.com/AlibabaCloudSEA/posts/empowering-enterprises-with-native-ai-agentsat-apsaraconference2026-qi-zhou-vice/1115373814390517/
- https://www.facebook.com/alibabacloud/videos/what-does-it-take-for-ai-to-earn-trust-in-the-enterpriseat-apsaraconference2026-/2040542960236332/
- https://www.venturesquare.net/en/1085784/
- https://www.alibabacloud.com/help/en/model-studio/coding-plan
- https://www.alibabacloud.com/blog/experience-the-power-of-ai-with-alibaba-cloud-model-studio_601353
- https://www.alibabacloud.com/blog/alibaba-cloud-launches-qwen-cloud-for-global-markets_603191
- https://x.com/AlibabaGroup/status/2059478019216150913
- https://www.alibabacloud.com/en/alibaba-cloud-global-summit-2025?_p_lc=1
- https://www.reddit.com/r/Qwen_AI/comments/1v1n8cg/does_alibaba_cloud_international_token_plan_lite/
- https://www.facebook.com/alibabacloud/posts/alibabas-qwen-powers-ai-singapores-latest-llm-to-strengthen-multilingual-perform/1282315870607169/
- https://www.straitstimes.com/tech/alibaba-cloud-joins-other-tech-firms-to-lure-smes-students-in-singapore-with-free-ai-tools
- https://www.alibabacloud.com/press-room/first-public-cloud-region-in-the-netherlands
- https://www.facebook.com/alibabacloud/videos/infron-serving-open-source-models-globally-on-alibaba-cloud/1439472007970930/
- https://eventbrowse.com/organizer/alibaba-cloud/
- https://www.eqs-news.com/news/corporate/alibaba-cloud-announces-international-expansion-plans-to-power-the-next-generation-ai-innovations/00a53ae2-7ffb-4449-bf46-abc2e9fb759c_en
- https://www.cloudinfrastructuremap.com/
- https://www.alibabacloud.com/blog/603186
- https://www.facebook.com/alibabacloud/videos/qwen-conference-2026-join-the-ai-native-momentum-in-singapore/1501300851459074/
- https://omdia.tech.informa.com/om145535/qwen-conference-2026-is-a-window-into-alibaba-clouds-vision-for-the-agentic-era
- https://www.instagram.com/p/DYttf5nFaeS/
- https://www.alibabacloud.com/blog/qwen-conference-2026-a-first-look-at-the-exhibition-highlights_603119
- https://qwencloud-hackathon.devpost.com/rules
- https://aws.amazon.com/architecture/well-architected/
- https://aws.amazon.com/blogs/architecture/announcing-the-aws-well-architected-generative-ai-lens/
- https://aws.amazon.com/blogs/architecture/automating-agentic-ai-well-architected-reviews-with-the-aws-agentic-ai-lens/
- https://builder.aws.com/content/3L6OqkW7s1r06JMpeeXBdb6rgSQ/the-six-pillars-and-the-four-an-ai-agent-now-reviews-aws-well-architected-agent-in-plain-english
- https://anivion-digital.com/blog/aws-agentic-ai-lens-enterprise-architecture
- https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/appendix-a.html
- https://www.lyft.com/blog/posts/lyft-and-anthropic-team-up-to-redefine-customer-obsessed-ai
- https://www.youtube.com/watch?v=sZHGbRYQti4
- https://www.customerexperiencedive.com/news/lyfts-agentic-ai-resolution-times/806558/
- https://www.linkedin.com/posts/joel-j-pirtle_lyft-deploys-anthropics-generative-ai-in-activity-7316975877186035712-ud-8
- https://www.anthropic.com/news/lyft-announcement
- https://www.facebook.com/groups/chatgpt4u/posts/1456867041609667/
- https://claude.com/customers/lyft
- https://www.instagram.com/p/DeHio_DDpsq/
- https://akhildakinedi.com/work/redefining-support-messaging-at-lyft
- https://asksurf.ai/pulse/en/lyft-ai-agents-customer-service-automation
- https://www.youtube.com/watch?v=5-TgosbVtt8
- https://www.customerexperiencedive.com/news/verizon-ceo-ai-take-over-a-large-percentage-of-customer-service/822158/
- https://www.verizon.com/business/answers/generative-ai-customer-service/
- https://www.instagram.com/reel/DZU8n0Eg7Vo/?hl=en
- https://econsultancy.com/topics/customer-experience/customer-service/
- https://simpleflying.com/united-airlines-generative-ai-improvement-customer-satisfaction/
- https://www.slalom.com/us/en/customer-stories/united-airlines-gen-ai
- https://finance.yahoo.com/sectors/technology/articles/verizon-ceo-ai-over-large-141300231.html
- https://tei.forrester.com/go/polyAI/PolyAITEI/
- https://poly.ai/guides/forrester-tei-report
- https://www.prnewswire.com/news-releases/polyai-customers-achieved-391-return-on-investment-according-to-total-economic-impact-study-302515545.html
- https://bera.ai/bera-users-see-391-roi-forrester-tei-study-finds/
- https://trustarc.com/resource/forrester-tei-roi-of-privacy-report/
- https://www.forrester.com/research/roi-forrester-decisions/
- https://www.dynatrace.com/resources/forrester-total-economic-impact-report-20050213/
- https://www.glean.com/resources/guides/forrester-study-the-total-economic-impact-of-glean
- https://writer.com/blog/forrester-tei-findings/
- https://www.symphonyai.com/resources/forrester-total-economic-impact
- https://fin.ai/learn/ai-guardrails-customer-service
- https://www.parloa.com/knowledge-hub/what-are-ai-hallucinations/
- https://yuma.ai/blogs/ai-hallucinations-in-customer-service-why-quality-control-architecture-matters
- https://www.reddit.com/r/aiagents/comments/1s5nenx/ai_hallucinations_killing_customer_trust_how_do/
- https://dev.to/aws/ai-agent-guardrails-rules-that-llms-cannot-bypass-596d?trk=87c4c426-cddf-4799-a299-273337552ad8&sc_channel=el
- https://www.omago.ai/blog/can-you-trust-ai-customer-service-guardrails
- https://irisagent.com/blog/how-to-reduce-ai-hallucinations-in-customer-support/
- https://www.siena.cx/blog/preventing-ai-hallucinations-in-customer-support-a-practical-approach
- https://chatspark.io/blog/prevent-ai-chatbot-hallucinations-customer-support
- https://aws.amazon.com/blogs/aws/minimize-ai-hallucinations-and-deliver-up-to-99-verification-accuracy-with-automated-reasoning-checks-now-available/
- https://www.alibabacloud.com/help/en/chatapp/product-overview/viber
- https://sinch.com/blog/most-popular-messaging-apps-by-country/
- https://help.aliyun.com/en/account/aliyun-vs-alibaba-cloud
- https://help.aliyun.com/en/model-studio/multimodal-call-app
- https://www.alibabacloud.com/help/en/chatapp/developer-reference/api-cams-2020-06-06-endpoint
- https://www.alibabacloud.com/help/en/mns/product-overview/regions-and-endpoints
- https://www.alibabacloud.com/blog/2024-alibaba-cloud-communication-promotion-special-offers-on-sms-and-chat-app_601655
