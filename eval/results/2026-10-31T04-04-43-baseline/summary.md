# Evaluation summary

Model qwen3.8-max (fallback qwen3.7-max), catalog 2026-10-31 (223 entries), system prompt 42079 chars (sha256 a19383a1a4c6), 3 runs per case, started 2026-10-31T04:04:43.006Z.

## Overall

| measure | value |
| --- | ---: |
| cases / conversations / turns | 80 / 240 / 309 |
| pass@1 (mean case pass rate) | 84% |
| pass@3 (some run passes) | 88% |
| majority (over half the runs pass) | 88% |
| all runs pass | 78% |
| conversations passing every assertion | 84% |
| turns passing every assertion | 86% |
| assertions passing (3177 checks) | 98% |
| conversations that hit an API failure | 0 |
| list-price cost of the model runs | $2.27 |

## By category

| category | cases | runs | run pass | pass@3 | majority | all runs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pattern | 13 | 39 | 90% | 92% | 92% | 85% |
| need | 13 | 39 | 85% | 92% | 92% | 69% |
| trap | 16 | 48 | 98% | 100% | 100% | 94% |
| edit | 9 | 27 | 89% | 89% | 89% | 89% |
| multiturn | 6 | 18 | 33% | 33% | 33% | 33% |
| adversarial | 5 | 15 | 100% | 100% | 100% | 100% |
| i18n | 18 | 54 | 78% | 83% | 83% | 67% |

## By language

| language | cases | runs | run pass | pass@3 | majority | all runs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 62 | 186 | 86% | 89% | 89% | 81% |
| ko | 9 | 27 | 85% | 89% | 89% | 78% |
| zh | 9 | 27 | 70% | 78% | 78% | 56% |

## By assertion type (worst first)

| type | checks | passed | rate | cases that failed it |
| --- | ---: | ---: | ---: | ---: |
| question | 3 | 1 | 33% | 1 |
| mention | 15 | 12 | 80% | 1 |
| retention | 126 | 114 | 91% | 2 |
| whyLang | 62 | 58 | 94% | 2 |
| attachValid | 309 | 295 | 96% | 6 |
| exclude | 132 | 127 | 96% | 3 |
| primaryRec | 54 | 52 | 96% | 2 |
| size | 120 | 118 | 98% | 2 |
| pathOrder | 235 | 232 | 99% | 1 |
| sayLang | 309 | 307 | 99% | 1 |
| include | 357 | 356 | 100% | 1 |
| format | 309 | 308 | 100% | 1 |
| noErrors | 309 | 309 | 100% | 0 |
| escapes | 309 | 309 | 100% | 0 |
| noPrices | 309 | 309 | 100% | 0 |
| region | 42 | 42 | 100% | 0 |
| zones | 18 | 18 | 100% | 0 |
| notMention | 15 | 15 | 100% | 0 |
| attach | 12 | 12 | 100% | 0 |
| noWarn | 54 | 54 | 100% | 0 |
| editMinimal | 42 | 42 | 100% | 0 |
| restore | 3 | 3 | 100% | 0 |
| req | 33 | 33 | 100% | 0 |

## Cases below 100% (18 of 80)

| case | runs passed | what failed |
| --- | ---: | ---: |
| pat-12-ecommerce-security | 0/3 | include fraud-detection (1); clean path order after repair (3) |
| need-03-ambiguous-team | 0/3 | primary rec qoder-teams/qwenwork/qoder/qoder-enterprise (1); asks a question (2); NDJSON only, ends with done (1) |
| edit-03-swap-k8s | 0/3 | exclude ecs/ess (3); every attachment names a valid host (3) |
| mt-01-avoid-k8s | 0/3 | every attachment names a valid host (3) |
| mt-03-data-in-singapore | 0/3 | regions only singapore/ap-southeast-1 (3) |
| mt-04-budget | 0/3 | mentions cost/budget/$200/price (3) |
| ko-mt-01-avoid-k8s | 0/3 | every attachment names a valid host (3) |
| zh-edit-01-insert-waf | 0/3 | why text in zh (3); say text in zh (2) |
| zh-mt-01-avoid-k8s | 0/3 | every attachment names a valid host (3) |
| mt-06-summary-window | 0/3 | regions only jakarta/ap-southeast-5/indonesia (3) |
| need-01-dev-team | 2/3 | exclude qoder-cn/lingma/coding-plan (1) |
| need-04-claude-code | 2/3 | primary rec token-plan (1) |
| need-10-build-agents | 2/3 | every attachment names a valid host (1) |
| trap-09-mumbai | 2/3 | nodes >= 4 (1) |
| ko-need-01-dev-team | 2/3 | exclude qoder-cn/lingma/coding-plan (1) |
| zh-need-02-whole-company | 2/3 | why text in zh (1) |
| zh-trap-08-sydney | 2/3 | nodes >= 4 (1) |
| pat-13-internal-portal | 2/3 | every attachment names a valid host (1) |

## Warnings before and after deterministic repair

| code | before: total | per turn | turns | after: total | per turn | fixed by repair |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| orphan-node | 80 | 0.259 | 60 | 97 | 0.314 | 0 |
| containment | 30 | 0.097 | 19 | 0 | 0 | 30 |
| attach-host-missing | 19 | 0.061 | 15 | 0 | 0 | 18 |
| unknown-id | 8 | 0.026 | 5 | 0 | 0 | 0 |
| path-order | 5 | 0.016 | 5 | 5 | 0.016 | 0 |
| missing-group | 1 | 0.003 | 1 | 0 | 0 | 0 |
| china-only | 1 | 0.003 | 1 | 1 | 0.003 | 0 |

Severity before repair {"warn":68,"info":60,"error":16}, after {"info":52,"warn":51}. Unknown products: 0 (none). Product strings that were not catalog ids: 0 (none).

## Latency (main stream)

| measure | n | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| first say | 309 | 1.58 s | 2.34 s | 6.00 s |
| first op | 309 | 2.00 s | 2.74 s | 6.40 s |
| first node | 222 | 3.76 s | 5.36 s | 7.57 s |
| stream total (all turns) | 309 | 6.45 s | 22.1 s | 34.9 s |
| stream total, new diagrams | 235 | 12.0 s | 23.9 s | 34.9 s |
| stream total, edits | 105 | 4.61 s | 13.3 s | 29.5 s |
| stream total, product answers | 60 | 4.68 s | 6.15 s | 6.45 s |
| whole turn incl. retries and follow-up | 309 | 7.31 s | 22.6 s | 34.9 s |

## Tokens and cost

| measure | value |
| --- | ---: |
| prompt tokens | 3497057 |
| cached prompt tokens | 3356800 (96%) |
| completion tokens | 150390 |
| completion tokens per turn p50 / p95 | 258 / 1172 |
| cost per turn mean / p95 | $0.0073 / $0.0116 |
| cost per conversation mean / p95 | $0.0094 / $0.0296 |
| total | $2.27 |

## Reliability

| counter | value |
| --- | ---: |
| turns | 309 |
| main stream ended without done (truncated) | 1 |
| continuation turns | 1 |
| repair turns | 0 |
| hedged turns / hedge won | 6 / 0 |
| turns that used the fallback model | 5 |
| extra attempts after failures | 5 |
| conversations with an API failure | 0 |
| bad (unparseable) lines | 0 |
| \u escapes | 0 |

## Languages

| language | turns | completion tokens / turn | vs English twin | prompt tokens / turn | say in language | why in language | \u escapes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 243 | 482 | - | 11346 | 243/243 | 0/0 | 0 |
| ko | 33 | 548 | 1.14 | 11235 | 33/33 | 31/31 | 0 |
| zh | 33 | 462 | 0.986 | 11186 | 31/33 | 27/31 | 0 |

## Multi-turn retention

| case | turns | retention checks passed per turn | run pass |
| --- | ---: | ---: | ---: |
| edit-06-restore | 2 | 0/0  0/0 | 100% |
| mt-01-avoid-k8s | 4 | 3/3  3/3  6/6  6/6 | 0% |
| mt-02-serverless-first | 3 | 3/3  3/3  6/6 | 100% |
| mt-03-data-in-singapore | 4 | 3/3  3/6  0/3  0/3 | 0% |
| mt-04-budget | 3 | 3/3  6/6  3/3 | 0% |
| ko-mt-01-avoid-k8s | 3 | 3/3  3/3  6/6 | 0% |
| zh-mt-01-avoid-k8s | 3 | 3/3  3/3  6/6 | 0% |
| mt-05-mixed-five-turns | 5 | 6/6  9/9  9/9  9/9  9/9 | 100% |
| mt-06-summary-window | 5 | 6/6  6/6  6/6  6/6  9/12 | 0% |

## Judge (kimi-k3)

| measure | value |
| --- | ---: |
| runs judged / judge errors | 80 / 0 |
| completeness | 4.413 |
| accuracy | 4.313 |
| rationality | 4.1 |
| readability | 4.413 |
| overall | 4.309 |
| architect would sign off | 84% |
| judge cost | $0.606 |

| category | judged | overall score | sign-off |
| --- | ---: | ---: | ---: |
| pattern | 13 | 4.269 | 100% |
| need | 13 | 4.096 | 92% |
| trap | 16 | 4.547 | 88% |
| edit | 9 | 4.5 | 78% |
| multiturn | 6 | 3.75 | 33% |
| adversarial | 5 | 4.75 | 100% |
| i18n | 18 | 4.25 | 78% |

Agreement between the judged run's assertions and the judge's sign-off: 73/80 (91%). Assertions pass and judge yes 63, both no 10, assertions pass but judge no 3, assertions fail but judge yes 4. Mean score of passing runs 4.443, failing runs 3.679, point-biserial r 0.541.

| case | assertions | judge | failed assertions | judge defects |
| --- | ---: | ---: | ---: | ---: |
| pat-12-ecommerce-security | fail | yes | include fraud-detection; clean path order after repair | Anti-DDoS Proxy + ESA chaining is somewhat redundant since ESA includes DDoS scrubbing; acceptable given stated DDoS history but adds cost/complexity; Missing Security Center or explicit fraud detecti |
| need-10-build-agents | fail | yes | every attachment names a valid host | ai-guardrails node is isolated: no edge showing it inspecting LLM traffic via AI Gateway or Model Studio.; Human approval workflow is not explicitly represented (no approval step/channel edge such as  |
| trap-11-contact-center | pass | no |  | Does not mention that Conversational AI Service availability in 2026 is unverified per catalog; Omits other possible alternatives (IMS Real-time Conversational AI, Chat App Message and Voice Service)  |
| edit-07-multi-region-dr | pass | no |  | gtm -> dns edge makes DNS a hop in the resolution chain and inverts the design; the dns node is now orphaned from users.; Duplicate 'ESA Jakarta' node: ESA is global/edge, one node with GTM steering t |
| zh-edit-01-insert-waf | fail | yes | why text in zh | Does not mention that ESA already provides WAF, so adding WAF 3.0 on ALB is for deeper rules (catalog guidance) |
| zh-trap-01-lingma | pass | no |  | model-studio 作为 complement 无必要：Qoder Teams 自带模型能力，无需单独开通 Model Studio; token-plan 与 Qoder Teams 席位功能重叠，造成重复采购建议; 叙述未说明 Qoder CN 仅限中国、国际用户应使用 Qoder（qoder.com 或 Marketplace 购买） |
| pat-13-internal-portal | fail | yes | every attachment names a valid host | PrivateZone node with employees->pzone edge treats DNS as a hop; it should be a badge on the VPC; Express Connect node drawn inside the VPC instead of at the VPC edge/boundary; Narration is brief and  |
