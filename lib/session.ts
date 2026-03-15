import type { SessionOptions } from "iron-session";

export interface SessionData {
  address?: string;
}

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set in production");
  }
  return "dev-secret-that-is-at-least-32-characters-long!!";
}

export const sessionOptions: SessionOptions = {
  password: getSessionSecret(),
  cookieName: "yoca-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 86400,
  },
};
