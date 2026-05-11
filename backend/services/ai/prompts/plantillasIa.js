/**
 * Prompts para generar plantillas de mensaje (correo/texto) con etiquetas del motor.
 * Lista de etiquetas: plantillasEtiquetasCatalog.js
 */

const { bloqueEtiquetasParaPrompt } = require('../../plantillasEtiquetasCatalog');

const HTML_MARKER = '[[HTML_EMAIL]]';

function bloqueEtiquetas() {
    return bloqueEtiquetasParaPrompt();
}

/** Palabras clave en el nombre del tipo (Firestore) para elegir layout HTML */
function inferirModoPlantilla(tipoNombre) {
    const t = String(tipoNombre || '').toLowerCase();
    if (/intern|administrador|equipo|staff|copia.*interna|notifica.*intern/i.test(t)) {
        return 'admin_alerta';
    }
    if (/confirm|hu[eé]sped|cliente|reserva.*confirm|bienvenida/i.test(t)) {
        return 'huesped_confirmacion';
    }
    return 'generico_html';
}

function instruccionesLayoutPorModo(modo) {
    if (modo === 'admin_alerta') {
        return `LAYOUT “alerta administrativa” (referencia producto):
- Cabecera horizontal con fondo morado oscuro (#5b21b6 o similar), texto blanco: título “Nueva reserva recibida” o equivalente, subtítulo con icono + [ALOJAMIENTO_NOMBRE] • [RESERVA_ID_CANAL], badge “Canal: [CANAL_NOMBRE]”.
- Saludo: Hola [USUARIO_NOMBRE], texto corto de que el sistema registró la reserva.
- Tarjeta “Datos del huésped”: fondo azul muy claro, borde suave; nombre [CLIENTE_NOMBRE], correo [CLIENTE_EMAIL], teléfono [CLIENTE_TELEFONO].
- Tarjeta “Fechas y ocupación”: tabla 2×2 con [FECHA_LLEGADA], [FECHA_SALIDA], [TOTAL_NOCHES], [CANTIDAD_HUESPEDES] / grupo [GRUPO_SOLICITADO].
- Tarjeta “Observaciones” (si [COMENTARIOS_HUESPED] puede estar vacío, muestra un guión o “Sin observaciones” en cursiva).
- Tarjeta “Desglose”: [PRECIO_LISTA] si existe cupón, línea [LINEA_DESCUENTO_CUPON], separador, total en verde [MONTO_TOTAL], aclaración “Monto final del cliente”.
- Botón centrado tipo enlace-estilo botón: <a href="[LINK_GESTION_RESERVA]">Ver reserva en el sistema</a> con fondo #0f172a, texto blanco, padding, border-radius.
Usa tablas HTML (<table width="100%">) para compatibilidad con clientes de correo; estilos inline en cada celda.`;
    }
    if (modo === 'huesped_confirmacion') {
        return `LAYOUT “confirmación huésped” (referencia producto):
- Cabecera ancha color azul marino (#1e3a8a), texto blanco: titular tipo “¡Tu reserva está confirmada!” y subtítulo “Te esperamos en [EMPRESA_NOMBRE]”.
- Bloque resumen alojamiento: fondo azul muy claro; ícono emoji de casa + “TU ALOJAMIENTO” + [ALOJAMIENTO_NOMBRE]; número Reserva [RESERVA_ID_CANAL]; columnas Llegada / Salida / Duración ([FECHA_LLEGADA], [FECHA_SALIDA], [TOTAL_NOCHES] noches).
- Tarjetas en fila (tabla dos columnas): ingreso/salida horarios si los tienes como texto en plantilla genérica; “Cómo llegar” con botón secundario si [EMPRESA_WEBSITE] existe → enlazar Google Maps solo si hay URL https explícita en copy (usa [EMPRESA_WEBSITE] como texto base para “sitio”).
- Sección útiles opcional (WiFi, reglas): solo placeholders genéricos si no hay etiqueta específica; puedes citar [EMPRESA_NOMBRE], [USUARIO_TELEFONO], [USUARIO_EMAIL].
- Pie azul marino con ubicación y contacto.
Estética limpia, mucho aire, fuentes sans-serif en style global del wrapper; solo HTML email seguro (tablas, inline CSS).`;
    }
    return `LAYOUT genérico profesional en HTML: cabecera de marca con [EMPRESA_NOMBRE], cuerpo con buen contraste, pie de contacto [USUARIO_EMAIL] / [USUARIO_TELEFONO]. Tablas + estilos inline.`;
}

/**
 * @param {object} p
 * @param {string} p.nombreEmpresa
 * @param {string} p.tipoNombre — Nombre del tipo de plantilla (Firestore)
 * @param {string} p.nombreBorrador — Nombre interno sugerido por el usuario (puede vacío)
 * @param {string} p.instrucciones — Instrucciones libres sanitizadas
 */
function promptGenerarPlantillaMensaje({ nombreEmpresa, tipoNombre, nombreBorrador, instrucciones }) {
    const borrador = (nombreBorrador || '').trim() || '(sin sugerencia: inventa un nombre interno breve en español)';
    const extra = (instrucciones || '').trim() || 'Ninguna';
    const modo = inferirModoPlantilla(tipoNombre);
    const layoutBlock = instruccionesLayoutPorModo(modo);

    return `Eres diseñador/a de emails transaccionales HTML para alojamientos (Latinoamérica, español neutro).

CONTEXTO
- Empresa: "${nombreEmpresa}"
- Tipo de plantilla (clasificación): "${tipoNombre}"
- Modo inferido para el layout: ${modo}
- Nombre interno sugerido (mejóralo si es vago): ${borrador}
- Instrucciones adicionales del usuario: ${extra}

OBJETIVO
Genera un **cuerpo en HTML para correo electrónico** y un **asunto** acordes al tipo. El HTML debe verse profesional en Gmail y Outlook (usa tablas anidadas, anchos máx ~600px, estilos inline).

MARCA OBLIGATORIA AL INICIO DEL CUERPO
La primera línea del campo "texto" DEBE ser exactamente:
${HTML_MARKER}
Inmediatamente después, sin saltos extra antes del HTML, el documento HTML del cuerpo (sin <!DOCTYPE> opcional; puede empezar con <div o <table).

${layoutBlock}

ETIQUETAS DEL MOTOR (OBLIGATORIO)
1. Solo puedes usar estas etiquetas EXACTAS entre corchetes. No inventes {{variables}} ni [MI_ETIQUETA].
2. Incluye en el HTML al menos 8 etiquetas DISTINTAS relevantes al tipo (huésped vs administrador).
3. El asunto puede incluir 1–3 etiquetas (ej. [ALOJAMIENTO_NOMBRE], [RESERVA_ID_CANAL]).

LISTA VÁLIDA:
${bloqueEtiquetas()}

FORMATO
- Campo "texto": empieza con ${HTML_MARKER} + HTML (no texto plano).
- Sin Markdown fences. Sin scripts. Sin imágenes externas obligatorias (opcional logo URL solo si el usuario lo pidió en instrucciones).
- Máximo ~9000 caracteres en "texto".

SALIDA
Responde ÚNICAMENTE con JSON válido (sin markdown, sin texto fuera del JSON) con estas claves exactas:
{"nombre":"string breve para lista interna","asunto":"string","texto":"string que empieza con ${HTML_MARKER}"}`;
}

module.exports = { promptGenerarPlantillaMensaje, inferirModoPlantilla, HTML_MARKER };
