import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma, ensureBoxGamesReady } from '@/lib/prisma';
import { ensureCardSourceColumn, isMissingSourceGameColumnError } from '@/lib/ensureBoxGamesColumn';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const cardSchema = z
  .object({
    scryfallId: z.string(),
    multiverseId: z.string().optional(),
    name: z.string(),
    setName: z.string(),
    setCode: z.string(),
    collectorNumber: z.string(),
    rarity: z.string(),
    imageUrlGatherer: z.string(),
    imageUrlScryfall: z.string().optional(),
    colors: z.array(z.string()),
    cmc: z.number().optional(),
    type: z.string(),
    oracleText: z.string().optional(),
    pullRate: z.number().min(0).max(100),
    coinValue: z.number().int().min(1).optional().default(1),
    priceAvg: z.number().nonnegative().optional().nullable(),
    sourceGame: z.enum([
      'MAGIC_THE_GATHERING',
      'ONE_PIECE',
      'POKEMON',
      'LORCANA',
    ] as const),
  })
  .transform((data) => ({
    ...data,
    coinValue: data.coinValue ?? 1, // Ensure default is applied
    priceAvg: typeof data.priceAvg === 'number' ? data.priceAvg : null,
  }));

const payloadSchema = z.object({
  cards: z.array(cardSchema),
  pullRateBudget: z.number().min(0).max(100).default(100),
});

// Add cards to a box
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    await ensureBoxGamesReady();
    await ensureCardSourceColumn(prisma);
    const body = await request.json();
    
    console.log('[API] Received request to add cards to box:', id);
    console.log('[API] Request body:', JSON.stringify(body, null, 2));
    
    const { cards, pullRateBudget } = payloadSchema.parse(body);
    
    console.log('[API] Parsed cards:', cards.length, 'cards');

    // Enforce server-side uniqueness within the same payload
    const seenScryfallIds = new Set<string>();
    const duplicateIds = new Set<string>();
    for (const card of cards) {
      if (seenScryfallIds.has(card.scryfallId)) {
        duplicateIds.add(card.scryfallId);
      }
      seenScryfallIds.add(card.scryfallId);
    }

    if (duplicateIds.size > 0) {
      return NextResponse.json(
        {
          error: 'Duplicate cards detected',
          message: `Each card can only appear once per box configuration. Duplicate scryfall IDs: ${[
            ...duplicateIds,
          ].join(', ')}`,
        },
        { status: 400 }
      );
    }

    const MIN_CARDS_REQUIRED = 2;
    if (cards.length > 0 && cards.length < MIN_CARDS_REQUIRED) {
      return NextResponse.json(
        { error: `Box must include at least ${MIN_CARDS_REQUIRED} cards when cards are provided` },
        { status: 400 }
      );
    }

    // Verify box exists
    const box = await prisma.box.findUnique({
      where: { id },
    });

    if (!box) {
      return NextResponse.json({ error: 'Box not found' }, { status: 404 });
    }

    // Validate pull rates sum to 100%
    const totalPullRate = cards.reduce((sum, card) => sum + card.pullRate, 0);
    if (Math.abs(totalPullRate - pullRateBudget) > 0.001) {
      return NextResponse.json(
        { error: `Card pull rates must sum to ${pullRateBudget.toFixed(3)}%. Current sum: ${totalPullRate.toFixed(3)}%` },
        { status: 400 }
      );
    }

    // Get existing cards for this box
    const existingCards = await safeCardQuery(() =>
      prisma.card.findMany({
        where: { boxId: id },
        include: {
          _count: {
            select: { pulls: true },
          },
        },
      })
    );

    // Track incoming card IDs for later deletion logic
    const incomingScryfallIds = cards.map((card) => card.scryfallId);

    // Create map for quick lookup of existing cards in this box only
    const existingCardsMap = new Map(existingCards.map((card) => [card.scryfallId, card]));

    // Prepare operations: update existing cards or create new ones
    const operations: any[] = [];

    // Process each card: update if exists globally, create if new
    for (const cardData of cards) {
      const existingCardInBox = existingCardsMap.get(cardData.scryfallId);

      if (existingCardInBox) {
        // Card already exists in this box - update it
        operations.push(
          prisma.card.update({
            where: { id: existingCardInBox.id },
            data: {
              multiverseId: cardData.multiverseId || null,
              name: cardData.name,
              setName: cardData.setName,
              setCode: cardData.setCode,
              collectorNumber: cardData.collectorNumber,
              rarity: cardData.rarity,
              imageUrlGatherer: cardData.imageUrlGatherer,
              imageUrlScryfall: cardData.imageUrlScryfall || null,
              colors: cardData.colors,
              cmc: cardData.cmc ?? null,
              type: cardData.type,
              oracleText: cardData.oracleText || null,
              pullRate: cardData.pullRate,
              coinValue: cardData.coinValue || 1,
              priceAvg: cardData.priceAvg ?? null,
              sourceGame: cardData.sourceGame,
            },
          })
        );
      } else {
        // Card not in this box yet - create new entry tied to this box
        operations.push(
          prisma.card.create({
            data: {
              scryfallId: cardData.scryfallId,
              multiverseId: cardData.multiverseId || null,
              name: cardData.name,
              setName: cardData.setName,
              setCode: cardData.setCode,
              collectorNumber: cardData.collectorNumber,
              rarity: cardData.rarity,
              imageUrlGatherer: cardData.imageUrlGatherer,
              imageUrlScryfall: cardData.imageUrlScryfall || null,
              colors: cardData.colors,
              cmc: cardData.cmc ?? null,
              type: cardData.type,
              oracleText: cardData.oracleText || null,
              pullRate: cardData.pullRate,
              coinValue: cardData.coinValue || 1,
              priceAvg: cardData.priceAvg ?? null,
              sourceGame: cardData.sourceGame,
              boxId: id,
            },
          })
        );
      }
    }

    // Delete cards that are no longer in the list, but only if they have no Pull records
    const incomingScryfallIdsSet = new Set(incomingScryfallIds);
    const cardsToCheckForDeletion = existingCards.filter(
      (card) => !incomingScryfallIdsSet.has(card.scryfallId)
    );

    // Double-check that cards have no Pull records before attempting deletion
    if (cardsToCheckForDeletion.length > 0) {
      const cardIdsToCheck = cardsToCheckForDeletion.map((card) => card.id);
      
      // Verify each card has zero pulls by querying the database
      const cardsWithPulls = await prisma.pull.findMany({
        where: {
          cardId: { in: cardIdsToCheck },
        },
        select: {
          cardId: true,
        },
        distinct: ['cardId'],
      });

      const cardIdsWithPulls = new Set(cardsWithPulls.map((pull) => pull.cardId));
      const cardsToDelete = cardsToCheckForDeletion.filter(
        (card) => !cardIdsWithPulls.has(card.id)
      );

      if (cardsToDelete.length > 0) {
        operations.push(
          prisma.card.deleteMany({
            where: {
              id: { in: cardsToDelete.map((card) => card.id) },
              boxId: id, // Ensure we only delete cards from this box
            },
          })
        );
      }
    }

    // Execute all operations in a transaction
    if (operations.length > 0) {
      console.log('[API] Executing', operations.length, 'operations in transaction');
      await prisma.$transaction(operations);
      console.log('[API] Transaction completed successfully');
    } else {
      console.warn('[API] No operations to execute - this should not happen');
    }

    // Revalidate marketplace and box pages to show updated cards/pull rates immediately
    revalidatePath('/marketplace');
    revalidatePath(`/open/${id}`);
    revalidatePath('/admin/boxes');

    console.log('[API] Successfully added cards to box:', id);
    return NextResponse.json({ success: true, message: 'Cards added successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors);
      const errorMessages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return NextResponse.json(
        { 
          error: 'Invalid card data', 
          details: error.errors,
          message: `Validation failed: ${errorMessages}`
        }, 
        { status: 400 }
      );
    }
    console.error('Card creation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Failed to add cards',
        message: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      }, 
      { status: 500 }
    );
  }
}

// Get cards for a box
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const cards = await safeCardQuery(() =>
      prisma.card.findMany({
      where: { boxId: id },
      orderBy: [{ rarity: 'asc' }, { name: 'asc' }],
      })
    );

    // Convert Decimal values to numbers for client components
    const serializedCards = cards.map((card) => ({
      ...card,
      pullRate: Number(card.pullRate),
      coinValue: card.coinValue,
      priceLow: card.priceLow ? Number(card.priceLow) : null,
      priceAvg: card.priceAvg ? Number(card.priceAvg) : null,
      priceHigh: card.priceHigh ? Number(card.priceHigh) : null,
      sourceGame: card.sourceGame,
    }));

    return NextResponse.json({ cards: serializedCards });
  } catch (error) {
    console.error('Error fetching cards:', error);
    return NextResponse.json({ error: 'Failed to fetch cards' }, { status: 500 });
  }
}

async function safeCardQuery<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (isMissingSourceGameColumnError(error)) {
      await ensureCardSourceColumn(prisma);
      return operation();
    }
    throw error;
  }
}

