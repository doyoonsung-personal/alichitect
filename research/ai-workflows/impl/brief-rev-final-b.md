# Final adversarial review, part B: the workflow UI end to end (read-only)

Read-only: don't edit or create files in the repository. Never stop to ask a question.

Repository: this worktree, a checkout of `C:/Users/mendo/ali_catalog` at the integrated `phase-1` head. Tests run with `node --import ./scripts/alias.mjs --test <files>` from `apps/web`. You may write scratch scripts only under your system temp folder. Headless Chrome is at `C:/Program Files/Google/Chrome/Application/chrome.exe`, and puppeteer-core is installed under `apps/web/node_modules`. If you need the app running, start your own Vite dev server from `apps/web` on a free port other than 5174 and 8787, and stop it when you're done.

## The feature
This is the first release of an "AI and agents" workflow mode beside the cloud-architecture mode. The design is in `research/ai-workflows/PLAN.md`, and the UI design notes are in `research/ai-workflows/impl/results/p5design.md`.

## In scope
`apps/web/src/`, except `export/**`, which another job is changing now. That covers:
- `store/` (reducer, selectors, sessions, controller);
- `workflow/` (scene, camera, edges, layout adapter, panel model, settings);
- `canvas/Workflow*`;
- `panel/Workflow*`;
- `shell/`;
- `i18n/strings.json`;
- the app's mode switching.

## Hunt for
1. **Store correctness across the turn lifecycle in workflow mode:**
   - streaming, batching and flush;
   - repair and continue;
   - commit, stop and fatal rollback;
   - revert and restore of revisions;
   - replay;
   - session save and revival (including the newly persisted `workflowLayout`: corrupt, stale or mismatched layouts);
   - switching modes mid-session and in mixed sessions.

   Find states where the canvas, the panel, the export availability or the persisted session disagree with committed memory.
2. **Camera and canvas behaviour:**
   - follow while streaming, and pause on user pan;
   - fit, and the zoom floor;
   - keyboard navigation and focus;
   - the attachment overflow popover;
   - hover popovers near edges;
   - resize.
3. **Panel and cost editing:**
   - validation of estimate edits, including NaN, negative and huge values;
   - reset;
   - persistence;
   - number formatting. A live check showed an upper per-run cost of "$0.01" next to a typical "$0.00735", while per month was $147.68;
   - raw internal text shown to users. Cost rows showed the unit "mtok" and a source "NOTES Adjudicate-3".
4. **i18n completeness:**
   - every `workflow.*` key exists in en, ko and zh;
   - no English left in ko or zh;
   - plurals;
   - no literal ` ? ` where ` · ` was meant;
   - text that overflows at 800 px.
5. **Accessibility:** roles, names, live-region floods or silences, focus traps, and colour-only meaning.
6. **Safety:**
   - model-authored strings (labels, why, reasons) rendered unsafely: `dangerouslySetInnerHTML`, `innerHTML`, SVG markup built from strings, `href` or `style` injection;
   - any backend vendor name in the shipped UI text or bundle.

## Known, and not to be reported
- In the live canvas, a branch row sits about 900 units below row 0, because core reserves attachment slots for streaming stability. That is already recorded.
- The PDF.

## For each finding
- severity (high, medium or low);
- file:line;
- a minimal concrete input or interaction, with the wrong result and the expected result;
- the fix.

Report only findings you demonstrated, either by running a command or by an exact trace. Finish with the items you checked and found correct.
