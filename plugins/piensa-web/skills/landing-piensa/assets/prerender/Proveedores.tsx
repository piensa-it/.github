import { useSyncExternalStore, type ReactNode } from 'react';
import { UiProvider } from '@piensa-it/ui-library';

/**
 * `UiProvider` solo agrega, junto a los hijos, el Toaster y el host de diálogos
 * de la librería. El host usa `useSyncExternalStore` sin `getServerSnapshot` y
 * rompe `renderToString` en el prerenderizado (piensa-it/app-ui#183).
 * Cuando se publique el arreglo, este componente puede volver a ser `UiProvider`. Ninguno de los dos pinta
 * nada mientras no haya un toast o un diálogo abierto, así que se montan
 * después de hidratar: el HTML del servidor y el primer render del cliente
 * quedan idénticos.
 *
 * `useSyncExternalStore` con instantánea de servidor `false` es la forma de
 * React de saber «ya estoy en el navegador» sin un setState en un efecto.
 */
const sinSuscripcion = () => () => {};
export function Proveedores({ children }: { children: ReactNode }) {
  const enNavegador = useSyncExternalStore(
    sinSuscripcion,
    () => true,
    () => false,
  );

  return (
    <>
      {children}
      {enNavegador && <UiProvider>{null}</UiProvider>}
    </>
  );
}
