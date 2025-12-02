import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - List active boxes (public endpoint for battle creation)
export async function GET() {
  try {
    const boxes = await prisma.box.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        price: true,
        isActive: true,
        cardsPerPack: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      boxes,
    });
  } catch (error) {
    console.error('[BOXES API] Error fetching boxes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch boxes' },
      { status: 500 }
    );
  }
}







