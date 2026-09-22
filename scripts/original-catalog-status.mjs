import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const planPath = path.join(root, "src", "lib", "original-catalog-plan.json");
const plan = JSON.parse(await fs.readFile(planPath, "utf8"));
const ready = plan.filter((product) => product.generationStatus === "ready");
const pending = plan.filter((product) => product.generationStatus !== "ready");

console.log(JSON.stringify({
  brand: "MeasureOnce Studio",
  products: plan.length,
  readyProducts: ready.length,
  pendingProducts: pending.length,
  readyImages: ready.length * 3,
  pendingImages: pending.length * 3,
  next: pending.slice(0, 10).map(({ id, gender, category, name, price }) => ({ id, gender, category, name, price })),
}, null, 2));
