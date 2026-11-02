Fact-check task. Read-only: do not edit or create files. Today is 2026-11-02.

Another model researched facts for an app that Alibaba Cloud pre-sales staff use with international customers (Singapore is the default region). Below are its claims, grouped by the page it cited. Check each claim against the live page.

How to work:
- Open each cited page once, live (web search or open), and check every claim listed under it. Do not answer from memory: product names, prices and availability change often.
- If the cited page is a third-party site, or does not hold the fact, run at most one search for an official page (alibabacloud.com first, then docs.modelstudio.console.alibabacloud.com, then help.aliyun.com/en) and check there instead.
- Open at most 30 pages in total. Do not follow links beyond what a claim needs; this is a targeted check, not a crawl.
- Prices: say which deployment scope or region the row is for (for example "International" for Singapore, "Global", or "Chinese mainland").
- Watch for facts that hold only on the China site (aliyun.com, Beijing region) but are claimed for international customers.

Return one Markdown table with a row per claim, in claim order:

| id | verdict | evidence | correct value | page checked |

- verdict is one of: confirmed, corrected (the page gives a different value), contradicted (the page says the opposite), not on page (the page does not mention it), unavailable (the page would not load), china-only (true only for the China site or mainland regions).
- evidence: a quote of at most 20 words from the page, or a short reason.
- correct value: only for corrected or contradicted rows.
- page checked: the URL you actually used.

After the table, list in at most 8 bullets anything you noticed on these pages that the claims got wrong or missed and that matters for international customers (for example a model that is deprecated, a region that is missing, a feature that is China-only).

Claims:

Page: https://www.alibabacloud.com/help/en/model-studio/model-pricing
- models-3: Batch pricing is 50% of the real-time price for both input and output tokens on supported models.
- models-23: `qwen3.7-plus` Singapore price for 0<Token≤256K is $0.40 input / $1.60 output per 1M tokens.
- models-24: `qwen3.7-flash` Singapore price for 0<Token≤32K is $0.030 input / $0.130 output per 1M tokens.
- models-25: `qwen3.7-flash` Singapore price for 32K–256K is $0.100 input / $0.400 output per 1M tokens.
- models-26: `qwen3.7-flash` Singapore price for 256K–1M is $0.200 input / $0.800 output per 1M tokens.
- models-27: `qwen3.8-flash` International price is $0.15 input / $0.016 cache-hit / $0.47 output per 1M tokens.
- models-32: `qwen-vl-ocr` Singapore price is $0.07 input / $0.16 output per 1M tokens.
- models-33: `qwen-vl-ocr` Global-scope price is $0.043 input / $0.072 output per 1M tokens.
- models-34: `qwen3.5-ocr` is available only in China (Beijing) and not sellable to international customers.
- models-35: `qwen3.5-ocr` China (Beijing) price is $0.069 input / $0.275 output per 1M tokens.
- models-39: `qwen3.8-omni-flash` Singapore price is $0.15 input / $0.016 cache-hit / $0.47 output per 1M tokens.
- models-42: `qwen3.5-omni-plus` Singapore price is $1.40 text/image/video in, $11 audio in, $8.30 text out, $44 audio out per 1M tokens.
- models-48: `qwen3.8-omni-flash-realtime` Beijing price is $0.212 text/image/video in, $0.848 audio in, $0.636 text out, $1.696 audio out per 1M tokens.
- models-50: `qwen3.5-omni-plus-realtime` International price is $2.1 / $16.5 / $12.4 per 1M tokens.
- models-53: `qwen3.5-omni-flash-realtime` International price is $0.55 / $4.50 / $3.30 / $17.70 per 1M tokens.
- models-55: `qwen-audio-3.1-realtime-flash` Singapore price is $0.23 text in / $0.93 audio in / $0.70 text out / $1.87 audio out per 1M tokens.
- models-57: `qwen-audio-3.1-realtime-plus` Singapore price is $0.80 / $6.40 / $6.40 / $24.00 per 1M tokens.
- models-58: `qwen3.8-livetranslate-flash-realtime` Beijing price is $5.653 / $0.466 / $14.133 / $22.613 per 1M tokens.
- models-69: `qwen3-asr-flash` International price is $0.000035 per second.
- models-70: `qwen3-asr-flash-realtime` International price is $0.000090 per second with a free quota of 36,000 seconds.
- models-75: `paraformer-v2` price is $0.000012 per second.
- models-79: `qwen-audio-3.1-tts-plus` price is $0.30 per 10,000 characters.
- models-80: `qwen-audio-3.0-tts-plus` price is $0.20 per 10,000 characters.
- models-81: `qwen-audio-3.0-tts-flash` price is $0.15 per 10,000 characters.
- models-83: `qwen3-tts-flash` price is $0.10 per 10,000 characters with a free quota of 110,000 characters.
- models-85: `cosyvoice-v3-plus` price is $0.26 per 10,000 characters.
- models-86: `cosyvoice-v3-flash` price is $0.13 per 10,000 characters.
- models-89: Voice cloning via `qwen-voice-enrollment` costs $0.01 per voice clone with a cap of 1,000 voices per account.
- models-95: `text-embedding-v4` Singapore price is $0.07 per 1M input tokens.
- models-101: `qwen3-vl-embedding` price is $0.258 for image/video and $0.10 for text per 1M tokens.
- models-103: `tongyi-embedding-vision-plus` price is $0.09 per 1M tokens.
- models-106: `qwen3-rerank` Singapore price is $0.10 per 1M input tokens.
- models-109: `qwen-image-3.0-pro` price is $0.003 per input image and $0.04 per output image at 1K resolution.
- models-110: `qwen-image-3.0-pro` price is $0.075 per output image at 2K resolution.
- models-111: `qwen-image-2.1-pro` price is $0.04 per image.
- models-112: `qwen-image-2.1-turbo` price is $0.016 per image.
- models-113: `wan2.7-image-pro` price is $0.075 per image.
- models-114: `wan2.7-image` price is $0.03 per image.
- models-116: `wan3.0-video` price is $0.05 (480P), $0.10 (720P), $0.20 (1080P) per output second.
- models-117: `wan3.0-video-prime` price is $0.068 (480P), $0.14 (720P), $0.28 (1080P) per output second.
- models-118: `happyhorse-1.0-t2v` price is $0.07 (480P), $0.14 (720P), $0.18 (1080P) per output second.
- models-4: Context cache discounts apply to input tokens only and cannot be combined with batch discounts.
- models-5: Tiered pricing selects a tier based on total input tokens in the request, billing all tokens at that tier.
