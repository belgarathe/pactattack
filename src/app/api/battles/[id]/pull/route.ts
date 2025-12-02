import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { determineWinningParticipants } from '@/lib/battles';

function drawItem(items: Array<{ id: string; pullRate: number; type: 'card' | 'boosterBox' }>) {
  if (!items || items.length === 0) {
    throw new Error('No items available to draw from');
  }

  const total = items.reduce((sum, item) => sum + item.pullRate, 0);
  
  if (total === 0) {
    throw new Error('Total pull rate is zero - cannot draw items');
  }

  const random = Math.random() * total;
  let cumulative = 0;

  for (const item of items) {
    cumulative += item.pullRate;
    if (random <= cumulative) {
      return { id: item.id, type: item.type };
    }
  }

  const lastItem = items[items.length - 1];
  return lastItem ? { id: lastItem.id, type: lastItem.type } : { id: '', type: 'card' as const };
}

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

    // Get battle with all necessary data
    const battle = await prisma.battle.findUnique({
      where: { id: battleId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
              },
            },
          },
        },
        box: {
          include: {
            cards: true,
            boosterBoxes: true,
          },
        },
      },
    });

    if (!battle) {
      return NextResponse.json({ error: 'Battle not found' }, { status: 404 });
    }

    if (battle.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { error: 'Battle is not in progress' },
        { status: 400 }
      );
    }

    // Find participant
    const participant = battle.participants.find((p) => p.userId === user.id);

    if (!participant) {
      return NextResponse.json(
        { error: 'You are not a participant in this battle' },
        { status: 403 }
      );
    }

    // Check if participant has completed all rounds
    if (participant.roundsPulled >= battle.rounds) {
      return NextResponse.json(
        { error: 'You have completed all rounds in this battle' },
        { status: 400 }
      );
    }

    const currentRound = participant.roundsPulled + 1;

    // Draw card using the same logic as pack opening
    const weightedItems = [
      ...battle.box.cards.map((card) => ({
        id: card.id,
        pullRate: Number(card.pullRate),
        type: 'card' as const,
        data: card,
      })),
      ...(battle.box.boosterBoxes || []).map((boosterBox) => ({
        id: boosterBox.id,
        pullRate: Number(boosterBox.pullRate),
        type: 'boosterBox' as const,
        data: boosterBox,
      })),
    ];

    if (weightedItems.length === 0) {
      return NextResponse.json(
        { error: 'Box has no items available' },
        { status: 400 }
      );
    }

    const drawnItem = drawItem(weightedItems);
    const pulledCard = drawnItem.type === 'card' ? (drawnItem.data as (typeof battle.box.cards)[number]) : null;
    const pulledBooster =
      drawnItem.type === 'boosterBox'
        ? (drawnItem.data as NonNullable<typeof battle.box.boosterBoxes>[number])
        : null;
    const coinValue =
      drawnItem.type === 'card'
        ? (pulledCard?.coinValue ?? 1)
        : (pulledBooster?.diamondCoinValue ?? 1);
    const snapshotName = pulledCard?.name ?? pulledBooster?.name ?? 'Unknown Item';
    const snapshotImage =
      pulledCard?.imageUrlGatherer ||
      pulledCard?.imageUrlScryfall ||
      pulledBooster?.imageUrl ||
      null;
    const snapshotSetName = pulledCard?.setName ?? pulledBooster?.setName ?? null;
    const snapshotRarity = pulledCard?.rarity ?? null;

    // Create pull and battle pull in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the pull
      const pull = await tx.pull.create({
        data: {
          userId: user.id,
          boxId: battle.boxId,
          cardId: drawnItem.type === 'card' ? drawnItem.id : null,
          boosterBoxId: drawnItem.type === 'boosterBox' ? drawnItem.id : null,
          cardValue: coinValue,
        },
        include: {
          card: drawnItem.type === 'card',
          boosterBox: drawnItem.type === 'boosterBox',
        },
      });

      // Create battle pull
      await tx.battlePull.create({
        data: {
          battleId: battle.id,
          participantId: participant.id,
          pullId: pull.id,
          roundNumber: currentRound,
          coinValue,
          itemType: drawnItem.type === 'card' ? 'CARD' : 'BOOSTER_BOX',
          itemName: snapshotName,
          itemImage: snapshotImage,
          itemSetName: snapshotSetName,
          itemRarity: snapshotRarity,
          cardId: drawnItem.type === 'card' ? drawnItem.id : null,
          boosterBoxId: drawnItem.type === 'boosterBox' ? drawnItem.id : null,
        },
      });

      // Update participant - add to total value and increment rounds pulled
      const updatedParticipant = await tx.battleParticipant.update({
        where: { id: participant.id },
        data: {
          roundsPulled: { increment: 1 },
          totalValue: { increment: coinValue },
        },
      });

      // Update battle total prize
      await tx.battle.update({
        where: { id: battle.id },
        data: {
          totalPrize: { increment: coinValue },
        },
      });

      // Check if all participants have completed all rounds
      const allParticipants = await tx.battleParticipant.findMany({
        where: { battleId: battle.id },
      });

      const allCompleted = allParticipants.every((p) => {
        if (p.id === participant.id) {
          return updatedParticipant.roundsPulled >= battle.rounds;
        }
        return p.roundsPulled >= battle.rounds;
      });

      let winningTeamNumberResult: number | null = null;
      let primaryWinnerSummary: {
        id: string;
        userId: string;
        totalValue: number;
        teamNumber: number | null;
      } | null = null;

      if (allCompleted) {
        const finalParticipants = allParticipants.map((p) =>
          p.id === participant.id ? updatedParticipant : p
        );

        const battlePulls = await tx.battlePull.findMany({
          where: { battleId: battle.id },
          orderBy: { pulledAt: 'asc' },
          select: {
            pullId: true,
            participantId: true,
            coinValue: true,
          },
        });

        const { winningParticipants, winningTeamNumber, primaryParticipant } = determineWinningParticipants(
          {
            format: battle.format,
            teamSize: battle.teamSize,
            teamCount: battle.teamCount,
            battleMode: battle.battleMode,
          },
          finalParticipants.map((p) => ({
            id: p.id,
            userId: p.userId,
            totalValue: p.totalValue,
            teamNumber: p.teamNumber ?? null,
          })),
          battlePulls
        );

        if (!winningParticipants.length || !primaryParticipant) {
          throw new Error('Unable to resolve winning participants');
        }

        winningTeamNumberResult = winningTeamNumber;
        primaryWinnerSummary = primaryParticipant;

        // Transfer pulls to winners (round-robin for teams)
        if (battle.format === 'TEAM' && winningParticipants.length > 1) {
          let winnerIndex = 0;
          for (const battlePull of battlePulls) {
            const recipient = winningParticipants[winnerIndex % winningParticipants.length];
            await tx.pull.update({
              where: { id: battlePull.pullId },
              data: { userId: recipient.userId },
            });
            winnerIndex += 1;
          }
        } else {
          for (const battlePull of battlePulls) {
            await tx.pull.update({
              where: { id: battlePull.pullId },
              data: { userId: primaryParticipant.userId },
            });
          }
        }

        const finalTotalPrize = battle.totalPrize + coinValue;
        const winnerCount = winningParticipants.length || 1;
        const baseShare = Math.floor(finalTotalPrize / winnerCount);
        let remainder = finalTotalPrize - baseShare * winnerCount;

        for (const winnerParticipant of winningParticipants) {
          const bonus = remainder > 0 ? 1 : 0;
          const increment = baseShare + bonus;
          if (bonus > 0) {
            remainder -= 1;
          }

          if (increment > 0) {
            await tx.user.update({
              where: { id: winnerParticipant.userId },
              data: { coins: { increment } },
            });
          }
        }

        await tx.battle.update({
          where: { id: battle.id },
          data: {
            status: 'FINISHED',
            winnerId: primaryParticipant.userId,
            totalPrize: finalTotalPrize,
            finishedAt: new Date(),
            winningTeamNumber,
          },
        });
      }

      return {
        pull,
        participant: updatedParticipant,
        currentRound,
        allCompleted,
        winningTeamNumber: winningTeamNumberResult,
        primaryWinner: primaryWinnerSummary,
      };
    });

    return NextResponse.json({
      success: true,
      pull: {
        id: result.pull.id,
        card: result.pull.card,
        boosterBox: result.pull.boosterBox,
        coinValue,
        roundNumber: result.currentRound,
      },
      participant: {
        totalValue: result.participant.totalValue,
        roundsPulled: result.participant.roundsPulled,
      },
      battleComplete: result.allCompleted,
      winner: result.primaryWinner
        ? {
            userId: result.primaryWinner.userId,
            totalValue: result.primaryWinner.totalValue,
          }
        : null,
      winningTeamNumber: result.winningTeamNumber,
    });
  } catch (error) {
    console.error('[BATTLES API] Error pulling in battle:', error);
    return NextResponse.json(
      { error: 'Failed to pull in battle' },
      { status: 500 }
    );
  }
}

