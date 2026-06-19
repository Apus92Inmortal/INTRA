import { expect, type Page, test } from "@playwright/test";

async function expectNoBrokenPage(page: Page) {
  await expect(page.locator("body")).not.toContainText(/500|Internal Server Error|Application error/i);
}

async function expectNoHorizontalScroll(page: Page) {
  await expect(
    page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
  ).resolves.toBe(true);
}

async function gotoPublicLinkPath(page: Page, name: string | RegExp) {
  const link = page.getByRole("link", { name }).first();
  await expect(link).toBeVisible();

  const href = await link.getAttribute("href");
  expect(href).toBeTruthy();

  const targetUrl = new URL(href!, page.url());
  await page.goto(`${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`);
}

test("public home page loads and shows current brand and CTAs", async ({ page }) => {
  await page.goto("/");

  await expectNoBrokenPage(page);
  await expect(page.getByRole("img", { name: "INTRA" }).first()).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: /Envía documentos y paquetes entre ciudades, hoy mismo/i,
    })
  ).toBeVisible();

  await expect(page.getByRole("link", { name: "Iniciar sesión" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Registrarse" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Publicar envío" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Publicar mi viaje" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Comenzar gratis" })).toBeVisible();
});

test("public navigation targets login and register auth views", async ({ page }) => {
  await page.goto("/");
  await gotoPublicLinkPath(page, "Iniciar sesión");

  await expectNoBrokenPage(page);
  await expect(page).toHaveURL(/\/app\?tab=login/);
  await expect(page.getByRole("heading", { name: "Entra a INTRA" })).toBeVisible();
  await expect(page.getByLabel("Correo")).toBeVisible();
  await expect(page.getByLabel("Contraseña")).toBeVisible();
  await expect(page.locator("form").getByRole("button", { name: "Entrar" })).toBeVisible();

  await page.goto("/");
  await gotoPublicLinkPath(page, "Registrarse");

  await expectNoBrokenPage(page);
  await expect(page).toHaveURL(/\/app\?tab=register/);
  await expect(page.getByRole("heading", { name: "Crea tu cuenta" })).toBeVisible();
  await expect(page.getByLabel("Nombre completo")).toBeVisible();
  await expect(page.getByLabel("Teléfono")).toBeVisible();
  await expect(page.getByLabel("Correo")).toBeVisible();
  await expect(page.getByLabel("Contraseña")).toBeVisible();
  await expect(page.locator("form").getByRole("button", { name: "Crear cuenta" })).toBeVisible();
});

test("public legal routes load from footer links", async ({ page }) => {
  await page.goto("/");

  await gotoPublicLinkPath(page, "Términos y condiciones");
  await expectNoBrokenPage(page);
  await expect(page).toHaveURL(/\/legal\/terms-conditions/);
  await expect(page.getByRole("heading", { name: "Términos y Condiciones" })).toBeVisible();

  await page.goto("/");
  await gotoPublicLinkPath(page, "Política de privacidad");
  await expectNoBrokenPage(page);
  await expect(page).toHaveURL(/\/legal\/privacy-policy/);
  await expect(page.getByRole("heading", { name: "Política de Privacidad" })).toBeVisible();
});

test("public routes do not overflow horizontally on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  for (const path of ["/", "/login", "/register", "/legal/terms-conditions", "/legal/privacy-policy"]) {
    await page.goto(path);
    await expectNoBrokenPage(page);
    await expectNoHorizontalScroll(page);
  }

  await page.setViewportSize({ width: 320, height: 740 });

  for (const path of ["/", "/login", "/register", "/legal/terms-conditions", "/legal/privacy-policy"]) {
    await page.goto(path);
    await expectNoBrokenPage(page);
    await expectNoHorizontalScroll(page);
  }
});
