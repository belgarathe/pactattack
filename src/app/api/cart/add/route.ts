import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
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

    const { pullId } = await request.json();

    if (!pullId) {
      return NextResponse.json({ error: 'Missing pullId' }, { status: 400 });
    }

    // Verify pull belongs to user
    const pull = await prisma.pull.findUnique({
      where: { id: pullId },
      include: { cartItem: true },
    });

    if (!pull) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    if (pull.userId !== user.id) {
      return NextResponse.json({ error: 'Not your card' }, { status: 403 });
    }

    // Check if already in cart
    if (pull.cartItem) {
      return NextResponse.json({ error: 'Card already in cart' }, { status: 400 });
    }

    // Get or create cart
    let cart = await prisma.cart.findUnique({
      where: { userId: user.id },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId: user.id },
      });
    }

    // Add item to cart
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        pullId: pull.id,
        quantity: 1,
      },
    });

    return NextResponse.json({ success: true, message: 'Card added to cart' });
  } catch (error) {
    console.error('Add to cart error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add to cart' },
      { status: 500 }
    );
  }
}




