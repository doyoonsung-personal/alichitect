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

Page: https://www.alibabacloud.com/help/en/model-studio/vision-model/
- models-6: Image token formula for vision models is `tokens = h × w / (32 × 32) + 2`.
- models-7: Most vision models accept up to 16 million pixels per image.
- models-22: `qwen3.7-plus` supports a 1M context window and videos up to 2 hours.

Page: https://www.alibabacloud.com/help/en/model-studio/new-free-quota
- models-9: Free quota is eligible only for models in the Singapore region with service deployment scope set to International.
- models-10: Standard free quota is typically 1,000,000 tokens per model, valid for 90 days.

Page: https://www.alibabacloud.com/en/campaign/ai-landing-page-token?_p_lc=1
- models-20: `qwen3-vl-flash` Singapore price starts from $0.05 input / $0.40 output per 1M tokens.
- models-43: `qwen3.5-omni-flash` Singapore price is $0.40 text/image/video in, $3.00 audio in, $2.20 text out, $11.90 audio out per 1M tokens.

Page: https://www.alibabacloud.com/help/en/model-studio/qwenvl-ocr
- models-29: `qwen-vl-ocr` max input is 30,000 tokens and max output is 8,192 tokens.
- models-30: `qwen-vl-ocr` context window is 38,192 tokens.

Page: https://www.alibabacloud.com/help/en/model-studio/regions
- models-1: The international region list for Model Studio includes Singapore, US (Virginia), Germany (Frankfurt), Japan (Tokyo), and China (Hong Kong).

Page: https://www.alibabacloud.com/help/en/model-studio/singapore-regional-access-information
- models-2: Singapore uses the International deployment scope.

Page: https://www.alibabacloud.com/help/en/model-studio/realtime
- models-60: China (Beijing) realtime base URLs include `wss://dashscope.aliyuncs.com/api-ws/v1/realtime`.

Page: https://www.alibabacloud.com/help/en/model-studio/qwen-api-via-dashscope
- models-61: Workspace-dedicated Singapore endpoint is `wss://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api-ws/v1/realtime`.

Page: https://docs.modelstudio.console.alibabacloud.com/en/model-studio/fun-asr-realtime
- models-73: `fun-asr-realtime` price is $0.000047 per second.

Page: https://www.developersdigest.tech/models/speech/alibaba
- models-78: `qwen-audio-3.1-tts-flash` price is $0.23 input / $1.87 output per 1M tokens.

Page: https://www.alibabacloud.com/help/en/model-studio/embedding-interfaces-compatible-with-openai
- models-99: Multimodal embedding models do NOT support the OpenAI-compatible API.

Page: https://www.alibabacloud.com/help/en/model-studio/text-rerank-api
- models-107: `gte-rerank` model will be discontinued on May 30, 2026.

Page: https://www.alibabacloud.com/help/en/model-studio/model-list-visual-understanding/
- models-28: `gui-plus` is listed in the international Vision model list but its price is unconfirmed.

Page: https://www.alibabacloud.com/help/en/model-studio/qwen-vl-ocr
- models-31: `qwen-vl-ocr` requires image width and height > 10 px and aspect ratio not exceeding 200:1 or 1:200.
