import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BoxManagementClient } from '@/components/admin/BoxManagementClient';

async function getBoxes() {
  return await prisma.box.findMany({
    include: {
      _count: {
        select: { cards: true, pulls: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export default async function AdminBoxesPage() {
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

  const boxes = await getBoxes();

  return (
    <div className="container py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-4xl font-bold">Box Management</h1>
          <p className="text-muted">Manage all boxes in your platform</p>
        </div>
        <Button asChild>
          <Link href="/admin/boxes/create">Create New Box</Link>
        </Button>
      </div>

      {boxes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted mb-4">No boxes created yet.</p>
          <Button asChild>
            <Link href="/admin/boxes/create">Create Your First Box</Link>
          </Button>
        </div>
      ) : (
        <BoxManagementClient boxes={boxes} />
      )}
    </div>
  );
}

