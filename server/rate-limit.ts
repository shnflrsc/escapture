import { AppError } from "./errors";

// Crude in-memory limiter (per server instance). Enough to slow guessing in
// the MVP; a shared store would be needed across multiple instances.
const hits = new Map<string, number[]>();

export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    throw new AppError("rate_limited", 429, "Too many attempts. Please wait a few minutes and try again.");
  }
  recent.push(now);
  hits.set(key, recent);
}
