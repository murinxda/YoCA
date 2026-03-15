import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "./session";

/**
 * Reads the authenticated wallet address from the iron-session cookie.
 * The address was verified via SIWE during sign-in.
 */
export async function getAuthenticatedAddress(): Promise<string | null> {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions,
  );

  return session.address?.toLowerCase() ?? null;
}
