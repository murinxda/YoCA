import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { dcaOrders } from "@/db/schema";
import { eq, and, lte } from "drizzle-orm";
import { executeSingleOrder, type ExecutionResult } from "@/lib/executor";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const cronSecret = request.headers.get("authorization");
  const isDevMode = process.env.NODE_ENV === "development";
  if (!isDevMode && cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const now = new Date();

  const eligibleOrders = await db
    .select()
    .from(dcaOrders)
    .where(
      and(eq(dcaOrders.status, "active"), lte(dcaOrders.nextExecutionAt, now))
    );

  const results: ExecutionResult[] = [];

  for (const order of eligibleOrders) {
    try {
      const result = await executeSingleOrder(order, order.walletAddress);
      results.push(result);
    } catch (error) {
      console.error(`Error processing order ${order.id}:`, error);
      results.push({
        orderId: order.id,
        status: "failed",
        reason: String(error),
      });
    }
  }

  return NextResponse.json({
    processed: results.length,
    results,
    timestamp: now.toISOString(),
  });
}
