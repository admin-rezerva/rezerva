import { fetchAPI } from '../api.js';
import {
    ensurePlatformConfig,
    getPlatformDisplayLabelForUi,
    getPlatformDomain,
    getPanelPublicHostnameForUi,
} from '../platformConfig.js';

const GOOGLE_BTN_SVG = `<svg class="w-5 h-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48px" height="48px"><path fill="rgb(255 193 7)" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/><path fill="rgb(255 61 0)" d="M6.306,14.691l6.06-4.844C14.64,5.844,18.96,4,24,4c5.268,0,10.046,2.053,13.575,6.204l-5.657,5.657C30.046,13.12,27.189,12,24,12c-3.059,0-5.842,1.154-7.961,3.039L9.982,9.842C12.352,7.51,15.703,6,19.64,5.433L6.306,14.691z"/><path fill="rgb(76 175 80)" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.519-3.536-11.088-8.261l-6.42,5.204C9.254,39.522,15.97,44,24,44z"/><path fill="rgb(25 118 210)" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C42.022,36.218,44,30.668,44,24C44,22.659,43.862,21.35,43.611,20.083z"/></svg>`;

function escHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/'/g, '&#39;')
        .replace(/"/g, '&quot;');
}

function formatAuthDate(iso) {
    if (!iso) return '';
    try {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return '';
        return d.toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
        return '';
    }
}

async function fetchGoogleAuthStatus() {
    try {
        return await fetchAPI('/authGoogle/status');
    } catch (e) {
        console.error('[autorizarGoogle] No se pudo leer el estado de Google:', e);
        return { autorizado: false, fechaAuth: null };
    }
}

export async function render() {
    await ensurePlatformConfig();
    const rawLabel = getPlatformDisplayLabelForUi();
    const brand = rawLabel ? escHtml(rawLabel) : '';
    const introAutorizar = brand
        ? `Al autorizar, ${brand} podrá acceder a dos servicios de Google con un solo click:`
        : 'Al autorizar, este panel podrá acceder a dos servicios de Google con un solo click:';
    const oauthHost = getPanelPublicHostnameForUi();
    const domain = getPlatformDomain();
    const originHint = domain ? `https://${domain}` : '';
    const oauthNote = oauthHost
        ? `<p class="text-gray-600 text-sm mt-2">La pantalla de Google mostrará el acceso asociado al dominio del panel: <strong class="text-gray-900">${escHtml(oauthHost)}</strong> (configuración del servidor). Si ves otro dominio, revisa <code class="text-xs bg-gray-100 px-1 rounded">PANEL_PUBLIC_ORIGIN</code> / consola Google Cloud.</p>`
        : `<p class="text-gray-500 text-sm mt-2">Si Google muestra un dominio antiguo, en Render define <code class="text-xs bg-gray-100 px-1 rounded">PANEL_PUBLIC_ORIGIN</code> con la URL pública del panel${originHint ? ` (p. ej. <code class="text-xs bg-gray-100 px-1 rounded">${escHtml(originHint)}</code>)` : ''} y alinea el cliente OAuth en Google Cloud.</p>`;

    const params = new URLSearchParams(window.location.search || '');
    const justReturnedFromGoogle = params.get('google') === 'ok';

    const status = await fetchGoogleAuthStatus();
    const fechaStr = formatAuthDate(status.fechaAuth);

    const bannerRecien = justReturnedFromGoogle && status.autorizado
        ? `<div class="mb-4 p-4 rounded-lg border border-primary-200 bg-primary-50" role="status">
                <p class="font-semibold text-primary-900">Proceso completado</p>
                <p class="text-sm text-primary-800 mt-1">Google devolvió la autorización y ya quedó guardada para esta empresa. Los huéspedes de tus reservas pueden sincronizarse con la cuenta de Google que elegiste.</p>
            </div>`
        : '';

    const bannerJustoPeroSinToken = justReturnedFromGoogle && !status.autorizado
        ? `<div class="mb-4 p-4 rounded-lg border border-warning-300 bg-warning-50" role="alert">
                <p class="font-semibold text-warning-900">No pudimos confirmar la conexión</p>
                <p class="text-sm text-warning-800 mt-1">Volviste del navegador de Google, pero el servidor no registra un token activo. Recarga la página; si sigue igual, pulsa de nuevo <strong>Autorizar con Google</strong> (asegúrate de terminar el flujo hasta el final).</p>
            </div>`
        : '';

    const bannerConectado = status.autorizado
        ? `<div class="mb-6 p-4 rounded-lg border border-success-300 bg-success-50" role="status">
                <p class="font-semibold text-success-900">Google Contacts: conectado</p>
                <p class="text-sm text-success-800 mt-1">
                    La sincronización automática de clientes con Google Contacts está activa para <strong>esta empresa</strong>.
                    ${fechaStr ? `Autorizado el ${escHtml(fechaStr)}.` : ''}
                </p>
                <p class="text-xs text-success-700 mt-2">Si cambias de cuenta de Google o revocaste el acceso en Google, vuelve a autorizar con el botón de abajo.</p>
            </div>`
        : `<div class="mb-6 p-4 rounded-lg border border-gray-200 bg-gray-50">
                <p class="font-semibold text-gray-800">Google Contacts: sin conectar</p>
                <p class="text-sm text-gray-600 mt-1">Aún no hay una autorización guardada para esta empresa. Usa el botón de abajo para enlazar la cuenta de Google donde quieres los contactos.</p>
            </div>`;

    const btnLabel = status.autorizado ? 'Volver a autorizar con Google' : 'Autorizar con Google';
    const btnClass = status.autorizado
        ? 'btn-outline inline-flex items-center'
        : 'btn-primary inline-flex items-center';

    return `
        <div class="bg-white p-8 rounded-lg shadow max-w-2xl mx-auto">
            <h2 class="text-2xl font-semibold text-gray-900 mb-2">Autorizar Conexión con Google</h2>
            ${bannerJustoPeroSinToken}
            ${bannerRecien}
            ${bannerConectado}
            <p class="text-gray-600 mt-4">
                ${introAutorizar}
            </p>
            ${oauthNote}
            <ul class="mt-3 space-y-1 text-gray-600 text-sm list-disc list-inside">
                <li><strong>Google Contacts</strong> — sincroniza clientes automáticamente</li>
                <li><strong>Google Business Profile</strong> — importa reseñas de Google Maps</li>
            </ul>
            <p class="text-gray-500 text-sm mt-3">
                ${status.autorizado
        ? 'Ya tienes una conexión activa. Solo necesitas volver a autorizar si cambias de cuenta o quieres renovar permisos.'
        : 'Solo necesitas autorizar una vez por empresa. Si ya autorizaste antes, vuelve a hacerlo para activar Google Business o renovar permisos.'}
            </p>
            <div class="mt-6">
                <button type="button" id="authorize-btn" class="${btnClass}" data-connected="${status.autorizado ? 'true' : 'false'}">
                    ${GOOGLE_BTN_SVG}
                    <span id="authorize-btn-label">${escHtml(btnLabel)}</span>
                </button>
            </div>
             <p class="text-gray-500 text-sm mt-4">
                Tras autorizar, te llevamos de vuelta a esta pantalla con el estado actualizado. Si ves la página de texto de Google, puedes cerrarla y abrir de nuevo <strong>Autorizar Google Contacts</strong> en el menú.
            </p>
        </div>
    `;
}

export function afterRender() {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search || '');
    if (params.get('google') === 'ok') {
        window.history.replaceState({}, '', path);
    }

    const button = document.getElementById('authorize-btn');
    const labelEl = document.getElementById('authorize-btn-label');
    if (!button) return;

    button.addEventListener('click', async () => {
        button.disabled = true;
        if (labelEl) labelEl.textContent = 'Redirigiendo...';

        try {
            const response = await fetchAPI('/authGoogle/authorize');
            if (response.url) {
                window.location.href = response.url;
            } else {
                throw new Error('No se recibió una URL de autorización.');
            }
        } catch (error) {
            alert(`Error al iniciar la autorización: ${error.message}`);
            button.disabled = false;
            if (labelEl) {
                const connected = button.getAttribute('data-connected') === 'true';
                labelEl.textContent = connected ? 'Volver a autorizar con Google' : 'Autorizar con Google';
            }
        }
    });
}
