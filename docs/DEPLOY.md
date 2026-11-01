# Deploying the Architecture Builder

The app runs as one Cloudflare Worker, `alichitect`, at **https://architect.alikorea-demo.com**. The Worker serves the web app (`apps/web/dist`) as static assets and runs `POST /api/turn` against Model Studio (dashscope-intl) with the key held as a Worker secret. When the optional `ANTHROPIC_API_KEY` secret is set, Claude finishes the turns that Model Studio's content filter stops (see [The Claude backup](#the-claude-backup)). Every request goes through the Worker's accounts, which work like the WonderClip platform's:

1. A person creates an account with an email address, a password, a name and, if they like, a note on why they need access.
2. They enter the 6-digit code the Worker emails them.
3. An administrator approves the account on `/admin`, and the person gets an email.
4. They sign in with the email address and password.

The code and its configuration are in `apps/worker` (`wrangler.jsonc`).

| Piece | Where |
|---|---|
| Cloudflare account | `cfd2a327acfb7d93dc045825f12dd38d` (Dysung.alicloud@gmail.com's Account, Workers Paid) |
| Address | the custom domain `architect.alikorea-demo.com`. It is the only route: the `alikorea-demo.com` zone also serves other demos |
| Database | D1 `alichitect`: users, sign-ups, email codes, sessions, rate limits, usage, audit (`apps/worker/migrations`) |
| Email | Cloudflare Email Service, from `no-reply@alikorea-demo.com` (already set up for the WonderClip platform). It sends the sign-up and reset codes, so accounts cannot work without it |
| Secrets | `DASHSCOPE_API_KEY` and `SESSION_SECRET`, on the Worker only. Optional: `ANTHROPIC_API_KEY`, for the Claude backup |
| First admin | `dysung.alicloud@gmail.com`, from the `ADMIN_EMAILS` var, as soon as it confirms its email |

## Before you start

- Node 24 and npm.
- `CLOUDFLARE_EMAIL` and `CLOUDFLARE_API_KEY` (the global API key) in your environment. The scripts sign wrangler in with them.
- `DASHSCOPE_API_KEY` saved as a Windows user variable: the same key the local server uses. `set-secrets.ps1` reads it from there and not from the shell.
- Optional, for the Claude backup: your Anthropic API key saved as a Windows user variable. Run `powershell -ExecutionPolicy Bypass -File scripts\save-anthropic-key.ps1`, which asks for it at a hidden prompt and never shows it.
- Neither key is in the environment of the deploy: `deploy.ps1` and `set-secrets.ps1` remove both from their own process environment before anything else runs, so `npm ci`, the web build, the tests and wrangler never inherit them. `set-secrets.ps1` reads each from the user scope only at the moment it puts it.
- Install the tools once: `cd apps/worker` then `npm ci`.
- Install the shared code's one dependency once, the Anthropic SDK that the Worker bundles: `cd packages/core` then `npm ci`. Preflight refuses to deploy without it.

Every command below runs from `apps/worker` in PowerShell. `--env=` (an empty environment name) selects the production configuration; `--env dev` is local development only.

## One-time setup

### 1. Check the email sender

The Worker sends mail through the `EMAIL` binding (`send_email` in `wrangler.jsonc`, `"remote": true`), as the WonderClip platform does. It needs no secret.

In the Cloudflare dashboard, open **Email** and then **Email Sending**, and check that `alikorea-demo.com` is still listed as a verified sending domain. The WonderClip platform already sends its codes from it, so normally there is nothing to do.

### 2. Create the D1 database

```powershell
npx wrangler d1 create alichitect
```

Copy the `database_id` it prints into `wrangler.jsonc`, in the top-level `d1_databases` entry, replacing `00000000-0000-0000-0000-000000000000`. The `env.dev` entry keeps the placeholder because local development uses a local database. If wrangler offers to edit the file for you, say no and paste the id yourself.

The migrations are applied by the deploy in step 4. To apply them now instead:

```powershell
npm run d1:migrate:remote
```

### 3. Set the secrets

```powershell
powershell -ExecutionPolicy Bypass -File scripts\set-secrets.ps1
```

The script sets these secrets:
- It reads `DASHSCOPE_API_KEY` from your Windows user variables.
- It reads `ANTHROPIC_API_KEY` from your Windows user variables too, so a key saved after your terminal opened still counts. If it is not there, the script says so and skips it, and the Worker runs without the Claude backup.
- Both keys are checked for shape before anything is sent (`put-secret.ts`): the Anthropic key must start with `sk-ant-`, and the Model Studio key must not, so a swapped pair is refused.
- It generates `SESSION_SECRET`: 48 random bytes. It signs the session cookies and the cookie that carries a code flow from page to page, and it keys the stored code and rate-limit hashes.

Each value reaches `wrangler secret put` on standard input and is never printed or put on a command line. If the Worker does not exist yet, wrangler creates an empty one to hold them.

The script can also change one secret at a time:
- Change the Model Studio key: `-Only DASHSCOPE_API_KEY`.
- Add or change the Anthropic key: `-Only ANTHROPIC_API_KEY`.
- Replace the session secret: `-Only SESSION_SECRET -RotateSession`. This signs everybody out and voids every code already mailed. Without `-RotateSession`, an existing session secret is kept.

To turn the Claude backup off, delete its secret: `node node_modules\wrangler\bin\wrangler.js secret delete ANTHROPIC_API_KEY --env=`.

If a `GOOGLE_CLIENT_SECRET` secret is still on the Worker from the earlier Google sign-in, the script says so and prints the command that removes it.

### 4. First deploy

Check that no DNS record named `architect` exists in the `alikorea-demo.com` zone. Wrangler creates that record, and its certificate, for the custom domain, and fails if a record is already there. Then run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\deploy.ps1
```

The script runs these steps in order and stops at the first failure:
1. **Preflight** (`npm run preflight`): refuses to go on while `wrangler.jsonc` still has the D1 placeholder, sets the local-only `MAIL_LOG`, lacks a sender address on `alikorea-demo.com` or the email binding, or sets a `CLAUDE_BACKUP_MODEL` that is not a Claude model id. It also refuses when the Anthropic SDK is not installed in `packages/core`.
2. Builds `apps/web`.
3. Runs the Worker tests.
4. Applies the remote D1 migrations. Confirm the prompt.
5. Runs `wrangler deploy`.

### 5. Check it

1. Open `https://architect.alikorea-demo.com/api/health`. Signed out it shows only `{"ok":true}`, which is all the Worker tells anonymous callers. After step 2 below, open it again: signed in, it also shows `"keyConfigured":true`. It says nothing about the backup below: a browser never learns whether one exists. Check that with `wrangler secret list --env=""` (is `ANTHROPIC_API_KEY` there?), or read the `turn` log lines (`backupUsed`, `rescue`).
2. Open `https://architect.alikorea-demo.com/signup` and create the account for `dysung.alicloud@gmail.com` with a strong password. Enter the 6-digit code from the email (subject `[Architecture Builder] Verification code ...`). The account becomes an approved admin and lands in the builder.
3. Open `/admin`: you are listed as the only admin.
4. From another address, create an account and enter its code. It lands on the waiting page, and the admin gets an email. Approve the request on `/admin`; the person gets an email and can sign in.
5. Check that a closed tab stops a turn. In a terminal run `npx wrangler tail --env=`, start a real turn in the builder and close the tab while it streams. The turn's log line should show `"clientGone":true` soon after. The local dev server cannot show this. If it shows `"clientGone":false` and the turn runs to its deadline (`"deadlineHit":true`), the closed tab keeps that user's one turn slot busy until the deadline; lower `TURN_DEADLINE_MS` in `wrangler.jsonc` and tell the developer.

## Redeploying

You can redeploy in either of these ways:
- **From your machine:** `powershell -ExecutionPolicy Bypass -File scripts\deploy.ps1`.
- **From GitHub:** go to **Actions**, open **Deploy**, choose **Run workflow** and type `deploy`. It runs the same steps as the script, then a health check. It only ever runs by hand.

Secrets survive deploys, and only migrations that have not been applied yet run.

**Migration 0003 (the Claude backup caps) comes first.** It rebuilds the `usage` table with `rescues` and `claude_cost_usd` columns and a global `'*'` row, and the new Worker needs those columns. The old Worker keeps working on the new table (it only writes the old columns), so apply it before the deploy: `deploy.ps1` and the GitHub workflow already do, in that order. By hand, from `apps/worker`: `npm run d1:migrate:remote`, then check it with `npx wrangler d1 execute alichitect --remote --env= --command "SELECT name FROM d1_migrations ORDER BY id DESC LIMIT 1"` (it should name `0003_rescue_caps.sql`). Every existing usage row is kept. Run it when nobody is mid-turn: the table is dropped and renamed inside the migration, and a usage write in that instant would fail and be retried by nothing (the turn itself is unaffected).

### Deploy from GitHub: the production environment

The Cloudflare credentials can change anything the account owns, including `alikorea-demo.com` and the other demos on it. Anyone with write access to the repository can push a branch whose workflow reads repository-level secrets, so keep them out of the repository secrets. Put them in the `production` environment, and lock that environment down.

In `github.com/doyoonsung-personal/alichitect`:

1. Go to **Settings**, then **Environments**, and create (or open) **production**.
2. Under **Deployment branches and tags**, choose **Selected branches and tags** and add `main` and `phase-1`. A workflow on any other branch can then never read the secrets.
3. Under **Required reviewers**, add yourself (or a second person). Every deploy now waits for an approval.
4. Under **Environment secrets**, add the credentials. Prefer a scoped API token:

   | Name | Value |
   |---|---|
   | `CLOUDFLARE_API_TOKEN` | an API token for this account only (see below) |
   | `CLOUDFLARE_ACCOUNT_ID` | `cfd2a327acfb7d93dc045825f12dd38d` |

   Create the token in the Cloudflare dashboard under **My Profile**, **API Tokens**, **Create Token**, **Create Custom Token**, with these permissions and resources:
   - Account, **Workers Scripts**: Edit.
   - Account, **D1**: Edit.
   - Zone, **Workers Routes**: Edit, and Zone, **DNS**: Edit (the custom domain creates the `architect` record), limited to the zone `alikorea-demo.com`.
   - Account resources: only `Dysung.alicloud@gmail.com's Account`.

   Only if a token cannot be made, use the global key instead of the token: add `CLOUDFLARE_API_KEY` (the global API key) and `CLOUDFLARE_EMAIL` (the email of that login) as environment secrets. Define one set, never both. The global key cannot be limited, so this is the weaker choice.

The workflow runs only by hand, and only from `main` or `phase-1`. The job waits for the reviewer's approval before it starts. If a deploy fails with a permission error from Cloudflare, add the permission the error names to the token (it needs Zone, Zone: Read as well on some wrangler versions).

The `Test` workflow runs on every push and pull request and needs no secrets.

## Rolling back

```powershell
npx wrangler deployments list --env=
npx wrangler rollback --env= -m "why"              # to the previous version
npx wrangler rollback <version-id> --env= -m "why"
```

A rollback restores the Worker's code and configuration. Each Worker version carries its own static assets, so the web app rolls back with it. It does not touch the following:
- **D1:** migrations are never undone (a rollback leaves the tables as the latest migration made them; 0002 only replaced the tables for sign-ups and codes in flight, no account data; 0003 only rebuilt `usage` with two more columns, which the earlier Worker ignores).
- **The secrets.**

To change only the model key or a secret, use `set-secrets.ps1`; no rollback is needed.

## The Claude backup

**Owner's decision: users never see it.** Nothing a browser can see or download names Claude or Anthropic: not the UI in any language, not the stream (statuses carry only a code and a line; no event has a provider or model field, and the first pass's filter-stop `error` event is held back), not `/api/me`, `/api/health`, the HTML pages, the response headers, the JS and CSS bundle (no source maps) or the exported PDF. A finished answer looks like any other: no footer attribution. While the backup works, the revision shows "Finishing the diagram…" (also in Korean and Chinese). Provider, model, cost and error codes stay in the server logs, which only you see. `apps/web` `npm run build` runs `check:dist`, which fails if the bundle ever holds either word.

Model Studio inspects every reply, and sometimes its filter stops a harmless one partway (`DataInspectionFailed`, or `finish_reason` `content_filter`). It depends on the wording: on the live site it stopped 2 of 5 turns in one session, after the first ops had already been drawn, and 0 of about 630 eval conversations. Retrying, or switching to `qwen3.7-max`, meets the same filter. So, when `ANTHROPIC_API_KEY` is set, Claude finishes such a turn:

- **Ops already drawn:** Claude continues from the diagram drawn so far, the same way a cut-off reply is continued. The chat shows "Finishing the diagram…".
- **Nothing drawn yet:** Claude answers the whole turn.
- **Claude fails or declines too:** what was drawn is kept and committed with a warning that the reply is incomplete. If nothing was drawn, the turn fails with "This request couldn't be completed. Rephrase it and try again." (wire code `not-completed`; `backup-failed` in the log), and the diagram is unchanged.
- **Without the key, or a cap reached (see [Caps](#caps-on-the-backup)):** the turn fails as before, with "The model provider's content filter declined this request" (no key) or "This request couldn't be completed. Rephrase it and try again, or try again tomorrow." (wire code `request-limit`; `backup-limit` in the log). The diagram is unchanged.

Nothing else goes to Claude: stalls, rate limits and server errors still retry on Model Studio and fail over to `qwen3.7-max`.

### Caps on the backup

Claude is paid from your Anthropic credit, and anyone with an account can write text that trips the content filter on purpose. So a rescue starts only while all of these hold, checked once, right before Claude would be called (`src/turn.ts`, counts in the `usage` table):

| Cap | Default | Var in `wrangler.jsonc` |
|---|---|---|
| Rescues per person per UTC day | 10 | `CLAUDE_RESCUES_PER_USER_DAY` |
| Rescues per admin per UTC day | 30 | `CLAUDE_RESCUES_PER_ADMIN_DAY` |
| Claude's cost per UTC day, everybody together | $5 | `CLAUDE_BUDGET_USD_PER_DAY` |
| Time left of the turn deadline | 60 s (fixed) | `TURN_DEADLINE_MS` sets the deadline (240 s) |

- Past a cap the turn behaves as if there were no backup: Claude is not called and the chat never says it is coming. The person sees "This request couldn't be completed. Rephrase it and try again, or try again tomorrow." (log: `backup-limit`), in the language of their message. A cap check that fails (a database error) blocks the rescue too, and reads "This request couldn't be completed. Rephrase it and try again." (log: `backup-failed`), as does a turn with under 60 s of deadline left.
- Each backup call is booked as it ends, on the person's row and on the `'*'` row that totals everybody, so a turn that dies later is still counted. A rescue that fails still counts toward the person's cap, and a stream that broke before its usage record is booked at an upper bound (the input tokens reported plus one output token per two characters streamed).
- A rescued turn counts as **2** against `TURNS_PER_DAY`.
- Two people's rescues can start in the same second, each seeing the total before the other's cost: the day's total can pass $5 by the cost of the rescues in flight (about a dollar at most each). The per-person cap is exact. A `0` for any var turns the backup off for that group.
- One call is also bounded: `max_tokens` is 20000 (a full reply is about 2.5k tokens; the longest of 30 live conversations was 6.6k characters), and a call that streams more than 40000 characters is aborted. At $20 per million output tokens a call costs at most $0.40 of output, and a rescue is two calls at most.
- `CLAUDE_BACKUP_MODEL` must be a Claude model that `packages/core/src/pricing.ts` has a price for (`claude-opus-5-5`, `claude-opus-5`, `claude-opus-4-8`); anything else falls back to `claude-opus-5-5`, and preflight refuses to deploy it.

Today's use, in the database:

```powershell
npx wrangler d1 execute alichitect --remote --env= --command "SELECT COALESCE(u.email, 'EVERYBODY') AS who, s.day, s.rescues, round(s.claude_cost_usd, 4) AS claude_usd FROM usage s LEFT JOIN users u ON u.id = s.user_id WHERE s.rescues > 0 ORDER BY s.day DESC, s.claude_cost_usd DESC LIMIT 50"
```

What the browser is sent about Claude is only its drawing and the "Claude is finishing it" lines. Claude's token counts, error codes and stop reasons are in the log line (`backupLog`, `rescue`, `backupSkipped`), not in the stream.

The request, built in `packages/core/src/claude.ts` with the official Anthropic SDK:

| Setting | Value |
|---|---|
| Model | `claude-opus-5-5`. Change it with `CLAUDE_BACKUP_MODEL` in `wrangler.jsonc` (a Claude model id) and deploy |
| Effort | `low`. Claude Opus 5.5 always thinks, and effort keeps that short for a live drawing |
| Refusals | server-side fallback (`fallbacks: "default"`): if Claude Opus 5.5 declines, Anthropic retries on another Claude model in the same call. A decline that survives that is final, and its partial output is discarded |
| Caching | the system prompt (about 24k tokens) is cached for 5 minutes: the first call in that window writes it, later ones read it at a twentieth of the input price |
| Limits | no stream event in 20 s, 30 s of silence, or 150 s in all ends the call. A closed tab ends it at once. `max_tokens` 20000 and 40000 streamed characters per call |

**Cost.** Claude Opus 5.5 lists at $4 per million input tokens, $20 per million output tokens and $0.20 per million cache reads (5-minute cache writes $5). Measured on 2026-11-01, a rescue cost about 3 to 4 cents with the system prompt in the cache, and about 14 cents for the first one in five minutes, which writes the prompt to the cache. Claude drew its first op 1.5 to 4 seconds after the switch and finished the turn in 8 to 15 seconds. The cost is booked with the turn, so it counts in the `usage` table and in `costUsd` in the logs, and the log line's `rescue` field shows its kind, model, outcome and cost. The Anthropic key draws on the Console organization it belongs to: set a spend limit there.

**Logs.** A rescued turn has `"backupUsed":true` and `"rescue":{...}` in its `wrangler tail` line (`apps/server/logs/turns.jsonl` locally). Neither key is ever logged, and every line the Worker streams passes through a redactor that knows both keys.

**The local server** (`npm run server`) reads `ANTHROPIC_API_KEY` and `CLAUDE_BACKUP_MODEL` from its environment, and prints `backup claude (claude-opus-5-5)` or `backup none` at start. A user variable saved after your terminal opened is not in that terminal's environment; open a new terminal, or copy it in first:

```powershell
$env:ANTHROPIC_API_KEY = [Environment]::GetEnvironmentVariable('ANTHROPIC_API_KEY', 'User')
npm run server
```

## Accounts and access

- **Signing up:** `/signup` asks for a name, an email address, a password and an optional note. The Worker emails a 6-digit code; the account exists only once the code is entered on `/verify`. It is then waiting for approval, and every admin gets an email.
- **Codes:** 6 digits, valid 15 minutes, 5 tries each. Only an HMAC of each code is stored, and a code works only in the browser that asked for it. Another browser asking for a code for the same address gets a code of its own: it never replaces the first browser's or spends its tries (up to 5 live codes per address and purpose).
- **Mail budget:** every code mail goes through the layers below, each checked only after the one before it let the request through, so what one IP is refused for never uses up what the address's owner needs. Plus-tags and Gmail dots count as one address.

  | Layer | Limit |
  |---|---|
  | One mail a minute | per purpose (sign-up, reset), address and IP |
  | Per address and IP | 3 an hour, 6 a day |
  | Per address, any IP | 8 an hour, 20 a day (3 times that for the `ADMIN_EMAILS` addresses) |
  | All addresses together, per day | `CODE_MAILS_PER_DAY` (100) for sign-up codes, `RESET_MAILS_PER_DAY` (50) for reset codes, `ADMIN_CODE_MAILS_PER_DAY` (40) for the `ADMIN_EMAILS` addresses, a pool of its own |

  A spent daily pool is not silent: the page says "temporarily unavailable" (HTTP 503), and `wrangler tail` shows `mail-cap-reached` with the pool's name. Set an alert on that line.
- **Passwords:** 10 to 200 characters, not the email address, and not a guessable one: the common passwords (a small list is built in), repeated or sequential characters, a common word plus up to six digits or symbols, and anything containing the part of the email before the `@` or the person's name. They are stored as PBKDF2-SHA256 with 100,000 iterations and a salt per password, the WonderClip platform's settings and the most the Workers runtime allows. Each hash carries a version, so a stronger scheme can be added later and applied at each person's next sign-in.
- **Forgotten passwords:** `/forgot` emails a code, and `/reset` takes the code and a new password. A reset signs the account out everywhere, and the owner gets a "your password was changed" email.
- **Changing a password:** on `/account` (the address in the admin page's header, or **Account settings** on the waiting page). It signs out every other session.
- **Privacy of addresses:** none of these pages says whether an address has an account. Signing up with a registered address shows the usual "check your email" page and mails the owner a "you already have an account" note instead of a code. Sign-in failures always say "The email address or password is not right."
- **Limits and lockouts** (in D1). The rule behind them: the `ADMIN_EMAILS` address is public, so **a stranger who only knows an address can never make its owner's correct password or correct code fail**. Hard locks are keyed on something a stranger cannot share with the owner: the (address, IP) pair, a browser's own code flow, or a browser that signed in before (it carries a signed `__Host-ab_device` cookie, set by a correct password or a reset code).

  | What | Limit |
  |---|---|
  | Sign-in | 30 attempts per IP in 15 minutes. After 5 wrong passwords an (address, IP) pair is locked for 1 minute, then 2, 4, 8, up to 15 minutes per further failure; after 20 failures an IP is locked for 5 minutes, doubling up to an hour. Blank passwords and malformed addresses count against the IP only. A browser that signed in before is not held by any of this: it has its own counter (15 attempts in 15 minutes, locked after 10 wrong ones) |
  | Sign-in, address-wide | After 30 wrong guesses at one address from unknown browsers, from anywhere, in 15 minutes, new browsers are told to reset the password by email (which ends it) or wait; browsers that signed in before are not held |
  | Sign-up | 10 per IP an hour (30 a day). Nothing per address except the mail budget |
  | Codes | 30 entries per IP and 15 per browser flow in 15 minutes. After 10 wrong codes a flow is locked for 15 minutes, doubling up to a day; after 30 an IP is. Guesses in one browser's flow never touch another's code |
  | Forgot password | 10 per IP an hour |
  | Change password | 10 tries in 15 minutes; locked after 5 wrong current passwords |

  A password reset ends the sign-in lock for its address and IP and the address-wide guess counter, and marks the browser as known, so someone else's guessing can only delay the owner.

  **If someone cannot get in** (the admin address included), run this from `apps/worker`. It clears every lock, counter, code and sign-up in flight, never an account, and needs no code or sign-in:

  ```powershell
  npm run d1:unlock:remote
  ```

  That is `npx wrangler d1 execute alichitect --remote --env= --command "DELETE FROM lockouts; DELETE FROM rate; DELETE FROM codes; DELETE FROM signups"`. If the admin's password is lost as well, unlock, then reset it with an emailed code (`/forgot`), or make another account an admin with the SQL below.
- **The admin page:** on `/admin`, an admin can approve or decline a request, remove a person's access, make an approved person an admin, or remove admin rights. The last admin can never be demoted or removed, and nobody can remove or decline their own account.
- **Removing access** signs the person out at once. They can still sign in, and they see that their access was removed.
- **Adding an admin.** Choose one of these:
  - **On the admin page:** approve the person, then press **Make admin**. This is the usual way.
  - **Before they sign up:** add the address to `ADMIN_EMAILS` in `wrangler.jsonc` (comma-separated) and deploy. The address becomes an approved admin when it confirms its email, or at its next sign-in if its request is still waiting. It never overrides a decline or a removal.
  - **If nobody can reach the admin page:**

    ```powershell
    npx wrangler d1 execute alichitect --remote --env= --command "UPDATE users SET status = 'approved', role = 'admin' WHERE email = 'someone@gmail.com'"
    ```
- **Daily limit:** `TURNS_PER_DAY` (60) turns per person per UTC day; a turn the Claude backup finished counts as 2. Admins have no limit. Change it in `wrangler.jsonc` and deploy. The usage so far (the `'*'` row of Claude totals has no user and is left out):

  ```powershell
  npx wrangler d1 execute alichitect --remote --env= --command "SELECT u.email, s.day, s.turns, round(s.est_cost_usd, 4) AS usd FROM usage s JOIN users u ON u.id = s.user_id ORDER BY s.day DESC LIMIT 50"
  ```
- **Spend:** the daily limit is per person. Nothing caps the total of Model Studio across all approved users, so set a spend alert or a budget on the Model Studio side (the account that owns `DASHSCOPE_API_KEY`). The Claude backup has its own caps (see [Caps on the backup](#caps-on-the-backup)); also set a spend limit on the Anthropic Console organization that owns `ANTHROPIC_API_KEY`.
- **Access-request mail:** anyone can sign up. The admins are emailed for at most `REQUEST_MAILS_PER_DAY` (30) new requests in any 24 hours; further requests are still recorded and show on `/admin`, with no email. Open sign-up lets anyone with a mailbox leave a request, so `/admin` shows **Decline requests older than 7 days** above the request list when there are any: one step declines every pending request that has waited more than a week (the audit log records the count).
- **What a determined attacker can still do, and the fix when it matters:** with a pool of rotating IP addresses a stranger can still use up one address's hourly mail budget (8 mails; the `ADMIN_EMAILS` address has 24) or a daily pool, and can make the Worker mail a verification code to any third-party address (a few an hour per address, plus-tag and dot variants counted as one). Both end at a proof-of-human step this Worker does not have. If abuse shows up, put **Cloudflare Turnstile** in front of `/signup` and `/forgot`, or the Workers **Rate Limiting** binding, and move the sender to its own subdomain (for example `no-reply@auth.alikorea-demo.com`, onboarded in Email Sending, then `MAIL_FROM` here and in `wrangler.jsonc`) so a reputation problem stays off the domain WonderClip mails from. Until then `npm run d1:unlock:remote` is the operator's way back in.
- **Logs:** run `npx wrangler tail --env=`, or open Workers Observability in the dashboard. They hold metadata only: user ids, outcomes, timings, tokens and cost, and which rate limit refused something. They never hold an email address from a sign-in form, a password, a code, the asks, the replies or any secret.

## Local development

Use ports 8800 to 8810. The local server and Vite keep 8787 and 5174.

1. Create the local database:

   ```powershell
   npm run d1:migrate:local
   ```

   Migrations run in order: `0001_init.sql`, then `0002_availability.sql` (the per-browser sign-up and code tables), then `0003_rescue_caps.sql` (the Claude backup caps). A local database made before the switch from Google sign-in has the old tables, and the migration list says it is up to date. It holds only local test accounts: delete `apps/worker/.wrangler/state/v3/d1` and run the command again. A local database from the earlier email-and-password build upgrades by itself.

2. Create `.dev.vars` in `apps/worker`. It is gitignored. Use dummy values only:

   ```
   SESSION_SECRET=<48 or more random characters>
   DASHSCOPE_API_KEY=local-dummy
   ```

3. Build the web app: `cd ../web`, then `npm run build`, then `cd ../worker`.
4. Start the Worker: `npm run dev`. It runs wrangler dev on http://localhost:8800.

Local development uses `env.dev`:
- **Email:** not sent. Each mail's recipient and subject are written to the wrangler dev output instead (`MAIL_LOG`), and a code mail's subject carries the code, so you read codes from the terminal. The Worker ignores `MAIL_LOG` unless `ALLOWED_ORIGIN` is plain http on a loopback address, so codes can never reach production logs.
- **Database:** a local D1.

To run real turns locally without writing the key anywhere, use an env file of dummy values in place of `.dev.vars`. Wrangler then takes `DASHSCOPE_API_KEY`, and `ANTHROPIC_API_KEY` if your environment has it, from your environment and shows them only as `(hidden)`:

```powershell
npx wrangler dev --env dev --port 8800 --inspector-port 8809 --env-file C:\path\to\dummies.env
```

The env file holds only `SESSION_SECRET`, a dummy value.

To check the whole flow with headless Chrome, start the dev server with its output saved to a file, on a fresh local database (the check signs up the admin address, which must not exist yet):

```powershell
npx wrangler dev --env dev --port 8800 --inspector-port 8809 2>&1 | Tee-Object -FilePath dev.log
npm run e2e:local -- --mail-log dev.log
```

It reads the codes from `dev.log` and walks through: the admin signs up and confirms; a second person signs up, confirms and waits; the admin approves; the person signs in and streams a turn; the person resets the password, which signs out their other sessions; the admin removes their access. It writes 1440x900 screenshots to `apps/worker/screenshots/`.

Checks without a server:
- `npm test`
- `npm run typecheck`
- `npm run check:bundle`: bundles exactly as a deploy would and fails if any module imports a Node built-in.

## When something is wrong

| Symptom | Cause |
|---|---|
| The sign-in pages say sign-in is not set up | `SESSION_SECRET` is missing or shorter than 32 characters. Set it with `set-secrets.ps1 -Only SESSION_SECRET` |
| No code email arrives | Check that the Email Service sending domain `alikorea-demo.com` is still verified, and the spam folder. The mail budget (see Accounts and access) held it back if the page said to wait or "temporarily unavailable"; `npx wrangler tail --env=` shows `throttled` or `mail-cap-reached` (with the pool) lines. If strangers are using up an address's budget, wait, or run `npm run d1:unlock:remote` |
| "Too many wrong attempts" or "reset your password" | A lockout after repeated failures at this address from this IP, or the address-wide guess counter. Wait, sign in from a browser that has signed in before, reset the password with the emailed code (it ends both), or run `npm run d1:unlock:remote` |
| Turns fail with "No server key was set" | Set `DASHSCOPE_API_KEY` with `set-secrets.ps1 -Only DASHSCOPE_API_KEY` |
| Turns fail with "The server key was rejected" | The key is wrong, or not an international (dashscope-intl) key |
| Turns fail with "The model provider's content filter declined this request" | Model Studio's filter stopped the reply and the backup is off (`ANTHROPIC_API_KEY` is not in `wrangler secret list`; set it) |
| Turns fail with "This request couldn't be completed. Rephrase it and try again." (log: `backup-failed`) | The backup was not started (under 60 s of the turn deadline left: the log line's `backupSkipped.reason` is `deadline`; or the cap check failed: `unavailable`) or Claude was asked and failed too. The log line's `rescue.error` says why: `auth` (a wrong Anthropic key), `refusal`, `overloaded`, `rate-limited`, `output-budget` or `network` |
| Turns fail with "…or try again tomorrow." (log: `backup-limit`) | A cap on the backup is reached. The log line's `backupSkipped.detail` says `user-cap` (that person's rescues) or `global-cap` (the day's Claude budget). It resets at 00:00 UTC; raise the var in `wrangler.jsonc` and deploy to lift it sooner |
| A turn ends with a warning that the reply is incomplete | The filter stopped the reply and the Claude backup could not finish it; the warning says why. What was drawn is kept |
| No access-request email | Requests are recorded either way: check `/admin`. Then check the email sending domain, and `REQUEST_MAILS_PER_DAY` |
| Deploy fails on the custom domain | A DNS record named `architect` already exists in the zone. Remove it, or ask which demo owns it |
