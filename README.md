# Music Learning Assistant

Helps to learn music on an instrument

Built spec-first with AI agents from the [sdd-starter](https://github.com/mjftw/sdd-starter)
template. The workflow is in [`docs/sdd-guide.md`](docs/sdd-guide.md). The
product is described in [`docs/product.md`](docs/product.md); the bounded
contexts in [`docs/domain.md`](docs/domain.md); the vertical slices and their
status in [`docs/roadmap.md`](docs/roadmap.md); every decision made in
[`docs/decisions.md`](docs/decisions.md). Start at [`index.md`](index.md).

## Getting started

```bash
pnpm install         # install dependencies
pnpm dev             # run the app — open the printed URL (add --host to reach it from your phone)
pnpm check           # everything: format check, lint, typecheck, tests
```

## Deploying

Every push to `main` is checked and published to Cloudflare Pages at
<https://fifths.mjftw.net> by `.github/workflows/deploy.yml`. For the one-off
setup (Pages project, API token, GitHub secrets, the Fasthosts CNAME), see
[`docs/deploy.md`](docs/deploy.md).
