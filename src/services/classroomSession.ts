/**
 * Classroom Session Service
 *
 * Provides an ISessionService implementation backed by localStorage.
 * Because localStorage is shared across all tabs on the same origin,
 * the teacher and students can share session data within the same
 * browser for demo and classroom-on-one-device use.
 *
 * ─── Backend Upgrade Path ────────────────────────────────────────────────────
 * To replace this mock with Firebase, Supabase, Laravel, or WebSocket:
 *   1. Create a new class that implements ISessionService
 *   2. Replace `new MockSessionService()` on the last line of this file
 *   3. No component or App.tsx code needs to change
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type {
  ClassroomParticipant,
  ClassroomSession,
  CreateSessionParams,
  ISessionService,
  JoinSessionResult,
} from '../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const SESSIONS_KEY   = 'sq_classroom_sessions';
const CODE_CHARS     = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const CODE_LENGTH    = 6;
/** Sessions older than 4 hours are purged on the next createSession() call */
const SESSION_TTL_MS = 4 * 60 * 60 * 1000;

// ─── Internal helpers ─────────────────────────────────────────────────────────

function randomChars(length: number): string {
  return Array.from(
    { length },
    () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)],
  ).join('');
}

function readSessions(): Record<string, ClassroomSession> {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, ClassroomSession>) : {};
  } catch {
    return {};
  }
}

function writeSessions(sessions: Record<string, ClassroomSession>): void {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

/**
 * Remove sessions older than SESSION_TTL_MS to keep localStorage clean.
 * Called automatically before every createSession().
 */
function purgeExpired(
  sessions: Record<string, ClassroomSession>,
): Record<string, ClassroomSession> {
  const cutoff = Date.now() - SESSION_TTL_MS;
  const result: Record<string, ClassroomSession> = {};
  for (const [code, session] of Object.entries(sessions)) {
    if (session.createdAt > cutoff) result[code] = session;
  }
  return result;
}

/**
 * Generate a session code that does not collide with any existing session.
 * Retries up to 10 times (probability of failure at 10 concurrent sessions
 * is astronomically small given 36^6 = 2.1 billion possibilities).
 */
function uniqueCode(sessions: Record<string, ClassroomSession>): string {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = randomChars(CODE_LENGTH);
    if (!(code in sessions)) return code;
  }
  throw new Error('Failed to generate a unique session code. Please try again.');
}

// ─── MockSessionService ───────────────────────────────────────────────────────

class MockSessionService implements ISessionService {

  // ── createSession ──────────────────────────────────────────────────────────

  async createSession(params: CreateSessionParams): Promise<ClassroomSession> {
    const raw      = readSessions();
    const sessions = purgeExpired(raw); // clean up stale sessions first

    const code = uniqueCode(sessions);

    const session: ClassroomSession = {
      code,
      teacherName:  params.teacherName,
      grade:        params.grade,
      category:     params.category,
      storyId:      params.storyId,
      status:       'active',
      createdAt:    Date.now(),
      participants: [],
    };

    sessions[code] = session;
    writeSessions(sessions);
    return session;
  }

  // ── joinSession ────────────────────────────────────────────────────────────

  async joinSession(
    rawCode: string,
    name: string,
    existingStudentId?: string,
  ): Promise<JoinSessionResult> {
    // Always normalize — students may type lowercase or include spaces
    const code     = rawCode.toUpperCase().trim();
    const sessions = readSessions();
    const session  = sessions[code];

    // ── Validation ────────────────────────────────────────────────────────────

    if (!session) {
      return {
        success:   false,
        session:   null,
        studentId: null,
        error:     'Session not found. Check the code and try again.',
      };
    }

    if (session.status === 'ended') {
      return {
        success:   false,
        session:   null,
        studentId: null,
        error:     'This session has already ended.',
      };
    }

    if (Date.now() - session.createdAt > SESSION_TTL_MS) {
      return {
        success:   false,
        session:   null,
        studentId: null,
        error:     'This session has expired. Ask your teacher to create a new one.',
      };
    }

    // ── Idempotent re-join by studentId (page refresh) ──────────────────────
    // If the student already has a participant ID (e.g. after a page refresh),
    // return the existing record instead of creating a duplicate. (Fix H-4)

    if (existingStudentId) {
      const existing = session.participants.find(
        (p) => p.studentId === existingStudentId,
      );
      if (existing) {
        return { success: true, session, studentId: existingStudentId };
      }
    }

    // ── Idempotent re-join by name (re-login after logout) ──────────────────
    // When a student logs out, their onlineStudentId is lost. If they rejoin
    // the same session with the same name, return their existing participant
    // record instead of adding a duplicate row to the dashboard.
    // Comparison is case-insensitive and trimmed so "Maria" = "maria" = "MARIA".

    const existingByName = session.participants.find(
      (p) => p.name.trim().toLowerCase() === name.trim().toLowerCase(),
    );
    if (existingByName) {
      return { success: true, session, studentId: existingByName.studentId };
    }

    // ── Create new participant ────────────────────────────────────────────────

    const studentId = existingStudentId ?? `SQ-${randomChars(CODE_LENGTH)}`;

    const participant: ClassroomParticipant = {
      studentId,
      name,
      status:      'joined',
      score:       null,
      submittedAt: null,
    };

    const updated: ClassroomSession = {
      ...session,
      participants: [...session.participants, participant],
    };

    sessions[code] = updated;
    writeSessions(sessions);

    return { success: true, session: updated, studentId };
  }

  // ── submitScore ────────────────────────────────────────────────────────────

  async submitScore(code: string, studentId: string, score: number): Promise<void> {
    const sessions = readSessions();
    const session  = sessions[code];

    // Silently ignore if the session no longer exists or has already been
    // ended by the teacher. The student's RewardScreen still displays their
    // score correctly because it uses local lastEarned state — not this store.
    if (!session || session.status === 'ended') return;

    const idx = session.participants.findIndex((p) => p.studentId === studentId);
    if (idx === -1) return;

    const updatedParticipant: ClassroomParticipant = {
      ...session.participants[idx],
      status:      'submitted',
      score,
      submittedAt: Date.now(),
    };

    sessions[code] = {
      ...session,
      participants: session.participants.map((p, i) =>
        i === idx ? updatedParticipant : p,
      ),
    };

    writeSessions(sessions);
  }

  // ── getLiveResults ─────────────────────────────────────────────────────────

  async getLiveResults(code: string): Promise<ClassroomSession | null> {
    const sessions = readSessions();
    return sessions[code] ?? null;
  }

  // ── endSession ─────────────────────────────────────────────────────────────

  async endSession(code: string): Promise<void> {
    const sessions = readSessions();
    if (!sessions[code]) return;

    sessions[code] = { ...sessions[code], status: 'ended' };
    writeSessions(sessions);
  }
}

// ─── Export ───────────────────────────────────────────────────────────────────

/**
 * Typed as ISessionService (not MockSessionService) so no component
 * has access to mock-specific internals.
 *
 * To upgrade: replace `new MockSessionService()` with your implementation.
 */
export const sessionService: ISessionService = new MockSessionService();
