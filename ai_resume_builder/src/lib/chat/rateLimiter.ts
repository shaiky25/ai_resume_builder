// In-memory per-user sliding-window rate limiter.
//
// NOTE: this state lives in process memory only. It does not survive
// multi-instance deployments or serverless cold starts (each instance/cold
// start has its own independent window), so it under-enforces in
// production; a shared store (e.g. a Supabase table or Redis) would be
// needed there. Acceptable for the scope of this change.

export interface RateLimiter {
  /** Returns true if the request is allowed, false if the limit is exceeded. */
  check(userId: string, now?: number): boolean;
}

interface Bucket {
  timestamps: number[];
}

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_REQUESTS_PER_WINDOW = 10;

export class SlidingWindowRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly windowMs: number = DEFAULT_WINDOW_MS,
    private readonly maxRequests: number = DEFAULT_MAX_REQUESTS_PER_WINDOW
  ) {}

  check(userId: string, now: number = Date.now()): boolean {
    const bucket = this.buckets.get(userId) ?? { timestamps: [] };
    const cutoff = now - this.windowMs;
    bucket.timestamps = bucket.timestamps.filter((timestamp) => timestamp > cutoff);

    if (bucket.timestamps.length >= this.maxRequests) {
      this.buckets.set(userId, bucket);
      return false;
    }

    bucket.timestamps.push(now);
    this.buckets.set(userId, bucket);
    return true;
  }
}

/** Shared process-wide limiter used by the /api/chat route. */
export const chatRateLimiter = new SlidingWindowRateLimiter();
