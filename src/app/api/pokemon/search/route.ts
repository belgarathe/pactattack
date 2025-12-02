'use server';

import { NextResponse } from 'next/server';

type PokemonTcgCard = {
  id: string;
  name: string;
  number?: string;
  rarity?: string;
  supertype?: string;
  subtypes?: string[];
  types?: string[];
  convertedEnergyCost?: number;
  attacks?: Array<{
    name: string;
    text?: string;
    damage?: string;
    cost?: string[];
  }>;
  abilities?: Array<{
    name: string;
    text?: string;
    type?: string;
  }>;
  rules?: string[];
  flavorText?: string;
  images?: {
    large?: string;
    small?: string;
  };
  set?: {
    id?: string;
    name?: string;
    series?: string;
  };
};

type TcgDexCard = {
  id: string;
  name: string;
  localId?: string;
  image?: string;
  rarity?: string;
  set?: {
    id?: string;
    name?: string;
    logo?: string;
    symbol?: string;
  };
  category?: string;
  stage?: string;
  dexId?: number[];
  hp?: number;
  types?: string[];
  attacks?: Array<{
    name?: string;
    effect?: string;
    damage?: number | string;
    cost?: string[];
  }>;
  abilities?: Array<{
    name?: string;
    effect?: string;
    type?: string;
  }>;
  weaknesses?: Array<{ type?: string; value?: string }>;
  resistances?: Array<{ type?: string; value?: string }>;
  retreat?: number;
  effect?: string;
};

type ImageSource = {
  provider: string;
  url: string;
  kind?: 'artwork' | 'scan' | 'render' | 'unknown';
};

type CardSearchResult = {
  scryfallId: string;
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
  sourceGame: 'POKEMON';
  imageSources?: ImageSource[];
  dataProvider?: string;
};

const API_URL =
  process.env.POKEMON_TCG_API_URL ?? 'https://api.pokemontcg.io/v2/cards';
const API_KEY =
  process.env.POKEMON_TCG_API_KEY ??
  '1b06746a-3380-4d80-9a1a-3efa136a4acd';
const TCGDEX_BASE_URL = 'https://api.tcgdex.net/v2/en';
const PRIMARY_TIMEOUT_MS = Number(process.env.POKEMON_TCG_TIMEOUT_MS ?? 9000);
const FALLBACK_TIMEOUT_MS = Number(process.env.TCGDEX_TIMEOUT_MS ?? 6000);
const MAX_RESULTS = 20;

function createOracleTextFromPokemon(card: PokemonTcgCard) {
  const segments: string[] = [];
  if (card.flavorText) segments.push(card.flavorText);
  if (card.rules?.length) segments.push(...card.rules);
  if (card.abilities?.length) {
    for (const ability of card.abilities) {
      segments.push(
        `[Ability] ${ability.name}${
          ability.type ? ` (${ability.type})` : ''
        }: ${ability.text ?? ''}`.trim()
      );
    }
  }
  if (card.attacks?.length) {
    for (const attack of card.attacks) {
      segments.push(
        `[Attack] ${attack.name}${
          attack.cost?.length ? ` [${attack.cost.join(', ')}]` : ''
        }: ${attack.text ?? ''} ${
          attack.damage ? `Damage: ${attack.damage}` : ''
        }`.trim()
      );
    }
  }
  return segments.length ? segments.join('\n') : undefined;
}

function createOracleTextFromTcgDex(card: TcgDexCard) {
  const segments: string[] = [];
  if (card.effect) segments.push(card.effect);

  if (card.abilities?.length) {
    for (const ability of card.abilities) {
      segments.push(
        `[Ability] ${ability.name ?? 'Ability'}: ${ability.effect ?? ''}`.trim()
      );
    }
  }

  if (card.attacks?.length) {
    for (const attack of card.attacks) {
      const damage =
        typeof attack.damage === 'number'
          ? attack.damage
          : attack.damage?.toString();
      segments.push(
        `[Attack] ${attack.name ?? 'Attack'}${
          attack.cost?.length ? ` [${attack.cost.join(', ')}]` : ''
        }: ${attack.effect ?? ''} ${
          damage && damage !== '0' ? `Damage: ${damage}` : ''
        }`.trim()
      );
    }
  }

  if (card.weaknesses?.length) {
    segments.push(
      `Weaknesses: ${card.weaknesses
        .map((weakness) => `${weakness.type}${weakness.value ? ` (${weakness.value})` : ''}`)
        .join(', ')}`
    );
  }

  if (card.resistances?.length) {
    segments.push(
      `Resistances: ${card.resistances
        .map((resistance) => `${resistance.type}${resistance.value ? ` (${resistance.value})` : ''}`)
        .join(', ')}`
    );
  }

  if (typeof card.retreat === 'number') {
    segments.push(`Retreat Cost: ${card.retreat}`);
  }

  return segments.length ? segments.join('\n') : undefined;
}

function buildPokemonCard(card: PokemonTcgCard): CardSearchResult | null {
  if (!card.id || !card.name) {
    return null;
  }

  const large = card.images?.large;
  const small = card.images?.small;
  const image = large || small || '';
  if (!image) {
    return null;
  }

  const imageSources: ImageSource[] = [];
  if (large) {
    imageSources.push({
      provider: 'Pokémon TCG API (large)',
      url: large,
      kind: 'artwork',
    });
  }
  if (small) {
    imageSources.push({
      provider: 'Pokémon TCG API (small)',
      url: small,
      kind: 'artwork',
    });
  }

  const collectorNumber = card.number || card.id;
  const setCode =
    card.set?.id || card.set?.series?.replace(/\s+/g, '-').toUpperCase() || 'POKEMON-TCG';
  const setName = card.set?.name || 'Pokémon TCG';

  return {
    scryfallId: `pokemon-${card.id}`,
    name: card.name,
    setName,
    setCode,
    collectorNumber,
    rarity: card.rarity || 'Unknown',
    imageUrlGatherer: image,
    imageUrlScryfall: image,
    colors: card.types ?? [],
    cmc:
      typeof card.convertedEnergyCost === 'number'
        ? card.convertedEnergyCost
        : undefined,
    type: card.supertype
      ? `${card.supertype}${card.subtypes?.length ? ` — ${card.subtypes.join(', ')}` : ''}`
      : 'Pokémon Card',
    oracleText: createOracleTextFromPokemon(card),
    sourceGame: 'POKEMON',
    imageSources,
    dataProvider: 'Pokémon TCG API',
  };
}

function buildTcgDexCard(card: TcgDexCard): CardSearchResult | null {
  if (!card?.id || !card.name) {
    return null;
  }
  const image =
    card.image || card.set?.logo || card.set?.symbol || '';
  if (!image) {
    return null;
  }

  const setCode = card.set?.id?.toUpperCase() ?? 'POKEMON';
  const collectorNumber = card.localId ?? card.id;

  const imageSources: ImageSource[] = [
    {
      provider: 'TCGDex',
      url: image,
      kind: 'artwork',
    },
  ];

  return {
    scryfallId: `tcgdex-${card.id}`,
    name: card.name,
    setName: card.set?.name ?? 'Pokémon TCG',
    setCode,
    collectorNumber,
    rarity: card.rarity || 'Unknown',
    imageUrlGatherer: image,
    imageUrlScryfall: image,
    colors: card.types ?? [],
    cmc: undefined,
    type: card.category
      ? `${card.category}${card.stage ? ` — ${card.stage}` : ''}`
      : card.stage ?? 'Pokémon Card',
    oracleText: createOracleTextFromTcgDex(card),
    sourceGame: 'POKEMON',
    imageSources,
    dataProvider: 'TCGDex',
  };
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function searchPokemonTcgIo(query: string) {
  const tcgQuery = encodeURIComponent(`name:"${query}*"`);
  const url = `${API_URL}?q=${tcgQuery}&orderBy=-set.releaseDate&pageSize=${MAX_RESULTS}`;
  try {
    const response = await fetchWithTimeout(
      url,
      {
        headers: {
          Accept: 'application/json',
          'X-Api-Key': API_KEY,
        },
        cache: 'no-store',
      },
      PRIMARY_TIMEOUT_MS
    );

    if (!response.ok) {
      const details = await response.text();
      console.warn('Pokémon TCG API error:', details);
      return [];
    }

    const json = await response.json();
    const data: PokemonTcgCard[] = Array.isArray(json.data) ? json.data : [];
    return data
      .map((card) => buildPokemonCard(card))
      .filter((card): card is CardSearchResult => Boolean(card));
  } catch (error) {
    console.warn('Pokémon TCG API request failed:', error);
    return [];
  }
}

async function searchTcgDex(query: string) {
  try {
    const searchUrl = `${TCGDEX_BASE_URL}/cards?name=${encodeURIComponent(query)}`;
    const response = await fetchWithTimeout(
      searchUrl,
      {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      },
      FALLBACK_TIMEOUT_MS
    );

    if (!response.ok) {
      const details = await response.text();
      console.warn('[TCGDex] search failed:', details);
      return [];
    }

    const json = await response.json();
    const entries: Array<{ id?: string }> = Array.isArray(json?.value)
      ? json.value
      : Array.isArray(json)
      ? json
      : [];

    const ids = entries
      .map((entry) => entry.id)
      .filter((id): id is string => Boolean(id))
      .slice(0, MAX_RESULTS);

    if (!ids.length) {
      return [];
    }

    const detailPromises = ids.map(async (id) => {
      try {
        const detailResponse = await fetchWithTimeout(
          `${TCGDEX_BASE_URL}/cards/${encodeURIComponent(id)}`,
          {
            headers: { Accept: 'application/json' },
            cache: 'no-store',
          },
          FALLBACK_TIMEOUT_MS
        );
        if (!detailResponse.ok) {
          return null;
        }
        const detail = (await detailResponse.json()) as TcgDexCard;
        return buildTcgDexCard(detail);
      } catch (error) {
        console.warn(`[TCGDex] detail fetch failed for ${id}:`, error);
        return null;
      }
    });

    const detailResults = await Promise.all(detailPromises);
    return detailResults.filter(
      (card): card is CardSearchResult => Boolean(card)
    );
  } catch (error) {
    console.warn('[TCGDex] search error:', error);
    return [];
  }
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

    const primaryCards = await searchPokemonTcgIo(query);
    if (primaryCards.length) {
      return NextResponse.json({
        cards: primaryCards,
        provider: 'Pokémon TCG API',
      });
    }

    const fallbackCards = await searchTcgDex(query);
    if (fallbackCards.length) {
      return NextResponse.json({
        cards: fallbackCards,
        provider: 'TCGDex',
        fallbackUsed: true,
      });
    }

    return NextResponse.json({
      cards: [],
      message: 'No Pokémon found matching query',
      fallbackUsed: true,
    });
  } catch (error) {
    console.error('Pokémon search error:', error);
    return NextResponse.json(
      { error: 'Failed to search Pokémon cards' },
      { status: 500 }
    );
  }
}


