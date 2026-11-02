# Digest: AI & Agents View — Implementation Facts

## 1. Decisions this supports

- **Cost estimator must key prices on deployment scope, not just region.** Singapore = `International` scope; Frankfurt/Tokyo/HK/Virginia = `Global` or `US` scope, with different prices for the same model id. ([Report §0](https://www.alibabacloud.com/help/en/model-studio/singapore-regional-access-information))
- **Web search tool costs $10 per 1,000 calls in Singapore** (plus added tokens); text-to-image search (`web_search_image`) is $8/1,000. Web extractor and code interpreter are temporarily free but add tokens. Cost estimator must count tool-call fees, not only tokens. ([NOTES Batch 1](https://www.alibabacloud.com/help/en/model-studio/web-search))
- **Recommend `qwen3.7-plus` for agentic coding/tool-calling steps**, not retired coder models. It is Model Studio’s official recommendation for agents. ([Report §9](https://docs.modelstudio.console.alibabacloud.com/en/model-studio/text-generation-model))
- **Recommend `qwen3.8-flash` for fast/cheap trigger, routing, and classification steps** ($0.15/$0.47 per 1M tokens). ([Report §9](https://docs.modelstudio.console.alibabacloud.com/en/model-studio/text-generation-model))
- **Recommend `qwen3.8-max` for complex reasoning / hard escalations** ($2/$6 per 1M tokens). ([Report §9](https://docs.modelstudio.console.alibabacloud.com/en/model-studio/text-generation-model))
- **Never recommend `qwen-long` for drafting steps.** Max output is 8,192 tokens, and it lacks function calling/thinking. Use it only for extraction, then hand off to a 131K-output model. ([Report §3b](https://www.alibabacloud.com/help/en/model-studio/qwen-long); [NOTES Batch 1](https://docs.modelstudio.console.alibabacloud.com/en/model-studio/text-generation-model))
- **Use AgentCore (not AgentRun low-code) for agent orchestration in Singapore.** Low-code Flow Agent creation is in maintenance mode; Open Platform/FunAgent should not be activated by new users. Code-first runtime remains recommended. ([NOTES Adjudicate-1](https://www.alibabacloud.com/help/en/model-studio/what-is-model-studio))
- **Do not draw AgentBay as an available tool for new customers.** Closed to new purchases since 2026-11-02. Successor is Agent Sandbox Express Edition (Flash Edition). Windows Computer Use Sandbox is invitational preview; Android has no confirmed replacement. ([NOTES Adjudicate-1](https://www.alibabacloud.com/en/notice/detail?id=2207))
- **Draw AI Guardrails as available in Singapore.** Commodity code `lvwang_guardrail_public_intl`; endpoints `green-cip.ap-southeast-1.aliyuncs.com`. Bills $6 per 10,000 calls *per enabled detection type* (content compliance, sensitive content, prompt injection). ([NOTES Adjudicate-1](https://www.alibabacloud.com/help/en/model-studio/ai-guardrails))
- **Endpoint for proposals:** use workspace-specific hosts `https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1`. Responses API path is `/compatible-mode/v1/responses`. Legacy paths are unmaintained. ([NOTES Adjudicate-1](https://www.alibabacloud.com/help/en/model-studio/get-api-key))
- **Data residency warning for proposals:** International-scope requests (Singapore storage) can be processed on nodes outside mainland China. Region decides access/storage; scope decides inference location. Do not claim US-only processing for Virginia Global scope. Prompts/responses retained up to 30 days. Zero data retention requires enterprise eligibility and supported models; unsupported models fall back to standard retention silently. ([NOTES Batch 1](https://www.alibabacloud.com/help/en/model-studio/singapore-regional-access-information))
- **Free quota applies only to Singapore + International scope**, typically 1M tokens per model for 90 days. Removed for many models on 2026-10-29. "Free Quota Only" switch is off by default. ([NOTES Batch 1](https://www.alibabacloud.com/help/en/model-studio/new-free-quota))

## 2. Data for the catalog or model table

Prices are USD per 1M tokens. Scope: `Intl` = International (Singapore), `Global` = Frankfurt/Tokyo/HK/Virginia.

| Model ID | Tier / Purpose | Context | Max Output | Price In / Out (Scope) | Thinking | FC / Structured | Status | Free Quota |
|---|---|---|---|---|---|---|---|---|
| `qwen3.8-max` | Flagship reasoning/coding | 1M | 131,072 | $2.00 / $6.00 (Intl) · $1.65 / $4.95 (Global) | Yes | Yes / Yes | GA | 1M tokens (Intl only) |
| `qwen3.7-plus` | Balanced / Agent coding | 1M | 131,072 | ≤256K: $0.40 / $1.60 · >256K: $1.20 / $4.80 (Intl) | Yes | Yes / Yes | GA | 1M tokens |
| `qwen3.8-flash` | Fast / cheap | 1M | 131,072 | $0.15 / $0.47 (Intl) | Yes | Yes / Yes | GA | 1M tokens |
| `qwen-plus` | Legacy balanced | 1M | 32,768 | ≤256K: $0.40 in / $4.00 out-thinking (Intl) | Yes | Yes / Yes | GA | 1M tokens |
| `qwen3.8-27b` | Open-weight 27B dense | 1M | 131,072 | ≤256K: $0.50 / $3.00 / $3.00 (Intl) | Yes | Yes / Yes | GA | 1M tokens (SG) |
| `qwen3.6-35b-a3b` | Open-weight 35B MoE | 262K | - | ≤256K: $0.375 / $2.25 / $2.25 (Intl) | Yes | Yes / Yes | GA | None |
| `deepseek-v4-pro` | 3P DeepSeek flagship | - | - | $2.40 / $4.80 (Intl) | - | - | GA | 1M tokens |
| `kimi-k3` | 3P Moonshot reasoning | 1M | - | Intl price unconfirmed (see §5) | Always-on | - | GA | None |
| `glm-5.3` | 3P Z.ai coding/agent | - | - | $1.40 / $4.40 (Intl, see §5) | Yes | - | GA | None |
| `qwen-mt-flash` | Translation (92 langs) | 16K | - | $0.16 / $0.49 (Intl) | No | No / No | GA | - |
| `qwen-mt-lite` | Translation (92 langs) | 16K | - | $0.12 / $0.36 (Intl) | No | No / No | GA | - |
| `qwen-long` | Long doc extraction | 10M | 8,192 | Intl price unconfirmed (see §5) | No | No / Yes | Legacy | - |

**Cache Prices (Singapore / International, USD/1M):**

| Model | Implicit Hit | Explicit Creation | Explicit Read |
|---|---|---|---|
| `qwen3.8-max` | $0.25 | $2.50 | ~$0.17 |
| `qwen3.8-flash` | $0.016 | $0.20 | Unconfirmed |

**Infrastructure Catalog:**

| Product | Scope / Region | Price | Status |
|---|---|---|---|
| AgentCore | Singapore | $0.000015/CU compute; $0.60/hr collab plane | GA (Free offer ended 2026-10-18) |
| Agent Sandbox | Singapore | Economy: $0.00000381/vCPU-s, $0.00000191/GiB-s · Default: $0.00000496/vCPU-s, $0.00000248/GiB-s | GA |
| AI Guardrails | Singapore | $6 per 10k calls per detection type | GA |
| Web Search Tool | Singapore | $10 per 1,000 calls + tokens | GA |
| Content Mod V2.0 | Singapore | $0.30 per 1,000 tasks | GA |

## 3. Rules for the drawing model

- **Use `International` scope prices when the diagram region is `ap-southeast-1` (Singapore).** Never use `Global` prices for Singapore. (Fact: Deployment scope dictates pricing, not just region name.)
- **Draw Web Search as a paid tool node at $10/1,000 calls in Singapore.** Add its token consumption to the step's cost. (Fact: Web search costs $10/1k in SG, plus tokens.)
- **Draw `qwen3.7-plus` for agent tool-calling and coding steps.** Do not draw `qwen3-coder-plus`. (Fact: `qwen3-coder-plus` was retired 2026-10-10; `qwen3.7-plus` is the official replacement.)
- **Draw explicit cache nodes only if the prefix is ≥1,024 tokens.** Note the 5-minute TTL renewed on hit. (Fact: Minimum cacheable prefix is 1,024 tokens; TTL is 5 mins.)
- **Never draw JSON structured output and thinking mode enabled simultaneously on the same step for affected models.** (Fact: JSON mode response errors when `enable_thinking` is true on models supporting structured output in non-thinking mode only.)
- **Draw AgentCore for orchestration/human-review loops.** Draw Agent Sandbox (Express/Flash) for code execution. Never draw AgentBay for new international customers. (Fact: AgentBay closed to new customers 2026-11-02; AgentRun low-code is in maintenance mode.)
- **Draw AI Guardrails as a step using `green-cip.ap-southeast-1.aliyuncs.com`, billing per enabled detection type.** (Fact: Guardrails console now supports Singapore; bills $6/10k per type.)
- **Never draw batch discounts and cache discounts stacking on the same step.** (Fact: The two discounts cannot apply simultaneously.)
- **Show free-quota badges only for Singapore / International scope models.** (Fact: No free quota in other regions/scopes; removed for many models on 2026-10-29.)
- **Route endpoint arrows to `https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1`.** (Fact: Workspace-specific hosts recommended; legacy paths unmaintained.)

## 4. Traps

- **`qwen3-coder-plus` looks live on third-party sites but was retired 2026-10-10.** Even Alibaba's own free-quota page still lists it (stale). Replace with `qwen3.7-plus`.
- **Deployment scope vs. Region:** A model id like `qwen3.8-max` costs $2.00/$6.00 in Singapore (`International`) but $1.65/$4.95 in Frankfurt (`Global`). Using the wrong scope breaks the cost estimator.
- **`qwen-long` looks like a drafting model due to 10M context, but max output is 8,192 tokens and it lacks function calling.** It is also marked legacy/no longer recommended.
- **`qwen-mt-uni` (multimodal translation) appears in some docs but is China-site (Beijing) only.** Exclude from international catalogs.
- **AgentBay appears as GA in older catalogs but stopped accepting new customers on 2026-11-02.**
- **AI Guardrails overview previously said "Shanghai only", but it is now available internationally (HK, SG, Frankfurt, Virginia).** Do not block it in the UI for SG.
- **PrivateLink excludes Singapore.** Do not offer it as a networking option in SG diagrams.
- **Application Development (zero-code apps, knowledge base APIs) is gated behind a 2025-04-21 account creation date in Singapore and is Preview.** New international accounts cannot use these zero-code features.
- **Implicit cache is "typically 20%" but actual rates vary wildly by model** (e.g., `qwen3.8-max` implicit hit is $0.25 which is 12.5% of $2.00; `kimi-k3` is 10%). Hardcode per-model, don't apply a global percentage.
- **`qwen-plus` thinking output in Singapore is $4.00/1M, not $1.20.** The report mixed tiers.
- **Batch inference is not universally supported.** `qwen3.8-flash` lists batch as unsupported in Singapore despite appearing on general batch pages. Check per model.

## 5. Open questions

- **`qwen-long` International-scope price:** Report quotes $0.072/$0.287, but trackers attribute this to Beijing. Unconfirmed for Singapore.
- **`kimi-k3` International-scope price:** Pricing page shows $2.827/$14.133, but one tracker labels it `Global`.
- **`kimi-k2.7-code` price conflict:** Pricing page says $0.894/$3.713; model page `Scope: International` block says $0.95/$4.00.
- **`glm-5.3` price tiers:** Two `International` rows exist ($1.40/$4.40 and $2.80/$8.80); likely non-thinking vs thinking, but unconfirmed.
- **`qwen3.8-flash` explicit-cache read price (International):** Creation is confirmed at $0.20, but read price is unconfirmed.
- **Exact model list for the 2027-01-19 deprecation wave (Notice id=2217):** Table exists but ids were unreadable from snippets.
- **Whether hosted Qwen3 open-weight ids (`qwen3-235b-a22b`, etc.) are fully purged from Singapore:** Trackers say retired 2026-10-10, but free-quota page still lists them.
- **`qwen3-coder-next` official International price and context window.**
- **`MiniMax-M2.5` International USD price:** Only CNY China-site row found.