// frontend/src/views/gestionarPropuestas.js
import { fetchAPI } from '../api.js';
import { handleNavigation } from '../router.js';

let todasLasPropuestas = [];
let todosLosCanales = [];
let listenerAgregado = false;

function formatCurrency(value) { return `$${(Math.round(value) || 0).toLocaleString('es-CL')}`; }
function formatDate(dateString) { return new Date(dateString + 'T00:00:00Z').toLocaleDateString('es-CL', { timeZone: 'UTC' }); }

/** Misma lógica de filtros y orden que antes de renderizar filas/tarjetas. */
function getPropuestasFiltradasOrdenadas() {
    const canalFiltro = document.getElementById('canal-filter')?.value ?? '';
    const fechaInicio = document.getElementById('fecha-inicio-filter')?.value ?? '';
    const fechaFin = document.getElementById('fecha-fin-filter')?.value ?? '';

    const propuestasFiltradas = todasLasPropuestas.filter((item) => {
        const matchCanal = !canalFiltro || item.canalNombre === canalFiltro;
        const matchFecha = (!fechaInicio || item.fechaLlegada >= fechaInicio) && (!fechaFin || item.fechaLlegada <= fechaFin);
        return matchCanal && matchFecha;
    });

    propuestasFiltradas.sort((a, b) => {
        const aIncompleta = (!a.clienteId || a.monto === 0 || (a.origen === 'ical' && !a.clienteId));
        const bIncompleta = (!b.clienteId || b.monto === 0 || (b.origen === 'ical' && !b.clienteId));
        if (aIncompleta && !bIncompleta) return -1;
        if (!aIncompleta && bIncompleta) return 1;
        return new Date(b.fechaLlegada) - new Date(a.fechaLlegada);
    });

    return propuestasFiltradas;
}

function camposFilaPropuesta(item) {
    const isIncomplete = !item.clienteId || item.monto === 0 || (item.origen === 'ical' && !item.clienteId);
    const icalIndicator = item.origen === 'ical' ? '<span title="Generado desde iCal" class="mr-2">🗓️</span>' : '';
    const tipoTexto = item.tipo === 'propuesta' ? 'Reserva Tentativa' : 'Presupuesto Formal';
    const clienteNombre = item.origen === 'ical' && isIncomplete ? (item.idReservaCanal || item.id) : (item.clienteNombre || 'N/A');
    const montoTexto = (isIncomplete && item.monto === 0) ? 'Por completar' : formatCurrency(item.monto);
    const personasTexto = item.personas > 0 ? item.personas : (isIncomplete ? '?' : 'N/A');
    const noches = Math.round((new Date(item.fechaSalida) - new Date(item.fechaLlegada)) / (1000 * 60 * 60 * 24));
    return {
        isIncomplete,
        icalIndicator,
        tipoTexto,
        clienteNombre,
        montoTexto,
        personasTexto,
        noches,
    };
}

function botonesAccionHtml(item, isIncomplete) {
    const idsReservas = item.idsReservas?.join(',') || '';
    const clienteId = item.clienteId || '';
    return `
                <button type="button" data-id="${item.id}" data-tipo="${item.tipo}" class="edit-btn btn-outline text-xs w-full min-h-[2.5rem]">Editar / Completar</button>
                <button type="button" data-id="${item.id}" data-tipo="${item.tipo}" data-ids-reservas="${idsReservas}" data-cliente-id="${clienteId}" class="approve-btn btn-primary text-xs w-full min-h-[2.5rem]" ${isIncomplete ? 'disabled' : ''}>Aprobar</button>
                <button type="button" data-id="${item.id}" data-tipo="${item.tipo}" data-ids-reservas="${idsReservas}" class="reject-btn btn-danger text-xs w-full min-h-[2.5rem]">Rechazar</button>`;
}

function renderTabla() {
    const tbody = document.getElementById('propuestas-tbody');
    const cardsRoot = document.getElementById('propuestas-cards');
    if (!tbody || !cardsRoot) return;

    const propuestasFiltradas = getPropuestasFiltradasOrdenadas();

    if (propuestasFiltradas.length === 0) {
        const empty = '<tr><td colspan="10" class="text-center text-gray-500 py-4">No hay propuestas que coincidan con los filtros.</td></tr>';
        tbody.innerHTML = empty;
        cardsRoot.innerHTML = '<p class="text-center text-sm text-gray-500 py-8">No hay propuestas que coincidan con los filtros.</p>';
        return;
    }

    tbody.innerHTML = propuestasFiltradas.map((item, index) => {
        const {
            isIncomplete, icalIndicator, tipoTexto, clienteNombre, montoTexto, personasTexto, noches,
        } = camposFilaPropuesta(item);

        return `
        <tr class="border-b text-sm hover:bg-gray-50 ${isIncomplete ? 'bg-warning-50' : ''}">
            <td class="p-2 text-center font-medium text-gray-500">${index + 1}</td>
            <td class="p-2">${icalIndicator}${tipoTexto} ${isIncomplete ? '<span class="text-danger-600 font-medium">(Incompleta)</span>' : ''}</td>
            <td class="p-2 font-medium">${item.canalNombre || 'N/A'}</td>
            <td class="p-2 font-medium truncate" style="max-width: 200px;" title="${clienteNombre}">${clienteNombre}</td>
            <td class="p-2">${formatDate(item.fechaLlegada)} al ${formatDate(item.fechaSalida)}</td>
            <td class="p-2 text-center">${noches}</td>
            <td class="p-2 text-center font-bold">${personasTexto}</td>
            <td class="p-2">${item.propiedadesNombres}</td>
            <td class="p-2 font-semibold text-right">${montoTexto}</td>
            <td class="p-2 text-center space-x-2 whitespace-nowrap">
                <button type="button" data-id="${item.id}" data-tipo="${item.tipo}" class="edit-btn btn-table-copy">Editar/Completar</button>
                <button type="button" data-id="${item.id}" data-tipo="${item.tipo}" data-ids-reservas="${item.idsReservas?.join(',')}" data-cliente-id="${item.clienteId || ''}" class="approve-btn btn-table-edit" ${isIncomplete ? 'disabled' : ''}>Aprobar</button>
                <button type="button" data-id="${item.id}" data-tipo="${item.tipo}" data-ids-reservas="${item.idsReservas?.join(',')}" class="reject-btn btn-table-delete">Rechazar</button>
            </td>
        </tr>
    `;
    }).join('');

    cardsRoot.innerHTML = propuestasFiltradas.map((item, index) => {
        const {
            isIncomplete, icalIndicator, tipoTexto, clienteNombre, montoTexto, personasTexto, noches,
        } = camposFilaPropuesta(item);

        return `
        <div class="rounded-xl border border-gray-200 p-4 shadow-sm ${isIncomplete ? 'bg-warning-50' : 'bg-white'}">
            <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                    <div class="text-xs font-medium text-gray-500">#${index + 1}</div>
                    <div class="mt-0.5 text-sm font-semibold text-gray-900">${icalIndicator}${tipoTexto}${isIncomplete ? ' <span class="text-danger-600">(Incompleta)</span>' : ''}</div>
                </div>
                <span class="shrink-0 rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800">${item.canalNombre || 'N/A'}</span>
            </div>
            <div class="mt-3 space-y-2 text-sm text-gray-600">
                <div class="flex min-w-0 items-start gap-2">
                    <i class="fa-solid fa-user mt-0.5 w-4 shrink-0 text-center text-gray-400" aria-hidden="true"></i>
                    <span class="min-w-0 break-words font-medium text-gray-800">${clienteNombre}</span>
                </div>
                <div class="flex min-w-0 items-center gap-2">
                    <i class="fa-solid fa-calendar-days w-4 shrink-0 text-center text-gray-400" aria-hidden="true"></i>
                    <span>${formatDate(item.fechaLlegada)} → ${formatDate(item.fechaSalida)}</span>
                </div>
                <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                    <span><span class="font-medium text-gray-500">Noches:</span> ${noches}</span>
                    <span><span class="font-medium text-gray-500">Pers.:</span> ${personasTexto}</span>
                </div>
                <div class="flex min-w-0 items-start gap-2">
                    <i class="fa-solid fa-house mt-0.5 w-4 shrink-0 text-center text-gray-400" aria-hidden="true"></i>
                    <span class="min-w-0 break-words">${item.propiedadesNombres || '—'}</span>
                </div>
                <div class="border-t border-gray-100 pt-2 text-base font-semibold text-gray-900">${montoTexto}</div>
            </div>
            <div class="mt-3 flex flex-col gap-2 border-t border-gray-200 pt-3">
                ${botonesAccionHtml(item, isIncomplete)}
            </div>
        </div>`;
    }).join('');
}

async function fetchAndRender() {
    try {
        [todasLasPropuestas, todosLosCanales] = await Promise.all([
            fetchAPI('/gestion-propuestas'),
            fetchAPI('/canales'),
        ]);

        const canalFilter = document.getElementById('canal-filter');
        canalFilter.innerHTML = '<option value="">Todos los Canales</option>';
        todosLosCanales.forEach((canal) => {
            canalFilter.add(new Option(canal.nombre, canal.nombre));
        });

        renderTabla();
    } catch (error) {
        const msg = `<tr><td colspan="10" class="text-center text-danger-500 py-4">Error al cargar: ${error.message}</td></tr>`;
        const tbody = document.getElementById('propuestas-tbody');
        const cardsRoot = document.getElementById('propuestas-cards');
        if (tbody) tbody.innerHTML = msg;
        if (cardsRoot) {
            cardsRoot.innerHTML = `<p class="text-center text-sm text-danger-600 py-8">Error al cargar: ${error.message}</p>`;
        }
    }
}

function _handleEditarPropuesta(target, id) {
    const item = todasLasPropuestas.find(p => p.id === id);
    if (!item) {
        alert('Error: No se pudo encontrar el ítem para editar.');
        return;
    }

    const personas = item.personas || 1;
    let params;
    let route;

    if (item.tipo === 'propuesta') {
        const loadDocId = item.idsReservas && item.idsReservas.length > 0 ? item.idsReservas[0] : null;
        if (!loadDocId) {
            alert(`Error: Esta propuesta (ID: ${id}) no tiene un ID de reserva válido para cargar.`);
            return;
        }
        params = new URLSearchParams({
            edit: id,
            load: loadDocId,
            props: item.propiedades.map(p => p.id).join(','),
            clienteId: item.clienteId || '',
            fechaLlegada: item.fechaLlegada,
            fechaSalida: item.fechaSalida,
            personas,
            idReservaCanal: item.idReservaCanal || '',
            canalId: item.canalId || '',
            origen: item.origen || 'manual',
            icalUid: item.icalUid || '',
        });
        route = '/agregar-propuesta';
    } else {
        params = new URLSearchParams({
            edit: item.id,
            clienteId: item.clienteId || '',
            fechaLlegada: item.fechaLlegada,
            fechaSalida: item.fechaSalida,
            personas: item.personas || 1,
            propiedades: item.propiedades.map(p => p.id).join(','),
            canalId: item.canalId || '',
            origen: item.origen || 'manual',
        });
        route = '/generar-presupuesto';
    }

    handleNavigation(`${route}?${params.toString()}`);
}

async function _handleAprobarPropuesta(target, id, tipo) {
    target.dataset.processing = 'true';
    target.disabled = true;
    const textoOriginal = target.textContent;
    target.textContent = 'Verificando...';

    try {
        let result;
        if (tipo === 'propuesta') {
            const idsReservas = target.dataset.idsReservas?.split(',').filter(Boolean) || [];
            if (idsReservas.length === 0) {
                throw new Error('No se encontraron IDs de reserva para aprobar.');
            }
            result = await fetchAPI(`/gestion-propuestas/propuesta/${id}/verificar-disponibilidad`, {
                method: 'POST',
                body: { idsReservas },
            });
            if (!confirm(`¿Estás seguro de que quieres aprobar esta propuesta?\n\nLa disponibilidad ha sido verificada.`)) {
                target.disabled = false;
                target.textContent = textoOriginal;
                target.dataset.processing = 'false';
                return;
            }
            target.textContent = 'Aprobando...';
            result = await fetchAPI(`/gestion-propuestas/propuesta/${id}/aprobar`, {
                method: 'POST',
                body: { idsReservas },
            });
        } else {
            if (!confirm(`¿Estás seguro de que quieres aprobar este presupuesto?\n\nSe verificará la disponibilidad antes de confirmar.`)) {
                target.disabled = false;
                target.textContent = textoOriginal;
                target.dataset.processing = 'false';
                return;
            }
            target.textContent = 'Aprobando...';
            result = await fetchAPI(`/gestion-propuestas/presupuesto/${id}/aprobar`, { method: 'POST' });
        }
        alert(`✅ ${result.message}`);
        await fetchAndRender();
    } catch (error) {
        alert(`❌ Error al aprobar: ${error.message}`);
        target.disabled = false;
        target.textContent = textoOriginal;
    } finally {
        target.dataset.processing = 'false';
    }
}

async function _handleRechazarPropuesta(target, id, tipo) {
    const tipoTexto = tipo === 'propuesta' ? 'esta propuesta' : 'este presupuesto';
    if (!confirm(`¿Estás seguro de que quieres rechazar ${tipoTexto}?\n\nEsta acción eliminará la propuesta permanentemente.`)) {
        return;
    }
    target.dataset.processing = 'true';
    target.disabled = true;
    const textoOriginal = target.textContent;
    target.textContent = 'Eliminando...';

    try {
        if (tipo === 'propuesta') {
            const idsReservas = target.dataset.idsReservas?.split(',').filter(Boolean) || [];
            await fetchAPI(`/gestion-propuestas/propuesta/${id}/rechazar`, {
                method: 'POST',
                body: { idsReservas },
            });
        } else {
            await fetchAPI(`/gestion-propuestas/presupuesto/${id}/rechazar`, { method: 'POST' });
        }
        alert('✅ Propuesta rechazada y eliminada.');
        await fetchAndRender();
    } catch (error) {
        alert(`❌ Error: ${error.message}`);
        target.disabled = false;
        target.textContent = textoOriginal;
    } finally {
        target.dataset.processing = 'false';
    }
}

async function handlePanelClick(e) {
    const target = e.target.closest('button[data-id]');
    if (!target) return;
    if (target.dataset.processing === 'true') return;

    const id = target.dataset.id;
    const tipo = target.dataset.tipo;
    if (!id || !tipo) return;

    if (target.classList.contains('edit-btn')) {
        _handleEditarPropuesta(target, id);
        return;
    }
    if (target.classList.contains('approve-btn')) {
        await _handleAprobarPropuesta(target, id, tipo);
        return;
    }
    if (target.classList.contains('reject-btn')) {
        await _handleRechazarPropuesta(target, id, tipo);
        return;
    }
}

export async function render() {
    listenerAgregado = false;

    return `
        <div id="gestionar-propuestas-panel" class="rounded-lg bg-white p-4 shadow sm:p-8">
            <h2 class="mb-4 text-xl font-semibold text-gray-900 sm:text-2xl">Gestionar Propuestas y Presupuestos</h2>

            <div class="mb-6 grid grid-cols-1 gap-4 rounded-md border bg-gray-50 p-4 md:grid-cols-3">
                <div>
                    <label for="canal-filter" class="block text-sm font-medium text-gray-700">Filtrar por Canal</label>
                    <select id="canal-filter" class="form-select mt-1"></select>
                </div>
                <div>
                    <label for="fecha-inicio-filter" class="block text-sm font-medium text-gray-700">Desde (Fecha de Llegada)</label>
                    <input type="date" id="fecha-inicio-filter" class="form-input mt-1">
                </div>
                <div>
                    <label for="fecha-fin-filter" class="block text-sm font-medium text-gray-700">Hasta (Fecha de Llegada)</label>
                    <input type="date" id="fecha-fin-filter" class="form-input mt-1">
                </div>
            </div>

            <div class="spa-md-table-wrap">
                <div class="table-container hide-scrollbar">
                    <table class="min-w-full bg-white">
                        <thead><tr>
                            <th class="th w-12">#</th>
                            <th class="th">Tipo</th>
                            <th class="th">Canal</th>
                            <th class="th">Cliente / ID iCal</th>
                            <th class="th">Fechas</th>
                            <th class="th text-center">Noches</th>
                            <th class="th text-center">Pers.</th>
                            <th class="th">Propiedades</th>
                            <th class="th text-right">Monto</th>
                            <th class="th text-center">Acciones</th>
                        </tr></thead>
                        <tbody id="propuestas-tbody"></tbody>
                    </table>
                </div>
            </div>
            <div id="propuestas-cards" class="spa-md-cards-wrap space-y-4" aria-label="Propuestas y presupuestos (vista móvil)"></div>
        </div>
    `;
}

export async function afterRender() {
    await fetchAndRender();

    document.getElementById('canal-filter').addEventListener('change', renderTabla);
    document.getElementById('fecha-inicio-filter').addEventListener('input', renderTabla);
    document.getElementById('fecha-fin-filter').addEventListener('input', renderTabla);

    const panel = document.getElementById('gestionar-propuestas-panel');
    if (!listenerAgregado && panel) {
        panel.addEventListener('click', handlePanelClick);
        listenerAgregado = true;
    }
}
