# Runbook — Correo transaccional (Nodemailer + Gmail SMTP)

**Actualización 2026-05-09:** el backend **ya no usa Resend**. Envío único vía **Nodemailer** (`smtp.gmail.com:587`, `secure: false`).

---

## Variables en Render / `backend/.env`

| Variable | Uso |
|----------|-----|
| `EMAIL_USER` | Cuenta Google que autentica SMTP (p. ej. `administrador@rezerva.cl`) |
| `EMAIL_PASS` | Contraseña de aplicación de 16 caracteres |
| `EMAIL_FROM` | Dirección en el encabezado From (p. ej. `notificaciones@rezerva.cl`); debe estar permitida como “enviar como” si difiere del usuario SMTP |

**No usar:** `RESEND_API_KEY` (eliminar del entorno si quedó heredada).

**Fijas en código** (`backend/services/emailService.js`):

- Nombre remitente: `Rezerva Notificaciones`
- Reply-To: `soporte@rezerva.cl`

---

## Validación

1. Tras desplegar, crear una reserva de prueba en el sitio público.
2. Revisar logs: no debe aparecer Resend; éxito con `proveedor: 'smtp'`.
3. Comprobar cabeceras del correo recibido.

---

## Multi-tenant

El contacto del tenant sigue en plantillas y datos de empresa; **no** se usa en Reply-To (buzón plataforma).
