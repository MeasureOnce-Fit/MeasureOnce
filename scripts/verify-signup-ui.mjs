import { createRequire } from "node:module";
import assert from "node:assert/strict";
import fs from "node:fs";
const loadModule = createRequire(import.meta.url);
const { chromium } = loadModule(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.TEST_BASE_URL || "http://localhost:3100";
const output = process.env.TEST_OUTPUT || ".tmp/signup-check";
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto(`${base}/account?next=/fit-passport`);
  await page.getByRole("link", { name: "Create account", exact: true }).click();
  await page.waitForURL("**/account/signup?next=%2Ffit-passport");
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const logo = await page.locator("header > a").first().evaluate(el => {
      const once = el.querySelector("span");
      return { parentSize: getComputedStyle(el).fontSize, onceSize: getComputedStyle(once).fontSize, visible: getComputedStyle(once).display !== "none", color: getComputedStyle(once).color, overflow: document.documentElement.scrollWidth > innerWidth };
    });
    assert.equal(logo.parentSize, logo.onceSize);
    assert.equal(logo.visible, true);
    assert.equal(logo.color, "rgb(142, 65, 47)");
    assert.equal(logo.overflow, false);
    await page.screenshot({ path: `${output}/signup-${width}.png`, fullPage: true });
  }
  let requests = 0;
  await page.route("**/auth/v1/signup**", async route => {
    requests++;
    const body = route.request().postDataJSON();
    assert.ok(body.code_challenge, "Signup must use PKCE");
    assert.ok(new URL(route.request().url()).searchParams.get("redirect_to").includes("/auth/callback?next=%2Ffit-passport"));
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "10000000-0000-4000-8000-000000000099", aud: "authenticated", role: "authenticated", email: body.email, identities: [], app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() }) });
  });
  await page.getByLabel("Email", { exact: true }).fill("signup-ui@measureonce.example");
  await page.getByLabel("Password", { exact: true }).fill("SyntheticPassword!2026");
  await page.getByLabel("Confirm password", { exact: true }).fill("DifferentPassword!2026");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await page.getByText("The passwords do not match.", { exact: true }).waitFor();
  assert.equal(requests, 0);
  await page.getByLabel("Confirm password", { exact: true }).fill("SyntheticPassword!2026");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await page.getByRole("heading", { name: "Check your email." }).waitFor();
  assert.equal(requests, 1);
  assert.equal(await page.locator('input[type="password"]').count(), 0);
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await page.waitForURL("**/account?next=%2Ffit-passport");
  await page.goto(`${base}/auth/callback?code=invalid&next=https://example.com`);
  await page.waitForURL("**/account/signup?confirmation=expired&next=%2F");
  await page.getByRole("status").waitFor();
  for (const department of ["men", "women"]) {
    await page.goto(`${base}/shop/${department}`);
    assert.equal(await page.getByText(/100 styles to explore/).count(), 0);
    await page.getByText(department === "men" ? "Everyday pieces. A style that’s yours." : "Your wardrobe. Your way.", { exact: true }).waitFor();
  }
  assert.deepEqual(errors, []);
  console.log("PASS: responsive account logo, signup navigation, mismatch validation, mocked email-pending state, PKCE destination, invalid callback recovery and department copy. Email delivery is not tested by this UI suite.");
} finally { await browser.close(); }
