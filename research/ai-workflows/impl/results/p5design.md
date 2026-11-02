The split should be **p5 owns workflow presentation and interaction; p7b owns SVG serialization and PDF composition**. Both consume the same pure workflow scene and edge geometry, owned by p5.

No files were changed or created. References below are to the inspected checkout; parallel work may move their line numbers. Paths are relative to `apps/web/src` unless stated otherwise. New files have no current line reference.

**Scope and API assumptions**

- Use `layoutWorkflow(wf, prev?, opts?)` from the p2 brief, rather than the older catalog-taking signature in PLAN.md. Derive its result type with `ReturnType<typeof layoutWorkflow>`.
- Treat `workflowViewport(...).panX/panY` as overflow flags, **not viewport coordinates**: p2 explicitly tests `panX: true`. The UI supplies React Flow’s `{x, y, zoom}` translation.
- Use p3b’s active mode, document/count/export selectors and switch action. Their exact exported names are not specified; isolate name adaptation in one p5 file.
- Use p6’s `WorkflowEstimate` without duplicating arithmetic or prices.
- Use p7a’s generated export data without rebuilding it in the PDF.
- No Deployment toggle or deployment-generating turn. The diagram list is introduced now, as requested, despite its deferral in `research/ai-workflows/PLAN.md:830` and `:937`.
- A workflow export contains the workflow diagram first—and, for this release, only that diagram. A legacy cloud export retains its cloud diagram. Mixed-session data does not imply the cloud graph is a generated deployment.

**One prerequisite missing from the supplied briefs**

p3b promises mode switching and selectors (`brief-p3b.md:21`, `:31`), but does **not** promise setters for settings, estimate inputs, or tidy. None exists currently in `app/controller.ts:52`, `store/reducer.ts:49` or `app/contracts.ts:103`.

Before integration, the **p3b owner** must supply these small state-layer additions:

```ts
setWorkflowSettings(next: WorkflowSettings): void;
setWorkflowEstimate(next: WorkflowEstimateSettings): void;
tidyWorkflowView(): void;
```

The first two replace the respective settings object, preserve other memory fields, update the session timestamp and save through the existing persistence path (`app/controller.ts:106`). Tidy replaces only workflow layout state, retaining it as the next sticky `prev`, and advances the workflow display version. Disable these mutations during streaming and replay to avoid a later commit replacing an edit.

p5 must not fake these operations by mutating selector results, writing localStorage directly, reopening the session, or putting settings only in React state. This is a dependency handoff, not permission to edit p3b-owned files.

---

**Job p5 — file ownership**

| Files to edit | Current integration point |
|---|---|
| `landing/Landing.tsx` | Submit at `:76`; prompt form at `:115`. Add focus choice and mode-specific prompt copy. |
| `shell/Header.tsx` | Existing header at `:22`; export at `:33`. Add workflow session settings below the main control row. |
| `shell/WorkingView.tsx` | Canvas at `:59`, panel at `:62`, live region at `:66`. Select workflow presentation and key the canvas. |
| `canvas/index.tsx` | `Canvas` entry at `:48`. Dispatch to the existing cloud stage or new workflow stage. |
| `console/Composer.tsx` | Add an editing-focus description; retain existing submit and IME handling. |
| `styles/landing.css` | Style the landing choice within the existing prompt. |
| `styles/shell.css` | Fixed header row at `:337`, console split at `:344`, panel overlay at `:402`, narrow breakpoint at `:419`. Accommodate the settings strip and constrained widths. |
| `i18n/strings.json` | Add p5 UI strings in all three languages. |
| `i18n/t.test.ts` | Existing key and placeholder parity checks at `:30`, `:39`; extend coverage for new strings. |

Create these files:

| New files | Responsibility |
|---|---|
| `workflow/contracts.ts`, `workflow/props.ts` | p5-facing props and adaptation of p3b selectors/actions. |
| `workflow/models.ts` | Browser-safe bundled `ModelTable`, using `createModelTable` from `packages/core/src/models.ts:30`. |
| `workflow/layout-adapter.ts` | Normalize p2 layout metadata for rendering, motion, hidden attachments and bounds. |
| `workflow/scene.ts`, `workflow/glyphs.ts` | Pure scene model and shared glyph geometry. No React or PDF imports. |
| `workflow/edges.ts` | Pure workflow route planning and drawing geometry; preserve semantic metadata. |
| `workflow/camera.ts` | Workflow viewport, follow and overview calculations. |
| `workflow/panel-model.ts`, `workflow/settings.ts` | Panel rows, cost-driver descriptions and validated settings updates. |
| `canvas/WorkflowStage.tsx`, `canvas/WorkflowNodes.tsx` | React Flow stage and workflow node/bracket/edge renderers. |
| `canvas/WorkflowTools.tsx`, `canvas/WorkflowPopover.tsx`, `canvas/workflow.css` | Overview, follow/tidy, workflow hover content and styling. |
| `shell/WorkflowSettings.tsx` | Region, scope and approval override controls. |
| `panel/WorkflowPanel.tsx`, `panel/WorkflowCost.tsx`, `panel/workflow.css` | Steps, mapping and estimate UI. |
| `workflow/{scene,edges,camera,panel-model,settings,layout-adapter}.test.ts` | Pure-function tests. |
| `../scripts/e2e-workflow.mjs` | Browser checks using fake streams/replays. |

**Do not touch:** `export/**`; p2/p6 core files; core types, validators and approval policy; `store/**`, `stream/**`, `replay/**`, `app/controller.ts`, `app/contracts.ts`, `app/props.ts` while p3b owns them. Leave cloud scene, panel model, routing implementations and generated icons unchanged.

`app/App.tsx:9` can remain unchanged: it selects landing versus working, not cloud versus workflow.

**p5 functions and components**

The following are proposed p5 interfaces, not claims that p2/p3b already exports these names:

```ts
type WorkflowLayout = ReturnType<typeof layoutWorkflow>;

function useWorkflowProps(): WorkflowViewProps;

function normalizeWorkflowLayout(
  workflow: WorkflowGraph,
  layout: WorkflowLayout
): WorkflowRenderLayout;

function buildWorkflowScene(input: {
  workflow: WorkflowGraph;
  layout: WorkflowRenderLayout;
  catalog: Catalog;
  models: ModelTable;
  settings: WorkflowSettings;
  lang: Lang;
  t: TFn;
  measure: Measurer;
}): WorkflowScene;

function workflowGlyph(kind: WorkflowNodeKind): IconGeometry;

function planWorkflowEdges(input: {
  workflow: WorkflowGraph;
  scene: WorkflowScene;
  layout: WorkflowRenderLayout;
}): WorkflowRoutePlan;

function drawWorkflowEdges(input: {
  plan: WorkflowRoutePlan;
  routes: Record<string, Pt[]>;
  measure: (text: string) => number;
}): WorkflowEdgeDrawing[];

function buildWorkflowPanelModel(input: {
  workflow: WorkflowGraph;
  catalog: Catalog;
  models: ModelTable;
  estimate: WorkflowEstimate;
  t: TFn;
}): WorkflowPanelModel;

function applyEstimateEdit(
  current: WorkflowEstimateSettings,
  edit: EstimateEdit,
  workflow: WorkflowGraph
): { ok: true; value: WorkflowEstimateSettings }
 | { ok: false; key: StringKey };

function workflowInitialViewport(
  layout: WorkflowLayout,
  size: { width: number; height: number }
): Viewport;

function workflowFollowViewport(
  current: Viewport,
  newestColumn: Rect,
  visible: Rect
): Viewport;
```

`WorkflowScene` contains cards, repeat brackets, lookup maps, attachment ownership, hidden attachment IDs and complete drawing bounds. `WorkflowCardView` carries the actual `WorkflowNodeKind`, optional product, model chip, turns, effect and approval state. Do **not** fabricate product IDs to satisfy `CardView.product`, which is mandatory today (`canvas/scene.ts:51`).

Components:

```ts
WorkflowStage(props: WorkflowViewProps): ReactElement;
WorkflowCardNode(props: NodeProps<WorkflowCardNodeType>): ReactElement;
WorkflowRepeatNode(props: NodeProps<WorkflowRepeatNodeType>): ReactElement;
WorkflowEdgeNode(props: NodeProps<WorkflowEdgeNodeType>): ReactElement;
WorkflowSettings(props: WorkflowSettingsProps): ReactElement;
WorkflowPanel(props: WorkflowPanelProps): ReactElement;
WorkflowCost(props: WorkflowCostProps): ReactElement;
WorkflowPopover(props: WorkflowPopoverProps): ReactElement;
WorkflowTools(props: WorkflowToolsProps): ReactElement;
```

Keep the public `Canvas` wrapper and mount one stage:

```tsx
<Canvas key={view} {...activeCanvasProps} />
```

Here `view` is `'cloud' | 'workflow'`, not the existing `'architecture' | 'solution'` layout mode (`app/contracts.ts:120`). For session changes, key a containing presentation subtree by session ID as well.

**Landing and header behavior**

1. Add a native radio group above the textarea: **Cloud architecture / AI and agents**. Cloud is the legacy default. Update the session mode on selection, before `c.submit(text)` at `landing/Landing.tsx:83`.
2. Workflow selection changes lead, placeholder and submit text. Do not submit existing cloud examples as workflow prompts; initially hide those examples in workflow mode.
3. Preserve prompt handoff and IME behavior (`landing/Landing.tsx:82`, `:90`).
4. Show “Editing the workflow” beside the working composer. No working-view Deployment toggle.
5. Render the settings strip only for workflow sessions:
   - Region → `memory.workflowSettings.region`; default Singapore.
   - Scope → `memory.estimate.scope`; default International.
   - Approval override editor → `approvalOn` / `approvalOff`.
6. Each effect has three states: default, require approval, waive approval. Remove an effect from both arrays before applying the new choice. Per-step overrides remain visible in hover details and take precedence.
7. Use `needsApproval(node, settings)` from `packages/core/src/approval.ts:17` for the lock. A lock means approval is required; it does not certify that a valid approval route exists.
8. Explain that settings inform subsequent design turns. Changing approval policy must not silently insert/delete workflow nodes.

The settings row needs automatic height. The current `48px` header assumption comes from `styles/tokens.css:161` and `styles/shell.css:337`; simply appending controls would obscure the stage.

**Canvas integration**

| Existing subsystem | Workflow integration |
|---|---|
| Scene measurement | Reuse `Measurer` and title fitting patterns (`canvas/scene.ts:12`, `:197`). Build a separate workflow scene, not a synthetic cloud `Graph`. |
| React Flow | Register workflow card, bracket and edge types inside `WorkflowStage`; follow existing node construction at `canvas/index.tsx:400`. |
| Motion | Reuse `planMotion`, `createMotionClock`, ghosts and revision stamps (`canvas/motion.ts:74`, `:167`; `canvas/index.tsx:163`, `:339`). |
| Hover | Reuse `createHoverMachine`, including delayed pointer opening and focus hold (`canvas/index.tsx:247`, `:597`). |
| Popover placement | Use existing placement helpers and portal behavior (`canvas/Popover.tsx:32`). Workflow content needs its own renderer because current content assumes a product (`canvas/pop-model.ts:8`, `:39`). |
| Keyboard | Reuse `nearest` and `rovingStop` (`canvas/nav.ts:29`, `:49`). Supply workflow reading order by column, row, then stable ID. |
| Panel highlighting | Preserve highlight, reveal and pan actions (`panel/index.tsx:93`, `:99`; `canvas/index.tsx:489`). |
| Accessibility | Preserve one roving canvas tab stop and keyboard help (`canvas/nodes.tsx:202`; `canvas/index.tsx:557`, `:693`). |

If p2 returns a distinct layout type, `layout-adapter.ts` supplies a geometry-only `LayoutState` projection for motion. Semantic rendering still uses the workflow scene. Do not cast a workflow document to `Graph` or change core cloud types.

Keep independent, monotonically increasing display counters in p3b’s per-view state. Increment for batch, commit, restore/revert and tidy—even when the workflow becomes empty. The remount prevents stale routes, hover state and ghosts crossing views; version checks still protect asynchronous routing within a view (`canvas/index.tsx:208`, `:218`, `:230`).

**Workflow drawing rules**

- Cards: business label, kind glyph, product short name when present, model chip when present.
- Glyphs: trigger, decide, guard, human, act and end use new vector geometry; AI/agent/tool/knowledge/memory reuse appropriate existing icon families.
- `next`: solid line.
- Attached `on` relationship: dashed connector, synthesized from the node relation rather than mistaken for an executable edge.
- `branch`: preserve the condition label and separate route identity. Never merge branches merely because endpoints match.
- Human outcomes: display `approve`, `edit`, `reject`, `timeout`, and agent/loop `exhausted` labels. They are `outcome` values, not edge kinds (`packages/core/src/types.ts:339`).
- `loop`: route below the occupied band with a visible numeric limit. Use graph classification supplied by p2 or deterministic graph analysis; a left-pointing edge alone is not a loop (`PLAN.md:550`).
- `escalate`: warning stroke plus text, using `--warn` (`styles/tokens.css:59`).
- Agent: maximum model requests badge from `turns`.
- Human: clock and textual wait description; no fabricated duration.
- Repeat: bracket per contiguous run, labelled by `group.over`. List all members together in the panel even if brackets split.
- Effect: effect text plus approval lock from the shared policy.
- Attachment count: past three, use the hidden count supplied by layout metadata. Open a keyboard-accessible list in a popover; do not expand the grid or move neighboring cards. Hidden steps remain in the panel, estimate and export data.

**Routing decision**

**Both routers are structurally usable on a workflow grid, but this inspection does not establish that either passes the workflow fixtures.**

The channel router derives its sparse grid from arbitrary obstacle rectangles and endpoint centerlines (`routing/channel.ts:102`, `:116`, `:140`); it does not hard-code cloud lane coordinates. libavoid similarly installs rectangular obstacles with pins on all four sides (`routing/avoid.ts:146`, `:152`).

The existing **planner is unsuitable**: it resolves cloud badges, uses catalog path ranks, merges duplicate endpoint/kind pairs and aggregates lanes (`routing/plan.ts:33`, `:61`, `:71`).

Implement `planWorkflowEdges` instead:

- Keep workflow semantics in a side map keyed by route ID.
- Adapt ordinary links to `RouteRequest` solely for geometric routing; leave the existing cloud `EdgeKind` unchanged (`routing/types.ts:17`).
- Route ordinary links through the existing budgeted libavoid/channel path (`canvas/index.tsx:223`).
- Generate bounded loop arcs and attachment connectors explicitly. Reserve lanes below cards, attachment stacks and repeat brackets; detect collisions and extend the routing bounds when necessary.
- Include badges, count chips and bracket labels in obstacle/bounds calculations.
- Keep animation/highlight state outside pure route geometry so p7b can render a still diagram.
- Check `failed` routes: the channel router’s final emergency route at `routing/channel.ts:601` is not proof of obstacle clearance.

The first implementation gate is a fixture probe of both routers, including reverse arrival order, same-column edges, branches, loops, splices and attachment overflow. Do not replace either global router based solely on a screenshot.

**Camera, follow and tidy**

Use `workflowViewport(layout, {width, height})` for zoom policy, then derive translation from layout bounds. Initial view starts at the trigger/first column and centers an axis only when it fits.

- Enforce the 11px title floor for fit, zoom buttons and pinch—not only initial fit. Existing cloud `ZOOM_MIN = 0.5` is too permissive (`canvas/camera.ts:18`).
- Verify the floor against the smallest rendered title size, since title fitting can reduce it.
- Keep two-axis panning. Include arcs and brackets in the pan extent.
- Overview strip shows every column and the current viewport rectangle. Clicking/dragging it, or using its keyboard controls, counts as user navigation.
- While streaming, follow newly occupied columns, not the most recently updated card.
- A user-originated move pauses follow. Programmatic fit/reveal must not pause it; the current `onMoveStart` already distinguishes eventful user movement (`canvas/index.tsx:618`).
- Commit/refit flags must not undo a paused camera (`canvas/index.tsx:472`). Only explicit Resume follow re-enables tracking.
- Tidy calls the state-layer action backed by `tidyWorkflow`; it does not edit graph semantics, submit a turn, or run automatically.
- Keep overview and tools above the open panel, whose current overlay can cover up to 64% of the stage (`styles/tokens.css:165`). Reuse occlusion-aware reveal (`canvas/index.tsx:264`).

**Panel and cost**

Keep a single `id="products"` panel so occlusion detection still works. Mirror the existing expand/collapse, inert body and Escape focus return (`panel/index.tsx:85`, `:111`, `:139`).

Order:

1. **Steps and why:** step label/kind, task, model, service and reason.
2. **Where each step runs:** semantic table, Step → Runtime → Services. Include attached steps with host context. `runs === 'customer'` becomes “Customer system”; missing runtime becomes “Not specified.” Do not infer a runtime from `product` (`packages/core/src/types.ts:326`).
3. **Priced usage subtotal:** typical/upper per run and per month, run definition and volume.
4. Coverage, itemized priced lines, fixed monthly items, unpriced items with units/reasons and assumptions.
5. Editable cost drivers, largest priced contributors first; retain access to drivers of unpriced items.
6. Longest automated path model-step count and human waits, without numeric latency.

Use the displayed workflow for a provisional streaming estimate and committed memory for export. Label provisional estimates; disable edits while a turn is active.

Driver writes map exactly to `WorkflowEstimateSettings` (`packages/core/src/types.ts:372`):

| UI driver | Memory field |
|---|---|
| Runs/month | `runsPerMonth` |
| Input/output tokens, thinking, offline | `steps[id]` |
| Typical/upper items | `items[groupId]` |
| Branch share | `shares[edgeId]` |
| Extra loop passes | `loops[edgeId]` |
| Typical/upper requests, result tokens, searches/request | `agents[nodeId]` |
| Guard detection type count | `guardTypes[nodeId]` |

Validate finite nonnegative values, count integrality, branch shares in `[0,1]`, sibling branch shares as a coherent set, typical ≤ upper and graph-defined request/loop bounds. An agent request count includes the final-answer request. Loop wording must distinguish extra passes from total executions.

Commit edits on Apply/blur, with Enter applying and Escape restoring the draft. “Use default” deletes the override; it must not store the current default as a permanent value. Retain unrelated overrides when updating one nested map.

Do not add controls for unsupported inputs such as arbitrary sandbox duration or indexing quantities. First-release image/video pricing and voice cost/latency remain excluded (`PLAN.md:936`), even if broader model metadata exists.

**Accessibility and export**

- Native labels and fieldsets for focus/settings/cost controls; input errors linked through `aria-describedby`.
- One canvas tab stop, arrow navigation, Enter/Space details, Escape return, and offscreen focused-card reveal.
- Decorative glyphs/edges remain hidden from assistive technology; card descriptions and panel connections communicate their meaning.
- Hidden attachment list entries are reachable without forcing hidden canvas nodes into the tab order.
- Announce batched workflow changes, tidy completion, follow pause/resume and successful estimate updates. Do not announce every token, animation frame or pointer hover.
- Use the shell’s existing polite live region at `shell/WorkingView.tsx:66`; local interaction status may use a separate narrowly scoped region without duplicating turn announcements.
- Preserve reduced-motion handling (`canvas/camera.ts:112`; `styles/shell.css:394`).
- p5 retains `ExportButton` in the header. p7a owns its availability fix (`brief-p7a.md:41`); p5 verifies workflow-only, cloud-only and mixed sessions. p7b fixes the downstream workflow-only generation path.

---

**Job p7b — file ownership**

| Files to edit | Current integration point |
|---|---|
| `export/pdf.ts` | Single diagram input at `:38`, report at `:48`, section order at `:189`, diagram rendering at `:318`. |
| `export/generate.ts` | Input at `:21`, model/route selection at `:60`, composition at `:64`, dry/font/real passes at `:70`. |
| `export/browser.ts` | Currently passes active cloud-shaped display graph/layout at `:49`. Select an explicit committed export snapshot. |
| `../scripts/export/checks.ts` | Current check assumes exactly one landscape page at `:55`. Preserve cloud checks; add workflow-specific expectations. |

Create:

- `export/workflow-svg.ts` — **sole owner of the workflow SVG producer**.
- `export/workflow-diagram.ts` — prepare workflow geometry and render it with each font pass.
- `export/workflow-data.ts` — narrow adapter over p7a’s actual export-model fields.
- `export/workflow-pagination.ts` — measured table/paragraph pagination and diagram tiling.
- `export/workflow-strings.json`, `export/workflow-strings.ts` — p7b labels, all three languages.
- `export/workflow-svg.test.ts`, `export/workflow-pagination.test.ts`, `export/workflow-data.test.ts`, `export/workflow-strings.test.ts`.
- `../scripts/export/workflow-pdf.test.ts`, `../scripts/export/e2e-workflow.mjs`.

**Do not touch:** any p5 file; `export/model.ts`, `strings.json`, `strings.ts`, `ExportButton.tsx`, `draft-client.ts`, `draft-flow.ts` or their tests, which p7a owns; core estimator/layout/types; browser state. Keep existing cloud `export/svg.ts` and `export/diagram.ts` unchanged.

p7b imports p5’s pure `workflow/scene.ts`, `glyphs.ts`, `edges.ts` and layout adapter. It never imports `WorkflowStage` or React nodes. p5 uses the SVG producer **indirectly through the existing lazy export pipeline**; live drawing uses the shared scene/geometry. This avoids a PDF dependency in the initial UI bundle, consistent with `export/browser.ts:1`.

**p7b interfaces**

```ts
interface PdfDiagram {
  id: string;
  view: TurnMode;
  title: string;
  drawing: DiagramSvg;
}

interface WorkflowSvgInput {
  scene: WorkflowScene;
  edges: readonly WorkflowEdgeDrawing[];
  bounds: Rect;
  fonts: SvgFonts;
  legend: WorkflowLegendText;
}

function renderWorkflowSvg(input: WorkflowSvgInput): DiagramSvg;

function prepareWorkflowDiagram(input: {
  workflow: WorkflowGraph;
  layout: WorkflowLayout;
  catalog: Catalog;
  models: ModelTable;
  settings: WorkflowSettings;
  lang: Lang;
  route: RouteFn;
}): Promise<PreparedWorkflowDiagram>;

function drawWorkflowDiagram(
  prepared: PreparedWorkflowDiagram,
  fonts: FontSet
): DiagramSvg;

function workflowPdfData(model: ProposalModel): WorkflowPdfData | null;

function planTablePages(input: TableLayoutInput): TablePage[];
function planWorkflowDiagramPages(input: DiagramPageInput): DiagramPage[];
```

Change `PdfInput.diagram` to `diagrams: readonly PdfDiagram[]`. Add `diagramPages` to the report; retain the existing `diagramPage` as the first-page compatibility value for callers/tests (`export/pdf.ts:48`; `export/generate.ts:41`).

Extend `GenerateInput` with optional workflow document/layout inputs. Keep existing cloud arguments for legacy callers. The browser adapter must take workflow and settings from the **same committed session snapshot** used for p7a’s model, not a partial streamed document.

p7a has not pinned generated-field names. `workflow-data.ts` adapts those names after handoff; it must not calculate costs, invent questions, or silently drop a workflow section because a guessed property is absent.

**SVG implementation**

Follow the existing SVG constraints: explicit attributes, absolute text positions, no CSS or `foreignObject`, one font face per text run (`export/svg.ts:5`, `:112`).

- Reuse shared glyph geometry through `iconMarkup` (`export/svg.ts:56`).
- Include model chips, turns, approval locks, human clocks, repeat brackets, collapsed counts, branch/outcome labels and loop limits.
- Use a light print palette with warning-colored escalation; do not serialize DOM styles or camera transforms.
- Escape labels and attributes. No embedded user-provided markup or remote SVG assets.
- Bounds include edge arcs, labels, bracket extents and legend, not just cards.
- Collapsed attachments remain collapsed in the diagram; generated step/mapping content must still expose their details.
- Recompute text measurement and label placement after fonts load. The current two-pass exporter explicitly relies on this (`export/diagram.ts:40`; `export/generate.ts:70`).

**PDF section layout**

For a drafted workflow proposal:

1. Existing cover, executive summary and needs.
2. Workflow diagram.
3. Step explanations from p7a.
4. Step → Runtime → Services table.
5. Generated cost section.
6. Open questions.
7. Relevant existing product detail, considerations and technical history.

For a basic export, render the generated workflow sections even without a drafted narrative. Omit genuinely absent narrative rather than fabricating it. Preserve existing cloud section order (`export/pdf.ts:189`).

The mapping table uses approximately 34% / 26% / 40% width. Wrap service lists and full labels; repeat column headers on continuation pages. Keep an ordinary row together. Split rows taller than a page into clearly marked continuations instead of repeatedly calling `ensure(h)`—the current helper only advances one page (`export/pdf.ts:87`).

The cost section contains:

- Run definition, scope and runs/month.
- A four-value scenario table: typical/upper × per-run/month.
- “If every run hit the upper case” beside upper monthly usage.
- Coverage directly adjacent to the subtotal.
- Priced item table: Item / Unit / Typical / Upper.
- Fixed monthly items separately.
- Unpriced items: Item / Unit / Reason.
- Assumptions, followed by source links where supplied.

Use enough USD precision that a small nonzero per-run figure does not render as `$0.00`. Unknown prices remain “Not priced.” No numeric latency or percentile claims.

Open questions are p7a’s generated content from assumptions/data-boundary questions (`PLAN.md:829`). Render a numbered list with pagination; do not rewrite them or present them as a security approval.

**Long workflow diagrams need an explicit policy**

The current renderer upgrades A4 landscape to A3 but can still shrink below its own readability threshold (`export/pdf.ts:30`, `:319`). A 25-step workflow makes that likely.

For workflow diagrams:

- Try A4 landscape, then A3 landscape.
- If still below the minimum readable title size, produce an overview followed by readable detail tiles.
- Tile in column bands, and vertically when necessary; repeat boundary cards or add labelled continuation connectors.
- Label the overview as an overview. Preserve step IDs/labels across detail pages and tables.
- Report every diagram page/scale. Do not enforce a single-landscape-page rule on workflow exports.

Keep the existing cloud page selection unchanged.

---

**i18n keys and English text**

p5 adds these to `i18n/strings.json`. Each entry needs Korean and Chinese translations with identical placeholders. Existing translation typing comes from English keys (`i18n/t.ts:15`); parity tests already exist at `i18n/t.test.ts:30`.

| Key | English |
|---|---|
| `focus.label` | Design focus |
| `focus.cloud` | Cloud architecture |
| `focus.workflow` | AI and agents |
| `landing.workflow.lead` | Describe the workflow you want to design. |
| `landing.workflow.placeholder` | What starts the workflow, what should it do, and when should a person step in? |
| `landing.workflow.submit` | Draw workflow |
| `workflow.editing` | Editing the workflow |
| `workflow.settings.title` | Session settings |
| `workflow.settings.region` | Region |
| `workflow.settings.scope` | Scope |
| `workflow.settings.international` | International |
| `workflow.settings.global` | Global |
| `workflow.settings.approvals` | Approval overrides |
| `workflow.settings.default` | Use default |
| `workflow.settings.require` | Require approval |
| `workflow.settings.waive` | Waive approval |
| `workflow.settings.nextTurn` | These settings guide the next design turn. |
| `workflow.canvas.label` | Workflow diagram |
| `workflow.canvas.empty` | Your workflow will appear here. |
| `workflow.canvas.overview` | Workflow overview |
| `workflow.canvas.column` | Show column {n} |
| `workflow.canvas.tidy` | Tidy workflow |
| `workflow.canvas.follow` | Follow new steps |
| `workflow.canvas.resume` | Resume following |
| `workflow.canvas.paused` | Following paused |
| `workflow.canvas.pan` | Drag or scroll to move across the workflow. |
| `workflow.canvas.keys` | Use arrow keys to move between steps. Press Enter for details, Escape to close, and F to fit. |
| `workflow.badge.turns` | Up to {n} model requests |
| `workflow.badge.repeat` | For each {over} |
| `workflow.badge.wait` | Waits for a person |
| `workflow.badge.approval` | Approval required |
| `workflow.badge.waived` | Approval waived |
| `workflow.attachments.count` | {n} more attachments |
| `workflow.attachments.title` | Attachments for {step} |
| `workflow.edge.next` | Next step |
| `workflow.edge.attached` | Available to the agent |
| `workflow.edge.branch` | Branch: {condition} |
| `workflow.edge.loop` | Repeat, up to {n} extra passes |
| `workflow.edge.escalate` | Escalate |
| `workflow.panel.title` | Steps and why |
| `workflow.panel.count` | {n} steps |
| `workflow.panel.mapping` | Where each step runs |
| `workflow.col.step` | Step |
| `workflow.col.task` | What it does |
| `workflow.col.model` | Model |
| `workflow.col.runtime` | Runtime |
| `workflow.col.services` | Services |
| `workflow.col.why` | Why |
| `workflow.runtime.customer` | Customer system |
| `workflow.unspecified` | Not specified |
| `workflow.show` | Show {step} on the diagram |
| `workflow.pop.attachedTo` | Attached to {step} |
| `workflow.pop.effect` | Effect |
| `workflow.pop.approval` | Approval |
| `workflow.pop.subject` | Approves the output of {step} |
| `workflow.cost.title` | Priced usage subtotal |
| `workflow.cost.provisional` | Estimate updates as the workflow is drawn. |
| `workflow.cost.typical` | Typical |
| `workflow.cost.upper` | Upper |
| `workflow.cost.perRun` | Per run |
| `workflow.cost.perMonth` | Per month |
| `workflow.cost.oneRun` | One run starts with {trigger}. |
| `workflow.cost.runs` | Runs per month |
| `workflow.cost.upperMonthly` | If every run hit the upper case |
| `workflow.cost.scenarios` | These are settings-based scenarios, not measured percentiles. |
| `workflow.cost.coverage` | What this subtotal covers |
| `workflow.cost.unpriced` | Not priced |
| `workflow.cost.fixed` | Fixed monthly items |
| `workflow.cost.assumptions` | Assumptions |
| `workflow.cost.drivers` | Edit cost drivers |
| `workflow.cost.unit` | Unit |
| `workflow.cost.source` | Price source |
| `workflow.cost.inTokens` | Input tokens |
| `workflow.cost.outTokens` | Output tokens |
| `workflow.cost.thinking` | Thinking enabled |
| `workflow.cost.offline` | Offline processing |
| `workflow.cost.items` | Items per run |
| `workflow.cost.share` | Share of runs |
| `workflow.cost.loops` | Extra loop passes |
| `workflow.cost.requests` | Model requests, including the final answer |
| `workflow.cost.resultTokens` | Tokens per tool result |
| `workflow.cost.searches` | Searches per model request |
| `workflow.cost.guardTypes` | Enabled detection types |
| `workflow.cost.apply` | Apply |
| `workflow.cost.reset` | Use default |
| `workflow.cost.invalid` | Enter a valid value within the allowed range. |
| `workflow.cost.invalidShares` | Branch shares must add up to 100%. |
| `workflow.cost.globalNote` | Prices use International scope; Global is usually lower. |
| `workflow.cost.path` | {n} model steps on the longest automated path |
| `workflow.cost.waits` | Human waits |
| `workflow.live.updated` | Workflow updated: {n} steps. |
| `workflow.live.tidied` | Workflow tidied. |
| `workflow.live.paused` | Following paused after you moved the view. |
| `workflow.live.resumed` | Following new steps. |
| `workflow.live.estimate` | Cost estimate updated. |

Also add exhaustive enum labels:

- `workflow.kind.{trigger,ai,agent,decide,guard,human,act,tool,knowledge,memory,end}` → “Trigger”, “AI step”, “Agent”, “Decision”, “Guard”, “Human review”, “Action”, “Tool”, “Knowledge”, “Memory”, “End”.
- `workflow.effect.{read,write,reply,notify,send,publish,pay,delete,admin,decide}` → “Read”, “Write”, “Reply in conversation”, “Notify”, “Send externally”, “Publish”, “Pay or commit funds”, “Delete”, “Administer”, “Consequential decision”.
- `workflow.outcome.{approve,edit,reject,timeout,exhausted}` → “Approved”, “Edit requested”, “Rejected”, “Timed out”, “Limit reached”.
- `workflow.task.*` for every `WorkflowTask` at `packages/core/src/types.ts:316`, using plain task names.

Use `_one` / `_other` forms where English counts differ. Translate estimator assumptions by their stable `key`; preserve supplied text as a fallback for unknown keys rather than dropping an assumption.

p7b owns the following in its separate `export/workflow-strings.json`; reuse p7a-provided labels wherever its model already supplies them.

| Key | English |
|---|---|
| `diagram.heading` | Workflow diagram |
| `diagram.overview` | Workflow overview |
| `diagram.detail` | Workflow detail {n} of {total} |
| `diagram.continued` | Continues on page {page} |
| `diagram.legend.next` | Code-controlled path |
| `diagram.legend.attached` | Agent-chosen attachment |
| `diagram.legend.loop` | Bounded repetition |
| `diagram.legend.escalate` | Escalation |
| `steps.heading` | Steps and why |
| `mapping.heading` | Where each step runs |
| `mapping.step` | Step |
| `mapping.runtime` | Runtime |
| `mapping.services` | Services |
| `cost.heading` | Priced usage subtotal |
| `cost.item` | Item |
| `cost.unit` | Unit |
| `cost.typical` | Typical |
| `cost.upper` | Upper |
| `cost.perRun` | Per run |
| `cost.perMonth` | Per month |
| `cost.upperMonthly` | If every run hit the upper case |
| `cost.coverage` | What this subtotal covers |
| `cost.fixed` | Fixed monthly items |
| `cost.unpriced` | Not priced |
| `cost.reason` | Reason |
| `cost.assumptions` | Assumptions |
| `questions.heading` | Open questions |
| `table.continued` | Continued |

---

**Risks and verification gates**

| Risk | Required test |
|---|---|
| View/version collision | Cloud → workflow → cloud with unequal counters; stale worker answers ignored; no duplicated `diagram`, `products`, `cv-pop` or key-help IDs. |
| Layout assumptions | All 32 fixtures through scene/routing; late links, reverse arrival, splice, removal holes, tidy, attachment collapse and split repeat brackets. |
| Incorrect edge semantics | Same-endpoint branches remain distinct; backward dependency stays non-loop; approval outcomes and exhausted routes survive drawing and export. |
| Motion instability | Existing enter/glide/ghost timing; rapid batches do not restart animations; reduced motion; tidy does not become an automatic refit on every turn. |
| Camera stealing control | User pan pauses follow through commit and resize; keyboard reveal and panel peek do not accidentally re-enable it. |
| Settings lost | Edit → save/reload → next request → commit → export; nested settings preserved; reset removes only its override. |
| Approval disagreement | Default/on/off/per-step precedence matches `needsApproval`; lock never implies a passed validation check. |
| Misleading cost | UI values equal p6 output; fixed and unpriced remain distinct; tiny costs stay nonzero; unavailable prices never become zero; no unsupported modality totals. |
| Inaccessible detail | Keyboard-only canvas, attachment popover, panel and cost editing; focus restoration after deletion/collapse; no live-region flood. |
| SVG/PDF drift | Browser and SVG use identical scene semantics, glyphs, labels, brackets and bounds; no raster workflow diagram. |
| PDF overflow | Long Korean/Chinese labels, long service lists/questions, multi-page rows, 25-step tiled diagram, repeated headers and footer clearance. |
| Export regression | Workflow-only, cloud-only, mixed, basic and drafted exports; unchanged cloud fixtures and section order. |
| Font/serialization issues | CJK text extraction, escaped `<>&"` labels, no missing glyphs after dry/real passes, no remote images or `foreignObject`. |

Browser matrix: **800, 920 and 1,150px**, each with **10, 15 and 25 inline steps**, branches, a bounded loop, a human step and at least four attachments. Run at height 700 in two configurations:

1. Canvas itself has the target width.
2. Whole browser has the target width, with console visible, then Focus diagram enabled.

This distinction matters: the console has a 360px minimum (`styles/tokens.css:162`), so an 800px browser leaves roughly 440px for the stage. At each width check settings wrapping, toolbar collisions, 11px title readability, both pan axes, overview coverage, panel occlusion, hover placement, keyboard reveal and export dialog access. Repeat key cases in en/ko/zh, light/dark and reduced motion.

Use the existing browser harness patterns at `../scripts/e2e-canvas.mjs:54` and keyboard checks at `:118`; use fake streams rather than live model calls. For PDFs, extend the existing Node/pdf.js verification approach (`../scripts/export/pdf.test.ts:1`) and visually inspect rendered English, Korean and Chinese samples.

These are implementation gates, not checks performed during this read-only design pass.

Codex session ID: 01a19cd0-4908-7320-99c5-8d9aa43bbae5
Resume in Codex: codex resume 01a19cd0-4908-7320-99c5-8d9aa43bbae5
