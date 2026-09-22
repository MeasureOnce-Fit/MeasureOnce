import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.TEST_BASE_URL || "http://localhost:3200";
const brands = [
  "Avenoir",
  "Caelune",
  "Cendra Lane",
  "Marrow & Vale",
  "Norellin",
  "Orivelle",
  "Solenne & Rue",
  "Tern & Thread",
  "Velmora",
  "Virelle",
];
const sizes = ["XS", "S", "M", "L", "XL", "XXL"];

async function openKnownJacketSize(page) {
  await page.goto(`${base}/shop/men`, { waitUntil: "domcontentloaded" });
  const product = page.locator(".product-card").filter({ hasText: "Cairn Modern Harrington" }).first();
  await product.getByRole("button", { name: "Find my size" }).click();
  await page.getByRole("button", { name: /Continue as guest/ }).click();
  await page.getByRole("button", { name: /Find a size I know/ }).click();
}

const browser = await chromium.launch({ headless: true });
let completed = 0;
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  for (const brandName of brands) {
    for (const sizeLabel of sizes) {
      await openKnownJacketSize(page);
      const brand = page.getByLabel("Brand of a jacket you own");
      await brand.locator("option", { hasText: brandName }).waitFor({ state: "attached" });
      await brand.selectOption({ label: brandName });

      const size = page.getByLabel("Jacket size you wear");
      await size.waitFor();
      assert.deepEqual(
        (await size.locator("option").allTextContents()).slice(1),
        sizes,
        `${brandName} must expose the complete ordered jacket range`,
      );
      await size.selectOption({ label: sizeLabel });

      const groups = await page.locator(".fit-matrix").getByRole("group").all();
      assert.equal(groups.length, 3, `${brandName} ${sizeLabel} must ask the three jacket fit questions`);
      for (const group of groups) await group.getByText("Just right", { exact: true }).click();

      await page.getByRole("button", { name: "Use this size", exact: true }).click();
      await page.getByRole("button", { name: "See my match", exact: true }).click();
      const heading = page.locator(".result-card h2");
      await heading.waitFor();
      await page.waitForFunction(() => !document.querySelector(".result-card h2")?.textContent?.includes("Finding your size"));
      const result = (await heading.innerText()).trim();
      assert.match(result, /^Try /, `${brandName} ${sizeLabel} returned ${result}`);
      completed += 1;
    }
  }
  console.log(`PASS: ${completed} men’s jacket brand/size browser journeys returned a usable recommendation.`);
} finally {
  await browser.close();
}
