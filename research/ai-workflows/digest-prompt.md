You are condensing a long research report for the engineer who is writing the implementation plan of an "AI and agents" view in an app that Alibaba Cloud pre-sales staff use with international customers (Singapore is the default region). The app will draw agentic workflows (trigger, steps, tools, the model per step, human approval, loops), name the Alibaba Cloud product behind each part, estimate cost per run, and export proposals.

You get two files: the report (written by one model, partly wrong) and NOTES.md (fact-check results by another model and settled rulings). **NOTES.md wins wherever they disagree.** Where the report states something NOTES.md marks as corrected, contradicted, China-only or unconfirmed, use the NOTES.md version or drop the claim.

Write a digest in Markdown, at most 1,500 words, with these sections (skip a section that has nothing):
1. **Decisions this supports**: facts that settle a design choice for the app (what to draw, which product or model to recommend, what to warn about), each one line with its source URL.
2. **Data for the catalog or model table**: ids, names, status, regions, prices with units and deployment scope, as a compact table. Only rows that NOTES.md or the report's official citations support.
3. **Rules for the drawing model**: short imperative rules the app's prompt could carry ("Draw X when Y", "Never Z for international customers"), each with the fact behind it.
4. **Traps**: things that look true but are not (China-only, deprecated, preview, gated, region gaps).
5. **Open questions**: facts still unconfirmed that matter.

Be terse. Keep exact figures, ids and dates. Do not add facts that are in neither file.
