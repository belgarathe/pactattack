'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils';
import { Search, Plus, Trash2, Loader2 } from 'lucide-react';
import type { CardGame } from '@/types';

type ImageSourceOption = {
  provider: string;
  url: string;
  kind?: 'artwork' | 'scan' | 'render' | 'unknown';
};

interface CardData {
  id?: string; // Card ID from database
  scryfallId: string;
  multiverseId?: string;
  name: string;
  setName: string;
  setCode: string;
  collectorNumber: string;
  rarity: string;
  imageUrlGatherer: string;
  imageUrlScryfall?: string;
  colors: string[];
  cmc?: number;
  type: string;
  oracleText?: string;
  pullRate: number;
  coinValue?: number;
  priceAvg?: number | null;
  sourceGame?: CardGame;
  imageSources?: ImageSourceOption[];
  selectedImageSource?: string;
  dataProvider?: string;
}

interface CardManagerProps {
  onCardsChange?: (cards: CardData[]) => void;
  initialCards?: CardData[];
  games?: CardGame[];
  pullRateBudget?: number;
}

const GAME_LABELS: Record<CardGame, string> = {
  MAGIC_THE_GATHERING: 'Magic: The Gathering',
  ONE_PIECE: 'One Piece',
  POKEMON: 'Pokémon',
  LORCANA: 'Lorcana',
};

const DEFAULT_GAMES: CardGame[] = ['MAGIC_THE_GATHERING'];

const SEARCH_PLACEHOLDERS: Record<CardGame, string> = {
  MAGIC_THE_GATHERING: 'Search cards (Scryfall + MTG API, e.g., "Lightning Bolt", "set:MH2")',
  ONE_PIECE: 'Search One Piece cards (name or ID like OP01-001)',
  POKEMON: 'Search Pokémon cards (e.g., "Pikachu")',
  LORCANA: 'Search Lorcana cards (e.g., "Mickey")',
};

const SEARCH_DESCRIPTIONS: Record<CardGame, string> = {
  MAGIC_THE_GATHERING:
    'Search Magic cards using both Scryfall and the official Magic: The Gathering API for wider coverage.',
  ONE_PIECE:
    'Search official One Piece cards via the OPTCG API. Enter a card name or ID such as OP01-001.',
  POKEMON:
    'Search Pokémon TCG data via the official API. Try names like "Charizard" or use advanced filters later.',
  LORCANA:
    'Search Lorcana cards using lorcana-api.com. Enter a character name or keyword such as "Mickey".',
};

const SEARCH_BUTTON_LABELS: Record<CardGame, string> = {
  MAGIC_THE_GATHERING: 'Search MTG',
  ONE_PIECE: 'Search OPTCG',
  POKEMON: 'Search Pokémon',
  LORCANA: 'Search Lorcana',
};

// Stable empty array reference to prevent dependency array size changes
const EMPTY_CARDS_ARRAY: CardData[] = [];

export function CardManager({
  onCardsChange,
  initialCards = EMPTY_CARDS_ARRAY,
  games = DEFAULT_GAMES,
  pullRateBudget = 100,
}: CardManagerProps) {
  const { addToast } = useToast();
  const enabledGames = useMemo(() => {
    if (games && games.length) {
      return Array.from(new Set(games));
    }
    return DEFAULT_GAMES;
  }, [games]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CardData[]>([]);
  const [searching, setSearching] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteOptions, setAutocompleteOptions] = useState<CardData[]>([]);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [imageSelections, setImageSelections] = useState<Record<string, string>>({});
  
  // Normalize initialCards to always be an array for stable dependency array
  // Always use a consistent array reference (never undefined)
  const normalizedInitialCards: CardData[] = Array.isArray(initialCards) ? initialCards : EMPTY_CARDS_ARRAY;
  
  const [cards, setCards] = useState<CardData[]>(normalizedInitialCards);
  const [activeGame, setActiveGame] = useState<CardGame>(enabledGames[0]);
  const isMagicGame = activeGame === 'MAGIC_THE_GATHERING';
  const isOnePieceGame = activeGame === 'ONE_PIECE';
  const isPokemonGame = activeGame === 'POKEMON';
  const isLorcanaGame = activeGame === 'LORCANA';
  const searchPlaceholder = SEARCH_PLACEHOLDERS[activeGame];
  const searchButtonLabel = SEARCH_BUTTON_LABELS[activeGame];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!enabledGames.includes(activeGame)) {
      setActiveGame(enabledGames[0]);
    }
  }, [enabledGames, activeGame]);

  useEffect(() => {
    setSearchResults([]);
    setAutocompleteOptions([]);
    setShowAutocomplete(false);
    setSearchQuery('');
    setSearchError(null);
    setImageSelections({});
  }, [activeGame]);

  useEffect(() => {
    // Sync local state with initialCards when they change
    // Use normalized array to ensure dependency array always has consistent type
    const currentCards = Array.isArray(initialCards) ? initialCards : EMPTY_CARDS_ARRAY;
    setCards(currentCards);
  }, [initialCards]);

  // Update dropdown position when autocomplete is shown
  useEffect(() => {
    if (!isMagicGame) {
      setShowAutocomplete(false);
      setDropdownPosition(null);
      return;
    }
    if (showAutocomplete && inputRef.current) {
      const updatePosition = () => {
        if (inputRef.current) {
          const rect = inputRef.current.getBoundingClientRect();
          setDropdownPosition({
            top: rect.bottom + window.scrollY + 8,
            left: rect.left + window.scrollX,
            width: rect.width,
          });
        }
      };
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    } else {
      setDropdownPosition(null);
    }
  }, [showAutocomplete, isMagicGame]);

  // Close autocomplete dropdown when clicking outside
  useEffect(() => {
    if (!isMagicGame) {
      return;
    }
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (inputRef.current && !inputRef.current.contains(target) && 
          !(target as HTMLElement).closest('[data-autocomplete-dropdown]')) {
        setShowAutocomplete(false);
      }
    };

    if (showAutocomplete) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showAutocomplete, isMagicGame]);

  // Autocomplete search with debouncing
  useEffect(() => {
    if (!isMagicGame) {
      return;
    }
    if (searchQuery.length < 2) {
      setAutocompleteOptions([]);
      setShowAutocomplete(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const res = await fetch(`/api/mtg/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        if (res.ok) {
          const results = (data.cards || []).slice(0, 10); // Limit to 10 for autocomplete
          setAutocompleteOptions(results);
          setShowAutocomplete(results.length > 0);
        }
      } catch (error) {
        console.error('Autocomplete error:', error);
      } finally {
        setSearching(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery, isMagicGame]);

  const buildSearchEndpoint = (gameValue: CardGame, query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      return null;
    }
    switch (gameValue) {
      case 'MAGIC_THE_GATHERING':
        return `/api/mtg/search?q=${encodeURIComponent(query)}`;
      case 'ONE_PIECE':
        return `/api/optcg/search?query=${encodeURIComponent(trimmed)}`;
      case 'POKEMON':
        return `/api/pokemon/search?query=${encodeURIComponent(trimmed)}`;
      case 'LORCANA':
        return `/api/lorcana/search?query=${encodeURIComponent(trimmed)}`;
      default:
        return null;
    }
  };

  const searchCards = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    setShowAutocomplete(false);
    setSearchError(null);
    try {
      const endpoint = buildSearchEndpoint(activeGame, searchQuery);
      if (!endpoint) {
        setSearching(false);
        return;
      }
      const res = await fetch(endpoint);
      const data = await res.json();
      if (res.ok) {
        const cards = data.cards || [];
        setSearchResults(cards);
        setImageSelections({});
        if (cards.length === 0) {
          setSearchError('No cards found for this query.');
        }
      } else {
        const message =
          data.error ||
          data.message ||
          `Failed to search ${GAME_LABELS[activeGame]} cards`;
        setSearchResults([]);
        setImageSelections({});
        setSearchError(message);
        addToast({
          title: 'Search failed',
          description: message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      setImageSelections({});
      setSearchError(`Failed to search ${GAME_LABELS[activeGame]} cards. Please try again.`);
      addToast({
        title: 'Error',
        description: `Failed to search ${GAME_LABELS[activeGame]} cards`,
        variant: 'destructive',
      });
    } finally {
      setSearching(false);
    }
  };

  const handleAutocompleteSelect = (card: CardData) => {
    addCard(card);
    setSearchQuery('');
    setAutocompleteOptions([]);
    setShowAutocomplete(false);
  };

  const resolveSelectedImage = (card: CardData) => {
    return (
      imageSelections[card.scryfallId] ||
      card.selectedImageSource ||
      card.imageUrlGatherer ||
      card.imageUrlScryfall ||
      card.imageSources?.[0]?.url ||
      ''
    );
  };

  const addCard = (card: CardData) => {
    // Check if card already exists
    if (cards.some((c) => c.scryfallId === card.scryfallId)) {
      addToast({
        title: 'Card already added',
        description: 'This card is already in the box',
        variant: 'destructive',
      });
      return;
    }

    // Add card with default pull rate of 0 and Coin value of 1
    const selectedImageUrl = resolveSelectedImage(card) || '/placeholder.svg';

    const newCard: CardData = {
      ...card,
      pullRate: 0,
      coinValue: 1,
      sourceGame: card.sourceGame || activeGame,
      imageUrlGatherer: selectedImageUrl,
      imageUrlScryfall: selectedImageUrl,
      selectedImageSource: selectedImageUrl,
      imageSources: card.imageSources || [],
      dataProvider: card.dataProvider,
      priceAvg:
        typeof card.priceAvg === 'number'
          ? Number(card.priceAvg)
          : null,
    };
    const updatedCards = [...cards, newCard];
    setCards(updatedCards);
    setSearchResults([]);
    setSearchQuery('');
    
    // Notify parent component immediately
    if (onCardsChange) {
      onCardsChange(updatedCards);
    }
  };

  const removeCard = (scryfallId: string) => {
    const updatedCards = cards.filter((c) => c.scryfallId !== scryfallId);
    setCards(updatedCards);
    
    // Notify parent component immediately
    if (onCardsChange) {
      onCardsChange(updatedCards);
    }
  };


  const updatePullRate = (scryfallId: string, rate: number) => {
    const clampedRate = Math.max(0, Math.min(100, rate));
    
    // Calculate updated cards
    const updatedCards = cards.map((c) =>
      c.scryfallId === scryfallId
        ? { ...c, pullRate: clampedRate }
        : c
    );
    
    // Update UI immediately
    setCards(updatedCards);

    // Notify parent component immediately (changes are local until Save is pressed)
    if (onCardsChange) {
      onCardsChange(updatedCards);
    }
  };

  const updatecoinValue = (scryfallId: string, value: number) => {
    const clampedValue = Math.max(1, Math.floor(value));
    
    // Calculate updated cards
    const updatedCards = cards.map((c) =>
      c.scryfallId === scryfallId
        ? { ...c, coinValue: clampedValue }
        : c
    );
    
    // Update UI immediately
    setCards(updatedCards);

    // Notify parent component immediately (changes are local until Save is pressed)
    if (onCardsChange) {
      onCardsChange(updatedCards);
    }
  };

  const distributeEvenly = () => {
    if (cards.length === 0) return;
    const rate = 100 / cards.length;
    const updatedCards = cards.map((c) => ({ ...c, pullRate: parseFloat(rate.toFixed(3)) }));
    setCards(updatedCards);
    // Notify parent component
    if (onCardsChange) {
      onCardsChange(updatedCards);
    }
  };

  const distributeByRarity = () => {
    const rarityRates: Record<string, number> = {
      common: 60,
      uncommon: 30,
      rare: 9,
      mythic: 1,
    };

    const cardsByRarity: Record<string, CardData[]> = {};
    cards.forEach((card) => {
      const rarity = card.rarity.toLowerCase();
      if (!cardsByRarity[rarity]) cardsByRarity[rarity] = [];
      cardsByRarity[rarity].push(card);
    });

    const newCards: CardData[] = [];
    Object.entries(cardsByRarity).forEach(([rarity, rarityCards]) => {
      const rate = rarityRates[rarity] || 0;
      const cardRate = rarityCards.length > 0 ? rate / rarityCards.length : 0;
      rarityCards.forEach((card) => {
        newCards.push({ ...card, pullRate: parseFloat(cardRate.toFixed(3)) });
      });
    });

    setCards(newCards);
    // Notify parent component
    if (onCardsChange) {
      onCardsChange(newCards);
    }
  };

  const budget = Math.max(0, Math.min(100, pullRateBudget));
  const totalPullRate = cards.reduce((sum, card) => sum + card.pullRate, 0);
  const remainingBudget = budget - totalPullRate;
  const isValid = Math.abs(remainingBudget) < 0.001;

  const getRarityColor = (rarity: string) => {
    const r = rarity.toLowerCase();
    if (r === 'mythic') return 'bg-purple-500/20 text-purple-300 border-purple-500';
    if (r === 'rare') return 'bg-yellow-500/20 text-yellow-300 border-yellow-500';
    if (r === 'uncommon') return 'bg-blue-500/20 text-blue-300 border-blue-500';
    return 'bg-gray-500/20 text-gray-300 border-gray-500';
  };

  return (
    <div className="space-y-6">
      {/* Card Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Add Cards</CardTitle>
          <CardDescription>{SEARCH_DESCRIPTIONS[activeGame]}</CardDescription>
        </CardHeader>
        <CardContent className="overflow-visible">
          <div className="mb-4 flex flex-wrap gap-2">
            {enabledGames.map((gameOption) => {
              const selected = gameOption === activeGame;
              return (
                <button
                  key={gameOption}
                  type="button"
                  onClick={() => setActiveGame(gameOption)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    selected
                      ? 'border-primary bg-primary/20 text-primary-foreground'
                      : 'border-white/20 text-muted-foreground hover:border-white/40'
                  }`}
                >
                  {GAME_LABELS[gameOption]}
                </button>
              );
            })}
          </div>
          <div className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  ref={inputRef}
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (isMagicGame && showAutocomplete && autocompleteOptions.length > 0) {
                        handleAutocompleteSelect(autocompleteOptions[0]);
                      } else {
                        searchCards();
                      }
                    }
                  }}
                  onFocus={() => {
                    if (autocompleteOptions.length > 0) {
                      setShowAutocomplete(true);
                    }
                  }}
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted" />
                )}
              </div>
              <Button onClick={searchCards} disabled={searching}>
                <Search className="mr-2 h-4 w-4" />
                {searching ? 'Searching...' : searchButtonLabel}
              </Button>
            </div>
            
            {/* Autocomplete Dropdown - Rendered via Portal for HIGHEST PRIORITY */}
            {mounted && isMagicGame && showAutocomplete && autocompleteOptions.length > 0 && dropdownPosition && createPortal(
              <div
                data-autocomplete-dropdown
                className="fixed z-[99999] max-h-96 overflow-y-auto rounded-lg border-2 border-primary/50 bg-background shadow-2xl backdrop-blur-sm"
                style={{
                  top: `${dropdownPosition.top}px`,
                  left: `${dropdownPosition.left}px`,
                  width: `${dropdownPosition.width}px`,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {autocompleteOptions.map((card) => (
                  <div
                    key={card.scryfallId}
                    className="flex items-center gap-3 p-3 cursor-pointer hover:bg-primary/20 transition border-b border-white/10 last:border-0 bg-background"
                    onClick={() => handleAutocompleteSelect(card)}
                  >
                    {card.imageUrlGatherer || card.imageUrlScryfall ? (
                      <div className="relative h-12 w-8 flex-shrink-0 rounded overflow-hidden border border-white/10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={card.imageUrlGatherer || card.imageUrlScryfall || ''}
                          alt={card.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-12 w-8 flex-shrink-0 rounded border border-white/10 bg-white/5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate text-foreground">{card.name}</p>
                      <p className="text-sm text-muted truncate">
                        {card.setName} ({card.setCode}) • {card.rarity}
                      </p>
                    </div>
                  </div>
                ))}
              </div>,
              document.body
            )}
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-4 max-h-96 space-y-2 overflow-y-auto">
              {searchResults.map((card) => (
                <div
                  key={card.scryfallId}
                  className="flex items-center justify-between rounded-lg border border-white/20 bg-white/5 p-3"
                >
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        imageSelections[card.scryfallId] ||
                        card.imageUrlGatherer ||
                        card.imageUrlScryfall ||
                        card.imageSources?.[0]?.url ||
                        '/placeholder.svg'
                      }
                      alt={card.name}
                      className="h-16 w-12 rounded object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          card.imageUrlScryfall ||
                          card.imageSources?.[0]?.url ||
                          '/placeholder.svg';
                      }}
                    />
                    <div>
                      <div className="font-semibold">{card.name}</div>
                      <div className="text-sm text-muted">
                        {card.setName}
                        {card.setCode ? ` (${card.setCode})` : ''} • {card.rarity}
                      </div>
                      {typeof card.priceAvg === 'number' && card.priceAvg > 0 && (
                        <div className="text-xs text-green-400">
                          Scryfall EUR: {formatCurrency(card.priceAvg)}
                        </div>
                      )}
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                          {GAME_LABELS[card.sourceGame || activeGame]}
                        </Badge>
                        {card.dataProvider && (
                          <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                            {card.dataProvider}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-2 text-xs text-muted">
                        Image source:
                        {card.imageSources && card.imageSources.length > 1 ? (
                          <select
                            className="ml-2 rounded border border-white/20 bg-transparent px-2 py-1 text-xs"
                            value={
                              imageSelections[card.scryfallId] ||
                              card.imageSources[0]?.url ||
                              card.imageUrlGatherer ||
                              ''
                            }
                            onChange={(e) =>
                              setImageSelections((prev) => ({
                                ...prev,
                                [card.scryfallId]: e.target.value,
                              }))
                            }
                          >
                            {card.imageSources.map((source) => (
                              <option key={source.url} value={source.url}>
                                {source.provider}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="ml-1 text-foreground">
                            {card.imageSources?.[0]?.provider ||
                              card.dataProvider ||
                              'Primary'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => addCard(card)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          {searchError && (
            <p className="mt-3 text-sm text-yellow-400">{searchError}</p>
          )}
          {isOnePieceGame && (
            <p className="mt-3 text-xs text-muted">
              Data provided by the{' '}
              <a
                href="https://optcgapi.com/documentation"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline"
              >
                OPTCG API
              </a>
              . Please keep requests reasonable to respect their free service.
            </p>
          )}
          {isPokemonGame && (
            <p className="mt-3 text-xs text-muted">
              Data provided by the{' '}
              <a
                href="https://dev.pokemontcg.io/"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline"
              >
                Pokémon TCG API
              </a>
              . The default key is baked into the app; override it with{' '}
              <code>POKEMON_TCG_API_KEY</code> if needed.
            </p>
          )}
          {isLorcanaGame && (
            <p className="mt-3 text-xs text-muted">
              Data provided by{' '}
              <a
                href="https://lorcana-api.com/"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline"
              >
                lorcana-api.com
              </a>
              . The upstream dataset refreshes periodically throughout the week.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Selected Cards with Pull Rates */}
      {cards.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Box Cards ({cards.length})</CardTitle>
                <CardDescription>
                  Set pull rates and Coin values for each card. Cards must account for
                  {` ${budget.toFixed(3)}%`} of the 100% pool (any sealed products consume the remaining share). Click &quot;Save Changes&quot; to validate and save.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={distributeEvenly}>
                  Distribute Evenly
                </Button>
                <Button variant="outline" size="sm" onClick={distributeByRarity}>
                  By Rarity
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Pull Rate Summary */}
            <div
              className={`mb-4 rounded-lg border p-4 ${
                isValid
                  ? 'border-green-500/50 bg-green-500/10'
                  : 'border-red-500/50 bg-red-500/10'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">Card Pull Rate Budget:</span>
                <span className={`text-lg font-bold ${isValid ? 'text-green-400' : 'text-red-400'}`}>
                  {totalPullRate.toFixed(3)}% / {budget.toFixed(3)}%
                </span>
              </div>
              <div className="mt-2 text-sm">
                {remainingBudget > 0 && (
                  <span className="text-yellow-300">
                    {remainingBudget.toFixed(3)}% still needs to be allocated to cards.
                  </span>
                )}
                {remainingBudget < 0 && (
                  <span className="text-red-400">
                    Cards exceed their {budget.toFixed(3)}% allotment by {Math.abs(remainingBudget).toFixed(3)}%.
                  </span>
                )}
                {isValid && (
                  <span className="text-green-300">Card pull rates perfectly match the required budget.</span>
                )}
              </div>
            </div>

            {/* Cards List */}
            <div className="space-y-3">
              {cards.map((card) => {
                const cardGameLabel = GAME_LABELS[card.sourceGame || 'MAGIC_THE_GATHERING'];
                return (
                  <div
                    key={card.scryfallId}
                    className="flex flex-col gap-4 rounded-lg border border-white/20 bg-white/5 p-4 lg:flex-row lg:items-center"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        card.imageUrlGatherer ||
                        card.imageUrlScryfall ||
                        card.imageSources?.[0]?.url ||
                        '/placeholder.svg'
                      }
                      alt={card.name}
                      className="h-24 w-16 rounded object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          card.imageUrlScryfall ||
                          card.imageSources?.[0]?.url ||
                          '/placeholder.svg';
                      }}
                    />
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{card.name}</span>
                        <Badge className={getRarityColor(card.rarity)}>{card.rarity}</Badge>
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                          {cardGameLabel}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted">
                        {card.setName} • {card.type}
                      </div>
                      {card.dataProvider && (
                        <div className="text-xs text-muted">
                          Source: {card.dataProvider}
                        </div>
                      )}
                      {typeof card.priceAvg === 'number' && card.priceAvg > 0 && (
                        <div className="text-xs text-green-400">
                          Price (EUR): {formatCurrency(card.priceAvg)}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1">
                          <label className="text-xs text-muted">Pull Rate:</label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.001"
                            value={card.pullRate}
                            onChange={(e) =>
                              updatePullRate(card.scryfallId, parseFloat(e.target.value) || 0)
                            }
                            className="w-24"
                            placeholder="0.000"
                          />
                          <span className="text-sm text-muted">%</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <label className="text-xs text-muted">💎 Value:</label>
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            value={card.coinValue || 1}
                            onChange={(e) =>
                              updatecoinValue(card.scryfallId, parseInt(e.target.value) || 1)
                            }
                            className="w-20"
                            placeholder="1"
                          />
                          <span className="text-sm text-muted">coins</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCard(card.scryfallId)}
                      >
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

