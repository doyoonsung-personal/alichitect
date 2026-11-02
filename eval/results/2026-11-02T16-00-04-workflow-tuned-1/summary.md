# Evaluation summary

Model qwen3.8-max (fallback qwen3.7-max), catalog 2026-10-31 (232 entries), system prompt 59906 chars (sha256 998fab223dab), 3 runs per case, started 2026-11-02T16:00:04.159Z.

## Overall

**pass@1 72%, all 3 runs pass 51%** (43 cases). pass@3 is best-of-3 and is listed last.

| measure | value |
| --- | ---: |
| cases / conversations / turns | 43 / 129 / 129 |
| pass@1 (mean case pass rate) | 72% |
| all runs pass | 51% |
| majority (over half the runs pass) | 77% |
| pass@3 (some run passes) | 88% |
| conversations passing every assertion | 72% |
| turns passing every assertion | 72% |
| assertions passing (2175 checks) | 98% |
| conversations that hit an API failure | 0 |
| list-price cost of the model runs | $1.07 |

## Workflow judge

| dimension | mean |
| --- | ---: |
| patternChoice | 4.442 |
| humanApproval | 4.558 |
| modelTierFit | 4.628 |
| productCorrectness | 4.14 |
| clarity | 4.279 |

## By mode

| mode | cases | runs | run pass |
| --- | ---: | ---: | ---: |
| workflow | 43 | 129 | 72% |

## By category

| category | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pattern | 32 | 96 | 75% | 53% | 81% | 91% |
| trap | 11 | 33 | 64% | 46% | 64% | 82% |

## By language

| language | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 43 | 129 | 72% | 51% | 77% | 88% |

## By assertion type (worst first)

| type | checks | passed | rate | cases that failed it |
| --- | ---: | ---: | ---: | ---: |
| mention | 30 | 20 | 67% | 4 |
| workflow | 1500 | 1458 | 97% | 18 |
| noErrors | 129 | 129 | 100% | 0 |
| format | 129 | 129 | 100% | 0 |
| escapes | 129 | 129 | 100% | 0 |
| noPrices | 129 | 129 | 100% | 0 |
| sayLang | 129 | 129 | 100% | 0 |

## Cases below 100% (21 of 43)

| case | runs passed | what failed |
| --- | ---: | ---: |
| wf-inbound-voice-support-agent | 0/3 | workflow effect reply (2); workflow kind human (2); workflow task takeover (2) |
| wf-internal-policy-rag-assistant | 0/3 | workflow kind human (3); workflow task takeover (3) |
| wf-rfp-security-questionnaire-answerer | 0/3 | workflow every approval-needing effect gated on every path (1); workflow loops have bounds and exits (3) |
| wf-rule-phone | 0/3 | workflow effect reply (2); mentions ccaas/telephony/partner (3); workflow task takeover (2) |
| wf-rule-trifecta | 0/3 | mentions untrusted/injection/trifecta/guarded drafting/screen combined output/data leak (3) |
| wf-invoice-three-way-match | 1/3 | workflow task extract (1); workflow effect write (1) |
| wf-it-helpdesk-triage-and-remediation | 1/3 | workflow loops have bounds and exits (1); workflow every approval-needing effect gated on every path (1) |
| wf-rule-agentbay | 1/3 | mentions gated/restricted/access/availability/unavailable/not available/closed to new customers/not offered (2) |
| wf-rule-slack | 1/3 | mentions custom (2) |
| wf-supply-chain-exception-handling | 1/3 | workflow task extract (1); workflow loops have bounds and exits (1) |
| wf-ai-tutor-socratic-hint | 2/3 | workflow every approval-needing effect gated on every path (1) |
| wf-code-review-pr-agent | 2/3 | workflow every approval-needing effect gated on every path (1) |
| wf-ecommerce-product-listing-enrichment | 2/3 | workflow task translate (1) |
| wf-ecommerce-shopping-assistant | 2/3 | workflow effect pay (1) |
| wf-enterprise-knowledge-search | 2/3 | workflow task generate (1) |
| wf-kyc-customer-onboarding | 2/3 | workflow every approval-needing effect gated on every path (1) |
| wf-multilingual-document-localisation | 2/3 | workflow every approval-needing effect gated on every path (1) |
| wf-regulatory-change-monitoring | 2/3 | workflow every approval-needing effect gated on every path (1) |
| wf-rule-knowledge-base | 2/3 | workflow kind end (1) |
| wf-rule-whatsapp | 2/3 | workflow required checks clean (1) |
| wf-social-listening-review-analysis | 2/3 | workflow every approval-needing effect gated on every path (1) |

## Warnings before and after deterministic repair

| code | before: total | per turn | turns | after: total | per turn | fixed by repair |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| wf-reply-guard | 33 | 0.256 | 26 | 33 | 0.256 | 0 |
| bad-op | 32 | 0.248 | 24 | 0 | 0 | 0 |
| wf-mixed-out | 20 | 0.155 | 16 | 0 | 0 | 25 |
| wf-bad-op | 19 | 0.147 | 18 | 13 | 0.101 | 0 |
| wf-ai-mismatch | 16 | 0.124 | 14 | 15 | 0.116 | 0 |
| wf-approval | 13 | 0.101 | 13 | 12 | 0.093 | 0 |
| wf-attach-form | 11 | 0.085 | 9 | 0 | 0 | 11 |
| wf-unreachable | 6 | 0.047 | 5 | 0 | 0 | 0 |
| wf-dead-end | 5 | 0.039 | 5 | 15 | 0.116 | 0 |
| wf-decision-review | 5 | 0.039 | 5 | 5 | 0.039 | 0 |
| wf-loop-exit | 4 | 0.031 | 4 | 5 | 0.039 | 0 |
| wf-dangling-ref | 4 | 0.031 | 4 | 0 | 0 | 4 |
| wf-unknown-ref | 3 | 0.023 | 2 | 3 | 0.023 | 0 |
| dangling-edge | 3 | 0.023 | 1 | 0 | 0 | 0 |
| wf-act-effect | 1 | 0.008 | 1 | 1 | 0.008 | 0 |
| wf-human-outcomes | 1 | 0.008 | 1 | 0 | 0 | 0 |
| wf-cycle | 1 | 0.008 | 1 | 0 | 0 | 1 |

Severity before repair {"warn":116,"info":55,"error":6}, after {"warn":87,"info":15}. Unknown products: 0 (none). Product strings that were not catalog ids: 0 (none).

## Latency (main stream)

| measure | n | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| first token (answering attempt) | 129 | 1.18 s | 1.92 s | 2.24 s |
| first token as waited for (failed attempts included) | 129 | 1.18 s | 1.92 s | 2.24 s |
| first say | 129 | 1.45 s | 2.19 s | 3.37 s |
| first op | 129 | 1.96 s | 2.85 s | 3.87 s |
| first node | 129 | 4.50 s | 6.72 s | 7.99 s |
| stream total (all turns) | 129 | 19.7 s | 28.0 s | 33.3 s |
| stream total, new diagrams | 129 | 19.7 s | 28.0 s | 33.3 s |
| stream total, edits | 0 | - | - | - |
| stream total, product answers | 0 | - | - | - |
| whole turn incl. retries and follow-up | 129 | 19.7 s | 28.2 s | 36.1 s |

## Tokens and cost

| measure | value |
| --- | ---: |
| prompt tokens | 1205063 |
| cached prompt tokens | 1158656 (96%) |
| completion tokens | 114173 |
| completion tokens per turn p50 / p95 | 871 / 1291 |
| cost per turn mean / p95 | $0.0083 / $0.0120 |
| cost per conversation mean / p95 | $0.0083 / $0.0120 |
| total | $1.07 |

## Reliability

| counter | value |
| --- | ---: |
| turns | 129 |
| main stream ended without done (truncated) | 0 |
| continuation turns | 0 |
| repair turns | 5 |
| hedged turns / hedge won | 0 / 0 |
| turns that used the fallback model | 0 |
| extra attempts after failures | 0 |
| conversations with an API failure | 0 |
| bad (unparseable) lines | 0 |
| \u escapes | 0 |

## Failover to the fallback model

0 of 129 turns (0%) failed over in the main stream; reasons {}. Follow-up turns that ran on another model: 0.

## Cut-off turns

Main streams that ended without done: 0 ({}). Rescued by the continuation turn: 0 (0 of them pass every assertion); not rescued: 0. Turn pass rate without the rescued turns: 72%.

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
| wf-mixed-out | 25 | 21 |
| wf-attach-form | 11 | 9 |
| wf-dangling-ref | 4 | 4 |
| wf-cycle | 1 | 1 |

LLM follow-up turns: 5 ({"repair":5}); turns by finding code {"wf-unreachable":5,"wf-bad-op":3,"wf-dead-end":1,"dangling-edge":1,"wf-approval":1,"wf-human-outcomes":1,"wf-loop-exit":1}.

| case | run | turn | kind | turn passes | findings |
| --- | ---: | ---: | ---: | ---: | ---: |
| wf-disruption-rebooking-agent | 1 | 1 | repair | yes | wf-dead-end/warn: 'Draft rebooking proposal' (draft-proposal): Add an outgoing link or an end step.; wf-unreachable/error: 'No disruption found' (end-no-issue): Connect this step to a trigger. |
| wf-regulatory-change-monitoring | 1 | 1 | repair | yes | wf-unreachable/error: 'Daily run complete' (done-all): Connect this step to a trigger. |
| wf-insurance-claims-triage | 3 | 1 | repair | yes | wf-bad-op/warn: Invalid task on 'decide'; the field was dropped.; wf-unreachable/error: 'Returned for revision' (edit): Connect this step to a trigger. |
| wf-kyc-customer-onboarding | 3 | 1 | repair | yes | wf-bad-op/warn: Invalid task on 'risk-decision'; the field was dropped.; wf-unreachable/error: 'Pending compliance decision' (end-pending): Connect this step to a trigger. |
| wf-rfp-security-questionnaire-answerer | 3 | 1 | repair | no | wf-bad-op/warn: Step 'join' has an unknown kind.; dangling-edge/warn: Link 'l-halluc-join' was dropped because an endpoint never arrived.; dangling-edge/warn: Link 'l-sme-join' was dropped because an endpoint never arrived.; dangling-edge/warn: Link 'l-join-as |

## Languages

| language | turns | completion tokens / turn | vs English twin | prompt tokens / turn | say in language | why in language | \u escapes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 129 | 885 | - | 9342 | 129/129 | 0/0 | 0 |

## Multi-turn retention

| case | turns | retention checks passed per turn | run pass |
| --- | ---: | ---: | ---: |

## Judge (kimi-k3)

| measure | value |
| --- | ---: |
| runs judged / judge errors | 43 / 0 |
| completeness | 4.442 |
| accuracy | 4.14 |
| rationality | 4.884 |
| readability | 4.279 |
| overall | 4.436 |
| architect would sign off | 81% |
| judge cost | $0.454 |

| category | judged | overall score | sign-off |
| --- | ---: | ---: | ---: |
| pattern | 32 | 4.375 | 78% |
| trap | 11 | 4.614 | 91% |

Agreement between the judged run's assertions and the judge's sign-off: 31/43 (72%). Assertions pass and judge yes 27, both no 4, assertions pass but judge no 4, assertions fail but judge yes 8. Mean score of passing runs 4.532, failing runs 4.188, point-biserial r 0.409.

| case | assertions | judge | failed assertions | judge defects |
| --- | ---: | ---: | ---: | ---: |
| wf-ai-tutor-socratic-hint | pass | no |  | flag-review sits after reply: the graph always sends the hint to the student first (l-guard-reply -> l-reply) and only then flags the teacher, so approval does not gate the consequential outbound effe |
| wf-code-review-pr-agent | pass | no |  | post-comments publishes AI-generated review comments to the VCS with approval=skip; as a publish/send effect after the final content producer (filter-noise) on the main path, it requires human approva |
| wf-ecommerce-shopping-assistant | fail | yes | workflow effect pay | Guard screens only inbound messages; outbound reply content is not screened for data leaks before sending, a minor gap given catalog data is low-sensitivity; Approval subject is 'recommend' but the co |
| wf-enterprise-knowledge-search | pass | no |  | AgentCore's IM channel support is limited to DingTalk, Lark, and WeCom; other chat apps require Chat App Message Service or custom webhook, which is not addressed.; The flag-gap notification skips app |
| wf-internal-policy-rag-assistant | fail | yes | workflow kind human; workflow task takeover | Escalate-to-HR path bypasses guard-out; if the escalation message carries employee content or draft text to HR it is unscreened, though as an internal notify this is low risk.; Reference calls for one |
| wf-invoice-three-way-match | fail | yes | workflow task extract | Post-approval ERP write node runs on agentrun with approval:skip; acceptable since approval precedes it, but the write tool should be scoped so only the approved payload is posted; No explicit handlin |
| wf-it-helpdesk-triage-and-remediation | fail | yes | workflow loops have bounds and exits | Sandbox-fix runs on AgentRun while plan/classify run on FC with no stated orchestrator; the runtime split and state handoff are not explained.; Reply content after the production path is not itself re |
| wf-nl-to-sql-data-analysis | pass | no |  | Narration references DMS Data Agent, which is not in the supplied catalog facts; Narration says approval before showing results, but graph approves before execution and shows SQL first — mismatch; App |
| wf-rfp-security-questionnaire-answerer | fail | yes | workflow every approval-needing effect gated on every path; workflow loops have bounds and exits | parse-rfp agent has turns:10 which is somewhat high for a parsing task, though still bounded |
| wf-rule-agentbay | fail | yes | mentions gated/restricted/access/availability/unavailable/not available/closed to new customers/not offered | Browser sandbox availability in Singapore region should be confirmed in console per catalog facts; Assumption mentions 'Agent Sandbox Flash Edition' which is not in catalog facts |
| wf-rule-trifecta | fail | yes | mentions untrusted/injection/trifecta/guarded drafting/screen combined output/data leak | Edit loop (approve -> researcher) re-enters the agent but the revised draft still passes through guard and approve again, which is correct, though not explicitly narrated; Guard node has no specified  |
| wf-social-listening-review-analysis | fail | yes | workflow every approval-needing effect gated on every path | No explicit state persistence for multi-turn or daily check-ins as hinted in reference; Missing dead-letter or retry path for guardrail or posting failures; Assumption of GitHub PR without confirming  |
