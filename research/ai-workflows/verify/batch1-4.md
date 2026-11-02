| id | verdict | evidence | correct value | page checked |
|---|---|---|---|---|
| m70 | confirmed | Billing applies the 50% rate to input and output of successful requests in Singapore and Beijing. | | [Batch inference](https://www.alibabacloud.com/help/en/model-studio/batch-inference) |
| m71 | contradicted | Scope lists both Singapore and China (Beijing). | Singapore and China (Beijing), with different supported models. | [Batch inference](https://www.alibabacloud.com/help/en/model-studio/batch-inference) |
| m72 | confirmed | The 256K batch context limit explicitly includes all four IDs; regional availability still differs. | | [Batch inference](https://www.alibabacloud.com/help/en/model-studio/batch-inference) |
| a43 | confirmed | Both token directions cost half the corresponding model’s real-time rate, for successful requests. | | [Batch inference](https://www.alibabacloud.com/help/en/model-studio/batch-inference) |
| a44 | confirmed | The documented scope contains only Singapore and China (Beijing). | | [Batch inference](https://www.alibabacloud.com/help/en/model-studio/batch-inference) |
| m20 | confirmed | Context Limits lists 1,000,000 context tokens and 131,072 maximum output tokens. | | [qwen3.8-max](https://www.alibabacloud.com/help/en/model-studio/qwen3-8-max) |
| m21 | confirmed | Singapore, International: implicit-cache input $0.25; explicit-cache creation $2.50 per million tokens. | | [qwen3.8-max](https://www.alibabacloud.com/help/en/model-studio/qwen3-8-max) |
| m43 | confirmed | Thinking-mode limits are 983,616 input tokens and 131,072 output tokens. | | [qwen3.8-max](https://www.alibabacloud.com/help/en/model-studio/qwen3-8-max) |
| m4 | confirmed | FAQ lists all six claimed regions. | | [Model Studio overview](https://www.alibabacloud.com/help/en/model-studio/what-is-model-studio) |
| a1 | confirmed | International-site documentation lists those six service regions, without Seoul; Beijing is geographically mainland China. | | [Model Studio overview](https://www.alibabacloud.com/help/en/model-studio/what-is-model-studio) |
| m33 | confirmed | Singapore, International, input ≤256K: $0.40 input/$1.20 output per million tokens in non-thinking mode. | | [qwen-plus](https://www.alibabacloud.com/help/en/model-studio/qwen-plus) |
| m34 | confirmed | Current alias lists maximum output 32,768 in both thinking and non-thinking modes. | | [qwen-plus](https://www.alibabacloud.com/help/en/model-studio/qwen-plus) |
| a27 | corrected | Singapore fee matches; the documented tool identifier is `web_search_image`, not `t2i_search`. | `web_search_image`: $8 per 1,000 calls in Singapore. | [Text-to-image search](https://www.alibabacloud.com/help/en/model-studio/web-search-image) |
| a28 | corrected | Beijing fee matches; the documented tool identifier is `web_search_image`, not `t2i_search`. | `web_search_image`: $3.44 per 1,000 calls in North China 2 (Beijing). | [Text-to-image search](https://www.alibabacloud.com/help/en/model-studio/web-search-image) |
| m35 | confirmed | Singapore, International, input ≤256K: $0.05 input/$0.40 output per million tokens. | | [qwen-flash](https://www.alibabacloud.com/help/en/model-studio/qwen-flash) |
| m36 | confirmed | Singapore, International, input ≤256K: $0.40 input/$2.40 output per million tokens. | | [qwen3.5-plus](https://www.alibabacloud.com/help/en/model-studio/qwen3-5-plus) |
| m48 | confirmed | Official replacement confirms Singapore, International: $2 input/$6 output per million tokens, matching qwen3.8-max. | | [qwen3.8-2.4t-a95b](https://www.alibabacloud.com/help/en/model-studio/qwen3-8-2-4t-a95b) |
| m51 | confirmed | Official notice includes `qwen3-235b-a22b` and specifies service cessation on October 10, 2026. | | [Official retirement notice](https://www.alibabacloud.com/en/notice/model_studio_notice_on_the_postponed_retirement_of_selected_legacy_models_7d0?_p_lc=1) |
| a11 | contradicted | The Endpoints section also supplies workspace-specific domains for Virginia, Frankfurt, and Tokyo. | Dedicated domains are documented for all six regions. | [Responses API](https://www.alibabacloud.com/help/en/model-studio/compatibility-with-openai-responses-api) |
| a26 | confirmed | “Code Interpreter is free for a limited time but increases token consumption.” | | [Code Interpreter](https://www.alibabacloud.com/help/en/model-studio/qwen-code-interpreter) |
| a65 | confirmed | English replacement confirms enterprise International Site eligibility and workspace-level ZDR, subject to assessment and supported models. | | [Data retention policy](https://www.alibabacloud.com/help/en/model-studio/data-retention-policy) |
| a68 | confirmed | “Alibaba Cloud Model Studio has achieved SOC 2 compliance with an unqualified opinion” | | [Security certifications and privacy](https://www.alibabacloud.com/help/en/model-studio/privacy-notice) |

- Singapore batch documentation is inconsistent: the batch page allows `qwen3.8-max` **multimodal input only**, while its model page says batch inference is unsupported. [Batch page](https://www.alibabacloud.com/help/en/model-studio/batch-inference), [model page](https://www.alibabacloud.com/help/en/model-studio/qwen3-8-max).
- `qwen-flash` has a similar inconsistency: Singapore batch support and batch prices are documented, but its capability table says unsupported. [Batch page](https://www.alibabacloud.com/help/en/model-studio/batch-inference), [qwen-flash](https://www.alibabacloud.com/help/en/model-studio/qwen-flash).
- The `qwen-plus` Singapore thinking-mode output price is **$4 per million**, not $1.20, at input ≤256K. [Pricing](https://www.alibabacloud.com/help/en/model-studio/qwen-plus).
- Region lists do not imply identical capabilities or prices; API keys are not interchangeable across regions. “International” deployment scope should not be confused with all regions offered through the International Site. [Overview](https://www.alibabacloud.com/help/en/model-studio/what-is-model-studio).
- Image search also increases billable model input tokens; the tool-call fee is additional. [Image search billing](https://www.alibabacloud.com/help/en/model-studio/web-search-image).
- ZDR applies to non-mainland regions and selected models. Unsupported-model calls still proceed under standard retention; batch, RAG, application orchestration, and Playground paths are excluded. [ZDR policy](https://www.alibabacloud.com/help/en/model-studio/data-retention-policy).
- The old Responses API path is no longer maintained; use `/compatible-mode/v1/responses`. [Responses API](https://www.alibabacloud.com/help/en/model-studio/compatibility-with-openai-responses-api).

Codex session ID: 01a19b13-e90a-7b91-8091-109697d64c2a
Resume in Codex: codex resume 01a19b13-e90a-7b91-8091-109697d64c2a
