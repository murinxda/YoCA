import { NextRequest, NextResponse } from "next/server";
import { parseUnits } from "viem";
import { getDb } from "@/db";
import { users, dcaOrders, dcaExecutions } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getAuthenticatedAddress } from "@/lib/auth";
import { ADDRESSES, type VaultId } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const authAddress = getAuthenticatedAddress(request);
  if (!authAddress) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const walletAddress = request.nextUrl.searchParams.get("address");
  if (!walletAddress) {
    return NextResponse.json(
      { error: "Missing address parameter" },
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
  const authAddress = getAuthenticatedAddress(request);
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

  const sourceVaultConfig = ADDRESSES.vaults[sourceVault as VaultId];
  if (!sourceVaultConfig) {
    return NextResponse.json({ error: "Invalid source vault" }, { status: 400 });
  }

  const rawAmount = parseUnits(amount, sourceVaultConfig.decimals).toString();

  const nextExecution = new Date();
  nextExecution.setDate(nextExecution.getDate() + periodDays);

  const [order] = await db
    .insert(dcaOrders)
    .values({
      userId: user.id,
      walletAddress: address.toLowerCase(),
      sourceVault,
      targetVault,
      amount: rawAmount,
      periodDays,
      slippageBps: slippageBps || 100,
      minPrice: minPrice || null,
      maxPrice: maxPrice || null,
      nextExecutionAt: nextExecution,
    })
    .returning();

  return NextResponse.json({ order }, { status: 201 });
}
