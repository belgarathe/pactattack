import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { determineWinningParticipants, getNextTeamNumber } from '@/lib/battles';
import bcrypt from 'bcrypt';
import { z } from 'zod';

const requestSchema = z.object({
  botCount: z.number().int().min(1).max(3).optional(),
});

const BOT_PASSWORD = 'bot-player-secret';
const DEFAULT_BOT_COINS = 1_000_000;
const TRANSACTION_OPTIONS = {
  maxWait: 5_000,
  timeout: 60_000,
} as const;

type WeightedItem = {
  id: string;
  type: 'card' | 'boosterBox';
  pullRate: number;
  coinValue: number;
  snapshot: {
    name: string;
    image?: string | null;
    setName?: string | null;
    rarity?: string | null;
  };
};

function drawItem(items: WeightedItem[]): WeightedItem {
  const total = items.reduce((sum, item) => sum + item.pullRate, 0);
  if (total <= 0) {
    throw new Error('No items available to draw from');
  }

  const random = Math.random() * total;
  let cumulative = 0;

  for (const item of items) {
    cumulative += item.pullRate;
    if (random <= cumulative) {
      return item;
    }
  }

  return items[items.length - 1];
}

async function ensureBotUsers(requiredCount: number) {
  if (requiredCount <= 0) {
    return [];
  }

  const existingBots = await prisma.user.findMany({
    where: { isBot: true },
    orderBy: { createdAt: 'asc' },
  });

  if (existingBots.length >= requiredCount) {
    return existingBots.slice(0, requiredCount);
  }

  const bots = [...existingBots];
  const hashedPassword = await bcrypt.hash(BOT_PASSWORD, 10);

  while (bots.length < requiredCount) {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newBot = await prisma.user.create({
      data: {
        email: `bot-player-${suffix}@pactattack.dev`,
        name: `Test Bot ${bots.length + 1}`,
        passwordHash: hashedPassword,
        coins: DEFAULT_BOT_COINS,
        role: 'USER',
        isBot: true,
      },
    });
    bots.push(newBot);
  }

  return bots.slice(0, requiredCount);
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

    const adminUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true },
    });

    if (!adminUser || adminUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const parsedBody = requestSchema.safeParse(body || {});
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsedBody.error.flatten() },
        { status: 400 }
      );
    }

    const { botCount } = parsedBody.data;
    const { id: battleId } = await params;

    const battlePreview = await prisma.battle.findUnique({
      where: { id: battleId },
      include: {
        participants: true,
        box: {
          include: {
            cards: true,
            boosterBoxes: true,
          },
        },
      },
    });

    if (!battlePreview) {
      return NextResponse.json({ error: 'Battle not found' }, { status: 404 });
    }

    if (battlePreview.status !== 'WAITING') {
      return NextResponse.json(
        { error: 'Only battles in WAITING status can be simulated' },
        { status: 400 }
      );
    }

    const previewAvailableSlots = battlePreview.maxParticipants - battlePreview.participants.length;
    if (previewAvailableSlots <= 0) {
      return NextResponse.json(
        { error: 'Battle is already full' },
        { status: 400 }
      );
    }

    const desiredBotCount = Math.min(botCount ?? previewAvailableSlots, previewAvailableSlots);
    if (desiredBotCount <= 0) {
      return NextResponse.json(
        { error: 'Bot count must be at least 1' },
        { status: 400 }
      );
    }

    const botUsers = await ensureBotUsers(desiredBotCount);
    if (botUsers.length < desiredBotCount) {
      return NextResponse.json(
        { error: 'Unable to provision enough bot players' },
        { status: 500 }
      );
    }

    const simulationResult = await prisma.$transaction(
      async (tx) => {
      const battle = await tx.battle.findUnique({
        where: { id: battleId },
        include: {
          participants: true,
          box: {
            include: {
              cards: true,
              boosterBoxes: true,
            },
          },
        },
      });

      if (!battle) {
        throw new Error('Battle not found');
      }

      if (battle.status !== 'WAITING') {
        throw new Error('Battle must be in WAITING status to simulate');
      }

      const availableSlots = battle.maxParticipants - battle.participants.length;
      if (availableSlots <= 0) {
        throw new Error('No available slots for bot players');
      }

      const seatsNeeded = Math.min(desiredBotCount, availableSlots);
      const botsToAdd = botUsers.filter(
        (bot) => !battle.participants.some((p) => p.userId === bot.id)
      ).slice(0, seatsNeeded);

      if (!botsToAdd.length) {
        throw new Error('Selected bots are already participating');
      }

      const packCost = battle.box.price * battle.rounds;
      const totalCost = battle.entryFee + packCost;
      const participantSnapshot = [...battle.participants];

      for (const bot of botsToAdd) {
        if (totalCost > 0) {
          const botBalance = await tx.user.findUnique({
            where: { id: bot.id },
            select: { coins: true },
          });

          if (!botBalance) {
            continue;
          }

          if (botBalance.coins < totalCost) {
            await tx.user.update({
              where: { id: bot.id },
              data: { coins: DEFAULT_BOT_COINS },
            });
          }

          await tx.user.update({
            where: { id: bot.id },
            data: { coins: { decrement: totalCost } },
          });
        }

        const teamNumber = getNextTeamNumber(
          {
            format: battle.format,
            teamSize: battle.teamSize,
            teamCount: battle.teamCount,
            battleMode: battle.battleMode,
          },
          participantSnapshot
        );

        const createdParticipant = await tx.battleParticipant.create({
          data: {
            battleId: battle.id,
            userId: bot.id,
            teamNumber,
          },
        });

        participantSnapshot.push(createdParticipant);
      }

      await tx.battle.update({
        where: { id: battle.id },
        data: {
          status: 'IN_PROGRESS',
          startedAt: battle.startedAt ?? new Date(),
        },
      });

      const participants = await tx.battleParticipant.findMany({
        where: { battleId: battle.id },
        orderBy: { joinedAt: 'asc' },
      });

      const weightedItems: WeightedItem[] = [
        ...battle.box.cards.map((card) => ({
          id: card.id,
          type: 'card' as const,
          pullRate: Number(card.pullRate),
          coinValue: card.coinValue || 1,
          snapshot: {
            name: card.name,
            image: card.imageUrlGatherer || card.imageUrlScryfall,
            setName: card.setName,
            rarity: card.rarity,
          },
        })),
        ...((battle.box.boosterBoxes || []).map((booster) => ({
          id: booster.id,
          type: 'boosterBox' as const,
          pullRate: Number(booster.pullRate),
          coinValue: booster.diamondCoinValue || 1,
          snapshot: {
            name: booster.name,
            image: booster.imageUrl,
            setName: booster.setName,
            rarity: null,
          },
        })) || []),
      ].filter((item) => item.pullRate > 0);

      if (!weightedItems.length) {
        throw new Error('Selected box has no drawable items');
      }

      let prizeIncrement = 0;

      for (const participant of participants) {
        for (let round = participant.roundsPulled + 1; round <= battle.rounds; round++) {
          const drawnItem = drawItem(weightedItems);

          const pull = await tx.pull.create({
            data: {
              userId: participant.userId,
              boxId: battle.boxId,
              cardId: drawnItem.type === 'card' ? drawnItem.id : null,
              boosterBoxId: drawnItem.type === 'boosterBox' ? drawnItem.id : null,
              cardValue: drawnItem.coinValue,
            },
          });

          await tx.battlePull.create({
            data: {
              battleId: battle.id,
              participantId: participant.id,
              pullId: pull.id,
              roundNumber: round,
              coinValue: drawnItem.coinValue,
              itemType: drawnItem.type === 'card' ? 'CARD' : 'BOOSTER_BOX',
              itemName: drawnItem.snapshot.name,
              itemImage: drawnItem.snapshot.image,
              itemSetName: drawnItem.snapshot.setName,
              itemRarity: drawnItem.snapshot.rarity,
              cardId: drawnItem.type === 'card' ? drawnItem.id : null,
              boosterBoxId: drawnItem.type === 'boosterBox' ? drawnItem.id : null,
            },
          });

          await tx.battleParticipant.update({
            where: { id: participant.id },
            data: {
              totalValue: { increment: drawnItem.coinValue },
              roundsPulled: { increment: 1 },
            },
          });

          prizeIncrement += drawnItem.coinValue;
        }
      }

      const finalParticipants = await tx.battleParticipant.findMany({
        where: { battleId: battle.id },
        select: {
          id: true,
          userId: true,
          totalValue: true,
          teamNumber: true,
        },
      });

      const battlePulls = await tx.battlePull.findMany({
        where: { battleId: battle.id },
        orderBy: { pulledAt: 'asc' },
        select: {
          participantId: true,
          coinValue: true,
          pullId: true,
        },
      });

      const { winningParticipants, winningTeamNumber, primaryParticipant } = determineWinningParticipants(
        {
          format: battle.format,
          teamSize: battle.teamSize,
          teamCount: battle.teamCount,
          battleMode: battle.battleMode,
        },
        finalParticipants.map((participant) => ({
          id: participant.id,
          userId: participant.userId,
          totalValue: participant.totalValue,
          teamNumber: participant.teamNumber ?? null,
        })),
        battlePulls
      );

      if (!winningParticipants.length || !primaryParticipant) {
        throw new Error('Unable to determine winner');
      }

      if (battle.format === 'TEAM' && winningParticipants.length > 1) {
        let winnerIndex = 0;
        for (const battlePull of battlePulls) {
          if (!battlePull.pullId) continue;
          const recipient = winningParticipants[winnerIndex % winningParticipants.length];
          await tx.pull.update({
            where: { id: battlePull.pullId },
            data: { userId: recipient.userId },
          });
          winnerIndex += 1;
        }
      } else {
        for (const battlePull of battlePulls) {
          if (!battlePull.pullId) continue;
          await tx.pull.update({
            where: { id: battlePull.pullId },
            data: { userId: primaryParticipant.userId },
          });
        }
      }

      const finalTotalPrize = battle.totalPrize + prizeIncrement;
      const winnerCount = winningParticipants.length || 1;
      const baseShare = Math.floor(finalTotalPrize / winnerCount);
      let remainder = finalTotalPrize - baseShare * winnerCount;

      for (const winner of winningParticipants) {
        const bonus = remainder > 0 ? 1 : 0;
        const increment = baseShare + bonus;
        if (bonus > 0) {
          remainder -= 1;
        }
        if (increment > 0) {
          await tx.user.update({
            where: { id: winner.userId },
            data: { coins: { increment } },
          });
        }
      }

      const updatedBattle = await tx.battle.update({
        where: { id: battle.id },
        data: {
          status: 'FINISHED',
          winnerId: primaryParticipant.userId,
          totalPrize: finalTotalPrize,
          finishedAt: new Date(),
          winningTeamNumber,
        },
        include: {
          winner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

        return {
          addedBots: botsToAdd.length,
          winner: updatedBattle.winner,
          totalPrize: finalTotalPrize,
          winningTeamNumber,
        };
      },
      TRANSACTION_OPTIONS
    );

    return NextResponse.json({
      success: true,
      summary: simulationResult,
    });
  } catch (error) {
    console.error('[ADMIN BATTLE SIM] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to run bot battle' },
      { status: 500 }
    );
  }
}

