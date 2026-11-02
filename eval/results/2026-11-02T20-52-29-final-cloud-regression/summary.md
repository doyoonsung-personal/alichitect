# Evaluation summary

Model qwen3.8-max (fallback qwen3.7-max), catalog 2026-10-31 (232 entries), system prompt 59906 chars (sha256 998fab223dab), 3 runs per case, started 2026-11-02T20:52:29.751Z.

## Overall

**pass@1 96%, all 3 runs pass 92%** (109 cases). pass@3 is best-of-3 and is listed last.

| measure | value |
| --- | ---: |
| cases / conversations / turns | 109 / 327 / 423 |
| pass@1 (mean case pass rate) | 96% |
| all runs pass | 92% |
| majority (over half the runs pass) | 98% |
| pass@3 (some run passes) | 99% |
| conversations passing every assertion | 96% |
| turns passing every assertion | 97% |
| assertions passing (4802 checks) | 100% |
| conversations that hit an API failure | 0 |
| list-price cost of the model runs | $3.43 |

## By category

| category | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pattern | 22 | 66 | 100% | 100% | 100% | 100% |
| need | 20 | 60 | 97% | 90% | 100% | 100% |
| trap | 18 | 54 | 98% | 94% | 100% | 100% |
| edit | 9 | 27 | 100% | 100% | 100% | 100% |
| multiturn | 12 | 36 | 89% | 83% | 92% | 92% |
| adversarial | 5 | 15 | 100% | 100% | 100% | 100% |
| i18n | 23 | 69 | 93% | 83% | 96% | 100% |

## By language

| language | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 86 | 258 | 97% | 94% | 99% | 99% |
| ko | 13 | 39 | 97% | 92% | 100% | 100% |
| zh | 10 | 30 | 87% | 70% | 90% | 100% |

## By assertion type (worst first)

| type | checks | passed | rate | cases that failed it |
| --- | ---: | ---: | ---: | ---: |
| residencyScan | 51 | 48 | 94% | 1 |
| askLang | 52 | 50 | 96% | 2 |
| primaryRec | 54 | 53 | 98% | 1 |
| exclude | 171 | 169 | 99% | 1 |
| editMinimal | 87 | 86 | 99% | 1 |
| include | 513 | 508 | 99% | 3 |
| format | 423 | 422 | 100% | 1 |
| noErrors | 423 | 423 | 100% | 0 |
| pathOrder | 353 | 353 | 100% | 0 |
| attachValid | 423 | 423 | 100% | 0 |
| escapes | 423 | 423 | 100% | 0 |
| noPrices | 423 | 423 | 100% | 0 |
| sayLang | 423 | 423 | 100% | 0 |
| size | 171 | 171 | 100% | 0 |
| region | 108 | 108 | 100% | 0 |
| zones | 27 | 27 | 100% | 0 |
| notMention | 15 | 15 | 100% | 0 |
| question | 3 | 3 | 100% | 0 |
| attach | 18 | 18 | 100% | 0 |
| noWarn | 54 | 54 | 100% | 0 |
| mention | 24 | 24 | 100% | 0 |
| restore | 3 | 3 | 100% | 0 |
| req | 51 | 51 | 100% | 0 |
| retention | 159 | 159 | 100% | 0 |
| residency | 51 | 51 | 100% | 0 |
| whyLang | 86 | 86 | 100% | 0 |
| pins | 24 | 24 | 100% | 0 |
| placement | 9 | 9 | 100% | 0 |
| linked | 21 | 21 | 100% | 0 |
| gpu | 12 | 12 | 100% | 0 |
| asks | 42 | 42 | 100% | 0 |
| askOptions | 39 | 39 | 100% | 0 |
| reask | 24 | 24 | 100% | 0 |
| assumes | 9 | 9 | 100% | 0 |
| scope | 30 | 30 | 100% | 0 |
| chips | 3 | 3 | 100% | 0 |

## Cases below 100% (9 of 109)

| case | runs passed | what failed |
| --- | ---: | ---: |
| ai-07-training-residency | 0/3 | exclude agentloop (2); residency scan ap-southeast-1 (3) |
| zh-pat-04-rag | 1/3 | include fc/sae/ack/acs/ecs/agentcore/agentrun (1); include milvus/opensearch/elasticsearch/analyticdb/dashvector/lindorm/polardb (1) |
| need-06-cs-chatbot | 2/3 | include fc/sae/ack/acs/ecs/agentcore/agentrun (1) |
| need-08-contractor-desktops | 2/3 | primary rec eds (1) |
| trap-06-model-studio-apps | 2/3 | NDJSON only, ends with done (1) |
| ko-pat-04-rag | 2/3 | include model-studio (1); include fc/sae/ack/acs/ecs/agentcore/agentrun (1) |
| zh-need-01-dev-team | 2/3 | ask text in zh (1) |
| zh-trap-01-lingma | 2/3 | ask text in zh (1) |
| mt-05-mixed-five-turns | 2/3 | edit {"minChanged":1} (1) |

## Warnings before and after deterministic repair

| code | before: total | per turn | turns | after: total | per turn | fixed by repair |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| orphan-node | 70 | 0.165 | 67 | 69 | 0.163 | 0 |
| containment | 53 | 0.125 | 32 | 0 | 0 | 53 |
| unknown-id | 17 | 0.04 | 8 | 0 | 0 | 0 |
| constraint-region | 14 | 0.033 | 8 | 14 | 0.033 | 0 |
| attach-host-missing | 8 | 0.019 | 8 | 0 | 0 | 0 |
| bad-op | 6 | 0.014 | 6 | 0 | 0 | 0 |
| missing-group | 5 | 0.012 | 5 | 0 | 0 | 4 |
| path-order | 5 | 0.012 | 5 | 2 | 0.005 | 3 |
| china-only | 2 | 0.005 | 1 | 1 | 0.002 | 0 |
| bad-json | 1 | 0.002 | 1 | 1 | 0.002 | 0 |

Severity before repair {"info":79,"warn":66,"error":36}, after {"info":56,"warn":31}. Unknown products: 0 (none). Product strings that were not catalog ids: 0 (none).

## Latency (main stream)

| measure | n | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| first token (answering attempt) | 423 | 1.17 s | 1.68 s | 2.30 s |
| first token as waited for (failed attempts included) | 423 | 1.17 s | 1.68 s | 2.30 s |
| first say | 423 | 1.44 s | 1.98 s | 3.50 s |
| first op | 423 | 1.88 s | 2.47 s | 3.86 s |
| first node | 343 | 4.00 s | 5.42 s | 6.54 s |
| stream total (all turns) | 423 | 9.07 s | 23.0 s | 32.7 s |
| stream total, new diagrams | 353 | 12.7 s | 23.8 s | 32.7 s |
| stream total, edits | 132 | 4.88 s | 11.7 s | 18.2 s |
| stream total, product answers | 56 | 3.84 s | 5.05 s | 6.96 s |
| whole turn incl. retries and follow-up | 423 | 9.27 s | 23.0 s | 32.7 s |

## Tokens and cost

| measure | value |
| --- | ---: |
| prompt tokens | 6628674 |
| cached prompt tokens | 6440960 (97%) |
| completion tokens | 240349 |
| completion tokens per turn p50 / p95 | 438 / 1313 |
| cost per turn mean / p95 | $0.0081 / $0.0119 |
| cost per conversation mean / p95 | $0.0105 / $0.0311 |
| total | $3.43 |

## Reliability

| counter | value |
| --- | ---: |
| turns | 423 |
| main stream ended without done (truncated) | 0 |
| continuation turns | 0 |
| repair turns | 0 |
| hedged turns / hedge won | 0 / 0 |
| turns that used the fallback model | 0 |
| extra attempts after failures | 0 |
| conversations with an API failure | 0 |
| bad (unparseable) lines | 1 |
| \u escapes | 0 |

## Failover to the fallback model

0 of 423 turns (0%) failed over in the main stream; reasons {}. Follow-up turns that ran on another model: 0.

## Cut-off turns

Main streams that ended without done: 0 ({}). Rescued by the continuation turn: 0 (0 of them pass every assertion); not rescued: 0. Turn pass rate without the rescued turns: 97%.

## Constraint compliance (machine-checked)

| check | passed | rate |
| --- | ---: | ---: |
| residency (final graph and final narration, core checker) | 51/51 | 100% |
| residency, independent scan (own place table and cue words; shares no code with the checker) | 48/51 | 94% |
| pinned constraints as data (req regions / avoid) | 24/24 | 100% |
| avoided products absent (exclude and retained exclude) | 205/207 | 99% |

Residency checks with a warn-level foreign-region mention (not failed, reviewed by hand): 4. Residency checks where the product's repair turn corrected the main-stream narration: 0. Turns with pinned constraints in memory: 131. Product constraint findings before repair {"constraint-region":{"total":14,"turns":8,"error":0}}, left after repair {"constraint-region":{"total":14,"turns":8,"error":0}}.

Independent residency scan hits (read each one: it errs towards flagging):

| case | run | turn | scan finding |
| --- | ---: | ---: | ---: |
| ai-07-training-residency | 1 | 2 | say eval: Hong Kong in "Traces inference and runs LLM judges on answers (Hong Kong only)"; say : Hong Kong in "It runs only in Hong Kong, so traces leave Singapore" |
| ai-07-training-residency | 2 | 2 | say : Hong Kong in "LLM answer quality scoring and evaluation judges: AgentLoop runs only in Hong K…" |
| ai-07-training-residency | 3 | 2 | say : Hong Kong in "Agent observability and evaluation service in Singapore: AgentLoop runs only in…" |

## Repairs

| deterministic fix | fixes | turns |
| --- | ---: | ---: |
| containment | 53 | 33 |
| attach-invalid | 8 | 8 |
| missing-group | 4 | 4 |
| path-order | 3 | 3 |

LLM follow-up turns: 0 ({}); turns by finding code {}.

## Languages

| language | turns | completion tokens / turn | vs English twin | prompt tokens / turn | say in language | why in language | \u escapes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 336 | 545 | - | 15670 | 336/336 | 0/0 | 0 |
| ko | 48 | 671 | 1.082 | 15646 | 48/48 | 47/47 | 0 |
| zh | 39 | 638 | 1.149 | 15705 | 39/39 | 39/39 | 0 |

## Multi-turn retention

| case | turns | retention checks passed per turn | run pass |
| --- | ---: | ---: | ---: |
| edit-06-restore | 2 | 0/0  0/0 | 100% |
| mt-01-avoid-k8s | 4 | 3/3  3/3  6/6  6/6 | 100% |
| mt-02-serverless-first | 3 | 3/3  3/3  6/6 | 100% |
| mt-03-data-in-singapore | 4 | 6/6  9/9  6/6  6/6 | 100% |
| mt-04-budget | 3 | 3/3  6/6  3/3 | 100% |
| ko-mt-01-avoid-k8s | 3 | 3/3  3/3  6/6 | 100% |
| zh-mt-01-avoid-k8s | 3 | 3/3  3/3  6/6 | 100% |
| mt-05-mixed-five-turns | 5 | 6/6  9/9  9/9  9/9  9/9 | 67% |
| mt-06-summary-window | 5 | 9/9  9/9  9/9  9/9  15/15 | 100% |
| p1-req-residency-my | 2 | 6/6  9/9 | 100% |
| p1-req-avoid-fc | 2 | 3/3  3/3 | 100% |
| p1-avoid-tempted-k8s | 3 | 3/3  3/3  6/6 | 100% |
| p1-ko-residency | 2 | 3/3  6/6 | 100% |
| p1-zh-residency | 2 | 6/6  9/9 | 100% |
| ai-07-training-residency | 2 | 6/6  9/9 | 0% |
| as-04-answer-vague | 2 | 0/0  0/0 | 100% |
| as-05-flip-internal | 2 | 0/0  3/3 | 100% |

## Judge (kimi-k3)

| measure | value |
| --- | ---: |
| runs judged / judge errors | 109 / 0 |
| completeness | 4.413 |
| accuracy | 4.349 |
| rationality | 4.22 |
| readability | 4.394 |
| overall | 4.344 |
| architect would sign off | 91% |
| judge cost | $1.283 |

| category | judged | overall score | sign-off |
| --- | ---: | ---: | ---: |
| pattern | 22 | 4.136 | 86% |
| need | 20 | 4.288 | 95% |
| trap | 18 | 4.417 | 100% |
| edit | 9 | 4.528 | 78% |
| multiturn | 12 | 4.229 | 75% |
| adversarial | 5 | 4.8 | 100% |
| i18n | 23 | 4.424 | 96% |

Every run of the constraint cases: 45 runs judged, sign-off 78%, mean 4.15. (Total judged runs: 139.)

| case | run | judge defects |
| --- | ---: | ---: |
| ai-07-training-residency | 1 | eval node placed in sg region group despite AgentLoop being documented as Hangzhou/Shanghai/Hong Kong (Singapore only for a multimodal evaluator feature, unconfirmed); Adding AgentLoop conflicts with the pinned 'training |
| ai-07-training-residency | 3 | Narration says 'AgentLoop for answer quality evaluation, both staying in Singapore' — false per catalog (Hong Kong only internationally; Singapore only in multimodal evaluator docs, unconfirmed).; AgentLoop listed as pri |
| as-05-flip-internal | 1 | users node in internet group and users->dns resolve edge retained after flipping to internal only; Cloud DNS (public authoritative DNS) still in the diagram though no public domain remains; WAF badge on ALB is pointless  |
| as-05-flip-internal | 2 | users node still in internet group with dns resolve edge; public-facing path should be gone or relabeled as internal staff; Cloud DNS (public authoritative DNS) retained for an internal-only app; private DNS or no DNS ho |
| as-05-flip-internal | 3 | users->dns (resolve) edge and Cloud DNS node kept though the public domain/ESA are gone; internal store should use private DNS (e.g., PrivateZone) or direct VPN addressing; 'Shoppers' users node still sits in the Interne |
| mt-04-budget | 1 | Database (RDS) left single-zone with no HA edition or note about cost impact, contradicting the 'make it highly available' request; Search index (Elasticsearch) single node is an unaddressed single point of failure in th |
| mt-04-budget | 3 | Turn 3 adds NAT Gateway + EIP for HA, but NAT is outbound-only and does not improve availability of the user-facing path; it adds cost without serving the stated HA goal.; Cumulative cost (ALB, 2x ECS, multi-zone RDS, mu |
| mt-06-summary-window | 2 | GTM used for zone-level failover within one region; it is designed for cross-region traffic steering, and with everything in Jakarta it adds no real DR value.; Narration promises a zone-C RDS standby and cross-zone OSS r |
| p1-avoid-tempted-k8s | 2 | MSE drawn as an inline routing hop (api -> mesh -> workers) is wrong: MSE Nacos/governance is a control plane; services discover each other and call directly.; mesh -> workers edge implies API routes to workers through t |
| p1-ko-residency | 2 | ESA(글로벌 엣지) 사용 시 고객 데이터가 해외 엣지 노드를 경유/캐싱될 수 있으나 레지던시 준수 방안(캐시 비활성화, 한국 PoP 제한 등) 설명 부재; RDS/Tair가 이미 zones a,b 다중 AZ 이중화인데 별도 DR 복제 DB/캐시 노드를 추가해 중복이며, DR 노드에 가용영역 지정이 없음; storage -> storage-dr 엣지 레이블 'CRR'(Cross-Region  |

Agreement between the judged run's assertions and the judge's sign-off: 94/109 (86%). Assertions pass and judge yes 93, both no 1, assertions pass but judge no 9, assertions fail but judge yes 6. Mean score of passing runs 4.368, failing runs 4, point-biserial r 0.182.

| case | assertions | judge | failed assertions | judge defects |
| --- | ---: | ---: | ---: | ---: |
| pat-08-global | pass | no |  | GTM node is orphaned: no edge from GTM to GA or to the regional ALBs/ESA endpoints, so 'automatic failover between regions' is not realised in the diagram.; Two parallel entry paths (users->dns->gtm a |
| pat-12-ecommerce-security | pass | no |  | ESA and Anti-DDoS Proxy chained in series (esa->ddos->alb) is redundant: ESA includes DDoS defense; Anti-DDoS Proxy should be an alternative or front the origin directly, not sit behind ESA; Captcha a |
| need-06-cs-chatbot | fail | yes | include fc/sae/ack/acs/ecs/agentcore/agentrun | DNS edge from users suggests it's on the data path (should be resolve-only, not a hop); NAT edge direction ambiguous (control vs data path for Model Studio calls); No explicit AI Guardrails mentioned  |
| need-08-contractor-desktops | fail | yes | primary rec eds | Guidance suggests a fixed egress IP and audit/policy controls; narration does not mention EDS policies, audit, or egress control, which matter for 'data never leaves our cloud'.; CEN (the catalog-note |
| need-12-qwen-api | pass | no |  | No mention of keeping the API key on the server / KMS; No mention of optional AI Gateway for key management, throttling, observability; No diagram node or connection shown for a simple backend-to-Mode |
| edit-07-multi-region-dr | pass | no |  | GTM -> dns 'resolve' edge is wrong: DNS is never a hop in the data path and GTM itself is the DNS-based steering layer; chaining GTM to Cloud DNS is not a real resolution flow.; ESA origin remains onl |
| edit-08-cheaper | pass | no |  | Adds a separate CDN node for images while ESA already caches and serves images near shoppers — paying for two edge/CDN services for the same content contradicts the cost goal; WAF badge kept on ALB ev |
| mt-04-budget | pass | no |  | Database (RDS) left single-zone with no HA edition or note about cost impact, contradicting the 'make it highly available' request; Search index (Elasticsearch) single node is an unaddressed single po |
| ko-need-02-whole-company | pass | no |  | QwenWork 프리뷰 상태 및 지원 언어(영어/중국어) 제한을 한국어 전사 도입 맥락에서 고지하지 않음; DingTalk 국제판의 QwenWork 연동·AI 기능이 미확정(low confidence)임에도 확정적 표현 사용; 전사 도입 시 중요한 SSO/전용 VPC(프리미엄) 옵션 언급 없음 |
| zh-pat-04-rag | fail | yes | include fc/sae/ack/acs/ecs/agentcore/agentrun | users node sits in an 'internet' external group and connects straight to the EAS RAG service with no load balancer or gateway hop, despite this being an internal assistant; Model Studio alternative is |
| zh-need-01-dev-team | fail | yes | ask text in zh | Token Plan 仅限新加坡，未向用户说明区域限制; 未提及 Qoder Enterprise 作为治理需求更高时的选项 |
| zh-trap-01-lingma | fail | yes | ask text in zh | 未明确说明 Qoder CN 仅限中国、国际用户应使用 Qoder; Token Plan 与 Qoder Teams 的关系可再清晰一些 |
| mt-05-mixed-five-turns | fail | yes | edit {"minChanged":1} | Turn 2 narration says 'drop HTTPDNS' but HTTPDNS was never in the diagram, a confusing reference.; Flink is a relatively expensive addition for a $500/month budget; the narration acknowledges cost but |
| p1-path-ddos-esa | pass | no |  | Order of Anti-DDoS Proxy and ESA is inconsistent between narration (DDoS first) and final edges (ESA first); the correct pattern per guidance is ESA -> Anti-DDoS Proxy, and the narration misleads by a |
| as-05-flip-internal | pass | no |  | users node in internet group and users->dns resolve edge retained after flipping to internal only; Cloud DNS (public authoritative DNS) still in the diagram though no public domain remains; WAF badge  |
