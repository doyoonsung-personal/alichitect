# Golden-prompt evaluation: harness, baseline and one improvement iteration

Date 2026-10-31. Model qwen3.8-max (thinking off), fallback qwen3.7-max, judge kimi-k3, catalog 2026-10-31 (223 entries), Model Studio Singapore endpoint. Everything below comes from the stored runs in `eval/results/`; numbers can be regenerated with `node eval/summarize.ts <dir>`.

> **Review notes ([spikes/REVIEW.md](../spikes/REVIEW.md), 2026-10-31).** Every headline number reproduces from `eval/results/`. (1) mt-03 run 3 passes even though its narration promises OSS replication to Kuala Lumpur against the pinned "customer data must stay in Singapore": the assertions check only drawn regions. True residency compliance for mt-03 in the final run is 2 of 3. (2) The ledger now totals USD 10.24 over 1,393 entries; this report predates the last watchdog probes. (3) The strict `noUnused` check was not fully clean (one unused import, since removed). (4) Lead with pass@1 (95%) and all-runs (89%); pass@3 (100%) is best-of-3.

## 1. Summary

I built a repeatable quality measure for the diagram builder and ran it. The harness has 80 golden cases (103 turns), a 10-case held-out set, machine assertions, an LLM judge, a runner with a spend guard, offline rescoring and a before/after comparison. `llm.ts` now carries the latency spike's watchdogs, the fallback model and truncated-stream handling; four live fault-injection scenarios pass.

The baseline passes 84% of conversations under the corrected assertion set (90% as run), signs off 84% with the judge, and is weakest in multi-turn (33%) and Chinese (70%). The failures are semantic more than syntactic: the model never produced an unknown product, an unparseable line or a `\u` escape in 309 turns. Three prompt revisions lifted the previously failing cases from 30% to 91% of conversations and the full suite to pass@1 95% and pass@3 100%. On 10 held-out cases the old prompt passed 63% and the final one 100%. The price was a side effect (Dify on ACK drawn as an attachment) that the prompt cannot fully remove; section 8 lists the validator fixes that should.

## 2. What was built

| Path | What |
|---|---|
| `packages/core/src/prompt.ts` | System prompt (rules R1-R18, one worked example, catalog avoid-when section, catalog rows), `buildMessages`, `buildRepairMessages`, `compactChanges`, `detectReplyLanguage`, tombstones, requirement merge |
| `packages/core/src/llm.ts` | `streamTurn` (SSE, validation, reducer, events), `runTurn` (retries, fallback, hedge, continuation or repair turn, memory), `complete` (judge, summaries), cost, cache tracker |
| `packages/core/test/prompt.test.ts` | 49 tests: message order, prefix stability, cache modes, SSE, watchdogs, hedge, continuation, memory |
| `eval/lib.ts`, `records.ts` | Case schema, 25 assertion kinds, case checker, ledger, stored-record types |
| `eval/run.ts` | Runner: N runs per case, concurrency, 429 backoff, resume, rescore, selectors, judge phase, budget guard |
| `eval/summarize.ts`, `compare.ts`, `failures.ts` | Summary tables, before/after comparison, failure listing |
| `eval/judge.ts`, `probe-judge.ts` | Judge prompt and parser, candidate-model probe |
| `eval/probe-watchdogs.ts` | Live fault injection against the real endpoint |
| `eval/cases/*.json`, `eval/cases-heldout/ho.json`, `eval/bases/*.json` | 80 cases, 10 held-out cases, 4 base diagrams |
| `eval/test/*.test.ts` | 86 tests for assertions, summary, judge parser, selectors, comparison |

Run it: `node eval/check-cases.ts`, `node eval/run.ts --dry`, `node eval/run.ts --runs 3 --concurrency 3 --label x`, `--failing-from DIR`, `--passing-from DIR`, `--rescore DIR`, `--cases-dir eval/cases-heldout`, `--no-judge`, `--budget 30`. Tests: `node --test` in `packages/core`, `node --test "eval/test/**/*.test.ts"`.

## 3. Cases and assertions

80 cases: 13 pattern (the 12 seed patterns plus an internal portal), 13 product-need, 16 trap, 9 edit, 6 multi-turn (3 to 5 turns, one with a 2-exchange window and a rolling summary), 5 adversarial, 18 Korean and Chinese (9 each). The traps cover Lingma, DCDN, Log Service, ApsaraDB for Redis, API Gateway (Classic), the Model Studio knowledge base, ICP, Sydney, Mumbai, SLB and Cloud Contact Center, several with a second wording.

Assertions per turn: include (any-of groups), exclude, excludeRaw (the model must write the new id, not the old name), primaryRec, noNodes, noRecs, req (pinned requirement), retention (constraints from earlier turns), regions, attach, zones, editMinimal, restore, noWarn (the model got it right before the validator), mention, notMention, question, size. Defaults on every turn: no error-level warnings after repair, clean path order, valid attachments (`attachValid`), NDJSON only and ends with done, no `\u` escapes, no invented prices, say text and why text in the user's language.

Assertion set v2 (made after the baseline and the judge's disagreements): `attachValid` added as a default, need-05 checks `primaryRec model-studio` instead of excluding Coding Plan (the model said no and listed Coding Plan as an IDE complement, which is not wrong), Coding Plan excluded for the developer-team needs as their reference text says, `minNodes 4` on the closed-region traps. The 12 cases added in this attempt were drafted by Qwen from my spec and reviewed (section 9).

## 4. Baseline

3 runs per case, 240 conversations, 309 turns, system prompt 42,079 chars (sha256 a19383a1a4c6). Ran 13:04 to 13:30 KST on a Saturday at concurrency 3.

| measure | as run | corrected (v2) |
|---|---:|---:|
| pass@1 (mean case pass rate) | 90% | 84% |
| pass@3 (some run passes) | 91% | 88% |
| majority (over half of the runs pass) | 91% | 88% |
| all three runs pass | 88% | 78% |
| conversations passing every assertion | 216 of 240 | 202 of 240 |
| turns passing every assertion | 90% | 86% |
| assertion checks passing | 98.8% of 2,856 | 98.4% of 3,177 |

By category and language (corrected set), baseline against the final prompt of section 6:

| name | cases | run pass baseline | run pass final | pass@3 baseline | pass@3 final | all runs baseline | all runs final |
|---|---:|---:|---:|---:|---:|---:|---:|
| pattern | 13 | 90% | 97% | 92% | 100% | 85% | 92% |
| need | 13 | 85% | 92% | 92% | 100% | 69% | 77% |
| trap | 16 | 98% | 98% | 100% | 100% | 94% | 94% |
| edit | 9 | 89% | 100% | 89% | 100% | 89% | 100% |
| multiturn | 6 | 33% | 89% | 33% | 100% | 33% | 83% |
| adversarial | 5 | 100% | 100% | 100% | 100% | 100% | 100% |
| i18n | 18 | 78% | 91% | 83% | 100% | 67% | 83% |
| en | 62 | 86% | 96% | 89% | 100% | 81% | 90% |
| ko | 9 | 85% | 93% | 89% | 100% | 78% | 89% |
| zh | 9 | 70% | 89% | 78% | 100% | 56% | 78% |

The validator-owned assertions are saturated (no error after repair 100%, path order 99%, format 99.7%, escapes 100%, prices 100%). The discriminating ones are semantic: question 33%, mention 80%, retention 91%, why-language 94%, attachValid 96%, primaryRec 96%, exclude 96%.

### Warnings before and after deterministic repair (baseline)

| code | before (total, turns) | after |
|---|---:|---:|
| orphan-node | 80 in 60 turns | 97 (info and warn) |
| containment | 30 in 19 turns | 0 |
| attach-host-missing | 19 in 15 turns | 0 |
| unknown-id | 8 in 5 turns | 0 |
| path-order | 5 | 5 |
| missing-group, china-only | 1 each | 0, 1 |

Error-level warnings: 16 before, 0 after repair, so no repair turn was needed in the baseline. Unknown products 0, non-catalog product strings 0 (the renames rule R15 and the traps work), unparseable lines 0. Containment (managed services placed in the VPC) needed repair in 6.1% of baseline turns and 6.8% of final turns, so prompt changes did not reduce it; the deterministic repair handles it. After repair, 27 of 309 turns (8.7%) still had a warn-level orphan, mostly Auto Scaling nodes (19) and Cloud Firewall nodes (8).

### Failure taxonomy (38 failing conversations; classes can overlap)

| class | conv. | cases | example |
|---|---:|---:|---|
| Invalid attachment | 14 | 6 | mt-01 turn 3 "make it scale": "I'll add Auto Scaling for SAE" draws an `ess` node attached to a SAE node (Auto Scaling only hosts ECS or ECI). Also edit-03: the ECS to ACK swap leaves the Auto Scaling node behind; need-10 attaches ai-guardrails; pat-13 attaches PrivateZone to the vpc group |
| Pinned-constraint conflict | 9 | 3 | mt-03 turn 2, pinned "customer data must stay in Singapore": "I'll add disaster recovery with cross-region RDS replication to Kuala Lumpur"; mt-06 DR in Singapore against "stay in Indonesia"; mt-04 "make it highly available" under a 200 dollar budget adds GTM and never mentions cost (3 of 3) |
| Product routing | 5 | 4 | need-03 "an AI agent I can use with my team": AgentCore as primary and no question; need-04 run 3: Qoder Teams primary instead of Token Plan for "Qwen in Claude Code and Cursor"; Coding Plan listed for a team |
| Language drift | 4 | 2 | zh-edit-01: the ask "再加一个 WAF。" after English history gets English why text (3 of 3) and once an English say; zh-need-02: rec why copied from the English catalog |
| Path order or missing complement | 3 | 1 | pat-12: Anti-DDoS Proxy drawn in front of ESA (3 of 3, never repaired); Fraud Detection missing once |
| No diagram after a closed region | 2 | 2 | trap-09: "Mumbai is closed ... please confirm Singapore ... so I can draw your architecture" |
| Missing done | 1 | 1 | need-03: a short recommendation ended with finish_reason stop and no done; the continuation turn completed it |

Other observations. The judge flagged design issues the assertions do not check: duplicate nodes (CDN plus ESA), DNS drawn as a hop in a multi-region edit, redundant recommendations (Model Studio and Token Plan next to Qoder Teams). The worked example in the prompt is copied almost verbatim for web-shop asks (9.7 of 11.7 labels identical to the example in pat-01, 11 of 11 in the Beijing e-commerce trap), while data-platform, IoT, hybrid and security asks share 0 labels with it.

### Korean and Chinese

| | turns | completion tokens per turn | vs English twin (first turns) | say in language | why in language | `\u` escapes |
|---|---:|---:|---:|---:|---:|---:|
| en | 243 | 482 | - | 243/243 | - | 0 |
| ko | 33 | 548 | 1.14x | 33/33 | 31/31 | 0 |
| zh | 33 | 462 | 0.99x | 31/33 | 27/31 | 0 |

Raw UTF-8 is respected (0 escapes in 66 turns). The prompt size barely changes (11.2k tokens per turn against 11.3k for English), because the system prompt dominates. Output tokens: Korean costs between +6% and +30% against English depending on the measure (twin ratio 1.14 in the baseline and 1.30 in the final run, nine pairs each; per-turn means 548 against 482, and 513 against 485), Chinese between -4% and +23%. The FEASIBILITY estimate of +15% for Korean sits inside that range. The real problem is language drift on short follow-ups after English history: Chinese run pass 70%, all failures about say or why text left in English. The deterministic REPLY LANGUAGE line plus an explicit rule fixed it (zh say 33/33 and why 33/33 in the final run).

### Multi-turn memory

Pinned requirements, the window and the rolling summary keep constraints: the avoid-Kubernetes cases (English, Korean, Chinese) pass their retention checks at every turn (3/3, 3/3, 6/6, 6/6 style counts), and mt-05 (five mixed turns) passes 9/9 at turns 2 to 5. The failures are conflicts, not forgetting. mt-03 retention was 3/3, 3/6, 0/3, 0/3: after the DR turn the Kuala Lumpur replica stayed in the graph and every later turn inherited the violation. mt-06, with a window of 2 and flash summaries after each turn, kept 6/6 retention for four turns and failed at turn 5 (9/12) when DR went to Singapore although the requirement was still pinned. The rolling summary itself was accurate in the logs. The cost of memory is small: history and diagram add 1 to 3k mostly cached tokens per turn.

### Latency, cost, reliability

First byte p50 1.29 s, p95 1.89 s, max 5.64 s (309 turns); first say p50 1.58 s; first op p50 2.00 s; first node p50 3.76 s, p95 5.36 s. Stream totals: new diagrams p50 12.0 s, p95 23.9 s, max 34.9 s; edits p50 4.6 s, p95 13.3 s; product answers p50 4.7 s, p95 6.2 s. Cost per turn USD 0.0073 mean (p95 0.0116), per conversation USD 0.0094 (p95 0.0296); 96% of 3.50M prompt tokens were cache hits; 150k completion tokens (p50 258 per turn, p95 1,172).

Five turns waited the full 15 s for a first token although the prefix was warm and a hedge had been sent at 5 s. The hedge never won (0 of 6): both requests stalled together. The fallback model qwen3.7-max answered all five, first token in 1.2 to 1.7 s, so those turns cost 19 to 23 s instead of about 5 s. One stream ended without done after the model's own stop; the continuation turn finished it. API failures 0. The final run had no stall, one provider output-inspection error (DataInspectionFailed on the ICP question, not retryable) and two repair turns.

Live fault injection (`eval/probe-watchdogs.ts`, quiet system): stall to fallback model 14.8 s, 20 ops, done; warm stall, hedge wins, 13.5 s, 20 ops; stream cut after 70 events, idle watchdog trips, continuation adds 13 ops and the diagram completes (7 nodes, 6 edges, no repeated node); all pass.

### Judge and agreement

kimi-k3 with thinking off, blind to the assertions, fed the catalog facts of the products used, judged run 1 of each case (80 calls, USD 0.61, 0 errors). Means: completeness 4.41, accuracy 4.31, rationality 4.10, readability 4.41, overall 4.31; sign-off 84% (67 of 80). By category sign-off: pattern 100%, adversarial 100%, need 92%, trap 88%, edit 78%, i18n 78%, multiturn 33%.

Agreement of the judged run's pass or fail with the judge's sign-off: as run 69 of 80 (86%; both yes 64, both no 5, assertions pass but judge no 8, assertions fail but judge yes 3; point-biserial 0.33); with v2 73 of 80 (91%; 63, 10, 3, 4; r 0.54, mean score 4.44 for passing runs against 3.68 for failing). The v2 figure is in-sample because v2 was tuned on the disagreements. The judge found the Auto Scaling on SAE error in all three avoid-Kubernetes variants from the catalog facts, and the data-residency breaches in mt-03 and mt-06, which is the strongest evidence that the assertions and the judge see the same defects. Judge-model probe: deepseek-v4-pro also works but claimed WAF should sit outside the VPC (against the tool's rules); glm-5.3 cannot run with thinking off (`enable_thinking` restricted to true: 56 s and a truncated reply).

## 5. Recommended prompt and validator changes for the prototype

Prompt:
1. Keep one byte-stable system prompt, implicit caching, and the 12k-token budget (now 47.7k chars, about 11.8k tokens at 4 chars per token; 12.7k measured per turn with diagram and history).
2. Include the catalog's `avoidWhen` text. It fixed product routing (need-03 0/3 to 2/3 after revision 3, ready-made versus build, Coding Plan for teams) and the anti-DDoS order, but audit the strings that name another product: it made Dify on ACK popular.
3. Treat pinned requirements as hard constraints, repeat them after the user message, and name the cost effect when a budget is pinned.
4. Add the deterministic REPLY LANGUAGE line; it is cheap and fixed the Chinese drift.
5. Say what to do instead of what to avoid (scale SAE by upserting the node with a new why).
6. Require `done` in the first rule: revision 1 raised the missing-done rate from 1 in 309 to 5 in 102 turns, and a one-line rule removed it.
7. Add a second worked example from another domain; today web-shop asks come back as the example.

Validator and pipeline (this is where the remaining failures belong):
1. `attachTo` on a product that is not attachable (dify-on-ack, smart-q, ai-guardrails, a group id) should become an edge from the named host; an Auto Scaling badge without an ECS or ECI host should be removed. Today both end as floating orphan nodes.
2. Make pinned constraints machine-checkable (region only, products to avoid, budget flag on the `req` op) so `checkGraph` raises an error and the single repair turn runs. That would have caught every residency violation deterministically; prompt text alone left mt-06 at 1/3.
3. Repair the Anti-DDoS before ESA order (it stays a warning today).
4. Hedging adds cost without benefit when the stall is service-wide. Prefer a shorter warm first-token limit (about 8 s; slowest good first token 5.6 s) with immediate fallback, and re-measure at weekday peak.
5. Show a clear message for content-filtered turns instead of retrying.

Harness: run the suite on every prompt or catalog change, rerun failures with `--failing-from`, check regressions with `--passing-from` (expect a downward drift on a pre-selected group), add cases from real sessions, add a second judge and calibrate its sign-off against an architect.

## 6. Improvement iteration

Fixes aimed at the top classes (invalid attachment, pinned-constraint conflict, product routing, language drift, path order), applied in three revisions and tested on the 18 cases that failed at least one baseline run (54 conversations, 3 runs each), then on the whole suite.

| revision | change | 18 failing cases, conversations passing |
|---|---|---:|
| baseline | - | 16 of 54 (30%) |
| 1 | catalog avoid-when section, hard-constraint wording, REPLY LANGUAGE, Auto Scaling host rule, swap cleanup, anti-DDoS order, ready-made assistant rule | 40 of 54 (74%) |
| 2 | every reply ends with done (revision 1 had made it worse: need-04 0/3), upsert instead of an Auto Scaling node, reminder line after the message with a budget note | 51 of 54 (94%) |
| 3 (final) | attachTo only for flagged products incl. "X on Y" products, own documents or data means a build (revision 2 sent a RAG ask to QwenWork), "closed region: draw in Singapore at once" | 49 of 54 (91%) in the full-suite rerun |

Per case (runs passed of 3): need-03 0, 3, 2, 2; edit-03 0, 2, 3, 3; mt-01 0, 1, 3, 3; ko-mt-01 0, 2, 3, 3; mt-03 0, 2, 3, 3; mt-04 0, 1, 3, 3; zh-edit-01 0, 3, 3, 3; pat-12 0, 2, 3, 2; mt-06 0, 2, 2, 1; zh-mt-01 0, 2, 2, 2; need-04 2, 0, 3, 3; the other seven cases end at 3 of 3. Cases with some run passing: 8 of 18 to 18 of 18. Judge sign-off on the 18: 8 to 15.

Full suite, final prompt (sha256 ee81494bff2d, 47,678 chars): pass@1 95%, pass@3 100%, majority 96%, all runs 89%, 228 of 240 conversations, assertions 99.6%. Judge sign-off 84% to 92.5%, mean 4.31 to 4.46. Warn-level orphans after repair 27 to 7 turns; invalid attachments before repair 14 to 7 turns; first op p50 2.0 s unchanged; cost per turn USD 0.0072.

Held-out (10 cases, 30 conversations, new wording and domains, run on the saved baseline prompt in an isolated tree and on the final prompt): 19 to 30 conversations (63% to 100%). The old prompt failed Auto Scaling on SAE 0/3, the Cline-in-VS-Code plan question 0/3, the team-agent question 1/3, residency in Korea 2/3, DDoS order 2/3; the over-correction check (Auto Scaling still attached to ECS) passed 3/3 both times.

Regressions and residual failures in the final run: 9 cases below 100%. On the 62 cases that passed all baseline runs, 179 of 186 conversations still pass; the seven failures are ko-pat-04 and zh-pat-04 (Dify on ACK as an attachment, 1/3 each), need-06 and need-07 (one each), trap-07-icp (provider content filter). Remaining baseline failures: mt-06 1/3, zh-mt-01 2/3, pat-12 2/3 (Fraud Detection), need-03 2/3 (no question once).

Caveats: tuning was in-sample on the 18 cases; the held-out cases were written after the classes were known; the 62 unchanged cases are a selected group, so they can only drop; N is 3 per case at default temperature (mt-02 failed once in 5 reruns without a cause); v2 assertions came after the baseline.

## 7. Cost

USD 10.00 list price over 1,383 recorded calls: qwen3.8-max 7.65, kimi-k3 judge 1.98 (priced conservatively at 3 and 15 per million), qwen3.7-max fallback 0.22, judge probes 0.15, flash 0.004. Baseline model USD 2.27 plus judge 0.61; final run model USD 2.22 plus judge 0.59. The guard was USD 30.

## 8. Qwen offload log and quality control

Eight calls, USD 0.17 list price (`node tools/qwen/ask.ts --usage` for the shared log: qwen3.8-flash 7 calls, 1,720 prompt and 628 output tokens, USD 0.001; qwen3.8-max 46 calls, 68,737 prompt and 36,661 output tokens, USD 0.357, which include other engineers' calls).

| task | model | what came back | what I did |
|---|---|---|---|
| 12 extra cases from a spec | qwen3.8-max | 10 cases; both five-turn cases had only turn 1; the two translated cases were missing | rejected, re-asked for the two multi-turn cases (5 turns each, accepted after a turn-by-turn check); kept the 8 English cases unchanged after checking every assertion against the spec and the catalog ids |
| 2 translations | qwen3.8-flash | Korean and Chinese asks that left "Shanghai" in English and used 大陆 and 区域 | corrected by hand to 상하이 리전, 中国本土 wording and 上海地域 |
| 74 unit tests for assertions and summary | qwen3.8-max | 660 lines, 73 passed first time | fixed a wrong percentile expectation (p50 is 4, p95 76) and invalid fixtures (severity "warning", fit "secondary"); read every test |
| 10 held-out cases | qwen3.8-max | all 10 matched the spec | accepted; dropped the `of` links |
| summary tables | qwen3.8-flash | 10 rows of category and language tables | all 80 cells checked against summary.json, 0 mismatches, used unchanged |
| report prose | qwen3.8-max | 7 sections | rejected about eight statements: why-language described as "why it chose that language"; first-say latency called first-token latency; invented causes ("truncating diagram edges", "requirements contradicted each other"); wrong reasons for the mt-01 and mt-04 failures; Dify side effect assigned to the wrong revision; irrelevant examples; an unsupported ratio; a garbled judge caveat. I rewrote those parts from the stored data |

I also caught an error of my own while checking the draft: the input I gave Qwen contained an unchecked aside about the invalid-attachment class (13 of 14 Auto Scaling, one Dify). The data say 12 Auto Scaling, one ai-guardrails, one PrivateZone, and no Dify in the baseline; the report uses the checked numbers.

## 9. Limitations

One Saturday midday window, concurrency 3, a client in Korea; timings are optimistic. One judge model, one judged run per case. The suite measures this catalog version and this tool's rules, not general Alibaba Cloud knowledge. The rubric is R2ABench-style but not the benchmark itself.
