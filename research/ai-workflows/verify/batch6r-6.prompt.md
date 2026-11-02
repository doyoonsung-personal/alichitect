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

Page: https://www.alibabacloud.com/help/en/model-studio/create-fine-tuning-job-api
- useser-6: Fine-tuning features in Model Studio are only available in the Singapore region for international users.
- pre-3: Fine-tuning APIs are available only in the Singapore region on the international site.

Page: https://www.ibm.com/thought-leadership/institute-business-value/en-us/report/state-of-salesforce-2025
- userev-37: IBM State of Salesforce 2025-2026 report states 69% of organisations cite poor data quality as leading AI adoption barrier.

Page: https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing
- useser-18: WhatsApp commercial messaging switched to per-message pricing on July 1, 2025.

Page: https://www.beri.net/article/assistants-api-august-26-shutdown-openai-responses-vs-azure-foundry-agents
- dianot-4: Azure OpenAI Assistants API retires on August 26, 2026 (unconfirmed on official lifecycle page).

Page: https://help.aliyun.com/en/model-studio/managed-agents-billing
- cossiz-54: Model Studio Managed Agents session runtime fee is CNY 0.5/hour (China site only).

Page: https://www.alibabacloud.com/help/en/agentrun/what-is-agentrun
- useope-28: AgentRun AgentRuntime supports Python, Node, and Java.
- useope-29: AgentRun sandbox runtime supports 50+ languages.
- dianot-32: Alibaba AgentRun no-code Quick Create involves selecting a model, writing a prompt, and configuring tools and a sandbox.
- cossiz-59: AgentRun unit prices are unconfirmed; no public rate card found.
- pre-84: AgentRun is a serverless agent runtime providing full lifecycle management.
- pre-92: AgentRun's only international endpoint is Singapore.

Page: https://www.alibabacloud.com/help/en/maxcompute/purchasing-and-using-the-maxcompute-ai-inference-service
- userev-27: MaxCompute model computing service is available internationally only in Singapore.

Page: https://www.alibabacloud.com/blog/announcing-dataworks-data-agent-meet-your-ai-agent-for-data_603187
- useope-39: DataWorks Data Agent is Generally Available (GA).

Page: https://ideas.repec.org/p/nbr/nberwo/35620.html
- useser-73: A Khan Academy NBER RCT found assignment raises math achievement by 1.3 national percentile ranks per term.

Page: https://docs.flowiseai.com/using-flowise/agentflowv2
- dianot-21: Flowise Agent nodes allow the LLM to dynamically choose a tool.

Page: https://www.alibabacloud.com/help/en/model-studio/mcp
- pre-24: Model Studio supports MCP servers.

Page: https://www.alibabacloud.com/help/en/functioncompute/supported-regions-of-fc-agent-sandbox
- useope-7: FC Agent Sandbox API/SDK is available in China (Hong Kong), Singapore, and US regions.
- useser-17: FC Agent Sandbox supports the Singapore region.

Page: https://regulations.ai/regulations/RAI-CN-NA-CONTENT-2025
- userev-65: China Measures for Labelling of AI-Generated Synthetic Content are effective 1 Sep 2025.

Page: https://www.alibabacloud.com/en/product/opensearch?_p_lc=1
- useope-37: OpenSearch provides LLM-Based Conversational Search and Agentic Search products.

Page: https://developers.line.biz/
- useser-57: LINE revised Official Account pricing in Taiwan effective November 1, 2026.

Page: https://www.alibabacloud.com/help/en/functioncompute/pay-as-you-go-billing-methods
- cossiz-38: Function Compute Tier 1 price is USD 0.000020/CU.

Page: https://aws.amazon.com/ai/security/agentic-ai-scoping-matrix/
- pre-23: The AWS Agentic Scoping Matrix classifies agents by connectivity and autonomy.

Page: https://artificialintelligenceact.eu/article/50/
- useser-20: EU AI Act Article 50 transparency obligations have been applicable since August 2, 2026.
- pre-75: EU AI Act Article 50 transparency obligations apply from August 2, 2026.

Page: https://tribble.ai/blog/rfp-response-time-ai-agents/
- userev-42: Tribble.ai states average enterprise RFP takes 20 to 30 hours of cumulative effort.

Page: https://developers.kakao.com/docs/en/kakaotalk-channel/rest-api
- useser-26: KakaoTalk is not supported by Alibaba Cloud CAMS and requires Kakao's own API or a CPaaS.

Page: https://www.alibabacloud.com/help/en/pai/create-a-code-based-application
- dianot-9: Users can migrate LangStudio workflow apps to Model Studio workflow apps, but the Model Studio DSL cannot directly import the LangStudio flow.

Page: https://arxiv.org/abs/2604.22750
- cossiz-20: An arXiv study found agentic coding tasks average 4.17M tokens with input:output ratio of 154:1.
