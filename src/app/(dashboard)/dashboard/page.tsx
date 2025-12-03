import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Coins, Package, TrendingUp, Award } from 'lucide-react';
import { formatCoins, formatCurrency } from '@/lib/utils';

async function getDashboardData(userId: string) {
  // Exclude pulls that are in cart (cards in cart are not part of collection)
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

  // Build where clause excluding cart items
  const collectionWhere = { 
    userId,
    ...(cartPullIds.length > 0 && { id: { notIn: cartPullIds } }),
  };

  const [pulls, allPulls, totalCards] = await Promise.all([
    prisma.pull.count({ where: collectionWhere }),
    prisma.pull.findMany({
      where: collectionWhere,
      include: {
        card: true,
        boosterBox: {
          include: { catalog: true },
        },
      },
    }),
    prisma.pull.groupBy({
      by: ['cardId'],
      where: collectionWhere,
    }),
  ]);

  const rarestPull = allPulls
    .map((pull) => {
      if (pull.card) {
        return { name: pull.card.name, setName: pull.card.setName, value: pull.card.priceAvg ? Number(pull.card.priceAvg) : 0 };
      }
      if (pull.boosterBox) {
        const productValue = pull.boosterBox.priceAvg
          ? Number(pull.boosterBox.priceAvg)
          : pull.boosterBox.catalog?.priceAvg
          ? Number(pull.boosterBox.catalog.priceAvg)
          : 0;
        const productName = pull.boosterBox.name || pull.boosterBox.catalog?.name || 'Sealed Product';
        const productSet = pull.boosterBox.setName || pull.boosterBox.catalog?.setName || '';
        return { name: productName, setName: productSet, value: productValue };
      }
      return { name: 'Unknown Item', setName: '', value: 0 };
    })
    .reduce(
      (best, current) => (current.value > best.value ? current : best),
      { name: '', setName: '', value: 0 }
    );

  // Calculate collection value using Cardmarket average prices (excluding cart items)
  const collectionValue = allPulls.reduce((sum, pull) => {
    if (pull.card) {
      return sum + (pull.card.priceAvg ? Number(pull.card.priceAvg) : 0);
    }
    if (pull.boosterBox) {
      const productValue = pull.boosterBox.priceAvg
        ? Number(pull.boosterBox.priceAvg)
        : pull.boosterBox.catalog?.priceAvg
        ? Number(pull.boosterBox.catalog.priceAvg)
        : 0;
      return sum + productValue;
    }
    return sum + 0;
  }, 0);

  return {
    packsOpened: pulls,
    collectionValue, // Total value in EUR from Cardmarket
    totalCards: totalCards.length,
    rarestCard: rarestPull.value > 0 ? rarestPull : null,
  };
}

export default async function DashboardPage() {
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

  const stats = await getDashboardData(user.id);

  return (
    <div className="container py-12">
      <div className="mb-8">
        <h1 className="mb-2 text-4xl font-bold">Welcome back{user.name ? `, ${user.name}` : ''}!</h1>
        <p className="text-muted">Here's your collection overview</p>
      </div>

      <div className="mb-8">
        <Card className="bg-gradient-to-r from-primary/20 to-secondary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-6 w-6 text-warning" />
              Coins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{formatCoins(user.coins)}</p>
            <Button asChild className="mt-4">
              <Link href="/purchase">Purchase More</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="h-5 w-5" />
              Packs Opened
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.packsOpened}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5" />
              Collection Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(stats.collectionValue)}</p>
            <p className="text-xs text-muted mt-1">Based on Cardmarket prices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Award className="h-5 w-5" />
              Unique Cards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalCards}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rarest Card</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.rarestCard ? (
              <>
                <p className="font-semibold">{stats.rarestCard.name}</p>
                <p className="text-sm text-muted">{stats.rarestCard.setName}</p>
                {stats.rarestCard.value > 0 ? (
                  <>
                    <p className="mt-2 text-success font-semibold">
                      {formatCurrency(stats.rarestCard.value)}
                    </p>
                    <p className="text-xs text-muted">Cardmarket value</p>
                  </>
                ) : (
                  <p className="mt-2 text-muted text-sm">No price data</p>
                )}
              </>
            ) : (
              <p className="text-muted">No cards yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 flex gap-4">
        <Button asChild>
          <Link href="/marketplace">Browse Marketplace</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/collection">View Collection</Link>
        </Button>
      </div>
    </div>
  );
}

