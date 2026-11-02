Implemented the panel polish. **PDF-order parity remains incomplete because export files are outside ownership.**

Changed:
- [WorkflowPanel.tsx](C:/Users/mendo/ali_wt/fix-panel/apps/web/src/panel/WorkflowPanel.tsx)
- [workflow.css](C:/Users/mendo/ali_wt/fix-panel/apps/web/src/panel/workflow.css)
- [panel-model.ts](C:/Users/mendo/ali_wt/fix-panel/apps/web/src/workflow/panel-model.ts) and [tests](C:/Users/mendo/ali_wt/fix-panel/apps/web/src/workflow/panel-model.test.ts)
- [strings.json](C:/Users/mendo/ali_wt/fix-panel/apps/web/src/i18n/strings.json): workflow handle strings in en/ko/zh
- New [browser-check script](C:/Users/mendo/ali_wt/fix-panel/apps/web/scripts/e2e-workflow-panel.mjs)

Rows now have glyphs, headings, muted metadata, model chips, services and reasons. Empty fields disappear; trigger/end rows are compact. Keyboard actions, highlighting, pan requests, inert state and Escape focus return passed browser checks.

I inspected screenshots across all **12 combinations**. Labels, chips and tables remained readable in both themes; long text wrapped without horizontal scrolling, including the 440 px stage. [Example screenshot](C:/Users/mendo/AppData/Local/Temp/workflow-panel-shots/800-ko-dark-steps.png).

| Validation | Result |
|---|---|
| Root tests | 987 passed |
| Web tests | 539 passed, 2 failed, 1 TODO |
| Worker tests | 274 passed |
| Panel tests | 3 passed, 1 TODO |
| Browser cases | 12 passed |
| Core/web/worker typechecks | All passed |

Both web failures reproduced individually: Chrome logo-render timeout and an export SVG assertion expecting an unwrapped label. Cloud prompt hash checks passed.

Decisions and outstanding work:
- Order follows live layout columns/lanes; repeat groups occupy their first member’s position, with attachments immediately following hosts.
- PDF insertion order differs on **18/32 fixtures**. The comparison test records this explicitly as TODO.
- Copied the small unexported canvas glyph renderer.
- Styled `WorkflowCost` through scoped selectors. Its owner should add `pp-table`, `pp-row`, `pp-prod__name`, `pp-prod__label`, `pp-muted` and `.num` classes. Existing literal ` ? ` separators in that unowned file remain untouched.

Cloud markup/CSS and all prohibited files are unchanged. No commits, external network/model calls or deployments.

Codex session ID: 01a19d2c-d835-7803-b2dc-786f5e3f9c3d
Resume in Codex: codex resume 01a19d2c-d835-7803-b2dc-786f5e3f9c3d
