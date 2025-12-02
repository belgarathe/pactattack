import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { BattleDetailClient } from '@/components/battles/BattleDetailClient';
import type { Role } from '@/types';

async function getBattle(id: string) {
  const battle = await prisma.battle.findUnique({
    where: { id },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      box: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
          price: true,
        },
      },
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          totalValue: 'desc',
        },
      },
      pulls: {
        include: {
          participant: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          pull: {
            select: {
              id: true,
              cardId: true,
              boosterBoxId: true,
              card: {
                select: {
                  id: true,
                  name: true,
                  imageUrlGatherer: true,
                  imageUrlScryfall: true,
                },
              },
              boosterBox: {
                select: {
                  id: true,
                  name: true,
                  imageUrl: true,
                },
              },
            },
          },
        },
      },
      winner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return battle;
}

export default async function BattleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getCurrentSession();
  if (!session?.user?.email) {
    redirect('/login');
  }

  const { id } = await params;
  const battle = await getBattle(id);

  if (!battle) {
    redirect('/battles');
  }

  return (
    <BattleDetailClient
      battle={battle}
      currentUserId={session.user.id}
      currentUserRole={session.user.role as Role}
    />
  );
}


