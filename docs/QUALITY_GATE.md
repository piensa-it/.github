# Piensa IT — Quality Gate Standard

The quality gate is the mandatory, blocking set of checks every repository must
pass before code merges to `main`. It is implemented as **reusable workflows**
in this repo (`piensa-it/.github`) and consumed by a thin wrapper in each repo,
so the standard lives in one place and every project inherits the same bar.

## Design principles

1. **Blocking, not tapiado.** Checks block merge when they fail, but thresholds
   are set to *no-regression* so a repo is never permanently red. You cannot make
   things worse; you raise the bar as the code improves.
2. **Parametrized, not one-size-fits-all.** Repos differ (app today, backend
   tomorrow; app vs. library). The reusable workflow accepts inputs so each repo
   declares its reality (test command, coverage floor, whether it has e2e).
3. **Preserve hard-won practices.** SHA-pinned actions, smart e2e skips, and
   honest coverage floors already present in mature repos are canonized, not
   discarded.
4. **A skipped job may never report green.** When a check can't run — a missing
   secret, an absent dependency — it **fails**, with an `::error::` naming
   exactly what is missing and where to set it. Not running is not passing.

   This principle used to say the opposite: *"when a check can't run due to
   missing secrets (not code), it skips with a notice instead of a false red."*
   The intent was sound — a repo without secrets fails every test on config
   rather than on a real defect, and that trains people to ignore red. The cure
   turned out to be worse than the disease. On 2026-08-10 both e2e jobs in
   `app-misfin` PR #22 reported success in six and nine seconds, less time than
   installing Playwright takes. A secret had been renamed during the migration
   to the standard names, the condition went false, every step skipped, and the
   job passed. For weeks every PR carried an "end-to-end tests passed" stamp
   that meant nothing.

   **An annoying red gets investigated. A false green gets nobody's attention.**

   A repo that has just adopted the standard and has not configured its secrets
   yet *should* be red. That is not friction — it is the standard telling it
   what it still needs.

   Skipping remains possible, but only as a decision written down in the repo's
   own wrapper (`e2e_enabled: false`), where whoever opens the file can see it,
   next to a sentence explaining why. The difference is that one is read in the
   project's file and the other has to be hunted for inside a shared workflow
   three repositories away.

## The gate — what every repo runs on each PR

| Stage           | Tool / action                         | Policy                         |
| --------------- | ------------------------------------- | ------------------------------ |
| PR metadata     | branch name + PR title (Conventional) | **Blocking**                   |
| Lint            | ESLint (`npm run lint`)               | **Blocking**                   |
| Typecheck       | `tsc --noEmit` (`npm run typecheck`)  | **Blocking**                   |
| Unit tests      | Vitest/Jest (`npm test`)              | **Blocking**                   |
| Coverage floor  | provider thresholds (no-regression)   | **Blocking** (per-repo floor)  |
| Build           | `npm run build`                       | **Blocking**                   |
| Secret scan     | Gitleaks                              | **Blocking**                   |
| SAST            | Semgrep (`p/default p/typescript p/react`) | **Blocking**              |
| Dependency audit| `npm audit --omit=dev`                | **Blocking** (high+)           |
| E2E             | Playwright                            | **Blocking** unless `e2e_enabled: false` |

Deploy previews per PR are currently not part of the gate: they would require
passing secrets to builds of pull requests, which is deliberately out of scope
while the repositories are being stabilised.

## Deploy — `reusable-deploy.yml`

Production deploys run through the same wrapper pattern as the gate. Netlify no
longer builds anything: it is unlinked from Git and receives compiled files, so
**the commit that passes the gate is the commit that ships**, built with the
same Node version and the same lockfile. Two systems building separately is how
CI stays green while production breaks on an environment difference.

For that guarantee to hold, `node_version` in a repo's `deploy.yml` **must match
its `quality-gate.yml`**. If they diverge, the commit that was tested is not the
commit that ships and the whole reason for the move evaporates.

| Protection | What it catches | Why it exists |
| ---------- | --------------- | ------------- |
| Credentials checked first | Bad or missing Netlify token/site ID | The CLI reports `Unauthorized: could not retrieve site` at the end of a two-minute build, and that message cannot distinguish a bad token from a missing site |
| Build vars asserted **in the bundle** | Variables that were set but never reached the compiled output | Vite substitutes an empty string for a missing variable and emits a valid bundle that dies on load with `supabaseUrl is required`. Build green, deploy green, site blank |
| Empty `dist` refused | A build that produced nothing publishable | Uploading zero files is a *successful* operation, so a broken build takes the site down while reporting success |
| `::error::` names the secret | Any missing credential | A generic error from a third-level tool costs an hour of opening settings pages |

Config is validated **before** `npm ci`, so a missing secret costs seconds
rather than a full install and build.

### The part that is parametrized

`build_env_map` — newline-separated `BUILD_VAR=STANDARD_SECRET` pairs, the same
convention as `reusable-e2e.yml`. It is deliberately the main input, because it
is what differs in every project and what caused all four consecutive failed
deploys on 2026-08-11. The publish step never failed; the variable map did.

`required_build_vars` splits them: listed variables block the deploy when empty
(the app would not boot), unlisted ones only warn (a feature degrades). Blocking
a deploy on a variable that merely disables a payment form trains people to
bypass the gate; letting a boot-critical one through publishes a blank page.

`bundle_assert_vars` lists the variables whose value must literally appear in
the compiled output. This is a different question from "is the secret set", and
it is the one that matters: it verifies the value reached the product.

## Versioning of the reusable workflows

Wrappers pin a **tag**, not `@main`:

```yaml
uses: piensa-it/.github/.github/workflows/reusable-quality-gate.yml@v1
```

`@main` means every repository in the organization inherits an in-progress edit
to a shared workflow the moment it is pushed — including breaking ones, with no
way to stage the rollout. `@v1` is a moving tag on the latest backwards-
compatible state: fixes and new optional inputs arrive automatically, breaking
changes do not.

- **Backwards-compatible change** (bugfix, new input with a default): commit to
  `main`, then move the `v1` tag onto it.
- **Breaking change** (input removed or renamed, default flipped, a check that
  starts failing where it used to pass): cut `v2`. Leave `v1` where it is, and
  migrate wrappers repo by repo.

Moving a tag is a force-push (`git tag -f v1 && git push -f origin v1`). Note
this is the same mutable-tag mechanism that action pinning defends against — the
difference is that this repository is ours, so the threat model is our own
mistakes rather than a third party's compromise. Third-party actions inside
these workflows stay pinned to a 40-char SHA.

## Coverage policy

- **Now:** each repo's floor = its current measured coverage (no-regression).
- **Target:** 60% lines/functions/branches, documented as the goal.
- **Mechanism:** thresholds live in the repo's test config (e.g. `vite.config.ts`
  `test.coverage.thresholds`). CI runs `test:coverage` and fails if it drops.
- Raise the floor in the same PR that adds the tests. The gate advances with the
  project.

## Security baseline (DevSecOps)

- **Gitleaks** — secret scanning across history (`fetch-depth: 0`).
- **Semgrep** — SAST with community rulesets; no paid account required.
- **Dependabot** — grouped weekly updates, Conventional Commit prefixes,
  `America/Bogota` timezone. Separate ecosystems for `npm` and `github-actions`.
- **CodeQL** — intentionally omitted: free only on public repos; private repos
  would need GitHub Advanced Security (paid). Semgrep covers SAST meanwhile.
- **Action pinning** — third-party actions pinned to a 40-char commit SHA with a
  `# vX.Y.Z` comment (supply-chain defense). Dependabot bumps the SHA.

## Branch protection (required to make the gate real)

A blocking gate only blocks if `main` is protected. Each repo must enable, in
**Settings → Branches → Branch protection rules** for `main`:

- Require a pull request before merging.
- Require status checks to pass: the quality-gate jobs.
- Require branches to be up to date before merging.
- (Recommended) Require conversation resolution.

Without this, checks run but red never blocks merge.

## Future: front/back split

When repos specialize:

- **Frontend repos** keep the current gate (lint, types, vitest, build, e2e,
  Netlify preview).
- **Backend repos** swap build/e2e for their equivalents (e.g. container build,
  integration tests, DB migrations check) via the same reusable workflow's
  inputs. The security and PR-metadata stages stay identical.

The reusable workflow is designed so this is a change of inputs, not a rewrite.
