# Digest: AI & Agents View — Implementation Plan

## 1. Decisions this supports

- **Draw a human-approval node before every irreversible, financial or external-send step; log reviewer identity and timestamp.** ([OpenAI guide](https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/), [AWS AGENTSEC04-BP02](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec04-bp02.html))
- **Draw explicit `max_turns` / recursion-limit and per-task token/cost budget on every agent loop node; auto-insert defaults if missing.** ([OpenAI Agents SDK](https://openai.github.io/openai-agents-python/running_agents/), [LangGraph recursion_limit](https://reference.langchain.com/python/langchain-core/runnables/config/RunnableConfig/recursion_limit))
- **Tag every side-effecting tool as idempotent and attach an idempotency key field in the diagram.** ([AWS AGENTREL06-BP04](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel06-bp04.html), [Stripe idempotent requests](https://docs.stripe.com/api/idempotent_requests))
- **Split any workflow that combines private data + untrusted content + outbound comms into separate runtimes/credentials (lethal trifecta).** ([Simon Willison](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/), [Anthropic containment](https://www.anthropic.com/research/how-we-contain-claude))
- **Insert a prompt-injection filter node between retrieval and the drafting model; retrieved content is untrusted input.** ([OWASP ASI06](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/), [Azure Prompt Shields](https://learn.microsoft.com/en-us/azure/ai-services/content-safety/concepts/jailbreak-detection))
- **Cost estimator must add tool-call fees (e.g. web search) to token costs, not just tokens.** (NOTES.md Batch 1)
- **Cost estimator must accept deployment scope (International vs Global) because prices differ for the same model ID.** (NOTES.md Batch 1)
- **Recommend AgentCore code-first runtime for agent orchestration in Singapore; never recommend low-code Flow Agent or Open Platform/FunAgent.** (NOTES.md Adjudicate-1)
- **Recommend AI Guardrails for international safety checks; bill per enabled detection type ($6/10k calls each).** (NOTES.md Adjudicate-1)
- **Recommend Agent Sandbox (Flash/Economy/Default) for code execution; never recommend AgentBay for new customers.** (NOTES.md Adjudicate-1)
- **Use workspace-specific Model Studio endpoints (`{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com`) in all generated configs.** (NOTES.md Adjudicate-1)
- **Warn in proposals: Singapore storage does not guarantee Singapore-only inference; International-scope requests may process outside mainland China.** (NOTES.md Batch 1)
- **Use `/compatible-mode/v1/responses` for Responses API; the old path is unmaintained.** (NOTES.md Batch 1)
- **Budget ~4× chat tokens for single-agent, ~15× for multi-agent cost estimates.** ([Anthropic multi-agent research](https://www.anthropic.com/research/multi-agent-research-system))

## 2. Data for the catalog or model table

| ID | Name / Type | Status | Region(s) | Price | Unit | Scope / Notes |
|---|---|---|---|---|---|---|
| `qwen3.8-max` | LLM | GA | SG, Global | $2.00 in / $6.00 out (SG); $1.65 / $4.95 (Global) | per 1M tokens | Batch unsupported per model page despite batch page listing it. Cache discounts are exceptions—quote per-model. |
| `qwen3.8-flash` | LLM | GA | SG, Global | Cache hit $0.016 (SG implicit), creation $0.20 (SG explicit) | per 1M tokens | Batch and fine-tuning unsupported in SG. Free quota 1M tokens/90 days kept. |
| `qwen-plus` | LLM | GA | SG | Thinking output: $4.00 | per 1M tokens | At input ≤256K. |
| `qwen-long` | LLM | Legacy | SG | — | — | Supports structured output only. No thinking, function calling, or built-in tools. Not recommended. |
| `qwen3.5-ocr` | Vision/OCR | GA | SG | — | per 1M tokens | Default 4,096 output tokens; commercial manager raises toward 8,192. Migrate from `qwen-vl-ocr-2024-10-28`. |
| `qwen3-rerank` | Rerank | GA | SG | — | — | Older rerank model deprecated 2026-05-30. |
| `qwen-audio-3.1-asr-flash` | ASR | GA | SG | $0.93 in / $0.70 out | per 1M tokens | Streaming. |
| Web Search | Built-in Tool | GA | SG | $10.00 | per 1,000 calls | Plus tokens added. ID: `web_search`. Image search is `web_search_image` at $8/1k. |
| Code Interpreter | Built-in Tool | Free (limited) | SG | $0.00 | — | Adds tokens. |
| Web Extractor | Built-in Tool | Free (limited) | SG | $0.00 | — | Adds tokens. |
| AI Guardrails | Safety | GA | SG, HK, FRA, VA | $6.00 | per 10,000 calls | Per enabled detection type (compliance, sensitive, injection). Code: `lvwang_guardrail_public_intl`. Endpoint: `green-cip.ap-southeast-1.aliyuncs.com`. |
| AgentCore | Orchestration | GA | SG | $0.000015 / CU compute; $0.60 / hr collab plane | — | Code-first recommended. Free offer ended 2026-10-18. Knowledge-base connector is Beijing-only. |
| Agent Sandbox | Compute | GA | SG | Economy: $0.00000381 vCPU-s, $0.00000191 GiB-s. Default: $0.00000496 vCPU-s, $0.00000248 GiB-s | — | Successor to AgentBay. Flash Edition also lists US Silicon Valley. |
| Content Moderation V2.0 | Safety | GA | SG | $0.30 | per 1,000 tasks | Text. |
| IMS Conversational AI | Audio Agent | GA | SG | $0.028 | per minute | Plus ARTC transport. |
| Tablestore Knowledge Storage | Memory/RAG | GA | SG | Billed separately | Storage + Compute | Customer data stays in customer OSS/Tablestore. |

## 3. Rules for the drawing model

- **Draw a Human Approval node before any tool that sends emails, moves money, deletes data, or publishes externally.** Fact: OpenAI guide gates on "sensitive, irreversible, or high stakes"; OWASP LLM06 requires human approval for high-impact actions.
- **Draw a Prompt Injection Filter node between any Retrieval node and the LLM that drafts the response.** Fact: Retrieved content is untrusted input (OWASP ASI06, Azure Prompt Shields).
- **Never draw a single agent node that holds private data, reads untrusted content, and sends outbound comms.** Split into two agents or gate egress. Fact: Lethal trifecta enables exfiltration (Simon Willison, Anthropic red-team 24/25 success).
- **Always annotate loops with `max_turns`, timeout, and token/cost budget.** Fact: Unbounded loops are the #1 runaway-cost failure (OpenAI Agents SDK, LangGraph recursion_limit default 25).
- **Tag write-tools as `idempotent=true` and include an idempotency-key parameter.** Fact: Retries duplicate side effects without it (AWS AGENTREL06-BP04, Stripe).
- **Use `agent-sandbox` for code execution nodes; never use `agentbay` for new designs.** Fact: AgentBay closed to new customers 2026-11-02 (NOTES.md Adjudicate-1).
- **Use `ai-guardrails` for international safety nodes; count each enabled detection type separately in cost.** Fact: Available internationally including SG; $6/10k per type (NOTES.md Adjudicate-1).
- **Route API calls to `{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1`; never draw `dashscope.aliyuncs.com` or legacy Responses paths.** Fact: Feature-frozen 2026-09-30; workspace hosts recommended (NOTES.md Adjudicate-1).
- **Add web-search tool fees ($10/1k in SG) to cost-per-run estimates, not just token costs.** Fact: Tool calls carry independent fees (NOTES.md Batch 1).
- **Label deployment scope (International vs Global) on every model node; do not assume region = price.** Fact: qwen3.8-max is $2/$6 (SG) vs $1.65/$4.95 (Global) (NOTES.md Batch 1).
- **Never draw MCP nodes sourced from Model Studio CLI or MaxCompute remote MCP for international customers.** Fact: China-site only (NOTES.md Batch 3).

## 4. Traps

- **AgentBay** looks GA in old catalogs but is closed to new customers since 2026-11-02. Use Agent Sandbox.
- **AI Guardrails overview** previously said "Shanghai only." It is now confirmed available in SG, HK, FRA, VA. The old line is stale.
- **Assistant API** is deprecated. The international multi-agent tutorial pointing to it is also deprecated. Use Responses API.
- **AgentRun Low-Code / FunAgent** is in maintenance mode; Alibaba advises new users not to activate it. Only the code-first runtime is recommended.
- **PrivateLink** still excludes Singapore despite legacy endpoint examples containing `ap-southeast-1`.
- **Application Development (zero-code apps, knowledge base, prompt engineering APIs)** is gated to accounts that created SG apps before 2025-04-21 and is preview. New international accounts cannot use Alibaba's zero-code Q&A/RAG tutorials.
- **ADBAgent Skills** and **AI Search Open Platform** exclude Singapore.
- **qwen-mt-uni** is Beijing/China-site only. Do not list in international catalog.
- **qwen-long** and **qwen3.7-max** are marked legacy and no longer recommended.
- **Singapore storage ≠ Singapore inference.** International-scope requests can process outside mainland China. Do not promise residency based on storage region alone.
- **Zero Data Retention** requires enterprise eligibility; unsupported models silently fall back to standard retention rather than failing. Excludes Batch, RAG, orchestration, Playground.
- **Free quotas** were removed for many models on 2026-10-29. Only specific models like `qwen3.8-27b` retain 1M free tokens in SG.
- **Batch API** availability is inconsistent per model in SG (e.g., `qwen3.8-flash` lists batch unsupported; `qwen3.8-max` contradicts itself between batch page and model page). Check per model.
- **Model Studio `dashscope.aliyuncs.com`** stopped receiving new features after 2026-09-30.

## 5. Open questions

- **AgentRun Open Platform upgrade scope:** Is the "do not activate" warning for the whole of AgentRun or only FunAgent? (Check in batch 3 follow-up).
- **qwen3.8-flash explicit cache hit price (International):** Confirmed at $0.20 for creation, but the explicit-hit read price is unconfirmed.
- **qwen3-vl-flash Singapore availability:** Missing from live pricing page; treat as unconfirmed.
- **AI Guardrails token minimum billing in SG:** The 1,000-token minimum was seen on a China-site integration page; unverified for Singapore.
- **OpenAI Agents SDK default `max_turns`:** Conflicting reports (5 vs 10). Verify against installed version before hardcoding defaults.
- **AgentCore knowledge-base connector:** Read-only from Beijing Model Studio KBs. Is there a roadmap for SG-native KB connectors?
- **Windows Computer Use Sandbox:** Listed as invitational preview requiring support contact. No GA date confirmed.
- **Android sandbox replacement:** No confirmed AgentBay successor for Android for new customers.