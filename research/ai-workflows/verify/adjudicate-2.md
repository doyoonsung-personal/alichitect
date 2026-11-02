## Findings as of 2026-11-02

Used live official-source searches and attempted to open **18 distinct pages**, including retrieval retries. No files were created or edited. Two conclusions require qualification—AgentCore’s formal GA label and Singapore-specific Tablestore prices.

### 1. Messaging channels

**Verdict — AgentCore supports DingTalk, Feishu/Lark, and WeCom. Other Alibaba Cloud products document WhatsApp, LINE, Telegram, and Slack integrations.**

**Evidence**

- `CreateAgentIMChannel.channelType` lists “Valid values: DINGTALK (DingTalk), FEISHU (Lark), and WECOM (WeCom).” No update date appeared in the retrieved API body. The channel guide, updated **2026-09-24**, confirms those three platforms and restricts IM channels to managed agents. [CreateAgentIMChannel](https://www.alibabacloud.com/help/en/agentcore/api-agentcore-2026-08-04-createagentimchannel), [channel guide](https://www.alibabacloud.com/help/en/agentcore/integrate-the-agent-into-the-im-channel)
- Chat App Message Service lists “WhatsApp, Viber, Messenger, Instagram, Telegram, and LINE.” It binds Telegram bots and LINE Official Accounts alongside WhatsApp business numbers. Updated **2026-10-09**. [Channel management](https://www.alibabacloud.com/help/en/chatapp/user-guide/channel-management/)
- QwenWork documents “To receive and reply to Slack messages, you need the Bot Token and App-Level Token from Slack.” It also documents WhatsApp QR binding. Updated **2026-10-28**. Its introductory platform table omits these two, although dedicated setup sections explicitly describe them. [QwenWork IM channels](https://www.alibabacloud.com/help/en/qwenwork/qw-im-channel)
- Microsoft Teams appears as a **DataWorks data-push destination**, with “DingTalk, Lark, WeCom, Teams, or email.” Updated **2026-10-10**. This evidence came from the official search result within the page budget. [Data push node](https://www.alibabacloud.com/help/en/dataworks/user-guide/data-push-node)
- I found no documented native **KakaoTalk** channel, and no evidence establishing the six requested platforms as native **AgentRun** channels. These are bounded search findings, rather than proof of absence across the entire international catalog.

**Custom integration**

AgentCore’s managed Harness guide says “Direct access is used to call Agents from your application server.” It documents `POST /ag-ui/agent`, `x-api-key` authentication, and SSE responses. Updated **2026-10-16**. An application-owned adapter can receive a messaging platform’s webhook/events, invoke this endpoint, and send the response through that platform’s API. The adapter architecture is an implementation inference from the documented direct-access interface. [Managed Harness guide](https://www.alibabacloud.com/help/en/agentcore/agent-instructions-managed-harness)

**What the app should do**

Maintain product-specific channel records. Offer the three AgentCore connectors, list Chat App Message Service and QwenWork integrations separately, classify Teams data push as outbound messaging, and label KakaoTalk/other AgentCore channels as requiring custom integration or verification.

### 2. AgentCore lifecycle and Singapore

**Verdict — AgentCore is commercially billed and available in Singapore. The checked pages support a post-preview commercial status, but do not explicitly declare “GA.”**

**Evidence**

- “AgentCore starts billing at 00:00:00 on September 18, 2026 (UTC+8).” The page discusses resources created during the public preview in the past tense. Updated **2026-09-24**. [Billing activation](https://www.alibabacloud.com/help/en/agentcore/agentcore-billing-activation)
- The overview’s supported-region table includes “Singapore | ap-southeast-1.” Updated **2026-10-14**. [Product overview](https://www.alibabacloud.com/help/en/agentcore/agentcore-product-overview)
- “AgentCore uses the pay-as-you-go billing method,” with a Singapore pricing row. Updated **2026-10-26**. [Billing](https://www.alibabacloud.com/help/en/agentcore/agentcore-billing-instructions)

**What the app should do**

Show **Commercial / pay-as-you-go, Singapore supported**. Remove a current public-preview/free-service label. Keep a formal GA designation unverified until an explicit lifecycle statement is available.

### 3. Model Studio knowledge base for a new 2026 account

**Verdict — Under the documented eligibility rule, a new 2026 account cannot create a Singapore Model Studio knowledge base. `file_search` supplies no documented bypass.**

**Evidence**

- Eligibility requires users who “created Alibaba Cloud Model Studio applications in the Singapore region before April 21, 2025.” The restriction applies to both the Application Development console and application-data/knowledge-base/prompt-engineering APIs. Updated **2026-10-11**. [Knowledge base](https://www.alibabacloud.com/help/en/model-studio/rag-knowledge-base)
- The Responses API retrieval guide requires “Create a knowledge base and obtain its ID.” It passes that ID in `vector_store_ids` and includes Singapore endpoint examples. No update date appeared in the retrieved body. [Knowledge retrieval / file_search](https://www.alibabacloud.com/help/en/model-studio/file-search)

The `file_search` conclusion follows from its required knowledge-base prerequisite. The page does not independently explain the grandfathering restriction or establish an exemption.

**What the app should do**

Disable this managed-KB path for new international accounts by default. For older accounts, check whether they created a Singapore application before the cutoff—account age alone is insufficient. Offer a separately implemented retrieval path, such as Tablestore Knowledge Storage, for new accounts.

### 4. qwen3.8-flash cache prices

**Verdict — International/Singapore prices are $0.20 for explicit creation and $0.016 for either explicit or implicit hits, per 1M tokens.**

| Billing item | USD per 1M tokens |
|---|---:|
| Explicit-cache creation | **0.20** |
| Explicit-cache hit/read | **0.016** |
| Implicit-cache hit | **0.016** |

**Evidence**

The International table gives “Explicit Cache Creation | 0.2,” “Explicit Cache Read | 0.016,” and “Input(Implicit Cache) | 0.016.” Its unit is per 1M tokens. No update date is displayed in the retrieved model page. [qwen3.8-flash pricing](https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen3-8-flash)

The cache guide explicitly says “Both ratios vary by region” for this model’s explicit cache, and also exempts its implicit hits from the general 20% rule. Updated **2026-10-27**. [Context Cache](https://www.alibabacloud.com/help/en/model-studio/context-cache)

**What the app should do**

Store these three prices directly under the model’s International/Singapore scope. Use model-specific pricing overrides in the calculator.

### 5. Retirement on 2027-01-19

**Verdict — Notice 2217 retires four model IDs and recommends `qwen3.8-flash` for all four.**

| Affected model ID | Named replacement |
|---|---|
| `qwen3.5-plus` | `qwen3.8-flash` |
| `qwen3.5-plus-2026-02-15` | `qwen3.8-flash` |
| `qwen3.5-plus-2026-04-20` | `qwen3.8-flash` |
| `qwen3.5-397b-a17b` | `qwen3.8-flash` |

**Evidence**

“The models will completely cease inference services.” The notice specifies EOM on **2026-11-18** and decommissioning on **2027-01-19**, with affected time **10:00 UTC+8**, subject to actual change time. Published **2026-10-19 09:41:39**. The direct page returned no readable body, so the table and wording were verified from the official page’s indexed search content. [Notice 2217](https://www.alibabacloud.com/notice/detail?_p_lc=1&id=2217)

**What the app should do**

Mark these exact IDs as scheduled for retirement, show both milestones, and recommend the named replacement with migration validation. Scope the retirement flag to the four listed IDs.

### 6. Tablestore Knowledge Storage and Memory Storage

**Verdict — Both support Singapore. The international documentation publishes CNY rates, but I could not verify a Singapore-specific USD tariff.**

**Evidence**

The overview includes “China (Hong Kong), and Singapore regions” in its supported-region list. It covers both Knowledge Storage and Memory Storage. Updated **2026-09-24**. [Product overview](https://www.alibabacloud.com/help/en/tablestore/memory-storage-service-sub-product-test/agentstorage-product-overview)

The international billing page publishes the following rates for service-managed storage. Updated **2026-09-24**. [Product Billing](https://www.alibabacloud.com/help/en/tablestore/memory-storage-service-sub-product-test/product-billing)

| Item | Published price and unit |
|---|---:|
| Knowledge storage | CNY 1.08 / GB / month, charged hourly |
| Long-term memory | CNY 0.002 / 10,000 entries / hour |
| Short-term memory/messages | CNY 0.00004 / 10,000 entries / hour |
| Model and compute consumption | CNY 1 / 100 Credits |
| Knowledge document processing | Currently free |

The page states “Credit is the unified measurement unit for model and compute consumption” and quotes “CNY 1 / 100 Credit.” Credits cover embedding, reranking, generation, and memory processing. Existing customer-selected Tablestore instances use Tablestore billing, and OSS files incur separate charges. [Product Billing](https://www.alibabacloud.com/help/en/tablestore/memory-storage-service-sub-product-test/product-billing)

**Documentation conflict:** The memory section’s introductory note mentions GB/month charging, while its detailed table uses entries/hour. This needs resolution before producing a firm customer estimate.

**What the app should do**

Show Singapore availability. Label these as **published CNY reference rates**, retain their exact units, and flag Singapore commercial pricing and the memory-meter inconsistency for confirmation. Keep storage charges, Credits, and separately billed underlying resources distinct.

Codex session ID: 01a19b5e-ef7e-7bb1-ad71-6a4c3dcf2264
Resume in Codex: codex resume 01a19b5e-ef7e-7bb1-ad71-6a4c3dcf2264
