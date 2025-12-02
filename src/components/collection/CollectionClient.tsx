'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { useCoins } from '@/hooks/useCoins';
import { useUser } from '@/hooks/useUser';
import { useRouter } from 'next/navigation';
import { Trash2, TrendingUp, ShoppingCart, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

type Pull = {
  id: string;
  card: {
    id: string;
    name: string;
    rarity: string;
    imageUrlGatherer: string;
    imageUrlScryfall: string | null;
    setName: string;
    priceAvg: number | null; // Cardmarket average price (EUR)
    priceLow: number | null; // Cardmarket low price (EUR)
    priceHigh: number | null; // Cardmarket high price (EUR)
    coinValue?: number | null;
  };
  timestamp: Date;
};

type CollectionClientProps = {
  pulls: Pull[];
  collectionValue: number; // Total collection value in EUR (from Cardmarket)
};

const rarityColors: Record<string, string> = {
  common: 'bg-gray-500',
  uncommon: 'bg-green-500',
  rare: 'bg-blue-500',
  mythic: 'bg-yellow-500',
};

export function CollectionClient({ pulls: initialPulls, collectionValue }: CollectionClientProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const { refreshBalance, setBalance } = useCoins();
  const { isAuthenticated } = useUser();
  const [search, setSearch] = useState('');
  const [filterRarity, setFilterRarity] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('none'); // 'none', 'rarity', 'coinPriceDesc'
  const [sellingPullId, setSellingPullId] = useState<string | null>(null);
  const [pulls, setPulls] = useState<Pull[]>(initialPulls);
  const [selectedPullIds, setSelectedPullIds] = useState<Set<string>>(new Set());
  const [bulkSelling, setBulkSelling] = useState(false);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [bulkAddingToCart, setBulkAddingToCart] = useState(false);
  const [cartItems, setCartItems] = useState<Set<string>>(new Set());
  const [zoomedPullId, setZoomedPullId] = useState<string | null>(null);
  const prevInitialPullsRef = useRef<string>('');

  // Sync pulls when initialPulls changes (e.g., after page refresh)
  useEffect(() => {
    // Use JSON.stringify to compare array contents, not reference
    const currentPullsKey = JSON.stringify(initialPulls.map(p => p.id).sort());
    if (prevInitialPullsRef.current !== currentPullsKey) {
      prevInitialPullsRef.current = currentPullsKey;
      setPulls(initialPulls);
      // Clear selections when pulls change
      setSelectedPullIds(new Set());
    }
  }, [initialPulls]);

  // Load cart items on mount
  useEffect(() => {
    const loadCart = async () => {
      try {
        const res = await fetch('/api/cart');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data?.items) {
            const pullIds = new Set(data.data.items.map((item: any) => item.pullId));
            setCartItems(pullIds);
          }
        }
      } catch (error) {
        console.error('Failed to load cart:', error);
      }
    };
    if (isAuthenticated) {
      loadCart();
    }
  }, [isAuthenticated]);

  // Rarity order for sorting (higher = rarer)
  const rarityOrder: Record<string, number> = {
    common: 1,
    uncommon: 2,
    rare: 3,
    mythic: 4,
  };

  // Get card coin value
  const getCardCoinValue = (card: Pull['card']) => {
    return card.coinValue || 1;
  };

  const filteredPulls = pulls
    .filter((pull) => {
      const matchesSearch = pull.card.name.toLowerCase().includes(search.toLowerCase());
      const matchesRarity = filterRarity === 'all' || pull.card.rarity.toLowerCase() === filterRarity;
      return matchesSearch && matchesRarity;
    })
    .sort((a, b) => {
      if (sortBy === 'rarity') {
        // Sort by rarity (mythic > rare > uncommon > common)
        const rarityA = rarityOrder[a.card.rarity.toLowerCase()] || 0;
        const rarityB = rarityOrder[b.card.rarity.toLowerCase()] || 0;
        return rarityB - rarityA; // Descending (rarest first)
      } else if (sortBy === 'coinPriceDesc') {
        // Sort by coin price descending (highest first)
        const coinValueA = getCardCoinValue(a.card);
        const coinValueB = getCardCoinValue(b.card);
        return coinValueB - coinValueA;
      }
      // Default: no sorting (keep original order)
      return 0;
    });

  const cardCounts = pulls.reduce((acc, pull) => {
    acc[pull.card.id] = (acc[pull.card.id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sellCard = async (pullId: string) => {
    console.log('[SELL CLIENT] Starting sell for pullId:', pullId);
    
    // Validate pullId
    if (!pullId || typeof pullId !== 'string' || pullId.trim() === '') {
      console.error('[SELL CLIENT] Invalid pullId:', pullId);
      addToast({
        title: 'Error',
        description: 'Invalid card ID',
        variant: 'destructive',
      });
      return;
    }
    
    const pullToSell = pulls.find((p) => p.id === pullId);
    if (!pullToSell) {
      console.error('[SELL CLIENT] Pull not found in state:', pullId);
      console.error('[SELL CLIENT] Available pull IDs:', pulls.map(p => p.id));
      addToast({
        title: 'Error',
        description: 'Card not found in collection. Please refresh the page.',
        variant: 'destructive',
      });
      // Refresh the page to sync with server
      setTimeout(() => {
        router.refresh();
      }, 1000);
      return;
    }

    const coinValue = getCardCoinValue(pullToSell.card);
    console.log('[SELL CLIENT] Card coin value:', coinValue);
    console.log('[SELL CLIENT] Card name:', pullToSell.card.name);
    console.log('[SELL CLIENT] Pull ID being sent:', pullId);
    
    setSellingPullId(pullId);
    
    try {
      console.log('[SELL CLIENT] Sending API request...');
      const res = await fetch('/api/cards/sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pullId: pullId.trim() }),
      });

      console.log('[SELL CLIENT] Response status:', res.status, res.statusText);

      const data = await res.json();
      console.log('[SELL CLIENT] Response data:', data);

      if (!res.ok) {
        const errorMsg = data.error || 'Failed to sell card';
        console.error('[SELL CLIENT] API error:', errorMsg);
        
        // If pull not found, refresh the page to sync
        if (errorMsg.includes('not found') || res.status === 404) {
          addToast({
            title: 'Card Already Sold',
            description: 'This card may have already been sold. Refreshing collection...',
            variant: 'destructive',
          });
          setTimeout(() => {
            router.refresh();
          }, 1500);
          return;
        }
        
        throw new Error(errorMsg);
      }

      console.log('[SELL CLIENT] Sale successful. Removing card from UI...');
      // Remove card from collection after successful sale
      setPulls((prevPulls) => {
        const filtered = prevPulls.filter((p) => p.id !== pullId);
        console.log('[SELL CLIENT] Cards before:', prevPulls.length, 'after:', filtered.length);
        return filtered;
      });

      addToast({
        title: 'Card sold successfully!',
        description: `Received ${data.coinsReceived?.toLocaleString() || coinValue} coins. The card has been moved to Sales History.`,
      });

      // Update balance immediately from response
      if (data.newBalance !== undefined) {
        console.log('[SELL CLIENT] Updating balance to:', data.newBalance);
        setBalance(data.newBalance);
      } else {
        console.log('[SELL CLIENT] Refreshing balance...');
        await refreshBalance();
      }
      
      // Force refresh to update collection and sales history
      console.log('[SELL CLIENT] Refreshing page...');
      setTimeout(() => {
        router.refresh();
      }, 500);
    } catch (error) {
      console.error('[SELL CLIENT] Error:', error);
      addToast({
        title: 'Error selling card',
        description: (error as Error).message || 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setSellingPullId(null);
      console.log('[SELL CLIENT] Sell process completed');
    }
  };

  // Toggle selection for a single card
  const toggleSelection = (pullId: string) => {
    setSelectedPullIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(pullId)) {
        newSet.delete(pullId);
      } else {
        newSet.add(pullId);
      }
      return newSet;
    });
  };

  // Select/Deselect all filtered cards
  const toggleSelectAll = () => {
    if (selectedPullIds.size === filteredPulls.length) {
      setSelectedPullIds(new Set());
    } else {
      setSelectedPullIds(new Set(filteredPulls.map((p) => p.id)));
    }
  };

  // Sell multiple cards at once
  const sellSelectedCards = async () => {
    if (selectedPullIds.size === 0) {
      addToast({
        title: 'No cards selected',
        description: 'Please select at least one card to sell.',
        variant: 'destructive',
      });
      return;
    }

    const pullIdsToSell = Array.from(selectedPullIds);
    setBulkSelling(true);

    try {
      console.log('[BULK SELL] Selling cards:', pullIdsToSell);
      
      const res = await fetch('/api/cards/sell-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pullIds: pullIdsToSell }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to sell cards');
      }

      // Remove sold cards from UI
      setPulls((prevPulls) => {
        return prevPulls.filter((p) => !selectedPullIds.has(p.id));
      });

      // Clear selections
      setSelectedPullIds(new Set());

      addToast({
        title: 'Cards sold successfully!',
        description: `Sold ${data.cardsSold} card${data.cardsSold !== 1 ? 's' : ''} for ${data.totalCoinsReceived?.toLocaleString() || 0} coins total.`,
      });

      // Update balance
      if (data.newBalance !== undefined) {
        setBalance(data.newBalance);
      } else {
        await refreshBalance();
      }

      // Refresh page
      setTimeout(() => {
        router.refresh();
      }, 500);
    } catch (error) {
      console.error('[BULK SELL] Error:', error);
      addToast({
        title: 'Error selling cards',
        description: (error as Error).message || 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setBulkSelling(false);
    }
  };

  const addSelectedToCart = async () => {
    if (selectedPullIds.size === 0) {
      addToast({
        title: 'No cards selected',
        description: 'Select at least one card to add to your basket.',
        variant: 'destructive',
      });
      return;
    }

    setBulkAddingToCart(true);
    const selectedIds = Array.from(selectedPullIds);
    const addedIds: string[] = [];

    try {
      for (const pullId of selectedIds) {
        const res = await fetch('/api/cart/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pullId }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to add some cards to cart');
        }
        addedIds.push(pullId);
      }

      if (addedIds.length) {
        setCartItems((prev) => {
          const next = new Set(prev);
          addedIds.forEach((id) => next.add(id));
          return next;
        });
        setPulls((prevPulls) => prevPulls.filter((pull) => !addedIds.includes(pull.id)));
        setSelectedPullIds((prev) => {
          const next = new Set(prev);
          addedIds.forEach((id) => next.delete(id));
          return next;
        });
        addToast({
          title: 'Cards added to basket',
          description: `Moved ${addedIds.length} card${addedIds.length === 1 ? '' : 's'} to your cart.`,
        });
        setTimeout(() => router.refresh(), 500);
      }
    } catch (error) {
      addToast({
        title: 'Unable to add cards',
        description: (error as Error).message ?? 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setBulkAddingToCart(false);
    }
  };

  // Sell all visible cards
  const sellAllVisibleCards = () => {
    if (filteredPulls.length === 0) {
      addToast({
        title: 'No cards to sell',
        description: 'There are no cards visible to sell.',
        variant: 'destructive',
      });
      return;
    }

    // Select all filtered cards and sell them
    setSelectedPullIds(new Set(filteredPulls.map((p) => p.id)));
    // Use setTimeout to ensure state is updated before selling
    setTimeout(() => {
      sellSelectedCards();
    }, 100);
  };

  // Calculate total value of selected cards
  const selectedCardsValue = Array.from(selectedPullIds).reduce((sum, pullId) => {
    const pull = pulls.find((p) => p.id === pullId);
    if (pull) {
      return sum + (pull.card.coinValue || 1);
    }
    return sum;
  }, 0);

  // Add card to cart
  const addToCart = async (pullId: string) => {
    setAddingToCart(pullId);
    try {
      const res = await fetch('/api/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pullId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to add to cart');
      }

      setCartItems((prev) => new Set([...prev, pullId]));
      // Remove card from collection UI (it's now in cart)
      setPulls((prevPulls) => prevPulls.filter((p) => p.id !== pullId));
      addToast({
        title: 'Added to cart!',
        description: 'Card moved to cart and removed from collection. Go to checkout to order physical cards.',
      });
      // Refresh page to update collection
      setTimeout(() => {
        router.refresh();
      }, 500);
    } catch (error) {
      addToast({
        title: 'Error',
        description: (error as Error).message || 'Failed to add to cart',
        variant: 'destructive',
      });
    } finally {
      setAddingToCart(null);
    }
  };

  // Calculate current collection value from filtered cards
  const currentCollectionValue = filteredPulls.reduce((sum, pull) => {
    return sum + (pull.card.priceAvg || 0);
  }, 0);

  return (
    <div className="space-y-6">
      {zoomedPullId && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setZoomedPullId(null)}
        >
          <div className="relative w-full max-w-md px-4">
            <button
              className="absolute right-6 top-6 text-white/70 hover:text-white"
              onClick={(e) => {
                e.stopPropagation();
                setZoomedPullId(null);
              }}
              aria-label="Close zoomed image"
            >
              <X className="h-6 w-6" />
            </button>
            <div className="relative aspect-[63/88] w-full">
              <Image
                src={
                  pulls.find((p) => p.id === zoomedPullId)?.card.imageUrlScryfall ||
                  pulls.find((p) => p.id === zoomedPullId)?.card.imageUrlGatherer ||
                  ''
                }
                alt="Zoomed card"
                fill
                className="rounded-lg object-contain"
                unoptimized
              />
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* Collection Value Card */}
      <Card className="bg-gradient-to-r from-primary/20 to-secondary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-warning" />
            Collection Value (Cardmarket EUR)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-4">
            <div>
              <p className="text-sm text-muted mb-1">Total Collection Value</p>
              <p className="text-4xl font-bold">{formatCurrency(collectionValue)}</p>
            </div>
            {filteredPulls.length !== pulls.length && (
              <div>
                <p className="text-sm text-muted mb-1">Filtered Value</p>
                <p className="text-2xl font-bold">{formatCurrency(currentCollectionValue)}</p>
              </div>
            )}
          </div>
          <p className="text-sm text-muted mt-2">
            Based on Cardmarket average prices (EUR) • {pulls.length} card{pulls.length !== 1 ? 's' : ''} in collection
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 md:flex-row">
          <Input
            placeholder="Search cards..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <select
            value={filterRarity}
            onChange={(e) => setFilterRarity(e.target.value)}
            className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm"
          >
            <option value="all">All Rarities</option>
            <option value="common">Common</option>
            <option value="uncommon">Uncommon</option>
            <option value="rare">Rare</option>
            <option value="mythic">Mythic</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm"
          >
            <option value="none">Sort by...</option>
            <option value="rarity">Rarity (Rarest First)</option>
            <option value="coinPriceDesc">Coin Price (Highest First)</option>
          </select>
        </div>
        
        {/* Bulk Actions */}
        {filteredPulls.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedPullIds.size === filteredPulls.length && filteredPulls.length > 0}
                onChange={toggleSelectAll}
                id="select-all"
              />
              <label htmlFor="select-all" className="text-sm cursor-pointer">
                {selectedPullIds.size === filteredPulls.length ? 'Deselect All' : 'Select All'}
              </label>
            </div>
            {selectedPullIds.size > 0 && (
              <>
                <span className="text-sm text-muted">•</span>
                <span className="text-sm text-muted">
                  {selectedPullIds.size} card{selectedPullIds.size !== 1 ? 's' : ''} selected
                </span>
                <span className="text-sm text-muted">•</span>
                <span className="text-sm font-semibold text-green-400">
                  Total: {selectedCardsValue.toLocaleString()} coins
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={addSelectedToCart}
                  disabled={bulkAddingToCart}
                >
                  {bulkAddingToCart ? (
                    'Adding...'
                  ) : (
                    <>
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Add Selected to Cart
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={sellSelectedCards}
                  disabled={bulkSelling}
                  className="ml-auto"
                >
                  {bulkSelling ? (
                    'Selling...'
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Sell Selected ({selectedPullIds.size})
                    </>
                  )}
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="destructive"
              onClick={sellAllVisibleCards}
              disabled={bulkSelling || filteredPulls.length === 0}
              className="ml-auto"
            >
              {bulkSelling ? (
                'Selling...'
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Sell All Visible ({filteredPulls.length})
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {filteredPulls.length === 0 ? (
        <div className="py-12 text-center text-muted">
          {pulls.length === 0 ? 'No cards in your collection yet.' : 'No cards match your filters.'}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredPulls.map((pull, index) => {
            const count = cardCounts[pull.card.id] || 1;
            // Use unique key combining pull.id and index to ensure uniqueness
            const isSelected = selectedPullIds.has(pull.id);
            return (
              <Card 
                key={`${pull.id}-${index}`} 
                className={`overflow-hidden transition ${isSelected ? 'ring-2 ring-primary' : ''}`}
              >
                <div className="relative aspect-[63/88] bg-gradient-to-br from-primary/20 to-secondary/20">
                  {/* Selection Checkbox */}
                  <div className="absolute top-2 left-2 z-10">
                    <Checkbox
                      checked={isSelected}
                      onChange={() => toggleSelection(pull.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  {pull.card.imageUrlGatherer || pull.card.imageUrlScryfall ? (
                    <Image
                      src={pull.card.imageUrlGatherer || pull.card.imageUrlScryfall || ''}
                      alt={pull.card.name}
                      fill
                      className="object-contain cursor-zoom-in"
                      onClick={(e) => {
                        e.stopPropagation();
                        setZoomedPullId(pull.id);
                      }}
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted">
                      No Image
                    </div>
                  )}
                  <Badge
                    className={`absolute top-2 right-2 ${rarityColors[pull.card.rarity.toLowerCase()] || 'bg-gray-500'}`}
                  >
                    {pull.card.rarity}
                  </Badge>
                  {count > 1 && (
                    <Badge className="absolute top-2 left-2">x{count}</Badge>
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold">{pull.card.name}</h3>
                  <p className="text-sm text-muted">{pull.card.setName}</p>
                  <div className="mt-2 space-y-1">
                    {/* Cardmarket Price (Primary Value) - EUR */}
                    {pull.card.priceAvg !== null && pull.card.priceAvg > 0 ? (
                      <>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted">Cardmarket Value (EUR):</span>
                          <span className="font-semibold text-primary">
                            {formatCurrency(pull.card.priceAvg)}
                          </span>
                        </div>
                        {pull.card.priceLow && pull.card.priceHigh && (
                          <div className="flex items-center justify-between text-xs text-muted">
                            <span>Price Range:</span>
                            <span>
                              {formatCurrency(pull.card.priceLow)} - {formatCurrency(pull.card.priceHigh)}
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted">Cardmarket Value (EUR):</span>
                        <span className="text-muted">No price data</span>
                      </div>
                    )}
                    {/* Coin Value for Selling */}
                    <div className="flex items-center justify-between text-xs border-t border-white/10 pt-1 mt-1">
                      <span className="text-muted">Sell for:</span>
                      <span className="font-semibold text-green-400">
                        {getCardCoinValue(pull.card).toLocaleString()} coins
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    {cartItems.has(pull.id) ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        disabled
                      >
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        In Cart
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => addToCart(pull.id)}
                        disabled={addingToCart === pull.id}
                      >
                        {addingToCart === pull.id ? (
                          'Adding...'
                        ) : (
                          <>
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            Add to Cart
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => sellCard(pull.id)}
                      disabled={sellingPullId === pull.id}
                    >
                      {sellingPullId === pull.id ? (
                        'Selling...'
                      ) : (
                        <>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Sell Card
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

