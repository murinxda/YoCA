import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { users, dcaOrders, dcaExecutions } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getAuthenticatedAddress } from "@/lib/auth";
import { executeSingleOrder } from "@/lib/executor";

export const maxDuration = 60;

export async function POST(
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

  if (order.status === "cancelled") {
    return NextResponse.json(
      { error: "Cannot execute a cancelled order" },
      { status: 400 },
    );
  }

  const result = await executeSingleOrder(order, order.walletAddress);

  const [updatedOrder] = await db
    .select()
    .from(dcaOrders)
    .where(eq(dcaOrders.id, id));

  const [latestExecution] = await db
    .select()
    .from(dcaExecutions)
    .where(eq(dcaExecutions.orderId, id))
    .orderBy(desc(dcaExecutions.executedAt))
    .limit(1);

  const enrichedExecution = latestExecution
    ? { ...latestExecution, sourceVault: order.sourceVault, targetVault: order.targetVault }
    : null;

  const statusCode = result.status === "success" ? 200 : result.status === "skipped" ? 200 : 500;
  return NextResponse.json({
    ...result,
    order: updatedOrder ?? order,
    execution: enrichedExecution,
  }, { status: statusCode });
}
