# Evaluation summary

Model qwen3.8-max (fallback qwen3.7-max), catalog 2026-10-31 (232 entries), system prompt 59701 chars (sha256 fabd6cb8f349), 3 runs per case, started 2026-10-31T17:46:19.312Z.

## Overall

**pass@1 92%, all 3 runs pass 84%** (25 cases). pass@3 is best-of-3 and is listed last.

| measure | value |
| --- | ---: |
| cases / conversations / turns | 25 / 75 / 132 |
| pass@1 (mean case pass rate) | 92% |
| all runs pass | 84% |
| majority (over half the runs pass) | 92% |
| pass@3 (some run passes) | 100% |
| conversations passing every assertion | 92% |
| turns passing every assertion | 92% |
| assertions passing (1484 checks) | 99% |
| conversations that hit an API failure | 0 |
| list-price cost of the model runs | $1.24 |

## By category

| category | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| multiturn | 11 | 33 | 88% | 82% | 82% | 100% |
| pattern | 4 | 12 | 92% | 75% | 100% | 100% |
| i18n | 7 | 21 | 95% | 86% | 100% | 100% |
| need | 2 | 6 | 100% | 100% | 100% | 100% |
| trap | 1 | 3 | 100% | 100% | 100% | 100% |

## By language

| language | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 18 | 54 | 91% | 83% | 89% | 100% |
| ko | 4 | 12 | 100% | 100% | 100% | 100% |
| zh | 3 | 9 | 89% | 67% | 100% | 100% |

## By assertion type (worst first)

| type | checks | passed | rate | cases that failed it |
| --- | ---: | ---: | ---: | ---: |
| residencyScan | 60 | 55 | 92% | 3 |
| residency | 60 | 57 | 95% | 2 |
| sayLang | 132 | 126 | 96% | 1 |
| retention | 66 | 63 | 96% | 1 |
| req | 42 | 41 | 98% | 1 |
| attachValid | 132 | 131 | 99% | 1 |
| include | 84 | 84 | 100% | 0 |
| region | 51 | 51 | 100% | 0 |
| attach | 6 | 6 | 100% | 0 |
| linked | 6 | 6 | 100% | 0 |
| noErrors | 132 | 132 | 100% | 0 |
| pathOrder | 126 | 126 | 100% | 0 |
| format | 132 | 132 | 100% | 0 |
| escapes | 132 | 132 | 100% | 0 |
| noPrices | 132 | 132 | 100% | 0 |
| exclude | 30 | 30 | 100% | 0 |
| pins | 45 | 45 | 100% | 0 |
| placement | 3 | 3 | 100% | 0 |
| editMinimal | 12 | 12 | 100% | 0 |
| askLang | 20 | 20 | 100% | 0 |
| whyLang | 36 | 36 | 100% | 0 |
| noWarn | 6 | 6 | 100% | 0 |
| primaryRec | 6 | 6 | 100% | 0 |
| size | 27 | 27 | 100% | 0 |
| question | 3 | 3 | 100% | 0 |
| mention | 3 | 3 | 100% | 0 |

## Cases below 100% (4 of 25)

| case | runs passed | what failed |
| --- | ---: | ---: |
| ho-p1-residency-japan | 1/3 | say text in en (2); residency ap-northeast-1 (1); residency scan ap-northeast-1 (1) |
| ho-r-eu-bloc | 1/3 | residency scan eu-central-1/eu-west-1/eu-west-2 (2); residency eu-central-1/eu-west-1/eu-west-2 (1) |
| ho-p1-vpc-mongo | 2/3 | every attachment names a valid host (1) |
| ho-r-zh-no-crossregion | 2/3 | residency scan ap-southeast-1 (1) |

## Warnings before and after deterministic repair

| code | before: total | per turn | turns | after: total | per turn | fixed by repair |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| constraint-region | 20 | 0.152 | 11 | 5 | 0.038 | 0 |
| orphan-node | 16 | 0.121 | 14 | 16 | 0.121 | 0 |
| attach-host-missing | 7 | 0.053 | 5 | 0 | 0 | 1 |
| path-order | 4 | 0.03 | 4 | 1 | 0.008 | 3 |
| unknown-product | 3 | 0.023 | 3 | 0 | 0 | 0 |
| containment | 2 | 0.015 | 2 | 0 | 0 | 2 |
| unknown-id | 1 | 0.008 | 1 | 0 | 0 | 0 |
| constraint-replaced | 0 | 0 | 0 | 7 | 0.053 | 0 |

Severity before repair {"warn":22,"info":17,"error":14}, after {"info":20,"warn":9}. Unknown products: 3 (avoid x3). Product strings that were not catalog ids: 0 (none).

## Latency (main stream)

| measure | n | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| first token (answering attempt) | 132 | 1.23 s | 1.79 s | 2.49 s |
| first token as waited for (failed attempts included) | 132 | 1.23 s | 1.79 s | 2.49 s |
| first say | 132 | 1.50 s | 2.11 s | 2.80 s |
| first op | 132 | 1.93 s | 2.54 s | 3.40 s |
| first node | 125 | 4.15 s | 5.48 s | 6.66 s |
| stream total (all turns) | 132 | 8.47 s | 20.9 s | 26.2 s |
| stream total, new diagrams | 126 | 10.3 s | 20.9 s | 26.2 s |
| stream total, edits | 63 | 5.35 s | 8.43 s | 9.38 s |
| stream total, product answers | 6 | 3.93 s | 4.72 s | 4.89 s |
| whole turn incl. retries and follow-up | 132 | 10.9 s | 20.9 s | 26.2 s |

## Tokens and cost

| measure | value |
| --- | ---: |
| prompt tokens | 2231623 |
| cached prompt tokens | 2102656 (94%) |
| completion tokens | 76343 |
| completion tokens per turn p50 / p95 | 500 / 1125 |
| cost per turn mean / p95 | $0.0094 / $0.0161 |
| cost per conversation mean / p95 | $0.0166 / $0.0280 |
| total | $1.24 |

## Reliability

| counter | value |
| --- | ---: |
| turns | 132 |
| main stream ended without done (truncated) | 0 |
| continuation turns | 0 |
| repair turns | 9 |
| hedged turns / hedge won | 0 / 0 |
| turns that used the fallback model | 0 |
| extra attempts after failures | 0 |
| conversations with an API failure | 0 |
| bad (unparseable) lines | 0 |
| \u escapes | 0 |

## Failover to the fallback model

0 of 132 turns (0%) failed over in the main stream; reasons {}. Follow-up turns that ran on another model: 0.

## Cut-off turns

Main streams that ended without done: 0 ({}). Rescued by the continuation turn: 0 (0 of them pass every assertion); not rescued: 0. Turn pass rate without the rescued turns: 92%.

## Constraint compliance (machine-checked)

| check | passed | rate |
| --- | ---: | ---: |
| residency (final graph and final narration, core checker) | 57/60 | 95% |
| residency, independent scan (own place table and cue words; shares no code with the checker) | 55/60 | 92% |
| pinned constraints as data (req regions / avoid) | 45/45 | 100% |
| avoided products absent (exclude and retained exclude) | 45/45 | 100% |

Residency checks with a warn-level foreign-region mention (not failed, reviewed by hand): 5. Residency checks where the product's repair turn corrected the main-stream narration: 8. Turns with pinned constraints in memory: 92. Product constraint findings before repair {"constraint-region":{"total":20,"turns":11,"error":11}}, left after repair {"constraint-region":{"total":5,"turns":4,"error":0}}.

Independent residency scan hits (read each one: it errs towards flagging):

| case | run | turn | scan finding |
| --- | ---: | ---: | ---: |
| ho-p1-residency-japan | 1 | 2 | group sg: Singapore/ap-southeast-1 in "Singapore (ap-southeast-1)" |
| ho-p1-residency-japan | 1 | 3 | group sg: Singapore/ap-southeast-1 in "Singapore (ap-southeast-1)" |
| ho-r-eu-bloc | 2 | 2 | say : Virginia in "Moved the reporting RDS into the Frankfurt VPC because Virginia is outside the …" |
| ho-r-zh-no-crossregion | 3 | 2 | say : 跨区域 in "所有备份均在新加坡区域内完成，不涉及任何跨区域数据传输" |
| ho-r-eu-bloc | 3 | 2 | say : US in "Personal data must stay in Europe, so the US reporting database and its DTS syn…"; say : Virginia in "Removed the Virginia reporting database and DTS sync because all personal data …" |

| case | run | turn | residency finding |
| --- | ---: | ---: | ---: |
| ho-p1-residency-japan | 1 | 2 | region group 'sg' (Singapore (ap-southeast-1)) is in Singapore (ap-southeast-1) and holds analytics-db, bi; the pinned regions are Tokyo (ap-northeast-1) ("eval residency") / main-stream narration corrected by the repair |
| ho-p1-residency-japan | 1 | 3 | region group 'sg' (Singapore (ap-southeast-1)) is in Singapore (ap-southeast-1) and holds analytics-db, bi; the pinned regions are Tokyo (ap-northeast-1) ("eval residency") |
| ho-r-eu-bloc | 3 | 2 | a say line pairs Virginia (us-east-1) with "sync": "Removed the Virginia reporting database and DTS sync because all personal data must stay …"; the pinned regions are Frankfurt (eu-central-1), London (eu-west-1), Paris  |

## Repairs

| deterministic fix | fixes | turns |
| --- | ---: | ---: |
| attach-invalid | 6 | 4 |
| path-order | 3 | 3 |
| containment | 2 | 2 |
| attach-host-missing | 1 | 1 |

LLM follow-up turns: 9 ({"repair":9}); turns by finding code {"constraint-region":9}.

| case | run | turn | kind | turn passes | findings |
| --- | ---: | ---: | ---: | ---: | ---: |
| ho-p1-residency-japan | 1 | 2 | repair | no | constraint-region/error: region group 'sg' (Singapore (ap-southeast-1)) is in Singapore (ap-southeast-1) and holds analytics-db, bi; the pinned regions are Tokyo (ap-northeast-1) ("All policyholder data must remain physi |
| ho-p1-ko-residency | 1 | 2 | repair | yes | constraint-region/error: 'esa' is labelled "ESA (프랑크푸르트 엣지)", which places it in Frankfurt (eu-central-1); the pinned regions are Seoul (ap-northeast-2) ("이용자 개인정보 해외 반출 금지, 서울 리전 필수"); constraint-region/warn: a say line names Frankfurt (eu-central-1): "프랑크푸르트 |
| ho-r-zh-no-crossregion | 1 | 2 | repair | yes | constraint-region/error: the why of 'backup' says "为RDS和OSS提供异地可用区级别的备份保护" (备份 to another region); the pinned regions are Singapore (ap-southeast-1) ("客户数据必须留在新加坡"); constraint-region/error: a say line sends data to another region ("备份"): "异地备份也受此约束"; the pinn |
| ho-r-eu-bloc | 1 | 2 | repair | yes | constraint-region/error: the why of 'dts' says "Nightly ETL extracts non-personal metrics for US reporting" (extracts to Virginia (us-east-1), Silicon Valley (us-west-1)); the pinned regions are Frankfurt (eu-central-1),; constraint-region/warn: a say line nam |
| ho-p1-ko-residency | 2 | 2 | repair | yes | constraint-region/error: the why of 'ga' says "유럽 등 해외 플레이어 트래픽을 알리바바 백본으로 서울 ALB까지 저지연 전송" (전송 to Frankfurt (eu-central-1), London (eu-west-1), Paris (eu-west-2), Amsterdam (eu-west-3)); the pinned regions are Seoul (ap; constraint-region/warn: a say line nam |
| ho-r-zh-no-crossregion | 2 | 2 | repair | yes | constraint-region/error: a say line sends data to another region ("备份"): "异地备份也只能放在新加坡区域内的不同可用区"; the pinned regions are Singapore (ap-southeast-1) ("客户数据必须留在新加坡"). Correct the narration and keep data in the pinned regio |
| ho-r-eu-bloc | 2 | 2 | repair | no | constraint-region/error: region group 'us-region' (Virginia (us-east-1)) is in Virginia (us-east-1) and holds report-db; the pinned regions are Frankfurt (eu-central-1), London (eu-west-1), Paris (eu-west-2) ("All person; constraint-region/warn: a say line nam |
| ho-r-zh-no-crossregion | 3 | 2 | repair | no | constraint-region/error: a say line sends data to another region ("备份"): "异地备份也属于数据存储"; the pinned regions are Singapore (ap-southeast-1) ("客户数据必须留在新加坡"). Correct the narration and keep data in the pinned region |
| ho-r-eu-bloc | 3 | 2 | repair | no | constraint-region/error: region group 'us' (Virginia (us-east-1)) is in Virginia (us-east-1) and holds reporting-db; the pinned regions are Frankfurt (eu-central-1), London (eu-west-1), Paris (eu-west-2) ("All personal d; constraint-region/error: the why of 'd |

## Languages

| language | turns | completion tokens / turn | vs English twin | prompt tokens / turn | say in language | why in language | \u escapes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 96 | 582 | - | 16409 | 90/96 | 0/0 | 0 |
| ko | 21 | 526 | - | 17463 | 21/21 | 21/21 | 0 |
| zh | 15 | 628 | - | 19308 | 15/15 | 15/15 | 0 |

## Multi-turn retention

| case | turns | retention checks passed per turn | run pass |
| --- | ---: | ---: | ---: |
| ho-p1-residency-japan | 3 | 5/6  6/9  4/6 | 33% |
| ho-p1-avoid-es | 2 | 3/3  3/3 | 100% |
| ho-p1-avoid-fc-tempt | 2 | 3/3  3/3 | 100% |
| ho-p1-ko-residency | 2 | 6/6  9/9 | 100% |
| ho-p1-zh-residency | 2 | 6/6  9/9 | 100% |
| ho-r-relax-tokyo | 2 | 6/6  3/3 | 100% |
| ho-r-k8s-lifted | 2 | 3/3  0/0 | 100% |
| ho-r-ko-dr-in-country | 2 | 6/6  6/6 | 100% |
| ho-r-zh-no-crossregion | 2 | 6/6  3/3 | 67% |
| ho-r-ko-avoid-mesh | 2 | 3/3  3/3 | 100% |
| ho-r-malaysia-two | 2 | 6/6  3/3 | 100% |
| ho-r-eu-bloc | 2 | 6/6  2/3 | 33% |
| ho-residency-korea | 3 | 6/6  9/9  9/9 | 100% |
| ho-scale-sae | 2 | 0/0  6/6 | 100% |
| ho-scale-ecs-ok | 2 | 0/0  6/6 | 100% |
| ho-budget-ha | 3 | 3/3  3/3  6/6 | 100% |

## Judge (kimi-k3)

| measure | value |
| --- | ---: |
| runs judged / judge errors | 25 / 0 |
| completeness | 4.48 |
| accuracy | 4.36 |
| rationality | 4.16 |
| readability | 4.36 |
| overall | 4.34 |
| architect would sign off | 92% |
| judge cost | $0.563 |

| category | judged | overall score | sign-off |
| --- | ---: | ---: | ---: |
| multiturn | 11 | 4.25 | 82% |
| pattern | 4 | 4.25 | 100% |
| i18n | 7 | 4.5 | 100% |
| need | 2 | 4.125 | 100% |
| trap | 1 | 5 | 100% |

Every run of the constraint cases: 48 runs judged, sign-off 81%, mean 4.229. (Total judged runs: 57.)

| case | run | judge defects |
| --- | ---: | ---: |
| ho-budget-ha | 1 | GTM added for single-region resilience adds cost and complexity with no second region to fail over to; GTM->ALB resolve edge is dubious since ALB is behind the same DNS; Read replica presented as resilience but no failov |
| ho-budget-ha | 3 | Turn 3 claims 'improve resilience' but adds no redundancy: web tier still effectively single-instance (ESS min 1), RDS multi-zone HA not explicitly called out as the fix for the outage.; NAT Gateway adds monthly cost wit |
| ho-r-k8s-lifted | 2 | api and workers nodes use product ecs while their why-text says they run on ACK; they should be workloads on the ack node (or the cluster node should own them), not standalone ECS instances.; Redundant hop: alb -> cluste |
| ho-r-k8s-lifted | 3 | api and workers drawn as ecs nodes labeled 'node pool' rather than workloads within the ACK cluster; ACK node pools are not standalone ECS nodes in the diagram.; alb -> cluster edge is imprecise: ALB (as ACK Ingress) sho |
| ho-r-malaysia-two | 1 | db-dr placed in the same VPC in ap-southeast-3; DR copy should be in Johor (ap-southeast-8) with cross-region replication; 'Cross-zone standby' is redundant with the existing multi-zone RDS HA (zones a,b) and mislabels H |
| ho-r-malaysia-two | 2 | db-dr is in the same VPC in ap-southeast-3; true DR should be a second RDS (or DTS replica) in Johor ap-southeast-8 with a cross-region link; No cross-region connectivity or replication path shown (e.g., DTS or CEN betwe |
| ho-r-malaysia-two | 3 | db-dr is placed in the same VPC/region (Kuala Lumpur) as the primary; a regional outage takes out both, so this is HA, not disaster recovery; Johor (ap-southeast-8) is an open Malaysian region and should host the DR copy |
| ho-residency-korea | 3 | GTM node with 'failover if Seoul region degrades' suggests cross-region DR, violating the pinned residency rule; no second Korean region exists on Alibaba Cloud, so this should be removed or reframed as in-Seoul multi-zo |
| ho-scale-sae | 3 | Narration says 'RDS and Tair scale automatically' but RDS read replicas and Tair cluster mode must be provisioned; the diagram gives no indication replicas or cluster shards were actually added; No SAE autoscaling bounds |

Agreement between the judged run's assertions and the judge's sign-off: 22/25 (88%). Assertions pass and judge yes 22, both no 0, assertions pass but judge no 2, assertions fail but judge yes 1. Mean score of passing runs 4.313, failing runs 5, point-biserial r -0.267.

| case | assertions | judge | failed assertions | judge defects |
| --- | ---: | ---: | ---: | ---: |
| ho-p1-residency-japan | fail | yes | say text in en; residency ap-northeast-1; residency scan ap-northeast-1; regions only tokyo/ap-northeast-1 |  |
| ho-r-malaysia-two | pass | no |  | db-dr placed in the same VPC in ap-southeast-3; DR copy should be in Johor (ap-southeast-8) with cross-region replication; 'Cross-zone standby' is redundant with the existing multi-zone RDS HA (zones  |
| ho-budget-ha | pass | no |  | GTM added for single-region resilience adds cost and complexity with no second region to fail over to; GTM->ALB resolve edge is dubious since ALB is behind the same DNS; Read replica presented as resi |
