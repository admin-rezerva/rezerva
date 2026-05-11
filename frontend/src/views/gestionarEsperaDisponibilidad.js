import { fetchAPI } from '../api.js';

let rows = [];
let estados = [];

const MESES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function nombreCliente(r) {
    const nombre = [r.nombre, r.apellido].filter(Boolean).join(' ').trim();
    return nombre || '—';
}

function labelPropiedad(r) {
    return r.propiedadIdPreferida || 'Sin preferencia';
}

function htmlEstadoOptions(r) {
    const opts = estados.map((e) => `<option value="${e.id}" ${e.id === r.estadoId ? 'selected' : ''}>${e.nombre}</option>`).join('');
    return `<option value="" disabled hidden>Cambiar a…</option>${opts}`;
}

function hashHue(str) {
    let h = 0;
    for (let i = 0; i < str.length; i += 1) {
        h = ((h << 5) - h) + str.charCodeAt(i);
    }
    return Math.abs(h) % 360;
}

/** Avatar PC: iniciales + color pastel estable por cliente */
function avatarBlock(r) {
    const name = nombreCliente(r);
    const mail = (r.email || '').trim();
    const parts = [r.nombre, r.apellido].filter(Boolean).map((p) => String(p).trim()).filter(Boolean);
    let initials = '';
    if (parts.length >= 2) {
        initials = `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
    } else if (parts.length === 1 && parts[0].length >= 2) {
        initials = parts[0].slice(0, 2).toUpperCase();
    } else if (mail) {
        initials = mail.slice(0, 2).toUpperCase();
    } else {
        initials = '?';
    }
    const key = name !== '—' ? name : mail || 'x';
    const hue = hashHue(key);
    const style = `background-color:hsl(${hue} 42% 90%);color:hsl(${hue} 38% 22%)`;
    return `<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold" style="${style}" aria-hidden="true">${initials}</div>`;
}

function formatFechaEstadia(iso) {
    if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(String(iso))) return '—';
    const [y, m, d] = String(iso).slice(0, 10).split('-');
    const mi = parseInt(m, 10) - 1;
    const mes = MESES_CORTO[mi] || m;
    return `${parseInt(d, 10)} ${mes} ${y}`;
}

function formatRangoEstadia(inicio, fin) {
    return `${formatFechaEstadia(inicio)} → ${formatFechaEstadia(fin)}`;
}

function estadoIconAndTone(nombre) {
    const n = String(nombre || '').toLowerCase();
    if (n.includes('activ')) {
        return { icon: 'fa-circle-check', tone: 'success' };
    }
    if (n.includes('espera')) {
        return { icon: 'fa-clock', tone: 'warning' };
    }
    return { icon: 'fa-circle-dot', tone: 'neutral' };
}

/** Color de API seguro para `style` (hex o rgb); si no, gris. */
function safeCssColor(raw) {
    const s = String(raw || '').trim();
    if (/^#[0-9A-Fa-f]{6}$/i.test(s) || /^#[0-9A-Fa-f]{3}$/i.test(s)) return s;
    if (/^rgba?\(\s*\d/.test(s)) return s;
    return '#6b7280';
}

/** Pill de estado: tokens semánticos si el nombre lo permite; si no, pill gris + punto de color API */
function htmlEstadoPill(r) {
    const label = r.estadoNombre || '—';
    const { icon, tone } = estadoIconAndTone(label);
    const base = 'inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold';
    if (tone === 'success') {
        return `<span class="${base} border-success-200 bg-success-50 text-success-800"><i class="fa-solid ${icon} shrink-0 opacity-90" aria-hidden="true"></i><span class="truncate">${label}</span></span>`;
    }
    if (tone === 'warning') {
        return `<span class="${base} border-warning-200 bg-warning-50 text-warning-800"><i class="fa-solid ${icon} shrink-0 opacity-90" aria-hidden="true"></i><span class="truncate">${label}</span></span>`;
    }
    const dot = safeCssColor(r.estadoColor);
    return `<span class="${base} border-gray-200 bg-gray-50 text-gray-800"><span class="inline-block h-2 w-2 shrink-0 rounded-full" style="background-color:${dot}" aria-hidden="true"></span><span class="truncate">${label}</span></span>`;
}

function renderRows() {
    const tbody = document.getElementById('espera-disponibilidad-tbody');
    const cardsRoot = document.getElementById('espera-disponibilidad-cards');
    if (!tbody || !cardsRoot) return;

    if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="whitespace-normal px-4 py-6 text-center text-sm text-gray-500">No hay registros de lista de espera.</td></tr>';
        cardsRoot.innerHTML = '<p class="py-8 text-center text-sm text-gray-500">No hay registros de lista de espera.</p>';
        return;
    }

    tbody.innerHTML = rows.map((r) => `
        <tr class="border-b border-gray-100 last:border-b-0">
            <td class="min-w-[220px] py-3 px-4 align-middle">
                <div class="flex min-w-0 items-center gap-3">
                    ${avatarBlock(r)}
                    <div class="min-w-0">
                        <div class="truncate font-semibold text-gray-900">${nombreCliente(r)}</div>
                        <div class="truncate text-xs text-gray-500">${r.email || '—'}</div>
                    </div>
                </div>
            </td>
            <td class="whitespace-nowrap py-3 px-4 align-middle text-sm text-gray-700">${r.telefono || '—'}</td>
            <td class="whitespace-nowrap py-3 px-4 align-middle text-sm text-gray-700">
                <span class="inline-flex items-center gap-2">
                    <i class="fa-solid fa-calendar-days shrink-0 text-gray-400" aria-hidden="true"></i>
                    ${formatRangoEstadia(r.fechaLlegada, r.fechaSalida)}
                </span>
            </td>
            <td class="min-w-[140px] max-w-xs py-3 px-4 align-middle text-sm text-gray-600">
                <div class="flex min-w-0 items-center gap-2">
                    <i class="fa-solid fa-users w-4 shrink-0 text-center text-gray-400" aria-hidden="true"></i>
                    <span>${r.personas} pax</span>
                </div>
                <div class="mt-1 flex min-w-0 items-center gap-2">
                    <i class="fa-solid fa-location-dot w-4 shrink-0 text-center text-gray-400" aria-hidden="true"></i>
                    <span class="truncate" title="${String(labelPropiedad(r)).replace(/"/g, '&quot;')}">${labelPropiedad(r)}</span>
                </div>
            </td>
            <td class="py-3 px-4 align-middle">${htmlEstadoPill(r)}</td>
            <td class="min-w-[200px] py-3 px-4 align-middle">
                <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                    <span class="whitespace-nowrap text-xs text-gray-500">Cambiar a</span>
                    <select class="form-select espera-estado-select min-w-[10rem] flex-1 text-xs" data-id="${r.id}" aria-label="Cambiar estado del registro">
                        ${htmlEstadoOptions(r)}
                    </select>
                </div>
            </td>
        </tr>`).join('');

    cardsRoot.innerHTML = rows.map((r) => `
        <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div class="flex items-start justify-between gap-3">
                <div class="min-w-0 text-base font-semibold text-gray-900">${nombreCliente(r)}</div>
                <span class="shrink-0">${htmlEstadoPill(r)}</span>
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
                    <span class="min-w-0">${formatRangoEstadia(r.fechaLlegada, r.fechaSalida)}</span>
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

/**
 * PC (`md`+): tabla estándar — columnas Cliente (avatar + nombre + email), Teléfono, Estadía, Detalles, Estado, Acción.
 * Móvil: tarjetas `spa-md-cards-wrap` (misma data, mismos selects). Ver `TASKS/tema/SM-spa-mobile-ui/README.md`.
 */
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
      <div class="spa-md-table-wrap">
        <div class="w-full overflow-x-auto rounded-lg border border-gray-200 bg-white hide-scrollbar">
          <table class="min-w-full bg-white">
            <thead>
              <tr>
                <th class="th">Cliente</th>
                <th class="th">Teléfono</th>
                <th class="th">Estadía</th>
                <th class="th">Detalles</th>
                <th class="th">Estado</th>
                <th class="th">Acción</th>
              </tr>
            </thead>
            <tbody id="espera-disponibilidad-tbody"></tbody>
          </table>
        </div>
      </div>
      <div id="espera-disponibilidad-cards" class="spa-md-cards-wrap space-y-4" aria-label="Lista de espera (vista móvil)"></div>
    </div>`;
}

export async function afterRender() {
    await loadData();
    document.getElementById('espera-disponibilidad-panel')?.addEventListener('change', handleEstadoChange);
    document.getElementById('espera-reconciliar-btn')?.addEventListener('click', handleReconcileClick);
}
