# Phase 2: the workflow layout (read brief-common.md first)

Build a pure, stable layout for the workflow document: the PLAN.md D5 decision and section 7 placement rules, revised. Don't build the canvas; that is phase 5.

**Files you own:**
- create `packages/core/src/workflow-layout.ts`;
- create `packages/core/test/workflow-layout.test.ts`.

Read `packages/core/src/layout.ts` but never edit it. Import what it exports: `Rect`, `LayoutCard`, `LayoutState`, `layoutDiff`, `unrelatedMoves`, `GEOMETRY`, `fitTitle` and others. Copy any private helper you need.

## API

- `layoutWorkflow(wf, prev?, opts?)` returns the next layout state.
  - **Return the existing `LayoutState` shape if you can**, with cards for steps and attached nodes, frames for repeat-group brackets, and a workflow mode marker. Then `layoutDiff` and the canvas machinery can be reused.
  - If `LayoutState` can't carry what you need, define `WorkflowLayoutState` in your file and explain in the report.
  - The sticky metadata lives in the state and must survive JSON serialisation: each node's cell (column, row), the branch rows, each host's attached stack, and repeat-group spans.
- `tidyWorkflow(wf, opts?)`: the layout with no previous state.
- `workflowViewport(state, { width, height })`: returns `{ zoom, panX, panY }`. Fit the height, but never zoom below the readable floor, where card titles render at 11 px or more on screen. Phase 5's camera uses it.

## Rules (PLAN.md section 7)

- **Cells:** a node's cell is fixed when it arrives. Later links never move it.
- **Placing a new inline step:**
  - its predecessor is, in order: a splice's `from`, an existing in-link's source, `after`, then the last inline step placed;
  - its column is the predecessor's column + 1, or 0 for a trigger;
  - its row is the predecessor's row if that cell is free, otherwise the first free row below;
  - branch rows are appended and never reordered.
- **Loops come from the graph, never from position.** A link counts as a loop only if its kind is `loop` or it closes a cycle (depth-first search in id order). A link that points left only because of arrival order is routed backwards but stays a forward dependency.
- **Splice:** when B directly follows A, splicing X into A → B shifts B and every node to its right in B's reachable rows by one column. That is a uniform shift with its own move budget.
- **Attached nodes** (tools, knowledge, memory, sub-agents):
  - they stack under their host in a stable order (by id);
  - row bands have spare rows, so a growing stack pushes nothing until it overflows; an overflow push has its own budget;
  - past three, the stack collapses: return a count of hidden items on the host card, or the equivalent.
- **Repeat groups** get a bracket spanning their contiguous steps. When the steps aren't contiguous, return one bracket per contiguous run.
- **Removals leave holes;** nothing moves left or up. Tidy recomputes: the columns are the longest path over non-loop links, and the rows follow the first predecessor, then arrival order.
- **Determinism:** the same inputs give the same output, independent of object key order.

## Tests (the gates)

- **Fixtures:** stream each of the 32 fixtures in `packages/core/test/fixtures/workflows/` op by op. Validate each op with `validateWorkflowOp` (using `loadCatalog` and `loadModels`), apply it with `applyWorkflowOp`, then lay out with the previous state.
  - **Zero foreign moves on step and link ops:** no node other than the one the op touches changes position, per `layoutDiff` / `unrelatedMoves` or your equivalent.
  - **Budgets:** splice shifts and stack-overflow pushes stay within them.
  - Repeat this in reverse topological order and in a shuffled but fixed order.
- **Tidy:** produces no overlapping cards, and loops are classified by the graph.
- **Legibility:** for synthetic workflows of 10, 15 and 25 inline steps, with branches, one loop and attached tools, at widths 800, 920 and 1,150 and height 700:
  - `workflowViewport` never returns a zoom below the readable floor;
  - it reports `panX: true` when the content is wider.
- **JSON round trip:** the state survives `JSON.parse(JSON.stringify(state))` used as `prev`.
