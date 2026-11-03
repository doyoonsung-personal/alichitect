# Evaluation summary

Model qwen3.8-max (fallback qwen3.7-max), catalog 2026-10-31 (232 entries), system prompt 59906 chars (sha256 998fab223dab), 2 runs per case, started 2026-11-03T06:56:42.736Z.

## Overall

**pass@1 100%, all 2 runs pass 100%** (2 cases). pass@2 is best-of-2 and is listed last.

| measure | value |
| --- | ---: |
| cases / conversations / turns | 2 / 4 / 6 |
| pass@1 (mean case pass rate) | 100% |
| all runs pass | 100% |
| majority (over half the runs pass) | 100% |
| pass@2 (some run passes) | 100% |
| conversations passing every assertion | 100% |
| turns passing every assertion | 100% |
| assertions passing (66 checks) | 100% |
| conversations that hit an API failure | 0 |
| list-price cost of the model runs | $0.04 |

## By category

| category | cases | runs | run pass | all runs | majority | pass@2 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pattern | 1 | 2 | 100% | 100% | 100% | 100% |
| i18n | 1 | 2 | 100% | 100% | 100% | 100% |

## By language

| language | cases | runs | run pass | all runs | majority | pass@2 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 1 | 2 | 100% | 100% | 100% | 100% |
| ko | 1 | 2 | 100% | 100% | 100% | 100% |

## By assertion type (worst first)

| type | checks | passed | rate | cases that failed it |
| --- | ---: | ---: | ---: | ---: |
| include | 18 | 18 | 100% | 0 |
| size | 4 | 4 | 100% | 0 |
| noErrors | 6 | 6 | 100% | 0 |
| pathOrder | 6 | 6 | 100% | 0 |
| attachValid | 6 | 6 | 100% | 0 |
| format | 6 | 6 | 100% | 0 |
| escapes | 6 | 6 | 100% | 0 |
| noPrices | 6 | 6 | 100% | 0 |
| sayLang | 6 | 6 | 100% | 0 |
| whyLang | 2 | 2 | 100% | 0 |

## Cases below 100% (0 of 2)

| case | runs passed | what failed |
| --- | ---: | ---: |

## Warnings before and after deterministic repair

| code | before: total | per turn | turns | after: total | per turn | fixed by repair |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |

Severity before repair {}, after {}. Unknown products: 0 (none). Product strings that were not catalog ids: 0 (none).

## Latency (main stream)

| measure | n | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| first token (answering attempt) | 6 | 1.50 s | 1.67 s | 1.72 s |
| first token as waited for (failed attempts included) | 6 | 1.50 s | 1.67 s | 1.72 s |
| first say | 6 | 1.76 s | 1.96 s | 2.00 s |
| first op | 6 | 2.22 s | 2.50 s | 2.57 s |
| first node | 4 | 4.50 s | 5.04 s | 5.12 s |
| stream total (all turns) | 6 | 9.88 s | 11.7 s | 11.8 s |
| stream total, new diagrams | 6 | 9.88 s | 11.7 s | 11.8 s |
| stream total, edits | 6 | 9.88 s | 11.7 s | 11.8 s |
| stream total, product answers | 0 | - | - | - |
| whole turn incl. retries and follow-up | 6 | 9.88 s | 11.7 s | 11.8 s |

## Tokens and cost

| measure | value |
| --- | ---: |
| prompt tokens | 94583 |
| cached prompt tokens | 91648 (97%) |
| completion tokens | 1973 |
| completion tokens per turn p50 / p95 | 433 / 494 |
| cost per turn mean / p95 | $0.0068 / $0.0075 |
| cost per conversation mean / p95 | $0.0101 / $0.0134 |
| total | $0.04 |

## Reliability

| counter | value |
| --- | ---: |
| turns | 6 |
| main stream ended without done (truncated) | 0 |
| continuation turns | 0 |
| repair turns | 0 |
| hedged turns / hedge won | 0 / 0 |
| turns that used the fallback model | 0 |
| extra attempts after failures | 0 |
| conversations with an API failure | 0 |
| bad (unparseable) lines | 0 |
| \u escapes | 0 |

## Failover to the fallback model

0 of 6 turns (0%) failed over in the main stream; reasons {}. Follow-up turns that ran on another model: 0.

## Cut-off turns

Main streams that ended without done: 0 ({}). Rescued by the continuation turn: 0 (0 of them pass every assertion); not rescued: 0. Turn pass rate without the rescued turns: 100%.

## Constraint compliance (machine-checked)

| check | passed | rate |
| --- | ---: | ---: |
| residency (final graph and final narration, core checker) | 0/0 | - |
| pinned constraints as data (req regions / avoid) | 0/0 | - |
| avoided products absent (exclude and retained exclude) | 0/0 | - |

Residency checks with a warn-level foreign-region mention (not failed, reviewed by hand): 0. Residency checks where the product's repair turn corrected the main-stream narration: 0. Turns with pinned constraints in memory: 0. Product constraint findings before repair {}, left after repair {}.

## Repairs

| deterministic fix | fixes | turns |
| --- | ---: | ---: |

LLM follow-up turns: 0 ({}); turns by finding code {}.

## Languages

| language | turns | completion tokens / turn | vs English twin | prompt tokens / turn | say in language | why in language | \u escapes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 2 | 433 | - | 15617 | 2/2 | 0/0 | 0 |
| ko | 4 | 277 | 1.124 | 15837 | 4/4 | 2/2 | 0 |

## Multi-turn retention

| case | turns | retention checks passed per turn | run pass |
| --- | ---: | ---: | ---: |
| deploy-intake-ko | 2 | 0/0  0/0 | 100% |

## Judge (off)

No judge scores.
