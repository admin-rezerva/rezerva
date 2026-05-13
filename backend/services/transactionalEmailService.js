// backend/services/transactionalEmailService.js
// Motor de envío por disparadores definidos en plantillas (email_config.disparadores).
const pool = require('../db/postgres');
const {
    procesarPlantilla,
    normalizeEmailConfig,
    DISPARADOR_KEYS,
} = require('./plantillasService');
const emailService = require('./emailService');
const { registrarComunicacion } = require('./comunicacionesService');
const { obtenerClientePorId } = require('./clientesService');
const { fallbackSubjectForDisparador } = require('./transactionalEmailFallbackSubjects');
const { enmascararDocumentoParaUiPublica } = require('./reservaWebCheckinIdentidadService');
const { esEstadoPrincipalCancelacionSync } = require('./estadosService');
const { generarTokenParaReserva } = require('./resenasService');
const { resolveDepositoReservaWeb } = require('./depositoReservaWebService');
const { getAdminPanelOrigin } = require('../config/platformPublic');
const { normalizeWebsiteImageUrl } = require('./websitePublicImageUrl');
const { buildPlatformTenantOrigin, buildTenantTermsUrl } = require('./websiteHostCanonical');

const PLATFORM_DOMAIN = process.env.PLATFORM_DOMAIN || 'rezerva.cl';

/** Mapa disparador plantilla → evento en tabla comunicaciones */
/** Disparadores transaccionales típicos; `consulta_contacto` usa interruptor maestro + categoría opcional `consultasDesdeWeb`; se excluye `notificacion_interna`. */
const DISPARADORES_AFECTADOS_POR_SWITCH_AUTO = new Set([
    'reserva_confirmada',
    'reserva_cancelada',
    'reserva_modificada',
    'recordatorio_pre_llegada',
    'post_estadia_evaluacion',
]);

function _correosAutomaticosHuespedActivos(ctx) {
    const v = ctx.configuracion?.websiteSettings?.email?.correosAutomaticosActivos;
    return v !== false;
}

/** Interruptor maestro + granularidad opcional por categoría (`correosAutomaticosCategorias`). */
function _permiteCorreoAutomaticoHuesped(ctx, disparadorKey) {
    if (disparadorKey === 'digest_operacion_diario') {
        const off = ctx.configuracion?.emailAutomations?.digestOperacionDiario === false;
        return !off;
    }
    /** Copia al equipo: no depende del interruptor de correos al huésped */
    if (disparadorKey === 'notificacion_interna') return true;
    if (!_correosAutomaticosHuespedActivos(ctx)) return false;
    if (disparadorKey === 'consulta_contacto') {
        const cats0 = ctx.configuracion?.websiteSettings?.email?.correosAutomaticosCategorias;
        if (!cats0 || typeof cats0 !== 'object') return true;
        return cats0.consultasDesdeWeb !== false;
    }
    if (!DISPARADORES_AFECTADOS_POR_SWITCH_AUTO.has(disparadorKey)) return true;
    const cats = ctx.configuracion?.websiteSettings?.email?.correosAutomaticosCategorias;
    if (!cats || typeof cats !== 'object') return true;
    if (disparadorKey === 'reserva_confirmada' || disparadorKey === 'reserva_cancelada' || disparadorKey === 'reserva_modificada') {
        return cats.reservasTransaccionales !== false;
    }
    if (disparadorKey === 'recordatorio_pre_llegada') {
        return cats.recordatorioPreLlegada !== false;
    }
    if (disparadorKey === 'post_estadia_evaluacion') {
        return cats.evaluacionPostEstadia !== false;
    }
    return true;
}

async function obtenerPlantillaActivaPorId(empresaId, plantillaId) {
    const pid = String(plantillaId || '').trim();
    if (!pid) return null;
    const { rows } = await pool.query(
        `SELECT id, nombre, tipo, texto, COALESCE(asunto,'') AS asunto, email_config
         FROM plantillas
         WHERE id = $1 AND empresa_id = $2 AND activa = true
         LIMIT 1`,
        [pid, empresaId]
    );
    const r = rows[0];
    if (!r) return null;
    return {
        id: r.id,
        nombre: r.nombre,
        tipo: r.tipo,
        texto: r.texto,
        asunto: r.asunto != null ? String(r.asunto) : '',
    };
}

const EVENTO_POR_DISPARADOR = {
    reserva_confirmada: 'reserva-confirmada',
    reserva_cancelada: 'reserva-cancelada',
    reserva_modificada: 'reserva-modificada',
    recordatorio_pre_llegada: 'recordatorio-pre-llegada',
    post_estadia_evaluacion: 'evaluacion-pendiente',
    consulta_contacto: 'consulta-web-publica',
    notificacion_interna: 'notificacion-interna',
    digest_operacion_diario: 'digest-operacion-diario',
};

async function _obtenerEmpresaEmailContext(empresaId) {
    const { rows } = await pool.query(
        `SELECT nombre, email, subdominio, configuracion, google_maps_url
         FROM empresas WHERE id = $1`,
        [empresaId]
    );
    const r = rows[0];
    if (!r) return { nombre: '', contactoEmail: null, contactoNombre: '', contactoTelefono: '', website: '', configuracion: {} };
    const cfg = { ...(r.configuracion || {}) };
    const colMaps = r.google_maps_url != null ? String(r.google_maps_url).trim() : '';
    if (colMaps && !String(cfg.google_maps_url || '').trim()) {
        cfg.google_maps_url = colMaps;
    }
    return {
        nombre: r.nombre || '',
        subdominio: r.subdominio || '',
        contactoEmail: cfg.contactoEmail || r.email || null,
        contactoNombre: cfg.contactoNombre || '',
        contactoTelefono: cfg.contactoTelefono || '',
        website: cfg.website || '',
        configuracion: cfg,
    };
}

function _coerceLogoUrl(raw) {
    if (!raw) return '';
    if (typeof raw === 'string') return raw.trim();
    if (typeof raw === 'object') {
        return String(raw.url || raw.storagePath || raw.storageUrl || '').trim();
    }
    return '';
}

function _empresaLogoUrlFromWebsiteSettings(ws = {}) {
    const raw =
        _coerceLogoUrl(ws.brand?.logos?.primary)
        || _coerceLogoUrl(ws.brand?.logos?.secondary)
        || _coerceLogoUrl(ws.theme?.logoUrl);
    return normalizeWebsiteImageUrl(raw);
}

function _buildEmpresaLogoEmailHtml(logoUrl, empresaNombre) {
    const clean = String(logoUrl || '').trim();
    if (!clean) return '';
    return `<img src="${_escapeHtmlAttr(clean)}" alt="${_escapeHtmlAttr(empresaNombre || 'Logo')}" width="120" style="display:block;max-width:120px;max-height:42px;width:auto;height:auto;border:0;outline:none;text-decoration:none;">`;
}

/**
 * URL pública del sitio SSR de la empresa (reseñas, home, confirmación en correo).
 * Si hay subdominio de plataforma (`{sub}.rezerva.cl`), va antes que un dominio custom
 * en websiteSettings: el motor de reservas y páginas legales SSR viven en el host Rezerva.
 */
async function obtenerBaseUrlPublica(empresaId) {
    const ctx = await _obtenerEmpresaEmailContext(empresaId);
    const platformOrigin = buildPlatformTenantOrigin(ctx);
    if (platformOrigin) {
        return platformOrigin;
    }
    const ws = ctx.configuracion.websiteSettings || {};
    const sub = ws.general?.subdomain || '';
    const domain = (ws.general?.domain || '').trim().toLowerCase();
    const hostBase = PLATFORM_DOMAIN || 'rezerva.cl';
    if (domain && domain.length > 3 && !domain.endsWith('.local')) {
        return `https://${domain}`;
    }
    if (sub) return `https://${sub}.${hostBase}`;
    return `https://${hostBase}`;
}

/**
 * Enlace de reseña para huésped (outbound): misma fuente que post-estancia — `urlResenaExterna` (https)
 * o formulario interno `/r/:token` (reutiliza fila `resenas` si ya existe).
 * Devuelve cadena vacía sin PostgreSQL, reserva no encontrada o cliente bloqueado.
 *
 * @param {string} empresaId
 * @param {{ reservaRef: string|number, nombreHuesped?: string, refQuery?: string, propiedadIdFallback?: string|null }} opts
 */
async function resolverLinkResenaOutbound(empresaId, {
    reservaRef,
    nombreHuesped = '',
    refQuery = 'email',
    propiedadIdFallback = null,
}) {
    if (!pool) return '';
    const ref = reservaRef != null ? String(reservaRef).trim() : '';
    if (!ref) return '';
    const ctx = await _obtenerEmpresaEmailContext(empresaId);
    const ext = String(ctx.configuracion?.emailAutomations?.evaluacionPostEstadia?.urlResenaExterna || '').trim();
    if (ext && /^https?:\/\//i.test(ext)) {
        return ext;
    }
    try {
        const { rows } = await pool.query(
            `SELECT id, propiedad_id FROM reservas
             WHERE empresa_id = $1 AND (id::text = $2 OR id_reserva_canal = $2)
             LIMIT 1`,
            [empresaId, ref]
        );
        const row = rows[0];
        if (!row) return '';
        const pid = row.propiedad_id != null && String(row.propiedad_id).trim() !== ''
            ? row.propiedad_id
            : propiedadIdFallback;
        const token = await generarTokenParaReserva(
            empresaId,
            String(row.id),
            pid || null,
            nombreHuesped || ''
        );
        const baseUrl = await obtenerBaseUrlPublica(empresaId);
        const q = refQuery ? `?ref=${encodeURIComponent(String(refQuery))}` : '';
        return `${baseUrl}/r/${encodeURIComponent(token)}${q}`;
    } catch (e) {
        console.warn('[resolverLinkResenaOutbound]', e.message);
        return '';
    }
}

/**
 * Evita usar la misma fila de plantilla para huésped y admin si ambos disparadores están marcados:
 * prioriza plantillas “dedicadas” (solo ese disparador entre confirmación / interna).
 */
function _seleccionarPlantillaPorDisparador(rows, disparadorKey, empresaIdForLog = '') {
    const eligible = [];
    for (const r of rows) {
        const ec = normalizeEmailConfig(r.email_config);
        if (!ec.permitirEnvioCorreo) continue;
        if (!ec.disparadores?.[disparadorKey]) continue;
        eligible.push({ r, ec });
    }
    if (!eligible.length) return null;

    const dedicated = eligible.filter(({ ec }) => {
        if (disparadorKey === 'notificacion_interna') return !ec.disparadores.reserva_confirmada;
        if (disparadorKey === 'reserva_confirmada') return !ec.disparadores.notificacion_interna;
        return true;
    });

    const pick = (dedicated.length ? dedicated : eligible)[0];
    if (!dedicated.length && eligible.length && (disparadorKey === 'notificacion_interna' || disparadorKey === 'reserva_confirmada')) {
        console.warn(
            `[transactionalEmail]${empresaIdForLog ? ` empresa=${empresaIdForLog}` : ''} disparador=${disparadorKey}: `
            + 'ninguna plantilla solo para este disparador; se usa una fila con varios disparadores — '
            + 'huésped e interno pueden verse iguales. En Panel: dos plantillas distintas o desmarca el disparador extra.'
        );
    }

    const r = pick.r;
    return {
        id: r.id,
        nombre: r.nombre,
        tipo: r.tipo,
        texto: r.texto,
        asunto: r.asunto != null ? String(r.asunto) : '',
    };
}

/**
 * Busca la primera plantilla activa con disparador encendido y envío por correo permitido.
 */
async function obtenerPlantillaPorDisparador(empresaId, disparadorKey) {
    if (!DISPARADOR_KEYS.includes(disparadorKey)) return null;
    const { rows } = await pool.query(
        `SELECT id, nombre, tipo, texto, asunto, email_config
         FROM plantillas
         WHERE empresa_id = $1 AND activa = true
         ORDER BY id DESC`,
        [empresaId]
    );
    return _seleccionarPlantillaPorDisparador(rows, disparadorKey, empresaId);
}

/**
 * @returns {{ sent: boolean, reason?: string, messageId?: string, plantillaId?: string }}
 */
async function enviarPorDisparador(_db, empresaId, disparadorKey, {
    clienteId = null,
    destinatarioOverride = null,
    variables = {},
    relacionadoCon = null,
    eventoComunicacion = null,
    skipRegistro = false,
    plantillaIdOverride = null,
    openPixelUrl = null,
    /** @type {{ filename: string, content: Buffer }[]|undefined} adjuntos binarios (p. ej. PDF manual reserva web) */
    attachments = undefined,
    /** HTML extra si no hay adjunto PDF o tras fallo con adjunto (enlace público al PDF). */
    appendHtmlWhenNoPdf = '',
}) {
    const ctx = await _obtenerEmpresaEmailContext(empresaId);
    if (!_permiteCorreoAutomaticoHuesped(ctx, disparadorKey)) {
        return { sent: false, reason: 'correos_automaticos_desactivados' };
    }

    let plantilla = null;
    if (plantillaIdOverride) {
        plantilla = await obtenerPlantillaActivaPorId(empresaId, plantillaIdOverride);
    } else {
        plantilla = await obtenerPlantillaPorDisparador(empresaId, disparadorKey);
    }
    if (!plantilla) {
        return { sent: false, reason: 'no_plantilla' };
    }
    let to = (destinatarioOverride || '').trim();
    let cid = clienteId;
    if (!to && cid) {
        try {
            const c = await obtenerClientePorId(_db, empresaId, cid);
            to = (c?.email || '').trim();
        } catch (_) {
            to = '';
        }
    }
    if (!to) {
        return { sent: false, reason: 'sin_email', plantillaId: plantilla.id };
    }

    const datos = {
        ...variables,
        empresaNombre: variables.empresaNombre || ctx.nombre,
        empresaWebsite: variables.empresaWebsite || ctx.website,
        contactoNombre: variables.contactoNombre || ctx.contactoNombre,
        contactoEmail: variables.contactoEmail || ctx.contactoEmail || '',
        contactoTelefono: variables.contactoTelefono || ctx.contactoTelefono,
        usuarioNombre: variables.usuarioNombre || ctx.contactoNombre,
        usuarioEmail: variables.usuarioEmail || ctx.contactoEmail || '',
        usuarioTelefono: variables.usuarioTelefono || ctx.contactoTelefono,
    };

    const { contenido, asunto } = await procesarPlantilla(_db, empresaId, plantilla.id, datos);
    const em = ctx.configuracion?.websiteSettings?.email || {};
    const htmlLangMotor = em.idiomaPorDefecto === 'en' ? 'en' : 'es';
    let subjectLine = String(asunto || '').trim();
    if (!subjectLine) {
        subjectLine = fallbackSubjectForDisparador(disparadorKey, htmlLangMotor);
    }

    let htmlCuerpo = contenido;
    const px = openPixelUrl && !skipRegistro ? String(openPixelUrl).replace(/[\s"<>]/g, '') : '';
    if (px) {
        htmlCuerpo += `<img src="${px}" width="1" height="1" alt="" style="display:block;border:0;width:1px;height:1px" />`;
    }

    const resultado = await emailService.enviarCorreo(_db, {
        to,
        subject: subjectLine,
        html: htmlCuerpo,
        empresaId,
        attachments: Array.isArray(attachments) && attachments.length ? attachments : undefined,
        appendHtmlWhenNoPdf: String(appendHtmlWhenNoPdf || '').trim(),
    });

    const evento = eventoComunicacion || EVENTO_POR_DISPARADOR[disparadorKey] || disparadorKey;

    if (!resultado.success) {
        if (!skipRegistro && cid) {
            try {
                await registrarComunicacion(_db, empresaId, cid, {
                    tipo: 'email',
                    evento,
                    asunto: subjectLine,
                    plantillaId: plantilla.id,
                    destinatario: to,
                    relacionadoCon: relacionadoCon || null,
                    estado: 'fallido',
                    messageId: null,
                });
            } catch (e) {
                console.warn('[transactionalEmail] registro fallido (envío error):', e.message);
            }
        }
        return { sent: false, reason: resultado.error || 'envio_fallido', plantillaId: plantilla.id };
    }

    let comunicacionId = null;
    if (!skipRegistro && cid) {
        try {
            const reg = await registrarComunicacion(_db, empresaId, cid, {
                tipo: 'email',
                evento,
                asunto: subjectLine,
                plantillaId: plantilla.id,
                destinatario: to,
                relacionadoCon: relacionadoCon || null,
                estado: 'enviado',
                messageId: resultado.messageId || null,
            });
            comunicacionId = reg?.id || null;
        } catch (e) {
            console.warn('[transactionalEmail] registrarComunicacion:', e.message);
        }
    }

    return { sent: true, messageId: resultado.messageId, plantillaId: plantilla.id, comunicacionId };
}

/**
 * Notificación interna (misma plantilla/disparador; destinatario = equipo).
 */
async function enviarNotificacionInterna(_db, empresaId, variables, relacionadoCon) {
    const ctx = await _obtenerEmpresaEmailContext(empresaId);
    const adminTo = (ctx.contactoEmail || '').trim();
    if (!adminTo) return { sent: false, reason: 'sin_email_admin' };
    return enviarPorDisparador(_db, empresaId, 'notificacion_interna', {
        clienteId: null,
        destinatarioOverride: adminTo,
        variables,
        relacionadoCon,
        eventoComunicacion: 'notificacion-interna',
        skipRegistro: true,
    });
}

function _fmtMonedaCLP(v, localeTag = 'es-CL') {
    const loc = localeTag === 'en-US' ? 'en-US' : 'es-CL';
    return new Intl.NumberFormat(loc, { style: 'currency', currency: 'CLP' }).format(v || 0);
}

function _formatearFechaReserva(f, localeTag = 'es-CL') {
    if (!f) return '';
    const en = localeTag === 'en-US';
    const fmt = (dt) => (en
        ? dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        : dt.toLocaleDateString('es-CL'));
    if (f instanceof Date) return Number.isNaN(f.getTime()) ? '' : fmt(f);
    const d = new Date(f);
    return Number.isNaN(d.getTime()) ? String(f).slice(0, 10) : fmt(d);
}

function _medioLlegadaEtiqueta(codigo, idiomaPorDefecto) {
    const c = String(codigo || '').trim().toLowerCase();
    if (!c) return '';
    const en = idiomaPorDefecto === 'en';
    const map = en
        ? { auto: 'Car', avion: 'Flight', bus: 'Bus', otro: 'Other' }
        : { auto: 'Automóvil', avion: 'Avión', bus: 'Bus', otro: 'Otro' };
    return map[c] || '';
}

function _docTipoIdentidadEtiqueta(codigo, idiomaPorDefecto) {
    const c = String(codigo || '').trim().toLowerCase();
    if (!c) return '';
    const en = idiomaPorDefecto === 'en';
    const map = en
        ? { rut: 'Chile tax ID (RUT)', pasaporte: 'Passport', dni_otro: 'Other ID' }
        : { rut: 'RUT', pasaporte: 'Pasaporte', dni_otro: 'Otro documento' };
    return map[c] || c;
}

function _armarDatosTransferenciaTexto(datosBancarios) {
    const db = datosBancarios && typeof datosBancarios === 'object' ? datosBancarios : {};
    const lines = [
        db.titular ? `Titular: ${db.titular}` : '',
        db.rut ? `RUT: ${db.rut}` : '',
        db.banco ? `Banco: ${db.banco}` : '',
        db.tipoCuenta ? `Tipo de cuenta: ${db.tipoCuenta}` : '',
        db.numeroCuenta ? `N° cuenta: ${db.numeroCuenta}` : '',
        db.email ? `Email: ${db.email}` : '',
    ].filter(Boolean);
    return lines.join('\n');
}

function _htmlToTextLite(html) {
    return String(html || '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<[^>]+>/g, '')
        .replace(/[ \t]+\n/g, '\n')
        .trim();
}

function _escapeHtmlAttr(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function _escapeHtmlText(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function _parseReservaMetadata(raw) {
    if (raw == null) return {};
    if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
        try {
            const o = JSON.parse(raw);
            return o && typeof o === 'object' ? o : {};
        } catch {
            return {};
        }
    }
    return {};
}

function _buildPublicPropiedadPageUrl(baseUrl, propiedadId) {
    const b = String(baseUrl || '').replace(/\/$/, '');
    const pid = propiedadId != null ? String(propiedadId).trim() : '';
    if (!b || !pid) return '';
    return `${b}/propiedad/${encodeURIComponent(pid)}#property-gallery-root`;
}

/**
 * Tarjeta email-safe: tabla 2 columnas (concepto | monto) con desglose por alojamiento si existe snapshot checkout.
 */
function _buildDesglosePrecioEmailCard({
    idiomaEn,
    localeFecha,
    valoresRow,
    pv,
    totalFmt,
    precioListaFmt,
    lineaDescuentoCupon,
    descCuponNum,
}) {
    const en = idiomaEn === 'en';
    const title = en ? 'Price breakdown' : 'Desglose del precio';
    const lblMinor = en ? 'Children / extra beds' : 'Menores o camas extra';
    const lblCoupon = en ? 'Coupon discount' : 'Descuento (cupón)';
    const lblBefore = en ? 'Subtotal before discount' : 'Subtotal antes de descuentos';
    const lblNet = en ? 'Net (reference)' : 'Neto (referencia)';
    const lblTax = en ? 'VAT (reference)' : 'IVA (referencia)';
    const lblTotal = en ? 'Total' : 'Total a pagar';
    const chunks = [];

    chunks.push(
        `<tr><td colspan="2" style="padding:14px 18px 12px 18px;font-size:12px;font-weight:700;color:#0f172a;text-transform:uppercase;letter-spacing:0.04em;border-bottom:1px solid #e2e8f0;">${_escapeHtmlText(title)}</td></tr>`
    );

    const pushRow = (labelHtml, valueHtml, { strong = false, valueColor } = {}) => {
        if (valueHtml == null || valueHtml === '') return;
        const ls = `padding:12px 18px;font-size:14px;color:#334155;${strong ? 'font-weight:700;color:#0f172a;' : ''}`;
        const vs = `padding:12px 18px;font-size:14px;text-align:right;white-space:nowrap;${strong ? 'font-weight:800;color:#047857;' : ''}${valueColor ? `color:${valueColor};` : ''}`;
        chunks.push(
            `<tr><td style="${ls}">${labelHtml}</td><td style="${vs}">${valueHtml}</td></tr>`
        );
    };

    if (pv && Array.isArray(pv.porPropiedad) && pv.porPropiedad.length > 0) {
        pv.porPropiedad.forEach((p) => {
            const name = _escapeHtmlText(p.nombre || p.propiedadId || (en ? 'Property' : 'Alojamiento'));
            const amt = _fmtMonedaCLP(Number(p.totalCLP) || 0, localeFecha);
            pushRow(name, amt);
        });
        const rec = Number(pv.recargoMenoresCamasCLP) || 0;
        if (rec > 0) {
            pushRow(_escapeHtmlText(lblMinor), _fmtMonedaCLP(rec, localeFecha));
        }
        const subLista = Number(pv.subtotalListaCLP) || 0;
        if (descCuponNum > 0 && subLista > 0) {
            pushRow(_escapeHtmlText(lblBefore), _fmtMonedaCLP(subLista, localeFecha));
        }
    } else {
        if (descCuponNum > 0 && precioListaFmt) {
            pushRow(_escapeHtmlText(en ? 'List price' : 'Precio lista'), precioListaFmt);
        }
        if (lineaDescuentoCupon && descCuponNum > 0) {
            pushRow(_escapeHtmlText(lblCoupon), `−${_fmtMonedaCLP(descCuponNum, localeFecha)}`, { valueColor: '#b91c1c' });
        }
    }

    if (valoresRow.valorTotal != null && Number(valoresRow.valorTotal) > 0) {
        pushRow(_escapeHtmlText(lblNet), _fmtMonedaCLP(Number(valoresRow.valorTotal), localeFecha));
    }
    if (valoresRow.iva != null && Number(valoresRow.iva) > 0) {
        pushRow(_escapeHtmlText(lblTax), _fmtMonedaCLP(Number(valoresRow.iva), localeFecha));
    }

    if (totalFmt) {
        pushRow(_escapeHtmlText(lblTotal), totalFmt, { strong: true });
    }

    if (chunks.length <= 1) return '';

    const inner = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;border-collapse:separate;">${chunks.join('')}</table>`;
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0;padding:0;border:0;"><tr><td align="center" style="padding:22px 12px 24px 12px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;margin:0 auto;">${inner}</table>
</td></tr></table>`;
}

function _buildDesglosePrecioTexto({
    idiomaEn,
    localeFecha,
    valoresRow,
    pv,
    totalFmt,
    precioListaFmt,
    lineaDescuentoCupon,
    descCuponNum,
}) {
    const en = idiomaEn === 'en';
    const lines = [en ? 'Price breakdown' : 'Desglose del precio', ''];
    if (pv && Array.isArray(pv.porPropiedad) && pv.porPropiedad.length > 0) {
        pv.porPropiedad.forEach((p) => {
            const name = p.nombre || p.propiedadId || '';
            lines.push(`${name}: ${_fmtMonedaCLP(Number(p.totalCLP) || 0, localeFecha)}`);
        });
        const rec = Number(pv.recargoMenoresCamasCLP) || 0;
        if (rec > 0) lines.push(`${en ? 'Children/extra beds' : 'Menores o camas extra'}: ${_fmtMonedaCLP(rec, localeFecha)}`);
        const subLista = Number(pv.subtotalListaCLP) || 0;
        if (descCuponNum > 0 && subLista > 0) {
            lines.push(`${en ? 'Subtotal before discount' : 'Subtotal antes de descuentos'}: ${_fmtMonedaCLP(subLista, localeFecha)}`);
        }
    } else {
        if (descCuponNum > 0 && precioListaFmt) {
            lines.push(`${en ? 'List price' : 'Precio lista'}: ${precioListaFmt}`);
        }
        if (lineaDescuentoCupon) lines.push(lineaDescuentoCupon);
    }
    if (valoresRow.valorTotal != null && Number(valoresRow.valorTotal) > 0) {
        lines.push(`${en ? 'Net' : 'Neto'}: ${_fmtMonedaCLP(Number(valoresRow.valorTotal), localeFecha)}`);
    }
    if (valoresRow.iva != null && Number(valoresRow.iva) > 0) {
        lines.push(`${en ? 'VAT' : 'IVA'}: ${_fmtMonedaCLP(Number(valoresRow.iva), localeFecha)}`);
    }
    if (totalFmt) lines.push(`${en ? 'Total' : 'Total a pagar'}: ${totalFmt}`);
    return lines.filter((l, i) => i < 2 || l !== '').join('\n');
}

function _buildEnlacesFotosAlojamientosHtml(baseUrl, metaParsed) {
    const rg = metaParsed.reservaWebGrupo;
    const ids = Array.isArray(rg?.propiedadIds) ? rg.propiedadIds : [];
    const names = Array.isArray(rg?.alojamientosNombres) ? rg.alojamientosNombres : [];
    if (ids.length < 2) return '';
    const parts = [];
    for (let i = 0; i < ids.length; i++) {
        const url = _buildPublicPropiedadPageUrl(baseUrl, ids[i]);
        const nom = names[i] != null ? String(names[i]).trim() : String(ids[i]);
        if (url && nom) {
            parts.push(`<a href="${_escapeHtmlAttr(url)}" style="color:#4f46e5;font-weight:600;text-decoration:underline;">${_escapeHtmlText(nom)}</a>`);
        }
    }
    if (!parts.length) return '';
    const inner = `<p style="margin:0;font-size:13px;color:#475569;line-height:1.65;">Ver fotos del alojamiento: ${parts.join(' · ')}</p>`;
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0;padding:0 0 8px 0;"><tr><td align="center" style="padding:0 12px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;margin:0 auto;"><tr><td style="padding:4px 4px 0 4px;">${inner}</td></tr></table>
</td></tr></table>`;
}

/**
 * Construye variables de plantilla a partir de una fila mínima de reserva + cliente.
 */
async function construirVariablesDesdeReserva(empresaId, row, extras = {}) {
    const ctx = await _obtenerEmpresaEmailContext(empresaId);
    const ws = ctx.configuracion?.websiteSettings || {};
    const bk = ws.booking || {};
    const linkCheckinOnline = String(bk.checkinOnlineUrl || '').trim();
    const linkManualHuesped = String(bk.manualHuespedUrl || '').trim();
    const linkManualHuespedPdf = String(bk.manualHuespedPdfUrl || '').trim();
    const idiomaPorDefecto = ctx.configuracion?.websiteSettings?.email?.idiomaPorDefecto === 'en' ? 'en' : 'es';
    const localeFecha = idiomaPorDefecto === 'en' ? 'en-US' : 'es-CL';
    let clienteNombre = extras.clienteNombre || '';
    if (!clienteNombre && row.cliente_id) {
        try {
            const c = await obtenerClientePorId(null, empresaId, row.cliente_id);
            clienteNombre = c?.nombre || '';
        } catch (_) { /* ignore */ }
    }
    let clienteEmailFmt = extras.clienteEmail != null ? String(extras.clienteEmail).trim() : '';
    let clienteTelefonoFmt = extras.clienteTelefono != null ? String(extras.clienteTelefono).trim() : '';
    if ((!clienteEmailFmt || !clienteTelefonoFmt) && row.cliente_id) {
        try {
            const cx = await obtenerClientePorId(null, empresaId, row.cliente_id);
            if (!clienteEmailFmt) clienteEmailFmt = (cx?.email || '').trim();
            if (!clienteTelefonoFmt) clienteTelefonoFmt = (cx?.telefono || '').trim();
        } catch (_) { /* ignore */ }
    }
    let valoresRow = row.valores;
    if (typeof valoresRow === 'string') {
        try {
            valoresRow = JSON.parse(valoresRow);
        } catch {
            valoresRow = {};
        }
    }
    if (!valoresRow || typeof valoresRow !== 'object') valoresRow = {};

    const fechaLlegada = _formatearFechaReserva(row.fecha_llegada, localeFecha);
    const fechaSalida = _formatearFechaReserva(row.fecha_salida, localeFecha);
    const noches = row.total_noches != null ? String(row.total_noches) : '';
    const totalNum = Number(valoresRow.valorHuesped || 0);
    const descCuponNum = Number(valoresRow.descuentoCupon || 0);
    const precioListaNum = descCuponNum > 0 && totalNum > 0 ? totalNum + descCuponNum : totalNum;
    const precioListaFmt = precioListaNum > 0 ? _fmtMonedaCLP(precioListaNum, localeFecha) : '';
    const descuentoCuponFmt = descCuponNum > 0 ? _fmtMonedaCLP(descCuponNum, localeFecha) : '';
    const lineaDescuentoCupon = descCuponNum > 0
        ? (idiomaPorDefecto === 'en'
            ? `Discount (coupon): −${descuentoCuponFmt}`
            : `Descuento (cupón): −${descuentoCuponFmt}`)
        : '';
    const canalNombre = extras.canalNombre != null ? String(extras.canalNombre).trim()
        : (row.canal_nombre != null ? String(row.canal_nombre).trim() : '');
    const panelOrigin = getAdminPanelOrigin();
    const idReservaInterno = row.id != null ? String(row.id) : '';
    const linkGestionReserva = panelOrigin && idReservaInterno
        ? `${String(panelOrigin).replace(/\/$/, '')}/gestionar-reservas?reservaId=${encodeURIComponent(idReservaInterno)}`
        : '';
    const precio = totalNum > 0 ? _fmtMonedaCLP(totalNum, localeFecha) : '';
    const baseUrl = await obtenerBaseUrlPublica(empresaId);
    const plataformaTenantUrl = buildPlatformTenantOrigin(ctx) || baseUrl;
    const refCanalPublico = row.id_reserva_canal != null ? String(row.id_reserva_canal).trim() : '';
    const linkConfirmacionPublica = baseUrl && refCanalPublico
        ? `${String(baseUrl).replace(/\/$/, '')}/confirmacion?reservaId=${encodeURIComponent(refCanalPublico)}`
        : '';
    const linkTerminosCondiciones = buildTenantTermsUrl(ctx)
        || (baseUrl ? `${String(baseUrl).replace(/\/$/, '')}/terminos-y-condiciones` : '');
    const empresaLogoUrl = _empresaLogoUrlFromWebsiteSettings(ws);
    const empresaLogoHtml = _buildEmpresaLogoEmailHtml(empresaLogoUrl, ctx.nombre);

    const metaParsed = _parseReservaMetadata(row.metadata);
    const pv = metaParsed.precioCheckoutVerificado && typeof metaParsed.precioCheckoutVerificado === 'object'
        ? metaParsed.precioCheckoutVerificado
        : null;

    let detallePropiedades = row.alojamiento_nombre ? `• ${row.alojamiento_nombre}` : '';
    const rgGrupo = metaParsed.reservaWebGrupo;
    if (rgGrupo && Array.isArray(rgGrupo.alojamientosNombres) && rgGrupo.alojamientosNombres.length) {
        detallePropiedades = rgGrupo.alojamientosNombres
            .filter(Boolean)
            .map((n) => `• ${String(n).trim()}`)
            .join('\n');
    } else if (row.alojamiento_nombre && String(row.alojamiento_nombre).includes(' + ')) {
        detallePropiedades = String(row.alojamiento_nombre)
            .split(/\s*\+\s*/)
            .filter(Boolean)
            .map((n) => `• ${n.trim()}`)
            .join('\n');
    }

    const propiedadIdRow = row.propiedad_id != null ? String(row.propiedad_id).trim() : '';
    const linkFotosAlojamiento = _buildPublicPropiedadPageUrl(plataformaTenantUrl, propiedadIdRow);
    const enlacesFotosAlojamientosHtml = _buildEnlacesFotosAlojamientosHtml(plataformaTenantUrl, metaParsed);

    const desglosePrecioHtml = _buildDesglosePrecioEmailCard({
        idiomaEn: idiomaPorDefecto === 'en',
        localeFecha,
        valoresRow,
        pv,
        totalFmt: precio,
        precioListaFmt,
        lineaDescuentoCupon,
        descCuponNum,
    });
    const desglosePrecioTexto = _buildDesglosePrecioTexto({
        idiomaEn: idiomaPorDefecto === 'en',
        localeFecha,
        valoresRow,
        pv,
        totalFmt: precio,
        precioListaFmt,
        lineaDescuentoCupon,
        descCuponNum,
    });

    const linkResena = extras.linkResena || (extras.tokenResena ? `${baseUrl}/r/${extras.tokenResena}` : '');
    const depositoCfg = resolveDepositoReservaWeb(ctx.configuracion?.websiteSettings?.booking, totalNum);
    const porcentajeAbonoNum = (depositoCfg.tipo === 'monto_fijo' && totalNum > 0)
        ? Math.round((depositoCfg.montoDeposito / totalNum) * 100)
        : depositoCfg.porcentaje;
    const montoAbonoNum = depositoCfg.montoDeposito;
    const montoAbono = montoAbonoNum > 0 ? _fmtMonedaCLP(montoAbonoNum, localeFecha) : '';
    const saldoPendienteNum = totalNum > 0 ? Math.max(0, totalNum - montoAbonoNum) : 0;
    const saldoPendiente = saldoPendienteNum > 0 ? _fmtMonedaCLP(saldoPendienteNum, localeFecha) : '';
    const estadoPago = depositoCfg.activo && montoAbonoNum > 0
        ? (idiomaPorDefecto === 'en' ? 'Pending deposit payment' : 'Pendiente de abono')
        : (idiomaPorDefecto === 'en' ? 'No deposit required at booking' : 'Sin abono requerido al reservar');
    const horasPlazo = depositoCfg.horasLimite;
    const plazo = new Date();
    plazo.setHours(plazo.getHours() + horasPlazo);
    const plazoAbono = idiomaPorDefecto === 'en'
        ? plazo.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : plazo.toLocaleString('es-CL', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    const datosTransferencia = _armarDatosTransferenciaTexto(ctx.configuracion?.datosBancarios);
    const depositoNota = _htmlToTextLite(ctx.configuracion?.websiteSettings?.booking?.depositoNotaHtml);
    const linkPago = '';
    const horaLlegadaEstimada = extras.horaLlegadaEstimada != null
        ? String(extras.horaLlegadaEstimada).trim().slice(0, 120)
        : '';
    const rawMedio = extras.medioLlegada != null
        ? String(extras.medioLlegada).trim().toLowerCase().replace(/\s+/g, '')
        : '';
    const medioLlegada = ['auto', 'avion', 'bus', 'otro'].includes(rawMedio) ? rawMedio : '';
    const referenciaTransporte = extras.referenciaTransporte != null
        ? String(extras.referenciaTransporte).trim().slice(0, 100)
        : '';
    const documentoRefViajero = extras.documentoRefViajero != null
        ? String(extras.documentoRefViajero).replace(/[^A-Za-z0-9]/g, '').slice(0, 10)
        : '';
    const medioLlegadaTexto = _medioLlegadaEtiqueta(medioLlegada, idiomaPorDefecto);
    const comentariosHuesped = extras.comentariosHuesped != null
        ? String(extras.comentariosHuesped).trim().slice(0, 2000)
        : '';
    const comentariosHuespedAdmin = comentariosHuesped
        || (idiomaPorDefecto === 'en' ? 'No guest comments were recorded.' : 'Sin comentarios registrados por el huésped.');

    const ci = extras.checkInIdentidad && typeof extras.checkInIdentidad === 'object'
        ? extras.checkInIdentidad
        : null;
    const documentoTipoCodigo = ci ? String(ci.documentoTipo || '').trim().toLowerCase() : '';
    const documentoNumeroCompleto = ci ? String(ci.documentoNumero || '').trim() : '';
    const documentoNumeroEnmascarado = documentoNumeroCompleto
        ? enmascararDocumentoParaUiPublica(documentoNumeroCompleto)
        : '';
    const documentoTipoEtiqueta = documentoTipoCodigo
        ? _docTipoIdentidadEtiqueta(documentoTipoCodigo, idiomaPorDefecto)
        : '';
    const nacionalidadHuespedCheckin = ci && ci.nacionalidad != null
        ? String(ci.nacionalidad).trim().slice(0, 50)
        : '';
    const fechaNacimientoHuespedCheckin = ci && ci.fechaNacimiento != null
        ? String(ci.fechaNacimiento).trim().slice(0, 12)
        : '';

    const cia = extras.checkInIdentidadAceptacion && typeof extras.checkInIdentidadAceptacion === 'object'
        ? extras.checkInIdentidadAceptacion
        : null;
    const checkinIdentidadAceptadoAt = cia && cia.aceptadoAt != null
        ? String(cia.aceptadoAt).trim().slice(0, 32)
        : '';
    const checkinIdentidadPoliticaVersion = cia && cia.politicaVersion != null
        ? String(cia.politicaVersion).trim().slice(0, 80)
        : '';
    const consentimientoIdentidadLinea = checkinIdentidadAceptadoAt
        ? (idiomaPorDefecto === 'en'
            ? `Consent for identity data (check-in): ${checkinIdentidadAceptadoAt.slice(0, 19).replace('T', ' ')}${checkinIdentidadPoliticaVersion ? ` · ${checkinIdentidadPoliticaVersion}` : ''}`
            : `Consentimiento datos identidad (check-in): ${checkinIdentidadAceptadoAt.slice(0, 19).replace('T', ' ')}${checkinIdentidadPoliticaVersion ? ` · ${checkinIdentidadPoliticaVersion}` : ''}`)
        : '';

    let listaIdentidadAcompanantes = '';
    const accRaw = extras.checkInIdentidadAcompanantes;
    if (Array.isArray(accRaw) && accRaw.length) {
        const lines = accRaw.map((a, idx) => {
            const t = String(a.documentoTipo || '').trim().toLowerCase();
            const num = String(a.documentoNumero || '').trim();
            if (!t || !num) return '';
            const mask = enmascararDocumentoParaUiPublica(num);
            const tl = _docTipoIdentidadEtiqueta(t, idiomaPorDefecto);
            return idiomaPorDefecto === 'en'
                ? `Guest ${idx + 2}: ${tl} ${mask}`
                : `Huésped ${idx + 2}: ${tl} ${mask}`;
        }).filter(Boolean);
        listaIdentidadAcompanantes = lines.join('\n');
    }
    const resumenTotalPrefix = idiomaPorDefecto === 'en' ? 'Total amount' : 'Total';

    return {
        reservaId: String(row.id_reserva_canal || row.id || ''),
        propuestaId: String(row.id_reserva_canal || row.id || ''),
        clienteNombre,
        nombreCliente: clienteNombre,
        fechaLlegada,
        fechaSalida,
        fechasEstadiaTexto: idiomaPorDefecto === 'en' ? `${fechaLlegada} to ${fechaSalida}` : `${fechaLlegada} al ${fechaSalida}`,
        totalNoches: noches,
        noches,
        personas: String(row.cantidad_huespedes || ''),
        numeroHuespedes: String(row.cantidad_huespedes || ''),
        nombrePropiedad: row.alojamiento_nombre || '',
        propiedadesNombres: row.alojamiento_nombre || '',
        detallePropiedades,
        precioFinal: precio,
        montoTotal: precio,
        estadoPago,
        ESTADO_PAGO: estadoPago,
        saldoPendiente: saldoPendiente || precio,
        resumenValores: precio ? `${resumenTotalPrefix}: ${precio}` : '',
        porcentajeAbono: depositoCfg.activo ? `${porcentajeAbonoNum}%` : '0%',
        montoAbono,
        plazoAbono,
        datosBancarios: datosTransferencia,
        datosBancariosTexto: datosTransferencia,
        depositoNota,
        notaDeposito: depositoNota,
        linkPago,
        urlPago: linkPago,
        empresaGoogleMapsLink: ctx.configuracion?.google_maps_url || '',
        EMPRESA_GOOGLE_MAPS_LINK: ctx.configuracion?.google_maps_url || '',
        empresaNombre: ctx.nombre,
        empresaWebsite: ctx.website,
        empresaLogoUrl,
        EMPRESA_LOGO_URL: empresaLogoUrl,
        empresaLogoHtml,
        EMPRESA_LOGO_HTML: empresaLogoHtml,
        contactoNombre: ctx.contactoNombre,
        contactoEmail: ctx.contactoEmail,
        contactoTelefono: ctx.contactoTelefono,
        usuarioNombre: ctx.contactoNombre,
        usuarioEmail: ctx.contactoEmail,
        usuarioTelefono: ctx.contactoTelefono,
        fechaEmision: idiomaPorDefecto === 'en'
            ? new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
            : new Date().toLocaleDateString('es-CL'),
        idiomaPorDefecto,
        localeFecha,
        htmlLang: idiomaPorDefecto === 'en' ? 'en' : 'es',
        linkResena,
        LINK_RESEÑA: linkResena,
        linkCheckinOnline,
        linkManualHuesped,
        linkManualHuespedPdf,
        LINK_CHECKIN_ONLINE: linkCheckinOnline,
        LINK_MANUAL_HUESPED: linkManualHuesped,
        LINK_MANUAL_HUESPED_PDF: linkManualHuespedPdf,
        horaLlegadaEstimada,
        HORA_LLEGADA_ESTIMADA: horaLlegadaEstimada,
        medioLlegada,
        medioLlegadaTexto,
        MEDIO_LLEGADA: medioLlegada,
        MEDIO_LLEGADA_TEXTO: medioLlegadaTexto,
        referenciaTransporte,
        REFERENCIA_TRANSPORTE: referenciaTransporte,
        documentoRefViajero,
        DOC_REF_VIAJERO: documentoRefViajero,
        comentariosHuesped,
        comentariosHuespedAdmin,
        NOTAS_HUESPED_CHECKOUT: comentariosHuesped,
        checkInIdentidad: ci || null,
        documentoTipoCodigo,
        documentoTipoEtiqueta,
        DOC_TIPO_CODIGO: documentoTipoCodigo,
        DOC_TIPO_ETIQUETA: documentoTipoEtiqueta,
        documentoNumeroCompleto,
        documentoNumeroEnmascarado,
        DOC_NUMERO_COMPLETO: documentoNumeroCompleto,
        DOC_NUMERO_ENMASCARADO: documentoNumeroEnmascarado,
        nacionalidadHuespedCheckin,
        NACIONALIDAD_HUESPED_CHECKIN: nacionalidadHuespedCheckin,
        fechaNacimientoHuespedCheckin,
        FECHA_NACIMIENTO_HUESPED_CHECKIN: fechaNacimientoHuespedCheckin,
        checkInIdentidadAceptacion: cia,
        checkinIdentidadAceptadoAt,
        CHECKIN_IDENTIDAD_ACEPTADO_AT: checkinIdentidadAceptadoAt,
        checkinIdentidadPoliticaVersion,
        CHECKIN_IDENTIDAD_POLITICA_VERSION: checkinIdentidadPoliticaVersion,
        consentimientoIdentidadLinea,
        CONSENTIMIENTO_IDENTIDAD_LINEA: consentimientoIdentidadLinea,
        listaIdentidadAcompanantes,
        LISTA_IDENTIDAD_ACOMPANANTES: listaIdentidadAcompanantes,
        mensajeConsulta: extras.mensajeConsulta || '',
        MENSAJE_CONSULTA: extras.mensajeConsulta || '',
        asuntoConsultaUsuario: extras.asuntoConsultaUsuario || '',
        CONSULTA_ASUNTO_USUARIO: extras.asuntoConsultaUsuario || '',
        clienteEmail: clienteEmailFmt,
        CLIENTE_EMAIL: clienteEmailFmt,
        clienteTelefono: clienteTelefonoFmt,
        CLIENTE_TELEFONO: clienteTelefonoFmt,
        canalNombre,
        CANAL_NOMBRE: canalNombre,
        precioLista: precioListaFmt,
        PRECIO_LISTA: precioListaFmt,
        descuentoCupon: descuentoCuponFmt,
        DESCUENTO_CUPON: descuentoCuponFmt,
        lineaDescuentoCupon,
        LINEA_DESCUENTO_CUPON: lineaDescuentoCupon,
        linkGestionReserva,
        LINK_GESTION_RESERVA: linkGestionReserva,
        linkConfirmacionPublica,
        LINK_CONFIRMACION_PUBLICA: linkConfirmacionPublica,
        linkTerminosCondiciones,
        LINK_TERMINOS_CONDICIONES: linkTerminosCondiciones,
        URL_TERMINOS: linkTerminosCondiciones,
        COMENTARIOS_HUESPED: comentariosHuesped,
        COMENTARIOS_HUESPED_ADMIN: comentariosHuespedAdmin,
        linkFotosAlojamiento,
        LINK_FOTOS_ALOJAMIENTO: linkFotosAlojamiento,
        enlacesFotosAlojamientosHtml,
        ENLACES_FOTOS_ALOJAMIENTOS_HTML: enlacesFotosAlojamientosHtml,
        desglosePrecioHtml,
        DESGLOSE_PRECIO_HTML: desglosePrecioHtml,
        desglosePrecioTexto,
        DESGLOSE_PRECIO_TEXTO: desglosePrecioTexto,
    };
}

/** @param {string} nombreEstado @param {string|null} [semanticaPrincipal] — desde `estados_reserva` si se resolvió */
function esEstadoCancelacion(nombreEstado, semanticaPrincipal) {
    return esEstadoPrincipalCancelacionSync(nombreEstado, semanticaPrincipal);
}

module.exports = {
    /** @deprecated usar DISPARADOR_KEYS desde plantillasService */
    DISPARADOR_DB_KEYS: DISPARADOR_KEYS,
    DISPARADOR_KEYS,
    EVENTO_POR_DISPARADOR,
    obtenerPlantillaPorDisparador,
    obtenerPlantillaActivaPorId,
    enviarPorDisparador,
    enviarNotificacionInterna,
    obtenerBaseUrlPublica,
    resolverLinkResenaOutbound,
    construirVariablesDesdeReserva,
    esEstadoCancelacion,
};
