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

Page: https://www.alibabacloud.com/help/en/model-studio/context-cache
- userev-20: Context cache bills the cached portion of input at typically 20% of the standard input token price.
- useope-21: Context cache creation costs approximately 125% of standard input price, while cache hits cost approximately 10%.
- useser-43: Context cache creation costs 125% of standard input price, while cache hits cost 10%.
- cossiz-17: System prompts must be ≥1,024 tokens to be cacheable on Model Studio.
- cossiz-28: Implicit context cache input is typically billed at 20% of the standard input token price.
- pre-35: Context cache input is typically billed at approximately 20% of the standard input price.

Page: https://www.alibabacloud.com/help/en/agentcore/agentcore-billing-instructions
- useope-9: AgentCore uses CU-based billing where 1 vCPU·s = 1 CU and 1 GB·s = 0.5 CU, with a reference price of USD 0.00001/CU in China (Shanghai).
- cossiz-43: AgentCore reference price is USD 0.00001 per Compute CU stated for China Shanghai.
- cossiz-60: AgentCore Singapore unit price is unconfirmed.

Page: https://docs.aws.amazon.com/general/latest/gr/bedrock.html
- dianot-44: AWS Bedrock Flows quota limits condition nodes to 5 per flow.
- dianot-45: AWS Bedrock Flows quota limits collector nodes to 1 per flow.
- dianot-46: AWS Bedrock Flows quota limits agent nodes to 20 per flow.

Page: https://www.gartner.com/en/newsroom/press-releases/2025-06-25-gartner-predicts-over-40-percent-of-agentic-ai-projects-will-be-canceled-by-end-of-2027
- userev-38: Gartner predicts >40% of agentic AI projects will be cancelled by end-2027.
- useser-49: Gartner predicts over 40% of agentic AI projects will be canceled by end of 2027.

Page: https://www.alibabacloud.com/help/en/model-studio/access-model-studio-through-privatelink
- useope-24: PrivateLink private endpoints for Model Studio are available only in China (Beijing) and China (Hong Kong).
- useser-7: PrivateLink for Model Studio is supported only in China (Beijing) and China (Hong Kong).

Page: https://www.alibabacloud.com/help/en/model-studio/create-fine-tuning-job-api
- useser-6: Fine-tuning features in Model Studio are only available in the Singapore region for international users.
- pre-3: Fine-tuning APIs are available only in the Singapore region on the international site.

Page: https://www.alibabacloud.com/help/en/agentloop/agentloop-billing-overview
- cossiz-45: AgentLoop price is USD 0.0016/AI credit.
- cossiz-46: AgentLoop price is USD 0.00014 per execution.

Page: https://www.alibabacloud.com/help/en/model-studio/qwen-plus
- pre-67: qwen-plus is priced at $0.115 / 1M input tokens and $0.287 / 1M output tokens.
- pre-68: qwen-plus thinking mode output is priced at $1.147 / 1M tokens.

Page: https://www.alibabacloud.com/product/function-compute/pricing
- userev-25: Function Compute is priced at $0.00001668 per GB-second.

Page: https://www.salesforce.com/agentforce/pricing/
- userev-34: Salesforce Agentforce pricing benchmark is $2 per conversation.

Page: https://www.tilleke.com/insights/a-closer-look-at-vietnams-new-ai-law-what-it-means-for-ai-businesses/
- userev-61: Vietnam AI Law No. 134/2025/QH15 is effective 1 Mar 2026, being the first standalone binding AI law in Southeast Asia.

Page: https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai
- userev-64: EU AI Act is applicable from 2 Aug 2026 with transparency obligations since Aug 2026.

Page: https://www.developersdigest.tech/models/fine-tuning/alibaba-model-studio
- userev-5: Fine-tuning API is stated by a third party as only available in the Singapore region for the international site (unconfirmed on official page).

Page: https://www.ibm.com/thought-leadership/institute-business-value/en-us/report/state-of-salesforce-2025
- userev-37: IBM State of Salesforce 2025-2026 report states 69% of organisations cite poor data quality as leading AI adoption barrier.

Page: https://www.sprinklr.com/stories/
- userev-45: Sprinklr case study reports a global beverage company resolves 75% of Instagram DMs in under a minute.

Page: https://www.alibabacloud.com/help/en/agentcore/agentteams-has-been-migrated-to-agentcore
- useope-10: AgentTeams has been migrated into AgentCore.

Page: https://www.alibabacloud.com/help/en/cs/product-overview/product-billing-rules
- useope-34: ACS S-class vCPU billing rate is 0.00000038 USD/s.

Page: https://artificialintelligenceact.eu/annex/3/
- useope-65: EU AI Act lists AI for recruitment/selection as Annex III high-risk.

Page: https://www.alibabacloud.com/help/en/eventbridge/product-overview/what-is-eventbridge
- useope-25: EventBridge rules can trigger Function Compute, RocketMQ, and DingTalk.

Page: https://www.alibabacloud.com/help/en/analyticdb/analyticdb-for-postgresql/openapi-based-rag-applications-1
- useope-36: AnalyticDB for PostgreSQL offers RAG OpenAPI and GraphRAG service.

Page: https://www.alibabacloud.com/help/en/agentloop/product-overview/server-launch-regions-of-agentloop
- useser-8: AgentLoop international availability is limited to Hangzhou, Shanghai, and Hong Kong.

Page: https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing
- useser-18: WhatsApp commercial messaging switched to per-message pricing on July 1, 2025.

Page: https://www.alibabacloud.com/help/en/isi/getting-started/regions-and-domain-names
- useser-30: Intelligent Speech Interaction (ISI) is available in Singapore on the international site, though China-site docs list only Shanghai/Beijing/Shenzhen.

Page: https://www.alibabacloud.com/help/en/model-studio/cosyvoice-v3-plus
- useser-41: cosyvoice-v3-plus pricing is $0.26 per 10,000 characters for Singapore/International scope.

Page: https://artificialintelligenceact.eu/article/5/
- useser-65: EU AI Act Article 5(1)(f) prohibits emotion recognition in the workplace and education, applicable since February 2, 2025.

Page: https://fpf.org/blog/malaysia-charts-its-digital-course-a-guide-to-the-new-frameworks-for-data-protection-and-ai-ethics/
- useser-80: Malaysia's PDPA Amendment Act 2024 mandates breach notification.

Page: https://aws.amazon.com/blogs/architecture/automating-agentic-ai-well-architected-reviews-with-the-aws-agentic-ai-lens/
- useser-47: AWS Well-Architected Agentic AI Lens contains 150 best practices across 41 questions.

Page: https://www.kuppingercole.com/blog/gardiner/when-ai-agents-read-your-email
- useser-55: Google researchers observed a 32% increase in malicious prompt injections between November 2025 and early 2026.

Page: https://tei.forrester.com/go/polyAI/PolyAITEI/
- useser-67: PolyAI Forrester TEI study reports a 391% ROI and payback in less than 6 months.

Page: https://www.beri.net/article/assistants-api-august-26-shutdown-openai-responses-vs-azure-foundry-agents
- dianot-4: Azure OpenAI Assistants API retires on August 26, 2026 (unconfirmed on official lifecycle page).

Page: https://dify.ai/blog/the-human-input-node-bringing-human-judgment-into-automated-workflows
- dianot-14: Dify v1.13.0 added a Human Input node allowing workflows to pause for human review and resume with approved, edited, or rerouted decisions.

Page: https://www.coze.com/open/docs/guides/workflow_limits
- dianot-63: Coze limits workflows to 1000 nodes.

Page: https://docs.langflow.org/agents-tools
- dianot-20: In Langflow, any component with Tool Mode enabled connects to the Agent's Tools input.

Page: https://docs.aws.amazon.com/bedrock/latest/userguide/flows-nodes.html
- dianot-25: AWS Bedrock Flows includes a Prompt node for inline or managed prompts.

Page: https://docs.dify.ai/en/cloud/use-dify/nodes/variable-aggregator
- dianot-37: Dify Variable Aggregator is designed for exclusive branches and does not combine outputs from multiple parallel paths.

Page: https://www.alibabacloud.com/help/en/model-studio/tpm-reservation-billing
- cossiz-32: qwen3.8-max Throughput Reservation price is $16.63 per 10k TPM·hour input.

Page: https://www.alibabacloud.com/help/en/hologres/product-overview/pay-as-you-go
- cossiz-48: Hologres Singapore price is USD 0.066604/CU/hour.

Page: https://help.aliyun.com/en/model-studio/managed-agents-billing
- cossiz-54: Model Studio Managed Agents session runtime fee is CNY 0.5/hour (China site only).

Page: https://www.alibabacloud.com/blog/603415
- cossiz-25: Alibaba Cloud AI Gateway offers credits-based metering and quotas.

Page: https://www.lmsys.org/blog/2024-07-01-routellm/
- cossiz-37: RouteLLM achieves >85% cost reduction on MT Bench at matched quality.

Page: https://www.alibabacloud.com/about/gartner-gaimp-2026
- pre-15: Alibaba Cloud was named a Leader in the 2026 Gartner Magic Quadrant for Generative AI Model Providers.

Page: https://huggingface.co/Qwen/Qwen3.8-2.4T-A95B
- pre-43: Qwen3.8 includes the first Max-class open release.

Page: https://www.scmp.com/news/us/article/3372356/alibaba-wins-preliminary-injunction-against-pentagon-lobbying-rule
- pre-7: SCMP reports that the designation of Alibaba as a Chinese military company was left intact despite the injunction.

Page: https://www.rand.org/pubs/research_reports/RRA2680-1.html
- pre-21: RAND lists lack of quality data as a root cause of AI project failure.

Page: https://help.aliyun.com/en/model-studio/savings-plan-and-resource-package
- pre-37: China site documentation quantifies savings plan discounts as 'up to 47% off'.
