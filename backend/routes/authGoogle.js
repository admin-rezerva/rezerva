// backend/routes/authGoogle.js
const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const pool = require('../db/postgres');
const { resolveGoogleOAuthRedirectUri } = require('../config/googleOAuthRedirectUri');
const { getPanelPublicOrigin } = require('../config/platformPublic');

/**
 * Origen público según la petición (proxy / Render). Usa X-Forwarded-Host si existe.
 * Prioridad: mismo host que el callback → no se pierde la cookie de sesión JWT.
 */
function panelOriginFromRequest(req) {
    const hostRaw = String(req.get('x-forwarded-host') || req.get('host') || '').trim();
    const host = hostRaw.split(',')[0].trim();
    if (!host) return '';
    let rawProto = String(req.get('x-forwarded-proto') || req.protocol || 'https').trim();
    const proto = rawProto.split(',')[0].trim() || 'https';
    try {
        // eslint-disable-next-line no-new
        new URL(`${proto}://${host}`);
    } catch {
        return '';
    }
    return `${proto}://${host}`;
}

let credentials;
try {
    credentials = process.env.RENDER
        ? require('/etc/secrets/google_credentials.json')
        : require('../google_credentials.json');
} catch (error) {
    console.error('CRITICAL: No se pudieron cargar credenciales de Google.', error.message);
}

const SCOPES = [
    'https://www.googleapis.com/auth/contacts'
];

/**
 * @returns {{ publicRouter: import('express').Router, privateRouter: import('express').Router, handleCallback: import('express').RequestHandler }}
 */
module.exports = function createAuthGoogle(_db) {
    const noopPublic = express.Router();
    const noopPrivate = express.Router();
    const svcDown = (req, res) => {
        const msg = 'Google OAuth no está configurado en el servidor.';
        if (req.path.includes('callback') && req.method === 'GET') {
            return res.status(503).send(msg);
        }
        return res.status(503).json({ error: msg });
    };
    noopPublic.get('/callback', svcDown);
    noopPrivate.get('/authorize', svcDown);
    noopPrivate.get('/status', svcDown);

    if (!credentials) {
        return {
            publicRouter: noopPublic,
            privateRouter: noopPrivate,
            handleCallback: svcDown,
        };
    }

    const { client_secret, client_id } = credentials.web;
    const redirectUri = resolveGoogleOAuthRedirectUri(credentials.web);
    if (!redirectUri) {
        console.error('[authGoogle] No hay redirect URI (configura PANEL_PUBLIC_ORIGIN / GOOGLE_OAUTH_REDIRECT_URI o redirect_uris en JSON).');
    }
    const oauth2Client = new OAuth2Client(client_id, client_secret, redirectUri || credentials.web.redirect_uris[0]);

    async function handleCallback(req, res) {
        const { code, state: empresaId } = req.query;
        if (!code || !empresaId) {
            return res.status(400).send('Faltan parámetros de autorización.');
        }
        if (!pool) {
            console.error('[authGoogle] callback sin pool PostgreSQL');
            return res.status(503).send(
                'No hay base de datos PostgreSQL configurada; no se puede guardar el token de Google. Revisa DATABASE_URL en el servidor.'
            );
        }
        try {
            const { tokens } = await oauth2Client.getToken(code);
            if (!tokens.refresh_token) {
                return res.status(400).send('No se recibió refresh token. Intenta de nuevo con prompt=consent.');
            }

            const upd = await pool.query(`
                    UPDATE empresas
                    SET google_refresh_token = $1, google_auth_date = NOW()
                    WHERE id = $2
                `, [tokens.refresh_token, empresaId]);
            if (upd.rowCount === 0) {
                console.warn(`[authGoogle] UPDATE 0 filas: empresa id no coincide en PostgreSQL (state=${empresaId}).`);
            }

            const fromReq = panelOriginFromRequest(req);
            const fromEnv = getPanelPublicOrigin();
            const panelOrigin = fromReq || fromEnv;
            if (panelOrigin) {
                const back = `${panelOrigin.replace(/\/$/, '')}/autorizar-google?google=ok`;
                console.log(`[authGoogle] redirect post-OAuth → ${back}`);
                return res.redirect(302, back);
            }
            console.warn('[authGoogle] Sin origen para redirect (host/forwarded-host vacío y PANEL_PUBLIC_ORIGIN / RENDER_EXTERNAL_URL inválidos).');
            res.send('¡Autorización completada! Puedes cerrar esta ventana.');
        } catch (err) {
            console.error('[authGoogle] Error al obtener token:', err.message);
            res.status(500).send('Error al procesar la autorización de Google.');
        }
    }

    const publicRouter = express.Router();
    publicRouter.get('/callback', handleCallback);

    const privateRouter = express.Router();
    privateRouter.get('/authorize', (req, res) => {
        if (!req.user?.empresaId) {
            return res.status(401).json({ error: 'No autenticado' });
        }
        const { empresaId } = req.user;
        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
            prompt: 'consent',
            state: empresaId
        });
        res.status(200).json({ url: authUrl });
    });

    privateRouter.get('/status', async (req, res) => {
        if (!req.user?.empresaId) {
            return res.status(401).json({ error: 'No autenticado' });
        }
        if (!pool) {
            return res.status(503).json({ error: 'PostgreSQL no disponible' });
        }
        try {
            const { rows } = await pool.query(
                'SELECT google_refresh_token, google_auth_date FROM empresas WHERE id = $1',
                [req.user.empresaId]
            );
            const row = rows[0];
            const tieneToken = !!(row && row.google_refresh_token);
            res.json({
                autorizado: tieneToken,
                fechaAuth: row?.google_auth_date || null
            });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    return {
        publicRouter,
        privateRouter,
        handleCallback,
    };
};
