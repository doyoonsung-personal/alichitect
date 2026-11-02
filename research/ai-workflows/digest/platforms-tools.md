# AI & Agents View — Implementation Digest

## 1. Decisions this supports

- **Agent runtime for international:** Use AgentRun code-first runtime in Singapore; do not offer low-code Flow Agent (maintenance mode since 2026-09-18) or Open Platform/FunAgent (do not activate). [NOTES.md, Adjudicate-1]
- **AgentCore is available in Singapore** at $0.000015/CU compute + $0.60/hour collaboration control plane; free offer ended 2026-10-18. Its KB connector reads only Beijing Model Studio KBs (read-only). [NOTES.md, Batch 2 & Adjudicate-1]
- **AgentBay is closed to new customers** as of 2026-11-02; successor is Agent Sandbox Flash Edition. Do not recommend for new proposals. [NOTES.md, Adjudicate-1]
- **AI Guardrails is available internationally** (SG, HK, Frankfurt, Virginia); bills $6/10k calls per enabled detection type (content compliance, sensitive content, prompt injection), not bundled. Commodity code: `lvwang_guardrail_public_intl`. SG endpoint: `green-cip.ap-southeast-1.aliyuncs.com`. [NOTES.md, Adjudicate-1]
- **Model Studio endpoints:** Route Singapore traffic to workspace-specific hosts `https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1`; Responses API uses `/compatible-mode/v1/responses`. Legacy `dashscope.aliyuncs.com` stopped receiving features after 2026-09-30. [NOTES.md, Batch 3 & Adjudicate-1]
- **Deployment scope dictates price and processing location:** International scope (Singapore) costs more than Global scope (Frankfurt, Tokyo, HK, Virginia). Inference may run outside the storage region. Cost estimator must include scope. [NOTES.md, Batch 1]
- **Web search tool cost:** $10/1,000 calls in Singapore plus tokens. Text-to-image search (`web_search_image`) is $8/1,000 in SG. Web extractor and code interpreter are temporarily free but add tokens. [NOTES.md, Batch 1]
- **Inbound email:** No Alibaba Cloud inbound-email service exists. Diagrams must show customer-provided mailbox → EventBridge/FC. Direct Mail is outbound only. [Report §8, confirmed NOTES.md Batch 2]
- **AI Gateway Serverless edition:** Preview was mainland+HK only and has ended. International customers must use Dedicated instances. [NOTES.md, Batch 3]
- **MCP marketplace:** Model Studio MCP/Skills CLI is China-site accounts only. International MCP path: AI Gateway proxy + AgentRun Tool Marketplace + hosted OpenAPI MCP Server + self-hosted OSS servers. [Report §2, confirmed NOTES.md Batch 3]
- **Zero-code app features (KB, prompt engineering):** Gated behind 2025-04-21 account creation date in Singapore and marked preview. New international accounts cannot use them. [NOTES.md, Batch 2 & 3]
- **Assistant API is deprecated.** Use Responses API. [NOTES.md, Batch 2]
- **Tablestore Knowledge/Memory Storage:** Supported in Singapore. Data stays in customer's own OSS/Tablestore. [NOTES.md, Batch 3]
- **AI Search Open Platform:** No Singapore region. Frankfurt is the only non-mainland region. [NOTES.md, Batch 2 & 3]

## 2. Data for the catalog or model table

### Models (Singapore / International Scope unless noted)

| ID | Status (SG) | Input Price ($/1M tokens) | Output Price ($/1M tokens) | Cache Prices | Notes |
|---|---|---|---|---|---|
| qwen3.8-max | GA | $2.00 | $6.00 | Varies by model | Global scope: $1.65/$4.95. Explicit cache ≥1024 tokens, 5m TTL. |
| qwen3.8-flash | GA | - | - | Hit: $0.016, Create: $0.20 | Batch/fine-tuning unsupported in SG. Global create: $0.177. |
| qwen-plus | GA | - | $4.00 (thinking ≤256K) | - | Thinking-mode output differs from standard. |
| qwen-long | Legacy | - | - | - | Supports structured output. No thinking, function calling, or tools. |
| qwen3.7-plus | GA | List price only | List price only | - | Ignore limited-time 20% discount on pricing page. |
| qwen3-vl-plus | GA | - | - | - | No function calling or batch in SG. |
| qwen3.5-omni-plus | GA | - | - | - | No function calling, structured output, or batch in SG. |
| qwen3.8-omni-flash | GA | - | - | - | Runs in 6 regions incl. SG. Free quota removed 2026-10-29. |
| qwen3-vl-flash | Unconfirmed | - | - | - | Missing from live pricing page. |
| qwen3-rerank | GA | - | - | - | Replaced older rerank model post 2026-05-30. |
| qwen3.5-ocr | GA | - | - | - | Default output 4,096 tokens. Migrate from qwen-vl-ocr-2024-10-28. |
| qwen-audio-3.1-asr-flash | GA | $0.93 | $0.70 | - | Streaming ASR. |
| qwen-mt-uni | Exclude | - | - | - | China site (Beijing) only. |

*Free quota:* 1M tokens/model, 90 days, SG/International scope only. Removed for many models on 2026-10-29. qwen3.8-27b retains it. "Free Quota Only" is off by default.

### Infrastructure Products (Singapore)

| Product | ID/Endpoint | Status | Pricing | Scope/Notes |
|---|---|---|---|---|
| AgentRun | `ap-southeast-1` | Code-first GA; Low-code maintenance; Open Platform do-not-activate | FC CU | Successor to AgentBay for sandboxes. |
| AgentCore | `ap-southeast-1` | GA | $0.000015/CU + $0.60/hr collab | KB connector is Beijing-only. |
| AI Gateway | Dedicated instance | GA | Instance fee + data processing + traffic | Serverless unavailable internationally. |
| AI Guardrails | `green-cip.ap-southeast-1.aliyuncs.com` | GA | $6/10k calls/type; Qwen3Guard $8/10k | `lvwang_guardrail_public_intl` |
| Agent Sandbox Flash | `ap-southeast-1` | GA | Economy: $0.00000381/vCPU-s, $0.00000191/GiB-s. Default: $0.00000496/vCPU-s, $0.00000248/GiB-s | E2B compatible. |
| AgentBay | - | No-new-purchases (2026-11-02) | Existing only | Retiring. |
| Tablestore Memory/Knowledge | `ap-southeast-1` | GA | Hourly (CNY shown, verify USD) | Data in customer OSS/Tablestore. |
| DashVector | `ap-southeast-1` | GA | Pay-as-you-go/sec | SG + Virginia only. Semantic cache backend. |
| Milvus | `ap-southeast-1` (Zones B,C) | GA | USD/CU/month or hourly | SG + Frankfurt. |
| Content Moderation 2.0 | `ap-southeast-1` | GA | Text: $0.30/1k tasks | V2.0 multilingual text + voice. |
| AgentLoop | `agentloop.ap-southeast-1.aliyuncs.com` | GA | Credits $0.0016, Storage $0.0000055/entry-day, Exec $0.00014 | Observability/Eval. |
| Direct Mail | `ap-southeast-1` | GA | 2,000 free emails once (max 200/day) | Outbound only. |
| Function Compute | `ap-southeast-1` | GA | Quotas: 300 vCPU, 600 GB mem | 2025 discount ended 2025-08-27. |

## 3. Rules for the drawing model

- **Draw AI Gateway (Dedicated Instance)** between the agent runtime and all Model APIs / MCP tools. Never draw Serverless AI Gateway for international customers (preview ended, was mainland+HK only).
- **Draw AgentRun (code-first)** as the primary agent runtime in Singapore. Never draw AgentRun low-code Flow Agent or Open Platform for new users (maintenance/do not activate).
- **Draw Agent Sandbox Flash Edition** for code execution/browser automation. Never draw AgentBay for new customers (closed 2026-11-02). For Windows Computer Use, note "invitational preview". For Android, note "no confirmed replacement".
- **Draw a customer-owned external mailbox** for inbound email triggers routing into EventBridge/Function Compute. Never draw an Alibaba Cloud inbound email service (does not exist).
- **Draw Direct Mail** for outbound email notifications/replies.
- **Draw AI Guardrails** inline with prompts/responses or via AI Gateway/WAF 3.0. Calculate cost as `$6/10k × number_of_enabled_detection_types`.
- **Draw Tablestore Knowledge Storage or vector DBs (Milvus/DashVector)** for RAG in Singapore. Never draw AI Search Open Platform or Document Mind for Singapore customers (Shanghai/Frankfurt or Hangzhou only).
- **Draw AgentLoop or CMS 2.0** for observability traces and evaluation.
- **Draw workspace-specific endpoints** (`{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com`) for Model Studio calls. Never draw `dashscope.aliyuncs.com` as the recommended path (feature frozen).
- **Label deployment scope** (International vs Global) on every model node. Price depends on scope, not just region.
- **Add web search tool fees** ($10/1k calls in SG) to cost estimates when a web search tool is drawn. Do not estimate cost on tokens alone.
- **Draw human approval nodes** using AgentCore team tasks (pause/resume documented) or custom EventBridge/webhook flows. Do not rely on AgentCore IM channels for Slack/Teams (undocumented).

## 4. Traps

- **AgentBay looks active but is closed to new customers** as of 2026-11-02. Existing users keep service; no new features.
- **AgentCore looked China-only in the report**, but NOTES.md confirms it runs in Singapore. However, its knowledge-base connector reads *only* Beijing Model Studio KBs (effectively a Beijing-only feature).
- **qwen-long and qwen3.7-max look like standard models** but are officially legacy/no longer recommended. qwen-long lacks thinking, function calling, and tools.
- **Model Studio zero-code apps (KB, prompt engineering) look available in SG** but are gated to accounts created before 2025-04-21 and are in preview. New customers cannot use them.
- **AI Gateway Serverless edition looks globally available** but the preview was mainland+HK only and has ended.
- **Web search looks cheap (~$0.57/1k)** but costs $10/1,000 calls in Singapore.
- **qwen3.8-flash cache prices look uniform** but differ by scope: $0.20 creation in International (SG) vs $0.177 in Global.
- **PrivateLink looks supported everywhere** but still excludes Singapore.
- **ADBAgent (AnalyticDB agent) Skills look international** but are mainland-only; ADBAgent is unavailable in Singapore.
- **MaxCompute remote MCP looks global** but has no Singapore or Hong Kong endpoint.
- **The Assistant API looks valid** but is deprecated. Use Responses API.
- **"Cloud Agent Catalog" is not the official name.** It is the "Skills portal".

## 5. Open questions

- **Agent Identity region list and pricing:** International docs exist, but API examples use `cn-beijing`/`cn-hangzhou`. No billing page found.
- **Tair Semantic Cache gateway international availability:** Feature pages exist, but regional matrix for the semantic-cache gateway feature is unconfirmed.
- **OpenSearch LLM Conversational Search Edition region list:** SG endpoint and blog exist, but formal supported-regions page is missing.
- **Lindorm consolidated international region table:** Inferred from zone IDs, not explicitly listed in one table.
- **Tablestore Memory Storage USD prices:** International billing page displays CNY unit prices.
- **Slack / Microsoft Teams / Salesforce connectors:** Nothing documented for international agents. Only DingTalk/Lark/WeCom and generic OAuth2 via Agent Identity.
- **CMS 2.0 platform separate pricing:** Described as integrating SLS/CMS/ARMS; separate SKU not found.
- **AI Guardrails 1,000-token minimum per check:** Seen on China-site integration page; unverified if it applies in Singapore.
- **qwen3.8-flash explicit-hit cache price (International scope):** Not confirmed.
- **AgentRun Open Platform upgrade timeline:** Alibaba advises against activation; unclear when the major upgrade lands.