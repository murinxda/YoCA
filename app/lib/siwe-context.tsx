"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { useAccount, useChainId, useSignMessage, useDisconnect } from "wagmi";
import { type Address } from "viem";
import { createSiweMessage } from "viem/siwe";

interface SiweSession {
  address: string | null;
  isSignedIn: boolean;
  isLoading: boolean;
  isSigningIn: boolean;
  /** Sign in. Pass an address to use it directly (e.g. right after connectAsync). */
  signIn: (addr?: Address) => Promise<void>;
  /** Destroy session only (wallet stays connected for easy re-login). */
  signOut: () => Promise<void>;
  /** Destroy session and disconnect wallet. */
  disconnectWallet: () => Promise<void>;
}

const SiweContext = createContext<SiweSession>({
  address: null,
  isSignedIn: false,
  isLoading: true,
  isSigningIn: false,
  signIn: async () => {},
  signOut: async () => {},
  disconnectWallet: async () => {},
});

export function SiweProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();

  const [sessionAddress, setSessionAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const signingInRef = useRef(false);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => setSessionAddress(data.address ?? null))
      .catch(() => setSessionAddress(null))
      .finally(() => setIsLoading(false));
  }, []);

  // Auto sign-out when wallet disconnects
  useEffect(() => {
    if (!isConnected && sessionAddress) {
      fetch("/api/auth/logout", { method: "POST" }).then(() =>
        setSessionAddress(null),
      );
    }
  }, [isConnected, sessionAddress]);

  // Auto sign-out when user switches to a different wallet
  useEffect(() => {
    if (
      sessionAddress &&
      address &&
      address.toLowerCase() !== sessionAddress.toLowerCase()
    ) {
      fetch("/api/auth/logout", { method: "POST" }).then(() =>
        setSessionAddress(null),
      );
    }
  }, [address, sessionAddress]);

  const signIn = useCallback(async (overrideAddress?: Address) => {
    const addr = overrideAddress || address;
    if (!addr || !chainId || signingInRef.current) return;

    signingInRef.current = true;
    setIsSigningIn(true);
    try {
      const nonceRes = await fetch("/api/auth/nonce");
      const { nonce } = await nonceRes.json();

      const message = createSiweMessage({
        domain: window.location.host,
        address: addr,
        statement: "Sign in to YoCA",
        uri: window.location.origin,
        version: "1",
        chainId,
        nonce,
      });

      const signature = await signMessageAsync({ message });

      const verifyRes = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, signature }),
      });

      if (!verifyRes.ok) throw new Error("Verification failed");

      const data = await verifyRes.json();
      setSessionAddress(data.address);
    } finally {
      signingInRef.current = false;
      setIsSigningIn(false);
    }
  }, [address, chainId, signMessageAsync]);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setSessionAddress(null);
  }, []);

  const disconnectWallet = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setSessionAddress(null);
    disconnect();
  }, [disconnect]);

  return (
    <SiweContext.Provider
      value={{
        address: sessionAddress,
        isSignedIn: !!sessionAddress,
        isLoading,
        isSigningIn,
        signIn,
        signOut,
        disconnectWallet,
      }}
    >
      {children}
    </SiweContext.Provider>
  );
}

export function useSiweAuth() {
  return useContext(SiweContext);
}
