# Abono / depósito en reserva — modelo de producto (canales, textos, UI)

Documento de **orden conceptual** acordado con negocio (2026-05-13). Sirve para rediseñar copy del panel, agrupar campos y alinear implementación futura **sin** asumir que hoy todo canal ya consume la misma ruta de código.

---

## 1. «Requiere abono» = interruptor maestro del negocio

- **Significado deseado:** la empresa **exige un abono** cuando el flujo de reserva lo permite y el cobro se gestiona en el modelo Rezerva (precio, plazo, confirmación, correos).
- **Alcance objetivo (cuando el producto esté alineado):**
  - **Sitio público (SSR / web):** ya encaja (checkout, confirmación, correos con bloque transferencia).
  - **App / panel** (reservas equivalentes): mismo criterio si el flujo replica reserva directa.
  - **IA (venta directa):** misma regla de configuración si la reserva se confirma por el mismo motor.
  - **OTA:** **no** prometer el mismo comportamiento hasta diseñar **cómo arranca el flujo** (pago en plataforma externa, comisiones, estados). Documentar como *pendiente de diseño* en UI o ayuda contextual.

**Frase útil para el panel:** «Abono requerido en reservas gestionadas en Rezerva (web e IA; app cuando aplique). OTA: en definición.»

---

## 2. «Texto legal / explicativo del abono»

- **Rol:** texto **visible al huésped** que amarra **abono + plazo + efecto** (qué pasa si no pagan a tiempo; si la reserva queda condicionada al comprobante; etc.).
- **Consumo deseado:** correo de confirmación (debajo de datos de cuenta en el bloque de transferencia), y opcionalmente un bloque corto en **confirmación SSR** si producto lo define.
- **No debe mezclarse** con notas puramente internas.

---

## 3. «Política operativa de garantía»

- **Problema actual:** suena a **híbrido** (no del todo legal al huésped, no del todo operativo).
- **Opciones de producto:**
  - **A — Modo técnico:** el desplegable solo indica **cómo opera** el cobro (manual / sin garantía / preautorización futura) y un tooltip aclara: *«No sustituye términos legales ni la política de cancelación.»*
  - **B — Legal vinculado a cancelación / no-show:** si el negocio quiere «si no se presenta no se devuelve el abono», conviene **enlazar o alinear** con la **política de cancelación** ya existente (misma sección legal o referencia explícita), y evitar duplicar dos cajas de texto legal contradictorias.
- **Recomendación:** un **solo bloque legal visible** al huésped para abono+plazo; la «garantía» como **modo operativo** + ayuda corta; texto legal fuerte concentrado en «Texto legal del abono» o en política de cancelación según decisión de una sola fuente de verdad.

---

## 4. «Nota interna operativa»

- **Si no se muestra en ningún sitio, no aporta.**
- **Uso deseado:** visible **solo en panel** — p. ej. **gestión diaria**, ficha de reserva o detalle operativo — como contexto para quien valida comprobante o marca estados.
- **Nunca** en correo al huésped salvo decisión explícita contraria.

---

## 5. Datos de cuenta bancaria (empresa)

- **Agrupación en pantalla:** tiene sentido colocar **datos de cuenta justo debajo** del bloque «Depósito / abono para reserva web» (mismo módulo mental: *cuánto, cuándo, qué dice la ley, a qué cuenta*).
- **Persistencia:** puede seguir viviendo en `configuracion.datosBancarios` (configuración empresa); la mejora es **solo de UX** (mismo flujo de guardado, sección visual unificada).
- **Evolución:** si en el futuro marketing edita sitio pero no debe ver cuentas, valorar sub-sección colapsable o permisos por rol (fuera del alcance de este documento).

---

## 6. Orden sugerido en la UI (configuración)

1. **Requiere abono** (con aclaración de alcance por canal; OTA «en definición»).
2. **Tipo / % / monto fijo / horas límite** (reglas numéricas y plazo).
3. **Texto legal / explicativo del abono** (huésped; plazo y consecuencias).
4. **Política operativa de garantía** (modo operativo + ayuda que limite expectativas).
5. **Nota interna operativa** (dónde se verá: gestión diaria / ficha reserva).
6. **Datos cuenta empresa** (inmediatamente debajo, mismo bloque visual «Cobro y abono»).

---

## Bitácora

| Fecha | Nota |
|-------|------|
| 2026-05-13 | Primera versión: acuerdo de orden conceptual y canales (OTA pendiente). |
