import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

const SHIPPING_COST = 5.0; // 5 EUR

export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get user's cart
    const cart = await prisma.cart.findUnique({
      where: { userId: user.id },
      include: {
        items: {
          include: {
            pull: {
              include: {
                card: true,
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    // Get shipping address from request body
    const body = await request.json();
    const shippingAddress = body.shippingAddress;
    const saveAddress = body.saveAddress || false;

    // Save address to user profile if requested
    if (saveAddress && shippingAddress) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          name: shippingAddress.name || undefined,
          addressLine1: shippingAddress.address?.line1 || null,
          addressLine2: shippingAddress.address?.line2 || null,
          city: shippingAddress.address?.city || null,
          state: shippingAddress.address?.state || null,
          postalCode: shippingAddress.address?.postal_code || null,
          country: shippingAddress.address?.country || null,
          phone: shippingAddress.phone || null,
        },
      });
    }

    // Calculate subtotal (using Cardmarket prices)
    const subtotal = cart.items.reduce((sum, item) => {
      const cardValue = item.pull.card.priceAvg ? Number(item.pull.card.priceAvg) : 0;
      return sum + cardValue;
    }, 0);

    const total = subtotal + SHIPPING_COST;

    // Generate order number
    const orderNumber = `PA-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Create order (pending payment)
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        orderNumber,
        subtotal: subtotal,
        shipping: SHIPPING_COST,
        total: total,
        status: 'PENDING',
        items: {
          create: cart.items.map((item) => ({
            pullId: item.pull.id,
            cardName: item.pull.card.name,
            cardImage: item.pull.card.imageUrlGatherer || item.pull.card.imageUrlScryfall || '',
            quantity: item.quantity,
          })),
        },
      },
    });

    // Create Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        // Card items
        ...cart.items.map((item) => ({
          price_data: {
            currency: 'eur',
            product_data: {
              name: item.pull.card.name,
              description: `${item.pull.card.setName} • ${item.pull.card.rarity}`,
              images: item.pull.card.imageUrlGatherer
                ? [item.pull.card.imageUrlGatherer]
                : item.pull.card.imageUrlScryfall
                ? [item.pull.card.imageUrlScryfall]
                : [],
            },
            unit_amount: item.pull.card.priceAvg
              ? Math.round(Number(item.pull.card.priceAvg) * 100)
              : 0,
          },
          quantity: item.quantity,
        })),
        // Shipping
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Shipping',
              description: 'Physical card shipping',
            },
            unit_amount: Math.round(SHIPPING_COST * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/cart?success=true&order=${orderNumber}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/checkout?canceled=true`,
      metadata: {
        userId: user.id,
        orderId: order.id,
        orderNumber: order.orderNumber,
      },
      // Collect shipping address (Stripe will handle this)
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'CH', 'SE', 'NO', 'DK', 'FI', 'PL', 'CZ', 'IE', 'PT', 'GR'],
      },
    });

    // Update order with Stripe session ID
    await prisma.order.update({
      where: { id: order.id },
      data: {
        stripePaymentId: checkoutSession.id,
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Checkout creation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create checkout' },
      { status: 500 }
    );
  }
}

