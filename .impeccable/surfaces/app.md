# Surface brief: the app (landing and working view)

Target: `apps/web` (one page with two states: landing and working). Related: `apps/web/src/**`.
Mode: **Operate**. Build path: **code-led** (Operate surfaces are code-led; no comp round).
Build spec: [../spec/app-spec.md](../spec/app-spec.md). Tokens: [../spec/tokens.css](../spec/tokens.css). Strings: [../spec/strings.json](../spec/strings.json). Landing briefs: [../spec/examples.json](../spec/examples.json).
First-viewport sketch: `.impeccable/sketch/` (HTML) and `.impeccable/sketch/png/` (1440x900 renders). The sketch is a direction study, not the build.

## Scope and visitor

- **Who:** Alibaba Cloud pre-sales (solutions architects, BD and sales) in customer conversations, and customers on their own (confirmed 2026-10-31).
- **Screens:** their own laptops at normal desktop sizes (1280x720 to 1920x1080), read up close. Not projectors.
- **Job:** turn a stated need into a credible, current Alibaba Cloud architecture; watch it draw within seconds; refine it turn by turn; know why every product is there.
- **Actions:** write the brief (landing), then follow-ups (composer). Read the diagram, hover a product for its reason, open the products panel for the full list.
- **Proof on hand:** the dated catalog (223 entries, 2026-10-31), recorded eval conversations in `eval/results/`, the server's status and fatal copy in `apps/server/src/messages.ts`. No testimonials, customer logos or benchmarks exist; never invent them.
- **Pinned by the user:** the composition (a Google-like prompt that becomes the console on the left, the canvas on the right, a products panel under the canvas with a ^ handle) and the brand (Alibaba Cloud, with its name, logo, colours and official icons).
- **What would feel wrong:** a generic AI chatbot look (confirmed answer).

**Use scene:** an architect's laptop on a meeting-room table under office light, turned or screen-shared so the customer reads along, or a customer at their own desk. That forces a light, high-contrast sheet: the diagram must read like a printed drawing at arm's length.

**Themes (decided 2026-11-01):** light and dark, with System as the default. The light sheet above is still the meeting-table answer; the user asked for a choice, so dark is added as an equal, designed theme. See [Themes](#themes-light-and-dark) below.

## Direction contract

THESIS: The console is the architecture's revision record, not a chat. The customer's requirements stay pinned at the top. Every turn is a numbered revision: the ask, Qwen's note as a one-paragraph annotation, and a change set ("+ WAF on ALB", "ECS → ACK") whose lines point at the cards they changed. While Qwen builds, Alibaba Cloud's own Cursor, the orange bar from the centre of its logo, marks where the build is happening. Refused default: a transcript of alternating bubbles with an avatar and a sparkle, a gradient "AI" glow, and a picture that redraws.

OWN-WORLD: Alibaba Cloud's published identity, checked on 2026-10-31 (brand guide 2021, alibabacloud.com, docs centre). The canvas is a white sheet with ink #181818 and the brand's Pantone greys. The console ground is #F4F5F7. Controls are square (0 px), in the site's action blue #1354EE. Intelligent Orange #FF6A00 appears only in the logo, the official product icons and the Cursor: never as text on a light ground, and never under white text. The faces are Alibaba Sans and Alibaba PuHuiTi, with a Helvetica-class fallback. On the canvas, hairline region, VPC and zone frames hold white cards; each card has its orange official icon and an ink title, and the latest revision's cards carry ink square tags. No gradients, glows, bubbles, avatars or sparkles.

STORY: The architect types the customer's brief. The box slides left and becomes revision 1 while the diagram draws itself on the right: the first card in about 3 to 5 s, the whole design in about 12 s. The customer reads the drawing while the architect reads the record. Each follow-up becomes a numbered revision whose cards carry its number. After every turn, each pinned requirement reads Held, or says what broke and that Qwen fixed it. Hovering a card, a record line or a product row shows why that product is there. They leave believing the design is current, explained and bound to what they said.

FIRST VIEWPORT:
- Landing, 1440x900:
  - No header bar: only the language switch and Sessions sit at the top right.
  - The stack centres vertically, so the lockup's top sits at about y = 145: the Alibaba Cloud logo 32 px tall, a 1 px divider, then "Architecture Builder" at 24 px followed by a still orange Cursor. The 18 px lead sits under it.
  - The brief box below it is the primary action: 760 px wide and at least 136 px tall, with a square 1 px #808285 border and 18 px text. The blue "Draw architecture" button sits inside its bottom-right corner.
  - Under the box, "Start from a customer brief" heads five real briefs in one ruled list, each row a tag and a one-line brief.
  - The AI and catalog-date line sits on the bottom edge.
- Working view, 1440x900:
  - A 48 px white header holds the logo (18 px tall), the product name, the session title, the Live state, Focus diagram, Sessions and New session.
  - The console is 400 px wide on #F4F5F7. Requirements are pinned at the top. The revision record lists older revisions as one-line rows and the newest one expanded. The composer, the primary action, is fixed at the bottom.
  - The canvas is a 1040x800 white sheet, fitted at a zoom of 0.857 or more so card titles render at 12 px or more. The zoom tools sit at the top right and the legend at the bottom left.
  - Under the canvas only is the 52 px products bar, with the ^ handle tab centred on its top edge.

FORM: Operate surface, code-led. The form is a revision record beside a drawing sheet. Alibaba Cloud's product grammar is the system. The signature move combines the engineering drawing's revision block with Alibaba Cloud's Cursor. The user pinned both the brand and the composition, so the surface was shaped directly without a concept round: candidate 1 of 1.
seed: none (unavailable)

SIGNATURE: The box becomes the record, and the Cursor marks the build.
- **On submit (420 ms):** the landing box travels to the console. Its text becomes revision 1's ask, and the emptied box settles as the composer. The lockup shrinks into the header, and the drawing sheet slides in from the right.
- **While the turn streams:**
  - The Cursor sits at the end of Qwen's note. It blinks while Qwen is silent and holds steady while text arrives.
  - A matching orange bar underlines each card this revision adds. Each card fades up 6 px into its slot in the same frame as its change line appears.
- **At commit:** the Cursor leaves, the underlines hand over to the ink revision tags, and the revision closes with "Drawn in 9.5 s · Requirements held".
- **Pointing** at a change line, a revision tag or a product row outlines the same cards in blue and dims the rest.
- **Motion grammar:** card entrance 240 ms, move 300 ms, exit 160 ms through a dashed ghost, the landing handoff 420 ms. Nothing else animates. With reduced motion, only 120 ms fades remain and the Cursor holds still.

RISKS:
- **Small screens.** At 1280x720 the canvas is 920x620. A diagram of 20 or more cards cannot fit there above the 12 px floor, so the canvas pans with a hint instead of shrinking. Layout v2 decides how often this happens.
- **Fonts.** Alibaba Sans and Alibaba PuHuiTi need a font download the user has not approved. Until then Arial renders on Windows: the brand's own fallback, but plainer.
- **Icon gaps.** The official set has no icons for Model Studio, Qwen, PAI, Qoder, ESA, KMS, vector databases or the agent products, and its own icons mix outline and solid weights. The fallback glyphs must match the set's weight, or the canvas looks patched.
- **Orange icons** measure 2.87:1 on white. They stay decorative, and the product name next to each one carries the meaning.
- **Density.** A revision record is denser than a chat. A customer working alone needs the first-run hint in the empty requirements block.
- **The Cursor** is a brand symbol in a functional role. If it appears anywhere other than the live build and the landing name, it becomes noise.
- **Licensing.** The iconfont listing carries no licence. Affiliation is confirmed, but the use of the logo and icons must be confirmed before any public launch.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Themes: light and dark

**Decision (2026-11-01, the user's request "add dark mode toggle").** Two themes, Light and Dark, as equals. **System is the default:** with no choice stored, the page follows the device's `prefers-color-scheme`, so a meeting-room laptop set to light still opens on the light sheet. The reader can pin Light or Dark. One `localStorage` key, `ab.theme` ("light" or "dark"; nothing stored is System), is shared by the app and the Worker's own pages on the same origin.

**Why.** Light was chosen from the use scene, not by category, and it stays right for the meeting table and for the PDF. But the same people also work where light is wrong: the architect preparing a proposal in the evening, a customer exploring alone in a dim room, a screen-share into a dark meeting app. A dark sheet that keeps the drawing legible serves them. Neither theme is derived from the other: each is composed for its light conditions.

**How dark is composed (not inverted).**
- **Grounds are graphite and lighten as things rise:** the record column (`#111214`) sits below the drawing sheet (`#18191c`). The sheet stays the lit page, as it is in light. On the canvas each container steps up: region fill, then VPC fill, then the cards (`#26282e`). Menus, the popover, toasts and the export dialog float on `--surface-pop` (`#202226`). Lightness does the lifting; shadows only deepen.
- **Text runs down the brand's greys:** ink `#ecedef`, ink-2 `#c3c5c9`, and ink-3 `#9c9fa4`, which sits beside Pantone 6C.
- **Action blue splits into two roles.** As text, links, focus and rings it lifts to `#6f9bff` so it reads on graphite. As the filled primary button it stays a saturated `#2e68f5` under white text (`--action-fill`), so the button is still Alibaba Cloud's blue.
- **The latest revision tag is still the boldest mark,** so in dark it becomes a light square with a dark numeral (`--on-ink`).
- **Intelligent Orange is unchanged and stays where it is:** the official logo as delivered, the product icons, the Cursor and the build marks. It measures 6.1:1 on the dark sheet and 5.2:1 on a card, so it reads better than on white. It is never text or a control in either theme, and `--warn` turns amber (`#e6a34d`), well away from the brand hue.
- **Frames and edges:** frame borders (`--frame-line`) and edge strokes hold 3:1 against every fill they cross, and edges stay brighter and wider than frames.

**Dark tokens** (the `[data-theme="dark"]` layer in `apps/web/src/styles/tokens.css`, repeated under `@media (prefers-color-scheme: dark)` for System. `src/styles/theme.test.ts` checks that the two copies match, that every colour role has a dark value, and every contrast pair below).

| Role | Light | Dark | Dark measured |
|---|---|---|---|
| `--ink` / `--ink-2` / `--ink-3` | #181818 / #414042 / #636466 | #ecedef / #c3c5c9 / #9c9fa4 | 15.0 / 10.2 / 6.6 on the sheet; ink-3 5.6 on a card |
| `--sheet` / `--record` | #ffffff / #f4f5f7 | #18191c / #111214 | |
| `--surface-2` / `--surface-pop` | #f7f9fc / #ffffff | #25272c / #202226 | |
| `--line-1` / `--line-2` (decorative) | #dcddde / #bcbec0 | #2d2f34 / #45484e | |
| `--line-control` (control borders) | #808285 | #7d8086 | 4.4 sheet, 4.7 record, 4.0 pop |
| `--action` (text, focus, rings) | #1354ee | #6f9bff | 6.5 sheet, 5.9 pop, 5.5 card |
| `--action-fill` (primary button) | #1354ee | #2e68f5 | white on it 4.8; 3.7 off the sheet |
| `--action-soft` / `--action-soft-2` | #edf2ff / #dde8ff | #1b2643 / #283a66 | |
| `--on-ink` (on ink, ok, danger squares) | #ffffff | #18191c | 15.0 on ink |
| `--ok` / `--warn` / `--danger` | #006621 / #a85800 / #c4281c | #5dc287 / #e6a34d / #f4847a | 8.0 / 8.1 / 7.1 on the sheet |
| `--ok-soft` / `--warn-soft` / `--danger-soft` | #e8f4ec / #fdf3e3 / #fdeceb | #13281b / #2c2214 / #361b1b | |
| `--frame-line` (region, VPC, zone, external) | #808285 | #6e7177 | 3.6 sheet, 3.4 region, 3.3 VPC |
| `--frame-region-fill` / `--frame-vpc-fill` / bands | #f7f9fc / #ffffff / #f4f5f7 | #1c1e22 / #1f2126 / #1d1e22 | |
| `--card-fill` / `--card-line` | #ffffff / #bcbec0 | #26282e / #3f4248 | |
| `--edge` / `--edge-path` | #808285 / #414042 | #8d9096 / #c3c5c9 | 5.5 / 10.2 on the sheet |
| `--brand-orange` (logo, icons, Cursor) | #ff6a00 | #ff6a00 | 6.1 sheet, 5.2 card |
| `--dim-opacity` | 0.28 | 0.32 | |

**One change to light.** Frame borders now meet 3:1 in light too: Pantone 8C `#808285`, 3.85:1 on white and 3.7:1 on the region fill, where Pantone 3C and 5C used to fall short. The VPC and zone frames are the only thing that says which cards sit inside them. They stay 1 px hairlines, and the edges stay heavier.

**Finish review (2026-11-01): what measuring in a real browser changed.** `apps/web/scripts/theme-audit.mjs` reads every text colour against the ground it really sits on, every Tab stop's focus ring, every border, icon and canvas edge, in both themes (pixels cross-check the computed styles). It found, and these now hold:
- **A chosen segment or pressed toggle** (the language and theme segments, the replay speed, the Focus diagram button, the Worker's current-page link) was told apart only by a soft fill, 1.1:1 against its neighbour. It now carries a 2 px inset rule in the action blue (`box-shadow: inset 0 -2px 0 var(--action)`), 5.9:1 in light and 5.5 to 6.5 in dark.
- **The React Flow attribution** was 10 px in `--ink-disabled` (2.6:1 light, 3.1:1 dark). It is a link, so it is 12 px in `--ink-3`. A test now fails if `--ink-disabled` colours anything that is not disabled.
- **Small chips** (a canvas badge such as Auto Scaling, the Worker's role and count chips) draw their shape with the border, so it is `--line-control` (3:1). The empty-state frame in the solution map uses `--frame-line` like the other frames. Custom scrollbar thumbs are `--line-control` too.
- **Left as decorative, by the rule that a border only has to reach 3:1 where nothing else identifies the component:** canvas card borders (`--card-line`, 1.9:1 light, 1.5:1 dark) and hairlines (`--line-1`). A card is named by its icon and title, and takes `--ink-3` plus a focus ring (5.9:1 and 5.5:1 or better) on hover and focus. If the owner wants card outlines at 3:1, point `--card-line` at `--frame-line`; the cards then outline as heavily as their frames.
- **Intelligent Orange** measures 6.1:1 on the dark sheet and 2.9:1 on white, where it stays decorative (the product name beside each icon carries the meaning), as the contract says.
- **Warning amber** (`--warn`) keeps the family it has in light (hue 31 in light, 34 in dark, against the brand's 25). It is a state colour, not the brand's, and it is never an icon or the Cursor; if the two ever read as one, move `--warn` toward yellow in both themes together.

**The control.** A three-way choice (Light, Dark, System) in the header's menu grammar: an icon trigger showing the choice in force (sun, moon or monitor) opens a menu of three radio items, with System noted as "Follows your device". It sits beside the language switch on the landing and in the working view's header. On the Worker's account page it appears as a segmented group in its own Theme section. Strings exist in English, Korean and Chinese. Keyboard: Enter or Space opens the menu, focus lands on the choice in force, the arrow keys move, Enter picks, and Escape closes and returns focus to the trigger.
- **No flash:** `public/theme.js` is a tiny blocking external script in `<head>`, because the CSP is 'self' only. It puts `data-theme` on `<html>` before the first paint. The Worker serves the same file as `/_auth/theme.js`, copied by `npm run sync:tokens`.
- **Without JavaScript,** the sign-in pages follow the device through the media query, and the account page's control stays hidden.
- **The switch itself only cross-fades:** one 200 ms view transition of the page, with the components' own colour transitions held off meanwhile. With reduced motion the theme simply changes. A change in another tab is followed at once.

**What does not change.** Type, space, radii, motion durations, layout and the signature. **The PDF export stays light** whatever the page shows: it is a document, drawn from fixed light constants in `src/export/tokens.ts` that never read the page's styles. `src/export/tokens.test.ts` checks this, and a proposal exported from the dark theme was rendered and checked: white pages, ink text.

**Evidence.** `node scripts/theme-audit.mjs` (apps/web) and `node scripts/pages-audit.mjs` (apps/worker) measure contrast; `node --import ./scripts/alias.mjs scripts/theme-qa.mjs` (apps/web, after `npm run build`) checks the first painted frame, persistence, a second tab, System following the device live, reduced motion, orange discipline and that a PDF exported from the dark app has white paper; `node scripts/theme-e2e.mjs` (apps/worker, against `wrangler dev`) checks the same choice across the builder and the Worker's pages on one origin. `apps/web/screenshots/theme/` holds both themes at 1440x900 and 1280x720 (`node scripts/theme-shots.mjs`). `apps/worker/screenshots/theme/` holds the sign-in, account and admin pages (`node scripts/pages-shots.ts`).

## Memorable moment

The box the customer typed into slides left and becomes revision 1, while the drawing builds itself on the right. The orange Cursor that blinks after Qwen's words underlines each card as it lands.

## Unresolved decisions (do not invent; ask through the orchestrator)

1. **Brand fonts.** Alibaba Sans (Latin) and Alibaba PuHuiTi 3.0 (Chinese) are the brand guide's free-for-commercial-use faces. Self-hosting them needs a download that the user has not approved. Until then, the fallback stack renders.
2. **Product name.** "Architecture Builder" is a working title (PRODUCT.md lists the name as undecided).
3. **Icon and logo licence before a public launch.** See Brand Commitments in PRODUCT.md and research/icons-and-prior-art.txt.
4. **Concept round.** The launcher is not installed, so concept-seed could not run. The direction was shaped directly because the user pinned both the brand and the composition. That is why FORM records `seed: none (unavailable)`.
