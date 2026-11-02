# Digest: AI & Agents View Implementation

## 1. Decisions this supports

- Default diagram uses Model Studio model APIs + external runtime (AgentRun code-first or AgentCore), because no-code/low-code apps and knowledge-base APIs are gated to accounts that created a Singapore app before 2025-04-21. [https://www.alibabacloud.com/help/en/model-studio/application-introduction]
- Recommend AgentRun code-first runtime; never recommend low-code Flow Agent creation (maintenance mode) or Open Platform/FunAgent activation (major upgrade pending). [NOTES Adjudicate-1]
- Recommend AgentCore (commercial, pay-as-you-go, Singapore supported) for human-review nodes (acceptance, pause, resume documented). [NOTES Adjudicate-2]
- Cost estimator must multiply by deployment scope (International vs Global), not just region, because the same model ID costs less in Global scope. [NOTES Batch 1]
- Cost estimator must add tool-call fees (e.g., web search $10/1k calls in SG) on top of token costs. [NOTES Batch 1]
- Draw explicit max-iteration caps and termination conditions on every loop node (cost control + OWASP ASI01 mitigation). [Report §6 / OWASP Agentic Top 10]
- Use workspace-specific endpoints (`{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com`) for all Model Studio API calls, including Responses. [NOTES Adjudicate-1]
- Fetch prices at render time from official pages; never hardcode, because aggregate and per-model pages disagree and tiers change. [Report §4 warning]
- For new international accounts, draw RAG using Tablestore Knowledge Storage or DashVector + embeddings, not Model Studio Knowledge Base. [NOTES Adjudicate-2]
- Warn EU-facing customers that AI Act Annex III duties apply from 2027-12-02 and Annex I from 2028-08-02. [NOTES Batch 5]
- State US DoD 1260H designation factually without characterisation; injunction limits only one provision's enforcement. [NOTES Batch 6]

## 2. Data for the catalog or model table

**Models (International scope / Singapore, USD per 1M tokens unless noted)**

| ID | Input | Output | Cache (hit) | Notes |
|---|---|---|---|---|
| qwen3.8-max | $2.00 | $6.00 | Implicit $0.25; Explicit read $0.17 | No batch/fine-tuning in SG. Web search works. |
| qwen-plus (≤256K) | $0.40 | $1.20 | — | Thinking output: $4 (≤256K), $12 (>256K). >256K: $1.20/$3.60. |
| qwen-flash (≤256K) | $0.05 | $0.40 | Implicit $0.01 | >256K: $0.25/$2.00. |
| qwen3-coder-flash (≤32K) | $0.30 | $1.50 | — | Global scope is cheaper ($0.144/$0.574). |
| text-embedding-v4 | $0.07 | — | — | No batch. |
| qwen3-rerank | $0.10 | — | — | |
| qwen3.8-flash cache | — | — | Explicit create $0.20; hit $0.016 | Differs from Global scope. |

*Batch inference:* 50% of real-time price. Excludes qwen3.8-flash, qwen3.8-max, context caching, and free quota in SG.
*Free quota:* Typically 1M tokens/model for 90 days (SG/International only). Many removed 2026-10-29.
*Retiring:* qwen3.5-plus variants end marketing 2026-11-18, decommission 2027-01-19. Replace with qwen3.8-flash.

**Platform Services (Singapore)**

| Product | Status | Price | Scope/Notes |
|---|---|---|---|
| AgentRun (code-first) | Recommended | — | `ap-southeast-1`. Low-code/Open Platform discouraged. |
| AgentCore | Commercial | Compute $0.000015/CU; Control plane $0.60/hr | CloudMonitor/PrivateLink/SchedulerX3 billed separately. |
| Agent Sandbox | Preview estimates | Economy $0.00000381/vCPU-s; Default $0.00000496/vCPU-s | Successor to AgentBay. Deep hibernation billed. |
| Function Compute | GA | $0.000020/CU | Quota: 300 vCPUs, 600 GB RAM. Promo ended. |
| AI Guardrails | GA | $6 per 10k calls per detection type | Commodity: `lvwang_guardrail_public_intl`. Endpoint: `green-cip.ap-southeast-1.aliyuncs.com`. |
| Direct Mail | GA | $0.29 per 1k msgs | 2,000 free once (max 200/day). |
| Web Search Tool | GA | $10 per 1,000 calls | Plus token costs. |
| Tablestore Memory/Knowledge | Supported | CNY reference rates only | Confirm SG USD pricing before quoting. |
| Throughput Reservation (PTU) | GA | $20.16 per 10k TPM/day | Standard subscription. |

## 3. Rules for the drawing model

- **Draw API-based runtimes (AgentRun code-first, AgentCore, FC, ACK) for new international accounts.** Fact: Application Development APIs (no-code/workflow/KB) are gated to pre-2025-04-21 SG app creators. [NOTES Batch 2]
- **Never draw AgentBay for new customers.** Fact: Closed to new customers 2026-11-02; successor is Agent Sandbox. [NOTES Batch 3 / Adjudicate-1]
- **Never draw PAI LangStudio as a future state.** Fact: Retires 2027-03-09; migration target (Model Studio apps) is Beijing-only. [NOTES Batch 6]
- **Never draw AI Search Open Platform for Singapore-default architectures.** Fact: Only Shanghai and Frankfurt regions exist. [NOTES Batch 2]
- **Never draw ADBAgent in Singapore.** Fact: Not available in SG; Skills feature is mainland-only. [NOTES Batch 2]
- **Always draw an explicit max-iteration cap and termination condition on loops.** Fact: Unbounded loops cause cost overruns and OWASP ASI01 goal hijack. [Report §6]
- **Label every price with its deployment scope (International vs Global) and input-length tier.** Fact: Same model ID costs less in Global scope; prices jump above 256K inputs. [NOTES Batch 1, 6]
- **Add tool-call fees to the cost estimate when web search or code interpreter is drawn.** Fact: Web search is $10/1k calls in SG; tools add non-token costs. [NOTES Batch 1]
- **Use `{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com` endpoint format in architecture details.** Fact: Legacy `dashscope.aliyuncs.com` stopped receiving features after 2026-09-30. [NOTES Adjudicate-1]
- **Draw Tablestore Knowledge Storage or DashVector for RAG, not Model Studio KB.** Fact: Model Studio KB APIs require the 2025-04-21 eligibility gate. [NOTES Adjudicate-2]
- **Do not promise Singapore storage equals Singapore-only processing.** Fact: International-scope requests can be processed outside mainland China; privacy policy permits overseas transfer. [NOTES Batch 1, 6]

## 4