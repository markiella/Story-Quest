import { useState } from 'react';
import { motion } from 'framer-motion';

interface Particle {
  id: number;
  size: number;
  left: string;
  top: string;
  duration: number;
  delay: number;
  color: string;
}

const particleColors = [
  'rgba(255, 234, 120, 0.7)', // soft gold
  'rgba(130, 224, 34, 0.6)',  // emerald sparkle
  'rgba(66, 158, 245, 0.6)',  // sky blue
  'rgba(255, 255, 255, 0.8)', // pure white star
];

export default function AmbientParticles() {
  const [particles] = useState<Particle[]>(() =>
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      size: 4 + (i % 5) * 2,
      left: `${(i * 17 + 5) % 95}%`,
      top: `${(i * 23 + 10) % 90}%`,
      duration: 3 + (i % 4) * 1.5,
      delay: (i % 5) * 0.4,
      color: particleColors[i % particleColors.length],
    }))
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full shadow-sm"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
          }}
          animate={{
            y: [-12, 12, -12],
            x: [-6, 6, -6],
            opacity: [0.2, 0.8, 0.2],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}
