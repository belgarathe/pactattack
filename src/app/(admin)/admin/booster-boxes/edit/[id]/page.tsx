import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import { EditBoosterBoxClient } from '@/components/admin/EditBoosterBoxClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getBoosterBox(id: string) {
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

  // Check if BoosterBox model exists
  if (!('boosterBox' in prisma)) {
    console.warn('BoosterBox model not found in Prisma Client. Please run: npx prisma generate');
    return null;
  }

  const boosterBox = await (prisma as any).boosterBox.findUnique({
    where: { id },
  });

  return boosterBox;
}

export default async function EditBoosterBoxPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const boosterBox = await getBoosterBox(id);

  if (!boosterBox) {
    notFound();
  }

  return (
    <div className="container py-12">
      <div className="mb-8">
        <h1 className="mb-2 text-4xl font-bold">Edit Booster Box</h1>
        <p className="text-muted">Update booster box details</p>
      </div>

      <EditBoosterBoxClient boosterBox={boosterBox} />
    </div>
  );
}

