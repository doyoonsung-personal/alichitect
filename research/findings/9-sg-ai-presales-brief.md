# Singapore AI Platform Pre-Sales Brief

**Prepared:** 2026-10-31
**Scope:** ACS Agent Sandbox, GPU availability (EAS / DLC / ECS / ACS), PAI-Lingjun allowlisting, PAI Token Service vs Model Studio pricing, DLC + Agent Sandbox reference architecture
**Region of interest:** Singapore (`ap-southeast-1`)
**Method:** Alibaba Cloud international docs (`alibabacloud.com/help/en`) + Chinese docs (`help.aliyun.com`) + internal KB search. Verified facts carry source links. Inference is labelled as inference.

---

## TL;DR

| # | Question | Answer |
|---|---|---|
| 1 | ACS Agent Sandbox GA or preview? | **GA** — commercialized 2026-09-21. Singapore live for both editions. Four types: code, browser, desktop, mobile (mobile not shipped). |
| 2 | GPUs buyable in SG? | No official SG spec list exists. Safe answer: **A10 / T4 / V100 / P100**. L20 & H20 = sales-negotiated. A100/H100/H800 = never. ACS GPU = **invitational preview**, T4/A10 only outside mainland. |
| 3 | Is Lingjun allowlisting routine in SG? | **No.** SG is a real Lingjun region but access is allowlist-gated with no published lead time. **Lead with PAI-DLC on public GPUs.** |
| 4 | Is PAI Token Service separate from Model Studio? | **Yes** — different product, endpoint, API key, price list. Gap = **flat 1.2× PAI markup** + region scope. Model Studio is ~17% cheaper. |
| 5 | Official DLC + ACS Agent Sandbox reference? | **None exists.** Only an ACK-based VeRL walkthrough. Closest PAI-native analog (PAI-Instant Service) is China-regions-only. |

---

## 1. ACS Agent Sandbox — status, types, Singapore

### Status: GA

Alibaba Cloud officially commercialized 智能体沙箱 (Agent Sandbox) on **21 September 2026**. The product news entry reads "智能体沙箱 - 正式商业化" ("Agent Sandbox — Official Commercialization"). It had been in 公测 (public preview) since approximately 1 April 2026.

Activation is **self-service, not invitation-only** — commodity codes `acs_sandbox_public_cn` (China site) and `acs_sandbox_public_intl` (international site).

> **Documentation trap.** The older English page at `/help/en/cs/user-guide/agent-sandbox/` still carries a banner stating Agent Sandbox "is currently in public preview" (page last updated 2026-06-23). The standalone product docs at `/help/en/agent-sandbox/` carry no such banner. **Always cite the standalone product path** in customer-facing material, or you will contradict yourself.

### Sandbox types

| Type | Status | Notes |
|---|---|---|
| Code (Code Interpreter) | Shipping | Template Marketplace entry exists |
| Browser | Shipping | Headless and GUI variants |
| Desktop (Computer Use) | Shipping | Linux desktop; Marketplace lists "Desktop" and "SWE-bench Verified" templates |
| Mobile | **Announced only** | Appears in the product overview but has no Template Marketplace entry — treat as not yet shipped |

Other Flash-edition Marketplace templates: Base Runtime, All-in-One.

### Singapore availability

**Yes** — `ap-southeast-1` is listed in the Agent Sandbox "open service area" doc for **both** editions:

- **Flash edition (极速版)** — API-first, E2B-compatible SDK (`e2b-code-interpreter`). SG regions listed alongside CN 5 regions, HK, Johor, us-east-1, us-west-1.
- **Container edition (容器版)** — Kubernetes-native. Available in all ACS regions including SG.

Container-edition technical surface (verified):

- CRDs under `agents.kruise.io/v1alpha1`: `SandboxSet`, `SandboxClaim`, `SandboxTemplate`, `SandboxUpdateOps`, `PoolAutoscaler`
- Add-ons: `ack-agent-sandbox-controller`, `ack-sandbox-manager`
- Scheduling label: `alibabacloud.com/compute-class: agent-sandbox`

### GPU

Agent Sandbox is **CPU + memory only**. English docs: "GPU computing power is not supported." Chinese: "当前不支持GPU算力". The ACS GPU question is entirely separate — see §2.

### Unverified

- **Per-type, per-region availability is not published.** Docs state sandbox forms vary by region and product stage, and defer to the console ("以产品控制台为准"). Confirm browser and desktop specifically in the SG console before committing to them in a proposal.
- The commercialization announcement was located on the Chinese news site only; the equivalent English news URL returns 404.
- No standard Alibaba OpenAPI action name exists for sandbox operations — access is via the E2B protocol and Kubernetes CRDs.

**Sources:** [Open service area](https://www.alibabacloud.com/help/en/agent-sandbox/product-overview/open-service-area) · [Product overview](https://www.alibabacloud.com/help/en/agent-sandbox/product-overview/agent-sandbox-overview) · [Commercialization announcement](https://cn.aliyun.com/product/news/30546) · [Template Marketplace](https://help.aliyun.com/zh/agent-sandbox/template-marketplace) · [Billing overview](https://www.alibabacloud.com/help/zh/agent-sandbox/product-overview/billing-overview) · [ack-agent-sandbox-controller](https://www.alibabacloud.com/help/en/cs/user-guide/ack-agent-sandbox-controller) · [Stale preview banner (ACS user guide)](https://www.alibabacloud.com/help/en/cs/user-guide/agent-sandbox/)

---

## 2. GPU availability in Singapore, by surface

### The honest framing

**Alibaba Cloud publishes no Singapore-specific GPU spec list for EAS, DLC, or ACS.** Spec appendices are global lists carrying a "some instance types may be temporarily unavailable in certain regions" disclaimer. ECS region/zone availability is exposed only through an interactive tool, not a static page.

Everything below is therefore a **defensible shortlist derived from supported-set lists and gating tiers — not a published SG catalog**. For a committed customer, the authoritative answer is the live purchase page plus a PDSA/SA confirmation.

### Summary table

| Surface | Documented GPU set | Singapore read | Gating |
|---|---|---|---|
| **PAI-EAS** | A10, P4, P100, T4, V100 (closed list for both public and dedicated resource groups) | Safe answer — the only surface with a closed supported list | None for the listed set |
| **PAI-DLC** | Above + A30, A100-class ("GU50"), L20, H20 | Realistically the same A10/T4/V100/P100 tier as EAS | None published for SG |
| **ECS** | Three tiers (see below) | A10/T4/V100 self-serve; L20/H20 sales-negotiated | Mixed |
| **ACS** | T4, A10, L20(GN8IS), L20X(GX8SF), GU8TF/GU8TEF (H20-class) | T4/A10 at best, after allowlisting | **Invitational preview** |

### a) PAI-EAS

Officially supported GPU types for **both** public resources and dedicated resource groups: **A10, P4, P100, T4, V100** — nothing else.

Instance mapping:

| GPU | Instance specs |
|---|---|
| A10 (24 GB) | `ecs.gn7i-c8g1.2xlarge` … `ecs.gn7i-c32g1.32xlarge`, `ml.gu7i.*` |
| T4 | `ecs.gn6i-*` |
| V100 (16/32 GB) | `ecs.gn6v-*`, `ecs.gn6e-*` |
| P100 / P4 | `ecs.gn5-*`, `ecs.gn5i-*` |

The EAS billing appendix also lists `ecs.gn7-*`, `gn7e-*`, `ebmgn7e` (40/80 GB, A100-class, labelled "GU50" in DLC docs). These appear in the global price list but **not** in the supported-GPU set — treat as China-oriented.

A Lingjun resource quota nominally exists in SG per the PAI regions doc, but the card lineup behind it is not published.

### b) PAI-DLC

Public-resource spec list (identical in EN and ZH):

| GPU | Instance family |
|---|---|
| A10 | `gn7i` |
| T4 | `gn6i` |
| V100 | `gn6v`, `gn6e` |
| P100 | `gn5` |
| A30 | `gn7s` |
| A100-class ("GU50") | `gn7`, `gn7e`, `ebmgn7e` |
| L20 | `gn8is`, `ebmgn8is` |
| H20 | `gn8v` (1–8 cards) |

No Singapore sub-list is published. Realistic SG-buyable set matches the EAS supported tier: **A10 / T4 / V100 / P100**.

Useful supporting fact: the official PAI-DLC reinforcement-learning walkthroughs (e.g. Cosmos-RL) run on **public resources with `gn7i` / A10** and carry no gating whatsoever. This is the path of least resistance for SG demos.

### c) ECS

| Tier | Families | GPU |
|---|---|---|
| **Ungated** (standard intl offer) | `gn7i`, `gn6i`, `gn6v`, `gn6e`, `gn5`, `gn5i`, `vgn6i`, `vgn7i` | A10, T4, V100, P100, P4, vGPU (T4/A10) |
| **Gated** — "select regions including outside the Chinese mainland; contact sales" | `gn8is`, `gn8v`, `gn8v-tee`, `ebmgn8is` | L20 (48 GB), H20 (96 GB), L20 bare metal |
| **Ticket / invitation** | `gn7s`, `gn9gc`, `ebmgn9g`, `ebmgn9ge`, `ebmgn9gc` | A30; `gn9gc` invitational preview |

`sccgn7ex` is marked "Not recommended" in the docs.

Note: `gn8v`'s GPU model is not named in the English ECS page; the H20 attribution comes from the DLC billing table.

### d) ACS — confirmed invitational preview

Direct quote from the ACS product introduction (EN): GPU compute is in **"invitational preview. Contact your sales manager or PDSA for access."** Separately: "For ACS GPU resource availability and card types by region, contact your sales representative or SA."

Compute classes: general-purpose, performance-enhanced, **GPU-accelerated**, **GPU-HPN** (HPN additionally requires a capacity reservation).

Card series documented in the ACS pod instance overview: **T4 (16 GB), A10 (24 GB), L20 (GN8IS), L20X (GX8SF), GU8TF / GU8TEF (96 GB / 141 GB × 8, H20-class)**.

**The decisive detail is in billing.** ACS GPU prices are published for two scopes — "Chinese mainland" and "China (Hong Kong) and regions outside China" — but the outside-China rows cover **T4 and A10 only**. Mainland rows carry the fuller lineup (e.g. T4 $0.932/h, A10 $1.038/h). GPU sharing on GPU-HPN is in public preview in Ulanqab and Shanghai Finance Cloud only.

**Conclusion:** even after allowlisting, a SG customer is negotiating last-generation inference cards on ACS, not L20/H20.

A related gating nuance worth knowing: using ACS GPU compute **from an ACK One registered cluster** is separately gated — "目前在ACK One注册集群使用ACS GPU算力处于邀测阶段，请提交工单申请" ("currently in invitational preview; submit a ticket"). Native ACS `compute-class: gpu` carries no such marker in public tutorials.

### Not sellable in Singapore, ever

- **A100 / A800 / H100 / H800** — `gn7`, `gn7e`, `ebmgn7*`, `sccgn7ex`. Export-controlled; absent from every international supported list.
- **L20 / H20 / A30** — exist internationally only as sales-negotiated exceptions, not catalog items.

### Unverified

1. Per-zone ECS stock in `ap-southeast-1` (zones a–d) — only the interactive availability tool or the live purchase page knows.
2. The GPU card lineup behind the SG Lingjun quota.
3. Whether ACS GPU is purchasable in SG at all, at any card type.

**Sources:** [EAS resource group configuration](https://help.aliyun.com/en/pai/purchase-and-configure-eas-resource-groups/) · [EAS billing](https://www.alibabacloud.com/help/en/pai/product-overview/billing-of-eas) · [DLC billing](https://www.alibabacloud.com/help/en/pai/product-overview/billing-of-dlc) · [ECS GPU families (EN)](https://www.alibabacloud.com/help/en/ecs/user-guide/gpu-accelerated-compute-optimized-and-vgpu-accelerated-instance-families-1) · [ECS GPU families (ZH)](https://help.aliyun.com/en/egs/gpu-accelerated-compute-optimized-instance-families) · [EGS regions and zones tool](https://help.aliyun.com/zh/egs/regions-and-zones-1) · [ACS product introduction](https://www.alibabacloud.com/help/en/cs/product-overview/product-introduction) · [ACS pod instance overview](https://www.alibabacloud.com/help/en/cs/user-guide/acs-pod-instance-overview) · [ACS billing rules](https://www.alibabacloud.com/help/en/cs/product-overview/product-billing-rules) · [ACK One → ACS virtual nodes](https://help.aliyun.com/zh/ack/distributed-cloud-container-platform-for-kubernetes/user-guide/schedule-pods-to-run-on-acs-using-virtual-nodes) · [PAI regions and zones](https://www.alibabacloud.com/help/en/pai/product-overview/regions-and-zones) · [Cosmos-RL on DLC](https://help.aliyun.com/zh/pai/submit-cosmos-rl-reinforcement-learning-tasks)

---

## 3. Lingjun allowlisting in Singapore — gated, not routine

### Singapore is a real Lingjun region

One of only **two** regions outside the Chinese mainland. The international product page states: *"PAI-Lingjun Intelligent Computing Service is currently available only in Ulanqab, China and Singapore. Please contact sales for purchasing and consultation."*

PAI docs list six Lingjun regions — 华北6 (乌兰察布), 新加坡, 华南1 (深圳), 华北2 (北京), 华东2 (上海), 华东1 (杭州) — with **Singapore the only international one**. Launched approximately March 2024 ("PAI 灵骏智算服务国际站（新加坡区域）正式开服").

### Access is uniformly allowlist-gated

English: *"This feature is available only to allowlisted users. Contact your account manager to apply for access."*

English (deployment doc): *"Lingjun prepaid resources: You must be added to a whitelist… Contact your sales manager or submit a ticket."*

Chinese (purchase guidelines): "当前灵骏智算资源仅供白名单用户申请使用，如果您希望使用灵骏智算资源提交训练任务，请先提交工单，申请添加灵骏智算使用白名单" — *only whitelisted users may apply; submit a ticket to be added to the Lingjun whitelist.*

Chinese (resource group creation): "仅对白名单用户开放，需提前联系商务经理" — *whitelist-only; contact your business manager in advance.*

**Nothing is published on lead time, minimum node count, minimum purchase size, or customer tier.**

### Commercial friction (internal source — directional only)

Internal TAM material (China-domestic delivery experience, so **not** SG-authoritative) reports operating characteristics that matter for deal shaping:

- Lingjun resource groups bill at a minimum unit of **whole machine + week**; no cross-workspace sharing; no pay-as-you-go.
- No annual → pay-as-you-go conversion.
- Unsubscription requires scale-down first, then a console ticket; no machine-return API.
- Batch power-on is unstable above roughly 20 nodes.
- No per-node driver upgrade.
- PPU-family cards have poor dependency-management ergonomics (no Conda support; manual environment setup; ABI constraints often requiring local code adaptation).
- Product-form fragmentation across 灵骏 / EGS / ACK / ACS creates genuine customer selection difficulty.

### Recommendation

**Lead with PAI-DLC on public / general-compute GPUs.** That path has zero gating in Singapore and is what the official DLC RL walkthroughs use (`gn7i` / A10). Run Lingjun as a **parallel account-manager-driven motion**, and never make it a prerequisite for a demo or a PoC timeline.

If the customer's workload genuinely needs Lingjun-class scale (large multi-node pre-training, HPC interconnect), start the allowlist ticket on day one and set expectations that the timeline is sales-driven, not self-service.

### Unverified

- Allowlist lead time, minimum node count, or tier requirement — nowhere public.
- Gating for a standalone 灵骏 cluster (as opposed to a PAI Lingjun resource quota) was not examined in detail.

**Sources:** [PAI-Lingjun product page](https://www.alibabacloud.com/en/product/pai-lingjun) · [Create and manage Lingjun resources (EN)](https://www.alibabacloud.com/help/en/pai/create-and-manage-intelligent-computing-lingjun-resources) · [同 (ZH)](https://help.aliyun.com/zh/pai/create-and-manage-intelligent-computing-lingjun-resources) · [PAI purchase guidelines (ZH)](https://www.alibabacloud.com/help/zh/pai/product-overview/pai-product-purchase-guidelines) · [PAI feature release notes](https://www.alibabacloud.com/help/zh/pai/product-overview/feature-release-notes) · [One-click deploy DeepSeek (whitelist wording)](https://help.aliyun.com/en/pai/use-cases/one-click-deploy-deepseek) · [DLC create training task](https://help.aliyun.com/zh/pai/create-a-training-task) · [What is Lingjun](https://help.aliyun.com/zh/intelligent-computing-lingjun/what-is-lingjun-intelligent-calculation-service)

---

## 4. PAI Token Service vs Model Studio — separate products, flat 20% gap

### Verdict: yes, separate APIs

**PAI Token Service** is a PAI-native serverless model-invocation product with its own:

- Endpoint: `https://cn-beijing.pai-token.aliyuncs.com/v1` (OpenAI-compatible)
- Auth: PAI-side API key
- Activation: PAI console → Quick Start → Token Service
- Billing: PAI price list

**Model Studio (百炼)** uses DashScope infrastructure with its own:

- Endpoints: `https://dashscope.aliyuncs.com/compatible-mode/v1` (China) / `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` (International)
- Dedicated sub-workspace host: `https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1` — on a dedicated host the API key is already workspace-scoped, so no `X-DashScope-WorkSpace` header is needed
- Auth: Model Studio API key
- Billing: Model Studio price list

Same model IDs, same weights, **different product and different price list**. Neither requires deploying anything. Dedicated deployment is a third thing entirely — PAI-EAS, billed on compute rather than tokens.

### Price comparison — `qwen3.8-max`

Single tier (0 < tokens ≤ 1M); thinking and non-thinking priced identically. Per 1M tokens.

| Surface | Region / scope | Input | Output | Currency |
|---|---|---|---|---|
| Model Studio | Singapore "International" | 2.00 | 6.00 | USD |
| Model Studio | Beijing / Global (FRA, TYO, HK) | 1.65 | 4.95 | USD |
| 百炼 | 北京 / 全球 | 12 | 36 | CNY |
| 百炼 | 新加坡"国际" / 美国 | 14.988 | 44.965 | CNY |
| PAI Token Service | Singapore "International" | 2.40 | 7.20 | USD |
| PAI Token Service | Beijing / Global | 1.98 | 5.94 | USD |
| PAI Token 服务 | 北京 / 全球 | 14.4 | 43.2 | CNY |
| PAI Token 服务 | 新加坡"国际" | 17.9856 | 53.958 | CNY |

`qwen3.8-flash` follows the same pattern: Model Studio $0.15 / $0.47 (International) and $0.113 / $0.382 (Beijing/Global); PAI $0.18 / $0.564 and $0.1356 / $0.4584. Snapshot `qwen3.8-max-0902` prices identically to `qwen3.8-max`.

> Note on reading the English pricing pages: rendered values like "$4.951" and "$5.9412" are footnote markers glued to $4.95 and $5.94. Don't misread them as precision pricing.

### Why the prices differ — ranked by strength of evidence

1. **A flat 20% PAI markup (fully proven).** Every PAI price equals exactly 1.2× the Model Studio price for the same region and currency: 12→14.4, 36→43.2, 2→2.4, 6→7.2, 0.8→0.96, 14.988→17.9856. This accounts for the *entire* discrepancy on like-for-like comparisons.
2. **Region scope pricing within each surface (proven).** The Singapore "International" scope costs more than Beijing/Global on both surfaces ($2/$6 vs $1.65/$4.95; ¥14.988 vs ¥12). If you compared **PAI-Singapore against 百炼-Beijing**, you compounded the markup and the region gap into roughly 1.5× (¥17.9856 vs ¥12) — which is very likely the origin of the confusing observation.
3. **Discounts Model Studio publishes that the PAI page lacks (proven).** Batch inference at 50% off; context cache (creation 125%, hit ≈10% of input price); a 1M-token free quota. The PAI page references a context-cache appendix but lists no batch discount and no free quota.
4. **Ruled out — checked, not assumed.** Thinking-mode pricing (identical to non-thinking); context-length tiering (single ≤1M tier); model snapshot versions (`qwen3.8-max-0902` same price); dedicated-vs-serverless (Token Service is serverless).
5. **Unverifiable.** PAI-side cache discount percentages; whether PAI Token Service is contractually backed by Bailian/DashScope infrastructure.

### Buying guidance

- **Pure application inference → Model Studio.** ~17% cheaper (1 ÷ 1.2), plus batch and cache discounts and a free quota.
- **PAI Token Service → only when the workload already lives inside PAI tooling** (model evaluation, distillation via EasyDistill, DSW, Feature Store) and unified PAI billing / RAM permissions matter more than unit price.
- **PAI-EAS → when they need dedicated GPU capacity**, fine-tuned or custom models, VPC-private endpoints, or a throughput SLA. This is compute-billed, not token-billed.
- **Singapore data residency** is available on both token surfaces via the "International" scope rows.

### Unverified

- The PAI Token Service base URL for Singapore. Only `cn-beijing` is confirmed, and that via an EasyDistill documentation source (third-party-adjacent, not the PAI pricing page).
- Whether a PAI-side batch discount exists at all — assume unavailable until confirmed.

**Sources:** [PAI Token Service billing (EN)](https://www.alibabacloud.com/help/en/pai/product-overview/billing-of-pai-token-service) · [PAI Token 服务计费 (ZH)](https://help.aliyun.com/zh/pai/product-overview/billing-of-pai-token-service) · [Model Studio pricing (EN)](https://www.alibabacloud.com/help/en/model-studio/model-pricing) · [百炼模型调用价格 (ZH)](https://help.aliyun.com/zh/model-studio/model-pricing) · [OpenAI compatibility / endpoints](https://www.alibabacloud.com/help/en/model-studio/compatibility-of-openai-with-dashscope) · [EasyDistill backends](https://github.com/modelscope/easydistill/blob/main/docs/backends_zh.md)

---

## 5. PAI-DLC training with ACS Agent Sandbox — no official reference

### Verdict: your read is correct

There is **no official Alibaba Cloud reference architecture, best-practice doc, or tutorial pairing PAI-DLC training with ACS Agent Sandbox.**

### What does exist

**The ACK-based walkthrough (the one you found):**

- 在ACK上使用VeRL框架进行Agentic强化学习训练 — VeRL + RemoteAgentLoop + Harbor framework, evaluated on SWE-bench. It uses the `Sandbox` / `SandboxSet` / `SandboxClaim` CRDs with `"sandbox_labels": "{\"alibabacloud.com/acs\":\"true\"}"`. Note the ambiguity: sandboxes are **ACS-labelled**, but training runs on **ACK GPU nodes**, not PAI-DLC. Whether those sandboxes truly execute on ACS serverless compute or on ACS-labelled ACK nodes is not clear from the doc.
- 在ACK上运行强化学习任务 (Cloud Native AI Suite use cases)
- Knative Agent Sandbox workloads (ACK user guide)

**ACS-side docs that mention RL but never pair with DLC:**

- ACS Agent Sandbox 概述 — references an "AgentRL 场景：面向强化学习训练、轨迹采样" (AgentRL scenario: for RL training and trajectory sampling)
- ACS Agent Sandbox 安全最佳实践
- Agent-RL 网络方案 (Cloud Network well-architected design) — network architecture only; covers ACS/ACK sandboxes, no PAI

**PAI-DLC RL docs that never mention Agent Sandbox:**

- Cosmos-RL reinforcement learning tasks on DLC
- Fully observable RL tasks (covers Agentic RL / VeRL)

**Closest PAI-native analog — and a blocker for SG:**

**PAI-Instant Service** — a MicroVM sandbox under EAS, E2B-compatible, explicitly pitched as "适用于 RL 训练与评测…大规模并发" (suitable for RL training and evaluation at large concurrency). However it is available in **China regions only** (Shanghai, Ulanqab, Zhongwei). **Not Singapore.**

Nothing on developer.aliyun.com or the Alibaba Cloud blog demonstrates DLC + ACS Agent Sandbox either.

### Practical implication

For a Singapore customer wanting DLC-based agentic RL training with sandboxed rollout environments today, **you are building the reference yourself**:

> PAI-DLC training job on public GPUs (A10 / `gn7i`) → calls an Agent Sandbox endpoint (Flash edition, `ap-southeast-1`) for environment rollouts.

That is a genuinely novel architecture and a reasonable thing to take to the PAI/ACS product teams as a documentation request — particularly because the ACK equivalent already exists and the ACS sandbox already advertises an "AgentRL scenario."

### Unverified

- Whether an internal-only (non-public) DLC + ACS sandbox reference exists.
- The NVIDIA GTC26 session on Agent-RL sandbox infrastructure was identified but not inspected (video content).

**Sources:** [VeRL agentic RL on ACK](https://help.aliyun.com/zh/ack/training-agentic-reinforcement-learning-on-ack-using-the-verl-framework) · [RL on ACK use cases](https://help.aliyun.com/zh/ack/cloud-native-ai-suite/use-cases/reinforcement-learning/) · [Knative Agent Sandbox workloads](https://help.aliyun.com/zh/ack/ack-managed-and-ack-dedicated/user-guide/ai-agent/) · [ACS Agent Sandbox overview](https://www.alibabacloud.com/help/zh/cs/user-guide/agent-sandbox/) · [ACS Agent Sandbox security best practices](https://help.aliyun.com/zh/cs/user-guide/acs-agent-sandbox-security-best-practices) · [Agent-RL network scheme](https://help.aliyun.com/zh/cloud-network-well-architected-design/agent-rl-reinforcement-learning-network-scheme) · [PAI sandbox overview (Instant Service)](https://help.aliyun.com/zh/pai/sandbox-overview) · [Cosmos-RL on DLC](https://help.aliyun.com/zh/pai/submit-cosmos-rl-reinforcement-learning-tasks) · [RL observability](https://help.aliyun.com/en/pai/fully-observable-reinforcement-learning-task)

---

## Consolidated gap list

Items that could not be verified from public documentation and require console access, a ticket, or a PDSA conversation:

1. Per-zone ECS GPU stock in `ap-southeast-1` (zones a–d) for `gn7i` / `gn6i` / `gn6v`.
2. The GPU card lineup behind the Singapore Lingjun quota.
3. Whether ACS GPU compute is purchasable in Singapore at all, and at which card types.
4. Lingjun allowlist lead time, minimum node count, and minimum purchase size.
5. Per-sandbox-type availability in Singapore (browser and desktop specifically) — console is the source of truth.
6. The PAI Token Service Singapore base URL.
7. Whether PAI Token Service batch/context-cache discounts exist.

### A note on internal KB search

Internal knowledge-base search was run and produced one **false positive worth flagging**: the KB conflates "Aone Sandbox" — an internal MedAgentBox medical-agent platform — with the Alibaba Cloud ACS Agent Sandbox product. Its auto-generated summary asserts the internal platform is live in Singapore. Those hits were discarded and are not reflected anywhere in this brief.

Internal material did contribute the Lingjun commercial-friction bullet points in §3, which come from a **China-domestic** TAM delivery knowledge base and are labelled directional rather than SG-authoritative.

---

## Recommended customer positioning

1. **Sandbox:** Agent Sandbox is GA and in Singapore — lead with the Flash edition for API-first integration, Container edition for customers already on ACK/ACS. Confirm browser and desktop types in the console before the meeting.
2. **Training:** PAI-DLC on public resources with A10 (`gn7i`) — immediately purchasable, no allowlist, and the pattern the official RL walkthroughs use.
3. **Inference:** Model Studio on the Singapore scope unless the workload is already inside PAI. If the customer asks why PAI shows a higher price, the answer is a flat 20% product markup, not a different model.
4. **Lingjun:** raise it only when scale genuinely demands it, start the allowlist ticket immediately, and never let it gate a PoC.
5. **ACS GPU:** do not put it in a proposal without a PDSA confirmation in hand.
