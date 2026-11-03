# Evaluation summary

Model qwen3.8-max (fallback qwen3.7-max), catalog 2026-10-31 (232 entries), system prompt 59906 chars (sha256 998fab223dab), 1 runs per case, started 2026-11-03T06:55:45.751Z.

## Overall

**pass@1 50%, all 1 runs pass 50%** (2 cases). pass@1 is best-of-1 and is listed last.

| measure | value |
| --- | ---: |
| cases / conversations / turns | 2 / 2 / 3 |
| pass@1 (mean case pass rate) | 50% |
| all runs pass | 50% |
| majority (over half the runs pass) | 50% |
| pass@1 (some run passes) | 50% |
| conversations passing every assertion | 50% |
| turns passing every assertion | 67% |
| assertions passing (33 checks) | 97% |
| conversations that hit an API failure | 0 |
| list-price cost of the model runs | $0.02 |

## By category

| category | cases | runs | run pass | all runs | majority | pass@1 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pattern | 1 | 1 | 0% | 0% | 0% | 0% |
| i18n | 1 | 1 | 100% | 100% | 100% | 100% |

## By language

| language | cases | runs | run pass | all runs | majority | pass@1 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 1 | 1 | 0% | 0% | 0% | 0% |
| ko | 1 | 1 | 100% | 100% | 100% | 100% |

## By assertion type (worst first)

| type | checks | passed | rate | cases that failed it |
| --- | ---: | ---: | ---: | ---: |
| pathOrder | 3 | 2 | 67% | 1 |
| include | 9 | 9 | 100% | 0 |
| size | 2 | 2 | 100% | 0 |
| noErrors | 3 | 3 | 100% | 0 |
| attachValid | 3 | 3 | 100% | 0 |
| format | 3 | 3 | 100% | 0 |
| escapes | 3 | 3 | 100% | 0 |
| noPrices | 3 | 3 | 100% | 0 |
| sayLang | 3 | 3 | 100% | 0 |
| whyLang | 1 | 1 | 100% | 0 |

## Cases below 100% (1 of 2)

| case | runs passed | what failed |
| --- | ---: | ---: |
| deploy-intake | 0/1 | clean path order after repair (1) |

## Warnings before and after deterministic repair

| code | before: total | per turn | turns | after: total | per turn | fixed by repair |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| path-order | 1 | 0.333 | 1 | 1 | 0.333 | 0 |

Severity before repair {"warn":1}, after {"warn":1}. Unknown products: 0 (none). Product strings that were not catalog ids: 0 (none).

## Latency (main stream)

| measure | n | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| first token (answering attempt) | 3 | 1.44 s | 1.44 s | 1.44 s |
| first token as waited for (failed attempts included) | 3 | 1.44 s | 1.44 s | 1.44 s |
| first say | 3 | 1.63 s | 1.65 s | 1.65 s |
| first op | 3 | 2.23 s | 2.25 s | 2.26 s |
| first node | 2 | 3.84 s | 3.85 s | 3.86 s |
| stream total (all turns) | 3 | 8.73 s | 9.05 s | 9.09 s |
| stream total, new diagrams | 3 | 8.73 s | 9.05 s | 9.09 s |
| stream total, edits | 3 | 8.73 s | 9.05 s | 9.09 s |
| stream total, product answers | 0 | - | - | - |
| whole turn incl. retries and follow-up | 3 | 8.74 s | 9.06 s | 9.09 s |

## Tokens and cost

| measure | value |
| --- | ---: |
| prompt tokens | 47096 |
| cached prompt tokens | 45696 (97%) |
| completion tokens | 846 |
| completion tokens per turn p50 / p95 | 375 / 399 |
| cost per turn mean / p95 | $0.0064 / $0.0069 |
| cost per conversation mean / p95 | $0.0097 / $0.0122 |
| total | $0.02 |

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

Main streams that ended without done: 0 ({}). Rescued by the continuation turn: 0 (0 of them pass every assertion); not rescued: 0. Turn pass rate without the rescued turns: 67%.

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
| en | 1 | 375 | - | 15588 | 1/1 | 0/0 | 0 |
| ko | 2 | 236 | 1.072 | 15754 | 2/2 | 1/1 | 0 |

## Multi-turn retention

| case | turns | retention checks passed per turn | run pass |
| --- | ---: | ---: | ---: |
| deploy-intake-ko | 2 | 0/0  0/0 | 100% |

## Judge (off)

No judge scores.
