Checked against live official sources on **2026-11-02**. No files were created or edited. I attempted **20 distinct pages**, including one unavailable page; additional evidence from search results is identified below. All quotes are under 20 words.

**1. Agent Sandbox — GA is documented, and Singapore is supported; the older FC billing preview is a separate qualification.**

Evidence:

- Product overview: “Agent Sandbox is a secure, isolated execution environment”. Updated **2026-09-16**. [Product overview](https://www.alibabacloud.com/help/en/agent-sandbox/product-overview/agent-sandbox-overview).
- An official announcement says “General Availability (GA)”, published **2026-09-22**. The regions page lists “Singapore” for Flash Edition and Container Edition, updated **2026-10-13**. These two sources were retrieved through live search results. Together, they support the GA/Singapore conclusion. [GA announcement](https://www.alibabacloud.com/en/news/product/general-availability-ga-o7e?_p_lc=1), [supported regions](https://www.alibabacloud.com/help/en/agent-sandbox/product-overview/open-service-area).
- The older FC page specifically says: “Independent pay-as-you-go billing for FC Agent Sandbox is currently in invite-only preview”. Updated **2026-08-20**. This qualifies that billing mechanism, rather than establishing that the current Agent Sandbox product is in preview. [FC billing](https://www.alibabacloud.com/help/en/functioncompute/pay-as-you-go-of-fc-agent-sandbox).
- Current Agent Sandbox billing describes “reference prices for cost estimation”. Updated **2026-09-18**. Its international-site rates for regions outside China apply to Singapore:

| Compute class | USD/vCPU/second | USD/GiB memory/second | USD/GiB disk/second |
|---|---:|---:|---:|
| Economy | 0.00000381 | 0.00000191 | 0.0000000703 |
| Default | 0.00000496 | 0.00000248 | 0.0000000703 |

Billing is per second, with a one-second minimum and hourly bills. Active sandboxes receive a **15 GiB disk allowance**; deep hibernation and snapshots do not. [Current billing overview](https://www.alibabacloud.com/help/en/agent-sandbox/product-overview/billing-overview).

**App action:** Show Singapore availability and GA, attach the current reference rates, and retain an account/billing-model qualification. Do not use the older FC preview notice as a product-wide preview flag. The specific claim that Agent Sandbox is *the AgentBay successor* is **not established** by these pages.

**2. DashVector — available in Singapore; priced by instance specification, duration and replica count.**

The billing formula is “Unit price of instance type × Billing duration × Number of replicas”. The Singapore table publishes **P.small at USD 0.06/hour** and storage-optimized **S.small at USD 0.045/hour**. Usage is calculated per second and settled hourly. Updated **2026-06-02**. [DashVector billing](https://www.alibabacloud.com/help/en/vrs/latest/product-billing).

A separate storage-capacity charge, such as USD/GB-month, is **not established** by that billing page. “Storage-optimized” identifies an instance family, not an additional storage meter.

**App action:** Estimate `regional instance rate × elapsed hours × replicas`. Offer compute-optimized and storage-optimized specifications; do not invent an additional storage charge.

**3. EventBridge — USD 0.82/million applies to custom-bus publishing; external webhooks are supported.**

- The Singapore endpoint is listed in official search evidence; page updated **2022-11-25**. [Regions and endpoints](https://www.alibabacloud.com/help/en/eventbridge/regions-and-endpoints).
- Billing states “USD 0.82 per 1 million published events” for custom buses. Default-bus publishing is free; delivery to Alibaba Cloud service targets is free; custom-target delivery costs **USD 0.91/million**. Events are metered in **64 KB units**. Updated **2025-10-23**. [EventBridge billing](https://www.alibabacloud.com/help/en/eventbridge/product-overview/billing-of-event-buses).
- A recurring numerical free allowance for **custom-bus events** is **not established**. The billing-directory search description mentions free quotas, but its opened page contains no quota terms; updated **2020-11-26**. [Billing directory](https://www.alibabacloud.com/help/en/eventbridge/product-overview/eventbridge-billing/).
- HTTP/HTTPS sources generate “a webhook URL that serves as an endpoint for receiving HTTP requests”. Updated **2026-07-17**. This supports receiving an external email-provider or SaaS webhook when its HTTP method, payload and authentication requirements are compatible. [HTTP/HTTPS event source](https://www.alibabacloud.com/help/en/eventbridge/user-guide/create-a-custom-event-source-of-the-http-or-https-events-type).

**App action:** Separate publishing and delivery charges, meter payload size, and assume no numerical free custom-event quota. Offer external webhook ingestion, with provider-specific compatibility checks.

**4. International inbound telephony — purchasability is not established; neither a blanket “yes” nor “no” is justified.**

The current Voice Service overview describes DID service as enabling “direct inward dialing for incoming calls”, and says the service is deployed in Singapore. But it also states “SIP integration is not supported either” and rules out real-time full-duplex agent calling. It does not settle international-account eligibility or which overseas inbound numbers customers can purchase. Updated **2026-08-04**. [Voice Service overview](https://www.alibabacloud.com/help/en/vms/product-overview/what-is-voice-service).

For **CCC specifically**, international purchase and inbound calling outside mainland China remain **not established** by the retrieved evidence.

Alibaba documents two relevant integration paths:

- **IMS + ARTC:** The international IMS overview says agents connect through the “ApsaraVideo Real-time Communication (ARTC) network”, with global audio/video coverage. This establishes internet-based conversational agents, not telephone-number provisioning. Updated **2026-09-04**. [IMS overview](https://www.alibabacloud.com/help/en/ims/user-guide/real-time-conversational-ai-overview).
- **Bring-your-own SIP trunk:** Official mainland-site search evidence describes third-party service that “Connects to carrier lines through your own SIP trunk”, including inbound configuration. No update date was exposed in that result. The corresponding international URL was unavailable, so **international availability of this integration remains not established**. [IMS phone-call guide](https://help.aliyun.com/en/ims/user-guide/how-to-make-smart-phone-call).

**App action:** Present IMS/ARTC as the documented conversational-media option. Mark overseas PSTN numbers, CCC purchasing and SIP integration as requiring country/account confirmation; do not advertise an immediately purchasable international inbound-phone solution.

**5. CAMS — international use is documented; the four formerly free channels now incur USD 0.005/message platform fees.**

The FAQ explicitly discusses “On the Alibaba Cloud International site” and lists WhatsApp, Facebook Messenger, Instagram, Viber, SMS and email. Updated **2026-08-31**. Telegram and LINE are additionally established by the pricing-change notice. [CAMS FAQ](https://www.alibabacloud.com/help/en/chatapp/support/faq).

| Channel | Alibaba Cloud platform/service fee |
|---|---|
| Messenger, Instagram, Telegram, LINE | **USD 0.005/message from 2026-09-01** |
| WhatsApp, Viber | General published rate: **USD 0.005 per message or conversation**, plus applicable channel charges |
| SMS, email | **No CAMS platform service fee**; underlying product charges apply |

The change notice states “Platform service fee: USD 0.005 per message”. For those four channels, submission to the vendor server triggers the fee even if final delivery fails. Their CAMS message fee remains zero; **LINE’s own plan charges can still apply**. Updated **2026-07-31**. [Pricing-change notice](https://www.alibabacloud.com/help/en/chatapp/pricing-change-for-chat-app-channels).

The general pricing page says “No Chat App service fee applies to SMS and email.” Updated **2026-09-30**. [CAMS pricing](https://www.alibabacloud.com/help/en/chatapp/product-overview/chatapp-message-service-pricing).

**App action:** List all eight channels, require separate SMS/email activation, and remove obsolete “free platform” labels for the four affected channels. Separate CAMS fees from Meta/Viber/LINE and underlying messaging charges.

**6. Responses API tools — Max support is documented; Flash’s exact five-tool matrix is not fully established, and not all tools are free.**

The following reflects the evidence retrieved for Singapore, rather than extrapolating general Responses API compatibility:

| Tool | `qwen3.8-max` | `qwen3.8-flash` | Current tool charge |
|---|---|---|---|
| `web_search` | Supported | Supported | **USD 10/1,000 calls** in Singapore |
| `web_extractor` | Supported | **Not established** for the requested exact scope/API combination | Free for a limited time; required web search is charged |
| `code_interpreter` | Supported | **Not established** by the tool-specific list | Free for a limited time |
| `image_search` | Supported | **Not established** by the tool-specific list | **USD 8/1,000 calls** in Singapore |
| MCP | Supported | **Not established** by the tool-specific list | Model tokens plus each MCP server’s charges; not universally free |

Evidence and qualifications:

- Web search’s official search result explicitly includes Qwen3.8 Max and Flash under Singapore and Responses support. Billing says “For the Singapore region: $10.00” per 1,000 calls. **Update date not shown.** [Web search](https://docs.modelstudio.console.alibabacloud.com/en/model-studio/web-search).
- Web extractor’s Responses-specific list names Qwen3.8-Max but lists Flash generations only through 3.7. Its broader **Anthropic** section includes 3.8 Flash, which does not settle the requested Responses matrix. It says “The web extractor is free for a limited time.” **Update date not shown; search-result evidence.** [Web extractor](https://docs.modelstudio.console.alibabacloud.com/en/model-studio/web-extractor).
- Code Interpreter documents Max with a Singapore endpoint and states “Code Interpreter is free for a limited time but increases token consumption.” Its Flash list stops at 3.7. **Update date not shown.** [Code Interpreter](https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen-code-interpreter).
- Image search documents Max with a Singapore endpoint and charges per 1,000 calls; its Flash list also stops at 3.7. **Update date not shown.** [Image search](https://docs.modelstudio.console.alibabacloud.com/en/model-studio/image-search).
- MCP documents Max with a Singapore endpoint and says “MCP server fees: Subject to the billing rules of each MCP server.” Its Flash list stops at 3.7. **Update date not shown; search-result evidence.** [MCP](https://docs.modelstudio.console.alibabacloud.com/en/model-studio/mcp).

The broad Responses guide contains inconsistent free-tool wording. Its general model list is insufficient to establish every model/tool combination. **Update date not shown.** [Responses guide](https://docs.modelstudio.console.alibabacloud.com/en/model-studio/compatibility-with-openai-responses-api).

**App action:** Maintain capabilities by **model + region + deployment scope + API + tool**. Enable documented combinations, mark unresolved Flash combinations as unverified, and distinguish temporary free tool execution from billable model tokens.

Codex session ID: 01a19bdb-1ab8-70c1-b933-f72914559c25
Resume in Codex: codex resume 01a19bdb-1ab8-70c1-b933-f72914559c25
