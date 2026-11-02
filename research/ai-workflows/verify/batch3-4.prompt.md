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
- platfo-92: AgentLoop AI credits cost USD 0.0016 per credit.
- platfo-93: AgentLoop dataset storage costs USD 0.0000055 per entry per day.
- platfo-94: AgentLoop execution count costs USD 0.00014 per execution.

Page: https://www.alibabacloud.com/help/en/model-studio/regions
- platfo-2: Model Studio international regions include Singapore, Virginia, Frankfurt, Tokyo, and Hong Kong (plus Beijing).
- platfo-4: Model Studio international regions include Singapore, Virginia, Frankfurt, Tokyo, and Hong Kong.

Page: https://help.aliyun.com/en/document_detail/2504569.html
- platfo-48: CloudFlow Standard mode max execution duration is 1 year.
- platfo-49: CloudFlow Express mode max execution duration is 5 minutes.

Page: https://www.alibabacloud.com/help/en/jvs/agentic-computer-billing-instructions
- platfo-71: Agentic Computer (JVS) Standard tier costs USD 75.45/mo for 1,600 credits.
- platfo-72: Agentic Computer (JVS) Premium tier costs USD 139.53/mo for 4,000 credits.

Page: https://www.alibabacloud.com/help/en/api-gateway/ai-gateway/getting-started/mcp-service-management
- platfo-10: AI Gateway allows migrating RESTful APIs to MCP services using SSE and Streamable HTTP protocols.
- platfo-11: The test domain for AI Gateway REST-to-MCP conversion is capped at 1,000 calls per day.

Page: https://www.alibabacloud.com/help/en/open-search/search-platform/getting-started/ai-getting-started
- platfo-4: AI Search Open Platform is available only in Shanghai and Frankfurt.

Page: https://www.alibabacloud.com/help/en/agentrun/open-platform-introduction.md
- platfo-34: AgentRun Open Platform (FunAgent) supports DingTalk, Lark, WeCom, and personal WeChat channels.

Page: https://www.alibabacloud.com/help/doc-detail/2782151.html
- platfo-47: CloudFlow API endpoints follow {region-id}.fnf.aliyuncs.com and include ap-southeast-1.fnf.aliyuncs.com.

Page: https://www.alibabacloud.com/en/product/directmail/pricing?_p_lc=1
- platfo-75: DirectMail pricing is USD 0.29 per 1,000 messages.

Page: https://www.alibabacloud.com/help/en/serverless-workflow/latest/billing-overview
- platfo-13: CloudFlow's new version billing started on 2025-10-10.

Page: https://www.alibabacloud.com/help/en/agentrun/topic-funclaw.md
- platfo-29: If pay-as-you-go model is chosen in AgentRun, Model Studio bills directly.

Page: https://www.alibabacloud.com/help/en/eventbridge/user-guide/alibaba-cloud-service-event-sources
- platfo-41: DirectMail is send-only and its EventBridge source acs.dm emits outbound events.

Page: https://www.alibabacloud.com/press-room/first-public-cloud-region-in-the-netherlands
- platfo-7: Alibaba Cloud opened its Netherlands (Amsterdam) region and announced bringing ACS Agent Sandbox and AI Security Guardrails 2.0 there.

Page: https://help.aliyun.com/en/api-gateway/ai-gateway-commercialization-announcement
- platfo-18: AI Gateway Serverless edition becomes commercial from 2026-09-01.

Page: https://www.alibabacloud.com/blog/mastering-vector-search-how-alibaba-cloud%E2%80%99s-inference-api-enhances-elasticsearch%C2%A0_602005
- platfo-38: Alibaba Cloud Elasticsearch includes an Inference API exposing AI Search embedding/rerank/sparse-vector/completion models.

Page: https://help.aliyun.com/en/document-mind/developer-reference/document-mind-endpoints
- platfo-48: Document Mind (DocMind) endpoints are documented only for China (Hangzhou) docmind-api.cn-hangzhou.aliyuncs.com.

Page: https://www.alibabacloud.com/help/en/content-moderation/latest/product-overview
- platfo-76: AI Guardrails Singapore API endpoint is green-cip.ap-southeast-1.aliyuncs.com.

Page: https://www.alibabacloud.com/help/en/content-moderation/latest/text-moderation-enhanced-multilingual-service-api
- platfo-81: Content Moderation multilingual text moderation 2.0 with translation is available only in Singapore.

Page: https://higress.ai/en/docs/ai/scene-guide/multi-proxy/
- platfo-13: Higress supports protocol conversion for over 100 models and model-level fallback.

Page: https://www.alibabacloud.com/help/en/api-gateway/ai-gateway/product-overview/ai-gateway-capacity-description
- platfo-21: Dedicated AI Gateway instances provide a 99.99% SLA.

Page: https://www.alibabacloud.com/help/en/agentcore/overview-of-knowledge-base-connections.md
- platfo-33: AgentCore establishes knowledge base connections and exposes retrieval tools through the Model Context Protocol.

Page: https://www.alibabacloud.com/help/analyticdb-for-postgresql/user-guide/what-is-rag-service
- platfo-40: AnalyticDB for PostgreSQL offers a RAG Service that handles document ingestion, embedding, hybrid search, and reranking.
