import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X, Volume2, VolumeX, Music, Mic } from 'lucide-react';
import { useAudio } from '../hooks/useAudio';
import type { AudioSettings } from '../hooks/useAudio';

const SPEED_OPTIONS: { label: string; value: number }[] = [
  { label: '0.75×', value: 0.75 },
  { label: '1×',    value: 1.0  },
  { label: '1.25×', value: 1.25 },
  { label: '1.5×',  value: 1.5  },
];

/** Floating audio settings panel — fixed bottom-right, layered above all screens. */
export default function AudioControls() {
  const audio = useAudio();

  const [open, setOpen]         = useState(false);
  const [settings, setSettings] = useState<AudioSettings>(() => audio.getSettings());

  // L-2 fix: re-sync settings when the panel is opened in case an external
  // call (e.g. IntroScreen's mute toggle) changed the service state.
  useEffect(() => {
    if (open) setSettings(audio.getSettings());
  }, [open, audio]);

  function update<K extends keyof AudioSettings>(key: K, value: AudioSettings[K]) {
    setSettings(prev => ({ ...prev, [key]: value }));
  }

  function handleMasterVolume(v: number) {
    audio.setMasterVolume(v);
    update('masterVolume', v);
  }
  function handleMusicVolume(v: number) {
    audio.setMusicVolume(v);
    update('musicVolume', v);
  }
  function handleEffectsVolume(v: number) {
    audio.setEffectsVolume(v);
    update('effectsVolume', v);
  }
  function handleNarrationVolume(v: number) {
    audio.setNarrationVolume(v);
    update('narrationVolume', v);
  }
  function handleRate(r: number) {
    audio.setNarrationRate(r);
    update('narrationRate', r);
  }
  function handleToggleMute() {
    audio.toggleMute();
    const next = !settings.muted;
    update('muted', next);
  }
  function handleToggleOpen() {
    audio.playClick();
    setOpen(o => !o);
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">

      {/* Settings panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="audio-panel"
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{   opacity: 0, scale: 0.85, y: 20  }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="wood-board w-72 p-5 pt-8 flex flex-col gap-4 shadow-2xl"
            role="dialog"
            aria-label="Audio Settings"
          >
            {/* Ribbon */}
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 ribbon-blue text-sm px-6 whitespace-nowrap flex items-center gap-2">
              <Settings size={14} /> Audio Settings
            </div>

            {/* Mute toggle */}
            <button
              onClick={handleToggleMute}
              aria-pressed={settings.muted}
              aria-label={settings.muted ? 'Unmute all audio' : 'Mute all audio'}
              className={`game-btn py-2 text-sm flex items-center justify-center gap-2 w-full
                ${settings.muted ? 'game-btn-red' : 'game-btn-green'}`}
            >
              {settings.muted
                ? <><VolumeX size={16} /> Unmute All</>
                : <><Volume2 size={16} /> Mute All</>}
            </button>

            {/* Volume sliders */}
            <div className="parchment-inner p-3 flex flex-col gap-3">
              <VolumeRow
                label="Master"
                icon={<Volume2 size={13} />}
                value={settings.masterVolume}
                onChange={handleMasterVolume}
                disabled={settings.muted}
                id="vol-master"
              />
              <VolumeRow
                label="Music"
                icon={<Music size={13} />}
                value={settings.musicVolume}
                onChange={handleMusicVolume}
                disabled={settings.muted}
                id="vol-music"
              />
              <VolumeRow
                label="Effects"
                icon={<Volume2 size={13} />}
                value={settings.effectsVolume}
                onChange={handleEffectsVolume}
                disabled={settings.muted}
                id="vol-effects"
              />
              <VolumeRow
                label="Narration"
                icon={<Mic size={13} />}
                value={settings.narrationVolume}
                onChange={handleNarrationVolume}
                disabled={settings.muted}
                id="vol-narration"
              />
            </div>

            {/* Narration speed */}
            <div className="parchment-inner p-3">
              <p className="font-fredoka text-[#4a2e12] text-xs mb-2 flex items-center gap-1">
                <Mic size={12} /> Narration Speed
              </p>
              <div className="flex gap-1.5">
                {SPEED_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleRate(opt.value)}
                    aria-pressed={settings.narrationRate === opt.value}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-fredoka border-2 transition-all
                      ${settings.narrationRate === opt.value
                        ? 'bg-[#8c5825] text-white border-[#4a2e12]'
                        : 'bg-[#ffeebd] text-[#8c5825] border-[#b57b37] hover:bg-[#ffdf91]'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle button */}
      <motion.button
        onClick={handleToggleOpen}
        aria-label={open ? 'Close audio settings' : 'Open audio settings'}
        aria-expanded={open}
        className={`w-12 h-12 rounded-full shadow-2xl border-4 flex items-center justify-center
          ${open
            ? 'bg-[#4a2e12] border-[#8c5825] text-white'
            : 'bg-[#8c5825] border-[#4a2e12] text-white'
          }`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.93 }}
      >
        {open ? <X size={20} /> : <Settings size={20} />}
      </motion.button>
    </div>
  );
}

// ─── VolumeRow ────────────────────────────────────────────────────────────────

interface VolumeRowProps {
  label:    string;
  icon:     React.ReactNode;
  value:    number;
  onChange: (v: number) => void;
  disabled: boolean;
  id:       string;
}

function VolumeRow({ label, icon, value, onChange, disabled, id }: VolumeRowProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <label htmlFor={id} className="font-fredoka text-[#4a2e12] text-xs flex items-center gap-1">
        {icon} {label}
      </label>
      <input
        id={id}
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        disabled={disabled}
        onChange={e => onChange(parseFloat(e.target.value))}
        aria-label={`${label} volume`}
        className="w-full accent-[#8c5825] disabled:opacity-40"
      />
    </div>
  );
}
