# Evaluation summary

Model qwen3.8-max (fallback qwen3.7-max), catalog 2026-10-31 (223 entries), system prompt 47416 chars (sha256 ba0463a6d5d7), 1 runs per case, started 2026-10-31T04:44:15.987Z.

## Overall

| measure | value |
| --- | ---: |
| cases / conversations / turns | 62 / 62 / 69 |
| pass@1 (mean case pass rate) | 97% |
| pass@1 (some run passes) | 97% |
| majority (over half the runs pass) | 97% |
| all runs pass | 97% |
| conversations passing every assertion | 97% |
| turns passing every assertion | 96% |
| assertions passing (717 checks) | 100% |
| conversations that hit an API failure | 0 |
| list-price cost of the model runs | $0.48 |

## By category

| category | cases | runs | run pass | pass@1 | majority | all runs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pattern | 11 | 11 | 91% | 91% | 91% | 91% |
| need | 9 | 9 | 100% | 100% | 100% | 100% |
| trap | 15 | 15 | 100% | 100% | 100% | 100% |
| edit | 8 | 8 | 100% | 100% | 100% | 100% |
| multiturn | 2 | 2 | 50% | 50% | 50% | 50% |
| adversarial | 5 | 5 | 100% | 100% | 100% | 100% |
| i18n | 12 | 12 | 100% | 100% | 100% | 100% |

## By language

| language | cases | runs | run pass | pass@1 | majority | all runs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 50 | 50 | 96% | 96% | 96% | 96% |
| ko | 7 | 7 | 100% | 100% | 100% | 100% |
| zh | 5 | 5 | 100% | 100% | 100% | 100% |

## By assertion type (worst first)

| type | checks | passed | rate | cases that failed it |
| --- | ---: | ---: | ---: | ---: |
| req | 4 | 3 | 75% | 1 |
| retention | 14 | 13 | 93% | 1 |
| attachValid | 69 | 68 | 99% | 1 |
| include | 92 | 92 | 100% | 0 |
| exclude | 35 | 35 | 100% | 0 |
| noErrors | 69 | 69 | 100% | 0 |
| pathOrder | 53 | 53 | 100% | 0 |
| format | 69 | 69 | 100% | 0 |
| escapes | 69 | 69 | 100% | 0 |
| noPrices | 69 | 69 | 100% | 0 |
| sayLang | 69 | 69 | 100% | 0 |
| size | 28 | 28 | 100% | 0 |
| region | 7 | 7 | 100% | 0 |
| zones | 6 | 6 | 100% | 0 |
| primaryRec | 13 | 13 | 100% | 0 |
| noWarn | 17 | 17 | 100% | 0 |
| mention | 4 | 4 | 100% | 0 |
| editMinimal | 12 | 12 | 100% | 0 |
| attach | 2 | 2 | 100% | 0 |
| restore | 1 | 1 | 100% | 0 |
| notMention | 3 | 3 | 100% | 0 |
| whyLang | 12 | 12 | 100% | 0 |

## Cases below 100% (2 of 62)

| case | runs passed | what failed |
| --- | ---: | ---: |
| pat-04-rag | 0/1 | every attachment names a valid host (1) |
| mt-02-serverless-first | 0/1 | req serverless (1) |

## Warnings before and after deterministic repair

| code | before: total | per turn | turns | after: total | per turn | fixed by repair |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| orphan-node | 12 | 0.174 | 12 | 13 | 0.188 | 0 |
| containment | 4 | 0.058 | 4 | 0 | 0 | 4 |
| attach-host-missing | 1 | 0.014 | 1 | 0 | 0 | 1 |

Severity before repair {"info":11,"warn":3,"error":3}, after {"info":11,"warn":2}. Unknown products: 0 (none). Product strings that were not catalog ids: 0 (none).

## Latency (main stream)

| measure | n | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| first say | 69 | 1.51 s | 2.00 s | 2.53 s |
| first op | 69 | 1.98 s | 2.45 s | 3.15 s |
| first node | 50 | 3.63 s | 4.72 s | 5.31 s |
| stream total (all turns) | 69 | 8.14 s | 20.4 s | 33.5 s |
| stream total, new diagrams | 53 | 13.0 s | 20.6 s | 33.5 s |
| stream total, edits | 17 | 4.47 s | 8.91 s | 20.5 s |
| stream total, product answers | 14 | 4.08 s | 5.69 s | 7.90 s |
| whole turn incl. retries and follow-up | 69 | 8.14 s | 20.4 s | 33.5 s |

## Tokens and cost

| measure | value |
| --- | ---: |
| prompt tokens | 858909 |
| cached prompt tokens | 828288 (96%) |
| completion tokens | 35450 |
| completion tokens per turn p50 / p95 | 445 / 1075 |
| cost per turn mean / p95 | $0.0070 / $0.0102 |
| cost per conversation mean / p95 | $0.0078 / $0.0139 |
| total | $0.48 |

## Reliability

| counter | value |
| --- | ---: |
| turns | 69 |
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
| en | 57 | 512 | - | 12482 | 57/57 | 0/0 | 0 |
| ko | 7 | 523 | 1.033 | 12337 | 7/7 | 7/7 | 0 |
| zh | 5 | 526 | 1.005 | 12211 | 5/5 | 5/5 | 0 |

## Multi-turn retention

| case | turns | retention checks passed per turn | run pass |
| --- | ---: | ---: | ---: |
| edit-06-restore | 2 | 0/0  0/0 | 100% |
| mt-02-serverless-first | 3 | 0/1  1/1  1/2 | 0% |
| mt-05-mixed-five-turns | 5 | 2/2  3/3  3/3  3/3  3/3 | 100% |

## Judge (kimi-k3)

| measure | value |
| --- | ---: |
| runs judged / judge errors | 62 / 0 |
| completeness | 4.516 |
| accuracy | 4.484 |
| rationality | 4.339 |
| readability | 4.452 |
| overall | 4.448 |
| architect would sign off | 97% |
| judge cost | $0.445 |

| category | judged | overall score | sign-off |
| --- | ---: | ---: | ---: |
| pattern | 11 | 4.114 | 82% |
| need | 9 | 4.111 | 100% |
| trap | 15 | 4.617 | 100% |
| edit | 8 | 4.719 | 100% |
| multiturn | 2 | 4.375 | 100% |
| adversarial | 5 | 4.8 | 100% |
| i18n | 12 | 4.479 | 100% |

Agreement between the judged run's assertions and the judge's sign-off: 58/62 (94%). Assertions pass and judge yes 58, both no 0, assertions pass but judge no 2, assertions fail but judge yes 2. Mean score of passing runs 4.454, failing runs 4.25, point-biserial r 0.08.

| case | assertions | judge | failed assertions | judge defects |
| --- | ---: | ---: | ---: | ---: |
| pat-04-rag | fail | yes | every attachment names a valid host | DNS node adds a hop that is not on the data path; could be omitted or noted as resolve-only; No mention of AI Gateway or AI Guardrails as optional enhancements for an internal assistant handling polic |
| pat-06-iot-streaming | pass | no |  | IoT Platform -> ApsaraMQ for MQTT -> Kafka chains two overlapping MQTT/ingest layers; normally devices connect to one broker or IoT Platform routes directly to Kafka; No real alert delivery: user aske |
| pat-07-hybrid | pass | no |  | Express Connect node placed inside the VPC; it is a vpc-edge/boundary service and should sit at the VPC boundary, not inside it; Edge express -> cen 'VBR attach' is backwards/odd: the VBR attaches to  |
| mt-02-serverless-first | fail | yes | req serverless | report-fn lacks a logs edge to SLS, inconsistent with resizer's logging.; User account flows (signup/auth) have no explicit path; esa -> metadata-db read alone doesn't cover account management.; Narra |
