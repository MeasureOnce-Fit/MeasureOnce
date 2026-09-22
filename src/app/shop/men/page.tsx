import type { Metadata } from "next";
import Storefront from "../../storefront";

export const metadata: Metadata = { title: "Shop Men | MeasureOnce" };

export default function ShopMenPage() {
  return <Storefront key="men" view="shop" initialGender="Men" />;
}
