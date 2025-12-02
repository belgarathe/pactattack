'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Package, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

type PackOpeningAnimationProps = {
  isOpening: boolean;
  onComplete: () => void;
  packCount?: number;
};

export function PackOpeningAnimation({ isOpening, onComplete, packCount = 1 }: PackOpeningAnimationProps) {
  const [phase, setPhase] = useState<'idle' | 'opening' | 'bursting' | 'complete'>('idle');
  const packLabel = packCount > 1 ? `${packCount} Packs` : 'Pack';

  useEffect(() => {
    if (isOpening) {
      setPhase('opening');
      // Pack opening phase (1 second)
      const openingTimer = setTimeout(() => {
        setPhase('bursting');
      }, 1000);

      // Bursting phase (0.5 seconds)
      const burstingTimer = setTimeout(() => {
        setPhase('complete');
        onComplete();
      }, 1500);

      return () => {
        clearTimeout(openingTimer);
        clearTimeout(burstingTimer);
      };
    } else {
      // Reset when not opening
      setPhase('idle');
    }
  }, [isOpening, onComplete]);

  if (!isOpening && phase === 'idle') {
    return null;
  }

  return (
    <AnimatePresence>
      {(phase === 'opening' || phase === 'bursting') && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
        >
          {/* Pack Opening Animation */}
          {phase === 'opening' && (
            <motion.div
              className="relative flex flex-col items-center justify-center"
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5 }}
            >
              {/* Pack with opening effect */}
              <motion.div
                className="relative"
                animate={{
                  rotateY: [0, 15, -15, 0],
                  rotateX: [0, 10, -10, 0],
                }}
                transition={{
                  duration: 1,
                  ease: 'easeInOut',
                }}
              >
                {/* Glow effect */}
                <motion.div
                  className="absolute inset-0 rounded-lg bg-primary/30 blur-2xl"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
                <Package className="h-48 w-48 text-primary drop-shadow-[0_0_20px_rgba(139,92,246,0.8)]" />
              </motion.div>

              {/* Pack tearing effect */}
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                initial={{ scaleX: 1 }}
                animate={{
                  scaleX: [1, 1.1, 1.2],
                  opacity: [1, 0.8, 0],
                }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <div className="h-48 w-48 border-t-4 border-b-4 border-primary/50" />
              </motion.div>

              {/* Sparkles */}
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute"
                  initial={{
                    x: 0,
                    y: 0,
                    opacity: 0,
                    scale: 0,
                  }}
                  animate={{
                    x: (Math.random() - 0.5) * 400,
                    y: (Math.random() - 0.5) * 400,
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0],
                  }}
                  transition={{
                    duration: 1,
                    delay: 0.3 + i * 0.05,
                    ease: 'easeOut',
                  }}
                >
                  <Sparkles className="h-4 w-4 text-yellow-400" />
                </motion.div>
              ))}

              <motion.p
                className="mt-8 text-2xl font-bold text-white"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              >
                Opening {packLabel}...
              </motion.p>
            </motion.div>
          )}

          {/* Cards Bursting Out */}
          {phase === 'bursting' && (
            <motion.div
              className="relative flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {/* Bursting cards effect */}
              {[...Array(8)].map((_, i) => {
                const angle = (i / 8) * Math.PI * 2;
                const distance = 200;
                const x = Math.cos(angle) * distance;
                const y = Math.sin(angle) * distance;

                return (
                  <motion.div
                    key={i}
                    className="absolute h-32 w-24 rounded-lg border-2 border-white/20 bg-gradient-to-br from-primary/40 to-secondary/40 shadow-lg"
                    initial={{
                      x: 0,
                      y: 0,
                      rotate: 0,
                      scale: 0.5,
                      opacity: 0,
                    }}
                    animate={{
                      x,
                      y,
                      rotate: [0, 360],
                      scale: [0.5, 1, 0.8],
                      opacity: [0, 1, 0.8],
                    }}
                    transition={{
                      duration: 0.8,
                      delay: i * 0.05,
                      ease: 'easeOut',
                    }}
                  >
                    {/* Card back pattern */}
                    <div className="h-full w-full rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 p-2">
                      <div className="h-full w-full rounded border border-white/20 bg-gradient-to-br from-primary/20 to-secondary/20" />
                    </div>
                  </motion.div>
                );
              })}

              {/* Center explosion effect */}
              <motion.div
                className="absolute h-32 w-24 rounded-lg bg-gradient-to-br from-yellow-400/50 to-orange-500/50"
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: 3, opacity: 0 }}
                transition={{ duration: 0.5 }}
              />
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

