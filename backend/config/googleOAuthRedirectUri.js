/**
 * URI de callback OAuth (Google Contacts / panel). Debe coincidir exactamente con
 * una entrada en Google Cloud Console → Cliente OAuth → URIs de redireccionamiento.
 */
const { getPanelPublicOrigin } = require('./platformPublic');

/**
 * @param {{ redirect_uris?: string[] }} credentialsWeb — credentials.web del JSON de Google
 * @returns {string}
 */
function resolveGoogleOAuthRedirectUri(credentialsWeb) {
    let explicit = String(process.env.GOOGLE_OAUTH_REDIRECT_URI || '').trim().replace(/^['"]+|['"]+$/g, '');
    if (explicit && !/^[a-z][a-z0-9+.-]*:\/\//i.test(explicit)) {
        explicit = `https://${explicit}`;
    }
    if (explicit) {
        try {
            return new URL(explicit).href;
        } catch {
            /* continuar */
        }
    }

    const pathRaw = String(process.env.GOOGLE_OAUTH_CALLBACK_PATH || '/api/auth/google/callback').trim();
    const pathname = pathRaw.startsWith('/') ? pathRaw : `/${pathRaw}`;

    const origin = getPanelPublicOrigin();
    if (origin) {
        return `${origin.replace(/\/$/, '')}${pathname}`;
    }

    const uris = credentialsWeb && Array.isArray(credentialsWeb.redirect_uris) ? credentialsWeb.redirect_uris : [];
    if (uris[0]) return String(uris[0]).trim();

    return '';
}

module.exports = { resolveGoogleOAuthRedirectUri };
