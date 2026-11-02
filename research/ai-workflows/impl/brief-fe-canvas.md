# Frontend fix job: canvas, popover and tools

## Items
Claude C8 to C17, C30, C37, C38, C40, C42, C45, C46, C48 to C53 (in `rev-final-b-claude-canvas.md`), and Codex #6 and #8.

- **C8, high:** workflow cards receive no pointer events. Hover, click and the "+N" attachment list must work with a mouse, as on the cloud canvas.
  - Verify in headless Chrome by hovering a card and seeing its popover, and by clicking "+N" and seeing the list.
- **C9 and Codex #8:** the popover tracks its anchor on pan, follow, fit, resize and panel open. It closes when its card leaves the view.
- **C10 and C42:** clear the remembered focus on blur. A removed step must never pull focus out of the composer or the panel.
- **C11:** Follow and Fit account for the open panel, so streamed steps are never placed under it.
- **C12:** a click without a drag doesn't pause following.
- **C13 and C45:** the popover closes when focus leaves it, and Escape closes it. Focus stays in a sensible order; the portal is placed so tabbing doesn't escape the canvas.
- **C14:** "Resume following" returns to the follow or fit view.
- **C15:** zoom buttons zoom about the visible centre.
- **C16:** the card key handler ignores modified keys (Ctrl, Alt, Meta).
- **C17:** no vertical bounce while following.
- **Codex #6:** follow targets the newest added or changed step: its visible card, or its attachment owner. Not the rightmost-then-uppermost card.
- **C30:** the popover edge list fills its placeholders, such as "Branch: {condition}", and never shows "up to 0 extra passes".
- **C37, C46 and C53:** the popover's close button has its own label (`workflow.pop.close`), not "Hide products".
- **C38:** plural forms for "Repeat, up to N extra passes" (`workflow.edge.*`). The "Workflow updated: N steps" live text belongs to the store job.
- **C40:** zh English step titles must not re-wrap past their measured lines. Measure with the font the card uses.
- **C48 and C49:** "Follow new steps" toggle semantics (`aria-pressed` it can actually change, with a stable label); give the overview a role.
- **C50 (cloud) and C51 (workflow):** a node whose id equals the fixed edge-layer node id ("edges" or "wf-edges") replaces the layer. Use layer ids that can't collide with a valid element id: check `ID_PATTERN` in `packages/core/src/reducer.ts`. This is the one cloud change allowed in this round; keep it minimal, with a cloud regression test.
- **C52:** the popover wraps long unbroken tokens.

## Files you own
- `apps/web/src/canvas/Workflow*.tsx` and `apps/web/src/canvas/workflow.css`;
- `apps/web/src/canvas/index.tsx`, only for C50;
- `apps/web/src/canvas/measure.ts`, only if C40 needs it, without changing cloud measurement;
- `apps/web/src/workflow/camera.ts`, `scene.ts` and `edges.ts`;
- `apps/web/scripts/e2e-workflow*.mjs`;
- `strings.json` keys `workflow.pop.*`, `workflow.edge.*`, `workflow.tools.*` and `workflow.canvas.*`;
- tests next to these files.

Don't edit `store/**`, `panel/**`, `export/**` or `workflow/settings.ts` / `panel-model.ts`. The PDF imports `scene.ts` and `edges.ts`; keep their exported names and shapes.
