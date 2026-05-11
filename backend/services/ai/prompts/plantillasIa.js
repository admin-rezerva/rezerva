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
        return `LAYOUT “alerta administrativa” (solo equipo interno; NO uses [LINK_CONFIRMACION_PUBLICA]):
- Cabecera con fondo azul intenso (#1e40af o #5b21b6), texto blanco: título “Nueva reserva recibida”, subtítulo [ALOJAMIENTO_NOMBRE] • [RESERVA_ID_CANAL], badge “Canal: [CANAL_NOMBRE]”.
- Saludo: Hola [USUARIO_NOMBRE], una línea de que el sistema registró la reserva confirmada.
- Tarjeta pastel azul “DATOS DEL HUÉSPED”: [CLIENTE_NOMBRE], [CLIENTE_EMAIL], [CLIENTE_TELEFONO].
- Tarjeta pastel gris “FECHAS Y OCUPACIÓN”: [FECHA_LLEGADA], [FECHA_SALIDA], [TOTAL_NOCHES], [CANTIDAD_HUESPEDES].
- Tarjeta pastel amarillo “OBSERVACIONES”: bloque citado con [COMENTARIOS_HUESPED]; si vacío, “Sin observaciones” en cursiva.
- Tarjeta pastel verde “DESGLOSE”: [PRECIO_LISTA] si aplica, [LINEA_DESCUENTO_CUPON], total destacado [MONTO_TOTAL].
- CTA centrado: botón oscuro <a href="[LINK_GESTION_RESERVA]">Ver reserva en el sistema</a> (solo panel).
- Pie discreto: mensaje automático de Reservas / soporte [USUARIO_EMAIL].
Tablas HTML, max-width ~600px, estilos inline.`;
    }
    if (modo === 'huesped_confirmacion') {
        return `LAYOUT “confirmación cliente” (huésped; usa [LINK_CONFIRMACION_PUBLICA] como enlace principal al sitio; NO uses [LINK_GESTION_RESERVA] aquí):
- Hero azul marino (#1e3a8a / #1a202c): “¡Tu reserva está confirmada!” + “Te esperamos en [EMPRESA_NOMBRE]”.
- Saludo: Hola [CLIENTE_NOMBRE], párrafo corto de bienvenida.
- Tarjeta grande lavanda/claro (#edf2ff): emoji casa + “TU ALOJAMIENTO”, [ALOJAMIENTO_NOMBRE], “Reserva [RESERVA_ID_CANAL]”; a la derecha en tabla mini: Llegada [FECHA_LLEGADA], Salida [FECHA_SALIDA], Duración [TOTAL_NOCHES] noches.
- Fila dos columnas (tabla): izquierda tarjeta blanca “Ingreso y salida” con texto genérico de horarios (placeholder si no hay datos); derecha tarjeta blanca “Cómo llegar”: una línea de texto + botón “Abrir en Google Maps” solo si [EMPRESA_GOOGLE_MAPS_LINK] no está vacío (href esa URL); si vacío, solo [EMPRESA_WEBSITE] como texto.
- Opcional ancho completo: bloque “Información útil” con viñetas (WiFi, toallas, mascotas, tinaja, etc.) usando copy genérico paramétrico — sin inventar datos del negocio; puedes repetir contacto [USUARIO_TELEFONO] / [USUARIO_EMAIL].
- Destacado opcional: si [COMENTARIOS_HUESPED] tiene texto, muéstralo en recuadro; si no, omite la sección.
- Dos botones secundarios lado a lado (outline): enlaces a [EMPRESA_WEBSITE] (“Qué hacer cerca” o sitio) y texto legal corto — sin inventar URL si [EMPRESA_WEBSITE] vacío.
- CTA principal claro: botón o enlace fuerte <a href="[LINK_CONFIRMACION_PUBLICA]">Ver confirmación en el sitio web</a>.
- Pie hero mismo azul: [EMPRESA_NOMBRE], ciudad/región si quieres placeholder “Chile”, [USUARIO_EMAIL].
Mucho padding, bordes radius 8–12px en tarjetas; solo tablas + CSS inline; sin scripts.`;
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
- Máximo ~14000 caracteres en "texto".

SALIDA
Responde ÚNICAMENTE con JSON válido (sin markdown, sin texto fuera del JSON) con estas claves exactas:
{"nombre":"string breve para lista interna","asunto":"string","texto":"string que empieza con ${HTML_MARKER}"}`;
}

module.exports = { promptGenerarPlantillaMensaje, inferirModoPlantilla, HTML_MARKER };
