// frontend/src/views/gestionarPropuestas.js
import { fetchAPI } from '../api.js';
import { handleNavigation } from '../router.js';

let todasLasPropuestas = [];
let todosLosCanales = [];
let listenerAgregado = false;

function formatCurrency(value) { return `$${(Math.round(value) || 0).toLocaleString('es-CL')}`; }

const MESES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function escHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/"/g, '&quot;');
}

function hashHue(str) {
    let h = 0;
    for (let i = 0; i < str.length; i += 1) {
        h = ((h << 5) - h) + str.charCodeAt(i);
    }
    return Math.abs(h) % 360;
}

/** Avatar compacto PC — mismo criterio que lista de espera §6.2 */
function avatarClientePropuesta(nombreMostrado, stableKey) {
    const name = String(nombreMostrado || '—').trim();
    const parts = name.split(/\s+/).filter(Boolean);
    let initials = '?';
    if (parts.length >= 2) initials = `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
    else if (parts.length === 1 && parts[0].length >= 2) initials = parts[0].slice(0, 2).toUpperCase();
    else if (parts.length === 1) initials = `${parts[0][0] || '?'}`.toUpperCase();
    const key = stableKey || name;
    const hue = hashHue(String(key));
    const style = `background-color:hsl(${hue} 42% 90%);color:hsl(${hue} 38% 22%)`;
    return `<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold" style="${style}" aria-hidden="true">${initials}</div>`;
}

function formatFechaEstadiaCorta(iso) {
    if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(String(iso))) return '—';
    const [y, m, d] = String(iso).slice(0, 10).split('-');
    const mi = parseInt(m, 10) - 1;
    const mes = MESES_CORTO[mi] || m;
    return `${parseInt(d, 10)} ${mes} ${y}`;
}

function formatRangoEstadiaPC(inicio, fin) {
    return `${formatFechaEstadiaCorta(inicio)} → ${formatFechaEstadiaCorta(fin)}`;
}

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
    const icalIndicator = item.origen === 'ical'
        ? '<i class="fa-solid fa-calendar-week mr-1.5 shrink-0 text-primary-600" title="Origen iCal" aria-hidden="true"></i>'
        : '';
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

/** Vista única en tarjetas (móvil y escritorio). El patrón spa-md-* muestra tabla en PC y oculta tarjetas; aquí no lo usamos. */
function renderPropuestas() {
    const cardsRoot = document.getElementById('propuestas-cards');
    if (!cardsRoot) return;

    const propuestasFiltradas = getPropuestasFiltradasOrdenadas();

    if (propuestasFiltradas.length === 0) {
        cardsRoot.innerHTML = '<p class="rounded-lg border border-gray-200 bg-white py-12 text-center text-sm text-gray-500">No hay propuestas que coincidan con los filtros.</p>';
        return;
    }

    cardsRoot.innerHTML = propuestasFiltradas.map((item, index) => {
        const {
            isIncomplete, icalIndicator, tipoTexto, clienteNombre, montoTexto, personasTexto, noches,
        } = camposFilaPropuesta(item);
        const stableKey = item.clienteId || item.idReservaCanal || item.id;
        const propsTitle = escHtml(item.propiedadesNombres || '');
        const canalNombre = escHtml(item.canalNombre || 'N/A');

        return `
        <article class="overflow-hidden rounded-xl border border-gray-200 shadow-sm ${isIncomplete ? 'bg-warning-50/90' : 'bg-white'}" aria-labelledby="prop-card-title-${index}">
            <div class="flex flex-wrap items-start justify-between gap-3 border-b border-primary-100 bg-primary-50 px-4 py-3 md:items-center">
                <div class="flex min-w-0 flex-1 items-start gap-3 md:items-center">
                    <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white" aria-hidden="true">${index + 1}</span>
                    <div class="min-w-0">
                        <div id="prop-card-title-${index}" class="text-sm font-semibold text-gray-900">${icalIndicator}<span>${tipoTexto}</span>${isIncomplete ? ' <span class="text-danger-600">(Incompleta)</span>' : ''}</div>
                        <div class="mt-0.5 text-xs font-medium text-gray-600">${canalNombre}</div>
                    </div>
                </div>
                <div class="w-full shrink-0 text-right sm:w-auto">
                    <div class="text-xl font-bold tabular-nums text-primary-800">${montoTexto}</div>
                </div>
            </div>
            <div class="space-y-3 p-4 text-sm text-gray-600">
                <div class="flex min-w-0 items-start gap-3">
                    ${avatarClientePropuesta(clienteNombre, stableKey)}
                    <div class="min-w-0 flex-1">
                        <div class="font-semibold text-gray-900">${escHtml(clienteNombre)}</div>
                        ${isIncomplete ? '<div class="mt-0.5 text-xs font-medium text-warning-800">Pendiente de completar</div>' : ''}
                    </div>
                </div>
                <div class="flex min-w-0 items-center gap-2">
                    <i class="fa-solid fa-calendar-days w-4 shrink-0 text-center text-gray-400" aria-hidden="true"></i>
                    <span class="text-gray-800">${formatRangoEstadiaPC(item.fechaLlegada, item.fechaSalida)}</span>
                </div>
                <div class="flex flex-wrap gap-x-6 gap-y-1 text-xs">
                    <span><span class="font-medium text-gray-500">Noches:</span> <span class="tabular-nums text-gray-800">${noches}</span></span>
                    <span><span class="font-medium text-gray-500">Pers.:</span> <span class="font-semibold tabular-nums text-gray-900">${personasTexto}</span></span>
                </div>
                <div class="flex min-w-0 items-start gap-2">
                    <i class="fa-solid fa-house mt-0.5 w-4 shrink-0 text-center text-gray-400" aria-hidden="true"></i>
                    <span class="min-w-0 break-words text-gray-700" title="${propsTitle}">${escHtml(item.propiedadesNombres || '—')}</span>
                </div>
            </div>
            <div class="flex flex-col gap-2 border-t border-gray-200 bg-gray-50/90 px-4 py-4">
                ${botonesAccionHtml(item, isIncomplete)}
            </div>
        </article>`;
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

        renderPropuestas();
    } catch (error) {
        const cardsRoot = document.getElementById('propuestas-cards');
        if (cardsRoot) {
            cardsRoot.innerHTML = `<p class="rounded-lg border border-danger-200 bg-danger-50 px-4 py-8 text-center text-sm text-danger-700">Error al cargar: ${escHtml(error.message)}</p>`;
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

            <div id="propuestas-cards" class="mx-auto max-w-5xl space-y-4" aria-label="Propuestas y presupuestos"></div>
        </div>
    `;
}

export async function afterRender() {
    await fetchAndRender();

    document.getElementById('canal-filter').addEventListener('change', renderPropuestas);
    document.getElementById('fecha-inicio-filter').addEventListener('input', renderPropuestas);
    document.getElementById('fecha-fin-filter').addEventListener('input', renderPropuestas);

    const panel = document.getElementById('gestionar-propuestas-panel');
    if (!listenerAgregado && panel) {
        panel.addEventListener('click', handlePanelClick);
        listenerAgregado = true;
    }
}
