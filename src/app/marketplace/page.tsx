import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coins, TrendingUp } from 'lucide-react';
import { formatCoins } from '@/lib/utils';
import { Prisma } from '@prisma/client';
import type { CardGame, HeroDisplayMode } from '@prisma/client';
import { GameFilter } from '@/components/marketplace/GameFilter';

// Force dynamic rendering to ensure marketplace always shows latest box data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const CARD_GAME_OPTIONS: Array<{ label: string; value: CardGame }> = [
  { label: 'Magic: The Gathering', value: 'MAGIC_THE_GATHERING' },
  { label: 'One Piece', value: 'ONE_PIECE' },
  { label: 'Pokémon', value: 'POKEMON' },
  { label: 'Lorcana', value: 'LORCANA' },
];

const GAME_FILTER_OPTIONS = [
  { label: 'All Games', value: 'all' },
  ...CARD_GAME_OPTIONS.map((option) => ({ label: option.label, value: option.value })),
];

const CARD_GAME_LABELS = CARD_GAME_OPTIONS.reduce<Record<CardGame, string>>((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {
  MAGIC_THE_GATHERING: 'Magic: The Gathering',
  ONE_PIECE: 'One Piece',
  POKEMON: 'Pokémon',
  LORCANA: 'Lorcana',
} as Record<CardGame, string>);

type BoxWithRelations = Prisma.BoxGetPayload<{
  include: {
    cards: true;
    heroCard: true;
    boosterBoxes: {
      include: {
        catalog: true;
      };
    };
  };
}> & {
  game?: CardGame | null;
  heroDisplayMode?: HeroDisplayMode | null;
};

type HeroProduct = {
  type: 'sealed' | 'card';
  name: string;
  imageUrl: string | null;
  value: number | null;
  subtitle?: string | null;
};

const toNumberOrNull = (value?: Prisma.Decimal | number | null) => {
  if (value === null || value === undefined) return null;
  return typeof value === 'number' ? value : Number(value);
};

const getSealedProductValue = (
  boosterBox: BoxWithRelations['boosterBoxes'][number]
) => {
  const candidates = [
    toNumberOrNull(boosterBox.priceAvg),
    toNumberOrNull(boosterBox.priceHigh),
    toNumberOrNull(boosterBox.priceLow),
    toNumberOrNull(boosterBox.catalog?.priceAvg),
  ].filter((value): value is number => typeof value === 'number');

  if (!candidates.length) {
    return null;
  }
  return Math.max(...candidates);
};

const normalizeBoxGames = (box: BoxWithRelations): CardGame[] => {
  if (Array.isArray(box.games) && box.games.length > 0) {
    return box.games;
  }
  return box.game ? [box.game] : [];
};

const transformBoxes = (boxes: BoxWithRelations[]) => {
  return boxes.map((box) => {
    const { cards, boosterBoxes, heroCard, ...boxWithoutRelations } = box;
    const games = normalizeBoxGames(box);
    const mostValuableCard = cards.length > 0
      ? {
          id: cards[0].id,
          name: cards[0].name,
          imageUrlGatherer: cards[0].imageUrlGatherer,
          imageUrlScryfall: cards[0].imageUrlScryfall,
          priceAvg: cards[0].priceAvg ? Number(cards[0].priceAvg) : null,
          priceLow: cards[0].priceLow ? Number(cards[0].priceLow) : null,
          priceHigh: cards[0].priceHigh ? Number(cards[0].priceHigh) : null,
          pullRate: Number(cards[0].pullRate),
          rarity: cards[0].rarity,
        }
      : null;

    const bestSealedProduct = boosterBoxes.length
      ? boosterBoxes
          .map((booster) => {
            const value = getSealedProductValue(booster);
            return {
              id: booster.id,
              name: booster.name || booster.catalog?.name || 'Sealed Product',
              imageUrl: booster.imageUrl || booster.catalog?.imageUrl || null,
              setName: booster.setName || booster.catalog?.setName || booster.catalog?.setCode || null,
              value,
            };
          })
          .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))[0]
      : null;

    const heroMode: HeroDisplayMode = box.heroDisplayMode ?? 'AUTO';

    const selectedHeroCard = heroCard
      ? {
          id: heroCard.id,
          name: heroCard.name,
          imageUrlGatherer: heroCard.imageUrlGatherer,
          imageUrlScryfall: heroCard.imageUrlScryfall,
          priceAvg: heroCard.priceAvg ? Number(heroCard.priceAvg) : null,
          rarity: heroCard.rarity,
        }
      : mostValuableCard;

    const cardHero = selectedHeroCard
      ? {
          type: 'card' as const,
          name: selectedHeroCard.name,
          imageUrl:
            selectedHeroCard.imageUrlGatherer ||
            selectedHeroCard.imageUrlScryfall ||
            null,
          value: selectedHeroCard.priceAvg,
          subtitle: selectedHeroCard.rarity,
        }
      : null;

    const sealedHero = bestSealedProduct
      ? {
          type: 'sealed' as const,
          name: bestSealedProduct.name,
          imageUrl: bestSealedProduct.imageUrl,
          value: bestSealedProduct.value ?? null,
          subtitle: bestSealedProduct.setName ?? null,
        }
      : null;

    let heroProduct: HeroProduct | null;
    if (heroMode === 'CARD') {
      heroProduct = cardHero ?? sealedHero;
    } else if (heroMode === 'SEALED') {
      heroProduct = sealedHero ?? cardHero;
    } else {
      heroProduct = sealedHero ?? cardHero;
    }

    return {
      ...boxWithoutRelations,
      games,
      mostValuableCard,
      heroProduct,
      heroDisplayMode: heroMode,
    };
  });
};

const fetchBoxes = (where: Prisma.BoxWhereInput) => {
  return prisma.box.findMany({
    where,
    include: {
      cards: {
        orderBy: [
          { priceAvg: 'desc' },
          { priceHigh: 'desc' },
          { priceLow: 'desc' },
        ],
        take: 1,
      },
      heroCard: true,
      boosterBoxes: {
        include: {
          catalog: true,
        },
      },
    },
    orderBy: [{ featured: 'desc' }, { popularity: 'desc' }],
    take: 20,
  }) as Promise<BoxWithRelations[]>;
};

export async function getBoxes(game?: CardGame) {
  try {
    const baseWhere: Prisma.BoxWhereInput = { isActive: true };
    const whereWithFilter = game ? { ...baseWhere, games: { has: game } } : baseWhere;
    const boxes = await fetchBoxes(whereWithFilter);

    return transformBoxes(boxes);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientValidationError) {
      const message = error.message ?? '';
      const isGamesFilterUnsupported = message.includes('Unknown argument `games`');

      if (isGamesFilterUnsupported) {
        const baseWhere: Prisma.BoxWhereInput = { isActive: true };
        const boxes = await fetchBoxes(baseWhere);
        const filtered = typeof game === 'string'
          ? boxes.filter((box) => normalizeBoxGames(box).includes(game))
          : boxes;

        return transformBoxes(filtered);
      }
    }

    console.error('Error fetching boxes:', error);
    return [];
  }
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string }>;
}) {
  const params = await searchParams;
  const requestedGame = params?.game;
  const validGame = CARD_GAME_OPTIONS.some((option) => option.value === requestedGame)
    ? (requestedGame as CardGame)
    : null;

  const boxes = await getBoxes(validGame || undefined);
  const filterValue = validGame ?? 'all';

  return (
    <div className="container py-12">
      <div className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="mb-2 text-4xl font-bold">Marketplace</h1>
          <p className="text-muted">
            Browse and open premium packs from your favorite card games.
          </p>
        </div>
        <GameFilter options={GAME_FILTER_OPTIONS} selectedValue={filterValue} />
      </div>

      {boxes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted">
            {validGame
              ? `No ${CARD_GAME_LABELS[validGame]} products available yet. Check back soon!`
              : 'No boxes available yet. Check back soon!'}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {boxes.map((box) => {
            const hero = box.heroProduct;
            const heroImageSrc = hero?.imageUrl || box.imageUrl || '/placeholder.svg';

            return (
              <Card
                key={box.id}
                className="group overflow-hidden transition hover:scale-105"
                data-hero-value={hero?.value ?? undefined}
              >
                <div className="aspect-video bg-gradient-to-br from-primary/20 to-secondary/20 relative overflow-hidden">
                  {hero ? (
                    <>
                      <Image
                        src={heroImageSrc}
                        alt={hero.name}
                        fill
                        className="object-contain p-2"
                        unoptimized
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute bottom-2 left-2 right-2">
                        <div className="flex items-center justify-between text-xs text-white">
                          <span className="font-semibold truncate">{hero.name}</span>
                        </div>
                        {hero.subtitle && (
                          <p className="text-[11px] text-white/80 truncate">{hero.subtitle}</p>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <div className="text-center text-muted">
                        <p className="text-sm">No products available</p>
                      </div>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 z-10 flex flex-col items-end gap-2">
                    {box.games.length > 0 && (
                      <div className="flex flex-wrap justify-end gap-1">
                        {box.games.map((game) => (
                          <Badge key={`${box.id}-${game}`} variant="outline" className="text-[10px] uppercase">
                            {CARD_GAME_LABELS[game] ?? game}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {box.featured && <Badge variant="secondary">Featured</Badge>}
                  </div>
                </div>
                <CardHeader>
                  <CardTitle>{box.name}</CardTitle>
                  <CardDescription className="line-clamp-2">{box.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Coins className="h-5 w-5 text-warning" />
                      <span className="text-xl font-bold">{formatCoins(box.price)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted">
                      <TrendingUp className="h-4 w-4" />
                      <span>{box.popularity} opens</span>
                    </div>
                  </div>
                  <Button asChild className="w-full">
                    <Link href={`/open/${box.id}`}>Open Pack</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

