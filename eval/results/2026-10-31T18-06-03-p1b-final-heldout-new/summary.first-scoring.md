# Evaluation summary

Model qwen3.8-max (fallback qwen3.7-max), catalog 2026-10-31 (232 entries), system prompt 59711 chars (sha256 290480d0a20b), 3 runs per case, started 2026-10-31T18:06:03.880Z.

## Overall

**pass@1 79%, all 3 runs pass 71%** (24 cases). pass@3 is best-of-3 and is listed last.

| measure | value |
| --- | ---: |
| cases / conversations / turns | 24 / 72 / 78 |
| pass@1 (mean case pass rate) | 79% |
| all runs pass | 71% |
| majority (over half the runs pass) | 79% |
| pass@3 (some run passes) | 88% |
| conversations passing every assertion | 79% |
| turns passing every assertion | 81% |
| assertions passing (1032 checks) | 99% |
| conversations that hit an API failure | 0 |
| list-price cost of the model runs | $0.66 |

## By category

| category | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pattern | 3 | 9 | 78% | 67% | 67% | 100% |
| trap | 6 | 18 | 72% | 67% | 67% | 83% |
| i18n | 5 | 15 | 93% | 80% | 100% | 100% |
| need | 8 | 24 | 75% | 75% | 75% | 75% |
| multiturn | 2 | 6 | 83% | 50% | 100% | 100% |

## By language

| language | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 19 | 57 | 75% | 68% | 74% | 84% |
| zh | 4 | 12 | 92% | 75% | 100% | 100% |
| ko | 1 | 3 | 100% | 100% | 100% | 100% |

## By assertion type (worst first)

| type | checks | passed | rate | cases that failed it |
| --- | ---: | ---: | ---: | ---: |
| mention | 21 | 18 | 86% | 1 |
| reask | 30 | 27 | 90% | 2 |
| scope | 36 | 33 | 92% | 1 |
| exclude | 27 | 25 | 93% | 1 |
| include | 96 | 93 | 97% | 1 |
| format | 78 | 77 | 99% | 1 |
| region | 36 | 36 | 100% | 0 |
| gpu | 15 | 15 | 100% | 0 |
| linked | 6 | 6 | 100% | 0 |
| noErrors | 78 | 78 | 100% | 0 |
| pathOrder | 63 | 63 | 100% | 0 |
| attachValid | 78 | 78 | 100% | 0 |
| escapes | 78 | 78 | 100% | 0 |
| noPrices | 78 | 78 | 100% | 0 |
| sayLang | 78 | 78 | 100% | 0 |
| askLang | 15 | 15 | 100% | 0 |
| whyLang | 9 | 9 | 100% | 0 |
| req | 9 | 9 | 100% | 0 |
| residency | 3 | 3 | 100% | 0 |
| residencyScan | 3 | 3 | 100% | 0 |
| pins | 3 | 3 | 100% | 0 |
| placement | 3 | 3 | 100% | 0 |
| size | 60 | 60 | 100% | 0 |
| asks | 54 | 54 | 100% | 0 |
| askOptions | 54 | 54 | 100% | 0 |
| assumes | 12 | 12 | 100% | 0 |
| editMinimal | 3 | 3 | 100% | 0 |
| chips | 3 | 3 | 100% | 0 |
| zones | 3 | 3 | 100% | 0 |

## Cases below 100% (7 of 24)

| case | runs passed | what failed |
| --- | ---: | ---: |
| ai-ho-langstudio | 0/3 | mentions 2027/retir (3) |
| sc-ho-onprem-db | 0/3 | include dts (3) |
| sc-ho-multicloud-link | 0/3 | provider names only on other-cloud nodes and external groups (3) |
| ai-ho-eu-training | 1/3 | exclude lingjun (2) |
| as-ho-furniture | 1/3 | assumes never repeat southeast asia (2) |
| ai-ho-zh-rag-eas | 2/3 | NDJSON only, ends with done (1) |
| as-ho-answer-riders | 2/3 | assumes never repeat indonesia/2,000/mobile (1) |

## Warnings before and after deterministic repair

| code | before: total | per turn | turns | after: total | per turn | fixed by repair |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| containment | 12 | 0.154 | 9 | 0 | 0 | 12 |
| orphan-node | 4 | 0.051 | 2 | 4 | 0.051 | 0 |
| bad-json | 3 | 0.038 | 1 | 3 | 0.038 | 0 |
| attach-host-missing | 2 | 0.026 | 2 | 0 | 0 | 0 |
| bad-op | 1 | 0.013 | 1 | 0 | 0 | 0 |
| missing-group | 1 | 0.013 | 1 | 0 | 0 | 1 |
| dns-in-path | 1 | 0.013 | 1 | 0 | 0 | 1 |

Severity before repair {"warn":13,"error":8,"info":3}, after {"warn":5,"info":2}. Unknown products: 0 (none). Product strings that were not catalog ids: 0 (none).

## Latency (main stream)

| measure | n | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| first token (answering attempt) | 78 | 1.25 s | 1.89 s | 3.75 s |
| first token as waited for (failed attempts included) | 78 | 1.25 s | 1.89 s | 3.75 s |
| first say | 78 | 1.53 s | 2.17 s | 4.02 s |
| first op | 78 | 1.98 s | 2.77 s | 4.30 s |
| first node | 63 | 4.36 s | 6.27 s | 7.87 s |
| stream total (all turns) | 78 | 11.7 s | 18.9 s | 22.1 s |
| stream total, new diagrams | 63 | 14.0 s | 19.2 s | 22.1 s |
| stream total, edits | 6 | 17.7 s | 19.3 s | 19.5 s |
| stream total, product answers | 1 | 4.82 s | 4.82 s | 4.82 s |
| whole turn incl. retries and follow-up | 78 | 11.7 s | 18.9 s | 22.1 s |

## Tokens and cost

| measure | value |
| --- | ---: |
| prompt tokens | 1192618 |
| cached prompt tokens | 1154944 (97%) |
| completion tokens | 48525 |
| completion tokens per turn p50 / p95 | 646 / 1088 |
| cost per turn mean / p95 | $0.0084 / $0.0119 |
| cost per conversation mean / p95 | $0.0091 / $0.0181 |
| total | $0.66 |

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
| bad (unparseable) lines | 3 |
| \u escapes | 0 |

## Failover to the fallback model

0 of 78 turns (0%) failed over in the main stream; reasons {}. Follow-up turns that ran on another model: 0.

## Cut-off turns

Main streams that ended without done: 0 ({}). Rescued by the continuation turn: 0 (0 of them pass every assertion); not rescued: 0. Turn pass rate without the rescued turns: 81%.

## Constraint compliance (machine-checked)

| check | passed | rate |
| --- | ---: | ---: |
| residency (final graph and final narration, core checker) | 3/3 | 100% |
| residency, independent scan (own place table and cue words; shares no code with the checker) | 3/3 | 100% |
| pinned constraints as data (req regions / avoid) | 3/3 | 100% |
| avoided products absent (exclude and retained exclude) | 22/24 | 92% |

Residency checks with a warn-level foreign-region mention (not failed, reviewed by hand): 0. Residency checks where the product's repair turn corrected the main-stream narration: 0. Turns with pinned constraints in memory: 14. Product constraint findings before repair {}, left after repair {}.

## Repairs

| deterministic fix | fixes | turns |
| --- | ---: | ---: |
| containment | 12 | 9 |
| attach-invalid | 2 | 2 |
| missing-group | 1 | 1 |
| dns-in-path | 1 | 1 |

LLM follow-up turns: 0 ({}); turns by finding code {}.

## Languages

| language | turns | completion tokens / turn | vs English twin | prompt tokens / turn | say in language | why in language | \u escapes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 63 | 641 | - | 15299 | 63/63 | 0/0 | 0 |
| ko | 3 | 165 | - | 15246 | 3/3 | 0/0 | 0 |
| zh | 12 | 636 | - | 15255 | 12/12 | 9/9 | 0 |

## Multi-turn retention

| case | turns | retention checks passed per turn | run pass |
| --- | ---: | ---: | ---: |
| as-ho-answer-riders | 2 | 0/0  0/0 | 67% |
| as-ho-flip-regions | 2 | 0/0  3/3 | 100% |

## Judge (kimi-k3)

| measure | value |
| --- | ---: |
| runs judged / judge errors | 24 / 0 |
| completeness | 4.542 |
| accuracy | 4.542 |
| rationality | 4.417 |
| readability | 4.5 |
| overall | 4.5 |
| architect would sign off | 92% |
| judge cost | $0.233 |

| category | judged | overall score | sign-off |
| --- | ---: | ---: | ---: |
| pattern | 3 | 4.5 | 100% |
| trap | 6 | 4.417 | 83% |
| i18n | 5 | 4.8 | 100% |
| need | 8 | 4.406 | 88% |
| multiturn | 2 | 4.375 | 100% |

Every run of the constraint cases: 9 runs judged, sign-off 67%, mean 4. (Total judged runs: 30.)

| case | run | judge defects |
| --- | ---: | ---: |
| ai-ho-eu-training | 1 | Narration presents Lingjun as a viable path and asks about allowlist access instead of stating Lingjun is not offered in Frankfurt and excluding it; No explicit statement that everything stays in Frankfurt / no other reg |
| ai-ho-eu-training | 2 | gpu-cluster (lingjun) node placed in Frankfurt region: Lingjun is not available in Frankfurt; catalog says Singapore is its only international region; Narration says 'PAI-DLC on Lingjun' without stating Lingjun is unavai |
| ai-ho-eu-training | 3 | Lingjun node placed in Frankfurt region despite catalog stating Lingjun's only international region is Singapore; should be removed and replaced with general GPU pools/ECS/ACK for DLC.; Narration presents Lingjun as the  |

Agreement between the judged run's assertions and the judge's sign-off: 21/24 (88%). Assertions pass and judge yes 20, both no 1, assertions pass but judge no 1, assertions fail but judge yes 2. Mean score of passing runs 4.571, failing runs 4, point-biserial r 0.378.

| case | assertions | judge | failed assertions | judge defects |
| --- | ---: | ---: | ---: | ---: |
| ai-ho-eu-training | pass | no |  | Narration presents Lingjun as a viable path and asks about allowlist access instead of stating Lingjun is not offered in Frankfurt and excluding it; No explicit statement that everything stays in Fran |
| ai-ho-langstudio | fail | yes | mentions 2027/retir | Narration does not mention LangStudio's 2027-03-09 retirement or that the Model Studio successor is closed to new international accounts, which the guidance expects; AgentCore knowledge-base connector |
| sc-ho-onprem-db | fail | yes | include dts | No DTS node or mention of migration path for moving the database to RDS; Region choice (Singapore) is assumed without confirming data residency, though flagged implicitly via assumptions |
