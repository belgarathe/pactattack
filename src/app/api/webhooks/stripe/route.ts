import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    try {
      const userId = session.metadata?.userId;
      const orderId = session.metadata?.orderId;
      const orderNumber = session.metadata?.orderNumber;
      const coins = parseInt(session.metadata?.coins || '0');

      // Handle physical card orders
      if (orderId && orderNumber) {
        console.log('Processing physical card order:', orderNumber);

        // Get shipping address from session
        const shippingAddress = session.shipping_details
          ? JSON.stringify({
              name: session.shipping_details.name,
              address: session.shipping_details.address,
            })
          : null;

        // Update order status to PAID, clear cart, and permanently delete Pulls (cards are being shipped)
        await prisma.$transaction(async (tx) => {
          // Get order with items to get pullIds
          const order = await tx.order.findUnique({
            where: { id: orderId },
            include: {
              items: true,
            },
          });

          if (!order) {
            throw new Error('Order not found');
          }

          // Get all pullIds from order items
          const pullIds = order.items.map((item) => item.pullId);

          // Update order status
          await tx.order.update({
            where: { id: orderId },
            data: {
              status: 'PAID',
              shippingAddress: shippingAddress,
            },
          });

          // Delete OrderItems first (to remove foreign key constraints)
          // Note: We keep the Order record for history, but remove the items
          // since the Pulls are being deleted
          await tx.orderItem.deleteMany({
            where: {
              orderId: orderId,
            },
          });

          // Release battle references before deleting pulls
          await tx.battlePull.updateMany({
            where: {
              pullId: { in: pullIds },
            },
            data: {
              pullId: null,
            },
          });

          // Permanently delete Pulls (cards are being shipped, remove from user account)
          await tx.pull.deleteMany({
            where: {
              id: { in: pullIds },
              userId: userId!,
            },
          });

          // Clear cart (items are now shipped)
          const cart = await tx.cart.findUnique({
            where: { userId: userId! },
            include: { items: true },
          });

          if (cart) {
            await tx.cartItem.deleteMany({
              where: { cartId: cart.id },
            });
          }
        });

        console.log('Order processed successfully:', orderNumber);
      }
      // Handle coin purchases
      else if (userId && coins > 0) {
        console.log('Processing coin purchase:', coins);

        await prisma.$transaction([
          prisma.user.update({
            where: { id: userId },
            data: { coins: { increment: coins } },
          }),
          prisma.transaction.create({
            data: {
              userId,
              amount: (session.amount_total || 0) / 100,
              coins: coins,
              stripePaymentId: session.id,
              status: 'COMPLETED',
            },
          }),
        ]);

        console.log('Coin purchase processed successfully');
      } else {
        console.error('Missing metadata in checkout session');
        return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
      }
    } catch (error) {
      console.error('Error processing webhook:', error);
      return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}

