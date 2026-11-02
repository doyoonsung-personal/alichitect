# Evaluation summary

Model qwen3.8-max (fallback qwen3.7-max), catalog 2026-10-31 (232 entries), system prompt 59906 chars (sha256 998fab223dab), 3 runs per case, started 2026-11-02T16:50:56.541Z.

## Overall

**pass@1 73%, all 3 runs pass 60%** (20 cases). pass@3 is best-of-3 and is listed last.

| measure | value |
| --- | ---: |
| cases / conversations / turns | 20 / 60 / 60 |
| pass@1 (mean case pass rate) | 73% |
| all runs pass | 60% |
| majority (over half the runs pass) | 75% |
| pass@3 (some run passes) | 85% |
| conversations passing every assertion | 73% |
| turns passing every assertion | 73% |
| assertions passing (1097 checks) | 98% |
| conversations that hit an API failure | 0 |
| list-price cost of the model runs | $0.57 |

## Workflow judge

| dimension | mean |
| --- | ---: |
| patternChoice | 4.55 |
| humanApproval | 4.25 |
| modelTierFit | 4.8 |
| productCorrectness | 4.4 |
| clarity | 4.55 |

## By mode

| mode | cases | runs | run pass |
| --- | ---: | ---: | ---: |
| workflow | 20 | 60 | 73% |

## By category

| category | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| i18n | 20 | 60 | 73% | 60% | 75% | 85% |

## By language

| language | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| ko | 10 | 30 | 80% | 80% | 80% | 80% |
| zh | 10 | 30 | 67% | 40% | 70% | 90% |

## By assertion type (worst first)

| type | checks | passed | rate | cases that failed it |
| --- | ---: | ---: | ---: | ---: |
| workflow | 738 | 715 | 97% | 8 |
| noErrors | 60 | 60 | 100% | 0 |
| format | 60 | 60 | 100% | 0 |
| escapes | 60 | 60 | 100% | 0 |
| noPrices | 60 | 60 | 100% | 0 |
| sayLang | 60 | 60 | 100% | 0 |
| askLang | 59 | 59 | 100% | 0 |

## Cases below 100% (8 of 20)

| case | runs passed | what failed |
| --- | ---: | ---: |
| wf-ko-claims-processing-extraction | 0/3 | workflow effect pay (3); workflow every approval-needing effect gated on every path (1) |
| wf-ko-multilingual-marketing-localisation | 0/3 | workflow task approve (1); workflow effect publish (3) |
| wf-zh-sales-prospect-research-outreach | 0/3 | workflow effect send (3) |
| wf-zh-claims-processing-extraction | 1/3 | workflow every approval-needing effect gated on every path (2) |
| wf-zh-internal-policy-rag-assistant | 1/3 | workflow kind human (2); workflow task takeover (2) |
| wf-zh-it-helpdesk-triage-and-remediation | 2/3 | workflow task classify (1) |
| wf-zh-kyc-customer-onboarding | 2/3 | workflow every approval-needing effect gated on every path (1) |
| wf-zh-multilingual-marketing-localisation | 2/3 | workflow kind human (1); workflow task approve (1); workflow effect publish (1) |

## Warnings before and after deterministic repair

| code | before: total | per turn | turns | after: total | per turn | fixed by repair |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| wf-bad-op | 17 | 0.283 | 17 | 17 | 0.283 | 0 |
| wf-decision-review | 6 | 0.1 | 5 | 6 | 0.1 | 0 |
| wf-approval | 6 | 0.1 | 5 | 6 | 0.1 | 0 |
| wf-ai-mismatch | 5 | 0.083 | 4 | 4 | 0.067 | 0 |
| wf-dangling-ref | 4 | 0.067 | 4 | 0 | 0 | 4 |
| wf-reply-guard | 4 | 0.067 | 4 | 4 | 0.067 | 0 |
| wf-dead-end | 4 | 0.067 | 4 | 5 | 0.083 | 0 |
| wf-mixed-out | 2 | 0.033 | 2 | 0 | 0 | 2 |
| wf-attach-form | 1 | 0.017 | 1 | 0 | 0 | 1 |

Severity before repair {"warn":33,"info":16}, after {"warn":31,"info":11}. Unknown products: 0 (none). Product strings that were not catalog ids: 0 (none).

## Latency (main stream)

| measure | n | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| first token (answering attempt) | 60 | 1.26 s | 1.86 s | 2.21 s |
| first token as waited for (failed attempts included) | 60 | 1.26 s | 1.86 s | 2.21 s |
| first say | 60 | 1.50 s | 2.14 s | 2.40 s |
| first op | 60 | 2.11 s | 2.82 s | 2.98 s |
| first node | 60 | 4.94 s | 6.93 s | 8.03 s |
| stream total (all turns) | 60 | 19.6 s | 27.2 s | 30.5 s |
| stream total, new diagrams | 60 | 19.6 s | 27.2 s | 30.5 s |
| stream total, edits | 0 | - | - | - |
| stream total, product answers | 0 | - | - | - |
| whole turn incl. retries and follow-up | 60 | 19.6 s | 27.2 s | 30.5 s |

## Tokens and cost

| measure | value |
| --- | ---: |
| prompt tokens | 577419 |
| cached prompt tokens | 547328 (95%) |
| completion tokens | 61668 |
| completion tokens per turn p50 / p95 | 973 / 1381 |
| cost per turn mean / p95 | $0.0095 / $0.0115 |
| cost per conversation mean / p95 | $0.0095 / $0.0115 |
| total | $0.57 |

## Reliability

| counter | value |
| --- | ---: |
| turns | 60 |
| main stream ended without done (truncated) | 0 |
| continuation turns | 0 |
| repair turns | 0 |
| hedged turns / hedge won | 0 / 0 |
| turns that used the fallback model | 0 |
| extra attempts after failures | 0 |
| conversations with an API failure | 0 |
| bad (unparseable) lines | 0 |
| \u escapes | 0 |

## Failover to the fallback model

0 of 60 turns (0%) failed over in the main stream; reasons {}. Follow-up turns that ran on another model: 0.

## Cut-off turns

Main streams that ended without done: 0 ({}). Rescued by the continuation turn: 0 (0 of them pass every assertion); not rescued: 0. Turn pass rate without the rescued turns: 73%.

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
| wf-dangling-ref | 4 | 4 |
| wf-mixed-out | 2 | 2 |
| wf-attach-form | 1 | 1 |

LLM follow-up turns: 0 ({}); turns by finding code {}.

## Languages

| language | turns | completion tokens / turn | vs English twin | prompt tokens / turn | say in language | why in language | \u escapes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| ko | 30 | 1060 | - | 9628 | 30/30 | 0/0 | 0 |
| zh | 30 | 995 | - | 9619 | 30/30 | 0/0 | 0 |

## Multi-turn retention

| case | turns | retention checks passed per turn | run pass |
| --- | ---: | ---: | ---: |

## Judge (kimi-k3)

| measure | value |
| --- | ---: |
| runs judged / judge errors | 20 / 0 |
| completeness | 4.55 |
| accuracy | 4.4 |
| rationality | 4.7 |
| readability | 4.55 |
| overall | 4.55 |
| architect would sign off | 80% |
| judge cost | $0.228 |

| category | judged | overall score | sign-off |
| --- | ---: | ---: | ---: |
| i18n | 20 | 4.55 | 80% |

Agreement between the judged run's assertions and the judge's sign-off: 13/20 (65%). Assertions pass and judge yes 11, both no 2, assertions pass but judge no 2, assertions fail but judge yes 5. Mean score of passing runs 4.635, failing runs 4.393, point-biserial r 0.241.

| case | assertions | judge | failed assertions | judge defects |
| --- | ---: | ---: | ---: | ---: |
| wf-ko-multilingual-marketing-localisation | fail | yes | workflow task approve; workflow effect publish |  |
| wf-ko-whatsapp-line-chat-agent | pass | no |  | Narration references 'AgentCore 채널' for human handoff, a product not in the catalog and inconsistent with the accompanying question that says AgentCore is not a native connector.; Handoff node has no  |
| wf-zh-internal-policy-rag-assistant | fail | yes | workflow kind human; workflow task takeover | escalate-hr marked approval:skip but is a notify effect to HR, which is acceptable as internal reversible notify; No explicit retry loop for retrieval before refusal, though check-evidence gate provid |
| wf-zh-it-helpdesk-triage-and-remediation | fail | yes | workflow task classify | 沙箱执行修复节点标记为approval:skip，虽然沙箱环境相对安全，但作为写操作仍建议记录审计日志; 未明确说明知识库检索结果是否包含敏感信息，以及AI Guardrails是否覆盖输出内容检测; 缺少对工单分类结果的置信度阈值设置，低置信度分类应转人工处理 |
| wf-zh-kyc-customer-onboarding | pass | no |  | auto-approve节点标记approval:skip但effect:write，低风险路径在最终内容生产者后缺少人工审批门控; risk-decide的decide effect直接影响后续auto-approve写入，该决策点本身需要审批或置于审批后; verify-id和sanction-screen标记private:true处理敏感KYC数据，但未明确数据驻留和跨境传输控制 |
| wf-zh-multilingual-marketing-localisation | fail | yes | workflow kind human; workflow task approve; workflow effect publish; workflow every approval-needing effect gated on every path |  |
| wf-zh-sales-prospect-research-outreach | fail | yes | workflow effect send | Lethal trifecta is partially mitigated: researcher combines untrusted web_search with private CRM data, and guard sits between researcher and review, but there is no explicit guard or injection screen |
