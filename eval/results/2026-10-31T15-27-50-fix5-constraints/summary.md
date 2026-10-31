# Evaluation summary

Model qwen3.8-max (fallback qwen3.7-max), catalog 2026-10-31 (223 entries), system prompt 49687 chars (sha256 ad75dbaaa9c2), 5 runs per case, started 2026-10-31T15:27:50.748Z.

## Overall

**pass@1 92%, all 5 runs pass 85%** (13 cases). pass@5 is best-of-5 and is listed last.

| measure | value |
| --- | ---: |
| cases / conversations / turns | 13 / 65 / 205 |
| pass@1 (mean case pass rate) | 92% |
| all runs pass | 85% |
| majority (over half the runs pass) | 92% |
| pass@5 (some run passes) | 100% |
| conversations passing every assertion | 92% |
| turns passing every assertion | 96% |
| assertions passing (2274 checks) | 100% |
| conversations that hit an API failure | 0 |
| list-price cost of the model runs | $1.71 |

## By category

| category | cases | runs | run pass | all runs | majority | pass@5 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| multiturn | 9 | 45 | 89% | 78% | 89% | 100% |
| i18n | 4 | 20 | 100% | 100% | 100% | 100% |

## By language

| language | cases | runs | run pass | all runs | majority | pass@5 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 9 | 45 | 89% | 78% | 89% | 100% |
| ko | 2 | 10 | 100% | 100% | 100% | 100% |
| zh | 2 | 10 | 100% | 100% | 100% | 100% |

## By assertion type (worst first)

| type | checks | passed | rate | cases that failed it |
| --- | ---: | ---: | ---: | ---: |
| pins | 35 | 29 | 83% | 1 |
| editMinimal | 70 | 68 | 97% | 1 |
| include | 100 | 100 | 100% | 0 |
| exclude | 45 | 45 | 100% | 0 |
| req | 75 | 75 | 100% | 0 |
| noErrors | 205 | 205 | 100% | 0 |
| pathOrder | 205 | 205 | 100% | 0 |
| attachValid | 205 | 205 | 100% | 0 |
| format | 205 | 205 | 100% | 0 |
| escapes | 205 | 205 | 100% | 0 |
| noPrices | 205 | 205 | 100% | 0 |
| sayLang | 205 | 205 | 100% | 0 |
| retention | 255 | 255 | 100% | 0 |
| size | 10 | 10 | 100% | 0 |
| mention | 5 | 5 | 100% | 0 |
| whyLang | 49 | 49 | 100% | 0 |
| region | 45 | 45 | 100% | 0 |
| residency | 75 | 75 | 100% | 0 |
| residencyScan | 75 | 75 | 100% | 0 |

## Cases below 100% (2 of 13)

| case | runs passed | what failed |
| --- | ---: | ---: |
| p1-avoid-tempted-k8s | 2/5 | pinned avoid ack (3) |
| mt-05-mixed-five-turns | 3/5 | edit {"minChanged":1} (2) |

## Warnings before and after deterministic repair

| code | before: total | per turn | turns | after: total | per turn | fixed by repair |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| orphan-node | 10 | 0.049 | 10 | 10 | 0.049 | 0 |
| containment | 5 | 0.024 | 5 | 0 | 0 | 5 |
| constraint-region | 4 | 0.02 | 4 | 4 | 0.02 | 0 |
| path-order | 2 | 0.01 | 2 | 2 | 0.01 | 0 |
| missing-group | 1 | 0.005 | 1 | 0 | 0 | 1 |

Severity before repair {"warn":10,"info":8,"error":4}, after {"warn":8,"info":8}. Unknown products: 0 (none). Product strings that were not catalog ids: 0 (none).

## Latency (main stream)

| measure | n | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| first token (answering attempt) | 205 | 1.15 s | 1.65 s | 6.90 s |
| first token as waited for (failed attempts included) | 205 | 1.15 s | 1.65 s | 6.90 s |
| first say | 205 | 1.46 s | 2.13 s | 7.17 s |
| first op | 205 | 1.90 s | 2.50 s | 7.77 s |
| first node | 197 | 3.22 s | 4.75 s | 9.39 s |
| stream total (all turns) | 205 | 6.56 s | 23.3 s | 29.8 s |
| stream total, new diagrams | 205 | 6.56 s | 23.3 s | 29.8 s |
| stream total, edits | 140 | 5.14 s | 8.93 s | 15.5 s |
| stream total, product answers | 0 | - | - | - |
| whole turn incl. retries and follow-up | 205 | 6.78 s | 23.3 s | 29.8 s |

## Tokens and cost

| measure | value |
| --- | ---: |
| prompt tokens | 2777401 |
| cached prompt tokens | 2537472 (91%) |
| completion tokens | 99630 |
| completion tokens per turn p50 / p95 | 287 / 1218 |
| cost per turn mean / p95 | $0.0083 / $0.0114 |
| cost per conversation mean / p95 | $0.0264 / $0.0470 |
| total | $1.71 |

## Reliability

| counter | value |
| --- | ---: |
| turns | 205 |
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

0 of 205 turns (0%) failed over in the main stream; reasons {}. Follow-up turns that ran on another model: 0.

## Cut-off turns

Main streams that ended without done: 0 ({}). Rescued by the continuation turn: 0 (0 of them pass every assertion); not rescued: 0. Turn pass rate without the rescued turns: 96%.

## Constraint compliance (machine-checked)

| check | passed | rate |
| --- | ---: | ---: |
| residency (final graph and final narration, core checker) | 75/75 | 100% |
| residency, independent scan (own place table and cue words; shares no code with the checker) | 75/75 | 100% |
| pinned constraints as data (req regions / avoid) | 29/35 | 83% |
| avoided products absent (exclude and retained exclude) | 155/155 | 100% |

Residency checks with a warn-level foreign-region mention (not failed, reviewed by hand): 4. Residency checks where the product's repair turn corrected the main-stream narration: 0. Turns with pinned constraints in memory: 163. Product constraint findings before repair {"constraint-region":{"total":4,"turns":4,"error":0}}, left after repair {"constraint-region":{"total":4,"turns":4,"error":0}}.

| case | run | turn | pins check | pinned |
| --- | ---: | ---: | ---: | ---: |
| p1-avoid-tempted-k8s | 1 | 1 | pinned avoid ack | no machine-checkable constraint pinned |
| p1-avoid-tempted-k8s | 1 | 2 | pinned avoid ack | no machine-checkable constraint pinned |
| p1-avoid-tempted-k8s | 2 | 1 | pinned avoid ack | no machine-checkable constraint pinned |
| p1-avoid-tempted-k8s | 2 | 2 | pinned avoid ack | no machine-checkable constraint pinned |
| p1-avoid-tempted-k8s | 4 | 1 | pinned avoid ack | no machine-checkable constraint pinned |
| p1-avoid-tempted-k8s | 4 | 2 | pinned avoid ack | no machine-checkable constraint pinned |

## Repairs

| deterministic fix | fixes | turns |
| --- | ---: | ---: |
| containment | 5 | 5 |
| missing-group | 1 | 1 |

LLM follow-up turns: 0 ({}); turns by finding code {}.

## Languages

| language | turns | completion tokens / turn | vs English twin | prompt tokens / turn | say in language | why in language | \u escapes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 155 | 444 | - | 13580 | 155/155 | 0/0 | 0 |
| ko | 25 | 653 | 1.011 | 13479 | 25/25 | 25/25 | 0 |
| zh | 25 | 579 | 0.962 | 13421 | 25/25 | 24/24 | 0 |

## Multi-turn retention

| case | turns | retention checks passed per turn | run pass |
| --- | ---: | ---: | ---: |
| mt-01-avoid-k8s | 4 | 5/5  5/5  10/10  10/10 | 100% |
| mt-02-serverless-first | 3 | 5/5  5/5  10/10 | 100% |
| mt-03-data-in-singapore | 4 | 10/10  15/15  10/10  10/10 | 100% |
| mt-04-budget | 3 | 5/5  10/10  5/5 | 100% |
| ko-mt-01-avoid-k8s | 3 | 5/5  5/5  10/10 | 100% |
| zh-mt-01-avoid-k8s | 3 | 5/5  5/5  10/10 | 100% |
| mt-05-mixed-five-turns | 5 | 10/10  15/15  15/15  15/15  15/15 | 60% |
| mt-06-summary-window | 5 | 15/15  15/15  15/15  15/15  25/25 | 100% |
| p1-req-residency-my | 2 | 10/10  15/15 | 100% |
| p1-req-avoid-fc | 2 | 5/5  5/5 | 100% |
| p1-avoid-tempted-k8s | 3 | 5/5  5/5  10/10 | 40% |
| p1-ko-residency | 2 | 5/5  10/10 | 100% |
| p1-zh-residency | 2 | 10/10  15/15 | 100% |

## Judge (kimi-k3)

| measure | value |
| --- | ---: |
| runs judged / judge errors | 13 / 0 |
| completeness | 4.923 |
| accuracy | 4.462 |
| rationality | 4.154 |
| readability | 4.846 |
| overall | 4.596 |
| architect would sign off | 92% |
| judge cost | $0.714 |

| category | judged | overall score | sign-off |
| --- | ---: | ---: | ---: |
| multiturn | 9 | 4.556 | 89% |
| i18n | 4 | 4.688 | 100% |

Every run of the constraint cases: 65 runs judged, sign-off 94%, mean 4.504. (Total judged runs: 65.)

| case | run | judge defects |
| --- | ---: | ---: |
| mt-04-budget | 1 | Turn 3 claims HA is satisfied because 'nodes are already multi-zone', but a single small ECS node with zones [a,b] is ambiguous—true app-tier HA needs two instances or an explicit note; the narration does not explain wha |
| mt-04-budget | 3 | Multi-zone managed Elasticsearch plus multi-zone RDS and ALB likely blows the $200/month budget; the answer never reconciles HA with the pinned budget or offers a cheaper search option (e.g., RDS full-text or a smaller E |
| p1-ko-residency | 4 | gtm 노드 추가: 글로벌 DNS 트래픽 관리는 해외 반출 금지 규제 환경에서 불필요하며, 단일 리전/단일 ALB 구조에서 페일오버 대상이 없어 설계 정합성이 낮음; dr-db에 zones [a,b] 미지정 — why 텍스트는 '타 가용영역'이라 명시했으나 노드에 가용영역 속성이 없어 다중 AZ 배치가 보장되지 않음; db(rds)가 이미 zones a,b 다중 AZ 고가용성인데 dr-db를 |
| p1-zh-residency | 4 | db-replica同时通过RDS自带同步(db->db-replica)和DTS(dts->db-replica)两条路径写入，同一实例被两个同步源写入，逻辑冲突; DTS节点冗余：RDS主备/只读副本本身已提供同步能力，DTS到只读副本的链路没有实际意义，属于多余组件; db-replica未标注可用区(zones)，'跨可用区只读副本'的说法在图上没有体现 |

Agreement between the judged run's assertions and the judge's sign-off: 11/13 (85%). Assertions pass and judge yes 11, both no 0, assertions pass but judge no 1, assertions fail but judge yes 1. Mean score of passing runs 4.563, failing runs 5, point-biserial r -0.35.

| case | assertions | judge | failed assertions | judge defects |
| --- | ---: | ---: | ---: | ---: |
| mt-04-budget | pass | no |  | Turn 3 claims HA is satisfied because 'nodes are already multi-zone', but a single small ECS node with zones [a,b] is ambiguous—true app-tier HA needs two instances or an explicit note; the narration  |
| p1-avoid-tempted-k8s | fail | yes | pinned avoid ack |  |
