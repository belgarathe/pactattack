import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getNextTeamNumber } from '@/lib/battles';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: battleId } = await params;

    // Get battle with participants
    const battle = await prisma.battle.findUnique({
      where: { id: battleId },
      include: {
        participants: true,
        box: {
          select: {
            id: true,
            price: true,
          },
        },
      },
    });

    if (!battle) {
      return NextResponse.json({ error: 'Battle not found' }, { status: 404 });
    }

    if (battle.status !== 'WAITING') {
      return NextResponse.json(
        { error: 'Battle is not accepting new participants' },
        { status: 400 }
      );
    }

    // Check if user is already a participant
    const existingParticipant = battle.participants.find(
      (p) => p.userId === user.id
    );

    if (existingParticipant) {
      return NextResponse.json(
        { error: 'You are already in this battle' },
        { status: 400 }
      );
    }

    // Check if battle is full
    if (battle.participants.length >= battle.maxParticipants) {
      return NextResponse.json(
        { error: 'Battle is full' },
        { status: 400 }
      );
    }

    // Check if user has enough coins for entry fee + cost of all packs (box price per round)
    const packCost = battle.box.price * battle.rounds;
    const totalCost = battle.entryFee + packCost;
    if (user.coins < totalCost) {
      return NextResponse.json(
        {
          error: `Not enough coins. Need ${totalCost} coins (${battle.entryFee} entry fee + ${packCost} for ${battle.rounds} pack${battle.rounds === 1 ? '' : 's'})`,
        },
        { status: 400 }
      );
    }

    // Determine team assignment
    const teamNumber = getNextTeamNumber(
      {
        format: battle.format,
        teamSize: battle.teamSize,
        teamCount: battle.teamCount,
        battleMode: battle.battleMode,
      },
      battle.participants
    );

    // Join battle
    const result = await prisma.$transaction(async (tx) => {
      // Deduct coins for entry fee + every pack in the battle
      await tx.user.update({
        where: { id: user.id },
        data: { coins: { decrement: totalCost } },
      });

      // Add participant
      const participant = await tx.battleParticipant.create({
        data: {
          battleId: battle.id,
          userId: user.id,
          totalValue: 0,
          roundsPulled: 0,
          teamNumber,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Check if battle is now full, start it
      const updatedBattle = await tx.battle.findUnique({
        where: { id: battleId },
        include: {
          participants: true,
        },
      });

      if (updatedBattle && updatedBattle.participants.length >= updatedBattle.maxParticipants) {
        await tx.battle.update({
          where: { id: battleId },
          data: {
            status: 'IN_PROGRESS',
            startedAt: new Date(),
          },
        });
      }

      return participant;
    });

    return NextResponse.json({
      success: true,
      participant: {
        id: result.id,
        user: result.user,
        totalValue: result.totalValue,
        hasPulled: result.hasPulled,
        teamNumber: result.teamNumber,
      },
    });
  } catch (error) {
    console.error('[BATTLES API] Error joining battle:', error);
    return NextResponse.json(
      { error: 'Failed to join battle' },
      { status: 500 }
    );
  }
}

