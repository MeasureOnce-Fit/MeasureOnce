import type { Metadata } from "next";

import RetailerReview from "./retailer-review";

export const metadata: Metadata = {
  title: "M5 Retailer Integration Review · MeasureOnce",
  description: "Interactive review of the MeasureOnce retailer widget and catalog coverage console.",
};

export default function M5ReviewPage() {
  return <RetailerReview />;
}
