'use client';

import { useState, useEffect, useMemo, use } from 'react';
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

interface BoxCardData {
  id?: string; // Card ID from database
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

type SerializedBoxCard = {
  id: string;
  scryfallId: string;
  multiverseId?: string | null;
  name: string;
  setName: string;
  setCode: string;
  collectorNumber: string;
  rarity: string;
  imageUrlGatherer: string;
  imageUrlScryfall?: string | null;
  colors: string[];
  cmc?: number | null;
  type: string;
  oracleText?: string | null;
  pullRate: number | string;
  coinValue?: number | null;
  priceAvg?: number | null;
  sourceGame?: CardGame;
};

type SerializedSealedProduct = {
  id: string;
  catalogId?: string | null;
  name: string;
  imageUrl: string;
  setName?: string | null;
  setCode?: string | null;
  productType: string;
  pullRate: number | string;
  coinValue: number;
  priceAvg?: number | null;
  catalog?: BoxSealedProduct['catalog'];
};

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
type HeroDisplayMode = 'AUTO' | 'CARD' | 'SEALED';

const HERO_DISPLAY_OPTIONS: Array<{ value: HeroDisplayMode; label: string; description: string }> = [
  {
    value: 'AUTO',
    label: 'Auto',
    description: 'Use sealed products when available, otherwise highlight the featured card.',
  },
  {
    value: 'CARD',
    label: 'Card Spotlight',
    description: 'Always showcase the highlighted card artwork.',
  },
  {
    value: 'SEALED',
    label: 'Sealed Spotlight',
    description: 'Always showcase the most valuable sealed product connected to this box.',
  },
];
const MIN_CARDS_REQUIRED = 2;
const MIN_SEALED_REQUIRED = 2;
const PULL_RATE_TOLERANCE = 0.001;

export default function EditBoxPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <EditBoxPageClient boxId={id} />;
}

function EditBoxPageClient({ boxId }: { boxId: string }) {
  const router = useRouter();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [step, setStep] = useState<'info' | 'cards'>('info');
  const [cards, setCards] = useState<BoxCardData[]>([]);
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
    isActive: true,
    games: DEFAULT_GAMES,
    heroDisplayMode: 'AUTO' as HeroDisplayMode,
  });
  const [boxGames, setBoxGames] = useState<CardGame[]>(DEFAULT_GAMES);

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

  useEffect(() => {
    const loadBox = async () => {
      try {
        const res = await fetch(`/api/admin/boxes/${boxId}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to load box');
        }

        const box = data.box;
        setFormData({
          name: box.name,
          description: box.description,
          imageUrl: box.imageUrl,
          price: box.price.toString(),
          cardsPerPack: box.cardsPerPack.toString(),
          featured: box.featured,
          isActive: box.isActive,
          games: box.games && box.games.length ? box.games : DEFAULT_GAMES,
          heroDisplayMode: box.heroDisplayMode ?? 'AUTO',
        });
        setBoxGames(box.games && box.games.length ? box.games : DEFAULT_GAMES);

        // Transform cards to CardData format
        const transformedCards: BoxCardData[] = (box.cards as SerializedBoxCard[]).map((card) => ({
          id: card.id, // Include card ID for auto-save
          scryfallId: card.scryfallId,
          multiverseId: card.multiverseId || undefined,
          name: card.name,
          setName: card.setName,
          setCode: card.setCode,
          collectorNumber: card.collectorNumber,
          rarity: card.rarity,
          imageUrlGatherer: card.imageUrlGatherer,
          imageUrlScryfall: card.imageUrlScryfall || undefined,
          colors: card.colors,
          cmc: card.cmc || undefined,
          type: card.type,
          oracleText: card.oracleText || undefined,
          pullRate: Number(card.pullRate),
          coinValue: card.coinValue || 1,
          priceAvg: card.priceAvg ? Number(card.priceAvg) : null,
          sourceGame: card.sourceGame,
        }));

        setCards(transformedCards);

        const sealedRes = await fetch(`/api/admin/boxes/${boxId}/sealed`);
        const sealedJson = await sealedRes.json();
        if (!sealedRes.ok) {
          throw new Error(sealedJson.error || 'Failed to load sealed products');
        }
        const serializedSealed: BoxSealedProduct[] = ((sealedJson.sealedProducts as SerializedSealedProduct[] | undefined) ?? []).map((item) => ({
          id: item.id,
          catalogId: item.catalogId,
          name: item.name,
          imageUrl: item.imageUrl,
          setName: item.setName,
          setCode: item.setCode,
          productType: item.productType,
          pullRate: Number(item.pullRate),
          coinValue: item.coinValue,
          priceAvg: item.priceAvg ?? null,
          catalog: item.catalog ?? null,
        }));
        setSealedProducts(serializedSealed);
        setHeroCardSelection({
          cardId: box.heroCard?.id ?? null,
          scryfallId: box.heroCard?.scryfallId ?? null,
        });
      } catch (error) {
        addToast({
          title: 'Error',
          description: (error as Error).message,
          variant: 'destructive',
        });
        router.push('/admin/boxes');
      } finally {
        setLoadingData(false);
      }
    };

    loadBox();
  }, [boxId, router, addToast]);

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
      if (!nextGames.length) {
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

  const handleHeroCardSelect = (card: BoxCardData) => {
    setHeroCardSelection({
      cardId: (card as BoxCardData & { id?: string }).id ?? null,
      scryfallId: card.scryfallId,
    });
  };

  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation: Check required fields
    if (!formData.name || !formData.description || !formData.imageUrl) {
      addToast({
        title: 'Validation Error',
        description: 'Please fill in all required fields (name, description, image URL).',
        variant: 'destructive',
      });
      return;
    }

    // Validation: Check price is valid
    const price = parseInt(formData.price);
    if (isNaN(price) || price <= 0) {
      addToast({
        title: 'Validation Error',
        description: 'Price must be a positive number.',
        variant: 'destructive',
      });
      return;
    }

    // Validation: Check cards per pack is valid
    const cardsPerPack = parseInt(formData.cardsPerPack);
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
      const res = await fetch(`/api/admin/boxes/${boxId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          price,
          cardsPerPack,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update box');
      }

      setBoxGames(formData.games);
      setStep('cards');
      addToast({
        title: 'Box Information Validated & Saved',
        description: 'Box details saved. Now manage cards and/or sealed products for your box.',
      });
    } catch (error) {
      addToast({
        title: 'Save Failed',
        description: (error as Error).message || 'Failed to save changes. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchHeroCardId = async () => {
    const cardsRes = await fetch(`/api/admin/boxes/${boxId}/cards`);
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

  const syncHeroHighlightSettings = async () => {
    if (!boxId) {
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
        (await fetchHeroCardId());
      if (!heroCardId) {
        throw new Error('Unable to find the selected hero card after saving. Please refresh and try again.');
      }
      payload.heroCardId = heroCardId;
    } else {
      payload.heroCardId = null;
    }

    const heroRes = await fetch(`/api/admin/boxes/${boxId}`, {
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
        description: `Box must have at least ${MIN_CARDS_REQUIRED} cards when cards are configured.`,
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
        description: `Sealed products already consume ${totalSealedPullRate.toFixed(
          3
        )}% of the pool. Reduce them below 100%.`,
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
      const invalidCards = cards.filter((card) => card.pullRate < 0 || card.pullRate > 100);
      if (invalidCards.length > 0) {
        addToast({
          title: 'Invalid pull rates',
          description: `Some cards have invalid pull rates (must be between 0% and 100%).`,
          variant: 'destructive',
        });
        return;
      }

      const invalidCoinValues = cards.filter((card) => !card.coinValue || card.coinValue < 1);
      if (invalidCoinValues.length > 0) {
        addToast({
          title: 'Invalid coin values',
          description: `All cards must have a coin value of at least 1.`,
          variant: 'destructive',
        });
        return;
      }

      const incompleteCards = cards.filter(
        (card) => !card.name || !card.scryfallId || !card.setName || card.pullRate === undefined
      );
      if (incompleteCards.length > 0) {
        addToast({
          title: 'Incomplete cards',
          description: `Some cards are missing required information. Please check all cards.`,
          variant: 'destructive',
        });
        return;
      }
    }

    if (formData.heroDisplayMode === 'CARD') {
      if (!hasCards) {
        addToast({
          title: 'Card spotlight requires cards',
          description: 'Add cards to this box before selecting Card Spotlight.',
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
      const cardsToSend = hasCards
        ? cards.map((card) => {
            if (
              !card.scryfallId ||
              !card.name ||
              !card.setName ||
              !card.setCode ||
              !card.collectorNumber ||
              !card.rarity ||
              !card.type
            ) {
              throw new Error(`Card "${card.name || 'Unknown'}" is missing required fields`);
            }

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
              pullRate: Number(card.pullRate) || 0,
              coinValue: card.coinValue ? Number(card.coinValue) : 1,
              priceAvg: typeof card.priceAvg === 'number' ? Number(card.priceAvg) : null,
              sourceGame: card.sourceGame || (boxGames[0] ?? 'MAGIC_THE_GATHERING'),
            };
          })
        : [];

      const res = await fetch(`/api/admin/boxes/${boxId}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cards: cardsToSend, pullRateBudget }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMessage = data.message || data.error || 'Failed to update cards';
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
        body: JSON.stringify({ sealedProducts: sealedPayload }),
      });

      const sealedData = await sealedResponse.json();
      if (!sealedResponse.ok) {
        const message = sealedData.message || sealedData.error || 'Failed to update sealed products';
        throw new Error(message);
      }

      await syncHeroHighlightSettings();

      const parts: string[] = [];
      if (cards.length > 0) {
        parts.push(`${cards.length} card${cards.length === 1 ? '' : 's'}`);
      }
      if (sealedProductCount > 0) {
        parts.push(`${sealedProductCount} sealed product${sealedProductCount === 1 ? '' : 's'}`);
      }

      addToast({
        title: 'Changes Saved Successfully!',
        description: parts.length
          ? `Box updated with ${parts.join(' and ')}.`
          : 'Box configuration saved.',
      });

      router.refresh();
      setTimeout(() => {
        router.push('/admin/boxes');
      }, 1500);
    } catch (error) {
      console.error('Save error:', error);
      addToast({
        title: 'Save Failed',
        description: (error as Error).message || 'Failed to save changes. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="container py-12">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (step === 'cards') {
    const heroSelectionDisabled = formData.heroDisplayMode !== 'CARD' || cards.length === 0;
    const readyWithCards = cards.length >= MIN_CARDS_REQUIRED;
    const readySealedOnly = cards.length === 0 && sealedProductCount >= MIN_SEALED_REQUIRED;
    const canSave = readyWithCards || readySealedOnly;
    return (
      <div className="container py-12">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold">Manage Box Cards</h1>
          <p className="text-muted">
            Update cards and pull rates for this box. Click &quot;Save Changes&quot; to validate and save all changes globally.
          </p>
        </div>

        <CardManager
          onCardsChange={setCards}
          initialCards={cards}
          games={boxGames}
          pullRateBudget={cardPullBudget}
        />
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
            onClick={handleCardsSubmit} 
            disabled={loading || !canSave}
            className="min-w-[150px]"
          >
            {loading ? 'Validating & Saving...' : 'Save Changes'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push('/admin/boxes')}>
            Back to Boxes
          </Button>
        </div>
        {cards.length === 0 && sealedProductCount < MIN_SEALED_REQUIRED && (
          <p className="mt-2 text-sm text-yellow-500">
            Add at least {MIN_SEALED_REQUIRED} sealed products (covering 100% pull rates) or add cards.
          </p>
        )}
        {cards.length === 0 && sealedProductCount >= MIN_SEALED_REQUIRED && (
          <p className="mt-2 text-sm text-green-500">
            Sealed-only configuration: {sealedProductCount} sealed products cover {sealedPullRate.toFixed(3)}% of the pool.
          </p>
        )}
        {cards.length > 0 && cards.length < MIN_CARDS_REQUIRED && (
          <p className="mt-2 text-sm text-yellow-500">
            Please add at least {MIN_CARDS_REQUIRED} cards to save the box.
          </p>
        )}
        {cards.length >= MIN_CARDS_REQUIRED && (
          <p className="mt-2 text-sm text-green-500">
            Cards currently cover {cardsPullRate.toFixed(3)}% of their {cardPullBudget.toFixed(3)}% budget. Sealed products
            consume {sealedPullRate.toFixed(3)}% of the pool.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="container py-12">
      <div className="mb-8">
        <h1 className="mb-2 text-4xl font-bold">Edit Box</h1>
        <p className="text-muted">Update box information and manage cards</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Box Information</CardTitle>
          <CardDescription>Update the details for this box</CardDescription>
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

            <div className="flex flex-col gap-2">
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

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-white/20"
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Validating & Saving...' : 'Save & Continue'}
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

