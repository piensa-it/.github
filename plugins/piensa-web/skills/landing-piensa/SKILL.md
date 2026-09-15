---
name: landing-piensa
description: Web pública de los productos de Piensa IT (Deliver, AdapterDian, CoreLink, docsgen, MiDivisa, Lynx…). Úsala al crear, rediseñar o revisar una landing, página de precios, página de producto o documentación pública; al poner la firma «<Producto> by Piensa IT» o quitar un «Beta»; al mejorar SEO, títulos, Open Graph, vistas previas de enlaces (WhatsApp, LinkedIn, Slack), sitemap o robots; y al prerenderizar una SPA de React/Vite o evaluar Astro. Úsala aunque el usuario solo diga «haz la landing más bonita», «que se vea como Deliver» o «que Google vea la página», siempre que el repo sea de Piensa IT.
---

# Web pública de productos Piensa IT

Receta compartida para que todas las webs públicas de Piensa IT se vean y se comporten como una
familia: misma firma, misma calidad visual, SEO por página y HTML que llega armado. Referencia viva en
producción: https://deliver.piensait.com (repo `piensa-it/app-deliver`).

## 1. Entiende el repo antes de proponer

Lee `CLAUDE.md`/`AGENTS.md`, la web pública actual y el stack. Clasifícalo, porque decide el camino:

| Stack de la web pública | Qué aplica |
|---|---|
| HTML estático (p. ej. AdapterDian `web/public`) | Receta visual y firma. SEO = revisar etiquetas por página, sitemap y robots. **No** prerenderizar: ya llega armado. |
| SPA React + Vite (Deliver, CoreLink, docsgen…) | Receta visual, firma y **prerenderizado** (sección 4). |
| Astro / Next / otro con render de servidor | Receta visual y firma; el SEO se resuelve con el framework, no con el script. |

No cambies de stack para esto. Si el usuario pregunta por Astro, lee `references/astro-vs-prerender.md`.

Muestra en pocas líneas el plan (secciones, textos principales, qué rutas se prerenderizan) antes de
implementar: el dueño decide tono y alcance, y es más barato corregir un plan que un rediseño.

## 2. Identidad: la firma y la marca del producto

- **Firma de producto**: el nombre del producto manda; a su lado, el isotipo de Piensa IT (~14 px,
  radio 3 px) y «by Piensa IT» en mayúsculas finas monoespaciadas (`text-[10px]`, `tracking-[0.14em]`,
  color atenuado). El isotipo **firma** el producto, no es su logo; nada de pills «Beta» en su lugar.
  También en el pie («<Producto> by Piensa IT») y en `<title>`/`og:title`.
- **Conserva la identidad de cada producto** (color, tipografías, tono). No copies el índigo de Deliver.
  Identidades conocidas en `references/productos.md`.
- Con `@piensa-it/ui-library` usa `PublicHeader`, `PublicFooter`, `Button`, `Badge`, `Card` y sus tokens
  (`bg-background`, `text-muted-foreground`, `primary`…) en vez de colores sueltos. Mientras no exista
  `signature` (piensa-it/app-ui#184), la firma se pasa como `brandName` (componente) y el logo grande
  se oculta; ver el ejemplo en `references/receta-visual.md`.

## 3. Receta visual

Lee `references/receta-visual.md` para el detalle de cada bloque. En resumen, lo que hace que se vea bien:

1. Hero en dos columnas con un **artefacto real** del producto (petición a la API, documento, tablero)
   a la derecha, titular con una frase en degradado, fondo de rejilla con máscara radial y halo difuso.
2. Secciones que alternan fondo, con eyebrow + título + una línea de subtítulo.
3. Tarjetas de capacidades con tinte por categoría, pasos «01/02/03», garantías con check.
4. Maqueta del resultado del producto hecha en HTML/CSS, no imágenes genéricas.
5. Llamado a la acción con degradado; precios con estimador si el producto se vende por volumen.

Textos en español, concretos y con datos reales del producto (endpoints, estados, nombres de documentos).
Un titular que diga el beneficio vale más que tres adjetivos.

## 4. SEO y prerenderizado (SPA React + Vite)

Por qué: una SPA entrega `<div id="root"></div>` vacío y el mismo título en todas las rutas. Buscadores
distintos de Google, rastreadores de IA y las vistas previas de WhatsApp/LinkedIn/Slack no ejecutan
JavaScript, así que no ven nada. Prerenderizar da HTML armado y etiquetas por página sin cambiar de stack.

Sigue `references/prerenderizado-spa.md`. Los archivos base están en `assets/prerender/` (probados en
producción en Deliver): cópialos y adapta lo marcado con `ADAPTAR`. Resumen del diseño:

- `src/seo.ts` (rutas + metadatos) → `src/rutas.tsx` (rutas compartidas cliente/servidor) →
  `src/entry-server.tsx` (`renderToString` + `StaticRouter`) → `scripts/prerender.mjs` (escribe
  `dist/<ruta>/index.html`, `spa.html`, `sitemap.xml`, `robots.txt`; falla si una página sale vacía).
- `main.tsx` hidrata si `#root` trae contenido; `_redirects` manda lo desconocido a `/spa.html`.
- Trampa conocida: `UiProvider` rompe el render de servidor (app-ui#183); usa `Proveedores.tsx`.

## 5. Verificación: no digas «listo» sin evidencia

1. Lint, tipos, tests y build del repo.
2. Capturas de escritorio (1366 px) y móvil (390 px) de cada sección; revísalas tú y corrige
   desalineaciones, textos cortados y contrastes antes de mostrarlas.
3. Si hubo prerenderizado: `curl` de cada ruta del build servido y, después del despliegue, del
   **dominio público**. El HTML sin JavaScript debe traer el texto de la página y su `<title>`/`og:title`.
   En el navegador: consola sin errores de hidratación y lo interactivo funcionando.
4. No hagas commit ni publiques sin mostrar las capturas al dueño, salvo que ya lo haya autorizado.

5. Deja el chequeo en CI: wrapper de `reusable-public-web.yml` (plantilla `templates/public-web.yml` de
   `piensa-it/.github`), que bloquea el PR si una página pública llega vacía o sin sus etiquetas.

Checklist final en `references/checklist.md`.
