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

Page: https://platform.claude.com/docs/en/about-claude/pricing
- produc-7: Anthropic's prompt caching pricing states that cache reads cost 0.1x the standard input price.
- produc-8: Anthropic's prompt caching pricing states that 5-minute cache writes cost 1.25x the standard input price.
- produc-9: Anthropic's prompt caching pricing states that 1-hour cache writes cost 2x the standard input price.

Page: https://blog.modelcontextprotocol.io/posts/2026-03-16-tool-annotations/
- produc-5: MCP defines machine-readable metadata hints including `readOnlyHint`, `destructiveHint`, `idempotentHint`, and `openWorldHint`.
- produc-6: In MCP, a tool with no annotations is assumed by default to be non-read-only, potentially destructive, and non-idempotent.

Page: https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/
- produc-18: OWASP Top 10 for Agentic Applications 2026 lists ASI01 as 'Agent Goal Hijack'.
- produc-19: OWASP Top 10 for Agentic Applications 2026 lists ASI06 as 'Memory & Context Poisoning'.

Page: https://www.anthropic.com/research/demystifying-evals-for-ai-agents
- produc-41: Anthropic recommends starting evaluation with 20–50 tasks taken from real failures.
- produc-42: pass@k measures the likelihood that an agent gets at least one correct solution in k attempts.

Page: https://www.anthropic.com/research/code-execution-with-mcp
- produc-2: Anthropic's code-execution-with-MCP example demonstrates a reduction from 150,000 to 2,000 tokens, representing a 98.7% saving.

Page: https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel06-bp04.html
- produc-16: AWS Best Practice AGENTREL06-BP04 mandates implementing idempotent task execution to ensure safe retries.

Page: https://docs.aws.amazon.com/wellarchitected/latest/generative-ai-lens/genrel03-bp02.html
- produc-17: AWS Best Practice GENREL03-BP02 requires implementing timeout mechanisms to reduce blocking failures in agentic workflows.

Page: https://nvlpubs.nist.gov/nistpubs/ai/nist.ai.100-1.pdf
- produc-24: NIST AI RMF 1.0 Core is composed of four functions: govern, map, measure, and manage.

Page: https://developers.openai.com/api/docs/guides/batch
- produc-25: OpenAI Batch API offers asynchronous groups of requests with 50% lower costs compared to real-time processing.

Page: https://aws.amazon.com/blogs/machine-learning/optimizing-cost-and-latency-with-amazon-bedrock-prompt-caching/
- produc-28: AWS Bedrock prompt caching can reduce input token costs by up to 90 percent when repeatedly sending the same context.

Page: https://arxiv.org/abs/2305.05176
- produc-29: FrugalGPT paper claims a cascade approach can match the performance of GPT-4 with up to 98% cost reduction.

Page: https://docs.aws.amazon.com/lambda/latest/dg/durable-functions.html
- produc-40: AWS Lambda durable functions can execute for up to one year while maintaining progress despite failures.

Page: https://developers.openai.com/api/docs/guides/evals
- produc-48: OpenAI is deprecating its hosted Evals platform in favor of the Evals API.

Page: https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/data-residency
- produc-58: Google Cloud documents separate data residency commitments for storage and ML processing locations.

Page: https://developers.openai.com/api/docs/guides/structured-outputs
- produc-69: OpenAI Structured Outputs ensures schema adherence, whereas JSON mode only ensures valid JSON is produced.

Page: https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost02-bp01.html
- produc-80: AWS Best Practice AGENTCOST02-BP01 requires architecting tiered model selection for cost-performance optimization.

Page: https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost02-bp03.html
- produc-81: AWS Best Practice AGENTCOST02-BP03 recommends semantic caching to help prevent redundant invocations.

Page: https://platform.claude.com/docs/en/build-with-claude/prompt-caching
- produc-10: Anthropic recommends creating cache prefixes in the order: tools, then system, then messages.

Page: https://genai.owasp.org/llmrisk/llm01-prompt-injection/
- produc-20: OWASP LLM01:2025 mitigations include constraining model behavior, validating output formats, and enforcing privilege control.

Page: https://docs.nvidia.com/nemo/guardrails/about-nemo-guardrails-library/rail-types
- produc-35: NeMo Guardrails defines five rail types including Input rails and Output rails.

Page: https://docs.stripe.com/api/idempotent_requests
- produc-36: Stripe recommends using a unique key in the `Idempotency-Key` header for outbound write calls.

Page: https://docs.restate.dev/ai/patterns/durable-agents
- produc-39: Restate durably persists every LLM call, tool execution, and routing decision.

Page: https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/evaluation-agents
- produc-43: Google's Gen AI evaluation service provides metrics for both trajectory evaluation and final response evaluation in one call.

Page: https://mlflow.org/docs/latest/genai/tracing/
- produc-46: MLflow Tracing records inputs, outputs, latency, and token usage of each step.

Page: https://www.intercom.com/help/en/articles/8205718-fin-ai-agent-outcomes
- produc-47: Intercom defines a 'resolution' for Fin AI Agent as counted when the customer confirms the answer or does not come back following the last answer.

Page: https://arxiv.org/abs/2104.08663
- produc-51: BEIR benchmark leverages a selection of 18 publicly available datasets from diverse text retrieval tasks.

Page: https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/faithfulness/
- produc-52: RAGAS Faithfulness metric measures how factually consistent a response is with the retrieved context (0–1 scale).
