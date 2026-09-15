# Receta visual de la landing

Detalle de cada bloque. Los valores son de Tailwind; en HTML estático tradúcelos a CSS con los tokens del
producto. Referencia en producción: https://deliver.piensait.com.

## Contenido
1. Encabezado con firma
2. Hero
3. Secciones
4. Capacidades (tarjetas)
5. Cómo funciona
6. Maqueta del resultado
7. Precios y estimador
8. Llamado a la acción y pie
9. Accesibilidad y móvil

## 1. Encabezado con firma

Con `@piensa-it/ui-library` (mientras no exista `signature`, app-ui#184):

```tsx
const Firma = () => (
  <span className="flex items-baseline gap-2.5">
    <span className="text-lg font-semibold tracking-tight sm:text-xl">Deliver</span>
    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
      <img src="/logo.png" alt="" width={14} height={14} className="rounded-[3px]" />
      by Piensa IT
    </span>
  </span>
);

<PublicHeader
  logoSrc="/logo.png"
  brandName={(<Firma />) as unknown as string}   // PublicHeader tipa string pero pinta contenido
  className="[&_a>img.size-9]:hidden"            // oculta el logo grande: la firma ya lleva el isotipo
  linkComponent={Enlace}
  desktopNav={...}
  mobileNav={...}
/>
```

Navegación: 4-5 enlaces en `text-sm text-muted-foreground hover:text-foreground` y un botón primario
(«Estimar mi plan», «Ver documentación»). Pie: `PublicFooter` con columnas Producto/Desarrolladores y
`credit` «<Producto> by Piensa IT».

En HTML estático (AdapterDian): `.marca` flex con baseline, nombre en la serif del producto y `.firma`
en mono 10 px uppercase con el isotipo de 17 px.

## 2. Hero

- Grid `lg:grid-cols-[1.05fr_1fr]`, `max-w-6xl`, `py-20 lg:py-28`, una columna en móvil.
- Izquierda:
  - Pill: `Badge variant="outline"` con un punto `size-1.5 rounded-full bg-primary` y la propuesta en
    4-6 palabras.
  - Titular `text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-balance` en dos frases;
    la segunda con `bg-gradient-to-r from-primary to-<tono vecino> bg-clip-text text-transparent`.
  - Párrafo `text-lg text-muted-foreground max-w-xl`.
  - Dos botones: primario (acción principal) y `outline` (secundaria).
- Derecha: **artefacto real**. En productos con API, una ventana de código:
  `rounded-xl border border-white/10 bg-[#0f1020] shadow-2xl`, barra con tres puntos (#ff5f57, #febc2e,
  #28c840), título en mono, botón copiar, `pre` en `font-mono text-[13px]` con la petición real y la
  respuesta. En productos sin API, una tarjeta del resultado (documento, tablero).
- Fondo:
  ```css
  .bg-rejilla {
    background-image: linear-gradient(hsl(var(--foreground) / .05) 1px, transparent 1px),
                      linear-gradient(90deg, hsl(var(--foreground) / .05) 1px, transparent 1px);
    background-size: 32px 32px;
  }
  ```
  con `[mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]`, más un halo
  `absolute -top-40 left-1/2 h-96 w-[48rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl`.

## 3. Secciones

Alterna `bg-muted/30 border-t` y fondo normal. Contenedor `max-w-6xl px-6 py-20`. Cabecera: eyebrow
`text-sm font-medium text-primary`, título `text-3xl font-semibold tracking-tight`, subtítulo de una línea
`text-muted-foreground`. Da `id` y `scroll-mt-20` para anclas del menú.

## 4. Capacidades (tarjetas)

Grid `sm:grid-cols-2 lg:grid-cols-4`. Cada `Card` con `relative overflow-hidden hover:shadow-lg`:
- Tinte superior: `absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-<color>-500/15 to-transparent`,
  un color distinto por categoría.
- Icono lucide dentro de `rounded-lg bg-background p-2 shadow-sm`.
- `Badge` de estado o fase («Fase 1», «Disponible»).
- Título, descripción corta y pie «vía <proveedor/estándar>» en `text-xs`.

## 5. Cómo funciona

Tres tarjetas `rounded-2xl border bg-card p-6` con el número `01/02/03` en
`absolute right-6 top-5 font-mono text-5xl font-bold text-muted-foreground/15`, icono en color de
producto, título y texto. Debajo, 4 garantías en dos columnas con icono de check.

## 6. Maqueta del resultado

HTML/CSS, no imágenes: muestra lo que obtiene el cliente con datos de ejemplo verosímiles. Una tarjeta
principal con sombra y una secundaria flotante `rotate-3` en la esquina (`hidden sm:block`). Ejemplos:
chat de WhatsApp con variables resaltadas (Deliver), factura validada con CUFE (AdapterDian), hoja PDF
(docsgen), tablero de documentos (CoreLink).

## 7. Precios y estimador

Si el producto se vende por volumen o paquetes:
- Selector de línea/canal con chips `rounded-full border px-4 py-2`.
- 4 tarjetas; la segunda destacada con `border-primary ring-1 ring-primary` y `Badge` «Más elegido».
- Precio grande, «al mes», volumen incluido, precio unitario y precio del adicional.
- Nota fina con condiciones (moneda, IVA, fecha de tarifas).
- Estimador: inputs por línea con formato de miles y tabla con el paquete recomendado y el total.
- Las cifras salen de un módulo compartido, no escritas en la UI.

## 8. Llamado a la acción y pie

Bloque `rounded-3xl bg-gradient-to-br from-primary to-<tono vecino> px-8 py-14 text-center` con la rejilla
encima al 40 %, título blanco, una línea en `primary-foreground/80` y botón `variant="surface"`.

## 9. Accesibilidad y móvil

- Contraste AA; `aria-label` en botones de icono; foco visible; respeta `prefers-reduced-motion`.
- A 390 px todo se apila; solo los bloques de código pueden tener scroll horizontal.
- Imágenes con `alt` (decorativas con `alt=""`), iconos de `lucide-react`.
