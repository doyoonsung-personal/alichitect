# Evaluation summary

Model qwen3.8-max (fallback qwen3.7-max), catalog 2026-10-31 (223 entries), system prompt 49292 chars (sha256 53029f36008b), 6 runs per case, started 2026-10-31T14:50:44.810Z.

## Overall

**pass@1 17%, all 6 runs pass 0%** (1 cases). pass@6 is best-of-6 and is listed last.

| measure | value |
| --- | ---: |
| cases / conversations / turns | 1 / 6 / 18 |
| pass@1 (mean case pass rate) | 17% |
| all runs pass | 0% |
| majority (over half the runs pass) | 0% |
| pass@6 (some run passes) | 100% |
| conversations passing every assertion | 17% |
| turns passing every assertion | 44% |
| assertions passing (180 checks) | 94% |
| conversations that hit an API failure | 0 |
| list-price cost of the model runs | $0.11 |

## By category

| category | cases | runs | run pass | all runs | majority | pass@6 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| multiturn | 1 | 6 | 17% | 0% | 0% | 100% |

## By language

| language | cases | runs | run pass | all runs | majority | pass@6 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 1 | 6 | 17% | 0% | 0% | 100% |

## By assertion type (worst first)

| type | checks | passed | rate | cases that failed it |
| --- | ---: | ---: | ---: | ---: |
| req | 6 | 1 | 17% | 1 |
| retention | 18 | 13 | 72% | 1 |
| include | 18 | 18 | 100% | 0 |
| exclude | 6 | 6 | 100% | 0 |
| noErrors | 18 | 18 | 100% | 0 |
| pathOrder | 18 | 18 | 100% | 0 |
| attachValid | 18 | 18 | 100% | 0 |
| format | 18 | 18 | 100% | 0 |
| escapes | 18 | 18 | 100% | 0 |
| noPrices | 18 | 18 | 100% | 0 |
| sayLang | 18 | 18 | 100% | 0 |
| editMinimal | 6 | 6 | 100% | 0 |

## Cases below 100% (1 of 1)

| case | runs passed | what failed |
| --- | ---: | ---: |
| mt-02-serverless-first | 1/6 | req serverless (5) |

## Warnings before and after deterministic repair

| code | before: total | per turn | turns | after: total | per turn | fixed by repair |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| missing-group | 1 | 0.056 | 1 | 0 | 0 | 1 |

Severity before repair {"warn":1}, after {}. Unknown products: 0 (none). Product strings that were not catalog ids: 0 (none).

## Latency (main stream)

| measure | n | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| first token (answering attempt) | 18 | 1.30 s | 2.06 s | 2.08 s |
| first token as waited for (failed attempts included) | 18 | 1.30 s | 2.06 s | 2.08 s |
| first say | 18 | 1.64 s | 2.37 s | 2.46 s |
| first op | 18 | 2.06 s | 2.74 s | 3.03 s |
| first node | 18 | 3.07 s | 4.22 s | 4.61 s |
| stream total (all turns) | 18 | 5.66 s | 13.6 s | 13.9 s |
| stream total, new diagrams | 18 | 5.66 s | 13.6 s | 13.9 s |
| stream total, edits | 12 | 4.68 s | 6.37 s | 6.92 s |
| stream total, product answers | 0 | - | - | - |
| whole turn incl. retries and follow-up | 18 | 5.67 s | 13.6 s | 14.0 s |

## Tokens and cost

| measure | value |
| --- | ---: |
| prompt tokens | 234376 |
| cached prompt tokens | 221184 (94%) |
| completion tokens | 5458 |
| completion tokens per turn p50 / p95 | 218 / 584 |
| cost per turn mean / p95 | $0.0064 / $0.0073 |
| cost per conversation mean / p95 | $0.0191 / $0.0193 |
| total | $0.11 |

## Reliability

| counter | value |
| --- | ---: |
| turns | 18 |
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

0 of 18 turns (0%) failed over in the main stream; reasons {}. Follow-up turns that ran on another model: 0.

## Cut-off turns

Main streams that ended without done: 0 ({}). Rescued by the continuation turn: 0 (0 of them pass every assertion); not rescued: 0. Turn pass rate without the rescued turns: 44%.

## Constraint compliance (machine-checked)

| check | passed | rate |
| --- | ---: | ---: |
| residency (final graph and final narration, core checker) | 0/0 | - |
| pinned constraints as data (req regions / avoid) | 0/0 | - |
| avoided products absent (exclude and retained exclude) | 18/18 | 100% |

Residency checks with a warn-level foreign-region mention (not failed, reviewed by hand): 0. Residency checks where the product's repair turn corrected the main-stream narration: 0. Turns with pinned constraints in memory: 0. Product constraint findings before repair {}, left after repair {}.

## Repairs

| deterministic fix | fixes | turns |
| --- | ---: | ---: |
| missing-group | 1 | 1 |

LLM follow-up turns: 0 ({}); turns by finding code {}.

## Languages

| language | turns | completion tokens / turn | vs English twin | prompt tokens / turn | say in language | why in language | \u escapes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 18 | 303 | - | 13021 | 18/18 | 0/0 | 0 |

## Multi-turn retention

| case | turns | retention checks passed per turn | run pass |
| --- | ---: | ---: | ---: |
| mt-02-serverless-first | 3 | 1/6  6/6  7/12 | 17% |

## Judge (off)

No judge scores.
