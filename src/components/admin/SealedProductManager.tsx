'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Search, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import type { BoxSealedProduct } from '@/types';

type CatalogProduct = {
  id: string;
  slug: string;
  name: string;
  setName?: string | null;
  setCode?: string | null;
  productType: string;
  imageUrl: string;
};

interface SealedProductManagerProps {
  initialProducts?: BoxSealedProduct[];
  onChange?: (products: BoxSealedProduct[]) => void;
}

export function SealedProductManager({ initialProducts = [], onChange }: SealedProductManagerProps) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<CatalogProduct[]>([]);
  const [sealedProducts, setSealedProducts] = useState<BoxSealedProduct[]>(initialProducts);
  const { addToast } = useToast();

  useEffect(() => {
    setSealedProducts(initialProducts);
  }, [initialProducts]);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/admin/sealed-products?query=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to search sealed products');
      }
      setResults(data.products || []);
    } catch (error) {
      console.error(error);
      addToast({
        title: 'Search failed',
        description: error instanceof Error ? error.message : 'Unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setSearching(false);
    }
  }, [query, addToast]);

  const addProduct = (catalog: CatalogProduct) => {
    if (sealedProducts.some((item) => item.catalogId === catalog.id || item.name === catalog.name)) {
      addToast({
        title: 'Already added',
        description: `${catalog.name} is already configured for this box.`,
        variant: 'destructive',
      });
      return;
    }

    const next: BoxSealedProduct[] = [
      ...sealedProducts,
      {
        id: crypto.randomUUID(),
        catalogId: catalog.id,
        name: catalog.name,
        imageUrl: catalog.imageUrl,
        setName: catalog.setName ?? null,
        setCode: catalog.setCode ?? null,
        productType: catalog.productType,
        pullRate: 0,
        coinValue: 1,
        catalog: {
          id: catalog.id,
          slug: catalog.slug,
          name: catalog.name,
          setName: catalog.setName ?? null,
          setCode: catalog.setCode ?? null,
          productType: catalog.productType,
          imageUrl: catalog.imageUrl,
        },
      },
    ];
    setSealedProducts(next);
    onChange?.(next);
  };

  const removeProduct = (catalogId?: string | null) => {
    const next = sealedProducts.filter((product) => product.catalogId !== catalogId);
    setSealedProducts(next);
    onChange?.(next);
  };

  const updateProduct = (catalogId: string | null | undefined, payload: Partial<BoxSealedProduct>) => {
    const next = sealedProducts.map((product) =>
      product.catalogId === catalogId
        ? {
            ...product,
            ...payload,
          }
        : product
    );
    setSealedProducts(next);
    onChange?.(next);
  };

  const totalPullRate = useMemo(
    () => sealedProducts.reduce((sum, product) => sum + Number(product.pullRate || 0), 0),
    [sealedProducts]
  );
  const overBudget = totalPullRate > 100.0001;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sealed Products</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row">
          <Input
            placeholder="Search sealed catalog (e.g., 'Wilds of Eldraine Collector')"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                handleSearch();
              }
            }}
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={searching}>
            <Search className="mr-2 h-4 w-4" />
            {searching ? 'Searching...' : 'Search'}
          </Button>
        </div>

        {results.length > 0 && (
          <div className="grid gap-3 md:grid-cols-2">
            {results.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3"
              >
                <div className="relative h-16 w-16 overflow-hidden rounded">
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{item.name}</p>
                  <p className="text-xs text-muted truncate">
                    {item.setName ?? 'Unknown Set'} • {item.productType.replace(/_/g, ' ')}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => addProduct(item)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-lg border border-white/10 p-4">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted">Configured sealed products</p>
            <div className={`text-xs ${overBudget ? 'text-red-400' : 'text-muted'}`}>
              Sealed pull weight: {totalPullRate.toFixed(3)}% ({sealedProducts.length} items)
              <span className="block text-[11px]">
                Counts toward the shared 100% pull pool (cards must cover the remainder).
              </span>
            </div>
          </div>
          {overBudget && (
            <p className="mb-2 text-xs text-red-400">
              Sealed products exceed 100%. Lower their pull rates so cards have room.
            </p>
          )}
          {sealedProducts.length === 0 ? (
            <p className="text-sm text-muted">
              No sealed products attached to this box yet. Search above to add Set Booster displays, Collector packs,
              bundles, and more.
            </p>
          ) : (
            <div className="space-y-3">
              {sealedProducts.map((product) => (
                <div
                  key={`${product.catalogId}-${product.name}`}
                  className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/5 p-3 md:flex-row md:items-center"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="relative h-16 w-16 overflow-hidden rounded border border-white/10">
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{product.name}</p>
                      <p className="text-xs text-muted truncate">
                        {product.setName ?? 'Unknown Set'} • {product.productType.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 md:w-auto">
                    <div>
                      <label className="text-xs text-muted">Pull Rate</label>
                      <Input
                        type="number"
                        step="0.001"
                        min={0}
                        max={100}
                        value={product.pullRate}
                        onChange={(e) =>
                          updateProduct(product.catalogId ?? null, {
                            pullRate: Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)),
                          })
                        }
                        className="w-28"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted">💎 Coin Value</label>
                      <Input
                        type="number"
                        min={1}
                        value={product.coinValue}
                        onChange={(e) =>
                          updateProduct(product.catalogId ?? null, {
                            coinValue: Math.max(1, parseInt(e.target.value) || 1),
                          })
                        }
                        className="w-24"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted">Avg. EUR</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={product.priceAvg ?? ''}
                        placeholder="0.00"
                        onChange={(e) =>
                          updateProduct(product.catalogId ?? null, {
                            priceAvg: e.target.value ? parseFloat(e.target.value) : null,
                          })
                        }
                        className="w-28"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeProduct(product.catalogId)}
                      className="text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

