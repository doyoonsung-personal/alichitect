# Evaluation summary

Model qwen3.8-max (fallback qwen3.7-max), catalog 2026-10-31 (232 entries), system prompt 59701 chars (sha256 fabd6cb8f349), 3 runs per case, started 2026-10-31T17:22:27.871Z.

## Overall

**pass@1 97%, all 3 runs pass 95%** (109 cases). pass@3 is best-of-3 and is listed last.

| measure | value |
| --- | ---: |
| cases / conversations / turns | 109 / 327 / 423 |
| pass@1 (mean case pass rate) | 97% |
| all runs pass | 95% |
| majority (over half the runs pass) | 97% |
| pass@3 (some run passes) | 99% |
| conversations passing every assertion | 97% |
| turns passing every assertion | 98% |
| assertions passing (4804 checks) | 100% |
| conversations that hit an API failure | 0 |
| list-price cost of the model runs | $3.90 |

## By category

| category | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pattern | 22 | 66 | 99% | 96% | 100% | 100% |
| need | 20 | 60 | 90% | 80% | 90% | 100% |
| trap | 18 | 54 | 100% | 100% | 100% | 100% |
| edit | 9 | 27 | 100% | 100% | 100% | 100% |
| multiturn | 12 | 36 | 92% | 92% | 92% | 92% |
| adversarial | 5 | 15 | 100% | 100% | 100% | 100% |
| i18n | 23 | 69 | 100% | 100% | 100% | 100% |

## By language

| language | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 86 | 258 | 96% | 93% | 97% | 99% |
| ko | 13 | 39 | 100% | 100% | 100% | 100% |
| zh | 10 | 30 | 100% | 100% | 100% | 100% |

## By assertion type (worst first)

| type | checks | passed | rate | cases that failed it |
| --- | ---: | ---: | ---: | ---: |
| reask | 24 | 23 | 96% | 1 |
| primaryRec | 54 | 52 | 96% | 1 |
| residencyScan | 51 | 50 | 98% | 1 |
| exclude | 171 | 168 | 98% | 1 |
| region | 108 | 107 | 99% | 1 |
| include | 513 | 511 | 100% | 1 |
| format | 423 | 422 | 100% | 1 |
| noErrors | 423 | 423 | 100% | 0 |
| pathOrder | 354 | 354 | 100% | 0 |
| attachValid | 423 | 423 | 100% | 0 |
| escapes | 423 | 423 | 100% | 0 |
| noPrices | 423 | 423 | 100% | 0 |
| sayLang | 423 | 423 | 100% | 0 |
| size | 171 | 171 | 100% | 0 |
| zones | 27 | 27 | 100% | 0 |
| attach | 18 | 18 | 100% | 0 |
| notMention | 15 | 15 | 100% | 0 |
| question | 3 | 3 | 100% | 0 |
| noWarn | 54 | 54 | 100% | 0 |
| mention | 24 | 24 | 100% | 0 |
| editMinimal | 87 | 87 | 100% | 0 |
| restore | 3 | 3 | 100% | 0 |
| req | 51 | 51 | 100% | 0 |
| retention | 159 | 159 | 100% | 0 |
| residency | 51 | 51 | 100% | 0 |
| whyLang | 86 | 86 | 100% | 0 |
| askLang | 53 | 53 | 100% | 0 |
| pins | 24 | 24 | 100% | 0 |
| linked | 21 | 21 | 100% | 0 |
| placement | 9 | 9 | 100% | 0 |
| gpu | 12 | 12 | 100% | 0 |
| asks | 42 | 42 | 100% | 0 |
| askOptions | 39 | 39 | 100% | 0 |
| assumes | 9 | 9 | 100% | 0 |
| scope | 30 | 30 | 100% | 0 |
| chips | 3 | 3 | 100% | 0 |

## Cases below 100% (6 of 109)

| case | runs passed | what failed |
| --- | ---: | ---: |
| ai-07-training-residency | 0/3 | exclude agentloop (3); residency scan ap-southeast-1 (1) |
| need-06-cs-chatbot | 1/3 | include fc/sae/ack/acs/ecs/agentcore/agentrun (2) |
| need-08-contractor-desktops | 1/3 | primary rec eds (2) |
| p1-vpc-no-group | 2/3 | NDJSON only, ends with done (1) |
| ai-08-poc-finetune-8gpu | 2/3 | regions >= 1 (1) |
| as-03-fully-stated | 2/3 | assumes never repeat public/singapore/10,000/10k/mysql/two zones/single region/ecs/cdn (1) |

## Warnings before and after deterministic repair

| code | before: total | per turn | turns | after: total | per turn | fixed by repair |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| orphan-node | 53 | 0.125 | 49 | 51 | 0.121 | 0 |
| containment | 44 | 0.104 | 33 | 0 | 0 | 46 |
| unknown-id | 27 | 0.064 | 12 | 0 | 0 | 0 |
| constraint-region | 15 | 0.035 | 11 | 15 | 0.035 | 0 |
| missing-group | 8 | 0.019 | 8 | 0 | 0 | 8 |
| attach-host-missing | 6 | 0.014 | 6 | 0 | 0 | 0 |
| bad-op | 6 | 0.014 | 6 | 0 | 0 | 0 |
| path-order | 3 | 0.007 | 3 | 0 | 0 | 3 |
| bad-json | 2 | 0.005 | 1 | 2 | 0.005 | 0 |
| constraint-avoid | 1 | 0.002 | 1 | 0 | 0 | 0 |
| dns-in-path | 1 | 0.002 | 1 | 0 | 0 | 1 |

Severity before repair {"info":73,"warn":67,"error":26}, after {"info":40,"warn":28}. Unknown products: 0 (none). Product strings that were not catalog ids: 0 (none).

## Latency (main stream)

| measure | n | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| first token (answering attempt) | 423 | 1.22 s | 1.81 s | 4.03 s |
| first token as waited for (failed attempts included) | 423 | 1.22 s | 1.84 s | 9.41 s |
| first say | 423 | 1.49 s | 2.13 s | 4.20 s |
| first op | 423 | 1.92 s | 2.70 s | 4.72 s |
| first node | 341 | 4.07 s | 5.68 s | 6.85 s |
| stream total (all turns) | 423 | 8.79 s | 23.1 s | 35.4 s |
| stream total, new diagrams | 354 | 12.6 s | 23.5 s | 35.4 s |
| stream total, edits | 132 | 4.97 s | 12.9 s | 25.9 s |
| stream total, product answers | 55 | 3.91 s | 5.60 s | 8.00 s |
| whole turn incl. retries and follow-up | 423 | 9.38 s | 23.4 s | 35.4 s |

## Tokens and cost

| measure | value |
| --- | ---: |
| prompt tokens | 6618625 |
| cached prompt tokens | 6209664 (94%) |
| completion tokens | 236353 |
| completion tokens per turn p50 / p95 | 465 / 1245 |
| cost per turn mean / p95 | $0.0092 / $0.0132 |
| cost per conversation mean / p95 | $0.0119 / $0.0333 |
| total | $3.90 |

## Reliability

| counter | value |
| --- | ---: |
| turns | 423 |
| main stream ended without done (truncated) | 0 |
| continuation turns | 0 |
| repair turns | 1 |
| hedged turns / hedge won | 0 / 0 |
| turns that used the fallback model | 4 |
| extra attempts after failures | 4 |
| conversations with an API failure | 0 |
| bad (unparseable) lines | 2 |
| \u escapes | 0 |

## Failover to the fallback model

4 of 423 turns (1%) failed over in the main stream; reasons {"first-byte-timeout":4}. Follow-up turns that ran on another model: 0.

| measure | n | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| stalled attempt before failover | 4 | 8.03 s | 8.04 s | 8.04 s |
| fallback first token | 4 | 1.25 s | 1.36 s | 1.37 s |
| first token as waited for | 4 | 9.28 s | 9.39 s | 9.41 s |
| whole turn | 4 | 23.2 s | 24.0 s | 24.1 s |

## Cut-off turns

Main streams that ended without done: 0 ({}). Rescued by the continuation turn: 0 (0 of them pass every assertion); not rescued: 0. Turn pass rate without the rescued turns: 98%.

## Constraint compliance (machine-checked)

| check | passed | rate |
| --- | ---: | ---: |
| residency (final graph and final narration, core checker) | 51/51 | 100% |
| residency, independent scan (own place table and cue words; shares no code with the checker) | 50/51 | 98% |
| pinned constraints as data (req regions / avoid) | 24/24 | 100% |
| avoided products absent (exclude and retained exclude) | 204/207 | 99% |

Residency checks with a warn-level foreign-region mention (not failed, reviewed by hand): 3. Residency checks where the product's repair turn corrected the main-stream narration: 0. Turns with pinned constraints in memory: 132. Product constraint findings before repair {"constraint-region":{"total":15,"turns":11,"error":0},"constraint-avoid":{"total":1,"turns":1,"error":1}}, left after repair {"constraint-region":{"total":15,"turns":11,"error":0}}.

Independent residency scan hits (read each one: it errs towards flagging):

| case | run | turn | scan finding |
| --- | ---: | ---: | ---: |
| ai-07-training-residency | 2 | 2 | say agentloop: Hong Kong in "runs only in Hong Kong internationally"; say : Hong Kong in "I'll add AgentLoop for LLM tracing and evaluation, noting it runs only in Hong …"; say : Hong Kong in "LLM tracing and quality eva |

## Repairs

| deterministic fix | fixes | turns |
| --- | ---: | ---: |
| containment | 46 | 34 |
| missing-group | 8 | 8 |
| attach-invalid | 6 | 6 |
| path-order | 3 | 3 |
| dns-in-path | 1 | 1 |

LLM follow-up turns: 1 ({"repair":1}); turns by finding code {"constraint-region":1,"constraint-avoid":1}.

| case | run | turn | kind | turn passes | findings |
| --- | ---: | ---: | ---: | ---: | ---: |
| trap-07-icp | 2 | 1 | repair | yes | constraint-region/warn: a say line names Hangzhou (cn-hangzhou), Shanghai (cn-shanghai), Beijing (cn-beijing), Shenzhen (cn-shenzhen), Zhangjiakou (cn-zhangjiakou): "A public website in a mainland China region requires a; constraint-avoid/error: 'web' uses ecs |

## Languages

| language | turns | completion tokens / turn | vs English twin | prompt tokens / turn | say in language | why in language | \u escapes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 336 | 544 | - | 15665 | 336/336 | 0/0 | 0 |
| ko | 48 | 643 | 1.069 | 15552 | 48/48 | 47/47 | 0 |
| zh | 39 | 581 | 1.042 | 15609 | 39/39 | 39/39 | 0 |

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
| mt-05-mixed-five-turns | 5 | 6/6  9/9  9/9  9/9  9/9 | 100% |
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
| completeness | 4.431 |
| accuracy | 4.339 |
| rationality | 4.183 |
| readability | 4.394 |
| overall | 4.337 |
| architect would sign off | 89% |
| judge cost | $1.271 |

| category | judged | overall score | sign-off |
| --- | ---: | ---: | ---: |
| pattern | 22 | 4.205 | 91% |
| need | 20 | 4.275 | 95% |
| trap | 18 | 4.5 | 100% |
| edit | 9 | 4.556 | 78% |
| multiturn | 12 | 4.125 | 67% |
| adversarial | 5 | 4.55 | 80% |
| i18n | 23 | 4.37 | 91% |

Every run of the constraint cases: 45 runs judged, sign-off 76%, mean 4.133. (Total judged runs: 139.)

| case | run | judge defects |
| --- | ---: | ---: |
| ai-07-training-residency | 1 | eval node (agentloop) placed in sg region; AgentLoop has no Singapore region internationally; Turn 2 narration says 'both staying in Singapore' — incorrect for AgentLoop and no explanation of the Hong Kong-only limitatio |
| ai-07-training-residency | 2 | agentloop node drawn 'in sg' while the catalog states international use only through Hong Kong; placement is factually wrong; Traces/eval data (which may contain training-derived content) would leave Singapore, conflicti |
| ai-07-training-residency | 3 | eval node (agentloop) placed in sg region though AgentLoop has no Singapore region internationally; Narration states AgentLoop 'runs only in Singapore internationally' — factually wrong per catalog; No mention of the dat |
| as-05-flip-internal | 1 | users node in internet group and users->dns resolve edge kept; internal-only should drop the public users/DNS path and show staff reaching the VPN Gateway; dns node retained though DNS is not needed for a private VPN-acc |
| as-05-flip-internal | 2 | users node in Internet and users -> dns resolve edge kept after switching to internal-only; public-facing chip removed but the diagram still shows a public path; Cloud DNS (public authoritative DNS) retained for an inter |
| as-05-flip-internal | 3 | users node still placed in Internet group and labeled 'Shoppers' instead of internal staff/users; Public Cloud DNS resolve hop retained; internal-only access should use private DNS or no public DNS; WAF badge kept on an  |
| mt-03-data-in-singapore | 1 | GA and ESA both used as global acceleration entry points for the same traffic — overlapping products, no rationale for needing both; ga -> esa edge chains two acceleration layers; GA normally terminates at the regional e |
| mt-04-budget | 1 | Turn 3 narration says 'This increases monthly cost' but does not state whether the $200 budget still holds or offer a cheaper HA option (e.g., single-zone with backup, or smaller search instance).; Elasticsearch multi-zo |
| mt-04-budget | 2 | Turn 3 narration ignores the pinned under-$200/month constraint while adding two new paid components (Tair, NAT) on top of multi-zone Elasticsearch; no cost-impact warning or cheaper alternative (e.g., single-zone search |
| p1-avoid-tempted-k8s | 2 | No autoscaling shown for the SAE API nodes despite tenfold growth being a pinned requirement; ESS badge only on workers.; MSE labeled 'Service mesh (Nacos)' is misleading: Nacos is service discovery/config/governance, no |
| p1-ko-residency | 3 | GTM을 '정상 AZ로 전환' 용도로 사용 — GTM은 리전 간 DNS 페일오버 서비스이며 AZ 간 전환은 ALB/다중 AZ가 이미 처리하므로 불필요하고 오해를 주는 구성; dns -> gtm '연동' 엣지 추가: DNS는 데이터 경로의 hop이 아니며, GTM과 DNS를 별도 노드로 중복 배치한 것은 부정확; ESA(글로벌 엣지) 사용 시 고객 데이터가 해외 엣지를 경유하지 않도록 한국 내 |

Agreement between the judged run's assertions and the judge's sign-off: 97/109 (89%). Assertions pass and judge yes 96, both no 1, assertions pass but judge no 11, assertions fail but judge yes 1. Mean score of passing runs 4.353, failing runs 3.5, point-biserial r 0.226.

| case | assertions | judge | failed assertions | judge defects |
| --- | ---: | ---: | ---: | ---: |
| pat-12-ecommerce-security | pass | no |  | esa -> ddos -> alb edge chain implies traffic flows from ESA through Anti-DDoS Proxy; in practice you pick one entry point (ESA or proxy via CNAME), not both in series; ESA already provides DDoS defen |
| need-06-cs-chatbot | fail | yes | include fc/sae/ack/acs/ecs/agentcore/agentrun | rag -> llm edge implies a direct call, but per catalog EAS reaches Model Studio via NAT with SNAT; the NAT edge is marked control, which misrepresents the data path; No AI Guardrails (or equivalent co |
| need-12-qwen-api | pass | no |  | No nodes drawn; only a recommendation chip with one-line narration; Missing guidance on keeping the API key server-side (e.g., KMS) per strong-answer guidance; No mention of pay-per-token model or how |
| edit-07-multi-region-dr | pass | no |  | users -> gtm (resolve) -> dns (resolve) chain is wrong: GTM 3.0 does health-checked steering to endpoints; Cloud DNS is a separate authoritative resolver and should not be a hop behind GTM; media -> d |
| edit-08-cheaper | pass | no |  | Narration does not explain the impact of dropping OpenSearch (product search) and Milvus (RAG vectors) on user experience; No mention of how the assistant now handles product queries without a vector  |
| mt-03-data-in-singapore | pass | no |  | GA and ESA both used as global acceleration entry points for the same traffic — overlapping products, no rationale for needing both; ga -> esa edge chains two acceleration layers; GA normally terminat |
| mt-04-budget | pass | no |  | Turn 3 narration says 'This increases monthly cost' but does not state whether the $200 budget still holds or offer a cheaper HA option (e.g., single-zone with backup, or smaller search instance).; El |
| adv-03-aws-products | pass | no |  | Tablestore node placed inside the VPC; it is a regional service that belongs outside the VPC; Function Compute drawn inside the VPC without stating VPC access is configured; Edge app -> httpdns (resol |
| ko-need-01-dev-team | pass | no |  | token-plan을 Qoder Teams의 과금 수단처럼 연결했으나 카탈로그상 그런 관계 근거 없음 (Qoder는 qoder.com/Marketplace 구매); token-plan이 Singapore only임을 언급하지 않음; model-studio를 Qoder의 백엔드 API로 연결한 것은 추측성이며 불필요한 complement |
| zh-trap-01-lingma | pass | no |  | 叙述仅一句话，未解释通义灵码已更名 Qoder、Qoder CN 仅限中国大陆的背景; model-studio 标注为'Qoder Teams 底层调用的模型服务'误导用户以为需自行开通 Model Studio; 推荐理由文案仍称'通义灵码席位'，与产品现名 Qoder 不一致 |
| p1-path-ddos-esa | pass | no |  | Edge order places ESA before Anti-DDoS Proxy (users -> esa -> anti-ddos), but the strong answer guidance specifies Anti-DDoS Proxy should sit behind ESA in the path users -> ESA -> Anti-DDoS Proxy ->  |
| as-05-flip-internal | pass | no |  | users node in internet group and users->dns resolve edge kept; internal-only should drop the public users/DNS path and show staff reaching the VPN Gateway; dns node retained though DNS is not needed f |
