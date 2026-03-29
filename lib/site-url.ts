/**
 * Canonical site origin for sitemap, robots, and metadata.
 * Prefer NEXT_PUBLIC_URL; on Vercel, VERCEL_URL is set when NEXT_PUBLIC_URL is not.
 */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "https://yoca.mikadohub.app";
}
