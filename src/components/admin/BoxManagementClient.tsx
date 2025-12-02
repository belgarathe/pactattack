'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { formatCoins } from '@/lib/utils';
import { Trash2, Edit, Save, X } from 'lucide-react';
import Link from 'next/link';

type Box = {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  cardsPerPack: number;
  isActive: boolean;
  featured: boolean;
  _count: {
    cards: number;
    pulls: number;
  };
};

type BoxManagementClientProps = {
  boxes: Box[];
};

export function BoxManagementClient({ boxes: initialBoxes }: BoxManagementClientProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [boxes, setBoxes] = useState(initialBoxes);
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [priceValue, setPriceValue] = useState<string>('');
  const [deletingBoxId, setDeletingBoxId] = useState<string | null>(null);
  const [updatingPriceId, setUpdatingPriceId] = useState<string | null>(null);

  const startEditingPrice = (boxId: string, currentPrice: number) => {
    setEditingPrice(boxId);
    setPriceValue(currentPrice.toString());
  };

  const cancelEditingPrice = () => {
    setEditingPrice(null);
    setPriceValue('');
  };

  const updatePrice = async (boxId: string) => {
    const newPrice = parseInt(priceValue);
    if (isNaN(newPrice) || newPrice <= 0) {
      addToast({
        title: 'Invalid price',
        description: 'Price must be a positive number',
        variant: 'destructive',
      });
      return;
    }

    setUpdatingPriceId(boxId);
    try {
      const res = await fetch(`/api/admin/boxes/${boxId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: newPrice }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update price');
      }

      // Update local state
      setBoxes((prevBoxes) =>
        prevBoxes.map((box) => (box.id === boxId ? { ...box, price: newPrice } : box))
      );

      setEditingPrice(null);
      setPriceValue('');

      addToast({
        title: 'Price updated!',
        description: `Box price updated to ${formatCoins(newPrice)} coins`,
      });

      router.refresh();
    } catch (error) {
      addToast({
        title: 'Error',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setUpdatingPriceId(null);
    }
  };

  const deleteBox = async (boxId: string) => {
    if (!confirm('Are you sure you want to delete this box? This action cannot be undone.')) {
      return;
    }

    setDeletingBoxId(boxId);
    try {
      const res = await fetch(`/api/admin/boxes/${boxId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete box');
      }

      // Remove box from local state
      setBoxes((prevBoxes) => prevBoxes.filter((box) => box.id !== boxId));

      addToast({
        title: 'Box deleted!',
        description: 'The box has been permanently deleted',
      });

      router.refresh();
    } catch (error) {
      addToast({
        title: 'Error',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setDeletingBoxId(null);
    }
  };

  return (
    <div className="space-y-4">
      {boxes.map((box) => (
        <Card key={box.id}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold">{box.name}</h3>
                  {box.isActive ? (
                    <Badge className="bg-green-500/20 text-green-300 border-green-500">Active</Badge>
                  ) : (
                    <Badge variant="outline">Inactive</Badge>
                  )}
                  {box.featured && <Badge>Featured</Badge>}
                </div>
                <p className="text-muted mb-4 line-clamp-2">{box.description}</p>
                <div className="flex gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted">Price:</span>
                    {editingPrice === box.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          value={priceValue}
                          onChange={(e) => setPriceValue(e.target.value)}
                          className="w-24 h-8"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              updatePrice(box.id);
                            } else if (e.key === 'Escape') {
                              cancelEditingPrice();
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updatePrice(box.id)}
                          disabled={updatingPriceId === box.id}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={cancelEditingPrice}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{formatCoins(box.price)} coins</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEditingPrice(box.id, box.price)}
                          className="h-6 w-6 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <span>Cards per pack: {box.cardsPerPack}</span>
                  <span>Total cards: {box._count.cards}</span>
                  <span>Opens: {box._count.pulls}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline">
                  <Link href={`/admin/boxes/edit/${box.id}`}>Edit</Link>
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => deleteBox(box.id)}
                  disabled={deletingBoxId === box.id}
                >
                  {deletingBoxId === box.id ? (
                    'Deleting...'
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}




