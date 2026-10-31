# Evaluation summary

Model qwen3.8-max (fallback qwen3.7-max), catalog 2026-10-31 (223 entries), system prompt 49687 chars (sha256 ad75dbaaa9c2), 3 runs per case, started 2026-10-31T15:52:08.130Z.

## Overall

**pass@1 97%, all 3 runs pass 96%** (25 cases). pass@3 is best-of-3 and is listed last.

| measure | value |
| --- | ---: |
| cases / conversations / turns | 25 / 75 / 132 |
| pass@1 (mean case pass rate) | 97% |
| all runs pass | 96% |
| majority (over half the runs pass) | 96% |
| pass@3 (some run passes) | 100% |
| conversations passing every assertion | 97% |
| turns passing every assertion | 99% |
| assertions passing (1460 checks) | 100% |
| conversations that hit an API failure | 0 |
| list-price cost of the model runs | $1.04 |

## By category

| category | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| multiturn | 11 | 33 | 100% | 100% | 100% | 100% |
| pattern | 4 | 12 | 83% | 75% | 75% | 100% |
| i18n | 7 | 21 | 100% | 100% | 100% | 100% |
| need | 2 | 6 | 100% | 100% | 100% | 100% |
| trap | 1 | 3 | 100% | 100% | 100% | 100% |

## By language

| language | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 18 | 54 | 96% | 94% | 94% | 100% |
| ko | 4 | 12 | 100% | 100% | 100% | 100% |
| zh | 3 | 9 | 100% | 100% | 100% | 100% |

## By assertion type (worst first)

| type | checks | passed | rate | cases that failed it |
| --- | ---: | ---: | ---: | ---: |
| attachValid | 132 | 130 | 99% | 1 |
| include | 84 | 84 | 100% | 0 |
| region | 51 | 51 | 100% | 0 |
| placement | 3 | 3 | 100% | 0 |
| noErrors | 132 | 132 | 100% | 0 |
| pathOrder | 126 | 126 | 100% | 0 |
| format | 132 | 132 | 100% | 0 |
| escapes | 132 | 132 | 100% | 0 |
| noPrices | 132 | 132 | 100% | 0 |
| sayLang | 132 | 132 | 100% | 0 |
| linked | 6 | 6 | 100% | 0 |
| attach | 6 | 6 | 100% | 0 |
| exclude | 30 | 30 | 100% | 0 |
| req | 42 | 42 | 100% | 0 |
| pins | 45 | 45 | 100% | 0 |
| retention | 66 | 66 | 100% | 0 |
| editMinimal | 12 | 12 | 100% | 0 |
| residency | 60 | 60 | 100% | 0 |
| residencyScan | 60 | 60 | 100% | 0 |
| whyLang | 32 | 32 | 100% | 0 |
| noWarn | 6 | 6 | 100% | 0 |
| primaryRec | 6 | 6 | 100% | 0 |
| size | 27 | 27 | 100% | 0 |
| question | 3 | 3 | 100% | 0 |
| mention | 3 | 3 | 100% | 0 |

## Cases below 100% (1 of 25)

| case | runs passed | what failed |
| --- | ---: | ---: |
| ho-p1-vpc-mongo | 1/3 | every attachment names a valid host (2) |

## Warnings before and after deterministic repair

| code | before: total | per turn | turns | after: total | per turn | fixed by repair |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| constraint-region | 20 | 0.152 | 12 | 16 | 0.121 | 0 |
| orphan-node | 15 | 0.114 | 15 | 15 | 0.114 | 0 |
| containment | 5 | 0.038 | 4 | 0 | 0 | 5 |
| attach-host-missing | 4 | 0.03 | 3 | 0 | 0 | 2 |
| missing-group | 2 | 0.015 | 1 | 0 | 0 | 0 |
| unknown-product | 1 | 0.008 | 1 | 0 | 0 | 0 |
| constraint-replaced | 0 | 0 | 0 | 6 | 0.045 | 0 |

Severity before repair {"warn":22,"info":14,"error":11}, after {"info":19,"warn":18}. Unknown products: 1 (avoid x1). Product strings that were not catalog ids: 0 (none).

## Latency (main stream)

| measure | n | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| first token (answering attempt) | 132 | 1.10 s | 1.54 s | 1.89 s |
| first token as waited for (failed attempts included) | 132 | 1.10 s | 1.54 s | 1.89 s |
| first say | 132 | 1.41 s | 1.99 s | 2.64 s |
| first op | 132 | 1.84 s | 2.54 s | 3.06 s |
| first node | 118 | 3.63 s | 4.84 s | 5.63 s |
| stream total (all turns) | 132 | 8.49 s | 18.5 s | 26.6 s |
| stream total, new diagrams | 126 | 10.2 s | 18.6 s | 26.6 s |
| stream total, edits | 63 | 4.76 s | 8.28 s | 9.80 s |
| stream total, product answers | 6 | 3.85 s | 4.21 s | 4.24 s |
| whole turn incl. retries and follow-up | 132 | 8.56 s | 18.5 s | 26.6 s |

## Tokens and cost

| measure | value |
| --- | ---: |
| prompt tokens | 1767430 |
| cached prompt tokens | 1654784 (94%) |
| completion tokens | 66505 |
| completion tokens per turn p50 / p95 | 384 / 970 |
| cost per turn mean / p95 | $0.0079 / $0.0105 |
| cost per conversation mean / p95 | $0.0138 / $0.0227 |
| total | $1.04 |

## Reliability

| counter | value |
| --- | ---: |
| turns | 132 |
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

0 of 132 turns (0%) failed over in the main stream; reasons {}. Follow-up turns that ran on another model: 0.

## Cut-off turns

Main streams that ended without done: 0 ({}). Rescued by the continuation turn: 0 (0 of them pass every assertion); not rescued: 0. Turn pass rate without the rescued turns: 99%.

## Constraint compliance (machine-checked)

| check | passed | rate |
| --- | ---: | ---: |
| residency (final graph and final narration, core checker) | 60/60 | 100% |
| residency, independent scan (own place table and cue words; shares no code with the checker) | 60/60 | 100% |
| pinned constraints as data (req regions / avoid) | 45/45 | 100% |
| avoided products absent (exclude and retained exclude) | 45/45 | 100% |

Residency checks with a warn-level foreign-region mention (not failed, reviewed by hand): 9. Residency checks where the product's repair turn corrected the main-stream narration: 2. Turns with pinned constraints in memory: 92. Product constraint findings before repair {"constraint-region":{"total":20,"turns":12,"error":4}}, left after repair {"constraint-region":{"total":16,"turns":10,"error":0}}.

## Repairs

| deterministic fix | fixes | turns |
| --- | ---: | ---: |
| containment | 5 | 4 |
| attach-host-missing | 2 | 2 |
| attach-invalid | 2 | 1 |

LLM follow-up turns: 2 ({"repair":2}); turns by finding code {"constraint-region":2}.

| case | run | turn | kind | turn passes | findings |
| --- | ---: | ---: | ---: | ---: | ---: |
| ho-r-zh-no-crossregion | 2 | 2 | repair | yes | constraint-region/error: the why of 'backup' says "为数据库和文件存储提供异地备份" (存储 to another region); the pinned regions are Singapore (ap-southeast-1) ("客户数据必须留在新加坡"); constraint-region/error: a say line sends data to another region ("备份"): "异地备份也只能放在新加坡内"; the pinned  |
| ho-r-zh-no-crossregion | 3 | 2 | repair | yes | constraint-region/error: a say line sends data to another region ("备份"): "为数据库和文件提供可靠的异地可用区级备份保护"; the pinned regions are Singapore (ap-southeast-1) ("客户数据必须留在新加坡"). Correct the narration and keep data in the pinned regi |

## Languages

| language | turns | completion tokens / turn | vs English twin | prompt tokens / turn | say in language | why in language | \u escapes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 96 | 508 | - | 13129 | 96/96 | 0/0 | 0 |
| ko | 21 | 448 | - | 13246 | 21/21 | 18/18 | 0 |
| zh | 15 | 554 | - | 15257 | 15/15 | 14/14 | 0 |

## Multi-turn retention

| case | turns | retention checks passed per turn | run pass |
| --- | ---: | ---: | ---: |
| ho-p1-residency-japan | 3 | 6/6  9/9  6/6 | 100% |
| ho-p1-avoid-es | 2 | 3/3  3/3 | 100% |
| ho-p1-avoid-fc-tempt | 2 | 3/3  3/3 | 100% |
| ho-p1-ko-residency | 2 | 6/6  9/9 | 100% |
| ho-p1-zh-residency | 2 | 6/6  9/9 | 100% |
| ho-r-relax-tokyo | 2 | 6/6  3/3 | 100% |
| ho-r-k8s-lifted | 2 | 3/3  0/0 | 100% |
| ho-r-ko-dr-in-country | 2 | 6/6  6/6 | 100% |
| ho-r-zh-no-crossregion | 2 | 6/6  3/3 | 100% |
| ho-r-ko-avoid-mesh | 2 | 3/3  3/3 | 100% |
| ho-r-malaysia-two | 2 | 6/6  3/3 | 100% |
| ho-r-eu-bloc | 2 | 6/6  3/3 | 100% |
| ho-residency-korea | 3 | 6/6  9/9  9/9 | 100% |
| ho-scale-sae | 2 | 0/0  6/6 | 100% |
| ho-scale-ecs-ok | 2 | 0/0  6/6 | 100% |
| ho-budget-ha | 3 | 3/3  3/3  6/6 | 100% |

## Judge (kimi-k3)

| measure | value |
| --- | ---: |
| runs judged / judge errors | 25 / 0 |
| completeness | 4.72 |
| accuracy | 4.4 |
| rationality | 4.28 |
| readability | 4.6 |
| overall | 4.5 |
| architect would sign off | 92% |
| judge cost | $0.511 |

| category | judged | overall score | sign-off |
| --- | ---: | ---: | ---: |
| multiturn | 11 | 4.523 | 91% |
| pattern | 4 | 4.375 | 100% |
| i18n | 7 | 4.429 | 86% |
| need | 2 | 4.625 | 100% |
| trap | 1 | 5 | 100% |

Every run of the constraint cases: 48 runs judged, sign-off 81%, mean 4.339. (Total judged runs: 57.)

| case | run | judge defects |
| --- | ---: | ---: |
| ho-budget-ha | 3 | app-2 'Blog App Standby' duplicates the already multi-zone SAE app behind the same ALB; SAE scales replicas itself, so a separate standby node is redundant; GTM added for failover but there is only one region/one ALB end |
| ho-r-k8s-lifted | 2 | Stale ALB why text references SAE after migration to ACK; Data edges (cache, db, queue, consume) attach to the cluster node instead of the api/worker pod nodes, blurring which component talks to what; Duplicate cluster-> |
| ho-r-k8s-lifted | 3 | api and workers nodes still use sae instead of being pods/workloads on the ack cluster; alb -> api edge still targets SAE; ALB is not wired as ACK Ingress to the cluster; cluster node has no edges carrying API or worker  |
| ho-r-ko-dr-in-country | 1 | GTM 노드가 페일오버 대상(제2 리전/AZ) 없이 추가되어 실제 동작하지 않는 구성; dns -> gtm 엣지 방향/역할이 모호 (DNS가 GTM으로 해석하는 구조가 아님); ESA(글로벌 엣지)가 개인정보를 한국 밖에서 처리할 수 있다는 점에 대한 언급 없이 '한국 밖으로 나가지 않습니다'라고 단정 |
| ho-r-malaysia-two | 1 | db-replica is in the same VPC/region as the primary database, so a regional failure takes out both; Cross-zone read replica is high availability, not disaster recovery; the user asked for DR; Johor (ap-southeast-8) is av |
| ho-r-malaysia-two | 2 | db-dr is in the same VPC/region as the primary, so a region-level failure takes out both; DR should target Johor (ap-southeast-8), which is in-Malaysia and allowed; Primary RDS is already multi-zone (zones a,b) with stan |
| ho-r-malaysia-two | 3 | db-dr is placed in the same VPC/region (Kuala Lumpur) as the primary, providing no regional disaster recovery; Narration claims 'cross-zone read replica for disaster recovery' which does not satisfy DR against region los |
| ho-r-relax-tokyo | 2 | db-dr node is placed in vpc (Shop VPC in Singapore) while its why-text says it is in Tokyo; the tokyo region group contains no nodes.; No Tokyo VPC/network grouping for the DR replica, so the architecture does not actual |
| ho-scale-sae | 3 | Turn 2 makes no structural or configurational change for the spike; only why texts were edited, so the answer does not demonstrate how 20x is handled.; RDS HA standby does not scale writes; claiming it absorbs 20x order  |

Agreement between the judged run's assertions and the judge's sign-off: 22/25 (88%). Assertions pass and judge yes 22, both no 0, assertions pass but judge no 2, assertions fail but judge yes 1. Mean score of passing runs 4.51, failing runs 4.25, point-biserial r 0.101.

| case | assertions | judge | failed assertions | judge defects |
| --- | ---: | ---: | ---: | ---: |
| ho-p1-vpc-mongo | fail | yes | every attachment names a valid host | Express Connect node drawn inside the VPC; per placement rules it is a vpc-edge/boundary element and should sit at the VPC boundary; Edges route ec->mongo and ec->rds directly, skipping the VPC hop; t |
| ho-r-ko-dr-in-country | pass | no |  | GTM 노드가 페일오버 대상(제2 리전/AZ) 없이 추가되어 실제 동작하지 않는 구성; dns -> gtm 엣지 방향/역할이 모호 (DNS가 GTM으로 해석하는 구조가 아님); ESA(글로벌 엣지)가 개인정보를 한국 밖에서 처리할 수 있다는 점에 대한 언급 없이 '한국 밖으로 나가지 않습니다'라고 단정 |
| ho-r-malaysia-two | pass | no |  | db-replica is in the same VPC/region as the primary database, so a regional failure takes out both; Cross-zone read replica is high availability, not disaster recovery; the user asked for DR; Johor (a |
