import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { CreateBoosterBoxClient } from '@/components/admin/CreateBoosterBoxClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CreateBoosterBoxPage() {
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

  return (
    <div className="container py-12">
      <div className="mb-8">
        <h1 className="mb-2 text-4xl font-bold">Create Booster Box</h1>
        <p className="text-muted">Create a standalone booster box item</p>
      </div>

      <CreateBoosterBoxClient />
    </div>
  );
}

