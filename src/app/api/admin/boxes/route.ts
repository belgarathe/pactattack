import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma, ensureBoxGamesReady } from '@/lib/prisma';
import { z } from 'zod';

const cardGameEnum = z.enum([
  'MAGIC_THE_GATHERING',
  'ONE_PIECE',
  'POKEMON',
  'LORCANA',
] as const);

const heroDisplayModeEnum = z.enum(['AUTO', 'CARD', 'SEALED'] as const);

const boxSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  imageUrl: z.string().url(),
  price: z.number().int().positive(),
  cardsPerPack: z.number().int().positive(),
  featured: z.boolean().optional().default(false),
  games: z.array(cardGameEnum).min(1),
  heroDisplayMode: heroDisplayModeEnum.optional().default('AUTO'),
});

export async function POST(request: Request) {
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

    const body = await request.json();
    const data = boxSchema.parse(body);

    const box = await prisma.box.create({
      data: {
        name: data.name,
        description: data.description,
        imageUrl: data.imageUrl,
        price: data.price,
        cardsPerPack: data.cardsPerPack,
        featured: data.featured ?? false,
        heroDisplayMode: data.heroDisplayMode,
        games: {
          set: data.games,
        },
      },
    });

    return NextResponse.json({ success: true, box });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    console.error('Box creation error:', error);
    return NextResponse.json({ error: 'Failed to create box' }, { status: 500 });
  }
}

export async function GET() {
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

    const boxes = await prisma.box.findMany({
      include: {
        _count: {
          select: { cards: true, pulls: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ boxes });
  } catch (error) {
    console.error('Error fetching boxes:', error);
    return NextResponse.json({ error: 'Failed to fetch boxes' }, { status: 500 });
  }
}




