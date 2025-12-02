import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get cart with items (only pulls that are still in cart)
    const cart = await prisma.cart.findUnique({
      where: { userId: user.id },
      include: {
        items: {
          include: {
            pull: {
              include: {
                card: true,
                boosterBox: {
                  include: {
                    catalog: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!cart) {
      return NextResponse.json({ success: true, data: { items: [], total: 0 } });
    }

    const items = cart.items
      .map((item) => {
        const pull = item.pull;

        if (pull.card) {
          return {
            id: item.id,
            pullId: pull.id,
            card: {
              id: pull.card.id,
              name: pull.card.name,
              rarity: pull.card.rarity,
              imageUrlGatherer: pull.card.imageUrlGatherer,
              imageUrlScryfall: pull.card.imageUrlScryfall,
              setName: pull.card.setName,
              priceAvg: pull.card.priceAvg ? Number(pull.card.priceAvg) : null,
            },
            quantity: item.quantity,
          };
        }

        if (pull.boosterBox) {
          const booster = pull.boosterBox;
          const catalog = booster.catalog;

          return {
            id: item.id,
            pullId: pull.id,
            card: {
              id: booster.id,
              name: booster.name || catalog?.name || 'Sealed Product',
              rarity: booster.productType?.replace(/_/g, ' ') || 'Sealed Product',
              imageUrlGatherer: booster.imageUrl || catalog?.imageUrl || '/placeholder.svg',
              imageUrlScryfall: catalog?.imageUrl || null,
              setName: booster.setName || catalog?.setName || booster.setCode || 'Sealed Product',
              priceAvg: booster.priceAvg
                ? Number(booster.priceAvg)
                : catalog?.priceAvg
                ? Number(catalog.priceAvg)
                : null,
            },
            quantity: item.quantity,
          };
        }

        // Skip pulls that have neither card nor booster data (should not happen)
        return null;
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

    const total = items.reduce((sum, item) => {
      const value = item.card.priceAvg || 0;
      return sum + value;
    }, 0);

    return NextResponse.json({
      success: true,
      data: {
        items,
        total,
        itemCount: cart.items.length,
      },
    });
  } catch (error) {
    console.error('Get cart error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get cart' },
      { status: 500 }
    );
  }
}

