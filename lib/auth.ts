import { NextRequest } from "next/server";
import { isAddress } from "viem";

const DEV_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

/**
 * Reads the authenticated wallet address from the request.
 * In production the address comes from the x-wallet-address header.
 * In development without a header, falls back to a dev address.
 */
export function getAuthenticatedAddress(
  request: NextRequest
): string | null {
  const address = request.headers.get("x-wallet-address");

  if (address && isAddress(address)) {
    return address.toLowerCase();
  }

  if (process.env.NODE_ENV === "development") {
    return DEV_ADDRESS.toLowerCase();
  }

  return null;
}
