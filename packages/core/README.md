# @ali/core

Shared code for the live architecture builder: the product catalog, the diagram graph, the streamed op grammar, the validator and the layout. It has no runtime dependencies. Node 24 runs the `.ts` files directly (type stripping), and Vite imports them as they are.

## Conventions

- Erasable TypeScript only: no `enum`, no `namespace`, no constructor parameter properties. Use `import type` for types, and include the `.ts` extension in relative imports.
- Pure functions over shared state. Every function that changes the graph returns a new graph.
- `src/types.ts` is the contract between modules. Change it only additively, and say so in the change description.
- Tests live in `test/` and run with `node --test` (or `npm test`). On Node 24, `node --test test/` fails: the directory is resolved as a module.

## Modules

| File | Owner | Purpose |
|---|---|---|
| `src/types.ts` | contract | Catalog entry, graph, op grammar v2, warnings, chat memory |
| `catalog/products.json`, `catalog/offerings.json` | catalog | `{ "version": "YYYY-MM-DD", "entries": CatalogEntry[] }`; one id namespace across both files |
| `src/catalog.ts` | catalog | `createCatalog(products, offerings): Catalog`: indexing, alias and successor resolution, compact prompt rows. No `fs`, so the browser can use it |
| `src/catalog-node.ts` | catalog | `loadCatalog(): Catalog` reads the JSON files from disk (Node only) |
| `src/ndjson.ts` | protocol | Incremental line parser for streamed content deltas; exposes the partial `say` text for live typing |
| `src/reducer.ts` | protocol | `emptyGraph()`, `applyOp()`: upsert, cascade delete, insert into an edge, move, a pending-edge buffer, tombstones |
| `src/validate.ts` | protocol | Op schema checks, alias and lifecycle resolution, semantic checks, deterministic placement repair |
| `src/prompt.ts` | eval | System prompt (rules + catalog rows; implicit prefix caching by default, explicit markers optional), history window, pinned requirements, CURRENT DIAGRAM serializer |
| `src/llm.ts` | eval | Streaming Chat Completions client and turn runner with watchdogs; emits say, op, warn, usage and done events |
| `src/layout.ts` | canvas | Catalog-driven lane-grid layout with sticky slots (pure; no DOM) |

## Placement is decided by the catalog

The model proposes products, connections and labels. The renderer derives each node's container from the entry's `scope`, its column from `lane`, and its order along the request path from `pathRank`. A group the model names is a hint. Products with `attach` are drawn as a badge or attachment on a host node. One example is WAF in cloud-native mode, drawn on the ALB or ESA instead of as a separate hop.
