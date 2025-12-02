import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const cardUpdateSchema = z.object({
  pullRate: z.number().min(0).max(100).optional(),
  diamondCoinValue: z.number().int().min(1).optional(),
});

// Update individual card pull rate and coin value
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; cardId: string }> }
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

    const { id: boxId, cardId } = await params;
    const body = await request.json();
    const data = cardUpdateSchema.parse(body);

    // Verify box exists
    const box = await prisma.box.findUnique({
      where: { id: boxId },
    });

    if (!box) {
      return NextResponse.json({ error: 'Box not found' }, { status: 404 });
    }

    // Verify card exists and belongs to this box
    const card = await prisma.card.findUnique({
      where: { id: cardId },
    });

    if (!card || card.boxId !== boxId) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    // Update card
    const updatedCard = await prisma.card.update({
      where: { id: cardId },
      data: {
        ...(data.pullRate !== undefined && { pullRate: data.pullRate }),
        ...(data.diamondCoinValue !== undefined && { diamondCoinValue: data.diamondCoinValue }),
      },
    });

    // Revalidate pages to show updated data immediately
    revalidatePath('/marketplace');
    revalidatePath(`/open/${boxId}`);
    revalidatePath('/admin/boxes');
    revalidatePath(`/admin/boxes/edit/${boxId}`);

    return NextResponse.json({
      success: true,
      card: {
        ...updatedCard,
        pullRate: Number(updatedCard.pullRate),
        diamondCoinValue: updatedCard.diamondCoinValue,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Card update error:', error);
    return NextResponse.json({ error: 'Failed to update card' }, { status: 500 });
  }
}




