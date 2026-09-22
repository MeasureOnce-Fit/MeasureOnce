import type { Metadata } from "next";

import ReviewDashboard from "./review-dashboard";

export const metadata: Metadata = {
  title: "M1 Contract Review · MeasureOnce",
  description: "Review and sign off MeasureOnce M1 synthetic fit contracts.",
};

export default function M1ReviewPage() {
  return <ReviewDashboard />;
}

