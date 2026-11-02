Created only:

- [workflow-layout.ts](C:/Users/mendo/ali_wt/p2/packages/core/src/workflow-layout.ts)
- [workflow-layout.test.ts](C:/Users/mendo/ali_wt/p2/packages/core/test/workflow-layout.test.ts)

Implemented sticky cells, graph-based loop classification, splice translations, attachment collapse, repeat brackets, tidy, viewport fitting, and JSON-safe metadata.

| Check | Result |
|---|---|
| New layout tests | 119 passed, including 96 fixture replays |
| Root suite | 813 passed |
| Web suite | 420 passed; 1 Chrome logo-rendering timeout |
| Worker suite | 269 passed |
| Core, web, Worker typechecks | All passed |

The Chrome test also timed out when rerun alone. The pinned cloud prompt SHA-256 matches exactly.

Decisions and departures:

- Defined `WorkflowLayoutState` because the existing mode union excludes `'workflow'`; adapters reuse the existing diff helpers.
- Attachment membership is id-sorted, but occupied physical slots preserve arrival order and holes. Tidy sorts them. This prioritizes zero foreign moves over alphabetical insertion.
- Reserved three attachment rows by default; overflow uses vertical translation budgets.
- Inferred splices from saved link endpoints; uniform shifts apply to adjacent, same-row endpoints.
- Used id order when arrival history is unavailable. Orphan attachments wait for their host.
- Used a conservative 1.1× zoom floor to keep 10 px fitted titles readable.

No canvas, network calls, deployments, or commits. The web Chrome timeout remains unresolved; changes remain in the working tree.

Codex session ID: 01a19cc5-0d12-74a2-9d33-ea1fcb7335b0
Resume in Codex: codex resume 01a19cc5-0d12-74a2-9d33-ea1fcb7335b0
