# SM-legal-checkout — §4 legal / checkout (retomar)

**Estado:** [`tablero.md`](../../tablero.md).  
**Backlog:** `backlog-producto-pendientes.md` §4.1 pendiente al retomar.

## Notas de implementación

- 2026-05-11 — La página pública `GET /terminos-y-condiciones` debe servir como documento combinado para cada empresa: términos generales de reserva + condiciones específicas del cliente (`websiteSettings.terminosCondiciones.condicionesEspecificas`). Los enlaces publicados desde correo, header, footer y checkout deben preferir el subdominio de plataforma `https://{subdominio}.rezerva.cl/terminos-y-condiciones`, aunque la empresa tenga dominio propio configurado.
