# Evaluation summary

Model qwen3.8-max (fallback qwen3.7-max), catalog 2026-10-31 (232 entries), system prompt 59133 chars (sha256 be0d8972c479), 3 runs per case, started 2026-10-31T16:56:05.976Z.

## Overall

**pass@1 82%, all 3 runs pass 79%** (24 cases). pass@3 is best-of-3 and is listed last.

| measure | value |
| --- | ---: |
| cases / conversations / turns | 24 / 72 / 78 |
| pass@1 (mean case pass rate) | 82% |
| all runs pass | 79% |
| majority (over half the runs pass) | 83% |
| pass@3 (some run passes) | 83% |
| conversations passing every assertion | 82% |
| turns passing every assertion | 83% |
| assertions passing (1032 checks) | 99% |
| conversations that hit an API failure | 0 |
| list-price cost of the model runs | $0.70 |

## By category

| category | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pattern | 3 | 9 | 100% | 100% | 100% | 100% |
| trap | 6 | 18 | 67% | 67% | 67% | 67% |
| i18n | 5 | 15 | 100% | 100% | 100% | 100% |
| need | 8 | 24 | 71% | 63% | 75% | 75% |
| multiturn | 2 | 6 | 100% | 100% | 100% | 100% |

## By language

| language | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 19 | 57 | 77% | 74% | 79% | 79% |
| zh | 4 | 12 | 100% | 100% | 100% | 100% |
| ko | 1 | 3 | 100% | 100% | 100% | 100% |

## By assertion type (worst first)

| type | checks | passed | rate | cases that failed it |
| --- | ---: | ---: | ---: | ---: |
| mention | 21 | 18 | 86% | 1 |
| exclude | 27 | 24 | 89% | 1 |
| scope | 36 | 33 | 92% | 1 |
| reask | 30 | 29 | 97% | 1 |
| include | 96 | 93 | 97% | 1 |
| req | 9 | 9 | 100% | 0 |
| region | 36 | 36 | 100% | 0 |
| gpu | 15 | 15 | 100% | 0 |
| residency | 3 | 3 | 100% | 0 |
| residencyScan | 3 | 3 | 100% | 0 |
| noErrors | 78 | 78 | 100% | 0 |
| pathOrder | 63 | 63 | 100% | 0 |
| attachValid | 78 | 78 | 100% | 0 |
| format | 78 | 78 | 100% | 0 |
| escapes | 78 | 78 | 100% | 0 |
| noPrices | 78 | 78 | 100% | 0 |
| sayLang | 78 | 78 | 100% | 0 |
| linked | 6 | 6 | 100% | 0 |
| askLang | 15 | 15 | 100% | 0 |
| whyLang | 9 | 9 | 100% | 0 |
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
| as-ho-hr-internal | 2/3 | assumes never repeat internal/400/singapore (1) |

## Warnings before and after deterministic repair

| code | before: total | per turn | turns | after: total | per turn | fixed by repair |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| containment | 13 | 0.167 | 13 | 0 | 0 | 14 |
| missing-group | 4 | 0.051 | 4 | 0 | 0 | 4 |
| bad-op | 3 | 0.038 | 3 | 0 | 0 | 0 |
| orphan-node | 3 | 0.038 | 3 | 3 | 0.038 | 0 |
| attach-host-missing | 1 | 0.013 | 1 | 0 | 0 | 0 |

Severity before repair {"warn":12,"error":9,"info":3}, after {"warn":3}. Unknown products: 0 (none). Product strings that were not catalog ids: 0 (none).

## Latency (main stream)

| measure | n | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| first token (answering attempt) | 78 | 1.18 s | 1.54 s | 1.68 s |
| first token as waited for (failed attempts included) | 78 | 1.18 s | 1.54 s | 1.68 s |
| first say | 78 | 1.48 s | 1.89 s | 2.23 s |
| first op | 78 | 1.91 s | 2.44 s | 3.38 s |
| first node | 63 | 4.48 s | 5.90 s | 7.26 s |
| stream total (all turns) | 78 | 12.3 s | 21.4 s | 24.7 s |
| stream total, new diagrams | 63 | 14.9 s | 21.5 s | 24.7 s |
| stream total, edits | 6 | 21.0 s | 23.1 s | 23.7 s |
| stream total, product answers | 2 | 4.85 s | 5.01 s | 5.03 s |
| whole turn incl. retries and follow-up | 78 | 12.3 s | 21.4 s | 24.7 s |

## Tokens and cost

| measure | value |
| --- | ---: |
| prompt tokens | 1182246 |
| cached prompt tokens | 1118208 (95%) |
| completion tokens | 49337 |
| completion tokens per turn p50 / p95 | 630 / 1146 |
| cost per turn mean / p95 | $0.0090 / $0.0123 |
| cost per conversation mean / p95 | $0.0098 / $0.0185 |
| total | $0.70 |

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

Main streams that ended without done: 0 ({}). Rescued by the continuation turn: 0 (0 of them pass every assertion); not rescued: 0. Turn pass rate without the rescued turns: 83%.

## Constraint compliance (machine-checked)

| check | passed | rate |
| --- | ---: | ---: |
| residency (final graph and final narration, core checker) | 3/3 | 100% |
| residency, independent scan (own place table and cue words; shares no code with the checker) | 3/3 | 100% |
| pinned constraints as data (req regions / avoid) | 3/3 | 100% |
| avoided products absent (exclude and retained exclude) | 21/24 | 88% |

Residency checks with a warn-level foreign-region mention (not failed, reviewed by hand): 0. Residency checks where the product's repair turn corrected the main-stream narration: 0. Turns with pinned constraints in memory: 12. Product constraint findings before repair {}, left after repair {}.

## Repairs

| deterministic fix | fixes | turns |
| --- | ---: | ---: |
| containment | 14 | 14 |
| missing-group | 4 | 4 |
| attach-invalid | 1 | 1 |

LLM follow-up turns: 0 ({}); turns by finding code {}.

## Languages

| language | turns | completion tokens / turn | vs English twin | prompt tokens / turn | say in language | why in language | \u escapes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 63 | 652 | - | 15166 | 63/63 | 0/0 | 0 |
| ko | 3 | 142 | - | 15113 | 3/3 | 0/0 | 0 |
| zh | 12 | 653 | - | 15122 | 12/12 | 9/9 | 0 |

## Multi-turn retention

| case | turns | retention checks passed per turn | run pass |
| --- | ---: | ---: | ---: |
| as-ho-answer-riders | 2 | 0/0  0/0 | 100% |
| as-ho-flip-regions | 2 | 0/0  3/3 | 100% |

## Judge (kimi-k3)

| measure | value |
| --- | ---: |
| runs judged / judge errors | 24 / 0 |
| completeness | 4.5 |
| accuracy | 4.375 |
| rationality | 4.125 |
| readability | 4.542 |
| overall | 4.385 |
| architect would sign off | 83% |
| judge cost | $0.246 |

| category | judged | overall score | sign-off |
| --- | ---: | ---: | ---: |
| pattern | 3 | 4.667 | 100% |
| trap | 6 | 4.125 | 83% |
| i18n | 5 | 4.65 | 80% |
| need | 8 | 4.406 | 88% |
| multiturn | 2 | 4 | 50% |

Every run of the constraint cases: 9 runs judged, sign-off 56%, mean 3.778. (Total judged runs: 30.)

| case | run | judge defects |
| --- | ---: | ---: |
| ai-ho-eu-training | 1 | Lingjun node placed in Frankfurt region; catalog says Lingjun's only international region is Singapore, so this violates the EU-only constraint and is not available there; Narration never states that Lingjun is unavailab |
| ai-ho-eu-training | 2 | gpu-cluster node places Lingjun in Frankfurt, where it is not available; catalog and case guidance say Lingjun's only international region is Singapore.; Narration asserts 'Lingjun bare-metal clusters with CPFS are the r |
| ai-ho-eu-training | 3 | Lingjun node placed in Frankfurt region despite catalog guidance that Lingjun's only international region is Singapore; this is the core defect.; Narration recommends Lingjun and asks about allowlisting for Frankfurt wit |
| as-ho-flip-regions | 1 | GTM -> dns edge is backwards/pointless: GTM itself is the DNS steering layer; keeping both Cloud DNS and GTM with users->gtm(resolve) then gtm->dns muddles the resolve path.; ESA has no origin/failover path to the Tokyo  |

Agreement between the judged run's assertions and the judge's sign-off: 18/24 (75%). Assertions pass and judge yes 17, both no 1, assertions pass but judge no 3, assertions fail but judge yes 3. Mean score of passing runs 4.488, failing runs 3.875, point-biserial r 0.395.

| case | assertions | judge | failed assertions | judge defects |
| --- | ---: | ---: | ---: | ---: |
| ai-ho-zh-rag-eas | pass | no |  | Embedding 经 NAT 网关出公网调用 Model Studio，文档内容离开 VPC，与用户'向量数据留在 VPC 内网'的内网诉求冲突，应默认在 PAI-EAS 自托管 Embedding 或明确标注权衡; rag-service 与 llm 拆为两个独立 PAI-EAS 服务增加成本和运维复杂度，单服务即可承载 RAG 检索与推理; DNS 作为独立节点出现在数据路径边缘，虽标注 r |
| ai-ho-langstudio | fail | yes | mentions 2027/retir | Narration says LangStudio 'isn't in the current catalog' instead of stating it retires 2027-03-09 and that its successor (Model Studio app development) is closed to new international accounts; No inge |
| as-ho-flip-regions | pass | no |  | GTM -> dns edge is backwards/pointless: GTM itself is the DNS steering layer; keeping both Cloud DNS and GTM with users->gtm(resolve) then gtm->dns muddles the resolve path.; ESA has no origin/failove |
| sc-ho-onprem-db | fail | yes | include dts | DTS for the migration is not mentioned or drawn, though moving the database implies a migration path; No backup/DR mention for RDS, a minor omission |
| sc-ho-oss-backup-aws | pass | no |  | Express Connect shown as a hop writing to OSS; OSS is a regional service outside the VPC reached via its endpoint, not through the VPC boundary device.; Cloud Backup node added without need: it backs  |
| sc-ho-multicloud-link | fail | yes | provider names only on other-cloud nodes and external groups | Express Connect nodes placed inside the VPC rather than at the VPC edge/boundary per catalog scope; No VPN Gateway node shown even as an alternative path, though it is mentioned in the assumption chip |
