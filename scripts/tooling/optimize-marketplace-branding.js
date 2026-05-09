/**
 * Genera variantes optimizadas del logo y favicon del marketplace para /public/branding.
 * Fuente: local/Logo (o local/logo). Requiere: backend/node_modules/sharp
 *
 * Logos UI: ancho máx. acotado + WebP + AVIF + PNG (paleta solo en fondo blanco plano).
 * El PNG fuente puede ser muy pesado; siempre se re-muestrea (nunca se copia tal cual).
 *
 * Uso (desde la raíz del repo): node scripts/tooling/optimize-marketplace-branding.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const OUT_DIR = path.join(ROOT, 'backend', 'public', 'branding');

/** Ancho máximo en UI (header ~34px alto × DPR 2 ≈ suficiente; wordmark ancho) */
const LOGO_UI_MAX_W = 400;

function resolveLocalLogoDir() {
    const a = path.join(ROOT, 'local', 'Logo');
    const b = path.join(ROOT, 'local', 'logo');
    if (fs.existsSync(a)) return a;
    if (fs.existsSync(b)) return b;
    throw new Error('No se encontró local/Logo ni local/logo');
}

async function main() {
    const sharp = require(path.join(ROOT, 'backend', 'node_modules', 'sharp'));
    const dir = resolveLocalLogoDir();

    const src = {
        logoBg: path.join(dir, 'logo rezerva fondo blanco.png'),
        logoTr: path.join(dir, 'logo rezerva sin fondo.png'),
        favBg: path.join(dir, 'favi ico rezerva fondo blanco.png'),
        favTr: path.join(dir, 'favi ico rezerva sin fondo.png'),
    };
    for (const [k, p] of Object.entries(src)) {
        if (!fs.existsSync(p)) throw new Error(`Falta archivo: ${p} (${k})`);
    }

    if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

    const manifest = { generatedAt: new Date().toISOString(), assets: {} };

    /**
     * @param {string} baseName
     * @param {string} inputPath
     * @param {number} maxW
     * @param {{ pngPalette?: boolean, webpQuality?: number, avifQuality?: number }} opts
     */
    async function writeLogoDerivatives(baseName, inputPath, maxW, opts = {}) {
        const {
            pngPalette = false,
            webpQuality = 82,
            avifQuality = 62,
        } = opts;

        const pipelineBase = sharp(inputPath)
            .rotate()
            .resize({
                width: maxW,
                fit: 'inside',
                withoutEnlargement: true,
            });

        const pngOptions = {
            compressionLevel: 9,
            adaptiveFiltering: !pngPalette,
            palette: pngPalette,
            effort: pngPalette ? 10 : 7,
        };

        const [pngBuf, webpBuf, avifBuf] = await Promise.all([
            pipelineBase.clone().png(pngOptions).toBuffer(),
            pipelineBase.clone().webp({ quality: webpQuality, effort: 6, alphaQuality: 90 }).toBuffer(),
            pipelineBase.clone().avif({ quality: avifQuality, effort: 5 }).toBuffer(),
        ]);

        const pngPath = path.join(OUT_DIR, `${baseName}.png`);
        const webpPath = path.join(OUT_DIR, `${baseName}.webp`);
        const avifPath = path.join(OUT_DIR, `${baseName}.avif`);
        fs.writeFileSync(pngPath, pngBuf);
        fs.writeFileSync(webpPath, webpBuf);
        fs.writeFileSync(avifPath, avifBuf);

        const meta = await sharp(pngBuf).metadata();
        manifest.assets[baseName] = {
            png: `${baseName}.png`,
            webp: `${baseName}.webp`,
            avif: `${baseName}.avif`,
            width: meta.width,
            height: meta.height,
            bytes: { png: pngBuf.length, webp: webpBuf.length, avif: avifBuf.length },
        };
    }

    await writeLogoDerivatives('logo-bg-white', src.logoBg, LOGO_UI_MAX_W, {
        pngPalette: true,
        webpQuality: 80,
        avifQuality: 58,
    });
    await writeLogoDerivatives('logo-transparent', src.logoTr, LOGO_UI_MAX_W, {
        pngPalette: false,
        webpQuality: 82,
        avifQuality: 60,
    });

    async function writeSquareIcon(baseName, inputPath, size) {
        const buf = await sharp(inputPath)
            .rotate()
            .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .png({ compressionLevel: 9, palette: true, effort: 10 })
            .toBuffer();
        const out = path.join(OUT_DIR, `${baseName}.png`);
        fs.writeFileSync(out, buf);
        manifest.assets[baseName] = { png: `${baseName}.png`, size };
    }

    await writeSquareIcon('favicon-bg-white-32', src.favBg, 32);
    await writeSquareIcon('favicon-bg-white-48', src.favBg, 48);
    await writeSquareIcon('favicon-transparent-32', src.favTr, 32);
    await writeSquareIcon('favicon-transparent-48', src.favTr, 48);

    async function writeAppleTouch(baseName, inputPath, bgRgb) {
        const inner = await sharp(inputPath)
            .rotate()
            .resize(140, 140, { fit: 'contain', background: bgRgb })
            .png({ compressionLevel: 9, palette: true, effort: 10 })
            .toBuffer();
        const canvas = sharp({
            create: {
                width: 180,
                height: 180,
                channels: 4,
                background: bgRgb,
            },
        })
            .composite([{ input: inner, gravity: 'center' }])
            .png({ compressionLevel: 9 });

        const buf = await canvas.toBuffer();
        fs.writeFileSync(path.join(OUT_DIR, `${baseName}.png`), buf);
        manifest.assets[baseName] = { png: `${baseName}.png`, size: 180 };
    }

    await writeAppleTouch('apple-touch-icon-bg-white', src.favBg, { r: 255, g: 255, b: 255, alpha: 1 });
    await writeAppleTouch('apple-touch-icon-transparent', src.favTr, { r: 255, g: 255, b: 255, alpha: 1 });

    const OG_W = 1200;
    const OG_H = 630;
    const ogBg = { r: 255, g: 255, b: 255 };
    const logoForOg = await sharp(src.logoBg)
        .rotate()
        .resize({ width: Math.round(OG_W * 0.5), fit: 'inside', withoutEnlargement: true })
        .png({ compressionLevel: 9, palette: true, effort: 10 })
        .toBuffer();

    const ogMeta = await sharp(logoForOg).metadata();
    const ox = Math.round((OG_W - ogMeta.width) / 2);
    const oy = Math.round((OG_H - ogMeta.height) / 2);

    const ogPngBuf = await sharp({
        create: {
            width: OG_W,
            height: OG_H,
            channels: 3,
            background: ogBg,
        },
    })
        .composite([{ input: logoForOg, left: ox, top: oy }])
        .png({ compressionLevel: 9, adaptiveFiltering: true })
        .toBuffer();

    const ogWebpBuf = await sharp(ogPngBuf).webp({ quality: 85, effort: 6 }).toBuffer();
    const ogAvifBuf = await sharp(ogPngBuf).avif({ quality: 55, effort: 4 }).toBuffer();

    fs.writeFileSync(path.join(OUT_DIR, 'og-default.png'), ogPngBuf);
    fs.writeFileSync(path.join(OUT_DIR, 'og-default.webp'), ogWebpBuf);
    fs.writeFileSync(path.join(OUT_DIR, 'og-default.avif'), ogAvifBuf);
    manifest.assets['og-default'] = {
        png: 'og-default.png',
        webp: 'og-default.webp',
        avif: 'og-default.avif',
        width: OG_W,
        height: OG_H,
    };

    fs.writeFileSync(path.join(OUT_DIR, 'build-manifest.json'), JSON.stringify(manifest, null, 2));

    const lines = ['Optimización marketplace branding OK:', OUT_DIR];
    for (const f of fs.readdirSync(OUT_DIR)) {
        const fp = path.join(OUT_DIR, f);
        if (fs.statSync(fp).isFile() && !f.endsWith('.json')) {
            lines.push(`  ${f}  (${Math.round(fs.statSync(fp).size / 1024)} KB)`);
        }
    }
    console.log(lines.join('\n'));
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
