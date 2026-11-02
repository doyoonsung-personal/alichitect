# Shared context (read first)

Today is 2026-11-02. You are researching for an app that Alibaba Cloud pre-sales staff and their customers use. A user types a request in plain language, and the app's AI draws a live diagram while it chats with the user. The app already draws cloud architectures (VPCs, databases, load balancers). We are adding a second focus: **AI solutions and agentic workflows**. Example request: "I want to set up an agentic workflow that reads incoming support emails, answers the routine ones from our help-centre articles and sends the rest to a human with a draft reply." For a request like that, the app will draw the workflow (trigger, steps, tools, the model used at each step, human approval, loops), name the Alibaba Cloud products behind each part, estimate cost, and later export a proposal for business readers.

Who reads your report: an engineer and a pre-sales architect who will turn it into the app's product catalog, its drawing rules and its test cases. They will open your cited pages to verify every load-bearing fact, so precise citations matter more than prose.

Customers are international (Southeast Asia, Korea, Japan, Europe, the US), not mainland China. Singapore (ap-southeast-1) is the default region. Facts already verified on 2026-10-31 (report it explicitly if you find newer information that contradicts one):
- Model Studio's no-code agent and workflow apps and its knowledge base are open only to accounts that created Singapore apps before 2025-04-21, so new international customers build agents from Model Studio's model APIs plus their own runtime (AgentCore, AgentRun, Dify on ACK, or code on Function Compute or ACS).
- qwen3.8-max costs $2 per 1M input tokens and $6 per 1M output tokens in Singapore. Model Studio's international regions are Singapore, Virginia, Frankfurt, Tokyo and Hong Kong (not Seoul).
- Model Studio fine-tuning and batch exist only in Singapore (and Beijing) among the regions that matter; Model Studio PrivateLink is documented for Beijing and Hong Kong only.
- AgentLoop (agent observability) runs internationally only in Hong Kong. AgentRun's only international endpoint is Singapore. AI Search Open Platform is documented for Shanghai and Frankfurt only.

Rules for your answer:
- This is a read-only research task: do not edit or create files. Use live web search and open the pages you cite; do not answer from memory, which is out of date for products, prices and laws.
- Put the source URL in brackets right after each fact. Prefer official pages: alibabacloud.com (international) over aliyun.com (China); for general practice, the vendors' own engineering pages and docs (Anthropic, OpenAI, Google, Microsoft, AWS, LangChain), papers, and named practitioners over SEO blogs.
- Mark facts you could not confirm as "unconfirmed", and facts found only on the China site as "China site only".
- Be thorough and structured: tables where the brief asks for them. Do not pad with general explanations.

---

# Brief: evidence for choosing a model per workflow step (Qwen and peers on agentic benchmarks)

Goal: when the app puts qwen3.8-flash on a classification step and qwen3.8-max on a planning step, it should be able to say why with evidence.

Cover:
1. Published results for current Qwen models (qwen3.8-max, qwen3.8-flash, qwen3.7-plus and open-weight Qwen3.x models) on agentic and tool-use benchmarks: BFCL (Berkeley Function Calling Leaderboard), tau-bench or tau2-bench, Terminal-Bench, SWE-bench Verified, BrowseComp, GAIA, and any multilingual benchmark that covers Korean, Japanese or Southeast Asian languages. Give the score, the date and the source (official model card, Qwen blog, leaderboard page). Mark vendor-reported versus independent.
2. Comparable published scores for peer models only where the same source reports them side by side.
3. Published guidance (from any model vendor or from practitioners) on which task types small fast models handle well (classification, extraction, routing, short summaries) versus where large reasoning models pay off (planning, multi-step tool use, long documents, code), ideally with measured accuracy or cost trade-offs.
4. Latency facts: time to first token and output speed for qwen3.8-max and qwen3.8-flash from independent measurement sites (for example Artificial Analysis or OpenRouter) if published.
Do not invent scores; if a benchmark has no published Qwen result, say so.
