# Digest: AI & Agents View Implementation

## 1. Decisions this supports

- **Draw the canonical agent loop as:** User → Intent → Planning → Knowledge → Tools → Execution → Validation → Response. ([Source](https://www.alibabacloud.com/blog/designing-enterprise-ai-agent-architectures-with-alibaba-cloud_603528))
- **Recommend AgentCore** for multi-agent orchestration, governance, and human-in-the-loop (pause/resume/acceptance) in Singapore. ([Source](https://www.alibabacloud.com/help/en/agentcore/agentcore-product-overview))
- **Recommend AgentRun code-first runtime** (`ap-southeast-1`) for serverless agent hosting, sandboxes, and framework integration (LangChain, ADK). ([Source](https://www.alibabacloud.com/help/en/agentrun/what-is-agentrun))
- **Route Model Studio API calls** to workspace-specific hosts: `https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1` (including Responses API). Legacy `dashscope-intl` works but receives no new features. ([Source](NOTES.md, Adjudicate-1))
- **Cost estimator must add tool-call fees**, not just tokens: Web Search is $10 per 1,000 calls in Singapore; text-to-image search (`web_search_image`) is $8 per 1,000. Web extractor and code interpreter are temporarily free but add tokens. ([Source](NOTES.md, Batch 1))
- **Price models by deployment scope**, not just region. International (Singapore) scope costs more than Global scope (e.g., qwen3.8-max: $2/$6 vs $1.65/$4.95). ([Source](NOTES.md, Batch 1))
- **Warn pre-sales that Application Development** (zero-code agents, workflows, knowledge base, prompt engineering) in Singapore is preview-only and gated to accounts that created apps before 2025-04-21. New international customers cannot use it. ([Source](NOTES.md, Batch 2))
- **Use AI Guardrails** for security checks in Singapore (commodity `lvwang_guardrail_public_intl`, endpoint `green-cip.ap-southeast-1.aliyuncs.com`). Bills $6 per 10,000 calls *per enabled detection type* (content compliance, sensitive content, prompt injection). ([Source](NOTES.md, Adjudicate-1))
- **Use Tablestore Knowledge Storage** for agent memory/knowledge in Singapore; data stays in customer's own OSS/Tablestore. ([Source](NOTES.md, Batch 3))
- **For real-time voice/video agents**, draw IMS/ARTC + Model Studio realtime models. Price in Singapore: $0.028/minute + ARTC transport. Use `qwen3.8-omni-flash-realtime`. ([Source](NOTES.md, Batch 3); [Report](https://www.alibabacloud.com/en/solutions/ai-application/real-time-interaction))
- **For OCR steps**, recommend `qwen3.5-ocr` (migrate from `qwen-vl-ocr`). Default output 4,096 tokens. ([Source](NOTES.md, Batch 4))
- **Do not promise data residency based solely on region.** Region decides access/storage; deployment scope decides where inference runs (International scope can process outside mainland China). ([Source](NOTES.md, Batch 1))

## 2. Data for the catalog or model table

### Models (Singapore / International Scope unless noted)

| ID | Name | Status | Region | Input Price | Output Price | Notes |
|---|---|---|---|---|---|---|
| `qwen3.8-max` | Qwen 3.8 Max | GA | ap-southeast-1 | $2.00 / 1M tokens | $6.00 / 1M tokens | Global scope is cheaper ($1.65/$4.95). |
| `qwen-plus` | Qwen Plus (thinking) | GA | ap-southeast-1 | - | $4.00 / 1M tokens | Thinking mode output at input ≤256K. |
| `qwen3.8-flash` | Qwen 3.8 Flash | GA | ap-southeast-1 | - | - | Cache hit: $0.016/1M. Explicit cache creation: $0.20/1M. Batch/fine-tuning unsupported in SG. |
| `qwen3.8-omni-flash` | Qwen 3.8 Omni Flash | GA | 6 regions incl. SG | - | - | Realtime supported. |
| `qwen3.5-omni-plus` | Qwen 3.5 Omni Plus | GA | ap-southeast-1 | - | - | No function calling, structured output, or batch in SG. Use for non-realtime audio. |
| `qwen3.5-ocr` | Qwen 3.5 OCR | GA | ap-southeast-1 | - | - | Replaces `qwen-vl-ocr`. 4,096 default output tokens. |
| `qwen-audio-3.1-asr-flash` | Streaming ASR | GA | ap-southeast-1 | $0.93 / 1M tokens | $0.70 / 1M tokens | |
| `qwen3-rerank` | Qwen 3 Rerank | GA | ap-southeast-1 | - | - | |

### Platforms & Tools

| Product | ID/Endpoint | Status | Region | Price | Scope |
|---|---|---|---|---|---|
| AgentCore | - | GA | cn-hangzhou, cn-beijing, cn-shanghai, cn-shenzhen, ap-southeast-1 | $0.000015 / CU compute; $0.60 / hr dedicated control plane | Free offer ended 2026-10-18. KB connector reads Beijing MS KBs only (read-only). |
| AgentRun (Code-first) | `ap-southeast-1` | GA | Public cloud incl. SG | FC pricing applies | Runtime, sandbox, observability. Low-code/Open Platform discouraged. |
| AI Guardrails | `lvwang_guardrail_public_intl` | GA | ap-southeast-1, cn-hongkong, eu-central-1, us-east-1 | $6 / 10k calls per detection type | Endpoint: `green-cip.ap-southeast-1.aliyuncs.com` |
| IMS Conversational AI | - | GA | ap-southeast-1 | $0.028 / min + ARTC | Real-time audio/video agents. |
| Function Compute | - | GA | ap-southeast-1 | Standard FC pricing | Quotas: 300 vCPUs, 600 GB RAM. 2025 discount ended 2025-08-27. |
| Agent Sandbox | - | GA | ap-southeast-1 | Economy: $0.00000381/vCPU-s, $0.00000191/GiB-s. Default: $0.00000496/vCPU-s, $0.00000248/GiB-s | Successor to AgentBay. |
| Tablestore Knowledge Storage | - | GA | ap-southeast-1 | Storage + compute billed separately | Agent memory/KB. |

## 3. Rules for the drawing model

- **Draw nodes using the canonical loop:** User → Intent → Planning → Knowledge → Tools → Execution → Validation → Response. *(Fact: Official enterprise architecture blog)*
- **Draw AgentCore when the workflow requires multi-agent orchestration, governance, or human approval (pause/resume).** *(Fact: AgentCore product overview confirms these capabilities in SG)*
- **Draw AgentRun (code-first) when the workflow needs a serverless agent runtime, sandbox execution, or LangChain/ADK integration.** *(Fact: AgentRun docs confirm SG availability for code-first)*
- **Draw AI Guardrails as a validation/security node before response generation.** *(Fact: Available in SG via `green-cip.ap-southeast-1.aliyuncs.com`)*
- **Draw IMS/ARTC when the trigger or step involves real-time voice or video.** *(Fact: IMS conversational AI available in SG at $0.028/min)*
- **Draw Tablestore when the agent requires long-term memory or knowledge storage.** *(Fact: Supports SG, data stays in customer account)*
- **Never draw zero-code Model Studio applications, visual workflows, or managed knowledge bases for new international customers.** *(Fact: Gated to accounts created before 2025-04-21; preview only)*
- **Never draw Assistant API nodes.** *(Fact: Deprecated; use Responses API)*
- **Never draw AgentBay for new customers.** *(Fact: Closed to new purchases since 2026-11-02; use Agent Sandbox Express Edition)*
- **Never draw ADBAgent for Singapore deployments.** *(Fact: Not available in SG; Skills feature is mainland-only)*
- **Never draw AI Search Open Platform for Singapore deployments.** *(Fact: Excludes SG; Frankfurt is the only non-mainland region)*
- **Calculate cost per run by summing token costs (using deployment scope prices) PLUS tool-call fees (e.g., $10/1k web searches).** *(Fact: Cost estimator rules in NOTES.md)*
- **Label inference processing carefully: state "Region decides storage; deployment scope decides inference routing" rather than promising local-only inference.** *(Fact: International scope requests can process outside mainland China)*

## 4. Traps

- **PAI-LangStudio:** Retiring March 9, 2027. Do not put in the catalog as a target runtime.
- **AgentBay:** Looks like a GA catalog item, but closed to new customers on 2026-11-02. Successor is Agent Sandbox Express Edition. Windows Computer Use Sandbox is invitational preview only; Android has no confirmed replacement.
- **AgentRun Low-Code / FunAgent:** Looks available in SG/HK, but low-code Flow Agent creation is in maintenance mode (since 2026-09-18) and Open Platform activation is discouraged ahead of a major upgrade. Only code-first is recommended.
- **Model Studio Zero-Code Apps (SG):** Tutorials show drag-and-drop agents and RAG KBs, but these APIs are gated to accounts created before 2025-04-21 and are marked preview. Unusable for new international prospects.
- **Assistant API:** Documented in older tutorials, but officially deprecated. Must use `/compatible-mode/v1/responses`.
- **PrivateLink:** Older docs might show an `ap-southeast-1` endpoint example, but PrivateLink still excludes Singapore.
- **AI Guardrails "Shanghai Only":** Older report text says Shanghai only, but the live overview now lists HK, SG, Frankfurt, Virginia. It *is* international.
- **China-only recipes disguised as global:** Shopping assistant, WeChat assistant, managed-agent cost tiering, Document Mind, CosyVoice v3.5, and `qwen-mt-uni` run only on China-site consoles/endpoints.
- **Free quotas:** Removed for many models on 2026-10-29. Only applies to SG/International scope, typically 1M tokens for 90 days. Don't assume free tiers exist.
- **Cache discounts:** Not uniform. `qwen3.8-max` and its snapshots are exceptions. Quote per-model.

## 5. Open questions

- **AgentRun full region list:** Snippet cut off at `cn-shanghai`. Need to verify all public cloud regions.
- **Agent Sandbox / Agentic Computer / Agentic Mobile exact region availability:** No definitive region doc found yet.
- **Qoder international region availability:** Global product with SOC 2 Type II, but specific regional endpoints unconfirmed.
- **Quick BI Smart Q regions:** Pages conflict with each other. Paid add-on (Advanced/Professional editions only), but exact SG availability is unclear.
- **AgentCore KB connector limitation:** Confirmed read-only for Beijing Model Studio KBs. Is there a roadmap for SG KB support?
- **OpenSearch LLM-Based Conversational Search Edition:** Purchasability outside China remains unconfirmed.
- **HiClaw / DeepSeek Harness English solution pages:** Only Traditional Chinese (`/tc/`) locale surfaced for solution landing pages, though English deploy guides exist in the help center.
- **AI Guardrails billing in SG:** Adjudicated as available, but the exact $6/10k calls per detection type was originally seen on a China-site integration page. Verify live SG billing console.