# Presets HTML (port desde vista React Gemini)

Los correos transaccionales de SuiteManager aceptan **HTML con prefijo** `[[HTML_EMAIL]]` y sustituyen etiquetas `[TAG]` del motor (ver `plantillasEtiquetasCatalog.js`).

**Por qué no sirve el `.tsx` directo:** Gmail/Outlook no renderizan React, Tailwind ni `lucide-react`. Hay que usar **tablas anidadas**, **CSS inline** y sustituir iconos por emoji o imágenes hospedadas.

**Disparadores:** cree **dos plantillas activas distintas** (una solo `notificacion_interna`, otra solo `reserva_confirmada`) para no mezclar copias.

**Estándar 2026-05-11:** el formato de confirmación huésped queda como patrón global para correos transaccionales: `[[HTML_EMAIL]]`, tabla de 600px, hero oscuro, cuerpo blanco con tarjetas, un CTA principal y footer alineado al mismo ancho. El contenido y el CTA cambian por audiencia; la geometría no.

**Tarjetas 2026-05-11:** el bloque de tarjetas del modal ya no es exclusivo de confirmación huésped. Está disponible para toda plantilla, se guarda en `email_config.tarjetasCorreo` y el motor lo usa como módulo renderizable en layouts fijos o como instrucciones para IA en layouts generados.

---

## 1. Notificación administrador (`notificacion_interna`)

**Asunto sugerido:** `Nueva reserva · [ALOJAMIENTO_NOMBRE] · [RESERVA_ID_CANAL]`

**Estado 2026-05-11:** la plantilla “Confirmación reserva administrador” ya no debe usar el preset legacy de tarjetas pastel como fuente principal. El backend genera una estructura fija compatible con el estándar global: hero oscuro, resumen de reserva, datos del huésped, fechas, alojamiento, huéspedes, `[DESGLOSE_PRECIO_HTML]`, `[ESTADO_PAGO]`, `[COMENTARIOS_HUESPED_ADMIN]` y CTA único `[LINK_GESTION_RESERVA]`. El preset manual de abajo queda como referencia histórica para plantillas internas genéricas.

**Cuerpo** (copiar todo desde `[[HTML_EMAIL]]` inclusive):

```html
[[HTML_EMAIL]]
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
      <tr><td style="background:#4f46e5;padding:24px;text-align:center;">
        <h1 style="margin:0;font-size:22px;color:#ffffff;">Nueva reserva recibida</h1>
        <p style="margin:8px 0 0;font-size:14px;color:#e0e7ff;">&#127968; [ALOJAMIENTO_NOMBRE] · [RESERVA_ID_CANAL]</p>
        <span style="display:inline-block;margin-top:12px;background:#6366f1;color:#fff;font-size:11px;font-weight:bold;padding:6px 12px;border-radius:999px;border:1px solid #818cf8;">Canal: [CANAL_NOMBRE]</span>
      </td></tr>
      <tr><td style="padding:28px 24px;color:#334155;font-size:15px;line-height:1.5;">
        <p style="margin:0 0 12px;">Hola <strong>[USUARIO_NOMBRE]</strong>,</p>
        <p style="margin:0 0 24px;font-size:14px;color:#64748b;">El sistema ha registrado una nueva reserva confirmada. Detalle para tu gestión:</p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;margin-bottom:16px;">
          <tr><td style="padding:16px;">
            <p style="margin:0 0 12px;font-size:11px;font-weight:bold;color:#1e40af;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #bfdbfe;padding-bottom:8px;">&#128100; Datos del huésped</p>
            <p style="margin:8px 0;font-size:14px;"><strong>[CLIENTE_NOMBRE]</strong></p>
            <p style="margin:8px 0;font-size:14px;"><a href="mailto:[CLIENTE_EMAIL]" style="color:#4f46e5;">[CLIENTE_EMAIL]</a></p>
            <p style="margin:8px 0;font-size:14px;"><a href="tel:[CLIENTE_TELEFONO]" style="color:#4f46e5;">[CLIENTE_TELEFONO]</a></p>
          </td></tr>
        </table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:16px;">
          <tr><td style="padding:16px;">
            <p style="margin:0 0 12px;font-size:11px;font-weight:bold;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e2e8f0;padding-bottom:8px;">&#128197; Fechas y ocupación</p>
            <table role="presentation" width="100%" cellpadding="8" cellspacing="0"><tr>
              <td width="50%" valign="top" style="font-size:12px;color:#64748b;">Llegada</td>
              <td width="50%" valign="top" style="font-size:12px;color:#64748b;">Salida</td>
            </tr><tr>
              <td style="font-size:16px;font-weight:bold;color:#0f172a;">[FECHA_LLEGADA]</td>
              <td style="font-size:16px;font-weight:bold;color:#0f172a;">[FECHA_SALIDA]</td>
            </tr><tr>
              <td colspan="2" style="padding-top:12px;font-size:13px;"><strong>Noches:</strong> [TOTAL_NOCHES] · <strong>Huéspedes:</strong> [CANTIDAD_HUESPEDES]</td>
            </tr></table>
          </td></tr>
        </table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fcd34d;border-radius:12px;margin-bottom:16px;">
          <tr><td style="padding:16px;">
            <p style="margin:0 0 8px;font-size:11px;font-weight:bold;color:#92400e;text-transform:uppercase;">&#128172; Observaciones del cliente</p>
            <p style="margin:0;font-size:14px;color:#78350f;font-style:italic;background:#ffffff;padding:12px;border-radius:8px;border:1px solid #fde68a;">[COMENTARIOS_HUESPED]</p>
          </td></tr>
        </table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ecfdf5;border:1px solid #6ee7b7;border-radius:12px;margin-bottom:20px;">
          <tr><td style="padding:16px;">
            <p style="margin:0 0 12px;font-size:11px;font-weight:bold;color:#047857;text-transform:uppercase;border-bottom:1px solid #a7f3d0;padding-bottom:8px;">&#127991; Desglose de tarifa</p>
            <table role="presentation" width="100%" cellpadding="4" cellspacing="0" style="font-size:14px;color:#475569;">
              <tr><td>Precio lista</td><td align="right">[PRECIO_LISTA]</td></tr>
              <tr><td colspan="2" style="color:#dc2626;">[LINEA_DESCUENTO_CUPON]</td></tr>
            </table>
            <table role="presentation" width="100%" cellpadding="8" cellspacing="0" style="margin-top:12px;border-top:1px solid #a7f3d0;">
              <tr><td style="font-weight:bold;color:#065f46;">Total a cobrar</td><td align="right" style="font-size:22px;font-weight:800;color:#047857;">[MONTO_TOTAL]</td></tr>
            </table>
            <p style="margin:8px 0 0;font-size:11px;color:#059669;">Monto final del cliente</p>
          </td></tr>
        </table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:8px 0 24px;">
          <a href="[LINK_GESTION_RESERVA]" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:14px 28px;border-radius:10px;">Ver reserva en el sistema</a>
        </td></tr></table>
      </td></tr>
      <tr><td style="background:#f1f5f9;padding:20px;text-align:center;font-size:11px;color:#64748b;border-top:1px solid #e2e8f0;">
        Mensaje automático de <strong>SuiteManager / Rezerva</strong>. Soporte: [USUARIO_EMAIL]
      </td></tr>
    </table>
  </td></tr>
</table>
```

---

## 2. Confirmación cliente (`reserva_confirmada`)

**Asunto sugerido:** `Confirmación · [ALOJAMIENTO_NOMBRE] · [RESERVA_ID_CANAL]`

**Estado 2026-05-11:** el botón **Generar con IA** ya no deja a la IA diseñar el layout completo para confirmación huésped. El backend genera una estructura fija email-safe (hero oscuro, tarjeta alojamiento, dos tarjetas de ingreso/llegada, `[DESGLOSE_PRECIO_HTML]`, tarjetas del wizard, CTA único “Ver estado de mi reserva” y footer oscuro de tres zonas). La IA/wizard solo alimenta el módulo central mediante `email_config.tarjetasConfirmacionHuesped`.

**Estado página pública:** `/confirmacion?reservaId=...` ya es página pública “Estado de mi reserva”: estado de reserva/pago, saldo o abono requerido, plazo antes de cancelación automática cuando aplique, fechas, huésped, alojamientos reservados con fotos y acciones útiles.

**Cuerpo de referencia manual:** misma idea visual que el mockup (hero, tarjeta alojamiento, ingreso/llegada, bloques informativos). Los textos largos **tinaja / WiFi / mascotas / dirección** no tienen etiquetas en el motor hoy: van como **tarjetas del wizard por empresa** o, si se edita a mano, como HTML dentro de la plantilla. Parametrizar esos datos desde BD queda como backlog aparte.

```html
[[HTML_EMAIL]]
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#e2e8f0;font-family:Arial,Helvetica,sans-serif;">
  <tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #cbd5e1;">
      <tr><td style="background:#0f172a;padding:32px 24px;text-align:center;">
        <h1 style="margin:0;font-size:26px;color:#ffffff;">¡Tu reserva está confirmada!</h1>
        <p style="margin:12px 0 0;font-size:17px;color:#cbd5e1;">Te esperamos en [EMPRESA_NOMBRE]</p>
      </td></tr>
      <tr><td style="padding:28px 24px;color:#334155;font-size:15px;line-height:1.55;">
        <p style="margin:0 0 28px;font-size:16px;">Hola <strong>[CLIENTE_NOMBRE]</strong>,<br><br>
        Gracias por elegirnos. Abajo tienes los datos de tu estadía y enlaces útiles.</p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:16px;margin-bottom:24px;">
          <tr><td style="padding:20px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
              <td valign="top" style="width:55%;padding-right:12px;">
                <span style="font-size:11px;font-weight:bold;color:#6366f1;text-transform:uppercase;">Tu alojamiento</span>
                <p style="margin:8px 0 4px;font-size:22px;font-weight:bold;">&#127968; <a href="[LINK_FOTOS_ALOJAMIENTO]" style="color:#312e81;text-decoration:underline;">[ALOJAMIENTO_NOMBRE]</a></p>
                <span style="font-size:13px;color:#4f46e5;">Reserva Nº [RESERVA_ID_CANAL]</span>
                [ENLACES_FOTOS_ALOJAMIENTOS_HTML]
              </td>
              <td valign="top" style="width:45%;font-size:13px;">
                <p style="margin:0 0 8px;"><span style="color:#6366f1;">Llegada</span><br><strong style="color:#1e1b4b;">[FECHA_LLEGADA]</strong></p>
                <p style="margin:0 0 8px;"><span style="color:#6366f1;">Salida</span><br><strong style="color:#1e1b4b;">[FECHA_SALIDA]</strong></p>
                <p style="margin:0;"><span style="color:#6366f1;">Duración</span><br><strong style="color:#1e1b4b;">[TOTAL_NOCHES] noches</strong></p>
              </td>
            </tr></table>
          </td></tr>
        </table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0 0 24px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td width="50%" valign="top" style="width:50%;max-width:50%;padding:0 8px 0 0;vertical-align:top;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e2e8f0;border-radius:12px;min-height:148px;">
                <tr><td style="padding:16px 18px;">
                  <p style="margin:0 0 12px;font-weight:bold;font-size:16px;color:#0f172a;">&#128337; Ingreso y salida</p>
                  <p style="margin:0;font-size:13px;color:#475569;line-height:1.5;"><!-- EDITAR: horarios reales del complejo -->Check-in: 15:00 a 23:59 hrs.<br>Check-out: hasta las 12:00.</p>
                </td></tr>
              </table>
            </td>
            <td width="50%" valign="top" style="width:50%;max-width:50%;padding:0 0 0 8px;vertical-align:top;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e2e8f0;border-radius:12px;min-height:148px;">
                <tr><td style="padding:16px 18px;">
                  <p style="margin:0 0 8px;font-weight:bold;font-size:16px;color:#0f172a;">&#128205; Cómo llegar</p>
                  <p style="margin:0 0 12px;font-size:13px;color:#475569;line-height:1.5;"><!-- EDITAR: indicaciones de acceso -->Describe aquí el acceso o copia desde tu manual de huésped.</p>
                  <a href="[EMPRESA_GOOGLE_MAPS_LINK]" style="display:block;text-align:center;background:#0f172a;color:#fff;text-decoration:none;font-size:13px;font-weight:600;padding:10px;border-radius:8px;">Abrir en Google Maps</a>
                </td></tr>
              </table>
            </td>
          </tr></table>
        </td></tr></table>

        [DESGLOSE_PRECIO_HTML]

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px 0;border:1px solid #fed7aa;border-radius:12px;background:#fffbeb;">
          <tr><td style="padding:16px 18px;">
            <p style="margin:0 0 12px;font-weight:bold;font-size:16px;color:#0f172a;">&#128705; Información de servicios</p>
            <p style="margin:0;font-size:13px;color:#57534e;line-height:1.55;"><!-- EDITAR: tinaja, pileta, reglas -->Personalice este bloque con políticas de su complejo (tinaja, leña, horarios de uso, etc.).</p>
          </td></tr>
        </table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px 0;border:1px solid #e2e8f0;border-radius:12px;"><tr><td style="padding:16px 18px;">
          <p style="margin:0;font-weight:bold;color:#0f172a;">&#128246; WiFi y extras</p>
          <p style="margin:8px 0 0;font-size:13px;color:#475569;"><!-- EDITAR -->Red y claves: indíquelas aquí por empresa.</p>
        </td></tr></table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;border:1px solid #e2e8f0;border-radius:12px;"><tr><td style="padding:16px 18px;">
          <p style="margin:0;font-weight:bold;color:#0f172a;">&#128054; Mascotas / políticas</p>
          <p style="margin:8px 0 0;font-size:13px;color:#475569;"><!-- EDITAR -->Política de mascotas y áreas comunes.</p>
        </td></tr></table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px;padding-top:22px;border-top:1px solid #e2e8f0;"><tr><td align="center" style="padding:8px 0 6px;">
          <a href="[LINK_CONFIRMACION_PUBLICA]" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:14px 24px;border-radius:10px;">Ver estado de mi reserva</a>
        </td></tr></table>
      </td></tr>
      <tr><td style="background:#0f172a;padding:24px 22px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td width="32%" valign="top" style="width:32%;padding:0 12px 0 0;color:#cbd5e1;font-size:12px;line-height:1.45;">[EMPRESA_LOGO_HTML]<strong style="display:block;color:#ffffff;font-size:15px;margin:6px 0 0;">[EMPRESA_NOMBRE]</strong></td>
          <td width="36%" valign="top" style="width:36%;padding:0 12px;color:#94a3b8;font-size:12px;line-height:1.55;border-left:1px solid #1e293b;border-right:1px solid #1e293b;"><strong style="display:block;color:#ffffff;font-size:13px;margin:0 0 6px;">Contacto</strong>[USUARIO_NOMBRE]<br><a href="mailto:[USUARIO_EMAIL]" style="color:#93c5fd;text-decoration:none;">[USUARIO_EMAIL]</a><br>[USUARIO_TELEFONO]</td>
          <td width="32%" valign="top" style="width:32%;padding:0 0 0 12px;color:#94a3b8;font-size:11px;line-height:1.5;"><strong style="display:block;color:#ffffff;font-size:13px;margin:0 0 6px;">Rezerva</strong>Al confirmar esta reserva aceptas los términos y condiciones publicados por el alojamiento.<br><a href="[URL_TERMINOS]" style="color:#93c5fd;text-decoration:underline;">Términos y condiciones</a></td>
        </tr></table>
      </td></tr>
    </table>
  </td></tr>
</table>
```

**Notas**

- `[DESGLOSE_PRECIO_HTML]`: tabla generada por el motor (por alojamiento si hay snapshot checkout multipropiedad, cupón, total). No duplicar montos en texto fijo.
- `[LINK_FOTOS_ALOJAMIENTO]`: URL `/propiedad/{id}` del sitio público (primera propiedad de la fila). Si queda vacío (sin `propiedad_id`), quite el `<a>` y deje solo el nombre.
- `[ENLACES_FOTOS_ALOJAMIENTOS_HTML]`: solo rellena en reservas grupo; si no aplica, queda vacío.
- Botón **Maps** debe usar solo `[EMPRESA_GOOGLE_MAPS_LINK]` (Maps declarado en empresa). Si está vacío, borre el botón o sustituya por texto sin inventar URL.
- No se incluye “Qué hacer cerca” en el pie de acciones (opcional por empresa); sitio web queda como enlace de términos si aplica.
- En móvil, algunos clientes apilan las dos columnas; el patrón **50 % + gutter 8 px** con tablas internas suele verse alineado en Gmail y la mayoría de webmails.
- Para copiar el texto **literal** de tinaja/WiFi del ejemplo Gemini (Cabaña 10, claves, etc.), sustituya los comentarios `<!-- EDITAR -->` por ese HTML **solo en la plantilla de ese tenant** — no conviene versionarlo en código compartido multiempresa.
