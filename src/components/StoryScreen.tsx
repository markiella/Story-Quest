import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ChevronRight, ChevronLeft, Play, Pause, Square, RotateCcw } from 'lucide-react';
import { stories } from '../data/stories';
import type { Category, Story, UserProfile } from '../types';
import UserProfileHeader from './UserProfileHeader';
import { useAudio } from '../hooks/useAudio';
import type { NarrationState } from '../hooks/useAudio';
import StoryCompanion from './StoryCompanion';

interface Props {
  profile: UserProfile;
  score: number;
  category: Category;
  onStorySelected: (story: Story) => void;
  onBack: () => void;
  onLogout: () => void;
}

export default function StoryScreen({ profile, score, category, onStorySelected, onBack, onLogout }: Props) {
  const audio = useAudio();
  const categoryStories = useMemo(
    () => stories.filter(s => s.category === category),
    [category]
  );
  const [selected, setSelected] = useState<Story | null>(null);

  useEffect(() => { audio.playMusic('story'); }, [audio]);

  if (selected) {
    return (
      <StoryReader
        story={selected}
        profile={profile}
        score={score}
        onNext={() => { audio.playClick(); audio.stopNarration(); onStorySelected(selected); }}
        onBack={() => { audio.playClick(); audio.stopNarration(); setSelected(null); }}
        onLogout={onLogout}
      />
    );
  }

  return (
    <div className="bg-landscape w-full flex flex-col min-h-dvh">
      <UserProfileHeader profile={profile} score={score} onLogout={onLogout} />

      <div className="flex-1 flex items-center justify-center w-full px-4 md:px-8 py-6 my-auto">
        <div className="flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-10 max-w-6xl mx-auto w-full">
          {/* Left Side Mascot Companion — Happy expression for Story Selection */}
          <motion.div
            className="shrink-0 flex justify-center items-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 180, damping: 20 }}
          >
            <StoryCompanion
              emotion="happy"
              size="hero"
              speech="Choose a story to read!"
            />
          </motion.div>

          {/* Centered Main Story List Board */}
          <motion.div 
            className="wood-board flex-1 w-full max-w-5xl p-6 md:p-10 pt-16 pb-8 shadow-2xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
          >
          {/* Ribbon Header */}
          <div className="absolute -top-5 md:-top-6 left-1/2 -translate-x-1/2 ribbon-blue text-lg md:text-xl px-6 md:px-10 z-10 flex flex-nowrap items-center gap-2 md:gap-3 whitespace-nowrap min-w-max max-w-[90vw] overflow-hidden">
            <BookOpen size={20} className="md:w-[28px] md:h-[28px] opacity-90 flex-shrink-0" />
            <span className="truncate">{category} Stories</span>
          </div>

          {/* Story list */}
          <div className="max-h-[50vh] md:max-h-[55vh] overflow-y-auto pr-1 mt-2 mb-4 space-y-3 md:space-y-4">
            {categoryStories.map((story, i) => (
              <motion.button
                key={story.id}
                onClick={() => { audio.playClick(); setSelected(story); }}
                onMouseEnter={() => audio.playHover()}
                className="w-full parchment-inner p-3 md:p-4 text-left cursor-pointer
                           hover:scale-[1.02] active:scale-[0.99] transition-all duration-200
                           flex items-center gap-3 md:gap-4 group"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.06, 0.6), type: 'spring', stiffness: 180 }}
              >
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#8c5825] border-2 border-[#4a2e12] flex items-center justify-center text-white font-fredoka flex-shrink-0 text-sm md:text-base">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-fredoka text-base md:text-xl text-[#4a2e12] leading-tight truncate">{story.title}</h2>
                  <p className="font-nunito text-[#8c5825] text-xs md:text-sm mt-0.5 md:mt-1 truncate">
                    {story.fullStory.split('\n\n')[0]}
                  </p>
                </div>
                <div className="game-btn game-btn-green !p-1 md:!p-2 !rounded-full text-white shadow-sm flex-shrink-0 opacity-80 group-hover:opacity-100">
                   <ChevronRight size={20} className="md:w-[24px] md:h-[24px]" />
                </div>
              </motion.button>
            ))}
          </div>

          {/* Back Button inside wood-board footer */}
          <div className="flex justify-center pt-2">
            <button
              onClick={() => { audio.playClick(); onBack(); }}
              className="game-btn game-btn-red text-base md:text-lg px-8 md:px-12 py-2 flex items-center gap-1"
            >
              <ChevronLeft size={18} className="md:w-[20px] md:h-[20px]" /> Back
            </button>
          </div>
        </motion.div>
        </div>
      </div>
    </div>
  );
}

// ─── Story Reader ──────────────────────────────────────────────────────────────

interface ReaderProps {
  story: Story;
  profile: UserProfile;
  score: number;
  onNext: () => void;
  onBack: () => void;
  onLogout: () => void;
  /** Label for the forward navigation button. Defaults to 'Next'. */
  nextLabel?: string;
  /** When true, hides the Back button entirely (e.g. online student flow). */
  hideBack?: boolean;
}

/**
 * Split story text into flat sentence array with each sentence's char start
 * position in the original string — used to map SpeechSynthesis charIndex
 * to the sentence index for highlighting.
 */
function parseSentences(text: string): Array<{ text: string; charStart: number }> {
  const result: Array<{ text: string; charStart: number }> = [];
  // Split on .  !  ?  followed by whitespace (keep the punctuation in the first part)
  const regex = /[^.!?\n][^.!?\n]*[.!?]+/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const trimmed = match[0].trim();
    if (trimmed) result.push({ text: trimmed, charStart: match.index });
  }
  return result;
}

export function StoryReader({ story, profile, score, onNext, onBack, onLogout, nextLabel = 'Next', hideBack = false }: ReaderProps) {
  const audio = useAudio();
  const [narState, setNarState] = useState<NarrationState>('idle');
  const [activeSentenceIdx, setActiveSentenceIdx] = useState(-1);

  // Pre-compute sentence boundaries for this story
  const sentences = useMemo(() => parseSentences(story.fullStory), [story.fullStory]);

  // Map charIndex (from SpeechSynthesis boundary event) to sentence index
  const handleBoundary = useCallback((charIndex: number) => {
    let found = 0;
    for (let i = 0; i < sentences.length; i++) {
      if (charIndex >= sentences[i].charStart) found = i;
      else break;
    }
    setActiveSentenceIdx(found);
  }, [sentences]);

  // M-3 fix: poll AudioService narration state so external changes (e.g. mute
  // toggle from AudioControls) are reflected in the Play/Pause/Stop button UI.
  useEffect(() => {
    if (narState === 'idle') return;
    const id = setInterval(() => {
      const svcState = audio.getNarrationState();
      if (svcState !== narState) setNarState(svcState);
    }, 500);
    return () => clearInterval(id);
  }, [narState, audio]);

  // Cancel narration when StoryReader unmounts (navigation away)
  const audioRef = useRef(audio);
  useEffect(() => {
    audioRef.current = audio;
  });
  useEffect(() => {
    return () => { audioRef.current.stopNarration(); };
  }, []);

  function handlePlay() {
    setNarState('playing');
    setActiveSentenceIdx(-1);
    void audio.startNarration(
      story.id,
      story.fullStory,
      handleBoundary,
      () => { setNarState('idle'); setActiveSentenceIdx(-1); },
    );
  }

  function handlePause() {
    audio.pauseNarration();
    setNarState('paused');
  }

  function handleResume() {
    audio.resumeNarration();
    setNarState('playing');
  }

  function handleStop() {
    audio.stopNarration();
    setNarState('idle');
    setActiveSentenceIdx(-1);
  }

  // Render story paragraphs with per-sentence highlighting
  const paragraphs = story.fullStory.split('\n\n');

  // Map sentences → paragraph membership for rendering
  const sentencesByPara = useMemo(() => {
    const map: Array<Array<{ text: string; globalIdx: number }>> = paragraphs.map(() => []);
    let globalIdx = 0;
    paragraphs.forEach((para, pIdx) => {
      const paraSentences = parseSentences(para);
      paraSentences.forEach(s => {
        map[pIdx].push({ text: s.text, globalIdx });
        globalIdx++;
      });
    });
    return map;
  }, [paragraphs]);

  const hasParaSentences = sentencesByPara.some(p => p.length > 0);

  return (
    <AnimatePresence>
      <motion.div
        className="bg-landscape min-h-dvh flex flex-col w-full"
        initial={{ opacity: 0, x: 60 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -60 }}
        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
      >
        <UserProfileHeader profile={profile} score={score} onLogout={onLogout} />

        <div className="flex-1 flex items-center justify-center w-full px-4 md:px-8 py-6 my-auto">
          <div className="flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-10 max-w-6xl mx-auto w-full">
            
            {/* Left side: Prominent Mascot Companion standing in scene */}
            <motion.div
              className="shrink-0 flex justify-center items-center"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 180, damping: 20 }}
            >
              <StoryCompanion
                emotion="happy"
                size="hero"
                speech={narState === 'playing' ? 'Listen carefully!' : 'Let\'s read together!'}
              />
            </motion.div>

            {/* Centered Main Story Reader Wood Board */}
            <motion.div 
              className="wood-board flex-1 w-full max-w-5xl p-6 md:p-8 pt-14 md:pt-16 relative flex flex-col justify-between shadow-2xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              {/* Ribbon Header */}
              <div className="absolute -top-5 md:-top-6 left-1/2 -translate-x-1/2 ribbon-blue text-base md:text-2xl z-10 flex items-center gap-2 px-6 md:px-10 max-w-[88vw] md:max-w-[70vw] leading-tight shadow-xl">
                <span className="truncate">{story.title}</span>
              </div>

              {/* Top Instruction Pill & Narration Controls */}
              <div className="flex items-center justify-between gap-2 mb-3 mt-1 flex-wrap px-1">
                <div className="parchment-inner px-3 py-1.5 flex items-center gap-2 text-xs md:text-sm font-fredoka text-[#4a2e12]">
                  <BookOpen size={16} /> Read the story:
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {narState === 'idle' && (
                    <button
                      onClick={handlePlay}
                      aria-label="Play story narration"
                      className="game-btn game-btn-green text-sm md:text-base py-2 px-6 flex items-center gap-2"
                    >
                      <Play fill="currentColor" size={18} /> Play Story
                    </button>
                  )}
                  {narState === 'playing' && (
                    <button
                      onClick={handlePause}
                      aria-label="Pause narration"
                      className="game-btn game-btn-gold text-sm md:text-base py-2 px-6 flex items-center gap-2"
                    >
                      <Pause fill="currentColor" size={18} /> Pause
                    </button>
                  )}
                  {narState === 'paused' && (
                    <>
                      <button
                        onClick={handleResume}
                        aria-label="Resume narration"
                        className="game-btn game-btn-green text-sm md:text-base py-2 px-6 flex items-center gap-2"
                      >
                        <Play fill="currentColor" size={18} /> Resume
                      </button>
                      <button
                        onClick={handlePlay}
                        aria-label="Restart narration from beginning"
                        className="game-btn game-btn-blue text-sm md:text-base py-2 px-4 flex items-center gap-2"
                      >
                        <RotateCcw size={16} /> Restart
                      </button>
                    </>
                  )}
                  {narState !== 'idle' && (
                    <button
                      onClick={handleStop}
                      aria-label="Stop narration"
                      className="game-btn game-btn-red text-sm md:text-base py-2 px-4 flex items-center gap-2"
                    >
                      <Square fill="currentColor" size={14} /> Stop
                    </button>
                  )}
                </div>
              </div>

              {/* Parchment story body */}
              <div className="parchment-inner p-4 md:p-8 mb-4 max-h-[46vh] md:max-h-[52vh] overflow-y-auto mt-1 tv-projector-card">
                {hasParaSentences
                  ? sentencesByPara.map((paraSentences, pIdx) => (
                      <p
                        key={pIdx}
                        className="font-nunito text-[#4a2e12] font-semibold text-base md:text-xl lg:text-2xl leading-relaxed md:leading-loose mb-4 md:mb-6 last:mb-0"
                      >
                        {paraSentences.length > 0
                          ? paraSentences.map((s, sIdx) => (
                              <span
                                key={sIdx}
                                className={`transition-colors duration-200 rounded ${
                                  s.globalIdx === activeSentenceIdx
                                    ? 'bg-yellow-200/80 text-[#2a1a00] font-bold px-1'
                                    : ''
                                }`}
                              >
                                {s.text}{' '}
                              </span>
                            ))
                          : paragraphs[pIdx] /* fallback: plain text if no sentences parsed */
                        }
                      </p>
                    ))
                  : paragraphs.map((para, i) => (
                      <p key={i} className="font-nunito text-[#4a2e12] font-semibold text-base md:text-xl lg:text-2xl leading-relaxed md:leading-loose mb-4 md:mb-6 last:mb-0">
                        {para}
                      </p>
                    ))
                }
              </div>

              {/* Navigation Buttons inside wood board footer */}
              <div className="flex justify-center gap-4 md:gap-6 flex-wrap w-full pt-1">
                {!hideBack && (
                  <motion.button
                    onClick={onBack}
                    className="game-btn game-btn-blue text-lg md:text-xl py-2.5 px-8 md:px-12 flex items-center gap-2"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <ChevronLeft size={20} /> Back
                  </motion.button>
                )}

                <motion.button
                  onClick={onNext}
                  className="game-btn game-btn-red text-lg md:text-xl py-2.5 px-8 md:px-12 flex items-center gap-2"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {nextLabel} <ChevronRight size={20} />
                </motion.button>
              </div>

            </motion.div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
