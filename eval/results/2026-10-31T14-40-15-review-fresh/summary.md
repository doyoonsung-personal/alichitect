# Evaluation summary

Model qwen3.8-max (fallback qwen3.7-max), catalog 2026-10-31 (223 entries), system prompt 49292 chars (sha256 53029f36008b), 3 runs per case, started 2026-10-31T14:40:15.683Z.

## Overall

**pass@1 95%, all 3 runs pass 86%** (7 cases). pass@3 is best-of-3 and is listed last.

| measure | value |
| --- | ---: |
| cases / conversations / turns | 7 / 21 / 42 |
| pass@1 (mean case pass rate) | 95% |
| all runs pass | 86% |
| majority (over half the runs pass) | 100% |
| pass@3 (some run passes) | 100% |
| conversations passing every assertion | 95% |
| turns passing every assertion | 98% |
| assertions passing (463 checks) | 100% |
| conversations that hit an API failure | 0 |
| list-price cost of the model runs | $0.32 |

## By category

| category | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| multiturn | 4 | 12 | 92% | 75% | 100% | 100% |
| i18n | 3 | 9 | 100% | 100% | 100% | 100% |

## By language

| language | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 4 | 12 | 92% | 75% | 100% | 100% |
| ko | 2 | 6 | 100% | 100% | 100% | 100% |
| zh | 1 | 3 | 100% | 100% | 100% | 100% |

## By assertion type (worst first)

| type | checks | passed | rate | cases that failed it |
| --- | ---: | ---: | ---: | ---: |
| pins | 24 | 23 | 96% | 1 |
| include | 18 | 18 | 100% | 0 |
| req | 21 | 21 | 100% | 0 |
| residency | 30 | 30 | 100% | 0 |
| residencyScan | 30 | 30 | 100% | 0 |
| noErrors | 42 | 42 | 100% | 0 |
| pathOrder | 42 | 42 | 100% | 0 |
| attachValid | 42 | 42 | 100% | 0 |
| format | 42 | 42 | 100% | 0 |
| escapes | 42 | 42 | 100% | 0 |
| noPrices | 42 | 42 | 100% | 0 |
| sayLang | 42 | 42 | 100% | 0 |
| region | 9 | 9 | 100% | 0 |
| noWarn | 6 | 6 | 100% | 0 |
| whyLang | 16 | 16 | 100% | 0 |
| retention | 6 | 6 | 100% | 0 |
| exclude | 9 | 9 | 100% | 0 |

## Cases below 100% (1 of 7)

| case | runs passed | what failed |
| --- | ---: | ---: |
| ho-r-k8s-lifted | 2/3 | pinned avoid ack (1) |

## Warnings before and after deterministic repair

| code | before: total | per turn | turns | after: total | per turn | fixed by repair |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| orphan-node | 10 | 0.238 | 4 | 8 | 0.19 | 1 |
| constraint-region | 4 | 0.095 | 3 | 2 | 0.048 | 0 |
| attach-host-missing | 2 | 0.048 | 1 | 0 | 0 | 0 |
| containment | 2 | 0.048 | 2 | 0 | 0 | 2 |
| constraint-replaced | 0 | 0 | 0 | 5 | 0.119 | 0 |

Severity before repair {"warn":11,"info":4,"error":3}, after {"info":9,"warn":6}. Unknown products: 0 (none). Product strings that were not catalog ids: 0 (none).

## Latency (main stream)

| measure | n | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| first token (answering attempt) | 42 | 1.32 s | 1.71 s | 1.98 s |
| first token as waited for (failed attempts included) | 42 | 1.32 s | 1.71 s | 1.98 s |
| first say | 42 | 1.71 s | 2.14 s | 2.66 s |
| first op | 42 | 1.96 s | 2.46 s | 2.53 s |
| first node | 38 | 3.77 s | 4.86 s | 5.88 s |
| stream total (all turns) | 42 | 10.0 s | 17.8 s | 18.4 s |
| stream total, new diagrams | 42 | 10.0 s | 17.8 s | 18.4 s |
| stream total, edits | 21 | 5.07 s | 7.00 s | 7.99 s |
| stream total, product answers | 0 | - | - | - |
| whole turn incl. retries and follow-up | 42 | 11.4 s | 17.8 s | 18.5 s |

## Tokens and cost

| measure | value |
| --- | ---: |
| prompt tokens | 562099 |
| cached prompt tokens | 530432 (94%) |
| completion tokens | 21208 |
| completion tokens per turn p50 / p95 | 507 / 940 |
| cost per turn mean / p95 | $0.0077 / $0.0095 |
| cost per conversation mean / p95 | $0.0154 / $0.0172 |
| total | $0.32 |

## Reliability

| counter | value |
| --- | ---: |
| turns | 42 |
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

0 of 42 turns (0%) failed over in the main stream; reasons {}. Follow-up turns that ran on another model: 0.

## Cut-off turns

Main streams that ended without done: 0 ({}). Rescued by the continuation turn: 0 (0 of them pass every assertion); not rescued: 0. Turn pass rate without the rescued turns: 98%.

## Constraint compliance (machine-checked)

| check | passed | rate |
| --- | ---: | ---: |
| residency (final graph and final narration, core checker) | 30/30 | 100% |
| residency, independent scan (own place table and cue words; shares no code with the checker) | 30/30 | 100% |
| pinned constraints as data (req regions / avoid) | 23/24 | 96% |
| avoided products absent (exclude and retained exclude) | 12/12 | 100% |

Residency checks with a warn-level foreign-region mention (not failed, reviewed by hand): 2. Residency checks where the product's repair turn corrected the main-stream narration: 1. Turns with pinned constraints in memory: 38. Product constraint findings before repair {"constraint-region":{"total":4,"turns":3,"error":1}}, left after repair {"constraint-region":{"total":2,"turns":2,"error":0}}.

| case | run | turn | pins check | pinned |
| --- | ---: | ---: | ---: | ---: |
| ho-r-k8s-lifted | 3 | 1 | pinned avoid ack | no machine-checkable constraint pinned |

## Repairs

| deterministic fix | fixes | turns |
| --- | ---: | ---: |
| attach-invalid | 2 | 1 |
| containment | 2 | 2 |
| orphan-node | 1 | 1 |

LLM follow-up turns: 1 ({"repair":1}); turns by finding code {"constraint-region":1}.

| case | run | turn | kind | turn passes | findings |
| --- | ---: | ---: | ---: | ---: | ---: |
| ho-r-eu-bloc | 3 | 2 | repair | yes | constraint-region/error: the why of 'db-reporting' says "Read-only EU replica for US parent reporting" (replica to Virginia (us-east-1), Silicon Valley (us-west-1)); the pinned regions are Frankfurt (eu-central-1), Londo; constraint-region/warn: a say line nam |

## Languages

| language | turns | completion tokens / turn | vs English twin | prompt tokens / turn | say in language | why in language | \u escapes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 24 | 528 | - | 13659 | 24/24 | 0/0 | 0 |
| ko | 12 | 473 | - | 13002 | 12/12 | 12/12 | 0 |
| zh | 6 | 477 | - | 13045 | 6/6 | 4/4 | 0 |

## Multi-turn retention

| case | turns | retention checks passed per turn | run pass |
| --- | ---: | ---: | ---: |
| ho-r-relax-tokyo | 2 | 6/6  3/3 | 100% |
| ho-r-k8s-lifted | 2 | 3/3  0/0 | 67% |
| ho-r-ko-dr-in-country | 2 | 6/6  6/6 | 100% |
| ho-r-zh-no-crossregion | 2 | 6/6  3/3 | 100% |
| ho-r-ko-avoid-mesh | 2 | 3/3  3/3 | 100% |
| ho-r-malaysia-two | 2 | 6/6  3/3 | 100% |
| ho-r-eu-bloc | 2 | 6/6  3/3 | 100% |

## Judge (kimi-k3)

| measure | value |
| --- | ---: |
| runs judged / judge errors | 7 / 0 |
| completeness | 4 |
| accuracy | 4.143 |
| rationality | 3.714 |
| readability | 4.143 |
| overall | 4 |
| architect would sign off | 71% |
| judge cost | $0.191 |

| category | judged | overall score | sign-off |
| --- | ---: | ---: | ---: |
| multiturn | 4 | 3.938 | 50% |
| i18n | 3 | 4.083 | 100% |

Every run of the constraint cases: 21 runs judged, sign-off 76%, mean 4.226. (Total judged runs: 21.)

| case | run | judge defects |
| --- | ---: | ---: |
| ho-r-k8s-lifted | 1 | Missing edges: alb->api, api->db, api->cache, api->mq, mq->worker, worker->db, api->logs, worker->logs were all deleted and not re-pointed at the new ACK pods, so the API is unreachable and the workers have nothing to co |
| ho-r-k8s-lifted | 2 | Missing edge alb -> cluster (Ingress), so client traffic never reaches the API on ACK.; Background workers removed as a node and never re-expressed (e.g., as a labeled workload on the cluster); queue -> worker consume pa |
| ho-r-malaysia-two | 1 | db-dr is in the same VPC and zones a,b as the primary db, duplicating the existing zone standby rather than adding regional DR; RDS already has zone standby (zones a,b); adding another same-region, same-zone RDS node add |
| ho-r-malaysia-two | 2 | db-dr is placed in the same Kuala Lumpur VPC; true DR should replicate to Johor (ap-southeast-8), the second Malaysian region, to satisfy disaster recovery while keeping data in Malaysia; No cross-region replication arch |
| ho-r-malaysia-two | 3 | db-dr is placed in the same VPC/region as the primary DB; a regional outage in ap-southeast-3 takes out both primary and DR; No use of Johor (ap-southeast-8), the second Malaysian region, for cross-region DR despite the  |

Agreement between the judged run's assertions and the judge's sign-off: 5/7 (71%). Assertions pass and judge yes 5, both no 0, assertions pass but judge no 2, assertions fail but judge yes 0. Mean score of passing runs 4, failing runs -, point-biserial r -.

| case | assertions | judge | failed assertions | judge defects |
| --- | ---: | ---: | ---: | ---: |
| ho-r-k8s-lifted | pass | no |  | Missing edges: alb->api, api->db, api->cache, api->mq, mq->worker, worker->db, api->logs, worker->logs were all deleted and not re-pointed at the new ACK pods, so the API is unreachable and the worker |
| ho-r-malaysia-two | pass | no |  | db-dr is in the same VPC and zones a,b as the primary db, duplicating the existing zone standby rather than adding regional DR; RDS already has zone standby (zones a,b); adding another same-region, sa |
