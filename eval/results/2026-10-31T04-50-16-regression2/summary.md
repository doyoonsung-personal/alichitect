# Evaluation summary

Model qwen3.8-max (fallback qwen3.7-max), catalog 2026-10-31 (223 entries), system prompt 47416 chars (sha256 ba0463a6d5d7), 4 runs per case, started 2026-10-31T04:50:16.070Z.

## Overall

| measure | value |
| --- | ---: |
| cases / conversations / turns | 2 / 8 / 16 |
| pass@1 (mean case pass rate) | 50% |
| pass@4 (some run passes) | 50% |
| majority (over half the runs pass) | 50% |
| all runs pass | 50% |
| conversations passing every assertion | 50% |
| turns passing every assertion | 75% |
| assertions passing (164 checks) | 98% |
| conversations that hit an API failure | 0 |
| list-price cost of the model runs | $0.10 |

## By category

| category | cases | runs | run pass | pass@4 | majority | all runs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pattern | 1 | 4 | 0% | 0% | 0% | 0% |
| multiturn | 1 | 4 | 100% | 100% | 100% | 100% |

## By language

| language | cases | runs | run pass | pass@4 | majority | all runs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 2 | 8 | 50% | 50% | 50% | 50% |

## By assertion type (worst first)

| type | checks | passed | rate | cases that failed it |
| --- | ---: | ---: | ---: | ---: |
| attachValid | 16 | 13 | 81% | 1 |
| include | 28 | 27 | 96% | 1 |
| exclude | 8 | 8 | 100% | 0 |
| noErrors | 16 | 16 | 100% | 0 |
| pathOrder | 16 | 16 | 100% | 0 |
| format | 16 | 16 | 100% | 0 |
| escapes | 16 | 16 | 100% | 0 |
| noPrices | 16 | 16 | 100% | 0 |
| sayLang | 16 | 16 | 100% | 0 |
| req | 4 | 4 | 100% | 0 |
| retention | 12 | 12 | 100% | 0 |

## Cases below 100% (1 of 2)

| case | runs passed | what failed |
| --- | ---: | ---: |
| pat-04-rag | 0/4 | every attachment names a valid host (3); include fc/sae/ack/acs/ecs/agentcore/agentrun (1) |

## Warnings before and after deterministic repair

| code | before: total | per turn | turns | after: total | per turn | fixed by repair |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| attach-host-missing | 3 | 0.188 | 3 | 0 | 0 | 3 |
| containment | 1 | 0.063 | 1 | 0 | 0 | 1 |
| orphan-node | 0 | 0 | 0 | 3 | 0.188 | 0 |

Severity before repair {"warn":3,"error":1}, after {"warn":3}. Unknown products: 0 (none). Product strings that were not catalog ids: 0 (none).

## Latency (main stream)

| measure | n | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| first say | 16 | 1.64 s | 1.89 s | 1.91 s |
| first op | 16 | 1.99 s | 2.36 s | 2.41 s |
| first node | 16 | 3.26 s | 3.79 s | 3.96 s |
| stream total (all turns) | 16 | 7.95 s | 15.0 s | 18.3 s |
| stream total, new diagrams | 16 | 7.95 s | 15.0 s | 18.3 s |
| stream total, edits | 8 | 4.57 s | 5.42 s | 5.47 s |
| stream total, product answers | 0 | - | - | - |
| whole turn incl. retries and follow-up | 16 | 7.95 s | 15.1 s | 18.3 s |

## Tokens and cost

| measure | value |
| --- | ---: |
| prompt tokens | 199956 |
| cached prompt tokens | 192000 (96%) |
| completion tokens | 6917 |
| completion tokens per turn p50 / p95 | 421 / 791 |
| cost per turn mean / p95 | $0.0066 / $0.0083 |
| cost per conversation mean / p95 | $0.0132 / $0.0184 |
| total | $0.10 |

## Reliability

| counter | value |
| --- | ---: |
| turns | 16 |
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
| en | 16 | 432 | - | 12497 | 16/16 | 0/0 | 0 |

## Multi-turn retention

| case | turns | retention checks passed per turn | run pass |
| --- | ---: | ---: | ---: |
| mt-02-serverless-first | 3 | 4/4  4/4  8/8 | 100% |

## Judge (off)

No judge scores.
