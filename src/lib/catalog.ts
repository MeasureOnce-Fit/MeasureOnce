import photos from "./product-photos.json";

export type Gender = "Women" | "Men";
export type Product = {
  id: string; gender: Gender; category: string; name: string; brand: string;
  price: number; colorName: string; colors: [string,string,string];
  material: string; fit: string; stretch: string; sizes: string[];
  description: string; measurements: {label: string; value: string}[];
  seed: number; image: string; images: string[]; imageSources: string[];
  viewLabels: string[];
  sourceUrl: string; license: string; licenseUrl: string; creator: string;
};

// Product photography and product records are original portfolio assets; fit values are sample data.
export const catalog: Product[] = photos.map((photo,index) => ({
  ...photo,
  gender: photo.gender as Gender,
  colors: ["#252421","#82796d","#dad2c4"],
  material: photo.material,
  fit: photo.fit,
  stretch: photo.stretch,
  seed: index+1,
  measurements: [
    {label: "Chest (demo)",value: (90+index%8*2)+" cm"},
    {label: "Waist (demo)",value: (70+index%7*2)+" cm"},
    {label: "Hip (demo)",value: (94+index%6*2)+" cm"},
    {label: "Length (demo)",value: (68+index%9*3)+" cm"},
  ],
}));
export const womenCategories = [...new Set(catalog.filter(p=>p.gender==="Women").map(p=>p.category))];
export const menCategories = [...new Set(catalog.filter(p=>p.gender==="Men").map(p=>p.category))];
export const catalogCounts = {
  Women: catalog.filter(p=>p.gender==="Women").length,
  Men: catalog.filter(p=>p.gender==="Men").length,
};

