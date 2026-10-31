# Evaluation summary

Model qwen3.8-max (fallback qwen3.7-max), catalog 2026-10-31 (232 entries), system prompt 59133 chars (sha256 be0d8972c479), 1 runs per case, started 2026-10-31T16:52:34.642Z.

## Overall

**pass@1 86%, all 1 runs pass 86%** (21 cases). pass@1 is best-of-1 and is listed last.

| measure | value |
| --- | ---: |
| cases / conversations / turns | 21 / 21 / 24 |
| pass@1 (mean case pass rate) | 86% |
| all runs pass | 86% |
| majority (over half the runs pass) | 86% |
| pass@1 (some run passes) | 86% |
| conversations passing every assertion | 86% |
| turns passing every assertion | 88% |
| assertions passing (334 checks) | 99% |
| conversations that hit an API failure | 0 |
| list-price cost of the model runs | $0.23 |

## By category

| category | cases | runs | run pass | all runs | majority | pass@1 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pattern | 6 | 6 | 100% | 100% | 100% | 100% |
| multiturn | 3 | 3 | 67% | 67% | 67% | 67% |
| i18n | 3 | 3 | 100% | 100% | 100% | 100% |
| need | 7 | 7 | 86% | 86% | 86% | 86% |
| trap | 2 | 2 | 50% | 50% | 50% | 50% |

## By language

| language | cases | runs | run pass | all runs | majority | pass@1 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 18 | 18 | 83% | 83% | 83% | 83% |
| ko | 3 | 3 | 100% | 100% | 100% | 100% |

## By assertion type (worst first)

| type | checks | passed | rate | cases that failed it |
| --- | ---: | ---: | ---: | ---: |
| scope | 10 | 9 | 90% | 1 |
| exclude | 11 | 10 | 91% | 1 |
| asks | 14 | 13 | 93% | 1 |
| include | 41 | 41 | 100% | 0 |
| size | 17 | 17 | 100% | 0 |
| region | 16 | 16 | 100% | 0 |
| gpu | 4 | 4 | 100% | 0 |
| noErrors | 24 | 24 | 100% | 0 |
| pathOrder | 22 | 22 | 100% | 0 |
| attachValid | 24 | 24 | 100% | 0 |
| format | 24 | 24 | 100% | 0 |
| escapes | 24 | 24 | 100% | 0 |
| noPrices | 24 | 24 | 100% | 0 |
| sayLang | 24 | 24 | 100% | 0 |
| linked | 5 | 5 | 100% | 0 |
| attach | 1 | 1 | 100% | 0 |
| placement | 2 | 2 | 100% | 0 |
| req | 2 | 2 | 100% | 0 |
| residency | 2 | 2 | 100% | 0 |
| residencyScan | 2 | 2 | 100% | 0 |
| pins | 1 | 1 | 100% | 0 |
| editMinimal | 2 | 2 | 100% | 0 |
| retention | 2 | 2 | 100% | 0 |
| askLang | 3 | 3 | 100% | 0 |
| whyLang | 3 | 3 | 100% | 0 |
| askOptions | 13 | 13 | 100% | 0 |
| mention | 3 | 3 | 100% | 0 |
| assumes | 3 | 3 | 100% | 0 |
| reask | 7 | 7 | 100% | 0 |
| zones | 3 | 3 | 100% | 0 |
| chips | 1 | 1 | 100% | 0 |

## Cases below 100% (3 of 21)

| case | runs passed | what failed |
| --- | ---: | ---: |
| ai-07-training-residency | 0/1 | exclude agentloop (1) |
| as-03-fully-stated | 0/1 | asks 0-0 (1) |
| sc-04-ec2-s3-trap | 0/1 | provider names only on other-cloud nodes and external groups (1) |

## Warnings before and after deterministic repair

| code | before: total | per turn | turns | after: total | per turn | fixed by repair |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| containment | 3 | 0.125 | 3 | 0 | 0 | 3 |
| unknown-id | 3 | 0.125 | 1 | 0 | 0 | 0 |
| missing-group | 2 | 0.083 | 2 | 0 | 0 | 2 |
| bad-op | 1 | 0.042 | 1 | 0 | 0 | 0 |

Severity before repair {"info":4,"error":3,"warn":2}, after {}. Unknown products: 0 (none). Product strings that were not catalog ids: 0 (none).

## Latency (main stream)

| measure | n | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| first token (answering attempt) | 24 | 1.30 s | 1.63 s | 1.76 s |
| first token as waited for (failed attempts included) | 24 | 1.30 s | 1.63 s | 1.76 s |
| first say | 24 | 1.68 s | 2.01 s | 2.38 s |
| first op | 24 | 2.14 s | 2.51 s | 2.81 s |
| first node | 22 | 4.45 s | 5.33 s | 5.63 s |
| stream total (all turns) | 24 | 14.7 s | 20.3 s | 21.0 s |
| stream total, new diagrams | 22 | 15.1 s | 20.3 s | 21.0 s |
| stream total, edits | 3 | 5.84 s | 18.3 s | 19.6 s |
| stream total, product answers | 0 | - | - | - |
| whole turn incl. retries and follow-up | 24 | 14.7 s | 20.3 s | 21.0 s |

## Tokens and cost

| measure | value |
| --- | ---: |
| prompt tokens | 364827 |
| cached prompt tokens | 344064 (94%) |
| completion tokens | 16179 |
| completion tokens per turn p50 / p95 | 749 / 1044 |
| cost per turn mean / p95 | $0.0094 / $0.0115 |
| cost per conversation mean / p95 | $0.0107 / $0.0181 |
| total | $0.23 |

## Reliability

| counter | value |
| --- | ---: |
| turns | 24 |
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

0 of 24 turns (0%) failed over in the main stream; reasons {}. Follow-up turns that ran on another model: 0.

## Cut-off turns

Main streams that ended without done: 0 ({}). Rescued by the continuation turn: 0 (0 of them pass every assertion); not rescued: 0. Turn pass rate without the rescued turns: 88%.

## Constraint compliance (machine-checked)

| check | passed | rate |
| --- | ---: | ---: |
| residency (final graph and final narration, core checker) | 2/2 | 100% |
| residency, independent scan (own place table and cue words; shares no code with the checker) | 2/2 | 100% |
| pinned constraints as data (req regions / avoid) | 1/1 | 100% |
| avoided products absent (exclude and retained exclude) | 10/11 | 91% |

Residency checks with a warn-level foreign-region mention (not failed, reviewed by hand): 0. Residency checks where the product's repair turn corrected the main-stream narration: 0. Turns with pinned constraints in memory: 4. Product constraint findings before repair {}, left after repair {}.

## Repairs

| deterministic fix | fixes | turns |
| --- | ---: | ---: |
| containment | 3 | 3 |
| missing-group | 2 | 2 |

LLM follow-up turns: 0 ({}); turns by finding code {}.

## Languages

| language | turns | completion tokens / turn | vs English twin | prompt tokens / turn | say in language | why in language | \u escapes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 21 | 652 | - | 15211 | 21/21 | 0/0 | 0 |
| ko | 3 | 832 | 1.01 | 15133 | 3/3 | 3/3 | 0 |

## Multi-turn retention

| case | turns | retention checks passed per turn | run pass |
| --- | ---: | ---: | ---: |
| ai-07-training-residency | 2 | 2/2  3/3 | 0% |
| as-04-answer-vague | 2 | 0/0  0/0 | 100% |
| as-05-flip-internal | 2 | 0/0  1/1 | 100% |

## Judge (off)

No judge scores.
