import { chromium, Page } from 'playwright';
import * as cheerio from 'cheerio';
import { SealedProductType } from '@prisma/client';
import { prisma } from '../src/lib/prisma';
import { getAllSets, ScryfallSet } from '../src/lib/scryfall';

type Category = 'box' | 'pack';

type ScrapedProduct = {
  cardmarketProductId: number;
  slug: string;
  name: string;
  setName: string | null;
  setCode: string | null;
  imageUrl: string;
  priceEuro: number | null;
  productType: SealedProductType;
  sourceUri: string;
  category: Category;
};

const CARDMARKET_BASE = 'https://www.cardmarket.com';
const TARGETS: Array<{ url: string; category: Category }> = [
  { url: `${CARDMARKET_BASE}/en/Magic/Products/Booster-Boxes`, category: 'box' },
  { url: `${CARDMARKET_BASE}/en/Magic/Products/Boosters`, category: 'pack' },
];

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';

const MAX_ALLOWED_PRICE = 5000; // guardrail in case parsing goes wrong

const TCG_SEARCH_ENDPOINT = 'https://mp-search-api.tcgplayer.com/v1/search/request';
const TCG_IMAGE_BASE = 'https://product-images.tcgplayer.com/fit-in/640x640';
const TCG_QUERY_PARAMS = {
  isList: 'false',
  mpfev: process.env.TCGPLAYER_MPF_VERSION || '4528',
};
const TCG_HEADERS = {
  'User-Agent':
    process.env.TCGPLAYER_USER_AGENT ||
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Referer: 'https://www.tcgplayer.com/',
  Accept: 'application/json, text/plain, */*',
  'Content-Type': 'application/json',
};

const BASE_TCG_BODY = {
  algorithm: 'sales_dismax',
  from: 0,
  size: 24,
  filters: {
    term: {
      productLineName: ['magic'],
    },
    range: {},
    match: {},
  },
  listingSearch: {
    context: { cart: {} },
    filters: {
      term: { sellerStatus: 'Live', channelId: 0 },
      range: { quantity: { gte: 1 } },
      exclude: { channelExclusion: 0 },
    },
  },
  context: {
    cart: {},
    shippingCountry: process.env.TCGPLAYER_SHIPPING_COUNTRY || 'DE',
    userProfile: {},
  },
  settings: { useFuzzySearch: true, didYouMean: {} },
  sort: {},
} satisfies Record<string, unknown>;

type TcgSearchResult = {
  productId: number;
  productName: string;
  productUrlName: string;
  productLineUrlName: string;
  setName?: string;
};

type ResolvedTcgMatch = {
  tcgplayerId: number;
  imageUrl: string;
  productUrl: string;
  productName: string;
  setName?: string;
  score: number;
};

const tcgCache = new Map<string, TcgSearchResult[] | null>();
let lastTcgRequest = 0;
const TCG_REQUEST_DELAY_MS = Number(process.env.TCGPLAYER_RATE_DELAY_MS || '200');

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function cloneTcgBody() {
  return JSON.parse(JSON.stringify(BASE_TCG_BODY));
}

function normalizeText(value?: string | null) {
  return (value || '')
    .toLowerCase()
    .replace(/magic(:|\s)+the(\s+)?gathering/gi, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildProductUrl(result: TcgSearchResult) {
  const id = Math.trunc(Number(result.productId));
  const line = (result.productLineUrlName || 'magic').toLowerCase();
  const nameSource = result.productUrlName || result.productName || '';
  const slug = nameSource
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `https://www.tcgplayer.com/product/${id}/${line}-${slug}`;
}

function scoreTcgCandidate(candidate: TcgSearchResult, product: ScrapedProduct) {
  let score = 0;
  const candidateName = normalizeText(candidate.productName);
  const targetName = normalizeText(product.name);
  const candidateSet = normalizeText(candidate.setName);
  const targetSet = normalizeText(product.setName);

  if (!candidateName || !targetName) {
    return score;
  }

  if (candidateName === targetName) {
    score += 8;
  } else if (candidateName.includes(targetName) || targetName.includes(candidateName)) {
    score += 5;
  }

  if (candidateSet && targetSet && candidateSet === targetSet) {
    score += 4;
  }

  const keywordBuckets = [
    'set booster',
    'draft booster',
    'collector booster',
    'play booster',
    'bundle',
    'prerelease',
    'commander',
    'jumpstart',
    'gift',
    'starter',
  ];

  for (const keyword of keywordBuckets) {
    if (candidateName.includes(keyword) && targetName.includes(keyword)) {
      score += 2;
    }
  }

  if (product.category === 'pack' && candidateName.includes('pack')) {
    score += 1;
  }

  if (product.category === 'box' && candidateName.includes('display')) {
    score += 1;
  }

  return score;
}

async function fetchTcgResults(query: string) {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }
  const cacheKey = trimmed.toLowerCase();
  if (tcgCache.has(cacheKey)) {
    return tcgCache.get(cacheKey) ?? [];
  }

  const now = Date.now();
  const sinceLast = now - lastTcgRequest;
  if (sinceLast < TCG_REQUEST_DELAY_MS) {
    await sleep(TCG_REQUEST_DELAY_MS - sinceLast);
  }

  lastTcgRequest = Date.now();
  const params = new URLSearchParams({ q: trimmed, ...TCG_QUERY_PARAMS });
  const response = await fetch(`${TCG_SEARCH_ENDPOINT}?${params.toString()}`, {
    method: 'POST',
    headers: TCG_HEADERS,
    body: JSON.stringify(cloneTcgBody()),
  });

  if (!response.ok) {
    console.warn(`[tcg] query failed (${response.status}) for "${trimmed}"`);
    tcgCache.set(cacheKey, null);
    return [];
  }

  const json = await response.json();
  const results = (json?.results?.[0]?.results ?? []) as TcgSearchResult[];
  tcgCache.set(cacheKey, results);
  return results;
}

async function resolveTcgProduct(product: ScrapedProduct): Promise<ResolvedTcgMatch | null> {
  const attemptedQueries = new Set<string>();
  const queries: string[] = [product.name];

  if (product.setName && !product.name.toLowerCase().includes(product.setName.toLowerCase())) {
    queries.push(`${product.setName} ${product.productType}`.trim());
  }

  if (product.setName) {
    queries.push(`${product.setName} sealed ${product.category}`.trim());
  }

  for (const query of queries) {
    const trimmed = query.trim();
    if (!trimmed || attemptedQueries.has(trimmed.toLowerCase())) {
      continue;
    }
    attemptedQueries.add(trimmed.toLowerCase());

    try {
      const results = await fetchTcgResults(trimmed);
      if (!results.length) continue;

      const ranked = results
        .map((candidate) => ({
          candidate,
          score: scoreTcgCandidate(candidate, product),
        }))
        .sort((a, b) => b.score - a.score);

      const best = ranked[0];
      if (best && best.score >= 4) {
        const id = Math.trunc(Number(best.candidate.productId));
        return {
          tcgplayerId: id,
          imageUrl: `${TCG_IMAGE_BASE}/${id}.jpg`,
          productUrl: buildProductUrl(best.candidate),
          productName: best.candidate.productName,
          setName: best.candidate.setName,
          score: best.score,
        };
      }
    } catch (error) {
      console.warn(`[tcg] failed to resolve "${trimmed}":`, error);
    }
  }

  return null;
}

async function acceptCookies(page: Page) {
  const cookieButton = page.locator('button:has-text("Accept All Cookies")');
  if (await cookieButton.count()) {
    await cookieButton.first().click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(400);
  }
}

async function ensureNotBlocked(page: Page) {
  const challenge = await page.locator('#challenge-error-text, .h2:has-text("Enable JavaScript")').count();
  if (challenge) {
    throw new Error(
      'Cloudflare / cookie wall detected. Run the script with CARDMARKET_HEADLESS=false and ensure you can pass the challenge.'
    );
  }
}

async function collectPaginatedHtml(page: Page, url: string): Promise<string[]> {
  const pages: string[] = [];
  let totalPages = 1;

  for (let currentPage = 1; currentPage <= totalPages; currentPage++) {
    const pageUrl = currentPage === 1 ? url : `${url}?site=${currentPage}`;
    console.log(`Navigating to ${pageUrl}`);
    await page.goto(pageUrl, { waitUntil: 'networkidle' });
    await acceptCookies(page);
    await ensureNotBlocked(page);
    await page.waitForSelector('div[id^="productRow"]', { timeout: 20_000 });
    const html = await page.content();
    pages.push(html);

    if (currentPage === 1) {
      totalPages = await readTotalPages(page);
      console.log(`Detected ${totalPages} page(s) for ${url}`);
    }
  }

  return pages;
}

async function readTotalPages(page: Page): Promise<number> {
  try {
    const paginationText = await page
      .locator('span.mx-1')
      .filter({ hasText: /Page\s+\d+\s+of\s+\d+/i })
      .first()
      .textContent();
    if (paginationText) {
      const match = paginationText.match(/Page\s+\d+\s+of\s+(\d+)/i);
      if (match) {
        const value = parseInt(match[1], 10);
        if (!Number.isNaN(value) && value > 0) {
          return value;
        }
      }
    }
  } catch {
    // Ignore and fall back to single-page
  }
  return 1;
}

function cleanSetLabel(label?: string | null): string | null {
  if (!label) return null;
  return label.replace(/Magic:\s*The Gathering\s*\|?/gi, '').trim() || null;
}

function normalizeSetName(name: string | null | undefined): string {
  return (name || '')
    .toLowerCase()
    .replace(/magic(:|\s)*the\s*gathering/g, '')
    .replace(/universes\s*beyond/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function parseEuroPrice(value?: string | null): number | null {
  if (!value) return null;
  const cleaned = value.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  if (Number.isNaN(parsed) || parsed <= 0 || parsed > MAX_ALLOWED_PRICE) {
    return null;
  }
  return parseFloat(parsed.toFixed(2));
}

function extractImageUrl(fragment?: string | null): string | null {
  if (!fragment) return null;
  const decoded = fragment.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  const $ = cheerio.load(decoded);
  const src = $('img').attr('src');
  if (!src) return null;
  if (src.startsWith('http')) return src;
  if (src.startsWith('//')) return `https:${src}`;
  return `${CARDMARKET_BASE}${src}`;
}

function inferProductType(name: string, category: Category): SealedProductType {
  const normalized = name.toLowerCase();
  const isBundle = normalized.includes('bundle') || normalized.includes('fat pack');
  const isPrerelease = normalized.includes('prerelease');
  const isStarter = normalized.includes('starter kit') || normalized.includes('intro deck');
  const isCommander = normalized.includes('commander deck');

  if (category === 'box') {
    if (normalized.includes('play booster')) return SealedProductType.PLAY_BOOSTER_DISPLAY;
    if (normalized.includes('set booster')) return SealedProductType.SET_BOOSTER_DISPLAY;
    if (normalized.includes('draft booster')) return SealedProductType.DRAFT_BOOSTER_DISPLAY;
    if (normalized.includes('collector booster')) return SealedProductType.COLLECTOR_BOOSTER_DISPLAY;
    if (normalized.includes('jumpstart')) return SealedProductType.SET_BOOSTER_DISPLAY;
    if (isBundle && normalized.includes('gift')) return SealedProductType.GIFT_BUNDLE;
    if (isBundle) return SealedProductType.BUNDLE;
    if (isCommander) return SealedProductType.COMMANDER_DECK;
    if (isStarter) return SealedProductType.STARTER_KIT;
    if (isPrerelease) return SealedProductType.PRERELEASE_PACK;
  } else {
    if (normalized.includes('play booster')) return SealedProductType.PLAY_BOOSTER_PACK;
    if (normalized.includes('set booster')) return SealedProductType.SET_BOOSTER_PACK;
    if (normalized.includes('draft booster')) return SealedProductType.DRAFT_BOOSTER_PACK;
    if (normalized.includes('collector booster')) return SealedProductType.COLLECTOR_BOOSTER_PACK;
    if (normalized.includes('jumpstart')) return SealedProductType.SET_BOOSTER_PACK;
    if (isPrerelease) return SealedProductType.PRERELEASE_PACK;
  }

  return SealedProductType.UNKNOWN;
}

function parseProducts(html: string, category: Category, resolver: SetResolver): ScrapedProduct[] {
  const $ = cheerio.load(html);
  const products: ScrapedProduct[] = [];

  $('div[id^="productRow"]').each((_, element) => {
    const row = $(element);
    const idAttr = row.attr('id') || '';
    const idMatch = idAttr.match(/productRow(\d+)/);
    if (!idMatch) return;
    const cardmarketProductId = parseInt(idMatch[1], 10);
    if (!cardmarketProductId || Number.isNaN(cardmarketProductId)) return;

    const productLink = row.find('a[href*="/en/Magic/Products/"]').first();
    const relativeUrl = productLink.attr('href');
    const name = productLink.text().trim();
    if (!relativeUrl || !name) return;

    const slugSegment = relativeUrl.split('/').filter(Boolean).pop();
    if (!slugSegment) return;
    const slug = `cm-${slugSegment}`;

    const priceText = row.find('.col-price').text().trim();
    const priceEuro = parseEuroPrice(priceText);

    const tooltip = row.find('.col-icon span[data-bs-title]').attr('data-bs-title');
    const imageUrl = extractImageUrl(tooltip) ?? '';

    const setAnchor = row.find('.col-icon.small a').first();
    const rawSetLabel = cleanSetLabel(setAnchor.attr('aria-label')) ?? null;
    const setSlugHint = setAnchor.attr('href')?.split('/').filter(Boolean).pop() ?? null;
    const resolvedSet = resolver.resolve(rawSetLabel, setSlugHint);

    const productType = inferProductType(name, category);
    const sourceUri = new URL(relativeUrl, CARDMARKET_BASE).toString();

    products.push({
      cardmarketProductId,
      slug,
      name,
      setName: resolvedSet.setName,
      setCode: resolvedSet.setCode,
      imageUrl,
      priceEuro,
      productType,
      sourceUri,
      category,
    });
  });

  return products;
}

type SetResolver = {
  resolve: (rawLabel: string | null, slugHint: string | null) => { setName: string | null; setCode: string | null };
};

function buildSetResolver(sets: ScryfallSet[]): SetResolver {
  const entries = sets.map((set) => ({
    set,
    normalized: normalizeSetName(set.name),
    altNormalized: normalizeSetName(set.code),
  }));

  const cache = new Map<string, { setName: string | null; setCode: string | null }>();

  function tryMatch(target: string): ScryfallSet | undefined {
    if (!target) return undefined;
    const normalizedTarget = normalizeSetName(target);
    if (!normalizedTarget) return undefined;

    return (
      entries.find((entry) => entry.normalized === normalizedTarget || entry.altNormalized === normalizedTarget) ??
      entries.find(
        (entry) =>
          normalizedTarget.includes(entry.normalized) ||
          entry.normalized.includes(normalizedTarget) ||
          normalizedTarget.includes(entry.altNormalized)
      )
    )?.set;
  }

  return {
    resolve: (rawLabel, slugHint) => {
      const cacheKey = `${rawLabel ?? ''}|${slugHint ?? ''}`;
      if (cache.has(cacheKey)) {
        return cache.get(cacheKey)!;
      }

      const match =
        tryMatch(rawLabel ?? '') ??
        tryMatch(slugHint?.replace(/-/g, ' ') ?? '') ??
        tryMatch(slugHint ?? '') ??
        undefined;

      const result =
        match !== undefined
          ? { setName: match.name, setCode: match.code.toUpperCase() }
          : { setName: rawLabel ?? (slugHint ? slugHint.replace(/-/g, ' ') : null), setCode: null };

      cache.set(cacheKey, result);
      if (!result.setCode) {
        console.warn(`[set-resolver] Unable to match set "${rawLabel ?? slugHint ?? 'Unknown'}"`);
      }
      return result;
    },
  };
}

function dedupeProducts(products: ScrapedProduct[]): ScrapedProduct[] {
  const map = new Map<number, ScrapedProduct>();
  for (const product of products) {
    if (!map.has(product.cardmarketProductId)) {
      map.set(product.cardmarketProductId, product);
    } else {
      const existing = map.get(product.cardmarketProductId)!;
      // Prefer entry that has setCode or price
      if ((!existing.setCode && product.setCode) || (!existing.priceEuro && product.priceEuro)) {
        map.set(product.cardmarketProductId, product);
      }
    }
  }
  return Array.from(map.values());
}

async function main() {
  const headless = process.env.CARDMARKET_HEADLESS === 'true';
  const userAgent = process.env.CARDMARKET_USER_AGENT || DEFAULT_USER_AGENT;
  const browser = await chromium.launch({
    headless,
    args: headless ? ['--disable-blink-features=AutomationControlled'] : [],
  });

  const page = await browser.newPage({
    userAgent,
    viewport: { width: 1280, height: 720 },
  });

  try {
    const scryfallSets = await getAllSets();
    const resolver = buildSetResolver(scryfallSets);

    const scrapedResults: ScrapedProduct[] = [];
    for (const target of TARGETS) {
      const htmlPages = await collectPaginatedHtml(page, target.url);
      for (const html of htmlPages) {
        scrapedResults.push(...parseProducts(html, target.category, resolver));
      }
    }

    const uniqueProducts = dedupeProducts(scrapedResults);
    console.log(
      `Scraped ${scrapedResults.length} rows (${uniqueProducts.length} unique products) across ${TARGETS.length} categories.`
    );

    let created = 0;
    let updated = 0;

    for (const product of uniqueProducts) {
      const tcgMatch = await resolveTcgProduct(product);
      if (!tcgMatch) {
        console.warn(`[tcg] No TCGplayer mapping found for "${product.name}" (${product.setName ?? 'Unknown Set'})`);
      }

      const imageUrl = tcgMatch?.imageUrl || product.imageUrl || '/placeholder.svg';

      const payload = {
        name: product.name,
        slug: product.slug,
        setName: product.setName,
        setCode: product.setCode,
        productType: product.productType,
        imageUrl,
        priceAvg: product.priceEuro,
        cardmarketProductId: product.cardmarketProductId,
        sourceUri: tcgMatch?.productUrl ?? product.sourceUri,
        tcgplayerId: tcgMatch?.tcgplayerId ?? null,
        game: 'MAGIC_THE_GATHERING' as const,
      };

      const existing = await prisma.sealedProductCatalog.findUnique({
        where: { slug: product.slug },
        select: { id: true },
      });

      await prisma.sealedProductCatalog.upsert({
        where: { slug: product.slug },
        update: payload,
        create: {
          ...payload,
          id: `cm-${product.cardmarketProductId}`,
        },
      });

      if (existing) {
        updated += 1;
      } else {
        created += 1;
      }
    }

    console.log(`Upsert complete. Created ${created} new entries, updated ${updated} existing entries.`);
  } finally {
    await page.close();
    await browser.close();
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Failed to sync Cardmarket sealed products:', error);
  process.exitCode = 1;
});

