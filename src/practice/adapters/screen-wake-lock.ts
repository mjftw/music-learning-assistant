import type { WakeLockPort } from "../ports/wake-lock";

// Keeps the screen awake while playing, where the platform allows it —
// practice.session/REQ-009. navigator.wakeLock isn't implemented on every
// platform, so it's feature-detected rather than trusted from the type; a
// request the platform refuses (e.g. NotAllowedError while the page is
// hidden) resolves acquire() anyway — the spec promises no more than "where
// the platform allows".
export function screenWakeLock(navigatorLike: Navigator): WakeLockPort {
  let sentinel: WakeLockSentinel | null = null;

  return {
    async acquire(): Promise<void> {
      try {
        sentinel = (await navigatorLike.wakeLock?.request("screen")) ?? null;
      } catch {
        sentinel = null;
      }
    },
    release(): void {
      void sentinel?.release();
      sentinel = null;
    },
  };
}
