import { describe, expect, it } from "vitest";
import {
  getOnboardingCtaHref,
  getOnboardingCtaLabel,
  getOnboardingIntentLabel,
  getOnboardingSteps,
  isOnboardingIntent,
} from "@/lib/onboarding";

describe("onboarding helpers", () => {
  it("accepts only supported onboarding intents", () => {
    expect(isOnboardingIntent("send")).toBe(true);
    expect(isOnboardingIntent("travel")).toBe(true);
    expect(isOnboardingIntent("explore")).toBe(true);
    expect(isOnboardingIntent("wallet")).toBe(false);
    expect(isOnboardingIntent(null)).toBe(false);
  });

  it("maps each onboarding intent to its first real action", () => {
    expect(getOnboardingCtaHref("send")).toBe("/app/shipments/new");
    expect(getOnboardingCtaLabel("send")).toBe("Crear mi primer envío");
    expect(getOnboardingIntentLabel("send")).toBe("Crear envío");

    expect(getOnboardingCtaHref("travel")).toBe("/app/trips/new");
    expect(getOnboardingCtaLabel("travel")).toBe("Publicar mi primer viaje");
    expect(getOnboardingIntentLabel("travel")).toBe("Publicar viaje");

    expect(getOnboardingCtaHref("explore")).toBe("/app");
    expect(getOnboardingCtaLabel("explore")).toBe("Ir al dashboard");
    expect(getOnboardingIntentLabel("explore")).toBe("Explorar");
  });

  it("keeps every mini guide at exactly three short steps", () => {
    const intents = ["send", "travel", "explore"] as const;

    for (const intent of intents) {
      const steps = getOnboardingSteps(intent);

      expect(steps).toHaveLength(3);
      for (const step of steps) {
        expect(step.title.length).toBeGreaterThan(0);
        expect(step.description.length).toBeGreaterThan(0);
        expect(step.description.length).toBeLessThanOrEqual(120);
      }
    }
  });
});
