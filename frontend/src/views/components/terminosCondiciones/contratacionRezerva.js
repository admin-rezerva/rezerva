const planRows = [
    ['Precio Anual (Neto)', '500 USD', '800 USD'],
    ['IVA (19% Chile)', '95 USD', '152 USD'],
    ['Total Anual (Bruto)', '595 USD', '952 USD'],
    ['Comisión por Reserva', '0%', '0%'],
    ['SLA: Primera Respuesta', '48 Horas Hábiles', '24 Horas Hábiles'],
];

function renderIntro() {
    return `<div class="rounded-lg border border-warning-200 bg-warning-50 p-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-warning-900">Borrador avanzado - sujeto a revisión legal</p>
        <h3 class="text-lg font-semibold text-warning-950 mt-1">Contratación Rezerva</h3>
        <p class="text-sm text-warning-800 mt-2">
            Base preliminar para empresas cliente: Ficha Comercial V1.3 + Contrato Maestro SaaS V5.5. No queda editable por tenant desde este panel.
        </p>
    </div>`;
}

function renderFichaHeader() {
    return `<section class="rounded-lg border border-primary-100 bg-primary-50 p-4 not-prose">
        <p class="text-xs font-semibold uppercase tracking-wide text-primary-700">Prioridad contractual</p>
        <h4 class="text-base font-bold text-primary-950 mt-1">Ficha Comercial de Servicios Rezerva.cl (V 1.3)</h4>
        <p class="text-sm text-primary-900 mt-2">
            Según el Contrato Maestro de Prestación de Servicios SaaS (V 5.5), esta Ficha Comercial tiene prioridad jerárquica sobre los Anexos y el Contrato Maestro en lo referente a planes, precios y condiciones comerciales específicas.
        </p>
    </section>`;
}

function renderPlanTable() {
    const rows = planRows.map(([concepto, basico, plus]) => (
        `<tr><td class="border border-gray-200 px-3 py-2">${concepto}</td><td class="border border-gray-200 px-3 py-2">${basico}</td><td class="border border-gray-200 px-3 py-2">${plus}</td></tr>`
    )).join('');
    return `<section>
        <h4 class="text-base font-bold text-gray-900">1. Cuadro Comparativo de Planes</h4>
        <div class="overflow-x-auto">
            <table class="min-w-full border border-gray-200 text-sm">
                <thead class="bg-gray-50"><tr>
                    <th class="border border-gray-200 px-3 py-2 text-left">Concepto</th>
                    <th class="border border-gray-200 px-3 py-2 text-left">Plan Básico</th>
                    <th class="border border-gray-200 px-3 py-2 text-left">Plan Plus</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    </section>`;
}

function renderModulosFicha() {
    return `<section>
        <h4 class="text-base font-bold text-gray-900">2. Módulos y Capacidades Técnicas</h4>
        <h5 class="font-semibold text-gray-900 mt-3">2.1. Infraestructura de Venta (SSR & IA)</h5>
        <ul>
            <li><strong>Instancia SSR Automática:</strong> Sitio web con estructura técnica orientada a SEO, alimentada por el contenido del Cliente.</li>
            <li><strong>Marketplace Rezerva:</strong> Publicación en la red Marketplace cuando el perfil del Cliente cumpla los requisitos mínimos de contenido y configuración.</li>
            <li><strong>Agente IA de Asistencia:</strong> Plan Básico con asistencia conversacional de carácter general; Plan Plus con configuración prioritaria y extendida mediante datos, normas y activos específicos del Cliente.</li>
        </ul>
        <h5 class="font-semibold text-gray-900 mt-3">2.2. Gestión Operativa (SPA Admin)</h5>
        <ul>
            <li><strong>Sincronización de Canales:</strong> Intercambio de disponibilidad vía iCal y/o importación de reportes de terceros.</li>
            <li><strong>Gestión de Plazas:</strong> Lógica de asignación según configuración del inventario (ej. diferenciación de camas superiores/inferiores).</li>
            <li><strong>CRM Operativo:</strong> Gestión de clientes, cupones y seguimiento de leads.</li>
        </ul>
        <h5 class="font-semibold text-gray-900 mt-3">2.3. Gestión de Riesgo (Beta)</h5>
        <p><strong>Reserva de Admisión Documentada:</strong> Módulo de bloqueo local. El acceso a alertas comunitarias está sujeto a la gobernanza y validación documental del Proveedor.</p>
    </section>`;
}

function renderCondicionesFicha() {
    return `<section>
        <h4 class="text-base font-bold text-gray-900">3. Condiciones Financieras</h4>
        <ul>
            <li><strong>Modalidad de Pago:</strong> Pago anual anticipado. Tarifa de lanzamiento válida para el primer periodo de contratación; las renovaciones posteriores quedan sujetas a las condiciones de reajuste previstas en el Contrato Maestro.</li>
            <li><strong>Tipo de Cambio:</strong> Los montos en Pesos Chilenos (CLP) se calcularán según el “Dólar Observado” publicado por el Banco Central de Chile a la fecha de emisión de la factura.</li>
            <li><strong>Exclusiones:</strong> El precio no incluye costos de terceros, tales como comisiones de pasarelas de pago, dominios propios, pauta publicitaria, APIs externas de mensajería o servicios de correo adicionales.</li>
        </ul>
    </section>`;
}

function renderTercerosYFormalizacion() {
    return `<section>
        <h4 class="text-base font-bold text-gray-900">4. Funcionalidades Sujetas a Terceros</h4>
        <p>Las siguientes capacidades están supeditadas a la aprobación y disponibilidad de plataformas externas:</p>
        <ul>
            <li><strong>Asistencia Google Hotels:</strong> Integración disponible en Plan Plus, sin garantía de aprobación por parte de Google ni permanencia en el servicio.</li>
            <li><strong>Importación de Reseñas:</strong> Sujeta a la disponibilidad de mecanismos autorizados por las OTAs correspondientes.</li>
        </ul>
        <h4 class="text-base font-bold text-gray-900 mt-5">5. Formalización Electrónica</h4>
        <p>Al procesar el pago, se capturarán datos de auditoría vinculados al Contrato Maestro V 5.5:</p>
        <ul>
            <li>Plan Contratado: [PLAN_CONTRATADO]</li>
            <li>Precio Final Aceptado: [PRECIO_CONTRATADO]</li>
            <li>Fecha y Hora (Timestamp): [FECHA_HORA]</li>
            <li>ID de Aceptación: [ID_ACEPTACION]</li>
            <li>Hash del Documento Aceptado: [HASH_DOCUMENTO]</li>
        </ul>
    </section>`;
}

function renderFichaComercial() {
    return `${renderFichaHeader()}${renderPlanTable()}${renderModulosFicha()}${renderCondicionesFicha()}${renderTercerosYFormalizacion()}`;
}

function renderContratoGeneral() {
    return `<section>
        <h4 class="text-base font-bold text-gray-900">Contrato Maestro de Prestación de Servicios SaaS (V 5.5)</h4>
    </section>
    <section>
        <h4 class="text-base font-bold text-gray-900">Proveedor y Cliente</h4>
        <p><strong>PROVEEDOR:</strong> [Razón Social], RUT [RUT], representada por [Nombre], domiciliados en [Dirección], Santiago, Chile.</p>
        <p><strong>CLIENTE:</strong> La entidad o persona natural con giro que acepte este contrato mediante suscripción electrónica.</p>
        <p><strong>REGISTRO DE ACEPTACIÓN:</strong> La aceptación mediante el botón “Contratar” constituirá un medio válido y suficiente de prueba de aceptación, sin perjuicio de lo que resuelva la autoridad competente. El Proveedor almacenará un registro de auditoría con: Razón Social, RUT Empresa, Nombre y RUT Representante, IP, Timestamp, Versión del Contrato, Plan, Precio y el Hash único del documento aceptado.</p>
    </section>`;
}

function renderContratoTerminos() {
    return `<section>
        <h4 class="text-base font-bold text-gray-900">I. Términos y Condiciones Generales</h4>
        <h5 class="font-semibold text-gray-900 mt-3">1. Objeto y Licencia de Uso</h5>
        <p>El Proveedor otorga una licencia de uso personal, no exclusiva e intransferible sobre el Software.</p>
        <p><strong>Propiedad Intelectual:</strong> El Software, incluyendo su código fuente, algoritmos de IA, marcas, diseños, esquemas, compilaciones y estructuras técnicas de bases de datos, son propiedad exclusiva del Proveedor. Se excluyen expresamente los datos operativos y contenidos propios del Cliente, sobre los cuales este retiene total propiedad.</p>
        <p><strong>Licencia de Contenido:</strong> El Cliente autoriza al Proveedor a utilizar sus contenidos para la prestación del servicio. Esta licencia expira al término del contrato, salvo para materiales promocionales ya publicados hasta su retiro razonable.</p>
        <h5 class="font-semibold text-gray-900 mt-3">2. Duración y Renovación</h5>
        <p>Suscripción anual con renovación automática. El Cliente podrá no renovar notificando con 30 días de antelación. En caso de no aceptar un reajuste de tarifa, podrá resolver el contrato al fin del periodo vigente sin penalidad.</p>
        <h5 class="font-semibold text-gray-900 mt-3">3. Condiciones Financieras y Mora</h5>
        <p><strong>Facturación:</strong> Precios en USD, pagaderos en CLP (Dólar Observado) + IVA.</p>
        <p><strong>Mora:</strong> Suspensión a los 15 días de impago. Se bloquearán nuevas ventas, garantizando accesos mínimos para revisar reservas vigentes y solicitar exportación de datos por 30 días.</p>
        <h5 class="font-semibold text-gray-900 mt-3">4. Confidencialidad</h5>
        <p>Ambas partes guardarán reserva sobre información no pública. Los secretos comerciales, código fuente, credenciales y know-how mantendrán esta protección de forma indefinida. La información operativa general tendrá una reserva de 3 años post-término.</p>
        <h5 class="font-semibold text-gray-900 mt-3">5. Limitación de Responsabilidad</h5>
        <p>El tope de responsabilidad es el monto pagado en los últimos 12 meses. Esta limitación NO aplicará en casos de dolo, culpa grave, infracción de confidencialidad, vulneración de datos personales imputable al Proveedor o infracciones no limitables por ley.</p>
        <h5 class="font-semibold text-gray-900 mt-3">6. Indemnidad del Cliente</h5>
        <p>El Cliente indemnizará al Proveedor por reclamos sobre veracidad de contenidos, falta de permisos legales, actos de discriminación, deudas laborales/tributarias o mal uso del sistema.</p>
        <h5 class="font-semibold text-gray-900 mt-3">7. Modificación de Términos</h5>
        <p>Cambios materiales se notificarán con 30 días de antelación. Si el Cliente resuelve el contrato por no aceptar un cambio material, tendrá derecho a la devolución proporcional de los meses no utilizados.</p>
        <h5 class="font-semibold text-gray-900 mt-3">8. Fuerza Mayor</h5>
        <p>Ninguna parte responderá por incumplimientos derivados de eventos fuera de su control razonable, incluyendo ciberataques masivos o incidentes graves de seguridad en infraestructura del Proveedor o sus sub-encargados.</p>
    </section>`;
}

function renderContratoAnexos() {
    return `<section>
        <h4 class="text-base font-bold text-gray-900">II. Anexo A: Gestión de Riesgo y Admisión</h4>
        <p><strong>Gobernanza:</strong> Las alertas comunitarias no serán habilitadas sin evidencia documentada, revisión humana previa y un canal operativo de impugnación para el huésped afectado.</p>
        <p><strong>Trazabilidad:</strong> Cada alerta registrará la identidad del usuario creador y auditor.</p>
        <p><strong>Eliminación:</strong> A los 24 meses o ante falta de respaldo suficiente tras impugnación.</p>
    </section>
    <section>
        <h4 class="text-base font-bold text-gray-900">III. Anexo B: Protección de Datos e IA</h4>
        <p><strong>Roles:</strong> Cliente (Responsable) / Proveedor (Encargado).</p>
        <p><strong>Incidentes:</strong> El Proveedor notificará brechas que afecten datos personales del Cliente dentro de 72 horas desde que tome conocimiento razonable del incidente.</p>
        <p><strong>Transferencias:</strong> Se autoriza el uso de sub-encargados cloud e IA ubicados fuera de Chile que garanticen estándares de seguridad adecuados.</p>
    </section>
    <section>
        <h4 class="text-base font-bold text-gray-900">IV. Anexo C: Niveles de Servicio (SLA)</h4>
        <p>Soporte técnico disponible en días hábiles (L-V, 09:00-18:00 CLT). La conectividad con terceros no está garantizada y depende de sus propias APIs.</p>
    </section>`;
}

function renderContratoCierre() {
    return `<section>
        <h4 class="text-base font-bold text-gray-900">V. Anexo D: Garantía de Retracto Técnico</h4>
        <p>Plazo de 180 días por fallas críticas del núcleo del software no resueltas en 15 días. Se excluyen mala configuración, módulos Beta, fallos en APIs de terceros o falta de conectividad del Cliente.</p>
    </section>
    <section>
        <h4 class="text-base font-bold text-gray-900">VI. Anexo E: Terminación y Exportación</h4>
        <p>Al término del contrato por cualquier causa, y sin perjuicio del acceso mínimo previsto para casos de mora, el Cliente tendrá 30 días para solicitar la exportación de sus datos operativos (.csv/.json). Luego, el Proveedor anonimizará o eliminará los datos operativos activos.</p>
    </section>
    <section>
        <h4 class="text-base font-bold text-gray-900">VII. Disposiciones Finales</h4>
        <p><strong>Prelación:</strong> 1) Ficha Comercial, 2) Anexos, 3) Contrato Maestro.</p>
        <p><strong>Jurisdicción:</strong> Ley chilena. Tribunales Ordinarios de Santiago.</p>
    </section>`;
}

function renderContratoMaestro() {
    return `${renderContratoGeneral()}${renderContratoTerminos()}${renderContratoAnexos()}${renderContratoCierre()}`;
}

export function renderContratacionRezervaPanel() {
    return `<div class="rounded-xl border border-gray-200 bg-white p-5 space-y-5">
        ${renderIntro()}
        <article class="prose prose-gray max-w-none text-sm text-gray-800 space-y-6">
            ${renderFichaComercial()}
            <hr class="border-gray-200">
            ${renderContratoMaestro()}
        </article>
    </div>`;
}
