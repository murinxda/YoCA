import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { users, dcaOrders } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedAddress } from "@/lib/auth";
import { isValidUUID } from "@/lib/validation";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authAddress = await getAuthenticatedAddress();
  if (!authAddress) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!isValidUUID(id)) {
    return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validStatuses = ["active", "paused", "cancelled"] as const;
  const status = typeof body.status === "string" ? body.status : "";
  if (!validStatuses.includes(status as typeof validStatuses[number])) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  const safeStatus = status as typeof validStatuses[number];

  const db = getDb();

  const user = await db.query.users.findFirst({
    where: eq(users.address, authAddress),
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const [updated] = await db
    .update(dcaOrders)
    .set({ status: safeStatus })
    .where(and(eq(dcaOrders.id, id), eq(dcaOrders.userId, user.id)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({ order: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authAddress = await getAuthenticatedAddress();
  if (!authAddress) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!isValidUUID(id)) {
    return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
  }

  const db = getDb();

  const user = await db.query.users.findFirst({
    where: eq(users.address, authAddress),
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const [cancelled] = await db
    .update(dcaOrders)
    .set({ status: "cancelled" })
    .where(and(eq(dcaOrders.id, id), eq(dcaOrders.userId, user.id)))
    .returning();

  if (!cancelled) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({ order: cancelled });
}
