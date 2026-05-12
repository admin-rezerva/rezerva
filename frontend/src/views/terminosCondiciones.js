/**
 * Términos y condiciones (OTA-style) — Configuración > ítem independiente.
 * Persistencia: websiteSettings.terminosCondiciones vía PUT /website/home-settings
 * Incluye versión EN para sitio público cuando idiomaPorDefecto es inglés.
 */
import { fetchAPI } from '../api.js';
import { renderContratacionRezervaPanel } from './components/terminosCondiciones/contratacionRezerva.js';

const SECTION_ORDER = [
    'introduccion',
    'usoInformacion',
    'consentimientoDatosResenas',
    'reservasPagos',
    'seguridadNormasUso',
    'conductaAreasComunes',
    'menoresMascotasPrivacidad',
    'operadorLeyAplicable',
];

const LABELS = {
    introduccion: 'Alcance y aceptación',
    usoInformacion: 'Uso de la información personal',
    consentimientoDatosResenas: 'Consentimiento, comunicaciones y reseñas',
    reservasPagos: 'Reservas, pagos y cancelación',
    seguridadNormasUso: 'Seguridad y normas de uso',
    conductaAreasComunes: 'Conducta y áreas comunes',
    menoresMascotasPrivacidad: 'Menores, mascotas y privacidad',
    operadorLeyAplicable: 'Operador y ley aplicable',
};

const LABELS_EN = {
    introduccion: 'Scope and acceptance',
    usoInformacion: 'Use of personal information',
    consentimientoDatosResenas: 'Consent, communications and reviews',
    reservasPagos: 'Bookings, payments and cancellation',
    seguridadNormasUso: 'Safety and facility rules',
    conductaAreasComunes: 'Conduct and shared areas',
    menoresMascotasPrivacidad: 'Children, pets and privacy',
    operadorLeyAplicable: 'Operator and governing law',
};

const SPECIFIC_TERMS_DEFAULT = {
    titulo: 'Condiciones específicas de la empresa',
    html: '',
};

const SPECIFIC_TERMS_DEFAULT_EN = {
    titulo: 'Company-specific conditions',
    html: '',
};

function emptyDraft() {
    const secciones = {};
    const seccionesEn = {};
    for (const k of SECTION_ORDER) {
        secciones[k] = { titulo: LABELS[k], html: '' };
        seccionesEn[k] = { titulo: LABELS_EN[k], html: '' };
    }
    return {
        publicado: false,
        tituloPagina: 'Términos y condiciones',
        tituloPaginaEn: 'Terms and conditions',
        plantillaVersion: '',
        secciones,
        seccionesEn,
        condicionesEspecificas: { ...SPECIFIC_TERMS_DEFAULT },
        condicionesEspecificasEn: { ...SPECIFIC_TERMS_DEFAULT_EN },
    };
}

function mergeDraftFromEmpresa(ws) {
    const raw = ws && ws.terminosCondiciones;
    const d = emptyDraft();
    if (!raw || typeof raw !== 'object') return d;
    d.publicado = !!raw.publicado;
    d.tituloPagina = raw.tituloPagina || d.tituloPagina;
    d.tituloPaginaEn = raw.tituloPaginaEn != null && String(raw.tituloPaginaEn).trim()
        ? String(raw.tituloPaginaEn).trim()
        : d.tituloPaginaEn;
    d.plantillaVersion = raw.plantillaVersion || '';
    if (raw.condicionesEspecificas && typeof raw.condicionesEspecificas === 'object') {
        d.condicionesEspecificas = {
            titulo: raw.condicionesEspecificas.titulo != null && String(raw.condicionesEspecificas.titulo).trim()
                ? String(raw.condicionesEspecificas.titulo).trim()
                : SPECIFIC_TERMS_DEFAULT.titulo,
            html: raw.condicionesEspecificas.html != null ? String(raw.condicionesEspecificas.html) : '',
        };
    }
    if (raw.condicionesEspecificasEn && typeof raw.condicionesEspecificasEn === 'object') {
        d.condicionesEspecificasEn = {
            titulo: raw.condicionesEspecificasEn.titulo != null && String(raw.condicionesEspecificasEn.titulo).trim()
                ? String(raw.condicionesEspecificasEn.titulo).trim()
                : SPECIFIC_TERMS_DEFAULT_EN.titulo,
            html: raw.condicionesEspecificasEn.html != null ? String(raw.condicionesEspecificasEn.html) : '',
        };
    }
    const sec = raw.secciones && typeof raw.secciones === 'object' ? raw.secciones : {};
    for (const k of SECTION_ORDER) {
        const s = sec[k];
        if (s && typeof s === 'object') {
            d.secciones[k] = {
                titulo: (s.titulo != null && String(s.titulo).trim()) ? String(s.titulo).trim() : LABELS[k],
                html: s.html != null ? String(s.html) : '',
            };
        }
    }
    const secEn = raw.seccionesEn && typeof raw.seccionesEn === 'object' ? raw.seccionesEn : {};
    for (const k of SECTION_ORDER) {
        const s = secEn[k];
        if (s && typeof s === 'object') {
            d.seccionesEn[k] = {
                titulo: (s.titulo != null && String(s.titulo).trim()) ? String(s.titulo).trim() : LABELS_EN[k],
                html: s.html != null ? String(s.html) : '',
            };
        }
    }
    return d;
}

let state = {
    draft: emptyDraft(),
    saving: false,
    msg: '',
    err: '',
    activeTab: 'huespedes',
};

function escAttr(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/>/g, '&gt;')
        .replace(/</g, '&lt;');
}

function escHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/>/g, '&gt;')
        .replace(/</g, '&lt;');
}

function getEmpresaNombre() {
    return String(window.__empresaTc?.nombre || window.__empresaTc?.razonSocial || '').trim();
}

function getSpecificTabLabel() {
    const nombre = getEmpresaNombre();
    return nombre ? `Condiciones ${nombre}` : 'Condiciones empresa';
}

function getSpecificTitleEn() {
    const nombre = getEmpresaNombre();
    return nombre ? `Specific conditions - ${nombre}` : SPECIFIC_TERMS_DEFAULT_EN.titulo;
}

function normalizeSpecificTitles(d) {
    const label = getSpecificTabLabel();
    if (!d.condicionesEspecificas || typeof d.condicionesEspecificas !== 'object') {
        d.condicionesEspecificas = { ...SPECIFIC_TERMS_DEFAULT };
    }
    if (!d.condicionesEspecificasEn || typeof d.condicionesEspecificasEn !== 'object') {
        d.condicionesEspecificasEn = { ...SPECIFIC_TERMS_DEFAULT_EN };
    }
    const currentTitle = String(d.condicionesEspecificas.titulo || '').trim();
    if (!currentTitle || currentTitle === SPECIFIC_TERMS_DEFAULT.titulo || currentTitle === 'Condiciones específicas') {
        d.condicionesEspecificas.titulo = label;
    }
    const currentTitleEn = String(d.condicionesEspecificasEn.titulo || '').trim();
    if (!currentTitleEn || currentTitleEn === SPECIFIC_TERMS_DEFAULT_EN.titulo) {
        d.condicionesEspecificasEn.titulo = getSpecificTitleEn();
    }
    return d;
}

function renderTabs() {
    const specificLabel = getSpecificTabLabel();
    const tabs = [
        { id: 'huespedes', label: 'Huéspedes / reservas', icon: 'fa-solid fa-bed' },
        { id: 'especificas', label: specificLabel, icon: 'fa-solid fa-list-check' },
        { id: 'software', label: 'Contratación Rezerva', icon: 'fa-solid fa-file-signature' },
    ];
    return `
        <div class="border-b border-gray-200">
            <nav class="-mb-px flex flex-wrap gap-2" aria-label="Términos y condiciones">
                ${tabs.map((tab) => {
                    const active = state.activeTab === tab.id;
                    return `
                        <button type="button"
                                class="tc-tab-btn inline-flex items-center gap-2 rounded-t-lg border px-4 py-2 text-sm font-semibold ${active ? 'border-gray-200 border-b-white bg-white text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}"
                                data-tab="${tab.id}">
                            <i class="${tab.icon}"></i>
                            ${tab.label}
                        </button>`;
                }).join('')}
            </nav>
        </div>`;
}

function renderGuestTermsPanel() {
    const d = state.draft;
    const specificLabel = getSpecificTabLabel();
    const rows = SECTION_ORDER.map((key) => {
        const sec = d.secciones[key] || { titulo: '', html: '' };
        const secEn = d.seccionesEn[key] || { titulo: '', html: '' };
        return `
        <div class="border border-gray-200 rounded-lg p-4 space-y-3 bg-white">
            <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <p class="text-xs font-semibold text-primary-700 uppercase tracking-wide">Español — ${LABELS[key]}</p>
                <div class="flex flex-wrap gap-2">
                    <button type="button" class="btn-outline text-xs" data-tc-action="move-section" data-section-key="${key}">
                        Mover a ${escHtml(specificLabel)}
                    </button>
                    <button type="button" class="btn-danger text-xs" data-tc-action="delete-section" data-section-key="${key}">
                        Eliminar ítem
                    </button>
                </div>
            </div>
            <label class="block text-sm font-medium text-gray-700">Título (página pública)</label>
            <input type="text" data-tc-titulo="${key}" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                value="${escAttr(sec.titulo || '')}" />
            <label class="block text-sm font-medium text-gray-700 mt-1">Contenido HTML</label>
            <textarea data-tc-html="${key}" rows="8" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono"></textarea>
            <div class="mt-4 pt-3 border-t border-gray-100 space-y-2">
                <p class="text-xs font-semibold text-primary-700 uppercase tracking-wide">English — ${LABELS_EN[key]}</p>
                <label class="block text-sm font-medium text-gray-700">Section title (public page)</label>
                <input type="text" data-tc-titulo-en="${key}" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    value="${escAttr(secEn.titulo || '')}" />
                <label class="block text-sm font-medium text-gray-700 mt-1">HTML content</label>
                <textarea data-tc-html-en="${key}" rows="8" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono"></textarea>
            </div>
        </div>`;
    }).join('');

    return `
        ${state.err ? `<div class="rounded-md bg-danger-50 text-danger-800 px-4 py-2 text-sm">${state.err}</div>` : ''}
        ${state.msg ? `<div class="rounded-md bg-success-50 text-success-800 px-4 py-2 text-sm">${state.msg}</div>` : ''}
        <div class="rounded-lg border border-primary-100 bg-primary-50 p-4">
            <h3 class="font-semibold text-primary-900">Términos para huéspedes</h3>
            <p class="text-sm text-primary-800 mt-1">
                Marco general para reservar, pagar, cancelar, tratar datos y definir responsabilidades. Las reglas propias de cada empresa van en la pestaña “${escHtml(specificLabel)}”.
            </p>
        </div>
        <div class="flex flex-wrap gap-2">
            <button type="button" id="btn-tc-plantilla" class="btn-outline text-sm">Cargar plantilla sugerida (ES + EN)</button>
            <a id="btn-tc-preview" href="#" target="_blank" rel="noopener" class="btn-ghost text-sm inline-flex items-center">Vista previa sitio público</a>
        </div>
        <div class="space-y-4">
            <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" id="tc-publicado" class="rounded border-gray-300 text-primary-600" ${d.publicado ? 'checked' : ''} />
                <span class="text-sm font-medium text-gray-800">Publicar en el sitio y exigir aceptación en el checkout</span>
            </label>
            <div class="grid md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700">Título de la página (ES)</label>
                    <input type="text" id="tc-titulo-pagina" class="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        value="${escAttr(d.tituloPagina || '')}" />
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Page title (EN)</label>
                    <input type="text" id="tc-titulo-pagina-en" class="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        value="${escAttr(d.tituloPaginaEn || '')}" />
                </div>
            </div>
        </div>
        <div class="space-y-6">${rows}</div>
        <div class="flex gap-3 pt-4 border-t">
            <button type="button" id="btn-tc-guardar" class="btn-primary" ${state.saving ? 'disabled' : ''}>
                ${state.saving ? 'Guardando…' : 'Guardar'}
            </button>
        </div>`;
}

function renderSpecificTermsPanel() {
    const d = state.draft;
    const sec = d.condicionesEspecificas || SPECIFIC_TERMS_DEFAULT;
    const secEn = d.condicionesEspecificasEn || SPECIFIC_TERMS_DEFAULT_EN;
    const specificLabel = getSpecificTabLabel();
    return `
        ${state.err ? `<div class="rounded-md bg-danger-50 text-danger-800 px-4 py-2 text-sm">${state.err}</div>` : ''}
        ${state.msg ? `<div class="rounded-md bg-success-50 text-success-800 px-4 py-2 text-sm">${state.msg}</div>` : ''}
        <div class="rounded-lg border border-warning-200 bg-warning-50 p-4">
            <h3 class="font-semibold text-warning-900">${escHtml(specificLabel)}</h3>
            <p class="text-sm text-warning-800 mt-1">
                Usa esta pestaña para reglas propias del alojamiento o complejo: piscina, río/lago, quinchos, mobiliario, estacionamientos, visitas, mascotas específicas, horarios internos u otras restricciones locales.
            </p>
        </div>
        <div class="flex flex-wrap gap-2">
            <a id="btn-tc-preview" href="#" target="_blank" rel="noopener" class="btn-ghost text-sm inline-flex items-center">Vista previa sitio público</a>
        </div>
        <div class="border border-gray-200 rounded-lg p-4 space-y-3 bg-white">
            <p class="text-xs font-semibold text-primary-700 uppercase tracking-wide">Español</p>
            <label class="block text-sm font-medium text-gray-700">Título (página pública)</label>
            <input type="text" id="tc-especificas-titulo" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                value="${escAttr(sec.titulo || '')}" />
            <label class="block text-sm font-medium text-gray-700 mt-1">Contenido HTML</label>
            <textarea id="tc-especificas-html" rows="10" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono"
                placeholder="<p><strong>Piscina:</strong> ...</p>&#10;<p><strong>Mobiliario:</strong> ...</p>"></textarea>
            <div class="mt-4 pt-3 border-t border-gray-100 space-y-2">
                <p class="text-xs font-semibold text-primary-700 uppercase tracking-wide">English</p>
                <label class="block text-sm font-medium text-gray-700">Section title (public page)</label>
                <input type="text" id="tc-especificas-titulo-en" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    value="${escAttr(secEn.titulo || '')}" />
                <label class="block text-sm font-medium text-gray-700 mt-1">HTML content</label>
                <textarea id="tc-especificas-html-en" rows="10" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono"
                    placeholder="<p><strong>Pool:</strong> ...</p>&#10;<p><strong>Furniture:</strong> ...</p>"></textarea>
            </div>
        </div>
        <div class="flex gap-3 pt-4 border-t">
            <button type="button" id="btn-tc-guardar" class="btn-primary" ${state.saving ? 'disabled' : ''}>
                ${state.saving ? 'Guardando…' : 'Guardar'}
            </button>
        </div>`;
}

function renderActivePanel() {
    if (state.activeTab === 'software') return renderContratacionRezervaPanel();
    if (state.activeTab === 'especificas') return renderSpecificTermsPanel();
    return renderGuestTermsPanel();
}

function renderForm() {
    const specificLabel = getSpecificTabLabel();
    return `
    <div class="bg-white p-8 rounded-lg shadow space-y-6 max-w-5xl mx-auto">
        <div class="border-b pb-4">
            <h2 class="text-2xl font-semibold text-gray-900">Términos y condiciones</h2>
            <p class="text-gray-500 mt-1 text-sm">
                Un solo apartado para separar términos generales del huésped, ${escHtml(specificLabel)} y términos comerciales de Rezerva.
            </p>
        </div>
        ${renderTabs()}
        <div class="pt-2 space-y-6">
            ${renderActivePanel()}
        </div>
    </div>`;
}

function collectDraftFromDom() {
    const d = JSON.parse(JSON.stringify(state.draft));
    const publicadoEl = document.getElementById('tc-publicado');
    if (publicadoEl) d.publicado = !!publicadoEl.checked;
    const tituloEl = document.getElementById('tc-titulo-pagina');
    if (tituloEl) d.tituloPagina = tituloEl.value?.trim() || 'Términos y condiciones';
    const tituloEnEl = document.getElementById('tc-titulo-pagina-en');
    if (tituloEnEl) d.tituloPaginaEn = tituloEnEl.value?.trim() || 'Terms and conditions';
    for (const key of SECTION_ORDER) {
        const tit = document.querySelector(`[data-tc-titulo="${key}"]`)?.value ?? d.secciones[key].titulo;
        const rawTa = document.querySelector(`textarea[data-tc-html="${key}"]`);
        const html = rawTa ? rawTa.value : d.secciones[key].html;
        d.secciones[key] = { titulo: tit.trim() || LABELS[key], html };

        const titEn = document.querySelector(`[data-tc-titulo-en="${key}"]`)?.value ?? d.seccionesEn[key].titulo;
        const rawTaEn = document.querySelector(`textarea[data-tc-html-en="${key}"]`);
        const htmlEn = rawTaEn ? rawTaEn.value : d.seccionesEn[key].html;
        d.seccionesEn[key] = { titulo: titEn.trim() || LABELS_EN[key], html: htmlEn };
    }
    const specificTitleEl = document.getElementById('tc-especificas-titulo');
    const specificHtmlEl = document.getElementById('tc-especificas-html');
    if (specificTitleEl || specificHtmlEl) {
        d.condicionesEspecificas = {
            titulo: specificTitleEl?.value?.trim() || SPECIFIC_TERMS_DEFAULT.titulo,
            html: specificHtmlEl ? specificHtmlEl.value : (d.condicionesEspecificas?.html || ''),
        };
    }
    const specificTitleEnEl = document.getElementById('tc-especificas-titulo-en');
    const specificHtmlEnEl = document.getElementById('tc-especificas-html-en');
    if (specificTitleEnEl || specificHtmlEnEl) {
        d.condicionesEspecificasEn = {
            titulo: specificTitleEnEl?.value?.trim() || SPECIFIC_TERMS_DEFAULT_EN.titulo,
            html: specificHtmlEnEl ? specificHtmlEnEl.value : (d.condicionesEspecificasEn?.html || ''),
        };
    }
    return d;
}

function fillTextareas(rootEl) {
    if (!rootEl) return;
    for (const key of SECTION_ORDER) {
        const ta = rootEl.querySelector(`textarea[data-tc-html="${key}"]`);
        if (ta) ta.value = state.draft.secciones[key]?.html || '';
        const taEn = rootEl.querySelector(`textarea[data-tc-html-en="${key}"]`);
        if (taEn) taEn.value = state.draft.seccionesEn[key]?.html || '';
    }
    const specificTa = rootEl.querySelector('#tc-especificas-html');
    if (specificTa) specificTa.value = state.draft.condicionesEspecificas?.html || '';
    const specificTaEn = rootEl.querySelector('#tc-especificas-html-en');
    if (specificTaEn) specificTaEn.value = state.draft.condicionesEspecificasEn?.html || '';
}

function appendMovedSection(existing, title, html) {
    const cleanHtml = String(html || '').trim();
    if (!cleanHtml) return String(existing || '');
    const block = `<section><h3>${escHtml(title || '')}</h3>\n${cleanHtml}</section>`;
    const current = String(existing || '').trim();
    return current ? `${current}\n\n${block}` : block;
}

function clearSection(d, key) {
    d.secciones[key] = { titulo: LABELS[key], html: '' };
    d.seccionesEn[key] = { titulo: LABELS_EN[key], html: '' };
}

function moveSectionToSpecific(key) {
    const d = normalizeSpecificTitles(collectDraftFromDom());
    const sec = d.secciones[key] || { titulo: LABELS[key], html: '' };
    const secEn = d.seccionesEn[key] || { titulo: LABELS_EN[key], html: '' };
    const hasContent = String(sec.html || '').trim() || String(secEn.html || '').trim();
    if (!hasContent) {
        state.err = 'No hay contenido para mover en este ítem.';
        state.msg = '';
        return false;
    }
    d.condicionesEspecificas.html = appendMovedSection(d.condicionesEspecificas.html, sec.titulo || LABELS[key], sec.html);
    d.condicionesEspecificasEn.html = appendMovedSection(d.condicionesEspecificasEn.html, secEn.titulo || LABELS_EN[key], secEn.html);
    clearSection(d, key);
    state.draft = d;
    state.activeTab = 'especificas';
    state.err = '';
    state.msg = `Ítem movido a ${getSpecificTabLabel()}. Revisa y guarda para confirmar.`;
    return true;
}

function deleteSection(key) {
    const d = collectDraftFromDom();
    clearSection(d, key);
    state.draft = d;
    state.err = '';
    state.msg = 'Ítem eliminado del borrador. Guarda para confirmar el cambio.';
}

function wirePreview() {
    const a = document.getElementById('btn-tc-preview');
    if (!a) return;
    const sub = window.__empresaTc?.websiteSettings?.general?.subdomain
        || window.__empresaTc?.subdominio
        || '';
    const clean = String(sub || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (clean) {
        a.href = isLocal
            ? `http://localhost:3001/terminos-y-condiciones?force_host=${clean}.onrender.com`
            : `https://${clean}.onrender.com/terminos-y-condiciones`;
        a.classList.remove('pointer-events-none', 'opacity-50');
    } else {
        a.href = '#';
        a.classList.add('pointer-events-none', 'opacity-50');
    }
}

function rerenderRoot(root) {
    root.innerHTML = renderForm();
    if (state.activeTab === 'huespedes' || state.activeTab === 'especificas') {
        fillTextareas(root);
        wirePreview();
        wireEditableTermsActions(root);
    }
    wireTabs(root);
}

function wireTabs(root) {
    root.querySelectorAll('.tc-tab-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            if (state.activeTab === 'huespedes' || state.activeTab === 'especificas') {
                state.draft = collectDraftFromDom();
            }
            state.activeTab = btn.dataset.tab || 'huespedes';
            state.err = '';
            state.msg = '';
            rerenderRoot(root);
        });
    });
}

function wireEditableTermsActions(root) {
    root.querySelectorAll('[data-tc-action][data-section-key]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const key = btn.dataset.sectionKey;
            if (!SECTION_ORDER.includes(key)) return;
            if (btn.dataset.tcAction === 'move-section') {
                moveSectionToSpecific(key);
                rerenderRoot(root);
                return;
            }
            if (btn.dataset.tcAction === 'delete-section') {
                if (!confirm('¿Eliminar este ítem del borrador? El cambio no se guardará hasta presionar Guardar.')) return;
                deleteSection(key);
                rerenderRoot(root);
            }
        });
    });

    document.getElementById('btn-tc-plantilla')?.addEventListener('click', async () => {
        if (!confirm('¿Reemplazar todas las secciones (ES + EN) con la plantilla sugerida? Se perderá el borrador actual en pantalla.')) return;
        try {
            const { plantilla } = await fetchAPI('/website/terminos-condiciones/plantilla');
            state.draft = normalizeSpecificTitles(plantilla);
            state.msg = 'Plantilla cargada. Revisa y guarda.';
            state.err = '';
        } catch (e) {
            state.err = e.message || 'No se pudo cargar la plantilla';
            state.msg = '';
        }
        rerenderRoot(root);
    });

    document.getElementById('btn-tc-guardar')?.addEventListener('click', async () => {
        const body = collectDraftFromDom();
        state.saving = true;
        state.err = '';
        state.msg = '';
        rerenderRoot(root);
        try {
            await fetchAPI('/website/home-settings', { method: 'PUT', body: { terminosCondiciones: body } });
            state.draft = body;
            state.msg = 'Guardado correctamente.';
        } catch (e) {
            state.err = e.message || 'Error al guardar';
        } finally {
            state.saving = false;
            rerenderRoot(root);
        }
    });
}

export async function render() {
    return `<div id="terminos-condiciones-root"><div class="flex justify-center p-12"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div></div>`;
}

export async function afterRender() {
    const root = document.getElementById('terminos-condiciones-root');
    if (!root) return;
    try {
        const empresa = await fetchAPI('/empresa');
        window.__empresaTc = empresa;
        state.draft = normalizeSpecificTitles(mergeDraftFromEmpresa(empresa.websiteSettings || {}));
        state.err = '';
        state.msg = '';
        rerenderRoot(root);
    } catch (e) {
        root.innerHTML = `<p class="text-danger-600 p-6">${e.message || 'Error de carga'}</p>`;
    }
}
