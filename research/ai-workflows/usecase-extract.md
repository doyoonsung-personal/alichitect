You get a long research report on agentic AI use cases (written by one model, partly wrong) and NOTES.md (fact-check rulings; NOTES.md wins wherever they disagree).

Extract the 8 most valuable, distinct agentic workflows from the report that an Alibaba Cloud pre-sales engineer would plausibly be asked to design for an international customer (Singapore default region). Prefer workflows with a clear trigger, a measurable business outcome, and at least one human-approval or risk decision.

Return JSON: {"workflows": [ ... ]}, each item:
- "id": kebab-case
- "title": short name
- "industry": e.g. retail, banking, logistics, SaaS, public sector, any
- "ask": one sentence the customer or pre-sales rep would type into the app, in plain words (e.g. "Set up an agent that triages inbound support emails and drafts replies for approval")
- "trigger": what starts a run (webhook, schedule, chat message, email via webhook, file upload, phone call)
- "steps": ordered list of {"kind": one of trigger|ai|agent|decide|human|act|tool|knowledge|memory|end, "label": short, "product": Alibaba Cloud product id or null, "ai_role": null or one of classify|extract|draft|reason|plan|embed|rerank|ocr|asr|tts|vision}
- "human_gates": list of steps that need human approval and why (money, external send, irreversible write, legal effect)
- "loops": list of {"what": ..., "exit": max iterations or stop condition}
- "volume": a realistic runs-per-day or runs-per-month figure for a mid-size customer, with the basis if the report gives one
- "outcome": the business metric the report cites, with its source URL, or null
- "traps": things the app must not draw for this workflow (China-only products, gated features, AgentBay, Model Studio knowledge base for new accounts, etc.), from NOTES.md

Use only products and models the report or NOTES.md names, and respect NOTES.md: no AgentBay (use agent-sandbox), no Model Studio knowledge base or zero-code apps for new accounts (use Tablestore Knowledge Storage or DashVector), AgentRun code-first only, inbound email arrives via webhook into EventBridge or Function Compute, AgentCore IM channels are DingTalk/Lark/WeCom only. Output JSON only.
