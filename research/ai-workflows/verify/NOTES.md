# Fact-check notes

Each pass works the same way:

1. Qwen Flash extracts the claims (`research/ai-workflows/claims/*.json`).
2. GPT (Codex, live web) checks the high-weight Alibaba claims against the cited pages (`verify/batch*-N.md`).
3. Claude settles disagreements here.

The verdict tables in `verify/` are the record. This file keeps what changes the plan or the data.

## Batch 1: models-text and api-features (88 claims, 2026-11-02)

| Verdict | Claims |
|---|---|
| Confirmed | 72 |
| Corrected | 9 |
| Contradicted | 4 |
| Not on page | 2 |
| Unavailable | 1 |
| China-only | 1 |

The corrections and missed facts that matter:

### Prices and quotas

- **Web search costs $10 per 1,000 calls in Singapore,** plus the tokens it adds. Both the GPT check and Qwen's report cite model-studio/web-search. Elsewhere it is far cheaper (about $0.57 per 1,000).
  - The web extractor and code interpreter are free for a limited time, but they add tokens.
  - Text-to-image search is `web_search_image`, not `t2i_search`: $8 per 1,000 in Singapore.
  - The cost estimator must count tool calls, not only tokens. `tools/qwen/research.ts` now adds the search fee.
- **qwen3.8-flash cache prices differ by deployment scope.** International (Singapore): implicit hit $0.016, explicit creation $0.20. Global: $0.014 and $0.177.
  - Qwen's table mixed the two.
  - `packages/core/src/pricing.ts` assumes $0.1875 for creation; it should be $0.20 for Singapore.
  - The International explicit-hit price is not confirmed.
- **Prices depend on deployment scope, not only region.**
  - The same model id costs less in the Global scope (Frankfurt, Tokyo, Hong Kong, Virginia) than in the International scope (Singapore): qwen3.8-max is $1.65/$4.95 against $2/$6.
  - The cost estimator needs the scope.
- **Free quota is Singapore and International scope only, "typically 1M tokens" per model, for 90 days.** It was removed for many models on 2026-10-29. qwen3.8-27b keeps 1M free tokens in Singapore.
- **Cache discounts are not uniform.** qwen3.8-max, its 0902 snapshot and others are exceptions, so quote per-model rates.
  - Explicit cache: at least 1,024 tokens, four markers per request, five-minute time to live, renewed on each hit.
- **qwen-plus thinking-mode output in Singapore is $4 per 1M,** not $1.20, at input ≤256K.
- **qwen3.7-plus** has a limited-time 20% discount on the pricing page; use list prices.

### Batch and model capabilities

- **Batch** exists in Singapore and Beijing, with different model lists.
  - The batch page allows qwen3.8-max with multimodal input only, while its model page says batch is unsupported. qwen-flash has the same inconsistency. Treat batch as "check per model".
  - qwen3.8-flash lists batch and fine-tuning as unsupported in Singapore.
- **qwen-long** supports structured output, but not thinking, function calling or built-in tools. The text-generation guide calls qwen-long and qwen3.7-max legacy, no longer recommended.
- **qwen-mt-uni** appears only on the China site (Beijing). Leave it out of `models.json`.

### Where data is processed and kept

- **Singapore storage does not mean Singapore-only inference.** International-scope requests can be processed on nodes outside mainland China. Region decides access and storage; deployment scope decides where inference runs.
  - Do not present Virginia (Global scope) as US-only processing.
  - This matters for residency answers in proposals.
- **Retention:** inference prompts and responses are kept up to 30 days, longer if law or security requires. Stateful conversations and files are kept until deleted.
- **Zero data retention:**
  - It needs enterprise eligibility and supported models.
  - Calls to unsupported models fall back to standard retention instead of failing.
  - Batch, RAG, application orchestration and the Playground are excluded.
- **Training on customer data:** the privacy page's absolute wording is qualified elsewhere by "without explicit consent". Quote carefully.

### Access and endpoints

- **PrivateLink** still excludes Singapore. A legacy endpoint example that contains ap-southeast-1 is not a commitment.
- **Application Development** (agent and workflow apps, knowledge base) is open only to accounts that created Singapore apps before 2025-04-21, and it is marked preview. The restricted APIs cover application data, the knowledge base and prompt engineering.
- **API keys:** one workspace, one user, one region.
  - Default workspaces cannot restrict model calls or set workspace rate limits.
  - Separate keys do not get separate quotas.
  - Short bursts can be rate-limited below the per-minute quota.
- **Responses API:** use `/compatible-mode/v1/responses`; the old path is no longer maintained. Dedicated workspace domains exist in all six regions.
- **JSON output with thinking:** the error applies only to models that support structured output in non-thinking mode only. It is not a general restriction.

## Batch 2: reference-solutions and patterns (116 claims, 2026-11-02)

Results: 88 confirmed, 8 corrected, 3 contradicted, 7 not on page, 6 unavailable, 4 China-only.

### Alibaba products and solutions

- **AgentCore regions:** Hangzhou, Beijing, Shanghai, Shenzhen and Singapore, per the product overview's own table.
  - Its three capabilities are building and running, collaboration and governance, and observability and evaluation.
  - CloudMonitor, PrivateLink and SchedulerX3 are billed separately; AgentCore's free scope doesn't cover them.
- **AgentRun Open Platform** has a planned major upgrade. Alibaba advises new users not to activate it; existing users can continue. Check in batch 3 whether this is the whole of AgentRun or one part.
- **The Assistant API is deprecated.** The international multi-agent tutorial points to the Responses API, and that tutorial is itself marked deprecated.
- **Singapore's zero-code app features and their APIs** sit behind the 2025-04-21 eligibility gate: knowledge base, application data and prompt engineering. They are preview features. Alibaba's own zero-code Q&A and RAG tutorials therefore don't apply to new international accounts.
- **Several "official" recipes run only on China-site consoles:** the shopping assistant, the WeChat assistant and managed-agent cost tiering (a Beijing endpoint). A China-site URL alone doesn't prove a product is China-only, but none of these recipes counts as an international reference.
- **Regional exclusions:**
  - ADBAgent (AnalyticDB's agent) is not available in Singapore; its Skills feature is mainland-only.
  - AI Search Open Platform excludes Singapore; Frankfurt is the only listed region outside the mainland.
- **Quick BI Smart Q** is a paid add-on with seats, on the Advanced and Professional editions only. Its region pages conflict with each other.
- **AI Guardrails bills each check as at least 1,000 tokens.** The page checked showed China-site integration, so whether this applies in Singapore is unverified.
- **IMS conversational AI (audio agent) in Singapore:** $0.028 a minute, plus ARTC real-time transport.
- **Qwen-OCR:** the current model is qwen3.5-ocr; migrate from qwen-vl-ocr-2024-10-28.
- **Coding Plan (international):** caps of 45,000 requests a week and 90,000 a month. Lite plans and renewals have been discontinued.

### Patterns

- **Google's design-pattern page** files "review and critique" and "iterative refinement" under the loop-agent pattern. It never says "evaluator-optimizer", which is Anthropic's term.
- **AWS prompt-chaining guidance:** recovery comes from refinement, retries and replanning, not compensating transactions. Compensating transactions belong to distributed-service sagas.
- **Anthropic's multi-agent research system:** up to 90% less time with 3–5 parallel subagents.
- **LLMCompiler:** up to 3.7× faster, 6.7× cheaper and about 9% more accurate than ReAct.
- **MAST failure taxonomy** (v3): system design issues, inter-agent misalignment and task verification.
- **Cognition (April 2026):** keep writes single-threaded, while other agents contribute findings.
- **ADK 2.0 (Python and Go)** replaces its sequential, parallel and loop template workflows with graph-based and dynamic workflows.
- **McKinsey's "1,000×" token multiplier** compares single-turn code reasoning with multi-turn coding chat. It isn't a general multiplier for customer conversations.

## Batch 3: platforms-runtime and platforms-tools (139 claims, 2026-11-02)

Results: 95 confirmed, 16 corrected, 3 contradicted, 8 not on page, 9 unavailable, 8 China-only.

### Catalog problems that affect the live app now (settled in adjudicate-1)

- **AgentBay** stops accepting new customers on 2026-11-02, per retirement notice id=2207. The notice was found by live search; opening it directly returned only the page shell. Existing customers keep service, but no new features are coming.
  - The catalog lists `agentbay` as GA.
  - Rule R21 recommends it for Windows and Android agents.
- **AI Guardrails:** the overview says "The Guardrails console currently supports only the China (Shanghai) region", and that service nodes outside mainland China, including Virginia, are not enabled.
  - The billing page lists international-edition prices: $6 per 10,000 calls per detection type, and Qwen3Guard-Gen-4B at $8 per 10,000 calls.
  - The catalog marks `ai-guardrails` as international and the chat rules recommend it.
- **AgentRun:**
  - Low-code Flow Agent creation is in maintenance mode, and Alibaba says not to create new low-code agents.
  - It advises new users not to activate the Open Platform (FunAgent, in Singapore and Hong Kong) ahead of a major upgrade.
  - The code-first runtime is not affected. Confirm in adjudicate-1.
- **Model Studio endpoints:** `dashscope.aliyuncs.com` stopped receiving new features after 2026-09-30. Workspace-dedicated endpoints are recommended, and the Singapore Responses API is advised to migrate too. The existing domain still works.
  - This affects our own app: the Worker, the server and `tools/qwen` call `dashscope-intl.aliyuncs.com`. Confirm in adjudicate-1.

### International availability

- **AgentCore** runs in Singapore.
  - Prices: $0.000015 per CU of compute; the dedicated collaboration control plane is $0.60 per hour.
  - The free offer ended on 2026-10-18.
  - AgentTeams continues as the open-source project; AgentCore is its commercial version.
  - Human review is documented: reviewer acceptance, pause and resume (agentcore/using-team-tasks).
  - Its knowledge-base connector reads only Beijing Model Studio knowledge bases, read-only. That makes it a Beijing-only feature.
- **MCP, China-site only:** Model Studio's CLI MCP and Skills ("only to China site accounts"), and MaxCompute's remote MCP (no Singapore or Hong Kong endpoint).
  - The Alibaba Cloud OpenAPI MCP server is international, through the api.alibabacloud.com/mcp portal. Its tool count differs between the docs and the README.
- **"Cloud Agent Catalog"** is not the official name. Alibaba's announcement calls it the "Skills portal": more than 60 products exposed as Skills and MCP.
- **Agent Sandbox in Singapore** is priced under "China (Hong Kong) and regions outside China":
  - Economy: $0.00000381 per vCPU-second and $0.00000191 per GiB-second.
  - Default: $0.00000496 per vCPU-second and $0.00000248 per GiB-second.
  - The Flash Edition also lists US (Silicon Valley).
- **AI Gateway:** the serverless version's preview regions were mainland and Hong Kong, not Singapore, and that preview has ended. The September 2026 commercial-release date appears on the China site only.
  - WAF 3.0's AI application protection integrates Guardrails, needs preview approval, and is free during the preview except for the Guardrails calls.
- **Tablestore Knowledge Storage** (memory and knowledge) supports Singapore. Storage and compute are billed separately, and customer data stays in the customer's own OSS and Tablestore.
- **AI Search Open Platform** has no Singapore region; Frankfurt is the only listed region outside the mainland.

### Prices and quotas for non-model costs

- **Function Compute in Singapore:** quotas of 300 vCPUs and 600 GB of memory. Its 2025 discount ended on 2025-08-27.
- **SMQ (MNS):** 20 million free normal messages per account per month; ordered messages are charged.
- **Direct Mail:** a one-time free allowance of 2,000 emails, at up to 200 per day.
- **Content moderation (text, V2.0) in Singapore:** $0.30 per 1,000 tasks.
- **CloudFlow's** quota and price figures are reference values only.

## Adjudicate-1: four conflicts (GPT, 15 official pages, 2026-11-02)

These rulings replace the batch 3 notes above where they disagree.

### AI Guardrails

- **Available internationally.** The live overview lists Hong Kong, Singapore, Frankfurt and Virginia console regions, and the "Shanghai only" line is gone.
- **Purchase:** the commodity code is `lvwang_guardrail_public_intl`.
- **APIs:** `MultiModalGuard` with `query_security_check_intl` and `response_security_check_intl`.
- **Singapore endpoints:** `green-cip.ap-southeast-1.aliyuncs.com`, plus `green-cip-vpc` for VPC access.
- **Billing:** $6 per 10,000 calls for each enabled detection type: content compliance (on by default), sensitive content, and prompt injection. It is not a bundle.
- **Catalog:** stays as it is. The cost estimator counts each enabled detection type.

### AgentBay

- **Closed to new customers since 2026-11-02 (UTC+8).** The notice was published 2026-10-28.
- Existing customers keep running, creating instances, renewing and scaling. Security fixes continue, and at least six months' notice will come before end of support.
- **Successor:** Agent Sandbox Express Edition, which the docs also call the Flash Edition.
  - Linux desktop automation moves to the Desktop template (`e2b-desktop`).
  - Windows Computer Use Sandbox is an invitational preview: contact technical support.
  - Android has no confirmed replacement for new customers.
- **Catalog fix needed now:**
  - `agentbay` becomes `no-new-purchases` with successor `agent-sandbox`.
  - R21's "agentbay for Windows or Android" is reworded.
  - This is outside the workflow view; propose it as its own change.

### AgentRun

- **The code-first runtime stays recommended.** Singapore is `ap-southeast-1`, and the docs cover runtime hosting, sandboxes, the model gateway, and frameworks including LangChain and ADK. LangGraph is not named on the page checked.
- **Discouraged for new users:**
  - low-code Flow Agent creation (maintenance mode since 2026-09-18);
  - Open Platform / FunAgent (2026-08-25: "do not activate" ahead of a major upgrade).

### Model Studio endpoints

- **Singapore is advised to move to workspace-specific hosts:** `https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1`, Responses included.
- The old domain "remains fully functional", and no shutdown date is announced. The September 30 feature freeze names `dashscope.aliyuncs.com` (mainland) explicitly.
- The legacy Responses path `/api/v2/apps/protocols/...` is no longer maintained. We already use `/compatible-mode/v1/responses`.
- **Follow-up, not urgent:** add workspace-host support to the app's config and to `tools/qwen`.

## Batch 4: models-multimodal (82 claims)

Results: 64 confirmed, 6 corrected, 5 not on page, 2 unavailable, 5 China-only.

### Speech

- **Much of the speech line is Beijing only:** CosyVoice v3.5 (Flash and Plus), SSML and LaTeX, and the Fun-ASR-Realtime price.
- **Singapore streaming ASR** (qwen-audio-3.1-asr-flash) costs $0.93 input and $0.70 output per 1M tokens. The lower prices quoted were Beijing's.
- **Voice cloning (international):** $0.01 per clone, with 1,000 free voices per account.

### Vision, Omni and OCR

- **qwen3-vl-plus:** no function calling or batch in Singapore; Beijing has both.
- **qwen3.5-omni-plus:** no function calling, structured output or batch in Singapore.
- **qwen3.8-omni-flash** runs in six regions, Singapore included.
- **Realtime models** need the workspace endpoint: `wss://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api-ws/v1/realtime?model=...`.
- **qwen3-vl-flash** is missing from the live pricing page, so treat its Singapore availability as unconfirmed.
- **OCR is qwen3.5-ocr.** Default output is 4,096 tokens; the commercial manager raises it toward 8,192.

### Rerank and video

- **Rerank in Singapore:** qwen3-rerank. The older rerank model's 2026-05-30 change has passed.
- **Video generation (international):** billed per second of input plus output, with a temporary 30% discount. The listed prices belong to version 1.1.

### Billing rules

- The input-token tier sets the unit price for every token in a request, with K = 1,000.
- For qwen3.5-omni-flash text-plus-audio output, only the audio is billed.
- Free quota was removed for qwen3.5-omni-flash on 2026-10-29.
- "Free Quota Only" is off by default, so usage past the free quota is billed.

## Batch 5: production-practices (65 claims)

Results: 54 confirmed, 7 corrected, 1 contradicted, 2 not on page, 1 unavailable.

### Regulation

- **The EU AI Act's logging (Art. 12) and human-oversight (Art. 14) duties are law but not yet in force.** They apply to Annex III systems from 2027-12-02 and to Annex I systems from 2028-08-02.
- **Singapore hosting alone doesn't settle whether the Act applies.** It covers non-EU providers whose systems or outputs are used in the EU (Art. 2).

### Guidance, not mandates

- **AWS Well-Architected (Agentic AI lens):** idempotent execution, timeouts, tiered model selection and risk-tiered approvals are best practices, not mandates. Quote them as "AWS recommends".
- **Chunking:** no single strategy wins. Page-level chunking had the best average in one benchmark, with different winners per dataset.
- **RAGAS faithfulness** measures support from the retrieved context. A high score is not proof of factual accuracy.
- **MCP tool annotations** are untrusted hints unless the server is trusted. They don't enforce permissions.

### Shutdowns and data handling

- **OpenAI Evals:** the dashboard and API shut down on 2026-11-30, and existing evals have been read-only since 2026-10-31. Don't recommend it.
- **Global endpoints on other clouds don't guarantee where processing happens** (Google says so explicitly; Bedrock global cross-Region profiles route across regions). This is the same caveat as Model Studio's International scope, and it makes a useful parallel in proposals.

## Adjudicate-2: six open questions (GPT, live official pages)

- **AgentCore IM channels:** DingTalk, Lark (Feishu) and WeCom only, and only for managed agents. Other Alibaba products cover other apps: Chat App Message Service (WhatsApp, Viber, Messenger, Instagram, Telegram, LINE) and QwenWork (Slack, WhatsApp). DataWorks pushes data to Teams, which is outbound only. No KakaoTalk anywhere. Anything else is a custom adapter: a webhook feeding FC, which calls AgentCore's direct-access endpoint (`POST /ag-ui/agent`, SSE).
- **AgentCore status:** commercial pay-as-you-go, with billing since 2026-09-18 and Singapore supported. No page says "GA" explicitly, so show it as "commercial", not preview and not GA.
- **Model Studio knowledge base for new accounts:** blocked. Eligibility needs a Singapore application created before 2025-04-21, and account age alone doesn't count. `file_search` needs a knowledge-base ID, so it's blocked too. New accounts get their own retrieval: Tablestore Knowledge Storage, or DashVector plus embeddings.
- **qwen3.8-flash cache prices (International):** $0.20 per 1M to create the explicit cache; $0.016 per 1M for explicit and implicit hits alike. pricing.ts's 0.1875 is wrong.
- **Retirement wave (Notice 2217):** `qwen3.5-plus`, `qwen3.5-plus-2026-02-15`, `qwen3.5-plus-2026-04-20` and `qwen3.5-397b-a17b` reach end of marketing on 2026-11-18 and are decommissioned on 2027-01-19. The named replacement for all four is `qwen3.8-flash`.
- **Tablestore Knowledge and Memory Storage:** Singapore and Hong Kong supported. The only published rates are in CNY: knowledge storage is CNY 1.08/GB/month; long-term memory is CNY 0.002 per 10k entries per hour; short-term memory is CNY 0.00004 per 10k entries per hour; credits are CNY 1 per 100. The page contradicts itself on the memory meter (GB/month vs entries/hour). Show these as "reference rates; confirm Singapore pricing", not as a firm estimate.

## Batch 6: use cases (service, revenue, operations), diagram notation, cost sizing, presales (about 294 of 352 claims; the batch6s jobs cover the other 58)

Verdicts: 184 confirmed, 45 corrected, 10 contradicted, 5 china-only, 23 not on page, 8 unavailable, 19 not checked.

### Model prices, International scope (Singapore), per 1M tokens

| Model | Input | Output | Cache | Notes |
|---|---|---|---|---|
| qwen3.8-max | $2 | $6 | implicit hit $0.25; explicit read $0.17 | Web search works in Singapore but not in Global scope. No batch or fine-tuning in Singapore. |
| qwen-plus | $0.40 | $1.20 | — | For input ≤256K. Thinking output is $4 at ≤256K and $12 above it. For input >256K, $1.20 in / $3.60 out. |
| qwen-flash | $0.05 | $0.40 | implicit hit $0.01 | For input ≤256K. Above it, $0.25 in / $2 out. The $0.005 cache figure is Beijing/Global. |
| qwen3-coder-flash | $0.30 | $1.50 | — | For input ≤32K. Global scope is $0.144 / $0.574. |
| text-embedding-v4 | $0.07 | — | — | $0.072 is the Beijing price. No Batch Inference. |
| multimodal embeddings | text $0.09; vision-flash image/video $0.03 | — | — | — |
| qwen3-rerank | $0.10 | — | — | Beijing is $0.069. qwen3-vl-rerank has no Singapore price row, so treat it as unconfirmed. |

### Pricing rules

- **Cache ratios (International):**
  - implicit creation is billed at 100% and implicit hits at about 20%;
  - explicit creation is billed at 125% and explicit hits at about 10%;
  - each model can be an exception, so store cache prices per model, never as a ratio.
- **Batch inference** is 50% of the real-time price, for successful requests only. Singapore's batch model list is narrower than Beijing's: no qwen3.8-flash, no qwen3.8-max. Batch also excludes context caching and the free quota.
- **Free quota** covers International scope only, "typically" 1M tokens for 90 days per eligible model. The clock starts at activation, model release or approval, whichever is later. Many quotas were removed on 2026-10-29. "Free Quota Only" is off by default.
- **AI General-purpose Savings Plan** covers model-native tools, cache and batch, including in Singapore. It excludes fine-tuning, deployment and web-search fees.
- **Throughput Reservation (PTU), Singapore:** $20.16 per 10k TPM per day (Standard subscription).
- **Budget management:** auto-stop returns 429 errors, and Alibaba advises against using it in production. Budgets exclude training, PTU and DTU.
- **Rate limits:** RPM and TPM add up across RAM users, workspaces and keys under the primary account. A 429 means rate-limited; a 403 means quota exhausted. Per-second spikes can also throttle.

### Platform prices (Singapore unless noted)

- **AgentCore:**
  - compute $0.000015/CU; gateway $0.000000225/CU; storage $0.000042/CU; dedicated control plane $0.60/hour (international billing page);
  - separately billed dependencies: CloudMonitor, PrivateLink, SchedulerX3.
- **Function Compute:** the standard price is $0.000020/CU; the $0.000016 promotion has ended.
- **Agent Sandbox:**
  - regions: Hong Kong, Singapore and two US regions;
  - Economy $0.00000381 per vCPU-second, with memory and disk billed separately;
  - the billing page calls these "preview estimates", so present them as reference prices;
  - deep hibernation is still billed.
- **ACS (outside China):** best-effort vCPU $0.00000076/s; memory $0.00000038 per GiB-second.
- **API Gateway (cloud-native), Singapore:** apigw.small.x1 $0.402/hour plus data processing. The $0.291 figure is the mainland price.
- **ACK Pro** $0.09 per cluster-hour is a Hangzhou example; no Singapore rate was established.
- **Milvus, Singapore:** storage $0.0000416667 per GB-hour. No Singapore CU price was found.
- **OSS** $0.0173 per GB-month is an illustrative conversion, not a Singapore price.
- **Messaging:**
  - DirectMail: $0.29 per 1,000 messages; 2,000 free emails once per account (max 200 a day); the initial daily quota is 2,000 and depends on sender reputation.
  - Chat App Message Service: a platform fee of $0.005 per message since 2026-09-01 for Messenger, Instagram, Telegram and LINE, on top of WhatsApp's own pricing. WhatsApp service replies within the 24-hour window are free.
- **China-site only (not Singapore prices):** Model Studio Managed Agents' CNY 0.5/hour runtime fee, and the AgentCore CNY table.

### Availability

- **Application Development gate:** it's about having *created a Singapore application* before 2025-04-21, not account age. It covers console access and the application-data, knowledge-base and prompt-engineering APIs. It's preview with a production caution.
- **MCP via Responses API:** SSE servers only, at most 10 servers, and only listed models.
- **PAI LangStudio** retires on 2027-03-09. Its migration target, Model Studio applications, is Beijing-only, so there's no Singapore migration path.
- **Qoder:** the CN docs page doesn't prove international availability.
- **AgentRun:** "Quick Create" is low-code; AI Studio is the no-code option. Recommend code-first.
- **DTU (dedicated deployment)** is available in Singapore; qwen3.8-27b needs whitelist access.
- **AI Search Open Platform:** Shanghai and Frankfurt only, confirmed again.

### Data handling

- **Inference data** is retained for at most 30 days by default, with legal and service-security exceptions.
- **The privacy policy permits overseas transfer or access**, so Singapore storage isn't a residency guarantee.

### Benchmarks and quotes

Quote these as written:
- "agents use ~4× chat tokens, multi-agent ~15×" (Anthropic);
- RouteLLM: over 85% cost cut at 95% of GPT-4 quality on MT Bench;
- Gartner: at least 50% of GenAI projects abandoned after proof of concept by end-2025.

### Regulation

- **South Korea:**
  - the AI Basic Act and its decree took effect on 2026-01-22;
  - PIPA gives a qualified right to object to fully automated decisions that have significant effects.
- **EU AI Act:**
  - Annex III high-risk duties apply from 2027-12-02 and Annex I from 2028-08-02;
  - workplace emotion recognition has been banned since 2025-02-02, except for medical or safety reasons.
- **US:** the FCC's February 2024 ruling requires prior express consent for AI voices in calls, and written consent for telemarketing.
- **Presales sensitivity:** the US "Chinese military company" (CMC) designation of Alibaba (June 2026) stands. A 2026-10-26 preliminary injunction limits enforcement of only one provision. If the app mentions it at all, state it factually; don't characterise it.

### Competitors

- Google ADK deprecated SequentialAgent, ParallelAgent and LoopAgent in favour of Workflow.
- Google's Agent Designer was renamed Workflow Builder; GA in Gemini Enterprise on 2026-09-03.
- Microsoft: Foundry Agents (classic) retire on 2027-03-31; the Azure Assistants API is retired.
- Dynamics 365 agents went GA on 2025-10-25.

### Batch 6, last 58 claims (batch6s): 35 confirmed, 14 corrected, 2 contradicted, 4 china-only, 3 not on page

**International prices from the model-pricing page**
- **Older models:**
  - `qwen-max` (older): $1.60 input / $6.40 output.
  - qwen3-vl-plus at ≤32K: $0.20 / $1.60.
  - qwen-plus at ≤256K: $0.40 input; output $1.20 without thinking, $4 with thinking.
  - The Qwen alias above 256K input: $1.20 / $4.80.
- **OCR and images:**
  - `qwen-vl-ocr`: $0.07 / $0.16, billed by token, not per image.
  - qwen-image-2.0: $0.035 per image; qwen-image-2.0-pro: $0.075 per image.
- **qwen3.7-plus, Global scope:** $0.276 / $1.101 at ≤256K, with no batch support. The $0.143 batch input price is Beijing's.
- **Speech, Singapore (one GPT reading):**
  - `qwen-audio-3.1-asr-flash`: $0.15 / $0.47 per 1M tokens. This conflicts with the earlier $0.93 / $0.70 reading (which may be the streaming variant), so treat ASR prices as unconfirmed until checked.
  - `qwen-audio-3.0-asr-flash`: $0.000035 per second.
  - `qwen3-asr-flash-realtime`: $0.000090 per second.

**Pricing rules**
- **The price key needs more than scope:** region, exact model and version, input tier, thinking mode, billing unit and discount eligibility.
- **Batch API in Singapore:** for qwen3.8-max it covers multimodal input only; text-only input is excluded.
- **EventBridge:**
  - $0.82 per 1M events published to custom buses, counted in 64 KB units; publishing to the default bus is free;
  - custom-target pushes cost $0.91 per 1M;
  - cross-region transfer is extra.
- **SLS:** prices carry regional multipliers (for example 1.1× in the Netherlands, 1.2× in Saudi Arabia and Brazil).
- **PTU** guarantees throughput only within the purchased TPM quota.

**Availability**
- **Tablestore Knowledge Storage:** Beijing, Shanghai, Hangzhou, Shenzhen, Hong Kong and Singapore.
- **Agent Sandbox (ACS page on the China site):** public preview, CPU and memory only. That page doesn't establish Singapore. Adjudicate-4 settles this.
- **Deprecated models** (the Qwen2.5 series and others marked deprecated) can no longer be called.

**Benchmarks:** Forrester's win-rate gain was relative (20% to 20.5%). Salesforce's 62% is one customer's (Nexo's) result. Cite both with that scope.

## Adjudicate-3 and -4 (GPT, live official pages, 2026-11-02)

**Models**
- **OCR:** `qwen-vl-ocr` is the international model, at $0.07 / $0.16 (current alias qwen-vl-ocr-2025-11-20). `qwen3.5-ocr` shows only a Beijing price ($0.069 / $0.275), so its Singapore availability is not established. Don't offer it for Singapore.
- **qwen3.7-plus (International):**
  - ≤256K input: $0.40 / $1.60, implicit-cache hit $0.08, explicit-cache read $0.04, explicit-cache creation $0.50;
  - >256K input: $1.20 / $4.80, cache $0.24 / $0.12, creation $1.50;
  - function calling and batch are supported on the alias; the snapshot `qwen3.7-plus-2026-05-26` has no batch;
  - thinking and non-thinking output cost the same;
  - a limited-time 20% promotion is labelled separately.
- **qwen3-vl-flash:** its pages redirect and the pricing tables omit it. Not established; leave it out.
- **Idle-hour discounts (International):** they exist only for listed DeepSeek models: v4.1-flash, v4.1-flash-1017, v4-pro-0813 and v4-flash-0731, all at half price from 22:00 to 08:00 UTC+8. The flat `deepseek-v4-pro` alias doesn't inherit them. Qwen's Global-scope night promotions don't apply to International.

**Approval steps**
- **CloudFlow:**
  - Singapore endpoint `ap-southeast-1.fnf.aliyuncs.com`;
  - the callback pattern (`ReportTaskSucceeded` / `ReportTaskFailed` with a task token) is documented for approvals;
  - the current names are `WaitForCustomCallback` and `WaitForSystemCallback`, in Standard mode only;
  - Standard mode allows up to 1 year for the whole execution, not per task;
  - 5,000 free transitions a month, then $0.25 per 10,000, from the previous-version billing page; the current version started billing on 2025-10-10. Label the price "reference".
- **AgentCore team tasks:** reviewer acceptance, pause and resume are documented on the international site. The page doesn't establish Singapore for the feature or a managed-agents-only limit. Call it an AgentCore team-task feature, not a general approval API.

**Platforms**
- **AgentLoop:** the supported-regions page lists Hangzhou, Shanghai and Hong Kong. An API endpoint for Singapore exists, but service availability there isn't established. Use Hong Kong as the documented non-mainland option.
- **Agent Sandbox:**
  - GA (announced 2026-09-22), with Flash and Container editions in Singapore;
  - reference rates outside China, per second: Economy $0.00000381 per vCPU and $0.00000191 per GiB of memory; Default $0.00000496 and $0.00000248; disk $0.0000000703 per GiB;
  - 15 GiB of disk is included while active; hibernation and snapshots are billed;
  - the older Function Compute billing page that says "invite-only preview" covers a different billing mechanism.
- **DashVector, Singapore:** $0.06/hour for P.small and $0.045/hour for S.small, × replicas, billed per second and settled hourly. No separate storage meter.
- **EventBridge:**
  - $0.82 per 1M events published to custom buses; publishing to the default bus is free;
  - delivery to Alibaba Cloud targets is free; custom targets cost $0.91 per 1M;
  - events are counted in 64 KB units, and no recurring free quota is established;
  - HTTP/HTTPS sources give a webhook URL for external email or SaaS webhooks.
- **Telephony, international:** not established.
  - Voice Service offers direct inward dialling from Singapore, but no SIP and no real-time full-duplex agent calls.
  - Cloud Contact Center can't be confirmed for international purchase.
  - IMS plus ARTC is documented for agents in apps and web, not phone numbers. A bring-your-own SIP trunk is documented only on the China site.

  The app must not offer an off-the-shelf inbound phone line. Draw it as a carrier or partner line that needs country and account confirmation.
- **Chat App Message Service (international):**
  - channels: WhatsApp, Messenger, Instagram, Viber, Telegram, LINE, SMS and email;
  - since 2026-09-01, Messenger, Instagram, Telegram and LINE each cost $0.005 per message, charged even if delivery fails;
  - WhatsApp and Viber cost $0.005 per message or conversation plus the channel's own fees;
  - SMS and email carry no Chat App Message Service fee.
- **Built-in tools (Responses API, Singapore):**
  - `qwen3.8-max` supports web_search, web_extractor, code_interpreter, image_search and MCP;
  - `qwen3.8-flash` is confirmed for web_search only (the other tool pages list Flash up to 3.7);
  - web_extractor and code_interpreter are free for a limited time, but their tokens are billed;
  - MCP costs tokens plus whatever each server charges.

## Batch 7: usecases-documents (56 claims)

Results: 33 confirmed, 13 corrected, 1 contradicted, 4 china-only, 5 not on page.

**Documents and OCR (Singapore)**
- **PDF understanding:** $0.0033 per parsed page, on top of model tokens. `qwen3.8-27b` PDF input is Beijing-only. The Responses API can return HTTP 200 without the PDF reaching the model, so a design should check that the content was actually read.
- **`qwen-vl-ocr` (International):** $0.07 / $0.16, with no batch in Singapore; the $0.022 / $0.036 batch rates are Beijing's.
- **Beijing-only document models (keep out of international designs):**
  - Qwen-Doc-Turbo, including its free document parsing;
  - Qwen-Long's 10M-token file mode. Direct HTTP requests take up to 1M tokens.

**Prices (International / Singapore)**

| Model | Price per 1M tokens | Note |
|---|---|---|
| `qwen-max` (older) | $1.60 / $6.40 | no tiers |
| `qwen3-rerank` | — | up to 4,000 tokens per item and 120,000 per request; `gte-rerank` was discontinued on 2026-05-30 |
| `text-embedding-v4` | $0.07 | — |

The rates the report quoted for qwen-mt and others were Global or Beijing rows. Several International rows are higher: $2.46 / $7.37, $0.16 / $0.49 and $0.12 / $0.36 for the models cited.

**Other products**
- **Qwen-MT:** Lite covers 31 languages; Plus and Flash cover 92. It translates single turns only and takes no system message.
- **Savings plan:** the 47% discount applies only to Category B, 24 months, all upfront, and a commitment of at least $150,000 a month. Unused monthly quota expires.
- **AgentLoop:** the general region list omits Singapore, but the multimodal evaluator docs list it. Availability varies by feature.
- **SMS, Singapore destination:** per message, from $0.045 (1K package) down to $0.030 (200K package).
- **Chat App Message Service Agentic Journey:** six overseas channels including LINE. KakaoTalk and Zalo aren't established.
- **Alibaba's HITL agent-security guide** covers CLI operations through OpenClaw, not every agent's cloud API calls.

**Regulation (e-invoicing)**
- **Vietnam:** e-invoices have been mandatory since 2022-07-01, with exceptions. Registration for foreign suppliers is voluntary.
- **Malaysia:** taxpayers below RM3 million annual turnover are exempt (timeline updated 2026-08-30). A transaction-level RM10,000 rule isn't established.
- **EU AI Act Article 50(2):** synthetic-content systems already on the market before 2026-08-02 have until 2026-12-02.

## Ruling: the ASR price "conflict" (2026-11-02)

There are two models, not one:
- **`qwen-audio-3.1-asr-flash`** (recorded audio and file transcription): $0.15 / $0.47 per 1M tokens, International (batch4-1 models-11 and models-66).
- **`qwen-audio-3.1-asr-flash-streaming`** (live): $0.93 / $0.70.

The Batch 4 line above that gives $0.93 / $0.70 for "qwen-audio-3.1-asr-flash" means the streaming variant. `models.json` lists both.

## Video models (checked 2026-11-03)

Source: the local `wan-research.md` Qwen research report. The orchestrator checked the
International pricing rows and model-selection page on 2026-11-03; this implementation
made no network calls. Rates below are USD per second of output, for the International
Singapore deployment scope (`ap-southeast-1`). Global-scope CNY-derived duplicates are
not used. Free quotas and promotional discounts are not deducted by the estimator.

- Pricing, checked 2026-11-03: https://www.alibabacloud.com/help/en/model-studio/model-pricing
- Selection, checked 2026-11-03: https://www.alibabacloud.com/help/en/model-studio/video-generate-edit-model/

### Video models: wan3.0-video

Checked 2026-11-03: International list prices 480P $0.05, 720P $0.10, 1080P $0.20;
30 s free quota. The pricing page labels this model "Limited-time 30% off"; use list
prices. The selection page lists text/image-to-video and reference-to-video.
Prices: https://www.alibabacloud.com/help/en/model-studio/model-pricing
Selection: https://www.alibabacloud.com/help/en/model-studio/video-generate-edit-model/

Text, image, reference, video and audio input; up to 30 s, 30 fps; audio on by default:
per the Qwen research report, cited page https://www.alibabacloud.com/help/en/model-studio/wan3-0-video
and https://www.alibabacloud.com/help/en/model-studio/wan3-video-generation-api-reference .
The report states input plus output is at most 30 s for video references. The estimator
assumes no billable reference-video input and names that limitation.

### Video models: wan3.0-video-prime

Checked 2026-11-03: International list prices 480P $0.068, 720P $0.14, 1080P $0.28;
no free quota. The selection page lists text/image-to-video and reference-to-video.
Prices: https://www.alibabacloud.com/help/en/model-studio/model-pricing
Selection: https://www.alibabacloud.com/help/en/model-studio/video-generate-edit-model/

Accelerated Wan 3.0 with the same input modes and audio, up to 30 s at 30 fps:
per the Qwen research report, cited page https://www.alibabacloud.com/help/en/model-studio/wan3-0-video-prime
and https://www.alibabacloud.com/help/en/model-studio/wan3-video-generation-api-reference .

### Video models: happyhorse-1.1-t2v

Checked 2026-11-03: International list prices 480P $0.07, 720P $0.14, 1080P $0.18;
10 s free quota. The selection page recommends it for videos with audio from text prompts.
Prices: https://www.alibabacloud.com/help/en/model-studio/model-pricing
Selection: https://www.alibabacloud.com/help/en/model-studio/video-generate-edit-model/

3-15 s at 24 fps with native audio: per the Qwen research report, cited page
https://www.alibabacloud.com/help/en/model-studio/happyhorse-text-to-video-api-reference
and https://www.alibabacloud.com/help/en/model-studio/video-generate-edit-model/ .

### Video models: happyhorse-1.1-i2v

Checked 2026-11-03: International list prices 480P $0.07, 720P $0.14, 1080P $0.18;
10 s free quota. The selection page lists image-to-video.
Prices: https://www.alibabacloud.com/help/en/model-studio/model-pricing
Selection: https://www.alibabacloud.com/help/en/model-studio/video-generate-edit-model/

First frame and prompt input, 3-15 s at 24 fps with native audio: per the Qwen research report,
cited page https://www.alibabacloud.com/help/en/model-studio/video-generate-edit-model/ .

### Video models: happyhorse-1.1-r2v

Checked 2026-11-03: International list prices 480P $0.07, 720P $0.14, 1080P $0.18;
10 s free quota. The selection page lists reference-to-video.
Prices: https://www.alibabacloud.com/help/en/model-studio/model-pricing
Selection: https://www.alibabacloud.com/help/en/model-studio/video-generate-edit-model/

1-9 reference images plus prompt, 3-15 s at 24 fps with native audio:
per the Qwen research report, cited page https://www.alibabacloud.com/help/en/model-studio/happyhorse-reference-to-video-api-reference
and https://www.alibabacloud.com/help/en/model-studio/video-generate-edit-model/ .

### Video models: wan2.7-t2v

Checked 2026-11-03: International list prices 720P $0.10, 1080P $0.15; no free quota.
The selection page gives text-to-video, 720P/1080P, 2-15 s at 30 fps, with audio sync.
Prices: https://www.alibabacloud.com/help/en/model-studio/model-pricing
Selection: https://www.alibabacloud.com/help/en/model-studio/video-generate-edit-model/

### Video models: wan2.7-i2v

Checked 2026-11-03: International list prices 720P $0.10, 1080P $0.15; no free quota.
Prices: https://www.alibabacloud.com/help/en/model-studio/model-pricing
First or first-and-last frames plus prompt, 2-15 s with audio: per the Qwen research report,
cited page https://www.alibabacloud.com/help/en/model-studio/image-to-video-general-api-reference .
Only text and image inputs are represented; continuation is not assumed to establish direct video input.

### Representation and estimator decisions

- Families are `wan` and `happyhorse`, rather than labeling these models Qwen. `mid`
  is the workflow creation tier, matching image creation. Function calling is false;
  built-in tools and batch support are unestablished (`null`). All seven use task `create`.
- `ga` follows the report's available-API interpretation. Wan's API preview wording
  conflicts with its official-launch announcement, per the Qwen research report, cited page
  https://www.alibabacloud.com/en/news/product/video-generation-model-wan30-officially-launched-nsb .
- `price.unit: second`, numeric tier `resolution`, and optional `video` duration limits
  are additive. Prompt notes expose modes, audio, duration, resolution and established fps;
  neither rates nor free quotas are rendered in the prompt.
- One clip per step pass (one per simple run); repeats and retries use existing multipliers.
  Typical defaults to 15 s/720P; upper is 30 s or the model maximum/1080P. Step overrides
  are `clipSeconds` and `resolution`; seconds round up and clamp to model limits.
  Unsupported resolutions remain unpriced, never silently substituted. Native audio is included.
- `VideoEstimateSettings` extends the existing per-step shape inside `workflow-estimate.ts`.
  `types.ts` is pinned and outside ownership, so the session contract is not edited.
  UI integration needs its step settings type, request-admission allowlist, web settings
  edit union/bounds, persistence validation and explicit cost controls to preserve these fields.
  The existing UI is not a generic driver editor. Its localized coverage strings also need
  to consume the estimator's new video coverage; no web or admission files are changed here.
  Specifically: `packages/core/src/types.ts`, `apps/server/src/request.ts`,
  `apps/web/src/workflow/settings.ts`, `apps/web/src/panel/WorkflowCost.tsx`,
  `apps/web/src/workflow/panel-model.ts` and `apps/web/src/i18n/strings.json` need integration.
  The panel's explicit unit/assumption/reason translation maps need `second`, video
  assumptions and new unpriced reasons. Until then those display generic fallback text,
  and the hard-coded panel coverage still excludes video even though the subtotal prices it.

### Video change validation (2026-11-03)

Full suites ran once each using `npm.cmd test`:

| Suite | Passed | Failed | Total |
| --- | ---: | ---: | ---: |
| Root (core, eval, server) | 1125 | 0 | 1125 |
| Web | 718 | 1 | 719 |
| Worker | 276 | 0 | 276 |

The web failure is `the logos render in Chrome`, `scripts/icons/test/icons.test.ts:209`:
Puppeteer timed out after 30,000 ms. Its isolated rerun also failed (0/1) with the same
timeout. An earlier occurrence is already recorded in the workflow eval README; no web files changed.

Core and web initially reported a possibly-undefined model in the new video branch.
An explicit model guard fixed the narrowing; both typechecks passed on rerun. Worker
typecheck passed on its first run. The estimator's focused suite passed 87/87 after
that guard change; the full suites were not repeated.

`node eval/check-cases.ts`: 174 cases, 207 turns, all well formed (65 workflow cases).
Workflow prompt: 10,181 estimated tokens, band 10,000-10,499, ceiling 15,000.
Cloud `buildSystemPrompt(loadCatalog())` SHA-256 passed:
`998fab223daba0a4407930f0f6f61e90cf100d7783ca4b13008636526d049313`.

Files changed: `packages/core/catalog/models.json`; `packages/core/src/models.ts`,
`workflow-estimate.ts`, `workflow-estimate-limits.ts`, `workflow-prompt.ts`; their
`models.test.ts`, `workflow-estimate.test.ts`, `workflow-prompt.test.ts` tests;
this NOTES file; `eval/cases-workflow/README.md`; `eval/test/workflow.test.ts`.
Files created: `eval/cases-workflow/wf-video-ad.json` and `wf-ko-video-ad.json`.

Departures/remaining work: pinned shared settings and admission files prevent end-to-end
editing/persistence of the new estimator overrides; the explicit UI needs the integration
listed above. The existing eval schema has no exact-model allowlist or no-gap assertion:
those requirements live in judge references and the offline fake-runner regression,
with model mentions and common false-availability claims checked by existing assertions.
Extending those generic assertions requires unowned `eval/workflow.ts`/`eval/lib.ts`.
Live generation/judge quality was not measured. No network or live model calls, deployments
or commits were made; the supplied brief and research report were left untouched.
