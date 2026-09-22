import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.TEST_BASE_URL || "http://localhost:3200";
const artifactDir = process.env.ARTIFACT_DIR || ".tmp/fit-passport-known-size";

await mkdir(artifactDir, { recursive: true });

async function openJane(page) {
  await page.goto(`${base}/fit-passport?preview=ready`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /(?:View|Edit) profile/ }).first().click();
  await page.getByRole("button", { name: "Add a known size" }).click();
}

async function saveVerifiedReference(page) {
  await page.getByLabel("Brand").selectOption({ label: "Orivelle" });
  await page.getByLabel("Clothing type").selectOption("Jackets");
  await page.getByLabel("Size on the label").selectOption({ label: "8" });
  const chest = page.getByRole("group", { name: "Chest / bust fit" }).getByRole("button", { name: "Just right", exact: true });
  await chest.focus();
  await chest.press("Space");
  const shoulder = page.getByRole("group", { name: "Shoulder width fit" }).getByRole("button", { name: "Just right", exact: true });
  await shoulder.focus();
  await shoulder.press("Enter");
  await page.getByRole("group", { name: "Body length fit" }).getByText("Just right", { exact: true }).click();
  await page.getByRole("group", { name: "Sleeve length fit" }).getByText("Just right", { exact: true }).click();
  await page.getByText("Verified category size data", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Save known size" }).click();
  await page.getByText("Verified reference", { exact: true }).waitFor();
}

async function saveRememberedContext(page) {
  await page.getByRole("button", { name: "Add a known size" }).click();
  await page.getByLabel("Brand").selectOption("not-listed");
  await page.getByLabel("Brand name").fill("Outside Label");
  await page.getByLabel("Clothing type").selectOption("Jackets");
  await page.getByLabel("Size on the label").fill("M");
  await page.getByRole("group", { name: "Chest / bust fit" }).getByText("Just right", { exact: true }).click();
  await page.getByText("Saved as context — not used alone for recommendations", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Save known size" }).click();
  await page.getByText("Outside Label · Jackets · M", { exact: true }).waitFor();
}

async function saveListedBrandUnlistedSize(page) {
  await page.getByRole("button", { name: "Add a known size" }).click();
  await page.getByLabel("Brand").selectOption({ label: "Orivelle" });
  await page.getByLabel("Clothing type").selectOption("Jackets");
  await page.getByLabel("Size on the label").selectOption("not-listed");
  await page.getByLabel("Enter size on the label").fill("12");
  await page.getByText("Saved as context — not used alone for recommendations", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Save known size" }).click();
  await page.getByText("Orivelle · Jackets · 12", { exact: true }).waitFor();
}

async function saveBrandNotListedNamedLikeCatalog(page) {
  await page.getByRole("button", { name: "Add a known size" }).click();
  await page.getByLabel("Brand").selectOption("not-listed");
  await page.getByLabel("Brand name").fill("Orivelle");
  await page.getByLabel("Clothing type").selectOption("Jackets");
  await page.getByLabel("Size on the label").fill("8");
  await page.getByText("Saved as context — not used alone for recommendations", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Save known size" }).click();
  await page.getByText("Orivelle · Jackets · 8", { exact: true }).waitFor();
}

const browser = await chromium.launch({ headless: true });
try {
  const desktop = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await openJane(desktop);
  await saveVerifiedReference(desktop);
  assert.equal(await desktop.getByText("Orivelle · Jackets · 8", { exact: true }).count(), 1);
  await desktop.getByRole("button", { name: "Add a known size" }).click();
  await desktop.getByLabel("Brand").selectOption({ label: "Orivelle" });
  await desktop.getByLabel("Clothing type").selectOption("Jackets");
  await desktop.getByLabel("Size on the label").selectOption({ label: "8" });
  await desktop.getByRole("button", { name: "Save known size" }).click();
  await desktop.getByText("This known size is already saved for this profile.", { exact: true }).waitFor();
  assert.equal(await desktop.getByText("Orivelle · Jackets · 8", { exact: true }).count(), 1, "Duplicate known sizes must not be saved.");
  await desktop.getByRole("button", { name: "Cancel" }).click();
  await desktop.getByText("Orivelle · Jackets · 8", { exact: true }).locator("xpath=ancestor::article").getByRole("button", { name: "Remove" }).click();
  await desktop.getByText("Orivelle · Jackets · 8", { exact: true }).waitFor({ state: "detached" });
  await saveListedBrandUnlistedSize(desktop);
  await saveBrandNotListedNamedLikeCatalog(desktop);
  await saveRememberedContext(desktop);
  assert.equal(await desktop.getByText("Outside Label · Jackets · M", { exact: true }).count(), 1);
  await desktop.screenshot({ path: `${artifactDir}/desktop.png`, fullPage: false });
  await desktop.close();

  const compact = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await openJane(compact);
  await saveVerifiedReference(compact);
  assert.equal(await compact.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true, "Fit Passport known-size editor must not overflow at 390px.");
  await compact.screenshot({ path: `${artifactDir}/compact.png`, fullPage: false });
  await compact.close();

  console.log("PASS: Fit Passport saves verified category references and unverified remembered size context in preview mode.");
} finally {
  await browser.close();
}
