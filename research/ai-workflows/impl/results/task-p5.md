Implemented the workflow UI and state actions. Changes are uncommitted; `export/**` is untouched. **Two validation gates remain unresolved.**

Files added/changed:

- `workflow/`: contracts, props, models, layout adapter, scene, glyphs, edges, camera, panel model, settings and six test files.
- `canvas/`: workflow stage, nodes, tools, popover, CSS and canvas dispatcher.
- `panel/`: workflow panel, cost controls and CSS.
- Landing, composer, header, working view, workflow settings and shell styles.
- Store/controller actions and tests, app contracts, translations and i18n tests.
- `scripts/e2e-workflow.mjs`.

Validation:

| Check | Result |
|---|---|
| Root tests | 911 passed |
| Worker tests | 270 passed |
| Full web suite | 480/482 passed |
| PDF timing failure, isolated rerun | Passed |
| Existing Chrome logo test, isolated reruns | Still times out |
| Core/web/worker typechecks | Passed |
| 32 workflow fixtures | Scene accounting, card overlap and routing checks passed |
| Browser matrix | 27 cases plus final smoke checks passed |
| Cloud prompt hash | Matches required hash |
| Native-loader build + hidden-vendor scan | Passed |
| Plain `npm run build` | Blocked by shared `node_modules/.vite-temp` permissions |

Implementation decisions/departures:

- Enlarged workflow geometry through the adapter; cloud geometry remains unchanged.
- Retained existing `.one`/`.other` translation conventions.
- Added workflow-only collision validation and channel fallback after libavoid crossed repeat labels in two fixtures.
- Exposed `workflowDrawingBounds` for combined card, route and label bounds.
- Browser coverage is representative, not every language/theme/interaction combination. PDF integration remains with p7a/p7b.

Automatic approval review rejected cleanup of generated logs, screenshots and the Vite cache, stating only “blocked by policy.” Those artifacts remain.

Codex session ID: 01a19cdc-8512-7f32-b1ab-ea74cdac01e9
Resume in Codex: codex resume 01a19cdc-8512-7f32-b1ab-ea74cdac01e9
