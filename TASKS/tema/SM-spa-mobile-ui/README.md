# SM-spa-mobile-ui — SPA responsive (móvil)

Ajustes de layout en el panel admin para pantallas estrechas: modales, gestión diaria y vistas relacionadas.

## Estado

- **2026-05-10:** Modal **Ajuste tarifa** (gestión diaria): pestañas en fila con **scroll horizontal** para que los títulos no se compriman en móvil (`ajusteTarifaModal.js`, `gestionDiaria.js`).
- **2026-05-10:** Pestaña **Simulador de Rentabilidad**: tarjetas **Análisis Financiero** / **Potencial Venta Directa** en **una columna** en móvil (`grid-cols-1`), dos columnas desde `md` (`md:grid-cols-2`).
- **2026-05-10:** Textos de **Registrar pago** y **Autorizar Google**: marca vía `getPlatformDisplayLabelForUi()` + `GET /api/config/platform` (`PLATFORM_PRODUCT_NAME` / `PLATFORM_DOMAIN` en servidor), sin hardcode "StayManager".
