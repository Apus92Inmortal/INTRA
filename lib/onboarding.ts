export const ONBOARDING_INTENTS = ["send", "travel", "explore"] as const;

export type OnboardingIntent = (typeof ONBOARDING_INTENTS)[number];

export type OnboardingStep = {
  title: string;
  description: string;
};

const onboardingSteps: Record<OnboardingIntent, OnboardingStep[]> = {
  send: [
    {
      title: "Publica tu envío",
      description: "Indica origen, destino, peso y detalles del paquete.",
    },
    {
      title: "Recibe opciones compatibles",
      description: "INTRA cruza tu envío con viajeros que van por una ruta similar.",
    },
    {
      title: "Coordina desde la plataforma",
      description: "Usa el chat, revisa el proceso y continúa de forma segura.",
    },
  ],
  travel: [
    {
      title: "Publica tu viaje",
      description: "Indica ciudad de origen, destino, fecha y espacio disponible.",
    },
    {
      title: "Recibe solicitudes compatibles",
      description: "Acepta envíos que coincidan con tu ruta y capacidad.",
    },
    {
      title: "Coordina y completa el proceso",
      description: "Habla por chat, entrega evidencia y sigue el flujo de INTRA.",
    },
  ],
  explore: [
    {
      title: "Conoce tus módulos",
      description: "Dashboard, Envíos, Viajes, Matches, Chat, Wallet y Perfil.",
    },
    {
      title: "Entiende el flujo",
      description: "Puedes publicar un envío o un viaje cuando estés listo.",
    },
    {
      title: "Empieza a tu ritmo",
      description: "Explora la app y completa tu perfil para generar más confianza.",
    },
  ],
};

export function isOnboardingIntent(value: unknown): value is OnboardingIntent {
  return typeof value === "string" && ONBOARDING_INTENTS.includes(value as OnboardingIntent);
}

export function getOnboardingSteps(intent: OnboardingIntent) {
  return onboardingSteps[intent];
}

export function getOnboardingCtaHref(intent: OnboardingIntent) {
  if (intent === "send") return "/app/shipments/new";
  if (intent === "travel") return "/app/trips/new";
  return "/app";
}

export function getOnboardingCtaLabel(intent: OnboardingIntent) {
  if (intent === "send") return "Crear mi primer envío";
  if (intent === "travel") return "Publicar mi primer viaje";
  return "Ir al dashboard";
}

export function getOnboardingIntentLabel(intent: OnboardingIntent) {
  if (intent === "send") return "Crear envío";
  if (intent === "travel") return "Publicar viaje";
  return "Explorar";
}
