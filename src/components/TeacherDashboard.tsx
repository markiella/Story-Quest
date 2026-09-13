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
  const [showAccessCodes, setShowAccessCodes] = useState(false);

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
        // Polling failure — keep last known state, never crash
      }
    }

    poll();
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

  // ── Sorted participants ───────────────────────────────────────────────────
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
              Classroom Session Code
            </p>
            <p
              className="font-fredoka text-6xl md:text-7xl lg:text-8xl text-[#4a2e12] tracking-[0.2em] drop-shadow-md select-all"
              aria-label={`Session code: ${liveSession.code.split('').join(' ')}`}
            >
              {liveSession.code}
            </p>
            <p className="font-nunito text-[#8c5825] text-xs md:text-sm mt-1 font-bold">
              Students enter this code to join
            </p>
          </div>

          {/* ── Story info ────────────────────────────────────────────────── */}
          <div className="text-center -mt-1">
            <p className="font-nunito text-white/70 text-[11px] uppercase tracking-wider">
              {liveSession.category}
            </p>
            <p className="font-fredoka text-white text-lg md:text-2xl drop-shadow-md leading-snug">
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

          {/* ── Participant list header & privacy toggle ─────────────────── */}
          <div className="flex justify-between items-center px-1">
            <span className="font-fredoka text-white text-sm text-stroke-primary">
              Student Roster ({sortedParticipants.length})
            </span>
            <button
              onClick={() => setShowAccessCodes(prev => !prev)}
              className="text-xs font-nunito font-bold px-3 py-1 bg-white/80 hover:bg-white text-[#4a2e12] rounded-lg border border-[#b57b37] transition-all shadow-sm flex items-center gap-1"
            >
              {showAccessCodes ? '🙈 Hide Access Codes' : '👁️ Show Access Codes (Private)'}
            </button>
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
                    <div className="flex-1 min-w-0">
                      <p className="font-nunito font-bold text-[#4a2e12] truncate text-sm">
                        {p.name}
                      </p>
                      {showAccessCodes && p.studentCode && (
                        <p className="font-mono text-[10px] text-[#1a3a6e] font-bold">
                          Code: {p.studentCode}
                        </p>
                      )}
                    </div>
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

          {/* ── End Session button & Deployment Note ────────────────────────── */}
          <div className="flex flex-col items-center gap-3 mt-1">
            <p className="font-nunito text-[11px] text-white/80 text-center max-w-lg">
              💡 <em>Classroom Guidance: Supervised use on school or Department of Education provided devices recommended.</em>
            </p>
            <motion.button
              onClick={handleEnd}
              className="game-btn game-btn-red py-2.5 px-10 self-center"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              🛑 End Session
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
