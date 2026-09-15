import { Route } from 'react-router-dom';
// ADAPTAR: el layout público y las páginas del producto.
import { Sitio } from '@/components/Sitio';
import Inicio from '@/pages/Inicio';
import Precios from '@/pages/Precios';
import NoEncontrada from '@/pages/NoEncontrada';

/**
 * Rutas del sitio público. Las comparten el cliente (`App`) y el
 * prerenderizado (`entry-server`), así el HTML estático y la hidratación
 * pintan exactamente el mismo árbol. Se llama como función porque `<Routes>`
 * solo acepta `<Route>` directos.
 */
export const rutasPublicas = () => (
  <Route element={<Sitio />}>
    <Route index element={<Inicio />} />
    <Route path="precios" element={<Precios />} />
    <Route path="*" element={<NoEncontrada />} />
  </Route>
);
