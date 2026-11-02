# Digest: AI & Agents View Implementation

## 1. Decisions this supports

- **Draw agent runtimes as customer-hosted (AgentRun code-first, AgentCore, or Function Compute), never as Model Studio no-code apps**, because the Application Development console and `app_id` API are gated to accounts that created Singapore apps before 2025-04-21 and are marked preview. [Source](https://www.alibabacloud.com/help/en/model-studio/application-introduction)
- **Recommend Tablestore Knowledge Storage Service for RAG nodes** instead of Model Studio `file_search`, which requires a gated knowledge base ID. [Source](https://www.alibabacloud.com/help/en/tablestore/table-store-service/knowledge-storage-introduction)
- **Use workspace-dedicated endpoints** (`https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1`) for all API calls including Responses; the legacy `dashscope-intl` domain works but receives no new features. [Source](https://www.alibabacloud.com/help/en/model-studio/compatibility-of-openai-with-dashscope)
- **Cost estimator must multiply tool calls by per-call fees** (e.g., web search $10/1k in Singapore) plus token costs; prices differ by deployment scope (International vs Global), not just region. [Source](https://www.alibabacloud.com/help/en/model-studio/web-search)
- **Draw two distinct safety nodes**: platform moderation (always on, non-removable, raises `data_inspection_failed`) and AI Guardrails (optional, separately billed per detection type). [Source](https://www.alibabacloud.com/help/en/model-studio/error-code)
- **Never promise isolated throughput per workspace**; RPM/TPM aggregate at the primary account level across all RAM users, workspaces, and keys. Isolation requires Throughput Reservation (PTU). [Source](https://www.alibabacloud.com/help/en/model-studio/rate-limit)
- **Do not present Virginia (Global scope) as US-only processing**; International-scope requests can process on nodes outside mainland China regardless of storage region. [Source](https://www.alibabacloud.com/help/en/model-studio/singapore-regional-access-information)
- **Quote "never use data for training" carefully**; official wording is qualified elsewhere by "without explicit consent". [Source](https://docs.modelstudio.console.alibabacloud.com/en/model-studio/privacy-notice)
- **Render MCP as customer-hosted remote server via Responses API**; Model Studio hosted MCP marketplace is unconfirmed internationally. [Source](https://www.alibabacloud.com/help/en/model-studio/mcp)
- **Draw human-in-the-loop approval nodes using AgentCore**, which documents reviewer acceptance, pause, and resume. [Source](https://www.alibabacloud.com/help/en/agentcore/using-team-tasks)

## 2. Data for the catalog or model table

| ID / Name | Status | Regions | Price | Scope | Source |
|---|---|---|---|---|---|
| `qwen3.8-max` | GA | 6 regions | $2 input / $6 output per 1M tokens | International (SG) | [Pricing](https://www.alibabacloud.com/help/en/model-studio/model-pricing) |
| `qwen3.8-max` | GA | 6 regions | $1.65 input / $4.95 output per 1M tokens | Global | [Pricing](https://www.alibabacloud.com/help/en/model-studio/model-pricing) |
| `qwen-plus` (thinking) | GA | SG | $4 output per 1M tokens (input ≤256K) | International | [NOTES.md] |
| `qwen3.8-flash` cache (implicit hit) | GA | SG | $0.016 per 1M tokens | International | [NOTES.md] |
| `qwen3.8-flash` cache (explicit create) | GA | SG | $0.20 per 1M tokens | International | [NOTES.md] |
| `web_search` (built-in tool) | GA | SG | $10.00 per 1,000 calls | International | [Web Search](https://www.alibabacloud.com/help/en/model-studio/web-search) |
| `web_search_image` (built-in tool) | GA | SG | $8.00 per 1,000 calls | International | [Image Search](https://www.alibabacloud.com/help/en/model-studio/web-search-image.md) |
| `web_extractor` / `code_interpreter` | Promo | 6 regions | Free for a limited time (adds tokens) | All | [Extractor](https://www.alibabacloud.com/help/en/model-studio/web-extractor) |
| Batch inference | GA | SG, Beijing | 50% of real-time price | Regional | [Batch](https://www.alibabacloud.com/help/en/model-studio/batch-inference) |
| AI Guardrails | GA | SG, HK, Frankfurt, Virginia | $6 per 10,000 calls per enabled detection type | International | [NOTES.md] |
| Content Moderation V2.0 (text) | GA | SG | $0.30 per 1,000 tasks | International | [NOTES.md] |
| AgentCore | GA | SG (+ 4 CN) | $0.000015 per CU compute; collab plane $0.60/hr | International | [NOTES.md] |
| Agent Sandbox (Default) | GA | SG | $0.00000496/vCPU-s, $0.00000248/GiB-s | International | [NOTES.md] |
| AgentRun (code-first) | GA | SG | See compute pricing | International | [NOTES.md] |
| Tablestore Knowledge Storage | GA | SG | Storage + compute billed separately | International | [Tablestore](https://www.alibabacloud.com/help/en/tablestore/table-store-service/knowledge-storage-introduction) |
| `qwen3.5-ocr` | GA | SG | Default 4,096 tokens output | International | [NOTES.md] |
| `qwen-audio-3.1-asr-flash` | GA | SG | $0.93 input / $0.70 output per 1M tokens | International | [NOTES.md] |

## 3. Rules for the drawing model

- **Draw Responses API node when built-in tools (web search, extractor, code interpreter, MCP) are used.** Fact: Only the Responses API carries server-side built-in tools. [Source](https://www.alibabacloud.com/help/en/model-studio/qwen-api-via-openai-responses)
- **Cap tool fan-out visuals at 20 and warn above it.** Fact: Alibaba recommends ≤20 tools per main model for optimal accuracy. [Source](https://www.alibabacloud.com/help/en/model-studio/qwen-function-calling)
- **Never render `tool_choice="required"` for Qwen models; use `"auto"` or named function.** Fact: Qwen rejects `"required"` in both thinking and non-thinking modes. [Source](https://www.alibabacloud.com/help/en/model-studio/qwen-function-calling)
- **Draw Tablestore Knowledge Storage or AgentRun+RAGFlow for RAG nodes, never Model Studio Knowledge Base for new international customers.** Fact: KB APIs are gated to pre-2025-04-21 Singapore accounts. [Source](https://www.alibabacloud.com/help/en/model-studio/rag-knowledge-base)
- **Always draw a Platform Moderation node inline with inference, and optionally an AI Guardrails node.** Fact: Green Net inspection is always on and cannot be disabled; AI Guardrails is a separate paid layer. [Source](https://www.alibabacloud.com/help/en/model-studio/error-code)
- **Draw a human-review branch off the Platform Moderation node.** Fact: Blocked requests return HTTP 400 `data_inspection_failed`. [Source](https://www.alibabacloud.com/help/en/model-studio/error-code)
- **Draw MCP as a remote SSE endpoint provided by the customer, not a hosted marketplace.** Fact: Hosted MCP marketplace is only documented on the China site. [Source](https://www.alibabacloud.com/help/en/model-studio/mcp)
- **Show reasoning/thinking output branching to Output Token billing.** Fact: Thinking content is billed at the output token rate. [Source](https://www.alibabacloud.com/help/en/model-studio/deep-thinking)
- **Never draw PrivateLink for Singapore workflows.** Fact: PrivateLink is available only in Beijing and Hong Kong. [Source](https://www.alibabacloud.com/help/en/model-studio/access-model-studio-through-privatelink)
- **Include deployment scope (International vs Global) in cost estimation nodes, not just region.** Fact: The same model ID costs less in Global scope than International scope. [Source](https://www.alibabacloud.com/help/en/model-studio/model-pricing)

## 4. Traps

- **Model Studio No-Code Apps / `app_id` API:** Looks like the default way to build agents, but it is gated to accounts that created Singapore apps before 2025-04-21 and remains in preview. New international customers cannot use it.
- **Assistant API:** Documented in older tutorials, but officially deprecated. Migrate to Responses API.
- **AgentBay:** Catalog may list it as GA, but it stopped accepting new customers on 2026-11-02. Use Agent Sandbox Express Edition instead.
- **AgentRun Low-Code / Open Platform (FunAgent):** In maintenance mode; Alibaba explicitly advises new users not to activate it. Only the code-first runtime is recommended.
- **Legacy DashScope Endpoint (`dashscope.aliyuncs.com` / `dashscope-intl.aliyuncs.com`):** Stopped receiving new features after 2026-09-30. Still works, but workspace-dedicated domains are required for new capabilities.
- **Free Quota Removals:** Free quotas (typically 1M tokens/90 days in SG) were removed for many models on 2026-10-29 (e.g., `qwen3.5-omni-flash`). Do not hardcode free tiers.
- **Cache + Batch Stacking:** Context cache discounts and batch inference (50%) discounts cannot apply simultaneously to the same request.
- **AI Search Open Platform / ADBAgent Skills:** Neither is available in Singapore.
- **China-site MCP Marketplace:** "MCP Square" and one-click official MCP services are documented only on the China site. Do not offer them for international proposals without proof of access.
- **ZDR Exclusions:** Zero Data Retention does not cover Batch, RAG, application orchestration, or the Playground. Calls to unsupported models silently fall back to standard retention.

## 5. Open questions

- **JSON Schema strictness:** Whether JSON Schema mode uses grammar-constrained decoding or best-effort prompting is unconfirmed. Keep a validator in the loop.
- **Batch turnaround SLA:** No official completion window is published for Singapore batch inference.
- **`reasoning_effort` accepted values:** `low`/`medium`/`xhigh` appear on Hugging Face, but exact accepted values on alibabacloud.com per model are unconfirmed.
- **`image_search` region-scoped price:** $8.00/1,000 calls is confirmed, but the specific region label was truncated in the source snippet.
- **Non-Singapore `web_search` per-strategy prices:** Exact USD figures for turbo/max/agent/agent_max in Virginia, Frankfurt, Tokyo, and Hong Kong need extraction.
- **AI Guardrails minimum billing in Singapore:** China docs state each check bills at least 1,000 tokens; whether this applies identically in Singapore is unverified.
- **ZDR approval process:** Enterprise eligibility is confirmed, but the exact "account manager + needs assessment" workflow relies on third-party summaries.
- **Explicit cache hit price (International):** Creation is $0.20/1M in SG, but the exact hit discount price for International scope is unconfirmed.