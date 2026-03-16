"use client";

import { type ReactNode, useEffect } from "react";
import {
  type State,
  WagmiProvider,
  useAccount,
  useSwitchChain,
} from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { YieldProvider } from "@yo-protocol/react";
import { wagmiConfig } from "@/app/lib/wagmi";
import { SiweProvider } from "@/app/lib/siwe-context";
import { SUPPORTED_CHAIN_ID } from "@/lib/constants";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
    },
  },
});

function ChainEnforcer() {
  const { isConnected, chainId: walletChainId } = useAccount();
  const { switchChain } = useSwitchChain();

  useEffect(() => {
    if (isConnected && walletChainId && walletChainId !== SUPPORTED_CHAIN_ID) {
      switchChain({ chainId: SUPPORTED_CHAIN_ID });
    }
  }, [isConnected, walletChainId, switchChain]);

  return null;
}

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
          <SiweProvider>
            <ChainEnforcer />
            {children}
          </SiweProvider>
        </YieldProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
