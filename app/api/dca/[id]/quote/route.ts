import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { users, dcaOrders } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedAddress } from "@/lib/auth";
import { getSwapQuote } from "@/lib/keeper";
import { ADDRESSES, type VaultId } from "@/lib/constants";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authAddress = getAuthenticatedAddress(request);
  if (!authAddress) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = getDb();

  const user = await db.query.users.findFirst({
    where: eq(users.address, authAddress),
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const [order] = await db
    .select()
    .from(dcaOrders)
    .where(and(eq(dcaOrders.id, id), eq(dcaOrders.userId, user.id)));

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const sourceVault = ADDRESSES.vaults[order.sourceVault as VaultId];
  const targetVault = ADDRESSES.vaults[order.targetVault as VaultId];

  if (!sourceVault || !targetVault) {
    return NextResponse.json({ error: "Invalid vault configuration" }, { status: 400 });
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
    return NextResponse.json({ error: "Failed to get swap quote" }, { status: 502 });
  }

  const slippageFactor = BigInt(10000 - order.slippageBps);
  const minAmountOut = (quote.expectedAmountOut * slippageFactor) / BigInt(10000);

  return NextResponse.json({
    price: quote.price,
    expectedAmountOut: quote.expectedAmountOut.toString(),
    minAmountOut: minAmountOut.toString(),
    sellAmount: order.amount,
    sellDecimals: sourceVault.decimals,
    buyDecimals: targetVault.decimals,
    sellSymbol: sourceVault.underlyingSymbol,
    sellVaultName: sourceVault.name,
    buySymbol: targetVault.underlyingSymbol,
    buyVaultName: targetVault.name,
    slippageBps: order.slippageBps,
  });
}
