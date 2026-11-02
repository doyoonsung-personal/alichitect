Implemented in [workflow-validate.ts](C:/Users/mendo/ali_wt/fix-mixed/packages/core/src/workflow-validate.ts:566) and [workflow-checks.test.ts](C:/Users/mendo/ali_wt/fix-mixed/packages/core/test/workflow-checks.test.ts:169). No files created.

Mixed parallel links become branches, receive `otherwise` when unlabeled, and produce a repaired warning naming the node and converted links.

Decisions:
- Omitted kinds count as `next`; outcome-bearing links remain alternatives.
- Existing labels are preserved; empty labels receive `otherwise`.
- Repair runs before cycle repair and repeats afterward when new loops require it, ensuring idempotence.
- Used `npm.cmd` because PowerShell blocked `npm.ps1`.

Validation:
- Focused tests: **61/61 passed**.
- Root: **915/915 passed**, including all 32 unchanged sample fixtures.
- Worker: **270/270 passed**.
- Web: **437/438 passed**. Chrome logo rendering timed out again when rerun alone.
- Core, web, worker typechecks: **all passed**.
- Cloud prompt SHA-256 matches the required value; `git diff --check` passed.

The unrelated Chrome test remains unresolved. No other departures, network/model calls, deployments, or commits. Changes remain in the working tree.

Codex session ID: 01a19cdf-458c-7602-b350-4ee6c53ceb1f
Resume in Codex: codex resume 01a19cdf-458c-7602-b350-4ee6c53ceb1f
