# src/canvas and src/routing

The live diagram. `index.tsx` exports `Canvas(props: CanvasProps)` (contract: `src/app/contracts.ts`). Everything below is
pure unless it says otherwise, and the pure parts have `node:test` tests beside them.

| File | Job |
|---|---|
| `index.tsx` | The stage. React Flow for pan and zoom only; frames, cards and one edge layer are its nodes. Measures the sheet and reports it, fits the camera (core `fitCamera`) when the store says `display.refit`, routes edges, owns hover, focus, the roving tab stop and the popover. |
| `scene.ts` | Layout + display graph -> `FrameView`, `CardView`, `BadgeView` (set titles through core `fitTitle`, zone chips, cautions). Text is measured through an injected function. |
| `motion.ts` | `planMotion(prev, next, animate)`: which cards enter (30 ms steps, at most 6), move, exit; which frames resize; what edges wait for. CSS does the animating. |
| `camera.ts` | Viewport maths: core `Camera` to React Flow viewport, zoom steps and floor, minimal reveal pan, pan extent. |
| `edges-model.ts`, `edge-geom.ts`, `edges.tsx` | Routes to what is drawn: hidden control edges, hot, fresh and dimmed edges, label plates, rounded paths, chevrons. One SVG layer. |
| `nodes.tsx` | Node types: frame, card (badges, attachments, BuildMark, revision tag, chips), exit ghost, edge layer. |
| `Popover.tsx`, `pop-model.ts`, `popover-pos.ts`, `hover.ts` | The "why it's here" popover: content rules, placement beside the card, open and close timing. |
| `nav.ts` | Reading order, arrow-key neighbour, roving tab stop. |
| `Tools.tsx` | Zoom tools, legend, pan hint. |
| `labels.ts` | The few words `strings.json` does not carry (shelf lane names, legend, zoom value, accessible names). |
| `measure.ts` | Canvas `measureText` with the page's font stack. |
| `canvas.css` | Tokens only. Orange appears as the product icons and the BuildMark / Cursor, nowhere else. |

`src/routing`: `plan.ts` turns the display graph and layout into routable edges and obstacles; `avoid.worker.ts` runs
libavoid-js in a Web Worker (`avoid-port.ts` is its browser side); `channel.ts` is the fallback router; `budget.ts` gives
libavoid 50 ms per layout and answers with the channel router when it is late, handing the late answer back so the canvas can swap it in.

Drafted by Qwen and reviewed: `nav.ts`, `popover-pos.ts`, `hover.test.ts`, `edge-geom.test.ts`, the Korean and Chinese words in `labels.ts`.

Checks: `npm test`, `npm run typecheck`, `node scripts/e2e-canvas.mjs` (headless interaction and motion checks), `node scripts/shots-canvas.mjs` (screenshots to `screenshots/canvas/`).
