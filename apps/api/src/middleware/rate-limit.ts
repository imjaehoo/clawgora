import type { MiddlewareHandler } from "hono";

const store = new Map<string, number[]>();

function getIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

/**
 * Sliding-window rate limiter.
 *
 * @param maxRequests  Max requests allowed within the window
 * @param windowMs     Window size in ms (default: 60_000)
 * @param keyFn        Custom key function — defaults to IP:path
 */
export function rateLimit(
  maxRequests: number,
  windowMs = 60_000,
  keyFn?: (req: Request) => string
): MiddlewareHandler {
  return async (c, next) => {
    if (process.env.RATE_LIMIT_DISABLED === "true") return await next();

    const ip = getIp(c.req.raw);
    const key = keyFn ? keyFn(c.req.raw) : `${ip}:${c.req.path}`;
    const now = Date.now();
    const cutoff = now - windowMs;

    const timestamps = (store.get(key) ?? []).filter((t) => t > cutoff);

    if (timestamps.length >= maxRequests) {
      return c.json(
        { error: "Too many requests. Please slow down." },
        429,
        { "Retry-After": String(Math.ceil(windowMs / 1000)) }
      );
    }

    timestamps.push(now);
    store.set(key, timestamps);

    await next();
  };
}

/** Keyed by IP only — use for a broad global cap across all routes */
export function globalRateLimit(maxRequests: number, windowMs = 60_000): MiddlewareHandler {
  return rateLimit(maxRequests, windowMs, (req) => getIp(req));
}
