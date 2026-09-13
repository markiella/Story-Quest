import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Undo2 } from 'lucide-react';
import type { Story, UserProfile } from '../types';
import UserProfileHeader from './UserProfileHeader';
import { useAudio } from '../hooks/useAudio';
import StoryCompanion from './StoryCompanion';

interface Props {
  story:    Story;
  profile:  UserProfile;
  score:    number;
  onComplete:      (earnedPoints: number, placedSlots: (string | null)[]) => void;
  onBack:          () => void;
  onLogout?:       () => void;
  /** Restore shuffled order from a saved session */
  initialShuffledIds?: string[];
  /** Restore partially-placed slots from a saved session */
  initialSlots?:       (string | null)[];
  /** Called whenever slot state changes so the parent can persist progress */
  onProgressChange?:   (shuffledIds: string[], slots: (string | null)[]) => void;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const colorClasses = [
  'game-btn-green',
  'game-btn-red',
  'game-btn-blue',
  'game-btn-gold',
];

// Maximum number of events shown per game — keeps it manageable for Grade 5–6 students
const MAX_EVENTS = 8;

export default function EventSequencer({
  story, profile, score,
  onComplete, onBack, onLogout,
  initialShuffledIds, initialSlots, onProgressChange,
}: Props) {
  const audio = useAudio();

  useEffect(() => { audio.playMusic('sequencer'); }, [audio]);

  // Cap to MAX_EVENTS: take the first N steps (already sorted by sequence from the adapter)
  const gameEvents   = story.events.slice(0, MAX_EVENTS);
  const correctOrder = story.correctOrder.slice(0, MAX_EVENTS);

  const [shuffledEvents] = useState(() => {
    // Restore saved shuffle order if provided and lengths match
    if (initialShuffledIds && initialShuffledIds.length === gameEvents.length) {
      const restored = initialShuffledIds
        .map(id => gameEvents.find(e => e.id === id))
        .filter((e): e is typeof gameEvents[0] => e !== undefined);
      if (restored.length === gameEvents.length) {
        return restored.map((e, i) => ({ ...e, color: colorClasses[i % colorClasses.length] }));
      }
    }
    return shuffle(gameEvents).map((e, i) => ({ ...e, color: colorClasses[i % colorClasses.length] }));
  });

  const [slots, setSlots] = useState<(string | null)[]>(
    initialSlots && initialSlots.length === gameEvents.length
      ? initialSlots
      : Array(gameEvents.length).fill(null),
  );
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  /** Ref holding the auto-advance timeout — cleared on unmount to prevent stale callbacks */
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** O(1) lookup for placed event IDs — recalculated only when slots change */
  const placedSet  = useMemo(() => new Set(slots.filter(Boolean) as string[]), [slots]);
  const isPlaced   = (id: string) => placedSet.has(id);
  const allFilled  = slots.every(s => s !== null);

  /** Update slots state and notify parent so progress can be persisted */
  function updateSlots(newSlots: (string | null)[]) {
    setSlots(newSlots);
    onProgressChange?.(shuffledEvents.map(e => e.id), newSlots);
  }

  function handleCardClick(id: string) {
    if (submitted || isPlaced(id)) return;
    audio.playCardPickup();
    setSelectedCardId(prev => (prev === id ? null : id));
  }

  function handleSlotClick(slotIndex: number) {
    if (submitted || !selectedCardId || slots[slotIndex] !== null) return;
    audio.playCardDrop();
    const newSlots = [...slots];
    newSlots[slotIndex] = selectedCardId;
    setSelectedCardId(null);
    updateSlots(newSlots);
  }

  function handleSlotRemove(slotIndex: number) {
    if (submitted) return;
    audio.playCardPickup();
    const newSlots = [...slots];
    newSlots[slotIndex] = null;
    updateSlots(newSlots);
  }

  function handleReset() {
    audio.playReset();
    const empty = Array(gameEvents.length).fill(null) as (string | null)[];
    updateSlots(empty);
    setSelectedCardId(null);
    setSubmitted(false);
    setFeedback(null);
  }

  function handleSubmit() {
    if (!allFilled) return;
    let correct = 0;
    slots.forEach((id, i) => { if (id === correctOrder[i]) correct++; });
    const base = Math.round((correct / gameEvents.length) * 100);
    if (base >= 50) audio.playSuccess();
    else            audio.playError();
    setFeedback(base >= 50 ? 'correct' : 'wrong');
    setSubmitted(true);
    timeoutRef.current = setTimeout(() => onComplete(base, slots), 1700);
  }

  // Clear the auto-advance timeout if the student navigates away before it fires
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    };
  }, []);

  const getEventData = (id: string) => shuffledEvents.find(e => e.id === id);

  return (
    <div className="bg-landscape min-h-dvh flex flex-col pb-10 w-full relative">
      <UserProfileHeader profile={profile} score={score} onLogout={onLogout} />

      <div className="flex-1 flex items-center justify-center w-full px-4 md:px-8 py-6 my-auto">
        <div className="flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-10 max-w-6xl mx-auto w-full">
          {/* Left side: Prominent Mascot Companion in Thinking pose */}
          <motion.div
            className="shrink-0 flex justify-center items-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 180, damping: 20 }}
          >
            <StoryCompanion
              emotion="thinking"
              size="hero"
              speech="Think about the correct sequence..."
            />
          </motion.div>

          {/* Centered Main Sequencer Wood Board */}
          <motion.div 
            className="wood-board flex-1 w-full max-w-5xl p-6 md:p-8 pt-14 md:pt-16 flex flex-col h-fit relative z-10 shadow-2xl"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
          {/* Ribbon Header */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 ribbon-blue text-sm md:text-xl z-20 px-6 md:px-10 whitespace-nowrap shadow-lg">
            Arrange the Events in Order
          </div>

          {/* Slots & Selection Area */}
          <div className="flex flex-col md:flex-row gap-4 md:gap-6 mt-4 md:mt-2 flex-1">
            
            {/* Event Bank (Left Side inside Board) */}
            <div className="flex-1 parchment-inner p-3 md:p-4">
              <div className="border-b-2 border-[#8c5825]/30 pb-2 mb-2 md:mb-3 text-center">
                <h3 className="font-fredoka text-[#4a2e12] text-sm md:text-lg">
                  Event Bank
                </h3>
              </div>
              <div className="flex flex-col gap-2 md:gap-3">
                {shuffledEvents.map((ev, idx) => {
                  const placed = isPlaced(ev.id);
                  const selected = selectedCardId === ev.id;
                  
                  return (
                    <motion.button
                      key={ev.id}
                      onClick={() => handleCardClick(ev.id)}
                      disabled={placed}
                      className={`seq-block text-left relative ${ev.color} !p-2.5 md:!p-4 tv-projector-card
                        ${placed ? 'opacity-30 grayscale' : 'hover:scale-[1.02] active:scale-[0.98] cursor-pointer'}
                        ${selected ? 'ring-4 ring-yellow-400 ring-offset-2' : ''}`}
                      whileTap={!placed ? { scale: 0.95 } : {}}
                    >
                      <div className="font-fredoka text-xs md:text-sm mb-0.5 md:mb-1 opacity-90">Event {String.fromCharCode(65 + idx)}</div>
                      <div className="font-nunito text-xs md:text-base lg:text-lg font-bold leading-snug line-clamp-2 md:line-clamp-3 shadow-sm">
                        {ev.text}
                      </div>
                      
                      {placed && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 rounded-lg backdrop-blur-[1px]">
                          <Check size={24} className="md:w-[32px] md:h-[32px] text-white drop-shadow-md" />
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Sequence Slots (Right Side) */}
            <div className="flex-1 flex flex-col justify-center gap-3 md:gap-4">
              {slots.map((slotId, i) => {
                const isTarget = !!selectedCardId && !slotId;
                const placedData = slotId ? getEventData(slotId) : null;
                
                return (
                  <div key={i} className="flex items-center gap-2 md:gap-3">
                    {/* Rank Number */}
                    <div className="w-8 h-8 md:w-12 md:h-12 flex-shrink-0 bg-[#ffeebd] border-[3px] md:border-4 border-[#8c5825] rounded-md md:rounded-lg flex items-center justify-center font-fredoka text-base md:text-2xl text-[#4a2e12] shadow-sm">
                      {i + 1}
                    </div>
                    
                    {/* Slot Drop Zone */}
                    <div 
                      onClick={() => slotId ? handleSlotRemove(i) : handleSlotClick(i)}
                      className={`flex-1 min-h-14 md:min-h-20 rounded-md md:rounded-lg border-[3px] md:border-4 transition-all flex items-center px-2 md:px-4 cursor-pointer gap-2 overflow-hidden
                        ${isTarget ? 'border-[#429ef5] bg-[#429ef5]/20 slot-active' : ''}
                        ${!slotId && !isTarget ? 'border-dashed border-[#8c5825]/50 bg-black/10' : ''}
                        ${slotId ? `border-transparent ${placedData?.color} shadow-lg hover:brightness-110 active:scale-95` : ''}`}
                    >
                      {placedData ? (
                        <>
                          <p className="font-nunito text-white font-bold leading-snug line-clamp-2 flex-1 text-xs md:text-base lg:text-lg">
                            {placedData.text}
                          </p>
                          <X size={16} className="flex-shrink-0 text-white/70 md:w-[20px] md:h-[20px]" />
                        </>
                      ) : (
                        <span className="font-nunito text-[#4a2e12]/70 font-bold w-full text-center text-xs md:text-base lg:text-lg">
                          {isTarget ? 'Tap to place!' : 'Empty Slot'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-3 mt-5 md:mt-8 bg-black/20 p-3 md:p-4 rounded-xl">
            <button 
              onClick={() => { audio.playClick(); onBack(); }} 
              className="game-btn game-btn-blue py-2 px-8 flex justify-center items-center text-sm md:text-base gap-1"
            >
              <Undo2 size={18} className="md:w-[20px] md:h-[20px]" /> Back
            </button>
            <button 
              onClick={handleReset} 
              className="game-btn game-btn-red py-2 px-8 flex justify-center items-center text-sm md:text-base gap-1"
            >
              <Undo2 size={18} className="md:w-[20px] md:h-[20px]" /> Reset
            </button>
            <motion.button
              onClick={handleSubmit}
              disabled={!allFilled || submitted}
              className={`game-btn game-btn-green py-2 px-10 text-base md:text-xl flex justify-center items-center gap-1
                ${(!allFilled || submitted) ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
              whileHover={allFilled && !submitted ? { scale: 1.05 } : {}}
              whileTap={allFilled && !submitted ? { scale: 0.95 } : {}}
            >
              <Check size={20} className="md:w-[24px] md:h-[24px]" /> Submit
            </motion.button>
          </div>

          {/* Feedback Banner Overlay */}
          <AnimatePresence>
            {submitted && feedback && (
              <motion.div
                className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-xl overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className="ribbon-blue !text-3xl px-12 py-6"
                  initial={{ scale: 0.5, y: 50 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  style={{
                    background: feedback === 'correct'
                      ? 'linear-gradient(180deg, #82e022 0%, #2d9313 100%)'
                      : 'linear-gradient(180deg, #ff5e4d 0%, #b31505 100%)',
                  }}
                >
                  {feedback === 'correct' ? '🎉 Brilliant!' : '😅 Nice try!'}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          
        </motion.div>
        </div>
      </div>
    </div>
  );
}
