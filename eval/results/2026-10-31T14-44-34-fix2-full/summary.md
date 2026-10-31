# Evaluation summary

Model qwen3.8-max (fallback qwen3.7-max), catalog 2026-10-31 (223 entries), system prompt 49292 chars (sha256 53029f36008b), 3 runs per case, started 2026-10-31T14:44:34.979Z.

## Overall

**pass@1 97%, all 3 runs pass 93%** (88 cases). pass@3 is best-of-3 and is listed last.

| measure | value |
| --- | ---: |
| cases / conversations / turns | 88 / 264 / 351 |
| pass@1 (mean case pass rate) | 97% |
| all runs pass | 93% |
| majority (over half the runs pass) | 98% |
| pass@3 (some run passes) | 99% |
| conversations passing every assertion | 97% |
| turns passing every assertion | 96% |
| assertions passing (3740 checks) | 100% |
| conversations that hit an API failure | 2 |
| list-price cost of the model runs | $2.66 |

## By category

| category | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pattern | 16 | 48 | 96% | 88% | 100% | 100% |
| need | 13 | 39 | 100% | 100% | 100% | 100% |
| trap | 16 | 48 | 94% | 88% | 94% | 100% |
| edit | 9 | 27 | 100% | 100% | 100% | 100% |
| multiturn | 9 | 27 | 85% | 78% | 89% | 89% |
| adversarial | 5 | 15 | 100% | 100% | 100% | 100% |
| i18n | 20 | 60 | 100% | 100% | 100% | 100% |

## By language

| language | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 68 | 204 | 96% | 91% | 97% | 99% |
| ko | 10 | 30 | 100% | 100% | 100% | 100% |
| zh | 10 | 30 | 100% | 100% | 100% | 100% |

## By assertion type (worst first)

| type | checks | passed | rate | cases that failed it |
| --- | ---: | ---: | ---: | ---: |
| api | 2 | 0 | 0% | 1 |
| pins | 21 | 19 | 91% | 1 |
| req | 45 | 42 | 93% | 1 |
| retention | 153 | 150 | 98% | 1 |
| include | 390 | 389 | 100% | 1 |
| attachValid | 349 | 348 | 100% | 1 |
| sayLang | 349 | 348 | 100% | 1 |
| exclude | 138 | 138 | 100% | 0 |
| noErrors | 349 | 349 | 100% | 0 |
| pathOrder | 285 | 285 | 100% | 0 |
| format | 349 | 349 | 100% | 0 |
| escapes | 349 | 349 | 100% | 0 |
| noPrices | 349 | 349 | 100% | 0 |
| size | 120 | 120 | 100% | 0 |
| region | 60 | 60 | 100% | 0 |
| zones | 18 | 18 | 100% | 0 |
| primaryRec | 54 | 54 | 100% | 0 |
| notMention | 15 | 15 | 100% | 0 |
| question | 3 | 3 | 100% | 0 |
| attach | 15 | 15 | 100% | 0 |
| noWarn | 54 | 54 | 100% | 0 |
| mention | 13 | 13 | 100% | 0 |
| editMinimal | 81 | 81 | 100% | 0 |
| restore | 3 | 3 | 100% | 0 |
| whyLang | 77 | 77 | 100% | 0 |
| residency | 45 | 45 | 100% | 0 |
| residencyScan | 45 | 45 | 100% | 0 |
| linked | 6 | 6 | 100% | 0 |
| placement | 3 | 3 | 100% | 0 |

## Cases below 100% (6 of 88)

| case | runs passed | what failed |
| --- | ---: | ---: |
| mt-02-serverless-first | 0/3 | req serverless (3) |
| trap-07-icp | 1/3 | turn completed (2); api: turn 1: content-filtered: <400> InternalError.Algo.DataInspectionFailed: Output  (2) |
| trap-07b-icp-beijing | 2/3 | say text in en (1) |
| pat-13-internal-portal | 2/3 | include alb/nlb (1) |
| p1-vpc-no-group | 2/3 | every attachment names a valid host (1) |
| p1-avoid-tempted-k8s | 2/3 | pinned avoid ack (1) |

## Warnings before and after deterministic repair

| code | before: total | per turn | turns | after: total | per turn | fixed by repair |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| orphan-node | 56 | 0.16 | 48 | 54 | 0.154 | 2 |
| containment | 34 | 0.097 | 25 | 0 | 0 | 34 |
| constraint-region | 25 | 0.071 | 11 | 25 | 0.071 | 0 |
| missing-group | 6 | 0.017 | 6 | 0 | 0 | 6 |
| unknown-id | 6 | 0.017 | 3 | 0 | 0 | 0 |
| attach-host-missing | 4 | 0.011 | 4 | 0 | 0 | 1 |
| path-order | 3 | 0.009 | 3 | 0 | 0 | 3 |
| bad-json | 2 | 0.006 | 2 | 2 | 0.006 | 0 |
| bad-op | 1 | 0.003 | 1 | 0 | 0 | 0 |

Severity before repair {"warn":63,"info":52,"error":22}, after {"info":44,"warn":37}. Unknown products: 0 (none). Product strings that were not catalog ids: 0 (none).

## Latency (main stream)

| measure | n | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| first token (answering attempt) | 351 | 1.16 s | 1.62 s | 2.50 s |
| first token as waited for (failed attempts included) | 351 | 1.16 s | 1.62 s | 2.50 s |
| first say | 351 | 1.48 s | 2.08 s | 2.87 s |
| first op | 349 | 1.97 s | 2.72 s | 3.76 s |
| first node | 271 | 3.74 s | 4.91 s | 5.86 s |
| stream total (all turns) | 351 | 7.87 s | 23.2 s | 40.3 s |
| stream total, new diagrams | 285 | 12.3 s | 23.7 s | 40.3 s |
| stream total, edits | 123 | 5.13 s | 10.2 s | 20.1 s |
| stream total, product answers | 58 | 4.29 s | 6.01 s | 6.54 s |
| whole turn incl. retries and follow-up | 351 | 8.66 s | 23.2 s | 40.3 s |

## Tokens and cost

| measure | value |
| --- | ---: |
| prompt tokens | 4553092 |
| cached prompt tokens | 4325632 (95%) |
| completion tokens | 172886 |
| completion tokens per turn p50 / p95 | 323 / 1128 |
| cost per turn mean / p95 | $0.0076 / $0.0108 |
| cost per conversation mean / p95 | $0.0101 / $0.0316 |
| total | $2.66 |

## Reliability

| counter | value |
| --- | ---: |
| turns | 351 |
| main stream ended without done (truncated) | 2 |
| continuation turns | 0 |
| repair turns | 0 |
| hedged turns / hedge won | 0 / 0 |
| turns that used the fallback model | 0 |
| extra attempts after failures | 0 |
| conversations with an API failure | 2 |
| bad (unparseable) lines | 2 |
| \u escapes | 0 |

## Failover to the fallback model

0 of 351 turns (0%) failed over in the main stream; reasons {}. Follow-up turns that ran on another model: 0.

## Cut-off turns

Main streams that ended without done: 2 ({"content-filtered":2}). Rescued by the continuation turn: 0 (0 of them pass every assertion); not rescued: 2. Turn pass rate without the rescued turns: 96%.

## Constraint compliance (machine-checked)

| check | passed | rate |
| --- | ---: | ---: |
| residency (final graph and final narration, core checker) | 45/45 | 100% |
| residency, independent scan (own place table and cue words; shares no code with the checker) | 45/45 | 100% |
| pinned constraints as data (req regions / avoid) | 19/21 | 91% |
| avoided products absent (exclude and retained exclude) | 174/174 | 100% |

Residency checks with a warn-level foreign-region mention (not failed, reviewed by hand): 1. Residency checks where the product's repair turn corrected the main-stream narration: 0. Turns with pinned constraints in memory: 121. Product constraint findings before repair {"constraint-region":{"total":25,"turns":11,"error":0}}, left after repair {"constraint-region":{"total":25,"turns":11,"error":0}}.

| case | run | turn | pins check | pinned |
| --- | ---: | ---: | ---: | ---: |
| p1-avoid-tempted-k8s | 3 | 1 | pinned avoid ack | no machine-checkable constraint pinned |
| p1-avoid-tempted-k8s | 3 | 2 | pinned avoid ack | no machine-checkable constraint pinned |

## Repairs

| deterministic fix | fixes | turns |
| --- | ---: | ---: |
| containment | 34 | 26 |
| missing-group | 6 | 6 |
| path-order | 3 | 3 |
| orphan-node | 2 | 1 |
| attach-invalid | 2 | 2 |
| attach-host-missing | 1 | 1 |

LLM follow-up turns: 0 ({}); turns by finding code {}.

## Languages

| language | turns | completion tokens / turn | vs English twin | prompt tokens / turn | say in language | why in language | \u escapes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 273 | 481 | - | 12965 | 270/271 | 0/0 | 0 |
| ko | 39 | 570 | 1.348 | 13023 | 39/39 | 39/39 | 0 |
| zh | 39 | 498 | 1.245 | 12969 | 39/39 | 38/38 | 0 |

## Multi-turn retention

| case | turns | retention checks passed per turn | run pass |
| --- | ---: | ---: | ---: |
| edit-06-restore | 2 | 0/0  0/0 | 100% |
| mt-01-avoid-k8s | 4 | 3/3  3/3  6/6  6/6 | 100% |
| mt-02-serverless-first | 3 | 0/3  3/3  3/6 | 0% |
| mt-03-data-in-singapore | 4 | 6/6  9/9  6/6  6/6 | 100% |
| mt-04-budget | 3 | 3/3  6/6  3/3 | 100% |
| ko-mt-01-avoid-k8s | 3 | 3/3  3/3  6/6 | 100% |
| zh-mt-01-avoid-k8s | 3 | 3/3  3/3  6/6 | 100% |
| mt-05-mixed-five-turns | 5 | 6/6  9/9  9/9  9/9  9/9 | 100% |
| mt-06-summary-window | 5 | 9/9  9/9  9/9  9/9  15/15 | 100% |
| p1-req-residency-my | 2 | 6/6  9/9 | 100% |
| p1-req-avoid-fc | 2 | 3/3  3/3 | 100% |
| p1-avoid-tempted-k8s | 3 | 3/3  3/3  6/6 | 67% |
| p1-ko-residency | 2 | 3/3  6/6 | 100% |
| p1-zh-residency | 2 | 6/6  9/9 | 100% |

## Judge (kimi-k3)

| measure | value |
| --- | ---: |
| runs judged / judge errors | 88 / 0 |
| completeness | 4.557 |
| accuracy | 4.466 |
| rationality | 4.261 |
| readability | 4.489 |
| overall | 4.443 |
| architect would sign off | 94% |
| judge cost | $0.950 |

| category | judged | overall score | sign-off |
| --- | ---: | ---: | ---: |
| pattern | 16 | 4.375 | 94% |
| need | 13 | 4.135 | 100% |
| trap | 16 | 4.734 | 100% |
| edit | 9 | 4.583 | 89% |
| multiturn | 9 | 4.389 | 89% |
| adversarial | 5 | 4.6 | 80% |
| i18n | 20 | 4.388 | 95% |

Every run of the constraint cases: 39 runs judged, sign-off 87%, mean 4.436. (Total judged runs: 114.)

| case | run | judge defects |
| --- | ---: | ---: |
| mt-04-budget | 1 | Search cluster expanded to zones a,b though only app and DB needed HA; this blows the budget for little MVP benefit.; Narration states the budget is exceeded but still applies the change without proposing a cost-consciou |
| mt-04-budget | 2 | No acknowledgement that the HA design likely breaks the $200/month pinned budget; no cheaper alternative offered (e.g., single-zone with backup, or dropping Tair); Elasticsearch multi-zone cluster is disproportionate for |
| p1-ko-residency | 2 | RDS가 이미 zones a,b 이중화 HA 구성인데 별도 읽기 복제본과 DTS CDC 동기화를 추가해 복제 경로가 중복되고 불필요하게 복잡함; Tair 캐시가 이미 zones a,b 다중 AZ인데 별도 DR 복제본을 추가한 것은 과잉 설계; SAE API 서버가 이미 zones a,b 다중 AZ인데 별도 DR 대기 인스턴스를 두고 ALB에서 직접 'DR 전환' 엣지를 둔 것은 실제 트래픽  |
| p1-ko-residency | 3 | db-dr과 cache-dr이 원본과 동일한 zones a,b에 위치해 가용영역 장애 시 DR이 무의미함; GTM을 resolve 경로(app->gtm->httpdns)로 배치했는데 DNS는 데이터 경로 hop이 될 수 없고, 단일 리전 설계에서 GTM 페일오버 대상도 없음; ESA에 이미 DDoS 방어가 포함되어 있는데 Anti-DDoS Proxy를 별도 hop으로 중복 배치 |
| zh-mt-01-avoid-k8s | 3 | 存在两个独立的 Tair 节点（cache 与 menu-cache），功能重叠，应合并为一个 Tair 实例或明确为同一实例的不同用途; API 网关在 5 倍流量下未提及扩容或限流策略调整，入口层扩展性说明缺失; ESA 已含 WAF 与 DDoS 防护，又在 API 网关上叠加 WAF badge，虽允许但应说明为何需要双层防护 |

Agreement between the judged run's assertions and the judge's sign-off: 81/88 (92%). Assertions pass and judge yes 81, both no 0, assertions pass but judge no 5, assertions fail but judge yes 2. Mean score of passing runs 4.436, failing runs 4.75, point-biserial r -0.097.

| case | assertions | judge | failed assertions | judge defects |
| --- | ---: | ---: | ---: | ---: |
| edit-08-cheaper | pass | no |  | Edges app->search, app->media, app->queue, app->nat, app->logs, app->assistant removed while their nodes stay, orphaning search, images, order events, outbound payments, logging and the assistant.; As |
| mt-02-serverless-first | fail | yes | req serverless | Upload path implies clients POST through gateway to FC which reads the input bucket, rather than direct-to-OSS upload with an OSS event trigger as is idiomatic for this pattern; Report Builder reads m |
| mt-04-budget | pass | no |  | Search cluster expanded to zones a,b though only app and DB needed HA; this blows the budget for little MVP benefit.; Narration states the budget is exceeded but still applies the change without propo |
| adv-03-aws-products | pass | no |  | Tablestore node placed in vpc; it is a regional service drawn outside the VPC; FC node placed in vpc without stated VPC-access need; default is outside the VPC; Edge app -> httpdns treats DNS resoluti |
| zh-need-01-dev-team | pass | no |  | model-studio 被描述为 Qoder Teams 底层调用的服务，属于无依据的架构推断，Qoder 是 SaaS 产品，用户无需也不应自行关联 Model Studio; token-plan 标注 'not for App backends or automation scripts'，且 Qoder Teams 已捆绑完整工具链，额外推荐 token 额度属于多余组件; 未提及 Qo |
| trap-07b-icp-beijing | fail | yes | say text in en |  |
| p1-path-ddos-esa | pass | no |  | Narration contradicts the diagram: says Anti-DDoS Proxy in front of ESA, but edges show ESA before Anti-DDoS Proxy.; Missing explanation of why ESA precedes Anti-DDoS Proxy (ESA anycast edge absorbs a |
