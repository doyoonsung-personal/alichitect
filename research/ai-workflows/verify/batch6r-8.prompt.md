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

Page: https://www.alibabacloud.com/help/en/model-studio/qwen-plus
- pre-67: qwen-plus is priced at $0.115 / 1M input tokens and $0.287 / 1M output tokens.
- pre-68: qwen-plus thinking mode output is priced at $1.147 / 1M tokens.

Page: https://www.alibabacloud.com/help/en/agentcore/agentteams-has-been-migrated-to-agentcore
- useope-10: AgentTeams has been migrated into AgentCore.

Page: https://www.alibabacloud.com/help/en/model-studio/cosyvoice-v3-plus
- useser-41: cosyvoice-v3-plus pricing is $0.26 per 10,000 characters for Singapore/International scope.

Page: https://www.coze.com/open/docs/guides/workflow_limits
- dianot-63: Coze limits workflows to 1000 nodes.

Page: https://www.lmsys.org/blog/2024-07-01-routellm/
- cossiz-37: RouteLLM achieves >85% cost reduction on MT Bench at matched quality.

Page: https://www.alibabacloud.com/help/en/model-studio/explicit-cache-guide
- cossiz-29: Explicit cache creation is billed at 125% of standard input price.
- cossiz-30: Explicit cache hits are billed at 10% of standard input price.
- cossiz-31: Explicit cache TTL is 5 minutes and auto-renews on each hit.

Page: https://schinderlawfirm.com/blog/sanctions-and-compliance-with-indonesias-personal-data-protection-law-uu-pdp-by-october-16-2024/
- userev-62: Indonesia PDP Law sanctions are fully enforceable from 16 Oct 2024 with fines up to 2% of annual revenue.

Page: https://www.alibabacloud.com/help/en/functioncompute/trigger-overview
- useope-26: Function Compute triggers include HTTP, timer, OSS, CloudMonitor, ActionTrail, MNS, and EventBridge.

Page: https://www.klarna.com/international/press/klarna-ai-assistant-handles-two-thirds-of-customer-service-chats-in-its-first-month/
- useser-50: Klarna reported its AI assistant handled 2.3 million conversations in its first month, equivalent to the work of 700 FTEs.

Page: https://click.alibabacloud.com/m/20000002957/
- cossiz-2: qwen3.8-max price in International scope (Singapore) is $2.00 input / $6.00 output with cache-hit input at $0.25.

Page: https://www.gartner.com/en/articles/genai-project-failure
- pre-8: Gartner reported that more than 50% of GenAI projects were abandoned after PoC by end-2025.

Page: https://help.aliyun.com/en/model-studio/flow-agent-introduction
- dianot-10: Model Studio documents a 'Flow Agent' visual platform with Agent Creation, Agent Group and Memory nodes, marked as China site only.
- dianot-11: Singapore availability of Model Studio Flow Agent is unconfirmed.

Page: https://www.conveyor.com/ai-agents-for-security-reviews
- userev-39: Conveyor markets its security questionnaire agent at 98% accuracy.

Page: https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/non-template-messages
- useser-19: From October 1, 2026, Meta charges per-message fees for utility/service messages inside the WhatsApp 24-hour window.

Page: https://docs.cloud.google.com/release-notes
- dianot-5: Google renamed 'Vertex AI Agent Designer' to 'Workflow Builder' and it is generally available (GA) in Gemini Enterprise.

Page: https://www.alibabacloud.com/help/en/milvus/product-overview/billing-item
- cossiz-58: Milvus Vector Retrieval Service unit prices are unconfirmed from public pages.

Page: https://www.alibabacloud.com/help/en/model-studio/single-agent-application
- userev-1: No-code agent/workflow apps and knowledge base in Model Studio are limited to accounts that created Singapore applications before April 21, 2025.
- useope-4: Model Studio no-code agent/workflow apps and knowledge bases are limited to accounts that created Singapore apps before 2025-04-21.
- useser-1: Model Studio agent apps are restricted to accounts that created Singapore applications before April 21, 2025.
- dianot-73: Alibaba Model Studio workflow applications support Singapore region endpoints but restrict API calls to accounts created before April 21, 2025.

Page: https://www.alibabacloud.com/help/en/model-studio/qwen-flash
- pre-69: qwen-flash is priced at $0.022 / 1M input tokens and $0.216 / 1M output tokens.
- pre-70: qwen-flash implicit-cache input is priced at $0.005 / 1M tokens.

Page: https://www.alibabacloud.com/help/en/model-studio/qwen3-rerank
- useope-18: qwen3-rerank and qwen3-vl-rerank are priced between $0.069–$0.10 per 1M text input, but the specific Singapore price is unconfirmed.

Page: https://elaw.klri.re.kr/eng_service/lawView.do?hseq=62389&lang=ENG
- useser-59: Korea's PIPA Article 37-2 grants data subjects the right to refuse fully automated decisions.

Page: https://docs.dify.ai/en/cloud/use-dify/nodes/trigger/overview
- dianot-17: Dify defines a Trigger as a type of Start node that runs workflows automatically on a schedule or in response to events.

Page: https://www.reuters.com/legal/litigation/alibaba-wins-injunction-against-pentagon-contract-restrictions-tied-china-2026-10-27/
- pre-6: Alibaba won a preliminary injunction limiting US government denial of Pentagon contracts tied to the 1260H listing on October 26, 2026.
