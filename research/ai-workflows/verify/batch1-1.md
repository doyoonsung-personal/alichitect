| id | verdict | evidence | correct value | page checked |
|---|---|---|---|---|
| m7 | confirmed | Global rows: $1.65 input / $4.951 output per 1M tokens. | | [Model pricing](https://www.alibabacloud.com/help/en/model-studio/model-pricing) |
| m32 | confirmed | International/Singapore, ≤32K: $0.03 input / $0.13 output per 1M tokens. | | [Model pricing](https://www.alibabacloud.com/help/en/model-studio/model-pricing) |
| m49 | corrected | Prices match; the listed interval extends to 1M. | International/Singapore: 0<Token≤1M; $0.5 input / $3 output per 1M tokens, both modes. | [Model pricing](https://www.alibabacloud.com/help/en/model-studio/model-pricing) |
| m50 | confirmed | International/Singapore, ≤256K: $0.375 input / $2.25 output per 1M tokens, both modes. | | [Model pricing](https://www.alibabacloud.com/help/en/model-studio/model-pricing) |
| m57 | confirmed | International/Singapore: $2.46 input / $7.37 output per 1M tokens. | | [Model pricing](https://www.alibabacloud.com/help/en/model-studio/model-pricing) |
| m58 | confirmed | International/Singapore: $0.16 input / $0.49 output per 1M tokens. | | [Model pricing](https://www.alibabacloud.com/help/en/model-studio/model-pricing) |
| m59 | confirmed | International/Singapore: $0.12 input / $0.36 output per 1M tokens. | | [Model pricing](https://www.alibabacloud.com/help/en/model-studio/model-pricing) |
| m69 | confirmed | “These two discounts cannot apply simultaneously.” | | [Model pricing](https://www.alibabacloud.com/help/en/model-studio/model-pricing) |
| m75 | contradicted | qwen3.8-27b’s Singapore row includes free tokens. | qwen3.8-27b: 1M free tokens in Singapore; the two Qwen3.6 models have none. | [Model pricing](https://www.alibabacloud.com/help/en/model-studio/model-pricing) |
| m76 | confirmed | Total request input determines the tier applied to all request tokens. | | [Model pricing](https://www.alibabacloud.com/help/en/model-studio/model-pricing) |
| a2 | confirmed | International/Singapore: $2 input / $6 output per 1M tokens. | | [Model pricing](https://www.alibabacloud.com/help/en/model-studio/model-pricing) |
| a19 | confirmed | Responses examples pass `web_search`, `web_extractor`, and `code_interpreter` in `tools`. | | [Web extractor](https://www.alibabacloud.com/help/en/model-studio/web-extractor) |
| a25 | confirmed | “The web extractor is free for a limited time.” | | [Web extractor](https://www.alibabacloud.com/help/en/model-studio/web-extractor) |
| a53 | confirmed | Account-level aggregation explicitly includes RAM users, workspaces, and API keys. | | [Rate limiting](https://www.alibabacloud.com/help/en/model-studio/rate-limit) |
| a56 | confirmed | Both models’ International rows specify Dynamic Rate Limiting in the Singapore section. | | [Rate limiting](https://www.alibabacloud.com/help/en/model-studio/rate-limit) |
| m44 | confirmed | Official international-site Portuguese table lists October 10 retirement and the Qwen3.7-Plus replacement; translated IDs use commas. | | [Official retirement table](https://www.alibabacloud.com/help/pt-br/model-studio/model-depreciation) |
| m45 | confirmed | Singapore/International: input ≤32K costs $0.3 input / $1.5 output per 1M tokens. | | [Qwen3-Coder-Flash](https://www.alibabacloud.com/help/en/model-studio/qwen3-coder-flash) |
| m62 | unavailable | Notice returned no readable content. Official policy associates id=1841 with October 10, but does not enumerate these models. | | [Notice 1841](https://www.alibabacloud.com/notice/detail?_p_lc=1&id=1841); [retirement policy](https://www.alibabacloud.com/help/en/model-studio/model-depreciation) |
| a3 | corrected | The restriction concerns console access and specified APIs, rather than access to documentation pages. | Pre-April-21-2025 Singapore application creators can access Application Development; restricted APIs explicitly cover application data, knowledge base, and prompt engineering. | [Application introduction](https://www.alibabacloud.com/help/en/model-studio/application-introduction); [Application Calling](https://www.alibabacloud.com/help/en/model-studio/bailian-application-calling/) |
| a37 | confirmed | “Creating the cache incurs only a 25% surcharge”; “each subsequent hit saves 90%.” | | [Explicit cache guide](https://www.alibabacloud.com/help/en/model-studio/explicit-cache-guide) |
| a62 | confirmed | Separate service activation, configurable detection, and a Singapore `ap-southeast-1` endpoint are documented. | | [Guardrails pricing](https://www.alibabacloud.com/en/product/content-moderation/pricing?_p_lc=1); [Moderation Agent API](https://www.alibabacloud.com/help/en/content-moderation/latest/audit-agent-synchronization-detection-api) |
| a78 | confirmed | HTTP examples use `POST https://dashscope-intl.aliyuncs.com/api/v1/apps/YOUR_APP_ID/completion` for Singapore. | | [Application calling guide](https://www.alibabacloud.com/help/en/model-studio/application-calling-guide) |

- Free web extraction still incurs model input-token charges. Companion web search costs **$10 per 1,000 calls in Singapore**, versus $0.57341 in the other listed regions. [Web extractor](https://www.alibabacloud.com/help/en/model-studio/web-extractor)
- Explicit caching requires at least 1,024 tokens, permits four markers per request, and expires after five minutes unless renewed by a hit. [Cache guide](https://www.alibabacloud.com/help/en/model-studio/explicit-cache-guide)
- Singapore Application Development features are marked preview. The access restriction should be visible to new international customers. [Application introduction](https://www.alibabacloud.com/help/en/model-studio/application-introduction)
- Rate limiting can occur during short bursts even below minute-level quotas; separate API keys do not provide separate account quotas. [Rate limiting](https://www.alibabacloud.com/help/en/model-studio/rate-limit)
- The official international retirement table supports m44; it should not be classified as China-only merely because the third-party article cites China documentation. [Official retirement table](https://www.alibabacloud.com/help/pt-br/model-studio/model-depreciation)

Codex session ID: 01a19b13-d738-7d70-b1fb-e0c2b3f72648
Resume in Codex: codex resume 01a19b13-d738-7d70-b1fb-e0c2b3f72648
