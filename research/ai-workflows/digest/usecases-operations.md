# Digest: Agentic Workflows for Pre-Sales App (Singapore Default)

## 1. Decisions this supports

- **Cost engine must ask for deployment scope, not just region.** International (Singapore) and Global scopes have different prices for the same model ID (e.g., `qwen3.8-max` is $2/$6 International vs $1.65/$4.95 Global). Source: [model-pricing](https://www.alibabacloud.com/help/en/model-studio/model-pricing), NOTES Batch 1.
- **Draw AgentCore as a first-class node for HITL/governance.** It runs in Singapore, bills at $0.000015/CU compute + $0.60/hr control plane, and its human review (pause/resume/accept) is documented. Status is "commercial" (not GA, not preview). Source: NOTES Adjudicate-1 & 2.
- **Recommend code-first AgentRun only.** Low-code Flow Agent creation is in maintenance mode (do not create new ones); Open Platform/FunAgent advises against activation ahead of an upgrade. Source: NOTES Adjudicate-1.
- **Do not draw Model Studio Knowledge Base or Application Development for new customers.** Gated to accounts that created a Singapore app before 2025-04-21; marked preview. New accounts must use Tablestore Knowledge Storage or DashVector + embeddings. Source: NOTES Batch 2 & Adjudicate-2.
- **Do not recommend AgentBay for new customers.** Closed to new purchases on 2026-11-02. Successor is Agent Sandbox Express Edition (Flash Edition). Source: NOTES Adjudicate-1.
- **Count tool calls in cost estimates, not just tokens.** Web search costs $10 per 1,000 calls in Singapore (plus tokens). Text-to-image search (`web_search_image`) is $8 per 1,000. Web extractor and code interpreter are temporarily free but add tokens. Source: NOTES Batch 1.
- **Store cache prices per model, never as a universal ratio.** Models like `qwen3.8-max` are exceptions. For `qwen3.8-flash` (International): explicit creation is $0.20/1M, hits are $0.016/1M. Source: NOTES Adjudicate-2.
- **Use workspace-specific endpoints for Singapore.** Format: `https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1`. Legacy `dashscope.aliyuncs.com` stopped receiving features after 2026-09-30. Source: NOTES Adjudicate-1.
- **AI Guardrails is available internationally.** Commodity code `lvwang_guardrail_public_intl`. Bills $6 per 10,000 calls *per enabled detection type* (content compliance, sensitive content, prompt injection). Source: NOTES Adjudicate-1.
- **Warn about data residency limits.** Singapore storage does not mean Singapore-only inference. Privacy policy permits overseas transfer/access. PrivateLink excludes Singapore entirely. Zero data retention requires enterprise eligibility and supported models. Source: NOTES Batch 1 & 3.

## 2. Data for the catalog or model table

**Models (International Scope / Singapore, per 1M tokens unless noted)**

| ID | Name | Input Price | Output Price | Cache Price (Intl) | Notes |
|---|---|---|---|---|---|
| `qwen3.8-max` | Qwen3.8-Max | $2.00 | $6.00 | Implicit hit $0.25; Explicit read $0.17 | No batch/fine-tuning in SG. Web search works here (not in Global). |
| `qwen3.8-flash` | Qwen3.8-Flash | $0.15 | $0.47 | Explicit creation $0.20; Hits $0.016 | No batch/fine-tuning in SG. |
| `qwen-plus` | Qwen-Plus | $0.40 (≤256K) | $1.20 (≤256K) | — | Thinking output: $4 (≤256K), $12 (>256K). >256K: $1.20/$3.60. |
| `qwen-flash` | Qwen-Flash | $0.05 (≤256K) | $0.40 (≤256K) | Implicit hit $0.01 | >256K: $0.25/$2.00. |
| `qwen3-coder-flash` | Qwen3-Coder-Flash | $0.30 (≤32K) | $1.50 (≤32K) | — | Global scope is cheaper ($0.144/$0.574). |
| `qwen3.5-ocr` | Qwen3.5-OCR | $0.069 | $0.275 | — | Default output 4,096 tokens. Replaces `qwen-vl-ocr`. |
| `text-embedding-v4` | Text Embedding v4 | $0.07 | — | — | No batch. |
| `qwen3-rerank` | Qwen3-Rerank | $0.10 | — | — | |
| `qwen-audio-3.1-asr-flash` | Streaming ASR | $0.93 | $0.70 | — | |

**Platform Services (Singapore)**

| Product | Role | Price | Status / Scope |
|---|---|---|---|
| AgentCore | Build/Govern/HITL | Compute $0.000015/CU; Control plane $0.60/hr | Commercial (pay-as-you-go). Free offer ended 2026-10-18. |
| Function Compute | Serverless execution | $0.000020/CU | Quotas: 300 vCPUs, 600 GB memory. |
| Agent Sandbox | Code/Browser execution | Economy: $0.00000381/vCPU-s, $0.00000191/GiB-s | Reference/preview estimates. Deep hibernation billed. |
| AI Guardrails | Moderation/Security | $6 per 10k calls per detection type | Intl regions: HK, SG, Frankfurt, Virginia. |
| DirectMail | Notify | $0.29 per 1,000 messages | 2,000 free emails once (max 200/day). |
| Chat App Message Service | Notify | $0.005 platform fee/message (Messenger, IG, Telegram, LINE) | WhatsApp service replies in 24h window are free. |
| Web Search Tool | Tool | $10 per 1,000 calls | Plus token costs. |
| Tablestore Knowledge Storage | Retrieval/Memory | CNY 1.08/GB/mo (storage) | SG supported. Confirm SGD pricing. |

## 3. Rules for the drawing model

- **Always ask/select deployment scope before calculating cost.** Fact: Prices differ between International (SG) and Global scopes (NOTES Batch 1).
- **Draw AgentCore for Human-in-the-Loop (HITL) steps.** Fact: AgentCore documents reviewer acceptance, pause, and resume, and runs in SG (NOTES Adjudicate-2).
- **Draw AgentRun code-first runtime for agent execution.** Fact: Low-code Flow and Open Platform are discouraged/in maintenance mode (NOTES Adjudicate-1).
- **Never draw Model Studio Knowledge Base or zero-code apps for new international accounts.** Fact: Gated to pre-2025-04-21 SG app creators; preview status (NOTES Batch 2). Draw Tablestore or DashVector instead.
- **Never draw AgentBay for new customers.** Fact: Closed to new purchases 2026-11-02 (NOTES Adjudicate-1). Draw Agent Sandbox Express Edition.
- **Add web search fees to the cost estimate when the search tool is used.** Fact: $10/1,000 calls in SG, independent of token costs (NOTES Batch 1).
- **Draw AI Guardrails as an international node.** Fact: Available in SG console, commodity code `lvwang_guardrail_public_intl` (NOTES Adjudicate-1).
- **Never promise Singapore-only data processing based solely on SG hosting.** Fact: Privacy policy permits overseas transfer; International scope routes outside mainland China (NOTES Batch 1).
- **Bound loops explicitly in the diagram.** Fact: Unbounded loops cause token cost explosions (Report §2; agents use ~4x chat tokens, multi-agent ~15x).
- **Enforce tool scope via AgentRun MCP Tool Hooks, never via prompt instructions.** Fact: 900-run test showed "DO NOT" prompt rules still leaked data (Report §11).

## 4. Traps

- **AgentBay is GA:** False. Closed to new customers since 2026-11-02. Use Agent Sandbox Express Edition.
- **Model Studio KB is open to all:** False. Restricted to accounts that created a SG app before 2025-04-21. Marked preview.
- **AgentRun low-code is recommended:** False. In maintenance mode since 2026-09-18. Alibaba says do not create new low-code agents.
- **PrivateLink secures SG traffic:** False. PrivateLink for Model Studio is Beijing and HK only. Excludes Singapore.
- **Cache discounts are uniform (e.g., 10% hit / 125% create):** False. Ratios vary by model. `qwen3.8-max` is an exception. Store exact prices per model.
- **Batch inference covers all models in SG:** False. `qwen3.8-flash` and `qwen3.8-max` do not support batch in Singapore.
- **AI Search Open Platform is in SG:** False. Only Shanghai and Frankfurt.
- **ADBAgent is in SG:** False. Not available in Singapore; Skills feature is mainland-only.
- **Qoder Code Review Agent docs apply internationally:** False. Docs are China-site only.
- **Zero data retention is default:** False. Requires enterprise eligibility. Unsupported models fall back to standard 30-day retention. Batch, RAG, and Playground are excluded.
- **Assistant API is current:** False. Deprecated. Use Responses API (`/compatible-mode/v1/responses`).
- **`qwen-mt-uni` is international:** False. China site (Beijing) only.
- **PAI LangStudio migration path exists for SG:** False. Retires 2027-03-09. Target (Model Studio apps) is Beijing-only.

## 5. Open questions

- **AgentCore IM channels:** Only DingTalk, Lark, WeCom confirmed for managed agents. KakaoTalk is unconfirmed/not found. Custom adapters via webhook/FC required for others.
- **Tablestore Knowledge Storage SGD pricing:** Published rates are in CNY and contradict themselves on the memory meter (GB/month vs entries/hour). Must confirm SG pricing.
- **Exact SG prices for several models:** `qwen3-vl-flash` is missing from the live pricing page (treat as unconfirmed). `qwen3-vl-rerank` has no SG price row.
- **AI Guardrails minimum billing in SG:** Report claims "at least 1,000 tokens per check", but NOTES Adjudicate-1 settled on "$6 per 10,000 calls per detection type". Verify if the token minimum applies alongside the call fee in SG.
- **AgentRun Flow feature parity:** International equivalent page exists under FC, but parity with China-site low-code is unconfirmed (though low-code is discouraged anyway).
- **Meta WhatsApp charging change:** Per-message charging for service messages inside the 24h window reported for 2026-10-01, but NOTES state "WhatsApp service replies within the 24-hour window are free." Clarify effective date.