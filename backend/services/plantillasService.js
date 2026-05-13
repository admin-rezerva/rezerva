// backend/services/plantillasService.js
const pool = require('../db/postgres');
const admin = require('firebase-admin');
const { generateForTask } = require('./aiContentService');
const { AI_TASK } = require('./ai/aiEnums');
const { sanitizeInput } = require('./ai/prompts/sanitizer');
const { promptGenerarPlantillaMensaje, inferirModoPlantilla } = require('./ai/prompts/plantillasIa');
const { reemplazarEtiquetasEnTexto } = require('./plantillasEtiquetasCatalog');
const {
    generarPlantillaConfirmacionAdminHtml,
    generarPlantillaConfirmacionHuespedHtml,
} = require('./plantillasEmailTemplates');

// --- Lógica para Tipos de Plantilla (sin tabla PG — Firestore-only) ---

const crearTipoPlantilla = async (db, empresaId, datosTipo) => {
    if (!empresaId || !datosTipo.nombre) throw new Error('El nombre del tipo de plantilla es requerido.');
    const tipoRef = db.collection('empresas').doc(empresaId).collection('tiposPlantilla').doc();
    const nuevoTipo = { id: tipoRef.id, nombre: datosTipo.nombre, descripcion: datosTipo.descripcion || '', fechaCreacion: admin.firestore.FieldValue.serverTimestamp() };
    await tipoRef.set(nuevoTipo);
    return nuevoTipo;
};

const obtenerTiposPlantilla = async (db, empresaId) => {
    const snapshot = await db.collection('empresas').doc(empresaId).collection('tiposPlantilla').orderBy('nombre').get();
    if (snapshot.empty) return [];
    return snapshot.docs.map(doc => doc.data());
};

const actualizarTipoPlantilla = async (db, empresaId, tipoId, datosActualizados) => {
    await db.collection('empresas').doc(empresaId).collection('tiposPlantilla').doc(tipoId).update({ ...datosActualizados, fechaActualizacion: admin.firestore.FieldValue.serverTimestamp() });
    return { id: tipoId, ...datosActualizados };
};

const eliminarTipoPlantilla = async (db, empresaId, tipoId) => {
    const snap = await db.collection('empresas').doc(empresaId).collection('plantillasMensajes').where('tipoId', '==', tipoId).limit(1).get();
    if (!snap.empty) throw new Error('No se puede eliminar el tipo porque está siendo usado por al menos una plantilla.');
    await db.collection('empresas').doc(empresaId).collection('tiposPlantilla').doc(tipoId).delete();
};

/** Claves de disparadores automáticos (futuro motor de correos). La propuesta sigue usando checkbox + plantilla en UI. */
const DISPARADOR_KEYS = [
    'reserva_confirmada',
    'reserva_cancelada',
    'reserva_modificada',
    'recordatorio_pre_llegada',
    'post_estadia_evaluacion',
    'consulta_contacto',
    'notificacion_interna',
];

const MAX_TARJETAS_CORREO = 18;
const MAX_TARJETA_TITULO = 120;
const MAX_TARJETA_CUERPO = 4000;

function normalizeTarjetasCorreo(input) {
    return (Array.isArray(input) ? input : [])
        .filter((x) => x && typeof x === 'object')
        .map((x) => ({
            titulo: String(x.titulo ?? '').trim().slice(0, MAX_TARJETA_TITULO),
            cuerpo: String(x.cuerpo ?? '').trim().slice(0, MAX_TARJETA_CUERPO),
        }))
        .filter((x) => x.titulo || x.cuerpo)
        .slice(0, MAX_TARJETAS_CORREO);
}

function normalizeEmailConfig(input) {
    const disparadores = Object.fromEntries(DISPARADOR_KEYS.map((k) => [k, false]));
    if (input && typeof input === 'object' && input.disparadores && typeof input.disparadores === 'object') {
        DISPARADOR_KEYS.forEach((k) => {
            if (input.disparadores[k] !== undefined) disparadores[k] = Boolean(input.disparadores[k]);
        });
    }
    const out = {
        permitirEnvioCorreo: input && input.permitirEnvioCorreo === false ? false : true,
        disparadores,
        /** Si true, el cuerpo de la plantilla ya es HTML (sin conversion texto→HTML). */
        cuerpoEsHtml: !!(input && input.cuerpoEsHtml === true),
    };
    const tarjetasCorreo = normalizeTarjetasCorreo(input?.tarjetasCorreo || input?.tarjetasConfirmacionHuesped);
    if (tarjetasCorreo.length) {
        out.tarjetasCorreo = tarjetasCorreo;
        // Compatibilidad con plantillas ya creadas durante la primera iteración de confirmación huésped.
        out.tarjetasConfirmacionHuesped = tarjetasCorreo;
    }
    return out;
}

function mapPlantillaRow(r) {
    const emailConfig = normalizeEmailConfig(r.email_config);
    return {
        id: r.id,
        nombre: r.nombre,
        tipoId: r.tipo,
        texto: r.texto,
        asunto: r.asunto != null ? String(r.asunto) : '',
        emailConfig,
        enviarPorEmail: emailConfig.permitirEnvioCorreo,
    };
}

// --- Lógica para Plantillas de Mensajes (PG: tabla plantillas) ---

const crearPlantilla = async (_db, empresaId, datosPlantilla) => {
    if (!empresaId || !datosPlantilla.nombre || !datosPlantilla.texto) throw new Error('Nombre y texto de la plantilla son requeridos.');
    const asunto = datosPlantilla.asunto != null ? String(datosPlantilla.asunto).trim() : '';
    const emailConfig = normalizeEmailConfig(datosPlantilla.emailConfig || datosPlantilla.email_config);
    const { rows } = await pool.query(
        `INSERT INTO plantillas (empresa_id, nombre, tipo, texto, activa, asunto, email_config)
         VALUES ($1,$2,$3,$4,true,$5,$6::jsonb) RETURNING id, nombre, tipo, texto, activa, asunto, email_config`,
        [empresaId, datosPlantilla.nombre, datosPlantilla.tipoId || null, datosPlantilla.texto, asunto, JSON.stringify(emailConfig)]
    );
    return mapPlantillaRow(rows[0]);
};

const obtenerPlantillasPorEmpresa = async (_db, empresaId) => {
    const { rows } = await pool.query(
        `SELECT id, nombre, tipo, texto, activa, COALESCE(asunto,'') AS asunto, COALESCE(email_config,'{}'::jsonb) AS email_config
         FROM plantillas WHERE empresa_id=$1 AND activa=true ORDER BY nombre`,
        [empresaId]
    );
    return rows.map(mapPlantillaRow);
};

const actualizarPlantilla = async (_db, empresaId, plantillaId, datosActualizados) => {
    const sets = [];
    const params = [];
    if (datosActualizados.nombre !== undefined) { sets.push(`nombre=$${params.push(datosActualizados.nombre)}`); }
    if (datosActualizados.texto !== undefined) { sets.push(`texto=$${params.push(datosActualizados.texto)}`); }
    if (datosActualizados.tipoId !== undefined) { sets.push(`tipo=$${params.push(datosActualizados.tipoId)}`); }
    if (datosActualizados.asunto !== undefined) { sets.push(`asunto=$${params.push(String(datosActualizados.asunto || '').trim())}`); }
    if (datosActualizados.emailConfig !== undefined || datosActualizados.email_config !== undefined) {
        const { rows: prevEcRows } = await pool.query(
            `SELECT COALESCE(email_config,'{}'::jsonb) AS email_config FROM plantillas WHERE id=$1 AND empresa_id=$2`,
            [plantillaId, empresaId]
        );
        const prevEc = prevEcRows[0]?.email_config && typeof prevEcRows[0].email_config === 'object'
            ? prevEcRows[0].email_config
            : {};
        const incoming = datosActualizados.emailConfig || datosActualizados.email_config || {};
        const merged = { ...prevEc, ...incoming };
        if (incoming.disparadores && typeof incoming.disparadores === 'object') {
            merged.disparadores = incoming.disparadores;
        }
        const ec = normalizeEmailConfig(merged);
        sets.push(`email_config=$${params.push(JSON.stringify(ec))}::jsonb`);
    }
    if (sets.length) {
        sets.push('updated_at=NOW()');
        params.push(plantillaId, empresaId);
        await pool.query(`UPDATE plantillas SET ${sets.join(',')} WHERE id=$${params.length - 1} AND empresa_id=$${params.length}`, params);
    }
    const { rows } = await pool.query(
        `SELECT id, nombre, tipo, texto, activa, COALESCE(asunto,'') AS asunto, COALESCE(email_config,'{}'::jsonb) AS email_config
         FROM plantillas WHERE id=$1 AND empresa_id=$2`,
        [plantillaId, empresaId]
    );
    if (!rows[0]) return { id: plantillaId, ...datosActualizados };
    return mapPlantillaRow(rows[0]);
};

const eliminarPlantilla = async (_db, empresaId, plantillaId) => {
    await pool.query('UPDATE plantillas SET activa=false, updated_at=NOW() WHERE id=$1 AND empresa_id=$2', [plantillaId, empresaId]);
};

const obtenerPlantilla = async (_db, empresaId, plantillaId) => {
    const { rows } = await pool.query(
        `SELECT id, nombre, tipo, texto, activa, COALESCE(asunto,'') AS asunto, COALESCE(email_config,'{}'::jsonb) AS email_config
         FROM plantillas WHERE id=$1 AND empresa_id=$2`,
        [plantillaId, empresaId]
    );
    if (!rows[0]) throw new Error(`Plantilla ${plantillaId} no encontrada`);
    return mapPlantillaRow(rows[0]);
};

// --- Funciones de procesamiento de texto (sin DB) ---

const reemplazarEtiquetas = (texto, datos) => reemplazarEtiquetasEnTexto(texto, datos);

function _normalizarTextoPlantillaRender(texto) {
    // Corrige errores comunes de edición en plantillas (ej: "50%%").
    return String(texto || '').replace(/%%/g, '%');
}

const HTML_EMAIL_MARKER = '[[HTML_EMAIL]]';

/**
 * Plantillas guardadas en PG antes de nuevas etiquetas: el nombre puede no
 * disparar `inferirModoPlantilla`, pero el HTML sigue siendo el layout estándar.
 */
function _textoPareceLayoutConfirmacionAdmin(texto) {
    const s = String(texto || '');
    if (!s.includes(HTML_EMAIL_MARKER) || !s.includes('[DESGLOSE_PRECIO_HTML]')) return false;
    if (s.includes('[LINK_CONFIRMACION_PUBLICA]')) return false;
    return s.includes('Nueva reserva confirmada')
        || (s.includes('[LINK_GESTION_RESERVA]') && s.includes('Ver reserva en el panel'))
        || (s.includes('Abono requerido:') && s.includes('Estado de pago'));
}

function _textoPareceLayoutConfirmacionHuesped(texto) {
    const s = String(texto || '');
    if (!s.includes(HTML_EMAIL_MARKER) || !s.includes('[DESGLOSE_PRECIO_HTML]')) return false;
    if (s.includes('Nueva reserva confirmada')) return false;
    if (s.includes('[LINK_GESTION_RESERVA]') && s.includes('Ver reserva en el panel') && !s.includes('[LINK_CONFIRMACION_PUBLICA]')) {
        return false;
    }
    if (s.includes('Abono requerido:') && s.includes('Estado de pago')) return false;
    return s.includes('[LINK_CONFIRMACION_PUBLICA]') || s.includes('¡Tu reserva está confirmada!');
}

/** Si el HTML guardado es layout estándar antiguo sin las nuevas etiquetas, insertarlas tras el desglose. */
function _ensureBloqueAbonoPlaceholdersEnTexto(texto) {
    let t = String(texto || '');
    if (!t.includes('[DESGLOSE_PRECIO_HTML]')) return t;
    if (t.includes('[BLOQUE_ABONO_TRANSFERENCIA_HTML]') || t.includes('[BLOQUE_ABONO_TRANSFERENCIA_ADMIN_HTML]')) {
        return t;
    }
    const esAdminLegacy = t.includes('Abono requerido:') && t.includes('Estado de pago');
    const esAdminShell = t.includes('[LINK_GESTION_RESERVA]') && t.includes('Ver reserva en el panel') && !t.includes('[LINK_CONFIRMACION_PUBLICA]');
    if (esAdminLegacy || esAdminShell) {
        return t.replace(/(\[DESGLOSE_PRECIO_HTML\])(\s*)/, '$1\n    [BLOQUE_ABONO_TRANSFERENCIA_ADMIN_HTML]\n');
    }
    if (t.includes('[LINK_CONFIRMACION_PUBLICA]')) {
        return t.replace(/(\[DESGLOSE_PRECIO_HTML\])(\s*)/, '$1\n    [BLOQUE_ABONO_TRANSFERENCIA_HTML]\n');
    }
    return t;
}

const textoAHtml = (texto) => {
    if (!texto) return '';
    let html = texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    html = html.replace(/📌\s*(.+?)(?=\n|$)/g, '<h2 style="color: #1e40af; margin-top: 20px;">📌 $1</h2>');
    html = html.replace(/⚠️\s*(.+?)(?=\n|$)/g, '<h3 style="color: #d97706; margin-top: 15px;">⚠️ $1</h3>');
    html = html.replace(/✅\s*(.+?)(?=\n|$)/g, '<h3 style="color: #059669; margin-top: 15px;">✅ $1</h3>');
    html = html.replace(/\n/g, '<br>');
    return `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">${html}</div>`;
};

/**
 * Cuerpo ya en HTML (plantilla panel / IA): sin escapar etiquetas angulares.
 * Marcador opcional [[HTML_EMAIL]] al inicio (se elimina al renderizar).
 */
function renderCuerpoPlantillaHtml(textoConEtiquetas, emailConfig) {
    const ec = emailConfig || {};
    const raw = String(textoConEtiquetas || '');
    const trimmedLeft = raw.replace(/^\uFEFF?\s*/, '');
    const useMarker = trimmedLeft.toUpperCase().startsWith(HTML_EMAIL_MARKER.toUpperCase());
    const looksLikeHtml = /^<\s*(?:!DOCTYPE|html|body|table|div|section|article)\b/i.test(trimmedLeft);
    if (ec.cuerpoEsHtml === true || useMarker || looksLikeHtml) {
        let body = raw;
        if (useMarker) {
            body = body.replace(/^\s*\[\[HTML_EMAIL\]\]\s*/i, '');
        }
        return body.trim();
    }
    return textoAHtml(raw);
}

const procesarPlantilla = async (db, empresaId, plantillaId, datos) => {
    const plantilla = await obtenerPlantilla(db, empresaId, plantillaId);
    let modoNombre = inferirModoPlantilla(plantilla.nombre || '');
    if (modoNombre === 'generico_html' && plantilla.texto) {
        if (_textoPareceLayoutConfirmacionAdmin(plantilla.texto)) {
            modoNombre = 'admin_confirmacion_reserva';
        } else if (_textoPareceLayoutConfirmacionHuesped(plantilla.texto)) {
            modoNombre = 'huesped_confirmacion';
        }
    }
    const instruccionesTarjetas = plantilla.emailConfig?.tarjetasCorreo || plantilla.emailConfig?.tarjetasConfirmacionHuesped || [];
    const fixedTemplate = modoNombre === 'admin_confirmacion_reserva'
        ? generarPlantillaConfirmacionAdminHtml({
            nombreEmpresa: datos?.EMPRESA_NOMBRE || datos?.empresaNombre || '',
            instruccionesTarjetas,
        })
        : (modoNombre === 'huesped_confirmacion'
            ? generarPlantillaConfirmacionHuespedHtml({
                nombreEmpresa: datos?.EMPRESA_NOMBRE || datos?.empresaNombre || '',
                instruccionesTarjetas,
            })
            : null);
    const textoBaseRaw = fixedTemplate?.texto || plantilla.texto;
    const textoBase = _ensureBloqueAbonoPlaceholdersEnTexto(textoBaseRaw);
    const textoConEtiquetas = _normalizarTextoPlantillaRender(reemplazarEtiquetas(textoBase, datos));
    const asuntoBase = fixedTemplate?.asunto || ((plantilla.asunto && String(plantilla.asunto).trim()) ? plantilla.asunto : plantilla.nombre);
    const asuntoFinal = _normalizarTextoPlantillaRender(reemplazarEtiquetas(asuntoBase, datos));
    const contenido = renderCuerpoPlantillaHtml(textoConEtiquetas, plantilla.emailConfig);
    return { plantilla, contenido, contenidoTexto: textoConEtiquetas, asunto: asuntoFinal };
};

const verificarEnvioAutomatico = async (_db, _empresaId, _plantillaId) => {
    return false; // reservado; la lógica vive en email_config.disparadores cuando exista el motor de envíos
};

async function _obtenerNombreEmpresaPg(empresaId) {
    const { rows } = await pool.query('SELECT nombre FROM empresas WHERE id = $1', [empresaId]);
    return rows[0]?.nombre || 'Tu empresa';
}

/**
 * Genera borrador de plantilla (nombre, asunto, texto) con IA según el tipo de plantilla y etiquetas del motor.
 * @param {FirebaseFirestore.Firestore|object} db
 * @param {string} empresaId
 * @param {{ tipoId: string, tipoNombre?: string, nombreBorrador?: string, instrucciones?: string, instruccionesTarjetas?: string }} body
 */
const generarPlantillaConIa = async (db, empresaId, body = {}) => {
    const tipoId = String(body.tipoId || '').trim();
    if (!tipoId) throw new Error('Debe indicar el tipo de plantilla (tipoId).');

    let tipoNombre = String(body.tipoNombre || '').trim();
    if (!tipoNombre) {
        const tipos = await obtenerTiposPlantilla(db, empresaId);
        const t = tipos.find((x) => String(x.id) === tipoId);
        tipoNombre = t?.nombre || 'General';
    }

    const nombreEmpresa = await _obtenerNombreEmpresaPg(empresaId);
    const nombreBorrador = sanitizeInput(body.nombreBorrador || '', AI_TASK.TEMPLATE_GENERATION, { empresaId, campo: 'nombrePlantillaIA' });
    const instrucciones = sanitizeInput(body.instrucciones || body.instruccionesExtra || '', AI_TASK.TEMPLATE_GENERATION, { empresaId, campo: 'instruccionesPlantillaIA' });
    const instruccionesTarjetas = sanitizeInput(body.instruccionesTarjetas || '', AI_TASK.TEMPLATE_GENERATION, { empresaId, campo: 'instruccionesTarjetasIA' });
    const modo = inferirModoPlantilla(`${tipoNombre} ${nombreBorrador}`);

    if (modo === 'huesped_confirmacion') {
        return generarPlantillaConfirmacionHuespedHtml({
            nombreEmpresa,
            instruccionesTarjetas,
            nombreBorrador,
        });
    }
    if (modo === 'admin_confirmacion_reserva') {
        return generarPlantillaConfirmacionAdminHtml({ nombreEmpresa, nombreBorrador, instruccionesTarjetas });
    }

    const prompt = promptGenerarPlantillaMensaje({
        nombreEmpresa,
        tipoNombre,
        nombreBorrador,
        instrucciones,
        instruccionesTarjetas,
    });

    const raw = await generateForTask(AI_TASK.TEMPLATE_GENERATION, prompt, { empresaId });
    if (!raw || typeof raw !== 'object') throw new Error('La IA no devolvió un resultado válido. Intenta de nuevo.');

    let nombre = String(raw.nombre ?? '').trim().slice(0, 120);
    const asunto = String(raw.asunto ?? raw.subject ?? '').trim().slice(0, 220);
    const texto = String(
        raw.texto ?? raw.cuerpo ?? raw.contenido ?? raw.body ?? raw.html ?? ''
    ).trim().slice(0, 16000);

    if (!texto) throw new Error('La IA devolvió el cuerpo vacío.');

    if (!nombre) nombre = (nombreBorrador || `Plantilla ${tipoNombre}`).slice(0, 120);

    return { nombre, asunto, texto, tipoNombreUsado: tipoNombre };
};

module.exports = {
    crearTipoPlantilla, obtenerTiposPlantilla, actualizarTipoPlantilla, eliminarTipoPlantilla,
    crearPlantilla, obtenerPlantillasPorEmpresa, actualizarPlantilla, eliminarPlantilla,
    obtenerPlantilla, reemplazarEtiquetas, textoAHtml, procesarPlantilla, verificarEnvioAutomatico,
    generarPlantillaConIa,
    DISPARADOR_KEYS, normalizeEmailConfig,
    HTML_EMAIL_MARKER,
    renderCuerpoPlantillaHtml,
};
