| id | verdict | evidence | correct value | page checked |
|---|---|---|---|---|
| models-6 | confirmed | Formula shown as `h x w / (32 x 32) + 2`. | | [Vision](https://www.alibabacloud.com/help/en/model-studio/vision-model/) |
| models-7 | confirmed | Page states most models support 16 million pixels per image. | | [Vision](https://www.alibabacloud.com/help/en/model-studio/vision-model/) |
| models-22 | confirmed | `qwen3.7-plus` has 1M context and supports videos up to two hours. | | [Vision](https://www.alibabacloud.com/help/en/model-studio/vision-model/) |
| models-9 | confirmed | Eligibility explicitly requires Singapore region and International deployment scope. | | [Free quota](https://www.alibabacloud.com/help/en/model-studio/new-free-quota) |
| models-10 | confirmed | Typically 1,000,000 tokens per model, with 90-day validity. Earlier activations have a qualification noted below. | | [Free quota](https://www.alibabacloud.com/help/en/model-studio/new-free-quota) |
| models-20 | not on page | Advertises $0.05 input/$0.40 output starting rates per 1M tokens, but does not identify Singapore/International scope. | | [Campaign](https://www.alibabacloud.com/en/campaign/ai-landing-page-token?_p_lc=1), [official pricing fallback](https://www.alibabacloud.com/help/en/model-studio/model-pricing) |
| models-43 | confirmed | Singapore/International lists $0.40 text/image/video input, $3 audio input, $2.20 text output, $11.90 audio output per 1M tokens. | | [Official pricing](https://www.alibabacloud.com/help/en/model-studio/model-pricing) |
| models-29 | confirmed | Context Limits lists maximum input 30,000 and maximum output 8,192. | | [OCR specifications](https://www.alibabacloud.com/help/en/model-studio/qwenvl-ocr) |
| models-30 | confirmed | “Context Window” is 38192. | | [OCR specifications](https://www.alibabacloud.com/help/en/model-studio/qwenvl-ocr) |
| models-1 | confirmed | All five regions appear in the regional access table. Their supported deployment scopes differ. | | [Regions](https://www.alibabacloud.com/help/en/model-studio/regions) |
| models-2 | confirmed | “International (global nodes excluding Chinese mainland)” | | [Singapore access](https://www.alibabacloud.com/help/en/model-studio/singapore-regional-access-information) |
| models-60 | confirmed | Official fallback confirms Beijing’s public domain and `/api-ws/v1/realtime` path for Qwen-TTS-Realtime. Cited page now shows workspace endpoints. | | [WebSocket overview, search result](https://www.alibabacloud.com/help/en/model-studio/realtime-websocket-overview) |
| models-61 | confirmed | Realtime documentation explicitly gives `wss://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api-ws/v1/realtime` for Singapore. Original citation lacks it. | | [Realtime](https://www.alibabacloud.com/help/en/model-studio/realtime) |
| models-73 | china-only | $0.000047/second appears under China (Beijing). The page provides no Singapore/International price. | | [Fun-ASR-Realtime](https://docs.modelstudio.console.alibabacloud.com/en/model-studio/fun-asr-realtime) |
| models-78 | confirmed | Official Singapore pricing lists $0.23 input and $1.87 output per million tokens. | | [Qwen-Audio-3.1-TTS-Flash](https://www.alibabacloud.com/help/en/model-studio/qwen-audio-3-1-tts-flash) |
| models-99 | confirmed | Explicitly excludes multimodal embeddings, including `qwen3-vl-embedding` and the `tongyi-embedding-vision` series, from OpenAI compatibility. | | [Embedding API](https://www.alibabacloud.com/help/en/model-studio/embedding-interfaces-compatible-with-openai) |
| models-107 | confirmed | “The gte-rerank model will be discontinued on May 30, 2026. Switch to qwen3-rerank.” | | [Text rerank](https://www.alibabacloud.com/help/en/model-studio/text-rerank-api) |
| models-28 | not on page | Vision list contains only `qwen3-vl-plus`, `qwen-vl-ocr`, and `qwen3.5-ocr`. Official fallback did not establish `gui-plus` availability. | | [Vision model list](https://www.alibabacloud.com/help/en/model-studio/model-list-visual-understanding/) |
| models-31 | confirmed | Image limits require both dimensions above 10 pixels and aspect ratio within 200:1 and 1:200. | | [OCR usage](https://www.alibabacloud.com/help/en/model-studio/qwen-vl-ocr) |

- Singapore’s International scope permits inference on global nodes outside mainland China. Static data stays in Singapore. [Singapore access](https://www.alibabacloud.com/help/en/model-studio/singapore-regional-access-information)
- The campaign’s `qwen3-vl-flash` prices lack a region label, and the current official pricing page does not list that model. Its Singapore price remains unverified. [Campaign](https://www.alibabacloud.com/en/campaign/ai-landing-page-token?_p_lc=1), [Pricing](https://www.alibabacloud.com/help/en/model-studio/model-pricing)
- The campaign advertises free quota for `qwen3.5-omni-flash`, but the quota documentation records its removal on October 29. Previously issued quota remains usable until expiration or exhaustion. [Free quota](https://www.alibabacloud.com/help/en/model-studio/new-free-quota)
- The 90-day rule has an exception for users activated before September 8’s adjustment. Free Quota Only is disabled by default, so continued usage can incur charges. [Free quota](https://www.alibabacloud.com/help/en/model-studio/new-free-quota)
- For `qwen3.5-omni-flash` text-plus-audio output, only audio is billed. The corresponding output text is free. [Pricing](https://www.alibabacloud.com/help/en/model-studio/model-pricing)
- OCR’s 8,192-token maximum requires qualification. The usage guide defaults to 4,096 and directs customers to their commercial manager for higher output limits. [OCR usage](https://www.alibabacloud.com/help/en/model-studio/qwen-vl-ocr)
- May 30, 2026 has already passed. The rerank page retains future-tense wording and directs Singapore customers to `qwen3-rerank`. [Text rerank](https://www.alibabacloud.com/help/en/model-studio/text-rerank-api)
- The legacy Beijing endpoint confirmation came from the official search result because opening that fallback timed out. The cited Realtime page documents workspace-dedicated endpoints for Beijing and Singapore. [WebSocket overview](https://www.alibabacloud.com/help/en/model-studio/realtime-websocket-overview), [Realtime](https://www.alibabacloud.com/help/en/model-studio/realtime)

Codex session ID: 01a19b2a-a9a7-7f71-8245-2f40060e7e59
Resume in Codex: codex resume 01a19b2a-a9a7-7f71-8245-2f40060e7e59
