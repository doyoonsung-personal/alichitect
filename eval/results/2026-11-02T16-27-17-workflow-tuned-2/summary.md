# Evaluation summary

Model qwen3.8-max (fallback qwen3.7-max), catalog 2026-10-31 (232 entries), system prompt 59906 chars (sha256 998fab223dab), 3 runs per case, started 2026-11-02T16:27:17.537Z.

## Overall

**pass@1 88%, all 3 runs pass 74%** (43 cases). pass@3 is best-of-3 and is listed last.

| measure | value |
| --- | ---: |
| cases / conversations / turns | 43 / 129 / 129 |
| pass@1 (mean case pass rate) | 88% |
| all runs pass | 74% |
| majority (over half the runs pass) | 91% |
| pass@3 (some run passes) | 98% |
| conversations passing every assertion | 88% |
| turns passing every assertion | 88% |
| assertions passing (2169 checks) | 99% |
| conversations that hit an API failure | 0 |
| list-price cost of the model runs | $1.15 |

## Workflow judge

| dimension | mean |
| --- | ---: |
| patternChoice | 4.488 |
| humanApproval | 4.698 |
| modelTierFit | 4.605 |
| productCorrectness | 4.279 |
| clarity | 4.419 |

## By mode

| mode | cases | runs | run pass |
| --- | ---: | ---: | ---: |
| workflow | 43 | 129 | 88% |

## By category

| category | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pattern | 32 | 96 | 87% | 69% | 91% | 100% |
| trap | 11 | 33 | 91% | 91% | 91% | 91% |

## By language

| language | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 43 | 129 | 88% | 74% | 91% | 98% |

## By assertion type (worst first)

| type | checks | passed | rate | cases that failed it |
| --- | ---: | ---: | ---: | ---: |
| workflow | 1494 | 1478 | 99% | 11 |
| format | 129 | 128 | 99% | 1 |
| noErrors | 129 | 129 | 100% | 0 |
| escapes | 129 | 129 | 100% | 0 |
| noPrices | 129 | 129 | 100% | 0 |
| sayLang | 129 | 129 | 100% | 0 |
| mention | 30 | 30 | 100% | 0 |

## Cases below 100% (11 of 43)

| case | runs passed | what failed |
| --- | ---: | ---: |
| wf-rule-phone | 0/3 | NDJSON only, ends with done (1); workflow required checks clean (2) |
| wf-ecommerce-shopping-assistant | 1/3 | workflow every approval-needing effect gated on every path (2) |
| wf-multilingual-document-localisation | 1/3 | workflow every approval-needing effect gated on every path (2) |
| wf-rfp-security-questionnaire-answerer | 1/3 | workflow every approval-needing effect gated on every path (2) |
| wf-ai-tutor-socratic-hint | 2/3 | workflow every approval-needing effect gated on every path (1) |
| wf-code-review-pr-agent | 2/3 | workflow every approval-needing effect gated on every path (1) |
| wf-ecommerce-product-listing-enrichment | 2/3 | workflow task extract (1) |
| wf-enterprise-knowledge-search | 2/3 | workflow kind knowledge (1); workflow task generate (1) |
| wf-inbound-voice-support-agent | 2/3 | workflow task speak (1) |
| wf-kyc-customer-onboarding | 2/3 | workflow every approval-needing effect gated on every path (1) |
| wf-social-listening-review-analysis | 2/3 | workflow task classify (1) |

## Warnings before and after deterministic repair

| code | before: total | per turn | turns | after: total | per turn | fixed by repair |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| wf-reply-guard | 24 | 0.186 | 23 | 24 | 0.186 | 0 |
| bad-op | 22 | 0.171 | 19 | 0 | 0 | 0 |
| wf-unreachable | 21 | 0.163 | 6 | 0 | 0 | 0 |
| wf-mixed-out | 14 | 0.109 | 14 | 0 | 0 | 14 |
| wf-bad-op | 12 | 0.093 | 12 | 10 | 0.078 | 0 |
| wf-ai-mismatch | 10 | 0.078 | 10 | 10 | 0.078 | 0 |
| wf-approval | 10 | 0.078 | 9 | 10 | 0.078 | 0 |
| wf-dead-end | 9 | 0.07 | 7 | 6 | 0.047 | 0 |
| wf-decision-review | 6 | 0.047 | 4 | 6 | 0.047 | 0 |
| wf-attach-form | 3 | 0.023 | 2 | 0 | 0 | 3 |
| wf-dangling-ref | 3 | 0.023 | 3 | 0 | 0 | 3 |
| dangling-edge | 3 | 0.023 | 1 | 0 | 0 | 0 |
| wf-trifecta | 2 | 0.016 | 2 | 2 | 0.016 | 0 |
| bad-json | 1 | 0.008 | 1 | 1 | 0.008 | 0 |

Severity before repair {"warn":81,"info":38,"error":21}, after {"warn":57,"info":12}. Unknown products: 0 (none). Product strings that were not catalog ids: 0 (none).

## Latency (main stream)

| measure | n | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| first token (answering attempt) | 129 | 1.20 s | 2.00 s | 3.33 s |
| first token as waited for (failed attempts included) | 129 | 1.20 s | 2.00 s | 3.33 s |
| first say | 129 | 1.48 s | 2.30 s | 3.53 s |
| first op | 129 | 1.99 s | 3.02 s | 4.32 s |
| first node | 129 | 4.58 s | 7.16 s | 8.06 s |
| stream total (all turns) | 129 | 18.2 s | 26.6 s | 32.1 s |
| stream total, new diagrams | 129 | 18.2 s | 26.6 s | 32.1 s |
| stream total, edits | 0 | - | - | - |
| stream total, product answers | 0 | - | - | - |
| whole turn incl. retries and follow-up | 129 | 18.2 s | 26.6 s | 37.3 s |

## Tokens and cost

| measure | value |
| --- | ---: |
| prompt tokens | 1303929 |
| cached prompt tokens | 1219072 (94%) |
| completion tokens | 112335 |
| completion tokens per turn p50 / p95 | 871 / 1215 |
| cost per turn mean / p95 | $0.0089 / $0.0166 |
| cost per conversation mean / p95 | $0.0089 / $0.0166 |
| total | $1.15 |

## Reliability

| counter | value |
| --- | ---: |
| turns | 129 |
| main stream ended without done (truncated) | 0 |
| continuation turns | 0 |
| repair turns | 6 |
| hedged turns / hedge won | 0 / 0 |
| turns that used the fallback model | 0 |
| extra attempts after failures | 0 |
| conversations with an API failure | 0 |
| bad (unparseable) lines | 1 |
| \u escapes | 0 |

## Failover to the fallback model

0 of 129 turns (0%) failed over in the main stream; reasons {}. Follow-up turns that ran on another model: 0.

## Cut-off turns

Main streams that ended without done: 0 ({}). Rescued by the continuation turn: 0 (0 of them pass every assertion); not rescued: 0. Turn pass rate without the rescued turns: 88%.

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
| wf-mixed-out | 14 | 14 |
| wf-attach-form | 3 | 2 |
| wf-dangling-ref | 3 | 3 |

LLM follow-up turns: 6 ({"repair":6}); turns by finding code {"wf-unreachable":6,"wf-dead-end":3,"wf-bad-op":1,"dangling-edge":1}.

| case | run | turn | kind | turn passes | findings |
| --- | ---: | ---: | ---: | ---: | ---: |
| wf-insurance-claims-triage | 1 | 1 | repair | yes | wf-unreachable/error: 'Fetch policy terms' (check-policy): Connect this step to a trigger. |
| wf-internal-policy-rag-assistant | 2 | 1 | repair | yes | wf-unreachable/error: 'Escalated to HR' (end-escalated): Connect this step to a trigger.; wf-dead-end/warn: 'HR live agent takeover' (hr-takeover): Add an outgoing link or an end step. |
| wf-regulatory-change-monitoring | 2 | 1 | repair | yes | wf-unreachable/error: 'Daily run complete' (run-complete): Connect this step to a trigger. |
| wf-travel-itinerary-booking | 2 | 1 | repair | yes | wf-unreachable/error: 'Approve itinerary' (approve): Connect this step to a trigger.; wf-unreachable/error: 'Build itinerary' (assemble): Connect this step to a trigger.; wf-unreachable/error: 'Book travel' (book): Connect this step to a trigger.; wf-unreachab |
| wf-cross-border-document-compliance-check | 3 | 1 | repair | yes | wf-bad-op/warn: Step 'join-parsed' has an unknown kind.; dangling-edge/warn: Link 'invoice-join' was dropped because an endpoint never arrived.; dangling-edge/warn: Link 'packing-join' was dropped because an endpoint never arrived.; dangling-edge/warn: Link 'j |
| wf-insurance-claims-triage | 3 | 1 | repair | yes | wf-unreachable/error: 'Coverage confirmed' (covered): Connect this step to a trigger. |

## Languages

| language | turns | completion tokens / turn | vs English twin | prompt tokens / turn | say in language | why in language | \u escapes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 129 | 871 | - | 10108 | 129/129 | 0/0 | 0 |

## Multi-turn retention

| case | turns | retention checks passed per turn | run pass |
| --- | ---: | ---: | ---: |

## Judge (kimi-k3)

| measure | value |
| --- | ---: |
| runs judged / judge errors | 43 / 0 |
| completeness | 4.488 |
| accuracy | 4.279 |
| rationality | 4.907 |
| readability | 4.419 |
| overall | 4.523 |
| architect would sign off | 91% |
| judge cost | $0.457 |

| category | judged | overall score | sign-off |
| --- | ---: | ---: | ---: |
| pattern | 32 | 4.492 | 94% |
| trap | 11 | 4.614 | 82% |

Agreement between the judged run's assertions and the judge's sign-off: 39/43 (91%). Assertions pass and judge yes 38, both no 1, assertions pass but judge no 3, assertions fail but judge yes 1. Mean score of passing runs 4.537, failing runs 4.25, point-biserial r 0.165.

| case | assertions | judge | failed assertions | judge defects |
| --- | ---: | ---: | ---: | ---: |
| wf-ai-tutor-socratic-hint | pass | no |  | deliver (reply to student) on the 'Safe hint only' branch has no human approval or documented guard/escalation after guard-out; guardrail screening alone is asserted, not shown to cover answer leakage |
| wf-inbound-voice-support-agent | fail | yes | workflow task speak | No TTS model or product is specified for the 'Play spoken answer' step; the catalog facts list only an ASR model, leaving speech synthesis unsourced |
| wf-insurance-claims-triage | pass | no |  | coverage-to-denied edge sends model-determined denials straight to the denied end state with no human approval; denial must route through adjuster-review like settlement; No outbound customer notifica |
| wf-rule-agentrun-lowcode | pass | no |  | Support reply delivery lacks human approval step - outbound customer communication is consequential and requires approval after content generation; DashVector free trial cluster is released after 30 d |
