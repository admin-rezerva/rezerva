const { GoogleGenerativeAI } = require('@google/generative-ai');

let GENERATIVE_AI_PKG_VERSION = 'unknown';
try {
    // eslint-disable-next-line import/no-extraneous-dependencies, global-require
    GENERATIVE_AI_PKG_VERSION = require('@google/generative-ai/package.json').version;
} catch {
    /* noop */
}

/** Fallback manual si ListModels falla o está vacío (ids cortos). */
const FALLBACK_SHORT_MODEL_IDS = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
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

async function fetchGenerativeLanguageModelsList(apiKey, apiVersion) {
    const ver = apiVersion || 'v1beta';
    const url = `https://generativelanguage.googleapis.com/${ver}/models?pageSize=100&key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) {
        const msg = (data && data.error && data.error.message) || JSON.stringify(data).slice(0, 400);
        throw new Error(`ListModels ${res.status}: ${msg}`);
    }
    return data;
}

function resolveApiVersionsToTry() {
    const pinned = process.env.GEMINI_API_VERSION && String(process.env.GEMINI_API_VERSION).trim();
    if (pinned) return [pinned];
    return ['v1beta', 'v1'];
}

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
                `[GeminiProvider] init @google/generative-ai@${GENERATIVE_AI_PKG_VERSION} candidates=[${this._candidateShortIds.join(', ')}] apiVersion=${this._requestOptions.apiVersion} · GEMINI_API_VERSION ${process.env.GEMINI_API_VERSION ? `fijada=${process.env.GEMINI_API_VERSION}` : 'libre → se probarán v1beta y v1'}`,
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

        const discoveredShort = [];

        for (const ver of ['v1beta', 'v1']) {
            try {
                const data = await fetchGenerativeLanguageModelsList(this._apiKey, ver);
                const models = data.models || [];
                console.log(`[GeminiProvider] ListModels (${ver}): ${models.length} modelos (página 1)`);
                for (const m of models) {
                    const name = m.name || '';
                    const methods = Array.isArray(m.supportedGenerationMethods)
                        ? m.supportedGenerationMethods
                        : [];
                    const okGen = methods.includes('generateContent');
                    console.log(
                        `  · ${name}  generateContent=${okGen ? 'sí' : 'no'}  [${methods.join(', ') || '—'}]`,
                    );
                    if (!okGen) continue;
                    const short = stripLeadingModelsPrefix(name);
                    if (short && !discoveredShort.includes(short)) discoveredShort.push(short);
                }
            } catch (e) {
                console.warn(`[GeminiProvider] ListModels (${ver}) falló:`, e && e.message ? e.message : e);
            }
        }

        if (discoveredShort.length > 0) {
            const merged = [
                ...discoveredShort,
                ...this._candidateShortIds.filter((id) => !discoveredShort.includes(id)),
            ];
            this._candidateShortIds = merged;
            console.log(
                `[GeminiProvider] Orden de candidatos (API primero): ${merged.join(', ')}`,
            );
            this._installModelForIndex(0);
        } else {
            console.warn(
                '[GeminiProvider] ListModels no devolvió modelos con generateContent en v1beta ni v1. Comprueba API key (AI Studio), Generative Language API habilitada en GCP y facturación.',
            );
        }
    }

    async generateVisionJSON(promptText, imageUrls = []) {
        if (!this.model) return null;

        await this._runDiagnosticsOnce();

        const versionsToTry = resolveApiVersionsToTry();

        visionOuter: for (const ver of versionsToTry) {
            this._requestOptions = Object.assign({}, this._requestOptions, { apiVersion: ver });
            console.warn(`[GeminiProvider] Vision === apiVersion REST ${ver} (${this._candidateShortIds.length} modelos) ===`);
            this._installModelForIndex(0);

            for (let attempt = 0; attempt < this._candidateShortIds.length; attempt++) {
                if (attempt > 0) {
                    console.warn(
                        `[GeminiProvider] Vision 404 → modelo ${attempt + 1}/${this._candidateShortIds.length}: ${this._candidateShortIds[attempt]}`,
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
                    if (is404ModelNotFound(error)) {
                        if (attempt < this._candidateShortIds.length - 1) continue;
                        console.warn(`[GeminiProvider] Vision: agotados modelos para apiVersion=${ver}`);
                        continue visionOuter;
                    }
                    console.error(`❌ [GeminiProvider] Vision Error:`, msg);
                    return null;
                }
            }
        }
        console.error('[GeminiProvider] Vision: sin respuesta en todas las combinaciones api×modelo.');
        return null;
    }

    async generateJSON(promptText) {
        if (!this.model) {
            console.error('❌ [GeminiProvider] Model not initialized.');
            return null;
        }

        await this._runDiagnosticsOnce();

        const versionsToTry = resolveApiVersionsToTry();
        let textResult = null;

        versionOuter: for (const ver of versionsToTry) {
            this._requestOptions = Object.assign({}, this._requestOptions, { apiVersion: ver });
            console.warn(
                `[GeminiProvider] === apiVersion REST ${ver} · ${this._candidateShortIds.length} modelos ===`,
            );
            this._installModelForIndex(0);

            for (let attempt = 0; attempt < this._candidateShortIds.length; attempt++) {
                if (attempt > 0) {
                    console.warn(
                        `[GeminiProvider] 404 → modelo alternativo (${attempt + 1}/${this._candidateShortIds.length}): ${this._candidateShortIds[attempt]}`,
                    );
                    this._installModelForIndex(attempt);
                }

                try {
                    console.log(
                        `[GeminiProvider] 🚀 Generating content (modelo=${this.currentShortModelId} api=${ver})...`,
                    );
                    const result = await this.model.generateContent(promptText);
                    const response = await result.response;
                    textResult = response.text();
                    console.log(`[GeminiProvider] ✅ Response received (${textResult.length} chars).`);
                    break versionOuter;
                } catch (error) {
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

                    if (is404ModelNotFound(error)) {
                        if (attempt < this._candidateShortIds.length - 1) {
                            console.warn('[GeminiProvider] 404 modelo — probando siguiente candidato.');
                            continue;
                        }
                        console.warn(`[GeminiProvider] 404: agotados todos los modelos para apiVersion=${ver}`);
                        continue versionOuter;
                    }

                    console.error('❌ [GeminiProvider] Generate Error:', msg);
                    const fs = require('fs');
                    fs.writeFileSync('debug_error_provider.txt', `Error: ${msg}\nStack: ${error.stack}`);
                    return null;
                }
            }
        }

        if (textResult == null) {
            console.error(
                '[GeminiProvider] Sin éxito: probadas todas las combinaciones apiVersion × modelo. '
                    + 'Si GEMINI_API_VERSION está definida en Render, quítala para intentar v1beta y v1. '
                    + 'Verifica que la key sea de https://aistudio.google.com/apikey y que en GCP esté habilitada “Generative Language API”.',
            );
            return null;
        }

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
