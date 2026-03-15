import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { users, dcaOrders } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedAddress } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authAddress = getAuthenticatedAddress(request);
  if (!authAddress) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { status } = body;

  if (!status || !["active", "paused", "cancelled"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const db = getDb();

  const user = await db.query.users.findFirst({
    where: eq(users.address, authAddress),
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const [updated] = await db
    .update(dcaOrders)
    .set({ status })
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
