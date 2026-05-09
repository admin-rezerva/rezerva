# Auditoría: cuentas de correo e identidad de plataforma vs. cliente

**Fecha:** 2026-05-08  
**Contexto:** Dominio operativo en **Cloudflare** (`rezerva.cl`); histórico GoDaddy queda solo como referencia en docs viejos.  
**Cuenta superadmin / identidad operativa deseada:** `administrador@rezerva.cl` (Render, GitHub, decisiones de producto).  
**Documentación canónica de hosts:** `LEER-PRIMERO.md` § *Referencias de entorno*.

---

## 1. Resumen ejecutivo

| Ámbito | ¿Debe ser “cuenta Rezerva / sistema”? | Dónde vive hoy en el producto |
|--------|----------------------------------------|-------------------------------|
| **Envío transaccional (Gmail SMTP)** | **Sí** — remitente técnico de la plataforma | `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM` en **Render**. Nodemailer fijo `smtp.gmail.com:587`. From visible: **Rezerva Notificaciones** + dirección `EMAIL_FROM` (default `notificaciones@rezerva.cl`). |
| **Reply-To** | **Sí** — buzón de plataforma | Fijo en código: `soporte@rezerva.cl`. El contacto del tenant no se usa en la cabecera `Reply-To`. |
| **Google Contacts (OAuth)** | **Proyecto Google Cloud = Rezerva**; **cuenta Google que autoriza = la del cliente** | Un OAuth app (`google_credentials.json` / secret en Render). Cada empresa guarda `google_refresh_token` en BD → sincroniza contra **la cuenta Google que el cliente enlazó** en el panel. |
| **WhatsApp** | **No** — por empresa | Configuración en datos de empresa / sitio público (no hay “WhatsApp de plataforma” en el código como remitente único). |
| **Claves IA (Gemini, Groq, OpenAI, etc.)** | **Cuenta de facturación = Rezerva** (recomendado) | En código, las rutas de panel usan **`backend/config/aiConfig.js`** → variables **globales** del proceso (`GEMINI_API_KEY`, `GROQ_API_KEY`, …). **No** hay en este archivo claves por `empresa_id`. Blog interno opcional: `BLOG_INTERNAL_*`. Los tokens de **Canales IA / feeds / integradores** pueden ir en configuración por empresa según el módulo (`TASKS/tema/SM-venta-ia/venta-ia.md`). |
| **Web Push (VAPID)** | Identidad técnica del **servicio** (mailto de contacto operativo o legal) | `VAPID_SUBJECT` en env; por defecto en código: `mailto:support@{PLATFORM_DOMAIN}` (`webPushDigestService.js`). Alinear con la política si preferís `administrador@rezerva.cl` o `notificaciones@…`. |

**Nota 2026-05-09:** el producto **no usa Resend**. El buzón SMTP debe ser **cuenta operativa Rezerva** (p. ej. `administrador@rezerva.cl` + App Password); `EMAIL_FROM` puede ser alias `notificaciones@rezerva.cl` si Google Workspace lo permite.

---

## 2. Checklist operativo (fuera del repo)

1. **Render (servicio backend)**  
   - `EMAIL_USER`, `EMAIL_PASS` (App Password), `EMAIL_FROM`.  
   - Quitar `RESEND_API_KEY` si existía.

2. **Google Workspace / Gmail**  
   - Verificar “enviar correo como” si `EMAIL_FROM` ≠ `EMAIL_USER`.

3. **Google Cloud Console (OAuth “Contacts”)**  
   - Proyecto y pantalla de consentimiento a nombre **Rezerva** (o marca legal).  
   - **URIs de redirección** autorizados: deben coincidir con el callback real del backend (host público + `/api/auth/google/callback` o ruta equivalente). Tras pasar a `rezerva.cl`, revisar que no queden solo URIs del dominio antiguo.  
   - **OAuth client ID** embebido en `google_credentials.json` (Render: `/etc/secrets/google_credentials.json`).

4. **Firebase (Auth / dominios autorizados)**  
   - En consola Firebase → Authentication → **Authorized domains**: incluir `rezerva.cl`, `*.rezerva.cl`, `suite-manager.onrender.com` según lo que use el panel y SSR. Ajustar tras cambio de DNS (tema ya listado en `SM-rebrand-dominio` como pendiente OAuth).

5. **GitHub / npm / proveedores**  
   - Mantener identidad **organizacional** (`admin-rezerva`, `administrador@rezerva.cl`) coherente con facturación y acceso. No mezclar con cuentas personales de clientes.

6. **ChatGPT / OpenAPI / acciones**  
   - El Action apunta al host del backend (`LEER-PRIMERO.md`); la **cuenta OpenAI** que posee el GPT es independiente del proveedor SMTP. Conviene cuenta **de producto**, no la del tenant.

7. **VAPID**  
   - Definir `VAPID_SUBJECT=mailto:administrador@rezerva.cl` (o buzón dedicado) si no queréis el default `support@{dominio}`.

---

## 3. Hallazgos en el código (referencias útiles)

- **`backend/services/emailService.js`**  
  - Nodemailer pool Gmail; `From` = **Rezerva Notificaciones** + `EMAIL_FROM`; `replyTo` = `soporte@rezerva.cl`.

- **`backend/services/googleContactsService.js`**  
  - Credenciales OAuth **globales**; tokens **por** `empresa_id`.

- **`backend/config/aiConfig.js`** + **`backend/docs/AI_PROVIDERS.md`**  
  - Claves IA **solo** vía `process.env` en el servidor.

- **`backend/services/webPushDigestService.js`**  
  - `VAPID_SUBJECT` opcional; si no, `mailto:support@…` según `PLATFORM_DOMAIN`.

- **`backend/.env.example`**  
  - Plantilla de `EMAIL_FROM` genérica; conviene alinear comentarios con `*.rezerva.cl` en futuras pasadas (sin secrets).

---

## 4. Qué **no** cambiar en código para “unificar” correos de cliente

- Campos de **contacto, WhatsApp y OAuth Google del cliente** en BD / panel SPA: deben seguir siendo **los que cada empresa configure**.  
- El tenant de documentación **orillasdelcoilaco** (`https://orillasdelcoilaco.rezerva.cl`) sigue siendo **solo ejemplo** en `LEER-PRIMERO.md` y pruebas; no confundir con identidad de plataforma.

---

## 5. Próximos pasos sugeridos

1. Mantener SMTP Gmail operativo en Render (`EMAIL_*`).  
2. Cerrar **OAuth Google** y **Firebase authorized domains** en el tema `SM-rebrand-dominio` (ya marcado pendiente en plan de rebrand).  
3. Opcional: exponer en `/api/config/platform` un `supportEmail` genérico si el frontend lo necesita — hoy ese endpoint no incluye email (`backend/index.js`).

---

*Este archivo es guía de revisión; no sustituye cambios de secrets en dashboards (Render, Google, Firebase).*
