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

# Brief: rules that shape agentic AI deployments for international customers (2026)

Goal: pre-sales proposals for agentic workflows should flag the obligations customers will ask about, without giving legal advice.

Cover, with official sources (government and regulator sites first):
1. EU AI Act: what applies in 2026 to companies deploying AI agents (transparency for chatbots, general-purpose AI obligations, high-risk use cases such as recruiting and credit), and the current timeline including any delays.
2. South Korea: the AI Basic Act (effective date, obligations for high-impact AI and generative AI labelling) and PIPA rules on automated decisions.
3. Singapore: the Model AI Governance Framework and any agentic AI guidance (IMDA), PDPA points relevant to AI agents.
4. Japan: the AI Promotion Act and AI guidelines for business.
5. Data residency and cross-border transfer points that matter when a Singapore-hosted model processes data from Korea, Japan, the EU or Southeast Asia.
6. Sector rules that commonly come up: financial services (for example MAS guidance on AI in Singapore), healthcare.
For each: one-paragraph summary, what it means for an agentic workflow design (human oversight, logging, disclosure, data location), effective dates, and sources. Mark anything uncertain.
