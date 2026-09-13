import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ArrowRight, CheckCircle2, XCircle, BookOpen } from 'lucide-react';
import type { UserProfile, Story } from '../types';
import UserProfileHeader from './UserProfileHeader';
import { useAudio } from '../hooks/useAudio';
import StoryCompanion from './StoryCompanion';

interface Props {
  profile: UserProfile;
  totalScore: number;
  lastEarned: number;
  story?: Story | null;
  placedSlots?: (string | null)[] | null;
  onNextLevel: () => void;
  /** @deprecated — global leaderboard removed; kept for call-site compat only */
  onLeaderboard?: () => void;
  onLogout: () => void;
  /**
   * When false (online student), hides "Next Level" and shows a
   * "Waiting for class to finish" message instead.
   * Defaults to true (offline behaviour).
   */
  allowContinue?: boolean;
}

const confettiColors = ['#82e022', '#ff5e4d', '#429ef5', '#ffd700', '#ffffff'];

/** All random values are generated once in the parent useState — never inside render */
interface ParticleData {
  id:       number;
  color:    string;
  delay:    number;
  left:     string;
  size:     number;
  animY:    number;
  animX:    number;
  rotate:   number;
  duration: number;
}

function Particle({ color, left, size, animY, animX, rotate, duration, delay }: ParticleData) {
  return (
    <motion.div
      className="absolute rounded-sm pointer-events-none z-0"
      style={{ left, bottom: '-10%', width: size, height: size, background: color }}
      initial={{ y: 0, opacity: 1, rotate: 0 }}
      animate={{ y: animY, opacity: [1, 1, 0], x: animX, rotate }}
      transition={{ delay, duration, ease: 'easeOut' }}
    />
  );
}

const messages: Record<number, string> = {
  3: 'Story Master!',
  2: 'Great Job!',
  1: 'Nice Try!',
};

const MAX_REVIEW_EVENTS = 8;

export default function RewardScreen({
  profile,
  totalScore,
  lastEarned,
  story,
  placedSlots,
  onNextLevel,
  onLogout,
  allowContinue = true,
}: Props) {
  const stars = lastEarned >= 90 ? 3 : lastEarned >= 60 ? 2 : 1;
  const [showReview, setShowReview] = useState(true);

  const [particles] = useState<ParticleData[]>(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id:       i,
      color:    confettiColors[i % confettiColors.length],
      delay:    i * 0.03,
      left:     `${5 + Math.random() * 90}%`,
      size:     6 + Math.random() * 10,
      animY:    -(400 + Math.random() * 200),
      animX:    (Math.random() - 0.5) * 200,
      rotate:   Math.random() * 360,
      duration: 1.5 + Math.random() * 1,
    }))
  );
  const [showParticles, setShowParticles] = useState(false);
  const audio = useAudio();

  useEffect(() => {
    audio.playMusic('reward');
    const t1 = setTimeout(() => { setShowParticles(true); audio.playReward(); }, 100);
    const t2 = setTimeout(() => audio.playConfetti(), 350);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compute detailed sequence review data
  const reviewItems = useMemo(() => {
    if (!story) return [];
    const correctOrder = story.correctOrder.slice(0, MAX_REVIEW_EVENTS);
    const eventsMap = new Map(story.events.map(e => [e.id, e.text]));

    return correctOrder.map((correctId, idx) => {
      const correctText = eventsMap.get(correctId) ?? 'Event step';
      const placedId = placedSlots && placedSlots[idx] ? placedSlots[idx] : null;
      const placedText = placedId ? (eventsMap.get(placedId) ?? 'Unknown Event') : null;
      const isMatch = placedId === correctId;

      return {
        stepNumber: idx + 1,
        correctText,
        placedText,
        isMatch,
      };
    });
  }, [story, placedSlots]);

  return (
    <div className="bg-landscape min-h-dvh flex flex-col justify-between overflow-y-auto relative pb-8 w-full">
      <UserProfileHeader profile={profile} score={totalScore} onLogout={onLogout} />

      {/* Confetti */}
      <AnimatePresence>
        {showParticles && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            {particles.map(p => <Particle key={p.id} {...p} />)}
          </div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex items-center justify-center w-full px-4 md:px-8 py-6 my-auto z-10">
        <div className="flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-10 max-w-6xl mx-auto w-full">
          
          {/* Left side: Hero Mascot Companion in Excited / Happy pose */}
          <motion.div
            className="shrink-0 flex justify-center items-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 180, damping: 20 }}
          >
            <StoryCompanion
              emotion={stars === 3 ? 'excited' : 'happy'}
              size="hero"
              speech={stars === 3 ? 'Outstanding Sequencing!' : 'Great effort! Review correct steps below.'}
            />
          </motion.div>

          {/* Reward card */}
          <motion.div
            className="wood-board w-full max-w-md p-6 pt-12 pb-8 text-center relative flex flex-col items-center justify-between shrink-0 shadow-2xl"
            initial={{ scale: 0.7, opacity: 0, rotate: -5 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
          >
            {/* Top Banner overlay */}
            <div className="absolute -top-7 ribbon-blue !bg-gradient-to-b !from-[#82e022] !to-[#2d9313] !border-[3px] !border-white text-3xl md:text-4xl font-fredoka px-10 py-1 shadow-2xl">
              {messages[stars]}
            </div>

            <div className="parchment-inner w-full p-6 mt-4 flex flex-col items-center border-[3px] border-[#8c5825]">
              
              {/* Stars */}
              <motion.div
                className="flex justify-center gap-2 mb-3 drop-shadow-xl"
                animate={{ scale: [1, 1.08, 1], rotate: [0, 3, -3, 0] }}
                transition={{ duration: 1.5, delay: 0.5, repeat: Infinity }}
              >
                {Array.from({ length: 3 }).map((_, idx) => (
                  <Star
                    key={idx}
                    size={idx < stars ? 72 : 44}
                    fill={idx < stars ? 'currentColor' : 'none'}
                    strokeWidth={1.5}
                    className={idx < stars ? 'text-yellow-400' : 'text-yellow-700/40'}
                  />
                ))}
              </motion.div>

              {/* Score */}
              <motion.div
                className="bg-black/90 px-8 py-2.5 rounded-full border-3 border-yellow-500 mb-6 shadow-inner"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
              >
                <p className="font-fredoka text-3xl md:text-4xl text-yellow-400">
                  +{lastEarned} Points!
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.3 }}
                className="w-full"
              >
                {allowContinue ? (
                  <button
                    onClick={() => { audio.playClick(); onNextLevel(); }}
                    className="game-btn game-btn-blue text-2xl md:text-3xl px-10 py-4 w-full flex items-center justify-center gap-3 shadow-xl"
                  >
                    Next Level <ArrowRight size={28} />
                  </button>
                ) : (
                  <p className="font-nunito font-extrabold text-[#4a2e12] text-base text-center px-2">
                    ✓ Score submitted!<br />
                    <span className="text-[#8c5825]">Waiting for class to finish…</span>
                  </p>
                )}
              </motion.div>
            </div>

            {/* Total score display */}
            <motion.div 
              className="mt-4 font-fredoka text-white text-stroke-primary drop-shadow-md text-xl md:text-2xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
            >
              Total: {totalScore}
            </motion.div>

          </motion.div>

          {/* ── Detailed Correct Sequence Review Panel (Centered) ───────────────────────── */}
          {story && reviewItems.length > 0 && (
            <motion.div
              className="wood-board w-full max-w-xl p-6 pt-10 pb-6 relative z-10 flex flex-col justify-between shadow-2xl"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 180, damping: 20 }}
            >
              {/* Header ribbon */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 ribbon-blue text-base md:text-xl px-8 flex items-center gap-2 whitespace-nowrap z-10">
                <BookOpen size={22} /> Correct Sequence Review
              </div>

              <div className="parchment-inner p-4 md:p-6 mt-2 max-h-[500px] overflow-y-auto flex flex-col gap-3 border-[3px] border-[#8c5825]">
                <div className="text-center border-b-2 border-[#8c5825]/30 pb-3">
                  <p className="font-nunito text-sm md:text-base text-[#8c5825] font-extrabold">
                    Story: <span className="text-[#4a2e12]">{story.title}</span>
                  </p>
                  <p className="font-fredoka text-sm md:text-lg text-green-800 mt-1">
                    Placements Matched: {reviewItems.filter(i => i.isMatch).length} / {reviewItems.length}
                  </p>
                </div>

                {reviewItems.map((item) => (
                  <div
                    key={item.stepNumber}
                    className={`p-3.5 rounded-xl border-2 text-left flex gap-3.5 items-start transition-colors ${
                      item.isMatch
                        ? 'bg-green-50/95 border-green-500 text-green-950 shadow-sm'
                        : 'bg-amber-50/95 border-amber-500 text-amber-950 shadow-sm'
                    }`}
                  >
                    {/* Step Rank */}
                    <div
                      className={`w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center shrink-0 font-fredoka text-sm md:text-base font-bold text-white shadow ${
                        item.isMatch ? 'bg-green-600' : 'bg-amber-600'
                      }`}
                    >
                      {item.stepNumber}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 font-fredoka text-xs md:text-sm mb-1">
                        {item.isMatch ? (
                          <>
                            <CheckCircle2 size={18} className="text-green-600 shrink-0" />
                            <span className="text-green-700 font-bold">Correctly Placed!</span>
                          </>
                        ) : (
                          <>
                            <XCircle size={18} className="text-amber-600 shrink-0" />
                            <span className="text-amber-700 font-bold">Correct Step #{item.stepNumber}:</span>
                          </>
                        )}
                      </div>
                      {/* Correct Text */}
                      <p className="font-nunito text-xs md:text-base font-bold leading-relaxed text-[#4a2e12]">
                        {item.correctText}
                      </p>
                      {/* Student Placed Choice (if misplaced) */}
                      {!item.isMatch && item.placedText && (
                        <p className="font-nunito text-xs md:text-sm text-amber-900 mt-1.5 italic bg-amber-100/90 px-3 py-1 rounded-lg border border-amber-300">
                          Your placement: "{item.placedText}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

        </div>
      </div>
    </div>
  );
}
