"use client";

import { type ReactNode } from "react";
import { type State, WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { YieldProvider } from "@yo-protocol/react";
import { wagmiConfig } from "@/app/lib/wagmi";

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
          partnerId={"9999"}
          defaultSlippageBps={50}
        >
          {children}
        </YieldProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
