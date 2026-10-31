# Frontend rendering stack for a live, animated, auto-laid-out nested architecture diagram

Researched 2026-10-31 by one agent, then fact-checked by an independent agent that tried to refute each load-bearing claim. 18 findings; fact-check verdicts: 2 confirmed, 7 partially-true. Findings without a verdict were high-confidence and not load-bearing, so they were not re-checked.

## Summary

This is buildable with MIT tools, but not with off-the-shelf auto-layout. The recommended stack is React 19 with @xyflow/react 12.12.x as the renderer. React Flow brings HTML nodes, nested sub-flows, built-in keyboard accessibility, NodeToolbar popovers and fitView. On top of it goes our own catalog-driven 'semantic lane grid' for placement, a separate orthogonal edge router (libavoid-js running in a Web Worker, after a spike), and a small transition engine. I measured elkjs 0.12.1 (ELK Layered with INCLUDE_CHILDREN) on a 25-leaf nested Alibaba-style graph. Adding Function Compute moved all 20 leaves and flipped the order of 94 of 190 leaf pairs; even after removing one global shift, 14 leaves still moved about 209 px. No ELK option set fixed this without damaging the layout: semi-interactive mode was best at 7 flips, and the fully interactive strategies produced 178-220 bends and 55-75 crossings. ELK also has no concept of tiers or swimlanes; its maintainer says INCLUDE_CHILDREN only considers the hierarchy for edge crossings, not for placing nodes. Its output did not look like a cloud diagram either: Zone B sat left of Zone A, the security group sat above the edge services, and the region stretched to a 3.2:1 aspect ratio. The hand-rolled lane grid moved 0 nodes when Function Compute or the AI bot was added, and adding WAF caused only one uniform shift. It runs in 0.03 ms and follows the nested-stack approach of AWS's own diagram-as-code tool. Its simple edge routing, however, ran 3-8 edges through nodes, so routing quality is the main engineering risk. In headless Chrome on this laptop's GPU, React Flow animated 70 nodes and 72 edges at the frame cap once moving nodes had will-change set and light shadows. Heavy shadows dropped it to about 46 fps, and a 4x CPU slowdown to about 20 fps. The rule is therefore to animate only nodes that actually move. Weaker fits: tldraw needs a production license key, Excalidraw, Mermaid architecture-beta and Graphviz-wasm redraw the whole diagram on every change, D2/TALA is now MPL-2.0 but ships an 11.5 MB browser build and its layout is random, and Cytoscape renders to canvas and its SVG export plugin is GPL. GoJS, JointJS+ and yFiles are viable paid fallbacks, and yFiles is the only engine with built-in incremental, swimlane and group layout. Nothing found is a hard blocker.

## Findings

### F1 (high confidence, load-bearing)

@xyflow/react 12.12.0 (MIT, released 2026-09-24; ~19.5M weekly npm downloads; 14 releases in the last 12 months; ~60 KB gzip per bundlephobia) already handles the canvas mechanics. It supports custom HTML nodes and nested sub-flows via parentId with parent-relative positions; parents must come before children in the nodes array. It draws edges between nodes in different sub-flows (since 12.8.0 these render above nodes inside sub-flows). Nodes and edges are keyboard-focusable by default (Tab, then Enter/Space), with ariaRole, ariaLabelConfig and an aria-live region (12.7.0). NodeToolbar 'doesn't scale with the viewport'. Since 12.5.0, fitView works right after nodes are added and accepts per-side px/% padding. It ships no layout engine and no obstacle-avoiding router. My benchmark bundle (react 19.3.1, react-dom, @xyflow/react and the test app) was 400 KB minified, 129 KB gzip.

**Implication:** Use React Flow 12.12.x as the renderer: HTML/CSS nodes give the most design control for an 'impeccable' look. Layout, routing and animation are ours to build. Use fixed card sizes so layout never waits for DOM measuring.

**Fact-check:** confirmed

Fact-check sources: https://registry.npmjs.org/@xyflow/react (curl 2026-10-31): latest 12.12.0 published 2026-09-24T12:41Z, MIT. The 'next' tag is 13.0.0-next.0 (2026-10-11). After 2025-10-31 there were 12 stable releases plus 1 prerelease; the count is 14 if 12.9.2 (2025-10-30) is included.; https://api.npmjs.org/downloads/point/last-week/@xyflow/react: 19,515,074 downloads (2026-10-23 to 10-29).; https://bundlephobia.com/api/size?package=@xyflow/react@12.12.0: 187,756 B minified, 59,945 B gzip.; https://reactflow.dev/learn/layouting/sub-flows (updated 2026-10-11): the child is positioned relative to its parent; parent nodes must appear before their children in the nodes array; 'edges connected to a node with a parent are rendered above nodes'.; Installed @xyflow/system 0.0.83 source warns 'Parent node ... not found. Please make sure that parent nodes are in front of their child nodes' and skips positioning that child.; https://raw.githubusercontent.com/xyflow/xyflow/main/packages/react/CHANGELOG.md: 12.8.0 #5361 'Render edges above nodes when they are within a subflow'; 12.7.0 added ariaRole (#5299) and ariaLabelConfig (#5277); 12.5.0 #5067 added per-side px/% fitView padding and fixed fitView right after adding nodes; 12.10.0 added zIndexMode.; https://reactflow.dev/learn/advanced-use/accessibility: 'By default, all nodes and edges are keyboard-focusable and operable'; Tab, then Enter/Space; A11yDescriptions has aria-live='assertive'. Nit: the aria-live region predates 12.7.0; only ariaRole and ariaLabelConfig are new in 12.7.0.; https://reactflow.dev/api-reference/components/node-toolbar: 'This toolbar doesn't scale with the viewport so that the content is always visible.'; https://reactflow.dev/learn/layouting/layouting: 'We have not implemented our own layouting solution yet'. https://reactflow.dev/examples/edges/edge-routing: obstacle-avoiding routing exists only as a Pro example built on libavoid.; Local check: scripts/rfbench/bundle.js is 409,919 B; gzip -c gives 129,757 B; installed react and react-dom are 19.3.1.

Sources: https://registry.npmjs.org/@xyflow/react (queried 2026-10-31); https://reactflow.dev/learn/layouting/sub-flows (prior run 2026-10-30); https://reactflow.dev/learn/advanced-use/accessibility (prior run 2026-10-30); https://reactflow.dev/whats-new (prior run 2026-10-30); https://reactflow.dev/api-reference/components/node-toolbar (opened 2026-10-31); https://bundlephobia.com/api/size?package=@xyflow/react (prior run 2026-10-30)

### F2 (high confidence)

React Flow 13 and Svelte Flow 2 are in draft PR xyflow#5866, opened 2026-07-08 and still a draft with commits on 2026-10-26; the npm 'next' tag is 13.0.0-next.0. Breaking changes include NodeChangeset/EdgeChangeset classes for onNodesChange, useStore renamed to useReactFlowStore, the colorMode prop dropped in favour of CSS-only theming, library CSS moved to an 'xyflow' cascade layer, and a minimum of Zustand 5. Reviewers have flagged re-render regressions.

**Implication:** Pin 12.12.x. Keep React Flow-specific code (store access, change handlers, theming) behind a thin adapter so the v13 migration stays small.

Sources: https://github.com/xyflow/xyflow/pull/5866 (opened 2026-10-31); https://registry.npmjs.org/@xyflow/react (dist-tags, 2026-10-31)

### F3 (high confidence)

React Flow is MIT-licensed, but its docs say: 'Only remove this attribution, if you are subscribed to React Flow Pro.' Pro costs $169/month (Starter) or $289/month (Professional). The Pro-only examples include libavoid edge routing and a node-position-animation hook (d3-timer with linear interpolation).

**Implication:** Either budget $169/month or keep the small attribution. Pro is not technically required.

Sources: https://reactflow.dev/learn/troubleshooting/remove-attribution (opened 2026-10-31); https://reactflow.dev/examples/edges/edge-routing (prior run 2026-10-30); https://reactflow.dev/examples/nodes/node-position-animation (prior run 2026-10-30); https://reactflow.dev/examples/pro-examples (prior run 2026-10-30)

### F4 (high confidence, load-bearing)

ELK Layered does not support semantic tiers or stable updates. The elkjs maintainer wrote 'INCLUDE_CHILDREN only considers the whole hierarchy for edge crossings but not for the placement of nodes' and 'ELK layered does not support this, since it does not support swimlanes' (elkjs#327, March 2025). Asked whether placement can stay stable when nodes are added, the maintainer answered 'In general, no.' (elkjs#122). considerModelOrder plus forceNodeModelOrder only keeps relative order when the input order is already right, and coordinates still change (elkjs#187). layerChoiceConstraint and positionChoiceConstraint are only evaluated by InteractiveLayeredGraphVisitor, not in normal runs. React Flow's own docs: 'We don't often recommend elkjs because it's complexity makes it difficult for us to support folks'.

**Implication:** Do not rely on ELK for the overall picture. Tiers and lanes have to be imposed by our own layout code.

**Fact-check:** partially-true. All quotes are accurate, but the headline overreaches. ELK Layered does support ordered tiers along the flow direction: with elk.partitioning.partition, 'Nodes with lower partition IDs will appear to the left of nodes with higher partition IDs' (also layerConstraint FIRST/LAST, model order, semi-interactive and interactive strategies). What it lacks is swimlanes, meaning tiers aligned across nested containers (INCLUDE_CHILDREN uses the whole hierarchy only for crossings), plus any guarantee of stability, since model order and the interactive modes are best-effort. The elkjs#122 'In general, no.' is from Feb 2021. No ELK release since (0.11.0 added group model order; 0.12.0 nothing relevant) adds swimlanes or stable incremental layout.

Fact-check sources: https://github.com/kieler/elkjs/issues/327: soerendomroes, 2025-03-03: 'ELK layered does not support this, since it does not support swimlanes.' On 2025-03-04: INCLUDE_CHILDREN 'only considers the whole hierarchy for edge crossings' but not node placement. Closed 2025-08-21 with no fix or linked PR.; https://github.com/kieler/elkjs/issues/122: uruuru, 2021-02-11, answer begins 'In general, no.' Suggested workarounds were noLayout, the fixed algorithm and interactive strategies.; https://github.com/kieler/elkjs/issues/187: soerendomroes, 2022-09-15: order holds 'given that the input model is ordered correctly'; 'Either way specific node positions will change.'; https://eclipse.dev/elk/reference/options/org-eclipse-elk-layered-layering-layerChoiceConstraint.html and ...crossingMinimization-positionChoiceConstraint.html: both 'only evaluated as part of the InteractiveLayeredGraphVisitor, which must be applied manually'. That is not reachable through the elkjs JSON API.; https://eclipse.dev/elk/reference/options/org-eclipse-elk-partitioning-partition.html: partition IDs order nodes along the layout direction, so ordered tiers within a graph level are supported.; https://eclipse.dev/elk/downloads/releasenotes/release-0.11.0.html ('Add group model order strategies') and release-0.12.0.html (only a second-node-placer option): no swimlane or stability features.; https://reactflow.dev/learn/layouting/layouting: quote confirmed verbatim, including the typo 'it's complexity'.; https://registry.npmjs.org/elkjs: 0.12.1 is latest (2026-10-28). 0.13.0 was published the same day and is deprecated.

Sources: https://github.com/kieler/elkjs/issues/327 (opened 2026-10-31); https://github.com/kieler/elkjs/issues/122 (opened 2026-10-31); https://github.com/kieler/elkjs/issues/187 (prior run 2026-10-30); https://eclipse.dev/elk/reference/options/org-eclipse-elk-layered-layering-layerChoiceConstraint.html (prior run 2026-10-30); https://eclipse.dev/elk/reference/options/org-eclipse-elk-layered-crossingMinimization-positionChoiceConstraint.html (prior run 2026-10-30); https://reactflow.dev/learn/layouting/layouting (opened 2026-10-31)

### F5 (high confidence, load-bearing)

Own measurement with elkjs 0.12.1 in Node 24. The graph had 25 leaves in 8 nested groups (users, edge, region > VPC > zones > vSwitches, managed services, security band) and was edited in three steps: +WAF, +Function Compute, +AI bot. Base options: layered, RIGHT, INCLUDE_CHILDREN, ORTHOGONAL, edgeCoords ROOT. Results per configuration:
- Default: +WAF was a clean shift (0 order flips). +FC moved all 20 leaves (mean 322 px), flipped 94 of 190 leaf pairs, and left 14 leaves moving ~209 px even after removing the best global translation.
- Model order: +FC 67 flips; +AI bot 49 flips.
- Partitioning: +FC 10 flips, residual 128 px.
- Semi-interactive with elk.position seeded from the previous run (the best): +FC 7 flips (7 leaves, mean 61 px); +AI bot 17 flips.
- All INTERACTIVE strategies: few flips, but 178-220 bends and 55-75 crossings, versus 42-64 and 7-9 for the default.
- Combined (partition + model order + semi-interactive): 21 flips (+WAF) and 73 flips (+FC).
ELK routed every edge without passing through a node. On the 25-leaf graph, main-thread time was a median of 44-47 ms (p90 48-62 ms). The prior run measured 87 ms for 19 leaves and 182 ms for 57 leaves. Visually, the default output put Zone B left of Zone A, placed the security group above the edge group, and stretched OSS→FC→SLS→CMS so the drawing reached 2857x890 px.

**Implication:** Edits that look small (one managed service) reshuffle the whole ELK picture, which breaks the 'adding WAF must not reshuffle' requirement. Semi-interactive mode is the least-bad ELK option, but it is not stable.

**Fact-check:** partially-true. Every layout metric reproduces exactly; ELK output is deterministic and the step-4 SVGs are byte-identical. Corrections: (1) the graph has 19→20→21→23 leaves in 8 groups, not 25. (2) 'mean' figures average over all compared leaves. On +FC the residual mean of 209 px covers all 20 leaves (the 14 moving leaves average about 300 px). Semi-interactive '7 leaves, mean 61 px' is 61 px over 20 leaves: the 7 moved leaves average about 174 px, max 436 px, and its +AI bot step doubled crossings from 9 to 17. (3) The INTERACTIVE run's 'few flips' comes from an unseeded first layout with all nodes at 0,0. Seeded from the default first layout, it gave 57/171 flips and a 626 px mean move on +WAF, with 168-202 bends and 46-77 crossings. That is worse than reported. (4) Timing is noisier: default-config median 46-69 ms, p90 64-102 ms over 4 runs; the combined config is 92-139 ms median, p90 up to 346 ms. 'ELK routed every edge without passing through a node' is true for leaf cards only; edges do cross unrelated containers.

Fact-check sources: Re-ran the researcher's scripts/layout_compare.js with elkjs 0.12.1 on Node 24.21.0. Output is in C:/Users/mendo/AppData/Local/Temp/claude/C--Users-mendo-ali-catalog/35292bdb-ca0c-4df0-80b4-dd0f93723039/scratchpad/fc_rf_verify/layout_compare_rerun.txt. A_default +WAF: flips 0/171. +FC: moved 20/20, mean 322 px, residual 14 leaves / 209 px, flips 94/190. B +FC: 67 flips; +AI bot: 49. E +FC: 10 flips, residual 128 px. C +FC: 7 moved, 61 px, 7 flips; +AI bot: 17 flips. F: bends 178/182/220, crossings 55/58/75. G: 21 and 73 flips. Size 2857x890.; Regenerated A_default_step4.svg: zoneB x=961 is left of zoneA x=1339; the sec group is at y=12, above the edge group at y=649.6; oss/fc/sls/cms sit at x=2083/2271/2469/2657. Diff against the researcher's layout_out SVG shows no change.; Own fair-seed test, C:/Users/mendo/AppData/Local/Temp/claude/C--Users-mendo-ali-catalog/35292bdb-ca0c-4df0-80b4-dd0f93723039/scratchpad/fc_rf_verify/interactive_fair.js: the unseeded interactive step 1 already has 176 bends and 67 crossings, versus 42 and 7 for the default. Seeded from the default layout, interactive +WAF gives 57 flips and a 626 px mean move.; Timing over 4 runs: A_default median 46.4/69.1/48.3/50.0 ms, p90 64.1/102.2/65.4/77.7 ms. G_combo median 139.3/94.4/94.1/92.7 ms, p90 346.2/123.7/124.9/99.4 ms.; The prior run's log (salvage/rendering-stack.md lines 1784-1785) confirms 'median=87.4ms' for 19 leaves and 'median=181.7ms' for 57 leaves.

Sources: C:/Users/mendo/AppData/Local/Temp/claude/C--Users-mendo-ali-catalog/35292bdb-ca0c-4df0-80b4-dd0f93723039/scratchpad/scripts/layout_compare.js (run 2026-10-31); C:/Users/mendo/AppData/Local/Temp/claude/C--Users-mendo-ali-catalog/35292bdb-ca0c-4df0-80b4-dd0f93723039/scratchpad/layout_png/A_default_step4.png; C:/Users/mendo/AppData/Local/Temp/claude/C--Users-mendo-ali-catalog/35292bdb-ca0c-4df0-80b4-dd0f93723039/scratchpad/layout_png/F_interactiveAll_step4.png; C:/Users/mendo/AppData/Local/Temp/claude/C--Users-mendo-ali-catalog/35292bdb-ca0c-4df0-80b4-dd0f93723039/scratchpad/scripts/elk_stability.js (prior run 2026-10-30)

### F6 (high confidence, load-bearing)

Own measurement of a hand-rolled semantic lane grid on the same graph. Each container lays children out in catalog-defined lanes, stacked in insertion order. Adding FC or the AI bot moved 0 nodes and 0 pairs flipped. Adding WAF was one uniform shift of the region (0 flips; only 3 leaves moved relative to that shift, mean 35 px). Final size was 2240x868 px versus ELK's 2857x890, and layout took 0.025 ms. With a naive elbow router, though, 3-8 edges passed through nodes and there were 19-23 crossings (ELK: 0 and 7-9).

**Implication:** Yes, a lane grid looks better and is far more stable for cloud diagrams, because placement follows deployment scope and request flow rather than edge structure. It also lets the catalog fix the LLM placement errors seen in the live probes. The cost is that it needs a real orthogonal router plus edge aggregation.

**Fact-check:** partially-true. The lane-grid numbers reproduce exactly: +FC and +AI bot move 0/20 and 0/21 leaves with 0 flips; final size is 2240x868; crossings are 19/19/23. Corrections: (1) '3-8 edges passed through nodes' counts edge/node intersections. The number of distinct edges through a node is 2, 4 and 4 (rdsPrimary→rdsStandby, ecsA2→nat, oss→fc, fc→sls). (2) For +WAF, the 3 'residual' leaves (users, dns, esa) did not move at all, while the other 16 leaves shifted a uniform 224 px; 35 px is that residual averaged over all 19 leaves. (3) Layout time was 0.037-0.050 ms in my runs; either way it is negligible. Caveat: zero movement is by construction (a hand-tuned lane table, with edits appended at lane ends). No removal, replacement or middle insertion was tested.

Fact-check sources: C:/Users/mendo/AppData/Local/Temp/claude/C--Users-mendo-ali-catalog/35292bdb-ca0c-4df0-80b4-dd0f93723039/scratchpad/fc_rf_verify/layout_compare_rerun.txt, H_laneGrid: sizes 2016x772 → 2240x772 → 2240x772 → 2240x868. +WAF: moved 16/19, resid 3/35 px, flips 0. +FC and +AI bot: moved 0, flips 0. throughNode 3/8/8, crossings 19/19/23. ELK default: throughNode 0, crossings 7/7/9.; Own script C:/Users/mendo/AppData/Local/Temp/claude/C--Users-mendo-ali-catalog/35292bdb-ca0c-4df0-80b4-dd0f93723039/scratchpad/fc_rf_verify/lane_edges_through.js: distinct edges through a node 2/4/4; intersections 3/8/8.; Lane-grid timing over 4 runs: median 0.050/0.046/0.042/0.037 ms.; Regenerated H_laneGrid_step4.svg is byte-identical to the researcher's. The PNG (layout_png/H_laneGrid_step4.png) shows the managed-service column with oss→fc and fc→sls running through sls, cms and kms.

Sources: C:/Users/mendo/AppData/Local/Temp/claude/C--Users-mendo-ali-catalog/35292bdb-ca0c-4df0-80b4-dd0f93723039/scratchpad/scripts/layout_compare.js (run 2026-10-31); C:/Users/mendo/AppData/Local/Temp/claude/C--Users-mendo-ali-catalog/35292bdb-ca0c-4df0-80b4-dd0f93723039/scratchpad/layout_png/H_laneGrid_step4.png

### F7 (high confidence)

AWS's own awslabs/diagram-as-code (Apache-2.0, ~1.6k stars) lays out AWS architecture diagrams with nested horizontal/vertical stacks (Direction, Align, Children order), not a graph-layout algorithm. On top of the stacks it adds BorderChildren (gateways placed on the N/S/E/W edge of a VPC) and UnorderedChildren, which reorders children at several levels using the lowest common ancestor of each link to reduce link overlaps. It also spreads links that leave the same position (GroupingOffset: (index-(count-1)/2)*10 px).

**Implication:** A proven precedent for the lane/stack approach. Copy its border children, child reordering and link-offset features.

Sources: https://github.com/awslabs/diagram-as-code (prior run 2026-10-30); https://raw.githubusercontent.com/awslabs/diagram-as-code/main/doc/advanced/unordered-children.md (opened 2026-10-31); https://raw.githubusercontent.com/awslabs/diagram-as-code/main/doc/advanced/border-children.md (opened 2026-10-31); https://raw.githubusercontent.com/awslabs/diagram-as-code/main/doc/advanced/link-grouping.md (opened 2026-10-31)

### F8 (medium confidence, load-bearing)

Options for routing edges around nodes whose positions are fixed:
- elkjs offers no standalone router. Its algorithms are fixed, box, random, layered, stress, mrtree, radial, force, disco, sporeOverlap, sporeCompaction and rectpacking; ELK added libavoid only on the Java side in 0.9.0 (elk#315).
- libavoid-js 0.5.0-beta.5 (2026-02-23, LGPL-2.1-or-later, 17 KB JS + 492 KB WASM ≈182 KB gzip, 46 GitHub stars) exposes OrthogonalRouting, shapeBufferDistance, idealNudgingDistance, crossing and segment penalties, and incremental moveShape + processTransaction. It runs in browsers and Node, and the React Flow Pro edge-routing example uses it.
- @tisoap/react-flow-smart-edge 5.0.0 (MIT, 2026-08-16, ~125k weekly downloads) does grid A*/jump-point routing in a Web Worker, is subflow-aware and draws hops at crossings. It does not document coordinated nudging of parallel segments.
- AntV X6 has a manhattan router (A* on a step grid that falls back to orth).
- GoJS's AvoidsNodes is 'distinctly slower than normal Orthogonal routing'.

**Implication:** Spike libavoid-js in a worker before committing; its beta status and small community are a maintenance risk. Keep a fallback: our own gutter/channel router (lanes create natural channels) or react-flow-smart-edge. Load the WASM as a separate file to stay LGPL-clean.

**Fact-check:** partially-true. The qualitative claims hold. The libavoid-js size is misstated: dist/index.js is 44,017 B raw and 17,285 B gzip; libavoid.wasm is 492,029 B raw and 180,508 B gzip (148,127 B brotli). That totals about 198 KB gzip, not about 182 KB. Incremental moves are exposed as moveShape_poly/moveShape_delta plus processTransaction. Not mentioned by the researcher: the typed API exposes no ClusterRef (only a clusterCrossingPenalty parameter), so nested containers cannot be modelled natively. npm's 'latest' tag points to the beta; the last non-beta is 0.4.5 (2025-04-29). The X6 docs do not say A*, but the shipped source is an A* search (openSet, maxLoopCount 2000, step 10) with an orth fallback.

Fact-check sources: Ran scripts/elk_options_probe.js against elkjs 0.12.1: fixed, box, random, layered, stress, mrtree, radial, force, disco, sporeOverlap, sporeCompaction, rectpacking. elk.bundled.js contains no 'libavoid' string.; https://eclipse.dev/elk/downloads/releasenotes/release-0.9.0.html: 'Added libavoid for standalone edge routing.' https://github.com/eclipse-elk/elk/issues/315 was closed 2023-12-15; only a user comment there points to 0.9.0. https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-alg-libavoid.html: 'Only route the edges without touching the node's positions.'; https://registry.npmjs.org/libavoid-js: 0.5.0-beta.5 published 2026-02-23T16:45Z, LGPL-2.1-or-later, one maintainer (aksem), dist-tag latest = 0.5.0-beta.5, 35,616 downloads/week.; https://unpkg.com/libavoid-js@0.5.0-beta.5/?meta and dist/index.d.ts: OrthogonalRouting, shapeBufferDistance, idealNudgingDistance, segmentPenalty, crossingPenalty, moveShape_poly/moveShape_delta, processTransaction; no ClusterRef.; https://github.com/Aksem/libavoid-js: LGPL-2.1, 46 stars, 'works in both webbrowser and node.js environments'. https://reactflow.dev/examples/edges/edge-routing: Pro example under the xyflow Pro License, dependencies @xyflow/react and libavoid.; https://registry.npmjs.org/@tisoap/react-flow-smart-edge: 5.0.0, 2026-08-16, MIT, 125,323 downloads/week. https://github.com/tisoap/react-flow-smart-edge: 'Grid-based A* / jump-point pathfinding', Web Worker by default, 'Subflow aware', hops; nudging not mentioned.; https://x6.antv.antgroup.com/en/api/registry/router: manhattan avoids obstacles, step option, fallbackRouter orth. https://unpkg.com/@antv/x6@3.1.8/lib/registry/router/manhattan/router.js: openSet/A* loop.; https://gojs.net/latest/learn/links: 'the use of AvoidsNodes routing is distinctly slower than normal Orthogonal routing, especially for large diagrams'.

Sources: C:/Users/mendo/AppData/Local/Temp/claude/C--Users-mendo-ali-catalog/35292bdb-ca0c-4df0-80b4-dd0f93723039/scratchpad/scripts/elk_options_probe.js (knownLayoutAlgorithms, run 2026-10-31); https://github.com/eclipse-elk/elk/issues/315 (opened 2026-10-31); https://github.com/Aksem/libavoid-js (opened 2026-10-31); https://unpkg.com/libavoid-js@0.5.0-beta.5/dist/index.d.ts (opened 2026-10-31); https://github.com/tisoap/react-flow-smart-edge (opened 2026-10-31); https://x6.antv.antgroup.com/en/api/registry/router (opened 2026-10-31); https://gojs.net/latest/intro/links.html (opened 2026-10-31)

### F9 (medium confidence, load-bearing)

Own benchmark: headless Chrome 155.0.8059.85 using the GPU (Intel Arc 140V via ANGLE/D3D11), 10 nested groups, 60 styled HTML cards and 72 edges, every node animated for 4 s; the headless frame cap is 56.3 fps.
- Heavy two-layer box-shadow cards: full per-frame setNodes ran at 45-52 fps (p95 ~36 ms); updating only the 7 nodes of one group ran at 55 fps; writing straight to the DOM ran at 51 fps.
- With will-change:transform and a light shadow, all three modes hit 56.3 fps with 0 frames over 20 ms.
- With 4x CPU throttling: full updates 20-22 fps, one group 38-40 fps, direct DOM 30-33 fps.
- The CSS d property is 'Limited availability' and not Baseline, so edge-path transitions cannot rely on CSS.

**Implication:** 60 fps is reachable. Animate only the nodes and containers that change (a stable layout keeps this set small); with parentId nesting, moving a container moves its whole subtree in one update. Promote moving nodes with will-change, keep shadows static and light, keep tweens to 250-350 ms, and redraw or recompute edges in JS rather than with CSS.

**Fact-check:** partially-true. The setup is confirmed: headless Chrome 155.0.8059.85 on ANGLE (Intel Arc 140V, D3D11), a 56.2-56.3 fps idle cap, 70 nodes and 72 edges, and a 400 KB bundle. The light-shadow plus will-change result is confirmed: 56.0-56.2 fps with 0 frames over 20 ms in all modes at 1x. The heavy-shadow and throttled numbers did not reproduce. In 2 reruns at 1x with heavy shadows: full setNodes 37.9-39.3 fps (routed edges 44.9), one group 54.0-54.8, direct DOM 41.2-43.2, p95 about 36 ms. Under 4x throttling with heavy shadows: full 36.1-36.2 (routed 41.6), one group 55.3-55.8, direct 41.6-41.7. With light shadows at 4x: full 41.4, one group 56.1, direct 55.7. The researcher's 4x figures (20-22 / 38-40 / 30-33 fps) are not reproducible. Heavy-shadow cost looks GPU/raster-bound, because 4x CPU throttling barely changed it. The CSS d point is confirmed: Safari parses d but it has no effect.

Fact-check sources: Re-ran copies of scripts/rfbench/app.jsx and run.js (unchanged). Output: C:/Users/mendo/AppData/Local/Temp/claude/C--Users-mendo-ali-catalog/35292bdb-ca0c-4df0-80b4-dd0f93723039/scratchpad/fc_rf_verify/rfbench/bench_lite0.txt, bench_lite0_run2.txt and bench_lite1.txt.; Own probe C:/Users/mendo/AppData/Local/Temp/claude/C--Users-mendo-ali-catalog/35292bdb-ca0c-4df0-80b4-dd0f93723039/scratchpad/fc_rf_verify/gpu_probe.js: Chrome/155.0.8059.85, renderer 'ANGLE (Intel, Intel(R) Arc(TM) 140V GPU (8GB) ... Direct3D11 ...)', HeadlessChrome UA.; https://developer.mozilla.org/en-US/docs/Web/CSS/d (modified 2026-07-26): 'Limited availability'; 'not Baseline because it does not work in some of the most widely-used browsers'.; @mdn/browser-compat-data 8.1.7 (unpkg data.json), css.properties.d: Chrome 52, Firefox 97, Safari/iOS version_added=false, note 'The property parses, but has no effect.'

Sources: C:/Users/mendo/AppData/Local/Temp/claude/C--Users-mendo-ali-catalog/35292bdb-ca0c-4df0-80b4-dd0f93723039/scratchpad/scripts/rfbench/app.jsx (run 2026-10-31); C:/Users/mendo/AppData/Local/Temp/claude/C--Users-mendo-ali-catalog/35292bdb-ca0c-4df0-80b4-dd0f93723039/scratchpad/scripts/rfbench/run.js (run 2026-10-31); https://developer.mozilla.org/en-US/docs/Web/CSS/d (opened 2026-10-31); https://reactflow.dev/learn/advanced-use/performance (prior run 2026-10-30)

### F10 (high confidence)

dagre (@dagrejs/dagre 3.1.3, MIT, ~16 KB gzip) has an open issue that stops it laying out sub-flows correctly when nodes inside a sub-flow connect to nodes outside it (dagre#238, per React Flow docs). It also does no edge routing.

**Implication:** Rule out dagre for nested containers with edges that cross container boundaries.

Sources: https://reactflow.dev/learn/layouting/layouting (opened 2026-10-31); https://registry.npmjs.org/@dagrejs/dagre (queried 2026-10-31)

### F11 (high confidence)

Text-to-diagram engines redraw the whole diagram and are a poor fit for a live, incrementally animated canvas.
- Mermaid 12.2.0 architecture-beta uses fcose; its syntax may still change incompatibly; sibling overlap is 'a known limitation tracked in #6120'; layout needs a seed to be deterministic (v11.15+).
- D2 v0.9.0 (2026-09-07) open-sourced TALA under MPL-2.0 and bundled it into d2.js; Terrastruct is winding down and D2 moves to a nonprofit. The d2.js 0.1.34 browser build is an 11.5 MB index.js. TALA 'has randomness. A small change to a label can cascade into an entirely different layout.'
- Graphviz (@hpcc-js/wasm-graphviz 1.30.0, Apache-2.0, ~635 KB gzip): splines=ortho 'does not handle ports or, in dot, edge labels'.
- Excalidraw 0.18.1 has no layout engine. mermaid-to-excalidraw 3.1.0 converts only flowchart, sequence, class, ER and state diagrams to native elements; other types become images. Excalidraw's own text-to-diagram re-renders the whole partial Mermaid every 300 ms, or every 3 s if a render takes over 100 ms.

**Implication:** Use these at most as export targets, for example 'Export as D2/Mermaid'. Do not use them for the live canvas.

Sources: https://mermaid.js.org/syntax/architecture.html (opened 2026-10-31); https://github.com/d2lang/d2/releases (opened 2026-10-31); https://runtimewire.com/article/terrastruct-open-sources-tala-alexander-wang-winds-down-business (opened 2026-10-31, article dated 2026-09-07); https://unpkg.com/@d2lang/d2@0.1.34/?meta (queried 2026-10-31); https://d2lang.com/tour/tala (prior run 2026-10-30); https://graphviz.org/docs/attrs/splines/ (prior run 2026-10-30); https://github.com/excalidraw/mermaid-to-excalidraw (opened 2026-10-31); https://raw.githubusercontent.com/excalidraw/excalidraw/master/packages/excalidraw/components/TTDDialog/hooks/useMermaidRenderer.ts (opened 2026-10-31)

### F12 (high confidence)

The tldraw SDK 5.6.0 default terms 'permit use only in development'; production needs a valid license key. Pricing is 'value-based' through sales, with a 100-day trial. The hobby license requires a 'made with tldraw' watermark. Its agent starter kit streams typed shape actions but has no automatic layout.

**Implication:** Reject: license cost and a whiteboard model with no layout. Its streamed-actions pattern is still useful prior art for the streaming design.

Sources: https://tldraw.dev/community/license (prior run 2026-10-30); https://tldraw.dev/pricing (opened 2026-10-31); https://tldraw.dev/starter-kits/agent (prior run 2026-10-30)

### F13 (high confidence)

Cytoscape.js 3.34.4 (MIT, ~137 KB gzip) supports compound nodes, but they must be rectangle shapes. It renders to canvas, and its WebGL renderer supports only straight, haystack and bezier edges (taxi edges fall back to bezier). Taxi edges are 'right-angled lines, hierarchically bundled' and do not avoid nodes. SVG export needs cytoscape-svg 0.4.0, which is GPLv3. Its layout extensions are stale: fcose last released 2023-01, cola 2022-02, cytoscape-elk 2024-11.

**Implication:** Reject for the premium canvas: canvas text and styling, weak accessibility, and GPL SVG export.

Sources: https://js.cytoscape.org/ (prior run 2026-10-30); https://blog.js.cytoscape.org/2025/01/13/webgl-preview/ (prior run 2026-10-30); https://registry.npmjs.org/cytoscape-svg (queried 2026-10-31); https://registry.npmjs.org/cytoscape-fcose (queried 2026-10-31)

### F14 (medium confidence)

Commercial engines that would work:
- GoJS 4.0.5: $3,995 Individual or $6,990 Team (up to 3 developers), perpetual. Free for non-commercial use since September 2026, but 'the watermark remains'. Built-in groups, layouts and AvoidsNodes routing (slower than plain orthogonal).
- JointJS: core 4.3.4 is MPL-2.0; JointJS+ costs $3,468 per developer, perpetual. @joint/layout-msagl always lays out subgraphs top-to-bottom, its node padding 'is currently not working', and link labels inside subgraphs may be mispositioned.
- yFiles for HTML: quote-based pricing with a 60-day evaluation. Its HierarchicalLayout supports from-sketch incremental layout, grouped graphs, tables/swimlanes and orthogonal routing.

**Implication:** yFiles is the 'buy' fallback if the lane grid plus router fails to look right. It is the only engine found that natively does incremental, swimlane and group layout with orthogonal routing.

**Fact-check:** partially-true. GoJS and JointJS details are correct. yFiles for HTML is not quote-based: yfiles.com/pricing publishes annual (term) prices. Single Developer is €9,200 / $11,000 per year (1 named developer, 1 domain). Project is €18,400 / $22,000 per year (3 floating seats, 2 domains). Site is €55,200 / $66,000 per year (unlimited developers, 4 domains). Only 'Custom Solutions' are quote-based. The 60-day evaluation and the HierarchicalLayout features are confirmed.

Fact-check sources: https://nwoods.com/sales/index.html: Individual $3,995; Team $6,990 'For up to three developers'; Group $11,950; perpetual distribution rights with 1 year of support and updates.; https://gojs.net/latest/changelog: 'September 2026: Free for non-commercial use'; 'Non-commercial use does not include a license key, so the watermark remains in the diagram.' 4.0.4 added the non-commercial key. https://registry.npmjs.org/gojs: 4.0.5 published 2026-10-02.; https://www.jointjs.com/pricing: '$3,468 paid once at purchase, and the license never expires' (per developer). Optional updates are $1,668/yr after year 1. 'MPL 2.0 core'. https://registry.npmjs.org/@joint/core: 4.3.4, 2026-10-27, MPL-2.0.; https://docs.jointjs.com/learn/features/automatic-layouts/msagl: subgraphs 'always set to TB'; padding 'is currently not working'; 'Link labels within subgraphs may be positioned incorrectly'.; https://www.yfiles.com/pricing: published per-year prices as listed above. https://www.yworks.com/products/yfiles-for-html/license-types: domain limits.; https://www.yfiles.com/download: 'valid for up to 60 days'. https://docs.yworks.com/yfiles-html/dguide/hierarchical_layout/: fromSketchMode, 'fully supports the layout of grouped graphs', table/swimlane layouts, orthogonal is the default routing, layer and sequence constraints.

Sources: https://nwoods.com/sales/index.html (prior run 2026-10-30); https://gojs.net/latest/changelog.html (prior run 2026-10-30); https://www.jointjs.com/pricing (prior run 2026-10-30); https://docs.jointjs.com/learn/features/automatic-layouts/msagl (prior run 2026-10-30); https://docs.yworks.com/yfiles-html/dguide/hierarchical_layout/ (opened 2026-10-31)

### F15 (medium confidence)

Other open-source options:
- maxGraph 0.25.1 (Apache-2.0, ~168 KB gzip): the mxGraph successor, still pre-1.0 and 'under active development'. Its README lists hierarchical and swimlane layouts and orthogonal edge styles.
- AntV X6 3.1.8 (MIT, Ant Group, 2026-08-11): SVG/HTML rendering with nested nodes, a manhattan router, a new animate API and virtual rendering in 3.0; documentation is mainly Chinese.
- Svelte Flow 1.7.0 (MIT, Svelte ^5.25) shares the React Flow core.

**Implication:** X6 is the most credible open-source alternative if obstacle-avoiding routing out of the box matters more than ecosystem fit. Svelte Flow is equivalent to React Flow if the team prefers Svelte.

**Fact-check:** partially-true. The versions, licenses and features are correct. 'X6 documentation is mainly Chinese' is outdated or overstated: the X6 site has English pages for the API reference (routers) and the 3.x upgrade guide. Community and issue content is still largely Chinese.

Fact-check sources: https://registry.npmjs.org/@maxgraph/core: 0.25.1, 2026-10-21, Apache-2.0. https://bundlephobia.com/api/size?package=@maxgraph/core@0.25.1: 620,805 B minified, 168,439 B gzip.; https://github.com/maxGraph/maxGraph: 'currently under active development'; 'Hierarchical, tree, circle, organic, and swimlane layouts'; orthogonal and Manhattan edge styles; Apache-2.0; about 1.2k stars.; https://registry.npmjs.org/@antv/x6: 3.1.8, 2026-08-11, MIT. https://x6.antv.antgroup.com/en/tutorial/update (English): '3.x introduces animate and removes the 2.x transition API'; virtual rendering via 'virtual: true' with Scroller.; https://registry.npmjs.org/@xyflow/svelte: 1.7.0 published 2026-09-24, MIT, peer svelte ^5.25.0, depends on @xyflow/system 0.0.83, the same core as @xyflow/react 12.12.0. A 'next' 2.0.0-next.4 also exists.

Sources: https://github.com/maxGraph/maxGraph (prior run 2026-10-30); https://registry.npmjs.org/@maxgraph/core (queried 2026-10-31); https://registry.npmjs.org/@antv/x6 (queried 2026-10-31); https://x6.antv.antgroup.com/en/api/registry/router (opened 2026-10-31); https://registry.npmjs.org/@xyflow/svelte (queried 2026-10-31)

### F16 (high confidence)

React Flow's own image-export example pins html-to-image to 1.11.11 because 'The recent versions, after 1.11.11, are not exporting images properly' (html-to-image#516). The latest version is 1.11.13 (2025-02).

**Implication:** Export SVG by serializing our own layout model (vector, with embedded icons and fonts) and make PNG by drawing that SVG to a canvas at 2-3x. Avoid DOM screenshots.

Sources: https://reactflow.dev/examples/misc/download-image (opened 2026-10-31); https://registry.npmjs.org/html-to-image (queried 2026-10-31)

### F17 (high confidence)

Practical ELK pitfalls if ELK is used at all:
- INCLUDE_CHILDREN must be set on the real root (ELK#700 regression, fixed in 0.7.1).
- Edge points are relative to the edge's containing node unless elk.json.edgeCoords=ROOT.
- React Flow's ELK examples use only node positions and ignore ELK's edge sections and bend points.
- The elkjs README lists recurring issues: no incremental or previous-layout support, no standalone edge routing, and GWT bundling errors ('g is not defined', 'Can't resolve web-worker').
- elk-worker.min.js is 1.63 MB (472 KB gzip).
- License is EPL-2.0 OR GPL-3.0-or-later; GPL-3.0 was added as a secondary license in 0.12.0.

**Implication:** If ELK is used for dense sub-layouts, run it in our own module worker that imports elk.bundled.js and lazy-load it. Never put it on the critical path.

Sources: https://github.com/eclipse-elk/elk/issues/700 (opened 2026-10-31); https://eclipse.dev/elk/documentation/tooldevelopers/graphdatastructure/coordinatesystem.html (prior run 2026-10-30); https://reactflow.dev/examples/layout/elkjs-multiple-handles (prior run 2026-10-30); https://github.com/kieler/elkjs (README; prior run 2026-10-30, re-read from the installed 0.12.1 package 2026-10-31); https://eclipse.dev/elk/downloads/releasenotes/release-0.12.0.html (opened 2026-10-31)

### F18 (medium confidence)

Motion 14.9.0 (MIT, released 2026-10-30) animate() comes in two sizes, mini at 3.2 KB and hybrid at 22 KB. The hybrid version tweens plain values through onUpdate (single-value animations) and supports physics springs that 'incorporate the velocity of any existing gestures or animations'.

**Implication:** Use Motion for UI chrome (the console slide-out, the bottom panel) and for interruptible value tweens. Drive graph positions through our own requestAnimationFrame loop that updates only changed nodes.

**Fact-check:** confirmed

Fact-check sources: https://motion.dev/docs/animate: 'It comes in two sizes, mini (3.2kb) and hybrid (22kb).' The hybrid animate outputs values to onUpdate, which 'Currently works only for single value animations'. Physics springs 'incorporate the velocity of any existing gestures or animations'. Mini supports springs; independent transforms and SVG line drawing need hybrid.; https://registry.npmjs.org/motion: 14.9.0 published 2026-10-30T12:55Z, MIT, peers react ^18 || ^19.

Sources: https://motion.dev/docs/animate (opened 2026-10-31); https://registry.npmjs.org/motion (queried 2026-10-31)

## Blockers raised

- **major**: With the lane grid, edge routing must be built or integrated. Naive elbow routing ran 3-8 edges through nodes and produced 19-23 crossings; ELK produced 0 and 7-9. **Mitigation:** Aggregate edges first (container-level edges, buses for fan-in, offsets for parallel links), then route with libavoid-js orthogonal routing in a worker after a 1-2 day spike. Fallbacks: our own gutter/channel router, react-flow-smart-edge 5 (MIT), or yFiles (commercial).
- **major**: Pure automatic layout (ELK, dagre, fcose, TALA) is unstable under edits and ignores cloud-diagram conventions; for example, adding Function Compute in ELK flipped 94 of 190 leaf-pair orders. **Mitigation:** Use the semantic lane grid with sticky slot assignment. Keep ELK only as an optional, lazy-loaded layout for dense subgraphs inside a single cell.
- **major**: The lane grid needs deployment scope and lane/rank metadata for every product; this depends on the catalog area. Unknown products cannot be placed sensibly. **Mitigation:** Add scope (client, edge, region, vpc, zone, vswitch, side band) and lane/rank fields to the catalog schema, with defaults by product category. Let the LLM give an enum tier hint that is validated against the catalog.
- **minor**: libavoid-js is 0.5.0-beta.5, LGPL-2.1-or-later, maintained by essentially one person (46 stars). Its behavior with nested containers has not been tested. **Mitigation:** Ship the WASM as a separate, replaceable file. Hide the router behind an interface so another router can be swapped in. Treat only leaf cards as obstacles and rely on lane ordering to keep edges out of unrelated containers.
- **minor**: React Flow 13 has breaking API changes (draft PR #5866), and the docs ask for a Pro subscription before removing the attribution. **Mitigation:** Pin 12.12.x behind an adapter. Either keep the attribution or pay $169/month for Pro Starter.
- **minor**: Animation smoothness drops on slower CPUs (20 fps when all 70 nodes animate under 4x throttle) and with heavy shadows (45-46 fps). **Mitigation:** Animate only changed nodes and containers; with parentId nesting, moving a container moves its subtree. Add will-change:transform on moving nodes, use light static shadows and 250-350 ms tweens, redraw edges after nodes settle, and honor prefers-reduced-motion.

## Fact-checker: severity notes

- Lane-grid routing (major): I agree it is major, and the 1-2 day libavoid spike is optimistic for 'impeccable' output. libavoid-js exposes no ClusterRef, so it cannot keep edges out of unrelated nested containers natively; that must be emulated with container gates or channels. Re-routes also change bend counts, so routes cannot simply be tweened. Parallel-edge nudging, port distribution and labels still need work. Keep major.
- Auto-layout instability (major): I agree. The ELK numbers reproduce exactly (ELK is deterministic), and seeded INTERACTIVE mode is even worse than reported (57 flips on +WAF). But the lane grid's 0-move result is by construction: a hand-tuned lane table with append-only edits. Removals and replacements were never tested, and the main session's real edit 'run the app tier on Kubernetes' was 15 removes + 3 nodes + 10 edges. Keep major and add a hole-versus-compaction policy to the spike.
- Catalog scope and lane metadata (major): I agree. It is arguably the critical path, because layout quality now depends on catalog completeness for every product the LLM may emit.
- libavoid-js (rated minor): I would raise it to moderate. The npm 'latest' tag is a beta (0.5.0-beta.5); the last non-beta is 0.4.5 from 2025-04-29. It has one maintainer and is LGPL-2.1-or-later, so ship the WASM as a replaceable file. It has no cluster support and adds about 198 KB gzip (not 182).
- React Flow 13 and attribution (minor): I agree minor. 13.0.0-next.0 is already on npm (2026-10-11; zustand ^5, react >=18, react-compiler-runtime). The maintainer said on 2026-08-20 'Legally an active Pro subscription is not a requirement to set hideAttribution: true', though reactflow.dev/remove-attribution still says to remove it only if subscribed. Since 12.11.4 a development-mode log appears when the attribution is hidden.
- Animation smoothness (minor): I agree minor, but the supporting numbers are noisy. My reruns gave full updates with heavy shadows at 38-45 fps (claimed 45-52) and 36-42 fps under 4x throttle (claimed 20-22). One-group updates held about 55-56 fps even at 4x. Heavy shadows look GPU-bound, which CPU throttling does not emulate. Everything was measured headless on a fast Lunar Lake laptop with an Arc 140V; real low-end GPUs, Safari and Firefox are untested.

## Fact-checker: missed risks

- yFiles is not a cheap fallback. Published term pricing is $11,000/yr per named developer, $22,000/yr Project (3 seats), $66,000/yr Site (yfiles.com/pricing).
- Streaming order: React Flow needs parents before children in the nodes array. A child whose parent is missing gets a console warning and is not positioned (@xyflow/system 0.0.83). LLM ops that emit a node before its group must be buffered or reordered client-side.
- Edge z-order: in the default zIndexMode 'basic' (12.10.0), an edge's z is the max z of its parented endpoints, and nested child z is parent z + 1. An edge from a deeply nested card (e.g. ECS in a vSwitch) therefore paints over shallower cards it crosses (e.g. OSS in the region). Use zIndexMode 'manual' or guarantee node-avoiding routes.
- ELK costs if kept as an optional engine: elk.bundled.js is 1.65 MB raw / about 477 KB gzip, and elk-worker.min.js about 472 KB gzip. Combined-config layouts take 92-139 ms median with p90 up to 346 ms on the main thread, so a worker is required. The license changed to 'EPL-2.0 OR GPL-3.0-or-later' in 0.12.0. On 2026-10-28 npm got a 0.13.0 that is now deprecated alongside 0.12.1, so pin exact versions.
- Untested edit types: the layout experiments cover only additions appended at lane ends. Removals, replacements and moves between containers (as in 'run the app tier on Kubernetes') can still shift whole lanes in the lane grid.
- Additional routing options the researcher missed, all immature: avoid-nodes-edge 0.3.2 (React Flow 12 plus libavoid-js WASM in a worker, with parallel-edge nudging via edgeToEdgeSpacing; pins libavoid-js 0.4.5; 277 downloads/week). obstacle-router 0.1.2 (pure-TypeScript libavoid port, LGPL-2.1) with reactflow-edge-routing 0.1.13 (MIT; about 600-770 downloads/week; 7 GitHub stars).
- GoJS offers a Router class beyond AvoidsNodes for more complex routing. Its new free non-commercial license does not cover a commercial product and keeps the watermark.
- React Flow 13 will change onNodesChange/onEdgesChange to NodeChangeset/EdgeChangeset classes and rename useStore to useReactFlowStore (draft PR #5866). Any custom streaming or animation layer should sit behind an adapter.
- Benchmark validity: headless Chrome on a high-end iGPU; run-to-run fps varied by 10-50%. CSS d has no effect in Safari, so edge-path transitions need JS tweening and must cope with routes whose bend count changes.

## Recommended approach

Use React 19 with @xyflow/react 12.12.x (pinned) as the renderer. Place nodes with our own catalog-driven semantic lane grid, route edges with a dedicated orthogonal router, and animate with a small transition engine. Do not use ELK, dagre, Mermaid, D2 or Graphviz to lay out the whole picture.

(1) Model.
- Apply LLM ops to a normalized graph. Park any edge until both of its endpoints exist.
- Take each node's container and lane from catalog metadata, not from the LLM:
  - scope: client, edge/global, region, vpc, zone, vswitch, or a side band (ops, security, AI/data platform).
  - lane/rank along the request path: DNS < ESA/CDN < Anti-DDoS < WAF < ALB/NLB/API Gateway < compute < cache/DB/storage.
- Treat parents proposed by the LLM as hints and validate them against scope. This deterministically fixes the errors seen in the probes: SLS, ARMS, CloudMonitor, Security Center, Model Studio and Quick BI drawn inside the VPC, and WAF drawn before ESA.
- Collapse replicas into one card with a count badge (e.g. 'ECS x4, Auto Scaling').

(2) Layout. A pure TypeScript function, about 0.03 ms per run, made of nested lane grids:
- Root: Clients | Edge | Region(s) | side bands.
- Region: VPC | stack of regional managed services.
- VPC: ingress | Zone A / Zone B (fixed order) | egress. NAT, VPN and EIP sit on the VPC frame as border children, as in awslabs diagram-as-code.
- Zone: vSwitch | data replicas.
Rules:
- Use fixed card sizes (e.g. 200x64) so layout never waits on DOM measuring.
- Slots are sticky: once a node has a (container, lane, index) it keeps it.
- New nodes go to their catalog rank within their lane. Only later siblings and the enclosing containers move.
- Removals compact the lane, with animation. An explicit 'Tidy up' action re-sorts everything.
- Nest with React Flow parentId so that moving a container moves its whole subtree in one position update.

(3) Edges.
- Aggregate before routing: container-level edges when every child of a container connects to the same target, one bus edge for N-to-1 fan-in, and offsets for parallel links.
- Route orthogonally around leaf cards with libavoid-js in a Web Worker: OrthogonalRouting, shapeBufferDistance about 12, idealNudgingDistance about 8, crossing penalty on, incremental moveShape + processTransaction.
- Spike this first, targeting under 30 ms for 60 nodes and 80 edges. Fallbacks: our own gutter/channel router, react-flow-smart-edge 5, or yFiles.
- Render custom edges as orthogonal paths with 8-10 px rounded corners and small arrow markers. Add label chips through EdgeLabelRenderer only when they add meaning.
- Show flow on request-path edges with a CSS stroke-dashoffset animation or one animateMotion dot.

(4) Animation.
- Coalesce ops into batches every 150-250 ms; the model emits about 1.6 ops/s with thinking off.
- For each batch, compute the layout, diff it against the previous one, then:
  - enter: opacity plus scale from 0.92 to 1 over about 220 ms, staggered 40 ms;
  - move: tween only nodes and containers that changed, over 280-350 ms, retargeting from their current position if a new batch arrives mid-animation;
  - exit: fade and scale over about 160 ms;
  - edges: redraw routed edges after nodes settle with a 150-200 ms draw-on. CSS d transitions are not Baseline, so edges cannot follow mid-tween any other way.
- Set will-change:transform on moving nodes, keep shadows light and static, and honor prefers-reduced-motion.
- Camera: never zoom in while streaming. Animate fitView only when content overflows the view, with per-side padding that clears the console and the bottom panel. Stop moving the camera once the user pans or zooms, and do a final fit when the stream ends.

(5) Hover and accessibility.
- On hover or keyboard focus, show a NodeToolbar (isVisible) or Floating UI popover with the LLM's reason and the catalog blurb.
- Keep nodes and edges focusable. Use ariaLabelConfig and per-node aria-labels.
- Announce each change through an aria-live region in the console.
- Cross-highlight between the product panel and the canvas.

(6) Export. Serialize SVG from the layout model, and make PNG by drawing that SVG to a canvas at 2-3x. Optionally add draw.io XML.

(7) ELK and non-infrastructure answers.
- ELK is optional: lazy-load it in our own module worker, and use it only for dense subgraphs inside one cell (flat layered with considerModelOrder).
- Product-need answers (e.g. 'an AI agent my team can use' → Qoder) reuse the same renderer with lanes such as Recommended | Works with | Alternatives.

Cost and effort: no mandatory license fees. Rough estimate: 2-3 weeks for one senior front-end engineer to reach premium quality, with routing the riskiest part.

## Open questions

- Can libavoid-js 0.5.0-beta.5, running in a Web Worker, incrementally reroute 60 nodes and 80 edges in under 30 ms in Chrome, Safari and Firefox, and is it stable over many edit cycles (WASM memory, crashes)? This needs a 1-2 day spike.
- Should WAF be drawn inline in the request path (ESA → WAF → ALB) or as a shield badge on ESA/ALB, given that ESA bundles WAF? This is a diagram-convention decision for product and design.
- How should multi-region (DR) and more than two zones be arranged in the lane grid (stacked regions vs side by side) while keeping the aspect ratio reasonable?
- Will users be able to drag or edit nodes? If so, the lane grid needs per-node manual overrides that survive later LLM edits.
- How smooth is animation on real low-end hardware (iGPU Chromebooks, older Macs, Safari)? My benchmark used headless Chrome 155 on an Intel Arc 140V with emulated CPU throttling.
- Will the catalog area add scope and lane/rank fields for every product, and can the LLM emit a validated tier hint for products the catalog does not know?
- Is a React Flow Pro subscription ($169/month) acceptable to remove the attribution, or will the product keep it?
- Should the product panel and the canvas share one view model so hover cross-highlighting and the 'why' text stay consistent?
