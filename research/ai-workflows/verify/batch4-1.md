| id | verdict | evidence | correct value | page checked |
|---|---|---|---|---|
| models-15 | confirmed | Singapore, International lists $0.20 input / $1.60 output per 1M tokens for input≤32K. | | [Qwen3-VL-Plus](https://www.alibabacloud.com/help/en/model-studio/qwen3-vl-plus) |
| models-16 | confirmed | Singapore, International lists $0.30 input / $2.40 output per 1M tokens for 32K<input≤128K. | | [Qwen3-VL-Plus](https://www.alibabacloud.com/help/en/model-studio/qwen3-vl-plus) |
| models-17 | confirmed | Singapore, International lists $0.60 input / $4.80 output per 1M tokens for 128K<input≤256K. | | [Qwen3-VL-Plus](https://www.alibabacloud.com/help/en/model-studio/qwen3-vl-plus) |
| models-12 | confirmed | Context limits list 262,144 tokens. | | [Qwen3-VL-Plus](https://www.alibabacloud.com/help/en/model-studio/qwen3-vl-plus) |
| models-13 | confirmed | Context limits list 260,096 maximum input and 32,768 maximum output. | | [Qwen3-VL-Plus](https://www.alibabacloud.com/help/en/model-studio/qwen3-vl-plus) |
| models-14 | confirmed | Thinking-mode maximum input is 258,048 tokens. | | [Qwen3-VL-Plus](https://www.alibabacloud.com/help/en/model-studio/qwen3-vl-plus) |
| models-18 | unavailable | Cited page timed out. Alternative Alibaba Cloud URL redirected to a model overview without these limits. | | [Cited model page](https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen3-vl-flash), [redirect destination](https://www.alibabacloud.com/help/en/model-studio/models) |
| models-19 | unavailable | Cited page timed out. Alternative Alibaba Cloud URL redirected to a model overview without these limits. | | [Cited model page](https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen3-vl-flash), [redirect destination](https://www.alibabacloud.com/help/en/model-studio/models) |
| models-37 | confirmed | “The non-real-time model supports a 1M-token context” | | [Omni overview](https://www.alibabacloud.com/help/en/model-studio/omni/) |
| models-38 | confirmed | Page explicitly specifies three-hour audio and two-hour video limits for Qwen3.8-Omni-Flash content analysis. | | [Omni overview](https://www.alibabacloud.com/help/en/model-studio/omni/) |
| models-11 | confirmed | Singapore, International lists $0.15 input / $0.47 output per million tokens. | | [ASR Flash](https://www.alibabacloud.com/help/en/model-studio/qwen-audio-3-1-asr-flash) |
| models-59 | corrected | “`qwen3.8-omni-flash-realtime` requires the workspace-specific endpoint below.” Blog returned no readable content. | Singapore endpoint is `wss://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api-ws/v1/realtime?model=<model>`. | [Official realtime guide](https://www.alibabacloud.com/help/en/model-studio/realtime) |
| models-66 | confirmed | Singapore, International lists $0.15 input / $0.47 output per million tokens. | | [ASR Filetrans](https://www.alibabacloud.com/help/en/model-studio/qwen-audio-3-1-asr-flash-filetrans) |
| models-67 | confirmed | China (Beijing) lists $0.848 input / $0.636 output per million tokens. | | [ASR Streaming](https://www.alibabacloud.com/help/en/model-studio/qwen-audio-3-1-asr-flash-streaming) |
| models-87 | china-only | Official mirror’s search extract explicitly says Beijing-only. Both direct SSML page loads timed out. | | [Official SSML mirror](https://docs.modelstudio.console.alibabacloud.com/en/model-studio/ssml-latex-user-guide) |
| models-88 | china-only | Model page lists Beijing alone. Official SSML search extract explicitly identifies both v3.5 models as Beijing-only. | | [CosyVoice v3.5 Flash](https://www.alibabacloud.com/help/en/model-studio/cosyvoice-v3-5-flash), [SSML mirror](https://docs.modelstudio.console.alibabacloud.com/en/model-studio/ssml-latex-user-guide) |
| models-8 | corrected | Realtime speech billing specifies 12.5 tokens/second, with audio under one second counted as one second. | 12.5 tokens for sub-second audio under the realtime speech rule accompanying Beijing pricing. | [China-site pricing](https://help.aliyun.com/zh/model-studio/model-pricing) |
| models-21 | not on page | Morph and older official search extracts show these Singapore International rates. Live official pricing omits Qwen3-VL-Flash. | | [Live official pricing](https://www.alibabacloud.com/help/en/model-studio/model-pricing) |
| models-36 | confirmed | “Input modalities” lists text, images, audio, video. “Output modalities” lists text. | | [Qwen3.8-Omni-Flash](https://www.alibabacloud.com/help/en/model-studio/qwen3-8-omni-flash) |
| models-40 | confirmed | Context limits list 196,608 maximum input and 65,536 maximum output. | | [Qwen3.5-Omni-Plus](https://www.alibabacloud.com/help/en/model-studio/qwen3-5-omni-plus.md) |

- Singapore International streaming ASR costs **$0.93 input / $0.70 output per million tokens**. The claimed lower prices apply to Beijing. [ASR Streaming](https://www.alibabacloud.com/help/en/model-studio/qwen-audio-3-1-asr-flash-streaming)
- Qwen3-VL-Plus supports function calling and batch inference in Beijing. Both are unsupported in Singapore. [Model capabilities](https://www.alibabacloud.com/help/en/model-studio/qwen3-vl-plus)
- Qwen3.5-Omni-Plus also lists function calling, structured outputs, and batch inference as unsupported in Singapore. [Model capabilities](https://www.alibabacloud.com/help/en/model-studio/qwen3-5-omni-plus.md)
- Qwen3.8-Omni-Flash lists six supported regions, including Singapore, Hong Kong, Tokyo, Frankfurt, Virginia, and Beijing. API keys must match the selected region. [Supported regions](https://www.alibabacloud.com/help/en/model-studio/qwen3-8-omni-flash)
- Qwen3-VL-Flash’s live model redirect and absence from live pricing leave its current availability unresolved. Older search extracts still contain its prices. [Model redirect destination](https://www.alibabacloud.com/help/en/model-studio/models), [live pricing](https://www.alibabacloud.com/help/en/model-studio/model-pricing)
- Pricing tiers use decimal units, with K=1,000. The input-token tier determines the unit price for all tokens in that request. [Pricing rules](https://www.alibabacloud.com/help/en/model-studio/model-pricing)

Codex session ID: 01a19b2a-a4b4-7710-8788-8c7dfc4f354f
Resume in Codex: codex resume 01a19b2a-a4b4-7710-8788-8c7dfc4f354f
