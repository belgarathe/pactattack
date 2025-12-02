import axios from 'axios';

const SCRYFALL_API = 'https://api.scryfall.com';

export interface ScryfallCard {
  id: string;
  name: string;
  set: string;
  set_name: string;
  collector_number: string;
  rarity: string;
  image_uris?: {
    normal?: string;
    large?: string;
  };
  multiverse_ids?: number[];
  colors: string[];
  cmc: number;
  type_line: string;
  oracle_text?: string;
}

export async function searchScryfallCards(query: string): Promise<ScryfallCard[]> {
  try {
    const response = await axios.get(`${SCRYFALL_API}/cards/search`, {
      params: { q: query },
    });
    return response.data.data || [];
  } catch (error) {
    console.error('Scryfall search error:', error);
    return [];
  }
}

export async function getCardByName(name: string, set?: string): Promise<ScryfallCard | null> {
  try {
    const params: Record<string, string> = { exact: name };
    if (set) params.set = set;
    const response = await axios.get(`${SCRYFALL_API}/cards/named`, { params });
    return response.data;
  } catch (error) {
    console.error('Scryfall card fetch error:', error);
    return null;
  }
}

export function getGathererImageUrl(multiverseId: number): string {
  return `https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=${multiverseId}&type=card`;
}

export interface ScryfallSet {
  id: string;
  code: string;
  name: string;
  set_type: string;
  released_at?: string;
  block_code?: string;
  block?: string;
  parent_set_code?: string;
  card_count: number;
  digital: boolean;
  foil_only: boolean;
  nonfoil_only: boolean;
  scryfall_uri: string;
  uri: string;
  icon_svg_uri?: string;
  search_uri: string;
}

export async function getAllSets(): Promise<ScryfallSet[]> {
  try {
    const response = await axios.get(`${SCRYFALL_API}/sets`);
    return response.data.data || [];
  } catch (error) {
    console.error('Scryfall sets fetch error:', error);
    return [];
  }
}

export async function getSetByCode(setCode: string): Promise<ScryfallSet | null> {
  try {
    const response = await axios.get(`${SCRYFALL_API}/sets/${setCode.toLowerCase()}`);
    return response.data;
  } catch (error) {
    console.error('Scryfall set fetch error:', error);
    return null;
  }
}

export async function searchSets(query: string): Promise<ScryfallSet[]> {
  try {
    const allSets = await getAllSets();
    const searchLower = query.toLowerCase();
    
    return allSets.filter(
      (set) =>
        set.name.toLowerCase().includes(searchLower) ||
        set.code.toLowerCase().includes(searchLower) ||
        (set.block && set.block.toLowerCase().includes(searchLower))
    );
  } catch (error) {
    console.error('Scryfall set search error:', error);
    return [];
  }
}

