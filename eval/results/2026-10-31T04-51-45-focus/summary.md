# Evaluation summary

Model qwen3.8-max (fallback qwen3.7-max), catalog 2026-10-31 (223 entries), system prompt 47678 chars (sha256 ee81494bff2d), 3 runs per case, started 2026-10-31T04:51:45.493Z.

## Overall

| measure | value |
| --- | ---: |
| cases / conversations / turns | 5 / 15 / 15 |
| pass@1 (mean case pass rate) | 93% |
| pass@3 (some run passes) | 100% |
| majority (over half the runs pass) | 100% |
| all runs pass | 80% |
| conversations passing every assertion | 93% |
| turns passing every assertion | 93% |
| assertions passing (174 checks) | 99% |
| conversations that hit an API failure | 0 |
| list-price cost of the model runs | $0.11 |

## By category

| category | cases | runs | run pass | pass@3 | majority | all runs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pattern | 1 | 3 | 100% | 100% | 100% | 100% |
| need | 2 | 6 | 100% | 100% | 100% | 100% |
| i18n | 2 | 6 | 83% | 100% | 100% | 50% |

## By language

| language | cases | runs | run pass | pass@3 | majority | all runs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 3 | 9 | 100% | 100% | 100% | 100% |
| ko | 1 | 3 | 67% | 100% | 100% | 0% |
| zh | 1 | 3 | 100% | 100% | 100% | 100% |

## By assertion type (worst first)

| type | checks | passed | rate | cases that failed it |
| --- | ---: | ---: | ---: | ---: |
| attachValid | 15 | 14 | 93% | 1 |
| primaryRec | 3 | 3 | 100% | 0 |
| size | 6 | 6 | 100% | 0 |
| noErrors | 15 | 15 | 100% | 0 |
| format | 15 | 15 | 100% | 0 |
| escapes | 15 | 15 | 100% | 0 |
| noPrices | 15 | 15 | 100% | 0 |
| sayLang | 15 | 15 | 100% | 0 |
| include | 45 | 45 | 100% | 0 |
| exclude | 12 | 12 | 100% | 0 |
| pathOrder | 12 | 12 | 100% | 0 |
| whyLang | 6 | 6 | 100% | 0 |

## Cases below 100% (1 of 5)

| case | runs passed | what failed |
| --- | ---: | ---: |
| ko-pat-04-rag | 2/3 | every attachment names a valid host (1) |

## Warnings before and after deterministic repair

| code | before: total | per turn | turns | after: total | per turn | fixed by repair |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| containment | 1 | 0.067 | 1 | 0 | 0 | 1 |
| attach-host-missing | 1 | 0.067 | 1 | 0 | 0 | 1 |
| orphan-node | 0 | 0 | 0 | 1 | 0.067 | 0 |

Severity before repair {"error":1,"warn":1}, after {"warn":1}. Unknown products: 0 (none). Product strings that were not catalog ids: 0 (none).

## Latency (main stream)

| measure | n | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| first say | 15 | 1.59 s | 2.08 s | 2.09 s |
| first op | 15 | 2.18 s | 2.80 s | 2.87 s |
| first node | 12 | 3.69 s | 4.88 s | 5.15 s |
| stream total (all turns) | 15 | 13.6 s | 17.3 s | 19.2 s |
| stream total, new diagrams | 12 | 13.8 s | 17.7 s | 19.2 s |
| stream total, edits | 0 | - | - | - |
| stream total, product answers | 3 | 3.98 s | 4.76 s | 4.84 s |
| whole turn incl. retries and follow-up | 15 | 13.6 s | 17.3 s | 19.2 s |

## Tokens and cost

| measure | value |
| --- | ---: |
| prompt tokens | 184068 |
| cached prompt tokens | 177920 (97%) |
| completion tokens | 9110 |
| completion tokens per turn p50 / p95 | 739 / 907 |
| cost per turn mean / p95 | $0.0074 / $0.0092 |
| cost per conversation mean / p95 | $0.0074 / $0.0092 |
| total | $0.11 |

## Reliability

| counter | value |
| --- | ---: |
| turns | 15 |
| main stream ended without done (truncated) | 0 |
| continuation turns | 0 |
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
| en | 9 | 489 | - | 12267 | 9/9 | 0/0 | 0 |
| ko | 3 | 792 | 1.551 | 12279 | 3/3 | 3/3 | 0 |
| zh | 3 | 779 | 1.526 | 12276 | 3/3 | 3/3 | 0 |

## Multi-turn retention

| case | turns | retention checks passed per turn | run pass |
| --- | ---: | ---: | ---: |

## Judge (off)

No judge scores.
