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
  const [rosterNames,   setRosterNames]   = useState<string>('Maria Santos\nJuan Dela Cruz\nSofia Cruz\nPedro Penduko\nAnika Dela Paz');
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
    () => {
      if (!category) return [];
      return stories.filter(s => s.category === category);
    },
    [category],
  );

  // Parse student roster names and generate access codes
  const parsedRoster = useMemo(() => {
    const raw = rosterNames
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    return raw.map((name, i) => {
      const clean = name.replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase() || 'STU';
      const code = `${grade ? grade.replace(' ', '') : 'SQ'}-${clean}-${1000 + ((i * 73 + 19) % 9000)}`;
      return { name, studentCode: code };
    });
  }, [rosterNames, grade]);

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
        roster: parsedRoster,
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
              <div className="flex gap-2 md:gap-3 mt-2">
                {(['Grade 5', 'Grade 6'] as GradeLevel[]).map(g => (
                  <button
                    key={g}
                    aria-pressed={grade === g}
                    onClick={() => handleGrade(g)}
                    className={`flex-1 py-2.5 font-fredoka text-xs md:text-sm rounded-xl border-[3px] transition-all ${
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
                    <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border-[3px] border-[#b57b37] bg-white/60 divide-y divide-[#b57b37]/30">
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

            {/* ── Step 4: Student Roster & Access Codes ─────────────────────── */}
            <AnimatePresence>
              {selectedStory && (
                <motion.div key="roster" {...stepVariants}>
                  <div className="flex items-center justify-between">
                    <StepLabel n={4} label="Student Access Codes Setup" />
                    <span className="font-nunito text-xs text-[#8c5825] font-bold">
                      {parsedRoster.length} Students
                    </span>
                  </div>
                  <p className="font-nunito text-xs text-[#8c5825] mt-1">
                    Enter student names (one per line). Unique access codes are pre-generated below for your private distribution:
                  </p>
                  <textarea
                    rows={3}
                    value={rosterNames}
                    onChange={e => setRosterNames(e.target.value)}
                    placeholder="Enter student names (one per line)..."
                    className="w-full mt-2 p-2.5 rounded-lg bg-white/90 border-[2px] border-[#b57b37] font-nunito text-xs font-bold text-[#4a2e12] focus:outline-none"
                  />
                  
                  {/* Generated access codes preview */}
                  <div className="mt-2 p-2.5 rounded-lg bg-white/80 border-[2px] border-[#b57b37] max-h-32 overflow-y-auto">
                    <p className="font-fredoka text-xs text-[#4a2e12] mb-1">Generated Private Access Codes:</p>
                    <div className="divide-y divide-black/10">
                      {parsedRoster.map((r, idx) => (
                        <div key={idx} className="flex justify-between items-center py-1 text-xs font-nunito">
                          <span className="font-bold text-[#4a2e12]">{r.name}</span>
                          <span className="font-mono font-bold text-[#1a3a6e] bg-blue-100 px-2 py-0.5 rounded border border-blue-300">
                            {r.studentCode}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Deployment Guidance Note */}
                  <div className="mt-3 p-3 rounded-lg bg-amber-50/90 border border-amber-300 font-nunito text-xs text-[#8c5825] leading-relaxed">
                    <strong>💡 Classroom Deployment Note:</strong> Supervised classroom deployment using school-managed or Department of Education provided devices is recommended for authorized learner sessions.
                  </div>
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
