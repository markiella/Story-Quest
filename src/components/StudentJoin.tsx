import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { UserRound, KeyRound, ArrowRight } from 'lucide-react';
import { stories } from '../data/stories';
import { sessionService } from '../services/classroomSession';
import type { ClassroomSession, Story } from '../types';

interface Props {
  onReady: (
    session:     ClassroomSession,
    studentId:   string,
    studentName: string,
    story:       Story,
  ) => void;
  onBack: () => void;
}

type JoinStep = 'form' | 'loading';

export default function StudentJoin({ onReady, onBack }: Props) {
  const [step,     setStep]     = useState<JoinStep>('form');
  const [name,     setName]     = useState('');
  const [code,     setCode]     = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  /**
   * Cancellation flag — prevents the async joinSession() callback from
   * calling onReady() or setStep() after the component unmounts.
   *
   * IMPORTANT: re-assign to true inside the effect body (not just in the
   * initialiser). React Strict Mode runs effects twice in development:
   *   1. mount  → effect runs  → mountedRef.current = true  ✓
   *   2. cleanup fires          → mountedRef.current = false ✗
   *   3. remount → effect runs  → mountedRef.current = true  ✓  ← this line fixes it
   * Without the re-assignment, step 2 permanently disables the flag and every
   * handleJoin() call returns early, leaving the spinner stuck forever.
   */
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true; // re-assert on every effect run (Strict Mode safe)
    return () => { mountedRef.current = false; };
  }, []);

  async function handleJoin() {
    const trimName = name.trim();
    const trimCode = code.trim().toUpperCase();

    // Client-side validation before calling the service
    if (!trimName)             { setErrorMsg('Please enter your name.');                  return; }
    if (trimCode.length !== 6) { setErrorMsg('Session code must be exactly 6 characters.'); return; }

    setStep('loading');
    setErrorMsg('');

    try {
      const result = await sessionService.joinSession(trimCode, trimName);

      if (!mountedRef.current) return; // user navigated away during the call

      if (!result.success || !result.session || !result.studentId) {
        setErrorMsg(result.error ?? 'Unable to join. Please check the code and try again.');
        setStep('form');
        return;
      }

      // Resolve the story from the local stories array
      const story = stories.find(s => s.id === result.session!.storyId);
      if (!story) {
        setErrorMsg('Story not found. Ask your teacher to create a new session.');
        setStep('form');
        return;
      }

      onReady(result.session, result.studentId, trimName, story);

    } catch {
      if (!mountedRef.current) return;
      setErrorMsg('Something went wrong. Please try again.');
      setStep('form');
    }
  }

  return (
    <div className="bg-landscape min-h-dvh flex flex-col items-center justify-center px-4 py-8">

      {/* Title */}
      <motion.div
        className="text-center mb-8"
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18 }}
      >
        <h1 className="font-fredoka text-5xl md:text-6xl text-stroke-gold drop-shadow-2xl">
          Story Quest
        </h1>
        <p className="font-nunito text-white font-bold text-lg mt-1 text-stroke-primary">
          Join Your Classroom
        </p>
      </motion.div>

      {/* Main Wood Board */}
      <motion.div
        className="wood-board relative w-11/12 max-w-md pt-12 pb-8 px-6 md:px-8 flex flex-col gap-5"
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1,    opacity: 1 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 180, damping: 20 }}
      >
        {/* Ribbon */}
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 ribbon-blue text-lg px-8 z-10 flex items-center gap-2 whitespace-nowrap">
          <KeyRound size={20} className="opacity-80" />
          Join Session
        </div>

        {/* ── Loading state ────────────────────────────────────────────────── */}
        {step === 'loading' && (
          <div className="parchment-inner p-8 flex flex-col items-center gap-4 text-center">
            <motion.div
              className="w-14 h-14 rounded-full border-4 border-[#8c5825] border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
              aria-label="Loading"
              role="status"
            />
            <p className="font-fredoka text-[#4a2e12] text-xl">Loading your story…</p>
            <p className="font-nunito text-[#8c5825] text-sm">Getting ready for class</p>
          </div>
        )}

        {/* ── Form state ───────────────────────────────────────────────────── */}
        {step === 'form' && (
          <div className="parchment-inner p-5 md:p-6 flex flex-col gap-4">

            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="join-name" className="font-fredoka text-[#4a2e12] flex items-center gap-2 text-sm">
                <UserRound size={15} /> Your Name
              </label>
              <input
                id="join-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleJoin(); }}
                placeholder="e.g. Maria"
                className="w-full px-4 py-2.5 rounded-xl bg-white/90 border-[3px] border-[#8c5825] font-nunito font-bold text-sm text-[#4a2e12] focus:outline-none focus:border-[#4a2e12] focus:bg-white shadow-inner transition-colors"
                autoComplete="off"
              />
            </div>

            {/* Session Code */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="join-code" className="font-fredoka text-[#4a2e12] flex items-center gap-2 text-sm">
                <KeyRound size={15} /> Session Code
              </label>
              <input
                id="join-code"
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase().slice(0, 6))}
                onKeyDown={e => { if (e.key === 'Enter') handleJoin(); }}
                placeholder="e.g. ABX913"
                maxLength={6}
                className="w-full px-4 py-3 rounded-xl bg-white/90 border-[3px] border-[#8c5825] font-fredoka text-3xl tracking-[0.3em] text-center text-[#4a2e12] focus:outline-none focus:border-[#4a2e12] focus:bg-white shadow-inner transition-colors uppercase"
                autoComplete="off"
                spellCheck={false}
              />
              <p className="text-center font-nunito text-[#8c5825] text-xs">
                Ask your teacher for the 6-character code
              </p>
            </div>

            {/* Error */}
            {errorMsg && (
              <p className="text-red-600 bg-red-100 border-2 border-red-300 rounded-lg px-3 py-2 font-nunito font-bold text-sm text-center">
                {errorMsg}
              </p>
            )}
          </div>
        )}

        {/* ── Buttons (hidden during loading) ─────────────────────────────── */}
        {step === 'form' && (
          <div className="flex flex-col gap-3">
            <motion.button
              onClick={handleJoin}
              className="game-btn game-btn-green py-3 text-lg flex items-center justify-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              Join Session <ArrowRight size={20} />
            </motion.button>

            <button
              onClick={onBack}
              className="game-btn game-btn-gold py-2 text-sm opacity-80"
            >
              ← Back
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
