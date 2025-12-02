import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { BoosterBoxManagementClient } from '@/components/admin/BoosterBoxManagementClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getBoosterBoxes() {
  const session = await getCurrentSession();
  if (!session?.user?.email) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user || user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  // Check if BoosterBox model exists in Prisma Client
  if (!('boosterBox' in prisma)) {
    // Prisma Client not regenerated yet - return empty array
    console.warn('BoosterBox model not found in Prisma Client. Please run: npx prisma generate');
    return [];
  }

  const boosterBoxes = await (prisma as any).boosterBox.findMany({
    include: {
      box: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return boosterBoxes;
}

export default async function BoosterBoxesPage() {
  const boosterBoxes = await getBoosterBoxes();

  return (
    <div className="container py-12">
      <div className="mb-8">
        <h1 className="mb-2 text-4xl font-bold">Booster Boxes</h1>
        <p className="text-muted">Manage booster boxes that can be drawn from boxes</p>
      </div>

      <BoosterBoxManagementClient initialBoosterBoxes={boosterBoxes} />
    </div>
  );
}

