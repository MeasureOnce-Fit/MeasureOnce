import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(root, "src", "lib", "product-photos.json");
const outputPath = path.join(root, "src", "lib", "original-catalog-plan.json");
const source = JSON.parse(await fs.readFile(sourcePath, "utf8"));

const colors = [
  ["Deep plum", "#4b2636"], ["Ink navy", "#192435"], ["Oat", "#d8cbb8"],
  ["Terracotta", "#a64f3c"], ["Forest", "#263e33"], ["Graphite", "#34363a"],
  ["Cobalt", "#244e9c"], ["Burgundy", "#641f32"], ["Stone", "#a79e91"],
  ["Saffron", "#c88821"], ["Powder blue", "#9db4ca"], ["Espresso", "#3b2a24"],
  ["Ivory", "#eee8dc"], ["Olive", "#66704a"], ["Cerise", "#a82d59"],
  ["Copper", "#a65f3f"], ["Teal", "#24646a"], ["Black", "#171717"],
  ["Clay pink", "#bb7b78"], ["Silver grey", "#a9adb2"],
];

const families = [
  "Aster", "Vela", "Serein", "Orla", "Cinder", "Vale", "Elara", "Morrow",
  "Solace", "Lumen", "Aven", "Noma", "Sable", "Iris", "Dune", "Arden",
  "Halo", "Mica", "Cove", "Juniper", "Lyra", "Oriel", "Tide", "Riven", "Fable",
];

const details = [
  "architectural pleats", "a curved seam line", "a sculpted collar", "a concealed placket",
  "a softly shaped waist", "a diagonal panel", "a cropped proportion", "a fluid drape",
  "a clean utility pocket", "a dropped shoulder", "a tonal topstitch", "a wrap construction",
  "a split hem", "a tapered line", "a boxy silhouette", "a gathered yoke",
  "a curved cuff", "a contrast texture panel", "a double-layer edge", "a precise darted shape",
];

const lowerBodyDetails = [
  "curved outseams", "articulated knee shaping", "double-needle topstitching",
  "a contoured waistband", "a split hem", "a tonal side panel",
  "a clean utility pocket", "a tapered leg line", "an asymmetric wrap panel",
  "pressed front creases", "a shaped back yoke", "a softly pleated front",
];

const categorySpecs = {
  Dresses: { nouns: ["Midi Dress", "Column Dress", "Shirt Dress", "Wrap Dress", "Slip Dress"], materials: ["taffeta", "crepe", "satin", "linen blend", "compact jersey"], price: [185, 495] },
  Outerwear: { nouns: ["Field Jacket", "Sculpted Coat", "Short Trench", "Blouson", "Car Coat"], materials: ["wool twill", "cotton gabardine", "recycled nylon", "brushed felt", "waxed cotton"], price: [245, 695] },
  Knitwear: { nouns: ["Rib Cardigan", "Crew Sweater", "Polo Knit", "Fine Gauge Vest", "Mockneck Knit"], materials: ["merino wool", "cotton cashmere", "alpaca blend", "compact cotton knit", "recycled wool"], price: [125, 345] },
  Denim: { nouns: ["Straight Jeans", "Barrel Jeans", "Denim Overshirt", "Wide Jeans", "Taper Jeans"], materials: ["rigid denim", "washed selvedge denim", "soft indigo denim", "ecru denim", "recycled cotton denim"], price: [135, 275] },
  Shorts: { nouns: ["Tailored Shorts", "Utility Shorts", "Pleated Shorts", "Longline Shorts", "Drawcord Shorts"], materials: ["cotton twill", "linen blend", "wool suiting", "washed poplin", "technical cotton"], price: [95, 195] },
  Tailoring: { nouns: ["Single-Breasted Blazer", "Relaxed Blazer", "Waistcoat", "Dinner Jacket", "Soft-Shoulder Blazer"], materials: ["wool suiting", "linen wool", "barathea", "cotton sateen", "stretch twill"], price: [275, 595] },
  Trousers: { nouns: ["Pleated Trousers", "Wide Trousers", "Tapered Trousers", "Drawcord Trousers", "Column Trousers"], materials: ["wool twill", "linen blend", "cotton sateen", "fluid crepe", "compact jersey"], price: [135, 295] },
  "Shirts & Tees": { nouns: ["Camp Shirt", "Poplin Shirt", "Box Tee", "Long-Sleeve Tee", "Band-Collar Shirt"], materials: ["cotton poplin", "linen", "heavy cotton jersey", "washed oxford", "silk cotton"], price: [85, 225] },
  Sweatshirts: { nouns: ["Panel Sweatshirt", "Zip Sweatshirt", "Loopback Hoodie", "Crew Sweatshirt", "Collared Sweatshirt"], materials: ["loopback cotton", "brushed cotton fleece", "double-face jersey", "organic cotton", "compact terry"], price: [115, 235] },
  Skirts: { nouns: ["Panel Midi Skirt", "Wrap Skirt", "Column Skirt", "Pleated Skirt", "Bias Skirt"], materials: ["taffeta", "fluid crepe", "washed satin", "wool twill", "linen blend"], price: [135, 295] },
  Tops: { nouns: ["Draped Top", "Sculpted Blouse", "Shell Top", "Wrap Top", "Panel Tunic"], materials: ["silk crepe", "cotton poplin", "satin", "compact jersey", "linen blend"], price: [95, 245] },
};

const roundFive = (value) => Math.round(value / 5) * 5;
const usedNames = new Set();

const catalog = source.map((previous, index) => {
  const spec = categorySpecs[previous.category];
  if (!spec) throw new Error(`Missing category spec: ${previous.category}`);
  const genderIndex = previous.gender === "Women" ? index : index - 100;
  const sequence = genderIndex + 1;
  const isSample = index === 0;
  const isWomenDenimCorrection = previous.gender === "Women" && sequence === 93;
  const isMenCoatCorrection = previous.gender === "Men" && sequence === 76;
  const isMenTeeCorrection = previous.gender === "Men" && sequence === 94;
  const family = isSample ? "Aster Fold" : families[(index * 7 + sequence) % families.length];
  const noun = isSample ? "Taffeta Midi Dress" : spec.nouns[(index * 3 + sequence) % spec.nouns.length];
  const isLowerBody = ["Denim", "Trousers", "Shorts", "Skirts"].includes(previous.category) && !noun.includes("Overshirt");
  const material = isSample ? "taffeta" : spec.materials[(index * 5 + sequence) % spec.materials.length];
  const [colorName, colorHex] = isSample ? ["Deep plum", "#4b2636"] : colors[(index * 11 + sequence) % colors.length];
  const detail = isSample
    ? "an asymmetric folded neckline and architectural pleats"
    : isWomenDenimCorrection
      ? "curved outseams and articulated knee shaping"
      : isMenCoatCorrection
        ? "a concealed asymmetric storm placket and structured shoulders"
        : isMenTeeCorrection
          ? "a clean bound crew neckline and straight hem"
        : isLowerBody
          ? lowerBodyDetails[(index * 13 + sequence) % lowerBodyDetails.length]
          : details[(index * 13 + sequence) % details.length];
  let name = `${family} ${noun}`;
  if (usedNames.has(name)) name = `${family} ${colorName} ${noun}`;
  if (usedNames.has(name)) name = `${family} ${families[(index * 7 + sequence + 1) % families.length]} ${noun}`;
  if (usedNames.has(name)) name = `${family} ${previous.gender === "Women" ? "Élan" : "Form"} ${noun}`;
  if (usedNames.has(name)) name = `${family} ${colorName} ${material} ${noun}`;
  usedNames.add(name);

  const [minPrice, maxPrice] = spec.price;
  const price = roundFive(minPrice + ((index * 47 + sequence * 19) % (maxPrice - minPrice + 1)));
  const slug = `mo-${previous.gender.toLowerCase()}-${String(sequence).padStart(3, "0")}`;
  const nounLower = noun.toLowerCase();
  const repeatedMaterial = nounLower.includes(material.toLowerCase()) || (material.toLowerCase().includes("denim") && nounLower.includes("denim"));
  const productDescriptor = `${colorName} ${repeatedMaterial ? "" : `${material} `}${nounLower}`;
  const description = `${productDescriptor} with ${detail}. An original MeasureOnce Studio design created for fit-prototype demonstration.`;
  const focusRange = isLowerBody ? "waistband to hem" : "neckline to hem";
  const prompt = `[SUBJECT]\nThree-view catalog study of one completely original ${previous.gender.toLowerCase()} ${productDescriptor.toLowerCase()} with ${detail}. Newly invented garment construction; no resemblance to an identifiable designer product. Invisible ghost-mannequin form with no visible human, hanger, or stand.\n\n[COMPOSITION]\nOne horizontal triptych with equal panels showing the exact same garment from true front, three-quarter side, and back views. Full garment centered with consistent scale and construction in every panel. Seamless warm ivory paper backdrop.\n\n[LIGHTING]\n45-degree camera-left large softbox diffusion at 5200K with bounced fill. Gentle wraparound and a subtle contact shadow beneath each view.\n\n[LENS & CAMERA]\n85mm lens at f/8, deep depth of field, straight-on catalog perspective, tack-sharp from ${focusRange}.\n\n[MATERIALS & TEXTURE]\nRealistic ${material} weave, seams, stitching, closures, and natural folds. ${colorName} color rendered accurately.\n\n[STYLE]\nClean geometric staging, restrained premium fashion catalog register, professional retouching standard, hyper-detailed photorealistic materials.\n\n[AVOID]\nNo brand names, logos, monograms, text, watermarks, product labels, people, body parts, hangers, stands, copied luxury designs, fantasy costume styling, illustration, CGI sheen, plastic surfaces, warped seams, duplicated angles, inconsistent construction, oversaturated HDR, flat fluorescent light, unrelated props, or AI artifacts.\n\nresolution: 2k`;

  return {
    id: slug,
    gender: previous.gender,
    category: previous.category,
    name,
    brand: "MeasureOnce Studio",
    price,
    colorName,
    colorHex,
    sizes: previous.gender === "Women" ? ["XXS", "XS", "S", "M", "L", "XL"] : ["XS", "S", "M", "L", "XL", "XXL"],
    description,
    material: material.replace(/\b\w/g, (letter) => letter.toUpperCase()),
    fit: ["Close", "Balanced", "Relaxed", "Oversized"][(index * 3) % 4],
    stretch: material.includes("jersey") || material.includes("knit") ? "Moderate" : "Low",
    image: `/products/original/${slug}-front.jpg`,
    images: [`/products/original/${slug}-front.jpg`, `/products/original/${slug}-side.jpg`, `/products/original/${slug}-back.jpg`],
    imageSources: [],
    sourceUrl: "",
    license: "Original AI-generated portfolio asset",
    licenseUrl: "",
    creator: "MeasureOnce Studio",
    viewLabels: ["Front", "Side", "Back"],
    generationPrompt: prompt,
    generationStatus: fsSync.existsSync(path.join(root, "public", "products", "original", `${slug}-front.jpg`)) &&
      fsSync.existsSync(path.join(root, "public", "products", "original", `${slug}-side.jpg`)) &&
      fsSync.existsSync(path.join(root, "public", "products", "original", `${slug}-back.jpg`)) ? "ready" : "pending",
  };
});

let replacements = [];
try {
  replacements = JSON.parse(await fs.readFile(path.join(root, "src", "lib", "duplicate-replacement-plan.json"), "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const replacementsById = new Map(replacements.map((replacement) => [replacement.id, replacement]));
const finalCatalog = catalog.map((product) => {
  const replacement = replacementsById.get(product.id);
  if (!replacement) return product;
  return {
    ...product,
    name: replacement.name,
    colorName: replacement.colorName,
    material: replacement.material,
    description: replacement.description,
    generationPrompt: replacement.generationPrompt,
  };
});
const uniqueNames = new Set(finalCatalog.map((product) => product.name)).size;
if (uniqueNames !== finalCatalog.length) throw new Error(`Expected unique product names, received ${uniqueNames}/${finalCatalog.length}`);
await fs.writeFile(outputPath, `${JSON.stringify(finalCatalog, null, 2)}\n`);
console.log(JSON.stringify({ products: finalCatalog.length, women: finalCatalog.filter((p) => p.gender === "Women").length, men: finalCatalog.filter((p) => p.gender === "Men").length, uniqueNames, replacements: replacements.length, outputPath }, null, 2));
