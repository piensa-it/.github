/**
 * Prerenderizado de las páginas públicas de una SPA React + Vite.
 *
 * Origen: piensa-it/app-deliver (probado en producción). ADAPTAR: el
 * `Disallow` de robots.txt y el umbral de contenido mínimo si hace falta.
 *
 * Corre después de `vite build` (cliente) y `vite build --ssr` (servidor):
 *
 *   dist/index.html          → plantilla con los assets del cliente
 *   dist-ssr/entry-server.js → render(url) y la lista de rutas
 *
 * Para cada ruta escribe `dist/<ruta>/index.html` con el HTML ya armado y sus
 * etiquetas (título, descripción, canonical, Open Graph). Netlify sirve ese
 * archivo antes que la regla SPA de `_redirects`. Además deja:
 *
 *   dist/spa.html     cascarón vacío para rutas sin prerenderizar
 *   dist/sitemap.xml  y  dist/robots.txt
 *
 * Falla si una página prerenderizada sale sin contenido: mejor romper el
 * build que publicar un HTML vacío creyendo que tiene SEO.
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dist = path.join(raiz, 'dist');
const ssr = path.join(raiz, 'dist-ssr');

const { render, RUTAS, SITIO } = await import(pathToFileURL(path.join(ssr, 'entry-server.js')).href);
const plantilla = await readFile(path.join(dist, 'index.html'), 'utf8');

const escapar = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

// Netlify sirve `precios/index.html` en `/precios/` (redirige sin barra): la URL
// canónica y el sitemap usan esa misma forma para no mandar señales dobles.
const urlDe = (ruta) => `${SITIO}${ruta === '/' ? '/' : `${ruta}/`}`;

const conMeta = (html, meta) => {
  const url = urlDe(meta.ruta);
  const etiquetas = [
    `<title>${escapar(meta.titulo)}</title>`,
    `<meta name="description" content="${escapar(meta.descripcion)}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:title" content="${escapar(meta.titulo)}" />`,
    `<meta property="og:description" content="${escapar(meta.descripcion)}" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${escapar(meta.titulo)}" />`,
    `<meta name="twitter:description" content="${escapar(meta.descripcion)}" />`,
  ].join('\n    ');

  // Quita las etiquetas genéricas de index.html y pone las de la ruta.
  return html
    .replace(/<title>[\s\S]*?<\/title>\s*/, '')
    .replace(/<meta\s+name="description"[\s\S]*?\/>\s*/g, '')
    .replace(/<link\s+rel="canonical"[^>]*>\s*/g, '')
    .replace(/<meta\s+(property="og:(type|url|title|description)"|name="twitter:[a-z]+")[\s\S]*?\/>\s*/g, '')
    .replace('</head>', `    ${etiquetas}\n  </head>`);
};

const escribir = async (ruta, html) => {
  const destino = ruta === '/' ? path.join(dist, 'index.html') : path.join(dist, ruta.slice(1), 'index.html');
  await mkdir(path.dirname(destino), { recursive: true });
  await writeFile(destino, html);
  return path.relative(raiz, destino);
};

// El cascarón SPA se guarda antes de sobrescribir index.html con la portada.
await writeFile(path.join(dist, 'spa.html'), plantilla);

for (const meta of RUTAS) {
  let html = conMeta(plantilla, meta);
  if (meta.prerenderizar) {
    const contenido = render(meta.ruta);
    if (contenido.length < 2000 || !contenido.includes('<main')) {
      throw new Error(`El prerenderizado de ${meta.ruta} salió sin contenido (${contenido.length} caracteres).`);
    }
    html = html.replace('<div id="root"></div>', `<div id="root">${contenido}</div>`);
    if (!html.includes(contenido)) throw new Error(`No se encontró <div id="root"></div> en index.html para ${meta.ruta}.`);
  }
  const archivo = await escribir(meta.ruta, html);
  console.log(`${meta.prerenderizar ? 'prerenderizada' : 'solo etiquetas '}  ${meta.ruta.padEnd(12)} → ${archivo}`);
}

const hoy = new Date().toISOString().slice(0, 10);
await writeFile(
  path.join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${RUTAS.map((r) => `  <url><loc>${urlDe(r.ruta)}</loc><lastmod>${hoy}</lastmod><priority>${r.prioridad}</priority></url>`).join('\n')}
</urlset>
`,
);
await writeFile(path.join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${SITIO}/sitemap.xml\n`);

await rm(ssr, { recursive: true, force: true });
console.log('sitemap.xml y robots.txt generados');
