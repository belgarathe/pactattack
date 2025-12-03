'use server';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const MIN_SEALED_PRODUCTS = 2;
const PULL_RATE_TOLERANCE = 0.001;

const sealedProductSchema = z.object({
  catalogId: z.string().min(1),
  pullRate: z.number().min(0),
  coinValue: z.number().int().min(1).default(1),
  priceAvg: z.number().nonnegative().optional().nullable(),
});

const payloadSchema = z.object({
  sealedProducts: z.array(sealedProductSchema),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true },
    });

    if (!adminUser || adminUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const boosterBoxes = await prisma.boosterBox.findMany({
      where: { boxId: id },
      include: { catalog: true },
      orderBy: [{ name: 'asc' }],
    });

    return NextResponse.json({
      sealedProducts: boosterBoxes.map((bb) => ({
        id: bb.id,
        catalogId: bb.catalogId,
        name: bb.name,
        imageUrl: bb.imageUrl,
        setName: bb.setName,
        setCode: bb.setCode,
        productType: bb.productType,
        pullRate: Number(bb.pullRate),
        coinValue: bb.diamondCoinValue,
        priceAvg: bb.priceAvg ? Number(bb.priceAvg) : null,
        catalog: bb.catalog
          ? {
              id: bb.catalog.id,
              slug: bb.catalog.slug,
              imageUrl: bb.catalog.imageUrl,
              productType: bb.catalog.productType,
            }
          : null,
      })),
    });
  } catch (error) {
    console.error('Failed to load box sealed products', error);
    return NextResponse.json(
      { error: 'Failed to load sealed products' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true },
    });

    if (!adminUser || adminUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { sealedProducts } = payloadSchema.parse(body);

    const box = await prisma.box.findUnique({
      where: { id },
      include: {
        boosterBoxes: {
          include: {
            pulls: {
              select: { id: true },
              take: 1,
            },
          },
        },
        _count: {
          select: { cards: true },
        },
      },
    });

    if (!box) {
      return NextResponse.json({ error: 'Box not found' }, { status: 404 });
    }

    const totalSealedPullRate = sealedProducts.reduce((sum, product) => sum + product.pullRate, 0);
    if (totalSealedPullRate > 100 + PULL_RATE_TOLERANCE) {
      return NextResponse.json(
        {
          error: 'Sealed pull rates exceed 100%',
          details: `Combined sealed pull rate is ${totalSealedPullRate.toFixed(3)}%.`,
        },
        { status: 400 }
      );
    }

    const catalogIds = sealedProducts.map((product) => product.catalogId);
    const catalogEntries = await prisma.sealedProductCatalog.findMany({
      where: { id: { in: catalogIds } },
    });
    const catalogMap = new Map(catalogEntries.map((entry) => [entry.id, entry]));

    const missingIds = sealedProducts
      .map((product) => product.catalogId)
      .filter((catalogId) => !catalogMap.has(catalogId));

    if (missingIds.length) {
      return NextResponse.json(
        {
          error: 'Unknown catalog IDs',
          details: `Missing entries: ${missingIds.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const existingByCatalog = new Map(
      box.boosterBoxes
        .filter((bb) => bb.catalogId)
        .map((bb) => [bb.catalogId as string, bb])
    );

    if (box._count.cards === 0) {
      if (sealedProducts.length < MIN_SEALED_PRODUCTS) {
        return NextResponse.json(
          {
            error: `Boxes without cards must include at least ${MIN_SEALED_PRODUCTS} sealed products`,
          },
          { status: 400 }
        );
      }

      if (Math.abs(totalSealedPullRate - 100) > PULL_RATE_TOLERANCE) {
        return NextResponse.json(
          {
            error: 'Sealed products must cover 100% of pull rates when no cards are configured',
            details: `Current sealed pull rate total is ${totalSealedPullRate.toFixed(3)}%.`,
          },
          { status: 400 }
        );
      }
    }

    const operations: Promise<any>[] = [];

    for (const sealed of sealedProducts) {
      const catalog = catalogMap.get(sealed.catalogId)!;
      const existing = existingByCatalog.get(sealed.catalogId);

      if (existing) {
        operations.push(
          prisma.boosterBox.update({
            where: { id: existing.id },
            data: {
              name: catalog.name,
              description: catalog.description ?? '',
              imageUrl: catalog.imageUrl,
              setName: catalog.setName,
              setCode: catalog.setCode,
              productType: catalog.productType,
              pullRate: sealed.pullRate,
              diamondCoinValue: sealed.coinValue,
              priceAvg: sealed.priceAvg ?? catalog.priceAvg,
            },
          })
        );
      } else {
        operations.push(
          prisma.boosterBox.create({
            data: {
              catalogId: catalog.id,
              name: catalog.name,
              description: catalog.description ?? '',
              imageUrl: catalog.imageUrl,
              setName: catalog.setName,
              setCode: catalog.setCode,
              productType: catalog.productType,
              pullRate: sealed.pullRate,
              diamondCoinValue: sealed.coinValue,
              priceAvg: sealed.priceAvg ?? catalog.priceAvg,
              boxId: box.id,
            },
          })
        );
      }
    }

    const incomingCatalogIds = new Set(catalogIds);
    const deletable = box.boosterBoxes.filter(
      (bb) => bb.catalogId && !incomingCatalogIds.has(bb.catalogId) && (bb.pulls?.length ?? 0) === 0
    );

    if (deletable.length) {
      operations.push(
        prisma.boosterBox.deleteMany({
          where: { id: { in: deletable.map((bb) => bb.id) }, boxId: box.id },
        })
      );
    }

    if (operations.length > 0) {
      await prisma.$transaction(operations);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid payload', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Failed to update sealed products', error);
    return NextResponse.json(
      { error: 'Failed to update sealed products' },
      { status: 500 }
    );
  }
}

