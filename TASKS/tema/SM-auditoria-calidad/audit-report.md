# Reporte de Auditoría UI
**Generado:** 2026-05-09 02:18
**Archivos analizados:** 190
**Problemas encontrados:** 95 (alta: 0 / media: 5 / baja: 90)

---

## Resumen por categoría

| Categoría | Severidad | Ocurrencias |
|-----------|-----------|-------------|
| Botón con clases Tailwind directas (sin .btn-*) | media | 5 |
| Color hexadecimal hardcodeado | baja | 90 |

---

## Detalle por categoría

### Botón con clases Tailwind directas (sin .btn-*) (5 ocurrencias)
**Sugerencia:** Usar btn-primary / btn-danger / btn-success / btn-outline  
**Severidad:** media

| Archivo | Línea | Clase detectada |
|---------|-------|-----------------|
| `frontend/src/views/components/gestionarReservas/reservas.modals.view.js` | 321 | `class="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-success-100 text-success-700 border border-success-200"` |
| `frontend/src/views/components/gestionarReservas/reservas.modals.view.js` | 322 | `class="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-warning-100 text-warning-700 border border-warning-200"` |
| `frontend/src/views/comunicaciones.js` | 182 | `class="com-tab px-3 py-1.5 text-sm rounded-md font-medium bg-primary-100 text-primary-800"` |
| `frontend/src/views/normasAlojamiento.js` | 300 | `class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 disabled:opacity-50"` |
| `backend/views/propiedad.ejs` | 1190 | `class="lg:hidden text-sm font-semibold text-primary-700 border border-primary-200 bg-primary-50 px-3 py-2 rounded-xl hover:bg-primary-100 transition-colors"` |

### Color hexadecimal hardcodeado (90 ocurrencias)
**Sugerencia:** Usar tokens de color de Tailwind config  
**Severidad:** baja

| Archivo | Línea | Clase detectada |
|---------|-------|-----------------|
| `backend/views/marketplace/google-hotels-catalog.ejs` | 104 | `#222222` |
| `backend/views/marketplace/google-hotels-catalog.ejs` | 107 | `#717171` |
| `backend/views/marketplace/google-hotels-catalog.ejs` | 119 | `#DDDDDD` |
| `backend/views/marketplace/google-hotels-catalog.ejs` | 120 | `#717171` |
| `backend/views/marketplace/google-hotels-catalog.ejs` | 121 | `#222222` |
| `backend/views/marketplace/index.ejs` | 195 | `#717171` |
| `backend/views/marketplace/index.ejs` | 197 | `#DDDDDD` |
| `backend/views/marketplace/index.ejs` | 197 | `#222222` |
| `backend/views/marketplace/index.ejs` | 197 | `#222222` |
| `backend/views/marketplace/index.ejs` | 313 | `#717171` |
| `backend/views/marketplace/index.ejs` | 314 | `#222222` |
| `backend/views/marketplace/index.ejs` | 321 | `#DDDDDD` |
| `backend/views/marketplace/index.ejs` | 322 | `#717171` |
| `backend/views/marketplace/index.ejs` | 323 | `#222222` |
| `backend/views/partials/marketplace-brand-logo.ejs` | 9 | `#222222` |
| `backend/views/partials/marketplace-common-styles.ejs` | 4 | `#FFFFFF` |
| `backend/views/partials/marketplace-common-styles.ejs` | 4 | `#222222` |
| `backend/views/partials/marketplace-common-styles.ejs` | 26 | `#FFFFFF` |
| `backend/views/partials/marketplace-common-styles.ejs` | 27 | `#DDDDDD` |
| `backend/views/partials/marketplace-common-styles.ejs` | 69 | `#222222` |
| `backend/views/partials/marketplace-common-styles.ejs` | 73 | `#000000` |
| `backend/views/partials/marketplace-common-styles.ejs` | 74 | `#222222` |
| `backend/views/partials/marketplace-common-styles.ejs` | 77 | `#F7F7F7` |
| `backend/views/partials/marketplace-common-styles.ejs` | 98 | `#DDDDDD` |
| `backend/views/partials/marketplace-common-styles.ejs` | 99 | `#FFFFFF` |
| `backend/views/partials/marketplace-common-styles.ejs` | 100 | `#222222` |
| `backend/views/partials/marketplace-common-styles.ejs` | 105 | `#B0B0B0` |
| `backend/views/partials/marketplace-common-styles.ejs` | 113 | `#FFFFFF` |
| `backend/views/partials/marketplace-common-styles.ejs` | 114 | `#EBEBEB` |
| `backend/views/partials/marketplace-common-styles.ejs` | 125 | `#222222` |
| `backend/views/partials/marketplace-common-styles.ejs` | 129 | `#F7F7F7` |
| `backend/views/partials/marketplace-common-styles.ejs` | 131 | `#F7F7F7` |
| `backend/views/partials/marketplace-common-styles.ejs` | 160 | `#FFFFFF` |
| `backend/views/partials/marketplace-common-styles.ejs` | 163 | `#EBEBEB` |
| `backend/views/partials/marketplace-common-styles.ejs` | 195 | `#DDDDDD` |
| `backend/views/partials/marketplace-common-styles.ejs` | 196 | `#F7F7F7` |
| `backend/views/partials/marketplace-common-styles.ejs` | 197 | `#222222` |
| `backend/views/partials/marketplace-common-styles.ejs` | 205 | `#717171` |
| `backend/views/partials/marketplace-common-styles.ejs` | 209 | `#222222` |
| `backend/views/partials/marketplace-common-styles.ejs` | 216 | `#222222` |
| `backend/views/partials/marketplace-common-styles.ejs` | 219 | `#FFFFFF` |
| `backend/views/partials/marketplace-common-styles.ejs` | 220 | `#EBEBEB` |
| `backend/views/partials/marketplace-common-styles.ejs` | 236 | `#222222` |
| `backend/views/partials/marketplace-common-styles.ejs` | 244 | `#717171` |
| `backend/views/partials/marketplace-common-styles.ejs` | 251 | `#FFFFFF` |
| `backend/views/partials/marketplace-common-styles.ejs` | 252 | `#DDDDDD` |
| `backend/views/partials/marketplace-common-styles.ejs` | 258 | `#FF385C` |
| `backend/views/partials/marketplace-common-styles.ejs` | 259 | `#FFFFFF` |
| `backend/views/partials/marketplace-common-styles.ejs` | 262 | `#E31C5F` |
| `backend/views/partials/marketplace-common-styles.ejs` | 266 | `#FFFFFF` |
| `backend/views/partials/marketplace-common-styles.ejs` | 266 | `#222222` |
| `backend/views/partials/marketplace-common-styles.ejs` | 272 | `#EBEBEB` |
| `backend/views/partials/marketplace-common-styles.ejs` | 273 | `#222222` |
| `backend/views/partials/marketplace-common-styles.ejs` | 274 | `#222222` |
| `backend/views/partials/marketplace-common-styles.ejs` | 275 | `#717171` |
| `backend/views/partials/marketplace-common-styles.ejs` | 320 | `#DDDDDD` |
| `backend/views/partials/marketplace-common-styles.ejs` | 322 | `#FFFFFF` |
| `backend/views/partials/marketplace-common-styles.ejs` | 334 | `#222222` |
| `backend/views/partials/marketplace-common-styles.ejs` | 345 | `#222222` |
| `backend/views/partials/marketplace-common-styles.ejs` | 350 | `#717171` |
| `backend/views/partials/marketplace-common-styles.ejs` | 399 | `#EBEBEB` |
| `backend/views/partials/marketplace-common-styles.ejs` | 403 | `#EBEBEB` |
| `backend/views/partials/marketplace-common-styles.ejs` | 411 | `#EBEBEB` |
| `backend/views/partials/marketplace-common-styles.ejs` | 500 | `#FFFFFF` |
| `backend/views/partials/marketplace-common-styles.ejs` | 503 | `#EBEBEB` |
| `backend/views/partials/marketplace-common-styles.ejs` | 507 | `#F7F7F7` |
| `backend/views/partials/marketplace-common-styles.ejs` | 510 | `#F7F7F7` |
| `backend/views/partials/marketplace-common-styles.ejs` | 510 | `#EBEBEB` |
| `backend/views/partials/marketplace-common-styles.ejs` | 510 | `#B0B0B0` |
| `backend/views/partials/marketplace-common-styles.ejs` | 511 | `#222222` |
| `backend/views/partials/marketplace-common-styles.ejs` | 511 | `#EBEBEB` |
| `backend/views/partials/marketplace-common-styles.ejs` | 514 | `#222222` |
| `backend/views/partials/marketplace-common-styles.ejs` | 515 | `#717171` |
| `backend/views/partials/marketplace-common-styles.ejs` | 516 | `#222222` |
| `backend/views/partials/marketplace-common-styles.ejs` | 517 | `#717171` |
| `backend/views/partials/marketplace-common-styles.ejs` | 518 | `#222222` |
| `backend/views/partials/marketplace-common-styles.ejs` | 520 | `#717171` |
| `backend/views/partials/marketplace-common-styles.ejs` | 521 | `#222222` |
| `backend/views/partials/marketplace-common-styles.ejs` | 525 | `#222222` |
| `backend/views/partials/marketplace-common-styles.ejs` | 533 | `#222222` |
| `backend/views/partials/marketplace-common-styles.ejs` | 541 | `#717171` |
| `backend/views/partials/marketplace-common-styles.ejs` | 547 | `#FFFFFF` |
| `backend/views/partials/marketplace-common-styles.ejs` | 547 | `#DDDDDD` |
| `backend/views/partials/marketplace-common-styles.ejs` | 547 | `#222222` |
| `backend/views/partials/marketplace-common-styles.ejs` | 549 | `#222222` |
| `backend/views/partials/marketplace-common-styles.ejs` | 550 | `#DDDDDD` |
| `backend/views/partials/marketplace-theme-color.ejs` | 2 | `#FFFFFF` |
| `backend/views/propiedad.ejs` | 63 | `#fff` |
| `backend/views/propiedad.ejs` | 64 | `#222` |
| `backend/views/propiedad.ejs` | 75 | `#fff` |

---

## Vistas con más problemas

| Archivo | Problemas |
|---------|----------|
| `backend/views/partials/marketplace-common-styles.ejs` | 71 |
| `backend/views/marketplace/index.ejs` | 9 |
| `backend/views/marketplace/google-hotels-catalog.ejs` | 5 |
| `backend/views/propiedad.ejs` | 4 |
| `frontend/src/views/components/gestionarReservas/reservas.modals.view.js` | 2 |
| `frontend/src/views/comunicaciones.js` | 1 |
| `frontend/src/views/normasAlojamiento.js` | 1 |
| `backend/views/partials/marketplace-brand-logo.ejs` | 1 |
| `backend/views/partials/marketplace-theme-color.ejs` | 1 |

---
*Generado por scripts/tooling/audit-ui.js*
