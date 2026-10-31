# Evaluation summary

Model qwen3.8-max (fallback qwen3.7-max), catalog 2026-10-31 (232 entries), system prompt 59701 chars (sha256 fabd6cb8f349), 3 runs per case, started 2026-10-31T17:46:19.244Z.

## Overall

**pass@1 81%, all 3 runs pass 79%** (24 cases). pass@3 is best-of-3 and is listed last.

| measure | value |
| --- | ---: |
| cases / conversations / turns | 24 / 72 / 78 |
| pass@1 (mean case pass rate) | 81% |
| all runs pass | 79% |
| majority (over half the runs pass) | 79% |
| pass@3 (some run passes) | 83% |
| conversations passing every assertion | 81% |
| turns passing every assertion | 82% |
| assertions passing (1032 checks) | 99% |
| conversations that hit an API failure | 0 |
| list-price cost of the model runs | $0.65 |

## By category

| category | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pattern | 3 | 9 | 78% | 67% | 67% | 100% |
| trap | 6 | 18 | 67% | 67% | 67% | 67% |
| i18n | 5 | 15 | 100% | 100% | 100% | 100% |
| need | 8 | 24 | 75% | 75% | 75% | 75% |
| multiturn | 2 | 6 | 100% | 100% | 100% | 100% |

## By language

| language | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 19 | 57 | 75% | 74% | 74% | 79% |
| zh | 4 | 12 | 100% | 100% | 100% | 100% |
| ko | 1 | 3 | 100% | 100% | 100% | 100% |

## By assertion type (worst first)

| type | checks | passed | rate | cases that failed it |
| --- | ---: | ---: | ---: | ---: |
| mention | 21 | 18 | 86% | 1 |
| exclude | 27 | 24 | 89% | 1 |
| scope | 36 | 33 | 92% | 1 |
| reask | 30 | 28 | 93% | 1 |
| include | 96 | 93 | 97% | 1 |
| region | 36 | 36 | 100% | 0 |
| gpu | 15 | 15 | 100% | 0 |
| linked | 6 | 6 | 100% | 0 |
| noErrors | 78 | 78 | 100% | 0 |
| pathOrder | 63 | 63 | 100% | 0 |
| attachValid | 78 | 78 | 100% | 0 |
| format | 78 | 78 | 100% | 0 |
| escapes | 78 | 78 | 100% | 0 |
| noPrices | 78 | 78 | 100% | 0 |
| sayLang | 78 | 78 | 100% | 0 |
| askLang | 15 | 15 | 100% | 0 |
| whyLang | 9 | 9 | 100% | 0 |
| req | 9 | 9 | 100% | 0 |
| residency | 3 | 3 | 100% | 0 |
| residencyScan | 3 | 3 | 100% | 0 |
| placement | 3 | 3 | 100% | 0 |
| pins | 3 | 3 | 100% | 0 |
| size | 60 | 60 | 100% | 0 |
| asks | 54 | 54 | 100% | 0 |
| askOptions | 54 | 54 | 100% | 0 |
| assumes | 12 | 12 | 100% | 0 |
| editMinimal | 3 | 3 | 100% | 0 |
| chips | 3 | 3 | 100% | 0 |
| zones | 3 | 3 | 100% | 0 |

## Cases below 100% (5 of 24)

| case | runs passed | what failed |
| --- | ---: | ---: |
| ai-ho-eu-training | 0/3 | exclude lingjun (3) |
| ai-ho-langstudio | 0/3 | mentions 2027/retir (3) |
| sc-ho-onprem-db | 0/3 | include dts (3) |
| sc-ho-multicloud-link | 0/3 | provider names only on other-cloud nodes and external groups (3) |
| as-ho-furniture | 1/3 | assumes never repeat southeast asia (2) |

## Warnings before and after deterministic repair

| code | before: total | per turn | turns | after: total | per turn | fixed by repair |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| containment | 15 | 0.192 | 11 | 0 | 0 | 16 |
| bad-op | 4 | 0.051 | 4 | 0 | 0 | 0 |
| missing-group | 3 | 0.038 | 3 | 0 | 0 | 3 |
| orphan-node | 3 | 0.038 | 3 | 3 | 0.038 | 0 |
| attach-host-missing | 1 | 0.013 | 1 | 0 | 0 | 0 |

Severity before repair {"error":13,"warn":9,"info":4}, after {"warn":3}. Unknown products: 0 (none). Product strings that were not catalog ids: 0 (none).

## Latency (main stream)

| measure | n | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| first token (answering attempt) | 78 | 1.31 s | 2.11 s | 2.48 s |
| first token as waited for (failed attempts included) | 78 | 1.31 s | 2.11 s | 2.48 s |
| first say | 78 | 1.60 s | 2.40 s | 2.77 s |
| first op | 78 | 1.98 s | 2.92 s | 3.13 s |
| first node | 63 | 4.45 s | 5.67 s | 6.10 s |
| stream total (all turns) | 78 | 12.0 s | 19.8 s | 24.0 s |
| stream total, new diagrams | 63 | 14.9 s | 19.9 s | 24.0 s |
| stream total, edits | 6 | 17.8 s | 20.2 s | 20.4 s |
| stream total, product answers | 1 | 3.24 s | 3.24 s | 3.24 s |
| whole turn incl. retries and follow-up | 78 | 12.0 s | 19.8 s | 24.0 s |

## Tokens and cost

| measure | value |
| --- | ---: |
| prompt tokens | 1192297 |
| cached prompt tokens | 1154944 (97%) |
| completion tokens | 48060 |
| completion tokens per turn p50 / p95 | 609 / 1045 |
| cost per turn mean / p95 | $0.0084 / $0.0119 |
| cost per conversation mean / p95 | $0.0091 / $0.0172 |
| total | $0.65 |

## Reliability

| counter | value |
| --- | ---: |
| turns | 78 |
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

0 of 78 turns (0%) failed over in the main stream; reasons {}. Follow-up turns that ran on another model: 0.

## Cut-off turns

Main streams that ended without done: 0 ({}). Rescued by the continuation turn: 0 (0 of them pass every assertion); not rescued: 0. Turn pass rate without the rescued turns: 82%.

## Constraint compliance (machine-checked)

| check | passed | rate |
| --- | ---: | ---: |
| residency (final graph and final narration, core checker) | 3/3 | 100% |
| residency, independent scan (own place table and cue words; shares no code with the checker) | 3/3 | 100% |
| pinned constraints as data (req regions / avoid) | 3/3 | 100% |
| avoided products absent (exclude and retained exclude) | 21/24 | 88% |

Residency checks with a warn-level foreign-region mention (not failed, reviewed by hand): 0. Residency checks where the product's repair turn corrected the main-stream narration: 0. Turns with pinned constraints in memory: 13. Product constraint findings before repair {}, left after repair {}.

## Repairs

| deterministic fix | fixes | turns |
| --- | ---: | ---: |
| containment | 16 | 12 |
| missing-group | 3 | 3 |
| attach-invalid | 1 | 1 |

LLM follow-up turns: 0 ({}); turns by finding code {}.

## Languages

| language | turns | completion tokens / turn | vs English twin | prompt tokens / turn | say in language | why in language | \u escapes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 63 | 641 | - | 15295 | 63/63 | 0/0 | 0 |
| ko | 3 | 105 | - | 15242 | 3/3 | 0/0 | 0 |
| zh | 12 | 616 | - | 15251 | 12/12 | 9/9 | 0 |

## Multi-turn retention

| case | turns | retention checks passed per turn | run pass |
| --- | ---: | ---: | ---: |
| as-ho-answer-riders | 2 | 0/0  0/0 | 100% |
| as-ho-flip-regions | 2 | 0/0  3/3 | 100% |

## Judge (kimi-k3)

| measure | value |
| --- | ---: |
| runs judged / judge errors | 24 / 0 |
| completeness | 4.417 |
| accuracy | 4.375 |
| rationality | 4.25 |
| readability | 4.5 |
| overall | 4.385 |
| architect would sign off | 88% |
| judge cost | $0.243 |

| category | judged | overall score | sign-off |
| --- | ---: | ---: | ---: |
| pattern | 3 | 4.583 | 100% |
| trap | 6 | 3.958 | 67% |
| i18n | 5 | 4.7 | 100% |
| need | 8 | 4.406 | 88% |
| multiturn | 2 | 4.5 | 100% |

Every run of the constraint cases: 9 runs judged, sign-off 44%, mean 3.778. (Total judged runs: 30.)

| case | run | judge defects |
| --- | ---: | ---: |
| ai-ho-eu-training | 1 | Lingjun node placed in Frankfurt region although Lingjun is not available in Frankfurt (only Singapore internationally).; Narration fails to state that Lingjun is not offered in Frankfurt and proposes it as the training  |
| ai-ho-eu-training | 2 | Lingjun node placed in Frankfurt region though Lingjun is not available there; must be removed or replaced with DLC on general GPU pools / GPU ECS / ACK; Narration presents Lingjun as the training path without stating it |
| ai-ho-eu-training | 3 | gpu-cluster (lingjun) node placed in Frankfurt: Lingjun is allowlist-only and not available in Frankfurt; Singapore is its only international region; Narration says 'with Lingjun' without flagging that Lingjun is not off |
| as-ho-flip-regions | 2 | No path from users/ESA/GTM to alb-tokyo: Tokyo region is unreachable from the internet, so GTM failover has no effect.; GTM and Cloud DNS roles are muddled (users -> GTM -> dns resolve chain) instead of GTM steering on t |
| as-ho-flip-regions | 3 | users -> gtm (resolve) and gtm -> dns (resolve) is redundant and wrong: GTM itself is the DNS steering layer; keeping Cloud DNS as a separate resolve hop after GTM serves no purpose (DNS is never a data-path hop and chai |

Agreement between the judged run's assertions and the judge's sign-off: 22/24 (92%). Assertions pass and judge yes 19, both no 3, assertions pass but judge no 0, assertions fail but judge yes 2. Mean score of passing runs 4.5, failing runs 3.95, point-biserial r 0.39.

| case | assertions | judge | failed assertions | judge defects |
| --- | ---: | ---: | ---: | ---: |
| as-ho-furniture | fail | yes | assumes never repeat southeast asia |  |
| sc-ho-onprem-db | fail | yes | include dts | DTS for migration appears only as a question option, not as a node or note in the diagram; Latency question could note that Express Connect vs VPN choice depends on the answer |
