"use client";

import { useState, useEffect, useCallback } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import {
  useDeposit as useYoDeposit,
  useApprove as useYoApprove,
  useVault,
} from "@yo-protocol/react";
import { parseUnits, formatUnits, erc20Abi, type Address } from "viem";
import {
  ADDRESSES,
  CHAIN,
  IS_TESTNET,
  IS_LOCAL_FORK,
  DEFAULT_SLIPPAGE_BPS,
  type VaultConfig,
} from "@/lib/constants";

const vaultAbi = [
  {
    name: "deposit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "assets", type: "uint256" },
      { name: "receiver", type: "address" },
    ],
    outputs: [{ name: "shares", type: "uint256" }],
  },
  {
    name: "asset",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

interface DepositFlowProps {
  vault: VaultConfig | null;
  isOpen: boolean;
  onClose: () => void;
  onDepositSuccess?: () => void;
}

// ---------------------------------------------------------------------------
// Testnet deposit: direct ERC-4626 vault.deposit via wagmi
// ---------------------------------------------------------------------------
function useTestnetDeposit(
  vaultAddress: Address | undefined,
  assetAddress: Address | undefined,
  address: Address | undefined,
) {
  const {
    writeContract: writeApprove,
    data: approveTxHash,
    error: approveError,
    reset: resetApprove,
  } = useWriteContract();

  const {
    writeContract: writeDeposit,
    data: depositTxHash,
    error: depositError,
    reset: resetDeposit,
  } = useWriteContract();

  const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({
    hash: approveTxHash,
  });
  const { isSuccess: depositConfirmed } = useWaitForTransactionReceipt({
    hash: depositTxHash,
  });

  const approve = useCallback(
    (amount: bigint) => {
      if (!assetAddress || !vaultAddress || !address) return;
      writeApprove({
        address: assetAddress,
        abi: erc20Abi,
        functionName: "approve",
        args: [vaultAddress, amount],
        chain: CHAIN,
        account: address,
      });
    },
    [assetAddress, vaultAddress, address, writeApprove],
  );

  const deposit = useCallback(
    (amount: bigint) => {
      if (!vaultAddress || !address) return;
      writeDeposit({
        address: vaultAddress,
        abi: vaultAbi,
        functionName: "deposit",
        args: [amount, address],
        chain: CHAIN,
        account: address,
      });
    },
    [vaultAddress, address, writeDeposit],
  );

  const reset = useCallback(() => {
    try { resetApprove(); } catch {}
    try { resetDeposit(); } catch {}
  }, [resetApprove, resetDeposit]);

  return {
    approve,
    deposit,
    approveConfirmed,
    depositConfirmed,
    approveError,
    depositError,
    txHash: depositTxHash ?? approveTxHash,
    reset,
    spender: vaultAddress,
  };
}

// ---------------------------------------------------------------------------
// Mainnet deposit: Yo SDK useDeposit + useApprove (routes via YoGateway)
// ---------------------------------------------------------------------------
function useMainnetDeposit(vaultAddress: Address | undefined) {
  const { vault: vaultState } = useVault(
    vaultAddress ?? ADDRESSES.vaults.yoUSD.address,
  );
  const assetAddressFromSdk = vaultState?.asset as Address | undefined;

  const {
    deposit: yoDeposit,
    isLoading: yoDepositLoading,
    isSuccess: yoDepositSuccess,
    hash: yoDepositHash,
    error: yoDepositError,
    reset: yoDepositReset,
  } = useYoDeposit({
    vault: vaultAddress ?? "0x",
    slippageBps: DEFAULT_SLIPPAGE_BPS,
  });

  const {
    approveMax: yoApproveMax,
    isLoading: yoApproveLoading,
    isSuccess: yoApproveSuccess,
    hash: yoApproveHash,
    error: yoApproveError,
    reset: yoApproveReset,
  } = useYoApprove({
    token: assetAddressFromSdk ?? "0x",
  });

  const approve = useCallback(
    async (_amount: bigint) => {
      await yoApproveMax();
    },
    [yoApproveMax],
  );

  const deposit = useCallback(
    async (amount: bigint) => {
      await yoDeposit(amount);
    },
    [yoDeposit],
  );

  const reset = useCallback(() => {
    try { yoDepositReset(); } catch {}
    try { yoApproveReset(); } catch {}
  }, [yoDepositReset, yoApproveReset]);

  return {
    approve,
    deposit,
    approveConfirmed: yoApproveSuccess,
    depositConfirmed: yoDepositSuccess,
    approveError: yoApproveError,
    depositError: yoDepositError,
    txHash: yoDepositHash ?? yoApproveHash,
    reset,
    isLoading: yoDepositLoading || yoApproveLoading,
    spender: ADDRESSES.yoGateway as Address,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function DepositFlow({ vault, isOpen, onClose, onDepositSuccess }: DepositFlowProps) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<
    "input" | "approving" | "depositing" | "success"
  >("input");
  const { address, isConnected } = useAccount();

  const vaultAddress = vault?.address as Address | undefined;

  // Read asset address and balance via wagmi (works everywhere)
  const { data: assetAddress } = useReadContract({
    address: vaultAddress,
    abi: vaultAbi,
    functionName: "asset",
    query: { enabled: !!vaultAddress },
  });

  const { data: assetBalance } = useReadContract({
    address: assetAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!assetAddress && !!address },
  });

  const amountBigInt = amount
    ? parseUnits(amount, vault?.decimals ?? 6)
    : BigInt(0);

  // Both deposit strategies (hooks must be called unconditionally)
  const testnet = useTestnetDeposit(vaultAddress, assetAddress, address);
  const mainnet = useMainnetDeposit(vaultAddress);
  const useDirectDeposit = IS_TESTNET || IS_LOCAL_FORK;
  const strategy = useDirectDeposit ? testnet : mainnet;

  // Allowance check against the correct spender
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: assetAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args:
      address && strategy.spender
        ? [address, strategy.spender]
        : undefined,
    query: { enabled: !!assetAddress && !!address && !!strategy.spender },
  });

  const needsApproval =
    amountBigInt > BigInt(0) &&
    allowance !== undefined &&
    allowance < amountBigInt;

  // React to approval confirmed -> proceed to deposit
  useEffect(() => {
    if (strategy.approveConfirmed && step === "approving") {
      refetchAllowance();
      setStep("depositing");
      strategy.deposit(amountBigInt);
    }
  }, [strategy.approveConfirmed]);

  useEffect(() => {
    if (strategy.depositConfirmed && step === "depositing") {
      setStep("success");
      onDepositSuccess?.();
    }
  }, [strategy.depositConfirmed]);

  useEffect(() => {
    if (strategy.approveError) {
      setStep("input");
      const msg =
        strategy.approveError instanceof Error
          ? strategy.approveError.message
          : String(strategy.approveError);
      setError(
        msg.includes("User rejected") || msg.includes("rejected")
          ? "Transaction was rejected"
          : `Approval failed: ${msg.slice(0, 100)}`,
      );
    }
  }, [strategy.approveError]);

  useEffect(() => {
    if (strategy.depositError) {
      setStep("input");
      const msg =
        strategy.depositError instanceof Error
          ? strategy.depositError.message
          : String(strategy.depositError);
      setError(
        msg.includes("User rejected") || msg.includes("rejected")
          ? "Transaction was rejected"
          : `Deposit failed: ${msg.slice(0, 100)}`,
      );
    }
  }, [strategy.depositError]);

  const handleSubmit = async () => {
    if (!amountBigInt || !vault || !vaultAddress || !address) return;
    setError(null);

    try {
      if (needsApproval) {
        setStep("approving");
        await strategy.approve(amountBigInt);
      } else {
        setStep("depositing");
        await strategy.deposit(amountBigInt);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("User rejected") || msg.includes("rejected")) {
        setError("Transaction was rejected");
      } else if (msg.includes("Client not available")) {
        setError("Yo SDK unavailable. Try refreshing or switching networks.");
      } else {
        setError(msg.slice(0, 120));
      }
      setStep("input");
    }
  };

  const handleMax = () => {
    if (assetBalance && vault) {
      setAmount(formatUnits(assetBalance, vault.decimals));
    }
  };

  const resetAll = useCallback(() => {
    setAmount("");
    setError(null);
    setStep("input");
    strategy.reset();
  }, [strategy.reset]);

  useEffect(() => {
    if (!isOpen) resetAll();
  }, [isOpen, resetAll]);

  const isProcessing = step === "approving" || step === "depositing";
  const basescanBase =
    CHAIN.blockExplorers?.default.url ?? "https://basescan.org";

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
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <h3 style={{ fontSize: 18, fontWeight: 600 }}>
            {step === "success"
              ? "Deposit Complete"
              : `Deposit ${vault?.name ?? ""}`}
          </h3>
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

        {!isConnected ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <p
              style={{
                color: "var(--text-secondary)",
                marginBottom: 16,
                fontSize: 14,
              }}
            >
              Connect your wallet to deposit into {vault?.name ?? "a vault"}.
            </p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        ) : step === "success" ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "rgba(34, 197, 94, 0.2)",
                color: "var(--success)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                fontSize: 24,
              }}
            >
              ✓
            </div>
            <p style={{ color: "var(--text-secondary)", marginBottom: 8 }}>
              Successfully deposited {amount} {vault?.underlyingSymbol}
            </p>
            {strategy.txHash && (
              <a
                href={`${basescanBase}/tx/${strategy.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 14, wordBreak: "break-all" }}
              >
                View on Explorer
              </a>
            )}
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <label className="label" htmlFor="deposit-amount">
                Amount ({vault?.underlyingSymbol ?? ""})
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  id="deposit-amount"
                  type="text"
                  inputMode="decimal"
                  className="input"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value.replace(/[^0-9.]/g, ""));
                    setError(null);
                  }}
                  disabled={isProcessing}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: "auto", flexShrink: 0 }}
                  onClick={handleMax}
                  disabled={!assetBalance || isProcessing}
                >
                  Max
                </button>
              </div>
              {assetBalance !== undefined && vault && (
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    marginTop: 6,
                  }}
                >
                  Balance:{" "}
                  {Number(formatUnits(assetBalance, vault.decimals)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}{" "}
                  {vault.underlyingSymbol}
                </div>
              )}
            </div>

            {!useDirectDeposit && (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  marginBottom: 12,
                  padding: "8px 12px",
                  background: "var(--bg-secondary)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                Deposit via Yo Protocol Gateway
              </div>
            )}

            {error && (
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
                {error}
              </div>
            )}

            <div style={{ display: "flex", gap: 12 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!amountBigInt || isProcessing}
                onClick={handleSubmit}
              >
                {step === "approving"
                  ? "Approving..."
                  : step === "depositing"
                    ? "Depositing..."
                    : needsApproval
                      ? "Approve & Deposit"
                      : "Deposit"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
