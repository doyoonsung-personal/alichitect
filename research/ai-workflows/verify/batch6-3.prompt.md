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

Page: https://www.alibabacloud.com/help/en/model-studio/model-pricing
- userev-9: Qwen-Max (older flagship) is listed at $1.65 per 1M input tokens and $4.95 per 1M output tokens.
- userev-10: qwen-mt-plus is priced at $0.259 per 1M input tokens and $0.775 per 1M output tokens.
- userev-11: qwen-mt-lite is priced at $0.086 per 1M input tokens (output price unconfirmed).
- userev-12: text-embedding-v4 is priced at $0.07 per 1M tokens for International usage.
- userev-13: gte-rerank-v2 is priced at $0.115 per text input.
- userev-14: qwen-audio-3.1-asr-flash is priced at $0.113 per 1M input tokens and $0.382 per 1M output tokens.
- userev-15: qwen-audio-3.0-asr-flash is priced at $0.00003 per second.
- userev-16: Qwen-OCR shows a 1k tier price of $0.002750 per image (other tiers unconfirmed).
- userev-17: qwen-image-2.0 series is priced at $0.10 for 1K, $0.16 for 2K, and $0.24 for 4K images.
- useope-3: qwen3.8-flash is priced at $0.15 input / $0.47 output for the International scope and $0.113/$0.382 for the Global scope.
- useope-20: Batch inference costs 50% of real-time input and output prices where supported.
- useser-5: qwen3.8-max pricing in Singapore is $2 per 1M input tokens and $6 per 1M output tokens.
- useser-36: qwen-plus pricing in Singapore is $0.165 input / $0.99 output per 1M tokens for contexts <=256K.
- useser-37: Qwen-VL pricing in Singapore starts at $0.215 input / $2.15 output per 1M tokens.
- useser-38: text-embedding-v4 pricing is $0.07 per 1M tokens for International scope.
- useser-39: gte-rerank-v2 pricing is $0.115 per 1M text-input tokens.
- useser-40: qwen3-asr-flash-realtime pricing is $0.000047 per second.
- useser-44: Batch and context cache discounts cannot apply simultaneously in Model Studio.
- useser-12: Some Model Studio models use peak/off-peak pricing with busy hours 08:00-22:00 and idle hours 22:00-08:00 (UTC+8).
- cossiz-1: Model Studio's price list is keyed on (model, deployment scope) with values such as International and Global.
- cossiz-4: qwen3.8-flash price in International scope (Singapore) is $0.15 input / $0.47 output with cache-hit input at $0.016.
- cossiz-9: qwen3-rerank price is $0.10 per 1M tokens in the International scope.
- cossiz-13: Batch and cache discounts cannot stack.
- cossiz-10: Tiered models bill the whole request at the tier set by total input tokens of that request.
- pre-66: qwen3.8-max is priced at $2.00 / 1M input tokens and $6.00 / 1M output tokens in Singapore.
- pre-72: There is a discrepancy between aggregate pricing page values ($0.23/$1.434) and per-model qwen-plus page values ($0.115/$0.287).

Page: https://www.microsoft.com/en-us/dynamics-365/blog/it-professional/2025-10-21/sales-research-bench/
- userev-32: Microsoft Sales Research Agent outperformed Claude Sonnet 4.5 by 13 points and ChatGPT-5 by 24.1 points on Sales Bench.

Page: https://tei.forrester.com/go/microsoft/M365Copilot/
- userev-33: Forrester TEI of Microsoft 365 Copilot reports +2.7% qualified opportunities and +2.5% win rate.

Page: https://www.bazaarvoice.com/blog/how-review-syndication-expands-your-reach-and-strengthens-pdp-performance/
- userev-47: Bazaarvoice reports a 144% lift in conversion rate when shoppers engage with reviews.

Page: https://sellercentral.amazon.com/seller-forums/discussions/t/93e24323-36e8-4080-a004-1a1c324be8d0
- userev-48: Amazon states more than 1.3 million sellers have used AI-powered listing tools generating >70% of required attributes.

Page: https://help.aliyun.com/en/sls/sls-mcp-server
- useope-41: SLS MCP server documentation is marked China site only.

Page: https://www.alibabacloud.com/help/en/model-studio/qoder-agent
- useope-46: Qoder is an agentic coding platform connecting to Model Studio.

Page: https://help.aliyun.com/en/cs/user-guide/agent-sandbox/
- useope-30: ACS Agent Sandbox offers MicroVM isolation, hibernation/wake, and checkpoint/clone features, but documentation is marked China site only.

Page: https://www.alibabacloud.com/help/en/ack/cloud-native-ai-suite/use-cases/building-customized-ai-question-and-answer-assistant-based-on-dify
- useope-32: ACK + ack-dify component supports building customized AI Q&A assistants based on Dify.

Page: https://www.alibabacloud.com/blog/alibaba-cloud-launches-qwen-cloud-for-global-markets_603191
- useser-13: Alibaba Cloud launched Qwen Cloud globally from Singapore on May 26, 2026.

Page: https://www.alibabacloud.com/help/en/model-studio/realtime
- useser-15: Qwen-Omni-Realtime speech-to-speech models are supported in Singapore and China (Beijing).

Page: https://www.alibabacloud.com/help/en/tablestore/table-store-service/knowledge-storage-introduction
- useser-32: Tablestore Knowledge Storage Singapore availability is unconfirmed as the documented region list begins with China regions.

Page: https://www.alibabacloud.com/help/en/content-moderation/latest/what-is-ai-security-barrier
- useser-33: AI Guardrails console supports China East 2 (Shanghai), China (Hong Kong), Singapore, Germany (Frankfurt), and US (Virginia) regions.

Page: https://hechingerreport.org/proof-points-khanmigo-math-ai-tutor/
- useser-74: Adding the Khanmigo AI tutor did not improve math performance above Khan Academy practice alone in the NBER RCT.

Page: https://www.hunton.com/privacy-and-cybersecurity-law-blog/california-enacts-companion-chatbot-child-safety-requirements
- useser-76: California SB 243 regulates companion chatbots with child-safety duties including periodic interface-design testing.

Page: https://fin.ai/glossary/resolution-rate
- useser-51: Intercom Fin reports a 76% average resolution rate across more than 12,000 customers.

Page: https://www.salesforce.com/agentforce/metrics/
- useser-52: Salesforce Agentforce reports 62% case resolution and resolved 50% of inquiries autonomously.

Page: https://developers.openai.com/api/docs/guides/agent-builder
- dianot-1: OpenAI Agent Builder is deprecated as of 2026-06-03 and scheduled to shut down on November 30, 2026.

Page: https://learn.microsoft.com/en-us/azure/foundry-classic/concepts/prompt-flow
- dianot-2: Microsoft prompt flow (Azure AI Foundry visual DAG) will be retired on April 20, 2027.

Page: https://help.aliyun.com/en/model-studio/workflow/agent-group-node
- dianot-29: Alibaba Model Studio includes an Agent Group node for coordinating multiple published agents.

Page: https://help.aliyun.com/en/model-studio/workflow/mcp-node
- dianot-30: Alibaba Model Studio workflow nodes include API, Function Compute, Script, Plugin, MCP, AppFlow, Application Component, and Data Connector types.

Page: https://developers.openai.com/api/docs/guides/node-reference
- dianot-22: OpenAI Agent Builder uses a Set State node to write workflow state.

Page: https://discuss.google.dev/t/introducing-vertex-ai-agent-designer-in-agent-builder/299224
- dianot-23: Google ADK Visual Builder pre-wires tools including Google Search, URL context, and Vertex AI Search.

Page: https://artificialanalysis.ai/models/qwen3-7-plus
- cossiz-6: qwen3.7-plus price in International scope is $0.40 input / $1.60 output.

Page: https://www.alibabacloud.com/help/en/model-studio/qwen3-7-plus
- cossiz-7: qwen3.7-plus price in Global scope is $0.276 input / $1.101 output with batch input at $0.143.

Page: https://www.alibabacloud.com/en/product/log-service/pricing
- cossiz-50: Simple Log Service read/write traffic price is USD 0.045/GB.

Page: https://www.alibabacloud.com/help/en/eventbridge/product-overview/billing-of-event-buses
- cossiz-52: EventBridge price is USD 0.82 per 1M published events.

Page: https://developers.openai.com/api/docs/guides/prompt-caching
- cossiz-34: OpenAI prompt caching discounted cached-input rate is up to 95% off.

Page: https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/context-cache/context-cache-overview
- cossiz-35: Google Gemini 2.5+ has a 90% discount on cached tokens.

Page: https://www.alibabacloud.com/help/en/model-studio/model-deployment-introduction
- pre-26: Model Studio dedicated deployment reserves TPM capacity with no rate limiting.

Page: https://www.alibabacloud.com/help/en/model-studio/batch-interfaces-compatible-with-openai
- pre-41: Model Studio offers OpenAI-compatible APIs, including the Batch interface.

Page: https://digital-strategy.ec.europa.eu/en/policies/cloud-computing
- pre-11: The EU Commission adopted a proposal for a Cloud and AI Development Act (CADA) in June 2026.

Page: https://docs.aws.amazon.com/prescriptive-guidance/latest/gen-ai-lifecycle-operational-excellence/dev-architecting.html
- pre-18: AWS guidance states that a PoC must validate business value, data readiness, technical feasibility, and risk mitigation.
