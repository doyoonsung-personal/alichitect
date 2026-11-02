I'll research this systematically, starting with the primary vendor sources.

Only `web_search` is available, so I'll run many targeted queries to extract specifics from each primary source.

# Canonical agentic workflow patterns — vendor‑neutral catalogue for the diagram app

**Prepared 2026‑11‑02.** Method: ~20 rounds of web search against vendor engineering pages, official docs and papers. Every load‑bearing fact carries its source URL. Items I could only confirm in secondary summaries are flagged **(secondary‑only)**; items I could not confirm are flagged **unconfirmed**.

**No contradiction found** with the facts your team verified on 2026‑10‑31 about Alibaba Cloud Model Studio / AgentRun / AgentLoop. Nothing in this report touches those products; this brief is vendor‑neutral pattern guidance only. (Date‑sensitive findings below that are newer than 2026‑10‑31: none — the newest primary sources I cite are Anthropic's multiagent‑systems research, reported by secondary sources as published ~2026‑08‑13 [https://shamylmansoor.com/blog/multi-agent-ai-systems-coordination-problems/], and Cognition's follow‑up of 2026‑04‑22 [https://cognition.com/blog/multi-agents-working].)

---

## 1. Source map (what the app's catalogue should be built on)

| # | Source | URL | What it canonicalises |
|---|---|---|---|
| S1 | Anthropic, *Building effective agents* | https://www.anthropic.com/research/building-effective-agents | Workflow vs agent split; 5 workflow patterns + autonomous agent; augmented LLM; start‑simple |
| S2 | Anthropic, *How we built our multi-agent research system* | https://www.anthropic.com/research/multi-agent-research-system | Orchestrator‑worker / deep‑research reference architecture; token economics; delegation prompting |
| S3 | Anthropic, *Effective context engineering for AI agents* | https://www.anthropic.com/research/effective-context-engineering-for-ai-agents | "LLMs autonomously using tools in a loop"; compaction / note‑taking / sub‑agents |
| S4 | Anthropic, *Patterns and problems in emerging multiagent systems* | https://www.anthropic.com/research/multiagent-systems | Multi‑agent failure classes: conformity, epistemic failures, incompatible goals |
| S5 | Anthropic, *Effective harnesses for long-running agents* | https://www.anthropic.com/research/effective-harnesses-for-long-running-agents | Long‑running / multi‑context‑window harness (initializer + incremental worker) |
| S6 | Anthropic, *Code execution with MCP* | https://www.anthropic.com/research/code-execution-with-mcp | Tool‑context cost control (load tools on demand, filter results before they reach the model) |
| S7 | OpenAI, *A practical guide to building agents* (PDF) | https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf ; landing page https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/ | Agent definition; single vs multi‑agent; manager vs decentralised; guardrail types; human intervention |
| S8 | OpenAI Agents SDK docs (handoffs, guardrails, HITL) | https://openai.github.io/openai-agents-python/ ; https://openai.github.io/openai-agents-python/human_in_the_loop/ ; https://openai.github.io/openai-agents-python/guardrails/ ; https://developers.openai.com/api/docs/guides/agents/guardrails-approvals | Runner‑executed agent loop, `needs_approval`/interruptions, input/output guardrails |
| S9 | Google ADK docs — workflow agents & multi‑agent | https://adk.dev/workflows/ ; https://adk.dev/agents/workflow-agents/sequential-agents/ ; .../parallel-agents/ ; .../loop-agents/ ; https://adk.dev/agents/custom-agents/ | Sequential / Parallel / Loop template agents; `sub_agents` hierarchy; `transfer_to_agent` |
| S10 | Google Cloud Architecture Center, *Choose a design pattern for your agentic AI system* | https://docs.cloud.google.com/architecture/choose-design-pattern-agentic-ai-system | 9‑pattern catalogue + 3‑step selection process + per‑pattern cost notes |
| S11 | Google Cloud, *Multi-agent AI system in Google Cloud* / *Choose your agentic AI architecture components* | https://docs.cloud.google.com/architecture/multiagent-ai-system ; https://docs.cloud.google.com/architecture/choose-agentic-ai-architecture-components | Model‑selection and component‑selection guidance |
| S12 | LangGraph / LangChain docs | https://docs.langchain.com/oss/python/langgraph/workflows-agents ; https://docs.langchain.com/oss/python/langgraph/interrupts ; https://docs.langchain.com/oss/python/langchain/human-in-the-loop ; https://docs.langchain.com/oss/python/langchain/multi-agent/handoffs ; https://docs.langchain.com/oss/python/langgraph/agentic-rag ; https://docs.langchain.com/oss/python/deepagents/overview | Workflow/agent patterns, `interrupt` + persistence, HITL approve/edit/reject, handoffs, agentic RAG, deep agents |
| S13 | LangChain engineering blogs | https://www.langchain.com/blog/planning-agents ; https://www.langchain.com/blog/agentic-rag-with-langgraph ; https://www.langchain.com/blog/introducing-ambient-agents ; https://www.langchain.com/blog/runtime-behind-production-deep-agents | Plan‑and‑execute/ReWOO/LLMCompiler; Self‑RAG & CRAG; ambient (event‑driven) agents; durable execution |
| S14 | Microsoft Azure Architecture Center, *AI Agent Orchestration Patterns* | https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns | Sequential / concurrent / group chat / maker‑checker / handoff / magentic + "Best for / Watch out for" table |
| S15 | Microsoft Agent Framework docs | https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/ ; .../group-chat ; .../handoff ; .../magentic ; https://learn.microsoft.com/en-us/agent-framework/workflows/human-in-the-loop ; https://learn.microsoft.com/en-us/agent-framework/agents/tools/tool-approval | The same five orchestrations as code primitives; HITL and tool approval; magentic plan review |
| S16 | Microsoft Cloud Adoption Framework, *Choosing Between Building a Single-Agent System or Multi-Agent System* | https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ai-agents/single-agent-multiple-agents | Single vs multi‑agent decision criteria |
| S17 | AWS Prescriptive Guidance, *Agentic AI patterns and workflows on AWS* | https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/introduction.html (+ `workflow-for-prompt-chaining.html`, `workflow-for-orchestration.html`, `workflow-for-evaluators-and-reflect-refine-loops.html`, `saga-orchestration-patterns.html`, `multi-agent-collaboration.html`, `memory-augmented-agents.html`, `agent-patterns.html`) | Agent patterns vs workflow patterns; prompt chaining/routing/parallelization/orchestration/evaluator loops; saga; AWS service mapping |
| S18 | AWS Well‑Architected **Agentic AI Lens** | https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentic-ai-lens.html (+ `definitions.html`, `agentcost01.html`, `agentcost02.html`, `agentcost02-bp01.html`, `agentsec04-bp02.html`, `agentperf02-bp02.html`) | Static‑workflow→dynamic‑orchestration spectrum; cost pillars; tiered model selection; risk‑tiered human approval |
| S19 | AWS ML Blog, *Building ambient agents with Amazon Bedrock AgentCore* | https://aws.amazon.com/blogs/machine-learning/building-ambient-agents-with-amazon-bedrock-agentcore-from-event-driven-signals-to-human-in-the-loop-workflows/ (+ sample https://github.com/aws-samples/sample-ambient-agents-on-agentcore) | Event‑driven/scheduled agents; notify / question / review HITL patterns |
| S20 | Papers: ReAct, Reflexion, Plan‑and‑Solve, LLMCompiler, Multiagent Debate, Magentic‑One, MAST, Agentic RAG survey | https://arxiv.org/abs/2210.03629 ; https://arxiv.org/abs/2303.11366 ; https://arxiv.org/abs/2305.04091 ; https://arxiv.org/abs/2312.04511 ; https://arxiv.org/abs/2305.14325 ; https://arxiv.org/abs/2411.04468 ; https://arxiv.org/abs/2503.13657 ; https://arxiv.org/abs/2501.09136 | The academic definitions of the loop, reflection, planning, parallel function calling, debate, ledger orchestration, failure taxonomy, agentic RAG taxonomy |
| S21 | Named practitioners: Cognition (Walden Yan), HumanLayer (12‑Factor Agents) | https://cognition.com/blog/dont-build-multi-agents ; https://cognition.com/blog/multi-agents-working ; https://github.com/humanlayer/12-factor-agents ; https://www.humanlayer.dev/blog/12-factor-agents | Counter‑position on multi‑agent; control‑flow ownership; pause/resume; contact‑humans‑as‑tools |
| S22 | Temporal docs, *Durable AI* | https://docs.temporal.io/ai | Durable execution semantics for long‑running / HITL‑blocked agents |
| S23 | Deep‑research products | https://openai.com/index/introducing-deep-research/ ; https://ai.google.dev/gemini-api/docs/deep-research ; https://gemini.google/overview/deep-research/ | Managed deep‑research agent shape (plan → browse → synthesise → cite) |

---

## 2. Cross‑cutting decision guidance

### 2.1 Workflow versus agent (the load‑bearing distinction)

* **Anthropic's definitions.** Workflows are systems where LLMs and tools are orchestrated through **predefined code paths**; agents are systems where **LLMs dynamically direct their own processes and tool usage, maintaining control over how they accomplish tasks** [https://www.anthropic.com/research/building-effective-agents]. LangGraph restates the same split: "Workflows have predetermined code paths and are designed to operate in a certain order. Agents are…" [https://docs.langchain.com/oss/python/langgraph/workflows-agents].
* **The trade rule.** "Agentic systems often trade latency and cost for better task performance, and you should consider when this tradeoff makes sense" [https://www.anthropic.com/research/building-effective-agents]. "When more complexity is warranted, workflows offer predictability and consistency for well‑defined tasks, whereas agents are the better option when flexibility and model‑driven decision‑making are needed at scale" [https://www.anthropic.com/research/building-effective-agents].
* **The default is *not* an agent.** "For many applications, however, optimizing single LLM calls with retrieval and in‑context examples is usually enough" [https://www.anthropic.com/research/building-effective-agents].
* **Agents are for unpredictable step counts.** "Agents can be used for open‑ended problems where it's difficult or impossible to predict the required number of steps, and where you can't hard‑code a fixed path" [https://www.anthropic.com/research/building-effective-agents]. Anthropic's later, shorter definition: agents are "**LLMs autonomously using tools in a loop**" [https://www.anthropic.com/research/effective-context-engineering-for-ai-agents].
* **AWS frames it as a spectrum, not a binary.** "Orchestration patterns range from static workflows (fully defined at design time) to dynamic graph orchestration (where the agent's reasoning determines the…)" [https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/definitions.html].
* **OpenAI's equivalent line.** "Agents are systems that independently accomplish tasks on your behalf. A workflow is a sequence of steps that must be executed to meet the user's goal" [https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf].
* **Practitioner control‑flow rule.** 12‑Factor Agents: *own your control flow* — let the model choose actions but keep the `if`/`while` in your code, and *contact humans with tool calls* [https://github.com/humanlayer/12-factor-agents] [https://www.humanlayer.dev/blog/12-factor-agents].

### 2.2 "Start simple; add complexity only when it pays"

| Statement | Source |
|---|---|
| "We recommend finding the simplest solution possible, and only increasing complexity when needed" (as quoted from the post) | https://www.anthropic.com/research/building-effective-agents (quote reproduced at https://www.linkedin.com/pulse/this-breakdown-of-building-ai-agents-is-a-activity-7492089606201593856-T0m-) |
| "We suggest that developers start by using LLM APIs directly: many patterns can be implemented in a few lines of code" | https://www.anthropic.com/research/building-effective-agents |
| "A single agent can handle many tasks by incrementally adding tools, keeping complexity manageable and simplifying evaluation and maintenance" | https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf |
| Selection process starts from requirements (task complexity, latency/performance expectations, cost budget, need for human involvement), then review patterns, then select | https://docs.cloud.google.com/architecture/choose-design-pattern-agentic-ai-system (steps reproduced at https://github.com/surlymochan/awesome-ai-agents-2027/blob/main/ai-orchestrator.md) |
| Single agent first: "Well‑defined problem domains. Choose single agents when workflows follow predictable patterns within bounded…" | https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ai-agents/single-agent-multiple-agents |
| Strongest counter‑weight to premature multi‑agent: *Don't Build Multi‑Agents* | https://cognition.com/blog/dont-build-multi-agents |
| Cognition's 2026 revision: multi‑agent works in a narrow class — "one main loop carries state, subagents are stateless workers with narrow scope" | https://cognition.com/blog/multi-agents-working (also https://x.com/walden_yan/status/2047054554433462360) |

### 2.3 Single‑agent vs multi‑agent: the economic gate

* Agents use **~4× more tokens than a chat interaction; multi‑agent systems ~15× more** — Anthropic's own economics statement for its research system [https://www.anthropic.com/research/multi-agent-research-system] (widely quoted, e.g. https://www.constellationr.com/insights/news/anthropics-multi-agent-system-overview-must-read-cios).
* Anthropic's justification for paying it: a **Claude Opus 4 lead agent with Claude Sonnet 4 subagents outperformed single‑agent Claude Opus 4 by 90.2%** on its internal research eval [https://www.anthropic.com/research/multi-agent-research-system].
* AWS: "Agent reasoning cycles consume tokens through iterative plan‑execute‑verify‑reflect loops, and multi‑agent coordination adds multiplicative overhead" [https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost01.html].
* Google Cloud: the coordinator pattern "results in more model calls than a single‑agent system" [https://docs.cloud.google.com/architecture/choose-design-pattern-agentic-ai-system].
* McKinsey (consulting estimate, treat as indicative): agentic tasks can consume roughly **1,000× more tokens** than single‑turn reasoning/chat [https://www.mckinsey.com/capabilities/quantumblack/our-insights/is-that-ai-agent-worth-it-agentic-economics-and-the-modern-operating-model].
* Anthropic's frontier‑team warning on *behavioural* (not just cost) risk in multi‑agent deployments: sections "Measuring coordination", "Failures from conformity", "Epistemic failures", "Incompatible goals" [https://www.anthropic.com/research/multiagent-systems].

### 2.4 Published decision trees / selection processes

1. **Google Cloud Architecture Center — 3‑step selection process** (the closest thing to a published decision procedure from a hyperscaler): define requirements (task complexity, latency/performance, cost budget, need for human involvement) → review the common single‑agent and multi‑agent patterns → select a pattern [https://docs.cloud.google.com/architecture/choose-design-pattern-agentic-ai-system].
2. **Microsoft Cloud Adoption Framework — single vs multi‑agent criteria** [https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ai-agents/single-agent-multiple-agents].
3. **AWS Agentic AI Lens — static→dynamic orchestration spectrum** plus per‑pillar best practices (cost, reliability, security, performance) [https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/definitions.html] [https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/appendix-a.html].
4. **Anthropic's implicit ladder**: augmented LLM → workflow patterns (chaining, routing, parallelization, orchestrator‑workers, evaluator‑optimizer) → autonomous agents [https://www.anthropic.com/research/building-effective-agents].
5. **A written decision *tree* exists only in practitioner literature, not in vendor docs** — e.g. Machine Learning Mastery, *Choosing the Right Agentic Design Pattern: A Decision‑Tree Approach* [https://machinelearningmastery.com/choosing-the-right-agentic-design-pattern-a-decision-tree-approach/]. **No hyperscaler or model lab publishes a complete cross‑pattern decision tree** (my assessment from the searches above; mark as *unconfirmed absence* rather than a proven negative).

**Suggested tree for the app** (synthesis of S1/S7/S10/S16/S18, each step traceable to a cited page):

```
Can a single tuned LLM call + retrieval solve it?  → yes: no diagram, one node [S1]
Are the steps known and fixed in advance?          → yes: WORKFLOW
    ├─ linear, each step needs the previous        → prompt chaining (+gate) [S1][S17]
    ├─ distinct input categories                   → routing [S1][S17]
    ├─ independent subtasks / need consensus       → parallelization (sectioning|voting) [S1][S9]
    ├─ subtasks NOT known until runtime            → orchestrator-workers [S1][S10][S17]
    └─ clear eval criteria + refinement pays       → evaluator-optimizer / review-critique [S1][S10][S17]
Steps unknown, model must decide path              → AGENT: ReAct tool loop [S1][S20-ReAct]
    ├─ long horizon / many tools / cost-sensitive  → plan-and-execute | LLMCompiler [S13][S20]
    ├─ one context can't hold the task             → subagents under ONE stateful loop [S2][S21]
    ├─ needs peers to challenge each other         → group chat / debate [S14][S20]
    ├─ specialist emerges mid-conversation         → handoffs / swarm [S7][S8][S10][S14]
    ├─ no known recipe, must plan+replan           → magentic (task/progress ledger) [S14][S15][S20]
    ├─ needs grounding                             → (agentic) RAG [S12][S20-survey]
    ├─ triggered by events/schedules, long-running → event-driven + durable execution [S19][S22]
    └─ open web research report                    → deep research [S2][S23]
Any branch with irreversible / high-risk action    → insert HITL node [S18][S19][S12]
```

---

## 3. Pattern catalogue

Field order per pattern: **Definition · Nodes & edges (drawing spec) · Use / don't use · Model per node · Failure modes & mitigations · Cost & latency · Human approval point · Sources.**

---

### 3.1 Prompt chaining (with gates)

* **Definition.** "Prompt chaining decomposes a task into a sequence of steps, where each LLM call processes the output of the previous one"; you "can add programmatic checks (see 'gate' in the diagram below) on any intermediate steps" [https://www.anthropic.com/research/building-effective-agents]. AWS: "Prompt chaining breaks complex tasks into sequential LLM steps, enabling structured reasoning and control for multistage AI processes" [https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/workflow-for-prompt-chaining.html].
* **Nodes & edges.** `input → LLM₁ → [gate₁] → LLM₂ → [gate₂] → … → output`. Gates are **code nodes, not LLM nodes** (programmatic checks) [https://www.anthropic.com/research/building-effective-agents]. Each gate has two out‑edges: *pass → next LLM*, *fail → terminate/retry/repair branch*. Google's equivalent is the multi‑agent **sequential pattern**, "executes a [sequence of specialized subagents]" [https://docs.cloud.google.com/architecture/choose-design-pattern-agentic-ai-system]; ADK's is `SequentialAgent`, which "executes its sub‑agents in the order they are specified in a list" [https://adk.dev/agents/workflow-agents/sequential-agents/]. Azure calls it **sequential orchestration** [https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns].
* **Use when.** Tasks that "can be logically divided into sequential reasoning steps" and where tradeoffs favour accuracy/consistency over latency [https://docs.aws.amazon.com/pdfs/prescriptive-guidance/latest/agentic-ai-patterns/agentic-ai-patterns.pdf]. **Don't use** when the path can't be predicted up front — that's the agent case [https://www.anthropic.com/research/building-effective-agents].
* **Model per node.** Cheapest tier that passes the gate per stage; AWS's tiered‑selection practice — "routine classification and formatting handled by cost‑efficient models and premium models reserved for reasoning" — applies directly to chain stages [https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost02.html].
* **Failure modes → mitigations.** (a) **Error propagation** down the chain — mitigate with a gate after every stage (the gate is the pattern's defining control) [https://www.anthropic.com/research/building-effective-agents]; (b) latency grows linearly with stage count [https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost01.html]; (c) for multi‑step writes, no compensation — AWS covers this with the **prompt chaining saga pattern** (compensating transactions) [https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/prompt-chaining-saga-patterns.html].
* **Cost & latency.** N LLM calls, serial → latency ≈ Σ stage latency; token cost ≈ N × stage cost, but each stage carries a shorter, more focused prompt than one mega‑prompt [https://www.anthropic.com/research/building-effective-agents].
* **Human approval.** Optional gate replacement: AWS documents prompt chaining **with** human decision steps in the chain [https://aws.amazon.com/blogs/machine-learning/building-generative-ai-prompt-chaining-workflows-with-human-in-the-loop/].
* **Sources.** S1, S14, S17, S9.

---

### 3.2 Routing (classifier → specialised handlers)

* **Definition.** Classify an input, then direct it to a specialised follow‑up task/handler [https://www.anthropic.com/research/building-effective-agents] (definition text also reproduced in a copy of the post: https://www.hkdca.com/wp-content/uploads/2025/02/how-to-build-effective-ai-agents-anthropic.pdf).
* **Nodes & edges.** `input → classifier node (LLM or code) → N mutually exclusive edges → handler₁…handler_N → (optional) merge → output`. Draw the classifier as a **decision diamond** with a labelled edge per category and a default/fallback edge. AWS has a dedicated page, *Workflow for routing* [https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/introduction.html].
* **Use when.** "Routing works well for complex tasks where there are distinct categories that are better handled separately, and where classification [accuracy is achievable]" [https://www.anthropic.com/research/building-effective-agents]. **Don't use** when categories overlap heavily or when the number of steps within a category is itself unpredictable — then use an orchestrator or an agent [https://www.anthropic.com/research/building-effective-agents].
* **Model per node.** This is the canonical **small/fast model** node: AWS's tiered‑selection best practice explicitly assigns "routine classification and formatting" to cost‑efficient models and reserves premium models for reasoning [https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost02.html] and [https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf02-bp02.html]. Handlers may each use a *different* model/prompt tuned to their category — that is the point of the pattern [https://www.anthropic.com/research/building-effective-agents].
* **Failure modes → mitigations.** Misclassification silently sends work to the wrong handler → mitigate with a confidence threshold + default/fallback branch; OpenAI's guardrail taxonomy treats a **relevance classifier** ("flags off‑topic queries") as a first‑class guardrail layer, which is the same node used defensively [https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf]. Azure's "watch out for" column for routing‑style delegation is unpredictable specialist selection [https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns].
* **Cost & latency.** One extra cheap call on the critical path (+~1 round trip); downstream cost depends entirely on the chosen branch. Cheapest way to avoid paying a frontier model for easy traffic [https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost02-bp01.html].
* **Human approval.** Usually none inside the router; add HITL on the *low‑confidence* edge (escalate to a human queue) — consistent with risk‑tiered approval [https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec04-bp02.html].
* **Sources.** S1, S7, S14, S17, S18.

---

### 3.3 Parallelisation — sectioning and voting

* **Definition.** Two variations: **Sectioning** — "Breaking a task into independent subtasks run in parallel"; **Voting** — running the same task multiple times to get diverse samples [https://www.anthropic.com/research/building-effective-agents].
* **Nodes & edges.** `input → fan‑out node → {worker₁ … worker_k} → fan‑in/aggregator node → output`. The aggregator is either **code** (deterministic merge) or an **LLM** (synthesis) or a **majority/consensus vote** (code). Draw fan‑out and fan‑in as explicit bars so the parallelism is legible. ADK: `ParallelAgent` runs sub‑agents concurrently "potentially reducing the total research time significantly compared to running them sequentially" [https://adk.dev/agents/workflow-agents/parallel-agents/]; note all parallel children "access the same shared `session.state`" — draw a shared‑state swimlane [https://adk.dev/agents/custom-agents/]. Google Cloud: "Use the parallel pattern when sub‑tasks can be executed concurrently" [https://docs.cloud.google.com/architecture/choose-design-pattern-agentic-ai-system]. Azure calls it **concurrent orchestration** [https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns].
* **Use when.** "Parallelization is effective when the divided subtasks can be parallelized for speed, or when multiple perspectives or attempts are needed for higher confidence" [https://www.anthropic.com/research/building-effective-agents]. **Don't use** when subtasks have data dependencies — that's chaining; when the split is only knowable at runtime — that's orchestrator‑workers [https://www.anthropic.com/research/building-effective-agents].
* **Model per node.** Sectioning workers can each use the model suited to their slice; voting normally uses **the same model k times** (diversity comes from sampling, not model mix) [https://www.anthropic.com/research/building-effective-agents].
* **Failure modes → mitigations.** Partial failure of one branch (need per‑branch timeouts/retries and a degraded‑merge rule); shared‑state write collisions in ADK‑style parallel children [https://adk.dev/agents/custom-agents/]; vote cost blow‑up. AWS's concurrent/agentic cost guidance is to design cost‑aware reasoning patterns up front [https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost01.html].
* **Cost & latency.** Sectioning: **k× tokens, ~1× wall‑clock** (the latency win). Voting: **k× tokens and k× output cost** for confidence, not speed [https://www.anthropic.com/research/building-effective-agents]. Quantified precedent for parallel tool calling: Anthropic's research system ran 3–5 subagents in parallel, each making 3+ parallel tool calls, and reported **up to 90% reduction in research time** on complex queries [https://www.anthropic.com/research/multi-agent-research-system] **(figure confirmed only in secondary summaries: https://www.linkedin.com/posts/rpmachado_how-we-built-our-multi-agent-research-system-activity-7490673993558065153-O5zZ, https://zylos.ai/research/2026-04-21-deep-research-agent-architectures/)**. LLMCompiler gives the academic numbers for parallel function calling: **latency speedup up to 3.7×, cost savings up to 6.7×, accuracy +~9% vs ReAct** [https://arxiv.org/abs/2312.04511] [https://huggingface.co/papers/2312.04511].
* **Human approval.** Rarely inside the fan‑out; if the aggregate is consequential, put one approval on the aggregator output [https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec04-bp02.html].
* **Sources.** S1, S2, S9, S10, S14, S20 (LLMCompiler).

---

### 3.4 Orchestrator‑workers (dynamic decomposition)

* **Definition.** "In the orchestrator‑workers workflow, a central LLM dynamically breaks down tasks, delegates them to worker LLMs, and synthesizes their results" [https://www.anthropic.com/research/building-effective-agents]. Google Cloud: "The hierarchical task decomposition pattern is an implementation of the coordinator pattern. A top‑level parent, or root, agent receives a [task and decomposes it]" [https://docs.cloud.google.com/architecture/choose-design-pattern-agentic-ai-system]. AWS: "A central orchestrator agent uses an LLM to plan, decompose, and [delegate]"; "The orchestration workflow is ideal for scenarios that are complex, hierarchical…" [https://docs.aws.amazon.com/pdfs/prescriptive-guidance/latest/agentic-ai-patterns/agentic-ai-patterns.pdf] [https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/workflow-for-orchestration.html].
* **Nodes & edges.** `input → orchestrator (LLM) → [dynamic spawn] → worker₁…worker_k (each an LLM, often itself a small tool loop) → orchestrator (synthesis) → output`. Key drawing difference from parallelisation: **the fan‑out width is produced by the orchestrator at runtime**, so draw the fan‑out bar as dashed/model‑driven and show a back‑edge from workers into the orchestrator's synthesis step. Add an optional inner loop `orchestrator → workers → orchestrator (re-plan)`.
* **Use when.** Complex tasks where subtasks can't be pre‑enumerated; the key distinction from parallelisation is that subtasks are decided from the input [https://www.anthropic.com/research/building-effective-agents]. **Don't use** when a static split works — you pay an extra reasoning call per cycle and lose determinism [https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost01.html].
* **Model per node.** **Largest/reasoning model on the orchestrator, cheaper models on workers.** Production precedent: Claude Opus 4 lead + Claude Sonnet 4 subagents [https://www.anthropic.com/research/multi-agent-research-system]. Vendor guidance for the same shape: AWS tiered model selection [https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost02-bp01.html]; Google Cloud model‑selection guidance for multi‑agent systems [https://docs.cloud.google.com/architecture/multiagent-ai-system]; Anthropic's own cost/intelligence tradeoff page [https://platform.claude.com/docs/en/about-claude/models/optimizing-for-cost-and-intelligence].
* **Failure modes → mitigations.** Anthropic's headline mitigation is prompt‑level: "**Teach the orchestrator how to delegate**" — each subagent needs a clear objective, output format, tool/source guidance and task boundaries [https://www.anthropic.com/research/multi-agent-research-system]. Also: "Scale effort to query complexity" (agents misjudge how many workers a query deserves) and "Start wide, then narrow down" (agents default to too‑narrow searches) [https://www.anthropic.com/research/multi-agent-research-system]. MAST classifies these as **specification issues** and **inter‑agent misalignment** [https://arxiv.org/abs/2503.13657]. Cognition's structural mitigation: keep one stateful main loop and make subagents **stateless, narrow‑scope workers** [https://cognition.com/blog/multi-agents-working].
* **Cost & latency.** Multiplicative: 1 orchestrator reasoning call + k worker loops + synthesis; AWS names this "multiplicative overhead" [https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost01.html]; Google Cloud notes coordinator patterns produce "more model calls than a single‑agent system" [https://docs.cloud.google.com/architecture/choose-design-pattern-agentic-ai-system]. Latency can still improve vs serial because workers run concurrently [https://www.anthropic.com/research/multi-agent-research-system].
* **Human approval.** Best placed on the orchestrator's *plan* before fan‑out (Microsoft's magentic plan review is the same insertion point: `.with_plan_review()` / `MagenticHumanInterventionKind.PLAN_REVIEW` [https://learn.microsoft.com/en-us/python/api/agent-framework-core/agent_framework?view=agent-framework-python-latest] [https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/magentic]) and/or on irreversible worker actions [https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec04-bp02.html].
* **Sources.** S1, S2, S10, S14, S15, S17, S18, S21.

---

### 3.5 Evaluator‑optimizer (generate → critique → refine loop)

* **Definition.** One LLM call generates a response while another provides evaluation and feedback in a loop [https://www.anthropic.com/research/building-effective-agents]. Google Cloud splits this into two named patterns: **review and critique** ("The review and critique pattern is…") and **iterative refinement** [https://docs.cloud.google.com/architecture/choose-design-pattern-agentic-ai-system]. AWS: "Agentic evaluator loops use LLMs for dynamic output assessment and refinement, creating self‑improving AI systems through feedback" [https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/evaluator-reflect-refine-loop-patterns.html]. Microsoft calls the two‑agent instance a **maker‑checker loop**: "one agent, the maker, creates or proposes something, and another [agent checks it]" — and explicitly says it is "a specific type of group chat orchestration" [https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns].
* **Nodes & edges.** `input → generator (LLM) → evaluator (LLM or code) → decision{pass → output | fail → back to generator}`. **Always draw a bounded loop**: max‑iterations counter and an explicit exit edge. ADK's `LoopAgent` is the runtime primitive: it "repeatedly executes its sub‑agents for a specified number of iterations or until a termination condition is met" [https://adk.dev/agents/workflow-agents/loop-agents/]. Google Cloud: "Use the loop pattern for tasks that require iterative [refinement]" [https://docs.cloud.google.com/architecture/choose-design-pattern-agentic-ai-system].
* **Use when.** "This workflow is particularly effective when we have clear evaluation criteria, and when iterative refinement provides measurable value" [https://www.anthropic.com/research/building-effective-agents]; the Claude cookbook restates the two fit conditions as *clear evaluation criteria* and *value from iterative refinement* [https://platform.claude.com/cookbook/patterns-agents-evaluator-optimizer]. AWS adds the operational trigger: use it when "human‑in‑the‑loop review is expensive or unavailable, and autonomous validation is desired" [https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/workflow-for-evaluators-and-reflect-refine-loops.html]. **Don't use** when there is no objective critic signal — you just pay for more tokens and can reinforce a wrong answer [https://www.anthropic.com/research/building-effective-agents].
* **Model per node.** Evaluator can be a **smaller model or deterministic code** where criteria are checkable; generator gets the stronger model. Where the evaluator is the quality gate for a reasoning task, keep it strong — AWS's tiered rule is capability‑matched to task complexity [https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost02-bp01.html]. Academic version of the three‑role split: **Reflexion**'s Actor / Evaluator / Self‑Reflection models, which "work together through trials in a loop until the Evaluator deems [the trajectory] to be correct", with reflective text stored in an **episodic memory buffer** [https://arxiv.org/abs/2303.11366] [https://neurips.cc/virtual/2023/poster/70114] [https://www.alphaxiv.org/abs/2303.11366].
* **Failure modes → mitigations.** Infinite or oscillating loops → hard iteration cap + termination condition (`LoopAgent` semantics) [https://adk.dev/agents/workflow-agents/loop-agents/]; critic agreeing with a bad generator (MAST's **task verification** category — failures where the system doesn't properly verify results) [https://arxiv.org/abs/2503.13657] [https://neurips.cc/virtual/2025/122442]; cost growth per loop → AWS reasoning‑cost practices [https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost01.html].
* **Cost & latency.** Cost ≈ (iterations) × (generator + evaluator); latency is strictly worse than a single call and is the main reason to cap iterations [https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost01.html].
* **Human approval.** Put the human **as the evaluator** on the last iteration, or as an override on the "pass" edge, when stakes are high — AWS's risk‑tiered approval [https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec04-bp02.html]; Azure's magentic variant even allows a human to review the plan "before or after implementation" [https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns].
* **Sources.** S1, S9, S10, S14, S17, S18, S20 (Reflexion).

---

### 3.6 Autonomous tool‑using agent loop (ReAct)

* **Definition.** Anthropic: agents "are systems where LLMs dynamically direct their own processes and tool usage, maintaining control over how they accomplish tasks"; used "for open‑ended problems where it's difficult or impossible to predict the required number of steps, and where you can't hard‑code a fixed path" [https://www.anthropic.com/research/building-effective-agents]. Later Anthropic definition: "**LLMs autonomously using tools in a loop**" [https://www.anthropic.com/research/effective-context-engineering-for-ai-agents]. Academic root: **ReAct** — LLMs "generate both reasoning traces and task‑specific actions in an interleaved manner", letting reasoning guide actions and action observations guide reasoning [https://arxiv.org/abs/2210.03629] [https://arxiv.org/pdf/2210.03629] [https://research.google/blog/react-synergizing-reasoning-and-acting-in-language-models/].
* **Nodes & edges.** `input → [agent node: think → choose tool → call tool → observe] ⟲ → stop condition → output`. Draw as **one node with a self‑loop** plus a tool‑call out‑edge to a tool subgraph and an observation back‑edge. The building block underneath is the **augmented LLM**: "an LLM enhanced with augmentations such as retrieval, tools, and memory" [https://www.anthropic.com/research/building-effective-agents]. OpenAI's SDK formalises the loop: "Its runner handles the agent loop and handoffs" [https://developers.openai.com/api/docs/guides/agents]. Google Cloud's **single‑agent** pattern is the same loop, and its reference architecture is ADK + Cloud Run [https://docs.cloud.google.com/architecture/single-agent-ai-system-adk-cloud-run].
* **Use when.** Open‑ended, step‑count‑unpredictable tasks; when the environment gives feedback the model can act on [https://www.anthropic.com/research/building-effective-agents]. **Don't use** when the path is knowable — a workflow is cheaper, faster and more predictable [https://www.anthropic.com/research/building-effective-agents] [https://docs.langchain.com/oss/python/langgraph/workflows-agents].
* **Model per node.** One strong model in the loop; if cost matters, apply Anthropic's cost/intelligence strategies (model routing; the "advisor" pattern where a cheaper driver consults a stronger model) [https://platform.claude.com/docs/en/about-claude/models/optimizing-for-cost-and-intelligence] [https://platform.claude.com/cookbook/cost-optimization-cost-optimization]. Tool‑heavy loops should also adopt code‑execution‑style tool loading to stop tool definitions/results from eating context — Anthropic reports tool definitions and results "can sometimes consume 50,000+ tokens" before work starts [https://www.anthropic.com/research/code-execution-with-mcp] [https://www.anthropic.com/research/advanced-tool-use].
* **Failure modes → mitigations.** Error compounding over turns; context exhaustion ("finite attention budget") [https://www.anthropic.com/research/effective-context-engineering-for-ai-agents]; runaway loops; tool misuse. Mitigations from the same page: **compaction**, **structured note‑taking (agentic memory)**, **sub‑agent architectures**, and **just‑in‑time** retrieval of identifiers rather than bulk preloading [https://www.anthropic.com/research/effective-context-engineering-for-ai-agents] [https://platform.claude.com/cookbook/tool-use-context-engineering-context-engineering-tools]. LLMCompiler is the documented alternative when the loop is dominated by independent tool calls (3.7× faster, 6.7× cheaper) [https://arxiv.org/abs/2312.04511]. 12‑Factor Agents: "compact errors into context", "own your control flow", "launch/pause/resume with simple APIs" [https://github.com/humanlayer/12-factor-agents].
* **Cost & latency.** Highest per‑task cost of the single‑agent patterns: ~**4× the tokens of a chat interaction** [https://www.anthropic.com/research/multi-agent-research-system]; AWS: "Agent reasoning cycles consume tokens through iterative plan‑execute‑verify‑reflect loops" [https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost01.html].
* **Human approval.** Tool‑level: OpenAI's `needs_approval` / `require_approval` rules are evaluated by the runner when the model emits a tool call, producing an interruption that must be resumed [https://openai.github.io/openai-agents-python/human_in_the_loop/] [https://developers.openai.com/api/docs/guides/agents/guardrails-approvals]; LangGraph pauses the graph with `interrupt()` and persists state until resumed [https://docs.langchain.com/oss/python/langgraph/interrupts]; Microsoft Agent Framework gates function tools requiring approval [https://learn.microsoft.com/en-us/agent-framework/agents/tools/tool-approval].
* **Sources.** S1, S3, S6, S7, S8, S9, S10, S12, S18, S20 (ReAct), S21.

---

### 3.7 Plan‑and‑execute (incl. ReWOO and LLMCompiler)

* **Definition.** Separate a planner that produces the whole step list from an executor that works through it. Academic root: **Plan‑and‑Solve prompting** — "first, devising a plan to divide the entire task into smaller subtasks, and then carrying out the subtasks according to the plan" [https://arxiv.org/abs/2305.04091]. LangChain's engineering framing: "Plan and execute agents promise faster, cheaper, and more performant task execution over previous agent designs", covering three variants — **plan‑and‑execute**, **LLMCompiler**, **ReWOO** [https://www.langchain.com/blog/planning-agents]. The LangGraph reference notebook says it is "heavily inspired by the Plan‑and‑Solve paper as well as the Baby‑AGI project" [https://github.com/langchain-ai/langgraphjs/blob/main/examples/plan-and-execute/plan-and-execute.ipynb?ref=blog.langchain.com].
* **Nodes & edges.** `input → planner (LLM, big) → plan store → executor (loop over steps, each step may call tools) → replanner (LLM) → {continue → executor | done → output}`. Two loops to draw: the **executor inner loop** and the **plan → execute → replan outer loop**. LLMCompiler's variant is explicit about the graph: an **LLM Planner generates a DAG of tasks with inter‑dependencies**, a **Task Fetching Unit** dispatches ready tasks, and an **Executor** runs them (in parallel) [https://arxiv.org/html/2312.04511v1] [https://raw.githubusercontent.com/mlresearch/v235/main/assets/kim24y/kim24y.pdf]. LangChain's "Deep Agents" harness productises the planner as a `write_todos`‑style planning tool plus a virtual filesystem and subagent spawning [https://docs.langchain.com/oss/python/deepagents/overview].
* **Use when.** Long‑horizon tasks where per‑step full reasoning is wasteful; when you want a reviewable plan artifact (also good for business‑reader export). **Don't use** for short tasks — the planning call is pure overhead vs a plain ReAct loop [https://www.langchain.com/blog/planning-agents].
* **Model per node.** **Big reasoning model for planner/replanner; small fast model for step execution** — that's the stated benefit of plan‑and‑execute over ReAct (fewer expensive calls) [https://www.langchain.com/blog/planning-agents], and it matches AWS's tiered‑selection practice [https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost02-bp01.html].
* **Failure modes → mitigations.** Stale/invalid plan after step failures → explicit **replanner** node [https://www.langchain.com/blog/planning-agents]; planner producing an unschedulable DAG → LLMCompiler's task‑fetching dependency resolution [https://arxiv.org/html/2312.04511v1]; long horizons exhausting context → Anthropic's long‑running harness pattern: an **initializer agent** that writes a feature list/state file plus an **incremental worker agent** that makes progress across many context windows [https://www.anthropic.com/research/effective-harnesses-for-long-running-agents].
* **Cost & latency.** Cheaper and faster than ReAct on tool‑heavy tasks: LLMCompiler measured **up to 3.7× latency speedup, up to 6.7× cost savings, ~9% accuracy gain vs ReAct** [https://arxiv.org/abs/2312.04511]. Planning adds one expensive call up front.
* **Human approval.** On the **plan** (before execution) — the same insertion point Microsoft uses for magentic plan review [https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/magentic] and that deep‑research products use to let the user edit the research plan [https://ai.google.dev/gemini-api/docs/deep-research].
* **Sources.** S13, S20 (Plan‑and‑Solve, LLMCompiler), S5, S15, S18.

---

### 3.8 Multi‑agent handoffs, supervisor and hierarchical teams

* **Definition — handoffs (decentralised).** OpenAI: "In a decentralized pattern, agents can 'handoff' workflow execution to one another" [https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf]. Azure: handoff orchestration means "Agents decide when to transfer control"; best for "Tasks in which the right specialist emerges during processing"; watch out for "**Infinite handoff loops**" and unpredictable paths [https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns]. Microsoft Agent Framework: "Handoff orchestration allows agents to transfer control to one another based on the context or user request" [https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/handoff]. ADK implements it as the LLM emitting a `transfer_to_agent` function call [https://adk.dev/agents/custom-agents/].
* **Definition — manager/supervisor (centralised).** OpenAI's **manager pattern**: a manager agent coordinates specialist agents, and "Agents themselves can serve as tools for other agents—see the Manager [pattern]" [https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/]. Google Cloud's **coordinator pattern**: "Use the coordinator pattern for automating structured business processes that require adaptive routing. For example, a customer service agent…" [https://docs.cloud.google.com/architecture/choose-design-pattern-agentic-ai-system].
* **Definition — hierarchical teams.** Google Cloud: "The hierarchical task decomposition pattern is an implementation of the coordinator pattern. A top‑level parent, or root, agent receives a [task]" and decomposes it down a tree [https://docs.cloud.google.com/architecture/choose-design-pattern-agentic-ai-system]. ADK builds the tree with `sub_agents`, navigable via `parent_agent` / `sub_agents` / `root_agent.find_agent(name)` [https://adk.dev/agents/custom-agents/]. Anthropic's shipped example is the Research lead‑agent/subagent tree [https://www.anthropic.com/research/multi-agent-research-system].
* **Definition — swarm (no centre).** Google Cloud: "The swarm pattern uses a dispatcher agent to route a user request to a collaborative group of specialized agents" [https://docs.cloud.google.com/architecture/choose-design-pattern-agentic-ai-system].
* **Nodes & edges.** Handoffs: **peer nodes with directed transfer edges** and exactly one "active" node at a time — draw an active‑token marker and a *loop‑guard* annotation. Supervisor: **star** — supervisor node in the centre, specialists as leaves, edges labelled "call (agent‑as‑tool)" out and "result" in; the supervisor keeps the conversation state. Hierarchical: **tree** of supervisors. Swarm: **mesh** with a dispatcher entry node.
* **Use when.** Handoffs: domains where the right specialist only becomes clear mid‑conversation (support triage) [https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns]. Supervisor/hierarchical: distinct specialist prompts+tool sets, need for centralised evaluation/maintenance [https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf]. **Don't use** when one agent plus more tools suffices — OpenAI: "A single agent can handle many tasks by incrementally adding tools, keeping complexity manageable and simplifying evaluation and maintenance" [https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf]; Azure CAF gives the single‑agent criteria [https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ai-agents/single-agent-multiple-agents]; Cognition's rule is to keep one stateful loop with stateless narrow subagents [https://cognition.com/blog/multi-agents-working].
* **Model per node.** Supervisor/lead = strongest model; specialists = cheaper, category‑tuned models. Production precedent: Opus lead / Sonnet subagents [https://www.anthropic.com/research/multi-agent-research-system]. Google Cloud model‑selection guidance for multi‑agent systems [https://docs.cloud.google.com/architecture/multiagent-ai-system].
* **Failure modes → mitigations.** (1) **Context loss across handoffs** — LangChain's handoff design question list forces you to choose a "Context filtering strategy: Will each agent receive full conversation history, filtered portions, or summaries?" [https://docs.langchain.com/oss/python/langchain/multi-agent/handoffs]. Cognition's principle: share full context and traces [https://cognition.com/blog/dont-build-multi-agents]. (2) **Infinite handoff loops** — Azure lists this explicitly as the risk; mitigate with hop counters/termination conditions [https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns]. (3) **MAST** failure categories: specification issues, inter‑agent misalignment, task verification [https://arxiv.org/abs/2503.13657]; the OpenReview v‑record notes the extended taxonomy has **16** modes across the same three categories [https://openreview.net/forum?id=fAjbYBmonr]. Reported distribution from the study: specification ≈41.8%, inter‑agent misalignment ≈36.9%, task verification ≈21.3% **(secondary‑only: https://tessary.ai/answers/failure-modes/how-do-multi-agent-systems-actually-fail)**. (4) **Behavioural pathologies** specific to multi‑agent: conformity, epistemic failures, incompatible goals [https://www.anthropic.com/research/multiagent-systems].
* **Cost & latency.** ~**15× chat tokens** for multi‑agent systems [https://www.anthropic.com/research/multi-agent-research-system]; AWS: "multi‑agent coordination adds multiplicative overhead" and has a dedicated best practice, "Optimize multi‑agent collaboration cost through efficient handoff patterns" [https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost01.html] [https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops06.html]. Handoffs lower latency vs a single mega‑prompt only when specialists run in parallel; sequential handoff chains add latency per hop.
* **Human approval.** On the **transfer decision** for sensitive domains and on specialist tools: "Agents in a handoff workflow can use tools that require human approval before they run; useful for sensitive operations such as processing [payments]" [https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/handoff].
* **Sources.** S2, S7, S8, S9, S10, S12, S14, S15, S16, S18, S20 (MAST), S21.

---

### 3.9 Group chat and debate (incl. magentic / ledger orchestration)

* **Definition — group chat.** Azure: group chat orchestration is a collaborative conversation among multiple agents, coordinated by an orchestrator that determines **speaker selection**; it applies where you need multiagent decision‑making techniques such as **brainstorming** and **ensemble** methods [https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns]. Microsoft Agent Framework: "Group chat orchestration models a collaborative conversation among multiple agents, coordinated by an orchestrator that determines speaker [selection]"; unlike handoff, "group chat uses an orchestrator to coordinate who speaks next" [https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/group-chat]. AutoGen's reference implementation: the group chat manager keeps issuing `RequestToSpeak` until a **termination condition** is reached [https://microsoft.github.io/autogen/stable//user-guide/core-user-guide/design-patterns/group-chat.html] [https://microsoft.github.io/autogen/stable//user-guide/agentchat-user-guide/selector-group-chat.html].
* **Definition — debate.** Academic root: **multiagent debate** — multiple model instances propose answers, then read each other's responses and revise over rounds, improving factual correctness and reasoning [https://arxiv.org/abs/2305.14325] [https://composable-models.github.io/llm_debate/].
* **Definition — magentic (adaptive/ledger).** Azure: "The magentic orchestration is also known as **dynamic orchestration, task‑ledger‑based orchestration, or adaptive planning**" [https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns]; a manager agent builds and adapts a task ledger and coordinates agents for open‑ended problems [https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns]. Paper: **Magentic-One** — "Orchestrator agent creates a plan, delegates tasks to other agents, and tracks progress towards the goal, dynamically [replanning]" [https://arxiv.org/abs/2411.04468] [https://arxiv.org/html/2411.04468v1]; the Orchestrator uses an **outer loop for the Task Ledger** and an **inner loop for the Progress Ledger**, self‑reflecting on progress and checking completion [https://microsoft.github.io/autogen/stable//reference/python/autogen_ext.teams.magentic_one.html] [https://www.microsoft.com/en-us/research/articles/magentic-one-a-generalist-multi-agent-system-for-solving-complex-tasks/].
* **Nodes & edges.** Group chat: **N peer agent nodes around a shared conversation bus**, plus a *speaker‑selection* controller node and an explicit **termination node**. Draw the bus, not point‑to‑point edges. Debate: rounds — draw `round r: all agents → all agents (read peers)` with a fixed round count. Magentic: `manager → [task ledger] → pick worker → worker → manager → [progress ledger] → {replan | next worker | done}` — **two nested loops**, both anchored on ledger artefacts (draw the ledgers as documents, since they're the state a business reader cares about).
* **Use when.** Azure's magentic trigger: "A complex or open‑ended use case that has no [known solution path]" [https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns]. Group chat for brainstorming/ensemble/critique [https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns]. Debate for factuality/reasoning where answers are checkable [https://arxiv.org/abs/2305.14325]. **Don't use** for deterministic pipelines; Azure's own "watch out for" column flags unpredictable convergence, and magentic is described as slow to converge [https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns] (summary of that tradeoff also at https://www.honeyhive.ai/learn/agent-orchestration).
* **Model per node.** Manager/orchestrator: strongest reasoning model (it owns planning and replanning). Speakers/workers: cheaper specialists. Debate requires *k* peers of comparable strength, so it is the most model‑expensive shape per round [https://arxiv.org/abs/2305.14325].
* **Failure modes → mitigations.** Non‑termination → hard termination condition / max messages (AutoGen requires one: "Without a termination condition, the group chat will run indefinitely" [https://microsoft.github.io/autogen/stable//reference/python/autogen_agentchat.teams.html]). Speaker‑selection non‑determinism → prefer explicit selection strategies over "auto" where testability matters [https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/group-chat]. Stall/looping agents → Magentic‑One's Progress Ledger explicitly tracks agent looping and stalling and triggers replanning [https://arxiv.org/html/2411.04468v1] [https://blog.gopenai.com/dissecting-magentic-one-a-modular-multi-agent-system-for-autonomous-complex-task-execution-c1b6df2dc749]. Groupthink/conformity → Anthropic's multiagent research reports **failures from conformity** as a measured risk [https://www.anthropic.com/research/multiagent-systems].
* **Cost & latency.** Highest of the coordination patterns: every speaker turn is a full model call with the growing shared transcript; debate multiplies that by rounds × agents [https://arxiv.org/abs/2305.14325]; Azure advises scoping persisted state to reduce token overhead and privacy risk [https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns].
* **Human approval.** Magentic has first‑class **plan review**: enable HITL "to allow users to review and approve the manager's proposed plan before execution" [https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/magentic]; the builder lets a reviewer "approve, request revisions, or reject the plan" [https://learn.microsoft.com/en-us/python/api/agent-framework-core/agent_framework.magenticbuilder?view=agent-framework-python-latest]. Azure notes magentic produces a "plan of approach that a human can review before or after implementation" [https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns].
* **Sources.** S14, S15, S18, S20 (Debate, Magentic‑One), S4.

---

### 3.10 Human‑in‑the‑loop approval and escalation

* **Definition.** Google Cloud: "The human‑in‑the‑loop pattern improves safety and reliability by inserting human judgment into critical decision points within the workflow" [https://docs.cloud.google.com/architecture/choose-design-pattern-agentic-ai-system]. LangChain: HITL "pauses an agent before a tool call runs so a person can review it. The reviewer approves the call, edits its arguments, rejects it [or provides feedback]" [https://docs.langchain.com/oss/javascript/concepts/human-in-the-loop]; the Python middleware supports **approve / edit / reject with feedback** [https://docs.langchain.com/oss/python/langchain/human-in-the-loop].
* **Mechanics you must draw.** LangGraph: "When an interrupt is triggered, LangGraph saves the graph state using its persistence layer and waits **indefinitely** until you resume execution" [https://docs.langchain.com/oss/python/langgraph/interrupts]. Microsoft Agent Framework: workflows can pause and wait for external input; high‑risk cases route to a human via `RequestInfoExecutor` and "The workflow checkpoints here" [https://learn.microsoft.com/en-us/agent-framework/workflows/human-in-the-loop] [https://techcommunity.microsoft.com/blog/azure-ai-foundry-blog/building-human-in-the-loop-ai-workflows-with-microsoft-agent-framework/4460342]. OpenAI: the runner evaluates the tool's approval rule and surfaces an interruption that your code resumes [https://openai.github.io/openai-agents-python/human_in_the_loop/]. Temporal frames the same requirement as durable execution across "a multi‑day wait for a human" [https://docs.temporal.io/ai].
* **Nodes & edges.** HITL is a **pause node with three out‑edges**: `approve → continue`, `edit → mutate state → continue`, `reject(+feedback) → back to generator/agent` [https://docs.langchain.com/oss/python/langchain/human-in-the-loop] [https://www.langchain.com/blog/making-it-easier-to-build-human-in-the-loop-agents-with-interrupt]. Draw the checkpoint/persistence store as an attached cylinder, and show that wall‑clock time is unbounded at that node.
* **Where to place it (the important design rule).** AWS: "**Risk‑tiered approval** — Routing every agent action through human review produces rubber‑stamp approvals. Routing none produces unbounded autonomy" [https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec04-bp02.html]. The Lens design principle: "Tiered oversight models match the level of human review to the **risk and reversibility** of each agent action" [https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentic-ai-lens.html]. Google Cloud's single‑agent reference architecture: "In business‑critical agentic AI systems, incorporate a human‑in‑the‑loop flow" [https://docs.cloud.google.com/architecture/single-agent-ai-system-adk-cloud-run]. AWS economics guidance ties HITL to cost of error: "Human in the loop… must be used when the cost of [error exceeds the cost of review]" [https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-economics/feedback.html].
* **Escalation triggers.** OpenAI: "Implementing a human intervention mechanism allows the agent to gracefully transfer control when it can't complete a task" [https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/]; the guide identifies repeated failure/ambiguity and high‑risk actions as the two trigger families [https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf] (the two‑trigger enumeration is reproduced at https://www.scribd.com/document/1072248193/AI-Agents-in-Depth-En — **secondary‑only** for the exact list). AWS's three ambient interaction modes give the escalation vocabulary: **notify** (inform only), **question** (agent asks for clarification), **review** (agent asks approval before acting), all surfaced through an `ask_human` tool [https://aws.amazon.com/blogs/machine-learning/building-ambient-agents-with-amazon-bedrock-agentcore-from-event-driven-signals-to-human-in-the-loop-workflows/] [https://github.com/aws-samples/sample-ambient-agents-on-agentcore]. 12‑Factor Agents' equivalent factor: "Contact humans with tool calls" [https://github.com/humanlayer/12-factor-agents].
* **Model per node.** The *risk classifier* that decides whether to pause can be a cheap model or deterministic rules; OpenAI's guardrail stack puts rules‑based checks and classifiers in front of expensive review [https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf].
* **Failure modes → mitigations.** Rubber‑stamping (mitigate with risk tiering) [https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec04-bp02.html]; lost state during the wait (mitigate with checkpoints/persistence and idempotency for side effects) [https://docs.langchain.com/oss/python/langgraph/interrupts] [https://docs.temporal.io/ai]; approval fatigue; replay of side effects on resume (Temporal/LangGraph both call out idempotency) [https://docs.temporal.io/ai] [https://www.facebook.com/fb-answers/langgraph-persistence-durable-execution-official-docs/ **(secondary‑only)**].
* **Cost & latency.** Adds human wait time (unbounded) but reduces error cost; AWS's economics guide treats HITL as the control that makes the error‑cost term manageable [https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-economics/feedback.html].
* **Sources.** S7, S8, S10, S12, S13, S14, S15, S18, S19, S21, S22.

---

### 3.11 Retrieval‑augmented generation and agentic RAG

* **Definition — plain RAG as a building block.** Retrieval is one of the three augmentations of the "augmented LLM" (retrieval, tools, memory) [https://www.anthropic.com/research/building-effective-agents]. Anthropic's later refinement: prefer **just‑in‑time** retrieval of lightweight identifiers over bulk preloading, to protect the finite attention budget [https://www.anthropic.com/research/effective-context-engineering-for-ai-agents].
* **Definition — agentic RAG.** "Agentic RAG represents a paradigm shift by introducing autonomous agents capable of dynamic decision‑making and workflow optimization" over retrieval [https://arxiv.org/html/2501.09136v4] [https://arxiv.org/abs/2501.09136]. The survey's taxonomy of architectures: **single‑agent (router), multi‑agent, hierarchical, corrective (CRAG), adaptive, and graph‑based RAG** [https://github.com/asinghcsu/AgenticRAG-Survey] [https://arxiv.org/html/2501.09136v4].
* **Nodes & edges.**
  * *Router RAG:* `query → router → {vector store | structured DB | web search} → generator → output` (routing pattern applied to sources).
  * *Single retrieval agent:* `query → agent ⟲ (retrieve tool) → grounded answer` — LangGraph's tutorial: "Build an agentic RAG system that can decide when to use the retriever tool" [https://docs.langchain.com/oss/python/langgraph/agentic-rag].
  * *Corrective/self‑reflective RAG:* `retrieve → grade documents (evaluator) → {relevant → generate | not relevant → rewrite query → re‑retrieve}` plus a **generation grader** with a hallucination/answer‑quality loop back to retrieval — LangChain implements ideas from **Self‑RAG** and **CRAG** this way [https://www.langchain.com/blog/agentic-rag-with-langgraph].
  * *Hierarchical agentic RAG:* manager decomposes the query and delegates retrieval subtasks to specialised agents [https://www.emergentmind.com/topics/hierarchical-agentic-rag **(secondary‑only)**] [https://arxiv.org/html/2501.09136v4].
* **Use when.** Answers must be grounded in a corpus that changes or that the model doesn't have; when a single retrieval pass is insufficient (multi‑hop, mixed sources). **Don't use agentic RAG** when one retrieval + generation call already meets the eval bar — the agentic version multiplies model calls [https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost01.html] and Anthropic's baseline advice is that a single optimised call with retrieval is often enough [https://www.anthropic.com/research/building-effective-agents].
* **Model per node.** Graders/routers → small fast model; synthesis/answer generation → strong model. AWS's tiered‑selection rule ("routine classification… cost‑efficient models; premium models reserved for reasoning") maps cleanly onto grade‑vs‑generate [https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost02.html].
* **Failure modes → mitigations.** Retrieved‑but‑irrelevant context; hallucination despite retrieval; query drift. Mitigations are the pattern's own loops: document grading, query rewriting, generation grading (Self‑RAG/CRAG) [https://www.langchain.com/blog/agentic-rag-with-langgraph]; the agentic‑RAG survey reports reflection and re‑planning outperform single‑pass RAG [https://arxiv.org/abs/2501.09136] (as summarised at https://theaiengineer.substack.com/p/agentic-rag-vs-cua-vs-a2a — **secondary‑only** for the comparative claim).
* **Cost & latency.** Each retrieval‑grade‑rewrite cycle adds calls; agentic RAG is materially more expensive per query than single‑shot RAG — AWS's reasoning‑cost guidance applies [https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost01.html].
* **Human approval.** Escalate to a human when grounding confidence is low (source quality/citation check) — Google Cloud's HITL pattern is the documented insertion point [https://docs.cloud.google.com/architecture/choose-design-pattern-agentic-ai-system].
* **Sources.** S1, S3, S12, S13, S18, S20 (Agentic RAG survey).

---

### 3.12 Event‑driven, scheduled and long‑running agents

* **Definition.** LangChain's **ambient agents**: agents that "respond to signals and run tasks simultaneously", triggered by events rather than a human prompt, with human contact via notify/question/review‑style interrupts [https://www.langchain.com/blog/introducing-ambient-agents] [https://www.langchain.com/blog/ux-for-agents-part-2-ambient]. AWS's equivalent: ambient agents on Bedrock AgentCore driven by **event‑driven signals and schedules**, with the HITL patterns notify / question / review exposed through an `ask_human` tool [https://aws.amazon.com/blogs/machine-learning/building-ambient-agents-with-amazon-bedrock-agentcore-from-event-driven-signals-to-human-in-the-loop-workflows/]. AWS also notes the split of responsibilities: "AWS Step Functions can orchestrate workflows but can't reason" — reasoning belongs to the agent, deterministic flow to the workflow engine [https://aws.amazon.com/blogs/machine-learning/building-ambient-agents-with-amazon-bedrock-agentcore-from-event-driven-signals-to-human-in-the-loop-workflows/]; AWS services for agentic workflow patterns include Bedrock, Lambda, Step Functions and EventBridge [https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/workflow-orchestration-agents.html].
* **Definition — durability requirement.** Temporal: "Temporal gives AI applications and agents Durable Execution: a Workflow resumes automatically after a crash, a network timeout, or a multi‑day wait for a human [approval]" [https://docs.temporal.io/ai]. LangGraph: durable execution + persistence is what lets agents "pause for human approval, or survive mid‑run deploys" [https://www.langchain.com/blog/runtime-behind-production-deep-agents] [https://docs.langchain.com/oss/python/langgraph/overview]. Anthropic's long‑running harness: an **initializer agent** creates the feature list/state file and an **incremental agent** makes progress across many context windows [https://www.anthropic.com/research/effective-harnesses-for-long-running-agents].
* **Nodes & edges.** `event source (queue/topic/schedule/webhook) → trigger node → [durable workflow envelope] → agent run (may itself be any pattern above) → {auto‑commit | notify | question | review} → sink/action`. Draw three extras that the other patterns don't need: (1) the **trigger** as a distinct shape, (2) a **state/checkpoint store** attached to the workflow envelope, (3) an **inbox/queue** where human responses land asynchronously.
* **Use when.** Continuous monitoring, proactive ops, batch/nightly jobs, anything that must survive restarts or wait days for a human [https://aws.amazon.com/blogs/machine-learning/building-ambient-agents-with-amazon-bedrock-agentcore-from-event-driven-signals-to-human-in-the-loop-workflows/] [https://docs.temporal.io/ai] [https://www.langchain.com/blog/introducing-ambient-agents]. **Don't use** an autonomous long‑running agent when a deterministic scheduler plus one LLM call is enough — AWS's own framing keeps deterministic orchestration in Step Functions and reasoning in the agent [https://aws.amazon.com/blogs/machine-learning/building-ambient-agents-with-amazon-bedrock-agentcore-from-event-driven-signals-to-human-in-the-loop-workflows/].
* **Model per node.** Trigger filtering/triage → cheapest model or rules; the long‑running reasoning body → strong model with compaction/note‑taking enabled [https://www.anthropic.com/research/effective-context-engineering-for-ai-agents].
* **Failure modes → mitigations.** Crash mid‑run → checkpoints/durable execution [https://docs.temporal.io/ai] [https://docs.langchain.com/oss/python/langgraph/overview]; duplicate side effects on replay → idempotency keys [https://docs.temporal.io/ai] **(Temporal semantics; LangGraph equivalent described at https://www.facebook.com/fb-answers/langgraph-persistence-durable-execution-official-docs/ — secondary‑only)**; context exhaustion over long horizons → compaction / note‑taking / sub‑agents [https://www.anthropic.com/research/effective-context-engineering-for-ai-agents]; alert storms → notify‑only vs review tiering [https://aws.amazon.com/blogs/machine-learning/building-ambient-agents-with-amazon-bedrock-agentcore-from-event-driven-signals-to-human-in-the-loop-workflows/].
* **Cost & latency.** Latency is dominated by schedule interval and human response time, not model speed. Cost is dominated by **run frequency × loop length** — AWS's cost guidance on reasoning cycles and token budgets is the relevant control [https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost01.html] and platform‑level token‑budget enforcement [https://docs.aws.amazon.com/prescriptive-guidance/latest/agent-ops-maturity-roadmap-for-enterprise-ai/platform-operations.html].
* **Human approval.** This is the pattern where HITL is *architectural*, not optional: AWS surfaces notify/question/review as first‑class interaction patterns [https://aws.amazon.com/blogs/machine-learning/building-ambient-agents-with-amazon-bedrock-agentcore-from-event-driven-signals-to-human-in-the-loop-workflows/]; AWS Well‑Architected requires risk‑tiered approval for critical decisions [https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec04-bp02.html]; 12‑Factor Agents requires launch/pause/resume APIs [https://github.com/humanlayer/12-factor-agents].
* **Sources.** S3, S5, S12, S13, S17, S18, S19, S21, S22.

---

### 3.13 Deep‑research style agents

* **Definition.** Anthropic's Research feature: "an agent that plans a research process based on user queries, and then uses tools to create parallel agents that [search and read]" — an orchestrator‑worker system because "Research demands the flexibility to pivot or explore tangential connections as the investigation unfolds. The model must operate autonomously" [https://www.anthropic.com/research/multi-agent-research-system]. Google's managed version: "The Gemini Deep Research agent autonomously plans, executes, and synthesizes multi‑step research tasks… produce detailed, cited reports" [https://ai.google.dev/gemini-api/docs/deep-research]; Gemini's product page stresses "Multi‑step planning… At each step, the model has to ground itself on all information gathered so [far]" [https://gemini.google/overview/deep-research/]. OpenAI's: "Deep research was trained using end‑to‑end reinforcement learning on hard browsing and reasoning tasks across a range of domains" [https://openai.com/index/introducing-deep-research/].
* **Nodes & edges.** `question → (optional clarification with user) → lead/planner agent → fan‑out to k search subagents (each its own ReAct loop over search/browse/read tools) → lead agent synthesis → cited report`. Draw: the user‑clarification HITL node at the front, a plan node, a parallel fan‑out of subagent loops, a synthesis node, and a citations artefact at the end. LangChain's Deep Agents harness names the same four ingredients: planning tool, virtual filesystem for context, subagent spawning, long‑term memory [https://docs.langchain.com/oss/python/deepagents/overview].
* **Use when.** Breadth‑first, parallelisable research where one context window cannot hold the material [https://www.anthropic.com/research/multi-agent-research-system] [https://cognition.com/blog/multi-agents-working]. **Don't use** for narrow, deterministic lookups — the 15× token multiplier applies [https://www.anthropic.com/research/multi-agent-research-system].
* **Model per node.** **Strongest model as lead/orchestrator, mid‑tier models as search subagents** — Anthropic's shipped configuration is Opus 4 lead + Sonnet 4 subagents, beating single‑agent Opus 4 by 90.2% [https://www.anthropic.com/research/multi-agent-research-system].
* **Failure modes → mitigations (Anthropic's own list).** Poor delegation → "Teach the orchestrator how to delegate" (objective, output format, tool/source guidance, boundaries) [https://www.anthropic.com/research/multi-agent-research-system]. Miscalibrated effort → "Scale effort to query complexity" [https://www.anthropic.com/research/multi-agent-research-system]. Too‑narrow search → "Start wide, then narrow down" [https://www.anthropic.com/research/multi-agent-research-system]. Long runs losing state → durable code execution / resume from failure [https://www.anthropic.com/research/multi-agent-research-system]. Evaluation difficulty → **end‑state evaluation with an LLM judge** against a rubric rather than step‑by‑step scoring [https://www.anthropic.com/research/multi-agent-research-system]. Context bloat from tool definitions/results → code execution with MCP / progressive tool disclosure [https://www.anthropic.com/research/code-execution-with-mcp] [https://www.anthropic.com/research/advanced-tool-use].
* **Cost & latency.** ~15× chat tokens [https://www.anthropic.com/research/multi-agent-research-system]; latency cut up to ~90% on complex queries via 3–5 parallel subagents each making 3+ parallel tool calls **(secondary‑only: https://www.linkedin.com/posts/rpmachado_how-we-built-our-multi-agent-research-system-activity-7490673993558065153-O5zZ)**. Runs are minutes‑to‑tens‑of‑minutes long, so durable execution matters [https://www.anthropic.com/research/multi-agent-research-system] [https://docs.temporal.io/ai].
* **Human approval.** Up front: clarify the question and let the user edit the research plan (Gemini's Deep Research agent exposes the plan; OpenAI's product asks clarifying questions) [https://ai.google.dev/gemini-api/docs/deep-research] [https://www.promptingguide.ai/guides/deep-research **(secondary‑only for the clarifying‑question behaviour)**]. At the end: human review of citations before publication.
* **Sources.** S2, S3, S6, S13, S23.

---

### 3.14 Reflection / self‑critique inside a single agent (the paper‑level primitive)

Included because it is a distinct drawable shape and because AWS treats it as an agent‑level pattern rather than a workflow.

* **Definition.** **Reflexion**: "Reflexion agents verbally reflect on task feedback signals, then maintain their own reflective text in an episodic memory buffer to induce better decision‑making" [https://arxiv.org/abs/2303.11366]. Roles: Actor, Evaluator, Self‑Reflection, looped "until the Evaluator deems [the trajectory] correct" [https://neurips.cc/virtual/2023/poster/70114]. AWS's productised version is the **evaluator reflect‑refine loop**, where feedback is applied by "Reinvoking the generator with an embedded critique" or "Sending the feedback to a specialized [refiner]" [https://docs.aws.amazon.com/pdfs/prescriptive-guidance/latest/agentic-ai-patterns/agentic-ai-patterns.pdf] [https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/evaluator-reflect-refine-loop-patterns.html].
* **Nodes & edges.** `agent → trial → evaluator (signal) → self‑reflection node → episodic memory store → agent (next trial)`. The memory store is a required drawable node — it is what distinguishes Reflexion from a plain retry loop [https://arxiv.org/abs/2303.11366].
* **Use / don't.** Use where a feedback signal exists (tests, rubric, tool errors). Don't use as a substitute for guardrails on irreversible actions — reflection cannot undo side effects; that needs HITL [https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec04-bp02.html].
* **Model per node.** Reflection can reuse the same model; AWS's tiering guidance suggests a cheaper model for the critic where criteria are explicit [https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost02-bp01.html].
* **Failure modes.** Self‑confirmation (critic agrees with actor) — MAST's task‑verification category [https://arxiv.org/abs/2503.13657]; unbounded retries → iteration caps [https://adk.dev/agents/workflow-agents/loop-agents/].
* **Cost/latency.** Linear in trials; AWS names "plan‑execute‑verify‑reflect" as the token‑consuming cycle to budget [https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost01.html].
* **Sources.** S17, S18, S20 (Reflexion), S9.

---

## 4. Master comparison table (for the app's pattern picker)

| Pattern | Loop? | Fan‑out width | Model tier (control / worker) | Relative token cost | Relative wall‑clock | Primary HITL insertion point |
|---|---|---|---|---|---|---|
| Prompt chaining + gate | no (gate can branch to retry) | 1 | same or per‑stage cheap | ≈N stage calls, serial | linear in N | replace a gate with a human gate [https://aws.amazon.com/blogs/machine-learning/building-generative-ai-prompt-chaining-workflows-with-human-in-the-loop/] |
| Routing | no | 1 of k | **small** classifier / any | +1 cheap call | +1 hop | low‑confidence edge [https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost02.html] |
| Parallelisation — sectioning | no | k (static) | any / any | ≈k× | ≈1× (concurrent) | aggregator output [https://www.anthropic.com/research/building-effective-agents] |
| Parallelisation — voting | no | k (same task) | same model ×k | ≈k× | ≈1× | none typically [https://www.anthropic.com/research/building-effective-agents] |
| Orchestrator‑workers | optional re‑plan loop | k (dynamic) | **large** orchestrator / mid workers | multiplicative | ≈1× if parallel | plan review before fan‑out [https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost01.html] [https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/magentic] |
| Evaluator‑optimizer / maker‑checker | **yes (bounded)** | 1 | mid generator / mid‑small critic | ≈iterations × 2 | linear in iterations | critic role or last iteration [https://www.anthropic.com/research/building-effective-agents] |
| ReAct agent loop | **yes (unbounded→capped)** | 1 agent, many tools | **large** in loop | ≈4× chat baseline | high, variable | per‑tool approval (`needs_approval`, `interrupt`) [https://www.anthropic.com/research/multi-agent-research-system] [https://openai.github.io/openai-agents-python/human_in_the_loop/] |
| Plan‑and‑execute / LLMCompiler | yes (replan) | plan DAG | **large** planner / **small** executor | cheaper than ReAct (up to 6.7× saving) | up to 3.7× faster than ReAct | plan approval [https://arxiv.org/abs/2312.04511] [https://www.langchain.com/blog/planning-agents] |
| Handoffs / swarm | no (transfer edges) | 1 active | per‑specialist | + per hop | + per hop | transfer decision + specialist tools [https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/handoff] |
| Supervisor / hierarchical teams | optional | star / tree | **large** supervisor / mid specialists | ≈15× chat baseline for multi‑agent | depends | supervisor's delegation [https://www.anthropic.com/research/multi-agent-research-system] |
| Group chat / debate | **yes (rounds)** | all peers | comparable peers | highest per round | rounds × turns | termination decision [https://arxiv.org/abs/2305.14325] |
| Magentic (ledger) | **yes, two nested** | dynamic | **large** manager / mid workers | highest | slow to converge | **plan review (approve/revise/reject)** [https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/magentic] [https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns] |
| Agentic RAG (corrective/self‑reflective) | **yes (retrieve↔rewrite)** | 1–k sources | small grader / large generator | > single‑shot RAG | + per cycle | low‑grounding escalation [https://www.langchain.com/blog/agentic-rag-with-langgraph] |
| Event‑driven / long‑running | yes (per event) | per event | small triage / large body | frequency × run length | schedule‑bound | notify / question / review [https://aws.amazon.com/blogs/machine-learning/building-ambient-agents-with-amazon-bedrock-agentcore-from-event-driven-signals-to-human-in-the-loop-workflows/] |
| Deep research | **yes** | 3–5 subagents | **largest** lead / mid subagents | ≈15× chat baseline | minutes; up to ~90% faster than serial **(secondary‑only)** | question clarification + plan edit + final citation review [https://www.anthropic.com/research/multi-agent-research-system] [https://ai.google.dev/gemini-api/docs/deep-research] |

---

## 5. Cross‑vendor naming crosswalk (so the catalogue has one canonical name per shape)

| Canonical shape | Anthropic | OpenAI | Google (ADK / Cloud Arch Center) | Microsoft (Azure AC / Agent Framework) | AWS | LangGraph/LangChain |
|---|---|---|---|---|---|---|
| Linear chain + gate | Prompt chaining [https://www.anthropic.com/research/building-effective-agents] | workflow steps [https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf] | Sequential pattern / `SequentialAgent` [https://adk.dev/agents/workflow-agents/sequential-agents/] | Sequential orchestration [https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns] | Workflow for prompt chaining; prompt chaining saga [https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/workflow-for-prompt-chaining.html] | chaining [https://docs.langchain.com/oss/python/langgraph/workflows-agents] |
| Classifier → handlers | Routing | routing / manager dispatch | Coordinator pattern [https://docs.cloud.google.com/architecture/choose-design-pattern-agentic-ai-system] | Handoff (specialist emerges) [https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns] | Workflow for routing [https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/introduction.html] | routing |
| Fan‑out/fan‑in | Parallelization (sectioning/voting) | parallel tool/agent calls | Parallel pattern / `ParallelAgent` [https://adk.dev/agents/workflow-agents/parallel-agents/] | Concurrent orchestration | Workflow for parallelization | parallelization |
| Dynamic decomposition | Orchestrator‑workers | Manager pattern (agents as tools) [https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/] | Hierarchical task decomposition [https://docs.cloud.google.com/architecture/choose-design-pattern-agentic-ai-system] | Magentic (with ledgers) | Workflow for orchestration [https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/workflow-for-orchestration.html] | orchestrator‑worker / supervisor |
| Generate‑critique loop | Evaluator‑optimizer | — | Review and critique; Iterative refinement; Loop pattern [https://docs.cloud.google.com/architecture/choose-design-pattern-agentic-ai-system] | Maker‑checker (a group‑chat subtype) [https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns] | Evaluator reflect‑refine loop [https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/evaluator-reflect-refine-loop-patterns.html] | evaluator‑optimizer |
| Tool loop | Agents ("LLMs autonomously using tools in a loop") [https://www.anthropic.com/research/effective-context-engineering-for-ai-agents] | agent loop run by the Runner [https://developers.openai.com/api/docs/guides/agents] | Single‑agent pattern [https://docs.cloud.google.com/architecture/single-agent-ai-system-adk-cloud-run] | single agent + tools | ReAct / tool‑use agent patterns [https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/agent-patterns.html] | `create_agent` / autonomous agent |
| Peer transfer | (subagents/handoff in SDK) | Decentralized pattern / handoffs [https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf] | Swarm pattern; `transfer_to_agent` [https://adk.dev/agents/custom-agents/] | Handoff orchestration [https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/handoff] | Multi‑agent collaboration (peer‑to‑peer) [https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/multi-agent-collaboration.html] | handoffs [https://docs.langchain.com/oss/python/langchain/multi-agent/handoffs] |
| Shared conversation | — | — | — | Group chat orchestration [https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/group-chat] | — | multi‑agent chat |
| HITL | — | human intervention layer [https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/] | Human‑in‑the‑loop pattern [https://docs.cloud.google.com/architecture/choose-design-pattern-agentic-ai-system] | HITL workflows / tool approval [https://learn.microsoft.com/en-us/agent-framework/workflows/human-in-the-loop] | notify/question/review; risk‑tiered approval [https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec04-bp02.html] | interrupts [https://docs.langchain.com/oss/python/langgraph/interrupts] |
| Event/schedule‑driven | long‑running harnesses [https://www.anthropic.com/research/effective-harnesses-for-long-running-agents] | — | — | — | ambient agents on AgentCore + EventBridge/Step Functions [https://aws.amazon.com/blogs/machine-learning/building-ambient-agents-with-amazon-bedrock-agentcore-from-event-driven-signals-to-human-in-the-loop-workflows/] | ambient agents [https://www.langchain.com/blog/introducing-ambient-agents] |

---

## 6. Failure‑mode reference (use as the app's test‑case generator)

| Failure class | Concrete modes | Mitigation the sources prescribe | Source |
|---|---|---|---|
| **Specification issues** | Vague role/objective, missing output contract, wrong task boundaries | "Teach the orchestrator how to delegate": give each subagent objective, output format, tool/source guidance, boundaries | https://arxiv.org/abs/2503.13657 ; https://www.anthropic.com/research/multi-agent-research-system |
| **Inter‑agent misalignment** | Context lost at handoff, agents working on stale state, infinite handoff loops | Choose an explicit context‑filtering strategy per handoff; hop/termination guards; one stateful main loop + stateless narrow subagents | https://docs.langchain.com/oss/python/langchain/multi-agent/handoffs ; https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns ; https://cognition.com/blog/multi-agents-working |
| **Task verification** | No check that the goal was met; critic rubber‑stamps | End‑state evaluation with an LLM judge against a rubric; maker‑checker; grading nodes in RAG | https://arxiv.org/abs/2503.13657 ; https://www.anthropic.com/research/multi-agent-research-system ; https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns |
| **Context exhaustion / degradation** | Attention budget depleted; tool definitions+results consuming 50,000+ tokens | Compaction, structured note‑taking, sub‑agent isolation, just‑in‑time retrieval, code execution with MCP | https://www.anthropic.com/research/effective-context-engineering-for-ai-agents ; https://www.anthropic.com/research/code-execution-with-mcp ; https://www.anthropic.com/research/advanced-tool-use |
| **Runaway cost** | plan‑execute‑verify‑reflect loops; multiplicative multi‑agent overhead | Reasoning‑cost best practices, tiered model selection, token budget enforcement | https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost01.html ; https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost02-bp01.html ; https://docs.aws.amazon.com/prescriptive-guidance/latest/agent-ops-maturity-roadmap-for-enterprise-ai/platform-operations.html |
| **Unbounded autonomy / rubber‑stamping** | Every action reviewed, or none | Risk‑tiered approval keyed to risk **and reversibility** | https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec04-bp02.html ; https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentic-ai-lens.html |
| **Emergent multi‑agent behaviour** | Conformity cascades, epistemic failures, incompatible goals between individually‑safe agents | Measure coordination explicitly; treat as a distinct risk class, not a prompt bug | https://www.anthropic.com/research/multiagent-systems |
| **Durability failures** | Crash/restart loses work; duplicated side effects on replay | Checkpointing + durable execution + idempotency | https://docs.temporal.io/ai ; https://docs.langchain.com/oss/python/langgraph/interrupts |
| **Prompt‑injection / unsafe inputs** | Jailbreaks, off‑topic drift, PII leakage | Layered guardrails: relevance classifier, safety classifier, PII filter, moderation, tool safeguards, rules‑based checks, output validation | https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf ; https://openai.github.io/openai-agents-python/guardrails/ |

---

## 7. Model‑selection rules per node (what the app should label on each node)

1. **Tier by task complexity, not by habit.** "Model selection matches task complexity, with routine classification and formatting handled by cost‑efficient models and premium models reserved for reasoning" [https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost02.html]; best practice `AGENTCOST02-BP01 Architect tiered model selection for cost‑performance optimization` [https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost02-bp01.html]; performance counterpart `AGENTPERF02-BP02 Implement task‑appropriate model [selection]` [https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf02-bp02.html].
2. **Orchestrator/planner/lead = strongest model; workers/executor/critic = cheaper.** Shipped precedent: Opus 4 lead + Sonnet 4 subagents [https://www.anthropic.com/research/multi-agent-research-system].
3. **Anthropic documents two cost/intelligence levers** — model routing across tiers, and an "advisor" pattern where a cheaper driver consults a stronger model [https://platform.claude.com/docs/en/about-claude/models/optimizing-for-cost-and-intelligence] [https://platform.claude.com/cookbook/cost-optimization-cost-optimization].
4. **Google Cloud: choose models from the capability requirements of each agent's task** [https://docs.cloud.google.com/architecture/multiagent-ai-system]; component‑level selection (framework, runtime, tools, memory, model) in [https://docs.cloud.google.com/architecture/choose-agentic-ai-architecture-components].
5. **Where the loop is tool‑call‑dominated, prefer parallel function calling over a bigger model** — LLMCompiler's 3.7× latency / 6.7× cost / +9% accuracy vs ReAct [https://arxiv.org/abs/2312.04511].
6. **OpenAI's guide covers model selection as an explicit design step** alongside tools and guardrails [https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/]. *(Specific per‑node model recommendations beyond "start simple with one agent, add tools incrementally" were not extractable from the snippets I retrieved — mark as unconfirmed.)*

---

## 8. Gaps, unconfirmed items, and cautions for the team

| Item | Status |
|---|---|
| Exact wording of Anthropic's "reduced research time by up to 90%" and the "3–5 subagents × 3+ parallel tool calls" configuration | **Secondary‑only** — attributed to https://www.anthropic.com/research/multi-agent-research-system but I could only confirm the numbers in summaries (https://www.linkedin.com/posts/rpmachado_how-we-built-our-multi-agent-research-system-activity-7490673993558065153-O5zZ, https://zylos.ai/research/2026-04-21-deep-research-agent-architectures/). Verify on the primary page before printing it in a customer proposal. |
| Exact "4× / 15× tokens" sentence | Attributed to Anthropic's multi‑agent research post; confirmed only via secondary reporting (https://www.constellationr.com/insights/news/anthropics-multi-agent-system-overview-must-read-cios). **Verify on primary page.** |
| MAST failure‑mode distribution percentages (41.77 / 36.94 / 21.30) | **Secondary‑only** (https://tessary.ai/answers/failure-modes/how-do-multi-agent-systems-actually-fail). Also note the taxonomy count differs by version: 14 modes in the NeurIPS record (https://neurips.cc/virtual/2025/122442) vs 16 in the OpenReview record (https://openreview.net/forum?id=fAjbYBmonr). |
| Publication date of Anthropic's *Patterns and problems in emerging multiagent systems* (reported 2026‑08‑13) | **Secondary‑only** (https://shamylmansoor.com/blog/multi-agent-ai-systems-coordination-problems/, https://aitoolsreview.co.uk/insights/anthropic-multiagent-safety-research). |
| Full text of AWS Prescriptive Guidance *Agent patterns* sub‑page list | I confirmed the page exists and its framing ("reusable, composable building blocks… tailored to specific domains, use cases, and levels of complexity" https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/agent-patterns.html) and the workflow sub‑pages (prompt chaining, routing, parallelization, orchestration, evaluator reflect‑refine, saga, multi‑agent collaboration, memory‑augmented, coding agents) via the site's own navigation snippets [https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/introduction.html]. The individual **agent‑pattern** names inside `agent-patterns.html` are **unconfirmed**. |
| Whether any vendor publishes a complete cross‑pattern **decision tree** | No vendor decision tree found; Google Cloud publishes a 3‑step selection *process* (https://docs.cloud.google.com/architecture/choose-design-pattern-agentic-ai-system) and Azure CAF publishes single‑vs‑multi criteria (https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ai-agents/single-agent-multiple-agents). A full tree exists only in practitioner literature (https://machinelearningmastery.com/choosing-the-right-agentic-design-pattern-a-decision-tree-approach/). Treat the tree in §2.4 as **our synthesis**, not a quotation. |
| OpenAI guide's exact "when to build an agent" criteria list | The guide's landing page confirms it covers "use cases, model selection, tool design, guardrails" (https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/) and that a single agent + incremental tools is the recommended start (https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf). The enumerated criteria (value / complexity / feasibility style) were **not confirmable** from my searches — mark unconfirmed. |
| Framework‑use caution in Anthropic's post | Confirmed: "We suggest that developers start by using LLM APIs directly: many patterns can be implemented in a few lines of code" (https://www.anthropic.com/research/building-effective-agents). The accompanying caution about abstraction layers hiding prompts/responses is on the same page but I did not capture verbatim text — **paraphrase, unconfirmed wording**. |

---

## 9. Direct implications for the app's drawing rules (compact)

1. **Two edge classes are mandatory**: *code‑determined* edges (gates, routers with fixed rules, fan‑out bars) and *model‑determined* edges (agent tool selection, orchestrator spawn, `transfer_to_agent`). Google Cloud's Azure/AWS counterparts make the same distinction explicit: AWS's spectrum runs from "static workflows (fully defined at design time) to dynamic graph orchestration (where the agent's reasoning determines the…)" [https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/definitions.html]. Render model‑determined edges differently (dashed) — this is the single most informative visual cue for a pre‑sales architect.
2. **Every loop node needs a visible exit**: max iterations / termination condition / evaluator pass [https://adk.dev/agents/workflow-agents/loop-agents/] [https://microsoft.github.io/autogen/stable//reference/python/autogen_agentchat.teams.html].
3. **Ledgers, memory stores and checkpoints are first‑class shapes**, not annotations: Magentic's task/progress ledgers [https://arxiv.org/html/2411.04468v1], Reflexion's episodic memory [https://arxiv.org/abs/2303.11366], LangGraph/Temporal checkpoints [https://docs.langchain.com/oss/python/langgraph/interrupts] [https://docs.temporal.io/ai].
4. **HITL nodes have exactly three out‑edges** (approve / edit / reject‑with‑feedback) plus an unbounded wait marker [https://docs.langchain.com/oss/python/langchain/human-in-the-loop] [https://docs.langchain.com/oss/python/langgraph/interrupts], and AWS's notify / question / review give the three severities to colour‑code [https://aws.amazon.com/blogs/machine-learning/building-ambient-agents-with-amazon-bedrock-agentcore-from-event-driven-signals-to-human-in-the-loop-workflows/].
5. **Each node should carry a model‑tier badge** (small/fast vs large/reasoning) sourced from the tiered‑selection rule [https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost02-bp01.html], and each diagram a token‑multiplier estimate anchored on the 4× (single agent) / 15× (multi‑agent) baseline [https://www.anthropic.com/research/multi-agent-research-system].
6. **The support‑email example in your brief** maps to: event trigger → routing (small model) → agentic RAG over help‑centre articles with document grading → evaluator‑optimizer for the draft → risk‑tiered HITL review → handoff/escalation to a human with the draft. Every element above has a cited pattern and a cited HITL rule; the escalation trigger set is OpenAI's "can't complete the task" + AWS's risk‑tiering [https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/] [https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec04-bp02.html].

---

## Searches run (186)

- Anthropic "Building effective agents" engineering blog prompt chaining routing parallelization orchestrator-workers evaluator-optimizer
- OpenAI "A practical guide to building agents" PDF manager pattern decentralized pattern
- Google Agent Development Kit sequential parallel loop agents multi-agent systems documentation
- LangGraph documentation workflows versus agents human-in-the-loop interrupt persistence
- Azure Architecture Center AI agent orchestration patterns sequential concurrent group chat handoff magentic
- AWS prescriptive guidance agentic AI design patterns
- anthropic.com building effective agents "prompt chaining" "gate" check outputs between steps
- anthropic building effective agents "routing" classification "parallelization" "sectioning" "voting"
- anthropic building effective agents "orchestrator-workers" "evaluator-optimizer" "autonomous agents" definition when to use
- Anthropic "How we built our multi-agent research system" orchestrator subagents tokens
- Anthropic "Effective context engineering for AI agents" compaction sub-agents note-taking
- Anthropic building effective agents "find the simplest solution possible" "add complexity only when"
- Anthropic building effective agents "when (and when not) to use agents" "cost of complexity" latency cost tradeoff
- Anthropic multi-agent research system "4x more tokens" "15x" tokens multi-agent cost
- Anthropic multi-agent research system "teach the orchestrator how to delegate" parallel tool calls scaling rules
- ReAct synergizing reasoning and acting in language models arxiv abstract reasoning traces task-specific actions
- Reflexion language agents with verbal reinforcement learning arxiv abstract self-reflection episodic memory
- LLMCompiler parallel function calling arxiv abstract planner task fetching unit executor speedup cost
- OpenAI practical guide building agents "when to build an agent" three criteria value complexity "agent loop" reasoning tools action observation
- OpenAI practical guide to building agents guardrails "human intervention" high-risk steps manager pattern handoffs decentralized
- Google ADK docs SequentialAgent ParallelAgent LoopAgent "workflow agents" when to use
- Google Cloud "Choose a design pattern for your agentic AI system" single-agent loop multi-agent sequential parallel loop
- LangGraph "workflows and agents" documentation build effective agents prebuilt create_react_agent
- Microsoft Azure Architecture Center "AI agent orchestration patterns" sequential concurrent group chat handoff magentic when to use each
- docs.langchain.com langgraph workflows-agents "prompt chaining" "routing" "parallelization" "orchestrator-worker" "evaluator-optimizer" "autonomous agent"
- Azure Architecture Center "magentic" orchestration "task ledger" manager agent Magentic-One when to use
- Google Cloud architecture "choose a design pattern for your agentic AI system" "hierarchical" "iterative refinement" "generative" patterns list
- Microsoft Agent Framework workflow patterns sequential concurrent group chat handoff magentic learn.microsoft.com documentation
- AWS prescriptive guidance "agentic-ai-patterns" reflection tool use planning multi-agent collaboration memory pattern list
- LangGraph "plan-and-execute" agents blog documentation planner executor replanner
- AWS prescriptive guidance agent-patterns.html "reflection" "tool use" "planning" "multi-agent collaboration" "memory-augmented" "human-in-the-loop" patterns list
- docs.cloud.google.com choose-design-pattern-agentic-ai-system "Coordinator pattern" "Hierarchical pattern" "when to use this pattern"
- OpenAI Agents SDK documentation handoffs guardrails sessions tracing agents as tools
- agentic RAG definition patterns single-agent router multi-agent corrective RAG self-RAG adaptive RAG LangGraph
- OpenAI Deep Research how it works agent end-to-end reinforcement learning browsing tool
- 12-factor agents principles own your control flow pause/resume human in the loop
- AWS prescriptive guidance agentic AI patterns "Agentic workflow patterns" list "single-agent" "orchestrator" "supervisor" "hierarchical"
- Azure Architecture Center ai-agent-design-patterns "Choosing a pattern" sequential when to use concurrent when to use group chat handoff
- Google Cloud choose design pattern agentic AI system "single-agent loop" "multi-agent sequential" "multi-agent parallel" "multi-agent loop" decision
- LangGraph docs "workflows and agents" "workflows offer predictability and consistency" "agents are best for open-ended problems"
- docs.langchain.com langgraph durable execution persistence checkpointer "durable execution" long-running agents resume
- OpenAI Agents SDK "needs_approval" human in the loop tool approval documentation
- anthropic building effective agents routing "When to use" "complex tasks where there are distinct categories" "different types of customer service queries"
- anthropic building effective agents "augmented LLM" retrieval tools memory building block
- anthropic building effective agents evaluator-optimizer "When to use" "clear evaluation criteria" translation optimization
- Anthropic multi-agent research system "90.2%" improvement single-agent Opus internal evaluation
- Anthropic multi-agent research system "scale effort to query complexity" "start wide, then narrow" prompt engineering principles
- Anthropic multi-agent research system durable execution resume from failure rainbow deployments end-state evaluation LLM judge
- "Why Do Multi-Agent LLM Systems Fail" MAST taxonomy 14 failure modes arxiv abstract
- Cognition "Don't Build Multi-Agents" Walden Yan principles context sharing
- Anthropic building effective agents agents "when to use" "open-ended problems where you can't predict the number of steps"
- Anthropic multi-agent research system "lead agent" "most intelligent model" subagents cheaper models parallelism latency
- Google Cloud "Choose your agentic AI architecture components" model selection reasoning vs cheaper models routing
- AWS prescriptive guidance agentic AI "model selection" smaller models classification routing cost Bedrock
- AWS Well-Architected Agentic AI Lens design patterns agent patterns orchestration human oversight cost optimization
- arxiv "Improving Factuality and Reasoning in Language Models through Multiagent Debate" abstract Du 2023
- Plan-and-Solve prompting arxiv 2305.04091 abstract devise plan carry out zero-shot CoT
- arxiv 2501.09136 Agentic Retrieval-Augmented Generation survey single-agent router multi-agent hierarchical corrective adaptive graph-based
- Microsoft Agent Framework magentic orchestration documentation "task ledger" "progress ledger" manager agent human approval
- event-driven AI agents AWS EventBridge Scheduler Step Functions Bedrock AgentCore long-running scheduled agents
- docs.aws.amazon.com agentic-ai-patterns "agentic workflow patterns" prompt chaining routing parallelization orchestrator worker evaluator
- AWS prescriptive guidance agentic-ai-patterns "Agent patterns" "Reflection" "Tool use" "Planning" "Multi-agent collaboration" "Human-in-the-loop" "Memory-augmented agents"
- LangChain "ambient agents" Harrison Chase event-driven agents blog
- Azure Architecture Center ai-agent-design-patterns sequential orchestration "When to use" considerations pipeline each agent
- Azure Architecture Center group chat orchestration "speaker selection" when to use considerations termination
- Azure Architecture Center handoff orchestration "transfer control" when to use decentralized
- AWS prescriptive guidance "workflow for orchestration" "saga orchestration" agentic patterns supervisor sequential parallel
- AWS prescriptive guidance "evaluator reflect-refine loop patterns" agentic generator critic
- Azure Cloud Adoption Framework "Choosing Between Building a Single-Agent System or Multi-Agent System" when to use single agent multi-agent
- LangGraph human-in-the-loop documentation "approve or reject" "edit state" "review tool call" "validate human input" "time travel"
- Vertex AI Deep Research API Gemini Deep Research agentic research multi-step plan
- OpenAI practical guide building agents guardrails types "relevance classifier" "safety classifier" "PII filter" "moderation" "tool safeguards" "output validation"
- docs.cloud.google.com choose-design-pattern-agentic-ai-system "Review and critique pattern" "Iterative refinement pattern" when to use
- docs.cloud.google.com choose-design-pattern-agentic-ai-system "Hierarchical" "Human-in-the-loop" "Deep research" pattern when to use
- AWS Well-Architected Agentic AI Lens "agentcost02" model invocation token cost optimization tiered model routing small model classification
- Anthropic multi-agent research system "lead agent" Opus "subagents" Sonnet "most capable model" economics
- OpenAI practical guide building agents "choose the right model" start with capable model iterate down cost
- Google Cloud agentic AI architecture components "model selection" Gemini Flash routing classification Gemini Pro reasoning orchestration
- Anthropic "effective context engineering" compaction "structured note-taking" "sub-agent architectures" long-horizon tasks just-in-time
- Microsoft Azure "maker-checker" agent pattern learn.microsoft.com AI agent design patterns
- Google ADK multi-agent systems documentation sub_agents transfer_to_agent agent hierarchy LlmAgent
- platform.claude.com "optimizing for cost and intelligence" model tiering agents Haiku Sonnet Opus routing
- AWS wellarchitected agentic-ai-lens AGENTCOST02-BP01 tiered model selection cost-performance classification summarization
- LangChain "deep agents" planning tool sub-agents file system documentation
- learn.microsoft.com ai-agent-design-patterns "When to use concurrent orchestration" "When to use group chat orchestration" "When to use handoff orchestration"
- learn.microsoft.com ai-agent-design-patterns "When to use magentic orchestration" open-ended problems considerations cost latency
- learn.microsoft.com single-agent-multiple-agents "When to use a single agent system" "When to use a multi-agent system" criteria
- docs.cloud.google.com choose-design-pattern-agentic-ai-system "sequential pattern" "when to use" multi-agent pipeline stages
- docs.cloud.google.com choose-design-pattern-agentic-ai-system "parallel pattern" "loop pattern" when to use termination condition
- docs.aws.amazon.com agentic-ai-patterns agent-patterns "Reflection pattern" "Tool use" "Planning" "Multi-agent collaboration" "Human-in-the-loop" "Memory"
- "docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns" "agent patterns" list reflection planning tool-use memory multi-agent human-in-the-loop
- docs.cloud.google.com "choose-design-pattern-agentic-ai-system" "Use the sequential pattern" "Use the hierarchical" "Use the coordinator pattern"
- docs.langchain.com "workflows-agents" langgraph "Prompt chaining" "Routing" "Parallelization" "Orchestrator-worker" "Evaluator-optimizer" "Autonomous agent"
- learn.microsoft.com agent-framework workflows orchestrations handoff "transfer control" when to use considerations
- learn.microsoft.com agent-framework "human-in-the-loop" workflow RequestInfoExecutor approval documentation
- adk.dev workflows "Sequential" "Parallel" "Loop" agent "when to use" documentation multi-agent
- learn.microsoft.com ai-agent-design-patterns "Considerations" sequential "error propagation" concurrent "race conditions" group chat risks
- Azure ai-agent-design-patterns table "Best for" "Risks" sequential concurrent group chat handoff magentic
- docs.cloud.google.com choose-design-pattern-agentic-ai-system "single-agent" pattern "when to use" tool use loop reasoning ReAct
- adk.dev workflows sequential agents documentation "executes its sub-agents in order" pipeline deterministic
- adk.dev "Parallel" agent documentation sub-agents run simultaneously branches output_key
- adk.dev loop agent documentation "until a termination condition" max_iterations escalate
- adk.dev multi-agent systems documentation "sub_agents" "transfer_to_agent" hierarchy root agent
- docs.cloud.google.com choose-design-pattern-agentic-ai-system "decision" tree "choose a pattern" steps define requirements select pattern
- docs.langchain.com langgraph human-in-the-loop patterns "approve/reject" "edit state" "review tool call" "validate human input" "time travel"
- AWS "Building ambient agents with Amazon Bedrock AgentCore" event-driven signals human-in-the-loop workflows patterns notify approve
- Temporal durable execution AI agents long-running workflows reliability documentation why agents need durable execution
- Anthropic "Claude Research" advanced research feature multi-agent how it works announcement
- OpenAI practical guide building agents "start with a single agent" "add tools gradually" "when to consider multi-agent" domain-specific tasks
- OpenAI practical guide building agents "human intervention" triggers "repeated failures" "ambiguous situations" "high-risk actions"
- anthropic effective context engineering "just-in-time" context "compaction" "note-taking" "sub-agents" long-horizon tasks definitions
- docs.langchain.com langgraph workflows-agents "agents are best for open-ended problems" "workflows" predictability consistency LangGraph guide patterns list
- docs.aws.amazon.com prescriptive-guidance agentic-ai-patterns "agent-patterns" "The following agent patterns" reflection tool use planning multi-agent
- Google Cloud architecture choose design pattern agentic AI "human-in-the-loop pattern" "deep research" pattern multi-agent
- Magentic-One generalist multi-agent system arxiv 2411.04468 abstract Orchestrator task ledger progress ledger
- AutoGen documentation group chat GroupChatManager speaker selection termination conditions microsoft.github.io
- Google Cloud choose design pattern agentic AI system "Start with a single agent" "move to a multi-agent pattern" decision guidance
- docs.langchain.com langgraph workflows-agents chaining routing parallelization orchestrator worker evaluator optimizer autonomous agent code examples
- AWS prescriptive guidance agentic-ai-patterns "human-in-the-loop" pattern page docs.aws.amazon.com
- Anthropic effective context engineering "finite attention budget" "context rot" just-in-time retrieval lightweight identifiers
- docs.aws.amazon.com prescriptive-guidance agentic-ai-patterns table of contents "Agent patterns" "Agentic workflow patterns" "Memory-augmented agents" "Multi-agent collaboration" chapters
- platform.claude.com optimizing for cost and intelligence "model routing" "advisor" strategies cost intelligence tradeoff agent
- docs.cloud.google.com choose-design-pattern-agentic-ai-system "Use the single-agent" "Use the multi-agent sequential" "Use the parallel pattern" "Use the loop pattern" "Use the review and critique"
- Anthropic "Building agents with the Claude Agent SDK" best practices when to use subagents start simple
- docs.langchain.com langgraph "agentic-rag" tutorial retrieve grade generation hallucination loop
- LangGraph "plan-and-execute" blog three types planning agents plan-and-execute ReWOO LLMCompiler
- Anthropic building effective agents parallelization "LLMs can be parallelized" "latency" "multiple perspectives" voting consensus
- Anthropic building effective agents orchestrator-workers "central LLM dynamically breaks down tasks" "delegate" difference from parallelization
- Anthropic building effective agents "Agents are effectively LLMs dynamically directing their own processes and tool use" definition
- LangChain blog "Plan-and-Execute Agents" three types "plan-and-execute" "ReWOO" "LLMCompiler" fewer LLM calls faster cheaper
- AWS blog ambient agents Bedrock AgentCore "notify" "question" "review" human-in-the-loop interaction patterns EventBridge
- LangGraph "long-running agents" documentation durable execution resume after failure cron schedule
- docs.cloud.google.com choose-design-pattern-agentic-ai-system "hierarchical task decomposition pattern" "swarm" "coordinator pattern" when to use
- docs.aws.amazon.com prescriptive-guidance agentic-ai-patterns "reflection" "human-in-the-loop" "memory-augmented agents" "reasoning" pattern names list
- Azure Architecture Center ai-agent-design-patterns "Choosing a pattern" decision guidance table comparison
- Google Cloud choose design pattern agentic AI system "trade-offs" cost latency complexity "when to use" each pattern comparison table
- OpenAI practical guide to building agents "when to build an agent" criteria "value" "complexity" "risk" "feasibility"
- AWS prescriptive guidance agentic-ai-economics cost per pattern token consumption multi-agent overhead
- Anthropic multi-agent research system "reduced research time" "90%" parallel subagents faster than single agent
- Anthropic building effective agents "when (and when not) to use agents" "optimizing single LLM calls with retrieval and in-context examples"
- docs.cloud.google.com choose-design-pattern-agentic-ai-system "Swarm pattern" all-to-all collaborative when to use
- OpenAI practical guide to building agents human intervention triggers "high-risk actions" "repeated failures" "low confidence" escalation
- Microsoft Agent Framework human-in-the-loop workflows RequestInfoExecutor checkpoint approval documentation learn.microsoft.com
- AWS Well-Architected Agentic AI Lens AGENTREL human oversight best practices approval gates autonomy levels
- Reflexion arxiv 2303.11366 abstract "actor" "evaluator" "self-reflection" episodic memory HumanEval 91%
- ai.google.dev gemini-api docs deep-research agent plan search browse synthesize citations API
- LangChain blog "Self-Reflective RAG with LangGraph" corrective RAG adaptive RAG self-RAG papers implemented
- AWS Well-Architected Agentic AI Lens AGENTCOST01 "reasoning and execution cost optimization" "plan-execute-verify-reflect" multiplicative overhead multi-agent
- Microsoft Azure "Agent Factory" blog agentic AI common use cases design patterns maker-checker dynamic orchestration
- OpenAI "Introducing deep research" how it works o3 browsing Python tool synthesis citations clarifying question
- docs.aws.amazon.com prescriptive-guidance agentic-ai-patterns "reflection.html" OR "planning.html" OR "tool-use.html" OR "human-in-the-loop.html"
- Anthropic "Agents can be used when flexibility and model-driven decision-making are needed at scale"
- learn.microsoft.com agent-framework workflows orchestrations magentic documentation plan review human approval
- docs.cloud.google.com choose-design-pattern-agentic-ai-system "single-agent system" pattern "loop" model reasons acts observes
- Azure ai-agent-design-patterns six patterns sequential concurrent group chat maker-checker handoff magentic
- AWS agentic-ai-patterns "workflow for orchestration" sequential parallel orchestrator-worker supervisor hierarchical pattern description
- docs.aws.amazon.com agentic-ai-patterns "Workflow for prompt chaining" "Workflow for routing" "Workflow for parallelization" table of contents
- docs.aws.amazon.com agentic-ai-patterns agent-patterns "ReAct" "reflection" "tool use" "planning" "memory" "human-in-the-loop" agent pattern names
- docs.langchain.com langgraph workflows-agents "chaining" "routing" "parallelization" "orchestrator-worker" "evaluator-optimizer" "autonomous agent" guide sections
- docs.aws.amazon.com agentic-ai-patterns workflow-for-prompt-chaining description sequential steps
- docs.cloud.google.com choose-design-pattern-agentic-ai-system "human-in-the-loop" checkpoint approval business-critical
- machinelearningmastery "Choosing the Right Agentic Design Pattern: A Decision-Tree Approach" decision tree steps
- MAST taxonomy "specification issues" "inter-agent misalignment" "task verification" failure modes percentages multi-agent LLM systems
- Anthropic building effective agents parallelization "can also offer latency benefits" exact quote
- AWS agentic-ai-patterns "agentic workflow patterns" list "prompt chaining saga" "routing" "parallelization" "orchestration" "evaluator reflect-refine" "saga orchestration" "multi-agent collaboration" "memory-augmented"
- docs.langchain.com langgraph workflows-agents guide sections "chaining" "routing" "parallelization" "orchestrator-worker" "evaluator-optimizer" "autonomous agent" "human-in-the-loop"
- Google Cloud choose design pattern agentic AI system "How to choose a design pattern" define requirements review patterns select
- docs.cloud.google.com multiagent-ai-system "model selection" "orchestration" "agent runtime" "memory" components guidance
- docs.aws.amazon.com prescriptive-guidance agentic-ai-patterns "ReAct" reasoning acting pattern page "tool use" "reflection" agent pattern subpage
- Anthropic building effective agents "When and how to use frameworks" "start by using LLM APIs directly" extra layers of abstraction obscure prompts
- OpenAI practical guide building agents definition "agents are systems that independently accomplish tasks on your behalf"
- OpenAI practical guide building agents "when to build an agent" "task value" "task complexity" "feasibility" criteria list
- Anthropic building effective agents agents "when not to use" "cost of complexity" "compounding errors" reliability
- Cognition multi-agents working April 2026 what's actually working subagents context
- Anthropic "Patterns and problems in emerging multiagent systems" research post failure modes
- Anthropic "Effective harnesses for long-running agents" initializer agent incremental coding agent context windows
- Cognition "Multi-Agents: What's Actually Working" 2026 stateless subagents main loop carry state
- Anthropic "code execution with MCP" building more efficient agents token cost progressive disclosure
- docs.aws.amazon.com wellarchitected agentic-ai-lens "autonomy levels" human oversight tiered oversight risk reversibility
- LangGraph docs "durable execution" long-running agents human-in-the-loop crash recovery documentation page
- Azure ai-agent-design-patterns "Watch out for" sequential "Concurrent" "Group chat" "Handoff" "Magentic" table rows risks
- Anthropic "Patterns and problems in emerging multiagent systems" conformity epistemic failures incompatible goals experiments 2026
- docs.cloud.google.com choose-design-pattern-agentic-ai-system "more model calls than a single-agent system" cost latency trade-off pattern
- docs.langchain.com langgraph workflows-agents "multi-agent" "human-in-the-loop" sections guide "agent" create_agent tool calling loop
- AWS wellarchitected agentic-ai-lens AGENTSEC04-BP02 "risk-tiered approval" human-in-the-loop critical decisions rubber-stamp
- Anthropic building effective agents "Agents are best for open-ended problems" "when you can't predict the required number of steps" "you can't hard-code a fixed path"

## Sources returned by search (1218)

- https://www.anthropic.com/research/building-effective-agents
- https://pub.towardsai.net/agent-workflow-patterns-beyond-anthropics-playbook-1bd76a48d63d
- https://medium.com/@vasundra.srinivasan/building-effective-ai-agents-a-practical-application-92e1e1537f64
- https://www.youtube.com/watch?v=vGueJIZWLL8
- https://www.reddit.com/r/ClaudeAI/comments/1hiww4y/i_just_read_anthropics_blog_on_building_effective/
- https://blog.devgenius.io/why-anthropics-building-effective-agents-raises-the-bar-and-which-agent-patterns-to-avoid-e60a143940df
- https://aimultiple.com/building-ai-agents
- https://www.linkedin.com/posts/joaquinlippincott_building-effective-agents-activity-7282082325264310272-hDU2
- https://arxiv.org/html/2605.13850v1
- https://agentpatterns.ai/patterns/agent-design/anthropic-effective-agents-framework/
- https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/
- https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf
- https://www.scribd.com/document/851884724/a-practical-guide-to-building-agents
- https://www.linkedin.com/posts/rakeshgohel01_openai-a-practical-guide-to-building-agents-activity-7318615273907933186-YpNw
- https://www.reddit.com/r/AIGuild/comments/1k2ey35/openais_guide_to_building_agents/
- https://medium.com/aiguys/a-practical-guide-to-building-agents-1a861f627c4e
- https://ai.rundatarun.io/ai-development-agents/building-effective-ai-agents-openai-guide
- https://aiagentssimplified.substack.com/p/sam-is-teaching-us-how-to-build-ai
- https://www.facebook.com/groups/aimlmalaysia/posts/2339771243089763/
- https://www.facebook.com/groups/2600net/posts/4158907390999021/
- https://codelabs.developers.google.com/codelabs/production-ready-ai-with-gc/3-developing-agents/build-a-multi-agent-system-with-adk
- https://cloud.google.com/blog/topics/developers-practitioners/building-collaborative-ai-a-developers-guide-to-multi-agent-systems-with-adk
- https://adk.dev/workflows/
- https://docs.cloud.google.com/architecture/choose-design-pattern-agentic-ai-system
- https://medium.com/google-cloud/google-adk-2-collaborative-multi-agent-patterns-a-practical-guide-5c696ba556d2
- https://www.youtube.com/watch?v=8uI7oJckxb8
- https://developers.googleblog.com/developers-guide-to-multi-agent-patterns-in-adk/
- https://www.skills.google/focuses/125061?parent=catalog
- https://www.infoq.com/news/2026/01/multi-agent-design-patterns/
- https://aipractitioner.substack.com/p/google-adk-explained-building-multi
- https://docs.langchain.com/oss/python/langgraph/interrupts
- https://www.langchain.com/blog/making-it-easier-to-build-human-in-the-loop-agents-with-interrupt
- https://www.reddit.com/r/LangChain/comments/1s6qidj/how_i_implemented_humanintheloop_with_langgraphs/
- https://docs.langchain.com/oss/python/langchain/human-in-the-loop
- https://www.youtube.com/watch?v=6t7YJcEFUIY
- https://dev.to/jamesbmour/interrupts-and-commands-in-langgraph-building-human-in-the-loop-workflows-4ngl
- https://aipractitioner.substack.com/p/human-in-the-loop-agents-steering
- https://www.skakarh.com/blog/human-in-the-loop-langgraph
- https://medium.com/data-science-collective/architecting-human-in-the-loop-agents-interrupts-persistence-and-state-management-in-langgraph-fa36c9663d6f
- https://turion.ai/blog/langgraph-human-in-the-loop-interrupt-tutorial/
- https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns
- https://www.honeyhive.ai/learn/agent-orchestration
- https://learn.microsoft.com/en-us/training/modules/agent-orchestration-patterns/
- https://medium.com/@lakkanaperera/the-5-ai-agent-orchestration-patterns-by-microsoft-9a27844eec9a
- https://learn.microsoft.com/en-za/answers/questions/5944740/can-someone-provide-quickstart-sample-code-for-dif
- https://www.youtube.com/watch?v=_bfk8D-qfMc
- https://www.gamut.so/blog/ai-agent-orchestration
- https://www.chatbot.com/blog/ai-agent-orchestration/
- https://www.linkedin.com/posts/dominique-pochat-a317123_ai-agent-orchestration-patterns-azure-architecture-activity-7353889318383325185-Ximx
- https://www.linkedin.com/pulse/architecting-digital-workforce-agent-orchestration-patterns-lively-6ldfe
- https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/agent-patterns.html
- https://aws.amazon.com/prescriptive-guidance/agentic-ai/
- https://docs.aws.amazon.com/pdfs/prescriptive-guidance/latest/agentic-ai-patterns/agentic-ai-patterns.pdf
- https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/introduction.html
- https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/multi-agent-collaboration.html
- https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/agentic-workflow-patterns.html
- https://www.devoteam.com/expert-view/aws-ai-agentic-ecosystem/
- https://docs.aws.amazon.com/wellarchitected/latest/generative-ai-lens/agentic-ai.html
- https://builder.aws.com/content/2qlet7NAUR02ygnurN1O74CIwTN/agentic-ai-on-aws-the-design-patterns-and-considerations
- https://www.linkedin.com/pulse/four-layers-two-patterns-securing-agentic-ai-aws-takahiro-ishii-nlf2c
- https://github.com/machinedge/building-effective-agents/blob/main/building-effective-agents.md
- https://promptessor.com/blog/prompt-chaining-how-to-build-better-multi-step-ai-workflows
- https://devlach.com/blog/ai/building-effective-ai-agents-patterns
- https://www.linkedin.com/posts/davidsauerwein_llm-agents-machinelearning-activity-7276687911377399809-BLN9
- https://www.studocu.com/en-us/document/teachers-college-columbia-university/software-development/815697890-building-effective-ai-agents-1735257949/117605251
- https://trigger.dev/blog/ai-agents-with-trigger
- https://learn-prompting.fr/blog/claude-agent-architecture-patterns
- https://www.freecodecamp.org/news/build-autonomous-agents-using-prompt-chaining-with-ai-primitives/
- https://medium.com/accredian/building-effective-ai-agents-a-guide-from-anthropic-e66b533ff091
- https://resources.anthropic.com/hubfs/Building%20Effective%20AI%20Agents-%20Architecture%20Patterns%20and%20Implementation%20Frameworks.pdf
- https://cdovey.dev/blog/building-effective-agents-in-practice/
- https://www.hkdca.com/wp-content/uploads/2025/02/how-to-build-effective-ai-agents-anthropic.pdf
- https://www.linkedin.com/posts/lewisowain_if-you-want-to-build-ai-systems-learn-these-activity-7441092702097559552-eDHz
- https://charlescozad.substack.com/p/ai-agents-super-reference
- https://www.workflowfiesta.com/blog/agentic-workflow-patterns
- https://www.linkedin.com/pulse/anthropics-guide-building-effective-ai-agents-mehdi-mirzapour-phd-5nahf
- https://www.scribd.com/document/815697890/Building-Effective-AI-Agents-1735257949
- https://www.beri.net/learning/anthropic-building-effective-agents
- https://www.anthropic.com/research/multi-agent-research-system
- https://blog.bytebytego.com/p/how-anthropic-built-a-multi-agent
- https://theaiengineer.substack.com/p/how-anthropic-built-multi-agent-deep
- https://www.beri.net/learning/anthropic-multi-agent-research-system
- https://getnadir.com/blog/multi-agent-orchestration-15x-token-cost/
- https://ai.plainenglish.io/how-we-built-our-multi-agent-research-system-5f5e10b2a8d6
- https://medium.com/@reliabledataengineering/how-anthropic-built-an-ai-that-outperforms-itself-by-90-142d27e7d06a
- https://www.linkedin.com/posts/diegoromerosm_how-we-built-our-multi-agent-research-system-activity-7339557794070605824-_tpY
- https://www.13labs.au/guides/multi-agent-orchestration-what-works
- https://www.morphllm.com/ai-agent-orchestration
- https://www.anthropic.com/research/effective-context-engineering-for-ai-agents
- https://platform.claude.com/cookbook/tool-use-context-engineering-context-engineering-tools
- https://x.com/omarsar0/status/1973848472576274562
- https://www.linkedin.com/posts/sudalairajkumar_contextengineering-activity-7379709308256776192-IANK
- https://blogs.oracle.com/developers/what-is-context-engineering-the-four-operations-that-decide-whether-your-agent-survives-production
- https://llmquant.substack.com/p/effective-context-engineering-for
- https://upsolve.ai/blog/agentic-context-engineering
- https://medium.com/superagentic-ai/agent-optimization-why-context-engineering-isnt-enough-b0e9dcd5fa66
- https://www.metacto.com/blogs/context-rich-environments-ai-agents
- https://www.youtube.com/watch?v=grs8yPUJ8j0
- https://github.com/alirezadir/Agentic-AI-Systems/blob/main/03_system_design/cookbooks/anthropic-build_effective_agents.md
- https://zeroic.in/blog/ai-agent-vs-workflow
- https://claudecertificationguide.com/ccdv-f/learn/1-agents-workflows/1-1-agent-architecture
- https://www.linkedin.com/pulse/growth-runs-loops-your-ai-agents-should-too-kuan-ning-tseng-jbque
- https://medium.com/@hieutrantrung.it/the-agent-stack-in-2026-layers-harnesses-and-where-you-actually-build-5b7ee7c9ef11
- https://www.getorchestra.io/knowledge-hub/glossary/types-ai-agent
- https://agentswarms.fyi/blog/autonomous-ai-agents
- https://www.instagram.com/reel/De4MN93Bmyw/?__d=11%2Btarget%3D
- https://www.vizio.ai/resources/blog/what-is-an-ai-agent
- https://b2bea.org/resources/finding-the-intelligence-in-ai-where-agents-belong-in-manufacturing-and-distribu
- https://www.linkedin.com/posts/eddie-forson_i-read-anthropics-blog-post-on-building-activity-7310251993061617665-V4Ml
- https://tao-hpu.medium.com/the-cost-economics-of-ai-agents-the-triangular-dilemma-of-computing-power-time-and-quality-71c870ecb558
- https://www.anthropic.com/research/demystifying-evals-for-ai-agents
- https://www.reddit.com/r/ClaudeAI/comments/1xdwquj/anthropics_new_guide_oct_22_argues_most_agents/
- https://arxiv.org/html/2508.02694v1
- https://www.finout.io/blog/anthropic-just-launched-managed-agents.-lets-talk-about-how-were-going-to-pay-for-this-1
- https://natesnewsletter.substack.com/p/i-read-everything-google-anthropic
- https://mer.vin/2026/05/when-not-to-build-ai-agents-anthropics-workflow-vs-agent-playbook/
- https://www.constellationr.com/insights/news/anthropics-multi-agent-system-overview-must-read-cios
- https://www.cloudzero.com/blog/ai-agent-cost/
- https://www.haktansuren.com/ai-agent-token-usage/
- https://www.facebook.com/willmaticai/posts/single-agent-vs-multi-agent-the-cost-datayour-multi-agent-ai-system-is-probably-/122197932158839243/
- https://www.vincirufus.com/en/posts/building-multi-agent-research-systems/
- https://www.linkedin.com/posts/wizrdo-ai_how-we-built-our-multi-agent-research-system-activity-7467739862297767936-XIMW
- https://synchronizedcodelab.com/blogs/multi-agent-ai-platform-pricing-oss-vs-managed
- https://gravity.fast/blog/single-agent-vs-multi-agent/
- https://www.augmentcode.com/guides/ai-agent-loop-token-cost-context-constraints
- https://www.zenml.io/llmops-database/building-production-multi-agent-research-systems-with-claude
- https://llmmultiagents.com/en/blogs/anthropic-multi-agent-system-reflection
- https://arxiv.org/html/2610.13703v1
- https://wiki.kimleo.net/notes/tech/Anthropic%20Articles%20Notes/
- https://harn.app/kb/tools
- https://www.scribd.com/document/937305172/How-We-Built-Our-Multi-Agent-Research-System-Anthropic
- https://arxiv.org/abs/2210.03629
- https://arxiv.org/pdf/2210.03629
- https://www.alphaxiv.org/abs/2210.03629
- https://cbarkinozer.medium.com/react-synergising-reasoning-and-acting-in-language-models-79e09526ffbe
- https://research.google/blog/react-synergizing-reasoning-and-acting-in-language-models/
- https://collaborate.princeton.edu/en/publications/react-synergizing-reasoning-and-acting-in-language-models/
- https://arxiv.org/html/2210.03629v3
- https://portkey.ai/blog/react-synergizing-reasoning-and-acting-in-language-models-summary/
- https://www.reddit.com/r/MachineLearning/comments/y1mosn/r_react_synergizing_reasoning_and_acting_in/
- https://react-lm.github.io/
- https://arxiv.org/abs/2303.11366
- https://arxiv.org/pdf/2303.11366
- https://neurips.cc/virtual/2023/poster/70114
- https://openreview.net/forum?id=vAElhFcKW6
- https://www.linkedin.com/pulse/reflexion-language-agents-verbal-reinforcement-learning-vlad-bogolin-s5sne
- https://dl.acm.org/doi/10.5555/3666122.3666499
- https://www.alphaxiv.org/abs/2303.11366
- https://www.reddit.com/r/MachineLearning/comments/1215dbl/r_reflexion_an_autonomous_agent_with_dynamic/
- https://www.chapterpal.com/s/a7o2kckv/reflexion-language-agents-with-verbal-reinforcement-learning
- https://medium.com/@vikram40441/implementing-reflexion-language-agents-with-verbal-reinforcement-learning-e4cb300278b6
- https://arxiv.org/abs/2312.04511
- https://huggingface.co/papers/2312.04511
- https://www.facebook.com/groups/DeepNetGroup/posts/2109543199438551/
- https://www.linkedin.com/posts/raghavananand_an-llm-compiler-for-parallel-function-calling-activity-7201281317014020097-IcVe
- https://github.com/SqueezeAILab/LLMCompiler
- https://dl.acm.org/doi/abs/10.5555/3692070.3693047
- https://raw.githubusercontent.com/mlresearch/v235/main/assets/kim24y/kim24y.pdf
- https://arxiv.org/html/2312.04511v1
- https://velog.io/@yeomjinseop/LLMCompiler
- https://www.getorchestra.io/guides/how-build-ai-agent
- https://www.linkedin.com/top-content/artificial-intelligence/developing-ai-agents/aiops-agent-design-principles/
- https://www.facebook.com/100057410380953/posts/agentic-systems-a-practitioners-guide-to-6-advanced-architectural-patternsbeyond/1605381841385480/
- https://agenticai.varasrinivas.com/courses/agent-development-guide/agent-builders-field-guide.html
- https://www.facebook.com/hamza.shoaib.102/posts/stop-obsessing-over-ai-tools-start-learning-how-agentic-systems-actually-workthe/4534031803508717/
- https://www.facebook.com/groups/868876935222403/posts/1212721064171320/
- https://media.licdn.com/dms/document/media/v2/D561FAQE0HMwTzn0qIw/feedshare-document-pdf-analyzed/B56aFo3S7RIkAY-/0/1792760689906?e=1794441600&v=beta&t=DzfIf2jyHg_KoM1X5Bt_YBZf0cxr_nWyyKaKA8So7jg
- https://br.linkedin.com/in/hiram-reis-neto-076735bb/pt
- https://api.substack.com/feed/podcast/454003/s/133669.rss
- https://www.linkedin.com/posts/dexterihorthy_openai-a-practical-guide-to-building-agents-activity-7318658969793699841-L3JJ
- https://www.flatlineagency.com/blog/building-ai-agents-practical-guide
- https://www.facebook.com/groups/aipreneurs/posts/1455780665405882/
- https://note.com/makokon/n/nb333691071bd?hl=en
- https://github.com/avnath13/agentify/blob/main/agentify/knowledge/building-effective-agents.md
- https://www.scribd.com/document/1054667457/A-Practical-Guide-to-Building-Agents
- https://cobusgreyling.medium.com/openai-ai-agent-design-guidance-7ff8ba088f43
- https://compiletheory.com/articles/agentic-ai-implementation-guidance
- https://adk.dev/agents/workflow-agents/parallel-agents/
- https://github.com/google/adk-python/discussions/3191
- https://medium.com/@saminchandeepa/mastering-workflow-strategies-in-google-agent-development-kit-adk-building-effective-multi-agent-59dbfcfa325f
- https://pub.towardsai.net/my-journey-learning-google-adk-building-ai-agents-from-scratch-part-3-a0f0526969f4
- https://arjunprabhulal.com/adk-multi-agent-systems/
- https://www.aimakers.co/blog/gemini-adk-agents/
- https://www.linkedin.com/posts/pavan-belagatti_google-recently-shared-a-document-that-provides-activity-7486659463391662080-zzAl
- https://pub.towardsai.net/choosing-a-design-pattern-for-your-agentic-ai-system-eda101f1a4b0
- https://cloudgeek7.medium.com/a-practitioners-guide-to-agentic-ai-design-patterns-a741e19d6e9f
- https://machinelearningmastery.com/7-must-know-agentic-ai-design-patterns/
- https://docs.cloud.google.com/architecture/multiagent-ai-system
- https://dev.to/busycaesar/5-ai-agent-design-patterns-every-developer-needs-to-know-1n5l
- https://unmeshed.io/blog/what-is-agentic-orchestration
- https://www.facebook.com/tpcoder/posts/ai-agent-design-patterns-advanced-design-patterns-for-dynamic-agents-%E0%B8%88%E0%B8%B2%E0%B8%81-google-/955499254010099/
- https://terencekok.com/resources/agentic-pattern-catalogue/field-guide/
- https://docs.langchain.com/oss/python/langgraph/workflows-agents
- https://www.youtube.com/watch?v=aHCDrAbH_go
- https://medium.com/aws-tip/built-with-langgraph-1-hello-world-7f1ea87ed5b9
- https://www.linkedin.com/pulse/building-reliable-agents-langgraph-mansur-uralov-qmnve
- https://www.zenml.io/blog/pydantic-ai-vs-langgraph
- https://towardsdatascience.com/a-developers-guide-to-building-scalable-ai-workflows-vs-agents/
- https://decodethefuture.org/en/agentic-workflows-vs-ai-agents/
- https://blog.csdn.net/YYYstation/article/details/150266283
- https://www.decodingai.com/p/stop-converting-documents-to-text
- https://rpabotsworld.com/langgraph-interview-questions/
- https://learn.microsoft.com/en-us/azure/architecture/ai-ml/architecture/baseline-microsoft-foundry-chat
- https://kanerika.com/blogs/ai-agent-orchestration/
- https://www.linkedin.com/posts/xinkuan_ai-agent-orchestration-patterns-azure-architecture-activity-7386940159088529408-0Qp8
- https://forums.pega.com/t/concurrent-agentic-orchestration-with-pega/13831
- https://www.facebook.com/joyatrestech/videos/most-people-talk-about-ai-agents-as-if-theyre-one-thingtheyre-notthere-are-at-le/1727936668407500/
- https://www.linkedin.com/top-content/artificial-intelligence/ai-workflow-enhancement/agentic-ai-workflow-frameworks-comparison/
- https://medium.com/@sundeepkumarsingh0/understanding-agentic-workflows-a-beginner-friendly-guide-to-llm-agents-6882bcb450c3
- https://www.analyticsvidhya.com/blog/2026/07/graph-engineering/
- https://www.gamut.so/blog/agentic-workflows
- https://agentic.folio3.ai/blog/ai-agent-workflows
- https://github.com/Yigtwxx/awesome-claude-multi-agent
- https://zylos.ai/research/2026-03-10-actor-model-communicating-agent-patterns/
- https://boostn.ai/en/app/lexikon/ki-agenten-bauen/
- https://www.microsoft.com/en-us/research/articles/magentic-one-a-generalist-multi-agent-system-for-solving-complex-tasks/
- https://dev.to/alex_aslam/magentic-orchestration-explained-why-microsofts-pattern-outperforms-naive-supervisor-3dkn
- https://techcommunity.microsoft.com/blog/educatordeveloperblog/transforming-solo-agents-to-collaborative-teams-choosing-multi-agent-patterns-in/4555465
- https://www.facebook.com/groups/2059467967664033/posts/4708843612726442/
- https://medium.com/@patrickkoss/ai-agents-software-engineering-new-patterns-or-old-tricks-122fc9ab2eee
- https://github.com/whmathews15/agents-integration-patterns/blob/main/patterns/coordination/magentic.md
- https://www.linkedin.com/posts/yahya-yunus-3a4008271_ai-aiagents-agenticai-activity-7502637458241617920-fo8v
- https://aman.ai/primers/ai/agentic-design-patterns/
- https://www.dataaigent.info/agentic-pattern-cataloguev2.html
- https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/
- https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/group-chat
- https://singhrajeev.com/2026/01/18/microsoft-agent-framework-workflows-the-next-step-in-building-intelligent-multi-agent-ai-systems/
- https://learn.microsoft.com/en-us/agent-framework/workflows/
- https://medium.com/@sac.nan/workflow-orchestration-patterns-in-microsoft-agent-framework-1690d4844825
- https://ravichaganti.com/blog/group-chat-workflows-in-microsoft-agent-framework/
- https://devblogs.microsoft.com/agent-framework/semantic-kernel-multi-agent-orchestration/
- https://www.codemag.com/Article/2610071/Building-Multi-Agent-Workflows-in-C
- https://cloudgeek7.medium.com/architecting-autonomy-a-guide-to-aws-agentic-patterns-workflows-04b6de8aad78
- https://www.facebook.com/amazonwebservices.hk/posts/four-pillars-powering-the-age-of-agentic-ai-world-class-ai-infrastructure-for-tr/1319243250215242/
- https://nimbusarchitect.com/blog/agentic-ai-patterns-aws/
- https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/memory-augmented-agents.html
- https://www.langchain.com/blog/planning-agents
- https://www.langchain.com/blog/plan-and-execute-agents
- https://github.com/saurav-dhait/Plan-and-Execute-Agent
- https://blog.gopenai.com/the-architecture-of-agents-planning-action-and-state-management-in-large-language-models-e00b340fcf09
- https://blckalpaca.at/en/knowledge-base/ai-agents/agent-architectures-overview/plan-and-execute-architektur
- https://arxiv.org/html/2509.08646v1
- https://wollenlabs.substack.com/p/navigating-modern-llm-architectures
- https://github.com/langchain-ai/langgraphjs/blob/main/examples/plan-and-execute/plan-and-execute.ipynb?ref=blog.langchain.com
- https://offensivegraphs.ai/blog/2024/10/14/adding-plan-and-execute-planner/
- https://pickaxe.co/post/ai-agent-architecture-patterns
- https://arxiv.org/html/2605.18747v1
- https://github.com/tmgthb/Autonomous-Agents/blob/main/resources/Autonomous_Agents_Research_Papers_2025_3.md
- https://www.researchgate.net/publication/399217173_Telemetry_and_Agentic_AI_Foundations_for_Optical_Network_Automation
- https://www.scribd.com/document/1040567620/30-Agents-Every-AI-Engineer-Must-Build-Build-Production-ready-Agent-Systems-Using-Proven-Architectures-and-Patterns-Imran-Ahmad-Z-library-sk-1lib
- https://reference-global.com/download/chapter/9781806387205/10.0000/9781806387205-001.pdf
- https://aclanthology.org/events/findings-2026/
- https://mdpi-res.com/bookfiles/book/13149/Artificial_Intelligence.pdf?v=1791076818
- https://link.springer.com/content/pdf/10.1007/978-981-92-1468-6.pdf
- https://www.slideshare.net/slideshow/newmind-ai-monthly-chronicles-july-2025/282217191
- https://arxiv.org/html/2405.10313v1
- https://cloud.google.com/blog/topics/partners/building-scalable-ai-agents-design-patterns-with-agent-engine-on-google-cloud
- https://www.youtube.com/watch?v=GDm_uH6VxPY&vl=en-US
- https://www.linkedin.com/posts/yaircarreno_choose-a-design-pattern-for-your-agentic-activity-7404155142264037376-aC_h
- https://docs.cloud.google.com/architecture/choose-agentic-ai-architecture-components
- https://towardsai.com/p/machine-learning/choosing-a-design-pattern-for-your-agentic-ai-system
- https://www.mongodb.com/resources/basics/artificial-intelligence/agentic-systems
- https://www.capicua.com/blog/agentic-design-patterns
- https://www.reddit.com/r/AgentsOfAI/comments/1px0y6h/a_senior_google_engineer_dropped_a_424page_doc/
- https://openai.github.io/openai-agents-python/
- https://developers.openai.com/api/docs/guides/agents
- https://datrick.com/openai-agents-sdk-production-support-agentops
- https://niteagent.com/blog/2026-07-08-openai-agents-sdk-production-guide/
- https://openai.github.io/openai-agents-python/guardrails/
- https://community.openai.com/t/sessions-and-agent-handovers-approach/1363579
- https://github.com/shahidali54/OpenAI-Agents-SDK
- https://community.openai.com/t/agents-example-multi-agent-via-tools-handoff-multiple-input-output-guardrails-streaming/1144540
- https://medium.com/@sahin.samia/building-ai-agents-with-openai-agents-sdk-a-step-by-step-guide-5f1a4f1133b3
- https://runcycles.io/blog/openai-agents-sdk-has-guardrails-for-content-but-nothing-for-actions
- https://www.lyzr.ai/blog/agentic-rag/
- https://docs.langchain.com/oss/python/langgraph/agentic-rag
- https://zbrain.ai/agentic-rag/
- https://arxiv.org/html/2501.09136v4
- https://www.rapidfire.ai/learn/agentic-rag
- https://github.com/asinghcsu/AgenticRAG-Survey
- https://medium.com/@umesh382.kushwaha/agentic-rag-when-static-retrieval-is-no-longer-enough-15fafb3fa06d
- https://www.covasant.com/glossary-of-agentic-ai/agentic-rag
- https://www.mindstudio.ai/blog/agentic-rag-vs-standard-rag-multi-layer-retrieval
- https://www.youtube.com/watch?v=vzGrpQkvmNY
- https://openai.com/index/introducing-deep-research/
- https://sequoiacap.com/podcast/training-data-deep-research
- https://www.youtube.com/watch?v=bNEvJYzoa8A
- https://blog.promptlayer.com/how-deep-research-works/
- https://nextword.substack.com/p/openais-deep-research-the-big-bang
- https://www.firecrawl.dev/blog/deep-research-for-ai-agents
- https://www.facebook.com/groups/aifire.co/posts/1642757242996245/
- https://github.com/humanlayer/12-factor-agents
- https://www.developersdigest.tech/blog/12-factor-agents-production-principles
- https://www.humanlayer.dev/blog/12-factor-agents
- https://www.youtube.com/watch?v=8kMaTybvDUw
- https://python.plainenglish.io/from-chaos-to-clarity-my-journey-into-the-world-of-12-factor-agents-cb6eca360a42
- https://tianpan.co/blog/2026/01/26/12-factor-agents-production-ai
- https://priyankavergadia.substack.com/p/12-factor-agents-principles-for-building
- https://www.ikangai.com/12-factor-agents-a-blueprint-for-reliable-llm-applications/
- https://www.linkedin.com/posts/rajeshmane711_someone-documented-the-engineering-principles-activity-7487453163713921024-0Kdt
- https://paddo.dev/blog/12-factor-agents/
- https://www.blockchain-council.org/agentic-ai/agentic-ai-architecture-patterns-single-supervisor-hierarchical/
- https://www.youtube.com/watch?v=xpDeJtzr9To
- https://aws.amazon.com/blogs/machine-learning/multi-agent-collaboration-patterns-with-strands-agents-and-amazon-nova/
- https://github.com/aws-solutions-library-samples/guidance-for-no-code-multi-agent-ai-orchestration-on-aws
- https://bogdanburuiana.com/index.php/2026/05/18/five-ways-to-orchestrate-multiple-ai-agents-and-when-to-use-each/
- https://note.com/note_1092ken/n/n488e880c790f?hl=en
- https://www.developersdigest.tech/blog/seven-ai-agent-orchestration-patterns
- https://weiguangli.io/blog/ai-agent-design-patterns
- https://download.microsoft.com/download/c/2/4/c24f97f7-00a6-46db-9b50-8ff6e03e9d45/Dynamics%20365%20Implementation%20Guide%20v1-2.pdf
- https://www.openagi.news/ai-agents/
- https://www.cybage.com/blog/building-intelligent-ai-systems-understanding-agentic-ai-and-design-patterns
- https://www.reddit.com/r/LangChain/comments/1m8vo19/i_wrote_an_ai_agent_with_langgraph_that_works/
- https://www.langchain.com/langgraph
- https://www.devshorts.in/p/the-silent-battle-over-agents-workflows
- https://www.youtube.com/watch?v=3w6j6sEVQ7E
- https://stackoverflow.com/questions/79687721/how-do-ai-agent-workflows-langgraph-know-what-tools-to-use
- https://dylancastillo.co/posts/agentic-workflows-langgraph.html
- https://www.langchain.com/blog/langgraph-multi-agent-workflows
- https://inkeep.com/blog/agent-frameworks-platforms-overview
- https://docs.langchain.com/oss/python/langgraph/overview
- https://www.skakarh.com/blog/langgraph-durable-execution
- https://www.reddit.com/r/LangChain/comments/1n74zqa/how_does_persistence_work_in_langgraph/
- https://www.facebook.com/fb-answers/langgraph-persistence-durable-execution-official-docs/
- https://discuss.huggingface.co/t/how-do-you-preserve-agent-state-across-restarts/172174
- https://www.langchain.com/blog/runtime-behind-production-deep-agents
- https://medium.com/@mehul_parmar/the-hidden-replay-risk-in-langgraph-how-durable-execution-can-burn-you-1d966141e71a
- https://zylos.ai/research/2026-04-24-durable-execution-agent-runtimes/
- https://cordum.io/blog/temporal-vs-langchain
- https://arxiv.org/html/2607.19297v1
- https://openai.github.io/openai-agents-python/human_in_the_loop/
- https://openai.github.io/openai-agents-python/tools/
- https://developers.openai.com/api/docs/guides/agents/guardrails-approvals
- https://github.com/openai/openai-agents-python/issues/2401
- https://jacar.es/en/human-in-the-loop-in-ai-agents/
- https://nhimg.org/securing-openai-agents-sdk-and-responses-api-guide
- https://developers.openai.com/cookbook/examples/agents_sdk/migrate-from-claude-agent-sdk/readme
- https://crontap.com/mcp/openai-agents-sdk-cron
- https://agentfactory.panaversity.org/docs/build-agents-crash-course
- https://actionbox.cloud/blog/openai-agents-sdk-human-in-the-loop/
- https://workos.com/blog/enterprise-ai-agent-playbook-what-anthropic-and-openai-reveal-about-building-production-ready-systems
- https://medium.com/@vipra_singh/ai-agent-workflow-vs-agent-part-5-2026a890a33d
- https://www.coursehero.com/file/251711294/L6-Agentic-AI/
- https://theweeklyswarm.beehiiv.com/p/common-agentic-patterns
- https://www.studocu.com/ph/document/adamson-university/artificial-intelligence/anthropic-ai-agents-building-effective-systems-for-llms/159630832
- https://www.hongyiii.dev/posts/Building_Agentic_AI
- https://anmi.in/upload/journal_pdf/1756537812July%20Journal%20ANMI.pdf
- https://blog.csdn.net/D1237890/article/details/160634382
- https://www.linkedin.com/posts/mahambatool_i-keep-going-back-to-this-blog-post-from-activity-7371871194926505984-2AoW
- https://www.reddit.com/r/AI_Agents/comments/1lql3qc/clarification_on_tools_and_memory_in_augmented/
- https://www.linkedin.com/posts/concaption_artificialintelligence-automation-ai-activity-7285662394318557185-7JSb
- https://cobusgreyling.substack.com/p/anthropics-research-on-genai-building
- https://marcabraham.com/2025/01/09/learning-from-anthropic-about-building-effective-agents/
- https://machine-learning-made-simple.medium.com/what-the-makers-of-claude-ai-say-about-building-agents-ab6a7061ece1
- https://www.scribd.com/document/809762864/Anthropic-AI-Agent-Best-Practices
- https://platform.claude.com/cookbook/patterns-agents-evaluator-optimizer
- https://cheesecakelabs.com/blog/ai-agent-architectures/
- https://docs.spring.io/spring-ai/reference/api/effective-agents.html
- https://www.ainews.com/p/anthropic-shares-detailed-best-practices-for-building-effective-ai-agents
- https://fountaincity.tech/resources/blog/anthropic-multi-agent-blueprint-production/
- https://www.youtube.com/watch?v=F-hsQROzSms
- https://medium.com/data-science-collective/anthropic-says-one-agent-with-right-skills-will-beat-multiple-sub-agents-for-saperate-tasks-1105a059d050
- https://www.augmentcode.com/guides/single-agent-vs-multi-agent-ai
- https://www.workmate.com/blog/why-one-ai-agent-isnt-enough-the-case-for-multi-agent-systems
- https://hyscaler.com/insights/multi-agent-systems-collaborative-ai/
- https://arthurchiao.art/blog/built-multi-agent-research-system-zh/
- https://agent.scafffold.com/read/multi-agent/02-the-case-for-multi-agent
- https://www.linkedin.com/posts/pawel-huryn_i-copied-the-multi-agent-research-system-activity-7408969788464447488-0vz5
- https://arize.com/blog/anthropic-tips-how-to-build-evals-you-can-trust/
- https://agentswarms.fyi/blog/why-do-multi-agent-llm-systems-fail
- https://arxiv.org/html/2507.06134v2
- https://arxiv.org/abs/2503.13657
- https://arxiv.org/pdf/2503.13657
- https://neurips.cc/virtual/2025/poster/121528
- https://github.com/multi-agent-systems-failure-taxonomy/MAST
- https://arxiv.org/html/2503.13657v2
- https://niteagent.com/blog/why-multi-agent-systems-fail-mast-taxonomy/
- https://bibbase.org/network/publication/cemri-pan-yang-agrawal-chopra-tiwari-keutzer-parameswaran-etal-whydomultiagentllmsystemsfail-2025
- https://www.researchgate.net/publication/389947144_Why_Do_Multi-Agent_LLM_Systems_Fail
- https://futureagi.substack.com/p/why-do-multi-agent-llm-systems-fail
- https://cognition.com/blog/multi-agents-working
- https://cognition.com/blog/dont-build-multi-agents
- https://www.linkedin.com/posts/peiyaoli_dont-build-multi-agents-cognition-activity-7340909933334339586-lxmn
- https://medium.com/@maureesewilliams/the-agent-architecture-wars-why-two-ai-giants-completely-disagree-on-multi-agent-systems-d19a53364200
- https://latent.space/wiki/walden-yan-7c572c23/
- https://github.com/steveash/hitchhikers-guide-to-ai-native-engineering/issues/2037
- https://levelup.gitconnected.com/where-agentic-ai-goes-from-here-775e7c517c6b
- https://agnt.gg/articles/engineering/single-agent-vs-multi-agent
- https://rundatarun.io/p/context-engineering
- https://harryfloyd.substack.com/p/your-multi-agent-system-is-an-org
- https://medium.com/@sathiyajithbabusm/the-agent-is-a-while-loop-an-engineers-guide-to-agentic-systems-ae95492cb163
- https://www.sume.com/blog/ai-agent-vs-workflow
- https://aayush-basnet.com.np/blog/agentic-engineering
- https://lobehub.com/skills/agent-blueprint-agent-blueprint-skills-agent-fundamentals
- https://open-source-capitalist-web.vercel.app/learn/skills-and-agents/building-effective-llm-agents
- https://www.integr8e.com/blogs/ai-agent-vs-workflow-a-practical-test-for-when-to-use-each
- https://simonwillison.net/tags/evals/
- https://news.ycombinator.com/item?id=48311647
- https://how-we-built-shannon-our-multi-agen.vercel.app/
- https://www.pulpmatrix.com/radar
- https://medium.com/@adnanmasood/where-agents-live-part-1-the-key-evaluation-dimensions-f3e45b6aeff1
- https://skillselion.com/skills/google/skills/google-cloud-solution-agentic-ai-bidirectional-streaming
- https://www.befreed.ai/podcast/ai-agents-advanced-hierarchical-architectures-deep-dive
- https://docs.cloud.google.com/architecture/agentic-ai-orchestrate-security-ops-workflows
- https://www.google.com/goto?url=CAESvgEB6zswFbmQSSEJbEAMZeyf-jQNV7nTnaJkD_o6dGL_fzGajAECJe7WiU6rK5LHCTkph7gJ_0WEmIpd-5v_eHlSae7Iroj2K70Qp1VKXWwsxJXQELrupD3zZyWOGUGAx6dR7MwXT7o_JIxY3tmnktPvpIQNmqx10OHL7YHfJWUZD38Rr7vE7noQiMqBQ8KDhLzWekjy95i3KU_UGIWJlf1T8hZs6AmzvghUotEXZIaFeysRZD9OrrNeYd_EQp1Y
- https://www.google.com/goto?url=CAESsQEB6zswFXTf3K1j_P30NFNF-PkC_O5niM4vjwdpnHfeMmPiCZ7drUf72Vq2LzUVpT7gW7xg2MCFA-ksOPAyFMOhDeJGo2Iq6gxwKsLjFTQoFFXtNWEFVGLS-De19G3AwWObDJC7Wv5RvbTEiPmMS2FY_e65dS6GlereRdTcj0PRcf7GR0IzMV6cI4C6fiKPSBjA0ZYdoUsJBvpc-snrVJgw9Bawo9Tkn3YshCT11WhSBsQ
- https://www.google.com/goto?url=CAESYgHrOzAVa62TqJwFV5X73oJJp6kb5pb56iFkIb7kwKv7CxiyHqqLoL59c7oLN2hvke_cS7SFXe0ofB9C5al0CkIZ8g8x86al-otQjY0oJZg0ohq2dSWBsg93OfGrsKrHjLg1
- https://www.google.com/goto?url=CAESngEB6zswFQ3sOLv6gad3D6mmC3CAU0U2nnKGWklxBdv006ZDTQgAoyN2BvZK5ADiKUvqj4FdXWztYRx28GEpi7Irbv3-OqFGqvGo_Pv9gFkZEGbRjlmrd1CbQqVLNZeHFWpWLCIroTSxwCU4Xq5D1TPkF-O5r_ElsTTDhX7jdE4B0SVDLYQmlTwcB8cCxiL9OxUsKD4dOJ3gEw_V_WUOZQ
- https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-serverless/cost-optimization.html
- https://aws.amazon.com/bedrock/model-choice/
- https://docs.aws.amazon.com/pdfs/prescriptive-guidance/latest/agentic-ai-serverless/agentic-ai-serverless.pdf
- https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost02.html
- https://builder.aws.com/content/3Il6YwldyZXtG8lhSQnq41KSg6F/the-engineering-guide-to-amazon-bedrock-cost-and-inference-optimization
- https://caylent.com/blog/amazon-bedrock-pricing-explained
- https://medium.com/aws-tip/amazon-bedrock-intelligent-prompt-routing-optimize-cost-and-quality-with-automatic-model-selection-4efa40bd8796
- https://www.cloudzero.com/blog/amazon-bedrock-pricing/
- https://www.manageengine.com/cloudspend/articles/how-to-choose-right-ai-model-aws-bedrock-cost-optimization.html
- https://docs.aws.amazon.com/decision-guides/latest/decision-guides/bedrock-or-sagemaker.html
- https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentic-ai-lens.html
- https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/definitions.html
- https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/design-principles.html
- https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/appendix-a.html
- https://www.youtube.com/watch?v=0sfKGUZ6kcg
- https://anivion-digital.com/blog/aws-agentic-ai-lens-enterprise-architecture
- https://aws.amazon.com/blogs/industries/announcing-the-well-architected-fsi-lens-updated-for-generative-ai-and-agentic-ai/
- https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost01.html
- https://www.linkedin.com/posts/sivasekarelumalai_agentic-ai-lens-aws-well-architected-framework-activity-7505275716947673089-QnqR
- https://arxiv.org/abs/2305.14325
- https://composable-models.github.io/llm_debate/
- https://arxiv.org/pdf/2305.14325
- https://dl.acm.org/doi/10.5555/3692070.3692537
- https://www.reddit.com/r/MachineLearning/comments/13t83xv/r_improving_factuality_and_reasoning_in_language/
- https://openreview.net/pdf?id=zj7YuTE4t8
- https://github.com/composable-models/llm_multiagent_debate
- https://www.researchgate.net/publication/370981457_Improving_Factuality_and_Reasoning_in_Language_Models_through_Multiagent_Debate
- https://www.alphaxiv.org/abs/2305.14325
- https://huggingface.co/datasets/rl-llm-wiki/knowledge-base/commit/b487e1104d4bd209529277a2de0dd38fd1185d8f
- https://arxiv.org/abs/2305.04091
- https://arxiv.org/html/2305.04091
- https://github.com/agi-edgerunners/plan-and-solve-prompting
- https://arxiv.org/pdf/2305.04091
- https://blog.athina.ai/plan-and-solve-prompting-improving-zero-shot-chain-of-thought-reasoning-by-large-language-models
- https://www.alphaxiv.org/abs/2305.04091
- https://www.linkedin.com/pulse/plan-and-solve-prompting-improving-zero-shot-large-language-bogolin-xcioc
- https://www.emergentmind.com/topics/plan-and-solve-prompting
- https://medium.com/papers-i-found/e10-plan-and-solve-prompting-9353018924bb
- https://fnl.es/Science/Papers/Prompt+Engineering/Plan-and-Solve+Prompting
- https://arxiv.org/html/2501.09136v1
- https://arxiv.org/abs/2501.09136
- https://www.academia.edu/144313989/Graph_Based_Agentic_Retrieval_Augmented_Generation_A_Comprehensive_Survey
- https://www.emergentmind.com/topics/hierarchical-agentic-rag
- https://www.researchgate.net/publication/388080924_Agentic_Retrieval-Augmented_Generation_A_Survey_on_Agentic_RAG
- https://arxiv.org/pdf/2609.06391
- https://machinelearning.apple.com/research/hybrid-vector-graph
- https://www.mdpi.com/2076-3417/15/23/12547
- https://learn.microsoft.com/en-us/python/api/agent-framework-core/agent_framework.standardmagenticmanager?view=agent-framework-python-latest
- https://microsoft.github.io/autogen/stable//user-guide/agentchat-user-guide/magentic-one.html
- https://www.deep-kondah.com/dancing-with-agents-a-deep-dive-into-multi-agent-systems/
- https://medium.com/towardsdev/autogen-framework-multi-agent-orchestration-and-complex-task-management-ccf876079bbb
- https://qurtoo.com/blog/magentic-just-hit-10-and-your-whole-agent-team-lives-or-dies-by-the-managers-led
- https://ecs.events/a/microsoft-agent-framework-the-production-ready-convergence-of-autogen-and-semantic-kernel
- https://www.microsoft.com/en-us/research/wp-content/uploads/2025/07/magentic-ui-report.pdf
- https://www.augmentcode.com/guides/agentic-workflow-patterns-coordinating-agents
- https://aws.amazon.com/blogs/machine-learning/building-ambient-agents-with-amazon-bedrock-agentcore-from-event-driven-signals-to-human-in-the-loop-workflows/
- https://builder.aws.com/content/3Bfg6PkDQJPTWMK4mdVicc2TtVY/step-functions-as-the-outer-loop-for-long-running-ai-workflows
- https://dev.to/aws/build-your-own-ai-butler-a-scheduled-agent-that-runs-itself-3dmk
- https://www.virtuability.com/blog/2026-03-27-when-to-use-agentcore/
- https://repost.aws/questions/QUmFqiLINpRzKra36S5M6miA/from-event-driven-to-decision-aware-where-does-the-ai-reasoning-layer-live-in-your-aws-stack
- https://www.youtube.com/watch?v=ZGElhJmN_8o
- https://serverlessland.com/patterns/lambda-durable-bedrock-agentcore-async
- https://www.reddit.com/r/LLMDevs/comments/1hodogz/implementing_ai_agent_on_aws_step_functions/
- https://temporal.io/blog/amazon-bedrock-agentcore-with-temporal-serverless-workers
- https://medium.com/codex/building-agentocore-enterprise-grade-autonomous-ai-agents-with-aws-bedrock-and-eventbridge-017914a7069a
- https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/workflow-for-orchestration.html
- https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/saga-orchestration-patterns.html
- https://www.linkedin.com/pulse/9-agentic-workflow-patterns-reshaping-enterprise-ai-2025-prasad-i1ase
- https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/workflow-orchestration-agents.html
- https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/evaluator-reflect-refine-loop-patterns.html
- https://www.workflowbuilder.io/blog/agentic-workflow-patterns
- https://www.udacity.com/course/google-agentic-ai-engineer--nd906
- https://github.com/greaveselliott/MARS/blob/main/docs/design-docs/cognition-orchestration-patterns.md
- https://www.langchain.com/blog/introducing-ambient-agents
- https://inferencebysequoia.substack.com/p/ambient-agents-and-the-new-agent
- https://medium.com/@pinarpatton/ambient-agents-when-events-not-prompts-are-the-trigger-183813315cb6
- https://www.supportlogic.com/resources/blog/ambient-agents-vs-chatbots-why-the-future-of-enterprise-support-is-always-on-intelligence/
- https://zbrain.ai/ambient-agents/
- https://www.linkedin.com/pulse/01-rise-ambient-agents-redefining-ai-interaction-shanthan-reddy-vuo2c
- https://www.langchain.com/blog/ux-for-agents-part-2-ambient
- https://www.walturn.com/insights/chat-agents-vs-ambient-agents-two-paths-to-ai-driven-assistance
- https://sequoiacap.com/podcast/context-engineering-our-way-to-long-horizon-agents-langchains-harrison-chase
- https://www.taskade.com/wiki/ai-agents/ambient-agents
- https://www.lyzr.ai/blog/agent-orchestration/
- https://build5nines.com/6-multi-agent-orchestration-design-patterns-every-developer-should-know/
- https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ai-agents/single-agent-multiple-agents
- https://www.linkedin.com/pulse/azure-agentic-ai-orchestration-patterns-sasi-vijayakumar-yjtuc
- https://www.confluent.io/blog/event-driven-multi-agent-systems/
- https://www.kore.ai/blog/choosing-the-right-orchestration-pattern-for-multi-agent-systems
- https://www.askaibrain.com/en/posts/11-multi-agent-orchestration-patterns-complete-guide
- https://techcommunity.microsoft.com/discussions/azure/building-multi-agent-orchestration-using-microsoft-semantic-kernel-a-complete-st/4507660
- https://www.preprints.org/manuscript/202604.2147
- https://microsoft.github.io/autogen/0.2/blog/
- https://arxiv.org/html/2603.09002v2
- https://kanerika.com/blogs/autogen-vs-langchain/
- https://github.com/massgen/massgen
- https://www.researchgate.net/publication/373164024_AutoGen_Enabling_Next-Gen_LLM_Applications_via_Multi-Agent_Conversation_Framework
- https://summit.ccs.uky.edu/ccs_summit2022/
- https://blog.prabasiva.ai/posts/agent-orchestration-technology-stack
- https://www.softwareseni.com/understanding-orchestration-patterns-for-multi-agent-systems-and-how-they-affect-performance-coordination-and-reliability/
- https://www.callmissed.com/blog/agent-handoff-patterns-specialization-at-scale-2026-guide
- https://www.linkedin.com/top-content/artificial-intelligence/ai-agent-system-fundamentals/agentic-orchestration-in-software/
- https://www.augmentcode.com/guides/swarm-vs-supervisor
- https://arxiv.org/html/2512.14860v1
- https://www.linkedin.com/top-content/artificial-intelligence/advanced-ai-training/learning-ai-orchestration-techniques/
- https://www.sec.gov/Archives/edgar/data/2081206/000129281426002716/agbkform20f_2025.htm
- https://dokumen.pub/architecture-for-blockchain-applications-978-3-030-03034-6.html
- https://patents.google.com/patent/US20160080280A1/en
- https://github.com/portpowered/awesome-agent-factories
- https://xbrush.ai/en/blog/generative-loop-image-video
- https://note.com/haboshi/n/n6e22f5933011?hl=en
- https://pub.towardsai.net/ai-agent-system-design-layers-most-engineers-get-wrong-52f9cd082e84
- https://www.linkedin.com/posts/patricebechard_what-if-we-didnt-need-mcp-servers-after-activity-7445447805344763904-U-FI
- https://easital.com/blog-details/why-multi-agent-llm-systems-fail
- https://resources.mailertogo.com/faq/dedicated-sending-domain-per-ai-agent-multi-agent-system
- https://www.linkedin.com/posts/nitin-sawant_the-agent-tier-rethinking-runtime-architecture-activity-7452601611400585216-h0Q_
- https://sunilkumar.ai/writing/single-agent-vs-multi-agent/
- https://athenaautomate.ai/blog/one-ai-agent-or-one-per-job.html
- https://chainless.hk/2026/10/22/ai-native-systems-need-not-imitate-the-human-division-of-labor/
- https://www.scribd.com/document/1070083613/Autonomous-Indoor-Farm-AI-Architecture
- https://pub.towardsai.net/langgraph-human-in-the-loop-pausing-reviewing-and-rewinding-your-agent-4028bd05b049
- https://www.reddit.com/r/LangGraph/comments/1ldiqtg/i_am_struggling_with_langgraphs_humanintheloop/
- https://www.youtube.com/watch?v=tdOeUVERukA
- https://docs.langchain.com/oss/python/langchain/frontend/human-in-the-loop
- https://www.reddit.com/r/LangChain/comments/1ji4091/langgraph_humanintheloop_review/
- https://medium.com/the-advanced-school-of-ai/human-in-the-loop-in-langgraph-approve-or-reject-pattern-fcf6ba0c5990
- https://www.elastic.co/search-labs/blog/human-in-the-loop-hitllanggraph-elasticsearch
- https://christianmendieta.ca/human-in-the-loop-ai-time-travel-workflows-with-langgraph/
- https://gemini.google/overview/deep-research/
- https://ai.google.dev/gemini-api/docs/deep-research
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/agents/use-deep-research
- https://blog.google/innovation-and-ai/technology/developers-tools/deep-research-agent-gemini-api/
- https://cloud.google.com/products/gemini-enterprise-agent-platform
- https://aistudio.google.com/docs/deep-research
- https://www.mindstudio.ai/blog/google-gemini-deep-research-max-api-review
- https://www.reddit.com/r/singularity/comments/1pk3dj1/gemini_deep_research_agent_available_via/
- https://www.deeplearning.ai/the-batch/gemini-makes-deep-research-available-via-api
- https://colab.research.google.com/github/google-gemini/cookbook/blob/main/quickstarts/Get_started_Deep_Research.ipynb
- https://www.youtube.com/shorts/3oHx7Uu9Czk
- https://www.linkedin.com/posts/mario-duhanic_a-practical-guide-to-building-agents-activity-7421203699097604096-YuDE
- https://richturrin.substack.com/p/openai-a-practical-guide-to-building
- https://www.beri.net/learning/openai-practical-guide-building-agents
- https://www.facebook.com/kommunicateio/posts/your-ai-agent-will-eventually-get-something-wrong-plan-for-itguardrails-work-bes/1768799828588819/
- https://www.linkedin.com/posts/greg-coquillo_ai-guardrails-activity-7366488433390665729-XZPw
- https://campus.datacamp.com/courses/introduction-to-ai-agents/building-and-using-ai-agents-responsibly?ex=1
- https://www.tribalscale.com/insights/5-ai-agent-design-patterns-every-developer-needs-to-know
- https://www.emerald.com/jsit/article/doi/10.1108/JSIT-09-2025-0388/1358002/Dynamics-of-human-agentic-information-systems
- https://medium.com/lets-code-future/18-core-agentic-ai-patterns-explained-in-20-minutes-b7c082c07f3c
- https://www.linkedin.com/posts/sivasankar-natarajan_agenticai-aiarchitecture-enterpriseai-activity-7505483328234442752-KUwG
- https://medium.com/@adnanmasood/agentic-ai-design-patterns-a-practical-field-guide-to-what-works-in-production-45c476c65a37
- https://cloud.google.com/transform/101-real-world-generative-ai-use-cases-from-industry-leaders
- https://redis.io/blog/agentic-ai-architecture-examples/
- https://arxiv.org/html/2601.08815v1
- https://agentic-ai.readthedocs.io/
- https://www.springerprofessional.de/en/agentic-design-patterns/53127496
- https://www.sciencedirect.com/science/article/pii/S1566253525006712
- https://www.facebook.com/groups/chatgptpromptsandaitools/posts/1310260903815010/
- https://www.linkedin.com/top-content/artificial-intelligence/ai-agent-system-fundamentals/agentic-system-design-patterns-in-langgraph/
- https://home.mlops.community/public/videos/durable-execution-and-modern-distributed-systems
- https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost02-bp01.html
- https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsus01-bp04.html
- https://michalkrzyzanowski.com/blog/aws-well-architected-agentic-ai-lens
- https://www.aiacademy.guru/agents/tools/wa-lens-review
- https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/cost-optimization.html
- https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost02-bp04.html
- https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf02-bp02.html
- https://medium.com/@nraman.n6/inside-claude-how-anthropic-built-the-worlds-most-safety-conscious-ai-c73f955f9f65
- https://www-cdn.anthropic.com/fc1b44717c85dc068bc6ba5024219938094694bd/Claude%20Opus%205.5%20System%20Card.pdf
- https://platform.claude.com/docs/en/about-claude/models/optimizing-for-cost-and-intelligence
- https://www.techmeme.com/260205/p44
- https://o-mega.ai/articles/qwen-3-8-max-vs-claude-and-gpt-for-agents-2026
- https://www-cdn.anthropic.com/0f0c97ad20d8005706296bd92aa1c27c6b2f4f61/Claude%20Opus%204.8%20System%20Card.pdf
- https://medium.com/@yugank.aman/anthropics-mythos-what-the-leaks-reveal-and-what-they-don-t-as-of-april-26-e6e97486b9c1
- https://www.scribd.com/document/977921112/Mastering-AI-Agents-combined
- https://www.linkedin.com/posts/sharmeen-khan11_softwareengineering-backendengineering-aiinfrastructure-activity-7416086609877483520-U3WV
- https://www.linkedin.com/posts/m-abdullah-khan-ai_jev-aiengineering-aiagents-activity-7510110734056329216-4ZYf
- https://mastra.ai/articles/custom-ai-agents
- https://medium.com/@Micheal-Lanham/why-your-ai-agent-is-only-as-smart-as-its-brain-a-developers-guide-to-choosing-the-right-llm-2d6deb28dcaf
- https://www.facebook.com/groups/aibusinesstools/posts/1790008439071746/
- https://aws.amazon.com/marketplace/build-learn/ai-agent-learning-series/agent-frameworks-building-blocks
- https://www.linkedin.com/posts/isiakafatiu_genai-ai-agents-activity-7404089976801509376-Uwso
- https://www.youtube.com/watch?v=fd4k16REDOU
- https://www.arthur.ai/column/ai-agent-security-best-practices-enterprise
- https://blog.n8n.io/production-ai-playbook-complex-agent-patterns/
- https://www.karini.ai/insights
- https://cloud.google.com/blog/products/ai-machine-learning/introducing-gemini-enterprise-agent-platform
- https://medium.com/google-cloud/build-multi-agent-ai-system-with-gemini-3-1-google-cloud-single-bot-orchestrated-intelligence-dc0c111e30e7
- https://www.linkedin.com/pulse/building-enterprise-ai-agents-google-cloud-gemini-agentic-explained-hfinc
- https://addyosmani.com/agents/12-getting-started-with-vertex-and-adk/
- https://toloka.ai/blog/gemini-models-explained/
- https://www.linkedin.com/posts/smithakolan_google-just-announced-that-gemini-is-now-activity-7514079826366865408-fhgK
- https://arxiv.org/html/2604.03527v1
- https://www.mindstudio.ai/blog/gemini-3-5-flash-vs-claude-opus-4-7-comparison
- https://www.linkedin.com/posts/thakursunil_effective-context-engineering-for-ai-agents-activity-7383674531825197057-xjGP
- https://www.aibuilderclub.com/blog/context-engineering-guide
- https://upsolve.ai/blog/context-engineering-guide
- https://rubinlake.com/en/technology-radar/developer-ai-and-delivery/context-engineering
- https://www.towardsdeeplearning.com/rethinking-ai-design-how-anthropics-context-engineering-outshines-prompting-2def03ffacb8
- https://ai.plainenglish.io/how-these-3-articles-completely-changed-the-way-i-build-ai-agents-2b4be5a258f0
- https://community.ibm.com/community/user/blogs/henry-xiao/2026/04/06/metadatadriven-context-engineering-for-ai-agents
- https://github.com/panaversity/learn-low-code-agentic-ai/blob/main/00_prompt_engineering/context_engineering_tutorial.md
- https://azure.microsoft.com/en-us/blog/agent-factory-the-new-era-of-agentic-ai-common-use-cases-and-design-patterns/
- https://www.linkedin.com/posts/sinatarajan_ai-agent-orchestration-patterns-azure-architecture-activity-7354496164651585536-3Jvk
- https://community.sap.com/t5/technology-blog-posts-by-sap/tame-your-agents-10-design-patterns-for-reliable-agentic-ai/ba-p/14424874
- https://microsoft.github.io/ai-agents-for-beginners/05-agentic-rag/
- https://windowsforum.com/news/microsoft-ai-agents-12-hands-on-lessons-to-build-production-ready-agents.380509/
- https://github.com/leestott/agent_patterns_foundry_demo
- https://itnext.io/research-you-can-actually-run-a-deep-dive-into-microsoft-foundry-labs-18414eb3c5c9
- https://www.youtube.com/watch?v=pX0_iIfRilU&vl=en
- https://github.com/google/adk-python/discussions/3945
- https://aipractitioner.substack.com/p/google-adk-multi-agent-orchestration
- https://platform.claude.com/docs/en/about-claude/pricing
- https://platform.claude.com/docs/en/models/overview
- https://platform.claude.com/docs/en/about-claude/models/choosing-a-model
- https://www.pointfive.co/efficiency-hub/inefficiencies/using-high-cost-claude-models-for-low-complexity-tasks
- https://terranettechnologies.com/blog/claude-fable-opus-sonnet-haiku-explained
- https://platform.claude.com/docs/en/models/opus-5-5/whats-new-opus-5-5
- https://dzeaulfath.medium.com/guide-to-the-claude-console-for-agents-and-claude-code-4ed54208b246
- https://github.com/vkorost/claude-certified-developer-guide/blob/main/book/chapters/04-choosing-a-model.md
- https://arxiv.org/html/2609.28919v1
- https://techjacksolutions.com/cloud-tools/aws/aws-well-architected-generative-ai-lens/
- https://docs.langchain.com/oss/python/deepagents/overview
- https://krishcnaik.substack.com/p/building-deep-agents-with-langchain
- https://www.langchain.com/deep-agents
- https://www.youtube.com/watch?v=J8DzuMmSDEU
- https://talkpython.fm/episodes/show/543/deep-agents-langchains-sdk-for-agents-that-plan-and-delegate
- https://docs.langchain.com/oss/python/deepagents/subagents
- https://github.com/langchain-ai/deepagents
- https://www.nutrient.io/blog/langchain-deep-agents-comprehensive-developers-guide/
- https://www.linkedin.com/posts/harrison-chase-961287118_deep-agents-activity-7356365611729391616-p-yS
- https://reference.langchain.com/python/deepagents
- https://talent500.com/blog/ai-agent-orchestration/
- https://github.com/resources/articles/what-is-ai-agent-orchestration
- https://www.systematic.com.hk/azure-ai-developer-associate.htm
- https://www.bitontree.com/single-agent-vs-multi-agent-systems-when-and-why-to-use-each
- https://aayushostwal2.substack.com/p/the-15-ai-agent-patterns-every-engineer
- https://neo4j.com/blog/agentic-ai/agentic-architecture/
- https://www.linkedin.com/top-content/project-management/optimizing-workflow-processes/agentic-workflow-patterns-explained/
- https://agility-at-scale.com/ai/agents/enterprise-ai-agent-workflow-patterns/
- https://medium.com/@pinaki.guha/from-blank-stares-to-ai-agents-in-25-minutes-a-beginners-guide-to-agentic-ai-d96f94cbb040
- https://levelup.gitconnected.com/after-analyzing-17-multi-agent-topologies-7-anti-patterns-that-will-burn-your-budget-28cc6909621c
- https://myengineeringpath.dev/genai-engineer/agents/
- https://kanerika.com/blogs/langchain-vs-langgraph/
- https://www.linkedin.com/top-content/artificial-intelligence/ai-agent-system-fundamentals/multi-agent-patterns-in-generative-ai/
- https://archerinfotech.in/courses/generative-ai/agentic-ai-training-in-pune
- https://www.linkedin.com/posts/pavan-belagatti_llm-workflows-provide-structure-rag-ensures-activity-7391845856221589504-UQ3V
- https://www.facebook.com/groups/2600net/posts/4341759542713804/
- https://uk.linkedin.com/in/work-aqib-iqbal
- https://medium.com/@random.droid/agentic-design-pattern-quick-reference-d4d434972069
- https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops06.html
- https://avahi.ai/blog/agentic-ai-architecture-patterns-used-in-production-systems/
- https://machinelearningmastery.com/the-roadmap-to-mastering-agentic-ai-design-patterns/
- https://towardsai.com/p/machine-learning/production-ready-ai-agents-8-patterns-that-actually-work-with-real-examples-from-bank-of-america-coinbase-uipath
- https://aishwaryasrinivasan.substack.com/p/ai-agents-stanford-lecture
- https://www.facebook.com/ManningBooks/posts/moving-from-prompting-an-ai-to-building-an-ai-agent-is-a-bigger-leap-than-it-mig/1578439574323509/
- https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf02-bp01.html
- https://datarekha.com/agentic-ai/
- https://www.linkedin.com/posts/pradeeparadhya_95-of-ai-projects-fail-mit-study-insights-activity-7407955487025123328--3pJ
- https://airesponsibly.substack.com/p/the-production-guide-to-agentic-ai
- https://github.com/surlymochan/awesome-ai-agents-2027/blob/main/ai-orchestrator.md
- https://github.com/manhquydev/awesome-ai-agents-2027/blob/main/ai-orchestrator.md
- https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/handoff
- https://learn.microsoft.com/en-us/semantic-kernel/frameworks/agent/agent-orchestration/handoff
- https://medium.com/@manoranjan.rajguru/handoff-orchestration-in-microsoft-agent-framework-cdc598a7619c
- https://ravichaganti.com/blog/handoff-workflows-in-microsoft-agent-framework/
- https://github.com/microsoft/ai-agents-for-beginners/blob/main/14-microsoft-agent-framework/code-samples/14-handoff.ipynb
- https://medium.akshaykokane.com/creating-multi-agent-workflows-with-microsoft-agent-framework-8c68df1ec0ea
- https://www.azureguru.net/workflow-orchestration-patterns-in-microsoft-agent-framework
- https://techcommunity.microsoft.com/blog/azure-ai-foundry-blog/building-human-in-the-loop-ai-workflows-with-microsoft-agent-framework/4460342
- https://learn.microsoft.com/en-us/python/api/agent-framework-core/agent_framework?view=agent-framework-python-latest
- https://learn.microsoft.com/en-us/agent-framework/support/upgrade/requests-and-responses-upgrade-guide-python
- https://learn.microsoft.com/en-us/agent-framework/concepts/workflows/
- https://www.developersdigest.tech/blog/microsoft-agent-framework-whats-new-2026
- https://github.com/microsoft/ai-agents-for-beginners/blob/main/CHANGELOG.md
- https://integrations.at/enterprise-ai/enterprise-multi-agent-system/
- https://newsletter.victordibia.com/p/microsoft-agent-framework-semantic
- https://www.developersdigest.tech/blog/choosing-an-agent-framework-late-2026
- https://github.com/CodeHalwell/agent-framework-rs/blob/main/PARITY.md
- https://atlan.com/know/ai-agent/ai-agent-applications/what-is-google-adk/
- https://adk.dev/agents/llm-agents/
- https://medium.com/google-cloud/give-your-ai-agents-deep-understanding-coding-the-multi-agent-adk-solution-041e844cdebb
- https://adk.dev/tools-custom/function-tools/
- https://www.linkedin.com/posts/shubhamsaboo_build-a-multi-agent-ai-team-with-code-execution-activity-7403497901785530368-EaQV
- https://www.youtube.com/watch?v=0_i01D84nQo
- https://wolfintelligence.ai/blog/building-ai-agent-swarms-google-adk-multi-agent-architecture
- https://www.firecrawl.dev/blog/google-adk-multi-agent-tutorial
- https://blog.whoisjsonapi.com/how-modern-ai-agents-use-harnesses-for-planning-execution-and-recovery/
- https://emasterlabs.com/ai-frameworks-for-multi-agent-systems/
- https://www.researchgate.net/publication/391776617_AI_Agents_vs_Agentic_AI_A_Conceptual_Taxonomy_Applications_and_Challenges
- https://dokumen.pub/building-applications-with-ai-agents-designing-and-implementing-multiagent-systems-1.html
- https://aivss.owasp.org/assets/publications/AIVSS%20Scoring%20System%20For%20OWASP%20Agentic%20AI%20Core%20Security%20Risks%20v0.8.pdf
- https://arxiv.org/html/2505.10468v1
- https://www.scribd.com/document/912639055/AgentVsAgentic
- https://genmind.ch/posts/Multi-Agent-Orchestration-Patterns-Building-Collaborative-AI-Teams/
- https://medium.com/@mohitcharan04/comprehensive-comparison-of-ai-agent-frameworks-bec7d25df8a6
- https://learn.microsoft.com/en-us/azure/foundry/agents/concepts/hosted-agents
- https://www.linkedin.com/posts/algosrus_linux-gave-developers-a-powerful-open-source-activity-7500516583027449856-t340
- https://github.com/sickn33/agentic-awesome-skills/blob/main/CATALOG.md
- https://www.ituonline.com/page/432/?route=product%2Fspecial&sort=ps.price&order=ASC&limit=50
- https://arxiv.org/list/cs.AI/new
- https://steepworks.io/digest
- https://supplychainstrategy.media/blog/topic/ai-in-supply-chain/
- https://www.mindstudio.ai/blog/what-is-react-loop-ai-agent-reasoning
- https://github.com/EponaLab/ai-news/blob/main/research/agentic-design-patterns.md
- https://thinking.inc/en/pillar-pages/agentic-ai-architecture/
- https://adk.dev/agents/workflow-agents/sequential-agents/
- https://adk.dev/agents/custom-agents/
- https://adk.dev/agents/workflow-agents/
- https://github.com/google/adk-python/discussions/5581
- https://medium.com/google-cloud/agent-patterns-with-adk-1-agent-5-ways-58bff801c2d6
- https://github.com/google/adk-python/discussions/4346
- https://docs.temporal.io/ai/cookbook/multi-agent-adk-python
- https://adk.dev/api-reference/python/google-adk.html
- https://codelabs.developers.google.com/devsite/codelabs/build-agents-with-adk-orchestrating-agent-workflows?hl=en
- https://levelup.gitconnected.com/need-an-all-inclusive-agent-development-framework-google-adk-is-the-answer-e8cc91587811
- https://adk.dev/agents/workflow-agents/loop-agents/
- https://github.com/google/adk-docs/blob/main/docs/agents/workflow-agents/loop-agents.md
- https://addyosmani.com/agents/13-building-your-first-agent/
- https://medium.com/@sahin.samia/how-to-build-ai-agents-with-google-agent-development-kit-a-step-by-step-guide-for-beginners-a4e7e484eca5
- https://huggingface.co/datasets/menacing-american-patriot/iasgen/viewer
- https://zylos.ai/research/2026-03-01-hierarchical-ai-agent-coordination/
- https://www.scribd.com/document/887701114/ADK
- https://www.graphcompose.io/docs/agents/agent-nodes
- https://medium.com/@hams_ollo/googles-agent-development-kit-adk-revolutionizing-multi-agent-application-development-f74f9a08cdce
- https://github.com/google/adk-python/issues/147
- https://adk.dev/tools-custom/
- https://medium.com/@guolisen_38580/building-multi-agent-systems-with-googles-agent-development-kit-adk-3919378be812
- https://sidbharath.com/blog/the-complete-guide-to-googles-agent-development-kit-adk/
- https://iamulya.one/posts/designing-multi-agent-architectures/
- https://discuss.google.dev/t/using-googles-agent-development-kit-adk-with-mcp-toolbox-and-neo4j/187356
- https://medium.com/@senpubali7/i-built-a-multi-agent-content-ops-system-with-google-adk-2-0-384204bc1fb6
- https://www.scribd.com/document/880433251/Adk-Docs-Llms
- https://servicesground.com/blog/agent-architecture-patterns/
- https://docs.cloud.google.com/architecture/patterns-for-floating-ip-addresses-in-compute-engine
- https://docs.mendix.com/agents/agents/
- https://agentic-patterns.com/patterns/agent-driven-research/
- https://daily.dev/blog/multi-tenant-database-design-patterns-2024/
- https://medium.com/@adnanmasood/engineering-trustworthy-lm-agents-with-scratchpads-and-verifiers-5c1084533be7
- https://www.linkedin.com/top-content/technology/automation-implementation-tips/how-to-think-like-an-automation-architect/
- https://www.scribd.com/document/965588403/Engineering-Reliable-AI-Agents-Workflows-EarlyAccess
- https://medium.com/@sitabjapal03/langgraph-part-4-human-in-the-loop-for-reliable-ai-workflows-aa4cc175bce4
- https://docs.langchain.com/oss/javascript/concepts/human-in-the-loop
- https://www.flowhunt.io/blog/human-in-the-loop-middleware-python-safe-ai-agents/
- https://aws-news.com/article/2026-10-01-building-ambient-agents-with-amazon-bedrock-agentcore-from-event-driven-signals-to-human-in-the-loop-workflows
- https://www.linkedin.com/posts/juan-albarran-23a54217a_building-ambient-agents-with-amazon-bedrock-activity-7513049002985177089-Xc0x
- https://explore.n1n.ai/blog/building-ambient-agents-amazon-bedrock-agentcore-event-driven-2026-10-06
- https://www.linkedin.com/posts/andy-widjaja-aws_github-aws-samplessample-ambient-agent-activity-7512927362980839424-7mnJ
- https://www.threads.com/@realamrutpatil/post/DXNqvqEkxtg/most-ai-agents-die-in-the-poc-graveyard-you-can-hack-one-together-on-your
- https://gabrieljaime.com.ar/radar/55e3e5d2-c562-4ec3-a1c4-6d3d7c1008af
- https://www.linkedin.com/posts/rmprado_building-ambient-agents-with-amazon-bedrock-activity-7512828950788591616-c8nj
- https://x.com/KagawaTomo/status/2116424754433507414
- https://temporal.io/
- https://docs.temporal.io/ai
- https://temporal.io/blog/manetu-the-thread-is-the-workflow
- https://www.reddit.com/r/LangChain/comments/1uxresv/has_anyone_successfully_used_temporal_as_the/
- https://decagon.ai/glossary/what-is-durable-execution
- https://temporal.io/blog/of-course-you-can-build-dynamic-ai-agents-with-temporal
- https://www.reddit.com/r/programming/comments/1j9ncni/durable_execution_this_changes_everything/
- https://temporal.io/llm-info
- https://activewizards.com/blog/indestructible-ai-agents-a-guide-to-using-temporal/
- https://www.linkedin.com/posts/fellowint_multi-agent-is-simply-when-several-ai-agents-activity-7507756225363726337-CziR
- https://gigazine.net/gsc_news/en/20250616-built-multi-agent/
- https://www.facebook.com/xixidu/posts/anthropic-introduces-claudes-research-mode-a-leadresearcher-claude-opus-4-agent-/10171770115270637/
- https://www.facebook.com/entrelligence/videos/anthropic-launches-claude-science-ai-workbench-for-researchersanthropic-has-offi/2097813564177322/
- https://arstechnica.com/ai/2025/05/claudes-ai-research-mode-now-runs-for-up-to-45-minutes-before-delivering-reports/
- https://www.instagram.com/p/DYKgP8bDkSy/
- https://www.testingcatalog.com/new-claude-capability-in-the-works-to-merge-research-and-mcp-integrations/
- https://max-productive.ai/blog/claude-sonnet-4-5-announcement-2025/
- https://guides.library.ttu.edu/c.php?g=1444278
- https://www.linkedin.com/posts/a-banks_openai-a-practical-guide-to-building-agents-activity-7318966973256650754-D6ZB
- https://www.reddit.com/r/AI_Agents/comments/1k590pq/a_practical_guide_to_building_agents/
- https://www.duanlightfoot.com/posts/what-i-learned-from-openais-guide-to-building-agents/
- https://www.youtube.com/watch?v=0tvsX3BacZY
- https://towardsdatascience.com/single-agent-vs-multi-agent-when-to-build-a-multi-agent-system/
- https://www.langchain.com/blog/building-multi-agent-applications-with-deep-agents
- https://arxiv.org/html/2505.09875v2
- https://www.scribd.com/document/1075676827/AI-Agents-in-Depth-En
- https://www.alekseialeinikov.com/en/blog/topics/ai/context-engineering-2026-what-replaced-prompt-engineering
- https://mastra.ai/articles/context-engineering
- https://www.linkedin.com/posts/dheerapat-tookkane-809284160_effective-context-engineering-for-ai-agents-activity-7379509175804014592-xtz-
- https://sourcegraph.com/blog/context-engineering
- https://medium.com/data-agents-dojo/context-engineering-for-system-of-record-agents-why-enterprise-ai-needs-a-different-playbook-6a52a50a92f0
- https://www.workflowbuilder.io/blog/langgraph-vs-langchain
- https://medium.com/womenintechnology/langgraph-workflows-and-agents-a-deep-dive-part-1-9858316fcc88
- https://www.spheron.network/blog/langgraph-vs-langchain/
- https://www.langchain.com/blog/deep-agents-vs-langchain-vs-langgraph
- https://aiagentskit.com/blog/ai-agent-design-patterns-reflection-planning-tool-use/
- https://aws.amazon.com/blogs/industries/agentic-ai-in-financial-services-choosing-the-right-pattern-for-multi-agent-systems/
- https://www.egnyte.com/blog/post/inside-the-architecture-of-a-deep-research-agent
- https://www.linkedin.com/posts/ekue-kpodar_ai-agent-and-agentic-ai-are-not-the-same-activity-7505285663743885312--Ph4
- https://www.elastic.co/es/pdf/agentic-frameworks-practical-considerations-for-building-ai-augmented-security-systems.pdf
- https://allen.hutchison.org/category/using-ai/the-agentic-shift/
- https://agentswarms.fyi/learn
- https://learn.temporal.io/tutorials/ai/building-mcp-tools-with-temporal/adding-hitl-to-mcp-tools/
- https://www.scribd.com/document/938448150/Agentic-Design-Patterns
- https://github.com/amitshekhariitbhu/ai-engineering-interview-questions/blob/main/README.md
- https://irawarrenwhiteside.com/
- https://arxiv.org/abs/2411.04468
- https://arxiv.org/html/2411.04468v1
- https://microsoft.github.io/autogen/stable//reference/python/autogen_ext.teams.magentic_one.html
- https://www.alphaxiv.org/abs/2411.04468
- https://www.linkedin.com/pulse/ai-agent-everyone-part-5-magentic-one-multi-agent-tasks-govindaraj-71ryc
- https://pub.towardsai.net/meet-magentic-one-microsofts-new-multi-agent-framework-for-solving-complex-tasks-5459c34e4261
- https://www.researchgate.net/publication/385630524_Magentic-One_A_Generalist_Multi-Agent_System_for_Solving_Complex_Tasks
- https://blog.gopenai.com/dissecting-magentic-one-a-modular-multi-agent-system-for-autonomous-complex-task-execution-c1b6df2dc749
- https://agentpatterns.ai/patterns/multi-agent/magentic-orchestration/
- https://microsoft.github.io/autogen/stable//user-guide/core-user-guide/design-patterns/group-chat.html
- https://microsoft.github.io/autogen/0.2/docs/reference/agentchat/groupchat/
- https://github.com/microsoft/autogen/issues/5335
- https://github.com/microsoft/autogen/discussions/2943
- https://microsoft.github.io/autogen/stable//reference/python/autogen_agentchat.teams.html
- https://github.com/microsoft/autogen/discussions/5997
- https://microsoft.github.io/autogen/stable//user-guide/agentchat-user-guide/selector-group-chat.html
- https://microsoft.github.io/autogen/0.2/blog/2024/02/11/FSM-GroupChat/
- https://github.com/microsoft/autogen/issues/2359
- https://github.com/microsoft/autogen/issues/2499
- https://services.google.com/fh/files/blogs/latest_new_agentic_landscape_agentic_transformation_framework.pdf
- https://machinelearningmastery.com/choosing-the-right-agentic-design-pattern-a-decision-tree-approach/
- https://github.com/buraketmen/langchain-agent
- https://medium.com/womenintechnology/langgraph-workflows-and-agents-implementing-parallelization-part-3-31d5f00b078d
- https://hld.handbook.academy/curriculum/ai-ml-system-design/multi-agent-orchestration/
- https://www.linkedin.com/pulse/langgraph-routing-orchestrator-worker-evaluator-optimizer-yash-sarode-qqbcc
- https://www.ema.ai/additional-blogs/addition-blogs/multi-agent-workflows-langchain-langgraph
- https://docs.aws.amazon.com/pdfs/prescriptive-guidance/latest/agentic-ai-economics/agentic-ai-economics.pdf
- https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-economics/feedback.html
- https://docs.aws.amazon.com/pdfs/prescriptive-guidance/latest/agentic-ai-frameworks/agentic-ai-frameworks.pdf
- https://docs.aws.amazon.com/prescriptive-guidance/latest/semantic-layer-agentic-ai-ontology-reasoning-virtual-knowledge-graph/semantic-layer-agentic-ai-ontology-reasoning-virtual-knowledge-graph.html
- https://repost.aws/articles/ARRfjH_lA4TZeKnM0OU0iYkg/secure-your-ai-agents-on-aws-part-1-inputs-identity-and-human-oversight
- https://docs.aws.amazon.com/prescriptive-guidance/latest/agent-ops-maturity-roadmap-for-enterprise-ai/platform-operations.html
- https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/workflow-for-evaluators-and-reflect-refine-loops.html
- https://d1.awsstatic.com/onedam/marketing-channels/website/aws/en_US/security/Amazon-Response-to-CAISI-RFI.pdf
- https://www.linkedin.com/posts/the-ivan_effective-context-engineering-for-ai-agents-activity-7379474740803104768-oJJh
- https://aicodingpatterns.com/en/patterns/context-engineering/
- https://blogs.justenougharchitecture.com/context-engineering-stop-stuffing-the-window/
- https://github.com/ianhxu/agentic-engineering-field-study/blob/main/02-context-engineering.md
- https://valdemird.com/learn/agentic-systems/context-engineering/
- https://www.flowhunt.io/blog/context-engineering-ai-agents-token-optimization/
- https://orbilontech.com/context-engineering/
- https://platform.claude.com/cookbook/cost-optimization-cost-optimization
- https://www.developersdigest.tech/blog/claude-advisor-tool-vs-bigger-model-2026
- https://www.facebook.com/Rajpaul83/videos/advisor-toolpair-a-faster-executor-model-with-a-higher-intelligence-advisor-mode/2870626356637117/
- https://www.mindstudio.ai/blog/anthropic-advisor-strategy-cut-ai-agent-costs
- https://www.cleveroad.com/blog/claude-api-cost-optimization-enterprise/
- https://dotzlaw.com/insights/ai-32-advisor-tool-pattern/
- https://www.linkedin.com/top-content/artificial-intelligence/ai-model-development/ai-voice-model-cost-efficiency-analysis/
- https://www.facebook.com/MicrosoftCanada/videos/agent-academy-video/4183987681912026/
- https://zenn.dev/kai_kou/articles/207-claude-advisor-tool-guide?locale=en
- https://generativeai.pub/practical-claude-code-configuration-for-the-tasks-you-actually-repeat-every-day-9ceedfb8ab97
- https://www.youtube.com/watch?v=89KKm_a4M7A&vl=en-US
- https://nader.substack.com/p/the-complete-guide-to-building-agents
- https://dev.to/akdevcraft/subagents-the-building-block-of-agentic-ai-4ngo
- https://www.reddit.com/r/AI_Agents/comments/1nxyz10/how_to_use_the_claude_agent_sdk_for_noncoding/
- https://thomas-wiegold.com/blog/claude-agent-sdk-guide/
- https://aankitroy.com/blog/claude-agent-sdk-building-agents-that-work
- https://skywork.ai/blog/mcp-server/claude-agent-sdk-best-practices-ai-agents-2025?lang=es-419
- https://note.com/samurai_worker/n/n33dfefdac258?hl=en
- https://www.c-sharpcorner.com/article/building-intelligent-agents-with-claude-agent-sdk-features-comparisons-and-be?srsltid=AYCX9vKB22HSi8RiMEUl-TkOreXCxW133hGwRQ1azvOOFwnRJi4LX129
- https://www.linkedin.com/posts/rubendcolmenares_effective-harnesses-for-long-running-agents-activity-7414508609574735872-CoSz
- https://sublime.app/card/building-agents-with-the-claude-agent-sdk
- https://www.langchain.com/blog/agentic-rag-with-langgraph
- https://medium.com/@pankaj_pandey/implementing-agentic-retrieval-augmented-generation-rag-with-langgraph-b9687b3ab177
- https://www.youtube.com/watch?v=98HaWtfd6ek
- https://pub.towardsai.net/implementing-agentic-rag-using-langgraph-groq-fastapi-e35dacb89548
- https://machinelearningplus.com/gen-ai/langgraph-rag-agent-retrieval-augmented-generation/
- https://www.reddit.com/r/LangChain/comments/1s13mdm/i_built_an_8node_agentic_rag_with_langgraph_that/
- https://bigdataboutique.com/blog/building-agentic-rag-with-langgraph-opensearch
- https://levelup.gitconnected.com/agentic-ai-with-langchain-part-2-orchestrating-workflow-by-langgraph-f06dfc18a53a
- https://www.studiofledge.com/insights/building-an-intelligent-agentic-rag-system-with-langgraph
- https://x.com/Saboo_Shubham_/status/1758026801475907943
- https://achan2013.medium.com/choosing-the-right-ai-agent-strategy-b72625bf49f3
- https://www.flowhunt.io/blog/advanced-ai-agents-how-to-make-ai-agents-plan-effectively/
- https://aipatternbook.com/plan-and-execute
- https://jacar.es/en/planning-and-task-decomposition-in-agents/
- https://www.zair.top/en/post/ai-agent-design-pattern/
- https://learn.factored.ai/courses/course-v1:Factored+SWJedAI006+2026T1/about
- https://agent-patterns.readthedocs.io/_/downloads/en/stable/pdf/
- https://stately.ai/docs/packages/agent/langgraph-comparison
- https://labhub.hopto.org/blog/2026-07-11-building-effective-ai-agents?lang=en
- https://spring.io/blog/2025/01/21/spring-ai-agentic-patterns
- https://resources.anthropic.com/building-effective-ai-agents
- https://atalupadhyay.wordpress.com/2025/03/11/building-effective-ai-agents-a-hands-on-guide-to-anthropics-agent-design-patterns/
- https://www.agentagency.ai/articles/multiagent-systems-when-one-ai-agent-isnt-enough
- https://www.lyzr.ai/blog/agentic-workflows/
- https://www.linkedin.com/posts/rakeshgohel01_if-ai-agents-are-complicated-then-you-can-activity-7366086017935691777-KZK9
- https://www.vibecodingacademy.ai/blog/claude-code-subagents-complete-guide
- https://tw93.fun/en/2026-03-21/agent.html
- https://hussamahmed.com/ai/foundations/agentic-design-patterns
- https://www.facebook.com/InfoQdotcom/posts/cli-tools-are-becoming-agentic-developers-define-goals-and-ai-agents-plan-use-to/1560013582802147/
- https://www.studocu.com/row/document/universite-hassan-1er/introduction-au-python/ai-agents-a-practical-guide-to-building-effective-systems/135161756
- https://www.linkedin.com/posts/engraliraza1_building-effective-ai-agents-activity-7429947891399585792-SbjB
- https://www.scribd.com/document/981101437/AI-Agents-the-Past-Present-and-Future
- https://www.aiinsightshub.org/
- https://www.facebook.com/fb-answers/anthropic-building-effective-agents-definition/
- https://huggingface.co/blog/Sri-Vigneshwar-DJ/building-effective-agents-with-anthropics-best-pra
- https://maa1.medium.com/learning-from-anthropic-about-building-effective-agents-2a7469941428
- https://www.agentsdecoded.com/p/an-analysis-of-anthropics-guide-to
- https://www.taskade.com/wiki/ai-agents/plan-and-execute
- https://exalted-ai.com/blog/planning-and-scheduling-harnesses
- https://github.com/aws-samples/sample-ambient-agents-on-agentcore
- https://aws.amazon.com/blogs/machine-learning/agentwatch-proactive-aws-monitoring-with-ambient-agents/
- https://www.linkedin.com/posts/vivek-mittal-0755181_agentwatchan-ambient-aws-resource-monitoring-activity-7394377273438543874-BfXv
- https://builder.aws.com/connect/space/7e5f51ef-0919-32da-aaa7-ddf263651d69/aws-ai-league
- https://www.linkedin.com/posts/unitary-tech-global_build-agentic-retrieval-on-a-managed-amazon-activity-7520636627749244928-HFHk
- https://noise.getoto.net/tag/intermediate-200/
- https://classic.yarnpkg.com/en/package/@aws-sdk/client-scheduler
- https://dir.texas.gov/sites/default/files/2025-09/TX-RAMP%20Certified%20Cloud%20Products%209.10.24.xlsx
- https://www.thankyouagent.com/cases
- https://skill.re/course/skill-re/agent-builders-l4/durable-execution-for-long-running-agents-temporal-vs-inngest-vs-langgraph-platform/
- https://www.linkedin.com/top-content/artificial-intelligence/ai-agent-system-fundamentals/durable-execution-for-long-running-ai-agents/
- https://www.augmentcode.com/guides/async-ai-agent-workflows
- https://github.com/ombharatiya/ai-system-design-guide/blob/main/07-agentic-systems/11-durable-execution.md
- https://www.langchain.com/blog/managed-deep-agents-is-now-in-public-beta
- https://www.facebook.com/groups/3670562573177653/posts/4726542374246329/
- https://brightlume.ai/blog/long-running-ai-agents-scheduling-durability-recovery
- https://www.langchain.com/blog/langgraph-cloud
- https://www.workflowbuilder.io/blog/reliability-is-the-new-model-selection
- https://www.linkedin.com/posts/sooraj-aryan-213b5a114_choose-a-design-pattern-for-your-agentic-activity-7443151927313510400-E7Mj
- https://medium.com/vedcraft/agentic-design-patterns-you-should-know-google-cloud-architecture-center-1347c551daf3
- https://www.linkedin.com/posts/swwapnilp_design-pattern-of-agentic-ai-system-activity-7391370881387769856-pDNE
- https://www.linkedin.com/posts/saiharshakondaveeti_choose-a-design-pattern-for-your-agentic-activity-7442843067654639616-V17m
- https://www.linkedin.com/posts/raj-patel-08907b219_artificialintelligence-ai-claude-activity-7453178430885457921-Z_My
- https://arxiv.org/html/2506.08119v1
- https://github.com/GSA/MasteringAgenticAISystems_supplementals/blob/master/Study_Plan.md
- https://aclanthology.org/volumes/2026.findings-emnlp/
- https://arxiv.org/html/2601.05264v1
- https://www.itechguides.com/7-must-know-agentic-ai-design-patterns-and-when-to-use-each/
- https://www.linkedin.com/posts/mani-nagasundaram-959536_ai-model-churn-is-now-a-core-enterprise-architecture-activity-7506787968108593152-hD-w
- https://kanerika.com/blogs/data-pipeline-architecture/
- https://techcommunity.microsoft.com/tag/azure%20ai%20search
- https://www.domo.com/glossary/cloud-etl
- https://www.ntuclearninghub.com/en-US/-/course/enterprise-ai-fluency-for-tech-teams-building-a-consistent-ai-capability-baseline-across-every-technical-role
- https://docs.aws.amazon.com/pdfs/sap/latest/general/general.pdf
- https://www.conduktor.io/glossary/kafka-topic-design-guidelines
- https://www.crmfirst.de/wp-content/uploads/2024/05/2021-Dynamics-365-Implementation-Guide-v2.pdf
- https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/integration-overview
- https://www.devopsschool.com/blog/principal-cloud-engineer-role-blueprint-responsibilities-skills-kpis-and-career-path/
- https://github.com/addyosmani/agent-engineer/blob/main/04-agentic-design-patterns/README.md
- https://www.scribd.com/document/1037794992/Agentic-ai-Design-patterns
- https://www.linkedin.com/top-content/artificial-intelligence/ai-tools-applications-guide/ai-model-decision-chart-for-different-tasks/
- https://addyosmani.com/agents/04-agentic-design-patterns/
- https://medium.com/@saurabhraj042/classic-system-design-isnt-enough-anymore-meet-agentic-system-design-9e729a2f603e
- https://www.facebook.com/groups/techtitansgroup/posts/1682358136424831/
- https://www.designpattern.fyi/trade_offs/
- https://codingprotocols.com/blog/series/comparisons
- https://www.linkedin.com/top-content/artificial-intelligence/ai-strategy-planning/plan-and-execute-ai-agent-use-cases/
- https://in.linkedin.com/in/krishna-chaitanya-pabbu
- https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-economics/understanding.html
- https://docs.aws.amazon.com/prescriptive-guidance/latest/agent-ops-maturity-roadmap-for-enterprise-ai/introduction.html
- https://www.mckinsey.com/capabilities/quantumblack/our-insights/is-that-ai-agent-worth-it-agentic-economics-and-the-modern-operating-model
- https://online.stevens.edu/blog/hidden-economics-ai-agents-token-costs-latency/
- https://medium.com/@manavghosh/token-economics-in-agentic-ai-a-comprehensive-analysis-b19631e4386b
- https://arxiv.org/html/2604.22750v3
- https://www.cockroachlabs.com/blog/agentic-ai-costs-at-scale/
- https://www.linkedin.com/posts/rpmachado_how-we-built-our-multi-agent-research-system-activity-7490673993558065153-O5zZ
- https://zylos.ai/research/2026-04-21-deep-research-agent-architectures/
- https://www.sartechlabs.com/blog/building-ai-agents-with-anthropic
- https://www.testmuai.com/learning-hub/multi-agent-ai-systems/
- https://digitalportalofficial.com/agentic-workflows-are-turning-ai-into-autonomous-teams/
- https://www.linkedin.com/posts/raphaelmansuy_scaling-ai-research-lessons-from-building-activity-7339901527261671424-5_a6
- https://www.gamut.so/blog/multi-agent-systems
- https://aerospike.com/blog/ai-infrastructure-guide
- https://corporateplaybookpro.com/how-to-use-claude-ai-for-business/
- https://medium.com/@yingzuoliu/30-000-agents-changed-how-i-think-about-agent-infrastructure-af92ddc8820f
- https://www.facebook.com/ch.nemri/posts/%EF%B8%8F-%F0%9D%90%96%F0%9D%90%AB%F0%9D%90%A2%F0%9D%90%AD%F0%9D%90%A2%F0%9D%90%A7%F0%9D%90%A0-%F0%9D%90%9E%F0%9D%90%9F%F0%9D%90%9F%F0%9D%90%9E%F0%9D%90%9C%F0%9D%90%AD%F0%9D%90%A2%F0%9D%90%AF%F0%9D%90%9E-%F0%9D%90%AD%F0%9D%90%A8%F0%9D%90%A8%F0%9D%90%A5%F0%9D%90%AC-%F0%9D%90%9F%F0%9D%90%A8%F0%9D%90%AB-%F0%9D%90%9A%F0%9D%90%A0%F0%9D%90%9E%F0%9D%90%A7%F0%9D%90%AD%F0%9D%90%AC-%F0%9D%90%B0%F0%9D%90%A2%F0%9D%90%AD%F0%9D%90%A1-%F0%9D%90%9A%F0%9D%90%A0%F0%9D%90%9E%F0%9D%90%A7%F0%9D%90%AD%F0%9D%90%ACanthropic-recently-shared-insigh/803017745575114/
- https://www.firecrawl.dev/alexandria/anthropic-com
- https://www.facebook.com/DeepLearningAIHQ/posts/agent-skills-with-anthropic-is-now-livethis-new-short-course-built-with-anthropi/1399148338671872/
- https://dannyzheng.me/2025/01/12/building-effective-agents/
- https://www.facebook.com/groups/595424764221375/posts/2276846799412488/
- https://www.linkedin.com/posts/rob-palumbo-canada_building-effective-agents-activity-7278188446043545600-VY1s
- https://www.conf42.com/Python_2025_Craig_West_agentic_ai_django
- https://johncodes.com/archive/2025/01-11-whats-an-ai-agent/
- https://www.augmentcode.com/guides/agentic-ai-architecture-patterns
- https://pub.towardsai.net/7-essential-ai-agent-design-patterns-130fdcd74d24
- https://newsletter.systemdesign.one/p/agent-to-agent-protocol
- https://medium.com/@eshetieyabibal/mastering-multi-agent-systems-and-architecture-patterns-0441e2b0e364
- https://machinelearningmastery.com/agentic-workflow-vs-autonomous-agent-whats-the-difference/
- https://codewave.com/feeds/blog/multiagent-ai-systems-financial-services
- https://developers.llamaindex.ai/python/framework/understanding/agent/multi_agent/
- https://appunik.ai/blog/ai-agent-prd-template
- https://logic.inc/guides/how-to-build-an-ai-agent
- https://arxiv.org/html/2411.13768v3
- https://knowledge-base.software/guides/ai-chatbot-knowledge-base/
- https://www.linkedin.com/top-content/artificial-intelligence/ai-safety-and-risk-management/harness-level-guardrails-for-ai-models/
- https://www.tecknowhow.com/private/article/8-mistakes-companies-make-when-deploying-ai-agents/
- https://www.scribd.com/document/1072248193/AI-Agents-in-Depth-En
- https://www.hexagonflux.com/blog
- https://www.designpattern.fyi/glossary/
- https://learn.microsoft.com/en-us/agent-framework/workflows/human-in-the-loop
- https://learn.microsoft.com/en-us/agent-framework/agents/tools/tool-approval
- https://learn.microsoft.com/en-us/agent-framework/overview/
- https://learn.microsoft.com/en-us/agent-framework/concepts/workflows/state
- https://medium.com/@sainitesh/using-function-tools-with-human-in-the-loop-approvals-90b57b12f8d6
- https://www.youtube.com/watch?v=nENs3UndI2o
- https://www.linkedin.com/posts/pamela-s-fox_python-ai-agents-activity-7435479633657069568-wybU
- https://jesseliberty.com/2026/09/14/microsoft-agent-framework-human-in-the-loop/
- https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec04-bp02.html
- https://aws.amazon.com/blogs/architecture/automating-agentic-ai-well-architected-reviews-with-the-aws-agentic-ai-lens/
- https://www.linkedin.com/posts/stepsalim_aws-agenticai-wellarchitected-activity-7470677251169386496-RH9l
- https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/security.html
- https://aws.amazon.com/blogs/security/four-security-principles-for-agentic-ai-systems/
- https://arxiv.org/html/2303.11366v4
- https://www.bloss0m.com/en/paper-reading/27-reflexion-verbal-reinforcement/
- https://www.krishnaik.in/ai-tutorials/ai-security/self-reflection-memory
- https://velog.io/@whdnjsdyd111/Reflexion-Language-Agents-withVerbal-Reinforcement-Learning
- https://huggingface.co/Rohan03/purpose-agent/blame/ab5adb42b96d8f7a537688e35faac61ce086a81f/COMPILED_RESEARCH.md
- https://gptget.net/papers/2303.11366?lang=en
- https://cbarkinozer.medium.com/foundational-papers-in-llm-agent-domain-f6b14d3d9eda
- https://aistudio.google.com/learn/deep-research-developer-guide
- https://ai.google.dev/gemini-api/docs/google-search
- https://www.therundown.ai/tools/gemini-deep-research-agent
- https://ai.google.dev/gemini-api/docs/gemini-for-research
- https://www.mindstudio.ai/blog/google-gemini-deep-research-api
- https://www.theunwindai.com/p/build-an-ai-research-agent-with-google-interactions-api-gemini-3
- https://medium.com/@codeandbird/google-gemini-just-got-way-smarter-27ef9ef7c82c
- https://www.youtube.com/watch?v=pbAd8O1Lvm4
- https://medium.com/@colemcintosh6/corrective-and-self-reflective-rag-with-langgraph-364b7452fc3e
- https://pub.towardsai.net/how-to-build-advanced-rag-with-langgraph-a70350396589
- https://dataaspirant.com/blog/corrective-rag/
- https://scrapbox.io/nikkie-memos/Self-Reflective_RAG_with_LangGraph
- https://billtcheng2013.medium.com/retrieval-augmented-generation-part-3-834a4f30442f
- https://www.youtube.com/watch?v=pZ7tqESUPtk
- https://siriusec.com/learngraph/learngraph-1x/module-13-agentic-rag/13.10-Corrective-RAG
- https://docs.aws.amazon.com/zh_cn/wellarchitected/latest/agentic-ai-lens/cost-optimization.html
- https://azure.microsoft.com/en-us/blog/tag/agent-factory/
- https://azure.microsoft.com/en-us/blog/agent-factory-from-prototype-to-production-developer-tools-and-rapid-agent-development/
- https://www.youtube.com/watch?v=WH9iBu9hT4E
- https://azure.microsoft.com/en-us/blog/agent-factory-top-5-agent-observability-best-practices-for-reliable-ai/
- https://azure.microsoft.com/en-us/blog/agent-factory-building-your-first-ai-agent-with-the-tools-to-deliver-real-world-outcomes/
- https://windowsforum.com/threads/azure-ai-foundry-the-agent-factory-for-end-to-end-enterprise-automation.377576/
- https://medium.com/codex/building-ai-apps-and-agents-with-the-full-azure-stack-a-deep-dive-into-microsoft-foundry-agents-ee1bbb9ff18b
- https://ai.azure.com/
- https://www.youtube.com/watch?v=DUdRdeUtuZQ
- https://www.promptingguide.ai/guides/deep-research
- https://www.facebook.com/shanolj/posts/day-19100-something-i-believe-everyone-should-understand-in-the-ai-eradeep-resea/1133682162506695/
- https://www.lesswrong.com/posts/SLiXeZvEkD4XbX7yy/openai-releases-deep-research-agent
- https://answers.businesslibrary.uflib.ufl.edu/faq/425852
- https://www.reddit.com/r/ChatGPTPro/comments/1ikt7ul/deep_research_dispatch_openais_answers_to_your/
- https://researchmonkey.ai/guides/deep-research-ai
- https://www.linkedin.com/pulse/prompt-engineering-guide-deep-research-chatgpts-max-van-den-broek-9itwe
- https://www.coursera.org/articles/chatgpt-deep-research
- https://www.profitec-ai.com/blog/openai-deep-research-api-connectors
- https://docs.aws.amazon.com/prescriptive-guidance/latest/patterns/use-bmc-discovery-queries-to-extract-migration-data-for-migration-planning.html
- https://uk.linkedin.com/in/chanzaw
- https://www.instagram.com/shivanshu_builds/
- https://cobusgreyling.medium.com/anthropics-research-on-genai-building-blocks-bb20803a2bef
- https://www.anthropic.com/research/employment-at-anthropic
- https://www.science.org/doi/10.1126/sciadv.aea6091
- https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/magentic
- https://learn.microsoft.com/en-us/python/api/agent-framework-core/agent_framework.magenticbuilder?view=agent-framework-python-latest
- https://billtcheng2013.medium.com/microsoft-agent-framework-8a36dbc4119c
- https://ravichaganti.com/blog/magentic-workflows-in-microsoft-agent-framework/
- https://www.linkedin.com/posts/ajenns_agent-framework-documentation-activity-7465090645809065985-V72c
- https://tech.kingdavidconsulting.com/design-patterns-for-agentic-ai-systems
- https://zenity.io/academy/agentic-ai-architecture
- https://docs.cloud.google.com/architecture/single-agent-ai-system-adk-cloud-run
- https://medium.com/@neeraj4321/agentic-ai-patterns-demystified-6c937315d602
- https://www.lindy.ai/blog/ai-agent-architecture
- https://link.springer.com/article/10.1007/s12559-026-10619-1
- https://www.youtube.com/watch?v=eobRfdy8tu4
- https://beam.ai/agentic-insights/multi-agent-orchestration-patterns-production
- https://www.linkedin.com/posts/greg-coquillo_ai-agent-orchestration-patterns-activity-7395113321798012928-VKuL
- https://www.digitalapplied.com/blog/multi-agent-orchestration-5-patterns-that-work
- https://www.getorchestra.io/guides/ai-agent-system-design
- https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/coding-agents.html
- https://dev.to/zeeshanhshaheen/design-patterns-of-agentic-ai-334c
- https://www.linkedin.com/top-content/artificial-intelligence/skills-for-the-ai-workforce/best-practices-for-ai-skill-bundling/
- https://theaiengineer.substack.com/p/agentic-rag-vs-cua-vs-a2a
- https://www.mdpi.com/1999-5903/17/9/404
- https://pub.towardsai.net/agentic-ai-design-patterns-and-flow-diagrams-b5cf91ba35f6
- https://www.mastek.com/glossary/what-is-agentic-ai/
- https://redis.io/blog/react-agents-explained-concepts-practical-uses/
- https://www.linkedin.com/top-content/artificial-intelligence/understanding-ai-systems/domain-specific-ai-workflows-explained/
- https://better-agents.articulate-ai.work/
- https://spaceandstory.co/blog/agentic-ai-glossary
- https://www.facebook.com/joyatrestech/posts/9-agentic-workflows-1-diagrammost-builders-only-know-2-of-themhere-is-each-one-a/1691384402992187/
- https://vasanths.medium.com/build-ai-workflows-and-ai-agents-using-pure-python-locally-6cec9b86dd38
- https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/prompt-chaining-saga-patterns.html
- https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/workflow-for-prompt-chaining.html
- https://www.youtube.com/watch?v=MrD9tCNpOvU
- https://aws.amazon.com/blogs/machine-learning/building-generative-ai-prompt-chaining-workflows-with-human-in-the-loop/
- https://www.linkedin.com/posts/avinash-kumar-00099030_5-workflow-design-patterns-for-agentic-ai-activity-7391900593109389312-tE3u
- https://cloud.google.com/discover/human-in-the-loop
- https://www.linkedin.com/posts/kprasadrao_the-full-agentic-ai-stack-explained-building-activity-7513953835879407616-XBmO
- https://zapier.com/blog/human-in-the-loop/
- https://redis.io/blog/ai-human-in-the-loop/
- https://www.ibm.com/think/topics/human-in-the-loop
- https://www.facebook.com/MachineLearningMastery/posts/choosing-the-right-agentic-design-pattern-a-decision-tree-approach/1548355139979893/
- https://daily.dev/posts/choosing-the-right-agentic-design-pattern-a-decision-tree-approach-ry65pcmxy
- https://www.linkedin.com/posts/ela-analytics_choosing-the-right-agentic-design-pattern-activity-7460364764943200256-SPJ3
- https://www.pelayoarbues.com/literature-notes/articles/choosing-the-right-agentic-design-pattern-a-decision-tree-approach
- https://www.instagram.com/p/DY1jltKHAmB/
- https://machinelearningmastery.com/blog/page/10/
- https://www.linkedin.com/posts/jesallay_choosing-the-right-agentic-design-pattern-activity-7460758339115843585-e6ja
- https://www.linkedin.com/posts/dayouyang_choosing-the-right-agentic-design-pattern-activity-7461267414110973952-zeXX
- https://github.com/balapriyac
- https://openreview.net/forum?id=fAjbYBmonr
- https://neurips.cc/virtual/2025/122442
- https://www.linkedin.com/posts/ali-moradi-1b1b12213_researchers-improve-multi-agent-systems-by-activity-7354909391499800576-5ofP
- https://www.alphaxiv.org/abs/2503.13657
- https://sites.google.com/berkeley.edu/mast/home
- https://www.facebook.com/fb-answers/why-do-multi-agent-llm-systems-fail-mast-taxonomy-arxiv/
- https://tessary.ai/answers/failure-modes/how-do-multi-agent-systems-actually-fail
- https://orq.ai/blog/why-do-multi-agent-llm-systems-fail
- https://www.youtube.com/watch?v=GNpF_lUFRiE
- https://www.linkedin.com/posts/alvinfsc_in-14-minutes-this-anthropic-engineer-who-activity-7450739272283848704-liGJ
- https://www.reddit.com/r/ClaudeCode/comments/1p7sfo8/anthropic_just_showed_how_to_make_ai_agents_work/
- https://www.facebook.com/groups/chiefai/posts/2780124752180809/
- https://www.youtube.com/watch?v=0v7TQIh_kes
- https://www.maryammiradi.com/blog/build-ai-agents-anthropic-lessons
- https://primo.ai/wiki/Agents/Assistants
- https://www.instagram.com/reel/DeUp3MmRec7/
- https://services.google.com/fh/files/misc/startup_technical_guide_ai_agents_final.pdf
- https://www.facebook.com/groups/aiagentcircle/posts/671809445957010/
- https://www.linkedin.com/posts/ali-arsanjani_gemini-at-work-2026-introducing-gemini-agent-activity-7514017037074165760-f8sD
- https://www.xicom.biz/blog/enterprise-ai-agent-architecture/
- https://pub.towardsai.net/how-to-build-and-deploy-ai-agents-on-google-cloud-a-complete-guide-to-agents-cli-665de98a1994
- https://in.linkedin.com/in/aliraza-lakhani
- https://www.facebook.com/christopher.odhiambo.3386/posts/-anthropic-just-released-a-blueprint-for-building-effective-ai-agentsit-covers-a/1622144119386161/
- https://www.reddit.com/r/LangChain/comments/1idvz50/are_langchain_chains_just_a_deprecated_and/
- https://www.facebook.com/groups/developerkaki/posts/2403776956634870/
- https://ai.engineer/talks/FLUoowDJg4I-i-automate-my-own-job-at-hugging
- https://www.linkedin.com/posts/aron-ahmadia_agents-are-systems-that-independently-accomplish-activity-7375261573780512768--9yJ
- https://www.major.build/blog/building-ai-agents
- https://agentengineering.org/articles/what-is-an-ai-agent/
- https://cloudnsite.com/blog/what-is-an-ai-agent
- https://www.maginative.com/article/how-to-build-ai-agents-a-detailed-practical-guide-from-openai/
- https://www.youtube.com/shorts/MRaMlXMPcbo
- https://brianjenney.medium.com/a-practical-guide-on-building-ai-agents-30efce169473
- https://www.kay-rottmann.de/en/blog/building-ai-agents-practical-guide/
- https://bitpixelcoders.com/blog/building-ai-agents-that-actually-work-a-practical-guide-for-2026
- https://www.linkedin.com/posts/sytaylor_this-breakdown-of-building-ai-agents-is-a-activity-7462089606201593856-T0m-
- https://www.anthropic.com/research/multiagent-systems
- https://www.youtube.com/watch?v=D7_ipDqhtwk
- https://www.linkedin.com/posts/selina-li-2624a4198_code-execution-with-mcp-building-more-efficient-activity-7393374544918372352-mtfJ
- https://medium.com/@sanjeebmeister/an-anthropic-builders-blueprint-for-ai-agents-that-actually-work-22e675aebfd3
- https://www.linkedin.com/posts/rujutasingh_anthropics-own-engineers-are-telling-you-activity-7495421991957499904-QmjV
- https://www.anthropic.com/research/effective-harnesses-for-long-running-agents
- https://www.zenml.io/llmops-database/multi-agent-systems-in-production-code-generation-and-review-at-scale
- https://medium.com/@codewithrashid/the-agentic-org-chart-when-multi-agent-systems-actually-work-1674ad141ecf
- https://x.com/walden_yan/status/2047054554433462360
- https://jxnl.co/writing/2025/09/11/why-cognition-does-not-use-multi-agent-systems/
- https://www.youtube.com/watch?v=JYaGAqvPfYA
- https://www.linkedin.com/posts/riggsgoodman_anthropics-frontier-red-team-published-activity-7493748842174070784-eo1Y
- https://www.reddit.com/r/technology/comments/1voar6k/anthropic_patterns_and_problems_in_multiagent/
- https://www.facebook.com/groups/DeepNetGroup/posts/2905762163149980/
- https://www.jahanzaib.ai/blog/multi-agent-ai-failure-modes-anthropic-research
- https://aitoolsreview.co.uk/insights/anthropic-multiagent-safety-research
- https://apito.ai/en/blog/news/anthropic-45-agent-vulnerability-swarm/
- https://www.linkedin.com/posts/veraarlendorff_anthropics-new-multi-agent-research-is-not-activity-7493603109374566401-sh26
- https://www.linkedin.com/posts/kernelliott_patterns-and-problems-in-multiagent-systems-activity-7493987611552772096-TYf0
- https://www.instagram.com/p/Db_FCY2C2Nd/
- https://www.linkedin.com/posts/anthropicresearch_effective-harnesses-for-long-running-agents-activity-7399550329031180288-xR_w
- https://addyosmani.com/blog/long-running-agents/
- https://jinyansu1.github.io/blog/2026/07/agent-context-engineering-long-running-harness/
- https://paddo.dev/blog/agent-harnesses-from-diy-to-product/
- https://x.com/SuJinyan6/article/2073955240349770069
- https://www.dawiso.com/glossary/agent-harness-engineering
- https://www.youtube.com/watch?v=5H-QTtD991A
- https://opensource.adobe.com/ai-repo-harness-guide/READING/
- https://www.reddit.com/r/LocalLLaMA/comments/1p7siuu/anthropic_just_showed_how_to_make_ai_agents_work/
- https://nishbhana.com/Multi-Agent-Systems/
- https://latentlink.ai/blog/multi-agent-customer-support/
- https://www.linkedin.com/pulse/anatomy-agent-actually-works-rashid-mahmood-67rve
- https://github.com/AlexDuchDev/agentic-product-standard/blob/main/STANDARD.md
- https://goatsquadstudios.com/blog/how-i-work-with-ai-agents-autonomously
- https://syntaxradar.com/radar/rise-of-autonomous-ai-agents-multi-agent-workflows
- https://github.com/jdg2896/agentic-engineering/blob/main/README.md
- https://www.thedeepfeed.ai/posts/2026-05-09-agent-harness-engineering-the-discipline/
- https://www.anthropic.com/research/code-execution-with-mcp
- https://www.reddit.com/r/mcp/comments/1optq6a/more_efficient_agents_with_code_execution_instead/
- https://medium.com/@shamsul.arefin/building-an-ai-agent-with-mcp-code-execution-from-confusion-to-clarity-6b13fccc8c4b
- https://www.linkedin.com/posts/raphaelmansuy_anthropic-code-execution-with-mcp-building-activity-7391731593679118337-0yt-
- https://aimultiple.com/code-execution-with-mcp
- https://blog.gopenai.com/code-mode-mcp-a-pattern-for-building-efficient-ai-agents-8aacc4a93970
- https://newsletter.victordibia.com/p/the-arc-of-agent-action-from-code
- https://www.facebook.com/groups/aimlmalaysia/posts/2516181715448714/
- https://www.youtube.com/watch?v=o_2_s60ui48
- https://www.anthropic.com/research/advanced-tool-use
- https://watchz.io/en-us/insights/how-much-autonomy-to-give-an-ai-agent
- https://www.airisksummit.com/sessions/
- https://www.zenml.io/blog/llmops-in-production-another-419-case-studies-of-what-actually-works
- https://typoapp.io/blog-category/ai
- https://subagentknowledge.com/
- https://www.thetisa.com/blog/enterprise-ai-agent-development-guide/
- https://reference.langchain.com/python/langgraph
- https://www.developersdigest.tech/blog/durable-ai-agent-frameworks-compared-2026
- https://github.com/temporal-community/durable-hitl-agents
- https://www.diagrid.io/blog/ai-agent-frameworks
- https://www.langchain.com/resources/langchain-vs-llamaindex
- https://www.linkedin.com/posts/tanjeetsingh_patterns-and-problems-in-multiagent-systems-activity-7495491260296675328-5dAh
- https://www.instagram.com/reel/DcQvGhZsXPF/
- https://shamylmansoor.com/blog/multi-agent-ai-systems-coordination-problems/
- https://www.aivance.com.sg/blog/anthropic-multiagent-experiments/
- https://arxiv.org/html/2609.35928v1
- https://www.instagram.com/p/DZhAPElD44e/
- https://docs.langchain.com/oss/python/langchain/agents
- https://oleg-dubetcky.medium.com/building-smarter-agents-a-human-in-the-loop-guide-to-langgraph-dfe1673d8b7b
- https://www.youtube.com/watch?v=B_0TNuYi56w
- https://uvik.net/blog/langchain-vs-langgraph/
- https://aws.amazon.com/blogs/machine-learning/build-multi-agent-systems-with-langgraph-and-amazon-bedrock/
- https://www.eesel.ai/blog/langchain-vs-langgraph
- https://docs.langchain.com/oss/python/langchain/multi-agent/handoffs
- https://orkes.io/blog/how-to-orchestrate-langchain-agents-for-production-with-orkes-conductor
- https://aws.plainenglish.io/the-5-categories-of-human-in-the-loop-you-need-before-turning-on-autonomous-agents-1adfc6a57359
- https://schristoph.online/blog/matryoshka-humans-in-the-loop/?utm=rss-feed
- https://note.com/stackflowdaily/n/n8330215e8be8
- https://www.youtube.com/watch?v=CEvIs9y1uog
- https://simonwillison.net/2024/Dec/20/building-effective-agents/
- https://www.anthropic.com/institute/recursive-self-improvement
- https://www.linkedin.com/posts/andrewstellman_how-we-build-effective-agents-barry-zhang-activity-7463618465317367809-Go88
