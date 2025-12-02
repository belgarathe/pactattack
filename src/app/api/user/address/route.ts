import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const addressSchema = z.object({
  addressLine1: z.string().min(1).optional(),
  addressLine2: z.string().optional(),
  city: z.string().min(1).optional(),
  state: z.string().optional(),
  postalCode: z.string().min(1).optional(),
  country: z.string().min(1).optional(),
  phone: z.string().optional(),
});

// Get user address
export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        postalCode: true,
        country: true,
        phone: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      address: {
        addressLine1: user.addressLine1,
        addressLine2: user.addressLine2,
        city: user.city,
        state: user.state,
        postalCode: user.postalCode,
        country: user.country,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error('Get address error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get address' },
      { status: 500 }
    );
  }
}

// Update user address
export async function PUT(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const addressData = addressSchema.parse(body);

    const user = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        addressLine1: addressData.addressLine1 || null,
        addressLine2: addressData.addressLine2 || null,
        city: addressData.city || null,
        state: addressData.state || null,
        postalCode: addressData.postalCode || null,
        country: addressData.country || null,
        phone: addressData.phone || null,
      },
      select: {
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        postalCode: true,
        country: true,
        phone: true,
      },
    });

    return NextResponse.json({
      success: true,
      address: {
        addressLine1: user.addressLine1,
        addressLine2: user.addressLine2,
        city: user.city,
        state: user.state,
        postalCode: user.postalCode,
        country: user.country,
        phone: user.phone,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Update address error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update address' },
      { status: 500 }
    );
  }
}




