# ¿Prerenderizar o migrar a Astro?

Decisión tomada con el dueño (2026-09-15, Deliver): **prerenderizar ahora; Astro solo si hay estrategia de
contenido o se unifican las landings**. Usa esta tabla para explicarlo en otro producto.

| | Prerenderizado (SPA actual) | Astro |
|---|---|---|
| HTML armado para buscadores, IA y vistas previas | ✅ | ✅ |
| Título y OG por página, sitemap | ✅ | ✅ |
| JavaScript que descarga el visitante | Igual que hoy (hidrata toda la app) | Solo las islas interactivas |
| Blog, guías y casos en Markdown | ❌ (programar cada página) | ✅ |
| Esfuerzo | Horas, sin cambiar de stack | 1-2 días y otro modelo mental |
| Panel con login | Sin cambios | Isla `client:only` o app Vite aparte |
| ui-library | Sin cambios | Componentes como islas; cuidar Tailwind y estilos |

Si se migra, hazlo **en el mismo repo** cuando la web comparta código con el backend (catálogos, precios,
OpenAPI): un repo aparte obliga a duplicar o publicar ese código.
