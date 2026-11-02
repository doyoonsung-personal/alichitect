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

Page: https://www.anthropic.com/research/building-effective-agents
- patter-1: Anthropic defines workflows as systems where LLMs and tools are orchestrated through predefined code paths.
- patter-2: Anthropic defines agents as systems where LLMs dynamically direct their own processes and tool usage, maintaining control over how they accomplish tasks.
- patter-14: Anthropic defines prompt chaining as decomposing a task into a sequence of steps where each LLM call processes the output of the previous one.
- patter-18: Anthropic defines routing as classifying an input and directing it to a specialised follow-up task or handler.
- patter-21: Anthropic defines parallelization sectioning as breaking a task into independent subtasks run in parallel.
- patter-22: Anthropic defines parallelization voting as running the same task multiple times to get diverse samples.
- patter-27: Anthropic defines orchestrator-workers as a workflow where a central LLM dynamically breaks down tasks, delegates them to worker LLMs, and synthesizes their results.
- patter-30: Anthropic defines evaluator-optimizer as a workflow where one LLM call generates a response while another provides evaluation and feedback in a loop.
- patter-6: Anthropic recommends finding the simplest solution possible and only increasing complexity when needed.

Page: https://www.alibabacloud.com/solution/tech-solution-deploy/2926764
- refere-6: RAGFlow technical solution page exists at URL https://www.alibabacloud.com/solution/tech-solution-deploy/2926764.

Page: https://www.alibabacloud.com/en/solution/tech-solution/copaw
- refere-9: QwenPaw (formerly CoPaw) is an open-source personal AI assistant from the AgentScope team deployable on ECS.

Page: https://www.alibabacloud.com/product/jvs
- refere-22: Agentic Computer (JVS) is built on Elastic Desktop Service (EDS).

Page: https://www.alibabacloud.com/en/campaign/agenticmobile
- refere-23: Agentic Mobile is built on Cloud Phone (ECP).

Page: https://www.alibabacloud.com/help/en/model-studio/coding-plan
- refere-39: Model Studio Coding Plan price is $50/month with quota up to 6,000 requests per 5 hours.

Page: https://help.aliyun.com/en/model-studio/use-multi-agent-to-query-alibaba-cloud-resource-information
- refere-43: Auto-planning multi-agent system with Assistant API tutorial is China site only.

Page: https://www.alibabacloud.com/en/solutions/generative-ai/rag
- refere-19: RAG solution guide uses Model Studio, Compute Nest, and AnalyticDB for PostgreSQL.

Page: https://www.alibabacloud.com/en/solutions/smart-studio
- refere-20: Smart Studio was announced at Apsara 2026 as one of three new AI solutions for international businesses.

Page: https://www.alibabacloud.com/help/en/analyticdb/analyticdb-for-mysql/adbagent/
- refere-34: ADBAgent allows saving analysis workflows as reusable Skills.

Page: https://www.alibabacloud.com/help/en/analyticdb/analyticdb-for-postgresql/data-agent/
- refere-35: ADB-PG Data Agent provides read-only query analysis and DBA read-only diagnostics.

Page: https://adk.dev/agents/workflow-agents/sequential-agents/
- patter-16: Google ADK's SequentialAgent executes its sub-agents in the order they are specified in a list.

Page: https://adk.dev/agents/workflow-agents/parallel-agents/
- patter-23: Google ADK's ParallelAgent runs sub-agents concurrently potentially reducing total research time significantly compared to sequential execution.

Page: https://docs.langchain.com/oss/python/langchain/human-in-the-loop
- patter-56: LangChain HITL middleware supports approve, edit, and reject with feedback actions.

Page: https://docs.langchain.com/oss/python/langgraph/interrupts
- patter-57: LangGraph saves graph state using its persistence layer and waits indefinitely until execution is resumed when an interrupt is triggered.

Page: https://developers.openai.com/api/docs/guides/agents
- patter-71: OpenAI Agents SDK runner handles the agent loop and handoffs.

Page: https://www.anthropic.com/research/code-execution-with-mcp
- patter-72: Anthropic reports that tool definitions and results can sometimes consume 50,000+ tokens before work starts.

Page: https://cognition.com/blog/multi-agents-working
- patter-8: Cognition's 2026 revision states multi-agent works in a narrow class where one main loop carries state and subagents are stateless workers with narrow scope.

Page: https://www.mckinsey.com/capabilities/quantumblack/our-insights/is-that-ai-agent-worth-it-agentic-economics-and-the-modern-operating-model
- patter-12: McKinsey estimates that agentic tasks can consume roughly 1,000x more tokens than single-turn reasoning/chat.

Page: https://openreview.net/forum?id=fAjbYBmonr
- patter-37: The OpenReview record for MAST notes the extended taxonomy has 16 modes across three categories.

Page: https://neurips.cc/virtual/2025/122442
- patter-38: The NeurIPS record for MAST notes the taxonomy has 14 modes.
