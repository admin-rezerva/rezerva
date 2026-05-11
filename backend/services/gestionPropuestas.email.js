// backend/services/gestionPropuestas.email.js
const pool = require('../db/postgres');
const { obtenerClientePorId } = require('./clientesService');
const { procesarPlantilla, textoAHtml } = require('./plantillasService');
const emailService = require('./emailService');
const { registrarComunicacion } = require('./comunicacionesService');
const {
    enviarPorDisparador,
    enviarNotificacionInterna,
    construirVariablesDesdeReserva,
    resolverLinkResenaOutbound,
} = require('./transactionalEmailService');

async function _obtenerDatosEmpresa(_db, empresaId) {
    const { rows } = await pool.query('SELECT nombre, configuracion FROM empresas WHERE id = $1', [empresaId]);
    if (!rows[0]) return {};
    return { nombre: rows[0].nombre, ...(rows[0].configuracion || {}) };
}

/**
 * Fila PG para el motor de plantillas (mismo shape que hooks transaccionales).
 * @param {string} empresaId
 * @param {{ reservaInternaId?: string, reservaId?: string }} datosReserva
 */
async function _cargarFilaReservaParaEmail(empresaId, datosReserva) {
    if (!pool) return null;
    const iid = datosReserva.reservaInternaId != null ? String(datosReserva.reservaInternaId).trim() : '';
    if (iid) {
        const { rows } = await pool.query(
            `SELECT id, id_reserva_canal, cliente_id, propiedad_id, alojamiento_nombre, fecha_llegada, fecha_salida,
                    total_noches, cantidad_huespedes, valores, estado, metadata, canal_nombre
             FROM reservas WHERE id = $1 AND empresa_id = $2 LIMIT 1`,
            [iid, empresaId]
        );
        if (rows[0]) return rows[0];
    }
    const idCanal = datosReserva.reservaId != null ? String(datosReserva.reservaId).trim() : '';
    if (idCanal) {
        const { rows } = await pool.query(
            `SELECT id, id_reserva_canal, cliente_id, propiedad_id, alojamiento_nombre, fecha_llegada, fecha_salida,
                    total_noches, cantidad_huespedes, valores, estado, metadata, canal_nombre
             FROM reservas WHERE empresa_id = $1 AND id_reserva_canal = $2
             ORDER BY fecha_llegada ASC NULLS LAST LIMIT 1`,
            [empresaId, idCanal]
        );
        if (rows[0]) return rows[0];
    }
    return null;
}

const enviarEmailPropuesta = async (db, empresaId, datos) => {
    const { plantillaId, cliente, propiedades, fechaLlegada, fechaSalida, noches, personas, precioFinal, propuestaId, linkPago } = datos;

    if (!cliente?.email) throw new Error('El cliente no tiene email registrado');

    const empresaData = await _obtenerDatosEmpresa(db, empresaId);

    const formatearFecha = (f) => new Date(f + 'T00:00:00Z').toLocaleDateString('es-CL', { timeZone: 'UTC' });
    const fmt = (v) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(v || 0);

    const fechaVencimiento = new Date();
    fechaVencimiento.setDate(fechaVencimiento.getDate() + 1);
    const montoAbono = precioFinal ? precioFinal * 0.5 : 0;
    const nombresPropiedades = propiedades.map(p => p.nombre).join(', ');

    const { contenido, asunto } = await procesarPlantilla(db, empresaId, plantillaId, {
        propuestaId, reservaId: propuestaId,
        clienteNombre: cliente.nombre, nombreCliente: cliente.nombre,
        fechaEmision: new Date().toLocaleDateString('es-CL'),
        fechaLlegada: formatearFecha(fechaLlegada), fechaSalida: formatearFecha(fechaSalida),
        fechasEstadiaTexto: `${formatearFecha(fechaLlegada)} al ${formatearFecha(fechaSalida)}`,
        fechaVencimiento: fechaVencimiento.toLocaleDateString('es-CL') + ' a las ' + fechaVencimiento.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
        noches: noches?.toString() || '', totalNoches: noches?.toString() || '',
        personas: personas?.toString() || '', numeroHuespedes: personas?.toString() || '',
        nombrePropiedad: nombresPropiedades, propiedadesNombres: nombresPropiedades,
        detallePropiedades: propiedades.map(p => `• ${p.nombre}`).join('\n'),
        precioFinal: fmt(precioFinal), saldoPendiente: fmt(precioFinal),
        montoTotal: fmt(precioFinal), resumenValores: `Total: ${fmt(precioFinal)}`,
        porcentajeAbono: '50%', montoAbono: fmt(montoAbono),
        empresaNombre: empresaData?.nombre || '', empresaWebsite: empresaData?.website || '',
        contactoNombre: empresaData?.contactoNombre || '', usuarioNombre: empresaData?.contactoNombre || '',
        contactoEmail: empresaData?.contactoEmail || '', usuarioEmail: empresaData?.contactoEmail || '',
        contactoTelefono: empresaData?.contactoTelefono || '', usuarioTelefono: empresaData?.contactoTelefono || '',
        linkPago: linkPago || ''
    });

    const resultado = await emailService.enviarCorreo(db, { to: cliente.email, subject: asunto, html: contenido, empresaId });
    if (!resultado.success) throw new Error(resultado.error || 'Error al enviar correo');

    if (cliente.id) {
        try {
            await registrarComunicacion(db, empresaId, cliente.id, {
                tipo: 'email', evento: 'propuesta-enviada', asunto, plantillaId,
                destinatario: cliente.email, relacionadoCon: { tipo: 'propuesta', id: propuestaId },
                estado: 'enviado', messageId: resultado.messageId || null
            });
        } catch (e) { console.warn('No se pudo registrar comunicación:', e.message); }
    }
    return resultado;
};

const enviarEmailReservaConfirmada = async (db, empresaId, datosReserva) => {
    const {
        clienteId, reservaId, propiedades, fechaLlegada, fechaSalida, noches, personas, precioFinal,
    } = datosReserva;

    if (!clienteId) { console.warn('No se puede enviar email: no hay clienteId'); return; }

    const cliente = await obtenerClientePorId(db, empresaId, clienteId);
    if (!cliente) { console.warn('No se puede enviar email: cliente no encontrado'); return; }

    if (!cliente.email) { console.warn('No se puede enviar email: cliente sin email'); return; }

    const empresaData = await _obtenerDatosEmpresa(db, empresaId);

    const formatearFecha = (f) => (f instanceof Date ? f : new Date(f)).toLocaleDateString('es-CL');
    const fmt = (v) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(v || 0);

    const fechaLlegadaStr = formatearFecha(fechaLlegada);
    const fechaSalidaStr = formatearFecha(fechaSalida);
    const nombresPropiedades = propiedades.map((p) => p.nombre || p).join(', ');

    let rowPg = await _cargarFilaReservaParaEmail(empresaId, datosReserva);
    if (!rowPg) {
        rowPg = {
            id: null,
            id_reserva_canal: reservaId,
            cliente_id: clienteId,
            alojamiento_nombre: nombresPropiedades,
            fecha_llegada: fechaLlegada,
            fecha_salida: fechaSalida,
            total_noches: noches,
            cantidad_huespedes: personas,
            valores: { valorHuesped: precioFinal },
            metadata: {},
            canal_nombre: '',
        };
    }

    let linkResena = '';
    if (rowPg.id != null && reservaId) {
        try {
            const pid = rowPg.propiedad_id != null ? String(rowPg.propiedad_id).trim() : null;
            linkResena = await resolverLinkResenaOutbound(empresaId, {
                reservaRef: String(reservaId),
                nombreHuesped: String(cliente.nombre || '').trim(),
                propiedadIdFallback: pid,
            });
        } catch (_) { /* ignore */ }
    }

    const variables = await construirVariablesDesdeReserva(empresaId, rowPg, {
        clienteNombre: cliente.nombre,
        linkResena,
        clienteEmail: cliente.email,
        clienteTelefono: cliente.telefono || '',
        canalNombre: rowPg.canal_nombre || '',
    });

    const relacionado = { tipo: 'reserva', id: String(reservaId) };

    const envio = await enviarPorDisparador(null, empresaId, 'reserva_confirmada', {
        clienteId,
        variables,
        relacionadoCon: relacionado,
        eventoComunicacion: 'reserva-confirmada',
    });

    let resultado = { success: envio.sent, messageId: envio.messageId };
    if (!envio.sent && envio.reason === 'no_plantilla') {
        const contenidoTexto = `✅ Reserva Confirmada #${reservaId}

Hola ${cliente.nombre},

¡Tu reserva ha sido confirmada exitosamente!

📅 Detalles de tu reserva:
• Check-in: ${fechaLlegadaStr}
• Check-out: ${fechaSalidaStr}
• Noches: ${noches || 'N/A'}
• Huéspedes: ${personas || 'N/A'}
• Alojamiento: ${nombresPropiedades}
• Total: ${fmt(precioFinal)}

Gracias por tu preferencia.

Saludos,
${empresaData?.contactoNombre || empresaData?.nombre || 'El equipo'}
${empresaData?.contactoTelefono || ''}
${empresaData?.website || ''}`.trim();

        resultado = await emailService.enviarCorreo(db, {
            to: cliente.email,
            subject: `✅ Reserva Confirmada #${reservaId} - ${empresaData?.nombre || 'Rezerva'}`,
            html: textoAHtml(contenidoTexto),
            empresaId,
        });
        if (!resultado.success) throw new Error(resultado.error || 'Error al enviar correo');
        try {
            await registrarComunicacion(db, empresaId, clienteId, {
                tipo: 'email', evento: 'reserva-confirmada',
                asunto: `Reserva Confirmada #${reservaId}`, destinatario: cliente.email,
                relacionadoCon: relacionado,
                estado: 'enviado', messageId: resultado.messageId || null,
            });
        } catch (e) { console.warn('No se pudo registrar comunicación:', e.message); }
    } else if (!envio.sent) {
        console.warn('[enviarEmailReservaConfirmada] Motor reserva_confirmada:', envio.reason || 'sin enviar');
    }

    const adminTo = String(empresaData?.contactoEmail || '').trim().toLowerCase();
    const clienteEmailLower = String(cliente.email || '').trim().toLowerCase();
    if (adminTo && adminTo !== clienteEmailLower) {
        const envioAdmin = await enviarNotificacionInterna(null, empresaId, variables, relacionado);
        if (!envioAdmin.sent && envioAdmin.reason === 'no_plantilla') {
            try {
                await emailService.enviarCorreo(db, {
                    to: empresaData.contactoEmail,
                    subject: `[Admin] Reserva Confirmada #${reservaId} - ${cliente.nombre}`,
                    html: `<div style="font-family:Arial,sans-serif;padding:20px"><h2>Nueva Reserva Confirmada</h2><p><strong>Cliente:</strong> ${cliente.nombre} (${cliente.email})</p><p><strong>N° Reserva:</strong> ${reservaId}</p><p><strong>Fechas:</strong> ${fechaLlegadaStr} al ${fechaSalidaStr}</p><p><strong>Alojamiento:</strong> ${nombresPropiedades}</p><p><strong>Total:</strong> ${fmt(precioFinal)}</p></div>`,
                    empresaId,
                });
            } catch (e) { console.warn('No se pudo enviar copia al admin:', e.message); }
        } else if (!envioAdmin.sent) {
            console.warn('[enviarEmailReservaConfirmada] Motor notificacion_interna:', envioAdmin.reason || 'sin enviar');
        }
    }

    return resultado;
};

module.exports = { enviarEmailPropuesta, enviarEmailReservaConfirmada };
