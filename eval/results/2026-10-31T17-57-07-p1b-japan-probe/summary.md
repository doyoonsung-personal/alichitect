# Evaluation summary

Model qwen3.8-max (fallback qwen3.7-max), catalog 2026-10-31 (232 entries), system prompt 59701 chars (sha256 fabd6cb8f349), 6 runs per case, started 2026-10-31T17:57:07.749Z.

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
| turns passing every assertion | 22% |
| assertions passing (210 checks) | 91% |
| conversations that hit an API failure | 0 |
| list-price cost of the model runs | $0.18 |

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
| sayLang | 18 | 6 | 33% | 1 |
| req | 6 | 4 | 67% | 1 |
| residencyScan | 18 | 15 | 83% | 1 |
| retention | 18 | 16 | 89% | 1 |
| region | 12 | 12 | 100% | 0 |
| residency | 18 | 18 | 100% | 0 |
| pins | 6 | 6 | 100% | 0 |
| noErrors | 18 | 18 | 100% | 0 |
| pathOrder | 18 | 18 | 100% | 0 |
| attachValid | 18 | 18 | 100% | 0 |
| format | 18 | 18 | 100% | 0 |
| escapes | 18 | 18 | 100% | 0 |
| noPrices | 18 | 18 | 100% | 0 |
| include | 6 | 6 | 100% | 0 |

## Cases below 100% (1 of 1)

| case | runs passed | what failed |
| --- | ---: | ---: |
| ho-p1-residency-japan | 1/6 | residency scan ap-northeast-1 (2); req japan/tokyo/ap-northeast-1 (2); say text in en (4) |

## Warnings before and after deterministic repair

| code | before: total | per turn | turns | after: total | per turn | fixed by repair |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| constraint-region | 5 | 0.278 | 4 | 1 | 0.056 | 0 |
| containment | 1 | 0.056 | 1 | 0 | 0 | 1 |
| orphan-node | 1 | 0.056 | 1 | 0 | 0 | 0 |

Severity before repair {"warn":4,"error":3}, after {"warn":1}. Unknown products: 0 (none). Product strings that were not catalog ids: 0 (none).

## Latency (main stream)

| measure | n | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| first token (answering attempt) | 18 | 1.36 s | 1.83 s | 1.85 s |
| first token as waited for (failed attempts included) | 18 | 1.36 s | 1.83 s | 1.85 s |
| first say | 18 | 1.61 s | 2.15 s | 2.15 s |
| first op | 18 | 1.96 s | 2.49 s | 2.51 s |
| first node | 17 | 3.50 s | 5.67 s | 6.00 s |
| stream total (all turns) | 18 | 6.71 s | 20.6 s | 21.8 s |
| stream total, new diagrams | 18 | 6.71 s | 20.6 s | 21.8 s |
| stream total, edits | 12 | 5.55 s | 9.23 s | 11.1 s |
| stream total, product answers | 0 | - | - | - |
| whole turn incl. retries and follow-up | 18 | 8.22 s | 20.6 s | 21.8 s |

## Tokens and cost

| measure | value |
| --- | ---: |
| prompt tokens | 342438 |
| cached prompt tokens | 323840 (95%) |
| completion tokens | 10445 |
| completion tokens per turn p50 / p95 | 398 / 1195 |
| cost per turn mean / p95 | $0.0100 / $0.0158 |
| cost per conversation mean / p95 | $0.0301 / $0.0370 |
| total | $0.18 |

## Reliability

| counter | value |
| --- | ---: |
| turns | 18 |
| main stream ended without done (truncated) | 0 |
| continuation turns | 0 |
| repair turns | 3 |
| hedged turns / hedge won | 0 / 0 |
| turns that used the fallback model | 0 |
| extra attempts after failures | 0 |
| conversations with an API failure | 0 |
| bad (unparseable) lines | 0 |
| \u escapes | 0 |

## Failover to the fallback model

0 of 18 turns (0%) failed over in the main stream; reasons {}. Follow-up turns that ran on another model: 0.

## Cut-off turns

Main streams that ended without done: 0 ({}). Rescued by the continuation turn: 0 (0 of them pass every assertion); not rescued: 0. Turn pass rate without the rescued turns: 22%.

## Constraint compliance (machine-checked)

| check | passed | rate |
| --- | ---: | ---: |
| residency (final graph and final narration, core checker) | 18/18 | 100% |
| residency, independent scan (own place table and cue words; shares no code with the checker) | 15/18 | 83% |
| pinned constraints as data (req regions / avoid) | 6/6 | 100% |
| avoided products absent (exclude and retained exclude) | 0/0 | - |

Residency checks with a warn-level foreign-region mention (not failed, reviewed by hand): 2. Residency checks where the product's repair turn corrected the main-stream narration: 3. Turns with pinned constraints in memory: 18. Product constraint findings before repair {"constraint-region":{"total":5,"turns":4,"error":3}}, left after repair {"constraint-region":{"total":1,"turns":1,"error":0}}.

Independent residency scan hits (read each one: it errs towards flagging):

| case | run | turn | scan finding |
| --- | ---: | ---: | ---: |
| ho-p1-residency-japan | 1 | 2 | say analytics: Singapore in "Runs dashboards from Singapore over private link" |
| ho-p1-residency-japan | 1 | 3 | say analytics: Singapore in "Runs dashboards from Singapore over private link" |
| ho-p1-residency-japan | 6 | 2 | say : cross-region in "Pinned residency rule blocks cross-region replication" |

## Repairs

| deterministic fix | fixes | turns |
| --- | ---: | ---: |
| containment | 1 | 1 |

LLM follow-up turns: 3 ({"repair":3}); turns by finding code {"constraint-region":3,"orphan-node":1}.

| case | run | turn | kind | turn passes | findings |
| --- | ---: | ---: | ---: | ---: | ---: |
| ho-p1-residency-japan | 1 | 2 | repair | no | constraint-region/warn: a say line names Singapore (ap-southeast-1): "I cannot replicate policyholder data to Singapore"; the pinned regions are Tokyo (ap-northeast-1) ("All policyholder data must remain physically withi; constraint-region/error: a say line pa |
| ho-p1-residency-japan | 4 | 2 | repair | no | orphan-node/warn: 'nat' (nat) has no connections; constraint-region/error: 'analytics' is labelled "SG analytics team", which places it in Singapore (ap-southeast-1); the pinned regions are Tokyo (ap-northeast-1) ("All policyholder data must remain physically  |
| ho-p1-residency-japan | 2 | 2 | repair | no | constraint-region/error: region group 'singapore' (Singapore (ap-southeast-1)) is in Singapore (ap-southeast-1) and holds analytics, tr-sg; the pinned regions are Tokyo (ap-northeast-1) ("すべての契約者データは日本国内（東京）に物理的に留まる必要がある |

## Languages

| language | turns | completion tokens / turn | vs English twin | prompt tokens / turn | say in language | why in language | \u escapes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 18 | 580 | - | 19024 | 6/18 | 0/0 | 0 |

## Multi-turn retention

| case | turns | retention checks passed per turn | run pass |
| --- | ---: | ---: | ---: |
| ho-p1-residency-japan | 3 | 10/12  16/18  12/12 | 17% |

## Judge (off)

No judge scores.
