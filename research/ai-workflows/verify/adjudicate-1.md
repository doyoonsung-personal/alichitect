Checked **2026-11-02**, using live searches and **15 official page opens**. No files changed. Dates below are page update dates where available; “not exposed” means the retrieved page did not display one.

**1. AI Guardrails**

**Verdict: Yes—current documentation supports new international-site activation and Singapore service access; the Shanghai-only restriction is outdated.**

Evidence:

- The live [overview](https://www.alibabacloud.com/help/en/content-moderation/latest/what-is-ai-security-barrier) now includes “China (Hong Kong), Singapore, Germany (Frankfurt), and US (Virginia)” among supported console regions, alongside Shanghai. The previously reported restriction is absent. **Date:** search index reports **2026-06-17**, but the live retrieval exposes no update date; that indexed date should not establish when the regional wording changed.
- The [API integration guide](https://www.alibabacloud.com/help/en/content-moderation/latest/multimodal-api-access-guide) explicitly instructs customers to “activate AI Guardrails,” linking to the international purchase flow with commodity code `lvwang_guardrail_public_intl`. It documents `MultiModalGuard` and international input/output services `query_security_check_intl` and `response_security_check_intl`. **Date:** not exposed.
- The [billing page](https://www.alibabacloud.com/help/en/content-moderation/latest/billing-overview) lists “USD 6 per 10,000 calls” separately for content compliance, sensitive-content detection, and prompt-injection detection. Activation is free; usage is billed. Content compliance is enabled by default; the other two require enabling. **Date:** not exposed.

The documented non-mainland **public API endpoints** are:

| Region | Endpoint |
|---|---|
| Singapore | `https://green-cip.ap-southeast-1.aliyuncs.com` |
| Hong Kong | `https://green-cip.cn-hongkong.aliyuncs.com` |
| Frankfurt | `https://green-cip.eu-central-1.aliyuncs.com` |
| Virginia | `https://green-cip.us-east-1.aliyuncs.com` |

Singapore also has `https://green-cip-vpc.ap-southeast-1.aliyuncs.com` for internal access. Console-region availability and API-region availability are separate lists. [API endpoint table](https://www.alibabacloud.com/help/en/content-moderation/latest/multimodal-api-access-guide)

**App change:** Keep Guardrails available for new international customers, default its console/API configuration to Singapore, and remove the mainland-only warning. Calculate charges separately for each enabled detection type; the $6 price is not an all-features bundle.

**2. AgentBay**

**Verdict: AgentBay closes to new customers today; recommend Agent Sandbox for new workloads, with OS-specific qualifications.**

Evidence:

- The [retirement notice](https://www.alibabacloud.com/en/notice/detail?_p_lc=1&id=2207), **published 2026-10-28 08:27:05**, states “2026-11-02, Closed to New Customers.” Its text specifies November 2 **UTC+8**, barring new purchases and trials.
- The notice recommends “Alibaba Cloud Agent Sandbox Express Edition.” Existing customers can continue operating, creating instances, renewing, and scaling. Security fixes continue; no EoS date has been determined, and at least six months’ notice is promised.
- Its linked [migration guide](https://www.alibabacloud.com/help/zh/doc-detail/3054921.html) covers AgentBay **Linux desktop** automation moving to `Agent Sandbox 极速版 Desktop 模板` using `e2b-desktop`. **Date:** not exposed. Thus, the notice uses **Express Edition**, while the product documentation also uses **Flash Edition** for 极速版; preserve the source’s naming rather than quoting “Flash” as the notice’s exact wording.
- **Windows exists elsewhere:** [Windows Computer Use Sandbox](https://www.alibabacloud.com/help/en/agent-sandbox/use-the-windows-computer-use-sandbox), **updated 2026-10-10**, says: “The image is in invitational preview. To obtain the image, contact technical support.” It requires official Windows images; importing/building your own Windows images is unsupported.
- **Android remains documented in AgentBay:** [Mobile Use](https://www.alibabacloud.com/help/en/agentbay/developer-reference/mobile-use-andriod-14), **updated 2026-06-23**, documents “Executes a shell command on Android.” That documentation does **not** override the new-customer cutoff. I did not verify a separately available Android replacement for new customers within this review.

**App change:** Remove AgentBay from new-customer recommendations effective today. Route Linux desktop workloads to Agent Sandbox; label Windows **invitational preview—contact support**. Treat Android migration as requiring confirmation, rather than promising equivalent replacement support. Retain AgentBay information for existing customers.

**3. AgentRun**

**Verdict: The warnings target Flow Agent creation and Open Platform/FunAgent; they do not retire the code-first AgentRun runtime in Singapore.**

Evidence:

- [Flow Agent quickstart](https://www.alibabacloud.com/help/en/agentrun/quick-start-to-low-code-agent-creation), **updated 2026-09-18**, states: “The low-code Agent creation feature is in maintenance mode and will not be developed further.” It explicitly discourages new low-code Agents while allowing existing ones to continue.
- [Open Platform introduction](https://www.alibabacloud.com/help/en/agentrun/open-platform-introduction), **updated 2026-08-25**, states: “We recommend that new users do not activate the service.” This warning concerns **Open Platform/FunAgent**, pending a major upgrade; existing users may continue.
- [AgentRun overview](https://www.alibabacloud.com/help/en/agentrun/what-is-agentrun), **updated 2026-08-22**, describes the platform as “code-centric, open, and composable,” documents runtime hosting, sandboxes, model governance/gateway, and mainstream framework integration, including LangChain and Google ADK. It still supplies first-use activation instructions.
- [Supported regions](https://www.alibabacloud.com/help/en/agentrun/open-service-area), **updated 2026-08-22**, explicitly lists “Singapore | ap-southeast-1.”

**App change:** Keep code-first AgentRun as an eligible Singapore recommendation. Suppress new **Flow Agent** and **FunAgent/Open Platform** recommendations separately. Do not attach a product-wide maintenance label. The reviewed overview supports framework-independent hosting but does not individually name LangGraph; avoid presenting that particular framework as separately verified here.

**4. Model Studio endpoints**

**Verdict: Singapore should migrate—including Responses API—but the September 30 feature-freeze wording explicitly names the mainland hostname; no shutdown date is stated.**

Evidence:

- [Regions and endpoints](https://www.alibabacloud.com/help/en/model-studio/regions), **updated 2026-10-13**, says: “The DashScope domain (dashscope.aliyuncs.com) will no longer support new features after September 30, 2026.” Although placed in a general comparison table, this sentence does **not explicitly name** `dashscope-intl.aliyuncs.com`.
- The [Singapore-specific page](https://www.alibabacloud.com/help/en/model-studio/singapore-regional-access-information), **updated 2026-10-13**, says: “For existing business compatibility. We recommend migrating to the workspace-specific endpoint.” It explicitly maps the Singapore shared hostname to a workspace-specific hostname.
- [Responses API reference](https://www.alibabacloud.com/help/en/model-studio/qwen-api-via-openai-responses), **updated 2026-10-29**, explicitly recommends that same Singapore migration and says: “The existing domain remains fully functional.” Separately, it says the old Responses **path** is no longer maintained or guaranteed.

**App change:** Use these Singapore defaults, taking the actual host from the workspace’s **API Host** field:

```text
OpenAI-compatible base URL:
https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1

Responses request:
POST https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1/responses
```

Use the target workspace’s Singapore API key. Replace the legacy Responses path `/api/v2/apps/protocols/compatible-mode/v1/responses`. Label `dashscope-intl.aliyuncs.com` **legacy; migration recommended**, rather than **shut down** or **confirmed feature-frozen since September 30**. The reviewed pages announce no hostname shutdown date.

Codex session ID: 01a19b28-91a9-7e63-a9a8-d6f5871ad5ad
Resume in Codex: codex resume 01a19b28-91a9-7e63-a9a8-d6f5871ad5ad
