import { renderMenu, handleNavigation } from './router.js';
import { fetchAPI, logout, fetchDailyDollar } from './api.js';
import {
    ensurePlatformConfig,
    getPanelReleaseVersion,
    getPlatformDisplayLabel,
    applyDocumentBranding,
} from './platformConfig.js';

let currentUser = null;

/**
 * Shell del panel: por debajo de `lg` el sidebar es fixed + off-canvas (translate), overlay y menú hamburguesa;
 * el scroll principal vive en #view-content (ver #app-root en source.css). A partir de `lg` el menú es estático.
 */
export async function renderAppLayout(dollarInfo) {
    await ensurePlatformConfig();
    applyDocumentBranding();
    const appRoot = document.getElementById('app-root');
    const brandTitle = getPlatformDisplayLabel() || '\u00A0';
    const brandVersion = getPanelReleaseVersion() || '0';
    const initials = (currentUser?.nombreEmpresa || getPlatformDisplayLabel() || '?').slice(0, 2).toUpperCase();
    appRoot.innerHTML = `
        <div id="app-wrapper" class="min-h-screen bg-slate-50 flex h-full min-h-0 w-full flex-1 flex-col font-sans text-slate-800 lg:flex-row">
            <aside id="sidebar" class="sidebar flex h-full min-h-0 w-64 shrink-0 flex-col bg-slate-900 text-slate-300 fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out -translate-x-full lg:static lg:z-auto lg:translate-x-0">
                <div class="sidebar-header">
                    <div class="sidebar-brand">
                        <div class="sidebar-logo-icon">
                            <i class="fa-solid fa-house-chimney"></i>
                        </div>
                        <div class="link-text">
                            <h1 id="sidebar-title" class="sidebar-title">${brandTitle}</h1>
                            <span class="sidebar-version">v${brandVersion}</span>
                        </div>
                    </div>
                    <button id="sidebar-toggle-desktop" type="button" class="sidebar-toggle-btn hidden lg:flex" aria-label="Colapsar menú">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <button id="sidebar-close-mobile" type="button" class="sidebar-toggle-btn flex lg:hidden" aria-label="Cerrar menú">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <nav id="main-nav" class="min-h-0 flex-1 overflow-y-auto"></nav>
                <div class="sidebar-user">
                    <div class="sidebar-user-avatar">${initials}</div>
                    <div class="sidebar-user-info link-text">
                        <p class="sidebar-user-name">${currentUser?.nombreEmpresa || ''}</p>
                        <p class="sidebar-user-role">${currentUser?.rol || 'admin'}</p>
                    </div>
                </div>
            </aside>
            <div id="sidebar-overlay" class="fixed inset-0 z-40 bg-black/50 hidden lg:hidden"></div>
            <div id="main-content" class="main-content flex min-w-0 flex-1 flex-col overflow-hidden">
                <header class="flex-shrink-0 border-b border-slate-200/80 bg-white shadow-sm">
                    <div class="flex min-h-16 flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-2 sm:px-6 lg:px-8">
                        <button id="mobile-menu-btn" type="button" class="rounded-md p-2 text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="Abrir menú">
                            <svg class="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                        </button>
                        <div id="auth-info" class="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1 text-xs md:text-sm"></div>
                        <button id="logout-btn" type="button" class="btn-danger flex-shrink-0 text-xs">Cerrar Sesión</button>
                    </div>
                </header>
                <main id="view-content" class="flex-1 overflow-y-auto p-4 md:p-6 lg:px-8"></main>
            </div>
        </div>
    `;
    
    const authInfo = document.getElementById('auth-info');
    const dolarHtml = dollarInfo?.fecha
        ? `<span class="font-semibold text-primary-600 flex-shrink-0">Dólar ${new Date(dollarInfo.fecha + 'T00:00:00Z').toLocaleDateString('es-CL', { timeZone: 'UTC' })}: $${(dollarInfo.valor || 0).toLocaleString('es-CL')}</span>`
        : '';

    authInfo.innerHTML = `
        <span class="font-semibold text-gray-700 truncate">Empresa: ${currentUser.nombreEmpresa}</span>
        <span class="text-gray-600 hidden sm:block">Usuario: ${currentUser.email}</span>
        ${dolarHtml}
    `;
    document.getElementById('logout-btn').addEventListener('click', () => {
        logout();
        handleNavigation('/login'); 
    });
    
    renderMenu(currentUser);
    setupSidebarToggle();
}

export async function checkAuthAndRender() {
    // Esperar a que Firebase restaure la sesión y renueve el token antes del primer fetch
    if (window.firebaseApp) {
        try {
            const { getAuth } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
            const auth = getAuth(window.firebaseApp);
            if (typeof auth.authStateReady === 'function') await auth.authStateReady();
            if (auth.currentUser) {
                const freshToken = await auth.currentUser.getIdToken();
                localStorage.setItem('idToken', freshToken);
            }
        } catch (_) { /* Firebase no disponible, se usa el token en localStorage */ }
    }

    const token = localStorage.getItem('idToken');
    if (!token) {
        currentUser = null;
        return false;
    }
    try {
        const [userData, dollarInfo] = await Promise.all([
            fetchAPI('/auth/me'),
            fetchDailyDollar()
        ]);
        currentUser = userData;
        
        const authInfo = document.getElementById('auth-info');
        if (authInfo) {
            const dolarHtml = dollarInfo?.fecha
                ? `<span class="font-semibold text-primary-600 flex-shrink-0">Dólar ${new Date(dollarInfo.fecha + 'T00:00:00Z').toLocaleDateString('es-CL', { timeZone: 'UTC' })}: $${(dollarInfo.valor || 0).toLocaleString('es-CL')}</span>`
                : '';
            authInfo.innerHTML = `
                <span class="font-semibold text-gray-700 truncate">Empresa: ${currentUser.nombreEmpresa}</span>
                <span class="text-gray-600 hidden sm:block">Usuario: ${currentUser.email}</span>
                ${dolarHtml}
            `;
        } else {
            await renderAppLayout(dollarInfo);
        }

        return true;
    } catch (error) {
        console.error("Token inválido o sesión expirada:", error);
        localStorage.removeItem('idToken');
        currentUser = null;
        return false;
    }
}

/** Abre/cierra sidebar móvil y colapsa ancho en escritorio (clase .collapsed en aside). */
function setupSidebarToggle() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const mainContent = document.getElementById('main-content');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const closeMobileBtn = document.getElementById('sidebar-close-mobile');
    const toggleDesktopBtn = document.getElementById('sidebar-toggle-desktop');

    const openMobileMenu = () => {
        if (!sidebar || !overlay) return;
        sidebar.classList.remove('-translate-x-full');
        sidebar.classList.add('translate-x-0');
        overlay.classList.remove('hidden');
    };

    const closeMobileMenu = () => {
        if (!sidebar || !overlay) return;
        sidebar.classList.add('-translate-x-full');
        sidebar.classList.remove('translate-x-0');
        overlay.classList.add('hidden');
    };

    if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', openMobileMenu);
    if (closeMobileBtn) closeMobileBtn.addEventListener('click', closeMobileMenu);
    if (overlay) overlay.addEventListener('click', closeMobileMenu);

    if (toggleDesktopBtn) {
        toggleDesktopBtn.addEventListener('click', () => {
            sidebar?.classList.toggle('collapsed');
            if (mainContent) {
                mainContent.classList.toggle('sidebar-collapsed');
            }
        });
    }
}