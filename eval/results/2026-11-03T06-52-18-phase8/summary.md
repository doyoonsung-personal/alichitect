# Evaluation summary

Model qwen3.8-max (fallback qwen3.7-max), catalog 2026-10-31 (232 entries), system prompt 59906 chars (sha256 998fab223dab), 1 runs per case, started 2026-11-03T06:52:18.852Z.

## Overall

**pass@1 100%, all 1 runs pass 100%** (2 cases). pass@1 is best-of-1 and is listed last.

| measure | value |
| --- | ---: |
| cases / conversations / turns | 2 / 2 / 3 |
| pass@1 (mean case pass rate) | 100% |
| all runs pass | 100% |
| majority (over half the runs pass) | 100% |
| pass@1 (some run passes) | 100% |
| conversations passing every assertion | 100% |
| turns passing every assertion | 100% |
| assertions passing (34 checks) | 100% |
| conversations that hit an API failure | 0 |
| list-price cost of the model runs | $0.05 |

## By category

| category | cases | runs | run pass | all runs | majority | pass@1 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pattern | 1 | 1 | 100% | 100% | 100% | 100% |
| i18n | 1 | 1 | 100% | 100% | 100% | 100% |

## By language

| language | cases | runs | run pass | all runs | majority | pass@1 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 1 | 1 | 100% | 100% | 100% | 100% |
| ko | 1 | 1 | 100% | 100% | 100% | 100% |

## By assertion type (worst first)

| type | checks | passed | rate | cases that failed it |
| --- | ---: | ---: | ---: | ---: |
| include | 9 | 9 | 100% | 0 |
| size | 2 | 2 | 100% | 0 |
| noErrors | 3 | 3 | 100% | 0 |
| pathOrder | 3 | 3 | 100% | 0 |
| attachValid | 3 | 3 | 100% | 0 |
| format | 3 | 3 | 100% | 0 |
| escapes | 3 | 3 | 100% | 0 |
| noPrices | 3 | 3 | 100% | 0 |
| sayLang | 3 | 3 | 100% | 0 |
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
| first token (answering attempt) | 3 | 1.67 s | 2.66 s | 2.77 s |
| first token as waited for (failed attempts included) | 3 | 1.67 s | 2.66 s | 2.77 s |
| first say | 3 | 1.97 s | 3.01 s | 3.13 s |
| first op | 3 | 2.50 s | 3.51 s | 3.62 s |
| first node | 3 | 4.93 s | 5.07 s | 5.08 s |
| stream total (all turns) | 3 | 10.2 s | 10.8 s | 10.8 s |
| stream total, new diagrams | 3 | 10.2 s | 10.8 s | 10.8 s |
| stream total, edits | 3 | 10.2 s | 10.8 s | 10.8 s |
| stream total, product answers | 0 | - | - | - |
| whole turn incl. retries and follow-up | 3 | 10.2 s | 10.8 s | 10.8 s |

## Tokens and cost

| measure | value |
| --- | ---: |
| prompt tokens | 47198 |
| cached prompt tokens | 30592 (65%) |
| completion tokens | 1267 |
| completion tokens per turn p50 / p95 | 423 / 480 |
| cost per turn mean / p95 | $0.0162 / $0.0308 |
| cost per conversation mean / p95 | $0.0242 / $0.0324 |
| total | $0.05 |

## Reliability

| counter | value |
| --- | ---: |
| turns | 3 |
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

0 of 3 turns (0%) failed over in the main stream; reasons {}. Follow-up turns that ran on another model: 0.

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
| en | 1 | 358 | - | 15591 | 1/1 | 0/0 | 0 |
| ko | 2 | 455 | 1.358 | 15804 | 2/2 | 2/2 | 0 |

## Multi-turn retention

| case | turns | retention checks passed per turn | run pass |
| --- | ---: | ---: | ---: |
| deploy-intake-ko | 2 | 0/0  0/0 | 100% |

## Judge (off)

No judge scores.
