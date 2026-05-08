// frontend/src/platformConfig.js
// Marca y dominio de plataforma desde GET /api/config/platform (sin hardcode de nombre comercial).

let _domain = '';
let _productName = '';
let _panelVersion = '';
let _fetched = false;

function initialsFromLabel(label) {
    const s = String(label || '').trim();
    if (s.length >= 2) return s.slice(0, 2).toUpperCase();
    if (s.length === 1) return (s + s).toUpperCase();
    return '—';
}

export async function ensurePlatformConfig() {
    if (_fetched) return;
    try {
        const res = await fetch('/api/config/platform');
        if (res.ok) {
            const data = await res.json();
            _domain = String(data.platformDomain || '').trim();
            _productName = String(data.platformProductName || '').trim();
            _panelVersion = String(data.panelReleaseVersion || '').trim();
        }
    } catch { /* ignorar */ }
    _fetched = true;
}

export function getPlatformDomain() {
    return _domain;
}

export function getPlatformProductName() {
    return _productName;
}

export function getPanelReleaseVersion() {
    return _panelVersion;
}

/** Etiqueta corta para UI: nombre de producto o dominio. */
export function getPlatformDisplayLabel() {
    return getPlatformProductName() || getPlatformDomain() || '';
}

export function getSidebarBrandInitials() {
    return initialsFromLabel(getPlatformDisplayLabel());
}

export function applyDocumentBranding() {
    const label = getPlatformDisplayLabel();
    if (label) {
        document.title = label;
    }
    const link = document.querySelector("link[rel='icon']");
    if (link && label) {
        const ch = initialsFromLabel(label).replace(/[^A-Z0-9]/gi, '').slice(0, 2);
        if (ch) {
            const enc = encodeURIComponent(
                `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%234f46e5'/><text x='50%' y='54%' dominant-bbaseline='middle' text-anchor='middle' font-family='system-ui,sans-serif' font-size='12' font-weight='700' fill='white'>${ch}</text></svg>`,
            );
            link.href = `data:image/svg+xml,${enc}`;
        }
    }
}
