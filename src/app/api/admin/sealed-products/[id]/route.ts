import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentSession } from '@/lib/auth';
import { CardGame, SealedProductType } from '@prisma/client';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const UPDATE_SCHEMA = z.object({
  name: z.string().min(2).optional(),
  slug: z.string().min(2).optional(),
  setName: z.string().optional().nullable(),
  setCode: z.string().max(10).optional().nullable(),
  productType: z.nativeEnum(SealedProductType).optional(),
  imageUrl: z
    .string()
    .min(1)
    .refine((value) => value.startsWith('data:image'), 'Image must be uploaded (data URI)')
    .optional(),
  priceAvg: z.number().nonnegative().optional().nullable(),
  msrp: z.number().nonnegative().optional().nullable(),
  description: z.string().optional().nullable(),
  contents: z.string().optional().nullable(),
  sourceUri: z.string().url().optional().nullable(),
  cardmarketProductId: z.number().int().positive().optional().nullable(),
  tcgplayerId: z.number().int().positive().optional().nullable(),
  releaseDate: z.string().datetime().optional().nullable(),
  game: z.nativeEnum(CardGame).optional(),
});

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

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminCheck = await ensureAdmin();
    if (adminCheck.error) return adminCheck.error;

    const { id } = await params;
    const body = await request.json();
    const parsed = UPDATE_SCHEMA.parse(body);

    const data: Record<string, unknown> = { ...parsed };

    if (parsed.slug) {
      const slugExists = await prisma.sealedProductCatalog.findUnique({
        where: { slug: parsed.slug },
        select: { id: true },
      });
      if (slugExists && slugExists.id !== id) {
        return NextResponse.json(
          { error: 'Slug already exists. Please choose another slug.' },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.sealedProductCatalog.update({
      where: { id },
      data,
    });

    return NextResponse.json({ product: serializeProduct(updated) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid payload', details: error.flatten() },
        { status: 400 }
      );
    }
    console.error('Failed to update sealed product', error);
    return NextResponse.json(
      { error: 'Failed to update sealed product' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminCheck = await ensureAdmin();
    if (adminCheck.error) return adminCheck.error;

    const { id } = await params;

    await prisma.sealedProductCatalog.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete sealed product', error);
    return NextResponse.json(
      { error: 'Failed to delete sealed product' },
      { status: 500 }
    );
  }
}

