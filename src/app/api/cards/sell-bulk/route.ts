import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const bulkSellSchema = z.object({
  pullIds: z.array(z.string().min(1)).min(1),
});

const TRANSACTION_OPTIONS = {
  maxWait: 5_000,
  timeout: 60_000,
} as const;

export async function POST(request: Request) {
  try {
    console.log('[BULK SELL API] Starting bulk sell request...');
    
    const session = await getCurrentSession();
    if (!session?.user?.email) {
      console.log('[BULK SELL API] Unauthorized - no session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[BULK SELL API] Session found:', session.user.email);

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, email: true, coins: true },
    });

    if (!user) {
      console.log('[BULK SELL API] User not found');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('[BULK SELL API] User found:', user.id, 'Current balance:', user.coins);

    const body = await request.json();
    const { pullIds } = bulkSellSchema.parse(body);

    console.log('[BULK SELL API] PullIds received:', pullIds.length);

    // Validate all pulls exist and belong to user
    const pulls = await prisma.pull.findMany({
      where: {
        id: { in: pullIds },
        userId: user.id,
      },
      include: {
        card: true,
        boosterBox: true,
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

    const pullMap = new Map(pulls.map((pull) => [pull.id, pull]));
    const missingPullIds = pullIds.filter((id) => !pullMap.has(id));

    if (pulls.length === 0) {
      console.log('[BULK SELL API] No pulls found for provided ids');
      return NextResponse.json(
        { error: 'None of the selected cards were found. Please refresh and try again.' },
        { status: 404 }
      );
    }

    if (missingPullIds.length > 0) {
      console.warn('[BULK SELL API] Missing pulls (not found or not owned by user):', missingPullIds);
    }

    // Only block pulls from orders that are PAID, PROCESSING, or SHIPPED
    // Allow selling from PENDING orders (payment not completed) and CANCELLED/REFUNDED orders
    // PENDING orders will have their OrderItems deleted automatically
    const blockingOrderStatuses = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
    
    // Debug: Log order statuses for each pull
    pulls.forEach((pull) => {
      if (pull.orderItems && pull.orderItems.length > 0) {
        const orderStatuses = pull.orderItems.map((item) => item.order?.status || 'UNKNOWN');
        console.log(`[BULK SELL API] Pull ${pull.id} has orderItems with statuses:`, orderStatuses);
      }
    });
    
    const sellablePulls = pulls.filter((pull) => {
      // If no orderItems, it's sellable
      if (!pull.orderItems || pull.orderItems.length === 0) {
        if (pull.battlePull && pull.battlePull.battle?.status && pull.battlePull.battle.status !== 'FINISHED') {
          console.log(`[BULK SELL API] Pull ${pull.id} locked by active battle`);
          return false;
        }
        return true;
      }
      
      // Check if ANY orderItems are from blocking orders (PAID, PROCESSING, SHIPPED, DELIVERED)
      const hasBlockingOrders = pull.orderItems.some((item) => {
        const status = item.order?.status;
        if (!status) {
          console.warn(`[BULK SELL API] OrderItem ${item.id} has no order status, allowing sale`);
          return false; // If order status is missing, allow sale (safer)
        }
        return blockingOrderStatuses.includes(status);
      });
      
      // Only block if there's a blocking order
      const battleLocked =
        pull.battlePull && pull.battlePull.battle?.status && pull.battlePull.battle.status !== 'FINISHED';
      const isSellable = !hasBlockingOrders && !battleLocked;
      if (!isSellable) {
        const statuses = pull.orderItems.map((item) => item.order?.status || 'UNKNOWN').join(', ');
        console.log(`[BULK SELL API] Blocking pull ${pull.id} - blocking order statuses: ${statuses}`);
        if (battleLocked) {
          console.log('[BULK SELL API] Pull is also part of an active battle.');
        }
      } else {
        const statuses = pull.orderItems.map((item) => item.order?.status || 'UNKNOWN').join(', ');
        console.log(`[BULK SELL API] Allowing pull ${pull.id} - order statuses: ${statuses} (will clean up OrderItems)`);
      }
      return isSellable;
    });
    
    const pullsInOrders = pulls.filter((pull) => {
      if (!pull.orderItems || pull.orderItems.length === 0) return false;
      return pull.orderItems.some((item) => {
        const status = item.order?.status;
        return status && blockingOrderStatuses.includes(status);
      });
    });

    const pullsInActiveBattles = pulls.filter(
      (pull) => pull.battlePull && pull.battlePull.battle?.status && pull.battlePull.battle.status !== 'FINISHED'
    );

    if (sellablePulls.length === 0) {
      // Get the blocking order statuses for better error message
      const blockingStatuses = [...new Set(
        pulls.flatMap((pull) => 
          pull.orderItems
            ?.filter((item) => {
              const status = item.order?.status;
              return status && ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(status);
            })
            .map((item) => item.order?.status) || []
        )
      )];
      
      const reasons: string[] = [];
      if (blockingStatuses.length > 0) {
        reasons.push(`orders with status: ${blockingStatuses.join(', ')}`);
      }
      if (pullsInActiveBattles.length > 0) {
        reasons.push('active battles');
      }

      return NextResponse.json(
        { 
          error: `None of the selected cards can be sold (${reasons.join(' and ') || 'constraints apply'})`,
          details: 'Cards in PAID/PROCESSING/SHIPPED/DELIVERED orders or tied to active battles cannot be sold.',
        },
        { status: 400 }
      );
    }

    if (pullsInOrders.length > 0) {
      console.log('[BULK SELL API] Filtered out', pullsInOrders.length, 'pulls that are in blocking orders (PAID/PROCESSING/SHIPPED/DELIVERED)');
    }

    console.log('[BULK SELL API] Found', sellablePulls.length, 'pulls to sell (filtered out', pullsInOrders.length, 'in orders)');

    // Calculate total coins to receive
    let totalCoins = 0;
    const salesData: Array<{
      pullId: string;
      cardId: string;
      cardName: string;
      cardImage: string;
      coinsReceived: number;
    }> = [];
    const sellablePullIds = sellablePulls.map((p) => p.id);

    for (const pull of sellablePulls) {
      const sellValue =
        pull.card?.coinValue ??
        pull.boosterBox?.diamondCoinValue ??
        1;
      totalCoins += sellValue;
      salesData.push({
        pullId: pull.id,
        cardId: pull.card?.id ?? pull.boosterBox?.id ?? pull.id,
        cardName: pull.card?.name ?? pull.boosterBox?.name ?? 'Sealed Product',
        cardImage:
          pull.card?.imageUrlGatherer ||
          pull.card?.imageUrlScryfall ||
          pull.boosterBox?.imageUrl ||
          '',
        coinsReceived: sellValue,
      });
    }

    console.log('[BULK SELL API] Total coins to receive:', totalCoins);

    // Process all sales in a transaction
    const result = await prisma.$transaction(async (tx) => {
      console.log('[BULK SELL API] Transaction step 1: Removing from cart and deleting pulls...');
      
      // Step 1a: Remove any cart items first (CartItem has cascade, but let's be explicit)
      const cartItemsToDelete = sellablePulls
        .filter((p) => p.cartItem)
        .map((p) => p.cartItem!.id);
      
      if (cartItemsToDelete.length > 0) {
        await tx.cartItem.deleteMany({
          where: {
            id: { in: cartItemsToDelete },
          },
        });
        console.log('[BULK SELL API] Removed', cartItemsToDelete.length, 'items from cart');
      }
      
      // Step 1b: Check for blocking orders and clean up non-blocking OrderItems
      // Only block pulls in PAID, PROCESSING, SHIPPED, DELIVERED orders
      // Delete OrderItems from PENDING, CANCELLED, REFUNDED orders (allow selling)
      const blockingOrderStatuses = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
      
      // Get all orderItems for these pulls
      const allOrderItems = await tx.orderItem.findMany({
        where: {
          pullId: { in: sellablePullIds },
        },
        include: {
          order: {
            select: {
              status: true,
            },
          },
        },
      });
      
      // Separate into blocking and non-blocking order items
      const blockingOrderItems = allOrderItems.filter((item) => 
        blockingOrderStatuses.includes(item.order.status)
      );
      const nonBlockingOrderItems = allOrderItems.filter((item) => 
        !blockingOrderStatuses.includes(item.order.status)
      );
      
      // Get pullIds that are in blocking orders (cannot be sold)
      const pullIdsInBlockingOrders = new Set(blockingOrderItems.map((item) => item.pullId));
      
      // Delete OrderItems from non-blocking orders (PENDING, CANCELLED, REFUNDED)
      // This allows selling these pulls
      if (nonBlockingOrderItems.length > 0) {
        const nonBlockingOrderItemIds = nonBlockingOrderItems.map((item) => item.id);
        await tx.orderItem.deleteMany({
          where: {
            id: { in: nonBlockingOrderItemIds },
          },
        });
        console.log('[BULK SELL API] Deleted', nonBlockingOrderItemIds.length, 'OrderItems from non-blocking orders (PENDING/CANCELLED/REFUNDED)');
      }
      
      // Safe to delete pulls that are NOT in blocking orders
      let safeToDeleteIds = sellablePullIds.filter((id) => !pullIdsInBlockingOrders.has(id));
      
      if (safeToDeleteIds.length !== sellablePullIds.length) {
        const blockedCount = sellablePullIds.length - safeToDeleteIds.length;
        const blockingStatuses = [...new Set(blockingOrderItems.map((item) => item.order.status))];
        console.warn('[BULK SELL API] Some pulls are in blocking orders, skipping:', blockedCount, 'Statuses:', blockingStatuses);
      }
      
      if (safeToDeleteIds.length === 0) {
        const blockingStatuses = [
          ...new Set(
            blockingOrderItems
              .map((item) => item.order.status)
              .filter((status): status is string => Boolean(status)),
          ),
        ];
        const reasonText = blockingStatuses.length
          ? `cards are in orders with status: ${blockingStatuses.join(', ')}`
          : 'order constraints';
        throw new Error(`No pulls can be deleted (${reasonText}).`);
      }

      const pullMapForTx = new Map(sellablePulls.map((pull) => [pull.id, pull]));
      for (const pullId of safeToDeleteIds) {
        const pull = pullMapForTx.get(pullId);
        if (pull?.battlePull) {
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
      }
      
      // Step 1c: Delete only pulls that are safe to delete (not in any orders)
      await tx.pull.deleteMany({
        where: {
          id: { in: safeToDeleteIds },
          userId: user.id,
        },
      });
      console.log('[BULK SELL API] Deleted', safeToDeleteIds.length, 'pulls successfully');

      console.log('[BULK SELL API] Transaction step 2: Crediting coins...');
      // Step 2: Credit coins to user account (only for actually deleted pulls)
      const actualDeletedCount = safeToDeleteIds.length;
      const actualTotalCoins = sellablePulls
        .filter((p) => safeToDeleteIds.includes(p.id))
        .reduce(
          (sum, p) =>
            sum +
            (p.card?.coinValue ??
              p.boosterBox?.diamondCoinValue ??
              1),
          0
        );
      
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          coins: { increment: actualTotalCoins },
        },
        select: { coins: true },
      });
      console.log('[BULK SELL API] Coins credited:', actualTotalCoins, 'New balance:', updatedUser.coins);

      console.log('[BULK SELL API] Transaction step 3: Recording sales...');
      
      // Step 3: Record all sales in history (only for actually deleted pulls)
      const actualSalesData = salesData.filter((sale) =>
        safeToDeleteIds.includes(sale.pullId)
      );
      
      let salesCreated = 0;
      try {
        if ('saleHistory' in tx && typeof (tx as any).saleHistory === 'object') {
          await Promise.all(
            actualSalesData.map((sale) =>
              (tx as any).saleHistory.create({
                data: {
                  userId: user.id,
                  cardId: sale.cardId,
                  cardName: sale.cardName,
                  cardImage: sale.cardImage,
                  coinsReceived: sale.coinsReceived,
                },
              })
            )
          );
          salesCreated = actualSalesData.length;
          console.log('[BULK SELL API] Sales recorded in history');
        } else {
          console.log('[BULK SELL API] saleHistory not available in tx, will use fallback');
        }
      } catch (err) {
        console.log('[BULK SELL API] Error creating saleHistory in tx:', err);
        console.log('[BULK SELL API] Will use fallback method');
      }

      return { 
        updatedUser, 
        salesCreated, 
        actualDeletedCount, 
        actualTotalCoins,
        safeToDeleteIds,
        actualSalesData,
      };
    }, TRANSACTION_OPTIONS);

    // If sales weren't created in transaction, create them now
    if (result.salesCreated !== result.actualSalesData.length) {
      console.log('[BULK SELL API] Creating sale history outside transaction (fallback)...');
      await Promise.all(
        result.actualSalesData.map((sale) =>
          prisma.saleHistory.create({
            data: {
              userId: user.id,
              cardId: sale.cardId,
              cardName: sale.cardName,
              cardImage: sale.cardImage,
              coinsReceived: sale.coinsReceived,
            },
          })
        )
      );
      console.log('[BULK SELL API] Sale history created (fallback)');
    }

    console.log('[BULK SELL API] Transaction completed successfully. New balance:', result.updatedUser.coins);

    const skippedInOrders = pullsInOrders.length;
    const skippedInBattles = pullsInActiveBattles.length;
    const skipMessages: string[] = [];
    if (skippedInOrders > 0) {
      skipMessages.push(
        `${skippedInOrders} card${skippedInOrders !== 1 ? 's' : ''} skipped (in orders)`,
      );
    }
    if (skippedInBattles > 0) {
      skipMessages.push(
        `${skippedInBattles} card${skippedInBattles !== 1 ? 's' : ''} skipped (active battle)`,
      );
    }
    if (missingPullIds.length > 0) {
      skipMessages.push(
        `${missingPullIds.length} card${missingPullIds.length !== 1 ? 's' : ''} skipped (not found)`
      );
    }
    const summaryNote = skipMessages.length > 0 ? ` (${skipMessages.join('; ')})` : '';

    return NextResponse.json({
      success: true,
      cardsSold: result.actualDeletedCount || sellablePulls.length,
      totalCoinsReceived: result.actualTotalCoins || totalCoins,
      newBalance: result.updatedUser.coins,
      message: `Successfully sold ${
        result.actualDeletedCount || sellablePulls.length
      } card${(result.actualDeletedCount || sellablePulls.length) !== 1 ? 's' : ''}${summaryNote}`,
      skipped: skippedInOrders + skippedInBattles + missingPullIds.length,
      skippedDetails: {
        inOrders: skippedInOrders,
        inBattles: skippedInBattles,
        missing: missingPullIds.length,
      },
      missingPullIds,
    });
  } catch (error) {
    console.error('[BULK SELL API] Error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }
    const errorMessage = error instanceof Error ? error.message : 'Failed to sell cards';
    console.error('[BULK SELL API] Error details:', {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}




