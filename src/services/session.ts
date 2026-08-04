import type { AppSession } from '../types';

const SESSION_KEY = 'storyquest_session';

// ─── Student ID generation ────────────────────────────────────────────────────

const ID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const ID_LENGTH = 6;

/**
 * Generates a permanent unique student identifier in the format SQ-XXXXXX.
 * Called once on first login; stored inside the session thereafter.
 */
export function generateStudentId(): string {
  const suffix = Array.from(
    { length: ID_LENGTH },
    () => ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)],
  ).join('');
  return `SQ-${suffix}`;
}

// ─── Session persistence ──────────────────────────────────────────────────────

/**
 * Persists the full application session to localStorage.
 * Silently ignores write errors (e.g. private-browsing quota exceeded).
 */
export function saveSession(session: AppSession): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Silent — storage may be full or unavailable
  }
}

/**
 * Reads and parses the saved session from localStorage.
 * Returns null if no session exists or parsing fails.
 */
export function loadSession(): AppSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppSession;
  } catch {
    return null;
  }
}

/**
 * Removes the session from localStorage.
 * Called on explicit logout.
 */
export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // Silent
  }
}
