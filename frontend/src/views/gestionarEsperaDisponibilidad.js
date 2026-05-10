import { fetchAPI } from '../api.js';

let rows = [];
let estados = [];

function nombreCliente(r) {
    const nombre = [r.nombre, r.apellido].filter(Boolean).join(' ').trim();
    return nombre || '—';
}

function labelPropiedad(r) {
    return r.propiedadIdPreferida || 'Sin preferencia';
}

function htmlEstadoOptions(r) {
    return estados.map((e) => `<option value="${e.id}" ${e.id === r.estadoId ? 'selected' : ''}>${e.nombre}</option>`).join('');
}

function renderRows() {
    const tbody = document.getElementById('espera-disponibilidad-tbody');
    const cardsRoot = document.getElementById('espera-disponibilidad-cards');
    if (!tbody || !cardsRoot) return;

    if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="whitespace-normal text-center text-gray-500 py-6">No hay registros de lista de espera.</td></tr>';
        cardsRoot.innerHTML = '<p class="text-center text-sm text-gray-500 py-8">No hay registros de lista de espera.</p>';
        return;
    }

    tbody.innerHTML = rows.map((r) => `
        <tr class="border-b">
            <td class="whitespace-nowrap py-2 px-3 text-sm">${nombreCliente(r)}</td>
            <td class="whitespace-nowrap py-2 px-3 text-sm">${r.email || '—'}</td>
            <td class="whitespace-nowrap py-2 px-3 text-sm">${r.telefono || '—'}</td>
            <td class="whitespace-nowrap py-2 px-3 text-sm">${r.fechaLlegada} → ${r.fechaSalida}</td>
            <td class="whitespace-nowrap py-2 px-3 text-sm">${r.personas}</td>
            <td class="whitespace-nowrap py-2 px-3 text-sm">${labelPropiedad(r)}</td>
            <td class="whitespace-nowrap py-2 px-3 text-sm">
                <span class="inline-block whitespace-nowrap px-2 py-1 rounded text-white" style="background:${r.estadoColor || 'rgb(107 114 128)'}">${r.estadoNombre}</span>
            </td>
            <td class="whitespace-nowrap py-2 px-3 text-sm">
                <select class="form-select min-w-32 text-xs espera-estado-select" data-id="${r.id}">
                    ${htmlEstadoOptions(r)}
                </select>
            </td>
        </tr>`).join('');

    cardsRoot.innerHTML = rows.map((r) => `
        <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div class="flex items-start justify-between gap-3">
                <div class="min-w-0 text-base font-semibold text-gray-900">${nombreCliente(r)}</div>
                <span class="inline-flex shrink-0 whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold text-white" style="background:${r.estadoColor || 'rgb(107 114 128)'}">${r.estadoNombre}</span>
            </div>
            <div class="mt-3 space-y-2.5 text-sm text-gray-600">
                <div class="flex min-w-0 items-start gap-2">
                    <i class="fa-solid fa-envelope mt-0.5 w-4 shrink-0 text-center text-gray-400" aria-hidden="true"></i>
                    <span class="min-w-0 break-all">${r.email || '—'}</span>
                </div>
                <div class="flex min-w-0 items-center gap-2">
                    <i class="fa-solid fa-phone w-4 shrink-0 text-center text-gray-400" aria-hidden="true"></i>
                    <span class="min-w-0">${r.telefono || '—'}</span>
                </div>
                <div class="flex min-w-0 items-center gap-2">
                    <i class="fa-solid fa-calendar-days w-4 shrink-0 text-center text-gray-400" aria-hidden="true"></i>
                    <span class="min-w-0">${r.fechaLlegada} → ${r.fechaSalida}</span>
                </div>
                <div class="flex items-stretch gap-3 border-t border-gray-100 pt-2.5">
                    <div class="flex min-w-0 flex-1 items-center gap-2">
                        <i class="fa-solid fa-users w-4 shrink-0 text-center text-gray-400" aria-hidden="true"></i>
                        <span>${r.personas} pax</span>
                    </div>
                    <div class="w-px shrink-0 self-center bg-gray-200" style="min-height:1rem"></div>
                    <div class="flex min-w-0 flex-1 items-center gap-2">
                        <i class="fa-solid fa-location-dot w-4 shrink-0 text-center text-gray-400" aria-hidden="true"></i>
                        <span class="truncate">${labelPropiedad(r)}</span>
                    </div>
                </div>
            </div>
            <div class="mt-3 border-t border-gray-200 pt-3">
                <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500">Cambiar estado</label>
                <select class="form-select espera-estado-select w-full text-sm" data-id="${r.id}">
                    ${htmlEstadoOptions(r)}
                </select>
            </div>
        </div>`).join('');
}

async function loadData() {
    [estados, rows] = await Promise.all([
        fetchAPI('/espera-disponibilidad/estados'),
        fetchAPI('/espera-disponibilidad'),
    ]);
    renderRows();
}

async function handleEstadoChange(e) {
    const select = e.target.closest('.espera-estado-select');
    if (!select) return;
    const id = String(select.dataset.id || '').trim();
    const estadoId = String(select.value || '').trim();
    if (!id || !estadoId) return;
    try {
        await fetchAPI(`/espera-disponibilidad/${id}/estado`, {
            method: 'PUT',
            body: { estadoId },
        });
        await loadData();
    } catch (error) {
        alert(`No se pudo actualizar estado: ${error.message}`);
    }
}

async function handleReconcileClick() {
    const btn = document.getElementById('espera-reconciliar-btn');
    const status = document.getElementById('espera-reconciliar-status');
    try {
        btn.disabled = true;
        btn.textContent = 'Revisando...';
        const result = await fetchAPI('/espera-disponibilidad/reconciliar', { method: 'POST', body: {} });
        status.textContent = `Reconciliación: revisados ${result.scanned || 0}, notificados ${result.notified || 0}, expirados ${result.expired || 0}, fallidos ${result.failed || 0}.`;
        await loadData();
    } catch (error) {
        status.textContent = `Error: ${error.message}`;
    } finally {
        btn.disabled = false;
        btn.textContent = 'Reconciliar ahora';
    }
}

/** Tabla en md+; tarjetas en móvil. Misma data y mismos selects (clase `espera-estado-select`). */
export async function render() {
    return `
    <div id="espera-disponibilidad-panel" class="space-y-4 rounded-lg bg-white p-4 shadow sm:p-8">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="min-w-0 flex-1">
          <h2 class="text-xl font-semibold text-gray-900 sm:text-2xl">Lista de espera de disponibilidad</h2>
          <p class="mt-1 text-sm text-gray-500">Seguimiento de clientes sin disponibilidad y estado de notificación.</p>
        </div>
        <button type="button" id="espera-reconciliar-btn" class="btn-outline w-full shrink-0 sm:w-auto">Reconciliar ahora</button>
      </div>
      <p id="espera-reconciliar-status" class="text-xs text-gray-500"></p>
      <div class="espera-disponibilidad-table-host">
        <div class="w-full overflow-x-auto hide-scrollbar">
          <table class="min-w-full whitespace-nowrap bg-white">
            <thead>
              <tr>
                <th class="th whitespace-nowrap">Cliente</th>
                <th class="th whitespace-nowrap">Email</th>
                <th class="th whitespace-nowrap">Teléfono</th>
                <th class="th whitespace-nowrap">Fechas</th>
                <th class="th whitespace-nowrap">Pax</th>
                <th class="th whitespace-nowrap">Propiedad</th>
                <th class="th whitespace-nowrap">Estado</th>
                <th class="th whitespace-nowrap">Cambiar</th>
              </tr>
            </thead>
            <tbody id="espera-disponibilidad-tbody"></tbody>
          </table>
        </div>
      </div>
      <div id="espera-disponibilidad-cards" class="espera-disponibilidad-cards-host space-y-4" aria-label="Lista de espera (vista móvil)"></div>
    </div>`;
}

export async function afterRender() {
    await loadData();
    document.getElementById('espera-disponibilidad-panel')?.addEventListener('change', handleEstadoChange);
    document.getElementById('espera-reconciliar-btn')?.addEventListener('click', handleReconcileClick);
}
