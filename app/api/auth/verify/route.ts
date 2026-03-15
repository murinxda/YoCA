import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { parseSiweMessage, verifySiweMessage } from "viem/siwe";
import { eq } from "drizzle-orm";
import { getPublicClient } from "@/lib/keeper";
import { getDb } from "@/db";
import { siweNonces } from "@/db/schema";
import { sessionOptions, type SessionData } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (typeof body?.message !== "string" || typeof body?.signature !== "string") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const { message, signature } = body;
    const fields = parseSiweMessage(message);

    if (!fields.nonce) {
      return NextResponse.json(
        { error: "Missing nonce" },
        { status: 422 },
      );
    }

    // Look up and consume the nonce in a single atomic delete-returning
    const db = getDb();
    const [consumed] = await db
      .delete(siweNonces)
      .where(eq(siweNonces.nonce, fields.nonce))
      .returning();

    if (!consumed) {
      return NextResponse.json(
        { error: "Invalid or already-used nonce" },
        { status: 422 },
      );
    }

    if (consumed.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Nonce expired" },
        { status: 422 },
      );
    }

    const expectedDomain = request.headers.get("host") ?? undefined;
    const valid = await verifySiweMessage(getPublicClient(), {
      message,
      signature,
      domain: expectedDomain,
    });

    if (!valid) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 422 },
      );
    }

    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions,
    );
    session.address = fields.address;
    await session.save();

    return NextResponse.json({ address: fields.address });
  } catch {
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 400 },
    );
  }
}
