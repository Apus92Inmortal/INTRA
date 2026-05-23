export type LegalDocumentSection = {
  title: string
  paragraphs?: string[]
  bullets?: string[]
  groups?: {
    title: string
    paragraphs?: string[]
    bullets?: string[]
  }[]
}

export type LegalDocument = {
  id: "shipping-policy" | "payments-policy"
  title: string
  shortTitle: string
  version: string
  updatedAtLabel: string
  intro: string
  acceptanceLabel: string
  sections: LegalDocumentSection[]
}

export const SHIPPING_POLICY_DOCUMENT: LegalDocument = {
  id: "shipping-policy",
  title: "Política de Envíos y Artículos Prohibidos",
  shortTitle: "Envíos y Artículos Prohibidos",
  version: "1.0",
  updatedAtLabel: "23 de mayo de 2026",
  intro:
    "Esta política regula la publicación, coordinación y transporte de artículos dentro de INTRA, incluyendo la declaración responsable del envío, restricciones y artículos prohibidos.",
  acceptanceLabel:
    "He leído y acepto la declaración del envío y la Política de Envíos y Artículos Prohibidos.",
  sections: [
    {
      title: "1. Objetivo de la política",
      paragraphs: [
        "La presente Política de Envíos y Artículos Prohibidos establece las reglas aplicables al uso de INTRA para la publicación, coordinación y transporte de artículos entre usuarios.",
        "El objetivo de esta política es promover una operación segura, prevenir riesgos, evitar actividades ilegales, proteger a remitentes y viajeros, y definir claramente qué artículos pueden o no pueden utilizarse dentro de la plataforma.",
      ],
    },
    {
      title: "2. Alcance",
      paragraphs: [
        "Esta política aplica a remitentes o clientes, viajeros o transportadores independientes, publicaciones de envío, matches y operaciones relacionadas con transporte de artículos dentro de INTRA.",
        "El uso de la plataforma implica aceptación de esta política conforme a los mecanismos de autorización implementados por INTRA.",
      ],
    },
    {
      title: "3. Obligaciones del remitente",
      paragraphs: [
        "El remitente deberá publicar información real, completa y actualizada sobre el envío.",
        "El remitente será responsable por información falsa, omisiones relevantes, artículos no declarados, artículos mal declarados, contenido ilegal o prohibido, y riesgos derivados del embalaje inadecuado.",
        "INTRA no está obligada a inspeccionar físicamente todos los paquetes publicados o transportados dentro de la plataforma. La responsabilidad sobre la veracidad de la información declarada y sobre el contenido real del paquete corresponde principalmente al remitente.",
      ],
      bullets: [
        "Contenido declarado.",
        "Peso aproximado.",
        "Valor declarado.",
        "Origen y destino.",
        "Características relevantes del paquete.",
        "Restricciones especiales si existen.",
      ],
    },
    {
      title: "4. Embalaje adecuado",
      paragraphs: [
        "El remitente deberá garantizar que el paquete esté correctamente empacado, sea seguro para transporte, proteja adecuadamente el contenido y no represente riesgo para personas, vehículos u otros artículos.",
        "INTRA podrá limitar o rechazar operaciones cuando el embalaje no cumpla condiciones mínimas de seguridad operativa.",
      ],
    },
    {
      title: "5. Límites operativos",
      paragraphs: [
        "INTRA podrá establecer límites operativos relacionados con peso máximo, dimensiones, valor declarado máximo, categorías permitidas y restricciones especiales según tipo de artículo.",
        "Valores operativos actuales: peso máximo permitido de 10 kg por envío; valor declarado máximo para usuarios no verificados de $300.000 COP; valor declarado máximo para usuarios verificados de $2.000.000 COP.",
        "INTRA podrá actualizar estos límites conforme evolucione la operación de la plataforma.",
      ],
    },
    {
      title: "6. Artículos permitidos de forma general",
      paragraphs: [
        "De manera general, podrán permitirse artículos de uso personal o comercial de bajo riesgo, siempre que sean legales, estén correctamente declarados, cumplan esta política y no representen riesgos operativos o regulatorios.",
        "La aceptación final de un envío dependerá también de la decisión del viajero, validaciones operativas y controles de seguridad implementados por INTRA.",
      ],
    },
    {
      title: "7. Artículos prohibidos",
      paragraphs: [
        "Está estrictamente prohibido utilizar INTRA para transportar artículos cuya posesión, transporte o comercialización sea ilegal, peligrosa o restringida por la legislación colombiana.",
      ],
      bullets: [
        "Armas, municiones y explosivos.",
        "Sustancias ilícitas.",
        "Dinero en efectivo.",
        "Animales vivos.",
        "Mercancía robada o material ilegal.",
        "Medicamentos controlados sin autorización.",
        "Sustancias químicas peligrosas, líquidos inflamables, gases o elementos tóxicos.",
        "Artículos peligrosos para transporte civil.",
        "Productos restringidos por la legislación colombiana.",
        "Categorías adicionales que INTRA prohíba por seguridad, cumplimiento, regulación o riesgo operativo.",
      ],
    },
    {
      title: "8. Artículos restringidos o sujetos a revisión",
      paragraphs: [
        "Algunos artículos podrán requerir revisión adicional, validación o restricciones especiales.",
        "Los alimentos, perecederos, líquidos, cosméticos y productos similares podrán estar sujetos a condiciones especiales, validaciones adicionales, rechazo operativo, restricciones por ruta, revisión de embalaje o limitaciones derivadas de regulación aplicable.",
        "INTRA podrá solicitar información adicional, limitar cobertura operativa, restringir ciertos envíos, requerir verificaciones adicionales, impedir la publicación del envío o cancelar operaciones asociadas.",
      ],
      bullets: [
        "Electrónicos costosos.",
        "Documentos sensibles, documentos de identidad, pasaportes, tarjetas bancarias o documentos legales o financieros importantes.",
        "Joyas.",
        "Productos médicos.",
        "Cosméticos y alimentos.",
        "Artículos frágiles.",
        "Mercancía comercial.",
        "Artículos de alto valor.",
        "Paquetes con requisitos especiales de manejo.",
      ],
    },
    {
      title: "9. Responsabilidad del viajero",
      paragraphs: [
        "El viajero deberá actuar de buena fe y con criterio razonable al aceptar transportar un envío.",
        "El viajero podrá rechazar recoger o transportar un paquete cuando no coincida con lo declarado, presente señales de riesgo, esté mal embalado, parezca contener artículos prohibidos o restringidos, o genere sospecha razonable.",
        "El viajero no deberá abrir paquetes salvo que exista autorización expresa del remitente, procedimiento definido por INTRA, solicitud o intervención de autoridad competente.",
      ],
      bullets: [
        "Revisar la información declarada.",
        "No aceptar paquetes sospechosos.",
        "Reportar inconsistencias.",
        "No transportar artículos prohibidos.",
        "Colaborar con procesos de seguridad y validación.",
      ],
    },
    {
      title: "10. Evidencias de recogida y entrega",
      paragraphs: [
        "INTRA podrá solicitar evidencias relacionadas con recogida, entrega, estado del paquete, identidad de las partes y validaciones operativas.",
        "Las evidencias podrán incluir fotografías, confirmaciones digitales, códigos, soportes documentales y validaciones dentro de la plataforma.",
      ],
    },
    {
      title: "11. Medidas operativas y de seguridad de INTRA",
      paragraphs: [
        "Cuando INTRA detecte riesgos operativos, fraude, actividad sospechosa o incumplimientos, podrá bloquear publicaciones, cancelar operaciones, retener pagos temporalmente, abrir procesos de disputa, limitar funciones, suspender cuentas, solicitar verificaciones adicionales o reportar actividades a autoridades competentes cuando corresponda.",
      ],
    },
    {
      title: "12. Relación con pagos, reembolsos y disputas",
      paragraphs: [
        "Las operaciones relacionadas con pagos, retenciones, liberaciones, reembolsos, wallet y disputas se regirán además por las políticas específicas de pagos y términos aplicables de INTRA.",
        "El incumplimiento de esta política podrá afectar liberación de fondos, reembolsos, acceso a funciones y continuidad de la cuenta.",
      ],
    },
    {
      title: "13. Consecuencias por incumplimiento",
      paragraphs: [
        "El incumplimiento de esta política podrá generar cancelación del envío, suspensión temporal, bloqueo permanente de cuenta, retención preventiva de fondos, cancelación de operaciones, reportes a autoridades cuando aplique y restricciones futuras dentro de la plataforma.",
        "INTRA podrá tomar decisiones operativas preventivas para proteger la seguridad de usuarios y de la plataforma.",
      ],
    },
    {
      title: "14. Actualización de la política",
      paragraphs: [
        "INTRA podrá actualizar esta política cuando existan cambios operativos, regulatorios, técnicos, legales o relacionados con nuevas categorías de artículos o funcionalidades.",
        "Cuando existan cambios relevantes, INTRA podrá solicitar una nueva aceptación explícita de la versión correspondiente.",
      ],
    },
    {
      title: "15. Legislación aplicable",
      paragraphs: [
        "Esta política se interpreta conforme a la legislación de la República de Colombia.",
        "La aplicación específica de restricciones legales, categorías prohibidas, responsabilidades operativas y validaciones regulatorias deberá revisarse mediante validación legal especializada antes de publicación definitiva.",
      ],
    },
  ],
}

export const PAYMENTS_POLICY_DOCUMENT: LegalDocument = {
  id: "payments-policy",
  title: "Política de Pagos, Retenciones, Reembolsos y Disputas",
  shortTitle: "Pagos, Retenciones, Reembolsos y Disputas",
  version: "1.0",
  updatedAtLabel: "23 de mayo de 2026",
  intro:
    "Esta política establece las reglas de pagos, retenciones operativas, liberación de fondos, wallet, retiros, reembolsos, disputas y procesos financieros operativos dentro de INTRA.",
  acceptanceLabel:
    "He leído y acepto la Política de Pagos, Retenciones, Reembolsos y Disputas.",
  sections: [
    {
      title: "1. Objetivo de la política",
      paragraphs: [
        "La presente política establece las reglas relacionadas con pagos, retenciones operativas, liberación de fondos, wallet, retiros, reembolsos, disputas y procesos financieros operativos dentro de INTRA.",
        "El objetivo de esta política es brindar claridad a los usuarios, reducir riesgos operativos, prevenir fraude, proteger las operaciones dentro de la plataforma y definir el funcionamiento general de los procesos de pago entre remitentes y viajeros.",
      ],
    },
    {
      title: "2. Alcance",
      paragraphs: [
        "Esta política aplica a remitentes o clientes, viajeros o transportadores independientes, pagos realizados dentro de la plataforma, matches, wallet, retiros, retenciones operativas, disputas y operaciones relacionadas con dinero dentro de INTRA.",
        "El uso de las funcionalidades de pago implica aceptación de esta política conforme a los mecanismos de autorización implementados por INTRA.",
      ],
    },
    {
      title: "3. Proveedores de pago autorizados",
      paragraphs: [
        "INTRA podrá utilizar proveedores externos autorizados para procesar pagos dentro de la plataforma. Actualmente, INTRA podrá utilizar Wompi u otros proveedores autorizados que puedan implementarse posteriormente.",
        "Los pagos podrán procesarse mediante tarjetas, PSE, transferencias, billeteras digitales u otros medios habilitados por la pasarela correspondiente.",
        "INTRA no almacena directamente información completa de tarjetas bancarias o medios de pago sensibles procesados por la pasarela. La información sensible será gestionada directamente por los proveedores autorizados conforme a sus políticas y estándares de seguridad.",
      ],
    },
    {
      title: "4. Momento del pago del remitente",
      paragraphs: [
        "El remitente deberá realizar el pago conforme al flujo operativo definido por INTRA.",
        "Dependiendo de la operación, el pago podrá solicitarse antes de confirmar un envío, antes de habilitar determinadas funciones o antes de iniciar el transporte del paquete.",
        "La plataforma podrá impedir continuar ciertos procesos hasta que el pago correspondiente sea validado correctamente.",
      ],
    },
    {
      title: "5. Retención operativa de fondos",
      paragraphs: [
        "Dependiendo del flujo operativo implementado por INTRA, el dinero podrá permanecer retenido temporalmente en estado de retención operativa, saldo retenido operativo, fondos en revisión operativa o validación pendiente.",
        "La retención operativa podrá utilizarse para validar cumplimiento del proceso, reducir fraude, gestionar disputas, verificar evidencias, revisar operaciones sospechosas y proteger a las partes involucradas.",
        "La lógica de retención operativa dependerá de los sistemas implementados por INTRA, validaciones internas y funcionalidades de proveedores o pasarelas autorizadas.",
        "La retención operativa no debe interpretarse como servicio bancario, fiducia, depósito financiero, custodio financiero regulado ni actividad financiera regulada por parte de INTRA.",
      ],
    },
    {
      title: "6. Estados operativos de pago",
      paragraphs: [
        "Dependiendo del flujo operativo, los pagos dentro de INTRA podrán manejar estados como pendiente, procesando, retenido, liberado, reembolsado, fallido, cancelado o en disputa.",
        "Estos estados representan validaciones operativas y tecnológicas internas de la plataforma y podrán cambiar conforme avance cada operación.",
      ],
    },
    {
      title: "7. Liberación de fondos al viajero",
      paragraphs: [
        "El pago podrá liberarse al viajero cuando exista confirmación de entrega, se carguen evidencias requeridas, no exista disputa activa, venza la ventana de disputa correspondiente, finalicen revisiones operativas o antifraude y el proceso sea considerado satisfactorio conforme a las reglas de la plataforma.",
        "La liberación podrá ser automática, manual, parcial o mantenerse en revisión, dependiendo del flujo implementado por INTRA.",
        "El saldo del viajero podrá liberarse entre 24 y 48 horas después de finalizar correctamente el proceso, siempre que no existan disputas, bloqueos o revisiones activas.",
      ],
    },
    {
      title: "8. Operaciones en revisión",
      paragraphs: [
        "INTRA podrá mantener pagos, retiros o movimientos financieros en revisión cuando detecte fraude, actividad sospechosa, inconsistencias, disputas, artículos prohibidos, evidencia insuficiente, validaciones pendientes, riesgos operativos o posibles incumplimientos de políticas.",
        "Durante una revisión, INTRA podrá mantener fondos retenidos operativamente, congelar temporalmente movimientos, limitar funcionalidades, solicitar información adicional, requerir evidencias o suspender operaciones relacionadas.",
      ],
    },
    {
      title: "9. Cancelaciones",
      groups: [
        {
          title: "9.1 Cancelaciones antes de aceptar match",
          paragraphs: [
            "Dependiendo del estado de la operación, el usuario podrá cancelar el proceso antes de aceptar el match conforme a las reglas operativas de la plataforma.",
          ],
        },
        {
          title: "9.2 Cancelaciones después de aceptar match",
          paragraphs: [
            "Una vez aceptado un match, ciertas cancelaciones podrán generar restricciones, afectar reembolsos, activar revisiones, impactar reputación o requerir validación adicional.",
            "Las condiciones específicas aplicables quedan sujetas a reglas operativas, validaciones internas y futuras configuraciones comerciales de INTRA.",
          ],
        },
      ],
    },
    {
      title: "10. Reembolsos",
      paragraphs: [
        "Los reembolsos podrán aplicar en situaciones como pagos duplicados, pagos fallidos, cancelaciones válidas, operaciones no completadas, errores operativos, disputas resueltas a favor del usuario o validaciones internas de soporte.",
        "Los reembolsos podrán ser totales, parciales o no aplicar, dependiendo del caso y de las reglas operativas correspondientes.",
        "No todo reembolso necesariamente incluirá comisiones, costos de pasarela, cargos externos, impuestos o costos operativos cuando dichos valores no sean devueltos por el proveedor correspondiente o por condiciones operativas aplicables.",
        "Algunos reembolsos pueden excluir costos operativos, financieros, tributarios o cargos de terceros que no sean reversados a INTRA por los proveedores involucrados.",
      ],
    },
    {
      title: "11. Disputas",
      paragraphs: [
        "Los usuarios podrán abrir disputas relacionadas con entregas, estado del paquete, incumplimientos, fraude, diferencias operativas, pagos, evidencias u otros conflictos relacionados con la operación.",
        "INTRA podrá solicitar evidencias, revisar mensajes, validar actividad, analizar soportes, mantener fondos retenidos operativamente o tomar medidas operativas preventivas.",
        "Las evidencias podrán incluir fotografías, chats, confirmaciones, códigos, soportes de entrega, registros operativos e historial de actividad.",
        "El cliente podrá reportar una disputa dentro de las 24 horas siguientes a la entrega o finalización reportada del proceso. Las revisiones operativas pueden tomar hasta 72 horas hábiles.",
      ],
    },
    {
      title: "12. Wallet del viajero",
      groups: [
        {
          title: "12.1 Saldo pendiente",
          paragraphs: [
            "Corresponde a dinero asociado a operaciones retenidas operativamente, en validación, en revisión o que aún no pueden retirarse.",
          ],
        },
        {
          title: "12.2 Saldo disponible",
          paragraphs: [
            "Corresponde a dinero liberado, aprobado para retiro y que el viajero podrá solicitar retirar conforme a las reglas de la plataforma.",
          ],
        },
        {
          title: "12.3 Historial",
          paragraphs: [
            "Corresponde al registro de movimientos, liberaciones, retiros, ajustes, reembolsos y operaciones relacionadas con el balance operativo.",
            "La wallet corresponde únicamente a una funcionalidad operativa de la plataforma y no representa cuenta bancaria, depósito financiero, producto financiero regulado ni custodio financiero regulado.",
          ],
        },
      ],
    },
    {
      title: "13. Retiros",
      paragraphs: [
        "Los retiros podrán requerir cuenta verificada, validación de identidad, cumplimiento de políticas, revisión administrativa y verificaciones antifraude.",
        "Los retiros solo podrán enviarse a una cuenta verificada del viajero o un mecanismo de retiro validado por INTRA.",
        "El usuario podrá solicitar retiros conforme a los mecanismos habilitados por la plataforma. Una vez solicitado, el retiro puede tardar entre 24 y 72 horas hábiles.",
        "INTRA podrá rechazar solicitudes, mantener fondos retenidos operativamente, solicitar información adicional o mantener operaciones en revisión por razones de seguridad y cumplimiento.",
      ],
    },
    {
      title: "14. Comisiones y tarifas operativas",
      paragraphs: [
        "INTRA podrá cobrar tarifas operativas, comisiones, cargos de servicio y costos relacionados con el uso de la plataforma.",
        "El valor final mostrado al usuario incluye la tarifa operativa aplicable al uso de la plataforma y procesamiento del servicio.",
        "También podrán existir costos relacionados con pasarelas de pago, procesamiento, transferencias, medios externos, impuestos, cargos regulatorios u otros costos operativos.",
      ],
    },
    {
      title: "15. Pagos fallidos, duplicados o errores operativos",
      paragraphs: [
        "En caso de pagos fallidos, pagos duplicados, errores de procesamiento, inconsistencias de validación o problemas técnicos, INTRA podrá mantener operaciones en revisión, solicitar validaciones adicionales, coordinar verificaciones con la pasarela, realizar ajustes operativos o gestionar reembolsos cuando corresponda.",
      ],
    },
    {
      title: "16. Relación con otras políticas de INTRA",
      paragraphs: [
        "Esta política debe interpretarse conjuntamente con Términos y Condiciones, Política de Privacidad, Política de Envíos y Artículos Prohibidos y demás políticas operativas aplicables de INTRA.",
        "Las operaciones relacionadas con artículos prohibidos, fraude, incumplimientos, disputas y validaciones de seguridad podrán afectar pagos, liberaciones, reembolsos o retiros.",
      ],
    },
    {
      title: "17. Consecuencias por fraude o incumplimiento",
      paragraphs: [
        "INTRA podrá tomar medidas cuando detecte fraude, abuso de la plataforma, actividad sospechosa, manipulación de pagos, incumplimiento de políticas o uso indebido del sistema.",
        "Las medidas podrán incluir suspensión temporal, bloqueo permanente, retención operativa preventiva de fondos, cancelación de operaciones, restricciones operativas y reporte a autoridades cuando corresponda.",
      ],
    },
    {
      title: "18. Actualización de la política",
      paragraphs: [
        "INTRA podrá actualizar esta política cuando existan cambios operativos, técnicos, regulatorios, legales o relacionados con proveedores de pago y funcionalidades financieras.",
        "Cuando existan cambios relevantes, INTRA podrá solicitar una nueva aceptación explícita de la versión correspondiente.",
      ],
    },
    {
      title: "19. Legislación aplicable",
      paragraphs: [
        "Esta política se interpreta conforme a la legislación de la República de Colombia.",
        "La aplicación específica de reglas financieras, retenciones operativas, wallet, pagos, reembolsos, disputas y obligaciones regulatorias deberá revisarse mediante validación legal especializada antes de publicación definitiva.",
      ],
    },
  ],
}
