# Evaluation summary

Model qwen3.8-max (fallback qwen3.7-max), catalog 2026-10-31 (223 entries), system prompt 48590 chars (sha256 cb4995e7ac6b), 3 runs per case, started 2026-10-31T09:33:42.639Z.

## Overall

**pass@1 94%, all 3 runs pass 94%** (18 cases). pass@3 is best-of-3 and is listed last.

| measure | value |
| --- | ---: |
| cases / conversations / turns | 18 / 54 / 90 |
| pass@1 (mean case pass rate) | 94% |
| all runs pass | 94% |
| majority (over half the runs pass) | 94% |
| pass@3 (some run passes) | 94% |
| conversations passing every assertion | 94% |
| turns passing every assertion | 97% |
| assertions passing (968 checks) | 100% |
| conversations that hit an API failure | 0 |
| list-price cost of the model runs | $0.65 |

## By category

| category | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| multiturn | 7 | 21 | 100% | 100% | 100% | 100% |
| pattern | 4 | 12 | 75% | 75% | 75% | 75% |
| i18n | 4 | 12 | 100% | 100% | 100% | 100% |
| need | 2 | 6 | 100% | 100% | 100% | 100% |
| trap | 1 | 3 | 100% | 100% | 100% | 100% |

## By language

| language | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 14 | 42 | 93% | 93% | 93% | 93% |
| ko | 2 | 6 | 100% | 100% | 100% | 100% |
| zh | 2 | 6 | 100% | 100% | 100% | 100% |

## By assertion type (worst first)

| type | checks | passed | rate | cases that failed it |
| --- | ---: | ---: | ---: | ---: |
| attachValid | 90 | 87 | 97% | 1 |
| include | 66 | 66 | 100% | 0 |
| region | 42 | 42 | 100% | 0 |
| attach | 6 | 6 | 100% | 0 |
| linked | 6 | 6 | 100% | 0 |
| noErrors | 90 | 90 | 100% | 0 |
| pathOrder | 84 | 84 | 100% | 0 |
| format | 90 | 90 | 100% | 0 |
| escapes | 90 | 90 | 100% | 0 |
| noPrices | 90 | 90 | 100% | 0 |
| sayLang | 90 | 90 | 100% | 0 |
| exclude | 21 | 21 | 100% | 0 |
| req | 21 | 21 | 100% | 0 |
| pins | 21 | 21 | 100% | 0 |
| retention | 60 | 60 | 100% | 0 |
| residency | 30 | 30 | 100% | 0 |
| placement | 3 | 3 | 100% | 0 |
| editMinimal | 12 | 12 | 100% | 0 |
| whyLang | 17 | 17 | 100% | 0 |
| primaryRec | 6 | 6 | 100% | 0 |
| size | 27 | 27 | 100% | 0 |
| question | 3 | 3 | 100% | 0 |
| mention | 3 | 3 | 100% | 0 |

## Cases below 100% (1 of 18)

| case | runs passed | what failed |
| --- | ---: | ---: |
| ho-p1-vpc-mongo | 0/3 | every attachment names a valid host (3) |

## Warnings before and after deterministic repair

| code | before: total | per turn | turns | after: total | per turn | fixed by repair |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| orphan-node | 15 | 0.167 | 13 | 15 | 0.167 | 0 |
| constraint-region | 7 | 0.078 | 6 | 5 | 0.056 | 0 |
| attach-host-missing | 6 | 0.067 | 6 | 0 | 0 | 3 |
| containment | 6 | 0.067 | 5 | 0 | 0 | 6 |
| missing-group | 1 | 0.011 | 1 | 0 | 0 | 1 |
| unknown-id | 1 | 0.011 | 1 | 0 | 0 | 0 |

Severity before repair {"info":14,"warn":12,"error":10}, after {"info":13,"warn":7}. Unknown products: 0 (none). Product strings that were not catalog ids: 0 (none).

## Latency (main stream)

| measure | n | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| first token (answering attempt) | 90 | 1.37 s | 1.89 s | 2.43 s |
| first token as waited for (failed attempts included) | 90 | 1.37 s | 1.89 s | 2.43 s |
| first say | 90 | 1.65 s | 2.25 s | 3.11 s |
| first op | 90 | 2.08 s | 2.70 s | 3.50 s |
| first node | 80 | 3.64 s | 4.66 s | 5.56 s |
| stream total (all turns) | 90 | 8.65 s | 19.4 s | 22.8 s |
| stream total, new diagrams | 84 | 10.1 s | 19.7 s | 22.8 s |
| stream total, edits | 42 | 4.37 s | 9.70 s | 16.0 s |
| stream total, product answers | 6 | 3.78 s | 5.68 s | 5.95 s |
| whole turn incl. retries and follow-up | 90 | 9.26 s | 19.4 s | 22.8 s |

## Tokens and cost

| measure | value |
| --- | ---: |
| prompt tokens | 1172993 |
| cached prompt tokens | 1124096 (96%) |
| completion tokens | 45126 |
| completion tokens per turn p50 / p95 | 418 / 1020 |
| cost per turn mean / p95 | $0.0072 / $0.0107 |
| cost per conversation mean / p95 | $0.0120 / $0.0223 |
| total | $0.65 |

## Reliability

| counter | value |
| --- | ---: |
| turns | 90 |
| main stream ended without done (truncated) | 0 |
| continuation turns | 0 |
| repair turns | 1 |
| hedged turns / hedge won | 0 / 0 |
| turns that used the fallback model | 0 |
| extra attempts after failures | 0 |
| conversations with an API failure | 0 |
| bad (unparseable) lines | 0 |
| \u escapes | 0 |

## Failover to the fallback model

0 of 90 turns (0%) failed over in the main stream; reasons {}. Follow-up turns that ran on another model: 0.

## Cut-off turns

Main streams that ended without done: 0 ({}). Rescued by the continuation turn: 0 (0 of them pass every assertion); not rescued: 0. Turn pass rate without the rescued turns: 97%.

## Constraint compliance (machine-checked)

| check | passed | rate |
| --- | ---: | ---: |
| residency (final graph and final narration, core checker) | 30/30 | 100% |
| pinned constraints as data (req regions / avoid) | 21/21 | 100% |
| avoided products absent (exclude and retained exclude) | 33/33 | 100% |

Residency checks with a warn-level foreign-region mention (not failed, reviewed by hand): 5. Residency checks where the product's repair turn corrected the main-stream narration: 1. Turns with pinned constraints in memory: 54. Product constraint findings before repair {"constraint-region":{"total":7,"turns":6,"error":1}}, left after repair {"constraint-region":{"total":5,"turns":5,"error":0}}.

## Repairs

| deterministic fix | fixes | turns |
| --- | ---: | ---: |
| containment | 6 | 5 |
| attach-invalid | 3 | 3 |
| attach-host-missing | 3 | 3 |
| missing-group | 1 | 1 |

LLM follow-up turns: 1 ({"repair":1}); turns by finding code {"constraint-region":1}.

| case | run | turn | kind | turn passes | findings |
| --- | ---: | ---: | ---: | ---: | ---: |
| ho-p1-residency-japan | 3 | 2 | repair | yes | constraint-region/error: the why of 'bi' says "BI dashboards over the analytics replica for the Singapore team" (replica to Singapore (ap-southeast-1)); the pinned regions are Tokyo (ap-northeast-1) ("All policyholder da; constraint-region/warn: a say line nam |

## Languages

| language | turns | completion tokens / turn | vs English twin | prompt tokens / turn | say in language | why in language | \u escapes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 72 | 498 | - | 13017 | 72/72 | 0/0 | 0 |
| ko | 9 | 395 | - | 13070 | 9/9 | 8/8 | 0 |
| zh | 9 | 637 | - | 13130 | 9/9 | 9/9 | 0 |

## Multi-turn retention

| case | turns | retention checks passed per turn | run pass |
| --- | ---: | ---: | ---: |
| ho-p1-residency-japan | 3 | 6/6  9/9  6/6 | 100% |
| ho-p1-avoid-es | 2 | 3/3  3/3 | 100% |
| ho-p1-avoid-fc-tempt | 2 | 3/3  3/3 | 100% |
| ho-p1-ko-residency | 2 | 6/6  9/9 | 100% |
| ho-p1-zh-residency | 2 | 6/6  9/9 | 100% |
| ho-residency-korea | 3 | 6/6  9/9  9/9 | 100% |
| ho-scale-sae | 2 | 0/0  6/6 | 100% |
| ho-scale-ecs-ok | 2 | 0/0  6/6 | 100% |
| ho-budget-ha | 3 | 3/3  3/3  6/6 | 100% |

## Judge (kimi-k3)

| measure | value |
| --- | ---: |
| runs judged / judge errors | 18 / 0 |
| completeness | 4.722 |
| accuracy | 4.5 |
| rationality | 4.389 |
| readability | 4.556 |
| overall | 4.542 |
| architect would sign off | 100% |
| judge cost | $0.315 |

| category | judged | overall score | sign-off |
| --- | ---: | ---: | ---: |
| multiturn | 7 | 4.464 | 100% |
| pattern | 4 | 4.375 | 100% |
| i18n | 4 | 4.688 | 100% |
| need | 2 | 4.625 | 100% |
| trap | 1 | 5 | 100% |

Every run of the constraint cases: 27 runs judged, sign-off 96%, mean 4.491. (Total judged runs: 36.)

| case | run | judge defects |
| --- | ---: | ---: |
| ho-budget-ha | 3 | DB Read Replica node has no zones specified (single-zone in VPC), so it does not itself survive a zone outage; a multi-zone RDS primary/standby would be the cleaner HA answer; Narration claims 'keeping within your $150 b |

Agreement between the judged run's assertions and the judge's sign-off: 17/18 (94%). Assertions pass and judge yes 17, both no 0, assertions pass but judge no 0, assertions fail but judge yes 1. Mean score of passing runs 4.559, failing runs 4.25, point-biserial r 0.18.

| case | assertions | judge | failed assertions | judge defects |
| --- | ---: | ---: | ---: | ---: |
| ho-p1-vpc-mongo | fail | yes | every attachment names a valid host | ec-onprem labeled 'DC side' but placed inside the VPC group; the on-prem half of the Express Connect pair should sit in the on-prem group or at the boundary; PrivateZone node is added but never connec |
