import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const ALLOWED_PACK_QUANTITIES = [1, 2, 3, 4, 5] as const;

function drawItem(items: Array<{ id: string; pullRate: number; type: 'card' | 'boosterBox' }>) {
  if (!items || items.length === 0) {
    throw new Error('No items available to draw from');
  }

  const total = items.reduce((sum, item) => sum + item.pullRate, 0);
  
  if (total === 0) {
    throw new Error('Total pull rate is zero - cannot draw items');
  }

  const random = Math.random() * total;
  let cumulative = 0;

  for (const item of items) {
    cumulative += item.pullRate;
    if (random <= cumulative) {
      return { id: item.id, type: item.type };
    }
  }

  // Fallback to last item if somehow we didn't match (shouldn't happen)
  const lastItem = items[items.length - 1];
  return lastItem ? { id: lastItem.id, type: lastItem.type } : { id: '', type: 'card' as const };
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { boxId, quantity: rawQuantity } = body ?? {};

    if (!boxId) {
      return NextResponse.json({ error: 'Missing boxId' }, { status: 400 });
    }

    const requestedQuantity =
      typeof rawQuantity === 'number' && Number.isFinite(rawQuantity)
        ? Math.floor(rawQuantity)
        : 1;

    if (!ALLOWED_PACK_QUANTITIES.includes(requestedQuantity as (typeof ALLOWED_PACK_QUANTITIES)[number])) {
      return NextResponse.json(
        {
          error: 'Invalid quantity',
          details: `Allowed values: ${ALLOWED_PACK_QUANTITIES.map((value) => `${value}x`).join(', ')}`,
        },
        { status: 400 }
      );
    }
    const quantity = requestedQuantity;
    
    const box = await prisma.box.findUnique({
      where: { id: boxId },
      include: {
        cards: true,
        boosterBoxes: {
          include: {
            catalog: true,
          },
        },
      },
    });

    if (!box) {
      console.error(`Box not found: ${boxId}`);
      return NextResponse.json({ error: 'Box not found' }, { status: 404 });
    }

    const hasCards = box.cards && box.cards.length > 0;
    const hasBoosterBoxes = box.boosterBoxes && box.boosterBoxes.length > 0;
    
    if (!hasCards && !hasBoosterBoxes) {
      console.error(`Box ${boxId} has no items:`, {
        boxId: box.id,
        boxName: box.name,
        cardsCount: box.cards?.length || 0,
        boosterBoxesCount: box.boosterBoxes?.length || 0,
      });
      return NextResponse.json({ 
        error: 'Box has no items', 
        details: 'This box has no cards or booster boxes assigned. Please contact an administrator.',
        boxId: box.id,
        boxName: box.name,
      }, { status: 400 });
    }

    if (!box.isActive) {
      return NextResponse.json({ error: 'Box is not active' }, { status: 400 });
    }

    const totalCost = box.price * quantity;

    if (user.coins < totalCost) {
      return NextResponse.json(
        {
          error: 'Not enough coins',
          details: `Opening ${quantity} pack(s) costs ${totalCost} coins but you only have ${user.coins}.`,
        },
        { status: 400 }
      );
    }

    // Combine cards and booster boxes into a single pool
    const weightedItems = [
      ...box.cards.map((card) => ({
        id: card.id,
        pullRate: Number(card.pullRate),
        type: 'card' as const,
        data: card,
      })),
      ...(box.boosterBoxes || []).map((boosterBox) => ({
        id: boosterBox.id,
        pullRate: Number(boosterBox.pullRate),
        type: 'boosterBox' as const,
        data: boosterBox,
      })),
    ];

    // Validate we have items to draw from
    if (weightedItems.length === 0) {
      return NextResponse.json(
        { error: 'Box has no cards or booster boxes available' },
        { status: 400 }
      );
    }

    // Validate pull rates sum to at least some value
    const totalPullRate = weightedItems.reduce((sum, item) => sum + item.pullRate, 0);
    if (totalPullRate === 0) {
      return NextResponse.json(
        { error: 'All items have zero pull rate - cannot open pack' },
        { status: 400 }
      );
    }

    // Draw items for the pack
    const totalDraws = box.cardsPerPack * quantity;
    const drawnItems = Array.from({ length: totalDraws }).map(() => {
      try {
        return drawItem(weightedItems);
      } catch (error) {
        console.error('Error drawing item:', error);
        throw error;
      }
    });

    // Create pull records
    const pullData = drawnItems
      .map((item) => {
        const itemData = weightedItems.find((i) => i.id === item.id && i.type === item.type)?.data;
        if (!itemData) {
          console.error(`Item not found: ${item.id} (${item.type})`);
          return null;
        }

        if (item.type === 'card') {
          const card = itemData as typeof box.cards[0];
          return {
            userId: user.id,
            boxId: box.id,
            cardId: card.id,
            cardValue: card.priceAvg ? Number(card.priceAvg) : null,
            type: 'card' as const,
          };
        } else {
          const boosterBox = itemData as any;
          return {
            userId: user.id,
            boxId: box.id,
            boosterBoxId: boosterBox.id,
            cardValue: boosterBox.priceAvg
              ? Number(boosterBox.priceAvg)
              : boosterBox.catalog?.priceAvg
              ? Number(boosterBox.catalog.priceAvg)
              : null,
            type: 'boosterBox' as const,
          };
        }
      })
      .filter((pull): pull is NonNullable<typeof pull> => pull !== null);

    if (pullData.length === 0) {
      return NextResponse.json(
        { error: 'Failed to create pull records - no valid items drawn' },
        { status: 500 }
      );
    }

    // Execute all operations in a transaction for atomicity
    const cardPulls = pullData
      .filter((pull) => pull.type === 'card' && pull.cardId)
      .map((pull) => ({
        userId: pull.userId,
        boxId: pull.boxId,
        cardId: pull.cardId!,
        cardValue: pull.cardValue ?? null,
      }));

    const boosterPulls = pullData
      .filter((pull) => pull.type === 'boosterBox' && (pull as any).boosterBoxId)
      .map((pull) => ({
        userId: pull.userId,
        boxId: pull.boxId,
        boosterBoxId: (pull as any).boosterBoxId as string,
        cardValue: pull.cardValue ?? null,
      }));

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { coins: { decrement: totalCost } },
      });

      await tx.box.update({
        where: { id: box.id },
        data: { popularity: { increment: quantity } },
      });

      if (cardPulls.length > 0) {
        await tx.pull.createMany({
          data: cardPulls,
        });
      }

      if (boosterPulls.length > 0) {
        await tx.pull.createMany({
          data: boosterPulls,
        });
      }
    });

    // Format response data
    const responseData = drawnItems
      .map((item) => {
        const itemData = weightedItems.find((i) => i.id === item.id && i.type === item.type)?.data;
        if (!itemData) {
          console.error(`Response data: Item not found: ${item.id} (${item.type})`);
          return null;
        }

        try {
          if (item.type === 'card') {
            const card = itemData as typeof box.cards[0];
            return {
              id: card.id,
              name: card.name,
              rarity: card.rarity,
              imageUrl: card.imageUrlGatherer || card.imageUrlScryfall || '',
              setName: card.setName,
              cardValue: card.priceAvg ? Number(card.priceAvg) : null,
              pullRate: Number(card.pullRate),
              coinValue: card.coinValue || 1,
              type: 'card',
            };
          } else {
            const boosterBox = itemData as any;
            return {
              id: boosterBox.id,
              name: boosterBox.name || boosterBox.catalog?.name || 'Sealed Product',
              rarity: 'Booster Box',
              imageUrl: boosterBox.imageUrl || boosterBox.catalog?.imageUrl || '',
              setName: boosterBox.setName || boosterBox.catalog?.setName || '',
              cardValue: boosterBox.priceAvg
                ? Number(boosterBox.priceAvg)
                : boosterBox.catalog?.priceAvg
                ? Number(boosterBox.catalog.priceAvg)
                : null,
              pullRate: Number(boosterBox.pullRate),
              coinValue: boosterBox.coinValue || boosterBox.diamondCoinValue || 1,
              type: 'boosterBox',
            };
          }
        } catch (error) {
          console.error(`Error formatting item ${item.id}:`, error);
          return null;
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (responseData.length === 0) {
      return NextResponse.json(
        { error: 'Failed to format response data - no valid items' },
        { status: 500 }
      );
    }

    // Get updated user balance after transaction
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { coins: true },
    });

    return NextResponse.json({
      success: true,
      data: responseData,
      balance: updatedUser?.coins ?? user.coins - totalCost,
      packsOpened: quantity,
      totalCost,
      cardsPerPack: box.cardsPerPack,
      totalPulls: responseData.length,
    });
  } catch (error) {
    console.error('Pack opening error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to open pack';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error details:', { errorMessage, errorStack, error });
    return NextResponse.json(
      { 
        error: errorMessage,
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorStack : undefined,
      },
      { status: 500 }
    );
  }
}

