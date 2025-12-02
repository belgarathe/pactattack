'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils';
import { ShoppingCart, Trash2, Package, ArrowRight, CreditCard } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';

type CartItem = {
  id: string;
  pullId: string;
  card: {
    id: string;
    name: string;
    rarity: string;
    imageUrlGatherer: string;
    imageUrlScryfall: string | null;
    setName: string;
    priceAvg: number | null;
  };
  quantity: number;
};

export default function CartPage() {
  const router = useRouter();
  const { isAuthenticated } = useUser();
  const { addToast } = useToast();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingItem, setRemovingItem] = useState<string | null>(null);

  const SHIPPING_COST = 5.0; // 5 EUR shipping

  const loadCart = useCallback(async () => {
    try {
      const res = await fetch('/api/cart');
      const data = await res.json();

        if (res.ok && data.success) {
          setCartItems(data.data.items || []);
        }
    } catch (error) {
      console.error('Failed to load cart:', error);
      addToast({
        title: 'Error',
        description: 'Failed to load cart',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    loadCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const removeFromCart = async (pullId: string) => {
    setRemovingItem(pullId);
    try {
      const res = await fetch('/api/cart/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pullId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to remove from cart');
      }

      // Reload cart
      await loadCart();
      addToast({
        title: 'Removed from cart',
        description: 'Item removed from cart and returned to your collection',
      });
      // Refresh collection page if user navigates there
      setTimeout(() => {
        router.refresh();
      }, 500);
    } catch (error) {
      addToast({
        title: 'Error',
        description: (error as Error).message || 'Failed to remove from cart',
        variant: 'destructive',
      });
    } finally {
      setRemovingItem(null);
    }
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      addToast({
        title: 'Cart is empty',
        description: 'Please add items to your cart before checkout',
        variant: 'destructive',
      });
      return;
    }

    // Navigate to checkout page
    router.push('/checkout');
  };

  const totalDue = SHIPPING_COST;
  const rarityColors: Record<string, string> = {
    common: 'bg-gray-500',
    uncommon: 'bg-green-500',
    rare: 'bg-blue-500',
    mythic: 'bg-yellow-500',
  };

  if (loading) {
    return (
      <div className="container py-12">
        <div className="text-center">Loading cart...</div>
      </div>
    );
  }

  return (
    <div className="container py-12">
      <div className="mb-8">
        <h1 className="mb-2 text-4xl font-bold">Shopping Cart</h1>
        <p className="text-muted">Review your items and proceed to checkout</p>
      </div>

      {cartItems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingCart className="mb-4 h-16 w-16 text-muted" />
            <h2 className="mb-2 text-2xl font-bold">Your cart is empty</h2>
            <p className="mb-6 text-muted">Add cards from your collection to order physical copies</p>
            <Button onClick={() => router.push('/collection')}>
              Browse Collection
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div className="relative h-24 w-16 flex-shrink-0 rounded overflow-hidden border border-white/10">
                      {item.card.imageUrlGatherer || item.card.imageUrlScryfall ? (
                        <Image
                          src={item.card.imageUrlGatherer || item.card.imageUrlScryfall || ''}
                          alt={item.card.name}
                          fill
                          className="object-contain"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted text-xs">
                          No Image
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold">{item.card.name}</h3>
                          <p className="text-sm text-muted">{item.card.setName}</p>
                          <div className="mt-2 flex items-center gap-2">
                            <Badge className={rarityColors[item.card.rarity.toLowerCase()] || 'bg-gray-500'}>
                              {item.card.rarity}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFromCart(item.pullId)}
                          disabled={removingItem === item.pullId}
                        >
                          {removingItem === item.pullId ? (
                            'Removing...'
                          ) : (
                            <Trash2 className="h-4 w-4 text-red-400" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">
                      Items ({cartItems.length} {cartItems.length === 1 ? 'item' : 'items'})
                    </span>
                    <span className="text-muted">Included</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Shipping</span>
                    <span>{formatCurrency(SHIPPING_COST)}</span>
                  </div>
                  <div className="border-t border-white/10 pt-2">
                    <div className="flex justify-between font-bold">
                      <span>Total</span>
                      <span className="text-lg">{formatCurrency(totalDue)}</span>
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleCheckout}
                  disabled={cartItems.length === 0}
                >
                  <>
                    Proceed to Checkout
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                </Button>

                <p className="text-xs text-muted text-center">
                  You will be redirected to Stripe to complete payment and provide shipping address
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

