# Evaluation summary

Model qwen3.8-max (fallback qwen3.7-max), catalog 2026-10-31 (223 entries), system prompt 49687 chars (sha256 ad75dbaaa9c2), 5 runs per case, started 2026-10-31T15:44:27.040Z.

## Overall

**pass@1 95%, all 5 runs pass 77%** (13 cases). pass@5 is best-of-5 and is listed last.

| measure | value |
| --- | ---: |
| cases / conversations / turns | 13 / 65 / 205 |
| pass@1 (mean case pass rate) | 95% |
| all runs pass | 77% |
| majority (over half the runs pass) | 100% |
| pass@5 (some run passes) | 100% |
| conversations passing every assertion | 95% |
| turns passing every assertion | 98% |
| assertions passing (2275 checks) | 100% |
| conversations that hit an API failure | 0 |
| list-price cost of the model runs | $1.97 |

## By category

| category | cases | runs | run pass | all runs | majority | pass@5 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| multiturn | 9 | 45 | 93% | 67% | 100% | 100% |
| i18n | 4 | 20 | 100% | 100% | 100% | 100% |

## By language

| language | cases | runs | run pass | all runs | majority | pass@5 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 9 | 45 | 93% | 67% | 100% | 100% |
| ko | 2 | 10 | 100% | 100% | 100% | 100% |
| zh | 2 | 10 | 100% | 100% | 100% | 100% |

## By assertion type (worst first)

| type | checks | passed | rate | cases that failed it |
| --- | ---: | ---: | ---: | ---: |
| pins | 35 | 33 | 94% | 1 |
| editMinimal | 70 | 69 | 99% | 1 |
| attachValid | 205 | 204 | 100% | 1 |
| exclude | 45 | 45 | 100% | 0 |
| req | 75 | 75 | 100% | 0 |
| size | 10 | 10 | 100% | 0 |
| noErrors | 205 | 205 | 100% | 0 |
| pathOrder | 205 | 205 | 100% | 0 |
| format | 205 | 205 | 100% | 0 |
| escapes | 205 | 205 | 100% | 0 |
| noPrices | 205 | 205 | 100% | 0 |
| sayLang | 205 | 205 | 100% | 0 |
| retention | 255 | 255 | 100% | 0 |
| mention | 5 | 5 | 100% | 0 |
| include | 100 | 100 | 100% | 0 |
| whyLang | 50 | 50 | 100% | 0 |
| region | 45 | 45 | 100% | 0 |
| residency | 75 | 75 | 100% | 0 |
| residencyScan | 75 | 75 | 100% | 0 |

## Cases below 100% (3 of 13)

| case | runs passed | what failed |
| --- | ---: | ---: |
| mt-04-budget | 4/5 | edit {"minChanged":1} (1) |
| p1-req-avoid-fc | 4/5 | pinned avoid fc (1) |
| p1-avoid-tempted-k8s | 4/5 | every attachment names a valid host (1) |

## Warnings before and after deterministic repair

| code | before: total | per turn | turns | after: total | per turn | fixed by repair |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| orphan-node | 4 | 0.02 | 3 | 2 | 0.01 | 2 |
| containment | 4 | 0.02 | 4 | 0 | 0 | 4 |
| unknown-id | 1 | 0.005 | 1 | 0 | 0 | 0 |
| constraint-region | 1 | 0.005 | 1 | 1 | 0.005 | 0 |
| attach-host-missing | 1 | 0.005 | 1 | 0 | 0 | 1 |

Severity before repair {"error":4,"warn":4,"info":3}, after {"info":2,"warn":1}. Unknown products: 0 (none). Product strings that were not catalog ids: 0 (none).

## Latency (main stream)

| measure | n | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| first token (answering attempt) | 205 | 1.14 s | 1.69 s | 2.33 s |
| first token as waited for (failed attempts included) | 205 | 1.14 s | 2.21 s | 9.67 s |
| first say | 205 | 1.46 s | 2.18 s | 2.68 s |
| first op | 205 | 1.92 s | 2.75 s | 3.11 s |
| first node | 200 | 3.45 s | 4.64 s | 5.69 s |
| stream total (all turns) | 205 | 6.92 s | 23.3 s | 37.5 s |
| stream total, new diagrams | 205 | 6.92 s | 23.3 s | 37.5 s |
| stream total, edits | 140 | 5.26 s | 8.76 s | 11.1 s |
| stream total, product answers | 0 | - | - | - |
| whole turn incl. retries and follow-up | 205 | 7.86 s | 23.3 s | 37.5 s |

## Tokens and cost

| measure | value |
| --- | ---: |
| prompt tokens | 2775984 |
| cached prompt tokens | 2521344 (91%) |
| completion tokens | 98327 |
| completion tokens per turn p50 / p95 | 279 / 1205 |
| cost per turn mean / p95 | $0.0096 / $0.0151 |
| cost per conversation mean / p95 | $0.0304 / $0.0781 |
| total | $1.97 |

## Reliability

| counter | value |
| --- | ---: |
| turns | 205 |
| main stream ended without done (truncated) | 0 |
| continuation turns | 0 |
| repair turns | 0 |
| hedged turns / hedge won | 0 / 0 |
| turns that used the fallback model | 9 |
| extra attempts after failures | 9 |
| conversations with an API failure | 0 |
| bad (unparseable) lines | 0 |
| \u escapes | 0 |

## Failover to the fallback model

9 of 205 turns (4%) failed over in the main stream; reasons {"first-byte-timeout":9}. Follow-up turns that ran on another model: 0.

| measure | n | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| stalled attempt before failover | 9 | 8.21 s | 8.26 s | 8.26 s |
| fallback first token | 9 | 1.23 s | 1.53 s | 1.58 s |
| first token as waited for | 9 | 9.45 s | 9.65 s | 9.67 s |
| whole turn | 9 | 12.0 s | 15.6 s | 16.0 s |

## Cut-off turns

Main streams that ended without done: 0 ({}). Rescued by the continuation turn: 0 (0 of them pass every assertion); not rescued: 0. Turn pass rate without the rescued turns: 98%.

## Constraint compliance (machine-checked)

| check | passed | rate |
| --- | ---: | ---: |
| residency (final graph and final narration, core checker) | 75/75 | 100% |
| residency, independent scan (own place table and cue words; shares no code with the checker) | 75/75 | 100% |
| pinned constraints as data (req regions / avoid) | 33/35 | 94% |
| avoided products absent (exclude and retained exclude) | 155/155 | 100% |

Residency checks with a warn-level foreign-region mention (not failed, reviewed by hand): 1. Residency checks where the product's repair turn corrected the main-stream narration: 0. Turns with pinned constraints in memory: 170. Product constraint findings before repair {"constraint-region":{"total":1,"turns":1,"error":0}}, left after repair {"constraint-region":{"total":1,"turns":1,"error":0}}.

| case | run | turn | pins check | pinned |
| --- | ---: | ---: | ---: | ---: |
| p1-req-avoid-fc | 2 | 1 | pinned avoid fc | no machine-checkable constraint pinned |
| p1-req-avoid-fc | 2 | 2 | pinned avoid fc | no machine-checkable constraint pinned |

## Repairs

| deterministic fix | fixes | turns |
| --- | ---: | ---: |
| containment | 4 | 4 |
| orphan-node | 2 | 1 |
| attach-host-missing | 1 | 1 |

LLM follow-up turns: 0 ({}); turns by finding code {}.

## Languages

| language | turns | completion tokens / turn | vs English twin | prompt tokens / turn | say in language | why in language | \u escapes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 155 | 440 | - | 13575 | 155/155 | 0/0 | 0 |
| ko | 25 | 635 | 1.051 | 13471 | 25/25 | 25/25 | 0 |
| zh | 25 | 571 | 0.972 | 13406 | 25/25 | 25/25 | 0 |

## Multi-turn retention

| case | turns | retention checks passed per turn | run pass |
| --- | ---: | ---: | ---: |
| mt-01-avoid-k8s | 4 | 5/5  5/5  10/10  10/10 | 100% |
| mt-02-serverless-first | 3 | 5/5  5/5  10/10 | 100% |
| mt-03-data-in-singapore | 4 | 10/10  15/15  10/10  10/10 | 100% |
| mt-04-budget | 3 | 5/5  10/10  5/5 | 80% |
| ko-mt-01-avoid-k8s | 3 | 5/5  5/5  10/10 | 100% |
| zh-mt-01-avoid-k8s | 3 | 5/5  5/5  10/10 | 100% |
| mt-05-mixed-five-turns | 5 | 10/10  15/15  15/15  15/15  15/15 | 100% |
| mt-06-summary-window | 5 | 15/15  15/15  15/15  15/15  25/25 | 100% |
| p1-req-residency-my | 2 | 10/10  15/15 | 100% |
| p1-req-avoid-fc | 2 | 5/5  5/5 | 80% |
| p1-avoid-tempted-k8s | 3 | 5/5  5/5  10/10 | 80% |
| p1-ko-residency | 2 | 5/5  10/10 | 100% |
| p1-zh-residency | 2 | 10/10  15/15 | 100% |

## Judge (kimi-k3)

| measure | value |
| --- | ---: |
| runs judged / judge errors | 13 / 0 |
| completeness | 4.692 |
| accuracy | 4.308 |
| rationality | 4 |
| readability | 4.308 |
| overall | 4.327 |
| architect would sign off | 85% |
| judge cost | $0.715 |

| category | judged | overall score | sign-off |
| --- | ---: | ---: | ---: |
| multiturn | 9 | 4.417 | 89% |
| i18n | 4 | 4.125 | 75% |

Every run of the constraint cases: 65 runs judged, sign-off 92%, mean 4.388. (Total judged runs: 65.)

| case | run | judge defects |
| --- | ---: | ---: |
| mt-04-budget | 1 | Elasticsearch 'Listings Search' remains single-zone while the user asked to make the app highly available; no note explaining the exception; Pinned budget of under $200/month is acknowledged as likely breached with no al |
| mt-04-budget | 3 | GTM added for cross-region DNS failover but there is only one region (Singapore) and no second region is proposed or budgeted; GTM is a dangling node with no real failover target; Turn 3 narration claims HA is achieved,  |
| mt-04-budget | 4 | Final design exceeds the pinned $200/month budget without offering a cost-saving variant (e.g., keep search single-zone, smaller RDS HA, or SAE); Making Elasticsearch multi-zone is the least cost-effective HA choice for  |
| mt-04-budget | 5 | App + DB on the same ECS nodes labeled 'zones a,b' implies multi-zone DB, but ECS with local disk cannot span zones; no RDS or replication is specified, so the database tier is not actually highly available; Full-text se |
| p1-ko-residency | 1 | DR 노드(alb-dr, gw-dr, api-dr)가 주 스택과 동일한 zones a,b, 동일 VPC에 배치되어 AZ 장애 시 함께 다운됨 — 차라리 기존 이중 AZ 구성의 자동 페일오버를 설명하거나 별도 AZ/서브넷 구성이 필요; DR 스택으로의 트래픽 전환 경로(ESA/DNS에서 ALB-DR로의 failover edge)가 없어 실제 전환 동작이 표현되지 않음; ESA는 글로벌 엣지 서 |

Agreement between the judged run's assertions and the judge's sign-off: 11/13 (85%). Assertions pass and judge yes 11, both no 0, assertions pass but judge no 2, assertions fail but judge yes 0. Mean score of passing runs 4.327, failing runs -, point-biserial r -.

| case | assertions | judge | failed assertions | judge defects |
| --- | ---: | ---: | ---: | ---: |
| mt-04-budget | pass | no |  | Elasticsearch 'Listings Search' remains single-zone while the user asked to make the app highly available; no note explaining the exception; Pinned budget of under $200/month is acknowledged as likely |
| p1-ko-residency | pass | no |  | DR 노드(alb-dr, gw-dr, api-dr)가 주 스택과 동일한 zones a,b, 동일 VPC에 배치되어 AZ 장애 시 함께 다운됨 — 차라리 기존 이중 AZ 구성의 자동 페일오버를 설명하거나 별도 AZ/서브넷 구성이 필요; DR 스택으로의 트래픽 전환 경로(ESA/DNS에서 ALB-DR로의 failover edge)가 없어 실제 전환 동작이 표현 |
