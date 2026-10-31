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

```bash
node tools/qwen/ask.ts --prompt-file task.md --files src/a.ts,src/b.ts --out draft.ts --code
node tools/qwen/ask.ts --model qwen3.8-flash --json --prompt "..."
node tools/qwen/ask.ts --batch tasks.jsonl --out-dir out/ --concurrency 4
node tools/qwen/ask.ts --usage
node tools/qwen/search.ts --query "Is Agent Sandbox part of ACS?" --json --out notes.json
```

- **Defaults:** `qwen3.8-max`, thinking off, streamed, with retries.
- **Batch files:** one JSON task per line (`id`, `prompt`, optional `system`, `files`, `out`, `model`, `json`, `think`, `code`). Batches skip tasks whose output file already exists, unless `--force`.
- **Model choice:** use `qwen3.8-flash` for simple bulk transforms such as translation, reformatting and classification. Add `--think 2048` only when a task needs reasoning; the model's default thinking runs for minutes.
- **Logging:** usage is written to `tools/qwen/usage.jsonl`.
- **The key:** never print, log or write `DASHSCOPE_API_KEY`. It works only on the international endpoint (`dashscope-intl.aliyuncs.com`).
