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

Page: (no URL cited)
- useope-27: No managed inbound email ingestion service was found for Alibaba Cloud international regions; customers must wire external webhooks.
- pre-10: It is unconfirmed whether Alibaba/Qwen becomes a 'covered AI company' under NDAA Section 1532 following the 1260H designation.
- pre-32: The specific list of models supporting Zero Data Retention (ZDR) is unconfirmed at the product-doc level.
- pre-91: No managed Alibaba Cloud 'human approval inbox' product was found; this is unconfirmed.
- pre-94: Model Studio PrivateLink is available in Beijing and Hong Kong.

Page: https://www.alibabacloud.com/help/en/model-studio/batch-inference
- userev-19: Batch inference prices both input and output tokens at 50% of the real-time inference price.
- useser-42: Batch inference in Model Studio costs 50% of the real-time price for both input and output.
- cossiz-12: Batch inference is priced at 50% of real-time price.
- pre-34: Batch inference in Model Studio costs 50% of the real-time price.

Page: https://www.alibabacloud.com/help/en/direct-mail/product-overview/limits
- userev-24: DirectMail has an initial daily quota of 2,000 emails, adjusted by sender reputation.
- useser-27: DirectMail has an initial daily quota of 2,000 emails.

Page: https://www.alibabacloud.com/help/en/oss/storage-fees
- userev-26: OSS Standard LRS storage is priced at $0.0173 per GB-month with 0–5GB free.
- cossiz-51: OSS Standard LRS storage price is USD 0.0173/GB-month.

Page: https://www.alibabacloud.com/help/en/agentcore/agentcore-product-overview
- useope-8: AgentCore is a separate product with Building, Governance, and Execution layers supporting multi-agent and human-in-the-loop collaboration.
- useser-14: AgentCore is available in the Singapore (ap-southeast-1) region.

Page: https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen3-8-flash
- useope-12: qwen3.8-flash supports multimodal inputs and has a native 1M-token context window.
- cossiz-5: qwen3.8-flash price in Global scope (US Virginia) is $0.113 input / $0.382 output with implicit cache at $0.014.

Page: https://www.alibabacloud.com/help/en/model-studio/rate-limit
- cossiz-26: Model Studio limits are applied by RPM and TPM at the primary-account level.
- pre-20: Model Studio rate limits are defined by RPM/TPM and reject requests with HTTP 429 upon breach.

Page: https://www.anthropic.com/research/multi-agent-research-system
- cossiz-21: Agents use approximately 4x more tokens than chat interactions according to Anthropic.
- cossiz-22: Multi-agent systems use approximately 15x more tokens than chat interactions according to Anthropic.

Page: https://qwen.ai/blog?id=qwen3.8-flash-next
- userev-8: qwen3.8-flash is priced at $0.15 per 1M input tokens and $0.47 per 1M output tokens.

Page: https://www.alibabacloud.com/blog/wan3-0-30-second-ai-video-generation-from-any-input_603452
- userev-18: wan3.0-video is priced at $0.05/s for 480P and $0.10/s for 720P; a 30-second 1080P clip costs $6.00.

Page: https://fpf.org/blog/south-koreas-new-ai-framework-act-a-balancing-act-between-innovation-and-regulation/
- userev-56: South Korea AI Basic Act is effective 22 Jan 2026, requiring notification and labelling for generative AI outputs.

Page: https://www.pdpc.gov.sg/organisations/regulations-decisions/regulatory-guidance/advisory-guidelines-on-use-of-personal-data-in-generative-ai
- userev-59: Singapore PDPC Advisory Guidelines on Use of Personal Data in Generative AI were issued 20 Jul 2026.

Page: https://www.alibabacloud.com/help/en/model-studio/machine-translation
- userev-87: Qwen-MT covers 92 languages including Chinese, English, Japanese, Korean, French, Spanish, German, Thai, Indonesian, Vietnamese, and Arabic.

Page: https://qwen.ai/blog?id=qwen3asr
- userev-91: Open Qwen3-ASR covers 30 languages and 22 Chinese dialects.

Page: https://www.nfold.com/wp-content/uploads/2024/11/Forrester-Loopio-report-2023.pdf
- userev-40: Forrester TEI of Loopio reports benefits PV $6.05M, NPV $4.74M, and ROI 415%.

Page: https://www.workmate.com/blog/ai-agents-for-proposal-teams-rfp-volume-is-up-headcount-isnt
- userev-43: Workmate blog cites Loopio survey finding proposal submissions up 9% with team size flat at 8.

Page: https://www.alibabacloud.com/help/en/model-studio/qwen3-5-ocr
- useope-15: qwen3.5-ocr is priced at $0.069 input / $0.275 output per 1M tokens.

Page: https://www.alibabacloud.com/help/en/agentbay/product-overview/what-is-eds-agentbay
- useope-31: AgentBay provides browser/desktop automation and is deployed in Singapore.

Page: https://www.nyc.gov/site/dca/about/automated-employment-decision-tools.page
- useope-67: NYC Local Law 144 requires an independent bias audit within the last year for automated employment decision tools.

Page: https://support.atlassian.com/customer-service-management/docs/manage-usage-for-ai-agent-resolutions/
- useope-96: Atlassian charges $1.00 per AI agent resolution with a system limit of 250,000 resolutions/month.

Page: https://www.alibabacloud.com/help/en/api-gateway/ai-gateway/user-guide/mcp-gateway-management
- useope-38: AI Gateway acts as a unified proxy for LLM APIs and MCP servers with MCP gateway management.

Page: https://www.alibabacloud.com/en/product/directmail/pricing?_p_lc=1
- useope-45: DirectMail supports transactional, notification, and batch email with per-email billing.

Page: https://www.trade.gov/market-intelligence/south-korea-ai-basic-act
- useser-21: Korea's AI Basic Act took effect on January 22, 2026.

Page: https://help.aliyun.com/en/vms/product-overview/what-is-voice-service
- useser-28: Voice Service (VMS) is deployed in the Singapore region but China-site docs state it does not support outbound international calls.

Page: https://www.bbc.com/travel/article/20240222-air-canada-chatbot-misinformation-what-travellers-should-know
- useser-54: In Moffatt v. Air Canada, the BC Civil Resolution Tribunal awarded $812.02 in damages for chatbot misinformation.

Page: https://dialzara.com/blog/call-recording-laws-ai-agents-by-state
- useser-63: In the US, 12 states including California and Florida require all-party consent for call recording.

Page: https://www.alibabacloud.com/solutions/retail
- useser-96: Alibaba fully connected its Qwen App to Taobao's entire product catalog.

Page: https://docs.mozilla.ai/any-guardrail/api-reference/index/content-safety/qwen3-guard-stream
- useser-34: Qwen3Guard covers up to 119 languages.

Page: https://www.thelec.net/news/articleView.html?idxno=11367
- useser-58: Kakao has embedded ChatGPT directly into KakaoTalk chat rooms.

Page: https://modal.com/blog/decagon-case-study
- useser-62: Decagon Voice 2.0 reports a 65% reduction in latency compared to previous versions.

Page: https://github.com/google/adk-python/blob/main/.agents/skills/adk-agent-builder/references/multi-agent.md
- dianot-7: Google ADK has deprecated SequentialAgent, ParallelAgent, and LoopAgent in favor of a graph-based Workflow engine.

Page: https://www.alibabacloud.com/help/en/model-studio/workflow-application
- dianot-12: Only users who created Alibaba Cloud Model Studio applications in the Singapore region before April 21, 2025 can call the application APIs.

Page: https://docs.n8n.io/key-concept-glossary
- dianot-15: n8n treats the Chat Model as a sub-node attached to the AI Agent root node, not as a standalone step.

Page: https://www.coze.com/open/docs/guides/plugin_node
- dianot-18: Coze defines a plugin as a collection of tools, each of which is an invokable API.

Page: https://help.zapier.com/hc/en-us/articles/24393442652557-Build-an-agent-in-Zapier-Agents
- dianot-27: Zapier Agents are configured via panels (instructions, trigger, knowledge, actions) and do not use a node canvas.

Page: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.wait
- dianot-35: n8n offers a Wait node that pauses until a webhook or form resumes execution.

Page: https://www.alibabacloud.com/help/en/functioncompute/billing-overview-of-fc
- cossiz-39: Function Compute conversion factor is 0.15 CU/(GB·s).

Page: https://www.alibabacloud.com/help/en/ack/ack-managed-and-ack-dedicated/product-overview/cluster-management-fee
- cossiz-42: ACK Pro cluster management fee is USD 0.09 per cluster per hour.

Page: https://www.anthropic.com/research/advanced-tool-use
- cossiz-18: Anthropic states tool definitions + results can consume 50,000+ tokens before an agent starts.

Page: https://reference.langchain.com/python/langchain-core/runnables/config/RunnableConfig/recursion_limit
- cossiz-23: LangGraph recursion_limit default is 25 and raises GraphRecursionError.

Page: https://artificialanalysis.ai/models/comparisons/qwen3-8-max-vs-qwen3-8-max-0803
- cossiz-55: Artificial Analysis measures Qwen3.8 Max TTFT at 3.10 s.

Page: https://www.hklaw.com/en/insights/publications/2026/07/department-of-war-updates-section-1260h
- pre-9: Section 1532 of the FY2026 NDAA bars DoD contractors from using 'covered AI' products effective January 17, 2026.

Page: https://help.aliyun.com/en/model-studio/germany-frankfurt-global
- pre-45: API keys cannot be mixed across regions for Model Studio services.

Page: https://www.alibabacloud.com/blog/alibaba-cloud-unveils-agent-native-innovations-at-waic-2026_603377
- pre-120: AgentTeams was announced at WAIC 2026 alongside AgentLoop, but international availability is unconfirmed.

Page: https://www.anthropic.com/research/demystifying-evals-for-ai-agents
- pre-25: Anthropic recommends combining code-based, model-based, and human graders for evaluations.

Page: https://arxiv.org/html/2505.09388v1
- pre-29: Qwen3 expands multilingual support from 29 to 119 languages and dialects.
