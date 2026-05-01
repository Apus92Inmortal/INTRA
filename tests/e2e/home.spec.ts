import { expect, test } from "@playwright/test";

test("public home page loads and shows main CTAs", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: /Envía documentos y paquetes entre ciudades, hoy mismo/i,
    })
  ).toBeVisible();

  await expect(page.getByRole("link", { name: "Iniciar sesión" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Registrarse gratis" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Publicar envío" })).toBeVisible();
});
