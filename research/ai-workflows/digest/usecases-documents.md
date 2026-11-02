# Digest: Document-heavy agentic workflows for the pre-sales app

## 1. Decisions this supports

- Draw **workflows with bounded agentic islands**, not autonomous agents, for document back-office use cases ([Alibaba Cloud Agent vs Workflow guidance](https://www.alibabacloud.com/help/en/model-studio/single-agent-application)).
- Use **AgentCore** (commercial, pay-as-you-go) as the primary agent runtime in Singapore; do not recommend AgentBay to new customers ([Adjudicate-1](#), [Batch 3](#)).
- Route **code-first AgentRun** only; never draw low-code Flow Agents or Open Platform/FunAgent for new users ([Adjudicate-1](#)).
- Draw **CloudFlow** (`WaitForCustomCallback` / `WaitForSystemCallback`, Standard mode) or **AgentCore team tasks** for human approval steps; Model Studio managed-agent Tool Approval is China-only ([Adjudicate-3](#)).
- Split any step requiring strict JSON output and thinking into **two nodes** (reason, then extract); JSON mode errors when thinking is enabled on models that support structured output only in non-thinking mode ([Batch 1](#)).
- Never draw LLM nodes for arithmetic; always draw a **Function Compute or Code Interpreter node** for deterministic math ([Report §1.2](#), [PMC12961587](https://pmc.ncbi.nlm.nih.gov/articles/PMC12961587/)).
- For new international accounts, draw **Tablestore Knowledge Storage** or **DashVector + embeddings** for RAG; Model Studio knowledge base is gated behind a pre-2025-04-21 eligibility date ([Adjudicate-2](#)).
- Warn EU customers that Annex III high-risk obligations apply from **2027-12-02**, but Article 50 transparency applies from **2026-08-02** ([Batch 5](#), [Batch 7](#)).
- Warn Korean customers that inference in Singapore/Tokyo is a cross-border transfer under PIPA, which grants a right to object to fully automated decisions since March 2024 ([Report §9.1](#), [Batch 5](#)).
- Cost estimator must add **$10 per 1,000 web-search calls** in Singapore plus tokens, and count tool calls, not just tokens ([Batch 1](#)).
- Cost estimator must ask for **deployment scope** (International vs Global), because the same model ID costs less in Global scope than International/Singapore ([Batch 1](#)).
- Do not offer off-the-shelf inbound phone lines; draw telephony as a carrier/partner integration needing country confirmation ([Batch 6s](#)).

## 2. Data for the catalog or model table

*Prices are per 1M tokens unless noted. Scope: International (Singapore).*

| ID | Name | Status | Region | Input Price | Output Price | Notes |
|---|---|---|---|---|---|---|
| `qwen3.8-max` | Qwen3.8-Max | Available | SG | $2.00 | $6.00 | No batch or fine-tuning in SG. Web search works. |
| `qwen-plus` | Qwen-Plus | Available | SG | $0.40 (≤256K) | $1.20 (no think) / $4.00 (think) | >256K: $1.20 in / $3.60 out. |
| `qwen-flash` | Qwen-Flash | Available | SG | $0.05 (≤256K) | $0.40 | >256K: $0.25 in / $2.00 out. No batch in SG. |
| `qwen3.7-plus` | Qwen3.7-Plus | Available | SG | $0.40 (≤256K) | $1.60 | >256K: $1.20 in / $4.80 out. Batch supported on alias. |
| `qwen-vl-ocr` | Qwen-VL-OCR | Available | SG | $0.07 | $0.16 | No batch in SG. |
| `text-embedding-v4` | Text Embedding v4 | Available | SG | $0.07 | — | No batch. |
| `qwen3-rerank` | Qwen3-Rerank | Available | SG | $0.10 | — | Max 4,000 tokens/item, 120,000/request. |
| `qwen-mt-plus` | Qwen-MT Plus | Available | SG | $2.46 | $7.37 | 92 languages. Single-turn only, no system message. |
| `qwen-mt-flash` | Qwen-MT Flash | Available | SG | $0.16 | $0.49 | 92 languages. |
| `qwen-mt-lite` | Qwen-MT Lite | Available | SG | $0.12 | $0.36 | 31 languages. |
| `agentcore` | AgentCore | Commercial | SG | $0.000015/CU | — | Control plane $0.60/hr. Free offer ended 2026-10-18. |
| `agent-sandbox` | Agent Sandbox | GA | SG | $0.00000381/vCPU-s (Economy) | — | Memory/disk billed separately. Reference rates. |
| `dashvector` | DashVector | Available | SG | $0.06/hr (P.small) | — | Billed per second, settled hourly. |
| `directmail` | DirectMail | Available | SG | $0.29/1k emails | — | 2,000 free once/account. |
| `chatapp` | Chat App Message Service | Available | SG | $0.005/msg platform fee | — | WA/Viber/Messenger/IG/Telegram/LINE/SMS/Email. |

## 3. Rules for the drawing model

- **Draw Function Compute or Code Interpreter for all arithmetic/totals.** Fact: LLM mathematical reasoning is unreliable; delegating to Python prevents operation-order errors ([Batch 1](#), [Report §1.2](#)).
- **Split extraction into two nodes if thinking is required.** Fact: JSON Schema output errors when `enable_thinking` is true on models supporting structured output only in non-thinking mode ([Batch 1](#)).
- **Never draw `qwen-doc-turbo` or `qwen-long` 10M-token mode for international customers.** Fact: Both are Beijing-only document models ([Batch 7](#)).
- **Draw Tablestore or DashVector for RAG retrieval if the account is new.** Fact: Model Studio knowledge base APIs are gated to accounts that created a Singapore app before 2025-04-21 ([Adjudicate-2](#), [Batch 3](#)).
- **Draw CloudFlow callback or AgentCore team task for human approval.** Fact: Model Studio managed-agent "Always ask" Tool Approval is China-site only ([Report §1.2](#), [Adjudicate-3](#)).
- **Never draw AgentBay for new customers.** Fact: Closed to new purchases since 2026-11-02; successor is Agent Sandbox ([Adjudicate-1](#)).
- **Draw code-first AgentRun, never low-code Flow Agent.** Fact: Low-code is in maintenance mode; Open Platform activation is discouraged ([Adjudicate-1](#)).
- **Draw an external carrier node for voice telephony.** Fact: International telephony (inbound phone lines) is not established as an off-the-shelf Alibaba Cloud product ([Batch 6s](#)).
- **Add a warning node for EU AI Act Art. 50 transparency if customer-facing.** Fact: Applies from 2026-08-02 even though Annex III is deferred to 2027-12-02 ([Batch 5](#), [Batch 7](#)).
- **Annotate cross-border transfer for Korean data subjects if inference is in SG.** Fact: PIPA Art. 37-2 gives rights regarding fully automated decisions since March 2024 ([Batch 5](#)).

## 4. Traps

- **`qwen-doc-turbo` and `qwen-long` file mode:** Look like global capabilities but are Beijing-only. Using them in an international proposal will fail at implementation ([Batch 7](#)).
- **`qwen3.5-ocr`:** Recommended by some docs, but only has a Beijing price. The international OCR model is `qwen-vl-ocr` at $0.07/$0.16 ([Adjudicate-4](#)).
- **AgentBay:** Listed as GA in old catalogs but closed to new customers since 2026-11-02. Successor is Agent Sandbox Express/Flash Edition ([Adjudicate-1](#)).
- **Model Studio Knowledge Base & Zero-Code Apps:** Appear in tutorials but are blocked for any international account that didn't create a Singapore app before 2025-04-21. They are preview features ([Batch 3](#), [Adjudicate-2](#)).
- **AI Guardrails console:** Older docs say "Shanghai only". It is now available internationally (SG, HK, Frankfurt, Virginia) via `lvwang_guardrail_public_intl`, billing $6 per 10,000 calls per detection type ([Adjudicate-1](#)).
- **Global vs International pricing:** The same model ID (e.g., `qwen3.8-max`) is cheaper in Global scope ($1.65/$4.95) than International/Singapore ($2.00/$6.00). Proposals assuming Global prices for SG deployments will under-quote ([Batch 1](#)).
- **Web Search cost:** Looks like a standard tool call but costs $10 per 1,000 calls in Singapore, plus tokens. Omitting this breaks cost estimates ([Batch 1](#)).
- **Batch Inference limitations:** Not universally available. In Singapore, `qwen3.8-flash` and text-only `qwen3.8-max` do not support batch. Batch excludes context caching and free quotas ([Batch 6](#)).
- **Qwen-MT System Prompts:** Qwen-MT translates single turns only and takes no system message. Workflows relying on system prompts for MT will break ([Batch 7](#)).
- **Deprecated models:** `gte-rerank` was discontinued 2026-05-30. Qwen2.5 series can no longer be called. Assistant API is deprecated ([Report §1.2](#), [Batch 2](#), [Batch 6s](#)).

## 5. Open questions

- **ASR Pricing in Singapore:** Conflicting reads exist for `qwen-audio-3.1-asr-flash` ($0.93/$0.70 vs $0.15/$0.47 per 1M tokens). Treat ASR prices as unconfirmed until verified directly ([Batch 6s](#)).
- **AgentLoop in Singapore:** General region list omits Singapore, but multimodal evaluator docs list it. Hong Kong is the documented non-mainland fallback ([Batch 7](#)).
- **Tablestore Knowledge/Memory Storage exact SGD pricing:** Only CNY reference rates are published (e.g., CNY 1.08/GB/month for knowledge). The page contradicts itself on memory metering units ([Adjudicate-2](#)).
- **LINE/Telegram/KakaoTalk/Zalo availability:** Chat App Message Service Agentic Journey lists LINE, but KakaoTalk and Zalo remain unestablished for international ([Batch 7](#), [Report §9.2](#)).
- **Thailand B2B e-invoicing mandate:** Trackers conflict (Jan 2026 vs no mandate). Unconfirmed ([Report §9.4](#)).
- **AI Guardrails token minimum in Singapore:** Docs checked showed a 1,000-token minimum billing per check on the China site; whether this exact rule applies to the international edition needs verification ([Batch 2](#)).