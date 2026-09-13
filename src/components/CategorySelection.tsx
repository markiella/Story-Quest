import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import { categoryMeta } from '../data/stories';
import type { Category, UserProfile } from '../types';
import UserProfileHeader from './UserProfileHeader';
import { useAudio } from '../hooks/useAudio';
import StoryCompanion from './StoryCompanion';

interface Props {
  profile: UserProfile;
  score: number;
  onSelect: (category: Category) => void;
  onLogout: () => void;
}

/** The four story-type categories available to every grade */
const BASE_CATEGORIES: Category[] = ['Fable', 'Myth', 'Realistic Fiction', 'Legend'];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};
const cardVariants = {
  hidden:   { opacity: 0, y: 40, scale: 0.9 },
  visible:  { opacity: 1, y: 0,  scale: 1, transition: { type: 'spring' as const, stiffness: 180, damping: 20 } },
};

export default function CategorySelection({ profile, score, onSelect, onLogout }: Props) {
  const audio = useAudio();

  useEffect(() => { audio.playMusic('category'); }, [audio]);

  const categories: Category[] = profile.grade
    ? [...BASE_CATEGORIES, profile.grade as Category]
    : BASE_CATEGORIES;

  // Widen to 5-column grid when showing 5 categories
  const gridClass = categories.length === 5
    ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6'
    : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8';

  return (
    <div className="bg-landscape w-full flex flex-col pb-10 flex-1 relative min-h-dvh">
      <UserProfileHeader profile={profile} score={score} onLogout={onLogout} />

      <div className="flex-1 flex items-center justify-center w-full px-4 md:px-8 py-6 my-auto">
        <div className="flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-10 max-w-7xl mx-auto w-full">
          {/* Left Side Mascot Companion — Idle expression for Category Selection */}
          <motion.div
            className="shrink-0 flex justify-center items-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 180, damping: 20 }}
          >
            <StoryCompanion
              emotion="idle"
              size="hero"
              speech="Pick a category to explore!"
            />
          </motion.div>

          {/* Centered Main Category Board */}
          <motion.div
            className="wood-board flex-1 w-full max-w-6xl px-6 md:px-12 pt-16 pb-10 h-fit shadow-2xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Ribbon Header */}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 ribbon-blue text-xl md:text-2xl px-8 md:px-14 z-20 flex flex-nowrap items-center gap-3 whitespace-nowrap max-w-[90vw] overflow-hidden shadow-xl">
              <BookOpen size={26} className="opacity-90 flex-shrink-0" />
              <span className="truncate">Choose a Story Category</span>
            </div>

            <motion.div
              className={gridClass}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {categories.map((cat) => {
                const meta = categoryMeta[cat];

                return (
                  <motion.button
                    key={cat}
                    variants={cardVariants}
                    onClick={() => { audio.playClick(); onSelect(cat); }}
                    onMouseEnter={() => audio.playHover()}
                    className="relative overflow-hidden rounded-2xl border-[5px] border-[#4a2e12] shadow-xl text-center min-h-60 md:min-h-72 lg:min-h-80
                      hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 bg-black flex flex-col justify-end min-w-0 group"
                  >
                    {/* Image Background */}
                    <div
                      className="absolute inset-0 bg-cover bg-center opacity-85 group-hover:opacity-100 transition-opacity"
                      style={{ backgroundImage: `url(${meta.image})` }}
                    />

                    {/* Category Name — top bar */}
                    <div className="absolute top-0 inset-x-0 bg-gradient-to-b from-black/85 via-black/40 to-transparent pt-3.5 pb-10">
                      <h2 className="font-fredoka text-xl md:text-2xl text-white text-stroke-primary drop-shadow-lg">
                        {cat}
                      </h2>
                    </div>

                    {/* Description — bottom strip */}
                    <div className="relative z-10 p-2.5 w-full bg-[#4a2e12]/95 border-t-2 border-[#8c5825]">
                      <p className="font-nunito text-white/95 text-xs md:text-sm font-bold px-1 line-clamp-2 leading-tight">
                        {meta.desc}
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
