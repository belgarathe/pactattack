'use server';

import { randomUUID } from 'crypto';
import type { CardGame } from '@/types';

type ApiTcgGame =
  | 'one-piece'
  | 'magic';

export type ApiTcgImageSource = {
  provider: string;
  url: string;
  kind: 'artwork' | 'scan' | 'render' | 'unknown';
};

export type ApiTcgCard = {
  id: string;
  name: string;
  setName: string;
  setCode: string;
  collectorNumber: string;
  rarity: string;
  type: string;
  oracleText?: string;
  colors: string[];
  imageSources: ApiTcgImageSource[];
  sourceGame: CardGame;
  dataProvider: string;
};

type ApiTcgMedia =
  | string
  | {
      url?: string;
      provider?: string;
      data?:
        | {
            id?: number | string;
            attributes?: {
              url?: string;
              name?: string;
              provider?: string;
              alternativeText?: string | null;
            };
          }
        | Array<{
            id?: number | string;
            attributes?: {
              url?: string;
              name?: string;
              provider?: string;
              alternativeText?: string | null;
            };
          }>;
    };

type ApiTcgRecord = {
  id?: number | string;
  attributes?: Record<string, unknown>;
};

type ApiTcgResponse = {
  data?: ApiTcgRecord[] | ApiTcgRecord;
};

const API_TCG_BASES = [
  process.env.API_TCG_BASE_URL?.replace(/\/+$/, '') || 'https://apitcg.com/api',
  'http://apitcg.com/api',
];

const IMAGE_KEYS = [
  'image',
  'imageFront',
  'imageBack',
  'cardFront',
  'cardBack',
  'cardImage',
  'card',
  'art',
  'artFront',
  'artBack',
  'banner',
  'thumbnail',
];

function toAbsoluteUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `https://apitcg.com${url}`;
}

function ensureArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function extractMediaUrls(
  value: ApiTcgMedia | ApiTcgMedia[] | null | undefined,
  fallbackLabel: string
): ApiTcgImageSource[] {
  if (!value) return [];
  const mediaList = ensureArray(value);
  const sources: ApiTcgImageSource[] = [];
  for (const media of mediaList) {
    if (!media) continue;
    if (typeof media === 'string') {
      const absolute = toAbsoluteUrl(media);
      if (absolute) {
        sources.push({
          provider: fallbackLabel,
          url: absolute,
          kind: 'artwork',
        });
      }
      continue;
    }

    if (typeof media === 'object') {
      if (media.url) {
        const absolute = toAbsoluteUrl(media.url);
        if (absolute) {
          sources.push({
            provider: media.provider || fallbackLabel,
            url: absolute,
            kind: 'artwork',
          });
        }
      }

      if (media.data) {
        const nested = ensureArray(media.data);
        for (const entry of nested) {
          if (!entry) continue;
          const attributes = (entry as any).attributes ?? {};
          const absolute = toAbsoluteUrl(attributes.url);
          if (absolute) {
            sources.push({
              provider: attributes.provider || fallbackLabel,
              url: absolute,
              kind: 'artwork',
            });
          }
        }
      }
    }
  }
  return sources;
}

function sanitizeString(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }
  if (typeof value === 'number') return value.toString();
  return undefined;
}

function buildTypeLine(attributes: Record<string, unknown> | undefined): string {
  if (!attributes) return 'Card';
  const parts: string[] = [];
  const type = sanitizeString(attributes.type ?? attributes.cardType ?? attributes.category);
  if (type) parts.push(type);
  const subtype = sanitizeString(attributes.subtype ?? attributes.subType ?? attributes.trait);
  if (subtype) parts.push(`— ${subtype}`);
  return parts.length ? parts.join(' ') : 'Card';
}

function buildOracleText(attributes: Record<string, unknown> | undefined): string | undefined {
  if (!attributes) return undefined;
  const candidates = [
    attributes.effect,
    attributes.description,
    attributes.text,
    attributes.ability,
    attributes.flavorText,
  ];
  const lines = candidates
    .map((entry) => sanitizeString(entry))
    .filter((entry): entry is string => Boolean(entry));
  return lines.length ? lines.join('\n') : undefined;
}

function extractColors(attributes: Record<string, unknown> | undefined): string[] {
  if (!attributes) return [];
  const colors: string[] = [];
  const colorValue = attributes.color ?? attributes.colors ?? attributes.attribute ?? attributes.element;
  if (Array.isArray(colorValue)) {
    for (const value of colorValue) {
      const sanitized = sanitizeString(value);
      if (sanitized) colors.push(sanitized);
    }
    return colors;
  }
  const sanitized = sanitizeString(colorValue);
  return sanitized ? [sanitized] : [];
}

function getFirstAvailable<T>(attributes: Record<string, unknown> | undefined, keys: string[], fallback?: T): T | undefined {
  if (!attributes) return fallback;
  for (const key of keys) {
    if (attributes[key] !== undefined && attributes[key] !== null) {
      return attributes[key] as T;
    }
  }
  return fallback;
}

function collectImageSources(attributes: Record<string, unknown> | undefined): ApiTcgImageSource[] {
  if (!attributes) return [];
  const sources: ImageSourceOption[] = [];
  for (const key of IMAGE_KEYS) {
    const media = attributes[key] as ApiTcgMedia | ApiTcgMedia[] | undefined;
    if (!media) continue;
    const label = `API TCG ${key}`;
    sources.push(...extractMediaUrls(media, label));
  }
  if (sources.length) {
    // Deduplicate by URL
    const seen = new Set<string>();
    return sources.filter((source) => {
      if (seen.has(source.url)) return false;
      seen.add(source.url);
      return true;
    });
  }
  return sources;
}

function mapRecordToCard(game: ApiTcgGame, record: ApiTcgRecord): ApiTcgCard | null {
  if (!record) return null;
  const attributes = (record.attributes ?? {}) as Record<string, unknown>;
  const id = sanitizeString(record.id) || sanitizeString(attributes.id) || randomUUID();
  const name =
    sanitizeString(attributes.name ?? attributes.cardName ?? attributes.title) || 'Unknown Card';
  const setName =
    sanitizeString(
      attributes.setName ??
        (attributes.set as any)?.data?.attributes?.name ??
        (attributes.collection as any)?.data?.attributes?.name ??
        attributes.collection ??
        attributes.set,
    ) || (game === 'magic' ? 'Magic: The Gathering' : 'One Piece Card Game');
  const setCode =
    sanitizeString(
      attributes.setCode ??
        (attributes.set as any)?.data?.attributes?.code ??
        attributes.code ??
        attributes.set_id,
    ) || (game === 'magic' ? 'MAG' : 'OP');
  const collectorNumber =
    sanitizeString(
      attributes.collectorNumber ??
        attributes.number ??
        attributes.cardNumber ??
        attributes.code ??
        attributes.id,
    ) || id;
  const rarity =
    sanitizeString(attributes.rarity ?? attributes.cardRarity ?? attributes.grade) || 'Unknown';
  const imageSources = collectImageSources(attributes);

  const primaryImage =
    imageSources[0]?.url ||
    sanitizeString(attributes.imageUrl ?? (attributes.image as any)?.url) ||
    '';

  const typeLine = buildTypeLine(attributes);
  const oracleText = buildOracleText(attributes);
  const colors = extractColors(attributes);

  const sourceGame: CardGame = game === 'magic' ? 'MAGIC_THE_GATHERING' : 'ONE_PIECE';

  return {
    id: `apitcg-${game}-${id}`,
    name,
    setName,
    setCode: setCode.toUpperCase(),
    collectorNumber,
    rarity,
    type: typeLine,
    oracleText,
    colors,
    imageSources: primaryImage
      ? [{ provider: 'API TCG Primary', url: primaryImage, kind: 'artwork' }, ...imageSources.slice(1)]
      : imageSources,
    sourceGame,
    dataProvider: `API TCG (${game === 'magic' ? 'Magic' : 'One Piece'})`,
  };
}

function buildSearchProperty(query: string, game: ApiTcgGame): string {
  const trimmed = query.trim();
  if (game === 'one-piece') {
    if (/^[A-Z]{2,5}-\d{3}[A-Z0-9-]*$/i.test(trimmed)) {
      return 'code';
    }
  }
  if (game === 'magic') {
    if (/^[A-Z]{2,5}\d{2,4}$/i.test(trimmed.replace(/\s+/g, ''))) {
      return 'collectorNumber';
    }
  }
  return 'name';
}

export async function searchApiTcgCards(game: ApiTcgGame, query: string): Promise<ApiTcgCard[]> {
  const property = buildSearchProperty(query, game);
  const params = new URLSearchParams({
    property,
    value: query.trim(),
    populate: 'deep',
  });

  let lastError: unknown;

  for (const base of API_TCG_BASES) {
    const url = `${base}/${game}/card?${params.toString()}`;
    try {
      const response = await fetch(url, {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        lastError = new Error(`API TCG request failed (${response.status})`);
        continue;
      }
      const json = (await response.json()) as ApiTcgResponse;
      const records = ensureArray(json.data).filter(Boolean) as ApiTcgRecord[];
      return records
        .map((record) => mapRecordToCard(game, record))
        .filter((card): card is ApiTcgCard => Boolean(card));
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    console.warn('[API TCG] Failed to fetch cards', lastError);
  }
  return [];
}


