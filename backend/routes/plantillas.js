const express = require('express');
const {
    crearTipoPlantilla,
    obtenerTiposPlantilla,
    actualizarTipoPlantilla,
    eliminarTipoPlantilla,
    crearPlantilla,
    obtenerPlantillasPorEmpresa,
    actualizarPlantilla,
    eliminarPlantilla,
    generarPlantillaConIa,
    renderCuerpoPlantillaHtml,
} = require('../services/plantillasService');
const { ETIQUETAS_CATALOGO, reemplazarEtiquetasEnTexto } = require('../services/plantillasEtiquetasCatalog');
const { construirVariablesDesdeReserva } = require('../services/transactionalEmailService');
const { inferirModoPlantilla } = require('../services/ai/prompts/plantillasIa');
const {
    generarPlantillaConfirmacionAdminHtml,
    generarPlantillaConfirmacionHuespedHtml,
} = require('../services/plantillasEmailTemplates');

module.exports = (db) => {
    const router = express.Router();

    /** Catálogo de etiquetas [TAG] que el motor sustituye (misma lista que usa la IA y el modal SPA). */
    router.get('/etiquetas-motor', (req, res) => {
        res.status(200).json(ETIQUETAS_CATALOGO);
    });

    // --- Rutas para Tipos de Plantilla ---
    router.post('/tipos', async (req, res) => {
        try {
            const nuevoTipo = await crearTipoPlantilla(db, req.user.empresaId, req.body);
            res.status(201).json(nuevoTipo);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    router.get('/tipos', async (req, res) => {
        try {
            const tipos = await obtenerTiposPlantilla(db, req.user.empresaId);
            res.status(200).json(tipos);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    router.put('/tipos/:id', async (req, res) => {
        try {
            const tipoActualizado = await actualizarTipoPlantilla(db, req.user.empresaId, req.params.id, req.body);
            res.status(200).json(tipoActualizado);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    router.delete('/tipos/:id', async (req, res) => {
        try {
            await eliminarTipoPlantilla(db, req.user.empresaId, req.params.id);
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // --- Rutas para Plantillas de Mensajes ---
    router.post('/generar-ia', async (req, res) => {
        try {
            const out = await generarPlantillaConIa(db, req.user.empresaId, req.body || {});
            res.status(200).json(out);
        } catch (error) {
            const code = error.code === 'AI_INJECTION_DETECTED' ? 400 : 500;
            res.status(code).json({ error: error.message || 'Error al generar con IA' });
        }
    });

    /**
     * Vista previa del correo: sustituye [TAG] con datos de ejemplo (reserva ficticia multipropiedad + cupón).
     */
    router.post('/vista-previa', async (req, res) => {
        try {
            const empresaId = req.user.empresaId;
            let texto = String(req.body?.texto ?? '');
            let asunto = String(req.body?.asunto ?? '');
            const tipoNombre = String(req.body?.tipoNombre ?? '');
            const nombreBorrador = String(req.body?.nombreBorrador ?? '');
            const instruccionesTarjetas = String(req.body?.instruccionesTarjetas ?? '');
            const modoPlantilla = inferirModoPlantilla(`${tipoNombre} ${nombreBorrador}`);
            if (modoPlantilla === 'huesped_confirmacion' || modoPlantilla === 'admin_confirmacion_reserva') {
                const fixed = modoPlantilla === 'admin_confirmacion_reserva'
                    ? generarPlantillaConfirmacionAdminHtml({ nombreEmpresa: '', instruccionesTarjetas })
                    : generarPlantillaConfirmacionHuespedHtml({
                        nombreEmpresa: '',
                        instruccionesTarjetas,
                    });
                texto = fixed.texto;
                if (!asunto.trim()) asunto = fixed.asunto;
            }
            if (!texto.trim()) {
                return res.status(400).json({ error: 'Escribe o genera el contenido del mensaje antes de previsualizar.' });
            }
            const mockMeta = {
                precioCheckoutVerificado: {
                    porPropiedad: [
                        { nombre: 'Cabaña Ejemplo A', totalCLP: 60000 },
                        { nombre: 'Cabaña Ejemplo B', totalCLP: 45000 },
                    ],
                    recargoMenoresCamasCLP: 5000,
                    subtotalListaCLP: 110000,
                },
                reservaWebGrupo: {
                    propiedadIds: [
                        '00000000-0000-4000-8000-0000000000a1',
                        '00000000-0000-4000-8000-0000000000a2',
                    ],
                    alojamientosNombres: ['Cabaña Ejemplo A', 'Cabaña Ejemplo B'],
                },
            };
            const mockRow = {
                id: '00000000-0000-4000-8000-000000000099',
                id_reserva_canal: 'app-12052026-001',
                cliente_id: null,
                propiedad_id: '00000000-0000-4000-8000-0000000000a1',
                alojamiento_nombre: 'Cabaña Ejemplo A + Cabaña Ejemplo B',
                fecha_llegada: '2026-08-10',
                fecha_salida: '2026-08-12',
                total_noches: 2,
                cantidad_huespedes: 3,
                valores: { valorHuesped: 100000, descuentoCupon: 10000, valorTotal: 84034, iva: 15966 },
                metadata: mockMeta,
                canal_nombre: 'Sitio web',
            };
            const vars = await construirVariablesDesdeReserva(empresaId, mockRow, {
                clienteNombre: 'Alex R.',
                clienteEmail: 'huesped.ejemplo@correo.cl',
                clienteTelefono: '+56 9 8888 7777',
                comentariosHuesped: 'Llegada estimada 21:00 (ejemplo de vista previa).',
                canalNombre: 'Sitio web',
            });
            const textoProc = reemplazarEtiquetasEnTexto(texto, vars);
            const asuntoProc = reemplazarEtiquetasEnTexto(asunto, vars);
            const html = renderCuerpoPlantillaHtml(textoProc, { cuerpoEsHtml: false });
            res.status(200).json({
                html,
                asunto: asuntoProc,
                nota: 'Datos de ejemplo: reserva de dos alojamientos, cupón y totales ficticios.',
            });
        } catch (error) {
            res.status(500).json({ error: error.message || 'Error al generar vista previa' });
        }
    });

    router.post('/', async (req, res) => {
        try {
            const nuevaPlantilla = await crearPlantilla(db, req.user.empresaId, req.body);
            res.status(201).json(nuevaPlantilla);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    router.get('/', async (req, res) => {
        try {
            const plantillas = await obtenerPlantillasPorEmpresa(db, req.user.empresaId);
            res.status(200).json(plantillas);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    router.put('/:id', async (req, res) => {
        try {
            const plantillaActualizada = await actualizarPlantilla(db, req.user.empresaId, req.params.id, req.body);
            res.status(200).json(plantillaActualizada);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    router.delete('/:id', async (req, res) => {
        try {
            await eliminarPlantilla(db, req.user.empresaId, req.params.id);
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
};