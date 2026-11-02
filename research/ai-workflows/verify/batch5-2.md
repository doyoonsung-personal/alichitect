| id | verdict | evidence | correct value | page checked |
|---|---|---|---|---|
| produc-7 | corrected | Global Claude API pricing lists model-specific exceptions to the 0.1× cache-read multiplier. | 0.1× generally; 0.025× for Fable 5.1/Mythos 5.1; 0.05× for Opus 5.5/Sonnet 5.5. | [Claude pricing](https://platform.claude.com/docs/en/about-claude/pricing) |
| produc-8 | confirmed | “5-minute cache write” / “1.25x base input price”. Scope: Global Claude API base pricing. | | [Claude pricing](https://platform.claude.com/docs/en/about-claude/pricing) |
| produc-9 | confirmed | “1-hour cache write” / “2x base input price”. Scope: Global Claude API base pricing. | | [Claude pricing](https://platform.claude.com/docs/en/about-claude/pricing) |
| produc-5 | confirmed | The `ToolAnnotations` interface includes all four named Boolean hints. | | [MCP annotations](https://blog.modelcontextprotocol.io/posts/2026-03-16-tool-annotations/) |
| produc-6 | confirmed | Defaults shown: `readOnlyHint: false`, `destructiveHint: true`, `idempotentHint: false`. | | [MCP annotations](https://blog.modelcontextprotocol.io/posts/2026-03-16-tool-annotations/) |
| produc-18 | confirmed | “ASI01: Agent Goal Hijack” appears in the linked official report. | | [OWASP report, p. 8](https://genai.owasp.org/download/52117/?tmstv=1765059207) |
| produc-19 | confirmed | “ASI06: Memory & Context Poisoning” appears in the linked official report. | | [OWASP report, p. 8](https://genai.owasp.org/download/52117/?tmstv=1765059207) |
| produc-41 | confirmed | “20-50 simple tasks drawn from real failures is a great start.” | | [Anthropic evaluations](https://www.anthropic.com/research/demystifying-evals-for-ai-agents) |
| produc-42 | confirmed | “at least one correct solution in k attempts” | | [Anthropic evaluations](https://www.anthropic.com/research/demystifying-evals-for-ai-agents) |
| produc-2 | confirmed | “from 150,000 tokens to 2,000 tokens—a time and cost saving of 98.7%.” | | [Anthropic MCP execution](https://www.anthropic.com/research/code-execution-with-mcp) |
| produc-16 | corrected | Presented as a “best practice,” with desired outcomes and implementation guidance; no mandate is stated. | AWS recommends idempotent execution for safe retries without duplicate side effects. | [AGENTREL06-BP04](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel06-bp04.html) |
| produc-17 | corrected | “Implementing agent timeouts helps to reduce the likelihood of blocking failures”; this is best-practice guidance. | AWS recommends timeout controls; the page does not establish a mandatory requirement. | [GENREL03-BP02](https://docs.aws.amazon.com/wellarchitected/latest/generative-ai-lens/genrel03-bp02.html) |
| produc-24 | unavailable | The cited PDF timed out when fetched. | | [NIST AI RMF PDF](https://nvlpubs.nist.gov/nistpubs/ai/nist.ai.100-1.pdf) |
| produc-25 | confirmed | “50% cost discount compared to synchronous APIs”. Scope: OpenAI Batch API; no Singapore-specific pricing stated. | | [OpenAI Batch](https://developers.openai.com/api/docs/guides/batch) |
| produc-28 | confirmed | “reduce your input token costs by up to 90 percent”. Example scope: Global inference profile through `us-west-2`. | | [Bedrock caching](https://aws.amazon.com/blogs/machine-learning/optimizing-cost-and-latency-with-amazon-bedrock-prompt-caching/) |
| produc-29 | confirmed | “GPT-4) with up to 98% cost reduction”. Experimental API-cost comparison, not a regional price offer. | | [FrugalGPT](https://arxiv.org/abs/2305.05176) |
| produc-40 | confirmed | “execute for up to one year while maintaining reliable progress despite interruptions” | | [Lambda durable functions](https://docs.aws.amazon.com/lambda/latest/dg/durable-functions.html) |
| produc-48 | contradicted | “The Evals dashboard and API are scheduled to shut down.” | Both dashboard and API shut down November 30, 2026; existing evals became read-only October 31. Migration guidance points to Promptfoo. | [OpenAI deprecations](https://developers.openai.com/api/docs/deprecations) |
| produc-58 | confirmed | Separately documents “Data-at-rest (storage)” and “ML processing (in-use)”. | | [Google data residency](https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/data-residency) |
| produc-69 | confirmed | “While both ensure valid JSON is produced, only Structured Outputs ensure schema adherence.” | | [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) |
| produc-80 | corrected | Tiered selection is presented as a best practice with desired outcomes, not a mandatory requirement. | AWS recommends matching tasks to the cheapest model providing acceptable quality, with confidence-based escalation. | [AGENTCOST02-BP01](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost02-bp01.html) |
| produc-81 | confirmed | “Semantic caching helps prevent redundant reasoning by serving cached responses for functionally equivalent tasks.” | | [AGENTCOST02-BP03](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost02-bp03.html) |
| produc-10 | confirmed | “Cache prefixes are created in the following order: tools, system, then messages.” | | [Claude prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) |
| produc-20 | confirmed | Mitigation headings include constraining behavior, validating expected output formats, and enforcing privilege control and least privilege access. | | [OWASP prompt injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) |
| produc-35 | confirmed | The table lists Input, Retrieval, Dialog, Execution, and Output rails. | | [NeMo rail types](https://docs.nvidia.com/nemo/guardrails/about-nemo-guardrails-library/rail-types) |
| produc-36 | confirmed | Recommends unique keys for creating/updating objects; the HTTP example uses `Idempotency-Key`. | | [Stripe idempotency](https://docs.stripe.com/api/idempotent_requests) |
| produc-39 | confirmed | “Every LLM call, tool execution, and routing decision is durably persisted.” | | [Restate durable agents](https://docs.restate.dev/ai/patterns/durable-agents) |
| produc-43 | confirmed | Both evaluation types are available “in one Vertex AI SDK query”. | | [Google agent evaluation](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/evaluation-agents) |
| produc-46 | confirmed | Describes capturing intermediate inputs/outputs and “latency and token usage at each step”. | | [MLflow tracing](https://mlflow.org/docs/latest/genai/tracing/) |
| produc-47 | confirmed | Counts customer confirmation or exiting without requesting further assistance after Fin’s last answer. | | [Fin outcomes](https://www.intercom.com/help/en/articles/8205718-fin-ai-agent-outcomes) |
| produc-51 | confirmed | “18 publicly available datasets from diverse text retrieval tasks and domains” | | [BEIR](https://arxiv.org/abs/2104.08663) |
| produc-52 | confirmed | Measures response consistency with retrieved context; explicitly states a 0–1 range. | | [RAGAS Faithfulness](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/faithfulness/) |

- These sources do **not** establish Alibaba Cloud International/Singapore availability or pricing. None of the checked claims establishes a China-only feature.
- Claude’s default pricing scope is **Global**, not Singapore-resident inference. US-only inference carries a 1.1× multiplier for applicable models; partner-operated platforms have separate regional pricing. [Claude pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- The Bedrock example uses a **Global cross-Region inference profile** through `us-west-2`; requests can route across Regions. Its 90% saving concerns cache hits, not guaranteed total workload savings. [Bedrock caching](https://aws.amazon.com/blogs/machine-learning/optimizing-cost-and-latency-with-amazon-bedrock-prompt-caching/)
- Google explicitly says global endpoints provide **no processing-location residency guarantee**, even when stored data remains in the selected location. [Data residency](https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/data-residency)
- As of November 2, OpenAI Evals is already in its stated read-only period; moving to its API is not the documented escape from shutdown. [Deprecations](https://developers.openai.com/api/docs/deprecations)
- MCP annotations are untrusted hints unless supplied by a trusted server; they do not enforce permissions or guarantee behavior. [MCP annotations](https://blog.modelcontextprotocol.io/posts/2026-03-16-tool-annotations/)
- OpenAI Batch trades immediate responses for a completion window of up to 24 hours. [Batch API](https://developers.openai.com/api/docs/guides/batch)
- RAGAS Faithfulness measures support from retrieved context, so a high score does not independently establish real-world factual accuracy. [Faithfulness](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/faithfulness/)

Codex session ID: 01a19b5b-1e5c-76a0-9a20-d91fb7b999ff
Resume in Codex: codex resume 01a19b5b-1e5c-76a0-9a20-d91fb7b999ff
