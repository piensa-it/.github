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
4. **Fail on config gracefully.** When a check can't run due to missing secrets
   (not code), it skips with a notice instead of a false red.

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
| E2E (optional)  | Playwright                            | Blocking *if configured*, else skips |
| Deploy preview  | Netlify (optional)                    | Non-blocking, informational    |

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
