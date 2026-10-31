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

## Memorable moment

The box the customer typed into slides left and becomes revision 1, while the drawing builds itself on the right. The orange Cursor that blinks after Qwen's words underlines each card as it lands.

## Unresolved decisions (do not invent; ask through the orchestrator)

1. **Brand fonts.** Alibaba Sans (Latin) and Alibaba PuHuiTi 3.0 (Chinese) are the brand guide's free-for-commercial-use faces. Self-hosting them needs a download that the user has not approved. Until then, the fallback stack renders.
2. **Product name.** "Architecture Builder" is a working title (PRODUCT.md lists the name as undecided).
3. **Icon and logo licence before a public launch.** See Brand Commitments in PRODUCT.md and research/icons-and-prior-art.txt.
4. **Concept round.** The launcher is not installed, so concept-seed could not run. The direction was shaped directly because the user pinned both the brand and the composition. That is why FORM records `seed: none (unavailable)`.
