# Deploying the Architecture Builder

The app runs as one Cloudflare Worker, `alichitect`, at **https://architect.alikorea-demo.com**. The Worker serves the web app (`apps/web/dist`) as static assets, puts every request behind Google sign-in and admin approval, and runs `POST /api/turn` against Model Studio (dashscope-intl) with the key held as a Worker secret. The code and its configuration are in `apps/worker` (`wrangler.jsonc`).

| Piece | Where |
|---|---|
| Cloudflare account | `cfd2a327acfb7d93dc045825f12dd38d` (Dysung.alicloud@gmail.com's Account, Workers Paid) |
| Address | the custom domain `architect.alikorea-demo.com`. It is the only route: the `alikorea-demo.com` zone also serves other demos |
| Database | D1 `alichitect`: users, sessions, usage, audit (`apps/worker/migrations`) |
| Email | Cloudflare Email Service, from `no-reply@alikorea-demo.com` (already set up for the WonderClip platform) |
| Secrets | `DASHSCOPE_API_KEY`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET`, on the Worker only |
| First admin | `dysung.alicloud@gmail.com`, from the `ADMIN_EMAILS` var, at its first sign-in |

## Before you start

- Node 24 and npm.
- `CLOUDFLARE_EMAIL` and `CLOUDFLARE_API_KEY` (the global API key) in your environment. The scripts sign wrangler in with them.
- `DASHSCOPE_API_KEY` in your environment: the same key the local server uses.
- Install the tools once: `cd apps/worker` then `npm ci`.

Every command below runs from `apps/worker` in PowerShell. `--env=` (an empty environment name) selects the production configuration; `--env dev` is local development only.

## One-time setup

### 1. Create the Google OAuth client

In the [Google Cloud console](https://console.cloud.google.com/), pick or create a project (for example `alichitect`), then open **Google Auth Platform**.

1. **Branding** (the consent screen):
   - App name: `Alibaba Cloud Architecture Builder`.
   - User support email and developer contact: `dysung.alicloud@gmail.com`.
   - App home page: `https://architect.alikorea-demo.com`.
   - Authorized domains: `alikorea-demo.com`.
   - Leave the logo empty. Uploading a logo starts Google's brand verification, and the app does not need it.
2. **Audience**:
   - User type: **External**.
   - Publishing status: press **Publish app** to move it to **In production**. In Testing mode, only the test users you list can sign in.
   - The app asks only for `openid`, `email` and `profile`, which are not sensitive scopes, so publishing needs no Google review.
3. **Data access**: add the scopes `openid`, `.../auth/userinfo.email` and `.../auth/userinfo.profile`.
4. **Clients**, then **Create client**:
   - Application type: **Web application**. Name: `alichitect`.
   - Authorized redirect URIs:
     - `https://architect.alikorea-demo.com/auth/callback`
     - `http://localhost:8800/auth/callback` (local development against the real Google)
   - Authorized JavaScript origins can stay empty: the code is exchanged on the server.
5. Copy the **Client ID** into `apps/worker/wrangler.jsonc`, in `vars.GOOGLE_CLIENT_ID` (top level, not under `env.dev`). The client ID is not a secret.
6. Keep the **Client secret** ready for step 3. Google shows it only when the client is created. If it is lost, add a new secret to the client and delete the old one.

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

The script sets three secrets:
- It reads `DASHSCOPE_API_KEY` from your environment.
- It asks for the Google client secret with a hidden prompt.
- It generates `SESSION_SECRET`: 48 random bytes.

Each value reaches `wrangler secret put` on standard input and is never printed. If the Worker does not exist yet, wrangler creates an empty one to hold them.

The script can also change one secret at a time:
- Change the Model Studio key: `-Only DASHSCOPE_API_KEY`.
- Change the Google client secret: `-Only GOOGLE_CLIENT_SECRET`.
- Replace the session secret: `-Only SESSION_SECRET -RotateSession`. This signs everybody out. Without `-RotateSession`, an existing session secret is kept.

### 4. First deploy

Check that no DNS record named `architect` exists in the `alikorea-demo.com` zone. Wrangler creates that record, and its certificate, for the custom domain, and fails if a record is already there. Then run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\deploy.ps1
```

The script runs these steps in order and stops at the first failure:
1. **Preflight** (`npm run preflight`): refuses to go on while `wrangler.jsonc` still has a placeholder.
2. Builds `apps/web`.
3. Runs the Worker tests.
4. Applies the remote D1 migrations. Confirm the prompt.
5. Runs `wrangler deploy`.

### 5. Check it

1. Open `https://architect.alikorea-demo.com/api/health`. Signed out it shows only `{"ok":true}`, which is all the Worker tells anonymous callers. After step 2 below, open it again: signed in, it also shows `"keyConfigured":true`.
2. Open `https://architect.alikorea-demo.com` and sign in with `dysung.alicloud@gmail.com`. That account becomes an approved admin and lands in the builder.
3. Open `/admin`: you are listed as the only admin.
4. From another Google account, sign in and request access. The admin gets an email. Approve the request on `/admin`, and the person gets an email too.
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
- **D1:** migrations only ever add.
- **The secrets.**

To change only the model key or a secret, use `set-secrets.ps1`; no rollback is needed.

## Admins and access

- **Requests:** a person signs in with Google and lands on `/pending`, where they can add a note and press **Request access**. Every admin then gets an email.
- **The admin page:** on `/admin`, an admin can approve or decline a request, remove a person's access, make an approved person an admin, or remove admin rights. The last admin can never be demoted or removed, and nobody can remove or decline their own account.
- **Removing access** signs the person out at once.
- **Adding an admin.** Choose one of these:
  - **On the admin page:** approve the person, then press **Make admin**. This is the usual way.
  - **Before their first sign-in:** add the address to `ADMIN_EMAILS` in `wrangler.jsonc` (comma-separated) and deploy. The address becomes an approved admin when it signs in, or right away if its request is still waiting. It never overrides a decline or a removal.
  - **If nobody can reach the admin page:**

    ```powershell
    npx wrangler d1 execute alichitect --remote --env= --command "UPDATE users SET status = 'approved', role = 'admin' WHERE email = 'someone@gmail.com'"
    ```
- **Daily limit:** `TURNS_PER_DAY` (60) turns per person per UTC day. Admins have no limit. Change it in `wrangler.jsonc` and deploy. The usage so far:

  ```powershell
  npx wrangler d1 execute alichitect --remote --env= --command "SELECT u.email, s.day, s.turns, round(s.est_cost_usd, 4) AS usd FROM usage s JOIN users u ON u.id = s.user_id ORDER BY s.day DESC LIMIT 50"
  ```
- **Spend:** the daily limit is per person. Nothing caps the total across all approved users, so set a spend alert or a budget on the Model Studio side (the account that owns `DASHSCOPE_API_KEY`).
- **Access-request mail:** anyone with a Google account can sign in and ask for access. The admins are emailed for at most `REQUEST_MAILS_PER_DAY` (30) new requests in any 24 hours; further requests are still recorded and show on `/admin`, with no email.
- **Logs:** run `npx wrangler tail --env=`, or open Workers Observability in the dashboard. They hold metadata only: user ids, outcomes, timings, tokens and cost. They never hold the asks, the replies or any secret.

## Local development

Use ports 8800 to 8810. The local server and Vite keep 8787 and 5174.

1. Create the local database:

   ```powershell
   npm run d1:migrate:local
   ```

2. Create `.dev.vars` in `apps/worker`. It is gitignored. Use dummy values only:

   ```
   SESSION_SECRET=<48 or more random characters>
   GOOGLE_CLIENT_SECRET=local-dummy
   DASHSCOPE_API_KEY=local-dummy
   ```

3. Build the web app: `cd ../web`, then `npm run build`, then `cd ../worker`.
4. Start the Worker: `npm run dev`. It runs wrangler dev on http://localhost:8800.

Local development uses `env.dev`:
- **Sign-in:** a fake Google page that asks which address to sign in as. The Worker refuses that page unless both the page and `ALLOWED_ORIGIN` are on a plain-http loopback address, so it can never run in production.
- **Email:** not sent. The subjects are logged instead (`MAIL_LOG`).
- **Database:** a local D1.

To run real turns locally without writing the key anywhere, use an env file of dummy values in place of `.dev.vars`. Wrangler then takes `DASHSCOPE_API_KEY` from your environment and shows it only as `(hidden)`:

```powershell
npx wrangler dev --env dev --port 8800 --inspector-port 8809 --env-file C:\path\to\dummies.env
```

The env file holds only `SESSION_SECRET` and `GOOGLE_CLIENT_SECRET`, both dummy values.

To check the whole flow with headless Chrome (sign-in, request, approval, the app, a streamed turn and a removal), run this while the dev server is up:

```powershell
npm run e2e:local
```

It writes 1440x900 screenshots to `apps/worker/screenshots/`.

Checks without a server:
- `npm test`
- `npm run typecheck`
- `npm run check:bundle`: bundles exactly as a deploy would and fails if any module imports a Node built-in.

## When something is wrong

| Symptom | Cause |
|---|---|
| `/login` says sign-in is not set up | `SESSION_SECRET` or `GOOGLE_CLIENT_SECRET` is missing, or `GOOGLE_CLIENT_ID` is still the placeholder |
| Google says `redirect_uri_mismatch` | The OAuth client lacks `https://architect.alikorea-demo.com/auth/callback`. Add it exactly, with no trailing slash |
| Google says the app is in testing | Publish the consent screen (step 1.2) |
| Turns fail with "No server key was set" | Set `DASHSCOPE_API_KEY` with `set-secrets.ps1 -Only DASHSCOPE_API_KEY` |
| Turns fail with "The server key was rejected" | The key is wrong, or not an international (dashscope-intl) key |
| No access-request email | Check that the Email Service sending domain `alikorea-demo.com` is still verified. Requests are recorded either way: check `/admin` |
| Deploy fails on the custom domain | A DNS record named `architect` already exists in the zone. Remove it, or ask which demo owns it |
