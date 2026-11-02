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

Page: https://www.anthropic.com/research/multi-agent-research-system
- patter-9: Anthropic reports that agents use approximately 4x more tokens than a chat interaction.
- patter-10: Anthropic reports that multi-agent systems use approximately 15x more tokens than a chat interaction.
- patter-11: A Claude Opus 4 lead agent with Claude Sonnet 4 subagents outperformed single-agent Claude Opus 4 by 90.2% on Anthropic's internal research eval.
- patter-26: Anthropic's research system reported up to 90% reduction in research time on complex queries using 3-5 parallel subagents making 3+ parallel tool calls (confirmed only in secondary summaries).

Page: https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns
- patter-32: Microsoft Azure defines maker-checker loop as one agent creating or proposing something and another agent checking it, explicitly stating it is a specific type of group chat orchestration.
- patter-47: Azure defines group chat orchestration as a collaborative conversation among multiple agents coordinated by an orchestrator determining speaker selection.
- patter-50: Azure defines magentic orchestration as also known as dynamic orchestration, task-ledger-based orchestration, or adaptive planning.
- patter-40: Azure lists infinite handoff loops as a risk in handoff orchestration.

Page: https://www.alibabacloud.com/help/en/pai/product-overview/pai-langstudio-feature-retirement-and-migration-guide
- refere-1: PAI-LangStudio is officially retired on March 9, 2027 at 16:00.

Page: https://www.alibabacloud.com/help/en/agentrun/open-platform-introduction.md
- refere-3: AgentRun Open Platform (FunAgent) is available in the China (Hong Kong) and Singapore regions.

Page: https://www.alibabacloud.com/tc/solution/tech-solution/deepseek-harness
- refere-11: DeepSeek Harness is an open-source AI Agent framework by DeepSeek supporting Web UI and CLI modes, deployable on ECS with Model Studio.

Page: https://www.alibabacloud.com/help/en/ims/real-time-conversational-ai-standard-billing
- refere-17: Real-time conversational AI billing example for Chinese mainland agent is USD 0.28 for 20 minutes ($0.014/minute).

Page: https://www.alibabacloud.com/help/en/open-search/search-platform/product-overview/introduction-to-search-platform
- refere-27: AI Search Open Platform is available in Shanghai and Frankfurt regions only.

Page: https://help.aliyun.com/en/functioncompute/build-an-ai-shopping-assistant
- refere-32: Proactive AI shopping assistant tutorial is China site only.

Page: https://help.aliyun.com/en/model-studio/managed-agents-cost-tiering
- refere-68: Cost tiering for multi-agent coordinator is China site only.

Page: https://www.alibabacloud.com/en/solution/tech-solution/agency-agents/3044083
- refere-8: Agency Agents solution features 232 specialized agents across 16 domains.

Page: https://www.alibabacloud.com/blog/alibaba-cloud-customer-service-agent-thoughts-design-and-practices-from-concept-to-implementation_601555
- refere-24: Customer service agent blog claims self-service resolution rate is over 10% higher than traditional approach.

Page: https://www.alibabacloud.com/blog/setting-up-an-ai-chatbot-for-marketing-automation-with-alibaba-cloud-model-studio_603115
- refere-30: Marketing chatbot blog describes creating an Agent Application in Model Studio as Step 1.

Page: https://www.alibabacloud.com/blog/ai-coding-enters-the-agent-teamwork-era-introducing-qoder-experts-mode_603406
- refere-38: Qoder Experts Mode breaks down tasks and assembles an expert team for execution.

Page: https://www.alibabacloud.com/help/en/agentrun/what-is-agentrun
- refere-44: AgentRun runtime supports Python, Node.js, and Java; sandbox runtime supports 50+ languages.

Page: https://adk.dev/agents/workflow-agents/loop-agents/
- patter-33: Google ADK's LoopAgent repeatedly executes its sub-agents for a specified number of iterations or until a termination condition is met.

Page: https://arxiv.org/abs/2305.14325
- patter-49: Academic multiagent debate involves multiple model instances proposing answers, reading each other's responses, and revising over rounds.

Page: https://www.langchain.com/blog/introducing-ambient-agents
- patter-63: LangChain defines ambient agents as agents that respond to signals and run tasks simultaneously, triggered by events rather than a human prompt.

Page: https://openai.com/index/introducing-deep-research/
- patter-67: OpenAI's Deep Research was trained using end-to-end reinforcement learning on hard browsing and reasoning tasks.

Page: https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost02-bp01.html
- patter-86: AWS Well-Architected Agentic AI Lens includes a cost pillar with best practices for tiered model selection.

Page: https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/definitions.html
- patter-4: AWS Well-Architected Agentic AI Lens frames orchestration patterns as a spectrum from static workflows to dynamic graph orchestration.

Page: https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/prompt-chaining-saga-patterns.html
- patter-17: AWS Prescriptive Guidance documents a prompt chaining saga pattern involving compensating transactions for multi-step writes.

Page: https://arxiv.org/abs/2503.13657
- patter-35: MAST classifies multi-agent failures into specification issues, inter-agent misalignment, and task verification categories.

Page: https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops06.html
- patter-45: AWS Well-Architected includes a best practice 'Optimize multi-agent collaboration cost through efficient handoff patterns'.
