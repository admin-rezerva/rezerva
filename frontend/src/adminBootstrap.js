(function readAdminBootstrapVersion() {
    try {
        const el = document.querySelector('script[src*="adminBootstrap.js"]');
        const src = el?.getAttribute('src') || '';
        const q = src.includes('?') ? src.split('?')[1] : '';
        const v = new URLSearchParams(q).get('v') || '';
        if (v) window.__SPA_IMPORT_V__ = v;
    } catch (_) { /* noop */ }
})();

const __adminV = typeof window !== 'undefined' && window.__SPA_IMPORT_V__
    ? `?v=${encodeURIComponent(window.__SPA_IMPORT_V__)}`
    : '';

const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = `/admin-assets/public/css/style.css${__adminV}`;
const firstCss = document.head.querySelector('link[rel="stylesheet"]');
if (firstCss) document.head.insertBefore(link, firstCss);
else document.head.appendChild(link);

const { startAdminApp } = await import(`./router.js${__adminV}`);

function run() {
    void startAdminApp().catch((err) => console.error('[Admin]', err));
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
} else {
    run();
}
