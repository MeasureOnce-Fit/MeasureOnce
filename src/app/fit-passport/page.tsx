import type { Metadata } from "next";

import FitPassportClient from "./fit-passport-client";

export const metadata: Metadata = {
  title: "Fit Passport · MeasureOnce",
  description: "Manage the people, garments and permissions that shape your fit guidance.",
};

export default function FitPassportPage() {
  return <FitPassportClient />;
}
