import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getLeaderboard } from '../services/leaderboard';
import type { LeaderboardEntry, UserProfile } from '../types';
import UserProfileHeader from './UserProfileHeader';
import { Trophy, ChevronLeft, UserRound } from 'lucide-react';

interface Props {
  profile: UserProfile;
  score: number;
  onBack: () => void;
  onLogout: () => void;
}

const medalColors = ['#ffea52', '#d9d9d9', '#cd7f32']; // gold, silver, bronze

export default function Leaderboard({ profile, score, onBack, onLogout }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => { setEntries(getLeaderboard()); }, []);

  return (
    <div className="bg-landscape min-h-dvh flex flex-col pb-10 w-full relative">
      <UserProfileHeader profile={profile} score={score} onLogout={onLogout} />

      <div className="w-full flex justify-center mt-6 md:mt-12 px-2 md:px-4 mb-6 md:mb-0">
        <motion.div 
          className="wood-board w-11/12 md:w-full max-w-xl p-4 md:p-6 pt-10 md:pt-12 h-fit"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Ribbon Header */}
          <div className="absolute -top-5 md:-top-6 left-1/2 -translate-x-1/2 ribbon-blue text-lg md:text-2xl z-10 flex flex-nowrap items-center gap-2 whitespace-nowrap px-6 md:px-8">
            <Trophy fill="gold" strokeWidth={1} size={18} className="md:w-[24px] md:h-[24px] opacity-90" />
            Class Leaderboard
          </div>

          <div className="parchment-inner p-3 md:p-4 max-h-[60vh] overflow-y-auto mt-2 md:mt-0">
            
            {entries.length === 0 ? (
              <p className="text-center font-nunito text-[#8c5825] font-bold py-8">
                No scores yet. Be the first champion! 🌟
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {entries.map((entry, i) => {
                  const isMe = entry.studentId === profile.studentId;
                  let rankColor = 'bg-[#ffeebd]';
                  let textColor = 'text-[#4a2e12]';
                  if (i === 0) { rankColor = 'bg-yellow-400'; textColor = 'text-yellow-900'; }
                  else if (i === 1) { rankColor = 'bg-gray-300'; textColor = 'text-gray-800'; }
                  else if (i === 2) { rankColor = 'bg-orange-300'; textColor = 'text-orange-900'; }
                  
                  return (
                    <motion.div
                      key={entry.id}
                      className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded border-b-2 
                        ${isMe ? 'bg-gradient-to-r from-blue-100 to-blue-50 border-blue-300' : 'bg-white border-gray-200'}
                      `}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      {/* Rank */}
                      <div className={`w-6 h-6 md:w-8 md:h-8 rounded shrink-0 flex items-center justify-center font-fredoka shadow-sm text-sm md:text-base ${rankColor} ${textColor}`}>
                        {i + 1}
                      </div>

                      {/* Icon */}
                      <div className="bg-[#8c5825] p-1.5 rounded-full text-white shrink-0">
                        <UserRound size={12} className="md:w-[16px] md:h-[16px]" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-fredoka text-[#4a2e12] text-sm md:text-lg truncate leading-none mt-0.5">
                          {entry.name}
                        </p>
                        {isMe && <span className="text-[9px] md:text-[10px] font-bold uppercase text-blue-600 block mt-0.5">(You)</span>}
                      </div>

                      {/* Score */}
                      <div className="font-fredoka text-base md:text-xl text-[#4a2e12] shrink-0">
                        {entry.score}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-center mt-6">
            <button onClick={onBack} className="game-btn game-btn-red text-base md:text-lg px-6 md:px-8 py-1.5 md:py-2 flex justify-center items-center gap-1 shadow-md">
              <ChevronLeft size={16} className="md:w-[20px] md:h-[20px]" /> Back
            </button>
          </div>

        </motion.div>
      </div>
    </div>
  );
}
