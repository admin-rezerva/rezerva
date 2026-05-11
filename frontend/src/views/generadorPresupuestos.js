// frontend/src/views/generadorPresupuestos.js

import { fetchAPI } from '../api.js';
import { handleNavigation } from '../router.js';

let allClients = [];
let allProperties = [];
let allCanales = [];
let appCanalId = null;
let availabilityData = {};
let selectedProperties = [];
let currentPricing = {};
let editId = null;

function formatCurrency(value) { return `$${(Math.round(value) || 0).toLocaleString('es-CL')}`; }

function _gpSection(innerHtml) {
    return `<section class="spa-form-section">${innerHtml}</section>`;
}

function _gpHeading(num, iconClass, title) {
    return `<h3 class="spa-form-section-title"><span class="spa-form-section-badge">${num}</span><i class="fa-solid ${iconClass} text-primary-500" aria-hidden="true"></i><span>${title}</span></h3>`;
}

function _setResultsContainerVisible(visible) {
    const el = document.getElementById('results-container');
    if (!el) return;
    if (visible) {
        el.classList.remove('hidden');
        el.classList.add('flex', 'flex-col', 'gap-8');
    } else {
        el.classList.add('hidden');
        el.classList.remove('flex', 'flex-col', 'gap-8');
    }
}

async function loadInitialData() {
    try {
        [allClients, allCanales] = await Promise.all([
            fetchAPI('/clientes'),
            fetchAPI('/canales')
        ]);
        const appChannel = allCanales.find(c => c.esCanalPorDefecto);
        if (appChannel) {
            appCanalId = appChannel.id;
        } else {
            console.error("No se encontró un canal marcado como 'por defecto'. El generador de presupuestos podría no funcionar correctamente.");
            alert("Advertencia: No hay ningún canal marcado como canal por defecto (⭐) en Gestionar Canales. Los cálculos de precios pueden fallar.");
        }
    } catch (error) {
        console.error("No se pudieron cargar los datos iniciales:", error);
    }
}

function filterClients(e) {
    const searchTerm = e.target.value.toLowerCase();
    const resultsList = document.getElementById('client-results-list');
    resultsList.innerHTML = '';
    resultsList.classList.add('hidden');
    if (!searchTerm) {
        clearClientSelection();
        return;
    }
    const filtered = allClients.filter(c => c.nombre.toLowerCase().includes(searchTerm) || (c.telefono && c.telefono.includes(searchTerm)));
    if (filtered.length > 0) {
        resultsList.classList.remove('hidden');
    }
    filtered.slice(0, 5).forEach(client => {
        const div = document.createElement('div');
        div.className = 'p-2 cursor-pointer hover:bg-gray-100';
        div.textContent = `${client.nombre} (${client.telefono})`;
        div.onclick = () => selectClient(client);
        resultsList.appendChild(div);
    });
}

function selectClient(client) {
    document.getElementById('cliente-bloqueo-alert')?.classList.add('hidden');
    document.getElementById('client-search').value = client.nombre;
    document.getElementById('client-results-list').classList.add('hidden');

    if (client.bloqueado) {
        const motivo = document.getElementById('cliente-bloqueo-motivo');
        if (motivo) motivo.textContent = `Motivo: "${client.motivoBloqueo || 'Sin motivo especificado'}"`;
        document.getElementById('cliente-bloqueo-alert')?.classList.remove('hidden');
        document.getElementById('ir-editar-cliente-btn')?.addEventListener('click', () => handleNavigation('/clientes'), { once: true });
        return;
    }

    document.getElementById('new-client-name').value = client.nombre || '';
    document.getElementById('new-client-phone').value = client.telefono || '';
    document.getElementById('new-client-email').value = client.email || '';
    document.getElementById('new-client-company').value = '';
}

function clearClientSelection() {
    ['new-client-name', 'new-client-phone', 'new-client-email', 'new-client-company'].forEach(id => {
        if(document.getElementById(id)) document.getElementById(id).value = '';
    });
}

function createPropertyCheckbox(prop, isSuggested) {
    const box = isSuggested
        ? 'border-primary-200 bg-primary-50/90'
        : 'border-gray-200 bg-white';
    return `
    <div class="flex items-center justify-between rounded-lg border p-3 ${box}">
        <div class="min-w-0">
            <input type="checkbox" id="cb-${prop.id}" data-id="${prop.id}" class="propiedad-checkbox h-4 w-4 shrink-0 align-middle text-primary-600 border-gray-300 rounded" ${isSuggested ? 'checked' : ''}>
            <label for="cb-${prop.id}" class="ml-2 font-medium text-gray-900">${prop.nombre}</label>
            <span class="ml-2 text-sm text-gray-500">(Cap: ${prop.capacidad})</span>
        </div>
    </div>`;
}

async function renderSelectionUI() {
    const suggestionList = document.getElementById('suggestion-list');
    const availableList = document.getElementById('available-list');
    suggestionList.innerHTML = '';
    availableList.innerHTML = '';

    if (!availabilityData.suggestion) return;

    selectedProperties = [...availabilityData.suggestion.propiedades];

    const suggestedIds = new Set(availabilityData.suggestion.propiedades.map(p => p.id));
    const sugeridasHtml = availabilityData.suggestion.propiedades.map((p) => createPropertyCheckbox(p, true)).join('');
    suggestionList.innerHTML = `
        <div class="rounded-xl border border-primary-200 bg-primary-50/60 p-3 md:p-4">
          <h4 class="mb-2 text-sm font-semibold text-primary-900">Propiedades Sugeridas</h4>
          <div class="space-y-2">${sugeridasHtml}</div>
        </div>`;
    const otros = (availabilityData.availableProperties || []).filter((p) => !suggestedIds.has(p.id));
    availableList.innerHTML = otros.length
        ? `<h4 class="mb-2 mt-4 font-medium text-gray-800 md:mt-5">Otras Cabañas Disponibles</h4>
           <div class="grid max-h-60 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">${otros.map((p) => createPropertyCheckbox(p, false)).join('')}</div>`
        : '';

    document.querySelectorAll('.propiedad-checkbox').forEach(cb => cb.addEventListener('change', handleSelectionChange));

    updateSummary(availabilityData.suggestion.pricing);
    await generateBudgetText();
}

async function handleSelectionChange() {
    const selectedIds = new Set(Array.from(document.querySelectorAll('.propiedad-checkbox:checked')).map(cb => cb.dataset.id));
    selectedProperties = allProperties.filter(p => selectedIds.has(p.id));

    if (selectedProperties.length === 0) {
        document.getElementById('presupuesto-preview').value = 'Selecciona al menos una cabaña para generar el presupuesto.';
        updateSummary({ totalPriceCLP: 0, nights: currentPricing.nights, details: [] });
        return;
    }

    await updatePricingAndBudgetText();
}

async function updatePricingAndBudgetText() {
    const previewTextarea = document.getElementById('presupuesto-preview');
    previewTextarea.value = 'Calculando precios y generando presupuesto...';

    try {
        const payload = {
            fechaLlegada: document.getElementById('fecha-llegada').value,
            fechaSalida: document.getElementById('fecha-salida').value,
            propiedades: selectedProperties,
            canalId: appCanalId
        };
        const newPricing = await fetchAPI('/propuestas/recalcular', { method: 'POST', body: payload });
        updateSummary(newPricing);
        await generateBudgetText();
    } catch (error) {
        previewTextarea.value = `Error al recalcular: ${error.message}`;
        updateSummary({ totalPriceCLP: 0, nights: currentPricing.nights || 0, details: [] });
    }
}

function updateSummary(pricing) {
    currentPricing = pricing;
    document.getElementById('summary-precio-final').textContent = formatCurrency(pricing.totalPriceCLP);
}

async function generateBudgetText() {
    const previewTextarea = document.getElementById('presupuesto-preview');
    const fechaLlegada = document.getElementById('fecha-llegada').value;
    const fechaSalida = document.getElementById('fecha-salida').value;
    const personas = document.getElementById('personas').value;

    if (!fechaLlegada || !fechaSalida || !personas || selectedProperties.length === 0) {
        previewTextarea.value = 'Por favor, completa las fechas, personas y selecciona al menos una cabaña para generar el presupuesto.';
        return;
    }

    previewTextarea.value = 'Generando presupuesto...';

    try {
        const payload = {
            cliente: {
                nombre: document.getElementById('new-client-name').value || 'Cliente',
                empresa: document.getElementById('new-client-company').value,
            },
            fechaLlegada,
            fechaSalida,
            propiedades: selectedProperties,
            personas
        };
        const result = await fetchAPI('/presupuestos/generar-texto', { method: 'POST', body: payload });
        previewTextarea.value = result.texto;
    } catch (error) {
        previewTextarea.value = `Error al generar el presupuesto: ${error.message}`;
    }
}

export function render() {
    return `
        <div class="spa-form-page generador-presupuestos-view">
            <h2 class="text-2xl font-semibold text-gray-900 md:text-3xl">Generador de Presupuestos</h2>

            ${_gpSection(`
                ${_gpHeading(1, 'fa-user', 'Datos del Cliente')}
                <div class="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-x-10 lg:gap-y-6">
                    <div class="relative">
                        <label for="client-search" class="block text-sm font-medium text-gray-700">Buscar cliente existente</label>
                        <input type="text" id="client-search" placeholder="Escribe para buscar..." autocomplete="off" class="form-input mt-1 w-full">
                        <div id="client-results-list" class="absolute z-20 mt-1 hidden max-h-32 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-sm"></div>
                        <div id="cliente-bloqueo-alert" class="mt-2 hidden rounded-lg border border-danger-300 bg-danger-50 p-3 text-xs">
                            <p class="mb-1 flex items-center gap-1.5 font-semibold text-danger-800"><i class="fa-solid fa-ban"></i> Cliente bloqueado</p>
                            <p id="cliente-bloqueo-motivo" class="mb-2 text-danger-700"></p>
                            <p class="mb-2 text-danger-600">Para poder generar un presupuesto, primero debes desbloquear al cliente desde su ficha.</p>
                            <button id="ir-editar-cliente-btn" type="button" class="btn-outline border-danger-400 px-2 py-1 text-xs text-danger-700 hover:bg-danger-100">Ir a Editar Cliente <i class="fa-solid fa-arrow-right text-[10px]"></i></button>
                        </div>
                    </div>
                    <div>
                        <span class="mb-1 block text-sm font-medium text-gray-700">O añade / actualiza los datos del cliente</span>
                        <div class="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <input type="text" id="new-client-name" placeholder="Nombre completo" class="form-input sm:col-span-2">
                            <input type="text" id="new-client-company" placeholder="Empresa (opcional)" class="form-input">
                            <input type="tel" id="new-client-phone" placeholder="Teléfono (opcional)" class="form-input">
                            <input type="email" id="new-client-email" placeholder="Email(s) separados por ;" class="form-input sm:col-span-2">
                        </div>
                    </div>
                </div>
            `)}

            ${_gpSection(`
                ${_gpHeading(2, 'fa-calendar-days', 'Fechas y Personas')}
                <div class="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
                  <div class="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
                    <div class="min-w-[9.5rem]">
                        <label for="fecha-llegada" class="block text-sm font-medium text-gray-700">Fecha de llegada</label>
                        <input type="date" id="fecha-llegada" class="form-input mt-1 w-full sm:w-auto">
                    </div>
                    <div class="min-w-[9.5rem]">
                        <label for="fecha-salida" class="block text-sm font-medium text-gray-700">Fecha de salida</label>
                        <input type="date" id="fecha-salida" class="form-input mt-1 w-full sm:w-auto">
                    </div>
                    <div class="w-full min-w-[6rem] sm:w-28">
                        <label for="personas" class="block text-sm font-medium text-gray-700">Nº Personas</label>
                        <input type="number" id="personas" min="1" class="form-input mt-1 w-full">
                    </div>
                  </div>
                  <div class="flex flex-col gap-3 border-t border-gray-100 pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:border-0 sm:pt-0 lg:ml-auto lg:flex-1 lg:justify-end">
                    <label class="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
                      <input id="sin-camarotes" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-primary-600">
                      <span>Excluir camarotes</span>
                    </label>
                    <button id="generar-propuesta-btn" type="button" class="btn-primary w-full shrink-0 sm:w-auto lg:min-w-[11rem]">Generar propuesta</button>
                  </div>
                </div>
            `)}

            <div id="status-container" class="hidden rounded-lg border border-gray-200 bg-white p-4 text-center text-gray-500"></div>

            <div id="results-container" class="hidden">
                ${_gpSection(`
                    ${_gpHeading(3, 'fa-house-chimney', 'Propuesta y cabañas')}
                    <div id="suggestion-list"></div>
                    <div id="available-list" class="mt-2"></div>
                `)}
                <section class="presupuesto-summary-panel spa-form-summary flex min-h-0 w-full flex-col lg:min-h-[28rem]">
                    <div class="spa-form-summary-bar flex flex-wrap items-center justify-between gap-3">
                        <span class="text-base md:text-lg">Presupuesto final</span>
                        <span id="summary-precio-final" class="text-xl font-bold tabular-nums md:text-2xl">$0</span>
                    </div>
                    <div class="spa-form-summary-body flex min-h-0 flex-1 flex-col">
                        <label for="presupuesto-preview" class="sr-only">Texto del presupuesto</label>
                        <textarea id="presupuesto-preview" rows="22" class="form-input min-h-[320px] w-full flex-1 resize-y font-mono text-sm md:min-h-[420px] lg:min-h-[480px]"></textarea>
                    </div>
                    <div class="flex flex-wrap justify-end gap-2 border-t border-gray-200 px-5 py-4 md:gap-3">
                        <button id="guardar-presupuesto-btn" type="button" class="btn-secondary">Guardar borrador</button>
                        <button id="copy-btn" type="button" class="btn-secondary">Copiar</button>
                        <button id="email-btn" type="button" class="btn-primary" disabled>Enviar por email</button>
                    </div>
                </section>
            </div>
        </div>
    `;
}

function _crearRunSearch(generarBtn) {
    return async () => {
        const payload = {
            fechaLlegada: document.getElementById('fecha-llegada').value,
            fechaSalida: document.getElementById('fecha-salida').value,
            personas: document.getElementById('personas').value,
            sinCamarotes: document.getElementById('sin-camarotes').checked,
            canalId: appCanalId
        };
        if (!payload.fechaLlegada || !payload.fechaSalida || !payload.personas) {
            alert('Por favor, completa las fechas y la cantidad de personas.'); return null;
        }

        const statusContainer = document.getElementById('status-container');
        generarBtn.disabled = true;
        generarBtn.textContent = 'Generando...';
        statusContainer.textContent = 'Buscando disponibilidad y sugerencias...';
        statusContainer.classList.remove('hidden');
        _setResultsContainerVisible(false);

        try {
            availabilityData = await fetchAPI('/propuestas/generar', { method: 'POST', body: payload });
            allProperties = availabilityData.allProperties;
            if (availabilityData.suggestion) {
                statusContainer.classList.add('hidden');
                _setResultsContainerVisible(true);
                await renderSelectionUI();
                return true;
            } else {
                statusContainer.textContent = availabilityData.message || 'No se encontró disponibilidad.';
                return false;
            }
        } catch (error) {
            statusContainer.textContent = `Error: ${error.message}`;
            return false;
        } finally {
            generarBtn.disabled = false;
            generarBtn.textContent = 'Generar Propuesta';
        }
    };
}

async function _setupGuardarBtn() {
    document.getElementById('guardar-presupuesto-btn').addEventListener('click', async () => {
        const btn = document.getElementById('guardar-presupuesto-btn');
        const clienteParaGuardar = {
            id: allClients.find(c => c.nombre === document.getElementById('new-client-name').value)?.id,
            nombre: document.getElementById('new-client-name').value,
            telefono: document.getElementById('new-client-phone').value,
            email: document.getElementById('new-client-email').value,
        };

        if (!clienteParaGuardar.nombre) {
            alert('Debes ingresar al menos el nombre del cliente para guardar un presupuesto.');
            return;
        }

        const payload = {
            id: editId,
            cliente: clienteParaGuardar,
            fechaLlegada: document.getElementById('fecha-llegada').value,
            fechaSalida: document.getElementById('fecha-salida').value,
            personas: document.getElementById('personas').value,
            propiedades: selectedProperties,
            precioFinal: currentPricing.totalPriceCLP || 0,
            noches: currentPricing.nights || 0,
            texto: document.getElementById('presupuesto-preview').value
        };

        btn.disabled = true;
        btn.textContent = editId ? 'Actualizando...' : 'Guardando...';

        try {
            const endpoint = editId ? `/gestion-propuestas/presupuesto/${editId}` : '/gestion-propuestas/presupuesto';
            const method = editId ? 'PUT' : 'POST';
            await fetchAPI(endpoint, { method, body: payload });
            alert(`Presupuesto ${editId ? 'actualizado' : 'guardado'} con éxito. Puedes gestionarlo en "Gestionar Propuestas".`);
            handleNavigation('/gestionar-propuestas');
        } catch (error) {
            alert(`Error al guardar el presupuesto: ${error.message}`);
        } finally {
            btn.disabled = false;
            btn.textContent = editId ? 'Actualizar Borrador' : 'Guardar Borrador';
        }
    });
}

async function _handleModoEdicion(runSearch) {
    const params = new URLSearchParams(window.location.search);
    editId = params.get('edit');

    if (!editId) return;

    console.log("Modo Edición de Presupuesto detectado. Cargando datos...");

    document.getElementById('fecha-llegada').value = params.get('fechaLlegada');
    document.getElementById('fecha-salida').value = params.get('fechaSalida');
    document.getElementById('personas').value = params.get('personas');

    const clienteId = params.get('clienteId');
    const client = allClients.find(c => c.id === clienteId);
    if (client) {
        selectClient(client);
    }

    const searchSuccess = await runSearch();

    if (searchSuccess) {
        const propIds = params.get('propiedades').split(',');
        document.querySelectorAll('.propiedad-checkbox').forEach(cb => {
            cb.checked = propIds.includes(cb.dataset.id);
        });
        await handleSelectionChange();
    }
    document.getElementById('guardar-presupuesto-btn').textContent = 'Actualizar Borrador';
}

export async function afterRender() {
    await loadInitialData();
    const generarBtn = document.getElementById('generar-propuesta-btn');
    const runSearch = _crearRunSearch(generarBtn);
    document.getElementById('client-search').addEventListener('input', filterClients);
    generarBtn.addEventListener('click', runSearch);
    document.getElementById('copy-btn').addEventListener('click', () => {
        const textarea = document.getElementById('presupuesto-preview');
        textarea.select();
        document.execCommand('copy');
        alert('Presupuesto copiado al portapapeles.');
    });
    await _setupGuardarBtn();
    await _handleModoEdicion(runSearch);
}
