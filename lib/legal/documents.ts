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
  id: "terms-conditions" | "privacy-policy" | "shipping-policy" | "payments-policy"
  title: string
  shortTitle: string
  version: string
  updatedAtLabel: string
  intro: string
  acceptanceLabel: string
  sections: LegalDocumentSection[]
}

export const TERMS_CONDITIONS_DOCUMENT: LegalDocument = {
  id: "terms-conditions",
  title: "Términos y Condiciones",
  shortTitle: "Términos y Condiciones",
  version: "1.0",
  updatedAtLabel: "23 de mayo de 2026",
  intro:
    "Estos términos regulan el acceso y uso de INTRA, incluyendo la creación de cuenta, publicación de envíos, aceptación de viajes, pagos y obligaciones generales de los usuarios.",
  acceptanceLabel: "He leído y acepto los Términos y Condiciones.",
  sections: [
    {
      title: "1. Objeto",
      paragraphs: [
        "Estos Términos y Condiciones regulan el acceso, registro, navegación y uso de INTRA, una plataforma tecnológica que facilita la conexión entre usuarios que desean enviar artículos y usuarios viajeros o transportadores independientes dispuestos a transportar dichos artículos.",
        "INTRA actúa como plataforma de intermediación tecnológica y operación digital. INTRA no es empresa transportadora, operador postal, entidad financiera, aseguradora, banco, fiduciaria ni custodio financiero regulado.",
        "El uso de la plataforma implica la aceptación de estos términos, de las políticas operativas aplicables y de cualquier documento legal o regla adicional que INTRA publique o solicite aceptar dentro de sus flujos.",
      ],
    },
    {
      title: "2. Alcance del servicio",
      paragraphs: [
        "INTRA permite crear cuentas, publicar envíos, buscar rutas, aceptar o gestionar viajes, coordinar matches, realizar pagos operativos, solicitar retiros, gestionar evidencias y usar herramientas de soporte, seguridad y comunicación.",
        "Las funcionalidades disponibles pueden variar según el tipo de usuario, nivel de verificación, ubicación, disponibilidad operativa, estado de cuenta, cumplimiento de políticas y configuración técnica vigente.",
        "INTRA podrá modificar, suspender, limitar o retirar funcionalidades cuando existan razones técnicas, legales, comerciales, de seguridad, prevención de fraude o mejora del servicio.",
      ],
    },
    {
      title: "3. Registro y cuenta de usuario",
      paragraphs: [
        "Para usar determinadas funcionalidades, el usuario deberá crear una cuenta con información real, completa, verificable y actualizada.",
        "El usuario es responsable de mantener la confidencialidad de sus credenciales, dispositivos, sesiones y métodos de autenticación.",
        "INTRA podrá exigir validaciones adicionales de identidad, teléfono, correo, documentos, actividad, cuenta bancaria, método de retiro o cualquier otra información necesaria para proteger la operación.",
        "INTRA podrá rechazar registros, suspender cuentas o limitar funcionalidades cuando existan datos falsos, inconsistentes, incompletos, duplicados, fraudulentos o asociados a riesgo operativo.",
      ],
    },
    {
      title: "4. Tipos de usuario",
      paragraphs: [
        "Dentro de INTRA pueden existir usuarios remitentes o clientes, usuarios viajeros o transportadores independientes, administradores, operadores de soporte y otros perfiles que la plataforma habilite.",
        "Un mismo usuario podrá cumplir distintos roles si la plataforma lo permite y si cumple las verificaciones o requisitos aplicables.",
        "Cada rol tendrá responsabilidades, permisos, límites operativos y obligaciones específicas conforme a estos términos y a las políticas relacionadas.",
      ],
    },
    {
      title: "5. Uso permitido",
      paragraphs: [
        "El usuario se compromete a usar INTRA de forma lícita, responsable, transparente y conforme a la legislación aplicable, estos términos y las políticas vigentes.",
        "El usuario no podrá usar la plataforma para fraude, suplantación, lavado de activos, financiación de actividades ilícitas, transporte de artículos prohibidos, evasión de controles, manipulación de pagos, acoso, abuso, spam, ingeniería social o cualquier actividad ilegal o riesgosa.",
        "También está prohibido interferir con la seguridad, estabilidad, disponibilidad, integridad o funcionamiento técnico de la plataforma.",
      ],
    },
    {
      title: "6. Publicación y gestión de envíos",
      paragraphs: [
        "El remitente es responsable por la información publicada sobre cada envío, incluyendo descripción, contenido declarado, peso, valor, origen, destino, restricciones, estado del paquete y cualquier dato relevante para el transporte.",
        "El remitente declara que el contenido del envío es lícito, corresponde a lo informado y no contiene artículos prohibidos, peligrosos, restringidos o no declarados.",
        "INTRA podrá rechazar, cancelar, bloquear o revisar envíos cuando existan inconsistencias, sospechas, incumplimientos, riesgo para usuarios o posible violación de políticas.",
      ],
    },
    {
      title: "7. Obligaciones del viajero o transportador independiente",
      paragraphs: [
        "El viajero deberá actuar de buena fe, revisar la información disponible antes de aceptar un envío, cumplir las reglas operativas y reportar inconsistencias, riesgos o incidentes.",
        "El viajero podrá rechazar transportar un paquete cuando detecte señales de riesgo, diferencias frente a lo declarado, embalaje inadecuado, posible contenido prohibido o cualquier situación que comprometa su seguridad o la operación.",
        "El viajero es responsable por el manejo razonable del paquete una vez lo recibe, por reportar novedades y por cumplir los procesos de recogida, transporte y entrega definidos por INTRA.",
      ],
    },
    {
      title: "8. Pagos, wallet, retiros y retenciones",
      paragraphs: [
        "Los pagos, retenciones operativas, liberación de fondos, wallet, retiros, reembolsos y disputas se rigen por la Política de Pagos, Retenciones, Reembolsos y Disputas.",
        "INTRA podrá usar pasarelas, proveedores financieros, servicios de verificación y herramientas internas para procesar o administrar pagos y movimientos operativos.",
        "El usuario entiende que ciertos fondos pueden quedar retenidos temporalmente por validaciones operativas, disputas, prevención de fraude, evidencias pendientes, revisión manual o reglas de liberación aplicables.",
      ],
    },
    {
      title: "9. Evidencias, chats y soporte",
      paragraphs: [
        "INTRA podrá solicitar, conservar y revisar evidencias relacionadas con publicaciones, matches, recogidas, entregas, pagos, retiros, disputas, soporte, verificaciones y seguridad.",
        "Las evidencias pueden incluir fotografías, mensajes, datos de actividad, registros técnicos, confirmaciones, códigos, soportes documentales y comunicaciones entre usuarios o con soporte.",
        "El usuario acepta que estas evidencias podrán utilizarse para resolver disputas, prevenir fraude, validar operaciones, mejorar seguridad, cumplir obligaciones legales y proteger a los usuarios.",
      ],
    },
    {
      title: "10. Seguridad, fraude y cumplimiento",
      paragraphs: [
        "INTRA podrá aplicar controles de seguridad, análisis de riesgo, validaciones antifraude, límites operativos, revisiones manuales, bloqueos preventivos, suspensión de funcionalidades o cierre de cuenta cuando lo considere necesario.",
        "INTRA podrá reportar operaciones o usuarios a autoridades competentes cuando existan indicios de actividad ilegal, fraude, riesgo regulatorio, afectación a terceros o requerimiento legal.",
        "El usuario se compromete a colaborar con solicitudes razonables de verificación, soporte, disputa o cumplimiento.",
      ],
    },
    {
      title: "11. Limitación de responsabilidad",
      paragraphs: [
        "INTRA facilita herramientas tecnológicas y procesos operativos, pero no garantiza que todos los usuarios actúen correctamente ni que toda operación esté libre de riesgo.",
        "INTRA no será responsable por información falsa suministrada por usuarios, artículos no declarados, incumplimientos de terceros, eventos fuera de su control, fallas de proveedores externos, fuerza mayor, caso fortuito o uso indebido de la plataforma.",
        "Nada en estos términos limita responsabilidades que no puedan excluirse conforme a la legislación aplicable.",
      ],
    },
    {
      title: "12. Suspensión, terminación y restricciones",
      paragraphs: [
        "INTRA podrá limitar, suspender o terminar cuentas, envíos, matches, pagos, retiros o funcionalidades cuando detecte incumplimiento de términos, políticas, fraude, riesgo operativo, uso abusivo, información falsa o requerimientos legales.",
        "La suspensión o terminación podrá ser temporal o permanente, y podrá incluir bloqueo de operaciones en curso, revisión de fondos, conservación de evidencias y medidas de prevención adicionales.",
      ],
    },
    {
      title: "13. Propiedad intelectual y contenido",
      paragraphs: [
        "La plataforma, marca, interfaz, textos, diseños, flujos, software, bases de datos, procesos y elementos visuales de INTRA son propiedad de INTRA o de sus licenciantes, salvo que se indique lo contrario.",
        "El usuario conserva sus derechos sobre el contenido que aporta, pero autoriza a INTRA a usarlo en la medida necesaria para operar la plataforma, prestar soporte, resolver disputas, prevenir fraude y cumplir obligaciones legales.",
      ],
    },
    {
      title: "14. Modificaciones",
      paragraphs: [
        "INTRA podrá actualizar estos términos por cambios legales, operativos, técnicos, comerciales, de seguridad o por nuevas funcionalidades.",
        "Cuando existan cambios relevantes, INTRA podrá solicitar aceptación expresa de una nueva versión antes de permitir el uso de determinadas funcionalidades.",
      ],
    },
    {
      title: "15. Legislación aplicable",
      paragraphs: [
        "Estos términos se interpretan conforme a la legislación de la República de Colombia.",
        "Cualquier ajuste legal definitivo, cláusula especializada o requisito regulatorio deberá validarse con asesoría legal antes de publicación final.",
      ],
    },
  ],
}

export const PRIVACY_POLICY_DOCUMENT: LegalDocument = {
  id: "privacy-policy",
  title: "Política de Privacidad",
  shortTitle: "Privacidad",
  version: "1.0",
  updatedAtLabel: "23 de mayo de 2026",
  intro:
    "Esta política describe el tratamiento de datos personales dentro de INTRA, incluyendo datos de cuenta, contacto, operación, pagos, seguridad y soporte.",
  acceptanceLabel: "He leído y acepto la Política de Privacidad.",
  sections: [
    {
      title: "1. Objetivo",
      paragraphs: [
        "Esta Política de Privacidad explica cómo INTRA recolecta, usa, almacena, consulta, protege, comparte y conserva datos personales y datos operativos relacionados con el uso de la plataforma.",
        "La política aplica a usuarios registrados, visitantes, remitentes, viajeros, administradores, operadores, prospectos, usuarios de soporte y cualquier persona que interactúe con INTRA.",
        "El tratamiento de datos se realiza para habilitar la operación, proteger a los usuarios, prevenir fraude, resolver disputas, procesar pagos y cumplir obligaciones legales.",
      ],
    },
    {
      title: "2. Responsable del tratamiento",
      paragraphs: [
        "INTRA actúa como responsable del tratamiento de los datos personales recolectados directamente dentro de la plataforma, salvo los casos en que un proveedor externo actúe como responsable independiente conforme a sus propias políticas.",
        "Los canales de contacto, soporte o ejercicio de derechos podrán publicarse dentro de la plataforma o en los medios oficiales que INTRA habilite para tal fin.",
      ],
    },
    {
      title: "3. Datos que puede recolectar INTRA",
      paragraphs: [
        "INTRA puede recolectar datos de identificación, contacto, cuenta, autenticación, teléfono, correo electrónico, nombre, documento, dirección, ciudad, país, rol dentro de la plataforma y datos necesarios para verificar identidad o seguridad.",
        "También puede recolectar datos de publicaciones, envíos, viajes, matches, chats, evidencias, fotografías, confirmaciones, códigos, pagos, wallet, retiros, cuentas de retiro, soporte, disputas, auditoría y actividad dentro de la plataforma.",
        "INTRA puede recolectar datos técnicos como dirección IP, navegador, dispositivo, sistema operativo, identificadores de sesión, fecha y hora de acceso, eventos de seguridad, logs, cookies o tecnologías similares cuando sean necesarias para operar y proteger la plataforma.",
      ],
    },
    {
      title: "4. Datos sensibles y verificaciones",
      paragraphs: [
        "En algunos flujos, INTRA puede solicitar datos o evidencias sensibles o de especial protección, como documentos de identidad, fotografías, información asociada a seguridad, verificaciones antifraude o datos financieros operativos.",
        "Estos datos se tratan únicamente cuando sean necesarios para verificación, seguridad, prevención de fraude, cumplimiento legal, gestión de pagos, retiros, soporte o resolución de disputas.",
        "El usuario no debe cargar datos sensibles innecesarios dentro de campos abiertos, chats o descripciones de envío.",
      ],
    },
    {
      title: "5. Finalidades del tratamiento",
      paragraphs: [
        "INTRA podrá tratar datos personales para crear y administrar cuentas, autenticar usuarios, operar envíos, coordinar matches, procesar pagos, habilitar retiros, gestionar wallet, verificar identidad, prevenir fraude, resolver disputas, prestar soporte y enviar comunicaciones operativas.",
        "También podrá usar datos para mejorar la plataforma, analizar desempeño, generar métricas internas, mantener seguridad, auditar operaciones, cumplir obligaciones legales y atender requerimientos de autoridades competentes.",
      ],
    },
    {
      title: "6. Base de autorización",
      paragraphs: [
        "El tratamiento de datos se fundamenta en la autorización otorgada por el usuario, la necesidad de ejecutar la relación contractual o precontractual, el cumplimiento de obligaciones legales, el interés legítimo en proteger la plataforma y la necesidad de prevenir fraude o riesgos operativos.",
        "Cuando una finalidad requiera una autorización específica, INTRA podrá solicitar aceptación expresa dentro del flujo correspondiente.",
      ],
    },
    {
      title: "7. Proveedores y terceros",
      paragraphs: [
        "INTRA podrá compartir o permitir acceso limitado a datos personales con proveedores de autenticación, hosting, infraestructura, almacenamiento, pasarelas de pago, verificación, comunicaciones, analítica, soporte, seguridad, cumplimiento, auditoría o herramientas operativas.",
        "El acceso de proveedores se limita a las finalidades necesarias para prestar sus servicios y operar INTRA.",
        "Algunos proveedores pueden tener sus propias políticas de privacidad y actuar como responsables independientes respecto de ciertos datos, especialmente en pagos, autenticación o verificaciones externas.",
      ],
    },
    {
      title: "8. Pagos, wallet y retiros",
      paragraphs: [
        "Para procesar pagos, wallet, retiros, reembolsos, disputas y movimientos operativos, INTRA puede tratar datos financieros operativos, datos de cuenta de retiro, referencias de pago, estados de transacción, historial de movimientos y evidencias relacionadas.",
        "INTRA no almacena directamente información completa de tarjetas bancarias cuando el procesamiento lo realiza una pasarela de pago autorizada.",
        "Los proveedores de pago pueden tratar datos conforme a sus propias condiciones, políticas y estándares de seguridad.",
      ],
    },
    {
      title: "9. Chats, evidencias y soporte",
      paragraphs: [
        "Los mensajes, archivos, fotografías, soportes y evidencias cargadas dentro de INTRA pueden ser tratados para operar envíos, validar entregas, resolver disputas, prevenir fraude, prestar soporte, mejorar seguridad y cumplir obligaciones legales.",
        "INTRA podrá revisar estos datos cuando exista una disputa, reporte, incidente, riesgo operativo, solicitud de soporte, investigación interna o requerimiento legal.",
      ],
    },
    {
      title: "10. Seguridad y conservación",
      paragraphs: [
        "INTRA implementa medidas razonables de seguridad técnicas, administrativas y organizacionales para proteger los datos contra acceso no autorizado, pérdida, alteración, uso indebido o divulgación no autorizada.",
        "Los datos se conservarán durante el tiempo necesario para cumplir las finalidades descritas, operar la cuenta, resolver disputas, prevenir fraude, atender soporte, cumplir obligaciones legales, conservar evidencia y proteger derechos de INTRA o de terceros.",
        "Algunos datos podrán conservarse incluso después del cierre de cuenta cuando exista obligación legal, disputa, investigación, riesgo de fraude, auditoría o necesidad legítima de conservación.",
      ],
    },
    {
      title: "11. Derechos del titular",
      paragraphs: [
        "El usuario puede solicitar acceso, actualización, corrección, supresión, revocatoria de autorización o información sobre el uso de sus datos, conforme a la legislación aplicable.",
        "Algunas solicitudes podrán estar limitadas por obligaciones legales, necesidad de conservación, seguridad, prevención de fraude, disputas activas, operaciones pendientes o requerimientos contractuales.",
        "INTRA podrá solicitar verificación de identidad antes de atender una solicitud relacionada con datos personales.",
      ],
    },
    {
      title: "12. Comunicaciones",
      paragraphs: [
        "INTRA podrá enviar comunicaciones transaccionales, operativas, de seguridad, soporte, verificación, pagos, retiros, cambios de políticas, alertas, notificaciones y mensajes relacionados con el uso de la plataforma.",
        "Cuando se envíen comunicaciones comerciales o promocionales, INTRA habilitará los mecanismos de consentimiento o retiro que correspondan según la legislación aplicable.",
      ],
    },
    {
      title: "13. Menores de edad",
      paragraphs: [
        "INTRA no está dirigida a menores de edad. El usuario declara que cuenta con la edad y capacidad legal necesarias para registrarse y usar la plataforma.",
        "Si INTRA detecta una cuenta asociada a un menor de edad sin autorización válida, podrá suspenderla o eliminarla conforme a sus procesos internos.",
      ],
    },
    {
      title: "14. Transferencias internacionales",
      paragraphs: [
        "Algunos proveedores de infraestructura, almacenamiento, autenticación, pagos, soporte, analítica o seguridad pueden estar ubicados fuera de Colombia o tratar datos en otros países.",
        "El usuario entiende que sus datos pueden ser transferidos o transmitidos internacionalmente cuando sea necesario para prestar el servicio, operar la plataforma, proteger la seguridad o cumplir obligaciones aplicables.",
      ],
    },
    {
      title: "15. Actualizaciones",
      paragraphs: [
        "INTRA podrá actualizar esta política por cambios legales, técnicos, operativos, comerciales, de seguridad, proveedores, funcionalidades o prácticas de tratamiento.",
        "Cuando existan cambios relevantes, INTRA podrá solicitar una nueva aceptación expresa de la versión correspondiente.",
      ],
    },
    {
      title: "16. Legislación aplicable",
      paragraphs: [
        "Esta política se interpreta conforme a la legislación de la República de Colombia en materia de protección de datos personales.",
        "Cualquier ajuste legal definitivo, aviso de privacidad especializado o requisito regulatorio deberá validarse con asesoría legal antes de publicación final.",
      ],
    },
  ],
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
