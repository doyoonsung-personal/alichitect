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

Page: https://www.gartner.com/en/newsroom/press-releases/2025-06-25-gartner-predicts-over-40-percent-of-agentic-ai-projects-will-be-canceled-by-end-of-2027
- userev-38: Gartner predicts >40% of agentic AI projects will be cancelled by end-2027.
- useser-49: Gartner predicts over 40% of agentic AI projects will be canceled by end of 2027.

Page: https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai
- userev-64: EU AI Act is applicable from 2 Aug 2026 with transparency obligations since Aug 2026.

Page: https://www.alibabacloud.com/help/en/analyticdb/analyticdb-for-postgresql/openapi-based-rag-applications-1
- useope-36: AnalyticDB for PostgreSQL offers RAG OpenAPI and GraphRAG service.

Page: https://www.kuppingercole.com/blog/gardiner/when-ai-agents-read-your-email
- useser-55: Google researchers observed a 32% increase in malicious prompt injections between November 2025 and early 2026.

Page: https://www.alibabacloud.com/help/en/model-studio/tpm-reservation-billing
- cossiz-32: qwen3.8-max Throughput Reservation price is $16.63 per 10k TPM·hour input.

Page: https://www.rand.org/pubs/research_reports/RRA2680-1.html
- pre-21: RAND lists lack of quality data as a root cause of AI project failure.

Page: https://qwen.readthedocs.io/en/latest/getting_started/concepts.html
- cossiz-14: Qwen tokenizer estimates 1 token ≈ 3–4 characters for English text.
- cossiz-15: Qwen tokenizer estimates 1 token ≈ 1.5–1.8 characters for Chinese text.

Page: https://www.yotpo.com/blog/ai-review-summary/
- userev-46: Yotpo reports brands enabling AI Review Summary see a 5.4% increase in conversion.

Page: https://www.alibabacloud.com/help/en/tablestore/memory-storage-service-sub-product-test/news-and-announcements
- useser-31: Tablestore Memory Storage is available in China (Shanghai), China (Shenzhen), China (Hong Kong), and Singapore regions.

Page: https://help.aliyun.com/en/model-studio/workflow/agent-create-node
- dianot-28: Alibaba Model Studio includes an Agent Creation node that natively supports tool invocation and knowledge base configuration.

Page: https://platform.claude.com/docs/en/build-with-claude/prompt-caching
- cossiz-33: Anthropic prompt caching write is 1.25x base input for 5-min TTL.

Page: https://www.alibabacloud.com/en/campaign/ai-landing-page-token?_p_lc=1
- userev-2: qwen3.8-max is priced at $2 per 1M input tokens and $6 per 1M output tokens in the Singapore region.
- useope-1: qwen3.8-max is priced at $2 per 1M input tokens and $6 per 1M output tokens for the International deployment scope in Singapore.

Page: https://www.schneider.im/microsoft-dynamics-365-ai-agent-capabilities-and-licensing/
- userev-35: Microsoft Sales Qualification Agent went GA Oct 25, 2025, including 1,000 Copilot Credits per Dynamics 365 Sales Premium license.

Page: https://artificialintelligenceact.eu/article/6/
- useope-66: EU AI Act Article 6 high-risk obligations apply from 2 December 2027.

Page: https://help.aliyun.com/en/agentcore/agentcore-billing-instructions
- useser-83: AgentCore international pricing is unconfirmed; only a China reference price of CNY 0.0000694/CU was found.

Page: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy-core-concepts.html
- dianot-26: AWS Bedrock AgentCore Gateway converts APIs and Lambda functions to MCP compatible tools.

Page: https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-privacy-policy
- pre-44: International personal data for Model Studio is stored in Singapore.

Page: https://www.alibabacloud.com/help/en/agentrun/open-platform-introduction.md
- useope-6: AgentRun Open Platform is available in China (Hong Kong) and Singapore.
- cossiz-27: AgentRun offers a cost-saving mode and Token quotas.

Page: https://www.alibabacloud.com/blog/qwen-audio-3-0-tts-more-multilingual-easier-to-direct_603379
- userev-90: Qwen-Audio-3.0-TTS preset voices span 16 languages.

Page: https://www.alibabacloud.com/en/product/ai_guardrails?_p_lc=1
- useope-44: AI Guardrails (formerly Content Moderation) can be activated one-click through Model Studio and integrates with AI Gateway and WAF.

Page: https://www.daily.co/blog/advice-on-building-voice-ai-in-june-2025/
- useser-61: Target voice-to-voice latency for AI agents is approximately 800 ms median.

Page: https://www.alibabacloud.com/help/en/agent-sandbox/product-overview/billing-overview
- cossiz-41: Agent Sandbox reference price in Chinese mainland Economy class is USD 0.0000026/vCPU·second.

Page: https://docs.cloud.google.com/architecture/choose-design-pattern-agentic-ai-system
- pre-28: Google recommends using the human-in-the-loop pattern for tasks needing oversight, subjective judgement, or final approval.
