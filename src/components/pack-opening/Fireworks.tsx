'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

type FireworksProps = {
  trigger: boolean;
  rarity: 'rare' | 'mythic';
  position?: { x: number; y: number };
};

export function Fireworks({ trigger, rarity, position }: FireworksProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (trigger) {
      setShow(true);
      const timer = setTimeout(() => setShow(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [trigger]);

  if (!show) return null;

  const colors = rarity === 'mythic' 
    ? ['#fbbf24', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6', '#10b981']
    : ['#3b82f6', '#60a5fa', '#93c5fd', '#2563eb'];

  // Create multiple firework bursts - more for full screen effect
  const bursts = Array.from({ length: 16 }, (_, i) => ({
    id: i,
    angle: (i * 360) / 16,
    delay: i * 0.03,
  }));

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
      {bursts.map((burst) => (
        <motion.div
          key={burst.id}
          className="absolute left-1/2 top-1/2"
          initial={{ x: 0, y: 0, scale: 0 }}
          animate={{
            x: Math.cos((burst.angle * Math.PI) / 180) * 400,
            y: Math.sin((burst.angle * Math.PI) / 180) * 400,
            scale: [0, 2, 0],
          }}
          transition={{
            delay: burst.delay,
            duration: 1.5,
            ease: 'easeOut',
          }}
        >
          {/* Main particle */}
          <motion.div
            className="absolute h-2 w-2 rounded-full"
            style={{
              backgroundColor: colors[burst.id % colors.length],
              boxShadow: `0 0 20px ${colors[burst.id % colors.length]}`,
            }}
            animate={{
              scale: [1, 2, 0],
              opacity: [1, 1, 0],
            }}
            transition={{
              duration: 1.5,
              ease: 'easeOut',
            }}
          />
          
          {/* Trail particles */}
          {Array.from({ length: 8 }).map((_, trailIndex) => (
            <motion.div
              key={trailIndex}
              className="absolute h-2 w-2 rounded-full"
              style={{
                backgroundColor: colors[(burst.id + trailIndex) % colors.length],
                boxShadow: `0 0 10px ${colors[(burst.id + trailIndex) % colors.length]}`,
              }}
              initial={{ x: 0, y: 0, opacity: 1 }}
              animate={{
                x: Math.cos((burst.angle * Math.PI) / 180) * (trailIndex * 30),
                y: Math.sin((burst.angle * Math.PI) / 180) * (trailIndex * 30),
                opacity: [1, 0.7, 0],
                scale: [1, 1.2, 0],
              }}
              transition={{
                delay: burst.delay + trailIndex * 0.08,
                duration: 1.5,
                ease: 'easeOut',
              }}
            />
          ))}
        </motion.div>
      ))}

      {/* Additional sparkles for mythic - full screen */}
      {rarity === 'mythic' && (
        <>
          {Array.from({ length: 30 }).map((_, i) => (
            <motion.div
              key={`sparkle-${i}`}
              className="absolute h-2 w-2 rounded-full"
              style={{
                backgroundColor: colors[i % colors.length],
                boxShadow: `0 0 15px ${colors[i % colors.length]}`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [0, 2, 0],
                opacity: [0, 1, 0],
                rotate: 360,
              }}
              transition={{
                delay: Math.random() * 0.8,
                duration: 2 + Math.random() * 0.5,
                repeat: 1,
                ease: 'easeOut',
              }}
            />
          ))}
        </>
      )}

      {/* Center burst effect - full screen */}
      <motion.div
        className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: rarity === 'mythic'
            ? 'radial-gradient(circle, rgba(251,191,36,0.9) 0%, rgba(139,92,246,0.7) 30%, rgba(59,130,246,0.5) 60%, transparent 100%)'
            : 'radial-gradient(circle, rgba(59,130,246,0.9) 0%, rgba(96,165,250,0.7) 50%, transparent 100%)',
          filter: 'blur(40px)',
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{
          scale: [0, 3, 5],
          opacity: [0, 1, 0],
        }}
        transition={{
          duration: 2,
          ease: 'easeOut',
        }}
      />
      
      {/* Additional full-screen glow layers for mythic */}
      {rarity === 'mythic' && (
        <motion.div
          className="absolute left-1/2 top-1/2 h-screen w-screen -translate-x-1/2 -translate-y-1/2"
          style={{
            background: 'radial-gradient(circle at center, rgba(251,191,36,0.3) 0%, rgba(139,92,246,0.2) 50%, transparent 100%)',
          }}
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: 2.5,
            ease: 'easeOut',
          }}
        />
      )}
    </div>
  );
}

