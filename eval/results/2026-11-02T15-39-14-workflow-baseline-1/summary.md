# Evaluation summary

Model qwen3.8-max (fallback qwen3.7-max), catalog 2026-10-31 (232 entries), system prompt 59906 chars (sha256 998fab223dab), 1 runs per case, started 2026-11-02T15:39:14.025Z.

## Overall

**pass@1 0%, all 1 runs pass 0%** (43 cases). pass@1 is best-of-1 and is listed last.

| measure | value |
| --- | ---: |
| cases / conversations / turns | 43 / 43 / 43 |
| pass@1 (mean case pass rate) | 0% |
| all runs pass | 0% |
| majority (over half the runs pass) | 0% |
| pass@1 (some run passes) | 0% |
| conversations passing every assertion | 0% |
| turns passing every assertion | 0% |
| assertions passing (726 checks) | 92% |
| conversations that hit an API failure | 0 |
| list-price cost of the model runs | $0.38 |

## Workflow judge

| dimension | mean |
| --- | ---: |
| patternChoice | 4.372 |
| humanApproval | 4.628 |
| modelTierFit | 4.558 |
| productCorrectness | 3.86 |
| clarity | 4.279 |

## By mode

| mode | cases | runs | run pass |
| --- | ---: | ---: | ---: |
| workflow | 43 | 43 | 0% |

## By category

| category | cases | runs | run pass | all runs | majority | pass@1 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pattern | 32 | 32 | 0% | 0% | 0% | 0% |
| trap | 11 | 11 | 0% | 0% | 0% | 0% |

## By language

| language | cases | runs | run pass | all runs | majority | pass@1 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 43 | 43 | 0% | 0% | 0% | 0% |

## By assertion type (worst first)

| type | checks | passed | rate | cases that failed it |
| --- | ---: | ---: | ---: | ---: |
| mention | 10 | 7 | 70% | 3 |
| workflow | 501 | 444 | 89% | 43 |
| noErrors | 43 | 43 | 100% | 0 |
| format | 43 | 43 | 100% | 0 |
| escapes | 43 | 43 | 100% | 0 |
| noPrices | 43 | 43 | 100% | 0 |
| sayLang | 43 | 43 | 100% | 0 |

## Cases below 100% (43 of 43)

| case | runs passed | what failed |
| --- | ---: | ---: |
| wf-ai-tutor-socratic-hint | 0/1 | workflow products model-studio (1) |
| wf-claims-processing-extraction | 0/1 | workflow products model-studio (1) |
| wf-code-review-pr-agent | 0/1 | workflow task check (1); workflow products model-studio (1) |
| wf-contract-clause-review | 0/1 | workflow products model-studio (1) |
| wf-cross-border-document-compliance-check | 0/1 | workflow products model-studio (1) |
| wf-disruption-rebooking-agent | 0/1 | workflow products model-studio (1) |
| wf-ecommerce-product-listing-enrichment | 0/1 | workflow products model-studio (1) |
| wf-ecommerce-shopping-assistant | 0/1 | workflow products model-studio (1) |
| wf-employee-onboarding-helpdesk | 0/1 | workflow products model-studio (1) |
| wf-enterprise-knowledge-search | 0/1 | workflow kind end (1); workflow products model-studio (1) |
| wf-financial-report-analysis | 0/1 | workflow products model-studio (1) |
| wf-hr-resume-screening-and-scheduling | 0/1 | workflow products model-studio (1) |
| wf-inbound-support-triage-and-draft | 0/1 | workflow products model-studio (1) |
| wf-inbound-voice-support-agent | 0/1 | workflow task transcribe (1); workflow products model-studio (1) |
| wf-insurance-claims-triage | 0/1 | workflow products model-studio (1) |
| wf-internal-policy-rag-assistant | 0/1 | workflow kind human (1); workflow task takeover (1); workflow products model-studio (1) |
| wf-invoice-three-way-match | 0/1 | workflow products model-studio (1) |
| wf-it-helpdesk-triage-and-remediation | 0/1 | workflow products model-studio (1) |
| wf-kyc-customer-onboarding | 0/1 | workflow task extract (1); workflow products model-studio (1) |
| wf-meeting-notes-to-crm-update | 0/1 | workflow products model-studio (1) |
| wf-multilingual-document-localisation | 0/1 | workflow products model-studio (1) |
| wf-multilingual-marketing-localisation | 0/1 | workflow products model-studio (1) |
| wf-nl-to-sql-data-analysis | 0/1 | workflow products model-studio (1) |
| wf-regulatory-change-monitoring | 0/1 | workflow products model-studio (1) |
| wf-rfp-security-questionnaire-answerer | 0/1 | workflow products model-studio (1) |
| wf-rule-agentbay | 0/1 | workflow products model-studio (1); mentions gated/restricted/access/availability (1) |
| wf-rule-agentrun-lowcode | 0/1 | workflow products model-studio (1); mentions gated/restricted/not available/access (1) |
| wf-rule-automate | 0/1 | workflow products model-studio (1) |
| wf-rule-chat-reply | 0/1 | workflow products model-studio (1); workflow required checks clean (1) |
| wf-rule-email-send | 0/1 | workflow products model-studio (1) |
| wf-rule-email | 0/1 | workflow products model-studio (1) |
| wf-rule-knowledge-base | 0/1 | workflow products model-studio (1) |
| wf-rule-phone | 0/1 | workflow task transcribe (1); workflow task speak (1); workflow products model-studio (1) |
| wf-rule-slack | 0/1 | workflow products model-studio (1); workflow required checks clean (1) |
| wf-rule-trifecta | 0/1 | workflow products model-studio (1); mentions untrusted/injection/trifecta (1) |
| wf-rule-whatsapp | 0/1 | workflow products model-studio (1); workflow required checks clean (1) |
| wf-sales-prospect-research-outreach | 0/1 | workflow products model-studio (1) |
| wf-social-listening-review-analysis | 0/1 | workflow products model-studio (1); workflow every approval-needing effect gated on every path (1) |
| wf-sre-incident-triage-and-rca | 0/1 | workflow products model-studio (1) |
| wf-supply-chain-exception-handling | 0/1 | workflow products model-studio (1) |
| wf-support-email-triage | 0/1 | workflow products model-studio (1) |
| wf-travel-itinerary-booking | 0/1 | workflow products model-studio (1) |
| wf-whatsapp-line-chat-agent | 0/1 | workflow products model-studio (1); workflow every approval-needing effect gated on every path (1) |

## Warnings before and after deterministic repair

| code | before: total | per turn | turns | after: total | per turn | fixed by repair |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| wf-reply-guard | 23 | 0.535 | 16 | 23 | 0.535 | 0 |
| wf-decision-review | 18 | 0.419 | 13 | 18 | 0.419 | 0 |
| wf-dangling-ref | 16 | 0.372 | 6 | 0 | 0 | 16 |
| wf-ai-mismatch | 12 | 0.279 | 9 | 9 | 0.209 | 0 |
| bad-op | 11 | 0.256 | 7 | 0 | 0 | 0 |
| wf-unreachable | 9 | 0.209 | 2 | 0 | 0 | 0 |
| wf-bad-op | 7 | 0.163 | 7 | 5 | 0.116 | 0 |
| dangling-edge | 5 | 0.116 | 2 | 0 | 0 | 0 |
| wf-dead-end | 4 | 0.093 | 4 | 2 | 0.047 | 0 |
| wf-approval | 2 | 0.047 | 2 | 2 | 0.047 | 0 |
| wf-attach-form | 1 | 0.023 | 1 | 0 | 0 | 1 |
| wf-mixed-out | 1 | 0.023 | 1 | 0 | 0 | 1 |
| wf-trifecta | 1 | 0.023 | 1 | 1 | 0.023 | 0 |

Severity before repair {"info":57,"warn":44,"error":9}, after {"warn":33,"info":27}. Unknown products: 0 (none). Product strings that were not catalog ids: 0 (none).

## Latency (main stream)

| measure | n | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| first token (answering attempt) | 43 | 1.27 s | 1.99 s | 7.29 s |
| first token as waited for (failed attempts included) | 43 | 1.29 s | 6.82 s | 9.57 s |
| first say | 43 | 1.52 s | 2.27 s | 7.61 s |
| first op | 43 | 1.96 s | 3.21 s | 8.04 s |
| first node | 43 | 4.38 s | 6.62 s | 11.2 s |
| stream total (all turns) | 43 | 18.6 s | 23.4 s | 25.8 s |
| stream total, new diagrams | 43 | 18.6 s | 23.4 s | 25.8 s |
| stream total, edits | 0 | - | - | - |
| stream total, product answers | 0 | - | - | - |
| whole turn incl. retries and follow-up | 43 | 19.2 s | 25.8 s | 25.9 s |

## Tokens and cost

| measure | value |
| --- | ---: |
| prompt tokens | 376758 |
| cached prompt tokens | 350848 (93%) |
| completion tokens | 36388 |
| completion tokens per turn p50 / p95 | 891 / 1134 |
| cost per turn mean / p95 | $0.0089 / $0.0232 |
| cost per conversation mean / p95 | $0.0089 / $0.0232 |
| total | $0.38 |

## Reliability

| counter | value |
| --- | ---: |
| turns | 43 |
| main stream ended without done (truncated) | 0 |
| continuation turns | 0 |
| repair turns | 2 |
| hedged turns / hedge won | 0 / 0 |
| turns that used the fallback model | 2 |
| extra attempts after failures | 2 |
| conversations with an API failure | 0 |
| bad (unparseable) lines | 0 |
| \u escapes | 0 |

## Failover to the fallback model

2 of 43 turns (5%) failed over in the main stream; reasons {"first-byte-timeout":2}. Follow-up turns that ran on another model: 0.

| measure | n | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| stalled attempt before failover | 2 | 8.17 s | 8.24 s | 8.24 s |
| fallback first token | 2 | 1.18 s | 1.31 s | 1.32 s |
| first token as waited for | 2 | 9.35 s | 9.55 s | 9.57 s |
| whole turn | 2 | 20.7 s | 20.9 s | 20.9 s |

## Cut-off turns

Main streams that ended without done: 0 ({}). Rescued by the continuation turn: 0 (0 of them pass every assertion); not rescued: 0. Turn pass rate without the rescued turns: 0%.

## Constraint compliance (machine-checked)

| check | passed | rate |
| --- | ---: | ---: |
| residency (final graph and final narration, core checker) | 0/0 | - |
| pinned constraints as data (req regions / avoid) | 0/0 | - |
| avoided products absent (exclude and retained exclude) | 0/0 | - |

Residency checks with a warn-level foreign-region mention (not failed, reviewed by hand): 0. Residency checks where the product's repair turn corrected the main-stream narration: 0. Turns with pinned constraints in memory: 0. Product constraint findings before repair {}, left after repair {}.

## Repairs

| deterministic fix | fixes | turns |
| --- | ---: | ---: |
| wf-dangling-ref | 16 | 6 |
| wf-attach-form | 1 | 1 |
| wf-mixed-out | 1 | 1 |

LLM follow-up turns: 2 ({"repair":2}); turns by finding code {"wf-bad-op":2,"dangling-edge":2,"wf-unreachable":2,"wf-dead-end":2}.

| case | run | turn | kind | turn passes | findings |
| --- | ---: | ---: | ---: | ---: | ---: |
| wf-ecommerce-product-listing-enrichment | 1 | 1 | repair | no | wf-bad-op/warn: Step 'join-listings' has an unknown kind.; dangling-edge/warn: Link 'l-seo-join' was dropped because an endpoint never arrived.; dangling-edge/warn: Link 'l-join-approve' was dropped because an endpoint never arrived.; dangling-edge/warn: Link  |
| wf-multilingual-marketing-localisation | 1 | 1 | repair | no | wf-bad-op/warn: Step 'join' has an unknown kind.; dangling-edge/warn: Link 'trans-join' was dropped because an endpoint never arrived.; dangling-edge/warn: Link 'join-review' was dropped because an endpoint never arrived.; wf-unreachable/error: 'Campaign publi |

## Languages

| language | turns | completion tokens / turn | vs English twin | prompt tokens / turn | say in language | why in language | \u escapes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 43 | 846 | - | 8762 | 43/43 | 0/0 | 0 |

## Multi-turn retention

| case | turns | retention checks passed per turn | run pass |
| --- | ---: | ---: | ---: |

## Judge (kimi-k3)

| measure | value |
| --- | ---: |
| runs judged / judge errors | 43 / 0 |
| completeness | 4.372 |
| accuracy | 3.86 |
| rationality | 4.791 |
| readability | 4.279 |
| overall | 4.326 |
| architect would sign off | 79% |
| judge cost | $0.451 |

| category | judged | overall score | sign-off |
| --- | ---: | ---: | ---: |
| pattern | 32 | 4.281 | 78% |
| trap | 11 | 4.455 | 82% |

Agreement between the judged run's assertions and the judge's sign-off: 9/43 (21%). Assertions pass and judge yes 0, both no 9, assertions pass but judge no 0, assertions fail but judge yes 34. Mean score of passing runs -, failing runs 4.326, point-biserial r -.

| case | assertions | judge | failed assertions | judge defects |
| --- | ---: | ---: | ---: | ---: |
| wf-claims-processing-extraction | fail | yes | workflow products model-studio | OCR retry logic (max 3 attempts) from reference fixture not explicitly modeled in graph; Policy DB lookup uses MCP tool but could clarify if this is internal reversible read (no approval needed) vs ex |
| wf-code-review-pr-agent | fail | yes | workflow task check; workflow products model-studio | Lethal-trifecta adjacency: review-agent combines untrusted PR content, private repo access and outbound-capable MCP tools with approval:skip; mitigation relies entirely on the downstream human gate, s |
| wf-contract-clause-review | fail | yes | workflow products model-studio |  |
| wf-cross-border-document-compliance-check | fail | yes | workflow products model-studio | qwen3.8-max used for compliance-check is text-only per model facts, but receives parsed text so it is acceptable; however risk-flag could arguably reuse the check output rather than a separate small-m |
| wf-disruption-rebooking-agent | fail | yes | workflow products model-studio | Guard node has no failure/reject branch: guardrail detection errors or flagged content have no depicted path to rejection or safe termination; Untrusted flight data plus traveler private data plus out |
| wf-ecommerce-product-listing-enrichment | fail | yes | workflow products model-studio | extract node declares tool 'web_search_image' which is not a documented built-in tool for qwen3.7-plus (only web_search documented on qwen3.8-flash); the tool call would need a custom FC implementatio |
| wf-employee-onboarding-helpdesk | fail | yes | workflow products model-studio | Tablestore Knowledge Storage pricing is CNY reference only; Singapore rates need confirmation before cost estimates |
| wf-enterprise-knowledge-search | fail | yes | workflow kind end; workflow products model-studio | AgentCore trigger with AgentRun runtime is slightly inconsistent but workable; No explicit human escalation path for live chat, though guard is present |
| wf-financial-report-analysis | fail | yes | workflow products model-studio | Compute node is tagged task=generate with an ai model assigned though the actual work is deterministic code execution; minor labeling inconsistency but harmless since code_interpreter does the math; N |
| wf-hr-resume-screening-and-scheduling | fail | yes | workflow products model-studio | Decide node marked approval:required but has no human step; the only human gate is at approve, so the below-threshold rejection path executes a consequential decide without an actual approval mechanis |
| wf-inbound-support-triage-and-draft | fail | yes | workflow products model-studio | Approval covers the draft, but if the send payload is re-rendered or edited after approval, the actual outbound content could diverge; send should transmit exactly the approved draft; Guard node has n |
| wf-insurance-claims-triage | fail | yes | workflow products model-studio | extract-docs declares tool web_extractor on qwen3.7-plus, whose built-in tool support is not established per MODEL FACTS; Coverage determination is a consequential decide with no denial path: a not-co |
| wf-invoice-three-way-match | fail | yes | workflow products model-studio | Email webhook adapter not explicitly detailed; Approval for ERP write tool could be more explicit at call time |
| wf-meeting-notes-to-crm-update | fail | yes | workflow products model-studio | EventBridge trigger for audio upload is plausible but assumes an HTTP event source or OSS event wiring not spelled out |
| wf-multilingual-document-localisation | fail | yes | workflow products model-studio | No explicit guard mentioned for untrusted document content before processing; Auto-approve path bypasses human review entirely—acceptable for internal docs but should be noted as a boundary |
| wf-multilingual-marketing-localisation | fail | yes | workflow products model-studio | Edit loop re-enters translate without a visible bound on refinement iterations (reference suggests at most three measured refinements per locale); Master copy generation on AgentRun is heavier than ne |
| wf-regulatory-change-monitoring | fail | yes | workflow products model-studio | Tablestore used as vector index for policy retrieval is plausible (documented as AgentCore knowledge connector) but Singapore pricing is CNY-reference only and unconfirmed; Untrusted crawled content p |
| wf-rfp-security-questionnaire-answerer | fail | yes | workflow products model-studio | Final assembly happens after SME approval with no final human check on the assembled document before delivery; Assumes Tablestore Knowledge Storage in Singapore/Hong Kong but pricing confirmation flag |
| wf-rule-agentbay | fail | yes | workflow products model-studio; mentions gated/restricted/access/availability | Does not flag the need to confirm browser sandbox type availability per region in the console, as catalog notes per-type availability is set there; Assumption cites ap-southeast-1 availability but doe |
| wf-rule-automate | fail | yes | workflow products model-studio | Ticket update modeled as generic third-party-api rather than a concrete internal system, leaving the write target ambiguous; On-call channel assumed to be DingTalk-like but chatapp's documented channe |
| wf-rule-chat-reply | fail | yes | workflow products model-studio; workflow required checks clean | WebSocket assumption for chat channel not explicitly validated against FC capabilities, though custom webhook pattern is acceptable |
| wf-rule-email-send | fail | yes | workflow products model-studio | Lookup node is labeled runs:agentrun with ai/tool fields though it is a plain RDS read; minor labeling inconsistency, but AgentRun code runtime is internationally available so no correctness break |
| wf-rule-email | fail | yes | workflow products model-studio | Tablestore is used as the knowledge store; its Singapore/Hong Kong rates are CNY reference only, so international pricing should be confirmed before commit |
| wf-rule-knowledge-base | fail | yes | workflow products model-studio | The 'embed' node is labeled with product tablestore, but embedding is a Model Studio API call (text-embedding-v4); Tablestore stores vectors, it does not embed — product attribution is muddled.; No ex |
| wf-rule-slack | fail | yes | workflow products model-studio; workflow required checks clean | Tablestore as knowledge store: published rates are CNY reference only, Singapore pricing needs confirmation |
| wf-rule-trifecta | fail | yes | workflow products model-studio; mentions untrusted/injection/trifecta | Tablestore knowledge-base connector is documented for AgentCore, not AgentRun; design assumes Tablestore KB works with AgentRun (flagged as assumption cust-store but not fully resolved); Guard node la |
| wf-rule-whatsapp | fail | yes | workflow products model-studio; workflow required checks clean | lookup-order runs on agentrun but is a simple read tool; FC would suffice and avoid unnecessary runtime complexity; escalate-human uses agentcore, but AgentCore IM channels are DingTalk/Lark/WeCom onl |
| wf-sales-prospect-research-outreach | fail | yes | workflow products model-studio | Edit loop (rep-approve -> researcher) has no visible bound; a rep could cycle indefinitely, though each cycle still ends at approval so no unsafe send; Web search results are untrusted content fetched |
| wf-social-listening-review-analysis | fail | yes | workflow products model-studio; workflow every approval-needing effect gated on every path | Model tier could be smaller for routine extraction/classification if split, but single agent justifies large tier; No explicit guard on outbound reply content at post time (approval covers it, but let |
| wf-sre-incident-triage-and-rca | fail | yes | workflow products model-studio | CloudMonitor-to-EventBridge inbound path assumed via webhook without noting the exact CloudMonitor event source configuration (minor, flagged as assumption) |
| wf-supply-chain-exception-handling | fail | yes | workflow products model-studio | Supplier PDF content is untrusted but only the event payload passes through AI Guardrails; PDF text is not explicitly screened for prompt injection before the parse agent; Edit branch loops back to dr |
| wf-support-email-triage | fail | yes | workflow products model-studio | Edit loop from approve back to draft has no explicit revision cap in the graph (reference allows at most two revisions); relies on human reject to terminate; Tablestore used as knowledge store has onl |
| wf-travel-itinerary-booking | fail | yes | workflow products model-studio | Search nodes are marked as kind:tool but assigned ai:qwen3.7-plus; tool nodes should not have an AI model, or should be AI nodes with tool use; No explicit guard mentioned for handling untrusted conte |
| wf-whatsapp-line-chat-agent | fail | yes | workflow products model-studio; workflow every approval-needing effect gated on every path | Small-talk path bypasses check-stuck, so a stuck small-talk reply has no escalation route (minor, low risk); Human handoff mechanism is only an assumption (DingTalk/ticketing); the handoff node's actu |
