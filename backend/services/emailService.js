/**
 * Servicio de correo: únicamente Nodemailer + Gmail SMTP.
 * Variables: EMAIL_USER, EMAIL_PASS, EMAIL_FROM (ver instrucciones en `backend/.env.example`).
 */

const nodemailer = require('nodemailer');

const SMTP_HOST = 'smtp.gmail.com';
const SMTP_PORT = 587;
const SMTP_SECURE = false;

const FROM_DISPLAY_NAME = 'Rezerva Notificaciones';
const DEFAULT_FROM_ADDRESS = 'notificaciones@rezerva.cl';
const REPLY_TO_ADDRESS = 'soporte@rezerva.cl';

/** Prefijo estable para filtrar en logs de Render (`[EmailService]`). */
const LOG = '[EmailService]';

function trimEnvSecret(raw) {
    if (raw == null) return '';
    let s = String(raw).trim().replace(/^\uFEFF/, '');
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
        s = s.slice(1, -1).trim();
    }
    return s;
}

function envEmailUser() {
    const s = trimEnvSecret(process.env.EMAIL_USER);
    return s || undefined;
}

function envEmailPass() {
    const s = trimEnvSecret(process.env.EMAIL_PASS);
    return s || undefined;
}

function envEmailFromAddress() {
    const s = trimEnvSecret(process.env.EMAIL_FROM);
    return s || DEFAULT_FROM_ADDRESS;
}

function buildFromMailObject() {
    return {
        name: FROM_DISPLAY_NAME,
        address: envEmailFromAddress(),
    };
}

function logMailError(err) {
    const o = err && typeof err === 'object' ? err : {};
    console.error(LOG, 'sendMail error', {
        message: o.message || String(err),
        code: o.code,
        command: o.command,
        responseCode: o.responseCode,
        response: o.response,
        errno: o.errno,
        syscall: o.syscall,
    });
}

class EmailService {
    constructor() {
        this.provider = this.detectProvider();
        this.transporter = null;
        this._logStartupConfig();
    }

    _logStartupConfig() {
        const user = envEmailUser();
        const pass = envEmailPass();
        const fromResolved = envEmailFromAddress();
        const resendLegacy = trimEnvSecret(process.env.RESEND_API_KEY);
        const payload = {
            entorno: process.env.NODE_ENV || '(sin NODE_ENV)',
            render: process.env.RENDER === 'true',
            proveedor: this.provider,
            smtp: { host: SMTP_HOST, port: SMTP_PORT, secure: SMTP_SECURE },
            EMAIL_USER: user || '(ausente)',
            EMAIL_PASS: pass ? `presente (longitud ${pass.length})` : '(ausente)',
            EMAIL_FROM_resuelto: fromResolved,
            replyTo: REPLY_TO_ADDRESS,
        };
        console.log(LOG, 'arranque / configuración correo', payload);
        if (this.provider === 'console') {
            console.warn(
                LOG,
                'Correo en modo console (no se envía por SMTP). En Render define EMAIL_USER y EMAIL_PASS.',
            );
        }
        if (resendLegacy) {
            console.warn(
                LOG,
                'RESEND_API_KEY sigue definida en el entorno; el código ya no la usa. Elimínala en Render para evitar confusión.',
            );
        }
    }

    detectProvider() {
        if (envEmailUser() && envEmailPass()) return 'smtp';
        console.warn(`${LOG} faltan EMAIL_USER y/o EMAIL_PASS → proveedor "console" (mock).`);
        return 'console';
    }

    _createSmtpTransport() {
        const transport = nodemailer.createTransport({
            pool: true,
            maxConnections: 5,
            maxMessages: 100,
            host: SMTP_HOST,
            port: SMTP_PORT,
            secure: SMTP_SECURE,
            auth: {
                user: envEmailUser(),
                pass: envEmailPass(),
            },
            connectionTimeout: 20000,
            greetingTimeout: 15000,
        });
        transport.on('error', (err) => {
            console.error(LOG, 'SMTP pool error', err && err.message ? err.message : err);
        });
        return transport;
    }

    async getTransporter() {
        if (this.transporter) return this.transporter;
        if (this.provider === 'smtp') {
            this.transporter = this._createSmtpTransport();
        }
        return this.transporter;
    }

    /**
     * @param {unknown} _db ignorado (compatibilidad callers)
     * @param {{ to: string, subject: string, html: string, attachments?: { filename: string, content: Buffer }[] }} opciones
     */
    async enviarCorreo(_db, opciones) {
        const {
            to,
            subject,
            html,
            attachments,
        } = opciones;

        const fromMail = buildFromMailObject();
        const replyTo = REPLY_TO_ADDRESS;
        const fromStr = `"${FROM_DISPLAY_NAME}" <${fromMail.address}>`;
        const subjectStr = subject == null ? '' : String(subject);
        const subjectPreview = subjectStr.length > 100 ? `${subjectStr.slice(0, 100)}…` : subjectStr;

        try {
            if (this.provider === 'console') {
                console.log(LOG, 'sendMail (mock console)', {
                    de: fromStr,
                    replyTo,
                    para: to,
                    asunto: subjectPreview,
                });
                return { success: true, proveedor: 'console' };
            }

            if (this.provider === 'smtp') {
                const transport = await this.getTransporter();
                const attach = Array.isArray(attachments) && attachments.length
                    ? attachments.map((a) => ({
                        filename: a.filename,
                        content: a.content,
                    }))
                    : undefined;

                console.log(LOG, 'sendMail inicio', {
                    para: to,
                    asunto: subjectPreview,
                    adjuntos: attach ? attach.length : 0,
                    from: fromMail.address,
                });

                const info = await transport.sendMail({
                    from: fromMail,
                    to,
                    subject,
                    html,
                    replyTo,
                    attachments: attach,
                });
                console.log(LOG, 'sendMail ok', {
                    messageId: info.messageId,
                    response: info.response,
                    accepted: info.accepted,
                    rejected: info.rejected,
                });
                return {
                    success: true,
                    messageId: info.messageId,
                    proveedor: 'smtp',
                };
            }
        } catch (error) {
            logMailError(error);
            const msg = error && error.message ? error.message : String(error);
            return {
                success: false,
                error: msg,
            };
        }

        return { success: false, error: 'Proveedor de correo no configurado.' };
    }
}

module.exports = new EmailService();
