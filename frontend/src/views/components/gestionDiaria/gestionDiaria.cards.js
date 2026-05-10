// frontend/src/views/components/gestionDiaria/gestionDiaria.cards.js
import { getStatusInfo, formatCurrency, formatDate, formatUSD } from './gestionDiaria.utils.js';
import { getEstadosReserva } from '../estadosStore.js';
import { labelGarantiaOperacionModo, labelGarantiaOperacionEstado } from '../gestionarReservas/reservas.utils.js';

function renderGarantiaLineaTarjeta(grupo) {
    const go = grupo.garantiaOperacion;
    if (!go || typeof go !== 'object') return '';
    const modo = String(go.modo || '').trim();
    if (!modo) return '';
    const texto = labelGarantiaOperacionModo(modo);
    const estadoTxt = labelGarantiaOperacionEstado(go.estadoOperacion || 'pendiente_garantia');
    return `
            <div class="mt-2 text-xs text-gray-800 bg-primary-50 border border-primary-100 rounded-md px-2 py-1.5 flex items-start gap-2">
                <i class="fa-solid fa-shield-halved text-primary-600 mt-0.5 flex-shrink-0" aria-hidden="true"></i>
                <div>
                    <div><span class="font-semibold">Garantía (web):</span> ${texto}</div>
                    <div class="text-gray-600"><span class="font-semibold">Estado:</span> ${estadoTxt}</div>
                </div>
            </div>`;
}

function renderFinancialDetails(grupo) {
    if (grupo.esUSD) {
        const valorDolar = grupo.valoresUSD?.valorDolar || grupo.reservasIndividuales[0]?.valorDolarDia || 0;
        const totalClienteUSD = grupo.valoresUSD?.totalCliente || 0;
        const ivaUSD = grupo.valoresUSD?.iva || 0;
        const costoCanalCLP = grupo.costoCanal || 0;
        const costoCanalUSD = valorDolar > 0 ? costoCanalCLP / valorDolar : 0;
        const payoutFinalRealUSD = valorDolar > 0 ? grupo.payoutFinalReal / valorDolar : 0;

        return `
            <div class="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2 sm:gap-x-4">
                <div class="text-left sm:text-right sm:border-r sm:pr-2">
                    <div class="font-bold text-gray-500 mb-1">USD</div>
                    <div class="flex justify-between"><span>Total:</span> <span class="font-medium">${formatUSD(totalClienteUSD)}</span></div>
                    ${ivaUSD > 0 ? `<div class="flex justify-between"><span>IVA:</span> <span class="font-medium">${formatUSD(ivaUSD)}</span></div>` : ''}
                    <div class="flex justify-between"><span>Costo Canal:</span> <span class="font-medium text-danger-600">-${formatUSD(costoCanalUSD)}</span></div>
                    <div class="flex justify-between border-t mt-1 pt-1"><span>Payout:</span> <span class="font-semibold text-success-700">${formatUSD(payoutFinalRealUSD)}</span></div>
                </div>
                <div class="text-left sm:text-right">
                    <div class="font-bold text-gray-800 mb-1">CLP</div>
                    <div class="flex justify-between"><span>Total:</span> <span class="font-medium">${formatCurrency(grupo.valorTotalHuesped)}</span></div>
                    <div class="flex justify-between"><span>Abonado:</span> <span class="font-medium text-success-600">${formatCurrency(grupo.abonoTotal)}</span></div>
                    <div class="flex justify-between border-t mt-1 pt-1"><span class="font-bold">Saldo:</span> <span class="font-bold text-danger-600">${formatCurrency(grupo.valorTotalHuesped - grupo.abonoTotal)}</span></div>
                </div>
            </div>
        `;
    }
    return `
        <div class="text-xs text-gray-500 space-y-1">
            <div class="flex justify-between"><span>Total Cliente:</span> <span class="font-semibold">${formatCurrency(grupo.valorTotalHuesped)}</span></div>
            <div class="flex justify-between"><span>Costo Canal:</span> <span class="font-semibold text-danger-600">-${formatCurrency(grupo.costoCanal)}</span></div>
            <div class="flex justify-between font-bold border-t pt-1"><span>Payout:</span> <span class="text-success-700">${formatCurrency(grupo.payoutFinalReal)}</span></div>
            <hr class="my-1">
            <div class="flex justify-between"><span>Abonado:</span> <span class="text-success-600">${formatCurrency(grupo.abonoTotal)}</span></div>
            <div class="flex justify-between border-t border-gray-300 pt-1 mt-1"><span class="font-semibold">Saldo:</span> <span class="font-bold text-danger-600">${formatCurrency(grupo.valorTotalHuesped - grupo.abonoTotal)}</span></div>
        </div>`;
}

/** Botones táctiles en móvil: ancho completo; en sm+ fila alineada a la derecha como antes. */
const BTN_CARD = 'gestion-btn text-xs w-full sm:w-auto min-h-[2.5rem] inline-flex items-center justify-center gap-1 px-3 py-2 rounded-md';

function renderActionButtons(grupo, allEstados) {
    const estadoInfo = getStatusInfo(grupo.estadoGestion, allEstados);

    const ajusteRealizado = grupo.ajusteManualRealizado || grupo.potencialCalculado;
    const pagoFinalRealizado = estadoInfo.level >= 4;
    const boletaAdjunta = grupo.documentos && grupo.documentos.enlaceBoleta;
    const reservaAdjunta = grupo.documentos && grupo.documentos.enlaceReserva;

    let buttons = `
        <button class="${BTN_CARD} btn-table-copy" data-gestion="ajuste_tarifa">Ajuste Tarifa ${ajusteRealizado ? '<i class="fa-solid fa-check text-success-600"></i>' : ''}</button>
        <button class="${BTN_CARD} btn-table-copy" data-gestion="bitacora">Bitácora (${grupo.notasCount})</button>
        <button class="${BTN_CARD} btn-table-copy" data-gestion="gestionar_reserva">Doc. Reserva ${reservaAdjunta ? '<i class="fa-solid fa-check text-success-600"></i>' : ''}</button>
    `;

    if (estadoInfo.level >= 2) {
        buttons += `<button class="${BTN_CARD} btn-table-edit" data-gestion="pagos">Pagos (${grupo.transaccionesCount}) ${pagoFinalRealizado ? '<i class="fa-solid fa-check text-success-600"></i>' : ''}</button>`;
    }

    if (estadoInfo.level >= 4) {
        const docStatusClass = boletaAdjunta ? 'bg-success-500 hover:bg-success-700' : 'bg-amber-500 hover:bg-amber-700';
        buttons += `<button class="${BTN_CARD} btn-table-edit ${docStatusClass}" data-gestion="boleta">Boleta ${boletaAdjunta ? '<i class="fa-solid fa-check"></i>' : ''}</button>`;
    }

    if (estadoInfo.level >= 5) {
        buttons += `<button class="${BTN_CARD} btn-table-edit" data-gestion="gestionar_cliente">Gestionar Cliente ${grupo.clienteGestionado ? '<i class="fa-solid fa-check text-success-600"></i>' : ''}</button>`;
    }

    if (estadoInfo.level > 1) {
        buttons += `<button class="revert-btn ${BTN_CARD} btn-table-delete">Revertir</button>`;
    }

    return buttons;
}

function crearDropdownEstadosReserva(grupo, allEstados) {
    const estadosReserva = getEstadosReserva(allEstados);
    const opcionesReserva = estadosReserva.length > 0
        ? estadosReserva.map(e => `<option value="${e.nombre}" ${grupo.estado === e.nombre ? 'selected' : ''}>${e.nombre}</option>`).join('')
        : ['Confirmada', 'Cancelada', 'No Presentado', 'Desconocido', 'Propuesta']
            .map(n => `<option value="${n}" ${grupo.estado === n ? 'selected' : ''}>${n}</option>`).join('');

    const estadoInfo = getStatusInfo(grupo.estado, allEstados);
    let bgColorClass = 'bg-gray-100';
    if (estadoInfo.semantica === 'confirmada') {
        bgColorClass = 'bg-success-100';
    } else if (estadoInfo.semantica === 'cancelada' || estadoInfo.semantica === 'no_show') {
        bgColorClass = 'bg-danger-100';
    } else if (estadoInfo.semantica === 'propuesta' || estadoInfo.semantica === 'desconocido') {
        bgColorClass = 'bg-warning-100';
    } else if (['Confirmada'].includes(grupo.estado)) {
        bgColorClass = 'bg-success-100';
    } else if (['Cancelada', 'No Presentado'].includes(grupo.estado)) {
        bgColorClass = 'bg-danger-100';
    } else if (['Propuesta', 'Desconocido'].includes(grupo.estado)) {
        bgColorClass = 'bg-warning-100';
    }

    return `
        <div class="mb-3">
            <label class="block text-xs font-medium text-gray-500">Estado Reserva:</label>
            <select data-reserva-id-canal="${grupo.reservaIdOriginal}" class="reserva-estado-select mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm ${bgColorClass}">
                ${opcionesReserva}
            </select>
            <span id="loader-estado-reserva-${grupo.reservaIdOriginal}" class="text-xs text-primary-500 hidden">Guardando...</span>
        </div>
    `;
}

function createCard(grupo, allEstados) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkinDate = new Date(grupo.fechaLlegada);
    const diasParaLlegada = Math.round((checkinDate - today) / (1000 * 60 * 60 * 24));

    const estadoInfo = getStatusInfo(grupo.estadoGestion, allEstados);
    const alojamientosNombres = grupo.reservasIndividuales.map(r => r.alojamientoNombre).join(', ');

    const estadoBotonHtml = estadoInfo.gestionType
        ? `<button type="button" class="gestion-btn shrink-0 px-2 py-1 text-xs font-semibold rounded-full" data-gestion="${estadoInfo.gestionType}" style="background-color: ${estadoInfo.color}; color: white;">${estadoInfo.text}</button>`
        : `<span class="inline-flex shrink-0 items-center px-2 py-1 text-xs font-semibold rounded-full" style="background-color: ${estadoInfo.color}; color: white;">${estadoInfo.text}</span>`;

    const countdownTxt = diasParaLlegada > 0
        ? `Llega en ${diasParaLlegada} día(s)`
        : (diasParaLlegada === 0 ? 'Llega HOY' : `Llegó hace ${-diasParaLlegada} día(s)`);

    return `
    <div id="card-${grupo.reservaIdOriginal}" class="flex flex-col gap-4 rounded-lg border bg-white p-4 shadow-sm md:flex-row md:gap-5">
        <div class="min-w-0 flex-1">
            <div class="mb-3 flex flex-col gap-2 sm:gap-3">
                <div class="flex min-w-0 flex-wrap items-center gap-2">
                    ${estadoBotonHtml}
                    <button
                        class="client-trigger min-w-0 text-left text-lg font-bold text-primary-800 hover:underline focus:outline-none"
                        data-cliente-id="${grupo.clienteId}"
                        title="Ver perfil del cliente"
                    >
                        ${grupo.clienteNombre}
                    </button>
                    <span class="inline-flex shrink-0 items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-800">${grupo.tipoCliente} (${grupo.numeroDeReservas})</span>
                </div>
                <p class="text-sm font-semibold leading-snug text-gray-600 sm:max-w-md">${countdownTxt}</p>
            </div>

            ${grupo.clienteBloqueado ? `
            <div class="mx-[-1rem] px-4 py-2 bg-danger-50 border-y border-danger-200 flex items-start gap-2 text-xs">
                <i class="fa-solid fa-ban text-danger-500 mt-0.5 flex-shrink-0"></i>
                <div><span class="font-semibold text-danger-700">Cliente Bloqueado:</span> <span class="text-danger-600">${grupo.motivoBloqueo || 'Sin motivo especificado'}</span></div>
            </div>` : ''}
            ${crearDropdownEstadosReserva(grupo, allEstados)}
            <div class="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3 sm:gap-4">
                <div class="rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2 sm:border-0 sm:bg-transparent sm:p-0">
                    <div class="text-xs font-medium uppercase tracking-wide text-gray-500">Check-in</div>
                    <div class="mt-0.5 font-semibold text-gray-900">${formatDate(grupo.fechaLlegada)}</div>
                </div>
                <div class="rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2 sm:border-0 sm:bg-transparent sm:p-0">
                    <div class="text-xs font-medium uppercase tracking-wide text-gray-500">Check-out</div>
                    <div class="mt-0.5 font-semibold text-gray-900">${formatDate(grupo.fechaSalida)}</div>
                </div>
                <div class="rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2 sm:border-0 sm:bg-transparent sm:p-0">
                    <div class="text-xs font-medium uppercase tracking-wide text-gray-500">Noches</div>
                    <div class="mt-0.5 font-semibold text-gray-900">${grupo.totalNoches}</div>
                </div>
                <div class="sm:col-span-3"><span class="font-medium text-gray-500">Alojamientos:</span> <span class="text-gray-900">${alojamientosNombres}</span></div>
                <div class="sm:col-span-3 break-all"><span class="font-medium text-gray-500">ID Reserva:</span> <span class="font-mono text-xs text-gray-900">${grupo.reservaIdOriginal}</span></div>
            </div>
            ${renderGarantiaLineaTarjeta(grupo)}
        </div>
        <div class="flex w-full min-w-0 flex-shrink-0 flex-col gap-3 md:w-96">
            ${renderFinancialDetails(grupo)}
            <div class="flex flex-col gap-2 border-t pt-3 sm:flex-row sm:flex-wrap sm:justify-end">
                ${renderActionButtons(grupo, allEstados)}
            </div>
        </div>
    </div>`;
}

export function renderGrupos(grupos, allEstados) {
    const revisionList = document.getElementById('revision-list');
    const hoyList = document.getElementById('hoy-list');
    const proximasList = document.getElementById('proximas-list');

    revisionList.innerHTML = '';
    hoyList.innerHTML = '';
    proximasList.innerHTML = '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    grupos.forEach(grupo => {
        const cardHtml = createCard(grupo, allEstados);
        const checkinDate = new Date(grupo.fechaLlegada);
        const statusInfo = getStatusInfo(grupo.estadoGestion, allEstados);

        if (statusInfo.esRevision) {
            revisionList.innerHTML += cardHtml;
        } else if (checkinDate <= today) {
            hoyList.innerHTML += cardHtml;
        } else {
            proximasList.innerHTML += cardHtml;
        }
    });

    document.getElementById('revision-container').classList.toggle('hidden', revisionList.innerHTML === '');
    document.getElementById('hoy-container').classList.toggle('hidden', hoyList.innerHTML === '');
    document.getElementById('proximas-container').classList.toggle('hidden', proximasList.innerHTML === '');
}
