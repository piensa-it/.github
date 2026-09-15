/**
 * Entrada de servidor para el prerenderizado. La compila
 * `vite build --ssr` y la ejecuta `scripts/prerender.mjs` en el build: no corre
 * en producción, solo genera el HTML de cada página pública.
 */
import { renderToString } from 'react-dom/server';
import { Routes } from 'react-router-dom';
import { StaticRouter } from 'react-router-dom/server';
import { Proveedores } from '@/components/Proveedores';
import { rutasPublicas } from '@/rutas';

export { RUTAS, SITIO } from '@/seo';

export const render = (url: string) =>
  renderToString(
    <StaticRouter location={url} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Proveedores>
        <Routes>{rutasPublicas()}</Routes>
      </Proveedores>
    </StaticRouter>,
  );
