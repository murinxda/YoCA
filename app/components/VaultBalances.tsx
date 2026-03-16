"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { formatUnits } from "viem";
import {
  ADDRESSES,
  IS_TESTNET,
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

const ALL_VAULTS = [...STABLE_VAULTS, ...VOLATILE_VAULTS];
const YO_API = "https://api.yo.xyz";

function useVaultYields() {
  return useQuery({
    queryKey: ["vault-yields"],
    queryFn: async () => {
      const results = await Promise.all(
        ALL_VAULTS.map(async (v) => {
          const res = await fetch(`${YO_API}/api/v1/vault/base/${v.address}`);
          if (!res.ok) return null;
          const json = await res.json();
          return json?.data?.stats?.yield?.["7d"] as string | null;
        }),
      );
      const map: Record<string, string | null> = {};
      for (let i = 0; i < ALL_VAULTS.length; i++) {
        map[ALL_VAULTS[i]!.id] = results[i] ?? null;
      }
      return map;
    },
    enabled: !IS_TESTNET,
    staleTime: 5 * 60_000,
  });
}

function VaultBalanceCard({
  vault,
  shares,
  assets,
  isLoading,
  yield7d,
  onDeposit,
}: {
  vault: VaultConfig;
  shares: bigint;
  assets: bigint;
  isLoading: boolean;
  yield7d?: string | null;
  onDeposit: () => void;
}) {
  const hasBalance = shares > ZERO;
  const formattedShares = formatUnits(shares, vault.decimals);
  const formattedAssets = formatUnits(assets, vault.decimals);
  const maxDecimals = vault.type === "stable" ? 2 : 3;

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
          {yield7d != null && (
            <div style={{ fontSize: 11, color: "var(--success)", fontWeight: 600, marginTop: 2 }}>
              {Number(yield7d).toFixed(2)}% APY
            </div>
          )}
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
                {Number(formattedAssets).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: maxDecimals,
                })}{" "}
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--text-secondary)",
                  }}
                >
                  {vault.underlyingSymbol}
                </span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                {Number(formattedShares).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: maxDecimals,
                })}{" "}
                shares
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
            width: 72,
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
          {vault.type === "volatile" ? "Soon" : "Deposit"}
        </button>
      </div>
    </div>
  );
}

export function VaultBalances({ onDeposit, isRefreshing }: VaultBalancesProps) {
  const { address, isConnected } = useAccount();
  const { data: yields } = useVaultYields();

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
            style={{ marginBottom: 12 }}
            onClick={() => onDeposit(STABLE_VAULTS[0]!)}
          >
            Deposit Now
          </button>
          <Link
            href="/how-it-works"
            style={{
              display: "block",
              fontSize: 14,
              color: "var(--text-muted)",
            }}
          >
            How it works &rarr;
          </Link>
        </div>
      ) : (
        balances.map(({ vault, shares, assets, isLoading: loading }) => (
          <VaultBalanceCard
            key={vault.id}
            vault={vault}
            shares={shares}
            assets={assets}
            isLoading={loading}
            yield7d={yields?.[vault.id]}
            onDeposit={() => onDeposit(vault)}
          />
        ))
      )}
    </div>
  );
}
