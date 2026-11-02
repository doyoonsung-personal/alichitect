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

Page: https://www.alibabacloud.com/product/function-compute/pricing
- userev-25: Function Compute is priced at $0.00001668 per GB-second.

Page: https://www.alibabacloud.com/help/en/cs/product-overview/product-billing-rules
- useope-34: ACS S-class vCPU billing rate is 0.00000038 USD/s.

Page: https://artificialintelligenceact.eu/article/5/
- useser-65: EU AI Act Article 5(1)(f) prohibits emotion recognition in the workplace and education, applicable since February 2, 2025.

Page: https://docs.langflow.org/agents-tools
- dianot-20: In Langflow, any component with Tool Mode enabled connects to the Agent's Tools input.

Page: https://www.alibabacloud.com/about/gartner-gaimp-2026
- pre-15: Alibaba Cloud was named a Leader in the 2026 Gartner Magic Quadrant for Generative AI Model Providers.

Page: https://www.alibabacloud.com/help/en/model-studio/savings-plan-and-resource-package
- userev-23: Savings plans / Token Plan do not cover tool calls, context cache, batch inference, fine-tuning or model deployment.
- pre-36: Savings plans offer tiered discounts for committing monthly spend over 3, 6, 12, or 24 months.

Page: https://securiti.ai/thailand-cross-border-personal-data-transfer-overview/
- userev-63: Thailand PDPA transfers require explicit consent or BCRs as no adequacy-designated countries exist to date.

Page: https://www.alibabacloud.com/help/en/pai/deploy-an-llm/
- useope-35: PAI-EAS supports one-click LLM deployment for Qwen and DeepSeek models.

Page: https://claude.com/customers/lyft
- useser-53: Lyft reported an 87% reduction in average resolution time using Claude via Bedrock.

Page: https://www.alibabacloud.com/help/en/model-studio/deep-thinking
- cossiz-16: Thinking content is billed as Output Tokens on Model Studio.

Page: https://docs.aws.amazon.com/wellarchitected/latest/generative-ai-lens/generative-ai-lifecycle.html
- pre-19: The AWS Well-Architected Generative AI Lens lifecycle lists scoping as the first phase.

Page: https://www.alibabacloud.com/blog/alibaba-cloud-expands-european-footprint-with-two-availability-zones-in-france_603265
- pre-13: Alibaba Cloud expanded its European footprint with two new availability zones in France.
- pre-14: Alibaba Cloud has 105 availability zones across 32 regions.

Page: https://www.pnas.org/doi/10.1073/pnas.2305016120
- userev-44: Gilardi et al. found ChatGPT's zero-shot sentiment accuracy exceeded crowd workers by ~25 percentage points.

Page: https://next.api.alibabacloud.com/product/CCC
- useser-29: Cloud Contact Center (CCC) international availability is unconfirmed and likely China-only.

Page: https://www.alibabacloud.com/help/en/agentrun/quick-start-to-low-code-agent-creation-1
- dianot-13: Alibaba AgentRun includes a low-code visual 'Flow Agent' canvas that supports drag-and-drop node orchestration.

Page: https://openai.github.io/openai-agents-python/running_agents/
- cossiz-24: OpenAI Agents SDK max_turns default value is unconfirmed but third parties say 5 or 10.

Page: https://www.alibabacloud.com/help/en/model-studio/what-is-model-studio
- userev-3: Model Studio international regions include Singapore, Virginia, Frankfurt, Tokyo, and Hong Kong, but not Seoul.
- useope-11: Model Studio serves third-party models including DeepSeek, Kimi, and GLM internationally.
- useser-4: Model Studio international regions include Singapore, Virginia, Frankfurt, Tokyo, and Hong Kong, but not Seoul.
- pre-2: Model Studio regions include Beijing, Virginia, Singapore, Tokyo, Frankfurt, and Hong Kong.

Page: https://aicura.app/frameworks/korea-pipa-automated-decisions/
- userev-57: South Korea PIPA Article 37-2 allows data subjects to refuse fully automated decisions affecting their rights.

Page: https://www.kimchang.com/en/insights/detail.kc?sch_section=4&idx=29898
- useope-71: Korea PIPA Art. 37-2 gives data subjects the right to refuse fully automated decisions with material impact.

Page: https://www.gov.ca.gov/2026-09-10/governor-newsom-signs-the-strongest-child-safety-chatbot-and-social-media-laws-in-the-nation/
- useser-102: Newsom signed further child-safety chatbot laws in California on September 10, 2026.

Page: https://www.alibabacloud.com/help/en/agentrun/knowledge-base-integration-guide
- dianot-33: Alibaba AgentRun supports knowledge base integration with Model Studio and RAGFlow.

Page: https://www.alibabacloud.com/en/product/agentcore?_p_lc=1
- pre-85: AgentCore provides build, govern, and execute capabilities for agents.
