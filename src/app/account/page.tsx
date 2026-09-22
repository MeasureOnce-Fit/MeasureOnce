import type { Metadata } from "next";
import { Suspense } from "react";

import RetailerAccountClient from "./retailer-account-client";

export const metadata: Metadata = {
  title: "My Account · MeasureOnce",
  description: "Shopping account sign-in for MeasureOnce.",
};

export default function AccountPage() {
  return <Suspense><RetailerAccountClient /></Suspense>;
}
