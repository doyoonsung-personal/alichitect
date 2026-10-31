# Evaluation summary

Model qwen3.8-max (fallback qwen3.7-max), catalog 2026-10-31 (232 entries), system prompt 59133 chars (sha256 be0d8972c479), 3 runs per case, started 2026-10-31T17:20:14.669Z.

## Overall

**pass@1 95%, all 3 runs pass 88%** (25 cases). pass@3 is best-of-3 and is listed last.

| measure | value |
| --- | ---: |
| cases / conversations / turns | 25 / 75 / 132 |
| pass@1 (mean case pass rate) | 95% |
| all runs pass | 88% |
| majority (over half the runs pass) | 96% |
| pass@3 (some run passes) | 100% |
| conversations passing every assertion | 95% |
| turns passing every assertion | 97% |
| assertions passing (1484 checks) | 100% |
| conversations that hit an API failure | 0 |
| list-price cost of the model runs | $1.33 |

## By category

| category | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| multiturn | 11 | 33 | 97% | 91% | 100% | 100% |
| pattern | 4 | 12 | 92% | 75% | 100% | 100% |
| i18n | 7 | 21 | 91% | 86% | 86% | 100% |
| need | 2 | 6 | 100% | 100% | 100% | 100% |
| trap | 1 | 3 | 100% | 100% | 100% | 100% |

## By language

| language | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 18 | 54 | 96% | 89% | 100% | 100% |
| ko | 4 | 12 | 100% | 100% | 100% | 100% |
| zh | 3 | 9 | 78% | 67% | 67% | 100% |

## By assertion type (worst first)

| type | checks | passed | rate | cases that failed it |
| --- | ---: | ---: | ---: | ---: |
| residencyScan | 60 | 57 | 95% | 2 |
| residency | 60 | 59 | 98% | 1 |
| noErrors | 132 | 131 | 99% | 1 |
| attachValid | 132 | 131 | 99% | 1 |
| include | 84 | 84 | 100% | 0 |
| region | 51 | 51 | 100% | 0 |
| attach | 6 | 6 | 100% | 0 |
| linked | 6 | 6 | 100% | 0 |
| pathOrder | 126 | 126 | 100% | 0 |
| format | 132 | 132 | 100% | 0 |
| escapes | 132 | 132 | 100% | 0 |
| noPrices | 132 | 132 | 100% | 0 |
| sayLang | 132 | 132 | 100% | 0 |
| exclude | 30 | 30 | 100% | 0 |
| req | 42 | 42 | 100% | 0 |
| pins | 45 | 45 | 100% | 0 |
| retention | 66 | 66 | 100% | 0 |
| placement | 3 | 3 | 100% | 0 |
| editMinimal | 12 | 12 | 100% | 0 |
| askLang | 20 | 20 | 100% | 0 |
| whyLang | 36 | 36 | 100% | 0 |
| noWarn | 6 | 6 | 100% | 0 |
| size | 27 | 27 | 100% | 0 |
| primaryRec | 6 | 6 | 100% | 0 |
| question | 3 | 3 | 100% | 0 |
| mention | 3 | 3 | 100% | 0 |

## Cases below 100% (3 of 25)

| case | runs passed | what failed |
| --- | ---: | ---: |
| ho-r-zh-no-crossregion | 1/3 | residency ap-southeast-1 (1); residency scan ap-southeast-1 (2); no error-level warnings after repair (1) |
| ho-p1-vpc-mongo | 2/3 | every attachment names a valid host (1) |
| ho-r-eu-bloc | 2/3 | residency scan eu-central-1/eu-west-1/eu-west-2 (1) |

## Warnings before and after deterministic repair

| code | before: total | per turn | turns | after: total | per turn | fixed by repair |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| orphan-node | 39 | 0.295 | 28 | 35 | 0.265 | 1 |
| constraint-region | 27 | 0.205 | 14 | 11 | 0.083 | 0 |
| containment | 13 | 0.098 | 11 | 0 | 0 | 13 |
| attach-host-missing | 4 | 0.03 | 3 | 0 | 0 | 1 |
| path-order | 2 | 0.015 | 2 | 0 | 0 | 2 |
| unknown-product | 2 | 0.015 | 2 | 0 | 0 | 0 |
| bad-op | 1 | 0.008 | 1 | 0 | 0 | 0 |
| constraint-replaced | 0 | 0 | 0 | 6 | 0.045 | 0 |

Severity before repair {"warn":35,"info":31,"error":22}, after {"info":34,"warn":17,"error":1}. Unknown products: 2 (avoid x2). Product strings that were not catalog ids: 0 (none).

## Latency (main stream)

| measure | n | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| first token (answering attempt) | 132 | 1.22 s | 1.83 s | 2.68 s |
| first token as waited for (failed attempts included) | 132 | 1.22 s | 1.83 s | 2.68 s |
| first say | 132 | 1.50 s | 2.11 s | 2.96 s |
| first op | 132 | 1.95 s | 2.69 s | 3.65 s |
| first node | 125 | 4.32 s | 5.76 s | 7.15 s |
| stream total (all turns) | 132 | 10.4 s | 22.4 s | 30.8 s |
| stream total, new diagrams | 126 | 12.2 s | 22.4 s | 30.8 s |
| stream total, edits | 63 | 5.96 s | 9.88 s | 22.4 s |
| stream total, product answers | 6 | 4.08 s | 4.72 s | 4.79 s |
| whole turn incl. retries and follow-up | 132 | 12.8 s | 22.5 s | 30.8 s |

## Tokens and cost

| measure | value |
| --- | ---: |
| prompt tokens | 2200776 |
| cached prompt tokens | 2028928 (92%) |
| completion tokens | 79613 |
| completion tokens per turn p50 / p95 | 534 / 1188 |
| cost per turn mean / p95 | $0.0101 / $0.0165 |
| cost per conversation mean / p95 | $0.0177 / $0.0308 |
| total | $1.33 |

## Reliability

| counter | value |
| --- | ---: |
| turns | 132 |
| main stream ended without done (truncated) | 0 |
| continuation turns | 0 |
| repair turns | 8 |
| hedged turns / hedge won | 0 / 0 |
| turns that used the fallback model | 0 |
| extra attempts after failures | 0 |
| conversations with an API failure | 0 |
| bad (unparseable) lines | 0 |
| \u escapes | 0 |

## Failover to the fallback model

0 of 132 turns (0%) failed over in the main stream; reasons {}. Follow-up turns that ran on another model: 0.

## Cut-off turns

Main streams that ended without done: 0 ({}). Rescued by the continuation turn: 0 (0 of them pass every assertion); not rescued: 0. Turn pass rate without the rescued turns: 97%.

## Constraint compliance (machine-checked)

| check | passed | rate |
| --- | ---: | ---: |
| residency (final graph and final narration, core checker) | 59/60 | 98% |
| residency, independent scan (own place table and cue words; shares no code with the checker) | 57/60 | 95% |
| pinned constraints as data (req regions / avoid) | 45/45 | 100% |
| avoided products absent (exclude and retained exclude) | 45/45 | 100% |

Residency checks with a warn-level foreign-region mention (not failed, reviewed by hand): 8. Residency checks where the product's repair turn corrected the main-stream narration: 8. Turns with pinned constraints in memory: 91. Product constraint findings before repair {"constraint-region":{"total":27,"turns":14,"error":14}}, left after repair {"constraint-region":{"total":11,"turns":9,"error":1}}.

Independent residency scan hits (read each one: it errs towards flagging):

| case | run | turn | scan finding |
| --- | ---: | ---: | ---: |
| ho-r-eu-bloc | 1 | 2 | say : Virginia in "Moved reporting DB into Frankfurt VPC and removed Virginia region, NAT and EIP …" |
| ho-r-zh-no-crossregion | 2 | 2 | say : 异地 in "已将异地备份改为新加坡区域内的OSS备份桶，严格遵守客户数据驻留新加坡的要求" |
| ho-r-zh-no-crossregion | 3 | 2 | say : 跨区域 in "已修正：备份存储在新加坡区域内，不跨区域" |

| case | run | turn | residency finding |
| --- | ---: | ---: | ---: |
| ho-r-zh-no-crossregion | 2 | 2 | a say line sends data to another region ("备份"): "异地备份也需在新加坡内不同可用区实现"; the pinned regions are Singapore (ap-southeast-1) ("eval residency"). Correct the narration and keep data in the pinned region; a say line sends data  |

## Repairs

| deterministic fix | fixes | turns |
| --- | ---: | ---: |
| containment | 13 | 11 |
| attach-invalid | 3 | 2 |
| path-order | 2 | 2 |
| orphan-node | 1 | 1 |
| attach-host-missing | 1 | 1 |

LLM follow-up turns: 8 ({"repair":8}); turns by finding code {"constraint-region":8,"orphan-node":1}.

| case | run | turn | kind | turn passes | findings |
| --- | ---: | ---: | ---: | ---: | ---: |
| ho-p1-zh-residency | 1 | 2 | repair | yes | constraint-region/error: a say line sends data to another region ("灾备"): "因此异地灾备的副本和备份也只能放在香港的另一个可用区（可用区C）"; the pinned regions are Hong Kong (cn-hongkong) ("所有客户数据必须留在香港境内，不能出境"). Correct the narration and keep data in  |
| ho-r-eu-bloc | 1 | 2 | repair | no | constraint-region/error: region group 'us' (Virginia (us-east-1)) is in Virginia (us-east-1) and holds report-db; the pinned regions are Frankfurt (eu-central-1), London (eu-west-1), Paris (eu-west-2) ("All personal data; constraint-region/error: the why of 'n |
| ho-p1-residency-japan | 2 | 2 | repair | yes | constraint-region/error: region group 'sg' (Singapore (ap-southeast-1)) is in Singapore (ap-southeast-1) and holds analytics-app, bi; the pinned regions are Tokyo (ap-northeast-1) ("All policyholder data must remain phys; constraint-region/warn: a say line nam |
| ho-p1-ko-residency | 2 | 2 | repair | yes | constraint-region/error: 'esa' is labelled "ESA (유럽 가속)", which places it in Frankfurt (eu-central-1), London (eu-west-1), Paris (eu-west-2), Amsterdam (eu-west-3); the pinned regions are Seoul (ap-northeast-2) ("이용자 개인정; constraint-region/warn: a say line nam |
| ho-r-zh-no-crossregion | 2 | 2 | repair | no | constraint-region/error: region group 'tokyo' (东京 (ap-northeast-1)) is in Tokyo (ap-northeast-1) and holds backup-config; the pinned regions are Singapore (ap-southeast-1) ("客户数据必须留在新加坡"); constraint-region/error: a say line sends data to another region ("备份") |
| ho-p1-zh-residency | 3 | 2 | repair | yes | orphan-node/warn: 'oss' (oss) has no connections; orphan-node/warn: 'cfw' (cloud-firewall) has no connections; constraint-region/error: a say line sends data to another region ("容灾"): "异地容灾将在香港区域内的另一个可用区（Zone C）构建"; the pinned regions are Hong Kong (cn-hongkon |
| ho-r-zh-no-crossregion | 3 | 2 | repair | no | constraint-region/error: the why of 'backup' says "在新加坡区域内保存RDS和附件的异地备份副本" (保存 to another region); the pinned regions are Singapore (ap-southeast-1) ("客户数据必须留在新加坡"); constraint-region/error: a say line sends data to another region ("备份"): "跨区域异地备份也必须放在新加坡区域内"; |
| ho-r-eu-bloc | 3 | 2 | repair | yes | constraint-region/error: the why of 'dts-anonymize' says "Nightly ETL extracts and anonymizes HR data before shipping it to the US reporting databa…" (extracts to Virginia (us-east-1), Silicon Valley (us-west-1)); the pi; constraint-region/warn: a say line nam |

## Languages

| language | turns | completion tokens / turn | vs English twin | prompt tokens / turn | say in language | why in language | \u escapes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 96 | 599 | - | 16107 | 96/96 | 0/0 | 0 |
| ko | 21 | 544 | - | 16504 | 21/21 | 21/21 | 0 |
| zh | 15 | 710 | - | 20525 | 15/15 | 15/15 | 0 |

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
| ho-r-zh-no-crossregion | 2 | 6/6  2/3 | 33% |
| ho-r-ko-avoid-mesh | 2 | 3/3  3/3 | 100% |
| ho-r-malaysia-two | 2 | 6/6  3/3 | 100% |
| ho-r-eu-bloc | 2 | 6/6  3/3 | 67% |
| ho-residency-korea | 3 | 6/6  9/9  9/9 | 100% |
| ho-scale-sae | 2 | 0/0  6/6 | 100% |
| ho-scale-ecs-ok | 2 | 0/0  6/6 | 100% |
| ho-budget-ha | 3 | 3/3  3/3  6/6 | 100% |

## Judge (kimi-k3)

| measure | value |
| --- | ---: |
| runs judged / judge errors | 25 / 0 |
| completeness | 4.32 |
| accuracy | 4.32 |
| rationality | 4.12 |
| readability | 4.24 |
| overall | 4.25 |
| architect would sign off | 84% |
| judge cost | $0.583 |

| category | judged | overall score | sign-off |
| --- | ---: | ---: | ---: |
| multiturn | 11 | 4 | 73% |
| pattern | 4 | 4.125 | 75% |
| i18n | 7 | 4.607 | 100% |
| need | 2 | 4.25 | 100% |
| trap | 1 | 5 | 100% |

Every run of the constraint cases: 48 runs judged, sign-off 81%, mean 4.146. (Total judged runs: 57.)

| case | run | judge defects |
| --- | ---: | ---: |
| ho-budget-ha | 2 | NAT Gateway recommended as outage fix without evidence egress caused it; adds recurring cost and a single point of failure unless multi-AZ NAT is used; Edge db -> nat (control) is architecturally dubious: RDS HA doesn't  |
| ho-p1-zh-residency | 3 | GTM（全局流量管理器）用于单区域多可用区场景属于产品误用，应使用ALB的多可用区路由或DNS故障转移; DTS用于同城RDS主备同步不是最佳实践，RDS本身提供同城双活或主备复制能力，DTS更适合跨区域或异构数据库场景; 缺少对原有OSS的保留说明，原架构中的OSS被移除但灾备方案中新增了OSS-ZRS，需明确数据迁移或共存策略 |
| ho-r-k8s-lifted | 1 | Missing edge alb -> api: API pods have no ingress path from the load balancer (ALB should serve as ACK Ingress).; Missing edges api -> queue, queue -> worker, api -> db, worker -> db, api -> cache: the order flow (publis |
| ho-r-ko-avoid-mesh | 2 | mse->db SQL 엣지: MSE는 PostgreSQL 앞단의 데이터 경로 홉이 아니며, api->db 직접 연결을 제거한 것은 잘못된 토폴로지; api->mse 엣지가 데이터 경로(gRPC/HTTP)로 표현됨; 레지스트리/거버넌스 연결은 control 성격으로 표시해야 함; 서비스 메시를 요청받았지만 마이크로서비스가 '주문 API 서버' 하나뿐이라 메시가 관리할 서비스 간 트래픽이 존재하 |
| ho-r-malaysia-two | 1 | db-dr node placed in the Kuala Lumpur VPC instead of a second Malaysian region (Johor ap-southeast-8); DR in the same region defeats the purpose; Turn 2 narration says 'cross-zone RDS read replica in the same Kuala Lumpu |
| ho-r-malaysia-two | 2 | db-dr 'DR read replica' is in the same region and same VPC as the primary RDS; cross-zone replication is not regional DR; No second region group (Johor ap-southeast-8) or DR VPC added despite Malaysia having two open reg |
| ho-r-malaysia-two | 3 | DR read replica placed in the same region/VPC (Kuala Lumpur) instead of the second Malaysian region Johor (ap-southeast-8); a regional failure takes out both primary and replica.; Narration claims 'cross-zone ... for dis |
| ho-residency-korea | 1 | GTM 'routes patients to a healthy endpoint if the primary region fails' implies cross-region failover, but all resources are in Seoul only; there is no failover target that satisfies residency, so GTM is a needless/misle |
| ho-scale-ecs-ok | 3 | Two ESS badges (scaling1 on web1, scaling2 on web2) imply two independent scaling groups each managing a single instance; correct design is one scaling group over the web tier registered to the ALB; Scaling trigger is de |

Agreement between the judged run's assertions and the judge's sign-off: 20/25 (80%). Assertions pass and judge yes 20, both no 0, assertions pass but judge no 4, assertions fail but judge yes 1. Mean score of passing runs 4.26, failing runs 4, point-biserial r 0.083.

| case | assertions | judge | failed assertions | judge defects |
| --- | ---: | ---: | ---: | ---: |
| ho-p1-ddos-order | pass | no |  | Edge order inconsistency: AFTER edges show users -> esa -> ddos -> alb, but changes list and user request specify ddos -> esa.; Narration claims Anti-DDoS Proxy is before ESA, but the diagram edges co |
| ho-r-k8s-lifted | pass | no |  | Missing edge alb -> api: API pods have no ingress path from the load balancer (ALB should serve as ACK Ingress).; Missing edges api -> queue, queue -> worker, api -> db, worker -> db, api -> cache: th |
| ho-r-malaysia-two | pass | no |  | db-dr node placed in the Kuala Lumpur VPC instead of a second Malaysian region (Johor ap-southeast-8); DR in the same region defeats the purpose; Turn 2 narration says 'cross-zone RDS read replica in  |
| ho-r-eu-bloc | fail | yes | residency scan eu-central-1/eu-west-1/eu-west-2 | Narration initially says 'add a Virginia reporting DB' before correcting itself, which is confusing; Anonymization job on ECS pushing via NAT is mentioned but not drawn; No explicit edge showing anony |
| ho-residency-korea | pass | no |  | GTM 'routes patients to a healthy endpoint if the primary region fails' implies cross-region failover, but all resources are in Seoul only; there is no failover target that satisfies residency, so GTM |
