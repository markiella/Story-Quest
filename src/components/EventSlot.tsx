import { motion, AnimatePresence } from 'framer-motion';

const ordinals = ['1st', '2nd', '3rd', '4th', '5th', '6th'];

interface Props {
  index: number;
  placedText: string | null;
  isActive: boolean; // slot is ready to receive (a card is selected)
  onClick: () => void;
  onRemove: () => void;
}

export default function EventSlot({ index, placedText, isActive, onClick, onRemove }: Props) {
  return (
    <div className="flex items-center gap-3">
      {/* Ordinal badge */}
      <div
        className="flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center
                   font-fredoka text-lg text-white shadow-md"
        style={{
          background: placedText
            ? 'linear-gradient(135deg, #7c4f2a, #5a3318)'
            : isActive
            ? 'linear-gradient(135deg, #d4a017, #a07010)'
            : 'linear-gradient(135deg, #374151, #1f2937)',
          border: '3px solid rgba(0,0,0,0.4)',
          transition: 'background 0.3s',
        }}
      >
        {ordinals[index] ?? `${index + 1}th`}
      </div>

      {/* Slot body */}
      <motion.button
        onClick={placedText ? onRemove : (isActive ? onClick : undefined)}
        className={`flex-1 min-h-[64px] rounded-xl border-3 px-4 py-3 text-left font-nunito font-bold text-sm
          flex items-center gap-2 transition-all duration-200
          ${placedText
            ? 'bg-amber-200 border-amber-700 text-amber-900 cursor-pointer hover:bg-red-100 hover:border-red-500'
            : isActive
            ? 'border-yellow-400 bg-yellow-50 text-yellow-700 cursor-pointer slot-active'
            : 'border-dashed border-gray-500 bg-white/5 text-gray-400 cursor-default'
          }`}
        style={{ borderWidth: '3px' }}
        whileHover={placedText || isActive ? { scale: 1.01 } : {}}
        whileTap={placedText || isActive ? { scale: 0.99 } : {}}
      >
        <AnimatePresence mode="wait">
          {placedText ? (
            <motion.div
              key="placed"
              className="flex items-center gap-2 w-full"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              <span className="text-green-600 text-base flex-shrink-0">✅</span>
              <span>{placedText}</span>
              <span className="ml-auto text-red-400 text-xs">tap to remove</span>
            </motion.div>
          ) : isActive ? (
            <motion.span
              key="active"
              className="text-yellow-600 flex items-center gap-2"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              <span className="text-lg">👆</span> Tap to place here
            </motion.span>
          ) : (
            <motion.span
              key="empty"
              className="text-gray-500 flex items-center gap-2"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              <span className="text-lg opacity-50">○</span> Empty slot
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
