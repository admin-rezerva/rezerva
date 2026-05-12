// backend/services/canalesService.js
const pool = require('../db/postgres');

const IA_VENTA_CANAL_ORIGEN = 'ia-venta';
const SSR_CANAL_ORIGEN = 'ssr';

function resolverCanalIaVentaEnLista(canales) {
    if (!Array.isArray(canales)) return null;
    return canales.find((c) => c.esCanalIaVenta === true) || null;
}

function resolverCanalSsrEnLista(canales) {
    if (!Array.isArray(canales)) return null;
    return canales.find((c) => c.esCanalSsr === true) || null;
}

function mapearCanal(row) {
    if (!row) return null;
    return {
        id: row.id,
        nombre: row.nombre,
        tipo: row.tipo,
        comision: parseFloat(row.comision || 0),
        activo: row.activo,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        ...(row.metadata || {})
    };
}

async function _desmarcarCanalesExclusivos(empresaId, canalId, flag) {
    await pool.query(
        `UPDATE canales SET metadata = COALESCE(metadata, '{}'::jsonb) || $1::jsonb, updated_at = NOW()
         WHERE empresa_id = $2
           AND ($3::text IS NULL OR id::text != $3::text)
           AND COALESCE((metadata->>$4)::boolean, false) = true`,
        [JSON.stringify({ [flag]: false }), empresaId, canalId || null, flag]
    );
}

function _prepararDatosCanal(datosCanal) {
    const { nombre, tipo, comision, activo, ...resto } = datosCanal;
    if (resto.esCanalSsr === true) {
        resto.origenCanal = SSR_CANAL_ORIGEN;
        if (!resto.codigoReserva) resto.codigoReserva = SSR_CANAL_ORIGEN;
    } else if (resto.esCanalSsr === false && resto.origenCanal === SSR_CANAL_ORIGEN) {
        resto.origenCanal = null;
    }
    return { nombre, tipo, comision, activo, resto };
}

const crearCanal = async (_db, empresaId, datosCanal) => {
    if (!empresaId || !datosCanal.nombre) {
        throw new Error('El ID de la empresa y el nombre del canal son requeridos.');
    }
    if (datosCanal.esCanalPorDefecto) {
        await _desmarcarCanalesExclusivos(empresaId, null, 'esCanalPorDefecto');
    }
    if (datosCanal.esCanalSsr) {
        await _desmarcarCanalesExclusivos(empresaId, null, 'esCanalSsr');
    }
    const { nombre, tipo, comision, resto } = _prepararDatosCanal(datosCanal);
    const { rows } = await pool.query(`
        INSERT INTO canales (empresa_id, nombre, tipo, comision, activo, metadata)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
    `, [empresaId, nombre, tipo || null, comision || 0, true, JSON.stringify(resto)]);
    return mapearCanal(rows[0]);
};

const obtenerCanalesPorEmpresa = async (_db, empresaId) => {
    const { rows } = await pool.query(
        'SELECT * FROM canales WHERE empresa_id = $1 ORDER BY nombre ASC',
        [empresaId]
    );
    return rows.map(mapearCanal);
};

const actualizarCanal = async (_db, empresaId, canalId, datosActualizados) => {
    if (datosActualizados.esCanalPorDefecto) {
        await _desmarcarCanalesExclusivos(empresaId, canalId, 'esCanalPorDefecto');
    }
    if (datosActualizados.esCanalSsr) {
        await _desmarcarCanalesExclusivos(empresaId, canalId, 'esCanalSsr');
    }
    const { nombre, tipo, comision, activo, resto } = _prepararDatosCanal(datosActualizados);
    await pool.query(`
        UPDATE canales SET
            nombre     = COALESCE($2, nombre),
            tipo       = COALESCE($3, tipo),
            comision   = COALESCE($4, comision),
            activo     = COALESCE($5, activo),
            metadata   = COALESCE(metadata, '{}'::jsonb) || $6::jsonb,
            updated_at = NOW()
        WHERE id = $1 AND empresa_id = $7
    `, [
        canalId,
        nombre   || null,
        tipo     || null,
        comision !== undefined ? comision : null,
        activo   !== undefined ? activo   : null,
        JSON.stringify(resto),
        empresaId
    ]);
    return { id: canalId, ...datosActualizados };
};

const eliminarCanal = async (_db, empresaId, canalId) => {
    await pool.query('DELETE FROM canales WHERE id = $1 AND empresa_id = $2', [canalId, empresaId]);
};

async function obtenerCanalSsrOPorDefecto(empresaId, queryable = pool) {
    const { rows } = await queryable.query(
        `SELECT id, nombre, COALESCE(metadata->>'moneda', 'CLP') AS moneda, COALESCE(metadata, '{}'::jsonb) AS metadata
           FROM canales
          WHERE empresa_id = $1
            AND (
              COALESCE((metadata->>'esCanalSsr')::boolean, false) = true
              OR COALESCE((metadata->>'esCanalPorDefecto')::boolean, false) = true
            )
          ORDER BY CASE WHEN COALESCE((metadata->>'esCanalSsr')::boolean, false) THEN 0 ELSE 1 END,
                   nombre ASC
          LIMIT 1`,
        [empresaId]
    );
    return rows[0] || null;
}

module.exports = {
    IA_VENTA_CANAL_ORIGEN,
    SSR_CANAL_ORIGEN,
    resolverCanalIaVentaEnLista,
    resolverCanalSsrEnLista,
    obtenerCanalSsrOPorDefecto,
    crearCanal,
    obtenerCanalesPorEmpresa,
    actualizarCanal,
    eliminarCanal,
};
