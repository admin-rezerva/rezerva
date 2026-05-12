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

/**
 * Normaliza valor de env a origin válido: quita comillas, añade https:// si falta esquema
 * (p. ej. `rezerva.cl` → `https://rezerva.cl`).
 */
function tryPublicOriginFromEnv(raw) {
    let s = String(raw || '').trim().replace(/^['"]+|['"]+$/g, '');
    if (!s) return '';
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) {
        s = `https://${s}`;
    }
    try {
        return new URL(s).origin;
    } catch {
        return '';
    }
}

/**
 * Origen HTTPS del panel/API (sin path final). OAuth y enlaces “canónicos” del backend.
 * Prioridad: PANEL_PUBLIC_ORIGIN → GOOGLE_OAUTH_PUBLIC_ORIGIN → RENDER_EXTERNAL_URL.
 * En Render con dominio custom, definir PANEL_PUBLIC_ORIGIN=https://rezerva.cl (o el host real del panel).
 */
function getPanelPublicOrigin() {
    return (
        tryPublicOriginFromEnv(process.env.PANEL_PUBLIC_ORIGIN)
        || tryPublicOriginFromEnv(process.env.GOOGLE_OAUTH_PUBLIC_ORIGIN)
        || tryPublicOriginFromEnv(process.env.RENDER_EXTERNAL_URL)
        || ''
    );
}

/**
 * Origen del panel SPA para links internos a administradores.
 * En producción puede diferir del dominio público/marketplace (`rezerva.cl`).
 */
function getAdminPanelOrigin() {
    return (
        tryPublicOriginFromEnv(process.env.ADMIN_PANEL_PUBLIC_ORIGIN)
        || tryPublicOriginFromEnv(process.env.PANEL_APP_ORIGIN)
        || tryPublicOriginFromEnv(process.env.RENDER_EXTERNAL_URL)
        || getPanelPublicOrigin()
    );
}

function getMarketplaceForceHostAlias() {
    return String(process.env.MARKETPLACE_FORCE_HOST_ALIAS || 'marketplace').trim().toLowerCase();
}

function getExtraMarketplaceHostsFromEnv() {
    const raw = String(process.env.PLATFORM_MARKETPLACE_EXTRA_HOSTS || '');
    return raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
}

function getMarketplaceBrandLabel() {
    const fromProduct = getPlatformProductName();
    if (fromProduct) return fromProduct;
    const fromDomain = defaultProductLabelFromDomain(getPlatformDomain());
    if (fromDomain) return fromDomain;
    return String(process.env.PLATFORM_BRAND_LABEL_FALLBACK || '').trim();
}

/** Región o país opcional en hero/meta del marketplace (`MARKETPLACE_HERO_REGION_LABEL`). Vacío = sin mencionar lugar en títulos genéricos. */
function getMarketplaceHeroRegionLabel() {
    return String(process.env.MARKETPLACE_HERO_REGION_LABEL || '').trim();
}

function getMarketplaceHostnamesSet() {
    const set = new Set();
    const d = getPlatformDomain();
    if (d) {
        set.add(d);
        set.add(`www.${d}`);
    }
    /** Solo si hace falta servir marketplace también en el hostname público de Render (staging). */
    if (String(process.env.PLATFORM_MARKETPLACE_INCLUDE_RENDER_HOST || '').trim() === '1') {
        const renderHost = getRenderPublicHostname();
        if (renderHost) set.add(renderHost);
    }
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
    getPanelPublicOrigin,
    getAdminPanelOrigin,
    getMarketplaceForceHostAlias,
    getMarketplaceBrandLabel,
    getMarketplaceHeroRegionLabel,
};
