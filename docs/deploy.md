---
type: Guide
title: Deploying
description: How the static build is checked in CI and published to Cloudflare Pages at fifths.mjftw.net, and the one-off Cloudflare, GitHub and DNS setup it needs.
resource: /docs/deploy.md
tags: [sdd, guide, deploy]
---

# Deploying

The app is a static site (Article VII: no server, no runtime services).
`pnpm build` writes plain files to `dist/`, and those files are served from
**Cloudflare Pages** at <https://fifths.mjftw.net>.

The GitHub Actions workflow `.github/workflows/ci.yml` has two jobs.

**`check`** runs on every pull request and every push to `main`:

1. installs Rust stable with the `wasm32-unknown-unknown` target, and Node from
   `.tool-versions` with pnpm;
2. `pnpm install --frozen-lockfile`;
3. `pnpm build:sound`, which builds the WASM that the tests and the build load;
4. the repository guards: `scripts/check-contexts.sh`, `check-scenarios.sh`,
   `check-specs.sh` and `check-design.sh`;
5. `pnpm check`: prettier, eslint, tsc, vitest, cargo fmt, clippy and cargo
   test;
6. `pnpm build`, uploading `dist/` as the run's `dist` artifact (kept 7 days).

**`deploy`** runs only on pushes to `main`, and only after `check` has passed.
It downloads that same `dist/` and runs
`wrangler pages deploy dist --project-name=fifths --branch=main`. A pull
request never deploys, and a failing check means nothing is published.

To make passing CI a requirement before merging, go to GitHub → Settings →
Branches → add a rule for `main` → Require status checks to pass → select
`check`.

The build runs in GitHub Actions and not in Cloudflare's own Git builds because
of the Rust toolchain. Cloudflare only hosts the finished `dist/`.

The domain `mjftw.net` stays at **Fasthosts**. A subdomain on Pages needs only a
CNAME there, so the domain does not have to move to Cloudflare. Only the bare
domain (`mjftw.net` itself) or a Workers custom domain would need Cloudflare to
manage it.

## One-off setup

Do these once, in this order.

### 1. Create the Pages project

The project is a "Direct Upload" project, which means Cloudflare never builds
anything itself. Create it from the command line:

```bash
pnpm dlx wrangler login
pnpm dlx wrangler pages project create fifths --production-branch=main
```

You can also use the dashboard: Workers & Pages → Create → Pages → Upload
assets, name it `fifths`, and upload any folder once. The `--branch=main` in
the workflow must match the production branch, otherwise deploys land as
previews.

### 2. Create an API token

Go to Cloudflare dashboard → My Profile → API Tokens → Create Token → Custom
token and set:

| Setting            | Value                                  |
| ------------------ | -------------------------------------- |
| Permissions        | Account · Cloudflare Pages · **Edit**  |
| Account Resources  | Include · _your account_               |
| TTL                | none, or a date you will remember      |

Copy the token; it is shown only once. Your **Account ID** is on the right-hand
side of any zone's Overview page, and at Workers & Pages → Overview.

### 3. Add the GitHub secrets

In the repository, go to Settings → Secrets and variables → Actions → New
repository secret:

| Name                    | Value              |
| ----------------------- | ------------------ |
| `CLOUDFLARE_API_TOKEN`  | the token from §2  |
| `CLOUDFLARE_ACCOUNT_ID` | the account ID     |

Or with the GitHub CLI:

```bash
gh secret set CLOUDFLARE_API_TOKEN --repo mjftw/music-learning-assistant
gh secret set CLOUDFLARE_ACCOUNT_ID --repo mjftw/music-learning-assistant
```

### 4. First deploy

Push to `main`, or run the workflow by hand from Actions → ci → Run
workflow. When it finishes, the site is live at `https://fifths.pages.dev`.

### 5. Custom domain

Do the Cloudflare side first. If the DNS record exists before Pages knows the
domain, requests fail with a 522.

1. Cloudflare → Workers & Pages → `fifths` → Custom domains → Set up a
   custom domain → `fifths.mjftw.net`. Cloudflare will say the domain is not
   on Cloudflare and show the CNAME to create.
2. Fasthosts → Domains → `mjftw.net` → DNS → add:

   | Type  | Host     | Points to          | TTL     |
   | ----- | -------- | ------------------ | ------- |
   | CNAME | `fifths` | `fifths.pages.dev` | default |

3. Wait for the custom domain in Cloudflare to show **Active**. Cloudflare
   issues the TLS certificate itself. This usually takes minutes, but it can be
   up to a day while the DNS change spreads.

Check it:

```bash
dig +short fifths.mjftw.net CNAME
# fifths.pages.dev.
curl -sI https://fifths.mjftw.net/ | head -1
# HTTP/2 200
```

## Things the host must get right

These are what break the app if the host gets them wrong. Cloudflare Pages
handles each one by default. Check them after the first deploy, and again if
the site ever moves to another host.

- **HTTPS.** AudioWorklet, `getUserMedia` (the tuner) and the Screen Wake Lock
  only exist in a secure context. Over plain HTTP the app shows "Sound
  unavailable".
- **`.wasm` served as `application/wasm`.** The engines load with
  `WebAssembly.compileStreaming(fetch(url))`, which refuses any other
  Content-Type. Check it:

  ```bash
  js=$(curl -s https://fifths.mjftw.net/ | grep -o 'assets/index-[^"]*\.js')
  wasm=$(curl -s "https://fifths.mjftw.net/$js" | grep -o 'assets/sound-[^"]*\.wasm' | head -1)
  curl -sI "https://fifths.mjftw.net/$wasm" | grep -i content-type
  # content-type: application/wasm
  ```

- **No cross-origin isolation needed.** Nothing uses `SharedArrayBuffer`, so no
  COOP/COEP headers are needed.

## Caching

`src/ui/public/_headers` is copied to `dist/_headers`, and Pages reads it:

- `/assets/*` gets `max-age=31536000, immutable`, because every file there has a
  content hash in its name;
- `/` and `/index.html` get `no-cache`, so a new deploy shows up on the next
  load.

## Day to day

- **Deploy:** merge to `main`.
- **Redeploy without a commit:** Actions → ci → Run workflow.
- **Roll back:** Cloudflare → `fifths` → Deployments → pick an earlier
  production deployment → ⋯ → Rollback. This is instant, and nothing is
  rebuilt.
- **Deploy from a laptop** (for emergencies; this skips the check gate):

  ```bash
  pnpm build
  pnpm dlx wrangler pages deploy dist --project-name=fifths --branch=main
  ```

- **Rotate the token:** create a new one as in §2, replace the
  `CLOUDFLARE_API_TOKEN` secret, then delete the old token in Cloudflare.
