// In-memory rate limiter with lockout + exponential backoff for auth endpoints.
//
// Two primitives:
//   - fixed-window counters (check + hit) used for register / refresh /
//     forgot-password / resend-verification;
//   - identity locks with an exponential multiplier for login (5 failures /
//     15 min locks the identity, and every subsequent lockout while the
//     account keeps failing DOUBLES the lock duration).
//
// Injectable clock + an exported reset() keep it testable: tests can reset
// state between cases or fast-forward the clock.

export function createRateLimiter({ now = () => Date.now() } = {}) {
  // key → { windowStart, count }
  const buckets = new Map();
  // key → { since, multiplier, until }  (multiplier persists across expiries
  // until the identity succeeds, so repeated lockouts keep doubling)
  const locks = new Map();

  function check(key, limit, windowMs) {
    const t = now();
    let b = buckets.get(key);
    if (!b || t - b.windowStart >= windowMs) {
      b = { windowStart: t, count: 0 };
      buckets.set(key, b);
    }
    if (b.count >= limit) {
      const retryAfter = Math.max(1, Math.ceil((b.windowStart + windowMs - t) / 1000));
      return { ok: false, retryAfter };
    }
    return { ok: true, retryAfter: 0 };
  }

  function hit(key, windowMs) {
    const t = now();
    let b = buckets.get(key);
    if (!b || t - b.windowStart >= windowMs) {
      b = { windowStart: t, count: 0 };
      buckets.set(key, b);
    }
    b.count += 1;
    return b.count;
  }

  function resetKey(key) {
    buckets.delete(key);
    locks.delete(key);
  }

  // Returns remaining lock seconds or null when not locked.
  function isLocked(key) {
    const t = now();
    const l = locks.get(key);
    if (!l) return null;
    if (t >= l.until) return null; // expired lock is no longer active
    return Math.max(1, Math.ceil((l.until - t) / 1000));
  }

  // Lock an identity for baseMs; duration doubles per consecutive lockout.
  function lock(key, baseMs) {
    const t = now();
    const prev = locks.get(key);
    const multiplier = prev ? prev.multiplier * 2 : 1;
    const until = t + baseMs * multiplier;
    locks.set(key, { since: t, multiplier, until });
    return Math.max(1, Math.ceil(baseMs * multiplier / 1000));
  }

  function clear(key) {
    buckets.delete(key);
    locks.delete(key);
  }

  function reset() {
    buckets.clear();
    locks.clear();
  }

  function setNow(fn) { now = fn; }

  return {
    check, hit, resetKey, isLocked, lock, clear, reset, setNow,
    _internal: { buckets, locks },
  };
}

// Shared singleton used by the auth routes. Tests import reset()/setNow()
// directly from this module (single process per test file).
export const rateLimiter = createRateLimiter();

export const LOGIN_LIMIT = 5;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_LOCK_MS = 15 * 60 * 1000;
export const REGISTER_LIMIT = 10;
export const REGISTER_WINDOW_MS = 60 * 60 * 1000;
export const REFRESH_LIMIT = 30;
export const REFRESH_WINDOW_MS = 15 * 60 * 1000;
export const FORGOT_LIMIT = 3;
export const FORGOT_WINDOW_MS = 15 * 60 * 1000;
export const RESEND_LIMIT = 3;
export const RESEND_WINDOW_MS = 15 * 60 * 1000;