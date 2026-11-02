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
- useope-28: AgentRun AgentRuntime supports Python, Node, and Java.
- useope-29: AgentRun sandbox runtime supports 50+ languages.
- dianot-32: Alibaba AgentRun no-code Quick Create involves selecting a model, writing a prompt, and configuring tools and a sandbox.
- cossiz-59: AgentRun unit prices are unconfirmed; no public rate card found.
- pre-84: AgentRun is a serverless agent runtime providing full lifecycle management.
- pre-92: AgentRun's only international endpoint is Singapore.

Page: https://www.alibabacloud.com/help/en/open-search/search-platform/getting-started/ai-getting-started
- userev-7: AI Search Open Platform is available only in China (Shanghai) and Germany (Frankfurt) regions.
- useser-10: AI Search Open Platform is available only in China (Shanghai) and Germany (Frankfurt) regions.
- pre-88: AI Search Open Platform is documented for Shanghai and Frankfurt regions only.

Page: https://www.alibabacloud.com/help/en/model-studio/explicit-cache-guide
- cossiz-29: Explicit cache creation is billed at 125% of standard input price.
- cossiz-30: Explicit cache hits are billed at 10% of standard input price.
- cossiz-31: Explicit cache TTL is 5 minutes and auto-renews on each hit.

Page: https://www.alibabacloud.com/help/en/model-studio/savings-plan-and-resource-package
- userev-23: Savings plans / Token Plan do not cover tool calls, context cache, batch inference, fine-tuning or model deployment.
- pre-36: Savings plans offer tiered discounts for committing monthly spend over 3, 6, 12, or 24 months.

Page: https://www.alibabacloud.com/help/en/agentloop/product-overview/what-is-agentloop
- useope-43: AgentLoop international region is Hong Kong.
- useope-42: AgentLoop provides full-stack observability, auditing, evaluation, and experimentation for agents.

Page: https://www.alibabacloud.com/help/en/model-studio/rag-knowledge-base
- useser-3: Model Studio knowledge base access is restricted to accounts that created Singapore applications before April 21, 2025.
- pre-22: Model Studio knowledge bases split files into chunks and vectorise them.

Page: https://qwen.readthedocs.io/en/latest/getting_started/concepts.html
- cossiz-14: Qwen tokenizer estimates 1 token ≈ 3–4 characters for English text.
- cossiz-15: Qwen tokenizer estimates 1 token ≈ 1.5–1.8 characters for Chinese text.

Page: https://docs.modelstudio.console.alibabacloud.com/en/model-studio/data-retention-policy
- pre-30: Model Studio defines a data retention policy where prompts/responses are retained for no longer than 30 days unless legally required.
- pre-31: ZDR-enabled workspaces change retention behavior for ZDR-supported models, while non-ZDR models fall back to standard policy.

Page: https://www.alibabacloud.com/help/en/maxcompute/purchasing-and-using-the-maxcompute-ai-inference-service
- userev-27: MaxCompute model computing service is available internationally only in Singapore.

Page: https://www.aidge.com/develop
- userev-31: Aidge Text Translation is listed at $15.00 per million characters.

Page: https://schinderlawfirm.com/blog/sanctions-and-compliance-with-indonesias-personal-data-protection-law-uu-pdp-by-october-16-2024/
- userev-62: Indonesia PDP Law sanctions are fully enforceable from 16 Oct 2024 with fines up to 2% of annual revenue.

Page: https://securiti.ai/thailand-cross-border-personal-data-transfer-overview/
- userev-63: Thailand PDPA transfers require explicit consent or BCRs as no adequacy-designated countries exist to date.

Page: https://www.alibabacloud.com/help/en/aidge/interface-overview/
- userev-30: Aidge (Alibaba International Digital Commerce) supports 100+ language pairs for multimodal translation.

Page: https://www.gartner.com/en/newsroom/press-releases/2026-07-28-gartner-predicts-ai-agents-will-outnumber-sellers-10-to-1-by-2028-yet-fewer-than-40-percent-of-sellers-will-say-agents-improved-productivity
- userev-36: Gartner predicts AI agents will outnumber sellers 10:1 by 2028.

Page: https://www.yotpo.com/blog/ai-review-summary/
- userev-46: Yotpo reports brands enabling AI Review Summary see a 5.4% increase in conversion.

Page: https://www.alibabacloud.com/help/doc-detail/3049222.html
- useope-5: AgentRun's only international endpoint for core services is Singapore (ap-southeast-1).

Page: https://www.alibabacloud.com/blog/announcing-dataworks-data-agent-meet-your-ai-agent-for-data_603187
- useope-39: DataWorks Data Agent is Generally Available (GA).

Page: https://help.aliyun.com/en/lingma/code-review-agent
- useope-49: Qoder Code Review Agent docs are marked China site only.

Page: https://www.alibabacloud.com/help/en/functioncompute/trigger-overview
- useope-26: Function Compute triggers include HTTP, timer, OSS, CloudMonitor, ActionTrail, MNS, and EventBridge.

Page: https://www.alibabacloud.com/help/en/pai/deploy-an-llm/
- useope-35: PAI-EAS supports one-click LLM deployment for Qwen and DeepSeek models.

Page: https://help.aliyun.com/en/agentrun/open-service-area
- useser-9: AgentRun international endpoint is available only in Singapore (ap-southeast-1).

Page: https://www.alibabacloud.com/en/product/agentbay?_p_lc=1
- useser-16: AgentBay is deployed in the Singapore region.

Page: https://www.alibabacloud.com/help/en/tablestore/memory-storage-service-sub-product-test/news-and-announcements
- useser-31: Tablestore Memory Storage is available in China (Shanghai), China (Shenzhen), China (Hong Kong), and Singapore regions.

Page: https://www.facebook.com/alibabacloud/posts/qwen38-flash-is-now-available-in-the-european-union-on-alibaba-cloud-model-studi/1582315680607185/
- useser-35: qwen3.8-flash pricing is $0.15 per 1M input tokens and $0.47 per 1M output tokens.

Page: https://ideas.repec.org/p/nbr/nberwo/35620.html
- useser-73: A Khan Academy NBER RCT found assignment raises math achievement by 1.3 national percentile ranks per term.

Page: https://www.dlapiperdataprotection.com/index.html?t=law&c=TH
- useser-78: Thailand's PDPA came into full force on June 1, 2022.

Page: https://www.klarna.com/international/press/klarna-ai-assistant-handles-two-thirds-of-customer-service-chats-in-its-first-month/
- useser-50: Klarna reported its AI assistant handled 2.3 million conversations in its first month, equivalent to the work of 700 FTEs.

Page: https://claude.com/customers/lyft
- useser-53: Lyft reported an 87% reduction in average resolution time using Claude via Bedrock.

Page: https://www.aboutamazon.com/news/retail/amazon-rufus-ai-assistant-personalized-shopping-features
- useser-68: Amazon Rufus users are over 60% more likely to make a purchase during their shopping trip.

Page: https://learn.microsoft.com/en-za/answers/questions/5934023/will-azure-ai-agents-sdk-foundry-agent-service-cla
- dianot-3: Foundry Agent Service classic is deprecated with a retirement date of 2027-03-31 (unconfirmed on official lifecycle page).

Page: https://help.aliyun.com/en/model-studio/workflow/agent-create-node
- dianot-28: Alibaba Model Studio includes an Agent Creation node that natively supports tool invocation and knowledge base configuration.

Page: https://help.aliyun.com/en/model-studio/workflow/memory-node
- dianot-31: Alibaba Model Studio includes a Memory node that adds and retrieves memories on a memory store within a workflow.

Page: https://docs.flowiseai.com/using-flowise/agentflowv2
- dianot-21: Flowise Agent nodes allow the LLM to dynamically choose a tool.

Page: https://learn.microsoft.com/en-us/microsoft-copilot-studio/prompt-model-availability
- dianot-24: Microsoft Copilot Studio sets the generative model at the agent level, with availability varying by region.

Page: https://click.alibabacloud.com/m/20000002957/
- cossiz-2: qwen3.8-max price in International scope (Singapore) is $2.00 input / $6.00 output with cache-hit input at $0.25.

Page: https://www.alibabacloud.com/help/en/model-studio/deep-thinking
- cossiz-16: Thinking content is billed as Output Tokens on Model Studio.

Page: https://www.alibabacloud.com/help/en/api-gateway/cloud-native-api-gateway/product-overview/billing-overview
- cossiz-49: Cloud-native API Gateway instance price example is USD 0.291 per hour.

Page: https://www.alibabacloud.com/help/en/direct-mail/billing-methods
- cossiz-53: Direct Mail price is USD 0.29 per 1,000 emails.

Page: https://platform.claude.com/docs/en/build-with-claude/prompt-caching
- cossiz-33: Anthropic prompt caching write is 1.25x base input for 5-min TTL.

Page: https://arxiv.org/abs/2305.05176
- cossiz-36: FrugalGPT matches best single LLM with up to 98% cost reduction.

Page: https://www.alibabacloud.com/help/en/model-studio/mcp
- pre-24: Model Studio supports MCP servers.

Page: https://github.com/QwenLM/Qwen3.8
- pre-42: Qwen3.8 is published under the Apache 2.0 license.

Page: https://www.gartner.com/en/articles/genai-project-failure
- pre-8: Gartner reported that more than 50% of GenAI projects were abandoned after PoC by end-2025.

Page: https://docs.aws.amazon.com/wellarchitected/latest/generative-ai-lens/generative-ai-lifecycle.html
- pre-19: The AWS Well-Architected Generative AI Lens lifecycle lists scoping as the first phase.
