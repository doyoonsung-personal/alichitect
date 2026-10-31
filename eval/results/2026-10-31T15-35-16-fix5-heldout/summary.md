# Evaluation summary

Model qwen3.8-max (fallback qwen3.7-max), catalog 2026-10-31 (223 entries), system prompt 49687 chars (sha256 ad75dbaaa9c2), 3 runs per case, started 2026-10-31T15:35:16.753Z.

## Overall

**pass@1 89%, all 3 runs pass 76%** (25 cases). pass@3 is best-of-3 and is listed last.

| measure | value |
| --- | ---: |
| cases / conversations / turns | 25 / 75 / 132 |
| pass@1 (mean case pass rate) | 89% |
| all runs pass | 76% |
| majority (over half the runs pass) | 92% |
| pass@3 (some run passes) | 100% |
| conversations passing every assertion | 89% |
| turns passing every assertion | 94% |
| assertions passing (1462 checks) | 99% |
| conversations that hit an API failure | 0 |
| list-price cost of the model runs | $1.04 |

## By category

| category | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| multiturn | 11 | 33 | 94% | 82% | 100% | 100% |
| pattern | 4 | 12 | 83% | 75% | 75% | 100% |
| i18n | 7 | 21 | 86% | 71% | 86% | 100% |
| need | 2 | 6 | 83% | 50% | 100% | 100% |
| trap | 1 | 3 | 100% | 100% | 100% | 100% |

## By language

| language | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 18 | 54 | 91% | 78% | 94% | 100% |
| ko | 4 | 12 | 92% | 75% | 100% | 100% |
| zh | 3 | 9 | 78% | 67% | 67% | 100% |

## By assertion type (worst first)

| type | checks | passed | rate | cases that failed it |
| --- | ---: | ---: | ---: | ---: |
| question | 3 | 2 | 67% | 1 |
| noWarn | 6 | 5 | 83% | 1 |
| residency | 60 | 58 | 97% | 2 |
| residencyScan | 60 | 58 | 97% | 1 |
| attachValid | 132 | 130 | 99% | 1 |
| noErrors | 132 | 131 | 99% | 1 |
| include | 84 | 84 | 100% | 0 |
| region | 51 | 51 | 100% | 0 |
| placement | 3 | 3 | 100% | 0 |
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
| editMinimal | 12 | 12 | 100% | 0 |
| retention | 66 | 66 | 100% | 0 |
| whyLang | 34 | 34 | 100% | 0 |
| primaryRec | 6 | 6 | 100% | 0 |
| size | 27 | 27 | 100% | 0 |
| mention | 3 | 3 | 100% | 0 |

## Cases below 100% (6 of 25)

| case | runs passed | what failed |
| --- | ---: | ---: |
| ho-p1-vpc-mongo | 1/3 | every attachment names a valid host (2) |
| ho-r-zh-no-crossregion | 1/3 | residency scan ap-southeast-1 (2) |
| ho-p1-ko-residency | 2/3 | residency ap-northeast-2 (1) |
| ho-r-k8s-lifted | 2/3 | no constraint-avoid before repair (1); no error-level warnings after repair (1) |
| ho-r-eu-bloc | 2/3 | residency eu-central-1/eu-west-1/eu-west-2 (1) |
| ho-team-agent-b | 2/3 | asks a question (1) |

## Warnings before and after deterministic repair

| code | before: total | per turn | turns | after: total | per turn | fixed by repair |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| orphan-node | 28 | 0.212 | 24 | 27 | 0.205 | 0 |
| constraint-region | 20 | 0.152 | 12 | 14 | 0.106 | 0 |
| containment | 8 | 0.061 | 8 | 0 | 0 | 8 |
| unknown-id | 7 | 0.053 | 1 | 0 | 0 | 0 |
| attach-host-missing | 5 | 0.038 | 4 | 0 | 0 | 2 |
| path-order | 4 | 0.03 | 4 | 1 | 0.008 | 3 |
| unknown-product | 2 | 0.015 | 2 | 0 | 0 | 0 |
| dns-in-path | 2 | 0.015 | 1 | 0 | 0 | 2 |
| constraint-avoid | 1 | 0.008 | 1 | 1 | 0.008 | 0 |
| constraint-replaced | 0 | 0 | 0 | 5 | 0.038 | 0 |

Severity before repair {"info":35,"warn":29,"error":13}, after {"info":31,"warn":16,"error":1}. Unknown products: 2 (ap-south-1 x1, avoid x1). Product strings that were not catalog ids: 0 (none).

## Latency (main stream)

| measure | n | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| first token (answering attempt) | 132 | 1.10 s | 1.56 s | 1.81 s |
| first token as waited for (failed attempts included) | 132 | 1.10 s | 1.56 s | 1.81 s |
| first say | 132 | 1.41 s | 1.89 s | 2.13 s |
| first op | 132 | 1.91 s | 2.40 s | 2.98 s |
| first node | 123 | 3.62 s | 4.58 s | 5.58 s |
| stream total (all turns) | 132 | 8.19 s | 18.6 s | 23.3 s |
| stream total, new diagrams | 126 | 10.9 s | 18.6 s | 23.3 s |
| stream total, edits | 63 | 4.61 s | 7.83 s | 10.4 s |
| stream total, product answers | 6 | 4.30 s | 5.23 s | 5.23 s |
| whole turn incl. retries and follow-up | 132 | 9.12 s | 18.6 s | 23.3 s |

## Tokens and cost

| measure | value |
| --- | ---: |
| prompt tokens | 1795812 |
| cached prompt tokens | 1682432 (94%) |
| completion tokens | 65279 |
| completion tokens per turn p50 / p95 | 390 / 943 |
| cost per turn mean / p95 | $0.0079 / $0.0106 |
| cost per conversation mean / p95 | $0.0138 / $0.0234 |
| total | $1.04 |

## Reliability

| counter | value |
| --- | ---: |
| turns | 132 |
| main stream ended without done (truncated) | 0 |
| continuation turns | 0 |
| repair turns | 4 |
| hedged turns / hedge won | 0 / 0 |
| turns that used the fallback model | 0 |
| extra attempts after failures | 0 |
| conversations with an API failure | 0 |
| bad (unparseable) lines | 0 |
| \u escapes | 0 |

## Failover to the fallback model

0 of 132 turns (0%) failed over in the main stream; reasons {}. Follow-up turns that ran on another model: 0.

## Cut-off turns

Main streams that ended without done: 0 ({}). Rescued by the continuation turn: 0 (0 of them pass every assertion); not rescued: 0. Turn pass rate without the rescued turns: 94%.

## Constraint compliance (machine-checked)

| check | passed | rate |
| --- | ---: | ---: |
| residency (final graph and final narration, core checker) | 58/60 | 97% |
| residency, independent scan (own place table and cue words; shares no code with the checker) | 58/60 | 97% |
| pinned constraints as data (req regions / avoid) | 45/45 | 100% |
| avoided products absent (exclude and retained exclude) | 45/45 | 100% |

Residency checks with a warn-level foreign-region mention (not failed, reviewed by hand): 9. Residency checks where the product's repair turn corrected the main-stream narration: 3. Turns with pinned constraints in memory: 94. Product constraint findings before repair {"constraint-region":{"total":20,"turns":12,"error":5},"constraint-avoid":{"total":1,"turns":1,"error":1}}, left after repair {"constraint-region":{"total":14,"turns":10,"error":0},"constraint-avoid":{"total":1,"turns":1,"error":1}}.

Independent residency scan hits (read each one: it errs towards flagging):

| case | run | turn | scan finding |
| --- | ---: | ---: | ---: |
| ho-r-zh-no-crossregion | 2 | 2 | say : 跨区域 in "修正：备份仅在新加坡区域内完成，不涉及跨区域" |
| ho-r-zh-no-crossregion | 3 | 2 | say : 跨区域 in "备份仅在新加坡区域内的不同可用区之间进行，不涉及跨区域" |

| case | run | turn | residency finding |
| --- | ---: | ---: | ---: |
| ho-p1-ko-residency | 1 | 1 | a say line sends data to another region ("배치"): "RDS를 배치하여 개인정보 해외 반출을 방지했습니다"; the pinned regions are Seoul (ap-northeast-2) ("eval residency"). Correct the narration and keep data in the pinned region |
| ho-r-eu-bloc | 2 | 2 | a say line pairs Virginia (us-east-1) with "copy": "a Virginia copy would violate the pinned GDPR residency rule"; the pinned regions are Frankfurt (eu-central-1), London (eu-west-1), Paris (eu-west-2) ("eval residency") |

## Repairs

| deterministic fix | fixes | turns |
| --- | ---: | ---: |
| containment | 8 | 8 |
| path-order | 3 | 3 |
| attach-invalid | 3 | 2 |
| attach-host-missing | 2 | 2 |
| dns-in-path | 2 | 1 |

LLM follow-up turns: 4 ({"repair":4}); turns by finding code {"constraint-region":3,"constraint-avoid":1}.

| case | run | turn | kind | turn passes | findings |
| --- | ---: | ---: | ---: | ---: | ---: |
| ho-p1-ko-residency | 1 | 2 | repair | yes | constraint-region/error: the why of 'ga' says "유럽 플레이어 트래픽을 알리바바 백본으로 서울 리전까지 빠르게 전달" (전달 to Frankfurt (eu-central-1), London (eu-west-1), Paris (eu-west-2), Amsterdam (eu-west-3)); the pinned regions are Seoul (ap-north; constraint-region/warn: a say line nam |
| ho-r-zh-no-crossregion | 2 | 2 | repair | no | constraint-region/error: the why of 'backup' says "在新加坡区域内为数据库和文件提供异地备份与容灾" (备份 to another region); the pinned regions are Singapore (ap-southeast-1) ("客户数据必须留在新加坡"); constraint-region/error: a say line sends data to another region ("备份"): "我改为在新加坡内增加跨区域备份方案"; |
| ho-r-k8s-lifted | 3 | 2 | repair | no | constraint-avoid/error: 'cluster' uses ack, which the user ruled out ("No Kubernetes skills, keep design free of Kubernetes"); replace or remove it |
| ho-r-zh-no-crossregion | 3 | 2 | repair | no | constraint-region/error: the why of 'backup' says "在新加坡区域内为数据库和文件提供异地可用区备份" (备份 to another region); the pinned regions are Singapore (ap-southeast-1) ("客户数据必须留在新加坡"); constraint-region/error: a say line sends data to another region ("备份"): "跨区域备份会违反此要求"; the p |

## Languages

| language | turns | completion tokens / turn | vs English twin | prompt tokens / turn | say in language | why in language | \u escapes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 96 | 495 | - | 13273 | 96/96 | 0/0 | 0 |
| ko | 21 | 446 | - | 13943 | 21/21 | 19/19 | 0 |
| zh | 15 | 563 | - | 15250 | 15/15 | 15/15 | 0 |

## Multi-turn retention

| case | turns | retention checks passed per turn | run pass |
| --- | ---: | ---: | ---: |
| ho-p1-residency-japan | 3 | 6/6  9/9  6/6 | 100% |
| ho-p1-avoid-es | 2 | 3/3  3/3 | 100% |
| ho-p1-avoid-fc-tempt | 2 | 3/3  3/3 | 100% |
| ho-p1-ko-residency | 2 | 5/6  9/9 | 67% |
| ho-p1-zh-residency | 2 | 6/6  9/9 | 100% |
| ho-r-relax-tokyo | 2 | 6/6  3/3 | 100% |
| ho-r-k8s-lifted | 2 | 3/3  0/0 | 67% |
| ho-r-ko-dr-in-country | 2 | 6/6  6/6 | 100% |
| ho-r-zh-no-crossregion | 2 | 6/6  3/3 | 33% |
| ho-r-ko-avoid-mesh | 2 | 3/3  3/3 | 100% |
| ho-r-malaysia-two | 2 | 6/6  3/3 | 100% |
| ho-r-eu-bloc | 2 | 6/6  2/3 | 67% |
| ho-residency-korea | 3 | 6/6  9/9  9/9 | 100% |
| ho-scale-sae | 2 | 0/0  6/6 | 100% |
| ho-scale-ecs-ok | 2 | 0/0  6/6 | 100% |
| ho-budget-ha | 3 | 3/3  3/3  6/6 | 100% |

## Judge (kimi-k3)

| measure | value |
| --- | ---: |
| runs judged / judge errors | 25 / 0 |
| completeness | 4.8 |
| accuracy | 4.36 |
| rationality | 4.28 |
| readability | 4.56 |
| overall | 4.5 |
| architect would sign off | 96% |
| judge cost | $0.501 |

| category | judged | overall score | sign-off |
| --- | ---: | ---: | ---: |
| multiturn | 11 | 4.386 | 91% |
| pattern | 4 | 4.25 | 100% |
| i18n | 7 | 4.714 | 100% |
| need | 2 | 4.625 | 100% |
| trap | 1 | 5 | 100% |

Every run of the constraint cases: 48 runs judged, sign-off 85%, mean 4.406. (Total judged runs: 57.)

| case | run | judge defects |
| --- | ---: | ---: |
| ho-budget-ha | 3 | Narration claims the outage was caused by attacks ('Blocks attacks that caused the outage') with no evidence from the user; resilience fix should focus on redundancy/health checks; SAE app node has no zones [a,b] while A |
| ho-p1-avoid-fc-tempt | 2 | Tair used as a notification queue is a product-role mismatch; a real message queue (MNS/RocketMQ) or OSS event notification feeding ECS workers is the correct pattern; No edge from OSS (images) to the notification mechan |
| ho-p1-zh-residency | 3 | GTM用于同地域可用区间切换不恰当：GTM是跨区域DNS故障转移产品，可用区级故障应由ALB/RDS多可用区架构自身吸收，且'users -> gtm (HTTPS)'与'dns -> gtm (resolve)'、'gtm -> esa (resolve)'构成混乱的解析链; DTS跨可用区同步RDS副本与RDS自带的主备双活（zones a,b）功能重复，属于多余组件; 叙述称'全局流量管理器实现故障自动切换'，但同地域场景下GTM |
| ho-r-k8s-lifted | 3 | api and worker nodes use product ecs but are described as pods running on ACK; they should be workloads on the ack cluster, not standalone ECS instances.; ALB why text still references SAE ('Routes HTTPS requests to SAE' |
| ho-r-malaysia-two | 1 | db-dr is placed in the same VPC in ap-southeast-3; DR should target the second Malaysian region Johor (ap-southeast-8) with cross-region replication.; 'Cross-zone standby' duplicates the existing multi-zone HA (db alread |
| ho-r-malaysia-two | 2 | db-dr is in the same vpc in ap-southeast-3; DR should target Johor (ap-southeast-8), the other Malaysian region, to satisfy regional disaster recovery while keeping data in Malaysia; RDS node already has zones a,b HA sta |
| ho-r-malaysia-two | 3 | db-dr is in the same VPC in ap-southeast-3; true DR requires a second region (Johor ap-southeast-8) with its own VPC; Narration claims 'cross-zone read replica' is disaster recovery, but the primary already has zone-leve |

Agreement between the judged run's assertions and the judge's sign-off: 22/25 (88%). Assertions pass and judge yes 22, both no 0, assertions pass but judge no 1, assertions fail but judge yes 2. Mean score of passing runs 4.489, failing runs 4.625, point-biserial r -0.082.

| case | assertions | judge | failed assertions | judge defects |
| --- | ---: | ---: | ---: | ---: |
| ho-p1-vpc-mongo | fail | yes | every attachment names a valid host | Express Connect is a vpc-edge/boundary service but is placed inside the VPC group; PrivateZone should be a badge on the VPC, not a standalone node in the region; Narration is very brief; doesn't menti |
| ho-p1-ko-residency | fail | yes | residency ap-northeast-2 |  |
| ho-r-malaysia-two | pass | no |  | db-dr is placed in the same VPC in ap-southeast-3; DR should target the second Malaysian region Johor (ap-southeast-8) with cross-region replication.; 'Cross-zone standby' duplicates the existing mult |
