Review task. Read-only: do not edit or create files. Repository: C:/Users/mendo/ali_catalog. Read research/ai-workflows/PLAN.md (a plan for an "AI and agents" workflow view in an app Alibaba Cloud pre-sales staff use with international customers; Qwen draws the diagram as it streams), then skim research/ai-workflows/usecases/*.json (24 sample workflows) and research/ai-workflows/digest/diagram-notation.md, cost-sizing.md and patterns.md.

Act as an adversarial product and design reviewer. Attack the plan on:
1. Usefulness for pre-sales: would the drawn workflow, the model chips, the checks and the cost range help a pre-sales engineer win and scope a deal? What would they still have to do by hand? What is missing (for example a "where it runs" view, data-flow, security review, SLAs, latency)?
2. The node vocabulary and contract (section 3): can the 24 sample workflows be drawn with it without contortions? Walk at least 5 of them through the contract and report any that don't fit (parallel branches, per-item loops, multi-agent, voice, human approval with three outcomes, escalation).
3. The cost model (section 9): is the agent-loop formula right, are the defaults plausible, will p50–p95 ranges be credible, what will be wrong by an order of magnitude?
4. The checks (section 5) and prompt rules (section 8): which will fire too often (noise) or too rarely, which conflict with each other, which an LLM will struggle to follow within a 15,000-token prompt?
5. Layout (section 7): will a sticky left-to-right grid with horizontal pan stay legible for 10–25 steps with attached tools, branches and loop arcs at 800–1150 px wide?
6. Scope and phasing (section 12): what should be cut from a first release, and what is the smallest version worth shipping?

Return Markdown: findings table (severity high/medium/low, section, finding, why, suggested change), then the three changes you would make first.
