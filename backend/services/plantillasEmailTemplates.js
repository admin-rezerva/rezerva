const HTML_MARKER = '[[HTML_EMAIL]]';

function escapeHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function parseTarjetasConfirmacion(texto) {
    if (Array.isArray(texto)) {
        return texto
            .filter((x) => x && typeof x === 'object')
            .map((x) => ({
                titulo: String(x.titulo || '').trim(),
                cuerpo: String(x.cuerpo || '').trim(),
            }))
            .filter((x) => x.titulo || x.cuerpo)
            .slice(0, 18);
    }
    const raw = String(texto || '').trim();
    if (!raw) return [];
    return raw
        .split(/\n\s*---\s*\n/g)
        .map((chunk) => {
            const lines = chunk.split(/\r?\n/);
            let titulo = '';
            if (/^\s*#{1,4}\s+/.test(lines[0] || '')) {
                titulo = String(lines.shift() || '').replace(/^\s*#{1,4}\s+/, '').trim();
            }
            const cuerpo = lines.join('\n').trim();
            return { titulo, cuerpo };
        })
        .filter((t) => t.titulo || t.cuerpo)
        .slice(0, 18);
}

function iconoTarjeta(titulo) {
    const t = String(titulo || '').toLowerCase();
    if (/wifi|wi-fi|internet|red/.test(t)) return '&#128246;';
    if (/tinaja|jacuzzi|spa|hot tub|pileta|piscina/.test(t)) return '&#128705;';
    if (/toalla|ropa blanca|s[aá]bana/.test(t)) return '&#128705;';
    if (/mascota|perro|pet/.test(t)) return '&#128062;';
    if (/llegar|ubicaci[oó]n|mapa|direcci[oó]n/.test(t)) return '&#128205;';
    if (/regla|norma|condici[oó]n|pol[ií]tica/.test(t)) return '&#128221;';
    return '&#8505;';
}

function renderCuerpoTarjeta(cuerpo) {
    const lines = String(cuerpo || '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    if (!lines.length) return '';
    const bulletLines = lines.filter((line) => /^([*\-•]|✅)\s+/.test(line));
    if (bulletLines.length >= 2 && bulletLines.length === lines.length) {
        return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${bulletLines.map((line) => {
            const text = line.replace(/^([*\-•]|✅)\s+/, '');
            return `<tr><td width="22" valign="top" style="padding:3px 6px 3px 0;color:#047857;font-size:14px;">&#10003;</td><td style="padding:3px 0;font-size:14px;color:#475569;line-height:1.5;">${escapeHtml(text)}</td></tr>`;
        }).join('')}</table>`;
    }
    return `<p style="margin:0;font-size:14px;color:#475569;line-height:1.55;">${escapeHtml(lines.join('\n')).replace(/\n/g, '<br>')}</p>`;
}

function renderTarjetasHtml(tarjetas) {
    const rows = tarjetas.length ? tarjetas : [];
    if (!rows.length) return '';
    return rows.map((t) => {
        const titulo = escapeHtml(t.titulo || 'Información para tu estadía');
        const body = renderCuerpoTarjeta(t.cuerpo);
        return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0;padding:0;border:0;">
          <tr>
            <td align="center" style="padding:22px 12px 0 12px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;margin:0 auto 20px auto;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;border-collapse:separate;">
                <tr>
                  <td width="44" valign="top" align="center" style="padding:16px 0 16px 16px;font-size:24px;line-height:1;">${iconoTarjeta(t.titulo)}</td>
                  <td style="padding:16px 18px 16px 12px;">
                    <h4 style="margin:0 0 8px 0;color:#1e293b;font-size:16px;line-height:1.3;">${titulo}</h4>
                    ${body}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>`;
    }).join('\n');
}

function renderHero() {
    return `<tr>
  <td align="center" style="background-color:#0f172a;padding:38px 22px;">
    <h1 style="color:#ffffff;margin:0;font-size:28px;line-height:1.2;">¡Tu reserva está confirmada!</h1>
    <p style="color:#cbd5e1;margin:10px 0 0 0;font-size:17px;line-height:1.4;">Te esperamos en [EMPRESA_NOMBRE]</p>
  </td>
</tr>`;
}

function renderResumenAlojamiento() {
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#eef2ff;border:1px solid #c7d2fe;border-radius:14px;margin:0 0 26px 0;border-collapse:separate;">
  <tr><td style="padding:20px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td valign="top" style="width:55%;padding-right:14px;">
        <span style="display:block;color:#6366f1;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:0.08em;">Tu alojamiento</span>
        <h2 style="color:#312e81;font-size:23px;line-height:1.25;margin:7px 0 4px 0;">&#127968; <a href="[LINK_FOTOS_ALOJAMIENTO]" style="color:#312e81;text-decoration:underline;">[ALOJAMIENTO_NOMBRE]</a></h2>
        <p style="color:#4f46e5;font-size:14px;margin:0 0 10px 0;">Reserva Nº [RESERVA_ID_CANAL]</p>
        [ENLACES_FOTOS_ALOJAMIENTOS_HTML]
      </td>
      <td valign="top" style="width:45%;border-left:1px solid #c7d2fe;padding-left:16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="padding:0 0 10px 0;"><span style="display:block;color:#6366f1;font-size:12px;">Llegada</span><strong style="display:block;color:#312e81;font-size:16px;">[FECHA_LLEGADA]</strong></td></tr>
          <tr><td style="padding:0 0 10px 0;"><span style="display:block;color:#6366f1;font-size:12px;">Salida</span><strong style="display:block;color:#312e81;font-size:16px;">[FECHA_SALIDA]</strong></td></tr>
          <tr><td><span style="display:block;color:#6366f1;font-size:12px;">Duración</span><strong style="display:block;color:#312e81;font-size:14px;">[TOTAL_NOCHES] noches</strong></td></tr>
        </table>
      </td>
    </tr></table>
  </td></tr>
</table>`;
}

function renderIngresoYMapa() {
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 26px 0;">
  <tr>
    <td width="50%" valign="top" style="width:50%;max-width:50%;padding:0 10px 0 0;vertical-align:top;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e2e8f0;border-radius:12px;min-height:148px;border-collapse:separate;">
        <tr><td style="padding:16px 18px;">
          <h3 style="color:#1e293b;font-size:16px;margin:0 0 12px 0;">&#128337; Ingreso y salida</h3>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="background-color:#f8fafc;padding:9px 10px;border-radius:6px;font-size:13px;color:#334155;"><strong>Ingreso:</strong> <span style="color:#64748b;">[FECHA_LLEGADA]</span></td></tr>
            <tr><td height="8" style="font-size:0;line-height:0;">&nbsp;</td></tr>
            <tr><td style="background-color:#f8fafc;padding:9px 10px;border-radius:6px;font-size:13px;color:#334155;"><strong>Salida:</strong> <span style="color:#64748b;">[FECHA_SALIDA]</span></td></tr>
          </table>
        </td></tr>
      </table>
    </td>
    <td width="50%" valign="top" style="width:50%;max-width:50%;padding:0 0 0 10px;vertical-align:top;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e2e8f0;border-radius:12px;min-height:148px;border-collapse:separate;">
        <tr><td style="padding:16px 18px;">
          <h3 style="color:#1e293b;font-size:16px;margin:0 0 10px 0;">&#128205; Cómo llegar</h3>
          <p style="color:#64748b;font-size:13px;line-height:1.45;margin:0 0 14px 0;">Usa el mapa configurado por el alojamiento para revisar la ruta antes de salir.</p>
          <a href="[EMPRESA_GOOGLE_MAPS_LINK]" style="display:block;text-align:center;background-color:#0f172a;color:#ffffff;text-decoration:none;padding:10px;border-radius:6px;font-weight:bold;font-size:13px;">Abrir en Google Maps</a>
        </td></tr>
      </table>
    </td>
  </tr>
</table>`;
}

function renderAcciones() {
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:4px;padding-top:22px;border-top:1px solid #e2e8f0;">
  <tr><td align="center" style="padding:8px 0 6px;"><a href="[LINK_CONFIRMACION_PUBLICA]" style="display:inline-block;background-color:#4f46e5;color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:14px 24px;border-radius:10px;">Ver estado de mi reserva</a></td></tr>
</table>`;
}

function renderFooter() {
    return `<tr>
  <td align="center" style="padding:0;background-color:#e2e8f0;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;margin:0 auto;background-color:#0f172a;border-radius:0 0 12px 12px;border-collapse:separate;">
      <tr>
        <td style="padding:24px 22px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td width="32%" valign="top" style="width:32%;padding:0 12px 0 0;color:#cbd5e1;font-size:12px;line-height:1.45;">
                [EMPRESA_LOGO_HTML]
                <strong style="display:block;color:#ffffff;font-size:15px;margin:6px 0 0 0;">[EMPRESA_NOMBRE]</strong>
              </td>
              <td width="36%" valign="top" style="width:36%;padding:0 12px;color:#94a3b8;font-size:12px;line-height:1.55;border-left:1px solid #1e293b;border-right:1px solid #1e293b;">
                <strong style="display:block;color:#ffffff;font-size:13px;margin:0 0 6px 0;">Contacto</strong>
                <span style="display:block;">[USUARIO_NOMBRE]</span>
                <a href="mailto:[USUARIO_EMAIL]" style="display:block;color:#93c5fd;text-decoration:none;">[USUARIO_EMAIL]</a>
                <span style="display:block;color:#cbd5e1;">[USUARIO_TELEFONO]</span>
              </td>
              <td width="32%" valign="top" style="width:32%;padding:0 0 0 12px;color:#94a3b8;font-size:11px;line-height:1.5;text-align:left;">
                <strong style="display:block;color:#ffffff;font-size:13px;margin:0 0 6px 0;">Rezerva</strong>
                <p style="margin:0 0 8px 0;">Al confirmar esta reserva aceptas los términos y condiciones publicados por el alojamiento.</p>
                <a href="[URL_TERMINOS]" style="color:#93c5fd;text-decoration:underline;">Términos y condiciones</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </td>
</tr>`;
}

function renderAdminHero() {
    return `<tr>
  <td align="center" style="background-color:#0f172a;padding:34px 22px;">
    <h1 style="color:#ffffff;margin:0;font-size:27px;line-height:1.2;">Nueva reserva confirmada</h1>
    <p style="color:#cbd5e1;margin:10px 0 0 0;font-size:16px;line-height:1.4;">Notificación operativa para [EMPRESA_NOMBRE]</p>
  </td>
</tr>`;
}

function renderAdminResumenReserva() {
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#eef2ff;border:1px solid #c7d2fe;border-radius:14px;margin:0 0 22px 0;border-collapse:separate;">
  <tr><td style="padding:20px;">
    <span style="display:block;color:#6366f1;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:0.08em;">Reserva Nº [RESERVA_ID_CANAL]</span>
    <h2 style="color:#312e81;font-size:22px;line-height:1.25;margin:7px 0 12px 0;">[ALOJAMIENTO_NOMBRE]</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td width="50%" valign="top" style="padding:0 10px 0 0;color:#334155;font-size:13px;line-height:1.55;">
          <strong style="color:#1e293b;">Huésped</strong><br>
          [CLIENTE_NOMBRE]<br>
          <a href="mailto:[CLIENTE_EMAIL]" style="color:#4f46e5;text-decoration:none;">[CLIENTE_EMAIL]</a><br>
          [CLIENTE_TELEFONO]
        </td>
        <td width="50%" valign="top" style="padding:0 0 0 10px;color:#334155;font-size:13px;line-height:1.55;border-left:1px solid #c7d2fe;">
          <strong style="color:#1e293b;">Estadía</strong><br>
          Llegada: [FECHA_LLEGADA]<br>
          Salida: [FECHA_SALIDA]<br>
          [TOTAL_NOCHES] noches · [CANTIDAD_HUESPEDES] huéspedes
        </td>
      </tr>
    </table>
  </td></tr>
</table>`;
}

function renderAdminComentario() {
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0;padding:0;border:0;"><tr><td align="center" style="padding:0 12px 24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;margin:0 auto;border:1px solid #fed7aa;border-radius:12px;background:#fffbeb;border-collapse:separate;">
  <tr><td style="padding:16px 18px;">
    <h3 style="color:#1e293b;font-size:16px;margin:0 0 8px 0;">Comentario del huésped</h3>
    <p style="color:#57534e;font-size:14px;line-height:1.55;margin:0;">[COMENTARIOS_HUESPED_ADMIN]</p>
  </td></tr>
</table>
</td></tr></table>`;
}

function renderAdminAcciones() {
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:4px;padding-top:22px;border-top:1px solid #e2e8f0;">
  <tr><td align="center" style="padding:8px 0 6px;"><a href="[LINK_GESTION_RESERVA]" style="display:inline-block;background-color:#4f46e5;color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:14px 24px;border-radius:10px;">Ver reserva en el panel</a></td></tr>
</table>`;
}

function renderAdminFooter() {
    return `<tr>
  <td align="center" style="padding:0;background-color:#e2e8f0;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;margin:0 auto;background-color:#0f172a;border-radius:0 0 12px 12px;border-collapse:separate;">
      <tr><td style="padding:22px;color:#94a3b8;font-size:12px;line-height:1.5;">
        <strong style="display:block;color:#ffffff;font-size:15px;margin:0 0 6px 0;">[EMPRESA_NOMBRE]</strong>
        Notificación interna generada por Rezerva. Si necesitas revisar pagos, documentos o comentarios, abre la reserva desde el panel.
      </td></tr>
    </table>
  </td>
</tr>`;
}

function renderAdminBodyContent(tarjetasHtml) {
    return `<tr>
  <td style="padding:30px;color:#334155;font-size:15px;line-height:1.55;">
    <p style="color:#334155;font-size:18px;margin:0 0 10px 0;">Hola <strong>[USUARIO_NOMBRE]</strong>,</p>
    <p style="color:#475569;font-size:15px;line-height:1.5;margin:0 0 24px 0;">Se registró una nueva reserva desde el sitio público. Revisa los datos operativos antes de contactar al huésped.</p>
    ${renderAdminResumenReserva()}
    [DESGLOSE_PRECIO_HTML]
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0;padding:0;border:0;"><tr><td align="center" style="padding:24px 12px 24px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;border-collapse:separate;">
      <tr><td style="padding:16px 18px;color:#334155;font-size:14px;line-height:1.6;">
        <strong style="display:block;color:#1e293b;font-size:16px;margin:0 0 8px 0;">Estado de pago</strong>
        [ESTADO_PAGO]<br>
        Abono requerido: [MONTO_ABONO]<br>
        Saldo pendiente: [SALDO_PENDIENTE]<br>
        Plazo de abono: [PLAZO_ABONO]
      </td></tr>
      </table>
    </td></tr></table>
    ${renderAdminComentario()}
    ${tarjetasHtml}
    ${renderAdminAcciones()}
  </td>
</tr>`;
}

function renderAdminEmailShell(tarjetasHtml = '') {
    return `${HTML_MARKER}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#e2e8f0;font-family:Arial,Helvetica,sans-serif;padding:20px 0;">
  <tr><td align="center" style="padding:0 12px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #cbd5e1;box-shadow:0 4px 6px rgba(15,23,42,0.08);">
      ${renderAdminHero()}
      ${renderAdminBodyContent(tarjetasHtml)}
      ${renderAdminFooter()}
    </table>
  </td></tr>
</table>`;
}

function renderBodyContent(tarjetasHtml) {
    return `<tr>
  <td style="padding:30px;color:#334155;font-size:15px;line-height:1.55;">
    <p style="color:#334155;font-size:18px;margin:0 0 10px 0;">Hola <strong>[CLIENTE_NOMBRE]</strong>,</p>
    <p style="color:#475569;font-size:16px;line-height:1.5;margin:0 0 28px 0;">Estamos muy felices de recibirte. A continuación encontrarás la información necesaria para preparar tu estadía.</p>
    ${renderResumenAlojamiento()}
    ${renderIngresoYMapa()}
    [DESGLOSE_PRECIO_HTML]
    ${tarjetasHtml}
    ${renderAcciones()}
  </td>
</tr>`;
}

function renderEmailShell(tarjetasHtml) {
    return `${HTML_MARKER}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#e2e8f0;font-family:Arial,Helvetica,sans-serif;padding:20px 0;">
  <tr><td align="center" style="padding:0 12px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #cbd5e1;box-shadow:0 4px 6px rgba(15,23,42,0.08);">
      ${renderHero()}
      ${renderBodyContent(tarjetasHtml)}
      ${renderFooter()}
    </table>
  </td></tr>
</table>`;
}

function generarPlantillaConfirmacionHuespedHtml({ nombreEmpresa, instruccionesTarjetas }) {
    const tarjetas = parseTarjetasConfirmacion(instruccionesTarjetas);
    const empresa = String(nombreEmpresa || '[EMPRESA_NOMBRE]').trim();
    const texto = renderEmailShell(renderTarjetasHtml(tarjetas));
    const asunto = 'Confirmación de reserva - [ALOJAMIENTO_NOMBRE]';
    return {
        nombre: `Confirmación reserva - ${empresa}`,
        asunto,
        texto,
        tipoNombreUsado: 'confirmacion_huesped_fija',
    };
}

function generarPlantillaConfirmacionAdminHtml({ nombreEmpresa, instruccionesTarjetas }) {
    const tarjetas = parseTarjetasConfirmacion(instruccionesTarjetas);
    const empresa = String(nombreEmpresa || '[EMPRESA_NOMBRE]').trim();
    return {
        nombre: `Confirmación reserva administrador - ${empresa}`,
        asunto: 'Nueva reserva confirmada - [ALOJAMIENTO_NOMBRE] - [RESERVA_ID_CANAL]',
        texto: renderAdminEmailShell(renderTarjetasHtml(tarjetas)),
        tipoNombreUsado: 'confirmacion_admin_fija',
    };
}

module.exports = {
    generarPlantillaConfirmacionAdminHtml,
    generarPlantillaConfirmacionHuespedHtml,
    parseTarjetasConfirmacion,
};
