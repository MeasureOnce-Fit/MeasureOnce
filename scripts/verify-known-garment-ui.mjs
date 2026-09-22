import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.TEST_BASE_URL || "http://localhost:3100";
const artifactDir = process.env.ARTIFACT_DIR || ".tmp/known-garment-ui";
const catalogBrandNames = [
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

await mkdir(artifactDir, { recursive: true });

async function openFit(page, shop, productName) {
  await page.goto(`${base}${shop}`, { waitUntil: "domcontentloaded" });
  const product = page.locator(".product-card").filter({ hasText: productName }).first();
  await product.waitFor();
  await product.getByRole("button", { name: "Find my size" }).click();
  await page.getByRole("button", { name: "Continue as guest" }).click();
  await page.getByRole("button", { name: "Find a size I know" }).click();
  await page.getByRole("button", { name: "Find a size I know" }).click();
}

async function answerVisibleReferenceQuestions(page) {
  const matrix = page.locator(".fit-matrix");
  const groups = await matrix.getByRole("group").all();
  assert.ok(groups.length > 0, "A selected size must expose regional fit questions.");
  for (const group of groups) await group.getByText("Just right", { exact: true }).click();
}

async function completeVerifiedJourney(page, { shop, productName, categoryNoun, brandName, sizeLabel, expectedRegions }) {
  await openFit(page, shop, productName);
  const brand = page.getByLabel(`Brand of a ${categoryNoun} you own`);
  await brand.waitFor();
  assert.equal(await brand.isDisabled(), false, "Re-selecting the known-size path must not leave its brand select disabled.");
  const listedBrands = (await brand.locator("option").allTextContents()).filter((option) => catalogBrandNames.includes(option));
  assert.deepEqual(listedBrands, catalogBrandNames, "The brand picker must list every catalog brand that makes this category.");
  assert.equal(await page.getByLabel("Garment you own").count(), 0, "The primary known-size flow must not ask for an exact garment.");
  assert.equal(await page.getByLabel("Clothing type").count(), 0, "The target product already provides the clothing category.");
  await brand.selectOption({ label: brandName });

  const size = page.getByLabel(`${categoryNoun.replace(/^./, (letter) => letter.toUpperCase())} size you wear`);
  await size.waitFor();
  if (categoryNoun === "jeans") {
    const options = await size.locator("option").allTextContents();
    assert.ok(options.some((option) => /waist 30.*inseam 30/i.test(option)), "Jeans must preserve both waist and inseam axes in the known-size label.");
  }
  await size.selectOption({ label: sizeLabel });
  await answerVisibleReferenceQuestions(page);

  const post = page.waitForRequest((request) => request.method() === "POST" && request.url().includes("/api/fit/category-size-reference"));
  const response = page.waitForResponse((candidate) => candidate.request().method() === "POST" && candidate.url().includes("/api/fit/category-size-reference"));
  await page.getByRole("button", { name: "Use this size" }).click();
  await page.getByRole("button", { name: "See my match" }).click();
  const request = await post;
  const recommendation = await response;
  assert.equal(recommendation.status(), 200, "A verified reference must receive a successful engine response.");
  const responsePayload = await recommendation.json();
  assert.ok(["RECOMMENDED", "TRADEOFF", "NO_SUITABLE_SIZE"].includes(responsePayload.result?.state), "The category-reference engine must return a safe evaluated result state.");
  const payload = JSON.parse(request.postData() ?? "{}");
  assert.deepEqual(Object.keys(payload.observations).sort(), [...expectedRegions].sort(), "The browser must submit exactly the target-required regions advertised by the API.");
  await page.waitForFunction(() => !document.querySelector(".result-card")?.textContent?.includes("Finding your size"));
  const resultHeading = page.locator(".result-card h2");
  assert.equal(await resultHeading.count(), 1, "A verified reference must reach a result state.");
  assert.notEqual((await resultHeading.innerText()).trim(), "Finding your size.", "The browser must render the evaluated engine result, not only a generic result shell.");
  await page.screenshot({ path: `${artifactDir}/${categoryNoun}-verified-result.png`, fullPage: false });
}

async function unlistedBrandJourney(page) {
  let categoryReferencePosts = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes("/api/fit/category-size-reference")) categoryReferencePosts += 1;
  });
  await openFit(page, "/shop/women", "Mica Car Coat");
  const brand = page.getByLabel("Brand of a jacket you own");
  await brand.waitFor();
  await brand.selectOption("__not_listed__");
  await page.getByRole("textbox", { name: "Brand not listed" }).fill("Outside Label");
  await page.getByRole("textbox", { name: "Size on the label" }).fill("M");
  await page.getByRole("group", { name: "Chest / bust fit" }).getByText("Just right", { exact: true }).click();
  await answerVisibleReferenceQuestions(page);
  await page.getByRole("button", { name: "Continue with remembered context" }).click();
  await page.getByText(/context only, not used alone for recommendations/i).waitFor();
  await page.getByRole("button", { name: "Back" }).click();
  const rememberedBrand = page.getByRole("textbox", { name: "Brand not listed" });
  const rememberedSize = page.getByRole("textbox", { name: "Size on the label" });
  await rememberedBrand.waitFor();
  assert.equal(await rememberedBrand.inputValue(), "Outside Label", "Editing remembered context must preserve the entered brand.");
  assert.equal(await rememberedSize.inputValue(), "M", "Editing remembered context must preserve the entered size label.");
  await page.getByRole("button", { name: "Continue with remembered context" }).click();
  await page.getByRole("button", { name: "See my match" }).click();
  await page.getByText(/remembered context for this visit/i).waitFor();
  assert.equal(await page.locator(".result-card h2").evaluate((heading) => document.activeElement === heading), true, "The remembered-context result heading must receive focus.");
  assert.equal(categoryReferencePosts, 0, "An unverified remembered size must never POST to the category-reference recommendation endpoint.");
  await page.screenshot({ path: `${artifactDir}/unlisted-brand.png`, fullPage: false });
}

async function catalogOnlyDressBrandJourney(page) {
  let categoryReferencePosts = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes("/api/fit/category-size-reference")) categoryReferencePosts += 1;
  });
  await openFit(page, "/shop/women", "Aster Wrap Dress");
  const brand = page.getByLabel("Brand of a dress you own");
  await brand.waitFor();
  const listedBrands = (await brand.locator("option").allTextContents()).filter((option) => catalogBrandNames.includes(option));
  assert.deepEqual(listedBrands, catalogBrandNames, "A dress with no verified references must still show every catalog dress brand.");
  await brand.selectOption({ label: "Cendra Lane" });
  await page.getByText(/don't have a verified dress size chart for Cendra Lane/i).waitFor();
  await page.getByRole("textbox", { name: "Size on the label" }).fill("M");
  await answerVisibleReferenceQuestions(page);
  await page.getByRole("button", { name: "Continue with remembered context" }).click();
  await page.getByRole("button", { name: "See my match" }).click();
  await page.getByText(/remembered context for this visit/i).waitFor();
  assert.equal(categoryReferencePosts, 0, "A catalog-only brand must never POST to the verified-reference recommendation endpoint.");
  await page.screenshot({ path: `${artifactDir}/catalog-only-dress-brand.png`, fullPage: false });
}

async function exactCatalogGarmentJourney(page) {
  await openFit(page, "/shop/women", "Mica Car Coat");
  await page.getByText(/Advanced: use an exact catalog garment/i).click();
  await page.getByRole("button", { name: "Choose an exact garment" }).click();
  await page.getByLabel("Exact garment search").fill("Orivelle");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  const exact = page.getByLabel("Exact garment and size");
  await exact.waitFor();
  await exact.selectOption({ index: 1 });
  await answerVisibleReferenceQuestions(page);
  const post = page.waitForRequest((request) => request.method() === "POST" && request.url().includes("/api/fit/known-garment"));
  const response = page.waitForResponse((candidate) => candidate.request().method() === "POST" && candidate.url().includes("/api/fit/known-garment"));
  await page.getByRole("button", { name: "Use exact garment" }).click();
  await page.getByRole("button", { name: "See my match" }).click();
  await post;
  const recommendation = await response;
  assert.equal(recommendation.status(), 200, "The advanced exact-garment route must reach its original recommendation API.");
  const payload = await recommendation.json();
  assert.ok(["RECOMMENDED", "TRADEOFF", "NO_SUITABLE_SIZE"].includes(payload.result?.state));
  await page.waitForFunction(() => !document.querySelector(".result-card")?.textContent?.includes("Finding your size"));
  assert.notEqual((await page.locator(".result-card h2").innerText()).trim(), "Finding your size.");
}

const browser = await chromium.launch({ headless: true });
try {
  const desktop = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await completeVerifiedJourney(desktop, { shop: "/shop/women", productName: "Mica Car Coat", categoryNoun: "jacket", brandName: "Orivelle", sizeLabel: "8", expectedRegions: ["chest_bust", "shoulder_cross_back"] });
  await completeVerifiedJourney(desktop, { shop: "/shop/men", productName: "Halo Barrel Jeans", categoryNoun: "jeans", brandName: "Velmora", sizeLabel: "Waist 30 · inseam 30", expectedRegions: ["waist", "hip_seat", "inseam"] });
  await completeVerifiedJourney(desktop, { shop: "/shop/women", productName: "Fable Draped Top", categoryNoun: "top", brandName: "Avenoir", sizeLabel: "S", expectedRegions: ["chest_bust"] });
  await exactCatalogGarmentJourney(desktop);
  await catalogOnlyDressBrandJourney(desktop);
  await desktop.close();

  const compact = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await unlistedBrandJourney(compact);
  assert.equal(await compact.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true, "The compact known-size flow must not overflow horizontally.");
  await compact.close();

  console.log("PASS: all category brands are visible; verified references recommend, while catalog-only and unlisted brands capture context and abstain.");
} finally {
  await browser.close();
}
