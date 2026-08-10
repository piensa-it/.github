# Piensa IT

Software company based in Medellín, Colombia — building SaaS platforms,
AI-powered products, and custom enterprise software.

## Development Framework

This organization follows a shared DevSecOps framework. All conventions live in
[`docs/CONVENTIONS.md`](./docs/CONVENTIONS.md).

- **Branching:** trunk-based, short-lived branches from `main`.
- **Issue Types:** Feature / Bug / Task (native GitHub types).
- **Commits & PRs:** [Conventional Commits](https://www.conventionalcommits.org/).
- **Board flow:** Backlog → Ready → In progress → In review → Done.
- **Automation:** branch + draft PR created automatically; code generation is
  triggered manually with `/claude` on an issue.

See the docs folder for the full framework.
