# Identidad y contenido por producto

Lo que se sabe de cada web pública. Verifica contra el repo antes de usarlo: la identidad puede haber
cambiado.

| Producto | Repo · web pública | Stack | Identidad a conservar | Artefacto del hero | Maqueta del resultado |
|---|---|---|---|---|---|
| Deliver | `app-deliver` · deliver.piensait.com | React + Vite + TS, Tailwind 4, ui-library, prerenderizado | Índigo `243 75% 58%`, degradado a fucsia, tipografía de la librería | `POST /v1/messages` con plantilla y respuesta 202 | Chat de WhatsApp con variables y correo flotante |
| AdapterDian | `adapter-dian` · `web/public` (HTML estático) | HTML/CSS propio, tema claro/oscuro | Verde petróleo, Newsreader + IBM Plex Mono, isotipo 17 px en `.firma` | `POST /invoices/v1/sales-invoices` y su respuesta con estado | Factura validada con CUFE y estados DIAN |
| CoreLink | `app-corelink` | React + Vite + TS, Tailwind 4 con preset de ui-library | Instrument Serif (titulares) + Archivo + IBM Plex Mono | Emisión o recepción de un documento electrónico | Tablero de documentos con estados y totales |
| docsgen | `app-document-generator` · docsgen.piensait.com | React + Vite JS, Tailwind 3, ui-library | Estilo de la librería; diseños de PDF estándar/premium/moderna | `POST /api/documents` con `type` y `plantilla` | Hoja PDF de una cuenta de cobro con tarjeta flotante del diseño premium |

Si el producto no está en la tabla, lee su landing y `CLAUDE.md` y propón la identidad al dueño antes de
implementar.
