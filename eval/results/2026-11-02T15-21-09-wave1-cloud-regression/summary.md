# Evaluation summary

Model qwen3.8-max (fallback qwen3.7-max), catalog 2026-10-31 (232 entries), system prompt 59906 chars (sha256 998fab223dab), 3 runs per case, started 2026-11-02T15:21:09.644Z.

## Overall

**pass@1 95%, all 3 runs pass 90%** (109 cases). pass@3 is best-of-3 and is listed last.

| measure | value |
| --- | ---: |
| cases / conversations / turns | 109 / 327 / 423 |
| pass@1 (mean case pass rate) | 95% |
| all runs pass | 90% |
| majority (over half the runs pass) | 97% |
| pass@3 (some run passes) | 99% |
| conversations passing every assertion | 95% |
| turns passing every assertion | 97% |
| assertions passing (4804 checks) | 100% |
| conversations that hit an API failure | 0 |
| list-price cost of the model runs | $3.43 |

## By category

| category | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pattern | 22 | 66 | 96% | 86% | 100% | 100% |
| need | 20 | 60 | 92% | 85% | 90% | 100% |
| trap | 18 | 54 | 100% | 100% | 100% | 100% |
| edit | 9 | 27 | 100% | 100% | 100% | 100% |
| multiturn | 12 | 36 | 89% | 83% | 92% | 92% |
| adversarial | 5 | 15 | 100% | 100% | 100% | 100% |
| i18n | 23 | 69 | 96% | 87% | 100% | 100% |

## By language

| language | cases | runs | run pass | all runs | majority | pass@3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 86 | 258 | 95% | 91% | 97% | 99% |
| ko | 13 | 39 | 95% | 85% | 100% | 100% |
| zh | 10 | 30 | 97% | 90% | 100% | 100% |

## By assertion type (worst first)

| type | checks | passed | rate | cases that failed it |
| --- | ---: | ---: | ---: | ---: |
| primaryRec | 54 | 51 | 94% | 2 |
| asks | 42 | 40 | 95% | 1 |
| reask | 24 | 23 | 96% | 1 |
| residencyScan | 51 | 50 | 98% | 1 |
| askLang | 51 | 50 | 98% | 1 |
| exclude | 171 | 169 | 99% | 1 |
| attachValid | 423 | 421 | 100% | 2 |
| format | 423 | 421 | 100% | 2 |
| include | 513 | 511 | 100% | 2 |
| noErrors | 423 | 423 | 100% | 0 |
| pathOrder | 356 | 356 | 100% | 0 |
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
| editMinimal | 87 | 87 | 100% | 0 |
| restore | 3 | 3 | 100% | 0 |
| req | 51 | 51 | 100% | 0 |
| retention | 159 | 159 | 100% | 0 |
| residency | 51 | 51 | 100% | 0 |
| whyLang | 86 | 86 | 100% | 0 |
| pins | 24 | 24 | 100% | 0 |
| placement | 9 | 9 | 100% | 0 |
| linked | 21 | 21 | 100% | 0 |
| gpu | 12 | 12 | 100% | 0 |
| askOptions | 39 | 39 | 100% | 0 |
| assumes | 9 | 9 | 100% | 0 |
| scope | 30 | 30 | 100% | 0 |
| chips | 3 | 3 | 100% | 0 |

## Cases below 100% (11 of 109)

| case | runs passed | what failed |
| --- | ---: | ---: |
| ai-07-training-residency | 0/3 | residency scan ap-southeast-1 (1); exclude agentloop (2) |
| need-08-contractor-desktops | 1/3 | primary rec eds (2) |
| as-03-fully-stated | 1/3 | asks 0-0 (2); assumes never repeat public/singapore/10,000/10k/mysql/two zones/single region/ecs/cdn (1) |
| pat-02-k8s | 2/3 | NDJSON only, ends with done (1) |
| pat-04-rag | 2/3 | every attachment names a valid host (1) |
| need-07-analysts | 2/3 | primary rec quick-bi-aipro/smart-q/dms-data-agent (1) |
| ko-pat-04-rag | 2/3 | include fc/sae/ack/acs/ecs/agentcore/agentrun (1) |
| ko-need-02-whole-company | 2/3 | ask text in ko (1) |
| zh-pat-04-rag | 2/3 | include fc/sae/ack/acs/ecs/agentcore/agentrun (1) |
| p1-req-avoid-fc | 2/3 | NDJSON only, ends with done (1) |
| p1-vpc-no-group | 2/3 | every attachment names a valid host (1) |

## Warnings before and after deterministic repair

| code | before: total | per turn | turns | after: total | per turn | fixed by repair |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| orphan-node | 80 | 0.189 | 67 | 78 | 0.184 | 2 |
| containment | 38 | 0.09 | 25 | 0 | 0 | 40 |
| unknown-id | 18 | 0.043 | 7 | 0 | 0 | 0 |
| attach-host-missing | 10 | 0.024 | 10 | 0 | 0 | 2 |
| missing-group | 6 | 0.014 | 6 | 0 | 0 | 5 |
| constraint-region | 6 | 0.014 | 4 | 6 | 0.014 | 0 |
| bad-json | 4 | 0.009 | 2 | 4 | 0.009 | 0 |
| bad-op | 3 | 0.007 | 3 | 0 | 0 | 0 |
| path-order | 3 | 0.007 | 3 | 1 | 0.002 | 2 |
| china-only | 2 | 0.005 | 1 | 1 | 0.002 | 0 |
| dns-in-path | 1 | 0.002 | 1 | 0 | 0 | 1 |
| unknown-product | 1 | 0.002 | 1 | 1 | 0.002 | 0 |

Severity before repair {"info":83,"warn":69,"error":20}, after {"info":60,"warn":31}. Unknown products: 1 (app x1). Product strings that were not catalog ids: 1 (app x1).

## Latency (main stream)

| measure | n | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: |
| first token (answering attempt) | 423 | 1.25 s | 1.81 s | 2.64 s |
| first token as waited for (failed attempts included) | 423 | 1.25 s | 1.81 s | 2.64 s |
| first say | 423 | 1.54 s | 2.19 s | 2.94 s |
| first op | 423 | 2.04 s | 2.75 s | 3.68 s |
| first node | 341 | 4.42 s | 5.99 s | 7.05 s |
| stream total (all turns) | 423 | 10.1 s | 25.7 s | 42.3 s |
| stream total, new diagrams | 356 | 13.6 s | 26.5 s | 42.3 s |
| stream total, edits | 132 | 5.28 s | 11.6 s | 26.8 s |
| stream total, product answers | 54 | 3.98 s | 6.00 s | 6.52 s |
| whole turn incl. retries and follow-up | 423 | 10.1 s | 25.7 s | 42.3 s |

## Tokens and cost

| measure | value |
| --- | ---: |
| prompt tokens | 6626912 |
| cached prompt tokens | 6441728 (97%) |
| completion tokens | 241544 |
| completion tokens per turn p50 / p95 | 447 / 1311 |
| cost per turn mean / p95 | $0.0081 / $0.0119 |
| cost per conversation mean / p95 | $0.0105 / $0.0285 |
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
| bad (unparseable) lines | 4 |
| \u escapes | 0 |

## Failover to the fallback model

0 of 423 turns (0%) failed over in the main stream; reasons {}. Follow-up turns that ran on another model: 0.

## Cut-off turns

Main streams that ended without done: 0 ({}). Rescued by the continuation turn: 0 (0 of them pass every assertion); not rescued: 0. Turn pass rate without the rescued turns: 97%.

## Constraint compliance (machine-checked)

| check | passed | rate |
| --- | ---: | ---: |
| residency (final graph and final narration, core checker) | 51/51 | 100% |
| residency, independent scan (own place table and cue words; shares no code with the checker) | 50/51 | 98% |
| pinned constraints as data (req regions / avoid) | 24/24 | 100% |
| avoided products absent (exclude and retained exclude) | 205/207 | 99% |

Residency checks with a warn-level foreign-region mention (not failed, reviewed by hand): 1. Residency checks where the product's repair turn corrected the main-stream narration: 0. Turns with pinned constraints in memory: 126. Product constraint findings before repair {"constraint-region":{"total":6,"turns":4,"error":0}}, left after repair {"constraint-region":{"total":6,"turns":4,"error":0}}.

Independent residency scan hits (read each one: it errs towards flagging):

| case | run | turn | scan finding |
| --- | ---: | ---: | ---: |
| ai-07-training-residency | 1 | 2 | say : Hong Kong in "I'll add SLS-based tracing and quality evaluation for model answers, since Agen…" |

## Repairs

| deterministic fix | fixes | turns |
| --- | ---: | ---: |
| containment | 40 | 26 |
| attach-invalid | 6 | 6 |
| missing-group | 5 | 5 |
| attach-host-missing | 2 | 2 |
| path-order | 2 | 2 |
| orphan-node | 2 | 1 |
| dns-in-path | 1 | 1 |

LLM follow-up turns: 0 ({}); turns by finding code {}.

## Languages

| language | turns | completion tokens / turn | vs English twin | prompt tokens / turn | say in language | why in language | \u escapes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| en | 336 | 557 | - | 15673 | 336/336 | 0/0 | 0 |
| ko | 48 | 653 | 1.137 | 15614 | 48/48 | 48/48 | 0 |
| zh | 39 | 591 | 1.101 | 15676 | 39/39 | 38/38 | 0 |

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
| p1-req-avoid-fc | 2 | 3/3  3/3 | 67% |
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
| accuracy | 4.404 |
| rationality | 4.22 |
| readability | 4.413 |
| overall | 4.367 |
| architect would sign off | 95% |
| judge cost | $1.261 |

| category | judged | overall score | sign-off |
| --- | ---: | ---: | ---: |
| pattern | 22 | 4.273 | 96% |
| need | 20 | 4.3 | 95% |
| trap | 18 | 4.361 | 94% |
| edit | 9 | 4.639 | 100% |
| multiturn | 12 | 4.333 | 83% |
| adversarial | 5 | 4.55 | 80% |
| i18n | 23 | 4.391 | 100% |

Every run of the constraint cases: 45 runs judged, sign-off 80%, mean 4.183. (Total judged runs: 139.)

| case | run | judge defects |
| --- | ---: | ---: |
| ai-07-training-residency | 2 | AgentLoop node placed in Singapore region group without confirming feature availability, contrary to catalog guidance.; Narration turn 2 states AgentLoop runs in Singapore as fact; no caveat or alternative offered.; No e |
| ai-07-training-residency | 3 | AgentLoop node placed in Singapore (ap-southeast-1) with no confirmation caveat; catalog says general availability is Hangzhou/Shanghai/Hong Kong and Singapore appears only in multimodal evaluator docs.; Narration for tu |
| as-05-flip-internal | 1 | dns node and users->dns edge kept though ESA is gone; DNS why text still says 'Resolves the store domain to ESA'; users node still 'Shoppers' in Internet group with why '10k daily users browsing the store' — contradicts  |
| as-05-flip-internal | 2 | users node in Internet and users->dns resolve edge plus public Cloud DNS node survive the flip to internal only; staff should reach the store via VPN with private DNS or no public DNS; ALB not explicitly switched to inte |
| as-05-flip-internal | 3 | users node in Internet with dns resolve edge retained — public-facing chip should be gone and public DNS removed for an internal-only store; WAF badge on ALB kept though the public threat surface is gone (or should be ju |
| mt-04-budget | 1 | Multi-zone RDS + multi-zone Elasticsearch + ALB + two ECS instances plausibly breaches the $200/month pinned budget; no cost-conscious alternative (e.g., keep search single-zone, use RDS basic edition, or SAE) is offered |
| mt-04-budget | 2 | Turn 3 makes no diagram or config change in response to an explicit HA request, and the narration is internally inconsistent about whether multi-AZ RDS/ECS already exists.; Elasticsearch across zones a,b plus multi-zone  |
| mt-04-budget | 3 | Pinned budget requirement is violated by the final design without presenting options (e.g., single-zone Elasticsearch with multi-zone RDS, or RDS HA + app HA only) or asking the user to confirm budget vs HA trade-off; Tu |
| zh-mt-01-avoid-k8s | 2 | 5 倍流量扩展只停留在文字描述，图中没有新增只读副本、分片或弹性配置等可见变化; menu-cache 与 cache 是两个独立的 Tair 实例，功能重叠，属于冗余组件; 第三轮叙述过于简略，未说明各组件具体的扩展方式（如 SAE 自动扩缩策略、PolarDB 只读节点数） |

Agreement between the judged run's assertions and the judge's sign-off: 96/109 (88%). Assertions pass and judge yes 96, both no 0, assertions pass but judge no 6, assertions fail but judge yes 7. Mean score of passing runs 4.385, failing runs 4.107, point-biserial r 0.146.

| case | assertions | judge | failed assertions | judge defects |
| --- | ---: | ---: | ---: | ---: |
| need-07-analysts | fail | yes | primary rec quick-bi-aipro/smart-q/dms-data-agent | Smart Q node lacks a region/group placement (no 'in sg'), leaving its scope ambiguous.; Guidance suggests DMS Data Agent for ad-hoc questions over databases; not mentioned even as an alternative.; Min |
| need-08-contractor-desktops | fail | yes | primary rec eds | Catalog says EDS office network connects to the VPC through CEN, but no CEN node or edge links desktops to NAS; the desktops->nas edge skips the required connectivity element; No explicit fixed egress |
| need-12-qwen-api | pass | no |  | No mention of keeping the API key on the server side, ideally in KMS; No mention of optional AI Gateway for governance/routing; No diagram nodes drawn at all, only a recommendation item |
| mt-04-budget | pass | no |  | Multi-zone RDS + multi-zone Elasticsearch + ALB + two ECS instances plausibly breaches the $200/month pinned budget; no cost-conscious alternative (e.g., keep search single-zone, use RDS basic edition |
| adv-03-aws-products | pass | no |  | Tablestore node placed inside the VPC; it is a regional service that must be drawn outside the VPC; FC 'API functions' placed inside the VPC; FC is drawn outside the VPC unless VPC access is configure |
| ko-pat-04-rag | fail | yes | include fc/sae/ack/acs/ecs/agentcore/agentrun | Guidance suggests Model Studio Qwen as the primary inference path for a straightforward internal assistant; the answer defaults to self-hosted PAI-EAS LLM with Model Studio only as fallback, which is  |
| ko-need-02-whole-company | fail | yes | ask text in ko | DingTalk 국제판의 AI 기능·가격 미공개 및 낮은 신뢰도에 대한 주의 문구 없음; QwenWork가 프리뷰(공개 베타) 단계이며 영어·중국어 중심이라는 점(한국어 사용자 대상) 언급 없음; 리서치 용도 적합성에 대한 구체적 근거 설명이 다소 부족 |
| zh-pat-04-rag | fail | yes | include fc/sae/ack/acs/ecs/agentcore/agentrun | 假设芯片中提到的 AgentCore 替代方案未在目录中，可能误导用户; 未明确说明文档如何从 OSS 加载到向量库（缺少数据同步/ETL 环节）; AI Gateway 与 NAT 的串联略显冗余，EAS 可直接通过 NAT 访问 Model Studio |
| trap-04b-redis-leaderboard | pass | no |  | Edge players -> cache 'game data' implies clients connect straight to the datastore; a leaderboard needs a game backend (ECS/ACK) in the VPC between players and Tair; Assistant asks whether a backend  |
| p1-path-ddos-esa | pass | no |  | Edge order conflict: nodes list shows users -> esa -> ddos -> alb, but changes list shows users -> ddos -> esa -> alb; the actual request path is unclear.; Anti-DDoS Proxy placed before ESA contradict |
| p1-vpc-no-group | fail | yes | every attachment names a valid host | Express Connect is a physical line with long lead time; VPN Gateway might be more practical as default for a first design, though it is offered as an alternative |
| ai-07-training-residency | fail | yes | residency scan ap-southeast-1 | Eval function (FC) placed in the VPC group; per placement rules FC is drawn outside the VPC unless VPC access is explicitly configured, which is not stated.; The eas->logs edge was removed, so serving |
| as-05-flip-internal | pass | no |  | dns node and users->dns edge kept though ESA is gone; DNS why text still says 'Resolves the store domain to ESA'; users node still 'Shoppers' in Internet group with why '10k daily users browsing the s |
