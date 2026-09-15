# Piensa IT — Development Conventions

This document defines the shared conventions across all Piensa IT repositories.
It is the single source of truth for how work flows from an idea in the backlog
to merged code.

## 1. Branching strategy — Trunk-based

All repositories follow **trunk-based development**:

- `main` is the single long-lived branch and is always deployable.
- All work happens on **short-lived branches** created from `main`.
- Branches are merged back into `main` via Pull Request and deleted after merge.
- Avoid long-running branches. If a branch lives more than a few days, split the work.

## 2. Issue Types

We use GitHub's **native Issue Types** for coarse classification on the board:

| Issue Type | Meaning                                   |
| ---------- | ----------------------------------------- |
| `Feature`  | New functionality or capability           |
| `Bug`      | An unexpected problem or incorrect behavior |
| `Task`     | Everything else: refactor, deps, config, docs, maintenance |

The fine-grained classification lives in the **commit messages and PR titles**
(see Conventional Commits below), decided by whoever implements the work based on
what actually changed.

## 3. Branch naming

Branches are generated automatically from the issue, using the pattern:

```
<prefix>/<project>-<issue_number>-<slugified-title>
```

| Issue Type | Branch prefix |
| ---------- | ------------- |
| `Feature`  | `feature/`    |
| `Bug`      | `fix/`        |
| `Task`     | `chore/`      |

**Example:** a `Feature` issue titled "Categorización de gastos" (#21) in `app-misfin`
produces:

```
feature/misfin-21-categorizacion-de-gastos
```

## 4. Commit convention — Conventional Commits

All commits follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<optional scope>): <description>
```

Allowed types (fine-grained vocabulary):

| Type       | Use for                                            |
| ---------- | -------------------------------------------------- |
| `feat`     | A new feature                                      |
| `fix`      | A bug fix                                           |
| `docs`     | Documentation only changes                         |
| `style`    | Formatting, missing semicolons, etc. (no logic)    |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf`     | A performance improvement                          |
| `test`     | Adding or correcting tests                         |
| `build`    | Build system or external dependencies              |
| `ci`       | CI configuration and scripts                       |
| `chore`    | Other changes that don't modify src or test files  |
| `revert`   | Reverts a previous commit                          |

**Examples:**

```
feat(expenses): add category assignment to transactions
fix(auth): prevent token refresh loop on 401
chore(deps): bump next from 14.1 to 14.2
```

Breaking changes are flagged with `!` after the type/scope and a `BREAKING CHANGE:`
footer:

```
feat(api)!: change response shape of /transactions

BREAKING CHANGE: `amount` is now returned in cents instead of units.
```

## 5. Pull Request convention

- PR **title** follows Conventional Commits (same as commit).
- PR is opened as a **draft** by automation and only marked *ready for review*
  when checks pass and the implementation is complete.
- Every PR **must reference its issue** with a closing keyword in the body:
  `Closes #<issue_number>`.
- PRs require passing checks (lint, tests, build) before they can be merged.
- The author (you) is always the final human validator before merge.

## 6. Board status flow

Every issue lives on its project board and moves through these states:

```
Backlog → Ready → In progress → In review → Done
```

| Status        | Meaning                                                        |
| ------------- | ------------------------------------------------------------- |
| `Backlog`     | Captured but not refined. No automation.                      |
| `Ready`       | Refined, has a clear spec, ready to be picked up.             |
| `In progress` | Being actively worked on. Automation creates branch + draft PR. |
| `In review`   | Implementation done, PR ready, checks green, awaiting review. |
| `Done`        | Merged and closed.                                            |

## 7. Spec-driven work

Before an issue moves to `Ready`, it should contain a **spec** using the
issue template (see `.github/ISSUE_TEMPLATE`). A good spec is what allows a human
or an agent to implement the work without further clarification.

A spec contains:

- **Context** — why this work exists.
- **Acceptance criteria** — a checklist of what "done" means.
- **Technical notes** — constraints, affected areas, relevant files.
- **Out of scope** — what this issue explicitly does NOT cover.

## 8. Security baseline (DevSecOps)

- Secrets never live in code. They live in GitHub Actions Secrets (org or repo).
- Dependency and secret scanning run on every PR.
- No workflow runs untrusted code from forks with access to secrets.
- The principle of least privilege applies to every token and workflow permission.

## 9. Public web

Every product with a public website (landing, pricing, public docs) presents
itself the same way and is readable without JavaScript.

- **Product signature.** The product name leads, followed by the Piensa IT
  isotype at signature size and «by Piensa IT» in small monospaced caps. Also in
  the footer credit and in `<title>` / `og:title` («<Page> · <Product> by Piensa
  IT»). No «Beta» pill in its place. Each product keeps its own colors, fonts and
  tone.
- **SEO per page.** Each public route has its own `<title>`, meta description,
  canonical and Open Graph tags, plus `sitemap.xml` and `robots.txt`.
- **HTML that arrives built.** Crawlers other than Google, AI bots and the link
  previews of WhatsApp, LinkedIn and Slack do not run JavaScript. Static sites
  already comply; a React SPA must **prerender** its public routes. Routes that
  are rendered in the browser on purpose (API docs, the logged-in app) are
  declared as such and keep their tags.
- **Enforced in CI.** `reusable-public-web.yml` blocks the PR when a public page
  ships an empty root, a missing or duplicated title, or missing tags, and checks
  the production domain again after deploy (see
  [`QUALITY_GATE.md`](./QUALITY_GATE.md#public-web--reusable-public-webyml)).
- **How to build it.** The Claude Code plugin `piensa-web` (skill
  `landing-piensa`) in this repository carries the visual recipe, the signature,
  the prerendering files proven in production (app-deliver) and the checklist:
  `claude plugin marketplace add piensa-it/.github && claude plugin install piensa-web@piensa-it`.
- **Stack.** Do not change stack for SEO. Prerender the existing SPA; consider
  Astro only when there is a content strategy (blog, guides) or the landings are
  being unified, and then in the same repository as the code it shares.
