# Evaluation summary

Model qwen3.8-max (fallback qwen3.7-max), catalog 2026-10-31 (223 entries), system prompt 47416 chars (sha256 ba0463a6d5d7), 3 runs per case, started 2026-10-31T04:36:57.362Z.

## Overall

| measure | value |
| --- | ---: |
| cases / conversations / turns | 18 / 54 / 102 |
| pass@1 (mean case pass rate) | 95% |
| pass@3 (some run passes) | 100% |
| majority (over half the runs pass) | 100% |
| all runs pass | 83% |
| conversations passing every assertion | 94% |
| turns passing every assertion | 96% |
| assertions passing (1039 checks) | 100% |
| conversations that hit an API failure | 0 |
| list-price cost of the model runs | $0.89 |

## By category

| category | cases | runs | run pass | pass@3 | majority | all runs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pattern | 2 | 6 | 100% | 100% | 100% | 100% |
| need | 4 | 12 | 92% | 100% | 100% | 75% |
| trap | 1 | 3 | 100% | 100% | 100% | 100% |
| edit | 1 | 3 | 100% | 100% | 100% | 100% |
| multiturn | 4 | 12 | 92% | 100% | 100% | 75% |
| i18n | 6 | 18 | 94% | 100% | 100% | 83% |

## By language

| language | cases | runs | run pass | pass@3 | majority | all runs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 12 | 36 | 94% | 100% | 100% | 83% |
| ko | 2 | 6 | 100% | 100% | 100% | 100% |
| zh | 4 | 12 | 92% | 100% | 100% | 75% |

## By assertion type (worst first)

| type | checks | passed | rate | cases that failed it |
| --- | ---: | ---: | ---: | ---: |
| question | 3 | 2 | 67% | 1 |
| retention | 84 | 83 | 99% | 1 |
| attachValid | 102 | 101 | 99% | 1 |
| format | 102 | 101 | 99% | 1 |
| exclude | 27 | 27 | 100% | 0 |
| primaryRec | 15 | 15 | 100% | 0 |
| size | 36 | 36 | 100% | 0 |
| notMention | 6 | 6 | 100% | 0 |
| noErrors | 102 | 102 | 100% | 0 |
| escapes | 102 | 102 | 100% | 0 |
| noPrices | 102 | 102 | 100% | 0 |
| sayLang | 102 | 102 | 100% | 0 |
| region | 21 | 21 | 100% | 0 |
| pathOrder | 87 | 87 | 100% | 0 |
| include | 81 | 81 | 100% | 0 |
| attach | 6 | 6 | 100% | 0 |
| editMinimal | 6 | 6 | 100% | 0 |
| req | 21 | 21 | 100% | 0 |
| mention | 3 | 3 | 100% | 0 |
| whyLang | 28 | 28 | 100% | 0 |
| noWarn | 3 | 3 | 100% | 0 |

## Cases below 100% (3 of 18)

| case | runs passed | what failed |
| --- | ---: | ---: |
| need-03-ambiguous-team | 2/3 | asks a question (1) |
| zh-mt-01-avoid-k8s | 2/3 | NDJSON only, ends with done (1); every attachment names a valid host (1) |
| mt-06-summary-window | 2/3 | regions only jakarta/ap-southeast-5/indonesia (1) |

## Warnings before and after deterministic repair

| code | before: total | per turn | turns | after: total | per turn | fixed by repair |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| orphan-node | 10 | 0.098 | 10 | 11 | 0.108 | 0 |
| containment | 4 | 0.039 | 4 | 0 | 0 | 4 |
| bad-json | 1 | 0.01 | 1 | 0 | 0 | 0 |
| attach-host-missing | 1 | 0.01 | 1 | 0 | 0 | 1 |

Severity before repair {"info":10,"error":4,"warn":2}, after {"info":10,"warn":1}. Unknown products: 0 (none). Product strings that were not catalog ids: 0 (none).

## Latency (main stream)

| measure | n | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| first say | 102 | 1.72 s | 4.24 s | 14.1 s |
| first op | 102 | 2.14 s | 4.73 s | 14.5 s |
| first node | 83 | 3.66 s | 6.08 s | 17.0 s |
| stream total (all turns) | 102 | 7.11 s | 25.1 s | 35.6 s |
| stream total, new diagrams | 87 | 8.32 s | 25.3 s | 35.6 s |
| stream total, edits | 54 | 5.40 s | 9.26 s | 17.4 s |
| stream total, product answers | 15 | 4.54 s | 7.05 s | 7.96 s |
| whole turn incl. retries and follow-up | 102 | 8.15 s | 25.3 s | 40.4 s |

## Tokens and cost

| measure | value |
| --- | ---: |
| prompt tokens | 1306606 |
| cached prompt tokens | 1213440 (93%) |
| completion tokens | 46869 |
| completion tokens per turn p50 / p95 | 270 / 1187 |
| cost per turn mean / p95 | $0.0088 / $0.0141 |
| cost per conversation mean / p95 | $0.0165 / $0.0456 |
| total | $0.89 |

## Reliability

| counter | value |
| --- | ---: |
| turns | 102 |
| main stream ended without done (truncated) | 1 |
| continuation turns | 1 |
| repair turns | 0 |
| hedged turns / hedge won | 2 / 2 |
| turns that used the fallback model | 0 |
| extra attempts after failures | 0 |
| conversations with an API failure | 0 |
| bad (unparseable) lines | 1 |
| \u escapes | 0 |

## Languages

| language | turns | completion tokens / turn | vs English twin | prompt tokens / turn | say in language | why in language | \u escapes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 72 | 464 | - | 12834 | 72/72 | 0/0 | 0 |
| ko | 12 | 470 | 1.017 | 12759 | 12/12 | 12/12 | 0 |
| zh | 18 | 435 | 0.864 | 12749 | 18/18 | 16/16 | 0 |

## Multi-turn retention

| case | turns | retention checks passed per turn | run pass |
| --- | ---: | ---: | ---: |
| mt-01-avoid-k8s | 4 | 3/3  3/3  6/6  6/6 | 100% |
| mt-03-data-in-singapore | 4 | 3/3  6/6  3/3  3/3 | 100% |
| mt-04-budget | 3 | 3/3  6/6  3/3 | 100% |
| ko-mt-01-avoid-k8s | 3 | 3/3  3/3  6/6 | 100% |
| zh-mt-01-avoid-k8s | 3 | 3/3  3/3  6/6 | 67% |
| mt-06-summary-window | 5 | 6/6  6/6  6/6  6/6  11/12 | 67% |

## Judge (kimi-k3)

| measure | value |
| --- | ---: |
| runs judged / judge errors | 18 / 0 |
| completeness | 4.667 |
| accuracy | 4.556 |
| rationality | 4.222 |
| readability | 4.667 |
| overall | 4.528 |
| architect would sign off | 94% |
| judge cost | $0.147 |

| category | judged | overall score | sign-off |
| --- | ---: | ---: | ---: |
| pattern | 2 | 4.875 | 100% |
| need | 4 | 4.063 | 75% |
| trap | 1 | 5 | 100% |
| edit | 1 | 5 | 100% |
| multiturn | 4 | 4.563 | 100% |
| i18n | 6 | 4.542 | 100% |

Agreement between the judged run's assertions and the judge's sign-off: 18/18 (100%). Assertions pass and judge yes 17, both no 1, assertions pass but judge no 0, assertions fail but judge yes 0. Mean score of passing runs 4.574, failing runs 3.75, point-biserial r 0.473.
