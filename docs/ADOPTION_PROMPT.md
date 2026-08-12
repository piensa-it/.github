# Prompt de adopción — línea base de despliegues (frontend)

Prompt reutilizable para pedirle a un agente que adopte la línea base de
despliegues de Piensa IT en un proyecto **frontend** (Vite + React que compila a
un `dist` publicable). Está redactado con los aprendizajes de las primeras
adopciones. Cópialo tal cual; los detalles específicos de la plataforma de
hosting viven en los `docs/` del estándar, no aquí, para que un cambio de nube
sea una edición de la doc y no de este prompt.

---

Vamos a adoptar la línea base de despliegues de Piensa IT en este proyecto frontend (Vite + React que compila a un `dist`).

**CONTEXTO**
La línea base vive en `piensa-it/.github` (vincula esa carpeta). Léela antes de tocar nada: `docs/DEPLOY.md` (modelo, rollback, guía de adopción), `docs/SECRETS.md` (nombres estándar de secrets y dónde se ponen), `docs/QUALITY_GATE.md` (política del gate). El punto de partida son las plantillas del propio repo estándar: `templates/quality-gate.yml` y `templates/deploy.yml`. NO escribas los wrappers desde cero. Los reusables se consumen por etiqueta `@v1`, nunca `@main`.

**EL MODELO**
GitHub Actions construye; la plataforma de hosting solo publica el `dist` ya compilado y no compila nada. Así el commit que pasa el gate es exactamente el que se publica, con el mismo Node y el mismo lockfile. Los detalles de qué plataforma y cómo se le entrega el `dist` están en `docs/DEPLOY.md` — sigue eso, no asumas una nube concreta.

**ORDEN OBLIGATORIO (el estándar lo exige; no batchees los pasos)**
Primero el quality gate, luego el deploy. Si el repo ya tiene un gate propio anterior (p. ej. un `ci.yml` con un `quality-gate.mjs` u otro script casero), esta línea base lo reemplaza: hay que borrarlo en el mismo cambio, o correrán dos gates en paralelo.

**PRERREQUISITOS QUE DEJAN EL GATE ROJO — resuélvelos, no los des por resueltos**
1. `typecheck` bloquea SIN toggle. Corre `npm run typecheck` y **arregla todos los errores de tipos en el origen** (sin casts que oculten el problema) antes de seguir, o el gate queda rojo para siempre. Esto es verificable en tu entorno.
2. `test:coverage` bloquea. Si falta el tooling (el provider de cobertura, el script `test:coverage`, los `thresholds` en la config de tests), agrégalo. El **piso de cobertura no lo puedes medir** si el `node_modules` no corre en tu entorno: déjalo en un placeholder con comentario y fecha, y que el dueño corra `npm run test:coverage` en su máquina y fije la cifra medida. Un piso honesto aunque sea 0.5% es mejor que ninguno: impide que borren el único test que haya.
3. `lint` SÍ tiene toggle. Si hay errores de lint preexistentes, pon `lint_blocking: false` con **el número medido y la fecha** al lado — sin cifra se vuelve permanente porque nadie sabe si mejoró.

**TRAMPAS CONOCIDAS, cada una pagada con un fallo real**
1. `node_version` del deploy DEBE ser idéntico al del quality-gate. No falla solo: simplemente el commit que se prueba deja de ser el que se publica. Cópialo entre ambos, no lo recuerdes de memoria.
2. NO fijes la versión del CLI de publicación salvo que sepas exactamente lo que haces: el default del reusable ya está emparejado con el `node_version` por defecto. Un CLI viejo sobre un Node nuevo revienta al publicar, después de un build correcto.
3. NUNCA `secrets: inherit` — Semgrep lo bloquea por mínimo privilegio y tiene razón. Pasa la lista explícita. Si un secret parece necesitar un nombre que no está en `docs/SECRETS.md`, casi siempre el problema es que el nombre menciona la herramienta (`STRIPE_`, `SENTRY_`) en vez de decir qué es el valor; renómbralo a algo neutral.
4. `install_command` es del proyecto, no se copia de otro: usa `npm ci` a secas salvo que ESTE repo tenga conflictos de peer deps que exijan un flag. Debe coincidir en el gate y en el deploy.
5. Antes de llenar `build_env_map` / `required_build_vars` / `bundle_assert_vars`, verifica qué variables consume el build (Vite: `grep -r "import.meta.env" src`). Si el proyecto no usa ninguna variable de entorno en el build, los tres van **vacíos a propósito** — déjalo dicho en un comentario para que se lea como decisión, no como olvido. `required_build_vars` = solo las que impiden ARRANCAR la app (no "las importantes"). `bundle_assert_vars` = solo valores públicos que deben aparecer en el compilado; nunca un valor privado.
6. El hosting de una SPA debe devolver **404 real para un asset hasheado que ya no exista**, no el `index.html` con 200 — si cae al catch-all, el navegador intenta ejecutar HTML como JS y trona. Asegura la regla correspondiente según el mecanismo de la plataforma (archivo de redirects, reglas de rewrite, etc.), puesta ANTES del catch-all de la SPA. Y borra cualquier config de build del lado del hosting que ya no aplique, porque ahora compila Actions.
7. `npm audit` no está cableado en los reusables ni en las plantillas: no inventes un job de audit, sigue la plantilla.

**SECRETS Y ACCIONES SOLO DEL DUEÑO (dilas, no las intentes)**
- Configura los secrets que liste `docs/SECRETS.md` en Settings → Actions, respetando su scope (org vs. repo — el identificador del sitio SIEMPRE es per-repo). Si el repo depende de paquetes privados `@piensa-it/*`, el token de packages va también en el store de **Dependabot**, o sus PRs fallan en `npm ci`.
- Desvincula el build automático del lado del hosting, para que no compile en paralelo con Actions (dos sistemas publicando el mismo sitio es una carrera silenciosa).
- Activa branch protection en `main` exigiendo los checks del gate, o el rojo no bloquea nada.
- Paso final: haz un deploy a propósito y **abre el sitio**. Un pipeline verde no prueba que la página carga — es justo el fallo que esta línea base existe para evitar.
- `environment_url` = el dominio real de producción.

**LÍMITES DEL ENTORNO**
- `rm` puede estar bloqueado en tu entorno. Si hay que borrar algo (el `ci.yml` viejo, el script del gate casero, la carpeta de baseline), dímelo para hacerlo yo.
- Los archivos bajo `.github/workflows/` quizá no se puedan escribir por el canal normal de archivos: hazlo por shell.
- Si el `node_modules` tiene binarios de otra plataforma (p. ej. macOS), `npm run build` y los tests NO corren en tu entorno; `typecheck` y `lint` sí, y son concluyentes para tipos e imports. Di explícitamente qué pudiste verificar y qué no.

**CÓMO QUIERO TRABAJAR**
Verifica en vez de suponer; si algo no lo puedes probar, dilo en vez de darlo por bueno. Los mensajes de commit los escribes en un archivo dentro de `.git/` y yo hago `git commit -F`: zsh rompe con el `!` de Conventional Commits. Al darme comandos, NO metas comentarios `#` en la misma línea — zsh interactivo los toma como argumentos y rompe cosas como `git rm archivo # nota`. Si un commit se queja de `HEAD.lock` o `index.lock`, es un lock stale del entorno; se borra con `rm -f .git/*.lock` y se reintenta.
