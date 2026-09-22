import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.TEST_BASE_URL || "http://localhost:3200";
const artifactDir = process.env.ARTIFACT_DIR || ".tmp/unknown-brand-ui";

await mkdir(artifactDir, { recursive: true });

async function openDressFit(page) {
  await page.goto(`${base}/shop/women`, { waitUntil: "domcontentloaded" });
  const product = page.locator(".product-card").filter({ hasText: "Aster Fold Taffeta Midi Dress" }).first();
  await product.waitFor();
  await product.getByRole("button", { name: "Find my size" }).click();
  await page.getByRole("button", { name: "Continue as guest" }).click();
}

async function runManualGarmentJourney(page, compact = false) {
  await openDressFit(page);
  await page.getByRole("button", { name: /Measure a garment that fits/ }).click();
  await page.getByRole("group", { name: "Flat chest / bust" }).getByRole("textbox").fill("45");
  await page.getByRole("group", { name: "Flat waist" }).getByRole("textbox").fill("36");
  await page.getByRole("group", { name: "Flat hip / seat" }).getByRole("textbox").fill("49");
  for (const groupName of ["Chest / bust fit", "Waist fit", "Hip / seat fit"]) {
    await page.getByRole("group", { name: groupName }).getByText("Just right", { exact: true }).click();
  }
  await page.getByRole("button", { name: /Use these garment measurements/ }).click();
  await page.getByRole("button", { name: /See my match/ }).click();
  await page.waitForFunction(() => !document.querySelector(".result-card")?.textContent?.includes("Finding your size"));
  const result = await page.locator(".result-card").innerText();
  assert.match(result, /Closest measured match to your garment/i);
  assert.doesNotMatch(result, /More evidence is needed|We need another measurement|chest_bust|hip_seat/i);
  assert.equal(await page.locator(".result-card h2").evaluate((heading) => document.activeElement === heading), true);
  if (compact) {
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
  }
  await page.screenshot({ path: `${artifactDir}/${compact ? "compact" : "desktop"}-manual-result.png`, fullPage: false });
}

async function runNoMeasurementJourney(page) {
  await openDressFit(page);
  let recommendationPosts = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes("/api/fit/")) recommendationPosts += 1;
  });
  await page.getByRole("button", { name: /I can't measure right now/ }).click();
  await page.getByLabel("Brand (optional)").fill("Outside Label");
  await page.getByLabel("Size on the label (optional)").fill("M");
  await page.getByRole("group", { name: "Chest / bust fit" }).getByText("Just right", { exact: true }).click();
  await page.getByRole("button", { name: /Continue without a measured recommendation/ }).click();
  const result = page.locator(".result-card");
  await result.waitFor();
  assert.match(await result.innerText(), /Remembered context for this visit|don'?t have enough measured evidence/i);
  assert.equal(recommendationPosts, 0, "Label-only evidence must not call a recommendation endpoint.");
  assert.equal(await result.getByRole("button", { name: /Use body measurements/ }).count(), 1);
  assert.equal(await result.getByRole("button", { name: /Measure a garment/ }).count(), 1);
  await page.screenshot({ path: `${artifactDir}/desktop-no-measurement.png`, fullPage: false });
}

const browser = await chromium.launch({ headless: true });
try {
  const desktop = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await runManualGarmentJourney(desktop);
  await desktop.close();

  const unmeasured = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await runNoMeasurementJourney(unmeasured);
  await unmeasured.close();

  const compact = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await runManualGarmentJourney(compact, true);
  await compact.close();

  console.log("PASS: unknown-brand manual measurements and label-only abstention work on desktop and compact viewports.");
} finally {
  await browser.close();
}
