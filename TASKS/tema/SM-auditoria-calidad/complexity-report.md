# Reporte de Complejidad y Modularidad
**Generado:** 2026-05-12 02:21
**Archivos analizados:** 413
**Críticos:** 52 | **Warnings:** 0

---

## Resumen

### 🔴 Críticos (52) — Requieren refactorización

| Archivo | Problema | Detalle |
|---------|---------|--------|
| `frontend/src/views/components/configurarWebPublica/webPublica.general.unified.handlers.js` | function-size | función `bindUnifiedSave` — 150 líneas (línea 93) |
| `frontend/src/views/components/configurarWebPublica/webPublica.general.unified.handlers.js` | function-size | función `normalizeSubdomain` — 146 líneas (línea 96) |
| `frontend/src/views/components/configurarWebPublica/webPublica.general.unified.lineasExtraRows.js` | function-size | función `_createRowElement` — 127 líneas (línea 73) |
| `frontend/src/views/components/configurarWebPublica/webPublica.general.unified.markup.js` | function-size | función `unifyBasicSection` — 138 líneas (línea 19) |
| `frontend/src/views/components/configurarWebPublica/webPublica.paso1.identidad.js` | file-size | 797 líneas (límite crítico: 700) |
| `frontend/src/views/components/configurarWebPublica/webPublica.paso1.identidad.js` | function-size | función `bindPaso1` — 133 líneas (línea 115) |
| `frontend/src/views/components/crm/crm.pipeline.js` | function-size | función `setupPipeline` — 126 líneas (línea 117) |
| `frontend/src/views/components/gestionarPlantillas/plantillas.modals.js` | function-size | función `setupModalPlantilla` — 201 líneas (línea 310) |
| `frontend/src/views/comunicaciones.js` | file-size | 719 líneas (límite crítico: 700) |
| `frontend/src/views/comunicaciones.js` | function-size | función `render` — 130 líneas (línea 167) |
| `frontend/src/views/comunicaciones.js` | function-size | función `afterRender` — 216 líneas (línea 503) |
| `frontend/src/views/normasAlojamiento.js` | function-size | función `renderForm` — 153 líneas (línea 155) |
| `frontend/src/views/resenas.js` | function-size | función `afterRender` — 125 líneas (línea 293) |
| `frontend/src/views/websiteAlojamientos.selector.js` | function-size | función `renderPropertyCardHtml` — 123 líneas (línea 77) |
| `frontend/src/views/websiteBlog.js` | function-size | función `afterRender` — 247 líneas (línea 93) |
| `frontend/src/views/websiteBlog.js` | function-size | función `renderPosts` — 225 líneas (línea 104) |
| `backend/services/agentEmpresaLookupService.js` | function-size | función `lookupEmpresaForAgentQuery` — 152 líneas (línea 25) |
| `backend/services/aiContentService.js` | file-size | 738 líneas (límite crítico: 700) |
| `backend/services/aiContentService.js` | too-many-exports | 17 funciones exportadas (límite crítico: 15) |
| `backend/services/blogSuggestionsService.js` | function-size | función `listSuggestions` — 150 líneas (línea 59) |
| `backend/services/blogSuggestionsService.js` | function-size | función `buildBriefForEntry` — 141 líneas (línea 213) |
| `backend/services/buildContextService.js` | function-size | función `getBuildContext` — 122 líneas (línea 123) |
| `backend/services/comunicacionesRetryService.js` | function-size | función `reintentarComunicacionEmail` — 197 líneas (línea 220) |
| `backend/services/empresaService.js` | function-size | función `actualizarDetallesEmpresa` — 147 líneas (línea 119) |
| `backend/services/gestionPropuestas.email.js` | function-size | función `enviarEmailReservaConfirmada` — 129 líneas (línea 102) |
| `backend/services/googleHotelsService.js` | function-size | función `generateAriFeed` — 131 líneas (línea 132) |
| `backend/services/marketplaceUiStrings.js` | function-size | función `getMarketplaceStrings` — 155 líneas (línea 18) |
| `backend/services/plantillasService.js` | too-many-exports | 18 funciones exportadas (límite crítico: 15) |
| `backend/services/publicAiDisponibilidadService.js` | function-size | función `buildDisponibilidadAgentResponse` — 224 líneas (línea 78) |
| `backend/services/publicAiProductSnapshot.js` | file-size | 753 líneas (límite crítico: 700) |
| `backend/services/publicAiProductSnapshot.js` | function-size | función `buildListingCardForAi` — 125 líneas (línea 332) |
| `backend/services/publicAiProductSnapshot.js` | function-size | función `buildAgentPropertyDetailPayload` — 163 líneas (línea 581) |
| `backend/services/publicAiReservaCotizacionService.js` | function-size | función `cotizarReservaIaPublica` — 270 líneas (línea 52) |
| `backend/services/publicWebsiteService.js` | file-size | 1350 líneas (límite crítico: 700) |
| `backend/services/publicWebsiteService.js` | function-size | función `obtenerMasAlojamientosParaFichaSSR` — 205 líneas (línea 282) |
| `backend/services/publicWebsiteService.js` | function-size | función `verificarReconciliacionPrecioReservaPublica` — 155 líneas (línea 708) |
| `backend/services/publicWebsiteService.js` | function-size | función `crearReservaPublica` — 321 líneas (línea 973) |
| `backend/services/resenasService.js` | file-size | 938 líneas (límite crítico: 700) |
| `backend/services/resenasService.js` | function-size | función `generarResenasAutomaticas` — 144 líneas (línea 771) |
| `backend/services/resenasService.js` | too-many-exports | 20 funciones exportadas (límite crítico: 15) |
| `backend/services/transactionalEmailService.js` | file-size | 990 líneas (límite crítico: 700) |
| `backend/services/transactionalEmailService.js` | function-size | función `enviarPorDisparador` — 120 líneas (línea 268) |
| `backend/services/transactionalEmailService.js` | function-size | función `construirVariablesDesdeReserva` — 330 líneas (línea 640) |
| `backend/services/transactionalEmailService.js` | too-many-exports | 17 funciones exportadas (límite crítico: 15) |
| `backend/services/webImagesRepairHero.js` | function-size | función `repairHeroTheme` — 124 líneas (línea 17) |
| `backend/services/webImagesRepairService.js` | function-size | función `runWebImagesRepair` — 233 líneas (línea 61) |
| `backend/routes/empresa.js` | function-size | función `_PLATFORM_DOMAIN` — 183 líneas (línea 13) |
| `backend/routes/marketplace.js` | function-size | función `createMarketplaceRouter` — 201 líneas (línea 25) |
| `backend/routes/website.property.js` | function-size | función `registerPropertyRoutes` — 220 líneas (línea 9) |
| `backend/routes/website.property.page.js` | function-size | función `renderPropiedadPublica` — 182 líneas (línea 90) |
| `backend/routes/website.seo.js` | function-size | función `registerSeoRoutes` — 223 líneas (línea 1) |
| `backend/routes/websiteBlogApi.js` | function-size | función `mountOnRouter` — 185 líneas (línea 129) |

---

## Plan de refactorización sugerido

> Orden de prioridad: atacar primero los archivos más grandes con más exports.

### 1. `backend/services/publicWebsiteService.js` 🔴
- **1350 líneas (límite crítico: 700)**
  - Dividir en módulos por responsabilidad. Cada módulo debe tener una sola razón para cambiar.
- **función `obtenerMasAlojamientosParaFichaSSR` — 205 líneas (línea 282)**
  - Extraer sub-funciones con nombres descriptivos. Máximo 60 líneas por función.
- **función `verificarReconciliacionPrecioReservaPublica` — 155 líneas (línea 708)**
  - Extraer sub-funciones con nombres descriptivos. Máximo 60 líneas por función.
- **función `crearReservaPublica` — 321 líneas (línea 973)**
  - Extraer sub-funciones con nombres descriptivos. Máximo 60 líneas por función.

### 2. `backend/services/transactionalEmailService.js` 🔴
- **990 líneas (límite crítico: 700)**
  - Dividir en módulos por responsabilidad. Cada módulo debe tener una sola razón para cambiar.
- **función `enviarPorDisparador` — 120 líneas (línea 268)**
  - Extraer sub-funciones con nombres descriptivos. Máximo 60 líneas por función.
- **función `construirVariablesDesdeReserva` — 330 líneas (línea 640)**
  - Extraer sub-funciones con nombres descriptivos. Máximo 60 líneas por función.
- **17 funciones exportadas (límite crítico: 15)**
  - Agrupar responsabilidades en sub-módulos. Ej: service.read.js, service.write.js, service.calc.js

### 3. `backend/services/resenasService.js` 🔴
- **938 líneas (límite crítico: 700)**
  - Dividir en módulos por responsabilidad. Cada módulo debe tener una sola razón para cambiar.
- **función `generarResenasAutomaticas` — 144 líneas (línea 771)**
  - Extraer sub-funciones con nombres descriptivos. Máximo 60 líneas por función.
- **20 funciones exportadas (límite crítico: 15)**
  - Agrupar responsabilidades en sub-módulos. Ej: service.read.js, service.write.js, service.calc.js

### 4. `frontend/src/views/components/configurarWebPublica/webPublica.paso1.identidad.js` 🔴
- **797 líneas (límite crítico: 700)**
  - Dividir en módulos por responsabilidad. Cada módulo debe tener una sola razón para cambiar.
- **función `bindPaso1` — 133 líneas (línea 115)**
  - Extraer sub-funciones con nombres descriptivos. Máximo 60 líneas por función.

### 5. `backend/services/publicAiProductSnapshot.js` 🔴
- **753 líneas (límite crítico: 700)**
  - Dividir en módulos por responsabilidad. Cada módulo debe tener una sola razón para cambiar.
- **función `buildListingCardForAi` — 125 líneas (línea 332)**
  - Extraer sub-funciones con nombres descriptivos. Máximo 60 líneas por función.
- **función `buildAgentPropertyDetailPayload` — 163 líneas (línea 581)**
  - Extraer sub-funciones con nombres descriptivos. Máximo 60 líneas por función.

### 6. `backend/services/aiContentService.js` 🔴
- **738 líneas (límite crítico: 700)**
  - Dividir en módulos por responsabilidad. Cada módulo debe tener una sola razón para cambiar.
- **17 funciones exportadas (límite crítico: 15)**
  - Agrupar responsabilidades en sub-módulos. Ej: service.read.js, service.write.js, service.calc.js

### 7. `frontend/src/views/comunicaciones.js` 🔴
- **719 líneas (límite crítico: 700)**
  - Dividir en módulos por responsabilidad. Cada módulo debe tener una sola razón para cambiar.
- **función `render` — 130 líneas (línea 167)**
  - Extraer sub-funciones con nombres descriptivos. Máximo 60 líneas por función.
- **función `afterRender` — 216 líneas (línea 503)**
  - Extraer sub-funciones con nombres descriptivos. Máximo 60 líneas por función.

### 8. `frontend/src/views/components/configurarWebPublica/webPublica.general.unified.handlers.js` 🔴
- **función `bindUnifiedSave` — 150 líneas (línea 93)**
  - Extraer sub-funciones con nombres descriptivos. Máximo 60 líneas por función.
- **función `normalizeSubdomain` — 146 líneas (línea 96)**
  - Extraer sub-funciones con nombres descriptivos. Máximo 60 líneas por función.

### 9. `frontend/src/views/components/configurarWebPublica/webPublica.general.unified.lineasExtraRows.js` 🔴
- **función `_createRowElement` — 127 líneas (línea 73)**
  - Extraer sub-funciones con nombres descriptivos. Máximo 60 líneas por función.

### 10. `frontend/src/views/components/configurarWebPublica/webPublica.general.unified.markup.js` 🔴
- **función `unifyBasicSection` — 138 líneas (línea 19)**
  - Extraer sub-funciones con nombres descriptivos. Máximo 60 líneas por función.

---

## Umbrales configurados

| Métrica | Warning | Crítico |
|---------|---------|--------|
| Líneas por archivo | >1000 | >700 |
| Líneas por función | >200 | >120 |
| Exports por archivo | >100 | >15 |

*Generado por scripts/tooling/audit-complexity.js*
