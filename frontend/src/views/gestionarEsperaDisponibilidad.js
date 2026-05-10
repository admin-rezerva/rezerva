import { fetchAPI } from '../api.js';

let rows = [];
let estados = [];

function renderRows() {
    const tbody = document.getElementById('espera-disponibilidad-tbody');
    if (!tbody) return;
    if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="whitespace-normal text-center text-gray-500 py-6">No hay registros de lista de espera.</td></tr>';
        return;
    }
    tbody.innerHTML = rows.map((r) => {
        const estadoOpts = estados.map((e) => `<option value="${e.id}" ${e.id === r.estadoId ? 'selected' : ''}>${e.nombre}</option>`).join('');
        const nombre = [r.nombre, r.apellido].filter(Boolean).join(' ').trim();
        return `
        <tr class="border-b">
            <td class="whitespace-nowrap py-2 px-3 text-sm">${nombre || '—'}</td>
            <td class="whitespace-nowrap py-2 px-3 text-sm">${r.email || '—'}</td>
            <td class="whitespace-nowrap py-2 px-3 text-sm">${r.telefono || '—'}</td>
            <td class="whitespace-nowrap py-2 px-3 text-sm">${r.fechaLlegada} → ${r.fechaSalida}</td>
            <td class="whitespace-nowrap py-2 px-3 text-sm">${r.personas}</td>
            <td class="whitespace-nowrap py-2 px-3 text-sm">${r.propiedadIdPreferida || 'Sin preferencia'}</td>
            <td class="whitespace-nowrap py-2 px-3 text-sm">
                <span class="inline-block whitespace-nowrap px-2 py-1 rounded text-white" style="background:${r.estadoColor || 'rgb(107 114 128)'}">${r.estadoNombre}</span>
            </td>
            <td class="whitespace-nowrap py-2 px-3 text-sm">
                <select class="form-select min-w-32 text-xs espera-estado-select" data-id="${r.id}">
                    ${estadoOpts}
                </select>
            </td>
        </tr>`;
    }).join('');
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

export async function render() {
    return `
    <div class="space-y-4 rounded-lg bg-white p-4 shadow sm:p-8">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div class="min-w-0 flex-1">
          <h2 class="text-xl font-semibold text-gray-900 sm:text-2xl">Lista de espera de disponibilidad</h2>
          <p class="mt-1 text-sm text-gray-500">Seguimiento de clientes sin disponibilidad y estado de notificación.</p>
        </div>
        <button type="button" id="espera-reconciliar-btn" class="btn-outline w-full shrink-0 sm:w-auto">Reconciliar ahora</button>
      </div>
      <p id="espera-reconciliar-status" class="text-xs text-gray-500"></p>
      <div class="w-full overflow-x-auto rounded-lg border border-gray-200">
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
    </div>`;
}

export async function afterRender() {
    await loadData();
    document.getElementById('espera-disponibilidad-tbody')?.addEventListener('change', handleEstadoChange);
    document.getElementById('espera-reconciliar-btn')?.addEventListener('click', handleReconcileClick);
}
