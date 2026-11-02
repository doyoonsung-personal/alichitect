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

Page: https://www.alibabacloud.com/help/en/model-studio/access-model-studio-through-privatelink
- useope-24: PrivateLink private endpoints for Model Studio are available only in China (Beijing) and China (Hong Kong).
- useser-7: PrivateLink for Model Studio is supported only in China (Beijing) and China (Hong Kong).

Page: https://www.developersdigest.tech/models/fine-tuning/alibaba-model-studio
- userev-5: Fine-tuning API is stated by a third party as only available in the Singapore region for the international site (unconfirmed on official page).

Page: https://www.alibabacloud.com/help/en/agentloop/product-overview/server-launch-regions-of-agentloop
- useser-8: AgentLoop international availability is limited to Hangzhou, Shanghai, and Hong Kong.

Page: https://tei.forrester.com/go/polyAI/PolyAITEI/
- useser-67: PolyAI Forrester TEI study reports a 391% ROI and payback in less than 6 months.

Page: https://www.alibabacloud.com/help/en/hologres/product-overview/pay-as-you-go
- cossiz-48: Hologres Singapore price is USD 0.066604/CU/hour.

Page: https://help.aliyun.com/en/model-studio/savings-plan-and-resource-package
- pre-37: China site documentation quantifies savings plan discounts as 'up to 47% off'.

Page: https://docs.modelstudio.console.alibabacloud.com/en/model-studio/data-retention-policy
- pre-30: Model Studio defines a data retention policy where prompts/responses are retained for no longer than 30 days unless legally required.
- pre-31: ZDR-enabled workspaces change retention behavior for ZDR-supported models, while non-ZDR models fall back to standard policy.

Page: https://www.alibabacloud.com/help/doc-detail/3049222.html
- useope-5: AgentRun's only international endpoint for core services is Singapore (ap-southeast-1).

Page: https://www.facebook.com/alibabacloud/posts/qwen38-flash-is-now-available-in-the-european-union-on-alibaba-cloud-model-studi/1582315680607185/
- useser-35: qwen3.8-flash pricing is $0.15 per 1M input tokens and $0.47 per 1M output tokens.

Page: https://help.aliyun.com/en/model-studio/workflow/memory-node
- dianot-31: Alibaba Model Studio includes a Memory node that adds and retrieves memories on a memory store within a workflow.

Page: https://arxiv.org/abs/2305.05176
- cossiz-36: FrugalGPT matches best single LLM with up to 98% cost reduction.

Page: https://www.alibabacloud.com/help/en/chatapp/product-overview/what-is-chatapp-message-service
- userev-28: Chat App Message Service includes WhatsApp, Messenger, Viber, LINE, Telegram, Instagram, and SMS.
- useser-24: Chat App Message Service (CAMS) supports WhatsApp, Viber, Messenger, Instagram, LINE, and Telegram.

Page: https://www.twobirds.com/en/capabilities/artificial-intelligence/ai-legal-services/ai-regulatory-horizon-tracker/japan
- userev-60: Japan AI Promotion Act passed 28 May 2025 and came into full force 1 Sep 2025.

Page: https://www.alibabacloud.com/help/en/model-studio/asr-model
- useope-19: Fun ASR models support 31+ languages.

Page: https://www.anthropic.com/research/building-effective-agents
- useser-46: Anthropic recommends starting with simple, composable patterns over frameworks for agent design.

Page: https://docs.dify.ai/en/cloud/use-dify/nodes/iteration
- dianot-36: Dify Iteration node processes arrays sequentially or in parallel.

Page: https://www.cnbc.com/2026-06-09/alibaba-baidu-byd-named-on-pentagons-china-military-list-.html
- pre-5: Alibaba publicly disputed its inclusion on the Pentagon's China military list on June 9, 2026.

Page: https://www.alibabacloud.com/help/en/model-studio/privacy-notice
- useope-23: Model Studio never uses customer data for model training and has a SOC 2 report available.
- pre-118: Alibaba Cloud privacy notice states Alibaba Cloud will never use customer data for model training.

Page: https://www.responsive.io/product/ai
- userev-41: Responsive claims responses are 80% faster.

Page: https://help.aliyun.com/en/model-studio/workflow/parameter-extraction-node
- useser-23: Model Studio Parameter Extractor node is available on the China site only.

Page: https://www.alibabacloud.com/help/en/pai/product-overview/pai-langstudio-feature-retirement-and-migration-guide
- dianot-8: Alibaba PAI-LangStudio will be retired on March 9, 2027 at 16:00.

Page: https://www.cloudzero.com/blog/ai-agent-cost/
- cossiz-19: CloudZero reports a support-resolution example costing $0.132 per task with 12 calls.
