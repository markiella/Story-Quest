import { UserRound, Star, LogOut } from 'lucide-react';
import type { UserProfile } from '../types';

interface Props {
  profile: UserProfile;
  score: number;
  onLogout?: () => void;
}

export default function UserProfileHeader({ profile, score, onLogout }: Props) {
  return (
    <div className="w-full flex justify-center mt-2 md:mt-6 lg:mt-8 mb-2 px-2 md:px-8 sticky top-2 md:top-6 z-50 pointer-events-none">
      <div className="flex items-center justify-between w-11/12 md:w-full max-w-6xl">

        {/* Profile Pill */}
        <div className="bg-[#4a2e12]/90 backdrop-blur-sm border-2 border-[#8c5825] rounded-full px-2 md:px-4 py-1.5 md:py-2 flex items-center gap-2 md:gap-3 shadow-lg pointer-events-auto">
          <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-[#1353b3] border-2 border-white flex justify-center items-center text-white shrink-0">
            <UserRound size={14} className="md:w-[18px] md:h-[18px]" />
          </div>
          <div>
            <p className="font-fredoka text-white text-xs md:text-base leading-none tracking-wide">{profile.name}</p>
            <p className="font-nunito text-[#e6c888] text-[9px] md:text-xs font-bold leading-tight mt-0.5">
              {profile.grade ?? 'Online Session'}
            </p>
          </div>

          {/* Logout button — only shown when handler is provided */}
          {onLogout && (
            <button
              onClick={onLogout}
              aria-label="Log out"
              className="ml-1 text-white/50 hover:text-red-300 transition-colors p-0.5 rounded-full"
              title="Log out"
            >
              <LogOut size={12} className="md:w-[14px] md:h-[14px]" />
            </button>
          )}
        </div>

        {/* Score Pill */}
        <div
          className="bg-[#4a2e12]/90 backdrop-blur-sm border-2 border-[#8c5825] rounded-full px-3 md:px-4 py-1.5 md:py-2 flex items-center gap-1.5 md:gap-2 shadow-lg pointer-events-auto"
          aria-label={`Score: ${score} points`}
        >
          <Star fill="gold" color="white" strokeWidth={1} size={16} className="md:w-[20px] md:h-[20px] drop-shadow-md" />
          <span className="font-fredoka text-white text-sm md:text-lg tracking-wider">
            {score}
          </span>
          <span className="font-nunito text-[#e6c888] text-[9px] md:text-[10px] font-bold">pts</span>
        </div>

      </div>
    </div>
  );
}
