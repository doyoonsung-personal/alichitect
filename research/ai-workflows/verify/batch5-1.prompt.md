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

Page: https://www.anthropic.com/research/how-we-contain-claude
- produc-11: In Anthropic's red team testing, a direct prompt injection succeeded 24 times out of 25 retries against model-layer controls.
- produc-12: OS-level containment for Claude Code resulted in an 84% reduction in permission prompts.
- produc-13: Anthropic telemetry indicates users approved approximately 93% of permission prompts in per-action control models.

Page: https://www.anthropic.com/research/advanced-tool-use
- produc-1: Anthropic's Tool Search Tool reports an 85% reduction in token usage while maintaining access to the full tool library.
- produc-3: Anthropic's Programmatic Tool Calling reports a reduction from 43,588 to 27,297 tokens (−37%) on complex research tasks.

Page: https://www.anthropic.com/research/multi-agent-research-system
- produc-30: Anthropic states that agents typically use about 4x more tokens than chat interactions.
- produc-31: Anthropic states that multi-agent systems use about 15x more tokens than chats.

Page: https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec04-bp02.html
- produc-89: AWS Best Practice AGENTSEC04-BP02 requires reviewers to receive enough context to make informed decisions within a defined time.
- produc-90: AWS Best Practice AGENTSEC04-BP02 requires logging human approval decisions with timestamps and reviewer identities.

Page: https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentic-ai-lens.html
- produc-14: AWS Well-Architected Agentic AI Lens consists of 150 best practices across 41 questions and 6 pillars.

Page: https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec03-bp03.html
- produc-15: AWS Best Practice AGENTSEC03-BP03 requires implementing least privilege with dynamic boundaries for agent IAM roles.

Page: https://artificialintelligenceact.eu/article/12/
- produc-22: EU AI Act Article 12 legally requires high-risk AI systems to allow for automatic recording of events (logs) over the lifetime of the system.

Page: https://artificialintelligenceact.eu/article/14/
- produc-23: EU AI Act Article 14 legally requires high-risk AI systems to be designed so they can be effectively overseen by natural persons.

Page: https://platform.claude.com/docs/en/build-with-claude/batch-processing
- produc-26: Anthropic Message Batches offer a 50 percent discount on all usage (input, output, special tokens).

Page: https://cloud.google.com/blog/products/ai-machine-learning/vertex-ai-context-caching
- produc-27: Vertex AI context caching bills cached tokens at 10% of standard input cost for supported Gemini 2.5+ models.

Page: https://reference.langchain.com/python/langchain-core/runnables/config/RunnableConfig/recursion_limit
- produc-32: LangGraph's `recursion_limit` parameter defaults to 25 steps.

Page: https://learn.microsoft.com/en-us/azure/ai-services/content-safety/concepts/jailbreak-detection
- produc-34: Microsoft Azure Prompt Shields detects 'User Prompt attacks' and 'Document attacks'.

Page: https://docs.aws.amazon.com/bedrock/latest/userguide/model-invocation-logging.html
- produc-53: AWS Bedrock model invocation logging must be explicitly enabled per account/region and writes to S3 or CloudWatch Logs.

Page: https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec05.html
- produc-54: AWS Best Practice AGENTSEC05-BP01 requires comprehensive logging and decision artifact storage.

Page: https://developers.openai.com/api/docs/guides/prompt-caching
- produc-70: OpenAI Prompt Caching is enabled by default for supported OpenAI models.

Page: https://claude.com/resources/articles/introducing-citations-api
- produc-74: Anthropic Citations API lets the model cite specific sentences and passages that inform the answer.

Page: https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf06-bp01.html
- produc-82: AWS Best Practice AGENTPERF06-BP01 states that parallel tool execution and result caching reduce reasoning loop latency.

Page: https://www.anthropic.com/research/writing-tools-for-agents
- produc-4: Anthropic's worked example shows that concise tool responses excluding IDs use approximately one-third (~⅓) of the tokens compared to verbose responses.

Page: https://genai.owasp.org/llmrisk/llm062025-excessive-agency/
- produc-21: OWASP LLM06:2025 mitigations include limiting extensions to the minimum necessary and implementing rate-limiting.

Page: https://openai.github.io/openai-agents-python/running_agents/
- produc-33: The OpenAI Agents SDK raises a `MaxTurnsExceeded` exception if the `max_turns` limit is exceeded.

Page: https://docs.litellm.ai/docs/proxy/reliability
- produc-37: LiteLLM falls back to another model group if a call fails after `num_retries` are exhausted.

Page: https://docs.temporal.io/ai
- produc-38: Temporal supports durable execution where a workflow resumes automatically after a crash or multi-day wait for a human.

Page: https://devblogs.microsoft.com/foundry/foundry-agent-service-ga/
- produc-44: Microsoft Foundry Agent Service GA note states that running a test suite before shipping is not a production quality strategy.

Page: https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-agent-spans.md
- produc-45: OpenTelemetry defines span conventions for model calls, embeddings, retrieval, memory operations, tool execution and agent invocation.

Page: https://developer.nvidia.com/blog/finding-the-best-chunking-strategy-for-accurate-ai-responses/
- produc-49: NVIDIA evaluation demonstrates that page-level chunking is the most effective chunking strategy for RAG.

Page: https://arxiv.org/abs/2212.10496
- produc-50: HyDE method first zero-shot instructs an instruction-following language model to generate a hypothetical document which is then embedded for retrieval.

Page: https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf
- produc-55: NIST AI 600-1 identifies 12 Generative AI-specific risks including confabulation, data privacy and information integrity.

Page: https://docs.langchain.com/langsmith/manage-prompts
- produc-56: LangSmith allows marking stable versions of prompts (e.g., v1, v2) for version control.
