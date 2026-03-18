"use client";

import { formatUnits } from "viem";
import { ADDRESSES, CHAIN, type VaultId } from "@/lib/constants";
import type { DcaExecution } from "@/db/schema";

type EnrichedExecution = DcaExecution & {
  sourceVault?: string | null;
  targetVault?: string | null;
};

interface DCAHistoryProps {
  executions: EnrichedExecution[];
}

function formatRawAmount(raw: string, decimals: number): string {
  const num = Number(formatUnits(BigInt(raw), decimals));
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function DCAHistory({ executions }: DCAHistoryProps) {
  if (executions.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 className="section-title">Execution History</h2>
        <div
          className="card"
          style={{
            textAlign: "center",
            padding: 40,
            border: "1px dashed var(--border)",
          }}
        >
          <p style={{ color: "var(--text-secondary)", marginBottom: 8 }}>
            No executions yet
          </p>
          <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
            DCA executions will appear here once your orders run
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 className="section-title">Execution History</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {executions.map((exec) => {
          const executedAt = new Date(exec.executedAt);
          const statusClass =
            exec.status === "success"
              ? "badge-success"
              : exec.status === "failed"
                ? "badge-danger"
                : "badge-warning";

          const srcVault = exec.sourceVault
            ? ADDRESSES.vaults[exec.sourceVault as VaultId]
            : null;
          const tgtVault = exec.targetVault
            ? ADDRESSES.vaults[exec.targetVault as VaultId]
            : null;

          const srcDecimals = srcVault?.decimals ?? 6;
          const tgtDecimals = tgtVault?.decimals ?? 18;

          const priceNum = exec.price ? Number(exec.price) : null;
          const priceValid = priceNum !== null && isFinite(priceNum);

          return (
            <div
              key={exec.id}
              className="card fade-in"
              style={{ padding: 16 }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      marginBottom: 4,
                    }}
                  >
                    {formatDate(executedAt)}
                  </div>
                  <div style={{ fontSize: 14, marginBottom: 4 }}>
                    {formatRawAmount(exec.amountIn, srcDecimals)}{" "}
                    {srcVault?.name ?? "?"} →{" "}
                    {exec.amountOut
                      ? `${formatRawAmount(exec.amountOut, tgtDecimals)} ${tgtVault?.name ?? "?"}`
                      : "—"}
                  </div>
                  {priceValid && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-secondary)",
                      }}
                    >
                      Price: {priceNum.toFixed(6)}
                    </div>
                  )}
                  {exec.status === "failed" && exec.failureReason && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--danger)",
                        marginTop: 4,
                      }}
                    >
                      {exec.failureReason}
                    </div>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span className={`badge ${statusClass}`}>{exec.status}</span>
                  {exec.txHash && CHAIN.blockExplorers?.default.url && (
                    <a
                      href={`${CHAIN.blockExplorers.default.url}/tx/${exec.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 12 }}
                    >
                      {exec.status === "failed" ? "View failed tx" : "View tx"}
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
