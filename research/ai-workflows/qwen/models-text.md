I'll research this systematically, starting with Model Studio's model list and pricing pages.

Let me dig into the official Model Studio documentation pages.

Now let me get details on deprecations, free quota, and third-party models.

# Model Studio text, reasoning and coding models — international catalog
**Research date: 2026-11-02. All prices USD per 1M tokens, Singapore region / `International` deployment scope unless stated.**

---

## 0. Read this first: the "deployment scope" trap (load-bearing for the cost estimator)

Model Studio prices the *same model id* twice — once per **service deployment scope**, not per region name.

| Fact | Source |
|---|---|
| Singapore region uses the **International** deployment scope, "which includes global nodes outside the Chinese mainland" | https://www.alibabacloud.com/help/en/model-studio/singapore-regional-access-information |
| In China (Hong Kong), Japan (Tokyo) and Germany (Frankfurt) you must call from a workspace whose deployment scope is **Global** | https://www.alibabacloud.com/help/en/model-studio/web-search |
| US (Virginia) supports **Global** and **US** scopes | https://www.alibabacloud.com/help/en/model-studio/regions |
| Model Studio regions overall: China (Beijing), US (Virginia), Singapore, Japan (Tokyo), Germany (Frankfurt), China (Hong Kong) | https://www.alibabacloud.com/help/en/model-studio/what-is-model-studio |
| Each region has its own endpoint, API key **and model list**; they cannot be mixed | https://www.alibabacloud.com/help/en/model-studio/get-api-key |
| Concrete price gap: `qwen3.8-max` = **$2 / $6** at `Scope: International` (Singapore) vs **$1.65 / $4.951** on the Global-scope rows | https://www.alibabacloud.com/help/en/model-studio/qwen3-8-max ; https://www.alibabacloud.com/help/en/model-studio/model-pricing |
| Same gap on `qwen3.8-flash`: International $0.15 / $0.47; Global $0.113 / $0.382 | https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen3-8-flash |
| Free quota is **only** for models in Singapore **with deployment scope = International** | https://www.alibabacloud.com/help/en/model-studio/new-free-quota |

**Drawing rule for the app:** if the diagram's region is `ap-southeast-1`, use the `International` price column and show the 1M-token free quota. If the user picks Frankfurt/Tokyo/Virginia/HK, switch to the `Global` column and drop the free-quota badge.

Nothing I found contradicts the four facts you verified on 2026-10-31. The $2/$6 Singapore figure for `qwen3.8-max` is re-confirmed on the official pricing page (row reads `International · Non-Thinking and Thinking modes · 0<Token≤1M · $2 · $6`) [https://www.alibabacloud.com/help/en/model-studio/model-pricing].

---

## 1. Qwen flagship / balanced / fast tiers

### 1a. Naming: series id vs `-latest` vs dated snapshot

Model Studio's own lifecycle doc: "A model series is available in three forms: `qwen-max`, `qwen-plus`…" — i.e. the **series name** (rolling alias), a **`-latest`** alias, and **dated snapshots** [https://www.alibabacloud.com/help/en/model-studio/model-depreciation ; https://help.aliyun.com/en/model-studio/model-depreciation].

| Naming behaviour | Evidence |
|---|---|
| Rolling alias silently re-points to a new snapshot: "`qwen3-max` will be automatically upgraded to the `qwen3-max-2026-01-23` snapshot model, with no changes to…" | https://www.alibabacloud.com/en/notice/model_studio_update_notice_for_qwen3max_6a2?_p_lc=1 |
| `qwen3.8-max` endpoint upgraded effective **September 5, 2026 (UTC+8)** | https://www.alibabacloud.com/en/notice/model_studio_update_notice_for_qwen38max_models_863?_p_lc=1 |
| `qwen3.8-max-0902` (alias `qwen3.8-max-2026-09-02`) is "an upgraded snapshot of `qwen3.8-max`" | https://www.alibabacloud.com/help/en/model-studio/newly-released-models |
| `qwen3-coder-flash` is "Currently equivalent to `qwen3-coder-flash-2025-07-28`" | https://www.alibabacloud.com/help/en/model-studio/model-pricing |
| `qwen3.7-plus` is "Currently equivalent to `qwen3.7-plus-2026-05-26`" (both rows priced) | https://www.alibabacloud.com/help/en/model-studio/model-pricing |
| Rate-limit guidance: "The stable version or latest version has more lenient rate limiting than dated snapshot versions" | https://www.alibabacloud.com/help/en/model-studio/rate-limit |
| `qwen-plus-latest` "belongs to the Qwen3 series, not the Qwen3.5 or Qwen3.7 series" | https://www.alibabacloud.com/help/en/model-studio/faq-about-alibaba-cloud-model-studio |

**Recommendation for new builds:** pin the *series* id (`qwen3.8-max`, `qwen3.8-flash`, `qwen3.7-plus`) for best rate limits, and pin a dated snapshot only when reproducibility matters — snapshots get retired in waves (see §7).

### 1b. Tier table

Model Studio's own tier labels (from the "Recommended models" card on the models overview): `qwen3.8-max` = **"Complex reasoning and coding"**; `qwen3.7-plus` = **"Balanced performance, speed, and cost"**; `qwen3.8-flash` = **"Fast and cost-effective"** [https://www.alibabacloud.com/help/en/model-studio/models].

| Model id | Tier / purpose | Context window | Max output | Singapore (`International`) price in / out | Tiering by input length | Thinking | Function calling / built-in tools / structured output | International regions | Status | Free quota (new user) |
|---|---|---|---|---|---|---|---|---|---|---|
| `qwen3.8-max` | Flagship; complex reasoning + coding; 2.4T-param MoE, native text/image/video input | 1,000,000 (max input 991,808) | 131,072 (also 131,072 in thinking mode; thinking max input 983,616) | **$2 / $6**; implicit-cache input $0.25; explicit-cache creation $2.50 | Single tier `0<Token≤1M` — flat | Yes — "Non-Thinking and Thinking modes", one price for both | Supported / Supported / Supported | Singapore, Beijing, Hong Kong, Frankfurt, Virginia, Tokyo | GA — widely available from **2026-08-03**; endpoint upgraded 2026-09-05 | 1,000,000 tokens, 90 days, Singapore only |
| `qwen3.8-max-0902` | Upgraded coding/cowork snapshot of the flagship | 1,000,000 | 131,072 | $2 / $6 (same as series) | `0<Token≤1M` | Yes | Supported / Supported / Supported | Same as `qwen3.8-max` | GA snapshot, released 2026-09-02 | 1,000,000 tokens (per-model) |
| `qwen3.7-max` | Previous flagship | 1,000,000 (max input 991,808) | 131,072 | **$2.5 / $7.5**; implicit cache $0.50; explicit creation $3.125; explicit read $0.25 | flat | Yes | Supported | Singapore + other intl regions (per model page) | GA; snapshot `qwen3.7-max-2026-05-20` at $2.5/$7.5 | 1,000,000 tokens |
| `qwen3.7-plus` | **Balanced** — Model Studio's own recommendation for coding tools and agents | 1,000,000 (max input 991,808) | 131,072 | `0<Token≤256K`: **$0.4 / $1.6** (non-thinking) and **$1.6** (thinking) · `256K<Token≤1M`: **$1.2 / $4.8** | **Yes — 2 tiers** | Yes | Supported / Supported / Supported; Context Caching + Batch supported | Singapore + other intl regions | GA; currently equivalent to `qwen3.7-plus-2026-05-26`; page shows a "Limited-time 20% off" label | 1,000,000 tokens |
| `qwen3.8-flash` | **Fast / cheap**; multimodal (text+image+video in) | 1,000,000 | 131,072 (thinking mode) | **$0.15 / $0.47**; implicit cache $0.016; explicit creation $0.177; explicit read $0.014 | Single tier `0<Token≤1M` — flat | Yes | Supported / Supported / Supported | Singapore, Frankfurt (EU), Hong Kong, + others | GA — released ~2026-08-26/27 | 1,000,000 tokens |
| `qwen3.7-flash` | Previous fast tier | 1,000,000 | 65,536 (thinking max output) | from **$0.03 / $0.13** at the lowest tier | **Yes — multi-tier (32K / 128K / 256K / 1M)** | Yes | Supported | Singapore + others | GA | 1,000,000 tokens |
| `qwen-plus` (rolling) | Legacy balanced alias, text-only input | 1,000,000 (max input 995,904) | **32,768** | `Input<=256k`: **$0.4 / $1.2** | Yes | Yes (separate `Input(Thinking)` / `Output(Thinking)` line items) | Supported | Singapore + others | GA alias; points at the Qwen3 series | 1,000,000 tokens |
| `qwen-flash` (rolling) | Legacy fast alias | 1,000,000 | — | **$0.05 / $0.40** up to 256K input | Yes | Yes | Supported | Singapore (batch supported) | GA alias | 1,000,000 tokens |
| `qwen3.5-plus` | Prior-gen balanced | 1,000,000 (max input 991,808) | 65,536 | `Input<=256k`: **$0.4 / $2.4**; `Output(Batch Chat)` $3.44 | Yes | Yes | Supported | Singapore + others | GA | 1,000,000 tokens |
| `qwen3.6-plus` / `qwen3.6-flash` | Prior-gen balanced / fast | — | — | `Scope: International`, `Input<=256k` rows exist; `Input(Batch Chat)` $1.10 / $0.66 and `Output(Batch Chat)` $6.601 / $3.961 respectively | Yes | Yes | Supported | Singapore + others | GA | 1,000,000 tokens |

Sources for the table rows: model-info pages https://www.alibabacloud.com/help/en/model-studio/qwen3-8-max , https://www.alibabacloud.com/help/en/model-studio/qwen3-8-flash , https://www.alibabacloud.com/help/en/model-studio/qwen3-7-plus , https://www.alibabacloud.com/help/en/model-studio/qwen3-7-max , https://www.alibabacloud.com/help/en/model-studio/qwen-plus , https://www.alibabacloud.com/help/en/model-studio/qwen-flash , https://www.alibabacloud.com/help/en/model-studio/qwen3-5-plus , https://www.alibabacloud.com/help/en/model-studio/qwen3-6-plus.md , https://www.alibabacloud.com/help/en/model-studio/qwen3-6-flash.md ; consolidated pricing https://www.alibabacloud.com/help/en/model-studio/model-pricing ; capability matrix https://docs.modelstudio.console.alibabacloud.com/en/model-studio/text-generation-model ; regions https://help.aliyun.com/en/model-studio/qwen3-8-max ; GA date https://www.alibabacloud.com/blog/alibaba-unveils-qwen3-8-max-its-largest-and-most-capable-flagship-model-to-date_603420 ; free quota https://www.alibabacloud.com/help/en/model-studio/new-free-quota .

### 1c. Is there a `qwen3.8-plus`? — **No, not in Model Studio's international model list**

The international Text-Generation model list is `qwen3.8-max · qwen3.7-max · qwen-max · qwen3.7-plus · qwen3.6-plus · qwen3.5-plus · qwen-plus · qwen3.8-flash · qwen3.7-flash · qwen3.6-flash · qwen3.5-flash · qwen-flash · qwen-plus-character · qwen-plus-character-ja · …` [https://www.alibabacloud.com/help/en/model-studio/model-list-text-generation/]. There is no `qwen3.8-plus` in it, and the 3.8-generation "balanced" slot is still filled by `qwen3.7-plus` [https://www.alibabacloud.com/help/en/model-studio/models]. A third-party reference states plainly "There is no `qwen3.8-plus`; the cheap slot in this generation is `qwen3.8-flash`" [https://howaiworks.ai/models/qwen/]. Two non-official sources mention a "Qwen3.8 Plus" in a Coding Plan context [https://codingplans.dev/vendors/alibaba/] and a GitHub issue refers to `qwen3.8-plus` [https://github.com/QwenLM/qwen-code/issues/10194] — **existence of a `qwen3.8-plus` API id on the international site: unconfirmed.**

Also seen but **not** in the international pay-as-you-go list: `qwen3.8-max-preview` (reported "Token Plan only") [https://wavespeed.ai/blog/ai-models/qwen3-8-api/], and `qwen3.8-max-prime`, which a tracker records as no longer offered on Model Studio from 2026-10-21 [https://jia.je/kb/en/software/coding_plan.html] — **both unconfirmed against an official page.**

---

## 2. Thinking / reasoning modes and how thinking tokens are billed

| Item | Detail | Source |
|---|---|---|
| Switch | `enable_thinking` parameter turns thinking on/off per request for hybrid-thinking models | https://www.alibabacloud.com/help/en/model-studio/deep-thinking |
| Deep-Think-only models | "Except that you do not need to set the `enable_thinking` parameter, the request format is consistent with the hybrid thinking mode" | https://www.alibabacloud.com/help/en/model-studio/deep-thinking |
| Two deep-think modes | "Mixed Thinking Mode: Thinking can be enabled or disabled per request, and the control…" | https://www.alibabacloud.com/help/en/model-studio/deep-thinking |
| Budget cap | "The optional `thinking_budget` parameter sets an upper limit on the number of thinking…" tokens | https://help.aliyun.com/en/model-studio/batch-inference **(China site)** |
| **Billing** | "Thinking content is billed by **Output Token**. Some hybrid thinking models have **different prices in thinking and non-thinking modes**." | https://www.alibabacloud.com/help/en/model-studio/deep-thinking |
| Billing (cost guidance) | "When the model emits its thinking process, **all** output tokens are billed at the thinking-mode output price" | https://www.alibabacloud.com/help/en/well-architected/cost-pillar |
| Batch + thinking | "Some models support thinking mode. Enabling it generates thinking tokens and increases costs. The `qwen3.8`, `qwen3.7`, `qwen3.6`…" | https://help.aliyun.com/en/model-studio/batch-inference **(China site)** |
| Conflict to encode | "`Json mode response is not supported when enable_thinking is true`" — structured output and thinking cannot both be on for affected models | https://www.alibabacloud.com/help/en/model-studio/error-code |
| Per-model max CoT | Model pages publish `Max Input Length (Thinking Mode)`, `Max Output Length (Thinking Mode)` and `Max Chain-of-Thought Length` (e.g. `qwen3.8-max`: 983,616 / 131,072) | https://www.alibabacloud.com/help/en/model-studio/qwen3-8-max |

**Which models have hybrid thinking (confirmed "Supported" in the official capability matrix):** `qwen3.8-max`, `qwen3.8-max-0902`, `qwen3.8-flash`, `qwen3.7-plus`, `qwen3.7-flash` [https://docs.modelstudio.console.alibabacloud.com/en/model-studio/text-generation-model]. Third-party `glm-5.3` and `glm-5.1` are sold as "Non-Thinking and Thinking modes" rows [https://www.alibabacloud.com/help/en/model-studio/model-pricing]. `kimi-k3` is described as an always-on reasoning flagship [https://github.com/vxcontrol/pentagi/blob/main/README.md].

**Pricing shapes to encode (three distinct patterns):**
1. **Single price for both modes** — `qwen3.8-max` row literally reads "Non-Thinking and Thinking modes · 0<Token≤1M · $2 · $6" [https://www.alibabacloud.com/help/en/model-studio/model-pricing]; `qwen3.7-plus` ≤256K is $0.4 in / $1.6 out for *both* thinking and non-thinking output [same].
2. **Separate thinking line items** — `qwen-plus` publishes `Input(Thinking)` / `Output(Thinking)` as distinct billing items [https://www.alibabacloud.com/help/en/model-studio/qwen-plus].
3. **Three-column open-source rows** — input / output(non-thinking) / output(thinking), e.g. `qwen3.8-27b` `0<Token≤256K · $0.5 · $3 · $3` and `qwen3.6-35b-a3b · $0.375 · $2.25 · $2.25` [https://www.alibabacloud.com/help/en/model-studio/model-pricing].

---

## 3. Coding models and long-context / document models

### 3a. Coding

| Model id | Purpose | Context | Singapore (`International`) price in / out | Notes | Status |
|---|---|---|---|---|---|
| `qwen3-coder-plus` | Agentic coding flagship (480B-A35B lineage) | 1,000,000 | *was* tiered: $1/$5 ≤32K · $1.80/$9 32–128K · $3/$15 128–256K · $6/$60 256K–1M | **Retired 2026-10-10**; official replacement = **`qwen3.7-plus`** | **Deprecated/retired** |
| `qwen3-coder-flash` | Fast code generation, multi-turn tool interaction, inherits Qwen3-Coder-Plus agent capability | 256K native, extendable to 1M with YaRN | `0<Token≤32K`: **$0.3 / $1.5**, "No free quota"; higher tiers at `32K<Token≤128K` etc. A second row on the same page shows `$0.144 / $0.574` for `0<Token≤32K` (promo or other scope — **unconfirmed which**) | "Currently equivalent to `qwen3-coder-flash-2025-07-28`" | GA on the international pricing page |
| `qwen3-coder-next` | Open-weight coding-agent model, small hybrid architecture | 262,144 | Trackers report ~$0.11–$0.12 in / $0.80 out; one reports $0.30/$1.50 — **official International row unconfirmed** | Listed on the international free-quota page and has its own model-info page | GA |
| `qwen3.7-plus` | **Model Studio's actual coding recommendation** | 1,000,000 | $0.4 / $1.6 ≤256K; $1.2 / $4.8 above | "We recommend `qwen3.7-plus` for balanced performance and cost, with full tool calling and a 1M-token context window for large codebases" | GA |
| `kimi-k3` (3rd party) | Long-horizon coding | 1,000,000 | see §5 | "If you prefer third-party models, choose `kimi-k3` for long-horizon coding" | GA |
| `glm-5.3` (3rd party) | Open-source SOTA coding + agent tasks | — | see §5 | "…or `glm-5.3` for open-source SOTA coding and agent tasks" | GA |

Sources: https://www.alibabacloud.com/help/en/model-studio/model-pricing (Qwen-Coder section, `qwen3-coder-flash` row) ; https://www.alibabacloud.com/help/en/model-studio/qwen3-coder-flash ; https://www.alibabacloud.com/help/en/model-studio/qwen3-coder-next ; https://docs.modelstudio.console.alibabacloud.com/en/model-studio/text-generation-model ; retirement + replacement https://therouter.ai/news/dashscope-qwen-native-model-retirement-october-2026-routing/ , https://help.aliyun.com/en/dataworks/announcement-on-model-retirement-for-dataworks-data-agent **(China site)**, https://benchlm.ai/alibaba/api-pricing ; prior coder-plus tiers https://guptadeepak.com/ai-models/qwen/qwen3-coder-plus/ , https://www.morphllm.com/qwen-api ; `qwen3-coder-next` context https://openrouter.ai/qwen/qwen3-coder-next ; Qwen3-Coder YaRN/256K https://qwen.ai/blog?id=qwen3-coder .

⚠️ **Catalog warning for the app:** several *non-official* pages still list `qwen3-coder-plus` as live with $1/$5 pricing [https://getdeploying.com/llms/qwen3-coder-plus , https://www.requesty.ai/model/alibaba/qwen3-coder-plus , https://github.com/vxcontrol/pentagi/blob/main/README.md], and Alibaba's own free-quota page still lists `qwen3-coder-plus; qwen3-coder-plus-2025-07-22` [https://www.alibabacloud.com/help/en/model-studio/new-free-quota]. Treat the free-quota page as stale for retired ids.

### 3b. Long context / documents

| Model id | Purpose | Context | Max output | Singapore price in / out | Thinking | FC / structured output | Status | Free quota |
|---|---|---|---|---|---|---|---|---|
| `qwen-long` (+ `qwen-long-latest`, `qwen-long-2025-01-25`) | Ultra-long document processing via **file upload + `file-id` reference**, not raw context stuffing | **10,000,000** (Max Input 10,000,000) | **8,192** | **Unconfirmed for `Scope: International`.** The model page's visible USD row is Input **$0.072** / Output **$0.287**, `Input(Batch File)` $0.036 / `Output(Batch File)` $0.143 — a tracker attributes exactly these numbers to **China (Beijing)**, so do not use them for Singapore without re-checking | Not a thinking model | Capability matrix shows `qwen-long` at **10M · Unsupported · Unsupported · Unsupported · Supported** (thinking / FC / built-in tools / structured output) | **Still offered and still recommended**: "For long-document processing such as reviewing multiple contracts, use `qwen-long` (10M-token context window)" | Listed on the free-quota page |
| `qwen3.8-max` / `qwen3.8-flash` | 1M-context alternative for long docs and large codebases | 1,000,000 | 131,072 | $2/$6 · $0.15/$0.47 | Yes | Yes | GA | 1M tokens |

Sources: https://www.alibabacloud.com/help/en/model-studio/qwen-long ; https://www.alibabacloud.com/help/en/model-studio/long-context-qwen-long ; https://www.alibabacloud.com/help/id/model-studio/qwen-long (Indonesian locale of the same page, where the USD figures appear) ; https://ai-api-hub.com/providers/alibaba/pricing/ ; https://docs.modelstudio.console.alibabacloud.com/en/model-studio/text-generation-model ; https://www.alibabacloud.com/help/en/model-studio/newly-released-models .

Note the **hard 8,192-token output ceiling on `qwen-long`** — a real constraint for the app's "draft reply" step; a long draft must come from `qwen3.7-plus`/`qwen3.8-flash` (131,072 max output) or `qwen-flash` (32,768), not `qwen-long`.

---

## 4. Open-weight Qwen models served on Model Studio — and whether they are cheaper

The international pricing page's open-weight section is now titled **"Text generation - Qwen (open source)"** with sub-sections **Qwen3.8 · Qwen3.6 · Qwen3.5 · Qwen-VL** [https://www.alibabacloud.com/help/en/model-studio/model-pricing]. **There is no longer a plain "Qwen3" sub-section** — consistent with the 2026-10-10 retirement wave.

| Model id | Size / type | Context | Singapore (`International`) in / out (non-thinking / thinking) | Cheaper than the proprietary equivalent? | Free quota |
|---|---|---|---|---|---|
| `qwen3.8-2.4t-a95b` | 2.4T MoE, ~95B active — **open weights of the Qwen3.8-Max flagship**, released Aug 2026; text-only checkpoint, 262,144 native context on HF | 262K (HF) — hosted context **unconfirmed** | Reported **$2.00 / $6.00**, i.e. *identical* to hosted `qwen3.8-max` | **No — same price** | — |
| `qwen3.8-27b` | 27B dense, native vision-language | 1,000,000 (max input 991,808; thinking max input 983,616) | `0<Token≤256K`: **$0.5 / $3 / $3**; `256K<Token≤1M`: higher (row continues) | Yes vs `qwen3.7-plus` above 256K, no below | **"No free quota"** on the pricing row, but the model is reported to carry a Singapore free quota elsewhere — **conflict, unconfirmed** |
| `qwen3.6-35b-a3b` | 35B MoE / 3B active, agentic-coding oriented, Apache-2.0 | 262K | `0<Token≤256K`: **$0.375 / $2.25 / $2.25** | Yes | **No free quota** |
| `qwen3.6-27b` | 27B dense | — | `0<Token≤256K`: **$0.6 / $3.6 / $3.6** | Yes vs Plus at ≤256K? **No — it is *more* expensive than `qwen3.7-plus` ($0.4/$1.6) at ≤256K** | **No free quota** |
| `qwen3.5-397b-a17b` | 397B MoE / 17B active | 262K | Reported **$0.60 / $3.60** International | Yes | — |
| `qwen3.5-122b-a10b`, `qwen3.5-27b`, `qwen3.5-35b-a3b`, `qwen3.5-9b` | Qwen3.5 open-weight sizes | 262K | Reported $0.26/$0.90, $0.20/$0.90, $0.07/$0.75, $0.08/$0.13 — **secondary source only, unconfirmed** | Yes | — |
| **`qwen3-235b-a22b`, `qwen3-235b-a22b-instruct-2507`, `qwen3-235b-a22b-thinking-2507`, `qwen3-32b`, `qwen3-30b-a3b-instruct-2507`, `qwen3-30b-a3b-thinking-2507`, `qwen3-14b`, `qwen3-8b`, `qwen3-4b`** | The sizes you asked about specifically | 262K (2507 variants) | — | — | **Reported retired 2026-10-10**, replacement `qwen3.7-plus`. Still named on Alibaba's free-quota page → **doc inconsistency; treat as unavailable and verify in console** |

Sources: https://www.alibabacloud.com/help/en/model-studio/model-pricing (rows quoted verbatim for `qwen3.8-27b`, `qwen3.6-35b-a3b`, `qwen3.6-27b`) ; https://www.alibabacloud.com/help/en/model-studio/qwen3-8-27b ; https://www.alibabacloud.com/help/en/model-studio/newly-released-models (`Qwen3.8-2.4T-A95B` … "released in August 2026 … sparse MoE") ; https://seminal.ai/reference/models/alibaba-qwen-qwen3-8-2-4t-a95b/ ; https://developer.puter.com/tutorials/qwen-api-pricing/ ; https://cabina.ai/blog/qwen-api-pricing/ ; https://benchlm.ai/alibaba/api-pricing ; https://www.morphllm.com/qwen-3-5 ; https://pricepertoken.com/pricing-page/provider/qwen ; retirement mapping https://try-qwen-ai.com/updates/model-deprecations/ , https://therouter.ai/news/dashscope-qwen-native-model-retirement-october-2026-routing/ ; stale free-quota listing https://www.alibabacloud.com/help/en/model-studio/new-free-quota ; Apache-2.0 licensing https://www.morphllm.com/qwen-api .

**Answer to "do open weights cost less?"** — **Only in the mid/small sizes.** The open-weight *flagship* (`qwen3.8-2.4t-a95b`) is priced the same as the hosted flagship ($2/$6). The genuine savings are `qwen3.6-35b-a3b` ($0.375/$2.25) and `qwen3.8-27b` ($0.5/$3 ≤256K) versus `qwen3.7-plus` **above** 256K ($1.2/$4.8). Below 256K, `qwen3.7-plus` at $0.4/$1.6 is **cheaper than `qwen3.6-27b`** and only 4× `qwen3.6-35b-a3b` on input. Reuters also reported Alibaba "plans to charge big users of its next open-source AI model" [https://www.reuters.com/business/retail-consumer/alibaba-plans-charge-big-users-its-next-open-source-ai-model-sources-say-2026-08-07/].

---

## 5. Third-party models on the international site, and in which regions

**Big change you must encode:** a large third-party retirement landed on **2026-10-10**. Current official docs confirm **nine DeepSeek model IDs plus `glm-4.6` and `glm-4.7` retired on October 10, 2026** [https://puppyip.com/en/resources/alibaba-model-studio-deepseek-model-delisting-migration-guide]; trackers add Kimi-K2, MiniMax-M2.1 and `qwen-coder-plus` proxies [https://therouter.ai/news/tag/model-deprecation/ , https://x.com/MilkRoadAI/status/2108791640928444810]. The platform "continues to support newer models (such as the DeepSeek-v4 series, GLM-5.x, Kimi-k3, MiniMax-M2.5)".

The international pricing page has a **"Text generation - third-party models"** section with sub-sections **DeepSeek · Kimi · MiniMax · GLM** [https://www.alibabacloud.com/help/en/model-studio/model-pricing]. The models overview lists `kimi-k3`, `MiniMax-M2.5`, `glm-5.3` / `ZHIPU/GLM-5.3` under Text generation [https://www.alibabacloud.com/help/en/model-studio/models].

| Model id | Vendor / purpose | Context | Price in / out (scope noted) | Cache | Free quota | Regions confirmed | Status |
|---|---|---|---|---|---|---|---|
| `deepseek-v4-pro` (+ `deepseek-v4-pro-0813`) | DeepSeek flagship reasoning/coding | — | **International: $2.400 / $4.800**, "context caching discount" | Yes | **1 million tokens** (in the "free quota only in Singapore" list) | Singapore + intl regions | GA |
| `deepseek-v4-flash`, `deepseek-v4-flash-0731` | Cheap fast DeepSeek | 1M | **Peak/off-peak pricing since 2026-08-17 00:00**; trackers read $0.44/$1.32 peak, $0.22/$0.66 off-peak | — | — | — | GA |
| `deepseek-v4.1-flash` / `deepseek-v4.1-flash-1017` | Lightweight flagship, 552B total MoE | 1M | Trackers: ~$0.15 off-peak / $0.30 peak input — **official International row unconfirmed** | — | — | **Six regions, explicitly: China (Beijing), Singapore, US (Virginia), Germany (Frankfurt), Japan (Tokyo), China (Hong Kong)**; supports the Responses API in all six | GA |
| `kimi-k3` | Moonshot flagship, 2.8T params, always-on reasoning, native 1M context | 1,000,000 | Pricing-page row: **$2.827 / $14.133**, `Input(Implicit Cache)` $0.283. One tracker labels this the **Global**-scope row — **International-scope price unconfirmed** | Implicit cache at **10%** for `kimi-k3` (China doc) | **No free quota** | Singapore (model page shows a Singapore `Scope: International` block) | GA |
| `kimi-k2.7-code` | Kimi coding variant | — | Pricing-page row **$0.894 / $3.713**; the model page's `Scope: International` block shows **$0.95 / $4.00** — **conflict, verify in console** | Implicit cache listed | No free quota | Singapore | GA |
| `glm-5.3` (`ZHIPU/GLM-5.3`) | Z.ai flagship, SOTA open-source coding/agent | — | **Singapore `Scope: International`: $1.4 / $4.4**; a second International row reads **$2.800 / $8.800** (likely thinking-mode or a different tier — **unconfirmed**); `Scope: Global` block: $1.131 / $3.957; cache read $0.26–0.283 | Yes | — | **GLM family: US (Virginia), North China 2 (Beijing), Germany (Frankfurt), Singapore, Hong Kong (China), Japan (Tokyo)**; `glm-5.3` model page shows Singapore + Frankfurt blocks; separately announced as live in the US | GA |
| `glm-5.1` | Prior GLM flagship | — | "International · Non-Thinking and Thinking modes" row, **$2.800 / $8.800**, no free quota | — | None | Singapore | GA |
| `MiniMax-M2.5` | MiniMax, 1M context, cheap bulk | 1,000,000 | China doc: "Thinking mode only · CNY 2.1 / CNY 8.4" — **International USD row unconfirmed** | — | — | Rate-limit page lists MiniMax-M2.5 at 500 RPM / 1,000,000 TPM | GA |

Sources: https://www.alibabacloud.com/help/en/model-studio/model-pricing ; https://www.alibabacloud.com/help/en/model-studio/deepseek-api ; https://www.alibabacloud.com/help/en/model-studio/deepseek-api.md ; https://www.alibabacloud.com/help/en/model-studio/deepseek-v4-1-flash ; https://www.alibabacloud.com/help/en/model-studio/kimi-k3 ; https://www.alibabacloud.com/help/en/model-studio/kimi-k2-7-code ; https://www.alibabacloud.com/help/en/model-studio/glm-5-3 ; https://docs.modelstudio.console.alibabacloud.com/en/model-studio/glm-5-3 ; https://www.alibabacloud.com/help/en/model-studio/glm-5-3-by-zhipu ; https://www.alibabacloud.com/help/en/model-studio/rate-limit ; https://help.aliyun.com/en/model-studio/context-cache **(China site, for the kimi-k3 10% implicit-cache rate)** ; https://www.facebook.com/alibabacloud/posts/1582306287274791/ .

---

## 6. Translation models (Qwen-MT)

Qwen-MT is "a machine translation model fine-tuned from Qwen3. It supports **92 languages** — including Chinese, English, Japanese, Korean, French, Spanish, German, Thai, Indonesian, Vietnamese, and Arabic" [https://www.alibabacloud.com/help/en/model-studio/machine-translation].

Capability matrix row shape: `qwen-mt-plus · 16k · Thinking: Unsupported · Function Calling: Unsupported · Built-in tools: Unsupported · …` [https://docs.modelstudio.console.alibabacloud.com/en/model-studio/text-generation-model]. `qwen-mt-turbo · 16k · Unsupported · Unsupported` [same page].

| Model id | Context | Singapore (`International`) in / out | `Global`-scope in / out | Status / notes |
|---|---|---|---|---|
| `qwen-mt-plus` | 16K | **$2.46 / $7.37** | $0.259 / $0.775 | Flagship translation model, "fully upgraded with the Qwen3 architecture", 92 languages. Note the ~9.5× International-vs-Global gap — verify before quoting |
| `qwen-mt-flash` | 16K | **$0.16 / $0.49** | $0.101 / $0.280 | "rapid, cost-effective translation across 92 languages", terminology intervention supported |
| `qwen-mt-lite` | 16K | **$0.12 / $0.36** | $0.086 / $0.229 | Released **2025-11-19**, International |
| `qwen-mt-turbo` | 16K | **Unconfirmed** — some trackers label the $0.16/$0.49 row "Turbo" rather than "Flash" | — | Legacy tier; the Qwen solutions page still describes it as 26-language Zh↔En focused |
| `qwen-mt-uni` | — | **Not found on the international site** | — | Multimodal (image/text/audio/document) translation — **China site only** (help.aliyun.com) |

Sources: https://www.alibabacloud.com/help/en/model-studio/model-pricing (rows `qwen-mt-plus · International · $2.46 · $7.37`, `qwen-mt-flash · International · $0.16 · $0.49`, `qwen-mt-lite · International · $0.12 · $0.36`, and the `Global` rows `qwen-mt-plus $0.259/$0.775`, `qwen-mt-flash $0.101/$0.280`, `qwen-mt-lite US $0.12/$0.36` / `$0.086/$0.229`) ; https://www.alibabacloud.com/help/en/model-studio/qwen-mt-plus ; https://www.alibabacloud.com/help/en/model-studio/qwen-mt-flash ; https://www.alibabacloud.com/help/en/model-studio/qwen-mt-lite ; https://www.alibabacloud.com/help/en/model-studio/machine-translation ; https://www.alibabacloud.com/help/en/model-studio/qwen-mt-api (OpenAI-compatible; Singapore / Virginia / Beijing regions) ; https://www.alibabacloud.com/help/en/model-studio/newly-released-models (`qwen-mt-lite`, 2025-11-19, International) ; https://help.aliyun.com/en/model-studio/qwen-mt-uni **(China site only)**.

**Practical note for the support-email use case:** at $2.46/$7.37 International, `qwen-mt-plus` is *more expensive than `qwen3.8-max` on input*. For multilingual support triage, `qwen3.8-flash` ($0.15/$0.47) or `qwen-mt-flash` ($0.16/$0.49) are the sane defaults; reserve `qwen-mt-plus` for terminology-controlled / glossary translation.

---

## 7. Deprecations and retirements announced for 2026–2027

Official policy page: **https://www.alibabacloud.com/help/en/model-studio/model-depreciation** ("Understand Model Lifecycle, Deprecation & Retirement"). Its current section headings are:

- **Deprecated models → Scheduled for deprecation on January 19, 2027**
- **Deprecated on October 10, 2026**
- **Retired on May 31, 2026**
- **Retired on May 13, 2026**
- **Deprecated on …** (earlier waves)

Policy mechanics: "Alibaba Cloud Model Studio periodically retires legacy models"; "Published announcements may be updated, for example, to change replacement models or to cancel the retirement of some models" [https://help.aliyun.com/en/model-studio/model-depreciation **(China site)**]. Error handling: "If the model has been deprecated, confirm its status in Model Deprecation Policy and switch to one of the alternative models" [https://www.alibabacloud.com/help/en/model-studio/error-code].

### Wave 1 — **19 January 2027** (forward-looking; the one that matters for a proposal written today)

| Item | Detail | Source |
|---|---|---|
| Notice | "Model Studio will decommission the legacy models listed in the table below on **January 19, 2027 (UTC+8)**" | https://www.alibabacloud.com/en/notice/detail?_p_lc=1&id=2217 |
| Two-stage shutdown | Stage 1 (before the date): renewals/upgrades of savings plans and resource packs for these models stop. Stage 2 — "**January 19, 2027 (Official Decommissioning): The models will completely cease inference services**" | https://www.alibabacloud.com/en/notice/detail?_p_lc=1&id=2217 |
| Table contents | The notice table publishes *Model Name · Input Cost $/Million tokens · Output Cost $/Million tokens* plus recommended replacements — **I could not read the individual model ids from search snippets; the exact list is unconfirmed** | https://www.alibabacloud.com/en/notice/detail?_p_lc=1&id=2217 |
| Linked from | Model-depreciation page → "Scheduled for deprecation on January 19, 2027 · For details, see https://www.alibabacloud.com/zh/notice/detail?_p_lc=1&id=2217" (note: the doc links the **`/zh/`** path) | https://www.alibabacloud.com/help/en/model-studio/model-depreciation |

### Wave 2 — **10 October 2026** (already executed; four simultaneous official notices)

| Notice | Content | URL |
|---|---|---|
| id=1841 | "Model Studio will decommission the **mainline models for the Beijing and Singapore regions** listed below on October 10, 2026." Visible ids: `qwen-turbo`, `qwen-vl-plus`, `qwq-plus`, `qvq-max`. "Recommended Alternatives: We recommend replacing the soon-to-be-decommissioned models with the latest Qwen3…" | https://www.alibabacloud.com/notice/detail?_p_lc=1&id=1841 ; https://www.alibabacloud.com/en/notice/model_studionotice_on_the_decommissioning_of_certain_historical_mainline_models_731?_p_lc=1 |
| id=1938 | "the Model Studio will decommission the mainline models listed below on October 10, 2026" (table includes $0.23/1M · $1.434/1M rows) | https://www.alibabacloud.com/notice/detail?_p_lc=1&id=1938 |
| id=1950 | "Alibaba Cloud Model Studio will retire the **mainline models** listed in the table below on October 10, 2026" | https://www.alibabacloud.com/notice/detail?_p_lc=1&id=1950 |
| id=1934 | "【Product Change】Speech Snapshot Models EoS Notice" — snapshot models decommissioned Oct 10, 2026 | https://www.alibabacloud.com/notice/detail?_p_lc=1&id=1934 |
| Legacy-models notice | "Alibaba Cloud Model Studio will retire the models listed in the table below on October 10, 2026. **Prices are based on the Singapore region.**" | https://www.alibabacloud.com/en/notice/model_studio_notice_of_retirement_for_selected_legacy_models_7d9?_p_lc=1 |
| Legacy-**mainline** notice | "…will retire the mainline models listed in the table below on October 10, 2026" | https://www.alibabacloud.com/en/notice/model_studio_notice_of_retirement_for_selected_legacy_mainline_models_79e?_p_lc=1 |
| Timing | 00:00 Beijing time (UTC+8) on 2026-10-10 = 2026-10-09 16:00 UTC; no grace period | https://therouter.ai/blog/dashscope-oct-2026-model-sunset-countdown-migration-checklist/ ; https://try-qwen-ai.com/updates/model-deprecations/ |

**Text-generation ids confirmed retired on 2026-10-10, with official replacements:**

| Retired id | Replacement | Source |
|---|---|---|
| `qwen3-coder-plus` | `qwen3.7-plus` | https://therouter.ai/news/dashscope-qwen-native-model-retirement-october-2026-routing/ ; https://help.aliyun.com/en/dataworks/announcement-on-model-retirement-for-dataworks-data-agent **(China site)** ; https://benchlm.ai/alibaba/api-pricing |
| `qwen3-max`, `qwen3-max-preview`, `qwen3.6-max-preview`, `qwen3-vl-flash` | Qwen3.7 generation | https://therouter.ai/blog/ |
| `qwen-turbo`, `qwq-plus`, `qvq-max`, `qwen-vl-max`, `qwen-coder-turbo`, `qwen-tts`, paraformer ASR stack | latest Qwen3 series | https://therouter.ai/news/dashscope-qwen-native-model-retirement-october-2026-routing/ ; https://www.alibabacloud.com/notice/detail?_p_lc=1&id=1841 |
| `qwen3-235b-a22b-instruct-2507`, `qwen3-235b-a22b-thinking-2507` (hosted Qwen3 open-weight edition) | `qwen3.7-plus` | https://try-qwen-ai.com/updates/model-deprecations/ |
| 9 × DeepSeek ids, `glm-4.6`, `glm-4.7` | DeepSeek-V4 series / GLM-5.x | https://puppyip.com/en/resources/alibaba-model-studio-deepseek-model-delisting-migration-guide |
| `deepseek-r1-distill-qwen-14b`, `deepseek-r1-distill-qwen-32b` ("will be delisted on October 10, 2026") | `qwen3.7-plus`, `qwen3…` | https://agiright.org/ff/signals |

Earlier waves on the same policy page: **Retired on May 31, 2026** and **May 13, 2026** (the China-site mirror says May 30 / May 13) [https://www.alibabacloud.com/help/en/model-studio/model-depreciation ; https://help.aliyun.com/en/model-studio/model-depreciation]. Also: `gte-rerank` deprecated **May 30, 2026**, migrate to `qwen3-rerank` [https://www.alibabacloud.com/notice/detail?_p_lc=1&id=1873].

Change-log page to poll: **https://www.alibabacloud.com/help/en/model-studio/model-release-notes** ("Last Updated: Oct 11, 2026"; entries include "Deprecation of Selected…", "Retirement", "Price Increase for…", "Renewals and upgrades discontinued", "Price Reduction for Qwen…", "Sunset notice for select legacy models", "**Extended sunset schedule for select legacy models**").

---

## 8. Context cache and batch discounts

### 8a. Context cache

| Rule | Value | Source |
|---|---|---|
| Two mechanisms | **Implicit cache** (automatic, no setup) and **explicit cache** (you create/pin it) | https://www.alibabacloud.com/help/en/model-studio/context-cache |
| Implicit-cache hit price | "The portion of the input served from the cache is **typically billed at 20% of the standard input token price**" | https://www.alibabacloud.com/help/en/model-studio/context-cache |
| Explicit-cache creation price | "Tokens used to create the cache are **typically billed at 125%** of the standard input token price" | https://www.alibabacloud.com/help/en/model-studio/context-cache |
| Explicit-cache hit price | "…**typically billed at 20%** of the standard…" (context-cache page) but the pricing page states "cache hits at **10%**" — **the two official pages disagree**; the best-practices page says "Creating the cache incurs only a **25% surcharge** over the standard input price, while each subsequent hit **saves 90%**" | https://www.alibabacloud.com/help/en/model-studio/context-cache ; https://www.alibabacloud.com/help/en/model-studio/model-pricing ; https://www.alibabacloud.com/help/en/model-studio/explicit-cache-guide |
| Minimum cacheable prefix | Implicit: "a common prefix of at least **1024 tokens**" (China doc). Explicit: "Cached content must be at least **1024 tokens**" | https://help.aliyun.com/en/model-studio/context-cache **(China site)** ; https://www.alibabacloud.com/help/en/model-studio/explicit-cache-guide |
| Explicit-cache TTL | "**5 minutes**, automatically renewed on each hit" | https://www.alibabacloud.com/help/en/model-studio/explicit-cache-guide |
| Exclusion | "Calls made using the OpenAI-compatible **Batch (file input)** method are **not eligible** for cache discounts" | https://www.alibabacloud.com/help/en/model-studio/context-cache |
| Stacking | "If the model supports context cache, only **input** tokens receive a discount. **These two discounts cannot apply simultaneously**" (cache ⊕ batch) | https://www.alibabacloud.com/help/en/model-studio/model-pricing |
| Third-party | Implicit cache = **10%** for `kimi-k3` | https://help.aliyun.com/en/model-studio/context-cache **(China site)** |
| Price-cut history | "[Model Studio] Context cache price reduction for certain models — The unit price changes from **40%** of the `input_token` price to **20%**" | https://www.alibabacloud.com/en/notice/model_studio_context_cache_price_reduction_for_certain_models_578?_p_lc=1 |
| Coder-specific promo | "Input tokens that hit the Context Cache will be priced at a **75% discount**, equivalent to **10%** of the standard…" (Qwen3-Coder-Plus, now retired) | https://www.alibabacloud.com/help/en/model-studio/qwen3-coder-plus-price-drop |

**Actual per-model cache line items (Singapore `International`, USD/1M) — use these, not the percentages:**

| Model | Input | Implicit-cache input | Explicit-cache creation | Explicit-cache read |
|---|---|---|---|---|
| `qwen3.8-max` | $2.00 | **$0.25** (=12.5%) | **$2.50** (=125%) | $0.17 reported on the announcement post (=8.5%) |
| `qwen3.7-max` | $2.50 | **$0.50** | **$3.125** | **$0.25** |
| `qwen3.8-flash` | $0.15 | **$0.016** | **$0.177** | **$0.014** |
| `kimi-k3` | $2.827 | **$0.283** (=10%) | — | — |
| `glm-5.3` | $1.40 | $0.26–$0.283 | — | — |

Sources: https://www.alibabacloud.com/help/en/model-studio/qwen3-8-max ; https://www.alibabacloud.com/help/en/model-studio/qwen3-7-max ; https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen3-8-flash ; https://www.alibabacloud.com/help/en/model-studio/kimi-k3 ; https://www.alibabacloud.com/help/en/model-studio/glm-5-3-by-zhipu ; https://www.facebook.com/alibabacloud/posts/1525132512992169/ . The deviation from the documented 20%/10% defaults is flagged independently at https://tokencost.app/blog/qwen3-8-max-pricing and https://www.developersdigest.tech/blog/prompt-caching-across-ai-providers-2026 .

### 8b. Batch inference

| Rule | Value | Source |
|---|---|---|
| Discount | "If the model supports batch calls, the unit price for **both input and output tokens is 50%** of the real-time inference price" | https://www.alibabacloud.com/help/en/model-studio/model-pricing ; https://www.alibabacloud.com/help/en/model-studio/batch-inference |
| Region scope | "**Scope: Singapore**" — the batch page lists Singapore only | https://www.alibabacloud.com/help/en/model-studio/batch-inference ; https://www.alibabacloud.com/help/en/model-studio/batch-interfaces-compatible-with-openai |
| Supported text models (as listed) | "Text generation models — **Qwen-Max: `qwen-max`; Qwen-Plus: `qwen3.7-plus`, `qwen-plus`; Qwen-Flash: `qwen-flash`**" (plus multimodal models). The pricing page separately flags `qwen3.8-max` with "**50% batch inference discount**", and the batch page caps context at 256K for `qwen3.8-max`, `qwen3.8-flash`, `qwen3.7-max`, `qwen3.7-plus` — so the supported set is broader than the quoted list. **Reconcile in console.** | https://www.alibabacloud.com/help/en/model-studio/batch-inference ; https://www.alibabacloud.com/help/en/model-studio/model-pricing |
| Batch context cap | "the maximum context tokens per request is **256K** for `qwen3.8-max`, `qwen3.8-flash`, `qwen3.7-max`, `qwen3.7-plus`, …" | https://www.alibabacloud.com/help/en/model-studio/batch-inference |
| Per-model batch line items | `qwen3.8-max`: `Output(Batch Chat)` 4.951 (Global scope); `qwen-plus`: `Input(Batch File)` $0.057, `Output(Batch File)` $0.143, `Thinking Output(Batch File)` $0.573; `qwen-long`: `Input(Batch File)` $0.036, `Output(Batch File)` $0.143; `qwen3.5-plus`: `Output(Batch Chat)` $3.44 | https://www.alibabacloud.com/help/en/model-studio/qwen3-8-max ; https://www.alibabacloud.com/help/en/model-studio/qwen-plus ; https://www.alibabacloud.com/help/id/model-studio/qwen-long ; https://www.alibabacloud.com/help/en/model-studio/qwen3-5-plus |
| Not covered by savings plans | Savings-plan deduction "does not cover fees for tool calls, **context cache, batch**…" | https://www.alibabacloud.com/help/en/model-studio/savings-plan-and-resource-package |
| OpenAI-compatible Batch File API | Available as a separate interface | https://www.alibabacloud.com/help/en/model-studio/batch-interfaces-compatible-with-openai |

Worked example from Alibaba's own blog: "`qwen-flash` lists at $0.05 input and $0.40 output per 1M tokens (up to 256K input), so batch brings it to **$0.025 and $0.20**" [https://www.alibabacloud.com/blog/llm-token-pricing-101-what-a-token-costs-and-how-to-forecast-the-bill_603613].

### 8c. Free quota

| Rule | Value | Source |
|---|---|---|
| Eligibility | "**Only models in the Singapore region with the service deployment scope set to International** are eligible for a free quota"; "No free quota is available in other regions" | https://www.alibabacloud.com/help/en/model-studio/new-free-quota ; https://www.alibabacloud.com/help/en/model-studio/model-pricing |
| Size | **1,000,000 tokens per model** — "a single combined total for input tokens and output tokens" | https://www.alibabacloud.com/help/en/model-studio/new-free-quota |
| Validity | **90 days** from the later of Model Studio activation, model release, or application approval | https://www.alibabacloud.com/help/en/model-studio/model-pricing ; https://www.alibabacloud.com/help/en/model-studio/new-free-quota |
| Validity change | "Starting **September 8, 3:00 UTC**, the new user free quota validity period will be **90 days** for first-time Model Studio activations (Singapore…)" | https://www.alibabacloud.com/help/en/model-studio/new-free-quota-validity-adjustment |
| Sharing | "An Alibaba Cloud account and its RAM users **share a single free quota**"; "Free quota is independent per model and cannot be shared across models" | https://www.alibabacloud.com/help/en/model-studio/new-free-quota |
| Guardrail | "**Free Quota Only**" switch: "after the free quota is exhausted, calling automatically stops to avoid…" charges | https://www.alibabacloud.com/help/en/model-studio/rate-limit |
| Models with **no** free quota | `qwen3.6-35b-a3b`, `qwen3.6-27b`, `qwen3.8-27b` (pricing rows say "No free quota"), `kimi-k3`, `kimi-k2.7-code`, `glm-5.3`, `glm-5.1`, `qwen3.7-plus-2026-05-26` (snapshot row) | https://www.alibabacloud.com/help/en/model-studio/model-pricing |
| Models **with** free quota | `qwen3.8-max` (1M), `qwen3.8-flash`, visual-understanding models ("A free quota of 1 million tokens is provided for visual understanding models"), `deepseek-v4-pro` (1M), Qwen3.5-Omni / Qwen3-Omni (Singapore only) | https://www.alibabacloud.com/help/en/model-studio/model-pricing ; https://www.alibabacloud.com/help/en/model-studio/vision |
| Caveat | The free-quota page's id list still contains retired ids (`qwen3-235b-a22b`, `qwen3-32b`, `qwen3-8b`, `qwen3-coder-plus`, …) — **stale, do not use as an availability check** | https://www.alibabacloud.com/help/en/model-studio/new-free-quota |

---

## 9. Model Studio's own guidance on choosing between tiers

All from **https://docs.modelstudio.console.alibabacloud.com/en/model-studio/text-generation-model** (mirrored at https://www.alibabacloud.com/help/en/model-studio/text-generation-model/) unless noted:

| Situation | Official recommendation |
|---|---|
| Strongest reasoning | "For the strongest reasoning capability, choose **`qwen3.8-max`**." |
| Long documents (e.g. reviewing multiple contracts) | "use **`qwen-long`** (10M-token context window)" |
| Long documents *or* large codebases | "**`qwen3.8-max` / `qwen3.8-flash` / …**" |
| Coding tools (Qwen Code, TONGYI Lingma, Qoder, Claude Code, Cursor) | "We recommend **`qwen3.7-plus`** for balanced performance and cost, with full tool calling and a 1M-token context window for large codebases." |
| Third-party preference | "If you prefer third-party models, choose **`kimi-k3`** for long-horizon coding or **`glm-5.3`** for open-source SOTA coding and agent tasks." |
| Migrating off GPT / Claude / Gemini | The page carries an explicit mapping table: "Map your current GPT, Claude, or Gemini model to an equivalent Bailian model." (https://www.alibabacloud.com/help/en/model-studio/text-generation-model/) |
| Tier ordering (FAQ) | "in the Qwen series, **Max-level models perform better than Plus-level models, which in turn perform better than Turbo-level models**" (https://help.aliyun.com/en/model-studio/faq-about-alibaba-cloud-model-studio — **China site**) |
| Card labels | `qwen3.8-max` = "Complex reasoning and coding"; `qwen3.7-plus` = "Balanced performance, speed, and cost"; `qwen3.8-flash` = "Fast and cost-effective" (https://www.alibabacloud.com/help/en/model-studio/models) |

The recommended-models matrix publishes, per model id: **Context · Thinking mode · Function Calling · Built-in tools · Structured output**. Confirmed "Supported" across all four capability columns for `qwen3.8-max`; `qwen3.8-max-0902`, `qwen3.8-flash`, `qwen3.7-plus`, `qwen3.7-flash` all show `1M` context and `Supported` thinking [https://docs.modelstudio.console.alibabacloud.com/en/model-studio/text-generation-model].

**Structured output specifics** (https://www.alibabacloud.com/help/en/model-studio/qwen-structured-output):
- Two modes: **JSON Object** ("Ensures the output is a valid JSON string, but does not…") and **JSON Schema**.
- Supported models include the **Qwen3.7-Max series and Qwen3.8-Max series**; for Qwen-VL, non-thinking mode only (Qwen3-VL-Plus, Qwen3-VL-Flash, Qwen-VL-Max series, "excluding the latest and…" snapshots).
- JSON Schema is documented for "selected Qwen3.7 and Qwen3.8 **Max, Plus, and Flash** model series" [https://try-qwen-ai.com/api/qwen-structured-output-json-schema/].
- Streaming + JSON Object works: set `stream: true` and `response_format: {"type":"json_object"}` [https://www.alibabacloud.com/help/en/model-studio/stream].
- **Conflict:** JSON mode is rejected when `enable_thinking` is true [https://www.alibabacloud.com/help/en/model-studio/error-code].

---

## 10. Suggested model routing for the target agentic workflow

Support-email triage agent (trigger → classify → retrieve help-centre → draft → human approval → send), Singapore default:

| Workflow step | Model to draw | Why (with the number that justifies it) |
|---|---|---|
| Trigger parse + intent classification + routing | **`qwen3.8-flash`**, thinking **off** | $0.15 / $0.47, flat to 1M, 131K max output, FC + structured output supported; cheapest tier that still has JSON Schema |
| Help-centre RAG answer drafting | **`qwen3.7-plus`**, thinking off, ≤256K tier | $0.4 / $1.6, "full tool calling and a 1M-token context window", Model Studio's own agent/coding recommendation |
| Hard/escalated cases, multi-step reasoning | **`qwen3.8-max`** (or `qwen3.8-max-0902` for coding-heavy drafting) | $2 / $6 flat to 1M; "For the strongest reasoning capability, choose `qwen3.8-max`" |
| Very long attachments (contract-sized, PDF bundles) | **`qwen-long`** for *extraction*, then hand off to `qwen3.7-plus` for the draft | `qwen-long` gives 10M context but **only 8,192 output tokens** and **no** thinking/FC/structured-output |
| Multilingual customer → English normalisation | **`qwen-mt-flash`** ($0.16/$0.49) or `qwen-mt-lite` ($0.12/$0.36) | `qwen-mt-plus` at $2.46/$7.37 International is more expensive than the flagship on input |
| Human-approval draft with repeated long system prompt / policy text | same model + **explicit cache** | Creation 125% of input, hits ~10% (documented) — a single hit breaks even [https://www.alibabacloud.com/help/en/model-studio/explicit-cache-guide] |
| Nightly summarisation / QA-mining over the ticket corpus | same model + **batch** | 50% off both input and output, Singapore scope, 256K per-request context cap |

Cost-estimator rules the app must implement: (a) tiered models bill **all** tokens in a request at the tier determined by that request's **total input tokens** [https://www.alibabacloud.com/help/en/model-studio/model-pricing]; (b) cache and batch discounts **cannot stack** [same]; (c) batch is **Singapore-only** and not cache-discounted [https://www.alibabacloud.com/help/en/model-studio/batch-inference ; https://www.alibabacloud.com/help/en/model-studio/context-cache]; (d) thinking output is billed as output, and on models with split thinking/non-thinking line items the *thinking* rate applies to **all** output tokens once thinking is emitted [https://www.alibabacloud.com/help/en/well-architected/cost-pillar]; (e) JSON-mode + thinking is an error on affected models [https://www.alibabacloud.com/help/en/model-studio/error-code].

---

## 11. Open items to verify in the console before shipping the catalog

1. **`qwen-long` International-scope price** — I could only read $0.072 / $0.287 from a non-English locale of the model page, and a tracker attributes those figures to China (Beijing). Unconfirmed for Singapore.
2. **`kimi-k3` International-scope price** — $2.827 / $14.133 appears on the pricing page, but one tracker labels that row `Global`. Unconfirmed for Singapore.
3. **`kimi-k2.7-code`** — pricing page says $0.894 / $3.713; the model page's `Scope: International` block says $0.95 / $4.00. Direct conflict.
4. **`glm-5.3`** — two `International` rows ($1.40 / $4.40 and $2.800 / $8.800); likely non-thinking vs thinking, not stated in what I could read.
5. **`qwen3-coder-next`** official International price and context on the alibabacloud.com model page.
6. **`qwen3-coder-flash`** — whether $0.30 / $1.50 or $0.144 / $0.574 is the current `0<Token≤32K` International rate (the lower figure may be a limited-time promo).
7. **Full text of notice id=2217** (the 2027-01-19 model list) — table exists, ids unread from snippets.
8. **Full text of notices id=1841 / 1938 / 1950** and the two "Selected Legacy …" retirement notices — partial id lists only.
9. **Whether hosted Qwen3 open-weight ids (`qwen3-235b-a22b*`, `qwen3-32b`, `qwen3-30b-a3b*`, `qwen3-14b`, `qwen3-8b`, `qwen3-4b`) are truly gone from Singapore** — trackers say retired 2026-10-10, the international pricing page no longer has a "Qwen3" open-source sub-section, but Alibaba's free-quota page still lists them.
10. **`qwen3.8-2.4t-a95b`** — official hosted context window and whether its International price really equals `qwen3.8-max`'s $2 / $6.
11. **`qwen3.8-plus`, `qwen3.8-max-prime`, `qwen3.8-max-preview`, `qwen3.8-flash-next`** as callable international pay-as-you-go ids — none confirmed on the international model list.
12. **`qwen-mt-turbo` vs `qwen-mt-flash`** — trackers use the names interchangeably for the $0.16 / $0.49 row.
13. **MiniMax-M2.5** International USD price (only a CNY China-site row found: CNY 2.1 / 8.4, thinking mode only).

---

## Searches run (234)

- Alibaba Cloud Model Studio models list international Singapore
- Model Studio qwen model pricing Singapore per 1M tokens
- alibabacloud.com Model Studio text generation models qwen3
- qwen3.8-max Alibaba Cloud Model Studio
- qwen3.8-plus qwen3.8-flash Model Studio pricing
- Qwen3-Max snapshot latest Model Studio Singapore
- alibabacloud.com/help/en/model-studio/text-generation-model qwen3.8 max plus flash context window max output
- alibabacloud.com help model-studio qwen3-8-max model info context window thinking
- alibabacloud.com model-studio models supported capabilities overview text generation qwen3.8
- alibabacloud.com model-studio model-pricing qwen3.8-max input output price Singapore free quota
- Model Studio pricing qwen-plus qwen-flash qwen3.8 tiered pricing 256K Singapore
- Model Studio model inference pricing page qwen3.8-max-2026
- alibabacloud model-studio text-generation-model qwen3.8-plus qwen3.7-plus recommended models table
- Model Studio qwen3.7-plus pricing tiered 256K Singapore international
- alibabacloud.com help model-studio qwen3-8-flash model info max output thinking
- alibabacloud model-studio qwen3-coder-plus context window pricing Singapore
- Model Studio Qwen3-Coder qwen3-coder-flash model list 1M context
- alibabacloud help model-studio qwen-long deprecated 2026
- alibabacloud model-studio model-depreciation deprecated retirement 2026 2027 qwen
- Model Studio model deprecation schedule qwen-plus qwen-turbo qwen-max retired date 2026
- alibabacloud.com help model-studio new-free-quota 1 million tokens 90 days qwen3.8-max
- alibabacloud Model Studio third-party models deepseek kimi glm minimax Singapore region
- Model Studio international site deepseek-v3.2 kimi-k2 glm-5 pricing Singapore
- alibabacloud help model-studio qwen-mt translation model pricing
- "qwen3.8-plus" Model Studio
- "qwen3.8-flash" Model Studio pricing Singapore input output context
- alibabacloud text-generation-model recommended models qwen3.8-max qwen3.7-plus kimi-k3 glm-5.3
- Model Studio context cache discount qwen implicit cache price percentage
- Model Studio batch inference 50% discount which models qwen3.8-max
- alibabacloud help model-studio context-cache batch discount
- alibabacloud.com/help/en/model-studio/model-list-text-generation open source qwen3-235b-a22b qwen3-32b qwen3-30b-a3b
- Model Studio open-weight Qwen3 models pricing Singapore qwen3-235b-a22b-2507 qwen3-30b-a3b
- alibabacloud model-studio qwen3-235b-a22b model info context window price
- alibabacloud model-studio qwen-long model info context 10M tokens pricing
- Model Studio qwen-long deprecated retirement 2026
- alibabacloud help model-studio models open source models qwen3 8b 32b list
- "qwen3.8-flash" "Max Output Length" alibabacloud model info
- "qwen3.7-plus" "Max Output Length" context window alibabacloud model info
- alibabacloud model-studio "qwen3.8-max" regions Singapore Virginia Frankfurt Tokyo Hong Kong
- alibabacloud model-studio text-generation-model "Recommended models" table qwen3.8-max complex reasoning coding
- alibabacloud "model-list-text-generation" qwen3.8-flash qwen3.7-flash qwen-flash list
- Model Studio Singapore qwen3.7-flash pricing tiered 256K input output
- alibabacloud model-list-text-generation "qwen3-coder-plus" "qwen3-coder-flash" "qwen-long" "qwen-mt"
- docs.modelstudio.console.alibabacloud.com model-list-text-generation deepseek kimi glm minimax
- alibabacloud model-studio text generation "Open-source" qwen3-235b-a22b qwen3-30b-a3b qwen3-32b qwen3-8b model list
- alibabacloud model-studio "deepseek-v4" OR "deepseek-v3.2" pricing Singapore region international
- alibabacloud model-studio kimi-k3 model info pricing context
- alibabacloud model-studio glm-5.3 pricing Singapore minimax-m3
- docs.modelstudio.console.alibabacloud.com text-generation-model "qwen3.8-max" "1M" Supported thinking function calling structured output
- alibabacloud text-generation-model "Migrate from" qwen-plus qwen-max recommended replacement
- alibabacloud text generation model "Recommended models for coding tools" qwen3-coder-plus
- alibabacloud model-studio model-pricing "Text generation - Qwen (open source)" Qwen3.8 prices
- Model Studio open source qwen3.8-27b qwen3.8-2.4t-a95b pricing Singapore international
- alibabacloud model-studio qwen3-8b qwen3-14b qwen3-32b open source pricing Singapore free quota
- docs.modelstudio.console.alibabacloud.com text-generation-model "Third-party models" kimi-k3 glm-5.3 deepseek context thinking
- docs.modelstudio.console.alibabacloud.com text-generation-model "Open-source models" qwen3 context thinking function calling
- alibabacloud text-generation-model "choose" guidance flagship balanced fast tier qwen3.8-max agents
- alibabacloud model-studio model-pricing qwen3.7-plus "0<Token≤256K" input output price
- alibabacloud model-studio model-pricing qwen3.8-flash "$0.15" "$0.47" Singapore
- alibabacloud model-pricing qwen3-coder-plus tiered 32K 128K 256K 1M price
- alibabacloud model-studio model-depreciation "October 10, 2026" retired models list qwen3-coder-plus
- alibabacloud model-studio "qwen3-coder-next" model info pricing context
- alibabacloud notice detail 1950 retire mainline models October 10 2026
- alibabacloud model-studio model-depreciation "January 19, 2027" scheduled deprecation models
- Model Studio retirement notice 2027 qwen-max qwen-plus qwen-turbo deprecated January 19 2027
- try-qwen-ai.com model-deprecations 33 Qwen model IDs October 10 2026 list
- alibabacloud notice detail id=2217 model studio deprecation January 19 2027 list models
- alibabacloud.com/en/notice/detail id=2217 Model Studio models deprecation
- "January 19, 2027" Model Studio qwen models cease inference services list
- alibabacloud notice 1950 Model Studio retire mainline models October 10 2026 qwen3-max qwen-plus
- therouter.ai dashscope model lifecycle October 10 2026 retiring models list qwen3-coder-plus
- Model Studio October 10 2026 retired qwen-turbo qwen-max qwen-plus qwen-long replacement
- alibabacloud model-studio new-free-quota "1 million tokens" qwen3.8-max qwen3.7-plus qwen3.8-flash 90 days Singapore
- alibabacloud help model-studio new-free-quota table models free quota tokens Singapore
- Model Studio free quota 1 million tokens per model Singapore 90 days which models list
- alibabacloud model-studio context-cache implicit cache explicit cache supported models percentage 20% 10%
- alibabacloud model-studio context cache qwen3.8-max cached input price $0.25 implicit
- alibabacloud model-studio batch-inference supported models list qwen3.8-max qwen3.7-plus qwen-long
- alibabacloud model-studio long-context-qwen-long pricing context window 10 million tokens Singapore
- alibabacloud model-studio machine-translation qwen-mt-plus qwen-mt-turbo qwen-mt-flash pricing
- alibabacloud qwen-mt model list translation models supported languages pricing per 1M tokens
- alibabacloud model-studio qwen3-8-27b pricing Singapore open source free quota
- alibabacloud model-studio open source qwen3.8-2.4t-a95b API model id pricing
- alibabacloud model-studio "Text generation - Qwen (open source)" pricing models list Qwen3.8 Qwen3.6 Qwen3.5
- alibabacloud model-studio qwen3-235b-a22b retired October 2026 open source model list Singapore
- "qwen3-32b" OR "qwen3-30b-a3b" OR "qwen3-8b" alibabacloud model studio 2026 available
- alibabacloud model-pricing "Qwen3.6" open source qwen3.6-27b qwen3.6-35b-a3b price Singapore
- alibabacloud model-studio regions endpoints Singapore Virginia Frankfurt Tokyo Hong Kong model list third-party
- alibabacloud model-studio deepseek-v4-pro kimi-k3 glm-5.3 minimax-m3 available regions Singapore Frankfurt
- Model Studio third-party models only China Beijing region international availability deepseek kimi glm minimax 2026
- alibabacloud.com/help/en/model-studio/qwen3-coder-plus retired deprecated
- "qwen3-coder-plus" alibabacloud model studio 2026 available Singapore pricing tiered
- therouter.ai dashscope october 2026 model sunset list retired models qwen3-coder-plus qwen3-max
- alibabacloud.com/en/notice/model_studio_notice_of_retirement_for_selected_legacy_models_7d9 list models retired October 10 2026
- puppyip.com Alibaba Cloud Model Studio Retiring 11 Models DeepSeek glm-4.6 glm-4.7 October 10 2026
- Model Studio notice id=1841 decommission mainline models Beijing Singapore October 10 2026 list
- "www.alibabacloud.com/help/en/model-studio/qwen3-coder-plus" model info
- alibabacloud model-studio qwen3-coder-next pricing context window max output thinking Singapore
- docs.modelstudio.console.alibabacloud.com text-generation-model coding qwen3-coder-next qwen3.7-plus kimi-k3 glm-5.3
- docs.modelstudio.console.alibabacloud.com text-generation-model qwen-long 10M context long-document
- alibabacloud text-generation-model "Deep research" OR "translation" qwen-mt models table 16k unsupported
- docs.modelstudio.console.alibabacloud.com text-generation-model open-source models qwen3-235b qwen3-32b table
- docs.modelstudio.console.alibabacloud.com text-generation-model "For long documents or large codebases"
- docs.modelstudio.console.alibabacloud.com text-generation-model "Translation" qwen-mt-plus qwen-mt-flash qwen-mt-turbo 16k
- docs.modelstudio.console.alibabacloud.com text-generation-model "Deep research" OR "Reasoning" qwen3-max-thinking
- alibabacloud model-studio qwen-mt-plus pricing Singapore per 1M tokens input output
- alibabacloud model-studio qwen-mt-flash model info pricing 92 languages
- alibabacloud machine-translation Qwen-MT qwen-mt-plus qwen-mt-turbo qwen-mt-flash qwen-mt-lite regions
- alibabacloud model-studio qwen-long pricing Singapore input output per 1M tokens 10M context
- alibabacloud model-studio qwen-long model info max input length max output length free quota
- docs.modelstudio.console.alibabacloud.com text-generation-model "qwen-long" "10M" Supported Unsupported
- docs.modelstudio.console.alibabacloud.com text-generation-model "Third-party" kimi-k3 glm-5.3 deepseek-v4-pro minimax context 1M
- alibabacloud models supported capabilities overview kimi-k3 MiniMax-M2.5 glm-5.3 deepseek text generation
- alibabacloud model-studio minimax-m3 OR "minimax-m2.5" pricing Singapore international region
- alibabacloud model-studio rate-limit qwen3.8-max Singapore US Virginia Germany Frankfurt Japan Tokyo Hong Kong regions
- alibabacloud model-studio rate-limit text generation third-party models DeepSeek Kimi GLM MiniMax regions
- alibabacloud help model-studio rate-limit qwen3.7-plus qwen3.8-flash qwen-long qwen-mt regions table
- alibabacloud model-studio context-cache supported models implicit cache list qwen3.8 qwen3.7 kimi deepseek
- alibabacloud model-studio context-cache explicit cache supported models qwen3.8-max minimum 256 tokens TTL
- alibabacloud model-studio batch-inference supported models text generation qwen3.8-max qwen3.7-plus qwen-long qwen-mt
- alibabacloud model-pricing qwen-long input output price Singapore international per 1M tokens
- alibabacloud model-studio qwen-long model info pricing USD input output batch
- alibabacloud model-pricing "qwen3.8-27b" "qwen3.8-2.4t-a95b" price international Singapore
- alibabacloud model-pricing open source "qwen3-235b-a22b" "qwen3-32b" "qwen3-8b" Singapore price per 1M tokens
- alibabacloud model-studio open source qwen3 models international Singapore still available November 2026
- alibabacloud model-pricing "qwen3.6-35b-a3b" "$0.375" international
- Model Studio retired qwen3-8b qwen3-32b qwen3-235b-a22b open source October 2026 international
- alibabacloud model-studio "qwen3-235b-a22b" model info page 2026 deprecated
- jia.je coding_plan "Text generation — Qwen open source" dropped four sections October 2026
- alibabacloud help model-studio qwen-long "Input" "Output" price USD per 1M tokens model info
- alibabacloud model-studio qwen-long 10000000 context window pricing batch
- alibabacloud qwen-long-latest qwen-long-2025-01-25 snapshot latest naming
- try-qwen-ai.com model deprecations October 10 2026 retired list qwen3-8b qwen3-32b qwen3-30b-a3b replacement
- therouter.ai DashScope October 2026 model sunset qwen3 open source retired list migration
- "qwen-long" alibabacloud model studio 2026 status available Singapore price $0.5
- alibabacloud model-studio qwen-long "$0.5" OR "0.5" input output price per 1M tokens international
- alibabacloud model-studio qwen-long pricing page Input Output Per 1M tokens USD
- morphllm qwen-api qwen-long pricing Model Studio Singapore
- "qwen-long" Alibaba Cloud Model Studio price "$0.5" input output Singapore international 2026
- ai-api-hub.com Alibaba pricing qwen-long Singapore International
- alibabacloud.com/help/en/model-studio/qwen-long pricing Input Output Per 1M tokens Scope International
- alibabacloud model-studio models supported overview "qwen-long" ultra-long context document
- alibabacloud model-studio text-generation-model qwen-long 10M Unsupported function calling structured output supported
- alibabacloud model-studio batch-inference supported models qwen-long qwen-mt qwen3-coder list
- alibabacloud model-pricing "Qwen-Long" "$" input price output price per 1 million tokens international
- alibabacloud model-studio qwen-long "Price (USD)" Input Output Per 1M tokens
- cabina.ai qwen api pricing qwen-long price table all models
- alibabacloud model-studio batch-inference supported models qwen3.8-max qwen3.8-flash qwen-long qwen-mt full list
- alibabacloud batch inference "Supported models" text generation Qwen-Max Qwen-Plus Qwen-Flash Qwen-Long Qwen-Coder
- alibabacloud model-studio batch-inference regions Singapore Beijing batch API
- alibabacloud model-studio qwen-long "Scope: International" price USD input output
- alibabacloud qwen-long model info "Max Input Length" "Max Output Length" context window 10000000
- alibabacloud model-studio qwen3-7-flash pricing tiered 32K 128K 256K international Singapore
- alibabacloud model-studio qwen3.8-max snapshots qwen3.8-max-0803 qwen3.8-max-0902 latest stable version
- alibabacloud model-studio model list snapshot latest naming qwen3.8-max-latest qwen-plus-latest
- alibabacloud notice update qwen3-max snapshot 2026-01-23 automatically upgraded
- Alibaba Cloud Model Studio "deployment scope" International Global difference pricing qwen
- Model Studio "Scope: Global" vs "Scope: International" qwen3.8-max price US Virginia
- alibabacloud model-studio regions endpoints deployment scope Global International China mainland
- alibabacloud model-studio qwen3.8-max "Scope: International" "$2" "$6" Singapore billing item
- alibabacloud model-studio qwen3-8-flash "Scope: International" Input 0.15 Output 0.47 implicit cache 0.016
- alibabacloud model-studio qwen3-7-plus Scope International Input 0.4 Output 1.6 256K
- alibabacloud model-studio qwen3-7-plus "Scope: International" Input 0.4 Output 1.6 256K tier
- alibabacloud model-studio qwen3-7-flash Scope International pricing tiers 32K 128K 256K
- alibabacloud model-studio qwen-flash qwen-plus Scope International price USD tiered 256K
- alibabacloud model-studio qwen-long Scope International price USD input output 10M context
- alibabacloud model-studio qwen-mt-plus Scope International price USD input output 16k
- alibabacloud model-studio machine-translation qwen-mt models list qwen-mt-plus qwen-mt-flash qwen-mt-lite qwen-mt-turbo international
- apitariff.com Qwen API pricing 51 paid models Singapore deployment scope International table
- apitariff qwen3.8-max qwen3.7-plus qwen3.8-flash qwen-long qwen-mt price table
- apitariff.com guides qwen-api-pricing qwen3-coder qwen3-235b open source deepseek kimi glm minimax
- alibabacloud model-studio model-pricing DeepSeek kimi MiniMax GLM international Singapore price table third-party
- alibabacloud model-pricing "kimi-k3" "$2.827" "$14.133" deployment scope
- alibabacloud model-pricing deepseek-v4-pro deepseek-v4-flash international Singapore price peak off-peak
- alibabacloud model-studio models overview third-party text generation deepseek kimi glm minimax list 2026
- alibabacloud model-studio kimi-k3 "Scope: International" Singapore price USD input output
- alibabacloud model-studio glm-5.3 "Scope: International" Singapore $1.4 $4.4 deepseek-v4-pro price
- alibabacloud model-studio rate-limit third-party models DeepSeek Kimi GLM MiniMax Singapore US Virginia Frankfurt Tokyo Hong Kong
- alibabacloud deepseek-api deepseek-v4.1-flash-1017 six regions Beijing Singapore Virginia Frankfurt Tokyo Hong Kong
- alibabacloud model-studio third-party model integration tutorial regions available international
- apitariff.com/guides/qwen-api-pricing qwen3.7-plus qwen3.7-flash qwen-long qwen-mt-plus international Singapore price table
- apitariff Qwen API pricing qwen3.8-27b qwen3.8-2.4t-a95b qwen3.6-35b-a3b international
- apitariff Qwen API pricing deepseek kimi glm minimax Singapore international
- alibabacloud model-pricing "qwen3.7-plus" International "0<Token≤256K" "$0.4" "$1.6" "256K<Token≤1M"
- alibabacloud model-pricing "qwen3.7-flash" International tiers $0.03 $0.13
- alibabacloud model-pricing "qwen-long" International input output price
- alibabacloud model-pricing "qwen-mt-plus" "International" "$2.46" "$7.37"
- alibabacloud model-pricing qwen-mt-plus qwen-mt-flash qwen-mt-lite International Global scope prices
- ai-api-hub Alibaba pricing qwen-mt-plus Singapore International $2.46 $7.37
- alibabacloud model-pricing "Qwen-Long" International "$" input output million tokens qwen-long
- ai-api-hub.com alibaba pricing qwen-long Singapore International
- alibabacloud qwen-long "Scope: International" "Input" "0.5" OR "0.072" price USD
- cloudinsight.cc alibaba cloud ai api qwen-long input output per million tokens table
- apitariff qwen-long price Singapore International per 1M tokens
- "qwen-long" "$0.5" "$2" Alibaba Model Studio international price per million tokens
- alibabacloud model-studio qwen-mt-lite International price $0.12 $0.36 qwen-mt-turbo
- alibabacloud model-studio qwen-mt-uni multimodal translation model info pricing
- alibabacloud model-studio machine translation qwen-mt models supported regions Singapore Virginia Beijing
- alibabacloud model-studio enable_thinking parameter thinking mode qwen3.8 hybrid thinking how to switch
- alibabacloud model-studio deep thinking enable_thinking thinking_budget billed output tokens
- alibabacloud model-studio qwen-long "Input" "Output" "Per 1M tokens" Scope International pricing page
- apitariff.com qwen-api-pricing table qwen-long qwen3-coder-flash qwen-mt deepseek kimi glm minimax Singapore
- apitariff Qwen API pricing 51 paid models list qwen3.8-flash qwen3.7-plus qwen-long
- cabina.ai qwen api pricing table all models qwen-long qwen3-coder-flash open source
- alibabacloud model-pricing "qwen3-coder-next" International price per 1M tokens
- alibabacloud model-studio qwen3-coder-next model info context 262144 max output pricing
- alibabacloud model-pricing "qwen3-coder-plus" International 0<Token≤32K retired
- alibabacloud model-studio deep-thinking hybrid thinking mode enable_thinking models list qwen3.8 qwen3.7
- alibabacloud deep thinking "Thinking content is billed by Output Token" different prices thinking non-thinking
- alibabacloud model-studio structured output JSON mode response_format supported models qwen3.8
- alibabacloud.com/help/en/model-studio/model-pricing "qwen3-coder-plus" "0<Token≤32K" "$1" "$5"
- alibabacloud model-pricing Qwen-Coder section qwen3-coder-plus qwen3-coder-flash qwen3-coder-next international
- alibabacloud help model-studio qwen3-coder-plus page exists model info 2026
- alibabacloud model-studio qwen-structured-output supported models JSON Schema list qwen3.8 qwen3.7
- alibabacloud model-studio structured output JSON object JSON schema supported models qwen3.8-max qwen3.8-flash qwen3.7-plus
- alibabacloud deep-thinking supported models hybrid thinking qwen3.8-max qwen3.8-flash qwen3.7-plus thinking_budget
- alibabacloud.com/en/notice/model_studio_notice_of_retirement_for_selected_legacy_mainline_models_79e list qwen-turbo qwq-plus qwen3-max
- alibabacloud notice id=1841 decommission mainline models Beijing Singapore list qwen-plus qwen-turbo qwen-max replacement
- try-qwen-ai model deprecations January 19 2027 QwenCloud list model IDs
- alibabacloud notice detail id=2217 legacy models table January 19 2027 qwen list replacement models
- therouter.ai dashscope model lifecycle consolidation reference active retired models October 2026 qwen3-coder-plus
- Model Studio October 10 2026 retired "qwen3-coder-plus" replacement qwen3.7-plus official notice
- alibabacloud notice detail id=1950 decommissioning list recommended replacements qwen3-coder-plus qwen3-max
- alibabacloud notice id=1938 decommissioning list replacement models October 10 2026
- therouter.ai dashscope qwen native model retirement October 2026 four official notices list
- alibabacloud model-studio qwen3-coder-next "Scope: International" price USD input output 256K
- alibabacloud model-studio qwen3-coder-flash model info context window 1M max output pricing international
- alibabacloud model-studio qwen-coder code capabilities recommended models coding tools 2026
- alibabacloud model-studio models overview "qwen3.8-max" "Complex reasoning and coding" "qwen3.7-plus" "Balanced performance" "qwen3.8-flash" "Fast and cost-effective"
- alibabacloud model-studio qwen3-8-max regions "Germany (Frankfurt)" "US (Virginia)" "Japan (Tokyo)" "Hong Kong" availability
- alibabacloud model-studio batch-inference "Scope" Singapore supported models text generation list 2026
- alibabacloud model-studio context-cache supported models list implicit cache qwen3.8-max qwen3.7-plus qwen3.8-flash minimum 1024 tokens
- alibabacloud context cache "explicit cache" supported models qwen3.8-max qwen3.7-max 125% 10%
- alibabacloud model-studio new-free-quota list text generation models qwen3.8-max qwen3.7-plus qwen3.8-flash qwen-long qwen-mt

## Sources returned by search (818)

- https://www.alibabacloud.com/help/en/model-studio/what-is-model-studio
- https://www.alibabacloud.com/help/en/model-studio/models
- https://www.alibabacloud.com/en/product/modelstudio?_p_lc=1
- https://www.alibabacloud.com/help/en/model-studio/model-pricing
- https://www.alibabacloud.com/help/en/model-studio/regions
- https://www.youtube.com/watch?v=QmB2qxcQx88&vl=en-US
- https://www.alibabacloud.com/help/en/model-studio/new-free-quota
- https://www.developersdigest.tech/models/fine-tuning/alibaba-model-studio
- https://www.alibabacloud.com/help/en/model-studio/coding-plan
- https://www.alizila.com/alibaba-cloud-announced-the-latest-ai-models-tools-and-infrastructure-available-to-drive-more-efficient-global-ai-community/
- https://help.aliyun.com/en/model-studio/model-pricing
- https://cabina.ai/blog/qwen-api-pricing/
- https://www.spheron.network/blog/qwen-api-pricing-vs-self-hosted-llms-cost-privacy-2026/
- https://techjacksolutions.com/ai-tools/qwen/qwen-pricing/
- https://benchlm.ai/alibaba/api-pricing
- https://www.facebook.com/fb-answers/alibaba-cloud-model-studio-pricing-per-model-token-cost/
- https://www.eesel.ai/blog/qwen-pricing
- https://www.requesty.ai/models/alibaba
- https://modelstudio.console.alibabacloud.com/model/market
- https://modelstudio.alibabacloud.com/
- https://www.facebook.com/alibabacloud/posts/qwen38-flash-is-now-live-in-hong-kong-on-alibaba-cloud-model-studio-bringing-pow/1581974067308013/
- https://www.alibabacloud.com/product/model-studio
- https://www.facebook.com/alibabacloud/videos/model-studio-finalmp4/874348851197500/
- https://help.aliyun.com/en/model-studio/text-generation-model/
- https://www.alibabacloud.com/en/solutions/generative-ai/qwen?_p_lc=1
- https://www.alibabacloud.com/help/en/model-studio/newly-released-models
- https://www.alibabacloud.com/en/press-room/alibaba-unveils-qwen3-8-max?_p_lc=1
- https://qwen.ai/blog?id=qwen3.8
- https://help.aliyun.com/en/model-studio/qwen3-8-max
- https://www.scmp.com/tech/article/3362738/alibabas-ai-model-qwen38-max-made-widely-accessible-ahead-open-weights-release
- https://www.facebook.com/alibabacloud/posts/qwen38-max-just-got-upgraded-meet-qwen38-max-090224t-parameters-1m-context-token/1525132512992169/
- https://www.alibabacloud.com/help/en/model-studio/qwen3-8-27b
- https://aivancity.ai/en/blog/qwen3-8-max-codage-agents-ia-performances-limites/
- https://felloai.com/qwen-pricing/
- https://tokencost.app/models/qwen-3-8-flash
- https://help.aliyun.com/en/model-studio/qwen3-8-flash
- https://www.requesty.ai/models/alibaba/qwen3.8-flash
- https://aitokenprice.com/pricing/qwen
- https://www.aipricing.guru/news/qwen3-8-flash-next-api-pricing-august-2026/
- https://qwen.ai/blog?id=qwen3.8-omni-flash
- https://getdeploying.com/llms/qwen3.8-flash-next
- https://explainx.ai/models/qwen/qwen3.8-flash/cost
- https://qwen.ai/blog?id=qwen3-max
- https://ai-tldr.dev/models/qwen3-8-max-0902/
- https://www.alibabacloud.com/en/notice/model_studio_update_notice_for_qwen3max_6a2?_p_lc=1
- https://www.reddit.com/r/unsloth/comments/1rdmqp8/qwen35_medium_models_out_now/
- https://www.youtube.com/watch?v=Y8hI6FyCinw&vl=en-US
- https://try-qwen-ai.com/updates/latest-qwen-model/
- https://www.modelscope.ai/models/Qwen/Qwen3.5-397B-A17B
- https://sourceforge.net/software/compare/Alibaba-Cloud-Model-Studio-vs-Qwen3-Max/
- https://www.alibabacloud.com/help/en/model-studio/text-generation-model/
- https://help.aliyun.com/en/model-studio/qwen-max
- https://www.alibabacloud.com/help/en/model-studio/qwen-plus
- https://www.alibabacloud.com/help/en/model-studio/text-generation
- https://ai-tldr.dev/models/qwen3-8-flash/
- https://www.datacamp.com/blog/qwen3-8-omni-flash
- https://www.alibabacloud.com/help/en/model-studio/vision-model/
- https://www.alibabacloud.com/blog/alibaba-unveils-qwen3-8-max-its-largest-and-most-capable-flagship-model-to-date_603420
- https://www.facebook.com/alibabacloud/videos/qwen38-max-1m-context-ai-for-coding-on-alibaba-cloud/1101312952340604/
- https://modelstudio.console.alibabacloud.com/us-east-1
- https://www.alibabacloud.com/help/en/model-studio/qwen3-8-max
- https://sourceforge.net/software/compare/Alibaba-Cloud-Model-Studio-vs-Qwen3.8-Flash-Next/
- https://usagebox.com/articles/qwen-api-pricing-2026
- https://www.layer3labs.io/guides/qwen3-8-max-pricing
- https://www.alibabacloud.com/en/iat/qwen-ai-landing-page-b?_p_lc=1
- https://www.cloudzero.com/blog/qwen-api-pricing/
- https://www.alibabacloud.com/blog/603613
- https://www.morphllm.com/qwen-api
- https://models.litellm.ai/providers/dashscope
- https://www.aipricing.guru/qwen-pricing/
- https://www.activepieces.com/blog/qwen-api-pricing-costs-tiers-and-models-2026
- https://www.digitalapplied.com/blog/qwen-3-5-medium-model-series-benchmarks-pricing-guide
- https://qubrid.com/blog/qwen-38-max-api-is-now-live-on-qubrid-ai-benchmarks-pricing-and-how-to-actually-run-it?srsltid=AYCX9vLwMcW4oYMVuVG-6YyLUK7wg-EGwI5tFt2T0RU6aziMXSvcNiPW
- https://openrouter.ai/qwen/qwen3.8-max-0902
- https://deepinfra.com/blog/qwen-api-pricing-2026-guide
- https://www.lindy.ai/blog/qwen-3-8
- https://venturebeat.com/technology/alibabas-qwen3-7-plus-supports-text-video-and-imagery-inputs-at-low-cost-of-0-4-1-6-per-1m-token-but-its-proprietary
- https://llm-stats.com/models/qwen3.7-plus
- https://sourceforge.net/software/compare/Alibaba-Cloud-Model-Studio-vs-Qwen3.7-Plus/
- https://aimlapi.com/blog/qwen3-7-plus-the-complete-guide-to-alibabas-new-multimodal-agent-model
- https://medium.com/@augustozz/setting-up-and-testing-the-new-qwen3-7-max-099a1404d0e1
- https://help.aliyun.com/en/model-studio/qwen3-7-plus
- https://www.requesty.ai/models/alibaba/qwen3.7-max
- https://openrouter.ai/qwen/qwen3.7-plus
- https://big-agi.com/alibaba
- https://benchlm.ai/models/qwen3-7-plus
- https://huggingface.co/Qwen/Qwen3.8-Flash-Next
- https://www.alibabacloud.com/blog/qwen3-8-flash-next-a-new-architecture-towards-ultimate-cost-efficiency_603501
- https://www.alibabacloud.com/help/en/model-studio/qwen-coder
- https://www.reddit.com/r/AIToolsPerformance/comments/1rgue16/openclaw_alibaba_cloud_coding_plan_8_frontier/
- https://www.therundown.ai/tools/qwen3-coder
- https://qwen.ai/blog?id=qwen3-coder
- https://vercel.com/ai-gateway/models/qwen3-coder-plus
- https://openrouter.ai/qwen/qwen3-coder-plus
- https://www.alibabacloud.com/help/en/model-studio/qwen3-coder-flash
- https://github.com/QwenLM/Qwen3-Coder
- https://www.reddit.com/r/LocalLLaMA/comments/1me31d8/qwen3coderflash_released/
- https://unsloth.ai/docs/models/tutorials/qwen3-coder-how-to-run-locally
- https://lmstudio.ai/models/qwen3-coder
- https://www.reddit.com/r/LocalLLaMA/comments/1n3ldon/qwen3coder_is_mind_blowing_on_local_hardware/
- https://pub.towardsai.net/qwen3-coder-has-a-1m-token-context-window-claude-has-200k-why-am-i-still-paying-for-claude-6546fe73c5de
- https://www.youtube.com/watch?v=D7uCRzHGwDM
- https://cline.bot/blog/local-models
- https://www.alibabacloud.com/help/en/model-studio/model-depreciation
- https://www.alibabacloud.com/help/en/model-studio/error-code
- https://www.reddit.com/r/Qwen_AI/comments/1sl01h3/the_alibaba_coding_plan_lite_can_no_longer_be/
- https://www.alibabacloud.com/help/en/model-studio/faq-about-alibaba-cloud-model-studio
- https://www.subconscious.dev/providers/alibaba-cloud
- https://github.com/anomalyco/models.dev/issues/2121
- https://help.aliyun.com/en/model-studio/model-depreciation
- https://www.alibabacloud.com/help/en/model-studio/model-release-notes
- https://www.alibabacloud.com/notice/detail?_p_lc=1&id=1950
- https://benchlm.ai/deprecations
- https://hidekazu-konishi.com/entry/ai_model_deprecation_and_lifecycle_calendar.html
- https://platform.claude.com/docs/en/about-claude/model-deprecations
- https://www.alibabacloud.com/blog/one-key-one-cli-%E2%80%94-manage-your-alibaba-cloud-model-studio-token-plan-from-terminal-or-ai-agent_603453
- https://try-qwen-ai.com/updates/model-deprecations/
- https://en.wikipedia.org/wiki/Qwen
- https://jingrey.com/tools/qwen-ai-pricing-explained/
- https://aireleasetracker.com/company/qwen
- https://www.yottalabs.ai/post/qwen-3-7-max-release-date-features-open-source-status-and-how-to-access-2026
- https://qwenlm.github.io/qwen-code-docs/en/users/configuration/model-providers/
- https://www.alibabacloud.com/help/zh/model-studio/model-depreciation
- https://cheapestinference.com/blog/qwen-coding-plans/
- https://www.alibabacloud.com/en/campaign/ai-landing-page-token?_p_lc=1
- https://help.aliyun.com/en/model-studio/qwen3-8-omni-flash-realtime
- https://www.alibabacloud.com/help/en/model-studio/vision
- https://apidog.com/blog/how-to-use-qwen-3-8-for-free/
- https://www.alibabacloud.com/campaign/new-region-brazil
- https://x.com/MilkRoadAI/status/2108791640928444810
- https://www.facebook.com/AlibabaCloudSEA/posts/access-all-top-ai-models-in-one-place-with-alibaba-cloud-model-studio-build-with/1109139898347242/
- https://toloka.ai/blog/deepseek-and-chinese-ai-models-explained/
- https://www.alibabacloud.com/help/en/model-studio/deepseek-api
- https://help.aliyun.com/en/model-studio/what-is-model-studio
- https://omidsaffari.com/blog/chinese-ai-models
- https://pi.dev/packages/pi-alibaba-models
- https://www.youtube.com/watch?v=hAFbrO-VNVw
- https://www.reddit.com/r/LocalLLaMA/comments/1qnhj9j/glm47_vs_deepseek_v32_vs_kimi_k2_thinking_vs/
- https://artificialanalysis.ai/models/comparisons/deepseek-v3-2-vs-kimi-k2-0905
- https://www.youtube.com/watch?v=0SZ6mVWTxQA
- https://llm-stats.com/models/compare/deepseek-v3.2-exp-vs-kimi-k2.5
- https://thamizhelango.medium.com/glm-4-6-vs-kimi-k2-vs-deepseek-v3-9850284281bf
- https://jia.je/kb/en/software/coding_plan.html
- https://www.siliconflow.com/models/compare/deepseek-v3-2-vs-kimi-k2-thinking
- https://anotherwrapper.com/tools/llm-pricing/deepseek-v3/kimi-k2-instruct-0905
- https://github.com/Alorse/cc-compatible-models
- https://www.alibabacloud.com/help/en/model-studio/machine-translation
- https://help.aliyun.com/en/model-studio/qwen-mt-uni
- https://getdeploying.com/llms/qwen-mt-plus
- https://howaiworks.ai/models/qwen/
- https://github.com/QwenLM/qwen-code/issues/10194
- https://www.betterclaw.io/blog/qwen-3-7-ollama-honest-review
- https://hokai.io/hub/models/qwen3.8-2.4t-a95b
- https://huggingface.co/shunmoridev/Qwen3.8-27B-TwinTurbo-Residual-Bonsai-2-PQ2_0-GGUF?local-app=vllm
- https://www.welcome.ai/content/qwen38-max-surpasses-competitors-in-autonomous-software-engineering-performance
- https://codingplans.dev/vendors/alibaba/
- https://www.linkedin.com/posts/james-chang-b6268534_github-code-video-modelcodevideomodel-activity-7517517246194159616-MwWH
- https://www.facebook.com/61576552875445/videos/inook-ai-creator-got-his-first-paid-client/2615801345558227/
- https://support.mozilla.org/contributors/kb-overview
- https://qwen.ai/blog?id=qwen3.8-flash-next
- https://guptadeepak.com/ai-models/qwen/qwen3-8-flash/
- https://octomind.run/models/qwen3.8-omni-flash
- https://www.facebook.com/alibabacloud/posts/qwen38-flash-is-now-available-in-the-european-union-on-alibaba-cloud-model-studi/1582315680607185/
- https://www.alibabacloud.com/help/en/model-studio/model-list-text-generation/
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/glm-5-3
- https://help.aliyun.com/en/model-studio/glm-5-3
- https://aihubmix.com/compare/coding-glm-5.3/qwen3.8-max
- https://www.reddit.com/r/AI_Agents/comments/1wqcqxc/best_ai_for_multilingual_research_glm53_qwen38max/
- https://qubrid.com/blog/kimi-k3-vs-qwen38-max-the-complete-technical-benchmark-and-pricing-comparison?srsltid=AYCX9vLkT--RLWhuTWw_syCv2xU-0ZixCu53hO9s7vQkjbqxMcI-qJCJ
- https://geotoolbox.ai/blog/qwen3-8-max
- https://1devtool.com/compare/glm-vs-kimi-vs-qwen
- https://www.alibabacloud.com/help/en/model-studio/context-cache
- https://github.com/anomalyco/models.dev/issues/9268
- https://www.developersdigest.tech/blog/prompt-caching-across-ai-providers-2026
- https://cloud.google.com/model-garden/pricing
- https://artificialanalysis.ai/models/caching
- https://www.alibabacloud.com/blog/i-tested-19-llm-api-workloads-on-real-calls-and-cut-costs-79%25-%E2%80%94-heres-the-data_603236
- https://synthorai.io/blog/provider-caching-comparison/
- https://techjacksolutions.com/ai-tools/google-gemini/gemini-context-caching-cost-optimization/
- https://www.alibabacloud.com/help/en/model-studio/batch-inference
- https://help.aliyun.com/en/model-studio/batch-inference
- https://www.facebook.com/AlibabaCloudSEA/posts/qwen37-max-now-live-on-model-studio-50-off-limited-time-offer-built-for-the-agen/1006537645274135/
- https://www.youtube.com/watch?v=gO6YOOiONE8
- https://bettertoken.ai/en/blog/qwen3-8-max-coding-price-benchmarks-tools/
- https://help.aliyun.com/en/model-studio/context-cache
- https://www.alibabacloud.com/help/en/model-studio/explicit-cache-guide
- https://www.reddit.com/r/Qwen_AI/comments/1s48o3e/question_very_high_token_charges_using_claude/
- https://www.instagram.com/p/De8dYqLlwrR/
- https://www.alibabacloud.com/en/notice/model_studio_context_cache_price_reduction_for_certain_models_578?_p_lc=1
- https://x.com/alibaba_cloud/status/2114579704569041267
- https://www.developersdigest.tech/blog/how-to-cut-llm-api-bill-2026
- https://www.alibabacloud.com/help/en/model-studio/savings-plan-and-resource-package
- https://qwen.ai/blog?id=qwen3
- https://www.alibabacloud.com/blog/alibaba-introduces-qwen3-setting-new-benchmark-in-open-source-ai-with-hybrid-reasoning_602192
- https://www.alibabacloud.com/help/en/model-studio/qwen-api-reference/
- https://github.com/qwenLM/qwen3
- https://huggingface.co/Qwen/Qwen3-235B-A22B
- https://qwen.readthedocs.io/en/latest/getting_started/concepts.html
- https://www.reddit.com/r/LocalLLaMA/comments/1mf0qlf/qwen3235ba22b2507_is_the_top_open_weights_model/
- https://qwenlm.github.io/blog/qwen3/
- https://lmstudio.ai/models/qwen3
- https://huggingface.co/Qwen/Qwen3-30B-A3B-Thinking-2507
- https://artificialanalysis.ai/models/comparisons/qwen3-30b-a3b-instruct-reasoning-vs-qwen3-235b-a22b-instruct-reasoning
- https://openrouter.ai/qwen/qwen3-235b-a22b-2507
- https://news.ycombinator.com/item?id=44681565
- https://www.requesty.ai/model/alibaba/qwen3-235b-a22b
- https://llm-stats.com/models/compare/qwen3-235b-a22b-vs-qwen3-30b-a3b
- https://custom.typingmind.com/tools/estimate-llm-usage-costs/alibaba/qwen3-235b-a22b
- https://computecomparison.com/llm-model/qwen3-235b-a22b
- https://help.aliyun.com/en/model-studio/faq-about-alibaba-cloud-model-studio
- https://www.facebook.com/alibabacloud/posts/model-studio-price-drop-up-to-92-savingswe-heard-you-and-reduced-prices-for-cert/1284659137039509/
- https://venice.ai/models/qwen3-vl-235b-a22b
- https://cloudprice.net/models/alibaba-qwen3-vl-235b-a22b-instruct
- https://vercel.com/ai-gateway/models/labs/alibaba
- https://www.alibabacloud.com/help/en/model-studio/long-context-qwen-long
- https://help.aliyun.com/en/model-studio/qwen-long
- https://www.reddit.com/r/opencode/comments/1vkamb2/outrageous_charging_by_alibaba_cloud_model_studio/
- https://qwen.ai/blog?id=qwen2.5-turbo
- https://developers.openai.com/api/docs/deprecations
- https://deepinfra.com/blog/model-deprecation-llm-apps
- https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/model-retirements
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/deprecations/open-models
- https://help.aliyun.com/en/model-studio/web-search
- https://qwen-3.com/en
- https://www.alibabacloud.com/help/en/model-studio/qwen3-8-flash
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen3-8-flash
- https://help.aliyun.com/en/model-studio/qwen3-8-27b
- https://tech-insider.org/qwen3-7-vs-gemini-3-1-vs-deepseek-v4-2026/
- https://seminal.ai/reference/models/alibaba-qwen-qwen3-rerank/
- https://repo.tinix.ai/en/project/hf-unsloth-qwen3-30b-a3b-thinking-2507-gguf-735a2552-a0d0-46b3-a81e-3bd3b8122629
- https://www.zero1llm.ai/models/ggml-org/Qwen3.6-35B-A3B-GGUF
- https://www.alibabacloud.com/help/en/model-studio/qwen3-6-flash
- https://en.mundoia.com.ar/expedientes/alibaba-qwen/
- https://www.alibabacloud.com/help/en/model-studio/qwen3-7-plus
- https://developer.puter.com/ai/qwen/qwen3.7-plus-2026-05-26/
- https://wavespeed.ai/blog/llm-aggregation/qwen-3-7-plus-openrouter-review/
- https://wan27.org/blog/qwen3-8-benchmarks
- https://developer.puter.com/ai/qwen/qwen3.6-plus-preview/
- https://www.alibabacloud.com/help/tr/model-studio/what-is-model-studio
- https://guptadeepak.com/ai-models/qwen/qwen3-8-max/
- https://github.com/apache/maka/issues/3680
- https://www.alibabacloud.com/help/tr/model-studio/first-api-call-to-qwen
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/newly-released-models?ref=cms.llms.blog
- https://www.alibabacloud.com/help/en/model-studio/qwen-omni
- https://prompt-architects.com/blog/315-how-to-prompt-qwen-models
- https://www.alibabacloud.com/help/en/model-studio/coding-plan-faq
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen3-8-max?ref=siliconsnark.com
- https://help.aliyun.com/en/model-studio/qwen3-7-flash
- https://www.alibabacloud.com/help/es/model-studio/model-list-text-generation/
- https://www.alibabacloud.com/help/fr/model-studio/model-list-text-generation/
- https://help.aliyun.com/en/model-studio/qwen-flash
- https://docs.modelstudio.console.alibabacloud.com/es/model-studio/model-list-text-generation
- https://docs.modelstudio.console.alibabacloud.com/pt-br/model-studio/model-list-text-generation
- https://help.aliyun.com/en/model-studio/qwen3-coder-flash
- https://www.promptfoo.dev/docs/providers/alibaba/
- https://docs.bailian.console.aliyun.com/en/model-studio/qwen-long
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen-flash-us
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/text-generation-model
- https://help.aliyun.com/en/model-studio/qwen-coder-plus
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/newly-released-models
- https://aidashxp.com/en/tools-library/
- https://docs.bailian.console.aliyun.com/en/model-studio/qwen3-coder-flash
- https://lmstudio.ai/models
- https://help.aliyun.com/en/model-studio/models
- https://docs.aimlapi.com/api-references/model-database
- https://www.alibabacloud.com/help/en/model-studio/list-models
- https://openrouter.ai/qwen
- https://qwen.ai/blog?id=4074cca80393150c248e508aa62983f9cb7d27cd&from=research.latest-advancements-list
- https://innfactory.ai/en/ai-models/qwen/
- https://help.aliyun.com/en/model-studio/qwen3-235b-a22b-thinking-2507
- https://dev.to/best_codes/qwen-3-benchmarks-comparisons-model-specifications-and-more-4hoa
- https://www.alibabacloud.com/help/en/model-studio/deepseek-v4-1-flash
- https://www.alibabacloud.com/help/en/model-studio/deepseek-v4-pro
- https://infrabase.ai/inference-apis/alibaba-cloud-model-studio
- https://techjacksolutions.com/ai-tools/qwen/qwen-vs-deepseek/
- https://spectrumailab.com/blog/deepseek-v4-vs-qwen3-max-thinking-chinese-ai-models-beating-gpt5
- https://www.alibabacloud.com/help/en/model-studio/web-search
- https://help.aliyun.com/en/model-studio/kimi-k3
- https://www.linkedin.com/posts/alibaba-cloud-computing-company_kimik3-alibabacloud-qwencloud-activity-7497497400467603456-MCS9
- https://www.reddit.com/r/baba/comments/1v8nzdn/kimi_k3_api_launch_on_alibaba_cloud_improves/
- https://custom.typingmind.com/tools/estimate-llm-usage-costs/alibaba-cn/kimi-k3
- https://www.theinformation.com/briefings/alibaba-offers-new-flagship-model-lower-prices-kimi-k3
- https://www.developersdigest.tech/blog/kimi-k3-in-10-minutes
- https://www.alibabacloud.com/help/en/model-studio/glm-5-3
- https://www.alibabacloud.com/help/en/model-studio/glm-5-3-by-zhipu
- https://www.facebook.com/alibabacloud/posts/glm-53-is-now-available-in-the-united-states-on-alibaba-cloud-model-studio-bring/1582306287274791/
- https://x.com/alibaba_cloud/status/2115749811160854573
- https://www.instagram.com/p/DfExfRDDdYC/
- https://docs.modelstudio.console.alibabacloud.com/pt-br/model-studio/text-generation-model
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/vision-model
- https://wavespeed.ai/blog/ai-models/qwen3-8-api/
- https://www.alibabacloud.com/help/en/model-studio/compatibility-of-openai-with-dashscope
- https://www.alibabacloud.com/help/en/model-studio/compatibility-with-openai-responses-api
- https://www.alibabacloud.com/help/en/model-studio/qwen-audio-realtime-user-guides
- https://apidog.com/blog/qwen-3-5-and-qwen-3-5-api/
- https://www.alibabacloud.com/blog/602643
- https://www.orcarouter.ai/blog/qwen-4
- https://www.cometapi.com/qwen3-8-max-preview-api-access/
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/compatibility-of-openai-with-dashscope
- https://therouter.ai/blog/
- https://tech-insider.org/best-open-source-llm-2026/
- https://www.alibabacloud.com/help/en/model-studio/rate-limit
- https://help.aliyun.com/en/model-studio/rate-limit
- https://www.youtube.com/watch?v=mlW2qnrN8uk
- https://catalog.ngc.nvidia.com/orgs/nim/qwen/models/qwen3.8-27b/
- https://deepinfra.com/blog/qwen3-8-27b-pricing-deepinfra-vs-alibaba
- https://www.reddit.com/r/AISEOInsider/comments/1vh8ez9/new_qwen_model_release_with_24t_parameters_is/
- https://linas.substack.com/p/qwen3-8-27b-local-guide
- https://www.modelscope.cn/models/Qwen/Qwen3.8-2.4T-A95B
- https://artificialanalysis.ai/models/comparisons/qwen3-8-27b-vs-qwen3-8-2-4t-a95b
- https://venturebeat.com/technology/qwen3-8-27b-runs-frontier-class-coding-agents-and-reasoning-locally-no-cloud-api-required
- https://www.reddit.com/r/Qwen_AI/comments/1v2khid/anyone_using_alibabaqwens_18_token_plan_daily_how/
- https://help.aliyun.com/en/model-studio/qwen-api-via-openai-chat-completions
- https://github.com/marketplace/actions/neurolink-ai
- https://epoch.ai/data/generated/large_scale_ai_models.csv
- https://naderu.com/models-board
- https://github.com/vxcontrol/pentagi/blob/main/README.md
- https://www.alibabacloud.com/help/en/model-studio/qwen-api-via-openai-chat-completions
- https://www.alibabacloud.com/help/en/model-studio/qwen-api-via-dashscope
- https://www.alibabacloud.com/blog/qwen3-6-35b-a3b-agentic-coding-power-now-open-to-all_603043
- https://modelstudio.console.alibabacloud.com/eu-central-1/model/market
- https://www.facebook.com/alibabacloud/posts/across-hundreds-of-highvalue-professions-qwen38max-is-boosting-productivity-in-r/1499802132191874/
- https://qwenlm.github.io/blog/qwen3-coder/
- https://qwen.ai/blog?id=qwen3.5
- https://www.facebook.com/alibabacloud/posts/qwen-35-omni-use-cases-built-for-real-time-multimodal-intelligencediscover-how-q/1386446800194075/
- https://www.digitalapplied.com/blog/qwen-models-complete-guide
- https://modelstudio.alibabacloud.com/intl/blog/model-studio-token-plan-individual/
- https://www.cometapi.com/what-is-qwen3-8-flash/
- https://llmapiguide.com/en/posts/qwen-2-1-turbo-pricing
- https://unifuncs.com/s/AW23G1uK
- https://aijourney.space/compare/pricing/
- https://tokenplan.vip/en/qianwen-token-plan/qwen3-8-max-token-plan-price-comparison
- https://ispeaktime.dev/alibaba/model-studio-qwen-plus
- https://ispeaktime.dev/
- https://superindex.app/leaderboard/
- https://www.typingmind.com/guide/alibaba/qwen3.8-omni-flash
- https://bridgebench.ai/leaderboard/qwen3-8-flash-next
- https://guptadeepak.com/ai-models/qwen/qwen3-coder-plus/
- https://www.reddit.com/r/vibecoding/comments/1rgufpk/openclaw_alibaba_cloud_coding_plan_8_frontier/
- https://therouter.ai/blog/dashscope-model-lifecycle-consolidation-reference/
- https://puppyip.com/en/resources/alibaba-model-studio-deepseek-model-delisting-migration-guide
- https://therouter.ai/model-lifecycle/
- https://docs.cheapestinference.com/blog/3/
- https://try-qwen-ai.com/models/qwen-coder-models-explained/
- https://www.radardigital.ai/en/news/
- https://agiright.org/ff/signals
- https://www.alibabacloud.com/help/en/model-studio/qwen3-coder-next
- https://www.alibabacloud.com/blog/building-ai-applications-with-qwen3-coder-next-and-qwen-image-2-0-on-alibaba-cloud_602893
- https://therouter.ai/models/qwen--qwen3-coder-next/
- https://help.aliyun.com/en/model-studio/qwen3-coder-plus
- https://getdeploying.com/llms/qwen3-coder-next
- https://www.linkedin.com/posts/qwen_coding-plan-overview-alibaba-cloud-activity-7430643024726097920-lMkn
- https://www.linkedin.com/posts/alibaba-cloud-computing-company_cloudcomputing-genai-multicloud-activity-7415279165882417152-TXvV
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/model-depreciation
- https://www.youtube.com/watch?v=K-4zGeIejE4&vl=en-US
- https://en.wikipedia.org/wiki/Alibaba_Cloud
- https://learn.microsoft.com/en-us/answers/questions/2281657/azure-ai-model-retirement-dates-in-government-clou
- https://www.facebook.com/alibabacloud/posts/alibaba-cloud-is-pleased-to-welcome-our-sponsor-exaliotech-at-ai-everything-abu-/1552097726962314/
- https://www.alibabagroup.com/document-1582482069362049024
- https://www.alibabacloud.com/en/notice/detail?_p_lc=1&id=2217
- https://qwenlm.github.io/blog/qwen2.5-max/
- https://help.aliyun.com/zh/model-studio/model-depreciation
- https://github.com/CherryHQ/cherry-studio/issues/15285
- https://www.alibabacloud.com/en/notice/model_studio_update_of_qwenplusturbo_4f8?_p_lc=1
- https://try-qwen-ai.com/updates/release-history/
- https://qwen.ai/research
- https://try-qwen-ai.com/
- https://huggingface.co/Qwen
- https://build.nvidia.com/qwen
- https://www.alibabacloud.com/en/notice/model_studio_notice_of_retirement_for_selected_legacy_models_7d9?_p_lc=1
- https://www.alibabacloud.com/notice/detail?_p_lc=1&id=1934
- https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-product-terms-of-service-v-3-8-0
- https://statusgator.com/services/alibaba-cloud/alibaba-cloud-model-studio
- https://www.alibabacloud.com/help/en/model-studio/model-telemetry
- https://www.alibabacloud.com/notice/detail?_p_lc=1&id=1873
- https://www.youtube.com/watch?v=3rdsgU_I-lU
- https://x.com/alibaba_cloud/status/2114939728705327343
- https://threearch.ai/trending
- https://www.alibabacloud.com/notice/detail?_p_lc=1&id=1841
- https://www.taskade.com/blog/alibaba-qwen-history
- https://therouter.ai/blog/dashscope-oct-2026-model-sunset-countdown-migration-checklist/
- https://therouter.ai/news/tag/model-deprecation/
- https://therouter.ai/blog/dashscope-qwen3-7-series-complete-guide/
- https://kilo.ai/models/qwen-qwen3-coder-plus
- https://therouter.ai/news/dashscope-qwen-native-model-retirement-october-2026-routing/
- https://qwen.ai/blog?id=qwen3.6
- https://www.reddit.com/r/Qwen_AI/comments/1sims0e/end_of_qwen_open_source_code/
- https://www.instagram.com/reel/DZ6BSawhWXV/
- https://developer.puter.com/tutorials/qwen-api-pricing/
- https://teamorouter.com/blogs/qwen3-8-max-api
- https://help.aliyun.com/en/model-studio/new-free-quota
- https://www.alibabacloud.com/help/en/model-studio/new-free-quota-validity-adjustment
- https://www.youtube.com/watch?v=w7kxrLVyEEA
- https://developer.puter.com/tutorials/how-to-get-qwen-api-key/
- https://www.alibabacloud.com/blog/603236
- https://github.com/anomalyco/opencode/issues/27687
- https://medium.com/google-cloud/implicit-vs-explicit-context-caching-in-google-cloud-agent-platform-explained-with-real-numbers-db35d67f9b18
- https://tech-insider.org/how-to-use-qwen3-8-max-api-2026/
- https://octomind.run/models/qwen3.7-max
- https://www.alibabacloud.com/blog/qwen3-8-max-a-new-bar-for-coding-and-cowork_603421
- https://opencode.ai/data/alibaba
- https://www.alibabacloud.com/help/en/model-studio/qwen-long
- https://www.therundown.ai/tools/qwen3-6-27b
- https://techjacksolutions.com/ai-tools/qwen/what-is-qwen/
- https://x.com/Alibaba_Qwen/status/1858469845958074541
- https://developer.puter.com/ai/qwen/qwen-mt-flash/
- https://aihubmix.com/model/qwen-mt-turbo
- https://orq.ai/models/alibaba-qwen-mt-flash
- https://www.alibabacloud.com/help/en/model-studio/qwen-mt-flash
- https://qwen.ai/blog?id=qwen-mt
- https://ai-api-hub.com/providers/alibaba/models/alibaba-qwen-mt-plus/
- https://www.alibabacloud.com/blog/alibaba-unveils-qwen3-8-27b-and-releases-weights-of-qwen3-8-flagship-model_603463
- https://slashdot.org/software/comparison/Alibaba-Cloud-Model-Studio-vs-Qwen3.8-27B/
- https://sourceforge.net/software/compare/Alibaba-Cloud-Model-Studio-vs-Qwen3.8-2.4T-A95B/
- https://seminal.ai/reference/models/alibaba-qwen-qwen3-8-2-4t-a95b/
- https://benchlm.ai/model-updates/providers/alibaba
- https://www.youtube.com/watch?v=gfqytnlfx2s
- https://www.secondtalent.com/resources/every-qwen-ai-model-explained-compared/
- https://trustedrouter.com/providers/alibaba
- https://www.alibabacloud.com/blog/602444
- https://apidog.com/blog/best-qwen-models/
- https://llmgateway.io/models/qwen3.6-35b-a3b
- https://qwen.ai/blog?id=qwen3.6-35b-a3b
- https://qai.io/models/alibaba/qwen3.6-35b-a3b
- https://huggingface.co/Qwen/Qwen3.6-27B
- https://www.alibabacloud.com/help/en/model-studio/germany-frankfurt-global
- https://www.ntop.org/wp-content/uploads/2026/06/Ntop_Qwen_0626.pdf
- https://www.alibabacloud.com/help/en/model-studio/get-api-key
- https://www.computerweekly.com/news/366570512/Alibaba-Cloud-debuts-Model-Studio
- https://www.alibabagroup.com/en-US/ai-governance/success-cases
- https://kingy.ai/blog/glm-5-3-vs-kimi-k3-vs-deepseek-v4-pro/
- https://improvado.io/blog/kimi-k3-vs-glm-5-2-vs-deepseek-v4
- https://deepinfra.com/blog/kimi-k3-vs-deepseek-v4-pro-vs-glm-5-2
- https://www.youtube.com/watch?v=DbSbMmRa79g
- https://empiriolabs.ai/blog/kimi-k3-glm-5-3-qwen3-8-max-deepseek-v4-pro-coding-test
- https://www.faradaymachines.com/open-source-model-comparison/
- https://dymesty.com/blogs/articles/chinese-ai-models-deepseek-qwen-kimi?srsltid=AYCX9vJ22j0-JQeYig98hnWTlWWD30xXy8piXcU6wJ3nxOwaSynoFyVg
- https://www.reddit.com/r/LocalLLaMA/comments/1xcoelw/deepseek_and_minimax_clear_chinas_ai_export_rules/
- https://www.promptarmor.com/resources/identifying-international-model-use-in-third-party-vendors
- https://www.yottalabs.ai/post/best-chinese-llm-models-2026-deepseek-qwen-glm-kimi-compared
- https://www.facebook.com/groups/vibecodinglife/posts/2028608214394372/
- https://www.reuters.com/business/media-telecom/chinas-deepseek-minimax-win-approval-ai-global-use-state-media-affiliated-entity-2026-10-23/
- https://myclaw.ai/blog/chinese-ai-model
- https://geotoolbox.ai/blog/chinese-ai-models-compared
- https://www.youtube.com/watch?v=C_BR4OCm4sc
- https://help.aliyun.com/en/model-studio/token-plan-personal-overview
- https://therouter.ai/news/dashscope-openai-responses-api-qwen-migration/
- https://qwenlm.github.io/qwen-code-docs/en/users/configuration/settings/
- https://www.alibabacloud.com/help/en/ecs/developer-reference/api-ecs-2014-05-26-errorcodes
- https://www.reddit.com/r/Qwen_AI/comments/1skeeu5/goodbye_qwen_you_tried_but_you_failed/
- https://thenewstack.io/alibaba-qwen3-8-max-reactions/
- https://www.alibabacloud.com/
- https://help.aliyun.com/en/model-studio/newly-released-models
- https://locoroo.net/reports/2026-april/alibaba
- https://therouter.ai/blog/sept-2026-qwen-model-sunset-migration-guide/
- https://therouter.ai/blog/qwen3-6-max-vs-qwen3-7-max-upgrade-comparison/
- https://portkey.ai/models/dashscope
- https://www.alibabacloud.com/en/notice/model_studio_notice_of_retirement_for_selected_legacy_mainline_models_79e?_p_lc=1
- https://www.alibabacloud.com/notice/detail?_p_lc=1&id=1938
- https://www.alibabacloud.com/en/notice/detail?_p_lc=1&id=2206
- https://help.aliyun.com/en/dataworks/announcement-on-model-retirement-for-dataworks-data-agent
- https://puppyip.com/en/resources/stepfun-image-api-oct10-retirement-save-images-guide
- https://puppyip.com/en/resources/gemini-deep-research-oct23-agent-migration-guide
- https://puppyip.com/en/resources/alibaba-model-studio-workspace-domain-migration-guide
- https://www.onprem.ai/en/ai-llm-models/
- https://www.growthcab.com/chinese-ai-models
- https://www.youtube.com/watch?v=-cy4vii3XlM&vl=en-US
- https://www.alibabacloud.com/en/notice/model_studionotice_on_the_decommissioning_of_certain_historical_mainline_models_731?_p_lc=1
- https://www.federalregister.gov/documents/2026/06/10/2026-11571/notice-of-availability-of-designation-of-chinese-military-companies
- https://www.facebook.com/100064774294273/posts/cs-models-notice-12102026-%E6%98%9F%E6%9C%9F%E4%B8%80%E4%BE%8B%E5%81%87%E4%BC%91%E6%81%AF%E4%B8%80%E5%A4%A9our-shop-will-be-rest-day-on-monday-12-oct-20/1562427115926417/
- https://www.bidexpress.com/solicitations/47450
- https://baike.baidu.com/en/item/Model%20Studio/6428040?fromModule=lemma_innerlink
- https://ha.com/60395*53148?srsltid=AYCX9vK9SdC_bAn3iKuUT0lt8MFNg3kfLzVXpKkUQwKD-zbJLjrlZYKB
- https://www.prime1studio.com/info/project-cancellation-list.html?srsltid=AYCX9vI4SLIE7q0Sj3HF-0e5suuGqDTGkuz7Tvi7wJ9iEQzVKFK5KaGN
- https://www.alibabacloud.com/help/en/model-studio/qwen3-coder-plus-price-drop
- https://openrouter.ai/qwen/qwen3-coder-next
- https://www.alibabacloud.com/blog/602621
- https://www.digitalapplied.com/blog/qwen3-max-thinking-alibaba-reasoning-model-guide
- https://qwen.ai/blog?id=qwen3.6-max-preview
- https://huggingface.co/Qwen/Qwen3-Coder-Next
- https://www.alibabacloud.com/blog/qwen3-coder-next-pushing-small-hybrid-models-on-agentic-coding_602864
- https://qwen.readthedocs.io/en/stable/getting_started/concepts.html
- https://www.alizila.com/alibaba-cloud-releases-latest-ai-models-for-enhanced-visual-understanding-and-long-context-inputs/
- https://www.hvoyai.com/en/models/qwen-mt-plus/
- https://arxiv.org/html/2306.02781v4
- https://crowdin.com/blog/best-llms-for-translation
- https://developer.puter.com/ai/models/
- https://www.scribd.com/document/812517107/Qwen2-5-Technical-Report
- https://neurips.cc/virtual/2025/loc/san-diego/events/datasets-benchmarks-2025
- https://www.sciencedirect.com/science/article/pii/S2772586326000201
- https://sparknlp.org/docs/en/transformers
- https://www.techrxiv.org/doi/pdf/10.36227/techrxiv.174844330.01320055
- https://huggingface.co/Qwen/Qwen3-32B
- https://www.alibabagroup.com/document-1853940226976645120
- https://developer.puter.com/ai/qwen/
- https://github.com/diegosouzapw/OmniRoute/wiki/he%E2%80%90Changelog
- https://blakecrosley.com/guides/hermes
- https://theaidatabase.com/
- https://raptorllmscanner.com/
- https://epoch.ai/data/notable_ai_models.csv
- https://modelstudio.console.alibabacloud.com/cn-hongkong/model/market
- https://qwen.ai/
- https://help.aliyun.com/en/model-studio/qwen-mt-flash
- https://www.reddit.com/r/machinelearningnews/comments/1m8tjxu/alibaba_qwen_introduces_qwen3mt_nextgen/
- https://www.alibabacloud.com/help/en/model-studio/qwen-mt-api
- https://www.alizila.com/alibaba-unveils-new-qwen3-models-for-coding-complexing-reasoning-and-machine-translation/
- https://developer.puter.com/ai/qwen/qwen-mt-turbo/
- https://medium.com/@302.AI/alibaba-qwen-mt-image-test-accurate-multilingual-image-translation-with-layout-content-d9e857976b15
- https://machinetranslate.org/qwen-mt
- https://www.facebook.com/fb-answers/alibaba-cloud-model-studio-qwen-pricing-per-million-tokens/
- https://www.cliffsnotes.com/study-notes/26939525
- https://developer.alibaba.com/docs/api.htm?apiId=74180
- https://openmodels.run/collections/long-context
- https://insomnia-technologies.com/blogs/alibaba-cloud-ai-model-integration
- https://arkship.app/docs/models/
- https://apispace.ai/model/?vendor=104
- https://aiapiconsole.com/blogs/alibaba-qwen-flash
- https://aiapiconsole.com/blogs/alibaba-qwen3-8-max
- https://llm-meter.netlify.app/en/models/alibaba-qwen-max/
- https://nightlies.apache.org/flink/flink-agents-docs-release-0.4/docs/development/calling-llms/chat-models/providers/
- https://help.aliyun.com/zh/model-studio/error-code
- https://www.alibabacloud.com/help/tc/model-studio/error-code
- https://help.aliyun.com/en/document_detail/2590656.html/llms.txt
- https://volksdroid.app/infrastructure/llm-providers/
- https://www.tencentcloud.com/techpedia/147388
- https://www.facebook.com/alibabacloud/posts/flexibility-is-key-in-the-modern-developer-stack-why-lock-yourself-into-a-single/1364141489091273/
- https://www.taskade.com/blog/open-model-builders
- https://docs.orq.ai/ai-gateway/supported-models
- https://minimax-ai.chat/comparison/minimax-ai-vs-qwen/
- https://www.layer3labs.io/guides/qwen-3-8-limits
- https://www.alibabacloud.com/help/en/model-studio/token-plan-team-overview
- https://www.alibabacloud.com/blog/qwen3-7-the-agent-frontier_603154
- https://www.reddit.com/r/Qwen_AI/comments/1se2p9r/guys_how_about_giving_us_a_paid_qwen_36_plus_api/
- https://openrouter.ai/qwen/qwen3.7-max/api
- https://kingy.ai/blog/qwen3-8-max-benchmarks-specs-kimi-k3-deepseek-v4-flash/
- https://www.reddit.com/r/LocalLLM/comments/1u3xgtb/anyone_else_seeing_cache_reuse_is_not_supported/
- https://www.reddit.com/r/AISEOInsider/comments/1katr6d/qwen_3_the_ultimate_guide_to_alibabas_free_ai/
- https://ai-on-mac.com/articles/qwen3-8-max-pricing-benchmarks-mac-en/
- https://hokai.io/hub/models/qwen3.8-27b
- https://help.aliyun.com/en/model-studio/model-training-and-deployment-billing
- https://therouter.ai/blog/aliyun-bailian-api-guide/
- https://aiskyeye.com/wp-content/uploads/2026/05/0402%E7%BB%84%E4%BC%9Aqwen3-vl.pdf
- https://baike.baidu.com/en/item/Model%20Studio%20International%20Edition/6722395
- https://myclaw.ai/blog/mistral-small-4-vs-qwen-3-6
- https://infron.ai/provider/alibaba/sg
- https://www.maximem.ai/blog/qwen-api-pricing-2026
- https://www.alibabacloud.com/help/zh/model-studio/model-pricing
- https://www.economize.cloud/resources/llm-cost-calculator/
- https://gomodel.enterpilot.io/docs/providers/overview
- https://github.com/codewhale-hq/Codewhale/blob/main/docs/PROVIDERS.md
- https://llm-stats.com/models/compare/qwen3-235b-a22b-vs-qwen3-32b
- https://www.reddit.com/r/LocalLLaMA/comments/1kaqi3k/qwen_3_8b_14b_32b_30ba3b_235ba22b_tested/
- https://openrouter.ai/qwen/qwen3-vl-235b-a22b-instruct
- https://ollama.com/library/qwen3:8b
- https://crfm.stanford.edu/fmti/December-2025/company-reports/Alibaba_FinalReport_FMTI2025.html
- https://newspaceeconomy.ca/2026/07/20/which-ai-models-does-each-major-provider-offer-in-2026/
- https://seminal.ai/providers/alibaba-qwen/
- https://www.mindstudio.ai/blog/qwen-3-6-plus-review-agentic-coding-model
- https://llmlearner.com/compare/qwen3-235b-a22b-vs-qwen3-next-80b-a3b
- https://models.litellm.ai/
- https://meetcody.ai/models/qwen-3-8-flash/
- https://www.therundown.ai/tools/qwen-3-7-max
- https://www.alibabacloud.com/help/en/model-studio/qwen-flash
- https://www.alibabacloud.com/en/notice/model_studio_update_of_qwen_vlplus_4fa?_p_lc=1
- https://www.reddit.com/r/LocalLLaMA/comments/1wxvt41/my_qwen_model_hallucinated_a_signed_url_to/
- https://huggingface.co/collections/Qwen/qwen3
- https://medium.com/@marketing_novita.ai/which-qwen3-model-is-right-for-you-a-practical-guide-e576569e3c78
- https://therouter.ai/blog/chinese-llm-api-providers-comparison-2026-h2/
- https://therouter.ai/news/
- https://www.reuters.com/business/retail-consumer/alibaba-plans-charge-big-users-its-next-open-source-ai-model-sources-say-2026-08-07/
- https://felloai.com/ai-models-discontinued/
- https://www.developersdigest.tech/blog/ai-model-shutdowns-2026-2027
- https://ai-api-hub.com/providers/alibaba/pricing/
- https://www.alibabacloud.com/help/en/model-studio/qwen3-7-max
- https://www.facebook.com/alibabacloud/posts/meet-qwen38-max-our-most-capable-model-to-date-next-week-the-open-weights-of-qwe/1497936182378469/
- https://www.alibabacloud.com/help/en/model-studio/qwen3-5-plus
- https://www.klover.ai/alibabas_ai_strategy_dominating_ai_as_frontier_ai_lab_with_qwen_indepth_analysis_2026/
- https://www.threads.com/@theaicontinuum/post/Ddb4URYiWrF/qwen-omni-models-capabilities%E2%81%A0/
- https://www.digitalapplied.com/blog/frontier-model-api-price-index
- https://www.morphllm.com/qwen-3-5
- https://flex.ai/models/qwen
- https://qwen.ai/apiplatform
- https://aiweekly.co/alerts/alibaba-pushes-qwen-toward-paid-apis-after-open-source-surge
- https://ai-sdk.dev/providers/ai-sdk-providers/alibaba
- https://therouter.ai/models/qwen--qwen-long/
- https://www.alibabacloud.com/help/en/model-studio/qwen-vl-ocr
- https://www.datastudios.org/post/qwen-context-window-token-limits-memory-policy-and-2025-rules
- https://sacra.com/chat/h/5fd2c5ba-fe89-4c97-95c6-b3b1d31eab13/
- https://www.funvisiontutorials.com/blog/automated-document-understanding-intelligence-qwen-35-series/
- https://docs.enterprise.cherry-ai.com/docs/admin/service-provider/provider-management-aliyun-bailian-qwen/
- https://github.com/emcie-co/parlant/issues/695
- https://sourceforge.net/software/compare/Alibaba-Cloud-Model-Studio-vs-Qwen-Code/
- https://qwen.ai/blog?id=qwen3-coder-next
- https://medium.com/@cognidownunder/qwen3-coder-alibabas-game-changing-open-source-agentic-ai-coding-model-3cf34dcc8d7a
- https://chierhu.medium.com/the-economics-of-chinese-llm-pricing-unit-economics-and-the-competitive-endgame-b04fc5aab128
- https://cloudinsight.cc/en/blog/alibaba-cloud-ai-api
- https://www.atlascloud.ai/providers/qwen-wan
- https://www.alibabacloud.com/help/en/model-studio/qwen-mt-lite
- https://vandatateam.com/ai-model-benchmarks/qwen3-8-max
- https://www.alibabacloud.com/help/id/model-studio/qwen-long
- https://www.alibabacloud.com/help/doc-detail/3044754.html
- https://unifuncs.com/s/xW70JGNc
- https://www.alibabacloud.com/help/en/model-studio/qwen3-5-omni-flash
- https://cabina.ai/llm/qwen
- https://pricepertoken.com/pricing-page/provider/qwen
- https://opencode.ai/data/compare/alibaba/qwen-max/alibaba/qwen3-8-flash-next
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/batch-inference
- https://docs.bailian.console.aliyun.com/en/model-studio/batch-inference
- https://www.alibabacloud.com/help/en/model-studio/batch-interfaces-compatible-with-openai
- https://www.reddit.com/r/LLM/comments/1qi96h6/anyone_tried_qwen_alibaba_cloud_api/
- https://www.alibabacloud.com/help/en/model-studio/singapore-regional-access-information
- https://freellmapihub.com/p/alibaba-model-studio
- https://www.alibabacloud.com/help/en/model-studio/qwen3-rerank
- https://www.alibabacloud.com/help/en/model-studio/qwen-audio-3-1-asr-flash-filetrans
- https://qwen.ai/blog?id=qwen3.7
- https://www.alibabacloud.com/blog/model-studio-token-plan-for-individual-one-subscription-for-every-ai-model-up-to-3x-more-value_603426
- https://vercel.com/ai-gateway/models/qwen3.8-max-0902
- https://cellcog.ai/blog/qwen3-8-max-0902/
- https://opencode.ai/data/compare/alibaba/qwen-vl-max/alibaba/qwen3-8-max-0902
- https://developer.puter.com/ai/qwen/qwen3.8-max-0902/
- https://www.alibabacloud.com/en/notice/model_studio_update_notice_for_qwen38max_models_863?_p_lc=1
- https://ai-sdk.dev/playground/alibaba:qwen3-max-2026-01-23
- https://www.linkedin.com/posts/andrewgabriel-ia_model-lifecycle-and-updates-alibaba-cloud-activity-7501110636718985216-f0nN
- https://www.alibabacloud.com/en/press-room/alibaba-announces-comprehensive-full-stack-ai?_p_lc=1
- https://openrouter.ai/qwen/qwen3-max
- https://www.developersdigest.tech/models/data-retention/qwen
- https://steadygateway.com/models/providers/qwen
- https://help.aliyun.com/en/model-studio/qwen3-7-max
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen3-8-max?ref=bobzhu.tech
- https://help.aliyun.com/en/model-studio/qwen3-5-plus
- https://help.aliyun.com/en/model-studio/qwen3-6-flash
- https://help.aliyun.com/en/model-studio/beijing-access-information
- https://chozan.co/alibaba-cloud/
- https://www.alibabacloud.com/help/en/model-studio/base-url
- https://github.com/QwenLM/qwen-code/issues/2664
- https://aicraftbook.com/models/qwen3-8-max
- https://mlq.ai/news/alibaba-launches-qwen37-plus-a-multimodal-agent-model-that-sees-screens-and-writes-code/
- https://openrouter.ai/qwen/qwen3.7-plus:batch
- https://x.com/Alibaba_Qwen/status/2061506641120641494
- https://apitariff.com/guides/qwen-api-pricing/
- https://www.facebook.com/alibabacloud/posts/qwen37-max-now-live-on-model-studio-50-off-limited-time-offer-built-for-the-agen/1431596339012454/
- https://orq.ai/models/alibaba-qwen3.7-flash
- https://www.oflight.co.jp/en/columns/qwen3-7-flash-api-pricing-vision-2026
- https://www.reuters.com/business/retail-consumer/alibabas-qwen-launches-qwen38-flash-ai-model-with-lower-training-costs-2026-08-26/
- https://www.alibabacloud.com/help/en/model-studio/qwen-mt-plus
- https://www.reddit.com/r/aicuriosity/comments/1m87dbg/qwen_introducs_qwen3mt_alibabas_latest/
- https://developer.puter.com/ai/qwen/qwen-mt-lite/
- https://www.alibabacloud.com/blog/alibaba-unveils-new-qwen3-models-for-coding-complexing-reasoning-and-machine-translation_602415
- https://arxiv.org/html/2609.25611v1
- https://inferencex.semianalysis.com/model/qwen-3-8-flash-next
- https://www.reddit.com/r/Qwen_AI/comments/1v8npwg/is_qwen38_max_preview_better_than_qwen37_max/
- https://opencode.ai/data/compare/alibaba/qwen3-7-plus/alibaba/qwen3-8-max
- https://llm-stats.com/models/qwen3.8-flash-next
- https://gnana70.medium.com/qwen3-8-flash-next-the-architecture-preview-that-makes-qwen4-interesting-7de18393803e
- https://www.datacamp.com/blog/qwen3-8-flash-next
- https://anotherwrapper.com/tools/llm-pricing/deepseek-v4-flash-max/qwen3-coder
- https://openrouter.ai/qwen/qwen3-coder
- https://deepinfra.com/pricing
- https://www.atlascloud.ai/blog/tips/coding-plan-best-open-source-coding-llm
- https://www.facebook.com/alibabacloud/posts/one-plan-every-modality-great-valuethe-alibaba-cloud-token-plan-for-individuals-/1484920713680016/
- https://www.developersdigest.tech/models/open-weight-hosting/kimi-k3
- https://api-docs.deepseek.com/quick_start/pricing/
- https://www.youtube.com/watch?v=93iYf9wp7Qw
- https://qz.com/deepseek-api-price-increase-v4-peak-off-peak-081326
- https://www.mindstudio.ai/blog/deepseek-v4-1-flash-pricing
- https://aihubmix.com/model/deepseek-v4-pro
- https://www.aipricing.guru/blog/qwen-vs-deepseek-api-pricing-2026/
- https://openrouter.ai/deepseek/deepseek-v4-pro
- https://www.eesel.ai/blog/deepseek-v4-1-flash-pricing
- https://intl.cloud.tencent.com/document/product/1300/78937
- https://dymesty.com/blogs/articles/chinese-ai-models-deepseek-qwen-kimi?srsltid=AYCX9vIt3rfgD7prjK-1A-QcK1jsz9nUmY6sSM7Ke6U5-NK8hujHEGW-
- https://www.secondtalent.com/resources/chinese-ai-models-us-adoption/
- https://www.alibabacloud.com/help/en/model-studio/kimi-k3
- https://www.alibabacloud.com/help/en/model-studio/kimi-k2-7-code
- https://modelglass.com.au/models/alibaba--qwen-3.8-2.4t-a95b?srsltid=AYCX9vItFbDl__VlZYADfHMg55Vqf3TUP4xW2QgoD6a3S8hK1fgxDjw8
- https://www.gradually.ai/en/llm-comparison/deepseek-v4-pro-vs-glm-5.3/
- https://www.subconscious.dev/providers/deepseek
- https://www.alibabacloud.com/help/en/model-studio/deepseek-api.md
- https://help.aliyun.com/en/model-studio/deepseek-v4-1-flash
- https://www.linkedin.com/pulse/deepseek-v41-flash-1017-now-alibaba-cloud-token-plan-dygqe
- https://api-docs.deepseek.com/news/news260910/
- https://artificialanalysis.ai/models/deepseek-v4-1-flash-1017/providers
- https://www.facebook.com/alibabacloud/posts/-deepseek-v41-flash-1017-is-live-on-token-plan-770-pass-1-on-deepswe-v11-020-per/1573271798178240/
- https://llm-stats.com/models/deepseek-v4.1-flash-1017
- https://fireworks.ai/models/deepseek-ai/deepseek-v4p1-flash-1017
- https://www.instagram.com/p/Dev4mxGFqBo/
- https://www.alibabacloud.com/help/en/model-studio/more-tools
- https://technologymagazine.com/news/alibabas-model-studio-powers-trusted-ai-in-private-clouds
- https://github.com/sipeed/picoclaw/issues/265
- https://explainx.ai/models/qwen/qwen3.7-flash/cost
- https://aihubmix.com/model/qwen3.7-plus
- https://apidog.com/blog/qwen-3-7-plus-vs-max/
- https://www.reddit.com/r/Qwen_AI/comments/1to4t8w/qwen_3627b_cost_of_ownership_vs_fronter_api_cost/
- https://artificialanalysis.ai/models/comparisons/qwen3-8-27b-vs-qwen3-6-35b-a3b
- https://www.together.ai/models/qwen3-8-max
- https://opper.ai/alibaba/qwen3-6-35b-a3b
- https://qubrid.com/blog/qwen38-27b-pricing-api-cost-per-1m-tokens?srsltid=AYCX9vLeslEaubkLBv5oy5jKIB4SZ6RgFubyxN9H2IgSPWZZFjOEPlI6
- https://huggingface.co/collections/uplinkswitch/llm-api-pricing-open-weight-models
- https://www.optimnow.io/post/open-weight-model-pricing-deepseek-qwen-kimi-glm
- https://usagebox.com/articles/cheap-agentic-llm-deepseek-glm-qwen-vs-gemini-flash-lite-2026
- https://www.linkedin.com/pulse/6-chinese-ai-labs-compared-deepseek-kimi-glm-qwen-minimax-checker-gauzf
- https://simy.one/guides/en/china-llm.html
- https://www.morphllm.com/llm-api
- https://apirouter.chat/en/pricing
- https://www.alibabacloud.com/help/es/model-studio/model-pricing
- https://headlessthrones.com/models/alibaba-qwen-qwen3-7-plus
- https://www.alibabacloud.com/help/id/model-studio/model-pricing
- https://www.eesel.ai/blog/qwen-3-7-flash
- https://www.etuki.com/compare/google-gemini-3-1-flash-lite-batch-vs-qwen-qwen3-7-flash
- https://www.nolvia.ai/wiki/blog/qwen-3-7-flash-vs-deepseek-v4-flash.html
- https://chesscoach-app.com/qwen-setup.html
- https://www.alchemys.ai/pricing/
- https://www.etuki.com/compare/google-gemini-2-5-flash-lite-vs-qwen-qwen3-7-flash
- https://modelriver.com/providers
- https://shadowcarpnode8.lol/2026/10/30/qwen-api-pricing-guide-cost-per-token-for-all-models/
- https://www.etuki.com/compare/openai-o3-mini-batch-vs-qwen-qwen3-5-9b
- https://www.eesel.ai/fr/blog/deepseek-v4-flash-alternatives
- https://help.aliyun.com/en/model-studio/qwen-mt-plus
- https://www.requesty.ai/models/alibaba/qwen-plus
- https://opper.ai/alibaba/qwen-mt-plus
- https://help.aliyun.com/en/model-studio/qwen-mt-uni-api
- https://aimlapi.com/models/qwen-7b
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen3-vl-plus
- https://cloudinsight.cc/en/blog/qwen-3-8-guide
- https://www.alibabacloud.com/blog/602565
- https://qwenlm.github.io/blog/qwen2.5-1m/
- https://www.reddit.com/r/Qwen_AI/comments/1sn2fqg/qwen_36_is_3_6_per_million_tokens/
- https://www.alibabacloud.com/blog/llm-token-pricing-101-what-a-token-costs-and-how-to-forecast-the-bill_603613
- https://www.youtube.com/shorts/crKvikSJTB8
- https://www.gradually.ai/en/llm-statistics/
- https://www.123plat.cloud/
- https://getdeploying.com/llms/qwen-mt-turbo
- https://alibaba-cloud.medium.com/developing-multimodal-services-using-qwen-and-model-studio-ab9eb3b91459
- https://help.aliyun.com/en/model-studio/qwen-mt-api
- https://www.alibabacloud.com/help/en/model-studio/deep-thinking
- https://www.reddit.com/r/LocalLLaMA/comments/1rjrrr2/how_to_enable_thinking_on_qwen_small_models_in_lm/
- https://discuss.vllm.ai/t/disabling-reasoning-of-qwen3-vl-8b-thinking-per-request/1800
- https://community.n8n.io/t/how-to-enable-thinking-mode-in-the-qwen3-6-model-and-openai-chat-model/309378?tl=en
- https://github.com/lmstudio-ai/lmstudio-bug-tracker/issues/2284
- https://www.alibabacloud.com/help/en/well-architected/cost-pillar
- https://github.com/vllm-project/vllm/issues/17887
- https://medium.com/@garvanand03/youre-paying-for-your-ai-to-think-it-s-thinking-about-the-wrong-things-63661371a689
- https://www.aipricing.guru/blog/qwen-code-pricing-guide-2026/
- https://www.activepieces.com/blog/qwen38-flash-next-api-pricing-token-costs-2026
- https://www.requesty.ai/model/alibaba/qwen3.7-plus
- https://www.youtube.com/watch?v=V23RFc13ml4
- https://ai-api-hub.com/providers/alibaba/models/alibaba-qwen3-coder-next/
- https://binaryverseai.com/llm-cost-calculator/
- https://www.alibabacloud.com/blog/qwen3-7-plus-multimodal-agent-intelligence_603206
- https://www.modelscope.cn/models/Qwen/Qwen3-8B
- https://help.aliyun.com/en/model-studio/deep-thinking
- https://help.aliyun.com/en/model-studio/qwen-structured-output
- https://try-qwen-ai.com/api/qwen-structured-output-json-schema/
- https://www.reddit.com/r/LocalLLaMA/comments/1of3r61/test_results_for_various_models_ability_to_give/
- https://www.requesty.ai/blog/structured-outputs-across-llm-providers-the-compatibility-mess
- https://www.alibabacloud.com/help/en/model-studio/stream
- https://x.com/Alibaba_Qwen/status/2024136381308805564?lang=en
- https://getdeploying.com/llms/qwen3-coder-plus
- https://www.alibabacloud.com/blog/alibaba-unveils-cutting-edge-ai-coding-model-qwen3-coder_602399
- https://www.requesty.ai/model/alibaba/qwen3-coder-plus
- https://www.reddit.com/r/Qwen_AI/comments/1rjmujk/stop_using_alibaba_clouds_coding_plans/
- https://www.alibabacloud.com/en/press-room/alibaba-unveils-cutting-edge-ai-coding-model-qwen3?_p_lc=1
- https://github.com/QwenLM/Qwen3/issues/1619
- https://qwenlm.github.io/qwen-code-docs/en/users/features/structured-output/
- https://www.alibabacloud.com/help/en/model-studio/qwen-structured-output
- https://www.alibabagroup.com/document-2021044032125272064
- https://artificialanalysis.ai/models/creators/alibaba
- https://github.com/QwenLM/Qwen3.8
- https://aihubmix.com/compare/qwen3.8-flash/qwen3.8-max-preview
- https://the-decoder.com/alibaba-releases-qwen3-8-flash-next-targeting-ultimate-cost-efficiency/
- https://www.alibabacloud.com/en/notice/output_price_of_qwenplus_and_qwenturbo_reduced_by_50_under_qwen3s_thinking_mode_521
- https://www.facebook.com/alibabacloud/posts/one-picture-to-understand-the-qwen-familymeet-the-powerful-lineup-behind-alibaba/1265802655591824/
- https://sourceforge.net/software/compare/Alibaba-Cloud-Model-Studio-vs-Qwen3-Max-Thinking/
- https://www.facebook.com/groups/698593531630485/posts/1766757824814045/
- https://www.reddit.com/r/cybersecurity/comments/1xgepn4/alibabas_qwen_ai_caught_trying_to_contact_server/
- https://www.vals.ai/blogs/qwen-alibaba-requests
- https://www.facebook.com/Reuters/videos/alibaba-may-start-charging-for-use-of-latest-ai-model/1387515583309393/
- https://help.aliyun.com/en/model-studio/list-models
- https://the-decoder.com/alibabas-latest-qwen-models-routed-some-requests-through-company-servers-researchers-find/
- https://docs.oracle.com/iaas/Content/generative-ai/imported-alibaba-models.htm
- https://therouter.ai/models/
- https://docs.together.ai/docs/deprecations
- https://oxyy.ai/blog/qwen-api-pricing-guide
- https://github.com/vava-nessa/free-coding-models/releases
- https://dev.to/soulentheo/coding-clis-in-mid-2026-the-engineers-map-and-what-changed-in-30-days-23p4
- https://github.com/NousResearch/hermes-agent/issues/44662
- https://www.federalregister.gov/documents/2026/08/24/2026-17230/removal-from-the-entity-list
- https://www.webull.com/news/15756415775876096
- https://finance.biggo.com/news/a4f3694e-b473-43fd-8546-c5eb348a1e68
- https://www.alibabagroup.com/document-2016703577908576256
- https://technologychecker.io/technology/alibaba-cloud-object-storage-service
- https://docs.ionos.com/cloud/release-notes/previous-releases/2026/july-2026
- https://www.nextinsurance.com/
- https://www.next.us/en
- https://en.wikipedia.org/wiki/NeXT
- https://www.nextrestaurant.com/
- https://www.imdb.com/title/tt0435705/
- https://nextjs.org/
- https://www.instagram.com/next/?hl=en
- https://www.nextgenscience.org/content/home-page
- https://dctd.cancer.gov/drug-discovery-development/services/next
- https://nextmanagement.com/
- https://kie.ai/blog/what-is-qwen3-8-flash
- https://discuss.huggingface.co/t/top-local-ai-models-gguf-for-complete-web-app-development-no-coding-for-2026/174336
- https://www.index.dev/blog/qwen-ai-coding-review
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/models
- https://www.digitalapplied.com/blog/qwen3-8-omni-flash-omnimodal-agents-audio-video-cost
- https://www.alibabacloud.com/help/en/model-studio/qwen3-5-flash
- https://help.aliyun.com/en/model-studio/model-qwen3-max
- https://www.alibabacloud.com/help/en/model-studio/qwen3-6-plus.md
- https://www.alibabacloud.com/help/en/model-studio/qwen3-6-flash.md
- https://www.alibabacloud.com/blog/qwen3-8-flash-next-a-new-architecture-towardsultimate-cost-efficiency_603501
- https://github.com/anomalyco/models.dev/blob/dev/providers/alibaba/models/qwen3-coder-flash.toml
- https://ustechautomations.com/resources/blog/qwen3-8-max-explained-what-it-changes
- https://aigrow.gg/models/qwen3-8-max
- https://seminal.ai/reference/providers/alibaba-qwen/
- https://hokai.io/hub/models/qwen3.7-max
- https://tokencost.app/blog/qwen3-8-max-pricing
