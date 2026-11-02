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

Page: https://docs.aws.amazon.com/general/latest/gr/bedrock.html
- dianot-44: AWS Bedrock Flows quota limits condition nodes to 5 per flow.
- dianot-45: AWS Bedrock Flows quota limits collector nodes to 1 per flow.
- dianot-46: AWS Bedrock Flows quota limits agent nodes to 20 per flow.

Page: https://www.tilleke.com/insights/a-closer-look-at-vietnams-new-ai-law-what-it-means-for-ai-businesses/
- userev-61: Vietnam AI Law No. 134/2025/QH15 is effective 1 Mar 2026, being the first standalone binding AI law in Southeast Asia.

Page: https://www.alibabacloud.com/help/en/eventbridge/product-overview/what-is-eventbridge
- useope-25: EventBridge rules can trigger Function Compute, RocketMQ, and DingTalk.

Page: https://aws.amazon.com/blogs/architecture/automating-agentic-ai-well-architected-reviews-with-the-aws-agentic-ai-lens/
- useser-47: AWS Well-Architected Agentic AI Lens contains 150 best practices across 41 questions.

Page: https://docs.dify.ai/en/cloud/use-dify/nodes/variable-aggregator
- dianot-37: Dify Variable Aggregator is designed for exclusive branches and does not combine outputs from multiple parallel paths.

Page: https://www.scmp.com/news/us/article/3372356/alibaba-wins-preliminary-injunction-against-pentagon-lobbying-rule
- pre-7: SCMP reports that the designation of Alibaba as a Chinese military company was left intact despite the injunction.

Page: https://www.alibabacloud.com/help/en/model-studio/rag-knowledge-base
- useser-3: Model Studio knowledge base access is restricted to accounts that created Singapore applications before April 21, 2025.
- pre-22: Model Studio knowledge bases split files into chunks and vectorise them.

Page: https://www.gartner.com/en/newsroom/press-releases/2026-07-28-gartner-predicts-ai-agents-will-outnumber-sellers-10-to-1-by-2028-yet-fewer-than-40-percent-of-sellers-will-say-agents-improved-productivity
- userev-36: Gartner predicts AI agents will outnumber sellers 10:1 by 2028.

Page: https://www.alibabacloud.com/en/product/agentbay?_p_lc=1
- useser-16: AgentBay is deployed in the Singapore region.

Page: https://learn.microsoft.com/en-za/answers/questions/5934023/will-azure-ai-agents-sdk-foundry-agent-service-cla
- dianot-3: Foundry Agent Service classic is deprecated with a retirement date of 2027-03-31 (unconfirmed on official lifecycle page).

Page: https://www.alibabacloud.com/help/en/direct-mail/billing-methods
- cossiz-53: Direct Mail price is USD 0.29 per 1,000 emails.

Page: https://www.alibabacloud.com/help/en/model-studio/qwen3-8-max
- useope-2: The qwen3.8-max model card shows a price of $1.65 input / $4.951 output, which corresponds to the Global deployment scope.
- useope-13: qwen3.8-max has a 1M context window, thinking mode, and full tool ecosystem support.
- useser-11: The dedicated qwen3.8-max model page lists an alternative price of Input $1.65 / Output $4.951 per 1M tokens.
- cossiz-3: qwen3.8-max price in Global scope (US Virginia) is $1.65 input / $4.951 output with implicit cache at $0.206.

Page: https://www.alibabacloud.com/blog/model-studio-token-plan-for-individual-one-subscription-for-every-ai-model-up-to-3x-more-value_603426
- userev-22: Token Plan for Individual starts at $6/month early-bird.

Page: https://www.alibabacloud.com/en/press-room/acs-for-international-customers-to-revolutionize?_p_lc=1
- useope-33: ACS serverless K8s became available for international customers since January 2025.

Page: https://www.henson-legal.com/ai-voice-compliance
- useser-64: The FCC treats AI-generated voice as an 'artificial voice' under TCPA, requiring one-to-one consent since January 27, 2025.

Page: https://docs.langchain.com/oss/python/langgraph/graph-api
- dianot-19: LangGraph nodes and edges are functions that can contain an LLM or code, rather than distinct primitive types for every action.

Page: https://www.datacenterdynamics.com/en/news/alibaba-cloud-plans-new-cloud-regions-in-turkey-finland-the-netherlands/
- pre-12: Alibaba Cloud plans to open its first cloud regions in Türkiye, Finland, and the Netherlands within 12 months.

Page: https://www.alibabacloud.com/help/en/chatapp/product-overview/chatapp-message-service-pricing
- userev-29: LINE messages via Chat App Message Service are currently free of message fees.
- useser-25: CAMS platform service fee is USD 0.005 per message for paid channels, while Facebook Messenger, Instagram DMs, Telegram, and LINE are currently free.

Page: https://github.com/QwenLM/Qwen3-TTS
- userev-89: Qwen3-TTS covers 10 languages including Japanese and Korean.

Page: https://www.alibabacloud.com/help/en/sls/copilot-automatic-generation-of-ai-assisted-sql-statements
- useope-40: SLS Copilot enables NL→SQL over logs.

Page: https://fpf.org/blog/south-korea-the-first-case-where-the-personal-information-protection-act-was-applied-to-an-ai-system/
- useser-60: The Personal Information Protection Commission (PIPC) sanctioned the 'Iruda' chatbot for indiscriminate personal information processing.

Page: https://www.alibabacloud.com/help/en/functioncompute/pay-as-you-go-of-fc-agent-sandbox
- cossiz-40: FC Agent Sandbox disk price is 0.00025308 USD/GiB/hour outside mainland China.

Page: https://www.alibabacloud.com/help/en/model-studio/dtu-model-deployment
- pre-27: DTU model deployment provides throughput guarantee and low latency.
