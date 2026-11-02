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

Page: https://www.alibabacloud.com/help/en/model-studio/qwenvl-ocr
- usedoc-6: qwen-vl-ocr pricing in Singapore is $0.043 per 1M input tokens and $0.072 per 1M output tokens.
- usedoc-7: qwen-vl-ocr batch pricing in Singapore is $0.022 per 1M input tokens and $0.036 per 1M output tokens.

Page: https://ai-act-service-desk.ec.europa.eu/en/ai-act/timeline/timeline-implementation-eu-ai-act
- usedoc-70: EU AI Act Annex III high-risk obligations application date moved to December 2, 2027.
- usedoc-71: EU AI Act Article 50 transparency obligations apply from August 2, 2026.

Page: https://www.alibabacloud.com/help/en/agentcore/agentcore-product-overview
- usedoc-1: The international AgentCore Overview page lists supported regions starting with China (Hangzhou) and China (Beijing), while the China-site English copy additionally lists Singapore (ap-southeast-1).

Page: https://www.alibabacloud.com/help/en/model-studio/pdf-understanding
- usedoc-12: PDF understanding feature in Model Studio is available only in China (Beijing) and Singapore regions.

Page: https://www.alibabacloud.com/help/en/model-studio/text-embedding-v4
- usedoc-15: text-embedding-v4 pricing in Singapore is $0.072 per 1M input tokens.

Page: https://www.alibabacloud.com/en/product/short-message-service/pricing
- usedoc-32: Singapore SMS package pricing is $0.045 per message.

Page: https://www.hasil.gov.my/en/e-invois/pelaksanaan-e-invois-di-malaysia/garis-masa-pelaksanaan-e-invois/
- usedoc-60: Malaysia requires individual e-Invoices for transactions above RM10,000 from Jan 1, 2026.

Page: https://www.alibabacloud.com/help/en/model-studio/regions
- usedoc-68: Model Studio has no Seoul region; customers must use Singapore or Tokyo.

Page: https://www.alibabacloud.com/help/en/model-studio/savings-plan-and-resource-package
- usedoc-77: Savings plans offer up to 47% discount.

Page: https://www.alibabacloud.com/help/en/functioncompute/configure-a-native-oss-trigger-1
- usedoc-3: Function Compute supports a native OSS trigger that fires on PutObject/PostObject events with prefix and suffix filters.

Page: https://www.alibabacloud.com/help/en/model-studio/embedding-rerank-model/
- usedoc-16: qwen3-rerank supports 100+ languages and processes up to 500 documents per call.

Page: https://www.alibabacloud.com/en/product/real-id
- usedoc-28: ZOLOZ Real ID supports Southeast Asian ID documents and global passports.

Page: https://www.alibabacloud.com/help/en/sms/
- usedoc-31: International SMS service covers 200+ countries/regions.

Page: https://www.deloitte.com/us/en/what-we-do/case-studies/hands-off-the-task-eyes-on-the-outcome.html
- usedoc-37: Deloitte case study reports 92% touchless invoice processing achieved, targeting ~99%.

Page: https://www.deloitte.com/us/en/services/tax/articles/ai-contract-lifecycle-management-survey.html
- usedoc-39: Legal time savings from AI CLM average 37% across agreement-management activities.
