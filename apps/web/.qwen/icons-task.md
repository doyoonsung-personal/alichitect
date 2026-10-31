Draw a small UI icon set as SVG for a product UI. Return ONLY a JSON object mapping each icon name to a string of SVG child elements (no <svg> wrapper, no markdown).

Hard rules for every icon:
- 16 x 16 grid (viewBox 0 0 16 16). Keep all geometry between 1.5 and 14.5 on both axes.
- Outline style only: every element has fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter". Write these attributes on every element (no inheritance from the wrapper).
- Allowed elements: path, line, polyline, rect, circle. No transform, no clip-path, no defs, no text, no gradients, no style attributes.
- Square, engineered look (like the Alibaba Cloud console icons): straight strokes and right angles where possible; circles only where the metaphor needs it. No rounded decorative flourishes.
- Each icon must read at 16 px. Use at most 4 elements per icon.

Icons (name: what to draw):
- send: a paper-plane / arrow pointing up-right is NOT wanted; draw a right-pointing arrow made of a horizontal shaft and an arrowhead chevron (like "->").
- stop: a square outline, 10 x 10, centred.
- history: a clock: circle plus hands (12 to centre, centre to 3 o'clock direction down-right short).
- plus: a plus sign, 10 long arms.
- minus: a horizontal line, 10 long.
- close: an X made of two diagonals, 8 x 8.
- check: a tick: short down-right stroke then long up-right stroke.
- chevronUp: an upward chevron "^", 10 wide, 5 tall, centred.
- chevronDown: a downward chevron "v", same size.
- chevronRight: a right chevron ">", 5 wide, 10 tall.
- arrowRight: horizontal arrow to the right with chevron head, 11 long.
- info: circle with a vertical line (i stem) and a short dot above it drawn as a tiny line.
- external: a square outline open at the top right with an arrow pointing to the top right corner (open-in-new-tab).
- focusDiagram: the "expand" icon: four corner brackets pointing outward (each bracket is an L of 3 px legs) at the four corners.
- showConsole: a rectangle with a vertical divider line at one third from the left (a window with a left sidebar).
- fit: four corner brackets pointing inward (each an L of 3 px legs placed just inside the corners) with a small centred square 4 x 4.
- zoomIn: a circle (r 4.5, centre 7 7) with a plus inside and a short handle line to the bottom right.
- zoomOut: same circle and handle, with a minus inside.
- globe: a circle with one vertical ellipse meridian and one horizontal equator line.
- unpin: a circle r 6 centred, with an X inside (8 x 8 diagonals) -- "remove".
- retry: a circular arrow: a three-quarter circle arc, ending with a small chevron arrowhead at the open end.
- edit: a pencil drawn as a rotated rectangle outline from bottom-left to top-right, with a short baseline under the tip.
- dottedRing: a circle r 5.5 drawn dashed: add stroke-dasharray="1.6 2.2" to the circle.
- spinner: three-quarter circle arc r 5.5 (open at the top right) -- used with CSS rotation.
- cross: a heavier X in a circle: circle r 6.5 with an X inside (6 x 6 diagonals).
- checkCircle: circle r 6.5 with a tick inside.
- infoCircle: same as info.
