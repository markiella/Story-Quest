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

// ─── Real Internet Cloud Synchronization ───────────────────────────────────────
/**
 * Public, zero-config real-time pub/sub endpoint for cloud synchronization.
 * Allows teacher and students on different devices anywhere on the internet
 * (phones, tablets, laptops, different Wi-Fi networks) to connect seamlessly.
 */
const NTFY_BASE_URL = 'https://ntfy.sh';

async function publishCloudSession(code: string, session: ClassroomSession): Promise<void> {
  try {
    const topic = `sq_session_${code.toLowerCase().trim()}`;
    await fetch(`${NTFY_BASE_URL}/${topic}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session),
    });
  } catch {
    // Network glitch — local cache is already updated
  }
}

async function fetchCloudSession(code: string): Promise<ClassroomSession | null> {
  const normCode = code.toUpperCase().trim();
  const topic = `sq_session_${normCode.toLowerCase()}`;
  try {
    const res = await fetch(`${NTFY_BASE_URL}/${topic}/json?poll=1`);
    if (!res.ok) return null;
    const text = await res.text();
    const lines = text.trim().split('\n').filter(Boolean);
    let latest: ClassroomSession | null = null;
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.message) {
          const payload = JSON.parse(parsed.message) as ClassroomSession;
          if (payload && payload.code === normCode) {
            latest = payload;
          }
        }
      } catch {
        // Skip non-JSON or malformed lines
      }
    }
    return latest;
  } catch {
    return null;
  }
}

// ─── CloudSessionService ───────────────────────────────────────────────────────

class CloudSessionService implements ISessionService {

  // ── createSession ──────────────────────────────────────────────────────────

  // ── createSession ──────────────────────────────────────────────────────────

  async createSession(params: CreateSessionParams): Promise<ClassroomSession> {
    const raw      = readSessions();
    const sessions = purgeExpired(raw); // clean up stale sessions first

    const code = uniqueCode(sessions);

    const initialParticipants: ClassroomParticipant[] = (params.roster && params.roster.length > 0)
      ? params.roster.map(r => ({
          studentId:   `SQ-${randomChars(6)}`,
          name:        r.name.trim(),
          studentCode: r.studentCode.toUpperCase().trim(),
          status:      'joined' as const,
          score:       null,
          submittedAt: null,
        }))
      : [];

    const session: ClassroomSession = {
      code,
      teacherName:  params.teacherName,
      grade:        params.grade,
      category:     params.category,
      storyId:      params.storyId,
      status:       'active',
      createdAt:    Date.now(),
      participants: initialParticipants,
    };

    sessions[code] = session;
    writeSessions(sessions);

    // Sync to cloud asynchronously
    void publishCloudSession(code, session);

    return session;
  }

  // ── joinSession ────────────────────────────────────────────────────────────

  async joinSession(
    rawCode: string,
    name: string,
    studentCode: string,
    existingStudentId?: string,
  ): Promise<JoinSessionResult> {
    // Always normalize — students may type lowercase or include spaces
    const code = rawCode.toUpperCase().trim();
    const trimName = name.trim();
    const trimStudentCode = studentCode.toUpperCase().trim();

    // Try cloud first for multi-device sync, fallback to local storage
    const cloudSession = await fetchCloudSession(code);
    const sessions     = readSessions();
    const session      = cloudSession ?? sessions[code];

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
    if (existingStudentId) {
      const existing = session.participants.find(
        (p) => p.studentId === existingStudentId,
      );
      if (existing) {
        return { success: true, session, studentId: existingStudentId };
      }
    }

    // ── Validate student access code & name ────────────────────────────────
    let matchingParticipant = session.participants.find(
      (p) =>
        p.name.trim().toLowerCase() === trimName.toLowerCase() &&
        p.studentCode.toUpperCase().trim() === trimStudentCode,
    );

    if (!matchingParticipant) {
      matchingParticipant = session.participants.find(
        (p) => p.studentCode.toUpperCase().trim() === trimStudentCode,
      );
    }

    // If pre-registered roster exists in session and no match is found, reject
    if (session.participants.length > 0 && !matchingParticipant) {
      return {
        success:   false,
        session:   null,
        studentId: null,
        error:     'Invalid Student Access Code or Name. Please ask your teacher for your assigned code.',
      };
    }

    if (matchingParticipant) {
      return { success: true, session, studentId: matchingParticipant.studentId };
    }

    // ── Fallback dynamic participant ──────────────────────────────────────────
    const studentId = existingStudentId ?? `SQ-${randomChars(CODE_LENGTH)}`;

    const participant: ClassroomParticipant = {
      studentId,
      name: trimName,
      studentCode: trimStudentCode,
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

    // Sync updated participant list to cloud for all devices
    void publishCloudSession(code, updated);

    return { success: true, session: updated, studentId };
  }

  // ── submitScore ────────────────────────────────────────────────────────────

  async submitScore(code: string, studentId: string, score: number): Promise<void> {
    const normCode     = code.toUpperCase().trim();
    const cloudSession = await fetchCloudSession(normCode);
    const sessions     = readSessions();
    const session      = cloudSession ?? sessions[normCode];

    if (!session || session.status === 'ended') return;

    const idx = session.participants.findIndex((p) => p.studentId === studentId);
    if (idx === -1) return;

    const updatedParticipant: ClassroomParticipant = {
      ...session.participants[idx],
      status:      'submitted',
      score,
      submittedAt: Date.now(),
    };

    const updatedSession: ClassroomSession = {
      ...session,
      participants: session.participants.map((p, i) =>
        i === idx ? updatedParticipant : p,
      ),
    };

    sessions[normCode] = updatedSession;
    writeSessions(sessions);

    // Sync score to cloud for live teacher dashboard update across devices
    void publishCloudSession(normCode, updatedSession);
  }

  // ── getLiveResults ─────────────────────────────────────────────────────────

  async getLiveResults(code: string): Promise<ClassroomSession | null> {
    const normCode     = code.toUpperCase().trim();
    const cloudSession = await fetchCloudSession(normCode);

    if (cloudSession) {
      const sessions = readSessions();
      sessions[normCode] = cloudSession;
      writeSessions(sessions);
      return cloudSession;
    }

    const sessions = readSessions();
    return sessions[normCode] ?? null;
  }

  // ── endSession ─────────────────────────────────────────────────────────────

  async endSession(code: string): Promise<void> {
    const normCode     = code.toUpperCase().trim();
    const cloudSession = await fetchCloudSession(normCode);
    const sessions     = readSessions();
    const session      = cloudSession ?? sessions[normCode];

    if (!session) return;

    const endedSession: ClassroomSession = { ...session, status: 'ended' };
    sessions[normCode] = endedSession;
    writeSessions(sessions);

    void publishCloudSession(normCode, endedSession);
  }
}

// ─── Export ───────────────────────────────────────────────────────────────────

/**
 * Cloud-enabled Session Service: connects teachers and students seamlessly
 * across real internet devices (phones, laptops, tablets).
 */
export const sessionService: ISessionService = new CloudSessionService();

