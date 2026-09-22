import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const products = JSON.parse(await fs.readFile(path.join(root, "src/lib/product-photos.json"), "utf8"));
const outputDir = path.resolve(root, "../../work/final-contact-sheets");
await fs.mkdir(outputDir, { recursive: true });

const escapeXml = (value) => String(value).replace(/[<>&'"]/g, (character) => ({
  "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;",
}[character]));
const label = (line1, line2) => Buffer.from(`
  <svg width="230" height="46" xmlns="http://www.w3.org/2000/svg">
    <text x="4" y="15" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#111">${escapeXml(line1.slice(0, 32))}</text>
    <text x="4" y="34" font-family="Arial, sans-serif" font-size="11" fill="#444">${escapeXml(line2.slice(0, 36))}</text>
  </svg>`);

for (const gender of ["Women", "Men"]) {
  const group = products.filter((product) => product.gender === gender);
  for (let offset = 0; offset < group.length; offset += 25) {
    const page = group.slice(offset, offset + 25);
    const layers = [];
    for (const [index, product] of page.entries()) {
      const col = index % 5;
      const row = Math.floor(index / 5);
      const left = col * 240;
      const top = row * 260;
      layers.push({ input: label(`${offset + index + 1}. ${product.brand}`, product.name), left: left + 5, top: top + 5 });
      for (const [angle, image] of product.images.entries()) {
        const thumb = await sharp(path.join(root, "public", image.replace(/^\//, "")))
          .resize(72, 195, { fit: "contain", background: "#ffffff" })
          .png()
          .toBuffer();
        layers.push({ input: thumb, left: left + 4 + angle * 77, top: top + 52 });
      }
    }
    const filename = `${gender.toLowerCase()}-${String(offset + 1).padStart(3, "0")}-${String(offset + page.length).padStart(3, "0")}.png`;
    await sharp({ create: { width: 1200, height: 1300, channels: 3, background: "#e9e7e2" } })
      .composite(layers)
      .png()
      .toFile(path.join(outputDir, filename));
    console.log(path.join(outputDir, filename));
  }
}
