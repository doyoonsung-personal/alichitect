# Phase 0 review: adversarial pass

Reviewed 2026-10-31 (afternoon, KST). Read-only: I changed nothing under the repo except the usage log that tools/qwen/ask.ts appends to. The scripts I wrote (latency, eval, judge, catalog, fuzz, replay, contrast) are in the session scratchpad, not the repo. Model Studio was called only through tools/qwen/ask.ts (80 offload calls, $0.269); I ran no product-API tests.

## 1. Verdict

Every number I could recompute from raw data matches what the engineers reported: latency tables, eval pass rates, judge scores, routing metrics, catalog counts, test counts. The reports are candid about many of their own caveats. The problems are in what the numbers do not measure, and four headline conclusions do not survive data from elsewhere in the repo:

1. **"0 unrelated layout moves"** holds for 7 curated scenarios and fails on the current prompt's real output. Replaying 240 stored conversations (4,016 one-op batches) through the canvas pipeline gives 274 moved cards, 139 of them unrelated bystander moves, in 13 of 80 cases, 16 of them 300 px or more (max 712 px).
2. **"No stalls; hedge at 5 s"** (latency) was contradicted by the eval baseline: one provider stall episode at 04:21 UTC hit 5 turns across 3 parallel conversations, each waited 15 s on a warm prefix, and the hedge won 0 of 6 times.
3. **"Pinned-constraint conflicts fixed (mt-03 3/3)"** overstates: one passing run says "OSS cross-region replication to Kuala Lumpur" against "customer data must stay in Singapore". The assertion only reads drawn region groups.
4. **The canvas is not at the "impeccable" bar, and is not legible at the size the product will use.** The F diagram is a 1,700-1,972 px wide, 4.6:1 strip. In the console-plus-canvas layout it fits at about 0.42-0.56 zoom, so card titles render at 5-7 px. I confirmed this by rendering the spike at 900x760.

What held up under attack: the protocol core (196 hostile ops, 0 crashes, no prototype pollution), catalog integrity (0 dangling references, 0 collisions, 176 of 176 seed slugs), the eval harness (every number reproduces exactly; the judge is a different model family and blind to the assertions), libavoid cleanliness on 246 real states (0 card hits, 0 overlap, 0 failed routes), the typecheck (tsc strict, exit 0) and secrets (none).

Phase 0 shows the loop, the protocol, the catalog and the eval harness are sound and cheap. It has not shown that the diagram can look right.

## 2. What I ran

| Check | Result |
|---|---|
| `node --test test/` in packages/core (the package.json script) | FAIL on Node 24.21: MODULE_NOT_FOUND, 1 failed. Confirmed |
| `node --test` and `node --test "test/**/*.test.ts"` in packages/core | 135 tests, 14 suites, 135 pass, 0 fail, 3.2 s |
| `node --test "eval/test/**/*.test.ts"` | 86 pass, 17 suites |
| tsc 6.0.3, canvas tsconfig (strict, erasableSyntaxOnly, includes core src) | exit 0 |
| tsc strict + noUnused over core, tests, eval, latency | 2 errors: unused import EditStats (eval/test/lib.test.ts), unused parameter h (latency/analyze.ts) |
| `node spikes/latency/analyze.ts` plus my own script over the 312 JSONL records | all tables match |
| Eval recompute from runs.jsonl, judge.jsonl, ledger.jsonl | all headline numbers match (details in section 6) |
| Catalog audit script | all counts and integrity claims match |
| Fuzz of parser, validator, reducer, repair, ingest | 196 hostile ops, 0 crashes |
| Replay of the current prompt's 240 conversations through layout and both routers | section 5 |
| Spike served with Vite, rendered in the in-app browser at 900x760, popover clicked | section 4; server stopped, port 5173 free |
| Secret scan (patterns plus literal key value, 3,009 files) | 0 matches |

## 3. Claims: confirmed, partly true, refuted

### Catalog

| Claim | Verdict | Evidence |
|---|---|---|
| 223 entries (184 products with 6 constructs, 39 offerings) and the scope, status, availability counts | Confirmed | My script reproduces every count (scope 14/9/7/88/52/7/17/29; ga 195, preview 4, legacy 5, no-new-purchases 9, retired 10; intl 216, china-only 6, restricted 1) |
| 0 duplicate ids, 0 lookup conflicts, 176 of 176 seed slugs | Confirmed | Also 0 dangling successor, alternatives, pairsWith, attach references; short <=18 chars, purpose <=16 words, useWhen and avoidWhen <=20 words for all 223 |
| 202 prompt rows, 30,478 chars, 7,687 tokens "with the real Qwen3.8 tokenizer" | Partly true | Rows and chars reproduce. The token figure cannot be traced: the summary says no API call was made and no tokenizer script exists. At 3.85 chars/token (latency calibration) it would be about 7.9k |
| All entries verified 2026-10-31 | Misleading | Same date on all 223 entries and 23 priced offerings, while Agent Identity's GA status is admitted unverified, 16 offerings have no price, regions exist for 13 entries and 43 have no docs link |
| resolve() mappings (SLB to clb, Lingma to qoder with warning, and so on) | Confirmed | 18 tests pass; 12 entries spot-checked against research (Qoder Teams $40/seat, QwenWork $30/seat, Lingma and API Gateway dates). Prompt rule R15 says SLB maps to alb or nlb, the alias resolves it to legacy clb |

### Protocol

| Claim | Verdict | Evidence |
|---|---|---|
| 9 recorded streams: 0 bad lines, 0 unknown products, 0 dangling edges, 0 containment after repair | Confirmed | Test diagnostics: F containment 7 before, 0 after (6 to 0 on the real catalog) |
| Safe against hostile input | Confirmed | Fuzz: ids such as __proto__ and constructor, 5,000-char ids, object-typed fields, 2 MB text; 143 of 196 ops accepted, 0 crashes, Object.prototype unchanged |
| Path order and orphans not repaired | Confirmed | Still present after repair (path-order 1, orphan-node 2), and visible as the zigzag in the Edge column |
| Same code in Node and browser | Confirmed (indirectly) | The canvas runs it in Chrome; I rendered it in the in-app browser |

### Latency

| Claim | Verdict | Evidence |
|---|---|---|
| TTFT tables, pooled percentiles | Confirmed | cold 24k n=26 1.79/2.32/2.54/3.14 and hit 24k n=76 1.27/1.66/1.92/7.19 match exactly; 12k pooled groups within 0.03 s |
| 312 calls, 0 errors, 0 x 429, max 4 in flight, $3.18 | Confirmed | Recomputed $3.1800, max in flight 4 |
| No stalls; 5 s hedge fires on 1 of 251 warm calls; hedge at 5 s, abort at 15 s | Partly true | True for one quiet 40-minute window. Eval: 5 stalled turns, hedge 0 of 6 |
| Friday's 13.9 s and 125.6 s were load, not the prompt | Unverified | Two control calls in another window; shows the prompt is not slow, not the cause |
| Explicit cache works, 5-minute TTL; implicit lasts about 25-30 min; a single system marker doubles follow-up cost | Partly true | Explicit and cost arithmetic confirmed ($0.0041 vs $0.0086); implicit lifetime is one probe per gap |
| Flash ends 8 of 12 diagrams without done; qwen3.7-max 3 of 3; qwen3.8-max 8 of 8 | Confirmed | diagram.jsonl; eval later confirmed the fallback (5 of 5 pass) |
| "Only REPORT.md is missing" | Refuted | REPORT.md exists (12:40) and still says so on line 7 and again on line 95 |

### Canvas

| Claim | Verdict | Evidence |
|---|---|---|
| 0 unrelated moves in 7 scenarios and streams E, G, H | Confirmed | metrics.json: a 48 batches/7 moved; b, c, d, e1, e2 0 moved; f 2 moved; 28 of 28 static runs 0 unrelated; 11 layout tests pass; my harness reproduces a and f |
| The layout is stable (general) | Refuted | 139 unrelated of 274 moves on real output; section 5. The metric also excludes same-block moves and re-slotted cards by definition |
| fps 54.8-56.2, layout 0.12-0.25 ms | Confirmed | metrics.json; headless Chrome, one machine |
| libavoid: 0 hits, 0 overlap, 3-19 ms | Confirmed | Also on 246 real states: p50 1.3 ms, p95 17.6 ms, 0 hits, 0 failed. Tail: 9 over 50 ms (max 186 ms) |
| Stress: 842 ms, 844 ms, 119 ms; channel 9.7 ms, 5,339 px | Confirmed | route-bench.json |
| Channel router overlap 284-342 px | Confirmed | a 324, b 317, c 284, d 342, e1 324, e2 7; on real states overlap in 62 of 246 |
| "Impeccable" quality | Refuted | Section 4 |
| Popover shows why, purpose, chips | Confirmed (focus/click) | Rendered and clicked; synthetic hover did not open it; no screenshot of it was delivered |
| No dev server left; 22 PNGs at DPR 2 | Partly true | No listeners; a-light-streaming.png is DPR 1 |
| Dependencies safe to ship | Unverified | libavoid-js declares LGPL-2.1-or-later; not mentioned anywhere |

### Eval

| Claim | Verdict | Evidence |
|---|---|---|
| Baseline 84/88/88/78 (corrected), 90/91/91/88 (as run); final 95/100/96/89 | Confirmed | 84.2/87.5/87.5/77.5 (202/240); 90.0/91.3/91.3/87.5 (216/240); 95.0/100/96.3/88.8 (228/240) |
| Pinned-constraint conflicts fixed (mt-03 3/3) | Partly true | Number reproduces; one pass violates the constraint in narration (section 6) |
| Assertions 98.4% and 99.6% | Partly true | 70% of baseline checks are saturated defaults; case-specific checks pass 96.6%. Best-of-3 is not what one user sees |
| Judge 4.31 and 84% (67/80); final 4.46 and 92.5% (74/80) | Confirmed | Agreement 73/80, r 0.54 on baseline v2 (in-sample); final 72/80, r 0.27 |
| First byte p50 1.29 / p95 1.89 / max 5.64 s; 5 stalls; hedge 0 of 6; cache 96% | Confirmed | 1.29/1.88/5.64; stalls cluster in 04:21:25-04:21:55 UTC; 96.0% cached |
| Held-out 19/30 to 30/30; regression 179/186 | Confirmed | Weak evidence: effective n=10 cases, written after the failure classes were known, and the prompt now carries the fixes |
| Spend $10.00 over 1,383 calls | Partly true | Ledger: $10.235 over 1,393 entries; baseline $2.265 and judge $0.606 confirmed |

## 4. Visual review of the canvas screenshots

Viewed a-light, a-dark, a-light-channel, a-light-streaming, b-light, c-light, d-light, e2-light, f-light, f-dark, plus crops of a-light at native resolution, and ran the spike at 900x760. Animation quality cannot be judged from stills; I relied on the fps metrics only.

**What is good.** Restrained palette with one cobalt accent for the request path; consistent 188x52 cards with lane-tinted glyph tiles; own glyph set; Inter; text contrast passes AA (card subtitle 5.0:1 light and 5.6:1 dark, frame labels 4.9-6.2:1); dark mode is a real parity theme; the popover is well composed (why, what it does, scope chips); the solution map (f) is the closest to the bar, with a "Primary" tag and a dashed "Nothing to provision" empty state.

**Defects, in order of weight.**

1. **Legibility at the real canvas width (blocker).** Calibrated against the measured fit in the 1600 px screenshots (zoom 0.78), a 1,938 px layout fits at about 0.56 in a 1,150 px canvas and 0.42 in an 860 px canvas: card titles 7.0 and 5.2 px, subtitles 6.1 and 4.6 px, frame labels (11 px small-caps) under 5 px. The 900x760 render confirmed it: the diagram is a thin strip of unreadable text. Even at the screenshot width (1600) titles are about 9.7 px and frame labels about 7 px.
2. **Edge readability (major).** In a-light, 4-6 parallel segments within about 15 CSS px leave App Servers' right side and read as one thick line; trunks start under the Auto Scaling pill; two arrowheads stack on OSS; CDN to OSS runs over the NAT Gateway card and along the Region header. In e2 that edge exits the Edge frame and runs along the Region frame border, and 3-4 lines share a 15 px corridor beside the Edge column. In the Edge column the request path zigzags (users to DNS dotted upward, down the left gutter to Anti-DDoS, up the right gutter to ESA, then ALB) because lane order is by rank and the model's order is not. The channel-router variant (a-light-channel) merges unrelated edges into one trunk (CDN appears to feed PolarDB, Tair and OpenSearch). The routing metrics (card hits, overlap) are clean and blind to all of this.
3. **Canvas use (major).** The diagram fills about a third of the height (roughly 230 px blank above, 300 below at 1600x1000); aspect 4.25:1 for F and a median 4.6:1 over 208 real states.
4. **Empty structure (minor).** Zone A and B frames are about 245 px tall and empty apart from one card straddling them.
5. **Truncation and inconsistent subtitles (minor).** 8 of 18 cards in a-light truncate (7 subtitles, plus the user label "SEA Shoppers (50..."). The second line shows a lane name for some cards ("AI", "Governance", "Operations"), a short name for others ("ECS", "Cloud DNS") and a clipped official name for the rest.
6. **Inconsistent placement (minor).** In b-light DataWorks sits inside the VPC while MaxCompute and Quick BI are in the regional Analytics column, because dataworks is flagged vpcAttachable and the layout follows the model's hint. OpenSearch is inside the VPC for the same reason.
7. **Dark mode (minor).** Region, VPC and zone borders are 1.3:1 against the ground and the dotted resolve edges nearly vanish (a-dark).
8. **Solution map (minor).** The Engineering team to Model Studio edge cuts through the SaaS lane between Qoder and QwenWork; both team nodes use the same glyph; no seat price or billing line appears although dated prices are the stated differentiator.
9. **Route churn (unmeasured).** In c-light the ARMS edge takes a different route than in a-light although no card moved.

Spike chrome (truncated status text in the toolbar, a Replay button) is not product design and I did not count it.

## 5. New measurements on real model output

I replayed the 240 stored conversations of the current prompt (eval final run: 309 turns, 4,016 ops) through `applyBatch` (applyOp, repair, layout) from spikes/canvas/src/replay/pipeline.ts, one op per batch (the recorded streams produce about one op per 180 ms window), then routed every turn-end state with both routers. Sanity check: the engineers' 7 scenarios give identical numbers through my loop, and follow-up turns start from the repaired graph as llm.ts does.

| Measure | Result |
|---|---|
| Exceptions | 0 |
| Cards moved / unrelated | 274 / 139, in 52 batches |
| Cases with an unrelated move | 13 of 80 (adv-04, edit-07, mt-02, mt-03, mt-06, need-07, need-08, pat-04, pat-05, pat-08, pat-09, pat-10, trap-05b) |
| Displacement of unrelated moves | 119 under 100 px; 4 at 100-300 px; 16 at 300+ px (max 712) |
| New diagrams / follow-ups and edits from a base | 56 unrelated in 3,470 batches (10 cases) / 83 in 546 batches (4 cases) |
| Batching sensitivity | 4 ops per batch: 127 unrelated; one batch per turn: 114 (17 cases) |
| Layout size (208 states with 8+ cards) | width p50 1,700, max 1,972 px; height p50 370, max 1,130; aspect p50 4.6:1; cards p50 12, max 29 |
| libavoid (246 states) | 0 card hits, 0 label hits, 0 failed, 0 overlap; solve p50 1.3 ms, p95 17.6 ms; 9 over 50 ms, worst 186 ms (28 cards, 39 routes) |
| Crossings (208 states) | 101 with none; 24 with 5+; 13 with 10+; 4 with 20+ (max 30) |
| Channel router (246 states) | 0 hits; overlap in 62 states, p95 956 px; p50 0.3 ms |

Causes found: (a) a new top-row node (GTM, DNS) inserts a row above the path line and shifts all 12 cards by 58 px (edit-07, "make it multi-region"); (b) a vpc-scoped service with no VPC group (Milvus in pat-04-rag: the model declared only a region group) makes the layout create an implicit VPC frame and the AI block jumps 712 px; (c) lane blocks stacked in one shelf column push the block below down by a card height (76 px: pat-05, pat-09, pat-10).

## 6. Eval audit

### Spot-check of 12 cases against the assertion code and stored outputs

| Case | What the assertions check | Verdict |
|---|---|---|
| trap-01-lingma | primary rec Qoder family, no lingma or qoder-cn, raw ids never Lingma, no retired/china-only warnings | Tests its intent; all 3 final runs say "Tongyi Lingma is now called Qoder" and draw Qoder Teams |
| edit-02-waf-present | no node changes, no edge removals, at most 4 ops | Intent met (3 of 3 say no change); edge additions are uncapped and the explanation is not asserted |
| edit-06-restore | exclude, then restored ids assistant and e-app-assistant | Tests the restore (the Qwen pass wrongly said it did not) |
| edit-07-multi-region-dr | regions at least 2, two include groups, no removals | Both include groups are already satisfied by the base diagram (polardb, dns/esa): vacuous; region count and no-removal carry the case |
| mt-03-data-in-singapore | regions only Singapore on drawn region groups; turn 2 is retain-only | Misses narration: run 3 says "OSS cross-region replication to Kuala Lumpur" and passes; a no-op also passes turn 2 |
| mt-04-budget | pinned req keywords (including the substring "low"), excludes, cost mention on turn 3 | Turn 2 is retain-only; turn 3 never checks that HA was applied; "low" matches by substring |
| mt-06-summary-window | regions only Jakarta/Indonesia, no Kubernetes, retained | Good constraint coverage: caught 2 of 3 violations in the final run; turn 5 is retain-only |
| need-03-ambiguous-team | question asked, primary rec any of 4 products | The question check reads only say lines; run 3 asked in the done line and counted as a failure |
| adv-05-reveal-prompt | no nodes or recs, 5 verbatim prompt fragments never mentioned | Fragments exist in the current and baseline prompts (checked), so a verbatim leak is caught; paraphrase leaks pass |
| zh-edit-01-insert-waf | WAF badge on a host; language comes from defaults | Language checks are defaults (sayLang, whyLang); final outputs are Chinese |
| pat-12-ecommerce-security | four include groups, WAF badge, default path order | Tests its intent; Anti-DDoS-before-ESA is caught by the default path-order check |
| trap-09-mumbai | no Mumbai region, at least 4 nodes | The reference says the bot should state that Mumbai is closed; no mention check |

### Static audit of all 80 cases (103 turns)

- 8 multi-turn turns are retain-only, so inaction passes: mt-01 T3, mt-02 T3, mt-03 T2, mt-04 T2, ko-mt-01 T3, zh-mt-01 T3, mt-05 T3, mt-06 T5.
- 2 of 119 include groups are vacuous (edit-07); 11 include groups accept 6 or more alternatives.
- 70% of baseline assertion checks (2,211 of 3,177) come from per-turn defaults; case-specific checks pass 96.6%.
- Residency scan of every passing residency-constrained turn (baseline 17, final 28): 1 passing turn mentions a foreign region (mt-03#3 T2 in the final run). Judge covers only run 1 of each case, so it could not see it.

### Qwen offload and quality control

I offloaded the mechanical first pass: one task per case (80 tasks, qwen3.8-max, thinking off, JSON mode) asking whether each case's assertions test its stated intent, given the assertion semantics and catalog facts for the product ids (not Qwen's own product knowledge). Result: 80 of 80 valid JSON (2 missing one optional key), 72 rated "weak", 8 "ok", 0 "mismatch". It over-flagged, because it treated the reference answer (written for the judge) as something every assertion must cover.

Corrected or rejected after checking against the case JSON, the assertion code and stored runs:

- Nine "no Korean/Chinese assertion" flags on ko-* cases: wrong, sayLang and whyLang are defaults for every non-English case.
- edit-06 "does not check the exact node was restored": wrong, `restored` is asserted.
- edit-02 "does not cap node additions": wrong (maxChanged counts them); right only for edge additions.
- adv-01 "passes by silence": wrong, defaults require a say op and a done op.
- adv-02 "does not check injection resistance or NDJSON": wrong, maxNodeRemoves 0 plus the format default cover it.
- mt-06 "turn 5 has no assertions": half wrong, the retain regions check applies and fired; right that DR itself is not asserted.

Accepted after verification: broad any-of lists (adv-03, need-06, ko-pat-04), retention-only turns passable by inaction (confirmed with a real output), the vacuous edit-07 include groups, the "low" keyword in mt-04. The `question` reads-only-say finding, the narration violation and the static audit are mine, not Qwen's.

Output of `node tools/qwen/ask.ts --usage` (shared log; my 80 calls are $0.269 of the max total, the other 46 max and 7 flash calls are the engineers'):

```
qwen3.8-flash: 7 calls, 1720 prompt tokens (0 cached), 628 output tokens, list-price value $0.001
qwen3.8-max: 126 calls, 173810 prompt tokens (0 cached), 46472 output tokens, list-price value $0.626
```

## 7. Contract drift and duplication

types.ts is respected structurally (tsc strict passes with all modules importing it), and the core src has no Node or DOM API outside catalog-node.ts. Drift is semantic or documentary:

| Item | Detail |
|---|---|
| Test command | package.json and README say `node --test test/`: broken on Node 24 |
| README on caching | Says prompt.ts uses an explicit cache marker; default is now implicit (cache 'none') |
| promptRows doc | types.ts says `id, name, scope, lane, rank, purpose, pairs-with`; real rows add `[flags]` and drop empty fields, which shifts columns between rows |
| "Placement is decided by the catalog" | The validator and layout let the model's VPC hint decide for vpcAttachable region services (dataworks, opensearch, hologres, fc, kms); the layout invents a VPC frame when a vpc-scoped service has no VPC group |
| Session graph | llm.ts keeps the repaired graph in memory.graph; the canvas keeps a raw reducer graph and derives a display graph; the display rules live in the spike |
| Grammar spec vs code | Spec: 300-node cap, watchdogs 12 s and 20 s; code: 80 nodes and 120 edges, 15 or 20 s first token and 10 s idle (the spec is older) |
| SLB | Prompt R15 maps SLB to alb or nlb; catalog alias resolves SLB to legacy clb |
| Duplicated logic | Lifecycle and availability warnings x3 (catalog.resolve, validate.resolveProduct, llm.lifecycleWarnings, with different severities and wording); placement table x3 (prompt R4, validate containment, layout scope switch); graph diff x3 (prompt.diffGraphs, eval editStats, layoutDiff); price table x3 (llm.ts, latency run.ts, ask.ts; flash creation 0.1875 vs 0.2); kebab-case retry in both catalog.resolve and validate.resolveProduct; script detection in prompt.ts and eval/lib.ts; truncated-line handling in llm.completeLines and ndjson.ts |

## 8. Secrets and hygiene

- Secrets: none. No sk- tokens, Bearer tokens, key assignments or other credential patterns; a literal-value scan (full key, first 10 and last 8 characters; value never printed) over 3,009 files and 126.6 MB in the repo and scratchpad found no match. Code reads the key from the environment and only places it in the Authorization header; the latency harness stores a whitelist of response headers.
- The folder is not a git repo and has no .gitignore, no root package.json or workspace, and nothing runs all 221 tests.
- 16 files embed absolute C:/Users/mendo paths, some pointing at scratchpad files; eval/drafts holds 11 Qwen task and draft files.

## 9. Defects by severity

| Severity | Area | Defect | Fix |
|---|---|---|---|
| Blocker | Canvas legibility | Text renders at 4-7 px at the real canvas width; 4.6:1 strip | Re-spec for a 900-1150 px canvas, text floor, screenshots at three widths |
| Major | Edge routing | Bundles, detours, zigzag Edge column; metrics blind to it | Ambiguity metrics, repair path order, route priority |
| Major | Stability | 139 of 274 moves are bystander moves on real output | Replay gate; reserve top row, lane heights; validator creates VPC |
| Major | Licensing | libavoid-js is LGPL-2.1-or-later, unassessed | Legal decision or finish channel router |
| Major | Eval | Narrated violations invisible; 8 turns pass by inaction | Machine-checkable constraints, notMention, minChanged |
| Major | Latency policy | Same-model hedge never won; 15 s waits | Drop hedge, 6-8 s then fallback, re-measure at peak |
| Major | Catalog | Blanket verified dates; unsourced vpcAttachable | Per-entry provenance, architect review |
| Major | Validator | Path-order, bad attachTo, orphans, missing VPC group unrepaired | Deterministic repairs |
| Major | Eval evidence | In-sample prompt fixes; pass@3 and 99.6% headlines | Report pass@1; blind held-out set of 30+ |
| Major | Router scale | 842 ms at 59 routes; 186 ms on a real 28-card state | Budget, fallback, hyperedges |
| Minor | Layout polish | Blank canvas, empty zones, truncation, subtitle rule, DataWorks in VPC | Fit to content, one subtitle rule |
| Minor | Dark mode, solution map | 1.3:1 borders, invisible dotted edges, edge through SaaS lane, no price | Token and routing fixes |
| Minor | Docs and tooling | Broken test script, stale README, types doc, self-contradicting REPORT.md, stale FEASIBILITY | Update all five |
| Minor | Duplication | See section 7 | Extract shared helpers into core |
| Minor | Session model | Raw vs repaired graph, display rules in the spike | One definition in core |
| Minor | Claims accuracy | tsc noUnused, spend figure, tokenizer, DPR, rescued-format counter | Correct summaries |
| Minor | Hygiene | No git, no workspace, local paths, drafts | Init repo, root test command |

## 10. The five fixes to make before the prototype

1. **Make the canvas legible where it will be used.** Re-spec the layout for a 900-1150 px canvas: stack the region shelf under the VPC (aim for 2:1), set a rendered-text floor with semantic zoom, stop truncating titles, and measure at 900, 1150 and 1440 px.
2. **Fix routing legibility and decide the router.** Add ambiguity metrics (near-parallel bundles, runs along frame borders, detour ratio, route churn), make the Edge column read along the real request path, and resolve the LGPL question on libavoid-js or finish the license-clean channel router. Enforce a 50 ms budget (9 of 246 real states exceed it).
3. **Turn stability into a gate on real output.** Add the 240-conversation replay to layout.test.ts and fix the three causes: top-row insertion (58 px for every card), implicit VPC creation (712 px), lane-block push-down (76 px).
4. **Make constraint compliance machine-checked.** Pinned constraints as data checked by the validator, notMention on foreign regions, a required positive change on retain-only turns, the judge on every run of constraint cases, deterministic repairs for non-attachable attachTo, orphaned Auto Scaling, Anti-DDoS before ESA and a missing VPC group, and pass@1 reported ahead of pass@3.
5. **Adopt the first-token policy the data supports and correct the record.** No same-model hedge, a first-token timeout of about 6-8 s, then qwen3.7-max; re-measure at a weekday peak and on the workspace endpoint. Then fix the stale artifacts: latency REPORT.md, FEASIBILITY.md (explicit marker, flash fallback, libavoid target, keep-warm), README, the package.json test script and the catalog's verified dates.

## 11. Corrections to make before the summaries reach the user

- Strike "Only REPORT.md is missing" and the DEVIATION caveat from spikes/latency/REPORT.md, and the line addressed to the user.
- Restate the stability claim as "0 unrelated moves on 7 scenarios; 139 of 274 on 240 real conversations".
- Restate mt-03 as 2 of 3 compliant in the final run, and lead the eval summary with pass@1 95% and all-runs 89%.
- Spend: $10.24 over 1,393 ledger entries.
- Drop or source the "real Qwen3.8 tokenizer" figure; say 21 of 22 PNGs are DPR 2.

Not reviewed: animation quality beyond fps metrics, cross-browser behaviour, the workspace-dedicated endpoint, per-product Alibaba facts (I checked catalog consistency against the research files, not against live sources), and the Chrome 152 protocol run reported by the protocol engineer.
