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

Page: https://www.alibabacloud.com/help/en/model-studio/single-agent-application
- userev-1: No-code agent/workflow apps and knowledge base in Model Studio are limited to accounts that created Singapore applications before April 21, 2025.
- useope-4: Model Studio no-code agent/workflow apps and knowledge bases are limited to accounts that created Singapore apps before 2025-04-21.
- useser-1: Model Studio agent apps are restricted to accounts that created Singapore applications before April 21, 2025.
- dianot-73: Alibaba Model Studio workflow applications support Singapore region endpoints but restrict API calls to accounts created before April 21, 2025.

Page: https://www.alibabacloud.com/help/en/model-studio/what-is-model-studio
- userev-3: Model Studio international regions include Singapore, Virginia, Frankfurt, Tokyo, and Hong Kong, but not Seoul.
- useope-11: Model Studio serves third-party models including DeepSeek, Kimi, and GLM internationally.
- useser-4: Model Studio international regions include Singapore, Virginia, Frankfurt, Tokyo, and Hong Kong, but not Seoul.
- pre-2: Model Studio regions include Beijing, Virginia, Singapore, Tokyo, Frankfurt, and Hong Kong.

Page: https://www.alibabacloud.com/help/en/model-studio/application-introduction
- useser-2: Model Studio workflow apps are restricted to accounts that created Singapore applications before April 21, 2025.
- pre-1: Model Studio applications in the Singapore region created before April 21, 2025 are restricted to calls from users who created them prior to that date.
- pre-80: For new international accounts, Model Studio's no-code agent and workflow applications are not callable.

Page: https://www.alibabacloud.com/help/en/chatapp/product-overview/chatapp-message-service-pricing
- userev-29: LINE messages via Chat App Message Service are currently free of message fees.
- useser-25: CAMS platform service fee is USD 0.005 per message for paid channels, while Facebook Messenger, Instagram DMs, Telegram, and LINE are currently free.

Page: https://www.alibabacloud.com/help/en/agentrun/open-platform-introduction.md
- useope-6: AgentRun Open Platform is available in China (Hong Kong) and Singapore.
- cossiz-27: AgentRun offers a cost-saving mode and Token quotas.

Page: https://www.alibabacloud.com/help/en/model-studio/privacy-notice
- useope-23: Model Studio never uses customer data for model training and has a SOC 2 report available.
- pre-118: Alibaba Cloud privacy notice states Alibaba Cloud will never use customer data for model training.

Page: https://artificialintelligenceact.eu/article/50/
- useser-20: EU AI Act Article 50 transparency obligations have been applicable since August 2, 2026.
- pre-75: EU AI Act Article 50 transparency obligations apply from August 2, 2026.

Page: https://www.alibabacloud.com/en/about/gartner-scps-2026?_p_lc=1
- pre-16: Alibaba Cloud was named a Leader in the 2026 Gartner MQ for Strategic Cloud Platform Services.
- pre-17: Alibaba Cloud is described as the only Chinese and only Asia-Pacific provider in the Leaders quadrant of the 2026 Gartner MQ for Strategic Cloud Platform Services.

Page: https://www.alibabacloud.com/help/en/model-studio/qwen-flash
- pre-69: qwen-flash is priced at $0.022 / 1M input tokens and $0.216 / 1M output tokens.
- pre-70: qwen-flash implicit-cache input is priced at $0.005 / 1M tokens.

Page: https://aicura.app/frameworks/korea-pipa-automated-decisions/
- userev-57: South Korea PIPA Article 37-2 allows data subjects to refuse fully automated decisions affecting their rights.

Page: https://www.legal500.com/intelligence/south-korea/privacy/amendments-to-koreas-personal-information-protection-act-turnover-based-fines-ceo-accountability-and-earlier-breach-notification
- userev-58: Amended South Korea PIPA introduces administrative fines up to 10% of total revenue.

Page: https://github.com/QwenLM/Qwen3-TTS
- userev-89: Qwen3-TTS covers 10 languages including Japanese and Korean.

Page: https://www.alibabacloud.com/blog/qwen-audio-3-0-tts-more-multilingual-easier-to-direct_603379
- userev-90: Qwen-Audio-3.0-TTS preset voices span 16 languages.

Page: https://www.responsive.io/product/ai
- userev-41: Responsive claims responses are 80% faster.

Page: https://tribble.ai/blog/rfp-response-time-ai-agents/
- userev-42: Tribble.ai states average enterprise RFP takes 20 to 30 hours of cumulative effort.

Page: https://www.alibabacloud.com/help/en/model-studio/embedding
- useope-17: Embedding prices range from $0.036/$0.072 to $0.09 depending on model and scope, requiring console verification.

Page: https://www.alibabacloud.com/help/en/model-studio/qwen3-rerank
- useope-18: qwen3-rerank and qwen3-vl-rerank are priced between $0.069–$0.10 per 1M text input, but the specific Singapore price is unconfirmed.

Page: https://www.kimchang.com/en/insights/detail.kc?sch_section=4&idx=29898
- useope-71: Korea PIPA Art. 37-2 gives data subjects the right to refuse fully automated decisions with material impact.

Page: https://www.kimchang.com/en/insights/detail.kc?sch_section=4&idx=33805
- useope-72: Korea's AI Basic Act took effect on 22 Jan 2026.

Page: https://www.alibabacloud.com/help/en/sls/copilot-automatic-generation-of-ai-assisted-sql-statements
- useope-40: SLS Copilot enables NL→SQL over logs.

Page: https://www.alibabacloud.com/en/product/ai_guardrails?_p_lc=1
- useope-44: AI Guardrails (formerly Content Moderation) can be activated one-click through Model Studio and integrates with AI Gateway and WAF.

Page: https://help.aliyun.com/en/model-studio/workflow/parameter-extraction-node
- useser-23: Model Studio Parameter Extractor node is available on the China site only.

Page: https://developers.kakao.com/docs/en/kakaotalk-channel/rest-api
- useser-26: KakaoTalk is not supported by Alibaba Cloud CAMS and requires Kakao's own API or a CPaaS.

Page: https://whatsappbusiness.com/policy/
- useser-56: WhatsApp policy requires automation to provide prompt, clear, and direct escalation paths during the 24-hour window.

Page: https://elaw.klri.re.kr/eng_service/lawView.do?hseq=62389&lang=ENG
- useser-59: Korea's PIPA Article 37-2 grants data subjects the right to refuse fully automated decisions.

Page: https://www.gov.ca.gov/2026-09-10/governor-newsom-signs-the-strongest-child-safety-chatbot-and-social-media-laws-in-the-nation/
- useser-102: Newsom signed further child-safety chatbot laws in California on September 10, 2026.

Page: https://www.imda.gov.sg/about-imda/emerging-technologies-and-research/artificial-intelligence
- useser-22: Singapore published the Model AI Governance Framework for Agentic AI v1.0 in January 2026 and v1.5 in May 2026.

Page: https://fpf.org/blog/south-korea-the-first-case-where-the-personal-information-protection-act-was-applied-to-an-ai-system/
- useser-60: The Personal Information Protection Commission (PIPC) sanctioned the 'Iruda' chatbot for indiscriminate personal information processing.

Page: https://www.daily.co/blog/advice-on-building-voice-ai-in-june-2025/
- useser-61: Target voice-to-voice latency for AI agents is approximately 800 ms median.

Page: https://www.alibabacloud.com/help/en/pai/product-overview/pai-langstudio-feature-retirement-and-migration-guide
- dianot-8: Alibaba PAI-LangStudio will be retired on March 9, 2027 at 16:00.

Page: https://www.alibabacloud.com/help/en/pai/create-a-code-based-application
- dianot-9: Users can migrate LangStudio workflow apps to Model Studio workflow apps, but the Model Studio DSL cannot directly import the LangStudio flow.

Page: https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/tools-agent
- dianot-16: n8n Memory sub-nodes do not persist between sessions.

Page: https://docs.dify.ai/en/cloud/use-dify/nodes/trigger/overview
- dianot-17: Dify defines a Trigger as a type of Start node that runs workflows automatically on a schedule or in response to events.

Page: https://www.alibabacloud.com/help/en/agentrun/knowledge-base-integration-guide
- dianot-33: Alibaba AgentRun supports knowledge base integration with Model Studio and RAGFlow.

Page: https://www.alibabacloud.com/help/en/pai/node-reference
- dianot-34: Alibaba PAI-LangStudio node families include flow control, LLMs, agents, data retrieval, document parsing, speech recognition, and Python.

Page: https://www.alibabacloud.com/help/en/functioncompute/pay-as-you-go-of-fc-agent-sandbox
- cossiz-40: FC Agent Sandbox disk price is 0.00025308 USD/GiB/hour outside mainland China.

Page: https://www.alibabacloud.com/help/en/agent-sandbox/product-overview/billing-overview
- cossiz-41: Agent Sandbox reference price in Chinese mainland Economy class is USD 0.0000026/vCPU·second.

Page: https://www.cloudzero.com/blog/ai-agent-cost/
- cossiz-19: CloudZero reports a support-resolution example costing $0.132 per task with 12 calls.

Page: https://arxiv.org/abs/2604.22750
- cossiz-20: An arXiv study found agentic coding tasks average 4.17M tokens with input:output ratio of 154:1.

Page: https://media.defense.gov/2026/Jun/08/2003945537/-1/-1/1/ENTITIES-IDENTIFIED-AS-CHINESE-MILITARY-COMPANIES-OPERATING-IN-THE-UNITED-STATES-IN-ACCORDANCE-WITH-SECTION-1260H.PDF
- pre-4: The US DoD added Alibaba to the Section 1260H 'Chinese military companies' list on June 8, 2026.

Page: https://www.reuters.com/legal/litigation/alibaba-wins-injunction-against-pentagon-contract-restrictions-tied-china-2026-10-27/
- pre-6: Alibaba won a preliminary injunction limiting US government denial of Pentagon contracts tied to the 1260H listing on October 26, 2026.

Page: https://www.alibabacloud.com/en/product/agentcore?_p_lc=1
- pre-85: AgentCore provides build, govern, and execute capabilities for agents.

Page: https://www.alibabacloud.com/help/en/agentloop/faqs
- pre-93: AgentLoop is available internationally only in Hong Kong.

Page: https://www.alibabacloud.com/help/en/model-studio/dtu-model-deployment
- pre-27: DTU model deployment provides throughput guarantee and low latency.

Page: https://docs.cloud.google.com/architecture/choose-design-pattern-agentic-ai-system
- pre-28: Google recommends using the human-in-the-loop pattern for tasks needing oversight, subjective judgement, or final approval.
