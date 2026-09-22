import type { Metadata } from "next";
import Storefront from "../storefront";

export const metadata: Metadata = { title: "About | MeasureOnce", description: "Explore Fit Passport, try the fit comparison, and understand the evidence behind MeasureOnce." };

export default function AboutPage() {
  return <Storefront view="about" />;
}
