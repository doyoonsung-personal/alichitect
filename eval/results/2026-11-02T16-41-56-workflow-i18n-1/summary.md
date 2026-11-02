# Evaluation summary

Model qwen3.8-max (fallback qwen3.7-max), catalog 2026-10-31 (232 entries), system prompt 59906 chars (sha256 998fab223dab), 3 runs per case, started 2026-11-02T16:41:56.636Z.

## Overall

**pass@1 5%, all 3 runs pass 0%** (20 cases). pass@3 is best-of-3 and is listed last.

| measure | value |
| --- | ---: |
| cases / conversations / turns | 20 / 60 / 60 |
| pass@1 (mean case pass rate) | 5% |
| all runs pass | 0% |
| majority (over half the runs pass) | 5% |
| pass@3 (some run passes) | 10% |
| conversations passing every assertion | 5% |
| turns passing every assertion | 5% |
| assertions passing (1097 checks) | 90% |
| conversations that hit an API failure | 0 |
| list-price cost of the model runs | $0.53 |

## Workflow judge

| dimension | mean |
| --- | ---: |
| patternChoice | 4.3 |
| humanApproval | 4.55 |
| modelTierFit | 4.5 |
| productCorrectness | 4.1 |
| clarity | 4.15 |

## By mode

| mode | cases | runs | run pass |
| --- | ---: | ---: | ---: |
| workflow | 20 | 60 | 5% |

## By category

| category | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| i18n | 20 | 60 | 5% | 0% | 5% | 10% |

## By language

| language | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| ko | 10 | 30 | 10% | 0% | 10% | 20% |
| zh | 10 | 30 | 0% | 0% | 0% | 0% |

## By assertion type (worst first)

| type | checks | passed | rate | cases that failed it |
| --- | ---: | ---: | ---: | ---: |
| sayLang | 60 | 3 | 5% | 20 |
| askLang | 59 | 23 | 39% | 13 |
| workflow | 738 | 721 | 98% | 7 |
| noErrors | 60 | 60 | 100% | 0 |
| format | 60 | 60 | 100% | 0 |
| escapes | 60 | 60 | 100% | 0 |
| noPrices | 60 | 60 | 100% | 0 |

## Cases below 100% (20 of 20)

| case | runs passed | what failed |
| --- | ---: | ---: |
| wf-ko-claims-processing-extraction | 0/3 | say text in ko (3); workflow every approval-needing effect gated on every path (1) |
| wf-ko-invoice-three-way-match | 0/3 | workflow kind human (1); workflow task approve (1); say text in ko (3) |
| wf-ko-it-helpdesk-triage-and-remediation | 0/3 | say text in ko (3) |
| wf-ko-kyc-customer-onboarding | 0/3 | say text in ko (3); ask text in ko (3) |
| wf-ko-meeting-notes-to-crm-update | 0/3 | say text in ko (3) |
| wf-ko-multilingual-marketing-localisation | 0/3 | say text in ko (3); ask text in ko (3); workflow kind human (1) |
| wf-ko-sales-prospect-research-outreach | 0/3 | say text in ko (3) |
| wf-ko-whatsapp-line-chat-agent | 0/3 | say text in ko (3); ask text in ko (3) |
| wf-zh-claims-processing-extraction | 0/3 | say text in zh (3); ask text in zh (3) |
| wf-zh-internal-policy-rag-assistant | 0/3 | workflow kind human (3); workflow task takeover (3); say text in zh (3) |
| wf-zh-invoice-three-way-match | 0/3 | say text in zh (3); ask text in zh (3) |
| wf-zh-it-helpdesk-triage-and-remediation | 0/3 | say text in zh (3); ask text in zh (3) |
| wf-zh-kyc-customer-onboarding | 0/3 | say text in zh (3); ask text in zh (2) |
| wf-zh-meeting-notes-to-crm-update | 0/3 | say text in zh (3); ask text in zh (3) |
| wf-zh-multilingual-marketing-localisation | 0/3 | workflow every approval-needing effect gated on every path (1); say text in zh (3); ask text in zh (3) |
| wf-zh-sales-prospect-research-outreach | 0/3 | say text in zh (3); ask text in zh (3); workflow effect send (1) |
| wf-zh-support-email-triage | 0/3 | say text in zh (3); ask text in zh (1) |
| wf-zh-whatsapp-line-chat-agent | 0/3 | say text in zh (3); ask text in zh (3) |
| wf-ko-internal-policy-rag-assistant | 1/3 | workflow kind human (1); workflow task takeover (1); say text in ko (2) |
| wf-ko-support-email-triage | 2/3 | say text in ko (1) |

## Warnings before and after deterministic repair

| code | before: total | per turn | turns | after: total | per turn | fixed by repair |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| bad-op | 15 | 0.25 | 13 | 0 | 0 | 0 |
| wf-bad-op | 13 | 0.217 | 13 | 12 | 0.2 | 0 |
| wf-reply-guard | 8 | 0.133 | 8 | 8 | 0.133 | 0 |
| wf-mixed-out | 4 | 0.067 | 4 | 0 | 0 | 4 |
| wf-approval | 4 | 0.067 | 2 | 4 | 0.067 | 0 |
| wf-dead-end | 3 | 0.05 | 3 | 3 | 0.05 | 0 |
| wf-decision-review | 3 | 0.05 | 3 | 3 | 0.05 | 0 |
| wf-ai-mismatch | 1 | 0.017 | 1 | 1 | 0.017 | 0 |
| wf-trifecta | 1 | 0.017 | 1 | 1 | 0.017 | 0 |
| wf-dangling-ref | 1 | 0.017 | 1 | 0 | 0 | 1 |
| wf-unreachable | 1 | 0.017 | 1 | 0 | 0 | 0 |

Severity before repair {"warn":31,"info":22,"error":1}, after {"warn":27,"info":5}. Unknown products: 0 (none). Product strings that were not catalog ids: 0 (none).

## Latency (main stream)

| measure | n | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| first token (answering attempt) | 60 | 1.12 s | 1.97 s | 2.22 s |
| first token as waited for (failed attempts included) | 60 | 1.12 s | 1.97 s | 2.22 s |
| first say | 60 | 1.37 s | 2.23 s | 2.50 s |
| first op | 60 | 1.89 s | 2.82 s | 2.99 s |
| first node | 60 | 4.37 s | 6.27 s | 7.36 s |
| stream total (all turns) | 60 | 19.7 s | 26.3 s | 32.1 s |
| stream total, new diagrams | 60 | 19.7 s | 26.3 s | 32.1 s |
| stream total, edits | 0 | - | - | - |
| stream total, product answers | 0 | - | - | - |
| whole turn incl. retries and follow-up | 60 | 19.7 s | 26.3 s | 32.1 s |

## Tokens and cost

| measure | value |
| --- | ---: |
| prompt tokens | 585655 |
| cached prompt tokens | 562176 (96%) |
| completion tokens | 56315 |
| completion tokens per turn p50 / p95 | 908 / 1263 |
| cost per turn mean / p95 | $0.0088 / $0.0110 |
| cost per conversation mean / p95 | $0.0088 / $0.0110 |
| total | $0.53 |

## Reliability

| counter | value |
| --- | ---: |
| turns | 60 |
| main stream ended without done (truncated) | 0 |
| continuation turns | 0 |
| repair turns | 1 |
| hedged turns / hedge won | 0 / 0 |
| turns that used the fallback model | 0 |
| extra attempts after failures | 0 |
| conversations with an API failure | 0 |
| bad (unparseable) lines | 0 |
| \u escapes | 0 |

## Failover to the fallback model

0 of 60 turns (0%) failed over in the main stream; reasons {}. Follow-up turns that ran on another model: 0.

## Cut-off turns

Main streams that ended without done: 0 ({}). Rescued by the continuation turn: 0 (0 of them pass every assertion); not rescued: 0. Turn pass rate without the rescued turns: 5%.

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
| wf-mixed-out | 4 | 4 |
| wf-dangling-ref | 1 | 1 |

LLM follow-up turns: 1 ({"repair":1}); turns by finding code {"wf-unreachable":1}.

| case | run | turn | kind | turn passes | findings |
| --- | ---: | ---: | ---: | ---: | ---: |
| wf-ko-internal-policy-rag-assistant | 3 | 1 | repair | no | wf-unreachable/error: 'Answer refused' (end-refused): Connect this step to a trigger. |

## Languages

| language | turns | completion tokens / turn | vs English twin | prompt tokens / turn | say in language | why in language | \u escapes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| ko | 30 | 973 | - | 9962 | 3/30 | 0/0 | 0 |
| zh | 30 | 904 | - | 9560 | 0/30 | 0/0 | 0 |

## Multi-turn retention

| case | turns | retention checks passed per turn | run pass |
| --- | ---: | ---: | ---: |

## Judge (kimi-k3)

| measure | value |
| --- | ---: |
| runs judged / judge errors | 20 / 0 |
| completeness | 4.3 |
| accuracy | 4.1 |
| rationality | 4.8 |
| readability | 4.15 |
| overall | 4.338 |
| architect would sign off | 90% |
| judge cost | $0.239 |

| category | judged | overall score | sign-off |
| --- | ---: | ---: | ---: |
| i18n | 20 | 4.338 | 90% |

Agreement between the judged run's assertions and the judge's sign-off: 3/20 (15%). Assertions pass and judge yes 1, both no 2, assertions pass but judge no 0, assertions fail but judge yes 17. Mean score of passing runs 4.75, failing runs 4.316, point-biserial r 0.306.

| case | assertions | judge | failed assertions | judge defects |
| --- | ---: | ---: | ---: | ---: |
| wf-ko-claims-processing-extraction | fail | yes | say text in ko | Narration says 'Prompt chain pattern' but the graph is a routed workflow with retrieval and approval — mislabeled pattern; No OCR retry/failure path: ocr-img failure handling and the three-retry bound |
| wf-ko-invoice-three-way-match | fail | yes | workflow kind human; workflow task approve; say text in ko | Mismatch branch routes straight to 'failed' end with no notification or human review path, so finance is not alerted on reconciliation failures despite notify being labeled for manual review needs; gu |
| wf-ko-it-helpdesk-triage-and-remediation | fail | yes | say text in ko | Reply to requester after production fix lacks explicit guard/escalation for live chat scenarios, though email ticket context implies async reply is acceptable |
| wf-ko-meeting-notes-to-crm-update | fail | yes | say text in ko | Reference mentions a follow-up email with separate approval, but the design omits it; the ask as stated does not require it, so this is a minor gap vs guidance; Narration is in English rather than Kor |
| wf-ko-multilingual-marketing-localisation | fail | yes | say text in ko; ask text in ko | Edit loop from review back to draft-master could allow unbounded refinement cycles; the reference suggests at most three measured refinements per locale, but no iteration cap is modeled; qwen3.8-max f |
| wf-ko-sales-prospect-research-outreach | fail | yes | say text in ko | Research agent's web_search tool results are untrusted content that flows into draft-email without a second injection screen between research and drafting; review-email checks the draft, which mitigat |
| wf-ko-whatsapp-line-chat-agent | fail | yes | say text in ko; ask text in ko | Guard screens inbound only; the outbound reply is not shown passing through moderation before send, so the lethal-trifecta outbound content is not explicitly covered; Handoff path lacks any detail on  |
| wf-zh-claims-processing-extraction | fail | yes | say text in zh; ask text in zh | decide-route uses qwen3.8-flash for plan task; mid-tier qwen3.7-plus would better fit routing logic complexity; No explicit guard on outbound payment API calls beyond approval; payment system adapter  |
| wf-zh-internal-policy-rag-assistant | fail | yes | workflow kind human; workflow task takeover; say text in zh; ask text in zh | Refusal path drafts with qwen3.8-flash but has no output guard before the HR escalation/notify; low risk since it is an internal notify, but the refusal text shown to the employee is not explicitly de |
| wf-zh-invoice-three-way-match | fail | yes | say text in zh; ask text in zh | Narration/say text not in Chinese as required for a Chinese-language request.; Edge l-fetch-po goes extract->fetch-po but no edge from fetch-po into match; match only consumes fetch-receipt, so PO dat |
| wf-zh-it-helpdesk-triage-and-remediation | fail | yes | say text in zh; ask text in zh | Reply-with-resolution is an outbound notification carrying content derived from untrusted ticket input; it proceeds without approval on the sandbox-only path — acceptable as internal notify, but the d |
| wf-zh-kyc-customer-onboarding | fail | yes | say text in zh | The standard-risk path writes the customer record without human approval; while internal writes may not need default approval, onboarding approval is a consequential decide that arguably warrants revi |
| wf-zh-meeting-notes-to-crm-update | fail | yes | say text in zh; ask text in zh | Diff generation uses qwen3.8-flash (small) for a task that compares extracted updates against CRM state and produces the exact content a human approves; mid-tier would better fit this consequential su |
| wf-zh-multilingual-marketing-localisation | fail | yes | workflow every approval-needing effect gated on every path; say text in zh; ask text in zh | Edit loop from review back to translate is unbounded; the reference suggests at most three measured refinements per locale, but no iteration cap is modelled |
| wf-zh-sales-prospect-research-outreach | fail | yes | say text in zh; ask text in zh | Edit branch returns to research-agent, whose output re-passes output-guard and sales-approve, so coverage holds, but the graph does not show a retry/loop bound on edit cycles; Narration and labels are |
| wf-zh-support-email-triage | fail | yes | say text in zh |  |
| wf-zh-whatsapp-line-chat-agent | fail | yes | say text in zh; ask text in zh |  |
