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

Page: https://www.alibabacloud.com/help/en/model-studio/context-cache
- m64: Implicit cache hits are typically billed at 20% of the standard input token price.
- m65: Explicit-cache creation tokens are typically billed at 125% of the standard input token price.
- m68: Calls made using the OpenAI-compatible Batch (file input) method are not eligible for cache discounts.
- a36: Implicit cache-served input tokens are typically billed at 20% of the standard input token price.

Page: https://www.alibabacloud.com/help/en/model-studio/new-free-quota
- m10: Free quota is only available for models in Singapore with deployment scope set to International.
- m23: qwen3.8-max free quota is 1,000,000 tokens valid for 90 days, Singapore only.
- a82: Free quota is 1M tokens per eligible model for 90 days, applicable only in Singapore region with International deployment scope.

Page: https://www.alibabacloud.com/help/en/model-studio/regions
- m3: US (Virginia) supports both Global and US deployment scopes.
- a81: Fine-tuning is available in Singapore among international regions.

Page: https://www.alibabacloud.com/help/en/model-studio/qwen3-7-max
- m24: qwen3.7-max price at Scope: International is $2.5 input / $7.5 output per 1M tokens.
- m25: qwen3.7-max implicit cache input price is $0.50 and explicit creation is $3.125 per 1M tokens.

Page: https://www.alibabacloud.com/help/en/model-studio/compatibility-of-openai-with-dashscope
- a9: The workspace-specific OpenAI-compatible base URL format for Singapore is https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1.
- a10: API keys are region-bound; calling a region's base URL requires a key created in that specific region.

Page: https://www.alibabacloud.com/help/en/model-studio/get-api-key
- m5: Each Model Studio region has its own endpoint, API key, and model list that cannot be mixed.

Page: https://www.alibabacloud.com/blog/alibaba-unveils-qwen3-8-max-its-largest-and-most-capable-flagship-model-to-date_603420
- m22: qwen3.8-max is GA and widely available from 2026-08-03.

Page: https://www.alibabacloud.com/help/en/model-studio/model-list-text-generation/
- m37: There is no qwen3.8-plus model id in the international pay-as-you-go list.

Page: https://docs.modelstudio.console.alibabacloud.com/en/model-studio/text-generation-model
- m47: qwen-long does not support thinking, function calling, built-in tools, or structured output.

Page: https://help.aliyun.com/en/model-studio/qwen-mt-uni
- m60: qwen-mt-uni is not found on the international site and is China site only.

Page: https://www.alibabacloud.com/help/en/model-studio/quick-start-of-assistant-api
- a6: The Assistant API is deprecated.

Page: https://www.alibabacloud.com/help/en/model-studio/mcp
- a34: Remote MCP servers can be called directly via the Responses API mcp tool using an SSE endpoint.

Page: https://docs.modelstudio.console.alibabacloud.com/en/model-studio/data-retention-policy
- a64: Default retention for user prompts and responses is no longer than 30 days unless required by law.

Page: https://www.alibabacloud.com/help/en/model-studio/access-model-studio-through-privatelink
- a70: PrivateLink access for Model Studio is documented for China (Beijing) and China (Hong Kong) only.
