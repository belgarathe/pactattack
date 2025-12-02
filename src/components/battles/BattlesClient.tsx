'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useUser } from '@/hooks/useUser';
import { useCoins } from '@/hooks/useCoins';
import { Plus, Users, Trophy, Clock, Coins } from 'lucide-react';
import { CreateBattleDialog } from './CreateBattleDialog';
import { BattleCard } from './BattleCard';
import type { CardGame } from '@/types';

type Battle = {
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
    hasPulled: boolean;
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

export function BattlesClient() {
  const router = useRouter();
  const { user, isAuthenticated } = useUser();
  const { balance } = useCoins();
  const { addToast } = useToast();
  const [battles, setBattles] = useState<Battle[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'WAITING' | 'IN_PROGRESS' | 'FINISHED'>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadBattles();
    }
  }, [isAuthenticated, filter]);

  const loadBattles = async () => {
    try {
      setLoading(true);
      const url = filter === 'all' 
        ? '/api/battles'
        : `/api/battles?status=${filter}`;
      
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.success) {
        setBattles(data.battles);
      }
    } catch (error) {
      console.error('Failed to load battles:', error);
      addToast({
        title: 'Error',
        description: 'Failed to load battles',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinBattle = async (battleId: string) => {
    try {
      const res = await fetch(`/api/battles/${battleId}/join`, {
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

      loadBattles();
    } catch (error) {
      console.error('Failed to join battle:', error);
      addToast({
        title: 'Error',
        description: 'Failed to join battle',
        variant: 'destructive',
      });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container py-12">
        <Card>
          <CardContent className="py-12 text-center">
            <p>Please sign in to view battles</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">Box Battles</h1>
          <p className="mt-2 text-muted">
            Compete against other players. Each participant buys the same box. Highest coin value wins!
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Battle
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          All
        </Button>
        <Button
          variant={filter === 'WAITING' ? 'default' : 'outline'}
          onClick={() => setFilter('WAITING')}
        >
          Waiting
        </Button>
        <Button
          variant={filter === 'IN_PROGRESS' ? 'default' : 'outline'}
          onClick={() => setFilter('IN_PROGRESS')}
        >
          In Progress
        </Button>
        <Button
          variant={filter === 'FINISHED' ? 'default' : 'outline'}
          onClick={() => setFilter('FINISHED')}
        >
          Finished
        </Button>
      </div>

      {/* Battles Grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-64" />
            </Card>
          ))}
        </div>
      ) : battles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted">No battles found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {battles.map((battle) => (
            <BattleCard
              key={battle.id}
              battle={battle}
              currentUserId={user?.id}
              currentUserRole={user?.role}
              onJoin={() => handleJoinBattle(battle.id)}
              onView={() => router.push(`/battles/${battle.id}`)}
              onBotBattleComplete={loadBattles}
              onDeleted={loadBattles}
            />
          ))}
        </div>
      )}

      <CreateBattleDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreated={() => {
          setShowCreateDialog(false);
          loadBattles();
        }}
      />
    </div>
  );
}

