import { type Address } from "viem";
import { getDb } from "@/db";
import { dcaOrders, dcaExecutions, type DcaOrder } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ADDRESSES, type VaultId } from "@/lib/constants";
import { getSwapQuote, executeOnChainDCA } from "@/lib/keeper";

const MAX_EXECUTION_RETRIES = 3;

export interface ExecutionResult {
  orderId: string;
  status: "success" | "failed" | "skipped";
  reason?: string;
}

function nextIntervalFromNow(order: DcaOrder) {
  const next = new Date();
  next.setDate(next.getDate() + order.periodDays);
  return next;
}

function nextIntervalFromScheduled(order: DcaOrder) {
  const next = new Date(order.nextExecutionAt);
  next.setDate(next.getDate() + order.periodDays);
  return next;
}

async function handleRetriableFailure(
  order: DcaOrder,
  reason: string,
  status: "failed" | "skipped",
  txHash?: string,
): Promise<ExecutionResult> {
  const db = getDb();
  const newRetryCount = order.retryCount + 1;

  if (newRetryCount >= MAX_EXECUTION_RETRIES) {
    await db.insert(dcaExecutions).values({
      orderId: order.id,
      amountIn: order.amount,
      txHash: txHash ?? null,
      failureReason: `${reason} (after ${MAX_EXECUTION_RETRIES} attempts)`,
      status: "failed",
    });

    await db
      .update(dcaOrders)
      .set({ retryCount: 0, nextExecutionAt: nextIntervalFromScheduled(order) })
      .where(eq(dcaOrders.id, order.id));

    return {
      orderId: order.id,
      status: "failed",
      reason: `${reason} (max retries reached, delayed to next interval)`,
    };
  }

  await db
    .update(dcaOrders)
    .set({ retryCount: newRetryCount })
    .where(eq(dcaOrders.id, order.id));

  return { orderId: order.id, status, reason };
}

export interface ExecutionOptions {
  manual?: boolean;
}

export async function executeSingleOrder(
  order: DcaOrder,
  userAddress: string,
  options: ExecutionOptions = {},
): Promise<ExecutionResult> {
  const db = getDb();
  const { manual = false } = options;
  const sourceVault = ADDRESSES.vaults[order.sourceVault as VaultId];
  const targetVault = ADDRESSES.vaults[order.targetVault as VaultId];

  if (!sourceVault || !targetVault) {
    if (manual) return { orderId: order.id, status: "failed", reason: "Invalid vault configuration" };
    return handleRetriableFailure(order, "Invalid vault configuration", "failed");
  }

  const amountIn = BigInt(order.amount);

  const quote = await getSwapQuote(
    sourceVault.address,
    targetVault.address,
    amountIn,
    sourceVault.decimals,
    targetVault.decimals,
  );

  if (!quote) {
    if (manual) return { orderId: order.id, status: "failed", reason: "Failed to get swap quote" };
    return handleRetriableFailure(order, "Failed to get swap quote", "failed");
  }

  if (order.minPrice) {
    const minPrice = parseFloat(order.minPrice);
    if (quote.price < minPrice) {
      const reason = `Price ${quote.price} below min ${minPrice}`;
      if (manual) return { orderId: order.id, status: "skipped", reason };
      return handleRetriableFailure(order, reason, "skipped");
    }
  }

  if (order.maxPrice) {
    const maxPrice = parseFloat(order.maxPrice);
    if (quote.price > maxPrice) {
      const reason = `Price ${quote.price} above max ${maxPrice}`;
      if (manual) return { orderId: order.id, status: "skipped", reason };
      return handleRetriableFailure(order, reason, "skipped");
    }
  }

  const slippageFactor = BigInt(10000 - order.slippageBps);
  const minAmountOut = (quote.expectedAmountOut * slippageFactor) / BigInt(10000);

  const result = await executeOnChainDCA({
    user: userAddress as Address,
    tokenIn: sourceVault.address,
    tokenOut: targetVault.address,
    amountIn,
    minAmountOut,
    router: quote.router,
    swapData: quote.swapData,
  });

  if (result.success && result.txHash) {
    await db.insert(dcaExecutions).values({
      orderId: order.id,
      txHash: result.txHash,
      amountIn: order.amount,
      amountOut: quote.expectedAmountOut.toString(),
      price: quote.price.toString(),
      status: "success",
    });

    const nextExecution = manual
      ? nextIntervalFromNow(order)
      : nextIntervalFromScheduled(order);

    await db
      .update(dcaOrders)
      .set({ retryCount: 0, nextExecutionAt: nextExecution })
      .where(eq(dcaOrders.id, order.id));

    return { orderId: order.id, status: "success" };
  }

  const failReason = result.error ?? "On-chain execution failed";

  if (manual) {
    return { orderId: order.id, status: "failed", reason: failReason };
  }

  return handleRetriableFailure(order, failReason, "failed", result.txHash);
}
