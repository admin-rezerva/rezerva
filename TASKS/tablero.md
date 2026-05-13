# Tablero de temas (vista en Markdown)

Vista operativa por **iniciativa**: cada fila es una **tarjeta** y un **`TASKS/tema/<id>/`**. El roadmap formal sigue en **`backlog-producto-pendientes.md`**; este archivo es estado **operativo** y handoff entre sesiones.

**IDs:** la columna **ID** es el nombre de carpeta bajo **`TASKS/tema/`** (sin espacios). Dentro de cada carpeta: **archivos sueltos** del tema (`qa-`, `audit-`, `checklist-`, etc.); sin subcarpetas obligatorias — **`TASKS/tema/README.md`**.

**Agentes:** al **iniciar**, **durante** y **cerrar** trabajo en un tema, mantener **esta tabla** actualizada junto con la carpeta **`tema/<id>/`** (regla **`.cursor/rules/50-tasks-tablero-y-temas.mdc`**, **`LEER-PRIMERO.md`** § *Flujo al iniciar o retomar*).

**Flujo:** contexto (`LEER-PRIMERO`) → **tema** (fila + `TASKS/tema/<id>/`) → **qué hacer** (usuario + docs del tema). Tras **crear / modificar / eliminar** algo relevante al tema: **actualizar la fila** (fecha en *Última nota*, estado en *Columna*).

**Humano (Cursor):** renombrar la **pestaña del chat** con el **nombre del tema** (columna *Tema* o ID `SM-*`) para coincidir con el tablero.

---

## Columnas (estados)

| Columna | Significado |
|---------|-------------|
| **Backlog** | No iniciado o pausado sin bloqueo activo. |
| **En curso (Cursor)** | Trabajo activo en Cursor (nombrar el chat igual que el título del tema). |
| **En curso (Claude u otro)** | Misma iniciativa fuera de Cursor. |
| **Bloqueado** | Falta decisión, dato externo, release o coordinación. |
| **Listo** | Cerrado en código/doc o merge acordado. |

---

## Tablero (IDs ↔ carpetas)

*Filas alineadas a **`backlog-producto-pendientes.md`**. Carpeta = `TASKS/tema/<ID>`.*

| ID | Tema (título) | Columna | Rama | Carpeta tema | Herramienta | Última nota (fecha) | Enlaces |
|----|---------------|---------|------|--------------|-------------|---------------------|---------|
| `SM-blog-publico` | Blog SSR por empresa (sugerencias datos + IA + panel) | Listo | — | `tema/SM-blog-publico` | Cursor | 2026-05-07 — README URL ejemplo `{subdominio}.rezerva.cl/blog` (rebrand); 2026-05-06 variables `BLOG_INTERNAL_*` / rutas | `tema/SM-blog-publico/README.md` |
| `SM-npm-audit-zero` | npm audit → 0 (build Render / dependencias backend) | Listo | — | `tema/SM-npm-audit-zero` | Cursor | 2026-05-06 — **Cerrado:** `backend/` `npm audit` **0** (eliminado `xlsx`→exceljs+csv-parse; quitado `@anthropic-ai/sdk` sin uso; subidas firebase-admin 13, node-ical 0.26, fast-xml 5.7; `overrides.http-proxy-agent@7` para cadena teeny-request); raíz sigue 0; `test:ci` OK | `tema/SM-npm-audit-zero/README.md`, `plan-accion-npm-audit-zero.md` |
| `SM-pagespeed-lighthouse-max` | Core Web Vitals / Lighthouse máximo (SSR tenant + plataforma rezerva.cl) | Listo | — | `tema/SM-pagespeed-lighthouse-max` | Cursor/Claude | 2026-05-08 — **Cerrado sprint**: (1) `property-card.ejs` srcset `_sm.webp 400w / _thumb.webp 560w` + sizes DPR-cap móvil → celulares descargan 400px en lugar de 560px; (2) pipeline upload/repair genera `_sm.webp` (400px/q58) para todas las empresas sin columna BD nueva; (3) a11y footer: link Rezerva `text-white underline` (WCAG 1.4.1); (4) repair generó 232 `_sm.webp` + 7 cards + hero recomprimido para orillasdelcoilaco. Push `91720a6`. Pendiente menor: logo footer (200x184 mostrado a ~43px) | `repair-web-images.js`, `webImagesRepairHelpers.js`, `webImagesRepairService.js`, `galeriaService.js`, `property-card.ejs`, `footer.ejs` |
| `SM-rel-v100` | Cierre release v1.0.0 (smoke, `test:ci`, tag) | Backlog | — | `tema/SM-rel-v100` | — | 2026-05-10 — **CI smoke GitHub Actions en verde** en `main` (`npm run test:ci` vía workflow corregido); prerequisito §2.3 del plan cubierto para re-tag cuando priorice el equipo. 2026-05-05 — Foco §5.x E | `tema/SM-rel-v100/plan-release-1.0.0.md`, `.github/workflows/ci-smoke.yml`, backlog §5.x E |
| `SM-ghc-onboarding` | Google Hotel Center — partner directo (deploy / onboarding) | Listo | — | `tema/SM-ghc-onboarding` | — | 2026-05-03 — **Cerrado comercialmente** (Google no nuevos partners directos). Código + checklists en **standby**; **no tocar** módulos partner (`googleHotels*`, rutas `/feeds/google` plataforma, bloque feeds globales en Canales IA) salvo bug crítico o instrucción explícita. Ver `venta-ia.md` §7.0 | `tema/SM-ghc-onboarding/README.md`, `google-hotels-partner-deploy-checklist.md`, `checklist-onboarding-google-hotel-center.md`, `tema/SM-venta-ia/venta-ia.md` §7.0 |
| `SM-venta-ia` | Canales venta / venta por IA (OpenAPI, MCP, feeds) | En curso (Cursor) | — | `tema/SM-venta-ia` | Cursor | 2026-05-10 — **Gemini (runtime):** default **`gemini-2.5-flash`** en `backend/config/aiConfig.js`, `geminiProvider.js`, `backend/.env.example`, script legacy `test_debug_robust.js`. **OpenAPI / dominio:** `servers.url` → **`https://rezerva.cl`** en `openapi-gemini.yaml` + `openapi-chatgpt.yaml`; `LEER-PRIMERO.md` tabla referencias API/OpenAPI; `gemini-smoke-instrucciones.md` (contrato 1.4.8, BASE_URL). Tras deploy: reimportar schema en Gemini/ChatGPT. | `tema/SM-venta-ia/venta-ia.md`, `backend/openapi/openapi-gemini.yaml`, `LEER-PRIMERO.md`, `tema/SM-venta-ia/gemini-smoke-instrucciones.md`, `tema/SM-venta-ia/qa-y-seguimiento-prelaunch-canales.md`, regla `45-canales-venta-solo-cursor.mdc` |
| `SM-beds24` | Integración Beds24 (CM → Google + API + conector SM) | Backlog | — | `tema/SM-beds24` | Ops + Cursor | 2026-05-03 — Plan maestro + guía operativa; fase código cuando priorice backlog | `tema/SM-beds24/plan-accion-beds24.md`, `tema/SM-beds24/beds24-integracion-inicio.md`, `tema/SM-gh-strategy-cm/google-hotels-estrategia-post-partner-google.md`, backlog §5.3 |
| `SM-gh-strategy-cm` | Estrategia Google post-partner (channel manager) | Backlog | — | `tema/SM-gh-strategy-cm` | — | 2026-05-03 — Contexto comercial + inventario; ejecución en **`SM-beds24`** | `tema/SM-gh-strategy-cm/google-hotels-estrategia-post-partner-google.md`, `tema/SM-beds24/plan-accion-beds24.md`, backlog §5.3 |
| `SM-heatmap-qa` | Mapa de calor / restricciones (§5.x A) | Listo | — | `tema/SM-heatmap-qa` | — | Criterio técnico cerrado; QA manual opcional | `tema/SM-heatmap-qa/qa-heatmap-restricciones-e2e.md` §12 |
| `SM-comparador-ota` | Comparador OTA — MVP (§5.x C) | Listo | — | `tema/SM-comparador-ota` | — | 2026-05-05 — Cierre DoD MVP validado; QA contractual cubierto por `test-comparador-ota-service.js` en `npm run test:ci` | `tema/SM-comparador-ota/README.md`, `tema/SM-venta-ia/venta-ia.md` §5.2, backlog §5.x C |
| `SM-mail-events-mtx` | Correos transaccionales — flujo, plantillas, notificaciones y matriz de eventos | En curso (Cursor) | — | `tema/SM-mail-events-mtx` | Cursor | 2026-05-13 — `obtenerBaseUrlPublica` prioriza origen `{subdominio}.rezerva.cl` (buildPlatformTenantOrigin) antes que dominio custom en websiteSettings, para enlaces de confirmación/términos/reseña en correo. | `plantillas.modals.js`, `plantillas.emailConfig.modal.js`, `routes/plantillas.js`, `plantillasService.js`, `plantillasEmailTemplates.js`, `plantillasEtiquetasCatalog.js`, `transactionalEmailService.js`, `publicWebsiteService.js`, `publicReservationStatusService.js`, `views/confirmacion.ejs`, `tema/SM-mail-events-mtx/modelo-correo-tres-capas-ia.md` |
| `SM-legal-checkout` | §4 legal / checkout — retomar | En curso (Cursor) | — | `tema/SM-legal-checkout` | Cursor | 2026-05-11 — EN CURSO: términos públicos combinan marco general + condiciones específicas del cliente; enlaces header/footer/checkout prefieren `https://{subdominio}.rezerva.cl/terminos-y-condiciones`. Pendiente datos reales proveedor/hash de aceptación para contratación Rezerva. | backlog §4.1, `tema/SM-legal-checkout/README.md`, `frontend/src/views/terminosCondiciones.js`, `frontend/src/views/components/terminosCondiciones/contratacionRezerva.js`, `backend/views/terminos-condiciones.ejs` |
| `SM-ids-vs-names` | Identificadores vs nombres (PG + SPA) | En curso (Cursor) | — | `tema/SM-ids-vs-names` | Cursor | 2026-05-11 — ID visible de reserva: códigos cortos `canal-ddMMyyyy-###`; SSR asociado desde Canales y hotfix disponibilidad usa `precio_base` si `precios_canales` aún no tiene clave SSR. OTA/reportes conservan ID externo. | `tema/SM-ids-vs-names/audit-identificadores-vs-nombres-ui.md`, `backend/services/reservaCodigoService.js`, `backend/services/canalesService.js` |
| `SM-spa-menu` | Plan reorganización menú SPA | Listo | — | `tema/SM-spa-menu` | — | 2026-05-05 — Referencia agregada a extensión SEO por rol en tema `SM-seo-ssr-buscadores` | `tema/SM-spa-menu/plan-reorganizacion-menu-spa.md`, `tema/SM-seo-ssr-buscadores/plan-accion-seo-ssr.md` |
| `SM-spa-mobile-ui` | SPA responsive + estándar tabla PC (listados) | En curso (Cursor) | — | `tema/SM-spa-mobile-ui` | Cursor | 2026-05-11 — **Estándar formal:** `.cursor/rules/20-frontend-design-system.mdc` **§6.2** (tabla PC listados) + §6.1 móvil; punteros en `LEER-PRIMERO.md`, `CLAUDE.md`, README tema. Ref. código: `gestionarEsperaDisponibilidad.js`. **Caché panel:** `adminBootstrap.js?v=` + propagación a CSS/router/vistas. 2026-05-10 — Registrar pago / Autorizar Google. | `20-frontend-design-system.mdc` §6.1–§6.2, `gestionarEsperaDisponibilidad.js`, `tema/SM-spa-mobile-ui/README.md` |
| `SM-ssr-sitio-publico` | SSR / sitio público (arquitectura, empresa, wizard contenido) | Listo | — | `tema/SM-ssr-sitio-publico` | — | 2026-05-06 — **Eliminado** widget Concierge IA SSR (`chat-widget`, `public/js/chat.js`), montaje `/api/concierge/*` y servicios solo usados por ese chat (`intention`, `filters`, `photos`, `router` en `services/ai`). Sin tablas de chat en BD. Manifiesto empresa → rutas OpenAPI `/api/disponibilidad` y `/api/alojamientos/imagenes`. Galería ficha alojamiento: orden por espacios del inventario, hero = portada (`cardImage`), comunes empresa al final. | `index.js`, `footer.ejs`, `enterprise-manifest-template.js`, `propiedad.ejs`, `website.property.page.js` |
| `SM-seo-ssr-buscadores` | SEO en buscadores (rezerva.cl + SSR por empresa) | Listo | — | `tema/SM-seo-ssr-buscadores` | — | 2026-05-07 — README: dominio plataforma canónico `rezerva.cl`, menú «Plataforma Rezerva»; 2026-05-05 GSC archivo + rutas verificación | `tema/SM-seo-ssr-buscadores/README.md`, `plan-accion-seo-ssr.md`, `audit-seo-ssr-baseline.md` |
| `SM-fotos-galeria` | Fotos, galería, IMG-001, baños | Listo | — | `tema/SM-fotos-galeria` | Cursor | 2026-05-06 — Gate previo a SEO: `photoSeoGateService` (plan fotos vs `websiteData.images`, purga estricta (datos mínimos SSR + confianza del análisis ya persistido; umbral fijo en código, sin env ni config por empresa)), `websiteData.photoSeoBlocked` + aviso en tarjeta lista; luego `runWebImagesRepair`. | `photoSeoGateService.js`, `webImagesRepairApi.js`, `websiteAlojamientos.js`, `websiteAlojamientos.selector.js` |
| `SM-dev-historial` | Historial de problemas / acciones dev | Listo | — | `tema/SM-dev-historial` | Cursor | 2026-05-10 — **CI / repo / local=Actions:** `backend/db/postgres.js` carga `pg` solo si `IS_POSTGRES` (evita `MODULE_NOT_FOUND` en smoke sin `DATABASE_URL`). Raíz: **deja de versionarse** `node_modules/` (~1300 archivos). `.github/workflows/ci-smoke.yml`: `npm ci` raíz + `backend` con **`npm install --omit=dev`** (evita fallo instantáneo de `npm ci` / `npm ci --omit=dev` en ubuntu; smoke no usa `firebase-tools`/Tailwind). `SHARED_CONTEXT.md` §2.1 secuencia de deps. **Resultado:** workflow CI smoke **success** en `main` (~`60fe3e0`). Menos correos fallo Actions. | `tema/SM-dev-historial/plan-accion-problemas.md`, `.github/workflows/ci-smoke.yml`, `backend/db/postgres.js`, `SHARED_CONTEXT.md` |
| `SM-clientes-crm` | Clientes sin reserva / CRM | Listo | — | `tema/SM-clientes-crm` | — | 2026-05-05 | `tema/SM-clientes-crm/plan-accion-clientes-sin-reserva.md` |
| `SM-recontacto-sin-disponibilidad` | Recontacto automático a clientes sin disponibilidad | Listo | — | `tema/SM-recontacto-sin-disponibilidad` | Claude Code | 2026-05-05 — Migración prod (UUID→TEXT fix) + deploy Render + OpenAPI 1.4.8 + smoke A✅ B✅ C✅. Fix bonus: `canalesService` faltaban `IA_VENTA_CANAL_ORIGEN` y `resolverCanalIaVentaEnLista`. ChatGPT reimport pendiente manual. | `tema/SM-recontacto-sin-disponibilidad/plan-cierre-deploy-ops.md`, `README.md`, `plan-accion-recontacto-sin-disponibilidad.md` |
| `SM-propiedades` | Gestión de propiedades (plan) | Listo | — | `tema/SM-propiedades` | — | 2026-05-05 | `tema/SM-propiedades/plan-gestion-propiedades.md` |
| `SM-ia-arquitectura` | Arquitectura IA / Gemma | Listo | — | `tema/SM-ia-arquitectura` | — | 2026-05-10 — Alineación operativa: proveedor Gemini por defecto **2.5-flash** (ver `SM-venta-ia` / `aiConfig.js`). 2026-05-05 — docs Gemma / acuerdo | `tema/SM-ia-arquitectura/acuerdo-arquitectura-ia.md`, `plan-gemma4-omnipresente.md`, `backend/config/aiConfig.js` |
| `SM-auditoria-calidad` | Auditorías UI/complexity, performance, solo-ui | Listo | — | `tema/SM-auditoria-calidad` | — | 2026-05-05 — Salida de `audit-ui.js` / `audit-complexity.js` aquí | `tema/SM-auditoria-calidad/audit-report.md`, `complexity-report.md`, `plan-auditoria-frontend.md` |
| `SM-onboarding-ux` | Onboarding en video (plan) | Listo | — | `tema/SM-onboarding-ux` | — | 2026-05-05 | `tema/SM-onboarding-ux/plan-video-onboarding.md` |
| `SM-migracion-postgres` | Plan migración PostgreSQL | Backlog | — | `tema/SM-migracion-postgres` | Claude / integrador | Estado en `SHARED_CONTEXT` § DB | `tema/SM-migracion-postgres/migration-plan-postgres.md` |
| `SM-rebrand-dominio` | Rebrand dominio (suitemanagers.com → rezerva.cl) + limpieza Firebase | En curso (Cursor) | — | `tema/SM-rebrand-dominio` | Cursor | 2026-05-11 — **Render caído:** `Router.use() requires a middleware function but got a Object` — `authGoogle` devuelve `{ publicRouter, privateRouter, handleCallback }`; en `main` desplegado faltaba montar `publicRouter`/`privateRouter` (no el objeto entero). Fix en `backend/index.js` (working copy) + log `error.stack` en catch de arranque. **Pendiente:** commit/push integrador y redeploy. 2026-05-09 — OAuth callback/legacy + privateRouter. | `tema/SM-rebrand-dominio/runbook-migracion-resend-administrador-rezerva.md`, `backend/index.js`, `backend/routes/authGoogle.js`, `README.md` |
| `SM-operacion-agentes` | Pending/completed agentes, DoD, alertas créditos | Listo | — | `tema/SM-operacion-agentes` | CI + OpenClaw | 2026-05-10 — CI smoke `main` estable → menos ruido en correos de fallo Actions (avisos GitHub usuario/org siguen configurables). 2026-05-05 — Workflows `notify-*` apuntan aquí | `tema/SM-operacion-agentes/pending.md`, `tema/SM-operacion-agentes/completed.md`, `tema/SM-operacion-agentes/definition-of-done.md`, `tema/SM-operacion-agentes/alertas-creditos.md`, `.github/workflows/ci-smoke.yml` |

**Release:** §5.x **E** — **A** y **C** listos; **B** (partner Google **directo**) cerrado en alcance comercial 2026-05-03 (standby); avance Google vía **`SM-beds24`**. Revisar criterio de salida en backlog §5.x **E**.

---

## Plantilla — nueva fila + carpeta

1. Elegir **`SM-<slug>`** único (ver `tema/README.md`).
2. Añadir fila arriba.
3. Crear **`TASKS/tema/<id>/README.md`** y subcarpetas (`test/`, `debug/`, …) según necesidad.

```text
| SM-mi-slug | Título corto | Backlog | rama-opcional | tema/SM-mi-slug | Cursor | YYYY-MM-DD — nota | enlaces |
```

---

## De dónde salen los temas

Derivar filas de **`backlog-producto-pendientes.md`**. En **`TASKS/`** (raíz) permanecen el **`backlog`**, **`tablero.md`**, los archivos de **coordinación** y la entrada **`LEER-PRIMERO.md`** (raíz del repo). El **roadmap del carril venta por IA** está en **`tema/SM-venta-ia/venta-ia.md`** (tabla **`SM-venta-ia`**); **`TASKS/venta-ia.md`** es un puntero opcional para enlaces antiguos. **`tema/<id>/`** acumula lo **específico de cada iniciativa**.

