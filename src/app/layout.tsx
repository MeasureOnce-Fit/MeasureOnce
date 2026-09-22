import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MeasureOnce — Know One Fit",
  description: "Garment-grounded fit guidance for multi-brand fashion.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}

