# Presets HTML (port desde vista React Gemini)

Los correos transaccionales de SuiteManager aceptan **HTML con prefijo** `[[HTML_EMAIL]]` y sustituyen etiquetas `[TAG]` del motor (ver `plantillasEtiquetasCatalog.js`).

**Por qué no sirve el `.tsx` directo:** Gmail/Outlook no renderizan React, Tailwind ni `lucide-react`. Hay que usar **tablas anidadas**, **CSS inline** y sustituir iconos por emoji o imágenes hospedadas.

**Disparadores:** cree **dos plantillas activas distintas** (una solo `notificacion_interna`, otra solo `reserva_confirmada`) para no mezclar copias.

---

## 1. Notificación administrador (`notificacion_interna`)

**Asunto sugerido:** `Nueva reserva · [ALOJAMIENTO_NOMBRE] · [RESERVA_ID_CANAL]`

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

**Cuerpo:** misma idea visual que tu mockup (hero, tarjeta alojamiento, ingreso/llegada, bloques informativos). Los textos largos **tinaja / WiFi / mascotas / dirección** no tienen etiquetas en el motor hoy: están marcados como **EDITAR EN PLANTILLA** para cada empresa (paramétrico por datos en BD vendría en un backlog aparte).

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
                <p style="margin:8px 0 4px;font-size:22px;font-weight:bold;color:#312e81;">&#127968; [ALOJAMIENTO_NOMBRE]</p>
                <span style="font-size:13px;color:#4f46e5;">Reserva Nº [RESERVA_ID_CANAL]</span>
              </td>
              <td valign="top" style="width:45%;font-size:13px;">
                <p style="margin:0 0 8px;"><span style="color:#6366f1;">Llegada</span><br><strong style="color:#1e1b4b;">[FECHA_LLEGADA]</strong></p>
                <p style="margin:0 0 8px;"><span style="color:#6366f1;">Salida</span><br><strong style="color:#1e1b4b;">[FECHA_SALIDA]</strong></p>
                <p style="margin:0;"><span style="color:#6366f1;">Duración</span><br><strong style="color:#1e1b4b;">[TOTAL_NOCHES] noches</strong></p>
              </td>
            </tr></table>
          </td></tr>
        </table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td width="48%" valign="top" style="padding-right:2%;border:1px solid #e2e8f0;border-radius:12px;padding:16px;">
            <p style="margin:0 0 12px;font-weight:bold;font-size:16px;color:#0f172a;">&#128337; Ingreso y salida</p>
            <p style="margin:0;font-size:13px;color:#475569;line-height:1.5;"><!-- EDITAR: horarios reales del complejo -->Check-in: 15:00 a 23:59 hrs.<br>Check-out: hasta las 12:00.</p>
          </td>
          <td width="48%" valign="top" style="padding-left:2%;border:1px solid #e2e8f0;border-radius:12px;padding:16px;">
            <p style="margin:0 0 8px;font-weight:bold;font-size:16px;color:#0f172a;">&#128205; Cómo llegar</p>
            <p style="margin:0 0 12px;font-size:13px;color:#475569;line-height:1.5;"><!-- EDITAR: indicaciones de acceso -->Describe aquí el acceso o copia desde tu manual de huésped.</p>
            <a href="[EMPRESA_GOOGLE_MAPS_LINK]" style="display:block;text-align:center;background:#0f172a;color:#fff;text-decoration:none;font-size:13px;font-weight:600;padding:10px;border-radius:8px;">Abrir en Google Maps</a>
          </td>
        </tr></table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border:1px solid #fed7aa;border-radius:12px;background:#fffbeb;">
          <tr><td style="padding:18px;">
            <p style="margin:0 0 12px;font-weight:bold;font-size:16px;color:#0f172a;">&#128705; Información de servicios</p>
            <p style="margin:0;font-size:13px;color:#57534e;line-height:1.55;"><!-- EDITAR: tinaja, pileta, reglas -->Personalice este bloque con políticas de su complejo (tinaja, leña, horarios de uso, etc.).</p>
          </td></tr>
        </table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;border:1px solid #e2e8f0;border-radius:10px;"><tr><td style="padding:14px 16px;">
          <p style="margin:0;font-weight:bold;color:#0f172a;">&#128246; WiFi y extras</p>
          <p style="margin:8px 0 0;font-size:13px;color:#475569;"><!-- EDITAR -->Red y claves: indíquelas aquí por empresa.</p>
        </td></tr></table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;border:1px solid #e2e8f0;border-radius:10px;"><tr><td style="padding:14px 16px;">
          <p style="margin:0;font-weight:bold;color:#0f172a;">&#128054; Mascotas / políticas</p>
          <p style="margin:8px 0 0;font-size:13px;color:#475569;"><!-- EDITAR -->Política de mascotas y áreas comunes.</p>
        </td></tr></table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px;padding-top:20px;border-top:1px solid #e2e8f0;"><tr>
          <td width="50%" align="center" style="padding:6px;">
            <a href="[EMPRESA_WEBSITE]" style="display:block;border:1px solid #cbd5e1;color:#334155;text-decoration:none;font-size:13px;font-weight:600;padding:12px;border-radius:12px;">&#128279; Sitio web</a>
          </td>
          <td width="50%" align="center" style="padding:6px;">
            <a href="[LINK_CONFIRMACION_PUBLICA]" style="display:block;border:1px solid #cbd5e1;color:#334155;text-decoration:none;font-size:13px;font-weight:600;padding:12px;border-radius:12px;">&#128196; Ver confirmación</a>
          </td>
        </tr></table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 0 8px;">
          <a href="[LINK_CONFIRMACION_PUBLICA]" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:14px 24px;border-radius:10px;">Abrir confirmación en el sitio</a>
        </td></tr></table>
      </td></tr>
      <tr><td style="background:#0f172a;padding:28px 24px;text-align:center;">
        <p style="margin:0;font-size:17px;font-weight:bold;color:#ffffff;">[EMPRESA_NOMBRE]</p>
        <p style="margin:10px 0 0;font-size:13px;color:#94a3b8;">Contacto: <a href="mailto:[USUARIO_EMAIL]" style="color:#a5b4fc;">[USUARIO_EMAIL]</a> · [USUARIO_TELEFONO]</p>
      </td></tr>
    </table>
  </td></tr>
</table>
```

**Notas**

- Si `[EMPRESA_GOOGLE_MAPS_LINK]` está vacío, el botón “Maps” quedará vacío: borre la fila del botón o ponga una URL fija solo en **esa** plantilla de esa empresa.
- En móvil, Outlook puede apilar mal dos columnas; es aceptable en la mayoría de clientes con tablas al 48 % / 48 %.
- Para copiar el texto **literal** de tinaja/WiFi del ejemplo Gemini (Cabaña 10, claves, etc.), sustituya los comentarios `<!-- EDITAR -->` por ese HTML **solo en la plantilla de ese tenant** — no conviene versionarlo en código compartido multiempresa.
