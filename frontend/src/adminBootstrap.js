const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = '/admin-assets/public/css/style.css';
const firstCss = document.head.querySelector('link[rel="stylesheet"]');
if (firstCss) document.head.insertBefore(link, firstCss);
else document.head.appendChild(link);

const { startAdminApp } = await import('./router.js');

function run() {
    void startAdminApp().catch((err) => console.error('[Admin]', err));
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
} else {
    run();
}
