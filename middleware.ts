import { NextRequest, NextResponse } from "next/server";

const WINDOW_MS = 60_000;
const MAX_REQUESTS: Record<string, number> = {
  "/api/auth/nonce": 10,
  "/api/auth/verify": 10,
  "/api/auth/session": 20,
  "/api/auth/logout": 20,
  "/api/dca": 30,
};

interface RateBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateBucket>();

function getRateLimitKey(request: NextRequest): string {
  const ip =
    request.ip ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  return `${ip}:${request.nextUrl.pathname}`;
}

function isRateLimited(key: string, limit: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  bucket.count++;
  return bucket.count > limit;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}, WINDOW_MS);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const matchedPath = Object.keys(MAX_REQUESTS).find((p) =>
    pathname.startsWith(p),
  );
  if (!matchedPath) return NextResponse.next();

  const key = getRateLimitKey(request);
  const limit = MAX_REQUESTS[matchedPath];

  if (isRateLimited(key, limit)) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/auth/:path*", "/api/dca/:path*"],
};
