The existing repair already handles all three recorded graphs. The eval fails because [`attachValid`](C:/Users/mendo/ali_wt/vpcfix/eval/lib.ts:644) judges **pre-repair warnings**, even after the attachment is cleared.

Created [`attach-hosts.test.ts`](C:/Users/mendo/ali_wt/vpcfix/packages/core/test/attach-hosts.test.ts): 12 passing tests with three embedded raw-graph fixtures, host selection, inline fallback, valid-attachment preservation, immutability, and idempotence.

Decisions/departures:
- Left production repair unchanged because the requested behavior already works.
- Preserved node-only attachment rules and catalog scope placement.
- No browser mirror needed: web imports the core repair directly.
- Left the eval assertion unchanged; it is outside file ownership.

Validation:
- Root: **706/706 passed**
- Web: **420/421 passed**; Chrome logo-rendering test timed out, including standalone retry.
- Worker: **269/269 passed**
- All three typechecks passed.
- Cloud prompt SHA-256 matches the required value exactly.

Remaining: the eval assertion discrepancy and unrelated Chrome timeout. Used `npm.cmd` because PowerShell blocked `npm.ps1`. No commit, deployment, or live model calls.

Codex session ID: 01a19ccf-a9a4-76a3-a1d4-ad796c0c6a32
Resume in Codex: codex resume 01a19ccf-a9a4-76a3-a1d4-ad796c0c6a32
