'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Trophy, Users, Coins, ArrowLeft, RotateCcw, Copy, Shield, Bot } from 'lucide-react';
import Image from 'next/image';
import { CardReveal } from '@/components/pack-opening/CardReveal';
import type { Role } from '@/types';
import { BattleRoundAnimation } from './BattleRoundAnimation';
import { getAvatarColor, getInitials } from './avatar-utils';

type BattleDetailClientProps = {
  battle: any;
  currentUserId: string;
  currentUserRole: Role;
};

type Star = {
  id: number;
  left: string;
  top: string;
  width: number;
  height: number;
  opacity: number;
};

const rarityColors: Record<string, string> = {
  common: 'bg-gray-500',
  uncommon: 'bg-green-500',
  rare: 'bg-blue-500',
  mythic: 'bg-yellow-500',
};

export function BattleDetailClient({
  battle,
  currentUserId,
  currentUserRole,
}: BattleDetailClientProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [pulling, setPulling] = useState(false);
  const [revealedCard, setRevealedCard] = useState<any>(null);
  const [botBattleLoading, setBotBattleLoading] = useState(false);
  const [stars, setStars] = useState<Star[]>([]);

  const isParticipant = battle.participants.some((p: any) => p.userId === currentUserId);
  const participant = battle.participants.find((p: any) => p.userId === currentUserId);
  const canPull = battle.status === 'IN_PROGRESS' && participant && participant.roundsPulled < battle.rounds;
  const canJoin = battle.status === 'WAITING' && !isParticipant && battle.participants.length < battle.maxParticipants;
  const isAdmin = currentUserRole === 'ADMIN';
  const availableSlots = Math.max(battle.maxParticipants - battle.participants.length, 0);
  const isTeamBattle = battle.format === 'TEAM' || battle.teamSize > 1;
  const packCost = battle.box.price * battle.rounds;
  const totalBuyIn = battle.entryFee + packCost;

  useEffect(() => {
    const generatedStars = Array.from({ length: 100 }, (_, index) => ({
      id: index,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      width: Math.random() * 2 + 1,
      height: Math.random() * 2 + 1,
      opacity: Math.random() * 0.5 + 0.2,
    }));
    setStars(generatedStars);
  }, []);

  // Calculate total value for percentage calculation
  const totalValue = battle.participants.reduce((sum: number, p: any) => sum + (p.totalValue || 0), 0);
  
  // Determine winners and losers
  const sortedParticipants = [...battle.participants].sort((a: any, b: any) => (b.totalValue || 0) - (a.totalValue || 0));
  let winners: any[] = [];
  let losers: any[] = [];

  if (battle.status === 'FINISHED') {
    if (isTeamBattle && battle.winningTeamNumber) {
      winners = sortedParticipants.filter((p: any) => p.teamNumber === battle.winningTeamNumber);
      losers = sortedParticipants.filter((p: any) => p.teamNumber !== battle.winningTeamNumber);
    } else if (battle.winner) {
      winners = sortedParticipants.filter((p: any) => {
        if (battle.battleMode === 'UPSIDE_DOWN') {
          const minValue = Math.min(...sortedParticipants.map((participant: any) => participant.totalValue || 0));
          return (p.totalValue || 0) === minValue;
        } else if (battle.battleMode === 'JACKPOT') {
          const maxValue = Math.max(...sortedParticipants.map((participant: any) => participant.totalValue || 0));
          return (p.totalValue || 0) === maxValue;
        }
        const maxValue = Math.max(...sortedParticipants.map((participant: any) => participant.totalValue || 0));
        return (p.totalValue || 0) === maxValue;
      });
      losers = sortedParticipants.filter((p: any) => !winners.some((w: any) => w.id === p.id));
    }
  }

  // Get all pulled cards
  const allPulls = battle.pulls || [];
  const pullType = (bp: any) => bp.itemType || (bp.pull?.boosterBox ? 'BOOSTER_BOX' : 'CARD');
  const cardPulls = allPulls.filter((bp: any) => pullType(bp) === 'CARD');
  const boosterBoxPulls = allPulls.filter((bp: any) => pullType(bp) === 'BOOSTER_BOX');

  const handlePull = async () => {
    try {
      setPulling(true);
      const res = await fetch(`/api/battles/${battle.id}/pull`, {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        addToast({
          title: 'Error',
          description: data.error || 'Failed to pull',
          variant: 'destructive',
        });
        return;
      }

      setRevealedCard(data.pull);
      
      if (data.battleComplete) {
        addToast({
          title: 'Battle Complete!',
          description: `Winner: ${data.winner?.userId === currentUserId ? 'You!' : 'Another player'}`,
        });
        setTimeout(() => {
          router.refresh();
        }, 3000);
      } else {
        addToast({
          title: 'Card Pulled!',
          description: `You pulled a card worth ${data.pull.coinValue} coins`,
        });
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to pull:', error);
      addToast({
        title: 'Error',
        description: 'Failed to pull card',
        variant: 'destructive',
      });
    } finally {
      setPulling(false);
    }
  };

  const handleJoin = async () => {
    try {
      const res = await fetch(`/api/battles/${battle.id}/join`, {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        addToast({
          title: 'Error',
          description: data.error || 'Failed to join battle',
          variant: 'destructive',
        });
        return;
      }

      addToast({
        title: 'Success',
        description: 'Joined battle successfully!',
      });

      router.refresh();
    } catch (error) {
      console.error('Failed to join battle:', error);
      addToast({
        title: 'Error',
        description: 'Failed to join battle',
        variant: 'destructive',
      });
    }
  };

  const handleRecreate = () => {
    router.push(`/battles?recreate=${battle.id}`);
  };

  const handleShare = () => {
    const url = `${window.location.origin}/battles/${battle.id}`;
    navigator.clipboard.writeText(url);
    addToast({
      title: 'Copied!',
      description: 'Battle link copied to clipboard',
    });
  };

  const handleRunBotBattle = async () => {
    if (!isAdmin || battle.status !== 'WAITING') {
      return;
    }

    if (availableSlots <= 0) {
      addToast({
        title: 'No slots',
        description: 'Battle is already full',
        variant: 'destructive',
      });
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
        description: data.summary?.winningTeamNumber
          ? `Winning Team #${data.summary.winningTeamNumber}`
          : data.summary?.winner
            ? `Winner: ${data.summary.winner.name || data.summary.winner.email}`
            : 'Simulation complete',
      });
      router.refresh();
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

  // Calculate rounds completed
  const maxRoundsPulled = Math.max(...battle.participants.map((p: any) => p.roundsPulled || 0), 0);
  const roundsCompleted = battle.status === 'FINISHED' ? battle.rounds : maxRoundsPulled;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black relative overflow-hidden">
      {/* Star-like speckles background */}
      <div className="fixed inset-0 pointer-events-none">
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute rounded-full bg-white"
            style={{
              left: star.left,
              top: star.top,
              width: `${star.width}px`,
              height: `${star.height}px`,
              opacity: star.opacity,
            }}
          />
        ))}
      </div>

      <div className="container relative z-10 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Button
              variant="ghost"
              onClick={() => router.push('/battles')}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to battles
            </Button>
            {battle.status === 'IN_PROGRESS' && (
              <div className="flex items-center gap-2 rounded-full bg-yellow-500 px-4 py-2">
                <span className="text-sm font-bold text-black">
                  {roundsCompleted}/{battle.rounds}
                </span>
              </div>
            )}
            {isTeamBattle && (
              <div className="rounded-full border border-purple-500/40 px-4 py-1 text-xs font-semibold text-purple-200">
                Team Battle · {battle.teamCount} teams · {battle.teamSize} players
              </div>
            )}
          </div>
        </div>

        {/* Battle Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-bold text-white">BATTLE</h1>
            <div className="flex items-center gap-2 rounded-lg bg-yellow-500/20 px-4 py-2">
              <Coins className="h-5 w-5 text-yellow-500" />
              <span className="text-lg font-bold text-yellow-500">
                {battle.totalPrize || totalBuyIn * battle.participants.length}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {battle.status === 'FINISHED' && (
              <>
                <Button
                  variant="outline"
                  onClick={handleRecreate}
                  className="border-blue-500 text-blue-500 hover:bg-blue-500/10"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Recreate for{' '}
                  <Coins className="mx-1 h-4 w-4" />
                  {totalBuyIn}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleShare}
                  className="border-blue-500 text-blue-500 hover:bg-blue-500/10"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Share
                </Button>
              </>
            )}
            {isAdmin && battle.status === 'WAITING' && (
              <Button
                variant="outline"
                onClick={handleRunBotBattle}
                disabled={botBattleLoading || availableSlots <= 0}
                className="border-purple-500 text-purple-300 hover:bg-purple-500/10"
              >
                <Bot className="mr-2 h-4 w-4" />
                {botBattleLoading ? 'Running Bots...' : 'Run Bot Battle'}
              </Button>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Shield className="h-4 w-4" />
              <span>Provably Fair</span>
            </div>
          </div>
        </div>

        {/* Box Image */}
        <div className="mb-8 relative h-64 w-full rounded-lg overflow-hidden border-2 border-white/10">
          <Image
            src={battle.box.imageUrl}
            alt={battle.box.name}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4">
            <h2 className="text-2xl font-bold text-white">{battle.box.name}</h2>
            <p className="text-sm text-gray-300">
              {battle.participants.length}/{battle.maxParticipants} Participants • {battle.rounds} Round{battle.rounds !== 1 ? 's' : ''} • {battle.battleMode.replace('_', ' ')}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        {canJoin && (
          <div className="mb-8">
            <Button onClick={handleJoin} size="lg" className="w-full">
              Join Battle ({totalBuyIn} coins)
            </Button>
          </div>
        )}

        {canPull && (
          <div className="mb-8">
            <Button onClick={handlePull} disabled={pulling} size="lg" className="w-full">
              {pulling 
                ? 'Pulling...' 
                : `Pull Round ${participant ? participant.roundsPulled + 1 : 1}/${battle.rounds}`}
            </Button>
          </div>
        )}

        <div className="mb-8">
          <BattleRoundAnimation battle={battle} currentUserId={currentUserId} />
        </div>

        {/* Winners and Losers Panels */}
        {battle.status === 'FINISHED' && winners.length > 0 && (
          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Winners */}
              {winners.map((participant: any) => {
                const percentage = totalValue > 0 ? ((participant.totalValue || 0) / totalValue * 100).toFixed(1) : '0';
                const isCurrentUser = participant.userId === currentUserId;
                return (
                  <div
                    key={participant.id}
                    className="relative rounded-lg bg-green-600/20 border-2 border-green-500 p-6"
                  >
                    <div className="text-center mb-4">
                      <div className="text-4xl font-bold text-green-500 mb-2">WINNER</div>
                      <div className="flex items-center justify-center gap-2 mb-4">
                        <Coins className="h-6 w-6 text-yellow-500" />
                        <span className="text-2xl font-bold text-white">
                          {participant.totalValue || 0}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-3">
                      <div className={`w-16 h-16 rounded-full ${getAvatarColor(participant.user.email)} flex items-center justify-center text-white font-bold text-xl`}>
                        {getInitials(participant.user.name, participant.user.email)}
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-white">
                          {participant.user.name || participant.user.email}
                          {isCurrentUser && ' (You)'}
                        </p>
                        {isTeamBattle && (
                          <p className="text-xs text-purple-200">Team #{participant.teamNumber ?? '—'}</p>
                        )}
                        <div className={`mt-2 inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          parseFloat(percentage) >= 30 ? 'bg-purple-500/30 text-purple-300' :
                          parseFloat(percentage) >= 20 ? 'bg-blue-500/30 text-blue-300' :
                          'bg-yellow-500/30 text-yellow-300'
                        }`}>
                          {percentage}%
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Separator */}
              {winners.length > 0 && losers.length > 0 && (
                <div className="flex items-center justify-center">
                  <div className="text-6xl font-bold text-white/20">×</div>
                </div>
              )}

              {/* Losers */}
              {losers.map((participant: any) => {
                const percentage = totalValue > 0 ? ((participant.totalValue || 0) / totalValue * 100).toFixed(1) : '0';
                const isCurrentUser = participant.userId === currentUserId;
                return (
                  <div
                    key={participant.id}
                    className="relative rounded-lg bg-red-600/20 border-2 border-red-500 p-6"
                  >
                    <div className="text-center mb-4">
                      <div className="text-4xl font-bold text-red-500 mb-2">LOSER</div>
                      <div className="flex items-center justify-center gap-2 mb-4">
                        <Coins className="h-6 w-6 text-yellow-500" />
                        <span className="text-2xl font-bold text-white">
                          {participant.totalValue || 0}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-3">
                      <div className={`w-16 h-16 rounded-full ${getAvatarColor(participant.user.email)} flex items-center justify-center text-white font-bold text-xl`}>
                        {getInitials(participant.user.name, participant.user.email)}
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-white">
                          {participant.user.name || participant.user.email}
                          {isCurrentUser && ' (You)'}
                        </p>
                        {isTeamBattle && (
                          <p className="text-xs text-purple-200">Team #{participant.teamNumber ?? '—'}</p>
                        )}
                        <div className={`mt-2 inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          parseFloat(percentage) >= 20 ? 'bg-purple-500/30 text-purple-300' :
                          parseFloat(percentage) >= 10 ? 'bg-yellow-500/30 text-yellow-300' :
                          'bg-gray-500/30 text-gray-300'
                        }`}>
                          {percentage}%
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Participants (for IN_PROGRESS or WAITING) */}
        {battle.status !== 'FINISHED' && (
          <div className="mb-8">
            <h3 className="text-xl font-bold text-white mb-4">Participants</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {battle.participants.map((participant: any) => {
                const percentage = totalValue > 0 ? ((participant.totalValue || 0) / totalValue * 100).toFixed(1) : '0';
                const isCurrentUser = participant.userId === currentUserId;
                return (
                  <div
                    key={participant.id}
                    className="rounded-lg bg-white/5 border border-white/10 p-4"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className={`w-12 h-12 rounded-full ${getAvatarColor(participant.user.email)} flex items-center justify-center text-white font-bold`}>
                        {getInitials(participant.user.name, participant.user.email)}
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-white text-sm">
                          {participant.user.name || participant.user.email}
                          {isCurrentUser && ' (You)'}
                        </p>
                        {isTeamBattle && (
                          <div className="text-xs text-purple-200">Team #{participant.teamNumber ?? '—'}</div>
                        )}
                        {participant.roundsPulled > 0 ? (
                          <>
                            <div className="flex items-center justify-center gap-1 mt-1">
                              <Coins className="h-4 w-4 text-yellow-500" />
                              <span className="text-sm font-semibold text-yellow-500">
                                {participant.totalValue || 0}
                              </span>
                            </div>
                            <div className="mt-1 text-xs text-gray-400">
                              {participant.roundsPulled}/{battle.rounds} rounds
                            </div>
                          </>
                        ) : (
                          <div className="mt-1 text-xs text-gray-400">Waiting...</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Cards Grid */}
        {allPulls.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-bold text-white mb-4">Pulled Cards</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {cardPulls.map((battlePull: any) => {
                const card = battlePull.pull?.card;
                const displayName = card?.name || battlePull.itemName || 'Unknown Card';
                const displayImage =
                  card?.imageUrlGatherer ||
                  card?.imageUrlScryfall ||
                  battlePull.itemImage ||
                  '';
                const displaySet = card?.setName || battlePull.itemSetName || 'Unknown Set';
                const displayRarity = (card?.rarity || battlePull.itemRarity || 'Unknown').toLowerCase();
                return (
                  <div
                    key={battlePull.id}
                    className="relative rounded-lg overflow-hidden border border-white/10 bg-white/5 hover:border-yellow-500/50 transition-colors"
                  >
                    <div className="relative aspect-[63/88]">
                      {displayImage ? (
                        <Image
                          src={displayImage}
                          alt={displayName}
                          fill
                          className="object-contain p-2"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-muted">
                          No Image
                        </div>
                      )}
                    </div>
                    <div className="p-2 bg-black/50">
                      <p className="text-xs font-semibold text-white truncate mb-1">
                        {displayName}
                      </p>
                      {displaySet && (
                        <p className="text-[10px] text-gray-300 truncate mb-1">{displaySet}</p>
                      )}
                      <div className="flex items-center gap-1">
                        <Coins className="h-3 w-3 text-yellow-500" />
                        <span className="text-xs font-bold text-yellow-500">
                          {battlePull.coinValue || 0}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`absolute top-2 right-2 rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        rarityColors[displayRarity] || 'bg-gray-500'
                      }`}
                    >
                      {displayRarity || '—'}
                    </span>
                  </div>
                );
              })}
              {boosterBoxPulls.map((battlePull: any) => {
                const boosterBox = battlePull.pull?.boosterBox;
                const displayName = boosterBox?.name || battlePull.itemName || 'Mystery Booster';
                const displayImage = boosterBox?.imageUrl || battlePull.itemImage || '';
                return (
                  <div
                    key={battlePull.id}
                    className="relative rounded-lg overflow-hidden border border-white/10 bg-white/5 hover:border-yellow-500/50 transition-colors"
                  >
                    <div className="relative aspect-[63/88]">
                      {displayImage ? (
                        <Image
                          src={displayImage}
                          alt={displayName}
                          fill
                          className="object-contain p-2"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-muted">
                          No Image
                        </div>
                      )}
                    </div>
                    <div className="p-2 bg-black/50">
                      <p className="text-xs font-semibold text-white truncate mb-1">
                        {displayName}
                      </p>
                      <div className="flex items-center gap-1">
                        <Coins className="h-3 w-3 text-yellow-500" />
                        <span className="text-xs font-bold text-yellow-500">
                          {battlePull.coinValue || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Card Reveal Modal */}
      {revealedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="relative">
            <CardReveal
              card={revealedCard.card || revealedCard.boosterBox}
              coinValue={revealedCard.coinValue}
              onClose={() => setRevealedCard(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
