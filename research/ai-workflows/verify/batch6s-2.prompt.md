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

Page: https://www.microsoft.com/en-us/dynamics-365/blog/it-professional/2025-10-21/sales-research-bench/
- userev-32: Microsoft Sales Research Agent outperformed Claude Sonnet 4.5 by 13 points and ChatGPT-5 by 24.1 points on Sales Bench.

Page: https://www.bazaarvoice.com/blog/how-review-syndication-expands-your-reach-and-strengthens-pdp-performance/
- userev-47: Bazaarvoice reports a 144% lift in conversion rate when shoppers engage with reviews.

Page: https://help.aliyun.com/en/sls/sls-mcp-server
- useope-41: SLS MCP server documentation is marked China site only.

Page: https://help.aliyun.com/en/cs/user-guide/agent-sandbox/
- useope-30: ACS Agent Sandbox offers MicroVM isolation, hibernation/wake, and checkpoint/clone features, but documentation is marked China site only.

Page: https://www.alibabacloud.com/blog/alibaba-cloud-launches-qwen-cloud-for-global-markets_603191
- useser-13: Alibaba Cloud launched Qwen Cloud globally from Singapore on May 26, 2026.

Page: https://www.alibabacloud.com/help/en/tablestore/table-store-service/knowledge-storage-introduction
- useser-32: Tablestore Knowledge Storage Singapore availability is unconfirmed as the documented region list begins with China regions.

Page: https://hechingerreport.org/proof-points-khanmigo-math-ai-tutor/
- useser-74: Adding the Khanmigo AI tutor did not improve math performance above Khan Academy practice alone in the NBER RCT.

Page: https://fin.ai/glossary/resolution-rate
- useser-51: Intercom Fin reports a 76% average resolution rate across more than 12,000 customers.

Page: https://developers.openai.com/api/docs/guides/agent-builder
- dianot-1: OpenAI Agent Builder is deprecated as of 2026-06-03 and scheduled to shut down on November 30, 2026.

Page: https://help.aliyun.com/en/model-studio/workflow/agent-group-node
- dianot-29: Alibaba Model Studio includes an Agent Group node for coordinating multiple published agents.

Page: https://developers.openai.com/api/docs/guides/node-reference
- dianot-22: OpenAI Agent Builder uses a Set State node to write workflow state.

Page: https://artificialanalysis.ai/models/qwen3-7-plus
- cossiz-6: qwen3.7-plus price in International scope is $0.40 input / $1.60 output.

Page: https://www.alibabacloud.com/en/product/log-service/pricing
- cossiz-50: Simple Log Service read/write traffic price is USD 0.045/GB.

Page: https://developers.openai.com/api/docs/guides/prompt-caching
- cossiz-34: OpenAI prompt caching discounted cached-input rate is up to 95% off.

Page: https://www.alibabacloud.com/help/en/model-studio/model-deployment-introduction
- pre-26: Model Studio dedicated deployment reserves TPM capacity with no rate limiting.

Page: https://digital-strategy.ec.europa.eu/en/policies/cloud-computing
- pre-11: The EU Commission adopted a proposal for a Cloud and AI Development Act (CADA) in June 2026.
