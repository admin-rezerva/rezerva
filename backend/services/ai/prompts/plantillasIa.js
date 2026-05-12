/**
 * Prompts para generar plantillas de mensaje (correo/texto) con etiquetas del motor.
 * Lista de etiquetas: plantillasEtiquetasCatalog.js
 *
 * Confirmación huésped: modelo 3 capas — cabecera+resumen+ingreso/llegada (estándar producto),
 * tarjetas centrales (solo contenido que indique la empresa), pie+botones (estándar producto).
 */

const { bloqueEtiquetasParaPrompt } = require('../../plantillasEtiquetasCatalog');

const HTML_MARKER = '[[HTML_EMAIL]]';

function bloqueEtiquetas() {
    return bloqueEtiquetasParaPrompt();
}

/** Palabras clave en el nombre del tipo (Firestore) para elegir layout HTML */
function inferirModoPlantilla(tipoNombre) {
    const t = String(tipoNombre || '').toLowerCase();
    if (/confirm|reserva/i.test(t) && /intern|administrador|admin|equipo|staff|copia.*interna|notifica.*intern/i.test(t)) {
        return 'admin_confirmacion_reserva';
    }
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
        return `MODELO EN TRES PARTES (confirmación cliente — HTML email, tablas anidadas, CSS inline).

RITMO Y ALINEACIÓN (obligatorio — aspecto profesional)
- Contenedor único: una tabla raíz role="presentation" width="100%" style="max-width:600px;margin:0 auto;" que envuelva **todo** el cuerpo del correo (incluido hero). No mezcles bloques a ancho completo del viewport con otros más estrechos.
- Separación vertical: entre hero, saludo, tarjeta lavanda, fila de 2 columnas, [DESGLOSE_PRECIO_HTML], cada tarjeta de PARTE B y el bloque de botones/pie, deja **20–28px** de espacio (padding-bottom en el <td> que cierra el bloque o una fila <tr><td height="24"></td></tr> vacía). **Nunca** pegues dos tarjetas sin margen.
- Fila dos columnas “Ingreso / Cómo llegar”: usa <tr><td width="50%" style="width:50%;max-width:50%;padding-right:10px;vertical-align:top"> y la derecha con padding-left:10px (no 48%/48% a ojo). Dentro de cada celda, tabla interna width="100%" con border-radius 12px, borde #e2e8f0, padding 16px 18px; misma **min-height** en ambas (ej. min-height:140px) para igualar altura visual.
- Tarjetas PARTE B (WiFi, etc.): cada una tabla width="100%" con margin inferior (espacio antes de la siguiente), mismo border-radius y padding que las blancas de PARTE A.

══════════════════════════════════════════════════════════════════
PARTE A — ESTÁNDAR DE PRODUCTO (obligatoria; mismo esqueleto visual para TODA empresa)
Réplica fiel de referencia SuiteManager: hero oscuro + saludo + tarjeta lavanda + dos tarjetas blancas (horarios / cómo llegar).
══════════════════════════════════════════════════════════════════
1) Hero: fondo azul marino / slate muy oscuro (#0f172a o #1a202c), padding generoso, texto centrado.
   - Título blanco grande: “¡Tu reserva está confirmada!”
   - Subtítulo blanco o gris muy claro: “Te esperamos en [EMPRESA_NOMBRE]”
2) Cuerpo fondo blanco:
   - “Hola [CLIENTE_NOMBRE],” (nombre en <strong>)
   - Un párrafo corto de bienvenida (tono cordial, sin datos inventados del lugar).
3) Tarjeta principal ancha (lavanda/azul muy claro #eef2ff, borde #c7d2fe, border-radius 14–16px):
   - Columna izq.: etiqueta pequeña morada “TU ALOJAMIENTO”; el nombre [ALOJAMIENTO_NOMBRE] debe ser enlace <a href="[LINK_FOTOS_ALOJAMIENTO]">…</a> si [LINK_FOTOS_ALOJAMIENTO] no está vacío (página pública del alojamiento con galería); si el enlace está vacío, texto sin enlace. Inmediatamente debajo, si [ENLACES_FOTOS_ALOJAMIENTOS_HTML] no está vacío, insértelo (reservas con varios alojamientos: enlaces a fotos por unidad).
   - Línea “Reserva Nº [RESERVA_ID_CANAL]”.
   - Columna der. (tabla): Llegada [FECHA_LLEGADA], Salida [FECHA_SALIDA], Duración [TOTAL_NOCHES] noches (tipografía jerárquica como diseño referencia).
4) Fila dos columnas **50% / 50%** con gutter 10px (ver RITMO). Tarjetas blancas internas alineadas en altura (min-height igual en ambas).
   - Izquierda: “Ingreso y Salida” + emoji reloj; horarios neutros si no hay datos.
   - Derecha: “Cómo llegar” + emoji pin; texto breve; botón Maps solo con [EMPRESA_GOOGLE_MAPS_LINK]; si vacío, sin inventar URL.
5) Tras **al menos 22px** de separación desde la fila anterior: inserta [DESGLOSE_PRECIO_HTML] (ancho ya centrado al contenedor 600px por el motor). No dupliques montos alrededor.

══════════════════════════════════════════════════════════════════
PARTE B — MÓDULO CENTRAL (solo lo que el usuario describió en “Tarjetas personalizadas” / instrucciones de contenido)
══════════════════════════════════════════════════════════════════
- Tarjetas apiladas (imagen 3): cada bloque en su propia tabla width="100%" con **margin/padding inferior 20–24px** respecto a la siguiente; mismo ancho que el contenedor 600px; padding interno 16px 18px; borde #e2e8f0; border-radius 12px; iconos emoji; listas con ✅ cuando corresponda.
- NO inventes nombres de marcas, claves WiFi, direcciones largas ni políticas que el usuario NO haya escrito en el texto de tarjetas.
- Si el texto de tarjetas está vacío o solo dice “ninguna”: NO llenes con datos ficticios; no repitas desglose de precio (ya va [DESGLOSE_PRECIO_HTML] en PARTE A). Opcional: tarjeta mínima “¿Dudas?” con [USUARIO_EMAIL] y [USUARIO_TELEFONO].

══════════════════════════════════════════════════════════════════
PARTE C — ESTÁNDAR DE PRODUCTO (obligatoria; pie como referencia “imagen 2”)
══════════════════════════════════════════════════════════════════
1) **No** incluyas botón “Qué hacer cerca” (no todas las empresas lo usan).
2) Usa un solo CTA principal sólido “Ver estado de mi reserva” → [LINK_CONFIRMACION_PUBLICA]. No dupliques “Ver confirmación”.
3) El link a términos va en el footer → [URL_TERMINOS] / [LINK_TERMINOS_CONDICIONES], no como CTA principal.
4) Footer bloque oscuro (#0f172a), en 3 zonas:
   - izquierda: [EMPRESA_LOGO_HTML] si existe + [EMPRESA_NOMBRE];
   - centro: [USUARIO_NOMBRE], mailto:[USUARIO_EMAIL], [USUARIO_TELEFONO];
   - derecha: marca Rezerva en texto y frase breve “Al confirmar esta reserva aceptas los términos y condiciones publicados por el alojamiento.” + link a [URL_TERMINOS].
NO uses [LINK_GESTION_RESERVA] en correo huésped. Incluye en el HTML al menos estas etiquetas además de otras del catálogo: [DESGLOSE_PRECIO_HTML], [LINK_FOTOS_ALOJAMIENTO], [EMPRESA_GOOGLE_MAPS_LINK], [LINK_CONFIRMACION_PUBLICA].`;
    }
    return `LAYOUT genérico profesional en HTML: cabecera de marca con [EMPRESA_NOMBRE], cuerpo con buen contraste, pie de contacto [USUARIO_EMAIL] / [USUARIO_TELEFONO]. Tablas + estilos inline.`;
}

/**
 * Texto extra para el bloque modular (PARTE B) en confirmación huésped.
 */
function bloqueModuloTarjetasConfirmacion(instruccionesTarjetas) {
    const t = String(instruccionesTarjetas || '').trim();
    if (!t) {
        return `TARJETAS PERSONALIZADAS (PARTE B): el usuario no proporcionó contenido para el módulo central.
Genera PARTE A (con [DESGLOSE_PRECIO_HTML] en su sitio) y PARTE C completas; entre A y C no insertes datos inventados de negocio. Opcional: una tarjeta mínima de contacto con [USUARIO_EMAIL] y [USUARIO_TELEFONO], o ninguna tarjeta intermedia.`;
    }
    return `TARJETAS PERSONALIZADAS (PARTE B) — contenido a convertir en tarjetas HTML apiladas (única zona que cambia por empresa):
"""
${t}
"""
Convierte este contenido en tarjetas con el estilo de la referencia larga (imagen tipo captura completa): iconos emoji por sección, bordes redondeados, mucho aire.
Cada tarjeta: tabla role="presentation" width="100%" con padding interno 16px–18px, border-radius 12px, borde #e2e8f0; **entre tarjeta y tarjeta** deja 20–24px de separación (fila vacía o padding-bottom en el <td> contenedor). Mismo ancho que el resto del correo (no más estrecho que [DESGLOSE_PRECIO_HTML]).
Si el texto describe una maqueta o captura (colores, orden), respétalo.
No añadas datos que no estén en el texto anterior.`;
}

/**
 * @param {object} p
 * @param {string} p.nombreEmpresa
 * @param {string} p.tipoNombre — Nombre del tipo de plantilla (Firestore)
 * @param {string} p.nombreBorrador — Nombre interno sugerido por el usuario (puede vacío)
 * @param {string} p.instrucciones — Instrucciones libres sanitizadas (tono, ciudad en pie, rutas URL extra)
 * @param {string} [p.instruccionesTarjetas] — Tarjetas de contenido por tema (WiFi, tinaja, operación, avisos, etc.).
 */
function promptGenerarPlantillaMensaje({
    nombreEmpresa,
    tipoNombre,
    nombreBorrador,
    instrucciones,
    instruccionesTarjetas,
}) {
    const borrador = (nombreBorrador || '').trim() || '(sin sugerencia: inventa un nombre interno breve en español)';
    const extra = (instrucciones || '').trim() || 'Ninguna';
    const modo = inferirModoPlantilla(tipoNombre);
    const layoutBlock = instruccionesLayoutPorModo(modo);
    const moduloTarjetas = String(instruccionesTarjetas || '').trim()
        ? bloqueModuloTarjetasConfirmacion(instruccionesTarjetas)
        : '';

    return `Eres diseñador/a de emails transaccionales HTML para alojamientos (Latinoamérica, español neutro).

CONTEXTO
- Empresa (nombre comercial): "${nombreEmpresa}"
- Tipo de plantilla (clasificación): "${tipoNombre}"
- Modo inferido para el layout: ${modo}
- Nombre interno sugerido (mejóralo si es vago): ${borrador}
- Instrucciones generales (tono, ciudad/región para el pie, URLs extra para términos, restricciones): ${extra}

${moduloTarjetas}

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

module.exports = {
    promptGenerarPlantillaMensaje,
    inferirModoPlantilla,
    HTML_MARKER,
    bloqueModuloTarjetasConfirmacion,
};
