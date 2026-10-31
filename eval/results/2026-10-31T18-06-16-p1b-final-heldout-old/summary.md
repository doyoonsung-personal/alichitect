# Evaluation summary

Model qwen3.8-max (fallback qwen3.7-max), catalog 2026-10-31 (232 entries), system prompt 59711 chars (sha256 290480d0a20b), 3 runs per case, started 2026-10-31T18:06:16.344Z.

## Overall

**pass@1 91%, all 3 runs pass 80%** (25 cases). pass@3 is best-of-3 and is listed last.

| measure | value |
| --- | ---: |
| cases / conversations / turns | 25 / 75 / 132 |
| pass@1 (mean case pass rate) | 91% |
| all runs pass | 80% |
| majority (over half the runs pass) | 92% |
| pass@3 (some run passes) | 100% |
| conversations passing every assertion | 91% |
| turns passing every assertion | 94% |
| assertions passing (1484 checks) | 99% |
| conversations that hit an API failure | 0 |
| list-price cost of the model runs | $1.39 |

## By category

| category | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| multiturn | 11 | 33 | 94% | 82% | 100% | 100% |
| pattern | 4 | 12 | 83% | 75% | 75% | 100% |
| i18n | 7 | 21 | 86% | 71% | 86% | 100% |
| need | 2 | 6 | 100% | 100% | 100% | 100% |
| trap | 1 | 3 | 100% | 100% | 100% | 100% |

## By language

| language | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 18 | 54 | 93% | 83% | 94% | 100% |
| ko | 4 | 12 | 92% | 75% | 100% | 100% |
| zh | 3 | 9 | 78% | 67% | 67% | 100% |

## By assertion type (worst first)

| type | checks | passed | rate | cases that failed it |
| --- | ---: | ---: | ---: | ---: |
| residencyScan | 60 | 54 | 90% | 4 |
| residency | 60 | 55 | 92% | 3 |
| noErrors | 132 | 129 | 98% | 2 |
| attachValid | 132 | 130 | 99% | 1 |
| exclude | 30 | 30 | 100% | 0 |
| req | 42 | 42 | 100% | 0 |
| pins | 45 | 45 | 100% | 0 |
| pathOrder | 126 | 126 | 100% | 0 |
| format | 132 | 132 | 100% | 0 |
| escapes | 132 | 132 | 100% | 0 |
| noPrices | 132 | 132 | 100% | 0 |
| sayLang | 132 | 132 | 100% | 0 |
| include | 84 | 84 | 100% | 0 |
| retention | 66 | 66 | 100% | 0 |
| region | 51 | 51 | 100% | 0 |
| attach | 6 | 6 | 100% | 0 |
| linked | 6 | 6 | 100% | 0 |
| placement | 3 | 3 | 100% | 0 |
| editMinimal | 12 | 12 | 100% | 0 |
| askLang | 21 | 21 | 100% | 0 |
| whyLang | 35 | 35 | 100% | 0 |
| noWarn | 6 | 6 | 100% | 0 |
| primaryRec | 6 | 6 | 100% | 0 |
| size | 27 | 27 | 100% | 0 |
| question | 3 | 3 | 100% | 0 |
| mention | 3 | 3 | 100% | 0 |

## Cases below 100% (5 of 25)

| case | runs passed | what failed |
| --- | ---: | ---: |
| ho-p1-vpc-mongo | 1/3 | every attachment names a valid host (2) |
| ho-r-zh-no-crossregion | 1/3 | residency ap-southeast-1 (2); residency scan ap-southeast-1 (2) |
| ho-p1-residency-japan | 2/3 | residency ap-northeast-1 (1); residency scan ap-northeast-1 (1); no error-level warnings after repair (1) |
| ho-p1-ko-residency | 2/3 | residency scan ap-northeast-2 (1) |
| ho-r-eu-bloc | 2/3 | residency eu-central-1/eu-west-1/eu-west-2 (1); residency scan eu-central-1/eu-west-1/eu-west-2 (1); no error-level warnings after repair (1) |

## Warnings before and after deterministic repair

| code | before: total | per turn | turns | after: total | per turn | fixed by repair |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| constraint-region | 25 | 0.189 | 14 | 14 | 0.106 | 0 |
| orphan-node | 23 | 0.174 | 17 | 21 | 0.159 | 0 |
| containment | 14 | 0.106 | 10 | 0 | 0 | 14 |
| attach-host-missing | 4 | 0.03 | 4 | 0 | 0 | 2 |
| path-order | 2 | 0.015 | 2 | 0 | 0 | 2 |
| unknown-product | 2 | 0.015 | 2 | 0 | 0 | 0 |
| constraint-replaced | 0 | 0 | 0 | 6 | 0.045 | 0 |

Severity before repair {"warn":29,"error":22,"info":19}, after {"info":23,"warn":15,"error":3}. Unknown products: 2 (avoid x2). Product strings that were not catalog ids: 0 (none).

## Latency (main stream)

| measure | n | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| first token (answering attempt) | 132 | 1.31 s | 1.83 s | 2.24 s |
| first token as waited for (failed attempts included) | 132 | 1.32 s | 2.06 s | 10.2 s |
| first say | 132 | 1.58 s | 2.10 s | 2.50 s |
| first op | 132 | 2.00 s | 2.50 s | 3.04 s |
| first node | 125 | 4.13 s | 5.65 s | 6.23 s |
| stream total (all turns) | 132 | 8.93 s | 20.4 s | 26.7 s |
| stream total, new diagrams | 126 | 11.2 s | 20.4 s | 26.7 s |
| stream total, edits | 63 | 5.12 s | 8.57 s | 20.0 s |
| stream total, product answers | 6 | 4.13 s | 5.03 s | 5.17 s |
| whole turn incl. retries and follow-up | 132 | 11.3 s | 20.5 s | 26.7 s |

## Tokens and cost

| measure | value |
| --- | ---: |
| prompt tokens | 2235197 |
| cached prompt tokens | 2081152 (93%) |
| completion tokens | 78385 |
| completion tokens per turn p50 / p95 | 472 / 1166 |
| cost per turn mean / p95 | $0.0105 / $0.0168 |
| cost per conversation mean / p95 | $0.0185 / $0.0439 |
| total | $1.39 |

## Reliability

| counter | value |
| --- | ---: |
| turns | 132 |
| main stream ended without done (truncated) | 0 |
| continuation turns | 0 |
| repair turns | 9 |
| hedged turns / hedge won | 0 / 0 |
| turns that used the fallback model | 4 |
| extra attempts after failures | 4 |
| conversations with an API failure | 0 |
| bad (unparseable) lines | 0 |
| \u escapes | 0 |

## Failover to the fallback model

4 of 132 turns (3%) failed over in the main stream; reasons {"first-byte-timeout":4}. Follow-up turns that ran on another model: 0.

| measure | n | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| stalled attempt before failover | 4 | 8.17 s | 8.21 s | 8.21 s |
| fallback first token | 4 | 1.48 s | 1.96 s | 2.03 s |
| first token as waited for | 4 | 9.64 s | 10.2 s | 10.2 s |
| whole turn | 4 | 17.4 s | 23.3 s | 23.5 s |

## Cut-off turns

Main streams that ended without done: 0 ({}). Rescued by the continuation turn: 0 (0 of them pass every assertion); not rescued: 0. Turn pass rate without the rescued turns: 94%.

## Constraint compliance (machine-checked)

| check | passed | rate |
| --- | ---: | ---: |
| residency (final graph and final narration, core checker) | 55/60 | 92% |
| residency, independent scan (own place table and cue words; shares no code with the checker) | 54/60 | 90% |
| pinned constraints as data (req regions / avoid) | 45/45 | 100% |
| avoided products absent (exclude and retained exclude) | 45/45 | 100% |

Residency checks with a warn-level foreign-region mention (not failed, reviewed by hand): 9. Residency checks where the product's repair turn corrected the main-stream narration: 7. Turns with pinned constraints in memory: 94. Product constraint findings before repair {"constraint-region":{"total":25,"turns":14,"error":12}}, left after repair {"constraint-region":{"total":14,"turns":10,"error":3}}.

Independent residency scan hits (read each one: it errs towards flagging):

| case | run | turn | scan finding |
| --- | ---: | ---: | ---: |
| ho-p1-ko-residency | 1 | 2 | say : 유럽 in "GA는 유럽 진입 지점을 사용하지만 모든 데이터 처리와 저장은 서울 리전에서만 이루어져 요건을 충족합니다" |
| ho-r-eu-bloc | 1 | 2 | say dts: US in "Runs in Frankfurt to extract and anonymize HR data nightly for US reporting" |
| ho-p1-residency-japan | 2 | 2 | node sg-analytics: SG in "SG analytics team" |
| ho-p1-residency-japan | 2 | 3 | say sg-analytics: Singapore in "Singapore-based analysts reading the Tokyo replica over Express Connect" |
| ho-r-zh-no-crossregion | 2 | 2 | say : 跨区域 in "已移除跨区域备份节点，改用新加坡区域内的Cloud Backup进行灾备，满足数据驻留要求" |
| ho-r-zh-no-crossregion | 3 | 2 | say : 异地 in "因数据驻留约束，异地备份保持在新加坡区域内，通过RDS多可用区和OSS区域冗余保障数据安全" |

| case | run | turn | residency finding |
| --- | ---: | ---: | ---: |
| ho-r-eu-bloc | 1 | 2 | the why of 'dts' says "Runs in Frankfurt to extract and anonymize HR data nightly for US reporting" (extract to Virginia (us-east-1), Silicon Valley (us-west-1)); the pinned regions are Frankfurt (eu-central-1), London ( |
| ho-p1-residency-japan | 2 | 2 | 'sg-analytics' is labelled "SG analytics team", which places it in Singapore (ap-southeast-1); the pinned regions are Tokyo (ap-northeast-1) ("eval residency") / main-stream narration corrected by the repair turn |
| ho-p1-residency-japan | 2 | 3 | the why of 'sg-analytics' says "Singapore-based analysts reading the Tokyo replica over Express Connect" (replica to Singapore (ap-southeast-1)); the pinned regions are Tokyo (ap-northeast-1) ("eval residency") / warn (n |
| ho-r-zh-no-crossregion | 2 | 2 | a say line sends data to another region ("备份"): "已移除跨区域备份节点"; the pinned regions are Singapore (ap-southeast-1) ("eval residency"). Correct the narration and keep data in the pinned region / main-stream narration correct |
| ho-r-zh-no-crossregion | 3 | 2 | a say line sends data to another region ("备份"): "异地备份保持在新加坡区域内"; the pinned regions are Singapore (ap-southeast-1) ("eval residency"). Correct the narration and keep data in the pinned region |

## Repairs

| deterministic fix | fixes | turns |
| --- | ---: | ---: |
| containment | 14 | 10 |
| path-order | 2 | 2 |
| attach-invalid | 2 | 2 |
| attach-host-missing | 2 | 2 |

LLM follow-up turns: 9 ({"repair":9}); turns by finding code {"constraint-region":9,"orphan-node":2}.

| case | run | turn | kind | turn passes | findings |
| --- | ---: | ---: | ---: | ---: | ---: |
| ho-p1-ko-residency | 1 | 2 | repair | no | constraint-region/error: the why of 'ga' says "유럽 플레이어 트래픽을 알리바바 백본으로 서울 리전까지 저지연 전달" (전달 to Frankfurt (eu-central-1), London (eu-west-1), Paris (eu-west-2), Amsterdam (eu-west-3)); the pinned regions are Seoul (ap-north; constraint-region/warn: a say line nam |
| ho-p1-zh-residency | 1 | 2 | repair | yes | orphan-node/warn: 'nat' (nat) has no connections; constraint-region/error: a say line sends data to another region ("容灾"): "因此异地容灾不能跨地域"; the pinned regions are Hong Kong (cn-hongkong) ("所有客户数据必须留在香港境内，不能出境"). Correct the narration and keep data in the pinned  |
| ho-r-zh-no-crossregion | 1 | 2 | repair | yes | constraint-region/error: the why of 'backup' says "为RDS数据库和OSS文件提供跨区域备份与灾难恢复" (备份 to another region); the pinned regions are Singapore (ap-southeast-1) ("客户数据必须留在新加坡") |
| ho-r-eu-bloc | 1 | 2 | repair | no | constraint-region/error: the why of 'dts' says "Extracts and anonymizes HR data nightly for US reporting without moving personal data" (Extracts to Virginia (us-east-1), Silicon Valley (us-west-1)); the pinned regions ar; constraint-region/warn: a say line nam |
| ho-p1-residency-japan | 2 | 2 | repair | no | constraint-region/error: 'sg-analytics' is labelled "SG analytics team", which places it in Singapore (ap-southeast-1); the pinned regions are Tokyo (ap-northeast-1) ("All policyholder data must remain physically within ; constraint-region/warn: a say line nam |
| ho-p1-residency-japan | 2 | 3 | repair | no | constraint-region/error: 'sg-analytics' is labelled "SG analytics team", which places it in Singapore (ap-southeast-1); the pinned regions are Tokyo (ap-northeast-1) ("All policyholder data must remain physically within  |
| ho-p1-ko-residency | 2 | 2 | repair | yes | constraint-region/error: 'esa-eu' is labelled "ESA (프랑크푸르트)", which places it in Frankfurt (eu-central-1); the pinned regions are Seoul (ap-northeast-2) ("이용자 개인정보는 반드시 서울 리전에 보관, 해외 반출 불가"); constraint-region/warn: a say line names Frankfurt (eu-central-1): " |
| ho-r-zh-no-crossregion | 2 | 2 | repair | no | constraint-region/error: the why of 'backup-db' says "跨区域灾备副本" (灾备 to another region); the pinned regions are Singapore (ap-southeast-1) ("客户数据必须留在新加坡"); constraint-region/error: the why of 'dts' says "实时同步预约数据库到异地备份" (同步 to another region); the pinned regions |
| ho-r-eu-bloc | 3 | 2 | repair | yes | orphan-node/warn: 'nat' (nat) has no connections; constraint-region/warn: a say line names Virginia (us-east-1): "GDPR forbids replicating personal data to Virginia"; the pinned regions are Frankfurt (eu-central-1), London (eu-west-1), Paris (eu-west-2) ("All  |

## Languages

| language | turns | completion tokens / turn | vs English twin | prompt tokens / turn | say in language | why in language | \u escapes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 96 | 585 | - | 16422 | 96/96 | 0/0 | 0 |
| ko | 21 | 534 | - | 17472 | 21/21 | 21/21 | 0 |
| zh | 15 | 733 | - | 19448 | 15/15 | 14/14 | 0 |

## Multi-turn retention

| case | turns | retention checks passed per turn | run pass |
| --- | ---: | ---: | ---: |
| ho-p1-residency-japan | 3 | 6/6  8/9  5/6 | 67% |
| ho-p1-avoid-es | 2 | 3/3  3/3 | 100% |
| ho-p1-avoid-fc-tempt | 2 | 3/3  3/3 | 100% |
| ho-p1-ko-residency | 2 | 6/6  9/9 | 67% |
| ho-p1-zh-residency | 2 | 6/6  9/9 | 100% |
| ho-r-relax-tokyo | 2 | 6/6  3/3 | 100% |
| ho-r-k8s-lifted | 2 | 3/3  0/0 | 100% |
| ho-r-ko-dr-in-country | 2 | 6/6  6/6 | 100% |
| ho-r-zh-no-crossregion | 2 | 6/6  1/3 | 33% |
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
| completeness | 4.44 |
| accuracy | 4.28 |
| rationality | 4.04 |
| readability | 4.36 |
| overall | 4.28 |
| architect would sign off | 80% |
| judge cost | $0.572 |

| category | judged | overall score | sign-off |
| --- | ---: | ---: | ---: |
| multiturn | 11 | 4.136 | 64% |
| pattern | 4 | 4.25 | 100% |
| i18n | 7 | 4.464 | 86% |
| need | 2 | 4.125 | 100% |
| trap | 1 | 5 | 100% |

Every run of the constraint cases: 48 runs judged, sign-off 77%, mean 4.286. (Total judged runs: 57.)

| case | run | judge defects |
| --- | ---: | ---: |
| ho-budget-ha | 1 | Turn 3 narration claims WAF blocks 'attacks that caused the outage' and NAT gives 'reliable' egress without knowing the outage cause; no cost impact note despite pinned $150 budget; NAT Gateway with EIP is a fixed hourly |
| ho-budget-ha | 2 | GTM provides no real resilience benefit in a single-region, single-endpoint design; it only fails over between endpoints, and there is only one; GTM adds recurring cost that eats into the tight $150 budget without meanin |
| ho-budget-ha | 3 | Turn 3 claims improved resilience but adds no redundancy: no multi-zone or failover change for comments path, no backup/restore note for RDS/Tablestore, no CDN failover behavior; NAT Gateway is a questionable spend under |
| ho-p1-zh-residency | 1 | GTM用于单区域内可用区切换是错误用法：GTM是DNS级跨地域流量调度，可用区故障本应由多可用区ALB自动处理；且按规则DNS不是数据路径一跳，gtm节点及dns->gtm边不应存在; DTS连接PolarDB主库与灾备库做实时同步是多余的：PolarDB多可用区部署本身提供同步复制与故障接管，无需DTS; 未说明为何将RDS替换为PolarDB，架构变更缺乏理由；若仅为加备库，原RDS跨可用区高可用版已能满足 |
| ho-p1-zh-residency | 3 | GTM用于同区域可用区级切换不恰当：ALB/ESA本身跨可用区，单可用区故障无需DNS层切换；GTM是跨区域DNS调度工具; DR节点（alb-dr、app-dr等）未标注可用区C，图上无法体现跨可用区容灾拓扑; RDS多可用区主备实例即可覆盖可用区故障，另设独立只读实例+异步复制边造成架构冗余；Tair同理 |
| ho-r-k8s-lifted | 1 | API and workers are duplicated: they remain SAE nodes yet ACK edges claim they run as pods on the cluster; the SAE nodes should have been re-typed to ACK workloads or removed.; Stale rationale: api node why text 'Serves  |
| ho-r-k8s-lifted | 3 | Workers node removed instead of being represented on ACK (e.g., separate deployment or a second node), so queue->workers, workers->db, workers->storage and workers->logs edges are dropped and RocketMQ has no consumer.; A |
| ho-r-malaysia-two | 1 | db-dr is an RDS read replica inside the same VPC/region with only cross-zone redundancy; a region-level disaster takes out both primary and replica, so this is HA, not DR; DR copy should be in Johor (ap-southeast-8) via  |
| ho-r-malaysia-two | 2 | db-standby is in the same VPC in ap-southeast-3; a regional failure in Kuala Lumpur takes out both primary and standby; No Johor (ap-southeast-8) region group, VPC, or DR copy despite Malaysia having two open regions and |
| ho-r-malaysia-two | 3 | db-dr node is placed in the same VPC in Kuala Lumpur instead of a second VPC in Johor (ap-southeast-8); No Johor region group added despite the pin listing both Malaysian regions; Turn 2 narration claims DR while only ad |
| ho-r-relax-tokyo | 1 | db-dr is placed 'in vpc' (Shop VPC in Singapore) while also adding a Tokyo region group; a Tokyo RDS replica cannot reside in the Singapore VPC.; No Tokyo VPC/group containment for db-dr, so region/scope is inconsistent. |

Agreement between the judged run's assertions and the judge's sign-off: 18/25 (72%). Assertions pass and judge yes 18, both no 0, assertions pass but judge no 5, assertions fail but judge yes 2. Mean score of passing runs 4.239, failing runs 4.75, point-biserial r -0.252.

| case | assertions | judge | failed assertions | judge defects |
| --- | ---: | ---: | ---: | ---: |
| ho-p1-ko-residency | fail | yes | residency scan ap-northeast-2 |  |
| ho-p1-zh-residency | pass | no |  | GTM用于单区域内可用区切换是错误用法：GTM是DNS级跨地域流量调度，可用区故障本应由多可用区ALB自动处理；且按规则DNS不是数据路径一跳，gtm节点及dns->gtm边不应存在; DTS连接PolarDB主库与灾备库做实时同步是多余的：PolarDB多可用区部署本身提供同步复制与故障接管，无需DTS; 未说明为何将RDS替换为PolarDB，架构变更缺乏理由；若仅为加备库，原RDS跨可用区高 |
| ho-r-relax-tokyo | pass | no |  | db-dr is placed 'in vpc' (Shop VPC in Singapore) while also adding a Tokyo region group; a Tokyo RDS replica cannot reside in the Singapore VPC.; No Tokyo VPC/group containment for db-dr, so region/sc |
| ho-r-k8s-lifted | pass | no |  | API and workers are duplicated: they remain SAE nodes yet ACK edges claim they run as pods on the cluster; the SAE nodes should have been re-typed to ACK workloads or removed.; Stale rationale: api no |
| ho-r-malaysia-two | pass | no |  | db-dr is an RDS read replica inside the same VPC/region with only cross-zone redundancy; a region-level disaster takes out both primary and replica, so this is HA, not DR; DR copy should be in Johor ( |
| ho-r-eu-bloc | fail | yes | residency eu-central-1/eu-west-1/eu-west-2; residency scan eu-central-1/eu-west-1/eu-west-2; no error-level warnings after repair | DTS is a sync/migration tool, not an anonymization engine; the anonymization step itself is asserted but not architected (the follow-up question partially mitigates this).; The guidance suggests listi |
| ho-budget-ha | pass | no |  | Turn 3 narration claims WAF blocks 'attacks that caused the outage' and NAT gives 'reliable' egress without knowing the outage cause; no cost impact note despite pinned $150 budget; NAT Gateway with E |
