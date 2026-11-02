# Design pass for phases 5 and 7b (read-only)

Read-only: do not edit or create files. Never stop to ask; state your assumptions.

Repository: C:/Users/mendo/ali_catalog. The plan is `research/ai-workflows/PLAN.md`. Read especially:
- D2, D3, D5 and D7;
- section 7 (layout and canvas);
- section 9 (cost output);
- section 10 (proposal and PDF);
- section 12's recommended first release.

**Being built in parallel, so assume their APIs as the briefs give them:**
- the layout: `research/ai-workflows/impl/brief-p2.md`, giving `layoutWorkflow`, `tidyWorkflow` and `workflowViewport`;
- the estimator: `brief-p6.md`, giving `estimateWorkflow` and `WorkflowEstimate`;
- browser state: `brief-p3b.md`, giving the session mode, the switch action and selectors.

Map the existing web app (`apps/web/src`) and write an implementation plan for two jobs that will run in parallel.

## Job "p5": the visible workflow UI (PLAN.md section 7 "Canvas", D2, section 9 output, section 12 first release)
- **Landing:** the two-way focus choice, Cloud architecture or AI and agents, on the landing prompt.
- **Header:**
  - the session settings strip: region, scope and approval overrides;
  - no Deployment toggle in this release, because phase 8 is deferred.
- **Canvas:**
  - a keyed `<Canvas key={view}>`, each view with its own monotonic version (`index.tsx:208-225`);
  - a workflow scene builder and node type;
  - glyphs for trigger, decide, guard, human, act and end;
  - line styles: solid next, dashed attached, branch labels, loop arcs with their limit, escalate in the warning colour;
  - badges: turns, the repeat bracket, the human clock, and the effect lock;
  - the collapsed attachment count;
  - the camera from `workflowViewport`, with two-axis pan, an overview strip, and follow paused after a user pan;
  - the tidy button;
  - routing: does the channel router or libavoid work on this grid?
- **Panel:** "Steps and why" with the step → runtime → services table, the cost section (typical and upper, coverage, unpriced, assumptions, editable cost drivers writing `memory.estimate`), and hover cards.
- **Accessibility announcements, i18n strings** (en, ko, zh) and export availability.

## Job "p7b": the PDF
- a workflow SVG producer from the layout;
- the PDF diagram slot as a list (`pdf.ts:38`), with the workflow diagram first for workflow sessions;
- the PDF layout of the generated cost table, the step-to-runtime table and the open questions. Phase 7a puts these in the export model (`brief-p7a.md`).

## For each job, give
1. **The exact files** to create or edit, with their current line references, and the files it must not touch, so the two jobs never collide. One job must own the workflow SVG producer. Decide which, and say how the other uses it.
2. **The components and functions** to add, with signatures.
3. **How it hooks into** the existing canvas, scene, motion, popover, keyboard navigation and accessibility code, citing file:line.
4. **Risks**, and what to test, including browser checks at 800, 920 and 1,150 px.
5. **The i18n keys** needed, with English text.

Be concrete and cite file:line throughout. Aim for something a strong engineer can implement without re-reading the whole app.
