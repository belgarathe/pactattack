'use server';

import { NextResponse } from 'next/server';
import { searchScryfallCards } from '@/lib/scryfall';

interface ScryfallCard {
  id: string;
  multiverse_ids?: number[];
  name: string;
  set_name: string;
  set: string;
  collector_number: string;
  rarity: string;
  image_uris?: {
    small?: string;
    normal?: string;
    large?: string;
  };
  colors?: string[];
  cmc?: number;
  type_line?: string;
  oracle_text?: string;
  prices?: {
    eur?: string | null;
  };
}

interface MtgIoCard {
  id: string;
  name: string;
  imageUrl?: string;
  imageUrlHiRes?: string;
  multiverseid?: number;
  set?: string;
  setName?: string;
  rarity?: string;
  colors?: string[];
  cmc?: number;
  type?: string;
  text?: string;
  number?: string;
}

type ImageSource = {
  provider: string;
  url: string;
  kind: 'artwork' | 'scan' | 'render' | 'unknown';
};

type CardResult = {
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
  priceAvg?: number | null;
  sourceGame: 'MAGIC_THE_GATHERING';
  imageSources: ImageSource[];
  dataProvider: string;
};

const MTG_IO_ENDPOINT = 'https://api.magicthegathering.io/v1/cards';
const MAX_RESULTS = 25;

function dedupeImageSources(sources: ImageSource[]): ImageSource[] {
  const seen = new Set<string>();
  return sources.filter((source) => {
    if (!source.url) return false;
    if (seen.has(source.url)) return false;
    seen.add(source.url);
    return true;
  });
}

function mapScryfallCard(card: ScryfallCard): CardResult {
  const gathererUrl = card.multiverse_ids?.[0]
    ? `https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=${card.multiverse_ids[0]}&type=card`
    : undefined;
  const imageSources = dedupeImageSources(
    [
      gathererUrl ? { provider: 'Gatherer', url: gathererUrl, kind: 'scan' as const } : null,
      card.image_uris?.normal
        ? { provider: 'Scryfall (normal)', url: card.image_uris.normal, kind: 'scan' as const }
        : null,
      card.image_uris?.large
        ? { provider: 'Scryfall (large)', url: card.image_uris.large, kind: 'scan' as const }
        : null,
    ].filter(Boolean) as ImageSource[],
  );
  const primaryImage = imageSources[0]?.url || gathererUrl || card.image_uris?.normal || '';

  return {
    scryfallId: card.id,
    multiverseId: card.multiverse_ids?.[0]?.toString(),
    name: card.name,
    setName: card.set_name,
    setCode: card.set,
    collectorNumber: card.collector_number,
    rarity: card.rarity,
    imageUrlGatherer: primaryImage,
    imageUrlScryfall: primaryImage,
    colors: card.colors || [],
    cmc: card.cmc || 0,
    type: card.type_line || '',
    oracleText: card.oracle_text || '',
    priceAvg: card.prices?.eur ? Number(card.prices.eur) : null,
    sourceGame: 'MAGIC_THE_GATHERING',
    imageSources,
    dataProvider: 'Scryfall',
  };
}

function mapMtgIoCard(card: MtgIoCard): CardResult {
  const gathererUrl = card.multiverseid
    ? `https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=${card.multiverseid}&type=card`
    : undefined;
  const imageSources = dedupeImageSources(
    [
      card.imageUrlHiRes
        ? { provider: 'MTG.io (hi-res)', url: card.imageUrlHiRes, kind: 'scan' as const }
        : null,
      card.imageUrl
        ? { provider: 'MTG.io', url: card.imageUrl, kind: 'scan' as const }
        : null,
      gathererUrl ? { provider: 'Gatherer', url: gathererUrl, kind: 'scan' as const } : null,
    ].filter(Boolean) as ImageSource[],
  );
  const primaryImage = imageSources[0]?.url || gathererUrl || card.imageUrl || '';

  return {
    scryfallId: `mtgio-${card.id}`,
    multiverseId: card.multiverseid ? String(card.multiverseid) : undefined,
    name: card.name,
    setName: card.setName || card.set || 'Magic: The Gathering',
    setCode: card.set || 'UNKNOWN',
    collectorNumber: card.number || card.id,
    rarity: card.rarity || 'Unknown',
    imageUrlGatherer: primaryImage,
    imageUrlScryfall: primaryImage,
    colors: card.colors || [],
    cmc: card.cmc || 0,
    type: card.type || '',
    oracleText: card.text || '',
    priceAvg: null,
    sourceGame: 'MAGIC_THE_GATHERING',
    imageSources,
    dataProvider: 'MagicTheGathering.io',
  };
}

async function fetchMtgIoCards(query: string): Promise<CardResult[]> {
  try {
    const response = await fetch(
      `${MTG_IO_ENDPOINT}?name=${encodeURIComponent(query)}&pageSize=${MAX_RESULTS}`,
      { cache: 'no-store' }
    );
    if (!response.ok) {
      console.error('MTG.io API error:', response.status, response.statusText);
      return [];
    }
    const json = await response.json();
    const cards: MtgIoCard[] = Array.isArray(json.cards) ? json.cards : [];
    return cards.map(mapMtgIoCard);
  } catch (error) {
    console.error('MTG.io fetch error:', error);
    return [];
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('q') ?? searchParams.get('query'))?.trim();

    if (!query) {
      return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 });
    }

    const [scryfallCards, mtgIoCards] = await Promise.all([
      searchScryfallCards(query),
      fetchMtgIoCards(query),
    ]);

    const mergedCards = [
      ...scryfallCards.map(mapScryfallCard),
      ...mtgIoCards,
    ];

    const uniqueCards = mergedCards.reduce<CardResult[]>((acc, card) => {
      if (!acc.find((existing) => existing.scryfallId === card.scryfallId)) {
        acc.push(card);
      }
      return acc;
    }, []);

    return NextResponse.json({
      cards: uniqueCards.slice(0, MAX_RESULTS),
    });
  } catch (error) {
    console.error('MTG aggregated search error:', error);
    return NextResponse.json({ error: 'Failed to search MTG cards' }, { status: 500 });
  }
}

