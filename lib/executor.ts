import { type Address } from "viem";
import { getDb } from "@/db";
import { dcaOrders, dcaExecutions, type DcaOrder } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ADDRESSES, type VaultId } from "@/lib/constants";
import { getSwapQuote, executeOnChainDCA } from "@/lib/keeper";

export interface ExecutionResult {
  orderId: string;
  status: "success" | "failed" | "skipped";
  reason?: string;
}

export async function executeSingleOrder(
  order: DcaOrder,
  userAddress: string,
): Promise<ExecutionResult> {
  const db = getDb();
  const sourceVault = ADDRESSES.vaults[order.sourceVault as VaultId];
  const targetVault = ADDRESSES.vaults[order.targetVault as VaultId];

  if (!sourceVault || !targetVault) {
    return { orderId: order.id, status: "failed", reason: "Invalid vault configuration" };
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
    await db.insert(dcaExecutions).values({
      orderId: order.id,
      amountIn: order.amount,
      status: "failed",
    });
    return { orderId: order.id, status: "failed", reason: "Failed to get swap quote" };
  }

  if (order.minPrice) {
    const minPrice = parseFloat(order.minPrice);
    if (quote.price < minPrice) {
      return {
        orderId: order.id,
        status: "skipped",
        reason: `Price ${quote.price} below min ${minPrice}`,
      };
    }
  }

  if (order.maxPrice) {
    const maxPrice = parseFloat(order.maxPrice);
    if (quote.price > maxPrice) {
      return {
        orderId: order.id,
        status: "skipped",
        reason: `Price ${quote.price} above max ${maxPrice}`,
      };
    }
  }

  const slippageFactor = BigInt(10000 - order.slippageBps);
  const minAmountOut = (quote.expectedAmountOut * slippageFactor) / BigInt(10000);

  const txHash = await executeOnChainDCA({
    user: userAddress as Address,
    tokenIn: sourceVault.address,
    tokenOut: targetVault.address,
    amountIn,
    minAmountOut,
    router: quote.router,
    swapData: quote.swapData,
  });

  if (txHash) {
    await db.insert(dcaExecutions).values({
      orderId: order.id,
      txHash,
      amountIn: order.amount,
      amountOut: quote.expectedAmountOut.toString(),
      price: quote.price.toString(),
      status: "success",
    });

    const nextExecution = new Date();
    nextExecution.setDate(nextExecution.getDate() + order.periodDays);

    await db
      .update(dcaOrders)
      .set({ nextExecutionAt: nextExecution })
      .where(eq(dcaOrders.id, order.id));

    return { orderId: order.id, status: "success" };
  }

  await db.insert(dcaExecutions).values({
    orderId: order.id,
    amountIn: order.amount,
    status: "failed",
  });

  return { orderId: order.id, status: "failed", reason: "On-chain execution failed" };
}
