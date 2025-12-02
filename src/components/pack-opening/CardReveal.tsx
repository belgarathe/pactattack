'use client';

import { motion } from 'framer-motion';
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import type { PackResult } from '@/types';
import { Fireworks } from './Fireworks';
import { playCashRegisterSound } from '@/lib/sounds';

type CardRevealProps = {
  card: PackResult & { pullRate?: number; coinValue?: number };
  index: number;
};

const rarityColors: Record<string, string> = {
  common: 'bg-gray-500',
  uncommon: 'bg-green-500',
  rare: 'bg-blue-500',
  mythic: 'bg-yellow-500',
};

export function CardReveal({ card, index }: CardRevealProps) {
  const rarity = card.rarity.toLowerCase();
  const isRare = rarity === 'rare' || rarity === 'mythic';
  const isMythic = rarity === 'mythic';
  const [showFireworks, setShowFireworks] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const cardBackImage = useMemo(
    () => 'https://cards.scryfall.io/back.png?1698988600',
    []
  );

  // Trigger fireworks and sound when rare/mythic card is revealed
  useEffect(() => {
    if (isRare) {
      // Delay fireworks and sound to match card reveal timing
      const timer = setTimeout(() => {
        setShowFireworks(true);
        // Play cash register sound effect
        playCashRegisterSound();
      }, index * 150 + 800); // Match card reveal delay + extra time
      return () => clearTimeout(timer);
    }
  }, [isRare, index]);

  // Close zoom on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isZoomed) {
        setIsZoomed(false);
      }
    };
    if (isZoomed) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [isZoomed]);

  return (
    <>
      {/* Zoom overlay backdrop */}
      {isZoomed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4"
          onClick={() => setIsZoomed(false)}
        >
          <motion.div
            initial={{ scale: 1 }}
            animate={{ scale: 2 }}
            exit={{ scale: 1 }}
            transition={{ duration: 0.3 }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-[90vw] max-h-[90vh]"
          >
            <Card className="relative overflow-hidden border-2 transition-all w-full">
              <motion.div
                className="relative aspect-[63/88] bg-gradient-to-br from-primary/20 to-secondary/20"
              >
                {card.imageUrl ? (
                  <Image
                    src={card.imageUrl}
                    alt={card.name}
                    fill
                    className="object-contain"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted">
                    No Image
                  </div>
                )}
                <Badge
                  className={`absolute top-2 right-2 ${
                    rarityColors[rarity] || 'bg-gray-500'
                  } shadow-lg`}
                >
                  {card.rarity}
                </Badge>
              </motion.div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg">{card.name}</h3>
                <p className="text-sm text-muted">{card.setName}</p>
                <div className="mt-2 space-y-1">
                  {card.pullRate !== undefined && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted">Pull Rate:</span>
                      <span className="font-semibold text-primary">
                        {card.pullRate.toFixed(3)}%
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">💎 Value:</span>
                    <span className="font-semibold text-yellow-400">
                      {card.coinValue || 1} coins
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
      <motion.div
        initial={{
          opacity: 0,
          scale: 0.5,
          y: -100,
          rotateY: 180,
          x: (Math.random() - 0.5) * 200,
        }}
        animate={{
          opacity: 1,
          scale: 1,
          y: 0,
          rotateY: 0,
          x: 0,
        }}
        transition={{
          delay: index * 0.15,
          duration: 0.6,
          type: 'spring',
          stiffness: 200,
          damping: 15,
        }}
        whileHover={{
          scale: 1.05,
          y: -10,
          transition: { duration: 0.2 },
        }}
        className="relative cursor-pointer"
        onClick={() => setIsZoomed(true)}
      >
      {/* Fireworks animation for Rare/Mythic - full screen */}
      {isRare && (
        <Fireworks 
          trigger={showFireworks} 
          rarity={isMythic ? 'mythic' : 'rare'}
        />
      )}

      {/* Rarity glow effect */}
      {isRare && (
        <motion.div
          className="absolute -inset-2 rounded-lg blur-xl"
          style={{
            background:
              rarity === 'mythic'
                ? 'linear-gradient(135deg, #ef4444, #b91c1c)'
                : 'linear-gradient(135deg, #fde047, #facc15)',
          }}
          animate={{
            opacity: [0.5, 0.8, 0.5],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      <Card className="relative overflow-visible border-2 transition-all w-full flex-shrink-0">
        <div className="relative aspect-[63/88] [perspective:1400px]">
          <motion.div
            className="absolute inset-0"
            style={{ transformStyle: 'preserve-3d' }}
            initial={{ rotateY: 180, scale: 0.92, opacity: 0 }}
            animate={{ rotateY: 0, scale: 1, opacity: 1 }}
            transition={{
              delay: index * 0.15 + 0.2,
              duration: 0.8,
              ease: 'easeOut',
            }}
          >
            {/* Official MTG card back before reveal */}
            <div
              className="absolute inset-0 rounded-lg border border-white/25"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                backgroundImage: `url(${cardBackImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                boxShadow: '0 25px 40px rgba(0,0,0,0.55)',
              }}
            >
              <div className="absolute inset-0 rounded-lg bg-black/50 mix-blend-multiply" />
            </div>

            {/* Card front */}
            <motion.div
              className="absolute inset-0 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20"
              style={{ backfaceVisibility: 'hidden' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                delay: index * 0.15 + 0.55,
                duration: 0.2,
                ease: 'easeOut',
              }}
            >
              {card.imageUrl ? (
                <Image
                  src={card.imageUrl}
                  alt={card.name}
                  fill
                  className="object-contain"
                  unoptimized
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted">
                  No Image
                </div>
              )}

              {/* Rarity badge with animation */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  delay: index * 0.15 + 0.65,
                  type: 'spring',
                  stiffness: 300,
                }}
              >
                <Badge
                  className={`absolute top-2 right-2 ${
                    rarityColors[rarity] || 'bg-gray-500'
                  } shadow-lg`}
                >
                  {card.rarity}
                </Badge>
              </motion.div>

              {/* Shine effect for rare cards */}
              {isRare && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                  initial={{ x: '-120%', opacity: 0 }}
                  animate={{ x: '220%', opacity: 1 }}
                  transition={{
                    delay: index * 0.15 + 0.9,
                    duration: 0.85,
                    ease: 'easeInOut',
                  }}
                />
              )}
            </motion.div>
          </motion.div>
        </div>

        <CardContent className="p-4">
          <motion.h3
            className="font-semibold"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.15 + 0.7 }}
          >
            {card.name}
          </motion.h3>
          <motion.p
            className="text-sm text-muted"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.15 + 0.8 }}
          >
            {card.setName}
          </motion.p>
          <motion.div
            className="mt-2 space-y-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.15 + 0.9 }}
          >
            {card.pullRate !== undefined && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">Pull Rate:</span>
                <span className="font-semibold text-primary">
                  {card.pullRate.toFixed(3)}%
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">💎 Value:</span>
              <span className="font-semibold text-yellow-400">
                {card.coinValue || 1} coins
              </span>
            </div>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
    </>
  );
}

