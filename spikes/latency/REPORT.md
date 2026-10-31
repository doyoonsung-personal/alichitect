# Latency and cache test matrix

Measured on the user's Model Studio key against `dashscope-intl.aliyuncs.com` (Singapore), 2026-10-31. Every table can be regenerated from the raw JSONL with `node spikes/latency/analyze.ts`.

## Summary

I wrote spikes/latency/run.ts, a plain-fetch SSE harness with a budget guard and cross-process pacing, plus prompts.ts and analyze.ts. With it I ran all seven matrix cells on qwen3.8-max via dashscope-intl, plus extras: a 12k soak, flash TTFT, a test with the earlier filler prompt, chat-history caching and long-idle probes. Every call was measured and recorded: 312 calls, 0 errors, 0 HTTP 429, never more than 4 in flight, $3.18 at list price. The findings and recommendations are below, and `node spikes/latency/analyze.ts` reprints every table from the raw JSONL.

The window was Saturday 2026-10-31, 00:25:38-01:04:58 UTC (09:25-10:05 KST), and it was quiet. Warm TTFT ran p50 1.2-1.3 s and p95 1.8-1.9 s. Cold was only slightly slower: p95 1.83 s at 12k and 2.54 s at 24k. No warm call went over 10 s; the worst took 7.19 s, nearly all of it server time. Friday's 13.9 s cold start and 125.6 s stall came from load at the time, not the prompt: the same filler prompt started cold in 1.8-3.1 s today. The server sends response headers with the first token, so first byte equals first token.

Explicit cache_control works on dashscope-intl compatible mode, and usage reports the creation fields. Its 5-minute TTL held (warm after 1 and 3 min, re-created after 5.5 and 8). It bypasses the implicit cache, which outlived it (98% warm at 20 min, 93% at 27, 17% at 31, 0% at 37). Both modes give the same latency. A single marker on the system block alone leaves the chat history uncached, so follow-ups cost about twice as much as with no marker.

On real diagram turns, qwen3.8-max reached the first op at p50 1.58 s and finished 8 of 8 in 36-43 s. qwen3.8-flash ended early without the closing 'done' op in 8 of 12 runs; qwen3.7-max with enable_thinking:false completed 3 of 3, so it is the recommended fallback. reasoning_effort:"none" behaves exactly like enable_thinking:false. Four parallel warm 24k calls added about 0.3 s TTFT, with no 429.

Workspace endpoint: Model Studio's recommended production endpoint is a hostname unique to the workspace that owns the key (https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com). The docs promise a 3600 s timeout, traffic isolation and new features, and it accepts only that workspace's keys. We lack the WorkspaceId (shown in the Model Studio console), so it is untested. All numbers here are from the shared dashscope-intl domain, and setting LAT_BASE_URL reruns the same cells against the workspace host.

## Measurements

- WINDOW: 2026-10-31 00:25:38-01:04:58 UTC (09:25-10:05 KST, Saturday). 312 calls, all on dashscope-intl.aliyuncs.com. At most 4 in flight (checked from the start/end times in the records). Client in Korea: client TTFB minus server req-cost-time was p50 95 ms, p95 440 ms; GET /models took 117 ms warm and 461 ms on a new connection.
- PROMPT SIZES (from usage): ~12k = 12,115-12,137 prompt tokens; ~24k = 23,893-23,911. The nonce prompts all reported cached_tokens 0. The text is realistic catalog rows (seed catalog, offerings map, plus seeded detail rows), at 3.81-3.86 chars/token.
- FIRST BYTE = FIRST TOKEN: across 309 calls, first byte and first content token differ by at most 0 ms, and headers by at most 2 ms. The server holds the response headers until the first token.
- TTFT TABLE, seconds (n | p50 | p90 | p95 | max):
  - 1 cold 12k: 10 | 1.30 | 1.50 | 1.55 | 1.60
  - 1 cold 24k: 10 | 1.71 | 1.82 | 1.86 | 1.89
  - 2 warm implicit 12k: 30 | 1.06 | 1.36 | 1.43 | 2.39
  - 2 warm implicit 24k: 30 | 1.30 | 1.43 | 1.51 | 1.67
  - 3 warm explicit 24k: 30 | 1.21 | 1.35 | 1.46 | 1.91
  - 7 concurrent x4 implicit 24k: 12 | 1.57 | 1.84 | 1.88 | 1.88
  - 7 concurrent x4 explicit 24k: 12 | 1.63 | 1.78 | 1.79 | 1.80
  - soak explicit 12k: 40 | 1.17 | 1.42 | 1.67 | 1.98
  - soak implicit 12k: 40 | 1.25 | 1.54 | 1.64 | 1.79
  - flash cold 12k: 5 | 1.32 | 2.03 | 2.13 | 2.22
  - flash warm 12k: 10 | 1.21 | 2.20 | 2.39 | 2.57
  - old filler prompt, cold 24k: 2 | 2.46 | - | - | 3.14
- POOLED qwen3.8-max sequential calls by actual cache state (n | p50 | p90 | p95 | max):
  - cold 12k: 17 | 1.35 | 1.69 | 1.83 | 2.28
  - cold 24k: 26 | 1.79 | 2.32 | 2.54 | 3.14
  - hit 12k: 118 | 1.19 | 1.55 | 1.81 | 2.58
  - hit 24k: 76 | 1.27 | 1.66 | 1.92 | 7.19
- STALLS: none. 0 of 251 warm calls had TTFT over 10 s; 0 hedges fired; 0 errors, timeouts or 429s. Five calls (of 309) exceeded 3 s, all UTC:
  - 00:28:08.7 warm 24k implicit decay probe: 7.19 s (server req-cost-time 7,100 ms)
  - 00:32:18.5 warm 24k explicit verify: 3.68 s
  - 00:34:19.9 flash cold 12k warm-up: 4.59 s
  - 00:39:50.1 flash cold 12k diagram run 1: 3.12 s
  - 00:59:18.1 old filler prompt, cold 24k: 3.14 s
  Earlier, from research/probes/results2.txt and the probe output file times: K2 warm stall of 125.6 s and K1 cold start of 13.9 s, on 2026-10-30 at about 08:27-08:30 UTC.
- EXPLICIT CACHE IS HONOURED: the first marked call reported cache_creation_input_tokens 23,875 (equal to cache_write_tokens and cache_creation.ephemeral_5m_input_tokens), with cache_type 'ephemeral' and cached_tokens 0. The next 30 marked calls each read 23,875 cached tokens. Discrimination test: the same prefix was warm implicitly first (23,552 cached), yet the first marked request was still a creation, so the two modes are mutually exclusive.
- CACHE DECAY at 24k (cached tokens after the idle gap):
  - explicit: 1 min hit (23,874), 3 min hit (23,876), 5.5 min re-created (23,878 created), 8 min re-created (23,876 created)
  - implicit: 1, 3, 5.5 and 8 min all hit (23,552)
  - implicit late probes: 19.6 min 23,552 of 23,915; 27.2 min 11,264 of 12,120; 30.9 min 2,048 of 12,119; 36.6 min 0 of 23,911
  The implicit cache lasts roughly 25-30 min and evicts gradually.
- CACHE COVERAGE: implicit caches 11,904 of 12,120 tokens and 23,552 of 23,896 on qwen3.8-max (in steps); flash caches 11,264 of 12,117. Explicit caches the exact marked block: 12,099 and 23,875.
- PRICES, input per call in USD (12k | 24k):
  - cold: 0.0243 | 0.0478
  - implicit hit: 0.0034 | 0.0066
  - explicit creation: 0.0303 | 0.0597
  - explicit hit: 0.0021 | 0.0041
  The output of 32 tokens adds $0.0002.
- MULTI-TURN CACHING (12k system + 2 real exchanges + current graph), input cost per follow-up:
  - implicit: $0.0041 (15,232 of 15,370 cached); next turn with history grown, $0.0076 (13,312 cached)
  - single marker on the system block: $0.0086 (only 12,099 cached; the history is billed in full)
  - two markers (system block + last history message): $0.0046 (14,284 cached); after moving the marker on the grown turn, $0.0048 (14,284 cached + only 86 created)
- DIAGRAM TURNS, e-commerce ask, ~12k prompt (12,169 tokens), max_completion_tokens 4096:
  - qwen3.8-max explicit, 8 runs: TTFT 0.76-1.59 s; first op p50 1.58 s, max 2.05 s; first node p50 2.60 s; total 36.0-43.2 s (p50 38.2 s); 1,861-2,224 output tokens; 57-68 ops; 0 bad lines; 8 of 8 end with done; 54 tok/s; max chunk gap 1.24 s; max line gap 1.73 s; $0.013-0.016 warm, $0.043 cold
  - qwen3.7-max, enable_thinking:false, 3 runs: first op 1.54-2.37 s; 27.1-28.4 s; 42-50 ops; 3 of 3 done; no reasoning
- FLASH ENDS EARLY: 8 of 12 qwen3.8-flash diagram turns finished with finish_reason 'stop' and full usage but no done op (the model ended on its own; the stream was not cut). Three stopped after 0-3 ops (one mid-JSON string), three after 7-13 ops and two after 44-45 ops. It happened in every setup: 3 of 4 with the explicit 12k prompt, 2 of 4 with implicit 12k, 3 of 4 with the bare 1.2k probe prompt.
- PARAMS: on qwen3.8-max, reasoning_effort:'none' (TTFT 0.92 and 1.07 s) matched enable_thinking:false (2.58 and 1.07 s): 0 reasoning chars and tokens, the same prompt tokens and the same cache hits (11,904). qwen3.7-max (alias) with enable_thinking:false returned HTTP 200, TTFT 0.98-1.02 s and no reasoning; its implicit cache works (1,152 and 11,520 tokens cached).
- CONCURRENCY: 3 rounds per cache mode of 4 parallel warm 24k calls. TTFT 1.44-1.88 s, about 0.3 s above the sequential p50; server req-cost-time p50 was unchanged (1.18-1.22 s); all 24 calls hit; no 429 from the ~96k-token burst. TTFTs within a round often matched to 10 ms, which suggests server-side batching.
- IDLE GAPS (for the idle watchdog), max line gap: today's qwen3.8-max turns 1.73 s (max chunk gap 1.24 s); qwen3.7-max 1.39 s; Friday's recorded streams with thinking off 1.83 s, and 2.88 s with thinking_budget 1024.
- SPEND at list price: $3.1801 of $4. By cell: cold 0.7245, decay 0.6315, warm 0.3834, soak 0.2908, diagram 0.2761, concurrency 0.2518, explicit 0.2435, history 0.1367, control 0.0967, late 0.0804, params 0.0453, flash 0.0142, smoke 0.0051. qwen3.7-max ($0.128 for 5 calls) is overstated because its cached tokens are billed at the full $2.5/M.
- KEY SAFETY: 25 output files and logs scanned; none contain the key or its prefix, and none contain a 'Bearer sk-' string.

## Recommendations

- RECOMMENDED FIRST-TOKEN WATCHDOG, warm (prefix expected in cache): at 5 s with no token, send one identical hedge request and keep whichever streams first; at 15 s, abort both and fall back. Basis: warm p95 1.81 s (12k) and 1.92 s (24k), max 7.19 s; a 5 s hedge would have fired on 1 of 251 warm calls. The first byte arrives with the first token, so one timer covers both.
- RECOMMENDED FIRST-TOKEN WATCHDOG, cold (first call on a prefix, explicit cache idle over 5 min, implicit idle over 20 min): no hedge; at 20 s, abort and fall back. Basis: cold p95 1.83 s (12k) and 2.54 s (24k), max 3.14 s today, against 13.9 s at 24k under Friday load. A duplicate cold request waits behind the same prefill queue, so hedging it only doubles the cost.
- SUPERSEDED (see spikes/REVIEW.md): in the eval baseline later the same day, one provider stall hit 5 warm turns. The 5 s same-model hedge won 0 of 6 times, and the qwen3.7-max fallback answered all 5 with a first token in 1.2-1.7 s. Phase 1 therefore drops the same-model hedge and fails over to qwen3.7-max after about 8 s without a first token (the slowest good first token seen was 5.64 s). Re-measure at a weekday peak before fixing the numbers.
- RECOMMENDED IDLE WATCHDOG: 10 s between chunks after the first token. On trip, resend once as a continuation (the ops applied so far go in as CURRENT DIAGRAM), then fall back. Also cap the whole turn at 120 s: a diagram took 36-43 s, and 4096 tokens at 54 tok/s is about 76 s. Basis: max chunk gap 1.24 s, max line gap 1.73 s (2.88 s with a thinking budget).
- KEEP-WARM: not needed now. Cold starts add only about 0.15 s (12k) and 0.5 s (24k) at p50 today, and the implicit cache stays warm through 20-27 min idle. Pings would cost about $0.031/h (explicit, every 4 min) or $0.014/h (implicit, every 15 min), roughly $10-23 a month around the clock. Revisit if a weekday-peak run shows cold p90 over 5 s; then ping only in business hours, with the exact production prefix.
- FALLBACK MODEL: the qwen3.7-max alias (never its -preview or dated snapshots, which are thinking-only). Settings: enable_thinking:false at the top level, max_completion_tokens 4096, stream with include_usage, the same messages. Abort if any reasoning_content arrives. Expect a cold first call, since caches are per model. Measured 3 of 3 complete; price $2.5/$7.5. Not qwen3.8-flash for drawing (8 of 12 incomplete). For every model, treat a stream that ends without a done op as truncated.
- CACHING: use implicit (no marker) for v1 team/demo traffic. It has no 125% creation charge, lasts 20-27 min idle, and caches the history automatically. Once traffic is steady, move to two explicit markers: one on the system block and one on the newest history message, moved each turn (only the delta is billed at 125%). Never use a single marker on the system block for chat: it leaves the history uncached at full price, about twice the follow-up cost. This differs from FEASIBILITY.md, which plans one marker on the catalog block.
- HARNESS: TTFT is the first non-empty delta.content. Each call also records headers, first byte, first NDJSON line and first node times; full usage; the gateway timing headers (x-request-id, req-arrive-time, resp-start-time, req-cost-time); and the response id. Percentiles use linear interpolation. A call counts as a hit when cached tokens are at least half the prompt.
- PROMPTS: the probe system prompt is extracted verbatim from research/probes/probe.mjs at load time, not copied, so it cannot drift. The padding is real research rows plus seeded detail rows, with a nonce on the first line so the builder is deterministic per nonce. That lets late probes rebuild a prefix exactly; this is checked against a sha256 prefixId.
- MEASUREMENT HYGIENE: 64 distinct user asks, so no two calls on one prefix were identical. The diagram runs deliberately repeat the specified e-commerce ask. Big prompts start at least 2.5 s apart across processes via a pace file. Cold, concurrency, control and history ran alone; the other cells overlapped, never above 4 in flight. Each decay gap ran as its own foreground script, under 8.4 min.
- EXTRA CELLS beyond the matrix, all within budget, were added because they decide recommendations:
  - soak: n=80 at the real 12k size
  - control: Friday's filler prompt, to explain the earlier 13.9 s and 126 s numbers
  - history and history-grow: the explicit vs implicit choice for multi-turn chat
  - qwen3.7-max diagram turns and flash diagnostics: the fallback choice
  - late probes: the implicit cache's lifetime
- STOPPED SPENDING at $3.18, leaving margin under the $3.80 hard stop. The planned 55-min late probes were skipped once the 37-min probe was already fully cold.

## Caveats

- QUIET WINDOW ONLY: everything was measured over 40 minutes on a Saturday morning in Asia. Friday afternoon showed 13.9 s cold starts and a 125.6 s stall, so today's p95s are an optimistic baseline, not a guarantee. A weekday-peak rerun is needed before the thresholds are final.
- WORKSPACE-DEDICATED ENDPOINT UNTESTED: https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1 needs the WorkspaceId from the Model Studio console, and a key from that workspace. The dashscope-intl responses carry an x-dashscope-timeout: 3600 header, against the 600 s in the docs; this is observed, not verified.
- qwen3.8-flash often ends a diagram without the done op (8 of 12), with finish_reason 'stop' and normal usage. This contradicts the FEASIBILITY plan to fall back to flash. The cause is unknown (it is not cache mode or prompt size), and it was not tested on short tasks such as rolling summaries.
- The 5-minute explicit TTL makes explicit caching more expensive than implicit at low traffic: each re-creation after an idle of 5-30 min costs about $0.027 more than the implicit hit would have. The FEASIBILITY design (one explicit marker on the catalog block) also leaves chat history uncached. The src/prompt.ts owner (eval) should adopt the caching rule in decisions.
- SMALL SAMPLES in some cells: cold has 10 per size, so its p95 is interpolated from the top two values; qwen3.7-max had 3 diagram turns; flash had 12 diagram turns and 15 TTFT calls. The hedge-on-stall path was never exercised, because no stalls occurred.
- COSTS: list prices; the free quota may make the real bill lower. qwen3.7-max cached tokens are billed at the full $2.5/M (its cache price was not researched), so its $0.128 is an overstatement. Two concurrently running processes can each overshoot the budget guard by one call (about $0.06).
- The 24k prompts contain seeded, generated detail rows that look like catalog facts but are not verified. They are padding for timing only and must never be used as catalog content.
- The client is in Korea; a Singapore backend would see about 80-90 ms less TTFB (network p50 95 ms).

## Cost

USD 3.18 at Singapore list price over 312 calls, recomputed from the usage fields in results/*.jsonl; the budget was 4.00. By model: almost all of it is qwen3.8-max; qwen3.8-flash is about $0.02; qwen3.7-max is $0.128 (conservative).

## Files

- `spikes/latency/run.ts`
- `spikes/latency/prompts.ts`
- `spikes/latency/analyze.ts`
- `spikes/latency/package.json`
- `spikes/latency/results/smoke.jsonl`
- `spikes/latency/results/cold.jsonl`
- `spikes/latency/results/warm.jsonl`
- `spikes/latency/results/explicit.jsonl`
- `spikes/latency/results/decay.jsonl`
- `spikes/latency/results/diagram.jsonl`
- `spikes/latency/results/params.jsonl`
- `spikes/latency/results/concurrency.jsonl`
- `spikes/latency/results/flash.jsonl`
- `spikes/latency/results/soak.jsonl`
- `spikes/latency/results/late.jsonl`
- `spikes/latency/results/control.jsonl`
- `spikes/latency/results/history.jsonl`
