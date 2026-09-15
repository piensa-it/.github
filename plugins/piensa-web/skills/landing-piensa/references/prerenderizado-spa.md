# Prerenderizado de una SPA React + Vite

Procedimiento probado en producción en `piensa-it/app-deliver` (#64). Archivos base en
`../assets/prerender/`.

## 1. Decide las rutas

- **Prerenderizar**: páginas públicas de contenido (`/`, `/precios`, `/funcionalidades`…).
- **Solo etiquetas** (`prerenderizar: false`): rutas que pintan en cliente con librerías pesadas o que
  necesitan sesión (`/docs` con Scalar, `/app`, `/login`). Llegan vacías pero con su título y OG.

## 2. Copia y adapta los archivos

| Archivo base | Destino | Qué adaptar |
|---|---|---|
| `seo.ts` | `src/seo.ts` | Dominio, rutas, títulos «<Página> · <Producto> by Piensa IT», descripciones (~160 car.) |
| `rutas.tsx` | `src/rutas.tsx` | Layout público y páginas del producto |
| `entry-server.tsx` | `src/entry-server.tsx` | Normalmente nada; mismos proveedores que `App` |
| `Proveedores.tsx` | `src/components/Proveedores.tsx` | Solo si usa `UiProvider` de ui-library |
| `main.tsx` | `src/main.tsx` | Imports de estilos del proyecto |
| `prerender.mjs` | `scripts/prerender.mjs` | `Disallow` de robots, umbral de contenido |

Luego:
- `App.tsx`: `<Proveedores><MetaPorRuta/><Routes>{rutasPublicas()}{/* rutas solo cliente */}</Routes></Proveedores>`,
  donde `MetaPorRuta` actualiza `document.title` y la meta description con `metaDe(pathname)` en un efecto.
- `vite.config`: `ssr: { noExternal: ['@piensa-it/ui-library'] }`.
- `package.json`: `"build:web": "vite build && vite build --ssr src/entry-server.tsx --outDir dist-ssr && node scripts/prerender.mjs"`
  y que `build`, CI y la verificación local usen `build:web`.
- `.gitignore`: `dist-ssr`.
- `public/_redirects` (Netlify): la regla SPA pasa de `/index.html` a `/spa.html`:
  ```
  /*  /spa.html  200
  ```
  Si siguiera en `index.html`, una ruta solo-cliente recibiría el HTML de la portada y React intentaría
  hidratar la portada encima de otra página.
- En repos JavaScript, los mismos archivos con `.jsx`/`.js` y sin tipos.
- Si el despliegue no es Netlify, replica: archivo por ruta, fallback SPA a `spa.html`.

## 3. Trampas conocidas

- **`UiProvider` y SSR**: su `AlertDialogHost` usa `useSyncExternalStore` sin `getServerSnapshot` y
  rompe `renderToString` («Missing getServerSnapshot»). `Proveedores.tsx` lo monta después de hidratar
  con `useSyncExternalStore(() => () => {}, () => true, () => false)`. Seguimiento: app-ui#183.
- **Nada del navegador durante el render**: `window`, `document`, `localStorage`, `matchMedia`,
  `navigator` solo dentro de efectos o manejadores.
- **Resultados distintos servidor/cliente** (fechas con `new Date()`, `Math.random()`, locale) causan
  errores de hidratación: calcula en efectos o fija los valores.
- **Componentes pesados solo cliente** (Scalar, mapas, editores, charts con canvas): `lazy` y fuera de las
  rutas prerenderizadas.
- **Lint `react-hooks`** puede marcar `setState` dentro de efectos: prefiere `useSyncExternalStore` para
  «estoy en el navegador».
- **Canonical**: Netlify sirve `ruta/index.html` en `/ruta/`; canonical y sitemap usan la barra final
  (ya lo hace `prerender.mjs`).
- **Sin `og:image`**: las vistas previas salen sin imagen. Diseña una imagen 1200×630 PNG por producto
  (no SVG) y agrégala a las etiquetas.

## 4. Verificación

```sh
npm run build:web                 # debe listar cada ruta «prerenderizada» y generar sitemap/robots
npx vite preview --port 4173 &
for r in / /precios/ /docs/; do
  curl -s http://localhost:4173$r | grep -oE '<title>[^<]*|og:title" content="[^"]*|id="root"></div>' ; done
```

- Rutas prerenderizadas: título propio y **sin** `id="root"></div>` vacío.
- Rutas solo-cliente: título propio y root vacío.
- Navegador: consola sin errores de hidratación (en producción aparecen como «Minified React error
  #418/#423»), formularios y menús funcionan, rutas solo-cliente cargan.
- Tras desplegar, repite el `curl` contra el dominio público.
