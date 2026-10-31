# Phase 1 addition: follow-up questions and partial or multi-cloud scope

Approved by the user on 2026-10-31. This is the spec the Phase 1c agents implement. Apply the contract changes additively to `packages/core/src/types.ts`.

## 1. Draw first, then ask

**Behaviour.** A request that leaves out a detail the design depends on still gets a first diagram straight away, because a live drawing is what makes the product work in a sales meeting.
- **Assumptions:** the model picks the common default for each detail that matters and states it as an assumption. Examples: public-facing, Singapore, about 10k users, single region.
- **Questions:** after drawing, the model asks at most two questions whose answers would change the design. Each question comes with quick-reply options.
- **Question first:** the model asks before drawing (no nodes) only when the request is too vague to pick any pattern, for example "we need cloud for our company".

**What counts as missing:**
- Exposure: public internet or internal only.
- Where the rest of the system runs: new build, on-premises, or another cloud.
- Region and data residency.
- Scale and availability: users, traffic peaks, multi-zone or multi-region.
- Budget or a technology preference, when it would change the products chosen.

Never ask about something the user already stated or pinned.

**Contract (types.ts, additive):**
```ts
// Op
| { t: 'assume'; id: string; text: string; alt?: string } // an assumption the design rests on; shown as a chip, alt is the one-click alternative
| { t: 'ask'; id: string; text: string; options?: string[] } // a question whose answer would change the design; options become quick-reply buttons
// SessionMemory
assumptions?: Array<{ id: string; text: string; alt?: string }>; // the assumptions the current diagram rests on; the same id replaces
questions?: Array<{ id: string; text: string; options?: string[] }>; // open questions from the latest assistant turn
```

**Limits:**
- Per turn: at most 3 assume ops and 2 ask ops.
- Assumption text and alt: up to 60 characters each.
- Question text: up to 160 characters.
- Options: 2-4 per question, up to 40 characters each.
- The validator truncates or drops anything beyond these, with a warning.

**Memory:**
- Open questions are replaced every assistant turn.
- Assumptions persist until replaced by the same id, or until a pinned requirement settles them. When a requirement settles an assumption, the model re-emits that assumption with the new text, or the server drops it.
- The final user message lists CURRENT ASSUMPTIONS and OPEN QUESTIONS, so the model knows what an answer refers to.

**Console UI:**
- **Assumption chips:** they sit with the requirements, as "Assumed: Public-facing · Change". Change sends a follow-up: "Change: <alt> instead of <text>". A flipped assumption becomes a pinned requirement.
- **Questions:** they appear in the turn, with option buttons. Clicking an option sends it as the next message. Typing a free answer also works.
- **Keyboard and languages:** all of this is keyboard-reachable, and the UI copy exists in English, Korean and Chinese.

**Product needs.** The ambiguous-team case ("an AI agent for my team") uses an ask op with the options "Developers" and "Everyone in the company". It still recommends right away.

## 2. Partial solutions and other clouds

**Behaviour.** When the user wants part of a system, draw only that part on Alibaba Cloud, plus the connection to what they already have. Examples:
- one service ("just RDS");
- a front door ("only WAF and CDN in front of our site");
- a disaster-recovery copy.

The existing environment, whether on-premises or on another cloud, is drawn as one or a few external nodes. The rest of their system is not redesigned.

**Catalog (constructs, external scope, onprem lane):**
- `other-cloud`: "Other cloud environment". It stands for workloads the customer already runs on another provider (AWS, Azure, Google Cloud or another), and they stay there. The model labels each instance with the provider and the role, for example "AWS app servers" or "Azure SQL database". These nodes sit in an external group named for the provider.

**Prompt rules:**
- **Narrow the "map other clouds" rule.** Map other clouds' services to catalog equivalents only when the user wants them built on Alibaba Cloud. When the user keeps workloads on another cloud, draw them as `other-cloud` nodes. Only those nodes and their group may carry another provider's name or product names.
- **Scope rule.** Draw the requested part and the link between the two sides. Choose the link from the catalog:
  - VPN Gateway (IPsec) for a quick start;
  - Express Connect for a dedicated private line;
  - CEN or Transit Router when several networks join;
  - DTS for database migration or ongoing sync.
  Add the security and operations pieces the part needs, and stop there.
- Take facts about which connections and sources each product supports from the catalog and research/, never from memory.

## 3. Eval cases (eval/cases/11-asks-scope.json, with about half in the held-out set)

**Asks:**
- "We need cloud for our company": asks before drawing, with no nodes.
- "Build a web app for our online store": draws it, assumes public-facing, and asks at most 2 questions.
- A request that states everything: no ask ops.
- A follow-up answering an option: the design changes and the question disappears.
- Flipping an assumption to "internal only": the public entry path is removed or replaced by private access, and a requirement is pinned.
- Korean and Chinese variants.

**Scope:**
- "Just RDS for our app that runs on AWS": RDS across zones, a link to an `other-cloud` group, DTS when migration or sync is mentioned, and no app tier on Alibaba Cloud.
- "Only WAF and CDN in front of our Google Cloud site."
- "A DR copy of our Azure SQL database on Alibaba Cloud."
- "Keep our app on-premises; move only the database."
- A trap: "use EC2 and S3", meaning built on Alibaba Cloud, still maps to ECS and OSS.

**Checks:**
- Every asks case checks the question count, that options are present, and that a stated detail is never asked again.
- Every scope case checks that no app or compute tier is drawn on Alibaba Cloud unless asked.
