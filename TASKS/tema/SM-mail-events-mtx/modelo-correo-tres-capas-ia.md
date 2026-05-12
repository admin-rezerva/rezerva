# Modelo estándar de correos transaccionales — tres capas

## Objetivo

Separar lo que es **estándar del producto** (igual estructura visual para todas las empresas) de lo que es **contenido propio del tenant** o del evento. La definición aplica al **formato** de correos transaccionales futuros: contenedor 600px, hero oscuro, cuerpo blanco con tarjetas/summary cards, CTA único y footer alineado. El contenido cambia por audiencia y disparador.

| Capa | Referencia visual | Contenido |
|------|-------------------|-----------|
| **A — Cabecera y bloque inicial** | Hero + saludo + tarjeta lavanda “Tu alojamiento” + fila “Ingreso / Cómo llegar” | Fijo en prompt IA (`plantillasIa.js`): etiquetas `[EMPRESA_NOMBRE]`, `[CLIENTE_NOMBRE]`, fechas, `[LINK_CONFIRMACION_PUBLICA]`/`[EMPRESA_WEBSITE]`/`[EMPRESA_GOOGLE_MAPS_LINK]` donde aplique. |
| **B — Módulo central** | Captura tipo “imagen 3” (tarjetas apiladas) | Solo texto que la empresa ingresa en **Tarjetas centrales** al generar con IA; si está vacío, la IA no inventa datos del negocio. |
| **C — Acciones y pie** | CTA único + footer oscuro en tres zonas | Fijo en prompt/código: botón principal “Ver estado de mi reserva” con `[LINK_CONFIRMACION_PUBLICA]`; footer con `[EMPRESA_LOGO_HTML]` + `[EMPRESA_NOMBRE]`, contacto `[USUARIO_NOMBRE]` / `[USUARIO_EMAIL]` / `[USUARIO_TELEFONO]`, marca Rezerva y link `[URL_TERMINOS]`. |

## Estándar global de formato

- Todo correo transaccional nuevo debe usar `[[HTML_EMAIL]]`, tablas anidadas y estilos inline; no React/Tailwind en el HTML final.
- Ancho visual único: tabla principal `width="600"` con `max-width:600px`, incluyendo hero, cuerpo y footer.
- Hero oscuro `#0f172a` con título del evento y subtítulo de contexto.
- Cuerpo blanco con tarjetas o bloques semánticos, usando `[DESGLOSE_PRECIO_HTML]` cuando corresponda en lugar de duplicar montos. El bloque **Tarjetas de información** queda disponible para cualquier plantilla; en confirmación huésped y confirmación administrador se renderiza dentro del layout fijo, y en otros tipos se entrega como instrucciones a la IA.
- Un solo CTA principal por correo: huéspedes usan `[LINK_CONFIRMACION_PUBLICA]`; equipo interno usa `[LINK_GESTION_RESERVA]`.
- Footer alineado al mismo ancho que el cuerpo. En huésped se mantiene el footer de 3 zonas con logo/contacto/Rezerva y términos; en correos internos puede usarse footer compacto oscuro, pero con la misma geometría.

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

## Estado 2026-05-11

- Hecho: formato fijo de confirmación huésped con tarjetas del wizard alineadas al ancho del contenido, sin fallback “Contacto” cuando no hay tarjetas.
- Hecho: pie depurado; se elimina la duplicidad entre “Ver confirmación” y “Abrir confirmación en el sitio”. Queda un único CTA hacia `[LINK_CONFIRMACION_PUBLICA]` con texto “Ver estado de mi reserva”.
- Hecho: `[URL_TERMINOS]` / `[LINK_TERMINOS_CONDICIONES]` pasan al footer junto a la frase de aceptación de términos y apuntan al subdominio Rezerva del tenant (`https://{subdominio}.rezerva.cl/terminos-y-condiciones`), no al dominio propio configurado por la empresa.
- Hecho paso 2: `/confirmacion?reservaId=...` evoluciona a página pública “Estado de mi reserva” con resumen de reserva, estado de pago, abono requerido, plazo antes de posible cancelación automática por falta de abono, fotos de alojamientos reservados y acciones útiles.
- Hecho: este formato queda definido como estándar para todos los correos transaccionales futuros; la plantilla “Confirmación reserva administrador” adopta el mismo layout base con contenido operativo interno y CTA al panel.
- Hecho: las tarjetas dejan de ser exclusivas de confirmación huésped; el modal las muestra para toda plantilla y las persiste como `email_config.tarjetasCorreo` (con compatibilidad `tarjetasConfirmacionHuesped`).
