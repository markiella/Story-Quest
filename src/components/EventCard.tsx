import { motion } from 'framer-motion';

interface Props {
  text: string;
  isSelected: boolean;
  isPlaced: boolean;
  onClick: () => void;
}

export default function EventCard({ text, isSelected, isPlaced, onClick }: Props) {
  if (isPlaced) return null; // Hidden once placed in a slot

  return (
    <motion.button
      onClick={onClick}
      layout
      layoutId={`card-${text}`}
      className={`relative px-4 py-3 rounded-xl border-3 font-nunito font-bold text-sm text-left
        transition-colors duration-150 cursor-pointer min-h-[60px] flex items-center
        ${isSelected
          ? 'bg-yellow-400 border-yellow-700 text-yellow-900 shadow-[0_0_0_3px_rgba(245,200,66,0.6)]'
          : 'bg-amber-100 border-amber-600 text-amber-900 hover:bg-amber-200 hover:border-amber-800'
        }`}
      style={{ borderWidth: '3px' }}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97 }}
      exit={{ opacity: 0, scale: 0.7 }}
    >
      {isSelected && (
        <motion.span
          className="absolute -top-2 -right-2 bg-yellow-500 text-yellow-900 text-xs font-fredoka
                     px-1.5 py-0.5 rounded-full border-2 border-yellow-700"
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          ✓ Selected
        </motion.span>
      )}
      <span className="text-base mr-2">📄</span>
      {text}
    </motion.button>
  );
}
