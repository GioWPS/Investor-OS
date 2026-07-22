import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Road to the Closing Table — Free Investor Toolkit",
  description:
    "Free tools for real estate investors: Max Offer Calculator, Funding Path Finder, and First Deal Blueprint.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
