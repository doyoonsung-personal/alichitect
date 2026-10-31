# Feasibility: live Alibaba Cloud architecture builder

Assessed 2026-10-31. Evidence comes from three places:
- live tests on the project's Model Studio key, using `qwen3.8-max` on the Singapore endpoint;
- six research areas, each researched by one agent and fact-checked by a second agent that tried to refute its load-bearing claims;
- a final gap review across all six areas.

The sourced detail is in [findings/](findings/), and the raw API test output is in [probes/](probes/).

## Phase 0 outcomes (2026-10-31)

Phase 0 built the shared core and ran four spikes and an adversarial review. The reports are [latency](../spikes/latency/REPORT.md), [canvas](../spikes/canvas/REPORT.md), [eval](../eval/REPORT.md) and [review](../spikes/REVIEW.md). Where this section disagrees with the sections below, this section wins.

**Proven**
- **Catalog v0.** 223 entries: 184 products and 39 offerings. Successors cover legacy and retired products, and aliases resolve to current ids (Tongyi Lingma resolves to Qoder, API Gateway to the cloud-native API gateway). The prompt rows are about 7.7k tokens.
- **Protocol core.** Streaming parser, reducer, and a validator with deterministic repair. A fuzz run of 196 hostile ops caused 0 crashes. 135 unit tests pass.
- **Speed.** Measured in one quiet Saturday window. On a warm cache the first token arrives at a p50 of 1.3 s and a p95 of 1.9 s, and the first op at about 2 s. A new diagram streams for 12 s at the median and 24 s at p95.
- **Quality.** The final prompt ran 80 golden cases 3 times each:
  - 95% of runs pass; 89% of cases pass all three runs.
  - On 10 held-out cases it passes 30 of 30 runs, against 19 of 30 for the old prompt.
  - The judge model signs off 92.5% of designs.
- **Memory.** Pinned requirements held in every retention check. The multi-turn failures were conflicts with a new ask, not forgetting.
- **Cost.** About USD 0.007 per turn and USD 0.04 per five-turn session, because 96% of prompt tokens are cache hits.

**Changed decisions**
- **Caching.** Use implicit caching with no explicit marker. One marker on the system block leaves the history uncached, which doubles the cost of a follow-up.
- **Fallback model.** Use qwen3.7-max with thinking off, not qwen3.8-flash. Flash ended 8 of 12 diagram turns without `done`.
- **Watchdog.** Drop the same-model hedge: during a real stall it won 0 of 6 times. Instead:
  - fail over to qwen3.7-max after about 8 s without a first token;
  - allow 10 s of idle time mid-stream;
  - cap a turn at 120 s;
  - run one continuation turn when a stream is cut off.

  Re-measure at a weekday peak. Show a graceful message when the provider's content filter rejects a turn.
- **Keep-warm pings.** Not needed.

**Not proven yet: Phase 1 fixes these first**
1. **Legibility (blocker).** The architecture diagram is a 4.6:1 strip, so beside the chat console its card titles render at 5-7 px. Re-design the layout for an 800-1150 px canvas, add a text-size floor, and gate it with screenshots at those widths.
2. **Stability on real output.** Replaying the 240 eval conversations produced 139 unrelated card moves out of 274. The causes are known: a new top-row node, an implicit VPC frame, and lane blocks pushing down. Make that replay a test gate.
3. **Edge legibility.** Edges bundle into parallel segments, take long detours, and the request path zigzags. Measure that ambiguity, not just card hits.
4. **Constraints as data.** Residency rules live only in the prompt. One run narrated replication to Kuala Lumpur despite "data must stay in Singapore" and still passed. The validator must check pinned constraints.
5. **Validator repairs.**
   - `attachTo` on a product that cannot attach becomes an edge.
   - An orphaned Auto Scaling badge is dropped.
   - A missing VPC group is created.
   - Anti-DDoS moves behind ESA.
6. **Catalog provenance.** Every entry says "verified 2026-10-31". Record evidence per entry, and have a solutions architect review `vpcAttachable` and the generic aliases.

## Verdict

**Feasible, with no hard blockers.** The LLM loop is the most de-risked part: it has been measured working on this key. The work that decides success is editorial and visual, not the model:

1. **An owned, hand-curated product catalog.** The model's own product knowledge is stale, and Alibaba renamed or retired a dozen-plus AI and developer products in 2026 alone.
2. **Layout and edge routing.** The diagram has to stay stable and look premium while it is edited live. Off-the-shelf auto-layout fails this.
3. **Spend and abuse protection, if the page is public.** It spends your own account's balance.

The realistic v1 is narrower than the full vision. It is an independent architecture advisor for the international site, desktop-first, with gated access if public. It should not look like an official Alibaba product. A few features are deferred to later versions (see "Cut from v1").

## Proven live on this key

| Test | Result |
|---|---|
| Model access | `qwen3.8-max` works only on the international endpoint `dashscope-intl.aliyuncs.com` (Singapore); China and US endpoints return 401 |
| Default thinking mode | Unusable for live drawing: more than 5 minutes of silent reasoning and nothing drawn. The model writes the whole diagram in its reasoning first |
| Thinking off (`enable_thinking:false`) | First node at about 2 s; a 21-node, 20-edge diagram streams in over 36 s; 0 malformed lines in every diagram run |
| Thinking budget of 1,024 ("quality mode") | First node at 7.5 s; complete in 40 s |
| `qwen3.8-flash`, thinking off | First node at 1.2 s; complete in 20 s, but a smaller diagram and one dangling edge |
| Live edits | "Run it on Kubernetes" 12 s, "add a data warehouse" 7.5 s, "drop the chatbot" 3 s. Each returned a minimal diff with stable IDs and 0 errors |
| Chat history | Required. Without history, the model forgot "avoid Kubernetes" from three turns earlier and chose ACK instead of SAE. It also restored a removed chatbot without its original RAG link |
| Catalog grounding | Required. Without a catalog the model recommended Tongyi Lingma, DingTalk and an old chatbot product, never Qoder, even with forced web search. With a catalog it picked Qoder in 2.5 s |
| Prompt cache | A 24k-token prompt takes 13.9 s cold and 1.0-2.8 s warm. One warm call stalled for 126 s |
| Browser CORS | Allowed by the endpoint. The key must still stay on a server |
| Tool-calling mode | Impractical for drawing. With thinking on, it reasoned for 225 s, then made only 3 tool calls |

## Cost

Singapore list prices for `qwen3.8-max`: $2 per million input tokens, $6 per million output tokens, $0.17-0.25 per million cached input tokens. The gap review recomputed per-turn costs:

| Item | Cost |
|---|---|
| New diagram, warm cache | about $0.015-0.017 |
| New diagram, cold cache | about $0.04-0.07 |
| Follow-up edit, including chat history | about $0.010-0.012 |
| Five-turn session | about $0.06, so 1,000 sessions cost about $60 |
| Keep-warm pings | about $20-39 a month |

The free quota is 1M tokens per model for 90 days, which is enough for development only. Throughput at Tier 1 is 2M tokens per minute for the whole account, about 75 new diagrams a minute. That is fine for a team or a demo; a public launch needs a quota increase.

## Risks and mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| **Stale product knowledge.** 2026 changes include Lingma becoming Qoder CN (China-only; international users get Qoder), API Gateway (Classic) and the MSE cloud-native gateway ending new sales on 2026-08-23, Lingma SKUs ending new sales on 2026-09-15, and seven "Agentic" renames | High | Hand-curated catalog with aliases, lifecycle status, availability and dated prices. Weekly change detection plus a monthly human review. A named owner |
| **Terms of Use.** alibabacloud.com's terms (updated 2026-09-04) forbid systematically compiling a database from site content and crawling or scraping it (§2.3(b), §2.4(e)). They also protect Alibaba marks "and related icons and logos" (§7.1) | High (legal) | Write catalog facts in our own words, with links to the docs. Take product codes from the Apache-2.0 `aliyun-openapi-meta` repo and the Terraform provider. Automate only low-volume change detection. Get permission or legal sign-off before a commercial launch (easier if you are Alibaba staff or a partner) |
| **Icons.** There is no licensed official icon kit; official icons need prior permission and may not be recolored. Existing sets lack Model Studio, Qwen, PAI, Qoder, ESA, KMS and the agent products | Medium | Our own icon system: category glyphs plus product names, in our own palette (not Alibaba orange). This also gives a more consistent premium look |
| **Diagram correctness.** The model puts managed services inside the VPC and DNS in the data path. Relationships are a weak point for every model in published benchmarks | High | The catalog decides placement: the model picks products and connections, and the renderer picks containers. Per-node attributes such as WAF mode and VPC attachment. A validator plus one repair turn. A golden-prompt evaluation with solution-architect review |
| **Layout instability.** In a test, ELK auto-layout moved every node and flipped the order of 94 of 190 node pairs when one service was added | High (for "impeccable") | Our own catalog-driven lane-grid layout, which moved 0 nodes in the same test. An orthogonal edge router (libavoid-js) in a web worker. This is the main engineering risk, so spike it first |
| **Denial of wallet.** A public page spends your account. Tier-1 limits allow roughly $5k a day, and Model Studio budgets are monthly and stop 2-10 minutes late | Launch blocker if public | Dedicated sub-workspace, a key scoped to two models, and per-model token limits. In the app: per-IP quotas, a bot check, a concurrency cap and a daily spend breaker |
| **Latency tail.** One 126 s stall; cold starts take 14 s; the working endpoint is the legacy shared domain | Medium | Watchdogs whose timeouts depend on cache state, keep-warm pings, `qwen3.8-flash` as fallback with thinking off, and a test of the recommended workspace-dedicated endpoint |
| **Model Studio's knowledge base and agent builder** are closed to new international accounts; only accounts that created Singapore apps before 2025-04-21 can use them | Low (design) | Host the catalog in the app itself |
| **Competition.** Alibaba's CADT AI Assistant is China-site only, a preview capped at 20 messages a day, covers about 15 infrastructure products, takes 30-120 s per diagram and gives no "why". next-ai-draw-io (open source, 36.5k stars), Visual Paradigm and draw.io's Generate already draw Alibaba diagrams from prompts | Strategy | Differentiate on drawing live in about 2 s, explaining every component, a full catalog including AI, developer and SaaS products (Qoder, QwenWork and others), international scope and design quality |
| **AI-disclosure rules.** The EU AI Act Art. 50 has applied since 2026-08-02, and Korea's AI Basic Act since 2026-01-22 | Low effort | A persistent "AI-generated" notice in the UI and in every export, plus a privacy notice (data stored in Singapore) |

## Recommended design

**Backend.** A thin Hono/Node SSE proxy in Singapore (a Function Compute web function or a container) holds a scoped key.
- Every call uses `qwen3.8-max`, `stream:true`, `enable_thinking:false` and `max_completion_tokens` of about 4096, with no tools and no `response_format`.
- It validates each streamed op against the catalog and repairs placement deterministically.
- It forwards typed SSE events and sends a heartbeat every 15 s.
- Watchdogs abort stalled calls, retry, then fall back to `qwen3.8-flash`.

**Protocol.** The model streams NDJSON ops in its message content: one JSON object per line, and each line is applied as soon as it completes. Op types are say, plan, group, node, edge, insert, remove, rec, gap and done. Grammar v2 adds cascade deletes and an insert-into-edge op; on the measured Kubernetes edit, cascade deletes alone would remove 12 of 30 ops. The grammar is in [op-grammar-v2.txt](op-grammar-v2.txt).

**Prompt layout (ordered for caching).** Three parts, each changing more often than the one before:
1. Rules plus the full catalog, about 12k tokens, as one byte-stable prefix with an explicit cache marker.
2. The chat history, appended to and never edited.
3. The pinned requirements, the current graph and the newest message.

**Chat memory.**
- The last ~10 turns are sent in full, with the assistant's turns compacted to its narration plus a change summary.
- Older turns are replaced by a rolling summary written by `qwen3.8-flash`.
- Constraints such as "budget-conscious" or "avoid Kubernetes" go in a pinned requirements list, shown as chips in the console.
- Removed components are kept as tombstones, so "bring it back" restores them exactly.
- Sessions are saved so users can reopen them.

The live test showed all of this is needed. It adds about 1-3k tokens per turn, most of them cached.

**Canvas.**
- Rendering: React 19 with `@xyflow/react` 12.12 (MIT).
- Layout: our own catalog-driven lane grid. Columns are Users, Edge, then Region, which contains the VPC (with its zones) and the managed services, then side bands for ops and security.
- Routing: libavoid-js orthogonal edges, computed in a worker.
- Animation: only what changed.
- Hover: a "why" popover that also opens on keyboard focus and tap (WCAG 1.4.13).
- Accessibility: the product panel doubles as the text alternative.
- Export: SVG and PNG generated from the layout model.

**WAF, your own example.** WAF 3.0 in cloud-native mode attaches to ALB, MSE or Function Compute gateways without DNS changes, and ESA has its own WAF. So "add WAF" should usually draw a shield badge on the ALB or ESA, not a new box in the path. Draw it inline only in CNAME mode.

**Product-need mode.** The same renderer draws a "solution map" with the lanes Team, SaaS, Model service and Cloud resources. Example: "AI agent for my team" leads to Qoder Teams ($40/seat/month) for developers and QwenWork ($30/seat/month) for everyone else. The console asks one question if the audience is unclear. Prices come from the catalog with an as-of date, never from the model.

**Cut from v1:** on-canvas price totals (show the billing model and dated seat prices instead), deployable Terraform or ROS templates, "import into CADT" (no API for it exists), and targeting mainland-China users.

## Decisions needed

**Decided on 2026-10-31**, after Phase 0:
- **Audience:** you and your team, running locally.
- **Affiliation:** the app is affiliated with Alibaba Cloud, so Alibaba branding is allowed and the non-affiliation notice is dropped. Official icons wait on a confirmed source.
- **Languages:** English, Korean and Chinese input, with replies in the user's language.
- **Hosting:** local only.
- **Edge router:** libavoid-js for the local prototype. Its LGPL licence must be settled before anyone outside the team uses the app.

The original questions, kept for the record:

1. **Audience.** Is this for you and your team, for events and demos, or a public website? If public, spend guards and legal review become launch blockers.
2. **Affiliation.** Are you Alibaba Cloud staff or a partner? The answer changes what we can do with icons, branding and catalog ingestion.
3. **Languages.** English only, or Korean (and Chinese) too? Korean costs about 15% more tokens. Product names follow the official navigation for each language: English names in Korean and Japanese, localized names in Chinese.
4. **Hosting.** Alibaba Cloud Function Compute in Singapore, Vercel, or local-only for now?
5. **Edge router.** libavoid-js routes cleanly at today's diagram sizes, but it took 842 ms at 59 routes and is licensed LGPL-2.1-or-later. The in-house channel router is fast and license-clean but draws overlapping trunks. Either take a legal read on shipping LGPL WASM in the bundle, or finish the channel router and make it the default.

## Plan

**Phase 0: spikes to de-risk.**
- A latency and cache test matrix on both endpoints (30+ calls each).
- A lane-grid and edge-router spike with removals, moves and "insert WAF".
- A golden-prompt evaluation harness: 60-80 prompts, multi-turn constraint retention, and Korean and Chinese inputs.
- A live re-test of grammar v2.

**Phase 1: prototype.**
- Catalog v1: about 60 diagram products and 20 offerings.
- Backend proxy.
- The landing-to-console transition, the live canvas, the product panel, hover explanations and chat memory.

**Phase 2: quality beta.**
- The full catalog: about 180 products and 40 offerings.
- Evaluation-driven tuning.
- Exports, share links, undo and versions.
- Guardrails and the catalog refresh pipeline.

The gap review estimates 6-10 weeks for 1-2 engineers, a designer and a part-time catalog owner.

## Files

- [findings/1-model-studio.md](findings/1-model-studio.md): endpoints, thinking parameters, limits, pricing, rate limits, terms
- [findings/2-streaming-protocol.md](findings/2-streaming-protocol.md): protocol comparison, grounding, editing, hosting
- [findings/3-rendering-stack.md](findings/3-rendering-stack.md): renderer and layout benchmarks, ELK vs lane grid, animation
- [findings/4-catalog-sourcing.md](findings/4-catalog-sourcing.md): sources, renames, regions, terms of use, maintenance pipeline
- [findings/5-ai-dev-products.md](findings/5-ai-dev-products.md): Qoder, QwenWork, AgentCore, Coding Plan and Token Plan, need-to-product mapping
- [findings/6-assets-prior-art.md](findings/6-assets-prior-art.md): icons and licensing, CADT, competitors, brand rules
- [findings/7-gap-review.md](findings/7-gap-review.md): costs, abuse, evaluation, i18n, accessibility, hosting, legal
- [seed-catalog.txt](seed-catalog.txt), [offerings-need-map.txt](offerings-need-map.txt), [op-grammar-v2.txt](op-grammar-v2.txt), [model-studio-config.txt](model-studio-config.txt), [icons-and-prior-art.txt](icons-and-prior-art.txt), [rendering-libs.txt](rendering-libs.txt): build inputs
- [probes/](probes/): the live API test harness (`node probes/probe.mjs` reads `DASHSCOPE_API_KEY`) and its results
