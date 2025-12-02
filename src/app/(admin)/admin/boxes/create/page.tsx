'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { CardManager } from '@/components/admin/CardManager';
import { SealedProductManager } from '@/components/admin/SealedProductManager';
import type { CardGame, BoxSealedProduct } from '@/types';

type ImageSourceOption = {
  provider: string;
  url: string;
  kind?: 'artwork' | 'scan' | 'render' | 'unknown';
};

interface CardData {
  id?: string;
  scryfallId: string;
  multiverseId?: string;
  name: string;
  setName: string;
  setCode: string;
  collectorNumber: string;
  rarity: string;
  imageUrlGatherer: string;
  imageUrlScryfall?: string;
  colors: string[];
  cmc?: number;
  type: string;
  oracleText?: string;
  pullRate: number;
  coinValue?: number;
  priceAvg?: number | null;
  sourceGame?: CardGame;
  imageSources?: ImageSourceOption[];
  selectedImageSource?: string;
  dataProvider?: string;
}

const CARD_GAME_OPTIONS: Array<{ label: string; value: CardGame; description: string }> = [
  {
    label: 'Magic: The Gathering',
    value: 'MAGIC_THE_GATHERING',
    description: 'Uses both Scryfall and the official Magic: The Gathering API for card search.',
  },
  {
    label: 'One Piece',
    value: 'ONE_PIECE',
    description: 'Uses the OPTCG API for card search.',
  },
  {
    label: 'Pokémon',
    value: 'POKEMON',
    description: 'Uses the Pokémon TCG API for card search.',
  },
  {
    label: 'Lorcana',
    value: 'LORCANA',
    description: 'Uses the Lorcana API for card search.',
  },
];

const DEFAULT_GAMES: CardGame[] = ['MAGIC_THE_GATHERING'];
const MIN_CARDS_REQUIRED = 2;
const MIN_SEALED_REQUIRED = 2;
const PULL_RATE_TOLERANCE = 0.001;
type HeroDisplayMode = 'AUTO' | 'CARD' | 'SEALED';

const HERO_DISPLAY_OPTIONS: Array<{ value: HeroDisplayMode; label: string; description: string }> = [
  {
    value: 'AUTO',
    label: 'Auto',
    description: 'Prioritize sealed products when available, otherwise show the featured card.',
  },
  {
    value: 'CARD',
    label: 'Card Spotlight',
    description: 'Always showcase the highlighted card artwork for this box.',
  },
  {
    value: 'SEALED',
    label: 'Sealed Spotlight',
    description: 'Always showcase the most valuable sealed product tied to this box.',
  },
];

export default function CreateBoxPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'info' | 'cards'>('info');
  const [boxId, setBoxId] = useState<string | null>(null);
  const [cards, setCards] = useState<CardData[]>([]);
  const [sealedProducts, setSealedProducts] = useState<BoxSealedProduct[]>([]);
  const [heroCardSelection, setHeroCardSelection] = useState<{
    cardId: string | null;
    scryfallId: string | null;
  }>({
    cardId: null,
    scryfallId: null,
  });
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    imageUrl: '',
    price: '',
    cardsPerPack: '',
    featured: false,
    games: DEFAULT_GAMES,
    heroDisplayMode: 'AUTO' as HeroDisplayMode,
  });
  const [createdGames, setCreatedGames] = useState<CardGame[]>(DEFAULT_GAMES);

  const sealedPullRate = useMemo(
    () => sealedProducts.reduce((sum, product) => sum + (product.pullRate || 0), 0),
    [sealedProducts]
  );
  const sealedProductCount = useMemo(
    () => sealedProducts.filter((product) => product.catalogId).length,
    [sealedProducts]
  );
  const cardsPullRate = useMemo(() => cards.reduce((sum, card) => sum + card.pullRate, 0), [cards]);
  const cardPullBudget = useMemo(() => Math.max(0, 100 - sealedPullRate), [sealedPullRate]);

  // Debug: Log cards changes
  useEffect(() => {
    console.log('[Create Box] Cards state updated:', cards.length, 'cards');
  }, [cards]);

  useEffect(() => {
    if (!heroCardSelection.scryfallId) {
      return;
    }
    const stillExists = cards.some((card) => card.scryfallId === heroCardSelection.scryfallId);
    if (!stillExists) {
      setHeroCardSelection({ cardId: null, scryfallId: null });
    }
  }, [cards, heroCardSelection.scryfallId]);

  const toggleGameSelection = (gameValue: CardGame) => {
    setFormData((prev) => {
      const exists = prev.games.includes(gameValue);
      const nextGames = exists
        ? prev.games.filter((g) => g !== gameValue)
        : [...prev.games, gameValue];
      if (nextGames.length === 0) {
        addToast({
          title: 'At least one game required',
          description: 'Boxes must include cards from at least one game.',
          variant: 'destructive',
        });
        return prev;
      }
      return { ...prev, games: nextGames };
    });
  };

  const handleHeroCardSelect = (card: CardData) => {
    setHeroCardSelection({
      cardId: card.id ?? null,
      scryfallId: card.scryfallId,
    });
  };

  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    if (!formData.name || !formData.description || !formData.imageUrl || !formData.price || !formData.cardsPerPack) {
      addToast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    const price = parseInt(formData.price);
    const cardsPerPack = parseInt(formData.cardsPerPack);

    if (isNaN(price) || price <= 0) {
      addToast({
        title: 'Validation Error',
        description: 'Price must be a positive number.',
        variant: 'destructive',
      });
      return;
    }

    if (isNaN(cardsPerPack) || cardsPerPack <= 0) {
      addToast({
        title: 'Validation Error',
        description: 'Cards per pack must be a positive number.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.games.length) {
      addToast({
        title: 'Select at least one game',
        description: 'Please choose at least one card game for this box.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/admin/boxes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          imageUrl: formData.imageUrl,
          price: price,
          cardsPerPack: cardsPerPack,
          featured: formData.featured,
          games: formData.games,
          heroDisplayMode: formData.heroDisplayMode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMessage = data.error || data.message || 'Failed to create box';
        const errorDetails = data.details ? ` Details: ${JSON.stringify(data.details)}` : '';
        throw new Error(`${errorMessage}${errorDetails}`);
      }

      if (!data.box || !data.box.id) {
        throw new Error('Box was created but no ID was returned');
      }

      setBoxId(data.box.id);
      setCreatedGames(formData.games);
      setStep('cards');
      addToast({
        title: 'Box created!',
        description: 'Now add cards and/or sealed products with pull rates.',
      });
    } catch (error) {
      console.error('Box creation error:', error);
      addToast({
        title: 'Error',
        description: (error as Error).message || 'Failed to create box. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchHeroCardId = async (currentBoxId: string) => {
    const cardsRes = await fetch(`/api/admin/boxes/${currentBoxId}/cards`);
    const cardsJson = await cardsRes.json();
    if (!cardsRes.ok) {
      const errorMessage = cardsJson.error || cardsJson.message || 'Failed to load cards for hero selection.';
      throw new Error(errorMessage);
    }
    const heroCard = Array.isArray(cardsJson.cards)
      ? cardsJson.cards.find(
          (card: { id: string; scryfallId: string }) => card.scryfallId === heroCardSelection.scryfallId
        )
      : null;
    return heroCard?.id ?? null;
  };

  const syncHeroHighlightSettings = async (currentBoxId: string) => {
    if (!currentBoxId) {
      return;
    }

    const payload: Record<string, unknown> = {
      heroDisplayMode: formData.heroDisplayMode,
    };

    if (formData.heroDisplayMode === 'CARD') {
      if (!heroCardSelection.scryfallId) {
        throw new Error('Select a hero card to highlight in the marketplace.');
      }
      const heroCardId =
        heroCardSelection.cardId ??
        (await fetchHeroCardId(currentBoxId));
      if (!heroCardId) {
        throw new Error('Unable to find the selected hero card after saving. Please refresh and try again.');
      }
      payload.heroCardId = heroCardId;
    } else {
      payload.heroCardId = null;
    }

    const heroRes = await fetch(`/api/admin/boxes/${currentBoxId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const heroJson = await heroRes.json();
    if (!heroRes.ok) {
      throw new Error(heroJson.error || heroJson.message || 'Failed to save the marketplace highlight settings.');
    }
  };

  const handleCardsSubmit = async () => {
    console.log('[Create Box] handleCardsSubmit called', { boxId, cardsCount: cards.length });

    if (!boxId) {
      console.error('[Create Box] No boxId');
      addToast({
        title: 'Error',
        description: 'Box ID is missing. Please go back and create the box first.',
        variant: 'destructive',
      });
      return;
    }

    const hasCards = cards.length > 0;
    const hasSealedProducts = sealedProductCount > 0;

    if (!hasCards && !hasSealedProducts) {
      addToast({
        title: 'Add items to the box',
        description: 'Add at least two cards or two sealed products before saving.',
        variant: 'destructive',
      });
      return;
    }

    if (hasCards && cards.length < MIN_CARDS_REQUIRED) {
      addToast({
        title: 'Not enough cards',
        description: `Please add at least ${MIN_CARDS_REQUIRED} cards before saving. Currently have ${cards.length} card(s).`,
        variant: 'destructive',
      });
      return;
    }

    if (!hasCards && sealedProductCount < MIN_SEALED_REQUIRED) {
      addToast({
        title: 'Not enough sealed products',
        description: `Boxes without cards must include at least ${MIN_SEALED_REQUIRED} sealed products.`,
        variant: 'destructive',
      });
      return;
    }

    const totalCardPullRate = cards.reduce((sum, card) => sum + card.pullRate, 0);
    const totalSealedPullRate = sealedProducts.reduce((sum, product) => sum + (product.pullRate || 0), 0);

    const invalidSealed = sealedProducts.filter(
      (product) => product.pullRate < 0 || product.pullRate > 100
    );
    if (invalidSealed.length > 0) {
      addToast({
        title: 'Invalid sealed pull rates',
        description: 'All sealed products must have a pull rate between 0% and 100%.',
        variant: 'destructive',
      });
      return;
    }

    if (totalSealedPullRate > 100 + PULL_RATE_TOLERANCE) {
      addToast({
        title: 'Sealed pull rates too high',
        description: `Sealed products already consume ${totalSealedPullRate.toFixed(3)}% of the pool. Reduce them below 100%.`,
        variant: 'destructive',
      });
      return;
    }

    const combinedPullRate = totalCardPullRate + totalSealedPullRate;
    if (Math.abs(combinedPullRate - 100) > PULL_RATE_TOLERANCE) {
      addToast({
        title: 'Invalid pull rates',
        description: `Cards + sealed products must equal 100%. Current total: ${combinedPullRate.toFixed(3)}%`,
        variant: 'destructive',
      });
      return;
    }

    const pullRateBudget = Math.max(0, 100 - totalSealedPullRate);

    if (hasCards) {
      const incompleteCards = cards.filter(
        (card) => !card.name || !card.scryfallId || !card.setName || card.pullRate === undefined
      );
      if (incompleteCards.length > 0) {
        addToast({
          title: 'Incomplete cards',
          description: 'Some cards are missing required information. Please check all cards.',
          variant: 'destructive',
        });
        return;
      }
    }

    if (formData.heroDisplayMode === 'CARD') {
      if (!hasCards) {
        addToast({
          title: 'Card spotlight requires cards',
          description: 'Add cards to the box before choosing the Card Spotlight option.',
          variant: 'destructive',
        });
        return;
      }
      if (!heroCardSelection.scryfallId) {
        addToast({
          title: 'Select a hero card',
          description: 'Pick which card should be highlighted when using Card Spotlight.',
          variant: 'destructive',
        });
        return;
      }
    }

    setLoading(true);

    try {
      if (!boxId || typeof boxId !== 'string') {
        throw new Error('Invalid box ID. Please go back and create the box first.');
      }

      const cardsToSend = hasCards
        ? cards.map((card, index) => {
            try {
              if (
                !card.scryfallId ||
                !card.name ||
                !card.setName ||
                !card.setCode ||
                !card.collectorNumber ||
                !card.rarity ||
                !card.type
              ) {
                throw new Error(`Card #${index + 1} "${card.name || 'Unknown'}" is missing required fields`);
              }

              const coinValue =
                card.coinValue !== undefined && card.coinValue !== null
                  ? Math.max(1, Math.floor(Number(card.coinValue)))
                  : 1;

              const pullRate = Number(card.pullRate);
              if (isNaN(pullRate) || pullRate < 0 || pullRate > 100) {
                throw new Error(`Card #${index + 1} "${card.name}" has invalid pull rate: ${card.pullRate}`);
              }

              const sourceGame = card.sourceGame || (createdGames[0] ?? 'MAGIC_THE_GATHERING');

              return {
                scryfallId: String(card.scryfallId),
                multiverseId: card.multiverseId ? String(card.multiverseId) : undefined,
                name: String(card.name),
                setName: String(card.setName),
                setCode: String(card.setCode),
                collectorNumber: String(card.collectorNumber),
                rarity: String(card.rarity),
                imageUrlGatherer: String(card.imageUrlGatherer || card.imageUrlScryfall || ''),
                imageUrlScryfall: card.imageUrlScryfall ? String(card.imageUrlScryfall) : undefined,
                colors: Array.isArray(card.colors) ? card.colors.map(String) : [],
                cmc: card.cmc !== undefined && card.cmc !== null ? Number(card.cmc) : undefined,
                type: String(card.type),
                oracleText: card.oracleText ? String(card.oracleText) : undefined,
                pullRate,
                coinValue,
                priceAvg: typeof card.priceAvg === 'number' ? Number(card.priceAvg) : null,
                sourceGame,
              };
            } catch (error) {
              console.error(`Error preparing card #${index + 1}:`, error);
              throw error;
            }
          })
        : [];

      const res = await fetch(`/api/admin/boxes/${boxId}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cards: cardsToSend, pullRateBudget }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMessage = data.message || data.error || 'Failed to add cards';
        const errorDetails = data.details ? ` Validation errors: ${JSON.stringify(data.details, null, 2)}` : '';
        throw new Error(`${errorMessage}${errorDetails}`);
      }

      const sealedPayload = sealedProducts
        .filter((product) => product.catalogId)
        .map((product) => ({
          catalogId: product.catalogId!,
          pullRate: Number(product.pullRate) || 0,
          coinValue: product.coinValue || 1,
          priceAvg: typeof product.priceAvg === 'number' ? Number(product.priceAvg) : null,
        }));

      const sealedResponse = await fetch(`/api/admin/boxes/${boxId}/sealed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sealedProducts: sealedPayload,
        }),
      });

      const sealedData = await sealedResponse.json();

      if (!sealedResponse.ok) {
        const message = sealedData.message || sealedData.error || 'Failed to sync sealed products';
        throw new Error(message);
      }

      await syncHeroHighlightSettings(boxId);

      const parts: string[] = [];
      if (cards.length > 0) {
        parts.push(`${cards.length} card${cards.length === 1 ? '' : 's'}`);
      }
      if (sealedProductCount > 0) {
        parts.push(`${sealedProductCount} sealed product${sealedProductCount === 1 ? '' : 's'}`);
      }

      addToast({
        title: 'Success!',
        description: parts.length
          ? `Box saved with ${parts.join(' and ')}.`
          : 'Box saved successfully.',
      });

      setTimeout(() => {
        router.push('/admin/boxes');
      }, 1000);
    } catch (error) {
      console.error('Save error:', error);
      addToast({
        title: 'Error',
        description: (error as Error).message || 'Failed to save box configuration. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (step === 'cards') {
    const heroSelectionDisabled = formData.heroDisplayMode !== 'CARD' || cards.length === 0;
    return (
      <div className="container py-12">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold">Add Cards to Box</h1>
          <p className="text-muted">Search and add cards with pull rates</p>
        </div>

        <div className="mb-6 space-y-3">
          <div>
            <Label className="text-base font-semibold">Marketplace Highlight</Label>
            <p className="text-sm text-muted">
              Choose what customers see on the marketplace once this box goes live.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {HERO_DISPLAY_OPTIONS.map((option) => {
              const isSelected = formData.heroDisplayMode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, heroDisplayMode: option.value }))}
                  className={`rounded-2xl border p-4 text-left transition ${
                    isSelected
                      ? 'border-primary bg-primary/10 text-white'
                      : 'border-white/10 text-muted hover:border-white/30'
                  }`}
                >
                  <p className="text-sm font-semibold">{option.label}</p>
                  <p className="text-xs">{option.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-6 space-y-3 rounded-2xl border border-white/10 p-4">
          <div>
            <Label className="text-sm font-semibold">Card Spotlight Selection</Label>
            <p className="text-xs text-muted">
              Pick the exact card that should be highlighted on the marketplace when Card Spotlight is active.
            </p>
          </div>
          {cards.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {cards.map((card) => {
                const isSelected = heroCardSelection.scryfallId === card.scryfallId;
                return (
                  <button
                    key={`${card.scryfallId}-${card.collectorNumber}`}
                    type="button"
                    disabled={heroSelectionDisabled}
                    onClick={() => handleHeroCardSelect(card)}
                    className={`rounded-xl border p-3 text-left transition ${
                      heroSelectionDisabled
                        ? 'cursor-not-allowed opacity-60'
                        : isSelected
                          ? 'border-primary bg-primary/10 text-white'
                          : 'border-white/10 text-muted hover:border-white/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold truncate">{card.name}</span>
                      {isSelected && <span className="text-xs text-primary">Selected</span>}
                    </div>
                    <p className="text-xs text-muted truncate">
                      {card.rarity} • {card.setName}
                    </p>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted">Add cards to enable Card Spotlight selection.</p>
          )}
          {formData.heroDisplayMode === 'CARD' && cards.length > 0 && !heroCardSelection.scryfallId && (
            <p className="text-xs text-warning">Select a card to highlight when using Card Spotlight.</p>
          )}
          {heroSelectionDisabled && (
            <p className="text-xs text-muted">
              Card spotlight selection becomes available once you add cards and select the Card Spotlight option above.
            </p>
          )}
        </div>

        <CardManager 
          games={createdGames}
          pullRateBudget={cardPullBudget}
          onCardsChange={(newCards) => {
            console.log('[Create Box] CardManager onCardsChange called:', newCards.length, 'cards');
            setCards(newCards);
          }} 
        />
        <div className="mt-6">
          <SealedProductManager
            initialProducts={sealedProducts}
            onChange={setSealedProducts}
          />
          <p className="mt-2 text-sm text-muted">
            Sealed products consume {sealedPullRate.toFixed(3)}% of the 100% pool. Cards must cover the remaining{' '}
            {cardPullBudget.toFixed(3)}%.
          </p>
        </div>

        <div className="mt-6 flex gap-4">
          <Button 
            onClick={(e) => {
              e.preventDefault();
              console.log('[Create Box] Save button clicked', { 
                boxId, 
                cardsCount: cards.length, 
                cards: cards.map(c => ({ name: c.name, pullRate: c.pullRate })) 
              });
              handleCardsSubmit();
            }} 
            disabled={loading}
            className="min-w-[150px]"
          >
            {loading ? 'Saving...' : 'Save & Complete'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/admin/boxes')}
          >
            Cancel
          </Button>
        </div>
        {cards.length === 0 && sealedProductCount < MIN_SEALED_REQUIRED && (
          <p className="mt-2 text-sm text-yellow-500">
            Add at least {MIN_SEALED_REQUIRED} sealed products (with pull rates totalling 100%) or add cards.
          </p>
        )}
        {cards.length === 0 && sealedProductCount >= MIN_SEALED_REQUIRED && (
          <p className="mt-2 text-sm text-green-500">
            Sealed-only configuration: {sealedProductCount} sealed products cover {sealedPullRate.toFixed(3)}% of the pool.
          </p>
        )}
        {cards.length > 0 && cards.length < MIN_CARDS_REQUIRED && (
          <p className="mt-2 text-sm text-yellow-500">
            Please add at least {MIN_CARDS_REQUIRED} cards. Currently have {cards.length} card(s).
          </p>
        )}
        {cards.length >= MIN_CARDS_REQUIRED && (
          <p className="mt-2 text-sm text-green-500">
            Cards currently cover {cardsPullRate.toFixed(3)}% of their {cardPullBudget.toFixed(3)}% budget. Sealed products consume{' '}
            {sealedPullRate.toFixed(3)}% of the pool.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="container py-12">
      <div className="mb-8">
        <h1 className="mb-2 text-4xl font-bold">Create New Box</h1>
        <p className="text-muted">Enter box information, then add cards with pull rates</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Box Information</CardTitle>
          <CardDescription>Enter the details for your new box</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInfoSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Box Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                className="flex min-h-[100px] w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Card Game</Label>
              <div className="grid gap-3 md:grid-cols-2">
                {CARD_GAME_OPTIONS.map((option) => {
                  const isSelected = formData.games.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleGameSelection(option.value)}
                      className={`rounded-xl border p-4 text-left transition ${
                        isSelected
                          ? 'border-primary bg-primary/10 shadow-lg'
                          : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      <p className="text-sm font-semibold text-white">{option.label}</p>
                      <p className="text-xs text-muted">{option.description}</p>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted">
                Select one or more games. This determines which card databases will be available in the next step.
              </p>
              <div className="flex flex-wrap gap-2 text-xs text-muted">
                <span className="text-white/70">Selected:</span>
                {formData.games.map((game) => (
                  <span key={game} className="rounded-full bg-white/10 px-2 py-0.5 text-white">
                    {CARD_GAME_OPTIONS.find((option) => option.value === game)?.label || game}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input
                id="imageUrl"
                type="url"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="price">Price (Coins)</Label>
                <Input
                  id="price"
                  type="number"
                  min="1"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cardsPerPack">Cards per Pack</Label>
                <Input
                  id="cardsPerPack"
                  type="number"
                  min="1"
                  value={formData.cardsPerPack}
                  onChange={(e) => setFormData({ ...formData, cardsPerPack: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="featured"
                checked={formData.featured}
                onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                className="h-4 w-4 rounded border-white/20"
              />
              <Label htmlFor="featured">Featured Box</Label>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Next: Add Cards'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

