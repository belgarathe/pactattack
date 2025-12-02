import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { CollectionClient } from '@/components/collection/CollectionClient';

async function getCollection(userId: string) {
  // Only get pulls that are NOT in cart (cards in cart are not shown in collection)
  // First, get all pullIds that are in cart
  let cartPullIds: string[] = [];
  try {
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: { items: { select: { pullId: true } } },
    });
    cartPullIds = cart?.items?.map((item) => item.pullId) || [];
  } catch (error) {
    // If cart doesn't exist or error, treat as empty cart
    console.error('Error fetching cart:', error);
    cartPullIds = [];
  }

  // Get pulls that are NOT in cart
  const pulls = await prisma.pull.findMany({
    where: { 
      userId,
      ...(cartPullIds.length > 0 && { id: { notIn: cartPullIds } }),
    },
    include: {
      card: true,
      boosterBox: {
        include: { catalog: true },
      },
      box: true,
    },
    orderBy: { timestamp: 'desc' },
  });

  // Convert Decimal values to numbers for client components
  // Include Cardmarket prices for valuation
  return pulls
    .map((pull) => {
      if (pull.card) {
        return {
          id: pull.id,
          timestamp: pull.timestamp,
          card: {
            id: pull.card.id,
            name: pull.card.name,
            rarity: pull.card.rarity,
            imageUrlGatherer: pull.card.imageUrlGatherer,
            imageUrlScryfall: pull.card.imageUrlScryfall,
            setName: pull.card.setName,
            priceAvg: pull.card.priceAvg ? Number(pull.card.priceAvg) : null, // Cardmarket average price (EUR)
            priceLow: pull.card.priceLow ? Number(pull.card.priceLow) : null, // Cardmarket low price (EUR)
            priceHigh: pull.card.priceHigh ? Number(pull.card.priceHigh) : null, // Cardmarket high price (EUR)
            coinValue: pull.card.coinValue || 1,
          },
        };
      }

      if (pull.boosterBox) {
        const booster = pull.boosterBox;
        const catalog = booster.catalog;
        return {
          id: pull.id,
          timestamp: pull.timestamp,
          card: {
            id: booster.id,
            name: booster.name || catalog?.name || 'Sealed Product',
            rarity: booster.productType?.replace(/_/g, ' ') || 'Sealed Product',
            imageUrlGatherer: booster.imageUrl || catalog?.imageUrl || '/placeholder.svg',
            imageUrlScryfall: catalog?.imageUrl || null,
            setName: booster.setName || catalog?.setName || booster.setCode || 'Sealed Product',
            priceAvg: booster.priceAvg
              ? Number(booster.priceAvg)
              : catalog?.priceAvg
              ? Number(catalog.priceAvg)
              : null,
            priceLow: booster.priceLow ? Number(booster.priceLow) : null,
            priceHigh: booster.priceHigh ? Number(booster.priceHigh) : null,
            coinValue: booster.diamondCoinValue || 1,
          },
        };
      }

      console.warn('[collection] Pull has no card or boosterBox data', pull.id);
      return null;
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
}

async function calculateCollectionValue(pulls: Awaited<ReturnType<typeof getCollection>>) {
  // Calculate total value using Cardmarket average prices
  const totalValue = pulls.reduce((sum, pull) => {
    const cardValue = pull.card.priceAvg || 0;
    return sum + cardValue;
  }, 0);
  
  return totalValue;
}

export default async function CollectionPage() {
  const session = await getCurrentSession();
  if (!session?.user?.email) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    redirect('/login');
  }

  const pulls = await getCollection(user.id);
  const collectionValue = await calculateCollectionValue(pulls);

  return (
    <div className="container py-12">
      <div className="mb-8">
        <h1 className="mb-2 text-4xl font-bold">My Collection</h1>
        <p className="text-muted">View and manage your card collection</p>
      </div>
      <CollectionClient pulls={pulls} collectionValue={collectionValue} />
    </div>
  );
}

