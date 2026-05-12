const pool = require('../db/postgres');
const { resolveDepositoReservaWeb } = require('./depositoReservaWebService');
const { parseValoresReservaRow, precioFinalDesdeReservaPgRow } = require('./reservaRowValores');
const { normalizeWebsiteImageUrl } = require('./websitePublicImageUrl');
const { normalizeBookingUrlForSsr } = require('./bookingSettingsSanitize');

function parseJsonObject(raw) {
    if (!raw) return {};
    if (typeof raw === 'object') return raw;
    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch {
            return {};
        }
    }
    return {};
}

function toIsoYmd(value) {
    if (!value) return '';
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
    const s = String(value).trim();
    const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

function toDateOrNull(value) {
    if (!value) return null;
    const d = value instanceof Date ? value : new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

function addHours(dateValue, hours) {
    const d = toDateOrNull(dateValue);
    if (!d) return null;
    return new Date(d.getTime() + (Math.max(1, Number(hours) || 1) * 60 * 60 * 1000));
}

function propertyIdsFromReserva(row, meta) {
    const ids = [];
    const groupIds = Array.isArray(meta?.reservaWebGrupo?.propiedadIds)
        ? meta.reservaWebGrupo.propiedadIds
        : [];
    for (const id of groupIds) {
        const clean = String(id || '').trim();
        if (clean && !ids.includes(clean)) ids.push(clean);
    }
    const main = String(row.propiedad_id || '').trim();
    if (main && !ids.includes(main)) ids.unshift(main);
    return ids;
}

function firstPhotosFromProperty(propiedad) {
    const rawPhotos = [];
    const card = propiedad?.websiteData?.cardImage;
    if (card) rawPhotos.push(card);
    if (Array.isArray(propiedad?.fotosSSR)) rawPhotos.push(...propiedad.fotosSSR);

    const seen = new Set();
    return rawPhotos
        .map((img) => {
            const rawUrl = String(img?.thumbnailUrl || img?.storagePath || img?.storageUrl || '').trim();
            const url = normalizeWebsiteImageUrl(rawUrl);
            if (!url || seen.has(url)) return null;
            seen.add(url);
            return {
                url,
                alt: String(img?.altText || propiedad?.nombre || 'Alojamiento').trim(),
            };
        })
        .filter(Boolean)
        .slice(0, 4);
}

async function loadReservedProperties(empresaId, row, meta, obtenerPropiedadPorId) {
    const ids = propertyIdsFromReserva(row, meta);
    const props = [];
    for (const id of ids) {
        try {
            const propiedad = await obtenerPropiedadPorId(null, empresaId, id);
            if (!propiedad) continue;
            props.push({
                id: propiedad.id,
                nombre: propiedad.nombre || 'Alojamiento',
                href: `/propiedad/${encodeURIComponent(propiedad.id)}`,
                fotos: firstPhotosFromProperty(propiedad),
            });
        } catch (err) {
            console.warn('[publicReservationStatus] No se pudo cargar propiedad:', id, err.message);
        }
    }
    return props;
}

function summarizePayments(total, deposito, transacciones, row, meta) {
    const pagado = transacciones.reduce((sum, t) => sum + (Number(t.monto) || 0), 0);
    const saldo = Math.max(0, Math.round(total - pagado));
    const abonoRequerido = deposito.activo ? Math.max(0, Math.round(deposito.montoDeposito || 0)) : 0;
    const abonoPendiente = deposito.activo && pagado < abonoRequerido;
    const vencimientoCfg = meta.vencimientoPago || meta.pagoVenceAt || meta.plazoAbono;
    const venceAt = toDateOrNull(vencimientoCfg) || addHours(row.created_at, deposito.horasLimite);
    const estadoPagoMetadata = String(meta.estadoPago || '').trim().toLowerCase();
    const pagoCompleto = total > 0 && pagado >= total;
    const abonoCubierto = !deposito.activo || pagado >= abonoRequerido;
    const estado = pagoCompleto
        ? 'pagado'
        : (abonoCubierto ? 'abono_recibido' : (estadoPagoMetadata || 'pendiente_abono'));
    return {
        estado,
        total,
        pagado,
        saldo,
        abonoRequerido,
        abonoPendiente,
        venceAt: venceAt ? venceAt.toISOString() : '',
        vencido: !!(abonoPendiente && venceAt && venceAt.getTime() < Date.now()),
        horasLimite: deposito.horasLimite,
        transacciones,
    };
}

async function obtenerEstadoReservaPublica({ empresaId, reservaIdPublico, empresa, obtenerPropiedadPorId }) {
    const ref = String(reservaIdPublico || '').trim();
    if (!ref) return null;
    const { rows } = await pool.query(
        'SELECT * FROM reservas WHERE empresa_id = $1 AND id_reserva_canal = $2 LIMIT 1',
        [empresaId, ref]
    );
    if (!rows[0]) return null;

    const row = rows[0];
    const meta = parseJsonObject(row.metadata);
    const valores = parseValoresReservaRow(row.valores);
    const total = precioFinalDesdeReservaPgRow(row, meta);
    const [clienteRes, transRes, propiedades] = await Promise.all([
        row.cliente_id
            ? pool.query('SELECT nombre FROM clientes WHERE id = $1 AND empresa_id = $2', [row.cliente_id, empresaId])
            : Promise.resolve({ rows: [] }),
        pool.query(
            'SELECT id, tipo, monto, metadata, fecha FROM transacciones WHERE empresa_id = $1 AND id_reserva_canal = $2 ORDER BY fecha DESC NULLS LAST',
            [empresaId, ref]
        ),
        loadReservedProperties(empresaId, row, meta, obtenerPropiedadPorId),
    ]);
    const transacciones = transRes.rows.map((t) => ({
        id: t.id,
        tipo: t.tipo || '',
        monto: Number(t.monto) || 0,
        medioDePago: t.metadata?.medioDePago || '',
        fecha: t.fecha instanceof Date ? t.fecha.toISOString() : '',
    }));
    const booking = empresa?.websiteSettings?.booking || {};
    const deposito = resolveDepositoReservaWeb(booking, total);
    const pago = summarizePayments(total, deposito, transacciones, row, meta);
    const guestBookingLinks = {
        manualHuespedUrl: normalizeBookingUrlForSsr(booking.manualHuespedUrl),
        manualHuespedPdfUrl: normalizeBookingUrlForSsr(booking.manualHuespedPdfUrl),
        checkinOnlineUrl: normalizeBookingUrlForSsr(booking.checkinOnlineUrl),
    };
    return {
        id: ref,
        estado: String(row.estado || '').trim() || 'Confirmada',
        estadoGestion: String(row.estado_gestion || '').trim(),
        fechaLlegada: toIsoYmd(row.fecha_llegada),
        fechaSalida: toIsoYmd(row.fecha_salida),
        alojamientoNombre: String(row.alojamiento_nombre || '').trim(),
        totalNoches: Number(row.total_noches) || 0,
        cantidadHuespedes: Number(row.cantidad_huespedes) || 0,
        moneda: String(row.moneda || 'CLP').trim() || 'CLP',
        cliente: { nombre: clienteRes.rows[0]?.nombre || row.nombre_cliente || 'Huésped' },
        valores,
        pago,
        deposito,
        propiedades,
        guestBookingLinks,
        aceptacionTerminos: meta.aceptacionTerminos || null,
        garantiaOperacion: meta.garantiaOperacion || null,
    };
}

module.exports = { obtenerEstadoReservaPublica };
