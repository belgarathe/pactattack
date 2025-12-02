import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateBoosterBoxSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  imageUrl: z.string().url().optional(),
  setName: z.string().optional(),
  setCode: z.string().optional(),
  priceAvg: z.number().min(0).optional(),
  pullRate: z.number().min(0).max(100).optional(),
  diamondCoinValue: z.number().int().min(1).optional(),
  boxId: z.string().min(1).optional(),
});

export async function PUT(
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
    const body = await request.json();
    const data = updateBoosterBoxSchema.parse(body);

    // Check if BoosterBox model exists
    if (!('boosterBox' in prisma)) {
      return NextResponse.json(
        { error: 'BoosterBox model not available. Please run: npx prisma generate' },
        { status: 503 }
      );
    }

    // Verify box exists only if boxId is provided
    if (data.boxId) {
      const box = await prisma.box.findUnique({
        where: { id: data.boxId },
      });

      if (!box) {
        return NextResponse.json({ error: 'Box not found' }, { status: 404 });
      }
    }

    const boosterBox = await (prisma as any).boosterBox.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description && { description: data.description }),
        ...(data.imageUrl && { imageUrl: data.imageUrl }),
        ...(data.setName !== undefined && { setName: data.setName || null }),
        ...(data.setCode !== undefined && { setCode: data.setCode || null }),
        ...(data.priceAvg !== undefined && { priceAvg: data.priceAvg || null }),
        ...(data.pullRate !== undefined && { pullRate: data.pullRate }),
        ...(data.diamondCoinValue !== undefined && { diamondCoinValue: data.diamondCoinValue }),
        ...(data.boxId !== undefined && { boxId: data.boxId || null }),
      },
    });

    return NextResponse.json({ success: true, data: boosterBox });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Update booster box error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update booster box' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Check if BoosterBox model exists
    if (!('boosterBox' in prisma)) {
      return NextResponse.json(
        { error: 'BoosterBox model not available. Please run: npx prisma generate' },
        { status: 503 }
      );
    }

    await (prisma as any).boosterBox.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete booster box error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete booster box' },
      { status: 500 }
    );
  }
}

