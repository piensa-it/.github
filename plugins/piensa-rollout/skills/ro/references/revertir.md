# Revertir un despliegue

Primero se detiene el daño, después se arregla. Revertir no borra historia.

## Frontend en Netlify: restaurar el despliegue anterior (segundos, 0 minutos de Actions)

```bash
# Los últimos despliegues publicados del sitio
curl -s -H "Authorization: Bearer $NETLIFY_AUTH_TOKEN" \
  "https://api.netlify.com/api/v1/sites/$NETLIFY_SITE_ID/deploys?per_page=5" \
  | jq -r '.[] | "\(.id) \(.state) \(.created_at) \(.title)"'

# Publicar de nuevo uno anterior
curl -s -X POST -H "Authorization: Bearer $NETLIFY_AUTH_TOKEN" \
  "https://api.netlify.com/api/v1/sites/$NETLIFY_SITE_ID/deploys/<deploy_id>/restore"
```

También desde el panel de Netlify: Deploys → el anterior → «Publish deploy». Pide al dueño el token si no
está en el entorno; no lo escribas en archivos ni en el chat.

## Código: revert en git

`git revert <commit>` con `[skip ci]` si el frontend ya se restauró en Netlify; sin la marca (y con
constancia válida) si hay que volver a publicar. Nunca `push --force`.

## Base de datos

Las migraciones no se revierten solas. Si el release aplicó una, la reversión es una migración nueva
escrita a propósito y revisada por una persona. Si el frontend restaurado depende de columnas que ya no
existen, restaurar no basta: dilo antes de hacerlo.

## Edge Functions (Supabase)

Se vuelven a desplegar desde el commit anterior: `git checkout <commit_bueno> -- supabase/functions` en una
rama temporal y `supabase functions deploy <nombre>`.
