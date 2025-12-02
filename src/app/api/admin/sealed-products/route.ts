import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentSession } from '@/lib/auth';
import { CardGame, SealedProductType } from '@prisma/client';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '2mb',
    },
  },
};

const PRODUCT_SCHEMA = z.object({
  id: z.string().cuid().optional(),
  name: z.string().min(2, 'Name is required'),
  slug: z.string().min(2).optional(),
  setName: z.string().optional().nullable(),
  setCode: z.string().max(10).optional().nullable(),
  productType: z.nativeEnum(SealedProductType),
  imageUrl: z
    .string()
    .min(1)
    .refine((value) => value.startsWith('data:image'), 'Image must be uploaded (data URI).'),
  priceAvg: z.number().nonnegative().optional().nullable(),
  msrp: z.number().nonnegative().optional().nullable(),
  description: z.string().optional().nullable(),
  contents: z.string().optional().nullable(),
  sourceUri: z.string().url().optional().nullable(),
  cardmarketProductId: z.number().int().positive().optional().nullable(),
  tcgplayerId: z.number().int().positive().optional().nullable(),
  releaseDate: z.string().datetime().optional().nullable(),
  game: z.nativeEnum(CardGame).default('MAGIC_THE_GATHERING'),
});

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

async function ensureAdmin() {
  const session = await getCurrentSession();
  if (!session?.user?.email) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const adminUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { role: true },
  });
  if (!adminUser || adminUser.role !== 'ADMIN') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { session };
}

function serializeProduct(product: any) {
  return {
    ...product,
    priceAvg: product.priceAvg ? Number(product.priceAvg) : null,
    msrp: product.msrp ? Number(product.msrp) : null,
  };
}

export async function GET(request: Request) {
  try {
    const adminCheck = await ensureAdmin();
    if (adminCheck.error) return adminCheck.error;

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query')?.trim();
    const typeParam = searchParams.get('type')?.trim();
    const setCodeParam = searchParams.get('setCode')?.trim();

    const filters: any = {};

    if (query) {
      filters.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { setName: { contains: query, mode: 'insensitive' } },
        { setCode: { contains: query.toUpperCase(), mode: 'insensitive' } },
      ];
    }

    if (typeParam && Object.values(SealedProductType).includes(typeParam as SealedProductType)) {
      filters.productType = typeParam as SealedProductType;
    }

    if (setCodeParam) {
      filters.setCode = setCodeParam.toUpperCase();
    }

    const products = await prisma.sealedProductCatalog.findMany({
      where: filters,
      orderBy: [{ updatedAt: 'desc' }, { name: 'asc' }],
      take: 100,
    });

    return NextResponse.json({
      products: products.map(serializeProduct),
    });
  } catch (error) {
    console.error('Failed to fetch sealed products', error);
    return NextResponse.json(
      { error: 'Failed to fetch sealed products' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const adminCheck = await ensureAdmin();
    if (adminCheck.error) return adminCheck.error;

    const body = await request.json();
    const parsed = PRODUCT_SCHEMA.omit({ id: true }).parse(body);

    const slug = parsed.slug?.toLowerCase() || slugify(parsed.name);

    const existingSlug = await prisma.sealedProductCatalog.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (existingSlug) {
      return NextResponse.json(
        { error: 'Slug already exists. Please choose another slug.' },
        { status: 400 }
      );
    }

    const created = await prisma.sealedProductCatalog.create({
      data: {
        ...parsed,
        slug,
      },
    });

    return NextResponse.json({ product: serializeProduct(created) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid payload', details: error.flatten() },
        { status: 400 }
      );
    }
    console.error('Failed to create sealed product', error);
    return NextResponse.json(
      { error: 'Failed to create sealed product' },
      { status: 500 }
    );
  }
}
