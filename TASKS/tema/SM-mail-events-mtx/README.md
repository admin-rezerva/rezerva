# SM-mail-events-mtx — Correos transaccionales (plantillas, notificaciones, matriz)

**Estado:** [`tablero.md`](../../tablero.md).

**Alcance:** motor de correo (disparadores, plantillas, asuntos, registro en comunicaciones, reintentos, jobs) y, en roadmap, ampliación de **nuevos eventos / matriz** (backlog §1.2 / ítem relacionado).

**Plan activo (revisión flujo y formato):** [`plan-accion-correos-flujo-plantillas.md`](plan-accion-correos-flujo-plantillas.md).

**HTML en plantillas:** prefijo `[[HTML_EMAIL]]` al inicio del cuerpo (o `email_config.cuerpoEsHtml: true`) para no escapar etiquetas; motor sigue sustituyendo `[ETIQUETAS]`. IA: `backend/services/ai/prompts/plantillasIa.js`.

**Presets listos para pegar (tablas + inline CSS, etiquetas motor):** [`plantillas-preset-html-gemini-react-port.md`](plantillas-preset-html-gemini-react-port.md) — portación desde diseño tipo React/Tailwind (no usar JSX en correo).

**Puntos de entrada en código:** `transactionalEmailService.js`, `transactionalEmailHooks.js`, `transactionalEmailEventMatrix.js`, `emailService.js`, `plantillasService.js`, `publicWebsiteService.js` (`crearReservaPublica`), `comunicacionesRetryService.js`, `scheduledTransactionalEmails.js`.
