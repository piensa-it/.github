# Piensa IT — Deployment Standard

How every Piensa IT project ships to production. Implemented as
`reusable-deploy.yml` in this repo and consumed by a thin wrapper in each
project, the same pattern as the quality gate.

For *what each protection catches and the failure that bought it*, see
`QUALITY_GATE.md`. This document is the doctrine around it: what it covers,
how to deploy, how to roll back, and how to adopt it.

## Scope — read this before assuming it applies

| Covered today | Not covered yet |
| ------------- | --------------- |
| Static frontends: SPAs and prebuilt sites published to Netlify | Backends and gateways |
| Production only, from `main` | Staging and per-PR previews |
| | Container images and any registry |
| | Package publishing (GitHub Packages) |

The right-hand column is **not covered**, not "covered badly". A project of
that kind should keep its own deploy workflow until this standard grows a
reusable for it. `reusable-deploy.yml` is parametrized so adding one is a
matter of inputs rather than a rewrite, but nobody has done it yet and it has
not been proven.

**Status: not yet proven in a real run.** As of 2026-08-12 the workflow has
been validated by simulating its shell logic outside Actions and by parsing
every YAML file. That catches syntax and logic errors, not the real behaviour
of GitHub Actions. The first production deploy of `app-misfin` is the actual
test. Do not propagate this to other repositories until that run is green.

## The model

**Actions builds. Netlify publishes.** Netlify is unlinked from Git and never
compiles anything; it receives a compiled `dist/` and serves it.

The point is that **the commit that passes the quality gate is the commit that
ships**, with the same Node version and the same lockfile. When two systems
build separately, CI stays green while production breaks on an environment
difference — it is one of the most expensive failure modes there is, because
the evidence says everything is fine.

That guarantee rests on one condition, and it is easy to break by accident:
**`node_version` in a repo's `deploy.yml` must match its `quality-gate.yml`.**
`app-misfin` shipped for weeks with a gate on Node 22 and a deploy on Node 20,
inherited from a `netlify.toml` written back when Netlify still built. It never
failed, which is exactly why nobody looked at it.

What this costs: **no automatic per-PR deploy previews.** They were dropped
deliberately rather than accidentally — restoring them means giving secrets to
builds of pull requests, and that needs designing, not enabling.

## Deploying

Merge to `main`. That is the whole procedure.

To re-run a deploy without inventing an empty commit: **Actions → Deploy a
producción → Run workflow**. Note this deploys the current head of the branch
you pick, *not* an arbitrary past commit — see rollback below.

Concurrency is serialized per repository and environment: a second merge waits
for the first instead of racing it. Two simultaneous deploys can land out of
order and leave production sitting on the older commit.

## Rollback

Netlify keeps every deploy and can restore a previous one immediately. That is
the fastest path back, and it does not need CI.

**Netlify UI:** Deploys → pick the last known-good deploy → *Publish deploy*.

Deploy messages carry the short SHA and branch (`a1b2c3d — main (GitHub
Actions)`), so the list doubles as a map from published site to commit. Find
the commit with:

```bash
git show a1b2c3d --stat
```

**From the CLI**, if you know the deploy id:

```bash
npx netlify-cli@17 api restoreSiteDeploy --data '{"site_id":"<UUID>","deploy_id":"<ID>"}'
```

### The trap, which is the important part

**A Netlify rollback does not change the repository.** `main` still contains
the commit that broke production. The next merge to `main` triggers a deploy
that rebuilds from `main` — and re-publishes the broken code, silently, because
from CI's point of view nothing is wrong.

So a rollback is a *stopgap that buys time*, never the fix. The sequence is:

1. Roll back in Netlify. Production is healthy again.
2. **Immediately** open a revert: `git revert <sha>` and merge it.
3. Only then diagnose at a normal pace.

Skipping step 2 works right up until somebody merges an unrelated PR and
production breaks again for no visible reason, hours later, with a completely
misleading trigger.

If a rollback is ever needed, add a row to the repo's own quality-gate notes:
what shipped, what broke, and which check would have caught it. That row is how
this standard grows the next protection — every check in it exists because
something failed first.

## Adopting the standard in a repository

Each step is verifiable. Do not batch them.

**1. Check the prerequisites.**

- The build produces a static directory (`dist/`, `build/`, `out/`).
- The repo already consumes the quality gate. If it does not, do that first:
  a deploy standard on top of an unverified build is a faster way to publish
  something broken.

**2. Set the secrets** (Settings → Secrets and variables → Actions). See
`SECRETS.md` for which belong to the organization and which to the repo.
`NETLIFY_SITE_ID` is per-repo and always: at org level it would point every
project at one site, and the first deploy to notice would be the one that
overwrote another product's production.

**3. Write the wrapper** as `.github/workflows/deploy.yml`. Use `app-misfin`'s
as the reference. The part that needs thought is the variable map:

```yaml
build_env_map: |
  VITE_SUPABASE_URL=BACKEND_URL          # build's name = standard secret
required_build_vars: |
  VITE_SUPABASE_URL                      # empty -> error, app would not boot
bundle_assert_vars: |
  VITE_SUPABASE_URL                      # must appear in the compiled output
```

Three separate questions, deliberately:

- `build_env_map` — what the build calls it vs. what the secret is called.
- `required_build_vars` — **does the app boot without it?** If yes it only
  warns. Blocking a deploy over a variable that merely disables a payment form
  teaches people to bypass the gate; letting a boot-critical one through
  publishes a blank page. That is the whole distinction.
- `bundle_assert_vars` — public values whose presence in the compiled output
  proves the build actually picked them up. Never list a private value here:
  a private key must not be in a bundle, and asserting that it *is* would
  enshrine the mistake.

**4. Match `node_version` to the quality gate.** Copy it across; do not
remember it.

**5. Delete whatever it replaces.** The repo's old deploy workflow, and the
`[build]` block in `netlify.toml` — Netlify no longer builds, so that block is
dead config that still has an effect (it is where the Node 20/22 divergence
came from). Leaving both is how a repo ends up paying twice and trusting the
wrong one.

**6. Unlink Netlify from Git** (Site configuration → Build & deploy → *Unlink
repository*). Skipping this leaves two systems deploying the same site, and the
race is silent.

**7. Deploy once, on purpose.** Merge a trivial change and watch the run. Then
open the site. A green pipeline is not evidence that the page loads — that is
precisely the failure this standard exists to prevent.

## Versioning

Wrappers pin `@v1`, never `@main`. See `QUALITY_GATE.md` for the tag policy and
when to cut `v2`.
