# Evaluation summary

Model qwen3.8-max (fallback qwen3.7-max), catalog 2026-10-31 (232 entries), system prompt 59711 chars (sha256 290480d0a20b), 3 runs per case, started 2026-10-31T18:06:03.822Z.

## Overall

**pass@1 96%, all 3 runs pass 91%** (109 cases). pass@3 is best-of-3 and is listed last.

| measure | value |
| --- | ---: |
| cases / conversations / turns | 109 / 327 / 423 |
| pass@1 (mean case pass rate) | 96% |
| all runs pass | 91% |
| majority (over half the runs pass) | 98% |
| pass@3 (some run passes) | 99% |
| conversations passing every assertion | 96% |
| turns passing every assertion | 97% |
| assertions passing (4800 checks) | 100% |
| conversations that hit an API failure | 0 |
| list-price cost of the model runs | $3.71 |

## By category

| category | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pattern | 22 | 66 | 97% | 91% | 100% | 100% |
| need | 20 | 60 | 93% | 90% | 95% | 95% |
| trap | 18 | 54 | 100% | 100% | 100% | 100% |
| edit | 9 | 27 | 100% | 100% | 100% | 100% |
| multiturn | 12 | 36 | 89% | 75% | 92% | 100% |
| adversarial | 5 | 15 | 100% | 100% | 100% | 100% |
| i18n | 23 | 69 | 96% | 87% | 100% | 100% |

## By language

| language | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 86 | 258 | 96% | 92% | 98% | 99% |
| ko | 13 | 39 | 100% | 100% | 100% | 100% |
| zh | 10 | 30 | 90% | 70% | 100% | 100% |

## By assertion type (worst first)

| type | checks | passed | rate | cases that failed it |
| --- | ---: | ---: | ---: | ---: |
| primaryRec | 54 | 50 | 93% | 2 |
| residencyScan | 51 | 50 | 98% | 1 |
| askLang | 50 | 49 | 98% | 1 |
| exclude | 171 | 169 | 99% | 1 |
| include | 513 | 510 | 99% | 2 |
| attachValid | 423 | 421 | 100% | 2 |
| format | 423 | 422 | 100% | 1 |
| noPrices | 423 | 422 | 100% | 1 |
| noErrors | 423 | 423 | 100% | 0 |
| pathOrder | 353 | 353 | 100% | 0 |
| escapes | 423 | 423 | 100% | 0 |
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
| whyLang | 86 | 86 | 100% | 0 |
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

## Cases below 100% (10 of 109)

| case | runs passed | what failed |
| --- | ---: | ---: |
| need-08-contractor-desktops | 0/3 | primary rec eds (3) |
| ai-07-training-residency | 1/3 | exclude agentloop (2) |
| pat-08-global | 2/3 | include cen/transit-router/dts/polardb (1) |
| need-07-analysts | 2/3 | primary rec quick-bi-aipro/smart-q/dms-data-agent (1) |
| zh-pat-04-rag | 2/3 | include model-studio (1); include fc/sae/ack/acs/ecs/agentcore/agentrun (1) |
| zh-trap-08-sydney | 2/3 | ask text in zh (1) |
| mt-05-mixed-five-turns | 2/3 | no invented prices (1) |
| p1-vpc-no-group | 2/3 | every attachment names a valid host (1) |
| p1-avoid-tempted-k8s | 2/3 | NDJSON only, ends with done (1); every attachment names a valid host (1) |
| p1-zh-residency | 2/3 | residency scan ap-southeast-5 (1) |

## Warnings before and after deterministic repair

| code | before: total | per turn | turns | after: total | per turn | fixed by repair |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| orphan-node | 53 | 0.125 | 51 | 53 | 0.125 | 0 |
| containment | 42 | 0.099 | 29 | 0 | 0 | 42 |
| unknown-id | 18 | 0.043 | 7 | 0 | 0 | 0 |
| attach-host-missing | 12 | 0.028 | 12 | 0 | 0 | 2 |
| constraint-region | 11 | 0.026 | 7 | 11 | 0.026 | 0 |
| bad-op | 6 | 0.014 | 6 | 0 | 0 | 0 |
| missing-group | 6 | 0.014 | 6 | 0 | 0 | 6 |
| path-order | 3 | 0.007 | 3 | 0 | 0 | 3 |
| bad-json | 1 | 0.002 | 1 | 1 | 0.002 | 0 |

Severity before repair {"info":70,"warn":60,"error":22}, after {"info":46,"warn":19}. Unknown products: 0 (none). Product strings that were not catalog ids: 0 (none).

## Latency (main stream)

| measure | n | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| first token (answering attempt) | 423 | 1.20 s | 1.93 s | 4.07 s |
| first token as waited for (failed attempts included) | 423 | 1.20 s | 2.00 s | 9.78 s |
| first say | 423 | 1.47 s | 2.26 s | 4.43 s |
| first op | 423 | 1.91 s | 2.86 s | 4.99 s |
| first node | 342 | 3.98 s | 5.51 s | 7.40 s |
| stream total (all turns) | 423 | 9.10 s | 22.3 s | 36.4 s |
| stream total, new diagrams | 353 | 11.7 s | 22.9 s | 36.4 s |
| stream total, edits | 132 | 4.86 s | 10.8 s | 20.9 s |
| stream total, product answers | 55 | 3.94 s | 5.44 s | 6.23 s |
| whole turn incl. retries and follow-up | 423 | 9.33 s | 22.3 s | 36.4 s |

## Tokens and cost

| measure | value |
| --- | ---: |
| prompt tokens | 6608521 |
| cached prompt tokens | 6326784 (96%) |
| completion tokens | 238044 |
| completion tokens per turn p50 / p95 | 446 / 1236 |
| cost per turn mean / p95 | $0.0088 / $0.0126 |
| cost per conversation mean / p95 | $0.0114 / $0.0335 |
| total | $3.71 |

## Reliability

| counter | value |
| --- | ---: |
| turns | 423 |
| main stream ended without done (truncated) | 0 |
| continuation turns | 0 |
| repair turns | 0 |
| hedged turns / hedge won | 0 / 0 |
| turns that used the fallback model | 4 |
| extra attempts after failures | 4 |
| conversations with an API failure | 0 |
| bad (unparseable) lines | 1 |
| \u escapes | 0 |

## Failover to the fallback model

4 of 423 turns (1%) failed over in the main stream; reasons {"first-byte-timeout":4}. Follow-up turns that ran on another model: 0.

| measure | n | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| stalled attempt before failover | 4 | 8.07 s | 8.11 s | 8.11 s |
| fallback first token | 4 | 1.47 s | 1.68 s | 1.71 s |
| first token as waited for | 4 | 9.54 s | 9.76 s | 9.78 s |
| whole turn | 4 | 14.6 s | 24.5 s | 26.0 s |

## Cut-off turns

Main streams that ended without done: 0 ({}). Rescued by the continuation turn: 0 (0 of them pass every assertion); not rescued: 0. Turn pass rate without the rescued turns: 97%.

## Constraint compliance (machine-checked)

| check | passed | rate |
| --- | ---: | ---: |
| residency (final graph and final narration, core checker) | 51/51 | 100% |
| residency, independent scan (own place table and cue words; shares no code with the checker) | 50/51 | 98% |
| pinned constraints as data (req regions / avoid) | 24/24 | 100% |
| avoided products absent (exclude and retained exclude) | 205/207 | 99% |

Residency checks with a warn-level foreign-region mention (not failed, reviewed by hand): 2. Residency checks where the product's repair turn corrected the main-stream narration: 0. Turns with pinned constraints in memory: 129. Product constraint findings before repair {"constraint-region":{"total":11,"turns":7,"error":0}}, left after repair {"constraint-region":{"total":11,"turns":7,"error":0}}.

Independent residency scan hits (read each one: it errs towards flagging):

| case | run | turn | scan finding |
| --- | ---: | ---: | ---: |
| p1-zh-residency | 3 | 2 | say : 跨区域 in "RDS已配置双可用区高可用，Cloud Backup负责定期快照和跨区域（同区域内）备份恢复" |

## Repairs

| deterministic fix | fixes | turns |
| --- | ---: | ---: |
| containment | 42 | 29 |
| attach-invalid | 10 | 10 |
| missing-group | 6 | 6 |
| path-order | 3 | 3 |
| attach-host-missing | 2 | 2 |

LLM follow-up turns: 0 ({}); turns by finding code {}.

## Languages

| language | turns | completion tokens / turn | vs English twin | prompt tokens / turn | say in language | why in language | \u escapes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 336 | 546 | - | 15629 | 336/336 | 0/0 | 0 |
| ko | 48 | 645 | 1.145 | 15577 | 48/48 | 47/47 | 0 |
| zh | 39 | 602 | 1.174 | 15632 | 39/39 | 39/39 | 0 |

## Multi-turn retention

| case | turns | retention checks passed per turn | run pass |
| --- | ---: | ---: | ---: |
| edit-06-restore | 2 | 0/0  0/0 | 100% |
| mt-01-avoid-k8s | 4 | 3/3  3/3  6/6  6/6 | 100% |
| mt-02-serverless-first | 3 | 3/3  3/3  6/6 | 100% |
| mt-03-data-in-singapore | 4 | 6/6  9/9  6/6  6/6 | 100% |
| mt-04-budget | 3 | 3/3  6/6  3/3 | 100% |
| ko-mt-01-avoid-k8s | 3 | 3/3  3/3  6/6 | 100% |
| zh-mt-01-avoid-k8s | 3 | 3/3  3/3  6/6 | 100% |
| mt-05-mixed-five-turns | 5 | 6/6  9/9  9/9  9/9  9/9 | 67% |
| mt-06-summary-window | 5 | 9/9  9/9  9/9  9/9  15/15 | 100% |
| p1-req-residency-my | 2 | 6/6  9/9 | 100% |
| p1-req-avoid-fc | 2 | 3/3  3/3 | 100% |
| p1-avoid-tempted-k8s | 3 | 3/3  3/3  6/6 | 67% |
| p1-ko-residency | 2 | 3/3  6/6 | 100% |
| p1-zh-residency | 2 | 6/6  9/9 | 67% |
| ai-07-training-residency | 2 | 6/6  9/9 | 33% |
| as-04-answer-vague | 2 | 0/0  0/0 | 100% |
| as-05-flip-internal | 2 | 0/0  3/3 | 100% |

## Judge (kimi-k3)

| measure | value |
| --- | ---: |
| runs judged / judge errors | 109 / 0 |
| completeness | 4.385 |
| accuracy | 4.339 |
| rationality | 4.202 |
| readability | 4.413 |
| overall | 4.335 |
| architect would sign off | 90% |
| judge cost | $1.259 |

| category | judged | overall score | sign-off |
| --- | ---: | ---: | ---: |
| pattern | 22 | 4.216 | 91% |
| need | 20 | 4.313 | 90% |
| trap | 18 | 4.306 | 94% |
| edit | 9 | 4.694 | 100% |
| multiturn | 12 | 4.208 | 75% |
| adversarial | 5 | 4.6 | 80% |
| i18n | 23 | 4.359 | 91% |

Every run of the constraint cases: 45 runs judged, sign-off 82%, mean 4.167. (Total judged runs: 139.)

| case | run | judge defects |
| --- | ---: | ---: |
| ai-07-training-residency | 1 | AgentLoop node placed in Singapore region despite being Hong Kong-only internationally; Narration asserts AgentLoop runs in Singapore, misleading the user about data residency; No explanation of why AgentLoop is unsuitab |
| ai-07-training-residency | 2 | AgentLoop node placed in Singapore region despite being Hong Kong-only internationally; Narration states 'AgentLoop ... both in Singapore', a false availability claim; No explanation of why AgentLoop is left out or offer |
| as-05-flip-internal | 1 | dns node and users->dns edge not removed for internal-only design; users node still labeled 'Shoppers' in the Internet group instead of internal staff; media (OSS) why text references ESA which no longer exists |
| as-05-flip-internal | 2 | users->dns resolve edge and Cloud DNS node retained though an internal-only app needs no public DNS; dns why-text still says it resolves to ESA which was deleted; users node still in Internet group labeled 'Shoppers' wit |
| as-05-flip-internal | 3 | users node still sits in Internet group labeled 'Shoppers' and still resolves via public Alibaba Cloud DNS; internal-only design should use private access (VPN/Express Connect) and private DNS or no public DNS hop; media |
| mt-04-budget | 1 | Read replica mislabeled as 'high availability failover' — RDS read replicas are not failover targets; RDS primary/standby HA edition is the correct mechanism; Design knowingly exceeds the pinned budget without presenting |
| mt-04-budget | 2 | Turn 3 narration never addresses the budget impact of adding Tair and NAT despite the pinned <$200/month constraint; guidance calls for an explicit cost note.; Multi-zone managed Elasticsearch plus Tair plus NAT plus ALB |
| p1-ko-residency | 3 | DR DB(dr-db)가 주 DB와 동일한 가용영역(zones a,b)에 위치해 가용영역 장애 시 함께 영향받음; GTM을 단일 리전 내 DB 페일오버 용도로 사용하는 것은 부적절하며, 글로벌 서비스 특성상 데이터 국내 보관 원칙과 충돌 가능성; DTS를 통한 비동기 복제는 RPO가 0이 아니므로 금융 거래 데이터의 재해 복구에는 PolarDB의 동기식 복제나 다중 AZ 구성이 더 적합함 |

Agreement between the judged run's assertions and the judge's sign-off: 96/109 (88%). Assertions pass and judge yes 95, both no 1, assertions pass but judge no 10, assertions fail but judge yes 3. Mean score of passing runs 4.352, failing runs 3.875, point-biserial r 0.176.

| case | assertions | judge | failed assertions | judge defects |
| --- | ---: | ---: | ---: | ---: |
| pat-08-global | fail | yes | include cen/transit-router/dts/polardb | No CEN or private link between the two regional VPCs for cross-region traffic; OSS cross-region replication mentioned in why-text but no replica node or edge shown; No US region despite US users being |
| pat-12-ecommerce-security | pass | no |  | Anti-DDoS Proxy drawn as an inline hop after ESA duplicates ESA's built-in DDoS scrubbing; should be omitted or justified by attack size (the assistant even asks about attack size, so it drew before k |
| need-06-cs-chatbot | pass | no |  | RAG service on ECS is over-provisioned for a chatbot backend; Function Compute or SAE would be more proportionate and is the usual recommendation; Routing the Model Studio call through NAT Gateway imp |
| need-08-contractor-desktops | fail | yes | primary rec eds | No explicit fixed egress IP or audit/logging element despite 'secure' and contractor compliance being the stated driver.; EDS office network is separate from the VPC; if desktops need VPC resources be |
| need-12-qwen-api | pass | no |  | No mention of keeping the API key server-side / KMS; No mention of optional AI Gateway front door; Narration lacks any detail on auth, region choice, or pay-per-token model |
| trap-07-icp | pass | no |  | No first diagram drawn; the request is specific enough (public marketing site, Shanghai) to draw on assumptions and ask at most two questions; Assumption chips missing (e.g., ICP status unknown, singl |
| mt-04-budget | pass | no |  | Read replica mislabeled as 'high availability failover' — RDS read replicas are not failover targets; RDS primary/standby HA edition is the correct mechanism; Design knowingly exceeds the pinned budge |
| adv-03-aws-products | pass | no |  | FC 'API functions' node placed inside the VPC; per placement rules FC is drawn outside the VPC unless VPC access is configured (not stated); Tablestore 'NoSQL database' placed inside the VPC; Tablesto |
| zh-trap-01-lingma | pass | no |  | 叙述过于简略，未解释 Lingma→Qoder 的更名关系及 Qoder CN 中国限制; model-studio 补充推荐不合理，Qoder Teams 席位已捆绑所需能力，单独列出会误导采购; 未提及购买渠道（qoder.com 或 Alibaba Cloud Marketplace）和 10 席位的团队管理要点 |
| ko-trap-07-icp | pass | no |  | 빈 다이어그램: 상하이 리전 공개 웹사이트라는 충분히 구체적인 요청인데도 첫 다이어그램을 그리지 않음; 가정(assumption) 칩이 표시되지 않음; ICP 준비 여부와 무관하게 기본 정적 사이트 패턴(OSS+CDN 등)은 제시 가능했음 |
| p1-vpc-no-group | fail | yes | every attachment names a valid host | PrivateZone is drawn as a standalone node in the region rather than a badge on the VPC, and it is unconnected, making its role unclear; Express Connect is a boundary construct; placing it as a node in |
| ai-05-rag-model-studio | pass | no |  | DNS node violates placement rule: DNS is never a hop in the data path, yet it is drawn with a resolve edge from users.; Model Studio, OSS and SLS are regional managed services and should be drawn outs |
| as-05-flip-internal | pass | no |  | dns node and users->dns edge not removed for internal-only design; users node still labeled 'Shoppers' in the Internet group instead of internal staff; media (OSS) why text references ESA which no lon |
