# Evaluation summary

Model qwen3.8-max (fallback qwen3.7-max), catalog 2026-10-31 (232 entries), system prompt 59133 chars (sha256 be0d8972c479), 3 runs per case, started 2026-10-31T16:54:36.992Z.

## Overall

**pass@1 93%, all 3 runs pass 87%** (109 cases). pass@3 is best-of-3 and is listed last.

| measure | value |
| --- | ---: |
| cases / conversations / turns | 109 / 327 / 423 |
| pass@1 (mean case pass rate) | 93% |
| all runs pass | 87% |
| majority (over half the runs pass) | 95% |
| pass@3 (some run passes) | 97% |
| conversations passing every assertion | 93% |
| turns passing every assertion | 95% |
| assertions passing (4797 checks) | 100% |
| conversations that hit an API failure | 1 |
| list-price cost of the model runs | $4.06 |

## By category

| category | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pattern | 22 | 66 | 96% | 96% | 96% | 96% |
| need | 20 | 60 | 90% | 80% | 95% | 95% |
| trap | 18 | 54 | 93% | 83% | 94% | 100% |
| edit | 9 | 27 | 100% | 100% | 100% | 100% |
| multiturn | 12 | 36 | 81% | 67% | 83% | 92% |
| adversarial | 5 | 15 | 100% | 100% | 100% | 100% |
| i18n | 23 | 69 | 97% | 91% | 100% | 100% |

## By language

| language | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 86 | 258 | 92% | 86% | 94% | 97% |
| ko | 13 | 39 | 97% | 92% | 100% | 100% |
| zh | 10 | 30 | 97% | 90% | 100% | 100% |

## By assertion type (worst first)

| type | checks | passed | rate | cases that failed it |
| --- | ---: | ---: | ---: | ---: |
| api | 1 | 0 | 0% | 1 |
| reask | 21 | 19 | 91% | 2 |
| mention | 23 | 21 | 91% | 1 |
| scope | 30 | 28 | 93% | 1 |
| residency | 51 | 50 | 98% | 1 |
| residencyScan | 51 | 50 | 98% | 1 |
| primaryRec | 54 | 53 | 98% | 1 |
| askLang | 54 | 53 | 98% | 1 |
| exclude | 171 | 168 | 98% | 1 |
| sayLang | 422 | 418 | 99% | 2 |
| include | 513 | 510 | 99% | 1 |
| retention | 159 | 158 | 99% | 1 |
| attachValid | 422 | 420 | 100% | 1 |
| noPrices | 422 | 420 | 100% | 1 |
| noErrors | 422 | 422 | 100% | 0 |
| pathOrder | 354 | 354 | 100% | 0 |
| format | 422 | 422 | 100% | 0 |
| escapes | 422 | 422 | 100% | 0 |
| size | 171 | 171 | 100% | 0 |
| region | 108 | 108 | 100% | 0 |
| zones | 27 | 27 | 100% | 0 |
| notMention | 15 | 15 | 100% | 0 |
| question | 3 | 3 | 100% | 0 |
| attach | 18 | 18 | 100% | 0 |
| noWarn | 54 | 54 | 100% | 0 |
| editMinimal | 87 | 87 | 100% | 0 |
| restore | 3 | 3 | 100% | 0 |
| req | 51 | 51 | 100% | 0 |
| whyLang | 87 | 87 | 100% | 0 |
| pins | 24 | 24 | 100% | 0 |
| linked | 21 | 21 | 100% | 0 |
| placement | 9 | 9 | 100% | 0 |
| gpu | 12 | 12 | 100% | 0 |
| asks | 42 | 42 | 100% | 0 |
| askOptions | 39 | 39 | 100% | 0 |
| assumes | 9 | 9 | 100% | 0 |
| chips | 3 | 3 | 100% | 0 |

## Cases below 100% (14 of 109)

| case | runs passed | what failed |
| --- | ---: | ---: |
| pat-12-ecommerce-security | 0/3 | include fraud-detection (3) |
| need-02-whole-company | 0/3 | say text in en (3) |
| ai-07-training-residency | 0/3 | exclude agentloop (3) |
| p1-avoid-tempted-k8s | 1/3 | every attachment names a valid host (2) |
| sc-04-ec2-s3-trap | 1/3 | provider names only on other-cloud nodes and external groups (2) |
| need-08-contractor-desktops | 2/3 | primary rec eds (1) |
| trap-07-icp | 2/3 | turn completed (1); api: turn 1: content-filtered: <400> InternalError.Algo.DataInspectionFailed: Output  (1) |
| mt-04-budget | 2/3 | no invented prices (1) |
| ko-need-02-whole-company | 2/3 | ask text in ko (1) |
| zh-trap-01-lingma | 2/3 | say text in zh (1) |
| mt-06-summary-window | 2/3 | regions only jakarta/ap-southeast-5/indonesia (1); residency ap-southeast-5 (1); residency scan ap-southeast-5 (1) |
| ai-10-rl-flash-sandbox | 2/3 | mentions no official/without an official/not an official/isn't an official/no documented/there is no official/not officially (1); mentions verl (1) |
| sc-01-rds-aws | 2/3 | asks never touch aws/rds (1) |
| sc-02-rds-aws-migrate | 2/3 | asks never touch aws/postgres/migrate (1) |

## Warnings before and after deterministic repair

| code | before: total | per turn | turns | after: total | per turn | fixed by repair |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| orphan-node | 73 | 0.173 | 66 | 73 | 0.173 | 0 |
| containment | 50 | 0.118 | 30 | 0 | 0 | 50 |
| unknown-id | 16 | 0.038 | 7 | 0 | 0 | 0 |
| attach-host-missing | 11 | 0.026 | 10 | 0 | 0 | 3 |
| constraint-region | 8 | 0.019 | 4 | 8 | 0.019 | 0 |
| missing-group | 7 | 0.017 | 7 | 0 | 0 | 7 |
| path-order | 3 | 0.007 | 3 | 0 | 0 | 3 |
| bad-op | 3 | 0.007 | 3 | 0 | 0 | 0 |
| dns-in-path | 1 | 0.002 | 1 | 0 | 0 | 1 |
| bad-json | 1 | 0.002 | 1 | 1 | 0.002 | 0 |
| constraint-replaced | 0 | 0 | 0 | 1 | 0.002 | 0 |

Severity before repair {"warn":76,"info":73,"error":24}, after {"info":55,"warn":28}. Unknown products: 0 (none). Product strings that were not catalog ids: 0 (none).

## Latency (main stream)

| measure | n | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| first token (answering attempt) | 423 | 1.17 s | 1.73 s | 7.04 s |
| first token as waited for (failed attempts included) | 423 | 1.17 s | 1.79 s | 9.79 s |
| first say | 419 | 1.46 s | 2.07 s | 7.29 s |
| first op | 422 | 1.95 s | 2.70 s | 7.67 s |
| first node | 344 | 4.25 s | 5.75 s | 8.91 s |
| stream total (all turns) | 423 | 10.4 s | 24.6 s | 36.1 s |
| stream total, new diagrams | 354 | 14.0 s | 25.9 s | 36.1 s |
| stream total, edits | 132 | 5.83 s | 13.0 s | 23.7 s |
| stream total, product answers | 56 | 4.06 s | 6.36 s | 9.20 s |
| whole turn incl. retries and follow-up | 423 | 11.0 s | 24.6 s | 36.1 s |

## Tokens and cost

| measure | value |
| --- | ---: |
| prompt tokens | 6536240 |
| cached prompt tokens | 6114304 (94%) |
| completion tokens | 242177 |
| completion tokens per turn p50 / p95 | 474 / 1263 |
| cost per turn mean / p95 | $0.0096 / $0.0134 |
| cost per conversation mean / p95 | $0.0124 / $0.0312 |
| total | $4.06 |

## Reliability

| counter | value |
| --- | ---: |
| turns | 423 |
| main stream ended without done (truncated) | 1 |
| continuation turns | 0 |
| repair turns | 0 |
| hedged turns / hedge won | 0 / 0 |
| turns that used the fallback model | 6 |
| extra attempts after failures | 6 |
| conversations with an API failure | 1 |
| bad (unparseable) lines | 1 |
| \u escapes | 0 |

## Failover to the fallback model

6 of 423 turns (1%) failed over in the main stream; reasons {"first-byte-timeout":6}. Follow-up turns that ran on another model: 0.

| measure | n | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| stalled attempt before failover | 6 | 8.03 s | 8.04 s | 8.04 s |
| fallback first token | 6 | 1.38 s | 1.77 s | 1.78 s |
| first token as waited for | 6 | 9.41 s | 9.79 s | 9.79 s |
| whole turn | 6 | 13.1 s | 14.8 s | 14.8 s |

## Cut-off turns

Main streams that ended without done: 1 ({"content-filtered":1}). Rescued by the continuation turn: 0 (0 of them pass every assertion); not rescued: 1. Turn pass rate without the rescued turns: 95%.

## Constraint compliance (machine-checked)

| check | passed | rate |
| --- | ---: | ---: |
| residency (final graph and final narration, core checker) | 50/51 | 98% |
| residency, independent scan (own place table and cue words; shares no code with the checker) | 50/51 | 98% |
| pinned constraints as data (req regions / avoid) | 24/24 | 100% |
| avoided products absent (exclude and retained exclude) | 204/207 | 99% |

Residency checks with a warn-level foreign-region mention (not failed, reviewed by hand): 0. Residency checks where the product's repair turn corrected the main-stream narration: 0. Turns with pinned constraints in memory: 124. Product constraint findings before repair {"constraint-region":{"total":8,"turns":4,"error":0}}, left after repair {"constraint-region":{"total":8,"turns":4,"error":0}}.

Independent residency scan hits (read each one: it errs towards flagging):

| case | run | turn | scan finding |
| --- | ---: | ---: | ---: |
| mt-06-summary-window | 1 | 5 | group kul: Kuala Lumpur/ap-southeast-3 in "Kuala Lumpur (ap-southeast-3)"; say : Kuala Lumpur in "I'll add a full DR replica in Kuala Lumpur, keeping all data within the Indones…"; say : Kuala Lumpur in "Added GTM for fa |

| case | run | turn | residency finding |
| --- | ---: | ---: | ---: |
| mt-06-summary-window | 1 | 5 | region group 'kul' (Kuala Lumpur (ap-southeast-3)) is in Kuala Lumpur (ap-southeast-3) and holds db-dr; the pinned regions are Jakarta (ap-southeast-5) ("eval residency"); the why of 'gtm' says "Routes users to Jakarta o |

## Repairs

| deterministic fix | fixes | turns |
| --- | ---: | ---: |
| containment | 50 | 31 |
| attach-invalid | 8 | 8 |
| missing-group | 7 | 7 |
| path-order | 3 | 3 |
| attach-host-missing | 3 | 2 |
| dns-in-path | 1 | 1 |

LLM follow-up turns: 0 ({}); turns by finding code {}.

## Languages

| language | turns | completion tokens / turn | vs English twin | prompt tokens / turn | say in language | why in language | \u escapes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 336 | 557 | - | 15452 | 332/335 | 0/0 | 0 |
| ko | 48 | 671 | 1.159 | 15429 | 48/48 | 48/48 | 0 |
| zh | 39 | 589 | 1.086 | 15480 | 38/39 | 39/39 | 0 |

## Multi-turn retention

| case | turns | retention checks passed per turn | run pass |
| --- | ---: | ---: | ---: |
| edit-06-restore | 2 | 0/0  0/0 | 100% |
| mt-01-avoid-k8s | 4 | 3/3  3/3  6/6  6/6 | 100% |
| mt-02-serverless-first | 3 | 3/3  3/3  6/6 | 100% |
| mt-03-data-in-singapore | 4 | 6/6  9/9  6/6  6/6 | 100% |
| mt-04-budget | 3 | 3/3  6/6  3/3 | 67% |
| ko-mt-01-avoid-k8s | 3 | 3/3  3/3  6/6 | 100% |
| zh-mt-01-avoid-k8s | 3 | 3/3  3/3  6/6 | 100% |
| mt-05-mixed-five-turns | 5 | 6/6  9/9  9/9  9/9  9/9 | 100% |
| mt-06-summary-window | 5 | 9/9  9/9  9/9  9/9  13/15 | 67% |
| p1-req-residency-my | 2 | 6/6  9/9 | 100% |
| p1-req-avoid-fc | 2 | 3/3  3/3 | 100% |
| p1-avoid-tempted-k8s | 3 | 3/3  3/3  6/6 | 33% |
| p1-ko-residency | 2 | 3/3  6/6 | 100% |
| p1-zh-residency | 2 | 6/6  9/9 | 100% |
| ai-07-training-residency | 2 | 6/6  9/9 | 0% |
| as-04-answer-vague | 2 | 0/0  0/0 | 100% |
| as-05-flip-internal | 2 | 0/0  3/3 | 100% |

## Judge (kimi-k3)

| measure | value |
| --- | ---: |
| runs judged / judge errors | 109 / 0 |
| completeness | 4.431 |
| accuracy | 4.367 |
| rationality | 4.202 |
| readability | 4.422 |
| overall | 4.356 |
| architect would sign off | 91% |
| judge cost | $1.266 |

| category | judged | overall score | sign-off |
| --- | ---: | ---: | ---: |
| pattern | 22 | 4.239 | 91% |
| need | 20 | 4.35 | 95% |
| trap | 18 | 4.444 | 94% |
| edit | 9 | 4.5 | 89% |
| multiturn | 12 | 4.083 | 67% |
| adversarial | 5 | 4.6 | 80% |
| i18n | 23 | 4.435 | 100% |

Every run of the constraint cases: 45 runs judged, sign-off 73%, mean 4.128. (Total judged runs: 139.)

| case | run | judge defects |
| --- | ---: | ---: |
| ai-07-training-residency | 1 | agentloop node drawn 'in sg' (Singapore) although AgentLoop is available internationally only in Hong Kong — wrong region claim.; Narration turn 2 presents AgentLoop as the tracing/evaluation choice with no caveat about  |
| ai-07-training-residency | 2 | agentloop node placed in sg region despite catalog fact: international use only through Hong Kong, no Singapore region; Turn 2 narration 'keeping everything in Singapore' is inaccurate and misleading given the pinned res |
| ai-07-training-residency | 3 | agentloop node drawn in sg region despite catalog stating international use only through Hong Kong; Turn 2 narration presents AgentLoop without any caveat about region availability or data leaving Singapore; No in-region |
| as-05-flip-internal | 1 | users node still placed in the Internet external group and labeled 'Shoppers' for an internal-only app; should be staff/on-premises or office users reaching via VPN.; dns node and users->dns resolve edge retained althoug |
| as-05-flip-internal | 2 | users node still in internet group with users -> alb HTTPS edge; an internal-only app should be reached via VPN Gateway or Express Connect from on-premises/office, not from the Internet.; dns (public authoritative DNS) s |
| as-05-flip-internal | 3 | dns node and users->dns resolve edge kept though internal-only app needs no public DNS; should be removed or replaced with private DNS; users node still labeled 'Shoppers' in Internet group; for internal-only it should b |
| mt-04-budget | 1 | Turn 3 narration claims the HA design stays under $200 without flagging that multi-zone RDS + Elasticsearch + 2x ECS + ALB + NAT can exceed a $200 budget; no cost-impact caveat as guidance requires; app-2 'App server 2'  |
| mt-04-budget | 2 | Assistant narrates specific price estimates ($30-50/month, $40-60/month); prices must never be stated by the assistant.; Stack likely busts the $200 budget once HA is added (multi-zone RDS + Elasticsearch + NAT + ALB + 2 |
| mt-04-budget | 3 | Turn 3 makes Elasticsearch multi-zone, a significant cost driver that conflicts with the $200 budget; a single-node search or cheaper alternative should have been flagged as a trade-off question; Repeated identical quest |
| mt-06-summary-window | 1 | Cross-border DR to Kuala Lumpur contradicts the stated Indonesia-only data residency; zone-level DR plus backups in Jakarta (or in-country options) should have been used, or the contradiction flagged to the user; DR VPC  |
| p1-avoid-tempted-k8s | 3 | MSE drawn as an inline data-path hop (api -> mesh -> queue); MSE is a control/governance plane and should not sit between services in the data path; Original api -> queue 'events' edge removed, breaking the decoupling fl |
| p1-ko-residency | 2 | GTM을 서울 가용영역 간 DNS 페일오버 용도로 사용 — GTM은 리전 간 스티어링용이며, 단일 리전 내 AZ 페일오버는 ALB 다중 AZ로 이미 해결됨 (불필요한 구성요소); gtm -> alb 라우팅 엣지: GTM은 DNS 기반이며 데이터 경로에 ALB로 라우팅하지 않음; ESA(글로벌 엣지 네트워크)가 고객 데이터 해외 반출 금지 규정과 충돌할 수 있는데, 엣지 캐싱 비활성화나 한국  |

Agreement between the judged run's assertions and the judge's sign-off: 98/109 (90%). Assertions pass and judge yes 95, both no 3, assertions pass but judge no 7, assertions fail but judge yes 4. Mean score of passing runs 4.4, failing runs 3.714, point-biserial r 0.328.

| case | assertions | judge | failed assertions | judge defects |
| --- | ---: | ---: | ---: | ---: |
| need-02-whole-company | fail | yes | say text in en | No mention that QwenWork is in public beta/preview, which an enterprise buyer should know; Premium tier (SSO, dedicated VPC) not mentioned despite company-wide rollout implying SSO need; No clarifying |
| need-12-qwen-api | pass | no |  | Narration is a single sentence with no guidance on how to integrate (endpoint, key on server, region choice); No first diagram drawn despite a drawable pattern (app backend -> Model Studio); No option |
| trap-11-contact-center | pass | no |  | No diagram produced; the request is specific enough to draw a first architecture on stated assumptions; Narration omits key caveats: ims-conversational-ai is in preview, and Model Studio agent apps/kn |
| edit-07-multi-region-dr | pass | no |  | users->gtm (resolve) and gtm->dns (resolve) edges are wrong: GTM replaces/acts as the DNS steering layer; DNS is not a hop and chaining GTM to Cloud DNS is not a valid data path; gtm->alb-dr 'failover |
| mt-04-budget | pass | no |  | Turn 3 narration claims the HA design stays under $200 without flagging that multi-zone RDS + Elasticsearch + 2x ECS + ALB + NAT can exceed a $200 budget; no cost-impact caveat as guidance requires; a |
| adv-03-aws-products | pass | no |  | Tablestore node placed in vpc; it is a regional service drawn outside the VPC; FC node placed in vpc; FC is drawn outside the VPC unless VPC access is configured (not stated); HTTPDNS used as a resolu |
| ko-need-02-whole-company | fail | yes | ask text in ko | DingTalk recommendation does not mention that international edition AI features/pricing are unpublished (low confidence); QwenWork preview status and language limits (English/Chinese only, no Korean U |
| p1-path-ddos-esa | pass | no |  | Edge order violation: users -> esa -> ddos -> alb instead of users -> ddos -> esa -> alb as explicitly required by the user; Narration states 'Anti-DDoS Proxy at the very front, ESA behind it' but the |
| p1-avoid-tempted-k8s | fail | yes | every attachment names a valid host | Autoscaling capability not shown as a distinct node or annotation despite being explicitly requested in turn 3; MSE node labeled 'Service Mesh' when catalog describes it as Microservices Engine for re |
| ai-10-rl-flash-sandbox | fail | yes | mentions no official/without an official/not an official/isn't an official/no documented/there is no official/not officially; mentions verl | Final policy serving on PAI-EAS is not included, though the user only asked about training/rollouts so this is minor; No edge from sandbox back to OSS for trajectory/rollout data persistence; trajecto |
| as-05-flip-internal | pass | no |  | users node still placed in the Internet external group and labeled 'Shoppers' for an internal-only app; should be staff/on-premises or office users reaching via VPN.; dns node and users->dns resolve e |
