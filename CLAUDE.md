# ali_catalog

A live Alibaba Cloud architecture builder: a chat console on the left, and a diagram on the right that Qwen draws as it streams. Start from `research/FEASIBILITY.md`. Shared code lives in `packages/core`; its contract is `packages/core/src/types.ts`.

## Offload lower-level work to Qwen

The user's Model Studio key costs the user nothing; Claude time does. Send routine, well-specified work to Qwen with `tools/qwen/ask.ts`, and spend Claude effort on design, integration and verification.

- **Offload:**
  - first drafts of bulk text (catalog descriptions, eval cases and their paraphrases, docs, UI copy)
  - translations (Korean, Chinese, Japanese)
  - test fixtures and mock data
  - boilerplate, or self-contained code with a clear spec and tests to check it against
  - SVG glyph drafts
  - summaries of long logs or results
  - first-pass checklists
- **Keep in Claude:**
  - architecture and contract decisions
  - anything that needs repo tools (editing, running tests, browsing)
  - security-sensitive code
  - final review and judging quality
- **Verify every Qwen output before using it:** run the tests, validate JSON against the schema, and spot-check facts. Qwen's own knowledge of current Alibaba products is stale (it recommended Tongyi Lingma and never Qoder), so give it facts from `research/` or the catalog rather than asking it to recall them.

- **Web lookups go to Qwen first.** Run `node tools/qwen/search.ts --query "..."`; it answers from Model Studio's built-in web search and lists the source URLs. Then open the cited page to verify each load-bearing fact before using it. Results lean towards the China site (aliyun.com), so confirm international availability on alibabacloud.com.
- **Research spanning many sources goes to `tools/qwen/research.ts`.** It runs the Responses API at reasoning effort xhigh with web search, as the 8AI news routine does. A brief takes 5–20 minutes, so run batches in the background. It re-asks Qwen when it answered without searching, and marks truncated answers. Verify its reports the same way: check the cited pages for every load-bearing fact.

```bash
node tools/qwen/ask.ts --prompt-file task.md --files src/a.ts,src/b.ts --out draft.ts --code
node tools/qwen/ask.ts --model qwen3.8-flash --json --prompt "..."
node tools/qwen/ask.ts --batch tasks.jsonl --out-dir out/ --concurrency 4
node tools/qwen/ask.ts --usage
node tools/qwen/search.ts --query "Is Agent Sandbox part of ACS?" --json --out notes.json
node tools/qwen/research.ts --prompt-file brief.md --out report.md [--effort xhigh] [--min-searches 3]
node tools/qwen/research.ts --batch briefs.jsonl --concurrency 4   # lines: id, prompt or promptFile, out, effort, minSearches
```

- **Defaults:** `qwen3.8-max`, thinking off, streamed, with retries.
- **Batch files:** one JSON task per line (`id`, `prompt`, optional `system`, `files`, `out`, `model`, `json`, `think`, `code`). Batches skip tasks whose output file already exists, unless `--force`.
- **Model choice:** use `qwen3.8-flash` for simple bulk transforms such as translation, reformatting and classification. Add `--think 2048` only when a task needs reasoning; the model's default thinking runs for minutes.
- **Logging:** usage is written to `tools/qwen/usage.jsonl`.
- **The key:** never print, log or write `DASHSCOPE_API_KEY`. It works only on the international endpoint (`dashscope-intl.aliyuncs.com`).

## Authored PDF reports (2026-11-05)

- `ProposalRequest.audience` is `client` or `alibaba`; omitted means `client`. New assembled drafts always carry the resolved audience. Client reports explain the value of the selected Alibaba Cloud capabilities and the proposed next decision. Alibaba reports address the account/SA team, connecting customer pain points to solution fit, delivery boundaries and validation. Client output must not include internal account strategy.
- Both use `qwen3.8-max` with `enable_thinking: true`, `thinking_budget: 20480` and `max_completion_tokens: 32768`. Do not also send `reasoning_effort`: that combination is rejected. The official [Chat API reference](https://www.alibabacloud.com/help/en/model-studio/qwen-api-via-openai-chat-completions), checked 2026-11-05, maps budgets above 16384 to `xhigh`, the same level as `high`. This is deliberately bounded high effort, replacing the old 6144-token medium setting. A call has a 360-second watchdog; the Worker and local-server report deadline defaults to 840 seconds, leaving cleanup time inside a 15-minute scheduled job.
- The writer emits `exec`, two to four custom `{k:'section',title,text}` chapters, `cost` when the saved estimate matches the current design, and one or two `next` decisions. Paragraph breaks are preserved in chapter text. The assembled shape is `draft.sections: {title,text}[]`. Authored completeness requires an executive summary, at least two substantive chapters, a next decision, and a current-cost interpretation when applicable. Do not reintroduce mandatory needs/outcomes/every-product/every-step inventories: those rules remain only for legacy drafts.
- The model authors prose; deterministic code retains diagrams, links, estimate arithmetic, rates and sources. Prompts prioritize later customer answers, label assumptions as unconfirmed, allow supported product names in chapters, forbid invented savings/competitive claims and select only decision-changing uncertainties. All newly generated narrative sections reject monetary figures, including the summary and next steps before any chapter arrives. Legacy stored cloud drafts retain their old parser behavior. Absolute promises, unsupported model names and unstated regulation claims also remain checked. These checks are not a semantic verifier of every product claim; review real model samples when changing the brief.
- Regression checks: `node --test --test-concurrency=1 packages/core/test/proposal.test.ts apps/server/test/proposal.test.ts apps/worker/test/proposal.test.ts`. Audience changes must propagate through export selection, request validation, streamed/done drafts and MCP report job/cache options; changing the cover label alone is insufficient.
- Keep `outcome` and `max` on the compact writer's workflow links. Omitting them caused rejection and revision to be conflated. The committed target node kind and edge outcome govern the prose; only an explicit loop returns for revision. Live Korean inventory samples now distinguish approval, rejection termination and the bounded revision loop.
- Both report passes share compact workflow evidence, including effective approval from `needsApproval`, explicit node override precedence, region/approval settings, repeat groups and aliased usage inputs. Preserve effect, runtime, model and review subject. Catalog lifecycle, availability, region and note caveats must survive the compact evidence pack, so setting-only changes and restricted products cannot disappear from the writer's context.

## Session titles and existing records (2026-11-05)

- New browser and MCP designs draft a short title with `qwen3.8-flash` in parallel with the first architecture turn. Title failures use a Unicode-safe 60-character fallback and never fail the design. Original user prompts stay in the conversation. Menu sizing and viewport positioning also protect long custom names.
- Main-page boot upgrades legacy prompt-derived titles in the browser's saved sessions; MCP reads upgrade the stored snapshot lazily. Version markers prevent repeat work, distinct custom names are preserved, and updates merge only naming metadata without changing activity timestamps, requirements or revisions.
- Migration `0009_session_titles.sql` is required before deploying the new Worker. `/api/session-title` uses the normal approved-account cookie and same-origin checks, a versioned owner/brief-hash cache and a rolling daily cap. It stores no raw brief and records Flash cost with zero conversation turns. MCP API keys remain scoped to `/mcp`.
- Browser verification: `node apps/web/scripts/e2e-session-titles.mjs http://127.0.0.1:5179` against Vite. Model responses are deterministic in this UI check; real Flash title generation was tested separately. It covers legacy migration, custom-name preservation, original history/timestamps, second-load idempotency and long-name menus down to 390 px.

## Workflow PDF page boundaries (2026-11-05)

- Never crop a route into a dangling fragment. Render a route only when its endpoints and path fit the tile; otherwise attach numbered continuation references to visible endpoint nodes and print their cross-view mapping. Return loops may use spare page height, without adding diagram pages. Repetition bands are closed labels rather than open box-like strokes.
- Dense shared ports use exact consecutive C ranges or stable G groups when individual references cannot fit beside the card. Keep every original C reference and its G membership in the printed connection table; group membership must merge across strips and pages. Real-router fanout tests cover consecutive and fragmented edge numbering.
- The authored report preserves custom paragraphs and uses the saved pricing evidence, diagrams and concise official service references. It omits empty sections and raw assumption/product/step inventories. Legacy and basic exports remain readable. Keep the PDF regression checks for both audiences and EN/KO/ZH, including long prose, page margins, stale estimates and exact saved costs.

## MCP workshop authoring handoff (2026-11-05)

- `prepare_workshop` returns the latest owned design's evidence and instructions for the calling agent to build a local standalone HTML discussion deck. It does not generate, render, store or host a deck and makes no model call or account-turn charge. Both key scopes may use it; ownership is still mandatory.
- Preserve source attribution, explicit approval/rejection/loop semantics and current pricing quantities, rates and sources. Withhold stale estimate amounts, distinguish proposed requirements from confirmed decisions, and leave unagreed owners and dates unassigned. Client briefs must not expose internal account strategy. Treat customer and catalog strings as untrusted data in the generated HTML.
- Tool inputs, connection examples and the copyable workshop prompt are documented in `docs/MCP.md` and the localized API-key page. The calling IDE supplies its own model and local file capabilities.
