"use client";

import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import {
  ADDRESSES,
  STABLE_VAULTS,
  VOLATILE_VAULTS,
  type VaultConfig,
} from "@/lib/constants";
import { useVaultBalance } from "@/app/hooks/useVaultBalance";

interface VaultBalancesProps {
  onDeposit: (vault: VaultConfig) => void;
  isRefreshing?: boolean;
}

const ZERO = BigInt(0);

function VaultBalanceCard({
  vault,
  shares,
  assets,
  isLoading,
  onDeposit,
}: {
  vault: VaultConfig;
  shares: bigint;
  assets: bigint;
  isLoading: boolean;
  onDeposit: () => void;
}) {
  const hasBalance = shares > ZERO;
  const formattedShares = formatUnits(shares, vault.decimals);
  const formattedAssets = formatUnits(assets, vault.decimals);

  return (
    <div
      className="card fade-in"
      style={{
        borderLeft: `4px solid ${vault.color}`,
        padding: "12px 16px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div style={{ minWidth: 64 }}>
          <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.2 }}>
            {vault.name}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            {vault.underlyingSymbol}
          </div>
        </div>

        <div style={{ flex: 1, textAlign: "right" }}>
          {isLoading ? (
            <div
              className="skeleton"
              style={{ height: 16, width: "60%", marginLeft: "auto" }}
            />
          ) : hasBalance ? (
            <>
              <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>
                {Number(formattedShares).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 3,
                })}{" "}
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--text-secondary)",
                  }}
                >
                  shares
                </span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                ≈{" "}
                {Number(formattedAssets).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 3,
                })}{" "}
                {vault.underlyingSymbol}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              No position
            </div>
          )}
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          style={{
            width: 96,
            padding: "6px 0",
            fontSize: 13,
            flexShrink: 0,
            textAlign: "center",
            ...(vault.type === "volatile"
              ? { opacity: 0.5, pointerEvents: "none" as const }
              : {}),
          }}
          onClick={(e) => {
            e.stopPropagation();
            onDeposit();
          }}
          disabled={vault.type === "volatile"}
        >
          {vault.type === "volatile" ? "Coming soon" : "Deposit"}
        </button>
      </div>
    </div>
  );
}

export function VaultBalances({ onDeposit, isRefreshing }: VaultBalancesProps) {
  const { address, isConnected } = useAccount();

  const yoUSD = useVaultBalance(ADDRESSES.vaults.yoUSD.address, address);
  const yoEUR = useVaultBalance(ADDRESSES.vaults.yoEUR.address, address);
  const yoETH = useVaultBalance(ADDRESSES.vaults.yoETH.address, address);
  const yoBTC = useVaultBalance(ADDRESSES.vaults.yoBTC.address, address);

  const balances = [
    { vault: STABLE_VAULTS[0]!, ...yoUSD },
    { vault: STABLE_VAULTS[1]!, ...yoEUR },
    { vault: VOLATILE_VAULTS[0]!, ...yoETH },
    { vault: VOLATILE_VAULTS[1]!, ...yoBTC },
  ];

  const anyLoading = balances.some((b) => b.isLoading) || !!isRefreshing;
  const anyBalance = balances.some((b) => b.shares > ZERO);

  if (!isConnected) {
    return (
      <div
        className="card fade-in"
        style={{
          textAlign: "center",
          padding: 32,
          border: "1px dashed var(--border)",
        }}
      >
        <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
          Welcome to YoCA
        </p>
        <p
          style={{
            color: "var(--text-secondary)",
            marginBottom: 16,
            fontSize: 14,
          }}
        >
          Connect your wallet to start DCA-ing into Yo Protocol vaults
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 className="section-title">Your Yo vaults positions</h2>
      {anyLoading ? (
        <div className="card">
          <div className="skeleton" style={{ height: 60, marginBottom: 12 }} />
          <div className="skeleton" style={{ height: 60 }} />
        </div>
      ) : !anyBalance ? (
        <div
          className="card fade-in"
          style={{
            textAlign: "center",
            padding: 32,
            border: "1px dashed var(--border)",
          }}
        >
          <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
            No positions yet
          </p>
          <p
            style={{
              color: "var(--text-secondary)",
              marginBottom: 20,
              fontSize: 14,
            }}
          >
            Deposit into a Yo vault to start earning yield, then set up a DCA
            strategy
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onDeposit(STABLE_VAULTS[0]!)}
          >
            Deposit Now
          </button>
        </div>
      ) : (
        balances.map(({ vault, shares, assets, isLoading: loading }) => (
          <VaultBalanceCard
            key={vault.id}
            vault={vault}
            shares={shares}
            assets={assets}
            isLoading={loading}
            onDeposit={() => onDeposit(vault)}
          />
        ))
      )}
    </div>
  );
}
