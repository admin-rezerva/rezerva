---
name: staymanager-executor
description: Ejecuta tareas de desarrollo en StayManager respetando separacion SPA/SSR, aislamiento multiempresa estricto y modo dual PostgreSQL/Firestore. Usar en cualquier cambio de backend, frontend, SSR, migraciones o refactors.
---

# StayManager Executor

## Objetivo

Aplicar cambios de forma segura y consistente con la arquitectura del proyecto.

## Invariantes del dominio (no negociables)

1. `SPA` y `SSR` son mundos separados.
2. Las empresas son totalmente independientes entre si.
3. La unica entidad compartida global entre empresas son clientes.
4. Nunca romper aislamiento multi-tenant.
5. Nunca sobrescribir `valores.valorHuesped`.

## Flujo operativo

1. Leer `LEER-PRIMERO.md` (raíz): **contexto** (orden de lectura) → **tema** (`TASKS/tablero.md` + `TASKS/tema/<id>/`) → **qué hacer** (usuario + docs del tema). Como mínimo `SHARED_CONTEXT.md` y, si aplica, `CLAUDE.md`.
2. **Tablero:** al trabajar un tema, mantener **`TASKS/tablero.md`** al día (columna *En curso*, *Última nota* con fecha tras cambios relevantes). Ver `LEER-PRIMERO.md` § *Flujo al iniciar o retomar* y `.cursor/rules/50-tasks-tablero-y-temas.mdc`.
3. **Antes de crear cualquier archivo nuevo:** ubicación canónica según tabla en `LEER-PRIMERO.md` (fila *Ubicación de archivos*), `CLAUDE.md` (Flujo de trabajo → *Dónde crear archivos nuevos*) y regla `.cursor/rules/07-artifact-placement-repo-layout.mdc`. No crear artefactos en la raíz del repo ni carpetas improvisadas.
4. Clasificar el cambio: `SPA`, `SSR`, `backend core`, `migracion`, o mixto.
5. Implementar con alcance minimo y alta cohesion.
6. Validar reglas de tenant y modo dual (`pool` vs fallback).
7. Vistas con **formulario multipaso** en el panel: seguir **§6.3** (`.cursor/rules/20-frontend-design-system.mdc`) — clases `spa-form-page`, `spa-form-section`, `spa-form-summary-*` en `frontend/public/css/source.css`; no dejar un único bloque gris que mezcle pasos y resumen.
8. **Ejecutar** en esta sesión (terminal del agente) la verificación que corresponda al alcance; no basta con listar comandos al usuario:
   - `node scripts/tooling/audit-complexity-monitored.js` si hubo lógica/servicios/rutas/scripts de app (incluye **`backend/scripts/test-repo-root-scripts-paths-doc.js`**: rutas `scripts/tooling/*.js` y `scripts/legacy/*.js` en `.md` / `.mdc`).
   - `node scripts/tooling/audit-ui-monitored.js` si hubo frontend/UI/markup/CSS.
   - `npm run build:css` en `backend/` si cambió **`frontend/public/css/source.css`**, tokens Tailwind o clases nuevas en vistas.
   - Si el bloque mezcla ámbitos: **todos** los anteriores que apliquen. Solo complejidad corre el chequeo de rutas en docs; si solo tocaste UI y quieres ese chequeo: `node backend/scripts/test-repo-root-scripts-paths-doc.js`.
9. Entregar resultado con:
   - cambios realizados
   - riesgos residuales
   - pruebas ejecutadas o pendientes

## Checklist de cierre

- [ ] `TASKS/tablero.md` actualizado si hubo cambios relevantes al tema (fecha + nota).
- [ ] Archivos nuevos solo en rutas canónicas (ningún dump en raíz ni `TASKS/` suelto sin `tema/<id>/`).
- [ ] Sin mezcla indebida SPA/SSR.
- [ ] Querys con filtro de empresa.
- [ ] Mapeo `snake_case -> camelCase` aplicado.
- [ ] Sin secretos ni hardcodeo sensible.
- [ ] Auditorías y build CSS **ejecutados** según alcance (paso 8), con resultado indicado en la respuesta.
