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

Page: https://www.alibabacloud.com/help/en/api-gateway/ai-gateway/product-overview/announcement-new-serverless-version-of-the-ai-gateway-now-in-public-beta
- platfo-73: AI Gateway Serverless edition public preview is China-only.
- platfo-17: AI Gateway Serverless edition is in public preview only in mainland China regions and Hong Kong.
- platfo-22: New Serverless AI Gateway fees are waived during preview; only inbound Internet traffic is billed via CDT.

Page: https://www.alibabacloud.com/help/en/agentcore/agentcore-billing-instructions
- platfo-21: AgentCore reference price is USD 0.00001 per Compute CU in China (Shanghai).
- platfo-20: AgentCore CU conversion is 1 vCPU × 1 s = 1 CU; 1 GB memory × 1 s = 0.5 CU.

Page: https://www.alibabacloud.com/help/en/functioncompute/instance-types-and-specifications
- platfo-36: Tesla-series GPU regions for Function Compute include Singapore and US (Virginia).
- platfo-37: Ada-series GPU regions for Function Compute include Singapore.

Page: https://www.alibabacloud.com/help/en/hologres/product-overview/pay-as-you-go
- platfo-41: Hologres pay-as-you-go compute in Singapore costs USD 0.066604/CU/hour.
- platfo-42: Hologres storage in Singapore costs USD 0.000379/GB/hour.

Page: https://www.alibabacloud.com/help/en/agentbay/product-overview/agentbay-billing-instructions
- platfo-71: AgentBay Pro plan costs USD 149/month.
- platfo-72: AgentBay Credit unit price is USD 0.0267 per Credit.

Page: https://www.alibabacloud.com/help/en/agentcore/agentteams-has-been-migrated-to-agentcore
- platfo-8: AgentTeams no longer exists as a product and has been migrated into AgentCore.

Page: https://help.aliyun.com/en/agentcore/api-agentcore-2026-08-04-endpoint
- platfo-11: The AgentCore endpoint for Singapore is agentcore.ap-southeast-1.aliyuncs.com (China site only).

Page: https://www.alibabacloud.com/help/en/eventbridge/product-overview/supported-regions
- platfo-57: EventBridge Singapore (ap-southeast-1) is listed as a service region.

Page: https://www.alibabacloud.com/help/en/mns/product-overview/billing-overview
- platfo-60: SMQ provides 20 million free requests per month per account.

Page: https://www.alibabacloud.com/help/en/agentcore/acentcore-collaboration-control-face-exemption-description
- platfo-22: AgentCore collaboration control plane is currently CNY 0 during a limited-time free period.

Page: https://www.alibabacloud.com/help/en/agentrun/quickly-create-agent-no-code
- platfo-23: AgentRun Quick Creation allows creating an agent using a visual configuration interface without programming experience.

Page: https://www.alibabacloud.com/help/en/serverless-workflow/latest/perform-callbacks-on-asynchronous-tasks
- platfo-50: CloudFlow supports waitForCallback pattern for human approval steps.

Page: https://www.alibabacloud.com/help/zh/agentloop/product-overview/server-launch-regions-of-agentloop
- platfo-1: AgentLoop supports the Singapore region (ap-southeast-1) with endpoint agentloop.ap-southeast-1.aliyuncs.com.

Page: https://help.aliyun.com/en/model-studio/cli/mcp-skill
- platfo-28: Model Studio MCP capabilities are currently available only to China site (aliyun.com) accounts.

Page: https://www.alibabacloud.com/help/en/maxcompute/mcmcp-service-remote-mcp-server
- platfo-29: MaxCompute offers a remote MCP server (MCMCP) with public endpoints in specific service regions.

Page: https://www.alibabacloud.com/help/en/agent-sandbox/product-overview/agent-sandbox-overview
- platfo-62: Agent Sandbox Flash Edition is compatible with the E2B SDK.

Page: https://www.alibabacloud.com/help/en/agent-sandbox/product-overview/open-service-area
- platfo-63: Agent Sandbox Flash Edition regions include Asia Pacific SE 1 (Singapore), Malaysia (Johor), and US (Virginia).

Page: https://www.alibabacloud.com/help/en/direct-mail/faqs-about-receiving-replies
- platfo-100: Direct Mail is an outbound email service and does not provide inbound email or an enterprise mailbox.

Page: https://www.alibabacloud.com/en/product/salesforce?_p_lc=1
- platfo-101: Salesforce on Alibaba Cloud is exclusive to customers in China.

Page: https://www.alibabacloud.com/help/en/agentrun/tool-market
- platfo-26: AgentRun Tool Marketplace provides pre-built Skills, MCP tools, and Function Call tools.

Page: https://mcpservers.org/servers/aliyun/alibabacloud-dms-mcp-server
- platfo-30: The DMS MCP server supports more than 40 data sources and NL2SQL capabilities.
