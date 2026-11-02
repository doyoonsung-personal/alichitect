**Research date: 2026-11-02. Recommendation: treat “Flash for routine steps, Max for difficult reasoning” as a routing hypothesis supported by partial evidence—not a benchmark-proven rule for support-email classification.** Published evidence supports task-specific selection, but I found no directly comparable classification, extraction, or short-summary accuracy study for these exact hosted Qwen models.

All sources below were opened. “Not found” means **unconfirmed in the sources checked**, not proof that no result exists. No China-site-only evidence is used. I found no verified contradiction of your supplied regional/product restrictions; this research did not re-audit them.

**1. Current Qwen models: benchmark coverage and gaps**

Scores retain the source’s benchmark version. A missing result must remain null in the catalog, not become zero.

| Model/version | Confirmed results relevant to the requested benchmarks | Publication / evidence status | Missing or unresolved coverage |
|---|---|---|---|
| **Qwen3.8-Max, launch version** | **Terminal-Bench 2.1: 86.6**. Qwen uses Claude Code, avg@10, five-hour timeout, max_tokens 131,072. [Qwen launch](https://qwen.ai/blog?id=qwen3.8) | **2026-08-02; vendor-reported.** [Source](https://qwen.ai/blog?id=qwen3.8) | BFCL, τ-bench/τ²-bench, SWE-bench **Verified**, BrowseComp and GAIA: **no confirmed result found** for this version. Its published SWE-bench **Pro** result is a different benchmark. [Published table](https://qwen.ai/blog?id=qwen3.8) |
| **Qwen3.8 Max (0902)** | **Terminal-Bench 4.0: 39%**; Terminal-Bench-Science 0.1: **12%**. [AA comparison](https://artificialanalysis.ai/models/comparisons/qwen3-8-max-vs-qwen3-8-flash-next) | **Independent, Artificial Analysis; retrieved 2026-11-02.** Model labeled September 2026; individual evaluation date not exposed in the retrieved table. [Source](https://artificialanalysis.ai/models/comparisons/qwen3-8-max-vs-qwen3-8-flash-next) | Do not attach these to the August launch checkpoint or compare 39% with Terminal-Bench 2.1’s 86.6. The hosted alias-to-checkpoint mapping remains **unconfirmed** here. |
| **qwen3.8-flash, hosted** | OpenRouter’s “AutoExacto benchmarks” displays **TAU-Bench 76.7%** for Alibaba Cloud Int., **80.0%** for its US entry and **71.3%** for auto-routing. [OpenRouter](https://openrouter.ai/qwen/qwen3.8-flash) | **Third-party platform-reported; retrieved 2026-11-02.** [Source](https://openrouter.ai/qwen/qwen3.8-flash) | τ version, domain mix, sample size and harness are **unconfirmed** in the page. These are not eligible for comparison with τ² scores below. No confirmed hosted-Flash BFCL, SWE-bench Verified, BrowseComp or GAIA result found. |
| **Qwen3.8-Flash-Next, open weights** | **Terminal-Bench 4.0: 25%**, independently measured by AA. [AA comparison](https://artificialanalysis.ai/models/comparisons/qwen3-8-max-vs-qwen3-8-flash-next) | **Independent; retrieved 2026-11-02.** Release blog dated **2026-08-26**. [AA](https://artificialanalysis.ai/models/comparisons/qwen3-8-max-vs-qwen3-8-flash-next), [Qwen](https://qwen.ai/blog?id=qwen3.8-flash-next) | Its release table reports other agent benchmarks, but no BFCL, τ², SWE-bench Verified, BrowseComp or GAIA score. [Release table](https://qwen.ai/blog?id=qwen3.8-flash-next) |
| **Qwen3.7-Plus** | **BFCL-V4 72.9; Terminal-Bench 2.0-Terminus 70.3; SWE-Verified 77.7.** [Qwen](https://qwen.ai/blog?id=qwen3.7-plus) | **2026-05-31; vendor-reported.** [Source](https://qwen.ai/blog?id=qwen3.7-plus) | τ/τ², text BrowseComp and GAIA: **no confirmed result found**. BC-VL and MMBC in the visual table are separate benchmarks. [Source](https://qwen.ai/blog?id=qwen3.7-plus) |
| **Qwen3.5-397B-A17B, open weights** | **BFCL-V4 72.9; TAU2-Bench 86.7; Terminal Bench 2 52.5; SWE-bench Verified 76.4; BrowseComp 69.0 / 78.6**, depending on context management. [Qwen](https://qwen.ai/blog?id=qwen3.5) | **2026-02-15; vendor-reported.** [Source](https://qwen.ai/blog?id=qwen3.5) | GAIA: **no confirmed result found** for this checkpoint in the checked sources. |

Qwen explicitly identifies **Qwen3.8-Flash as the production version of Flash-Next**, with a different default context configuration and official built-in tools. That establishes a relationship, not identical evaluation conditions or endpoint performance. [Qwen](https://qwen.ai/blog?id=qwen3.8-flash-next)

**2. Comparable results reported side by side**

These tables intentionally keep each comparison within one source. Vendor tables can still mix harnesses or quote competitors’ published results.

| Benchmark | Qwen3.8-Max | Opus 4.8 | Fable 5 | GPT-5.6 Sol, max | Evidence |
|---|---:|---:|---:|---:|---|
| Terminal-Bench **2.1** | 86.6 | 84.6 | 84.6 | 88.8 | Vendor table, 2026-08-02. [Source](https://qwen.ai/blog?id=qwen3.8) |
| SWE-bench **Pro** | 67.7 | 69.2 | 80.0 | 64.6 | Vendor table; **not Verified**. [Source](https://qwen.ai/blog?id=qwen3.8) |
| Toolathlon Verified, pass@1 | 72.5 | 76.2 | 77.9 | 74.9 | Vendor table. [Source](https://qwen.ai/blog?id=qwen3.8) |
| Automation-Bench, pass@1 | 27.3 | 27.2 | 29.1 | 29.7 | Vendor table. [Source](https://qwen.ai/blog?id=qwen3.8) |
| MRCR v2, 256K, eight needles | 92.9 | 83.2 | — | 93.8 | Vendor table; long-context retrieval evidence. [Source](https://qwen.ai/blog?id=qwen3.8) |

For Terminal-Bench 2.1, Qwen explicitly reports competitors’ best published scores across **different harnesses**: Terminus 2 for the Anthropic models and Codex for GPT-5.6 Sol. This is a published comparison, not a controlled model-only experiment. [Methodology](https://qwen.ai/blog?id=qwen3.8)

| Benchmark | Qwen3.7-Plus | Opus 4.6 Max | K2.6 Thinking | DeepSeek-V4-Pro Max | Evidence |
|---|---:|---:|---:|---:|---|
| BFCL-V4 | 72.9 | 76.7 | 71.3 | 70.6 | Vendor table, 2026-05-31. [Source](https://qwen.ai/blog?id=qwen3.7-plus) |
| Terminal-Bench 2.0-Terminus | 70.3 | 65.4 | 66.7 | 67.9 | Same source. [Source](https://qwen.ai/blog?id=qwen3.7-plus) |
| SWE-Verified | 77.7 | 80.8 | 80.2 | 80.6 | Same source. [Source](https://qwen.ai/blog?id=qwen3.7-plus) |
| Deep-Planning | 62.3 | 58.9 | 42.3 | 44.6 | Useful additional planning evidence. [Source](https://qwen.ai/blog?id=qwen3.7-plus) |
| MCP-Mark | 58.7 | 56.7 | 55.9 | 57.1 | Useful additional tool-workflow evidence. [Source](https://qwen.ai/blog?id=qwen3.7-plus) |

Qwen3.7’s Terminal-Bench setup uses Harbor/Terminus-2, five runs, a five-hour timeout, 12 CPUs/24 GB RAM and 256K context. SWE evaluations use an internal scaffold with bash and file-edit tools and 200K context. [Methodology](https://www.alibabacloud.com/blog/qwen3-7-plus-multimodal-agent-intelligence_603206)

| Benchmark | Qwen3.5-397B-A17B | GPT-5.2 | Claude 4.5 Opus | Gemini 3 Pro | Evidence |
|---|---:|---:|---:|---:|---|
| BFCL-V4 | 72.9 | 63.1 | 77.5 | 72.5 | Vendor table, 2026-02-15. [Source](https://qwen.ai/blog?id=qwen3.5) |
| TAU2-Bench | 86.7 | 87.1 | 91.6 | 85.4 | Same source; airline-domain fixes applied. [Source](https://qwen.ai/blog?id=qwen3.5) |
| SWE-bench Verified | 76.4 | 80.0 | 80.9 | 76.2 | Same source. [Source](https://qwen.ai/blog?id=qwen3.5) |
| Terminal Bench 2 | 52.5 | 54.0 | 59.3 | 54.2 | Same source. [Source](https://qwen.ai/blog?id=qwen3.5) |
| BrowseComp | **69.0 / 78.6** | 65.8 | 67.8 | 59.2 | Qwen: simple context folding / discard-all strategy. [Source](https://qwen.ai/blog?id=qwen3.5) |

The two Qwen BrowseComp scores differ by **9.6 percentage points solely across the reported context-management strategies**. Store the strategy alongside the score; neither number is a context-free model capability rating. [Qwen methodology](https://qwen.ai/blog?id=qwen3.5)

Flash-Next also has substantial agent evidence beyond the requested benchmark list:

| Benchmark | Flash-Next | Qwen3.8-27B | Qwen3.7-Plus | DeepSeek-V4-Flash-0731 | Evidence |
|---|---:|---:|---:|---:|---|
| DeepSWE 1.1 | 58.7 | 42.2 | 16.5 | 54.4 | Vendor-reported, 2026-08-26. [Source](https://qwen.ai/blog?id=qwen3.8-flash-next) |
| SWE-bench Pro | 62.5 | 61.7 | 55.8 | 56.0 | Same source. [Source](https://qwen.ai/blog?id=qwen3.8-flash-next) |
| Toolathlon Verified, pass@1 | 73.5 | 67.1 | 50.6 | 70.3 | Same source. [Source](https://qwen.ai/blog?id=qwen3.8-flash-next) |

These results argue against describing Flash as suitable **only** for trivial tasks. However, DeepSWE reports the better result across two harnesses, and SWE-bench Pro uses corrected tasks with re-evaluated baselines. [Methodology](https://qwen.ai/blog?id=qwen3.8-flash-next)

**3. Independent BFCL and additional open-weight evidence**

The Berkeley leaderboard retrieved on November 2 labels itself **BFCL V4**, last updated **2026-04-12**. Its scores differ from vendor-reported BFCL results and must remain separate records. [Leaderboard](https://gorilla.cs.berkeley.edu/leaderboard.html)

| Model | Overall BFCL V4 accuracy | Evaluation mode / status |
|---|---:|---|
| Qwen3-235B-A22B-Instruct-2507 | **52.15** | Prompt; independent benchmark-maintainer publication. [Source](https://gorilla.cs.berkeley.edu/leaderboard.html) |
| Same checkpoint | **47.99** | Native function calling, FC. [Source](https://gorilla.cs.berkeley.edu/leaderboard.html) |
| Qwen3-32B | **48.71** | FC. [Source](https://gorilla.cs.berkeley.edu/leaderboard.html) |
| Qwen3-8B | **42.57** | FC. [Source](https://gorilla.cs.berkeley.edu/leaderboard.html) |
| Qwen3-30B-A3B-Instruct-2507 | **41.39** | FC. [Source](https://gorilla.cs.berkeley.edu/leaderboard.html) |
| Qwen3-14B | **41.03** | FC. [Source](https://gorilla.cs.berkeley.edu/leaderboard.html) |
| Qwen3-4B-Instruct-2507 | **35.68** | FC. [Source](https://gorilla.cs.berkeley.edu/leaderboard.html) |
| Qwen3-1.7B / Qwen3-0.6B | **28.41 / 23.93** | FC. [Source](https://gorilla.cs.berkeley.edu/leaderboard.html) |
| Claude Opus 4.5-20251101 | **77.47** | FC; peer on the same leaderboard. [Source](https://gorilla.cs.berkeley.edu/leaderboard.html) |
| Gemini 3 Pro Preview | **72.51 / 68.14** | Prompt / FC; same leaderboard. [Source](https://gorilla.cs.berkeley.edu/leaderboard.html) |

A useful smaller-model vendor comparison is **Qwen3-30B-A3B-Instruct-2507**, a non-thinking checkpoint. Its card publishes the following; exact evaluation dates are unspecified, and “2507” identifies the checkpoint rather than an evaluation date. [Model card](https://huggingface.co/Qwen/Qwen3-30B-A3B-Instruct-2507)

| Benchmark | Qwen3-30B-A3B-Instruct-2507 | DeepSeek-V3-0324 | Gemini 2.5 Flash, non-thinking |
|---|---:|---:|---:|
| BFCL-v3 | 65.1 | 64.7 | 66.1 |
| τ1 Retail / Airline | 59.1 / 40.0 | 49.6 / 32.0 | 65.2 / 48.0 |
| τ2 Retail / Airline / Telecom | 57.0 / 38.0 / **12.3** | 71.1 / 36.0 / 34.0 | 64.3 / 42.5 / 16.9 |

All entries are vendor-reported in the same model card. The domain spread is particularly relevant: good retail performance does not establish reliable telecom workflow execution. [Table](https://huggingface.co/Qwen/Qwen3-30B-A3B-Instruct-2507)

For **GAIA**, a confirmed Qwen-family result exists, but it is an agent-system study:

| Model in AWorld evaluation | GAIA test-set pass@1 | Evidence |
|---|---:|---|
| Qwen3-32B, starting model | 21.59% | AWorld authors’ evaluation, **2025-08-28**. [Paper, Table 3](https://arxiv.org/html/2508.20404v1#S3.T3) |
| Qwen3-32B-AWorld, fine-tuned | 32.23% | Developer-reported for its own derivative, **not an independent validation of that derivative**. [Paper](https://arxiv.org/html/2508.20404v1#S3.T3) |
| GPT-4o / DeepSeek-V3 / Claude 3.7 Sonnet | 27.91% / 31.89% / 43.85% | Peers in the same table. [Paper](https://arxiv.org/html/2508.20404v1#S3.T3) |

Do not assign AWorld’s score to stock Qwen3-32B or a Model Studio alias. The model card explicitly identifies it as a fine-tune. [Card](https://huggingface.co/inclusionAI/Qwen3-32B-AWorld)

**4. Multilingual evidence for Korea, Japan and Southeast Asia**

**MMLU-ProX** includes Korean, Japanese, Vietnamese, Thai and Indonesian among 29 languages. It measures multilingual knowledge/reasoning through multiple-choice questions, not multilingual tool execution or customer-support quality. [Benchmark paper](https://arxiv.org/html/2503.10497v2)

The benchmark authors’ **2025-05-26 v2** paper provides independent, language-specific comparisons:

| Language | Qwen3-32B | Qwen3-32B Thinking | Qwen3-235B Thinking | GPT-4.1 | DeepSeek-R1 |
|---|---:|---:|---:|---:|---:|
| Japanese | 62.6 | 70.2 | 77.1 | 75.6 | 76.9 |
| Korean | 65.5 | 71.2 | 78.3 | 75.4 | 76.7 |
| Vietnamese | 68.5 | 72.4 | 72.6 | 76.7 | 76.3 |
| Thai | 56.1 | 70.4 | 77.1 | 75.1 | 78.7 |
| Indonesian | 68.5 | 73.4 | 79.9 | 75.6 | 81.3 |

All figures are accuracy percentages from the same source and evaluation table. [Results](https://arxiv.org/html/2503.10497v2)

For newer models, Qwen publishes **aggregate** MMLU-ProX accuracy: **Qwen3.7-Plus 85.4** and **Qwen3.5-397B-A17B 84.7**, both vendor-reported. These are 29-language averages, not Korean or Japanese scores. [Qwen3.7](https://qwen.ai/blog?id=qwen3.7-plus), [Qwen3.5](https://qwen.ai/blog?id=qwen3.5)

I did not confirm corresponding language-specific scores for **qwen3.8-max or hosted qwen3.8-flash**. Their Korean/Japanese/SEA classification and tool-use accuracy therefore remains **unconfirmed**.

**5. Evidence for choosing a model per step**

| Step type | Published evidence | Defensible app rule—an inference, not a published Qwen result |
|---|---|---|
| Classification and routing | Anthropic recommends routing common/easy requests to smaller models and difficult/unusual ones to stronger models, provided classification can be performed accurately. It explicitly uses customer-service routing as an example. [Engineering guidance](https://www.anthropic.com/research/building-effective-agents) | Start with Flash; require a labeled evaluation set and route ambiguous or failed-schema outputs onward. |
| Extraction and short summaries | Google describes lightweight Gemma models as supporting summarization and extraction. This is capability guidance, not a measured Qwen comparison. [Google model documentation](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-0-flash-lite) | Flash is a candidate for bounded inputs and explicit schemas. Exact-model quality advantage remains **unconfirmed**. |
| Planning and adaptive tool use | Qwen3.7-Plus publishes Deep-Planning **62.3** and MCP-Mark **58.7**; Anthropic recommends orchestrator workflows when required subtasks cannot be predicted in advance. [Qwen](https://qwen.ai/blog?id=qwen3.7-plus), [Anthropic](https://www.anthropic.com/research/building-effective-agents) | Benchmark Plus alongside Max; do not automatically reserve all planning for Max. |
| Difficult terminal/code work | AA reports Max (0902) **39%** versus Flash-Next **25%** on Terminal-Bench 4.0. [Independent comparison](https://artificialanalysis.ai/models/comparisons/qwen3-8-max-vs-qwen3-8-flash-next) | Max has direct supporting evidence for this workload category. |
| Document reasoning | AA reports GDP.pdf **23%** for Max versus **16%** for Flash-Next. [Independent comparison](https://artificialanalysis.ai/models/comparisons/qwen3-8-max-vs-qwen3-8-flash-next) | Prefer testing Max for difficult document synthesis; this does not prove superiority for every long document. |
| Routine SaaS workflows | AA reports **56% for both** Max and Flash-Next on AutomationBench-AA. [Independent comparison](https://artificialanalysis.ai/models/comparisons/qwen3-8-max-vs-qwen3-8-flash-next) | No measured Max advantage on this aggregate; compare cost per successful workflow. |

There is measured evidence that routing can save money: **RouteLLM**, published **2024-07-01**, reports maintaining 95% of GPT-4 performance while reducing cost by **over 85% on MT-Bench, 45% on MMLU and 35% on GSM8K**, routing between GPT-4 and Mixtral 8×7B. Those savings are specific to the study, not forecasts for Qwen or support emails. [LMSYS study](https://www.lmsys.org/blog/2024-07-01-routellm/)

For the example support workflow, I would encode these as **provisional choices**:

- **Intent classification, field extraction, short handoff summary:** Flash candidate.
- **Answer from a small, clearly relevant article set:** Flash candidate, with grounded-answer checks.
- **Conflicting policies, unclear intent, repeated tool failures, difficult synthesis:** evaluate Plus and Max as escalation models.
- **Sending or approving consequential replies:** explicit workflow policy and human approval where required; model benchmark scores do not supply authorization.

The missing evidence is a controlled evaluation of these exact steps, languages, prompts, tools and hosted checkpoints. That is the test suite the app team should build.

**6. Latency and output speed**

These are live third-party snapshots retrieved **2026-11-02**, not Singapore service guarantees.

| Exact source label | TTFT | Output speed | First answer token | Evidence and qualification |
|---|---:|---:|---:|---|
| **Qwen3.8 Max (0902)**, AA | **2.92 s** | **40 tokens/s**, rounded | **53.14 s** | Independent comparison table; model detail gives **39.8 tokens/s**. [Comparison](https://artificialanalysis.ai/models/comparisons/qwen3-8-max-vs-qwen3-8-flash-next), [Detail](https://artificialanalysis.ai/models/qwen3-8-max) |
| **Qwen3.8-Flash-Next**, AA | **2.39 s** | **54 tokens/s** | **39.14 s** | Independent measurement of the labeled Flash-Next model. Exact Singapore hosted-alias equivalence **unconfirmed**. [Source](https://artificialanalysis.ai/models/comparisons/qwen3-8-max-vs-qwen3-8-flash-next) |
| **qwen3.8-flash**, OpenRouter, Alibaba Cloud Int. | Explicit TTFT value **unconfirmed**; displayed P50 “Latency” **1.25 s** | **55 tokens/s**, P50 | Not confirmed | Exact hosted model page. The page distinguishes latency from TTFT, so 1.25 s should not be relabeled TTFT. [Source](https://openrouter.ai/qwen/qwen3.8-flash) |
| Same model, OpenRouter US entry | Explicit TTFT **unconfirmed**; displayed latency **2.41 s** | **49 tokens/s** | Not confirmed | Provider-table snapshot. [Source](https://openrouter.ai/qwen/qwen3.8-flash) |

AA defines output speed as generation speed after the first response chunk and says model-level figures represent the first-party API, or the median across providers when a first-party API is unavailable. The retrieved comparison does not establish Singapore-specific network conditions. [Methodology on model page](https://artificialanalysis.ai/models/qwen3-8-max)

**First token is not first usable answer:** AA’s reasoning-model measurements show roughly 2–3 seconds to first token but 39–53 seconds to first answer token for these configurations. A live diagram should therefore distinguish “model started responding” from “validated node/edge update ready.” [Measurements](https://artificialanalysis.ai/models/comparisons/qwen3-8-max-vs-qwen3-8-flash-next)

For catalog implementation, store each result with **checkpoint, hosted alias, benchmark version, domain/split, metric, harness, reasoning configuration, context strategy, source date, retrieval date, source URL and vendor/independent status**. Keep regional availability separate. Suggested explanation text:

> “Flash is the initial candidate for this bounded classification step. Published routing guidance supports trying a lower-cost model first; accuracy on your languages and categories requires validation.”

> “Max is a candidate for this difficult tool-execution step because independent testing reports stronger Terminal-Bench 4.0 performance than Flash-Next. This is supporting evidence, not a guarantee for this workflow.”

Codex session ID: 01a19b10-eb73-7701-b6f8-3c0f34893f3d
Resume in Codex: codex resume 01a19b10-eb73-7701-b6f8-3c0f34893f3d
