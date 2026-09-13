/**
 * StoryCompanion — Uses the mascot PNG (cute blue owl) as the base character.
 * Since all expression PNGs are currently identical, expressions are conveyed
 * through animated overlays, glow effects, and distinct motion animations,
 * keeping the correct character style from the reference design.
 *
 * Expression → Screen mapping:
 *   idle        → IntroScreen, CategorySelection  (gentle float)
 *   happy       → StoryScreen reading             (bounce + warm glow)
 *   thinking    → EventSequencer                  (head tilt + bubble)
 *   excited     → RewardScreen 3-star             (jump + star burst)
 *   encouraging → RewardScreen partial            (pulse + soft glow)
 */

import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';

export type CompanionEmotion =
  | 'idle'
  | 'neutral'
  | 'happy'
  | 'thinking'
  | 'excited'
  | 'encouraging';

interface StoryCompanionProps {
  emotion?: CompanionEmotion;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  speech?: string;
  className?: string;
}

const emotionImageMap: Record<CompanionEmotion, string> = {
  idle:        '/mascot-idle.png',
  neutral:     '/mascot-idle.png',
  happy:       '/mascot-happy.png',
  thinking:    '/mascot-thinking.png',
  excited:     '/mascot-excited.png',
  encouraging: '/mascot-happy.png',
};

const sizePx: Record<NonNullable<StoryCompanionProps['size']>, number> = {
  sm:   80,
  md:   140,
  lg:   210,
  hero: 320,
};

/* ── Framer Motion animation variants per emotion ─────────────────── */
const bodyVariants: Variants = {
  idle: {
    y: [0, -8, 0],
    rotate: [0, 2, -2, 0],
    transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
  },
  neutral: {
    y: [0, -5, 0],
    transition: { duration: 3.5, repeat: Infinity, ease: 'easeInOut' },
  },
  happy: {
    y: [0, -14, 0],
    scale: [1, 1.07, 1],
    transition: { duration: 1.1, repeat: Infinity, ease: 'easeInOut' },
  },
  thinking: {
    rotate: [0, -6, 6, -4, 0],
    y: [0, -3, 0],
    transition: { duration: 2.8, repeat: Infinity, ease: 'easeInOut' },
  },
  excited: {
    y: [0, -20, 0],
    rotate: [0, 8, -8, 0],
    scale: [1, 1.13, 1],
    transition: { duration: 0.75, repeat: Infinity, ease: 'easeInOut' },
  },
  encouraging: {
    scale: [1, 1.06, 1],
    y: [0, -6, 0],
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
  },
};

/* ── Glow / aura color per emotion ────────────────────────────────── */
const auraColor: Record<CompanionEmotion, string | null> = {
  idle:        null,
  neutral:     null,
  happy:       'rgba(255, 210, 80, 0.45)',
  thinking:    'rgba(120, 180, 255, 0.35)',
  excited:     'rgba(255, 220, 50, 0.6)',
  encouraging: 'rgba(100, 230, 150, 0.35)',
};

/* ── Stars that appear only for "excited" ─────────────────────────── */
const StarBurst = ({ size }: { size: number }) => {
  const stars = [
    { x: -size * 0.42, y: -size * 0.20, s: size * 0.12, delay: 0 },
    { x:  size * 0.40, y: -size * 0.28, s: size * 0.10, delay: 0.15 },
    { x: -size * 0.30, y:  size * 0.10, s: size * 0.08, delay: 0.25 },
    { x:  size * 0.28, y:  size * 0.08, s: size * 0.09, delay: 0.1  },
  ];
  return (
    <>
      {stars.map((st, i) => (
        <motion.div
          key={i}
          className="absolute pointer-events-none"
          style={{ left: '50%', top: '40%', width: st.s, height: st.s, translateX: st.x, translateY: st.y }}
          animate={{ scale: [0.7, 1.3, 0.7], opacity: [0.6, 1, 0.6], rotate: [0, 20, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: st.delay, ease: 'easeInOut' }}
        >
          <svg viewBox="0 0 24 24" fill="#FFD700" xmlns="http://www.w3.org/2000/svg">
            <polygon points="12,2 15,9 22,9 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9 9,9" />
          </svg>
        </motion.div>
      ))}
    </>
  );
};

/* ── Thought-bubble dots for "thinking" ──────────────────────────── */
const ThinkingDots = ({ size }: { size: number }) => (
  <motion.div
    className="absolute flex gap-1 items-center pointer-events-none"
    style={{ top: size * 0.02, right: -size * 0.08 }}
    animate={{ opacity: [0.4, 1, 0.4] }}
    transition={{ duration: 1.5, repeat: Infinity }}
  >
    {[0, 0.2, 0.4].map((delay, i) => (
      <motion.div
        key={i}
        className="rounded-full bg-sky-300 border border-sky-500"
        style={{ width: size * 0.055 * (1 - i * 0.15), height: size * 0.055 * (1 - i * 0.15) }}
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 0.9, repeat: Infinity, delay }}
      />
    ))}
    <motion.div
      className="rounded-lg bg-sky-100/90 border-2 border-sky-300 flex items-center justify-center"
      style={{ width: size * 0.38, height: size * 0.22, padding: 4 }}
      animate={{ opacity: [0.7, 1, 0.7] }}
      transition={{ duration: 1.8, repeat: Infinity, delay: 0.3 }}
    >
      <span style={{ fontSize: size * 0.10 }}>🤔</span>
    </motion.div>
  </motion.div>
);

/* ── Main Component ───────────────────────────────────────────────── */
export default function StoryCompanion({
  emotion = 'idle',
  size = 'md',
  speech,
  className = '',
}: StoryCompanionProps) {
  const px = sizePx[size];
  const aura = auraColor[emotion];

  return (
    <div
      className={`relative inline-flex flex-col items-center justify-end ${className}`}
      style={{ width: px, minHeight: px * 1.2 }}
    >
      {/* Speech Bubble */}
      <AnimatePresence>
        {speech && (
          <motion.div
            key={speech}
            initial={{ opacity: 0, y: 10, scale: 0.88 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.92 }}
            className="absolute top-0 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
            style={{ width: Math.min(px * 1.4, 260) }}
          >
            <div
              className="relative px-3 py-2 bg-white border-[3px] border-[#8c5825] rounded-2xl shadow-xl text-center"
              style={{ fontSize: Math.max(px * 0.072, 11) }}
            >
              <p className="font-nunito font-extrabold text-[#4a2e12] leading-tight">{speech}</p>
              {/* Tail */}
              <div className="absolute -bottom-[13px] left-1/2 -translate-x-1/2 w-0 h-0
                border-l-[9px] border-l-transparent
                border-r-[9px] border-r-transparent
                border-t-[13px] border-t-[#8c5825]" />
              <div className="absolute -bottom-[10px] left-1/2 -translate-x-1/2 w-0 h-0
                border-l-[7px] border-l-transparent
                border-r-[7px] border-r-transparent
                border-t-[11px] border-t-white" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Aura / glow ring behind mascot */}
      {aura && (
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: px * 0.9,
            height: px * 0.5,
            bottom: px * 0.05,
            left: '50%',
            translateX: '-50%',
            background: aura,
            filter: 'blur(18px)',
          }}
          animate={{ opacity: [0.5, 1, 0.5], scale: [0.9, 1.1, 0.9] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Excited star bursts */}
      {emotion === 'excited' && <StarBurst size={px} />}

      {/* Thinking dots */}
      {emotion === 'thinking' && <ThinkingDots size={px} />}

      {/* Mascot character */}
      <motion.div
        variants={bodyVariants}
        animate={emotion}
        className="relative z-10 mt-auto"
        style={{ width: px, height: px }}
      >
        <img
          src={emotionImageMap[emotion]}
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/mascot-idle.png'; }}
          alt={`Story Quest Companion - ${emotion}`}
          className="w-full h-full object-contain select-none"
          draggable={false}
          style={{
            filter: emotion === 'happy'
              ? 'drop-shadow(0 0 14px rgba(255,210,80,0.7)) brightness(1.05)'
              : emotion === 'excited'
              ? 'drop-shadow(0 0 20px rgba(255,220,50,0.8)) brightness(1.08)'
              : emotion === 'thinking'
              ? 'drop-shadow(0 0 10px rgba(120,180,255,0.5))'
              : emotion === 'encouraging'
              ? 'drop-shadow(0 0 10px rgba(100,230,150,0.5))'
              : 'drop-shadow(0 6px 12px rgba(0,0,0,0.35))',
          }}
        />
      </motion.div>
    </div>
  );
}
