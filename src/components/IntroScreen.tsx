import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wifi, WifiOff, Map, Play, UserRound, GraduationCap,
  Volume2, VolumeX, BookOpen,
} from 'lucide-react';
import type { GradeLevel, GameMode, OnlineRole } from '../types';
import { useAudio } from '../hooks/useAudio';
import StoryCompanion from './StoryCompanion';

interface Props {
  onStart: (
    name: string,
    grade: GradeLevel | null,
    mode: GameMode,
    role: OnlineRole | null,
    audio: boolean,
  ) => void;
}

export default function IntroScreen({ onStart }: Props) {
  const audio = useAudio();
  const [name, setName] = useState('');
  const [grade, setGrade] = useState<GradeLevel | ''>('');
  const [mode, setMode] = useState<GameMode>('online');
  const [role, setRole] = useState<OnlineRole | null>(null);
  const [passcode, setPasscode] = useState('');
  const [audioOn, setAudioOn] = useState(() => !audio.getSettings().muted);
  const [error, setError] = useState('');

  // Start intro background music once on mount
  useEffect(() => { audio.playMusic('intro'); }, [audio]);

  function handleModeChange(m: GameMode) {
    audio.playClick();
    setMode(m);
    setRole(null);
    setPasscode('');
    setError('');
  }

  function handleStart() {
    audio.playClick();
    if (mode === 'offline') {
      if (!name.trim()) { setError('Please enter your name!'); return; }
      if (!grade) { setError('Please choose a grade!'); return; }
      setError('');
      audio.playAppEntry();
      onStart(name.trim(), grade as GradeLevel, 'offline', null, audioOn);

    } else {
      if (!role) { setError('Please select Teacher or Student.'); return; }

      if (role === 'teacher') {
        if (!name.trim()) { setError('Please enter your name!'); return; }
        const cleanPass = passcode.trim().toUpperCase();
        if (cleanPass !== '1234' && cleanPass !== 'TEACHER') {
          setError('Incorrect Teacher Access Gate Passcode (Default: 1234)');
          return;
        }
        setError('');
        audio.playAppEntry();
        onStart(name.trim(), null, 'online', 'teacher', audioOn);

      } else {
        setError('');
        audio.playAppEntry();
        onStart('', null, 'online', 'student', audioOn);
      }
    }
  }

  // CTA button label
  const ctaLabel =
    mode === 'offline' ? 'Start!' :
      mode === 'online' && role === 'teacher' ? 'Enter Classroom' :
        mode === 'online' && role === 'student' ? 'Join a Session →' :
          'Continue';

  const showNameField = mode === 'offline' || (mode === 'online' && role === 'teacher');
  const showPasscodeField = mode === 'online' && role === 'teacher';
  const showGradeField = mode === 'offline';
  const showStudentMsg = mode === 'online' && role === 'student';
  const showIdentity = mode === 'offline' || (mode === 'online' && role !== null);

  return (
    <div className="bg-landscape w-full min-h-dvh flex flex-col items-center justify-center px-4 py-8 relative">

      {/* Mascot Hero — idle / neutral on intro screen */}
      <motion.div
        className="flex flex-col items-center justify-center mb-2"
        initial={{ y: -40, opacity: 0, scale: 0.8 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 180, damping: 18, delay: 0.05 }}
      >
        <StoryCompanion
          emotion="idle"
          size="hero"
          speech="Ready to begin your quest?"
        />
      </motion.div>

      {/* Title & Logo */}
      <motion.div
        className="text-center mb-4 md:mb-6 flex flex-col items-center justify-center"
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.15 }}
      >
        <img
          src="/logo1.png"
          alt="Story Quest Logo"
          className="w-28 md:w-40 h-auto drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)] hover:scale-105 transition-transform duration-300 select-none"
        />
        <p className="font-nunito text-white font-bold text-base md:text-lg mt-1 text-stroke-primary">
          Master the Sequence!
        </p>
      </motion.div>

      {/* Main Wood Board */}
      <motion.div
        className="wood-board w-11/12 max-w-lg p-6 md:p-8 pt-10 md:pt-10 mt-6 md:mt-8 mb-8 flex flex-col gap-5 md:gap-6"
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 180, damping: 20 }}
      >
        {/* Ribbon Header */}
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 ribbon-blue text-lg md:text-xl px-4 md:px-8 z-10 flex flex-nowrap items-center gap-2 whitespace-nowrap min-w-max">
          <Map size={20} className="md:w-[24px] md:h-[24px] opacity-80" />
          Begin Adventure
        </div>

        {/* ── Mode Toggle ─────────────────────────────────────────────────── */}
        <div className="flex gap-3 md:gap-4 mt-2 md:mt-4">
          <button
            onClick={() => handleModeChange('online')}
            className={`flex-1 game-btn py-3 flex gap-2 md:gap-3 items-center justify-center ${mode === 'online' ? 'game-btn-green' : 'game-btn-gold opacity-60'
              }`}
          >
            <Wifi size={20} className="md:w-[24px] md:h-[24px]" />
            <div className="text-left leading-tight">
              <span className="block text-sm md:text-base">Online</span>
              <span className="block text-[10px] md:text-xs font-nunito opacity-90">Teacher-Guided</span>
            </div>
          </button>

          <button
            onClick={() => handleModeChange('offline')}
            className={`flex-1 game-btn py-3 flex gap-2 md:gap-3 items-center justify-center ${mode === 'offline' ? 'game-btn-red' : 'game-btn-gold opacity-60'
              }`}
          >
            <WifiOff size={20} className="md:w-[24px] md:h-[24px]" />
            <div className="text-left leading-tight">
              <span className="block text-sm md:text-base">Offline</span>
              <span className="block text-[10px] md:text-xs font-nunito opacity-90">Self-Paced</span>
            </div>
          </button>
        </div>

        {/* ── Online Role Picker ───────────────────────────────────────────── */}
        <AnimatePresence>
          {mode === 'online' && (
            <motion.div
              key="role-picker"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <p className="font-fredoka text-white text-sm text-center mb-2 text-stroke-primary">
                Who are you?
              </p>
              <div className="flex gap-3">
                <button
                  aria-pressed={role === 'teacher'}
                  onClick={() => { audio.playClick(); setRole('teacher'); setPasscode(''); }}
                  className={`flex-1 py-3 font-fredoka text-sm rounded-xl border-[3px] transition-all flex flex-col items-center gap-1 ${role === 'teacher'
                    ? 'bg-[#1a3a6e] text-white border-[#2563a8] shadow-inner'
                    : 'bg-[#ffeebd] text-[#4a2e12] border-[#b57b37] hover:bg-[#ffdf91]'
                    }`}
                >
                  <GraduationCap size={22} />
                  Teacher
                </button>
                <button
                  aria-pressed={role === 'student'}
                  onClick={() => { audio.playClick(); setRole('student'); setPasscode(''); }}
                  className={`flex-1 py-3 font-fredoka text-sm rounded-xl border-[3px] transition-all flex flex-col items-center gap-1 ${role === 'student'
                    ? 'bg-[#1a6e3a] text-white border-[#25a863] shadow-inner'
                    : 'bg-[#ffeebd] text-[#4a2e12] border-[#b57b37] hover:bg-[#ffdf91]'
                    }`}
                >
                  <BookOpen size={22} />
                  Student
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Identity (parchment) ─────────────────────────────────────────── */}
        <AnimatePresence>
          {showIdentity && (
            <motion.div
              key="identity"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {showStudentMsg ? (
                // Online Student — no name/grade needed here
                <div className="parchment-inner p-5 text-center">
                  <p className="font-fredoka text-[#4a2e12] text-base">Ready to join?</p>
                  <p className="font-nunito text-[#8c5825] text-sm mt-1">
                    You'll enter your name and session code on the next screen.
                  </p>
                </div>
              ) : (
                <div className="parchment-inner p-5 md:p-6 flex flex-col gap-4 md:gap-5">
                  {/* Name field */}
                  {showNameField && (
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="student-name" className="font-fredoka text-[#4a2e12] flex items-center gap-2 text-sm md:text-base">
                        <UserRound size={16} className="md:w-[20px] md:h-[20px]" /> Your Name
                      </label>
                      <input
                        id="student-name"
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleStart(); }}
                        placeholder={mode === 'online' ? 'e.g. Ms. Santos' : 'e.g. Maria'}
                        className="w-full px-4 md:px-5 py-2 md:py-2.5 rounded-lg md:rounded-xl bg-white/90 border-[3px] border-[#8c5825] font-nunito font-bold text-sm md:text-base text-[#4a2e12] focus:outline-none focus:border-[#4a2e12] focus:bg-white shadow-inner transition-colors"
                      />
                    </div>
                  )}

                  {/* Teacher Passcode field — Teacher Access Gate */}
                  {showPasscodeField && (
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="teacher-passcode" className="font-fredoka text-[#4a2e12] flex items-center gap-2 text-sm md:text-base">
                        🔒 Teacher Access Gate Passcode
                      </label>
                      <input
                        id="teacher-passcode"
                        type="password"
                        value={passcode}
                        onChange={e => setPasscode(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleStart(); }}
                        placeholder="Enter Passcode (Default: 1234)"
                        className="w-full px-4 md:px-5 py-2 md:py-2.5 rounded-lg md:rounded-xl bg-white/90 border-[3px] border-[#8c5825] font-nunito font-bold text-sm md:text-base text-[#4a2e12] focus:outline-none focus:border-[#4a2e12] focus:bg-white shadow-inner transition-colors"
                      />
                      <p className="font-nunito text-[#8c5825] text-xs">
                        Default access passcode for demo: <strong className="text-[#4a2e12]">1234</strong>
                      </p>
                    </div>
                  )}

                  {/* Grade field — offline only */}
                  {showGradeField && (
                    <div className="flex flex-col gap-2">
                      <label className="font-fredoka text-[#4a2e12] flex items-center gap-2 text-sm md:text-base">
                        <GraduationCap size={16} className="md:w-[20px] md:h-[20px]" /> Grade Level
                      </label>
                      <div className="flex gap-2 md:gap-3">
                        {(['Grade 5', 'Grade 6'] as GradeLevel[]).map(g => (
                          <button
                            key={g}
                            aria-pressed={grade === g}
                            onClick={() => { audio.playClick(); setGrade(g); }}
                            className={`flex-1 py-2 md:py-3 text-xs md:text-sm font-fredoka rounded-lg md:rounded-xl border-[3px] transition-all ${grade === g
                              ? 'bg-[#8c5825] text-white border-[#4a2e12] shadow-inner font-bold'
                              : 'bg-[#ffeebd] text-[#8c5825] border-[#b57b37] hover:bg-[#ffdf91]'
                              }`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Audio Toggle ─────────────────────────────────────────────────── */}
        <div className="flex justify-center -mt-1">
          <button
            onClick={() => {
              const next = !audioOn;
              setAudioOn(next);
              audio.setMuted(!next);
            }}
            className="game-btn game-btn-blue py-2 px-6 text-sm md:text-base flex items-center gap-2"
          >
            {audioOn
              ? <Volume2 size={18} className="md:w-[20px] md:h-[20px]" />
              : <VolumeX size={18} className="md:w-[20px] md:h-[20px]" />}
            <span>Audio {audioOn ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {/* ── Error ────────────────────────────────────────────────────────── */}
        {error && (
          <p className="text-red-600 bg-red-100 border-2 border-red-300 rounded-lg px-4 py-2 font-nunito font-bold text-sm text-center -mt-2 shadow-sm">
            {error}
          </p>
        )}

        {/* ── CTA Button ───────────────────────────────────────────────────── */}
        <motion.div className="flex justify-center w-full" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <button
            onClick={handleStart}
            onMouseEnter={() => audio.playHover()}
            className="game-btn game-btn-gold text-xl md:text-2xl py-3 md:py-4 px-10 w-full shadow-2xl flex items-center justify-center gap-2"
          >
            <Play fill="currentColor" size={20} className="md:w-[28px] md:h-[28px]" />
            {ctaLabel}
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
