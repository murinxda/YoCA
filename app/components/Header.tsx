"use client";

import { useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { SUPPORTED_CHAIN_ID, CHAIN } from "@/lib/constants";
import { useSiweAuth } from "@/app/lib/siwe-context";

export function Header() {
  const { address, chainId: walletChainId } = useAccount();
  const isCorrectChain = walletChainId === SUPPORTED_CHAIN_ID;
  const { switchChain } = useSwitchChain();
  const { signOut } = useSiweAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const truncatedAddress = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : "";

  return (
    <header
      className="container"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: 16,
        paddingBottom: 16,
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div
        style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}
      >
        YoCA
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {isCorrectChain ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              color: "var(--text-secondary)",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "var(--success)",
              }}
            />
            {CHAIN.name}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => switchChain({ chainId: SUPPORTED_CHAIN_ID })}
            style={{
              padding: "6px 12px",
              background: "rgba(234, 179, 8, 0.15)",
              border: "1px solid rgba(234, 179, 8, 0.3)",
              borderRadius: "var(--radius-md)",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--warning)",
              cursor: "pointer",
            }}
          >
            Switch to {CHAIN.name}
          </button>
        )}
        <button
          type="button"
          onClick={async () => {
            setIsSigningOut(true);
            try { await signOut(); } finally { setIsSigningOut(false); }
          }}
          disabled={isSigningOut}
          style={{
            padding: "6px 12px",
            background: "var(--bg-secondary)",
            borderRadius: "var(--radius-md)",
            fontSize: 13,
            fontFamily: "monospace",
            color: "var(--text-primary)",
            cursor: isSigningOut ? "default" : "pointer",
            opacity: isSigningOut ? 0.7 : 1,
          }}
          title="Click to sign out"
        >
          {truncatedAddress}
          {isSigningOut ? (
            <span className="spinner" style={{ marginLeft: 6, width: 12, height: 12, borderWidth: 2, verticalAlign: "middle", display: "inline-block" }} />
          ) : (
            <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.5 }}>✕</span>
          )}
        </button>
      </div>
    </header>
  );
}
