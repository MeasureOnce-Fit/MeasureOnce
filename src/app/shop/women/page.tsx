import type { Metadata } from "next";
import Storefront from "../../storefront";

export const metadata: Metadata = { title: "Shop Women | MeasureOnce" };

export default function ShopWomenPage() {
  return <Storefront key="women" view="shop" initialGender="Women" />;
}
