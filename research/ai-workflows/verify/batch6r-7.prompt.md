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

Page: https://www.alibabacloud.com/help/en/agentloop/agentloop-billing-overview
- cossiz-45: AgentLoop price is USD 0.0016/AI credit.
- cossiz-46: AgentLoop price is USD 0.00014 per execution.

Page: https://www.sprinklr.com/stories/
- userev-45: Sprinklr case study reports a global beverage company resolves 75% of Instagram DMs in under a minute.

Page: https://www.alibabacloud.com/help/en/isi/getting-started/regions-and-domain-names
- useser-30: Intelligent Speech Interaction (ISI) is available in Singapore on the international site, though China-site docs list only Shanghai/Beijing/Shenzhen.

Page: https://dify.ai/blog/the-human-input-node-bringing-human-judgment-into-automated-workflows
- dianot-14: Dify v1.13.0 added a Human Input node allowing workflows to pause for human review and resume with approved, edited, or rerouted decisions.

Page: https://www.alibabacloud.com/blog/603415
- cossiz-25: Alibaba Cloud AI Gateway offers credits-based metering and quotas.

Page: https://www.alibabacloud.com/help/en/open-search/search-platform/getting-started/ai-getting-started
- userev-7: AI Search Open Platform is available only in China (Shanghai) and Germany (Frankfurt) regions.
- useser-10: AI Search Open Platform is available only in China (Shanghai) and Germany (Frankfurt) regions.
- pre-88: AI Search Open Platform is documented for Shanghai and Frankfurt regions only.

Page: https://www.aidge.com/develop
- userev-31: Aidge Text Translation is listed at $15.00 per million characters.

Page: https://help.aliyun.com/en/lingma/code-review-agent
- useope-49: Qoder Code Review Agent docs are marked China site only.

Page: https://www.dlapiperdataprotection.com/index.html?t=law&c=TH
- useser-78: Thailand's PDPA came into full force on June 1, 2022.

Page: https://learn.microsoft.com/en-us/microsoft-copilot-studio/prompt-model-availability
- dianot-24: Microsoft Copilot Studio sets the generative model at the agent level, with availability varying by region.

Page: https://github.com/QwenLM/Qwen3.8
- pre-42: Qwen3.8 is published under the Apache 2.0 license.

Page: https://www.alibabacloud.com/help/en/model-studio/text-embedding-v4
- useope-16: text-embedding-v4 supports 8,192 tokens per text and batches of 10.
- cossiz-8: text-embedding-v4 price is $0.072 per 1M text input tokens.

Page: https://www.alibabacloud.com/help/en/model-studio/regions
- userev-4: US (Virginia) supports Global and US deployment scopes, while Germany (Frankfurt) supports Global and EU scopes.

Page: https://www.alibabacloud.com/en/about/gartner-aica-2026?_p_lc=1
- useope-47: Alibaba Cloud is named a Challenger in the 2026 Gartner MQ for Enterprise AI Coding Agents and #1 in APAC.

Page: https://poly.ai/customers/pge
- useser-66: PG&E saved 35,000 labor hours and saw a 22% CSAT increase using PolyAI.

Page: https://www.alibabacloud.com/help/en/analyticdb/analyticdb-for-postgresql/product-overview/billable-items
- cossiz-47: AnalyticDB for PostgreSQL Serverless pro price is USD 0.036485/CU/hour.

Page: https://www.alibabacloud.com/help/en/model-studio/budget-management
- pre-33: Model Studio budget management allows monthly limits, alerts, and optional auto-restriction of pay-as-you-go usage.

Page: https://www.alibabacloud.com/en/about/gartner-scps-2026?_p_lc=1
- pre-16: Alibaba Cloud was named a Leader in the 2026 Gartner MQ for Strategic Cloud Platform Services.
- pre-17: Alibaba Cloud is described as the only Chinese and only Asia-Pacific provider in the Leaders quadrant of the 2026 Gartner MQ for Strategic Cloud Platform Services.

Page: https://www.alibabacloud.com/help/en/model-studio/embedding
- useope-17: Embedding prices range from $0.036/$0.072 to $0.09 depending on model and scope, requiring console verification.

Page: https://whatsappbusiness.com/policy/
- useser-56: WhatsApp policy requires automation to provide prompt, clear, and direct escalation paths during the 24-hour window.

Page: https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/tools-agent
- dianot-16: n8n Memory sub-nodes do not persist between sessions.

Page: https://media.defense.gov/2026/Jun/08/2003945537/-1/-1/1/ENTITIES-IDENTIFIED-AS-CHINESE-MILITARY-COMPANIES-OPERATING-IN-THE-UNITED-STATES-IN-ACCORDANCE-WITH-SECTION-1260H.PDF
- pre-4: The US DoD added Alibaba to the Section 1260H 'Chinese military companies' list on June 8, 2026.
