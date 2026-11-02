# Digest: AI & Agents View Implementation

## 1. Decisions this supports

- **Never draw Model Studio no-code "workflow app" or knowledge-base nodes for new Singapore accounts**; eligibility requires a Singapore app created before 2025-04-21 and is marked preview. ([NOTES.md](#))
- **Always terminate workflows in a customer-owned runtime**: AgentRun (code-first only), Function Compute, Dify on ACK/ACS, PAI-EAS, or AgentCore. ([Report §1.3](https://www.alibabacloud.com/help/en/model-studio/single-agent-application))
- **Recommend AgentRun code-first runtime**; do not recommend low-code Flow Agent creation (maintenance mode) or Open Platform/FunAgent ("do not activate"). ([NOTES.md](#))
- **Do not recommend AgentBay to new customers** (closed 2026-11-02); use Agent Sandbox Express Edition instead. ([NOTES.md](#))
- **Cost estimator must include tool-call fees**, not just tokens: `web_search` costs $10 per 1,000 calls in Singapore; `web_search_image` costs $8 per 1,000. ([NOTES.md](https://www.alibabacloud.com/help/en/model-studio/web-search))
- **Prices depend on deployment scope** (International vs Global), not just region. Same model ID is cheaper in Global scope. ([NOTES.md](#))
- **Store cache prices per model, never as a ratio**; explicit/implicit creation and hit rates differ by model and scope. ([NOTES.md](#))
- **Batch inference is 50% of real-time price** but excludes qwen3.8-flash and qwen3.8-max in Singapore, and excludes context caching/free quota. Check per model. ([NOTES.md](https://www.alibabacloud.com/help/en/model-studio/batch-inference))
- **Use workspace-specific endpoints** (`{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com`) for Responses API and general calls; legacy `dashscope-intl` works but receives no new features. ([NOTES.md](#))
- **Route observability to AgentLoop in Hong Kong** (only international region). ([Report §0](https://www.alibabacloud.com/help/en/agentloop/agentloop-quickstart-whole-process-practice))
- **Draw AI Guardrails as available in Singapore** (commodity code `lvwang_guardrail_public_intl`, $6 per 10k calls per enabled detection type). ([NOTES.md](#))
- **Warn that PrivateLink excludes Singapore**. ([NOTES.md](#))
- **Warn that Singapore storage does not guarantee Singapore-only inference** (privacy policy permits overseas transfer/access). ([NOTES.md](#))
- **For Korean end-users, draw an AI-disclosure annotation** (AI Basic Act Art. 31, effective 2026-01-22) and a human-review/explanation path for automated decisions affecting rights (PIPA Art. 37-2). ([NOTES.md](#), [Report §9](https://fpf.org/blog/south-koreas-new-ai-framework-act-a-balancing-act-between-innovation-and-regulation/))

## 2. Data for the catalog or model table

### Models (International Scope / Singapore, per 1M tokens unless noted)

| ID | Name | Status | Region | Input Price | Output Price | Cache Price | Notes |
|---|---|---|---|---|---|---|---|
| `qwen3.8-max` | Qwen3.8-Max | Available | ap-southeast-1 | $2.00 | $6.00 | Implicit hit $0.25; Explicit read $0.17 | No batch/fine-tuning in SG. Web search works here (not Global). |
| `qwen-plus` | Qwen-Plus | Available | ap-southeast-1 | $0.40 (≤256K) | $1.20 (≤256K) | — | Thinking output: $4 (≤256K), $12 (>256K). >256K: $1.20/$3.60. |
| `qwen-flash` | Qwen-Flash | Available | ap-southeast-1 | $0.05 (≤256K) | $0.40 (≤256K) | Implicit hit $0.01 | >256K: $0.25/$2.00. |
| `qwen3-coder-flash` | Qwen3-Coder-Flash | Available | ap-southeast-1 | $0.30 (≤32K) | $1.50 (≤32K) | — | Global scope: $0.144/$0.574. |
| `text-embedding-v4` | Text Embedding v4 | Available | ap-southeast-1 | $0.07 | — | — | No batch. |
| `multimodal-embeddings` | Multimodal Embeddings | Available | ap-southeast-1 | Text $0.09 | Vision-flash img/vid $0.03 | — | |
| `qwen3-rerank` | Qwen3 Rerank | Available | ap-southeast-1 | $0.10 | — | — | Replaces older rerank models. |
| `qwen-mt-plus` | Qwen MT Plus | Available | Global | $0.259 | $0.775 | — | 92 languages. |
| `qwen-mt-lite` | Qwen MT Lite | Available | Global | $0.086 | Unconfirmed | — | |
| `qwen-audio-3.1-asr-flash` | ASR Flash 3.1 | Available | ap-southeast-1 | $0.93 | $0.70 | — | Token-billed. Report's $0.113/$0.382 was Beijing. |
| `qwen-audio-3.0-asr-flash` | ASR Flash 3.0 | Available | ap-southeast-1 | $0.00003/sec | — | — | Time-billed. |
| `qwen3.5-ocr` | Qwen3.5 OCR | Available | ap-southeast-1 | Tiered (1K=$0.00275/img) | — | — | Default output 4,096 tokens. Migrate from qwen-vl-ocr. |
| `qwen-image-2.0` | Qwen Image 2.0 | Available | ap-southeast-1 | 1K=$0.10, 2K=$0.16, 4K=$0.24/img | — | — | |
| `wan3.0-video` | Wan 3.0 Video | Available | ap-southeast-1 | $0.05/s (480P), $0.10/s (720P) | — | — | Billed per sec input+output. Temporary 30% discount. |

*Note: `qwen3.8-flash` is listed in the report at $0.15/$0.47, but NOTES Batch 6 omits it while listing `qwen-flash` at $0.05/$0.40. `qwen3.8-flash` is named as the replacement for retiring `qwen3.5-plus` models (decommissioned 2027-01-19). Treat `qwen3.8-flash` pricing as unconfirmed until resolved.*

### Platforms & Services (Singapore)

| Product | Scope / Status | Price | Notes |
|---|---|---|---|
| **Function Compute** | GA | $0.000020/CU | Promo ended. Quotas: 300 vCPU, 600 GB mem. |
| **AgentCore** | Commercial (pay-as-you-go) | Compute $0.000015/CU; Gateway $0.000000225/CU; Control plane $0.60/hr | Free offer ended 2026-10-18. KB connector reads Beijing MS KBs only. |
| **AgentRun** | Code-first recommended | — | Low-code in maintenance. Open Platform: do not activate. |
| **Agent Sandbox** | Preview estimates | Economy: $0.00000381/vCPU-s; Default: $0.00000496/vCPU-s | Successor to AgentBay. Deep hibernation billed. |
| **AgentBay** | No new purchases (since 2026-11-02) | — | Existing users continue. |
| **DirectMail** | GA | $0.29/1,000 msgs | 2,000 free once (max 200/day). Initial daily quota 2,000. |
| **Chat App Message Service** | GA | $0.005/msg platform fee (Messenger, IG, Telegram, LINE) + WhatsApp pricing | WhatsApp replies within 24h window are free. |
| **AI Guardrails** | GA | $6/10,000 calls per detection type | Detection types: content compliance, sensitive content, prompt injection. |
| **Content Moderation (Text V2.0)** | GA | $0.30/1,000 tasks | |
| **Tablestore Knowledge/Memory** | Supported | CNY reference only (KB: CNY 1.08/GB/mo) | Confirm SGD pricing. |
| **Milvus** | GA | Storage $0.0000416667/GB-hr | No SG CU price found. |
| **AI Search Open Platform** | Regional | — | Frankfurt only (outside mainland). No SG. |

## 3. Rules for the drawing model

- **Draw an execution container** (AgentRun code-first, Function Compute, Dify on ACK, PAI-EAS, or AgentCore) for every workflow. *Fact: No-code apps gated to pre-2025-04-21 SG accounts.*
- **Never draw a "Model Studio Workflow App" or "Knowledge Base" node** for a new account. *Fact: Application Development is gated and preview.*
- **Never draw AgentBay** for new customers. Draw Agent Sandbox instead. *Fact: AgentBay closed to new customers 2026-11-02.*
- **Never draw AI Search Open Platform** in Singapore. *Fact: Only Shanghai and Frankfurt.*
- **Draw AgentLoop in Hong Kong** when observability/evaluation is needed internationally. *Fact: HK is the only international AgentLoop region.*
- **Add a tool-call cost node** whenever `web_search` or `web_search_image` is used. *Fact: $10/1k and $8/1k respectively in SG, independent of token costs.*
- **Draw parallel branches** for fan-out tasks (e.g., multi-locale translation, multi-source research). *Fact: Anthropic patterns note up to 90% less time with 3-5 parallel subagents.*
- **Draw an `approve` gate before any external send** (email, public reply, CRM write). *Fact: Industry standard (Salesforce, Microsoft) and PIPA/Korea requirements.*
- **Draw an AI-disclosure annotation** on any `generate` node whose output reaches South Korea. *Fact: AI Basic Act Art. 31 effective 2026-01-22.*
- **Draw a human-review/explanation fallback** for any `decide/route` node making fully automated decisions significantly affecting individuals in South Korea. *Fact: PIPA Art. 37-2.*
- **Never assume Singapore storage equals Singapore processing.** Add a data-residency warning if requested. *Fact: International scope requests can process outside mainland China; privacy policy permits overseas transfer.*
- **Route cheap steps to small/fast models** (`qwen-flash`) and hard reasoning to large models (`qwen3.8-max`). *Fact: Cost lever documented in pricing.*
- **Show batch inference** for bulk/offline pipelines, but verify the specific model supports it in Singapore first. *Fact: 50% price, but qwen3.8-max/flash excluded in SG.*

## 4. Traps

- **AgentBay looks GA but is closed to new customers** (since 2026-11-02). Use Agent Sandbox.
- **No-code / Zero-code builders look available but are gated** to accounts that created a SG app before 2025-04-21. They are also marked preview.
- **AgentRun Open Platform (FunAgent) looks like a feature but should not be activated** ahead of a major upgrade. Low-code Flow Agent is in maintenance mode. Use code-first.
- **Web search looks like a free built-in tool but costs $10/1,000 calls** in Singapore (plus tokens).
- **Singapore hosting looks like a residency guarantee but is not.** Inference may route globally; data may be transferred overseas per privacy policy.
- **PrivateLink looks supported everywhere but excludes Singapore.** Legacy endpoint examples containing `ap-southeast-1` are not commitments.
- **Batch inference looks universally available but excludes qwen3.8-max and qwen3.8-flash in Singapore**, and cannot be combined with context caching or free quotas.
- **Free quotas look permanent but were removed for many models on 2026-10-29.**
- **Cache discounts look uniform (e.g., 20%) but vary by model and scope.** Store per-model.
- **Qwen-VL-OCR looks current but is deprecated**; migrate to `qwen3.5-ocr`.
- **Assistant API looks active but is deprecated**; use Responses API via `/compatible-mode/v1/responses`.
- **AI Guardrails console looked China-only (Shanghai) in older docs but is now available in SG/HK/Frankfurt/Virginia.**
- **ADBAgent Skills look international but are mainland-China only.** ADBAgent itself is unavailable in SG.
- **Qwen-MT-UNI looks like a translation option but is China-site only.**
- **Retiring models:** `qwen3.5-plus` variants decommission 2027-01-19. Replace with `qwen3.8-flash`.

## 5. Open questions

- **Exact pricing for `qwen3.8-flash`** in Singapore (Report says $0.15/$0.47; NOTES Batch 6 lists `qwen-flash` at $0.05/$0.40 but names `qwen3.8-flash` as the successor to retiring models without confirming its exact price row).
- **`qwen-mt-lite` output price** is unconfirmed.
- **Whether Model Studio batch inference is available in Frankfurt/Tokyo/Virginia** (international doc doesn't enumerate regions).
- **Authoritative region list for AgentRun** (Singapore is used in examples but no dedicated list page found).
- **AgentCore IM channels** beyond DingTalk/Lark/WeCom (no KakaoTalk; Zalo integration in ChatApp unconfirmed).
- **Tablestore Knowledge/Memory Storage SGD pricing** (only CNY reference rates published, and the page contradicts itself on metering units).
- **Thai/Vietnamese/Indonesian ASR coverage** for Qwen-Audio models.
- **Qwen-OCR per-image price tiers** beyond the 1K tier ($0.00275).
- **Qwen-VL family (`qwen3-vl-plus`) current Singapore per-1M-token prices** (tiered brackets truncated in snippets).
- **Whether AI Guardrails' 1,000-token minimum billing applies identically in Singapore** (overview checked showed China-site integration).