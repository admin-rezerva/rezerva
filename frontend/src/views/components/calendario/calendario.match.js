// Comparación estable entre eventos del API y días/recursos en vista Gantt y compacta.

export function soloFecha(iso) {
    if (iso == null || iso === '') return '';
    const s = String(iso).trim();
    return s.length >= 10 ? s.slice(0, 10) : s;
}

export function normResourceId(id) {
    return String(id == null ? '' : id).trim().toLowerCase();
}

export function mismoRecursoCal(a, b) {
    return normResourceId(a) === normResourceId(b);
}

/** Ocupación tipo hotel: [start, end) en fechas calendario YYYY-MM-DD. */
export function eventoCubreDiaCal(ev, isoDia) {
    if (!ev) return false;
    const start = soloFecha(ev.start);
    const end = soloFecha(ev.end);
    const iso = soloFecha(isoDia);
    if (!start || !end || !iso) return false;
    return iso >= start && iso < end;
}

/**
 * Unifica shape del backend (snake_case, aliases) y fechas a YYYY-MM-DD.
 */
export function normalizarEventosCalendario(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((e) => {
            const resourceId = e.resourceId ?? e.resource_id ?? e.alojamientoId ?? e.propiedadId
                ?? e.extendedProps?.alojamientoId ?? e.extendedProps?.propiedadId;
            const start = soloFecha(e.start ?? e.startStr ?? e.fechaInicio);
            const end = soloFecha(e.end ?? e.endStr ?? e.fechaFin ?? e.fechaSalida);
            return {
                ...e,
                resourceId,
                start,
                end,
            };
        })
        .filter((e) => e.resourceId != null && e.resourceId !== '' && e.start && e.end);
}
