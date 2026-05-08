// backend/middleware/tenantResolver.js

const { obtenerEmpresaPorDominio } = require('../services/empresaService');
const { getMarketplaceHostnamesSet } = require('../config/platformPublic');

/**
 * Misma lógica de host efectivo que el resolver (query force_host → cookie → req.hostname).
 * Útil para rutas registradas antes del middleware (p. ej. robots/sitemap solo marketplace).
 */
function getEffectiveHostnameForSsr(req) {
    let forceHost = req.query && req.query.force_host;
    if (!forceHost && req.headers && req.headers.cookie) {
        const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
            const parts = cookie.trim().split('=');
            if (parts.length === 2) {
                acc[parts[0].trim()] = parts[1].trim();
            }
            return acc;
        }, {});
        forceHost = cookies.force_host;
    }
    return String(forceHost || req.hostname || '').toLowerCase().trim();
}

function isMarketplaceSsrHost(req) {
    return getMarketplaceHostnamesSet().has(getEffectiveHostnameForSsr(req));
}

const createTenantResolver = (db) => async (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/src/') || req.path.startsWith('/public/')) {
        return next();
    }

    let forceHost = req.query.force_host;

    if (!forceHost && req.headers.cookie) {
        const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
            const parts = cookie.trim().split('=');
            if (parts.length === 2) {
                acc[parts[0].trim()] = parts[1].trim();
            }
            return acc;
        }, {});
        forceHost = cookies.force_host;
    }

    if (req.query.force_host) {
        console.log(`[TenantResolver] Setting cookie force_host=${req.query.force_host}`);
        res.setHeader('Set-Cookie', `force_host=${req.query.force_host}; Path=/; Max-Age=3600`);
    }

    const hostname = (forceHost || req.hostname).toLowerCase().trim();
    console.log(`[TenantResolver] Path: ${req.path}, Hostname: ${hostname}, ForceHost: ${forceHost}`);

    if (getMarketplaceHostnamesSet().has(hostname)) {
        console.log(`[TenantResolver] Marketplace detectado: ${hostname}`);
        req.isMarketplace = true;
        return next();
    }

    try {
        const empresa = await obtenerEmpresaPorDominio(db, hostname);

        if (empresa) {
            console.log(`[TenantResolver] Empresa encontrada: ${empresa.nombre} (${empresa.id})`);
            req.empresa = empresa;
        } else {
            console.log(`[TenantResolver] NO se encontró empresa para el hostname: ${hostname}`);
        }

        next();
    } catch (error) {
        console.error(`[TenantResolver] Error resolviendo el dominio ${hostname}:`, error);
        next();
    }
};

module.exports = {
    createTenantResolver,
    getEffectiveHostnameForSsr,
    isMarketplaceSsrHost,
};
