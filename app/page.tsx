"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAccount, useConnect } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./lib/api";
import { useSiweAuth } from "./lib/siwe-context";
import {
  Header,
  VaultBalances,
  DepositFlow,
  DCASetup,
  DCAList,
  DCAHistory,
  type DCAConfig,
} from "./components";
import { type VaultConfig } from "@/lib/constants";
import { type DcaOrder, type DcaExecution } from "@/db/schema";

type Tab = "portfolio" | "history";

function WelcomeScreen() {
  const { address, isConnected } = useAccount();
  const { connectAsync, connectors } = useConnect();
  const { isSigningIn, signIn } = useSiweAuth();
  const [error, setError] = useState<string | null>(null);

  const handleGetStarted = async () => {
    setError(null);
    try {
      if (address) {
        await signIn(address);
      } else {
        const hasInjectedProvider = typeof window !== "undefined" && !!window.ethereum;
        const connector = hasInjectedProvider
          ? connectors.find((c) => c.id === "injected") ?? connectors[0]!
          : connectors.find((c) => c.id === "com.coinbase.wallet") ?? connectors[0]!;
        const result = await connectAsync({ connector });
        await signIn(result.accounts[0]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sign-in failed";
      if (!msg.toLowerCase().includes("user rejected")) {
        setError(msg);
      }
    }
  };

  return (
    <div className="welcome">
      <div className="welcome-content">
        <div className="welcome-logo">YoCA</div>
        <p className="welcome-tagline">Yo Cost Average</p>
        <p className="welcome-description">
          Automated DCA into yield-bearing Yo Protocol vaults on Base.
          Set your strategy once and let YoCA handle the rest.
        </p>

        <div className="welcome-features">
          <div className="welcome-feature">
            <div className="welcome-feature-icon">
              <span>&#x21C4;</span>
            </div>
            <span>Auto-swap stables into ETH &amp; BTC vaults on your schedule</span>
          </div>
          <div className="welcome-feature">
            <div className="welcome-feature-icon" style={{ background: "rgba(34, 197, 94, 0.1)" }}>
              <span>&#x2191;</span>
            </div>
            <span>Earn yield on both sides while your DCA runs</span>
          </div>
          <div className="welcome-feature">
            <div className="welcome-feature-icon" style={{ background: "rgba(245, 158, 11, 0.1)" }}>
              <span>&#x25CE;</span>
            </div>
            <span>Set price limits and slippage controls for every order</span>
          </div>
        </div>
      </div>

      <div className="welcome-footer">
        <Link
          href="/how-it-works"
          style={{
            display: "block",
            textAlign: "center",
            fontSize: 14,
            color: "var(--text-muted)",
            marginBottom: 16,
          }}
        >
          How it works &rarr;
        </Link>
        {error && (
          <p style={{
            fontSize: 13,
            color: "var(--danger)",
            textAlign: "center",
            marginBottom: 12,
            maxWidth: 340,
            margin: "0 auto 12px",
          }}>
            {error}
          </p>
        )}
        <button
          type="button"
          className="welcome-cta"
          onClick={handleGetStarted}
          disabled={isSigningIn}
        >
          {isSigningIn ? (
            <>
              <span className="spinner" />
              Signing in…
            </>
          ) : isConnected ? (
            "Sign In"
          ) : (
            "Connect Wallet"
          )}
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const { address, isConnected, isReconnecting } = useAccount();
  const { isSignedIn, isLoading: isSessionLoading, isSigningIn } = useSiweAuth();

  const [tab, setTab] = useState<Tab>("portfolio");
  const [depositVault, setDepositVault] = useState<VaultConfig | null>(null);
  const [showDCASetup, setShowDCASetup] = useState(false);
  const [orders, setOrders] = useState<DcaOrder[]>([]);
  const [executions, setExecutions] = useState<DcaExecution[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshingVaults, setIsRefreshingVaults] = useState(false);
  const queryClient = useQueryClient();

  const fetchDCAData = useCallback(async () => {
    if (!address || !isSignedIn) return;
    setIsLoading(true);
    try {
      const response = await apiFetch(`/api/dca?address=${address}`);
      const data = await response.json();
      setOrders(data.orders || []);
      setExecutions(data.executions || []);
    } catch (error) {
      console.error("Failed to fetch DCA data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [address, isSignedIn]);

  useEffect(() => {
    if (isConnected && address && isSignedIn) {
      fetchDCAData();
    } else {
      setOrders([]);
      setExecutions([]);
    }
  }, [isConnected, address, isSignedIn, fetchDCAData]);

  const handleCreateDCA = async (config: DCAConfig) => {
    if (!address) return;
    const response = await apiFetch("/api/dca", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...config, address }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Failed to create DCA order");
    }

    setShowDCASetup(false);
    fetchDCAData();
  };

  const handleDepositSuccess = useCallback(() => {
    setIsRefreshingVaults(true);
    queryClient.invalidateQueries().then(() => {
      setIsRefreshingVaults(false);
    });
  }, [queryClient]);

  const applyOrderUpdate = (updated: DcaOrder) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === updated.id ? updated : o)),
    );
  };

  const handlePause = async (id: string) => {
    const order = orders.find((o) => o.id === id);
    const newStatus = order?.status === "paused" ? "active" : "paused";

    const response = await apiFetch(`/api/dca/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!response.ok) throw new Error("Failed to update order");

    const data = await response.json();
    applyOrderUpdate(data.order);
  };

  const handleCancel = async (id: string) => {
    const response = await apiFetch(`/api/dca/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) throw new Error("Failed to cancel order");

    const data = await response.json();
    applyOrderUpdate(data.order);
  };

  const handleExecuteNow = async (id: string) => {
    const response = await apiFetch(`/api/dca/${id}/execute`, {
      method: "POST",
    });

    const result = await response.json();

    if (result.order) applyOrderUpdate(result.order);
    if (result.execution) {
      setExecutions((prev) => [result.execution, ...prev]);
    }

    if (!response.ok) {
      throw new Error(result.error || result.reason || "Execution failed");
    }

    if (result.status === "failed") {
      throw new Error(result.reason || "Execution failed");
    }

    handleDepositSuccess();
    return result;
  };

  // Show loading while session/wallet state is resolving
  if (isReconnecting || isSessionLoading) {
    return (
      <div className="welcome">
        <div className="welcome-content">
          <div className="welcome-logo">YoCA</div>
          <div style={{ marginTop: 24 }}>
            <div className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
          </div>
        </div>
      </div>
    );
  }

  // Show welcome page when signing in (after connect, waiting for signature)
  if (isSigningIn) {
    return <WelcomeScreen />;
  }

  // Show welcome page when not signed in
  if (!isSignedIn) {
    return <WelcomeScreen />;
  }

  const activeOrders = orders.filter((o) => o.status !== "cancelled");

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 32 }}>
      <Header />

      <div className="container" style={{ paddingTop: 16 }}>
        <VaultBalances
          onDeposit={(vault) => setDepositVault(vault)}
          isRefreshing={isRefreshingVaults}
        />

        <div
          style={{
            display: "flex",
            gap: 4,
            background: "var(--bg-secondary)",
            borderRadius: "var(--radius-md)",
            padding: 4,
            marginTop: 24,
            marginBottom: 16,
          }}
        >
          {(["portfolio", "history"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                padding: "9px 16px",
                borderRadius: "var(--radius-sm)",
                background: tab === t ? "var(--bg-card)" : "transparent",
                border: tab === t ? "1px solid var(--accent)" : "1px solid transparent",
                color:
                  tab === t ? "var(--text-primary)" : "var(--text-secondary)",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {t === "portfolio" ? "DCA Orders" : "History"}
            </button>
          ))}
        </div>

        {tab === "portfolio" ? (
          <div className="fade-in">
            <DCAList
              orders={activeOrders}
              isLoading={isLoading}
              onPause={handlePause}
              onCancel={handleCancel}
              onExecuteNow={handleExecuteNow}
            />
            <button
              className="btn btn-primary"
              onClick={() => setShowDCASetup(true)}
              style={{
                marginTop: 16,
                padding: "16px 24px",
                fontSize: 16,
                fontWeight: 700,
                borderRadius: "var(--radius-lg)",
              }}
            >
              + New DCA Strategy
            </button>
          </div>
        ) : (
          <div className="fade-in">
            <DCAHistory executions={executions} />
          </div>
        )}
      </div>

      <DepositFlow
        vault={depositVault}
        isOpen={!!depositVault}
        onClose={() => setDepositVault(null)}
        onDepositSuccess={handleDepositSuccess}
      />

      <DCASetup
        isOpen={showDCASetup}
        onClose={() => setShowDCASetup(false)}
        onSubmit={handleCreateDCA}
      />
    </div>
  );
}
