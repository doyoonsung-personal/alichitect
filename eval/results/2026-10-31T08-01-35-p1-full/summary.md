# Evaluation summary

Model qwen3.8-max (fallback qwen3.7-max), catalog 2026-10-31 (223 entries), system prompt 48298 chars (sha256 53b0ef6af750), 3 runs per case, started 2026-10-31T08:01:35.972Z.

## Overall

**pass@1 94%, all 3 runs pass 91%** (88 cases). pass@3 is best-of-3 and is listed last.

| measure | value |
| --- | ---: |
| cases / conversations / turns | 88 / 264 / 351 |
| pass@1 (mean case pass rate) | 94% |
| all runs pass | 91% |
| majority (over half the runs pass) | 94% |
| pass@3 (some run passes) | 98% |
| conversations passing every assertion | 94% |
| turns passing every assertion | 95% |
| assertions passing (3711 checks) | 100% |
| conversations that hit an API failure | 0 |
| list-price cost of the model runs | $2.51 |

## By category

| category | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pattern | 16 | 48 | 94% | 88% | 94% | 100% |
| need | 13 | 39 | 97% | 92% | 100% | 100% |
| trap | 16 | 48 | 96% | 94% | 94% | 100% |
| edit | 9 | 27 | 100% | 100% | 100% | 100% |
| multiturn | 9 | 27 | 78% | 78% | 78% | 78% |
| adversarial | 5 | 15 | 100% | 100% | 100% | 100% |
| i18n | 20 | 60 | 95% | 90% | 95% | 100% |

## By language

| language | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 68 | 204 | 94% | 91% | 94% | 97% |
| ko | 10 | 30 | 90% | 80% | 90% | 100% |
| zh | 10 | 30 | 100% | 100% | 100% | 100% |

## By assertion type (worst first)

| type | checks | passed | rate | cases that failed it |
| --- | ---: | ---: | ---: | ---: |
| question | 3 | 2 | 67% | 1 |
| req | 48 | 42 | 88% | 2 |
| retention | 156 | 153 | 98% | 1 |
| attachValid | 351 | 346 | 99% | 3 |
| editMinimal | 81 | 80 | 99% | 1 |
| noErrors | 351 | 349 | 99% | 1 |
| include | 390 | 389 | 100% | 1 |
| exclude | 138 | 138 | 100% | 0 |
| pathOrder | 283 | 283 | 100% | 0 |
| format | 351 | 351 | 100% | 0 |
| escapes | 351 | 351 | 100% | 0 |
| noPrices | 351 | 351 | 100% | 0 |
| sayLang | 351 | 351 | 100% | 0 |
| size | 120 | 120 | 100% | 0 |
| region | 60 | 60 | 100% | 0 |
| zones | 18 | 18 | 100% | 0 |
| primaryRec | 54 | 54 | 100% | 0 |
| notMention | 15 | 15 | 100% | 0 |
| attach | 15 | 15 | 100% | 0 |
| noWarn | 54 | 54 | 100% | 0 |
| mention | 15 | 15 | 100% | 0 |
| restore | 3 | 3 | 100% | 0 |
| residency | 45 | 45 | 100% | 0 |
| whyLang | 77 | 77 | 100% | 0 |
| pins | 21 | 21 | 100% | 0 |
| linked | 6 | 6 | 100% | 0 |
| placement | 3 | 3 | 100% | 0 |

## Cases below 100% (8 of 88)

| case | runs passed | what failed |
| --- | ---: | ---: |
| mt-02-serverless-first | 0/3 | req serverless (3) |
| mt-05-mixed-five-turns | 0/3 | req serverless (3); edit {"minChanged":1} (1) |
| ko-trap-08-sydney | 1/3 | no error-level warnings after repair (2) |
| trap-06b-kb-hr | 1/3 | every attachment names a valid host (2) |
| p1-attach-dify-ack | 1/3 | every attachment names a valid host (2) |
| pat-06-iot-streaming | 2/3 | include kafka/datahub/rocketmq (1) |
| need-03-ambiguous-team | 2/3 | asks a question (1) |
| ko-pat-04-rag | 2/3 | every attachment names a valid host (1) |

## Warnings before and after deterministic repair

| code | before: total | per turn | turns | after: total | per turn | fixed by repair |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| orphan-node | 41 | 0.117 | 41 | 40 | 0.114 | 1 |
| constraint-region | 24 | 0.068 | 12 | 10 | 0.028 | 0 |
| containment | 19 | 0.054 | 15 | 0 | 0 | 22 |
| missing-group | 7 | 0.02 | 7 | 0 | 0 | 7 |
| attach-host-missing | 5 | 0.014 | 5 | 0 | 0 | 0 |
| unknown-id | 4 | 0.011 | 2 | 0 | 0 | 0 |
| bad-op | 2 | 0.006 | 2 | 0 | 0 | 0 |
| china-only | 2 | 0.006 | 1 | 1 | 0.003 | 0 |
| path-order | 1 | 0.003 | 1 | 1 | 0.003 | 0 |

Severity before repair {"info":46,"warn":36,"error":23}, after {"info":40,"warn":10,"error":2}. Unknown products: 0 (none). Product strings that were not catalog ids: 0 (none).

## Latency (main stream)

| measure | n | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| first token (answering attempt) | 351 | 1.23 s | 1.92 s | 5.43 s |
| first token as waited for (failed attempts included) | 351 | 1.23 s | 1.92 s | 5.43 s |
| first say | 351 | 1.54 s | 2.30 s | 5.77 s |
| first op | 351 | 2.05 s | 2.85 s | 6.28 s |
| first node | 270 | 3.74 s | 5.38 s | 8.19 s |
| stream total (all turns) | 351 | 7.66 s | 23.1 s | 41.0 s |
| stream total, new diagrams | 283 | 12.0 s | 24.2 s | 41.0 s |
| stream total, edits | 123 | 4.88 s | 11.0 s | 22.2 s |
| stream total, product answers | 60 | 4.38 s | 5.94 s | 7.34 s |
| whole turn incl. retries and follow-up | 351 | 8.21 s | 23.3 s | 41.0 s |

## Tokens and cost

| measure | value |
| --- | ---: |
| prompt tokens | 4576254 |
| cached prompt tokens | 4402176 (96%) |
| completion tokens | 175160 |
| completion tokens per turn p50 / p95 | 312 / 1172 |
| cost per turn mean / p95 | $0.0071 / $0.0107 |
| cost per conversation mean / p95 | $0.0095 / $0.0285 |
| total | $2.51 |

## Reliability

| counter | value |
| --- | ---: |
| turns | 351 |
| main stream ended without done (truncated) | 0 |
| continuation turns | 0 |
| repair turns | 6 |
| hedged turns / hedge won | 0 / 0 |
| turns that used the fallback model | 0 |
| extra attempts after failures | 0 |
| conversations with an API failure | 0 |
| bad (unparseable) lines | 0 |
| \u escapes | 0 |

## Failover to the fallback model

0 of 351 turns (0%) failed over in the main stream; reasons {}. Follow-up turns that ran on another model: 1.

## Cut-off turns

Main streams that ended without done: 0 ({}). Rescued by the continuation turn: 0 (0 of them pass every assertion); not rescued: 0. Turn pass rate without the rescued turns: 95%.

## Constraint compliance (machine-checked)

| check | passed | rate |
| --- | ---: | ---: |
| residency (final graph and final narration, core checker) | 45/45 | 100% |
| pinned constraints as data (req regions / avoid) | 21/21 | 100% |
| avoided products absent (exclude and retained exclude) | 174/174 | 100% |

Residency checks with a warn-level foreign-region mention (not failed, reviewed by hand): 0. Residency checks where the product's repair turn corrected the main-stream narration: 0. Turns with pinned constraints in memory: 129. Product constraint findings before repair {"constraint-region":{"total":24,"turns":12,"error":6}}, left after repair {"constraint-region":{"total":10,"turns":9,"error":2}}.

## Repairs

| deterministic fix | fixes | turns |
| --- | ---: | ---: |
| containment | 22 | 18 |
| missing-group | 7 | 7 |
| attach-invalid | 5 | 5 |
| orphan-node | 1 | 1 |

LLM follow-up turns: 6 ({"repair":6}); turns by finding code {"constraint-region":6}.

| case | run | turn | kind | turn passes | findings |
| --- | ---: | ---: | ---: | ---: | ---: |
| ko-trap-08-sydney | 1 | 1 | repair | no | constraint-region/error: 'users' is labelled "호주 고객", which places it in Sydney (ap-southeast-2); the pinned regions are Singapore (ap-southeast-1) ("시드니 폐쇄로 싱가포르 리전 사용, ESA로 호주 지연시간 최소화"); constraint-region/warn: a say line names Sydney (ap-southeast-2): "시드니 |
| zh-trap-08-sydney | 1 | 1 | repair | yes | constraint-region/error: 'users' is labelled "澳大利亚用户", which places it in Sydney (ap-southeast-2); the pinned regions are Singapore (ap-southeast-1) ("数据和工作负载部署在新加坡地域"); constraint-region/warn: a say line names Sydney (ap-southeast-2): "悉尼（ap-southeast-2）地域已关闭 |
| ko-trap-08-sydney | 2 | 1 | repair | no | constraint-region/error: 'users' is labelled "호주 고객", which places it in Sydney (ap-southeast-2); the pinned regions are Singapore (ap-southeast-1) ("호주 고객 대상, 싱가폴 리전 배포 및 ESA로 지연시간 최소화"); constraint-region/warn: a say line names Sydney (ap-southeast-2): "시드니( |
| zh-trap-08-sydney | 2 | 1 | repair | yes | constraint-region/error: 'users' is labelled "澳大利亚客户", which places it in Sydney (ap-southeast-2); the pinned regions are Singapore (ap-southeast-1) ("数据和工作负载必须保留在新加坡地域"); constraint-region/warn: a say line names Sydney (ap-southeast-2): "悉尼地域已关闭"; the pinned  |
| ko-trap-08-sydney | 3 | 1 | repair | yes | constraint-region/error: 'users' is labelled "호주 고객", which places it in Sydney (ap-southeast-2); the pinned regions are Singapore (ap-southeast-1) ("호주 고객을 위해 싱가포르 리전에 배포"); constraint-region/warn: a say line names Sydney (ap-southeast-2): "시드니(ap-southeast-2 |
| zh-trap-08-sydney | 3 | 1 | repair | yes | constraint-region/error: 'users' is labelled "澳大利亚用户", which places it in Sydney (ap-southeast-2); the pinned regions are Singapore (ap-southeast-1) ("数据和工作负载必须留在新加坡"); constraint-region/warn: a say line names Sydney (ap-southeast-2): "悉尼（ap-southeast-2）地域已关闭" |

## Languages

| language | turns | completion tokens / turn | vs English twin | prompt tokens / turn | say in language | why in language | \u escapes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 273 | 486 | - | 12813 | 273/273 | 0/0 | 0 |
| ko | 39 | 570 | 1.244 | 13846 | 39/39 | 39/39 | 0 |
| zh | 39 | 520 | 1.173 | 13805 | 39/39 | 38/38 | 0 |

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
| mt-05-mixed-five-turns | 5 | 3/6  9/9  9/9  9/9  9/9 | 0% |
| mt-06-summary-window | 5 | 9/9  9/9  9/9  9/9  15/15 | 100% |
| p1-req-residency-my | 2 | 6/6  9/9 | 100% |
| p1-req-avoid-fc | 2 | 3/3  3/3 | 100% |
| p1-avoid-tempted-k8s | 3 | 3/3  3/3  6/6 | 100% |
| p1-ko-residency | 2 | 6/6  9/9 | 100% |
| p1-zh-residency | 2 | 6/6  9/9 | 100% |

## Judge (kimi-k3)

| measure | value |
| --- | ---: |
| runs judged / judge errors | 88 / 0 |
| completeness | 4.557 |
| accuracy | 4.523 |
| rationality | 4.295 |
| readability | 4.5 |
| overall | 4.469 |
| architect would sign off | 98% |
| judge cost | $0.948 |

| category | judged | overall score | sign-off |
| --- | ---: | ---: | ---: |
| pattern | 16 | 4.359 | 100% |
| need | 13 | 4.154 | 100% |
| trap | 16 | 4.641 | 100% |
| edit | 9 | 4.75 | 100% |
| multiturn | 9 | 4.389 | 100% |
| adversarial | 5 | 4.75 | 100% |
| i18n | 20 | 4.463 | 90% |

Every run of the constraint cases: 39 runs judged, sign-off 97%, mean 4.5. (Total judged runs: 114.)

| case | run | judge defects |
| --- | ---: | ---: |
| mt-04-budget | 3 | Turn 3 narration claims the design 'stays under your $200 budget' after making Elasticsearch multi-AZ, but the cumulative cost of HA RDS, multi-AZ Elasticsearch, Tair, ALB and ESA almost certainly exceeds $200/month; no  |

Agreement between the judged run's assertions and the judge's sign-off: 81/88 (92%). Assertions pass and judge yes 81, both no 0, assertions pass but judge no 2, assertions fail but judge yes 5. Mean score of passing runs 4.461, failing runs 4.6, point-biserial r -0.078.

| case | assertions | judge | failed assertions | judge defects |
| --- | ---: | ---: | ---: | ---: |
| mt-02-serverless-first | fail | yes | req serverless | No API Gateway or HTTP trigger shown for the upload API; users PUT directly to OSS via ESA, which skips auth/signing explanation; Nightly report output lands in the output bucket with no path back to  |
| ko-pat-04-rag | fail | yes | every attachment names a valid host | Edge inconsistency: changes list shows dify->llm/vector/docs but final edges show ack->llm/vector/docs; since Dify runs on ACK the flow is ambiguous and should be cleaned up; gateway->ack edge labeled |
| ko-need-01-dev-team | pass | no |  | qwenwork는 'not for Software engineering teams (use Qoder)' 제약이 있어 개발자 팀 요청에 부적합; token-plan은 Singapore-only인데 지역 제약 설명 없음; Qoder Teams가 이미 CLI, Cloud Agents 등을 번들로 포함하는데 token-plan을 별도 complement로 추가한 |
| ko-trap-08-sydney | fail | yes | no error-level warnings after repair |  |
| zh-need-01-dev-team | pass | no |  | token-plan 标注为不适用于应用后端或自动化脚本，且仅新加坡可用，作为编码团队补充推荐不合适; qwenwork 明确标注不适用于软件工程团队（应使用 Qoder），却作为补充推荐; 未提及 Qoder Teams 的隐私模式、SSO 与管理分析之外的选型理由，也未区分 Teams 与 Enterprise |
| trap-06b-kb-hr | fail | yes | every attachment names a valid host |  |
| mt-05-mixed-five-turns | fail | yes | req serverless | GA placement is ambiguous: it sits outside the edge/internet groups and the players->ga->esa->gateway chain double-fronts the API (GA anycast into ESA edge) rather than GA accelerating directly to the |
