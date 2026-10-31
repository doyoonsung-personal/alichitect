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
- **Focus diagram** hides the console and the canvas takes the full width. The header's Focus diagram button becomes Show console. The toggle is instant with reduced motion; otherwise the width animates over 280 ms with `--ease-in-out` and the canvas refits once at the end.
- **The canvas** is the stage minus the bar: `stage height - 52`. Capacity is `(canvas - 48) / 0.857`, with 24 px of padding on each side.
- **Panel open height** is `min(600px, 64%)` of the stage, measured from the bottom of the stage and including the bar.
- **Short viewports.** Below 600 px of inner height, the working view keeps a minimum height of 600 and the page scrolls. Below 1180 px of inner width, the console keeps 360 px and the canvas shrinks; that is unsupported but must not break.
- **Header (48 px, white, 1 px `--line-1` bottom), left to right:**
  - 16 px inset;
  - the lockup: logo 18 px tall, a 12 px gap, a 1 px x 16 px `--line-1` rule, a 12 px gap, then `app.name` at 14/20 weight 500 ink;
  - 24 px gap;
  - the session title: the first ask, single line, ellipsis, 13 px ink-3, flexing to fill;
  - right group with 8 px gaps: the mode state, Focus diagram, Sessions, New session and the language menu;
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

