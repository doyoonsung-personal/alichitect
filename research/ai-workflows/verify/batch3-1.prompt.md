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

Page: https://www.alibabacloud.com/help/en/agentrun/what-is-agentrun
- platfo-24: AgentRun integrates with LangChain, AgentScope, CrewAI, and Google ADK frameworks.
- platfo-27: AgentRun Sandbox types include Code Interpreter and Browser Use.
- platfo-33: AgentRun observability is based on OpenTelemetry.

Page: https://www.alibabacloud.com/help/en/agentcore/agentcore-product-overview
- platfo-10: AgentCore is available in the Singapore region (ap-southeast-1).
- platfo-3: AgentCore is currently available only in China regions (Hangzhou, Beijing, Shenzhen) and has no international endpoints.

Page: https://www.alibabacloud.com/help/en/functioncompute/resident-resource-pool
- platfo-38: Function Compute resident resource pools exist in US (Virginia), Germany (Frankfurt) and Singapore.
- platfo-39: Function Compute resident pool disk price is USD 0.21/GB/month.

Page: https://www.alibabacloud.com/help/en/api-gateway/cloud-native-api-gateway/product-overview/billing-overview
- platfo-19: Dedicated AI Gateway instance pricing includes an example data-processing rate of USD 0.005/GB.
- platfo-20: The apigw.small.x1 dedicated AI Gateway instance costs USD 0.291/hour.

Page: https://www.alibabacloud.com/en/product/content-moderation/pricing?_p_lc=1
- platfo-79: Content Moderation text moderation starts from USD 0.50 per 1,000 text tasks.
- platfo-80: Content Moderation standard image moderation costs USD 0.6 per 1,000 calls.

Page: https://www.alibabacloud.com/help/en/model-studio/model-pricing
- platfo-7: qwen3.8-max pricing in Singapore is $2 per million input tokens and $6 per million output tokens.

Page: https://www.alibabacloud.com/help/en/agentcore/agentcore-billing-activation
- platfo-12: AgentCore started billing on 2026-09-18 00:00 (UTC+8) and is currently in public preview.

Page: https://www.alibabacloud.com/help/en/serverless-workflow/latest/limits
- platfo-56: CloudFlow Maximum number of flows is 10,000.

Page: https://help.aliyun.com/en/apsaramq-for-rocketmq/cloud-message-queue-rocketmq-5-x-series/product-overview/supported-regions
- platfo-61: ApsaraMQ for RocketMQ 5.x is available in ap-southeast-1 Singapore.

Page: https://www.alibabacloud.com/help/en/agentcore/mirrored-cache
- platfo-19: AgentCore Image Cache feature is in public preview and free during preview.

Page: https://www.alibabacloud.com/help/doc-detail/3049290.html
- platfo-26: AgentRun exposes Native, OpenAI-compatible, Dify Workflow, and Dify Chatflow protocols.

Page: https://www.alibabacloud.com/help/en/functioncompute/fc/configure-an-eventbridge-based-oss-trigger
- platfo-46: Max 50 EventBridge-based OSS triggers allowed for Function Compute.

Page: https://www.alibabacloud.com/help/en/open-search/search-platform/user-guide/get-service-call-address
- platfo-5: AI Search Open Platform is available only in China (Shanghai) and Germany (Frankfurt).

Page: https://www.alibabacloud.com/help/en/agentbay/developer-reference/mcp-computer-use/
- platfo-27: AgentBay exposes Computer Use sandboxed Linux/Windows sessions via MCP.

Page: https://www.alibabacloud.com/help/en/milvus/product-overview/region-and-zone
- platfo-34: Vector Retrieval Service for Milvus is available in Singapore (Zones B, C) and Germany (Frankfurt) (Zones A, B).

Page: https://www.alibabacloud.com/help/en/cms/cloudmonitor-2-0/what-is-cloud-monitor-2-0
- platfo-58: CloudMonitor 2.0 serves non-China regions from the Singapore region group.

Page: https://www.alibabacloud.com/help/en/agentbay/support/faq
- platfo-70: AgentBay is deployed in Singapore.

Page: https://www.alibabacloud.com/en/product/identity-as-a-service-idaas?_p_lc=1
- platfo-90: IDaaS EIAM supports the Singapore region.

Page: https://www.alibabacloud.com/help/en/api-gateway/product-overview/
- platfo-8: AI Gateway is a unified proxy for LLM APIs and MCP Servers, serving as the commercial form of Higress AI gateway.

Page: https://www.alibabacloud.com/en/press-room/alibaba-cloud-unveil-advanced-agentic-ai-ecosystem?_p_lc=1
- platfo-25: The Cloud Agent Catalog converts capabilities across more than 60 cloud products into Skill-based, MCP-compatible assets.

Page: https://github.com/aliyun/data-agent-skill/blob/main/alibabacloud-data-agent-mcp-skill/README.md
- platfo-31: The Data Agent MCP skill includes 18 data_agent_* tools.

Page: https://www.alibabacloud.com/help/en/tablestore/memory-storage-service-sub-product-test/overview
- platfo-46: Tablestore Knowledge Storage manages document parsing, chunking, embedding, indexing, and retrieval.
