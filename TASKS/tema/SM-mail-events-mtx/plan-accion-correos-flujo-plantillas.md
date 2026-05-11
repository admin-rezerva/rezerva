# Plan de acción — Correos transaccionales (flujo, formato, notificaciones y plantillas)

## 1. Problema / contexto

Revisar de punta a punta **cómo se generan y envían** los correos ligados a notificaciones y plantillas: disparadores, HTML/texto, asuntos (i18n / fallback), registro en `comunicaciones`, reintentos, jobs programados y coherencia con la matriz de eventos. El backlog sigue enlazando la ampliación de eventos (§1.2 / ítem matriz); esta sesión prioriza **mapa del sistema actual** y criterios de formato antes de cambios de producto.

**Referencias:** fila `SM-mail-events-mtx` en `TASKS/tablero.md`, `backlog-producto-pendientes.md` (motor correo / matriz si aplica).

## 2. Inventario inicial (código)

| Ámbito | Archivos / rutas (revisar) |
|--------|----------------------------|
| Transporte / envío | `backend/services/emailService.js` |
| Motor transaccional | `backend/services/transactionalEmailService.js` |
| Disparadores desde dominio | `backend/services/transactionalEmailHooks.js` |
| Matriz eventos ↔ plantillas | `backend/services/transactionalEmailEventMatrix.js` |
| Asuntos fallback / i18n | `backend/services/transactionalEmailFallbackSubjects.js` |
| Reintentos / cola comunicaciones | `backend/services/comunicacionesRetryService.js` |
| Jobs programados | `backend/jobs/scheduledTransactionalEmails.js` |
| Otros carriles correo | `backend/services/publicContactoService.js`, `backend/services/publicWebsiteService.js`, `backend/services/gestionPropuestas.email.js`, `backend/services/chatgptSalesCoreEmailService.js`, `backend/services/emailPdfEnlaceHtml.js` |
| Migración / config asuntos | `backend/db/migrations/plantillas-asunto-email-config.sql` |
| Scripts verificación | `backend/scripts/test-transactional-fallback-subjects.js`, `backend/scripts/test-confirmacion-reserva-comunicaciones.js` |

## 3. Preguntas guía (revisión)

- ¿Qué **disparadores** existen y en qué capa se invocan (hooks, API pública, jobs)?
- ¿Dónde vive el **HTML** (plantillas BD, strings en servicio, EJS, helpers)?
- ¿**Asunto** y cuerpo están alineados por evento con `EVENTO_POR_DISPARADOR` y filtros de panel?
- ¿Multi-tenant y **modo dual** (PG/Firestore) se respetan en registro y envío?

## 4. Pasos de implementación (post-auditoría)

- [ ] Documentar hallazgos en `audit-correos-flujo-formato.md` (este tema) o ampliar este plan.
- [ ] Proponer cambios mínimos solo tras cerrar mapa y acuerdo con backlog.

## 5. Bitácora de planificación (pre-código y durante)

- 2026-05-10 — Apertura del tema en tablero (**En curso Cursor**): objetivo revisar flujo completo y formato de correos (notificaciones + plantillas); inventario de servicios en §2.
- 2026-05-10 — **Implementación:** HTML real en plantillas vía prefijo `[[HTML_EMAIL]]` o `email_config.cuerpoEsHtml`; prompt IA (`plantillasIa.js`) genera layouts tipo confirmación huésped vs alerta admin; etiquetas nuevas (`[CLIENTE_EMAIL]`, `[LINK_GESTION_RESERVA]`, cupón, canal); `crearReservaPublica` envía copia admin con disparador **`notificacion_interna`** (antes reutilizaba `reserva_confirmada`); notificación interna no queda bloqueada por interruptor de correos al huésped. Enlace panel usa `PANEL_PUBLIC_ORIGIN` + `/gestionar-reservas?reservaId=`. **Pendiente humano:** en Panel → Plantillas, asignar disparadores y **regenerar con IA** o pegar HTML las plantillas “Confirmación” y “Copia interna / administrador”.
