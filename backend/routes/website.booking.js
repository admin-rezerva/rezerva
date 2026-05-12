const express = require('express');
const { mergeEffectiveRules, buildHouseRulesPublicView } = require('../services/houseRulesService');
const { resolveDepositoReservaWeb } = require('../services/depositoReservaWebService');
const { consumirTokenEsperaParaReserva } = require('../services/esperaDisponibilidadService');
const { obtenerEstadoReservaPublica } = require('../services/publicReservationStatusService');

function registerBookingRoutes({ router, db, deps }) {
    const { obtenerPropiedadPorId, crearReservaPublica } = deps;

    router.get('/reservar', async (req, res) => {
        const empresaId = req.empresa.id;
        const empresaCompleta = req.empresaCompleta;
        try {
            const propiedadIdsQuery = req.query.propiedadId || '';
            const propiedadIds = propiedadIdsQuery.split(',').map((id) => id.trim()).filter(Boolean);
            if (propiedadIds.length === 0 || !req.query.fechaLlegada || !req.query.fechaSalida || !req.query.noches || !req.query.precioFinal || !req.query.personas) {
                return res.status(400).render('404', { title: 'Faltan Datos para Reservar', empresa: empresaCompleta });
            }
            const propiedadesPromises = propiedadIds.map((id) => obtenerPropiedadPorId(db, empresaId, id));
            const propiedadesResult = await Promise.all(propiedadesPromises);
            const propiedades = propiedadesResult.filter(Boolean);
            if (propiedades.length !== propiedadIds.length) {
                return res.status(404).render('404', { title: 'Una o más propiedades no encontradas', empresa: empresaCompleta });
            }
            const isGroupReservation = propiedades.length > 1;
            const dataToRender = isGroupReservation ? propiedades : propiedades[0];
            const precioFinalNum = Math.max(0, Math.round(Number(req.query.precioFinal) || 0));
            const depositoReserva = resolveDepositoReservaWeb(
                empresaCompleta.websiteSettings?.booking,
                precioFinalNum
            );
            const propiedadNormasRef = propiedades[0];
            const reglasMerged = mergeEffectiveRules(
                empresaCompleta.websiteSettings?.houseRules,
                propiedadNormasRef.normasAlojamiento || {}
            );
            const reglasVista = buildHouseRulesPublicView(reglasMerged, propiedadNormasRef.capacidad);
            const htmlLang = empresaCompleta.websiteSettings?.email?.idiomaPorDefecto === 'en' ? 'en' : 'es';
            res.render('reservar', {
                title: `Completar Reserva | ${empresaCompleta.nombre}`,
                propiedad: dataToRender,
                isGroup: isGroupReservation,
                query: req.query,
                reglasVista,
                depositoReserva,
                htmlLang,
            });
        } catch (error) {
            res.status(500).render('404', { title: 'Error Interno del Servidor', empresa: empresaCompleta || { id: empresaId, nombre: 'Error Crítico' } });
        }
    });

    router.get('/reservar-desde-espera', async (req, res) => {
        try {
            const empresaId = req.empresa.id;
            const token = String(req.query.token || '').trim();
            if (!token) {
                return res.status(400).render('404', { title: 'Enlace inválido', empresa: req.empresaCompleta });
            }
            const consumed = await consumirTokenEsperaParaReserva(empresaId, token);
            if (!consumed) {
                return res.status(410).render('404', { title: 'Enlace vencido o ya utilizado', empresa: req.empresaCompleta });
            }

            const query = new URLSearchParams({
                propiedadId: String(req.query.propiedadId || consumed.propiedad_id_preferida || '').trim(),
                fechaLlegada: String(req.query.fechaLlegada || '').trim(),
                fechaSalida: String(req.query.fechaSalida || '').trim(),
                noches: String(req.query.noches || '').trim(),
                precioFinal: String(req.query.precioFinal || '').trim(),
                personas: String(req.query.personas || consumed.personas || '').trim(),
            });

            return res.redirect(`/reservar?${query.toString()}`);
        } catch (error) {
            return res.status(500).render('404', { title: 'No se pudo validar el enlace', empresa: req.empresaCompleta });
        }
    });

    router.post('/crear-reserva-publica', express.json(), async (req, res) => {
        try {
            const empresaId = req.empresa.id;
            if (!empresaId) throw new Error('No se pudo identificar la empresa para la reserva.');
            const reserva = await crearReservaPublica(db, empresaId, req.body);
            res.status(201).json({ reservaId: reserva.idReservaCanal });
        } catch (error) {
            const status = Number(error.statusCode) || 500;
            const body = { error: error.message || 'Error interno al procesar la reserva.' };
            if (error.code) body.code = String(error.code);
            if (Array.isArray(error.details) && error.details.length) {
                body.details = error.details;
            }
            res.status(status).json(body);
        }
    });

    router.get('/confirmacion', async (req, res) => {
        const empresaId = req.empresa.id;
        const empresaCompleta = req.empresaCompleta;
        try {
            const reservaIdOriginal = req.query.reservaId;
            if (!reservaIdOriginal) return res.status(404).render('404', { title: 'Reserva No Encontrada', empresa: empresaCompleta });
            const estadoReserva = await obtenerEstadoReservaPublica({
                empresaId,
                reservaIdPublico: reservaIdOriginal,
                empresa: empresaCompleta,
                obtenerPropiedadPorId,
            });
            if (!estadoReserva) return res.status(404).render('404', { title: 'Reserva No Encontrada', empresa: empresaCompleta });
            const htmlLang = empresaCompleta.websiteSettings?.email?.idiomaPorDefecto === 'en' ? 'en' : 'es';
            res.render('confirmacion', {
                title: `Estado de mi reserva | ${empresaCompleta.nombre}`,
                reserva: estadoReserva,
                cliente: estadoReserva.cliente,
                htmlLang,
                guestBookingLinks: estadoReserva.guestBookingLinks,
                depositoReserva: estadoReserva.deposito,
            });
        } catch (error) {
            console.error('[confirmacion] Error renderizando estado de reserva:', error);
            res.status(500).render('404', { title: 'Error Interno del Servidor', empresa: empresaCompleta || { id: empresaId, nombre: 'Error Crítico' } });
        }
    });
}

module.exports = { registerBookingRoutes };
