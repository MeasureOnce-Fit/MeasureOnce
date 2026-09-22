import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const [source, slug] = process.argv.slice(2);
if (!source || !slug) {
  throw new Error("Usage: node scripts/import-original-triptych.mjs <source.png> <product-slug>");
}

const root = process.cwd();
const outputDir = path.join(root, "public", "products", "original");
await fs.mkdir(outputDir, { recursive: true });

const metadata = await sharp(source).metadata();
if (!metadata.width || !metadata.height || metadata.width < 3) {
  throw new Error(`Expected a three-panel image; received ${metadata.width}x${metadata.height}`);
}

const labels = ["front", "side", "back"];
await Promise.all(labels.map((label, index) => {
  const left = Math.round(metadata.width * index / 3);
  const right = Math.round(metadata.width * (index + 1) / 3);
  return sharp(source)
  .extract({ left, top: 0, width: right - left, height: metadata.height })
  .resize(800, 1000, { fit: "contain", background: "#f5f1e8" })
  .jpeg({ quality: 92, chromaSubsampling: "4:4:4" })
  .toFile(path.join(outputDir, `${slug}-${label}.jpg`));
}));

console.log(JSON.stringify({ slug, width: 800, height: 1000, files: labels.map((label) => `/products/original/${slug}-${label}.jpg`) }));
