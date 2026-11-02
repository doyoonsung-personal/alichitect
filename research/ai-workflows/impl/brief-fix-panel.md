# Polish the "Steps and why" panel (live UI check, 2026-11-03)

A live check drove the real app through a support-email workflow and opened the panel at 1150 and 800 px. Its handle is `.pp__handle`. Next to the cloud "Products and why" panel, the workflow panel looks unfinished:

1. **No visual hierarchy.** Each step is a bordered default `<button>` holding the label, followed by loose `<p>` lines. Labels, metadata, model, service and reason all share one size and colour, with nothing grouping them.
2. **Order:**
   - `buildWorkflowPanelModel` (`apps/web/src/workflow/panel-model.ts:11`) sorts rows alphabetically by repeat group or id. The panel opened with "Draft reply", "Reply rejected", "Email sent", "Approve reply".
   - Rows must follow the flow: column order from the workflow layout, then lane order; attached steps right after their host; members of a repeat group together.
   - Find the order the PDF step sections use (`apps/web/src/export/workflow-data.ts`, or the core proposal code). Use the same order, so the panel and the PDF agree. If you can't share the code, add a test that the two orders match on the 32 fixtures.
3. **Noise:**
   - "Not specified" repeats for every empty field. End steps print "End · Not specified" and then "Not specified" again.
   - Leave out empty fields. Give trigger and end steps one compact line, for example their label and kind.
4. **Wrong handle label:** in workflow mode the handle says "Show products and why each one is here" (`panel.expand`) and "Hide products". Add workflow-specific strings in en, ko and zh, and use them.
5. **Tables:**
   - The "Where each step runs" table and the cost section use minimal ad-hoc CSS (`panel/workflow.css`).
   - Style them like the cloud panel's table and notes: `pp-table`, `pp-row`, `pp-prod*`, `pp-why__text`, `pp-muted` and the tokens in `apps/web/src/panel/panel.css` and `styles/tokens.css`.
   - Number cells are right-aligned with `.num`.

## Required behaviour
- **Visual language:**
  - Reuse the cloud panel's visual language: classes, tokens, spacing and type scale. Don't invent a new one.
  - Each step row shows its glyph (`workflow/glyphs.ts`, as the canvas card does) and the label as the row heading.
  - The "show on canvas" action stays a keyboard-accessible button, and still pans and highlights.
  - A muted meta line gives kind · task · "attached to X".
  - The model shows as a chip with the "candidate, validate on your data" note, matching the canvas card.
  - Then the service, then the reason.
- **Separators:** use ` · ` (U+00B7 with spaces). Some files had literal ` ? ` where `·` was meant; that is fixed on this branch, so don't reintroduce it.
- **Themes:** light and dark both work. Use only tokens, never raw colours.
- **Widths:**
  - Check 1150, 920 and 800 px wide windows; at 800 the stage is about 440 px.
  - No horizontal scroll inside the panel.
  - Long labels and long service names wrap.
- **Accessibility:** keep `id="products"`, the inert body, Escape focus return and the heading structure. Every row needs an accessible name.
- **Cloud unchanged:** the cloud panel is unchanged, both its markup and its CSS.
- **Screenshots:** extend `apps/web/scripts/e2e-workflow.mjs`, or add a sibling script, to open the panel on the support-email fixture. Take screenshots at the three widths, in en and ko, light and dark. Look at them before you finish, and describe what you saw in your report.

## Files you own
- `apps/web/src/panel/WorkflowPanel.tsx` and `apps/web/src/panel/workflow.css`;
- `apps/web/src/workflow/panel-model.ts` and its test;
- `apps/web/src/i18n/strings.json`, only for new `workflow.panel.*` keys. Another job may add keys in the same file, so add yours together in one place next to the existing `workflow.panel.*` keys;
- a new e2e script under `apps/web/scripts/` if you need one.

**Don't edit:**
- `panel/WorkflowCost.tsx`, which another job is changing now. If its markup needs classes for the styling, put the selectors in `workflow.css` and list the class changes WorkflowCost would need in your report;
- `export/**`;
- `store/**`;
- the shell.
