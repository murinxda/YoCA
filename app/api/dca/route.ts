import { NextRequest, NextResponse } from "next/server";
import { parseUnits } from "viem";
import { getDb } from "@/db";
import { users, dcaOrders, dcaExecutions } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getAuthenticatedAddress } from "@/lib/auth";
import { ADDRESSES, type VaultId } from "@/lib/constants";
import { isValidAddress, isValidPrice } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const authAddress = await getAuthenticatedAddress();
  if (!authAddress) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const walletAddress = request.nextUrl.searchParams.get("address");
  if (!walletAddress || !isValidAddress(walletAddress)) {
    return NextResponse.json(
      { error: "Missing or invalid address parameter" },
      { status: 400 }
    );
  }

  const db = getDb();

  const user = await db.query.users.findFirst({
    where: eq(users.address, authAddress),
  });

  if (!user) {
    return NextResponse.json({ orders: [], executions: [] });
  }

  const orders = await db
    .select()
    .from(dcaOrders)
    .where(
      and(
        eq(dcaOrders.userId, user.id),
        eq(dcaOrders.walletAddress, walletAddress.toLowerCase())
      )
    )
    .orderBy(desc(dcaOrders.createdAt));

  const orderIds = orders.map((o) => o.id);
  let executions: (typeof dcaExecutions.$inferSelect)[] = [];

  if (orderIds.length > 0) {
    const allExecutions = await db
      .select()
      .from(dcaExecutions)
      .orderBy(desc(dcaExecutions.executedAt))
      .limit(50);

    executions = allExecutions.filter((e) => orderIds.includes(e.orderId));
  }

  const orderMap = Object.fromEntries(orders.map((o) => [o.id, o]));
  const enrichedExecutions = executions.map((e) => {
    const order = orderMap[e.orderId];
    return {
      ...e,
      sourceVault: order?.sourceVault ?? null,
      targetVault: order?.targetVault ?? null,
    };
  });

  return NextResponse.json({ orders, executions: enrichedExecutions });
}

export async function POST(request: NextRequest) {
  const authAddress = await getAuthenticatedAddress();
  if (!authAddress) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const body = await request.json();
  const {
    address,
    sourceVault,
    targetVault,
    amount,
    periodDays,
    slippageBps,
    minPrice,
    maxPrice,
  } = body;

  if (!address || !sourceVault || !targetVault || !amount || !periodDays) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  if (!isValidAddress(address)) {
    return NextResponse.json(
      { error: "Invalid wallet address" },
      { status: 400 }
    );
  }

  if (address.toLowerCase() !== authAddress) {
    return NextResponse.json(
      { error: "Address mismatch" },
      { status: 403 }
    );
  }

  const sourceVaultConfig = ADDRESSES.vaults[sourceVault as VaultId];
  const targetVaultConfig = ADDRESSES.vaults[targetVault as VaultId];

  if (!sourceVaultConfig) {
    return NextResponse.json({ error: "Invalid source vault" }, { status: 400 });
  }

  if (!targetVaultConfig) {
    return NextResponse.json({ error: "Invalid target vault" }, { status: 400 });
  }

  if (sourceVault === targetVault) {
    return NextResponse.json({ error: "Source and target vaults must be different" }, { status: 400 });
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return NextResponse.json({ error: "Amount must be positive" }, { status: 400 });
  }

  const periodDaysNum = Number(periodDays);
  if (!Number.isInteger(periodDaysNum) || periodDaysNum < 1 || periodDaysNum > 365) {
    return NextResponse.json({ error: "periodDays must be between 1 and 365" }, { status: 400 });
  }

  const slippage = slippageBps ?? 50;
  if (slippage < 1 || slippage > 5000) {
    return NextResponse.json({ error: "slippageBps must be between 1 and 5000" }, { status: 400 });
  }

  if (!isValidPrice(minPrice)) {
    return NextResponse.json({ error: "Invalid minPrice" }, { status: 400 });
  }

  if (!isValidPrice(maxPrice)) {
    return NextResponse.json({ error: "Invalid maxPrice" }, { status: 400 });
  }

  let user = await db.query.users.findFirst({
    where: eq(users.address, authAddress),
  });

  if (!user) {
    const [newUser] = await db
      .insert(users)
      .values({ address: authAddress })
      .returning();
    user = newUser;
  }

  let rawAmount: string;
  try {
    rawAmount = parseUnits(amount, sourceVaultConfig.decimals).toString();
  } catch {
    return NextResponse.json({ error: "Invalid amount format" }, { status: 400 });
  }

  const nextExecution = new Date();
  nextExecution.setDate(nextExecution.getDate() + periodDaysNum);

  const [order] = await db
    .insert(dcaOrders)
    .values({
      userId: user.id,
      walletAddress: address.toLowerCase(),
      sourceVault,
      targetVault,
      amount: rawAmount,
      periodDays: periodDaysNum,
      slippageBps: slippage,
      minPrice: minPrice || null,
      maxPrice: maxPrice || null,
      nextExecutionAt: nextExecution,
    })
    .returning();

  return NextResponse.json({ order }, { status: 201 });
}
