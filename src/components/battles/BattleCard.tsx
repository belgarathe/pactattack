'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Trophy, Coins, Eye, Bot } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/components/ui/use-toast';
import type { Role, CardGame } from '@/types';

type BattleCardProps = {
  battle: {
    id: string;
    creator: {
      id: string;
      name: string | null;
      email: string;
    };
    box: {
      id: string;
      name: string;
      imageUrl: string;
      price: number;
      games: CardGame[];
      mostValuableCard?: {
        id: string;
        name: string;
        imageUrlGatherer?: string | null;
        imageUrlScryfall?: string | null;
        rarity?: string | null;
        coinValue?: number | null;
        priceAvg?: number | null;
      } | null;
    };
    entryFee: number;
    maxParticipants: number;
    rounds: number;
    battleMode: 'NORMAL' | 'UPSIDE_DOWN' | 'JACKPOT';
    shareMode: boolean;
  format: 'SOLO' | 'TEAM';
  teamSize: number;
  teamCount: number;
  winningTeamNumber?: number | null;
    status: 'WAITING' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';
    participantCount: number;
    pullCount: number;
    participants: Array<{
      id: string;
      user: {
        id: string;
        name: string | null;
        email: string;
      };
      totalValue: number;
      roundsPulled: number;
    teamNumber?: number | null;
    }>;
    winner: {
      id: string;
      name: string | null;
      email: string;
    } | null;
    totalPrize: number;
    createdAt: string;
    startedAt: string | null;
    finishedAt: string | null;
  };
  currentUserId?: string;
  currentUserRole?: Role;
  onJoin: () => void;
  onView: () => void;
  onBotBattleComplete?: () => void;
  onDeleted?: () => void;
};

export function BattleCard({
  battle,
  currentUserId,
  currentUserRole,
  onJoin,
  onView,
  onBotBattleComplete,
  onDeleted,
}: BattleCardProps) {
  const { addToast } = useToast();
  const [botBattleLoading, setBotBattleLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const isParticipant = battle.participants.some((p) => p.userId === currentUserId);
  const participant = battle.participants.find((p) => p.userId === currentUserId);
  const isCreator = battle.creator.id === currentUserId;
  const canJoin = battle.status === 'WAITING' && !isParticipant && battle.participantCount < battle.maxParticipants;
  const isAdmin = currentUserRole === 'ADMIN';
  const availableSlots = Math.max(battle.maxParticipants - battle.participantCount, 0);
  const isTeamBattle = battle.format === 'TEAM' || battle.teamSize > 1;
  const cardPreview = battle.box.mostValuableCard;
  const previewImage =
    cardPreview?.imageUrlGatherer ||
    cardPreview?.imageUrlScryfall ||
    battle.box.imageUrl;
  const previewAlt = cardPreview?.name || battle.box.name;
  const imageHasCard = Boolean(cardPreview?.imageUrlGatherer || cardPreview?.imageUrlScryfall);

  const statusColors = {
    WAITING: 'bg-yellow-500/20 text-yellow-500',
    IN_PROGRESS: 'bg-blue-500/20 text-blue-500',
    FINISHED: 'bg-green-500/20 text-green-500',
    CANCELLED: 'bg-gray-500/20 text-gray-500',
  };

const GAME_LABELS: Record<CardGame, string> = {
  MAGIC_THE_GATHERING: 'Magic',
  ONE_PIECE: 'One Piece',
  POKEMON: 'Pokémon',
  LORCANA: 'Lorcana',
};

  const handleRunBotBattle = async () => {
    if (!isAdmin || battle.status !== 'WAITING' || availableSlots <= 0) {
      return;
    }

    const confirmed = window.confirm(
      'This will fill all remaining slots with bot players and auto-run every round. Continue?'
    );
    if (!confirmed) {
      return;
    }

    try {
      setBotBattleLoading(true);
      const res = await fetch(`/api/admin/battles/${battle.id}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botCount: availableSlots }),
      });

      const data = await res.json();

      if (!res.ok) {
        addToast({
          title: 'Error',
          description: data.error || 'Failed to run bot battle',
          variant: 'destructive',
        });
        return;
      }

      addToast({
        title: 'Battle Simulated',
        description: data.summary?.winner
          ? `Winner: ${data.summary.winner.name || data.summary.winner.email}`
          : 'Simulation complete',
      });
      onBotBattleComplete?.();
    } catch (error) {
      console.error('Failed to simulate battle:', error);
      addToast({
        title: 'Error',
        description: 'Failed to simulate battle',
        variant: 'destructive',
      });
    } finally {
      setBotBattleLoading(false);
    }
  };

  const handleDeleteBattle = async () => {
    if (!isAdmin || battle.status !== 'FINISHED') {
      return;
    }

    const confirmed = window.confirm(
      'Delete this finished battle? This action cannot be undone.'
    );
    if (!confirmed) {
      return;
    }

    try {
      setDeleteLoading(true);
      const res = await fetch(`/api/admin/battles/${battle.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        addToast({
          title: 'Error',
          description: data.error || 'Failed to delete battle',
          variant: 'destructive',
        });
        return;
      }

      addToast({
        title: 'Battle deleted',
        description: 'The finished battle has been removed.',
      });
      onDeleted?.();
    } catch (error) {
      console.error('Failed to delete battle:', error);
      addToast({
        title: 'Error',
        description: 'Failed to delete battle',
        variant: 'destructive',
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const packCost = battle.box.price * battle.rounds;
  const totalCost = battle.entryFee + packCost;

  return (
    <Card className="overflow-hidden">
      <div className="relative h-56 w-full bg-gradient-to-b from-gray-950 to-black">
        <Image
          src={previewImage}
          alt={previewAlt}
          fill
          className={`transition-all ${imageHasCard ? 'object-contain p-4 drop-shadow-[0_15px_25px_rgba(0,0,0,0.45)]' : 'object-cover'}`}
          priority={!imageHasCard}
          unoptimized={imageHasCard}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute right-2 top-2">
          <Badge className={statusColors[battle.status]}>
            {battle.status.replace('_', ' ')}
          </Badge>
        </div>
        <div className="absolute bottom-2 left-2 right-2 space-y-1">
          <h3 className="text-lg font-bold text-white line-clamp-1">{battle.box.name}</h3>
          {cardPreview && (
            <div className="rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-white backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-gray-300">
                    Most Valuable Card
                  </p>
                  <p className="text-sm font-semibold leading-tight line-clamp-1">
                    {cardPreview.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-gray-300">Value</p>
                  <p className="text-sm font-bold text-yellow-300">
                    {cardPreview.coinValue ?? '—'}c
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <CardHeader>
        <CardTitle className="line-clamp-1">{battle.box.name}</CardTitle>
        {battle.box.games?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {battle.box.games.map((game) => (
              <Badge
                key={game}
                variant="outline"
                className="text-[10px] uppercase tracking-wide"
              >
                {GAME_LABELS[game]}
              </Badge>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted">
            Created by {battle.creator.name || battle.creator.email}
          </p>
          {battle.shareMode && (
            <span className="text-xs rounded-full bg-primary/20 px-2 py-0.5">Share</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted">
          <span>{battle.rounds} Round{battle.rounds !== 1 ? 's' : ''}</span>
          <span>•</span>
          <span className="capitalize">{battle.battleMode.replace('_', '-')}</span>
        </div>
        {isTeamBattle && (
          <div className="flex items-center gap-1 text-xs text-purple-300">
            <Users className="h-3 w-3" />
            <span>
              {battle.teamCount} teams · {battle.teamSize} players each
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>{battle.participantCount}/{battle.maxParticipants}</span>
              </div>
              {battle.entryFee > 0 && (
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4" />
                  <span>Entry: {battle.entryFee}</span>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1 text-xs text-muted">
              <div className="flex items-center justify-between">
                <span>Pack cost:</span>
                <span>{battle.box.price} coins × {battle.rounds} round{battle.rounds !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center justify-between font-semibold text-white">
                <span>Total buy-in:</span>
                <span>{totalCost} coins</span>
              </div>
            </div>
          </div>

          {battle.status === 'FINISHED' && battle.winner && (
            <div className="flex items-center gap-2 rounded-lg bg-primary/10 p-2">
              <Trophy className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">
                Winner: {battle.winner.name || battle.winner.email}
              </span>
            </div>
          )}
          {battle.status === 'FINISHED' && isTeamBattle && battle.winningTeamNumber && (
            <div className="rounded-lg border border-purple-500/30 p-2 text-xs text-purple-200">
              Winning Team #{battle.winningTeamNumber}
            </div>
          )}

          {battle.status === 'IN_PROGRESS' && (
            <div className="space-y-1">
              <p className="text-sm font-semibold">Participants:</p>
              {battle.participants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span>{participant.user.name || participant.user.email}</span>
                  <span className="font-semibold">
                    {participant.roundsPulled > 0 
                      ? `${participant.totalValue} coins (${participant.roundsPulled}/${battle.rounds})`
                      : 'Waiting...'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {battle.totalPrize > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-warning/10 p-2">
              <Trophy className="h-4 w-4 text-warning" />
              <span className="text-sm font-semibold">
                Prize: {battle.totalPrize} coins
              </span>
            </div>
          )}

          {isAdmin && battle.status === 'WAITING' && availableSlots > 0 && (
            <Button
              variant="outline"
              className="w-full border-purple-500 text-purple-500 hover:bg-purple-500/10"
              onClick={handleRunBotBattle}
              disabled={botBattleLoading}
            >
              <Bot className="mr-2 h-4 w-4" />
              {botBattleLoading ? 'Running Bots...' : 'Run Bot Battle'}
            </Button>
          )}
          {isAdmin && battle.status === 'FINISHED' && (
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleDeleteBattle}
              disabled={deleteLoading}
            >
              {deleteLoading ? 'Deleting...' : 'Delete Battle'}
            </Button>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onView}
            >
              <Eye className="mr-2 h-4 w-4" />
              View
            </Button>
            {canJoin && (
              <Button
                className="flex-1"
                onClick={onJoin}
              >
                Join ({totalCost}c)
              </Button>
            )}
            {isParticipant && battle.status === 'IN_PROGRESS' && (
              <Button
                className="flex-1"
                onClick={onView}
              >
                {participant && participant.roundsPulled < battle.rounds 
                  ? `Pull Round ${participant.roundsPulled + 1}`
                  : 'View Battle'}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

