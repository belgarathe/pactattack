import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const TRANSACTION_OPTIONS = {
  maxWait: 5_000,
  timeout: 60_000,
} as const;
export async function POST(request: Request) {
  try {
    console.log('[SELL API] Starting sell request...');
    
    const session = await getCurrentSession();
    if (!session?.user?.email) {
      console.log('[SELL API] Unauthorized - no session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[SELL API] Session found:', session.user.email);

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, email: true, coins: true },
    });

    if (!user) {
      console.log('[SELL API] User not found');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('[SELL API] User found:', user.id, 'Current balance:', user.coins);

    const body = await request.json();
    const { pullId } = body;

    console.log('[SELL API] PullId received:', pullId);
    console.log('[SELL API] PullId type:', typeof pullId);
    console.log('[SELL API] PullId length:', pullId?.length);

    if (!pullId || typeof pullId !== 'string' || pullId.trim() === '') {
      console.log('[SELL API] Missing or invalid pullId');
      return NextResponse.json({ error: 'Missing or invalid pullId' }, { status: 400 });
    }

    const trimmedPullId = pullId.trim();

    // Find the pull and verify ownership, check for order items
    const pull = await prisma.pull.findUnique({
      where: { id: trimmedPullId },
      include: {
        card: true,
        boosterBox: true,
        user: {
          select: { id: true, email: true },
        },
        orderItems: {
          select: {
            id: true,
            orderId: true,
            order: {
              select: {
                status: true,
              },
            },
          },
        },
        cartItem: {
          select: {
            id: true,
          },
        },
        battlePull: {
          select: {
            id: true,
            itemType: true,
            itemName: true,
            itemImage: true,
            itemSetName: true,
            itemRarity: true,
            battle: {
              select: {
                status: true,
              },
            },
          },
        },
      },
    });

    if (!pull) {
      console.log('[SELL API] Pull not found:', trimmedPullId);
      console.log('[SELL API] User ID:', user.id);
      console.log('[SELL API] Checking if pull exists for this user...');
      
      // Check if user has any pulls to help debug
      const userPulls = await prisma.pull.findMany({
        where: { userId: user.id },
        select: { id: true },
        take: 5,
      });
      console.log('[SELL API] User has pulls:', userPulls.length);
      console.log('[SELL API] Sample pull IDs:', userPulls.map(p => p.id));
      
      return NextResponse.json({ 
        error: 'Pull not found. This card may have already been sold or removed.',
        details: 'Please refresh the page to see your current collection.'
      }, { status: 404 });
    }

    const saleCardName = pull.card?.name ?? pull.boosterBox?.name ?? 'Sealed Product';
    const saleCardImage =
      pull.card?.imageUrlGatherer ||
      pull.card?.imageUrlScryfall ||
      pull.boosterBox?.imageUrl ||
      '';
    const saleCardId = pull.card?.id ?? pull.boosterBox?.id ?? trimmedPullId;
    console.log('[SELL API] Pull found:', pull.id, 'Item:', saleCardName);

    if (pull.userId !== user.id) {
      console.log('[SELL API] Ownership mismatch. Pull userId:', pull.userId, 'User id:', user.id);
      return NextResponse.json({ error: 'Not your card' }, { status: 403 });
    }

    // Check if pull is in a blocking order (PAID, PROCESSING, SHIPPED, DELIVERED)
    const blockingOrderStatuses = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
    if (pull.orderItems && pull.orderItems.length > 0) {
      const hasBlockingOrder = pull.orderItems.some((item) => {
        const status = item.order?.status;
        return status && blockingOrderStatuses.includes(status);
      });
      
      if (hasBlockingOrder) {
        const blockingStatuses = pull.orderItems
          .filter((item) => {
            const status = item.order?.status;
            return status && blockingOrderStatuses.includes(status);
          })
          .map((item) => item.order?.status)
          .filter((s): s is string => s !== undefined);
        
        console.log('[SELL API] Card is in blocking order:', blockingStatuses);
        return NextResponse.json(
          { 
            error: `Card cannot be sold (it is in an order with status: ${[...new Set(blockingStatuses)].join(', ')})`,
            details: 'Cards in PAID, PROCESSING, SHIPPED, or DELIVERED orders cannot be sold.'
          },
          { status: 400 }
        );
      }
    }

    // Prevent selling pulls that are referenced in battle history
    if (pull.battlePull) {
      const battleStatus = pull.battlePull.battle?.status;
      if (battleStatus && battleStatus !== 'FINISHED') {
        return NextResponse.json(
          {
            error: 'Card cannot be sold until the battle is finished.',
            details: 'Please wait for the battle to conclude before selling or ordering this card.',
          },
          { status: 400 },
        );
      }
    }

    // Get sell value from card/booster coin value (this is the "Sell for" value)
    const sellValue =
      pull.card?.coinValue ??
      pull.boosterBox?.diamondCoinValue ??
      1;

    console.log('[SELL API] Sell value:', sellValue, 'Source coinValue:', pull.card?.coinValue ?? pull.boosterBox?.diamondCoinValue);

    if (sellValue <= 0) {
      console.log('[SELL API] Invalid sell value:', sellValue);
      return NextResponse.json(
        { error: 'Card has no value to sell' },
        { status: 400 }
      );
    }

    console.log('[SELL API] Starting transaction...');

    // Delete card from collection, credit coins to user account, and record sale
    // All operations in a transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      console.log('[SELL API] Transaction step 1: Checking and cleaning up OrderItems...');
      
      // Step 1a: Query ALL OrderItems for this pull directly (most reliable)
      const allOrderItemsForPull = await tx.orderItem.findMany({
        where: {
          pullId: trimmedPullId,
        },
        include: {
          order: {
            select: {
              status: true,
            },
          },
        },
      });
      
      // Step 1b: Check for blocking orders
      const blockingOrderItems = allOrderItemsForPull.filter((item) => {
        const status = item.order?.status;
        return status && blockingOrderStatuses.includes(status);
      });
      
      if (blockingOrderItems.length > 0) {
        const blockingStatuses = [...new Set(blockingOrderItems.map((item) => item.order?.status).filter((s): s is string => s !== undefined))];
        throw new Error(`Card cannot be sold (it is in an order with status: ${blockingStatuses.join(', ')})`);
      }
      
      // Step 1c: Delete ALL OrderItems for this pull (non-blocking ones)
      // This removes foreign key constraints before deleting the Pull
      if (allOrderItemsForPull.length > 0) {
        const orderItemIds = allOrderItemsForPull.map((item) => item.id);
        await tx.orderItem.deleteMany({
          where: {
            id: { in: orderItemIds },
          },
        });
        console.log('[SELL API] Deleted', orderItemIds.length, 'OrderItems');
      }
      
      // Step 1d: Delete CartItem if present (CartItem has cascade, but let's be explicit)
      const cartItem = await tx.cartItem.findUnique({
        where: { pullId: trimmedPullId },
        select: { id: true },
      });
      
      if (cartItem) {
        await tx.cartItem.delete({
          where: { id: cartItem.id },
        });
        console.log('[SELL API] Removed item from cart');
      }
      
      if (pull.battlePull) {
      await tx.battlePull.update({
        where: { id: pull.battlePull.id },
        data: {
          pullId: null,
          itemName: pull.battlePull.itemName ?? pull.card?.name ?? pull.boosterBox?.name ?? null,
          itemImage:
            pull.battlePull.itemImage ??
            pull.card?.imageUrlGatherer ??
            pull.card?.imageUrlScryfall ??
            pull.boosterBox?.imageUrl ??
            null,
          itemSetName: pull.battlePull.itemSetName ?? pull.card?.setName ?? pull.boosterBox?.setName ?? null,
          itemRarity: pull.battlePull.itemRarity ?? pull.card?.rarity ?? null,
          cardId: pull.cardId ?? pull.battlePull.cardId,
          boosterBoxId: pull.boosterBoxId ?? pull.battlePull.boosterBoxId,
        },
      });
      }

      console.log('[SELL API] Transaction step 2: Deleting pull...');
      // Step 2: Delete the pull (removes card from collection)
      // All OrderItems have been deleted, so foreign key constraint is satisfied
      await tx.pull.delete({
        where: { id: trimmedPullId },
      });
      console.log('[SELL API] Pull deleted successfully');

      console.log('[SELL API] Transaction step 3: Crediting coins...');
      // Step 3: Credit coins to user account (increment by sell value)
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          coins: { increment: sellValue },
        },
        select: { coins: true },
      });
      console.log('[SELL API] Coins credited. New balance:', updatedUser.coins);

      console.log('[SELL API] Transaction step 4: Recording sale...');
      
      // Step 4: Record sale in history (card moves to sales history)
      // Try to use saleHistory from transaction client
      let saleHistoryCreated = false;
      try {
        // Check if saleHistory exists on tx
        if ('saleHistory' in tx && typeof (tx as any).saleHistory === 'object') {
          await (tx as any).saleHistory.create({
            data: {
              userId: user.id,
              cardId: saleCardId,
              cardName: saleCardName,
              cardImage: saleCardImage,
              coinsReceived: sellValue,
            },
          });
          saleHistoryCreated = true;
          console.log('[SELL API] Sale recorded in history');
        } else {
          console.log('[SELL API] saleHistory not available in tx, will use fallback');
        }
      } catch (err) {
        console.log('[SELL API] Error creating saleHistory in tx:', err);
        console.log('[SELL API] Will use fallback method');
      }

      return { updatedUser, saleHistoryCreated };
    }, TRANSACTION_OPTIONS);

    // If saleHistory wasn't created in transaction, create it now
    if (!result.saleHistoryCreated) {
      console.log('[SELL API] Creating sale history outside transaction (fallback)...');
      await prisma.saleHistory.create({
        data: {
          userId: user.id,
          cardId: saleCardId,
          cardName: saleCardName,
          cardImage: saleCardImage,
          coinsReceived: sellValue,
        },
      });
      console.log('[SELL API] Sale history created (fallback)');
    }

    console.log('[SELL API] Transaction completed successfully. New balance:', result.updatedUser.coins);

    return NextResponse.json({
      success: true,
      coinsReceived: sellValue,
      newBalance: result.updatedUser.coins,
      message: 'Card sold successfully and moved to sales history',
    });
  } catch (error) {
    console.error('[SELL API] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to sell card';
    console.error('[SELL API] Error details:', {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

