import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { sessionService } from '../services/classroomSession';
import { stories } from '../data/stories';
import type { ClassroomParticipant, ClassroomSession, UserProfile } from '../types';
import UserProfileHeader from './UserProfileHeader';
import { useAudio } from '../hooks/useAudio';

interface Props {
  profile:      UserProfile;
  session:      ClassroomSession;
  onSessionEnd: () => void;
  onLogout:     () => void;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ClassroomParticipant['status'] }) {
  if (status === 'submitted') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-green-600 text-white whitespace-nowrap">
        ✓ Done
      </span>
    );
  }
  // 'joined' and 'playing' are both shown as "Playing…" since the mock
  // only transitions directly to 'submitted'
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white animate-pulse whitespace-nowrap">
      ▶ Playing
    </span>
  );
}

// ─── TeacherDashboard ─────────────────────────────────────────────────────────

export default function TeacherDashboard({ profile, session, onSessionEnd, onLogout }: Props) {
  const audio = useAudio();
  const [liveSession, setLiveSession] = useState<ClassroomSession>(session);

  // Track participant counts across polls to detect new joins / submissions
  const prevJoinedRef    = useRef(session.participants.length);
  const prevSubmittedRef = useRef(session.participants.filter(p => p.status === 'submitted').length);

  // Play teacher music and session-created sound once on mount
  useEffect(() => {
    audio.playMusic('teacher');
    audio.playSessionCreated();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Polling: refresh live results every 2 seconds.
  // The `cancelled` flag prevents stale async callbacks from calling setState
  // on an unmounted component — fixes H-1 from the architecture review.
  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const data = await sessionService.getLiveResults(session.code);
        if (!cancelled && data) {
          // Detect new participants and new submissions
          const newJoined    = data.participants.length;
          const newSubmitted = data.participants.filter(p => p.status === 'submitted').length;
          if (newJoined    > prevJoinedRef.current)    audio.playStudentJoin();
          if (newSubmitted > prevSubmittedRef.current) audio.playSubmit();
          prevJoinedRef.current    = newJoined;
          prevSubmittedRef.current = newSubmitted;
          setLiveSession(data);
        }
      } catch {
        // Polling failure — keep last known state, never crash (H-1 fix)
      }
    }

    poll(); // immediate first fetch — no 2-second delay on mount
    const id = setInterval(poll, 2000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [session.code]);

  // ── Story lookup ──────────────────────────────────────────────────────────
  const storyTitle = useMemo(
    () => stories.find(s => s.id === liveSession.storyId)?.title ?? liveSession.storyId,
    [liveSession.storyId],
  );

  // ── Sorted participants (M-4 fix: memoised — sorts only when data changes) ─
  // Sort order: submitted (high → low score) → playing/joined (alphabetical)
  const sortedParticipants = useMemo(() => {
    return [...liveSession.participants].sort((a, b) => {
      if (a.status === 'submitted' && b.status !== 'submitted') return -1;
      if (b.status === 'submitted' && a.status !== 'submitted') return 1;
      if (a.status === 'submitted' && b.status === 'submitted') {
        return (b.score ?? 0) - (a.score ?? 0);
      }
      return a.name.localeCompare(b.name);
    });
  }, [liveSession.participants]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalJoined    = liveSession.participants.length;
  const totalSubmitted = liveSession.participants.filter(p => p.status === 'submitted').length;
  const stillPlaying   = totalJoined - totalSubmitted;

  async function handleEnd() {
    audio.playClick();
    audio.playSessionEnd();
    await sessionService.endSession(session.code);
    onSessionEnd();
  }

  return (
    <div className="bg-landscape min-h-dvh flex flex-col">
      <UserProfileHeader profile={profile} score={0} onLogout={onLogout} />

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 overflow-y-auto">
        <motion.div
          className="wood-board relative w-11/12 md:w-full max-w-2xl pt-14 pb-8 px-6 md:px-10 flex flex-col gap-5"
          initial={{ scale: 0.88, opacity: 0 }}
          animate={{ scale: 1,    opacity: 1 }}
          transition={{ type: 'spring', stiffness: 180, damping: 22 }}
        >
          {/* Ribbon */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 ribbon-blue text-lg px-8 z-10 flex items-center gap-2 whitespace-nowrap">
            🏫 Live Classroom
          </div>

          {/* ── Session Code — large for projector visibility ─────────────── */}
          <div className="parchment-inner py-5 px-6 text-center">
            <p className="font-nunito text-[#8c5825] text-xs font-bold uppercase tracking-widest mb-1">
              Session Code
            </p>
            <p
              className="font-fredoka text-5xl md:text-6xl text-[#4a2e12] tracking-[0.2em] drop-shadow-sm select-all"
              aria-label={`Session code: ${liveSession.code.split('').join(' ')}`}
            >
              {liveSession.code}
            </p>
            <p className="font-nunito text-[#8c5825] text-xs mt-1">
              Students enter this code to join
            </p>
          </div>

          {/* ── Story info ────────────────────────────────────────────────── */}
          <div className="text-center -mt-1">
            <p className="font-nunito text-white/70 text-[11px] uppercase tracking-wider">
              {liveSession.category}
            </p>
            <p className="font-fredoka text-white text-lg drop-shadow-md leading-snug">
              {storyTitle}
            </p>
          </div>

          {/* ── Stats bar ─────────────────────────────────────────────────── */}
          <div className="flex justify-center gap-6 text-center">
            {([
              { label: 'Joined',    value: totalJoined,    color: 'text-yellow-300' },
              { label: 'Submitted', value: totalSubmitted, color: 'text-green-300'  },
              { label: 'Playing',   value: stillPlaying,   color: 'text-blue-300'   },
            ] as const).map(stat => (
              <div key={stat.label}>
                <p className={`font-fredoka text-3xl ${stat.color} drop-shadow`}>
                  {stat.value}
                </p>
                <p className="font-nunito text-white/70 text-xs">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* ── Participant list ──────────────────────────────────────────── */}
          <div className="parchment-inner rounded-xl overflow-hidden border-[3px] border-[#b57b37]">
            {sortedParticipants.length === 0 ? (
              <p className="text-center font-nunito text-[#8c5825] text-sm py-8">
                Waiting for students to join…
              </p>
            ) : (
              <div className="divide-y divide-[#b57b37]/30 max-h-64 overflow-y-auto">
                {sortedParticipants.map((p, i) => (
                  <div key={p.studentId} className="flex items-center gap-3 px-4 py-3">
                    {/* Rank */}
                    <span className="font-fredoka text-[#8c5825] text-sm w-5 text-right shrink-0">
                      {i + 1}
                    </span>
                    {/* Name */}
                    <span className="font-nunito font-bold text-[#4a2e12] flex-1 truncate text-sm">
                      {p.name}
                    </span>
                    {/* Status badge */}
                    <StatusBadge status={p.status} />
                    {/* Score — only when submitted */}
                    {p.status === 'submitted' && p.score !== null && (
                      <span className="font-fredoka text-xl text-[#4a2e12] w-10 text-right shrink-0">
                        {p.score}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── End Session button ────────────────────────────────────────── */}
          <motion.button
            onClick={handleEnd}
            className="game-btn game-btn-red py-2.5 px-10 self-center mt-1"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            🛑 End Session
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
