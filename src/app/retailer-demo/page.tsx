import type { Metadata } from "next";

import { listRetailerDemoItems } from "@/lib/retailer-demo/catalog";

import RetailerDemoClient from "./retailer-demo-client";

export const metadata: Metadata = {
  title: "Aster Department Store · MeasureOnce Demo",
  description: "Working synthetic retailer integration demo for MeasureOnce.",
};

export default function RetailerDemoPage() {
  return <RetailerDemoClient items={listRetailerDemoItems()} />;
}
