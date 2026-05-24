export type LegalDocumentSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  groups?: {
    title: string;
    paragraphs?: string[];
    bullets?: string[];
  }[];
};

export type LegalDocument = {
  id:
    | "terms-conditions"
    | "privacy-policy"
    | "shipping-policy"
    | "payments-policy";
  title: string;
  shortTitle: string;
  version: string;
  updatedAtLabel: string;
  intro: string;
  acceptanceLabel: string;
  sections: LegalDocumentSection[];
};

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
      "title": "1. ¿Qué es INTRA?",
      "paragraphs": [
        "INTRA es una plataforma tecnológica digital que conecta:",
        "- personas que necesitan enviar artículos entre ciudades (“Remitente” o “Cliente”),",
        "- con personas que ya realizarán un viaje y desean transportar envíos de manera independiente (“Viajero” o “Transportador Independiente”).",
        "INTRA facilita herramientas tecnológicas como:",
        "- publicación de viajes y envíos,",
        "- coincidencias (“matches”),",
        "- chat entre usuarios,",
        "- pagos digitales,",
        "- evidencias,",
        "- reputación,",
        "- verificaciones,",
        "- soporte operativo y gestión de disputas.",
        "INTRA no es:",
        "- una empresa transportadora tradicional,",
        "- una empresa de mensajería,",
        "- un operador logístico,",
        "- ni una aseguradora.",
        "El transporte es realizado directamente entre usuarios independientes que utilizan la plataforma."
      ]
    },
    {
      "title": "2. Roles dentro de la plataforma",
      "groups": [
        {
          "title": "2.1 Remitente o Cliente",
          "paragraphs": [
            "Es la persona que publica un envío y solicita que otro usuario lo transporte."
          ]
        },
        {
          "title": "2.2 Viajero o Transportador Independiente",
          "paragraphs": [
            "Es la persona que publica un viaje y acepta transportar un envío de manera independiente.",
            "El viajero no es empleado, representante ni contratista laboral de INTRA."
          ]
        },
        {
          "title": "2.3 INTRA",
          "paragraphs": [
            "INTRA actúa únicamente como plataforma tecnológica intermediaria que facilita la conexión y coordinación operativa entre usuarios."
          ]
        }
      ]
    },
    {
      "title": "3. Creación de cuenta",
      "paragraphs": [
        "Para utilizar INTRA, el usuario debe:",
        "- crear una cuenta válida,",
        "- proporcionar información real y actualizada,",
        "- mantener segura su contraseña,",
        "- utilizar únicamente cuentas propias.",
        "El usuario es responsable de toda actividad realizada desde su cuenta.",
        "INTRA podrá solicitar validaciones de identidad, documentos, fotografías u otros mecanismos de verificación para fines de seguridad, prevención de fraude y cumplimiento operativo."
      ]
    },
    {
      "title": "4. Uso permitido de la plataforma",
      "paragraphs": [
        "El usuario se compromete a:",
        "- utilizar INTRA de buena fe,",
        "- publicar información real,",
        "- mantener una conducta respetuosa,",
        "- no utilizar la plataforma para actividades ilegales,",
        "- no manipular pagos, reputaciones o matches.",
        "Está prohibido:",
        "- crear cuentas falsas,",
        "- usar identidades de terceros,",
        "- publicar información engañosa,",
        "- intentar evadir pagos o comisiones,",
        "- utilizar la plataforma para actividades ilícitas o fraudulentas."
      ]
    },
    {
      "title": "5. Publicación de envíos",
      "paragraphs": [
        "El remitente deberá publicar información real sobre:",
        "- origen y destino,",
        "- contenido del paquete,",
        "- peso aproximado,",
        "- valor declarado,",
        "- características relevantes del envío.",
        "El remitente es responsable por:",
        "- la legalidad del contenido,",
        "- el correcto embalaje,",
        "- la exactitud de la información publicada,",
        "- cualquier omisión relevante sobre el artículo transportado.",
        "INTRA podrá establecer:",
        "- límites máximos de valor declarado,",
        "- categorías restringidas,",
        "- condiciones especiales para determinados artículos,",
        "- restricciones operativas por seguridad o cumplimiento.",
        "Los artículos no declarados, mal declarados o reportados de manera engañosa serán responsabilidad exclusiva del remitente."
      ]
    },
    {
      "title": "6. Publicación de viajes",
      "paragraphs": [
        "El viajero deberá publicar información real sobre:",
        "- ruta,",
        "- fecha,",
        "- capacidad disponible,",
        "- restricciones o preferencias aplicables.",
        "El viajero se compromete a:",
        "- actuar de buena fe,",
        "- transportar únicamente artículos permitidos,",
        "- cumplir las normas legales aplicables,",
        "- mantener comunicación razonable durante el proceso."
      ]
    },
    {
      "title": "7. Match entre usuarios",
      "paragraphs": [
        "Cuando un envío y un viaje sean compatibles, INTRA podrá permitir un match entre las partes.",
        "El match no obliga automáticamente a aceptar el transporte.",
        "Cada usuario podrá:",
        "- aceptar,",
        "- rechazar,",
        "- cancelar solicitudes,",
        "según las reglas operativas de la plataforma.",
        "Una vez aceptado el match, ambas partes podrán utilizar herramientas como el chat y seguimiento operativo."
      ]
    },
    {
      "title": "8. Artículos prohibidos o restringidos",
      "paragraphs": [
        "Está prohibido utilizar INTRA para transportar artículos ilegales, peligrosos o restringidos.",
        "Entre ellos:",
        "- armas,",
        "- explosivos,",
        "- sustancias ilícitas,",
        "- dinero en efectivo,",
        "- animales vivos,",
        "- mercancía ilegal,",
        "- artículos peligrosos,",
        "- elementos prohibidos por la legislación colombiana.",
        "INTRA podrá:",
        "- bloquear publicaciones,",
        "- cancelar operaciones,",
        "- suspender cuentas,",
        "- reportar actividades sospechosas a las autoridades competentes.",
        "INTRA publicará una Política de Envíos y Artículos Prohibidos que hará parte integral de la operación de la plataforma."
      ]
    },
    {
      "title": "9. Pagos, retenciones y liberación de fondos",
      "paragraphs": [
        "INTRA podrá utilizar pasarelas de pago autorizadas para procesar transacciones dentro de la plataforma.",
        "Dependiendo del flujo operativo:",
        "- el dinero podrá permanecer retenido temporalmente,",
        "- liberarse al viajero una vez confirmado el avance correcto del proceso,",
        "- o mantenerse en revisión en caso de disputa o riesgo operativo.",
        "Los tiempos de:",
        "- liberación,",
        "- revisión,",
        "- reembolso,",
        "- disputa,",
        "- validación,",
        "podrán variar según cada caso.",
        "INTRA podrá suspender temporalmente movimientos financieros cuando detecte:",
        "- fraude,",
        "- inconsistencias,",
        "- actividad sospechosa,",
        "- reclamos activos,",
        "- riesgos operativos o legales.",
        "INTRA contará con una Política de Pagos, Retenciones, Reembolsos y Disputas que hará parte integral de la operación de la plataforma."
      ]
    },
    {
      "title": "10. Evidencias y verificaciones",
      "paragraphs": [
        "INTRA podrá solicitar evidencias relacionadas con:",
        "- recogida,",
        "- entrega,",
        "- identidad,",
        "- estado del paquete,",
        "- comprobantes o soportes operativos.",
        "Las evidencias podrán incluir:",
        "- fotografías,",
        "- documentos,",
        "- confirmaciones digitales,",
        "- registros de actividad dentro de la plataforma.",
        "Cualquier implementación futura relacionada con ubicación o seguimiento operativo deberá informarse expresamente en las políticas correspondientes."
      ]
    },
    {
      "title": "11. Disputas",
      "paragraphs": [
        "En caso de inconvenientes entre usuarios, INTRA podrá abrir procesos internos de revisión operativa.",
        "Las partes deberán colaborar entregando información y evidencias cuando sea solicitado.",
        "INTRA podrá tomar medidas temporales mientras se analiza un caso, incluyendo:",
        "- congelar fondos,",
        "- limitar funciones,",
        "- suspender cuentas,",
        "- cancelar operaciones."
      ]
    },
    {
      "title": "12. Reseñas y reputación",
      "paragraphs": [
        "Los usuarios podrán calificarse mutuamente al finalizar procesos.",
        "Las reseñas deben:",
        "- ser honestas,",
        "- respetuosas,",
        "- basadas en experiencias reales.",
        "Está prohibido:",
        "- manipular reputaciones,",
        "- publicar contenido ofensivo,",
        "- amenazar usuarios mediante reseñas.",
        "INTRA podrá moderar, ocultar o eliminar contenido que incumpla estas reglas."
      ]
    },
    {
      "title": "13. Suspensión o cancelación de cuentas",
      "paragraphs": [
        "INTRA podrá suspender o cancelar cuentas cuando detecte:",
        "- incumplimientos de estos términos,",
        "- fraude,",
        "- riesgos de seguridad,",
        "- comportamiento abusivo,",
        "- actividades ilegales,",
        "- uso indebido de la plataforma.",
        "La suspensión podrá ser temporal o permanente."
      ]
    },
    {
      "title": "14. Responsabilidad y limitación de responsabilidad",
      "paragraphs": [
        "INTRA actúa como plataforma tecnológica intermediaria entre usuarios independientes.",
        "INTRA no garantiza:",
        "- disponibilidad permanente de viajeros,",
        "- éxito de un match,",
        "- entrega efectiva de un envío,",
        "- comportamiento de los usuarios,",
        "- ausencia total de riesgos operativos.",
        "Cada usuario actúa bajo su propia responsabilidad.",
        "La responsabilidad relacionada con:",
        "- pérdida,",
        "- daño,",
        "- robo,",
        "- retrasos,",
        "- fraude,",
        "- incumplimientos entre usuarios,",
        "- artículos mal declarados,",
        "- contenido prohibido,",
        "deberá ser revisada y ajustada conforme a validación legal especializada y a la regulación colombiana aplicable.",
        "INTRA podrá establecer límites operativos, restricciones y procedimientos internos para reducir riesgos operativos y financieros dentro de la plataforma."
      ]
    },
    {
      "title": "15. Disponibilidad del servicio",
      "paragraphs": [
        "INTRA podrá:",
        "- actualizar funcionalidades,",
        "- modificar procesos,",
        "- realizar mantenimientos,",
        "- limitar temporalmente funciones,",
        "- suspender servicios por seguridad o mejoras técnicas."
      ]
    },
    {
      "title": "16. Actualización de términos y políticas",
      "paragraphs": [
        "INTRA podrá actualizar estos términos y políticas cuando existan cambios relevantes legales, operativos o técnicos.",
        "Cuando existan modificaciones importantes, la plataforma podrá solicitar una nueva aceptación explícita de la versión correspondiente antes de continuar utilizando determinadas funcionalidades."
      ]
    },
    {
      "title": "17. Protección de datos",
      "paragraphs": [
        "El tratamiento de datos personales se realizará conforme a la Política de Privacidad y a la normativa colombiana aplicable."
      ]
    },
    {
      "title": "18. Legislación aplicable y jurisdicción",
      "paragraphs": [
        "Estos términos se rigen por las leyes de la República de Colombia.",
        "Cualquier controversia relacionada con el uso de la plataforma será tratada bajo jurisdicción colombiana."
      ]
    }
  ],
};

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
      "title": "1. Responsable del tratamiento de datos",
      "paragraphs": [
        "INTRA es responsable del tratamiento de los datos personales recolectados a través de la plataforma.",
        "La plataforma opera como un servicio digital que conecta usuarios para coordinar envíos entre ciudades mediante viajeros independientes.",
        "INTRA realizará el tratamiento de datos personales conforme a la autorización previa, expresa e informada otorgada por el titular, de acuerdo con la legislación colombiana aplicable.",
        "El canal oficial de contacto para temas relacionados con privacidad y tratamiento de datos es soporte@intra.com.co o el mecanismo formal que INTRA habilite dentro de la plataforma.",
        "Canal oficial para consultas, reclamos, actualización, rectificación, eliminación o revocatoria de datos personales: soporte@intra.com.co",
        "Este canal funcionará mediante correo electrónico oficial, formulario o mecanismo formal habilitado por INTRA."
      ]
    },
    {
      "title": "2. Categorías de datos que puede recolectar INTRA",
      "paragraphs": [
        "INTRA podrá recolectar información necesaria para operar la plataforma de forma segura, funcional y conforme a obligaciones legales y operativas."
      ],
      "groups": [
        {
          "title": "2.1 Datos personales generales",
          "paragraphs": [
            "INTRA podrá recolectar:",
            "- nombre,",
            "- apellido,",
            "- correo electrónico,",
            "- número telefónico,",
            "- ciudad,",
            "- información básica de identificación y contacto."
          ]
        },
        {
          "title": "2.2 Datos de cuenta",
          "paragraphs": [
            "INTRA podrá almacenar:",
            "- credenciales de acceso,",
            "- contraseña cifrada,",
            "- fecha de registro,",
            "- estado de cuenta,",
            "- historial básico de actividad,",
            "- configuraciones relacionadas con autenticación y seguridad."
          ]
        },
        {
          "title": "2.3 Datos operativos de envíos y viajes",
          "paragraphs": [
            "INTRA podrá almacenar información relacionada con:",
            "Envíos:",
            "- origen,",
            "- destino,",
            "- contenido declarado,",
            "- peso,",
            "- valor declarado,",
            "- evidencias,",
            "- estado del envío,",
            "- historial operativo.",
            "Viajes:",
            "- rutas,",
            "- fechas,",
            "- capacidad disponible,",
            "- preferencias operativas,",
            "- historial de actividad y matches."
          ]
        },
        {
          "title": "2.4 Datos financieros operativos",
          "paragraphs": [
            "INTRA podrá almacenar información relacionada con:",
            "- estado de pagos,",
            "- referencias de transacción,",
            "- pagos retenidos,",
            "- wallet,",
            "- retiros,",
            "- historial financiero operativo,",
            "- estados de liberación, revisión o disputa.",
            "Los pagos podrán ser procesados por proveedores externos como Wompi u otras pasarelas autorizadas.",
            "INTRA no almacena directamente información sensible completa de tarjetas bancarias o medios de pago procesados por la pasarela.",
            "La información sensible relacionada con tarjetas y medios de pago será gestionada directamente por los proveedores de pago autorizados conforme a sus propias políticas y estándares de seguridad."
          ]
        },
        {
          "title": "2.5 Datos técnicos y antifraude",
          "paragraphs": [
            "INTRA podrá recolectar información técnica y de seguridad como:",
            "- dirección IP,",
            "- navegador,",
            "- dispositivo,",
            "- sistema operativo,",
            "- registros de acceso,",
            "- logs de actividad,",
            "- eventos de autenticación,",
            "- información antifraude,",
            "- información relacionada con seguridad operativa."
          ]
        },
        {
          "title": "2.6 Datos sensibles o de especial protección",
          "paragraphs": [
            "Dependiendo de las funcionalidades implementadas, INTRA podrá solicitar información relacionada con:",
            "- documentos de identidad,",
            "- fotografías,",
            "- verificaciones de identidad,",
            "- validaciones biométricas,",
            "- verificación facial,",
            "- evidencias relacionadas con seguridad o disputas.",
            "Este tipo de información podrá considerarse dato sensible o de especial protección cuando así lo determine la legislación aplicable.",
            "Cuando la ley lo requiera, INTRA solicitará autorización especial, reforzada o explícita para el tratamiento de este tipo de datos.",
            "INTRA procurará limitar la recolección de datos sensibles a lo estrictamente necesario para:",
            "- seguridad,",
            "- prevención de fraude,",
            "- validación de identidad,",
            "- resolución de disputas,",
            "- cumplimiento operativo y legal."
          ]
        },
        {
          "title": "2.7 Datos financieros y operativos delicados",
          "paragraphs": [
            "INTRA podrá almacenar información relacionada con:",
            "- cuentas de retiro,",
            "- entidad financiera,",
            "- nombre del titular,",
            "- referencias de transacción,",
            "- estados de pagos,",
            "- wallet,",
            "- retiros,",
            "- historial financiero operativo.",
            "Aunque esta información no necesariamente constituye dato sensible según la legislación aplicable, INTRA la tratará como información de acceso restringido y aplicará medidas reforzadas de seguridad y control de acceso.",
            "Los pagos podrán ser procesados por proveedores externos como Wompi u otras pasarelas autorizadas.",
            "INTRA no almacena directamente información sensible completa de tarjetas bancarias o medios de pago procesados por la pasarela.",
            "La información sensible relacionada con tarjetas y medios de pago será gestionada directamente por los proveedores de pago autorizados conforme a sus propias políticas y estándares de seguridad."
          ]
        }
      ]
    },
    {
      "title": "3. Finalidad del tratamiento de datos",
      "paragraphs": [
        "INTRA podrá utilizar los datos personales para:",
        "- operar correctamente la plataforma,",
        "- crear y administrar cuentas,",
        "- permitir matches entre usuarios,",
        "- verificar identidad,",
        "- procesar pagos y retiros,",
        "- prevenir fraude,",
        "- gestionar disputas,",
        "- enviar notificaciones,",
        "- brindar soporte,",
        "- cumplir obligaciones legales,",
        "- mejorar seguridad y funcionamiento del sistema,",
        "- generar auditoría y trazabilidad operativa."
      ]
    },
    {
      "title": "4. Comunicaciones operativas y comerciales",
      "groups": [
        {
          "title": "4.1 Comunicaciones operativas",
          "paragraphs": [
            "INTRA podrá enviar comunicaciones necesarias para:",
            "- acceso a la cuenta,",
            "- autenticación,",
            "- seguridad,",
            "- envíos,",
            "- viajes,",
            "- pagos,",
            "- wallet,",
            "- soporte,",
            "- disputas,",
            "- alertas operativas,",
            "- funcionamiento de la plataforma.",
            "Estas comunicaciones hacen parte de la operación normal del servicio."
          ]
        },
        {
          "title": "4.2 Comunicaciones comerciales o marketing",
          "paragraphs": [
            "En caso de implementar campañas comerciales, promociones o comunicaciones de marketing, INTRA podrá solicitar una autorización independiente o separada cuando la legislación aplicable lo requiera.",
            "El usuario podrá gestionar o revocar dichas autorizaciones conforme a los mecanismos habilitados por la plataforma."
          ]
        }
      ]
    },
    {
      "title": "5. Compartición de información",
      "paragraphs": [
        "INTRA podrá compartir información cuando sea necesario para operar correctamente la plataforma.",
        "Esto puede incluir:",
        "- proveedores tecnológicos,",
        "- servicios cloud o infraestructura,",
        "- pasarelas de pago como Wompi,",
        "- herramientas de verificación,",
        "- proveedores de seguridad,",
        "- autoridades competentes cuando exista obligación legal,",
        "- usuarios involucrados en un envío o match cuando sea necesario para coordinar la operación.",
        "INTRA no vende datos personales de los usuarios."
      ]
    },
    {
      "title": "6. Transferencia o almacenamiento internacional de datos",
      "paragraphs": [
        "Algunos proveedores tecnológicos, servicios cloud, pasarelas de pago o herramientas de infraestructura utilizadas por INTRA podrán operar dentro o fuera de Colombia.",
        "Como consecuencia, cierta información podrá almacenarse o procesarse en servidores ubicados en otros países.",
        "La legalidad, requisitos y mecanismos aplicables para transferencia internacional de datos deberán ser revisados y validados conforme a la normativa colombiana aplicable."
      ]
    },
    {
      "title": "7. Conservación de la información",
      "paragraphs": [
        "INTRA podrá conservar información:",
        "- mientras exista la cuenta activa,",
        "- mientras sea necesaria para operar la plataforma,",
        "- durante procesos de disputa,",
        "- por razones de seguridad,",
        "- auditoría,",
        "- prevención de fraude,",
        "- cumplimiento legal o regulatorio.",
        "La eliminación de ciertos datos podrá estar limitada por obligaciones legales, regulatorias o de seguridad."
      ]
    },
    {
      "title": "8. Derechos del titular de datos",
      "paragraphs": [
        "Conforme a la legislación colombiana aplicable, el usuario podrá:",
        "- conocer sus datos personales,",
        "- solicitar actualización o corrección,",
        "- solicitar eliminación cuando proceda,",
        "- revocar autorizaciones cuando legalmente sea posible,",
        "- presentar consultas o reclamos relacionados con sus datos personales.",
        "Las solicitudes podrán realizarse mediante el canal oficial definido por INTRA:",
        "Canal de contacto: soporte@intra.com.co",
        "Los tiempos de respuesta para consultas, reclamos y solicitudes deberán ajustarse a la legislación colombiana aplicable y quedan pendientes de validación legal especializada."
      ]
    },
    {
      "title": "9. Seguridad de la información",
      "paragraphs": [
        "INTRA implementará medidas razonables de seguridad para proteger la información contra:",
        "- accesos no autorizados,",
        "- pérdida,",
        "- alteración,",
        "- uso indebido,",
        "- divulgación no autorizada.",
        "Sin embargo, ningún sistema tecnológico puede garantizar seguridad absoluta.",
        "El usuario también es responsable de proteger el acceso a su cuenta y credenciales."
      ]
    },
    {
      "title": "10. Menores de edad",
      "paragraphs": [
        "INTRA está dirigida únicamente a personas mayores de edad con capacidad legal para utilizar la plataforma.",
        "No está permitido crear cuentas utilizando información falsa sobre edad o identidad."
      ]
    },
    {
      "title": "11. Cookies y tecnologías similares",
      "paragraphs": [
        "INTRA podrá utilizar cookies, sesiones u otras tecnologías similares para:",
        "- autenticación,",
        "- seguridad,",
        "- funcionamiento técnico,",
        "- análisis operativo,",
        "- mejora de experiencia de usuario.",
        "La configuración específica podrá ampliarse posteriormente en una política complementaria si aplica."
      ]
    },
    {
      "title": "12. Actualización de la política",
      "paragraphs": [
        "INTRA podrá actualizar esta Política de Privacidad cuando existan cambios:",
        "- legales,",
        "- regulatorios,",
        "- operativos,",
        "- técnicos,",
        "- o relacionados con nuevas funcionalidades.",
        "Cuando existan cambios relevantes, INTRA podrá solicitar una nueva aceptación explícita de la versión correspondiente."
      ]
    },
    {
      "title": "13. Legislación aplicable",
      "paragraphs": [
        "Esta política se interpreta conforme a la legislación de la República de Colombia.",
        "La aplicación específica de:",
        "- Ley 1581 de 2012,",
        "- Decreto 1377 de 2013,",
        "- normas de Habeas Data,",
        "- y demás regulación aplicable,",
        "deberá ser validada mediante revisión legal especializada antes de publicación definitiva."
      ]
    }
  ],
};

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
};

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
};
