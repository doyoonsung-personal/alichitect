# Amendments to proposals.json from the Singapore pre-sales brief

Source: research/findings/9-sg-ai-presales-brief.md, the user's own research, dated 2026-10-31. It cites official pages; its internal-KB items are marked directional. Where it conflicts with research/ai-depth/proposals.json, **this file wins**. Implement both together.

## Catalog

- **acs-agent-sandbox and agent-sandbox: status `ga`, not `preview`.**
  - Agent Sandbox was commercialised on 2026-09-21, with self-service activation (acs_sandbox_public_intl).
  - Cite the standalone product docs (alibabacloud.com/help/en/agent-sandbox/), never the ACS user-guide page: that page still carries a stale "public preview" banner from 2026-06-23.
  - Both editions are available in Singapore.
  - Note to add: CPU and memory only, no GPU. The code, browser and desktop sandbox types ship; mobile is announced but not shipped. Per-type availability per region is set in the console, so confirm browser and desktop there before a proposal.
- **Edition positioning:**
  - agent-sandbox (Flash edition): API-first and E2B-compatible. It is the default for code that is not on Kubernetes.
  - acs-agent-sandbox (Container edition): for customers already on ACK or ACS. It is driven by the SandboxSet, SandboxClaim and SandboxTemplate CRDs.
- **GPUs:**
  - **pai-eas and egs notes:** generally available in Singapore are A10, T4, V100 and P100 (EAS's supported list adds P4). L20 and H20 are sales-negotiated exceptions. A100, A800, H100 and H800 are never offered internationally. No Singapore-specific spec list is published.
  - **acs note:** GPU pods are an invitational preview, with outside-China pricing for T4 and A10 only.
- **lingjun:** allowlist-gated, with no published lead time and no pay-as-you-go. avoidWhen: a PoC or demo timeline, where you should lead with pai-dlc on public GPUs. Directional, from internal delivery experience: the minimum purchase is whole machines by the week.
- **pai-token-service: add it as an entry** (it was in notAdded). It is PAI's serverless model API, a separate product from Model Studio, with its own endpoint, key and price list at 1.2 times Model Studio's.
  - useWhen: the workload already lives in PAI tooling (DSW, evaluation, distillation) and unified PAI billing matters.
  - avoidWhen: plain application inference, where model-studio is about 17% cheaper and has batch and cache discounts.
  - Only the Beijing endpoint is confirmed, so add no Singapore regions.
- **model-studio:** add pai-token-service and pai-eas to its alternatives. Guidance: application inference uses model-studio; dedicated GPUs, custom or fine-tuned weights, VPC-private endpoints or a throughput SLA use pai-eas.

## Prompt rules (fold into the proposed R19-R21)

- **No GPU names in labels.** Never name GPU models in labels. When a why text needs one, use only A10, T4, V100 or P100, and say newer cards need sales confirmation.
- **Training defaults to PAI-DLC on public GPUs.** Add lingjun only for large multi-node training. Its why must say access is allowlisted through the account manager and must not gate a PoC.
- **Model inference:** application inference goes to model-studio. pai-eas is for dedicated capacity, custom weights, private VPC endpoints or an SLA. pai-token-service only when the user is already working in PAI.
- **Agentic RL with sandboxes:** there is NO official reference for PAI-DLC plus Agent Sandbox.
  - When a user asks for it, draw pai-dlc (public GPUs) calling agent-sandbox (Flash edition, Singapore) for rollouts. Use acs-agent-sandbox only when they run ACK or ACS.
  - The say text must state plainly that this is a custom design without an official reference, and point to the documented ACK plus VeRL walkthrough as the nearest official pattern.
  - Never draw pai-instant (China-only) for an international customer.

## Patterns

- **agentic-rl-acs-sandboxes:** variant B becomes pai-dlc -> agent-sandbox (Flash) by default, and acs-agent-sandbox when the customer runs ACK or ACS. Mark the variant "custom (no official reference)". Variant A (ACK with KubeRay and VeRL) stays the documented one.
- **agent-hosting-acs-sandbox:** unchanged, but it is GA, so drop any preview wording.

## Eval cases

- The RL-with-sandbox case must check that the narration says the design has no official reference, and that pai-instant is absent.
- Add one case: "fine-tune Qwen on 8 GPUs next week for a PoC". It must use pai-dlc and must not make lingjun a prerequisite.
- Add one case: "what GPUs can we get for inference in Singapore?". It must name only A10, T4, V100 or P100, and mention sales confirmation for newer cards.
