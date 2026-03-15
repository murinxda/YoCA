"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { formatUnits } from "viem";
import { ADDRESSES, type VaultId } from "@/lib/constants";
import { apiFetch } from "@/app/lib/api";
import type { DcaOrder } from "@/db/schema";

type ActionType = "pause" | "resume" | "cancel" | "executeNow";

interface PendingAction {
  type: ActionType;
  orderId: string;
  order: DcaOrder;
}

interface SwapPreview {
  price: number;
  expectedAmountOut: string;
  minAmountOut: string;
  sellAmount: string;
  sellDecimals: number;
  buyDecimals: number;
  sellSymbol: string;
  sellVaultName: string;
  buySymbol: string;
  buyVaultName: string;
  slippageBps: number;
}

interface DCAListProps {
  orders: DcaOrder[];
  isLoading?: boolean;
  onPause: (id: string) => Promise<unknown>;
  onCancel: (id: string) => Promise<unknown>;
  onExecuteNow: (id: string) => Promise<unknown>;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);

  if (diffMs < 0) return "Overdue";
  if (diffMins < 60) return `in ${diffMins} min`;
  if (diffHours < 24) return `in ${diffHours} hours`;
  return `in ${diffDays} days`;
}

function formatRawAmount(rawAmount: string, decimals: number): string {
  const num = Number(formatUnits(BigInt(rawAmount), decimals));
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

const ACTION_CONFIG: Record<ActionType, {
  title: string;
  getDescription: (order: DcaOrder) => string;
  confirmLabel: string;
  loadingLabel: string;
  isDangerous: boolean;
}> = {
  executeNow: {
    title: "Execution Preview",
    getDescription: (order) => {
      const src = ADDRESSES.vaults[order.sourceVault as VaultId];
      const tgt = ADDRESSES.vaults[order.targetVault as VaultId];
      const amount = formatRawAmount(order.amount, src?.decimals ?? 6);
      return `Preview of swapping ${amount} ${src?.name ?? order.sourceVault} into ${tgt?.name ?? order.targetVault} at current market rates. If you're happy with the quote, you can execute it now. Your next scheduled execution will be rescheduled based on the current interval.`;
    },
    confirmLabel: "Execute Now",
    loadingLabel: "Executing…",
    isDangerous: false,
  },
  pause: {
    title: "Pause Order",
    getDescription: () =>
      "This will pause the DCA order. No further automatic executions will occur until you resume it. You can resume at any time.",
    confirmLabel: "Pause Order",
    loadingLabel: "Pausing…",
    isDangerous: false,
  },
  resume: {
    title: "Resume Order",
    getDescription: (order) =>
      `This will resume the DCA order and automatic executions will continue every ${order.periodDays} day${order.periodDays !== 1 ? "s" : ""}.`,
    confirmLabel: "Resume Order",
    loadingLabel: "Resuming…",
    isDangerous: false,
  },
  cancel: {
    title: "Cancel Order",
    getDescription: () =>
      "This will permanently cancel the DCA order. No further executions will occur and this action cannot be undone.",
    confirmLabel: "Cancel Order",
    loadingLabel: "Cancelling…",
    isDangerous: true,
  },
};

const SUCCESS_MESSAGES: Record<ActionType, string> = {
  executeNow: "Swap executed successfully! Check the History tab for details.",
  pause: "Order paused. No automatic executions will run until you resume.",
  resume: "Order resumed. Automatic executions are back on schedule.",
  cancel: "Order cancelled permanently.",
};

export function DCAList({ orders, isLoading, onPause, onCancel, onExecuteNow }: DCAListProps) {
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successType, setSuccessType] = useState<ActionType | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [swapPreview, setSwapPreview] = useState<SwapPreview | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const openConfirm = (type: ActionType, order: DcaOrder) => {
    setOpenMenuId(null);
    setPendingAction({ type, orderId: order.id, order });
    setActionError(null);
    setSuccessType(null);
    setSwapPreview(null);

    if (type === "executeNow") {
      setQuoteLoading(true);
      apiFetch(`/api/dca/${order.id}/quote`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => setSwapPreview(data))
        .catch(() => setSwapPreview(null))
        .finally(() => setQuoteLoading(false));
    }
  };

  const closeConfirm = () => {
    if (isConfirming) return;
    setPendingAction(null);
    setActionError(null);
    setSuccessType(null);
  };

  const handleConfirm = async () => {
    if (!pendingAction) return;
    setIsConfirming(true);
    setActionError(null);

    try {
      switch (pendingAction.type) {
        case "executeNow":
          await onExecuteNow(pendingAction.orderId);
          break;
        case "pause":
        case "resume":
          await onPause(pendingAction.orderId);
          break;
        case "cancel":
          await onCancel(pendingAction.orderId);
          break;
      }
      setSuccessType(pendingAction.type);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setIsConfirming(false);
    }
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeConfirm();
        setOpenMenuId(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isConfirming],
  );

  useEffect(() => {
    if (pendingAction || openMenuId) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [pendingAction, openMenuId, handleKeyDown]);

  useEffect(() => {
    if (!openMenuId) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openMenuId]);

  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 className="section-title">Active DCA Orders</h2>
        {[1, 2].map((i) => (
          <div key={i} className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <div className="skeleton" style={{ width: 120, height: 14, marginBottom: 8 }} />
                <div className="skeleton" style={{ width: 200, height: 18 }} />
              </div>
              <div className="skeleton" style={{ width: 60, height: 24, borderRadius: 999 }} />
            </div>
            <div className="skeleton" style={{ width: 160, height: 13, marginBottom: 16 }} />
            <div className="skeleton" style={{ width: "100%", height: 44, borderRadius: "var(--radius-md)" }} />
          </div>
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 className="section-title">Active DCA Orders</h2>
        <div
          className="card"
          style={{
            textAlign: "center",
            padding: 40,
            border: "1px dashed var(--border)",
          }}
        >
          <p style={{ color: "var(--text-secondary)", marginBottom: 8 }}>
            No DCA orders yet
          </p>
          <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
            Create a DCA order to automatically convert stable assets to volatile vaults over time
          </p>
        </div>
      </div>
    );
  }

  const config = pendingAction ? ACTION_CONFIG[pendingAction.type] : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 className="section-title">Active DCA Orders</h2>
      {orders.map((order) => {
        const sourceVault = ADDRESSES.vaults[order.sourceVault as VaultId];
        const targetVault = ADDRESSES.vaults[order.targetVault as VaultId];
        const nextExec = new Date(order.nextExecutionAt);
        const isActive = order.status === "active";
        const isPaused = order.status === "paused";

        const menuOpen = openMenuId === order.id;

        return (
          <div
            key={order.id}
            className="card fade-in"
            style={{
              borderLeft: `4px solid ${sourceVault?.color ?? "var(--accent)"}`,
              position: "relative",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>
                {order.sourceVault} → {order.targetVault}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  className={`badge ${
                    isActive ? "badge-success" : isPaused ? "badge-warning" : "badge-danger"
                  }`}
                >
                  {order.status}
                </span>
                {(isActive || isPaused) && (
                  <div style={{ position: "relative" }} ref={menuOpen ? menuRef : undefined}>
                    <button
                      type="button"
                      onClick={() => setOpenMenuId(menuOpen ? null : order.id)}
                      style={{
                        background: "rgba(255,255,255,0.08)",
                        border: "none",
                        cursor: "pointer",
                        padding: "4px 6px",
                        borderRadius: "var(--radius-sm)",
                        color: "var(--text-secondary)",
                        fontSize: 18,
                        lineHeight: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      ⋮
                    </button>
                    {menuOpen && (
                      <div
                        style={{
                          position: "absolute",
                          top: "100%",
                          right: 0,
                          marginTop: 4,
                          background: "var(--bg-secondary)",
                          border: "1px solid var(--border)",
                          borderRadius: "var(--radius-md)",
                          boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
                          minWidth: 160,
                          zIndex: 50,
                          overflow: "hidden",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => openConfirm("executeNow", order)}
                          style={{
                            display: "block",
                            width: "100%",
                            padding: "10px 14px",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            fontSize: 14,
                            color: "var(--text-secondary)",
                            textAlign: "left",
                          }}
                        >
                          Preview Execution
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
              {formatRawAmount(order.amount, sourceVault?.decimals ?? 6)} {sourceVault?.name ?? order.sourceVault} per execution
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
              Every {order.periodDays} day{order.periodDays !== 1 ? "s" : ""} · Next: {formatRelativeTime(nextExec)}
            </div>
            {isActive || isPaused ? (
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => openConfirm(isPaused ? "resume" : "pause", order)}
                >
                  {isPaused ? "Resume" : "Pause"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => openConfirm("cancel", order)}
                >
                  Cancel
                </button>
              </div>
            ) : null}
          </div>
        );
      })}

      {/* Confirmation Dialog */}
      {pendingAction && config && (
        <div
          onClick={closeConfirm}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 16,
          }}
        >
          <div
            className="card fade-in"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 400,
              padding: 24,
            }}
          >
            {successType ? (
              <>
                <div style={{ textAlign: "center", marginBottom: 16 }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    background: "rgba(34, 197, 94, 0.15)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 24,
                    marginBottom: 12,
                  }}>
                    ✓
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--success)" }}>
                    Success
                  </h3>
                </div>
                <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, textAlign: "center", marginBottom: 20 }}>
                  {SUCCESS_MESSAGES[successType]}
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={closeConfirm}
                >
                  Done
                </button>
              </>
            ) : (
              <>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
                  {config.title}
                </h3>
                <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 20 }}>
                  {config.getDescription(pendingAction.order)}
                </p>

                {pendingAction.type === "executeNow" && (
                  <div
                    style={{
                      marginBottom: 16,
                      padding: "10px 14px",
                      background: "var(--bg-secondary)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: 13,
                      minHeight: 76,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                    }}
                  >
                    {quoteLoading ? (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "8px 0", color: "var(--text-secondary)" }}>
                        <span className="spinner" />
                        Fetching swap quote…
                      </div>
                    ) : swapPreview ? (
                      <>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, color: "var(--text-secondary)" }}>
                          <span>You send</span>
                          <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                            {Number(formatUnits(BigInt(swapPreview.sellAmount), swapPreview.sellDecimals)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 })} {swapPreview.sellVaultName}
                          </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, color: "var(--text-secondary)" }}>
                          <span>You receive (est.)</span>
                          <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                            {Number(formatUnits(BigInt(swapPreview.expectedAmountOut), swapPreview.buyDecimals)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} {swapPreview.buyVaultName}
                          </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, color: "var(--text-secondary)" }}>
                          <span>Exchange rate</span>
                          <span>
                            1 {swapPreview.buyVaultName} = {swapPreview.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 })} {swapPreview.sellVaultName}
                          </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)" }}>
                          <span>Min. received</span>
                          <span>
                            {Number(formatUnits(BigInt(swapPreview.minAmountOut), swapPreview.buyDecimals)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} {swapPreview.buyVaultName}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div style={{ color: "var(--text-secondary)", textAlign: "center", padding: "8px 0" }}>
                        Quote unavailable
                      </div>
                    )}
                  </div>
                )}

                {actionError && (
                  <div style={{
                    fontSize: 13,
                    color: "var(--danger)",
                    background: "rgba(239, 68, 68, 0.1)",
                    padding: "8px 12px",
                    borderRadius: "var(--radius-sm)",
                    marginBottom: 12,
                  }}>
                    {actionError}
                  </div>
                )}

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                    onClick={closeConfirm}
                    disabled={isConfirming}
                  >
                    Go Back
                  </button>
                  <button
                    type="button"
                    className={`btn ${config.isDangerous ? "btn-danger" : "btn-primary"}`}
                    style={{ flex: 1 }}
                    onClick={handleConfirm}
                    disabled={isConfirming || (pendingAction?.type === "executeNow" && (quoteLoading || !swapPreview))}
                  >
                    {isConfirming ? (
                      <>
                        <span className="spinner" />
                        {config.loadingLabel}
                      </>
                    ) : (
                      config.confirmLabel
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
