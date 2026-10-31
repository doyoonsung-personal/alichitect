# Deploying the Architecture Builder

The app runs as one Cloudflare Worker, `alichitect`, at **https://architect.alikorea-demo.com**. The Worker serves the web app (`apps/web/dist`) as static assets and runs `POST /api/turn` against Model Studio (dashscope-intl) with the key held as a Worker secret. Every request goes through the Worker's accounts, which work like the WonderClip platform's:

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
| Secrets | `DASHSCOPE_API_KEY` and `SESSION_SECRET`, on the Worker only |
| First admin | `dysung.alicloud@gmail.com`, from the `ADMIN_EMAILS` var, as soon as it confirms its email |

## Before you start

- Node 24 and npm.
- `CLOUDFLARE_EMAIL` and `CLOUDFLARE_API_KEY` (the global API key) in your environment. The scripts sign wrangler in with them.
- `DASHSCOPE_API_KEY` in your environment: the same key the local server uses.
- Install the tools once: `cd apps/worker` then `npm ci`.

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

The script sets two secrets:
- It reads `DASHSCOPE_API_KEY` from your environment.
- It generates `SESSION_SECRET`: 48 random bytes. It signs the session cookies and the cookie that carries a code flow from page to page, and it keys the stored code and rate-limit hashes.

Each value reaches `wrangler secret put` on standard input and is never printed. If the Worker does not exist yet, wrangler creates an empty one to hold them.

The script can also change one secret at a time:
- Change the Model Studio key: `-Only DASHSCOPE_API_KEY`.
- Replace the session secret: `-Only SESSION_SECRET -RotateSession`. This signs everybody out and voids every code already mailed. Without `-RotateSession`, an existing session secret is kept.

If a `GOOGLE_CLIENT_SECRET` secret is still on the Worker from the earlier Google sign-in, the script says so and prints the command that removes it.

### 4. First deploy

Check that no DNS record named `architect` exists in the `alikorea-demo.com` zone. Wrangler creates that record, and its certificate, for the custom domain, and fails if a record is already there. Then run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\deploy.ps1
```

The script runs these steps in order and stops at the first failure:
1. **Preflight** (`npm run preflight`): refuses to go on while `wrangler.jsonc` still has the D1 placeholder, sets the local-only `MAIL_LOG`, or lacks a sender address on `alikorea-demo.com` or the email binding.
2. Builds `apps/web`.
3. Runs the Worker tests.
4. Applies the remote D1 migrations. Confirm the prompt.
5. Runs `wrangler deploy`.

### 5. Check it

1. Open `https://architect.alikorea-demo.com/api/health`. Signed out it shows only `{"ok":true}`, which is all the Worker tells anonymous callers. After step 2 below, open it again: signed in, it also shows `"keyConfigured":true`.
2. Open `https://architect.alikorea-demo.com/signup` and create the account for `dysung.alicloud@gmail.com` with a strong password. Enter the 6-digit code from the email (subject `[Architecture Builder] Verification code ...`). The account becomes an approved admin and lands in the builder.
3. Open `/admin`: you are listed as the only admin.
4. From another address, create an account and enter its code. It lands on the waiting page, and the admin gets an email. Approve the request on `/admin`; the person gets an email and can sign in.
5. Check that a closed tab stops a turn. In a terminal run `npx wrangler tail --env=`, start a real turn in the builder and close the tab while it streams. The turn's log line should show `"clientGone":true` soon after. The local dev server cannot show this. If it shows `"clientGone":false` and the turn runs to its deadline (`"deadlineHit":true`), the closed tab keeps that user's one turn slot busy until the deadline; lower `TURN_DEADLINE_MS` in `wrangler.jsonc` and tell the developer.

## Redeploying

You can redeploy in either of these ways:
- **From your machine:** `powershell -ExecutionPolicy Bypass -File scripts\deploy.ps1`.
- **From GitHub:** go to **Actions**, open **Deploy**, choose **Run workflow** and type `deploy`. It runs the same steps as the script, then a health check. It only ever runs by hand.

Secrets survive deploys, and only migrations that have not been applied yet run.

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
- **D1:** migrations are never undone (a rollback leaves the tables as the latest migration made them; 0002 only replaced the tables for sign-ups and codes in flight, no account data).
- **The secrets.**

To change only the model key or a secret, use `set-secrets.ps1`; no rollback is needed.

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
- **Daily limit:** `TURNS_PER_DAY` (60) turns per person per UTC day. Admins have no limit. Change it in `wrangler.jsonc` and deploy. The usage so far:

  ```powershell
  npx wrangler d1 execute alichitect --remote --env= --command "SELECT u.email, s.day, s.turns, round(s.est_cost_usd, 4) AS usd FROM usage s JOIN users u ON u.id = s.user_id ORDER BY s.day DESC LIMIT 50"
  ```
- **Spend:** the daily limit is per person. Nothing caps the total across all approved users, so set a spend alert or a budget on the Model Studio side (the account that owns `DASHSCOPE_API_KEY`).
- **Access-request mail:** anyone can sign up. The admins are emailed for at most `REQUEST_MAILS_PER_DAY` (30) new requests in any 24 hours; further requests are still recorded and show on `/admin`, with no email. Open sign-up lets anyone with a mailbox leave a request, so `/admin` shows **Decline requests older than 7 days** above the request list when there are any: one step declines every pending request that has waited more than a week (the audit log records the count).
- **What a determined attacker can still do, and the fix when it matters:** with a pool of rotating IP addresses a stranger can still use up one address's hourly mail budget (8 mails; the `ADMIN_EMAILS` address has 24) or a daily pool, and can make the Worker mail a verification code to any third-party address (a few an hour per address, plus-tag and dot variants counted as one). Both end at a proof-of-human step this Worker does not have. If abuse shows up, put **Cloudflare Turnstile** in front of `/signup` and `/forgot`, or the Workers **Rate Limiting** binding, and move the sender to its own subdomain (for example `no-reply@auth.alikorea-demo.com`, onboarded in Email Sending, then `MAIL_FROM` here and in `wrangler.jsonc`) so a reputation problem stays off the domain WonderClip mails from. Until then `npm run d1:unlock:remote` is the operator's way back in.
- **Logs:** run `npx wrangler tail --env=`, or open Workers Observability in the dashboard. They hold metadata only: user ids, outcomes, timings, tokens and cost, and which rate limit refused something. They never hold an email address from a sign-in form, a password, a code, the asks, the replies or any secret.

## Local development

Use ports 8800 to 8810. The local server and Vite keep 8787 and 5174.

1. Create the local database:

   ```powershell
   npm run d1:migrate:local
   ```

   Migrations run in order: `0001_init.sql`, then `0002_availability.sql` (the per-browser sign-up and code tables). A local database made before the switch from Google sign-in has the old tables, and the migration list says it is up to date. It holds only local test accounts: delete `apps/worker/.wrangler/state/v3/d1` and run the command again. A local database from the earlier email-and-password build upgrades by itself.

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

To run real turns locally without writing the key anywhere, use an env file of dummy values in place of `.dev.vars`. Wrangler then takes `DASHSCOPE_API_KEY` from your environment and shows it only as `(hidden)`:

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
| No access-request email | Requests are recorded either way: check `/admin`. Then check the email sending domain, and `REQUEST_MAILS_PER_DAY` |
| Deploy fails on the custom domain | A DNS record named `architect` already exists in the zone. Remove it, or ask which demo owns it |
