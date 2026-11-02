# Digest: AI & Agents View — Implementation Plan

## 1. Decisions this supports

- **Draw AgentCore as the primary governance/registry product** for multi-agent workflows in Singapore; it supports managed, custom, and external agents. [Source](https://www.alibabacloud.com/help/en/agentcore/agentcore-product-overview)
- **Draw CloudFlow `waitForCallback` + task token for human approval nodes**; it is the only durable, first-class pause-for-approval primitive available internationally (up to 1-year wait). [Source](https://www.alibabacloud.com/help/en/serverless-workflow/latest/perform-callbacks-on-asynchronous-tasks)
- **Recommend AgentRun code-first runtime** for agent hosting in Singapore; do not recommend its low-code Flow builder or Open Platform to new users. [Source](https://www.alibabacloud.com/help/en/agentrun/what-is-agentrun)
- **Draw EventBridge HTTP source → Function Compute / CloudFlow for email triggers**; no native inbound-email trigger exists on Alibaba Cloud. [Source](https://www.alibabacloud.com/help/en/eventbridge/product-overview/product-function-node-eventbridge)
- **Use deployment scope (International vs Global), not just region, to calculate model costs** in the proposal exporter. [Source](https://www.alibabacloud.com/help/en/model-studio/model-pricing)
- **Route Model Studio API calls to workspace-specific endpoints** (`{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com`) rather than legacy `dashscope` domains. [Source](NOTES.md, Adjudicate-1)
- **Warn that AgentCore KB connections are Beijing-only** (read-only connection to Beijing Model Studio KBs); do not draw them for Singapore customers. [Source](NOTES.md, Batch 3)
- **Recommend Agent Sandbox (Flash/Economy/Default)** for tool execution; mark AgentBay as closed to new customers. [Source](NOTES.md, Adjudicate-1)
- **Include AI Guardrails in international proposals** for prompt injection/content compliance; it is available in Singapore. [Source](NOTES.md, Adjudicate-1)
- **Never draw Slack, Teams, WhatsApp, LINE, or Telegram as native IM channels**; they do not exist in AgentCore or AgentRun. [Source](https://www.alibabacloud.com/help/en/agentcore/api-agentcore-2026-08-04-createagentimchannel)

---

## 2. Data for the catalog or model table

### Models (Singapore / International Scope)

| ID | Name | Status | Region | Input Price | Output Price | Unit | Scope | Notes |
|---|---|---|---|---|---|---|---|---|
| `qwen3.8-max` | Qwen3.8 Max | GA | SG | $2.00 | $6.00 | per 1M tokens | International | Global scope is cheaper ($1.65/$4.95) |
| `qwen-plus` | Qwen Plus (thinking) | GA | SG | - | $4.00 | per 1M tokens | International | Thinking mode output at input ≤256K |
| `qwen3.8-flash` | Qwen3.8 Flash | GA | SG | - | - | per 1M tokens | International | Cache hit: $0.016; creation: $0.20. No batch/fine-tuning in SG. |
| `qwen3.8-omni-flash` | Qwen3.8 Omni Flash | GA | SG | - | - | per 1M tokens | International | 6 regions including SG |
| `qwen-audio-3.1-asr-flash` | Streaming ASR | GA | SG | $0.93 | $0.70 | per 1M tokens | International | |
| `qwen3.5-ocr` | Qwen3.5 OCR | GA | SG | - | - | per 1M tokens | International | Default output 4,096 tokens |
| `qwen3-rerank` | Qwen3 Rerank | GA | SG | - | - | per 1M tokens | International | |

*Note: Free quota (typically 1M tokens, 90 days) was removed for many models on 2026-10-29. `qwen3.8-27b` retains 1M free tokens in SG.*

### Platforms & Infrastructure

| Product | ID/Name | Status | Region(s) | Price | Unit | Notes |
|---|---|---|---|---|---|---|
| AgentCore | `agentcore` | Public Preview | SG, cn-hangzhou, cn-beijing, cn-shanghai, cn-shenzhen | $0.000015 (Compute CU); $0.60 (Collab plane) | per CU / per hour | Billing started 2026-09-18. Free offer ended 2026-10-18. |
| AgentRun | `agentrun` | GA (Code-first) | SG (`ap-southeast-1`) | FC CU + Sandbox + Tokens | - | Low-code Flow in maintenance. Open Platform discouraged. |
| CloudFlow | `cloudflow` | GA | SG (`ap-southeast-1`) | $0.25 | per 10k transitions | 5k or 1k free/month (verify in console). Standard mode = 1 yr max. |
| Function Compute | `fc` | GA | SG | Quota: 300 vCPU, 600 GB RAM | - | 2025 discount ended 2025-08-27. Max timeout 86,400s. |
| Agent Sandbox | `agent-sandbox` | GA | SG | Economy: $0.00000381 (vCPU-s), $0.00000191 (GiB-s) | per second | Successor to AgentBay. |
| AI Guardrails | `lvwang_guardrail_public_intl` | GA | SG, HK, Frankfurt, Virginia | $6.00 | per 10k calls/type | Billed per enabled detection type. Endpoint: `green-cip.ap-southeast-1.aliyuncs.com` |
| DirectMail | `directmail` | GA | SG | $0.29 | per 1k messages | Outbound only. Initial daily quota 2,000. |
| EventBridge | `eventbridge` | GA | SG | ~$0.82 | per 1M events | Max 5 targets per rule. |
| SMQ (MNS) | `smq` | GA | SG | Free tier: 20M normal msgs | per month | Ordered messages charged. |
| Tablestore MSS | `tablestore-mss` | Public Preview | SG, HK | PAYG / Instance | - | Memory/knowledge backend for AgentRun. |
| DashVector | `dashvector` | GA | SG, Virginia | Instance-based | - | Vector retrieval. |

---

## 3. Rules for the drawing model

- **Draw EventBridge HTTP Source → Function Compute** when the workflow trigger is an inbound email or external webhook. *Fact: No native IMAP/SMTP trigger exists; DirectMail is outbound-only.*
- **Draw CloudFlow with a `waitForCallback` Task step** when the workflow requires human approval. *Fact: It is the only documented durable pause/resume primitive available in Singapore.*
- **Draw AgentCore** when the customer needs multi-agent governance, registry, or team scheduling. *Fact: AgentCore runs in SG and manages workspaces, MCP tools, and memory.*
- **Draw AgentRun (code-first)** when the customer needs a serverless agent runtime. *Fact: Code-first is recommended; low-code Flow is in maintenance mode.*
- **Draw Agent Sandbox** instead of AgentBay for code/browser isolation. *Fact: AgentBay is closed to new customers as of 2026-11-02.*
- **Draw AI Guardrails** as a security node if prompt-injection protection is requested. *Fact: Available in SG at $6 per 10k calls per detection type.*
- **Never draw PrivateLink for Model Studio in Singapore.** *Fact: PrivateLink for Model Studio is Beijing and Hong Kong only.*
- **Never draw AgentCore Knowledge Base connections for Singapore customers.** *Fact: The connector reads only Beijing Model Studio KBs (Beijing-only feature).*
- **Never draw Slack, Microsoft Teams, WhatsApp, LINE, or Telegram as native IM channels.** *Fact: Only DingTalk, Lark (Feishu), and WeCom are documented.*
- **Never draw AI Search Open Platform for Singapore.** *Fact: It is Shanghai and Frankfurt only.*
- **Never draw CAP / Function AI templates.** *Fact: China-site only.*
- **Tag cost estimates with Deployment Scope (International vs Global).** *Fact: The same model ID costs less in Global scope than International scope.*

---

## 4. Traps

- **AgentBay:** Looks like a valid sandbox option but is **closed to new customers** since 2026-11-02. Use Agent Sandbox Express/Flash Edition.
- **AgentRun Low-Code Flow & Open Platform:** Documented features, but both are **discouraged/in maintenance**. Do not recommend for new builds.
- **Model Studio Application APIs (Zero-code apps, KB):** Appear available in Singapore docs, but are **gated to accounts that created SG apps before 2025-04-21** and marked preview. New customers cannot use them.
- **AgentCore KB Connector:** Appears as a knowledge base feature, but it is effectively **Beijing-only** because it only connects read-only to Beijing Model Studio KBs.
- **AI Guardrails "Shanghai only" text:** Older docs say Shanghai only. This is **outdated**; it is now available in SG, HK, Frankfurt, and Virginia.
- **PrivateLink for Model Studio:** Legacy endpoint examples might show `ap-southeast-1`, but PrivateLink is **strictly Beijing + Hong Kong**.
- **Deployment Scope vs Region:** Customers assume "Singapore region" means all processing stays in SG. **False**: International-scope requests can be processed on nodes outside mainland China. Region dictates storage/access; scope dictates inference routing.
- **CAP / Function AI:** Has English documentation under `help.aliyun.com`, but there is **no international product page**. It is China-only.
- **AgentLoop Evaluation:** Part of the international portfolio, but for non-China customers, space creation offers **Hong Kong only**.
- **Legacy Responses API path:** `/api/v2/apps/protocols/...` is deprecated. Must use `/compatible-mode/v1/responses`.

---

## 5. Open questions

- **Model Studio KB Creation in SG:** Can a brand-new Singapore account create a Model Studio Knowledge Base directly (outside the gated Application APIs)? If not, AgentRun's KB integration via Model Studio is blocked for new customers.
- **CloudFlow Free Tier Discrepancy:** One international doc says 5,000 free step transitions/month; another says 1,000. Needs console verification for accurate cost estimation.
- **AgentCore Quotas:** Max agents per workspace, runtime specs, and session limits are undocumented.
- **Function Compute Current SG Pricing:** The published USD 0.000020/CU tier had an expired date window (ended 2025-08-27). Current exact unit price for SG is unconfirmed.
- **AgentRun Exact Pricing:** No dedicated AgentRun price card exists. Costs must be manually derived from FC CUs + Sandbox compute + Model Studio tokens.
- **LangGraph Support in AgentRun:** LangChain, AgentScope, CrewAI, and ADK are named. LangGraph is absent from the list; support is unconfirmed.
- **FC Feature Matrix for `ap-southeast-1`:** Specific cells for custom container runtime, GPU instance availability, and session affinity in Singapore were unreadable in the source matrix.