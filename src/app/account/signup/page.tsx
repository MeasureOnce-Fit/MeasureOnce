import type { Metadata } from "next";
import { Suspense } from "react";
import RetailerAccountClient from "../retailer-account-client";

export const metadata: Metadata = { title: "Create account · MeasureOnce", description: "Create one MeasureOnce shopping account for your saved fit preferences." };

export default function SignupPage() {
  return <Suspense><RetailerAccountClient mode="signup" /></Suspense>;
}
