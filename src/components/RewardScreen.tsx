import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ArrowRight } from 'lucide-react';
import type { UserProfile } from '../types';
import UserProfileHeader from './UserProfileHeader';
import { useAudio } from '../hooks/useAudio';

interface Props {
  profile: UserProfile;
  totalScore: number;
  lastEarned: number;
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

const messages: Record<number, string>    = {
  3: 'Story Master!',
  2: 'Great Job!',
  1: 'Nice Try!',
};

export default function RewardScreen({ profile, totalScore, lastEarned, onNextLevel, onLogout, allowContinue = true }: Props) {
  const stars = lastEarned >= 90 ? 3 : lastEarned >= 60 ? 2 : 1;

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

  return (
    <div className="bg-landscape min-h-dvh flex flex-col overflow-hidden relative">
      <UserProfileHeader profile={profile} score={totalScore} onLogout={onLogout} />

      <div className="flex-1 flex items-center justify-center px-4 relative">
        {/* Confetti */}
        <AnimatePresence>
          {showParticles && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {particles.map(p => <Particle key={p.id} {...p} />)}
            </div>
          )}
        </AnimatePresence>

        {/* Reward card */}
        <motion.div
          className="wood-board w-full max-w-sm p-6 pt-10 pb-8 text-center relative z-10 flex flex-col items-center"
          initial={{ scale: 0.7, opacity: 0, rotate: -5 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
        >
          {/* Top Banner overlay */}
          <div className="absolute -top-6 ribbon-blue !bg-gradient-to-b !from-[#82e022] !to-[#2d9313] !border-[3px] !border-white text-3xl font-fredoka px-8 shadow-2xl">
            {messages[stars]}
          </div>

          <div className="parchment-inner w-full p-6 mt-4 flex flex-col items-center border-[3px] border-[#8c5825]">
            
            {/* Stars */}
            <motion.div
              className="flex justify-center gap-1 mb-2 drop-shadow-lg"
              animate={{ scale: [1, 1.08, 1], rotate: [0, 3, -3, 0] }}
              transition={{ duration: 1.5, delay: 0.5, repeat: Infinity }}
            >
              {Array.from({ length: 3 }).map((_, idx) => (
                <Star
                  key={idx}
                  size={idx < stars ? 64 : 40}
                  fill={idx < stars ? 'currentColor' : 'none'}
                  strokeWidth={1.5}
                  className={idx < stars ? 'text-yellow-400' : 'text-yellow-700/40'}
                />
              ))}
            </motion.div>

            {/* Score */}
            <motion.div
              className="bg-black/80 px-6 py-2 rounded-full border-2 border-yellow-500 mb-6 shadow-inner"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
            >
              <p className="font-fredoka text-3xl text-yellow-400">
                +{lastEarned} Points!
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.3 }}
            >
              {allowContinue ? (
                <button
                  onClick={() => { audio.playClick(); onNextLevel(); }}
                  className="game-btn game-btn-blue text-xl px-10 py-3 w-full"
                >
                  Next Level <ArrowRight size={20} />
                </button>
              ) : (
                <p className="font-nunito font-bold text-[#4a2e12] text-sm text-center px-2">
                  ✓ Score submitted!<br />
                  <span className="text-[#8c5825]">Waiting for class to finish…</span>
                </p>
              )}
            </motion.div>
          </div>

          {/* Total score display */}
          <motion.div 
            className="mt-4 font-nunito font-bold text-white text-stroke-primary drop-shadow-md text-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
          >
            Total: {totalScore}
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
}
