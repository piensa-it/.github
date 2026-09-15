# .github

Central configuration and workflows for the **Piensa IT** organization.

This repository holds:

- **`profile/README.md`** — the org's public profile page.
- **`docs/`** — the development framework and conventions.
- **`.github/workflows/`** — reusable CI/CD and automation workflows.
- **`.github/ISSUE_TEMPLATE/`** — shared issue templates (specs).
- **`.github/pull_request_template.md`** — shared PR template.
- **`.claude-plugin/` + `plugins/`** — marketplace de plugins de Claude Code de Piensa IT.

## Plugins de Claude Code

Este repositorio es el marketplace `piensa-it`. Instalación (una vez por máquina):

```sh
claude plugin marketplace add piensa-it/.github
claude plugin install piensa-web@piensa-it
```

| Plugin | Qué trae |
|---|---|
| `piensa-web` | Skill `landing-piensa` (en CI la acompaña `reusable-public-web.yml`): web pública de los productos (firma «by Piensa IT», receta visual, SEO por página, prerenderizado de SPAs React). Se activa sola al trabajar una landing, precios, SEO o vistas previas de enlaces. |

Para actualizar: `claude plugin marketplace update piensa-it` y reiniciar la sesión.

Start here: [`docs/CONVENTIONS.md`](./docs/CONVENTIONS.md).
