# Digest: AI & Agents View – Implementation Notes

## 1. Decisions this supports

- **Never draw Model Studio no-code/low-code agent or workflow apps for new international accounts**; they are restricted to accounts that created a Singapore app before 2025-04-21 and are preview. [alibabacloud.com/help/en/model-studio/single-agent-application]
- **Draw AgentRun code-first runtime as the default orchestration block** in Singapore; do not recommend AgentRun low-code Flow (maintenance mode) or Open Platform/FunAgent (do not activate). [alibabacloud.com/help/en/agentrun/what-is-agentrun]
- **Draw AgentCore as "commercial" (not GA, not preview)** for agent governance/execution in Singapore. [alibabacloud.com/help/en/agentcore/agentcore-product-overview]
- **Do not draw AgentBay for new customers**; it is closed to new purchases since 2026-11-02. Draw Agent Sandbox Express/Flash Edition instead. [NOTES.md Adjudicate-1]
- **Cost estimator must include deployment scope** (International vs Global), because the same model ID costs less in Global scope than International (Singapore). [NOTES.md Batch 1]
- **Cost estimator must add web-search tool fees** ($10 per 1,000 calls in Singapore), not just token costs. [NOTES.md Batch 2]
- **Cost estimator must state busy vs idle hours** (08:00–22:00 UTC+8 is busy); off-peak discounts exist. [alibabacloud.com/help/en/model-studio/model-pricing]
- **Store cache prices per-model**, never as a uniform ratio; qwen3.8-max and others are exceptions. [NOTES.md Batch 1, Batch 6]
- **Draw WhatsApp costs with Meta's per-message fee** plus CAMS platform fee ($0.005/msg since 2026-09-01 for Messenger/Instagram/Telegram/LINE; WhatsApp service replies within 24h are free). [NOTES.md Batch 6]
- **Never draw KakaoTalk via CAMS**; it requires custom webhook → FC → AgentCore direct-access endpoint. [NOTES.md Adjudicate-2]
- **Never draw Cloud Contact Center (CCC) or full CCaaS voice** for international; draw customer/partner SIP trunk → media bridge → Model Studio speech models. [NOTES.md Batch 2]
- **Never draw an emotion-recognition node for EU workplace/education** deployments (banned since 2025-02-02 under AI Act Art. 5(1)(f)). [NOTES.md Batch 5]
- **Draw AI Guardrails as available internationally** (Singapore, HK, Frankfurt, Virginia console regions confirmed). [NOTES.md Adjudicate-1]
- **Use `qwen3.5-ocr`**, not `qwen-vl-ocr` (deprecated/migrated). [NOTES.md Batch 2]
- **Use `qwen3-rerank`** in Singapore, not `gte-rerank-v2`. [NOTES.md Batch 4]
- **Use workspace-specific endpoints** (`https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/...`) for Singapore, not legacy `dashscope-intl`. [NOTES.md Adjudicate-1]
- **Warn proposals about US CMC designation** of Alibaba (June 2026) factually if mentioned at all. [NOTES.md Batch 6]

## 2. Data for the catalog or model table

*Prices below are International scope (Singapore) unless noted. Per 1M tokens.*

| ID / Name | Type | Status / Scope | Price (In / Out) | Units | Notes |
|---|---|---|---|---|---|
| `qwen3.8-max` | LLM | Intl (SG) | $2.00 / $6.00 | per 1M tokens | No batch/fine-tuning in SG. Cache: implicit hit $0.25, explicit read $0.17. Global scope: $1.65/$4.95. |
| `qwen-plus` | LLM | Intl (SG) | $0.40 / $1.20 | per 1M tokens | ≤256K input. Thinking output: $4 (≤256K), $12 (>256K). >256K input: $1.20/$3.60. |
| `qwen-flash` | LLM | Intl (SG) | $0.05 / $0.40 | per 1M tokens | ≤256K input. Cache implicit hit $0.01. No batch in SG. |
| `qwen3-coder-flash` | LLM | Intl (SG) | $0.30 / $1.50 | per 1M tokens | ≤32K input. Global: $0.144/$0.574. |
| `text-embedding-v4` | Embedding | Intl (SG) | $0.07 / — | per 1M tokens | No batch. |
| `qwen3-rerank` | Rerank | Intl (SG) | $0.10 / — | per 1M tokens | Replaces gte-rerank-v2. |
| `qwen3.5-ocr` | Vision/OCR | Intl (SG) | See pricing page | per 1M tokens | Replaces qwen-vl-ocr. Default 4096 out tokens. |
| `qwen-audio-3.1-asr-flash` | ASR | Intl (SG) | $0.93 / $0.70 | per 1M tokens | Streaming ASR. |
| `cosyvoice-v3-plus` | TTS | Intl (SG) | $0.26 | per 10k chars | v3.5 is Beijing only. |
| `qwen-audio-3.0-tts-plus` | TTS | Intl (SG) | $0.20 | per 10k chars | |
| Web Search (tool) | Tool | Intl (SG) | $10.00 | per 1k calls | Plus token costs. |
| AI Guardrails | Guardrail | Intl (SG) | $6.00 | per 10k calls | Per enabled detection type. Code: `lvwang_guardrail_public_intl`. |
| AgentCore | Runtime | Commercial (SG) | $0.000015 | per CU compute | Gateway $0.000000225/CU; Control plane $0.60/hr. |
| AgentRun (code-first) | Runtime | Recommended (SG) | — | — | Low-code/Open Platform discouraged. |
| Agent Sandbox (Express) | Sandbox | Preview (SG) | $0.00000381 | per vCPU-s | Economy tier. Reference prices. Successor to AgentBay. |
| Function Compute | Compute | GA (SG) | $0.000020 | per CU | Promo ended. Quota: 300 vCPU, 600GB mem. |
| CAMS | Channel | GA (SG) | $0.005 | per message | Platform fee (Messenger/IG/TG/LINE since 2026-09-01). WhatsApp pass-through extra. |
| DirectMail | Channel | GA (SG) | $0.29 | per 1k messages | 2,000 free once/account (max 200/day). |
| Tablestore Knowledge Storage | RAG/Memory | GA (SG) | CNY 1.08 | per GB/month | Reference rate; confirm SG USD pricing. |

## 3. Rules for the drawing model

- **Draw AgentRun code-first or AgentCore** as the orchestration node for new international accounts. *Fact: Model Studio no-code apps are gated to pre-2025-04-21 accounts; AgentRun low-code is in maintenance mode.*
- **Draw Agent Sandbox (Express/Flash)**, never AgentBay, for code/browser sandboxes. *Fact: AgentBay is closed to new customers since 2026-11-02.*
- **Draw a dual-path (DualLane) variant** offering a cheap deterministic/fast-model lane parallel to the LLM lane when cost optimization is requested. *Fact: Alibaba's DualLane architecture reduces LLM use for support tickets.*
- **Draw an `approve` (HITL) hexagon** before any money movement, irreversible write, or booking charge. *Fact: LangChain HITL patterns + Air Canada liability precedent.*
- **Draw AI Guardrails** wrapping input/output for international workflows. *Fact: Confirmed available in SG console, bills per detection type.*
- **Never draw emotion-inference nodes** for EU education or workplace agents. *Fact: EU AI Act Art. 5(1)(f) bans it since 2025-02-02.*
- **Never draw KakaoTalk connected to CAMS**. Draw a custom webhook → FC path. *Fact: KakaoTalk is not in CAMS.*
- **Never draw CCC (Cloud Contact Center)** as an international telephony edge. Draw customer/partner SIP trunk. *Fact: CCC international availability unconfirmed/China-only.*
- **Show a toggle on every model node** for Deployment Scope (International vs Global) and Busy/Idle hours. *Fact: Prices differ by scope; off-peak discounts up to 80% exist.*
- **Add Web Search tool call fees** to the cost estimate whenever the search tool is drawn. *Fact: Costs $10/1k calls in SG, separate from tokens.*
- **Use `qwen3.5-ocr` and `qwen3-rerank`** IDs in diagrams, not legacy names. *Fact: Legacy models migrated/deprecated.*

## 4. Traps

- **Model Studio Agent/Workflow Apps**: Look like standard features but are blocked for any international account that didn't create a Singapore app before 2025-04-21. They are also marked preview.
- **AgentBay**: Looks like the recommended sandbox (catalog says GA), but stopped accepting new customers on 2026-11-02. Use Agent Sandbox Express.
- **AgentRun Low-Code / Open Platform**: Documented heavily, but Flow creation is in maintenance mode (since 2026-09-18) and Open Platform activation is explicitly discouraged ahead of an upgrade. Only code-first is safe.
- **Global vs International Pricing**: The report lists $1.65/$4.951 for qwen3.8-max, but that is Global scope. International (Singapore) is $2/$6. Using the wrong scope breaks cost estimates.
- **Batch Inference**: Not universally available. `qwen3.8-flash` and `qwen3.8-max` do not support batch in Singapore. Cannot combine batch with context caching.
- **Free Quotas**: Many were removed on 2026-10-29. Do not assume 1M free tokens for all models.
- **AI Guardrails Console**: Older docs say "Shanghai only". This was corrected; it is now available in SG, HK, Frankfurt, Virginia.
- **PAI LangStudio**: Retires 2027-03-09. Its migration target (Model Studio applications) is Beijing-only, leaving no SG migration path.
- **Retiring Models**: `qwen3.5-plus` and variants decommission 2027-01-19. Replacement is `qwen-flash`.
- **US CMC Designation**: Alibaba was designated a "Chinese military company" in June 2026. A preliminary injunction limits enforcement of one provision, but presales staff must be aware for US customers.
- **Zero Data Retention**: Requires enterprise eligibility; falls back silently to standard retention for unsupported models/batch/RAG.

## 5. Open questions

- **Qwen Cloud vs Model Studio**: Qwen Cloud launched globally from SG on 2026-05-26. Does it lift the pre-2025-04-21 application restriction for new accounts? Unconfirmed.
- **AgentCore IM Channels**: Only DingTalk, Lark, WeCom are native. Confirm exact adapter requirements for Slack/Teams via AgentCore direct-access endpoint.
- **Tablestore Memory/Knowledge Storage Pricing**: Published rates are in CNY and contradict themselves on metering (GB/month vs entries/hour). Need confirmed SGD/USD rates for Singapore.
- **AIRec Region Availability**: Product pages exist internationally, but no region table surfaced. Is it fully supported in SG?
- **Voice Service Outbound International**: China site says no outbound international calls; international site advertises SIP trunking/DIDs. Exact capability boundary for SG accounts is unconfirmed.
- **qwen3.8-flash Cache Prices (International)**: Explicit creation is $0.20/1M. Explicit-hit price is unconfirmed.
- **AgentCore Billing Status**: Confirmed commercial pay-as-you-go, but no official page explicitly prints "GA". Keep labeled "commercial".