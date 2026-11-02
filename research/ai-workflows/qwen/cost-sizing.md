I'll research this systematically across several angles. Starting with token-estimation practice and Alibaba Cloud Model Studio pricing.

Let me dig into the primary Alibaba Cloud pages and vendor engineering docs.

# Estimating cost and latency of agentic workflows on Alibaba Cloud

Research date: 2026-11-02. All prices are list prices on alibabacloud.com (international) unless marked **China site only** or **unconfirmed**. Third-party numbers are labelled as such.

---

## 0. Verification notes on the pre-verified facts (one nuance to add to the catalog)

Nothing I found contradicts the 2026-10-31 facts, but there is one **new nuance that changes the price table**: Model Studio's price list is keyed on **(model, deployment scope)**, not just model. The `model-pricing` page has a "Deployment scope" column with values such as `International` and `Global`, and three price columns: input price, **cache-hit input price**, output price [https://www.alibabacloud.com/help/en/model-studio/model-pricing].

| Model | Scope `International` (Singapore) | Scope `Global` (US Virginia) | Source |
|---|---|---|---|
| qwen3.8-max | $2.00 in / $6.00 out, cache-hit input $0.25 | $1.65 in / $4.951 out, implicit cache $0.206, explicit cache creation $2.063 | [https://click.alibabacloud.com/m/20000002957/], [https://www.alibabacloud.com/help/en/model-studio/qwen3-8-max], [https://ai-on-mac.com/articles/qwen3-8-max-pricing-benchmarks-mac-en/] (third party), [https://www.forbes.com/sites/jonmarkman/2026-08-05/alibabas-qwen38-max-prices-frontier-ai-at-2-per-million-tokens/] |
| qwen3.8-flash | $0.15 in / $0.47 out, cache-hit input $0.016 | $0.113 in / $0.382 out, implicit cache $0.014, explicit cache creation $0.177 | [https://www.alibabacloud.com/help/en/model-studio/model-pricing], [https://www.facebook.com/alibabacloud/posts/1582315680607185/], [https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen3-8-flash] |
| qwen3.7-plus | $0.40 in / $1.60 out | $0.276 in / $1.101 out, implicit cache $0.056, batch in $0.143 / batch out $0.574 | [https://artificialanalysis.ai/models/qwen3-7-plus], [https://www.alibabacloud.com/help/en/model-studio/qwen3-7-plus], [https://venturebeat.com/technology/alibabas-qwen3-7-plus-supports-text-video-and-imagery-inputs-at-low-cost-of-0-4-1-6-per-1m-token-but-its-proprietary] |
| text-embedding-v4 | $0.072 per 1M text input; $0.036 per 1M batch file | — | [https://www.alibabacloud.com/help/en/model-studio/text-embedding-v4] |
| qwen3-rerank | $0.10 per 1M tokens (International) | — | [https://www.alibabacloud.com/help/en/model-studio/model-pricing] |

**Action for the app:** store `price(model, scope, region, tier, cache_state, batch_flag)`. Tiered models bill the **whole request** at the tier set by total input tokens of that request [https://www.alibabacloud.com/help/en/model-studio/model-pricing].

Other confirmed anchors: free quota of 1M tokens per model, valid 90 days, **Singapore only** [https://www.alibabacloud.com/help/en/model-studio/new-free-quota]; batch = 50% of real-time price [https://www.alibabacloud.com/help/en/model-studio/batch-inference]; batch and cache discounts **cannot stack** [https://www.alibabacloud.com/help/en/model-studio/model-pricing].

---

## 1. Estimating tokens per step

### 1.1 Character→token conversion (for turning a drawn workflow into numbers)

| Rule | Value | Source |
|---|---|---|
| Qwen tokenizer, English | 1 token ≈ 3–4 characters | [https://qwen.readthedocs.io/en/latest/getting_started/concepts.html] |
| Qwen tokenizer, Chinese | 1 token ≈ 1.5–1.8 characters | [https://qwen.readthedocs.io/en/latest/getting_started/concepts.html] |
| Alibaba Cloud guidance, English | 1 token ≈ 3–4 letters or one word | [https://www.alibabacloud.com/blog/how-alibaba-cloud-calculates-and-manages-llm-tokens_602565] |
| OpenAI guidance | 1 token ≈ 4 chars ≈ 0.75 words; 100 tokens ≈ 75 words | [https://help.openai.com/en/articles/4936856-understanding-and-counting-tokens] |

App rule: `T_tokens = ceil(chars / 3.5)` for English text; expose it as a tunable. For exact counts, call the provider's tokenizer/`usage` fields rather than estimating (OpenAI documents pre-send token counting for cost estimation [https://developers.openai.com/api/docs/guides/token-counting]).

### 1.2 The per-step cost formula the app should implement

For one model call *j* in a workflow:

```
IN_j  = T_system + T_tools + T_retrieved + T_history + T_tool_results + T_user
COST_j = (IN_j_cached × P_cache) + (IN_j_uncached × P_in)
       + (T_out_visible × P_out) + (T_thinking × P_out)
```

- `T_thinking` is **billed as output tokens** on Model Studio ("Thinking content is billed by Output Token"; some hybrid models have different thinking vs non-thinking prices) [https://www.alibabacloud.com/help/en/model-studio/deep-thinking].
- Cap `T_thinking` with `thinking_budget`; when the limit is reached the model stops reasoning and answers [https://www.alibabacloud.com/help/en/model-studio/deep-thinking].
- Measure the real cache hit from the response: `usage.prompt_tokens_details.cached_tokens` [https://www.alibabacloud.com/help/en/model-studio/context-cache], [https://www.alibabacloud.com/help/en/model-studio/qwen-api-via-openai-responses].
- Model Studio's own cost guidance names the same drivers: "token count and the use of **Agent mode, which adds overhead from a large system prompt, tool and function definitions, and thinking-mode content**", and recommends "compressing historical messages" [https://www.alibabacloud.com/help/en/model-studio/model-pricing].

### 1.3 Default token counts per step type (catalog defaults)

Every row is either sourced or explicitly marked **assumption**. These are the numbers the drawing engine should attach to a node type.

| Step type | Component | Default | Range | Source / status |
|---|---|---|---|---|
| Any LLM step | System prompt + instructions | 800 | 200–2,000 | **Assumption**; must be ≥1,024 tokens to be cacheable on Model Studio [https://www.alibabacloud.com/help/en/model-studio/context-cache] |
| Any LLM step | Tool/function definitions | 150 per tool | 50–500 per tool | **Assumption**; Anthropic: tool definitions + results "can sometimes consume 50,000+ tokens before an agent even starts" [https://www.anthropic.com/research/advanced-tool-use]; a 5-server MCP setup ≈ 55,000 tokens (secondary, WorkOS summarising Anthropic) [https://workos.com/blog/mcp-server-token-cost] |
| Classification / routing | Output (label + confidence JSON) | 40 | 20–80 | **Assumption** |
| Classification / routing | Input (email body + metadata) | 300 | 100–800 | **Assumption** from 1 token ≈ 0.75 words [https://help.openai.com/en/articles/4936856-understanding-and-counting-tokens] |
| Extraction from a 1-page document | Document input | 600 | 400–900 | **Assumption**; "a typical paragraph runs around 100 tokens" (secondary) [https://ordwaylabs.com/blog/ai-token-limits/] |
| Extraction | Output (structured JSON) | 150 | 50–400 | **Assumption** |
| RAG answer, k=5 chunks | Retrieved context | 2,000 (5 × 400) | 1,000–5,120 | Chunk ≈ "no more than a few hundred tokens" [https://www.anthropic.com/research/contextual-retrieval]; AWS Bedrock KB default chunking = 300 tokens with 20% overlap [https://aws.amazon.com/blogs/machine-learning/contextual-retrieval-in-anthropic-using-amazon-bedrock-knowledge-bases/]; LlamaIndex `SentenceSplitter` default `chunk_size=1024`, `chunk_overlap=20` [https://developers.llamaindex.ai/python/framework/module_guides/loading/node_parsers/modules/]; LangChain's recursive splitter measures **characters**, not tokens [https://docs.langchain.com/oss/python/integrations/splitters/recursive_text_splitter] |
| RAG answer | Rerank input (20 candidates × 400 + query) | 8,050 | 2,000–20,000 | **Assumption** on counts; reranking to top-20 chunks is Anthropic's recommended pattern [https://www.anthropic.com/research/contextual-retrieval]; qwen3-rerank is billed per 1M tokens [https://www.alibabacloud.com/help/en/model-studio/model-pricing] |
| RAG answer | Output (email reply) | 250 | 100–500 | **Assumption** (≈190 words) |
| Drafting an email | Output | 250 | 120–450 | **Assumption** |
| Agent loop with N tool calls | Total input | see §2.2 formula | — | Derived; validated against measured agent trajectories below |
| Agent loop | Tool result per call | 400 | 100–2,000 | **Assumption**; Anthropic recommends making tool response verbosity configurable / returning concise results [https://www.anthropic.com/research/writing-tools-for-agents] |
| Whole agent task (reference point) | Tokens per task | 12 calls, 36,000 in + 6,000 out | — | CloudZero's published support-resolution example: "$0.132 per task" [https://www.cloudzero.com/blog/ai-agent-cost/], [https://www.cloudzero.com/blog/cost-per-ai-outcome/] |
| Whole agent task (research reference) | Tokens per agentic coding task | 4.17M average; input:output ≈ 154:1 | up to 30× run-to-run variance | Peer-reviewed/arXiv study of 8 frontier models on SWE-bench-style tasks [https://arxiv.org/abs/2604.22750], [https://digitaleconomy.stanford.edu/news/how-are-ai-agents-spending-your-tokens/] |
| Simple text query (reference point) | Cost per query | $0.0005–$0.02 | — | CloudZero: "Most production text queries cost between $0.0005 and $0.02" [https://www.cloudzero.com/blog/ai-cost-per-query/] |

**Important calibration note for the app:** agentic *coding* trajectories (millions of tokens) are 2–3 orders of magnitude above a *support-email* workflow (thousands of tokens). Use the coding numbers only as the upper bound of an honest range, and use CloudZero's 12-call/42k-token support example as the realistic anchor for business workflows [https://www.cloudzero.com/blog/ai-agent-cost/].

---

## 2. Multipliers that blow up cost, and how to cap them

### 2.1 Published multipliers

| Multiplier | Value | Source |
|---|---|---|
| Agent vs chat | Agents use ≈ **4×** more tokens than chat interactions | [https://www.anthropic.com/research/multi-agent-research-system] |
| Multi-agent vs chat | ≈ **15×** more tokens | [https://www.anthropic.com/research/multi-agent-research-system] |
| Agentic vs chatbot (analyst estimate) | **5–30×** tokens per task (Gartner, March 2026, cited second-hand) | [https://www.cockroachlabs.com/blog/agentic-ai-costs-at-scale/], [https://www.doit.com/blog/cost-per-task-vs-cost-per-token] (both secondary) |
| Predictability of performance from tokens | Token usage alone explains **80%** of performance variance (tool-call count and model choice are the next two) | [https://www.anthropic.com/research/multi-agent-research-system] |
| Run-to-run variance on the same task | Up to **30×** in token use | [https://arxiv.org/abs/2604.22750] |
| Input dominance | Input tokens, not output, dominate agent cost (input:output ≈ 154:1 in agentic coding) | [https://arxiv.org/abs/2604.22750] |
| Tool-definition/MCP bloat | 150,000 → 2,000 tokens (**98.7%** saving) by replacing upfront tool loading with code execution | [https://www.anthropic.com/research/code-execution-with-mcp] |

### 2.2 The loop formula (growing history is quadratic, not linear)

Each iteration re-sends the whole conversation, so:

```
T_in_total(N) = Σ_{i=1..N} [ T_base + T_tools + (i−1)·(T_toolcall_out + T_toolresult) ]
             = N·(T_base + T_tools) + N·(N−1)/2 ·(T_toolcall_out + T_toolresult)
```

Worked: `T_base+T_tools = 1,800`, `T_toolcall_out = 60`, `T_toolresult = 400`, N = 4 → 4×1,800 + 6×460 = **9,960 input tokens** for one email. At N = 10 → 18,000 + 45×460 = **38,700**. This is the single biggest lever in an agent drawing, and it is why Anthropic recommends compaction / just-in-time context instead of accumulating history [https://www.anthropic.com/research/effective-context-engineering-for-ai-agents], [https://platform.claude.com/cookbook/tool-use-context-engineering-context-engineering-tools].

### 2.3 Retry and fan-out multipliers

```
C_run = Σ_steps C_step × (1 + r_retry) × (1 + fanout_extra)
```
- `r_retry` (retry/parse-failure rate): default **0.10**, range 0–0.5 — **assumption**; the 30× same-task variance in [https://arxiv.org/abs/2604.22750] is the empirical justification for always showing a range.
- `fanout_extra` (parallel sub-agents): each additional sub-agent re-sends its own base context; multi-agent systems cost ≈15× chat [https://www.anthropic.com/research/multi-agent-research-system].

### 2.4 Caps the app should draw and enforce

| Cap | Mechanism | Source |
|---|---|---|
| Max loop iterations | LangGraph `recursion_limit`, **default 25**, raises `GraphRecursionError` | [https://reference.langchain.com/python/langchain-core/runnables/config/RunnableConfig/recursion_limit], [https://docs.langchain.com/oss/python/langgraph/errors/GRAPH_RECURSION_LIMIT] |
| Max agent turns | OpenAI Agents SDK `max_turns`, raises `MaxTurnsExceeded` (default value not stated in the official page — **unconfirmed**; third parties say 5 or 10) | [https://openai.github.io/openai-agents-python/running_agents/], [https://openai.github.io/openai-agents-python/ref/run/] |
| Thinking-token budget | Model Studio `thinking_budget` | [https://www.alibabacloud.com/help/en/model-studio/deep-thinking] |
| Max output tokens | `max_tokens` per call (standard API parameter) | [https://www.alibabacloud.com/help/en/model-studio/qwen-api-via-openai-responses] |
| Token/credit quota per consumer | Alibaba Cloud **AI Gateway** credits-based metering and quotas (extends token-only quotas to a cross-model "Credits" metric) | [https://www.alibabacloud.com/blog/603415], [https://www.alibabacloud.com/blog/alibaba-cloud-ai-gateway-finops-features-officially-launched-%7C-making-every-tokens-consumption-visible-and-controllable_603282] |
| Provider-side rate limits | Model Studio limits by **RPM and TPM at the primary-account level** (all RAM users/workspaces aggregated); exceeding returns HTTP 429 | [https://www.alibabacloud.com/help/en/model-studio/rate-limit] |
| Runtime cost controls | AgentRun offers "a cost-saving mode, Token quotas, and multiple instance specifications" for model cost control | [https://www.alibabacloud.com/help/en/agentrun/open-platform-introduction.md] |
| Tool-context cap | Prefer code execution / on-demand tool discovery over loading all tool definitions | [https://www.anthropic.com/research/code-execution-with-mcp], [https://www.anthropic.com/research/advanced-tool-use] |

---

## 3. Savings levers and their typical effect

### 3.1 Model Studio's own discount figures (primary)

| Lever | Model Studio figure | Conditions | Source |
|---|---|---|---|
| Implicit context cache | Cached input "typically billed at **20%** of the standard input token price"; per-model cache-hit prices are published (qwen3.8-max $0.25, qwen3.8-flash $0.016) | Automatic; requires a **common prefix of at least 1,024 tokens**; backward prefix matching — any change to the prefix causes a miss | [https://www.alibabacloud.com/help/en/model-studio/context-cache], [https://www.alibabacloud.com/help/en/model-studio/model-pricing] |
| Explicit cache | Creation billed at **125%** of standard input price; hits at **10%** ("each subsequent hit saves 90%. A single hit is enough to…") | Manual; **TTL 5 minutes, auto-renewed on each hit**; tool definitions count as part of the system prompt for caching | [https://www.alibabacloud.com/help/en/model-studio/model-pricing], [https://www.alibabacloud.com/help/en/model-studio/explicit-cache-guide] |
| Cache price reduction (certain models) | Cache-hit unit price cut "from 40% of the input_token price to **20%**" | Per-model notice | [https://www.alibabacloud.com/en/notice/model_studio_context_cache_price_reduction_for_certain_models_578] |
| Batch inference | Input and output at **50%** of real-time price | Only for models supporting batch; ≤50,000 requests and ≤500 MB per file; asynchronous | [https://www.alibabacloud.com/help/en/model-studio/model-pricing], [https://www.alibabacloud.com/help/en/model-studio/batch-inference] |
| Stacking rule | Batch and cache discounts **cannot apply simultaneously**; only input tokens get the cache discount | — | [https://www.alibabacloud.com/help/en/model-studio/model-pricing] |
| Throughput Reservation / PTU | qwen3.8-max: **$16.63 per 10k TPM·hour** input, **$4.99 per 1k TPM·hour** output (postpaid); prepaid $47.53 / $14.258 per day equivalents. Reserves guaranteed TPM with no rate limiting | For steady high-volume load instead of per-token billing | [https://www.alibabacloud.com/help/en/model-studio/tpm-reservation-billing], [https://www.alibabacloud.com/help/en/model-studio/ptu-long-input-and-cache], [https://www.alibabacloud.com/help/en/model-studio/model-deployment-introduction] |
| Free quota | 1M tokens per model, 90 days, **Singapore only** | New activations | [https://www.alibabacloud.com/help/en/model-studio/new-free-quota] |

Note: a separate `model-training-and-deployment-billing` page lists different PTU-style figures for qwen3.8-max ($3.96 / $1.188 / $47.53 / $14.258) [https://www.alibabacloud.com/help/en/model-studio/model-training-and-deployment-billing]. The two pages disagree on the postpaid hourly rate — **unconfirmed**, verify in the console before quoting PTU in a proposal.

### 3.2 Cross-vendor comparators (useful when a customer asks "why not X")

| Lever | Vendor figure | Source |
|---|---|---|
| Prompt caching | Cache write = **1.25×** base input (5-min TTL) or **2×** (1-hour TTL); cache read = **0.1×**; "caching pays off after one cache read" | Anthropic [https://platform.claude.com/docs/en/build-with-claude/prompt-caching], [https://platform.claude.com/docs/en/about-claude/pricing] |
| Prompt caching | Discounted cached-input rate, "up to **95%**"; minimum cacheable prompt **1,024 tokens** (GPT-5.6+), then 128-token increments | OpenAI [https://developers.openai.com/api/docs/guides/prompt-caching], [https://openai.com/index/api-prompt-caching/] |
| Prompt caching | **90%** discount on cached tokens for Gemini 2.5+, 75% for 2.0; batch mode at 50% | Google [https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/context-cache/context-cache-overview], [https://cloud.google.com/blog/products/ai-machine-learning/vertex-ai-context-caching], [https://cloud.google.com/model-garden/pricing] |
| Model cascading | FrugalGPT matches the best single LLM with **up to 98% cost reduction** | [https://arxiv.org/abs/2305.05176] |
| Model routing | RouteLLM: **>85%** cost reduction on MT Bench, 45% on MMLU, 35% on GSM8K at matched quality | [https://www.lmsys.org/blog/2024-07-01-routellm/], [https://sky.cs.berkeley.edu/project/routellm/] |
| Routing on Alibaba Cloud | AI Gateway supports routing/fallback across model endpoints; Alibaba's own guidance is "send each request to the cheapest model that passes", plus `AI Fallback` to a backup model on error/overload | [https://www.alibabacloud.com/blog/model-routing-explained-send-each-request-to-the-cheapest-model-that-passes_603612], [https://www.alibabacloud.com/help/en/api-gateway/ai-gateway/user-guide/ai-fallback], [https://www.alibabacloud.com/help/en/well-architected/stabilizing-pillar] |
| Lower reasoning effort | "Lower effort favors speed and lower token usage"; levels minimal/low/medium/high(/xhigh) | OpenAI [https://developers.openai.com/api/docs/guides/reasoning], [https://developers.openai.com/api/docs/guides/latest-model] |
| Context engineering | Just-in-time context + compaction instead of full history retention | Anthropic [https://www.anthropic.com/research/effective-context-engineering-for-ai-agents] |

### 3.3 Effective discount formula for the app

```
P_in_effective = P_in × [ (1 − h) + h·d ] × (1 − b)      # b and d never both apply on Model Studio
Saving_vs_baseline = 1 − P_in_effective / P_in
```
where `h` = cache-hit share of input tokens, `d` = cache price ratio (0.10 explicit / ~0.125–0.20 implicit depending on model), `b` = 0.5 if batch. Break-even for explicit cache: 1.25× write pays back after **one** hit (Model Studio states this directly [https://www.alibabacloud.com/help/en/model-studio/explicit-cache-guide]).

---

## 4. Non-model costs in an agentic workflow on Alibaba Cloud

| Component | How it is billed | Published price | Source |
|---|---|---|---|
| **Function Compute (FC)** | Single billable item: **CU usage**, monthly tiered, per region; all resources converted by fixed factors | Tier 1 (0–100M CU) **USD 0.000020/CU**; conversion factors include 1.0 CU/(vCPU·s) and **0.15 CU/(GB·s)**; worked example: 33,600 CU = USD 0.67 | [https://www.alibabacloud.com/help/en/functioncompute/pay-as-you-go-billing-methods], [https://www.alibabacloud.com/help/en/functioncompute/billing-overview-of-fc], [https://www.alibabacloud.com/help/es/functioncompute/billing-overview-of-fc] |
| FC (legacy/simple view) | Per GB-second + per invocation | **$0.00001668/GB-second**; first 400,000 GB-seconds/month free; invocation ≈ $0.0000002 | [https://www.alibabacloud.com/en/product/function-compute/pricing], [https://paazmaya.fi/price-tier-comparison-of-cloud-function-providers/] (third party) |
| FC free trial | New users | **150,000 CU per cycle for 3 cycles** | [https://www.alibabacloud.com/help/en/functioncompute/product-changes-changes-of-billable-items-resource-plans-and-trial-quota-of-function-compute], [https://platform.softwareone.com/product/alibaba-cloud-function-compute-fc/PCP-6226-8204] |
| **FC Agent Sandbox** (code execution for agents) | Per second while active: vCPU + memory + disk; disk has a **15 GiB free allowance**; billed hourly | Disk **0.00025308 USD/GiB/hour outside mainland China** (0.00031896 in mainland); new billing model rolling out from 2026-07-31 | [https://www.alibabacloud.com/help/en/functioncompute/pay-as-you-go-of-fc-agent-sandbox], [https://www.alibabacloud.com/help/en/functioncompute/cloud-sandbox-new-billing-model-online-announcement] |
| **Agent Sandbox** (product) | Compute fee = (vCPUs × vCPU price + memory × memory price + disk × disk price) × duration; plus underlying cloud resource fees | Reference (Chinese mainland, Economy): **USD 0.0000026/vCPU·second (USD 0.00936/hour)** and USD 0.00000128/GiB·second. Outside-mainland Default ≈ $0.00000496/vCPU·s + $0.00000248/GiB·s — **third-party, unconfirmed** | [https://www.alibabacloud.com/help/en/agent-sandbox/product-overview/billing-overview], [https://createos.sh/vs/alibaba-agentrun] (third party) |
| **ACS (Container Compute Service)** | Per second: vCPU + memory (+GPU); no cluster management fee | Example formula: 8 vCPU × **USD 0.0000026/s** + 32 GiB × **USD 0.00000128/s**; general-purpose from USD 0.013716/vCPU·hour (mainland) | [https://www.alibabacloud.com/help/en/cs/product-overview/product-billing-rules], [https://www.alibabacloud.com/en/product/acs] |
| **ACK Pro** (e.g. Dify on ACK) | Cluster management fee, hourly per cluster + worker node ECS | **USD 0.09 per cluster per hour** (≈ USD 66/month) | [https://www.alibabacloud.com/help/en/ack/ack-managed-and-ack-dedicated/product-overview/cluster-management-fee], [https://www.alibabacloud.com/help/en/ack/ack-managed-and-ack-dedicated/product-overview/ack-pro-cluster-billing] |
| **AgentCore** (agent build/govern/runtime) | Pay-as-you-go; billable items: **Compute CU, Gateway CU, Storage CU**, optional dedicated items. CU conversion: 1 vCPU × 1 s = 1 CU; 1 GB memory × 1 s = 0.5 CU. Dependent products billed separately | Reference **USD 0.00001 per Compute CU** (stated for China Shanghai on the international page); billing started **2026-09-18 00:00 UTC+8**. **China site only:** CNY 0.0000694/Compute CU (Shanghai), request calls CNY 0.0000015/CU (= CNY 0.015 per 10,000 calls/hour). Singapore unit price **unconfirmed** | [https://www.alibabacloud.com/help/en/agentcore/agentcore-billing-instructions], [https://www.alibabacloud.com/help/en/agentcore/agentcore-billing-activation], [https://www.alibabacloud.com/help/en/agentcore/agentcore-product-overview], [https://help.aliyun.com/en/agentcore/agentcore-billing-instructions] |
| **AgentRun** (serverless agent runtime) | Instances bill while running; "after the instance has no session requests, it enters an idle state and is **billed at the idle billing rate**"; "light sleep" adjusts billing; blog: "bills you only while the agent is actually working" | No public unit price found — **unconfirmed**; estimate via FC/ACS/Agent Sandbox + AgentCore CU rates | [https://www.alibabacloud.com/help/en/agentrun/api-agentrun-2025-09-10-struct-agentruntime], [https://www.alibabacloud.com/help/en/agentrun/what-is-agentrun], [https://www.alibabacloud.com/blog/giving-your-ai-agent-a-disposable-workspace-with-alibaba-cloud-agentrun_603324] |
| **AgentLoop** (agent observability/eval) | Pay-as-you-go, 3 items: AI credits, dataset storage, execution count; free trial quota for new users | **USD 0.0016/AI credit**; **USD 0.00014 per execution**; **USD 0.0000055 per dataset storage entry**. Doc example: 2,000 credits = $3.20 + 10,000 entries = $0.055 + 10,000 executions = $1.40 → $4.655/day | [https://www.alibabacloud.com/help/en/agentloop/agentloop-billing-overview], [https://www.alibabacloud.com/help/en/agentloop/product-overview/agentloop-billing-overview.md] |
| **Vector DB – AnalyticDB for PostgreSQL** | Serverless (per CU-hour) or reserved instance (per hour) + storage | Serverless pro **USD 0.036485/CU/hour** (example: 2 CU × 24 h = USD 1.75/day ≈ USD 53/month); reserved example USD 4.166/hour; storage USD 0.186/hour × nodes | [https://www.alibabacloud.com/help/en/analyticdb/analyticdb-for-postgresql/product-overview/billable-items], [https://www.alibabacloud.com/help/en/analyticdb/analyticdb-for-postgresql/product-overview/pricing-1] |
| **Vector DB – Milvus (Vector Retrieval Service)** | Two components: **CU fees** (subscription per CU/month, or pay-as-you-go hourly while the instance runs, regardless of query load) + **storage** billed hourly by usage | Service-node and compute-node unit prices are published per region in USD/CU/month, but I could not extract the numeric value — **unconfirmed, open the page** | [https://www.alibabacloud.com/help/en/milvus/product-overview/billing-item], [https://www.alibabacloud.com/help/en/milvus/product-overview/compute-node-specifications] |
| **Vector DB – Hologres** | Per CU-hour (1 CU = 1 core + 4 GB) or CU-month subscription | Singapore **USD 0.066604/CU/hour**; subscription USD 31.970149/CU-month (Singapore) | [https://www.alibabacloud.com/help/en/hologres/product-overview/pay-as-you-go], [https://www.alibabacloud.com/help/en/hologres/product-overview/subscription-1] |
| **Tair (Redis-compatible)** — vector / semantic cache | Instance hourly fee + bandwidth upgrades | Doc example: hourly fee USD 0.2; bandwidth USD 0.0020 per 10 MB | [https://www.alibabacloud.com/help/en/redis/product-overview/billable-items], [https://www.alibabacloud.com/blog/get-started-with-tair-semantic-caching-in-4-steps-stop-burning-money-on-repetitive-ai-queries_603502] |
| **Cloud-native API Gateway / AI Gateway** | Gateway instance fee (unit price × hours) + data processing fee + Internet traffic; hourly settlement, <1 h billed as 1 h | Doc example: **USD 0.291 × 5 hours = USD 1.455** per instance; data-processing example 0.005 × volume. Running 24/7 ≈ **USD 212/month** per instance | [https://www.alibabacloud.com/help/en/api-gateway/cloud-native-api-gateway/product-overview/billing-overview], [https://www.alibabacloud.com/help/en/api-gateway/ai-gateway/product-overview/free-product-templates] |
| **Simple Log Service (SLS)** — workflow/agent logs | Pay-by-feature: read/write traffic, index traffic, storage; or pay-by-ingested-data. Free quotas 500 MB/month per item | Read/write **USD 0.045/GB**; index traffic **USD 0.0875/GB**; log storage **USD 0.002875/GB·day**; ingested-data mode example **USD 0.061/GB** | [https://www.alibabacloud.com/en/product/log-service/pricing], [https://www.alibabacloud.com/help/en/sls/purchase-a-resource-plan], [https://www.alibabacloud.com/help/en/sls/billing-per-amount-of-data-written] |
| **OSS** — source documents/attachments | Per GB-month by storage class + traffic | Standard LRS **USD 0.0173/GB-month**; outbound Singapore ≈ USD 0.081/GB | [https://www.alibabacloud.com/help/en/oss/storage-fees], [https://www.alibabacloud.com/en/product/oss-pricing-list/en], [https://www.alibabacloud.com/blog/friday-blog---week-30---understanding-network-traffic-costs---part-2_598154] |
| **EventBridge** — email/webhook trigger | Per million published events (≤64 KB = 1 event) + target fees | **USD 0.82 per 1M published events** | [https://www.alibabacloud.com/help/en/eventbridge/product-overview/billing-of-event-buses] |
| **Direct Mail** — sending replies | Per 1,000 emails; optional dedicated IP | **USD 0.29 per 1,000 emails**; dedicated IP **USD 128/month**; one-time free quota 2,000 emails (≤200/day) | [https://www.alibabacloud.com/help/en/direct-mail/billing-methods], [https://www.alibabacloud.com/en/product/directmail/pricing], [https://www.alibabacloud.com/help/en/direct-mail/user-guide/dedicated-ip], [https://www.alibabacloud.com/help/en/direct-mail/product-overview/limits] |
| **Model Studio Managed Agents** | Session runtime fee, per hour | **CNY 0.5/hour** — **China site only**, no international price found | [https://help.aliyun.com/en/model-studio/managed-agents-billing] |
| **Model Studio observability** | Model monitoring shows total calls, failures, average call duration and **average time to first token**; alertable | No separate price published (console feature) | [https://www.alibabacloud.com/help/en/model-studio/model-telemetry] |
| **Model Studio fine-tuning / deployment** | Training per 1K tokens; deployment per TPM-hour | Page lists e.g. $0.007067/1K tokens and $0.048132/1K tokens for specific models — **read per model** | [https://www.alibabacloud.com/help/en/model-studio/model-training-and-deployment-billing] |

**Rule of thumb the app should encode:** for a 10k-email/month workflow, model tokens are ~$20–40/month while the *always-on* platform pieces (gateway instance, vector DB, ACK cluster) are $50–300/month. Always-on components dominate small deployments; per-token cost dominates large ones. Anchors: gateway ≈ $212/month [https://www.alibabacloud.com/help/en/api-gateway/cloud-native-api-gateway/product-overview/billing-overview], ACK Pro ≈ $66/month [https://www.alibabacloud.com/help/en/ack/ack-managed-and-ack-dedicated/product-overview/cluster-management-fee], ADB-PG serverless 2 CU ≈ $53/month [https://www.alibabacloud.com/help/en/analyticdb/analyticdb-for-postgresql/product-overview/billable-items].

---

## 5. Latency

### 5.1 Definitions to use in a proposal

| Metric | Definition | Source |
|---|---|---|
| TTFT | Time from request sent to first token received; **for reasoning models this includes the "thinking" time** | [https://artificialanalysis.ai/methodology/performance-benchmarking] |
| Time to first *answer* token | First token of the visible answer, after thinking | [https://artificialanalysis.ai/models] |
| TPOT / ITL | Average time between output tokens after the first | [https://docs.anyscale.com/llm/serving/benchmarking/metrics] |
| Output speed | Tokens/second generated after the first chunk | [https://artificialanalysis.ai/methodology/performance-benchmarking] |
| End-to-end | `E2E = TTFT + (output_tokens − 1) × TPOT` | [https://clickhouse.com/resources/engineering/llm-inference-latency], [https://docs.anyscale.com/llm/serving/benchmarking/metrics] |

### 5.2 Measured numbers for the models an international customer can call (Artificial Analysis, Alibaba Cloud endpoint unless noted)

| Model | TTFT | Output speed | Time to first answer token | Source |
|---|---|---|---|---|
| Qwen3.8 Max (0902) | 3.10 s | 40.1 t/s (Alibaba Cloud is the fastest provider measured) | n/a in snippet | [https://artificialanalysis.ai/models/comparisons/qwen3-8-max-vs-qwen3-8-max-0803], [https://artificialanalysis.ai/models/qwen3-8-max/providers] |
| Qwen3.8 Max | 2.73 s | — | — | [https://artificialanalysis.ai/models/comparisons/qwen3-8-max-vs-qwen3-8-max-0803] |
| Qwen3.7 Plus | 2.25 s | 57.1 t/s | 37.30 s (reasoning mode) | [https://artificialanalysis.ai/models/comparisons/qwen3-8-flash-next-vs-qwen3-7-plus], [https://artificialanalysis.ai/models/qwen3-7-plus] |
| Qwen3.8-Flash-Next | 2.36 s | 51.1 t/s | 41.50 s (reasoning mode) | [https://artificialanalysis.ai/models/comparisons/qwen3-8-flash-next-vs-qwen3-7-plus], [https://artificialanalysis.ai/models/qwen3-8-flash-next/providers] |
| Qwen3.7 Max | 2.17 s | 198.0 t/s | — | [https://artificialanalysis.ai/models/comparisons/qwen3-7-plus-vs-qwen3-7-max] |
| Qwen3.5 Omni Flash | 1.78 s (lowest on Alibaba Cloud) | 238.1 t/s (fastest on Alibaba Cloud) | — | [https://artificialanalysis.ai/providers/alibaba_cloud], [https://artificialanalysis.ai/models/qwen3-5-omni-flash/providers] |

**Key pattern for the drawing rules:** small/mid models are *not* automatically lower-latency end-to-end — Qwen3.7 Plus is faster in output speed (57.1 t/s) than Qwen3.8-Flash-Next (51.1 t/s), and reasoning mode adds tens of seconds before the first visible answer (37–41 s time-to-first-answer-token vs ~2.3 s TTFT) [https://artificialanalysis.ai/models/comparisons/qwen3-8-flash-next-vs-qwen3-7-plus]. Turn thinking off (or set a small `thinking_budget`) on interactive steps [https://www.alibabacloud.com/help/en/model-studio/deep-thinking].

### 5.3 Workflow latency formulas

```
Step latency:      L_j = TTFT_j + T_out_j / speed_j            (non-streaming: full generation)
Sequential path:   L_run = Σ_j L_j + Σ_j T_tool_j
Parallel fan-out:  L_run = max_j(L_j) for the parallel block, + Σ for the serial parts
Visible latency:   L_first_visible = TTFT of the last step before the user sees text
```
Streaming exposes TTFT as "the core metric for streaming experience" per Model Studio's own streaming guidance, which also tells you to monitor API error rate and average response time [https://www.alibabacloud.com/help/en/model-studio/stream]; Model Studio's console already reports average TTFT per model [https://www.alibabacloud.com/help/en/model-studio/model-telemetry].

### 5.4 How parallelism helps (published)

Anthropic's Research feature runs subagents **in parallel** (multiple tool calls concurrently), which "cut research time by up to **90%** for complex queries" — a latency result that comes at the price of ~15× tokens [https://www.anthropic.com/research/multi-agent-research-system]. Prompt caching also reduces latency: OpenAI documents up to 80% faster prompt processing on cache hits [https://openai.com/index/api-prompt-caching/], [https://www.prompthub.us/blog/prompt-caching-with-openai-anthropic-and-google-models] (secondary).

### 5.5 Presentation rules for the proposal export

1. Show **p50 and p95**, never a single number — same-task agent runs vary up to 30× in tokens [https://arxiv.org/abs/2604.22750], and latency scales with tokens.
2. Split "**time to first visible output**" from "**time to completed artefact**" (TTFT vs E2E) [https://artificialanalysis.ai/methodology/performance-benchmarking].
3. Show the human-approval step as **wait time, not compute** — it dominates wall-clock in human-in-the-loop workflows (**assumption**, no vendor figure found).
4. State the throughput ceiling: Model Studio throttles per primary account by RPM/TPM and returns 429 above the limit [https://www.alibabacloud.com/help/en/model-studio/rate-limit]; if the customer needs guaranteed throughput with no rate limiting, price Throughput Reservation/PTU instead of per-token [https://www.alibabacloud.com/help/en/model-studio/tpm-reservation-billing].

---

## 6. Worked example: support-email triage, 10,000 emails/month, Model Studio Singapore

### 6.1 The drawn workflow

`Email in (EventBridge → FC)` → `Classify & route (qwen3.8-flash, non-thinking)` → `Retrieve (text-embedding-v4 → vector DB → qwen3-rerank)` → branch:
- **70% routine** → `Draft answer from help centre (qwen3.7-plus, non-thinking)` → `Auto-send (Direct Mail)`
- **30% complex** → `Agent loop, 3 tool calls (qwen3.7-plus)` → `Draft reply for human` → `Human approval` → `Send (Direct Mail)`

Cross-cutting: `SLS logs`, `AgentLoop traces/evals`, runtime on `Function Compute`.

### 6.2 Assumptions (all stated, all tunable in the app)

| # | Assumption | Value | Basis |
|---|---|---|---|
| A1 | Volume | 10,000 emails/month | Given |
| A2 | Routine share | 70% | **Assumption** |
| A3 | Email body | 250 tokens (~190 words) | Derived from 100 tokens ≈ 75 words [https://help.openai.com/en/articles/4936856-understanding-and-counting-tokens] |
| A4 | System prompt + policy | 1,500 tokens, **cacheable** (≥1,024 minimum) | [https://www.alibabacloud.com/help/en/model-studio/context-cache] |
| A5 | Retrieved chunks | 5 × 400 tokens = 2,000 | [https://www.anthropic.com/research/contextual-retrieval], [https://aws.amazon.com/blogs/machine-learning/contextual-retrieval-in-anthropic-using-amazon-bedrock-knowledge-bases/] |
| A6 | Rerank candidates | 20 × 400 + 50 query = 8,050 tokens | **Assumption** + top-20 pattern [https://www.anthropic.com/research/contextual-retrieval] |
| A7 | Cache hit rate on the static prefix | 80% of eligible calls | **Assumption**; Anthropic's contextual-retrieval cookbook reports 70–80% of input tokens read from cache [https://platform.claude.com/cookbook/capabilities-contextual-embeddings-guide] |
| A8 | qwen3.7-plus cache-hit input price | $0.04/1M (≈10% of $0.40) | **Unconfirmed** — the International cache-hit column must be read from the pricing page; the Global-scope value is $0.056 [https://www.alibabacloud.com/help/en/model-studio/qwen3-7-plus], [https://www.alibabacloud.com/help/en/model-studio/model-pricing] |
| A9 | Agent loop depth (escalation) | 3 tool calls + final answer = 4 calls | **Assumption**, capped by `recursion_limit`/`max_turns` [https://reference.langchain.com/python/langchain-core/runnables/config/RunnableConfig/recursion_limit] |
| A10 | Tool result size | 400 tokens; tool call output 60 tokens | **Assumption** |
| A11 | Retry overhead | +10% on model cost | **Assumption** |
| A12 | Thinking mode | **Off** on all interactive steps | Cost/latency choice; thinking is billed as output [https://www.alibabacloud.com/help/en/model-studio/deep-thinking] |
| A13 | Prices | qwen3.8-flash $0.15/$0.47, cache-hit $0.016; qwen3.7-plus $0.40/$1.60; text-embedding-v4 $0.072/1M; qwen3-rerank $0.10/1M | [https://www.alibabacloud.com/help/en/model-studio/model-pricing], [https://www.alibabacloud.com/help/en/model-studio/text-embedding-v4] |

### 6.3 Per-email model cost

**Step 1 – Classify (qwen3.8-flash), all 10,000 emails**
Input 1,800 = 800 system (cached) + 250 body + 50 metadata… use A4 scaled: 800 cached @ $0.016 + 1,000 fresh @ $0.15; output 40 @ $0.47.
`(800×0.016 + 1000×0.15 + 40×0.47) / 1e6 = (12.8 + 150 + 18.8)/1e6 = $0.000182` → **10,000 × = $1.82**

**Step 2 – Query embedding (text-embedding-v4), 10,000**
`300 × 0.072 / 1e6 = $0.0000216` → **$0.22**

**Step 3 – Rerank (qwen3-rerank), 7,000 routine + 3,000 escalated = 10,000**
`8,050 × 0.10 / 1e6 = $0.000805` → **$8.05** ← note: reranking is the largest single retrieval line item

**Step 4 – RAG answer (qwen3.7-plus), 7,000**
Input 3,750 = 1,500 cached + 2,000 chunks + 250 body; output 250.
`(1500×0.04 + 2250×0.40 + 250×1.60)/1e6 = (60 + 900 + 400)/1e6 = $0.00136` → **$9.52**

**Step 5 – Escalation agent loop (qwen3.7-plus, 4 calls), 3,000**
Input per §2.2 with `T_base+T_tools = 1,800`, tool output 60, tool result 400:
`4×1,800 + (4×3/2)×460 = 7,200 + 2,760 = 9,960` input tokens; of that, 4 × 1,500 = 6,000 cached @ $0.04, 3,960 fresh @ $0.40. Output = 3×60 + 300 = 480 @ $1.60.
`(6000×0.04 + 3960×0.40 + 480×1.60)/1e6 = (240 + 1584 + 768)/1e6 = $0.00259` → **$7.78**

**Step 6 – KB indexing embeddings (500 articles × 800 tokens, monthly refresh)**
`400,000 × 0.072/1e6 = $0.029` (batch would be $0.014 at $0.036/1M [https://www.alibabacloud.com/help/en/model-studio/text-embedding-v4]) → **$0.03**

| Line | Emails | Cost/email | Monthly |
|---|---|---|---|
| Classify (qwen3.8-flash) | 10,000 | $0.000182 | $1.82 |
| Query embedding | 10,000 | $0.0000216 | $0.22 |
| Rerank (qwen3-rerank) | 10,000 | $0.000805 | $8.05 |
| RAG answer (qwen3.7-plus) | 7,000 | $0.00136 | $9.52 |
| Escalation loop (qwen3.7-plus ×4) | 3,000 | $0.00259 | $7.78 |
| KB indexing | — | — | $0.03 |
| **Subtotal (model)** | | | **$27.42** |
| Retry allowance (+10%, A11) | | | **$2.74** |
| **Total model cost** | | **≈ $0.0030/email** | **≈ $30.2/month** |

Cross-check against published practice: CloudZero's support-resolution example is 12 calls / 36k input / 6k output = **$0.132 per task** [https://www.cloudzero.com/blog/ai-agent-cost/]. Our workflow is ~44× cheaper per item because it uses 4 calls on a $0.40 model instead of 12 calls on a frontier model — that is exactly the sensitivity the app should show when the user swaps models or loop depth.

### 6.4 Non-model monthly cost

| Item | Sizing | Monthly | Source |
|---|---|---|---|
| Function Compute | 30,000 invocations; 1 vCPU + 2 GB × 2 s each → 60,000 vCPU-s (=60,000 CU) + 120,000 GB-s × 0.15 (=18,000 CU) + 3 × 75 CU = **78,225 CU** | 78,225 × $0.000020 = **$1.56** (free for a new user inside the 150,000 CU trial quota) | [https://www.alibabacloud.com/help/en/functioncompute/pay-as-you-go-billing-methods], [https://www.alibabacloud.com/help/es/functioncompute/billing-overview-of-fc], [https://www.alibabacloud.com/help/en/functioncompute/product-changes-changes-of-billable-items-resource-plans-and-trial-quota-of-function-compute] |
| Vector DB (AnalyticDB PG serverless) | 2 CU × 24 h | **$52.5** ($0.036485/CU/h × 2 × 730) | [https://www.alibabacloud.com/help/en/analyticdb/analyticdb-for-postgresql/product-overview/billable-items] |
| EventBridge | 10,000 published events | **$0.01** | [https://www.alibabacloud.com/help/en/eventbridge/product-overview/billing-of-event-buses] |
| Direct Mail | 10,000 sent | **$2.90** | [https://www.alibabacloud.com/help/en/direct-mail/billing-methods] |
| SLS logs/traces | 5 GB read/write + 5 GB index + 5 GB·30d storage | 5×0.045 + 5×0.0875 + 5×30×0.002875 ≈ **$1.09** | [https://www.alibabacloud.com/en/product/log-service/pricing], [https://www.alibabacloud.com/help/en/sls/purchase-a-resource-plan] |
| AgentLoop (optional) | 10,000 executions + 2,000 AI credits | 10,000×0.00014 + 2,000×0.0016 = **$4.60** | [https://www.alibabacloud.com/help/en/agentloop/agentloop-billing-overview] |
| Agent Sandbox (only if tools execute code) | 3,000 runs × 60 s × (2 vCPU + 4 GiB), Default class outside mainland | 3,000×60×(2×0.00000496 + 4×0.00000248) ≈ **$3.46** — **third-party rate, unconfirmed** | [https://createos.sh/vs/alibaba-agentrun], official page: [https://www.alibabacloud.com/help/en/agent-sandbox/product-overview/billing-overview] |
| Cloud-native API/AI Gateway (only if fronting the workflow) | 1 instance 24/7 | **≈ $212** ($0.291/h × 730) | [https://www.alibabacloud.com/help/en/api-gateway/cloud-native-api-gateway/product-overview/billing-overview] |
| AgentCore / AgentRun runtime | see §4 | **unconfirmed** (AgentCore reference USD 0.00001/Compute CU; 1 vCPU·s = 1 CU, 1 GB·s = 0.5 CU) | [https://www.alibabacloud.com/help/en/agentcore/agentcore-billing-instructions] |
| **Total non-model (without gateway)** | | **≈ $66/month** | |
| **Grand total (without gateway)** | | **≈ $96/month ≈ $0.0096 per email** | |

### 6.5 Honest ranges to display

| Scenario | Model cost/month | Total/month | Per email |
|---|---|---|---|
| Optimised (cache hits 80%, thinking off, flash classifier, no rerank) | $22 | $88 | $0.0088 |
| **Expected (table above)** | **$30** | **$96** | **$0.0096** |
| High (no cache hits, rerank 40 candidates, loop depth 6, 25% retries) | ≈ $95 | ≈ $161 | ≈ $0.016 |
| Frontier escalation (qwen3.8-max $2/$6 on the 30% escalated path, loop depth 6) | ≈ $330 | ≈ $400 | ≈ $0.040 |
| Worst case observed in the literature (30× token variance on the same task) | up to 30× the agentic portion | — | — [https://arxiv.org/abs/2604.22750] |

### 6.6 Latency for the same workflow (using §5.2)

| Path | Arithmetic | p50 |
|---|---|---|
| Routine auto-answer | classify (2.36 s TTFT + 40/51.1) + retrieve (≈0.5 s, assumption) + rerank (≈0.3 s, assumption) + answer (2.25 s + 250/57.1) | **≈ 10 s** |
| Escalation with draft | 4 × 2.25 s TTFT + (3×60 + 300)/57.1 t/s + tool time ≈ 2 s | **≈ 18–20 s** |
| Same, thinking mode ON | replace TTFT with time-to-first-answer-token (37.3 s for Qwen3.7 Plus) | **≈ 40 s+** [https://artificialanalysis.ai/models/comparisons/qwen3-8-flash-next-vs-qwen3-7-plus] |
| Parallel variant (classify ∥ retrieve ∥ customer-lookup) | `max()` of branches instead of `Σ` | ≈ 6–7 s; parallelisation is what cut Anthropic's research time by up to 90% [https://www.anthropic.com/research/multi-agent-research-system] |

Human approval adds unbounded wall-clock time — show it as a separate "waiting for human" bar, not as model latency (**assumption**).

### 6.7 Savings variants worth drawing as toggles

| Toggle | Effect on this example | Source |
|---|---|---|
| Explicit cache on the 1,500-token policy block | Input on that block drops to 10% of list; creation costs 125%; break-even after 1 hit | [https://www.alibabacloud.com/help/en/model-studio/explicit-cache-guide] |
| Drop rerank (use vector top-5 only) | −$8.05/month (−27% of model cost), some recall loss | rerank price [https://www.alibabacloud.com/help/en/model-studio/model-pricing]; top-20 + rerank pattern [https://www.anthropic.com/research/contextual-retrieval] |
| Cascade: qwen3.8-flash answers, escalate only on low confidence | FrugalGPT-style up to 98% cost reduction at matched quality; RouteLLM >85% on MT Bench | [https://arxiv.org/abs/2305.05176], [https://www.lmsys.org/blog/2024-07-01-routellm/], [https://www.alibabacloud.com/blog/model-routing-explained-send-each-request-to-the-cheapest-model-that-passes_603612] |
| Nightly batch for backlog/bulk classification | ×0.5 on input and output; ≤50,000 requests and ≤500 MB per file; cannot combine with cache discount | [https://www.alibabacloud.com/help/en/model-studio/batch-inference], [https://www.alibabacloud.com/help/en/model-studio/model-pricing] |
| Cap loop depth 6 → 3 | Input tokens on escalation drop from 38,700 to 9,960 (−74%) | §2.2 formula; `recursion_limit` [https://reference.langchain.com/python/langchain-core/runnables/config/RunnableConfig/recursion_limit] |
| Throughput Reservation at high volume | $16.63 per 10k TPM·hour input for qwen3.8-max instead of per-token | [https://www.alibabacloud.com/help/en/model-studio/tpm-reservation-billing] |

---

## 7. Default assumption table for the app's catalog

| Parameter | Default | Range | Source or status |
|---|---|---|---|
| Chars per token (English) | 3.5 | 3–4 | [https://qwen.readthedocs.io/en/latest/getting_started/concepts.html] |
| Words per token | 0.75 | — | [https://help.openai.com/en/articles/4936856-understanding-and-counting-tokens] |
| System prompt + instructions | 800 tokens | 200–2,000 | **Assumption**; cacheable only ≥1,024 [https://www.alibabacloud.com/help/en/model-studio/context-cache] |
| Tool definition overhead | 150/tool | 50–500 | **Assumption**; 50,000+ tokens observed with many tools [https://www.anthropic.com/research/advanced-tool-use] |
| Retrieved chunk | 400 tokens | 200–1,024 | [https://www.anthropic.com/research/contextual-retrieval], [https://aws.amazon.com/blogs/machine-learning/contextual-retrieval-in-anthropic-using-amazon-bedrock-knowledge-bases/], [https://developers.llamaindex.ai/python/framework/module_guides/loading/node_parsers/modules/] |
| Chunks per RAG answer (k) | 5 | 3–20 | **Assumption**; top-20 + rerank [https://www.anthropic.com/research/contextual-retrieval] |
| Rerank candidates | 20 | 10–50 | **Assumption** |
| Email body | 250 tokens | 100–800 | **Assumption** |
| Classification output | 40 tokens | 20–80 | **Assumption** |
| Email draft output | 250 tokens | 120–450 | **Assumption** |
| Tool result | 400 tokens | 100–2,000 | **Assumption**; keep tool responses concise [https://www.anthropic.com/research/writing-tools-for-agents] |
| Agent loop depth N | 3 | 1–25 | **Assumption**; hard default cap 25 [https://reference.langchain.com/python/langchain-core/runnables/config/RunnableConfig/recursion_limit] |
| Retry overhead | +10% | 0–50% | **Assumption**; same-task variance up to 30× [https://arxiv.org/abs/2604.22750] |
| Cache hit rate on static prefix | 80% | 0–95% | **Assumption**; 70–80% reported [https://platform.claude.com/cookbook/capabilities-contextual-embeddings-guide] |
| Implicit cache price ratio | 20% of input (10–12.5% on the models priced above) | 10–20% | [https://www.alibabacloud.com/help/en/model-studio/context-cache], [https://www.alibabacloud.com/help/en/model-studio/model-pricing] |
| Explicit cache: create / hit | 125% / 10% of input | — | [https://www.alibabacloud.com/help/en/model-studio/model-pricing], [https://www.alibabacloud.com/help/en/model-studio/explicit-cache-guide] |
| Batch discount | ×0.5 input and output | — | [https://www.alibabacloud.com/help/en/model-studio/batch-inference] |
| Agent-vs-chat token multiplier | ×4 | — | [https://www.anthropic.com/research/multi-agent-research-system] |
| Multi-agent-vs-chat multiplier | ×15 | — | [https://www.anthropic.com/research/multi-agent-research-system] |
| Input:output token ratio in agent runs | ~150:1 (coding) | 5:1–150:1 | [https://arxiv.org/abs/2604.22750] |
| TTFT (Alibaba endpoint) | 2.2–3.1 s | 1.8–3.1 s | [https://artificialanalysis.ai/providers/alibaba_cloud] |
| Output speed | 40–60 t/s (Plus/Flash/Max class), up to 198–238 t/s (Max/Omni Flash) | — | [https://artificialanalysis.ai/models/qwen3-7-plus], [https://artificialanalysis.ai/models/qwen3-8-max/providers], [https://artificialanalysis.ai/providers/alibaba_cloud] |
| Thinking-mode penalty | +30–40 s to first visible answer | — | [https://artificialanalysis.ai/models/comparisons/qwen3-8-flash-next-vs-qwen3-7-plus] |
| FC CU price | $0.000020/CU (Tier 1) | tiered | [https://www.alibabacloud.com/help/en/functioncompute/pay-as-you-go-billing-methods] |
| FC CU factors | 1 CU per vCPU·s; 0.15 CU per GB·s | — | [https://www.alibabacloud.com/help/es/functioncompute/billing-overview-of-fc] (Spanish locale of the same doc; verify on the English page) |
| Vector DB (serverless ADB-PG) | $0.036485/CU-hour | — | [https://www.alibabacloud.com/help/en/analyticdb/analyticdb-for-postgresql/product-overview/billable-items] |
| SLS | $0.045/GB read-write, $0.0875/GB index, $0.002875/GB·day storage | — | [https://www.alibabacloud.com/en/product/log-service/pricing] |
| Direct Mail | $0.29 per 1,000 emails | — | [https://www.alibabacloud.com/help/en/direct-mail/billing-methods] |
| EventBridge | $0.82 per 1M events | — | [https://www.alibabacloud.com/help/en/eventbridge/product-overview/billing-of-event-buses] |
| Gateway instance | $0.291/hour (example rate) | — | [https://www.alibabacloud.com/help/en/api-gateway/cloud-native-api-gateway/product-overview/billing-overview] |
| AgentLoop | $0.00014/execution, $0.0016/AI credit, $0.0000055/dataset entry | — | [https://www.alibabacloud.com/help/en/agentloop/agentloop-billing-overview] |
| AgentCore CU | 1 vCPU·s = 1 CU; 1 GB·s = 0.5 CU; reference $0.00001/CU | regional price **unconfirmed** | [https://www.alibabacloud.com/help/en/agentcore/agentcore-billing-instructions] |

---

## 8. Formula sheet (drop into the drawing engine)

```
# 1. Per call
IN      = T_sys + T_tools + T_ctx + T_hist + T_toolres + T_user
COST    = IN_cached·P_cache + (IN − IN_cached)·P_in + (T_out + T_think)·P_out
IN_cached = IN_static_prefix · hit_rate      # only if prefix ≥ 1024 tokens

# 2. Agent loop (quadratic history growth)
IN_total(N) = N·(T_sys + T_tools) + N(N−1)/2·(T_toolcall + T_toolresult)

# 3. Per run
COST_run = Σ_calls COST · (1 + retry_rate)

# 4. Per month
COST_month = COST_run · V · mix + Σ_fixed_infra + Σ_per_use_infra

# 5. Discount composition (Model Studio: batch and cache never stack)
P_in_eff = P_in · [(1−h) + h·d]        if realtime+cache
P_in_eff = 0.5 · P_in                  if batch

# 6. Latency
L_step  = TTFT + T_out / speed
L_seq   = Σ L_step + Σ T_tool
L_par   = max(L_step) over the parallel block
E2E     = TTFT + (T_out − 1)·TPOT      # TPOT = 1/speed

# 7. Throughput ceiling check
required_TPM = V_per_minute · (IN + OUT);  must be < account TPM limit (else 429 or buy PTU)
```
Sources for the formula components: §1.2, §2.2, §3.3, §5.1, [https://www.alibabacloud.com/help/en/model-studio/rate-limit], [https://clickhouse.com/resources/engineering/llm-inference-latency].

---

## 9. Open items to verify in the console (could not confirm from public pages)

1. **Milvus (Vector Retrieval Service) CU unit prices** — page exists and states CU + storage billing, numeric USD/CU/month per region not extractable from search [https://www.alibabacloud.com/help/en/milvus/product-overview/billing-item]. **Unconfirmed.**
2. **AgentRun unit prices** — docs describe active/idle billing rates and a cost-saving mode, but no public rate card found [https://www.alibabacloud.com/help/en/agentrun/what-is-agentrun], [https://www.alibabacloud.com/help/en/agentrun/api-agentrun-2025-09-10-struct-agentruntime]. **Unconfirmed.**
3. **AgentCore regional (Singapore) CU prices** — only a reference price tied to China (Shanghai) appears on the international page; the China site lists CNY 0.0000694/Compute CU and CNY 0.0000015/CU for request calls (**China site only**) [https://www.alibabacloud.com/help/en/agentcore/agentcore-billing-instructions], [https://help.aliyun.com/en/agentcore/agentcore-billing-instructions].
4. **Agent Sandbox per-second rates outside mainland China** — official page shows mainland reference rates; outside-mainland figures came only from a third-party comparison [https://www.alibabacloud.com/help/en/agent-sandbox/product-overview/billing-overview], [https://createos.sh/vs/alibaba-agentrun]. **Unconfirmed.**
5. **qwen3.7-plus cache-hit input price in the `International` scope** — the model page shows $0.056, which corresponds to the `Global` scope ($0.276 base); the International value must be read from the pricing table [https://www.alibabacloud.com/help/en/model-studio/qwen3-7-plus], [https://www.alibabacloud.com/help/en/model-studio/model-pricing]. **Unconfirmed.**
6. **PTU vs Throughput Reservation rate discrepancy** for qwen3.8-max ($16.63 vs $3.96 per 10k TPM·hour) [https://www.alibabacloud.com/help/en/model-studio/tpm-reservation-billing], [https://www.alibabacloud.com/help/en/model-studio/model-training-and-deployment-billing]. **Unconfirmed.**
7. **Model Studio per-model RPM/TPM in Singapore** — the rate-limit doc explains the model but I could not extract the current per-model table; one third-party aggregator lists qwen-plus 600 RPM / 1M TPM and qwen3.7-plus 15,000 RPM / 5M TPM [https://www.alibabacloud.com/help/en/model-studio/rate-limit], [https://freellmapihub.com/p/alibaba-model-studio] (third party). **Unconfirmed.**
8. **Model Studio Managed Agents session fee internationally** — only CNY 0.5/hour found (**China site only**) [https://help.aliyun.com/en/model-studio/managed-agents-billing].

---

## Searches run (193)

- Alibaba Cloud Model Studio pricing qwen tokens Singapore
- Alibaba Cloud Model Studio context cache discount pricing
- Anthropic how we built multi-agent research system token usage 15x chat
- Alibaba Cloud AgentRun pricing
- Model Studio batch inference 50% discount Alibaba Cloud
- Alibaba Cloud Function Compute pricing per GB-second invocations
- Artificial Analysis time to first token tokens per second qwen3
- Alibaba Cloud AnalyticDB PostgreSQL vector database pricing
- alibabacloud.com model-studio explicit-cache-guide cache creation 125% hit 90%
- Alibaba Cloud Model Studio context cache implicit cache price 20% input token
- Alibaba Cloud AgentRun billing pricing Function Compute CU sandbox
- Anthropic prompt caching 90% cost reduction documentation
- OpenAI prompt caching 50% discount 75% documentation
- Gemini context caching pricing discount Google AI docs
- OpenAI reasoning tokens cost estimate how to count tokens
- Anthropic building effective agents token cost per agent loop
- Model Studio model inference pricing qwen3.8-max qwen-plus qwen-flash per 1M tokens Singapore table
- Alibaba Cloud Model Studio qwen-flash price thinking mode input output tokens
- AgentRun pricing billing CU Alibaba Cloud international Singapore
- Alibaba Cloud Agent Sandbox billing per second price compute fee
- Alibaba Cloud Function Compute price $0.00001668 GB-second invocation price per 10000
- Alibaba Cloud Simple Log Service SLS pricing per GB
- Alibaba Cloud Cloud-native API Gateway AI Gateway pricing
- Alibaba Cloud Milvus pricing per hour
- alibabacloud.com agentcore agentcore-billing-instructions Compute CU price region
- Alibaba Cloud AgentCore billing CU unit price Singapore per hour
- alibabacloud.com milvus billing-item CU price per hour instance specifications
- Cloud-native API Gateway billing USD 0.291 per hour node Alibaba Cloud
- Function Compute Agent Sandbox pay-as-you-go vCPU price memory price per second Alibaba Cloud
- Alibaba Cloud SLS pay-by-ingested-data USD per GB hot storage index traffic
- Artificial Analysis qwen3.8-max output tokens per second time to first token
- Artificial Analysis qwen3.8-flash latency tokens per second
- "AgentCore" Alibaba Cloud billing "Compute CU" USD price Singapore region
- Alibaba Cloud Function Compute CU definition vCPU second GB second unit price tiered 0.000020
- Model Studio text-embedding-v4 price per 1M tokens Singapore
- Alibaba Cloud Model Studio token calculation 1 token equals characters
- artificialanalysis.ai Qwen3.8 Max time to first token output tokens per second
- Anthropic effective context engineering for AI agents compaction token growth
- FrugalGPT cascade cost reduction 98% paper
- LangGraph cost tracking token usage per node documentation
- Alibaba Cloud AgentCore billing Compute CU conversion factor vCPU memory free quota
- Alibaba Cloud AgentLoop pricing observability Hong Kong
- alibabacloud.com Model Studio embedding text-embedding-v5 price per 1M tokens
- alibabacloud.com Model Studio rerank qwen3-reranker price
- Model Studio thinking mode billed as output tokens qwen3 enable_thinking thinking_budget
- Model Studio context cache implicit cache minimum tokens 256 TTL 5 minutes qwen
- Alibaba Cloud DirectMail pricing per 1000 emails
- Alibaba Cloud Container Service ACK cluster management fee per hour
- Function Compute CU conversion factor 1 CU vCPU second memory GB second Alibaba Cloud billing-fc
- alibabacloud.com Model Studio qwen3.8-flash price input output per 1M tokens rate limit TPM
- alibabacloud.com Model Studio qwen3.7-plus price tiers 0-256K 256K-1M
- Model Studio free quota 1 million tokens 90 days Singapore new users
- LlamaIndex SentenceSplitter default chunk_size 1024 chunk_overlap 20 documentation
- LangChain RecursiveCharacterTextSplitter default chunk_size 1000 characters documentation
- Anthropic contextual retrieval top 20 chunks chunk size tokens
- OpenAI prompt caching minimum 1024 tokens discount 50% 90% documentation
- alibabacloud.com model-studio qwen3-8-max pricing input output implicit cache explicit cache read RPM TPM
- Function Compute CU conversion factor active vCPU usage memory usage invocations 0.25 CU GB-second
- Alibaba Cloud Agent Sandbox vCPU price per second USD memory price disk price
- Vector Retrieval Service Milvus CU price USD per CU hour Singapore
- artificialanalysis.ai qwen3-8-max providers latency output speed
- Artificial Analysis Qwen3.8 Flash output tokens per second time to first token Alibaba Cloud
- Alibaba Cloud AnalyticDB for PostgreSQL pricing per hour serverless basic edition
- Alibaba Cloud Container Compute Service ACS pricing vCPU GiB per hour
- "qwen3.8-max" Model Studio Input 1.651 Per 1M tokens limited-time
- qwen3.7-plus Model Studio Input 0.4 Output 1.6 per 1M tokens Singapore
- Alibaba Cloud Model Studio rate limit RPM TPM qwen-flash qwen-plus Singapore table
- AgentCore billing Gateway CU Browser CU Code Interpreter CU price USD
- Alibaba Cloud Agent Sandbox billing overview vCPU price USD per vCPU second memory price GiB second disk
- Milvus Alibaba Cloud billing item CU price USD per CU-hour storage price
- Alibaba Cloud Model Studio context cache which models support implicit cache 20% input price
- Alibaba Cloud Tair vector database pricing per hour
- Model Studio pricing deployment scope Global International qwen3.8-max 1.65 4.951
- "qwen3.8-max" "Explicit Cache Read" Per 1M tokens
- Alibaba Cloud AgentRun billing free pricing what is AgentRun serverless
- Alibaba Cloud AgentCore regional pricing Compute CU USD Singapore
- AgentLoop billing AI credits dataset storage execution count USD price per
- Function Compute CU conversion factor invocations 10000 CU billing factor table
- Milvus Alibaba Cloud CU price international USD per CU hour
- artificialanalysis Qwen3.8 Max 0902 Alibaba Cloud time to first token seconds
- Function Compute CU conversion factor invocations vCPU-second GB-second table Alibaba Cloud billing-fc
- Alibaba Cloud Milvus CU price USD per CU month storage price international
- Alibaba Cloud AgentRun billing pricing CU per hour international Singapore
- LangGraph recursion_limit default 25 documentation
- OpenAI reasoning_effort minimal low medium high token usage documentation
- OpenAI prompt caching discount percentage gpt-5 cached input developers.openai.com
- Anthropic prompt caching pricing 1.25x write 0.1x read platform.claude.com
- Alibaba Cloud Model Studio deep thinking thinking_budget maximum thinking tokens
- Alibaba Cloud AgentCore regional pricing table USD per CU Singapore Compute CU Gateway CU
- Alibaba Cloud Function Compute tier 1 price 0.000020 CU vCPU second 1 CU memory 0.15 CU GB second invocations
- Vector Retrieval Service Milvus price USD CU month Singapore international regions
- Alibaba Cloud Agent Sandbox Economy USD 0.0000026 per vCPU second memory disk price
- Model Studio rate limit qwen3.8-flash RPM 30000 TPM 5000000 Singapore
- Model Studio batch inference 24 hours completion 50% cost file size limit
- Alibaba Cloud AI Gateway FinOps token quota cost control model fallback
- AgentRun open platform cost-saving mode token quotas instance specifications
- Model Studio implicit cache common prefix at least 1024 tokens minimum cache size
- Function Compute 75 CU per 10000 invocations conversion factor
- AgentRun billing overview Alibaba Cloud charges pay-as-you-go
- Agent Sandbox Alibaba Cloud Singapore Default vCPU price per second USD
- Anthropic contextual retrieval chunk size 400 tokens recommendation
- artificialanalysis Qwen3.8 Max 0902 Alibaba Cloud latency seconds output speed 40.1
- Artificial Analysis Qwen3.7 Plus latency time to first answer token output speed
- Model Studio qwen3.8-flash rate limits RPM TPM free quota
- Anthropic multi-agent research system parallel tool calls reduce end-to-end latency 90%
- Anthropic multi-agent token usage explains 80% of performance variance cost per task
- RouteLLM cost savings 85% paper
- Model Studio usage response cached_tokens prompt_tokens_details Alibaba Cloud
- Alibaba Cloud Model Studio rate limiting table RPM TPM qwen-plus qwen-flash account level
- artificialanalysis.ai Qwen3.8 Flash output speed t/s time to first token Alibaba Cloud provider
- Alibaba Cloud AgentRun what is AgentRun pricing billing free light sleep
- AnalyticDB for PostgreSQL serverless price USD 0.036485 CU hour billable items
- Alibaba Cloud AgentRun billing overview pricing page agentrun-billing
- Milvus Alibaba Cloud billing item price USD per CU month query node
- Cloud-native API Gateway billing gateway instance fee USD per hour serverless Alibaba Cloud
- Alibaba Cloud EventBridge pricing per million events
- Qwen3.8 Max 0902 time to first token output speed artificialanalysis comparison
- Qwen3.7 Plus output speed tokens per second artificial analysis
- Alibaba Cloud OSS object storage pricing per GB Singapore
- Alibaba Cloud Model Studio knowledge base RAG pricing document parsing per page
- Anthropic code execution with MCP 150,000 tokens tool definitions context
- Anthropic writing effective tools for agents token overhead tool definitions
- OpenAI Agents SDK max_turns default guardrails
- artificialanalysis Qwen3.8 Flash providers output speed latency
- Alibaba Cloud AgentRun instance specifications price billing runtime CU
- Milvus Alibaba Cloud price USD per CU month international regions billing item
- Alibaba Cloud EventBridge price USD per million events billing of event buses
- Alibaba Cloud Model Studio billing and cost management view token usage by model
- Alibaba Cloud Model Studio token consumption common scenarios reduce model call costs
- Model Studio model-pricing "Token consumption" chat scenario tokens average
- Alibaba Cloud Model Studio throughput reservation PTU pricing USD per 10k tokens
- Anthropic advanced tool use 50,000 tokens tool definitions results before agent starts
- Anthropic code execution with MCP example 150000 tokens 2000 tokens 98.7%
- Alibaba Cloud Agent Sandbox reference prices regions outside Chinese mainland Default vCPU per second
- Model Studio billing rate limits token calculation rules different modalities
- Alibaba Cloud Model Studio cost estimation calculator agent workflow
- Model Studio "Agent mode" overhead large system prompt tool MCP definitions multiple rounds tool calls tokens
- Model Studio PTU provisioned throughput price per 10k TPM hour qwen
- Agent Sandbox Alibaba Cloud outside mainland China Default vCPU price per second memory price GiB second
- Milvus Alibaba Cloud service node unit price USD CU month pay-as-you-go
- alibabacloud.com AgentRun billing pricing agentrun-billing-instructions
- Alibaba Cloud AgentRun runtime instance specifications vCPU memory price
- Model Studio Singapore region qwen3.8-flash price input output official help page
- Alibaba Cloud Model Studio model-pricing Singapore qwen-flash qwen-turbo input output price per 1M tokens
- "AgentRun" Alibaba Cloud billing "pay-as-you-go" price instance specification vCPU memory hour
- Alibaba Cloud Milvus price USD CU month 2CU 4CU query node international
- qwen3.8-flash Singapore Input 0.15 Output 0.47 Model Studio pricing page
- Model Studio pricing agent mode token overhead system prompt tool calls multiple rounds chat mode comparison
- Intercom Fin pricing per resolution AI support agent cost
- LLM tokens per support email classification extraction average tokens study
- AI agent cost per task tokens benchmark agentic workflow average tokens per task 2026
- Stanford agentic workflow token usage study average tokens per task
- iternal token usage guide average tokens per request chat RAG agent benchmarks
- CloudZero AI agent cost 12 calls 36000 input 6000 output tokens $0.132 per task
- arXiv How Do AI Agents Spend Your Money token consumption agentic coding 4.17 million variance 30x input tokens share
- Alibaba Cloud AgentRun 计费 billing items CU price agent runtime
- "model-pricing" Model Studio "Agent mode" "system prompt" tokens overhead "tool" scenario chat token consumption
- Alibaba Cloud Milvus billing CU price USD per CU per month Singapore region table
- Alibaba Cloud Model Studio context cache supported models list implicit cache qwen3.8-flash qwen3.7-plus
- Palo Alto Networks engineering blog tracking LLM token usage across providers cached tokens reasoning tokens fields
- Function Compute "75 CU" 10,000 invocations conversion factor Alibaba
- Alibaba Cloud Model Studio PTU price qwen3.7-plus per 10K TPM hour USD postpaid
- artificialanalysis Qwen3.8 Flash providers output speed latency Alibaba Cloud
- Vector Retrieval Service for Milvus price USD/CU/month subscription Singapore billing item
- AgentCore Alibaba Cloud billable items Compute CU Gateway CU price USD region Singapore
- Alibaba Cloud Model Studio managed agents billing session runtime fee international
- Alibaba Cloud Simple Log Service pricing index traffic USD per GB storage per GB day Singapore
- Alibaba Cloud AnalyticDB PostgreSQL vector basic edition price per hour Singapore
- alibabacloud AgentCore billing "USD" Compute CU Gateway CU Storage CU price Singapore regional pricing
- alibabacloud milvus billing-item "USD/CU/month" price table
- AgentRun billing instructions Alibaba Cloud idle rate instance specification price
- Model Studio PTU postpaid input per 10K TPM hour qwen3.8-max price USD
- Anyscale LLM latency metrics TTFT TPOT end-to-end documentation
- Baseten AI model performance metrics TTFT tokens per second explanation
- Artificial Analysis methodology performance benchmarking time to first token reasoning models
- Alibaba Cloud Model Studio streaming output first token latency documentation
- Alibaba Cloud Milvus price "CU" "USD" month instance 4 CU query node billing
- AgentRun Alibaba Cloud billing "CU" price agent runtime idle rate documentation
- Alibaba Cloud blog model routing explained send each request to the cheapest model that passes savings
- Model Studio model monitoring average time to first token TTFT calls failures
- Alibaba Cloud Model Studio token consumption cost control compress historical messages reduce cost tips
- Anthropic Claude tool use token overhead system prompt tools add tokens documentation
- OpenAI cookbook estimate cost tokens extraction task example
- Alibaba Cloud Model Studio workflow application nodes billing model calls
- "milvus" alibabacloud billing item compute node unit price USD/CU/month compute-optimized storage-optimized value
- "AgentRun" alibabacloud.com help billing price CU hour agent runtime pay-as-you-go international
- Model Studio qwen3.8-flash price Singapore Input Output Batch File Implicit Cache per 1M tokens
- Alibaba Cloud Simple Log Service pricing read write traffic 0.045 index traffic 0.0875 storage 0.002875
- model-pricing Alibaba Cloud qwen3.8-flash International $0.15 cache-hit $0.016 output $0.47
- Alibaba Cloud Model Studio pricing qwen3.7-plus International input cache-hit output price per million tokens
- How Alibaba Cloud Calculates and Manages LLM Tokens blog English characters per token
- model-pricing qwen3.7-plus International $0.4 $1.6 Global 0.276 1.101 deployment scope
- model-pricing qwen3.8-max International $2 $6 cache-hit input price Global 1.65 4.951

## Sources returned by search (1081)

- https://www.alibabacloud.com/help/en/model-studio/model-pricing
- https://www.alibabacloud.com/help/en/model-studio/token-plan-overview
- https://www.alibabacloud.com/help/en/model-studio/new-free-quota
- https://www.requesty.ai/models/alibaba
- https://modelstudio.alibabacloud.com/
- https://cabina.ai/blog/qwen-api-pricing/
- https://www.facebook.com/fb-answers/alibaba-cloud-model-studio-pricing-per-model-token-cost/
- https://www.alibabacloud.com/en/campaign/ai-landing-page-token?_p_lc=1
- https://techjacksolutions.com/ai-tools/qwen/qwen-pricing/
- https://models.litellm.ai/providers/dashscope
- https://www.alibabacloud.com/help/en/model-studio/context-cache
- https://help.aliyun.com/en/model-studio/context-cache
- https://www.alibabacloud.com/en/notice/model_studio_context_cache_price_reduction_for_certain_models_578?_p_lc=1
- https://www.reddit.com/r/Qwen_AI/comments/1s48o3e/question_very_high_token_charges_using_claude/
- https://www.alibabacloud.com/help/en/model-studio/explicit-cache-guide
- https://www.instagram.com/p/De8dYqLlwrR/
- https://www.subconscious.dev/providers/alibaba-cloud
- https://www.alibabacloud.com/blog/603613
- https://www.anthropic.com/research/multi-agent-research-system
- https://theaiengineer.substack.com/p/how-anthropic-built-multi-agent-deep
- https://fountaincity.tech/resources/blog/anthropic-multi-agent-blueprint-production/
- https://getnadir.com/blog/multi-agent-orchestration-15x-token-cost/
- https://www.linkedin.com/posts/pawel-huryn_i-copied-the-multi-agent-research-system-activity-7408969788464447488-0vz5
- https://www.anthropic.com/research/multiagent-systems
- https://www.beri.net/learning/anthropic-multi-agent-research-system
- https://www.youtube.com/watch?v=0HljLKVdtjo
- https://blog.bytebytego.com/p/how-anthropic-built-a-multi-agent
- https://www.reddit.com/r/ClaudeCode/comments/1wvhkaz/when_to_use_a_multi_agent_system/
- https://www.alibabacloud.com/help/en/agentrun/what-is-agentrun
- https://www.alibabacloud.com/blog/giving-your-ai-agent-a-disposable-workspace-with-alibaba-cloud-agentrun_603324
- https://www.alibabacloud.com/en/pricing?_p_lc=1
- https://api.alibabacloud.com/api/AgentRun/2025-09-10
- https://vercel.com/ai-gateway/models/labs/alibaba
- https://api.alibabacloud.com/api-tools/cli/AgentRun
- https://rpabotsworld.com/alibaba-cloud-agent-native-cloud-agentrun-agentloop-agentteams-guide/
- https://artificialanalysis.ai/providers/alibaba_cloud
- https://www.alibabacloud.com/help/en/agentrun/open-platform-introduction.md
- https://www.alibabacloud.com/help/en/model-studio/batch-inference
- https://help.aliyun.com/en/model-studio/token-plan-personal-overview
- https://inten.to/state-of-translation-automation/costs/batch-prices/
- https://www.facebook.com/AlibabaCloudSEA/posts/qwen37-max-now-live-on-model-studio-50-off-limited-time-offer-built-for-the-agen/1006537645274135/
- https://www.developersdigest.tech/models/fine-tuning/alibaba-model-studio
- https://www.facebook.com/alibabacloud/videos/model-studio-finalmp4/874348851197500/
- https://www.youtube.com/watch?v=gfqytnlfx2s
- https://www.alibabacloud.com/help/en/functioncompute/billing-overview-of-fc
- https://www.alibabacloud.com/en/product/function-compute/pricing
- https://www.alibabacloud.com/help/en/functioncompute/pay-as-you-go-billing-methods
- https://paazmaya.fi/price-tier-comparison-of-cloud-function-providers/
- https://github.com/hbmartin/comparison-hosts-serverless-cloud-function-faas-for-python
- https://www.alibabacloud.com/help/en/functioncompute/fc-2-0/bill-change
- https://stackoverflow.com/questions/57308375/what-is-the-function-time-out-limit-at-alibaba-function-compute
- https://www.rfp.wiki/cloud-computing/serverless-computing-function-as-a-service/alibaba-function-compute/aws-lambda
- https://arxiv.org/html/2408.03021v1
- https://koritsu.ai/blog/cloud-function-invocation-cost-explained/
- https://artificialanalysis.ai/models
- https://www.digitalapplied.com/blog/ai-model-latency-benchmarks-2026-ttft-throughput
- https://medium.com/data-science-collective/qwen3-8-max-benchmarks-and-the-footnotes-under-them-8c874526aa81
- https://artificialanalysis.ai/models/qwen3-5-2b/providers
- https://www.linkedin.com/top-content/artificial-intelligence/ai-benchmark-analysis/ai-latency-and-throughput-benchmarks/
- https://www.reddit.com/r/LocalLLaMA/comments/1vpr0ll/still_no_qwen_32b_benchmarks_on_artificial/
- https://ciad.cz/en/comparisons/ai-model-speed-tested-tokens-per-second-and-latency-september-2026/
- https://docs.anyscale.com/llm/serving/benchmarking/metrics
- https://www.baseten.co/blog/ai-model-performance-metrics-explained/
- https://benchlm.ai/llm-speed
- https://www.alibabacloud.com/en/product/hybriddb-postgresql?_p_lc=1
- https://www.alibabacloud.com/help/en/analyticdb/analyticdb-for-postgresql/user-guide/vector-analysis/
- https://www.alibabacloud.com/blog/analyticdb-a-vector-database-recommended-by-openai---more-than-just-a-vector-index_600692
- https://www.alibabacloud.com/en/product/analyticdb?_p_lc=1
- https://www.alibabacloud.com/help/en/analyticdb/analyticdb-for-postgresql/getting-started/instances-with-vector-engine-optimization-enabled
- https://www.vldb.org/pvldb/vol18/p5139-zhou.pdf
- https://www.alibabacloud.com/help/en/analyticdb/analyticdb-for-postgresql/user-guide/vector-search
- https://db-engines.com/en/system/Alibaba+Cloud+AnalyticDB+for+PostgreSQL
- https://www.alibabacloud.com/blog/analyticdb-for-postgresql-%2B-llm-building-enterprise-specific-chatbot-in-the-generative-ai-era_600111
- https://www.rfp.wiki/cloud-computing/cloud-database-management-systems/alibaba-cloud-analyticdb
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/context-cache
- https://github.com/anomalyco/opencode/issues/27687
- https://www.alibabacloud.com/notice/detail?spm=a3c0i.35801494.J_TlTAa0s_LXHOq4tuiO-gv.5.5ce47c5brRScm3&_p_lc=1&id=1425
- https://help.aliyun.com/en/model-studio/knowledgechat
- https://www.youtube.com/watch?v=QmB2qxcQx88&vl=en-US
- https://go.tabbit.ai/model/qwen3-7-max/prompts/alibaba-cloud-model-studio-pricing-cache-configuration
- https://www.alibabacloud.com/blog/603236
- https://artificialanalysis.ai/models/caching
- https://www.developersdigest.tech/blog/how-to-cut-llm-api-bill-2026
- https://www.alibabacloud.com/help/en/functioncompute/cloud-sandbox-new-billing-model-online-announcement?spm=a2c63.p38356.help-menu-2508973.d_0.62b31edd1nDFXm
- https://www.alibabacloud.com/help/en/agent-sandbox/product-overview/billing-overview
- https://www.alibabacloud.com/product/function-compute/pricing
- https://help.aliyun.com/en/functioncompute/cloud-sandbox-new-billing-model-online-announcement
- https://baike.baidu.com/en/item/Alibaba%20Cloud%20Function%20Compute%20Cloud%20Sandbox%20Environment/5085160
- https://www.youtube.com/watch?v=KmAvN42-E1k
- https://createos.sh/vs/alibaba-agentrun
- https://www.quora.com/What-does-Alibaba-Cloud-Computing-services-do
- https://platform.claude.com/docs/en/build-with-claude/prompt-caching
- https://www.reddit.com/r/Anthropic/comments/1idf7x7/anyone_actually_saving_money_with_claudes_prompt/
- https://www.okoone.com/spark/technology-innovation/anthropic-introduces-cost-saving-prompt-caching-for-claude/
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/partner-models/claude/prompt-caching
- https://technspire.com/en/blog/anthropic-prompt-caching-pricing-mechanics
- https://medium.com/@pur4v/prompt-caching-reducing-llm-costs-by-up-to-90-part-1-of-n-042ff459537f
- https://www.mindstudio.ai/blog/anthropic-prompt-caching-claude-subscription-limits
- https://hidekazu-konishi.com/entry/anthropic_claude_api_prompt_caching_and_token_efficiency.html
- https://gingerlabs.ai/blog/prompt-caching-break-even-analysis
- https://imasters.com/tecnologia/anthropic-prompt-caching-cuts-up-to-90-percent-cost-repeated-tokens-production
- https://developers.openai.com/api/docs/guides/prompt-caching
- https://openai.com/index/api-prompt-caching/
- https://www.prompthub.us/blog/prompt-caching-with-openai-anthropic-and-google-models
- https://www.reddit.com/r/ClaudeAI/comments/1fvqqjk/openai_launches_prompt_caching_which_reduces_cost/
- https://github.com/HKUDS/LightRAG/issues/2355
- https://learn.microsoft.com/en-us/answers/questions/5807188/does-azure-openai-support-extended-prompt-cache-re
- https://portkey.ai/blog/openais-prompt-caching-a-deep-dive
- https://community.openai.com/t/problem-caching-system-prompt/1346849
- https://sgryt.com/posts/openai-prompt-caching-cost-optimization/
- https://x.com/OpenAIDevs/status/2112603916076781778
- https://ai.google.dev/gemini-api/docs/pricing
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/context-cache/context-cache-overview
- https://cloud.google.com/model-garden/pricing
- https://aistudio.google.com/docs/pricing
- https://ai.google.dev/gemini-api/docs/caching
- https://www.cloudzero.com/blog/gemini-pricing/
- https://cloud.google.com/blog/products/ai-machine-learning/vertex-ai-context-caching
- https://developers.openai.com/api/docs/guides/token-counting
- https://help.openai.com/en/articles/4936856-understanding-and-counting-tokens
- https://www.quizrise.com/token-counter
- https://community.openai.com/t/how-the-reasoning-tokens-were-calculated/1105907
- https://medium.com/kariyertech/toolkit-to-calculate-predict-the-cost-of-using-openais-api-models-838737b47c23
- https://tokencalculator.ai/
- https://distillery.com/blog/understanding-openai-api-cost/
- https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/developer/ai-system-app-token-counting
- https://community.openai.com/t/reasoning-tokens-hidden-price-question/1353099
- https://www.anthropic.com/research/building-effective-agents
- https://www.linkedin.com/posts/paoloperrone_anthropics-lead-just-dropped-the-playbook-activity-7494230123420823553-Pg2X
- https://www.reddit.com/r/Anthropic/comments/1uacade/bro_is_loop_engineering_where_you_trust_agents_to/
- https://www.anthropic.com/research/code-execution-with-mcp
- https://pub.towardsai.net/why-your-agent-loop-costs-more-than-its-model-price-tag-81a48b691df5
- https://getunblocked.com/blog/agent-auto-loop-token-cost/
- https://www.youtube.com/watch?v=mR-WAvEPRwE
- https://www.augmentcode.com/guides/ai-coding-cost-analysis-agent-token-spend
- https://www.maryammiradi.com/blog/build-ai-agents-anthropic-lessons
- https://www.morphllm.com/qwen-api
- https://www.spheron.network/blog/qwen-api-pricing-vs-self-hosted-llms-cost-privacy-2026/
- https://qwen.ai/blog?id=qwen3.8-flash-next
- https://help.aliyun.com/en/model-studio/model-pricing
- https://www.cloudzero.com/blog/qwen-api-pricing/
- https://www.lindy.ai/blog/qwen-3-8
- https://www.digitalapplied.com/blog/qwen-3-5-medium-model-series-benchmarks-pricing-guide
- https://www.alibabacloud.com/help/en/model-studio/models
- https://www.activepieces.com/blog/qwen-api-pricing-costs-tiers-and-models-2026
- https://deepinfra.com/blog/qwen-api-pricing-2026-guide
- https://benchlm.ai/alibaba/api-pricing
- https://www.alibabacloud.com/help/en/model-studio/qwen-flash
- https://www.facebook.com/fb-answers/alibaba-cloud-model-studio-qwen-pricing-per-million-tokens/
- https://kie.ai/blog/what-is-qwen3-8-flash
- https://www.alibabacloud.com/help/en/model-studio/token-plan-team-overview
- https://www.alibabacloud.com/help/en/agentcore/agentcore-billing-instructions
- https://www.alibabacloud.com/en/press-room/alibaba-cloud-introduces-new-pricing-strategy?_p_lc=1
- https://www.alibabacloud.com/help/en/express-connect/product-overview/outbound-data-transfer-fees
- https://wise.com/gb/blog/alibaba-cloud-pricing
- https://www.alibabacloud.com/blog/friday-blog---week-30---understanding-network-traffic-costs---part-2_598154
- https://help.aliyun.com/en/agent-sandbox/product-overview/billing-overview
- https://www.alibabacloud.com/help/en/hologres/product-overview/pay-as-you-go
- https://www.capterra.com.sg/software/203474/alibaba-cloud
- https://www.alibabacloud.com/help/en/cs/user-guide/agent-sandbox/
- https://www.alibabacloud.com/help/en/functioncompute/pay-as-you-go-of-fc-agent-sandbox
- https://www.agent37.com/pricing
- https://www.alibabacloud.com/help/en/functioncompute/billing-overview-of-fc-agent-sandbox
- https://help.aliyun.com/en/cs/product-overview/billing/
- https://northflank.com/blog/ai-sandbox-pricing
- https://fly.io/learn/ai-sandbox-pricing/
- https://createos.sh/vs/alibaba-ecs
- https://www.alibabacloud.com/help/en/pai/product-overview/billing-of-eas
- https://www.alibabacloud.com/en/product/function-compute?_p_lc=1
- https://www.alibabacloud.com/help/en/fc/product-overview/function-calculation-billing-item-price-reduction-notice
- https://platform.softwareone.com/product/alibaba-cloud-function-compute-fc/PCP-6226-8204
- https://alibaba-cloud.medium.com/how-to-use-function-compute-on-alibaba-cloud-9eccc33c4ae0
- https://www.alibabacloud.com/help/en/functioncompute/product-overview-fc/
- https://cloud.google.com/run/pricing
- https://www.alibabacloud.com/en/product/log-service/pricing?_p_lc=1
- https://www.alibabacloud.com/help/en/sls/what-is-log-service
- https://www.alibabacloud.com/en/product/log-service?_p_lc=1
- https://www.alibabacloud.com/help/en/sls/overview-11
- https://www.alibabacloud.com/help/en/sls/
- https://trendmicro.com/trendaivisiononecloudriskmanagement/knowledge-base/alibaba-cloud/AlibabaCloud-SLS/
- https://help.aliyun.com/en/sls/billable-items
- https://www.alibabacloud.com/help/en/sls/billing-per-amount-of-data-written
- https://www.alibabacloud.com/help/en/log-service/latest/billable-items
- https://www.devopsschool.com/tutorials/alibaba-cloud-simple-log-service-sls-tutorial-architecture-pricing-use-cases-and-hands-on-guide-for-migration-o-m-management/
- https://www.alibabacloud.com/help/en/api-gateway/cloud-native-api-gateway/product-overview/billing-overview
- https://www.alibabacloud.com/en/product/api-gateway?_p_lc=1
- https://www.alibabacloud.com/help/en/api-gateway/cloud-native-api-gateway/product-overview/what-is-cloud-native-api-gateway
- https://www.alibabacloud.com/help/en/api-gateway/product-overview/
- https://www.alibabacloud.com/blog/alibaba-cloud-ai-gateway-finops-features-officially-launched-%7C-making-every-tokens-consumption-visible-and-controllable_603282
- https://help.aliyun.com/en/api-gateway/ai-gateway/
- https://www.alibabacloud.com/blog/eight-common-application-scenarios-of-ai-gateways_602036
- https://next.api.alibabacloud.com/product/APIG
- https://www.alibabacloud.com/help/en/api-gateway/ai-gateway/product-overview/free-product-templates
- https://www.alibabacloud.com/help/en/milvus/product-overview/billing-item
- https://www.alibabacloud.com/en/product/milvus?_p_lc=1
- https://www.alibabacloud.com/help/en/milvus/getting-started/quickly-create-a-milvus-instance
- https://getdeploying.com/alibaba-cloud
- https://www.alibabacloud.com/help/es/doc-detail/2805954.html
- https://help.aliyun.com/en/milvus/product-overview/ai-center-billing
- https://www.alibabacloud.com/blog/602715
- https://airbyte.com/data-engineering-resources/milvus-database-pricing
- https://www.alibabacloud.com/help/en/agentcore/agentcore-billing-activation
- https://aws.amazon.com/bedrock/agentcore/pricing/
- https://www.alibabacloud.com/help/en/agentcore/agentcore-product-overview
- https://builder.aws.com/content/3KC60kJzFVDfHVxJ5CNecLZVPmA/amazon-bedrock-agentcore-pricing-hidden-costs-that-bill-while-your-agent-idles
- https://cloudburn.io/blog/amazon-bedrock-agentcore-pricing
- https://www.cipherprojects.com/blog/posts/amazon-bedrock-agentcore-pricing-2026/
- https://www.pump.co/blog/amazon-bedrock-agentcore/
- https://camelai.com/blog/camelrun-vs-aws-bedrock-agentcore
- https://help.aliyun.com/en/agentcore/agentcore-billing-instructions
- https://www.alibabacloud.com/help/en/emr/emr-serverless-spark/product-overview/cu-compute-resources-hybrid-billing
- https://www.alibabacloud.com/help/en/hologres/product-overview/subscription-1
- https://www.alibabacloud.com/help/en/eci/product-overview/elastic-container-instances
- https://www.alibabacloud.com/help/en/hologres/product-overview/billing-overview
- https://www.alibabacloud.com/help/en/maxcompute/view-billing-details
- https://www.alibabacloud.com/help/en/ga/pay-by-data-transfer-1/
- https://www.devzero.io/blog/ec2-instance-pricing
- https://help.aliyun.com/en/asm/product-overview/pricing/
- https://www.alibabacloud.com/help/en/api-gateway/cloud-native-api-gateway/product-overview/product-billing/
- https://help.aliyun.com/en/api-gateway/cloud-native-api-gateway/product-overview/billing-overview
- https://www.alibabacloud.com/help/en/api-gateway/cloud-native-api-gateway/product-overview/capacity-description
- https://aws.amazon.com/api-gateway/pricing/
- https://help.aliyun.com/en/functioncompute/pay-as-you-go-of-fc-agent-sandbox
- https://www.simular.ai/alternatives/cloud-computers-for-ai-agents
- https://www.alibabacloud.com/help/en/sls/billing-examples
- https://www.alibabacloud.com/help/en/sls/billing-items-in-the-pay-per-data-write-mode
- https://help.aliyun.com/en/sls/billing-items-in-the-pay-per-data-write-mode
- https://www.alibabacloud.com/help/en/document_detail/259690.html
- https://artificialanalysis.ai/models/qwen3-8-max/providers
- https://artificialanalysis.ai/
- https://qwen.ai/blog?id=qwen3.8
- https://artificialanalysis.ai/models/comparisons/qwen3-8-max-vs-qwen3-8-max-0803
- https://www.orcarouter.ai/blog/qwen-3-8-max-prime
- https://frenchcomplianceinstitute.com/blogs/news/qwen-3-8-max-zero-benchmarks
- https://www.reddit.com/r/LocalLLaMA/comments/1vqjeub/how_many_tokenssecond_output_are_you_getting_with/
- https://artificialanalysis.ai/models/comparisons/qwen3-8-27b-medium-vs-o3
- https://aireiter.com/blog/qwen3-8-max-0902-api
- https://artificialanalysis.ai/models/qwen3-8-flash-next/providers
- https://artificialanalysis.ai/models/comparisons/qwen3-8-flash-next-vs-ling-3-0-flash
- https://artificialanalysis.ai/models/comparisons/qwen3-8-flash-next-vs-qwen3-8-27b
- https://www.reddit.com/r/opencode/comments/1w0j8aj/qwen38flash_scored_a_56_on_the_artificial/
- https://news.ycombinator.com/item?id=50108293
- https://www.orcarouter.ai/blog/qwen-3-8-flash
- https://www.alibabacloud.com/help/en/functioncompute/billing-fc/
- https://www.alibabacloud.com/help/en/model-studio/embedding
- https://help.aliyun.com/en/model-studio/text-embedding-v4
- https://aimlapi.com/models/qwen-text-embedding-v4
- https://www.alibabacloud.com/help/en/model-studio/text-embedding-synchronous-api
- https://www.developersdigest.tech/blog/choosing-an-embedding-model-2026
- https://pecollective.com/tools/text-embedding-models-compared/
- https://costgoat.com/pricing/openai-embeddings
- https://www.alibabacloud.com/blog/how-alibaba-cloud-calculates-and-manages-llm-tokens_602565
- https://www.alibabacloud.com/help/en/model-studio/token-plan-personal-overview
- https://www.alibabacloud.com/blog/one-key-one-cli-%E2%80%94-manage-your-alibaba-cloud-model-studio-token-plan-from-terminal-or-ai-agent_603453
- https://www.alibabacloud.com/blog/model-studio-token-plan-for-individual-one-subscription-for-every-ai-model-up-to-3x-more-value_603426
- https://github.com/earendil-works/pi/issues/6850
- https://www.reddit.com/r/Qwen_AI/comments/1v2khid/anyone_using_alibabaqwens_18_token_plan_daily_how/
- https://qwen.readthedocs.io/en/latest/getting_started/concepts.html
- https://artificialanalysis.ai/models/comparisons/qwen3-8-2-4t-a95b-vs-qwen3-6-27b
- https://artificialanalysis.ai/models/comparisons/qwen3-8-27b-vs-minimax-m3
- https://artificialanalysis.ai/models/comparisons/qwen3-8-max-vs-qwen3-8-27b
- https://www.deeplearning.ai/the-batch/qwen3-8-max-lands-with-a-bang
- https://artificialanalysis.ai/methodology/performance-benchmarking
- https://www.orcarouter.ai/blog/qwen-3-8-27b-artificial-analysis
- https://www.anthropic.com/research/effective-context-engineering-for-ai-agents
- https://platform.claude.com/cookbook/tool-use-context-engineering-context-engineering-tools
- https://www.linkedin.com/posts/gauravj49_drugdiscovery-ai-llm-activity-7387771575443521536-OYs5
- https://medium.com/@pankaj_pandey/compaction-how-long-running-agents-beat-the-context-rot-problem-fc12d4cdeb7b
- https://www.youtube.com/watch?v=nkJXADeI62c
- https://newsletter.victordibia.com/p/context-engineering-101-how-agents
- https://www.morphllm.com/context-engineering
- https://www.ayautomate.com/blog/context-engineering
- https://www.alekseialeinikov.com/en/blog/topics/ai/context-engineering-2026-what-replaced-prompt-engineering
- https://arxiv.org/abs/2305.05176
- https://www.alphaxiv.org/abs/2305.05176
- https://www.reddit.com/r/singularity/comments/13dnfd7/frugalgpt_can_match_the_performance_of_the_best/
- https://getnadir.com/blog/frugalgpt-cascade-routing-implementation-tutorial/
- https://portkey.ai/blog/implementing-frugalgpt-smarter-llm-usage-for-lower-costs/
- https://frugalai.io/blog/frugalgpt-cascades-explained
- https://bdtechtalks.substack.com/p/cut-the-costs-of-gpt-4-by-up-to-98
- https://baobabtech.ai/posts/reducing-costs-associated-with-llm-use-in-ai-powered-applications
- https://arxiv.org/pdf/2305.05176
- https://huggingface.co/papers/2305.05176
- https://docs.langchain.com/langsmith/cost-tracking
- https://www.langchain.com/langgraph
- https://github.com/orgs/langfuse/discussions/7790
- https://www.activepieces.com/blog/langgraph-platform-pricing-plans-and-costs-in-2026
- https://www.truefoundry.com/blog/langgraph-pricing
- https://docs.agentops.ai/v2/integrations/langgraph
- https://www.zenml.io/blog/langgraph-pricing
- https://www.youtube.com/watch?v=1w5cCXlh7JQ
- https://medium.com/@o39joey/a-comprehensive-guide-to-langgraph-managing-agent-state-with-tools-ae932206c7d7
- https://www.linkedin.com/top-content/business-strategy/cost-reduction-techniques/token-cost-reduction-in-langgraph/
- https://www.alibabacloud.com/help/en/functioncompute/product-changes-changes-of-billable-items-resource-plans-and-trial-quota-of-function-compute
- https://www.alibabacloud.com/help/en/functioncompute/resource-plans-fc
- https://www.reddit.com/r/aws/comments/1ptjl4l/bedrock_agentcore_pricing_calculator_incorrect/
- https://akalcloud.ai/blog/bedrock-agentcore-pricing/
- https://www.alibabacloud.com/help/en/agentloop/product-overview/agentloop-billing-overview.md
- https://www.alibabacloud.com/help/en/agentloop/agentloop-billing-overview
- https://www.alibabacloud.com/help/en/agentloop/latest/agentloop-billing-overview
- https://www.alibabacloud.com/help/en/agentloop/agentloop-quickstart-whole-process-practice
- https://www.alibabacloud.com/en/pricing-calculator
- https://www.alibabacloud.com/blog/what-does-alibaba-clouds-agent-infra-look-like_603177
- https://www.alibabacloud.com/help/en/prometheus/product-overview/container-cluster-monitoring-pro-version-billing-rule
- https://www.alibabacloud.com/blog/what-is-the-newly-released-agentloop-by-alibaba-cloud_603378
- https://help.aliyun.com/en/cms/cloudmonitor-2-0/pay-by-volume-5
- https://www.alibabacloud.com/help/en/model-studio/text-embedding-v4
- https://www.alibabacloud.com/help/en/model-studio/text-embedding-v3
- https://www.alibabacloud.com/help/en/model-studio/vector-and-sort/
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/text-embedding-v3
- https://www.alibabacloud.com/help/en/model-studio/qwen3-rerank
- https://openrouter.ai/qwen/qwen3-reranker-8b
- https://www.alibabacloud.com/blog/mastering-text-embedding-and-reranker-with-qwen3_602308
- https://www.alibabacloud.com/notice/detail?_p_lc=1&id=1873
- https://flex.ai/models/qwen3-reranker-8b
- https://aihubmix.com/model/qwen3-reranker-8b
- https://www.alibabacloud.com/help/en/model-studio/deep-thinking
- https://github.com/lmstudio-ai/lmstudio-bug-tracker/issues/1990
- https://www.reddit.com/r/LocalLLaMA/comments/1vricem/qwen38_overthinks_similarly_alot_on_all_reasoning/
- https://discuss.vllm.ai/t/thinking-token-limit-setting/2400
- https://try-qwen-ai.com/features/qwen-deep-thinking-mode-explained/
- https://qwenlm.github.io/blog/qwen3/
- https://discuss.ai.google.dev/t/thinking-tokens-counted-but-billed-as-non-thinking/80697
- https://huggingface.co/Qwen/Qwen3-32B/discussions/21
- https://ofox.ai/docs/develop/models/qwen
- https://zolotukhin.ai/blog/2026-05-18-qwen3-thinking-budget-local-engines-still-fake/
- https://zenmux.ai/docs/guide/advanced/prompt-cache.html
- https://www.developersdigest.tech/blog/prompt-caching-across-ai-providers-2026
- https://www.morphllm.com/prompt-caching
- https://www.firecrawl.dev/blog/prompt-caching
- https://www.alibabacloud.com/en/product/directmail/pricing?_p_lc=1
- https://www.alibabacloud.com/help/en/direct-mail/billing-methods
- https://www.alibabacloud.com/en/product/directmail?_p_lc=1
- https://www.alibabacloud.com/help/en/direct-mail/email-sending-faqs
- https://www.alibabacloud.com/help/en/direct-mail/user-guide/dedicated-ip
- https://www.facebook.com/alibabacloud/posts/enjoy-6-months-of-alibaba-cloud-direct-mail-for-only-199-send-up-to-50-000-email/4179553802060546/
- https://sourceforge.net/software/compare/Alibaba-Cloud-Direct-Mail-vs-Amazon-SES/
- https://bravonet.digital/2024/04/11/best-flexibile-pricing-plan-smtp-service-provider-alibabacloud-direct-mail/
- https://www.alibabacloud.com/help/en/direct-mail/product-overview/limits
- https://www.devopsschool.com/tutorials/alibaba-cloud-direct-mail-tutorial-architecture-pricing-use-cases-and-hands-on-guide-for-enterprise-services-cloud-communication/
- https://www.alibabacloud.com/help/en/ack/ack-managed-and-ack-dedicated/product-overview/ack-pro-cluster-billing
- https://www.alibabacloud.com/en/product/kubernetes/pricing?_p_lc=1
- https://www.alibabacloud.com/help/en/ack/ack-managed-and-ack-dedicated/product-overview/cluster-management-fee
- https://help.aliyun.com/en/ack/ack-managed-and-ack-dedicated/product-overview/cluster-management-fee
- https://www.alibabacloud.com/en/product/kubernetes?_p_lc=1
- https://www.gartner.com/reviews/product/alibaba-cloud-container-service-for-kubernetes-ack
- https://www.alibabacloud.com/help/en/ack/ack-managed-and-ack-dedicated/user-guide/ack-cluster-overview/
- https://www.alibabacloud.com/help/en/ack/ack-managed-and-ack-dedicated/product-overview/resource-billing
- https://www.youtube.com/watch?v=JLdc4D9kAss
- https://www.cncf.io/blog/2019/12/12/demystifying-kubernetes-as-a-service-how-does-alibaba-cloud-manage-10000s-of-kubernetes-clusters/
- https://help.aliyun.com/en/functioncompute/faq-about-billing
- https://www.quora.com/What-is-Alibaba-Cloud-Function-Compute-2
- https://www.alibabacloud.com/help/en/sae/product-overview/billing-new
- https://faun.dev/toolbox/alibaba-cloud-function-compute-vs-aws-lambda/
- https://www.alibabacloud.com/help/en/model-studio/qwen3-8-max
- https://www.alibabacloud.com/help/en/model-studio/rate-limit
- https://www.facebook.com/alibabacloud/posts/qwen38-flash-is-now-available-in-the-european-union-on-alibaba-cloud-model-studi/1582315680607185/
- https://www.alibabacloud.com/blog/alibaba-releases-qwen3-8-flash-with-innovative-model-architecture-delivering-optimal-price-performance_603503
- https://www.requesty.ai/models/alibaba/qwen3.8-flash
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen3-8-flash
- https://www.layer3labs.io/guides/qwen3-8-max-pricing
- https://getdeploying.com/llms/qwen3.8-flash-next
- https://www.alibabacloud.com/help/en/model-studio/qwen3-7-plus
- https://openrouter.ai/qwen/qwen3.7-plus
- https://www.alibabacloud.com/blog/qwen3-7-plus-multimodal-agent-intelligence_603206
- https://trustedrouter.com/providers/alibaba
- https://help.aliyun.com/en/model-studio/new-free-quota
- https://www.reddit.com/r/opencode/comments/1vkamb2/outrageous_charging_by_alibaba_cloud_model_studio/
- https://www.alibabacloud.com/help/en/model-studio/new-free-quota-validity-adjustment
- https://x.com/konig0000/status/2100641615903907960
- https://puppyip.com/en/resources/alibaba-model-studio-free-quota-90-day-billing-guard-guide
- https://www.maximem.ai/blog/qwen-api-pricing-2026
- https://developers.llamaindex.ai/python/framework-api-reference/node_parsers/sentence_splitter/
- https://www.poma-ai.com/docs/optimal-chunker-llamaindex
- https://github.com/run-llama/llama_index/blob/main/llama-index-core/llama_index/core/node_parser/text/sentence.py
- https://llamaindexxx.readthedocs.io/en/latest/api/llama_index.core.node_parser.SentenceSplitter.html
- https://medium.com/@bavalpreetsinghh/llamaindex-chunking-strategies-for-large-language-models-part-1-ded1218cfd30
- https://stackoverflow.com/questions/77694999/llama-index-sentence-splitter-is-limited-by-metadata-length
- https://developers.llamaindex.ai/python/framework/module_guides/loading/node_parsers/modules/
- https://llamaindexhub.com/posts/llamaindex-chunk-size-best-practices/
- https://www.youtube.com/watch?v=Yfg2ms6wAuY
- https://developers.llamaindex.ai/python/framework/module_guides/loading/node_parsers/
- https://reference.langchain.com/python/langchain-text-splitters/character/RecursiveCharacterTextSplitter
- https://docs.langchain.com/oss/python/integrations/splitters/recursive_text_splitter
- https://docs.langchain.com/oss/python/integrations/splitters
- https://langchain-opentutorial.gitbook.io/langchain-opentutorial/07-textsplitter/02-recursivecharactertextsplitter
- https://github.com/LangChain-OpenTutorial/LangChain-OpenTutorial/blob/main/07-TextSplitter/02-RecursiveCharacterTextSplitter.ipynb
- https://dev.to/eteimz/understanding-langchains-recursivecharactertextsplitter-2846
- https://reference.langchain.com/python/langchain-text-splitters
- https://lagnchain.readthedocs.io/en/stable/modules/indexes/text_splitters/examples/recursive_text_splitter.html
- https://medium.com/data-and-beyond/text-splitters-in-langchain-for-data-processing-3a958eea2797
- https://www.kaggle.com/code/youssef19/documents-splitting-with-langchain
- https://www.anthropic.com/research/contextual-retrieval
- https://platform.claude.com/cookbook/capabilities-contextual-embeddings-guide
- https://www.youtube.com/watch?v=tmiBae2goJM
- https://medium.com/coinmonks/contextual-retrieval-anthropics-method-for-cutting-rag-failures-b28d98d57c48
- https://arxiv.org/html/2504.19754v1
- https://dev.to/gabrielanhaia/contextual-retrieval-in-80-lines-anthropics-chunk-prefix-trick-measured-on-your-docs-3350
- https://www.instagram.com/reel/DelvG9_k2oS/
- https://surrealdb.com/blog/what-is-the-recommended-chunk-size
- https://pub.towardsai.net/late-chunking-in-long-context-embedding-models-caf1c1209042
- https://aws.amazon.com/blogs/machine-learning/contextual-retrieval-in-anthropic-using-amazon-bedrock-knowledge-bases/
- https://community.openai.com/t/why-does-prompt-caching-requires-at-least-1024-tokens/1363167
- https://gingerlabs.ai/blog/openai-vs-anthropic-prompt-caching
- https://www.reddit.com/r/OpenAI/comments/1p85npp/i_tested_openais_prompt_caching_across_model/
- https://learn.microsoft.com/en-us/answers/questions/2244272/input-token-caching-poor-performance
- https://community.openai.com/t/is-it-possible-to-enable-prompt-caching-manually-for-prompts-with-less-than-1024-tokens/1026421
- https://medium.com/@michael.hannecke/prompt-caching-explained-what-it-is-what-it-isnt-and-when-to-use-it-9f5c6fce7bdb
- https://www.alibabacloud.com/help/en/model-studio/qwen3-8-flash
- https://www.facebook.com/alibabacloud/posts/qwen38-max-just-got-upgraded-meet-qwen38-max-090224t-parameters-1m-context-token/1525132512992169/
- https://www.alibabacloud.com/help/en/model-studio/qwen3-7-max
- https://help.aliyun.com/en/model-studio/qwen3-8-max
- https://click.alibabacloud.com/m/20000002957/
- https://www.alibabacloud.com/help/en/model-studio/qwen3-8-27b.md
- https://modal.com/blog/google-cloud-function-pricing-guide
- https://www.nops.io/blog/cloud-run-functions-pricing/
- https://aws.amazon.com/lambda/pricing/
- https://www.economize.cloud/blog/google-cloud-functions-pricing/
- https://help.aliyun.com/en/functioncompute/monitoring-data
- https://www.alibabacloud.com/help/en/agent-sandbox/view-resource-usage.md
- https://createos.sh/vs/alibaba-ack
- https://pinggy.io/blog/best_cloud_computers_for_ai_agents/
- https://milvus.io/blog/how-to-cut-vector-database-costs-by-up-to-80-a-practical-milvus-optimization-guide.md
- https://zilliz.com/pricing
- https://milvus.io/blog/announcing-milvus-3-lake-native-vector-search-and-a-more-powerful-retrieval-engine.md
- https://aws.amazon.com/marketplace/pp/prodview-iqbidum7feuio
- https://milvus.io/
- https://marketplace.microsoft.com/en-us/product/zillizinc1703056661329.zilliz_cloud
- https://cloudian.com/guides/ai-infrastructure/milvus-vector-database-uses-architecture-quick-tutorial/
- https://artificialanalysis.ai/models/qwen3-8-27b/providers
- https://deepinfra.com/blog/qwen3-8-27b-api-provider-benchmarks
- https://artificialanalysis.ai/models/creators/alibaba
- https://www.reddit.com/r/singularity/comments/1ve0hp7/qwen_38_max_benchmarks/
- https://artificialanalysis.ai/models/releases/qwen3-8-27b
- https://www.alibabacloud.com/blog/qwen3-8-flash-next-a-new-architecture-towardsultimate-cost-efficiency_603501
- https://openrouter.ai/qwen/qwen3.8-max-0902
- https://aihubmix.com/blog/free-qwen3-8-max-and-flash-api-on-aihubmix-limits-end-date-and-your-first-call
- https://www.datacamp.com/blog/qwen3-8-omni-flash
- https://whatllm.org/models/qwen3-8-max
- https://www.linkedin.com/pulse/qwen38-omni-flash-gap-between-open-weights-hosted-capabilities-da3hf
- https://www.alibabacloud.com/help/en/analyticdb/analyticdb-for-postgresql/product-overview/pricing-1
- https://www.alibabacloud.com/help/en/analyticdb/analyticdb-for-postgresql/product-overview/selection-of-instance-types-and-specifications
- https://www.alibabacloud.com/help/en/analyticdb/analyticdb-for-mysql/product-overview/pricing-of-enterprise-edition
- https://www.alibabacloud.com/help/en/analyticdb/analyticdb-for-postgresql/product-overview/billable-items
- https://www.alibabacloud.com/help/en/analyticdb/product-overview/product-overview-3
- https://www.bytebase.com/blog/postgres-hosting-options-pricing-comparison/
- https://www.alibabacloud.com/en/product/acs?_p_lc=1
- https://www.alibabacloud.com/help/en/cs/product-overview/product-billing-rules
- https://www.alibabacloud.com/help/en/cs/product-overview/product-introduction
- https://www.alibabacloud.com/blog/introducing-alibaba-cloud-container-compute-service-acs_602339
- https://platform.softwareone.com/product/container-compute-service-acs/PCP-7220-9952
- https://www.alibabacloud.com/help/en/cs/user-guide/acs-pod-instance-overview
- https://www.alibabacloud.com/blog/alibaba-cloud-ack-one-registered-clusters-support-acs-computing-power_602157
- https://www.alibabacloud.com/help/en/cs/
- https://walastech.com/internet-and-web/alibaba-cloud-unveils-new-serverless-container-compute-service-for-global-customers/
- https://help.aliyun.com/en/model-studio/qwen3-7-plus
- https://www.requesty.ai/models/alibaba/qwen3.7-max
- https://aimlapi.com/blog/qwen3-7-plus-the-complete-guide-to-alibabas-new-multimodal-agent-model
- https://venturebeat.com/technology/alibabas-qwen3-7-plus-supports-text-video-and-imagery-inputs-at-low-cost-of-0-4-1-6-per-1m-token-but-its-proprietary
- https://artificialanalysis.ai/models/qwen3-7-plus
- https://llm-stats.com/models/qwen3.7-plus
- https://zenmux.ai/qwen/qwen3.7-plus
- https://felloai.com/qwen-3-7-max-review/
- https://help.aliyun.com/en/model-studio/rate-limit
- https://www.alibabacloud.com/help/en/model-studio/cli/usage-quota.md
- https://www.reddit.com/r/Qwen_AI/comments/1se2p9r/guys_how_about_giving_us_a_paid_qwen_36_plus_api/
- https://www.eesel.ai/blog/qwen-pricing
- https://freellmapihub.com/p/alibaba-model-studio
- https://www.youtube.com/watch?v=7_Z0wgr-mjI
- https://www.tech42consulting.com/aws-agentcore-cost-calculator
- https://devopsity.com/blog/amazon-bedrock-agentcore-architecture-components-and-pricing/
- https://builder.aws.com/content/3DGqrMSRlS7leXjfoYUp9O80dDY/which-agent-is-costing-me-the-most-per-agent-cost-attribution-for-amazon-bedrock-agentcore
- https://rywalker.com/research/agentcore-code-interpreter
- https://www.agent37.com/blog/cheapest-sandbox-for-ai-agents
- https://www.alibabacloud.com/help/en/agent-sandbox/product-overview/agent-sandbox-overview
- https://help.aliyun.com/en/tablestore/product-overview/billable-items-and-billing-methods/
- https://www.alibabacloud.com/help/en/milvus/product-overview/ai-center-billing
- https://leanopstech.com/blog/milvus-zilliz-cloud-pricing-2026/
- https://milvus.io/blog/introduce-milvus-2-6-built-for-scale-designed-to-reduce-costs.md
- https://www.alibabacloud.com/en/product/tair?_p_lc=1
- https://www.alibabacloud.com/help/en/redis/product-overview/billable-items
- https://www.alibabacloud.com/blog/get-started-with-tair-semantic-caching-in-4-steps-stop-burning-money-on-repetitive-ai-queries_603502
- https://www.facebook.com/alibabacloud/posts/we-are-thrilled-to-announce-a-major-price-reduction-on-select-alibaba-cloud-data/1299849902187099/
- https://www.alibabacloud.com/blog/603603
- https://www.alibabacloud.com/help/en/redis/
- https://www.alibabacloud.com/en/product/databases?_p_lc=1
- https://www.instagram.com/p/DSY3_sHCeoh/
- https://help.aliyun.com/en/redis/product-overview/select-an-apsaradb-for-redis-instance
- https://www.alibabacloud.com/blog/what%E2%80%99s-a-vector-database-really-and-why-your-ai-stack-might-be-overcomplicated_602907
- https://ai-on-mac.com/articles/qwen3-8-max-pricing-benchmarks-mac-en/
- https://www.alibabacloud.com/product/model-studio
- https://cellcog.ai/blog/qwen3-8-max-0902/
- https://aireiter.com/blog/qwen3-8-max-api-pricing
- https://www.cometapi.com/qwen-3-8-max-api-pricing/
- https://zenmux.ai/qwen/qwen3.8-max
- https://notesbylex.com/qwen38-max
- https://www.developersdigest.tech/blog/qwen-3-8-max-release-2026
- https://dev.to/arshtechpro/qwen38-max-just-went-ga-a-developers-guide-to-alibabas-24t-model-ff3
- https://omidsaffari.com/blog/qwen-3-8-max-vs-claude-fable-5-1-for-coding-agents
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen3-8-max?ref=bobzhu.tech
- https://www.alibabacloud.com/help/en/serverless-workflow/latest/billing-billing
- https://www.sitepoint.com/community/t/how-to-use-alibaba-cloud-services-for-free-solved/307980
- https://www.news.climate.columbia.edu/cloud-computing-pricing-6b2249
- https://getdeploying.com/alibaba-cloud-vs-aws
- https://www.usage.ai/blogs/finops/tools/cloud-cost-optimization-by-country/
- https://picopublic.cloud/pricing/compare
- https://www.linkedin.com/pulse/what-makes-alibaba-clouds-newly-released-agentcore-q6q5e
- https://learn.microsoft.com/en-us/microsoft-copilot-studio/requirements-messages-management
- https://push-based.io/article/github-copilot-ai-credits-the-billing-change-developers-should-notice
- https://docs.github.com/copilot/concepts/billing/usage-based-billing-for-organizations-and-enterprises
- https://visualstudiomagazine.com/articles/2026/06/04/copilot-billing-shock-hits-developers.aspx
- https://www.digitalapplied.com/blog/github-copilot-ai-credits-billing-2026-cost-audit-playbook
- https://docs.gumloop.com/core-concepts/credits
- https://docs.replit.com/billing/ai-billing
- https://www.gapvelocity.ai/blog/github-copilots-new-usage-based-billing-what-changed-why-developers-are-upset-and-what-it-means
- https://www.scribd.com/document/623913655/Billing-Factor
- https://community.sap.com/t5/sap-for-utilities-discussions/billing-factor-and-conversion-factor/td-p/7663524
- https://sapisurdg.wordpress.com/2019/08/16/billing-factor/
- https://pchhealth.global/glossary/conversion-factor
- https://ccwlatam.cloud/en/Documentation/Views/S4HANA/UoMConversion/
- https://www.alibabacloud.com/help/en/milvus/product-overview/compute-node-specifications
- https://statusgator.com/services/alibaba-cloud/vector-retrieval-service-for-milvus
- https://help.aliyun.com/en/milvus/user-guide/use-the-mirroring-tool-to-migrate-data-to-alibaba-cloud-milvus
- https://www.alibabacloud.com/blog/alibaba-unveils-qwen3-8-max-its-largest-and-most-capable-flagship-model-to-date_603420
- https://vercel.com/ai-gateway/models/qwen3.8-max-0902
- https://www.alibabacloud.com/help/en/model-studio/newly-released-models
- https://geotoolbox.ai/blog/qwen3-8-max
- https://www.rfp.wiki/cloud-computing/serverless-computing-function-as-a-service/alibaba-function-compute/fastly
- https://registry.terraform.io/providers/aliyun/alicloud/latest/docs/resources/fc_function
- https://www.alibabacloud.com/help/en/maxcompute/user-guide/best-practices-for-elastically-reserved-cus
- https://getdeploying.com/alibaba-cloud-vs-wasabi
- https://help.aliyun.com/en/milvus/product-overview/comparison-between-alibaba-cloud-milvus-and-ecs-self-built-milvus
- https://www.alibabacloud.com/help/en/maxcompute/computing-pricing-pay-as-you-go
- https://www.alibabacloud.com/help/tr/agent-sandbox/product-overview/billing-overview
- https://www.alibabacloud.com/help/en/asc/product-overview/billing-overview
- https://www.alibabacloud.com/help/en/cen/product-overview/billing-rules
- https://www.alibabacloud.com/help/en/ecs/pay-as-you-go-1
- https://www.alibabacloud.com/help/en/agentbay/product-overview/agentbay-billing-instructions
- https://cloudpricecalculators.com/alibaba-calculator/
- https://docs.langchain.com/oss/python/langgraph/errors/GRAPH_RECURSION_LIMIT
- https://stackoverflow.com/questions/78337975/setting-recursion-limit-in-langgraphs-stategraph-with-pregel-engine
- https://reference.langchain.com/python/langchain-core/runnables/config/RunnableConfig/recursion_limit
- https://forum.langchain.com/t/how-to-set-recursion-limit-for-create-agent-v1/1905
- https://machinelearningplus.com/gen-ai/langgraph-cycles-recursion-limits-agent-loops/
- https://github.com/bytedance/deer-flow/issues/55
- https://theagentictribe.com/answers/langgraph-recursion-limit-25
- https://reference.langchain.com/python/deepagents-code/config_manifest/RECURSION_LIMIT_DEFAULT
- https://medium.com/fundamentals-of-artificial-intelligence/define-how-deep-your-langgraph-agent-should-think-0aca2acdaceb
- https://www.youtube.com/watch?v=HgRJ5LUC4XY
- https://developers.openai.com/api/docs/guides/reasoning
- https://developers.openai.com/api/docs/guides/latest-model
- https://community.openai.com/t/effort-minimal-is-this-lower-than-low/1358861
- https://docs.requesty.ai/features/reasoning
- https://community.openai.com/t/request-for-compatibility-matrix-reasoning-effort-sampling-parameters-across-gpt-5-series/1371738
- https://blog.promptlayer.com/gpt-5-api-features/
- https://community.openai.com/t/o1s-reasoning-effort-parameter/1062308
- https://reference.langchain.com/python/langchain-openai/chat_models/base/BaseChatOpenAI/reasoning_effort
- https://medium.com/@sudhanshupythonblogs/azure-openai-reasoning-effort-the-hidden-switch-for-better-ai-reasoning-746ce57e8533
- https://community.openai.com/t/whats-the-default-verbosity-and-reasoning-for-gpt-5-model/1357054
- https://openai.com/index/better-prompt-caching-for-gpt-6/
- https://community.openai.com/t/switching-to-gpt5-4-nano-results-in-0-cache-hit-rate/1379973
- https://community.openai.com/t/caching-is-borked-for-gpt-5-models/1359574
- https://x.com/OpenAIDevs/status/2102506476401258678
- https://community.openai.com/t/question-about-gpt-5-6-api-cache-read-write-token-billing/1386256
- https://www.pointfive.co/efficiency-hub/inefficiencies/low-prompt-cache-hit-rate-from-unstable-prompt-prefixes-in-the-openai-api
- https://community.openai.com/t/prompt-caching-returns-cached-tokens-0-intermittently-same-static-prefix-same-prompt-cache-key/1386029
- https://platform.claude.com/docs/en/about-claude/pricing
- https://www.truefoundry.com/blog/claude-prompt-caching-cost-math
- https://www.reddit.com/r/ClaudeAI/comments/1uih6w7/how_prompt_caching_works_in_claude_code_and_how/
- https://tensormesh.ai/learn/anthropic-prompt-caching-pricing/
- https://chudi.dev/blog/claude-prompt-caching-cost
- https://technspire.com/sv/blog/anthropic-prompt-caching-pricing-mechanics
- https://www.linkedin.com/posts/claudiu-calomfirescu_three-prompts-against-a-500k-token-session-activity-7496301827962044418-LWUP
- https://medium.com/@adnanmasood/prompt-caching-in-production-ai-systems-architecture-economics-and-governance-a907437dfd74
- https://tokencost.app/blog/prompt-caching-pricing-2026
- https://github.com/vllm-project/vllm/issues/17887
- https://qwen.ai/blog?id=qwen3-max-thinking
- https://www.alibabacloud.com/help/en/cdt/inter-region-data-transfers
- https://vendorbenchmark.com/vendors/alibaba-cloud-pricing
- https://www.alibabacloud.com/en/product/agentcore?_p_lc=1
- https://cloudburn.io/tools/amazon-bedrock-agentcore-pricing-calculator
- https://www.computelabs.ai/research/2026-09-27/alibaba-cloud-introduced-agentcore-other-agent-runtime-infrastructure-part
- https://www.alibabacloud.com/help/es/functioncompute/billing-overview-of-fc
- https://help.aliyun.com/en/milvus/product-overview/what-is-the-vector-retrieval-milvus-version
- https://www.businesswire.com/news/home/20260731560192/en/Zilliz-Announces-Milvus-3.0-Making-the-Worlds-Most-Adopted-Open-Source-Vector-Database-Lake-Native
- https://www.reddit.com/r/vectordatabase/comments/1gvjzp1/a_serverless_cloudbased_vector_database_powered/
- https://www.alibabacloud.com/blog/zero-code-transformation-making-the-ai-agent-sandbox-no-longer-a-black-box_603571
- https://www.alibabacloud.com/help/en/agent-sandbox/product-overview/limits-of-agent-sandbox
- https://medium.com/jin-system-architect/alibaba-cloud-may-not-be-selling-an-agent-builder-at-all-da8012e939c3
- https://help.aliyun.com/en/model-studio/qwen3-8-flash
- https://www.youtube.com/watch?v=uCwvj3P3P9U
- https://www.reddit.com/r/LocalLLM/comments/1w4fc3g/is_qwen38_27b_more_powerful_than_qwen38_flash_im/
- https://benchlm.ai/models/qwen3-8-flash-next
- https://medium.com/data-science-collective/qwen3-8-flash-next-on-strata-which-quant-to-run-from-16gb-to-128gb-in-2026-843778d218a1
- https://northflank.com/blog/qwen3-8-27b-performance-benchmarks-gpu-requirements-and-how-to-run-it
- https://www.mindstudio.ai/blog/qwen-3-8-flash-next-strata-1000-build
- https://docs.aws.amazon.com/bedrock/latest/userguide/capacity-limits-cost-optimization.html
- https://www.linkedin.com/pulse/multimodal-batch-inference-amazon-bedrock-anthropic-claude-stafford-v0xkc
- https://wring.co/blog/aws-bedrock-batch-inference-guide
- https://intuitionlabs.ai/articles/batch-ai-processing-cost-turnaround
- https://help.aliyun.com/en/model-studio/batch-inference
- https://www.alibabacloud.com/help/en/model-studio/batch-interfaces-compatible-with-openai
- https://www.antsplatform.ai/docs/batch-inference/provider-limits
- https://www.digitalocean.com/community/conceptual-articles/cheapest-batch-inference-for-low-cost-ai-inference
- https://repost.aws/questions/QUGscKFYUFR62AHArY1V_cGQ/aws-bedrock-claude-batch-document-upload-size-limit
- https://www.alibabacloud.com/blog/603415
- https://www.facebook.com/alibabacloud/posts/-ai-gateway-now-supports-credits-based-metering-quotas-unified-metric-cross-mode/1499055908933163/
- https://www.alibabacloud.com/help/en/api-gateway/ai-gateway/user-guide/ai-fallback
- https://www.linkedin.com/posts/alibaba-cloud-computing-company_aigateway-llmops-finops-activity-7490325320428978177-fBRU
- https://www.alibabacloud.com/help/en/well-architected/stabilizing-pillar
- https://www.reddit.com/r/opencodeCLI/comments/1rre4by/escaping_antigravitys_quota_hell_opencode_go/
- https://help.aliyun.com/en/api-gateway/consumer-quotas-management
- https://chakray.com/token-economics-ia/
- https://help.aliyun.com/en/agentrun/what-is-agentrun
- https://gist.github.com/digitalknk/ec360aab27ca47cb4106a183b2c25a98
- https://www.alibabacloud.com/help/doc-detail/3049280.html
- https://theagentrouter.ai/docs/capabilities/traffic/quota-policy/
- https://intl.cloud.baidu.com/en/article/9157421
- https://docs.uipath.com/agents/automation-cloud/latest/user-guide/licensing
- https://www.mindstudio.ai/blog/ai-agent-token-cost-optimization-multi-model-routing
- https://adp.tencentcloud.com/en/blog/enterprise-token-economics-agent-cost-optimization
- https://docs.openclaw.ai/reference/token-use
- https://discuss.ai.google.dev/t/has-anyone-gotten-implicit-caching-to-work/142699
- https://www.facebook.com/groups/claudecowork/posts/1355530472623451/
- https://developers.googleblog.com/gemini-2-5-models-now-support-implicit-caching/
- https://github.com/vercel/ai/issues/11513
- https://www.rfp.wiki/cloud-computing/serverless-computing-function-as-a-service/alibaba-function-compute
- https://vercel.com/changelog/function-invocations-now-billed-per-unit
- https://spendark.com/calculator/serverless/
- https://help.aliyun.com/en/functioncompute/what-is-function-compute
- https://www.alibabacloud.com/help/en/user-center/bill-view
- https://help.aliyun.com/en/document-mind/product-overview/pay-as-you-go
- https://www.alibabacloud.com/help/en/user-center/bill-solution-troubleshooting-manual-for-common-consumer-bill-questions
- https://www.alibabacloud.com/help/en/ga/billing-overview
- https://www.alibabacloud.com/help/en/cms/product-overview/pay-as-you-go-1
- https://www.digitalapplied.com/blog/alibaba-opensandbox-open-source-ai-agent-execution
- https://upstash.com/blog/ai-agent-sandbox-providers-compared-2026
- https://spjosyula2005.medium.com/the-science-of-chunking-why-your-rag-systems-success-lives-and-dies-here-2b3e3b50f676
- https://www.reddit.com/r/Rag/comments/1vqg8jh/anthropic_contextual_retrieval/
- https://www.linkedin.com/posts/shirin-khosravi-jam_anthropic-just-cut-rag-retrieval-failures-activity-7381949982725185536-_E99
- https://thepromptbench.com/rag-and-retrieval/chunking-strategies-explained/
- https://pub.towardsai.net/the-chunking-dilemma-why-rag-fails-before-retrieval-even-starts-ed5c83adaf07
- https://www.alibabacloud.com/blog/qwen3-8-max-a-new-bar-for-coding-and-cowork_603421
- https://zenmux.ai/qwen/qwen3.8-max-0902
- https://www.datacamp.com/blog/qwen3-8-max
- https://www.alibabacloud.com/blog/603463
- https://artificialanalysis.ai/models/comparisons/qwen3-8-flash-next-vs-qwen3-7-plus
- https://artificialanalysis.ai/models/qwen3-6-plus/providers
- https://artificialanalysis.ai/models/comparisons/qwen3-7-plus-vs-qwen3-7-max
- https://www.reddit.com/r/LocalLLaMA/comments/1tie6gy/qwen37_max_scored_by_artificial_analysis_27b35b/
- https://artificialanalysis.ai/models/comparisons/qwen3-8-27b-low-vs-qwen3-7-plus
- https://www.i-scoop.eu/qwen-3-7-max-review/
- https://ai.google.dev/gemini-api/docs/rate-limits
- https://github.com/openclaw/openclaw/issues/5744
- https://www.reddit.com/r/GeminiAI/comments/1oj0rx3/gemini_api_new_rate_limits_for_free_tier/
- https://support.google.com/gemini/thread/400904312/rate-limits-gemini-flash-3-0-and-2-5?hl=en
- https://medium.com/@entekumejeffrey/bypassing-gemini-api-rate-limits-with-smart-key-rotation-in-next-js-8acdee9f9550
- https://aistudio.google.com/docs/rate-limits
- https://www.layer3labs.io/guides/qwen-3-8-limits
- https://fast.io/resources/vertex-ai-rate-limit/
- https://www.upskillscore.com/en-US/guides/system-design/genai-anthropic-multi-agent
- https://www.zenml.io/llmops-database/building-a-multi-agent-research-system-for-complex-information-tasks
- https://www.centific.com/blog/anthropic-s-multi-agent-research-system-raises-the-bar-for-open-ended-ai-reasoning
- https://ai.plainenglish.io/how-we-built-our-multi-agent-research-system-5f5e10b2a8d6
- https://www.linkedin.com/top-content/artificial-intelligence/ai-agent-system-fundamentals/parallel-ai-agent-research-setup/
- https://www.virtasant.com/ai-today/why-multi-agent-ai-beat-a-single-agent-by-90-at-anthropic
- https://www.augmentcode.com/guides/multi-agent-cost-compounding
- https://www.facebook.com/groups/claudecommunity/posts/1007443295129669/
- https://x.com/codingscape/status/1937503477971697684
- https://www.cloudzero.com/blog/ai-agent-cost/
- https://www.spendline.ai/guides/what-an-ai-agent-run-costs/
- https://arxiv.org/html/2406.18665v4
- https://www.lmsys.org/blog/2024-07-01-routellm/
- https://www.youtube.com/watch?v=FvLhVe9gBhI
- https://www.pondhouse-data.com/blog/saving-costs-with-llm-routing
- https://github.com/lm-sys/routellm
- https://proceedings.iclr.cc/paper_files/paper/2025/hash/5503a7c69d48a2f86fc00b3dc09de686-Abstract-Conference.html
- https://gaodalie.substack.com/p/routellm-how-i-route-to-the-best
- https://sky.cs.berkeley.edu/project/routellm/
- https://gingerlabs.ai/blog/routellm-vs-vllm-semantic-router
- https://zilliz.com/learn/routellm-open-source-framework-for-navigate-cost-quality-trade-offs-in-llm-deployment
- https://www.alibabacloud.com/help/en/model-studio/qwen-api-via-openai-responses
- https://www.alibabacloud.com/help/en/model-studio/faq-about-alibaba-cloud-model-studio
- https://www.alibabacloud.com/help/en/model-studio/compatibility-with-openai-responses-api
- https://ai-sdk.dev/providers/ai-sdk-providers/alibaba
- https://www.alibabacloud.com/help/fr/model-studio/rate-limit
- https://www.alibabacloud.com/help/en/model-studio/rate-limiting-best-practices
- https://artificialanalysis.ai/models/releases/comparisons/gemini-3-8-flash-vs-qwen3-8-27b
- https://artificialanalysis.ai/models/qwen3-5-omni-flash/providers
- https://www.alibabacloud.com/help/en/agentrun/start-using/
- https://alibaba-cloud.medium.com/alibaba-cloud-savings-plans-cost-optimization-provided-by-cloud-native-c09f6495d1a5
- https://help.aliyun.com/en/analyticdb/analyticdb-for-postgresql/product-overview/billable-items
- https://cloud.google.com/alloydb/pricing
- https://aws.amazon.com/rds/aurora/pricing/
- https://neon.com/faqs/serverless-database-services-postgres-charge-per-second
- https://www.srvrlss.io/reference/database-pricing/
- https://cloudburn.io/tools/amazon-aurora-pricing-calculator
- https://www.alibabacloud.com/help/en/security-center/billing/
- https://www.alibabacloud.com/help/en/ecs/billing-overview
- https://www.alibabacloud.com/help/en/user-center/product-overview/quickly-understand-alibaba-cloud-billing
- https://www.alibabacloud.com/help/en/cms/cloudmonitor-1-0/product-overview/billing-overview
- https://www.alibabacloud.com/help/en/model-studio/bill-query-and-cost-management
- https://help.aliyun.com/en/model-studio/bill-query-and-cost-management
- https://www.alibabacloud.com/help/en/user-center/cost-breakdown
- https://stackoverflow.com/questions/63952017/alibaba-cloud-how-to-get-usage-details-including-price-through-api
- https://milvus.io/api-reference/pymilvus/v3.0.x/MilvusClient/Vector/query.md
- https://www.alibabacloud.com/help/en/api-gateway/ai-gateway/product-overview/serverless-old-billing-details
- https://www.quora.com/What-does-it-really-cost-to-run-an-API-on-AWS-Lambda-and-API-Gateway-and-when-does-it-make-sense-to-switch-to-hosting-your-own-server
- https://api7.ai/blog/pricing-model-comparison-for-api-gateways
- https://aws.amazon.com/eventbridge/pricing/
- https://www.cloudzero.com/blog/aws-eventbridge-pricing/
- https://www.alibabacloud.com/help/en/eventbridge/product-overview/billing-overview
- https://cloudburn.io/blog/amazon-eventbridge-pricing
- https://www.alibabacloud.com/en/product/eventbridge?_p_lc=1
- https://awsfundamentals.com/blog/aws-eventbridge-pricing-guide
- https://www.nops.io/blog/understanding-aws-eventbridge-basics-benefits-and-use-cases/
- https://hykell.com/uncategorized/aws-eventbridge-pricing-and-cost-management/
- https://wring.co/blog/aws-eventbridge-pricing-guide
- https://www.alibabacloud.com/help/en/eventbridge/product-overview/billing-of-event-buses
- https://www.reddit.com/r/LocalLLaMA/comments/1wi0dme/qwen38_max_0902_scores_45_on_the_artificial/
- https://www.reddit.com/r/AISEOInsider/comments/1w6tvwz/qwen_38_max_0902_is_scary_good_for_ai_agents/
- https://developer.puter.com/ai/qwen/qwen3.8-max-0902/
- https://www.orcarouter.ai/blog/qwen-3-8-max-review
- https://medium.com/@ibokkon/qwen3-8-max-0902-the-upgrade-behind-a-familiar-api-name-8dd2fe36dcd3
- https://opencode.ai/data/compare/alibaba/qwen3-8-max/alibaba/qwen3-8-max-0902
- https://www.deeplearning.ai/the-batch/qwen3-7-max-adds-speed-and-power
- https://www.alibabacloud.com/en/product/oss/pricing?_p_lc=1
- https://www.alibabacloud.com/en/product/oss-pricing-list/en?_p_lc=1
- https://www.alibabacloud.com/help/en/oss/user-guide/what-is-oss
- https://www.alibabacloud.com/help/en/oss/storage-fees
- https://help.aliyun.com/en/oss/billing-overview
- https://www.alibabacloud.com/help/en/oss/user-guide/overview-53/
- https://www.zhihu.com/en/answer/3360465465
- https://www.trustradius.com/compare-products/alibaba-cloud-object-storage-service-oss-vs-amazon-s3-simple-storage-service
- https://www.alibabacloud.com/en/product/object-storage-service?_p_lc=1
- https://www.enterprisestorageforum.com/products/alibaba-cloud-storage/
- https://www.alibabacloud.com/help/en/model-studio/rag-knowledge-base
- https://www.alibabacloud.com/help/en/model-studio/build-knowledge-base-qa-assistant-without-coding
- https://www.alibabacloud.com/help/en/pai/knowledge-base-management
- https://www.alibabacloud.com/blog/building-a-rag-pipeline-on-alibaba-cloud-with-vector-search_603155
- https://www.alibabacloud.com/blog/setting-up-an-ai-chatbot-for-marketing-automation-with-alibaba-cloud-model-studio_603115
- https://help.aliyun.com/en/model-studio/knowledge-base/
- https://www.alibabacloud.com/blog/prompt-rag-or-fine-tune-a-decision-guide-priced-in-dollars_603615
- https://vstorm.co/llamaindex/top-10-document-parsing-services-for-rag-pipelines-and-llm-applications/
- https://medium.com/ai-software-engineer/anthropic-just-solved-ai-agent-bloat-150k-tokens-down-to-2k-code-execution-with-mcp-8266b8e80301
- https://www.reddit.com/r/mcp/comments/1opdykn/is_anthropic_code_execution_with_mcp_as_big_or/
- https://www.linkedin.com/posts/raphaelmansuy_anthropic-code-execution-with-mcp-building-activity-7391731593679118337-0yt-
- https://www.anthropic.com/research/advanced-tool-use
- https://levelup.gitconnected.com/why-code-execution-is-eating-tool-registries-a422440be9d4
- https://www.youtube.com/watch?v=CT4WfKEQY6M
- https://gregshevchenko.com/research/mcp-stack-token-economy/
- https://arxiv.org/html/2602.15945v1
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/code-execution-tool
- https://www.scalekit.com/blog/token-efficient-tool-calling
- https://www.anthropic.com/research/writing-tools-for-agents
- https://www.youtube.com/watch?v=R7OCrqyGMeY
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview
- https://cobusgreyling.substack.com/p/the-new-claude-think-tool-from-anthropic
- https://pub.towardsai.net/ai-agents-skills-hooks-tool-standards-acdda0510a68
- https://www.reddit.com/r/LLMDevs/comments/1nfg54u/how_to_write_effective_tools_for_agents_from/
- https://techwithibrahim.medium.com/writing-effective-tools-for-ai-agents-production-lessons-from-anthropic-99ea76a7fcf0
- https://www.linkedin.com/posts/anthropicresearch_writing-effective-tools-for-ai-agentsusing-activity-7372002018103734272-YHWQ
- https://openai.github.io/openai-agents-js/guides/running-agents/
- https://openai.github.io/openai-agents-python/running_agents/
- https://medium.com/@abdulkabirlive1/mastering-the-runner-class-in-the-openai-agents-sdk-901cc55d8709
- https://niteagent.com/blog/2026-07-08-openai-agents-sdk-production-guide/
- https://community.openai.com/t/fyi-openai-guardrails-sdk-preview/1362076
- https://runcycles.io/blog/openai-agents-sdk-has-guardrails-for-content-but-nothing-for-actions
- https://openai.github.io/openai-agents-python/ref/run/
- https://github.com/openai/openai-agents-python/issues/551
- https://blog.stackademic.com/openai-agents-sdk-ii-15a11d48e718
- https://www.youtube.com/watch?v=-ROpc8jXYig
- https://dstack.ai/blog/qwen38-flash-next-coding-agents/
- https://www.alibabacloud.com/help/en/model-studio/tpm-reservation-billing
- https://www.alibabacloud.com/blog/alibaba-cloud-introduces-new-pricing-strategy-and-service-availability-for-international-customers_601016
- https://cloudinsight.cc/en/blog/tencent-vs-alibaba-cloud-comparison
- https://www.vpsbenchmarks.com/instance_types/alibaba_cloud
- https://www.alibabacloud.com/en/product/content-delivery-network/pricing?_p_lc=1
- https://mofcloud.com/tools/servers
- https://www.alibabacloud.com/help/en/eventbridge/product-overview/what-is-eventbridge
- https://alibaba-cloud.medium.com/alibaba-cloud-releases-eventbridge-to-support-cloud-native-architecture-2b304f2bcede
- https://www.alibabacloud.com/help/en/model-studio/model-usage-statistics
- https://www.alibabacloud.com/help/en/model-studio/savings-plan-and-resource-package
- https://www.alibabacloud.com/blog/the-consumption-of-tokens-by-large-models-can-be-quite-ambiguous_602097
- https://www.artefact.com/blog/is-ai-really-getting-cheaper-the-token-cost-illusion/
- https://developer.microsoft.com/blog/not-all-model-upgrades-are-upgrades/
- https://code.claude.com/docs/en/costs
- https://help.mypurecloud.com/articles/genesys-cloud-tokens-model
- https://blog.box.com/ai-consumption-based-pricing-explained
- https://www.mindstudio.ai/blog/token-efficiency-vs-raw-intelligence-gpt-5-6-vs-fable-5
- https://www.centific.com/blog/ai-token-consumption-costs
- https://www.alibabacloud.com/help/en/model-studio/model-training-and-deployment-billing
- https://www.alibabacloud.com/help/en/model-studio/ptu-long-input-and-cache
- https://help.aliyun.com/en/model-studio/tpm-reservation-billing
- https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/provisioned-throughput
- https://x.com/dani_avila7/status/1993134510364389555
- https://workos.com/blog/mcp-server-token-cost
- https://medium.com/@DebaA/anthropic-just-shipped-the-fix-for-tool-definition-bloat-77464c8dbec9
- https://www.metacto.com/blogs/anthropic-api-pricing-a-full-breakdown-of-costs-and-integration
- https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-anthropic-claude-messages-tool-use.html
- https://pub.towardsai.net/ai-agent-revolution-how-anthropic-cut-token-usage-by-98-with-code-execution-e276c9570bf0
- https://www.facebook.com/groups/aimlmalaysia/posts/2516181715448714/
- https://drlee.io/stop-bleeding-tokens-how-code-execution-with-mcp-cuts-your-ai-agent-costs-by-98-ccd7d1c7c15b
- https://www.linkedin.com/posts/gaurav-jadhao-b7258a52_mcp-aiagents-tokenoptimization-activity-7393878903905325056-JJnN
- https://sandboxer.com/compare/alibaba-cloud-agent-sandbox
- https://ordwaylabs.com/blog/ai-token-limits/
- https://platform.claude.com/docs/en/api/rate-limits
- https://www.stigg.io/blog-posts/ai-pricing
- https://www.mindstudio.ai/blog/token-based-pricing
- https://www.solvimon.com/glossary/ai-token-pricing
- https://www.alibabacloud.com/help/en/model-studio/workflow-application
- https://help.aliyun.com/en/model-studio/faq-about-alibaba-cloud-model-studio
- https://aicostbudget.com/en/providers/alibaba-qwen-api-pricing
- https://www.devopsschool.com/tutorials/alibaba-cloud-model-studio-tutorial-architecture-pricing-use-cases-and-hands-on-guide-for-ai-machine-learning/
- https://www.alibabacloud.com/blog/alibaba-cloud-open-sources-loongsuite-crafting-a-high-performance-low-cost-observable-data-collection-suite-for-the-ai-era_602489
- https://itnext.io/the-mcp-revolution-transforming-agents-with-mcp-2f053da01e8c
- https://fast.io/resources/cursor-model-limits/
- https://thursdai.news/topics/agents
- https://github.com/VILA-Lab/Dive-into-Claude-Code/blob/main/docs/agent-design-space-source-notes.md
- https://www.reddit.com/r/ClaudeCode/comments/1qz8tyy/how_to_set_up_claude_code_agent_teams_full/
- https://devblogs.microsoft.com/blog/tag/mcp/feed
- https://medium.com/@anyuanay/what-is-a-generative-ai-agent-really-22d03d113971
- https://www.mindstudio.ai/blog/claude-code-ultra-code-mode-deep-research-complex-tasks
- https://mastra.ai/articles/best-ai-agents
- https://help.aliyun.com/en/model-studio/model-training-and-deployment-billing
- https://www.alibabacloud.com/help/en/model-studio/model-deployment-introduction
- https://modelavailability.com/tools/azure-ptu-calculator
- https://www.youtube.com/watch?v=XLXHEPqnwUM
- https://www.alibabacloud.com/help/en/model-studio/model-deployment-quick-start.md
- https://deploybase.ai/articles/azure-openai-pricing
- https://www.nops.io/blog/azure-ai-foundry-pricing/
- https://www.reddit.com/r/baba/comments/1c06dik/alibaba_cloud_slashes_prices_as_it_looks_to_boost/
- https://help.aliyun.com/en/pai/product-overview/ai-computing-resource-billing-description
- https://www.alibabacloud.com/help/en/pai/product-overview/ai-computing-resource-billing-description
- https://billing-cost.console.aliyun.com/expense-manage/cost-summary
- https://api.alibabacloud.com/api/BssOpenApi/2023-09-30/CreateCostCenter
- https://www.alibabacloud.com/help/en/functioncompute/instance-types-and-specifications
- https://www.alibabacloud.com/en/product/edge-node-service/pricing?_p_lc=1
- https://www.alibabacloud.com/help/en/cloud-box/product-overview/computing-resources
- https://www.alibabacloud.com/help/en/ecs/user-guide/overview-of-instance-families
- https://neomanex.com/news/qwen3-8-max-conditional-published-pricing
- https://www.aipricing.guru/models/alibaba-qwen3-8-flash/
- https://qwen.ai/blog?id=qwen3.8-omni-flash
- https://tech-insider.org/how-to-use-qwen3-8-flash-api-2026/
- https://teamorouter.com/blogs/qwen3-8-max-api
- https://www.alibabacloud.com/en/solutions/generative-ai/qwen?_p_lc=1
- https://www.alibabacloud.com/help/en/agentrun/llms.txt
- https://cdk.alibabacloud.com/go/ROS-CDK-ecs/Datasource/Protocols/IInstance/
- https://help.aliyun.com/en/functioncompute/using-sandbox-agent-skills-in-beta
- https://www.alibabacloud.com/blog/ai-t%E1%BA%A1o-sinh-tr%C3%AAn-alibaba-cloud---ph%E1%BA%A7n-1-iaas_601549
- https://www.alibabacloud.com/blog/langkah-langkah-penggunaan-llama2-sebagai-large-language-model-llm-dan-vectordb-analyticdb-di-alibaba-cloud_600284
- https://sandboxer.com/compare/islo
- https://podcasts.getpagespeed.com/the-stack/
- https://getdeploying.com/alibaba-cloud-vs-microsoft-azure
- https://guptadeepak.com/ai-models/qwen/qwen3-8-flash/
- https://www.digitalapplied.com/blog/qwen3-8-omni-flash-omnimodal-agents-audio-video-cost
- https://huggingface.co/Qwen/Qwen3.8-Flash-Next
- https://www.aipricing.guru/news/qwen3-8-flash-next-api-pricing-august-2026/
- https://www.mindstudio.ai/blog/ai-model-pricing-sonnet-5-costs-more-than-opus-agents
- https://www.developersdigest.tech/blog/claude-code-token-overhead-opencode-comparison
- https://help.aliyun.com/en/model-studio/token-plan-team-overview
- https://larridin.com/blog/ai-agent-context-accumulation-cost
- https://www.augmentcode.com/guides/ai-model-routing-guide
- https://code.visualstudio.com/blogs/2026/06/17/improving-token-efficiency-in-github-copilot?wt.mc_id=developermscom
- https://launchdarkly.com/blog/llm-pricing-comparison/
- https://www.intercom.com/pricing
- https://www.reddit.com/r/customerexperience/comments/1ly3qaj/what_are_you_paying_per_month_for_ai_support/
- https://www.intercom.com/help/en/articles/8205718-fin-ai-agent-outcomes
- https://fin.ai/pricing
- https://www.intercom.com/help/en/articles/9061614-fin-and-intercom-plans-explained
- https://www.gptbots.ai/blog/intercom-fin-pricing
- https://www.featurebase.app/blog/intercom-pricing
- https://www.intercom.com/pricing/calculator
- https://sitegpt.ai/blog/intercom-fin-ai-review
- https://myaskai.com/compare/intercom-vs-zendesk-ai-pricing
- https://iternal.ai/token-usage-guide
- https://www.youtube.com/watch?v=ZUCVRppXPSc
- https://neuraltrust.ai/blog/ai-token-optimization-guide
- https://www.silicondata.com/blog/llm-cost-per-token
- https://direct.mit.edu/tacl/article/doi/10.1162/tacl_a_00747/128941/How-Much-Semantic-Information-is-Available-in
- https://live.paloaltonetworks.com/t5/engineering-blogs/tracking-llm-token-usage-across-providers-teams-and-workloads/ba-p/1265321
- https://www.honeycomb.io/resources/getting-started/how-to-track-token-cost-across-llm-workflows
- https://arxiv.org/html/2605.09104v1
- https://nebius.com/blog/posts/what-is-token-in-ai
- https://www.spheron.network/blog/agentic-ai-inference-cost-2026/
- https://arxiv.org/html/2604.22750v2
- https://www.mintmcp.com/blog/ai-agent-cost
- https://www.cockroachlabs.com/blog/agentic-ai-costs-at-scale/
- https://greensoftware.foundation/articles/tokens-and-greens-measuring-the-impacts-of-agentic-ai/
- https://digitaleconomy.stanford.edu/news/how-are-ai-agents-spending-your-tokens/
- https://www.doit.com/blog/cost-per-task-vs-cost-per-token
- https://digitaleconomy.stanford.edu/publication/how-do-ai-agents-spend-your-money-analyzing-and-predicting-token-consumption-in-agentic-coding-tasks/
- https://arxiv.org/html/2604.22750v3
- https://www.linkedin.com/posts/jiaxin-pei-632b07147_why-are-ai-agents-so-expensive-do-more-tokens-activity-7455300849523740672-PC8i
- https://www.reddit.com/r/ClaudeWorkflows/comments/1wb8t5b/workflow_token_efficiency_best_practices_for_llm/
- https://www.flowstate.inc/en-us/insights/will-hackett/agent-token-consumption/
- https://coralogix.com/ai-blog/token-efficiency/
- https://www.reddit.com/r/AI_Agents/comments/1jugj0e/we_reduced_token_usage_by_60_using_an_agentic/
- https://www.nops.io/blog/token-economics/
- https://www.linkedin.com/pulse/what-token-usage-agentic-ai-agent-engineering-jon-barrett-rca2e
- https://codesignal.com/learn/courses/behavioral-benchmarking-of-llms/lessons/measuring-and-interpreting-token-usage-in-llms
- https://www.cloudkeeper.com/insights/blog/beginners-guide-ai-token-optimization-aiml-teams
- https://fireworks.ai/blog/agent-environments-tokens-per-day
- https://www.cloudzero.com/blog/cost-per-ai-outcome/
- https://www.cloudzero.com/blog/ai-cost-per-query/
- https://www.spheron.network/blog/ai-agent-cost-calculator-2026/
- https://www.cloudzero.com/blog/agentic-ai-cost/
- https://www.agenticwire.news/article/ai-agent-cost-per-successful-task
- https://wiredwhite.com/calcs/ai-agent-cost-calculator-per-run-month-and-successful-task/
- https://www.sybill.ai/blogs/how-much-do-ai-agents-cost
- https://openclawdc.com/blog/ai-agent-cost-per-task/
- https://arxiv.org/abs/2604.22750
- https://arxiv.org/pdf/2604.22750
- https://arxiv.org/html/2604.22750v1
- https://openreview.net/forum?id=1bUeVB3fov
- https://longjubai.github.io/agent_token_consumption/
- https://www.linkedin.com/posts/wheijstek_why-do-agents-burn-through-so-many-more-tokens-activity-7488167266036084736-f8ky
- https://www.alibabacloud.com/help/en/dataworks/dataworks-data-agent-agent-billing
- https://help.aliyun.com/en/model-studio/managed-agents-billing
- https://www.alibabacloud.com/help/en/agentrun/api-agentrun-2025-09-10-struct-agentruntime.md
- https://www.datacamp.com/tutorial/cline-vs-cursor
- https://o-mega.ai/articles/top-10-bolt-new-alternatives-2026
- https://getburnrate.io/blog/flat-rate-ai-coding-subscription-dead-anthropic-pricing-test
- https://github.com/github/copilot-cli/blob/main/changelog.md?ref=apifox.com
- https://stochasticsandbox.com/posts/llm-encyclopedia-2026-06-20/
- https://noise.getoto.net/tag/amazon-bedrock/
- https://news.ycombinator.com/item?id=43683410
- https://buttondown.com/ainews/archive/ainews-claude-37-sonnet/
- https://help.aliyun.com/en/dataworks/view-bill-details
- https://www.vpsbenchmarks.com/compare/alibaba_cloud_vs_microsoft_azure
- https://www.alibabacloud.com/blog/qwen-3-8-flash-next-a-new-architecture-towards-ultimate-cost-efficiency_603501
- https://opencode.ai/data/alibaba
- https://www.alibabacloud.com/blog/qwen3-7-the-agent-frontier_603154
- https://www.vals.ai/blogs/qwen-alibaba-requests
- https://live.paloaltonetworks.com/t5/engineering-blogs/bg-p/Engineering-Blogs/label-name/cost%20observability
- https://www.worklytics.co/blog/how-to-track-llm-token-usage-and-cost
- https://github.com/deepseek-ai/deepseek-harness/discussions/3825
- https://www.braintrust.dev/articles/how-to-track-llm-token-usage-2026
- https://live.paloaltonetworks.com/t5/engineering-blogs/ai-cost-observability-a-practical-guide-to-understanding-and/ba-p/1263464
- https://arxiv.org/html/2601.14470v1
- https://portkey.ai/blog/tracking-llm-token-usage-across-providers-teams-and-workloads
- https://medium.com/@abhi_9103/thinking-in-tokens-the-complete-engineering-guide-to-llm-efficiency-446c2a06cf34
- https://www.srvrlss.io/compare/alibabacloud-function-compute-vs-amazon-lambda/
- https://www.usenix.org/conference/atc21/presentation/wang-ao
- https://faun.dev/toolbox/alibaba-cloud-function-compute-vs-spotinst-functions/
- https://www.saasworthy.com/product/alibaba-function-compute/pricing
- https://artificialanalysis.ai/models/qwen3-7-plus/providers
- https://www.reddit.com/r/Qwen_AI/comments/1tmgsoz/30_alibaba_token_plan_with_qwen37max_used_up_in_2/
- https://www.alibabacloud.com/en/press-room/alibaba-unveils-qwen3-8-max?_p_lc=1
- https://emergent.sh/news/qwen3-8-flash-next-officially-launched
- https://zilliz.com/blog/zilliz-cloud-on-demand
- https://github.com/milvus-io/milvus
- https://github.com/aws-solutions-library-samples/guidance-for-cost-analysis-and-optimization-with-amazon-bedrock-agentcore
- https://joudwawad.medium.com/aws-bedrock-agentcore-deep-dive-6822e4071774
- https://www.finout.io/blog/anthropic-just-launched-managed-agents.-lets-talk-about-how-were-going-to-pay-for-this-1
- https://www.mindstudio.ai/blog/managed-agents-pricing-token-costs
- https://www.truefoundry.com/blog/claude-managed-agents-pricing
- https://www.alibabacloud.com/help/en/model-studio/single-agent-application
- https://www.alibabacloud.com/blog/alibaba-cloud-upgrades-analyticdb-with-vector-database-engine-as-a-one-stop-solution-for-building-generative-ai-capabilities_600230
- https://www.rfp.wiki/cloud-computing/cloud-database-management-systems/singlestore/alibaba-cloud-analyticdb
- https://www.alibabacloud.com/blog/600692
- https://www.oracle.com/cloud/price-list/
- https://comparecloudcosts.com/docs
- https://dev.to/hdlfacebook_b3f6272d8b31c/real-world-comparison-deploying-cloud-infrastructure-with-alibaba-cloud-tencent-cloud-and-aws-in-54op
- https://www.superadrianme.com/media-outreach/alibaba-cloud-introduces-new-pricing-strategy-and-service-availability-for-international-customers/
- https://www.alibabacloud.com/help/en/agentrun/api-agentrun-2025-09-10-struct-agentruntime
- https://www.alibabacloud.com/help/en/agentrun/large-language-model-1.md
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/model-training-and-deployment-billing
- https://www.techrepublic.com/article/news-alibaba-qwen3-8-max-pricing-open-weights/
- https://www.anyscale.com/blog/reproducible-performance-metrics-for-llm-inference
- https://docs.nvidia.com/nim/benchmarking/llm/metrics
- https://docs.anyscale.com/llm/serving/benchmarking
- https://clickhouse.com/resources/engineering/llm-inference-latency
- https://tianpan.co/blog/2026/03/10/llm-latency-decomposition-ttft-vs-throughput
- https://docs.anyscale.com/llm/serving/benchmarking/benchmarking-guide
- https://arxiv.org/html/2606.20577v1
- https://community.databricks.com/t5/generative-ai/measuring-latency-metrics-like-ttft-tbt-when-deploying-agents-on/td-p/138208
- https://www.linkedin.com/posts/pranay-tiwari_llm-generativeai-mlops-activity-7426248530291245057-y5UB
- https://www.baseten.co/blog/benchmarking-fast-mistral-7b-inference/
- https://www.ibm.com/think/topics/time-to-first-token
- https://www.reddit.com/r/LocalLLaMA/comments/1cjvic2/analysis_of_time_to_first_token_ttft_of_llms/
- https://www.baseten.co/inference-engineering/book/01-prerequisites/measuring-latency-and-throughput/
- https://www.linkedin.com/posts/baseten_were-living-in-the-era-of-metric-obsession-activity-7426702704837599232-gmhS
- https://artificialanalysis.ai/providers/baseten
- https://codeant.ai/blogs/ai-first-token-latency
- https://www.gmicloud.ai/en/blog/ttft-llm-speed-metrics
- https://artificialanalysis.ai/methodology
- https://artificialanalysis.ai/evaluations/artificial-analysis-intelligence-index
- https://www.reddit.com/r/LocalLLaMA/comments/1vv80xa/artificial_analysis_intelligence_a_meaningless/
- https://artificialanalysis.ai/methodology/intelligence-benchmarking
- https://ijrpr.com/uploads/V7ISSUE10/IJRPR71162.pdf
- https://latent.space/reading/artificial-analysis-evaluation-service/
- https://www.linkedin.com/top-content/artificial-intelligence/ai-benchmark-analysis/
- https://www.alibabacloud.com/help/en/model-studio/model-telemetry
- https://www.alibabacloud.com/help/en/model-studio/stream
- https://www.alibabacloud.com/blog/model-routing-explained-send-each-request-to-the-cheapest-model-that-passes_603612
- https://www.alibabacloud.com/help/en/model-studio/what-is-model-studio
- https://docs.bailian.console.aliyun.com/en/model-studio/what-is-model-studio
- https://www.alibabacloud.com/help/fr/milvus/product-overview/billing-item
- https://cloudthinker.io/skills
- https://www.usagepricing.com/blueprint/trivia
- https://docs.apify.com/llms-full.txt
- https://www.linuxfoundation.org/blog/linux-foundation-newsletter-september-2026
- https://dnavin.wordpress.com/
- https://relevanceai.com/integrations
- https://promtable.com/ai-tools
- https://www.alibabacloud.com/help/en/sae/idle-mode-new
- https://sandbox0.ai/alternatives/windmill
- https://mirrors.aliyun.com/pypi/simple/
- https://github.com/codewhale-hq/Codewhale/blob/main/CHANGELOG.md
- https://help.sap.com/doc/bd6250c40c9c4c5391e3009a6f26dc3b/Cloud/en-US/SAP_Cloud_Platform.pdf
- https://web3.binance.com/en/dev-docs/llms-full.txt
- https://awesome-pi.site/extensions/
- https://sandbox0.ai/alternatives/tensorlake
- https://github.com/anthony-chaudhary/fak/blob/main/INDEX.md
- https://www.alibabacloud.com/blog/how-to-prioritize-ai-use-cases-before-2027-six-types-and-one-2x2_603616
- https://www.alibabacloud.com/blog/building-a-self-routing-multi-llm-architecture-with-alibaba-cloud-ai-gateway_603381
- https://www.gmicloud.ai/en/blog/model-routing-for-ai-applications-how-to-balance-cost-quality-latency-and-reliability
- https://www.truefoundry.com/blog/llm-routing-cost-quality-aware-model-selection
- https://blog.dailydoseofds.com/p/how-to-reduce-llm-costs-by-50-60
- https://www.alibabacloud.com/blog/603615
- https://neuraltrust.ai/blog/llm-model-routing
- https://www.digitalapplied.com/blog/llm-model-routing-2026-cost-quality-optimization-engineering-guide
- https://www.cerebras.ai/glossary/what-is-time-to-first-token
- https://www.linkedin.com/posts/greg-coquillo_your-model-is-live-is-it-delivering-offline-activity-7518703074161573888-sCJ8
- https://medium.com/design-bootcamp/stop-monitoring-ai-systems-like-web-services-3b219e6d170a
- https://www.respan.ai/articles/time-to-first-token
- https://rafay.co/ai-and-cloud-native-blog/understanding-model-deployment-metrics-in-rafays-token-factory
- https://docs.baseten.co/observability/metrics
- https://help.aliyun.com/en/model-studio/token-plan-personal-faq
- https://www.facebook.com/groups/vibecodinglife/posts/2142982486290277/
- https://www.mindstudio.ai/blog/token-reduction-strategies-ai-agents-cut-costs
- https://www.facebook.com/alibabacloud/posts/the-fastest-way-to-turn-a-small-ai-budget-into-a-big-admin-problemgive-every-use/1489181363253951/
- https://www.reddit.com/r/ClaudeCode/comments/1s3xjn4/i_measured_claude_codes_hidden_token_overhead/
- https://www.facebook.com/groups/claudeaicommunity/posts/1230936969073468/
- https://www.anthropic.com/research/claude-think-tool
- https://shipyard.build/blog/claude-code-tokens/
- https://www.toriihq.com/articles/six-tools-to-track-claude-ai-token-usage
- https://github.com/anthropics/claude-code/issues/46526
- https://news.ycombinator.com/item?id=43909409
- https://huggingface.co/datasets/zaursamadov/OpenAI-cookbook
- https://developers.openai.com/cookbook/examples/partners/model_selection_guide/model_selection_guide
- https://github.com/openai/openai-cookbook/blob/main/examples/completions_usage_api.ipynb
- https://learn.microsoft.com/en-au/answers/questions/5562811/estimate-retrieve-the-token-usage-and-costs-prompt
- https://www.reddit.com/r/OpenAI/comments/1szgxra/is_there_a_way_to_estimate_tokens_needed_for_tasks/
- https://www.nops.io/blog/openai-api-cost/
- https://community.openai.com/t/openai-answering-technical-details/1368737
- https://pub.aimind.so/every-token-counts-the-art-of-dynamic-openai-cost-optimization-55a51f62971d
- https://note.com/npaka/n/nb9d848e963a7?hl=en
- https://www.alibabacloud.com/help/en/model-studio/application-introduction
- https://help.aliyun.com/en/model-studio/what-is-model-studio
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/model-usage-statistics
- https://www.reddit.com/r/Qwen_AI/comments/1rjmujk/stop_using_alibaba_clouds_coding_plans/
- https://milvus.io/docs/product_faq.md
- https://help.aliyun.com/zh/milvus/product-overview/billing-item
- https://psw.codeshare.co.uk/
- https://www.activepieces.com/blog/qwen38-flash-next-api-pricing-token-costs-2026
- https://help.aliyun.com/en/model-studio/qwen-flash
- https://qubrid.com/blog/qwen38-27b-pricing-api-cost-per-1m-tokens?srsltid=AYCX9vJx_uyP2av_BLuXR-tFJkiSrjChrp4cdVdf5s04lYFYQhvTuCYa
- https://usagebox.com/articles/qwen-api-pricing-2026
- https://www.alibabacloud.com/help/en/sls/purchase-a-resource-plan
- https://www.alibabacloud.com/help/en/sls/use-cloudlens-for-sls-to-analyze-resource-usage
- https://www.alibabacloud.com/help/en/sls/pay-as-you-go
- https://bridgebench.ai/leaderboard/qwen3-8-flash-next
- https://www.mercatus-ai.com/blog/qwen-api-pricing
- https://deepinfra.com/blog/qwen3-8-27b-pricing-deepinfra-vs-alibaba
- https://www.cometapi.com/what-is-qwen3-8-flash/
- https://octomind.run/models/qwen3.8-omni-flash
- https://openrouter.ai/qwen/qwen3.7-plus:batch
- https://learn.microsoft.com/en-us/dotnet/ai/conceptual/understanding-tokens
- https://silentinfotech.com/blog/ai-9/guide-to-llm-token-management-347
- https://www.firecrawl.dev/blog/llm-tokenization-across-models
- https://www.alibabacloud.com/blog/tokenmaxxing-dilemma-are-there-immediate-solutions-for-improvement_603232
- https://www.together.ai/models/qwen37-plus
- https://www.requesty.ai/models/alibaba/qwen3.7-plus
- https://benchlm.ai/models/qwen3-7-plus
- https://opencode.ai/data/alibaba/qwen3-7-plus
- https://www.forbes.com/sites/jonmarkman/2026/08/05/alibabas-qwen38-max-prices-frontier-ai-at-2-per-million-tokens/
- https://www.spendline.ai/pricing/qwen/qwen3-8-max/
- https://bridgebench.ai/leaderboard/qwen3-8-max
- https://commandcode.ai/models/qwen3-8-max-prime
