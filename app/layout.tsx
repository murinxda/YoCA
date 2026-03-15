import type { Metadata } from "next";
import { headers } from "next/headers";
import { cookieToInitialState } from "wagmi";
import { wagmiConfig } from "@/app/lib/wagmi";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "YoCA",
  description:
    "Dollar Cost Average your way into yield-bearing Yo Protocol vaults. Deposit stables, set your DCA strategy, and let YoCA handle the rest.",
  openGraph: {
    title: "YoCA - Yo Cost Average",
    description:
      "Automated DCA into yield-bearing Yo Protocol vaults on Base",
    images: ["/hero.png"],
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
