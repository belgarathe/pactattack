'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

type PreviewItem = {
  id: string;
  name: string;
  setName?: string;
  imageUrl?: string | null;
  pullRate: number;
  coinValue?: number;
  priceAvg?: number | null;
  type: 'card' | 'sealed';
  badgeLabel: string;
};

interface CardPreviewProps {
  items: PreviewItem[];
}

const rarityColors: Record<string, string> = {
  common: 'bg-gray-500/20 text-gray-300 border-gray-500',
  uncommon: 'bg-green-500/20 text-green-300 border-green-500',
  rare: 'bg-blue-500/20 text-blue-300 border-blue-500',
  mythic: 'bg-purple-500/20 text-purple-300 border-purple-500',
  sealed: 'bg-amber-500/20 text-amber-200 border-amber-500',
};

function getBadgeClasses(item: PreviewItem) {
  if (item.type === 'sealed') {
    return rarityColors.sealed;
  }
  const rarityClass = rarityColors[item.badgeLabel.toLowerCase()];
  return rarityClass || rarityColors.common;
}

export function CardPreview({ items }: CardPreviewProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Possible Pulls & Rates</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => (
          <Card key={item.id} className="overflow-hidden">
            <div className="relative aspect-[63/88] bg-gradient-to-br from-primary/20 to-secondary/20">
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  fill
                  className="object-contain"
                  unoptimized
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted">
                  No Image
                </div>
              )}
              <Badge
                className={`absolute top-2 right-2 ${getBadgeClasses(item)}`}
              >
                {item.badgeLabel}
              </Badge>
            </div>
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm">{item.name}</h3>
              <div className="mt-2 space-y-1">
                {item.setName && (
                  <div className="text-xs text-muted">{item.setName}</div>
                )}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">Pull Rate:</span>
                  <span className="font-semibold text-primary">
                    {item.pullRate.toFixed(3)}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">💎 Value:</span>
                  <span className="font-semibold text-yellow-400">
                    {item.coinValue || 1} coins
                  </span>
                </div>
                {typeof item.priceAvg === 'number' && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted">Avg. EUR:</span>
                    <span className="font-semibold text-foreground">
                      €{item.priceAvg.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="text-[11px] text-muted">
                  {item.type === 'sealed' ? 'Sealed Product' : 'Card'}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

