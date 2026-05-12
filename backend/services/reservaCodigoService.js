// Códigos visibles y cortos para reservas creadas dentro de Rezerva.

function _slugReserva(raw, fallback = 'reserva') {
    const s = String(raw || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-{2,}/g, '-')
        .slice(0, 24);
    return s || fallback;
}

function _formatDdMmYyyy(date = new Date(), timeZone = 'America/Santiago') {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).formatToParts(date instanceof Date ? date : new Date(date));
    const byType = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    return `${byType.day}${byType.month}${byType.year}`;
}

function normalizarPrefijoReserva(canalOrRaw, opts = {}) {
    if (opts.prefijo) return _slugReserva(opts.prefijo);
    if (typeof canalOrRaw === 'string') return _slugReserva(canalOrRaw);
    const c = canalOrRaw || {};
    const m = c.metadata && typeof c.metadata === 'object' ? c.metadata : {};
    return _slugReserva(
        c.codigoReserva
        || c.codigo_reserva
        || m.codigoReserva
        || m.codigo_reserva
        || c.codigo
        || m.codigo
        || c.slug
        || m.slug
        || c.nombre
    );
}

async function generarCodigoReservaCorto(queryable, empresaId, canalOrRaw, opts = {}) {
    if (!queryable || typeof queryable.query !== 'function') throw new Error('queryable requerido para generar código de reserva.');
    if (!empresaId) throw new Error('empresaId requerido para generar código de reserva.');

    const prefijo = normalizarPrefijoReserva(canalOrRaw, opts);
    const fecha = _formatDdMmYyyy(opts.fecha || new Date(), opts.timeZone || 'America/Santiago');
    const base = `${prefijo}-${fecha}`;

    // Si el caller está dentro de una transacción, este lock evita correlativos duplicados en concurrencia.
    await queryable.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`reserva-codigo:${empresaId}:${base}`]);

    const { rows } = await queryable.query(
        `SELECT id_reserva_canal
           FROM reservas
          WHERE empresa_id = $1
            AND id_reserva_canal ILIKE $2`,
        [empresaId, `${base}-%`]
    );
    let max = 0;
    const re = new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+)$`, 'i');
    for (const row of rows) {
        const match = String(row.id_reserva_canal || '').match(re);
        if (match) max = Math.max(max, parseInt(match[1], 10) || 0);
    }
    return `${base}-${String(max + 1).padStart(3, '0')}`;
}

module.exports = {
    generarCodigoReservaCorto,
    normalizarPrefijoReserva,
};
