'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import { Package, Plus, Edit, Trash2, ExternalLink } from 'lucide-react';
import Image from 'next/image';
import { formatCurrency } from '@/lib/utils';

type BoosterBox = {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  setName: string | null;
  setCode: string | null;
  priceAvg: number | null;
  pullRate: number;
  coinValue: number;
  box: {
    id: string;
    name: string;
  };
};

type BoosterBoxManagementClientProps = {
  initialBoosterBoxes: Array<{
    id: string;
    name: string;
    description: string;
    imageUrl: string;
    setName: string | null;
    setCode: string | null;
    priceAvg: number | null;
    pullRate: number;
    coinValue: number;
    box: {
      id: string;
      name: string;
    };
  }>;
};

export function BoosterBoxManagementClient({ initialBoosterBoxes }: BoosterBoxManagementClientProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [boosterBoxes, setBoosterBoxes] = useState(initialBoosterBoxes);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this booster box?')) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/booster-boxes/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete booster box');
      }

      setBoosterBoxes((prev) => prev.filter((bb) => bb.id !== id));
      addToast({
        title: 'Booster box deleted',
        description: 'The booster box has been removed.',
      });
    } catch (error) {
      addToast({
        title: 'Error',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (boosterBoxes.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Package className="mb-4 h-16 w-16 text-muted" />
          <h2 className="mb-2 text-2xl font-bold">No Booster Boxes</h2>
          <p className="mb-6 text-muted">Create your first booster box that can be drawn from boxes</p>
          <Button asChild>
            <a href="/admin/booster-boxes/create">
              <Plus className="mr-2 h-4 w-4" />
              Create Booster Box
            </a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button asChild>
          <a href="/admin/booster-boxes/create">
            <Plus className="mr-2 h-4 w-4" />
            Create Booster Box
          </a>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {boosterBoxes.map((boosterBox) => (
          <Card key={boosterBox.id} className="overflow-hidden">
            <div className="relative aspect-video bg-gradient-to-br from-primary/20 to-secondary/20">
              {boosterBox.imageUrl ? (
                <Image
                  src={boosterBox.imageUrl}
                  alt={boosterBox.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Package className="h-16 w-16 text-muted" />
                </div>
              )}
            </div>
            <CardContent className="p-4">
              <h3 className="mb-1 font-semibold text-lg">{boosterBox.name}</h3>
              {boosterBox.setName && (
                <p className="mb-2 text-sm text-muted">{boosterBox.setName}</p>
              )}
              <div className="mb-3 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted">Pull Rate:</span>
                  <span className="font-semibold text-primary">
                    {Number(boosterBox.pullRate).toFixed(3)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">💎 Value:</span>
                  <span className="font-semibold text-yellow-400">
                    {boosterBox.coinValue} coins
                  </span>
                </div>
                {boosterBox.priceAvg && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Price:</span>
                    <span className="font-semibold">{formatCurrency(boosterBox.priceAvg)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted">Box:</span>
                  <Badge variant="outline">{boosterBox.box.name}</Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => router.push(`/admin/booster-boxes/edit/${boosterBox.id}`)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(boosterBox.id)}
                  disabled={deletingId === boosterBox.id}
                >
                  {deletingId === boosterBox.id ? (
                    '...'
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}




