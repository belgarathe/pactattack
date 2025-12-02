'use server';

import { NextResponse } from 'next/server';

type RawLorcanaCard = {
  Artist?: string;
  Set_Name?: string;
  Classifications?: string;
  Date_Added?: string;
  Set_Num?: number;
  Color?: string;
  Gamemode?: string;
  Franchise?: string;
  Image?: string;
  Cost?: string | number | null;
  Inkable?: string | boolean;
  Name?: string;
  Type?: string;
  Lore?: string | number | null;
  Rarity?: string;
  Flavor_Text?: string;
  Unique_ID?: string;
  Card_Num?: string | number;
  Body_Text?: string;
  Willpower?: string | number | null;
  Date_Modified?: string;
  Strength?: string | number | null;
  Set_ID?: string | number;
};

type CardSearchResult = {
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
  sourceGame: 'LORCANA';
};

const API_URL = 'https://api.lorcana-api.com/cards/all';
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

let cardCache: { data: RawLorcanaCard[]; fetchedAt: number } | null = null;

async function fetchAllCards(): Promise<RawLorcanaCard[]> {
  if (cardCache && Date.now() - cardCache.fetchedAt < CACHE_TTL) {
    return cardCache.data;
  }

  const response = await fetch(API_URL, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Lorcana API request failed (${response.status})`);
  }

  const data: RawLorcanaCard[] = await response.json();
  cardCache = { data, fetchedAt: Date.now() };
  return data;
}

function normalizeNumber(value?: string | number | null): number | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'number') {
    return Number.isNaN(value) ? undefined : value;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.toUpperCase() === 'NULL') {
    return undefined;
  }
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function buildOracleText(card: RawLorcanaCard): string | undefined {
  const parts: string[] = [];
  if (card.Body_Text && card.Body_Text !== 'NULL') {
    parts.push(card.Body_Text);
  }
  if (card.Lore && card.Lore !== 'NULL') {
    parts.push(`Lore: ${card.Lore}`);
  }
  if (card.Flavor_Text && card.Flavor_Text !== 'NULL') {
    parts.push(card.Flavor_Text);
  }
  return parts.length ? parts.join('\n\n') : undefined;
}

function mapLorcanaCard(card: RawLorcanaCard): CardSearchResult | null {
  const uniqueId = card.Unique_ID || card.Card_Num?.toString();
  if (!uniqueId || !card.Name) {
    return null;
  }

  const image = card.Image || '';
  const colors = card.Color
    ? card.Color.split(',').map((color) => color.trim()).filter(Boolean)
    : [];
  const collectorNumber = card.Card_Num ? String(card.Card_Num) : uniqueId;
  const setCode =
    typeof card.Set_ID === 'number'
      ? `SET-${card.Set_ID}`
      : card.Set_ID
      ? String(card.Set_ID)
      : 'LORCANA';

  return {
    scryfallId: `lorcana-${uniqueId}`,
    name: card.Name,
    setName: card.Set_Name || 'Lorcana',
    setCode,
    collectorNumber,
    rarity: card.Rarity || 'Unknown',
    imageUrlGatherer: image,
    imageUrlScryfall: image,
    colors,
    cmc: normalizeNumber(card.Cost),
    type: [card.Type, card.Classifications].filter(Boolean).join(' — ') || 'Card',
    oracleText: buildOracleText(card),
    sourceGame: 'LORCANA',
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query')?.trim();

    if (!query) {
      return NextResponse.json(
        { error: 'Missing query parameter' },
        { status: 400 }
      );
    }

    const normalizedQuery = query.toLowerCase();
    const allCards = await fetchAllCards();
    
    const filtered = allCards
      .filter((card) => {
        const nameMatch = card.Name?.toLowerCase().includes(normalizedQuery);
        const numberMatch = card.Card_Num?.toString().toLowerCase().includes(normalizedQuery);
        return nameMatch || numberMatch;
      })
      .slice(0, 60);

    const mapped = filtered
      .map((card) => mapLorcanaCard(card))
      .filter((card): card is CardSearchResult => Boolean(card && card.imageUrlGatherer));

    return NextResponse.json({ cards: mapped });
  } catch (error) {
    console.error('Lorcana search error:', error);
    return NextResponse.json(
      { error: 'Failed to search Lorcana cards' },
      { status: 500 }
    );
  }
}





