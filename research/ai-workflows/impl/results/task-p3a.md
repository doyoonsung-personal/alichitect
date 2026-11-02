Implemented workflow turns end to end on Node and Worker. Cloud prompt SHA-256 remains `998fab223daba0a4407930f0f6f61e90cf100d7783ca4b13008636526d049313`.

Changed files:
- Core: `llm.ts`, `prompt.ts`, `claude.ts`; tests: `claude.test.ts`, new `workflow-turn.test.ts`.
- Server: `request.ts`, `server.ts`, `turn.ts`; tests: `backup.test.ts`, new `workflow-request.test.ts`.
- Worker: `turn.ts`, `backup.test.ts`.

Validation:
- Root: **707/707 passed**.
- Worker: **270/270 passed**.
- Web: **420/421 passed**. Chrome logo rendering timed out, including an isolated retry.
- Core, web, Worker typechecks: **passed**.
- Focused tests after fixes: **59/59 passed**.
- UTF-8 size fixture: **1,254,555 → 504,237 bytes** after compaction; both documents preserved.

Decisions:
- Reused the reducer’s workflow caps; retained 80 workflow tombstones.
- Bounded estimate inputs; preserved legacy cloud event typing through mode-aware generics.
- Dual-document compaction removes oldest change text, then oldest exchanges, then tombstones, reserving room for the next ask.
- Preserved existing quota behavior: Worker charges one/two units; Node has no daily quota ledger.
- Used `npm.cmd` because PowerShell blocked `npm.ps1`.

Remaining: the Chrome test gate is unresolved. No forbidden files edited, live model calls made, deployments performed, or commits created.

Codex session ID: 01a19cc5-2210-7c71-8a33-b21d1115213c
Resume in Codex: codex resume 01a19cc5-2210-7c71-8a33-b21d1115213c
