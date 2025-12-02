import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { SealedCatalogManager } from '@/components/admin/SealedCatalogManager';

export const revalidate = 0;

export default async function AdminSealedProductsPage() {
  const session = await getCurrentSession();
  if (!session?.user?.email) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { role: true },
  });

  if (!user || user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  const products = await prisma.sealedProductCatalog.findMany({
    orderBy: [{ updatedAt: 'desc' }, { name: 'asc' }],
  });

  const serialized = products.map((product) => ({
    ...product,
    priceAvg: product.priceAvg ? Number(product.priceAvg) : null,
    msrp: product.msrp ? Number(product.msrp) : null,
  }));

  return (
    <div className="container py-10">
      <div className="mb-8">
        <h1 className="text-4xl font-bold">Sealed Product Catalog</h1>
        <p className="text-muted">
          Maintain the master data for all sealed products, including custom images, set details, and pricing.
        </p>
      </div>
      <SealedCatalogManager initialProducts={serialized} />
    </div>
  );
}





