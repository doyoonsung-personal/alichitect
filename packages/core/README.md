# @ali/core

Shared code for the live architecture builder: the product catalog, the diagram graph, the streamed op grammar, the validator and the layout. It has no runtime dependencies. Node 24 runs the `.ts` files directly (type stripping), and Vite imports them as they are.

## Conventions

- Erasable TypeScript only: no `enum`, no `namespace`, no constructor parameter properties. Use `import type` for types, and include the `.ts` extension in relative imports.
- Pure functions over shared state. Every function that changes the graph returns a new graph.
- `src/types.ts` is the contract between modules. Change it only additively, and say so in the change description.
- Tests live in `test/` and use `node:test`. From `packages/core` run `node --test`. From the repo root run `npm test`, which runs core, eval and server tests with quoted globs. On Node 24, `node --test test/` fails: the directory is resolved as a module. Write globs with quotes, for example `node --test "packages/core/test/**/*.test.ts"`.
- Type check: `packages/core/tsconfig.json` is strict with `erasableSyntaxOnly`, `noUnusedLocals` and `noUnusedParameters`. Run it with the TypeScript installed under `spikes/canvas/node_modules/.bin/tsc -p packages/core/tsconfig.json`. `apps/server`, `eval` and `spikes/layout-bench` have their own tsconfig and import core.
- One table per fact: prices (`pricing.ts`), regions (`regions.ts`), the graph diff (`diff.ts`), the line completer (`ndjson.ts`) and the lifecycle check (`catalog.ts`) each have a single copy. `llm.ts` and `prompt.ts` re-export them for older callers. Do not add a second copy.

## Modules

| File | Owner | Purpose |
|---|---|---|
| `src/types.ts` | contract | Catalog entry, graph, op grammar v2 (req ops may carry `regions` and `avoid`), warnings, chat memory with `constraints`, and the server API types `TurnRequest` and `ServerEvent` |
| `catalog/products.json`, `catalog/offerings.json` | catalog | `{ "version": "YYYY-MM-DD", "entries": CatalogEntry[] }`; one id namespace across both files |
| `src/catalog.ts` | catalog | `createCatalog(products, offerings): Catalog`: indexing, alias and successor resolution, compact prompt rows. Also `placementOf` (container, boundary, band), `checkLifecycle` (retired, successor, availability) and `successorWarning`. No `fs`, so the browser can use it |
| `src/catalog-node.ts` | catalog | `loadCatalog(): Catalog` reads the JSON files from disk (Node only) |
| `src/ndjson.ts` | protocol | Incremental line parser for streamed content deltas; exposes the partial `say` text for live typing; `completeLines` |
| `src/reducer.ts` | protocol | `emptyGraph()`, `applyOp()`: upsert, cascade delete, insert into an edge, move, a pending-edge buffer, tombstones |
| `src/validate.ts` | protocol | Op schema checks, alias and lifecycle resolution, semantic checks, `checkGraph`, and `repairGraph` (deterministic repairs a to e: containment, VPC and region groups, attach, edge path order, orphans), plus `constraintChecker` |
| `src/regions.ts` | protocol | Region table: the open regions the model may use (`REGIONS`), closed, mainland and unconfirmed regions for mention detection, English, Korean and Chinese aliases, `resolveRegion`, `findRegionMentions` |
| `src/constraints.ts` | protocol | Pinned requirements as data: `mergeConstraints`, `allowedRegions`, `avoidedProducts`, and `checkConstraints(graph, says, constraints, catalog)`, which flags regions in groups, labels and say lines and avoided products |
| `src/display.ts` | protocol | What the canvas shows while a turn streams: `displayGraph`, `holdBack`, `touchedBy`. At turn end it equals the server's committed repair |
| `src/diff.ts` | protocol | `diffGraphs(before, after)`: the net change between two graphs as one `ApplyResult` |
| `src/pricing.ts` | eval | The one price table (`PRICES`, `UNKNOWN_PRICE`) and `costOf`, `estimateCost`. Used by `llm.ts`, the eval ledger and `tools/qwen/ask.ts` |
| `src/prompt.ts` | eval | System prompt (rules + catalog rows, byte-stable prefix), history window, pinned requirements and constraints (sent only in the last user message), CURRENT DIAGRAM serializer, repair messages |
| `src/llm.ts` | eval | Streaming Chat Completions client and turn runner. Watchdogs: no hedge by default; fail over at once to `qwen3.7-max` (thinking off) after 8 s warm or 12 s cold with no first token; 10 s idle; 120 s per stream; one continuation; content-filter rejections are never retried. `onStatus` reports fallback, retry, continue, repair and summary. The default `checkConstraints` is `constraintChecker`. Emits say, op, warn, usage and done events |
| `src/layout.ts` | canvas | Catalog-driven lane-grid layout v2 (stacked shelves, sticky slots and reserves), `fitCamera`, `fitTitle`, `cardText`. `GEOMETRY` holds every size. `test/layout.test.ts` gates stability, legibility and speed on `test/fixtures/replay/sessions.json`, which `spikes/layout-bench/out/core-v2/extract-fixture.ts` regenerates |
| `../../apps/server` | server | Local HTTP server (`node apps/server/src/main.ts`, 127.0.0.1:8787) that streams NDJSON turns: `POST /api/turn`, `GET /api/health`. See its own tests and `scripts/smoke.ts` |

## Pinned constraints (Phase 1 review fixes)

- **Newest region list wins.** A `req` op with `regions` replaces every earlier region list (it holds the complete set now allowed), so "Tokyo is fine now" relaxes "stay in Singapore" and two residency rules never intersect to nothing. `lifts: ["regions"]` drops the region pin; `lifts: ["<catalog id or family word>"]` drops a product from the avoid lists. `mergeConstraintsDetailed` also reports what it `superseded` and what the cap of twelve `capped`; `runTurn` turns both into `constraint-replaced` info warnings.
- **Product families.** `CatalogEntry.family` tags members (`kubernetes`: ACK, ACS, ACK One, ACK Serverless, ACK Dedicated, ACK Edge, ASM, Dify on ACK). `expandAvoid(catalog, ids)` turns a family word ("kubernetes", "k8s", "쿠버네티스") or the family root (`ack`) into every member; `validateOp` and `avoidedProducts(constraints, catalog)` both expand, so a constraint saved by an older version is still checked in full. ECI and SAE are not Kubernetes and stay allowed.
- **Say-line checker.** Negation must bind to the data word ("do not replicate", "복제하지 않", "不要复制", "is disabled", "copy blocked by ..."); adverbs such as "without downtime", "지연 없이", 无损 do not negate. A cross-region phrase without a name ("geo-redundant", "offsite", "another country", 异地) is an error when exactly one region is allowed, even if the clause also names that region. When one region is pinned, a second region-kind group is an error whatever its label says. `test/fixtures/say-recall.json` (832 labelled lines in five sets, tuned on) and `say-recall-fresh.json` (179 lines the fixes never saw; the test asserts floors, not 100%) gate recall and false errors.
- `repairGraph` is idempotent: containment steps run again after a VPC is created, so a zone or subnet group lands in the VPC on the first pass. An attachment with no unique valid host is kept unattached (`attach-invalid`), not deleted.

## Layout gates

`test/layout.test.ts` replays 302 real sessions (`fixtures/replay/sessions.json`: Phase 0 final and baseline; `sessions-phase1.json`: Phase 1 full and held-out runs with the current prompt). Besides the core `unrelatedMoves` rule it applies the strict `bystanderMoves` rule: a moved card the op did not name counts even when it changed slot. Only the frame that switches a solution map to an architecture may move bystanders (budget 10), and a same-slot sibling shifting more than two rows has a budget of 7. A DR VPC that arrives after the shelf stands keeps still. Legibility is gated at 1040x800, 880x720 and 920x620 (the real pane in a 1280x720 window).

## Prompt caching

The prompt is one byte-stable prefix (rules and the full catalog, about 12k tokens) followed by the history and the current diagram. The default is **implicit caching**: no cache marker is sent (`cache: 'none'`). Phase 0 measured a 96% cache hit rate this way, and a single explicit marker on the system block leaves the history uncached, which doubles the cost of a follow-up. Explicit markers remain available as an option in `prompt.ts` (`CacheMode`) but are not used. Pinned constraints go only in the last user message, so they never break the prefix.

## Placement is decided by the catalog

The model proposes products, connections and labels. `catalog.placementOf(entry)` derives each node's container from the entry's `scope` (a container, the VPC boundary for `vpc-edge`, or a band for `account` and `saas`), its column from `lane`, and its order along the request path from `pathRank`. A group the model names is a hint. Products with `attach` are drawn as a badge on a host node; an invalid `attachTo` is repaired into an edge with an `attach-invalid` warning. One example is WAF in cloud-native mode, drawn on the ALB or ESA instead of as a separate hop.

`repairGraph` runs these repairs in order: structural cleanup (unknown products, aliases), group nesting, per-zone replicas merged into one multi-zone node, attachments (badges, `attach-invalid`, Auto Scaling hosts), (c) a VPC group created for VPC resources drawn without one, containment by catalog scope, DNS taken off the data path, (d) edge-tier hops reordered along the request path, (e) orphans with exactly one possible partner connected, then size caps. It is idempotent: running it on its own output changes nothing. `checkGraph` reports what repair cannot fix.
