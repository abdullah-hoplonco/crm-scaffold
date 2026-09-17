/**
 * Showcase sessions are per browser tab (sessionStorage), so the demo control panel can run as the
 * owner in one window while a rep works in another. Data itself is shared across tabs (see db.ts).
 */
const KEY = "hco-crm:session-user-id";
let fallback: string | null = null;

export function readTabSession(): string | null {
  try {
    return window.sessionStorage.getItem(KEY);
  } catch {
    return fallback;
  }
}

export function writeTabSession(userId: string | null): void {
  fallback = userId;
  try {
    if (userId) window.sessionStorage.setItem(KEY, userId);
    else window.sessionStorage.removeItem(KEY);
  } catch {
    // sessionStorage blocked: keep it in memory for this page load.
  }
}
