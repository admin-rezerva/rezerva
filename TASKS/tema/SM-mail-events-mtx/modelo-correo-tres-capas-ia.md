# Modelo de correo confirmación huésped — tres capas

## Objetivo

Separar lo que es **estándar del producto** (igual estructura visual para todas las empresas) de lo que es **contenido propio del tenant** (tarjetas WiFi, tinaja, mascotas, dirección larga, etc.), más el **pie y botones** unificados.

| Capa | Referencia visual | Contenido |
|------|-------------------|-----------|
| **A — Cabecera y bloque inicial** | Hero + saludo + tarjeta lavanda “Tu alojamiento” + fila “Ingreso / Cómo llegar” | Fijo en prompt IA (`plantillasIa.js`): etiquetas `[EMPRESA_NOMBRE]`, `[CLIENTE_NOMBRE]`, fechas, `[LINK_CONFIRMACION_PUBLICA]`/`[EMPRESA_WEBSITE]`/`[EMPRESA_GOOGLE_MAPS_LINK]` donde aplique. |
| **B — Módulo central** | Captura tipo “imagen 3” (tarjetas apiladas) | Solo texto que la empresa ingresa en **Tarjetas centrales** al generar con IA; si está vacío, la IA no inventa datos del negocio. |
| **C — Acciones y pie** | Dos botones outline + footer oscuro | Fijo en prompt: “Qué hacer cerca” / “Términos”, mailto `[USUARIO_EMAIL]`, `[EMPRESA_NOMBRE]`. Ciudad en pie solo si va en **Instrucciones generales**. |

## Panel plantillas

- **Instrucciones generales:** tono, ubicación para el pie, URLs de términos en texto libre.
- **Tarjetas centrales:** contenido por empresa; también sirve para **describir por palabras** una maqueta o captura (orden de bloques, colores), hasta que exista subida de imagen.

## Subida de imagen como referencia (roadmap)

Hoy el motor `generateForTask` solo pasa **buffer de imagen** a Gemini en tareas tipo `IMAGE_METADATA`, no en `TEMPLATE_GENERATION`. Para que la IA **vea** la captura haría falta:

1. Endpoint que reciba imagen (validar tamaño/tipo).
2. Extender `generateForTask` o llamada directa a Gemini con parte multimodal para `TEMPLATE_GENERATION`.
3. Política de retención / no persistir imágenes si no se requiere.

**Workaround actual:** pegar en **Tarjetas centrales** una descripción detallada de la captura (secciones, textos, orden).

## Código

- Prompt: `backend/services/ai/prompts/plantillasIa.js` (`huesped_confirmacion`, `bloqueModuloTarjetasConfirmacion`).
- API: `POST /plantillas/generar-ia` con `instruccionesTarjetas`.
- UI: `frontend/src/views/components/gestionarPlantillas/plantillas.modals.js`.
