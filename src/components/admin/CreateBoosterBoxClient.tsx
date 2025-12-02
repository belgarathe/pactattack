'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Save, Search, ExternalLink, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useDebounce } from '@/hooks/useDebounce';

const boosterBoxSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  imageUrl: z.string().url('Valid URL is required'),
  setName: z.string().optional(),
  setCode: z.string().optional(),
  priceAvg: z.number().min(0).optional(),
  pullRate: z.number().min(0).max(100),
  coinValue: z.number().int().min(1),
});

type BoosterBoxFormData = z.infer<typeof boosterBoxSchema>;

type CreateBoosterBoxClientProps = {};

type BoosterBoxSearchResult = {
  id: string;
  name: string;
  setName: string;
  setCode: string;
  imageUrl: string;
  priceLow?: number;
  priceAvg?: number;
  priceHigh?: number;
  url: string;
  releasedAt?: string;
};

export function CreateBoosterBoxClient({}: CreateBoosterBoxClientProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BoosterBoxSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 500);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BoosterBoxFormData>({
    resolver: zodResolver(boosterBoxSchema),
    defaultValues: {
      coinValue: 1,
      pullRate: 0,
    },
  });

  // Search booster boxes via combined MTG sources
  useEffect(() => {
    if (debouncedSearch.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setSearching(true);
    fetch(`/api/cardmarket/booster-boxes?search=${encodeURIComponent(debouncedSearch)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setSearchResults(data.data || []);
          setShowSearchResults(true);
        }
      })
      .catch((error) => {
        console.error('Search error:', error);
        addToast({
          title: 'Search failed',
          description: 'Could not search booster boxes',
          variant: 'destructive',
        });
      })
      .finally(() => {
        setSearching(false);
      });
  }, [debouncedSearch, addToast]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.search-results-container')) {
        setShowSearchResults(false);
      }
    };

    if (showSearchResults) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showSearchResults]);

  const importFromSearch = (boosterBox: BoosterBoxSearchResult) => {
    setValue('name', boosterBox.name);
    setValue('setName', boosterBox.setName);
    setValue('setCode', boosterBox.setCode);
    setValue('imageUrl', boosterBox.imageUrl || '');
    if (boosterBox.priceAvg) {
      setValue('priceAvg', boosterBox.priceAvg);
    }
    setShowSearchResults(false);
    setSearchQuery('');
    addToast({
      title: 'Booster box imported',
      description: `Imported data for ${boosterBox.name}`,
    });
  };

  const onSubmit = async (data: BoosterBoxFormData) => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/booster-boxes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Failed to create booster box');
      }

      addToast({
        title: 'Booster box created',
        description: 'The booster box has been added successfully.',
      });

      router.push('/admin/booster-boxes');
    } catch (error) {
      addToast({
        title: 'Error',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" asChild>
        <Link href="/admin/booster-boxes">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Booster Boxes
        </Link>
      </Button>

      {/* MTG Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search MTG Booster Boxes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative search-results-container">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input
                placeholder="Search MTG booster products (set name or code)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && showSearchResults && searchResults.length > 0) {
                    e.preventDefault();
                    importFromSearch(searchResults[0]);
                  }
                }}
                onFocus={() => {
                  if (searchResults.length > 0) {
                    setShowSearchResults(true);
                  }
                }}
                className="pl-10"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted" />
              )}
            </div>

            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute z-10 mt-2 max-h-96 w-full overflow-y-auto rounded-lg border border-white/20 bg-background shadow-lg search-results-container">
                {searchResults.map((bb, index) => (
                  <button
                    key={bb.id}
                    type="button"
                      onClick={() => importFromSearch(bb)}
                    className="flex w-full items-center gap-3 border-b border-white/10 p-3 text-left hover:bg-white/5 transition focus:bg-white/10 focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                          importFromSearch(bb);
                      }
                    }}
                  >
                    {bb.imageUrl && (
                      <div className="relative h-16 w-12 flex-shrink-0 rounded overflow-hidden border border-white/10">
                        <Image
                          src={bb.imageUrl}
                          alt={bb.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{bb.name}</p>
                      <p className="text-sm text-muted">
                        {bb.setName} {bb.setCode && `(${bb.setCode})`}
                      </p>
                      {bb.releasedAt && (
                        <p className="text-xs text-muted">
                          Released: {new Date(bb.releasedAt).getFullYear()}
                        </p>
                      )}
                      {bb.priceAvg && (
                        <p className="text-xs text-muted">€{bb.priceAvg.toFixed(2)}</p>
                      )}
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="mt-2 text-xs text-muted">
            Searches combine Scryfall sets with the official Magic: The Gathering API for broader product coverage.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Booster Box Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Magic: The Gathering Booster Box"
              />
              {errors.name && (
                <p className="text-sm text-red-400">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <textarea
                id="description"
                {...register('description')}
                rows={4}
                className="flex w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2"
                placeholder="A booster box containing..."
              />
              {errors.description && (
                <p className="text-sm text-red-400">{errors.description.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageUrl">Image URL *</Label>
              <Input
                id="imageUrl"
                {...register('imageUrl')}
                placeholder="https://example.com/image.jpg"
              />
              {errors.imageUrl && (
                <p className="text-sm text-red-400">{errors.imageUrl.message}</p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="setName">Set Name</Label>
                <Input
                  id="setName"
                  {...register('setName')}
                  placeholder="Throne of Eldraine"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="setCode">Set Code</Label>
                <Input
                  id="setCode"
                  {...register('setCode')}
                  placeholder="ELD"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="pullRate">Pull Rate (%) *</Label>
                <Input
                  id="pullRate"
                  type="number"
                  step="0.001"
                  {...register('pullRate', { valueAsNumber: true })}
                  placeholder="0.001"
                />
                {errors.pullRate && (
                  <p className="text-sm text-red-400">{errors.pullRate.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="coinValue">💎 Coin Value *</Label>
                <Input
                  id="coinValue"
                  type="number"
                  {...register('coinValue', { valueAsNumber: true })}
                  placeholder="1"
                />
                {errors.coinValue && (
                  <p className="text-sm text-red-400">{errors.coinValue.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="priceAvg">Average Price (EUR)</Label>
                <Input
                  id="priceAvg"
                  type="number"
                  step="0.01"
                  {...register('priceAvg', { valueAsNumber: true })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Creating...' : 'Create Booster Box'}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/admin/booster-boxes">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

