import type { Metadata } from "next";
import VisualReview from "./visual-review";

export const metadata: Metadata = {
  title: "M2 Account Review · MeasureOnce",
  description: "Visual review for MeasureOnce account identity and Fit Passport.",
};

export default function M2ReviewPage() {
  return <VisualReview />;
}
