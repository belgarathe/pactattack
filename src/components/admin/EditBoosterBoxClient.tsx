'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

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

type EditBoosterBoxClientProps = {
  boosterBox: {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
    setName: string | null;
    setCode: string | null;
    priceAvg: number | null;
    pullRate: number;
    coinValue: number;
    boxId: string | null;
  };
};

export function EditBoosterBoxClient({ boosterBox }: EditBoosterBoxClientProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BoosterBoxFormData>({
    resolver: zodResolver(boosterBoxSchema),
    defaultValues: {
      name: boosterBox.name,
      description: boosterBox.description,
      imageUrl: boosterBox.imageUrl,
      setName: boosterBox.setName || '',
      setCode: boosterBox.setCode || '',
      priceAvg: boosterBox.priceAvg ? Number(boosterBox.priceAvg) : undefined,
      pullRate: Number(boosterBox.pullRate),
      coinValue: boosterBox.coinValue,
    },
  });

  const onSubmit = async (data: BoosterBoxFormData) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/booster-boxes/${boosterBox.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Failed to update booster box');
      }

      addToast({
        title: 'Booster box updated',
        description: 'The booster box has been updated successfully.',
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

      <Card>
        <CardHeader>
          <CardTitle>Booster Box Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" {...register('name')} />
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
              />
              {errors.description && (
                <p className="text-sm text-red-400">{errors.description.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageUrl">Image URL *</Label>
              <Input id="imageUrl" {...register('imageUrl')} />
              {errors.imageUrl && (
                <p className="text-sm text-red-400">{errors.imageUrl.message}</p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="setName">Set Name</Label>
                <Input id="setName" {...register('setName')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="setCode">Set Code</Label>
                <Input id="setCode" {...register('setCode')} />
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
                />
              </div>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Saving...' : 'Save Changes'}
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

