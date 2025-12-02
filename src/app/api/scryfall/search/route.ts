import { NextResponse } from 'next/server';
import { searchScryfallCards, getCardByName } from '@/lib/scryfall';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const exact = searchParams.get('exact');
    const set = searchParams.get('set');

    if (!query && !exact) {
      return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 });
    }

    let cards;
    if (exact) {
      const card = await getCardByName(exact, set || undefined);
      cards = card ? [card] : [];
    } else {
      cards = await searchScryfallCards(query!);
    }

    // Transform to match our Card model structure
    const transformedCards = cards.map((card) => ({
      scryfallId: card.id,
      multiverseId: card.multiverse_ids?.[0]?.toString(),
      name: card.name,
      setName: card.set_name,
      setCode: card.set,
      collectorNumber: card.collector_number,
      rarity: card.rarity,
      imageUrlGatherer: card.multiverse_ids?.[0]
        ? `https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=${card.multiverse_ids[0]}&type=card`
        : card.image_uris?.normal || '',
      imageUrlScryfall: card.image_uris?.normal || card.image_uris?.large || '',
      colors: card.colors || [],
      cmc: card.cmc || 0,
      type: card.type_line || '',
      oracleText: card.oracle_text || '',
      priceAvg: card.prices?.eur ? Number(card.prices.eur) : null,
      sourceGame: 'MAGIC_THE_GATHERING' as const,
    }));

    return NextResponse.json({ cards: transformedCards });
  } catch (error) {
    console.error('Scryfall search error:', error);
    return NextResponse.json({ error: 'Failed to search cards' }, { status: 500 });
  }
}




