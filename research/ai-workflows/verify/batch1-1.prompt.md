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

Page: https://www.alibabacloud.com/help/en/model-studio/model-pricing
- m7: qwen3.8-max price on Global-scope rows is $1.65 input / $4.951 output per 1M tokens.
- m32: qwen3.7-flash lowest tier price is $0.03 input / $0.13 output per 1M tokens.
- m49: qwen3.8-27b price for 0<Token<=256K is $0.5 input / $3 output (non-thinking/thinking) per 1M tokens.
- m50: qwen3.6-35b-a3b price for 0<Token<=256K is $0.375 input / $2.25 output per 1M tokens.
- m57: qwen-mt-plus price at Scope: International is $2.46 input / $7.37 output per 1M tokens.
- m58: qwen-mt-flash price at Scope: International is $0.16 input / $0.49 output per 1M tokens.
- m59: qwen-mt-lite price at Scope: International is $0.12 input / $0.36 output per 1M tokens.
- m69: Context cache and batch discounts cannot apply simultaneously.
- m75: Models qwen3.6-35b-a3b, qwen3.6-27b, and qwen3.8-27b have no free quota.
- m76: Tiered models bill all tokens in a request at the tier determined by that request's total input tokens.
- a2: qwen3.8-max is priced at $2 per 1M input tokens and $6 per 1M output tokens for the International scope.

Page: https://www.alibabacloud.com/help/en/model-studio/web-extractor
- a19: Built-in tools are exposed through the Responses API tools array.
- a25: The web_extractor tool is free for a limited time.

Page: https://www.alibabacloud.com/help/en/model-studio/rate-limit
- a53: Rate limits are applied at the Alibaba Cloud account level, aggregating usage across all RAM users, workspaces, and API keys.
- a56: qwen3.8-max and qwen3.8-flash use Dynamic Rate Limiting under International/Singapore scope.

Page: https://therouter.ai/news/dashscope-qwen-native-model-retirement-october-2026-routing/
- m44: qwen3-coder-plus was retired on 2026-10-10 and replaced by qwen3.7-plus.

Page: https://www.alibabacloud.com/help/en/model-studio/qwen3-coder-flash
- m45: qwen3-coder-flash price for 0<Token<=32K is $0.3 input / $1.5 output per 1M tokens.

Page: https://www.alibabacloud.com/notice/detail?_p_lc=1&id=1841
- m62: Notice id=1841 confirms decommissioning of qwen-turbo, qwen-vl-plus, qwq-plus, and qvq-max on October 10, 2026.

Page: https://www.alibabacloud.com/help/en/model-studio/application-introduction
- a3: Access to Agent/Workflow/Knowledge base/Application-Calling pages in Singapore is restricted to users who created applications before April 21, 2025.

Page: https://www.alibabacloud.com/help/en/model-studio/explicit-cache-guide
- a37: Explicit cache creation costs a 25% surcharge over standard input price, and each subsequent hit saves 90%.

Page: https://www.alibabacloud.com/en/product/content-moderation/pricing?_p_lc=1
- a62: AI Guardrails is a separate, customer-configurable layer available in Asia Pacific SE 1 (Singapore).

Page: https://www.alibabacloud.com/help/en/model-studio/application-calling-guide
- a78: Application Calling API uses POST https://dashscope-intl.aliyuncs.com/api/v1/apps/{APP_ID}/completion for Singapore.
