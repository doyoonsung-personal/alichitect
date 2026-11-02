# Frontend fix round: common rules (final review, 2026-11-03)

Two independent final reviews of the workflow UI reported defects.
- **Codex:** `research/ai-workflows/impl/review-input/rev-final-b.md`. Its findings are numbered #1 to #9.
- **Claude:** `research/ai-workflows/impl/review-input/rev-final-b-claude-<job>.md`. Its findings are tagged C0 to C53, and D0. Each one was reproduced by two independent verifiers.

Each finding gives an exact input. Three jobs run at the same time, with disjoint files: **store**, **canvas** and **cost**. Your brief lists your item IDs and your files.

**For every item:**
1. Reproduce the bug first.
2. Add a regression test using the exact input from the report. It must fail before your fix and pass after.
3. In your final report, list each ID with "fixed", "not reproduced" (say why), or "declined" (say why).

For interaction bugs that need a browser, extend `apps/web/scripts/e2e-workflow.mjs` or `e2e-workflow-panel.mjs`, or add a sibling script. Use headless Chrome and your own Vite port, not 5174 or 8787.

**`apps/web/src/i18n/strings.json` is shared** by all three jobs. Add or change only keys under your own prefixes, and keep each language's new keys together, next to the existing keys with the same prefix:
- **store:** `workflow.live.*` and `workflow.fix.*`;
- **canvas:** `workflow.pop.*`, `workflow.edge.*`, `workflow.tools.*` and `workflow.canvas.*`;
- **cost:** `workflow.cost.*`.

Every new key needs en, ko and zh. Use the existing `.one` / `.other` plural convention, for example `workflow.panel.count.one`. Don't reformat the file.

The cloud UI must behave as before, except for the one cloud bug named in the canvas brief (C50).
