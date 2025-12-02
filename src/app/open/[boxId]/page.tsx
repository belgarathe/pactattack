import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { PackOpenClient } from '@/components/pack-opening/PackOpenClient';

// Force dynamic rendering to ensure pack opening page shows latest box data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getBox(boxId: string) {
  try {
    const box = await prisma.box.findUnique({
      where: { id: boxId },
      include: {
        cards: true,
        boosterBoxes: {
          include: { catalog: true },
          orderBy: [{ name: 'asc' }],
        },
      },
    });

    if (!box) return null;

    // Convert Decimal values to numbers for client components
    return {
      ...box,
      cards: box.cards.map((card) => ({
        ...card,
        pullRate: Number(card.pullRate),
        diamondCoinValue: card.diamondCoinValue,
        priceLow: card.priceLow ? Number(card.priceLow) : null,
        priceAvg: card.priceAvg ? Number(card.priceAvg) : null,
        priceHigh: card.priceHigh ? Number(card.priceHigh) : null,
      })),
      boosterBoxes: box.boosterBoxes.map((product) => ({
        ...product,
        pullRate: Number(product.pullRate),
        diamondCoinValue: product.diamondCoinValue,
        priceLow: product.priceLow ? Number(product.priceLow) : null,
        priceAvg: product.priceAvg ? Number(product.priceAvg) : null,
        priceHigh: product.priceHigh ? Number(product.priceHigh) : null,
        catalog: product.catalog
          ? {
              ...product.catalog,
              priceAvg: product.catalog.priceAvg ? Number(product.catalog.priceAvg) : null,
              msrp: product.catalog.msrp ? Number(product.catalog.msrp) : null,
            }
          : null,
      })),
    };
  } catch (error) {
    console.error('Error fetching box:', error);
    return null;
  }
}

export default async function PackOpenPage({ params }: { params: Promise<{ boxId: string }> }) {
  const { boxId } = await params;
  const box = await getBox(boxId);

  if (!box || !box.isActive) {
    notFound();
  }

  return (
    <div className="container py-12">
      <div className="mb-8">
        <h1 className="mb-2 text-4xl font-bold">{box.name}</h1>
        <p className="text-muted">{box.description}</p>
      </div>
      <PackOpenClient box={box} />
    </div>
  );
}

