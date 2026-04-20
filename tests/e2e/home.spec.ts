import { expect, test } from "@playwright/test";

test("public home page loads and shows main CTAs", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByText("Conecta con viajeros y envía tus paquetes sin complicaciones")
  ).toBeVisible();

  await expect(page.getByRole("link", { name: "Iniciar sesión" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Registrarse" })).toBeVisible();
});
