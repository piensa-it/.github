# Piensa IT — Standard Secret Names

The framework is **stack-agnostic**. Secrets in GitHub use generic, neutral
names that say *what the value is*, never *which tool consumes it*. Each repo's
wrapper maps these to whatever the current bundler/backend needs (Vite today,
Next tomorrow), so a stack change is a one-line edit in the wrapper — never a
framework change.

## Standard secrets

| Standard name         | Contains                                   | Scope        |
| --------------------- | ------------------------------------------ | ------------ |
| `PACKAGES_TOKEN`      | GitHub Packages read token (@piensa-it)    | **org**      |
| `NETLIFY_AUTH_TOKEN`  | Netlify personal access token              | **org**      |
| `ORG_AUTOMATION_TOKEN`| Automation PAT for workflows               | **org**      |
| `NETLIFY_SITE_ID`     | Netlify site UUID                          | per-repo     |
| `BACKEND_URL`         | Backend/API base URL (public)              | per-repo     |
| `BACKEND_PUBLIC_KEY`  | Backend publishable/anon key (public)      | per-repo     |
| `PAYMENTS_PUBLIC_KEY` | Payment processor publishable key (public) | per-repo     |
| `ERROR_TRACKING_DSN`  | Error tracker ingest DSN (public)          | per-repo     |
| `DATABASE_INGEST_URL` | Connection string of a least-privilege DB role that writes the app's own schema (**server-only**) | per-repo |
| `SOURCE_CONTROL_WEBHOOK_SECRET` | HMAC secret that signs source-control webhooks (**server-only**) | per-repo |
| `SOURCE_CONTROL_TOKEN` | Read-only source-control API token for server-side sync jobs (**server-only**) | per-repo |
| `SOURCE_CONTROL_WRITE_TOKEN` | Source-control API token that may **create** issues, for a product that files them on a person's behalf (**server-only**) | per-repo |

The four **server-only** names must never appear on the right-hand side of a
`build_env_map` for a frontend build. They are read at runtime by server code
(functions, scheduled jobs) and set in the hosting provider's runtime
environment, or passed to a job that runs server-side. `bundle_assert_vars`
must never list them.

### Which scope, and why

A secret belongs at **org** level when its value is the same everywhere. Kept
per-repo, one rotation becomes N settings pages, and the repo that gets missed
fails weeks later with an expired token — a failure whose cause is a change
nobody remembers making.

A secret belongs **per-repo** when its value identifies that repo. `NETLIFY_SITE_ID`
is the clearest case: promoting it to org level would point every project at one
site, and the first deploy to notice would be the one that overwrote another
product's production. The blast radius of getting it wrong is what decides.

Only public/publishable values belong in build-time frontend vars. Never place
server secrets (service_role keys, private API keys) in `BACKEND_*` — those are
not exposed to the browser and must not be baked into a frontend build.

### Read and write are two secrets, never one

`SOURCE_CONTROL_TOKEN` and `SOURCE_CONTROL_WRITE_TOKEN` name the same API and
must hold different credentials, because what they touch is not the same thing.

A sync job reads **every issue of every project** — that breadth is what makes
it useful and what makes write access on it unacceptable: a bug in a nightly
loop would have the reach to rewrite a whole backlog. A product that files an
issue on someone's behalf touches **one issue, the one it just created**, and
needs write to do it.

Merging them gives the nightly job the narrow credential's power over
everything the broad one can see. Keeping them apart costs one extra token and
removes that combination entirely.

The write token stays as narrow as the feature allows: create issues, nothing
else. A product that creates them should not also edit, close or comment on
them — that is someone else's work happening somewhere the repository is
actually checked out.

## How mapping works (in each repo's wrapper)

The wrapper reads the standard secret and passes it to the reusable, which
exports it under the name the build expects. Example for a Vite repo today:

```yaml
# in the repo's quality-gate.yml
e2e:
  uses: piensa-it/.github/.github/workflows/reusable-e2e.yml@v1
  with:
    build_env_map: |
      VITE_SUPABASE_URL=BACKEND_URL
      VITE_SUPABASE_PUBLISHABLE_KEY=BACKEND_PUBLIC_KEY
  secrets:
    PACKAGES_TOKEN: ${{ secrets.PACKAGES_TOKEN }}
    BACKEND_URL: ${{ secrets.BACKEND_URL }}
    BACKEND_PUBLIC_KEY: ${{ secrets.BACKEND_PUBLIC_KEY }}
```

### Always an explicit list. Never `secrets: inherit`

The reusable workflows resolve the map's right-hand side out of
`toJSON(secrets)`, because the name is a string chosen by the caller and cannot
be resolved as a `secrets.X` expression. That works identically whether secrets
arrive explicitly or by inheritance — so use the explicit list, always:

```yaml
  secrets:
    BACKEND_URL: ${{ secrets.BACKEND_URL }}
```

`secrets: inherit` hands the called workflow **every secret in the repository**,
not the ones it uses. Semgrep blocks it
(`yaml.github-actions.security.github-actions-secrets-inherit`) and the rule is
right: it is a blanket grant standing in for five named ones.

This is written down because the mistake was made here, on 2026-08-12, in
`app-misfin`'s deploy wrapper, with a reason that sounded good: an explicit list
would force a PR against this repository for every new project variable.

**That reasoning conflates the two sides of `build_env_map`, and the distinction
is worth keeping.** The LEFT side (`VITE_*`, `NEXT_PUBLIC_*`) is what varies by
stack, and it stays free-form in each wrapper — nothing here constrains it. The
RIGHT side is meant to be a short, stable vocabulary of tool-neutral names.

So when a project seems to need a name that is not in the table above, the
question is not "how do I widen the grant" but **"is this name tool-neutral?"**
`STRIPE_PUBLIC_KEY` and `SENTRY_DSN` were not — they name the vendor, which this
document has always forbidden. Renamed to `PAYMENTS_PUBLIC_KEY` and
`ERROR_TRACKING_DSN`, they are reusable by any project, and swapping processor
or tracker becomes one line on the left-hand side of one map.

Adding a genuinely new standard name to this table is a small PR against this
repository, and that friction is doing useful work: it is what keeps the
vocabulary short enough to stay a standard.

## Name the credential after the secret it fills

The names in the table say what a value *is*, never which tool consumes it.
That is the right trade for code, and it has a cost the day you rotate:
`SOURCE_CONTROL_TOKEN` does not exist anywhere in GitHub's own token list. What
exists there is a label somebody typed, and matching one to the other becomes a
thing you have to remember.

So carry the standard name into the label, at the place the credential is
created:

```
atalaya · SOURCE_CONTROL_TOKEN
atalaya · SOURCE_CONTROL_WRITE_TOKEN
misfin · SOURCE_CONTROL_TOKEN
```

Product first, because one account holds credentials for all of them; standard
name second, because that is the string you will be searching for. Rotating
then starts with a search that succeeds in both places, instead of a guess.

This applies wherever the value is born and carries a free-form label —
fine-grained tokens, Netlify personal access tokens, database roles. A label is
not a secret and is not validated by anything, so renaming one costs nothing
and breaks nothing.

Two things that are easy to get wrong when you do rotate a fine-grained token:

- **Editing its permissions does not change its value.** Only *Regenerate
  token* does, and the new value is shown once.
- **Projects live on the organization, not the repository.** A token given
  `Issues: read` but not the organization's `Projects: read` will read issues
  perfectly and return empty boards — which looks like missing data, not like a
  permission problem, and is usually noticed much later.

## Every secret has to be set in more than one place

Forgetting the second and third is the normal outcome, so they are listed here:

| Where | Used by |
| ----- | ------- |
| Settings → Secrets and variables → **Actions** | `quality-gate`, `deploy` |
| Settings → Secrets and variables → **Dependabot** | Dependabot's PRs run against a **separate** secret store and cannot see the Actions one. Without `PACKAGES_TOKEN` here, every dependency PR fails on `npm ci` |
| A developer's `~/.npmrc` | `npm ci` on each person's machine |

## Migration note

Repos created before this convention may have stack-specific secret names
(e.g. `VITE_SUPABASE_URL`, `NPM_TOKEN`). Rename them to the standard names in
**Settings → Secrets and variables → Actions**. Values stay the same; only the
key name changes.

Renaming a secret does not fail loudly by itself — the old name simply resolves
empty. That is precisely how `app-misfin` ended up with an e2e job passing in
six seconds (see `QUALITY_GATE.md`, principle 4). After any rename, check the
next run's log for the `Mapped X <- Y` lines: one per mapped variable, or the
build is not getting what you think it is.

## Promoting a secret from repo to org

Order matters — done backwards it leaves a window where `main` cannot deploy:

1. Create the secret at **org** level first (Organization → Settings → Secrets
   and variables → Actions), scoped to the repositories that need it.
2. **Leave the repo-level secret in place.** A repo-level secret of the same
   name overrides the org one, so nothing changes yet and nothing can break.
3. Re-run the workflow. It is still using the repo-level value, which proves
   only that the pipeline is green — not that the org secret is correct.
4. Delete the repo-level secret. The org value now takes effect.
5. Re-run again. **This** is the run that verifies the org secret. If it fails,
   the fix is one paste at org level, not a rollback.

Never delete before creating. The reverse order leaves `main` undeployable
between the two steps, and the failure looks like a code problem.
