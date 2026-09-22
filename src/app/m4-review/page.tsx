import type { Metadata } from "next";

import M4LandingReview from "./landing-review";

export const metadata: Metadata = {
  title: "M4 Landing Page Review · MeasureOnce",
  description: "Interactive review of the MeasureOnce landing page and fit comparison experience.",
};

export default function M4ReviewPage() {
  return <M4LandingReview />;
}
