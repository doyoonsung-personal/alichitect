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

Page: https://www.alibabacloud.com/help/en/agent-sandbox/product-overview/billing-overview
- platfo-64: Agent Sandbox Economy vCPU class is billed at USD 0.0000026 per second.
- platfo-65: Agent Sandbox Default vCPU class is billed at USD 0.0000034 per second.
- platfo-66: Agent Sandbox memory is billed at USD 0.00000128 per GiB per second.

Page: https://help.aliyun.com/en/agentrun/open-service-area
- platfo-6: AgentRun's only international region is Singapore.
- platfo-2: AgentRun's only international supported region is Singapore (ap-southeast-1).

Page: https://www.alibabacloud.com/help/en/functioncompute/limits-of-usage
- platfo-44: Function Compute default concurrency is 300 instances per region per account.
- platfo-45: Function Compute code-package size is larger than 100 MB in Singapore, Japan (Tokyo), US (Virginia), and Germany (Frankfurt).

Page: https://www.alibabacloud.com/help/en/vrs/latest/opening-service
- platfo-74: DashVector supports US (Virginia) and Singapore regions.
- platfo-45: DashVector is available only in US (Virginia) and Singapore.

Page: https://www.alibabacloud.com/help/en/asc/product-overview/billing-overview
- platfo-84: Agent Security Center defense seat fee is USD 0.0574 per seat per hour.
- platfo-86: Agent Security Center log storage costs USD 0.3 per TB per hour.

Page: https://www.alibabacloud.com/help/en/agentloop/agentloop-quickstart-whole-process-practice
- platfo-5: AgentLoop internationally is available only in Hong Kong.

Page: https://www.alibabacloud.com/help/en/agentcore/api-agentcore-2026-08-04-createagentimchannel
- platfo-16: AgentCore supports three IM channels: DINGTALK, FEISHU (Lark), and WECOM.

Page: https://www.alibabacloud.com/help/en/serverless-workflow/latest/parallel-steps
- platfo-51: CloudFlow parallel step can have a maximum of 100 branches.

Page: https://www.alibabacloud.com/help/en/agent-sandbox/product-overview/limits-of-agent-sandbox
- platfo-69: Agent Sandbox instance concurrency limit is 200 per sandbox, not adjustable.

Page: https://www.alibabacloud.com/help/en/agentrun/api-agentrun-2025-09-10-convertflowdsl.md
- platfo-14: AgentRun Flow can import Dify and n8n DSLs and serve Dify Workflow / Dify Chatflow protocols.

Page: https://www.alibabacloud.com/help/en/agentrun/large-language-model-1.md
- platfo-28: AgentRun model proxy is built on the open source LiteLLM project.

Page: https://www.alibabacloud.com/help/en/functioncompute/billing-overview-of-fc
- platfo-42: FC CU conversion factors are vCPU 1 CU/(vCPU·s) and memory 0.5 CU/(GB·s).

Page: https://help.aliyun.com/en/functioncompute/supported-regions-of-fc-agent-sandbox
- platfo-6: FC Agent Sandbox supports regions including Singapore, US (Virginia), US (Silicon Valley), and China (Hong Kong).

Page: https://github.com/aliyun/alibabacloud-api-mcp-server/blob/main/README-EN.md
- platfo-23: Alibaba Cloud hosts an official remote MCP service with the international endpoint https://api.alibabacloud.com/mcp.

Page: https://help.aliyun.com/en/open-search/developer-reference/api-searchengine-2021-10-25-endpoint
- platfo-36: OpenSearch Vector Search Edition has a Singapore endpoint searchengine.ap-southeast-1.aliyuncs.com.

Page: https://www.alibabacloud.com/help/en/pai/product-overview/regions-and-zones
- platfo-50: PAI regions include Singapore, Kuala Lumpur, Jakarta, Tokyo, Frankfurt, Silicon Valley, and Virginia.

Page: https://www.alibabacloud.com/help/en/content-moderation/latest/what-is-ai-security-barrier
- platfo-75: AI Guardrails console supports China East 2 (Shanghai), China (Hong Kong), Singapore, Germany (Frankfurt), and US (Virginia).

Page: https://www.alibabacloud.com/help/en/asc/product-overview/what-is-the-agent-security-center
- platfo-83: Agent Security Center (ASC) is in comprehensive public preview.

Page: https://www.alibabacloud.com/help/en/api-gateway/ai-gateway/user-guide/managing-the-model-api
- platfo-12: AI Gateway intelligent routing uses semantic analysis to route requests to the best-fit model.

Page: https://www.alibabacloud.com/help/en/openapi/user-guide/openapi-mcp-server-core-tool-guide
- platfo-24: The Alibaba Cloud OpenAPI MCP Server Core Edition includes 15 built-in tools for API calls and orchestration.

Page: https://help.aliyun.com/en/functioncompute/mcp-service-introduction/
- platfo-32: Function Compute is documented as an ideal runtime for hosting MCP services on the cloud.

Page: https://help.aliyun.com/en/lindorm/user-guide/multi-az-basic-edition-deployment
- platfo-44: Lindorm multi-zone Basic Edition listing includes Seoul, Tokyo, Singapore, Kuala Lumpur, Jakarta, and Bangkok.
