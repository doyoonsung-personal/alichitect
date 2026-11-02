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

Page: https://docs.cloud.google.com/architecture/choose-design-pattern-agentic-ai-system
- patter-7: Google Cloud Architecture Center publishes a 3-step selection process for agentic AI design patterns.
- patter-28: Google Cloud defines hierarchical task decomposition as an implementation of the coordinator pattern where a top-level parent agent receives a task and decomposes it.
- patter-43: Google Cloud defines the swarm pattern as using a dispatcher agent to route a user request to a collaborative group of specialized agents.
- patter-55: Google Cloud defines the human-in-the-loop pattern as improving safety and reliability by inserting human judgment into critical decision points within the workflow.
- patter-31: Google Cloud splits evaluator-optimizer into two named patterns: review and critique, and iterative refinement.

Page: (no URL cited)
- refere-76: Region support for every Technical Solution in Table A is unconfirmed.
- patter-96: Report confirms no contradiction with facts verified on 2026-10-31 about Alibaba Cloud Model Studio / AgentRun / AgentLoop.
- patter-97: Report states nothing in this brief touches Alibaba Cloud products.

Page: https://adk.dev/agents/custom-agents/
- patter-41: Google ADK implements handoffs as the LLM emitting a transfer_to_agent function call.
- patter-24: In Google ADK, all parallel children access the same shared session.state.

Page: https://www.alibabacloud.com/help/en/simple-application-server/use-cases/quickly-deploy-and-use-openclaw
- refere-12: OpenClaw is available as an application image on Simple Application Server (SAS) under MIT license.

Page: https://www.alibabacloud.com/blog/openclaw-launches-on-alibaba-cloud-simple-application-server_602845
- refere-13: Blog states OpenClaw pricing on Simple Application Server is as little as USD $8/month.

Page: https://help.aliyun.com/en/document-mind/product-overview/product-introduction/
- refere-28: Document Mind is China site only.

Page: https://help.aliyun.com/en/model-studio/create-an-ai-shopping-assistant
- refere-31: Shopping guide tutorials are China site only.

Page: https://www.alibabacloud.com/en/solution/tech-solution/
- refere-5: The Technical Solutions catalog includes 'Build a private Q&A app with RAGFlow', 'Multimodal data extraction', and 'Deploy Dify and build AI applications'.

Page: https://www.alibabacloud.com/en/solution/tech-solution/rapidly-deploy-dify-to-accelerate-ai-application-development
- refere-7: Dify technical solution uses Container Service for Kubernetes (ACK) and supports versions like v1.11.4.

Page: https://www.alibabacloud.com/help/en/model-studio/build-knowledge-base-qa-assistant-without-coding
- refere-26: Zero-code knowledge Q&A application doc recommends Qwen-Plus / Qwen-Plus-Latest models.

Page: https://www.alibabacloud.com/help/en/model-studio/qwen-vl-ocr
- refere-29: Qwen-OCR extracts text and structured data from scanned documents, tables, and receipts.

Page: https://www.alibabacloud.com/help/doc-detail/3047403.html
- refere-40: Claude Code template on Function Compute executes commands within a sandbox.

Page: https://www.alibabacloud.com/help/en/security-center/user-guide/agentic-soc-agent-architecture
- refere-42: Agentic SOC uses a layered multi-agent architecture with a Team Leader coordinating agents.

Page: https://arxiv.org/abs/2303.11366
- patter-34: Reflexion agents verbally reflect on task feedback signals and maintain their own reflective text in an episodic memory buffer.

Page: https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/
- patter-42: OpenAI defines the manager pattern as a manager agent coordinating specialist agents where agents serve as tools for other agents.

Page: https://www.anthropic.com/research/effective-harnesses-for-long-running-agents
- patter-65: Anthropic's long-running harness pattern uses an initializer agent that writes a feature list/state file plus an incremental worker agent that makes progress across many context windows.

Page: https://ai.google.dev/gemini-api/docs/deep-research
- patter-66: Gemini Deep Research agent autonomously plans, executes, and synthesizes multi-step research tasks to produce detailed, cited reports.

Page: https://openai.github.io/openai-agents-python/human_in_the_loop/
- patter-90: OpenAI Agents SDK docs describe needs_approval interruptions that must be resumed.

Page: https://learn.microsoft.com/en-us/agent-framework/agents/tools/tool-approval
- patter-91: Microsoft Agent Framework gates function tools requiring approval.

Page: https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost02.html
- patter-19: AWS Well-Architected best practice AGENTCOST02 assigns routine classification and formatting to cost-efficient models and reserves premium models for reasoning.

Page: https://learn.microsoft.com/en-us/python/api/agent-framework-core/agent_framework?view=agent-framework-python-latest
- patter-29: Microsoft Agent Framework supports magentic plan review via .with_plan_review() or MagenticHumanInterventionKind.PLAN_REVIEW.

Page: https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/handoff
- patter-46: Microsoft Agent Framework allows agents in a handoff workflow to use tools that require human approval before they run.
