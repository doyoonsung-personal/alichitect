Checked live on **2026-11-02**, read-only, within the 20-page opening limit. Prices below are **USD per 1 million tokens**, unless stated otherwise. “Date not shown” means no update date appeared in the retrieved content.

**1. Singapore OCR — `qwen3.5-ocr` International availability and pricing are not established; `qwen-vl-ocr` is explicitly listed internationally.**

Evidence:

- The [`qwen3.5-ocr` page](https://www.alibabacloud.com/help/en/model-studio/qwen3-5-ocr) shows only “China (Beijing)”: input **$0.069**, output **$0.275**. It does not establish Singapore availability or Singapore prices. **Update date: not shown.**
- The [pricing table](https://www.alibabacloud.com/help/en/model-studio/model-pricing) explicitly lists “International” for `qwen-vl-ocr`, at **$0.07 input / $0.16 output**. Its current alias is `qwen-vl-ocr-2025-11-20`, which has the same International prices. **Updated: 2026-10-29.**

**App:** Offer `qwen-vl-ocr` for the Singapore default. Mark `qwen3.5-ocr` Singapore support **not established**; do not reuse its Beijing prices or claim definitively that it is unavailable.

**2(a). CloudFlow — Singapore and callback approval patterns are documented; Standard execution lasts up to one year, but current-version billing needs qualification.**

Evidence:

- The [callback guide](https://www.alibabacloud.com/help/en/serverless-workflow/latest/perform-callbacks-on-asynchronous-tasks) says: “Call `ReportTaskSucceeded` or `ReportTaskFailed` with the `taskToken` to resume.” It documents `pattern: waitForCallback` and explicitly mentions approval notifications. **Updated: 2026-06-03.**
- The [API endpoint table](https://www.alibabacloud.com/help/en/serverless-workflow/latest/call-method) lists “Singapore” and `ap-southeast-1.fnf.aliyuncs.com`. **Updated: 2026-03-10.**
- The [mode comparison](https://www.alibabacloud.com/help/en/serverless-workflow/latest/standard-workflow-and-express-workflow) lists “Maximum execution duration” as “1 year” for Standard. `WaitForCustomCallback` and `WaitForSystemCallback` are Standard-only. This is the **whole-execution ceiling**, not an unconditional one-year timeout for every task. **Updated: 2026-03-11.**
- The [detailed billing page](https://www.alibabacloud.com/help/en/serverless-workflow/latest/billing-billing) states “5,000 free step transitions per month” and “USD 0.25 per 10,000 step transitions”: **$0.000025 per transition**. It also says commercial prices and quotas prevail. **Updated: 2026-06-15.**
- The [product page](https://www.alibabacloud.com/en/product/serverless-workflow?_p_lc=1) agrees: “0.025 USD/thousand times” after 5,000 monthly free transitions. **Update date: not shown.**
- However, the [version billing overview](https://www.alibabacloud.com/help/en/serverless-workflow/latest/billing-overview) places that detailed billing link under **“CloudFlow previous version”**; its new-version section only states billing began October 10, 2025. **Updated: 2025-12-09.**

**Free-allowance conclusion:** **5,000 is supported by the opened pages; 1,000 was not substantiated.** Whether the same allowance and rate apply to the **new version** is **not established** by these pages.

**App:** Support Singapore human approval using Standard callbacks. Distinguish legacy `waitForCallback` from current `WaitForCustomCallback`, enforce execution/task timeouts, and label the quoted billing as documented previous-version/reference pricing until current commercial billing is confirmed.

**2(b). AgentCore — Reviewer acceptance, pause and resume are documented internationally; “managed agents only” and Singapore availability are not established.**

The [team-task guide](https://www.alibabacloud.com/help/en/agentcore/using-team-tasks) defines the reviewer as:

> “The person or Agent responsible for accepting task results and providing revision feedback”

It also says:

> “The task is paused. To continue, click Resume”

The guide describes formal acceptance through result cards, revision feedback, and separate management versus reviewer permissions. Its setup links to “Use a managed Harness,” but that link does **not** establish an exclusive managed-agent restriction. The page does not establish deployment in Singapore. **Updated: 2026-09-24.**

**App:** Describe this as an **AgentCore team-task feature**, with reviewer and participant permission checks. Do not advertise it as a universally available Singapore approval API or label it “managed agents only” without further evidence.

**3. AgentLoop — Hong Kong is the only non-mainland region in the supported-regions guide; Singapore international-account usability remains not established.**

Evidence:

- The [supported-regions page](https://www.alibabacloud.com/help/en/agentloop/product-overview/server-launch-regions-of-agentloop) lists only Hangzhou, Shanghai and “China (Hong Kong) | cn-hongkong.” **Update date: not shown.**
- The [quickstart](https://www.alibabacloud.com/help/en/agentloop/agentloop-quickstart-whole-process-practice) agrees: “Select cn-hangzhou, cn-shanghai, or cn-hongkong.” **Update date: not shown.**
- The [endpoint reference](https://www.alibabacloud.com/help/en/agentloop/latest/api-agentloop-2026-05-20-endpoint) nevertheless lists “Singapore” and `agentloop.ap-southeast-1.aliyuncs.com`. **Updated: 2026-07-24.**

These establish a documentation mismatch. An API endpoint listing does not settle access to the complete observability/evaluation service, nor account eligibility. The opened pages also do not explicitly settle international-account access to the listed mainland regions.

**App:** Present Hong Kong as the documented non-mainland deployment option. Mark Singapore **not established / requires account-level confirmation**, rather than enabling it solely from the endpoint hostname.

**4. `qwen3.7-plus` — International prices, function calling and batch inference are explicitly documented.**

The [`qwen3.7-plus` page](https://www.alibabacloud.com/help/en/model-studio/qwen3-7-plus) labels the relevant section “Scope: International,” with “Function Calling | Supported” and “Batch Inference | Supported.” **Update date: not shown.**

| Input tokens per request | Input list price | Output list price | Implicit-cache input | Explicit-cache read |
|---|---:|---:|---:|---:|
| 0 < tokens ≤ 256K | $0.40 | $1.60 | $0.08 | $0.04 |
| 256K < tokens ≤ 1M | $1.20 | $4.80 | $0.24 | $0.12 |

Explicit-cache creation is separately listed at **$0.50 / $1.50** for those tiers. The [main pricing page](https://www.alibabacloud.com/help/en/model-studio/model-pricing), **updated 2026-10-29**, confirms the list prices and equal output prices for thinking and non-thinking modes; it separately labels a limited-time 20% promotion.

**App:** Store list prices separately from promotions and cache categories. Select the tier using total request input tokens. Enable function calling and batch support for the exact alias; do not automatically transfer that flag to `qwen3.7-plus-2026-05-26`, whose detail section lists batch inference as unsupported.

**5. Off-peak discounts — Yes, International/Singapore has explicitly listed idle-hour prices; they are not mainland-only.**

The [pricing page](https://www.alibabacloud.com/help/en/model-studio/model-pricing) states:

> “Busy hours are 08:00 to 22:00 and idle hours are 22:00 to 08:00 the next day”

Both are **UTC+8**, matching Singapore time. Its Singapore/International table lists:

| Model | Busy input → idle input | Busy output → idle output |
|---|---:|---:|
| `deepseek-v4.1-flash` | $0.30 → $0.15 | $1.20 → $0.60 |
| `deepseek-v4.1-flash-1017` | $0.30 → $0.15 | $1.20 → $0.60 |
| `deepseek-v4-pro-0813` | $1.32 → $0.66 | $3.96 → $1.98 |
| `deepseek-v4-flash-0731` | $0.44 → $0.22 | $1.32 → $0.66 |

**Updated: 2026-10-29.** The International `deepseek-v4-pro` alias has flat prices in that table; it must not inherit the dated model’s discount.

**App:** Apply these schedules only to the exact listed models and International scope. Do not transfer Qwen **Global-scope** nighttime promotions to Singapore’s **International** prices.

**6. `qwen3-vl-flash` — Current Singapore availability and price are not established by the live opened pages.**

Evidence:

- The [primary model URL](https://www.alibabacloud.com/help/en/model-studio/qwen3-vl-flash) redirects to **“Recommended models.”** The destination is **updated 2026-10-28**.
- The [secondary official model URL](https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen3-vl-flash) likewise returned the recommended-models content. **Update date: not shown.**
- Both opened pricing tables omit `qwen3-vl-flash`; their Qwen-VL section currently lists `qwen3-vl-plus`. The [secondary pricing page](https://docs.modelstudio.console.alibabacloud.com/en/model-studio/model-pricing) says it lists “standard prices.” **Update date: not shown**; primary pricing page: **2026-10-29**.

Search-index excerpts still describe an earlier International release, but that does not establish today’s offering or price. The redirects and omissions also do not, by themselves, prove retirement.

**App:** Mark current support and price **not established** and exclude it from automatically priced Singapore proposals until a current regional catalog entry confirms both.

Codex session ID: 01a19bdb-156d-7553-9e7c-f326e8382330
Resume in Codex: codex resume 01a19bdb-156d-7553-9e7c-f326e8382330
