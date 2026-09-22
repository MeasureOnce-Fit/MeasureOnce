import type { Metadata } from "next";

import RetailerConsoleClient from "./retailer-console-client";

export const metadata: Metadata = {
  title: "Retailer Catalog Console · MeasureOnce",
  description: "Protected synthetic retailer catalog coverage console.",
};

export default function RetailerConsolePage() {
  return <RetailerConsoleClient />;
}
