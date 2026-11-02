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

Page: https://www.alibabacloud.com/help/en/model-studio/qwen3-vl-plus
- models-15: `qwen3-vl-plus` Singapore price for 0<Token≤32K is $0.20 input / $1.60 output per 1M tokens.
- models-16: `qwen3-vl-plus` Singapore price for 32K–128K tokens is $0.30 input / $2.40 output per 1M tokens.
- models-17: `qwen3-vl-plus` Singapore price for 128K–256K tokens is $0.60 input / $4.80 output per 1M tokens.
- models-12: `qwen3-vl-plus` has a context window of 262,144 tokens.
- models-13: `qwen3-vl-plus` max input is 260,096 tokens and max output is 32,768 tokens.
- models-14: `qwen3-vl-plus` thinking-mode max input is 258,048 tokens.

Page: https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen3-vl-flash
- models-18: `qwen3-vl-flash` has a context window of 262,144 tokens.
- models-19: `qwen3-vl-flash` max input is 260,096 tokens and max output is 32,768 tokens.

Page: https://www.alibabacloud.com/help/en/model-studio/omni/
- models-37: `qwen3.8-omni-flash` has a 1M context window.
- models-38: `qwen3.8-omni-flash` supports audio up to 3 hours and video up to 2 hours for content analysis.

Page: https://www.alibabacloud.com/help/en/model-studio/qwen-audio-3-1-asr-flash
- models-11: `qwen-audio-3.1-asr-flash` Singapore price is $0.15 input / $0.47 output per 1M tokens.

Page: https://qwen.ai/blog?id=qwen3.8-omni-flash
- models-59: Singapore realtime base URL is `wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime?model=<model>`.

Page: https://www.alibabacloud.com/help/en/model-studio/qwen-audio-3-1-asr-flash-filetrans
- models-66: `qwen-audio-3.1-asr-flash-filetrans` Singapore price is $0.15 input / $0.47 output per 1M tokens.

Page: https://www.alibabacloud.com/help/en/model-studio/qwen-audio-3-1-asr-flash-streaming
- models-67: `qwen-audio-3.1-asr-flash-streaming` Beijing price is $0.848 input / $0.636 output per 1M tokens.

Page: https://www.alibabacloud.com/help/en/model-studio/ssml-latex-user-guide
- models-87: `cosyvoice-v3.5-plus` is currently available only in the Beijing region.

Page: https://www.alibabacloud.com/help/en/model-studio/cosyvoice-v3-5-flash
- models-88: `cosyvoice-v3.5-flash` is available only in the Beijing region.

Page: https://help.aliyun.com/zh/model-studio/model-pricing
- models-8: Audio shorter than 1 second is billed as 25 tokens in the Beijing table.

Page: https://www.morphllm.com/qwen-api
- models-21: `qwen3-vl-flash` top of range price is $0.12 input / $0.96 output per 1M tokens.

Page: https://www.alibabacloud.com/help/en/model-studio/qwen3-8-omni-flash
- models-36: `qwen3.8-omni-flash` supports text, image, audio, and video inputs but outputs text only.

Page: https://www.alibabacloud.com/help/en/model-studio/qwen3-5-omni-plus.md
- models-40: `qwen3.5-omni-plus` max input is 196,608 tokens and max output is 65,536 tokens.
