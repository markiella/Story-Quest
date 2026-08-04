// ─── Primitives ───────────────────────────────────────────────────────────────

export type GradeLevel    = 'Grade 5' | 'Grade 6';
export type GameMode      = 'offline' | 'online';
export type OnlineRole    = 'teacher' | 'student';
export type SessionStatus = 'active'  | 'ended';
export type Category      = 'Fable' | 'Myth' | 'Realistic Fiction' | 'Legend' | 'Grade 5' | 'Grade 6';

export type Screen =
  | 'intro'
  | 'category'        // offline: story category selection
  | 'story'           // offline: story list
  | 'student-story'   // online student: read the assigned story before sequencing
  | 'sequencer'       // shared: event sequencing game (offline + online student)
  | 'reward'          // shared: completion reward
  | 'leaderboard'     // @deprecated — retained for session-restore backward compat only
  | 'teacher'         // online teacher: TeacherLobby → TeacherDashboard (internal swap)
  | 'student-join';   // online student: join form → brief loading → sequencer

// ─── Story interfaces ─────────────────────────────────────────────────────────

/** Single event card used by the game engine */
export interface StoryEvent {
  id: string;
  text: string;
}

/** Game-engine format consumed by EventSequencer */
export interface Story {
  id: string;
  category: Category;
  title: string;
  fullStory: string;
  events: StoryEvent[];
  correctOrder: string[]; // ordered array of StoryEvent ids
}

/** Step in the rich story database (src/data/stories/*.ts) */
export interface StoryStep {
  id: string;
  sequence: number;
  text: string;
}

/** Rich story format in the data store — adapted to Story before use in UI */
export interface StoryData {
  id: string;
  category: Category;
  title: string;
  author?: string;
  gradeLevel: [5, 6] | [5] | [6];
  summary: string;
  story: string;
  storySteps: StoryStep[];
  estimatedReadingTime?: number;
  moral?: string;
}

// ─── User / Session ───────────────────────────────────────────────────────────

export interface UserProfile {
  /** Permanent unique identifier, e.g. "SQ-84A2K1". Never displayed. */
  studentId: string;
  name: string;
  /**
   * Null for online teachers (grade is chosen in TeacherLobby) and for
   * online students before joining a session (grade comes from session).
   */
  grade: GradeLevel | null;
  mode: GameMode;
  /** Null for offline mode. */
  role: OnlineRole | null;
}

/** In-progress sequencer state persisted across refreshes (offline mode) */
export interface SequencerProgress {
  shuffledEventIds: string[];
  slots: (string | null)[];
}

/** Full application session stored in localStorage */
export interface AppSession {
  studentId: string;        // kept for backward compat — same as profile.studentId
  profile: UserProfile;
  screen: Screen;
  category: Category | null;
  storyId: string | null;
  score: number;
  lastEarned: number;
  audio: boolean;
  sequencerProgress: SequencerProgress | null;
  // ─── Online session fields ─────────────────────────────────────────────────
  /** Teacher / student role. Null for offline. */
  role: OnlineRole | null;
  /** Active classroom session code (e.g. "ABX913"). Null for offline. */
  sessionCode: string | null;
  /**
   * The student's participant ID inside the classroom session.
   * Used as the key for submitScore(). Null for offline and teacher.
   */
  onlineStudentId: string | null;
}

// ─── Classroom Session (Online Mode) ──────────────────────────────────────────

export interface ClassroomParticipant {
  studentId: string;
  name: string;
  /**
   * 'joined'    — student has joined but not yet submitted
   * 'playing'   — reserved for future backend (e.g. websocket status push)
   * 'submitted' — student has submitted their score
   */
  status: 'joined' | 'playing' | 'submitted';
  score: number | null;
  submittedAt: number | null;
}

export interface ClassroomSession {
  code: string;
  teacherName: string;
  grade: GradeLevel;
  category: Category;
  storyId: string;
  status: SessionStatus;
  createdAt: number;
  participants: ClassroomParticipant[];
}

export interface CreateSessionParams {
  teacherName: string;
  grade: GradeLevel;
  category: Category;
  storyId: string;
}

export interface JoinSessionResult {
  success: boolean;
  session: ClassroomSession | null;
  /** Null when success is false. */
  studentId: string | null;
  error?: string;
}

/**
 * Service contract for classroom session management.
 *
 * To upgrade from MockSessionService to a real backend (Firebase, Supabase,
 * Laravel, WebSocket): implement this interface and replace the export in
 * src/services/classroomSession.ts — no UI component code needs to change.
 */
export interface ISessionService {
  createSession(params: CreateSessionParams): Promise<ClassroomSession>;
  /**
   * @param existingStudentId — provide on re-join (e.g. after page refresh)
   *   to avoid creating a duplicate participant entry.
   */
  joinSession(code: string, name: string, existingStudentId?: string): Promise<JoinSessionResult>;
  submitScore(code: string, studentId: string, score: number): Promise<void>;
  getLiveResults(code: string): Promise<ClassroomSession | null>;
  endSession(code: string): Promise<void>;
}

// ─── Leaderboard (deprecated) ─────────────────────────────────────────────────

/**
 * @deprecated The global leaderboard has been replaced by ClassroomSession.
 * Retained only so leaderboard.ts compiles without changes.
 */
export interface LeaderboardEntry {
  id: string;
  studentId: string;
  name: string;
  grade: GradeLevel;
  score: number;
  timestamp: number;
}
