"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./lib/api";
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

export default function Home() {
  const { address, isConnected, isReconnecting } = useAccount();

  const [tab, setTab] = useState<Tab>("portfolio");
  const [depositVault, setDepositVault] = useState<VaultConfig | null>(null);
  const [showDCASetup, setShowDCASetup] = useState(false);
  const [orders, setOrders] = useState<DcaOrder[]>([]);
  const [executions, setExecutions] = useState<DcaExecution[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshingVaults, setIsRefreshingVaults] = useState(false);
  const queryClient = useQueryClient();

  const fetchDCAData = useCallback(async () => {
    if (!address) return;
    setIsLoading(true);
    try {
      const response = await apiFetch(`/api/dca?address=${address}`, undefined, address);
      const data = await response.json();
      setOrders(data.orders || []);
      setExecutions(data.executions || []);
    } catch (error) {
      console.error("Failed to fetch DCA data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (isConnected && address) {
      fetchDCAData();
    } else {
      setOrders([]);
      setExecutions([]);
    }
  }, [isConnected, address, fetchDCAData]);

  const handleCreateDCA = async (config: DCAConfig) => {
    if (!address) return;
    const response = await apiFetch("/api/dca", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...config, address }),
    }, address);

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
    }, address);

    if (!response.ok) throw new Error("Failed to update order");

    const data = await response.json();
    applyOrderUpdate(data.order);
  };

  const handleCancel = async (id: string) => {
    const response = await apiFetch(`/api/dca/${id}`, {
      method: "DELETE",
    }, address);

    if (!response.ok) throw new Error("Failed to cancel order");

    const data = await response.json();
    applyOrderUpdate(data.order);
  };

  const handleExecuteNow = async (id: string) => {
    const response = await apiFetch(`/api/dca/${id}/execute`, {
      method: "POST",
    }, address);

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

  if (isReconnecting) {
    return (
      <div style={{ minHeight: "100vh" }}>
        <Header />
        <div
          className="container"
          style={{
            paddingTop: 80,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            Loading…
          </p>
        </div>
      </div>
    );
  }

  const activeOrders = orders.filter((o) => o.status !== "cancelled");

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 32 }}>
      <Header />

      <div className="container" style={{ paddingTop: 16 }}>
        {/* Stable Vault Balances */}
        <VaultBalances
          onDeposit={(vault) => setDepositVault(vault)}
          isRefreshing={isRefreshingVaults}
        />

        {/* Tab Navigation */}
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
                padding: "10px 16px",
                borderRadius: "var(--radius-sm)",
                background: tab === t ? "var(--bg-card)" : "transparent",
                color:
                  tab === t ? "var(--text-primary)" : "var(--text-secondary)",
                fontSize: 14,
                fontWeight: 600,
                transition: "all 0.15s ease",
              }}
            >
              {t === "portfolio" ? "DCA Orders" : "History"}
            </button>
          ))}
        </div>

        {/* Tab Content */}
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

      {/* Modals */}
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
