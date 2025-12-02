'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useCoins } from '@/hooks/useCoins';
import { X } from 'lucide-react';
import Image from 'next/image';

type Box = {
  id: string;
  name: string;
  imageUrl: string;
  price: number;
  isActive: boolean;
};

type PlayerConfig = {
  id: string;
  label: string;
  description: string;
  format: 'SOLO' | 'TEAM';
  maxParticipants: number;
  teamSize: number;
  teamCount: number;
};

const PLAYER_CONFIGS: PlayerConfig[] = [
  {
    id: 'solo-2',
    label: '1 vs 1',
    description: 'Head-to-head duel',
    format: 'SOLO',
    maxParticipants: 2,
    teamSize: 1,
    teamCount: 2,
  },
  {
    id: 'solo-3',
    label: '1 vs 1 vs 1',
    description: 'Three player free-for-all',
    format: 'SOLO',
    maxParticipants: 3,
    teamSize: 1,
    teamCount: 3,
  },
  {
    id: 'solo-4',
    label: '1 vs 1 vs 1 vs 1',
    description: 'Classic four player battle',
    format: 'SOLO',
    maxParticipants: 4,
    teamSize: 1,
    teamCount: 4,
  },
  {
    id: 'team-2v2',
    label: '2 vs 2 Team Battle',
    description: 'Team up and share the glory',
    format: 'TEAM',
    maxParticipants: 4,
    teamSize: 2,
    teamCount: 2,
  },
];

const BATTLE_MODES = [
  {
    value: 'NORMAL' as const,
    label: 'Highest Total Value',
    description: 'Classic mode. Most coins wins.',
  },
  {
    value: 'UPSIDE_DOWN' as const,
    label: 'Lowest Total Value',
    description: 'Flip the script. Lowest score wins.',
  },
  {
    value: 'JACKPOT' as const,
    label: 'Jackpot',
    description: 'Single highest pull takes everything.',
  },
];

type CreateBattleDialogProps = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

export function CreateBattleDialog({ open, onClose, onCreated }: CreateBattleDialogProps) {
  const { addToast } = useToast();
  const { balance } = useCoins();
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [selectedBoxId, setSelectedBoxId] = useState<string>('');
  const [entryFee, setEntryFee] = useState<number>(0);
  const [rounds, setRounds] = useState<number>(1);
  const [battleMode, setBattleMode] = useState<'NORMAL' | 'UPSIDE_DOWN' | 'JACKPOT'>('NORMAL');
  const [shareMode, setShareMode] = useState<boolean>(false);
  const [playerConfigId, setPlayerConfigId] = useState<string>(PLAYER_CONFIGS[0].id);
  const [boxSort, setBoxSort] = useState<'name' | 'price'>('name');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadBoxes();
    }
  }, [open]);

  const loadBoxes = async () => {
    try {
      const res = await fetch('/api/boxes');
      const data = await res.json();
      if (data.success) {
        setBoxes(data.boxes);
      } else {
        console.error('Failed to load boxes:', data.error);
        addToast({
          title: 'Error',
          description: 'Failed to load boxes',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to load boxes:', error);
      addToast({
        title: 'Error',
        description: 'Failed to load boxes',
        variant: 'destructive',
      });
    }
  };

  const selectedConfig = PLAYER_CONFIGS.find((config) => config.id === playerConfigId) ?? PLAYER_CONFIGS[0];
  const derivedMaxParticipants = selectedConfig.maxParticipants;
  const derivedTeamSize = selectedConfig.teamSize;
  const derivedTeamCount = selectedConfig.teamCount;
  const battleFormat = selectedConfig.format;
  const selectedBox = boxes.find((box) => box.id === selectedBoxId) ?? null;
  const battlePrice = entryFee + (selectedBox ? selectedBox.price * rounds : 0);
  const sortedBoxes = [...boxes].sort((a, b) =>
    boxSort === 'price' ? a.price - b.price : a.name.localeCompare(b.name)
  );

  const handleCreate = async () => {
    if (!selectedBoxId) {
      addToast({
        title: 'Error',
        description: 'Please select a box for the battle',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedBox) return;

    // Creator must pay entry fee + price of every pack across all rounds
    const totalCost = entryFee + selectedBox.price * rounds;
    if (balance < totalCost) {
      addToast({
        title: 'Error',
        description: `Not enough coins. Need ${totalCost} coins (${entryFee} entry fee + ${selectedBox.price} × ${rounds} rounds for packs)`,
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/battles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boxId: selectedBoxId,
          entryFee,
          maxParticipants: derivedMaxParticipants,
          rounds,
          battleMode,
          shareMode,
          battleFormat,
          teamSize: derivedTeamSize,
          teamCount: derivedTeamCount,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        addToast({
          title: 'Error',
          description: data.error || 'Failed to create battle',
          variant: 'destructive',
        });
        return;
      }

      addToast({
        title: 'Success',
        description: 'Battle created successfully!',
      });

      onCreated();
    } catch (error) {
      console.error('Failed to create battle:', error);
      addToast({
        title: 'Error',
        description: 'Failed to create battle',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-surface p-6 shadow-lg">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 hover:bg-white/10"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="mb-6 text-2xl font-bold">Create Battle</h2>

        <div className="space-y-6">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <Label className="text-base font-semibold">Players</Label>
              <span className="text-xs text-muted-foreground">Choose format</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {PLAYER_CONFIGS.map((config) => {
                const isActive = config.id === playerConfigId;
                return (
                  <button
                    key={config.id}
                    onClick={() => setPlayerConfigId(config.id)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      isActive
                        ? 'border-primary bg-primary/10 shadow-lg'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    <p className="text-sm uppercase tracking-wide text-muted-foreground">
                      {config.format === 'TEAM' ? 'Team Battle' : 'Free For All'}
                    </p>
                    <p className="text-lg font-semibold text-white">{config.label}</p>
                    <p className="text-xs text-muted-foreground">{config.description}</p>
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <Label className="text-base font-semibold">Boxes</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={boxSort === 'name' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setBoxSort('name')}
                >
                  Sort by Name
                </Button>
                <Button
                  type="button"
                  variant={boxSort === 'price' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setBoxSort('price')}
                >
                  Sort by Coin
                </Button>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-4 md:grid-cols-3">
              {sortedBoxes.map((box) => (
                <button
                  key={box.id}
                  onClick={() => setSelectedBoxId(box.id)}
                  className={`relative h-32 overflow-hidden rounded-lg border-2 transition ${
                    selectedBoxId === box.id
                      ? 'border-primary shadow-lg'
                      : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  <Image
                    src={box.imageUrl}
                    alt={box.name}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/10 p-2">
                    <p className="text-sm font-semibold text-white">{box.name}</p>
                    <p className="text-xs text-white/80">{box.price} coins</p>
                  </div>
                </button>
              ))}
              {!sortedBoxes.length && (
                <div className="col-span-full rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-muted-foreground">
                  No boxes available yet.
                </div>
              )}
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <Label htmlFor="entryFee">Entry Fee (coins)</Label>
                <Input
                  id="entryFee"
                  type="number"
                  min="0"
                  value={entryFee}
                  onChange={(e) => setEntryFee(parseInt(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="rounds">Number of Rounds</Label>
                <select
                  id="rounds"
                  value={rounds}
                  onChange={(e) => setRounds(parseInt(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-background px-3 py-2"
                >
                  <option value={1}>1 Round</option>
                  <option value={5}>5 Rounds</option>
                  <option value={6}>6 Rounds</option>
                  <option value={7}>7 Rounds</option>
                </select>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-white">Share Mode</p>
                  <p className="text-xs text-muted-foreground">Evenly distribute all pulls</p>
                </div>
                <Button
                  type="button"
                  variant={shareMode ? 'default' : 'outline'}
                  onClick={() => setShareMode((prev) => !prev)}
                >
                  {shareMode ? 'Enabled' : 'Enable'}
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm uppercase tracking-wide text-muted-foreground">Summary</p>
              <div className="mt-3 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span>Box</span>
                  <span className="font-semibold text-white">
                    {selectedBox ? selectedBox.name : 'Select a box'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Players</span>
                  <span className="font-semibold text-white">{selectedConfig.label}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Rounds</span>
                  <span className="font-semibold text-white">{rounds}</span>
                </div>
                <div className="flex items-center justify-between text-base">
                  <span className="text-muted-foreground">Battle Price</span>
                  <span className="font-bold text-primary">{battlePrice} coins</span>
                </div>
              </div>
              {battleFormat === 'TEAM' && (
                <div className="mt-3 rounded-xl bg-purple-500/10 p-3 text-xs text-purple-100">
                  Team battle: {derivedTeamCount} teams • {derivedTeamSize} players each. Prize and pulls
                  split across the winning squad.
                </div>
              )}
              {selectedBox && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Entry: {entryFee} coins • Packs: {selectedBox.price} × {rounds} ={' '}
                  {selectedBox.price * rounds} coins
                </p>
              )}
            </div>
          </section>

          <section>
            <Label className="mb-3 block text-base font-semibold">Win Condition</Label>
            <div className="grid gap-3 md:grid-cols-3">
              {BATTLE_MODES.map((mode) => {
                const isSelected = battleMode === mode.value;
                return (
                  <button
                    key={mode.value}
                    onClick={() => setBattleMode(mode.value)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-white'
                        : 'border-white/10 text-muted-foreground hover:border-white/30'
                    }`}
                  >
                    <p className="text-sm font-semibold">{mode.label}</p>
                    <p className="text-xs">{mode.description}</p>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={loading || !selectedBoxId}
              className="flex-1"
            >
              {loading ? 'Creating...' : 'Create Battle'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

