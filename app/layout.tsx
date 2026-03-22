import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { cookieToInitialState } from "wagmi";
import { wagmiConfig } from "@/app/lib/wagmi";
import { Providers } from "./providers";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#6366F1",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://yoca.mikadohub.app"),
  title: {
    default: "YoCA – Yo Cost Average",
    template: "%s | YoCA",
  },
  description:
    "Automated DCA into yield-bearing Yo Protocol vaults on Base. Deposit stables, set your strategy, and earn yield while you accumulate.",
  keywords: [
    "DCA",
    "dollar cost average",
    "yield",
    "DeFi",
    "Base",
    "Yo Protocol",
    "crypto",
    "vaults",
  ],
  authors: [{ name: "YoCA" }],
  applicationName: "YoCA",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-icon",
  },
  openGraph: {
    type: "website",
    siteName: "YoCA",
    title: "YoCA – Yo Cost Average",
    description:
      "Automated DCA into yield-bearing Yo Protocol vaults on Base. Deposit stables, set your strategy, and earn yield while you accumulate.",
  },
  twitter: {
    card: "summary_large_image",
    title: "YoCA – Yo Cost Average",
    description:
      "Automated DCA into yield-bearing Yo Protocol vaults on Base",
  },
  other: {
    "base:app_id": "69b69047993ed474082936d4",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialState = cookieToInitialState(
    wagmiConfig,
    (await headers()).get("cookie"),
  );

  return (
    <html lang="en">
      <body>
        <Providers initialState={initialState}>{children}</Providers>
      </body>
    </html>
  );
}
