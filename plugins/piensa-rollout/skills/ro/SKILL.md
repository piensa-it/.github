---
name: ro
description: Rollout (despliegue a producción) de cualquier repositorio de Piensa IT con la práctica común de la organización. Corre la suite completa en Docker una sola vez por release, firma la constancia, publica con un push que gasta ≤ 3 minutos de GitHub Actions, vigila el run, comprueba producción y deja cómo revertir. Úsala siempre que el usuario diga «despliega», «desplegar», «publica», «sube a producción», «haz el release», «rollout», «/ro», o pregunte si ya se puede desplegar, en cualquier repo de Piensa IT (CoreLink, Deliver, MiDivisa, AdapterDian, Lynx, docsgen…), aunque no nombre la skill. No la uses para commits de trabajo diario (esos van con [skip ci] y no despliegan).
---

# Rollout de Piensa IT

Un despliegue es **deliberado**: el trabajo diario se commitea con `[skip ci]` y se acumula; se publica
cuando el dueño lo pide, en un solo release. Esta skill es ese release, igual en todos los repos.

Dos restricciones de fondo, y el porqué de casi todo lo demás:

- **Minutos de Actions**: la cuota gratuita son 2.000 min/mes para toda la organización. Presupuesto por
  despliegue: **≤ 3 minutos facturados**. Los e2e no corren en Actions: se corren en local y el pipeline
  confía en una constancia firmada.
- **El Mac de desarrollo se recalienta** (Air sin ventilador). La suite completa corre **una vez por
  release**, nunca por commit, y sin nada pesado en paralelo.

## 0. Configuración del repo

Lee `.piensa/rollout.json` en la raíz. Si no existe, lee `references/configuracion.md`, propón el archivo
con lo que encuentres en el repo (workflow de despliegue, scripts de pruebas, URL de producción) y
confírmalo con el dueño antes de seguir: un rollout con datos adivinados es peor que no hacerlo.

## 1. Preparación (sin tocar nada)

1. Rama de despliegue (normalmente `main`), actualizada con el remoto (`git fetch`).
2. **Árbol limpio**. Si hay cambios sin commitear, pregunta: ¿entran en el release o se quedan fuera? Nunca
   `git add -A` a ciegas: puede haber un agente trabajando en el mismo árbol.
3. Qué sale: `git log --oneline origin/<rama>..HEAD`. Agrupa por HU (`#NN` en los mensajes).
4. **Migraciones**: si la config declara `migraciones`, comprueba que no quede ninguna en la carpeta de
   migraciones activas sin aplicar (su script de comprobación, o pregunta). Una migración sin aplicar tumba el
   despliegue en el pipeline; las que esperan revisión van en la carpeta de pendientes.
5. **Avisos manuales** que el release necesite (URLs de redirección, secretos nuevos, cabeceras): búscalos
   en los mensajes de commit («ANTES DE DESPLEGAR») y pregúntalos. No se despliega hasta que el dueño
   confirme.

Muestra un resumen corto (commits por HU, avisos) antes del paso 2.

## 2. Constancia de pruebas (la única carga pesada)

Si la config trae `constancia`:

1. Coteja primero: si la constancia ya es válida para este árbol, **no vuelvas a correr la suite**.
2. Si no lo es, corre `constancia.firmar` (p. ej. `npm run pruebas`) en segundo plano, redirigiendo a un
   archivo de log. Mientras corre, **no toques el árbol** ni lances nada pesado: cambiar un archivo que
   entra en el hash invalida la firma y obliga a repetir 10 minutos de calor.
3. Al terminar, lee el resumen del log (pruebas pasadas, fallidas, inestables) y **coteja por la palabra**,
   no por el código de salida:
   ```bash
   RESULTADO=$(<constancia.cotejar> 2>&1 | tail -1); echo "$RESULTADO"
   ```
   Solo `valida` permite seguir. Nunca encadenes `cotejar | tail && git push`: el código de salida de una
   tubería es el del último comando, y así ya se empujó una constancia inválida que costó 18 minutos de
   Actions.
4. Pruebas **inestables** (fallan y pasan al reintento): si tocan lo que cambió en este release, repítelas
   aisladas (`--repeat-each=3 --workers=1`) antes de dar la corrida por buena. Si no, anótalas en el informe.
5. **Fallos reales**: no despliegues. Informa qué falló y con qué error; el arreglo es trabajo aparte.

Si el repo no tiene constancia, las pruebas corren en Actions: avisa al dueño del coste estimado y pide
confirmación (y sugiere adoptar la constancia; ver `references/configuracion.md`).

## 3. Publicar

1. `git add` **solo** del archivo de constancia (y nada más que no esté ya commiteado).
2. Commit de release **sin** `[skip ci]`, con el formato de la config (por defecto
   `chore(release): <resumen por HU>`), cuerpo con lo que sale y el resultado de la suite, y la línea de
   coautoría que pida el entorno. Si la constancia ya estaba commiteada y válida, un
   `git commit --allow-empty` sirve.
3. `git push`. No uses `--force` nunca.

## 4. Vigilar el run

1. Localiza el run del push (`gh run list --workflow <workflow> --limit 1`).
2. Espera sin sondear a lo loco: una comprobación cada ~30 s con un límite (el presupuesto más holgura).
3. Si un trabajo falla, lee su log (`gh run view <id> --log-failed`), explica la causa y **no** relances en
   bucle: un reintento solo para fallos de red conocidos (`gh run rerun <id> --failed`).
4. Mide los minutos facturados: GitHub redondea **hacia arriba por trabajo**.
   ```bash
   gh api repos/<org>/<repo>/actions/runs/<id>/jobs --jq '.jobs[] | select(.conclusion!="skipped") |
     "\(.name) \(((.completed_at|fromdateiso8601)-(.started_at|fromdateiso8601)))s"'
   ```
   Si pasa de `presupuesto_minutos`, dilo en el informe con el trabajo culpable.

## 5. Comprobar producción

Para cada ruta de `produccion.comprobar`: `curl` con código 200 y, si la config lo pide, cabeceras
(`produccion.cabeceras`) y texto esperado. Si hay versión publicada (p. ej. `version.json`), confirma que es
el commit del release. No digas «desplegado» sin esta comprobación.

## 6. Informe

Corto, en este orden:

- **Qué salió**: commits agrupados por HU.
- **Pruebas**: resumen de la suite local (pasadas / inestables) y si se reutilizó una constancia.
- **Actions**: duración por trabajo y minutos facturados frente al presupuesto.
- **Producción**: rutas comprobadas.
- **Pendiente manual**: lo que el dueño tenga que probar con identidad o datos reales.
- **Cómo revertir** (ver `references/revertir.md`), con el id del despliegue anterior si lo tienes.

Después, comenta en cada HU que salió el commit con el que salió.

## Trampas conocidas

- `| tail` o `| grep` detrás de un comando esconde su código de salida.
- `cotejar` puede imprimir `invalida` y salir con código 0: se lee la palabra.
- Playwright vacía su carpeta de salida (`test-results/`) al arrancar: nada que deba sobrevivir a la suite
  puede escribirse ahí antes.
- Tocar `scripts/`, `src/`, `supabase/`, `public/` o la configuración después de firmar invalida la
  constancia. `docs/` y `.github/` no.
- Commitear archivos nuevos no cambia el hash, pero los que se borran del índice a medias sí pueden hacerlo:
  mira `git status` antes de cotejar.
- Los fallos de red al desplegar Edge Functions son intermitentes: un `rerun --failed`, no más.
