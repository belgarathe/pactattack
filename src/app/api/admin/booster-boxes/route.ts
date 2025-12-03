import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const boosterBoxSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  imageUrl: z.string().url(),
  setName: z.string().optional(),
  setCode: z.string().optional(),
  priceAvg: z.number().min(0).optional(),
  pullRate: z.number().min(0).max(100),
  coinValue: z.number().int().min(1),
  boxId: z.string().optional(), // Optional - can be added later
});

export async function POST(request: Request) {
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

    const body = await request.json();
    const data = boosterBoxSchema.parse(body);

    // Verify box exists only if boxId is provided
    if (data.boxId) {
      const box = await prisma.box.findUnique({
        where: { id: data.boxId },
      });

      if (!box) {
        return NextResponse.json({ error: 'Box not found' }, { status: 404 });
      }
    }

    // Check if BoosterBox model exists
    if (!('boosterBox' in prisma)) {
      return NextResponse.json(
        { error: 'BoosterBox model not available. Please run: npx prisma generate' },
        { status: 503 }
      );
    }

    const boosterBox = await (prisma as any).boosterBox.create({
      data: {
        name: data.name,
        description: data.description,
        imageUrl: data.imageUrl,
        setName: data.setName || null,
        setCode: data.setCode || null,
        priceAvg: data.priceAvg || null,
        pullRate: data.pullRate,
        coinValue: data.coinValue,
        boxId: data.boxId || null, // Can be null for standalone booster boxes
      },
    });

    return NextResponse.json({ success: true, data: boosterBox });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Create booster box error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create booster box' },
      { status: 500 }
    );
  }
}

