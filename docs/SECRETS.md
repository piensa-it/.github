# Piensa IT — Standard Secret Names

The framework is **stack-agnostic**. Secrets in GitHub use generic, neutral
names that say *what the value is*, never *which tool consumes it*. Each repo's
wrapper maps these to whatever the current bundler/backend needs (Vite today,
Next tomorrow), so a stack change is a one-line edit in the wrapper — never a
framework change.

## Standard secrets

| Standard name         | Contains                                   | Scope        |
| --------------------- | ------------------------------------------ | ------------ |
| `PACKAGES_TOKEN`      | GitHub Packages read token (@piensa-it)    | per-repo     |
| `BACKEND_URL`         | Backend/API base URL (public)              | per-repo     |
| `BACKEND_PUBLIC_KEY`  | Backend publishable/anon key (public)      | per-repo     |
| `ORG_AUTOMATION_TOKEN`| Automation PAT for workflows               | all repos    |

Only public/publishable values belong in build-time frontend vars. Never place
server secrets (service_role keys, private API keys) in `BACKEND_*` — those are
not exposed to the browser and must not be baked into a frontend build.

## How mapping works (in each repo's wrapper)

The wrapper reads the standard secret and passes it to the reusable, which
exports it under the name the build expects. Example for a Vite repo today:

```yaml
# in the repo's quality-gate.yml
e2e:
  uses: piensa-it/.github/.github/workflows/reusable-e2e.yml@main
  with:
    build_env_map: |
      VITE_SUPABASE_URL=BACKEND_URL
      VITE_SUPABASE_PUBLISHABLE_KEY=BACKEND_PUBLIC_KEY
  secrets:
    PACKAGES_TOKEN: ${{ secrets.PACKAGES_TOKEN }}
    BACKEND_URL: ${{ secrets.BACKEND_URL }}
    BACKEND_PUBLIC_KEY: ${{ secrets.BACKEND_PUBLIC_KEY }}
```

If the repo migrates to Next.js, only the left-hand names change:

```yaml
    build_env_map: |
      NEXT_PUBLIC_SUPABASE_URL=BACKEND_URL
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=BACKEND_PUBLIC_KEY
```

The secrets themselves (`BACKEND_URL`, `BACKEND_PUBLIC_KEY`) never change.

## Migration note

Repos created before this convention may have stack-specific secret names
(e.g. `VITE_SUPABASE_URL`, `NPM_TOKEN`). Rename them to the standard names in
**Settings → Secrets and variables → Actions**. Values stay the same; only the
key name changes.
