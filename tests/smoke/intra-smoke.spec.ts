import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";

type SmokeRole = "cliente" | "viajero";

type SmokeRoleSpec = {
  role: SmokeRole;
  emailEnv: string;
  passwordEnv: string;
};

type RuntimeIssue = {
  source: "console" | "pageerror";
  message: string;
};

const roleSpecs: SmokeRoleSpec[] = [
  {
    role: "cliente",
    emailEnv: "SMOKE_CLIENT_EMAIL",
    passwordEnv: "SMOKE_CLIENT_PASSWORD",
  },
  {
    role: "viajero",
    emailEnv: "SMOKE_TRAVELER_EMAIL",
    passwordEnv: "SMOKE_TRAVELER_PASSWORD",
  },
];

const safeSections = [
  {
    label: "Inicio",
    heading: /Hola|Tu operación|Panel/i,
  },
  {
    label: "Matches",
    heading: /^Matches$/i,
  },
  {
    label: "Wallet",
    heading: /Mi wallet/i,
  },
  {
    label: "Perfil",
    heading: /Mi perfil/i,
  },
] as const;

function getRequiredSecret(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Falta el secret requerido ${name}.`);
  }

  return value;
}

function getCredentials(spec: SmokeRoleSpec) {
  return {
    email: getRequiredSecret(spec.emailEnv),
    password: getRequiredSecret(spec.passwordEnv),
  };
}

function attachRuntimeIssueCollector(page: Page) {
  const issues: RuntimeIssue[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      issues.push({
        source: "console",
        message: message.text().slice(0, 500),
      });
    }
  });

  page.on("pageerror", (error) => {
    issues.push({
      source: "pageerror",
      message: error.message.slice(0, 500),
    });
  });

  return issues;
}

async function newSmokePage(browser: Browser, spec: SmokeRoleSpec) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const runtimeIssues = attachRuntimeIssueCollector(page);

  await test.step(`login ${spec.role}`, async () => {
    const { email, password } = getCredentials(spec);

    await page.goto("/app?tab=login");
    await expect(page.getByRole("heading", { name: "Entra a INTRA" })).toBeVisible();

    await page.getByLabel("Correo").fill(email);
    await page.getByLabel("Contraseña").fill(password);
    await page.locator("form").getByRole("button", { name: /^Entrar$/i }).click();

    await expect(page.getByRole("link", { name: /^Inicio$/i })).toBeVisible();
    await expectNoFatalAppState(page);
  });

  return { context, page, runtimeIssues };
}

async function expectNoFatalAppState(page: Page) {
  await expect(
    page.getByText(
      /Application error|Internal Server Error|Error 500|This page could not be found|Página no encontrada|No pudimos cargar/i
    )
  ).toHaveCount(0);
}

function expectNoRuntimeIssues(runtimeIssues: RuntimeIssue[]) {
  expect(
    runtimeIssues,
    runtimeIssues
      .map((issue) => `${issue.source}: ${issue.message}`)
      .join("\n")
  ).toEqual([]);
}

async function expectAuthenticatedShell(page: Page) {
  await expect(page.getByRole("link", { name: /^Inicio$/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Matches$/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Wallet$/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Perfil$/i })).toBeVisible();
  await expectNoFatalAppState(page);
}

async function visitSafeSection(page: Page, section: (typeof safeSections)[number]) {
  await page.getByRole("link", { name: new RegExp(`^${section.label}$`, "i") }).click();
  await expect(page.getByRole("heading", { name: section.heading }).first()).toBeVisible();
  await expectAuthenticatedShell(page);
}

async function logout(context: BrowserContext, page: Page) {
  await page.goto("/app/profile");
  await expect(page.getByRole("heading", { name: /Mi perfil/i })).toBeVisible();
  await page.getByRole("button", { name: /Cerrar sesión/i }).click();
  await expect(page.getByRole("heading", { name: "Entra a INTRA" })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Inicio$/i })).toHaveCount(0);
  await context.close();
}

for (const spec of roleSpecs) {
  test(`${spec.role}: login, dashboard, navegacion segura y logout`, async ({ browser }) => {
    const { context, page, runtimeIssues } = await newSmokePage(browser, spec);

    await test.step("dashboard autenticado carga", async () => {
      await page.goto("/app");
      await expectAuthenticatedShell(page);
    });

    await test.step("navegacion basica segura carga", async () => {
      for (const section of safeSections) {
        await visitSafeSection(page, section);
      }
    });

    await test.step("logout cierra la sesion", async () => {
      await logout(context, page);
    });

    expectNoRuntimeIssues(runtimeIssues);
  });
}
