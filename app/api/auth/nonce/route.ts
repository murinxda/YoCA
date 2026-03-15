import { NextResponse } from "next/server";
import { generateSiweNonce } from "viem/siwe";
import { getDb } from "@/db";
import { siweNonces } from "@/db/schema";
import { lt } from "drizzle-orm";

const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  const db = getDb();
  const nonce = generateSiweNonce();
  const expiresAt = new Date(Date.now() + NONCE_TTL_MS);

  await db.insert(siweNonces).values({ nonce, expiresAt });

  // Housekeeping: purge expired nonces
  await db.delete(siweNonces).where(lt(siweNonces.expiresAt, new Date()));

  return NextResponse.json({ nonce });
}
