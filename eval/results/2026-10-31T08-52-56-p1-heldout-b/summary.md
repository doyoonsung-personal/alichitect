# Evaluation summary

Model qwen3.8-max (fallback qwen3.7-max), catalog 2026-10-31 (223 entries), system prompt 48298 chars (sha256 53b0ef6af750), 3 runs per case, started 2026-10-31T08:52:56.504Z.

## Overall

**pass@1 93%, all 3 runs pass 89%** (18 cases). pass@3 is best-of-3 and is listed last.

| measure | value |
| --- | ---: |
| cases / conversations / turns | 18 / 54 / 90 |
| pass@1 (mean case pass rate) | 93% |
| all runs pass | 89% |
| majority (over half the runs pass) | 89% |
| pass@3 (some run passes) | 100% |
| conversations passing every assertion | 93% |
| turns passing every assertion | 96% |
| assertions passing (967 checks) | 100% |
| conversations that hit an API failure | 0 |
| list-price cost of the model runs | $0.65 |

## By category

| category | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| multiturn | 7 | 21 | 100% | 100% | 100% | 100% |
| pattern | 4 | 12 | 83% | 75% | 75% | 100% |
| i18n | 4 | 12 | 83% | 75% | 75% | 100% |
| need | 2 | 6 | 100% | 100% | 100% | 100% |
| trap | 1 | 3 | 100% | 100% | 100% | 100% |

## By language

| language | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 14 | 42 | 95% | 93% | 93% | 100% |
| ko | 2 | 6 | 100% | 100% | 100% | 100% |
| zh | 2 | 6 | 67% | 50% | 50% | 100% |

## By assertion type (worst first)

| type | checks | passed | rate | cases that failed it |
| --- | ---: | ---: | ---: | ---: |
| residency | 30 | 28 | 93% | 1 |
| attachValid | 90 | 88 | 98% | 1 |
| exclude | 21 | 21 | 100% | 0 |
| req | 21 | 21 | 100% | 0 |
| pins | 21 | 21 | 100% | 0 |
| noErrors | 90 | 90 | 100% | 0 |
| pathOrder | 84 | 84 | 100% | 0 |
| format | 90 | 90 | 100% | 0 |
| escapes | 90 | 90 | 100% | 0 |
| noPrices | 90 | 90 | 100% | 0 |
| sayLang | 90 | 90 | 100% | 0 |
| include | 66 | 66 | 100% | 0 |
| retention | 60 | 60 | 100% | 0 |
| region | 42 | 42 | 100% | 0 |
| attach | 6 | 6 | 100% | 0 |
| linked | 6 | 6 | 100% | 0 |
| placement | 3 | 3 | 100% | 0 |
| editMinimal | 12 | 12 | 100% | 0 |
| whyLang | 16 | 16 | 100% | 0 |
| primaryRec | 6 | 6 | 100% | 0 |
| size | 27 | 27 | 100% | 0 |
| question | 3 | 3 | 100% | 0 |
| mention | 3 | 3 | 100% | 0 |

## Cases below 100% (2 of 18)

| case | runs passed | what failed |
| --- | ---: | ---: |
| ho-p1-vpc-mongo | 1/3 | every attachment names a valid host (2) |
| ho-p1-zh-residency | 1/3 | residency cn-hongkong (2) |

## Warnings before and after deterministic repair

| code | before: total | per turn | turns | after: total | per turn | fixed by repair |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| orphan-node | 14 | 0.156 | 12 | 14 | 0.156 | 0 |
| constraint-region | 10 | 0.111 | 7 | 7 | 0.078 | 0 |
| containment | 7 | 0.078 | 4 | 0 | 0 | 7 |
| attach-host-missing | 6 | 0.067 | 6 | 0 | 0 | 2 |
| unknown-id | 2 | 0.022 | 1 | 0 | 0 | 0 |
| duplicate-id | 1 | 0.011 | 1 | 0 | 0 | 0 |

Severity before repair {"warn":14,"info":14,"error":12}, after {"info":12,"warn":9}. Unknown products: 0 (none). Product strings that were not catalog ids: 0 (none).

## Latency (main stream)

| measure | n | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| first token (answering attempt) | 90 | 1.30 s | 1.83 s | 2.39 s |
| first token as waited for (failed attempts included) | 90 | 1.30 s | 1.83 s | 2.39 s |
| first say | 90 | 1.61 s | 2.11 s | 2.68 s |
| first op | 90 | 2.10 s | 2.74 s | 3.12 s |
| first node | 81 | 3.71 s | 4.71 s | 5.20 s |
| stream total (all turns) | 90 | 8.13 s | 20.0 s | 26.0 s |
| stream total, new diagrams | 84 | 10.8 s | 20.1 s | 26.0 s |
| stream total, edits | 42 | 4.63 s | 8.46 s | 10.8 s |
| stream total, product answers | 6 | 3.92 s | 5.20 s | 5.39 s |
| whole turn incl. retries and follow-up | 90 | 8.14 s | 20.3 s | 26.0 s |

## Tokens and cost

| measure | value |
| --- | ---: |
| prompt tokens | 1181449 |
| cached prompt tokens | 1135104 (96%) |
| completion tokens | 45481 |
| completion tokens per turn p50 / p95 | 333 / 1011 |
| cost per turn mean / p95 | $0.0072 / $0.0106 |
| cost per conversation mean / p95 | $0.0120 / $0.0215 |
| total | $0.65 |

## Reliability

| counter | value |
| --- | ---: |
| turns | 90 |
| main stream ended without done (truncated) | 0 |
| continuation turns | 0 |
| repair turns | 2 |
| hedged turns / hedge won | 0 / 0 |
| turns that used the fallback model | 0 |
| extra attempts after failures | 0 |
| conversations with an API failure | 0 |
| bad (unparseable) lines | 0 |
| \u escapes | 0 |

## Failover to the fallback model

0 of 90 turns (0%) failed over in the main stream; reasons {}. Follow-up turns that ran on another model: 0.

## Cut-off turns

Main streams that ended without done: 0 ({}). Rescued by the continuation turn: 0 (0 of them pass every assertion); not rescued: 0. Turn pass rate without the rescued turns: 96%.

## Constraint compliance (machine-checked)

| check | passed | rate |
| --- | ---: | ---: |
| residency (final graph and final narration, core checker) | 28/30 | 93% |
| pinned constraints as data (req regions / avoid) | 21/21 | 100% |
| avoided products absent (exclude and retained exclude) | 33/33 | 100% |

Residency checks with a warn-level foreign-region mention (not failed, reviewed by hand): 6. Residency checks where the product's repair turn corrected the main-stream narration: 1. Turns with pinned constraints in memory: 55. Product constraint findings before repair {"constraint-region":{"total":10,"turns":7,"error":3}}, left after repair {"constraint-region":{"total":7,"turns":7,"error":0}}.

| case | run | turn | residency finding |
| --- | ---: | ---: | ---: |
| ho-p1-zh-residency | 1 | 2 | a say line sends data to another region ("容灾"): "实现符合监管要求的同城异地容灾方案"; the pinned regions are Hong Kong (cn-hongkong) ("eval residency"). Correct the narration and keep data in the pinned region |
| ho-p1-zh-residency | 3 | 2 | a say line sends data to another region ("容灾"): "实现异地容灾"; the pinned regions are Hong Kong (cn-hongkong) ("eval residency"). Correct the narration and keep data in the pinned region |

## Repairs

| deterministic fix | fixes | turns |
| --- | ---: | ---: |
| containment | 7 | 4 |
| attach-invalid | 4 | 4 |
| attach-host-missing | 2 | 2 |

LLM follow-up turns: 2 ({"repair":2}); turns by finding code {"constraint-region":1,"duplicate-id":1}.

| case | run | turn | kind | turn passes | findings |
| --- | ---: | ---: | ---: | ---: | ---: |
| ho-p1-residency-japan | 2 | 2 | repair | yes | constraint-region/error: region group 'sg' (Singapore (ap-southeast-1)) is in Singapore (ap-southeast-1) and holds analytics; the pinned regions are Tokyo (ap-northeast-1) ("All policyholder data must remain physically w; constraint-region/error: the why of 'c |
| ho-closed-region-game | 2 | 1 | repair | yes | duplicate-id/error: node 'players' collides with a group id; op dropped |

## Languages

| language | turns | completion tokens / turn | vs English twin | prompt tokens / turn | say in language | why in language | \u escapes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 72 | 511 | - | 13148 | 72/72 | 0/0 | 0 |
| ko | 9 | 387 | - | 13009 | 9/9 | 7/7 | 0 |
| zh | 9 | 580 | - | 13077 | 9/9 | 9/9 | 0 |

## Multi-turn retention

| case | turns | retention checks passed per turn | run pass |
| --- | ---: | ---: | ---: |
| ho-p1-residency-japan | 3 | 6/6  9/9  6/6 | 100% |
| ho-p1-avoid-es | 2 | 3/3  3/3 | 100% |
| ho-p1-avoid-fc-tempt | 2 | 3/3  3/3 | 100% |
| ho-p1-ko-residency | 2 | 6/6  9/9 | 100% |
| ho-p1-zh-residency | 2 | 6/6  7/9 | 33% |
| ho-residency-korea | 3 | 6/6  9/9  9/9 | 100% |
| ho-scale-sae | 2 | 0/0  6/6 | 100% |
| ho-scale-ecs-ok | 2 | 0/0  6/6 | 100% |
| ho-budget-ha | 3 | 3/3  3/3  6/6 | 100% |

## Judge (kimi-k3)

| measure | value |
| --- | ---: |
| runs judged / judge errors | 18 / 0 |
| completeness | 4.833 |
| accuracy | 4.611 |
| rationality | 4.389 |
| readability | 4.556 |
| overall | 4.597 |
| architect would sign off | 94% |
| judge cost | $0.311 |

| category | judged | overall score | sign-off |
| --- | ---: | ---: | ---: |
| multiturn | 7 | 4.571 | 86% |
| pattern | 4 | 4.438 | 100% |
| i18n | 4 | 4.688 | 100% |
| need | 2 | 4.625 | 100% |
| trap | 1 | 5 | 100% |

Every run of the constraint cases: 27 runs judged, sign-off 93%, mean 4.519. (Total judged runs: 36.)

| case | run | judge defects |
| --- | ---: | ---: |
| ho-budget-ha | 1 | db (Posts DB) and comment-db are not multi-zone; RDS HA edition not requested, leaving the outage scenario partially unaddressed; Turn 3 narration says 'modest cost' without flagging that ALB plus a second ECS instance i |
| ho-p1-zh-residency | 2 | gtm用于'可用区间切换流量'是产品误用：GTM做跨区域DNS级容灾，同区域AZ故障已由多AZ ALB/RDS覆盖; users->gtm(resolve)再gtm->dns(resolve)形成冗余解析链，DNS不应作为数据路径/解析链中的一跳; 未说明备份保留策略、RPO/RTO或恢复演练，容灾方案深度不足 |

Agreement between the judged run's assertions and the judge's sign-off: 16/18 (89%). Assertions pass and judge yes 16, both no 0, assertions pass but judge no 1, assertions fail but judge yes 1. Mean score of passing runs 4.603, failing runs 4.5, point-biserial r 0.062.

| case | assertions | judge | failed assertions | judge defects |
| --- | ---: | ---: | ---: | ---: |
| ho-p1-zh-residency | fail | yes | residency cn-hongkong | 只读副本节点未标注 zones a,b，与主库的双可用区表述不一致，容灾拓扑表达略不完整。; 云备份描述为'备份至同区域另一可用区'，未说明备份数据同样不出香港（虽属同区域，但显式说明更稳妥）。; 未提及备份的恢复演练或 RPO/RTO 目标，对证券监管场景略显单薄。 |
| ho-budget-ha | pass | no |  | db (Posts DB) and comment-db are not multi-zone; RDS HA edition not requested, leaving the outage scenario partially unaddressed; Turn 3 narration says 'modest cost' without flagging that ALB plus a s |
