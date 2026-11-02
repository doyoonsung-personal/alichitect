| id | verdict | evidence | correct value | page checked |
|---|---|---|---|---|
| m8 | confirmed | International (Singapore): $0.15 input / $0.47 output per 1M tokens. | | [qwen3.8-flash](https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen3-8-flash) |
| m9 | confirmed | Global rows: $0.113 input / $0.382 output per 1M tokens. | | [qwen3.8-flash](https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen3-8-flash) |
| m29 | confirmed | Context window: 1,000,000; maximum output in thinking mode: 131,072 tokens. | | [qwen3.8-flash](https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen3-8-flash) |
| m30 | corrected | The claim combines International implicit-cache pricing with Global explicit-creation pricing. | Per 1M tokens: International (Singapore), $0.016 implicit / $0.20 creation; Global, $0.014 / $0.177. | [qwen3.8-flash](https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen3-8-flash) |
| m31 | not on page | Release log confirms 2026-08-26 for International; neither page explicitly labels this model GA. | | [Model page](https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen3-8-flash); [release log](https://www.alibabacloud.com/help/en/model-studio/newly-released-models) |
| m1 | confirmed | “International (global nodes excluding Chinese mainland)” | | [Singapore regional access](https://www.alibabacloud.com/help/en/model-studio/singapore-regional-access-information) |
| a67 | confirmed | “the request data is stored in that region.” Singapore’s deployment scope is International. | | [Singapore regional access](https://www.alibabacloud.com/help/en/model-studio/singapore-regional-access-information) |
| m2 | confirmed | For the three named regions: “you must call them from a workspace whose service deployment scope is Global.” | | [Web search](https://www.alibabacloud.com/help/en/model-studio/web-search) |
| a21 | confirmed | Singapore: $10.00 per 1,000 calls; Responses and Anthropic-compatible web search use the agent-policy rate. | | [Web search](https://www.alibabacloud.com/help/en/model-studio/web-search) |
| m26 | confirmed | International (Singapore), input ≤256K: $0.40 input / $1.60 output per 1M tokens, list prices. | | [qwen3.7-plus](https://www.alibabacloud.com/help/en/model-studio/qwen3-7-plus) |
| m27 | confirmed | International (Singapore), 256K<input≤1M: $1.20 input / $4.80 output per 1M tokens, list prices. | | [qwen3.7-plus](https://www.alibabacloud.com/help/en/model-studio/qwen3-7-plus) |
| m40 | confirmed | Billing section explicitly confirms output-token billing and mode-dependent prices for some hybrid thinking models. | | [Deep thinking](https://www.alibabacloud.com/help/en/model-studio/deep-thinking) |
| a50 | confirmed | “Thinking content is billed by Output Token.” | | [Deep thinking](https://www.alibabacloud.com/help/en/model-studio/deep-thinking) |
| m6 | confirmed | International (Singapore): $2 input / $6 output per 1M tokens. | | [qwen3.8-max](https://www.alibabacloud.com/help/en/model-studio/qwen3-8-max); [model pricing](https://www.alibabacloud.com/help/en/model-studio/model-pricing) |
| m12 | confirmed | International release row dated 2026-09-02 identifies qwen3.8-max-0902 as an upgraded snapshot of qwen3.8-max. | | [Model lifecycle and updates](https://www.alibabacloud.com/help/en/model-studio/newly-released-models) |
| m42 | confirmed | “Json mode response is not supported when enable_thinking is true” appears verbatim; applicability is model-dependent. | | [Error codes](https://www.alibabacloud.com/help/en/model-studio/error-code) |
| m46 | confirmed | Context window: 10,000,000; maximum output: 8,192 tokens. | | [qwen-long](https://www.alibabacloud.com/help/en/model-studio/qwen-long) |
| m61 | confirmed | Official fallback says “Scheduled for deprecation on January 19, 2027” and references notice 2217; notice returned only a shell. | | [Model decommissioning policy](https://docs.modelstudio.console.alibabacloud.com/en/model-studio/model-depreciation) |
| a4 | confirmed | Lists all four: OpenAI-compatible Chat Completion, OpenAI-compatible Responses, Anthropic-compatible Messages, and DashScope. | | [Text Generation API Reference](https://www.alibabacloud.com/help/en/model-studio/qwen-api-reference/) |
| a35 | not on page | China-site documentation describes hosted MCP services and CNY billing, but does not explicitly establish geographic exclusivity or international availability. | | [MCP introduction](https://help.aliyun.com/en/model-studio/mcp-introduction) |
| a63 | confirmed | Official search result reproduces: “will never use your data for model training.” Direct page fetch timed out. | | [Security certifications and privacy](https://docs.modelstudio.console.alibabacloud.com/en/model-studio/privacy-notice) |
| a71 | confirmed | “A single workspace cannot span regions.” | | [Permission management](https://www.alibabacloud.com/help/en/model-studio/permission-management-overview) |

- Singapore data storage does **not** mean Singapore-only inference: requests can be processed across International-scope nodes outside mainland China. [Regional access](https://www.alibabacloud.com/help/en/model-studio/singapore-regional-access-information)
- Qwen3.7-plus prices above are list prices; the pricing page advertises a limited-time 20% discount for the International alias. [Model pricing](https://www.alibabacloud.com/help/en/model-studio/model-pricing)
- Web search adds model-token charges, and one response can trigger multiple searches. [Web search](https://www.alibabacloud.com/help/en/model-studio/web-search)
- Qwen3.8-flash lists batch inference and fine-tuning as unsupported in Singapore. [Model capabilities](https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen3-8-flash)
- Qwen-Long’s HTTP requests support only 1M tokens; the page recommends file submission for longer content. [Qwen-Long](https://www.alibabacloud.com/help/en/model-studio/qwen-long)
- The JSON/thinking error should not become a universal restriction: its remedy refers specifically to models supporting structured output only in non-thinking mode. [Error codes](https://www.alibabacloud.com/help/en/model-studio/error-code)
- The privacy page’s absolute wording needs care: another official page qualifies the training prohibition with “without explicit consent.” [Training data summary](https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen-and-wan-training-data-disclosure)
- An API key belongs to one workspace, one user, and one region; default workspaces also cannot enforce model-call restrictions or workspace rate limits. [Permission management](https://www.alibabacloud.com/help/en/model-studio/permission-management-overview)

Codex session ID: 01a19b13-ddbb-7fb2-91fb-608a950db13d
Resume in Codex: codex resume 01a19b13-ddbb-7fb2-91fb-608a950db13d
