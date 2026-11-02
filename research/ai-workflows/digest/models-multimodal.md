# Digest: AI & Agents View – Implementation Notes

## 1. Decisions this supports

- **Cost engine must key prices on deployment scope, not just region.** International (Singapore) and Global scopes have different list prices for the same model id (e.g., `qwen3.8-max` $2/$6 vs $1.65/$4.95). Source: NOTES.md Batch 1.
- **Draw realtime voice steps as WebSocket sessions, not HTTP calls**, using the workspace endpoint `wss://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api-ws/v1/realtime?model=...`. Source: [https://www.alibabacloud.com/help/en/model-studio/realtime-websocket-overview], NOTES.md Batch 4.
- **Web search tool costs $10 per 1,000 calls in Singapore** plus added tokens; text-to-image search (`web_search_image`) is $8 per 1,000. The cost estimator must count tool calls. Source: NOTES.md Batch 1, [https://www.alibabacloud.com/help/en/model-studio/web-search].
- **Default reranker to `qwen3-rerank`.** `gte-rerank` was retired 2026-05-30. Use `qwen3-vl-rerank` only when candidates include images/video. Source: NOTES.md Batch 4, [https://www.alibabacloud.com/notice/detail?_p_lc=1&id=1873].
- **Human approval nodes are supported via AgentCore**, which documents reviewer acceptance, pause, and resume. Source: NOTES.md Batch 3, `agentcore/using-team-tasks`.
- **Agent sandbox tool is Agent Sandbox Express (Flash) Edition**, not AgentBay. AgentBay closed to new customers 2026-11-02. Linux desktop uses `e2b-desktop`; Windows Computer Use is invitational preview. Source: NOTES.md Adjudicate-1.
- **AI Guardrails is available internationally** (Singapore, HK, Frankfurt, Virginia). Bills $6 per 10,000 calls *per enabled detection type* (content compliance, sensitive content, prompt injection). Commodity code `lvwang_guardrail_public_intl`. Source: NOTES.md Adjudicate-1.
- **Zero-code app features (knowledge base, application data, prompt engineering) are gated** to accounts that created Singapore apps before 2025-04-21 and are marked preview. Do not draw these as standard tools for new international customers. Source: NOTES.md Batch 2 & 3.
- **Do not present Global-scope regions (e.g., Virginia) as US-only processing.** Region decides storage/access; scope decides where inference runs. Source: NOTES.md Batch 1.
- **Video generation is billed per second of input plus output**, with a temporary 30% discount. Source: NOTES.md Batch 4.

## 2. Data for the catalog or model table

| Model ID | Modality / Role | Price, International Scope (Singapore) | Unit | Status / Limits |
|---|---|---|---|---|
| `qwen3.7-plus` | Native multimodal (text/img/vid → text), tool calling | List $0.40 in / $1.60 out (≤256K) | per 1M tokens | GA. 1M context, ≤2h video. Limited-time 20% off applies to list price. |
| `qwen3-vl-plus` | Vision-language | $0.20 in / $1.60 out (≤32K); $0.30/$2.40 (32K-128K); $0.60/$4.80 (128K-256K) | per 1M tokens | GA. No function calling or batch in Singapore. |
| `qwen-vl-ocr` | OCR (image → text) | $0.07 in / $0.16 out | per 1M tokens | GA. Max input 30K tokens. |
| `qwen3.8-omni-flash` | Omni understanding (HTTP) | $0.15 in / $0.016 cache-hit / $0.47 out | per 1M tokens | GA. Runs in 6 regions incl. Singapore. Text-only output. |
| `qwen-audio-3.1-realtime-flash` | Realtime voice agent w/ tool calls | $0.23 text in / $0.93 audio in / $0.70 text out / $1.87 audio out | per 1M tokens | GA. WebSocket/WebRTC. |
| `qwen-audio-3.1-asr-flash-streaming` | Streaming ASR | $0.93 in / $0.70 out | per 1M tokens | GA. |
| `qwen-audio-3.1-tts-plus` | Premium TTS | $0.30 | per 10,000 chars | GA. 180 RPM. |
| `text-embedding-v4` | Text embedding | $0.07 in (Batch: $0.035) | per 1M tokens | GA. Dims 64-2048. |
| `qwen3-rerank` | Text reranking | $0.10 | per 1M tokens | GA. |
| `qwen3-vl-rerank` | Multimodal reranking | $0.10 text / $0.258 image | per 1M tokens | GA. |
| `qwen-image-3.0-pro` | Image gen/edit | 1K: $0.003 in + $0.04 out; 2K: $0.075 out | per image | GA. Up to 6 outputs/call. |
| `wan3.0-video` | Video gen | 480P $0.05 · 720P $0.10 · 1080P $0.20 (list, 30% off promo) | per output sec | GA. ≤30s, 30fps. Billed input+output sec. |
| `cosyvoice-v3-plus` | Voice cloning TTS | $0.26 | per 10,000 chars | GA. |
| Voice cloning | Tool | $0.01 | per clone | 1,000 free voices/account. |
| Web Search | Tool | $10.00 | per 1,000 calls | Plus added tokens. |
| AI Guardrails | Tool | $6.00 | per 10,000 calls/type | Per enabled detection type. |
| Agent Sandbox (Express) | Tool (Linux) | Econ: $0.00000381/vCPU-s, $0.00000191/GiB-s. Def: $0.00000496/vCPU-s, $0.00000248/GiB-s | per sec | GA outside mainland. |
| AgentCore | Orchestration | $0.000015/CU compute; collab plane $0.60/hr | - | GA in Singapore. Free offer ended 2026-10-18. |

## 3. Rules for the drawing model

- **Always read the "Deployment scope = International" or second "Singapore" price table.** Never use the first "China (Beijing)" table shown on model info pages. (Fact: Report §0, confirmed NOTES.md Batch 1).
- **Draw realtime voice/video steps as WebSocket nodes**, connecting to `wss://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api-ws/v1/realtime?model=<model>`, starting with `session.update`. (Fact: Report §2d, NOTES.md Batch 4).
- **Add a fixed tool-call fee for web search steps**: $10 per 1,000 calls for text, $8 per 1,000 for image search, plus token costs. (Fact: NOTES.md Batch 1).
- **Never draw `qwen3.5-ocr`, `cosyvoice-v3.5-*`, or `fun-asr-flash-8k-realtime`** for international customers. (Fact: Report §9, NOTES.md Batch 4).
- **Never draw AgentBay** for new customers. Draw Agent Sandbox Express Edition instead. (Fact: NOTES.md Adjudicate-1).
- **Never draw zero-code knowledge base or application orchestration nodes** unless the customer's account predates 2025-04-21 in Singapore. (Fact: NOTES.md Batch 2/3).
- **Draw `qwen3-rerank` for text retrieval pipelines.** Never draw `gte-rerank`. (Fact: NOTES.md Batch 4).
- **Calculate video generation cost as:** `unit price × (input seconds + output seconds)`. (Fact: NOTES.md Batch 4).
- **For vision steps requiring tool calling in Singapore**, draw `qwen3.7-plus`. Do not draw `qwen3-vl-plus` for tool calling. (Fact: NOTES.md Batch 4).
- **Include AI Guardrails as an optional safety step**, billing $6 per 10,000 calls per enabled detection type. (Fact: NOTES.md Adjudicate-1).
- **Label Human Approval nodes** as backed by AgentCore (pause/resume/acceptance). (Fact: NOTES.md Batch 3).

## 4. Traps

- **Two-price trap:** Model info pages show Beijing USD prices first. Using them understates ASR/TTS costs by ~7–15% and misstates omni audio by ~4×.
- **Scope vs. Region:** Prices differ between `International` (Singapore) and `Global` (Frankfurt, Tokyo, HK, Virginia) scopes for the exact same model id.
- **Free quota removals:** The "typically 1M tokens for 90 days" rule had quotas removed for many models on 2026-10-29 (e.g., `qwen3.5-omni-flash`). Verify per model.
- **Deprecated endpoints:** `dashscope.aliyuncs.com` stopped receiving new features after 2026-09-30. The Assistant API is deprecated. The legacy Responses path `/api/v2/apps/protocols/...` is unmaintained.
- **China-only masquerading as international:** MCP CLI/Skills in Model Studio, MaxCompute remote MCP, ADBAgent Skills, and AI Search Open Platform (no Singapore region) are China-only or exclude Singapore.
- **AgentRun low-code:** Flow Agent creation is in maintenance mode (since 2026-09-18); Open Platform/FunAgent should not be activated by new users. Only the code-first runtime is recommended.
- **PrivateLink:** Still excludes Singapore.
- **Cache discounts:** Not uniform. Explicit cache requires ≥1,024 tokens, four markers per request, 5-minute TTL. Some models (e.g., `qwen3.8-max` snapshots) are exceptions.
- **Multimodal embeddings:** Do NOT support the OpenAI-compatible API; they require DashScope native.

## 5. Open questions

- **`qwen3.8-omni-flash-realtime` International pricing:** Only Beijing prices captured; International row unconfirmed.
- **`qwen3.7-text-embedding` / `-flash` International pricing:** Only Beijing model-page and China-site CNY rows captured.
- **`qwen-audio-3.1-tts-flash` International pricing:** Sourced from third-party trackers reading the intl page, not a clean official snippet.
- **`qwen3-vl-flash` Singapore availability:** Missing from the live pricing page; treat as unconfirmed.
- **`gui-plus` price and international availability:** Listed in intl vision list but description page is China-only and price unconfirmed.
- **Unidentified image row:** A Singapore-table row at 1K $0.10 / 2K $0.16 / 4K $0.24 per image could not be attributed to a model id.
- **`qwen3.8-flash` explicit cache hit price (International):** Implicit hit $0.016 and explicit creation $0.20 are known, but explicit-hit price is unconfirmed.
- **AI Guardrails Singapore integration details:** Billing lists international prices, but overview previously stated Shanghai-only; now confirmed international, but exact Singapore operational parity needs verification.