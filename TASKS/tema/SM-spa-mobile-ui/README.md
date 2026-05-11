# SM-spa-mobile-ui — SPA responsive (móvil)

Ajustes de layout en el panel admin para pantallas estrechas: modales, gestión diaria y vistas relacionadas.

## Estado

- **2026-05-11 — Lista de espera de disponibilidad (`/gestion-diaria/espera-disponibilidad`):**
  - **PC (`md`+):** tabla dentro de `spa-md-table-wrap`, card blanca con borde suave y **scroll horizontal** si no cabe. Columnas estándar (orden y contenido alineados a referencia de producto):
    1. **Cliente** — círculo con iniciales (color suave derivado del nombre) + **nombre** en negrita + **email** debajo en gris pequeño.
    2. **Teléfono**
    3. **Estadía** — icono calendario + rango **`DD Mes YYYY → DD Mes YYYY`** (mes abreviado en español).
    4. **Detalles** — bloque en dos líneas: personas (**pax**) con icono; preferencia / propiedad con icono ubicación.
    5. **Estado** — **pill** (fondo/borde suaves, texto semántico; colores dinámicos desde API cuando no hay mapeo fijo).
    6. **Acción** — etiqueta **«Cambiar a»** + `select` para nuevo estado (mismo handler que móvil).
  - **Móvil:** solo **tarjetas** (`spa-md-cards-wrap`), una fila por registro; mismo dato y mismos `select` (`espera-estado-select`). No usar tabla apilada en `<md`.
  - Implementación: `frontend/src/views/gestionarEsperaDisponibilidad.js`; utilidades globales tabla/listado: `.cursor/rules/20-frontend-design-system.mdc` §6.1 y `source.css` (`.th`, `.spa-md-table-wrap` / `.spa-md-cards-wrap`). **Caché:** al servir el SPA, `backend/index.js` inyecta en `index.html` la URL `adminBootstrap.js?v=…` usando `RENDER_GIT_COMMIT` (Render) o el mtime de `adminBootstrap.js` en local; `adminBootstrap.js` aplica el mismo `?v` a `style.css`, `router.js` y al `import()` de la vista de lista de espera, para que no quede pegado el JS antiguo tras deploy. Opcional: `PANEL_ASSET_VERSION` si no hay commit en env. Rutas con guiones bajos (`/gestion_diaria/espera_disponibilidad`) se normalizan en `router.js`.
- **2026-05-10:** Modal **Ajuste tarifa** (gestión diaria): pestañas en fila con **scroll horizontal** para que los títulos no se compriman en móvil (`ajusteTarifaModal.js`, `gestionDiaria.js`).
- **2026-05-10:** Pestaña **Simulador de Rentabilidad**: tarjetas **Análisis Financiero** / **Potencial Venta Directa** en **una columna** en móvil (`grid-cols-1`), dos columnas desde `md` (`md:grid-cols-2`).
- **2026-05-10:** Textos de **Registrar pago** y **Autorizar Google**: marca vía `getPlatformDisplayLabelForUi()` + `GET /api/config/platform` (`PLATFORM_PRODUCT_NAME` / `PLATFORM_DOMAIN` en servidor), sin hardcode "StayManager".
