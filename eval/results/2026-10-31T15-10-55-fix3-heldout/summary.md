# Evaluation summary

Model qwen3.8-max (fallback qwen3.7-max), catalog 2026-10-31 (223 entries), system prompt 49687 chars (sha256 ad75dbaaa9c2), 3 runs per case, started 2026-10-31T15:10:55.438Z.

## Overall

**pass@1 87%, all 3 runs pass 80%** (25 cases). pass@3 is best-of-3 and is listed last.

| measure | value |
| --- | ---: |
| cases / conversations / turns | 25 / 75 / 132 |
| pass@1 (mean case pass rate) | 87% |
| all runs pass | 80% |
| majority (over half the runs pass) | 84% |
| pass@3 (some run passes) | 96% |
| conversations passing every assertion | 87% |
| turns passing every assertion | 92% |
| assertions passing (1462 checks) | 99% |
| conversations that hit an API failure | 0 |
| list-price cost of the model runs | $1.09 |

## By category

| category | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| multiturn | 11 | 33 | 79% | 73% | 73% | 91% |
| pattern | 4 | 12 | 83% | 75% | 75% | 100% |
| i18n | 7 | 21 | 95% | 86% | 100% | 100% |
| need | 2 | 6 | 100% | 100% | 100% | 100% |
| trap | 1 | 3 | 100% | 100% | 100% | 100% |

## By language

| language | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 18 | 54 | 83% | 78% | 78% | 94% |
| ko | 4 | 12 | 92% | 75% | 100% | 100% |
| zh | 3 | 9 | 100% | 100% | 100% | 100% |

## By assertion type (worst first)

| type | checks | passed | rate | cases that failed it |
| --- | ---: | ---: | ---: | ---: |
| noWarn | 6 | 4 | 67% | 1 |
| residencyScan | 60 | 54 | 90% | 3 |
| residency | 60 | 57 | 95% | 2 |
| include | 84 | 82 | 98% | 1 |
| noErrors | 132 | 129 | 98% | 2 |
| attachValid | 132 | 130 | 99% | 1 |
| region | 51 | 51 | 100% | 0 |
| placement | 3 | 3 | 100% | 0 |
| pathOrder | 126 | 126 | 100% | 0 |
| format | 132 | 132 | 100% | 0 |
| escapes | 132 | 132 | 100% | 0 |
| noPrices | 132 | 132 | 100% | 0 |
| sayLang | 132 | 132 | 100% | 0 |
| linked | 6 | 6 | 100% | 0 |
| attach | 6 | 6 | 100% | 0 |
| exclude | 30 | 30 | 100% | 0 |
| req | 42 | 42 | 100% | 0 |
| pins | 45 | 45 | 100% | 0 |
| retention | 66 | 66 | 100% | 0 |
| editMinimal | 12 | 12 | 100% | 0 |
| whyLang | 34 | 34 | 100% | 0 |
| primaryRec | 6 | 6 | 100% | 0 |
| size | 27 | 27 | 100% | 0 |
| question | 3 | 3 | 100% | 0 |
| mention | 3 | 3 | 100% | 0 |

## Cases below 100% (5 of 25)

| case | runs passed | what failed |
| --- | ---: | ---: |
| ho-r-eu-bloc | 0/3 | residency eu-central-1/eu-west-1/eu-west-2 (2); residency scan eu-central-1/eu-west-1/eu-west-2 (3); no error-level warnings after repair (2) |
| ho-p1-residency-japan | 1/3 | residency scan ap-northeast-1 (2) |
| ho-p1-vpc-mongo | 1/3 | every attachment names a valid host (2) |
| ho-r-k8s-lifted | 1/3 | include ack/acs/ack-serverless/ack-dedicated (2); no constraint-avoid before repair (2) |
| ho-p1-ko-residency | 2/3 | residency ap-northeast-2 (1); residency scan ap-northeast-2 (1); no error-level warnings after repair (1) |

## Warnings before and after deterministic repair

| code | before: total | per turn | turns | after: total | per turn | fixed by repair |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| constraint-region | 25 | 0.189 | 12 | 12 | 0.091 | 0 |
| orphan-node | 12 | 0.091 | 12 | 10 | 0.076 | 0 |
| attach-host-missing | 8 | 0.061 | 6 | 0 | 0 | 2 |
| containment | 6 | 0.045 | 6 | 0 | 0 | 6 |
| constraint-avoid | 4 | 0.03 | 2 | 0 | 0 | 0 |
| path-order | 2 | 0.015 | 2 | 0 | 0 | 2 |
| unknown-product | 2 | 0.015 | 2 | 0 | 0 | 0 |
| constraint-replaced | 0 | 0 | 0 | 4 | 0.03 | 0 |

Severity before repair {"warn":25,"error":23,"info":11}, after {"info":13,"warn":10,"error":3}. Unknown products: 2 (avoid x2). Product strings that were not catalog ids: 0 (none).

## Latency (main stream)

| measure | n | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| first token (answering attempt) | 132 | 1.12 s | 1.54 s | 1.98 s |
| first token as waited for (failed attempts included) | 132 | 1.12 s | 1.54 s | 1.98 s |
| first say | 132 | 1.44 s | 1.91 s | 2.32 s |
| first op | 132 | 1.88 s | 2.46 s | 2.81 s |
| first node | 123 | 3.71 s | 4.83 s | 5.36 s |
| stream total (all turns) | 132 | 8.41 s | 19.1 s | 24.5 s |
| stream total, new diagrams | 126 | 10.6 s | 19.1 s | 24.5 s |
| stream total, edits | 63 | 5.03 s | 8.12 s | 10.9 s |
| stream total, product answers | 6 | 4.02 s | 4.80 s | 4.93 s |
| whole turn incl. retries and follow-up | 132 | 11.1 s | 19.1 s | 24.5 s |

## Tokens and cost

| measure | value |
| --- | ---: |
| prompt tokens | 1881612 |
| cached prompt tokens | 1761280 (94%) |
| completion tokens | 67434 |
| completion tokens per turn p50 / p95 | 515 / 952 |
| cost per turn mean / p95 | $0.0082 / $0.0137 |
| cost per conversation mean / p95 | $0.0145 / $0.0242 |
| total | $1.09 |

## Reliability

| counter | value |
| --- | ---: |
| turns | 132 |
| main stream ended without done (truncated) | 0 |
| continuation turns | 0 |
| repair turns | 10 |
| hedged turns / hedge won | 0 / 0 |
| turns that used the fallback model | 0 |
| extra attempts after failures | 0 |
| conversations with an API failure | 0 |
| bad (unparseable) lines | 0 |
| \u escapes | 0 |

## Failover to the fallback model

0 of 132 turns (0%) failed over in the main stream; reasons {}. Follow-up turns that ran on another model: 0.

## Cut-off turns

Main streams that ended without done: 0 ({}). Rescued by the continuation turn: 0 (0 of them pass every assertion); not rescued: 0. Turn pass rate without the rescued turns: 92%.

## Constraint compliance (machine-checked)

| check | passed | rate |
| --- | ---: | ---: |
| residency (final graph and final narration, core checker) | 57/60 | 95% |
| residency, independent scan (own place table and cue words; shares no code with the checker) | 54/60 | 90% |
| pinned constraints as data (req regions / avoid) | 45/45 | 100% |
| avoided products absent (exclude and retained exclude) | 45/45 | 100% |

Residency checks with a warn-level foreign-region mention (not failed, reviewed by hand): 8. Residency checks where the product's repair turn corrected the main-stream narration: 6. Turns with pinned constraints in memory: 91. Product constraint findings before repair {"constraint-region":{"total":25,"turns":12,"error":12},"constraint-avoid":{"total":4,"turns":2,"error":4}}, left after repair {"constraint-region":{"total":12,"turns":9,"error":3}}.

Independent residency scan hits (read each one: it errs towards flagging):

| case | run | turn | scan finding |
| --- | ---: | ---: | ---: |
| ho-p1-residency-japan | 1 | 2 | say : Singapore in "Moved the analytics dashboard into a Tokyo VPC so all policyholder data stays i…" |
| ho-p1-ko-residency | 1 | 2 | say : 유럽 in "이전 답변에서 제안한 유럽 리전 에셋 복제는 개인정보보호법 요건에 따라 제거합니다"; say : 유럽 in "유럽 리전 복제를 제거하고, ESA 엣지 가속만으로 지연 시간을 줄이며 모든 데이터를 서울 리전에 유지하도록 수정했습니다" |
| ho-r-eu-bloc | 1 | 2 | say : US in "the US parent connects over the public internet to the London replica instead" |
| ho-r-eu-bloc | 2 | 2 | say db-replica: US in "Read-only replica in Frankfurt for US parent reporting via secure access" |
| ho-p1-residency-japan | 3 | 2 | say : Singapore in "Replicating the claims DB to Singapore violates this, so I cannot draw that" |
| ho-r-eu-bloc | 3 | 2 | say : US in "the reporting replica is local, not synced to any US region" |

| case | run | turn | residency finding |
| --- | ---: | ---: | ---: |
| ho-p1-ko-residency | 1 | 2 | a say line pairs Frankfurt (eu-central-1), London (eu-west-1), Paris (eu-west-2), Amsterdam (eu-west-3) with "복제": "이전 답변에서 제안한 유럽 리전 에셋 복제는 개인정보보호법 요건에 따라 제거합니다"; the pinned regions are Seoul (ap-northeast-2) ("eval res |
| ho-r-eu-bloc | 1 | 2 | a say line pairs Virginia (us-east-1), Silicon Valley (us-west-1) with "replica": "the US parent connects over the public internet to the London replica instead"; the pinned regions are Frankfurt (eu-central-1), London ( |
| ho-r-eu-bloc | 2 | 2 | the why of 'db-replica' says "Read-only replica in Frankfurt for US parent reporting via secure access" (replica to Virginia (us-east-1), Silicon Valley (us-west-1)); the pinned regions are Frankfurt (eu-central-1), Lond |

## Repairs

| deterministic fix | fixes | turns |
| --- | ---: | ---: |
| containment | 6 | 6 |
| attach-invalid | 6 | 4 |
| attach-host-missing | 2 | 2 |
| path-order | 2 | 2 |

LLM follow-up turns: 10 ({"repair":10}); turns by finding code {"constraint-region":8,"constraint-avoid":2,"orphan-node":1}.

| case | run | turn | kind | turn passes | findings |
| --- | ---: | ---: | ---: | ---: | ---: |
| ho-p1-residency-japan | 1 | 2 | repair | no | constraint-region/error: region group 'sg' (Singapore (ap-southeast-1)) is in Singapore (ap-southeast-1) and holds dashboard; the pinned regions are Tokyo (ap-northeast-1) ("All policyholder data must remain physically w; constraint-region/error: the why of 'c |
| ho-p1-ko-residency | 1 | 2 | repair | no | constraint-region/error: region group 'frankfurt' (Frankfurt (eu-central-1)) is in Frankfurt (eu-central-1) and holds assets-eu; the pinned regions are Seoul (ap-northeast-2) ("이용자 개인정보는 반드시 서울 리전에 보관, 해외 반출 금지"); constraint-region/warn: a say line names Frank |
| ho-r-zh-no-crossregion | 1 | 2 | repair | yes | constraint-region/error: a say line sends data to another region ("备份"): "异地备份也只能放在新加坡区域内"; the pinned regions are Singapore (ap-southeast-1) ("客户数据必须留在新加坡"). Correct the narration and keep data in the pinned region |
| ho-r-eu-bloc | 1 | 2 | repair | no | constraint-region/error: the why of 'ga' says "Gives US parent fast private access to the EU replica" (replica to Virginia (us-east-1), Silicon Valley (us-west-1)); the pinned regions are Frankfurt (eu-central-1), London; constraint-region/warn: a say line nam |
| ho-r-zh-no-crossregion | 2 | 2 | repair | yes | constraint-region/error: a say line sends data to another region ("备份"): "因此异地备份也只能放在新加坡区域内"; the pinned regions are Singapore (ap-southeast-1) ("客户数据必须留在新加坡"). Correct the narration and keep data in the pinned region |
| ho-r-k8s-lifted | 2 | 2 | repair | no | constraint-avoid/error: 'ack' uses ack, which the user ruled out ("No Kubernetes skills, keep design free of Kubernetes"); replace or remove it; constraint-avoid/error: 'api' uses ack, which the user ruled out ("No Kubernetes skills, keep design free of Kubern |
| ho-r-eu-bloc | 2 | 2 | repair | no | constraint-region/error: the why of 'db-replica' says "Read-only replica in Frankfurt for US parent reporting" (replica to Virginia (us-east-1), Silicon Valley (us-west-1)); the pinned regions are Frankfurt (eu-central-1; constraint-region/warn: a say line nam |
| ho-r-k8s-lifted | 3 | 2 | repair | no | constraint-avoid/error: 'cluster' uses ack, which the user ruled out ("Keep the design completely free of Kubernetes"); replace or remove it |
| ho-p1-zh-residency | 3 | 2 | repair | yes | orphan-node/warn: 'firewall' (cloud-firewall) has no connections; constraint-region/error: the why of 'oss-dr' says "跨区域冗余存储合规文件" (存储 to another region); the pinned regions are Hong Kong (cn-hongkong) ("所有客户数据必须留在香港境内，不能出境") |
| ho-r-eu-bloc | 3 | 2 | repair | no | constraint-region/warn: a say line names Virginia (us-east-1): "I cannot place a database copy in Virginia"; the pinned regions are Frankfurt (eu-central-1), London (eu-west-1), Paris (eu-west-2) ("All personal data must; constraint-region/error: a say line pa |

## Languages

| language | turns | completion tokens / turn | vs English twin | prompt tokens / turn | say in language | why in language | \u escapes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 96 | 519 | - | 14023 | 96/96 | 0/0 | 0 |
| ko | 21 | 457 | - | 13916 | 21/21 | 20/20 | 0 |
| zh | 15 | 538 | - | 16211 | 15/15 | 14/14 | 0 |

## Multi-turn retention

| case | turns | retention checks passed per turn | run pass |
| --- | ---: | ---: | ---: |
| ho-p1-residency-japan | 3 | 6/6  9/9  6/6 | 33% |
| ho-p1-avoid-es | 2 | 3/3  3/3 | 100% |
| ho-p1-avoid-fc-tempt | 2 | 3/3  3/3 | 100% |
| ho-p1-ko-residency | 2 | 6/6  8/9 | 67% |
| ho-p1-zh-residency | 2 | 6/6  9/9 | 100% |
| ho-r-relax-tokyo | 2 | 6/6  3/3 | 100% |
| ho-r-k8s-lifted | 2 | 3/3  0/0 | 33% |
| ho-r-ko-dr-in-country | 2 | 6/6  6/6 | 100% |
| ho-r-zh-no-crossregion | 2 | 6/6  3/3 | 100% |
| ho-r-ko-avoid-mesh | 2 | 3/3  3/3 | 100% |
| ho-r-malaysia-two | 2 | 6/6  3/3 | 100% |
| ho-r-eu-bloc | 2 | 6/6  1/3 | 0% |
| ho-residency-korea | 3 | 6/6  9/9  9/9 | 100% |
| ho-scale-sae | 2 | 0/0  6/6 | 100% |
| ho-scale-ecs-ok | 2 | 0/0  6/6 | 100% |
| ho-budget-ha | 3 | 3/3  3/3  6/6 | 100% |

## Judge (kimi-k3)

| measure | value |
| --- | ---: |
| runs judged / judge errors | 25 / 0 |
| completeness | 4.72 |
| accuracy | 4.32 |
| rationality | 4.12 |
| readability | 4.48 |
| overall | 4.41 |
| architect would sign off | 84% |
| judge cost | $0.507 |

| category | judged | overall score | sign-off |
| --- | ---: | ---: | ---: |
| multiturn | 11 | 4.182 | 64% |
| pattern | 4 | 4.313 | 100% |
| i18n | 7 | 4.679 | 100% |
| need | 2 | 4.625 | 100% |
| trap | 1 | 5 | 100% |

Every run of the constraint cases: 48 runs judged, sign-off 81%, mean 4.323. (Total judged runs: 57.)

| case | run | judge defects |
| --- | ---: | ---: |
| ho-budget-ha | 1 | NAT Gateway is added as a resilience fix, but the design does not explain why outbound NAT is needed for FC-to-RDS or how it prevents the prior outage.; CloudMonitor edges are drawn from app nodes to monitoring, but moni |
| ho-budget-ha | 3 | GTM failover has no second region or standby to fail over to, making it a needless part that conflicts with the budget constraint; Comments stored in a separate RDS instance while the Posts DB why-text already claims it  |
| ho-r-k8s-lifted | 1 | api and workers use product ecs ('pods on ACK nodes' is contradictory); they should be workloads of the ACK cluster, not separate ECS instances; cluster->api/workers edges are a workaround for the wrong product choice; A |
| ho-r-k8s-lifted | 2 | API and workers remain on SAE instead of moving to ACK/ACS as the user requested in turn 2.; Narration is self-contradictory: announces the move to ACK, then reverts to SAE citing a constraint the user just lifted.; Miss |
| ho-r-k8s-lifted | 3 | api node remains sae instead of ACK/ACS after the user allowed Kubernetes; worker node remains sae instead of ACK/ACS; Narration treats the lifted Kubernetes ban as still in force ('ACK is still blocked'), ignoring the l |
| ho-r-malaysia-two | 1 | db-replica is placed in the same Kuala Lumpur VPC/region, so a region-level failure takes out both primary and standby; cross-region DR to Johor (ap-southeast-8) is allowed under the residency pin and is the expected des |
| ho-r-malaysia-two | 2 | db-dr is in the same Kuala Lumpur region/VPC; a regional failure takes out both primary and replica; Cross-zone RDS standby is an HA feature, not DR; async cross-region replication to Johor (ap-southeast-8) would satisfy |
| ho-r-malaysia-two | 3 | db-standby placed in the same Kuala Lumpur VPC; true DR should replicate to Johor (ap-southeast-8), which is permitted under the Malaysia residency pin; Primary RDS is already multi-zone (zones a,b) with HA standby, so t |
| ho-scale-ecs-ok | 1 | Two independent Auto Scaling groups (scale1 on web1, scale2 on web2) instead of a single scaling group spanning the web tier across zones a and b.; Narration says 'scale out on weekends' but no scaling rule type (schedul |

Agreement between the judged run's assertions and the judge's sign-off: 17/25 (68%). Assertions pass and judge yes 17, both no 0, assertions pass but judge no 4, assertions fail but judge yes 4. Mean score of passing runs 4.44, failing runs 4.25, point-biserial r 0.153.

| case | assertions | judge | failed assertions | judge defects |
| --- | ---: | ---: | ---: | ---: |
| ho-p1-residency-japan | fail | yes | residency scan ap-northeast-1 | Model Studio agent apps and knowledge base are closed to new international accounts per catalog, though basic Qwen API access should still work; Narration mentions Cloud Enterprise Network for Singapo |
| ho-p1-vpc-mongo | fail | yes | every attachment names a valid host | Express Connect is a vpc-edge/boundary service; placing the node inside the VPC is a minor placement inaccuracy; PrivateZone is a badge on the VPC per catalog, not a standalone regional node; Narratio |
| ho-p1-ko-residency | fail | yes | residency ap-northeast-2; residency scan ap-northeast-2; no error-level warnings after repair | 내레이션에서 '프랑크푸르트 OSS 에셋 복제 권장'과 '이전 답변의 유럽 에셋 복제 제거'가 모순되어 혼란을 줄 수 있음; 유럽 유저 지연 대응으로 ESA 외 구체적 개선 조치(예: 동적 가속 설명)가 다소 추상적 |
| ho-r-k8s-lifted | pass | no |  | api and workers use product ecs ('pods on ACK nodes' is contradictory); they should be workloads of the ACK cluster, not separate ECS instances; cluster->api/workers edges are a workaround for the wro |
| ho-r-malaysia-two | pass | no |  | db-replica is placed in the same Kuala Lumpur VPC/region, so a region-level failure takes out both primary and standby; cross-region DR to Johor (ap-southeast-8) is allowed under the residency pin and |
| ho-r-eu-bloc | fail | yes | residency eu-central-1/eu-west-1/eu-west-2; residency scan eu-central-1/eu-west-1/eu-west-2; no error-level warnings after repair | Narration references GA (Global Accelerator) which is not in the catalog and not drawn in the diagram; Read replica exposed via public EIP/NLB instead of a private connectivity option (e.g., CEN/VPN); |
| ho-scale-ecs-ok | pass | no |  | Two independent Auto Scaling groups (scale1 on web1, scale2 on web2) instead of a single scaling group spanning the web tier across zones a and b.; Narration says 'scale out on weekends' but no scalin |
| ho-budget-ha | pass | no |  | NAT Gateway is added as a resilience fix, but the design does not explain why outbound NAT is needed for FC-to-RDS or how it prevents the prior outage.; CloudMonitor edges are drawn from app nodes to  |
