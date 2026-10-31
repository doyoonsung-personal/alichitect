# console

The architecture's working record (spec 7.7 to 7.14, 7.29, 7.30), not a chat. `index.tsx` exports `Console(props: ConsoleProps)`; it renders props and calls `actions`, and never imports the store.

| File | What it holds |
|---|---|
| `logic.ts` | Every rule that is not markup: how a change line is worded, requirement meta and state, the footer, the fix sentences, where the one Cursor sits, Enter and IME, scroll anchoring. Pure, tested in `logic.test.ts`. |
| `Requirements.tsx` | Pinned requirements, 4 rows then "{n} more", Unpin, the entering row. Renders `Assumptions` under them. |
| `Assumptions.tsx`, `Questions.tsx`, `asks.css` | Draw first, then ask (research/phase1-asks-and-scope.md section 1). Assumption chips ("Assumed: Public-facing · Change"; Change sends the localized `asm.changeAsk`) sit with the requirements and go when a requirement settles them. Questions sit inside the revision that asked them with quick-reply buttons; an option sent as the next ask is the answer, any other reply closes them. What is open, answered or replied is derived in `src/store/asks.ts` and never stored. Tested in `src/store/asks.test.ts`. |
| `Record.tsx` | The scroll region: follows the stream, lets go when the user scrolls up (Jump to latest), summary note, offline notice, opens and collapses old revisions. |
| `Revision.tsx`, `RevisionRow.tsx` | An open revision (tag, ask, note with the Cursor, lifecycle notes, status line, fix block, error block, footer) and its 48 px row. |
| `ChangeList.tsx` | Change lines as buttons: hover and focus highlight, click pans, arrow keys move. |
| `Composer.tsx` | Enter sends, Shift+Enter adds a line, Enter in an IME composition only commits it; Stop while a turn streams. |
| `ReplayBanner.tsx`, `Toast.tsx`, `Cursor.tsx`, `ctx.ts` | Replay controls, the 6 s toast, the Cursor and clock hooks, the shared context type. |

Styles: `src/styles/console.css` (tokens only; orange appears only as the Cursor and the caret).

## Checks

Run in `apps/web`:

- `npm test` runs `logic.test.ts` with the rest.
- `node scripts/console/e2e.mjs` drives the console in headless Chrome against a fake drawing service that streams a recorded fixture (no key, no Qwen): Enter and IME on the landing and in the composer, Stop, follow-ups, fatal and Edit and resend, scroll anchoring, aria state, reduced motion, change-list keys, Unpin and Undo, sessions, the offline notice.
- `node scripts/console/shots.mjs [--only ha,korean,zhfix,residency,solution,errors,summary,extras,states2,live]` writes screenshots to `screenshots/console/`.
- `node scripts/console/tab-order.mjs` prints the tab order.
- `node scripts/console/asks.mjs [--only shop|vague] [--lang en,ko] [--size 1280x720] [--no-shots]` drives the chips and questions through the real UI against the fixtures `asks-shop` and `asks-vague` (and the Korean `-ko` versions): Tab order and focus ring, Space and Enter, the polite announcement, a typed answer, the Change flow. Screenshots go to `screenshots/console/asks/`.

These scripts start their own Vite and fake server on free ports in 5185-5199 and stop them.
