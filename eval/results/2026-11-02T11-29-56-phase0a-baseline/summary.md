# Evaluation summary

Model qwen3.8-max (fallback qwen3.7-max), catalog 2026-10-31 (232 entries), system prompt 59906 chars (sha256 998fab223dab), 3 runs per case, started 2026-11-02T11:29:56.370Z.

## Overall

**pass@1 96%, all 3 runs pass 92%** (109 cases). pass@3 is best-of-3 and is listed last.

| measure | value |
| --- | ---: |
| cases / conversations / turns | 109 / 327 / 423 |
| pass@1 (mean case pass rate) | 96% |
| all runs pass | 92% |
| majority (over half the runs pass) | 98% |
| pass@3 (some run passes) | 98% |
| conversations passing every assertion | 96% |
| turns passing every assertion | 97% |
| assertions passing (4805 checks) | 100% |
| conversations that hit an API failure | 0 |
| list-price cost of the model runs | $3.59 |

## By category

| category | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pattern | 22 | 66 | 92% | 86% | 96% | 96% |
| need | 20 | 60 | 93% | 90% | 95% | 95% |
| trap | 18 | 54 | 100% | 100% | 100% | 100% |
| edit | 9 | 27 | 100% | 100% | 100% | 100% |
| multiturn | 12 | 36 | 94% | 83% | 100% | 100% |
| adversarial | 5 | 15 | 100% | 100% | 100% | 100% |
| i18n | 23 | 69 | 97% | 91% | 100% | 100% |

## By language

| language | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 86 | 258 | 96% | 92% | 98% | 98% |
| ko | 13 | 39 | 97% | 92% | 100% | 100% |
| zh | 10 | 30 | 97% | 90% | 100% | 100% |

## By assertion type (worst first)

| type | checks | passed | rate | cases that failed it |
| --- | ---: | ---: | ---: | ---: |
| primaryRec | 54 | 51 | 94% | 1 |
| attachValid | 423 | 419 | 99% | 2 |
| exclude | 171 | 170 | 99% | 1 |
| pathOrder | 354 | 352 | 99% | 2 |
| format | 423 | 421 | 100% | 2 |
| include | 513 | 512 | 100% | 1 |
| noErrors | 423 | 423 | 100% | 0 |
| escapes | 423 | 423 | 100% | 0 |
| noPrices | 423 | 423 | 100% | 0 |
| sayLang | 423 | 423 | 100% | 0 |
| size | 171 | 171 | 100% | 0 |
| region | 108 | 108 | 100% | 0 |
| zones | 27 | 27 | 100% | 0 |
| notMention | 15 | 15 | 100% | 0 |
| question | 3 | 3 | 100% | 0 |
| attach | 18 | 18 | 100% | 0 |
| noWarn | 54 | 54 | 100% | 0 |
| mention | 24 | 24 | 100% | 0 |
| editMinimal | 87 | 87 | 100% | 0 |
| restore | 3 | 3 | 100% | 0 |
| req | 51 | 51 | 100% | 0 |
| retention | 159 | 159 | 100% | 0 |
| residency | 51 | 51 | 100% | 0 |
| residencyScan | 51 | 51 | 100% | 0 |
| askLang | 53 | 53 | 100% | 0 |
| whyLang | 87 | 87 | 100% | 0 |
| pins | 24 | 24 | 100% | 0 |
| linked | 21 | 21 | 100% | 0 |
| placement | 9 | 9 | 100% | 0 |
| gpu | 12 | 12 | 100% | 0 |
| asks | 42 | 42 | 100% | 0 |
| askOptions | 39 | 39 | 100% | 0 |
| reask | 24 | 24 | 100% | 0 |
| assumes | 9 | 9 | 100% | 0 |
| scope | 30 | 30 | 100% | 0 |
| chips | 3 | 3 | 100% | 0 |

## Cases below 100% (9 of 109)

| case | runs passed | what failed |
| --- | ---: | ---: |
| need-08-contractor-desktops | 0/3 | primary rec eds (3) |
| p1-vpc-no-group | 0/3 | every attachment names a valid host (3) |
| pat-02-k8s | 2/3 | NDJSON only, ends with done (1) |
| pat-12-ecommerce-security | 2/3 | clean path order after repair (1) |
| need-06-cs-chatbot | 2/3 | clean path order after repair (1) |
| ko-mt-01-avoid-k8s | 2/3 | NDJSON only, ends with done (1) |
| zh-pat-04-rag | 2/3 | include model-studio (1) |
| p1-avoid-tempted-k8s | 2/3 | every attachment names a valid host (1) |
| ai-07-training-residency | 2/3 | exclude agentloop (1) |

## Warnings before and after deterministic repair

| code | before: total | per turn | turns | after: total | per turn | fixed by repair |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| orphan-node | 71 | 0.168 | 62 | 71 | 0.168 | 0 |
| containment | 40 | 0.095 | 32 | 0 | 0 | 43 |
| unknown-id | 21 | 0.05 | 9 | 0 | 0 | 0 |
| constraint-region | 9 | 0.021 | 6 | 7 | 0.017 | 0 |
| missing-group | 8 | 0.019 | 8 | 0 | 0 | 8 |
| bad-json | 5 | 0.012 | 2 | 5 | 0.012 | 0 |
| attach-host-missing | 5 | 0.012 | 5 | 0 | 0 | 4 |
| path-order | 5 | 0.012 | 5 | 2 | 0.005 | 3 |
| china-only | 3 | 0.007 | 2 | 1 | 0.002 | 0 |
| bad-op | 2 | 0.005 | 2 | 0 | 0 | 0 |

Severity before repair {"info":75,"warn":62,"error":32}, after {"info":52,"warn":34}. Unknown products: 0 (none). Product strings that were not catalog ids: 0 (none).

## Latency (main stream)

| measure | n | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| first token (answering attempt) | 423 | 1.22 s | 1.85 s | 7.07 s |
| first token as waited for (failed attempts included) | 423 | 1.22 s | 1.92 s | 10.5 s |
| first say | 423 | 1.50 s | 2.17 s | 7.35 s |
| first op | 423 | 1.99 s | 2.69 s | 7.88 s |
| first node | 343 | 4.27 s | 5.87 s | 8.85 s |
| stream total (all turns) | 423 | 10.2 s | 25.0 s | 36.8 s |
| stream total, new diagrams | 354 | 13.2 s | 25.4 s | 36.8 s |
| stream total, edits | 132 | 5.59 s | 13.4 s | 23.9 s |
| stream total, product answers | 57 | 4.07 s | 5.73 s | 6.01 s |
| whole turn incl. retries and follow-up | 423 | 10.5 s | 25.0 s | 36.8 s |

## Tokens and cost

| measure | value |
| --- | ---: |
| prompt tokens | 6666642 |
| cached prompt tokens | 6472832 (97%) |
| completion tokens | 244760 |
| completion tokens per turn p50 / p95 | 479 / 1308 |
| cost per turn mean / p95 | $0.0085 / $0.0124 |
| cost per conversation mean / p95 | $0.0110 / $0.0327 |
| total | $3.59 |

## Reliability

| counter | value |
| --- | ---: |
| turns | 423 |
| main stream ended without done (truncated) | 0 |
| continuation turns | 0 |
| repair turns | 2 |
| hedged turns / hedge won | 0 / 0 |
| turns that used the fallback model | 4 |
| extra attempts after failures | 4 |
| conversations with an API failure | 0 |
| bad (unparseable) lines | 5 |
| \u escapes | 0 |

## Failover to the fallback model

4 of 423 turns (1%) failed over in the main stream; reasons {"first-byte-timeout":4}. Follow-up turns that ran on another model: 0.

| measure | n | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| stalled attempt before failover | 4 | 8.17 s | 8.19 s | 8.19 s |
| fallback first token | 4 | 1.61 s | 2.29 s | 2.38 s |
| first token as waited for | 4 | 9.78 s | 10.5 s | 10.5 s |
| whole turn | 4 | 17.0 s | 23.0 s | 23.4 s |

## Cut-off turns

Main streams that ended without done: 0 ({}). Rescued by the continuation turn: 0 (0 of them pass every assertion); not rescued: 0. Turn pass rate without the rescued turns: 97%.

## Constraint compliance (machine-checked)

| check | passed | rate |
| --- | ---: | ---: |
| residency (final graph and final narration, core checker) | 51/51 | 100% |
| residency, independent scan (own place table and cue words; shares no code with the checker) | 51/51 | 100% |
| pinned constraints as data (req regions / avoid) | 24/24 | 100% |
| avoided products absent (exclude and retained exclude) | 206/207 | 100% |

Residency checks with a warn-level foreign-region mention (not failed, reviewed by hand): 0. Residency checks where the product's repair turn corrected the main-stream narration: 2. Turns with pinned constraints in memory: 131. Product constraint findings before repair {"constraint-region":{"total":9,"turns":6,"error":2}}, left after repair {"constraint-region":{"total":7,"turns":4,"error":0}}.

## Repairs

| deterministic fix | fixes | turns |
| --- | ---: | ---: |
| containment | 43 | 35 |
| missing-group | 8 | 8 |
| attach-host-missing | 4 | 4 |
| path-order | 3 | 3 |
| attach-invalid | 1 | 1 |

LLM follow-up turns: 2 ({"repair":2}); turns by finding code {"constraint-region":2}.

| case | run | turn | kind | turn passes | findings |
| --- | ---: | ---: | ---: | ---: | ---: |
| mt-06-summary-window | 1 | 5 | repair | yes | constraint-region/error: a say line sends data to another region ("replication"): "Tair and Hologres plus OSS cross-region replication to a Surabaya bucket"; the pinned regions are Jakarta (ap-southeast-5) ("Customer dat |
| p1-zh-residency | 2 | 2 | repair | yes | constraint-region/error: a say line sends data to another region ("存储"): "对象存储跨区域复制以及容灾方案"; the pinned regions are Jakarta (ap-southeast-5) ("所有用户数据必须存放在印尼境内"). Correct the narration and keep data in the pinned region |

## Languages

| language | turns | completion tokens / turn | vs English twin | prompt tokens / turn | say in language | why in language | \u escapes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 336 | 560 | - | 15738 | 336/336 | 0/0 | 0 |
| ko | 48 | 690 | 1.112 | 15629 | 48/48 | 48/48 | 0 |
| zh | 39 | 604 | 1.085 | 16112 | 39/39 | 39/39 | 0 |

## Multi-turn retention

| case | turns | retention checks passed per turn | run pass |
| --- | ---: | ---: | ---: |
| edit-06-restore | 2 | 0/0  0/0 | 100% |
| mt-01-avoid-k8s | 4 | 3/3  3/3  6/6  6/6 | 100% |
| mt-02-serverless-first | 3 | 3/3  3/3  6/6 | 100% |
| mt-03-data-in-singapore | 4 | 6/6  9/9  6/6  6/6 | 100% |
| mt-04-budget | 3 | 3/3  6/6  3/3 | 100% |
| ko-mt-01-avoid-k8s | 3 | 3/3  3/3  6/6 | 67% |
| zh-mt-01-avoid-k8s | 3 | 3/3  3/3  6/6 | 100% |
| mt-05-mixed-five-turns | 5 | 6/6  9/9  9/9  9/9  9/9 | 100% |
| mt-06-summary-window | 5 | 9/9  9/9  9/9  9/9  15/15 | 100% |
| p1-req-residency-my | 2 | 6/6  9/9 | 100% |
| p1-req-avoid-fc | 2 | 3/3  3/3 | 100% |
| p1-avoid-tempted-k8s | 3 | 3/3  3/3  6/6 | 67% |
| p1-ko-residency | 2 | 3/3  6/6 | 100% |
| p1-zh-residency | 2 | 6/6  9/9 | 100% |
| ai-07-training-residency | 2 | 6/6  9/9 | 67% |
| as-04-answer-vague | 2 | 0/0  0/0 | 100% |
| as-05-flip-internal | 2 | 0/0  3/3 | 100% |

## Judge (kimi-k3)

| measure | value |
| --- | ---: |
| runs judged / judge errors | 109 / 0 |
| completeness | 4.422 |
| accuracy | 4.339 |
| rationality | 4.119 |
| readability | 4.422 |
| overall | 4.326 |
| architect would sign off | 86% |
| judge cost | $1.290 |

| category | judged | overall score | sign-off |
| --- | ---: | ---: | ---: |
| pattern | 22 | 4.182 | 96% |
| need | 20 | 4.288 | 85% |
| trap | 18 | 4.431 | 89% |
| edit | 9 | 4.556 | 89% |
| multiturn | 12 | 4.25 | 75% |
| adversarial | 5 | 4.65 | 80% |
| i18n | 23 | 4.293 | 83% |

Every run of the constraint cases: 45 runs judged, sign-off 76%, mean 4.139. (Total judged runs: 139.)

| case | run | judge defects |
| --- | ---: | ---: |
| ai-07-training-residency | 1 | eval node (AgentLoop) drawn in Singapore region; catalog says international use only via Hong Kong region, no Singapore region.; Narration recommends AgentLoop for tracing/evaluation without mentioning the Hong Kong-only |
| as-05-flip-internal | 1 | Cloud DNS node and users->dns edge retained after the public path was removed; internal-only access should drop public DNS or use private DNS; 'Shoppers' users node still sits in the Internet group with public-facing fra |
| as-05-flip-internal | 2 | users node in internet group and users->dns edge still present after pinning internal-only; dns node retained though internal apps do not need public authoritative DNS on the path; ALB not described or configured as inte |
| as-05-flip-internal | 3 | 'Shoppers' node remains in the external Internet group instead of being relabeled as internal staff or moved to an on-premises/corporate node.; Public Alibaba Cloud DNS still on the path (users -> dns resolve) though an  |
| mt-04-budget | 1 | Turn 3 narration claims HA is already handled and adds Cloud Backup, but never addresses the cost impact of HA as the guidance requires; backup does not provide availability; Budget pinned at <$200/month is implausible w |
| mt-04-budget | 2 | Turn 3 makes Elasticsearch multi-zone (2-node) which likely pushes total cost over the $200 budget; the narration asserts it stays under budget without justification, and no cheaper alternative (e.g., RDS full-text index |
| mt-04-budget | 3 | GTM added with only one region (Singapore) in the design; DNS failover across regions requires a second regional deployment that does not exist; users -> gtm and gtm -> dns edges create a redundant/conflicting resolution |
| p1-avoid-tempted-k8s | 2 | No autoscaling shown or narrated for the SAE API tier despite the tenfold growth requirement; ESS badge on workers only covers the background tier; 'Service mesh' request answered with MSE registry/config, but no traffic |
| p1-avoid-tempted-k8s | 3 | API on ECS with ESS while workers run on SAE creates two different deployment/scaling models; SAE for both (with built-in autoscaling) would be simpler and more consistent; MSE labelled 'service mesh' is misleading—MSE p |
| p1-ko-residency | 1 | RDS/Tair가 이미 zones a,b 다중 AZ HA 구성인데 별도 DR 스탠바이 노드를 추가해 중복 설계됨; DR은 백업(OSS 스냅샷)이나 다중 AZ 설명으로 충분했을 것; 나레이션의 '동기식 복제'와 다이어그램 엣지의 'async' 레이블이 모순됨; DR 노드에 가용영역(zones) 표기가 없어 '타 가용영역 배치' 주장이 다이어그램에서 확인 불가 |
| zh-mt-01-avoid-k8s | 1 | db 换成 PolarDB 后又新增 RDS 只读副本，svc 同时连两种数据库，读副本应挂在同一引擎（PolarDB 只读节点）; cache 与 menu-cache 两个 Tair 实例并存且都升级为集群版，未说明数据划分，属冗余节点; RDS→PolarDB 的替换未提迁移（如 DTS），直接换库对运行中系统不现实 |

Agreement between the judged run's assertions and the judge's sign-off: 90/109 (83%). Assertions pass and judge yes 89, both no 1, assertions pass but judge no 14, assertions fail but judge yes 5. Mean score of passing runs 4.35, failing runs 3.917, point-biserial r 0.197.

| case | assertions | judge | failed assertions | judge defects |
| --- | ---: | ---: | ---: | ---: |
| pat-02-k8s | fail | yes | NDJSON only, ends with done | No ACR (container registry) node for the 20 microservice images; No edge from ACK to MSE Nacos despite service discovery/config being a core requirement; No edge from ACK to RocketMQ despite async mes |
| pat-12-ecommerce-security | pass | no |  | Anti-DDoS Proxy chained after ESA (esa -> ddos -> alb) duplicates DDoS protection and inverts the traffic order; for 'occasional' DDoS, ESA alone suffices, or Anti-DDoS Proxy should front the origin i |
| need-06-cs-chatbot | pass | no |  | Chatbot app on ECS is disproportionate; Function Compute or SAE would be simpler and more cost-effective for this workload; No AI Guardrails component for content safety on a customer-facing chatbot;  |
| need-08-contractor-desktops | fail | yes | primary rec eds | EDS is a SaaS with its own office network; the diagram implies desktops live in 'Desktop VPC' and mount NAS directly, while the catalog says the office network connects to the VPC through CEN; eds ->  |
| need-11-voice-bot | pass | no |  | DNS shown as a hop in the data path (users->dns->esa); DNS is never a hop per placement rules; ARTC placed in edge group as a separate media hop from voice-bot; ARTC is the transport clients connect t |
| need-12-qwen-api | pass | no |  | No guidance on keeping the API key on the server / KMS; Narration is very thin: no mention of pay-per-token pricing model or OpenAI-compatible endpoint details; No diagram node drawn for Model Studio  |
| trap-11-contact-center | pass | no |  | Empty diagram: no nodes, edges, assumption chips or quick-reply questions for a request that could support a first design; AgentCore recommended as primary for a Malaysia contact center even though it |
| edit-07-multi-region-dr | pass | no |  | gtm -> dns edge direction is wrong (GTM is the DNS layer; Cloud DNS should not be a downstream hop of GTM); esa -> alb-jk 'failover' edge implies ESA does the failover, conflicting with GTM-based stee |
| mt-04-budget | pass | no |  | Turn 3 narration claims HA is already handled and adds Cloud Backup, but never addresses the cost impact of HA as the guidance requires; backup does not provide availability; Budget pinned at <$200/mo |
| adv-03-aws-products | pass | no |  | fc node placed in vpc; Function Compute is drawn outside the VPC unless VPC access is configured (not stated); tablestore node placed in vpc; Tablestore is a regional managed service drawn outside the |
| ko-pat-04-rag | pass | no |  | PAI-EAS(자체 Qwen 서빙)와 Model Studio API를 혼용: 임베딩도 EAS에서 처리하거나 Model Studio로 일원화해야 하며, 혼용 시 NAT+SNAT 비용·복잡도 발생에 대한 설명 없음; 사내 어시스턴트인데 사용자가 internet 외부 그룹에 배치되고 ALB가 인터넷 facing으로 암시됨 — 인트라넷 가정 칩과 불일치; ECS  |
| ko-mt-01-avoid-k8s | fail | yes | NDJSON only, ends with done | 메뉴 캐시를 별도 Tair 인스턴스로 분리한 것은 다소 과잉(기존 Tair에 논리 분리 가능)하나 요청 명시상 수용 가능; gw(API Gateway) 자체의 5배 트래픽 처리량/QPS 확장 언급이 없음; PolarDB 읽기 복제본이 별도 노드로 추가됐는데 주문 조회 외 읽기 분산 라우팅(엔드포인트) 설명이 간략함 |
| zh-need-01-dev-team | pass | no |  | 推荐 token-plan 作为补充不合理：其用途是 AI 工具额度订阅，与 Qoder Teams 席位重叠且标注不适用于自动化/后端场景; 将 model-studio 列为用户侧补充推荐误导：Qoder Teams 底层模型调用不需要用户单独开通 Model Studio; 叙述未提及 Qoder Teams 的隐私模式与团队管理分析等对 15 人团队的关键价值 |
| zh-mt-01-avoid-k8s | pass | no |  | db 换成 PolarDB 后又新增 RDS 只读副本，svc 同时连两种数据库，读副本应挂在同一引擎（PolarDB 只读节点）; cache 与 menu-cache 两个 Tair 实例并存且都升级为集群版，未说明数据划分，属冗余节点; RDS→PolarDB 的替换未提迁移（如 DTS），直接换库对运行中系统不现实 |
| trap-04b-redis-leaderboard | pass | no |  | Edge 'api -> leaderboard (Redis)' implies the API gateway talks Redis protocol directly, which Cloud-native API Gateway (Envoy/Higress) does not do for leaderboard logic; Missing application/game serv |
| p1-vpc-no-group | fail | yes | every attachment names a valid host | PrivateZone is drawn as a standalone node in the region; per placement rules it should be a badge on the VPC, and it is not connected to anything; Express Connect sits inside the VPC rather than at th |
| p1-avoid-tempted-k8s | fail | yes | every attachment names a valid host | MSE node is labeled 'Service mesh' but MSE is primarily a registry/config/governance engine; while it provides microservice governance, calling it a 'mesh' without clarifying it's not a traditional K8 |
| p1-ko-residency | pass | no |  | RDS/Tair가 이미 zones a,b 다중 AZ HA 구성인데 별도 DR 스탠바이 노드를 추가해 중복 설계됨; DR은 백업(OSS 스냅샷)이나 다중 AZ 설명으로 충분했을 것; 나레이션의 '동기식 복제'와 다이어그램 엣지의 'async' 레이블이 모순됨; DR 노드에 가용영역(zones) 표기가 없어 '타 가용영역 배치' 주장이 다이어그램에서 확인 불가 |
| as-05-flip-internal | pass | no |  | Cloud DNS node and users->dns edge retained after the public path was removed; internal-only access should drop public DNS or use private DNS; 'Shoppers' users node still sits in the Internet group wi |
