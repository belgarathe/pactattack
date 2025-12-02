'use client';

import { useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import NextImage from 'next/image';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';

const PRODUCT_TYPES = [
  'SET_BOOSTER_DISPLAY',
  'DRAFT_BOOSTER_DISPLAY',
  'COLLECTOR_BOOSTER_DISPLAY',
  'PLAY_BOOSTER_DISPLAY',
  'BUNDLE',
  'GIFT_BUNDLE',
  'STARTER_KIT',
  'PRERELEASE_PACK',
  'SET_BOOSTER_PACK',
  'DRAFT_BOOSTER_PACK',
  'COLLECTOR_BOOSTER_PACK',
  'PLAY_BOOSTER_PACK',
  'COMMANDER_DECK',
  'COMPLETE_BUNDLE',
  'ACCESSORY',
  'BOOSTER_BOX',
  'BOOSTER_PACK',
  'STARTER_DECK',
  'UNKNOWN',
] as const;

const GAME_OPTIONS = ['MAGIC_THE_GATHERING', 'ONE_PIECE', 'POKEMON', 'LORCANA'] as const;

type ProductType = (typeof PRODUCT_TYPES)[number];
type GameType = (typeof GAME_OPTIONS)[number];

type SealedProductRecord = {
  id: string;
  name: string;
  slug: string;
  setName?: string | null;
  setCode?: string | null;
  productType: ProductType;
  imageUrl: string;
  priceAvg?: number | null;
  msrp?: number | null;
  description?: string | null;
  contents?: string | null;
  sourceUri?: string | null;
  cardmarketProductId?: number | null;
  tcgplayerId?: number | null;
  releaseDate?: string | null;
  game: GameType;
  updatedAt: Date | string;
  createdAt: Date | string;
};

type FormState = {
  id?: string;
  name: string;
  slug?: string;
  setName?: string;
  setCode?: string;
  productType: ProductType;
  imageUrl: string;
  priceAvg?: string;
  msrp?: string;
  description?: string;
  contents?: string;
  sourceUri?: string;
  cardmarketProductId?: string;
  tcgplayerId?: string;
  releaseDate?: string;
  game: GameType;
};

const EMPTY_FORM: FormState = {
  name: '',
  slug: '',
  setName: '',
  setCode: '',
  productType: 'SET_BOOSTER_DISPLAY',
  imageUrl: '',
  priceAvg: '',
  msrp: '',
  description: '',
  contents: '',
  sourceUri: '',
  cardmarketProductId: '',
  tcgplayerId: '',
  releaseDate: '',
  game: 'MAGIC_THE_GATHERING',
};

export function SealedCatalogManager({ initialProducts }: { initialProducts: SealedProductRecord[] }) {
  const { addToast } = useToast();
  const [products, setProducts] = useState<SealedProductRecord[]>(initialProducts);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const query = search.toLowerCase();
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        (product.setName?.toLowerCase().includes(query) ?? false) ||
        (product.setCode?.toLowerCase().includes(query) ?? false) ||
        product.slug.toLowerCase().includes(query)
    );
  }, [products, search]);

  const startCreate = () => {
    setEditing({ ...EMPTY_FORM });
  };

  const startEdit = (product: SealedProductRecord) => {
    setEditing({
      id: product.id,
      name: product.name,
      slug: product.slug,
      setName: product.setName ?? '',
      setCode: product.setCode ?? '',
      productType: product.productType,
      imageUrl: product.imageUrl,
      priceAvg: product.priceAvg?.toString() ?? '',
      msrp: product.msrp?.toString() ?? '',
      description: product.description ?? '',
      contents: product.contents ?? '',
      sourceUri: product.sourceUri ?? '',
      cardmarketProductId: product.cardmarketProductId?.toString() ?? '',
      tcgplayerId: product.tcgplayerId?.toString() ?? '',
      releaseDate: product.releaseDate
        ? (() => {
            if (typeof product.releaseDate === 'string') {
              return product.releaseDate.substring(0, 10);
            }
            try {
              return new Date(product.releaseDate).toISOString().substring(0, 10);
            } catch {
              return '';
            }
          })()
        : '',
      game: product.game,
    });
  };

  const cancelEdit = () => {
    setEditing(null);
  };

  const handleFileUpload = (file: File) => {
    if (!file.type.includes('image')) {
      addToast({
        title: 'Only images allowed',
        description: 'Please select a JPG, PNG, or WebP image.',
        variant: 'destructive',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          addToast({
            title: 'Upload failed',
            description: 'Unable to process image canvas.',
            variant: 'destructive',
          });
          return;
        }
        const maxDimension = 700;
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const outputType = file.type.includes('png') ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(outputType, 0.85);
        setEditing((prev) => (prev ? { ...prev, imageUrl: dataUrl } : prev));
      };
      img.onerror = () => {
        addToast({
          title: 'Upload failed',
          description: 'Could not read the selected image.',
          variant: 'destructive',
        });
      };
      img.src = base64;
    };
    reader.readAsDataURL(file);
  };

  const handleChange = (field: keyof FormState, value: string) => {
    setEditing((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSubmit = async () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      addToast({ title: 'Name is required', variant: 'destructive' });
      return;
    }
    if (!editing.imageUrl.trim() || !editing.imageUrl.startsWith('data:image')) {
      addToast({
        title: 'Upload required',
        description: 'Please upload a JPG or PNG. External URLs are no longer allowed.',
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: editing.name.trim(),
        slug: editing.slug?.trim() || undefined,
        setName: editing.setName?.trim() || null,
        setCode: editing.setCode?.trim() || null,
        productType: editing.productType,
        imageUrl: editing.imageUrl.trim(),
        priceAvg: editing.priceAvg ? Number(editing.priceAvg) : null,
        msrp: editing.msrp ? Number(editing.msrp) : null,
        description: editing.description?.trim() || null,
        contents: editing.contents?.trim() || null,
        sourceUri: editing.sourceUri?.trim() || null,
        cardmarketProductId: editing.cardmarketProductId ? Number(editing.cardmarketProductId) : null,
        tcgplayerId: editing.tcgplayerId ? Number(editing.tcgplayerId) : null,
        releaseDate: editing.releaseDate ? new Date(editing.releaseDate).toISOString() : null,
        game: editing.game,
      };

      if (editing.id) {
        const res = await fetch(`/api/admin/sealed-products/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to update product');
        }
        setProducts((prev) =>
          prev.map((product) => (product.id === editing.id ? { ...product, ...data.product } : product))
        );
        addToast({ title: 'Sealed product updated' });
      } else {
        const res = await fetch('/api/admin/sealed-products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to create product');
        }
        setProducts((prev) => [data.product, ...prev]);
        addToast({ title: 'Sealed product added' });
      }
      setEditing(null);
    } catch (error) {
      addToast({
        title: 'Save failed',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this sealed product? This cannot be undone.')) {
      return;
    }
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/sealed-products/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete product');
      }
      setProducts((prev) => prev.filter((product) => product.id !== id));
      addToast({ title: 'Sealed product deleted' });
      if (editing?.id === id) {
        setEditing(null);
      }
    } catch (error) {
      addToast({
        title: 'Delete failed',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <CardTitle>Sealed Product Catalog</CardTitle>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <Input
              placeholder="Search by name, set, or code"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full md:w-64"
            />
            <Button onClick={startCreate}>Add Product</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {filteredProducts.length === 0 ? (
            <p className="text-sm text-muted">No sealed products match your search.</p>
          ) : (
            <div className="space-y-4">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex flex-col gap-4 rounded-lg border border-white/10 p-4 md:flex-row md:items-center"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="relative h-16 w-16 overflow-hidden rounded border border-white/10">
                      {product.imageUrl ? (
                        <NextImage
                          src={product.imageUrl}
                          alt={product.name}
                          fill
                          className="object-cover"
                          unoptimized={product.imageUrl.startsWith('data:image')}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-muted">No image</div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{product.name}</p>
                      <p className="text-sm text-muted truncate">
                        {product.setName ?? 'Unknown Set'} • {product.productType.replace(/_/g, ' ')}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted">
                        {product.setCode && <Badge variant="secondary">{product.setCode}</Badge>}
                        {product.priceAvg && (
                          <span>Avg €{Number(product.priceAvg).toFixed(2)}</span>
                        )}
                        {product.msrp && <span>MSRP €{Number(product.msrp).toFixed(2)}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => startEdit(product)}>
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleDelete(product.id)}
                      disabled={deletingId === product.id}
                    >
                      {deletingId === product.id ? 'Deleting...' : 'Delete'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {editing && (
        <Card>
          <CardHeader>
            <CardTitle>{editing.id ? 'Edit Sealed Product' : 'Add Sealed Product'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Name</label>
                <Input value={editing.name} onChange={(event) => handleChange('name', event.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Slug (optional)</label>
                <Input value={editing.slug} onChange={(event) => handleChange('slug', event.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Set Name</label>
                <Input value={editing.setName} onChange={(event) => handleChange('setName', event.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Set Code</label>
                <Input value={editing.setCode} onChange={(event) => handleChange('setCode', event.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Product Type</label>
                <select
                  className="w-full rounded-md border border-white/20 bg-transparent px-3 py-2 text-sm"
                  value={editing.productType}
                  onChange={(event) => handleChange('productType', event.target.value as ProductType)}
                >
                  {PRODUCT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Game</label>
                <select
                  className="w-full rounded-md border border-white/20 bg-transparent px-3 py-2 text-sm"
                  value={editing.game}
                  onChange={(event) => handleChange('game', event.target.value as GameType)}
                >
                  {GAME_OPTIONS.map((game) => (
                    <option key={game} value={game}>
                      {game.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold">Preview Image</label>
              <div className="flex flex-col gap-2 rounded-lg border border-white/10 p-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) handleFileUpload(file);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                />
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="justify-start"
                  >
                    {editing.imageUrl ? 'Replace Uploaded Image' : 'Upload JPG/PNG/WebP'}
                  </Button>
                  <p className="text-xs text-muted">
                    Files are stored inline as secure data URLs. External links are intentionally blocked.
                  </p>
                </div>
                <div className="relative h-40 rounded border border-white/10 bg-black/20">
                  {editing.imageUrl ? (
                    <NextImage
                      src={editing.imageUrl}
                      alt="Preview"
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm text-muted">
                      No image uploaded yet
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Average Value (€)</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editing.priceAvg}
                  onChange={(event) => handleChange('priceAvg', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">MSRP (€)</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editing.msrp}
                  onChange={(event) => handleChange('msrp', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Cardmarket Product ID</label>
                <Input
                  type="number"
                  min="0"
                  value={editing.cardmarketProductId}
                  onChange={(event) => handleChange('cardmarketProductId', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">TCGplayer Product ID</label>
                <Input
                  type="number"
                  min="0"
                  value={editing.tcgplayerId}
                  onChange={(event) => handleChange('tcgplayerId', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Release Date</label>
                <Input
                  type="date"
                  value={editing.releaseDate}
                  onChange={(event) => handleChange('releaseDate', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Source URL</label>
                <Input
                  value={editing.sourceUri}
                  onChange={(event) => handleChange('sourceUri', event.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Description</label>
                <textarea
                  value={editing.description}
                  onChange={(event) => handleChange('description', event.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Contents / Notes</label>
                <textarea
                  value={editing.contents}
                  onChange={(event) => handleChange('contents', event.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? 'Saving...' : editing.id ? 'Save Changes' : 'Create Product'}
              </Button>
              <Button variant="outline" onClick={cancelEdit} disabled={saving}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

