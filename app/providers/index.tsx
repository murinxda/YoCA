"use client";

import { type ReactNode } from "react";
import { type State, WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { YieldProvider } from "@yo-protocol/react";
import { wagmiConfig } from "@/app/lib/wagmi";
import { SiweProvider } from "@/app/lib/siwe-context";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
    },
  },
});

export function Providers({
  children,
  initialState,
}: {
  children: ReactNode;
  initialState?: State;
}) {
  return (
    <WagmiProvider config={wagmiConfig} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        <YieldProvider
          partnerId={"YoCAMikado"}
          defaultSlippageBps={50}
        >
          <SiweProvider>{children}</SiweProvider>
        </YieldProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
