---
tema: SM-rebrand-dominio
título: Rebrand dominio (suitemanagers.com → rezerva.cl) + limpieza Firebase
estado: En curso (Cursor)
última nota: 2026-05-07 — `publicAiHttpController.js` (ex suitemanager API) + MCP `rezerva-mcp-server`; **pendiente:** ops DNS Fase 1/3, Fase 4 PG — ver `pendientes-y-registro.md`
---

# SM-rebrand-dominio — Rebrand de Dominio y Limpieza de Infraestructura

## Contexto

El dominio `suitemanagers.com` tiene un problema de confusión en buscadores con `suitemanager.com`
(sitio de venta de propiedades, sin relación). La confusión afecta SEO y posicionamiento de marca.

**Dominio candidato:** `rezerva.cl` (disponible; `rezerva.com` no disponible aunque no está a la venta).

## Documentos del tema

| Archivo | Contenido |
|---------|-----------|
| `plan-accion-rebrand.md` | Plan maestro: fases 0–5, Firebase, GitHub, DoD |
| **`pendientes-y-registro.md`** | **Qué no se hizo / quedó pendiente / intencional** — leer antes de dar por cerrado el tema |
| *(sección abajo)* **Firebase / `serviceAccountKey.json`** | Project ID legacy `suite-manager-app`: qué es y cuándo migrar proyecto |

## Pendientes (resumen)

- **Infra:** Fase 1 DNS/Render y Fase 3 repo/carpeta/webhook — detalle en `pendientes-y-registro.md` §1.
- **Docs secundarios:** varios `TASKS/tema/*` históricos con `suitemanagers.com` — listado en `pendientes-y-registro.md` §3 (no bloquean entrada `LEER-PRIMERO`).
- **Código:** compatibilidad dominios viejos en `config.routes.js`; handlers IA pública en `backend/services/publicAiHttpController.js`; test obsoleto `verify-subdomain-logic.js` — §2 en `pendientes-y-registro.md`.

## Firebase / cuenta de servicio (`serviceAccountKey.json`)

El archivo local (ignorado por Git: `backend/serviceAccountKey.json`) es la **clave JSON de cuenta de servicio** del proyecto Google Cloud / Firebase cuyo **project_id** sigue siendo el histórico `suite-manager-app`.

- **`project_id` y `client_email` (...@suite-manager-app.iam.gserviceaccount.com)** son identificadores **internos de infraestructura**. No salen en sitios públicos, correos transaccionales ni panel para el cliente final.
- **Renombrar solo el nombre “visible” del proyecto** en la consola Google no cambia el `project_id`; ese ID **no se puede editar** como si fuera un alias.
- **Qué hacer en la práctica**
  - **Mantener el proyecto actual** (lo habitual): Rezerva opera sobre dominio y producto; el nombre técnico del proyecto Cloud puede quedarse como legado sin afectar el rebrand.
  - **Migrar a un proyecto nuevo** (`rezerva-…`) solo si se decide explícitamente: implica nuevo Firebase, migración de Firestore/Auth/Storage/reglas, nuevas claves en Render (`/etc/secrets/serviceAccountKey.json` o equivalente), pruebas largas — es una iniciativa aparte, no un cambio de texto en el JSON.

**Seguridad:** no versionar el JSON; en Render usar **Secret File** (ya documentado en ops). Si en algún momento ese archivo llegó a un repo o chat público, **rotar la clave** en Google Cloud y actualizar el secreto.

## Estado

Ver `TASKS/tablero.md` fila `SM-rebrand-dominio`.
