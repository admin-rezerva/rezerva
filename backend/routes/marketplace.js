// backend/routes/marketplace.js
// Rutas del marketplace público rezerva.cl — completamente aisladas del SSR empresa
const express = require('express');
const cors = require('cors');
const {
    obtenerPropiedadesParaMarketplace,
    obtenerDestacados,
    PLATFORM_DOMAIN,
} = require('../services/marketplaceService');
const { generarLlmsTxt } = require('../services/marketplace.seo.js');
const {
    resolveMarketplaceLang,
    getMarketplaceStrings,
    buildMarketplaceQueryBase,
    buildMarketplaceSeoUrls,
    precioDesdeToSchemaPriceRange,
} = require('../services/marketplaceUiStrings');
const { sendMarketplaceSearchJson } = require('./marketplaceSearchJson.handler');
const { getPartnerCatalogItems } = require('../services/googleHotelsPartner/googleHotelsPartnerFeeds');

const IS_PROD = !!process.env.RENDER;

const createMarketplaceRouter = (_db) => {
    const router = express.Router();

    // HTML marketplace: sin caché agresivo (Cloudflare/navegador suelen retener EJS viejo).
    // mpAssetV busting en logos/favicon cuando hay RENDER_GIT_COMMIT en Render.
    router.use((req, res, next) => {
        const v = String(process.env.RENDER_GIT_COMMIT || '').trim().slice(0, 12);
        res.locals.mpAssetV = v || `t${Math.floor(Date.now() / 3_600_000)}`;
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        next();
    });

    // ── API JSON pública (para IA y terceros) ──────────────────────────────
    router.get('/api/search.json', cors(), sendMarketplaceSearchJson);

    // ── llms.txt dinámico ──────────────────────────────────────────────────
    router.get('/llms.txt', async (req, res) => {
        try {
            const propiedades = await obtenerPropiedadesParaMarketplace({ limit: 5 });
            res.type('text/plain').send(generarLlmsTxt(propiedades));
        } catch (err) {
            res.type('text/plain').send(generarLlmsTxt([]));
        }
    });

    // ── Redirect a propiedad (dev y prod) ──────────────────────────────────
    router.get('/ir', (req, res) => {
        const { s: subdominio, id } = req.query;
        if (!subdominio || !id) return res.redirect('/');
        const sub = subdominio.toLowerCase();
        if (IS_PROD) {
            return res.redirect(`https://${sub}.${PLATFORM_DOMAIN}/propiedad/${id}`);
        }
        const base = `${req.protocol}://${req.get('host')}`;
        res.redirect(`${base}/propiedad/${id}?force_host=${sub}.${PLATFORM_DOMAIN}`);
    });

    // ── Google Hotels partner catalog (§7.6 — misma elegibilidad que Property List feed) ──
    router.get('/google-hotels', async (req, res) => {
        const mpLang = resolveMarketplaceLang(req);
        const mp = getMarketplaceStrings(mpLang);
        try {
            const { items, postgresRequired } = await getPartnerCatalogItems();
            const protocol = req.protocol || 'https';
            const host = req.get('host') || '';
            const canonicalUrl = `${protocol}://${host}/google-hotels${mp.htmlLang === 'en' ? '?lang=en' : ''}`;
            const hreflangEsUrl = `${protocol}://${host}/google-hotels`;
            const hreflangEnUrl = `${protocol}://${host}/google-hotels?lang=en`;
            const mpHomeUrl = mp.htmlLang === 'en' ? '/?lang=en' : '/';
            const marketplaceHomeAbsoluteUrl = `${protocol}://${host}${mpHomeUrl}`;
            const marketplaceBrandImageUrl = `${protocol}://${host}/public/branding/og-default.png`;
            const ogImage = items.length > 0 && items[0].fotoUrl ? items[0].fotoUrl : marketplaceBrandImageUrl;
            const ogImageUsesBrandAsset = !(items.length > 0 && items[0].fotoUrl);

            res.render('marketplace/google-hotels-catalog', {
                items,
                postgresRequired,
                mp,
                platformDomain: PLATFORM_DOMAIN,
                canonicalUrl,
                hreflangEsUrl,
                hreflangEnUrl,
                mpHomeUrl,
                marketplaceHomeAbsoluteUrl,
                marketplaceBrandImageUrl,
                ogImageUsesBrandAsset,
                ogImage,
            });
        } catch (err) {
            console.error('[Marketplace] /google-hotels:', err);
            res.status(500).send(mp.ghCatalogErrorLoad);
        }
    });

    // ── Homepage ───────────────────────────────────────────────────────────
    router.get('/', async (req, res) => {
        try {
            const { q = '', personas = '', fecha_in = '', fecha_out = '', sort = '' } = req.query;
            const personasNum = parseInt(personas) || 0;
            const fechaIn = fecha_in.match(/^\d{4}-\d{2}-\d{2}$/) ? fecha_in : null;
            const fechaOut = fecha_out.match(/^\d{4}-\d{2}-\d{2}$/) ? fecha_out : null;
            const hayBusqueda = q.trim().length > 0 || personasNum > 0 || (fechaIn && fechaOut);

            const [propiedades, destacadosRaw] = await Promise.all([
                obtenerPropiedadesParaMarketplace({ busqueda: q.trim(), personas: personasNum, fechaIn, fechaOut, sort: sort || null }),
                hayBusqueda ? Promise.resolve([]) : obtenerDestacados(5),
            ]);

            let destacados = destacadosRaw;
            if (!hayBusqueda && destacados.length < 5) {
                const seen = new Set(destacados.map((d) => d.id));
                const extras = await obtenerPropiedadesParaMarketplace({ limit: 16, sort: 'rating' });
                for (const p of extras) {
                    if (destacados.length >= 5) break;
                    if (!seen.has(p.id)) {
                        seen.add(p.id);
                        destacados.push(p);
                    }
                }
            }

            const mpLang = resolveMarketplaceLang(req);
            const mp = getMarketplaceStrings(mpLang);
            const qBase = buildMarketplaceQueryBase({
                busqueda: q.trim(),
                personas: personasNum,
                fechaIn,
                fechaOut,
                sort: sort || null,
            });
            const pathEs = qBase.toString() ? `/?${qBase.toString()}` : '/';
            const qEn = new URLSearchParams(qBase);
            qEn.set('lang', 'en');
            const pathEn = qEn.toString() ? `/?${qEn.toString()}` : '/?lang=en';
            const seo = buildMarketplaceSeoUrls(req, {
                busqueda: q.trim(),
                personas: personasNum,
                fechaIn,
                fechaOut,
                sort: sort || null,
                htmlLang: mp.htmlLang,
            });
            const mpHomeUrl = mp.htmlLang === 'en' ? '/?lang=en' : '/';
            const protocol = req.protocol || 'https';
            const reqHost = req.get('host') || '';
            const marketplaceBrandImageUrl = reqHost ? `${protocol}://${reqHost}/public/branding/og-default.png` : '';
            const ogImageUsesBrandAsset = !(propiedades.length > 0 && propiedades[0].fotoUrl);

            res.render('marketplace/index', {
                propiedades,
                destacados,
                busqueda: q.trim(),
                personas: personasNum,
                fechaIn: fechaIn || '',
                fechaOut: fechaOut || '',
                sort: sort || '',
                hayBusqueda,
                platformDomain: PLATFORM_DOMAIN,
                totalResultados: propiedades.length,
                mp,
                mpLinkEs: pathEs,
                mpLinkEn: pathEn,
                canonicalUrl: seo.canonicalUrl,
                hreflangEsUrl: seo.hreflangEsUrl,
                hreflangEnUrl: seo.hreflangEnUrl,
                mpHomeUrl,
                marketplaceBrandImageUrl,
                ogImageUsesBrandAsset,
                precioDesdeToSchemaPriceRange,
            });
        } catch (err) {
            console.error('[Marketplace] Error en homepage:', err);
            res.status(500).send('Error cargando el marketplace');
        }
    });

    return router;
};

module.exports = { createMarketplaceRouter };
