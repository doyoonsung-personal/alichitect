# Digest: Agentic Workflow Patterns for Pre-Sales App

## 1. Decisions this supports

- **Default to workflows, not agents.** Workflows (predefined code paths) are cheaper and more predictable; agents (LLMs dynamically directing their own processes in a loop) are only for open-ended tasks where step count is unpredictable. [https://www.anthropic.com/research/building-effective-agents]
- **Draw two edge classes.** Code-determined edges (gates, routers) must be visually distinct from model-determined edges (agent tool selection, orchestrator spawn), which should be dashed. [https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/definitions.html]
- **Estimate cost using token multipliers.** Single-agent loops consume ~4× chat tokens; multi-agent systems consume ~15×. [https://www.anthropic.com/research/multi-agent-research-system]
- **Cost estimator must include tool fees, not just tokens.** Web search in Singapore costs $10 per 1,000 calls plus tokens. Text-to-image search (`web_search_image`) costs $8 per 1,000. Web extractor and code interpreter are temporarily free but add tokens. NOTES.md.
- **Prices depend on deployment scope, not just region.** International scope (Singapore) is more expensive than Global scope (Frankfurt, Tokyo, Hong Kong, Virginia). The estimator requires the scope. NOTES.md.
- **Use workspace-specific endpoints for Singapore.** Format: `https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1`. The legacy Responses path is unmaintained. NOTES.md.
- **Recommend AgentRun code-first runtime, not low-code.** Low-code Flow Agent creation is in maintenance mode; Open Platform/FunAgent activation is discouraged ahead of an upgrade. NOTES.md.
- **Recommend Agent Sandbox, not AgentBay.** AgentBay closed to new customers on 2026-11-02. Successor is Agent Sandbox Express (Flash) Edition. NOTES.md.
- **AI Guardrails is available internationally.** Bill each enabled detection type separately at $6 per 10,000 calls in Singapore. Commodity code: `lvwang_guardrail_public_intl`. NOTES.md.
- **Insert HITL nodes based on risk-tiered approval.** Do not route every action through human review (causes rubber-stamping); match oversight to risk and reversibility. [https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec04-bp02.html]
- **Never promise Singapore-only inference for International scope.** Region decides access/storage; deployment scope decides where inference runs (can be outside mainland China). NOTES.md.
- **Warn that Application Development APIs are gated.** Zero-code app features (knowledge base, application data, prompt engineering) in Singapore are preview and restricted to accounts created before 2025-04-21. NOTES.md.

## 2. Data for the catalog or model table

| ID / Name | Status | Region(s) | Price (Unit) | Scope / Notes |
|---|---|---|---|---|
| `qwen3.8-max` | GA | SG, Global | SG: $2/$6 per 1M tok. Global: $1.65/$4.95 | Input/Output. Cache discounts vary by model. |
| `qwen3.8-flash` | GA | SG, Global | SG cache: implicit hit $0.016, explicit creation $0.20 per 1M tok. Global: $0.014 / $0.177 | Batch/fine-tuning unsupported in SG. Free quota 1M tok/90 days kept. |
| `qwen-plus` (thinking) | GA | SG | $4 per 1M output tok | At input ≤256K. |
| `qwen-long` | Legacy | SG | N/A | Supports structured output. No thinking, function calling, or built-in tools. Not recommended. |
| `qwen3.5-ocr` | GA | SG | N/A | Replaces `qwen-vl-ocr-2024-10-28`. Default 4,096 output tokens. |
| `qwen3-rerank` | GA | SG | N/A | Older rerank model deprecated 2026-05-30. |
| `qwen-audio-3.1-asr-flash` | GA | SG | $0.93 input / $0.70 output per 1M tok | Streaming ASR. |
| `qwen3.8-omni-flash` | GA | 6 regions incl. SG | N/A | |
| Web Search Tool | GA | SG | $10 per 1,000 calls + tokens | Cost estimator must add this fee. |
| Web Search Image (`web_search_image`) | GA | SG | $8 per 1,000 calls + tokens | |
| AI Guardrails | GA | SG, HK, Frankfurt, VA | $6 per 10,000 calls per detection type | Types: content compliance, sensitive content, prompt injection. |
| AgentCore | GA | SG (+ 4 CN) | $0.000015/CU compute; Collab plane $0.60/hr | Free offer ended 2026-10-18. Knowledge-base connector is Beijing-only. |
| AgentRun (code-first) | GA | SG (`ap-southeast-1`) | N/A | Recommended. Low-code & FunAgent discouraged. |
| Agent Sandbox (Express/Flash) | GA | SG | Economy: $0.00000381/vCPU-s, $0.00000191/GiB-s. Default: $0.00000496/vCPU-s, $0.00000248/GiB-s | Successor to AgentBay. |
| IMS Conversational AI | GA | SG | $0.028/min + ARTC transport | Audio agent. |

## 3. Rules for the drawing model

- **Draw code-determined edges as solid and model-determined edges as dashed.** Fact: AWS defines orchestration as a spectrum from static workflows to dynamic graph orchestration where reasoning determines the path.
- **Draw exactly three out-edges for every HITL node: approve, edit, and reject-with-feedback.** Add an unbounded wait marker. Fact: LangGraph interrupts support approve/edit/reject; Temporal supports multi-day waits.
- **Draw a visible exit condition (max iterations or termination node) for every loop.** Fact: ADK LoopAgents require a termination condition; AutoGen group chats run indefinitely without one.
- **Draw ledgers, memory stores, and checkpoints as first-class shapes (e.g., cylinders/documents), not annotations.** Fact: Magentic uses task/progress ledgers; Reflexion uses episodic memory; LangGraph/Temporal use persistent checkpoints.
- **Label each node with a model tier badge (small/fast vs large/reasoning).** Assign cheapest tier to routing/classification/gating, largest to orchestrators/planners. Fact: AWS Well-Architected AGENTCOST02-BP01 mandates tiered model selection.
- **Never draw AgentBay as a recommended tool for new customers.** Draw Agent Sandbox instead. Fact: AgentBay closed to new purchases on 2026-11-02.
- **Never draw low-code Flow Agents or FunAgent as recommended architectures.** Draw code-first AgentRun. Fact: Low-code is in maintenance mode; FunAgent activation is discouraged.
- **Never draw PrivateLink connected to Singapore.** Fact: PrivateLink explicitly excludes Singapore.
- **Never draw AI Guardrails as a single bundled cost.** Draw it as per-detection-type billing. Fact: Billed at $6 per 10,000 calls for *each* enabled detection type.
- **For deep research patterns, draw 3–5 parallel subagents under one lead agent.** Fact: Anthropic's shipped configuration uses 3–5 parallel subagents to cut time up to 90%.

## 4. Traps

- **AgentBay looks GA but is dead for new users.** Closed 2026-11-02. Existing users continue, but no new features. Use Agent Sandbox.
- **"Evalator-optimizer" is Anthropic's term, not Google's.** If integrating with ADK/Google docs, map it to "review and critique", "iterative refinement", or "loop-agent".
- **Prompt chaining sagas do not use compensating transactions.** Recovery comes from refinement, retries, and replanning. Compensating transactions belong to distributed-service sagas.
- **McKinsey's "1,000× token multiplier" is not a general rule.** It compares single-turn code reasoning with multi-turn coding chat, not general customer conversations.
- **Zero-data retention is not universal.** Requires enterprise eligibility and supported models. Calls to unsupported models silently fall back to standard retention. Excludes Batch, RAG, orchestration, and Playground.
- **Free quotas were largely removed on 2026-10-29.** Only specific models like `qwen3.8-flash` retain the 1M token/90-day free quota in Singapore. "Free Quota Only" is off by default.
- **China-only items to exclude from international proposals:** `qwen-mt-uni`, ADBAgent Skills, AI Search Open Platform (no SG region), Model Studio CLI MCP/Skills, MaxCompute remote MCP, WeChat/shopping assistant recipes, CosyVoice v3.5, SSML/LaTeX speech.
- **Application Development APIs look available in SG but are gated.** Preview only, restricted to accounts created before 2025-04-21.
- **`dashscope.aliyuncs.com` feature freeze.** Stopped receiving new features after 2026-09-30. Still works, but SG apps must migrate to workspace-specific hosts.
- **ADK 2.0 deprecated template workflows.** Sequential, parallel, and loop template agents are replaced by graph-based and dynamic workflows.

## 5. Open questions

- **qwen3.8-flash explicit-hit cache price in International scope.** Implicit creation is $0.20, but the exact explicit-hit price is unconfirmed.
- **Batch API availability inconsistencies.** The batch page allows `qwen3.8-max` (multimodal only) while its model page says batch is unsupported. Same for `qwen-flash`. Must be checked per model.
- **qwen3-vl-flash Singapore availability.** Missing from the live pricing page; treat as unconfirmed.
- **AgentRun Open Platform scope.** Unclear if the "do not activate" warning applies to the entire Open Platform or just FunAgent. Pending batch 3 adjudication.
- **AI Guardrails minimum token billing in Singapore.** The 1,000-token minimum per check was seen on a China-site integration page; whether it applies identically in SG is unverified.