'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Coins,
  Crown,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { getAvatarColor, getInitials } from './avatar-utils';

type BattleRoundAnimationProps = {
  battle: any;
  currentUserId: string;
  autoPlayIntervalMs?: number;
};

type RoundRow = {
  participant: any;
  pull?: any;
  displayName: string;
  displayImage: string;
  displaySet: string;
  coinValue: number;
  typeLabel: string;
};

type RoundData = {
  roundNumber: number;
  rows: RoundRow[];
  winningValue: number;
  winningTeamNumber?: number | null;
};

const TEAM_COLOR_PALETTE = [
  {
    tileBorder: 'border-sky-400/60',
    tileGlow: 'shadow-[0_0_18px_rgba(56,189,248,0.25)]',
    badge: 'bg-sky-500/20 text-sky-100',
    heroBorder: 'border-sky-400/40',
    heroGlow: 'shadow-[0_15px_45px_rgba(56,189,248,0.22)]',
  },
  {
    tileBorder: 'border-rose-400/60',
    tileGlow: 'shadow-[0_0_18px_rgba(251,113,133,0.25)]',
    badge: 'bg-rose-500/20 text-rose-100',
    heroBorder: 'border-rose-400/40',
    heroGlow: 'shadow-[0_15px_45px_rgba(251,113,133,0.22)]',
  },
  {
    tileBorder: 'border-amber-400/60',
    tileGlow: 'shadow-[0_0_18px_rgba(251,191,36,0.25)]',
    badge: 'bg-amber-500/20 text-amber-900',
    heroBorder: 'border-amber-400/40',
    heroGlow: 'shadow-[0_15px_45px_rgba(251,191,36,0.22)]',
  },
  {
    tileBorder: 'border-emerald-400/60',
    tileGlow: 'shadow-[0_0_18px_rgba(16,185,129,0.25)]',
    badge: 'bg-emerald-500/20 text-emerald-100',
    heroBorder: 'border-emerald-400/40',
    heroGlow: 'shadow-[0_15px_45px_rgba(16,185,129,0.22)]',
  },
  {
    tileBorder: 'border-violet-400/60',
    tileGlow: 'shadow-[0_0_18px_rgba(139,92,246,0.25)]',
    badge: 'bg-violet-500/20 text-violet-100',
    heroBorder: 'border-violet-400/40',
    heroGlow: 'shadow-[0_15px_45px_rgba(139,92,246,0.22)]',
  },
] as const;

type TeamStyle = (typeof TEAM_COLOR_PALETTE)[number];

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function BattleRoundAnimation({
  battle,
  currentUserId,
  autoPlayIntervalMs = 4200,
}: BattleRoundAnimationProps) {
  const participants = battle?.participants ?? [];
  const pulls = battle?.pulls ?? [];
  const isTeamBattle = battle?.format === 'TEAM' || (battle?.teamSize ?? 1) > 1;
  const orderedParticipants = useMemo(() => {
    if (!isTeamBattle) {
      return participants;
    }
    const teamBuckets = new Map<number, any[]>();
    const unassigned: any[] = [];
    participants.forEach((participant: any) => {
      if (typeof participant.teamNumber === 'number') {
        const bucket = teamBuckets.get(participant.teamNumber) ?? [];
        bucket.push(participant);
        teamBuckets.set(participant.teamNumber, bucket);
      } else {
        unassigned.push(participant);
      }
    });
    const sortedTeams = Array.from(teamBuckets.keys()).sort((a, b) => a - b);
    return [
      ...sortedTeams.flatMap((teamNumber) => teamBuckets.get(teamNumber) ?? []),
      ...unassigned,
    ];
  }, [isTeamBattle, participants]);

  const rounds = useMemo<RoundData[]>(() => {
    if (!orderedParticipants.length) {
      return [];
    }

    const grouped = new Map<number, any[]>();
    for (const pull of pulls) {
      const roundNumber = pull.roundNumber ?? 1;
      const existing = grouped.get(roundNumber) ?? [];
      existing.push(pull);
      grouped.set(roundNumber, existing);
    }

    const sortedRounds = Array.from(grouped.entries()).sort(
      (a, b) => a[0] - b[0]
    );

    return sortedRounds.map<RoundData>(([roundNumber, roundPulls]) => {
      const rows: RoundRow[] = orderedParticipants.map((participant: any) => {
        const pull = roundPulls.find(
          (item: any) => item.participantId === participant.id
        );
        const card = pull?.pull?.card;
        const boosterBox = pull?.pull?.boosterBox;
        const displayName =
          card?.name || boosterBox?.name || pull?.itemName || 'Awaiting pull';
        const displaySet =
          card?.setName ||
          pull?.itemSetName ||
          boosterBox?.setName ||
          battle?.box?.name ||
          '';
        const displayImage =
          card?.imageUrlGatherer ||
          card?.imageUrlScryfall ||
          boosterBox?.imageUrl ||
          pull?.itemImage ||
          '';
        const rawType =
          pull?.itemType ||
          (boosterBox ? 'BOOSTER_BOX' : card ? 'CARD' : undefined);
        const typeLabel = rawType ? toTitleCase(rawType) : 'Card';

        return {
          participant,
          pull,
          displayName,
          displayImage,
          displaySet,
          coinValue: pull?.coinValue ?? 0,
          typeLabel,
        };
      });

      const winningValue = rows.length
        ? Math.max(...rows.map((row) => row.coinValue))
        : 0;
      let winningTeamNumber: number | null = null;
      if (isTeamBattle && rows.length) {
        const teamTotals = new Map<number, number>();
        rows.forEach((row) => {
          const teamNumber = row.participant.teamNumber ?? 0;
          const currentTotal = teamTotals.get(teamNumber) ?? 0;
          teamTotals.set(teamNumber, currentTotal + (row.coinValue || 0));
        });
        let highestTotal = -Infinity;
        teamTotals.forEach((total, teamNumber) => {
          if (total > highestTotal) {
            highestTotal = total;
            winningTeamNumber = total > 0 ? teamNumber : null;
          }
        });
      }

      return {
        roundNumber,
        rows,
        winningValue,
        winningTeamNumber,
      };
    });
  }, [battle?.box?.name, orderedParticipants, pulls, isTeamBattle]);

  const [currentRoundIndex, setCurrentRoundIndex] = useState(() =>
    rounds.length ? rounds.length - 1 : 0
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [focusedRowIndex, setFocusedRowIndex] = useState(0);
  const [showWinnerFlash, setShowWinnerFlash] = useState(false);
  const teamColorMap = useMemo(() => {
    if (!isTeamBattle) {
      return new Map<number, TeamStyle>();
    }
    const uniqueTeams = Array.from(
      new Set(
        orderedParticipants
          .map((participant: any) => participant.teamNumber)
          .filter((teamNumber): teamNumber is number => typeof teamNumber === 'number')
      )
    ).sort((a, b) => a - b);
    const map = new Map<number, TeamStyle>();
    uniqueTeams.forEach((teamNumber, idx) => {
      map.set(teamNumber, TEAM_COLOR_PALETTE[idx % TEAM_COLOR_PALETTE.length]);
    });
    return map;
  }, [isTeamBattle, orderedParticipants]);

  const getTeamStyle = (teamNumber?: number | null) => {
    if (!isTeamBattle || typeof teamNumber !== 'number') {
      return null;
    }
    return teamColorMap.get(teamNumber) ?? null;
  };

  // Snap to the most recent round whenever new pulls arrive.
  useEffect(() => {
    if (!rounds.length) {
      setCurrentRoundIndex(0);
      setIsPlaying(false);
      return;
    }
    setCurrentRoundIndex((prev) => {
      if (prev >= rounds.length) {
        return rounds.length - 1;
      }
      return prev;
    });
  }, [rounds.length]);

  useEffect(() => {
    setFocusedRowIndex(0);
  }, [currentRoundIndex]);

  // Auto advance rounds when playing.
  useEffect(() => {
    if (!isPlaying || rounds.length <= 1) {
      return;
    }

    const timer = setTimeout(() => {
      setCurrentRoundIndex((prev) => {
        const next = prev + 1;
        if (next >= rounds.length) {
          setIsPlaying(false);
          return prev;
        }
        return next;
      });
    }, autoPlayIntervalMs);

    return () => clearTimeout(timer);
  }, [autoPlayIntervalMs, isPlaying, rounds.length, currentRoundIndex]);

  const currentRound = rounds[currentRoundIndex];
  const totalRounds = battle?.rounds ?? rounds.length ?? 0;
  const upcomingRoundNumber = Math.min(
    currentRound?.roundNumber ?? rounds.length + 1,
    totalRounds || rounds.length + 1
  );

  const handlePrev = () => {
    if (!rounds.length) return;
    setIsPlaying(false);
    setCurrentRoundIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleNext = () => {
    if (!rounds.length) return;
    setIsPlaying(false);
    setCurrentRoundIndex((prev) => Math.min(prev + 1, rounds.length - 1));
  };

  const handleReplay = () => {
    if (!rounds.length) return;
    setCurrentRoundIndex(0);
    setIsPlaying(true);
  };

  const handlePlayPause = () => {
    if (!rounds.length) return;
    setIsPlaying((prev) => !prev);
  };

  const timelineSlots = useMemo(
    () =>
      Array.from({ length: totalRounds || rounds.length || 1 }, (_, idx) => idx + 1),
    [rounds.length, totalRounds]
  );

  const roundNumberToIndex = useMemo(() => {
    const map = new Map<number, number>();
    rounds.forEach((round, index) => map.set(round.roundNumber, index));
    return map;
  }, [rounds]);

  useEffect(() => {
    const rowCount = currentRound?.rows?.length ?? 0;
    if (!rowCount) {
      setFocusedRowIndex(0);
      return;
    }

    const intervalDuration = Math.min(
      Math.max(Math.round(autoPlayIntervalMs * 0.6), 1200),
      2600
    );

    const timer = setInterval(() => {
      setFocusedRowIndex((prev) => {
        if (!rowCount) return 0;
        return (prev + 1) % rowCount;
      });
    }, intervalDuration);

    return () => clearInterval(timer);
  }, [autoPlayIntervalMs, currentRound?.rows?.length, currentRound?.roundNumber]);

  const roundWinnerRow = useMemo(() => {
    if (!currentRound?.rows?.length) {
      return null;
    }
    if (isTeamBattle && currentRound.winningTeamNumber != null) {
      const winningRows = currentRound.rows.filter(
        (row) => row.participant.teamNumber === currentRound.winningTeamNumber
      );
      if (winningRows.length) {
        const sortedWinning = winningRows
          .filter((row) => row.coinValue > 0)
          .sort((a, b) => b.coinValue - a.coinValue);
        if (sortedWinning.length) {
          return sortedWinning[0];
        }
        return winningRows[0];
      }
    }
    if (!currentRound.winningValue) {
      return null;
    }
    return (
      currentRound.rows.find(
        (row) => row.coinValue === currentRound.winningValue && row.coinValue > 0
      ) ?? null
    );
  }, [currentRound?.rows, currentRound?.winningTeamNumber, currentRound?.winningValue, isTeamBattle]);

  const featuredRow = useMemo(() => {
    if (roundWinnerRow) {
      return roundWinnerRow;
    }
    if (!currentRound?.rows?.length) {
      return null;
    }
    const pulledRows = currentRound.rows
      .filter((row) => !!row.pull)
      .sort((a, b) => b.coinValue - a.coinValue);
    if (pulledRows.length) {
      return pulledRows[0];
    }
    return currentRound.rows[0];
  }, [currentRound?.rows, roundWinnerRow]);

  useEffect(() => {
    if (!roundWinnerRow) {
      setShowWinnerFlash(false);
      return;
    }
    setShowWinnerFlash(true);
    const timer = setTimeout(() => setShowWinnerFlash(false), 1800);
    return () => clearTimeout(timer);
  }, [
    roundWinnerRow?.participant?.id,
    roundWinnerRow?.pull?.id,
    currentRound?.roundNumber,
  ]);

  const progressPercent = useMemo(() => {
    if (totalRounds) {
      const safeRound =
        currentRound?.roundNumber ?? Math.min(rounds.length || 1, totalRounds);
      return Math.min(100, Math.max(0, (safeRound / totalRounds) * 100));
    }
    if (rounds.length) {
      return Math.min(100, Math.max(0, ((currentRoundIndex + 1) / rounds.length) * 100));
    }
    return 0;
  }, [currentRound?.roundNumber, currentRoundIndex, rounds.length, totalRounds]);

  const heroLabel = roundWinnerRow
    ? isTeamBattle
      ? 'Winning team pull'
      : 'Round winner'
    : 'Pull spotlight';
  const heroSubline = roundWinnerRow
    ? isTeamBattle
      ? `Team #${currentRound?.winningTeamNumber ?? '?'} is leading this round.`
      : 'Highest coin value locked in for this round.'
    : 'Latest pull highlight while we wait for the winner.';
  const winnerTeamStyle = roundWinnerRow
    ? getTeamStyle(roundWinnerRow.participant.teamNumber)
    : null;
  const featuredTeamStyle = featuredRow
    ? getTeamStyle(featuredRow.participant.teamNumber)
    : null;
  const placeholderRows = useMemo<RoundRow[]>(() => {
    return orderedParticipants.map((participant: any) => ({
      participant,
      pull: undefined,
      displayName: 'Awaiting pull',
      displayImage: '',
      displaySet: '',
      coinValue: 0,
      typeLabel: 'Card',
    }));
  }, [orderedParticipants]);
  const displayedRows = currentRound?.rows ?? placeholderRows;
  const rowIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    displayedRows.forEach((row, index) => {
      map.set(row.participant.id, index);
    });
    return map;
  }, [displayedRows]);
  const teamGroups = useMemo(() => {
    if (!isTeamBattle) {
      return [];
    }
    const groupMap = new Map<number, RoundRow[]>();
    displayedRows.forEach((row) => {
      const teamNumber =
        typeof row.participant.teamNumber === 'number' ? row.participant.teamNumber : -1;
      const bucket = groupMap.get(teamNumber) ?? [];
      bucket.push(row);
      groupMap.set(teamNumber, bucket);
    });
    const sortedTeams = Array.from(groupMap.keys()).sort((a, b) => a - b);
    return sortedTeams.map((teamNumber) => ({
      teamNumber,
      rows: groupMap.get(teamNumber) ?? [],
    }));
  }, [displayedRows, isTeamBattle]);
  const teamGridColsClass = useMemo(() => {
    const count = teamGroups.length || 1;
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-1 md:grid-cols-2';
    if (count === 3) return 'grid-cols-1 md:grid-cols-3';
    return 'grid-cols-1 md:grid-cols-4';
  }, [teamGroups.length]);
  const renderParticipantCard = (row: RoundRow) => {
    const participant = row.participant;
    if (!participant) {
      return null;
    }
    const idx = rowIndexMap.get(participant.id) ?? 0;
    const participantName =
      participant.user?.name || participant.user?.email || 'Player';
    const rowHasPull = !!row.pull;
    const winningValue = currentRound?.winningValue ?? 0;
    const relativeProgress =
      winningValue > 0 && row.coinValue > 0
        ? Math.min(1, row.coinValue / winningValue)
        : row.coinValue > 0
          ? 0.25
          : 0;
    const showProgressBar = relativeProgress > 0;
    const belongsToWinningTeam =
      isTeamBattle &&
      currentRound?.winningTeamNumber != null &&
      participant.teamNumber === currentRound.winningTeamNumber;
    const isSoloWinner =
      !isTeamBattle &&
      !!currentRound &&
      currentRound.winningValue > 0 &&
      row.coinValue === currentRound.winningValue &&
      row.coinValue > 0;
    const isWinner = belongsToWinningTeam || isSoloWinner;
    const isFocused = idx === focusedRowIndex && rowHasPull;
    const participantTeamStyle = getTeamStyle(participant.teamNumber);
    const tileBorderClass = participantTeamStyle?.tileBorder ?? 'border-white/10';
    const tileGlowClass = participantTeamStyle?.tileGlow ?? '';
    const tileRingClass = isWinner
      ? 'ring-2 ring-yellow-300/80'
      : isFocused && rowHasPull
        ? 'ring-2 ring-purple-400/70'
        : '';
    const tileShadowClass = isWinner
      ? 'shadow-[0_0_30px_rgba(250,204,21,0.25)]'
      : isFocused && rowHasPull
        ? 'shadow-[0_0_25px_rgba(168,85,247,0.45)]'
        : tileGlowClass;

    return (
      <motion.div
        key={`${participant.id}-${currentRound?.roundNumber ?? 'idle'}`}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: idx * 0.04 }}
        className={cn(
          'relative rounded-2xl border bg-white/5 p-4 backdrop-blur transition-all duration-300',
          tileBorderClass,
          tileRingClass,
          tileShadowClass,
          isWinner && 'pt-6',
          !rowHasPull && 'border-dashed'
        )}
      >
        <AnimatePresence>
          {isFocused && rowHasPull && (
            <motion.div
              key="row-focus"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/15 via-transparent to-yellow-400/10"
            />
          )}
        </AnimatePresence>
        {isWinner && (
          <div className="absolute right-4 top-2 inline-flex items-center gap-1 rounded-full bg-yellow-500/20 px-3 py-1 text-[11px] font-semibold text-yellow-200">
            <Trophy className="h-3.5 w-3.5" />
            Round winner
          </div>
        )}
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-full text-base font-bold text-white',
              getAvatarColor(participant.user?.email || participant.id)
            )}
          >
            {getInitials(participant.user?.name, participant.user?.email || '??')}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">
              {participantName}
              {participant.userId === currentUserId && (
                <span className="ml-1 text-xs text-green-300">(You)</span>
              )}
            </p>
            <p className="text-xs text-gray-400">
              {rowHasPull ? `Coin value this round` : 'Waiting for pull'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {rowHasPull && (
              <span className="rounded-full bg-black/40 px-2 py-0.5 text-[11px] uppercase tracking-wide text-gray-300">
                {row.typeLabel}
              </span>
            )}
            {isTeamBattle && typeof participant.teamNumber === 'number' && (
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
                  participantTeamStyle?.badge ?? 'bg-white/10 text-white'
                )}
              >
                Team #{participant.teamNumber}
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 flex gap-4">
          <motion.div
            key={`row-card-${row.pull?.id ?? participant.id}-${
              currentRound?.roundNumber ?? 'idle'
            }`}
            initial={{ rotateY: 65, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            transition={{ duration: 0.45, delay: 0.12 + idx * 0.05 }}
            className="relative h-28 w-20 shrink-0 overflow-hidden rounded-lg border border-white/15 bg-black/40"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {row.displayImage ? (
              <Image
                src={row.displayImage}
                alt={row.displayName}
                fill
                className="object-contain"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">
                Awaiting image
              </div>
            )}
          </motion.div>
          <div className="flex-1 space-y-2 text-sm">
            <div>
              <p className="font-semibold text-white">{row.displayName}</p>
              {row.displaySet && <p className="text-xs text-gray-400">{row.displaySet}</p>}
            </div>
            <div className="flex items-center gap-2 text-yellow-300">
              <Coins className="h-4 w-4" />
              <motion.span
                key={`${row.coinValue}-${currentRound?.roundNumber ?? 'idle'}`}
                initial={{ y: 6, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className={cn(
                  'text-base font-bold',
                  isWinner ? 'text-yellow-100' : 'text-yellow-300'
                )}
              >
                {row.coinValue ? row.coinValue : '—'} coins
              </motion.span>
            </div>
            {showProgressBar && (
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${relativeProgress * 100}%` }}
                  transition={{ duration: 0.45, delay: 0.15 + idx * 0.02 }}
                  className={cn(
                    'h-full bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-500',
                    isWinner && 'shadow-[0_0_20px_rgba(250,204,21,0.4)]'
                  )}
                />
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  const renderTeamColumn = (
    teamNumber: number,
    rows: RoundRow[],
    options?: { side?: 'left' | 'right' }
  ) => {
    const teamStyle = getTeamStyle(teamNumber === -1 ? undefined : teamNumber);
    const teamLabel = teamNumber === -1 ? 'No team' : `Team #${teamNumber}`;
    const teamTotal = rows.reduce((sum, rowItem) => sum + (rowItem.coinValue ?? 0), 0);
    const sidePadding =
      options?.side === 'right' ? 'md:pl-10' : options?.side === 'left' ? 'md:pr-10' : '';

    return (
      <div
        key={`team-column-${teamNumber}`}
        className={cn('space-y-4 min-w-0 w-full', sidePadding, options?.side ? 'md:flex-1' : '')}
      >
        <div
          className={cn(
            'flex items-center justify-between rounded-2xl border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.4em]',
            teamStyle?.tileBorder ?? 'border-white/20',
            teamStyle?.heroGlow ?? 'shadow-[0_0_20px_rgba(0,0,0,0.2)]'
          )}
        >
          <span>{teamLabel}</span>
          <span className="flex items-center gap-1 text-yellow-200">
            <Coins className="h-3 w-3" />
            {teamTotal}
          </span>
        </div>
        <div className="space-y-4 min-w-0">
          {rows.map((row) => (
            <div key={`${teamNumber}-${row.participant.id}`}>{renderParticipantCard(row)}</div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-gray-900/80 via-gray-950 to-[#120b24] p-6 text-white">
      <div className="absolute inset-0 opacity-40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(147,51,234,0.2),_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(234,179,8,0.15),_transparent_55%)]" />
      </div>

      <AnimatePresence>
        {showWinnerFlash && roundWinnerRow && (
          <motion.div
            key={`round-winner-banner-${currentRound?.roundNumber}-${roundWinnerRow.participant.id}`}
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className={cn(
              'pointer-events-none absolute left-6 right-6 top-3 z-20 rounded-3xl border bg-gradient-to-r from-yellow-500/25 via-transparent to-purple-500/25 p-4 text-center backdrop-blur',
              winnerTeamStyle?.heroBorder ?? 'border-yellow-400/40',
              winnerTeamStyle?.heroGlow ?? 'shadow-[0_15px_40px_rgba(0,0,0,0.45)]'
            )}
          >
            <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-[0.5em] text-yellow-200">
              <Crown className="h-4 w-4" />
              Round {currentRound?.roundNumber ?? '?'} winner
              <Crown className="h-4 w-4" />
            </div>
            <p className="mt-2 text-base font-bold text-white">
              {roundWinnerRow.displayName}
            </p>
            <p className="text-xs text-gray-200">
              {roundWinnerRow.coinValue} coins ·{' '}
              {roundWinnerRow.participant.user?.name ||
                roundWinnerRow.participant.user?.email ||
                'Player'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-purple-200">
              <Sparkles className="h-4 w-4 text-yellow-400" />
              Round spotlight
            </div>
            <h2 className="text-2xl font-bold">
              Round {currentRound?.roundNumber ?? upcomingRoundNumber} /{' '}
              {totalRounds || battle?.rounds || rounds.length || 1}
            </h2>
            <p className="text-sm text-gray-300">
              Watch each round animate in order while the winning card gets a dedicated highlight.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrev}
              disabled={!rounds.length || currentRoundIndex === 0}
              className="bg-white/10 text-white hover:bg-white/20"
            >
              <SkipBack className="mr-1 h-4 w-4" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePlayPause}
              disabled={!rounds.length}
              className="bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30"
            >
              {isPlaying ? (
                <>
                  <Pause className="mr-1 h-4 w-4" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="mr-1 h-4 w-4" />
                  Play
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              disabled={!rounds.length || currentRoundIndex === rounds.length - 1}
              className="bg-white/10 text-white hover:bg-white/20"
            >
              <SkipForward className="mr-1 h-4 w-4" />
              Next
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReplay}
              disabled={!rounds.length}
              className="bg-purple-500/20 text-purple-200 hover:bg-purple-500/30"
            >
              <RotateCcw className="mr-1 h-4 w-4" />
              Replay all
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-black/10">
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.35em] text-gray-300">
            <span>Round tracker</span>
            <span>
              {currentRound?.roundNumber ?? upcomingRoundNumber} /{' '}
              {totalRounds || battle?.rounds || rounds.length || 1}
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/30">
            <motion.div
              key={`progress-${currentRound?.roundNumber ?? 'no-round'}-${rounds.length}`}
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-yellow-400 via-purple-500 to-blue-500 shadow-[0_0_25px_rgba(147,51,234,0.4)]"
            />
          </div>
        </div>

        {!rounds.length && (
          <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-center text-sm text-gray-300">
            No pulls yet — the animation will start as soon as the first round completes.
          </div>
        )}

        {featuredRow && rounds.length > 0 && (
          <AnimatePresence mode="wait">
            <motion.div
              key={`highlight-${currentRound?.roundNumber ?? 'idle'}`}
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className={cn(
                'relative overflow-hidden rounded-3xl border bg-gradient-to-br from-yellow-500/10 via-purple-500/10 to-transparent p-6',
                featuredTeamStyle?.heroBorder ?? 'border-yellow-400/30',
                featuredTeamStyle?.heroGlow ?? 'shadow-[0_10px_45px_rgba(15,15,15,0.45)]'
              )}
            >
              <div className="pointer-events-none absolute inset-0 opacity-80">
                <div className="absolute -top-10 left-4 h-32 w-32 rounded-full bg-yellow-400/30 blur-3xl" />
                <div className="absolute bottom-0 right-0 h-40 w-40 rounded-full bg-purple-500/25 blur-[90px]" />
              </div>
              <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.4em] text-yellow-200">
                    {roundWinnerRow ? (
                      <Trophy className="h-4 w-4" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {heroLabel}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">{featuredRow.displayName}</h3>
                    {featuredRow.displaySet && (
                      <p className="text-sm text-gray-200">{featuredRow.displaySet}</p>
                    )}
                  </div>
                  {isTeamBattle && typeof featuredRow.participant.teamNumber === 'number' && (
                    <span
                      className={cn(
                        'inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em]',
                        featuredTeamStyle?.badge ?? 'bg-white/10 text-white'
                      )}
                    >
                      Team #{featuredRow.participant.teamNumber}
                    </span>
                  )}
                  <p className="text-xs uppercase tracking-[0.3em] text-gray-300">{heroSubline}</p>
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-black/25 px-3 py-2">
                      <div
                        className={cn(
                          'flex h-12 w-12 items-center justify-center rounded-full text-base font-bold text-white',
                          getAvatarColor(
                            featuredRow.participant.user?.email || featuredRow.participant.id
                          )
                        )}
                      >
                        {getInitials(
                          featuredRow.participant.user?.name,
                          featuredRow.participant.user?.email || '??'
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-white">
                          {featuredRow.participant.user?.name ||
                            featuredRow.participant.user?.email ||
                            'Player'}
                          {featuredRow.participant.userId === currentUserId && (
                            <span className="ml-1 text-xs text-green-200">(You)</span>
                          )}
                        </p>
                        <p className="text-[11px] uppercase tracking-widest text-gray-300">
                          {featuredRow.typeLabel}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-2xl bg-yellow-500/25 px-4 py-2 text-yellow-100 shadow-inner shadow-yellow-500/30">
                      <Coins className="h-4 w-4" />
                      <span className="text-xl font-bold">
                        {featuredRow.coinValue || '—'} coins
                      </span>
                    </div>
                  </div>
                </div>
                <motion.div
                  key={`featured-image-${featuredRow.pull?.id ?? featuredRow.participant.id}`}
                  initial={{ rotateY: 45, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="relative h-44 w-full max-w-[240px] overflow-hidden rounded-2xl border border-white/20 bg-black/50"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {featuredRow.displayImage ? (
                    <Image
                      src={featuredRow.displayImage}
                      alt={featuredRow.displayName}
                      fill
                      className="object-contain p-4"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                      Awaiting image
                    </div>
                  )}
                </motion.div>
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {currentRound && (
          <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.5em] text-gray-400">
            <span className="h-px flex-1 bg-white/10" />
            Round {currentRound.roundNumber}
            <span className="h-px flex-1 bg-white/10" />
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={currentRound?.roundNumber ?? 'no-rounds'}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35 }}
          >
            {isTeamBattle ? (
              <div className="relative">
                {teamGroups.length >= 2 && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-white/40 bg-gradient-to-br from-yellow-500/70 to-purple-600/60 text-xl font-black tracking-[0.4em] text-white shadow-[0_25px_60px_rgba(0,0,0,0.55)] backdrop-blur">
                      VS
                    </div>
                  </div>
                )}
                {teamGroups.length === 2 ? (
                  <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between md:gap-16">
                    {renderTeamColumn(teamGroups[0].teamNumber, teamGroups[0].rows, {
                      side: 'left',
                    })}
                    <div className="hidden md:flex md:w-24 md:items-center md:justify-center" />
                    {renderTeamColumn(teamGroups[1].teamNumber, teamGroups[1].rows, {
                      side: 'right',
                    })}
                  </div>
                ) : (
                  <div className={cn('grid gap-6', teamGridColsClass)}>
                    {teamGroups.map(({ teamNumber, rows }) => renderTeamColumn(teamNumber, rows))}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {displayedRows.map((row) => renderParticipantCard(row))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {timelineSlots.map((roundNumber) => {
            const roundIndex = roundNumberToIndex.get(roundNumber);
            const isCompleted = roundIndex !== undefined;
            const isActive =
              currentRound?.roundNumber === roundNumber ||
              (!currentRound && roundNumber === upcomingRoundNumber);

            return (
              <button
                key={roundNumber}
                type="button"
                onClick={() => {
                  if (roundIndex === undefined) return;
                  setIsPlaying(false);
                  setCurrentRoundIndex(roundIndex);
                }}
                disabled={roundIndex === undefined}
                className={cn(
                  'h-8 w-8 rounded-full text-xs font-semibold',
                  isActive ? 'bg-yellow-400 text-black' : 'bg-white/10 text-white',
                  roundIndex === undefined && 'cursor-not-allowed opacity-40'
                )}
                aria-label={`Round ${roundNumber}`}
              >
                {roundNumber}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}


