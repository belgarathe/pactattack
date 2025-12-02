import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createBattleSchema = z.object({
  boxId: z.string().min(1),
  entryFee: z.number().int().min(0).optional().default(0),
  maxParticipants: z.number().int().min(2).max(4).optional().default(4),
  rounds: z.number().int().min(1).max(10).optional().default(1),
  battleMode: z.enum(['NORMAL', 'UPSIDE_DOWN', 'JACKPOT']).optional().default('NORMAL'),
  shareMode: z.boolean().optional().default(false),
  battleFormat: z.enum(['SOLO', 'TEAM']).optional().default('SOLO'),
  teamSize: z.number().int().min(1).max(4).optional().default(1),
  teamCount: z.number().int().min(1).max(4).optional().default(1),
});

// GET - List battles
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // WAITING, IN_PROGRESS, FINISHED

    const battles = await prisma.battle.findMany({
      where: status ? { status: status as any } : undefined,
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
            games: true,
            cards: {
              orderBy: [
                { coinValue: 'desc' },
                { priceAvg: 'desc' },
                { priceHigh: 'desc' },
              ],
              take: 1,
              select: {
                id: true,
                name: true,
                imageUrlGatherer: true,
                imageUrlScryfall: true,
                rarity: true,
                coinValue: true,
                priceAvg: true,
              },
            },
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
        },
        winner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            participants: true,
            pulls: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      battles: battles.map((battle) => {
        const { cards = [], ...boxData } = battle.box;
        const topCard = cards[0];
        const mostValuableCard = topCard
          ? {
              id: topCard.id,
              name: topCard.name,
              imageUrlGatherer: topCard.imageUrlGatherer,
              imageUrlScryfall: topCard.imageUrlScryfall,
              rarity: topCard.rarity,
              coinValue: topCard.coinValue,
              priceAvg: topCard.priceAvg ? Number(topCard.priceAvg) : null,
            }
          : null;

        return {
          id: battle.id,
          creator: battle.creator,
          box: {
            ...boxData,
            mostValuableCard,
          },
          entryFee: battle.entryFee,
          maxParticipants: battle.maxParticipants,
          status: battle.status,
          participantCount: battle._count.participants,
          pullCount: battle._count.pulls,
          rounds: battle.rounds,
          battleMode: battle.battleMode,
          format: battle.format,
          teamSize: battle.teamSize,
          teamCount: battle.teamCount,
          shareMode: battle.shareMode,
          participants: battle.participants.map((p) => ({
            id: p.id,
            user: p.user,
            totalValue: p.totalValue,
            roundsPulled: p.roundsPulled,
            teamNumber: p.teamNumber,
          })),
          winner: battle.winner,
          winningTeamNumber: battle.winningTeamNumber,
          totalPrize: battle.totalPrize,
          createdAt: battle.createdAt,
          startedAt: battle.startedAt,
          finishedAt: battle.finishedAt,
        };
      }),
    });
  } catch (error) {
    console.error('[BATTLES API] Error listing battles:', error);
    return NextResponse.json(
      { error: 'Failed to list battles' },
      { status: 500 }
    );
  }
}

// POST - Create battle
export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, coins: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      boxId,
      entryFee = 0,
      maxParticipants = 4,
      rounds = 1,
      battleMode = 'NORMAL',
      shareMode = false,
      battleFormat = 'SOLO',
      teamSize = 1,
      teamCount = 1,
    } = createBattleSchema.parse(body);

    const isTeamBattle = battleFormat === 'TEAM';
    const derivedMaxParticipants = isTeamBattle ? teamSize * teamCount : maxParticipants;
    const finalMaxParticipants = derivedMaxParticipants;

    if (isTeamBattle && maxParticipants !== derivedMaxParticipants) {
      return NextResponse.json(
        { error: 'Team battles require max participants to equal team size × team count' },
        { status: 400 }
      );
    }

    // Verify box exists and is active
    const box = await prisma.box.findUnique({
      where: { id: boxId },
      select: { id: true, name: true, isActive: true, price: true },
    });

    if (!box) {
      return NextResponse.json({ error: 'Box not found' }, { status: 404 });
    }

    if (!box.isActive) {
      return NextResponse.json({ error: 'Box is not active' }, { status: 400 });
    }

    // Check if user has enough coins for entry fee + cost of all packs across the rounds
    // Creator also needs to buy every pack up front
    const packCost = box.price * rounds;
    const totalCost = entryFee + packCost;
    if (user.coins < totalCost) {
      return NextResponse.json(
        {
          error: `Not enough coins. Need ${totalCost} coins (${entryFee} entry fee + ${packCost} for ${rounds} pack${rounds === 1 ? '' : 's'})`,
        },
        { status: 400 }
      );
    }

    // Create battle and add creator as first participant
    const battle = await prisma.$transaction(async (tx) => {
      // Deduct entry fee + cost of all packs (creator must buy every pack upfront)
      await tx.user.update({
        where: { id: user.id },
        data: { coins: { decrement: totalCost } },
      });

      // Create battle
      const newBattle = await tx.battle.create({
        data: {
          creatorId: user.id,
          boxId: box.id,
          entryFee,
          maxParticipants: finalMaxParticipants,
          rounds,
          battleMode,
          format: battleFormat,
          teamSize: isTeamBattle ? teamSize : 1,
          teamCount: isTeamBattle ? teamCount : finalMaxParticipants,
          shareMode,
          status: 'WAITING',
          participants: {
            create: {
              userId: user.id,
              totalValue: 0,
              roundsPulled: 0,
              teamNumber: 1,
            },
          },
        },
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
            games: true,
              cards: {
                orderBy: [
                  { coinValue: 'desc' },
                  { priceAvg: 'desc' },
                  { priceHigh: 'desc' },
                ],
                take: 1,
                select: {
                  id: true,
                  name: true,
                  imageUrlGatherer: true,
                  imageUrlScryfall: true,
                  rarity: true,
                  coinValue: true,
                  priceAvg: true,
                },
              },
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
          },
        },
      });

      return newBattle;
    });

    return NextResponse.json({
      success: true,
      battle: {
        id: battle.id,
        creator: battle.creator,
        box: {
          id: battle.box.id,
          name: battle.box.name,
          imageUrl: battle.box.imageUrl,
          price: battle.box.price,
          games: battle.box.games,
          mostValuableCard: battle.box.cards?.[0]
            ? {
                id: battle.box.cards[0].id,
                name: battle.box.cards[0].name,
                imageUrlGatherer: battle.box.cards[0].imageUrlGatherer,
                imageUrlScryfall: battle.box.cards[0].imageUrlScryfall,
                rarity: battle.box.cards[0].rarity,
                coinValue: battle.box.cards[0].coinValue,
                priceAvg: battle.box.cards[0].priceAvg
                  ? Number(battle.box.cards[0].priceAvg)
                  : null,
              }
            : null,
        },
        entryFee: battle.entryFee,
        maxParticipants: battle.maxParticipants,
        status: battle.status,
        rounds: battle.rounds,
        battleMode: battle.battleMode,
        shareMode: battle.shareMode,
        format: battle.format,
        teamSize: battle.teamSize,
        teamCount: battle.teamCount,
        participants: battle.participants.map((p) => ({
          id: p.id,
          user: p.user,
          totalValue: p.totalValue,
          roundsPulled: p.roundsPulled,
          teamNumber: p.teamNumber,
        })),
        createdAt: battle.createdAt,
      },
    });
  } catch (error) {
    console.error('[BATTLES API] Error creating battle:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create battle' },
      { status: 500 }
    );
  }
}

