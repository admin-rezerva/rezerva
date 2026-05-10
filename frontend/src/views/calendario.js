// frontend/src/views/calendario.js
import { fetchAPI } from '../api.js';
import { handleNavigation } from '../router.js';
import { renderGantt, colorPropiedad, diasDelMes } from './components/calendario/calendario.gantt.js';

const DIAS_SEMANA_CORTA = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

let todosEventos = [];
let todosRecursos = [];
let metricas = {};
let colorMap = {};
let mesActual = new Date();
mesActual.setDate(1);

/** Primer día visible en la vista compacta (móvil): ventana de 7 días consecutivos. */
function fechaLocalMedianoche(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
let inicioSemanaCompacta = fechaLocalMedianoche(new Date());

function syncMesActualDesdeInicioSemana() {
    const d = inicioSemanaCompacta;
    mesActual = new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Siete fechas ISO locales desde inicioSemanaCompacta. */
function sieteDiasVentanaCompacta() {
    const cur = fechaLocalMedianoche(inicioSemanaCompacta);
    const out = [];
    for (let i = 0; i < 7; i++) {
        const yy = cur.getFullYear();
        const mm = String(cur.getMonth() + 1).padStart(2, '0');
        const dd = String(cur.getDate()).padStart(2, '0');
        out.push(`${yy}-${mm}-${dd}`);
        cur.setDate(cur.getDate() + 1);
    }
    return out;
}

function esViewportCalendarioDesktop() {
    return typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;
}

function hoyISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

/** Comparación estable aunque el API devuelva ISO con hora o resourceId como string distinto al recurso. */
function soloFecha(iso) {
    if (iso == null || iso === '') return '';
    const s = String(iso);
    return s.length >= 10 ? s.slice(0, 10) : s;
}

function escHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/"/g, '&quot;');
}

function etiquetaCompactaCliente(nombre) {
    const partes = (nombre || '').trim().split(/\s+/);
    const apellido = partes[0] || '';
    const inicial = partes[1] ? `${partes[1][0]}.` : '';
    const t = `${apellido}${inicial ? ', ' + inicial : ''}`.trim();
    return t || 'Reserva';
}

function ocupacionEnDia(resourceId, iso, eventos) {
    const rid = String(resourceId);
    const matches = eventos.filter(e => {
        if (String(e.resourceId) !== rid) return false;
        const start = soloFecha(e.start);
        const end = soloFecha(e.end);
        return iso >= start && iso < end;
    });
    if (!matches.length) return null;
    const bloq = matches.find(e => e.extendedProps?.tipo === 'bloqueo');
    if (bloq) return { tipo: 'bloqueo', ev: bloq };
    return { tipo: 'reserva', ev: matches[0] };
}

function etiquetaRangoDias(diasISO) {
    if (!diasISO.length) return '';
    const a = new Date(diasISO[0] + 'T00:00:00');
    const b = new Date(diasISO[diasISO.length - 1] + 'T00:00:00');
    const o = { day: 'numeric', month: 'short' };
    return `${a.toLocaleDateString('es-CL', o)} – ${b.toLocaleDateString('es-CL', o)}`;
}

function nombreMes(fecha) {
    return fecha.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
}

function renderMetricas() {
    const ocupPct = metricas.totalPropiedades
        ? Math.round((metricas.ocupados / metricas.totalPropiedades) * 100)
        : 0;

    return `
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div class="bg-white border border-gray-200 rounded-xl py-3.5 px-5 text-center shadow-sm">
                <p class="text-[1.75rem] font-bold text-slate-900 leading-none">${metricas.reservasActivas ?? 0}</p>
                <p class="text-[0.72rem] text-slate-500 mt-1 uppercase tracking-wide">Reservas activas</p>
            </div>
            <div class="bg-white border border-gray-200 rounded-xl py-3.5 px-5 text-center shadow-sm">
                <p class="text-[1.75rem] font-bold text-success-600 leading-none">${ocupPct}%</p>
                <p class="text-[0.72rem] text-slate-500 mt-1 uppercase tracking-wide">Ocupación hoy</p>
            </div>
            <div class="bg-white border border-gray-200 rounded-xl py-3.5 px-5 text-center shadow-sm">
                <p class="text-[1.75rem] font-bold text-warning-600 leading-none">${metricas.checkinHoy ?? 0}</p>
                <p class="text-[0.72rem] text-slate-500 mt-1 uppercase tracking-wide">Check-ins hoy</p>
            </div>
            <div class="bg-white border border-gray-200 rounded-xl py-3.5 px-5 text-center shadow-sm">
                <p class="text-[1.75rem] font-bold text-slate-900 leading-none">${metricas.checkoutHoy ?? 0}</p>
                <p class="text-[0.72rem] text-slate-500 mt-1 uppercase tracking-wide">Check-outs hoy</p>
            </div>
        </div>`;
}

function renderLeyenda() {
    return `
        <div class="cal-leyenda">
            ${todosRecursos.map(r => `
                <span class="cal-leyenda-item">
                    <span class="cal-leyenda-dot" style="background:${colorMap[r.id]}"></span>
                    ${r.title}
                </span>`).join('')}
        </div>`;
}

function renderNavegacion() {
    return `
        <div class="cal-nav">
            <button id="cal-prev" class="cal-nav-btn" type="button" aria-label="Anterior">‹</button>
            <button id="cal-hoy" class="cal-nav-btn cal-nav-today" type="button">Hoy</button>
            <button id="cal-next" class="cal-nav-btn" type="button" aria-label="Siguiente">›</button>
            <h3 id="cal-mes-label" class="cal-nav-titulo">${nombreMes(mesActual)}</h3>
        </div>`;
}


/** Vista sustituta en móvil: tarjetas por recurso y 7 días en columna (el Gantt queda oculto hasta `lg`). */
function renderVistaCompacta() {
    const dias7 = sieteDiasVentanaCompacta();
    const hoy = hoyISO();
    const rango = etiquetaRangoDias(dias7);

    if (!todosRecursos.length) {
        return `
            <div class="rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-500 text-sm shadow-sm">
                No hay alojamientos para mostrar.
            </div>`;
    }

    const tarjetas = todosRecursos.map(rec => {
        const color = colorMap[rec.id];
        const badgeCap = rec.capacidad
            ? `<span class="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">${rec.capacidad} huésp.</span>`
            : '';

        const filasDia = dias7.map(iso => {
            const d = new Date(iso + 'T00:00:00');
            const letra = DIAS_SEMANA_CORTA[d.getDay()];
            const num = d.getDate();
            const esHoy = iso === hoy;
            const occ = ocupacionEnDia(rec.id, iso, todosEventos);

            const labelCls = esHoy
                ? 'text-xs font-semibold text-primary-600 tabular-nums'
                : 'text-xs text-gray-600 tabular-nums';

            let celda;
            if (!occ) {
                celda = '<div class="min-h-6 flex-1 rounded-md bg-gray-200 touch-manipulation" aria-hidden="true"></div>';
            } else if (occ.tipo === 'bloqueo') {
                const p = occ.ev.extendedProps;
                const payload = JSON.stringify({ tipo: 'bloqueo', motivo: p.motivo, start: occ.ev.start, end: occ.ev.end }).replace(/'/g, '&#39;');
                celda = `<div class="cal-compact-bloque flex min-h-6 flex-1 items-center rounded-md bg-gray-700 px-1.5 touch-manipulation" data-reserva='${payload}'><span class="truncate text-[10px] font-semibold text-white">🔒 ${escHtml((p.motivo || 'Bloqueo').slice(0, 24))}</span></div>`;
            } else {
                const p = occ.ev.extendedProps;
                const payload = JSON.stringify({
                    clienteNombre: p.clienteNombre,
                    alojamientoNombre: p.alojamientoNombre,
                    canalNombre: p.canalNombre,
                    start: occ.ev.start,
                    end: occ.ev.end,
                    totalNoches: p.totalNoches,
                    huespedes: p.huespedes,
                    telefono: p.telefono,
                    estado: p.estado,
                    estadoGestion: p.estadoGestion,
                    idReserva: p.idReserva,
                    idReservaCanal: p.idReservaCanal
                }).replace(/'/g, '&#39;');
                const mini = escHtml(etiquetaCompactaCliente(p.clienteNombre));
                celda = `<div class="cal-compact-bloque flex min-h-6 flex-1 cursor-pointer items-center rounded-md px-1.5 touch-manipulation" style="background:${color}" data-reserva='${payload}'><span class="truncate text-[10px] font-semibold leading-tight text-white drop-shadow-sm">${mini}</span></div>`;
            }

            return `
                <div class="flex min-w-0 items-center gap-2">
                    <span class="${labelCls} w-9 shrink-0 whitespace-nowrap">${letra} ${num}</span>
                    ${celda}
                </div>`;
        }).join('');

        return `
            <div class="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div class="flex flex-shrink-0 items-center justify-between gap-2">
                    <div class="flex min-w-0 items-center gap-2">
                        <span class="h-3 w-3 shrink-0 rounded-full" style="background:${color}"></span>
                        <span class="truncate font-semibold text-gray-900">${rec.title}</span>
                    </div>
                    ${badgeCap}
                </div>
                <div class="flex min-w-0 flex-col gap-2">${filasDia}</div>
            </div>`;
    }).join('');

    return `
        <div class="flex flex-col gap-1 border-b border-gray-100 pb-3">
            <h3 class="text-base font-semibold text-gray-900">Vista semanal</h3>
            <p class="text-xs text-gray-500"><strong>‹ ›</strong> en el teléfono mueven esta semana de 7 días. En pantalla grande (≥1024px) cambian el mes del gráfico. <span class="text-gray-600">${rango}</span></p>
        </div>
        <div class="flex flex-col gap-4">${tarjetas}</div>`;
}

function actualizarGantt() {
    const año = mesActual.getFullYear();
    const mes = mesActual.getMonth();
    const dias = diasDelMes(año, mes);
    const hoy  = hoyISO();

    const contenedor = document.getElementById('gantt-contenedor');
    if (!contenedor) return;
    contenedor.innerHTML = renderGantt(todosRecursos, todosEventos, colorMap, dias, hoy);

    const compacta = document.getElementById('cal-compacta-wrap');
    if (compacta) compacta.innerHTML = renderVistaCompacta();

    document.getElementById('cal-mes-label').textContent = nombreMes(mesActual);

    // Sincronizar scroll del header con el body (el header tiene overflow:hidden, se mueve por JS)
    const scrollArea   = contenedor.querySelector('.gantt-body');
    const scrollHeader = contenedor.querySelector('.gantt-scroll-header');
    if (scrollArea && scrollHeader) {
        scrollArea.addEventListener('scroll', () => {
            scrollHeader.scrollLeft = scrollArea.scrollLeft;
        });
    }

    // Scroll al día de hoy si estamos en el mes actual
    const esHoy = año === new Date().getFullYear() && mes === new Date().getMonth();
    if (esHoy) {
        setTimeout(() => {
            const diaHoy = new Date().getDate() - 1;
            const scrollTo = Math.max(0, diaHoy * 44 - 100);
            if (scrollArea)   scrollArea.scrollLeft   = scrollTo;
            if (scrollHeader) scrollHeader.scrollLeft = scrollTo;
        }, 50);
    }

    adjuntarEventosGantt();
}

function adjuntarEventosGantt() {
    const tooltip = document.getElementById('cal-tooltip');

    document.querySelectorAll('.gantt-bloque, .cal-compact-bloque').forEach(bloque => {
        const data = JSON.parse(bloque.dataset.reserva);

        bloque.addEventListener('mouseenter', () => {
            if (tooltip) {
                const fmt = iso => new Date(iso + 'T00:00:00').toLocaleDateString('es-CL');
                if (data.tipo === 'bloqueo') {
                    tooltip.innerHTML = `
                        <p class="cal-tooltip-nombre"><i class="fa-solid fa-lock mr-1"></i>Alojamiento Bloqueado</p>
                        <p class="cal-tooltip-aloj">${data.motivo || 'Sin motivo especificado'}</p>
                        <div class="cal-tooltip-grid">
                            <span>Desde</span><span>${fmt(data.start)}</span>
                            <span>Hasta</span><span>${fmt(data.end)}</span>
                        </div>`;
                } else {
                    tooltip.innerHTML = `
                        <p class="cal-tooltip-nombre">${data.clienteNombre}</p>
                        <p class="cal-tooltip-aloj">${data.alojamientoNombre}</p>
                        <div class="cal-tooltip-grid">
                            <span>Canal</span><span>${data.canalNombre || '—'}</span>
                            <span>Ingreso</span><span>${fmt(data.start)}</span>
                            <span>Salida</span><span>${fmt(data.end)}</span>
                            <span>Noches</span><span>${data.totalNoches}</span>
                            <span>Huésp.</span><span>${data.huespedes}</span>
                            <span>Teléfono</span><span>${data.telefono || '—'}</span>
                        </div>`;
                }
                tooltip.classList.remove('hidden');
            }
        });

        bloque.addEventListener('mousemove', (e) => {
            if (tooltip) {
                tooltip.style.left = `${e.pageX + 12}px`;
                tooltip.style.top  = `${e.pageY - 10}px`;
            }
        });

        bloque.addEventListener('mouseleave', () => {
            if (tooltip) tooltip.classList.add('hidden');
        });

        bloque.addEventListener('click', () => { if (data.tipo !== 'bloqueo') abrirModal(data); });
    });
}

function abrirModal(data) {
    const fmt = iso => new Date(iso + 'T00:00:00').toLocaleDateString('es-CL');
    const modal = document.getElementById('cal-modal');
    document.getElementById('cal-modal-body').innerHTML = `
        <dl class="cal-modal-dl">
            <div><dt>Huésped</dt><dd>${data.clienteNombre}</dd></div>
            <div><dt>Alojamiento</dt><dd>${data.alojamientoNombre}</dd></div>
            <div><dt>Canal</dt><dd>${data.canalNombre || '—'}</dd></div>
            <div><dt>Ingreso</dt><dd>${fmt(data.start)}</dd></div>
            <div><dt>Salida</dt><dd>${fmt(data.end)}</dd></div>
            <div><dt>Noches</dt><dd>${data.totalNoches}</dd></div>
            <div><dt>Huéspedes</dt><dd>${data.huespedes}</dd></div>
            <div><dt>Teléfono</dt><dd>${data.telefono || '—'}</dd></div>
            <div><dt>Estado Reserva</dt><dd>${data.estado}</dd></div>
            <div><dt>Estado Gestión</dt><dd>${data.estadoGestion || 'N/A'}</dd></div>
        </dl>
        <div class="mt-5 pt-4 border-t flex justify-end">
            <button id="cal-modal-ir-reserva" class="btn-primary text-sm flex items-center gap-1.5">
                Ver Reserva <i class="fa-solid fa-arrow-right"></i>
            </button>
        </div>`;

    modal.classList.remove('hidden');

    document.getElementById('cal-modal-ir-reserva').addEventListener('click', () => {
        modal.classList.add('hidden');
        const canalId = data.idReservaCanal || data.idReserva;
        if (data.estadoGestion?.startsWith('Pendiente')) {
            sessionStorage.setItem('highlightReserva', canalId);
            handleNavigation('/gestion-diaria');
        } else {
            sessionStorage.setItem('openReserva', canalId);
            handleNavigation('/gestionar-reservas');
        }
    });
}

export async function render() {
    return `
        <div class="cal-container">
            <div class="cal-header">
                <h2 class="cal-titulo">Calendario de Ocupación</h2>
                <div id="cal-nav-wrap"></div>
            </div>
            <div id="cal-metricas-wrap"></div>
            <div id="cal-leyenda-wrap"></div>
            <div id="gantt-contenedor" class="cal-gantt-wrap hidden lg:block">
                <p class="text-center text-gray-400 py-12">Cargando...</p>
            </div>
            <div id="cal-compacta-wrap" class="block lg:hidden space-y-4"></div>
        </div>

        <!-- Tooltip flotante -->
        <div id="cal-tooltip" class="cal-tooltip hidden"></div>

        <!-- Modal detalle -->
        <div id="cal-modal" class="modal hidden fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
                <div class="flex items-center gap-3 mb-4 pb-4 border-b">
                    <div class="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600 flex-shrink-0"><i class="fa-solid fa-house"></i></div>
                    <div class="flex-1">
                        <h3 class="text-base font-semibold text-gray-900">Detalle de Reserva</h3>
                    </div>
                    <button id="cal-modal-close" class="text-gray-400 hover:text-gray-700 text-xl leading-none">&times;</button>
                </div>
                <div id="cal-modal-body"></div>
            </div>
        </div>`;
}

export async function afterRender() {
    try {
        const datos = await fetchAPI('/calendario');
        todosEventos  = datos.eventos;
        todosRecursos = datos.recursos;
        metricas      = datos.metricas || {};

        todosRecursos.forEach((r, i) => { colorMap[r.id] = colorPropiedad(i); });

        document.getElementById('cal-metricas-wrap').innerHTML = renderMetricas();
        document.getElementById('cal-leyenda-wrap').innerHTML  = renderLeyenda();
        document.getElementById('cal-nav-wrap').innerHTML      = renderNavegacion();

        // Insertar label de mes en nav
        const nav = document.getElementById('cal-nav-wrap');
        if (nav) {
            const labelMes = () => {
                const el = document.getElementById('cal-mes-label');
                if (el) el.textContent = nombreMes(mesActual);
            };
            nav.querySelector('#cal-prev').addEventListener('click', () => {
                if (esViewportCalendarioDesktop()) {
                    mesActual.setMonth(mesActual.getMonth() - 1);
                    inicioSemanaCompacta = fechaLocalMedianoche(
                        new Date(mesActual.getFullYear(), mesActual.getMonth(), 1)
                    );
                } else {
                    inicioSemanaCompacta = new Date(
                        inicioSemanaCompacta.getFullYear(),
                        inicioSemanaCompacta.getMonth(),
                        inicioSemanaCompacta.getDate() - 7
                    );
                    syncMesActualDesdeInicioSemana();
                }
                labelMes();
                actualizarGantt();
            });
            nav.querySelector('#cal-next').addEventListener('click', () => {
                if (esViewportCalendarioDesktop()) {
                    mesActual.setMonth(mesActual.getMonth() + 1);
                    inicioSemanaCompacta = fechaLocalMedianoche(
                        new Date(mesActual.getFullYear(), mesActual.getMonth(), 1)
                    );
                } else {
                    inicioSemanaCompacta = new Date(
                        inicioSemanaCompacta.getFullYear(),
                        inicioSemanaCompacta.getMonth(),
                        inicioSemanaCompacta.getDate() + 7
                    );
                    syncMesActualDesdeInicioSemana();
                }
                labelMes();
                actualizarGantt();
            });
            nav.querySelector('#cal-hoy').addEventListener('click', () => {
                const t = new Date();
                mesActual = new Date(t.getFullYear(), t.getMonth(), 1);
                inicioSemanaCompacta = fechaLocalMedianoche(t);
                labelMes();
                actualizarGantt();
            });
        }

        actualizarGantt();

        document.getElementById('cal-modal-close').addEventListener('click', () => {
            document.getElementById('cal-modal').classList.add('hidden');
        });

    } catch (error) {
        const msg = `<p class="text-danger-500 p-6">Error al cargar el calendario: ${error.message}</p>`;
        const g = document.getElementById('gantt-contenedor');
        if (g) g.innerHTML = msg;
        const c = document.getElementById('cal-compacta-wrap');
        if (c) c.innerHTML = msg;
    }
}
