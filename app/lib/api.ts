"use client";

/**
 * Fetch wrapper for API calls.
 * Authentication is handled via iron-session cookies (set during SIWE sign-in),
 * which are sent automatically by the browser.
 */
export async function apiFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(path, { ...init, credentials: "same-origin" });
}
