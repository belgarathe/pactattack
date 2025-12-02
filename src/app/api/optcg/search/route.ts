'use server';

import { NextResponse } from 'next/server';

const OPTCG_BASE_URL = 'https://optcgapi.com/api';
const CARD_ID_REGEX = /^[A-Z0-9]{2,5}-[0-9]{3}(?:[A-Z0-9_-]*)?$/i;
const MAX_RESULTS = 40;

type RawOptcgCard = {
  card_name?: string;
  card_text?: string | null;
  set_name?: string;
  set_id?: string;
  rarity?: string;
  card_set_id?: string;
  card_color?: string | null;
  card_type?: string;
  attribute?: string | null;
  sub_types?: string | null;
  card_cost?: string | number | null;
  card_power?: string | number | null;
  card_image_id?: string;
  card_image?: string;
  inventory_price?: number | null;
  market_price?: number | null;
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
  sourceGame: 'ONE_PIECE';
};

function normalizeNumber(value?: string | number | null): number | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'number') {
    return Number.isNaN(value) ? undefined : value;
  }
  if (typeof value === 'string') {
    if (value.toUpperCase() === 'NULL' || value.trim() === '') {
      return undefined;
    }
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

function buildOracleText(card: RawOptcgCard): string | undefined {
  const segments: string[] = [];
  if (card.card_text && card.card_text !== 'NULL') {
    segments.push(card.card_text);
  }
  if (card.attribute && card.attribute !== 'NULL') {
    segments.push(`Attribute: ${card.attribute}`);
  }
  if (card.sub_types && card.sub_types !== 'NULL') {
    segments.push(`Traits: ${card.sub_types}`);
  }
  if (card.card_power && card.card_power !== 'NULL') {
    segments.push(`Power: ${card.card_power}`);
  }
  if (card.card_cost && card.card_cost !== 'NULL') {
    segments.push(`Cost: ${card.card_cost}`);
  }
  if (card.card_type && card.card_type !== 'NULL') {
    segments.push(`Type: ${card.card_type}`);
  }
  return segments.length ? segments.join('\n') : undefined;

}

function mapOptcgCard(card: RawOptcgCard): CardSearchResult | null {
  const rawId = card.card_image_id || card.card_set_id || card.card_name || '';
  if (!rawId) {
    return null;
  }
  const uniqueId = `optcg-${rawId}`;
  const collectorNumber = card.card_image_id || card.card_set_id || 'UNKNOWN';
  const setCode = card.set_id?.replace(/[^A-Z0-9-]/gi, '') || 'OP';
  const imageUrl = card.card_image || '';
  return {
    scryfallId: uniqueId,
    name: card.card_name || 'Unknown Card',
    setName: card.set_name || card.set_id || 'One Piece Card Game',
    setCode,
    collectorNumber,
    rarity: card.rarity || 'Unknown',
    imageUrlGatherer: imageUrl,
    imageUrlScryfall: imageUrl,
    colors:
      card.card_color && card.card_color !== 'NULL'
        ? [card.card_color]
        : [],
    cmc: normalizeNumber(card.card_cost),
    type: card.card_type
      ? card.attribute && card.attribute !== 'NULL'
        ? `${card.card_type} (${card.attribute})`
        : card.card_type
      : 'Card',
    oracleText: buildOracleText(card),
    sourceGame: 'ONE_PIECE',
  };
}

async function fetchJson(url: string) {
  const response = await fetch(url, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`OPTCG API request failed (${response.status})`);
  }
  return response.json();
}

async function searchByCardId(cardId: string): Promise<RawOptcgCard[]> {
  try {
    const data = await fetchJson(
      `${OPTCG_BASE_URL}/sets/card/${encodeURIComponent(cardId)}/`
    );
    if (Array.isArray(data)) {
      return data;
    }
    return data ? [data] : [];
  } catch (error) {
    console.warn('[OPTCG] CardID lookup failed:', error);
    return [];
  }
}

async function searchByName(query: string): Promise<RawOptcgCard[]> {
  try {
    const data = await fetchJson(
      `${OPTCG_BASE_URL}/sets/filtered/?card_name=${encodeURIComponent(query)}`
    );
    if (Array.isArray(data)) {
      return data;
    }
    if (data && Array.isArray(data.results)) {
      return data.results;
    }
    return [];
  } catch (error) {
    console.warn('[OPTCG] Name search failed:', error);
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query')?.trim();

  if (!query) {
    return NextResponse.json(
      { error: 'Missing query parameter' },
      { status: 400 }
    );
  }

  const normalized = query.toUpperCase();
  const looksLikeCardId = CARD_ID_REGEX.test(normalized);

  const rawResults: RawOptcgCard[] = [];

  if (looksLikeCardId) {
    const cards = await searchByCardId(normalized);
    rawResults.push(...cards);
  }

  if (!rawResults.length) {
    const cards = await searchByName(query);
    rawResults.push(...cards);
  }

  const mapped = rawResults
    .map((card) => mapOptcgCard(card))
    .filter((card): card is CardSearchResult => Boolean(card && card.imageUrlGatherer));

  const deduped = Array.from(
    new Map(mapped.map((card) => [card.scryfallId, card])).values()
  ).slice(0, MAX_RESULTS);

  return NextResponse.json({ cards: deduped });
}

