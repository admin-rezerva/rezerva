// frontend/src/views/components/agregarPropuesta/propuesta.ui.js

/**
 * Genera el HTML de un checkbox para una propiedad.
 */
export function createPropertyCheckbox(prop, isSuggested) {
    const box = isSuggested
        ? 'border-primary-200 bg-primary-50/90'
        : 'border-gray-200 bg-white';
    return `
      <div class="flex items-center justify-between rounded-lg border p-3 ${box}">
        <div class="min-w-0">
          <input type="checkbox" id="cb-${prop.id}" data-id="${prop.id}" class="propiedad-checkbox h-4 w-4 shrink-0 text-primary-600 border-gray-300 rounded align-middle" ${isSuggested ? 'checked' : ''}>
          <label for="cb-${prop.id}" class="ml-2 font-medium text-gray-900">${prop.nombre}</label>
          <span class="ml-2 text-sm text-gray-500">(Cap: ${prop.capacidad})</span>
        </div>
      </div>`;
}

/**
 * Renderiza los widgets de selección de propiedades.
 */
export function renderSelectionWidgets(containerSuggestion, containerAvailable, availabilityData, selectedProperties, onSelectionChange) {
    if (!availabilityData.suggestion) return;

    containerSuggestion.innerHTML = '';
    containerAvailable.innerHTML = '';

    if (availabilityData.suggestion.isSegmented) {
        containerSuggestion.innerHTML = `
        <h4 class="font-medium text-gray-700">Propuesta de Itinerario</h4>
        <div class="space-y-3 p-3 bg-white rounded-md border">${
            availabilityData.suggestion.itinerary.map((segment) => {
            const fechaSalidaSegmento = new Date(segment.endDate); 
            
            const propertiesHtml = segment.propiedades.map(prop => `
                <div class="grid grid-cols-5 gap-4 items-center text-sm">
                <span class="font-semibold col-span-2">${prop.nombre}</span>
                <span class="col-span-3 text-xs text-gray-500">(Cap: ${prop.capacidad} pers.)</span>
                </div>
            `).join('');

            return `
                <div class="border-b pb-2 last:border-b-0">
                <div class="grid grid-cols-5 gap-4 items-center text-sm font-medium mb-1">
                    <span class="col-span-2">Fechas:</span>
                    <span class="col-span-3">${new Date(segment.startDate).toLocaleDateString('es-CL', {timeZone: 'UTC'})} al ${fechaSalidaSegmento.toLocaleDateString('es-CL', {timeZone: 'UTC'})}</span>
                </div>
                ${propertiesHtml}
                </div>`;
            }).join('')
        }</div>`;
        
        containerAvailable.innerHTML = '<p class="text-sm text-gray-500">Modo itinerario: no se pueden añadir otras cabañas.</p>';
    
    } else {
        const suggestedIds = new Set(selectedProperties.map(p => p.id));
        
        containerSuggestion.innerHTML = `
        <div class="rounded-xl border border-primary-200 bg-primary-50/60 p-3 md:p-4">
          <h4 class="mb-2 text-sm font-semibold text-primary-900">Propiedades Sugeridas</h4>
          <div class="space-y-2">${selectedProperties.map((p) => createPropertyCheckbox(p, true)).join('')}</div>
        </div>`;

        const availableWithId = availabilityData.allValidProperties || [];
        
        const otros = availableWithId
            .filter((p) => !suggestedIds.has(p.id))
            .map((p) => createPropertyCheckbox(p, false))
            .join('');
        containerAvailable.innerHTML = otros
            ? `<h4 class="mb-2 mt-4 font-medium text-gray-800 md:mt-5">Otras Disponibles</h4>
               <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">${otros}</div>`
            : '';
    }
    
    document.querySelectorAll('.propiedad-checkbox').forEach(cb => cb.addEventListener('change', onSelectionChange));
}

/** Tarjeta sección — estándar panel §6.3 (`spa-form-section`). */
function _propuestaSectionCard(inner) {
    return `
        <section class="spa-form-section">
          ${inner}
        </section>`;
}

function _sectionHeading(number, iconClass, title) {
    return `
        <h3 class="spa-form-section-title">
          <span class="spa-form-section-badge">${number}</span>
          <i class="fa-solid ${iconClass} text-primary-500" aria-hidden="true"></i>
          <span>${title}</span>
        </h3>`;
}

function _renderPanelBusqueda() {
    return _propuestaSectionCard(`
        ${_sectionHeading(1, 'fa-calendar-days', 'Fechas, Personas y Disponibilidad')}
        <div class="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
          <div class="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            <div class="min-w-[9.5rem]">
              <label for="fecha-llegada" class="block text-sm font-medium text-gray-700">Llegada</label>
              <input type="date" id="fecha-llegada" class="form-input mt-1 w-full sm:w-auto">
            </div>
            <div class="min-w-[9.5rem]">
              <label for="fecha-salida" class="block text-sm font-medium text-gray-700">Salida</label>
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
              <span>Excluir Camarotes</span>
            </label>
            <label class="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
              <input id="permitir-cambios" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-primary-600">
              <span>Permitir cambios de cabaña</span>
            </label>
            <button id="buscar-btn" type="button" class="btn-primary w-full shrink-0 sm:w-auto lg:min-w-[11rem]">Buscar Disponibilidad</button>
          </div>
        </div>`);
}

function _renderPanelPropiedades() {
    return _propuestaSectionCard(`
            ${_sectionHeading(2, 'fa-house-chimney', 'Selección de Propiedades')}
            <p id="propiedades-placeholder" class="mb-3 text-sm text-gray-600">Busca disponibilidad para cargar propiedades sugeridas y alternativas.</p>
            <div id="suggestion-list" class="mt-1"></div>
            <div id="available-list" class="mt-1"></div>`);
}

function _renderPanelCliente() {
    return _propuestaSectionCard(`
            ${_sectionHeading(3, 'fa-user-tag', 'Cliente y Canal de Venta')}
            <div class="flex flex-col gap-5">
              <div class="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-x-5 lg:items-start">
                <div class="relative lg:col-span-7">
                  <label id="client-form-title" for="client-search" class="block text-sm font-medium text-gray-700">Buscar o Crear Cliente</label>
                  <input type="text" id="client-search" placeholder="Buscar por nombre o teléfono..." autocomplete="off" class="form-input mt-1 w-full">
                  <div id="client-results-list" class="absolute z-20 mt-1 hidden max-h-32 w-full overflow-y-auto rounded-md border bg-white shadow-sm lg:max-w-xl"></div>
                  <div id="cliente-bloqueo-alert" class="mt-2 hidden rounded-lg border border-danger-300 bg-danger-50 p-3 text-xs">
                    <p class="mb-1 flex items-center gap-1.5 font-semibold text-danger-800"><i class="fa-solid fa-ban"></i> Cliente Bloqueado</p>
                    <p id="cliente-bloqueo-motivo" class="mb-2 text-danger-700"></p>
                    <p class="mb-2 text-danger-600">Para poder crear una reserva, primero debes desbloquear al cliente desde su ficha.</p>
                    <button id="ir-editar-cliente-btn" type="button" class="btn-outline flex items-center gap-1 border-danger-400 px-2 py-1 text-xs text-danger-700 hover:bg-danger-100">Ir a Editar Cliente <i class="fa-solid fa-arrow-right text-[10px]"></i></button>
                  </div>
                </div>
                <div class="lg:col-span-5">
                  <label for="canal-select" class="block text-sm font-medium text-gray-700">Canal de Venta</label>
                  <select id="canal-select" class="form-select mt-1 w-full"></select>
                </div>
              </div>
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label for="new-client-name" class="block text-sm font-medium text-gray-700">Nombre</label>
                  <input type="text" id="new-client-name" placeholder="Nombre" class="form-input mt-1 w-full">
                </div>
                <div>
                  <label for="new-client-lastname" class="block text-sm font-medium text-gray-700">Apellido</label>
                  <input type="text" id="new-client-lastname" placeholder="Apellido" class="form-input mt-1 w-full">
                </div>
                <div>
                  <label for="id-reserva-canal-input" class="block text-sm font-medium text-gray-700">ID Reserva Canal</label>
                  <input type="text" id="id-reserva-canal-input" class="form-input mt-1 w-full">
                </div>
              </div>
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label for="new-client-phone" class="block text-sm font-medium text-gray-700">Teléfono</label>
                  <input type="tel" id="new-client-phone" placeholder="+56..." class="form-input mt-1 w-full">
                </div>
                <div>
                  <label for="new-client-email" class="block text-sm font-medium text-gray-700">Email</label>
                  <input type="email" id="new-client-email" placeholder="correo@..." class="form-input mt-1 w-full">
                </div>
                <div>
                  <label for="plantilla-select" class="block text-sm font-medium text-gray-700">Plantilla de Mensaje</label>
                  <select id="plantilla-select" class="form-select mt-1 w-full"></select>
                </div>
              </div>
              <div id="ical-uid-container" class="hidden">
                <label for="ical-uid-input" class="block text-sm font-medium text-gray-500">iCal UID (Referencia)</label>
                <input type="text" id="ical-uid-input" class="form-input mt-1 w-full bg-gray-100" readonly>
              </div>
              <div class="flex flex-col gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-end">
                <label class="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
                  <input id="enviar-email-checkbox" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-primary-600" checked>
                  <span>Enviar propuesta por correo</span>
                </label>
              </div>
              <p id="email-warning" class="hidden text-xs text-amber-600 sm:text-end"><i class="fa-solid fa-triangle-exclamation mr-1"></i> El cliente no tiene email registrado</p>
            </div>`);
}

function _renderPanelResumen() {
    return `
          <section id="descuentos-section" class="spa-form-section mb-4 md:mb-5">
            <h3 class="spa-form-section-title">
              <span class="spa-form-section-badge">4</span>
              <i class="fa-solid fa-tags text-primary-500" aria-hidden="true"></i>
              <span>Descuentos y Ajustes</span>
            </h3>
            <div id="valor-dolar-container" class="mb-4 hidden"><p id="valor-dolar-info" class="text-sm font-semibold text-primary-600"></p></div>
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label for="valor-final-fijo" class="block text-sm font-medium text-gray-900">Valor Final Fijo (Prioritario)</label>
                  <input type="number" id="valor-final-fijo" placeholder="Ej: 300000" class="form-input mt-1 w-full">
                </div>
                <div>
                  <label for="cupon-input" class="block text-sm font-medium text-gray-700">Código de Descuento</label>
                  <input type="text" id="cupon-input" class="form-input discount-input mt-1 w-full">
                  <div id="cupon-status" class="mt-1 text-xs"></div>
                </div>
                <div>
                  <label for="descuento-pct" class="block text-sm font-medium text-gray-700">Descuento Manual (%)</label>
                  <input type="number" id="descuento-pct" placeholder="Ej: 15" class="form-input discount-input mt-1 w-full">
                </div>
                <div>
                  <label id="descuento-fijo-label" for="descuento-fijo-total" class="block text-sm font-medium text-gray-700">Descuento Fijo Manual</label>
                  <input type="number" id="descuento-fijo-total" placeholder="Ej: 20000" class="form-input discount-input mt-1 w-full">
                </div>
            </div>
          </section>

          <section id="pricing-resumen-section" class="spa-form-summary">
            <div class="spa-form-summary-bar text-center">
              Resumen de Reserva
            </div>
            <div class="spa-form-summary-body">
              <div id="summary-blocks-row" class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div id="summary-original-currency-container" class="hidden space-y-2 rounded-lg border border-primary-200 bg-primary-50/90 p-4"></div>
                <div id="summary-clp-container" class="space-y-2 rounded-lg border border-gray-200 bg-gray-50/90 p-4"></div>
              </div>
              <div class="border-t border-gray-200 pt-4">
                <button id="guardar-propuesta-btn" type="button" class="btn-primary btn-lg flex w-full items-center justify-center gap-2 py-3">
                  <i class="fa-solid fa-circle-check" aria-hidden="true"></i>
                  <span id="guardar-propuesta-label">Crear Reserva Tentativa</span>
                </button>
                <p class="mt-3 text-center text-xs text-gray-500">Se enviará una notificación según la configuración del canal.</p>
              </div>
            </div>
          </section>`;
}

function _renderModalPropuestaGuardada() {
    return `
    <div id="propuesta-guardada-modal" class="modal hidden">
      <div class="modal-content !max-w-2xl">
        <div class="flex items-center gap-4 mb-6 pb-5 border-b">
            <div class="w-12 h-12 rounded-xl bg-success-100 flex items-center justify-center text-success-600 text-xl flex-shrink-0"><i class="fa-solid fa-check"></i></div>
            <div>
                <h3 class="text-xl font-semibold text-gray-900">Propuesta Guardada con Éxito</h3>
                <p class="text-sm text-gray-500">Copia el resumen y envíalo al cliente</p>
            </div>
        </div>
        <p class="text-sm text-gray-600 mb-4">Puedes gestionar esta y otras propuestas en la sección "Gestionar Propuestas".</p>
        <textarea id="propuesta-texto" rows="15" class="form-input w-full bg-gray-50 font-mono text-xs"></textarea>
        <div class="flex justify-end space-x-2 mt-4">
          <button id="copiar-propuesta-btn" class="btn-secondary">Copiar</button>
          <button id="cerrar-propuesta-modal-btn" class="btn-primary">Cerrar</button>
        </div>
      </div>
    </div>`;
}

function _renderModalListaEspera() {
    return `
    <div id="lista-espera-modal" class="modal hidden">
      <div class="modal-content !max-w-2xl">
        <div class="flex items-center gap-4 mb-6 pb-5 border-b">
            <div class="w-12 h-12 rounded-xl bg-warning-100 flex items-center justify-center text-warning-600 text-xl flex-shrink-0"><i class="fa-solid fa-clock"></i></div>
            <div>
                <h3 class="text-xl font-semibold text-gray-900">Sin disponibilidad en este momento</h3>
                <p class="text-sm text-gray-500">¿Deseas informar al cliente cuando se libere cupo?</p>
            </div>
        </div>
        <div class="space-y-3 text-sm">
          <p class="text-gray-700">No hay disponibilidad para <strong id="lista-espera-resumen"></strong>.</p>
          <div class="p-3 bg-gray-50 rounded border">
            <p><strong>Cliente:</strong> <span id="lista-espera-cliente"></span></p>
            <p><strong>Email:</strong> <span id="lista-espera-email"></span></p>
            <p><strong>Teléfono:</strong> <span id="lista-espera-telefono"></span></p>
          </div>
          <label class="flex items-start gap-2">
            <input id="lista-espera-consentimiento" type="checkbox" class="mt-1 h-4 w-4 text-primary-600 border-gray-300 rounded">
            <span class="text-xs text-gray-600">Confirmo que el cliente autorizó contacto por correo para avisarle si se libera disponibilidad en las condiciones solicitadas.</span>
          </label>
          <div id="lista-espera-status" class="text-sm"></div>
        </div>
        <div class="flex justify-end space-x-2 mt-6">
          <button id="lista-espera-cancelar-btn" class="btn-outline">No registrar</button>
          <button id="lista-espera-guardar-btn" class="btn-primary">Registrar en lista de espera</button>
        </div>
      </div>
    </div>`;
}

/**
 * Renderiza la estructura HTML completa de la vista.
 */
export function renderPropuestaLayout() {
    return `
    <div class="propuesta-agregar-view spa-form-page">
        <h2 class="text-2xl font-semibold text-gray-900 md:text-3xl">Crear/Editar Propuesta de Reserva</h2>
        ${_renderPanelBusqueda()}
        <div id="status-container" class="hidden rounded-lg border border-gray-200 bg-white p-4 text-center text-gray-500"></div>
        <div id="results-container" class="space-y-4 md:space-y-5">
          ${_renderPanelPropiedades()}
        </div>
        ${_renderPanelCliente()}
        ${_renderPanelResumen()}
    </div>
    ${_renderModalPropuestaGuardada()}
    ${_renderModalListaEspera()}
    `;
}