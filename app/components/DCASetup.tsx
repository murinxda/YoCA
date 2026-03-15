"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatUnits, parseUnits, erc20Abi, maxUint256, type Address } from "viem";
import {
  ADDRESSES,
  CHAIN,
  STABLE_VAULTS,
  VOLATILE_VAULTS,
  PERIOD_OPTIONS,
  DEFAULT_SLIPPAGE_BPS,
  type VaultId,
} from "@/lib/constants";
import { useStableVaultBalances } from "@/app/hooks/useVaultBalance";

export interface DCAConfig {
  sourceVault: VaultId;
  targetVault: VaultId;
  amount: string;
  periodDays: number;
  slippageBps: number;
  minPrice?: string;
  maxPrice?: string;
}

interface DCASetupProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (config: DCAConfig) => Promise<void>;
}

export function DCASetup({ isOpen, onClose, onSubmit }: DCASetupProps) {
  const { address } = useAccount();
  const [sourceVault, setSourceVault] = useState<VaultId>("yoUSD");
  const [targetVault, setTargetVault] = useState<VaultId>("yoETH");
  const [amount, setAmount] = useState("");
  const [periodDays, setPeriodDays] = useState(7);
  const [slippageBps, setSlippageBps] = useState(DEFAULT_SLIPPAGE_BPS);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    setAmount("");
  }, [sourceVault]);

  useEffect(() => {
    if (!isOpen) {
      setAmount("");
      setSourceVault("yoUSD");
      setTargetVault("yoETH");
      setPeriodDays(7);
      setSlippageBps(DEFAULT_SLIPPAGE_BPS);
      setShowAdvanced(false);
      setMinPrice("");
      setMaxPrice("");
      setCreateError(null);
    }
  }, [isOpen]);

  const balances = useStableVaultBalances();
  const sourceVaultConfig = STABLE_VAULTS.find((v) => v.id === sourceVault);
  const zero = BigInt(0);
  const sourceBalance = balances.find((b) => b.vault.id === sourceVault)?.shares ?? zero;

  const sourceVaultAddress = sourceVaultConfig?.address as Address | undefined;
  const yocaDCA = ADDRESSES.yocaDCA as Address;

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: sourceVaultAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: address && sourceVaultAddress ? [address, yocaDCA] : undefined,
    query: { enabled: !!address && !!sourceVaultAddress },
  });

  const amountRaw = amount && sourceVaultConfig
    ? parseUnits(amount, sourceVaultConfig.decimals)
    : zero;

  const needsApproval =
    amountRaw > zero &&
    allowance !== undefined &&
    allowance < amountRaw;

  const {
    writeContract: writeApprove,
    data: approveTxHash,
    error: approveError,
    reset: resetApprove,
  } = useWriteContract();

  const { isSuccess: approveConfirmed, isLoading: approveWaiting } =
    useWaitForTransactionReceipt({ hash: approveTxHash });

  useEffect(() => {
    if (approveConfirmed) refetchAllowance();
  }, [approveConfirmed, refetchAllowance]);

  const handleApprove = () => {
    if (!sourceVaultAddress || !address) return;
    writeApprove({
      address: sourceVaultAddress,
      abi: erc20Abi,
      functionName: "approve",
      args: [yocaDCA, maxUint256],
      chain: CHAIN,
      account: address,
    });
  };

  const isApproving = !!approveTxHash && !approveConfirmed;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (needsApproval || isCreating) return;
    setIsCreating(true);
    setCreateError(null);
    try {
      await onSubmit({
        sourceVault,
        targetVault,
        amount,
        periodDays,
        slippageBps,
        minPrice: minPrice || undefined,
        maxPrice: maxPrice || undefined,
      });
      resetApprove();
      onClose();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create DCA order");
    } finally {
      setIsCreating(false);
    }
  };

  const handleMax = () => {
    if (sourceVaultConfig) {
      setAmount(formatUnits(sourceBalance, sourceVaultConfig.decimals));
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(4px)",
        }}
        onClick={isCreating ? undefined : onClose}
        onKeyDown={(e) => e.key === "Escape" && !isCreating && onClose()}
        role="button"
        tabIndex={0}
        aria-label="Close"
      />
      <div
        className="card fade-in"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 400,
          maxHeight: "90vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600 }}>New DCA Order</h3>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "none",
                color: "var(--text-secondary)",
                fontSize: 24,
                padding: 4,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label className="label">Source vault</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {balances.map(({ vault: v, shares, assets, isLoading }) => {
                const selected = sourceVault === v.id;
                const hasBalance = shares > zero;
                const formattedShares = formatUnits(shares, v.decimals);
                const formattedAssets = formatUnits(assets, v.decimals);
                return (
                  <button
                    key={v.id}
                    type="button"
                    className={`btn ${selected ? "btn-primary" : "btn-secondary"}`}
                    style={{
                      width: "100%",
                      borderLeft: `4px solid ${v.color}`,
                      padding: "10px 14px",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      textAlign: "left",
                    }}
                    onClick={() => setSourceVault(v.id)}
                  >
                    <div style={{ minWidth: 56 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>
                        {v.name}
                      </div>
                      <div style={{ fontSize: 11, opacity: 0.6 }}>
                        {v.underlyingSymbol}
                      </div>
                    </div>
                    <div style={{ flex: 1, textAlign: "right" }}>
                      {isLoading ? (
                        <div
                          className="skeleton"
                          style={{ height: 14, width: "60%", marginLeft: "auto" }}
                        />
                      ) : hasBalance ? (
                        <>
                          <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.2 }}>
                            {Number(formattedShares).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 3,
                            })}{" "}
                            <span style={{ fontSize: 11, fontWeight: 500, opacity: 0.6 }}>
                              shares
                            </span>
                          </div>
                          <div style={{ fontSize: 11, opacity: 0.6 }}>
                            ≈{" "}
                            {Number(formattedAssets).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 3,
                            })}{" "}
                            {v.underlyingSymbol}
                          </div>
                        </>
                      ) : (
                        <div style={{ fontSize: 12, opacity: 0.5 }}>
                          No position
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label className="label">Target vault</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {VOLATILE_VAULTS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  className={`btn ${targetVault === v.id ? "btn-primary" : "btn-secondary"}`}
                  style={{
                    flex: 1,
                    minWidth: 100,
                    borderLeft: `4px solid ${v.color}`,
                  }}
                  onClick={() => setTargetVault(v.id)}
                >
                  {v.name}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label className="label" htmlFor="dca-amount">
              Amount per execution
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ position: "relative", flex: 1 }}>
                <input
                  id="dca-amount"
                  type="text"
                  inputMode="decimal"
                  className="input"
                  placeholder="0.00"
                  style={{ paddingRight: 64 }}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                />
                {sourceVaultConfig && (
                  <span
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                      pointerEvents: "none",
                      userSelect: "none",
                    }}
                  >
                    {sourceVaultConfig.name}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: "auto", flexShrink: 0 }}
                onClick={handleMax}
              >
                Max
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label className="label" htmlFor="dca-period">
              Period
            </label>
            <select
              id="dca-period"
              className="input"
              style={{ appearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23A0A0A0' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}
              value={periodDays}
              onChange={(e) => setPeriodDays(Number(e.target.value))}
            >
              {PERIOD_OPTIONS.map((opt) => (
                <option key={opt.days} value={opt.days}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label className="label" htmlFor="dca-slippage">
              Slippage (%)
            </label>
            <input
              id="dca-slippage"
              type="text"
              inputMode="decimal"
              className="input"
              value={(slippageBps / 100).toFixed(2)}
              onChange={(e) => {
                const val = parseFloat(e.target.value.replace(/[^0-9.]/g, ""));
                if (!isNaN(val)) setSlippageBps(Math.round(val * 100));
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: "100%", marginBottom: 12 }}
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? "−" : "+"} Advanced
            </button>
            {showAdvanced && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }} className="fade-in">
                <div>
                  <label className="label" htmlFor="dca-min-price">
                    Min price (optional)
                  </label>
                  <input
                    id="dca-min-price"
                    type="text"
                    inputMode="decimal"
                    className="input"
                    placeholder="0"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="dca-max-price">
                    Max price (optional)
                  </label>
                  <input
                    id="dca-max-price"
                    type="text"
                    inputMode="decimal"
                    className="input"
                    placeholder="0"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                  />
                </div>
              </div>
            )}
          </div>

          {createError && (
            <div
              style={{
                padding: "10px 14px",
                marginBottom: 16,
                borderRadius: "var(--radius-sm)",
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                color: "var(--danger)",
                fontSize: 13,
              }}
            >
              {createError}
            </div>
          )}

          {approveError && (
            <div
              style={{
                padding: "10px 14px",
                marginBottom: 16,
                borderRadius: "var(--radius-sm)",
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                color: "var(--danger)",
                fontSize: 13,
              }}
            >
              {approveError.message.includes("User rejected")
                ? "Approval was rejected"
                : `Approval failed: ${approveError.message.slice(0, 80)}`}
            </div>
          )}

          {needsApproval && amountRaw > zero && (
            <div
              style={{
                padding: "10px 14px",
                marginBottom: 16,
                borderRadius: "var(--radius-sm)",
                background: "rgba(99, 102, 241, 0.1)",
                border: "1px solid rgba(99, 102, 241, 0.2)",
                color: "var(--accent)",
                fontSize: 13,
              }}
            >
              You need to approve YoCA to spend your {sourceVaultConfig?.name} tokens for automated DCA execution.
            </div>
          )}

          <div style={{ display: "flex", gap: 12 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isCreating}>
              Cancel
            </button>
            {needsApproval ? (
              <button
                type="button"
                className="btn btn-primary"
                disabled={!amountRaw || isApproving || approveWaiting}
                onClick={handleApprove}
              >
                {isApproving ? "Approving..." : "Approve YoCA"}
              </button>
            ) : (
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!amount || parseFloat(amount) <= 0 || isCreating}
              >
                {isCreating ? "Creating..." : "Create DCA"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
