'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { formatCoins } from '@/lib/utils';
import { Coins, Sparkles } from 'lucide-react';

const packages = [
  {
    id: 'starter',
    name: 'Starter',
    coins: 100,
    price: 10,
    bonus: 0,
  },
  {
    id: 'popular',
    name: 'Popular',
    coins: 500,
    price: 50,
    bonus: 25,
    badge: 'BEST VALUE',
  },
  {
    id: 'premium',
    name: 'Premium',
    coins: 1000,
    price: 100,
    bonus: 100,
  },
];

export default function PurchasePage() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const handlePurchase = async (pkg: typeof packages[0]) => {
    setLoading(pkg.id);
    try {
      const res = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: pkg.id,
          coins: pkg.coins + pkg.bonus,
          amount: pkg.price,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create checkout');
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      addToast({
        title: 'Purchase failed',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="container py-12">
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold">Purchase Coins</h1>
        <p className="text-muted">Choose a package and start opening packs</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {packages.map((pkg) => (
          <Card
            key={pkg.id}
            className={`relative ${pkg.badge ? 'border-primary border-2' : ''}`}
          >
            {pkg.badge && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                {pkg.badge}
              </Badge>
            )}
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {pkg.name}
                <Sparkles className="h-5 w-5 text-warning" />
              </CardTitle>
              <CardDescription>
                {formatCoins(pkg.coins)} coins
                {pkg.bonus > 0 && (
                  <span className="ml-2 text-success">+{pkg.bonus} bonus</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <p className="text-3xl font-bold">€{pkg.price}</p>
                {pkg.bonus > 0 && (
                  <p className="text-sm text-muted">
                    Total: {formatCoins(pkg.coins + pkg.bonus)} coins
                  </p>
                )}
              </div>
              <Button
                className="w-full"
                onClick={() => handlePurchase(pkg)}
                disabled={loading === pkg.id}
              >
                {loading === pkg.id ? 'Processing...' : 'Purchase'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

