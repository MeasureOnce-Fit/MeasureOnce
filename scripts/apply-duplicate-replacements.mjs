import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const catalogPath = path.join(root, "src/lib/product-photos.json");
const originalPlanPath = path.join(root, "src/lib/original-catalog-plan.json");
const replacementPath = path.join(root, "src/lib/duplicate-replacement-plan.json");
const outputDir = path.join(root, "public/products/original");
const [catalog, originalPlan, replacements] = await Promise.all([
  fs.readFile(catalogPath, "utf8").then(JSON.parse),
  fs.readFile(originalPlanPath, "utf8").then(JSON.parse),
  fs.readFile(replacementPath, "utf8").then(JSON.parse),
]);

for (const replacement of replacements) {
  for (const view of ["front", "side", "back"]) {
    await fs.access(path.join(outputDir, `${replacement.id}-${view}.jpg`));
  }
}

const byId = new Map(replacements.map((replacement) => [replacement.id, replacement]));
const update = (product, includePrivate) => {
  const replacement = byId.get(product.id);
  if (!replacement) return product;
  return {
    ...product,
    name: replacement.name,
    colorName: replacement.colorName,
    material: replacement.material,
    description: replacement.description,
    ...(includePrivate ? { generationPrompt: replacement.generationPrompt, generationStatus: "ready" } : {}),
  };
};
const nextCatalog = catalog.map((product) => update(product, false));
const nextOriginalPlan = originalPlan.map((product) => update(product, true));

const duplicateNames = nextCatalog.length - new Set(nextCatalog.map((product) => product.name)).size;
if (duplicateNames) throw new Error(`${duplicateNames} duplicate names remain.`);
const descriptionGroups = Map.groupBy(nextCatalog, (product) => product.description);
const duplicateDescriptions = [...descriptionGroups.values()].filter((group) => group.length > 1);
const crossGenderDuplicates = duplicateDescriptions.filter((group) => new Set(group.map((product) => product.gender)).size > 1);
if (duplicateDescriptions.length || crossGenderDuplicates.length) {
  throw new Error(`${duplicateDescriptions.length} duplicate description groups remain, including ${crossGenderDuplicates.length} cross-gender groups.`);
}
await Promise.all([
  fs.writeFile(catalogPath, `${JSON.stringify(nextCatalog, null, 2)}\n`),
  fs.writeFile(originalPlanPath, `${JSON.stringify(nextOriginalPlan, null, 2)}\n`),
]);
console.log(JSON.stringify({ updated: replacements.length, duplicateNames, duplicateDescriptions: 0, crossGenderDuplicates: 0 }, null, 2));
