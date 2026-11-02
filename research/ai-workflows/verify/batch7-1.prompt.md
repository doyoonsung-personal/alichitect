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

Page: https://www.alibabacloud.com/help/en/model-studio/data-mining-qwen-doc
- usedoc-9: qwen-doc-turbo supports up to 10 files with a maximum input of 253k tokens and output up to 9,000 tokens.
- usedoc-10: Document parsing for qwen-doc-turbo is free of charge.

Page: https://docs.monite.com/e-invoicing/mandates
- usedoc-64: Thailand B2B e-invoicing mandate date is unconfirmed due to conflicting trackers (Jan 2026 vs No mandate).
- usedoc-65: Indonesia e-invoicing was mandatory since July 2015 per one tracker, but status is unconfirmed.

Page: https://www.activepieces.com/blog/qwen-api-pricing-costs-tiers-and-models-2026
- usedoc-2: Qwen3.8-Max pricing is $2.00 per 1M input tokens and $6.00 per 1M output tokens.

Page: https://www.alibabacloud.com/help/en/direct-mail/smtp-endpoints
- usedoc-5: DirectMail SMTP endpoint for the Singapore region is smtpdm-ap-southeast-1.aliyuncs.com.

Page: https://www.alibabacloud.com/notice/detail?id=1873
- usedoc-17: gte-rerank model is discontinued as of May 30, 2026.

Page: https://help.aliyun.com/en/model-studio/managed-agents-event-stream
- usedoc-29: Model Studio managed-agent Tool Approval 'Always ask' feature is marked as China site only.

Page: https://www.vietnam-briefing.com/news/e-invoice-compliance-in-vietnam-regulations-requirements-and-best-practices.html/
- usedoc-61: Vietnam e-invoicing has been mandatory for all taxpayers since July 1, 2022.

Page: https://edicomgroup.com/resources/videos/singapore-invoicenow-einvoicing
- usedoc-63: Singapore InvoiceNow mandates e-invoicing for new voluntary GST registrants from April 2026.

Page: https://www.alibabacloud.com/help/en/model-studio/new-free-quota
- usedoc-78: Free quota for new Singapore accounts is 1M tokens per model, valid for 90 days.

Page: https://www.alibabacloud.com/help/en/model-studio/model-training-overview
- usedoc-82: Model Studio fine-tuning is confirmed as available in Singapore and Beijing.

Page: https://www.alibabacloud.com/help/en/model-studio/rag-knowledge-base
- usedoc-18: Model Studio knowledge-base association limits are 'Document search: up to 5' and 'Data query: up to 5' per app.

Page: https://www.alibabacloud.com/help/en/model-studio/asr-model
- usedoc-21: Paraformer is labelled as an older-generation model to be migrated to Fun-ASR or Qwen-ASR.

Page: https://www.alibabacloud.com/help/en/chatapp/support/faq
- usedoc-33: LINE/KakaoTalk/Zalo availability on the international Chat App is unconfirmed due to conflicting documentation between FAQ and pricing pages.

Page: https://www.basware.com/en/resources/ardent-partners-accounts-payable-metrics-that-matter-in-2026
- usedoc-36: Best-in-Class cost per invoice is $2.67 (2026) versus $12.50 for All Others.

Page: https://www.worldcc.com/resource/when-we-took-a-data-driven-look-at-large-language-models-llms-in-contract-review-we-found-a-few-noteworthy-insights.html
- usedoc-40: Structured reviewer guidance improved model accuracy by 10–15% in contract review benchmarks.

Page: https://www.mckinsey.com/capabilities/risk-and-resilience/our-insights/agentic-ai-in-financial-crime-prevention-lessons-from-winners
- usedoc-42: Agentic AI can accelerate source-of-wealth assessments by 30–50%.
