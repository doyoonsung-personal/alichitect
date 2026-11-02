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

Page: https://www.alibabacloud.com/help/en/model-studio/model-pricing
- usedoc-11: qwen-doc-turbo pricing in Singapore is $0.087 per 1M input tokens and $0.144 per 1M output tokens.
- usedoc-13: Qwen-Max tiered pricing shows $1.65 per 1M input tokens and $4.95 per 1M output tokens at the top tier.
- usedoc-24: qwen-mt-plus pricing is $0.259 per 1M input tokens and $0.775 per 1M output tokens.
- usedoc-25: qwen-mt-flash pricing is $0.101 per 1M input tokens and $0.280 per 1M output tokens.
- usedoc-26: qwen-mt-lite pricing is $0.086 per 1M input tokens and $0.229 per 1M output tokens.
- usedoc-27: qwen-mt-image-2.0 pricing is $0.0006 per image.

Page: https://www.alibabacloud.com/help/en/model-studio/machine-translation
- usedoc-22: Qwen-MT supports 92 languages including Japanese, Korean, Thai, Indonesian, Vietnamese, and Arabic.
- usedoc-23: Qwen-MT supports terminology intervention, domain prompting, and translation memory.

Page: https://www.alibabacloud.com/help/en/model-studio/batch-inference
- usedoc-4: Model Studio Batch inference operates asynchronously at 50% of the real-time price.

Page: https://help.aliyun.com/en/model-studio/qwen-long
- usedoc-14: qwen-long model supports ultra-long context processing up to 10M tokens (~15,000 pages) according to the China-site page.

Page: https://www.alibabacloud.com/help/en/open-search/search-platform/product-overview/introduction-to-search-platform
- usedoc-19: AI Search Open Platform document parsing and chunking features are documented for Shanghai and Frankfurt regions only.

Page: https://www.alibabacloud.com/help/en/model-studio/error-code
- usedoc-34: JSON mode is not supported when enable_thinking is true in Model Studio; the API returns an error.

Page: https://www.pwc.com/vn/en/publications/2025/250416-changes-to-invoicing-regulations.pdf
- usedoc-62: Vietnam Decree 70/2025/ND-CP extends scope to foreign e-commerce providers effective June 1, 2025.

Page: https://www.tamimi.com/law-update/the-technology-issue-2026/articles/data-regulation-in-the-ai-era-a-comparison-of-korean-and-uae-data-protection-laws/
- usedoc-69: Korea PIPA Article 37-2 rights regarding fully automated decisions have been in effect since March 2024.

Page: https://www.alibabacloud.com/help/en/agentloop/product-overview/what-is-agentloop
- usedoc-81: AgentLoop runs internationally only in Hong Kong.

Page: https://qwen.ai/blog?id=99f0335c4ad9ff6153e517418d48535ab6d8afef
- usedoc-8: Qwen3-VL family OCR supports 32 languages, including Thai.

Page: https://qwen.ai/blog?id=qwen3asr
- usedoc-20: Open-source Qwen3-ASR supports 30 languages and 22 Chinese dialects with language ID.

Page: https://www.alibabacloud.com/help/en/skillsportal/aliyun-hitl-agent-security-guide
- usedoc-30: Alibaba Cloud HITL plug-in intercepts medium- and high-risk cloud operations initiated by AI Agents.

Page: https://www.medius.com/resources/guides-reports/ardent-partners-accounts-payable-metrics-that-matter/
- usedoc-35: Average cost to process one invoice is $9.90 (2026 research) and $9.40 (2025 report).

Page: https://parseur.com/blog/ai-invoice-processing-benchmarks
- usedoc-38: Fraunhofer IAIS benchmark reports 96.50% accuracy for clean digital invoices, 92.71% for scanned invoices, and 87.46% for scanned receipts.

Page: https://www.mckinsey.com/capabilities/risk-and-resilience/our-insights/how-agentic-ai-can-change-the-way-banks-fight-financial-crime
- usedoc-41: Agentic AI can reduce KYC processing times by 30–70%.
