# LLM-to-diagram streaming protocol, grounding strategy and incremental editing

Researched 2026-10-31 by one agent, then fact-checked by an independent agent that tried to refute each load-bearing claim. 21 findings; fact-check verdicts: 7 partially-true, 6 confirmed. Findings without a verdict were high-confidence and not load-bearing, so they were not re-checked.

## Summary

Recommended protocol: NDJSON ops in plain message content, with thinking explicitly turned off. It is the only option measured end-to-end on the user's key. With qwen3.8-max the first op arrived at 2.1 s and a 21-node diagram finished in 35.7 s. Across 16 NDJSON-mode runs, 0 of 269 lines were malformed. Edits finished in 3.1-12.2 s with stable IDs, and the model narrates through "say" lines that interleave naturally. The other options are worse:
- One tool call per op: 225 s of reasoning, then only 3 calls, with agent-loop behaviour.
- Single array-typed tool: DashScope's tool_stream defaults to false, so array/object arguments arrive in one piece.
- Single JSON document parsed while streaming: one bad token blocks every later op. In a fault-injection test only 18-21 of 57 ops rendered, and the international docs say json_schema is "not supported yet" for Singapore models.
- JSON Patch: 19-21% more output.
- Full regeneration: 2.1-11.4x more output per edit.
Thinking must be disabled on every request: qwen3.8-max has it on by default, and @ai-sdk/alibaba leaves the flag out unless you set it. For grounding, put the whole catalog in a system prompt with an explicit cache marker, not RAG or a search tool. Explicit cache reads cost $0.17/M against $2/M uncached. A 24k-token prompt took 13.9 s to first token cold and 1.0-2.8 s warm, with one stall of 125.6 s. The catalog must carry placement and path metadata. I replayed the measured outputs offline:
- The model put regional managed services inside the VPC in every diagram (2-10 per diagram).
- DNS appeared in the data path in all 4 diagrams.
- A 1k thinking budget did not fix this (10 misplacements against 7 without thinking).
- Deterministic server rules fixed all the containment errors.
Four protocol changes remove most of the remaining error classes and about 40% of edit ops: cascade deletes, an insert-into-edge op, a zones attribute on one logical node, and a buffer for edges that arrive before their nodes. The backend is a small Hono/Node SSE proxy in Singapore. Function Compute web functions support SSE with up to 86,400 s runtime, and Vercel sin1 allows 300 s (Hobby) or 800 s (Pro). Add heartbeats, a first-byte watchdog and a fallback model. Verdict: feasible, with no hard blockers in this area.

## Findings

### F1 (high confidence, load-bearing)

An NDJSON op stream in plain message content (one compact JSON op per line, applied when the line completes) is the best-measured protocol. qwen3.8-max with enable_thinking:false: first byte 1.5 s, first op 2.1 s, 57 ops (6 say, 9 group, 21 node, 20 edge, 1 done) in 35.7 s at about 53 tok/s; ops arrive about every 0.6 s; quartiles 10.1/18.2/27.6 s. 0 malformed lines in 269 NDJSON lines across 16 runs. A line parser that ignores chunk boundaries gave identical op sequences under 500 random chunkings per run. Narration interleaves as say ops at section boundaries (6 per diagram).

**Implication:** Adopt NDJSON as the wire format between model and server. Do not use response_format: json_object would force a single JSON document. The server line-buffers content deltas, validates each op and forwards it, so the diagram grows from about 2 s.

**Fact-check:** partially-true. The core finding holds: with thinking off, qwen3.8-max streamed well-formed NDJSON with exactly the quoted timings. The robustness sample is narrower than stated, though. The 269 lines in 16 runs include 3 cache-probe one-liners (K1-K3) and 11 product-advice lines (D1, D3, D5). Diagram ops are 255 lines in 10 runs, and 9 of those runs use the same SEA e-commerce prompt (the 10th is the product query P1). The 500-chunking test ran on only 4 diagrams (F, G, H, E), and the buffer-until-newline parser is chunk-invariant by construction. The 'say' cadence was prompted (the system prompt asks for 'a short say before each section'), and E produced 4, not 6. 'Best' is only relative to tool calling with thinking ON. Thinking-off tool calls (a forced named tool plus tool_stream) and json_object streaming were never measured.

Fact-check sources: Re-ran C:/Users/mendo/AppData/Local/Temp/claude/C--Users-mendo-ali-catalog/35292bdb-ca0c-4df0-80b4-dd0f93723039/scratchpad/proto_eval/eval_protocol.mjs on probe/results.json + results2.json: F 57 ops, 0 malformed, 0/500 chunk mismatches (likewise G, H, E); My recount (scratchpad/fc_verify/count_lines.mjs): 19 runs, 270 non-empty lines, 1 malformed (C_max_tools prose). Excluding C: 269 lines in 16 runs, 0 malformed. Diagram-op runs only: F57+E58+G54+H36+B2+B2 2+B3 30+B4 8+B5 5+P1 3 = 255; scratchpad/probe/summary.txt F_max_nothink: first byte 1.5 s, first op 2.1 s, ops {say:6,group:9,node:21,edge:20,done:1}, ~53 tok/s, quartiles 10.1/18.2/27.6 s, last op 35.7 s; scratchpad/probe/probe.mjs RULES: 'Emit in drawing order ... with a short "say" before each section'. Round 1 ran A, F, E, C, D1 and D2 concurrently (Promise.all)

Sources: C:/Users/mendo/AppData/Local/Temp/claude/C--Users-mendo-ali-catalog/35292bdb-ca0c-4df0-80b4-dd0f93723039/scratchpad/probe/summary.txt (main-session live probe 2026-10-30); C:/Users/mendo/AppData/Local/Temp/claude/C--Users-mendo-ali-catalog/35292bdb-ca0c-4df0-80b4-dd0f93723039/scratchpad/probe/summary2.txt; C:/Users/mendo/AppData/Local/Temp/claude/C--Users-mendo-ali-catalog/35292bdb-ca0c-4df0-80b4-dd0f93723039/scratchpad/proto_eval/eval_protocol.mjs (offline replay 2026-10-31)

### F2 (high confidence, load-bearing)

Thinking is ON by default for qwen3.8-max and qwen3.8-flash; qwen-plus and qwen-flash default to OFF. With default thinking, a diagram request reasoned for more than 300 s without output. flash took 142.7 s to first content. Every drawing request must send enable_thinking:false. @ai-sdk/alibaba (resolveAlibabaThinking) sends no enable_thinking field unless providerOptions.alibaba.enableThinking/thinkingBudget or a custom `reasoning` is set, so the server default (thinking ON) applies. Its docs' '(default false)' is misleading for 3.8 models. reasoning_effort and thinking_budget cannot be combined on qwen3.8-max; reasoning_effort 'none' maps to enable_thinking=false.

**Implication:** Hard-code enable_thinking:false in the drawing and edit request builder. Add an integration test that fails if reasoning_content appears in a draw turn. With the AI SDK, always pass providerOptions.alibaba.enableThinking=false.

**Fact-check:** confirmed

Fact-check sources: https://www.alibabacloud.com/help/en/model-studio/deep-thinking.md (WebFetch 2026-10-31, Last Updated Oct 29, 2026): Qwen3.8 Max and Flash have 'thinking mode enabled by default'; Qwen Plus and Qwen Flash have 'thinking mode not enabled by default'; https://www.alibabacloud.com/help/en/model-studio/qwen-api-via-openai-chat-completions.md (WebFetch 2026-10-31, Last Updated Oct 23, 2026): for qwen3.8-max, reasoning_effort and thinking_budget 'cannot be set at the same time'; 'none is mapped to enable_thinking=False'; neither set means thinking_budget 131072 and effort xhigh; https://raw.githubusercontent.com/vercel/ai/main/packages/alibaba/src/alibaba-chat-language-model.ts (downloaded 2026-10-31): resolveAlibabaThinking returns {} unless providerOptions enableThinking/thinkingBudget or a custom reasoning is set; reasoning 'none' maps to {enable_thinking:false}; https://ai-sdk.dev/providers/ai-sdk-providers/alibaba (WebFetch 2026-10-31): enableThinking 'Defaults to false', which is misleading because the field is simply omitted; scratchpad/probe/summary.txt: A_max_default aborted at 300 s after 40,394 reasoning chars; E_flash_default first content at 142.7 s

Sources: https://www.alibabacloud.com/help/en/model-studio/deep-thinking (downloaded 2026-10-30, Last Updated Oct 29, 2026); https://www.alibabacloud.com/help/en/model-studio/qwen-api-via-openai-chat-completions (downloaded 2026-10-30, Last Updated Oct 23, 2026); https://raw.githubusercontent.com/vercel/ai/main/packages/alibaba/src/alibaba-chat-language-model.ts (downloaded 2026-10-30, read 2026-10-31); https://ai-sdk.dev/providers/ai-sdk-providers/alibaba (prior-run fetch 2026-10-30); probe/summary.txt runs A_max_default, E_flash_default

### F3 (high confidence)

How DashScope compatible mode streams tool calls. The first delta for a call carries index, id ('call_...'), type 'function', function.name and empty or partial arguments. Continuation deltas carry the same index, id as an EMPTY STRING (not omitted), name absent or None, and an argument fragment. The vercel/ai fixture also shows a trailing delta with arguments '' and id '', then a chunk with finish_reason 'tool_calls' and an empty delta, then a usage chunk with choices []. Calls are grouped by index; the docs' sample code concatenates arguments per index. Measured (thinking on): content prose first, then 3 sequential calls with 9-22 argument chunks each (about 16 on average). Known client quirks: translators that overwrite on any non-undefined value wipe id/name when the empty-string continuation arrives (deepseek-harness discussion #1500, Aug 2026). Clients that match by last id instead of index merge interleaved calls (Qwen-Agent PR #993, Oct 2026, open). parallel_tool_calls defaults to true. Qwen does not support tool_choice 'required', and in thinking mode tool_choice cannot be 'required' or an object. Docs recommend no more than 20 tools.

**Implication:** If tools are used anywhere (for example a console Q&A lookup tool), accumulate by index, keep the first non-empty id/name, and ignore empty-string updates.

Sources: https://www.alibabacloud.com/help/en/model-studio/qwen-function-calling (downloaded 2026-10-30, Last Updated Oct 27, 2026; sections 'Streaming output', tool_choice notes, 'no more than 20 tools'); https://raw.githubusercontent.com/vercel/ai/main/packages/alibaba/src/__fixtures__/alibaba-tool-call.chunks.txt (downloaded 2026-10-30); https://github.com/deepseek-ai/deepseek-harness/discussions/1500 (prior-run fetch 2026-10-30); https://github.com/QwenLM/Qwen-Agent/pull/993 (prior-run fetch 2026-10-30); probe/results.json run C_max_tools (tool chunk counts, read 2026-10-31)

### F4 (high confidence, load-bearing)

tool_stream (default false; supported for the qwen3.8-max and qwen3.7-max text modality, among others) controls COMPLEX tool parameters (array or object types). With false they are 'output at once' ('complex formats are more accurate'); with true they stream. Scalar string parameters stream whenever stream=true.

**Implication:** A tldraw- or next-ai-draw-io-style single tool with an operations array would NOT draw progressively on DashScope unless tool_stream:true, which also gives up DashScope's stated accuracy advantage. This further rules out tool-based framing for live drawing.

**Fact-check:** confirmed

Fact-check sources: https://www.alibabacloud.com/help/en/model-studio/qwen-api-via-openai-chat-completions.md (WebFetch 2026-10-31, Last Updated Oct 23, 2026): tool_stream default false, takes effect only with stream=true; 'qwen-max series: text modality of the qwen3.8-max and qwen3.7-max series'; 'tool_stream only affects complex tool parameters'; normal parameters stream whenever stream=true; Same page: tool_stream=false outputs complex parameters at once ('complex formats are more accurate'); true streams them; Nuance: the doc defines 'complex tools' as tools with any array/object parameter, so whether scalar parameters inside such a tool stream with tool_stream=false is ambiguous. qwen3.8-flash is listed only for 'omni-modality'; Unchanged between the copies in scratchpad/docs (2026-10-30) and scratchpad/fresh_ms (2026-10-31)

Sources: https://www.alibabacloud.com/help/en/model-studio/qwen-api-via-openai-chat-completions (downloaded 2026-10-30, Last Updated Oct 23, 2026; tool_stream parameter)

### F5 (high confidence, load-bearing)

One tool call per op is impractical. Measured with default thinking: 224.5 s of reasoning (7,705 tokens), then one prose sentence, then only 3 tool calls (say, add_node, add_node) and finish_reason=tool_calls. The model treats tools as an agent loop and expects tool results, so a full diagram needs many round trips. Tool mode cannot be forced (no 'required'). Tool mode with thinking off was not measured.

**Implication:** Do not use function calling for drawing ops. Keep tools out of the drawing request entirely; tool definitions also become part of the cached system prefix.

**Fact-check:** partially-true. The measured run is confirmed: with thinking ON, 224.5 s of reasoning (7,705 tokens), one prose line, 3 tool calls (say, add_node, add_node), finish_reason=tool_calls. But 'impractical' is shown only for thinking-ON tool mode, and 'cannot be forced' is wrong. With thinking off, tool_choice {"type":"function","function":{"name":...}} forces a specific tool. Only 'required' is unsupported for Qwen, and thinking mode rejects both 'required' and the object form. An untested alternative remains: one forced 'draw' tool with an ops array plus tool_stream:true (supported for qwen3.8-max text modality).

Fact-check sources: scratchpad/probe/summary.txt C_max_tools: first content 224.5 s, reasoning 7,705, tool calls 3 {say:1, add_node:2}, finish=tool_calls; params [model, parallel_tool_calls], so thinking was at its default (ON); scratchpad/flat/qwen-api-via-openai-chat-completions.txt (lines 488-506): 'The Qwen series models do not support required'; forcing a named function documented; 'Thinking mode models do not support forcing a specific tool to be called'; scratchpad/flat/qwen-function-calling.txt (Last Updated Oct 27, 2026), 'Forced tool calling' section and line 2737: in thinking mode, tool_choice 'required' or object fails with an error

Sources: probe/summary.txt run C_max_tools (main-session live probe 2026-10-30); https://www.alibabacloud.com/help/en/model-studio/qwen-function-calling (downloaded 2026-10-30)

### F6 (medium confidence, load-bearing)

Structured output on DashScope. json_object is listed for Qwen3.8-Max, Qwen3.8-Flash and the 3.7 series without the '(non-thinking mode)' label that older series carry. The China-site page states that thinking models such as qwen3.8-max need no enable_thinking change for structured output, and points to thinking-model streaming. The error-code page still lists 'Json mode response is not supported when enable_thinking is true'. json_schema (strict) is limited to the Qwen3.7/3.8 series, but the international page states 'Singapore region models are not supported yet' in the JSON Schema section (Oct 29, 2026). The qwen3.8-max model page shows 'Structured Outputs: Supported' for Singapore (Oct 11, 2026), probably meaning json_object. The international page does not mention streaming. json_object requires the word 'json' in the prompt; docs advise not setting max_tokens. Partial mode (assistant-prefix continuation) is listed as Supported for qwen3.8-max in Singapore but not in thinking mode; streaming is not documented.

**Implication:** Approach (c) can't count on schema-constrained decoding with the user's Singapore key. json_object would guarantee syntax but forces a single document, which loses NDJSON's per-line isolation. Keep plain-text NDJSON. Optional experiment: json_object with {"ops":[...]} and @streamparser/json paths ['$.ops.*'], once a live probe confirms it streams incrementally.

**Fact-check:** confirmed

Fact-check sources: https://www.alibabacloud.com/help/en/model-studio/qwen-structured-output.md (WebFetch 2026-10-31): page now Last Updated Oct 30, 2026. JSON Schema list is Qwen3.7-Plus/Flash/Max and Qwen3.8-Max/Flash; 'Singapore region models are not supported yet.' sits under 'Getting structured output'; no streaming mention; Same Oct 30 version adds a Responses API example, client.responses.parse(model='qwen3.8-max', text_format=UserInfo), on the Singapore workspace URL with a comment saying Beijing, so the page contradicts itself on json_schema in Singapore; scratchpad/docs/zh-structured.html (China site): thinking models such as qwen3.8-max need no extra enable_thinking for structured output, plus a pointer to thinking-model streaming. No Singapore json_schema note; scratchpad/flat/error-code.txt (Oct 29, 2026) still lists 'Json mode response is not supported when enable_thinking is true'; scratchpad/flat/m_qwen3-8-max.txt (Oct 11, 2026), Singapore: Structured Outputs Supported, Prefix Completion Supported. Note that the partial-mode page (Oct 27) leaves the Qwen3.8 series out of its supported-model list

Sources: https://www.alibabacloud.com/help/en/model-studio/qwen-structured-output (downloaded 2026-10-30, Last Updated Oct 29, 2026; WebFetch returned empty and curl hit a bot challenge on 2026-10-31); https://help.aliyun.com/zh/model-studio/qwen-structured-output (China site, downloaded 2026-10-30; date not shown); https://www.alibabacloud.com/help/en/model-studio/error-code (downloaded 2026-10-30, Last Updated Oct 29, 2026); https://www.alibabacloud.com/help/en/model-studio/qwen3-8-max (downloaded 2026-10-30, Last Updated Oct 11, 2026); https://www.alibabacloud.com/help/en/model-studio/partial-mode (prior-run fetch 2026-10-30, Last Updated Oct 27, 2026); https://raw.githubusercontent.com/vercel/ai/main/packages/alibaba/src/supports-json-schema-output.ts (downloaded 2026-10-30)

### F7 (high confidence)

Blast radius of one bad token. I injected one malformed op (#21 of 57) into the measured F output: an unescaped quote in 'why', a missing closing brace, or trailing prose. A single {"ops":[...]} document parsed progressively with tldraw's closeAndParseJson stalls at 18-21 of 57 visible ops, and the final JSON.parse fails. NDJSON keeps 56-57 of 57; trailing prose is recovered by brace extraction. tldraw re-parses the whole buffer on every chunk and marks action N complete when action N+1 appears. The AI SDK warns that partial outputs from streamText cannot be validated; only elementStream yields complete, validated array elements.

**Implication:** Partial-JSON parsing is fine for a cosmetic preview, such as typing out the current say line, but not as the transport for graph state without constrained decoding.

Sources: C:/Users/mendo/AppData/Local/Temp/claude/C--Users-mendo-ali-catalog/35292bdb-ca0c-4df0-80b4-dd0f93723039/scratchpad/proto_eval/fault_injection.mjs (run 2026-10-31); https://raw.githubusercontent.com/tldraw/tldraw/main/templates/agent/worker/do/AgentService.ts and closeAndParseJson.ts (downloaded 2026-10-30, read 2026-10-31); https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data (prior-run fetch 2026-10-30)

### F8 (high confidence)

JSON Patch (RFC 6902) against an id-keyed graph needs 19-21% more output characters than domain ops on the same four measured diagrams (F 6,159 vs 7,368 chars). RFC 6902 evaluation 'SHOULD terminate' on the first failed op; it is designed to apply atomically, not progressively. Array-index paths shift after removes. 'Insert between', cascade delete and narration need several patch ops or a side channel.

**Implication:** Use domain ops on the wire. If needed, compile them to inverse ops or patches internally for undo/redo.

Sources: proto_eval/eval_protocol.mjs output (2026-10-31); https://www.rfc-editor.org/rfc/rfc6902 (prior-run fetch 2026-10-30); npm: fast-json-patch 3.1.1 last published 2022-03-24 (registry.npmjs.org, checked 2026-10-31)

### F9 (high confidence)

Full regeneration plus a client diff costs 2.1x (B3 Kubernetes swap), 5.1x (B4 add warehouse) and 11.4x (B5 drop chatbot) more output than the measured minimal edits, before counting why/say text. At about 53 tok/s, B5 (3.1 s measured) would take roughly 20 s or more. Model IDs and labels can drift between generations, which forces heuristic matching. Prior art: Excalidraw text-to-diagram regenerates the whole Mermaid each turn (last 3 messages plus the new prompt), re-renders the preview throttled at 300 ms (or 3 s when a render takes over 100 ms), and sends a repair prompt with the parse error and line. Aider calls 'whole' the 'simplest' format but notes it 'can be slow and costly'. Eraser stores AI output as diagram-as-code (unique node and group names); its docs don't say whether edits are diffs.

**Implication:** Use minimal-op edits. Keep regeneration only for 'start over'.

Sources: proto_eval/eval_protocol.mjs output (2026-10-31); https://github.com/excalidraw/excalidraw/tree/master/packages/excalidraw/components/TTDDialog (TextToDiagram.tsx, hooks/useMermaidRenderer.ts, hooks/useTextGeneration.ts downloaded 2026-10-30, last commit 2026-10-27); https://aider.chat/docs/more/edit-formats.html (prior-run fetch 2026-10-30); https://docs.eraser.io/ai-diagrams.md (opened 2026-10-31); https://docs.eraser.io/architecture-diagram-syntax.md (prior-run fetch 2026-10-30)

### F10 (high confidence, load-bearing)

The model makes systematic semantic placement errors that deterministic rules catch and fix (offline replay of the 4 measured full diagrams):
- Regional managed services (OSS, Model Studio, SLS, ARMS, CloudMonitor, Security Center, KMS, RAM and others) drawn inside the VPC group: F 7, G 10, H 2, E 2. A re-parenting rule fixed all of them (0 left).
- DNS drawn in the data path: 4 of 4 diagrams.
- WAF placed before ESA/CDN: F.
- Multi-AZ replicas wired unevenly: F ecs-a 11 edges vs ecs-b 1; G ack 10 vs ack-b 2.
A 1,024-token thinking budget did not reduce misplacement (G 10 vs F 7), though G avoided the WAF/ESA inversion. With the 43-product catalog, 0 unknown product IDs appeared.

**Implication:** Each catalog entry must carry placement (external|global|edge|region|vpc|saas), allowed container kinds and north-south path rank. The server validator auto-repairs containment and DNS edges. Placement of managed services should be decided by the client from catalog metadata, not by the model.

**Fact-check:** partially-true. The counts reproduce exactly: containment F 7, G 10, H 2, E 2; DNS edge in 4/4; WAF before ESA/CDN in F only; ecs-a 11 vs ecs-b 1; ack 10 vs ack-b 2; 0 unknown products. But they are judged against an illustrative placement table that flags defensible placements. Auto Scaling accounts for one in F, one in G and E's first item; the others in question are FC (E's second), KMS and Cloud Firewall (G). VPC-type scaling groups require vSwitches in one VPC, and KMS instances are bound to VPC vSwitches. The check is also one-directional. E drew PolarDB, Tair, RocketMQ and OpenSearch OUTSIDE the VPC, and nothing flagged it. Orphan nodes (F 2, G 5, H 3, E 1) are not checked at all. '0 left' is tautological, because the same rule both detects and repairs. DNS in the request path is a common diagram convention, not a correctness error. Finally, n=1 per configuration and the probe prompt gave no placement rules, so 'a 1,024-token budget did not reduce misplacement' is not established.

Fact-check sources: Re-ran scratchpad/proto_eval/eval_protocol.mjs: output matches the stated counts; auto-repair leaves 'containment warnings left: 0' by its own rule; My check scratchpad/fc_verify/reverse_containment.mjs (uses eval's own table): E has polardb, tair, rocketmq, opensearch outside the VPC; orphans F 2, G 5, H 3, E 1; B3 adds orphan ack-a and ack-b; https://www.alibabacloud.com/help/en/auto-scaling/use-cases/use-auto-scaling-sdks-to-create-multi-zone-scaling-groups.md (rev. Sep 21, 2026): 'A VPC-type scaling group requires at least one vSwitch'; vSwitches 'must belong to the same VPC'; https://www.alibabacloud.com/help/en/kms/key-management-service/developer-reference/api-kms-2016-01-20-updatekmsinstancebindvpc.md (Mar 12, 2026): KMS instances are enabled in a VPC and can be bound to further VPC vSwitches; scratchpad/probe/probe.mjs: system prompt offers group kind 'managed' and catalog tiers but no rule about what lives outside the VPC

Sources: proto_eval/eval_protocol.mjs output on probe/results.json and probe/results2.json (2026-10-31); probe/summary.txt and summary2.txt (main-session live probe 2026-10-30)

### F11 (medium confidence)

Protocol changes that remove the observed error classes:
- Cascade delete: removing a node removes its edges, and an unknown id is a no-op. In B3, 12 of 30 ops (40%, about 2.8 s of a 12.2 s edit) were explicit edge removals that cascade makes redundant.
- Pending-edge buffer: H's only structural error was an edge emitted one line before its target node; the buffer resolves it with no repair turn.
- insert op that splits an existing edge: 'add WAF' becomes one line instead of node + remove + 2 edges.
- zones:[...] on one logical node: removes replica-asymmetry wiring.
- node as upsert: same id updates the node.

**Implication:** Ship grammar v2 (see artifacts). Re-probe B3 and an 'add WAF between ESA and ALB' case on a diagram that lacks WAF to confirm the model follows the new rules. The measured WAF follow-up was moot: WAF already existed, and the model correctly answered with 2 ops in 3.5 s.

**Fact-check:** partially-true. The measured parts hold, with small fixes. In B3, the 12 edge removals that a cascade delete makes redundant are 12 of 30 ops (40%). They took 2.4 s (2.5 to 4.9 s), about 20% of the 12.2 s edit and about 20% of output characters, not 2.8 s. H's edge n-esa -> n-alb came two lines before n-alb (a say op sat between them), and a pending-edge buffer resolves it in replay. The insert op, zones attribute and node-upsert are untested design proposals. None of them addresses the dominant error classes (containment, DNS, WAF order), and whether the model would use new op types correctly is unmeasured.

Fact-check sources: eval_protocol.mjs B3: I-cascade-edge-removed 12, I-remove-noop-after-cascade 12; H: I-edge-pending 1, I-pending-edge-resolved 1; My computation from results2.json B3 lineTimes: 12 edge-removal lines, summed inter-arrival 2,429 ms of 12,246 ms; 394 of 1,957 content chars (20.1%); H op order printed from results2.json: 'group g-vpc' -> 'edge n-esa -> n-alb' -> 'say ...' -> 'node n-alb'

Sources: proto_eval/eval_protocol.mjs output (2026-10-31); probe/summary2.txt B3_k8s op list and H dangling edge

### F12 (high confidence, load-bearing)

Grounding cost and latency (qwen3.8-max, Singapore, International):
- Prices: input $2/M, output $6/M (same in thinking and non-thinking modes), implicit-cache hit $0.25/M, explicit cache creation $2.5/M, explicit cache read $0.17/M.
- Explicit cache: cache_control {type:'ephemeral'} on content blocks, at least 1,024 tokens, 5-minute TTL reset on hit, at most 4 markers, 20-block lookback. Tool definitions are cached inside the system message and must be byte-identical across requests. Explicit and implicit caching are mutually exclusive. qwen3.8-max and qwen3.8-flash are listed for Singapore.
- Measured with a 24k-token system prompt: cold TTFT 13.9 s; warm 1.0-2.8 s in 6 runs; one warm stall of 125.6 s.
- Follow-ups hit the implicit cache for 2,176 of 2,339 prompt tokens.
- qwen3.8-flash (Singapore): $0.15/M input, $0.47/M output, explicit read $0.016/M.

**Implication:** Put the full catalog as compact rows (about 40-60 tokens each; 300 products ≈ 12-18k tokens) in the system message with an explicit cache marker, and keep the cache warm with a tiny ping every 4.5 minutes or less (about $0.8/day at 15k tokens). Cost per new diagram is about $0.015-0.02; per edit about $0.006-0.01.

**Fact-check:** partially-true. Prices, cache mechanics and K-run latencies check out. One figure is overstated for real use: the 2,176-of-2,339 follow-up cache hit was measured on B3-B5, which re-sent the identical base state already sent by B and B2 (and ran in parallel). The first follow-ups that carried that state (B, B2) hit only 1,024 of 2,331-2,367 tokens. In a real chained session the state changes every turn, so expect roughly the system-prompt prefix (about 1.0-1.2k tokens) cached, not about 93%. Also, cache data is isolated per model and per account, so a fallback model starts cold.

Fact-check sources: scratchpad/flat/m_qwen3-8-max.txt (Oct 11, 2026), Singapore: input 2, output 6, implicit cache 0.25, explicit creation 2.5, explicit read 0.17 USD per 1M; model-pricing (Oct 29, 2026): 'Non-Thinking and Thinking modes ... $2 $6'; scratchpad/flat/m_qwen3-8-flash.txt (Oct 30, 2026), Singapore: 0.15 / 0.47 / implicit 0.016 / explicit creation 0.2 / explicit read 0.016; scratchpad/flat/context-cache.txt (Oct 27, 2026; same in the 2026-10-31 fresh copy): ephemeral, 1,024 tokens minimum, 5 minutes reset on hit, up to four markers, 20 content blocks, tools counted inside the system message, explicit and implicit 'mutually exclusive', 'Cache data is isolated between models'; scratchpad/probe/probe2.mjs follow() uses the same state for B3, B4 and B5; usage in results.json/results2.json: B 1024/2367 cached, B2 1024/2331, B3 2176/2339, B4 2176/2340, B5 2176/2332; summary2/summary3: K1 cold 13.9 s, K2 125.6 s stall, K3-K8 1.0-2.8 s

Sources: https://www.alibabacloud.com/help/en/model-studio/qwen3-8-max (downloaded 2026-10-30, Last Updated Oct 11, 2026; Singapore pricing table); https://www.alibabacloud.com/help/en/model-studio/qwen3-8-flash (downloaded 2026-10-30); https://www.alibabacloud.com/help/en/model-studio/context-cache (downloaded 2026-10-30, Last Updated Oct 27, 2026); https://www.alibabacloud.com/help/en/model-studio/model-pricing (downloaded 2026-10-30, Last Updated Oct 29, 2026); probe/summary2.txt and summary3.txt K1-K8 runs

### F13 (medium confidence, load-bearing)

RAG and search-tool alternatives:
- text-embedding-v4 (Singapore): $0.07/M, default 1,024 dims (64-2,048), 8,192 tokens per text, batch of 10.
- qwen3.7-text-embedding: Singapore-only, $0.07/M, batch of 20.
- qwen3-rerank: $0.1/M.
Embedding a 300-product catalog costs fractions of a cent. However, retrieval keyed on the user's need will not surface cross-cutting products the user never mentions (NAT, KMS, Cloud Firewall, monitoring). Retrieved text also varies per request, which breaks the cacheable prefix. A search_catalog tool adds at least one extra model round trip and cannot be forced (no tool_choice 'required'). Measured without a catalog, the model fell back to stale knowledge (Tongyi Lingma, never Qoder, even with forced web search); with Qoder in the catalog it answered in 2.5 s.

**Implication:** Leave RAG and tools off the drawing path. Use embeddings or lookup later only for deep-dive Q&A (limits, pricing, regions) in the console. The catalog presence of new products (Qoder etc.) is what decides correctness.

**Fact-check:** partially-true. The prices check out and so does the Qoder grounding result. Two arguments are wrong or overstated. (1) A search_catalog tool CAN be forced when thinking is off, via a named tool_choice. Retrieval also need not be a model tool at all: server-side embed-and-retrieve adds an embedding call, not an LLM round trip. (2) Retrieved text appended after the static system prompt leaves that prefix cacheable; only the appended part misses. 'Singapore-only' for qwen3.7-text-embedding comes from the international model page. Model Studio's llms.txt lists its embedding API for Beijing, Singapore and Hong Kong (CNY 0.525/M in Singapore).

Fact-check sources: https://www.alibabacloud.com/help/en/model-studio/embedding.md (WebFetch 2026-10-31, Oct 27, 2026): text-embedding-v4 dims 2,048..64 with 1,024 default, 8,192 tokens per text, batch 10, Singapore $0.07; qwen3.7-text-embedding batch 20, Singapore $0.07; https://www.alibabacloud.com/help/en/model-studio/qwen3-7-text-embedding.md (WebFetch 2026-10-31, Oct 11, 2026): lists only Singapore, $0.07 per 1M; scratchpad/flat/model-pricing.txt (Oct 29): text-embedding-v4 Singapore $0.07; qwen3-rerank Singapore $0.1; scratchpad/fresh_ms/ms_llms.txt (fetched 2026-10-31): qwen3.7-text-embedding 'Beijing/Singapore/Hong Kong', 'CNY 0.5 ... (Beijing) or 0.525 (Singapore)'; also 'Qoder CN (formerly Lingma)', which confirms 'Tongyi Lingma' is a stale name; scratchpad/probe/summary2.txt and summary3.txt: D3, D5, D6 recommend Tongyi Lingma and never Qoder; P1 recommends Qoder (done at 2.5 s); scratchpad/flat/qwen-api-via-openai-chat-completions.txt: forcing a named function is documented for non-thinking mode

Sources: https://www.alibabacloud.com/help/en/model-studio/embedding (prior-run fetch 2026-10-30, Last Updated Oct 27, 2026); https://www.alibabacloud.com/help/en/model-studio/model-pricing (downloaded 2026-10-30; text-embedding-v4 Singapore $0.07, qwen3-rerank $0.1); probe/summary2.txt P1_team_grounded, D3, D5; summary3.txt D6

### F14 (high confidence, load-bearing)

Stateful editing works when the current graph is resent each turn. The compact state (ids, product, label, group/parent, edges; no 'why') was 3,469 chars (about 1k tokens) for 9 groups, 21 nodes and 20 edges. In 3 edits the model reused existing IDs with 0 unknown-id references and emitted only deltas: 30, 8 and 5 ops in 12.2, 7.5 and 3.1 s. The probe compacted the previous assistant turn to a done stub and put the state in the last user message, which keeps the history prefix cacheable. The Model Studio Responses API also supports previous_response_id (valid 7 days), but on qwen3.8-max it uses reasoning.effort and not thinking_budget.

**Implication:** Use stateless Chat Completions. The browser owns the canonical graph and sends it each turn; the server re-validates it and caps its size. Compress history to say/done text; leave reasoning_content out of history, because preserve_thinking defaults to true on qwen3.8-max and bills it as input.

**Fact-check:** confirmed

Fact-check sources: eval_protocol.mjs: 'compact state re-sent each follow-up turn: 3469 chars for 9 groups, 21 nodes, 20 edges'. State keys are group {id,kind,label,parent}, node {id,product,label,group}, edge {id,from,to,label}, with no 'why'; eval_protocol.mjs B3/B4/B5: no E-remove-unknown and no unknown ids; 30, 8 and 5 ops; summary2.txt: 12.2, 7.5 and 3.1 s; scratchpad/probe/probe2.mjs follow(): [system, ASK_1, assistant done stub, user 'CURRENT DIAGRAM:'+state+ask]; scratchpad/flat/compatibility-with-openai-responses-api.txt (Oct 19, 2026): 'Each response id is valid for 7 days'; the qwen3.8-max example 'uses reasoning.effort ... does not support thinking_budget'; Caveats: the 3 edits all branch from the same base (not chained) and ran concurrently; B3 left ACK worker nodes ack-a and ack-b with 0 edges; B4 raised containment warnings from 7 to 10

Sources: probe/probe2.mjs follow() message layout (read 2026-10-31); probe/summary2.txt B3/B4/B5; https://www.alibabacloud.com/help/en/model-studio/compatibility-with-openai-responses-api (downloaded 2026-10-30, Last Updated Oct 19, 2026)

### F15 (high confidence, load-bearing)

Reasoning vs speed (measured):
- max, thinking off: first op 2.1 s.
- max, thinking_budget 1024: first content 6.6 s, first op 7.5 s, 54 ops in 40.5 s, 243 reasoning tokens.
- flash, thinking off: first op 1.2 s, 36 ops in 20.3 s (14 nodes) with an out-of-order edge.
- flash, default thinking: first content at 142.7 s.
A flash-draft-then-max-refine design gains only about 0.9 s and causes visible churn as nodes are replaced. Reasoning streams in reasoning_content before content.

**Implication:** Default design:
- One pass of qwen3.8-max with thinking off.
- Deterministic repairs.
- At most one thinking-off repair turn.
- An optional 'deep review' pass with thinking_budget about 1-2k that streams reasoning_content into a collapsed console block, then emits fix ops.
The say ops serve as the visible narration while thinking is off.

**Fact-check:** partially-true. All timings reproduce, but they are single runs taken while 6-8 requests ran in parallel. The flash-draft conclusion is too narrow. With thinking off, flash streamed at about 74 vs 53 tok/s and finished its smaller 14-node diagram in 20.3 s vs 35.7 s. A flash draft is therefore about 15 s faster to a complete skeleton, not just 0.9 s faster to the first op, at the cost of fewer components and a dangling edge. 'Visible churn' was never measured. The fact that reasoning_content streams before content is confirmed.

Fact-check sources: scratchpad/probe/summary.txt F: first op 2.1 s, 35.7 s total. summary2.txt G: first content 6.6 s, first op 7.5 s, 54 ops in 40.5 s, 243 reasoning tokens; H: first op 1.2 s, 36 ops in 20.3 s, 14 nodes, dangling edge n-esa -> n-alb, ~74 tok/s; summary.txt E_flash_default: first content 142.7 s; scratchpad/probe/probe2.mjs: G, H, B3, B4, B5, P1, D3, D5 launched together via Promise.all; https://www.alibabacloud.com/help/en/model-studio/deep-thinking.md (WebFetch 2026-10-31): thinking is returned in reasoning_content, then the reply in content

Sources: probe/summary.txt and summary2.txt (F, G, H, E runs); https://www.alibabacloud.com/help/en/model-studio/stream (opened 2026-10-31, Last Updated Oct 27, 2026)

### F16 (high confidence)

DashScope streaming wire facts:
- SSE 'data:' lines, ending with 'data: [DONE]'.
- With include_usage, the last chunk carries usage and choices [].
- No heartbeat or comment lines are documented; the non-streaming timeout is at least 300 s.
- Docs recommend proxy_buffering off for Nginx and warn that each stream holds a persistent connection.
- Moderation can return 400 DataInspectionFailed.
CORS (from the live probe): the endpoint reflects Origin, so a browser could call it directly.

**Implication:** The server must tolerate an empty choices array, a mid-stream error and an early [DONE]. Because ops are applied incrementally, a mid-stream failure leaves a valid partial diagram.

Sources: https://www.alibabacloud.com/help/en/model-studio/stream (opened 2026-10-31, Last Updated Oct 27, 2026); https://www.alibabacloud.com/help/en/model-studio/error-code (downloaded 2026-10-30)

### F17 (high confidence, load-bearing)

Hosting the SSE backend:
- Alibaba Function Compute: web functions support SSE, detected by the 'Transfer-Encoding: chunked' response header; event and task functions do not. Maximum function runtime is 86,400 s. Built-in aliyuncs.com domains add content-disposition: attachment and are for testing.
- Vercel (Fluid compute): Hobby 300 s default and maximum; Pro and Enterprise 300 s default, 800 s maximum, 1,800 s beta. Maximum duration includes streamed responses. The Edge runtime must start responding within 25 s and can stream for up to 300 s. Functions default to iad1; sin1 (Singapore) exists.
- Cloudflare Workers: no hard wall-clock limit while the client stays connected. The Cloudflare proxy read timeout is 125 s (HTTP 524).
- next-ai-draw-io adds a 20 s SSE keep-alive comment for this reason.

**Implication:** A diagram turn takes 35-41 s; with a review pass, about 60 s. Every candidate host fits. Co-locate the backend in Singapore (FC ap-southeast-1 web function, or Vercel sin1), set max duration to at least 300 s, and send a ': ping' every 15 s.

**Fact-check:** confirmed

Fact-check sources: https://www.alibabacloud.com/help/en/functioncompute/does-function-compute-support-sse-streaming-response.md (WebFetch 2026-10-31, Apr 01, 2026): web functions support SSE, event and task functions do not, detection by 'Transfer-Encoding:chunked'; https://www.alibabacloud.com/help/en/functioncompute/fc/product-overview/limits-of-usage.md (Sep 07, 2026): maximum runtime 86,400 s; https://www.alibabacloud.com/help/en/functioncompute/fc-3-0/user-guide/http-triggers-overview.md (Aug 04, 2026): default aliyuncs.com domain adds content-disposition: attachment; 'Built-in domain names are for testing only'; https://vercel.com/docs/functions/limitations (last_updated 2026-08-24): Hobby 300 s default and maximum; Pro and Enterprise 300 s default, 800 s maximum, 1,800 s extended maximum (Beta); max duration includes streamed responses; Edge runtime 25 s to first byte, 300 s of streaming; https://vercel.com/docs/regions (2026-08-11): default iad1; sin1 (ap-southeast-1) listed; https://developers.cloudflare.com/workers/platform/limits/ (Oct 29, 2026): 'no hard limit on duration for HTTP-triggered Workers' while the client stays connected; https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-5xx-errors/error-524/ (Jul 23, 2026): default 125 s Proxy Read Timeout; applies to proxied origins, not Workers responses; https://raw.githubusercontent.com/DayuanJiang/next-ai-draw-io/main/lib/stream-heartbeat.ts (downloaded 2026-10-31): withHeartbeat(quietMs = 20_000) writes ': keep-alive'; its comment cites Cloudflare at 125 s

Sources: https://www.alibabacloud.com/help/en/functioncompute/does-function-compute-support-sse-streaming-response (opened 2026-10-31, Last Updated Apr 01, 2026); https://help.aliyun.com/zh/functioncompute/does-function-compute-support-sse-streaming-response (opened 2026-10-31); https://www.alibabacloud.com/help/en/functioncompute/limits-of-usage (prior-run fetch 2026-10-30, Last Updated Sep 07, 2026); https://www.alibabacloud.com/help/en/functioncompute/fc-3-0/user-guide/http-triggers-overview (prior-run fetch 2026-10-30, Last Updated Aug 04, 2026); https://vercel.com/docs/functions/limitations (opened 2026-10-31, last_updated 2026-08-24); https://vercel.com/docs/regions (opened 2026-10-31); https://developers.cloudflare.com/workers/platform/limits/ (prior-run fetch 2026-10-30); https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-5xx-errors/error-524/ (opened 2026-10-31); https://raw.githubusercontent.com/DayuanJiang/next-ai-draw-io/main/lib/stream-heartbeat.ts (downloaded 2026-10-30); https://hono.dev/docs/helpers/streaming (prior-run fetch 2026-10-30)

### F18 (medium confidence)

Temporary API keys: the backend can mint 'st-' tokens with POST https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/tokens. Default TTL is 60 s, settable from 1 to 1,800 s; tokens cannot be revoked. The doc says the token 'inherits all permissions from the API key used to create it'.

**Implication:** Optional alternative: a token-vending backend plus browser-direct streaming, which removes serverless duration and idle limits. It exposes any model to the token holder for the TTL. Use it only after a probe confirms st- tokens work on the endpoint the key uses.

**Fact-check:** confirmed

Fact-check sources: https://www.alibabacloud.com/help/en/model-studio/generate-temporary-api-key.md (WebFetch 2026-10-31, Oct 29, 2026): POST https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/tokens?expire_in_seconds=...; default 60 s, TTL 1-1,800 s; 'inherits all permissions from the API key used to create it'; temporary keys cannot be deleted before expiry; returns token 'st-****'; The page does not say which domains or APIs accept the st- token, and minting needs the WorkspaceId (workspace-dedicated domain). This was not tested with the user's key

Sources: https://www.alibabacloud.com/help/en/model-studio/generate-temporary-api-key (downloaded 2026-10-30, Last Updated Oct 29, 2026)

### F19 (high confidence)

Model Studio recommends workspace-dedicated domains ({WorkspaceId}.ap-southeast-1.maas.aliyuncs.com) for production: 'Higher throughput, lower latency, and workspace-level traffic isolation'. dashscope-intl is the legacy shared domain. qwen3.8-max and qwen3.8-flash in Singapore are under 'Dynamic Rate Limiting', counted at account level across all keys. qwen3.7-max has a fixed 600 RPM / 1,000,000 TPM ($2.5/$7.5). Docs suggest a backup model on 429.

**Implication:** All latency was measured on the shared domain. Probe the workspace domain for tail latency. Use qwen3.7-max as the fallback model on stall or 429.

Sources: https://www.alibabacloud.com/help/en/model-studio/base-url (downloaded 2026-10-30, Last Updated Oct 11, 2026); https://www.alibabacloud.com/help/en/model-studio/rate-limit (downloaded 2026-10-30, Last Updated Oct 29, 2026); https://www.alibabacloud.com/help/en/model-studio/model-pricing (downloaded 2026-10-30)

### F20 (high confidence)

Prior-art patterns worth copying:
- tldraw agent starter: actions as a discriminated union on _type, streamed as {"actions":[...]}; each action yielded with complete:false/true; assistant prefill '{"actions": [{"_type":' where supported; temperature 0; sanitizeAction helpers such as ensureShapeIdExists cancel bad actions.
- next-ai-draw-io (about 36.5k stars, pushed 2026-10-29): display_diagram and edit_diagram tools with ID-based add/update/delete ops and automatic cascade delete; streamed previews that are not recorded in undo history and are reverted on output-error; jsonrepair to fix truncated tool input; a 20 s SSE heartbeat.
- AI SDK 5+ streams tool-call input by default (part state 'input-streaming').

**Implication:** Copy the preview/commit split: streamed ops are provisional, a turn commits as one undo step, and an aborted turn keeps its valid ops. Also copy cascade delete and per-action sanitize hooks.

Sources: https://raw.githubusercontent.com/tldraw/tldraw/main/templates/agent/worker/do/AgentService.ts (downloaded 2026-10-30, last commit 2026-07-17); https://tldraw.dev/starter-kits/agent (prior-run fetch 2026-10-30); https://raw.githubusercontent.com/DayuanJiang/next-ai-draw-io/main/lib/chat-tools.ts, app/api/chat/route.ts, components/chat/use-diagram-streaming.ts (downloaded 2026-10-30); https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage (opened 2026-10-31)

### F21 (high confidence)

Current library versions (npm registry, 2026-10-31): ai 7.0.159, @ai-sdk/alibaba 2.0.80, openai 7.45.1, hono 4.13.14, @hono/node-server 2.1.5, zod 4.6.7, jsonrepair 3.15.0, eventsource-parser 4.1.3, @streamparser/json 0.0.26 (2026-08-21). Stale: partial-json 0.1.7 (2024-05-14), fast-json-patch 3.1.1 (2022-03-24), @microsoft/fetch-event-source 2.0.1 (2021).

**Implication:** Server: hono, @hono/node-server, eventsource-parser (upstream SSE), zod (op schema), jsonrepair (near-miss lines). The raw openai SDK or fetch is enough. Avoid stale partial-JSON and patch libraries.

Sources: https://registry.npmjs.org/<package> (queried 2026-10-31)

## Blockers raised

- **major**: Thinking is on by default for qwen3.8-max/flash; any request path or SDK wrapper that omits enable_thinking:false (for example @ai-sdk/alibaba without providerOptions) silently turns a 2 s first op into more than 300 s of reasoning. **Mitigation:** One request builder with enable_thinking:false hard-coded for draw, edit and repair turns. A CI or integration test asserts that no reasoning_content arrives on draw turns. Only the opt-in review pass sets thinking_budget.
- **major**: Tail latency and capacity: one of 7 warm 24k-prompt calls stalled 125.6 s before its first byte, the cold 24k prompt took 13.9 s, and qwen3.8-max in Singapore has undisclosed 'Dynamic Rate Limiting' at account level. **Mitigation:** Explicit cache with a keep-warm ping. First-byte watchdog at 12 s that aborts and retries once, then falls back to qwen3.7-max (600 RPM / 1M TPM). Idle watchdog at 20 s. Probe the workspace-dedicated domain. Handle 429 with backoff.
- **major**: Systematic semantic errors in model output: managed services drawn inside the VPC (2-10 per diagram), DNS in the data path (4 of 4), WAF placed before ESA, uneven multi-AZ wiring. This threatens the 'impeccable' quality bar if rendered as-is. **Mitigation:** Catalog placement, allowedIn and pathRank metadata; a server validator with deterministic auto-repair (offline replay: 100% of containment errors fixed); grammar v2 (zones attribute, insert op, DNS as a resolve edge); one thinking-off repair turn for the rest.
- **minor**: json_schema structured output is documented as 'not supported yet' for Singapore models, so schema-constrained decoding is unavailable for the user's key. **Mitigation:** Not needed: plain-text NDJSON with per-line validation measured 0 malformed lines in 269. Optionally test json_object + {"ops":[...]} + @streamparser/json later.
- **minor**: Alibaba Cloud help center pages returned empty content to WebFetch and a bot-challenge page to curl on 2026-10-31, so load-bearing doc facts (tool_stream, json_schema region note, cache and pricing tables) rest on copies downloaded 2026-10-30 (page dates Oct 11-29, 2026). **Mitigation:** Have a human re-check the five load-bearing pages in a browser before the build: qwen-structured-output, qwen-api-via-openai-chat-completions, context-cache, qwen3-8-max, base-url. Live probes supersede docs where they disagree.

## Fact-checker: severity notes

- Thinking ON by default (rated major): the hazard is real and verified three ways (deep-thinking doc, the @ai-sdk/alibaba source that omits the field, and the probes). It is a one-line configuration fix with a cheap CI check, so it is better treated as a must-do config item than a feasibility blocker. The proposed fallback qwen3.7-max also defaults to thinking ON. With the AI SDK, pass providerOptions.alibaba.enableThinking:false or reasoning:'none'.
- Tail latency and capacity (rated major): keep major for latency, since 1 of 7 warm 24k-token calls stalled 125.6 s. The capacity half is wrong: Singapore dynamic rate limiting is published. quota-management (Oct 26, 2026) gives qwen3.8-max a Tier-1 (spend up to $8,000 a month) soft floor of 2,000,000 TPM, Tier 2 5M, Tier 3 10M, counted per account+model, with a 'relatively large' RPM. The mitigation is internally inconsistent. A 12 s first-byte watchdog would abort the measured 13.9 s cold TTFT of a 24k-token prompt. The fallback qwen3.7-max has half the TPM (1M, 600 RPM) and costs 25% more ($2.5/$7.5). It also defaults to thinking ON and starts with a cold cache, because cache data is isolated between models, so expect about 14 s more on fallback.
- Systematic semantic errors (rated major): keep major for the 'impeccable' bar, but the evidence and the fix are weaker than stated. The data is n=4 diagrams of one scenario, from a prompt that gave no placement rules. The error counts depend on an illustrative table that flags defensible placements (Auto Scaling, KMS instances, FC, Cloud Firewall in a VPC). The validator is one-directional: it missed E's PolarDB, Tair, RocketMQ and OpenSearch outside the VPC, and it ignores orphan nodes. '100% fixed' is tautological. A prompt with placement rules was never tested, so the residual error rate after prompt plus validator is unknown.
- json_schema not supported in Singapore (rated minor): agree, minor. The doc contradicts itself: the Oct 30, 2026 version keeps 'Singapore region models are not supported yet' but adds a responses.parse example with qwen3.8-max on the Singapore URL. The practical trap is @ai-sdk/alibaba, which sends response_format json_schema for qwen3.8-max whenever a schema is passed.
- Help-center pages unreachable (rated minor): the premise is outdated. On 2026-10-31, WebFetch read the official .md variants (qwen-structured-output.md, deep-thinking.md, quota-management.md, embedding.md, qwen-api-via-openai-chat-completions.md, generate-temporary-api-key.md). The HTML pages were also re-downloaded successfully about 07:35 that day (scratchpad/fresh_ms, content identical apart from trace IDs). Downgrade to trivial and script the re-checks against the .md endpoints instead of using a human.
- Overall: none of the raised issues is a no-build blocker. The NDJSON-plus-thinking-off core stands. The two items that most need re-measurement before committing to the design are capacity/latency (repeated runs, not single concurrent samples) and placement quality under a placement-aware prompt.

## Fact-checker: missed risks

- Validator blind spots, using the eval's own placement table. Reverse containment is unchecked: E drew PolarDB, Tair, RocketMQ and OpenSearch outside the VPC. Orphan nodes are unchecked: F 2, G 5, H 3, E 1. The B3 edit created ACK worker nodes ack-a and ack-b with zero edges. Edits compound errors: B4 raised containment warnings from 7 to 10 (MaxCompute, DataWorks and Quick BI inside the VPC). The validator must run on every edit, not only on the first draw.
- Measurement quality: every configuration was run once. Round 1 sent 6 requests concurrently and round 2 sent 8, so there is no p50/p95 for first op, total time or error rate. All diagram runs reuse one SEA e-commerce prompt, in English only. The relayed user request is in Korean, and Korean or other CJK input, labels and narration are untested.
- The cache figure is not representative. The 2,176/2,339 follow-up hit relied on identical state across probes; the first follow-ups (B, B2) got 1,024 cached. Chained edits re-send changed state, about 1k uncached tokens per turn.
- Capacity math: a 24k-token catalog prompt plus about 2k of output is roughly 26k tokens per draw. At the qwen3.8-max Tier-1 floor of 2M TPM that is about 75 draws per minute, shared by every key and workspace on the account. The 'Request rate increased too quickly' burst protection can reject requests below the RPM/TPM limits.
- Model alias drift: 'qwen3.8-max' is a moving alias. The docs call qwen3.8-max-0902 'an upgraded snapshot of qwen3.8-max', and that snapshot has a flat 1.5M TPM in all tiers. Per the rate-limit doc, dated snapshots get stricter limits. Prompt and validator tuning can regress silently when the alias is repointed.
- preserve_thinking defaults to true for qwen3.8-max and qwen3.8-flash, both server-side and in @ai-sdk/alibaba. If an opt-in thinking 'review' pass is mixed into a thinking-off chat, historical reasoning_content must be sent back in reasoning_content and is billed as input. The doc warns against concatenating it into content. Compacting assistant turns to done stubs drops it.
- @ai-sdk/alibaba's supportsJsonSchemaOutput lists qwen3.8-max and qwen3.8-flash, so generateObject, streamObject or Output.object will send json_schema to dashscope-intl (Singapore), where the doc says it is not supported yet. A 400 or a silent fallback is untested.
- An untested protocol alternative exists. With thinking off, a forced named tool (tool_choice object) plus tool_stream:true is documented for qwen3.8-max text modality. With tool_stream:false, array arguments arrive all at once, so there is no progressive drawing. qwen3.8-flash's tool_stream support is listed only for 'omni-modality'. The API also rejects a tool named exactly 'search'.
- Domain and temporary keys: the base-url doc calls dashscope-intl the 'legacy shared domain' and recommends workspace-dedicated domains for production ('higher throughput, lower latency, workspace-level traffic isolation'). Temporary keys are documented only on the workspace domain, which needs the WorkspaceId. Neither path was tested with the user's key. A browser-held st- token carries all parent-key permissions for up to 1,800 s and cannot be revoked, so mint per session with a short TTL and rate-limit the minting endpoint.
- Model output drives the UI. Label and 'why' strings must be escaped to prevent XSS, the op count and node count capped, and every op schema-validated, because user free text can steer the model into arbitrary or runaway ops.
- The headline follow-up 'oh I also want WAF' was tested only on a base that already contained WAF; the model correctly replied that it was already present. Inserting a missing component into an existing request path and rewiring its edges was never measured. Only the K8s swap and the data-warehouse add were.
- Catalog naming: Model Studio's llms.txt now lists 'Qoder CN (formerly Lingma)', confirming that the raw model's 'Tongyi Lingma' answer uses a stale name. The catalog needs alias and rename mappings so users who mention old names get the current products, plus positioning notes (Qoder vs Qoder CN).

## Recommended approach

Per turn, make one streaming Chat Completions call to qwen3.8-max on dashscope-intl compatible-mode. Move to the Singapore workspace-dedicated domain if a probe confirms better tail latency.

Request parameters:
- stream:true, stream_options.include_usage:true, enable_thinking:false, max_completion_tokens 4096, no response_format, no tools.
- The system message holds the rules and the FULL catalog as compact rows (id | official name | category | placement | path rank | ≤12-word purpose | pairs-with), with an explicit cache_control ephemeral marker. Send a keep-warm ping at least every 4.5 minutes.
- Earlier turns are compacted to user text plus assistant say/done text.
- The last user message carries "CURRENT DIAGRAM:" plus the compact graph JSON (no why fields; about 1k tokens per 50 elements) plus the ask.

The model emits NDJSON grammar v2:
- say, optional plan first line, group (network containers only), node (upsert, optional zones[]), edge (with kind), insert (splits an edge), move, remove (cascades edges, idempotent), rec (for product-need questions such as Qoder), gap, done.
- Rules: catalog ids only; drawing order outside-in; minimal ops on follow-ups; say, why and labels in the user's language.

The backend is a ~200-line Hono/Node service in Singapore (FC 3.0 web function with Transfer-Encoding chunked, or Vercel sin1 with maxDuration ≥300 s, or any container). It:
- holds the key;
- parses upstream SSE (eventsource-parser) and line-buffers content;
- validates every op: zod schema; referential checks with a pending-edge buffer; alias map for products; catalog rules;
- applies deterministic repairs: lifts region, global and edge services out of the VPC; turns DNS data edges into resolve edges; mirrors zone replicas;
- forwards to the browser as typed SSE events (meta, say deltas, op, repair, warn, thinking, usage, done, error), with a ': ping' every 15 s;
- runs a first-byte watchdog (12 s), an idle watchdog (20 s), a retry, then a qwen3.7-max fallback;
- when warnings remain after done, sends one thinking-off repair turn that lists the findings and asks for minimal fix ops.

The browser:
- owns the canonical graph;
- queues ops with entrance animation, and draws edges once both endpoints exist;
- treats a turn as one undo step, and keeps already-applied ops if a turn is aborted;
- derives the product panel and hover text from catalog metadata plus each node's why.

An opt-in "deep review" pass reruns the model with thinking_budget about 1-2k. It streams reasoning_content into a collapsed console block, then emits fix ops.

Do not use per-op tool calls, a single JSON document, JSON Patch or full regeneration for the main path. Add RAG or a lookup tool later only for console deep-dive questions.

## Open questions

- Does response_format {type:json_object} on qwen3.8-max (Singapore, thinking off) stream incrementally with the same time to first token? Does json_schema return an error there, as the international docs imply? This decides whether a syntax-guaranteed variant of the protocol exists.
- Does the user's key work on https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1, and does that domain reduce TTFT p95/p99 compared with dashscope-intl? Suggested test: 30+ warm calls with an explicit cache marker on a 15-24k catalog; does the 125.6 s stall recur?
- Do the grammar v2 rules hold live? Re-run the B3 Kubernetes swap with cascade semantics (expect about 18 ops instead of 30). Run 'add WAF between ESA and ALB' on a diagram without WAF (expect one insert op), the zones attribute for multi-AZ, a plan first line (cost before the first node), and DNS resolve edges.
- How much does a plan first line delay the first node? Does it measurably help layout stability (ghost skeleton) compared with plain progressive accretion?
- Do st- temporary keys work on the endpoint the user's key authenticates against (dashscope-intl)? Does an in-flight stream survive token expiry? This matters only for the browser-direct option.
- What RPM and TPM does 'Dynamic Rate Limiting' actually grant this account for qwen3.8-max? How quickly do 429s recover?
- If RAG is added for console deep-dives: what is text-embedding-v4 latency from a Singapore backend, and does retrieval recall cross-cutting products well enough? This is unmeasured; it is not needed for the main path.
- Tool-call mode with thinking off (parallel_tool_calls, tool_stream:true) was never measured. Only relevant if someone wants tool framing; the expectation is agent-loop behaviour with few calls per turn.
