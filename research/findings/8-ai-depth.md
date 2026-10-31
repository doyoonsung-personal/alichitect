# 8. AI depth: training sandboxes, agent hosting, post-training and RAG

Date: 2026-10-31. Requirement (user, 2026-10-31): give AI products as much weight as cloud products. When a client wants sandbox environments for model training or agent hosting, the app should draw them with ACS sandboxes, and use PAI-EAS for post-training and RAG.

Basis: four research areas (PAI, sandboxes, RAG and agents, patterns) and four fact-checks. All pages were read on 2026-10-31 on alibabacloud.com (help, blog). Only facts that the fact-checks confirmed or corrected are used. Inferences are labelled as such. The machine-readable proposal is `research/ai-depth/proposals.json`.

## Summary

- **"Sandbox" means two different things, and the app must ask or say which one it drew.** For people who develop or train models, the product is **PAI-DSW** (notebooks), with **PAI-DLC** for larger jobs. For isolated execution of agent-written code, browsers or RL rollouts, the products are **Agent Sandbox**: the **Container Edition on ACS** (the user's "ACS sandboxes") or the managed **Flash Edition**. **AgentBay** covers Windows and Android. No sandbox product documents GPU support, so training never runs inside one.
- **The catalog's single `pai` entry cannot draw the user's examples.** PAI is documented module by module, and Singapore has every module that matters: DSW, DLC, EAS, Model Gallery and Lingjun. We propose four stage entries (`pai-dsw`, `pai-dlc`, `pai-eas`, `pai-model-gallery`) and keep `pai` as a thin umbrella.
- **Today the alias "ACS Agent Sandbox" resolves to a region-scoped entry**, so an "ACS sandbox" would be drawn outside the VPC with no cluster. We propose a VPC-scoped `acs-agent-sandbox` entry and turn the existing `agent-sandbox` entry into the Flash Edition. Both are marked **preview**. The only page that states a status, the ACS page dated 2026-06-23, says public preview.
- **Post-training has two documented routes.** The no-code route is Model Gallery, which runs SFT or DPO on DLC and deploys to EAS. The custom route is DSW, then DLC, then EAS, for GRPO or Megatron work. Model Studio fine-tuning in Singapore is a narrow managed alternative: SFT only, on a few Qwen models, and tuned models cannot be exported.
- **RAG has two shapes.**
  - On a self-hosted model: the PAI-EAS RAG service plus a separate EAS LLM service. The vector store is Elasticsearch, Hologres or RDS PostgreSQL in the same VPC. Milvus is not offered in that template.
  - On hosted models: compute plus Model Studio APIs plus Milvus or OpenSearch. Model Studio's own knowledge base is closed to new international accounts, and **Model Studio PrivateLink is documented for Beijing and Hong Kong only, not Singapore**.
- **Several things must not be drawn for international customers.**
  - PAI-Instant Service, PAI's E2B MicroVM sandbox for RL: China regions only.
  - PAI-LangStudio: retires 2027-03-09, and its named successor is unusable internationally.
  - iTAG: China-only, in maintenance.
  - PAI-Studio 1.0: retired.
  - AgentLoop: Hong Kong only, which matters for residency.
- **Budget blocker.** The system prompt already uses 12,148 of the 12,500 tokens its test allows. The proposed catalog changes bring it to 12,736, the rules to 13,247, and the optional worked example to 13,913. The prompt test budget must rise to about 13,500.

## What Alibaba offers for each AI need, and what to draw

| Customer need | Draw | Do not draw | Caveats to say |
|---|---|---|---|
| Training sandboxes for data scientists | `pai-dsw` (per-person notebook, VS Code or terminal), `pai-dlc` for bigger jobs, `oss`, `nas` or `cpfs`, `nat`, RAM role | any agent sandbox, `pai` umbrella | DSW documents RAM roles and mounts, not hardened multi-tenancy; separate teams by workspace or VPC |
| Agent hosting where agents run code (Kubernetes, "ACS sandboxes") | `acs` with an edge to `acs-agent-sandbox`, `alb`, `ai-gateway`, then `model-studio` or `pai-eas`, `nas`, `nat` with allowlisted egress, `agent-identity` | `pai-instant`, sandbox as an attachment | Preview; CPU and memory only; needs activation, controller and sandbox-manager add-ons, and an Ingress with domain and TLS; default creation quota is burst 100, then 20 per minute |
| Agent code sandbox without Kubernetes | `agentrun` with `agent-sandbox` (Flash, E2B API), `model-studio`, `tablestore` memory | `acs`, `ack`, `acs-agent-sandbox` | No lifecycle stage stated, and independent billing is an invite-only preview; the Desktop template must be built once |
| Agents driving Windows or Android | `agentbay` | `agent-sandbox` | AgentBay is a separate product from Agent Sandbox |
| Sandbox fleet for agentic RL or evaluation | trainer (`ack` with KubeRay and VeRL as documented, or `pai-dlc` as our proposal) calling `acs-agent-sandbox`, plus `oss` or `cpfs`, `lingjun`, policy on `pai-eas` | `pai-instant` (China only), training inside sandboxes | The DLC wiring is a proposed design, not an Alibaba reference |
| No-code fine-tuning, then serving | `oss`, `pai-model-gallery`, `pai-dlc`, `pai-eas`, `ai-gateway` | one `pai` box | Model Gallery is free; you pay for DLC and EAS. GRPO is documented only in the Qwen3 guide (32B and smaller) |
| Light SFT with no GPUs | `model-studio` | `pai-*` | Singapore only; SFT on five Qwen models; no export; dedicated deployment billed separately |
| Large distributed training | `pai-dlc`, `lingjun`, `cpfs`, `oss`, `pai-dsw` for debugging | `egs` standing in for Lingjun | Lingjun needs allowlist access (support ticket or account manager), and Singapore is its only international region |
| Serving our own LLM at scale | app, then `ai-gateway`, then `pai-eas` (vLLM, SGLang, BladeLLM), with `oss` for weights | `ess` node, router node | Billed while resources are held; scale to zero is not allowed with a dedicated gateway; VPC direct, NLB and Nacos traffic is subject to security groups |
| RAG on a self-hosted model | two `pai-eas` nodes (RAG service and LLM), `elasticsearch`, `hologres` or `rds`, `oss`, `nat` if Model Studio is called | `milvus` in the template, FAISS in production, `model-studio-apps`, LangStudio | OpenSearch is reachable from the RAG service over the public network only; do not copy the guide's Beijing endpoint |
| RAG on hosted models | compute, `model-studio`, `milvus` or `opensearch`, `oss`, an ingestion worker | `model-studio-apps`, a PrivateLink badge to Model Studio in Singapore | The ingestion design is ours; AI Search Open Platform parsing is Shanghai and Frankfurt only |

## Key facts (verified on 2026-10-31)

### PAI modules

- **Regions.** The PAI regions page (updated 2026-08-25) gives:
  - EAS: Singapore, Tokyo, Seoul, Kuala Lumpur, Johor, Jakarta, Bangkok, Hong Kong, Frankfurt, Silicon Valley, Virginia, Atlanta, Mexico, Riyadh and Dubai.
  - Model Gallery: Singapore, Tokyo, Seoul, Kuala Lumpur, Jakarta, Hong Kong, Frankfurt, Silicon Valley and Virginia.
  - DSW and DLC: Singapore, Tokyo, Kuala Lumpur, Jakarta, Hong Kong, Frankfurt, Silicon Valley and Virginia.
  - Lingjun: Singapore plus five China regions.
  - iTAG and Instant Service: not available in Singapore.
- **EAS buying options.** The public pool is pay-as-you-go. Dedicated groups are subscription or pay-as-you-go; to stop billing you must delete the machines. Billing runs for the whole time resources are held, even if a service fails to start, and capacity failures are retried for up to 48 hours.
- **EAS gateways and scaling.** A shared gateway is the default. ALB-based and fully managed dedicated gateways are options, as are VPC direct (one ENI per instance), NLB and Nacos; the last three are subject to security groups. Autoscaling uses QPS, CPU, GPU or queue metrics with up to 1,000 replicas. Minimum 0 is not allowed with a dedicated gateway.
- **EAS LLM deployment.** Engines are vLLM (recommended), SGLang and BladeLLM, behind an OpenAI-compatible `/v1/chat/completions` endpoint. An MoE template deploys prefill, decode and router sub-services.
- **EAS RAG (PAI-RAG).** Two modes: LLM-decoupled (recommended) and integrated (small models only). Vector stores: FAISS (quick start), Elasticsearch, Hologres, RDS PostgreSQL, and OpenSearch (public network only). Calling Model Studio needs NAT with SNAT. The RAG code sandbox supports only Function Compute (AgentRun) sandboxes.
- **Dify on EAS.** Dify runs as one EAS service backed by RDS PostgreSQL, Redis, Elasticsearch and OSS in the same VPC, and those VPCs cannot be changed after creation.
- **Model Gallery.** SFT and DPO with full-parameter, LoRA or QLoRA training. It is free itself and launches DLC and EAS resources, which you pay for. GRPO appears only in the Qwen3 guide.
- **Lingjun access.** It is allowlist-only as a whole: the purchase guide says to request it by support ticket, the resource page says through your account manager. Subscription is the standard path, and pay-as-you-go is a further allowlisted option. The current catalog note understates this.
- **Retirements.**
  - PAI-LangStudio retires 2027-03-09 16:00. Its named successor, Model Studio application development, supports only China (Beijing).
  - PAI-Studio 1.0 was retired in every region by 2026-09-30.
  - iTAG has been allowlist-only and in maintenance since 2026-08-01.
- **PAI-Instant Service.** E2B-compatible MicroVM sandboxes, listed only for Shanghai, Ulanqab and Zhongwei.

### Sandboxes

- **Agent Sandbox has two editions.** The Flash Edition is managed and API-first (E2B SDK). The Container Edition is driven by the Kubernetes API and Sandbox custom resources (E2B protocol). Sandbox types (code, browser, desktop, mobile) vary by region and stage.
- **Regions** (regions page, updated 2026-10-13):
  - Flash Edition: Singapore, Johor, Virginia, Silicon Valley and Hong Kong, plus mainland regions.
  - Container Edition: Singapore, Kuala Lumpur, Jakarta, Manila, Bangkok, Tokyo, Seoul, Hong Kong, Virginia, Silicon Valley, Atlanta, Frankfurt and London, plus mainland regions.
- **Container Edition on ACS.**
  - Status and compute: the ACS page says "public preview" and "GPU computing power is not supported".
  - Required components: an ACS cluster with Agent Sandbox activated, acs-virtual-node 2.17.0 or later, and the ack-agent-sandbox-controller and ack-sandbox-manager add-ons. The manager serves the E2B endpoint behind an Ingress (ALB shown) on HTTPS 443.
  - Resources and SDK: SandboxSet warm pools and SandboxClaim. The E2B SDK must be below v2.25.0.
  - Egress: an L7 egress gateway with block, bypass, audit, credential injection and MCP tool policy. It covers plain HTTP by default; HTTPS needs TLS termination configured.
  - Hibernation: supported, but WebSocket, SSE and gRPC connections drop on wake.
- **Limits.** Container Edition creation is a token bucket (burst 100, then 20 per minute per account and region). The headline "15,000 per minute" is a vendor ceiling, not a design number.
- **Flash and Function Compute.** Flash needs Function Compute for its control plane. Its equivalence to "FC Agent Sandbox" and "FC Cloud Sandbox" is our inference. Independent Flash billing is an invite-only preview.
- **AgentRun.** It has an optional, not deprecated, upgrade path from its own sandbox to FC Cloud Sandbox, and Tablestore is its memory store (RDS memory is in maintenance mode). Its endpoint list shows Singapore as the only international endpoint.
- **AgentBay** is a separate product. A 2026-10-27 guide moves Linux desktop automation to Flash Edition's Desktop template, which must be built once. No deprecation is announced.
- **The documented RL recipe** is VeRL on ACK with KubeRay: a Lingjun GPU node, sandbox-manager behind ALB Ingress, a SandboxSet warm pool, and OSS. The page does not say the sandboxes run on ACS compute. No page connects PAI-DLC or EAS to Agent Sandbox.

### RAG, models and agents

- **Model Studio regions.** Fine-tuning and batch exist only in Singapore and Beijing; other international regions have neither. Singapore fine-tuning is SFT only (Qwen3.8-27B, Qwen3.6-27B, Qwen3.5-27B, Qwen3.5-9B, Qwen3-14B), and the qwen3.8-27b deployment needs a whitelist. Tuned models cannot be exported.
- **Model Studio private access.** PrivateLink is documented for Beijing and Hong Kong only (page updated 2026-10-27).
- **Model Studio knowledge base and apps** are open only to accounts that created Singapore apps before 2025-04-21.
- **Vector and search stores.**
  - Milvus regions are Singapore, Frankfurt and Hong Kong; the Milvus console knowledge-base tutorial lists mainland regions only.
  - DashVector is in Singapore and Virginia, paid clusters bill per instance-hour, and no VPC access is documented.
  - AI Search Open Platform is documented for Shanghai and Frankfurt only.
- **AgentLoop** runs in Hangzhou, Shanghai and Hong Kong only.
- **The PrivateLink service list** includes Model Studio, PAI EAS, Milvus, AgentRun and OSS. It does not include Tablestore, Tair or AI Gateway.

## Proposed catalog changes

**Adds (7).**

| Id | Type | Scope and lane | Notes |
|---|---|---|---|
| `pai-eas` | service | region, ai, vpcAttachable | 13 open international regions |
| `pai-dlc` | service | region, ai, vpcAttachable | |
| `pai-dsw` | service | region, ai, vpcAttachable | devtools icon |
| `pai-model-gallery` | service | region, ai | |
| `acs-agent-sandbox` | offering | vpc, compute, pathRank 40 | preview |
| `pai-instant` | service | region, ai | china-only guard entry |
| `pai-langstudio` | service | region, ai | legacy, successor `pai-eas`; no prompt row |

The PAI stage entries carry no pathRank, like `model-studio`. EAS is called by apps and gateways and can also host agents that call AI Gateway, so a fixed rank would raise false path-order warnings.

**Changes (19).**

- `pai` becomes a thin umbrella; its module aliases move to the stage entries.
- `agent-sandbox` becomes the Flash Edition with status preview, Flash regions and Express, Speed, Flash and FC aliases.
- `lingjun`: corrected allowlist note, plus an avoidWhen line saying Singapore is its only international region.
- `model-studio`: avoidWhen now says "use PAI-EAS"; the note covers SFT only and PrivateLink.
- `agentloop`: avoidWhen for residency.
- `dashvector`: purpose fixed.
- `acs`, `egs`, `ai-gateway`, `cpfs`, `agentrun`, `agentbay`, `tablestore`, `agentcore`, `agent-identity`, `dify-on-ack`, `milvus`, `opensearch`, `privatelink`: pairs and notes.

Only purpose, pairs-with, flags and avoidWhen reach the model, so the model-facing facts are placed there. Notes feed warnings and hover text.

**Not added.**

- InferX and Token Service: their region availability and relationship to Model Studio are unclear.
- A separate Model Studio tuning entry: it would duplicate `model-studio`.
- The ACK AI suite: not re-verified, and it is an add-on.
- The OpenSearch LLM edition as its own entry: already an alias of `opensearch`.
- The Tair semantic cache: free beta with no SLA.
- PAI gateways, Designer and iTAG.

Validation ran on a patched in-memory catalog. It found:

- no key conflicts, no broken references and no length violations;
- offerings at 40 (the test allows 35 to 42) and products at 190;
- prompt rows at 7,954 tokens, under the 12,000 limit;
- the new aliases resolve as intended ("ACS sandbox" to `acs-agent-sandbox`, "EAS" and `pai_eas` to `pai-eas`, "LangStudio" to `pai-eas` via its successor, "PAI Sandbox" to `pai-instant`).

## Patterns (8)

1. **ai-dev-sandbox.** Users work in `pai-dsw`, which mounts `oss` and `nas` and sends larger jobs to `pai-dlc` (optionally `cpfs` and `lingjun`). Egress goes through `nat`, and notebooks use a RAM role. The parts are documented; the isolation story is our composition.
2. **post-train-serve.** `pai-model-gallery` or `pai-dlc` reads data from `oss` and writes checkpoints back. One deploy edge (kind control) goes to `pai-eas`, which `ai-gateway` calls over its private endpoint. Documented.
3. **llm-serving-eas.** App, then `ai-gateway` (quotas, fallback, guardrails), then `pai-eas`, with weights in `oss`. Scaling, router and prefill-decode separation go in the why text. Documented, except that AI Gateway in front of EAS is inferred.
4. **rag-eas.** Two `pai-eas` nodes (RAG and LLM), plus `elasticsearch`, `hologres` or `rds`, `oss`, and `nat` when calling Model Studio. Documented.
5. **rag-model-studio.** An app on `acs`, `fc`, `sae` or `agentrun` calls `ai-gateway`, then `model-studio`, and retrieves from `milvus`. An `fc` ingestion worker reads `oss`, embeds and upserts. Composed by us.
6. **agent-hosting-acs-sandbox.** `alb`, then `acs` (agent API), which claims sandboxes from `acs-agent-sandbox` over E2B and calls `ai-gateway`, then `model-studio` or `pai-eas`. The sandbox writes its workspace to `nas` and has allowlisted egress through `nat`; `agent-identity` handles credentials. Documented parts, composed by us.
7. **agentic-rl-acs-sandboxes.** Variant A is documented: `ack` (VeRL, Lingjun node) drives the sandbox warm pool. Variant B is our proposal: a `pai-dlc` trainer drives `acs-agent-sandbox`, and the policy is deployed to `pai-eas`.
8. **agent-hosting-managed.** `agentrun` with `agent-sandbox` (Flash), `model-studio` and `tablestore`, with no cluster.

Every pattern lists triggers, core and optional ids, edges in catalog ids (duplicate products are declared as node keys), placement notes and common mistakes. All data edges were checked against pathRank order.

## Prompt rules

These are proposed under a new heading, "# AI designs", after R18:

- **R19, PAI stages.** Draw DSW, DLC, EAS and Model Gallery, never two `pai` nodes. Train then serve uses `pai-dlc` to `oss`, plus one deploy edge. Self-hosted weights go on EAS; hosted Qwen goes to Model Studio. The managed-SFT boundary and the Lingjun caveat are stated. Private EAS access is drawn as a labelled edge, with NAT for outbound calls.
- **R20, sandbox disambiguation.** People get DSW and DLC. Agent code and RL rollouts get `acs-agent-sandbox` (with an `acs` edge) when the user mentions ACS, Kubernetes, tenants or RL, otherwise `agent-sandbox`; AgentBay covers Windows and Android. No GPUs in any sandbox. Mention preview. The DLC-plus-ACS wiring is a proposal. `pai-instant` is China-only.
- **R21, RAG on EAS.** Two EAS nodes, a vector store from Elasticsearch, Hologres or RDS (not Milvus; FAISS for demos only), files in OSS. Hosted RAG follows R14, and NAT is needed for Model Studio from a Singapore VPC.

A compact worked example (fine-tune Qwen3-8B with Model Gallery and serve it on EAS) runs cleanly through the real validator, with no warnings. It costs 666 tokens. Recommendation: ship the rules first, and add the example only if the eval shows structural failures such as two `pai` nodes or a missing deploy edge.

## Eval cases (14; 7 held out)

In-sample (`eval/cases/11-ai.json`):

- DSW sandbox
- ACS agent hosting
- post-train then EAS
- RAG on EAS
- RAG on Model Studio
- Singapore training residency, with an AgentLoop trap on turn 2
- Korean translation of the ACS agent hosting case

Held out (`eval/cases-heldout/ai.json`):

- inference at scale
- EU training with no Lingjun
- Chinese self-hosted RAG on EAS
- RL sandbox fleet
- LangStudio request
- no-Kubernetes sandbox
- GPU fine-tuning requested inside an ACS sandbox

All 14 pass `checkCases` against the patched catalog. They will fail against today's catalog until the new ids exist.

## Implementation impact

- `packages/core/test/prompt.test.ts`: raise the 12,500-token system prompt budget to about 13,500, or 14,000 with the example. Implicit caching (96% hit rate in Phase 0) keeps the marginal cost low.
- `packages/core/test/catalog.test.ts`: the probe map now expects `pai_eas` to resolve to `pai-eas`.
- `apps/web/scripts/icons/mapping.json`: add rows for the 7 new ids. Suggested glyphs are reusing `fallback:pai` for now, plus new fallback glyphs `model_serving`, `training_job` and `sandbox` so EAS, DLC and the sandboxes are distinguishable on one canvas.
- `layout.ts` always draws region-scope services on the shelf, so private EAS appears as a labelled edge. Whether to render VPC-configured EAS inside the VPC is an open question.

## Risks and caveats

- **Agent Sandbox status.** Do not present either edition as GA. Container Edition creation quotas need raising for RL fleets.
- **The user's headline case is partly a composition.** "Sandbox environments for model training with ACS sandboxes" is documented only as the ACK and VeRL recipe. The DLC variant must be labelled as a proposal in the diagram's text.
- **Capacity and region gaps.**
  - Lingjun is allowlist-gated, and Singapore is its only international region.
  - The official Megatron and GRPO walkthroughs recommend or require China (Ulanqab).
  - GPU stock in Singapore is undocumented, and ACS GPU pods are an invitational preview.
- **Guides default to China endpoints.** Several PAI guides use China (Beijing) endpoints in their examples, so an international customer cannot follow them verbatim.
- **Naming drift.** Express, Speed and Flash are all used for the same edition; FC Agent Sandbox, FC Cloud Sandbox, AgentRun Sandbox and AgentBay are separate names. All are aliased.

## Open questions

1. Agent Sandbox lifecycle status, and which sandbox types each edition offers in Singapore.
2. Whether Flash Edition is the same service as FC Agent Sandbox and FC Cloud Sandbox (inferred, not stated).
3. Whether layout should render VPC-configured EAS, DSW, DLC and AgentRun inside the VPC.
4. Whether any reference exists for PAI-DLC or EAS driving ACS sandboxes in RL. Ask Alibaba solution architects.
5. How routine the Lingjun allowlist is in Singapore, and which GPU families can actually be bought there.
6. PAI Token Service versus Model Studio, and InferX availability.
7. Model Studio private access and inference scope in Singapore, and the contradictions on its fine-tuning page.
8. Details read only from search summaries, which need a direct read: EAS CPFS mounts and Lingjun quotas, DLC and CPFS VPC matching, EAS logging, LLM router limits, the agent templates on EAS, Container Edition security defaults, the ACK AI suite, FC GPU instance types, and AgentCore VPC binding.
9. Whether to add Atlanta and Riyadh to `regions.ts`.

## Sources (all read 2026-10-31; page update dates in brackets)

PAI
- https://www.alibabacloud.com/help/en/pai/product-overview/regions-and-zones [2026-08-25]
- https://www.alibabacloud.com/help/en/pai/user-guide/overview-2 [2026-08-07]
- https://www.alibabacloud.com/help/en/pai/product-overview/billing-of-eas [2026-09-09]
- https://www.alibabacloud.com/help/en/pai/user-guide/methods-for-calling-services [2026-09-09]
- https://www.alibabacloud.com/help/en/pai/enable-or-disable-the-horizontal-auto-scaling-feature [2026-09-22]
- https://www.alibabacloud.com/help/en/pai/user-guide/deploy-an-llm [2026-09-22]
- https://www.alibabacloud.com/help/en/pai/deployment-moe-model-based-on-expert-parallel-and-pd-separation [2026-09-22]
- https://www.alibabacloud.com/help/en/pai/user-guide/rag-dialogue-system [2026-09-22]
- https://www.alibabacloud.com/help/en/pai/use-cases/deploy-a-rag-based-dialogue-system [2026-10-10]
- https://www.alibabacloud.com/help/en/pai/web-ui-configuration-guide
- https://www.alibabacloud.com/help/en/pai/user-guide/deploy-dify [2026-09-22]
- https://www.alibabacloud.com/help/en/pai/model-deployment-and-training [2026-09-22]
- https://www.alibabacloud.com/help/en/pai/use-cases/deploy-fine-tune-and-evaluate-qwen3-in-quickstart [2026-08-25]
- https://www.alibabacloud.com/help/en/pai/product-overview/model-gallery-quick-start [2026-09-22]
- https://www.alibabacloud.com/help/en/pai/use-cases/qwen3-reinforcement-learning-best-practices [2026-08-25]
- https://www.alibabacloud.com/help/en/pai/use-cases/train-fine-tune-and-deploy-qwen-by-using-intelligent-computing-lingjun [2026-09-16]
- https://www.alibabacloud.com/help/en/pai/dsw-overview [2026-09-17]
- https://www.alibabacloud.com/help/en/pai/create-and-manage-intelligent-computing-lingjun-resources [2026-08-24]
- https://www.alibabacloud.com/help/en/pai/product-overview/pai-product-purchase-guidelines [2026-10-09]
- https://www.alibabacloud.com/help/en/pai/product-overview/pai-langstudio-feature-retirement-and-migration-guide [2026-09-23]
- https://www.alibabacloud.com/help/en/pai/product-overview/pai-studio-visual-modeling-1-0-retirement-notice [2026-08-25]
- https://www.alibabacloud.com/help/en/pai/itag [2026-09-10]
- https://www.alibabacloud.com/help/en/pai/instant-service-overview [2026-08-28]
- https://www.alibabacloud.com/help/en/pai/product-overview/billing-of-pai-token-service [2026-09-29]
- https://www.alibabacloud.com/help/en/pai/inferx-overview [2026-09-09]

Sandboxes and containers
- https://www.alibabacloud.com/help/en/agent-sandbox/agent-sandbox-overview [2026-09-16]
- https://www.alibabacloud.com/help/en/agent-sandbox/product-overview/open-service-area [2026-10-13]
- https://www.alibabacloud.com/help/en/agent-sandbox/product-overview/limits-of-agent-sandbox [2026-10-13]
- https://www.alibabacloud.com/help/en/agent-sandbox/product-overview/billing-overview [2026-09-18]
- https://www.alibabacloud.com/help/en/agent-sandbox/alibaba-cloud-sdk-api-description-1 [2026-09-21]
- https://www.alibabacloud.com/help/en/agent-sandbox/agent-bay-linux-desktop-migration-fc-agent-sandbox-desktop-guide [2026-10-27]
- https://www.alibabacloud.com/help/en/functioncompute/pay-as-you-go-of-fc-agent-sandbox [2026-08-20]
- https://www.alibabacloud.com/help/en/cs/user-guide/agent-sandbox/ [2026-06-23]
- https://www.alibabacloud.com/help/en/cs/user-guide/create-an-agent-sandbox [2026-09-15]
- https://www.alibabacloud.com/help/en/cs/user-guide/manage-agent-sandbox-egress-traffic [2026-09-23]
- https://www.alibabacloud.com/help/en/cs/user-guide/hibernate-and-wake-up-the-agent-sandbox [2026-10-08]
- https://www.alibabacloud.com/help/en/cs/product-overview/product-introduction [2026-09-21]
- https://www.alibabacloud.com/help/en/ack/cloud-native-ai-suite/use-cases/run-reinforcement-learning-workloads-on-ack [2026-06-24]
- https://www.alibabacloud.com/help/en/egs/gpu-accelerated-compute-optimized-instance-families [2026-09-23]
- https://www.alibabacloud.com/blog/602942 (Kimi case, Container Service team blog) [2026-03-12]

RAG, models and agents
- https://www.alibabacloud.com/help/en/model-studio/regions [2026-10-13]
- https://www.alibabacloud.com/help/en/model-studio/model-training-overview [2026-10-21]
- https://www.alibabacloud.com/help/en/model-studio/access-model-studio-through-privatelink [2026-10-27]
- https://www.alibabacloud.com/help/en/model-studio/rag-knowledge-base [2026-10-11]
- https://www.alibabacloud.com/help/en/privatelink/aliyun-services-that-integrate-with-privatelink [2026-09-20]
- https://www.alibabacloud.com/help/en/milvus/product-overview/region-and-zone [2026-06-17]
- https://www.alibabacloud.com/help/en/milvus/use-cases/build-customer-service-qa-app [2026-09-01]
- https://www.alibabacloud.com/help/en/vrs/latest/opening-service [2026-06-17]
- https://www.alibabacloud.com/help/en/open-search/search-platform/user-guide/get-service-call-address [2026-06-21]
- https://www.alibabacloud.com/help/en/open-search/select-an-opensearch-edition
- https://www.alibabacloud.com/help/en/agentrun/api-agentrun-2025-09-10-endpoint.md [2026-08-22]
- https://www.alibabacloud.com/help/en/agentrun/memory-storage-overview.md [2026-10-10]
- https://www.alibabacloud.com/help/en/agentrun/agenrun-sandbox-upgrade-fc-cloud-sandbox-scheme.md [2026-08-24]
- https://www.alibabacloud.com/help/en/agentcore/overview-of-knowledge-base-connections.md [2026-10-21]
- https://www.alibabacloud.com/help/en/agentloop/product-overview/server-launch-regions-of-agentloop.md
- https://www.alibabacloud.com/help/en/api-gateway/ai-gateway/product-overview/what-is-an-ai-gateway [2026-09-09]

Earlier findings this builds on: `research/findings/5-ai-dev-products.md` (F4, F8, F9, F15, F16) and `research/findings/7-gap-review.md`.
