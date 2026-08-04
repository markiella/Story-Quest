import type { LeaderboardEntry } from '../types';

const STORAGE_KEY = 'storyquest_leaderboard';

// ─── Mock initial data ────────────────────────────────────────────────────────
// Seeded once on first run so the board is never empty in demo/dev.
// studentId values are fakes — real entries use generated SQ-XXXXXX ids.
const mockEntries: LeaderboardEntry[] = [
  { id: 'mock-1', studentId: 'SQ-MOCK01', name: 'Maria Santos',   grade: 'Grade 5', score: 95,  timestamp: Date.now() - 3600000  },
  { id: 'mock-2', studentId: 'SQ-MOCK02', name: 'James Reyes',    grade: 'Grade 6', score: 88,  timestamp: Date.now() - 7200000  },
  { id: 'mock-3', studentId: 'SQ-MOCK03', name: 'Sofia Cruz',     grade: 'Grade 5', score: 100, timestamp: Date.now() - 1800000  },
  { id: 'mock-4', studentId: 'SQ-MOCK04', name: 'Liam Fernandez', grade: 'Grade 6', score: 75,  timestamp: Date.now() - 9000000  },
  { id: 'mock-5', studentId: 'SQ-MOCK05', name: 'Anika Dela Paz', grade: 'Grade 5', score: 82,  timestamp: Date.now() - 5400000  },
];

// Module-level flag so seedIfEmpty only hits localStorage once per page load
let seeded = false;

function seedIfEmpty(): void {
  if (seeded) return;
  seeded = true;
  try {
    if (!localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mockEntries));
    }
  } catch { /* silent */ }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getLeaderboard(): LeaderboardEntry[] {
  seedIfEmpty();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const entries: LeaderboardEntry[] = raw ? (JSON.parse(raw) as LeaderboardEntry[]) : [];
    return entries.sort((a, b) => b.score - a.score);
  } catch {
    return [];
  }
}

/**
 * Upsert: update the student's existing record if one exists, otherwise insert.
 * Identity is based on studentId — NOT name — so name changes don't create duplicates.
 * Only runs in Online mode; caller is responsible for the mode check.
 */
export function submitScore(entry: Omit<LeaderboardEntry, 'id' | 'timestamp'>): void {
  seedIfEmpty();
  const existing = getLeaderboard();

  const existingIndex = existing.findIndex(e => e.studentId === entry.studentId);

  let updated: LeaderboardEntry[];

  if (existingIndex !== -1) {
    // ── Update existing record ───────────────────────────────────────────────
    const updatedEntry: LeaderboardEntry = {
      ...existing[existingIndex],
      name:      entry.name,   // reflect any name change
      score:     entry.score,
      timestamp: Date.now(),
    };
    updated = [...existing];
    updated[existingIndex] = updatedEntry;
  } else {
    // ── Insert new record ────────────────────────────────────────────────────
    const newEntry: LeaderboardEntry = {
      ...entry,
      id:        `entry-${Date.now()}`,
      timestamp: Date.now(),
    };
    updated = [...existing, newEntry];
  }

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(updated.sort((a, b) => b.score - a.score)),
    );
  } catch { /* silent */ }
}

// TODO: Replace with real API calls when backend is ready
// export async function submitScoreRemote(entry: ...) { await fetch('/api/scores', ...) }
// export async function getLeaderboardRemote(): Promise<LeaderboardEntry[]> { ... }
