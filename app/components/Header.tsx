"use client";

import { useAccount, useChainId } from "wagmi";
import { SUPPORTED_CHAIN_ID } from "@/lib/constants";
import { useSiweAuth } from "@/app/lib/siwe-context";

export function Header() {
  const { address } = useAccount();
  const chainId = useChainId();
  const isCorrectChain = chainId === SUPPORTED_CHAIN_ID;
  const { signOut } = useSiweAuth();

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
              background: isCorrectChain
                ? "var(--success)"
                : "var(--warning)",
            }}
          />
          {isCorrectChain ? "Base" : "Wrong network"}
        </div>
        <button
          type="button"
          onClick={() => signOut()}
          style={{
            padding: "6px 12px",
            background: "var(--bg-secondary)",
            borderRadius: "var(--radius-md)",
            fontSize: 13,
            fontFamily: "monospace",
            color: "var(--text-primary)",
            cursor: "pointer",
          }}
          title="Click to sign out"
        >
          {truncatedAddress}
          <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.5 }}>✕</span>
        </button>
      </div>
    </header>
  );
}
