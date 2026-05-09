/**
 * Genera variantes optimizadas del logo y favicon del marketplace para /public/branding.
 * Fuente: local/Logo (o local/logo). Requiere: backend/node_modules/sharp
 *
 * Uso (desde la raíz del repo): node scripts/tooling/optimize-marketplace-branding.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const OUT_DIR = path.join(ROOT, 'backend', 'public', 'branding');

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

    const LOGO_MAX_W = 360;
    const manifest = { generatedAt: new Date().toISOString(), assets: {} };

    async function writeLogoPair(baseName, inputPath, maxW) {
        const resized = sharp(inputPath).resize({
            width: maxW,
            fit: 'inside',
            withoutEnlargement: true,
        });
        const pngBuf = await resized.clone().png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
        const webpBuf = await sharp(inputPath)
            .resize({ width: maxW, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 86, effort: 6 })
            .toBuffer();

        const pngPath = path.join(OUT_DIR, `${baseName}.png`);
        const webpPath = path.join(OUT_DIR, `${baseName}.webp`);
        fs.writeFileSync(pngPath, pngBuf);
        fs.writeFileSync(webpPath, webpBuf);

        const meta = await sharp(pngBuf).metadata();
        manifest.assets[baseName] = {
            png: `${baseName}.png`,
            webp: `${baseName}.webp`,
            width: meta.width,
            height: meta.height,
        };
    }

    await writeLogoPair('logo-bg-white', src.logoBg, LOGO_MAX_W);
    await writeLogoPair('logo-transparent', src.logoTr, LOGO_MAX_W);

    async function writeSquareIcon(baseName, inputPath, size) {
        const buf = await sharp(inputPath)
            .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .png({ compressionLevel: 9 })
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
            .resize(140, 140, { fit: 'contain', background: bgRgb })
            .png()
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
    const bgRgb = { r: 249, g: 250, b: 251, alpha: 1 };
    const logoForOg = await sharp(src.logoBg)
        .resize({ width: Math.round(OG_W * 0.52), fit: 'inside', withoutEnlargement: true })
        .png()
        .toBuffer();

    const ogMeta = await sharp(logoForOg).metadata();
    const ox = Math.round((OG_W - ogMeta.width) / 2);
    const oy = Math.round((OG_H - ogMeta.height) / 2);

    const ogPngBuf = await sharp({
        create: {
            width: OG_W,
            height: OG_H,
            channels: 3,
            background: { r: bgRgb.r, g: bgRgb.g, b: bgRgb.b },
        },
    })
        .composite([{ input: logoForOg, left: ox, top: oy }])
        .png({ compressionLevel: 9 })
        .toBuffer();

    const ogWebpBuf = await sharp(ogPngBuf).webp({ quality: 88, effort: 6 }).toBuffer();

    fs.writeFileSync(path.join(OUT_DIR, 'og-default.png'), ogPngBuf);
    fs.writeFileSync(path.join(OUT_DIR, 'og-default.webp'), ogWebpBuf);
    manifest.assets['og-default'] = {
        png: 'og-default.png',
        webp: 'og-default.webp',
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
