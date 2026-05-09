// frontend/src/views/components/configurarWebPublica/webPublica.general.js
// Formulario único para configuración web pública - Sin wizard
import { fetchAPI } from '../../../api.js';
import { renderUnified, setupUnifiedEvents } from './webPublica.general.unified.js';

let _fullEmpresaData = {};

async function _render(empresaData = _fullEmpresaData) {
    const container = document.getElementById('general-settings-form');
    if (!container) return;

    const datosParaRender = empresaData || _fullEmpresaData;

    container.innerHTML = await renderUnified(datosParaRender);

    // El callback onComplete se pasa a setupUnifiedEvents
    // Recibe los datos actualizados directamente del backend
    setupUnifiedEvents(datosParaRender, async (responseHomeSettings, responseEmpresa) => {
        // Usar los datos actualizados que YA devolvió el backend
        let datosActualizados = null;

        if (responseHomeSettings?.empresa) {
            datosActualizados = responseHomeSettings.empresa;
        } else if (responseEmpresa?.empresa) {
            datosActualizados = responseEmpresa.empresa;
        } else if (responseHomeSettings?.websiteSettings) {
            datosActualizados = { ...datosParaRender, websiteSettings: responseHomeSettings.websiteSettings };
        } else {
            console.warn('⚠️ No hay datos actualizados en las respuestas, haciendo fetch...');
            try {
                datosActualizados = await fetchAPI('/empresa');
            } catch (error) {
                console.error('Error haciendo fetch:', error);
            }
        }

        if (datosActualizados && datosActualizados.id) {
            _fullEmpresaData = datosActualizados;
            await _render(datosActualizados);

            // Mostrar mensaje de éxito
            const subdomain = datosActualizados.websiteSettings?.general?.subdomain ||
                             datosActualizados.subdominio ||
                             '(no especificado)';
            alert(`✅ Configuración guardada exitosamente.

📊 Datos actualizados:
• Subdominio: ${subdomain}
• Dominio: ${datosActualizados.websiteSettings?.general?.domain || datosActualizados.dominio || '(no especificado)'}
• WhatsApp: ${datosActualizados.websiteSettings?.general?.whatsapp || '(no especificado)'}

Los datos se han actualizado en pantalla.`);
        } else {
            console.error('❌ No se pudieron obtener datos actualizados');
            alert('✅ Configuración guardada, pero no se pudieron actualizar los datos en pantalla. Recarga la página.');
        }
    });
}

export function renderGeneral(empresaData) {
    _fullEmpresaData = empresaData || {};
    return `
    <div class="space-y-10">
        <div id="general-settings-form"></div>
    </div>`;
}

export async function setupGeneralEvents() {
    await _render(_fullEmpresaData);
}
