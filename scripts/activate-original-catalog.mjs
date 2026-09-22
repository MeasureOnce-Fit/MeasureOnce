import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const planPath = path.join(root, "src", "lib", "original-catalog-plan.json");
const catalogPath = path.join(root, "src", "lib", "product-photos.json");
const plan = JSON.parse(await fs.readFile(planPath, "utf8"));
const pending = plan.filter((product) => product.generationStatus !== "ready");

if (plan.length !== 200 || pending.length) {
  throw new Error(`Activation blocked: ${pending.length} of ${plan.length} products still need original photography.`);
}

const privateFields = new Set(["generationPrompt", "generationStatus", "colorHex"]);
const publicCatalog = plan.map((product) => Object.fromEntries(
  Object.entries(product).filter(([key]) => !privateFields.has(key)),
));
await fs.writeFile(catalogPath, `${JSON.stringify(publicCatalog, null, 2)}\n`);

const productsDir = path.join(root, "public", "products");
const oldRetailerFiles = (await fs.readdir(productsDir, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && /\.jpe?g$/i.test(entry.name));
await Promise.all(oldRetailerFiles.map((entry) => fs.unlink(path.join(productsDir, entry.name))));

console.log(JSON.stringify({ activatedProducts: publicCatalog.length, removedRetailerFiles: oldRetailerFiles.length }, null, 2));
