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

Page: https://www.alibabacloud.com/help/en/model-studio/new-free-quota
- userev-21: First activation of Model Studio (Singapore) grants a per-model free quota, typically 1,000,000 tokens.
- useope-22: Free quota provides 1M tokens per model, valid for 90 days, only for Singapore region with International deployment scope.
- useser-45: New-user free quota in Model Studio is typically 1,000,000 tokens per model, valid for 90 days in the Singapore region.
- cossiz-11: Free quota is 1M tokens per model, valid for 90 days, Singapore only.
- pre-71: New-user free quota for eligible models is 1M tokens for 90 days, limited to Singapore/international-scope models.

Page: https://www.alibabacloud.com/help/en/model-studio/qwen3-8-max
- useope-2: The qwen3.8-max model card shows a price of $1.65 input / $4.951 output, which corresponds to the Global deployment scope.
- useope-13: qwen3.8-max has a 1M context window, thinking mode, and full tool ecosystem support.
- useser-11: The dedicated qwen3.8-max model page lists an alternative price of Input $1.65 / Output $4.951 per 1M tokens.
- cossiz-3: qwen3.8-max price in Global scope (US Virginia) is $1.65 input / $4.951 output with implicit cache at $0.206.

Page: https://www.alibabacloud.com/en/campaign/ai-landing-page-token?_p_lc=1
- userev-2: qwen3.8-max is priced at $2 per 1M input tokens and $6 per 1M output tokens in the Singapore region.
- useope-1: qwen3.8-max is priced at $2 per 1M input tokens and $6 per 1M output tokens for the International deployment scope in Singapore.

Page: https://www.alibabacloud.com/help/en/chatapp/product-overview/what-is-chatapp-message-service
- userev-28: Chat App Message Service includes WhatsApp, Messenger, Viber, LINE, Telegram, Instagram, and SMS.
- useser-24: Chat App Message Service (CAMS) supports WhatsApp, Viber, Messenger, Instagram, LINE, and Telegram.

Page: https://www.alibabacloud.com/help/en/functioncompute/supported-regions-of-fc-agent-sandbox
- useope-7: FC Agent Sandbox API/SDK is available in China (Hong Kong), Singapore, and US regions.
- useser-17: FC Agent Sandbox supports the Singapore region.

Page: https://www.alibabacloud.com/help/en/model-studio/text-embedding-v4
- useope-16: text-embedding-v4 supports 8,192 tokens per text and batches of 10.
- cossiz-8: text-embedding-v4 price is $0.072 per 1M text input tokens.

Page: https://help.aliyun.com/en/model-studio/flow-agent-introduction
- dianot-10: Model Studio documents a 'Flow Agent' visual platform with Agent Creation, Agent Group and Memory nodes, marked as China site only.
- dianot-11: Singapore availability of Model Studio Flow Agent is unconfirmed.

Page: https://www.alibabacloud.com/blog/alibaba-cloud-expands-european-footprint-with-two-availability-zones-in-france_603265
- pre-13: Alibaba Cloud expanded its European footprint with two new availability zones in France.
- pre-14: Alibaba Cloud has 105 availability zones across 32 regions.

Page: https://www.alibabacloud.com/help/en/agentloop/agentloop-quickstart-whole-process-practice
- userev-6: AgentLoop international availability is confirmed for Hong Kong only via quickstart region picker.

Page: https://www.alibabacloud.com/blog/model-studio-token-plan-for-individual-one-subscription-for-every-ai-model-up-to-3x-more-value_603426
- userev-22: Token Plan for Individual starts at $6/month early-bird.

Page: https://www.schneider.im/microsoft-dynamics-365-ai-agent-capabilities-and-licensing/
- userev-35: Microsoft Sales Qualification Agent went GA Oct 25, 2025, including 1,000 Copilot Credits per Dynamics 365 Sales Premium license.

Page: https://www.twobirds.com/en/capabilities/artificial-intelligence/ai-legal-services/ai-regulatory-horizon-tracker/japan
- userev-60: Japan AI Promotion Act passed 28 May 2025 and came into full force 1 Sep 2025.

Page: https://regulations.ai/regulations/RAI-CN-NA-CONTENT-2025
- userev-65: China Measures for Labelling of AI-Generated Synthetic Content are effective 1 Sep 2025.

Page: https://www.alibabacloud.com/help/en/model-studio/regions
- userev-4: US (Virginia) supports Global and US deployment scopes, while Germany (Frankfurt) supports Global and EU scopes.

Page: https://www.conveyor.com/ai-agents-for-security-reviews
- userev-39: Conveyor markets its security questionnaire agent at 98% accuracy.

Page: https://www.pnas.org/doi/10.1073/pnas.2305016120
- userev-44: Gilardi et al. found ChatGPT's zero-shot sentiment accuracy exceeded crowd workers by ~25 percentage points.

Page: https://www.alibabacloud.com/help/en/model-studio/qwen3-coder-flash
- useope-14: The price for qwen3-coder-flash is unconfirmed as the model page does not surface a clean number.

Page: https://www.alibabacloud.com/en/press-room/acs-for-international-customers-to-revolutionize?_p_lc=1
- useope-33: ACS serverless K8s became available for international customers since January 2025.

Page: https://artificialintelligenceact.eu/article/6/
- useope-66: EU AI Act Article 6 high-risk obligations apply from 2 December 2027.

Page: https://www.alibabacloud.com/help/en/model-studio/asr-model
- useope-19: Fun ASR models support 31+ languages.

Page: https://www.alibabacloud.com/en/product/opensearch?_p_lc=1
- useope-37: OpenSearch provides LLM-Based Conversational Search and Agentic Search products.

Page: https://www.alibabacloud.com/en/about/gartner-aica-2026?_p_lc=1
- useope-47: Alibaba Cloud is named a Challenger in the 2026 Gartner MQ for Enterprise AI Coding Agents and #1 in APAC.

Page: https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/non-template-messages
- useser-19: From October 1, 2026, Meta charges per-message fees for utility/service messages inside the WhatsApp 24-hour window.

Page: https://next.api.alibabacloud.com/product/CCC
- useser-29: Cloud Contact Center (CCC) international availability is unconfirmed and likely China-only.

Page: https://www.gartner.com/en/newsroom/press-releases/2025-03-05-gartner-predicts-agentic-ai-will-autonomously-resolve-80-percent-of-common-customer-service-issues-without-human-intervention-by-20290
- useser-48: Gartner forecasts that by 2029 agentic AI will autonomously resolve 80% of common customer-service issues without human intervention.

Page: https://www.henson-legal.com/ai-voice-compliance
- useser-64: The FCC treats AI-generated voice as an 'artificial voice' under TCPA, requiring one-to-one consent since January 27, 2025.

Page: https://help.aliyun.com/en/agentcore/agentcore-billing-instructions
- useser-83: AgentCore international pricing is unconfirmed; only a China reference price of CNY 0.0000694/CU was found.

Page: https://www.anthropic.com/research/building-effective-agents
- useser-46: Anthropic recommends starting with simple, composable patterns over frameworks for agent design.

Page: https://developers.line.biz/
- useser-57: LINE revised Official Account pricing in Taiwan effective November 1, 2026.

Page: https://poly.ai/customers/pge
- useser-66: PG&E saved 35,000 labor hours and saw a 22% CSAT increase using PolyAI.

Page: https://docs.cloud.google.com/release-notes
- dianot-5: Google renamed 'Vertex AI Agent Designer' to 'Workflow Builder' and it is generally available (GA) in Gemini Enterprise.

Page: https://www.alibabacloud.com/help/en/agentrun/quick-start-to-low-code-agent-creation-1
- dianot-13: Alibaba AgentRun includes a low-code visual 'Flow Agent' canvas that supports drag-and-drop node orchestration.

Page: https://www.workspaceblog.in/blog/gemini-enterprise-workflow-builder-guide/
- dianot-6: The GA date for Google Workflow Builder is reported as 2026-09-03 by a third-party guide but is unconfirmed officially.

Page: https://docs.langchain.com/oss/python/langgraph/graph-api
- dianot-19: LangGraph nodes and edges are functions that can contain an LLM or code, rather than distinct primitive types for every action.

Page: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy-core-concepts.html
- dianot-26: AWS Bedrock AgentCore Gateway converts APIs and Lambda functions to MCP compatible tools.

Page: https://docs.dify.ai/en/cloud/use-dify/nodes/iteration
- dianot-36: Dify Iteration node processes arrays sequentially or in parallel.

Page: https://www.alibabacloud.com/help/en/functioncompute/pay-as-you-go-billing-methods
- cossiz-38: Function Compute Tier 1 price is USD 0.000020/CU.

Page: https://www.alibabacloud.com/help/en/analyticdb/analyticdb-for-postgresql/product-overview/billable-items
- cossiz-47: AnalyticDB for PostgreSQL Serverless pro price is USD 0.036485/CU/hour.

Page: https://www.alibabacloud.com/help/en/milvus/product-overview/billing-item
- cossiz-58: Milvus Vector Retrieval Service unit prices are unconfirmed from public pages.

Page: https://openai.github.io/openai-agents-python/running_agents/
- cossiz-24: OpenAI Agents SDK max_turns default value is unconfirmed but third parties say 5 or 10.

Page: https://www.alibabacloud.com/help/en/agentcore/agentcore-billing-activation
- cossiz-44: AgentCore billing started on 2026-09-18 00:00 UTC+8.

Page: https://www.datacenterdynamics.com/en/news/alibaba-cloud-plans-new-cloud-regions-in-turkey-finland-the-netherlands/
- pre-12: Alibaba Cloud plans to open its first cloud regions in Türkiye, Finland, and the Netherlands within 12 months.

Page: https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-privacy-policy
- pre-44: International personal data for Model Studio is stored in Singapore.

Page: https://www.cnbc.com/2026-06-09/alibaba-baidu-byd-named-on-pentagons-china-military-list-.html
- pre-5: Alibaba publicly disputed its inclusion on the Pentagon's China military list on June 9, 2026.

Page: https://aws.amazon.com/ai/security/agentic-ai-scoping-matrix/
- pre-23: The AWS Agentic Scoping Matrix classifies agents by connectivity and autonomy.

Page: https://www.alibabacloud.com/help/en/model-studio/budget-management
- pre-33: Model Studio budget management allows monthly limits, alerts, and optional auto-restriction of pay-as-you-go usage.
