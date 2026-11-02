# Evaluation summary

Model qwen3.8-max (fallback qwen3.7-max), catalog 2026-10-31 (232 entries), system prompt 59906 chars (sha256 998fab223dab), 3 runs per case, started 2026-11-02T20:52:28.677Z.

## Overall

**pass@1 84%, all 3 runs pass 68%** (63 cases). pass@3 is best-of-3 and is listed last.

| measure | value |
| --- | ---: |
| cases / conversations / turns | 63 / 189 / 189 |
| pass@1 (mean case pass rate) | 84% |
| all runs pass | 68% |
| majority (over half the runs pass) | 87% |
| pass@3 (some run passes) | 97% |
| conversations passing every assertion | 84% |
| turns passing every assertion | 84% |
| assertions passing (3327 checks) | 99% |
| conversations that hit an API failure | 0 |
| list-price cost of the model runs | $1.73 |

## Workflow judge

| dimension | mean |
| --- | ---: |
| patternChoice | 4.492 |
| humanApproval | 4.587 |
| modelTierFit | 4.587 |
| productCorrectness | 4.159 |
| clarity | 4.429 |

## By mode

| mode | cases | runs | run pass |
| --- | ---: | ---: | ---: |
| workflow | 63 | 189 | 84% |

## By category

| category | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pattern | 32 | 96 | 90% | 75% | 94% | 100% |
| i18n | 20 | 60 | 72% | 50% | 75% | 90% |
| trap | 11 | 33 | 91% | 82% | 91% | 100% |

## By language

| language | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 43 | 129 | 90% | 77% | 93% | 100% |
| ko | 10 | 30 | 70% | 50% | 70% | 90% |
| zh | 10 | 30 | 73% | 50% | 80% | 90% |

## By assertion type (worst first)

| type | checks | passed | rate | cases that failed it |
| --- | ---: | ---: | ---: | ---: |
| whyLang | 60 | 58 | 97% | 2 |
| mention | 30 | 29 | 97% | 1 |
| workflow | 2232 | 2194 | 98% | 18 |
| noErrors | 189 | 188 | 100% | 1 |
| format | 189 | 189 | 100% | 0 |
| escapes | 189 | 189 | 100% | 0 |
| noPrices | 189 | 189 | 100% | 0 |
| sayLang | 189 | 189 | 100% | 0 |
| askLang | 60 | 60 | 100% | 0 |

## Cases below 100% (20 of 63)

| case | runs passed | what failed |
| --- | ---: | ---: |
| wf-ko-multilingual-marketing-localisation | 0/3 | workflow effect publish (3); workflow task approve (1); workflow automated loops have bounds and exits (1) |
| wf-zh-sales-prospect-research-outreach | 0/3 | workflow effect send (3) |
| wf-ko-claims-processing-extraction | 1/3 | workflow task approve (1); workflow effect pay (2); workflow every approval-needing effect gated on every path (1) |
| wf-ko-internal-policy-rag-assistant | 1/3 | workflow kind human (2); workflow task takeover (2) |
| wf-multilingual-document-localisation | 1/3 | workflow every approval-needing effect gated on every path (2) |
| wf-rule-phone | 1/3 | workflow automated loops have bounds and exits (1); workflow required checks clean (1) |
| wf-social-listening-review-analysis | 1/3 | workflow task classify (2) |
| wf-zh-claims-processing-extraction | 1/3 | workflow every approval-needing effect gated on every path (1); workflow no errors after repair (1); no error-level warnings after repair (1) |
| wf-ai-tutor-socratic-hint | 2/3 | workflow every approval-needing effect gated on every path (1) |
| wf-inbound-support-triage-and-draft | 2/3 | workflow task classify (1) |
| wf-inbound-voice-support-agent | 2/3 | workflow effect reply (1) |
| wf-invoice-three-way-match | 2/3 | workflow task extract (1) |
| wf-it-helpdesk-triage-and-remediation | 2/3 | workflow automated loops have bounds and exits (1) |
| wf-ko-kyc-customer-onboarding | 2/3 | workflow every approval-needing effect gated on every path (1) |
| wf-ko-meeting-notes-to-crm-update | 2/3 | why text in ko (1) |
| wf-rule-slack | 2/3 | mentions custom/FC webhook ingress/webhook into Function Compute (1) |
| wf-travel-itinerary-booking | 2/3 | workflow task plan (1) |
| wf-zh-internal-policy-rag-assistant | 2/3 | workflow kind human (1); workflow task takeover (1) |
| wf-zh-it-helpdesk-triage-and-remediation | 2/3 | workflow task classify (1) |
| wf-zh-multilingual-marketing-localisation | 2/3 | workflow kind human (1); workflow task approve (1); workflow effect publish (1) |

## Warnings before and after deterministic repair

| code | before: total | per turn | turns | after: total | per turn | fixed by repair |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| wf-bad-op | 73 | 0.386 | 54 | 35 | 0.185 | 0 |
| bad-op | 37 | 0.196 | 24 | 0 | 0 | 0 |
| wf-reply-guard | 27 | 0.143 | 25 | 26 | 0.138 | 0 |
| wf-mixed-out | 23 | 0.122 | 23 | 0 | 0 | 25 |
| wf-ai-mismatch | 22 | 0.116 | 18 | 18 | 0.095 | 0 |
| wf-unreachable | 20 | 0.106 | 7 | 8 | 0.042 | 0 |
| wf-approval | 10 | 0.053 | 8 | 9 | 0.048 | 0 |
| wf-attach-form | 9 | 0.048 | 5 | 0 | 0 | 8 |
| wf-dead-end | 7 | 0.037 | 7 | 14 | 0.074 | 0 |
| wf-decision-review | 5 | 0.026 | 4 | 5 | 0.026 | 0 |
| wf-dangling-ref | 3 | 0.016 | 3 | 0 | 0 | 3 |
| wf-cycle | 2 | 0.011 | 2 | 0 | 0 | 2 |
| wf-loop-exit | 1 | 0.005 | 1 | 3 | 0.016 | 0 |
| wf-trifecta | 1 | 0.005 | 1 | 1 | 0.005 | 0 |
| wf-no-trigger | 1 | 0.005 | 1 | 0 | 0 | 0 |
| wf-human-outcomes | 0 | 0 | 0 | 1 | 0.005 | 0 |

Severity before repair {"warn":121,"info":98,"error":22}, after {"warn":93,"info":19,"error":8}. Unknown products: 0 (none). Product strings that were not catalog ids: 0 (none).

## Latency (main stream)

| measure | n | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| first token (answering attempt) | 189 | 1.18 s | 1.73 s | 2.14 s |
| first token as waited for (failed attempts included) | 189 | 1.18 s | 1.73 s | 2.14 s |
| first say | 189 | 1.40 s | 2.02 s | 2.52 s |
| first op | 189 | 1.90 s | 2.49 s | 3.13 s |
| first node | 189 | 4.26 s | 6.13 s | 7.30 s |
| stream total (all turns) | 189 | 17.4 s | 24.2 s | 27.7 s |
| stream total, new diagrams | 189 | 17.4 s | 24.2 s | 27.7 s |
| stream total, edits | 0 | - | - | - |
| stream total, product answers | 0 | - | - | - |
| whole turn incl. retries and follow-up | 189 | 17.5 s | 24.8 s | 29.4 s |

## Tokens and cost

| measure | value |
| --- | ---: |
| prompt tokens | 1910731 |
| cached prompt tokens | 1796096 (94%) |
| completion tokens | 174534 |
| completion tokens per turn p50 / p95 | 910 / 1325 |
| cost per turn mean / p95 | $0.0091 / $0.0118 |
| cost per conversation mean / p95 | $0.0091 / $0.0118 |
| total | $1.73 |

## Reliability

| counter | value |
| --- | ---: |
| turns | 189 |
| main stream ended without done (truncated) | 0 |
| continuation turns | 0 |
| repair turns | 7 |
| hedged turns / hedge won | 0 / 0 |
| turns that used the fallback model | 0 |
| extra attempts after failures | 0 |
| conversations with an API failure | 0 |
| bad (unparseable) lines | 0 |
| \u escapes | 0 |

## Failover to the fallback model

0 of 189 turns (0%) failed over in the main stream; reasons {}. Follow-up turns that ran on another model: 0.

## Cut-off turns

Main streams that ended without done: 0 ({}). Rescued by the continuation turn: 0 (0 of them pass every assertion); not rescued: 0. Turn pass rate without the rescued turns: 84%.

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
| wf-mixed-out | 25 | 25 |
| wf-attach-form | 8 | 5 |
| wf-dangling-ref | 3 | 3 |
| wf-cycle | 2 | 2 |

LLM follow-up turns: 7 ({"repair":7}); turns by finding code {"wf-unreachable":7,"wf-bad-op":2,"wf-dead-end":2,"wf-attach-form":1,"wf-reply-guard":1,"wf-no-trigger":1,"wf-approval":1}.

| case | run | turn | kind | turn passes | findings |
| --- | ---: | ---: | ---: | ---: | ---: |
| wf-ko-meeting-notes-to-crm-update | 1 | 1 | repair | yes | wf-unreachable/error: '기존 딜 조회' (current-deal): Connect this step to a trigger. |
| wf-rule-trifecta | 1 | 1 | repair | yes | wf-unreachable/error: 'Load customer records' (load-records): Connect this step to a trigger. |
| wf-hr-resume-screening-and-scheduling | 2 | 1 | repair | yes | wf-unreachable/error: 'Retrieve job scoring rubric' (load-rubric): Connect this step to a trigger.; wf-unreachable/error: 'Rerank rubric sections' (rerank-rubric): Connect this step to a trigger. |
| wf-rule-trifecta | 2 | 1 | repair | yes | wf-unreachable/error: 'Read customer records' (fetch-crm): Connect this step to a trigger. |
| wf-zh-claims-processing-extraction | 2 | 1 | repair | no | wf-bad-op/warn: Invalid task on 'route-decide'; the field was dropped.; wf-bad-op/warn: Effect on 'route-decide' was dropped; only act, tool and memory steps carry effects.; wf-unreachable/error: '执行支付操作' (act-pay): Connect this step to a trigger.; wf-unreacha |
| wf-enterprise-knowledge-search | 3 | 1 | repair | yes | wf-attach-form/error: Link 'gap-found' touches an attached step; use its host instead.; wf-reply-guard/warn: 'Reply to employee' (deliver-answer): Guard untrusted input before replying and add an escalation route to a person.; wf-dead-end/warn: 'Check knowledg |
| wf-multilingual-document-localisation | 3 | 1 | repair | yes | wf-bad-op/warn: Invalid task on 'route'; the field was dropped.; wf-no-trigger/error: Add a trigger to start this workflow.; wf-unreachable/error: 'Assemble final documents' (assemble): Connect this step to a trigger.; wf-unreachable/error: 'Translation comple |

## Languages

| language | turns | completion tokens / turn | vs English twin | prompt tokens / turn | say in language | why in language | \u escapes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 129 | 889 | - | 10123 | 129/129 | 0/0 | 0 |
| ko | 30 | 1069 | - | 10069 | 30/30 | 28/30 | 0 |
| zh | 30 | 925 | - | 10094 | 30/30 | 30/30 | 0 |

## Multi-turn retention

| case | turns | retention checks passed per turn | run pass |
| --- | ---: | ---: | ---: |

## Judge (kimi-k3)

| measure | value |
| --- | ---: |
| runs judged / judge errors | 63 / 0 |
| completeness | 4.492 |
| accuracy | 4.159 |
| rationality | 4.825 |
| readability | 4.429 |
| overall | 4.476 |
| architect would sign off | 86% |
| judge cost | $0.689 |

| category | judged | overall score | sign-off |
| --- | ---: | ---: | ---: |
| pattern | 32 | 4.438 | 88% |
| i18n | 20 | 4.438 | 75% |
| trap | 11 | 4.659 | 100% |

Agreement between the judged run's assertions and the judge's sign-off: 50/63 (79%). Assertions pass and judge yes 47, both no 3, assertions pass but judge no 6, assertions fail but judge yes 7. Mean score of passing runs 4.495, failing runs 4.375, point-biserial r 0.119.

| case | assertions | judge | failed assertions | judge defects |
| --- | ---: | ---: | ---: | ---: |
| wf-ai-tutor-socratic-hint | pass | no |  | High-confidence path delivers hints directly to students without human approval after the final AI producer; while live chat replies may not need routine approval, the design should explicitly documen |
| wf-inbound-support-triage-and-draft | fail | yes | workflow task classify | Edit branch returns to draft-reply but the re-drafted content's path back through output-guard to approval is implied rather than explicit in edges; support-agent marked both untrusted and private wit |
| wf-internal-policy-rag-assistant | pass | no |  | Assumes AgentCore IM connector (DingTalk/Lark) while all processing runs on Function Compute; IM channels are documented for managed agents only, so ingress/egress product use is inconsistent.; Uses A |
| wf-ko-kyc-customer-onboarding | pass | no |  | auto-approve end node finalizes customer onboarding (a consequential decide) on the low-risk path with no human approval after assess-risk, the final content producer; verify-id agent declares tool we |
| wf-ko-multilingual-marketing-localisation | fail | yes | workflow effect publish |  |
| wf-kyc-customer-onboarding | pass | no |  | approve-onboard (effect: write, customer account approval) executes automatically on the low-risk path with no approval step; consequential onboarding decisions need approval on every path after the f |
| wf-multilingual-document-localisation | fail | yes | workflow every approval-needing effect gated on every path |  |
| wf-rule-phone | fail | yes | workflow automated loops have bounds and exits | ARTC is an interactive RTC SDK/service, not a documented SIP trunk terminator; the SIP-to-ARTC bridging assumption needs validation, though the carrier assumption partially covers this |
| wf-rule-slack | fail | yes | mentions custom/FC webhook ingress/webhook into Function Compute | DashVector has no documented VPC access, which is a mild exposure concern for a private internal KB |
| wf-social-listening-review-analysis | fail | yes | workflow task classify | Clustering reviews into themes is largely a deterministic extraction/grouping task; a bounded agent with 10 turns is defensible but a plain LLM classify-plus-group step on qwen3.7-plus would be simple |
| wf-zh-internal-policy-rag-assistant | pass | no |  | AgentCore IM channels (DingTalk/WeCom) are for managed agents only; the design runs all steps on FC and uses AgentCore merely as trigger/sender, which contradicts the managed-agent requirement.; DashV |
| wf-zh-kyc-customer-onboarding | pass | no |  | Low-risk path: onboard-ok (consequential write to business system) executes without human approval after final content producer; assess-risk is a decide node that makes consequential routing decisions |
| wf-zh-sales-prospect-research-outreach | fail | yes | workflow effect send | 缺少重试机制：参考要求'one research retry'，当前设计只有edit循环回researcher，没有明确的自动重试逻辑; enqueue节点标记approval:skip，虽然前面有人工审批，但严格来说这是write效果，应确保审批覆盖（当前设计已满足，但标记可能引起误解）; 未明确说明网络搜索工具的具体实现（MCP工具细节） |
