# Evaluation summary

Model qwen3.8-max (fallback qwen3.7-max), catalog 2026-10-31 (223 entries), system prompt 47678 chars (sha256 ee81494bff2d), 3 runs per case, started 2026-10-31T05:13:08.955Z.

## Overall

| measure | value |
| --- | ---: |
| cases / conversations / turns | 10 / 30 / 48 |
| pass@1 (mean case pass rate) | 100% |
| pass@3 (some run passes) | 100% |
| majority (over half the runs pass) | 100% |
| all runs pass | 100% |
| conversations passing every assertion | 100% |
| turns passing every assertion | 100% |
| assertions passing (477 checks) | 100% |
| conversations that hit an API failure | 0 |
| list-price cost of the model runs | $0.32 |

## By category

| category | cases | runs | run pass | pass@3 | majority | all runs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| multiturn | 4 | 12 | 100% | 100% | 100% | 100% |
| need | 2 | 6 | 100% | 100% | 100% | 100% |
| i18n | 2 | 6 | 100% | 100% | 100% | 100% |
| trap | 1 | 3 | 100% | 100% | 100% | 100% |
| pattern | 1 | 3 | 100% | 100% | 100% | 100% |

## By language

| language | cases | runs | run pass | pass@3 | majority | all runs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 8 | 24 | 100% | 100% | 100% | 100% |
| ko | 1 | 3 | 100% | 100% | 100% | 100% |
| zh | 1 | 3 | 100% | 100% | 100% | 100% |

## By assertion type (worst first)

| type | checks | passed | rate | cases that failed it |
| --- | ---: | ---: | ---: | ---: |
| include | 27 | 27 | 100% | 0 |
| noErrors | 48 | 48 | 100% | 0 |
| pathOrder | 42 | 42 | 100% | 0 |
| attachValid | 48 | 48 | 100% | 0 |
| format | 48 | 48 | 100% | 0 |
| escapes | 48 | 48 | 100% | 0 |
| noPrices | 48 | 48 | 100% | 0 |
| sayLang | 48 | 48 | 100% | 0 |
| attach | 3 | 3 | 100% | 0 |
| retention | 33 | 33 | 100% | 0 |
| exclude | 15 | 15 | 100% | 0 |
| primaryRec | 6 | 6 | 100% | 0 |
| size | 27 | 27 | 100% | 0 |
| question | 3 | 3 | 100% | 0 |
| req | 6 | 6 | 100% | 0 |
| region | 12 | 12 | 100% | 0 |
| editMinimal | 6 | 6 | 100% | 0 |
| whyLang | 6 | 6 | 100% | 0 |
| mention | 3 | 3 | 100% | 0 |

## Cases below 100% (0 of 10)

| case | runs passed | what failed |
| --- | ---: | ---: |

## Warnings before and after deterministic repair

| code | before: total | per turn | turns | after: total | per turn | fixed by repair |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| orphan-node | 6 | 0.125 | 6 | 6 | 0.125 | 0 |

Severity before repair {"info":6}, after {"info":6}. Unknown products: 0 (none). Product strings that were not catalog ids: 0 (none).

## Latency (main stream)

| measure | n | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| first say | 48 | 1.58 s | 2.61 s | 2.87 s |
| first op | 48 | 1.96 s | 3.02 s | 3.39 s |
| first node | 42 | 3.31 s | 4.27 s | 6.42 s |
| stream total (all turns) | 48 | 5.18 s | 17.2 s | 18.4 s |
| stream total, new diagrams | 42 | 5.61 s | 17.4 s | 18.4 s |
| stream total, edits | 24 | 4.27 s | 6.88 s | 7.60 s |
| stream total, product answers | 6 | 3.72 s | 4.85 s | 5.09 s |
| whole turn incl. retries and follow-up | 48 | 5.18 s | 17.2 s | 18.4 s |

## Tokens and cost

| measure | value |
| --- | ---: |
| prompt tokens | 607088 |
| cached prompt tokens | 577920 (95%) |
| completion tokens | 18883 |
| completion tokens per turn p50 / p95 | 226 / 934 |
| cost per turn mean / p95 | $0.0066 / $0.0096 |
| cost per conversation mean / p95 | $0.0105 / $0.0220 |
| total | $0.32 |

## Reliability

| counter | value |
| --- | ---: |
| turns | 48 |
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
| en | 42 | 438 | - | 12580 | 42/42 | 0/0 | 0 |
| ko | 3 | 85 | - | 13121 | 3/3 | 3/3 | 0 |
| zh | 3 | 84 | - | 13121 | 3/3 | 3/3 | 0 |

## Multi-turn retention

| case | turns | retention checks passed per turn | run pass |
| --- | ---: | ---: | ---: |
| ho-residency-korea | 3 | 3/3  6/6  6/6 | 100% |
| ho-scale-sae | 2 | 0/0  6/6 | 100% |
| ho-scale-ecs-ok | 2 | 0/0  6/6 | 100% |
| ho-budget-ha | 3 | 3/3  3/3  6/6 | 100% |

## Judge (off)

No judge scores.
