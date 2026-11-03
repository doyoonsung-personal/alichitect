# Overnight build log (2026-11-02 → 03)

The user asked for the full first release (phases 2–7), done without prompting them, with Codex in parallel. Nothing is pushed or deployed; local commits on `phase-1` only. The morning report ends with the deploy question.

## Ground rules
- **Worktrees:** each job gets one under `C:\Users\mendo\ali_wt\<name>`, branch `wt-<name>`, created by `scratchpad/mkwt.ps1`, with node_modules junctions.
- **Codex:** extra-high effort, write mode. Briefs are in `impl/brief-*.md`, with shared rules in `brief-common.md`.
- **Checkpoint after each wave:** merge, run every suite and the three typechecks, check the prompt hash (`998fab22…`), run the cloud eval (spend guard = ledger total + $20), then commit locally.
- **Stop rules:** at most two fix rounds per job. Then record the problem, take the plan's fallback, and move on.

## Waves
| Wave | Job | Branch | Codex job | Status |
|---|---|---|---|---|
| 1 | phase 2 layout | wt-p2 | task-mvzdw9k3-11805d | merged (0b70bdd); review rev-p2 running |
| 1 | phase 6 estimator | wt-p6 | task-mvzdwadm-v4jv1n | merged (e7edb06); review rev-p6 task-mvzefwju-n57lps running |
| 1 | phase 4a workflow prompt | wt-p4a | task-mvzdwb9u-999n53 | merged (ed23b41); 7,581 tokens, 80 rows; review rev-p4a running |
| 1 | phase 3a turn pipeline | wt-p3a | task-mvzdwcj2-piim6t | merged (8f1f923); review rev-p3a running |
| 1+ | phase 3b browser state (on the pinned contract) | wt-p3b | task-mvzeb43t-rusopd | merged; web 438/438 |
| 1+ | readability pass on workflow.ts and workflow-validate.ts | wt-tidy | task-mvzeb4vq-5r0qj7 | merged; longest function 113 → 32 lines |
| 1+ | live cloud fix: attachTo a missing VPC host (p1-vpc-no-group) | wt-vpcfix | task-mvzeb5ry-8bgkas | merged as tests only: no live bug, because the repair already fixes it and attachValid judges the model's output before repair |

## Decisions made on the user's behalf
- **Full first release** (phases 0–7). Phase 8 (the deployment turn) is deferred, as in the plan.
- **Contract pinned on phase-1 first** (`58b4fc3`): TurnMode, the SessionMemory workflow fields, the estimate settings, and the workflow-prompt stub.
- **Helper extraction from layout.ts is deferred.** `workflow-layout.ts` imports or copies helpers instead, so the cloud layout gates are untouched.
- **Backup-voice threading** in `claude.ts` belongs to phase 3a.
- **More parallel work.** On 2026-11-03 the user said this week's Codex credits expire in a day and to use them heavily. So 3b, the readability pass and the live cloud repair fix started alongside wave 1. The new step glyphs move into phase 5. Wave 2 (4b eval, 7a proposal) starts when 3a and 6 merge.

## Checkpoints

- **After merging p2 and p4a** (`ed23b41`): 823 root tests pass, the core, web and Worker typechecks are clean, and the prompt hash is still `998fab223dab`.
  - Both jobs saw one web test fail in Codex's sandbox: the Chrome logo-render test times out there. It passes on the host (421 of 421).
- **p5-design** (read-only, task-mvzec20r-dnw7z3) is running.
- **Phase 6 merged** (`e7edb06`). Spot check on the support-email sample at 100k runs a month: typical $0.0104 per run (about $1,044 a month), upper $0.0271.
- **7a started early** (task-mvzefhm9-kh5tup), restricted to core proposal and web export. Its server and Worker leak-test changes are reported for me to apply after 3a merges.

## Wave 1 checkpoint (after 3a, tidy and 3b)
- **Suites:** root 911/911, web 438/438, Worker 270/270.
- **Typechecks:** all three clean.
- **Prompt hash:** `998fab223dab`.
- **Cloud eval regression:** running (`wave1-cloud-regression`, budget 95).

## Wave 2 and fixes (running)
| Job | Worktree | What |
|---|---|---|
| p4b | wt-p4b | eval harness by mode, workflow cases, judge |
| p7a | wt-p7a | proposal core and web export text |
| fix-p2 | wt-fix-p2 | 5 layout review findings (2 high: detach and move overlap) |
| fix-p4a | wt-fix-p4a | 3 prompt review findings: approval wording, model capability metadata, ai required |
| fix-p6 | wt-fix-p6 | 4 estimator review findings (2 high: retry-only steps dropped, memory blowup) |
| rev-p3a | wt-rev3 | pipeline review |
| p5 | wt-p5 | the visible UI (task-mvzet76i-es6rdx), from the p5design pass |

p7b (the PDF) starts after p5 merges, because it imports p5's pure scene, glyphs and edges.

## Live workflow smoke tests (local server, real qwen3.8-max), after the wave-1 merges
All three turns committed: status 200, no fatal error, no vendor names or banned keys on the wire, 15–23 s per turn.

**1. Support email:** 11 steps.
- The design: guard, then classify, retrieve and rerank, then draft on qwen3.7-plus, then approval (approve, edit or reject), then send on Direct Mail.
- Estimate: $0.0034 to $0.0086 per run.
- One finding, `wf-mixed-out`: triage mixed `next` with `branch`. This led to the fix-mixed job, a deterministic repair.

**2. WhatsApp order-status bot:** two `wf-reply-guard` findings, both correct. Model misses to fix in the phase 4 tuning round:
- the hand-off to a person was an `act` (notify), not a `human` takeover step reached by an `escalate` link;
- `effect` was put on a trigger;
- the WhatsApp trigger wasn't marked `untrusted`;
- order lookup used the `web_extractor` built-in tool instead of the customer's own system (`runs: customer`).

**3. Sales lead research:** one `wf-reply-guard` finding. Estimate: $0.037 to $0.152 per run.

## Merged since the wave-1 checkpoint
- **p7a** (proposals). The server and Worker leak tests are narrowed: `HIDDEN` drops `qwen`, so a design's own models may be named, and the backend vendor names stay banned (`15f3452`).
- **fix-p2:** 5 layout findings.
- **fix-p4a:** 3 prompt findings. The prompt is now 8,136 tokens, with model capability lines.
- **Each finding has a regression test** that fails before the fix and passes after.
- **Head `130d355`:** root 928/928, core typecheck clean. Before the fix merges: web 444/444, Worker 270/270, all three typechecks clean.
- **rev-p3a: 5 findings**, sent to fix-p3a (task-mvzf4i68-41xz2b).
  - high: workflow turns ignore pinned constraints;
  - medium: compaction drops exchanges before they're summarized;
  - medium: compaction can return memory over the next-request budget;
  - medium: stored refs bypass the allowlist;
  - medium: prototype-name ids round-trip inconsistently.
- **fix-mixed merged:** the wf-mixed-out repair (workflow tests 114/114).
- **p4b merged:** 43 workflow cases, eval tests 175/175. The first live workflow eval (`workflow-baseline-1`, one run per case, budget 115) is running.

## First live workflow eval (`workflow-baseline-1`: 43 cases, 1 run each, $0.38)
- **Headline:** pass@1 0%, but 92% of checks pass and the judge signs off 34/43.
- **The 0% is mostly an eval artifact:** every case required `product: model-studio`, while models are named through `ai`.
- **Real misses:**
  - 4 cases with `wf-reply-guard`;
  - 2 cases with `wf-approval`;
  - voice cases without a transcribe step;
  - 3 mention regexes too narrow.
- **Integration fix:** `eval/run.ts` now passes the model table to workflow turns (`bb8faf8`). The first attempt threw "Workflow turns need a model table".
- **Also merged:** fix-p6, the estimator fixes (75/75 tests; worst-case graph about 16 ms).
- **Tuning round 1 started** (tune1, task-mvzfl9xt-qm3dfq):
  - Part A corrects the eval;
  - Part B tunes the prompt from the records, the judge notes and the smoke findings;
  - an offline re-score separates the two.
- **fix-p3a merged:** the 5 pipeline findings. Root 972/972, Worker 274/274, typechecks clean, hash `998fab223dab`.
  - Note for the morning: requests within one maximum-length ask (6,000 characters) of the 512 KiB limit are now rejected rather than accepted. Compaction keeps committed memory below that line.

## Cloud regression after wave 1 (`wave1-cloud-regression`, 109 cases x 3, $4.69)
- **Headline:** pass@1 95.4%; every run passing on 98/109 cases (baseline: 96%, 100/109).
- **Changes against the baseline:**
  - two cases dropped by 2 runs: `ai-07-training-residency` (2/3 → 0/3) and `as-03-fully-stated` (3/3 → 1/3);
  - two cases dropped by 1 run;
  - three cases gained a run.
- **Not a regression:** the old (58b4fc3) and new code build byte-identical cloud messages for all 141 eval turns: system prompt, per-turn user message, and repair messages (`scratchpad/msgdiff.mjs`). So the cloud model input is unchanged, and the drops are run-to-run model variance.
- **tune1 merged** (`060d95b`). The eval corrections take the stored outputs from 0/43 to 36/43, and the prompt is now 8,891 tokens. The live round-2 eval (`workflow-tuned-1`, 43 cases x 3) is running.

## Wave 3
- **p5 (UI) merged.** Web 489/489, web typecheck clean. The production `npm run build` passes, including the vendor scan: 905 files, nothing hidden.
- **Tuned workflow eval** (`workflow-tuned-1`, 43 x 3, $1.52): pass@1 **72%**, pass@3 88%, checks 98%, judge means 4.1–4.6 of 5. Up from 0% before tuning round 1.
- **Started:** p7b (PDF, task-mvzgk87n-jjo5ow), tune2 (task-mvzgk9p5-uls8o8, the last tuning round) and rev4 (review of the UI and proposals, task-mvzgkc4l-gxq6ne).
- **Live UI check** (headless Chrome driving the app against the local server and real Qwen):
  - **What works:** the turn commits (12 steps), the model chips say "candidate, validate on your data", the effect badges show, and the Korean UI strings render.
  - **The defect:** the canvas zooms far too far in. At 1150 px only 1.5 cards are visible (each about 335×225 px), and at 800 px less than one. That started fix-camera (task-mvzgrpk2-zc5tek), with acceptance of at least 4, 3 and 2 columns at 1150, 920 and 800 px.
- **Browser pane:** hidden while the user sleeps, so screenshots come from headless Chrome. The script is `apps/web/scripts/.claude-live-ui.mjs`, not committed.
- **rev4: 8 findings.**
  - Proposal findings 4–7 (model allowlist tokenising, writer attribution, invented prices, vendor names through step ids) went to fix-proposal (task-mvzgw1ri-nlpwnr).
  - UI findings 1–3 and 8 (splice layout semantics, empty workflow stranding cloud content, boolean cost edits lost, live region) wait for fix-camera, since both touch the canvas.
- **tune2 merged** (the last tuning round; prompt 9,591 tokens). Its eval corrections alone take the stored outputs from 72.1% to 79.8% pass@1, with structural safety failures kept as failures. The live eval round 3 (`workflow-tuned-2`, 43 x 3) is running.
- **fix-proposal merged:** findings 4–7, proposal tests 55/55.
- **Live eval round 3** (`workflow-tuned-2`, after tune2, 43 x 3, $1.61): pass@1 **88%**, pass@3 **98%**, all-3 74%, checks 99%, judge 4.28–4.70. Remaining: 9 approval gaps (for example a coupon applied or a translation published without approval), 2 phone reply guards, and a few task misses. Tuning stopped here (the stop rule).

## Wave 4
- **ko/zh cases.** 20 workflow cases (`wf-ko-*` and `wf-zh-*`) were translated by Qwen Flash from 10 English cases. They are category `i18n`, and their mention regexes are dropped. `check-cases` says they are well formed (63 workflow cases).
- **First i18n eval** (`workflow-i18n-1`, 20 x 3): the designs hold up (workflow checks 98%), but **say text is in the user's language only 5% of the time**, and ask text 39%.
  - **Cause:** the workflow user content lacked the `REPLY LANGUAGE` line that the cloud path adds (`prompt.ts:426`). The prompt said only "Answer in the user's language".
  - **Fixed** in `ba8721e`, which adds the line and a rule naming every readable field, with a test. The re-run (`workflow-i18n-2`) is running.
- **fix-camera merged:**
  - the readable zoom floor is 11/14;
  - the initial fit never goes above 1.0;
  - card heights are sized to content;
  - titles wrap;
  - the camera follows the newest inline column.

  A live check with real Qwen and English locale shows **5, 3 and 2 fully visible columns at 1150, 920 and 800 px**, at zoom 0.786 (11 px titles). That passes the acceptance bar of 4, 3 and 2.
- **p7b (PDF) merged:** the workflow diagram as vector SVG, with steps, the runtime mapping, costs and questions. Long diagrams tile onto A3 detail pages. Cloud snapshots are unchanged. Following PLAN §10, mixed sessions export only the workflow diagram.
- **Integration break:** the compact cards from fix-camera mean the PDF's card text and model chips are drawn below the card rectangles (the svg test failed). That started fix-pdfcard (task-mvzhpw29-om6198).
- **Live UI defects found:**
  - literal ` ? ` where ` · ` was meant, in the scene edge labels, the popover, the panel and the cost drivers. The first three are fixed in `ba8721e`; WorkflowCost.tsx waits for fix-ui;
  - the Steps and why panel is unstyled, sorted alphabetically, repeats "Not specified", and its handle says "products". That started fix-panel (task-mvzhxyy8-smghnn).
- **fix-ui started** (task-mvzhpxfg-02y64m): rev4 findings 1–3 and 8.
- **rev-final-a started** (task-mvzhzaoa-jq1vuc): a read-only extra-high review of the integrated backend (core, server, Worker, the eval's false gates).
- **i18n re-run** (`workflow-i18n-2`, 20 x 3, $0.80, after `ba8721e`):
  - sayLang went from **5% to 100%**;
  - pass@1 went from **5% to 73%**, with pass@3 85% (ko 80%, zh 67%) and workflow checks 97%.
  - **Remaining misses are model behaviour**, not checker bugs:
    - approval gating on every path: zh claims 2/3. An "auto-approve small claims" branch reaches an inline `pay` step without a human gate. The policy accepts at-call approval only for attached tools;
    - the ko translations of "publish" and "send" asks sometimes produce designs that stop at a queue (the effect is missing);
    - zh RAG skips the human takeover in 2 of 3 runs.

    These are the same classes as the 9 English approval gaps. Tuning stays stopped under the stop rule; this is a follow-up for the morning.
  - The cases are committed.

## Wave 5
- **Merged:** fix-pdfcard, fix-ui (rev4 findings 1–3 and 8), fix-panel (Steps and why polish), plus the cost-panel separators.
- **Gates on `7e9bb02`:**
  - root 988/988 and Worker 274/274;
  - web 612/614. One cloud PDF timing gate ran 9 s under parallel load and passes alone in 1.3 s;
  - all three typechecks clean, and the cloud prompt hash unchanged.
- **Layout bug found and fixed** (`fecea04`). `workflowLoopIds` started its cycle search at the first node id. In 13 of the 32 fixtures it took a forward link for the back edge (support-email: `draft → check` instead of the human edit branch). The flow then folded into extra rows on Tidy and in the PDF, and those forward links were drawn as loops. The search now starts at triggers. A regression test from the exact fixtures fails before the fix and passes after.
- **Known limitation for the morning.** The live canvas keeps core's per-row attachment reserve: 360 units per row, scaled 2.5× on the web. A branch row (approve, reject, escalate) sits about 900 units below row 0, so it's off the first view at every width. The 5/3/2 acceptance counted inline columns only. Reserving slots only under agent hosts would cost the "zero foreign moves" streaming rule. That is the user's decision.
- **rev-final-a (Codex, backend): 11 findings.** High:
  - backup-generated text can carry the backend identity to the browser;
  - effects on non-action kinds escape the approval check;
  - links out of attached nodes bypass the approval walk.

  Medium:
  - repair can exceed the edge cap and leave an unreadmittable session;
  - long narration does the same;
  - requirement text can forge prompt sections (self-injection only; deferred);
  - cross-kind id collisions are admitted;
  - proposal filter bypasses;
  - prices written in words.

  Low: writer attribution wording, and the eval's loop gate.

  The Claude backend review workflow (wzy9lq4pc) is still running. Both lists will be merged into one fix round.
- **Started:**
  - fix-pdfpages (task-mvziyu3m-av29uw): PDF row compaction, pagination, and panel step order;
  - rev-final-b, the Codex frontend review (task-mvzizsxp-yvihxc);
  - the Claude frontend review workflow (wxn4ygkg5).
- **fix-pdfpages merged** (`83785c7`).
  - PDF rows are compacted; wide diagrams wrap into ordered strips; detail pages are balanced and hold whole cards; continuation notes point forward; step sections use the panel's order, with a parity test on all 32 fixtures.
  - Support-email went from 5 diagram pages to 1, and the 25-step sample from 11 to 3. Checked by eye on the rendered PNGs.
- **rev-final-b (Codex, frontend): 9 findings.**
  - A corrupt saved layout passes revival.
  - "Use default" can re-apply the discarded value.
  - Huge estimate values are saved but not used.
  - The upper per-run figure is rounded to $0.01.
  - Tidy is lost on refresh.
  - Follow picks an old step over the new branch.
  - Raw units and source text appear in every locale.
  - Popovers don't reposition.
  - Live-region announcements fire at batch frequency.
- **The Claude backend review workflow** (65 agents, each finding checked by two verifiers): 19 confirmed, 10 disputed on intent, 0 refuted. It overlaps Codex on the identity leaks, the approval-walk bypasses and the proposal filter. New:
  - estimate values the panel accepts but admission rejects, which bricks the session (high);
  - stale estimate keys outgrowing the map cap;
  - the share and loop drivers not matching the estimator;
  - eval gates (approve satisfied by a non-human step, workflow labels never language-checked);
  - O(n²) compaction, about 2 s CPU on a crafted turn;
  - the nested fence strip;
  - the proposal backup voice;
  - BOM parity.
- **Shared estimate limits:** `1bce59a` puts them in core (`workflow-estimate-limits.ts`) and wires admission to them.
- **Started:**
  - fix-be-a, the turn path (task-mvzkd22v-iro2f0): the identity boundary in both modes, the proposal filters, committed memory always admissible, fences, admission parity, linear compaction;
  - fix-be-b, workflow semantics (task-mvzkd47b-axclco): effects only on act, tool and memory; no control links on attached nodes; edit outcomes only from humans; repair caps; estimator fixes and an exported choice set; eval gate fixes with an offline re-score.
- **Deferred:** requirement-text section forging (Codex #6, Claude D3). It is self-injection through client-held memory, and the fix would touch the cloud user content.

## Stopped at the usage limit (2026-11-03)
- **Merged:**
  - round A (`ea4485f`) and round B (`c53327b`);
  - the latest commit: harmless effect drops are info, two sharper prompt lines, tidy imports, and the edge-cap invariant test made real.
- **Gates on the merged tree:**
  - root 1087/1087;
  - web 617/618 (the PDF timing gate fails only under parallel load);
  - Worker 275/276 (the auth timing test passes alone, twice);
  - all three typechecks clean after the test-type fix, and the cloud hash unchanged.
- **Still to do:**
  1. A frontend fix round. Input: rev-final-b.md (9 findings), the Claude frontend review workflow wxn4ygkg5 (it may still be running; check its output), the UI half of C9 (import `workflowChoiceSets`), C7 (the panel uses `ESTIMATE_LIMITS`) and C12.
  2. The workflow prompt changed again (data rule, two lines), so run the full workflow eval (63 × 3) and the cloud regression. Round A touched the shared commit path and fences, so also re-run msgdiff.
  3. Re-run the live UI check, update PLAN.md, remove the worktrees, `apps/web/scripts/.claude-live-ui.mjs` and `tmp/`, then write the morning report.
- **Known limitation for the user to decide:** live branch rows sit about 900 units below row 0, because of core's per-row attachment reserve.

## Resumed after the usage reset (2026-11-03)
- **msgdiff against `58b4fc3`** (before phase 3a), 141 eval turns: 0 `buildMessages` differences and 0 repair-message differences. The cloud model input is byte-identical after round A.
- **Final workflow eval** (`workflow-final-1`, 63 × 3, $2.42):
  - pass@1 **84%**, pass@3 **97%**, all three runs pass 68%;
  - by category: English 90% (129 runs, pass@3 100%), rule/trap cases 91%, ko/zh 72%;
  - judge sign-off: samples 88% (4.44), traps 100% (4.66), i18n 75% (4.44);
  - remaining misses: approval gating on every path (7 runs), the classify task (4), publish and send effects missing (4 and 3), the human and approve and takeover steps (4, 3 and 3), automated loop bounds (3).

  These are model behaviour. Tuning stays stopped under the stop rule.
- **Final cloud regression** (`final-cloud-regression`, 109 × 3, $4.71) against the phase-0a baseline:
  - pass@1 **96.3%** (was 96%); every run passing 100/109 (unchanged); some run passing 108/109 (was 107); cost per turn $0.0081 (was $0.0085);
  - changes: `ai-07-training-residency` 2/3 → 0/3 (the same drop as the wave-1 regression); `need-08` 0 → 2; `ko-mt-01` 2 → 3; `ko-pat-04` and `mt-05` 3 → 2.
  - The model input is byte-identical, and the ai-07 failures are the model's choices (it draws `agentloop` and names Singapore against a residency rule). So this is model variance, but ai-07 is worth watching.
- **The Claude frontend review workflow** (116 agents, resumed after the reset): 54 confirmed, 1 disputed, 0 refuted. The worst:
  - **high:** workflow cards never receive pointer events, so hover, click and the "+N" list are dead with a mouse;
  - Escape in a cost field saves the value and collapses the panel;
  - a removed step steals focus from the composer;
  - a workflow repair reports "Fixed" while a requirement is still broken;
  - a mixed session takes requirement state from the wrong view;
  - the cost drivers don't match the estimator;
  - raw units and research references in the cost rows;
  - the popover doesn't track the camera.

  Merged with Codex's 9 into three parallel fix jobs with disjoint files: fe-store (task-mvzs2peu-792xki), fe-canvas (task-mvzs2r1c-2g1p0g) and fe-cost (task-mvzs2tok-rn85sc).
- **Frontend fix round merged:**
  - **fe-store** (`e910d8a`) and the C39 heading (`35bf6c9`);
  - **fe-cost** (`72087d6`);
  - **fe-canvas** (`3c4145a`). I also fixed one stale selector: `canvas.css` still disabled pointer events on `[data-id='edges']`, which after the layer rename would have frozen a real cloud card with id `edges`.
- **Final gates on `3c4145a`:**
  - root 1087/1087, web 658/658, Worker 276/276;
  - three typechecks clean, and the cloud prompt hash unchanged;
  - the production build is clean, and the hidden-word scan passes;
  - the browser e2e suites all pass: workflow 30, panel 12, cost 25, regressions 28, store 1.
- **Live UI check** (real Qwen, English locale), in `results/live-ui-3/`:
  - 5, 3 and 2 fully visible columns at 1150, 920 and 800 px, at zoom 0.786;
  - the hover popover opens, and its separators are middle dots;
  - the panel handle says "Show steps and why…";
  - with the panel open, Fit lifts the row above it;
  - the only console error is the local `/api/me` 404, from the account endpoint that only the Worker serves.
- **Live workflow proposal export** (phase 7 gate; real UI, real Qwen, the restarted server):
  - **Before the fix, every export failed** (3/3 through the server, then 4/5 calling `draftProposal` directly):
    - the agent's step line said "attached tools", and the cloud cross-reference rule `PRICE_ALWAYS` read the bare "attached" as "see the attached document";
    - the step stayed missing, so the workflow-only completeness check failed (`draft-failed` or `draft-timeout`);
    - the new money words (round A) also caught 이 원칙, 사원, 일원화, 一元化 and the verb "won".
  - **Fixed:**
    - in workflow mode, "attached" counts only next to a document word;
    - spelled-out amounts need an unambiguous currency word;
    - 원 and 元 need a magnitude numeral;
    - ten regression tests from the exact live lines (six failed before the fix);
    - cloud proposals keep the bare "attached" rule.
  - **After:**
    - en: done, 12 sections, an 18-page PDF;
    - ko: done, 11 sections, a 15-page PDF;
    - both have the overview, steps, where each step runs, the priced usage (typical and upper) and open questions;
    - `hasHiddenIdentity` is clean on both PDFs and on the wire, and there are no page errors.
- **Cloud replay** (`?replay=ha`): 9 cards, 13 edge paths, the `~edges` layer with no pointer events, and hover popovers work.
- **Gates:** root 1097/1097, web 658/658, Worker 276/276, typechecks clean, and the cloud hash unchanged.

## Deployed (2026-11-03, the user's go-ahead)
- **Pushed:** `phase-1` was pushed, and `main` was fast-forwarded to `c4d9b6a`.
- **Deploy:** run 41550040669 on `main` with `confirm=deploy` succeeded in about 1 minute. Every step passed: preflight, the web build, the Worker tests, the D1 migrations and deploy (version `69e0430f-a85e-45f6-be9f-42dac120d9b4`), and the health check.
- **Live:** `/api/health` answers `{"ok":true}`. The app and its assets sit behind the sign-in, so the UI was not inspected after the deploy; no password was entered.
