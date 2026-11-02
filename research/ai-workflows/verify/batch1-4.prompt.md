Fact-check task. Read-only: do not edit or create files. Today is 2026-11-02.

Another model researched Alibaba Cloud facts for an app that Alibaba Cloud pre-sales staff use with international customers (Singapore is the default region). Below are its claims, grouped by the page it cited. Check each claim against the live page.

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

Page: https://www.alibabacloud.com/help/en/model-studio/batch-inference
- m70: Batch inference unit price for both input and output tokens is 50% of the real-time inference price.
- m71: Batch inference is scoped to Singapore only.
- m72: Maximum context tokens per request for batch inference is 256K for qwen3.8-max, qwen3.8-flash, qwen3.7-max, and qwen3.7-plus.
- a43: Batch API inference is discounted to 50% of the real-time inference price for both input and output tokens.
- a44: Batch API is supported only in China (Beijing) and Singapore regions.

Page: https://www.alibabacloud.com/help/en/model-studio/qwen3-8-max
- m20: qwen3.8-max has a context window of 1,000,000 tokens and max output of 131,072 tokens.
- m21: qwen3.8-max implicit-cache input price is $0.25 and explicit-cache creation price is $2.50 per 1M tokens.
- m43: qwen3.8-max Max Input Length (Thinking Mode) is 983,616 and Max Output Length (Thinking Mode) is 131,072.

Page: https://www.alibabacloud.com/help/en/model-studio/what-is-model-studio
- m4: Model Studio regions include China (Beijing), US (Virginia), Singapore, Japan (Tokyo), Germany (Frankfurt), and China (Hong Kong).
- a1: Model Studio's international regions are Beijing, Virginia, Singapore, Tokyo, Frankfurt, and Hong Kong (no Seoul).

Page: https://www.alibabacloud.com/help/en/model-studio/qwen-plus
- m33: qwen-plus rolling alias price for input <=256k is $0.4 input / $1.2 output per 1M tokens.
- m34: qwen-plus has a max output of 32,768 tokens.

Page: https://www.alibabacloud.com/help/en/model-studio/web-search-image.md
- a27: The t2i_search tool costs $8 per 1,000 calls in Singapore.
- a28: The t2i_search tool costs $3.44 per 1,000 calls in Beijing.

Page: https://www.alibabacloud.com/help/en/model-studio/qwen-flash
- m35: qwen-flash rolling alias price is $0.05 input / $0.40 output per 1M tokens up to 256K input.

Page: https://www.alibabacloud.com/help/en/model-studio/qwen3-5-plus
- m36: qwen3.5-plus price for input <=256k is $0.4 input / $2.4 output per 1M tokens.

Page: https://seminal.ai/reference/models/alibaba-qwen-qwen3-8-2-4t-a95b/
- m48: qwen3.8-2.4t-a95b is priced identically to hosted qwen3.8-max at $2.00 input / $6.00 output.

Page: https://try-qwen-ai.com/updates/model-deprecations/
- m51: Hosted Qwen3 open-weight ids like qwen3-235b-a22b are reported retired on 2026-10-10.

Page: https://www.alibabacloud.com/help/en/model-studio/compatibility-with-openai-responses-api
- a11: Workspace-dedicated domains exist only for Beijing, Singapore, and Hong Kong.

Page: https://www.alibabacloud.com/help/en/model-studio/qwen-code-interpreter
- a26: The code_interpreter tool is free for a limited time but increases token consumption.

Page: https://www.alibabacloud.com/help/id/model-studio/data-retention-policy
- a65: Zero Data Retention (ZDR) is available to enterprise customers of Alibaba Cloud International Site at the workspace level.

Page: https://www.alibabacloud.com/help/en/model-studio/privacy-notice
- a68: Model Studio has achieved SOC 2 compliance with an unqualified opinion.
