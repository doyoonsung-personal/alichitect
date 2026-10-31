# Evaluation summary

Model qwen3.8-max (fallback qwen3.7-max), catalog 2026-10-31 (223 entries), system prompt 48590 chars (sha256 cb4995e7ac6b), 3 runs per case, started 2026-10-31T08:59:36.026Z.

## Overall

**pass@1 99%, all 3 runs pass 97%** (88 cases). pass@3 is best-of-3 and is listed last.

| measure | value |
| --- | ---: |
| cases / conversations / turns | 88 / 264 / 351 |
| pass@1 (mean case pass rate) | 99% |
| all runs pass | 97% |
| majority (over half the runs pass) | 100% |
| pass@3 (some run passes) | 100% |
| conversations passing every assertion | 99% |
| turns passing every assertion | 99% |
| assertions passing (3710 checks) | 100% |
| conversations that hit an API failure | 0 |
| list-price cost of the model runs | $2.60 |

## By category

| category | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pattern | 16 | 48 | 98% | 94% | 100% | 100% |
| need | 13 | 39 | 97% | 92% | 100% | 100% |
| trap | 16 | 48 | 100% | 100% | 100% | 100% |
| edit | 9 | 27 | 100% | 100% | 100% | 100% |
| multiturn | 9 | 27 | 96% | 89% | 100% | 100% |
| adversarial | 5 | 15 | 100% | 100% | 100% | 100% |
| i18n | 20 | 60 | 100% | 100% | 100% | 100% |

## By language

| language | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 68 | 204 | 99% | 96% | 100% | 100% |
| ko | 10 | 30 | 100% | 100% | 100% | 100% |
| zh | 10 | 30 | 100% | 100% | 100% | 100% |

## By assertion type (worst first)

| type | checks | passed | rate | cases that failed it |
| --- | ---: | ---: | ---: | ---: |
| question | 3 | 2 | 67% | 1 |
| retention | 153 | 152 | 99% | 1 |
| include | 390 | 389 | 100% | 1 |
| exclude | 138 | 138 | 100% | 0 |
| noErrors | 351 | 351 | 100% | 0 |
| pathOrder | 287 | 287 | 100% | 0 |
| attachValid | 351 | 351 | 100% | 0 |
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
| editMinimal | 81 | 81 | 100% | 0 |
| restore | 3 | 3 | 100% | 0 |
| req | 45 | 45 | 100% | 0 |
| residency | 45 | 45 | 100% | 0 |
| whyLang | 78 | 78 | 100% | 0 |
| pins | 21 | 21 | 100% | 0 |
| linked | 6 | 6 | 100% | 0 |
| placement | 3 | 3 | 100% | 0 |

## Cases below 100% (3 of 88)

| case | runs passed | what failed |
| --- | ---: | ---: |
| pat-03-serverless-api | 2/3 | include tablestore/rds/polardb/mongodb/lindorm (1) |
| need-03-ambiguous-team | 2/3 | asks a question (1) |
| p1-avoid-tempted-k8s | 2/3 | exclude ack/acs/ack-one/asm (1) |

## Warnings before and after deterministic repair

| code | before: total | per turn | turns | after: total | per turn | fixed by repair |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| orphan-node | 51 | 0.145 | 50 | 51 | 0.145 | 0 |
| containment | 26 | 0.074 | 22 | 0 | 0 | 28 |
| unknown-id | 10 | 0.028 | 4 | 0 | 0 | 0 |
| missing-group | 5 | 0.014 | 5 | 0 | 0 | 4 |
| constraint-region | 5 | 0.014 | 3 | 5 | 0.014 | 0 |
| attach-host-missing | 2 | 0.006 | 2 | 0 | 0 | 0 |
| attach-inline | 1 | 0.003 | 1 | 0 | 0 | 1 |
| path-order | 1 | 0.003 | 1 | 0 | 0 | 1 |

Severity before repair {"info":52,"warn":32,"error":17}, after {"info":41,"warn":15}. Unknown products: 0 (none). Product strings that were not catalog ids: 0 (none).

## Latency (main stream)

| measure | n | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| first token (answering attempt) | 351 | 1.28 s | 2.01 s | 3.81 s |
| first token as waited for (failed attempts included) | 351 | 1.28 s | 2.08 s | 9.81 s |
| first say | 351 | 1.58 s | 2.36 s | 4.10 s |
| first op | 351 | 2.06 s | 2.93 s | 4.70 s |
| first node | 274 | 3.82 s | 5.17 s | 7.17 s |
| stream total (all turns) | 351 | 8.34 s | 23.5 s | 34.5 s |
| stream total, new diagrams | 287 | 11.1 s | 24.2 s | 34.5 s |
| stream total, edits | 123 | 5.32 s | 9.94 s | 26.0 s |
| stream total, product answers | 57 | 4.02 s | 5.50 s | 6.15 s |
| whole turn incl. retries and follow-up | 351 | 8.86 s | 23.5 s | 34.5 s |

## Tokens and cost

| measure | value |
| --- | ---: |
| prompt tokens | 4512956 |
| cached prompt tokens | 4310784 (96%) |
| completion tokens | 175697 |
| completion tokens per turn p50 / p95 | 365 / 1179 |
| cost per turn mean / p95 | $0.0074 / $0.0110 |
| cost per conversation mean / p95 | $0.0098 / $0.0305 |
| total | $2.60 |

## Reliability

| counter | value |
| --- | ---: |
| turns | 351 |
| main stream ended without done (truncated) | 0 |
| continuation turns | 0 |
| repair turns | 0 |
| hedged turns / hedge won | 0 / 0 |
| turns that used the fallback model | 3 |
| extra attempts after failures | 3 |
| conversations with an API failure | 0 |
| bad (unparseable) lines | 0 |
| \u escapes | 0 |

## Failover to the fallback model

3 of 351 turns (1%) failed over in the main stream; reasons {"first-byte-timeout":3}. Follow-up turns that ran on another model: 0.

| measure | n | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| stalled attempt before failover | 3 | 8.23 s | 8.24 s | 8.24 s |
| fallback first token | 3 | 1.42 s | 1.56 s | 1.57 s |
| first token as waited for | 3 | 9.62 s | 9.79 s | 9.81 s |
| whole turn | 3 | 14.7 s | 17.2 s | 17.5 s |

## Cut-off turns

Main streams that ended without done: 0 ({}). Rescued by the continuation turn: 0 (0 of them pass every assertion); not rescued: 0. Turn pass rate without the rescued turns: 99%.

## Constraint compliance (machine-checked)

| check | passed | rate |
| --- | ---: | ---: |
| residency (final graph and final narration, core checker) | 45/45 | 100% |
| pinned constraints as data (req regions / avoid) | 21/21 | 100% |
| avoided products absent (exclude and retained exclude) | 173/174 | 99% |

Residency checks with a warn-level foreign-region mention (not failed, reviewed by hand): 0. Residency checks where the product's repair turn corrected the main-stream narration: 0. Turns with pinned constraints in memory: 113. Product constraint findings before repair {"constraint-region":{"total":5,"turns":3,"error":0}}, left after repair {"constraint-region":{"total":5,"turns":3,"error":0}}.

## Repairs

| deterministic fix | fixes | turns |
| --- | ---: | ---: |
| containment | 28 | 24 |
| missing-group | 4 | 4 |
| attach-invalid | 2 | 2 |
| attach-inline | 1 | 1 |
| path-order | 1 | 1 |

LLM follow-up turns: 0 ({}); turns by finding code {}.

## Languages

| language | turns | completion tokens / turn | vs English twin | prompt tokens / turn | say in language | why in language | \u escapes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 273 | 489 | - | 12870 | 273/273 | 0/0 | 0 |
| ko | 39 | 568 | 1.105 | 12842 | 39/39 | 39/39 | 0 |
| zh | 39 | 515 | 1.029 | 12785 | 39/39 | 39/39 | 0 |

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
| mt-06-summary-window | 5 | 9/9  9/9  9/9  9/9  15/15 | 100% |
| p1-req-residency-my | 2 | 6/6  9/9 | 100% |
| p1-req-avoid-fc | 2 | 3/3  3/3 | 100% |
| p1-avoid-tempted-k8s | 3 | 3/3  3/3  5/6 | 67% |
| p1-ko-residency | 2 | 3/3  6/6 | 100% |
| p1-zh-residency | 2 | 6/6  9/9 | 100% |

## Judge (kimi-k3)

| measure | value |
| --- | ---: |
| runs judged / judge errors | 88 / 0 |
| completeness | 4.568 |
| accuracy | 4.477 |
| rationality | 4.307 |
| readability | 4.489 |
| overall | 4.46 |
| architect would sign off | 98% |
| judge cost | $0.951 |

| category | judged | overall score | sign-off |
| --- | ---: | ---: | ---: |
| pattern | 16 | 4.359 | 100% |
| need | 13 | 4.173 | 100% |
| trap | 16 | 4.578 | 100% |
| edit | 9 | 4.75 | 100% |
| multiturn | 9 | 4.639 | 100% |
| adversarial | 5 | 4.55 | 80% |
| i18n | 20 | 4.4 | 95% |

Every run of the constraint cases: 39 runs judged, sign-off 95%, mean 4.442. (Total judged runs: 114.)

| case | run | judge defects |
| --- | ---: | ---: |
| p1-avoid-tempted-k8s | 2 | ASM (managed Istio for clusters) recommended for SAE workloads that have no Kubernetes clusters — MSE microservices governance is the appropriate service-mesh alternative here.; Mesh node placed in region group with only |
| p1-ko-residency | 1 | dr-db가 기본 RDS와 동일하게 zones a,b에 배치되어 있어 AZ 장애 시 DR 역할을 못 함 — 다중 AZ RDS가 이미 HA를 제공하므로 별도 동기 복제본은 중복이거나, 의도했다면 다른 가용영역 조합이어야 함; 엣지 레이블 'DTS 동기화'가 (async)로 표기되어 노드 why의 '동기 복제본/즉시 전환' 설명과 모순; DTS가 카탈로그 제품 목록에 없는데 노드 추가 없이 엣지 |

Agreement between the judged run's assertions and the judge's sign-off: 86/88 (98%). Assertions pass and judge yes 86, both no 0, assertions pass but judge no 2, assertions fail but judge yes 0. Mean score of passing runs 4.46, failing runs -, point-biserial r -.

| case | assertions | judge | failed assertions | judge defects |
| --- | ---: | ---: | ---: | ---: |
| adv-03-aws-products | pass | no |  | Tablestore node placed in vpc; it is a regional service drawn outside the VPC; FC node placed in vpc without stated VPC-access need; default is outside the VPC; Edge app -> httpdns makes DNS a hop in  |
| p1-ko-residency | pass | no |  | dr-db가 기본 RDS와 동일하게 zones a,b에 배치되어 있어 AZ 장애 시 DR 역할을 못 함 — 다중 AZ RDS가 이미 HA를 제공하므로 별도 동기 복제본은 중복이거나, 의도했다면 다른 가용영역 조합이어야 함; 엣지 레이블 'DTS 동기화'가 (async)로 표기되어 노드 why의 '동기 복제본/즉시 전환' 설명과 모순; DTS가 카탈로그 제품 |
