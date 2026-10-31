# Evaluation summary

Model qwen3.8-max (fallback qwen3.7-max), catalog 2026-10-31 (223 entries), system prompt 47678 chars (sha256 ee81494bff2d), 3 runs per case, started 2026-10-31T04:52:42.657Z.

## Overall

**pass@1 95%, all 3 runs pass 88%** (80 cases). pass@3 is best-of-3 and is listed last.

| measure | value |
| --- | ---: |
| cases / conversations / turns | 80 / 240 / 309 |
| pass@1 (mean case pass rate) | 95% |
| all runs pass | 88% |
| majority (over half the runs pass) | 96% |
| pass@3 (some run passes) | 100% |
| conversations passing every assertion | 95% |
| turns passing every assertion | 96% |
| assertions passing (3237 checks) | 100% |
| conversations that hit an API failure | 1 |
| list-price cost of the model runs | $2.22 |

## By category

| category | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pattern | 13 | 39 | 97% | 92% | 100% | 100% |
| need | 13 | 39 | 92% | 77% | 100% | 100% |
| trap | 16 | 48 | 98% | 94% | 100% | 100% |
| edit | 9 | 27 | 100% | 100% | 100% | 100% |
| multiturn | 6 | 18 | 83% | 67% | 83% | 100% |
| adversarial | 5 | 15 | 100% | 100% | 100% | 100% |
| i18n | 18 | 54 | 91% | 83% | 89% | 100% |

## By language

| language | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 62 | 186 | 96% | 89% | 98% | 100% |
| ko | 9 | 27 | 93% | 89% | 89% | 100% |
| zh | 9 | 27 | 89% | 78% | 89% | 100% |

## By assertion type (worst first)

| type | checks | passed | rate | cases that failed it |
| --- | ---: | ---: | ---: | ---: |
| api | 1 | 0 | 0% | 1 |
| question | 3 | 2 | 67% | 1 |
| residency | 27 | 24 | 89% | 2 |
| attachValid | 308 | 301 | 98% | 5 |
| primaryRec | 54 | 53 | 98% | 1 |
| retention | 126 | 124 | 98% | 1 |
| include | 357 | 356 | 100% | 1 |
| exclude | 132 | 132 | 100% | 0 |
| noErrors | 308 | 308 | 100% | 0 |
| pathOrder | 246 | 246 | 100% | 0 |
| format | 308 | 308 | 100% | 0 |
| escapes | 308 | 308 | 100% | 0 |
| noPrices | 308 | 308 | 100% | 0 |
| sayLang | 308 | 308 | 100% | 0 |
| size | 120 | 120 | 100% | 0 |
| region | 42 | 42 | 100% | 0 |
| zones | 18 | 18 | 100% | 0 |
| notMention | 15 | 15 | 100% | 0 |
| attach | 12 | 12 | 100% | 0 |
| noWarn | 54 | 54 | 100% | 0 |
| mention | 14 | 14 | 100% | 0 |
| editMinimal | 66 | 66 | 100% | 0 |
| restore | 3 | 3 | 100% | 0 |
| req | 33 | 33 | 100% | 0 |
| whyLang | 66 | 66 | 100% | 0 |

## Cases below 100% (10 of 80)

| case | runs passed | what failed |
| --- | ---: | ---: |
| ko-pat-04-rag | 1/3 | every attachment names a valid host (2) |
| zh-pat-04-rag | 1/3 | every attachment names a valid host (2) |
| mt-06-summary-window | 1/3 | regions only jakarta/ap-southeast-5/indonesia (2); residency ap-southeast-5 (2) |
| pat-12-ecommerce-security | 2/3 | include fraud-detection (1) |
| need-03-ambiguous-team | 2/3 | asks a question (1) |
| need-06-cs-chatbot | 2/3 | every attachment names a valid host (1) |
| need-07-analysts | 2/3 | primary rec quick-bi-aipro/smart-q/dms-data-agent (1); every attachment names a valid host (1) |
| trap-07-icp | 2/3 | turn completed (1); api: turn 1: content-filtered: <400> InternalError.Algo.DataInspectionFailed: Output  (1) |
| mt-03-data-in-singapore | 2/3 | residency ap-southeast-1 (1) |
| zh-mt-01-avoid-k8s | 2/3 | every attachment names a valid host (1) |

## Warnings before and after deterministic repair

| code | before: total | per turn | turns | after: total | per turn | fixed by repair |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| orphan-node | 46 | 0.149 | 46 | 53 | 0.172 | 0 |
| containment | 37 | 0.12 | 21 | 0 | 0 | 38 |
| unknown-id | 8 | 0.026 | 5 | 0 | 0 | 0 |
| attach-host-missing | 7 | 0.023 | 7 | 0 | 0 | 7 |
| duplicate-id | 2 | 0.006 | 2 | 0 | 0 | 0 |
| path-order | 2 | 0.006 | 2 | 2 | 0.006 | 0 |
| bad-json | 1 | 0.003 | 1 | 1 | 0.003 | 0 |
| attach-inline | 1 | 0.003 | 1 | 0 | 0 | 1 |

Severity before repair {"info":56,"warn":28,"error":20}, after {"info":48,"warn":8}. Unknown products: 0 (none). Product strings that were not catalog ids: 0 (none).

## Latency (main stream)

| measure | n | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| first token (answering attempt) | 309 | 1.25 s | 1.79 s | 2.31 s |
| first token as waited for (failed attempts included) | 309 | 1.25 s | 1.79 s | 2.31 s |
| first say | 309 | 1.55 s | 2.17 s | 3.31 s |
| first op | 308 | 1.99 s | 2.73 s | 3.83 s |
| first node | 234 | 3.64 s | 4.85 s | 6.28 s |
| stream total (all turns) | 309 | 7.28 s | 21.0 s | 36.0 s |
| stream total, new diagrams | 246 | 12.3 s | 21.9 s | 36.0 s |
| stream total, edits | 105 | 4.53 s | 10.7 s | 22.0 s |
| stream total, product answers | 55 | 3.94 s | 5.34 s | 5.82 s |
| whole turn incl. retries and follow-up | 309 | 7.31 s | 21.2 s | 36.0 s |

## Tokens and cost

| measure | value |
| --- | ---: |
| prompt tokens | 3914599 |
| cached prompt tokens | 3746304 (96%) |
| completion tokens | 150983 |
| completion tokens per turn p50 / p95 | 308 / 1127 |
| cost per turn mean / p95 | $0.0072 / $0.0109 |
| cost per conversation mean / p95 | $0.0092 / $0.0294 |
| total | $2.22 |

## Reliability

| counter | value |
| --- | ---: |
| turns | 309 |
| main stream ended without done (truncated) | 1 |
| continuation turns | 0 |
| repair turns | 2 |
| hedged turns / hedge won | 0 / 0 |
| turns that used the fallback model | 0 |
| extra attempts after failures | 0 |
| conversations with an API failure | 1 |
| bad (unparseable) lines | 1 |
| \u escapes | 0 |

## Failover to the fallback model

0 of 309 turns (0%) failed over in the main stream; reasons {}. Follow-up turns that ran on another model: 0.

## Cut-off turns

Main streams that ended without done: 1 ({"content-filtered":1}). Rescued by the continuation turn: 0 (0 of them pass every assertion); not rescued: 1. Turn pass rate without the rescued turns: 96%.

## Constraint compliance (machine-checked)

| check | passed | rate |
| --- | ---: | ---: |
| residency (final graph and final narration, core checker) | 24/27 | 89% |
| pinned constraints as data (req regions / avoid) | 0/0 | - |
| avoided products absent (exclude and retained exclude) | 159/159 | 100% |

Residency checks with a warn-level foreign-region mention (not failed, reviewed by hand): 0. Residency checks where the product's repair turn corrected the main-stream narration: 0. Turns with pinned constraints in memory: 0. Product constraint findings before repair {}, left after repair {}.

| case | run | turn | residency finding |
| --- | ---: | ---: | ---: |
| mt-06-summary-window | 1 | 5 | region group 'sg' (Singapore (ap-southeast-1)) is in Singapore (ap-southeast-1) and holds tr-sg, db-dr, oss-dr; the pinned regions are Jakarta (ap-southeast-5) ("eval residency"); the why of 'gtm' says "Routes users to J |
| mt-03-data-in-singapore | 3 | 2 | a say line pairs Kuala Lumpur (ap-southeast-3) with "replication": "OSS cross-region replication to Kuala Lumpur"; the pinned regions are Singapore (ap-southeast-1) ("eval residency"). Correct the narration and keep data |
| mt-06-summary-window | 3 | 5 | region group 'sg' (Singapore (ap-southeast-1)) is in Singapore (ap-southeast-1) and holds tr-sg, dr-db, dr-gw; the pinned regions are Jakarta (ap-southeast-5) ("eval residency"); the why of 'gtm' says "fails over to Sing |

## Repairs

| deterministic fix | fixes | turns |
| --- | ---: | ---: |
| containment | 38 | 21 |
| attach-host-missing | 7 | 7 |
| attach-inline | 1 | 1 |

LLM follow-up turns: 2 ({"repair":2}); turns by finding code {"duplicate-id":2}.

| case | run | turn | kind | turn passes | findings |
| --- | ---: | ---: | ---: | ---: | ---: |
| trap-05b-apigw-partner | 2 | 1 | repair | yes | duplicate-id/error: node 'partners' collides with a group id; op dropped |
| trap-05b-apigw-partner | 3 | 1 | repair | yes | duplicate-id/error: node 'partners' collides with a group id; op dropped |

## Languages

| language | turns | completion tokens / turn | vs English twin | prompt tokens / turn | say in language | why in language | \u escapes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 243 | 485 | - | 12703 | 242/242 | 0/0 | 0 |
| ko | 33 | 513 | 1.304 | 12547 | 33/33 | 33/33 | 0 |
| zh | 33 | 494 | 1.227 | 12535 | 33/33 | 33/33 | 0 |

## Multi-turn retention

| case | turns | retention checks passed per turn | run pass |
| --- | ---: | ---: | ---: |
| edit-06-restore | 2 | 0/0  0/0 | 100% |
| mt-01-avoid-k8s | 4 | 3/3  3/3  6/6  6/6 | 100% |
| mt-02-serverless-first | 3 | 3/3  3/3  6/6 | 100% |
| mt-03-data-in-singapore | 4 | 6/6  8/9  6/6  6/6 | 67% |
| mt-04-budget | 3 | 3/3  6/6  3/3 | 100% |
| ko-mt-01-avoid-k8s | 3 | 3/3  3/3  6/6 | 100% |
| zh-mt-01-avoid-k8s | 3 | 3/3  3/3  6/6 | 67% |
| mt-05-mixed-five-turns | 5 | 6/6  9/9  9/9  9/9  9/9 | 100% |
| mt-06-summary-window | 5 | 9/9  9/9  9/9  9/9  11/15 | 33% |

## Judge (kimi-k3)

| measure | value |
| --- | ---: |
| runs judged / judge errors | 80 / 0 |
| completeness | 4.55 |
| accuracy | 4.5 |
| rationality | 4.263 |
| readability | 4.513 |
| overall | 4.456 |
| architect would sign off | 93% |
| judge cost | $0.591 |

| category | judged | overall score | sign-off |
| --- | ---: | ---: | ---: |
| pattern | 13 | 4.346 | 100% |
| need | 13 | 4.019 | 77% |
| trap | 16 | 4.672 | 100% |
| edit | 9 | 4.778 | 89% |
| multiturn | 6 | 4.333 | 83% |
| adversarial | 5 | 4.75 | 100% |
| i18n | 18 | 4.458 | 94% |

Agreement between the judged run's assertions and the judge's sign-off: 72/80 (90%). Assertions pass and judge yes 71, both no 1, assertions pass but judge no 5, assertions fail but judge yes 3. Mean score of passing runs 4.487, failing runs 3.875, point-biserial r 0.272.

| case | assertions | judge | failed assertions | judge defects |
| --- | ---: | ---: | ---: | ---: |
| pat-12-ecommerce-security | fail | yes | include fraud-detection | No SLS node for security/audit logs; No Security Center for host-level protection of ECS app servers; Narration mentions 'edge WAF' on ESA but the diagram only shows WAF badge on ALB; slight mismatch, |
| need-03-ambiguous-team | pass | no |  | Recommends Qoder Teams as primary despite the audience being unspecified; Qoder Teams is explicitly not for non-developer staff; Adds token-plan as a complement without justification; Qoder Teams bund |
| need-06-cs-chatbot | fail | yes | every attachment names a valid host | No AI Guardrails or equivalent content-safety component, which the guidance lists as typical for a customer-facing chatbot; Dify node has no edges of its own; all flows are drawn from the generic ACK  |
| need-07-analysts | pass | no |  | Quick BI AIPro is a SaaS service; routing user HTTPS traffic through an in-VPC ALB to it is wrong placement (ALB hop should not front a SaaS product); DNS is drawn as a hop in the data path (users ->  |
| need-10-build-agents | pass | no |  | AgentLoop node is in the Singapore region group, but AgentLoop has no Singapore region for international users (Hong Kong only); it should be flagged or placed in a Hong Kong region.; Agent Security C |
| edit-07-multi-region-dr | pass | no |  | GTM and ESA failover paths conflict: users -> GTM -> DNS, but users also go straight to ESA which routes to both ALBs; GTM is not actually in the decision path.; gtm -> dns edge is backwards (DNS shou |
| ko-pat-04-rag | fail | yes | every attachment names a valid host | 엣지가 ack에서 출발하지만 실제 파이프라인 주체는 dify 노드이므로 dify 기준 엣지가 더 정확함; dns가 resolve 홉으로 표시됨(데이터 경로는 아니지만 허용 수준); qwenwork 추천은 preview 상태이며 한국어 미지원(영/중)인 점이 언급되지 않음 |
| zh-need-01-dev-team | pass | no |  | token-plan 被描述为供 IDE 调用模型的额度，但 Qoder Teams 席位本身已包含编程智能体能力，token-plan 标注不适用于应用后端/自动化，作为补充推荐依据不足; model-studio 被列为 'Qoder Teams 底层调用的模型 API 服务' 属于实现细节暴露，用户无需购买，且 Model Studio 的 Agent 应用对国际新账户已关闭，易误导; 未提 |
