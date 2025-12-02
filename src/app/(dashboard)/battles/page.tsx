import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { BattlesClient } from '@/components/battles/BattlesClient';

export default async function BattlesPage() {
  const session = await getCurrentSession();
  if (!session?.user?.email) {
    redirect('/login');
  }

  return <BattlesClient />;
}







