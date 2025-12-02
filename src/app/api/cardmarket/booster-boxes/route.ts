import { NextResponse } from 'next/server';
import axios from 'axios';
import { searchSets, getAllSets } from '@/lib/scryfall';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type BoosterBox = {
  id: string;
  name: string;
  setName: string;
  setCode: string;
  imageUrl: string;
  priceLow?: number;
  priceAvg?: number;
  priceHigh?: number;
  url: string;
  releasedAt?: string;
};

type MtgIoSet = {
  code: string;
  name: string;
  type: string;
  releaseDate?: string;
  block?: string;
};

const MTG_IO_SETS_ENDPOINT = 'https://api.magicthegathering.io/v1/sets';

function isEligibleBoosterSet(
  set: { digital?: boolean; foil_only?: boolean; set_type?: string; card_count?: number }
): boolean {
  return (
    !set.digital &&
    !set.foil_only &&
    set.set_type !== 'token' &&
    set.set_type !== 'memorabilia' &&
    set.set_type !== 'promo' &&
    (set.card_count === undefined || set.card_count > 50)
  );
}

// Fetch booster boxes from Scryfall API
async function fetchScryfallBoosterBoxes(search?: string): Promise<BoosterBox[]> {
  try {
    let sets;
    
    if (search && search.length >= 2) {
      sets = await searchSets(search);
    } else {
      sets = await getAllSets();
    }

    // Filter sets that are booster sets (not promos, tokens, etc.)
    const boosterSets = sets.filter((set) => isEligibleBoosterSet(set));

    // Transform to booster box format
    const boosterBoxes: BoosterBox[] = boosterSets.map((set) => ({
      id: set.id,
      name: `${set.name} Booster Box`,
      setName: set.name,
      setCode: set.code.toUpperCase(),
      imageUrl: set.icon_svg_uri || `https://svgs.scryfall.io/sets/${set.code.toLowerCase()}.svg`,
      url: set.scryfall_uri,
      releasedAt: set.released_at,
    }));

    return boosterBoxes.slice(0, 100); // Limit to 100 results
  } catch (error) {
    console.error('Error fetching Scryfall sets:', error);
    return [];
  }
}

async function fetchMtgIoBoosterBoxes(search?: string): Promise<BoosterBox[]> {
  try {
    const params = new URLSearchParams({ pageSize: '100' });
    if (search && search.trim().length >= 2) {
      params.set('name', search.trim());
    }

    const response = await fetch(`${MTG_IO_SETS_ENDPOINT}?${params.toString()}`, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('MTG.io sets error:', response.status, response.statusText);
      return [];
    }

    const json = await response.json();
    const sets: MtgIoSet[] = Array.isArray(json.sets) ? json.sets : [];

    const filtered = sets.filter(
      (set) =>
        set.type !== 'promo' &&
        set.type !== 'funny' &&
        set.type !== 'memorabilia' &&
        set.type !== 'masterpiece' &&
        set.name &&
        set.code
    );

    return filtered.map((set) => ({
      id: `mtgio-${set.code}`,
      name: `${set.name} Booster Box`,
      setName: set.name,
      setCode: set.code.toUpperCase(),
      imageUrl: `https://svgs.scryfall.io/sets/${set.code.toLowerCase()}.svg`,
      url: `https://api.magicthegathering.io/v1/sets/${set.code.toLowerCase()}`,
      releasedAt: set.releaseDate,
    }));
  } catch (error) {
    console.error('Error fetching MTG.io sets:', error);
    return [];
  }
}

function mergeBoosterBoxes(primary: BoosterBox[], secondary: BoosterBox[]): BoosterBox[] {
  const seen = new Set<string>();
  const merged: BoosterBox[] = [];

  for (const box of [...primary, ...secondary]) {
    const key = (box.setCode || box.name).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(box);
  }

  return merged;
}

// Scrape Cardmarket booster boxes page (fallback)
async function fetchCardmarketBoosterBoxes(): Promise<BoosterBox[]> {
  try {
    const response = await axios.get('https://www.cardmarket.com/en/Magic/Products/Booster-Boxes', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 10000,
    });

    const html = response.data;
    const boosterBoxes: CardmarketBoosterBox[] = [];

    // Parse HTML to extract booster box data
    // Cardmarket uses specific HTML structure - we'll need to parse it
    // Using regex to find product links and names
    const productRegex = /<a[^>]*href="([^"]*\/Products\/Booster-Boxes\/[^"]*)"[^>]*>[\s\S]*?<span[^>]*class="[^"]*product-name[^"]*"[^>]*>([^<]+)<\/span>/gi;
    const imageRegex = /<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi;
    
    let match;
    const seenIds = new Set<string>();

    // Extract product links
    while ((match = productRegex.exec(html)) !== null) {
      const url = match[1];
      const name = match[2].trim();
      
      // Extract product ID from URL
      const idMatch = url.match(/\/(\d+)$/);
      if (!idMatch || seenIds.has(idMatch[1])) continue;
      
      const id = idMatch[1];
      seenIds.add(id);

      // Extract set name and code from name
      const setNameMatch = name.match(/^(.+?)\s+(?:Booster Box|BB)/i);
      const setName = setNameMatch ? setNameMatch[1].trim() : name;
      
      // Try to extract set code (usually 3-4 letters)
      const setCodeMatch = name.match(/\b([A-Z]{2,4})\b/);
      const setCode = setCodeMatch ? setCodeMatch[1] : '';

      // Try to find image URL
      const imageMatch = html.match(new RegExp(`href="${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[\\s\\S]*?<img[^>]*src="([^"]*)"`, 'i'));
      const imageUrl = imageMatch ? imageMatch[1] : '';

      boosterBoxes.push({
        id,
        name: name.replace(/\s*Booster Box\s*/i, '').trim(),
        setName,
        setCode,
        imageUrl: imageUrl.startsWith('http') ? imageUrl : `https://www.cardmarket.com${imageUrl}`,
        url: url.startsWith('http') ? url : `https://www.cardmarket.com${url}`,
      } as BoosterBox);
    }

    // If regex parsing doesn't work well, try alternative approach
    if (boosterBoxes.length === 0) {
      // Fallback: Use a more general approach
      const fallbackRegex = /<a[^>]*href="(\/en\/Magic\/Products\/Booster-Boxes\/[^"]*)"[^>]*>[\s\S]{0,500}?([A-Z][^<]{10,50}Booster Box[^<]{0,50})/gi;
      while ((match = fallbackRegex.exec(html)) !== null && boosterBoxes.length < 100) {
        const url = match[1];
        const fullName = match[2].trim();
        
        const idMatch = url.match(/\/(\d+)$/);
        if (!idMatch || seenIds.has(idMatch[1])) continue;
        
        const id = idMatch[1];
        seenIds.add(id);

        const name = fullName.replace(/\s*Booster Box\s*/i, '').trim();
        const setNameMatch = name.match(/^(.+?)(?:\s+[A-Z]{2,4})?$/);
        const setName = setNameMatch ? setNameMatch[1].trim() : name;
        const setCodeMatch = name.match(/\b([A-Z]{2,4})\b/);
        const setCode = setCodeMatch ? setCodeMatch[1] : '';

        boosterBoxes.push({
          id,
          name,
          setName,
          setCode,
          imageUrl: '',
          url: `https://www.cardmarket.com${url}`,
        } as BoosterBox);
      }
    }

    return boosterBoxes.slice(0, 100); // Limit to 100 results
  } catch (error) {
    console.error('Error fetching Cardmarket booster boxes:', error);
    // Return sample data if scraping fails
    return [
      {
        id: '1',
        name: 'Throne of Eldraine Booster Box',
        setName: 'Throne of Eldraine',
        setCode: 'ELD',
        imageUrl: 'https://www.cardmarket.com/images/products/magic/booster-boxes/throne-of-eldraine.jpg',
        url: 'https://www.cardmarket.com/en/Magic/Products/Booster-Boxes/Throne-of-Eldraine',
      },
      {
        id: '2',
        name: 'Theros Beyond Death Booster Box',
        setName: 'Theros Beyond Death',
        setCode: 'THB',
        imageUrl: 'https://www.cardmarket.com/images/products/magic/booster-boxes/theros-beyond-death.jpg',
        url: 'https://www.cardmarket.com/en/Magic/Products/Booster-Boxes/Theros-Beyond-Death',
      },
    ];
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    const [scryfallBoxes, mtgIoBoxes] = await Promise.all([
      fetchScryfallBoosterBoxes(search),
      fetchMtgIoBoosterBoxes(search),
    ]);

    let boosterBoxes = mergeBoosterBoxes(scryfallBoxes, mtgIoBoxes);

    // If combined sources return no results and we have a search term, try Cardmarket as fallback
    if (boosterBoxes.length === 0 && search.length >= 2) {
      console.log('Scryfall returned no results, trying Cardmarket fallback...');
      const cardmarketBoxes = await fetchCardmarketBoosterBoxes();
      const filtered = cardmarketBoxes.filter(
        (bb) =>
          bb.name.toLowerCase().includes(search.toLowerCase()) ||
          bb.setName.toLowerCase().includes(search.toLowerCase()) ||
          bb.setCode.toLowerCase().includes(search.toLowerCase())
      );
      boosterBoxes = filtered;
    }

    // If no search term, return all Scryfall/Mtg sets
    if (!search && boosterBoxes.length === 0) {
      const [fallbackScryfall, fallbackMtgIo] = await Promise.all([
        fetchScryfallBoosterBoxes(),
        fetchMtgIoBoosterBoxes(),
      ]);
      boosterBoxes = mergeBoosterBoxes(fallbackScryfall, fallbackMtgIo);
    }

    return NextResponse.json({
      success: true,
      data: boosterBoxes.slice(0, 50), // Limit results
      total: boosterBoxes.length,
      source: 'scryfall+mtgio',
    });
  } catch (error) {
    console.error('Booster boxes API error:', error);
    
    // Fallback to Cardmarket if Scryfall fails
    try {
      const { searchParams } = new URL(request.url);
      const search = searchParams.get('search')?.toLowerCase() || '';
      const cardmarketBoxes = await fetchCardmarketBoosterBoxes();
      const filtered = search
        ? cardmarketBoxes.filter(
            (bb) =>
              bb.name.toLowerCase().includes(search) ||
              bb.setName.toLowerCase().includes(search) ||
              bb.setCode.toLowerCase().includes(search)
          )
        : cardmarketBoxes;

      return NextResponse.json({
        success: true,
        data: filtered.slice(0, 50),
        total: filtered.length,
        source: 'cardmarket-fallback',
      });
    } catch (fallbackError) {
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch booster boxes',
          data: [],
        },
        { status: 500 }
      );
    }
  }
}

