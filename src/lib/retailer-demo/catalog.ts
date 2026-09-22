export const RETAILER_DEMO_ID = "aster-department";

export type RetailerCoverageStatus = "ready" | "review" | "blocked";

export type RetailerDemoItem = {
  id: string;
  productId: string;
  name: string;
  category: string;
  price: number;
  color: string;
  image: string;
  availableSizeLabels: string[];
  coverage: {
    status: RetailerCoverageStatus;
    measuredVariants: string;
    note: string;
  };
};

const ITEMS: readonly RetailerDemoItem[] = [
  {
    id: "aster-lumen-field-jacket",
    productId: "mo-women-002",
    name: "Lumen Field Jacket",
    category: "Outerwear",
    price: 330,
    color: "Olive",
    image: "/products/original/mo-women-002-front.jpg",
    availableSizeLabels: ["EU 32", "EU 34", "EU 36", "EU 38", "EU 40", "EU 42"],
    coverage: { status: "ready", measuredVariants: "6 / 6", note: "Chest · shoulder · body length · sleeve" },
  },
  {
    id: "aster-fold-midi-dress",
    productId: "mo-women-001",
    name: "Aster Fold Taffeta Midi Dress",
    category: "Dresses",
    price: 205,
    color: "Deep plum",
    image: "/products/original/mo-women-001-front.jpg",
    availableSizeLabels: ["0/2", "4/6", "8/10", "12/14", "16/18", "20/22"],
    coverage: { status: "ready", measuredVariants: "6 / 6", note: "Bust · waist · hip or seat" },
  },
  {
    id: "aster-oriel-crew-sweater",
    productId: "mo-women-020",
    name: "Oriel Crew Sweater",
    category: "Knitwear",
    price: 250,
    color: "Ink navy",
    image: "/products/original/mo-women-020-front.jpg",
    availableSizeLabels: ["XS", "S", "M", "L"],
    coverage: { status: "review", measuredVariants: "4 / 6", note: "Two sleeve records need review before all labels are available" },
  },
] as const;

export function listRetailerDemoItems(): readonly RetailerDemoItem[] {
  return ITEMS;
}

export function getRetailerDemoItem(itemId: string): RetailerDemoItem | null {
  return ITEMS.find((item) => item.id === itemId) ?? null;
}
