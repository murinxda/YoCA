import { isAddress } from "viem";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(value: string): boolean {
  return UUID_RE.test(value);
}

export function isValidAddress(value: unknown): value is string {
  return typeof value === "string" && isAddress(value);
}

export function isValidPrice(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return true;
  const n = Number(value);
  return !isNaN(n) && n >= 0 && isFinite(n);
}
