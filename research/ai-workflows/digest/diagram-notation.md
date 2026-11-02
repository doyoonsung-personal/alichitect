# Digest: Agentic Workflow View for Pre-Sales App

## 1. Decisions this supports

- **Use inline step nodes, not sub-node attachments**, for tools and models; Model Studio and AgentRun use the inline convention (LLM, Tool, Knowledge Base are peer steps on the canvas). [Source](https://www.alibabacloud.com/help/en/model-studio/workflow-application)
- **Draw exactly 10 node kinds**: Trigger, Model call, Agent, Tool/API, Knowledge retrieval, Decision/router, Loop/for-each container, Human step, Sub-agent/sub-workflow, Output/reply. [Source](https://docs.dify.ai/en/cloud/use-dify/nodes/llm), [Source](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook)
- **Recommend AgentRun code-first runtime** for new international agent builds; low-code Flow Agent is in maintenance mode. [Source](https://www.alibabacloud.com/help/en/agentrun/what-is-agentrun)
- **Recommend AgentCore** for collaboration, governance, memory, and human-review pause/resume in Singapore. [Source](https://www.alibabacloud.com/help/en/agentcore/agentcore-product-overview)
- **Cost estimator must include tool-call fees**, not just tokens (e.g., web search adds $10 per 1,000 calls in Singapore). [Source](https://www.alibabacloud.com/help/en/model-studio/web-search)
- **Cost estimator must select deployment scope** (International vs Global); the same model ID costs less in Global scope. [Source](https://www.alibabacloud.com/help/en/model-studio/models)
- **Show model as a label on every model-backed node** so token estimates can attach to it. [Source](https://docs.dify.ai/en/cloud/use-dify/nodes/llm)
- **Warn customers that Application Development (workflow apps, knowledge base) is gated** in Singapore to accounts that created apps before 2025-04-21. [Source](https://www.alibabacloud.com/help/en/model-studio/application-introduction)
- **Generate a reviewable diagram first, not executable code**; NL-to-workflow resolve rates max out at ~46%. [Source](https://arxiv.org/html/2604.19667v2)
- **Offer Mermaid/Graphviz text export** for proposals, but do not rely on Mermaid subgraph direction. [Source](https://learn.microsoft.com/en-us/agent-framework/workflows/visualization)
- **Use workspace-specific endpoints** (`{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com`) for Singapore API calls. [Source](https://www.alibabacloud.com/help/en/model-studio/singapore-regional-access-information)
- **Quote AI Guardrails billing per enabled detection type** ($6 per 10k calls each), not as a bundle. [Source](https://www.alibabacloud.com/help/en/agentcore/agentcore-product-overview)

## 2. Data for the catalog or model table

### Models (International Scope / Singapore, per 1M tokens)

| Model ID | Input ($) | Output ($) | Cache Notes | Deployment Scope |
|---|---|---|---|---|
| `qwen3.8-max` | 2.00 | 6.00 | Implicit hit 0.25; explicit read 0.17. No batch/fine-tuning in SG. | International |
| `qwen-plus` | 0.40 | 1.20 | Thinking output is $4 (≤256K) / $12 (>256K). Input >256K: $1.20/$3.60. | International |
| `qwen-flash` | 0.05 | 0.40 | Implicit hit 0.01. Input >256K: $0.25/$2.00. | International |
| `qwen3.8-flash` | *See qwen3.8-max replacement notes* | — | Explicit creation $0.20; implicit/explicit hit $0.016. | International |
| `qwen3-coder-flash` | 0.30 | 1.50 | Input ≤32K. Global scope is cheaper ($0.144/$0.574). | International |
| `text-embedding-v4` | 0.07 | — | No Batch Inference. | International |
| `qwen3-rerank` | 0.10 | — | — | International |

### Platform Services (Singapore)

| Product / Feature | Status | Price | Notes |
|---|---|---|---|
| **AgentRun** (code-first) | Recommended | Serverless (FC pricing) | Low-code Flow Agent is in maintenance mode. |
| **AgentCore** | Commercial (pay-as-you-go) | Compute $0.000015/CU; Gateway $0.000000225/CU; Storage $0.000042/CU; Control plane $0.60/hr | Free offer ended 2026-10-18. CloudMonitor/PrivateLink/SchedulerX3 billed separately. |
| **Web Search** (tool) | GA | $10 per 1,000 calls | Plus token costs. Text-to-image search (`web_search_image`) is $8/1,000. |
| **AI Guardrails** | GA | $6 per 10,000 calls per detection type | Commodity code: `lvwang_guardrail_public_intl`. Endpoints: `green-cip.ap-southeast-1.aliyuncs.com`. |
| **Function Compute** | GA | $0.000020/CU | Quotas: 300 vCPUs, 600 GB memory. Discount ended 2025-08-27. |
| **Agent Sandbox** | Preview estimates | Economy: $0.00000381/vCPU-s, $0.00000191/GiB-s. Default: $0.00000496/vCPU-s, $0.00000248/GiB-s. | Successor to AgentBay. Deep hibernation still billed. |
| **Tablestore Knowledge/Memory** | Supported | CNY 1.08/GB/mo (knowledge); Memory rates in CNY/entries/hr | Reference rates only; confirm SGD pricing. |
| **Direct Mail** | GA | $0.29 per 1,000 messages | One-time free allowance of 2,000 emails (max 200/day). |

## 3. Rules for the drawing model

- **Draw tools, LLMs, and knowledge bases as inline sequential steps**, not as attached sub-nodes. *Fact: Alibaba Model Studio and AgentRun use the inline convention.*
- **Draw loops as container boxes with an inner sub-canvas**, never as back-edges, unless it is the agent's internal reasoning loop (draw that as a badge). *Fact: Model Studio Loop node uses a dedicated sub-canvas.*
- **Never recommend PAI-LangStudio or AgentBay** for new diagrams. *Fact: LangStudio retires 2027-03-09; AgentBay closed to new customers 2026-11-02.*
- **Never draw implicit routes.** Every possible next step from an Agent or Router must be an explicitly labeled edge. *Fact: LangGraph Studio fails to render un-declared Command edges.*
- **Label every model-backed node with the specific model ID and deployment scope.** *Fact: Prices differ by scope (International vs Global), and cost estimation requires this.*
- **Always draw an explicit "Human step" node** when workflows require approval. *Fact: Dify v1.13.0 and AgentCore both support pause/resume human review.*
- **Cap top-level nodes at 12–20**; collapse deeper logic into Sub-agent/Sub-workflow nodes. *Fact: Industry standard for readability; Bedrock enforces hard caps.*
- **Layout left-to-right using ELK Layered or dagre.** *Fact: n8n mandates LTR; ELK minimizes edge crossings.*
- **Never state that Singapore hosting guarantees data residency.** *Fact: Privacy policy permits overseas transfer; inference may run outside mainland China even for International scope.*
- **Add a tool-call cost warning to the Web Search node.** *Fact: Costs $10/1,000 calls in Singapore plus tokens.*

## 4. Traps

- **Model Studio zero-code apps & knowledge base APIs in Singapore are gated.** Only accounts that created a Singapore app before 2025-04-21 can access them, and they are marked preview. New international accounts cannot use them.
- **AgentRun Low-Code (Flow Agent) is in maintenance mode.** Alibaba advises against creating new low-code agents (since 2026-09-18). The Open Platform (FunAgent) should not be activated ahead of an upgrade. Use code-first.
- **AgentBay is closed to new customers** (as of 2026-11-02). Do not recommend it. The successor is Agent Sandbox (Flash Edition). Windows Computer Use is invitational preview; Android has no confirmed replacement.
- **PAI-LangStudio retires 2027-03-09.** Its migration target (Model Studio workflow apps) is Beijing-only, meaning there is no Singapore migration path.
- **Global scope ≠ US/EU-only processing.** Just like Singapore storage doesn't guarantee Singapore-only inference, Global endpoints route across regions. Do not promise strict residency based on scope alone.
- **Cache prices are not uniform ratios.** `qwen3.8-flash` explicit creation is $0.20 in Singapore (not $0.1875). Store cache prices per-model.
- **Batch inference excludes many models in Singapore.** `qwen3.8-flash` and `qwen3.8-max` do not support batch in Singapore. Check per-model.
- **Retirement wave (Notice 2217):** `qwen3.5-plus`, `qwen3.5-plus-2026-02-15`, `qwen3.5-plus-2026-04-20`, and `qwen3.5-397b-a17b` decommission on 2027-01-19. Replace with `qwen3.8-flash`.
- **AI Guardrails console previously stated "Shanghai only"** in older docs, but adjudication confirms it is available internationally (SG, HK, Frankfurt, Virginia). Bill per detection type, not as a flat fee.
- **US CMC Designation:** Alibaba was designated a "Chinese military company" by the US FCC (June 2026). A preliminary injunction limits enforcement of one provision. If mentioned in proposals, state factually without characterization.

## 5. Open questions

- **AgentRun Flow Agent full node list:** Only Start and LLM nodes are documented internationally. The complete low-code node vocabulary for AgentRun remains unconfirmed (and is now in maintenance mode anyway).
- **Tablestore Knowledge/Memory SGD Pricing:** Published rates are in CNY and the page contradicts itself on the memory meter (GB/month vs entries/hour). Need exact Singapore pricing for cost-per-run estimates.
- **AgentCore IM Channels:** Confirmed only for DingTalk, Lark, WeCom (managed agents). WhatsApp/Slack require custom adapters via Function Compute. Exact pre-sales messaging architecture needs clarification.
- **qwen3-vl-flash Singapore availability:** Missing from the live pricing page; treat as unconfirmed.
- **International explicit-hit cache price for qwen3.8-flash:** Adjudicate-1 confirmed creation ($0.20) and hits ($0.016), but earlier notes flagged the explicit-hit price as unconfirmed.
- **AI Guardrails Singapore integration specifics:** Billing and endpoints are confirmed, but whether WAF 3.0 AI application protection integration (currently in preview) applies seamlessly to international pre-sales demos is unverified.