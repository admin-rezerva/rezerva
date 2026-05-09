/**
 * URL absoluta https para <img src> en SSR público (Firebase Storage, gs://, path al bucket).
 */

function normalizeWebsiteImageUrl(rawUrl) {
    const raw = String(rawUrl || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;

    if (/^gs:\/\//i.test(raw)) {
        const withoutProto = raw.replace(/^gs:\/\//i, '');
        const firstSlash = withoutProto.indexOf('/');
        if (firstSlash > 0) {
            const bucket = withoutProto.slice(0, firstSlash);
            const objectPath = withoutProto.slice(firstSlash + 1);
            return `https://storage.googleapis.com/${bucket}/${encodeURI(objectPath)}`;
        }
    }

    if (!raw.includes('://') && !raw.startsWith('/')) {
        const bucket =
            String(process.env.FIREBASE_STORAGE_BUCKET || process.env.GCLOUD_STORAGE_BUCKET || '').trim();
        if (bucket) return `https://storage.googleapis.com/${bucket}/${encodeURI(raw)}`;
    }

    return raw;
}

module.exports = { normalizeWebsiteImageUrl };
