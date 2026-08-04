/**
 * Offline Profile Service
 *
 * Persists each student's progress independently of AppSession.
 * Unlike AppSession (cleared on logout), offline profiles survive logout
 * so returning students resume their accumulated score on the same device.
 *
 * Storage key:  storyquest_offline_profiles
 * Record key:   "${name.trim().toLowerCase()}|${grade.trim().toLowerCase()}"
 * Example:      "mark|grade 5" → { studentId: 'SQ-ABC123', totalScore: 33 }
 *
 * Offline profiles are NEVER touched by clearSession().
 * They are erased only if the user explicitly clears browser data.
 */

const OFFLINE_PROFILES_KEY = 'storyquest_offline_profiles';

export interface OfflineProfile {
  /** Same SQ-XXXXXX id used in UserProfile — preserved across logins */
  studentId: string;
  totalScore: number;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Normalized, case-insensitive key — prevents "Mark" vs "mark" duplicates */
function profileKey(name: string, grade: string): string {
  return `${name.trim().toLowerCase()}|${grade.trim().toLowerCase()}`;
}

function readProfiles(): Record<string, OfflineProfile> {
  try {
    const raw = localStorage.getItem(OFFLINE_PROFILES_KEY);
    return raw ? (JSON.parse(raw) as Record<string, OfflineProfile>) : {};
  } catch {
    return {};
  }
}

function writeProfiles(profiles: Record<string, OfflineProfile>): void {
  try {
    localStorage.setItem(OFFLINE_PROFILES_KEY, JSON.stringify(profiles));
  } catch {
    // Silent — storage full or unavailable in private-browsing mode
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the persisted offline profile for the given name + grade combination,
 * or null if the student has never played on this device.
 *
 * Called on every offline login so returning students restore their score.
 */
export function loadOfflineProfile(name: string, grade: string): OfflineProfile | null {
  const profiles = readProfiles();
  return profiles[profileKey(name, grade)] ?? null;
}

/**
 * Creates or updates the offline profile for the given name + grade.
 * Preserves studentId across score updates.
 *
 * Called automatically by App.tsx's save effect whenever score or profile
 * changes in Offline mode — no manual call sites needed.
 */
export function saveOfflineProfile(
  name:  string,
  grade: string,
  data:  OfflineProfile,
): void {
  const profiles = readProfiles();
  profiles[profileKey(name, grade)] = data;
  writeProfiles(profiles);
}
