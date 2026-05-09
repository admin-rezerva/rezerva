// backend/db/postgres.js
// Pool de conexiones PostgreSQL (Supabase + PgBouncer).
// El modo activo se controla desde backend/config/dbConfig.js.

const { IS_POSTGRES } = require('../config/dbConfig');

if (!IS_POSTGRES) {
    // No cargar `pg` en modo Firestore: CI y scripts ligeros no instalan backend/node_modules.
    module.exports = null;
} else {
    const { Pool } = require('pg');
    const dns = require('dns');

    // Forzar IPv4 — Render resuelve hostnames de Supabase a IPv6 pero sin conectividad IPv6.
    dns.setDefaultResultOrder('ipv4first');

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 15000,
        ssl: { rejectUnauthorized: false }
    });

    pool.on('error', (err) => {
        console.error('[PostgreSQL] Error inesperado en cliente idle:', err.message);
    });

    pool.connect()
        .then(client => client.query('SELECT NOW()').then(res => {
            console.log(`[PostgreSQL] Conexión establecida. Servidor: ${res.rows[0].now}`);
            client.release();
        }))
        .catch(err => {
            console.error('[PostgreSQL] Error al conectar:', err.message);
        });

    pool.q = (text, params = []) => pool.query(text, params);

    module.exports = pool;
}
