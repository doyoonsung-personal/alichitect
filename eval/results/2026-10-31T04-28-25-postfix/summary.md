# Evaluation summary

Model qwen3.8-max (fallback qwen3.7-max), catalog 2026-10-31 (223 entries), system prompt 47232 chars (sha256 728642954632), 3 runs per case, started 2026-10-31T04:28:25.664Z.

## Overall

| measure | value |
| --- | ---: |
| cases / conversations / turns | 18 / 54 / 102 |
| pass@1 (mean case pass rate) | 74% |
| pass@3 (some run passes) | 94% |
| majority (over half the runs pass) | 83% |
| all runs pass | 44% |
| conversations passing every assertion | 74% |
| turns passing every assertion | 84% |
| assertions passing (1041 checks) | 99% |
| conversations that hit an API failure | 0 |
| list-price cost of the model runs | $0.78 |

## By category

| category | cases | runs | run pass | pass@3 | majority | all runs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pattern | 2 | 6 | 83% | 100% | 100% | 50% |
| need | 4 | 12 | 75% | 75% | 75% | 75% |
| trap | 1 | 3 | 100% | 100% | 100% | 100% |
| edit | 1 | 3 | 67% | 100% | 100% | 0% |
| multiturn | 4 | 12 | 50% | 100% | 50% | 0% |
| i18n | 6 | 18 | 83% | 100% | 100% | 50% |

## By language

| language | cases | runs | run pass | pass@3 | majority | all runs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 12 | 36 | 69% | 92% | 75% | 42% |
| ko | 2 | 6 | 67% | 100% | 100% | 0% |
| zh | 4 | 12 | 92% | 100% | 100% | 75% |

## By assertion type (worst first)

| type | checks | passed | rate | cases that failed it |
| --- | ---: | ---: | ---: | ---: |
| mention | 3 | 1 | 33% | 1 |
| format | 102 | 97 | 95% | 3 |
| retention | 84 | 80 | 95% | 2 |
| attachValid | 102 | 98 | 96% | 3 |
| include | 81 | 80 | 99% | 1 |
| exclude | 27 | 27 | 100% | 0 |
| primaryRec | 15 | 15 | 100% | 0 |
| size | 36 | 36 | 100% | 0 |
| notMention | 6 | 6 | 100% | 0 |
| noErrors | 102 | 102 | 100% | 0 |
| escapes | 102 | 102 | 100% | 0 |
| noPrices | 102 | 102 | 100% | 0 |
| sayLang | 102 | 102 | 100% | 0 |
| question | 3 | 3 | 100% | 0 |
| attach | 6 | 6 | 100% | 0 |
| pathOrder | 87 | 87 | 100% | 0 |
| editMinimal | 6 | 6 | 100% | 0 |
| region | 21 | 21 | 100% | 0 |
| req | 21 | 21 | 100% | 0 |
| whyLang | 30 | 30 | 100% | 0 |
| noWarn | 3 | 3 | 100% | 0 |

## Cases below 100% (10 of 18)

| case | runs passed | what failed |
| --- | ---: | ---: |
| need-04-claude-code | 0/3 | NDJSON only, ends with done (3) |
| mt-01-avoid-k8s | 1/3 | every attachment names a valid host (2) |
| mt-04-budget | 1/3 | mentions cost/budget/$200/price (2) |
| pat-12-ecommerce-security | 2/3 | include fraud-detection (1) |
| edit-03-swap-k8s | 2/3 | NDJSON only, ends with done (1) |
| mt-03-data-in-singapore | 2/3 | regions only singapore/ap-southeast-1 (1) |
| ko-need-01-dev-team | 2/3 | NDJSON only, ends with done (1) |
| ko-mt-01-avoid-k8s | 2/3 | every attachment names a valid host (1) |
| zh-mt-01-avoid-k8s | 2/3 | every attachment names a valid host (1) |
| mt-06-summary-window | 2/3 | regions only jakarta/ap-southeast-5/indonesia (1) |

## Warnings before and after deterministic repair

| code | before: total | per turn | turns | after: total | per turn | fixed by repair |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| orphan-node | 9 | 0.088 | 9 | 14 | 0.137 | 0 |
| containment | 8 | 0.078 | 7 | 0 | 0 | 10 |
| attach-host-missing | 5 | 0.049 | 4 | 0 | 0 | 5 |

Severity before repair {"warn":11,"info":7,"error":4}, after {"info":7,"warn":7}. Unknown products: 0 (none). Product strings that were not catalog ids: 0 (none).

## Latency (main stream)

| measure | n | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| first say | 102 | 1.54 s | 2.12 s | 2.93 s |
| first op | 102 | 2.01 s | 2.64 s | 3.50 s |
| first node | 83 | 3.49 s | 4.60 s | 5.75 s |
| stream total (all turns) | 102 | 5.82 s | 23.5 s | 31.6 s |
| stream total, new diagrams | 87 | 7.10 s | 23.6 s | 31.6 s |
| stream total, edits | 54 | 4.66 s | 9.40 s | 11.5 s |
| stream total, product answers | 15 | 4.08 s | 5.31 s | 5.38 s |
| whole turn incl. retries and follow-up | 102 | 6.75 s | 23.5 s | 31.6 s |

## Tokens and cost

| measure | value |
| --- | ---: |
| prompt tokens | 1363916 |
| cached prompt tokens | 1273984 (93%) |
| completion tokens | 46534 |
| completion tokens per turn p50 / p95 | 224 / 1246 |
| cost per turn mean / p95 | $0.0076 / $0.0115 |
| cost per conversation mean / p95 | $0.0144 / $0.0380 |
| total | $0.78 |

## Reliability

| counter | value |
| --- | ---: |
| turns | 102 |
| main stream ended without done (truncated) | 5 |
| continuation turns | 5 |
| repair turns | 0 |
| hedged turns / hedge won | 0 / 0 |
| turns that used the fallback model | 0 |
| extra attempts after failures | 0 |
| conversations with an API failure | 0 |
| bad (unparseable) lines | 0 |
| \u escapes | 0 |

## Languages

| language | turns | completion tokens / turn | vs English twin | prompt tokens / turn | say in language | why in language | \u escapes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 72 | 449 | - | 13481 | 72/72 | 0/0 | 0 |
| ko | 12 | 480 | 1.06 | 13784 | 12/12 | 12/12 | 0 |
| zh | 18 | 468 | 1.057 | 12661 | 18/18 | 18/18 | 0 |

## Multi-turn retention

| case | turns | retention checks passed per turn | run pass |
| --- | ---: | ---: | ---: |
| mt-01-avoid-k8s | 4 | 3/3  3/3  6/6  6/6 | 33% |
| mt-03-data-in-singapore | 4 | 3/3  5/6  2/3  2/3 | 67% |
| mt-04-budget | 3 | 3/3  6/6  3/3 | 33% |
| ko-mt-01-avoid-k8s | 3 | 3/3  3/3  6/6 | 67% |
| zh-mt-01-avoid-k8s | 3 | 3/3  3/3  6/6 | 67% |
| mt-06-summary-window | 5 | 6/6  6/6  6/6  6/6  11/12 | 67% |

## Judge (kimi-k3)

| measure | value |
| --- | ---: |
| runs judged / judge errors | 18 / 0 |
| completeness | 4.389 |
| accuracy | 4.278 |
| rationality | 4.056 |
| readability | 4.444 |
| overall | 4.292 |
| architect would sign off | 78% |
| judge cost | $0.151 |

| category | judged | overall score | sign-off |
| --- | ---: | ---: | ---: |
| pattern | 2 | 4.375 | 50% |
| need | 4 | 4.188 | 100% |
| trap | 1 | 5 | 100% |
| edit | 1 | 4.25 | 100% |
| multiturn | 4 | 4.313 | 75% |
| i18n | 6 | 4.208 | 67% |

Agreement between the judged run's assertions and the judge's sign-off: 15/18 (83%). Assertions pass and judge yes 12, both no 3, assertions pass but judge no 1, assertions fail but judge yes 2. Mean score of passing runs 4.442, failing runs 3.9, point-biserial r 0.491.

| case | assertions | judge | failed assertions | judge defects |
| --- | ---: | ---: | ---: | ---: |
| need-04-claude-code | fail | yes | NDJSON only, ends with done | Narration could mention the Singapore-only availability and that it is sold via Qwen Cloud / Model Studio international; No mention of included model coverage (e.g., qwen3.8-max) which would help conf |
| ko-need-01-dev-team | fail | yes | NDJSON only, ends with done | token-plan은 싱가포르 전용인데 지역 제약 언급 없음; model-studio를 '앱 백엔드' 용도로 제시했으나 사용자는 코딩 에이전트만 요청해 다소 불필요 |
| ko-mt-01-avoid-k8s | pass | no |  | PolarDB 읽기 복제본과 RocketMQ 확장을 별도 노드로 추가했으나, 실제로는 기존 인스턴스의 스케일 아웃/사양 변경으로 처리하는 것이 적절함; 메뉴 캐시용 Tair(menu-cache)와 기존 Tair 캐시(cache)가 중복되어 하나로 통합하는 것이 합리적임; turn 3 설명에서 SAE 자동 확장은 언급했으나 PolarDB와 RocketMQ의  |
