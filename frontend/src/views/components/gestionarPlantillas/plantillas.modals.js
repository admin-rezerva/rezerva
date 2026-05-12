// frontend/src/views/components/gestionarPlantillas/plantillas.modals.js
import { fetchAPI } from '../../../api.js';

let editandoPlantilla = null;
let onSaveCallback = null;

function _escHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** Misma heurística que backend `inferirModoPlantilla` (nombre del tipo en Firestore). */
function inferirModoPlantillaNombreTipo(tipoNombre, nombrePlantilla = '') {
    const t = `${tipoNombre || ''} ${nombrePlantilla || ''}`.toLowerCase();
    if (/confirm|reserva/i.test(t) && /intern|administrador|admin|equipo|staff|copia.*interna|notifica.*intern/i.test(t)) {
        return 'admin_confirmacion_reserva';
    }
    if (/intern|administrador|equipo|staff|copia.*interna|notifica.*intern/i.test(t)) {
        return 'admin_alerta';
    }
    if (/confirm|hu[eé]sped|cliente|reserva.*confirm|bienvenida/i.test(t)) {
        return 'huesped_confirmacion';
    }
    return 'generico_html';
}

function esTipoConfirmacionHuespedForm(form) {
    const opt = form?.tipoId?.options?.[form.tipoId.selectedIndex];
    const nombre = opt ? opt.textContent : '';
    return inferirModoPlantillaNombreTipo(nombre, form?.nombre?.value || '') === 'huesped_confirmacion';
}

function esTipoConfirmacionAdminForm(form) {
    const opt = form?.tipoId?.options?.[form.tipoId.selectedIndex];
    const nombre = opt ? opt.textContent : '';
    return inferirModoPlantillaNombreTipo(nombre, form?.nombre?.value || '') === 'admin_confirmacion_reserva';
}

function isPlantillaCorreoHtml(texto) {
    const s = String(texto || '').replace(/^\uFEFF?\s*/, '');
    return /^\[\[HTML_EMAIL\]\]/i.test(s) || /^<\s*(!DOCTYPE|html|table|div)/i.test(s);
}

function tarjetasArrayToInstruccionesIa(rows) {
    const parts = (rows || [])
        .map((r) => ({
            titulo: String(r.titulo || '').trim(),
            cuerpo: String(r.cuerpo || '').trim(),
        }))
        .filter((r) => r.titulo || r.cuerpo);
    if (!parts.length) return '';
    return parts
        .map((r) => {
            const t = r.titulo || 'Información';
            return `### ${t}\n${r.cuerpo || '(sin texto)'}`;
        })
        .join('\n\n---\n\n');
}

function renderTarjetaRowHtml(titulo = '', cuerpo = '') {
    return `
        <div class="plantilla-tarjeta-row border border-gray-200 rounded-lg p-3 space-y-2 bg-white">
            <div class="flex flex-wrap items-end gap-2 justify-between">
                <div class="flex-1 min-w-[140px]">
                    <label class="block text-xs font-medium text-gray-600">Título de la tarjeta</label>
                    <input type="text" class="form-input mt-0.5 text-sm js-tarjeta-titulo" placeholder="Ej.: WiFi, Tinaja, Toallas" value="${_escHtml(titulo)}">
                </div>
                <button type="button" class="btn-outline text-xs py-1 px-2 js-tarjeta-remove shrink-0" title="Quitar tarjeta">Quitar</button>
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-600">Texto de la tarjeta</label>
                <textarea class="form-input mt-0.5 text-sm w-full js-tarjeta-cuerpo resize-y min-h-[72px]" rows="3" placeholder="Indicaciones, reglas, avisos, datos de operación…">${_escHtml(cuerpo)}</textarea>
            </div>
        </div>
    `;
}

function collectTarjetasFromForm(formRoot) {
    const list = formRoot.querySelector('#plantilla-tarjetas-list');
    if (!list) return [];
    const rows = list.querySelectorAll('.plantilla-tarjeta-row');
    const out = [];
    rows.forEach((row) => {
        const titulo = row.querySelector('.js-tarjeta-titulo')?.value ?? '';
        const cuerpo = row.querySelector('.js-tarjeta-cuerpo')?.value ?? '';
        if (String(titulo).trim() || String(cuerpo).trim()) {
            out.push({ titulo: String(titulo).trim(), cuerpo: String(cuerpo).trim() });
        }
    });
    return out;
}

function hydrateTarjetasList(formRoot, tarjetas) {
    const list = formRoot.querySelector('#plantilla-tarjetas-list');
    if (!list) return;
    const arr = Array.isArray(tarjetas) && tarjetas.length ? tarjetas : [{ titulo: '', cuerpo: '' }];
    list.innerHTML = arr.map((t) => renderTarjetaRowHtml(t.titulo, t.cuerpo)).join('');
}

function syncTarjetasWrapVisibility(formRoot) {
    const wrap = formRoot.querySelector('#plantilla-tarjetas-wrap');
    if (!wrap) return;
    wrap.classList.remove('hidden');
}

function syncHtmlAdvancedSection(formRoot) {
    const details = formRoot.querySelector('#plantilla-html-avanzado');
    const ta = formRoot.querySelector('#texto');
    if (!details || !ta) return;
    const htmlMode = isPlantillaCorreoHtml(ta.value);
    if (htmlMode) {
        details.removeAttribute('open');
    } else {
        details.setAttribute('open', 'open');
    }
}

/** @param {Array<{ tag: string, descripcion: string }>} catalogo — GET /plantillas/etiquetas-motor */
function renderEtiquetasAyuda(catalogo = []) {
    if (!catalogo || catalogo.length === 0) {
        return `<p class="text-xs text-amber-800 bg-amber-50 border border-amber-200 p-2 rounded">No se pudo cargar el catálogo de etiquetas. Recarga la página o revisa la conexión con el servidor.</p>`;
    }
    return catalogo.map((row) => `
        <div class="flex items-center justify-between text-xs bg-gray-50 p-2 rounded border border-gray-200">
            <div class="min-w-0 pr-2">
                <span class="font-mono font-bold text-primary-700 select-all">${_escHtml(row.tag)}</span>
                <span class="text-gray-500 ml-2">— ${_escHtml(row.descripcion)}</span>
            </div>
            <button type="button" data-etiqueta="${_escHtml(row.tag)}" class="copy-tag-btn text-gray-400 hover:text-primary-600 ml-2 shrink-0" title="Copiar">
                <i class="fa-solid fa-clipboard"></i>
            </button>
        </div>
    `).join('');
}

export const renderModalPlantilla = (catalogoEtiquetas = []) => {
    return `
        <div id="plantilla-modal" class="modal hidden">
            <div class="modal-content !max-w-5xl !overflow-hidden flex flex-col w-full max-h-[min(92vh,920px)] p-0 shadow-xl rounded-lg">
                <div class="flex items-center gap-4 px-6 py-4 border-b border-gray-200 flex-shrink-0 bg-white rounded-t-lg">
                    <div class="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600 text-xl flex-shrink-0">✉️</div>
                    <div class="flex-1 min-w-0">
                        <h3 id="modal-title" class="text-xl font-semibold text-gray-900">Nueva Plantilla</h3>
                        <p id="modal-plantilla-subtitle" class="text-sm text-gray-500">Nombre, asunto, tarjetas de información y vista previa</p>
                        <p class="text-xs text-gray-400 mt-1">El correo se arma con la estructura estándar del producto; aquí defines tarjetas por tema. El HTML lo genera la IA o puedes editarlo en avanzado.</p>
                    </div>
                    <button type="button" id="close-modal-btn" class="text-gray-400 hover:text-gray-600 text-2xl leading-none p-1" aria-label="Cerrar">&times;</button>
                </div>

                <div class="flex flex-1 min-h-0 flex-col md:flex-row overflow-hidden bg-white">
                    <div class="flex-1 flex flex-col min-w-0 min-h-0 border-b md:border-b-0 md:border-r border-gray-200">
                        <form id="plantilla-form" class="flex flex-col h-full min-h-0">
                            <div class="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-4 space-y-4">
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label for="nombre" class="block text-sm font-medium text-gray-700">Nombre Interno</label>
                                        <input type="text" id="nombre" name="nombre" required class="form-input mt-1" placeholder="Ej: Bienvenida Estándar">
                                    </div>
                                    <div>
                                        <label for="tipoId" class="block text-sm font-medium text-gray-700">Tipo de Mensaje</label>
                                        <select id="tipoId" name="tipoId" required class="form-select mt-1">
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label for="asunto" class="block text-sm font-medium text-gray-700">Asunto (para Email)</label>
                                    <input type="text" id="asunto" name="asunto" class="form-input mt-1" placeholder="Ej: Confirmación de Reserva en [ALOJAMIENTO_NOMBRE]">
                                </div>

                                <div id="plantilla-tarjetas-wrap" class="space-y-2">
                                    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                        <div>
                                            <span class="block text-sm font-medium text-gray-800">Tarjetas de información</span>
                                            <p class="text-xs text-gray-500 mt-0.5">Añade una tarjeta por tema. La IA las convierte en bloques del correo respetando el formato estándar.</p>
                                        </div>
                                        <button type="button" id="plantilla-tarjeta-add" class="btn-outline text-xs py-1.5 px-3 shrink-0 self-start sm:self-auto">
                                            + Añadir tarjeta
                                        </button>
                                    </div>
                                    <div id="plantilla-tarjetas-list" class="space-y-3"></div>
                                </div>

                                <div class="rounded-lg border border-gray-200 bg-gray-50/80 p-3 space-y-2">
                                    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                        <div>
                                            <span class="block text-sm font-medium text-gray-800">Cuerpo del correo</span>
                                            <p class="text-xs text-gray-500 mt-0.5">En plantillas HTML no hace falta editarlo día a día: usa <strong>Vista previa</strong> y, si hace falta, <strong>Generar con IA</strong> o el bloque avanzado.</p>
                                        </div>
                                        <button type="button" id="plantilla-generar-ia-btn" class="btn-outline text-xs py-1.5 px-3 whitespace-nowrap shrink-0 self-start sm:self-auto" title="Requiere tipo de mensaje.">
                                            <i class="fa-solid fa-wand-magic-sparkles"></i> Generar con IA
                                        </button>
                                    </div>
                                    <details id="plantilla-html-avanzado" class="group">
                                        <summary class="cursor-pointer text-sm text-primary-700 font-medium list-none flex items-center gap-2">
                                            <span class="select-none">▸</span><span>Editor HTML (avanzado)</span>
                                        </summary>
                                        <p class="text-xs text-gray-500 mt-2 mb-1">Solo para ajustes puntuales. Las etiquetas <code class="text-primary-700">[TAG]</code> las sustituye el motor al enviar.</p>
                                        <textarea id="texto" name="texto" required rows="12" class="form-input w-full min-h-[180px] max-h-[38vh] resize-y font-mono text-xs overflow-auto mt-1" placeholder="[[HTML_EMAIL]] … o texto plano con [CLIENTE_NOMBRE]"></textarea>
                                    </details>
                                </div>
                            </div>

                            <div class="flex-shrink-0 flex flex-wrap items-center justify-end gap-2 px-6 py-4 border-t border-gray-200 bg-gray-50/95">
                                <button type="button" id="cancel-btn" class="btn-outline order-1">Cancelar</button>
                                <button type="button" id="plantilla-vista-previa-btn" class="btn-outline order-2">
                                    <i class="fa-regular fa-eye mr-1.5"></i> Vista previa
                                </button>
                                <button type="submit" class="btn-primary order-3">Guardar Plantilla</button>
                            </div>
                        </form>
                    </div>

                    <div class="w-full md:w-[280px] lg:w-80 flex-shrink-0 bg-gray-50 p-4 overflow-y-auto max-h-[40vh] md:max-h-none border-t md:border-t-0">
                        <h4 class="font-semibold text-gray-700 mb-2 text-sm">Etiquetas del motor</h4>
                        <p class="text-xs text-gray-500 mb-3">Variables que el servidor sustituye al enviar. Clic en el icono para copiar.</p>
                        <div id="etiquetas-container" class="space-y-2">
                            ${renderEtiquetasAyuda(catalogoEtiquetas)}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div id="plantilla-preview-modal" class="modal hidden">
            <div class="modal-content !max-w-4xl w-full !overflow-hidden flex flex-col h-[min(88vh,860px)] max-h-[min(88vh,860px)] p-0">
                <div class="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0">
                    <h4 class="text-base font-semibold text-gray-800">Vista previa del correo</h4>
                    <button type="button" id="plantilla-preview-close" class="text-gray-500 hover:text-gray-800 text-2xl leading-none p-1" aria-label="Cerrar vista previa">&times;</button>
                </div>
                <p id="plantilla-preview-asunto" class="text-sm text-gray-700 px-4 py-2 bg-gray-50 border-b border-gray-100 break-words"></p>
                <p id="plantilla-preview-nota" class="text-xs text-amber-800 px-4 py-2 bg-amber-50 border-b border-amber-100"></p>
                <iframe id="plantilla-preview-iframe" title="Vista previa correo" class="w-full flex-1 min-h-[320px] border-0 bg-gray-200" sandbox="allow-popups allow-popups-to-escape-sandbox"></iframe>
            </div>
        </div>
    `;
};

function _abrirVistaPreviaCorreo(htmlBody, asunto, nota) {
    const wrap = document.getElementById('plantilla-preview-modal');
    const iframe = document.getElementById('plantilla-preview-iframe');
    const subj = document.getElementById('plantilla-preview-asunto');
    const notaEl = document.getElementById('plantilla-preview-nota');
    if (!wrap || !iframe) return;
    const safe = String(htmlBody || '');
    const doc = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base target="_blank" rel="noopener">
<style>body{margin:0;padding:16px;background:#f1f5f9;font-family:system-ui,-apple-system,sans-serif;}</style></head><body>${safe}</body></html>`;
    iframe.srcdoc = doc;
    if (subj) {
        subj.textContent = `Asunto: ${asunto || '(sin asunto)'}`;
    }
    if (notaEl) {
        notaEl.textContent = nota || '';
    }
    wrap.classList.remove('hidden');
}

function _cerrarVistaPreviaCorreo() {
    const wrap = document.getElementById('plantilla-preview-modal');
    const iframe = document.getElementById('plantilla-preview-iframe');
    if (wrap) wrap.classList.add('hidden');
    if (iframe) iframe.srcdoc = '';
}

export const abrirModalPlantilla = (plantilla = null, tipos = []) => {
    const modal = document.getElementById('plantilla-modal');
    const form = document.getElementById('plantilla-form');
    const modalTitle = document.getElementById('modal-title');
    const tipoSelect = document.getElementById('tipoId');

    if (!modal || !form) return;

    tipoSelect.innerHTML = '<option value="">-- Seleccionar Tipo --</option>'
        + tipos.map((t) => `<option value="${t.id}">${t.nombre}</option>`).join('');

    const subtitle = document.getElementById('modal-plantilla-subtitle');
    if (plantilla) {
        editandoPlantilla = plantilla;
        modalTitle.textContent = 'Editar Plantilla';
        if (subtitle) subtitle.textContent = plantilla.nombre;
        form.nombre.value = plantilla.nombre;
        form.tipoId.value = plantilla.tipoId;
        form.asunto.value = plantilla.asunto || '';
        form.texto.value = plantilla.texto;
        const tj = plantilla.emailConfig?.tarjetasCorreo || plantilla.emailConfig?.tarjetasConfirmacionHuesped;
        hydrateTarjetasList(form, tj);
    } else {
        editandoPlantilla = null;
        modalTitle.textContent = 'Nueva Plantilla';
        if (subtitle) subtitle.textContent = 'Nombre, asunto, tarjetas de información y vista previa';
        form.reset();
        hydrateTarjetasList(form, []);
    }
    syncTarjetasWrapVisibility(form);
    syncHtmlAdvancedSection(form);

    modal.classList.remove('hidden');
};

export const cerrarModalPlantilla = () => {
    const modal = document.getElementById('plantilla-modal');
    if (modal) modal.classList.add('hidden');
    editandoPlantilla = null;
    _cerrarVistaPreviaCorreo();
};

export const setupModalPlantilla = (callback) => {
    onSaveCallback = callback;

    const form = document.getElementById('plantilla-form');
    if (!form) return;

    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    document.getElementById('close-modal-btn').addEventListener('click', cerrarModalPlantilla);
    document.getElementById('cancel-btn').addEventListener('click', cerrarModalPlantilla);

    const previewClose = document.getElementById('plantilla-preview-close');
    if (previewClose) previewClose.addEventListener('click', _cerrarVistaPreviaCorreo);

    const etiquetasContainer = document.getElementById('etiquetas-container');
    const newEtiquetasContainer = etiquetasContainer.cloneNode(true);
    etiquetasContainer.parentNode.replaceChild(newEtiquetasContainer, etiquetasContainer);

    newEtiquetasContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.copy-tag-btn');
        if (btn) {
            const etiqueta = btn.dataset.etiqueta;
            navigator.clipboard.writeText(etiqueta).then(() => {
                const originalHtml = btn.innerHTML;
                btn.innerHTML = '<i class="fa-solid fa-check text-success-500"></i>';
                setTimeout(() => { btn.innerHTML = originalHtml; }, 1500);
            });
        }
    });

    newForm.querySelector('#tipoId')?.addEventListener('change', () => {
        syncTarjetasWrapVisibility(newForm);
    });

    newForm.querySelector('#plantilla-tarjeta-add')?.addEventListener('click', () => {
        const list = newForm.querySelector('#plantilla-tarjetas-list');
        if (!list) return;
        const wrap = document.createElement('div');
        wrap.innerHTML = renderTarjetaRowHtml('', '').trim();
        const node = wrap.firstElementChild;
        if (node) list.appendChild(node);
    });

    newForm.querySelector('#plantilla-tarjetas-list')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.js-tarjeta-remove');
        if (!btn) return;
        const row = btn.closest('.plantilla-tarjeta-row');
        const list = newForm.querySelector('#plantilla-tarjetas-list');
        if (!row || !list) return;
        const rows = list.querySelectorAll('.plantilla-tarjeta-row');
        if (rows.length <= 1) {
            const ti = row.querySelector('.js-tarjeta-titulo');
            const cu = row.querySelector('.js-tarjeta-cuerpo');
            if (ti) ti.value = '';
            if (cu) cu.value = '';
            return;
        }
        row.remove();
    });

    newForm.querySelector('#texto')?.addEventListener('input', () => {
        syncHtmlAdvancedSection(newForm);
    });

    const genIaBtn = newForm.querySelector('#plantilla-generar-ia-btn');
    if (genIaBtn) {
        genIaBtn.addEventListener('click', async () => {
            const tipoId = newForm.tipoId?.value;
            if (!tipoId) {
                alert('Selecciona un tipo de mensaje para que la IA adapte el texto y las etiquetas del motor.');
                return;
            }
            const originalHtml = genIaBtn.innerHTML;
            genIaBtn.disabled = true;
            genIaBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generando...';
            try {
                const tipoOpt = newForm.tipoId.options[newForm.tipoId.selectedIndex];
                const tipoNombre = tipoOpt ? tipoOpt.textContent.trim() : '';
                const tarjetas = collectTarjetasFromForm(newForm);
                const instruccionesTarjetas = tarjetasArrayToInstruccionesIa(tarjetas);
                const data = await fetchAPI('/plantillas/generar-ia', {
                    method: 'POST',
                    body: {
                        tipoId,
                        tipoNombre,
                        nombreBorrador: newForm.nombre.value,
                        instrucciones: '',
                        instruccionesTarjetas,
                    },
                });
                if (data.nombre) newForm.nombre.value = data.nombre;
                if (data.asunto != null) newForm.asunto.value = data.asunto;
                if (data.texto) newForm.texto.value = data.texto;
                syncHtmlAdvancedSection(newForm);
            } catch (err) {
                alert(err.message || String(err));
            } finally {
                genIaBtn.disabled = false;
                genIaBtn.innerHTML = originalHtml;
            }
        });
    }

    const prevBtn = newForm.querySelector('#plantilla-vista-previa-btn');
    if (prevBtn) {
        prevBtn.addEventListener('click', async () => {
            const texto = newForm.texto?.value || '';
            const esConfirmacion = esTipoConfirmacionHuespedForm(newForm);
            const esConfirmacionAdmin = esTipoConfirmacionAdminForm(newForm);
            if (!String(texto).trim() && !esConfirmacion && !esConfirmacionAdmin) {
                alert('Genera el correo con IA primero, o abre el editor avanzado y pega el HTML.');
                return;
            }
            const original = prevBtn.innerHTML;
            prevBtn.disabled = true;
            prevBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> …';
            try {
                const tipoOpt = newForm.tipoId.options[newForm.tipoId.selectedIndex];
                const tarjetas = collectTarjetasFromForm(newForm);
                const data = await fetchAPI('/plantillas/vista-previa', {
                    method: 'POST',
                    body: {
                        texto,
                        asunto: newForm.asunto?.value || '',
                        tipoNombre: tipoOpt ? tipoOpt.textContent.trim() : '',
                        nombreBorrador: newForm.nombre?.value || '',
                        instruccionesTarjetas: tarjetasArrayToInstruccionesIa(tarjetas),
                    },
                });
                _abrirVistaPreviaCorreo(data.html, data.asunto, data.nota);
            } catch (err) {
                alert(err.message || String(err));
            } finally {
                prevBtn.disabled = false;
                prevBtn.innerHTML = original;
            }
        });
    }

    newForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = e.target;
        const ecBase = editandoPlantilla?.emailConfig && typeof editandoPlantilla.emailConfig === 'object'
            ? { ...editandoPlantilla.emailConfig }
            : { permitirEnvioCorreo: true, disparadores: {} };

        const esConfirmacion = esTipoConfirmacionHuespedForm(formData);
        const esConfirmacionAdmin = esTipoConfirmacionAdminForm(formData);
        const tarjetas = collectTarjetasFromForm(formData);
        let textoFinal = formData.texto.value;
        let asuntoFinal = formData.asunto.value;

        try {
            if (esConfirmacion || esConfirmacionAdmin) {
                const tipoOpt = formData.tipoId.options[formData.tipoId.selectedIndex];
                const data = await fetchAPI('/plantillas/generar-ia', {
                    method: 'POST',
                    body: {
                        tipoId: formData.tipoId.value,
                        tipoNombre: tipoOpt ? tipoOpt.textContent.trim() : '',
                        nombreBorrador: formData.nombre.value,
                        instrucciones: '',
                        instruccionesTarjetas: tarjetasArrayToInstruccionesIa(tarjetas),
                    },
                });
                if (data.texto) {
                    textoFinal = data.texto;
                    formData.texto.value = data.texto;
                }
                if (!String(asuntoFinal || '').trim() && data.asunto) {
                    asuntoFinal = data.asunto;
                    formData.asunto.value = data.asunto;
                }
            }

            const datos = {
                nombre: formData.nombre.value,
                tipoId: formData.tipoId.value,
                asunto: asuntoFinal,
                texto: textoFinal,
                emailConfig: {
                    ...ecBase,
                    tarjetasCorreo: tarjetas,
                    tarjetasConfirmacionHuesped: tarjetas,
                },
            };

            if (editandoPlantilla) {
                await fetchAPI(`/plantillas/${editandoPlantilla.id}`, { method: 'PUT', body: datos });
            } else {
                await fetchAPI('/plantillas', { method: 'POST', body: datos });
            }

            cerrarModalPlantilla();
            if (onSaveCallback) onSaveCallback();
        } catch (error) {
            alert(`Error al guardar la plantilla: ${error.message}`);
        }
    });
};
