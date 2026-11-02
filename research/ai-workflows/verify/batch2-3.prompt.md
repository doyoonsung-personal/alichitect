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

Page: https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf
- patter-3: OpenAI defines agents as systems that independently accomplish tasks on your behalf.
- patter-39: OpenAI defines decentralized handoff pattern as agents handing off workflow execution to one another.
- patter-102: OpenAI defines a workflow as a sequence of steps that must be executed to meet the user's goal.
- patter-20: OpenAI's guardrail taxonomy includes a relevance classifier that flags off-topic queries as a first-class guardrail layer.

Page: https://www.alibabacloud.com/help/en/agentcore/agentcore-product-overview
- refere-2: AgentCore product overview lists Singapore (ap-southeast-1) as a supported region alongside China regions.
- refere-77: AgentCore complete region list is truncated in snippets; full list needs console verification.
- refere-41: AgentCore covers building, governing, and executing enterprise AI agents through three core modules.

Page: https://www.alibabacloud.com/en/solutions/ai-application/real-time-interaction
- refere-15: Real-time audio/video conversations use qwen3.8-omni-flash-realtime model.
- refere-16: Non-real-time audio output uses qwen3.5-omni-plus model.

Page: https://www.alibabacloud.com/help/en/model-studio/rag-knowledge-base
- refere-4: Only users who created Alibaba Cloud Model Studio applications in the Singapore region before April 21, 2025 can access certain features (application gate).

Page: https://www.alibabacloud.com/tc/solution/tech-solution/hiclaw
- refere-10: HiClaw is the open-source Team edition of OpenClaw from Alibaba Cloud, using a Manager Agent to orchestrate Worker agents.

Page: https://help.aliyun.com/en/aiccs/product-overview/what-is-artificial-intelligence-cloud-call-service
- refere-18: Alibaba Cloud Intelligent Contact Center (AICCS) is China site only.

Page: https://help.aliyun.com/en/model-studio/add-an-ai-assistant-to-your-wechat-in-10-minutes
- refere-25: WeChat Official Account AI customer service tutorial is China site only.

Page: https://www.alibabacloud.com/blog/qoder-completes-independent-soc-2-type-ii-examination_603516
- refere-37: Qoder has completed SOC 2 Type II examination covering Security, Availability, and Confidentiality Trust Services Categories.

Page: https://www.alibabacloud.com/blog/should-this-workflow-be-an-agent-a-three-question-test-before-you-build_603614
- refere-66: Guardrails service in Model Studio bills per token for input and output checks.

Page: https://www.alibabacloud.com/en/product/intelligent-speech-interaction
- refere-14: Intelligent Speech Interaction is currently available in Mandarin Chinese, Cantonese Chinese, English, Japanese, Korean, French and Indonesian.

Page: https://www.alibabacloud.com/help/en/qwenwork/
- refere-21: QwenWork International Edition supports Google Workspace integration.

Page: https://www.alibabacloud.com/help/en/quick-bi/user-guide/smartq
- refere-33: Quick BI Smart Q allows natural language interaction to build custom AI analytics assistants.

Page: https://github.com/aliyun/alibabacloud-adbpg-mcp-server
- refere-36: Official MCP server for AnalyticDB PG enables AI Agents to retrieve metadata and execute SQL operations.

Page: https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/workflow-for-prompt-chaining.html
- patter-15: AWS describes prompt chaining as breaking complex tasks into sequential LLM steps enabling structured reasoning and control.

Page: https://arxiv.org/abs/2312.04511
- patter-25: LLMCompiler reports latency speedup up to 3.7x, cost savings up to 6.7x, and accuracy improvement of ~9% vs ReAct.

Page: https://arxiv.org/abs/2411.04468
- patter-51: Magentic-One paper describes an Orchestrator agent creating a plan, delegating tasks, and tracking progress towards the goal with dynamic replanning.

Page: https://docs.temporal.io/ai
- patter-58: Temporal provides Durable Execution allowing a Workflow to resume automatically after a crash, network timeout, or multi-day wait for a human approval.

Page: https://arxiv.org/abs/2210.03629
- patter-70: ReAct papers define agents generating both reasoning traces and task-specific actions in an interleaved manner.

Page: https://arxiv.org/abs/2305.04091
- patter-73: Plan-and-Solve prompting divides the entire task into smaller subtasks via a plan, then carries out the subtasks according to the plan.

Page: https://github.com/humanlayer/12-factor-agents
- patter-5: 12-Factor Agents recommends owning control flow by keeping if/while logic in code while letting the model choose actions.

Page: https://www.anthropic.com/research/multiagent-systems
- patter-13: Anthropic identifies failure classes in emerging multiagent systems including conformity, epistemic failures, and incompatible goals.

Page: https://tessary.ai/answers/failure-modes/how-do-multi-agent-systems-actually-fail
- patter-36: The MAST study reports failure distribution as specification ~41.8%, inter-agent misalignment ~36.9%, and task verification ~21.3% (secondary-only source).

Page: https://docs.langchain.com/oss/python/langchain/multi-agent/handoffs
- patter-44: LangChain's handoff design requires choosing a context filtering strategy regarding conversation history.
