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

Page: https://www.alibabacloud.com/help/en/agentcore/agentcore-billing-instructions
- useope-9: AgentCore uses CU-based billing where 1 vCPU·s = 1 CU and 1 GB·s = 0.5 CU, with a reference price of USD 0.00001/CU in China (Shanghai).
- cossiz-43: AgentCore reference price is USD 0.00001 per Compute CU stated for China Shanghai.
- cossiz-60: AgentCore Singapore unit price is unconfirmed.

Page: https://www.salesforce.com/agentforce/pricing/
- userev-34: Salesforce Agentforce pricing benchmark is $2 per conversation.

Page: https://artificialintelligenceact.eu/annex/3/
- useope-65: EU AI Act lists AI for recruitment/selection as Annex III high-risk.

Page: https://fpf.org/blog/malaysia-charts-its-digital-course-a-guide-to-the-new-frameworks-for-data-protection-and-ai-ethics/
- useser-80: Malaysia's PDPA Amendment Act 2024 mandates breach notification.

Page: https://docs.aws.amazon.com/bedrock/latest/userguide/flows-nodes.html
- dianot-25: AWS Bedrock Flows includes a Prompt node for inline or managed prompts.

Page: https://huggingface.co/Qwen/Qwen3.8-2.4T-A95B
- pre-43: Qwen3.8 includes the first Max-class open release.

Page: https://www.alibabacloud.com/help/en/agentloop/product-overview/what-is-agentloop
- useope-43: AgentLoop international region is Hong Kong.
- useope-42: AgentLoop provides full-stack observability, auditing, evaluation, and experimentation for agents.

Page: https://www.alibabacloud.com/help/en/aidge/interface-overview/
- userev-30: Aidge (Alibaba International Digital Commerce) supports 100+ language pairs for multimodal translation.

Page: https://help.aliyun.com/en/agentrun/open-service-area
- useser-9: AgentRun international endpoint is available only in Singapore (ap-southeast-1).

Page: https://www.aboutamazon.com/news/retail/amazon-rufus-ai-assistant-personalized-shopping-features
- useser-68: Amazon Rufus users are over 60% more likely to make a purchase during their shopping trip.

Page: https://www.alibabacloud.com/help/en/api-gateway/cloud-native-api-gateway/product-overview/billing-overview
- cossiz-49: Cloud-native API Gateway instance price example is USD 0.291 per hour.

Page: https://www.alibabacloud.com/help/en/model-studio/new-free-quota
- userev-21: First activation of Model Studio (Singapore) grants a per-model free quota, typically 1,000,000 tokens.
- useope-22: Free quota provides 1M tokens per model, valid for 90 days, only for Singapore region with International deployment scope.
- useser-45: New-user free quota in Model Studio is typically 1,000,000 tokens per model, valid for 90 days in the Singapore region.
- cossiz-11: Free quota is 1M tokens per model, valid for 90 days, Singapore only.
- pre-71: New-user free quota for eligible models is 1M tokens for 90 days, limited to Singapore/international-scope models.

Page: https://www.alibabacloud.com/help/en/agentloop/agentloop-quickstart-whole-process-practice
- userev-6: AgentLoop international availability is confirmed for Hong Kong only via quickstart region picker.

Page: https://www.alibabacloud.com/help/en/model-studio/qwen3-coder-flash
- useope-14: The price for qwen3-coder-flash is unconfirmed as the model page does not surface a clean number.

Page: https://www.gartner.com/en/newsroom/press-releases/2025-03-05-gartner-predicts-agentic-ai-will-autonomously-resolve-80-percent-of-common-customer-service-issues-without-human-intervention-by-20290
- useser-48: Gartner forecasts that by 2029 agentic AI will autonomously resolve 80% of common customer-service issues without human intervention.

Page: https://www.workspaceblog.in/blog/gemini-enterprise-workflow-builder-guide/
- dianot-6: The GA date for Google Workflow Builder is reported as 2026-09-03 by a third-party guide but is unconfirmed officially.

Page: https://www.alibabacloud.com/help/en/agentcore/agentcore-billing-activation
- cossiz-44: AgentCore billing started on 2026-09-18 00:00 UTC+8.

Page: https://www.alibabacloud.com/help/en/model-studio/application-introduction
- useser-2: Model Studio workflow apps are restricted to accounts that created Singapore applications before April 21, 2025.
- pre-1: Model Studio applications in the Singapore region created before April 21, 2025 are restricted to calls from users who created them prior to that date.
- pre-80: For new international accounts, Model Studio's no-code agent and workflow applications are not callable.

Page: https://www.legal500.com/intelligence/south-korea/privacy/amendments-to-koreas-personal-information-protection-act-turnover-based-fines-ceo-accountability-and-earlier-breach-notification
- userev-58: Amended South Korea PIPA introduces administrative fines up to 10% of total revenue.

Page: https://www.kimchang.com/en/insights/detail.kc?sch_section=4&idx=33805
- useope-72: Korea's AI Basic Act took effect on 22 Jan 2026.

Page: https://www.imda.gov.sg/about-imda/emerging-technologies-and-research/artificial-intelligence
- useser-22: Singapore published the Model AI Governance Framework for Agentic AI v1.0 in January 2026 and v1.5 in May 2026.

Page: https://www.alibabacloud.com/help/en/pai/node-reference
- dianot-34: Alibaba PAI-LangStudio node families include flow control, LLMs, agents, data retrieval, document parsing, speech recognition, and Python.

Page: https://www.alibabacloud.com/help/en/agentloop/faqs
- pre-93: AgentLoop is available internationally only in Hong Kong.
