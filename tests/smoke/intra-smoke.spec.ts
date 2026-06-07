import { expect, test, type Browser, type Page } from "@playwright/test";

type SmokeRole = "cliente" | "viajero" | "admin";

type SmokeCredentials = {
  email: string;
  password: string;
};

const shipmentDescription = `Smoke envio temporal ${Date.now()}`;
const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);

function getRequiredSecret(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Falta el secret requerido ${name}.`);
  }

  return value;
}

function getCredentials(role: SmokeRole): SmokeCredentials {
  if (role === "cliente") {
    return {
      email: getRequiredSecret("SMOKE_CLIENT_EMAIL"),
      password: getRequiredSecret("SMOKE_CLIENT_PASSWORD"),
    };
  }

  if (role === "viajero") {
    return {
      email: getRequiredSecret("SMOKE_TRAVELER_EMAIL"),
      password: getRequiredSecret("SMOKE_TRAVELER_PASSWORD"),
    };
  }

  return {
    email: getRequiredSecret("SMOKE_ADMIN_EMAIL"),
    password: getRequiredSecret("SMOKE_ADMIN_PASSWORD"),
  };
}

async function newSmokePage(browser: Browser, role: SmokeRole) {
  const context = await browser.newContext();
  const page = await context.newPage();

  await test.step(`login ${role}`, async () => {
    const { email, password } = getCredentials(role);

    await page.goto("/app?tab=login");
    await expect(
      page.getByRole("heading", { name: /Bienvenido de nuevo/i })
    ).toBeVisible();

    await page.getByPlaceholder("tu@email.com").fill(email);
    await page.getByPlaceholder("tu contraseña").fill(password);
    await page.getByRole("button", { name: /^Entrar$/i }).click();

    await expect(page.getByRole("link", { name: /^Inicio$/i })).toBeVisible();
  });

  return { context, page };
}

async function openNotifications(page: Page) {
  await page.getByRole("button", { name: "Notificaciones" }).click();
  await expect(page.getByRole("heading", { name: "Notificaciones" })).toBeVisible();
}

async function closeNotifications(page: Page) {
  await page.keyboard.press("Escape");
}

async function selectCity(page: Page, selector: string, preferredNames: string[]) {
  const selectedValue = await page.locator(selector).evaluate((select, names) => {
    const element = select as HTMLSelectElement;
    const options = Array.from(element.options).filter((option) => option.value);
    const preferred = options.find((option) =>
      (names as string[]).some((name) =>
        option.textContent?.toLowerCase().includes(name.toLowerCase())
      )
    );

    return preferred?.value ?? options[0]?.value ?? "";
  }, preferredNames);

  if (!selectedValue) {
    throw new Error(`No hay ciudades disponibles para ${selector}.`);
  }

  await page.locator(selector).selectOption(selectedValue);
}

async function fillCompatibleRoute(page: Page, prefix: "shipment" | "trip") {
  await selectCity(page, `#${prefix}-origin-city`, ["Bogotá", "Bogota"]);
  await selectCity(page, `#${prefix}-destination-city`, ["Medellín", "Medellin"]);
}

test.describe.configure({ mode: "serial" });

test("cliente temporal: dashboard, notificaciones y envío hasta checkout seguro", async ({
  browser,
}) => {
  const { context, page } = await newSmokePage(browser, "cliente");

  await test.step("dashboard cliente carga", async () => {
    await page.goto("/app");
    await expect(page.getByRole("link", { name: /^Inicio$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Crear envío/i }).first()).toBeVisible();
  });

  await test.step("campana cliente carga", async () => {
    await openNotifications(page);
    await expect(
      page.getByText(/Cargando|Sin novedades|Marcar leídas/i).first()
    ).toBeVisible();
    await closeNotifications(page);
  });

  await test.step("crear envío llega a checkout sin pago real", async () => {
    await page.goto("/app/shipments/new");
    await page.getByRole("button", { name: /Continuar/i }).click();
    await expect(page.getByText(/Revisa los campos marcados/i)).toBeVisible();

    await fillCompatibleRoute(page, "shipment");
    await page.locator("#shipment-kind").selectOption("document");
    await page.locator("#shipment-description").fill(shipmentDescription);
    await page.locator("#shipment-weight-kg").fill("1");
    await page.locator("#shipment-declared-value").fill("50000");

    await page.getByRole("button", { name: /Continuar/i }).click();
    await expect(page).toHaveURL(/\/app\/payments\/checkout/);
    await expect(page.getByText(/Checkout seguro/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Pagar con Wompi/i })).toBeVisible();
  });

  await context.close();
});

test("viajero temporal: dashboard, notificaciones y publicación de viaje", async ({
  browser,
}) => {
  const { context, page } = await newSmokePage(browser, "viajero");

  await test.step("dashboard viajero carga", async () => {
    await page.goto("/app");
    await expect(page.getByRole("link", { name: /^Inicio$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Publicar viaje/i }).first()).toBeVisible();
  });

  await test.step("campana viajero carga", async () => {
    await openNotifications(page);
    await expect(
      page.getByText(/Cargando|Sin novedades|Marcar leídas/i).first()
    ).toBeVisible();
    await closeNotifications(page);
  });

  await test.step("crear viaje compatible si formulario lo permite", async () => {
    await page.goto("/app/trips/new");
    await fillCompatibleRoute(page, "trip");
    await page.locator("#trip-departure-date").fill(tomorrow);
    await page.locator("#trip-departure-time").fill("10:30");
    await page.locator("#trip-capacity-kg").fill("5");
    await page.locator("#trip-flight-number").fill("AV1234");

    await page.getByRole("button", { name: /Publicar viaje/i }).click();

    await expect(
      page.getByText(/Viaje publicado correctamente|Error publicando viaje/i)
    ).toBeVisible();

    const errorMessage = page.getByText(/Error publicando viaje/i);
    if (await errorMessage.isVisible()) {
      throw new Error("El formulario de viaje no permitió publicar el viaje temporal.");
    }

    await expect(page).toHaveURL(/\/app/);
  });

  await test.step("oportunidades compatibles no rompen", async () => {
    await page.goto("/app#envios-compatibles");
    await expect(
      page.getByText(/Envíos compatibles|No hay envíos compatibles|Publica un envío/i).first()
    ).toBeVisible();
  });

  await context.close();
});

test("admin temporal: paneles administrativos cargan", async ({ browser }) => {
  const { context, page } = await newSmokePage(browser, "admin");

  await test.step("panel admin carga", async () => {
    await page.goto("/app/admin");
    await expect(page.getByRole("heading", { name: /Panel de Administración/i })).toBeVisible();
  });

  await test.step("payouts cargan y guard sin referencia si hay caso seguro", async () => {
    await page.goto("/app/admin/payouts");
    await expect(page.getByRole("heading", { name: /Panel de Administración/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Retiros/i })).toBeVisible();

    const markPaid = page.getByRole("button", { name: /Marcar pagado/i }).first();
    if ((await markPaid.count()) > 0 && (await markPaid.isEnabled())) {
      await markPaid.click();
      await expect(
        page.getByText(/referencia externa|Registra la referencia/i).first()
      ).toBeVisible();
    }
  });

  await test.step("verificaciones cargan", async () => {
    await page.goto("/app/admin/verifications");
    await expect(page.getByRole("link", { name: /Verificaciones/i })).toBeVisible();
    await expect(page.getByText(/Verificaciones/i).first()).toBeVisible();
  });

  await test.step("disputas y reportes cargan", async () => {
    await page.goto("/app/admin/disputes");
    await expect(page.getByRole("link", { name: /Disputas/i })).toBeVisible();
    await expect(page.getByText(/Disputas|reportes|alertas/i).first()).toBeVisible();
  });

  await context.close();
});
