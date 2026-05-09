const { GoogleGenerativeAI } = require('@google/generative-ai');

let GENERATIVE_AI_PKG_VERSION = 'unknown';
try {
    // eslint-disable-next-line import/no-extraneous-dependencies, global-require
    GENERATIVE_AI_PKG_VERSION = require('@google/generative-ai/package.json').version;
} catch {
    /* noop */
}

/** Orden de fallback si el modelo configurado devuelve 404 (nombre corto; el SDK añade `models/`). */
const FALLBACK_SHORT_MODEL_IDS = [
    'gemini-2.0-flash',
    'gemini-1.5-flash-latest',
    'gemini-pro',
    'gemini-1.5-flash',
];

function stripLeadingModelsPrefix(id) {
    let s = String(id || '').trim();
    if (s.startsWith('models/')) s = s.slice('models/'.length).trim();
    return s;
}

function buildModelCandidates(preferredShort) {
    const first = stripLeadingModelsPrefix(preferredShort) || 'gemini-2.0-flash';
    const out = [];
    const seen = new Set();
    for (const id of [first, ...FALLBACK_SHORT_MODEL_IDS]) {
        const x = stripLeadingModelsPrefix(id);
        if (!x || seen.has(x)) continue;
        seen.add(x);
        out.push(x);
    }
    return out;
}

/** Ruta que usa internamente GenerativeModel tras el constructor del SDK. */
function sdkEffectiveModelPath(shortId) {
    if (shortId.includes('/')) return shortId;
    return `models/${shortId}`;
}

function expectedGenerateContentUrl(shortId, apiVersion) {
    const ver = apiVersion || 'v1beta';
    const pathSeg = sdkEffectiveModelPath(shortId);
    return `https://generativelanguage.googleapis.com/${ver}/${pathSeg}:generateContent`;
}

function is404ModelNotFound(err) {
    const m = String(err && err.message ? err.message : err || '');
    return m.includes('404') && (m.includes('not found') || m.includes('Not Found'));
}

/**
 * ListModels REST (el paquete @google/generative-ai no expone genAI.listModels()).
 */
async function fetchGenerativeLanguageModelsList(apiKey, apiVersion) {
    const ver = apiVersion || 'v1beta';
    const url = `https://generativelanguage.googleapis.com/${ver}/models?pageSize=100&key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) {
        const msg = (data && data.error && data.error.message) || JSON.stringify(data).slice(0, 200);
        throw new Error(`ListModels ${res.status}: ${msg}`);
    }
    return data;
}

/**
 * Gemini Provider — pasar solo id corto (p. ej. gemini-2.0-flash). El SDK antepone `models/` si no hay `/` en el nombre.
 */
class GeminiProvider {
    constructor(config) {
        if (!config.apiKey) {
            console.warn('⚠️ [GeminiProvider] No API Key provided.');
            this.model = null;
            return;
        }

        try {
            this._apiKey = String(config.apiKey).trim();
            this.genAI = new GoogleGenerativeAI(this._apiKey);
            this._requestOptions =
                config.requestOptions && typeof config.requestOptions === 'object'
                    ? config.requestOptions
                    : { apiVersion: 'v1beta' };
            const preferred = stripLeadingModelsPrefix(config.model) || 'gemini-2.0-flash';
            this._candidateShortIds = buildModelCandidates(preferred);
            this._activeCandidateIndex = 0;
            this._diagnosticsDone = false;
            this._installModelForIndex(0);
            console.log(
                `[GeminiProvider] init @google/generative-ai@${GENERATIVE_AI_PKG_VERSION} candidates=[${this._candidateShortIds.join(', ')}] apiVersion=${this._requestOptions.apiVersion}`,
            );
        } catch (error) {
            console.error('❌ [GeminiProvider] Init Error:', error);
            this.model = null;
        }
    }

    _installModelForIndex(idx) {
        const shortId = this._candidateShortIds[idx];
        if (!shortId) return;
        this._activeCandidateIndex = idx;
        this.currentShortModelId = shortId;
        this.model = this.genAI.getGenerativeModel({ model: shortId }, this._requestOptions);
        const ver = this._requestOptions.apiVersion || 'v1beta';
        console.log(
            `[GeminiProvider] modelo activo="${shortId}" → URL final (según SDK): ${expectedGenerateContentUrl(shortId, ver)}`,
        );
    }

    async _runDiagnosticsOnce() {
        if (this._diagnosticsDone) return;
        this._diagnosticsDone = true;

        console.log(`[GeminiProvider] Diagnóstico: @google/generative-ai versión npm=${GENERATIVE_AI_PKG_VERSION}`);

        if (process.env.GEMINI_SKIP_LIST_MODELS === '1') {
            console.log('[GeminiProvider] GEMINI_SKIP_LIST_MODELS=1 — ListModels omitido');
            return;
        }

        try {
            const ver = this._requestOptions.apiVersion || 'v1beta';
            const data = await fetchGenerativeLanguageModelsList(this._apiKey, ver);
            const models = data.models || [];
            console.log(`[GeminiProvider] ListModels (${ver}) primera página: ${models.length} modelos`);
            for (const m of models) {
                const name = m.name || '';
                const methods = Array.isArray(m.supportedGenerationMethods)
                    ? m.supportedGenerationMethods.join(', ')
                    : '';
                const okGen = methods.includes('generateContent');
                console.log(`  · ${name}  generateContent=${okGen ? 'sí' : 'no'}  [${methods || '—'}]`);
            }
        } catch (e) {
            console.warn('[GeminiProvider] ListModels falló:', e && e.message ? e.message : e);
        }
    }

    /**
     * @param {string} promptText
     * @param {string[]} imageUrls
     * @returns {Promise<object|null>}
     */
    async generateVisionJSON(promptText, imageUrls = []) {
        if (!this.model) return null;

        await this._runDiagnosticsOnce();

        let lastVisionErr;
        for (let attempt = 0; attempt < this._candidateShortIds.length; attempt++) {
            if (attempt > 0) {
                console.warn(
                    `[GeminiProvider] Vision: reintento ${attempt + 1}/${this._candidateShortIds.length} → ${this._candidateShortIds[attempt]}`,
                );
                this._installModelForIndex(attempt);
            }
            try {
                const imageParts = await Promise.all(
                    imageUrls.map(async (url) => {
                        const res = await fetch(url);
                        if (!res.ok) throw new Error(`Cannot fetch image: ${url}`);
                        const buffer = await res.arrayBuffer();
                        const base64 = Buffer.from(buffer).toString('base64');
                        const mimeType = res.headers.get('content-type') || 'image/jpeg';
                        return { inlineData: { data: base64, mimeType } };
                    }),
                );

                const parts = [...imageParts, { text: promptText }];
                const result = await this.model.generateContent({ contents: [{ role: 'user', parts }] });
                const text = result.response.text();

                let jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
                const firstBrace = jsonString.indexOf('{');
                const lastBrace = jsonString.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace !== -1) {
                    jsonString = jsonString.substring(firstBrace, lastBrace + 1);
                }
                return JSON.parse(jsonString);
            } catch (error) {
                lastVisionErr = error;
                const msg = String(error.message || '');
                if (msg.includes('429') || msg.includes('Quota exceeded')) {
                    const quotaError = new Error('⏳ Cuota de IA excedida.');
                    quotaError.code = 'AI_QUOTA_EXCEEDED';
                    throw quotaError;
                }
                if (msg.includes('403') && (msg.includes('denied access') || msg.includes('Forbidden'))) {
                    console.error(
                        '[GeminiProvider] 403 denied (vision): proyecto Gemini denegado; nueva key en AI Studio.',
                    );
                    return null;
                }
                if (is404ModelNotFound(error) && attempt < this._candidateShortIds.length - 1) {
                    continue;
                }
                console.error(`❌ [GeminiProvider] Vision Error:`, msg);
                return null;
            }
        }
        if (lastVisionErr) console.error(`❌ [GeminiProvider] Vision agotó candidatos:`, lastVisionErr.message);
        return null;
    }

    /**
     * @param {string} promptText
     * @returns {Promise<object|null>}
     */
    async generateJSON(promptText) {
        if (!this.model) {
            console.error('❌ [GeminiProvider] Model not initialized.');
            return null;
        }

        await this._runDiagnosticsOnce();

        let textResult = null;
        let lastErr;

        for (let attempt = 0; attempt < this._candidateShortIds.length; attempt++) {
            if (attempt > 0) {
                console.warn(
                    `[GeminiProvider] 404 / fallback → modelo alternativo (${attempt + 1}/${this._candidateShortIds.length}): ${this._candidateShortIds[attempt]}`,
                );
                this._installModelForIndex(attempt);
            }

            try {
                console.log(`[GeminiProvider] 🚀 Generating content (modelo=${this.currentShortModelId})...`);
                const result = await this.model.generateContent(promptText);
                const response = await result.response;
                textResult = response.text();
                console.log(`[GeminiProvider] ✅ Response received (${textResult.length} chars).`);
                break;
            } catch (error) {
                lastErr = error;
                const msg = String(error.message || '');

                if (msg.includes('429') || msg.includes('Quota exceeded')) {
                    const timeMatch = msg.match(/retry in ([\d\.]+)s/);
                    const waitSeconds = timeMatch ? parseFloat(timeMatch[1]) : 60;
                    const quotaError = new Error(
                        `⏳ Cuota de IA excedida. Por favor espera ${Math.ceil(waitSeconds)} segundos.`,
                    );
                    quotaError.code = 'AI_QUOTA_EXCEEDED';
                    quotaError.retryAfter = Math.ceil(waitSeconds);
                    throw quotaError;
                }

                if (msg.includes('403') && (msg.includes('denied access') || msg.includes('Forbidden'))) {
                    console.error(
                        '[GeminiProvider] 403: proyecto denegado para Gemini. Crear key nueva en https://aistudio.google.com/apikey',
                    );
                    const fs = require('fs');
                    fs.writeFileSync('debug_error_provider.txt', `Error: ${msg}\n`);
                    return null;
                }

                if (is404ModelNotFound(error) && attempt < this._candidateShortIds.length - 1) {
                    console.warn('[GeminiProvider] 404 modelo — probando siguiente candidato.');
                    continue;
                }

                console.error('❌ [GeminiProvider] Generate Error:', msg);
                if (msg.includes('404') && msg.includes('not found')) {
                    console.error(
                        '[GeminiProvider] Ningún candidato coincidió con ListModels para esta key. Revisa logs ListModels arriba.',
                    );
                }
                const fs = require('fs');
                fs.writeFileSync('debug_error_provider.txt', `Error: ${msg}\nStack: ${error.stack}`);
                return null;
            }
        }

        if (textResult == null) return null;

        let jsonString = textResult.replace(/```json/g, '').replace(/```/g, '').trim();
        const firstBrace = jsonString.indexOf('{');
        const lastBrace = jsonString.lastIndexOf('}');

        if (firstBrace !== -1 && lastBrace !== -1) {
            jsonString = jsonString.substring(firstBrace, lastBrace + 1);
        }

        try {
            return JSON.parse(jsonString);
        } catch (parseError) {
            console.warn('⚠️ [GeminiProvider] JSON Parse failed.');
            const fs = require('fs');
            fs.writeFileSync('debug_raw_ai_fail.txt', textResult);
            return null;
        }
    }
}

module.exports = GeminiProvider;
