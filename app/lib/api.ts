"use client";

/**
 * Fetch wrapper that passes the connected wallet address
 * as an X-Wallet-Address header for server-side identity.
 */
export async function apiFetch(
  path: string,
  init?: RequestInit,
  walletAddress?: string
): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (walletAddress) {
    headers.set("x-wallet-address", walletAddress);
  }
  return fetch(path, { ...init, headers });
}
