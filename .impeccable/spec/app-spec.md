# Architecture Builder: build spec (Phase 1)

This spec is for the scaffold and three builders: console, canvas and products panel. Build from it without guessing. Where the spec is silent, the [direction contract](../surfaces/app.md) decides, and then the tokens. Never copy the direction contract, this spec, or any comment from it into shipped source or the DOM.

- **Tokens:** [tokens.css](tokens.css). Copy it into `apps/web/src/styles/tokens.css` and use only these variables. No raw hex values in components.
- **Strings:** [strings.json](strings.json). The keys are named below as `key`. English is the source; Korean and Chinese are reviewed.
- **Landing briefs:** [examples.json](examples.json).
- **Direction sketch:** `.impeccable/sketch/` (open `sketch.html?state=landing|working|hover|link|streaming|panel`, plus `&lang=ko|zh` on the landing; renders in `sketch/png/`). The sketch shows the direction; this spec wins where they differ.
- **Contract:** `packages/core/src/types.ts` (`TurnRequest`, `ServerEvent`, `SessionMemory`, `Graph`, `Warning`), `llm.ts` `TurnEvent` (each with `phase: 'main' | 'repair'`), `display.ts` (`displayGraph`, `holdBack`, `cardIds`), `layout.ts` (`layoutGraph(graph, catalog, prev?, opts?)` and `GEOMETRY`). Core is being edited by Phase 1a: import it and never fork it.

Contents: 1 Principles · 2 Brand facts and rules · 3 Tokens · 4 Anatomy by viewport · 5 Landing · 6 Working view · 7 Component inventory · 8 States · 9 Stream events to UI · 10 Motion · 11 Canvas text and geometry · 12 Landing briefs · 13 Accessibility · 14 Handoffs and open decisions · 15 Acceptance checks

---

## 1. Principles

1. **A revision record, not a chat.** The console never shows bubbles, avatars, a "Qwen is typing…" pill or alternating left and right alignment. Each turn is a revision: ask, note, change set, footer.
2. **The canvas is the subject.** The customer reads the diagram from across the table. Nothing floats over the diagram except the zoom tools, the legend, a popover and the products panel when it is opened.
3. **Live but calm.** Cards enter, move and leave with one motion grammar (section 10). Unrelated cards never move. Nothing else animates.
4. **Brand in precise details.** These carry the brand: the logo, the official orange icons, square controls, the action blue, and the Cursor. Never gradients, glows or decorative orange.
5. **Every state says what happened and what to do next,** in the product's words (`strings.json`).

## 2. Brand facts and rules

Checked on 2026-10-31. Where a fact comes from the brand guide, it binds; where it comes from the live site, it is the product grammar we match.

| Fact | Value | Source |
|---|---|---|
| Primary colour | Intelligent Orange (云智能橙; "INTELLIGENCE ORANGE" on the guide's hero card), #FF6A00, RGB 255 106 0, Pantone 1585C, C0 M73 Y98 K0. The guide calls it the brand's most important colour, to appear in every communication and design; only its share of the area changes. | Alibaba Cloud brand guide 2021, Brand Color (`cn.aliyun.com/about/branddesign/guidelines`, section images read 2026-10-31) |
| Orange tonal scale | Dark to light, sampled from the guide's swatches (JPEG, so within a few units): #370800, #500C01, #7D1E02, #A32D05, #C84107, #E05713, #FF6A00, #FF7814, #FF8C19, #FF9E35. The dark steps turn red. | brand guide, 主色明度阶 |
| Secondary colours | Intelligent Yellow #FFD100 (Pantone 113C), Intelligent Blue #0030E8 (Pantone 2728C; the guide's colour for technology and professionalism), Intelligent Green #00ED85 (Pantone 802C). Each has a tonal scale that may only be used with its own colour. | brand guide, 次级色 and 次级色明度阶 |
| Tertiary colours | Twelve, including #F5AB00, #DE8200, #0878F0, #001F80, #17AB2E, #006621 (Pantone 335C), #FF3D14 and #AD290A (Pantone 1805C). This app uses #006621 as `--ok`. | brand guide, 品牌色彩系统 三级色 |
| Greys | #000000 (Black 6C), #414042 (11C), #636466 (9C), #808285 (8C), #9D9FA2 (6C), #BCBEC0 (5C), #DCDDDE (3C), #FFFFFF. Backgrounds use 0 to 30% grey; text uses 0 to 100% grey, with care for legibility. | brand guide, 灰色明度阶 |
| Typefaces (Latin) | 1st: Univers (Alibaba Cloud only; ISVs are not licensed). 2nd: **Alibaba Sans** (free for commercial use). Fallback where neither is available (online content, email, Office): Helvetica. | brand guide, Brand Font |
| Typefaces (Chinese) | 1st: FZ LanTingHei Pro (方正兰亭黑 Pro; Alibaba only). 2nd: **Alibaba PuHuiTi** (阿里巴巴普惠体; free for commercial use). Fallback: Heiti (黑体). | brand guide, Brand Font |
| Logo construction | The symbol is a balanced, golden-ratio form of two mirrored brackets around a bar. Never alter its shape or proportions. The horizontal logo (symbol plus logotype) is the recommended form. | brand guide, Brand Logo |
| Logo clear space | Keep a clear zone on every side equal to one bracket of the symbol (about 0.6 of the logo's height). | brand guide, Brand Logo (safe-area drawing) |
| Logo minimum size | Horizontal logo 4.5 mm tall (about 17 px at 96 dpi); stacked logo 9 mm. | brand guide, Brand Logo |
| Logo on grounds | The orange logo is the standard and always the first choice: use it on white and on the guide's black (#181818). Reverse it to the white mono logo only when the ground makes the orange logo hard to read. On orange tints, up to 30% use orange and above 30% use white; on greys of #181818, orange stays readable between 20% and 60%. On an orange ground, use white. | brand guide, logo背景色应用 and logo有色背景应用规范 |
| The Cursor (超级符号) | The brand's "super symbol" is the bar at the centre of the logo, used as a cursor: "CODE_", "BUILD_", "数字创新_". It stands for code, the smallest unit of the digital world, a starting point that keeps blinking and evolving. | brand page, CURSOR (`cn.aliyun.com/about/branddesign/cursor`) |
| Site face | Roboto 300/400/500/700 webfont, with the stack `Roboto, "Helvetica Neue", Helvetica, Tahoma, Arial`. Body text #262626 at 13 px; hero 60 px weight 400, ink #0D0D0E. | alibabacloud.com/en, computed styles |
| Docs face | `"helvetica neue", "pingfang SC", arial, "hiragino sans gb", …` at 14 px. Ink #181818, secondary #3D3D3D, tertiary #818184, links #1366EC, grounds #F4F5F7 and #F7F9FC. | alibabacloud.com/help, computed styles |
| Action colour | Primary buttons #1354EE with white text and **0 px radius** ("Start for free", "Contact sales"). Soft blue grounds #EDF2FF and #DDE8FF. | alibabacloud.com, computed styles |
| Orange on the site | The header logo is an SVG with fill #FF6A00, 16 px tall in a 42 px white header. The cookie banner's buttons are orange with white text (2.87:1). Do not copy those buttons. | alibabacloud.com, computed styles |
| Official icon set | 286 icons. 279 are single-fill #FF6A00; a few are #FF5D00, #FF6900, #FE7015 or #FF6700. They include the official English and Chinese logos; the English logo glyph is #FF6900. | iconfont.cn collection 21408 (scratchpad `iconfont/c21408.json`); `apps/web/src/icons/` |

**Orange rules (binding):**
- Orange is for:
  - the logo;
  - the official product icons;
  - the Cursor and its build marks on new cards;
  - the text caret.
- Orange never carries text on a light ground: #FF6A00 measures 2.87:1 on white and fails AA at every text size.
- White text never sits on orange (2.87:1). Ink text on orange (6.18:1) and orange text on ink (6.18:1) both pass. This app has no ink or orange fields, so neither case is used. They are allowed if a later surface needs them.
- Orange is never a button, a link, a focus ring, a selection or a state colour. Those are blue, ink or the state colours.
- Text that needs the brand's warmth uses `--warn` #A85800: orange's hue, darkened until it passes AA (5.17:1 on white). The guide's own dark steps (#C84107, #A32D05) turn red and would read as danger, so `--warn` is derived rather than taken from the scale. It is used for warnings and lifecycle notes only.
- The product icons sit beside their names, so they are decorative (`aria-hidden`). Their 2.87:1 contrast is acceptable because the name carries the meaning.

**Logo rules in this app:**
- Use the English horizontal logo (`LOGOS.en`, `public/brand/alibaba-cloud-logo-en.svg`) at 32 px tall on the landing and 18 px tall in the header. Use the Chinese logo (`LOGOS.zh`) when the UI language is zh. The Korean UI uses the English logo.
- Keep 0.6 x the logo height clear on every side: 11 px in the header, 19 px on the landing. The divider rule after the logo sits outside that zone.
- Always orange on white. The logo is never recoloured, outlined, shadowed, animated or cropped. Render it through one `<BrandMark>` component. The iconfont glyph's #FF6900 is within one unit of #FF6A00: render it as delivered.

**Typeface decision:**
- The app face is **Alibaba Sans**, with **Alibaba PuHuiTi 3.0** for Chinese. These are the brand's own free faces: more recognisably Alibaba than the site's Roboto, and licensed for this use by the guide itself.
- Korean uses Alibaba Sans for Latin and the system Hangul face (Apple SD Gothic Neo or Malgun Gothic).
- **Both need a font download that the user has not approved** (see section 14). Until then the stack falls back to the brand's own fallback, Helvetica class: Helvetica Neue on macOS, Arial on Windows. That is what Alibaba Cloud's docs centre renders.
- If the user prefers parity with alibabacloud.com, Roboto is the alternate. It needs a download too.

## 3. Tokens

`tokens.css` is the source. A summary of the roles:

| Role | Tokens | Use |
|---|---|---|
| Ink | `--ink`, `--ink-2`, `--ink-3`, `--ink-disabled` | Text by rank. `--ink-3` is the lightest text allowed (5.4:1 on the record). |
| Grounds | `--sheet` (canvas, header, panel, inputs), `--record` (console), `--surface-2` (hover rows, region frames) | Two neutral layers, as Operate asks. |
| Lines | `--line-1` hairlines, `--line-2` card and frame borders, `--line-control` input and button borders (3:1 or more) | |
| Action | `--action`, `--action-hover`, `--action-press`, `--action-soft`, `--action-soft-2`, `--on-action` | Buttons, links, focus, selection, and the hover link between the record and the canvas |
| Brand | `--brand-orange`, `--brand-icon`, `--cursor` | Section 2 rules |
| Revision | `--rev-tag` (ink square, white numeral), `--rev-tag-old` (outline) | |
| State | `--ok`/`--ok-soft`, `--warn`/`--warn-soft`, `--danger`/`--danger-soft` | Requirement states, notes, errors |
| Canvas | `--frame-*`, `--card-*`, `--edge`, `--edge-path`, `--dim-opacity` | |
| Type | `--font-ui` (switches by `:lang`), `--t-*`/`--lh-*` (12, 13, 14, 16, 18, 24), `--c-*` canvas world sizes, `--num` | Fixed px; product ramp |
| Space | `--s-1`..`--s-11` (2 to 64 px, 4 px base) | |
| Radii | `--r-control` 0, `--r-card` 2, `--r-frame` 4, `--r-pop` 2 | Square, like the site |
| Elevation | `--shadow-card`, `--shadow-raise`, `--shadow-panel` | Offset with a soft blur; nothing glows |
| Motion | `--ease-out`, `--ease-in-out`, `--ease-in`, `--d-*`, `--rise`, `--cursor-blink` | Section 10; reduced-motion overrides in the file |
| Focus | `--focus-outline` (2 px blue, offset 2), `--focus-ring` (white gap plus blue) | Section 13 |
| Layout | `--header-h` 48, `--console-w`, `--panel-bar-h` 52, `--panel-open-h`, `--landing-box-w`, `--logo-h-*` | Section 4 |

**Type in use:**

| Use | Size / line height | Weight | Colour |
|---|---|---|---|
| Landing product name | 24 / 32 | 500 | ink |
| Landing lead, brief text | 18 / 28 | 400 | ink-2 (lead), ink (text) |
| Composer text, popover title | 16 / 24 | 400 (text), 500 (title) | ink |
| Ask, note, buttons, popover body | 14 / 20 | 500 (ask, buttons), 400 | ink, ink-2 (note) |
| Change lines, table body | 13 / 18 | 500 (product), 400 | ink, ink-3 |
| Meta, tags, counts, hints | 12 / 16 | 400 or 500 | ink-3 |

- Korean and Chinese paragraphs use `line-height: calc(1em * var(--lh-cjk))` and `word-break: keep-all` (ko) or the default (zh).
- Numerals in timings, counts, zoom values and revision numbers use `font-variant-numeric: var(--num)`.
- No letter-spacing below 0, no uppercase labels, and no kickers or eyebrows above headings.

## 4. Anatomy by viewport

Sizes are the browser's inner viewport. The working view is a grid: a header row of 48 px, then a console column beside a stage column. The stage holds the canvas and, below it, the products bar.

| Viewport | Console | Canvas (w x h) | Products bar | Panel open height | Canvas capacity at the zoom floor (world px) |
|---|---|---|---|---|---|
| 1280x720 | 360 | 920 x 620 | 52 | 430 | 1017 x 667 |
| 1366x768 | 382 | 984 x 668 | 52 | 461 | 1092 x 723 |
| 1440x900 | 400 | 1040 x 800 | 52 | 545 | 1157 x 877 |
| 1536x864 | 424 | 1112 x 764 | 52 | 522 | 1241 x 836 |
| 1920x1080 | 440 | 1480 x 980 | 52 | 600 | 1671 x 1087 (the max zoom of 1.25 caps it first) |

- **Console width** is `clamp(360px, 25vw + 40px, 440px)`.
- **Hide console** hides the console and the canvas takes the full width. The header's Hide console button becomes Show console. The toggle is instant with reduced motion; otherwise the width animates over 280 ms with `--ease-in-out` and the canvas refits once at the end.
- **The canvas** is the stage minus the bar: `stage height - 52`. Capacity is `(canvas - 48) / 0.857`, with 24 px of padding on each side.
- **Panel open height** is `min(600px, 64%)` of the stage, measured from the bottom of the stage and including the bar.
- **Short viewports.** Below 600 px of inner height, the working view keeps a minimum height of 600 and the page scrolls. Below 1180 px of inner width, the console keeps 360 px and the canvas shrinks; that is unsupported but must not break.
- **Header (48 px, white, 1 px `--line-1` bottom), left to right:**
  - 16 px inset;
  - the lockup: logo 18 px tall, a 12 px gap, a 1 px x 16 px `--line-1` rule, a 12 px gap, then `app.name` at 14/20 weight 500 ink;
  - 24 px gap;
  - the session title: the first ask, single line, ellipsis, 13 px ink-3, flexing to fill;
  - right group with 8 px gaps: the mode state, Hide console, Sessions, New session and the language menu;
  - 16 px inset.
- **Landing:** no header. The utility row is pinned 16 px from the top-right corner. The stack is centred horizontally at `--landing-box-w`, and its top is `max(64px, (100vh - stack height) / 2 - 24px)`. The footer line is pinned 20 px above the bottom and centred.

## 5. Landing

**Composition at 1440x900**, centred, top to bottom:
1. **Utility row, top right:** the language switch (EN · 한국어 · 中文, a three-button segmented group) and a Sessions button (ghost, clock icon). Sessions is disabled with no saved sessions; then it shows `header.noSessions` on hover.
2. **Lockup**, about 168 px from the top:
   - the logo 32 px tall;
   - a 1 px x 28 px `--line-1` rule with 20 px gaps;
   - `app.name` at 24/32 weight 500 ink;
   - the **Cursor**: a static `--cursor` bar, 0.6em x 0.18em (14 x 4 px at 24 px), sitting on the baseline 2 px after the last letter, `aria-hidden`.
3. **Lead** (`landing.lead`): 18/28 ink-2, max 600 px wide, centred, 16 px below the lockup.
4. **Brief box** (component 7.4), 32 px below the lead: 760 wide, 136 tall at rest, growing with content to 280. It is the primary action and has focus on load.
5. **Examples** (component 7.5), 40 px below the box: the heading `landing.examplesHeading` at 13/18 weight 500 ink-2, then five briefs in one ruled list, the full width of the box.
6. **Footer line**, 20 px above the bottom: `landing.footer`, 12/16 ink-3, centred. `{date}` is the catalog version from `/api/health`, or the bundled catalog's version when offline.

**At other sizes:**
- At 1280x720 the stack is about 580 px tall: it starts at 64 px and ends near 644, and the footer clears it.
- Below 640 px of inner height, the page scrolls and the footer follows the stack instead of pinning.
- At 1920x1080 nothing scales: the stack stays 760 wide and centres.

**Submit and the handoff.** Enter or Draw architecture starts the handoff (section 10):
- The brief box's text becomes revision 1's ask.
- The box itself moves to the console's composer slot, empty.
- The lockup moves into the header.
- The example list and footer fade out over 120 ms.
- The canvas slides in from the right (24 px and opacity, 420 ms).

## 6. Working view

**Console column** (`--record` ground), top to bottom:
1. **Requirements** (component 7.7): pinned at the top and never scrolled away. It shows at most 4 rows, then "{n} more" expands in place. 16 px padding, with a 1 px `--line-1` rule under it.
2. **Revision record** (7.8 to 7.12): the scroll region, flexing to fill. Revisions run oldest first. When a turn starts, the record scrolls the new revision's top into view. While it streams, the record follows the bottom, unless the user has scrolled up: then a `rec.jumpLatest` chip (12 px, ghost) appears at the bottom of the record.
3. **Composer** (7.13): fixed at the bottom, 16 px padding, with a 1 px `--line-1` rule above it.

**Stage column** (`--sheet` ground):
1. **Canvas** (7.15 to 7.24): fills the stage above the products bar. Zoom tools sit 12 px from the top-right corner and the legend 12 px from the bottom-left. The pan hint appears bottom-centre when needed.
2. **Products bar** (7.25): 52 px, a 1 px `--line-1` top border, and the ^ handle tab centred on its top edge.
3. **Products panel** (7.26): when open, it rises from the bar over the canvas, to `--panel-open-h`.

**Focus order** is in section 13.

## 7. Component inventory

Every interactive component has these states: default, hover, focus-visible, active (pressed), disabled, and loading or error where it applies. Buttons share one vocabulary:

| Button | Rest | Hover | Pressed | Disabled |
|---|---|---|---|---|
| Primary | `--action` fill, white 14/20 weight 500 text, 0 radius, 36 px tall (32 in the header), 16 px side padding | `--action-hover` | `--action-press`, 1 px inset translate | `--line-1` fill, `--ink-disabled` text |
| Secondary | white fill, 1 px `--line-control` border, ink text | `--surface-2` fill, ink border | `--action-soft-2` | `--ink-disabled` border and text |
| Ghost | no fill or border, ink-2 text | `--surface-2` fill | `--action-soft-2` | `--ink-disabled` |
| Icon-only | 32 x 32 at least, with an `aria-label` and a tooltip after 600 ms | | | |

- Icons are one authored stroke set: 1.5 px strokes on a 16 px grid, `currentColor`, square caps where possible. Product icons come only from `apps/web/src/icons` (`iconFor`, `ProductIcon`). Never use emoji or Unicode glyphs as icons.
- Focus-visible uses `--focus-outline` on everything; filled buttons and canvas cards use `--focus-ring`.

### 7.1 BrandMark (lockup)
- **Anatomy:** logo (`LOGOS.en`, or `.zh` when the UI is zh), then the rule, then `app.name`. The landing adds the Cursor.
- The lockup is a link to the landing: "Alibaba Cloud Architecture Builder, home". It is enabled only when no turn is streaming. On hover the product name underlines (1 px, offset 3).
- **Content:** the product name is a working title (section 14). Never add a tagline to the lockup.

### 7.2 LanguageSwitch
- **Landing:** a segmented group of three buttons (EN, 한국어, 中文), 32 px tall, each with `lang` set and `aria-pressed`.
- **Working view:** a ghost button showing the current code (EN, KO or 中文) that opens a menu of the three (`header.languageMenu`).
- Switching changes the UI strings, `html[lang]`, the font stack and the example variants. It never changes the conversation: Qwen replies in the language of the ask.

### 7.3 Header mode state
- A 12 px meta label with an 8 px square dot in front:
  - "Live" (`header.live`, `--ok` dot): `/api/health` answered with `keyConfigured: true`;
  - "Replay" (`header.replay`, `--warn` dot);
  - "Offline" (`header.offline`, `--danger` dot): health failed, or `keyConfigured: false`.
- The label is not a button. Its tooltip names the model from `/api/health` (for example "qwen3.8-max, Singapore endpoint").

### 7.4 BriefBox (landing)
- **Anatomy:**
  - a `<textarea>` labelled by the lead (`aria-labelledby`), 18/28 ink, 20 px padding;
  - the placeholder `landing.placeholder` in ink-3;
  - a bottom row (the hint `landing.hint` 12/16 ink-3 on the left, the primary button `landing.submit` with a send icon on the right).
  - The box is white with a 1 px `--line-control` border and 0 radius.
- **States:**
  - **Empty:** the placeholder shows and the orange caret blinks (the browser's caret). The button is enabled; submitting empty text shakes nothing, but focuses the box and announces `landing.empty`.
  - **Typing:** the box grows with content from 136 to 280 px, then scrolls inside. The border turns `--ink-3`.
  - **Focus:** a 1 px `--action` border plus a 1 px `--action` inner shadow, so the frame reads 2 px with no layout shift.
  - **IME composition (Korean or Chinese):** while `compositionstart` to `compositionend` is open (or `event.isComposing`, or keyCode 229), Enter never submits; it commits the composition. The hint swaps to `landing.imeHint` while composing. Underlines in the composition are the browser's; never restyle them.
  - **Over the limit:** past `limits.askChars` from `/api/health` (6000 today), the hint becomes `landing.tooLong` in `--danger`, and the button disables.
  - **Submitting:** the button shows a 14 px spinner in place of its icon for at most 150 ms, then the handoff starts. The handoff never waits for the network.
  - **Offline:** the box still works. Submitting shows the offline notice (7.29) under the box and keeps the text.
- **Keys:** Enter submits; Shift+Enter inserts a newline; Escape clears the selection only.
- Any string a builder finds missing gets an English key added to `strings.json`, with Korean and Chinese drafted through Qwen and reviewed. Never hard-code copy.

### 7.5 ExampleList (landing)
- A `<ul>` of five `<button>` rows: 44 px tall, with a 1 px `--line-1` rule between rows and above the first.
- **Row anatomy:**
  - the tag (`example.tag.*`) in a 152 px column, 13/18 ink-3;
  - the brief in the matching language, 14/20 ink, one line with an ellipsis;
  - on hover or focus, a 16 px arrow icon at the right and the row ground `--surface-2`;
  - `aria-label` is `landing.useExample` plus the full brief.
- **Click:** fills the BriefBox with the full brief, moves focus to the end of the text, and does not submit. The architect usually edits it first.
- **Content:** only the briefs in `examples.json`, in its order. Never invent briefs.

### 7.6 Sessions and New session
- **Sessions** opens a menu of saved sessions from local storage: title (the first ask), date, and revision count. The menu also has New session. With none saved, it says `header.noSessions`. Sessions save after every commit.
- **New session** clears to the landing; it asks nothing, because the old session is saved.

### 7.7 Requirements block
- **Heading row:** `req.heading` at 13/18 weight 500 ink-2, plus the count (12 ink-3, tabular).
- **Empty:** the heading plus `req.empty` (13/18 ink-3, max 3 lines). This is the first-run teaching state: it says what goes here.
- **Requirement row:**
  - a 16 px state icon;
  - the requirement text (14/20 ink, wraps up to 3 lines);
  - the state label at the right (12/16 weight 500);
  - a meta line under it (12/16 ink-3), built from the constraint: `req.staysIn` with region names (from `packages/core/src/regions.ts`), or `req.ruledOut` with product short names;
  - when the row is the latest revision's, `req.new`.
- **States:**

| State | Icon and label | Colour | When |
|---|---|---|---|
| Held | check, `req.held` | `--ok` | After commit, when no constraint warning is open |
| Checking | dotted ring, `req.checking` | `--warn` | Mid-turn, after a `constraint-region` or `constraint-avoid` warning and before commit |
| Held, fixed | check, `req.repaired` ("Kept by a fix in revision {n}") | `--ok` label, `--warn` meta | After a commit whose repair resolved it |
| Not met | cross, `req.broken` | `--danger`, row ground `--danger-soft` | After a commit that still carries the warning |

- **Unpin:** on row hover or focus, a ghost icon button (`req.unpin`) appears. It removes the requirement from `memory.requirements` and its constraint, then shows a 6 s toast (`req.unpinned`, `req.undo`).
- **New requirement:** when a `req` op arrives, the row enters at the bottom of the block (opacity and height, 240 ms). Its ground holds `--action-soft` for 1.2 s, then fades to the record ground, and `live.reqPinned` is announced.

### 7.8 Revision (expanded)
The newest revision is always expanded. Older ones collapse to RevisionRow (7.9) when a new turn starts, unless the user opened them.

- **Anatomy:** a two-column grid, with a 32 px gutter for the tag and the body beside it. 16 px side padding, 16 px between revisions, and a 1 px `--line-1` rule between revisions.
  - **Tag:** the revision number in a 20 x 20 square. It is `--rev-tag` (ink fill, white numeral 12/16 weight 700) while it is the latest committed revision, and an outline (`--rev-tag-old`) otherwise. While streaming it is an outline with an ink numeral. The tag is a button: pressing it highlights the revision's cards on the canvas (section 7.24).
  - **Ask** (`rec.askLabel` is the visually hidden label): the user's words verbatim, 14/20 weight 500 ink, up to 6 lines, then `rec.showAll`.
  - **Note:** the narration (the `say` lines joined), 14/20 ink-2, one paragraph. A repair-phase note gets its own paragraph in the FixBlock (7.11).
  - **Change list** (`rec.changesLabel` is the visually hidden label): ChangeLines (7.10), at most 8 visible, then `rec.more` toggles the rest (`rec.fewer`).
  - **Footer:** 12/16 ink-3 tabular, items separated by " · ": `rec.done` (from the commit's turn time), then `rec.reqHeld` with a 12 px check in `--ok` when every requirement holds. Otherwise the footer names the state: `rec.footerFixed` in `--warn`, or `req.broken` in `--danger`.
- **Content rules:**
  - The ask is never edited or summarised.
  - The note is Qwen's text, verbatim.
  - Product names in change lines are catalog short names, never the model's spelling.

### 7.9 RevisionRow (collapsed)
- 48 px: the outline tag, the ask on one line (14/20 weight 500 ink, ellipsis), and a meta line (12/16 ink-3: "+{added} −{removed} · {s} s", plus the state when it is not Held).
- The whole row is a button with `aria-expanded`. It expands in place over 200 ms with height and opacity.
- Hovering the row highlights its cards, the same as the tag.

### 7.10 ChangeLine
- One line per change, 13/18. Laid out as: a 16 px mark (plus, minus, arrow or dotted ring), the product short name (weight 500 ink), the card label when it differs from the short name (ink-3), then the detail (ink-3, after " · ").
- **Kinds** (derived from the op events; section 9):

| Kind | Mark | Example |
|---|---|---|
| Added card | plus, ink | `+ RDS  DR read replica · zone B` |
| Added badge or attachment | plus, ink | `+ WAF · on ALB` (`rec.attached`) |
| Removed card | minus, ink-3, and the name struck through 1 px | `− ESA  · Fintech customers to ESA` |
| Replaced (remove plus add of the same lane in one turn) | arrow | `ECS → ACK  Portal servers` |
| Moved or re-zoned | arrow | `Customer DB · zones A, B → A` |
| Connections | plus or minus | `+ 2 connections` (`rec.connections.*`), `− 1 connection` (`rec.connectionsRemoved.*`); detail lists the ends ("Fintech customers to GA to ESA") when 3 or fewer |
| Planned, not drawn yet | dotted ring, ink-3 | `Milvus · planned` (`rec.planned`), from the `plan` op; the line becomes "Added" when the card lands |
| Recommendation (solution map) | plus | `+ Qoder Teams · Recommended` (`rec.recommended` or `rec.optional`) |
| Gap | info ring, `--warn` | `rec.gap` with the need, plus the note as detail |

- **Hover or focus** on a line: the line's ground turns `--action-soft`, and its cards are highlighted on the canvas (7.24). A line for a removed card shows that card's dashed ghost while hovered.
- **Order:** the order the ops arrived in. Connections aggregate into one line per turn, updated live.

### 7.11 FixBlock (inside a revision)
A block below the change list (12 px top margin), with a 1 px `--line-2` border and no coloured stripe. It appears in three cases:
- **Deterministic repairs** (warnings with `repaired: true`, such as `attach-inline`, `zone-replicas`, `missing-group` or `path-order`): one collapsed line, `rec.autoFixes.*` in 12 ink-3, which expands to the list. The list shows our own wording per code, never the raw `msg`.
- **A constraint fixed by the repair turn:**
  - The status line `Fixing the diagram…` (the server's status text, 12 `--warn`, with the Cursor blinking) shows while the repair streams.
  - When it is done, the title `rec.fixed` shows at 13/18 weight 500 `--warn`. Under it go the human sentence (`rec.fixRegion` or `rec.fixAvoid`, built from the warning's ids, card labels and pinned regions), then the repair-phase note (14/20 ink-2), then its own change lines.
  - Example, from the recorded zh-trap-08-sydney run: the turn labelled the users "Australian customers", which the check read as data in Sydney under the pin "data must stay in Singapore". The repair relabelled them. In English: "Fintech customers was drawn outside Singapore. Qwen fixed it before the change was saved."
- **Repair failed** (the commit still carries the warning): the revision did commit, so this is not an error block. The FixBlock shows the `--danger` line `rec.fixFailed`, and the requirement shows Not met.

### 7.12 Inline notes and status lines (inside a revision, after the note)
- **Lifecycle note** (from `alias-resolved`, `retired-product`, `china-only` and `restricted` warnings): an info icon, then 13/18 `--warn` text from `rec.lifecycle.renamed`, `rec.lifecycle.retired`, `rec.lifecycle.chinaOnly` or `rec.lifecycle.restricted`. Names come from the catalog: the old name from the alias, the new one from the entry. Example: "Tongyi Lingma is now Qoder." One line per product per revision.
- **Status line** (from a `status` event): 12/16 ink-3 with a leading 8 px Cursor (`--cursor`, blinking): the server's localized `text` ("Switching to a backup model…", "Trying again…", "Continuing the answer…"). Only the latest status shows; it clears when the next say or op arrives. `summary` status shows in the SummaryNote, not here.
- **Truncated** (`done.truncated` with no continuation): `rec.cut` in 12 `--warn`.
- **Waiting:** before the first token, the note slot shows `rec.waiting` (14/20 ink-3) followed by the Cursor, blinking. After 8 s it becomes `rec.waitingSeconds` with a live counter (tabular).

### 7.13 Composer
- **Anatomy:** a white box with a 1 px `--line-control` border and 0 radius.
  - The `<textarea>` (`composer.label`, placeholder `composer.placeholder`): 16/24 ink, 12 px padding. It grows from 1 line (48 px box) to 8 lines, then scrolls.
  - A bottom row: the hint `composer.hint` (12 ink-3), and the send icon button (primary, 32 x 32, `composer.send`).
- **States:**
  - Idle, typing, focus and IME are the same as the BriefBox.
  - **Streaming:** the send button becomes a secondary Stop button (stop icon plus `rec.stop`). The textarea stays editable, so the next message can be drafted, but Enter does not send. The hint reads `composer.busy`.
  - **After Stop:** the revision shows `rec.stopped`, and the canvas returns to the committed graph.
  - **Over the limit:** `error.tooLong` in `--danger`, and send disables.
  - **After a fatal error:** "Edit and resend" puts the failed ask back into the composer.
- **Keys:** Enter sends; Shift+Enter inserts a newline; Escape while streaming does nothing (Stop is explicit).

### 7.14 SummaryNote (rolling summary)
- When a `summary` event arrives (older turns folded into `memory.summary`), a note appears at the top of the record, above the oldest revision, 12/16 ink-3:
  - `rec.summaryNote` with n = the last folded revision;
  - a ghost toggle `rec.showSummary` or `rec.hideSummary` that expands the summary text (13/18 ink-2) under the heading `rec.summaryHeading`.
- The revisions stay visible in the record, because the browser keeps the full history; only what Qwen remembers changed.
- While the summary is being written (the `summary` status), the note shows `STATUS_COPY.summary` with the Cursor. It never blocks the composer.

### 7.15 Canvas (stage)
- `@xyflow/react` 12, with nodes and frames from `layoutGraph(displayGraph(...).graph, catalog, prev, { canvas: { w, h } })` and edges from the spike's router (`spikes/canvas/src/routing`). The white `--sheet` ground has no dot grid and no pattern.
- **Fit:**
  - `zoom = min((w - 48) / bboxW, (h - 48) / bboxH, 1.25)`, then `max(zoom, 0.857)`.
  - When the floor binds, the diagram is larger than the view. Align its top-left (the request path starts there) and show the PanHint.
  - Refit only at turn start (the first batch of the first turn) and at commit, never per batch mid-turn, because the customer is reading. A refit animates over 300 ms with `--ease-out`.
- **Interaction:**
  - Drag pans; wheel scrolls; Ctrl or Cmd plus wheel zooms within 0.5 to 1.25.
  - Below 0.857 the zoom tool shows the value in `--warn`, and card titles may go below 12 px. That is the user's choice; the app never chooses it.
- **Empty (first turn, before the first card):** centred, 14/20 ink-3, `canvas.reading`, then the Cursor blinking.

### 7.16 Frame
- **Region:** `--frame-region-fill`, 1 px `--frame-region-line`, `--r-frame`. The label is `{name}` 12/16 weight 500 ink-2, then 8 px, then `{region id}` 12 ink-3, at 12 px insets.
- **VPC:** white fill, 1 px `--frame-vpc-line`, label "VPC" in ink-3 then the name in ink-2 weight 500.
- **Zone:** no fill, 1 px dashed `--frame-zone-line` (4 3), label `canvas.zone`.
- **Edge network and global:** `--frame-edge-fill`, no border.
- **External (internet, on-prem):** no fill, 1 px dashed `--frame-ext-line`.
- **Account and SaaS bands, solution-map lanes:** `--frame-band-fill`, no border; the label as above.
- **Lane label** (shelf blocks: Storage, Security, AI, Operations): 12/16 weight 500 ink-3, no box.
- Frames never animate their borders. They resize with the same 300 ms move as their cards.

### 7.17 Card
- **Size:** `GEOMETRY.cardW` x `GEOMETRY.cardH` from core (section 11 requests 192 x 64).
- **Look:** white fill, 1 px `--card-line`, `--r-card`, `--shadow-card`.
- **Anatomy,** in world px:
  - 10 px side padding and 6 px top and bottom; a 28 px icon slot with the product icon at 20 px (`--brand-icon`), no tile fill; an 8 px gap before the text column (136 px at cardW 192); the text block centres vertically;
  - the title: the card label, 14/18 weight 500 ink, at most 2 lines, then ellipsis. Labels such as "Global Accelerator" and "Model Studio (Qwen)" need the second line at 136 px, so the card is sized for it;
  - the subtitle: the catalog short name when the label differs from it, else the category; 12/16 ink-3, 1 line;
  - zone chips at the right of the subtitle line: "A B" at 12 weight 500 ink-3, tabular.
- **States:**
  - **Rest.**
  - **Hover:** `--shadow-raise`, border `--ink-3`, and the popover after 300 ms.
  - **Focus-visible:** `--focus-ring`.
  - **Highlighted** (linked from the record or the panel): a 2 px `--action` outline offset 2, and the other cards and edges drop to `--dim-opacity`.
  - **New in a streaming revision:** the BuildMark (7.18).
  - **Latest committed revision:** the revision tag (7.19).
  - **Lifecycle caution:** a 12 px `--warn` info icon top-right, with the note in the popover.
  - **Exiting:** the ghost (section 10).
- **Accessible name:** "{label}, {full product name}, {where}". `aria-describedby` points to the popover content.

### 7.18 BuildMark (the Cursor on the canvas)
- A `--cursor` bar, 24 x 3 world px, inset 10 px from the card's bottom-left, flush with the bottom border. It shows on every card this streaming revision added, from its entrance until commit. It does not blink on cards; only the record's Cursor blinks.
- At commit, all marks fade out together over `--d-settle` (1.2 s) while the revision tags fade in. Removed cards have no mark.
- With reduced motion, the mark cross-fades over 120 ms.

### 7.19 Revision tag on a card
- An 18 x 18 square at the card's top-right corner, overlapping the border by 6 px: `--rev-tag` fill, white numeral 12 weight 700. It shows only on cards added or changed by the latest committed revision.
- It is a button: it highlights the revision's cards and scrolls the record to that revision. Older revisions are reachable from the record and the panel's Rev. column.

### 7.20 Badge and attachment
- **Badge** (an `attachTo` product drawn on its host, such as WAF on ALB or Auto Scaling on ECS): a 20 px tall chip on the host's top edge, 6 px from the left. White fill, 1 px `--card-line`, `--r-card`, a 12 px icon, then the short name 12 weight 500 ink-2. Several badges stack left to right with 6 px gaps.
- **Attachment** (`as: 'attachment'`, such as EIP on NAT): the same chip on the host's bottom edge.
- Badges have their own hover popover and tab stop after their host.

### 7.21 Edge
- Orthogonal, from the router, with a 1.5 px `--edge` line.
- **Kinds:**
  - **The request path** (users to entry, through ingress to compute, then to the data tier): 2 px `--edge-path`.
  - **async:** dashed 5 4.
  - **resolve:** dotted (0.1 4.5, round caps) with no arrowhead.
  - **control** (keys, logs, backup, NAT, firewall): hidden by default and drawn 1 px dashed when either end is hovered, focused or highlighted. They are always listed in the panel.
- **Arrowheads:** open chevrons 7 px, in the line's colour.
- **Labels** (`label`): 12 ink-3 on a white 2 px-padded plate at the longest segment's midpoint; omitted when the segment is shorter than the label plus 16.
- **New edges** while streaming draw in 1.5 px `--ink-2`. There is no orange on edges.

### 7.22 ZoomTools
- A white strip, 1 px `--line-1`, 0 radius, 32 px tall: zoom out, the value (12 tabular, ink-2; `--warn` below the floor), zoom in, a rule, then fit. Each button is icon-only with an `aria-label` (`canvas.zoomOut`, `canvas.zoomIn`, `canvas.fit`).

### 7.23 Legend and PanHint
- **Legend:** bottom-left, `aria-hidden`, 12/16 ink-3. Four samples: Request path, Data, Async, Resolves. Hidden when the diagram is a solution map.
- **PanHint:** `canvas.pan`, 12/16 ink-2 on white with a 1 px `--line-1` border, bottom-centre. It shows for 6 s after a fit that hit the floor, and again on hover of the zoom value.

### 7.24 Highlight link (record and panel to canvas)
- The sources are: a ChangeLine, a revision tag, a RevisionRow, a card's revision tag, and a panel row.
- On hover or focus of a source, the matching cards get the Highlighted state and the rest dim to `--dim-opacity` over 120 ms. Leaving restores them over 120 ms.
- If a highlighted card is off-screen, the canvas does not pan on hover; it pans (300 ms) only on click or Enter.

### 7.25 Products bar and ^ handle
- **Bar** (52 px, white):
  - left: `panel.title` at 14/20 weight 500, the count (13 ink-3 tabular), and "· why each one is here" (13 ink-3) when collapsed;
  - right: `panel.aiNotice` · `panel.catalog`, 12/16 ink-3.
  - The whole bar is clickable to open the panel.
- **Handle:** a 56 x 20 tab centred on the bar's top edge, overlapping the canvas by 20 px. White, with a 1 px `--line-control` border on the top and sides and 0 radius, and a 16 px chevron (^ collapsed, v expanded) in ink-2.
  - It is a `<button aria-expanded aria-controls="products">` labelled `panel.expand` or `panel.collapse`.
  - Hover: `--surface-2`. Keys: Enter and Space toggle; Escape closes the panel from inside it.
- **Empty** (before the first card): the count shows 0 and the bar reads `panel.empty`.

### 7.26 Products panel (expanded)
- It rises over the canvas to `--panel-open-h` (280 ms, `--ease-in-out`), with `--shadow-panel` on its top edge and a white ground. The canvas behind it stays interactive above the panel's top edge.
- **Table:** sticky header row; columns `panel.col.product` (220), `panel.col.why` (flex), `panel.col.where` (150), `panel.col.notes` (240), and `panel.col.rev` (56, right-aligned).
  - **Group rows** follow the frames: Internet, Global, Edge network, "{Region} · {VPC}", "{Region} · regional services", Account. They are 12/16 weight 500 ink-2 on `--surface-2`.
  - **Product rows** (13/18): the icon 16, the short name (weight 500 ink) and the label (ink-3) when it differs; the why text (ink); where (zones, host or frame; ink-3); notes (lifecycle note in `--warn`, else the catalog `note` in ink-3); and Rev. (a tag button, filled for the latest revision).
  - Badges list under their host, indented 16.
  - Rows hover and focus to link (7.24). The table has `aria-label` `panel.title`.
- **Solution map variant** (recommendations, no infrastructure): columns Product, Why, Fit (`rec.recommended` or `rec.optional`), Price (`rec.priceAsOf`, or `rec.noPrice`), and Rev. Prices come only from the catalog's `price.summary` and `price.asOf`.
- **Control edges** show as a "Connections" disclosure at the bottom of the table: from, to, label and kind.

### 7.27 Popover (why it's here)
- 320 px wide, white, 1 px `--line-2`, `--r-pop`, `--shadow-raise`, 16 px padding. It is positioned beside the card, never covering it, flipped to stay inside the canvas, and rendered in a portal so the canvas never clips it.
- **Anatomy:**
  - header: the icon 20, the full product name (16/24 weight 500), and the category · where (12 ink-3);
  - `pop.why` (12 weight 500 ink-3), then the node's `why` (14/20 ink);
  - `pop.what`, then the catalog `purpose` (14/20 ink-2);
  - the lifecycle or catalog note (13 `--warn`) when present;
  - the price for offerings (`pop.price`);
  - footer: `pop.addedIn` (12 ink-3) and `pop.productPage` (a link to the catalog `docs` URL, external icon, new tab) when present.
- **Opening:** hover after 300 ms, focus at once. **Closing:** pointer leave with 150 ms grace, blur, or Escape. Only one is open at a time. `role="tooltip"` when it holds no link; with the link it becomes a non-modal dialog opened on focus or click, so the link is reachable by keyboard.
- **Content rule:** `why` is the model's reason, verbatim; `purpose` is the catalog's. If `why` is missing, show `purpose` under `pop.what` only.

### 7.28 Solution map (product-need answer)
- When a turn emits `rec` ops and no infrastructure nodes, the canvas switches to the solution-map layout (core `solutionLane`): four lanes left to right, `canvas.lane.team`, `canvas.lane.saas`, `canvas.lane.model` and `canvas.lane.cloud`.
- **Cards:**
  - a recommended card shows a `rec.recommended` chip (12 weight 500, white on `--ink`, 0 radius) on its top edge;
  - an optional card shows a `rec.optional` outline chip;
  - the price line (12 ink-3, "$40/seat/month · as of 2026-10-31") replaces the subtitle when the catalog has a price.
- **An empty Cloud resources lane** shows `canvas.mapEmpty` (12 ink-3, centred, dashed 1 px `--line-2` box).
- **Record:** the change lines are recommendation lines (7.10). The note is Qwen's question or answer. For example, from need-01: "For 15 developers, Qoder Teams is the right fit: team seats, SSO and admin controls. Do you also need a token plan?"

### 7.29 Offline notice and replay banner
- **Offline notice** (landing, under the BriefBox; in the working view, at the top of the record):
  - a 1 px `--line-2` box, 16 px padding;
  - `offline.title` (14 weight 500 ink) and `offline.body` (13 ink-2);
  - buttons: Try again (secondary, `offline.retry`; re-checks `/api/health` and shows `offline.checking` while it runs) and `offline.replay` (ghost).
  - Never block the screen with a modal.
- **Replay banner** (top of the console, above the requirements):
  - 12/16 ink-2 on `--warn-soft`, with no border stripe: `replay.banner`;
  - controls: speed (1x, 4x, instant; `replay.speed`), `replay.restart`, and `replay.exit`.
  - The header mode shows Replay, and the composer is disabled with the placeholder `composer.replayReadOnly`.
- **Replay data:** recorded turns, the content NDJSON with timings (see section 14).

### 7.30 Toast
- Bottom-left of the console, 12 px above the composer: white, 1 px `--line-2`, `--shadow-raise`, 0 radius, 13 ink. One action button, auto-dismissed after 6 s (paused on hover or focus), `role="status"`.
- Used for the unpin undo and for `session.restored`.

### 7.31 Export proposal and the writing overlay
- **Why it exists (2026-11-02, the owner's feedback):** the proposal must explain *why*, not only *what*, at a level sales and C-level readers follow, and address the customer's own scenario and pain points where the conversation names them. Writing that takes about a minute, so the wait gets an overlay that shows progress and can be stopped.
- **The export dialog** (header popover, unchanged in form): title, customer, Download PDF, Close. Its hint says the proposal explains why the design fits. Its note reports how the export ended: `dialog.done`, `dialog.doneBasic`, `dialog.stopped` ("Stopped. Nothing was downloaded."), `dialog.closed`.
- **Download** opens the overlay and posts the session to `POST /api/proposal` (contract: `ProposalRequest` and `ProposalEvent` in `packages/core/src/types.ts`). The PDF code loads while the narrative is written; the PDF is laid out in the tab when it arrives.
- **The overlay** is modal, over the workspace:
  - **Container:** `role="dialog"`, `aria-modal="true"`, labelled by its title and described by its hint. The workspace (`#root`) is `inert` behind a veil of `--record` at 84%, so the diagram stays faintly in view in both themes.
  - **Sheet:** 464 px wide, `--surface-pop`, 1 px `--line-2`, `--r-pop`, `--shadow-raise`, 20 px padding. A 2 px `--action` sweep runs on its top edge while it works, as on the export dialog. Orange never appears: the Cursor belongs to the live build.
  - **Head:** the title (16/24 weight 500) and the elapsed time (13 ink-3, tabular, `role="timer"`). Under it, `overlay.hint` (13 ink-3): "This usually takes about a minute."
  - **Steps:** a ruled list like the requirements block, rows at least 32 px, 13/18. Each row has a 16 px mark, the step and a count:
    - done: a `check` in `--ok`, ink-2 text;
    - active: a turning `spinner` in `--action`, ink text weight 500, `aria-current="step"`;
    - pending: a 5 px hairline square, ink-3 text.
  - **The steps, driven by the sections as they arrive:** Reading the conversation → Executive summary → Customer priorities (count) → Business outcomes (count) → Why each component (k of N, N = the products in the design that get a reason: constructs such as users or a mobile app are not counted) → Trade-offs and next steps → Laying out the PDF.
  - **Latest:** a 12 ink-3 label over the latest written line (13/18 ink-2, two lines held). The line is the need or outcome title, or the first sentence of anything else; a component's reason is prefixed with the product's name unless it already names it. A new line replaces the shown one no faster than once every 1.6 s and rises in over 300 ms. It is `aria-hidden`, because a polite live region announces only the active step. The sheet is not `aria-busy`, so that region is announced while the proposal is written. When the button that had focus goes away (Stop when the PDF is ready, Try again or Download basic version when work starts again), focus returns to Stop when it is there, else to the sheet.
  - **Slow:** a `status` event adds `overlay.slow` (12 ink-3, "Taking a little longer…") and nothing else. Nothing on screen ever names who writes.
  - **Stop:** a secondary button with the `stop` icon, always visible while it works, at the trailing edge. It aborts the request and closes the overlay; nothing downloads, and focus returns to Download. **Escape does not stop:** an accidental key must not throw away a minute of work.
- **Done:** the title becomes `overlay.ready` and the bar fills. The PDF downloads, the overlay holds for 0.9 s, then it closes, and the dialog notes the file.
- **Failed:** the title becomes `overlay.failedTitle`. The hint becomes the error (14/20 `--danger`, `role="alert"`): the server's own message for the codes it writes for people (quota, busy, signed out, not approved, the draft's own failures), else ours (`overlay.error.network`, `.incomplete`, `.generic`, `.layout`); a refusal such as bad-json or body-too-large carries developer English and shows `.generic`. A quota refusal is not retryable. Under it, `overlay.basicOffer` says what the basic version holds. Three ways forward:
  - Download basic version (primary, takes focus): the PDF without the narrative, exactly as before this feature;
  - Try again (secondary): only when the error is retryable. After a failed layout it lays out the same version again (the basic one after the basic one failed), without writing a new proposal;
  - Close (ghost, at the trailing edge).
  - Escape closes in this state.
- **Unavailable** (a replay, an offline session, a server without the route): `overlay.unavailableTitle` and `overlay.unavailable`, then Download basic version and Close. No request is sent from a replay or an offline session.
- **Reduced motion:** the spinner and the bar hold still, the sheet fades, and new lines simply appear.
- **Narrow windows:** the sheet keeps a 16 px gutter and scrolls inside itself when the window is short.
- **The PDF with a narrative:**
  - **Order:** cover → Executive summary (the lead paragraph at 12 pt, then body; the outcomes as titled blocks; then "What we propose next", the first two next steps, numbered) → "What you told us, and how the design answers it" (headed "What businesses like yours usually need, and how the design answers it" when fewer than half of the needs are the customer's own words) → diagram → Components → Recommendations → "Considerations and next steps" → Design record (the old Summary; the first chat reply titled "Architect's first notes") → Connections → Revision history.
  - **Needs:** each one shows its source line: the customer's words in quotation marks (followed by "(original wording)" when they are in another language than the document), "Implied by what you described", or "Typical for businesses like yours".
  - **Components** lead with "Why it's here" (the drafted reason, else the drawing's), before the catalog facts, the dated price and the documentation link. A construct (users, a mobile app) has no documentation row.
  - **Trade-offs** carry how each is handled; next steps are numbered. When no product of the design has a catalog price, a line after the next steps says the account team will prepare a cost estimate.
  - **Without a narrative** the PDF is exactly the basic document.
- **Strings:** `src/export/strings.json` (`overlay.*`, `dialog.*`, `exec.*`, `needs.*`, `next.*`, `record.*`, `components.why`), mirrored in this spec's `strings.json` under `export.*`.
- **Evidence:** `apps/web/scripts/export/e2e-overlay.mjs` (screenshots in `apps/web/screenshots/export/overlay/`, plus behaviour checks) and `npm run export:samples` (`draft-*` samples).

## 8. States

Each state lists what shows in the console, canvas, panel and header. "Rev n" is the revision in progress.

| # | State | Trigger | Console | Canvas | Panel / bar | Header |
|---|---|---|---|---|---|---|
| L1 | Landing, empty | app load, no session | — | — | — | (none) |
| L2 | Landing, typing | input | BriefBox grows; hint stays | — | — | — |
| L3 | Landing, IME composing (ko, zh) | `compositionstart` | hint `landing.imeHint`; Enter commits the composition | — | — | — |
| L4 | Landing, offline | `/api/health` fails or `keyConfigured: false` | offline notice under the box; examples stay | — | — | — |
| W1 | Submitting, waiting for the first token | submit | handoff; Rev 1 with the ask; note slot shows `rec.waiting` plus the blinking Cursor; composer in streaming mode; `live.started` | `canvas.reading` plus the Cursor | bar count 0, `panel.empty` | Live |
| W2 | Streaming narration and ops | first `say` or `op` | the note types in (partial `say` text), Cursor solid at its end; `plan` makes the planned lines; each `node`/`insert` turns a line to Added | frames and cards enter (displayGraph), BuildMarks on new cards; no refit after the first batch | count updates live | Live |
| W3 | Status: fallback, retry or continue | `status` event | status line with the Cursor; the note keeps what arrived | unchanged | — | — |
| W4 | Repair turn: constraint fixed | `warn` constraint-*, then `status` repair, then repair-phase say and ops | requirement shows Checking; FixBlock with "Fixing the diagram…", then `rec.fixed` with the sentence, the repair note and its change lines | cards change in place; a relabelled card keeps its position | — | — |
| W5 | Lifecycle note | `warn` alias-resolved, retired-product or china-only | inline note, for example "Tongyi Lingma is now Qoder." | the card shows the catalog's current product, plus the info icon when caution remains | Notes column | — |
| W6 | Done (commit) | `commit` | Cursor leaves; footer `rec.done` · `rec.reqHeld`; requirements show their states; `live.drawn` | refit (300 ms); BuildMarks hand over to revision tags; the display equals the committed graph | count final | Live |
| W7 | Follow-up | submit in the composer | the previous revision collapses to a row; Rev n+1 starts as W1 (the waiting text sits in the note slot; the canvas keeps the committed diagram, with no reading state) | committed diagram stays; new cards enter in place; removals exit through ghosts | — | — |
| W8 | Fatal | `fatal` | the revision keeps its ask; error block: `rec.failedTitle`, the server's `message`, then Try again (if `retryable`) and Edit and resend; `live.failed` | the turn's streamed cards exit; the committed graph returns | count back | Live |
| W9 | Content filtered | `fatal` with code `content-filtered` | as W8 with the server's content-filter message; no Try again (only Edit and resend) | as W8 | — | — |
| W10 | Stopped by the user | Stop | `rec.stopped` in the footer, ink-3 | as W8 | — | — |
| W11 | Network drop mid-stream | the fetch stream errors with no `fatal` | as W8 with `error.network`; Try again | as W8 | — | Offline if health then fails |
| W12 | Server unreachable, replay | health fails, or the user picks `offline.replay` | replay banner; the record plays a recorded session with its timings; composer read-only | plays exactly as live | as live | Replay |
| W13 | Product-need answer | `rec` ops, no nodes | change lines are recommendations; the note may ask a question | solution map (7.28) | solution-map columns with prices | Live |
| W14 | Long session, rolling summary | `summary` status, then `summary` event after `commit` | SummaryNote at the top of the record; older revisions are rows | unchanged | — | — |
| W15 | Restored session | open from Sessions | the record rebuilt from memory: rows plus the latest revision expanded; toast `session.restored` | the committed graph, fitted, with no entrance animation | — | Live or Offline |
| W16 | Hide console | header toggle | hidden | full width; refit | full width | the toggle reads Show console |

## 9. Stream events to UI

The browser POSTs `TurnRequest` (`sessionId`, `ask`, `memory`) to `http://127.0.0.1:8787/api/turn` and reads NDJSON lines: `TurnEvent & { phase }` or a `ServerEvent`. One reducer owns the turn state, which is: the working raw graph (starting from `memory.graph`), the display state for `displayGraph`, and the record model for revision n.

| Event | Phase | UI effect |
|---|---|---|
| `say` (`id`, `text`, `final`) | main | Replace the note paragraph's text for that `id` (the partial text grows). The Cursor follows the last character. Several says join with a space. |
| `say` | repair | The same, into the FixBlock's note. |
| `op` with `op.t = 'req'` | any | Pin the requirement row (7.7); add the constraint when `regions` or `avoid` is present. |
| `op` `plan` | main | Planned lines for products not yet drawn (catalog short names, deduplicated). |
| `op` `group`, `node`, `insert`, `edge`, `move`, `remove` | any | Apply to the working raw graph with core `applyOp` (the server already validated). Recompute `displayGraph` per 180 ms batch, then `layoutGraph(display, catalog, prevLayout, { canvas })`, then animate the diff. Change lines come from `added`, `updated` and `removed`, mapped to catalog names. |
| `op` `rec` | any | A recommendation line; the solution map. |
| `op` `gap` | any | A gap line. |
| `op` `done` | any | Nothing visible: wait for `commit`. |
| `warn` | any | By code: lifecycle codes give an inline note (7.12); `constraint-region` and `constraint-avoid` set the requirement to Checking; repaired codes are counted for the FixBlock's automatic-fixes line; others are dropped from the UI (they are logged in the console in dev only). |
| `usage` | any | Ignored in the UI. |
| `done` | main | Timings are kept for the footer. With `truncated`, show `rec.cut` unless a `continue` status follows. |
| `error` | any | Nothing yet: a `status` (fallback or retry) or a `fatal` follows. |
| `status` | — | A status line (7.12). The repair status opens the FixBlock; summary feeds the SummaryNote. |
| `commit` | — | Replace the session memory with `commit.memory`. Close the revision (footer, requirement states from `commit.warnings`). Set the display to `memory.graph` (turnOpen false). Refit, hand over BuildMarks, save the session. |
| `summary` | — | Set `memory.summary`; show or update the SummaryNote. |
| `fatal` | — | Error block (W8 or W9); restore the display to `memory.graph` (unchanged); re-enable the composer. |

- **Layout call:** core's `layoutGraph` takes `(graph, catalog, prev?)` today; layout v2 adds `opts.canvas = { w, h }` with the same name. Call it through one wrapper (`apps/web/src/canvas/layout.ts`) so the fourth argument is added in one place when v2 lands; strict tsc rejects it before then.
- **Display rule:** while the turn is open, the canvas draws `displayGraph(raw, catalog, { turnOpen: true, drawn, shownAtTurnStart, touched }, { constraints })` from core `display.ts`. That file exists, so no local adapter is needed. Keep the call in one module (`apps/web/src/stream/display.ts`) so a signature change touches one file.
- **Batching:** the canvas lays out and animates once per 180 ms batch (the spike's rule). The record updates per event.

## 10. Motion

There is one grammar, and nothing else moves.

| Moment | Property | Duration | Easing | Reduced motion |
|---|---|---|---|---|
| Landing to working handoff | The brief box's rect animates (FLIP) to the composer slot. The ask text cross-fades into revision 1's ask. The lockup scales to the header's size and moves. The canvas comes in with translateX(24px) and opacity. | `--d-handoff` 420 ms | `--ease-out` | 120 ms cross-fade of the two layouts |
| Card enters | opacity 0 to 1, translateY(`--rise`) to 0 | `--d-enter` 240 ms; 30 ms stagger inside a batch, at most 6 | `--ease-out` | opacity, 120 ms |
| Card moves (in its block only) | transform | `--d-move` 300 ms | `--ease-out` | instant |
| Card exits | the card becomes a dashed 1 px `--line-2` ghost at its slot (the content fades to 0), then the ghost fades | `--d-exit` 160 ms plus a 160 ms ghost | `--ease-in` | 120 ms fade |
| Frame resize | box | 300 ms | `--ease-out` | instant |
| Edge appears | opacity | 200 ms after its later end lands | linear | instant |
| Refit (turn start, commit) | viewport transform | 300 ms | `--ease-out` | instant |
| BuildMark to tag | mark opacity out, tag opacity in | `--d-settle` 1200 ms | `--ease-in-out` | 120 ms |
| Cursor blink | opacity steps 1 then 0 | `--cursor-blink` 1060 ms, `steps(1)` | — | none (solid) |
| Panel open and close | height (transform-based) | `--d-panel` 280 ms | `--ease-in-out` | instant |
| Revision row expand | height and opacity | 200 ms | `--ease-out` | instant |
| Hover and highlight | colour, opacity, shadow | `--d-hover` 120 ms | linear | the same |
| Requirement pinned | row height and opacity, then the `--action-soft` ground fading over 1.2 s | 240 ms | `--ease-out` | fade only |

**Cursor behaviour:**
- It blinks while Qwen is silent: waiting for the first token, status lines, the repair's wait.
- It is solid while text is arriving: reset a 600 ms timer on every say delta, and blink again when it expires.
- It disappears at `commit` or `fatal`.
- There is one blinking Cursor on screen at most.

Never animate layout properties other than through the FLIP or transform paths above. Entrances start from a visible-by-default DOM: content is never hidden waiting for JS.

## 11. Canvas text and geometry

Type in world px (zoom 1), from `tokens.css`:

| Text | World px | Weight | Rendered at the 0.857 floor |
|---|---|---|---|
| Card title | 14 / 18 | 500 | 12.0 |
| Card subtitle, zone chips | 12 / 16 | 400 / 500 | 10.3 |
| Frame label | 12 / 16 | 500 | 10.3 |
| Lane label | 12 / 16 | 500 | 10.3 |
| Badge label | 12 / 16 | 500 | 10.3 |
| Edge label | 12 / 16 | 400 | 10.3 |
| Revision tag numeral | 12 | 700 | 10.3 |

- **The floor:** `zoom >= 0.857`, so card titles render at 12 px or more at every viewport in section 4. At 1040x800 with up to 24 cards, the layout must fit inside 1157 x 877 world px for no pan to be needed. Secondary text at 10.3 px is accepted at the floor only; at the typical fit zoom (about 0.95 to 1.17 in the sketch) it renders at 11.4 px or more.
- **Handoff to layout v2** (Phase 1a owns `GEOMETRY`; these are the values this design wants; today's core has `cardW: 188`, `cardH: 52`):
  - `cardH: 64`: a two-line title (2 x 18) plus a 12/16 subtitle is 52, with 6 px padding top and bottom. 60 cannot hold that block with any padding;
  - `cardW: 192`, with a text column of `cardW - 56 = 136` (10 padding, 28 icon slot, 8 gap, 10 padding);
  - `gapY >= 20` and `gapX >= 24` inside a frame, so edge channels stay 12 px clear of cards;
  - `head: 32` for frame labels at 12/16 with 8 px above and below; frame padding 12;
  - `badge: 20` (chip height, centred on the host's top edge) and `badgeStep: 26`;
  - the METRICS for the bench: `{ titlePx: 14, subtitlePx: 12, frameLabelPx: 12, cardW: 192, cardH: 64 }`, with `textW = cardW - 56`;
  - the fit target: at 1040x800, 90% of turn-end states with 24 or fewer cards fit at `zoom >= 0.857` (1157 x 877 world px); at 920x620 (1280x720), the canvas pans for the rest.
- **Edge labels:** centred on the longest segment when it is horizontal; beside a vertical segment (left edge 6 px right of the line) when the channel beside it is clear; otherwise omitted. The panel's Connections list carries every label, so an omitted label loses nothing.
- **The sketch's canvas** is hand-placed at cards of 192 x 64 to show this target (21 products, 18 cards, 912 x 524 world px, fitted at 1.09 at 1440x900 and 0.96 at 1280x720). It is not layout output.

## 12. Landing briefs

From [examples.json](examples.json), in this order. Each passed 3 of 3 runs in `eval/results/2026-10-31T08-01-35-p1-full`.

| Tag | English | Leads to (run 1) |
|---|---|---|
| Data residency | We're a Singapore fintech and customer data must stay in Singapore. Design a web app with a database for our customer portal. | A pinned requirement, then ESA, ALB with WAF and a certificate, ECS with Auto Scaling, Tair, RDS, OSS, KMS, NAT Gateway, Cloud Firewall and SLS in Singapore |
| High availability | We run an online store in Southeast Asia with about 30,000 daily users and big sales peaks. Design a highly available web architecture. | DNS, ESA, ALB with WAF, ECS with Auto Scaling, Tair, RDS, OSS, SLS |
| Product need | I need an AI agent my team of 15 software developers can use for coding. | Solution map: Qoder Teams recommended; Token Plan and Model Studio optional |
| AI on your documents | We want an internal assistant that answers employees' questions from our policy documents and wiki, using Qwen models. | AgentCore, Model Studio, Milvus, OSS, SLS |
| Kubernetes | We're moving 20 Java microservices to Kubernetes. We need service discovery and configuration, one API entry point, async messaging between services, a cache and a relational database. | ACK, MSE, cloud-native API gateway, ALB, RocketMQ, Tair, PolarDB, SLS |

- The Korean and Chinese variants are in the file. Those for high availability, product need and documents are the eval's own ko and zh cases (all 3 of 3 in that run, except ko-pat-04-rag at 2 of 3); the others were drafted by Qwen and corrected by hand.
- The BriefBox placeholder (`landing.placeholder`) paraphrases the high-availability brief.

## 13. Accessibility (WCAG 2.2 AA)

**Landmarks and structure:**
- **Landing:** `<main>` holds the lockup as the `<h1>` (the logo `<svg role="img" aria-label="Alibaba Cloud">` plus the name), the lead, the brief form, and the examples `<section aria-labelledby>`.
- **Working view:**
  - `<header>`;
  - `<aside aria-label="Revision record">` for the console, holding the requirements `<section>`, the record `<div role="log" aria-label="Revisions">` and the composer `<form>`;
  - `<main aria-label="Architecture diagram">` for the stage;
  - `<section id="products">` for the panel.
- Two skip links are first in tab order: `skip.toComposer` and `skip.toDiagram`.

**Keyboard paths:**
- **Landing:**
  1. language;
  2. Sessions;
  3. brief box (focused on load);
  4. Draw architecture;
  5. example rows (Up and Down move between rows; Enter fills the box).
- **Working view, tab order:**
  1. skip links;
  2. lockup;
  3. Hide console, Sessions, New session, language;
  4. requirements (each row's Unpin);
  5. record (revision rows and tags; change lines are focusable buttons, with arrow keys moving within a revision's list);
  6. composer, then send or Stop;
  7. canvas: one tab stop, a roving tabindex across cards in reading order (frame by frame, top-left to bottom-right). Arrow keys move to the nearest card in that direction. Enter opens the popover with focus in it; Escape closes it and returns focus. F fits; + and − zoom, only while the canvas has focus (2.1.4: single-key shortcuts are scoped to focus);
  8. zoom tools;
  9. products handle, then the table rows when open (each row's Rev. tag is a button).
- Focus is never trapped. Opening the panel leaves focus on the handle, and Escape inside the panel closes it and returns to the handle.
- After the handoff, focus lands in the composer.

**Live regions:**
- One polite region (`aria-live="polite"`, visually hidden) announces short lines only: `live.started`, the first sentence of the note once `say.final` arrives, `live.reqPinned`, `live.drawn` at commit, `live.reqBroken` and `live.failed`.
- The streaming text itself is never announced character by character. The `role="log"` record has `aria-live="off"` while streaming and `aria-busy="true"` until commit.
- Errors use `role="alert"` once.

**Contrast:**
- Every text pair in `tokens.css` was measured with Qwen's checker (verified against known values). The lowest is `--warn` on `--warn-soft` at 4.70:1, and body pairs are 5.4:1 or more.
- Control borders are `--line-control`, 3.53:1 or more on every ground. Focus rings are blue: 5.45:1 or more.
- Orange is never text (section 2).
- Canvas edges are #808285 at 3.7:1 on the region fill. Card borders (`--line-2`) are decorative; the card is identified by its text.

**Other rules:**
- **Target size:** 24 x 24 at least (2.5.8); header buttons are 32 tall.
- **Reduced motion:** `prefers-reduced-motion: reduce` swaps to the overrides in `tokens.css` and the right-hand column of section 10. The Cursor holds still.
- **Language:** set `lang` on the root from the UI language. Set it on each ask and note from `detectReplyLanguage` (core `prompt.ts`), so screen readers switch voice per revision.
- **Hover content** (1.4.13): popovers are dismissable with Escape, hoverable, and persistent until leave, blur or Escape.
- **Zoom and reflow:** at 200% browser zoom on 1280 wide (640 CSS px), the console and stage stack vertically. The console comes first at full width, the stage below at 70vh, and the panel is reachable. This is the only narrow layout, and it exists for reflow, not for phones.

## 14. Handoffs and open decisions

**To the orchestrator (needs the user):**
1. **Font download.** Self-host Alibaba Sans (Latin, 400/500/700) and Alibaba PuHuiTi 3.0 (Chinese subset, 400/500) from Alibaba's official font site. Both are free for commercial use per the brand guide. This needs the user's approval for the download. The alternative is Roboto (`@fontsource/roboto`), for parity with alibabacloud.com. Until then the Helvetica and Arial fallback renders.
2. **Product name.** "Architecture Builder" is a working title.
3. **Icon and logo licence** before any public launch (the iconfont listing has no licence).

**To Phase 1a (core and server), requests only:**
1. **Layout v2 geometry:** section 11 (cardW 192, cardH 64, type METRICS 14/12/12, gaps, and the fit target).
2. **Control edges:** the canvas hides `kind: 'control'` edges by default. Layout and routing must keep their channels, so revealing one does not reroute others.
3. **A `card label` rule:** core's `cardText` should give the title (node label) and the subtitle (the catalog short name when it differs, else the category), so canvas, panel and popover agree.
4. **Health:** `/api/health` already returns the catalog version, the limits and `keyConfigured`; the app uses all three.

**To the scaffold builder:**
1. **Package and port:** `apps/web` with Vite on port 5174 (never 5173), with React 19, @xyflow/react 12 and TypeScript 6.0.3 strict and erasable. Use `.ts` and `.tsx` extensions in relative imports.
2. **Structure:**
   - `src/styles/tokens.css` (a copy of this spec's tokens);
   - `src/i18n/strings.json` (a copy) plus a typed `t(key, vars)` with plural `.one` and `.other`;
   - `src/stream/` (an NDJSON client, the turn reducer, the display adapter);
   - `src/console/`, `src/canvas/`, `src/panel/`, `src/brand/`;
   - `src/icons/` (exists).
3. **Replay fixtures:** the spike's recorded streams (`spikes/canvas/src/replay/`) and eval turn content (`eval/results/*/runs.jsonl`, the `turns[].content` NDJSON). Copy them into `apps/web/src/replay/fixtures/` at build time; do not import from `eval/`. Synthesize timings from `stats.firstSayMs`, `stats.firstNodeMs` and `stats.totalMs` when per-line timings are missing.
4. **Session storage:** `localStorage` key `ab.sessions.v1`, wrapped in try/catch; the app works without it.
5. **Pure logic tested with node:test:** the turn reducer, change-line derivation (op events to ChangeLine kinds), requirement state, the plural `t()`, and the Cursor timer.

**Open, not blocking:** the Sessions menu's design beyond a plain list, and share links (Phase 2). Export is built: see 7.31.

## 15. Acceptance checks (what the finish review will look for)

- **Screenshots** at 1440x900 and 1280x720 of: the landing; a streaming state with the Cursor and BuildMarks; the done state with revision tags; the hover popover; the open panel; a fatal error; a solution map; and replay mode. Also one ko and one zh landing.
- **Canvas legibility:** card titles render at 12 px or more at 1040x800 for the residency session (18 cards); measure the computed font size times zoom.
- **No chatbot tells:** no bubbles, avatars, sparkles, gradients, "AI glow", typing dots or centred transcript.
- **Orange audit:** orange appears only in the logo, the product icons, the Cursor, the BuildMarks and the caret. Grep the CSS for `--brand-orange` and `--cursor` uses.
- **Every state in section 8** is reachable from replay fixtures or a stubbed stream, and none is missing.
- **Keyboard:** the full path in section 13 works with no mouse. The IME test: type 데이터 and 数据 and press Enter while composing; nothing submits.
- **Reduced motion:** no transforms and a still Cursor.
- **Contrast:** rerun the checker (`node contrast.mjs pairs.json`) after any token change.
