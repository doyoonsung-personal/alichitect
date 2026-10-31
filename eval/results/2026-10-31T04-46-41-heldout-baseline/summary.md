# Evaluation summary

Model qwen3.8-max (fallback qwen3.7-max), catalog 2026-10-31 (223 entries), system prompt 42079 chars (sha256 a19383a1a4c6), 3 runs per case, started 2026-10-31T04:46:41.539Z.

## Overall

| measure | value |
| --- | ---: |
| cases / conversations / turns | 10 / 30 / 48 |
| pass@1 (mean case pass rate) | 63% |
| pass@3 (some run passes) | 80% |
| majority (over half the runs pass) | 70% |
| all runs pass | 40% |
| conversations passing every assertion | 63% |
| turns passing every assertion | 75% |
| assertions passing (477 checks) | 96% |
| conversations that hit an API failure | 0 |
| list-price cost of the model runs | $0.29 |

## By category

| category | cases | runs | run pass | pass@3 | majority | all runs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| multiturn | 4 | 12 | 67% | 75% | 75% | 50% |
| need | 2 | 6 | 17% | 50% | 0% | 0% |
| i18n | 2 | 6 | 83% | 100% | 100% | 50% |
| trap | 1 | 3 | 100% | 100% | 100% | 100% |
| pattern | 1 | 3 | 67% | 100% | 100% | 0% |

## By language

| language | cases | runs | run pass | pass@3 | majority | all runs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 8 | 24 | 58% | 75% | 63% | 38% |
| ko | 1 | 3 | 100% | 100% | 100% | 100% |
| zh | 1 | 3 | 67% | 100% | 100% | 0% |

## By assertion type (worst first)

| type | checks | passed | rate | cases that failed it |
| --- | ---: | ---: | ---: | ---: |
| question | 3 | 1 | 33% | 1 |
| primaryRec | 6 | 3 | 50% | 1 |
| exclude | 15 | 9 | 60% | 2 |
| whyLang | 6 | 5 | 83% | 1 |
| attachValid | 48 | 45 | 94% | 1 |
| retention | 33 | 31 | 94% | 1 |
| pathOrder | 42 | 41 | 98% | 1 |
| format | 48 | 47 | 98% | 1 |
| include | 27 | 27 | 100% | 0 |
| noErrors | 48 | 48 | 100% | 0 |
| escapes | 48 | 48 | 100% | 0 |
| noPrices | 48 | 48 | 100% | 0 |
| sayLang | 48 | 48 | 100% | 0 |
| attach | 3 | 3 | 100% | 0 |
| size | 27 | 27 | 100% | 0 |
| req | 6 | 6 | 100% | 0 |
| region | 12 | 12 | 100% | 0 |
| editMinimal | 6 | 6 | 100% | 0 |
| mention | 3 | 3 | 100% | 0 |

## Cases below 100% (6 of 10)

| case | runs passed | what failed |
| --- | ---: | ---: |
| ho-scale-sae | 0/3 | exclude ess (3); every attachment names a valid host (3) |
| ho-tools-cline | 0/3 | exclude coding-plan/qoder-cn/lingma (3); primary rec token-plan (3); NDJSON only, ends with done (1) |
| ho-team-agent-b | 1/3 | asks a question (2) |
| ho-residency-korea | 2/3 | regions only seoul/ap-northeast-2 (1) |
| ho-zh-short-followup | 2/3 | why text in zh (1) |
| ho-ddos-game-login | 2/3 | clean path order after repair (1) |

## Warnings before and after deterministic repair

| code | before: total | per turn | turns | after: total | per turn | fixed by repair |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| orphan-node | 7 | 0.146 | 7 | 10 | 0.208 | 0 |
| attach-host-missing | 3 | 0.063 | 3 | 0 | 0 | 3 |
| containment | 2 | 0.042 | 1 | 0 | 0 | 2 |
| path-order | 1 | 0.021 | 1 | 1 | 0.021 | 0 |
| attach-inline | 1 | 0.021 | 1 | 0 | 0 | 1 |
| unknown-id | 1 | 0.021 | 1 | 0 | 0 | 0 |

Severity before repair {"info":8,"warn":5,"error":2}, after {"info":6,"warn":5}. Unknown products: 0 (none). Product strings that were not catalog ids: 0 (none).

## Latency (main stream)

| measure | n | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| first say | 48 | 1.40 s | 2.02 s | 2.23 s |
| first op | 48 | 1.79 s | 2.48 s | 2.63 s |
| first node | 42 | 3.19 s | 4.50 s | 5.21 s |
| stream total (all turns) | 48 | 5.42 s | 18.2 s | 20.0 s |
| stream total, new diagrams | 42 | 6.61 s | 18.3 s | 20.0 s |
| stream total, edits | 24 | 4.03 s | 7.32 s | 8.34 s |
| stream total, product answers | 6 | 4.41 s | 4.85 s | 4.89 s |
| whole turn incl. retries and follow-up | 48 | 5.42 s | 18.2 s | 20.0 s |

## Tokens and cost

| measure | value |
| --- | ---: |
| prompt tokens | 552090 |
| cached prompt tokens | 531584 (96%) |
| completion tokens | 18967 |
| completion tokens per turn p50 / p95 | 228 / 920 |
| cost per turn mean / p95 | $0.0060 / $0.0088 |
| cost per conversation mean / p95 | $0.0096 / $0.0200 |
| total | $0.29 |

## Reliability

| counter | value |
| --- | ---: |
| turns | 48 |
| main stream ended without done (truncated) | 1 |
| continuation turns | 1 |
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
| en | 42 | 440 | - | 11463 | 42/42 | 0/0 | 0 |
| ko | 3 | 80 | - | 11773 | 3/3 | 3/3 | 0 |
| zh | 3 | 87 | - | 11773 | 3/3 | 2/3 | 0 |

## Multi-turn retention

| case | turns | retention checks passed per turn | run pass |
| --- | ---: | ---: | ---: |
| ho-residency-korea | 3 | 3/3  5/6  5/6 | 67% |
| ho-scale-sae | 2 | 0/0  6/6 | 0% |
| ho-scale-ecs-ok | 2 | 0/0  6/6 | 100% |
| ho-budget-ha | 3 | 3/3  3/3  6/6 | 100% |

## Judge (off)

No judge scores.
