'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useCoins } from '@/hooks/useCoins';
import { useUser } from '@/hooks/useUser';
import type { PackResult } from '@/types';
import { CardReveal } from './CardReveal';
import { CardPreview } from './CardPreview';
import { PackOpeningAnimation } from './PackOpeningAnimation';
import { Package } from 'lucide-react';
import { preloadSounds } from '@/lib/sounds';

const PACK_MULTIPLIERS = [1, 2, 3, 4, 5] as const;

const formatCoins = (value: number) => value.toLocaleString('en-US');
const isAllowedQuantity = (value: number) =>
  PACK_MULTIPLIERS.includes(value as (typeof PACK_MULTIPLIERS)[number]);

type PackOpenClientProps = {
  box: {
    id: string;
    name: string;
    cardsPerPack: number;
    price: number;
    cards: Array<{
      id: string;
      name: string;
      setName: string;
      rarity: string;
      imageUrlGatherer?: string | null;
      imageUrlScryfall?: string | null;
      pullRate: number;
      coinValue?: number;
      priceAvg?: number | null;
    }>;
    boosterBoxes: Array<{
      id: string;
      name: string;
      setName?: string | null;
      imageUrl?: string | null;
      productType?: string | null;
      pullRate: number;
      diamondCoinValue?: number | null;
      priceAvg?: number | null;
      catalog?: {
        name: string;
        setName?: string | null;
        imageUrl?: string | null;
        productType?: string | null;
        priceAvg?: number | null;
      } | null;
    }>;
  };
};

export function PackOpenClient({ box }: PackOpenClientProps) {
  const router = useRouter();
  const { user, isAuthenticated } = useUser();
  const [cards, setCards] = useState<PackResult[]>([]);
  const [isOpening, setIsOpening] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const [quantity, setQuantity] = useState<number>(1);
  const [openingQuantity, setOpeningQuantity] = useState<number>(1);
  const [lastOpenMeta, setLastOpenMeta] = useState<{ packsOpened: number; totalCost: number } | null>(null);
  const { addToast } = useToast();
  const { balance, setBalance, decrement } = useCoins();

  const totalCost = box.price * quantity;
  const coinsShort = Math.max(totalCost - balance, 0);
  const repeatQuantity =
    lastOpenMeta && isAllowedQuantity(lastOpenMeta.packsOpened)
      ? lastOpenMeta.packsOpened
      : quantity;

  const previewItems = useMemo(
    () => {
      const normalizedCards = box.cards.map((card) => ({
        id: card.id,
        name: card.name,
        setName: card.setName,
        pullRate: card.pullRate,
        coinValue: card.coinValue ?? 1,
        priceAvg: card.priceAvg ?? null,
        imageUrl: card.imageUrlGatherer || card.imageUrlScryfall || '',
        badgeLabel: card.rarity,
        type: 'card' as const,
      }));

      const normalizedSealed = (box.boosterBoxes ?? []).map((product) => ({
        id: product.id,
        name: product.name || product.catalog?.name || 'Sealed Product',
        setName: product.setName || product.catalog?.setName || '',
        pullRate: Number(product.pullRate) || 0,
        coinValue: product.diamondCoinValue ?? 1,
        priceAvg:
          product.priceAvg ??
          product.catalog?.priceAvg ??
          null,
        imageUrl: product.imageUrl || product.catalog?.imageUrl || '',
        badgeLabel: product.productType?.replace(/_/g, ' ') || 'Sealed Product',
        type: 'sealed' as const,
      }));

      return [...normalizedCards, ...normalizedSealed].sort((a, b) => b.pullRate - a.pullRate);
    },
    [box.cards, box.boosterBoxes]
  );

  // Preload sound effects on mount
  useEffect(() => {
    preloadSounds();
  }, []);

  const openPack = async (quantityOverride?: number) => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (isOpening) {
      return;
    }

    const quantityToOpen = quantityOverride ?? quantity;

    // Reset previous cards
    setCards([]);
    setLastOpenMeta(null);
    setIsOpening(true);
    setShowAnimation(true);
    setOpeningQuantity(quantityToOpen);
    
    try {
      // Start API call immediately
      const response = await fetch('/api/packs/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boxId: box.id, quantity: quantityToOpen }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        const errorMessage = data.error || data.message || `Server returned ${response.status}`;
        console.error('Pack opening API error:', errorMessage, data);
        throw new Error(errorMessage);
      }

      // Validate response data
      if (!data.success || !data.data || !Array.isArray(data.data)) {
        console.error('Invalid response format:', data);
        throw new Error('Invalid response from server');
      }

      const packsOpened = typeof data.packsOpened === 'number' ? data.packsOpened : quantityToOpen;
      const totalCostSpent = typeof data.totalCost === 'number' ? data.totalCost : box.price * quantityToOpen;

      // Wait for animation to complete (1.5s) before showing cards
      setTimeout(() => {
        setLastOpenMeta({ packsOpened, totalCost: totalCostSpent });
        setCards(data.data);
        setShowAnimation(false);
        setIsOpening(false);
        
        if (typeof data.balance === 'number') {
          setBalance(data.balance);
        } else {
          decrement(box.price * quantityToOpen);
        }
        addToast({
          title: `Opened ${packsOpened} pack${packsOpened > 1 ? 's' : ''}!`,
          description: 'Cards added to your collection.',
        });
      }, 1500); // Match PackOpeningAnimation duration
    } catch (error) {
      console.error('Pack opening error:', error);
      setShowAnimation(false);
      setIsOpening(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      addToast({
        title: 'Failed to open pack',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-8 relative min-h-screen">
      {/* Pack Opening Animation Overlay */}
      <PackOpeningAnimation
        isOpening={showAnimation}
        packCount={openingQuantity}
        onComplete={() => {
          // Animation complete callback
        }}
      />

      {cards.length === 0 ? (
        <>
          <div className="flex flex-col items-center justify-center py-16 min-h-[70vh] text-center px-4">
            <motion.div
              animate={{ rotateY: [0, 360] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="mb-8 relative"
            >
              {/* Hover glow effect */}
              <motion.div
                className="absolute inset-0 rounded-full bg-primary/20 blur-2xl"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              <Package className="h-32 w-32 text-primary relative z-10 drop-shadow-[0_0_15px_rgba(139,92,246,0.6)]" />
            </motion.div>
            <div className="w-full max-w-2xl space-y-6">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg">
                <div className="flex flex-col gap-6">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-muted">Select Quantity</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {PACK_MULTIPLIERS.map((option) => (
                        <Button
                          key={option}
                          type="button"
                          variant={option === quantity ? 'default' : 'outline'}
                          onClick={() => setQuantity(option)}
                          disabled={isOpening}
                          className="flex-1 min-w-[72px]"
                        >
                          {option}x
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between text-muted">
                      <span>Price per pack</span>
                      <span className="font-semibold text-primary">{formatCoins(box.price)} 💎</span>
                    </div>
                    <div className="flex items-center justify-between text-muted">
                      <span>Total cost</span>
                      <span className={`font-semibold ${coinsShort > 0 ? 'text-danger' : 'text-success'}`}>
                        {formatCoins(totalCost)} 💎
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-muted">
                      <span>Your balance</span>
                      <span className="font-semibold">{formatCoins(balance)} 💎</span>
                    </div>
                    {coinsShort > 0 && (
                      <p className="text-xs text-danger">
                        You need {formatCoins(coinsShort)} more coins to open this many packs.
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <Button
                onClick={() => openPack()}
                size="lg"
                disabled={isOpening}
                className="relative overflow-hidden w-full"
              >
                {isOpening ? (
                  <motion.span
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  >
                    Opening...
                  </motion.span>
                ) : (
                  `Open ${quantity > 1 ? `${quantity} Packs` : 'Pack'} (${formatCoins(totalCost)} 💎)`
                )}
              </Button>
            </div>
          </div>
          <div className="w-full px-4 pb-8">
            <CardPreview items={previewItems} />
          </div>
        </>
      ) : (
        <>
          <AnimatePresence mode="wait">
            <motion.div
              key="cards-reveal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 flex flex-col items-center justify-center w-screen h-screen z-10 px-4 overflow-y-auto py-8"
            >
              <div className="flex flex-col items-center justify-center gap-8 md:gap-10 flex-1 min-h-0 w-full">
                {lastOpenMeta && (
                  <div className="text-center space-y-2">
                    <p className="text-3xl font-bold">
                      Opened {lastOpenMeta.packsOpened} pack{lastOpenMeta.packsOpened > 1 ? 's' : ''}
                    </p>
                    <p className="text-muted-foreground">
                      Total pulls: {cards.length.toLocaleString('en-US')} • Spent {formatCoins(lastOpenMeta.totalCost)} 💎
                    </p>
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-center gap-4 w-full">
                  {cards.map((card, index) => (
                    <div key={`${card.id}-${index}`} className="w-full max-w-[300px] sm:max-w-[350px] md:max-w-[400px]">
                      <CardReveal card={card} index={index} />
                    </div>
                  ))}
                </div>
                <motion.div
                  className="flex justify-center gap-4 mt-12 z-50 relative pointer-events-auto"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: cards.length * 0.15 + 0.5 }}
                >
                  <Button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openPack(repeatQuantity);
                    }}
                    variant="outline"
                    disabled={isOpening}
                    className="relative z-50 pointer-events-auto"
                  >
                    {isOpening ? 'Opening...' : repeatQuantity > 1 ? `Open ${repeatQuantity}x Again` : 'Open Another'}
                  </Button>
                  <Button 
                    onClick={() => router.push('/collection')}
                    className="relative z-50 pointer-events-auto"
                  >
                    View Collection
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

