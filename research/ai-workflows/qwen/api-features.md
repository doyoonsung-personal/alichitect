I'll research this systematically, starting with the core API surfaces.

Let me dig into the specific documentation pages.

# Model Studio API features for building agents — international (Singapore default)

Research date: 2026-11-02. All prices/limits below are as published on the cited pages on that date; several are region-specific and promotional ("limited-time"), so the app should treat them as values to re-fetch, not constants.

Nothing I found contradicts the facts verified on 2026-10-31. I re-confirmed three of them: Model Studio's international regions are Beijing, Virginia, Singapore, Tokyo, Frankfurt, Hong Kong (no Seoul) [https://www.alibabacloud.com/help/en/model-studio/what-is-model-studio]; qwen3.8-max is $2 / $6 per 1M input/output tokens, International scope [https://www.alibabacloud.com/help/en/model-studio/model-pricing]; and the pre-2025-04-21 Singapore-app restriction is still printed on the Agent/Workflow/Knowledge base/Application-Calling pages [https://www.alibabacloud.com/help/en/model-studio/application-introduction].

---

## 1. API surfaces

Model Studio publishes four text-generation interfaces and says so explicitly on one index page: OpenAI-compatible Chat Completions, OpenAI-compatible **Responses** ("ships with built-in web search, code interpreter, and web extractor. Conversation history is managed automatically"), **Anthropic-compatible Messages API**, and **DashScope** ("Model Studio's native interface. Provides the most complete set of features and parameters") [https://www.alibabacloud.com/help/en/model-studio/qwen-api-reference/].

| Surface | Doc URL | Notes for the app |
|---|---|---|
| OpenAI-compatible Chat Completions | https://www.alibabacloud.com/help/en/model-studio/qwen-api-via-openai-chat-completions | Drop-in OpenAI client; supported models include Qwen LLMs (commercial + open source), Qwen-VL, Qwen-Coder, Qwen-Omni, Qwen-Math, DeepSeek, Kimi [https://www.alibabacloud.com/help/en/model-studio/compatibility-of-openai-with-dashscope] |
| OpenAI-compatible Responses | https://www.alibabacloud.com/help/en/model-studio/qwen-api-via-openai-responses and https://www.alibabacloud.com/help/en/model-studio/compatibility-with-openai-responses-api | The only surface that carries built-in server-side tools (see §4). **Context limit: max input ≈ 80% of the model's window**, to reserve room for built-in tool calls and reasoning; overflow auto-truncates [https://www.alibabacloud.com/help/en/model-studio/qwen-api-via-openai-responses] |
| OpenAI-compatible Conversations | https://www.alibabacloud.com/help/en/model-studio/openai-compatible-conversations | Used with the Responses API to auto-inject conversation history [https://www.alibabacloud.com/help/en/model-studio/openai-compatible-conversations] |
| Anthropic-compatible Messages | https://www.alibabacloud.com/help/en/model-studio/anthropic-api-messages | Migrate by changing three settings; clients such as Claude Desktop/Claude Code auto-append `/v1/models` to the base URL, which must be handled [https://www.alibabacloud.com/help/en/model-studio/anthropic-api-messages] |
| DashScope native | https://www.alibabacloud.com/help/en/model-studio/qwen-api-via-dashscope | Most complete parameter set |
| Assistant API | https://www.alibabacloud.com/help/en/model-studio/quick-start-of-assistant-api | **Deprecated** — see §13 |

**SDKs.** Official DashScope SDKs for Python and Java; OpenAI SDKs supported for Python, Node.js, Java and Go for OpenAI-compatible calls; DashScope Python SDK requires Python ≥ 3.9 [https://www.alibabacloud.com/help/en/model-studio/install-sdk]. A DashScope SDK Expert CLI assistant is built into the `dashscope` Python SDK ≥ 1.27.3 [https://help.aliyun.com/en/model-studio/dashscope-sdk-expert] — **China site only**.

**Endpoints (Singapore).** Three endpoint types per region: workspace-specific, DashScope, and trial [https://www.alibabacloud.com/help/en/model-studio/singapore-regional-access-information]. Workspace-specific OpenAI-compatible base URL: `https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1` [https://www.alibabacloud.com/help/en/model-studio/compatibility-of-openai-with-dashscope]; migration path from `https://dashscope-intl.aliyuncs.com` [https://help.aliyun.com/en/model-studio/compatibility-of-openai-with-dashscope] — **China site only**. API keys are region-bound: calling a region's base URL requires a key created in that region [https://www.alibabacloud.com/help/en/model-studio/compatibility-of-openai-with-dashscope]. Workspace-dedicated domains exist only for Beijing, Singapore and Hong Kong [https://www.alibabacloud.com/help/en/model-studio/compatibility-with-openai-responses-api]. The legacy DashScope domain stops receiving new features after 2026-09-30 [https://help.aliyun.com/en/model-studio/regions] — **China site only**; the international Base URL page also calls it "Legacy shared domain… migration to a workspace-dedicated domain is recommended" [https://www.alibabacloud.com/help/en/model-studio/base-url].

Third-party agent/coding tools: Model Studio "supports any third-party programming tool compatible with OpenAI or Anthropic API protocols that allows custom endpoints" [https://www.alibabacloud.com/help/en/model-studio/more-tools].

---

## 2. Function calling

Doc: https://www.alibabacloud.com/help/en/model-studio/qwen-function-calling (Chat Completions + DashScope); Responses API tool schema in https://www.alibabacloud.com/help/en/model-studio/qwen-api-via-openai-responses.

| Aspect | Finding | Source |
|---|---|---|
| Parallel tool calls | Supported via `parallel_tool_calls`. **kimi-k3 does not support `parallel_tool_calls`** to control whether calls are parallel | https://www.alibabacloud.com/help/en/model-studio/qwen-function-calling |
| `tool_choice` | Default `"auto"` (LLM decides). **Qwen series models do not support `tool_choice="required"`** — in non-thinking mode `required` cannot guarantee a tool is always called, and in thinking mode it conflicts | https://www.alibabacloud.com/help/en/model-studio/qwen-function-calling and https://www.alibabacloud.com/help/en/model-studio/qwen-api-via-dashscope |
| `tool_choice` / `parallel_tool_calls` unsupported | Qwen-Omni-Realtime series supports neither parameter | https://help.aliyun.com/zh/model-studio/qwen-function-calling — **China site only** |
| Streaming tool calls | Supported; "streaming output lets you obtain the tool function name and input parameter information in real time" | https://www.alibabacloud.com/help/en/model-studio/qwen-function-calling |
| Tool count limit | No hard cap published. Guidance: **"we recommend providing no more than 20 tools to the main model"** for optimal accuracy; if more are needed, use a retrieval/routing pattern | https://www.alibabacloud.com/help/en/model-studio/qwen-function-calling |
| Bad `tool_choice` | Returns a 400-class error; fix is `"auto"` or a specific function | https://www.alibabacloud.com/help/en/model-studio/error-code |
| Responses-API interaction | Built-in tools and reasoning consume context: effective max input ≈ 80% of window | https://www.alibabacloud.com/help/en/model-studio/qwen-api-via-openai-responses |

**Drawing-rule implication:** never render a "force this tool" node for Qwen models (`tool_choice="required"` is rejected); render "model decides" (`auto`) or a named function. Cap the tools fan-out visual at ~20 and warn above it.

---

## 3. Structured output

Doc: https://www.alibabacloud.com/help/en/model-studio/qwen-structured-output

* Two modes: **JSON Object** (`response_format={"type":"json_object"}`) — guarantees a valid JSON string but *not* the schema; and **JSON Schema** — "precise control over the output structure and types, eliminating additional validation" [https://www.alibabacloud.com/help/en/model-studio/qwen-structured-output].
* Supported models (as listed): Qwen-Max: Qwen3.8-Max series, Qwen3.x-Max; Qwen-Max (non-thinking mode); Qwen-Plus; Qwen-Plus (non-thinking mode); and the page adds "Qwen3.8-Max series, and Qwen3.8-Flash series models. More models coming soon" [https://www.alibabacloud.com/help/en/model-studio/qwen-structured-output] and [https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen-structured-output].
* Whether the JSON Schema mode is *strict* (grammar-constrained decoding) vs. best-effort prompt-level is **not stated** on the page I could reach → **unconfirmed**. Third-party testing of Qwen structured outputs is inconsistent across providers [https://www.requesty.ai/blog/structured-outputs-across-llm-providers-the-compatibility-mess], so the app should keep a validator in the loop rather than promise schema guarantee.
* Related: a separate "JSON mode" doc is referenced by third parties as `model-studio/json-mode` [https://github.com/anomalyco/models.dev/blob/dev/providers/alibaba/models/qwen-max.toml].

---

## 4. Built-in (server-side) tools

All built-in tools are exposed through the **Responses API** `tools` array; the same capabilities appear on the Anthropic-compatible API under different tool names (`web_fetch` for the web extractor) [https://www.alibabacloud.com/help/en/model-studio/web-extractor] [https://www.alibabacloud.com/help/en/model-studio/deepseek-v4-1-flash]. Response output items are typed: `web_search_call`, `web_extractor_call`, `image_search_call`, `function_call`, `mcp_call` [https://www.alibabacloud.com/help/en/model-studio/retrieve-a-response].

| Tool (`type`) | What it does | Models | Price per call | Source |
|---|---|---|---|---|
| `web_search` | Live internet retrieval; also available on Chat Completions/DashScope via `enable_search` + `search_strategy` (`turbo`, `max`, `agent`, `agent_max`) | Qwen3.8 Max/Flash and open-source series (excluding Omni); Qwen3.7 Max/Plus/Flash; Qwen3.6-Plus and Qwen3.x; DeepSeek and Kimi variants differ. `kimi-k3` supports web search **only** via the Responses API `web_search` tool, not `enable_search`. `qwen3.8-omni-flash` supports **only** `web_search` | **Singapore: $10.00 per 1,000 calls.** Beijing/HK/Tokyo/Frankfurt/Virginia use different (much lower) USD/CNY figures — the intl page shows `$0.573411` per 1,000 for one non-Singapore deployment; the China page lists CNY 3/1,000 (`turbo`) and CNY 4/1,000 (`max`), Beijing-only. Billed only when retrieval actually completes and returns a successful result; count is in `usage.…count` | https://www.alibabacloud.com/help/en/model-studio/web-search ; https://help.aliyun.com/en/model-studio/web-search (China site only) ; https://www.alibabacloud.com/help/en/model-studio/qwen-api-via-openai-responses |
| `web_extractor` (Anthropic API: `web_fetch`) | Web scraping / page reader. **Must be used together with `web_search`**; on Chat Completions set `enable_search=true`, `search_strategy=agent_max`, `enable_thinking=true` | `qwen3.8-*-1-flash-1017` supports it in the Responses API and as `web_fetch` in the Anthropic-compatible API **in all six regions**; supported models: Qwen3.8 Max/Flash and open-source series, Qwen-Max (3.8/3.7 series), Qwen-Plus (3.7) | **Free for a limited time** (promotional; the same billing policy covers both web search and web extractor) | https://www.alibabacloud.com/help/en/model-studio/web-extractor ; https://docs.modelstudio.console.alibabacloud.com/en/model-studio/web-extractor ; https://www.alibabacloud.com/help/en/model-studio/web-search |
| `code_interpreter` | Built-in Python execution | Listed for deepseek-v4.1-flash Responses API (`web_search`, `web_extractor`, `code_interpreter`) and for Qwen3.8-Max; recommended alongside `web_extractor` for math/data-analysis accuracy | **"Code Interpreter is free for a limited time but increases token consumption"** — no per-call price published | https://www.alibabacloud.com/help/en/model-studio/qwen-code-interpreter ; https://www.alibabacloud.com/help/en/model-studio/web-extractor ; https://www.alibabacloud.com/help/en/model-studio/deepseek-v4-1-flash |
| `t2i_search` (text-to-image search) | Searches the internet for images matching a text description; model can then describe/use them | Qwen3.8-Max family and other Responses-API models | **$8 per 1,000 calls (Singapore)**; $3.44 per 1,000 (Beijing) | https://www.alibabacloud.com/help/en/model-studio/web-search-image.md ; https://docs.modelstudio.console.alibabacloud.com/en/model-studio/web-search-image |
| `image_search` (search by image) | Reverse image search from an input image; `tools=[{"type":"image_search"}]` | Responses API only | Doc states **$8.00 per 1,000 calls**; the region label was truncated in the snippet I could retrieve → region **unconfirmed** (text-to-image search is $8 in Singapore) | https://www.alibabacloud.com/help/en/model-studio/image-search ; https://www.alibabacloud.com/help/en/model-studio/qwen-api-via-openai-responses |
| `file_search` (knowledge retrieval) | RAG over a Model Studio knowledge base. `vector_store_ids` is **required** and **only one knowledge base ID is currently supported** | Responses API | Model call fees (retrieved chunks are injected into the prompt → more input tokens) **plus** knowledge base fees (embedding/rerank/storage) | https://www.alibabacloud.com/help/en/model-studio/qwen-api-via-openai-responses ; https://docs.modelstudio.console.alibabacloud.com/en/model-studio/file-search ; https://help.aliyun.com/en/model-studio/file-search (China site only) |
| `mcp` | Remote MCP server as a tool (see §5) | Responses API | No separate tool fee documented; tokens for imported tool definitions and calls are billed as model tokens (**unconfirmed** — not stated on the intl page) | https://www.alibabacloud.com/help/en/model-studio/mcp |

### Does `file_search` depend on the closed knowledge base? — **Yes**

`file_search` requires a `vector_store_ids` value, i.e. an existing Model Studio knowledge base ID [https://www.alibabacloud.com/help/en/model-studio/qwen-api-via-openai-responses]. Knowledge base creation lives behind the same restriction as the no-code apps:

* "**Console access restrictions:** Only users who created Alibaba Cloud Model Studio applications in the Singapore region before April 21, 2025 can access the [Application Data / knowledge base console]" [https://www.alibabacloud.com/help/en/model-studio/rag-knowledge-base] [https://www.alibabacloud.com/help/en/model-studio/build-knowledge-base-qa-assistant-without-coding].
* "**API call restrictions:** Only users who created Alibaba Cloud Model Studio applications in the Singapore region before April 21, 2025 can call the **application data, knowledge base, and prompt engineering APIs**" [https://www.alibabacloud.com/help/en/model-studio/data-import-instructions] [https://www.alibabacloud.com/help/en/model-studio/application-data/] [https://www.alibabacloud.com/help/tr/model-studio/rag-knowledge-base].

So for a **new** international customer the app must not draw a Model Studio knowledge base behind `file_search`. The supported substitute pattern is retrieval done by the customer's own runtime (AgentRun's knowledge-base integration supports Model Studio *and* RAGFlow [https://www.alibabacloud.com/help/en/agentrun/knowledge-base-integration-guide]), or Tablestore Knowledge Storage Service, which offers serverless RAG with knowledge-base creation, document upload and search APIs, up to 100M documents per KB by default [https://www.alibabacloud.com/help/en/tablestore/table-store-service/knowledge-storage-introduction]. Note the AgentCore KB guide's worked example creates the Model Studio workspace and knowledge base **in China (Beijing)** [https://www.alibabacloud.com/help/en/agentcore/connect-the-refined-knowledge-base-in-the-agentcore.md].

Also relevant for cost accuracy: a Model Studio savings plan does **not** cover embedding/rerank fees incurred through Knowledge Base [https://www.alibabacloud.com/help/en/model-studio/savings-plan-and-resource-package]; savings plans do cover built-in tool calls (function call, web extractor), context cache and batch inference [https://www.alibabacloud.com/help/en/model-studio/savings-plan-and-resource-package].

A separate, cheaper web-search path exists for subscription plans: for Token Plan/Coding Plan harness tools, web search has free calls for all users and is then billed at CNY 29 per 1,000 calls [https://help.aliyun.com/en/model-studio/web-search] — **China site only**.

---

## 5. MCP

**Can the APIs call a customer's remote MCP server directly? Yes — via the Responses API `mcp` tool.**

* "Add MCP server information in the `tools` parameter when using the Responses API. Get the Server-Sent Events (SSE) endpoint and authentication information for the MCP service from platforms such as ModelScope. Supports MCP…" [https://www.alibabacloud.com/help/en/model-studio/mcp].
* Parameter shape: `type` fixed as `"mcp"`, `server_url` (**required**) = the MCP service endpoint URL, `headers` (optional), plus a `server_label` and tool-allow listing [https://www.alibabacloud.com/help/en/model-studio/qwen-api-via-openai-responses] [https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen-api-via-openai-responses].
* MCP calls surface as `mcp_call` output items, and MCP servers can be added/updated at runtime through client events; "every addition or update requires both `server_label` and `server_url`; a label alone cannot reuse an existing configuration" [https://www.alibabacloud.com/help/en/model-studio/client-events].

**Marketplace / hosted MCP servers internationally — weak evidence, treat as not available.**

* The international `MCP` page describes *connecting to* MCP services (SSE endpoints obtained from platforms such as ModelScope), not a hosted catalogue [https://www.alibabacloud.com/help/en/model-studio/mcp].
* The hosted/marketplace material is on the China site: "Official MCP services: Alibaba Cloud Model Studio offers several official MCP services that you can readily connect to" [https://help.aliyun.com/en/model-studio/mcp-introduction]; one-click enable of an official service (Amap Maps example) from the Model Studio **MCP page** [https://help.aliyun.com/en/model-studio/official-and-third-party-mcp]; Model Studio "supports hosting MCP service code… using Function Compute (FC)" plus two other custom-deployment methods [https://help.aliyun.com/en/model-studio/custom-mcp] — **China site only**.
* "MCP Square" in the Model Studio console left-nav is documented only on China-site pages [https://help.aliyun.com/en/simple-application-server/use-cases/openclaw-faq]; the MCP Marketplace deep link points at `bailian.console.aliyun.com/cn-beijing` [https://qwenlm.github.io/qwen-code-docs/en/developers/tools/web-search/]. Lingma's agent page says it "integrates with ModelStudio MCP Square" but does not state a region [https://www.alibabacloud.com/help/en/lingma/agent].
* Hologres states it "is integrated with the official MCP service in Model Studio. Deploy the MCP Server directly in Model Studio" [https://www.alibabacloud.com/help/en/hologres/user-guide/hologres-mcp-server], but the how-to is a China-site page [https://help.aliyun.com/en/hologres/user-guide/deploy-hologres-mcp-server-based-on-model-studio].

→ **International MCP marketplace / Model-Studio-hosted MCP servers: unconfirmed.** The app should draw MCP as "customer-hosted remote MCP server, called by the Responses API `mcp` tool", and only offer "Model Studio-hosted MCP" if the customer is on Beijing or can prove console access. Alternative Alibaba-hosted MCP paths that *are* documented internationally: AI Gateway MCP Management (create MCP service, sync Nacos-registered servers) [https://www.alibabacloud.com/blog/accelerating-ai-integration-with-alibaba-cloud%E2%80%99s-model-context-protocol-mcp_602490], the Alibaba Cloud OpenAPI MCP Server [https://github.com/aliyun/alibabacloud-api-mcp-server/blob/main/README-EN.md], SLS MCP Server [https://www.alibabacloud.com/help/en/sls/sls-mcp-server], and Tablestore MCP Server [https://www.alibabacloud.com/help/en/tablestore/memory-storage-service-sub-product-test/tablestore-mcp-server].

---

## 6. Context cache

Docs: https://www.alibabacloud.com/help/en/model-studio/context-cache and https://www.alibabacloud.com/help/en/model-studio/explicit-cache-guide

| Property | Implicit cache | Explicit cache |
|---|---|---|
| How it works | Automatic; caches the common prefix of repeated requests, improving speed and lowering cost [https://www.alibabacloud.com/help/en/model-studio/context-cache] | Add `"cache_control": {"type": "ephemeral"}` to the message content you want pinned; guarantees a deterministic hit within the validity window [https://www.alibabacloud.com/help/en/model-studio/explicit-cache-guide] [https://www.alibabacloud.com/help/en/model-studio/context-cache] |
| Discount | Cache-served input "typically billed at **20% of the standard input token price**"; discount rate varies by model [https://www.alibabacloud.com/help/en/model-studio/context-cache]. A price-reduction notice moved some models from 40% of `input_token` price to a lower rate [https://www.alibabacloud.com/en/notice/model_studio_context_cache_price_reduction_for_certain_models_578?_p_lc=1] | Creation costs a **25% surcharge** over standard input price; each subsequent hit **saves 90%**; one hit is enough to break even [https://www.alibabacloud.com/help/en/model-studio/explicit-cache-guide] |
| Minimum length | **1,024 tokens** — "Reaching 1,024 tokens only means the request meets the technical conditions for a cache hit, but does not guarantee an actual hit"; for Zhipu-deployed GLM models the minimum is **512** (China page adds MiniMax at 512) [https://www.alibabacloud.com/help/en/model-studio/context-cache] [https://help.aliyun.com/en/model-studio/context-cache] | **1,024 tokens** of cached content; **max 4 cache markers per request** [https://www.alibabacloud.com/help/en/model-studio/explicit-cache-guide] [https://help.aliyun.com/en/model-studio/explicit-cache-guide] |
| TTL | Not fixed; "the system periodically clears unused cache data" is how third parties summarise it, and the official page says hits depend on cache generation and other factors → **no published TTL** [https://www.alibabacloud.com/help/en/model-studio/context-cache] | **5 minutes**, automatically renewed on each hit; the system creates the cache *after* the model generates a response, so wait for creation to complete before expecting a hit [https://www.alibabacloud.com/help/en/model-studio/explicit-cache-guide] [https://www.alibabacloud.com/help/en/model-studio/context-cache] |
| Billing field | Cache-hit input tokens are billed as `cached_token`; check `cached_tokens` in the API response [https://www.alibabacloud.com/help/en/model-studio/context-cache] [https://www.alibabacloud.com/help/en/model-studio/ptu-long-input-and-cache] | same |
| Mutually exclusive | "A request can only use one caching mode. If the request contains a `cache_control` marker, explicit cache [is used]" [https://www.alibabacloud.com/help/en/model-studio/explicit-cache-guide] | |

**Models (International deployment scope)** include Qwen-Max: `qwen3.8-max`, `qwen3.8-max-0902`, `qwen3.7-max`, `qwen3.7-max-*` … [https://www.alibabacloud.com/help/en/model-studio/context-cache]. Release notes record "Implicit cache support in Singapore" and explicit caching for Qwen3-Coder-Plus [https://www.alibabacloud.com/help/en/model-studio/model-release-notes] [https://www.alibabacloud.com/notice/detail?spm=a3c0i.35801494.J_TlTAa0s_LXHOq4tuiO-gv.5.5ce47c5brRScm3&_p_lc=1&id=1425].

**Cost-model rule the app must encode:** "If the model supports context cache, only input tokens receive a discount. These two discounts **cannot apply simultaneously**" — i.e. cache discount and batch discount do not stack [https://www.alibabacloud.com/help/en/model-studio/model-pricing].

---

## 7. Batch API

Docs: https://www.alibabacloud.com/help/en/model-studio/batch-inference and https://www.alibabacloud.com/help/en/model-studio/batch-interfaces-compatible-with-openai

| Property | Value | Source |
|---|---|---|
| Discount | **50% of the real-time inference price**, for both input and output tokens | https://www.alibabacloud.com/help/en/model-studio/batch-inference ; https://www.alibabacloud.com/help/en/model-studio/model-pricing |
| Regions (scope) | **China (Beijing) and Singapore** only. Feature-by-region table: "Batch inference. Supported. Not supported. Supported. Not supported…" | https://www.alibabacloud.com/help/en/model-studio/batch-inference ; https://www.alibabacloud.com/help/en/model-studio/regions |
| Turnaround | Asynchronous; a completion window is a request parameter, but I did **not** retrieve an official SLA number (e.g. "24 h") → **unconfirmed** | https://www.alibabacloud.com/help/en/model-studio/batch-interfaces-compatible-with-openai |
| Scale limits | Up to **50,000 requests per file**, max **500 MB** per file; each JSON line ≤ **6 MB** and must fit the model's context window; split larger datasets into multiple files | https://www.alibabacloud.com/help/en/model-studio/batch-inference ; https://www.alibabacloud.com/help/en/model-studio/batch-interfaces-compatible-with-openai |
| Rate limits | Batch requests are **not subject to real-time rate limiting**, but queuing/processing time applies | https://www.alibabacloud.com/help/en/model-studio/rate-limit ; https://help.aliyun.com/en/model-studio/rate-limit |
| Models | Text generation models — Qwen-Max: `qwen3.8-max`, `qwen3.7-max`; Qwen-Plus: `qwen3.7-plus`, `qwen3.x-plus`…; the `model` field must be identical for all requests in a file and supported in the current region | https://help.aliyun.com/en/model-studio/batch-inference (China site only) ; https://www.alibabacloud.com/help/en/model-studio/batch-inference |
| Files API | OpenAI-compatible File interface (upload/query/delete); also used to stage batch input; formats include text, EPUB, MOBI, MD, CSV | https://www.alibabacloud.com/help/en/model-studio/openai-file-interface ; https://www.alibabacloud.com/help/en/model-studio/upload-file-api |
| Free quota interplay | Free quota is valid 90 days; batch price = 50% of real-time | https://www.alibabacloud.com/help/en/model-studio/model-pricing |

---

## 8. Reasoning controls

Doc: https://www.alibabacloud.com/help/en/model-studio/deep-thinking

* **Two model classes.** "The Bailian Deep Think Model is divided into two modes: **Mixed Thinking Mode**: Thinking can be enabled or disabled per request, and the control [parameter is `enable_thinking`]" [https://www.alibabacloud.com/help/en/model-studio/deep-thinking]. Deep-thinking models are called through the OpenAI-compatible Chat Completion interface or the DashScope interface [https://www.alibabacloud.com/help/en/model-studio/deep-thinking].
* **Thinking budget.** "Use the `thinking_budget` parameter to set the maximum number of tokens for the reasoning process" [https://www.alibabacloud.com/help/en/model-studio/deep-thinking].
* **Billing of reasoning tokens.** "thinking content is billed by **Output Token**" [https://www.alibabacloud.com/help/en/model-studio/deep-thinking]. Pricing tables list separate "Non-Thinking and Thinking modes" rows for e.g. `qwen3.8-max` (International, 0<Token≤1M: $2 / $6) [https://www.alibabacloud.com/help/en/model-studio/model-pricing].
* **Reasoning effort levels.** Qwen3.8 exposes `reasoning_effort` with levels `low`, `medium`, `xhigh` in its own chat template / model documentation [https://huggingface.co/Qwen/Qwen3.8-27B/discussions/113] [https://qwen.ai/blog?id=qwen3.8]; third parties describe Qwen3.8-Max's `reasoning_effort` as the cost/depth trade-off [https://www.datacamp.com/blog/qwen3-8-max]. I could **not** confirm the exact accepted values on alibabacloud.com → **unconfirmed**; the app should read the model detail page per model.
* **Model-level defaults matter.** Example: `mimo-v2.5-pro` "runs in thinking mode by default (`enable_thinking` defaults to true)" [https://help.aliyun.com/en/model-studio/mimo] — **China site only**.
* **Thinking interacts with tools.** `search_strategy=agent_max` (web extractor on Chat Completions) requires `enable_thinking=true` [https://www.alibabacloud.com/help/en/model-studio/web-extractor]. And `tool_choice="required"` behaves differently in thinking vs non-thinking mode for Qwen [https://www.alibabacloud.com/help/en/model-studio/qwen-function-calling].
* **Cost-estimation rule:** thinking output is billed at the output rate and also consumes the Responses API's ~80% input-context budget [https://www.alibabacloud.com/help/en/model-studio/qwen-api-via-openai-responses].

---

## 9. Rate limits

Docs: https://www.alibabacloud.com/help/en/model-studio/rate-limit , https://www.alibabacloud.com/help/en/model-studio/quota-management

**Mechanics**
* Limits are applied **at the Alibaba Cloud account level, aggregating usage across all RAM users, workspaces and API keys**; requests over the limit are rejected and typically recover within a minute [https://www.alibabacloud.com/help/en/model-studio/rate-limit].
* Metrics: **RPM** (calls/min) and **TPM** (tokens/min, including input **and** output). The service may also enforce per-second limits: RPS = RPM/60, TPS = TPM/60 [https://www.alibabacloud.com/help/en/model-studio/rate-limit].
* 429 = rate limiting; 403 = quota exhaustion [https://www.alibabacloud.com/help/en/model-studio/rate-limit].
* Batch API calls are exempt from real-time rate limiting [https://www.alibabacloud.com/help/en/model-studio/rate-limit].
* Topping up the balance **does not** change the default RPM/TPM [https://www.alibabacloud.com/help/id/model-studio/rate-limit] (Indonesia-locale copy of the same alibabacloud.com page).

**Values (International scope) — spot-checked**

| Model | Scope / region | RPM | TPM | Source |
|---|---|---|---|---|
| `qwen3.8-max`, `qwen3.8-flash` | Global | 30,000 | 5,000,000 | https://www.alibabacloud.com/help/fr/model-studio/rate-limit |
| `qwen3.8-max` (and `-0902`), `qwen3.8-flash` | Singapore = **International** | **Dynamic Rate Limiting** | **Dynamic Rate Limiting** | https://www.alibabacloud.com/help/en/model-studio/rate-limit |
| `qwen3.8-max` detail page | Singapore / International | "This region uses dynamic rate limiting. The TPM limit is tiered by your monthly Model Studio spend, and the RPM limit is high enough that normal use does not trigger throttling." | | https://www.alibabacloud.com/help/en/model-studio/qwen3-8-max |
| `qwen3.7-max` | Singapore / International | 600 | 1,000,000 | https://www.alibabacloud.com/help/en/model-studio/qwen3-7-max |
| `qwen-max` | International | 600 | 1,000,000 | https://www.alibabacloud.com/help/en/model-studio/rate-limit |
| `qwen-plus` | International | 30,000 | 5,000,000 | https://www.alibabacloud.com/help/en/model-studio/qwen-plus |
| `qwen3.5-omni-flash` | International | 30,000 | Dynamic Rate Limiting | https://www.alibabacloud.com/help/en/model-studio/rate-limit |
| `qwen-vl-plus` | International | 1,200 | 1,000,000 | https://www.alibabacloud.com/help/fr/model-studio/rate-limit |
| `qvq-max` | International | 60 | 1,000,000 | https://www.alibabacloud.com/help/fr/model-studio/rate-limit |

Note the discrepancy the app must handle: the same model can show a fixed 30,000/5,000,000 under **Global** scope and **Dynamic** under **International/Singapore** scope [https://www.alibabacloud.com/help/fr/model-studio/rate-limit] [https://www.alibabacloud.com/help/en/model-studio/rate-limit]. Snapshot versions have *stricter* limits than the stable/latest alias — "the stable version or latest version has more lenient rate limiting than dated snapshot versions" [https://www.alibabacloud.com/help/en/model-studio/rate-limit].

**Dynamic rate limiting tiers** (monthly Model Studio / Bailian platform consumption): Tier 1 ≤ $8,000; Tier 2 $8,000–$140,000; Tier 3 > $140,000. TPM is adjusted monthly by tier and "the actual available TPM is no lower than the rate limit value" [https://www.alibabacloud.com/help/en/model-studio/quota-management]. Applies in **China (Beijing) and Singapore** [https://www.alibabacloud.com/help/en/model-studio/qwen3-8-max].

**How to raise limits**
1. "If you need higher rate limit quotas, **contact your business manager** to apply" [https://www.alibabacloud.com/help/en/model-studio/rate-limit]; for dynamic TPM, "contact your business manager to apply for a quota increase" [https://www.alibabacloud.com/help/en/model-studio/quota-management].
2. "If the default rate limits are insufficient, you can **increase a model's temporary TPM quota in the Model Studio console**" [https://www.alibabacloud.com/help/fr/model-studio/rate-limit]. Third parties report these increases take effect immediately and last 30 days [https://therouter.ai/blog/ai-api-rate-limit-comparison-2026/] — **unconfirmed**.
3. Programmatic, **per-workspace**: `POST /api/v1/models/limits` updates QPM/TPM quotas of models in a specified workspace (merge-overlay and delete operations) [https://www.alibabacloud.com/help/en/model-studio/update-model-rate-limits]; `List model quotas` distinguishes `model_limit` (account level) from workspace-level limits [https://www.alibabacloud.com/help/en/model-studio/list-quotas]. CLI: `bl quota list` / `bl quota request` [https://www.alibabacloud.com/help/en/model-studio/cli/usage-quota.md].
4. Architectural mitigations the docs recommend: switch to a backup model on 429, shorten inputs / cap `max_tokens`, and use Throughput Reservation (TPM reservation / PTU) [https://www.alibabacloud.com/help/en/model-studio/rate-limit] [https://www.alibabacloud.com/help/en/model-studio/rate-limiting-best-practices] [https://docs.modelstudio.console.alibabacloud.com/en/model-studio/tpm-reservation].

---

## 10. Content safety

**Built-in moderation.** Model Studio runs content-safety moderation **inline with inference** [https://www.alibabacloud.com/help/fr/model-studio/data-retention-policy]. The input/output guardrail topic is "Input and output AI guardrail" [https://help.aliyun.com/en/model-studio/content-security] — **China site only**; I could not locate the equivalent page under alibabacloud.com/help/en/model-studio → the international wording is **unconfirmed**.

**Error returned when blocked**

| HTTP | Code | Message | Cause / fix |
|---|---|---|---|
| 400 | `DataInspectionFailed` (DashScope) / `data_inspection_failed` (OpenAI-compatible) | "Input or output data may contain inappropriate content." / "Input data may contain inappropriate content." / "Output data may contain inappropriate content." | "Input or output contains suspected sensitive content blocked by **Green Net**. Solution: Modify the input content and retry." [https://www.alibabacloud.com/help/en/model-studio/error-code] |
| 400 | image variant | image content violates compliance policies | "Replace the image with one that complies with Content Moderation policies" [https://www.alibabacloud.com/help/en/model-studio/error-code] |

The OpenAI-compatible form is what most agent runtimes see: `{'error': {'code': 'data_inspection_failed', 'message': 'Input data may contain inappropriate content.', ...}}` [https://github.com/camel-ai/owl/issues/432]; the DashScope form is `InternalError.Algo.DataInspectionFailed` [https://github.com/QwenLM/qwen-code/issues/3145].

**Can it be turned off or tuned?** I found **no documented off switch** for the platform-level Green Net inspection → **unconfirmed / treat as always on**. What *is* documented:
* A false-positive appeal path: collect the full error message (e.g. "Input data may contain inappropriate content.") plus reproduction context (knowledge base ID, model called) and submit it [https://help.aliyun.com/zh/model-studio/content-security] — **China site only**.
* Observability: Model monitoring exposes "Content moderation error count / Number of content moderation blocks" [https://www.alibabacloud.com/help/en/model-studio/model-telemetry].
* Within a ZDR workspace, calls are still "subject to automated" content-safety moderation [https://www.alibabacloud.com/help/fr/model-studio/data-retention-policy].

**How AI Guardrails relates to it.** AI Guardrails (the Content Moderation product family) is a *separate, customer-configurable* layer on top of the platform baseline:
* "AI Guardrails supports API integration and **one-click activation through Alibaba Cloud Model Studio**… pay-per-call" [https://www.alibabacloud.com/en/product/ai_guardrails?_p_lc=1].
* A dedicated "Guardrails service for Alibaba Cloud Model Studio users" enhances moderation of text input/output of LLMs, "complies with the core policies of the Model Studio platform and provides a **flexible moderation tag management feature**"; you enable it from the **Model Protection** page after switching region, locating the Content Moderation Guardrail for Model Studio [https://help.aliyun.com/en/document_detail/2923687.html] — **China site only**. Related: text moderation for large models in Model Studio, built on the baseline service [https://help.aliyun.com/en/document_detail/2861797.html]; image moderation for Model Studio [https://help.aliyun.com/en/document_detail/2871402.html] — **China site only**.
* Capabilities marketed: Qwen-powered multimodal detection with dedicated text/image/audio-video moderation models, native streaming moderation under 2 s latency [https://www.alibabacloud.com/blog/ai-guardrails-real-time-protection-for-llms-and-ai-agents%C2%A0_603442]; custom moderation agents for business-specific risks [https://www.alibabacloud.com/help/en/content-moderation/latest/what-is-content-moderation]; human review of API detection results [https://www.alibabacloud.com/help/en/content-moderation/latest/review-data].
* **International availability:** AI Guardrails / Content Moderation is sold in **Asia Pacific SE 1 (Singapore)** — the pricing page lists "Content Moderation V2.0. Region. Asia Pacific SE 1 (Singapore)" [https://www.alibabacloud.com/en/product/content-moderation/pricing?_p_lc=1], and trade press describes AI Guardrails as "available through its Singapore region" [https://www.sourcesecurity.com/news/alibaba-cloud-ai-guardrails-boost-security-co-7261-ga-co-13828-ga-co-1716962886-ga.1750749066.html].
* Governance hook: Alibaba Cloud Config has managed rules that flag a workspace as non-compliant if the Model Studio guardrails are *not* enabled — malicious-URL output guardrail [https://www.alibabacloud.com/help/en/cloud-config/latest/enable-output-content-malicious-url-security-fence-for-bailian] and prompt-attack input guardrail [https://www.alibabacloud.com/help/en/cloud-config/latest/enabling-input-content-prompts-to-attack-security-guardrails-for-refining]. Useful for enterprise proposals.
* Qwen3Guard is the open guardrail model in the Qwen family, if the customer wants self-hosted moderation [https://qwen.ai/blog?id=qwen3guard].

**Drawing-rule implication:** always render two distinct safety nodes — (a) *platform moderation (non-removable, raises `data_inspection_failed`)* and (b) *AI Guardrails (optional, tunable, separately billed, Singapore)*. The support-email use case will trip (a) on customer PII/abuse text; the app should show a human-review branch for that error.

---

## 11. Data handling

| Item | Finding | Source |
|---|---|---|
| Training on customer data | "Alibaba Cloud strictly protects your data privacy and **will never use your data for model training**. All data transmitted during application building and model [inference]…" | https://docs.modelstudio.console.alibabacloud.com/en/model-studio/privacy-notice ; https://www.alibabacloud.com/help/tr/model-studio/privacy-notice |
| Default retention | "By default, user's prompts and responses from model inference calls are retained for **no longer than 30 days**, unless longer retention is required by applicable [law]" | https://docs.modelstudio.console.alibabacloud.com/en/model-studio/data-retention-policy ; https://www.alibabacloud.com/help/id/model-studio/data-retention-policy |
| Zero Data Retention | "Alibaba Cloud Model Studio provides a **Zero Data Retention (ZDR)** control capability to **enterprise customers of Alibaba Cloud International Site**"; intended for sectors with higher data-minimization/confidentiality/compliance requirements; enterprises "can apply ZDR **at the workspace level**" | https://www.alibabacloud.com/help/id/model-studio/data-retention-policy ; https://docs.modelstudio.console.alibabacloud.com/en/model-studio/data-retention-policy ; https://www.facebook.com/alibabacloud/posts/1583346547170765/ |
| ZDR eligibility process | "ZDR is available to enterprise customers with an Alibaba Cloud account manager, subject to a needs assessment" — **third-party summary**, not confirmed on an official page → **unconfirmed** | https://www.developersdigest.tech/models/data-retention/qwen |
| Where data is processed (Singapore) | "The region determines the **access point and data storage location**. The Singapore region uses the **International deployment scope**; request data is [stored in that region]"; "Regions determine the access point and data storage location. Request data is stored in that region. The inference result is returned to the [caller]" | https://www.alibabacloud.com/help/en/model-studio/singapore-regional-access-information ; https://www.alibabacloud.com/help/en/model-studio/regions |
| Compliance certifications | "Alibaba Cloud Model Studio has achieved **SOC 2 compliance with an unqualified opinion**, validating our rigorous controls for Security, [Availability, Confidentiality…]". Security & Compliance doc index also lists: Permission management, Transmission security, Security certifications and privacy, **Training data summary**, Data retention policy | https://www.alibabacloud.com/help/en/model-studio/privacy-notice ; https://www.alibabacloud.com/help/en/model-studio/security-and-compliance/ |
| Other certs | Model-Studio-specific ISO 27001/27017/27018/CSA STAR statements are **not** on the Model Studio privacy page I reached. At the Alibaba Cloud platform level the Trust Center lists SOC 2 Type 2, GDPR, ISO family, TRUSTe, Singapore PDPA | https://www.alibabacloud.com/en/trust-center/compliance?_p_lc=1 ; https://www.alibabacloud.com/en/trust-center/gdpr?_p_lc=1 — Model-Studio-level ISO scope **unconfirmed** |
| Moderation inside ZDR | Content-safety moderation runs inline with inference; calls within a ZDR workspace remain subject to automated moderation | https://www.alibabacloud.com/help/fr/model-studio/data-retention-policy |
| Stateful features | Third-party compliance review flags that retention for stateful features (knowledge base, Assistants/Threads) is not clearly addressed → treat as **unconfirmed** and raise in proposals | https://checkableai.com/stack-check/platforms/alibaba-qwen/ |
| Private-network access | Model Studio **PrivateLink** is documented for **China (Beijing) and China (Hong Kong) only**; "Private network access is not currently supported in [other regions]" | https://www.alibabacloud.com/help/en/model-studio/access-model-studio-through-privatelink |
| Regulated-industry option | "Model Studio: Exclusive" — secure AI platform for highly regulated industries, hybrid/private cloud, data residency | https://technologymagazine.com/news/alibabas-model-studio-powers-trusted-ai-in-private-clouds ; https://www.alibabacloud.com/blog/alibaba-cloud-empowers-global-enterprises-with-expanded-ai-services_602929 |

---

## 12. Workspaces, API keys, RAM sub-accounts, per-workspace cost tracking

| Item | Finding | Source |
|---|---|---|
| Workspace ↔ region | "Model Studio divides resources and workspaces by geographic region. **A single workspace cannot span regions.** Even the default workspaces in [different regions are separate]" | https://www.alibabacloud.com/help/en/model-studio/permission-management-overview |
| Workspace count / key count | "Up to **50 API keys per account per region**, not limited by workspace; a single primary account can have up to **20 workspaces** (including the default)" | https://help.aliyun.com/en/model-studio/get-api-key — **China site only**; intl key page: https://www.alibabacloud.com/help/en/model-studio/get-api-key |
| Key visibility | "An Alibaba Cloud account can view the API keys in all workspaces. A **RAM user can view only the API keys in the workspaces that they have joined**" | https://docs.modelstudio.console.alibabacloud.com/en/model-studio/get-api-key |
| Key ↔ region | "A Model Studio API key is bound to the region in which it was created. When you call the base URL of a region, you must use an API key that was [created in that region]" | https://www.alibabacloud.com/help/en/model-studio/compatibility-of-openai-with-dashscope |
| Temporary keys | A temporary API key can be generated (example uses the Singapore workspace-specific endpoint) | https://www.alibabacloud.com/help/en/model-studio/generate-temporary-api-key |
| RAM roles | Three workspace roles. **Super administrator**: manages user permissions, workspace-available models, **workspace model rate limiting**, and API keys cross-workspace; plus administrator and ordinary member roles | https://www.alibabacloud.com/help/en/model-studio/permission-management-overview |
| RAM permission granting | Model Studio console → **Account Management** → find RAM user → **Permission** settings; to call models via API, "create or assign an API key for the RAM user in the corresponding workspace" | https://www.alibabacloud.com/help/en/model-studio/permission-management-overview |
| Breaking change to watch | Notice "[Model Studio] Upgrade of permission system": advanced administrative permissions RAM users previously had by default **have been withdrawn**, including workspace and user management | https://www.alibabacloud.com/en/notice/model_studio_upgrade_of_permission_system_558?_p_lc=1 |
| Per-workspace rate limits | `POST /api/v1/models/limits` sets QPM/TPM per model **in a specified workspace**; `List model quotas` returns `model_limit` (account) and workspace-level limits | https://www.alibabacloud.com/help/en/model-studio/update-model-rate-limits ; https://www.alibabacloud.com/help/en/model-studio/list-quotas |
| Cost tracking | Console → **Cost and Usage > Cost Overview**: costs for model calls, model training and model deployment, by minute/hour/day; bills can be **broken down by API Key ID and workspace ID**; export each month's bill as **CSV** (Billing Details) | https://www.alibabacloud.com/help/en/model-studio/bill-query-and-cost-management ; https://docs.modelstudio.console.alibabacloud.com/en/model-studio/bill-query-and-cost-management |
| Usage statistics | Model usage page: free-quota usage per model, total cost, subscription cost, bill cost, bill trend; console data may be delayed | https://www.alibabacloud.com/help/en/model-studio/model-usage-statistics ; https://docs.modelstudio.console.alibabacloud.com/en/model-studio/model-usage-statistics |
| Sub-workspace calls | Documented pattern for calling models from a non-default (sub-) workspace using its own API key and workspace-specific base URL | https://www.alibabacloud.com/help/en/model-studio/model-calling-in-sub-workspace |
| Monitoring/alerting | Model monitoring, alerting and logging for real-time call observability; API-key management under **System Management** | https://www.alibabacloud.com/help/en/model-studio/model-telemetry |

**Important caveat for cost proposals:** because RPM/TPM are aggregated at the **primary account** level across all RAM users, workspaces and keys [https://www.alibabacloud.com/help/en/model-studio/rate-limit], a per-workspace diagram cannot promise isolated throughput. Isolation requires Throughput Reservation / PTU [https://docs.modelstudio.console.alibabacloud.com/en/model-studio/tpm-reservation].

---

## 13. Assistants API, Agents APIs, and the application (`app_id`) calling API

**Assistant API — deprecated.** "The Assistant API is being deprecated. Assistants, Messages, Runs, [Threads]…" [https://www.alibabacloud.com/help/en/model-studio/call-example]. Its streaming doc states: "The Assistant API is being deprecated. **Migrate to the Responses API**, which offers built-in tools and multi-turn context management" [https://www.alibabacloud.com/help/en/model-studio/event-streaming.md]. Sub-pages all carry the deprecation banner: Assistants [https://docs.bailian.console.aliyun.com/en/model-studio/assistant], Threads [https://help.aliyun.com/en/model-studio/thread] (China site only), Function calling (Deprecated) [https://www.alibabacloud.com/help/en/model-studio/function-calling]. Existing assistant/thread instances are stored server-side and "do not have an expiration date" [https://docs.bailian.console.aliyun.com/en/model-studio/assistant]. No shutdown date is published for Model Studio's Assistant API → **unconfirmed**. (For contrast, OpenAI's Assistants API was removed 2026-08-26 [https://developers.openai.com/api/docs/assistants/migration].)

**Application (`app_id`) calling API — gated.**

| Aspect | Finding | Source |
|---|---|---|
| What it calls | Model Studio applications: **agents, workflows, and agent orchestrations** | https://www.alibabacloud.com/help/en/model-studio/application-calling-guide |
| Transport | DashScope SDK or HTTP; `POST https://dashscope-intl.aliyuncs.com/api/v1/apps/{APP_ID}/completion` (Singapore) | https://www.alibabacloud.com/help/en/model-studio/application-calling-guide ; https://www.alibabacloud.com/help/en/model-studio/application-api-reference |
| Session state | Passing `session_id` makes the request automatically carry cloud-stored conversation history | https://www.alibabacloud.com/help/en/model-studio/application-calling-guide |
| Custom params | `biz_params` passes custom parameters to plugins inside the application | https://help.aliyun.com/en/model-studio/asynchronous-call-api-reference — **China site only** |
| Async | Asynchronous invocation API for Agent and Workflow applications | https://help.aliyun.com/en/model-studio/asynchronous-call-api-reference — **China site only** |
| Workspace scoping | "To manage and call applications in a specific workspace by using the API, you must set the **APP ID and Workspace ID at the same time**" | https://www.alibabacloud.com/help/en/model-studio/permission-management-overview |
| **Restriction** | "**API call restrictions:** Only users who created Alibaba Cloud Model Studio applications in the Singapore region **before April 21, 2025** can call the application data, knowledge base, and prompt engineering APIs"; the Application Calling section carries both this API restriction and a matching **console access restriction** | https://www.alibabacloud.com/help/en/model-studio/application-introduction ; https://www.alibabacloud.com/help/en/model-studio/bailian-application-calling/ ; https://docs.modelstudio.console.alibabacloud.com/en/model-studio/application-introduction |
| Versioning | "New requests sent through the same APP_ID after publishing use the new version's configuration, including the prompt, model, and tools" | https://help.aliyun.com/en/model-studio/agent-and-workflow-application-api-reference — **China site only** |

**What remains usable for a new international account** (i.e., what the app may safely promise):
* Model APIs on all four surfaces (Chat Completions, Responses, Anthropic Messages, DashScope) with function calling, structured output, thinking controls, context cache, batch (Singapore), and the Responses-API built-in tools — all of these are documented as ordinary model-API features with no pre-2025-04-21 gate [https://www.alibabacloud.com/help/en/model-studio/qwen-api-reference/] [https://www.alibabacloud.com/help/en/model-studio/web-search] [https://www.alibabacloud.com/help/en/model-studio/context-cache] [https://www.alibabacloud.com/help/en/model-studio/batch-inference].
* Workspace / RAM / API-key management, per-workspace rate-limit overrides, per-workspace cost breakdown and CSV export [https://www.alibabacloud.com/help/en/model-studio/permission-management-overview] [https://www.alibabacloud.com/help/en/model-studio/bill-query-and-cost-management].
* Model monitoring and alerting [https://www.alibabacloud.com/help/en/model-studio/model-telemetry].
* AI Guardrails activation via Model Studio, Singapore [https://www.alibabacloud.com/en/product/ai_guardrails?_p_lc=1] [https://www.alibabacloud.com/en/product/content-moderation/pricing?_p_lc=1].
* Fine-tuning — Singapore only among international regions [https://www.alibabacloud.com/help/en/model-studio/regions].
* Free quota: 1M tokens per eligible model, 90 days, **Singapore region with International deployment scope only** [https://www.alibabacloud.com/help/en/model-studio/new-free-quota].

**Not usable** for a new international account: no-code agent/workflow apps, the knowledge base (and therefore `file_search`), application-data and prompt-engineering APIs, and the `app_id` completion API [https://www.alibabacloud.com/help/en/model-studio/application-introduction] [https://www.alibabacloud.com/help/en/model-studio/rag-knowledge-base]. The Agent/Workflow runtime must come from the customer side (AgentRun/AgentCore, Dify on ACK, Function Compute/ACS), with Model Studio supplying models + built-in tools only.

---

## Final summary table

| # | Feature | Available internationally? | Notes | Source |
|---|---|---|---|---|
| 1 | OpenAI-compatible Chat Completions | **Yes** | All 6 regions; API key region-bound | https://www.alibabacloud.com/help/en/model-studio/qwen-api-via-openai-chat-completions |
| 1 | OpenAI-compatible Responses API | **Yes** | Only surface with server-side built-in tools; input context capped at ~80% of window | https://www.alibabacloud.com/help/en/model-studio/qwen-api-via-openai-responses |
| 1 | Conversations API | **Yes** | Pairs with Responses for auto history injection | https://www.alibabacloud.com/help/en/model-studio/openai-compatible-conversations |
| 1 | Anthropic-compatible Messages API | **Yes** | `/v1/models` discovery must be handled; `web_fetch` = web extractor | https://www.alibabacloud.com/help/en/model-studio/anthropic-api-messages |
| 1 | DashScope native API | **Yes** | Most complete parameter set; legacy domain frozen for new features after 2026-09-30 | https://www.alibabacloud.com/help/en/model-studio/qwen-api-via-dashscope ; https://help.aliyun.com/en/model-studio/regions (China site only) |
| 1 | SDKs | **Yes** | DashScope Python/Java official; OpenAI SDKs Python/Node/Java/Go; Python ≥3.9 | https://www.alibabacloud.com/help/en/model-studio/install-sdk |
| 2 | Function calling | **Yes** | Streaming tool calls OK | https://www.alibabacloud.com/help/en/model-studio/qwen-function-calling |
| 2 | `parallel_tool_calls` | **Partly** | Not honoured by `kimi-k3`; unsupported on Qwen-Omni-Realtime | https://www.alibabacloud.com/help/en/model-studio/qwen-function-calling ; https://help.aliyun.com/zh/model-studio/qwen-function-calling (China site only) |
| 2 | `tool_choice` | **Partly** | `"auto"` and named function OK; Qwen rejects `"required"`; Omni-Realtime rejects the param entirely | https://www.alibabacloud.com/help/en/model-studio/qwen-function-calling |
| 2 | Tool-count limit | **Soft** | No hard cap; ≤20 tools recommended | https://www.alibabacloud.com/help/en/model-studio/qwen-function-calling |
| 3 | JSON Object mode | **Yes** | Valid JSON, schema not guaranteed | https://www.alibabacloud.com/help/en/model-studio/qwen-structured-output |
| 3 | JSON Schema mode | **Partly** | Qwen3.8-Max/Plus/Flash and Qwen3.7 series; strict-vs-best-effort **unconfirmed** | https://www.alibabacloud.com/help/en/model-studio/qwen-structured-output |
| 4 | `web_search` | **Yes** | $10.00 / 1,000 calls in Singapore; per-strategy prices differ by region | https://www.alibabacloud.com/help/en/model-studio/web-search |
| 4 | `web_extractor` (page reader) | **Yes** | Free for a limited time; must be paired with `web_search`; all six regions for `*-1-flash-1017` | https://www.alibabacloud.com/help/en/model-studio/web-extractor |
| 4 | `code_interpreter` | **Yes** | Free for a limited time; no per-call price published | https://www.alibabacloud.com/help/en/model-studio/qwen-code-interpreter |
| 4 | `t2i_search` (text-to-image search) | **Yes** | $8 / 1,000 calls Singapore ($3.44 Beijing) | https://www.alibabacloud.com/help/en/model-studio/web-search-image.md |
| 4 | `image_search` (search by image) | **Yes** | $8.00 / 1,000 calls; region label truncated in retrieved snippet → **unconfirmed** | https://www.alibabacloud.com/help/en/model-studio/image-search |
| 4 | `file_search` (knowledge retrieval) | **No (effectively)** | Needs a knowledge base ID; KB console + KB APIs gated to Singapore apps created before 2025-04-21. One KB ID per call. Use Tablestore Knowledge Storage or AgentRun+RAGFlow instead | https://www.alibabacloud.com/help/en/model-studio/qwen-api-via-openai-responses ; https://www.alibabacloud.com/help/en/model-studio/rag-knowledge-base ; https://www.alibabacloud.com/help/en/tablestore/table-store-service/knowledge-storage-introduction |
| 4 | `mcp` as a Responses-API tool | **Yes** | `server_url` required, `headers` optional, `server_label` needed for add/update | https://www.alibabacloud.com/help/en/model-studio/mcp ; https://www.alibabacloud.com/help/en/model-studio/client-events |
| 5 | MCP marketplace / hosted MCP servers | **Unconfirmed** | MCP Square, Official MCP Service one-click enable, and FC-hosted custom MCP are documented on the China site only | https://help.aliyun.com/en/model-studio/mcp-introduction ; https://help.aliyun.com/en/model-studio/custom-mcp (China site only) |
| 5 | Customer's own remote MCP server | **Yes** | Via Responses API `mcp` tool, SSE endpoint + auth from e.g. ModelScope | https://www.alibabacloud.com/help/en/model-studio/mcp |
| 6 | Implicit context cache | **Yes** | Cache-hit input typically billed at 20% of standard input price; 1,024-token minimum (512 for GLM/MiniMax); no published TTL; not disable-able | https://www.alibabacloud.com/help/en/model-studio/context-cache |
| 6 | Explicit context cache | **Yes** | `cache_control: {"type":"ephemeral"}`; ≥1,024 tokens; ≤4 markers/request; TTL 5 min, renewed on hit; create = +25%, hit = −90% | https://www.alibabacloud.com/help/en/model-studio/explicit-cache-guide |
| 6 | Cache + batch stacking | **No** | "These two discounts cannot apply simultaneously" | https://www.alibabacloud.com/help/en/model-studio/model-pricing |
| 7 | Batch API | **Partly** | Singapore + Beijing only; 50% of real-time price; ≤50,000 requests / ≤500 MB per file, ≤6 MB per line; exempt from real-time rate limits; official turnaround SLA **unconfirmed** | https://www.alibabacloud.com/help/en/model-studio/batch-inference ; https://www.alibabacloud.com/help/en/model-studio/regions |
| 8 | `enable_thinking` on/off | **Yes** | Mixed-thinking models, per-request | https://www.alibabacloud.com/help/en/model-studio/deep-thinking |
| 8 | `thinking_budget` | **Yes** | Caps reasoning tokens | https://www.alibabacloud.com/help/en/model-studio/deep-thinking |
| 8 | `reasoning_effort` levels | **Unconfirmed** | `low`/`medium`/`xhigh` documented by Qwen's model card, not confirmed on alibabacloud.com | https://huggingface.co/Qwen/Qwen3.8-27B/discussions/113 |
| 8 | Reasoning-token billing | **Yes** | Thinking content billed as **output tokens**; pricing tables split Thinking / Non-Thinking rows | https://www.alibabacloud.com/help/en/model-studio/deep-thinking ; https://www.alibabacloud.com/help/en/model-studio/model-pricing |
| 9 | RPM/TPM limits | **Yes** | Aggregated per primary account across all RAM users, workspaces, keys; also enforced as RPS=RPM/60, TPS=TPM/60 | https://www.alibabacloud.com/help/en/model-studio/rate-limit |
| 9 | Fixed limits (International) | **Yes** | e.g. `qwen3.7-max` 600 RPM / 1,000,000 TPM; `qwen-plus` 30,000 / 5,000,000; `qwen-max` 600 / 1,000,000; Global-scope `qwen3.8-max`/`qwen3.8-flash` 30,000 / 5,000,000 | https://www.alibabacloud.com/help/en/model-studio/qwen3-7-max ; https://www.alibabacloud.com/help/en/model-studio/qwen-plus ; https://www.alibabacloud.com/help/fr/model-studio/rate-limit |
| 9 | Dynamic rate limiting | **Yes (Singapore)** | `qwen3.8-max`, `qwen3.8-flash`: TPM tiered by monthly spend — Tier 1 ≤$8k, Tier 2 $8k–$140k, Tier 3 >$140k | https://www.alibabacloud.com/help/en/model-studio/quota-management ; https://www.alibabacloud.com/help/en/model-studio/qwen3-8-max |
| 9 | Raising limits | **Yes** | Business-manager application; temporary TPM bump in console; per-workspace `POST /api/v1/models/limits`; Throughput Reservation/PTU | https://www.alibabacloud.com/help/en/model-studio/rate-limit ; https://www.alibabacloud.com/help/en/model-studio/update-model-rate-limits |
| 10 | Built-in input/output moderation | **Yes (always on)** | Inline with inference; not documented as disable-able → treat as non-removable | https://www.alibabacloud.com/help/fr/model-studio/data-retention-policy |
| 10 | Block error | **Yes** | HTTP 400 `DataInspectionFailed` / `data_inspection_failed`; "Input/Output data may contain inappropriate content."; blocked by Green Net | https://www.alibabacloud.com/help/en/model-studio/error-code |
| 10 | Tuning moderation | **Partly** | Platform layer: appeal false positives only. Configurable layer = **AI Guardrails** (moderation tag management, Model Protection page, one-click from Model Studio, pay-per-call, Singapore) | https://help.aliyun.com/en/document_detail/2923687.html (China site only) ; https://www.alibabacloud.com/en/product/ai_guardrails?_p_lc=1 ; https://www.alibabacloud.com/en/product/content-moderation/pricing?_p_lc=1 |
| 10 | Moderation observability | **Yes** | Model monitoring: content-moderation error count and block count | https://www.alibabacloud.com/help/en/model-studio/model-telemetry |
| 11 | Data used for training | **No** | "will never use your data for model training" | https://docs.modelstudio.console.alibabacloud.com/en/model-studio/privacy-notice |
| 11 | Default retention | **Yes** | Prompts/responses from inference retained ≤30 days unless law requires longer | https://docs.modelstudio.console.alibabacloud.com/en/model-studio/data-retention-policy |
| 11 | Zero Data Retention | **Yes (enterprise)** | International Site enterprise customers; applied per workspace; approval process **unconfirmed** officially | https://www.alibabacloud.com/help/id/model-studio/data-retention-policy |
| 11 | Data location (Singapore) | **Yes** | Region sets access point **and** data storage location; Singapore = International deployment scope | https://www.alibabacloud.com/help/en/model-studio/singapore-regional-access-information ; https://www.alibabacloud.com/help/en/model-studio/regions |
| 11 | Certifications | **Partly** | Model Studio: **SOC 2, unqualified opinion**. Platform-level: SOC 2 Type 2, GDPR, ISO family, TRUSTe, Singapore PDPA. Model-Studio-level ISO scope **unconfirmed** | https://www.alibabacloud.com/help/en/model-studio/privacy-notice ; https://www.alibabacloud.com/en/trust-center/compliance?_p_lc=1 |
| 11 | PrivateLink | **No** | Beijing and Hong Kong only | https://www.alibabacloud.com/help/en/model-studio/access-model-studio-through-privatelink |
| 12 | Workspaces | **Yes** | Region-scoped, cannot span regions; ≤20 workspaces per primary account (China-site page) | https://www.alibabacloud.com/help/en/model-studio/permission-management-overview ; https://help.aliyun.com/en/model-studio/get-api-key (China site only) |
| 12 | API keys | **Yes** | ≤50 per account per region; region-bound; RAM users see only their workspaces' keys; temporary keys supported | https://docs.modelstudio.console.alibabacloud.com/en/model-studio/get-api-key ; https://www.alibabacloud.com/help/en/model-studio/generate-temporary-api-key |
| 12 | RAM sub-accounts / roles | **Yes** | 3 workspace roles; super admin also controls per-workspace model rate limits; default RAM admin rights were withdrawn in a permission-system upgrade | https://www.alibabacloud.com/help/en/model-studio/permission-management-overview ; https://www.alibabacloud.com/en/notice/model_studio_upgrade_of_permission_system_558?_p_lc=1 |
| 12 | Per-workspace usage & cost | **Yes** | Cost Overview by minute/hour/day; breakdown by **API Key ID and workspace ID**; monthly CSV export; model-usage and free-quota pages | https://www.alibabacloud.com/help/en/model-studio/bill-query-and-cost-management ; https://www.alibabacloud.com/help/en/model-studio/model-usage-statistics |
| 13 | Assistant API | **Deprecated** | Assistants/Threads/Messages/Runs; migrate to Responses API; no published shutdown date (**unconfirmed**) | https://www.alibabacloud.com/help/en/model-studio/quick-start-of-assistant-api ; https://www.alibabacloud.com/help/en/model-studio/event-streaming.md |
| 13 | Agent/Workflow application API (`app_id`) | **No for new accounts** | `POST /api/v1/apps/{APP_ID}/completion`; gated to accounts that created Singapore applications before 2025-04-21; APP_ID + Workspace ID must both be set | https://www.alibabacloud.com/help/en/model-studio/application-api-reference ; https://www.alibabacloud.com/help/en/model-studio/application-introduction ; https://www.alibabacloud.com/help/en/model-studio/permission-management-overview |
| 13 | No-code agent / workflow / KB console | **No for new accounts** | Same 2025-04-21 console-access restriction | https://www.alibabacloud.com/help/en/model-studio/single-agent-application ; https://www.alibabacloud.com/help/en/model-studio/build-knowledge-base-qa-assistant-without-coding |

---

## Gaps to close before the catalog ships

1. **Batch turnaround SLA** — the international batch pages do not state a completion window in what I could retrieve; needed for any "overnight digest" node in a diagram. **unconfirmed**
2. **`reasoning_effort` accepted values per model** on alibabacloud.com — read from each model detail page at build time. **unconfirmed**
3. **JSON Schema strictness** (constrained decoding vs. best effort). **unconfirmed**
4. **`image_search` region-scoped price** ($8.00/1,000 confirmed; region label truncated). **unconfirmed**
5. **Non-Singapore `web_search` per-strategy prices** (turbo / max / agent / agent_max in Virginia, Frankfurt, Tokyo, Hong Kong) — the page has them; I only reliably extracted Singapore = $10.00/1,000. **unconfirmed for other regions**
6. **International MCP marketplace / Model-Studio-hosted MCP** — everything I found is China-site. Assume **not available** internationally unless a customer demonstrates it in the Singapore console. **unconfirmed**
7. **ZDR approval process and SLA** — official page confirms the capability and workspace scope; the "account manager + needs assessment" step is only in third-party summaries. **unconfirmed**
8. **Model-Studio-level ISO 27001/27017/27018 scope** — only SOC 2 is asserted on the Model Studio privacy page. **unconfirmed**

---

## Searches run (234)

- Alibaba Cloud Model Studio OpenAI compatible API reference international
- Model Studio Responses API DashScope documentation
- alibabacloud.com Model Studio API reference chat completions
- Model Studio function calling parallel_tool_calls tool_choice documentation
- Alibaba Cloud Model Studio structured output JSON mode json_schema
- Model Studio built-in tools web search code interpreter file search Responses API
- "compatibility-with-openai-responses-api" Model Studio built-in tools web_search
- Model Studio Responses API supported models Singapore region endpoint
- Alibaba Cloud Model Studio "qwen-function-calling" parallel tool calls number of tools limit
- Model Studio context cache implicit explicit cache discount pricing
- Model Studio Batch API 50% discount turnaround time regions
- Model Studio rate limits requests per minute tokens per minute qwen
- Alibaba Cloud Model Studio MCP marketplace hosted MCP servers international Singapore
- Model Studio Responses API "mcp" remote MCP server tool
- Model Studio data_inspection_failed content moderation input output
- Model Studio thinking mode enable_thinking thinking_budget reasoning_effort
- Alibaba Cloud Model Studio data retention training customer data Singapore
- Model Studio workspace RAM sub-account API key quota per workspace billing
- Model Studio built-in tool web_search price per call billing international
- Model Studio code_interpreter built-in tool Responses API price
- Model Studio "file_search" built-in tool knowledge base pricing
- Model Studio Anthropic compatible API base URL Claude Code
- Model Studio DashScope SDK Python Java OpenAI SDK compatibility
- Model Studio Assistants API deprecated AgentRun AgentBay
- Model Studio context cache "256 tokens" implicit cache supported models qwen
- Model Studio explicit cache TTL time to live cache creation surcharge 25%
- Model Studio rate limit "qwen-max" RPM TPM default increase quota application
- Model Studio privacy notice data retention Singapore "not used for training"
- Model Studio ISO 27001 SOC compliance certifications international Model Studio
- Alibaba Cloud Model Studio zero data retention ZDR enterprise opt-in
- Model Studio "data-retention-policy" Zero Data Retention Alibaba Cloud International
- Alibaba Cloud Model Studio security certifications privacy notice ISO SOC 2 GDPR
- Alibaba Cloud AI Guardrails product content moderation Model Studio
- Model Studio web search enable_search search_strategy "max" results pricing per 1000 calls
- Model Studio Responses API "web_search" tool type search_options price per call international
- Model Studio web extractor page reader built-in tool Responses API
- alibabacloud.com model-studio web-search "Fee per 1,000 calls" turbo max agent strategy
- Model Studio built-in tools pricing "code_interpreter" per hour sandbox
- Model Studio "web_scraping" OR "web extractor" OR "page_reader" Responses API tool type
- Model Studio image_search built-in tool Responses API text-to-image image search price
- Model Studio Responses API supported models table built-in tools qwen3.8-max qwen-plus
- alibabacloud model studio mcp marketplace "MCP" square official MCP server list
- "MCP Square" Alibaba Cloud Model Studio international Singapore MCP marketplace
- Model Studio web search pricing Singapore "$" per 1000 calls web_search tool international regions
- Model Studio code interpreter pricing per hour Responses API international
- Model Studio function calling maximum number of tools limit qwen
- Model Studio structured output supported models qwen3.8-max JSON Schema strict
- Model Studio application calling API app_id DashScope completion international
- Model Studio console "MCP" square Singapore international not available China only
- alibabacloud model-studio mcp "Responses API" server_url tools type mcp allowed_tools
- Model Studio qwen-function-calling "tools" parameter maximum number limit description
- Model Studio error code data_inspection_failed 400 "Input data may contain inappropriate content"
- Model Studio deep thinking enable_thinking thinking_budget reasoning tokens billed output
- Model Studio reasoning_effort low medium high supported models qwen3.8
- alibabacloud model-studio rate-limit qwen3.8-max International RPM TPM
- Model Studio "Rate limiting" raise limits submit ticket quota increase international
- Model Studio context cache supported models qwen3.8-max qwen-plus implicit cache 40% off
- Model Studio context cache explicit cache supported models TTL 5 minutes minimum tokens
- alibabacloud model-studio batch-inference regions Singapore Beijing supported models 24 hours
- Model Studio batch inference completion window 24 hours file size limit
- "model-studio/rate-limit" International 1200 RPM qwen-plus qwen-flash qwen3.8-max tokens per minute
- Model Studio rate limiting "per primary account" RAM sub-accounts workspaces API keys combined
- alibabacloud model studio rate limit increase "quota" application Singapore how to raise
- Model Studio Responses API built-in tools web_search web_extractor code_interpreter image_search text_to_image supported models
- Model Studio Responses API "mcp" tool server_label server_url allowed_tools headers
- alibabacloud model studio Responses API only supported regions Singapore availability
- Model Studio retrieve-a-response output types web_search_call web_extractor_call code_interpreter_call mcp_call
- Model Studio Responses API "image_search" built-in tool
- Model Studio dynamic rate limiting quota-management Singapore TPM increase business manager
- Model Studio knowledge base file_search vector_store_ids create knowledge base API international
- Model Studio knowledge base only accounts created before 2025-04-21 Singapore agent workflow apps
- alibabacloud model studio knowledge base unavailable new international accounts restriction
- Model Studio application-introduction "Only users who created" "before April 21, 2025" call the API
- Model Studio application calling API app_id Singapore restriction new accounts cannot create applications
- alibabacloud model-studio file-search knowledge retrieval Responses API international availability
- alibabacloud.com/help/en/model-studio/mcp MCP Model Studio official MCP server hosted SSE endpoint
- Model Studio MCP Square region availability China Beijing only international
- Model Studio Responses API mcp tool "type": "mcp" server_url example alibabacloud
- "alibabacloud.com/help/en/model-studio/mcp" MCP service Model Studio console create SSE
- Model Studio MCP supported regions Beijing Singapore console left navigation MCP
- Model Studio content moderation turn off disable data_inspection_failed cannot be disabled
- AI Guardrails Model Studio one-click activation enable moderation international regions
- Model Studio content-security input output AI guardrail enable disable
- alibabacloud model studio "content moderation" built-in Green Net model API cannot disable
- alibabacloud.com/help/en/model-studio/content-security input and output AI guardrail
- Model Studio "Model Protection" guardrail enable content moderation Singapore international console
- Model Studio guardrails moderation tag management flexible Model Protection page
- Model Studio workspaces create workspace default workspace business space international
- Model Studio model usage statistics per workspace cost tracking billing
- Model Studio API key workspace-specific domain region bound
- Model Studio Singapore base URL dashscope-intl.aliyuncs.com compatible-mode workspace-specific endpoint
- Model Studio bill-query-and-cost-management workspace cost breakdown export CSV
- Model Studio permission-management RAM user role workspace administrator model permissions
- Model Studio qwen-function-calling "parallel_tool_calls" supported streaming tool calls
- Model Studio structured output response_format json_object json_schema supported models Qwen3.8-Max
- Model Studio function calling streaming incremental output tool_calls index
- Model Studio billing built-in tools web search web extractor code interpreter image search price per 1000 calls Singapore
- alibabacloud model studio "code_interpreter" billing per hour OR per call price
- alibabacloud model studio image-search price per 1000 calls image_search tool billing
- Model Studio qwen-api-via-openai-responses "Context Limit" 80% built-in tools reasoning buffer
- Model Studio Responses API supported models list qwen3.8-max qwen-plus kimi deepseek
- Model Studio Anthropic API messages built-in tools web_search web_extractor code_interpreter supported
- alibabacloud model-studio code-interpreter billing price per 1000 calls OR per hour sandbox
- Model Studio "t2i_search" text-to-image search built-in tool price
- alibabacloud model studio file-search knowledge retrieval billing price per 1000 calls vector store
- alibabacloud.com/help/en/model-studio/mcp "MCP" Model Studio official MCP servers list regions available
- Model Studio MCP service Alibaba Cloud API MCP server official list documentation international
- Model Studio "mcp" tool Responses API server_url required parameters model studio documentation
- "MCP Square" Model Studio console Singapore region not available international account
- alibabacloud help model-studio mcp "MCP Square" OR "MCP Marketplace" region China Beijing
- Model Studio knowledge base "only users who created" Singapore April 21 2025 knowledge base restriction
- docs.modelstudio.console.alibabacloud.com file-search Knowledge retrieval billing model call fees knowledge base storage
- Model Studio code interpreter tool Responses API pricing per call free limited time
- Model Studio knowledge base pricing storage embedding index international Singapore
- alibabacloud model-studio rag-knowledge-base "Console access restrictions" knowledge base Singapore April 21 2025
- alibabacloud model-studio qwen-code-interpreter Code Interpreter free limited time supported models region
- alibabacloud model-studio image-search "Search by image" $8.00 per 1,000 calls Singapore t2i_search
- alibabacloud model-studio web-extractor web extractor tool supported models region free limited time
- Model Studio text-to-image search t2i_search built-in tool price per 1000 calls
- Model Studio built-in tools supported regions Singapore only Beijing web_search availability
- Model Studio Responses API "only available in" Beijing Singapore regions availability built-in tools
- alibabacloud model studio web-search search_strategy turbo max agent agent_max price per 1000 calls
- alibabacloud model-studio web-search supported models qwen3.8-max qwen-plus Singapore Responses API enable_search
- Model Studio Anthropic-compatible Messages API base URL regions supported models web_fetch web_search tools
- alibabacloud model studio anthropic-api-messages supported models regions Singapore
- Model Studio "Conversations API" OpenAI compatible conversations Responses API stateful
- alibabacloud model-studio regions Responses API availability Beijing Singapore only feature region table
- Model Studio "Responses API" region availability "US (Virginia)" "Japan (Tokyo)" "Germany (Frankfurt)"
- alibabacloud model-studio openai-compatible-conversations Conversations API supported models region
- Model Studio text generation API reference interfaces OpenAI Chat Completions Responses DashScope Anthropic
- alibabacloud model studio qwen-api-reference interfaces list Anthropic-compatible DashScope
- Model Studio SDK DashScope Python Java OpenAI SDK Node.js Go available
- alibabacloud model-studio regions "Feature availability by region" table Responses API fine-tuning batch
- Model Studio DashScope domain migration workspace-specific domain September 30 2026 new features
- alibabacloud model studio regions endpoints Singapore workspace-specific DashScope OpenAI-compatible base URL list
- Model Studio batch inference supported models regions China Beijing Singapore 24 hours completion_window
- alibabacloud model studio batch-interfaces-compatible-with-openai file upload JSONL completion window
- Model Studio batch API not subject to rate limit dedicated quota
- alibabacloud model-studio rate-limit International qwen-plus 1200 RPM 5000000 TPM qwen-flash
- Model Studio context cache implicit cache "20%" input price minimum tokens TTL supported models qwen3.8-max
- Model Studio explicit cache create cache API cache_id 5 minutes validity surcharge 25% 90% saving
- Model Studio deep-thinking enable_thinking thinking_budget reasoning_content non-thinking mode models supported
- Model Studio reasoning_effort parameter supported models qwen3.8-max low medium high
- Model Studio thinking tokens billed as output tokens reasoning_content pricing
- "rate-limit" Model Studio "qwen3.8-max" "600" "1,000,000" International
- Model Studio rate limit table qwen3.8-max qwen3.7-plus qwen3.8-flash International RPM TPM values
- Model Studio structured output supported models Qwen-Max Qwen3.8-Max series Qwen-Plus Qwen-Flash JSON Schema
- Model Studio qwen-structured-output json_schema strict parameter response_format supported models Chat Completions Responses
- Model Studio function calling supported models tool_choice auto none required specific function
- Model Studio function calling "tools" parameter limit number of functions recommended
- alibabacloud model-studio qwen-function-calling "The Qwen series models do not support" tool_choice
- Model Studio dynamic rate limiting qwen3.8-max qwen3.8-flash monthly spend tier TPM quota
- alibabacloud model-studio quota-management dynamic rate limiting tiers monthly consumption Singapore
- Model Studio rate-limit "qwen3.8-max" "Dynamic" International RPM TPM table
- alibabacloud model studio rate limit qwen-plus International 1200 5000000
- Model Studio qwen3.8-flash rate limit tiered monthly spend TPM dynamic
- alibabacloud model-studio rate-limit "qwen-plus" International "30,000" "5,000,000"
- alibabacloud model-studio rate-limit "qwen-flash" International RPM TPM
- alibabacloud model-studio rate-limit qwen3.7-max International RPM TPM table
- Model Studio rate limiting "Text Generation-Qwen" "Qwen Language Model" International 600 1000000 qwen-max
- Model Studio dynamic rate limiting tiers spend TPM qwen3.8-max Singapore table values
- alibabacloud model studio qwen3-8-max model info dynamic rate limiting scope International Global
- alibabacloud model-studio quota-management dynamic rate limiting tier monthly consumption TPM values table
- Model Studio temporary TPM quota increase console 30 days rate limit
- alibabacloud model-studio list-quotas model_limit workspace_limit rate limits two levels
- alibabacloud model-studio qwen-plus model info Rate Limits Singapore International RPM TPM
- alibabacloud model-studio qwen-flash model info rate limits Singapore International
- alibabacloud model-studio qwen3.8-flash rate limits Singapore International dynamic
- alibabacloud model-studio quota-management "Tier 1" "$8,000" TPM tier monthly consumption
- Model Studio context cache implicit cache minimum 256 tokens supported models qwen3.8-max qwen-plus qwen-flash
- Model Studio context cache "cache_hit" usage field prompt_tokens_details cached_tokens
- Model Studio data retention policy prompts responses 30 days not used for training abuse monitoring
- Model Studio Singapore region data processed stored residency international
- Model Studio SOC 2 ISO 27001 privacy notice security certifications list
- "model-studio/privacy-notice" Alibaba Cloud Model Studio "SOC 2" ISO 27001 ISO 27701 certifications never use your data for model training
- Model Studio data retention policy ZDR enterprise customers account manager needs assessment scope
- Model Studio "Training data summary" privacy notice security compliance page
- Model Studio context cache "implicit cache" minimum tokens 256 hit condition supported models list
- Model Studio context cache explicit cache create cache API DashScope cache_id parameters
- alibabacloud model studio context-cache billing cached_tokens usage response field discount
- Model Studio context cache "minimum" implicit cache write hit tokens Qwen 256 GLM 512
- alibabacloud model-studio context-cache supported models list implicit explicit qwen3.8-max qwen-plus
- Model Studio explicit cache supported models qwen3-coder-plus cache_control ephemeral type
- alibabacloud.com help model-studio content-security input output AI guardrail international English page
- Model Studio content moderation cannot be turned off mandatory platform policy appeal false positive
- AI Guardrails international regions availability Singapore Alibaba Cloud content moderation 2.0
- alibabacloud model-studio context-cache implicit cache "minimum token" Qwen 256 tokens write hit
- Model Studio content-security page English alibabacloud help model-studio content moderation guardrail model calls
- Model Studio assistant API deprecated Assistants Threads Messages Runs migration Responses API
- Model Studio application calling API app_id DashScope apps completion HTTP endpoint Singapore
- alibabacloud model-studio application-calling-guide workflow agent application API restrictions before April 21 2025
- Model Studio "Agent Orchestration" multi-agent application API international
- alibabacloud model-studio context-cache "1024" minimum token implicit cache explicit cache Qwen
- Model Studio assistant API deprecated Assistants Threads Messages Runs alibabacloud help
- alibabacloud model-studio application-api-reference APP_ID completion parameters biz_params session_id
- Model Studio error codes 400 DataInspectionFailed solution modify input content retry international
- Model Studio error-code page list 429 Throttling RateLimit quota exceeded 403
- alibabacloud model studio content moderation appeal false positive submit ticket DataInspectionFailed knowledge base ID
- alibabacloud.com/help/en/model-studio content-security guardrail Model Protection enable region
- Model Studio data-retention-policy 30 days ZDR workspace content moderation inline inference
- Model Studio get-api-key 50 API keys per account per region 20 workspaces
- Model Studio Assistant API deprecated Assistants Threads Messages Runs Run steps streaming shutdown date
- alibabacloud model studio quick-start-of-assistant-api deprecated replacement
- Model Studio permission management three roles super administrator workspace member API key permissions
- alibabacloud model-studio web-search search_strategy turbo max agent agent_max forced_search enable_search Chat Completions parameter
- alibabacloud model studio web search billing "A call is billed when" search results returned count
- alibabacloud model-studio regions "Real-time inference" "Batch inference" "Fine-tuning" feature availability Singapore Virginia Frankfurt Tokyo Hong Kong
- alibabacloud model-studio data-retention-policy ZDR workspace level enterprise application process
- Model Studio data retention policy stateful features knowledge base Assistants Threads retention
- alibabacloud model studio mcp "Model Studio" MCP service deploy region availability China only international console
- alibabacloud model-studio regions feature availability "Batch inference" "Supported" "Not supported" Singapore Virginia Frankfurt Tokyo Hong Kong
- alibabacloud model-studio mcp page "MCP" Responses API add MCP server information tools parameter how to connect
- alibabacloud model-studio qwen-api-reference OpenAI-compatible Chat Completion Responses Anthropic DashScope native interface most complete features
- alibabacloud model-studio web-search supported models Singapore qwen3.8-max qwen-plus qwen-flash enable_search DashScope
- Model Studio web search "agent_max" strategy web extractor supported models Responses API
- Model Studio image-search "Search by image" supported models regions Singapore only
- alibabacloud model-studio web-search pricing table "turbo" "$" per 1000 calls Singapore Beijing Virginia
- alibabacloud model-studio qwen-code-interpreter Code Interpreter free limited time supported models Responses API Anthropic API
- alibabacloud model studio web-search-image text-to-image search supported models regions price
- docs.modelstudio.console.alibabacloud.com file-search Knowledge retrieval regions Singapore knowledge base create
- Model Studio knowledge base "Application Data" console access restrictions Singapore April 21 2025 new accounts cannot create
- Model Studio file_search Responses API knowledge base ID obtain create knowledge base restriction international
- alibabacloud model-studio web-search "Fee per 1,000 calls" turbo policy max policy agent policy Singapore $
- alibabacloud.com/help/en/model-studio/qwen-code-interpreter Code Interpreter supported models regions free limited time
- alibabacloud model-studio mcp page "MCP service" Model Studio deploy Function Compute official MCP third-party
- Model Studio official MCP service enable now Amap Maps console region China Beijing only international
- alibabacloud help en model-studio official-and-third-party-mcp Official MCP Service international
- Model Studio custom MCP services deploy Function Compute ACK international Singapore
- alibabacloud model-studio web-search "turbo" "max" "agent" fee per 1000 calls "US (Virginia)" "Japan (Tokyo)" "Germany (Frankfurt)"
- alibabacloud.com/help/en/model-studio/qwen-code-interpreter Code Interpreter Responses API Anthropic API supported models
- alibabacloud.com/help/en/model-studio/mcp "Official MCP" "Custom MCP" Model Studio connect MCP services
- Model Studio "More tools" page third-party programming tools OpenAI Anthropic API protocols Claude Code Cursor
- alibabacloud model studio text-generation page API interfaces OpenAI compatible Responses DashScope Anthropic overview
- Model Studio Conversations API supported models region availability stateful conversation

## Sources returned by search (1219)

- https://www.alibabacloud.com/help/en/model-studio/compatibility-with-openai-responses-api
- https://www.alibabacloud.com/help/en/model-studio/embedding-interfaces-compatible-with-openai
- https://www.alibabacloud.com/help/en/model-studio/qwen-api-reference/
- https://www.alibabacloud.com/help/en/model-studio/openai-compatible-conversations
- https://www.alibabacloud.com/help/en/model-studio/batch-interfaces-compatible-with-openai
- https://www.alibabacloud.com/help/en/model-studio/qwen-api-via-openai-chat-completions
- https://www.reddit.com/r/Qwen_AI/comments/1x4w15h/qwen38flash_on_alibaba_cloud_model_studio/
- https://www.alibabacloud.com/help/en/model-studio/more-tools
- https://www.alibabacloud.com/help/en/model-studio/what-is-model-studio
- https://github.com/QwenLM/Qwen3/discussions/1862
- https://www.alibabacloud.com/help/en/model-studio/first-api-call-to-qwen
- https://help.aliyun.com/en/model-studio/qwen-api-via-dashscope
- https://docs.litellm.ai/docs/providers/dashscope
- https://www.alibabacloud.com/help/en/model-studio/application-calling-guide
- https://help.aliyun.com/en/model-studio/qwen-api-via-openai-responses
- https://www.youtube.com/watch?v=QmB2qxcQx88&vl=en-US
- https://github.com/toeverything/AFFiNE/issues/13617
- https://apis.io/apis/qwen/dashscope/
- https://help.aliyun.com/en/model-studio/qwen-api-via-openai-chat-completions
- https://qwenlm.github.io/qwen-code-docs/en/users/configuration/model-providers/
- https://www.alibabacloud.com/help/en/model-studio/get-api-key
- https://modelstudio.alibabacloud.com/
- https://www.alibabacloud.com/blog/one-key-one-cli-%E2%80%94-manage-your-alibaba-cloud-model-studio-token-plan-from-terminal-or-ai-agent_603453
- https://www.developersdigest.tech/models/fine-tuning/alibaba-model-studio
- https://www.alibabacloud.com/blog/setting-up-an-ai-chatbot-for-marketing-automation-with-alibaba-cloud-model-studio_603115
- https://albertoroura.com/testing-alibaba-cloud-model-studio/
- https://www.alibabacloud.com/help/en/model-studio/qwen-function-calling
- https://community.openai.com/t/what-models-support-parallel-tool-calls-and-when-to-use-it/1310788
- https://docs.nvidia.com/nim/large-language-models/1.1.0/function-calling.html
- https://docs.mistral.ai/studio/conversations/function-calling
- https://console.upstage.ai/docs/capabilities/generate/tool-calling
- https://community.openai.com/t/feature-request-guarantee-a-specific-tool-call-without-blocking-parallel-calls/1375231
- https://docs.anyscale.com/llm/serving/tool-function-calling
- https://stackoverflow.com/questions/79738038/model-returns-mutiple-tools-to-call-even-when-parallel-tool-calls-is-set-to-f
- https://docs.vllm.ai/en/latest/features/tool_calling/
- https://ai-tldr.dev/learn/llm-apis/function-calling/parallel-tool-calling/
- https://www.alibabacloud.com/help/en/model-studio/qwen-structured-output
- https://www.alibabacloud.com/help/fr/model-studio/qwen-structured-output
- https://try-qwen-ai.com/api/qwen-structured-output-json-schema/
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen-structured-output
- https://github.com/QwenLM/Qwen3/issues/1619
- https://qwenlm.github.io/qwen-code-docs/en/users/features/structured-output/
- https://crazyrouter.com/en/blog/structured-output-json-mode-ai-api-guide-2026
- https://medium.com/@marketing_novita.ai/enhance-ai-models-prompt-engineering-with-json-output-ca450f62159a
- https://blog.doubleslash.de/en/software-technologien/kuenstliche-intelligenz/structure-llms-instead-of-guessing-how-to-turn-your-ki-into-a-data-source
- https://developers.openai.com/api/docs/guides/tools
- https://parallel.ai/articles/openai-responses-agents-how-to-choose-the-right-web-search-backend
- https://hyperskill.org/learn/step/53371
- https://www.youtube.com/watch?v=8St8elOrRPY
- https://learn.microsoft.com/en-us/answers/questions/5534977/please-make-code-interpreter-usable-with-responses
- https://medium.com/@rubesh.mehta/analyzing-data-with-openais-new-responses-api-using-the-code-interpreter-tool-54f5647c1411
- https://reference.langchain.com/javascript/langchain-openai/tools
- https://www.youtube.com/watch?v=QF0v3dXg0Kg
- https://openai.github.io/openai-agents-python/tools/
- https://community.openai.com/t/new-tools-for-building-agents-responses-api-web-search-file-search-computer-use-and-agents-sdk/1140896
- https://www.alibabacloud.com/help/es/model-studio/compatibility-with-openai-responses-api
- https://yololab.net/archives/qwen-api-alibaba-cloud-model-studio-responses-agent-guide
- https://www.alibabacloud.com/help/zh/model-studio/compatibility-with-openai-responses-api
- https://www.alibabacloud.com/help/tc/model-studio/compatibility-with-openai-responses-api
- https://www.alibabacloud.com/help/en/model-studio/compatibility-of-openai-with-dashscope
- https://help.aliyun.com/en/model-studio/regions
- https://www.alibabacloud.com/help/en/model-studio/text-generation
- https://www.alibabacloud.com/help/en/model-studio/models
- https://inspect.aisi.org.uk/providers.html
- https://lmstudio.ai/docs/developer/openai-compat
- https://docs.langchain.com/langsmith/playground-model-providers
- https://www.alibabacloud.com/blog/602750
- https://try-qwen-ai.com/comparisons/qwen-api-vs-openai-api/
- https://omidsaffari.com/blog/qwen-3-8-max-vs-claude-fable-5-1-for-coding-agents
- https://try-qwen-ai.com/api/alibaba-cloud/
- https://huggingface.co/datasets/clem/clem_mentionsanalysis_whatsbest_april26/blob/e3a94ab63308df87fea7e3df7ee0b1d37ea07984/codex__gpt-4.1__high__enabled.jsonl
- https://www.alibabacloud.com/help/en/model-studio/context-cache
- https://medium.com/google-cloud/implicit-vs-explicit-context-caching-in-google-cloud-agent-platform-explained-with-real-numbers-db35d67f9b18
- https://www.alibabacloud.com/help/en/model-studio/explicit-cache-guide
- https://artificialanalysis.ai/models/caching
- https://techjacksolutions.com/ai-tools/google-gemini/gemini-context-caching-cost-optimization/
- https://benchlm.ai/blog/posts/prompt-caching
- https://www.developersdigest.tech/blog/prompt-caching-across-ai-providers-2026
- https://www.firecrawl.dev/blog/prompt-caching
- https://coolhandlabs.com/updates/llm-prompt-caching-gemini-how-to-and-pro-tips
- https://levelup.gitconnected.com/prompt-caching-can-raise-your-bill-the-break-even-for-openai-claude-gemini-and-deepseek-725bb59e7894
- https://www.alibabacloud.com/help/en/model-studio/batch-inference
- https://intuitionlabs.ai/articles/batch-ai-processing-cost-turnaround
- https://help.aliyun.com/en/model-studio/openai-compatible-batch-chat
- https://www.alibabacloud.com/help/en/model-studio/model-pricing
- https://packet.ai/blog/batch-inference-throughput-economics
- https://www.digitalocean.com/community/conceptual-articles/cheapest-batch-inference-for-low-cost-ai-inference
- https://dotzlaw.com/insights/obsidian-notes-02/
- https://www.alibabacloud.com/help/en/model-studio/new-free-quota
- https://ccapi.ai/blog/batch-api-half-price-bundling-requests
- https://www.alibabacloud.com/help/en/model-studio/rate-limit
- https://help.aliyun.com/en/model-studio/rate-limit
- https://www.reddit.com/r/Qwen_AI/comments/1se2p9r/guys_how_about_giving_us_a_paid_qwen_36_plus_api/
- https://apis.io/rate-limits/qwen/qwen-rate-limits/
- https://ai.google.dev/gemini-api/docs/rate-limits
- https://www.layer3labs.io/guides/qwen-3-8-limits
- https://www.alibabacloud.com/help/en/model-studio/cli/usage-quota.md
- https://www.facebook.com/groups/thaidev/posts/1602733197192871/
- https://cabina.ai/blog/qwen-api-pricing/
- https://bettertoken.ai/en/blog/qwen-code-usage-limits-auth-quota/
- https://www.alibabacloud.com/help/en/model-studio/mcp
- https://www.alibabacloud.com/blog/accelerating-ai-integration-with-alibaba-cloud%E2%80%99s-model-context-protocol-mcp_602490
- https://github.com/aliyun/alibaba-cloud-ops-mcp-server
- https://mcpservers.org/servers/aliyun/alibaba-cloud-ops-mcp-server
- https://www.alibabacloud.com/help/en/model-studio/web-search-for-coding-plan
- https://www.alibabacloud.com/blog/mcp-for-observability-2-0---six-practices-for-making-good-use-of-mcp_602423
- https://help.aliyun.com/en/model-studio/custom-mcp
- https://mcp.so/servers/alibaba-cloud-ops-mcp-server
- https://www.alibabacloud.com/
- https://baike.baidu.com/en/item/MCP%20Marketplace/6649353
- https://developers.openai.com/api/docs/guides/tools-connectors-mcp
- https://openai.github.io/openai-agents-python/mcp/
- https://learn.microsoft.com/en-us/answers/questions/5657679/having-issues-calling-mcp-servers-using-azure-open
- https://www.youtube.com/watch?v=RhTiAOGwbYE
- https://www.reddit.com/r/mcp/comments/1t73igk/how_to_connect_100_mcp_servers_without_the/
- https://lmstudio.ai/docs/developer/core/mcp
- https://developers.google.com/people/api/mcp
- https://medium.com/@dneprokos/mcp-servers-the-tool-awakens-524193ad2d3f
- https://www.descope.com/learn/post/mcp
- https://vidcella.ai/posts/wan-3-0-inappropriate-content-error
- https://help.aliyun.com/en/model-studio/content-security
- https://www.alibabacloud.com/help/en/model-studio/error-code
- https://github.com/QwenLM/qwen-code/issues/3145
- https://www.reddit.com/r/Qwen_AI/comments/1sdu8nd/inapropriate_content/
- https://www.alibabacloud.com/help/en/model-studio/coding-plan-faq
- https://github.com/camel-ai/owl/issues/432
- https://help.aliyun.com/en/document_detail/2923687.html
- https://github.com/QwenLM/qwen-code/issues/3119
- https://github.com/openclaw/openclaw/issues/26376
- https://www.alibabacloud.com/help/en/model-studio/deep-thinking
- https://try-qwen-ai.com/features/qwen-deep-thinking-mode-explained/
- https://ai.google.dev/gemma/docs/capabilities/thinking
- https://help.aliyun.com/en/model-studio/mimo
- https://www.datacamp.com/tutorial/qwen3-max-thinking
- https://prompt-architects.com/blog/315-how-to-prompt-qwen-models
- https://www.cloudarchpro.com/guides/ai-infrastructure/prompt-engineering-qwen-model-studio/
- https://docs.litellm.ai/docs/reasoning_content
- https://docs.msty.ai/studio/managing-models/thinking-effort
- https://www.reddit.com/r/LocalLLM/comments/1vz28di/qwen_38_27b_reasoning_effort_in_lm_studio/
- https://www.alibabacloud.com/help/en/model-studio/privacy-notice
- https://www.alibabacloud.com/help/en/legal/latest/alibaba-cloud-international-website-privacy-policy
- https://www.facebook.com/alibabacloud/posts/enterprise-customers-can-opt-into-zero-data-retention-zdr-for-alibaba-cloud-mode/1583346547170765/
- https://www.alibabacloud.com/blog/alibaba-cloud-empowers-global-enterprises-with-expanded-ai-services_602929
- https://www.youtube.com/watch?v=gfqytnlfx2s
- https://help.aliyun.com/en/model-studio/faq-about-alibaba-cloud-model-studio
- https://www.linkedin.com/company/alibaba-cloud-computing-company
- https://www.alibabacloud.com/help/en/model-studio/regions
- https://www.alibabacloud.com/help/en/model-studio/permission-management-overview
- https://www.alibabacloud.com/help/tr/model-studio/permission-management-overview
- https://help.aliyun.com/en/model-studio/get-api-key
- https://discuss.ai.google.dev/t/api-quota-tier-unavailable-despite-active-billing/110513
- https://www.alibabacloud.com/help/en/model-studio/application-permission-management-overview
- https://www.reddit.com/r/RooCode/comments/1k3kfzx/multiple_google_workspace_account_multiple_api/
- https://www.alibabacloud.com/help/en/model-studio/token-plan-team-faq
- https://community.openai.com/t/how-to-set-billing-limits-and-restrict-model-usage-for-a-project-via-openai-api/1087771
- https://note.com/shiratama1126/n/n72061bdea6b1?hl=en
- https://github.com/google-gemini/gemini-cli/issues/24396
- https://www.alibabacloud.com/help/en/model-studio/web-search
- https://developers.openai.com/api/docs/pricing
- https://help.aliyun.com/en/model-studio/web-search
- https://cloud.google.com/model-garden/pricing
- https://github.com/anomalyco/models.dev/issues/8707
- https://docs.x.ai/developers/pricing
- https://www.digitalapplied.com/blog/web-search-apis-for-ai-agents-compared-2026
- https://medium.com/@inamdaraditya/cloudflare-just-turned-web-search-into-a-single-api-call-heres-what-it-actually-costs-b9577051770b
- https://www.nops.io/blog/pricing-for-ai/
- https://openai.com/index/new-tools-and-features-in-the-responses-api/
- https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/responses
- https://developers.openai.com/api/docs/guides/tools-code-interpreter
- https://www.ml4devs.com/articles/openai-responses-api-vs-chat-completions/
- https://www.cometapi.com/openai-responses-api-gets-a-major-upgrade/
- https://ai-sdk.dev/providers/ai-sdk-providers/openai
- https://docs.litellm.ai/docs/providers/openai
- https://help.aliyun.com/en/model-studio/file-search
- https://www.alibabacloud.com/help/en/model-studio/qwen-api-via-openai-responses
- https://ai.google.dev/gemini-api/docs/file-search
- https://blog.google/innovation-and-ai/technology/developers-tools/file-search-gemini-api/
- https://docs.litellm.ai/docs/providers/bedrock_vector_store
- https://x.com/GoogleAIStudio/status/1988290390169141295
- https://openai.com/index/new-tools-for-building-agents/
- https://aistudio.yandex.ru/en/docs/ai-studio/concepts/agents/tools/
- https://www.mindstudio.ai/blog/agentic-rag-vs-file-search-ai-agent-workflow
- https://docs.bailian.console.aliyun.com/en/model-studio/file-search
- https://www.alibabacloud.com/help/en/model-studio/anthropic-api-messages
- https://lmstudio.ai/docs/developer/anthropic-compat
- https://platform.claude.com/docs/en/cli-sdks-libraries/libraries/openai-sdk
- https://handbook.modular.com/model-interaction/anthropic-compatible-api/
- https://code.claude.com/docs/en/llm-gateway
- https://github.com/anthropics/claude-code/issues/216
- https://www.reddit.com/r/ClaudeAI/comments/1t0cpa8/can_i_use_claude_interface_with_locally_hosted/
- https://michaelwolfinger.com/blog/2026/claude-code-local-llm-apple-silicon/
- https://fazm.ai/blog/route-claude-api-through-custom-endpoint-anthropic-base-url
- https://lmstudio.ai/blog/claudecode
- https://www.alibabacloud.com/help/en/model-studio/install-sdk
- https://help.aliyun.com/en/model-studio/install-sdk
- https://github.com/dashscope/dashscope-sdk-python
- https://help.aliyun.com/en/model-studio/openai-file-interface
- https://www.alibabacloud.com/help/tr/model-studio/first-api-call-to-qwen
- https://help.aliyun.com/en/model-studio/qwen-tts-realtime-python-sdk
- https://www.developersdigest.tech/reference/sdks
- https://therouter.ai/blog/openai-compatible-api-providers/
- https://www.alibabacloud.com/help/en/model-studio/assistantapi.md
- https://docs.bailian.console.aliyun.com/en/model-studio/assistant
- https://www.swytchcode.com/content/why-ai-keeps-using-deprecated-apis
- https://technspire.com/en/blog/assistants-api-is-gone-a-step-by-step-migration
- https://learn.microsoft.com/en-my/answers/questions/5813664/issue-updating-agent-with-non-chatgpt-models-using
- https://github.com/agentbay-ai/wuying-agentbay-sdk
- https://arxiv.org/html/2512.04367v1
- https://docs.appian.com/suite/help/26.9/model-support-and-deprecation.html
- https://docs.apiyi.com/en/api-capabilities/deprecated-models
- https://zenmux.ai/docs/guide/advanced/prompt-cache.html
- https://www.alibabacloud.com/blog/603236
- https://steadygateway.com/guides/qwen-api-pricing-explained
- https://therouter.ai/blog/llm-api-prompt-caching-cross-provider-comparison/
- https://www.reddit.com/r/Qwen_AI/comments/1vzrzav/help_tune_my_qwen_38_27b_settings_5080/
- https://www.youtube.com/watch?v=VgY0PbsoEXo
- https://china-llm.com/blog/llm-cache-hit-rate
- https://arxiv.org/html/2506.12708v2
- https://huggingface.co/philipjohnbasile/Qwen3.6-27B-Fable-Fusion-711-MTPLX-6bit
- https://latent.space/p/ainews-anthropics-agent-autonomy/
- https://platform.claude.com/docs/en/build-with-claude/prompt-caching
- https://www.prompthub.us/blog/prompt-caching-with-openai-anthropic-and-google-models
- https://ai.google.dev/gemini-api/docs/generate-content/caching
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/context-cache/context-cache-overview
- https://cloud.google.com/blog/products/ai-machine-learning/vertex-ai-context-caching
- https://www.digitalapplied.com/blog/prompt-caching-2026-cut-llm-costs-engineering-guide
- https://fast.io/resources/gemini-context-caching/
- https://timwappat.info/auto-cache-passively-saves-on-you-ai-model-costs/
- https://www.morphllm.com/qwen-api
- https://therouter.ai/blog/ai-api-rate-limit-comparison-2026/
- https://www.alibabacloud.com/help/en/model-studio/faq-about-alibaba-cloud-model-studio
- https://www.maximem.ai/blog/qwen-api-pricing-2026
- https://allaiask.com/llm-providers/qwen/rate-limits
- https://www.eesel.ai/blog/qwen-pricing
- https://www.alibabacloud.com/help/id/model-studio/rate-limit
- https://help.aliyun.com/zh/model-studio/error-code
- https://www.developersdigest.tech/models/data-retention/qwen
- https://secureprivacy.ai/blog/gpt-5-training-data-opt-out
- https://www.swfte.com/blog/is-chatgpt-private
- https://trustedrouter.com/providers
- https://jazz.security/dlp-explained/dlp-basics/does-chatgpt-train-on-company-data/
- https://tekno3d.com/ai-suite-privacy-policy/
- https://nano-gpt.com/legal/privacy-policy
- https://www.linkedin.com/pulse/intelligence-pipeline-what-we-really-give-away-when-pierre-jean-vzp4e
- https://www.getvoibe.com/resources/ai-privacy-tracker/
- https://www.glbgpt.com/hub/ai-data-privacy/
- https://servicetrust.microsoft.com/viewpage/ISOIEC
- https://nebius.com/blog/posts/soc-2-type-ii-hipaa-iso-27001-enterprise-security-standards
- https://cloud.google.com/security/compliance/iso-27001
- https://www.trados.com/faq/does-your-platform-meet-international-security-standards/
- https://discuss.ai.google.dev/t/is-google-ai-studio-iso-27001-soc2-certified/77210
- https://www.facebook.com/groups/sydneystartups/posts/37567692892845196/
- https://docs.customer.io/accounts/security/certifications/
- https://cymulate.com/blog/cymulate-assists-iso-27001-certification-compliance/
- https://compliance.salesforce.com/categories/iso-27001
- https://zachrattner.com/projects/ai-mac-cluster/compliance
- https://www.alibabacloud.com/help/id/model-studio/data-retention-policy
- https://x.com/alibaba_cloud/status/2116070846418624804
- https://www.instagram.com/p/DfHDepdFxo0/
- https://opper.ai/provider/alibaba
- https://www.premai.io/blog/zero-data-retention-enterprise-ai-platforms
- https://platform.claude.com/docs/en/manage-claude/api-and-data-retention
- https://openai.com/index/offering-zero-data-retention-for-frontier-models/
- https://www.linkedin.com/posts/alibabacloudglobal_aiagents-agenticai-generativeai-activity-7521836623550935040-tfIM
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/data-retention-policy
- https://www.alibabacloud.com/help/fr/model-studio/data-retention-policy
- https://www.alibabacloud.com/help/en/model-studio/security-and-compliance/
- https://www.alibabacloud.com/help/en/model-studio/model-training-overview
- https://checkableai.com/stack-check/platforms/alibaba-qwen/
- https://opper.ai/ai-compliance
- https://deepseek-usa.ai/comparison/qwen/
- https://crfm.stanford.edu/fmti/December-2025/company-reports/Alibaba_FinalReport_FMTI2025.html
- https://www.alibabacloud.com/en/trust-center/compliance?_p_lc=1
- https://help.aliyun.com/en/model-studio/privacy-notice
- https://www.alibabacloud.com/help/tr/model-studio/privacy-notice
- https://www.linkedin.com/pulse/data-privacy-compliance-how-alibaba-cloud-meets-global-sherdil-xmzcf
- https://www.scribd.com/document/722903793/Alibaba-Cloud-Security-Compliance
- https://www.alibabacloud.com/en/trust-center/gdpr?_p_lc=1
- https://www.alibabacloud.com/blog/secure-your-business-with-alibaba-cloud%E2%80%99s-asia-data-compliance_602328
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/privacy-notice
- https://www.alibabacloud.com/en/product/ai_guardrails?_p_lc=1
- https://www.alibabacloud.com/help/en/content-moderation/latest/what-is-ai-security-barrier
- https://www.alibabacloud.com/en/product/content-moderation?_p_lc=1
- https://www.alibabacloud.com/help/en/content-moderation/latest/product-advantages
- https://www.alibabacloud.com/help/en/content-moderation/latest/product-overview
- https://www.alibabacloud.com/blog/ai-guardrails-real-time-protection-for-llms-and-ai-agents%C2%A0_603442
- https://www.alibabacloud.com/en/product/content-moderation/pricing?_p_lc=1
- https://www.alibabacloud.com/help/en/content-moderation/latest/what-is-content-moderation
- https://www.alibabacloud.com/blog/enterprise-ai-security-guardrails-protecting-sensitive-data-with-alibaba-cloud_603590
- https://qwenlm.github.io/qwen-code-docs/en/developers/tools/web-search/
- https://docs.aimlapi.com/api-references/text-models-llm/alibaba-cloud/qwen3.5-flash
- https://lmstudio.ai/delan/web-search
- https://ai.google.dev/gemini-api/docs/models
- https://www.alibabacloud.com/help/en/model-studio/realtime
- https://medium.com/@marcus121neo/optimizing-llm-web-search-for-accuracy-and-cost-what-really-works-in-practice-89d5e1ae9591
- https://help.apiyi.com/en/brave-search-api-clawdbot-configuration-guide-en.html
- https://developers.openai.com/api/docs/guides/tools-web-search
- https://docs.orq.ai/ai-gateway/features/web-search
- https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/web-search
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool
- https://www.alibabacloud.com/help/en/model-studio/qwen-omni
- https://cobusgreyling.substack.com/p/openai-web-search-api
- https://openrouter.ai/docs/guides/features/server-tools/web-search
- https://www.firecrawl.dev/blog/web-search-api
- https://python.useinstructor.com/integrations/openai-responses/
- https://ai-sdk.dev/cookbook/guides/openai-responses
- https://docs.firecrawl.dev/quickstarts/openai-responses-api
- https://www.youtube.com/watch?v=b-BzeHF6WLA
- https://medium.com/@odhitom09/openai-responses-api-a-comprehensive-guide-ad546132b2ed
- https://help.aliyun.com/en/model-studio/token-plan-team-overview
- https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/tools/code-interpreter
- https://www.alibabacloud.com/help/en/model-studio/deepseek-v4-1-flash
- https://www.youtube.com/watch?v=fNhY-OJtmGE&vl=en
- https://realpython.com/ref/ai-coding-tools/openai-code-interpreter/
- https://docs.litellm.ai/blog/tags/opensandbox
- https://explainx.ai/blog/microsoft-copilot-harness-foundry-agent-service-preview-long-running-resilience-ga-pricing-december-1-2026
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/build/runtime/create-a-langgraph-agent
- https://docs.oracle.com/en-us/iaas/Content/generative-ai/get-started-agents.htm
- https://research.library.gsu.edu/R/web_scraping
- https://docs.rs/openai-interface/latest/src/openai_interface/responses/mod.rs.html
- https://www.jsdelivr.com/package/npm/pi-models-access
- https://www.facebook.com/0xSojalSec/posts/new-qwen35-model-for-agentic-ai-era-qwen35-397b-a17b-apache-20-license-it-is-a-3/1447291650258567/
- https://github.com/HaveNiceDa/My-Notion/blob/main/docs/ai-docs/tool/dashscope-web-extractor.md
- https://docs.arcade.dev/build/create-tools/tool-basics/add-tool-metadata
- https://www.openwebninja.com/api/real-time-web-search
- https://www.firecrawl.dev/blog/nimbleway-alternatives
- https://docs.uipath.com/activities/other/latest/ui-automation/example-of-using-data-scraping
- https://developers.openai.com/api/docs/guides/image-generation
- https://aistudio.google.com/learn/multimodal-rag-file-search
- https://ai.google.dev/gemini-api/docs/image-generation
- https://openrouter.ai/blog/insights/image-generation-models-compared/
- https://aimlapi.com/models
- https://modelslab.com/cheapest-ai-image-api
- https://apiserpent.com/image-search-api
- https://docs.apiyi.com/en
- https://docs.cloud.google.com/vision/product-search/docs
- https://qwen.ai/blog?id=qwen3.8
- https://qwen.ai/apiplatform
- https://openrouter.ai/qwen
- https://www.facebook.com/AlibabaCloudSEA/videos/meet-qwen38-max-a-new-bar-for-coding-and-cowork/1614787523585887/
- https://qwen.ai/blog?id=qwen3.8-flash-next
- https://www.lindy.ai/blog/qwen-3-8
- https://docs.aimlapi.com/api-references/text-models-llm/alibaba-cloud/qwen-plus
- https://qwen.ai/blog?id=qwen3.7
- https://github.com/mctrinh/awesome-mcp-servers
- https://www.alibabacloud.com/blog/a-comprehensive-analysis-and-practical-implementation-of-the-new-features-in-the-mcp-specification_602206
- https://cline.bot/mcp-marketplace
- https://aiagents.org.uk/modelscope-mcp-square-review/
- https://www.augmentcode.com/mcp
- https://winbuzzer.com/ai/mcp-servers-and-tools/
- https://www.alibabacloud.com/help/en/lingma/agent
- https://arxiv.org/html/2503.23278v3
- https://apis.io/servers/
- https://netsuite.folio3.com/blog/connecting-mcp-tools-with-qwen/
- https://help.aliyun.com/en/simple-application-server/use-cases/openclaw-faq
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/partner-models/claude/web-search
- https://community.openai.com/t/questions-about-pricing-of-file-search-and-code-interpreter/771500
- https://fly.io/learn/code-interpreter-pricing/
- https://www.respan.ai/articles/openai-code-interpreter-guide
- https://learn.microsoft.com/en-us/answers/questions/5625041/responses-api-charges-code-interpreter-even-if-not
- https://www.together.ai/blog/code-interpreter
- https://www.pandastack.ai/blog/code-interpreter-api-pricing/
- https://www.reddit.com/r/ChatGPTPro/comments/186wa95/assistant_api_pricing_how_to_and_is_it_gonna_get/
- https://aimultiple.com/llm-pricing
- https://qwen.ai/blog?id=qwen3.5
- https://qwen.readthedocs.io/en/latest/framework/function_call.html
- https://www.reddit.com/r/LocalLLM/comments/1sztf5c/qwen_36_35b_a3b_not_able_to_properly_call/
- https://github.com/lmstudio-ai/lmstudio-bug-tracker/issues/825
- https://forums.developer.nvidia.com/t/qwen3-5-tool-calling-finally-fixed-possibly/366451
- https://huggingface.co/Qwen/Qwen3.6-27B
- https://achan2013.medium.com/how-many-tools-functions-can-an-ai-agent-has-21e0a82b7847
- https://www.youtube.com/watch?v=R7OCrqyGMeY
- https://help.aliyun.com/en/model-studio/qwen-structured-output
- https://www.reddit.com/r/LocalLLaMA/comments/1of3r61/test_results_for_various_models_ability_to_give/
- https://github.com/lmstudio-ai/lmstudio-bug-tracker/issues/1971
- https://www.requesty.ai/blog/structured-outputs-across-llm-providers-the-compatibility-mess
- https://community.openai.com/t/limiting-json-structured-output/1355852
- https://friendli.ai/blog/structured-output
- https://www.glukhov.org/llm-performance/ollama/llm-structured-output-with-ollama-in-python-and-go/
- https://help.aliyun.com/en/model-studio/first-api-call-to-qwen
- https://github.com/NousResearch/hermes-agent/issues/3912
- https://www.alibabacloud.com/help/en/model-studio/use-local-functions
- https://help.aliyun.com/en/model-studio/asynchronous-call-api-reference
- https://help.aliyun.com/en/model-studio/agent-and-workflow-application-api-reference
- https://help.aliyun.com/en/model-studio/what-is-model-studio
- https://developer.microsoft.com/blog/10-microsoft-mcp-servers-to-accelerate-your-development-workflow/
- https://www.kaamel.com/blog/en-llm-api-privacy-due-diligence/
- https://github.com/habitoai/awesome-mcp-servers
- https://sanddev.com/blog/bielik-vs-qwen-which-ai-model-should-you-choose/
- https://www2.strategy.com/producthelp/current/readme/en-us/content/whats_new.htm
- https://latent.space/p/poolside/
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen-api-via-openai-responses
- https://github.com/TheBestCo/bestprice-mcp/blob/main/PROVIDER_SETUP.md
- https://www.alibabacloud.com/help/ja/model-studio/qwen-api-via-openai-responses
- https://www.alibabacloud.com/help/tc/model-studio/qwen-api-via-openai-responses
- https://www.promptfoo.dev/docs/providers/azure/
- https://github.com/TheBestCo/bestprice-mcp/blob/main/docs/provider-setup.md
- https://www.alibabacloud.com/help/zh/model-studio/qwen-api-via-openai-responses
- https://docs.modelstudio.console.alibabacloud.com/tc/model-studio/qwen-api-via-openai-responses
- https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-responses
- https://www.mindstudio.ai/blog/what-is-qwen-3-6-plus-agentic-coding-model
- https://huggingface.co/Qwen/Qwen3-8B
- https://qubrid.com/blog/qwen-36-max-preview-explained-architecture-benchmarks-api-on-qubrid-ai?srsltid=AYCX9vKIgGcjpqdB1L421Ja-7NaIUZuv_P7Syx1lcCyKkm2su_MqqK3h
- https://www.reddit.com/r/LocalLLaMA/comments/1sdhvc5/qwen_35_tool_calling_fixes_for_agentic_use_whats/
- https://help.aliyun.com/zh/model-studio/content-security
- https://www.alibabacloud.com/help/id/model-studio/error-code
- https://www.alibabacloud.com/help/zh/model-studio/error-code
- https://news.ycombinator.com/item?id=46766741
- https://www.alibabacloud.com/help/tc/model-studio/error-code
- https://github.com/langgenius/dify/issues/11779
- https://ai.google.dev/gemini-api/docs/thinking
- https://developers.openai.com/api/docs/guides/reasoning
- https://platform.claude.com/docs/en/build-with-claude/extended-thinking
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/thinking
- https://medium.com/@garvanand03/youre-paying-for-your-ai-to-think-it-s-thinking-about-the-wrong-things-63661371a689
- https://aistudio.google.com/docs/thinking
- https://www.developersdigest.tech/blog/extended-thinking-claude-production-guide
- https://docs.docker.com/ai/docker-agent/guides/thinking/
- https://github.com/lmstudio-ai/lmstudio-bug-tracker/issues/2284
- https://www.reddit.com/r/LocalLLaMA/comments/1vricem/qwen38_overthinks_similarly_alot_on_all_reasoning/
- https://huggingface.co/Qwen/Qwen3.8-27B/discussions/113
- https://lmstudio.ai/models/qwen3.8
- https://dev.to/aimodels-fyi/a-beginners-guide-to-the-qwen38-27b-model-by-qwen-on-huggingface-11j9
- https://medium.com/@ishaafsalman/fine-tuning-qwen3-8-27b-what-breaks-and-how-to-fix-it-d77dc46e0745
- https://www.nerdheadz.com/blog/qwen-3-8-27b-default-reasoning-mode-override
- https://docs.modelrelay.ai/core/reasoning-effort
- https://huggingface.co/unsloth/Qwen3.8-27B-GGUF/discussions/63
- https://github.com/QwenLM/Qwen3.8/issues/217
- https://help.apiyi.com/en/qwen3-max-rate-limit-quota-exceeded-solution-en.html
- https://www.layer3labs.io/guides/qwen3-8-max-limits
- https://help.aliyun.com/zh/model-studio/rate-limit
- https://www.alibabacloud.com/en/product/modelstudio?_p_lc=1
- https://freellmapihub.com/p/alibaba-model-studio
- https://help.aliyun.com/en/model-studio/rate-limiting-best-practices
- https://docs.slack.dev/apis/web-api/rate-limits
- https://www.servicenow.com/docs/r/zurich/intelligent-experiences/generative-ai-controller/configure-rate-limit.html
- https://www.braze.com/docs/user_guide/messaging/messaging_fundamentals/frequency_capping
- https://confluence.atlassian.com/adminjiraserver/improving-instance-stability-with-rate-limiting-983794911.html
- https://learn.microsoft.com/en-au/answers/questions/5915008/fresh-deployed-foundry-model-gets-429-rate-limit-e
- https://grafana.com/docs/loki/latest/operations/request-validation-rate-limits/
- https://github.com/microsoft/vscode/issues/253124
- https://help.aliyun.com/en/model-studio/context-cache
- https://github.com/anomalyco/models.dev/issues/9268
- https://www.alibabacloud.com/help/en/model-studio/model-release-notes
- https://huggingface.co/Qwen/Qwen3.8-Flash-Next
- https://notesbylex.com/qwen38-max
- https://x.com/Alibaba_Qwen/status/2058932656797368619
- https://medium.com/@michael.hannecke/prompt-caching-explained-what-it-is-what-it-isnt-and-when-to-use-it-9f5c6fce7bdb
- https://www.reddit.com/r/ClaudeCode/comments/1s6zxkp/why_the_1m_context_window_burns_through_limits/
- https://www.flexera.com/blog/ai/prompt-caching-breakdown/
- https://www.morphllm.com/prompt-caching
- https://clawdhub.mintlify.app/reference/prompt-caching
- https://discuss.ai.google.dev/t/caching-can-i-cach-less-than-the-min-mentioned/38029
- https://aws.amazon.com/blogs/machine-learning/automate-amazon-bedrock-batch-inference-building-a-scalable-and-efficient-pipeline/
- https://www.alibabacloud.com/help/en/model-studio/beijing-access-information
- https://www.linkedin.com/pulse/multimodal-batch-inference-amazon-bedrock-anthropic-claude-stafford-v0xkc
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/model-usage-statistics
- https://repost.aws/questions/QUVLMQMc00Tfy4nMo-AQOI2w/aws-bedrock-batch-inference-does-not-support-latest-claude-models
- https://docs.aws.amazon.com/bedrock/latest/APIReference/API_ModelInvocationJobSummary.html
- https://repost.aws/questions/QUGscKFYUFR62AHArY1V_cGQ/aws-bedrock-claude-batch-document-upload-size-limit
- https://docs.fireworks.ai/guides/batch-inference
- https://wring.co/blog/aws-bedrock-batch-inference-guide
- https://medium.com/@AI-on-Databricks/demystifying-batch-inference-on-databricks-fef8a7900825
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/capabilities/batch-inference
- https://www.antsplatform.ai/docs/batch-inference/provider-limits
- https://www.alibabacloud.com/help/fr/model-studio/rate-limit
- https://api.zhongshangqihang.com/blog/en-qwen-api-free/
- https://api.zhongshangqihang.com/blog/en-qwen-api-enterprise/
- https://www.alibabacloud.com/help/en/model-studio/quota-management
- https://www.alibabacloud.com/help/en/model-studio/rate-limiting-best-practices
- https://www.alibabacloud.com/help/en/quota-center/user-guide/submit-an-application-to-increase-a-quota
- https://www.alibabacloud.com/help/en/model-studio/model-usage-statistics
- https://github.com/QwenLM/qwen-code/blob/main/docs/developers/tools/web-search.md
- https://qwenlm.github.io/Qwen-Agent/en/guide/get_started/features/
- https://www.alibabacloud.com/help/en/model-studio/retrieve-a-response
- https://docs.portkey.ai/docs/product/ai-gateway/remote-mcp
- https://docs.x.ai/developers/tools/remote-mcp
- https://mcpplaygroundonline.com/blog/test-mcp-server-with-chatgpt-and-openai
- https://support.lexeri.com/hc/en-us/articles/35641409064605-Use-Lexeris-MCP-server-in-ChatGPT-Responses-API
- https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/tools/model-context-protocol
- https://github.com/godmt/comfyui-openai-llm/blob/main/README.md
- https://docs.litellm.ai/docs/mcp_usage
- https://help.aliyun.com/en/model-studio/compatibility-with-openai-responses-api
- https://ai-sdk.dev/providers/ai-sdk-providers/alibaba
- https://github.com/QwenLM/qwen-code/issues/2664
- https://developers.openai.com/api/reference/java/resources/responses/
- https://lightseek.org/smg/main/reference/api/responses
- https://github.com/vllm-project/vllm/issues/63185
- https://neurals.ca/tech/openai/responses-api/
- https://dev.to/aws/how-ai-actually-calls-an-api-tool-calling-explained-from-scratch-4lf8
- https://www.alibabacloud.com/help/es/model-studio/retrieve-a-response
- https://lmstudio.ai/docs/developer/openai-compat/responses
- https://docs.requesty.ai/features/web-search
- https://help.aliyun.com/en/model-studio/image-search
- https://ai.google.dev/api/generate-content
- https://googleapis.github.io/python-genai/
- https://pi.dev/packages/@abhishek944/pi-image-gen
- https://aistudio.google.com/api-reference/triggers/update-trigger
- https://simonw.substack.com/p/gpt-55-chatgpt-images-20-qwen36-27b
- https://help.aliyun.com/en/model-studio/quota-management
- https://reintech.io/blog/llm-rate-limiting-quota-management-production-best-practices
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/quota-management
- https://docs.litellm.ai/docs/proxy/users
- https://live.paloaltonetworks.com/t5/engineering-blogs/rate-limiting-for-llm-applications-and-agents-why-it-matters-and/ba-p/1264762
- https://fast.io/resources/vertex-ai-rate-limit/
- https://docs.databricks.com/gcp/en/ai-gateway/rate-limits
- https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent_CreateKnowledgeBase.html
- https://www.alibabacloud.com/help/en/model-studio/rag-knowledge-base
- https://www.youtube.com/watch?v=5dkS0XECObs
- https://repost.aws/questions/QUGIMFPOzUQvOiKHTwjRcLbg/aws-cloud-quest-generative-ai-the-knowledge-base-storage-configuration-provided-is-invalid-dependency-error-document-status-code-400-error-message-failed-to-create-query-field
- https://tongwing.woon.sg/blog/amazon-bedrock-knowledge-base-a-first-look/
- https://www.youtube.com/watch?v=gWzWC1S-TrU
- https://dev.to/ddesio/rag-on-aws-building-an-ai-powerd-knowledge-base-with-amazon-bedrock-and-pinecone-using-aws-nl1
- https://medium.com/enlear-academy/building-ai-knowledgebases-with-vector-databases-and-amazon-bedrock-835ac264e5ac
- https://www.alibabacloud.com/help/en/model-studio/build-knowledge-base-qa-assistant-without-coding
- https://www.mindstudio.ai/
- https://www.alibabacloud.com/help/en/model-studio/application-introduction
- https://docs.cloudera.com/machine-learning/cloud/use-ai-studios/topics/ml-managing-agent-studio.html
- https://docs.oracle.com/en/cloud/saas/fusion-ai/26c/aiaas/get-started.html
- https://www.linkedin.com/posts/rahulmohta_realdynamics-argano-company-quick-demo-activity-7352990971673919489-Nw5v
- https://www.moveworks.com/us/en/platform/ai-agent-builder
- https://k8mead.com/2026/07/21/building-workflow-agents-in-oracle-ai-agent-studio-from-configuration-to-production/
- https://learn.microsoft.com/en-us/dynamics365/sales/ai-agents-apps
- https://docs.aws.amazon.com/sagemaker-unified-studio/latest/userguide/creating-a-knowledge-base-component.html
- https://www.reddit.com/r/Qwen_AI/comments/1tnmn16/frustrated_with_alibaba_cloud_qwen_token_plan/
- https://www.alibabacloud.com/help/en/agentrun/knowledge-base-integration-guide
- https://github.com/openai/codex/discussions/58031
- https://www.facebook.com/groups/enablersbysaqibazhar/posts/3608469149479913/
- https://www.alibabacloud.com/help/tr/model-studio/rag-knowledge-base
- https://www.alibabacloud.com/help/en/model-studio/single-agent-application
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/application-introduction
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/build-knowledge-base-qa-assistant-without-coding
- https://www.alibabacloud.com/help/en/model-studio/workflow-application
- https://help.aliyun.com/en/model-studio/error-code
- https://community.hubspot.com/t/api-requires-api-key-but-cant-create-api-key/68059
- https://davidokeyode.medium.com/step-by-step-guide-connect-ai-models-in-alibaba-cloud-model-studio-with-openclaw-ada70b6977cb
- https://aps.autodesk.com/en/docs/oauth/v2/tutorials/create-app
- https://www.alibabacloud.com/help/en/model-studio/application-data/
- https://discuss.ai.google.dev/t/title-urgent-unable-to-republish-ai-studio-app-due-to-cloud-build-org-policy-restriction/196294
- https://www.alibabacloud.com/help/en/model-studio/api-bailian-2023-12-29-retrieve
- https://www.alibabacloud.com/blog/building-a-rag-pipeline-on-alibaba-cloud-with-vector-search_603155
- https://agentswitchboard.dev/agents/alibaba-model-studio
- https://www.alibabacloud.com/help/en/tablestore/memory-storage-service-sub-product-test/tablestore-mcp-server
- https://www.alibabacloud.com/blog/the-practice-of-integrating-stdio-mcp-server-with-one-click-access-by-cherry-studio-and-dify_602239
- https://medium.com/@bobmurali2002/exposing-your-mcp-tools-remotely-using-server-sent-events-sse-843812585b47
- https://www.alibabacloud.com/blog/602197
- https://developers.make.com/mcp-server
- https://docs.umbraco.com/ai-in-umbraco/17.latest/providers/alibaba
- https://www.alibabacloud.com/help/tr/model-studio/what-is-model-studio
- https://www.alibabacloud.com/help/en/model-studio/access-model-studio-through-privatelink
- https://infrabase.ai/inference-apis/alibaba-cloud-model-studio
- https://www.francisokafor.com/field-notes/china-available-llm-apis-from-mainland
- https://vietnamnews.vn/media-outreach/1656172/alibaba-cloud-announces-new-availability-zones-and-global-investment-to-fuel-ai-innovation.html
- https://www.merriam-webster.com/dictionary/example
- https://www.instagram.com/example/?hl=en
- https://x.com/example?lang=en
- https://open.spotify.com/artist/6Vh6UDWfu9PUSXSzAaB3CW
- https://dictionary.cambridge.org/us/dictionary/english/example
- https://energy.ri.gov/leadbyexample
- https://en.wikipedia.org/wiki/Example_(musician)
- https://www.facebook.com/leadingbyexample/
- https://www.youtube.com/example
- https://martinfowler.com/bliki/SpecificationByExample.html
- https://docs.modelstudio.console.alibabacloud.com/
- https://localai.io/docs/features/mcp/
- https://qwenlm.github.io/qwen-code-docs/en/developers/tools/mcp-server/
- https://devblogs.microsoft.com/visualstudio/mcp-is-now-generally-available-in-visual-studio/
- https://cloud.google.com/discover/what-is-model-context-protocol
- https://www.reddit.com/r/leonardoai/comments/13jol2h/how_to_avoid_the_content_moderation_filter_error/
- https://www.youtube.com/watch?v=8O3gohdUtwo
- https://lightcapai.medium.com/bypassing-content-moderation-filters-techniques-challenges-and-implications-4d329f43a6c1
- https://ai.google.dev/gemini-api/docs/safety-settings
- https://help.aliyun.com/en/document_detail/2871402.html
- https://learn.microsoft.com/en-us/troubleshoot/power-platform/copilot-studio/generative-answers/agent-response-filtered-by-responsible-ai
- https://www.youtube.com/watch?v=GgXuzeNSzto
- https://docs.mistral.ai/studio/safety-moderation
- https://blog.cloudflare.com/guardrails-in-ai-gateway
- https://docs.api7.ai/ai-gateway/traffic-controls/guardrails/alibaba-cloud-ai
- https://www.facebook.com/alibabacloud/posts/ai-guardrails-real-time-protection-for-llms-and-ai-agents-%EF%B8%8Fsecurity-is-mandatory/1505252311646856/
- https://docs.appian.com/suite/help/26.9/ai-guardrails.html
- https://aistudio.yandex.ru/en/docs/ai-studio/concepts/security/guardrails
- https://docs.oracle.com/iaas/releasenotes/generative-ai/ai-guardrails.htm
- https://developer.nvidia.com/blog/content-moderation-and-safety-checks-with-nvidia-nemo-guardrails/
- https://orca.security/resources/blog/ai-guardrails/
- https://www.linkedin.com/posts/ozanu_ai-datasecurity-privacy-activity-7408988139932835840-gO6u
- https://www.obsidiansecurity.com/blog/ai-guardrails
- https://dev.writer.com/home/guardrails
- https://www.youtube.com/watch?v=mSR7o4uMzvE
- https://medium.com/@adnanmasood/the-state-of-ai-guardrails-what-they-stop-and-what-they-miss-ceb668f693bc
- https://mirrorsecurity.io/academy/B/agent-guardrails
- https://www.alibabacloud.com/help/en/content-moderation/latest/access-guide
- https://help.aliyun.com/en/model-studio/network-content-security-audit
- https://www.alibabacloud.com/help/en/model-studio/model-telemetry
- https://www.alibabacloud.com/help/en/content-moderation/latest/faq-about-error-messages
- https://www.alibabacloud.com/help/en/content-moderation/latest/video-audit-plus-access-guide
- https://www.alibabacloud.com/help/en/cloud-config/latest/enable-output-content-malicious-url-security-fence-for-bailian
- https://www.alibabacloud.com/help/en/content-moderation/latest/agentscope-integrated-ai-safety-guardrail-guide
- https://www.youtube.com/watch?v=KEHTtv7Bgs4
- https://www.patronus.ai/ai-reliability/ai-guardrails
- https://softwareanalyst.substack.com/p/the-convergence-of-ai-and-data-security
- https://tabsonai.com/
- https://unit42.paloaltonetworks.com/comparing-llm-guardrails-across-genai-platforms/
- https://docs.nvidia.com/nemo/guardrails/about-nemo-guardrails-library/overview
- https://github.com/ant-research/awesome-mllm-guardrails
- https://arxiv.org/html/2512.05339v1
- https://medium.com/@danushidk507/guardrails-in-large-language-models-llms-59522778418c
- https://www.splunk.com/en_us/blog/learn/best-ai-guardrail-platforms.html
- https://avidml.org/blog/llm-guardrails-4/
- https://dataaspirant.com/blog/ai-guardrails/
- https://support.demandbase.com/hc/en-us/articles/17023249044507-Create-Workspaces
- https://workspace.google.com/pricing
- https://help.bizzdesign.com/articles/horizzon-help/creating-a-workspace
- https://stackoverflow.com/questions/53308870/how-to-create-a-workspace
- https://community.cisco.com/t5/call-control/how-to-set-default-workspace-in-call-studio/td-p/4562492
- https://platform.claude.com/docs/en/manage-claude/workspaces
- https://community.nxp.com/t5/S32-Design-Studio/How-do-I-reference-the-default-Workspace-in-the-command-line/m-p/1349669
- https://www.alibabacloud.com/help/en/pai/create-and-manage-workspaces
- https://studio.workspace.google.com/
- https://www.alibabacloud.com/help/en/model-studio/bill-query-and-cost-management
- https://help.aliyun.com/en/model-studio/bill-query-and-cost-management
- https://docs.databricks.com/aws/en/ai-gateway/track-cost-tutorial
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/bill-query-and-cost-management
- https://www.usage.ai/faq/finops/track-cost-ai-model-training-cloud/
- https://www.mavvrik.ai/blog/how-to-track-ai-costs/
- https://learn.microsoft.com/en-us/azure/databricks/admin/system-tables/model-serving-cost
- https://www.toriihq.com/blog/how-to-track-ai-costs
- https://www.developersdigest.tech/reference/api-compatibility/qwen
- https://www.reddit.com/r/vibecoding/comments/1rgufpk/openclaw_alibaba_cloud_coding_plan_8_frontier/
- https://www.alibabacloud.com/help/en/model-studio/germany-frankfurt-global
- https://www.alibabacloud.com/help/en/model-studio/base-url
- https://www.alibabacloud.com/help/en/model-studio/singapore-regional-access-information
- https://docs.agno.com/models/providers/native/dashscope/overview
- https://www.promptfoo.dev/docs/providers/alibaba/
- https://www.alibabacloud.com/help/en/model-studio/model-calling-in-sub-workspace
- https://itsfree.ai/provider/alibaba/
- https://github.com/openclaw/openclaw/issues/19130
- https://github.com/aliyun/aliyun-cli/issues/1351
- https://www.youtube.com/watch?v=NxCUwKd6n1c
- https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/tutorial-improved-exports
- https://aws.amazon.com/blogs/aws-cloud-financial-management/introducing-data-exports-for-billing-and-cost-management/
- https://docs.cloud.google.com/billing/docs/how-to/reports
- https://oneuptime.com/blog/post/2026-02-16-how-to-schedule-recurring-cost-exports-from-azure-cost-management-to-a-storage-account/view
- https://www.reddit.com/r/AZURE/comments/1d6gk7x/sample_azure_cost_management_csv_export_request/
- https://help.aliyun.com/en/model-studio/permission-management-overview
- https://www.alibabacloud.com/en/notice/model_studio_upgrade_of_permission_system_558?_p_lc=1
- https://help.aliyun.com/en/model-studio/application-permission-management-overview
- https://www.alibabacloud.com/help/en/pai/activate-and-grant-permissions-on-required-cloud-services/
- https://alibaba-cloud.medium.com/alibaba-cloud-ram-part-1-an-overview-of-resource-and-access-management-86ccc6bf9a5
- https://www.alibabacloud.com/help/en/model-studio/token-plan-team-management
- https://www.alibabacloud.com/help/en/dataworks/user-guide/manage-permissions-on-workspace-level-services
- https://github.com/vllm-project/vllm/issues/17614
- https://help.aliyun.com/zh/model-studio/qwen-function-calling
- https://vdf.ai/blog/best-local-llm-for-agents-tool-calling/
- https://zhuanlan.zhihu.com/p/2004370775214424996
- https://uttapen.ir/en/docs/tools
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/partner-models/grok/capabilities/function-calling
- https://docs.vllm.ai/en/stable/serving/online_serving/
- https://doc.agentscope.io/tutorial/task_agent.html
- https://github.com/lmstudio-ai/lmstudio-bug-tracker/issues/1773
- https://developers.openai.com/api/docs/guides/structured-outputs
- https://max.modular.com/serve/structured-output/
- https://deepinfra.com/blog/json-mode
- https://console.groq.com/docs/structured-outputs
- https://www.glukhov.org/llm-performance/benchmarks/structured-output-comparison-popular-llm-providers/
- https://community.openai.com/t/has-anyone-managed-to-get-a-tool-call-working-when-stream-true/498867
- https://docs.fireworks.ai/guides/function-calling
- https://github.com/vllm-project/vllm/issues/43267
- https://www.youtube.com/watch?v=6vAaVAAr8_Q
- https://docs.modular.com/inference/function-calling
- https://community.openai.com/t/streaming-structured-output-tool-calls-with-additional-message-content/1063963
- https://discuss.ai.google.dev/t/gemini-openai-compatibility-issue-with-tool-call-streaming/59886
- https://docs.z.ai/guides/capabilities/stream-tool
- https://qwen.readthedocs.io/en/v2.0/framework/function_call.html
- https://www.alibabacloud.com/blog/model-studio-token-plan-for-individual-one-subscription-for-every-ai-model-up-to-3x-more-value_603426
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/web-extractor
- https://models.litellm.ai/providers/dashscope
- https://www.alibabacloud.com/help/en/model-studio/token-plan-personal-overview
- https://www.alibabacloud.com/help/en/model-studio/web-extractor
- https://ustechautomations.com/resources/blog/qwen3-8-max-explained-what-it-changes
- https://www.eesel.ai/blog/how-to-access-qwen38-max
- https://dev.to/arshtechpro/qwen38-max-just-went-ga-a-developers-guide-to-alibabas-24t-model-ff3
- https://www.alibabacloud.com/help/en/model-studio/image-search
- https://www.alibabacloud.com/help/doc-detail/85153.htm?2c63.p38356.b99.7.3a8445586Pfea8
- https://www.facebook.com/alibabacloud/videos/model-studio-finalmp4/874348851197500/
- https://qwenlm.github.io/qwen-code-docs/en/users/configuration/settings/
- https://www.reddit.com/r/LocalLLaMA/comments/1vsinej/am_i_doing_something_wrong_qwen_38_27b_seems/
- https://medium.com/@orami98/one-week-with-claude-code-ollama-local-ai-coding-on-windows-no-api-costs-423d639d2fca
- https://github.com/slb350/open-agent-sdk-rust
- https://freedom.tech/ai/
- https://www.facebook.com/groups/taskade/posts/1013521490878756/
- https://news.ycombinator.com/item?id=48542100
- https://solmaz.io/2026/07/
- https://chinamodelapi.com/
- https://mlearning.substack.com/p/qwen-38-max-kimi-k3-and-deepseek-v4-pro-open-model-source-beginner-guide-step-by-step-how-to-start
- https://packet.ai/blog/open-source-llm-api
- https://pi.dev/packages/pi-models-access
- https://dymesty.com/blogs/articles/chinese-ai-models-deepseek-qwen-kimi?srsltid=AYCX9vJ5Yj6YIECnxI9_Mx8pL1R0N4JkXHfwZZGwO0_Eqkf4UTVERbOo
- https://docs.orq.ai/ai-gateway/supported-models
- https://www.alibabacloud.com/help/en/model-studio/deepseek-api.md
- https://ai-sdk.dev/providers/ai-sdk-providers/anthropic
- https://github.com/LibreChat-AI/LibreChat/discussions/11855
- https://www.reddit.com/r/LocalLLaMA/comments/1qhaq21/new_in_llamacpp_anthropic_messages_api/
- https://platform.claude.com/docs/en/build-with-claude/working-with-messages
- https://community.n8n.io/t/web-search-with-anthropic-models/252767?tl=en
- https://www.metacto.com/blogs/what-is-the-anthropic-api-a-comprehensive-guide-to-claude
- https://platform.claude.com/docs/en/build-with-claude/search-results
- https://www.youtube.com/watch?v=lqVKXN2q4Ic
- https://www.alibabacloud.com/help/en/model-studio/coding-plan
- https://www.reddit.com/r/opencodeCLI/comments/1rgcvv2/alibaba_coding_plan_sounds_too_good_to_be_true/
- https://www.facebook.com/groups/developerkaki/posts/2768319986847230/
- https://www.subconscious.dev/providers/alibaba-cloud
- https://randomprompts.org/qwen-3-8-max-prompt-generator
- https://www.instagram.com/reel/Dbs0KU8pcvp/
- https://www.marktechpost.com/2026/08/03/alibaba-qwen-releases-qwen3-8-max/
- https://datanorth.ai/news/alibaba-releases-qwen3-8-max
- https://www.linkedin.com/posts/uxproduct_openai-chatgpt-google-activity-7471807972994781184-T1gT
- https://www.threads.com/@demonbane05/post/Da_YDCoDub8/although-qwen-is-on-a-sale-rn-i-do-think-it-is-one-of-the-cheapest-if-you-want/
- https://www.threads.com/@demonbane05/post/Da_YDCoDub8/although-qwen-is-on-a-sale-rn-i-do-think-it-is-one-of-the-cheapest-if-you-want/?hl=ar
- https://help.aliyun.com/en/model-studio/memory/billing
- https://www.alibabacloud.com/help/en/model-studio/test-1/
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/file-search
- https://www.alibabacloud.com/help/en/dms/product-overview/pricing
- https://www.alibabacloud.com/product/model-studio
- https://www.alibabacloud.com/help/en/oss/data-indexing-fees
- https://help.aliyun.com/en/model-studio/model-pricing
- https://www.alibabacloud.com/help/en/sls/sls-mcp-server
- https://help.aliyun.com/en/openapi/user-guide/openapi-mcp-server-guide
- https://www.alibabacloud.com/help/en/hologres/user-guide/hologres-mcp-server
- https://github.com/aliyun/alibabacloud-api-mcp-server/blob/main/README-EN.md
- https://baike.baidu.com/en/item/OpenAPI%20MCP%20Server/6729266
- https://www.alibabacloud.com/help/en/openapi/user-guide/openapi-mcp-server-core-tool-guide
- https://www.alibabacloud.com/blog/602162
- https://developers.google.com/knowledge/reference/mcp
- https://forum.asana.com/t/auth-error-with-openai-api-using-mcp-server/1094345
- https://learn.microsoft.com/en-us/answers/questions/5858636/encountering-errors-while-setting-up-sentinel-mcp
- https://www.alibabacloud.com/help/en/model-studio/client-events
- https://www.youtube.com/watch?v=EYQqgLoYSNM&vl=en-US
- https://newsletter.victordibia.com/p/mcp-for-software-engineers-part-1
- https://github.com/sqliteai/sqlite-mcp/blob/main/API.md
- https://mcp.higress.ai/server/server9020
- https://help.aliyun.com/en/hologres/user-guide/deploy-hologres-mcp-server-based-on-model-studio
- https://skywork.ai/skypage/en/bridging-ai-real-world-gebabygeegee-amap-mcp-server/1978360424667193344
- https://dl.acm.org/doi/pdf/10.1145/3796519
- https://www.facebook.com/TencentCloud/posts/the-first-tencent-cloud-openclaw-event-in-singaporewe-brought-together-developer/1474036471184767/
- https://lobehub.com/mcp/ujiahka-mcp-vision-bridge
- https://www.alibabacloud.com/help/en/model-studio/bailian-application-calling/
- https://www.alibabacloud.com/help/en/model-studio/data-import-instructions
- https://www.alibabacloud.com/help/en/model-studio/rag-knowledge-base-api-guide
- https://www.alibabacloud.com/help/en/pai/knowledge-base-management
- https://www.alibabacloud.com/help/en/model-studio/savings-plan-and-resource-package
- https://www.alibabacloud.com/help/en/model-studio/qwen-code-interpreter
- https://azure.microsoft.com/en-us/pricing/details/azure-openai/
- https://mistral.ai/pricing/
- https://chatgpt.com/pricing/
- https://medium.com/@HeCanThink/codeinterpreterapi-a-developers-dream-tool-chatgpt-code-interpreter-for-free-3bae78103af5
- https://opencode.ai/v2/docs/console/models/
- https://www.youtube.com/watch?v=4JSGclkdcBY
- https://aws.amazon.com/blogs/machine-learning/dive-deep-into-vector-data-stores-using-amazon-bedrock-knowledge-bases/
- https://atlan.com/know/ai-agent/aws/bedrock-managed-knowledge-base-vs-custom-rag-pipeline/
- https://mixpeek.com/guides/vector-database-cost-comparison
- https://repost.aws/questions/QUyFXeOaW8QtOZ_f_4BDPxyg/kendra-genai-index-vs-vector-store-price-for-knowledge-base-creation-and-use
- https://www.digitalapplied.com/blog/managed-rag-services-compared-2026
- https://medium.com/everyday-ai/ai-retrieval-is-too-expensive-heres-how-small-embeddings-cut-costs-by-80-14d5ed78f5d7
- https://builder.aws.com/content/35ghrJcGs2ZbDwxMTJWRXtIh4wT/amazon-s3-vectors-the-cost-friendly-way-to-store-and-search-ai-embeddings
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/manage-data
- https://www.alibabacloud.com/help/en/model-studio/qwen-code
- https://qwen.ai/blog?id=qwen3-coder
- https://x.com/Alibaba_Qwen/status/2024136381308805564?lang=en
- https://www.alibabacloud.com/blog/building-a-custom-chatbot-with-web-scraping-and-alibaba-cloud-model-studio_601863
- https://technologymagazine.com/news/alibabas-model-studio-powers-trusted-ai-in-private-clouds
- https://everyaifinder.com/tools/alibaba-cloud-model-studio
- https://www.alibabacloud.com/en/solutions/ai-application-information-extraction?_p_lc=1
- https://www.alibabacloud.com/help/en/model-studio/web-search-image.md
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/web-search-image
- https://skhokho.ai/pages/ai-model-pricing/
- https://omniakey.com/pricing/tools
- https://modelslab.com/pricing
- https://qwenlm.github.io/qwen-code-docs/en/users/configuration/auth/
- https://docs.aws.amazon.com/bedrock/latest/userguide/models-regions.html
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/machine-learning/general/locations
- https://learn.microsoft.com/en-gb/answers/questions/5509888/azure-openai-responses-api-availability-in-germany
- https://www.alibabacloud.com/help/en/dataworks/function-release-record
- https://docs.jitterbit.com/integration-studio/design/connectors/microsoft-access/connection-details/
- https://www.facebook.com/groups/aicontentcreatorscommunity/posts/1759488825362311/
- https://jia.je/kb/en/software/coding_plan.html
- https://docs.aws.amazon.com/pdfs/fsx/latest/ONTAPGuide/ONTAPGuide.pdf
- https://aicode.danvoronov.com/
- https://www.govinfo.gov/content/pkg/CHRG-110hhrg40304/html/CHRG-110hhrg40304.htm
- https://www.scribd.com/document/834254882/Alibaba-Cloud-Core-Concepts-Best-Practices
- https://www.sciencedirect.com/science/article/pii/S0272494426001210
- https://www.alibabacloud.com/blog/603614
- https://www.alibabacloud.com/blog/qwen3-8-max-a-new-bar-for-coding-and-cowork_603421
- https://docs.aws.amazon.com/bedrock/latest/userguide/inference-messages-api.html
- https://docs.langdock.com/en/developer/completion-api/anthropic
- https://api-docs.deepseek.com/guides/anthropic_api/
- https://www.truefoundry.com/docs/ai-gateway/anthropic
- https://docs.databricks.com/aws/en/machine-learning/model-serving/query-anthropic-messages
- https://github.com/sipeed/picoclaw/issues/265
- https://docs.oracle.com/en-us/iaas/Content/generative-ai/openai-compatible-api.htm
- https://pydantic.dev/docs/ai/models/openai/
- https://learn.microsoft.com/en-us/agent-framework/hosting/self-hosting/openai-endpoints
- https://adk-rust.com/en/docs/models/openai-responses
- https://community.openai.com/t/openai-api-metadata-not-just-keys-now-your-30k-blob-storage-python-code/1360325
- https://www.nuget.org/packages/OpenAI-DotNet
- https://hackernoon.com/local-llms-need-more-than-openai-compatible-endpoints
- https://community.openai.com/t/system-and-developer-roles-in-messages-and-instructions-in-responses-create/1370516
- https://github.com/epam/ai-dial-adapter-openai/blob/development/README.md
- https://try-qwen-ai.com/safety/qwen-studio-api-local-privacy/
- https://docs.bailian.console.aliyun.com/en/model-studio/role-play
- https://try-qwen-ai.com/models/qwen3-8-omni-flash/
- https://www.alibabacloud.com/help/en/model-studio/qwen-vl-compatible-with-openai
- https://www.alibabacloud.com/help/en/model-studio/multi-round-conversation
- https://www.typingmind.com/guide/use-alibaba-cloud-api-key-to-chat-with-ai
- https://help.aliyun.com/en/model-studio/qwen-api-reference/
- https://live.paloaltonetworks.com/t5/engineering-blogs/openai-responses-api-vs-chat-completions-vs-anthropic-messages/ba-p/1264688
- https://therouter.ai/news/qwen3-6-dashscope-api-routing/
- https://docs.aimlapi.com/api-references/text-models-llm/anthropic
- https://blog.gopenai.com/beginner-to-pro-text-generation-chat-completions-and-responses-api-simplified-05be4759271a
- https://crazyrouter.com/en/blog/chat-completions-vs-responses-vs-messages-api
- https://gist.github.com/jazzenchen/46b2a5301fb5b6d6dce312b2272d7d8f
- https://qwen.ai/blog?id=qwen3.6
- https://help.aliyun.com/en/marketplace/marketplace-token
- https://github.com/gsd-build/gsd-2/issues/3893
- https://github.com/anomalyco/models.dev/issues/4296
- https://github.com/Kilo-Org/kilocode/issues/6171
- https://github.com/vercel/ai/issues/14644
- https://github.com/QwenLM/Qwen/blob/main/recipes/inference/dashscope/README.md
- https://github.com/QwenLM/qwen-code/issues/3841
- https://github.com/anomalyco/models.dev/issues/1011
- https://github.com/dashscope
- https://developers.openai.com/api/docs/libraries
- https://www.developersdigest.tech/reference/sdks/python
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/machine-learning/python-sdk/use-sdk
- https://help.aliyun.com/en/model-studio/dashscope-sdk-expert
- https://puppyip.com/en/resources/alibaba-model-studio-workspace-domain-migration-guide
- https://help.aliyun.com/en/model-studio/connector/migration
- https://community.omnissa.com/forums/topic/72214-workspace-one-uem-intelligence-domain-migration-action-required-for-vmwservicescom-deprecation/
- https://help.aliyun.com/en/model-studio/model-calling-in-sub-workspace
- https://help.aliyun.com/en/model-studio/base-url
- https://help.aliyun.com/en/model-studio/compatibility-of-openai-with-dashscope
- https://docs.aws.amazon.com/bedrock/latest/userguide/batch-inference-supported.html
- https://help.aliyun.com/en/model-studio/batch-inference
- https://www.youtube.com/watch?v=9uBL1xM7h6Y
- https://www.alibabacloud.com/help/en/model-studio/openai-file-interface
- https://www.alibabacloud.com/help/en/model-studio/upload-file-api
- https://community.openai.com/t/bigger-batch-jsonl-file-fails-to-submit/1323053
- https://www.alibabacloud.com/blog/qwen3-6-plus-towards-real-world-agents_603005
- https://www.reddit.com/r/googlecloud/comments/1qfv0eu/batch_api_rate_limits_for_gemini_batch_api_really/
- https://aistudio.google.com/docs/rate-limits
- https://flatkey.ai/blog/ai-api-quota-limits
- https://fast.io/resources/gemini-api-rate-limit/
- https://www.facebook.com/alibabacloud/posts/qwen38-flash-is-now-available-in-the-european-union-on-alibaba-cloud-model-studi/1582315680607185/
- https://www.alibabacloud.com/en/solutions/generative-ai/qwen?_p_lc=1
- https://techjacksolutions.com/ai-tools/qwen/qwen-pricing/
- https://benchlm.ai/alibaba/api-pricing
- https://medium.com/@adnanmasood/prompt-caching-in-production-ai-systems-architecture-economics-and-governance-a907437dfd74
- https://www.cometapi.com/qwen3-7-plus-api-pricing/
- https://www.alibabacloud.com/blog/i-tested-19-llm-api-workloads-on-real-calls-and-cut-costs-79%25-%E2%80%94-heres-the-data_603236
- https://pub.towardsai.net/i-ditched-the-cloud-model-for-a-local-one-heres-what-actually-broke-23c1d857dcdd
- https://github.com/can1357/oh-my-pi/blob/main/packages/catalog/CHANGELOG.md
- https://blog.prompt20.com/posts/ai-inference-cost-economics/
- https://api-docs.deepseek.com/guides/thinking_mode/
- https://qwenlm.github.io/blog/qwen3/
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/maas/capabilities/thinking
- https://www.reddit.com/r/LocalLLaMA/comments/1rjrrr2/how_to_enable_thinking_on_qwen_small_models_in_lm/
- https://github.com/lmstudio-ai/lmstudio-bug-tracker/issues/1990
- https://docs.vllm.ai/en/latest/features/reasoning_outputs/
- https://devexpert.io/en/blog/enable-thinking-mode-gemma-4-lm-studio-opencode
- https://unsloth.ai/docs/models/qwen3.8
- https://www.youtube.com/watch?v=nz8WASzfSPs
- https://linas.substack.com/p/qwen3-8-27b-local-guide
- https://www.deeplearning.ai/the-batch/qwen3-8-max-lands-with-a-bang
- https://agentnativedev.medium.com/qwen3-max-thinking-outperforms-claude-opus-4-5-and-gpt-5-2-the-panic-is-real-d4c2557879d4
- https://www.datacamp.com/blog/qwen3-8-max
- https://community.openai.com/t/reasoning-tokens-hidden-price-question/1353099
- https://docs.requesty.ai/features/reasoning
- https://ai.google.dev/gemini-api/docs/pricing
- https://news.ycombinator.com/item?id=41525151
- https://benchlm.ai/blog/posts/reasoning-models-explained
- https://www.reddit.com/r/OpenAI/comments/1n1ujea/gpt5_billing_explained/
- https://www.mindstudio.ai/blog/ai-token-cost-crisis-enterprise
- https://codeant.ai/blogs/input-vs-output-vs-reasoning-tokens-cost
- https://amnic.com/blogs/compare-input-vs-output-token-pricing
- https://stochasticsandbox.com/posts/api-rate-limits-compared-2026-10-17/
- https://modal.com/llms-full.txt
- https://www.usagepricing.com/blueprint/trivia
- https://github.com/pollinations/pollinations/blob/main/APIDOCS.md
- https://github.com/codewhale-hq/Codewhale/blob/main/config.example.toml
- https://www.reddit.com/r/Qwen_AI/comments/1v8hyoj/confused_about_38max/
- https://opencode.ai/data/compare/alibaba/qwen3-8-flash/alibaba/qwen3-8-max
- https://help.aliyun.com/en/model-studio/qwen3-8-flash
- https://github.com/emcie-co/parlant/issues/695
- https://opencode.ai/data/compare/alibaba/qwen-max/alibaba/qwen3-8-flash-next
- https://qwen.ai/blog?id=qwen3.8-omni-flash
- https://www.youtube.com/watch?v=zCoBF1nwZSs
- https://dev.to/qtalen/build-autogen-agents-with-qwen3-structured-output-thinking-mode-3o34
- https://github.com/openai/openai-agents-python/issues/1595
- https://discuss.vllm.ai/t/how-to-get-structured-outputs-in-vllm/2142
- https://community.openai.com/t/unable-to-use-batch-api-with-structured-output/1266222
- https://community.openai.com/t/new-api-feature-forcing-function-calling-via-tool-choice-required/731488
- https://github.com/deepseek-ai/DeepSeek-V3/issues/1376
- https://discuss.google.dev/t/forced-function-calling-not-working-with-gemini-pro-1-5-and-openai-library/159165
- https://www.reddit.com/r/LocalLLaMA/comments/1rav571/is_tool_calling_broken_in_all_inference_engines/
- https://reference.langchain.com/javascript/langchain-google-common/types/GoogleAIModelRequestParams/tool_choice
- https://medium.com/@laurentkubaski/tool-or-function-calling-best-practices-a5165a33d5f1
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/tools/function-calling
- https://www.facebook.com/groups/1127798762760972/posts/1180848044122710/
- https://www.apideck.com/blog/llm-tool-use-and-function-calling
- https://www.reddit.com/r/mcp/comments/1lxg4qx/i_am_still_confused_on_the_difference_between/
- https://medium.com/google-cloud/a-tale-of-two-functions-function-calling-in-gemini-9b7fd8ae031b
- https://learn.microsoft.com/en-us/dotnet/ai/conceptual/calling-tools
- https://pub.towardsai.net/fine-tuning-open-source-models-for-function-calling-a-complete-guide-with-unsloth-and-docker-0a5501d7a08c
- https://www.alibabacloud.com/help/en/model-studio/qwen-api-via-dashscope
- https://help.aliyun.com/en/model-studio/qwen3-8-max
- https://www.alibabacloud.com/help/en/model-studio/qwen3-8-flash
- https://www.reddit.com/r/LocalLLaMA/comments/1vy6smx/qwen38flashnext_this_architecture_could_be/
- https://www.alibabacloud.com/help/en/model-studio/qwen3-8-max
- https://www.reddit.com/r/AISEOInsider/comments/1vekn4k/new_qwen38_max_is_insane/
- https://www.eesel.ai/blog/qwen38-max-pricing
- https://www.orcarouter.ai/blog/qwen-3-8-max-prime
- https://www.alibabacloud.com/blog/model-studio-gateway-in-practice-using-rocketmq-litetopic-to-cut-the-throttling-ratio-by-10%C3%97_603607
- https://rankllms.com/reviews/alibaba-model-studio-token-plan-review/
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen3-8-max?ref=bobzhu.tech
- https://ai-on-mac.com/articles/qwen3-8-flash-en/
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/tpm-reservation
- https://therouter.ai/news/tag/routing/
- https://tech-insider.org/how-to-use-qwen3-8-flash-api-2026/
- https://www.requesty.ai/models/alibaba/qwen3.8-flash
- https://therouter.ai/blog/qwen38-flash-api-multimodal-integration-guide/
- https://www.alibabacloud.com/help/en/model-studio/qwen-plus
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen3-8-flash
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen3-8-max?ref=siliconsnark.com
- https://help.aliyun.com/en/model-studio/qwen3-7-plus
- https://therouter.ai/blog/aliyun-bailian-api-guide/
- https://github.com/sshnaidm/ai-wanderer
- https://www.itcaocao.com/signals
- https://www.alibabacloud.com/help/en/model-studio/qwen3-7-max
- https://openrouter.ai/qwen/qwen3.7-max
- https://www.alibabacloud.com/help/en/model-studio/list-quotas.md
- https://developers.openai.com/api/docs/guides/rate-limits
- https://docs.fireworks.ai/serverless/rate-limits
- https://www.layer3labs.io/guides/qwen3-8-max-pricing
- https://docs.modular.com/administration/rate-limits
- https://www.alibabagroup.com/document-2021044032125272064
- https://aivancity.ai/en/blog/qwen3-8-max-codage-agents-ia-performances-limites/
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/update-model-rate-limits
- https://docs.bailian.console.aliyun.com/en/model-studio/rate-limit
- https://www.alibabacloud.com/help/en/model-studio/list-quotas
- https://www.reddit.com/r/Qwen_AI/comments/1w0zouv/alibaba_cloud_token_plan_usage_limits/
- https://www.alibabacloud.com/help/en/model-studio/update-model-rate-limits
- https://vibecoding.app/blog/alibaba-coding-plan-review
- https://www.reddit.com/r/opencode/comments/1vkamb2/outrageous_charging_by_alibaba_cloud_model_studio/
- https://www.alibabacloud.com/help/en/model-studio/qwen-flash
- https://www.alizila.com/alibaba-releases-qwen3-8-flash-with-innovative-model-architecture-delivering-optimal-price-performance/
- https://www.alibabacloud.com/blog/qwen3-8-flash-next-a-new-architecture-towards-ultimate-cost-efficiency_603501
- https://x.com/alibaba_cloud/status/2115752786021192084
- https://artificialanalysis.ai/models/qwen3-8-flash-next/providers
- https://www.reddit.com/r/LocalLLaMA/comments/1x2lgca/is_anyone_running_qwen38_flash_next_with_a_1m/
- https://www.cloudzero.com/blog/qwen-api-pricing/
- https://www.reddit.com/r/LocalLLaMA/comments/1wb7p70/qwen38flashnext_on_mlxserve_1m_context_is_released/
- https://arxiv.org/html/2609.25611v1
- https://docs.continuum.lablup.ai/en/changelog/
- https://docs.litellm.ai/llms-full.txt
- https://docs.continuum.lablup.ai/en/architecture/
- https://learn.microsoft.com/en-us/answers/questions/5780766/question-regarding-azure-direct-models-abuse-monit
- https://nhimg.org/glossary/ai-data-retention-policy/
- https://dev.to/tiamatenity/the-ai-training-data-opt-out-lie-why-your-prompts-are-being-used-anyway-pa6
- https://docs.aihubmix.com/en/api/Data-Pravicy
- https://developers.openai.com/api/docs/guides/your-data
- https://weapp.se/en/ai-solutions/what-is-abuse-monitoring
- https://stackoverflow.com/questions/79543450/user-data-prompt-security-in-gcp
- https://www.linkedin.com/pulse/does-anthropics-new-30-day-data-retention-claude-fable-jonathan-milne-qhrfe
- https://www.avepoint.com/topics/what-is-a-data-retention-policy
- https://standardcompute.com/providers/alibaba
- https://www.premai.io/blog/ai-data-residency-requirements-by-region-the-complete-enterprise-compliance-guide/
- https://docs.cloud.google.com/assured-workloads/docs/control-packages/singapore-data-boundary
- https://azure.microsoft.com/en-us/explore/global-infrastructure/data-residency
- https://llm.okamomedia.tokyo/en/glossary/data-residency/
- https://www.a-lign.com/articles/blog-everything-you-need-to-know-about-iso27001-certification
- https://delinea.com/blog/iso-27001-vs-soc-2
- https://www.mimecast.com/content/iso-27001-vs-soc-2/
- https://grcsolutions.io/iso-27001-vs-soc-2-certification-whats-the-difference/
- https://www.wolterskluwer.com/en/solutions/teammate/privacy-security-certifications
- https://cloudsecurityalliance.org/blog/2021/11/17/data-security-and-privacy-related-iso-iec-certifications
- https://www.adobe.com/trust/compliance/compliance-list.html
- https://clarivate.com/trust-center/security-compliance/
- https://www.youtube.com/watch?v=vuGuV3yYTm8
- https://www.premai.io/blog/zero-data-retention-enterprise-ai/
- https://www.facebook.com/groups/claudecommunity/posts/1148747830999214/
- https://airia.com/blog/zero-data-retention-for-enterprise-ai-what-zdr-agreements-cover-and-what-they-dont/
- https://community.openai.com/t/zero-data-retention-information/702540
- https://www.teleskope.ai/post/zero-data-retention
- https://decagon.ai/glossary/what-is-zero-data-retention-ai
- https://trust.anthropic.com/
- https://ltx.io/transparency
- https://qwen.ai/privacypolicy
- https://www.premai.io/blog/eu-ai-act-llm-guide-high-risk-classification-documentation-requirements-2026-deadlines/
- https://medium.com/@adnanmasood/trust-but-continuously-verify-fedramp-and-the-future-of-federal-ai-bbe89dd29454
- https://compyl.com/blog/vendor-ai-questionnaire-template/
- https://flauntaudio.com/article-53-training-data-summary/
- https://aistudio.google.com/docs/caching
- https://discuss.ai.google.dev/t/has-anyone-gotten-implicit-caching-to-work/142699
- https://help.aliyun.com/en/model-studio/confidential-maas-best-practice
- https://github.com/anomalyco/opencode/issues/27692
- https://www.reddit.com/r/LocalLLaMA/comments/1npatw9/lm_studio_and_context_caching_for_api/
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/context-cache/context-cache-use
- https://help.aliyun.com/en/model-studio/explicit-cache-guide
- https://www.alibabacloud.com/en/notice/model_studio_context_cache_price_reduction_for_certain_models_578?_p_lc=1
- https://www.alibabacloud.com/help/en/model-studio/ptu-long-input-and-cache
- https://www.alibabacloud.com/en/notice/detail?_p_lc=1&id=1400
- https://www.alibabacloud.com/blog/how-to-manage-ai-costs-when-developing-a-cloud-application-on-alibaba-cloud_603227
- https://www.alibabacloud.com/notice/detail?spm=a3c0i.35801494.J_TlTAa0s_LXHOq4tuiO-gv.5.5ce47c5brRScm3&_p_lc=1&id=1425
- https://levelup.gitconnected.com/prompt-caching-understanding-how-modern-llm-apis-reuse-computation-and-how-it-differs-from-e3c050419222
- https://www.reddit.com/r/Qwen_AI/comments/1s48o3e/question_very_high_token_charges_using_claude/
- https://www.digitalapplied.com/blog/frontier-model-api-price-index
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/explicit-cache-guide
- https://qwen.ai/blog?id=qwen3-max
- https://www.alibabacloud.com/help/en/model-studio/newly-released-models
- https://overchat.ai/ai-hub/qwen-3-7-max
- https://www.reddit.com/r/LocalLLaMA/comments/1qz5uww/qwen3_coder_next_as_first_usable_coding_model_60/
- https://discuss.huggingface.co/t/multimodal-prefix-caching-with-qwen3-vl/170849
- https://www.claudecodecamp.com/p/how-prompt-caching-actually-works-in-claude-code
- https://www.alibabacloud.com/blog/alibaba-cloud-al-agent-security-solution%E2%80%94%E2%80%94security-risks-and-mitigations-for-enterprise-ai-agent-adoption_603175
- https://community.openai.com/t/image-fine-tuning-false-positive-content-policy-violation/965280
- https://www.youtube.com/watch?v=1qKdRKE7byY
- https://help.aliyun.com/en/document_detail/2861797.html
- https://www.linkedin.com/top-content/artificial-intelligence/ai-bias-issues/false-bans-from-ai-content-moderation/
- https://pixelbunny.ai/guides/content-moderation
- https://stackoverflow.com/questions/46948593/content-moderator-results-of-the-false-positives-how-to-solve
- https://www.playwire.com/blog/ai-based-content-moderation-how-it-works
- https://www.linkedin.com/posts/alibaba-cloud-computing-company_alibabacloud-cybersecurity-security-activity-7492780818201817088-MkN6
- https://help.aliyun.com/en/document_detail/2642717.html
- https://www.sourcesecurity.com/news/alibaba-cloud-ai-guardrails-boost-security-co-7261-ga-co-13828-ga-co-1716962886-ga.1750749066.html
- https://www.forrester.com/blogs/alibaba-clouds-path-to-ai-native/
- https://www.linkedin.com/posts/alibabacloudglobal_ai-aiagent-security-activity-7465597917752438784-fcA0
- https://aws.amazon.com/blogs/machine-learning/optimizing-cost-and-latency-with-amazon-bedrock-prompt-caching/
- https://chatlyai.app/blog/prompt-caching-explained
- https://therouter.ai/blog/openai-prompt-caching-cost-optimization-guide/
- https://naderu.com/models-board
- https://qwen.ai/blog?id=qwen3guard
- https://www.alibabacloud.com/help/en/content-moderation
- https://developers.openai.com/api/docs/assistants/migration
- https://www.reddit.com/r/n8n/comments/1o1telh/openai_assistants_responses_api/
- https://community.make.com/t/depreciation-of-the-assistants-api-by-openai-how-to-replace-assistants/90619
- https://cosupport.ai/articles/assistants-api-responses-api-migration-guide-best-practices
- https://www.eesel.ai/blog/openai-assistants-api
- https://community.latenode.com/t/building-openai-assistant-with-new-responses-api-instead-of-deprecated-methods/38970
- https://clonepartner.com/blog/openai-assistants-api-shutdown-the-2026-migration-guide
- https://learn.microsoft.com/en-us/answers/questions/5873362/azure-open-ai-assistants-apis-deprecated-transitio
- https://syntackle.com/blog/openai-assistants-to-responses-api/
- https://therouter.ai/news/openai-assistants-api-shutdown-responses-api-migration-routing/
- https://www.alibabacloud.com/help/en/model-studio/application-api-reference
- https://help.aliyun.com/en/model-studio/workflow/introduction
- https://www.ibm.com/think/topics/ai-agent-orchestration
- https://www.mulesoft.com/ai/what-is-multi-agent-orchestration
- https://www.augmentcode.com/tools/multi-agent-orchestration-platforms-build-vs-buy
- https://delos.so/blog/multi-agent-orchestration-enterprise
- https://www.marketsandmarkets.com/Market-Reports/multi-agent-orchestration-platform-market-88410938.html
- https://www.microsoft.com/en-us/copilot/blog/copilot-studio/multi-agent-orchestration-maker-controls-and-more-microsoft-copilot-studio-announcements-at-microsoft-build-2025/
- https://www.youtube.com/watch?v=WKKdBC2zM3k&vl=en-US
- https://boomi.com/blog/agent-orchestration-for-ai-workflows/
- https://arxiv.org/html/2601.13671v1
- https://www.zyte.com/blog/my-agentic-coding-setup-claude-code-multi-agent-orchestration-and-how-i-actually-work/
- https://china-llm.com/blog/qwen-context-cache
- https://github.com/anomalyco/models.dev/blob/dev/providers/alibaba/models/qwen-max.toml
- https://www.youtube.com/shorts/13eKjT8hPro
- https://www.npmjs.com/package/@ai-sdk/alibaba
- https://www.alibabacloud.com/help/en/model-studio/quick-start-of-assistant-api
- https://www.alibabacloud.com/help/en/model-studio/call-example
- https://help.aliyun.com/en/model-studio/thread
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/quick-start-of-assistant-api
- https://community.openai.com/t/recovering-an-assistants-instructions-after-the-assistants-api-shutdown-any-read-path-left/1392995
- https://www.alibabacloud.com/help/en/model-studio/function-calling
- https://openobserve.ai/docs/integration/ai/providers/openai-assistants/
- https://help.aliyun.com/en/model-studio/multimodal-error-code
- https://www.reddit.com/r/ClaudeCode/comments/1pfx2yh/error_api_error_400_typeerrorerrortypeinvalid/
- https://qwenlm.github.io/qwen-code-docs/en/users/support/troubleshooting/
- https://stackoverflow.com/questions/19671317/400-bad-request-http-error-code-meaning
- https://community.deeplearning.ai/t/code-fix-for-error-code-400-in-labs/894175
- https://youtrack.jetbrains.com/articles/SUPPORT-A-3605/Junie-provides-error-code-400-Value-model-is-not-supported.-List-of-supported-values
- https://stackoverflow.com/questions/75898276/openai-api-error-429-you-exceeded-your-current-quota-please-check-your-plan-a
- https://learn.microsoft.com/en-us/answers/questions/2281574/429-rate-limit-errors-on-gpt-4o
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/429
- https://community.openai.com/t/error-code-429-you-exceeded-your-current-quota-please-check-your-plan-and-billing-details/649547
- https://discuss.ai.google.dev/t/use-ai-studio-facing-with-429-error-you-exceeded-your-current-quota/111017
- https://developer.sailpoint.com/discuss/t/troubleshooting-429-error-rate-limit-quota-violation-in-sailpoint-iiq-webservice-application/209026
- https://www.youtube.com/watch?v=qmGUETSmfCU
- https://aimoderationtools.com/posts/false-positive-costs-content-moderation/
- https://www.alibabacloud.com/help/en/content-moderation/latest/review-data
- https://www.alibabacloud.com/help/en/cloud-config/latest/enabling-input-content-prompts-to-attack-security-guardrails-for-refining
- https://www.alibabacloud.com/blog/how-alibaba-cloud-protects-ai-usage_602551
- https://www.digitalapplied.com/blog/fable-5-30-day-data-retention-zdr-enterprise-2026
- https://www.reddit.com/r/LocalLLM/comments/1vhydni/are_zero_data_retention_providers_sufficient/
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/get-api-key
- https://www.alibabacloud.com/help/en/model-studio/generate-temporary-api-key
- https://www.alibabacloud.com/help/en/model-studio/role-play
- https://www.alibabacloud.com/help/en/model-studio/create-token-plan-key
- https://uxcontinuum.com/blog/saas-development/openai-assistants-api-shutdown-migration-guide
- https://www.linkedin.com/pulse/openai-shutting-down-assistants-api-today-what-engineering-yqlbf
- https://dev.to/flarecanary/openais-assistants-api-shuts-down-august-26-but-the-silent-failures-hit-weeks-earlier-when-you-32d0
- https://ascentinnovate.com/insights/openai-assistants-api-shutdown-saas-august-26
- https://ragwalla.com/docs/guides/openai-assistants-api-deprecation-2026-migration-guide-wire-compatible-alternatives
- https://www.alibabacloud.com/help/en/model-studio/event-streaming.md
- https://community.openai.com/t/assistants-api-beta-deprecation-august-26-2026-sunset/1354666
- https://support.google.com/gemini/thread/368211468/how-to-fix-permission-denied-in-ai-studio?hl=en
- https://knowledge.workspace.google.com/admin/users/administrator-privilege-definitions
- https://webapps.stackexchange.com/questions/145385/what-are-the-minimal-g-suite-privileges-needed-to-take-over-as-super-admin
- https://www.googally.com/blog/google-workspace-super-admin-role
- https://itsupport.umd.edu/itsupport/?id=kb_article_view&sysparm_article=KB0016984
- https://stackoverflow.com/questions/60795734/what-admin-roles-settings-to-set-to-be-able-to-access-google-classroom-api-for-t
- https://www.alibabacloud.com/help/en/model-studio/usa-virginia-global
- https://semihub.io/en/conf/icml.html
- https://qwen-ai.chat/pricing/
- https://hardshell.ai/zero-data-retention-explained
- https://nhimg.org/ai-data-retention-and-deletion-guide
- https://learn.microsoft.com/en-ie/answers/questions/6031402/zero-data-retention-security-and-data-privacy-in-a
- https://vdf.ai/resources/zero-data-retention/
- https://omidsaffari.com/blog/best-zero-data-retention-ai-platforms-for-enterprise-agents-2026
- https://docs.llmgateway.io/features/data-retention
- https://www.alibabacloud.com/help/en/model-studio/claude-code
- https://docs.api7.ai/ai-gateway/providers/qwen
- https://chozan.co/alibaba-cloud/
- https://docs.aws.amazon.com/bedrock/latest/userguide/models-region-compatibility.html
- https://www.alibabacloud.com/help/en/model-studio/deepseek-api
- https://help.aliyun.com/en/model-studio/official-and-third-party-mcp
- https://github.com/aliyun/alibabacloud-rds-openapi-mcp-server
- https://therouter.ai/news/dashscope-web-search-routing/
- https://mcpmarket.com/server/alibaba-cloud-api
- https://www.facebook.com/alibabacloud/posts/qwen38-flash-is-now-live-in-hong-kong-on-alibaba-cloud-model-studio-bringing-pow/1581974067308013/
- https://github.com/runzhliu/aik8s/blob/main/translations/en/ai-k8s/rag-agent/deepseek-search-fetch-agent-cost.md
- https://www.techbuddies.io/2026/01/29/alibabas-qwen3-max-thinking-challenges-gpt-5-2-and-gemini-3-pro-on-high-stakes-reasoning-benchmarks/
- https://therouter.ai/zh/news/dashscope-web-search-routing/
- https://www.alibabacloud.com/help/id/model-studio/web-extractor.md
- https://help.aliyun.com/zh/model-studio/web-search
- https://www.alibabacloud.com/help/tc/model-studio/web-extractor
- https://help.aliyun.com/en/model-studio/web-search-image
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/web-search
- https://support.dynamicyield.com/hc/en-us/articles/17339423675293-Getting-Started-with-Shopping-Muse
- https://apps.apple.com/us/app/lens-ai-identify-anything/id6742104120
- https://brightdata.com/products/serp-api/google-search/reverse-image
- https://www.requesty.ai/models/alibaba
- https://ai-api-hub.com/providers/alibaba/pricing/
- https://blog.laozhang.ai/en/posts/qwen-image-2-1-turbo-api
- https://www.alibabacloud.com/en/campaign/qwen-ai-landing-page?_p_lc=1
- https://big-agi.com/alibaba
- https://help.aliyun.com/en/model-studio/qwen-code
- https://www.alibabacloud.com/help/en/model-studio/text-to-image
- https://www.alibabacloud.com/help/en/model-studio/qwen-image-api
- https://aimlapi.com/providers/alibaba-cloud
- https://www.alibabacloud.com/help/en/model-studio/embedding
- https://runware.ai/creators/alibaba
- https://www.alibabacloud.com/help/en/agentcore/connect-the-refined-knowledge-base-in-the-agentcore.md
- https://www.alibabacloud.com/help/en/tablestore/table-store-service/knowledge-storage-introduction
- https://docs.cloud.google.com/sql/docs/release-notes
- https://developer.apple.com/support/terms/apple-developer-program-license-agreement/
- https://developers.openai.com/api/docs/guides/tools-file-search
- https://www.youtube.com/watch?v=K9B61x0qWeE
- https://hackmd.io/@ll-24-25/r1RSCmxJxl/%2FbBUgFS9oSe26FmMESAm6_g
- https://team400.ai/blog/2026-04-openai-file-search-vector-stores-responses-api
- https://helpx.adobe.com/knowledge-base/web/developer-guide-getting-started/get-started-knowledge-base-api.html
- https://aws.amazon.com/blogs/machine-learning/knowledge-bases-for-amazon-bedrock-now-supports-custom-prompts-for-the-retrieveandgenerate-api-and-configuration-of-the-maximum-number-of-retrieved-results/
- https://learn.microsoft.com/en-us/rest/api/searchservice/knowledge-bases/create?view=rest-searchservice-2026-04-01
- https://www.youtube.com/watch?v=R57X_vSG1s8
- https://docs.maiagent.ai/tech/en/api-integration/knowledge-base-api
- https://github.com/earendil-works/pi/issues/6850
- https://www.alibabacloud.com/help/en/pai/product-overview/pai-langstudio-feature-retirement-and-migration-guide
- https://github.com/wong2/awesome-mcp-servers
- https://www.alibabacloud.com/help/en/maxcompute/user-guide/mcp-overview-and-access
- https://mcpservers.org/servers/semaes111/MCP
- https://skywork.ai/skypage/en/A-Deep-Dive-into-Alibaba-Cloud's-MCP-Servers-for-AI-Engineers/1971092242022395904
- https://www.trip.com/guide/info/amap.html
- https://play.google.com/store/apps/details?id=com.autonavi.minimap&hl=en_US
- https://www.tiktok.com/@visitbeijing/video/7505996115968462126?lang=en
- https://developers.google.com/maps/ai/maps-experience-agent-tools
- https://help.aliyun.com/en/model-studio/mcp-introduction
- https://www.reddit.com/r/shanghai/comments/1m40ug5/amap_in_english_some_news_for_you_all/
- https://www.scmp.com/tech/tech-trends/article/3233611/alibabas-amap-supported-chinas-gps-rival-beidou-expands-global-coverage-boost-belt-and-road-plan
- https://www.youtube.com/watch?v=1q4CnbKFS-E
- https://www.klook.com/blog/what-is-amap/
- https://agentswitchboard.dev/agents/model-studio-cli
- https://learn.microsoft.com/en-us/microsoft-copilot-studio/agent-extend-action-mcp
- https://www.youtube.com/watch?v=kKJ391VKYJo
- https://www.matthewdevaney.com/create-an-mcp-server-and-deploy-to-copilot-studio/
- https://www.dynamicsforcrm.com/create-a-model-context-protocol-mcp-server-with-azure-functions-and-use-it-in-copilot-studio/
- https://aps.autodesk.com/blog/building-custom-mcp-servers-autodesk-platform-services
- https://community.powerplatform.com/forums/thread/details/?threadid=f64d8928-5461-f011-bec2-7c1e520b3d67
- https://visualstudiomagazine.com/articles/2025/04/28/microsoft-publishes-model-context-protocol-lab-for-copilot-studio.aspx
- https://www.youtube.com/watch?v=4LKtLRZlCyE
- https://practical365.com/how-to-plan-mcp-deployment-for-copilot-studio-agents/
- https://platform.claude.com/docs/en/api/models/list
- https://qwen.ai/blog?id=qwen3.6-35b-a3b
- https://dl.acm.org/doi/10.1145/3796519
- https://www.getmaxim.ai/bifrost/mcp-servers
- https://github.com/nborwankar/awesome-mcp-servers-2
- https://help.aliyun.com/en/model-studio/mcp-faq
- https://mcpserverspot.com/
- https://www.facebook.com/61557569443676/posts/building-an-app-with-an-ai-coding-agent-mcp-servers-let-it-work-with-your-real-s/122281097414252314/
- https://chat.mcp.so/server/awesome-mcp-servers/ever-works?tab=content
- https://docs.modelstudio.console.alibabacloud.com/en/model-studio/more-tools
- https://sourcegraph.com/blog/ai-developer-tools
- https://www.reddit.com/r/ExperiencedDevs/comments/1u231do/what_makes_claude_code_better/
- https://newsletter.pragmaticengineer.com/p/mcp
- https://community.homey.app/t/app-pro-mcp-ai-bridge-control-homey-with-any-ai-assistant-claude-chatgpt-gemini-copilot-cursor-or-mistral-via-the-model-context-protocol/155930
- https://github.com/alirezarezvani/claude-skills
- https://www.facebook.com/groups/146038227041221/posts/1360130732298625/
- https://www.buildfastwithai.com/blogs/claude-connectors-creative-tools-2026
- https://www.developersdigest.tech/blog/tool-use-claude-api-production-patterns
- https://resources.rework.com/tools/ai-coding/best-windsurf-alternatives
- https://help.aliyun.com/en/model-studio/anthropic-api-messages
- https://stdapi.ai/api_overview/
- https://docs.aws.amazon.com/bedrock/latest/userguide/apis.html
- https://nightlies.apache.org/flink/flink-agents-docs-release-0.4/docs/development/calling-llms/chat-models/providers/
- https://lmstudio.ai/docs/developer/rest/stateful-chats
- https://learn.microsoft.com/en-us/microsoft-copilot-studio/prompt-model-availability
- https://stdapi.ai/api_anthropic_models/
- https://hidekazu-konishi.com/entry/amazon_bedrock_converse_api_deep_dive.html
- https://www.datastudios.org/post/claude-ai-available-models-all-supported-models-version-differences-capabilities-comparison-and
- https://medium.com/@rishab_dugar/managing-chat-history-in-aws-bedrock-models-a-deep-dive-into-llama-3-and-anthropic-claude-6e884d7e5052
- https://learn.microsoft.com/en-us/azure/foundry/responsible-ai/openai/data-privacy
