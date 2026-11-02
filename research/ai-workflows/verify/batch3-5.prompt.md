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

Page: (no URL cited)
- platfo-15: CAP / Function AI is China-site-only.
- platfo-17: No Slack, Microsoft Teams, WhatsApp, LINE or Telegram connector is documented for AgentCore.
- platfo-18: A dedicated 'pause-for-approval' primitive is not documented in AgentCore.
- platfo-40: No inbound-email (IMAP/SMTP) trigger exists for Function Compute.

Page: https://www.alibabacloud.com/help/en/tablestore/memory-storage-service-sub-product-test/news-and-announcements
- platfo-31: Tablestore Memory Storage Service is live in China (Hong Kong) and Singapore.
- platfo-47: Tablestore Memory/Knowledge Storage service is available in China (Shanghai), China (Shenzhen), China (Hong Kong), and Singapore.

Page: https://www.alibabacloud.com/help/en/serverless-workflow/latest/billing-billing
- platfo-53: CloudFlow free quota is 5,000 free step transitions per month per account.
- platfo-54: CloudFlow unit price is USD 0.25 per 10,000 step transitions.

Page: https://www.alibabacloud.com/help/en/tablestore/memory-storage-service-sub-product-test/product-billing
- platfo-54: Tablestore Memory Storage international billing shows CNY 0.002 per 10,000 long-term-memory entries per hour.
- platfo-55: Tablestore Memory Storage international billing shows CNY 0.00004 per 10,000 short-term entries per hour.

Page: https://www.alibabacloud.com/help/en/model-studio/application-introduction
- platfo-1: Model Studio agent/workflow app API calls are restricted to accounts that created Singapore apps before 2025-04-21.

Page: https://www.alibabacloud.com/help/en/model-studio/access-model-studio-through-privatelink
- platfo-3: Model Studio PrivateLink is available only in Beijing and Hong Kong.

Page: https://www.alibabacloud.com/help/en/functioncompute/fc/user-guide/offline-asynchronous-task-scenario
- platfo-35: Function Compute supports a running duration of up to 86,400 seconds (24 hours).

Page: https://www.alibabacloud.com/help/en/functioncompute/product-changes-changes-of-billable-items-resource-plans-and-trial-quota-of-function-compute
- platfo-43: Published tier-1 FC unit price was USD 0.000020/CU (discounted USD 0.0000160/CU) for Aug 2024-Aug 2025.

Page: https://www.alibabacloud.com/help/en/direct-mail/product-overview/limits
- platfo-76: DirectMail initial daily quota is 2,000 emails.

Page: https://www.alibabacloud.com/help/en/agentcore/api-agentcore-2026-08-04-overview.md
- platfo-9: AgentCore's API version is 2026-08-04.

Page: https://www.alibabacloud.com/blog/does-do-not-work-on-ai-agents-900-tests-with-agentrun-mcp-tool-hooks_603668
- platfo-30: AgentRun MCP Tool Hooks allow pre/post tool-call interception.

Page: https://www.alibabacloud.com/help/en/agentrun/knowledge-base-integration-guide
- platfo-32: AgentRun supports knowledge base integration with Alibaba Cloud Model Studio and RAGFlow.

Page: https://www.alibabacloud.com/help/en/api-gateway/ai-gateway/user-guide/mcp-gateway-management
- platfo-9: AI Gateway supports MCP server proxying with security authentication, observability, and rate-limiting.

Page: https://www.alibabacloud.com/help/en/waf/web-application-firewall-3-0/ai-application-protection/
- platfo-16: AI Gateway integrates Alibaba Cloud AI Security Guardrails to detect prompt injection and jailbreak attacks via WAF 3.0.

Page: https://www.alibabacloud.com/help/en/analyticdb/analyticdb-for-postgresql/product-overview/pricing-1
- platfo-39: AnalyticDB for PostgreSQL vector search is priced in regions including Singapore, Malaysia, Indonesia, Thailand, Germany, UK, US (Virginia), and US (Silicon Valley).

Page: https://www.alibabacloud.com/help/en/polardb/polardb-for-mysql/user-guide/guidelines-for-using-polarsearch
- platfo-43: PolarSearch (PolarDB for MySQL) lists availability in Singapore Zone A/B, Japan (Tokyo), South Korea (Seoul), and Germany (Frankfurt).

Page: https://www.alibabacloud.com/help/en/content-moderation/latest/billing-overview
- platfo-77: AI Guardrails API access costs USD 6 per 10,000 calls.

Page: https://www.alibabacloud.com/help/en/content-moderation/latest/detecting-agent-billing-schemes
- platfo-78: Custom AI Guardrails detection Agent costs USD 8 per 10,000 calls.

Page: https://help.aliyun.com/en/api-gateway/consumer-quotas-management
- platfo-14: AI Gateway consumer quota rules support Token and Credits dimensions with daily, weekly, or monthly resets.

Page: https://www.alibabacloud.com/help/en/api-gateway/ai-gateway/user-guide/ai-cache-1
- platfo-15: AI Gateway semantic caching combines Redis-based precise cache and DashVector semantic cache.

Page: https://www.alibabacloud.com/help/en/milvus/product-overview/ai-center-billing
- platfo-35: Milvus AI Center bills model invocations (tokens/images) allowing embedding to be done in-service.

Page: https://www.alibabacloud.com/en/news/product/opensearch-llm-based-conversational-search-edition-supports-agentic-rag-jto?_p_lc=1
- platfo-37: OpenSearch LLM-Based Conversational Search Edition supports Agentic RAG capability.
