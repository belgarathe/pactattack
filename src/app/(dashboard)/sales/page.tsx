import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { formatDate } from '@/lib/utils';

async function getSalesHistory() {
  try {
    const session = await getCurrentSession();
    if (!session?.user?.email) {
      return [];
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return [];
    }

    const sales = await prisma.saleHistory.findMany({
      where: { userId: user.id },
      orderBy: { timestamp: 'desc' },
    });

    return sales;
  } catch (error) {
    console.error('Error fetching sales history:', error);
    return [];
  }
}

export default async function SalesHistoryPage() {
  const session = await getCurrentSession();
  if (!session?.user?.email) {
    redirect('/login');
  }

  const sales = await getSalesHistory();
  const totalCoins = sales.reduce((sum, sale) => sum + sale.coinsReceived, 0);

  return (
    <div className="container py-12">
      <div className="mb-8">
        <h1 className="mb-2 text-4xl font-bold">Sales History</h1>
        <p className="text-muted">View all cards you've sold back to the shop</p>
      </div>

      {sales.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted">No sales history yet. Sell cards to see them here!</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted">Total Sales</p>
                  <p className="text-2xl font-bold">{totalCoins.toLocaleString()} coins</p>
                </div>
                <div>
                  <p className="text-sm text-muted">Total Cards Sold</p>
                  <p className="text-2xl font-bold">{sales.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {sales.map((sale) => (
              <Card key={sale.id} className="hover:bg-surface/50 transition">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {sale.cardImage && (
                      <div className="relative h-24 w-16 flex-shrink-0 rounded overflow-hidden border border-white/10">
                        <Image
                          src={sale.cardImage}
                          alt={sale.cardName}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg mb-1">{sale.cardName}</h3>
                      <p className="text-sm text-muted">
                        Sold on {formatDate(sale.timestamp)}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="mb-1">
                        <p className="text-xs text-muted mb-1">Price Received</p>
                        <Badge className="bg-green-500/20 text-green-300 border-green-500 text-base px-3 py-1">
                          {sale.coinsReceived.toLocaleString()} coins
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

