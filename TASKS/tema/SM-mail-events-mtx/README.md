# SM-mail-events-mtx — Correos transaccionales (plantillas, notificaciones, matriz)

**Estado:** [`tablero.md`](../../tablero.md).

**Alcance:** motor de correo (disparadores, plantillas, asuntos, registro en comunicaciones, reintentos, jobs) y, en roadmap, ampliación de **nuevos eventos / matriz** (backlog §1.2 / ítem relacionado).

**Plan activo (revisión flujo y formato):** [`plan-accion-correos-flujo-plantillas.md`](plan-accion-correos-flujo-plantillas.md).

**Abono / depósito (canales, textos, orden en UI — sin código):** [`producto-abono-deposito-canales-y-ui.md`](producto-abono-deposito-canales-y-ui.md).

**HTML en plantillas:** prefijo `[[HTML_EMAIL]]` al inicio del cuerpo (o `email_config.cuerpoEsHtml: true`) para no escapar etiquetas; motor sigue sustituyendo `[ETIQUETAS]`. IA: `backend/services/ai/prompts/plantillasIa.js`.

**Presets listos para pegar (tablas + inline CSS, etiquetas motor):** [`plantillas-preset-html-gemini-react-port.md`](plantillas-preset-html-gemini-react-port.md) — portación desde diseño tipo React/Tailwind (no usar JSX en correo).

**Modelo IA tres capas (cabecera estándar / tarjetas por empresa / pie estándar):** [`modelo-correo-tres-capas-ia.md`](modelo-correo-tres-capas-ia.md).

**Puntos de entrada en código:** `transactionalEmailService.js`, `transactionalEmailHooks.js`, `transactionalEmailEventMatrix.js`, `emailService.js`, `plantillasService.js`, `publicWebsiteService.js` (`crearReservaPublica`), `comunicacionesRetryService.js`, `scheduledTransactionalEmails.js`.
