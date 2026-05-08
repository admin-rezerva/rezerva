/**
 * Valores públicos de marca / dominio (sin secretos). Una sola fuente para
 * GET /api/config/platform, tenantResolver (hosts marketplace) y SSR que importe aquí.
 */
const path = require('path');

let _pkgVersion;
function readBackendPackageVersion() {
    if (_pkgVersion !== undefined) return _pkgVersion;
    try {
        // eslint-disable-next-line import/no-dynamic-require, global-require
        _pkgVersion = String(require(path.join(__dirname, '..', 'package.json')).version || '').trim() || '0.0.0';
    } catch {
        _pkgVersion = '0.0.0';
    }
    return _pkgVersion;
}

function hostnameFromEnvUrl(envUrl) {
    if (!envUrl || typeof envUrl !== 'string') return '';
    try {
        return new URL(envUrl.trim()).hostname.toLowerCase();
    } catch {
        return '';
    }
}

function getPlatformDomain() {
    const a = String(process.env.PLATFORM_DOMAIN || '').trim().toLowerCase();
    if (a) return a;
    const b = String(process.env.PUBLIC_SITES_ROOT_DOMAIN || '').trim().toLowerCase();
    if (b) return b;
    return String(process.env.DEFAULT_PLATFORM_DOMAIN || 'rezerva.cl').trim().toLowerCase();
}

function defaultProductLabelFromDomain(domain) {
    const host = String(domain || '').split('/').pop().split(':')[0].trim().toLowerCase();
    if (!host) return '';
    const parts = host.split('.').filter(Boolean);
    const first = parts[0] || '';
    if (!first) return '';
    return first.charAt(0).toUpperCase() + first.slice(1);
}

function getPlatformProductName() {
    const explicit = String(process.env.PLATFORM_PRODUCT_NAME || '').trim();
    if (explicit) return explicit;
    const fromDomain = defaultProductLabelFromDomain(getPlatformDomain());
    if (fromDomain) return fromDomain;
    return String(process.env.PLATFORM_PRODUCT_NAME_FALLBACK || '').trim();
}

function getPanelReleaseVersion() {
    const v = String(process.env.PANEL_RELEASE_VERSION || '').trim();
    if (v) return v;
    return readBackendPackageVersion();
}

function getRenderPublicHostname() {
    return hostnameFromEnvUrl(process.env.RENDER_EXTERNAL_URL);
}

function getMarketplaceForceHostAlias() {
    return String(process.env.MARKETPLACE_FORCE_HOST_ALIAS || 'marketplace').trim().toLowerCase();
}

function getExtraMarketplaceHostsFromEnv() {
    const raw = String(process.env.PLATFORM_MARKETPLACE_EXTRA_HOSTS || '');
    return raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
}

function getMarketplaceHostnamesSet() {
    const set = new Set();
    const d = getPlatformDomain();
    if (d) {
        set.add(d);
        set.add(`www.${d}`);
    }
    const renderHost = getRenderPublicHostname();
    if (renderHost) set.add(renderHost);
    getExtraMarketplaceHostsFromEnv().forEach((h) => set.add(h));
    const alias = getMarketplaceForceHostAlias();
    if (alias) set.add(alias);
    return set;
}

module.exports = {
    getPlatformDomain,
    getPlatformProductName,
    getPanelReleaseVersion,
    getMarketplaceHostnamesSet,
    getRenderPublicHostname,
    getMarketplaceForceHostAlias,
};
