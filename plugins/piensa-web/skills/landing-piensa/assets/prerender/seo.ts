/**
 * Metadatos por ruta. Los usa el prerenderizado (HTML de cada página, sitemap)
 * y el cliente al navegar, para que el título de la pestaña coincida.
 *
 * ADAPTAR: dominio, rutas, títulos y descripciones del producto.
 */
export const SITIO = 'https://<producto>.piensait.com';

export interface MetaRuta {
  ruta: string;
  titulo: string;
  descripcion: string;
  /** `true`: HTML estático con contenido. `false`: solo etiquetas (rutas que pintan en cliente, p. ej. /docs, /app). */
  prerenderizar: boolean;
  prioridad: number;
}

export const RUTAS: MetaRuta[] = [
  {
    ruta: '/',
    titulo: '<Producto> by Piensa IT — <beneficio principal en pocas palabras>',
    descripcion: '<Una o dos frases concretas: qué hace, para quién, con qué diferencial. Máx. ~160 caracteres.>',
    prerenderizar: true,
    prioridad: 1,
  },
  {
    ruta: '/precios',
    titulo: 'Precios · <Producto> by Piensa IT',
    descripcion: '<Descripción de la página de precios.>',
    prerenderizar: true,
    prioridad: 0.9,
  },
  {
    ruta: '/docs',
    titulo: 'Documentación · <Producto> by Piensa IT',
    descripcion: '<Descripción de la documentación.>',
    prerenderizar: false,
    prioridad: 0.7,
  },
];

export const metaDe = (pathname: string): MetaRuta =>
  RUTAS.find((r) => r.ruta === (pathname.replace(/\/+$/, '') || '/')) ?? RUTAS[0]!;
