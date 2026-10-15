import { expect, test } from "@playwright/test"

test("public responses include compatible security headers", async ({ request }) => {
  const response = await request.get("/")
  expect(response.ok()).toBe(true)
  const headers = response.headers()
  expect(headers["x-content-type-options"]).toBe("nosniff")
  expect(headers["x-frame-options"]).toBe("DENY")
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'")
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin")
  expect(headers["permissions-policy"]).toContain("camera=(self)")
})

test("indexing endpoints exclude private application routes", async ({ request }) => {
  const robots = await request.get("/robots.txt")
  expect(robots.ok()).toBe(true)
  expect(await robots.text()).toMatch(/Disallow: \/(?:app)?(?:\r?\n|$)/)
  const sitemap = await request.get("/sitemap.xml")
  expect(sitemap.ok()).toBe(true)
  expect(await sitemap.text()).not.toMatch(/<loc>[^<]*\/app(?:\/|<)/)
})

test("manual reconciliation cannot be triggered by navigation", async ({ request }) => {
  const response = await request.get("/api/internal/wompi-reconcile")
  expect(response.status()).toBe(405)
})

test("registration legal dialog supports keyboard dismissal and restores focus", async ({ page }) => {
  await page.goto("/register")
  const opener = page.getByRole("button", { name: "Términos y Condiciones", exact: true })
  await opener.click()
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  await expect.poll(() => dialog.evaluate(element => element.contains(document.activeElement))).toBe(true)
  await page.keyboard.press("Escape")
  await expect(dialog).not.toBeVisible()
  await expect(opener).toBeFocused()
})
