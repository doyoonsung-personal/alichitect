Fixed all five findings in:
- [workflow-layout.ts](C:/Users/mendo/ali_wt/fix-p2/packages/core/src/workflow-layout.ts)
- [workflow-layout.test.ts](C:/Users/mendo/ali_wt/fix-p2/packages/core/test/workflow-layout.test.ts)

Checked that all five exact-input regressions fail on the old code and pass on the new code.

Decisions: explicit splice provenance uses `opts.op`; descendant offsets follow their parent; deleted physical slots remain reserved while visibility counts live attachments. The movement gate independently checks permitted translations.

Validation:
- Workflow layout: **125/125 passed**
- Root: **917/917 passed**
- Worker: **270/270 passed**
- Web: **420/421 passed**; Chrome logo-rendering timed out again on isolated retry
- Core, web, worker typechecks: **passed**
- Cloud prompt SHA-256: **matches required hash**

Phase 4a prompt/metadata changes remain undone because those files are outside the ownership limit. No other files changed; no commit made.

Codex session ID: 01a19cda-3042-74d3-b913-6605ef25d230
Resume in Codex: codex resume 01a19cda-3042-74d3-b913-6605ef25d230
