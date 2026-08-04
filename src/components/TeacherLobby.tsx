import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, CheckCircle, Rocket } from 'lucide-react';
import { stories, categoryMeta } from '../data/stories';
import { sessionService } from '../services/classroomSession';
import type { Category, ClassroomSession, GradeLevel, Story, UserProfile } from '../types';
import UserProfileHeader from './UserProfileHeader';

interface Props {
  profile:          UserProfile;
  onSessionCreated: (session: ClassroomSession) => void;
  onBack:           () => void;
  onLogout:         () => void;
}

const BASE_CATEGORIES: Category[] = ['Fable', 'Myth', 'Realistic Fiction', 'Legend'];

const stepVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

export default function TeacherLobby({ profile, onSessionCreated, onBack, onLogout }: Props) {
  const [grade,         setGrade]         = useState<GradeLevel | null>(null);
  const [category,      setCategory]      = useState<Category | null>(null);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [creating,      setCreating]      = useState(false);
  const [error,         setError]         = useState('');

  // Cascade: changing grade resets category and story
  function handleGrade(g: GradeLevel) {
    setGrade(g);
    setCategory(null);
    setSelectedStory(null);
    setError('');
  }

  // Cascade: changing category resets story
  function handleCategory(cat: Category) {
    setCategory(cat);
    setSelectedStory(null);
  }

  // Categories available for the selected grade
  const categories = useMemo<Category[]>(
    () => grade ? [...BASE_CATEGORIES, grade as Category] : BASE_CATEGORIES,
    [grade],
  );

  // Stories filtered by the selected category
  const filteredStories = useMemo(
    () => (category ? stories.filter(s => s.category === category) : []),
    [category],
  );

  async function handleCreate() {
    if (!grade || !category || !selectedStory) return;
    setCreating(true);
    setError('');
    try {
      const session = await sessionService.createSession({
        teacherName: profile.name,
        grade,
        category,
        storyId: selectedStory.id,
      });
      onSessionCreated(session);
    } catch {
      setError('Failed to create session. Please try again.');
      setCreating(false);
    }
  }

  const canCreate = grade !== null && category !== null && selectedStory !== null && !creating;

  return (
    <div className="bg-landscape min-h-dvh flex flex-col">
      <UserProfileHeader profile={profile} score={0} onLogout={onLogout} />

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 overflow-y-auto">
        <motion.div
          className="wood-board relative w-11/12 md:w-full max-w-2xl pt-14 pb-8 px-6 md:px-10"
          initial={{ scale: 0.88, opacity: 0 }}
          animate={{ scale: 1,    opacity: 1 }}
          transition={{ type: 'spring', stiffness: 180, damping: 22 }}
        >
          {/* Ribbon */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 ribbon-blue text-lg px-8 z-10 flex items-center gap-2 whitespace-nowrap">
            <BookOpen size={20} className="opacity-80" />
            Classroom Setup
          </div>

          <div className="parchment-inner p-5 md:p-6 flex flex-col gap-5">

            {/* ── Step 1: Grade ────────────────────────────────────────────── */}
            <div>
              <StepLabel n={1} label="Select Grade Level" />
              <div className="flex gap-3 mt-2">
                {(['Grade 5', 'Grade 6'] as GradeLevel[]).map(g => (
                  <button
                    key={g}
                    aria-pressed={grade === g}
                    onClick={() => handleGrade(g)}
                    className={`flex-1 py-2.5 font-fredoka text-sm rounded-xl border-[3px] transition-all ${
                      grade === g
                        ? 'bg-[#8c5825] text-white border-[#4a2e12] shadow-inner'
                        : 'bg-[#ffeebd] text-[#8c5825] border-[#b57b37] hover:bg-[#ffdf91]'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Step 2: Category ─────────────────────────────────────────── */}
            <AnimatePresence>
              {grade && (
                <motion.div key="cat" {...stepVariants}>
                  <StepLabel n={2} label="Select Category" />
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {categories.map(cat => {
                      const meta = categoryMeta[cat];
                      return (
                        <button
                          key={cat}
                          aria-pressed={category === cat}
                          onClick={() => handleCategory(cat)}
                          className={`py-2 px-2 text-xs font-fredoka rounded-xl border-[3px] transition-all truncate ${
                            category === cat
                              ? 'bg-[#8c5825] text-white border-[#4a2e12] shadow-inner'
                              : 'bg-[#ffeebd] text-[#8c5825] border-[#b57b37] hover:bg-[#ffdf91]'
                          }`}
                          title={meta?.desc}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Step 3: Story ────────────────────────────────────────────── */}
            <AnimatePresence>
              {category && (
                <motion.div key="story" {...stepVariants}>
                  <div className="flex items-center justify-between">
                    <StepLabel n={3} label="Select Story" />
                    <span className="font-nunito text-xs text-[#8c5825] font-bold">
                      {filteredStories.length} available
                    </span>
                  </div>

                  {filteredStories.length === 0 ? (
                    <p className="text-center font-nunito text-[#8c5825] text-sm py-4 mt-2">
                      No stories available for this selection.
                    </p>
                  ) : (
                    <div className="mt-2 max-h-52 overflow-y-auto rounded-xl border-[3px] border-[#b57b37] bg-white/60 divide-y divide-[#b57b37]/30">
                      {filteredStories.map(s => (
                        <button
                          key={s.id}
                          onClick={() => setSelectedStory(s)}
                          className={`w-full text-left px-3 py-2.5 font-nunito text-sm transition-colors flex items-center gap-2 ${
                            selectedStory?.id === s.id
                              ? 'bg-[#8c5825] text-white font-bold'
                              : 'text-[#4a2e12] hover:bg-[#ffeebd]'
                          }`}
                        >
                          {selectedStory?.id === s.id && (
                            <CheckCircle size={14} className="shrink-0" />
                          )}
                          <span className="line-clamp-1">{s.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Error */}
          {error && (
            <p className="mt-3 text-red-600 bg-red-100 border-2 border-red-300 rounded-lg px-3 py-2 font-nunito font-bold text-sm text-center">
              {error}
            </p>
          )}

          {/* Create Session button */}
          <motion.button
            onClick={handleCreate}
            disabled={!canCreate}
            className={`mt-5 game-btn w-full py-3 text-lg flex items-center justify-center gap-2 ${
              canCreate ? 'game-btn-gold shadow-2xl' : 'game-btn-gold opacity-40 cursor-not-allowed'
            }`}
            whileHover={canCreate ? { scale: 1.02 } : {}}
            whileTap={canCreate ? { scale: 0.97 } : {}}
          >
            <Rocket size={20} />
            {creating ? 'Creating Session…' : 'Create Session'}
          </motion.button>

          {/* Back link */}
          <button
            onClick={onBack}
            className="mt-3 w-full text-center font-nunito text-white/60 text-sm hover:text-white/90 transition-colors"
          >
            ← Back to Login
          </button>
        </motion.div>
      </div>
    </div>
  );
}

// ─── Internal: numbered step label ───────────────────────────────────────────

function StepLabel({ n, label }: { n: number; label: string }) {
  return (
    <p className="font-fredoka text-[#4a2e12] text-sm md:text-base flex items-center gap-2">
      <span className="bg-[#8c5825] text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0">
        {n}
      </span>
      {label}
    </p>
  );
}
