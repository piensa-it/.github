# `.piensa/rollout.json`

Lo único que cambia entre repos. La skill no adivina: si falta un dato, lo pregunta.

```json
{
  "rama": "main",
  "workflow": "deploy.yml",
  "presupuesto_minutos": 3,
  "commit_release": "chore(release): {resumen}",
  "constancia": {
    "firmar": "npm run pruebas",
    "cotejar": "node scripts/evidencia-e2e.mjs cotejar",
    "archivo": ".e2e-evidencia.json"
  },
  "migraciones": {
    "activas": "supabase/migrations",
    "pendientes": "supabase/migrations-pendientes",
    "comprobar": "./scripts/check-migrations-applied.sh"
  },
  "produccion": {
    "url": "https://corelink.piensait.com",
    "comprobar": ["/", "/login"],
    "cabeceras": { "X-Frame-Options": "DENY" }
  },
  "netlify": { "site_id_secret": "NETLIFY_SITE_ID" }
}
```

| Campo | Obligatorio | Para qué |
|---|---|---|
| `rama` | sí | Rama que despliega al empujar. |
| `workflow` | sí | Archivo del workflow de despliegue, para vigilar el run. |
| `presupuesto_minutos` | no (3) | Minutos facturados máximos; si se pasa, se informa. |
| `commit_release` | no | Formato del asunto del commit de release. |
| `constancia` | no | Sin ella, los e2e corren en Actions y hay que avisar del coste. |
| `migraciones` | no | Repos con base de datos propia: carpetas y script de comprobación. |
| `produccion.url` / `comprobar` | sí | Qué se comprueba después de publicar. |
| `produccion.cabeceras` | no | Cabeceras que deben servirse (seguridad, caché). |
| `netlify` | no | Para revertir restaurando el despliegue anterior. |

## Adoptar la constancia en un repo que no la tiene

El diseño de referencia está en `app-corelink`:

- `scripts/pruebas-docker.mjs`: levanta la imagen oficial de Playwright (misma versión que el proyecto y
  el mismo Node que el CI), corre dentro `scripts/dentro-del-contenedor.sh` y firma.
- `scripts/dentro-del-contenedor.sh`: typecheck → unitarias → Playwright. La marca de «typecheck y
  unitarias en verde» se escribe **fuera** de `test-results/`.
- `scripts/evidencia-e2e.mjs`: hash de las rutas que afectan a las pruebas (`git ls-files`), escritura y
  cotejo de `.e2e-evidencia.json`.
- En el workflow: un push sin constancia válida **falla en segundos** en vez de correr e2e; los e2e en
  Actions solo con disparo manual.

Por qué Docker y no el Node del Mac: la constancia vale para el runner de Linux solo si se corrió en el
mismo entorno. Por qué no en Actions: una suite de ~250 pruebas son ~13 minutos por despliegue.

Cuando dos o más repos la adopten, estos scripts deben subir a `piensa-it/.github` (junto a
`reusable-deploy.yml`) en vez de copiarse.
