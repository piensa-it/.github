# Checklist de la web pública

## Identidad
- [ ] Firma «<Producto> by Piensa IT» en el encabezado (nombre + isotipo pequeño + texto mono), sin «Beta».
- [ ] Crédito «<Producto> by Piensa IT» en el pie.
- [ ] Color, tipografías y tono propios del producto conservados.

## Contenido
- [ ] Hero con artefacto real del producto y dos acciones.
- [ ] Textos en español, concretos, con datos reales; nada de lorem ipsum.
- [ ] Cifras (precios, límites) desde un módulo compartido, no escritas en la UI.

## SEO
- [ ] `<title>` por página con la forma «<Página> · <Producto> by Piensa IT».
- [ ] Meta description, canonical, `og:*` y `twitter:*` por página.
- [ ] `sitemap.xml` y `robots.txt` (con `Disallow` para la API y zonas privadas).
- [ ] SPA: páginas públicas prerenderizadas; el build falla si alguna sale vacía.
- [ ] (Pendiente frecuente) `og:image` 1200×630 PNG.

## Calidad
- [ ] Lint, tipos, tests y build en verde.
- [ ] Capturas de escritorio (1366 px) y móvil (390 px) revisadas.
- [ ] Consola sin errores de hidratación; formularios y menús funcionan.
- [ ] Contraste AA, foco visible, `aria-label` en botones de icono.
- [ ] Tras desplegar: `curl` al dominio público confirma contenido y etiquetas por ruta.
