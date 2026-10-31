# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React 19, Vite and @xyflow/react 12 in TypeScript, with a local Node 24 server (apps/server) that holds the Model Studio key and streams turns to the browser. This stack was chosen in research/FEASIBILITY.md and proven in the Phase 0 canvas spike; the user approved it with the Phase 1 go-ahead on 2026-10-31.

## Users

- **Alibaba Cloud pre-sales: solutions architects, BD and sales.** They use it live in customer conversations, on their own laptops. They type what the customer needs, and refine it as the customer adds requirements ("data must stay in Indonesia", "oh, I also want WAF"), with the diagram on a shared screen.
- **Customers and prospects on their own.** They describe what they want to build, or a product need ("an AI agent my team can use"), and get an Alibaba Cloud answer they can understand without an architect in the room.

Both groups were confirmed by the user on 2026-10-31.

## Product Purpose

Turn a described need into a credible, current Alibaba Cloud architecture in real time, explain why each product is there, and keep refining it through conversation. Success means:
- a solutions architect would sign off the design;
- a customer can read it at a glance on the screen where it is shown;
- the first draft appears within seconds and is complete in about a minute;
- every requirement the customer stated is respected.

## Positioning

- Qwen draws the diagram live, from a curated and dated catalog of current Alibaba Cloud offerings.
- The catalog is lifecycle-aware: retired products route to their successors, and China-only or restricted products are flagged.
- Conversation memory pins the customer's requirements and checks every change against them.
- It answers product needs, not only infrastructure. Qoder and QwenWork are examples.
- It is an official Alibaba Cloud tool: the app is affiliated with Alibaba Cloud.

## Operating Context

- **Model:** Phase 1 runs locally on the user's machine. The model is qwen3.8-max on Model Studio's Singapore endpoint. A local server keeps the key out of the browser.
- **Pre-sales use:** in customer meetings and calls, on the BD or salesperson's laptop. They drive, and the customer reads along.
- **Self-serve use:** customers on their own laptops. Hosting for this is undecided.
- **Screens (confirmed 2026-10-31):** laptops at normal desktop sizes, read up close. Projectors and meeting-room screens are not a target.
- **Languages:** it understands English, Korean and Chinese, and replies in the user's language.
- **Measured speed (Phase 0, quiet window):** the first words arrive in about 1.3 s. A new diagram completes in about 12 s at the median and 24 s at the 95th percentile.

## Capabilities and Constraints

- **Entry:** a single prompt box on the landing view. On submit it becomes the chat console on the left, while the diagram draws on the right.
- **Follow-ups:** they edit the diagram in place. Cards enter, move and leave with animation, and unrelated cards stay put.
- **Product panel:** a panel below the diagram lists every product used and why it is there. It expands over the diagram with a ^ handle.
- **Hover and focus:** on any product, they explain why it is there and what it does.
- **Chat memory:**
  - the last 10 turns verbatim;
  - a rolling summary of older turns;
  - pinned requirements and machine-checked constraints (allowed regions, ruled-out products).
- **AI depth (added 2026-10-31):** AI products get the same depth as cloud infrastructure. Typical needs are sandbox environments for model training or agent hosting (ACS sandboxes), post-training and serving on PAI (DSW, DLC, EAS, Model Gallery), RAG on PAI-EAS or Model Studio, and agent platforms with their gateway, guardrails and observability. Research: research/ai-depth/.
- **Follow-up questions (added 2026-10-31):** it draws first, states the assumptions it made as chips the user can flip, and then asks at most two quick-reply questions whose answers would change the design (public or internal, where the rest runs, region, scale). It asks before drawing only when a request is too vague to draw.
- **Partial and multi-cloud scope (added 2026-10-31):** when the customer wants only part of a system ("just RDS for our AWS app"), it draws that part on Alibaba Cloud plus the link to their existing on-premises or other-cloud environment, and nothing more. Spec: research/phase1-asks-and-scope.md.
- **Product-need questions:** these get a solution map (team -> SaaS -> model service -> cloud resources) with dated prices where the catalog has them.
- **Catalog:** 223 entries checked on 2026-10-31. Product facts are written in our own words. Prices appear only with their as-of date.
- **The key never reaches the browser.**
- **Undecided:**
  - hosting for customers;
  - exports and share links (planned for Phase 2);
  - spend and abuse guards, which become required before any public launch;
  - the product name (a working title for now).

## Brand Commitments

- **Affiliation:** confirmed by the user on 2026-10-31. The app is affiliated with Alibaba Cloud and may use the Alibaba Cloud name, logo and brand colours.
- **Icons:** official Alibaba Cloud product icons, confirmed by the user on 2026-10-31.
  - **Source:** the Alibaba Cloud Design Center's "2022 Alibaba Cloud product icon collection (orange version)" on iconfont.cn: 286 single-colour icons, including the official English and Chinese logos. It was saved during research and is listed in research/icons-and-prior-art.txt.
  - **Gaps:** several current products have no icon in it: Model Studio, Qwen, PAI, Qoder, ESA, KMS, Cloud SSO, CPFS, vector databases and AI Gateway. These need fallback icons drawn to match.
- **Brand guide:** none provided. The brand's recognisable traits must be taken from Alibaba Cloud's own published identity, and verified rather than recalled.

## Evidence on Hand

- research/: sourced findings, with fact-check verdicts.
- packages/core/catalog/: the catalog, with dated prices.
- eval/results/: golden-prompt results.
- spikes/latency/: latency measurements.
- spikes/canvas/screenshots/: the Phase 0 canvas spike screenshots.

There are no customer testimonials, customer logos, case studies or benchmarks: never invent them.

## Product Principles

1. **Correct and current beats clever.** Every product comes from the dated catalog. Never invent products, prices or availability.
2. **Readable at a glance on the screen where it is shown.** A customer across the table must be able to follow the diagram as it grows.
3. **Every choice explains itself.** Each product carries its reason, in the customer's terms.
4. **The customer's requirements are binding.** Pinned requirements are checked on every turn and never silently broken.
5. **Live but calm.** The diagram grows in place. It never reshuffles what the customer has already read.

## Accessibility & Inclusion

The user has not set a standard. Target WCAG 2.2 AA (inferred, because the app is customer-facing). It must work by keyboard and stay legible on projected screens.
