Implemented phase 7a within the owned files. Changes are uncommitted.

Changed:
- Core: `proposal.ts`, `proposal-prompt.ts`, proposal types in `types.ts`, and `proposal.test.ts`.
- Web export: `draft-flow.ts`, `draft-client.ts`, `ExportButton.tsx`, `model.ts`, `strings.json`, and the three corresponding test files.

Step sections now support validation, streaming, continuation, assembly and browser progress. Export data includes estimator costs, coverage, unpriced items, runtime mappings and open questions.

| Check | Result |
|---|---|
| Root tests, including core/server | 891 passed |
| Web tests | 426 passed; 1 failed |
| Worker tests | 269 passed |
| Core, web, Worker typechecks | Passed |
| Cloud prompt SHA-256 | Matches required hash |

The web failure was a 30-second timeout in `scripts/icons/test/icons.test.ts`: “the logos render in Chrome.” All proposal/export tests passed. After the final lint adjustment, all 51 core proposal tests passed again.

Decisions:
- `steps` is optional on legacy/cloud drafts, preserving their shape.
- Workflow-only completion requires exec, two needs, and every inline non-trigger/non-end step. Mixed drafts retain cloud requirements.
- Attached nodes are explained with their host; runtime mappings include them separately.
- Open questions include assumptions, existing session questions and all three data-boundary questions.
- Step progress reuses the existing explanation stage because `DraftOverlay.tsx` is outside ownership.
- Used `npm.cmd` because PowerShell blocked `npm.ps1`.

In **both** server and Worker proposal tests, replace `HIDDEN` with:

```ts
const HIDDEN = new RegExp(
  ['cl' + 'aude', 'anth' + 'ropic', 'DataInspection', 'inappropriate'].join('|'),
  'i',
);
```

This removes only the blanket `qwen` ban. Core tests separately verify that design model names are accepted and writer self-reference is rejected.

Remaining outside scope: those leak-test edits; phase 3a’s workflow-memory preservation and backup voice integration; and phase 7b’s PDF rendering of the new data. No prohibited files were edited, and no live model calls or deploys were made.

Codex session ID: 01a19cd2-ba90-70c1-9587-adfc94fae771
Resume in Codex: codex resume 01a19cd2-ba90-70c1-9587-adfc94fae771
