# Evaluation summary

Model qwen3.8-max (fallback qwen3.7-max), catalog 2026-10-31 (223 entries), system prompt 49687 chars (sha256 ad75dbaaa9c2), 3 runs per case, started 2026-10-31T14:58:07.458Z.

## Overall

**pass@1 97%, all 3 runs pass 93%** (88 cases). pass@3 is best-of-3 and is listed last.

| measure | value |
| --- | ---: |
| cases / conversations / turns | 88 / 264 / 351 |
| pass@1 (mean case pass rate) | 97% |
| all runs pass | 93% |
| majority (over half the runs pass) | 99% |
| pass@3 (some run passes) | 100% |
| conversations passing every assertion | 97% |
| turns passing every assertion | 98% |
| assertions passing (3749 checks) | 100% |
| conversations that hit an API failure | 1 |
| list-price cost of the model runs | $2.98 |

## By category

| category | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pattern | 16 | 48 | 96% | 88% | 100% | 100% |
| need | 13 | 39 | 92% | 85% | 92% | 100% |
| trap | 16 | 48 | 98% | 94% | 100% | 100% |
| edit | 9 | 27 | 100% | 100% | 100% | 100% |
| multiturn | 9 | 27 | 96% | 89% | 100% | 100% |
| adversarial | 5 | 15 | 100% | 100% | 100% | 100% |
| i18n | 20 | 60 | 100% | 100% | 100% | 100% |

## By language

| language | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 68 | 204 | 97% | 91% | 99% | 100% |
| ko | 10 | 30 | 100% | 100% | 100% | 100% |
| zh | 10 | 30 | 100% | 100% | 100% | 100% |

## By assertion type (worst first)

| type | checks | passed | rate | cases that failed it |
| --- | ---: | ---: | ---: | ---: |
| api | 1 | 0 | 0% | 1 |
| primaryRec | 54 | 51 | 94% | 2 |
| residency | 45 | 44 | 98% | 1 |
| residencyScan | 45 | 44 | 98% | 1 |
| retention | 153 | 152 | 99% | 1 |
| include | 390 | 389 | 100% | 1 |
| attachValid | 350 | 349 | 100% | 1 |
| exclude | 138 | 138 | 100% | 0 |
| noErrors | 350 | 350 | 100% | 0 |
| pathOrder | 288 | 288 | 100% | 0 |
| format | 350 | 350 | 100% | 0 |
| escapes | 350 | 350 | 100% | 0 |
| noPrices | 350 | 350 | 100% | 0 |
| sayLang | 350 | 350 | 100% | 0 |
| size | 120 | 120 | 100% | 0 |
| region | 60 | 60 | 100% | 0 |
| zones | 18 | 18 | 100% | 0 |
| notMention | 15 | 15 | 100% | 0 |
| question | 3 | 3 | 100% | 0 |
| attach | 15 | 15 | 100% | 0 |
| noWarn | 54 | 54 | 100% | 0 |
| mention | 14 | 14 | 100% | 0 |
| editMinimal | 81 | 81 | 100% | 0 |
| restore | 3 | 3 | 100% | 0 |
| req | 45 | 45 | 100% | 0 |
| whyLang | 77 | 77 | 100% | 0 |
| linked | 6 | 6 | 100% | 0 |
| pins | 21 | 21 | 100% | 0 |
| placement | 3 | 3 | 100% | 0 |

## Cases below 100% (6 of 88)

| case | runs passed | what failed |
| --- | ---: | ---: |
| need-07-analysts | 1/3 | primary rec quick-bi-aipro/smart-q/dms-data-agent (2) |
| pat-03-serverless-api | 2/3 | include tablestore/rds/polardb/mongodb/lindorm (1) |
| need-08-contractor-desktops | 2/3 | primary rec eds (1) |
| trap-07-icp | 2/3 | turn completed (1); api: turn 1: content-filtered: <400> InternalError.Algo.DataInspectionFailed: Output  (1) |
| mt-06-summary-window | 2/3 | regions only jakarta/ap-southeast-5/indonesia (1); residency ap-southeast-5 (1); residency scan ap-southeast-5 (1) |
| p1-vpc-no-group | 2/3 | every attachment names a valid host (1) |

## Warnings before and after deterministic repair

| code | before: total | per turn | turns | after: total | per turn | fixed by repair |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| orphan-node | 43 | 0.123 | 41 | 43 | 0.123 | 0 |
| containment | 37 | 0.105 | 29 | 0 | 0 | 41 |
| constraint-region | 23 | 0.066 | 13 | 22 | 0.063 | 0 |
| missing-group | 5 | 0.014 | 5 | 0 | 0 | 5 |
| unknown-id | 5 | 0.014 | 3 | 0 | 0 | 0 |
| attach-host-missing | 4 | 0.011 | 4 | 0 | 0 | 1 |
| path-order | 3 | 0.009 | 3 | 0 | 0 | 3 |
| duplicate-id | 2 | 0.006 | 2 | 0 | 0 | 0 |
| bad-json | 1 | 0.003 | 1 | 1 | 0.003 | 0 |
| china-only | 1 | 0.003 | 1 | 1 | 0.003 | 0 |
| bad-op | 1 | 0.003 | 1 | 0 | 0 | 0 |
| unknown-product | 1 | 0.003 | 1 | 1 | 0.003 | 0 |
| constraint-replaced | 0 | 0 | 0 | 1 | 0.003 | 0 |

Severity before repair {"warn":47,"info":46,"error":33}, after {"info":41,"warn":28}. Unknown products: 1 (zolo-real-id x1). Product strings that were not catalog ids: 1 (zolo-real-id x1).

## Latency (main stream)

| measure | n | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| first token (answering attempt) | 351 | 1.11 s | 1.57 s | 6.66 s |
| first token as waited for (failed attempts included) | 351 | 1.11 s | 1.88 s | 9.60 s |
| first say | 351 | 1.43 s | 1.94 s | 6.96 s |
| first op | 350 | 1.92 s | 2.51 s | 7.46 s |
| first node | 274 | 3.64 s | 4.93 s | 6.70 s |
| stream total (all turns) | 351 | 8.15 s | 23.4 s | 37.2 s |
| stream total, new diagrams | 288 | 12.2 s | 23.8 s | 37.2 s |
| stream total, edits | 123 | 4.98 s | 9.94 s | 21.8 s |
| stream total, product answers | 55 | 4.03 s | 5.99 s | 8.89 s |
| whole turn incl. retries and follow-up | 351 | 8.56 s | 23.7 s | 37.2 s |

## Tokens and cost

| measure | value |
| --- | ---: |
| prompt tokens | 4641953 |
| cached prompt tokens | 4322688 (93%) |
| completion tokens | 173163 |
| completion tokens per turn p50 / p95 | 328 / 1141 |
| cost per turn mean / p95 | $0.0085 / $0.0149 |
| cost per conversation mean / p95 | $0.0113 / $0.0331 |
| total | $2.98 |

## Reliability

| counter | value |
| --- | ---: |
| turns | 351 |
| main stream ended without done (truncated) | 1 |
| continuation turns | 0 |
| repair turns | 3 |
| hedged turns / hedge won | 0 / 0 |
| turns that used the fallback model | 7 |
| extra attempts after failures | 7 |
| conversations with an API failure | 1 |
| bad (unparseable) lines | 1 |
| \u escapes | 0 |

## Failover to the fallback model

7 of 351 turns (2%) failed over in the main stream; reasons {"first-byte-timeout":7}. Follow-up turns that ran on another model: 0.

| measure | n | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| stalled attempt before failover | 7 | 8.12 s | 8.22 s | 8.23 s |
| fallback first token | 7 | 1.29 s | 1.37 s | 1.37 s |
| first token as waited for | 7 | 9.40 s | 9.57 s | 9.60 s |
| whole turn | 7 | 20.3 s | 27.8 s | 29.2 s |

## Cut-off turns

Main streams that ended without done: 1 ({"content-filtered":1}). Rescued by the continuation turn: 0 (0 of them pass every assertion); not rescued: 1. Turn pass rate without the rescued turns: 98%.

## Constraint compliance (machine-checked)

| check | passed | rate |
| --- | ---: | ---: |
| residency (final graph and final narration, core checker) | 44/45 | 98% |
| residency, independent scan (own place table and cue words; shares no code with the checker) | 44/45 | 98% |
| pinned constraints as data (req regions / avoid) | 21/21 | 100% |
| avoided products absent (exclude and retained exclude) | 174/174 | 100% |

Residency checks with a warn-level foreign-region mention (not failed, reviewed by hand): 2. Residency checks where the product's repair turn corrected the main-stream narration: 1. Turns with pinned constraints in memory: 127. Product constraint findings before repair {"constraint-region":{"total":23,"turns":13,"error":1}}, left after repair {"constraint-region":{"total":22,"turns":12,"error":0}}.

Independent residency scan hits (read each one: it errs towards flagging):

| case | run | turn | scan finding |
| --- | ---: | ---: | ---: |
| mt-06-summary-window | 1 | 5 | group kl: Kuala Lumpur/ap-southeast-3 in "Kuala Lumpur (ap-southeast-3)"; say db-dr: Cross-region in "Cross-region read replica for disaster recovery"; say docs-dr: Cross-region in "Cross-region replicated driver documen |

| case | run | turn | residency finding |
| --- | ---: | ---: | ---: |
| mt-06-summary-window | 1 | 5 | region group 'kl' (Kuala Lumpur (ap-southeast-3)) is in Kuala Lumpur (ap-southeast-3) and holds db-dr, docs-dr; the pinned regions are Jakarta (ap-southeast-5) ("eval residency"); a say line pairs Kuala Lumpur (ap-southe |

## Repairs

| deterministic fix | fixes | turns |
| --- | ---: | ---: |
| containment | 41 | 33 |
| missing-group | 5 | 5 |
| path-order | 3 | 3 |
| attach-invalid | 3 | 3 |
| attach-host-missing | 1 | 1 |

LLM follow-up turns: 3 ({"repair":3}); turns by finding code {"duplicate-id":2,"constraint-region":1}.

| case | run | turn | kind | turn passes | findings |
| --- | ---: | ---: | ---: | ---: | ---: |
| trap-05b-apigw-partner | 1 | 1 | repair | yes | duplicate-id/error: node 'partners' collides with a group id; op dropped |
| trap-05b-apigw-partner | 3 | 1 | repair | yes | duplicate-id/error: node 'partners' collides with a group id; op dropped |
| mt-06-summary-window | 3 | 5 | repair | yes | constraint-region/error: a say line sends data to another region ("replica"): "Tair replica and OSS cross-region replication within Indonesia"; the pinned regions are Jakarta (ap-southeast-5) ("Customer data must stay in |

## Languages

| language | turns | completion tokens / turn | vs English twin | prompt tokens / turn | say in language | why in language | \u escapes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 273 | 485 | - | 13267 | 272/272 | 0/0 | 0 |
| ko | 39 | 548 | 1.132 | 13096 | 39/39 | 39/39 | 0 |
| zh | 39 | 496 | 1.066 | 13058 | 39/39 | 38/38 | 0 |

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
| mt-05-mixed-five-turns | 5 | 6/6  9/9  9/9  9/9  9/9 | 100% |
| mt-06-summary-window | 5 | 9/9  9/9  9/9  9/9  13/15 | 67% |
| p1-req-residency-my | 2 | 6/6  9/9 | 100% |
| p1-req-avoid-fc | 2 | 3/3  3/3 | 100% |
| p1-avoid-tempted-k8s | 3 | 3/3  3/3  6/6 | 100% |
| p1-ko-residency | 2 | 3/3  6/6 | 100% |
| p1-zh-residency | 2 | 6/6  9/9 | 100% |

## Judge (kimi-k3)

| measure | value |
| --- | ---: |
| runs judged / judge errors | 88 / 0 |
| completeness | 4.557 |
| accuracy | 4.534 |
| rationality | 4.318 |
| readability | 4.523 |
| overall | 4.483 |
| architect would sign off | 96% |
| judge cost | $0.946 |

| category | judged | overall score | sign-off |
| --- | ---: | ---: | ---: |
| pattern | 16 | 4.25 | 94% |
| need | 13 | 4.173 | 100% |
| trap | 16 | 4.734 | 100% |
| edit | 9 | 4.75 | 100% |
| multiturn | 9 | 4.472 | 78% |
| adversarial | 5 | 4.85 | 100% |
| i18n | 20 | 4.463 | 95% |

Every run of the constraint cases: 39 runs judged, sign-off 92%, mean 4.494. (Total judged runs: 114.)

| case | run | judge defects |
| --- | ---: | ---: |
| mt-04-budget | 1 | No cost-conscious HA alternative proposed (e.g., drop Tair, use RDS built-in full-text search or AnalyticDB instead of a separate Elasticsearch cluster, smaller ECS pair) despite the pinned <$200 budget; Elasticsearch se |
| mt-06-summary-window | 1 | DR VPC contains only a standby RDS and OSS bucket; no SAE services, API gateway, Tair cache or RocketMQ in KL, so failover cannot restore service; gtm node has only an inbound resolve edge from dns; no edge showing GTM s |
| zh-mt-01-avoid-k8s | 2 | 5 倍流量需求只通过修改 svc 的 why 文本应付，PolarDB/Tair/RocketMQ 的扩展能力（只读节点、分片、规格）未体现; narration 声称引入 Auto Scaling，但架构中没有该组件，属于未兑现的承诺; 存在两个 Tair 节点（cache 与 menu-cache）功能重叠，菜单缓存可并入统一缓存，略显冗余 |

Agreement between the judged run's assertions and the judge's sign-off: 86/88 (98%). Assertions pass and judge yes 84, both no 2, assertions pass but judge no 2, assertions fail but judge yes 0. Mean score of passing runs 4.506, failing runs 3.5, point-biserial r 0.324.

| case | assertions | judge | failed assertions | judge defects |
| --- | ---: | ---: | ---: | ---: |
| mt-04-budget | pass | no |  | No cost-conscious HA alternative proposed (e.g., drop Tair, use RDS built-in full-text search or AnalyticDB instead of a separate Elasticsearch cluster, smaller ECS pair) despite the pinned <$200 budg |
| zh-need-01-dev-team | pass | no |  | token-plan 标注为 IDE 插件调用 Qwen 模型，但 catalog 明确其不适用于 App backends 或 automation scripts，且 Qoder Teams 已包含完整工具链，无需额外 token-plan; model-studio 被描述为 Qoder Teams 底层调用的服务，但 catalog 未支持此依赖关系，属于臆测; narration 仅一句 |
