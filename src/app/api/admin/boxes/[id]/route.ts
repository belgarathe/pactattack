import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma, ensureBoxGamesReady } from '@/lib/prisma';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const cardGameEnum = z.enum([
  'MAGIC_THE_GATHERING',
  'ONE_PIECE',
  'POKEMON',
  'LORCANA',
] as const);

const heroDisplayModeEnum = z.enum(['AUTO', 'CARD', 'SEALED'] as const);

const boxUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  imageUrl: z.string().url().optional(),
  price: z.number().int().positive().optional(),
  cardsPerPack: z.number().int().positive().optional(),
  featured: z.boolean().optional(),
  isActive: z.boolean().optional(),
  games: z.array(cardGameEnum).min(1).optional(),
  heroDisplayMode: heroDisplayModeEnum.optional(),
  heroCardId: z.string().nullable().optional(),
});

// Update box
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureBoxGamesReady();
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
    const body = await request.json();
    const data = boxUpdateSchema.parse(body);
    const { games, heroDisplayMode, heroCardId, ...rest } = data;

    const updateData: Record<string, unknown> = { ...rest };
    if (games) {
      updateData.games = { set: games };
    }
    if (heroDisplayMode) {
      updateData.heroDisplayMode = heroDisplayMode;
      if (heroDisplayMode !== 'CARD' && heroCardId === undefined) {
        updateData.heroCardId = null;
      }
    }
    if (heroCardId !== undefined) {
      if (heroCardId === null) {
        updateData.heroCardId = null;
      } else {
        const heroCard = await prisma.card.findFirst({
          where: {
            id: heroCardId,
            boxId: id,
          },
          select: { id: true },
        });
        if (!heroCard) {
          return NextResponse.json(
            { error: 'Selected hero card does not belong to this box.' },
            { status: 400 }
          );
        }
        updateData.heroCardId = heroCardId;
      }
    }

    const box = await prisma.box.update({
      where: { id },
      data: updateData,
      include: {
        cards: true,
        heroCard: true,
      },
    });

    // Convert Decimal values to numbers for client components
    const serializedBox = {
      ...box,
      cards: box.cards.map((card) => ({
        ...card,
        pullRate: Number(card.pullRate),
        diamondCoinValue: card.diamondCoinValue,
        priceLow: card.priceLow ? Number(card.priceLow) : null,
        priceAvg: card.priceAvg ? Number(card.priceAvg) : null,
        priceHigh: card.priceHigh ? Number(card.priceHigh) : null,
        sourceGame: card.sourceGame,
      })),
      heroCard: box.heroCard
        ? {
            ...box.heroCard,
            pullRate: Number(box.heroCard.pullRate),
            priceLow: box.heroCard.priceLow ? Number(box.heroCard.priceLow) : null,
            priceAvg: box.heroCard.priceAvg ? Number(box.heroCard.priceAvg) : null,
            priceHigh: box.heroCard.priceHigh ? Number(box.heroCard.priceHigh) : null,
          }
        : null,
    };

    // Revalidate marketplace and box pages to show updated data immediately
    revalidatePath('/marketplace');
    revalidatePath(`/open/${id}`);
    revalidatePath('/admin/boxes');

    return NextResponse.json({ success: true, box: serializedBox });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    console.error('Box update error:', error);
    return NextResponse.json({ error: 'Failed to update box' }, { status: 500 });
  }
}

// Get box by ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureBoxGamesReady();
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

    const box = await prisma.box.findUnique({
      where: { id },
      include: {
        cards: true,
        heroCard: true,
        _count: {
          select: { pulls: true },
        },
      },
    });

    if (!box) {
      return NextResponse.json({ error: 'Box not found' }, { status: 404 });
    }

    // Convert Decimal values to numbers for client components
    const serializedBox = {
      ...box,
      cards: box.cards.map((card) => ({
        ...card,
        pullRate: Number(card.pullRate),
        diamondCoinValue: card.diamondCoinValue,
        priceLow: card.priceLow ? Number(card.priceLow) : null,
        priceAvg: card.priceAvg ? Number(card.priceAvg) : null,
        priceHigh: card.priceHigh ? Number(card.priceHigh) : null,
        sourceGame: card.sourceGame,
      })),
      heroCard: box.heroCard
        ? {
            ...box.heroCard,
            pullRate: Number(box.heroCard.pullRate),
            priceLow: box.heroCard.priceLow ? Number(box.heroCard.priceLow) : null,
            priceAvg: box.heroCard.priceAvg ? Number(box.heroCard.priceAvg) : null,
            priceHigh: box.heroCard.priceHigh ? Number(box.heroCard.priceHigh) : null,
            sourceGame: box.heroCard.sourceGame,
          }
        : null,
    };

    return NextResponse.json({ box: serializedBox });
  } catch (error) {
    console.error('Error fetching box:', error);
    return NextResponse.json({ error: 'Failed to fetch box' }, { status: 500 });
  }
}

// Delete box
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureBoxGamesReady();
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

    await prisma.box.delete({
      where: { id },
    });

    // Revalidate marketplace to remove deleted box immediately
    revalidatePath('/marketplace');
    revalidatePath('/admin/boxes');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Box deletion error:', error);
    return NextResponse.json({ error: 'Failed to delete box' }, { status: 500 });
  }
}

