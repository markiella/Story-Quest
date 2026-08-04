import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type {
  AppSession, Category, ClassroomSession, GradeLevel, GameMode,
  OnlineRole, Screen, Story, UserProfile,
} from './types';
import { sessionService }                                               from './services/classroomSession';
import { loadSession, saveSession, clearSession, generateStudentId }    from './services/session';
import { loadOfflineProfile, saveOfflineProfile }                         from './services/offlineProfile';
import { audioService }                                                  from './services/audioService';
import { stories }                                                      from './data/stories';

import IntroScreen        from './components/IntroScreen';
import CategorySelection  from './components/CategorySelection';
import StoryScreen        from './components/StoryScreen';
import { StoryReader }    from './components/StoryScreen';
import EventSequencer     from './components/EventSequencer';
import RewardScreen       from './components/RewardScreen';
import TeacherLobby       from './components/TeacherLobby';
import TeacherDashboard   from './components/TeacherDashboard';
import StudentJoin        from './components/StudentJoin';
import AudioControls      from './components/AudioControls';

// ─── Constants ────────────────────────────────────────────────────────────────

const SCORE_CLAMP_MIN = 0;
const SCORE_CLAMP_MAX = 100;

const pageVariants = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0,   transition: { type: 'spring' as const, stiffness: 180, damping: 24 } },
  exit:    { opacity: 0, y: -20, transition: { duration: 0.2 } },
};

// ─── Profile factory ──────────────────────────────────────────────────────────

/**
 * Single point of UserProfile creation — both offline and online paths call
 * this function so any new fields only need to be added here. (Fixes H-6.)
 */
function createProfile(
  name:  string,
  grade: GradeLevel | null,
  mode:  GameMode,
  role:  OnlineRole | null,
): UserProfile {
  return { studentId: generateStudentId(), name, grade, mode, role };
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {

  // ── Core state ────────────────────────────────────────────────────────────
  const [screen,            setScreen]            = useState<Screen>('intro');
  const [profile,           setProfile]           = useState<UserProfile | null>(null);
  const [category,          setCategory]          = useState<Category | null>(null);
  const [story,             setStory]             = useState<Story | null>(null);
  const [score,             setScore]             = useState(0);
  const [lastEarned,        setLastEarned]        = useState(0);
  const [audio,             setAudio]             = useState(true);
  const [sequencerProgress, setSequencerProgress] = useState<AppSession['sequencerProgress']>(null);

  // ── Online session state ──────────────────────────────────────────────────
  const [classroomSession,  setClassroomSession]  = useState<ClassroomSession | null>(null);
  const [sessionCode,       setSessionCode]       = useState<string | null>(null);
  const [onlineStudentId,   setOnlineStudentId]   = useState<string | null>(null);

  /**
   * When true the save effect skips one cycle.
   * Set just before the restore setState batch so the first triggered
   * save does not overwrite a partially-restored session. (Existing fix.)
   */
  const skipNextSave = useRef(false);

  // ─── Restore session on mount ─────────────────────────────────────────────
  useEffect(() => {
    const saved = loadSession();
    if (!saved) return;

    skipNextSave.current = true;

    setProfile(saved.profile);
    setScore(saved.score);
    setLastEarned(saved.lastEarned);
    setCategory(saved.category);
    setAudio(saved.audio);
    // Sync muted flag from session into AudioService on restore
    audioService.setMuted(!saved.audio);

    // Restore online session fields (C-1 / C-2 fix from architecture review)
    if (saved.sessionCode)    setSessionCode(saved.sessionCode);
    if (saved.onlineStudentId) setOnlineStudentId(saved.onlineStudentId);

    // Restore story
    if (saved.storyId) {
      const found = stories.find(s => s.id === saved.storyId) ?? null;
      if (found) {
        setStory(found);
      } else if (saved.screen === 'sequencer' || saved.screen === 'story' || saved.screen === 'student-story') {
        // Story was removed from the dataset — fall back safely
        const fallback: Screen = saved.profile?.mode === 'online' ? 'intro' : 'category';
        setScreen(fallback);
        return;
      }
    }

    if (saved.sequencerProgress) setSequencerProgress(saved.sequencerProgress);

    // Map any deprecated screen values so they never render a blank page
    let target: Screen = saved.screen;
    if (saved.screen === 'leaderboard') {
      target = saved.profile?.mode === 'online' ? 'intro' : 'category';
    }
    setScreen(target);

    // Async: re-hydrate the classroom session from its own storage key.
    // Teacher: restore the live dashboard.
    // Student: restore the session so submitScore() has the right context.
    if (saved.sessionCode && saved.profile?.mode === 'online') {
      sessionService
        .getLiveResults(saved.sessionCode)
        .then(session => {
          if (session && session.status === 'active') {
            setClassroomSession(session);
          } else {
            // Session ended or gone — safe fallback to intro
            clearSession();
            setProfile(null);
            setScreen('intro');
          }
        })
        .catch(() => {
          setScreen('intro');
        });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Persist session on every relevant state change ───────────────────────
  useEffect(() => {
    if (!profile) return; // never save before a login

    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }

    saveSession({
      studentId:         profile.studentId,
      profile,
      screen,
      category,
      storyId:           story?.id ?? null,
      score,
      lastEarned,
      audio,
      sequencerProgress,
      role:              profile.role ?? null,
      sessionCode,
      onlineStudentId,
    });

    // Bug 1 fix: persist offline progress separately from AppSession so it
    // survives logout. Only written in Offline mode with a known grade.
    if (profile.mode === 'offline' && profile.grade) {
      saveOfflineProfile(profile.name, profile.grade, {
        studentId:  profile.studentId,
        totalScore: score,
      });
    }
  }, [profile, screen, category, story, score, lastEarned, audio, sequencerProgress, sessionCode, onlineStudentId]);

  // ─── Shared reset ─────────────────────────────────────────────────────────

  function resetAllState() {
    setProfile(null);
    setCategory(null);
    setStory(null);
    setScore(0);
    setLastEarned(0);
    setAudio(true);
    setSequencerProgress(null);
    setSessionCode(null);
    setClassroomSession(null);
    setOnlineStudentId(null);
  }

  // ─── Handlers — common ────────────────────────────────────────────────────

  /**
   * Called by IntroScreen.
   * Routes to the correct first screen depending on mode + role.
   */
  function handleStart(
    name:    string,
    grade:   GradeLevel | null,
    mode:    GameMode,
    role:    OnlineRole | null,
    audioOn: boolean,
  ) {
    resetAllState();
    clearSession(); // always wipe the stale AppSession so restore never bleeds into the new login
    setAudio(audioOn);

    if (mode === 'offline') {
      // ── Bug 1 fix: restore existing offline profile (same name + grade) ──────
      // Look up the device-persistent profile before creating a new identity.
      const existing = grade ? loadOfflineProfile(name, grade) : null;

      const p: UserProfile = existing
        ? { studentId: existing.studentId, name, grade, mode: 'offline', role: null }
        : createProfile(name, grade, 'offline', null);

      setProfile(p);
      setScore(existing?.totalScore ?? 0); // restore accumulated score or start at 0
      setScreen('category');

    } else if (role === 'teacher') {
      const p = createProfile(name, null, 'online', 'teacher');
      setProfile(p);
      setScreen('teacher');

    } else {
      // Online student — profile is created in handleStudentJoined after joining
      setScreen('student-join');
    }
  }

  /** Clears everything and returns to the login screen. */
  function handleLogout() {
    clearSession();
    resetAllState();
    setScreen('intro');
  }

  // ─── Handlers — offline ───────────────────────────────────────────────────

  function handleCategorySelect(cat: Category) {
    setCategory(cat);
    setScreen('story');
  }

  function handleStorySelected(s: Story) {
    setStory(s);
    setSequencerProgress(null); // always start fresh for a new story
    setScreen('sequencer');
  }

  function handleNextLevel() {
    setStory(null);
    setSequencerProgress(null);
    setScreen('category');
  }

  /** Back from sequencer — offline goes to story list; online student goes back to story reader. */
  function handleBackToStory() {
    if (profile?.mode === 'offline') {
      setScreen('story');
    } else {
      // Online student pressing Back mid-sequencer — return to the story reader
      setScreen('student-story');
    }
  }

  // ─── Handlers — sequencer complete (shared) ───────────────────────────────

  function handleSequencerComplete(earned: number) {
    const roundScore = Math.max(SCORE_CLAMP_MIN, Math.min(SCORE_CLAMP_MAX, earned));
    setLastEarned(roundScore);
    setSequencerProgress(null);

    if (profile?.mode === 'offline') {
      // Offline: accumulate score across stories (functional update avoids stale closure)
      setScore(prev => prev + roundScore);

    } else {
      // Online student: submit this story's score to the classroom session.
      // Guard against null to prevent C-2 regression on refresh-restore.
      if (sessionCode && onlineStudentId) {
        void sessionService.submitScore(sessionCode, onlineStudentId, roundScore);
      }
      setScore(roundScore); // students only play one story per session
    }

    setScreen('reward');
  }

  // ─── Handlers — online teacher ────────────────────────────────────────────

  /** Called by TeacherLobby when createSession() succeeds. */
  function handleSessionCreated(session: ClassroomSession) {
    setClassroomSession(session);
    setSessionCode(session.code);
    // screen stays 'teacher' — component swaps from TeacherLobby → TeacherDashboard
  }

  /** Called by TeacherDashboard's End Session button. */
  function handleSessionEnd() {
    handleLogout(); // clear everything and return to intro
  }

  // ─── Handlers — online student ────────────────────────────────────────────

  /** Called by StudentJoin once joinSession() succeeds and story is resolved. */
  function handleStudentJoined(
    session:     ClassroomSession,
    studentId:   string,
    studentName: string,
    joinedStory: Story,
  ) {
    // Grade comes from the session — student cannot choose their own
    const p = createProfile(studentName, session.grade, 'online', 'student');
    setProfile(p);
    setClassroomSession(session);
    setSessionCode(session.code);
    setOnlineStudentId(studentId);
    setStory(joinedStory);
    setScore(0);
    setLastEarned(0);
    setSequencerProgress(null);
    // Route to story reader first so students read before sequencing
    setScreen('student-story');
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
    {/* AudioControls floats above every screen — single mount, never re-mounts */}
    <AudioControls />
    <AnimatePresence mode="wait">

      {/* ── Intro ── */}
      {screen === 'intro' && (
        <motion.div key="intro" {...pageVariants} className="w-full">
          <IntroScreen onStart={handleStart} />
        </motion.div>
      )}

      {/* ── Offline: Category Selection ── */}
      {screen === 'category' && profile && (
        <motion.div key="category" {...pageVariants} className="w-full">
          <CategorySelection
            profile={profile}
            score={score}
            onSelect={handleCategorySelect}
            onLogout={handleLogout}
          />
        </motion.div>
      )}

      {/* ── Online Student: Story Reader (read before sequencing) ── */}
      {screen === 'student-story' && profile && story && (
        <motion.div key="student-story" {...pageVariants} className="w-full">
          <StoryReader
            story={story}
            profile={profile}
            score={score}
            onNext={() => setScreen('sequencer')}
            onBack={handleLogout}
            onLogout={handleLogout}
            nextLabel="Start Activity"
            hideBack
          />
        </motion.div>
      )}

      {/* ── Offline: Story List ── */}
      {screen === 'story' && profile && category && (
        <motion.div key="story" {...pageVariants} className="w-full">
          <StoryScreen
            profile={profile}
            score={score}
            category={category}
            onStorySelected={handleStorySelected}
            onBack={() => setScreen('category')}
            onLogout={handleLogout}
          />
        </motion.div>
      )}

      {/* ── Sequencer — shared by offline + online student ── */}
      {screen === 'sequencer' && profile && story && (
        <motion.div key="sequencer" {...pageVariants} className="w-full">
          <EventSequencer
            story={story}
            profile={profile}
            score={score}
            onComplete={handleSequencerComplete}
            onBack={handleBackToStory}
            onLogout={handleLogout}
            initialShuffledIds={sequencerProgress?.shuffledEventIds}
            initialSlots={sequencerProgress?.slots}
            onProgressChange={(ids, slots) =>
              setSequencerProgress({ shuffledEventIds: ids, slots })
            }
          />
        </motion.div>
      )}

      {/* ── Reward — shared by offline + online student ── */}
      {screen === 'reward' && profile && (
        <motion.div key="reward" {...pageVariants} className="w-full">
          <RewardScreen
            profile={profile}
            totalScore={score}
            lastEarned={lastEarned}
            onNextLevel={handleNextLevel}
            onLogout={handleLogout}
            allowContinue={profile.mode === 'offline'}
          />
        </motion.div>
      )}

      {/* ── Online Teacher: Lobby ↔ Dashboard ── */}
      {screen === 'teacher' && profile && (
        <motion.div key="teacher" {...pageVariants} className="w-full">
          <AnimatePresence mode="wait">
            {classroomSession ? (
              <motion.div
                key={`dashboard-${classroomSession.code}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
                <TeacherDashboard
                  profile={profile}
                  session={classroomSession}
                  onSessionEnd={handleSessionEnd}
                  onLogout={handleLogout}
                />
              </motion.div>
            ) : (
              <motion.div
                key="lobby"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
                <TeacherLobby
                  profile={profile}
                  onSessionCreated={handleSessionCreated}
                  onBack={handleLogout}
                  onLogout={handleLogout}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ── Online Student: Join Session ── */}
      {screen === 'student-join' && (
        <motion.div key="student-join" {...pageVariants} className="w-full">
          <StudentJoin
            onReady={handleStudentJoined}
            onBack={() => setScreen('intro')}
          />
        </motion.div>
      )}

    </AnimatePresence>
    </>
  );
}
