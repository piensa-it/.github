#!/usr/bin/env node
/**
 * Public web check — Piensa IT.
 *
 * Verifies that each public page ships real HTML and its own SEO tags, the way
 * a crawler, an AI bot or a WhatsApp/LinkedIn/Slack link preview sees it: no
 * JavaScript executed. See docs/QUALITY_GATE.md ("Public web") and the
 * `landing-piensa` skill.
 *
 *   node check.mjs --dist dist --routes "/,/precios/" [--client-routes "/docs/"]
 *   node check.mjs --base-url https://deliver.piensait.com --routes "/,/precios/"
 *
 * Options
 *   --dist <dir>            Check a built folder (route "/precios/" → <dir>/precios/index.html).
 *   --base-url <url>        Check a deployed site over HTTP instead.
 *   --routes <list>         Comma-separated routes that MUST ship content (prerendered or static).
 *   --client-routes <list>  Routes rendered in the browser (docs, app): only their tags are checked.
 *   --signature <text>      Text every <title> must contain. Default "by Piensa IT". Empty to disable.
 *   --min-text <n>          Minimum visible characters for content routes. Default 400.
 *   --no-sitemap            Do not require sitemap.xml / robots.txt.
 *
 * Exit code 1 with one `::error::` per problem (GitHub Actions annotations), so
 * every failure names the route and the missing tag. Nothing is skipped
 * silently: an unreachable route is an error, not a warning.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
const opcion = (nombre, porDefecto) => {
  const i = args.indexOf(`--${nombre}`);
  return i === -1 ? porDefecto : args[i + 1];
};
const bandera = (nombre) => args.includes(`--${nombre}`);
const lista = (valor) =>
  (valor ?? '')
    .split(/[,\n]/)
    .map((r) => r.trim())
    .filter(Boolean);

const dist = opcion('dist');
const baseUrl = opcion('base-url')?.replace(/\/+$/, '');
const rutasContenido = lista(opcion('routes'));
const rutasCliente = lista(opcion('client-routes'));
const firma = opcion('signature', 'by Piensa IT');
const minTexto = Number(opcion('min-text', '400'));
const exigirSitemap = !bandera('no-sitemap');

const errores = [];
const error = (ruta, mensaje) => errores.push(`${ruta}: ${mensaje}`);

if (!dist === !baseUrl) {
  console.error('::error::Pass exactly one of --dist or --base-url.');
  process.exit(2);
}
if (!rutasContenido.length) {
  console.error('::error::--routes is required: list the public pages that must ship content.');
  process.exit(2);
}

const leer = async (ruta, archivoPorRuta = true) => {
  if (baseUrl) {
    const respuesta = await fetch(`${baseUrl}${ruta}`, { redirect: 'follow', headers: { 'user-agent': 'piensa-public-web-check' } });
    return { estado: respuesta.status, texto: await respuesta.text() };
  }
  const archivo = archivoPorRuta
    ? path.join(dist, ruta === '/' ? 'index.html' : path.join(ruta.replace(/^\/|\/$/g, ''), 'index.html'))
    : path.join(dist, ruta.replace(/^\//, ''));
  try {
    return { estado: 200, texto: await readFile(archivo, 'utf8') };
  } catch {
    return { estado: 404, texto: '', archivo };
  }
};

const atributo = (html, patron) => html.match(patron)?.[1]?.trim() ?? '';
const decodificar = (s) =>
  s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

const etiquetas = (html) => ({
  titulo: decodificar(atributo(html, /<title[^>]*>([\s\S]*?)<\/title>/i)),
  descripcion: atributo(html, /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i),
  canonical: atributo(html, /<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i),
  ogTitulo: atributo(html, /<meta\s+property=["']og:title["']\s+content=["']([^"']*)["']/i),
  ogDescripcion: atributo(html, /<meta\s+property=["']og:description["']\s+content=["']([^"']*)["']/i),
});

const textoVisible = (html) =>
  (html.match(/<body[\s\S]*<\/body>/i)?.[0] ?? html)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const titulos = new Map();

const revisar = async (ruta, conContenido) => {
  const { estado, texto: html, archivo } = await leer(ruta);
  if (estado !== 200) {
    error(ruta, archivo ? `file not found (${path.relative(process.cwd(), archivo)})` : `HTTP ${estado}`);
    return;
  }

  const t = etiquetas(html);
  if (!t.titulo) error(ruta, 'missing <title>');
  else {
    if (firma && !t.titulo.includes(firma)) error(ruta, `<title> must contain «${firma}» (got «${t.titulo}»)`);
    if (titulos.has(t.titulo)) error(ruta, `<title> duplicates ${titulos.get(t.titulo)} («${t.titulo}»)`);
    titulos.set(t.titulo, ruta);
  }
  if (!t.descripcion) error(ruta, 'missing <meta name="description">');
  else if (t.descripcion.length > 200) error(ruta, `meta description is ${t.descripcion.length} chars (keep it under ~160)`);
  if (!t.canonical) error(ruta, 'missing <link rel="canonical">');
  if (!t.ogTitulo) error(ruta, 'missing og:title');
  if (!t.ogDescripcion) error(ruta, 'missing og:description');

  const visible = textoVisible(html);
  if (conContenido) {
    if (/<div\s+id=["']root["']\s*>\s*<\/div>/i.test(html)) {
      error(ruta, 'empty <div id="root"></div>: the page is not prerendered, crawlers and link previews see nothing');
    } else if (visible.length < minTexto) {
      error(ruta, `only ${visible.length} visible characters without JavaScript (minimum ${minTexto})`);
    }
  }

  console.log(`${conContenido ? 'content' : 'client '}  ${ruta.padEnd(16)} ${t.titulo || '(no title)'} · ${visible.length} chars`);
};

for (const ruta of rutasContenido) await revisar(ruta, true);
for (const ruta of rutasCliente) await revisar(ruta, false);

if (exigirSitemap) {
  for (const archivo of ['/sitemap.xml', '/robots.txt']) {
    const { estado, texto } = await leer(archivo, false);
    if (estado !== 200) error(archivo, 'not found');
    else if (archivo === '/sitemap.xml' && !texto.includes('<urlset')) error(archivo, 'is not a sitemap (<urlset> missing)');
    else if (archivo === '/robots.txt' && !/sitemap:/i.test(texto)) error(archivo, 'does not point to the sitemap (Sitemap: line missing)');
  }
}

if (errores.length) {
  for (const e of errores) console.log(`::error::${e}`);
  console.log(`\n✘ ${errores.length} problem(s) in the public web.`);
  process.exit(1);
}
console.log('\n✔ Public web: every page ships its content and its own tags.');
