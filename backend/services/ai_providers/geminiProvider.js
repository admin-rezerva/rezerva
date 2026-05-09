const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * Gemini Provider Adapter
 */
class GeminiProvider {
    constructor(config) {
        if (!config.apiKey) {
            console.warn("⚠️ [GeminiProvider] No API Key provided.");
            this.model = null;
            return;
        }

        try {
            const apiKey = String(config.apiKey).trim();
            this.genAI = new GoogleGenerativeAI(apiKey);
            this.modelName = String(config.model || 'models/gemini-2.0-flash').trim();
            const requestOptions =
                config.requestOptions && typeof config.requestOptions === 'object'
                    ? config.requestOptions
                    : { apiVersion: 'v1beta' };
            this.model = this.genAI.getGenerativeModel({ model: this.modelName }, requestOptions);
            console.log(
                `✅ [GeminiProvider] Initialized model=${this.modelName} apiVersion=${requestOptions.apiVersion}`,
            );
        } catch (error) {
            console.error("❌ [GeminiProvider] Init Error:", error);
            this.model = null;
        }
    }

    /**
     * Analyzes one or more images (by URL) + a text prompt, returns JSON.
     * @param {string} promptText
     * @param {string[]} imageUrls - Array of publicly accessible image URLs
     * @returns {Promise<object|null>}
     */
    async generateVisionJSON(promptText, imageUrls = []) {
        if (!this.model) return null;
        try {
            // Fetch each image and convert to inline base64 part
            const imageParts = await Promise.all(imageUrls.map(async (url) => {
                const res = await fetch(url);
                if (!res.ok) throw new Error(`Cannot fetch image: ${url}`);
                const buffer = await res.arrayBuffer();
                const base64 = Buffer.from(buffer).toString('base64');
                const mimeType = res.headers.get('content-type') || 'image/jpeg';
                return { inlineData: { data: base64, mimeType } };
            }));

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
            console.error(`❌ [GeminiProvider] Vision Error:`, error.message);
            const msg = String(error.message || '');
            if (msg.includes('403') && (msg.includes('denied access') || msg.includes('Forbidden'))) {
                console.error(
                    '[GeminiProvider] 403 denied (vision): mismo caso que generateJSON — proyecto Gemini denegado; nueva key desde AI Studio u otro proyecto.',
                );
            }
            if (error.message.includes('429') || error.message.includes('Quota exceeded')) {
                const quotaError = new Error(`⏳ Cuota de IA excedida.`);
                quotaError.code = 'AI_QUOTA_EXCEEDED';
                throw quotaError;
            }
            return null;
        }
    }

    /**
     * Generates a JSON response from a text prompt.
     * @param {string} promptText
     * @returns {Promise<object|null>} Parsed JSON or null if failed.
     */
    async generateJSON(promptText) {
        if (!this.model) {
            console.error("❌ [GeminiProvider] Model not initialized.");
            return null;
        }

        try {
            console.log(`[GeminiProvider] 🚀 Generating content...`);
            const result = await this.model.generateContent(promptText);
            const response = await result.response;
            const text = response.text();

            console.log(`[GeminiProvider] ✅ Response received (${text.length} chars).`);

            // Robust JSON Extraction
            let jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const firstBrace = jsonString.indexOf('{');
            const lastBrace = jsonString.lastIndexOf('}');

            if (firstBrace !== -1 && lastBrace !== -1) {
                jsonString = jsonString.substring(firstBrace, lastBrace + 1);
            }

            try {
                return JSON.parse(jsonString);
            } catch (parseError) {
                console.warn("⚠️ [GeminiProvider] JSON Parse failed.");
                // Write to file for debug
                const fs = require('fs');
                fs.writeFileSync('debug_raw_ai_fail.txt', text);
                return null;
            }

        } catch (error) {
            console.error("❌ [GeminiProvider] Generate Error:", error.message);
            const msg = String(error.message || '');
            if (msg.includes('404') && msg.includes('not found')) {
                console.error(
                    '[GeminiProvider] 404: el id de modelo no existe para esta API key / versión. '
                    + 'Prueba GEMINI_MODEL=gemini-2.0-flash (recomendado). gemini-1.5-flash suele estar ya no listado en Generative Language API.',
                );
            }
            if (msg.includes('403') && (msg.includes('denied access') || msg.includes('Forbidden'))) {
                console.error(
                    '[GeminiProvider] 403: el proyecto de Google asociado a esta API key está denegado para la API de Gemini. '
                    + 'Suele resolverse creando una clave nueva en https://aistudio.google.com/apikey vinculada a otro proyecto de Google Cloud, '
                    + 'o contactando el soporte de Google AI / revisando facturación y políticas del proyecto. Cambiar solo la cadena de la clave sin cambiar de proyecto no corrige este mensaje.',
                );
            }

            // ERROR HANDLING FOR QUOTA (429)
            if (error.message.includes('429') || error.message.includes('Quota exceeded')) {
                if (this.modelName.includes('2.0') || this.modelName.includes('2.5')) {
                    console.warn(
                        '[GeminiProvider] Cuota free agotada en este modelo; espera el retry o revisa https://ai.dev/rate-limit',
                    );
                }
                // Try to extract time
                const timeMatch = error.message.match(/retry in ([\d\.]+)s/);
                const waitSeconds = timeMatch ? parseFloat(timeMatch[1]) : 60;

                const quotaError = new Error(`⏳ Cuota de IA excedida. Por favor espera ${Math.ceil(waitSeconds)} segundos.`);
                quotaError.code = 'AI_QUOTA_EXCEEDED';
                quotaError.retryAfter = Math.ceil(waitSeconds);
                throw quotaError;
            }

            const fs = require('fs');
            fs.writeFileSync('debug_error_provider.txt', `Error: ${error.message}\nStack: ${error.stack}`);
            return null;
        }
    }
}

module.exports = GeminiProvider;
