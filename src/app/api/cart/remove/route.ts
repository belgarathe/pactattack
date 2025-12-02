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

    // Find cart item
    const cart = await prisma.cart.findUnique({
      where: { userId: user.id },
      include: { items: true },
    });

    if (!cart) {
      return NextResponse.json({ error: 'Cart not found' }, { status: 404 });
    }

    const cartItem = cart.items.find((item) => item.pullId === pullId);

    if (!cartItem) {
      return NextResponse.json({ error: 'Item not in cart' }, { status: 404 });
    }

    // Remove item from cart (card will automatically appear back in collection since cartItem is null)
    await prisma.cartItem.delete({
      where: { id: cartItem.id },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Item removed from cart and returned to collection' 
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove from cart' },
      { status: 500 }
    );
  }
}

