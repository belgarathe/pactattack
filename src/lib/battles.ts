import type { BattleFormat, BattleMode } from '@prisma/client';

type MinimalBattle = {
  format: BattleFormat;
  teamSize: number;
  teamCount: number;
  battleMode: BattleMode;
};

type ParticipantSummary = {
  id: string;
  userId: string;
  totalValue: number;
  teamNumber: number | null;
};

type PullSummary = {
  participantId: string;
  coinValue: number;
};

export function getNextTeamNumber(
  battle: MinimalBattle,
  participants: Array<Pick<ParticipantSummary, 'teamNumber'>>
): number {
  if (battle.format === 'TEAM') {
    const teamCounts = new Map<number, number>();
    for (const participant of participants) {
      const teamNumber = participant.teamNumber ?? 1;
      teamCounts.set(teamNumber, (teamCounts.get(teamNumber) || 0) + 1);
    }

    for (let teamNumber = 1; teamNumber <= battle.teamCount; teamNumber++) {
      const count = teamCounts.get(teamNumber) || 0;
      if (count < battle.teamSize) {
        return teamNumber;
      }
    }

    throw new Error('No available teams for new participant');
  }

  const usedTeamNumbers = new Set(
    participants
      .map((participant) => participant.teamNumber)
      .filter((teamNumber): teamNumber is number => typeof teamNumber === 'number')
  );

  let candidate = 1;
  if (usedTeamNumbers.size === 0 && participants.length > 0) {
    candidate = participants.length + 1;
  } else {
    while (usedTeamNumbers.has(candidate)) {
      candidate += 1;
    }
  }
  return candidate;
}

function pickTeamByTotals(
  totals: Map<number, number>,
  mode: BattleMode
): number {
  let winningTeamNumber = Array.from(totals.keys())[0] ?? 1;
  for (const [teamNumber, total] of totals.entries()) {
    const currentWinningTotal = totals.get(winningTeamNumber) ?? 0;
    if (mode === 'UPSIDE_DOWN') {
      if (total < currentWinningTotal) {
        winningTeamNumber = teamNumber;
      }
    } else {
      if (total > currentWinningTotal) {
        winningTeamNumber = teamNumber;
      }
    }
  }
  return winningTeamNumber;
}

export function determineWinningParticipants(
  battle: MinimalBattle,
  participants: ParticipantSummary[],
  pulls: PullSummary[]
): {
  winningParticipants: ParticipantSummary[];
  winningTeamNumber: number | null;
  primaryParticipant: ParticipantSummary;
} {
  if (!participants.length) {
    throw new Error('No participants found for battle');
  }

  if (battle.format === 'TEAM') {
    const teamMembers = new Map<number, ParticipantSummary[]>();
    const teamTotals = new Map<number, number>();
    const participantById = new Map(participants.map((p) => [p.id, p]));

    participants.forEach((participant, index) => {
      const teamNumber = participant.teamNumber ?? index + 1;
      const members = teamMembers.get(teamNumber) || [];
      members.push(participant);
      teamMembers.set(teamNumber, members);

      const total = teamTotals.get(teamNumber) || 0;
      teamTotals.set(teamNumber, total + (participant.totalValue || 0));
    });

    let winningTeamNumber: number | null = null;

    if (battle.battleMode === 'JACKPOT' && pulls.length > 0) {
      let highestPullTeam: number | null = null;
      let highestPullValue = -Infinity;

      for (const pull of pulls) {
        const participant = participantById.get(pull.participantId);
        if (!participant) continue;
        const teamNumber = participant.teamNumber ?? null;
        if (teamNumber === null) continue;
        if (pull.coinValue > highestPullValue) {
          highestPullValue = pull.coinValue;
          highestPullTeam = teamNumber;
        }
      }

      winningTeamNumber = highestPullTeam ?? pickTeamByTotals(teamTotals, battle.battleMode);
    } else {
      winningTeamNumber = pickTeamByTotals(teamTotals, battle.battleMode);
    }

    const winningParticipants = winningTeamNumber
      ? teamMembers.get(winningTeamNumber) || []
      : [];

    if (!winningParticipants.length) {
      throw new Error('Unable to determine winning team participants');
    }

    return {
      winningParticipants,
      winningTeamNumber,
      primaryParticipant: winningParticipants[0],
    };
  }

  // Solo battles (free-for-all)
  let winningParticipant = participants[0];

  if (battle.battleMode === 'JACKPOT' && pulls.length > 0) {
    let highestPullParticipant: ParticipantSummary | null = null;
    let highestPullValue = -Infinity;

    for (const pull of pulls) {
      const participant = participants.find((p) => p.id === pull.participantId);
      if (!participant) continue;
      if (pull.coinValue > highestPullValue) {
        highestPullValue = pull.coinValue;
        highestPullParticipant = participant;
      }
    }

    if (highestPullParticipant) {
      winningParticipant = highestPullParticipant;
    }
  } else {
    winningParticipant = participants.reduce((prev, current) => {
      if (battle.battleMode === 'UPSIDE_DOWN') {
        return (current.totalValue || 0) < (prev.totalValue || 0) ? current : prev;
      }
      return (current.totalValue || 0) > (prev.totalValue || 0) ? current : prev;
    }, participants[0]);
  }

  return {
    winningParticipants: [winningParticipant],
    winningTeamNumber: winningParticipant.teamNumber ?? null,
    primaryParticipant: winningParticipant,
  };
}

