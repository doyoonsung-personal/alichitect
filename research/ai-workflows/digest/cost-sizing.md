# AI & Agents View – Implementation Digest

## 1. Decisions this supports

- **Price key is `(model, deployment_scope)`, not just model.** International (Singapore) scope costs more than Global scope for the same model id. Store both. [NOTES Batch 1]
- **Cache prices must be stored per-model, never as a uniform ratio.** qwen3.8-max and its snapshots are exceptions to the general rule. [NOTES Batch 1]
- **Web search tool calls cost $10 per 1,000 in Singapore** and must be counted as a line item, not just token overhead. Text-to-image search (`web_search_image`) is $8/1,000. Web extractor and code interpreter are temporarily free but add tokens. [NOTES Batch 1; `model-studio/web-search`]
- **Agent loop history grows quadratically**, not linearly. The drawing engine must use the sum formula `N·(T_base+T_tools) + N(N-1)/2·(T_toolcall_out+T_toolresult)` to size loops. [Report §2.2]
- **Thinking content is billed as output tokens.** Cap it with `thinking_budget` or turn it off on interactive steps to control cost and latency. [Report §1.2; `model-studio/deep-thinking`]
- **Batch inference is 50% of real-time price** but cannot stack with cache discounts, excludes the free quota, and has a narrower model list in Singapore (no qwen3.8-flash, no qwen3.8-max). [NOTES Batch 1, 6]
- **Human approval nodes must be drawn as wall-clock wait time**, separated from compute latency. [Report §6.6]
- **Latency proposals must show p50 and p95 ranges**, because same-task agent runs vary up to 30× in token usage. [Report §5.5; arxiv.org/abs/2604.22750]
- **Model Studio knowledge base and `file_search` are blocked for new international accounts.** New accounts must use Tablestore Knowledge Storage or DashVector + embeddings. [NOTES Adjudicate-2]
- **AI Guardrails is available in Singapore** (commodity code `lvwang_guardrail_public_intl`). Bills $6 per 10,000 calls *per enabled detection type* (content compliance, sensitive content, prompt injection), not as a bundle. [NOTES Adjudicate-1]
- **Use workspace-specific endpoints** (`https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1`) for Singapore. The old `dashscope-intl` domain works but receives no new features. [NOTES Batch 3, Adjudicate-1]
- **Data residency warning:** Singapore storage does not guarantee Singapore-only inference. International-scope requests may process outside mainland China. Privacy policy permits overseas transfer. State this factually in proposals. [NOTES Batch 1, 6]

## 2. Data for the catalog or model table

### Model pricing (International scope / Singapore, per 1M tokens)

| Model ID | Input | Output | Cache Hit (Implicit) | Cache Create (Explicit) | Batch | Notes |
|---|---|---|---|---|---|---|
| `qwen3.8-max` | $2.00 | $6.00 | $0.25 | Read $0.17 | No | Web search works in SG, not Global. No fine-tuning in SG. |
| `qwen3.8-flash` | $0.15 | $0.47 | $0.016 | $0.20 | No | Free quota removed 2026-10-29 for many models; check eligibility. |
| `qwen3.7-plus` | $0.40 | $1.60 | Unconfirmed (Intl) | — | Yes | Ignore limited-time 20% discount; use list price. |
| `qwen-plus` | $0.40 | $1.20 | — | — | — | Thinking output: $4 (≤256K), $12 (>256K). Input >256K: $1.20/$3.60. |
| `qwen-flash` | $0.05 | $0.40 | $0.01 | — | — | Input >256K: $0.25/$2.00. |
| `qwen3-coder-flash` | $0.30 | $1.50 | — | — | — | For input ≤32K. |
| `text-embedding-v4` | $0.072 | — | — | — | No | Report's $0.072 is Beijing price; NOTES says $0.07 Intl. Verify. |
| `qwen3-rerank` | $0.10 | — | — | — | — | |
| `multimodal-embeddings` | Text $0.09 / Img $0.03 | — | — | — | — | |

### Platform components (Singapore)

| Product | Price | Unit | Status |
|---|---|---|---|
| Function Compute | $0.000020 | CU (Tier 1) | GA. Promotional rate ended. Quotas: 300 vCPU, 600 GB mem. |
| AgentCore | Compute $0.000015 / Gateway $0.000000225 / Storage $0.000042 | CU | Commercial (pay-as-you-go since 2026-09-18). Not explicitly "GA". Dedicated plane $0.60/hr. |
| Agent Sandbox | Economy $0.00000381 / Default $0.00000496 | vCPU-second | Reference prices ("preview estimates"). Memory/disk billed separately. Deep hibernation billed. |
| API Gateway (cloud-native) | $0.402 | hour (apigw.small.x1) | GA. Plus data processing fee. |
| Direct Mail | $0.29 | 1,000 emails | GA. 2,000 free once/account (max 200/day). |
| EventBridge | $0.82 | 1M events | GA. |
| SLS | $0.045 read-write / $0.0875 index / $0.002875 storage | GB / GB / GB-day | GA. |
| AI Guardrails | $6.00 | 10,000 calls per detection type | Commercial. Endpoint: `green-cip.ap-southeast-1.aliyuncs.com`. |
| AgentLoop | $0.00014 exec / $0.0016 credit / $0.0000055 entry | per unit | GA. |
| Milvus (VRS) | $0.0000416667 | GB-hour (storage) | CU price unconfirmed for SG. |
| AnalyticDB PG | $0.036485 | CU-hour | Serverless. |
| ACS | vCPU $0.00000076 / Mem $0.00000038 | second / GiB-second | Outside China best-effort. |
| PTU (Throughput Reservation) | $20.16 | 10k TPM/day | Standard subscription, SG. |

## 3. Rules for the drawing model

- **Draw explicit cache creation nodes only when the static prefix is ≥1,024 tokens.** Implicit cache also requires ≥1,024 tokens. [NOTES Batch 1; `model-studio/context-cache`]
- **Draw web search as a tool call that adds a fixed $10/1,000 fee**, not just token consumption. [NOTES Batch 1]
- **Never draw batch inference combined with context caching.** They cannot stack. [NOTES Batch 1, 6; `model-studio/model-pricing`]
- **Never recommend `qwen3.8-flash` or `qwen3.8-max` for batch inference in Singapore.** They are unsupported. [NOTES Batch 1]
- **Never draw knowledge base or `file_search` nodes for new international accounts.** Use Tablestore Knowledge Storage or DashVector instead. [NOTES Adjudicate-2]
- **Draw thinking mode as an output-token multiplier.** Bill `T_thinking` at `P_out`. Advise turning it off or capping via `thinking_budget` on interactive steps to avoid 30–40s latency penalties. [Report §1.2; NOTES Batch 1]
- **Draw human approval as a wait-state node**, distinct from compute steps. It dominates wall-clock time. [Report §6.6]
- **Calculate agent loop cost using quadratic history growth**, not linear multiplication. Re-sending full context each iteration makes cost scale with `N(N-1)/2`. [Report §2.2]
- **Always display cost and latency as ranges (p50/p95)**, never single point estimates. Run-to-run variance is up to 30×. [Report §5.5; arxiv.org/abs/2604.22750]
- **Never present Singapore hosting as a data residency guarantee.** International scope allows processing outside mainland China. Warn customers subject to EU AI Act or strict residency laws. [NOTES Batch 1, 6]
- **Route API calls to workspace-specific endpoints** (`{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com`), not the legacy `dashscope-intl` domain. [NOTES Adjudicate-1]
- **Count AI Guardrails cost per enabled detection type** (up to 3 types × $6/10k), not as a flat fee. [NOTES Adjudicate-1]

## 4. Traps

- **AgentBay is closed to new customers** (since 2026-11-02). Do not recommend it. Successor is Agent Sandbox Express/Flash Edition. Windows Computer Use Sandbox is invitational preview; Android has no replacement. [NOTES Batch 3, Adjudicate-1]
- **AgentRun low-code Flow Agent creation is in maintenance mode** (since 2026-09-18). Open Platform / FunAgent should not be activated by new users. Only the code-first runtime is recommended. [NOTES Batch 3, Adjudicate-1]
- **Application Development (zero-code apps, KB, prompt engineering) is gated.** Only accounts that created a Singapore app before 2025-04-21 have access. It is marked preview. Tutorials relying on these APIs do not work for new international accounts. [NOTES Batch 2, 6]
- **Assistant API is deprecated.** Use Responses API (`/compatible-mode/v1/responses`). [NOTES Batch 2]
- **Free quotas were largely removed on 2026-10-29.** Do not assume 1M free tokens per model; verify eligibility (e.g., qwen3.8-27b retains it). "Free Quota Only" is off by default. [NOTES Batch 1, 6]
- **China-only products/prices:** Model Studio Managed Agents (CNY 0.5/hr), AgentCore CNY pricing tables, `qwen-mt-uni`, ADBAgent Skills, MaxCompute remote MCP, PAI LangStudio migration target, shopping/WeChat assistants. Do not include in international proposals. [Report §4; NOTES Batch 1, 2, 3, 6]
- **AI Search Open Platform excludes Singapore.** Frankfurt is the only non-mainland region. [NOTES Batch 2, 3]
- **PrivateLink excludes Singapore.** [NOTES Batch 1]
- **Retirement wave (Notice 2217):** `qwen3.5-plus` variants and `qwen3.5-397b-a17b` decommission on 2027-01-19. Replacement is `qwen3.8-flash`. `qwen-long` and `qwen3.7-max` are legacy. [NOTES Adjudicate-2, Batch 1]
- **Budget auto-stop returns HTTP 429.** Alibaba advises against using it in production. Budgets exclude training, PTU, and DTU. [NOTES Batch 6]
- **API Gateway serverless preview in Singapore has ended.** Use the commercial cloud-native gateway. [NOTES Batch 3]
- **US CMC designation:** Alibaba was designated a "Chinese military company" (June 2026). A preliminary injunction limits one provision. If mentioned, state factually without characterization. [NOTES Batch 6]

## 5. Open questions

- **qwen3.7-plus cache-hit input price (International scope).** The report assumes ~$0.04, but NOTES flags it as unconfirmed. Must be read directly from the live pricing page.
- **PTU vs Throughput Reservation rate discrepancy.** Report cites $16.63/10k TPM-hr; NOTES cites $20.16/10k TPM-day (Standard subscription). Verify which applies to the customer's tier.
- **Milvus (VRS) CU unit prices in Singapore.** Storage is confirmed ($0.0000416667/GB-hr), but compute node USD/CU/month rates could not be extracted.
- **AgentRun unit prices.** Active/idle billing logic is documented, but no public rate card exists. Estimate via FC/ACS + AgentCore CU rates.
- **Model Studio per-model RPM/TPM limits in Singapore.** Rate-limit docs explain the mechanism (aggregated across RAM/workspaces under primary account), but exact current numeric limits per model are unconfirmed.
- **Tablestore Knowledge/Memory Storage SGD pricing.** Published rates are in CNY and the page contradicts itself on metering units (GB/month vs entries/hour). Treat as reference only.
- **qwen3.8-flash explicit cache hit price (International).** Creation is $0.20, implicit/explicit hits are $0.016, but NOTES notes the explicit-hit price specifically is "not confirmed."
- **Agent Sandbox disk pricing outside mainland China.** Report cites $0.00025308/GiB/hr; confirm if this aligns with the updated Flash/Economy/Default tiers.