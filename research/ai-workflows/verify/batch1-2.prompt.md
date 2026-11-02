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

Page: https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen3-8-flash
- m8: qwen3.8-flash price at Scope: International is $0.15 input / $0.47 output per 1M tokens.
- m9: qwen3.8-flash price on Global-scope rows is $0.113 input / $0.382 output per 1M tokens.
- m29: qwen3.8-flash has a context window of 1,000,000 tokens and max output of 131,072 tokens in thinking mode.
- m30: qwen3.8-flash implicit cache input price is $0.016 and explicit creation is $0.177 per 1M tokens.
- m31: qwen3.8-flash is GA and was released around 2026-08-26/27.

Page: https://www.alibabacloud.com/help/en/model-studio/singapore-regional-access-information
- m1: Singapore region uses the International deployment scope, which includes global nodes outside the Chinese mainland.
- a67: Singapore region uses the International deployment scope, storing request data in that region.

Page: https://www.alibabacloud.com/help/en/model-studio/web-search
- m2: In China (Hong Kong), Japan (Tokyo) and Germany (Frankfurt), users must call from a workspace whose deployment scope is Global.
- a21: The web_search tool costs $10.00 per 1,000 calls in the Singapore region.

Page: https://www.alibabacloud.com/help/en/model-studio/qwen3-7-plus
- m26: qwen3.7-plus price for input <=256K is $0.4 input / $1.6 output per 1M tokens.
- m27: qwen3.7-plus price for input >256K up to 1M is $1.2 input / $4.8 output per 1M tokens.

Page: https://www.alibabacloud.com/help/en/model-studio/deep-thinking
- m40: Thinking content is billed by Output Token, and some hybrid thinking models have different prices in thinking and non-thinking modes.
- a50: Thinking content is billed as Output Tokens.

Page: https://www.alibabacloud.com/help/en/model-studio/qwen3-8-max ; https://www.alibabacloud.com/help/en/model-studio/model-pricing
- m6: qwen3.8-max price at Scope: International (Singapore) is $2 input / $6 output per 1M tokens.

Page: https://www.alibabacloud.com/help/en/model-studio/newly-released-models
- m12: qwen3.8-max-0902 is an upgraded snapshot of qwen3.8-max released on 2026-09-02.

Page: https://www.alibabacloud.com/help/en/model-studio/error-code
- m42: Json mode response is not supported when enable_thinking is true.

Page: https://www.alibabacloud.com/help/en/model-studio/qwen-long
- m46: qwen-long has a context window of 10,000,000 tokens and max output of 8,192 tokens.

Page: https://www.alibabacloud.com/en/notice/detail?_p_lc=1&id=2217
- m61: Model Studio will decommission legacy models listed in notice id=2217 on January 19, 2027.

Page: https://www.alibabacloud.com/help/en/model-studio/qwen-api-reference/
- a4: Model Studio publishes four text-generation interfaces: OpenAI-compatible Chat Completions, OpenAI-compatible Responses, Anthropic-compatible Messages API, and DashScope.

Page: https://help.aliyun.com/en/model-studio/mcp-introduction
- a35: International availability of a hosted MCP marketplace or Model-Studio-hosted MCP servers is unconfirmed; evidence suggests it is China site only.

Page: https://docs.modelstudio.console.alibabacloud.com/en/model-studio/privacy-notice
- a63: Alibaba Cloud will never use customer data for model training.

Page: https://www.alibabacloud.com/help/en/model-studio/permission-management-overview
- a71: A single Model Studio workspace cannot span geographic regions.
