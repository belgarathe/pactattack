export type Role = 'USER' | 'ADMIN';
export type BattleFormat = 'SOLO' | 'TEAM';
export type BattleMode = 'NORMAL' | 'UPSIDE_DOWN' | 'JACKPOT';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
export type CardGame = 'MAGIC_THE_GATHERING' | 'ONE_PIECE' | 'POKEMON' | 'LORCANA';
export type HeroDisplayMode = 'AUTO' | 'CARD' | 'SEALED';

export interface User {
  id: string;
  email: string;
  name: string | null;
  coins: number;
  role: Role;
}

export interface Box {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  cardsPerPack: number;
  isActive: boolean;
  featured: boolean;
  popularity: number;
  games: CardGame[];
  heroDisplayMode?: HeroDisplayMode;
  heroCardId?: string | null;
  heroCard?: Card | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Card {
  id: string;
  scryfallId: string;
  multiverseId: string | null;
  name: string;
  setName: string;
  setCode: string;
  collectorNumber: string;
  rarity: string;
  imageUrlGatherer: string;
  imageUrlScryfall: string | null;
  colors: string[];
  cmc: number | null;
  type: string;
  oracleText: string | null;
  priceLow: number | null;
  priceAvg: number | null;
  priceHigh: number | null;
  priceLastUpdated: Date | null;
  pullRate: number;
  boxId: string;
  sourceGame: CardGame;
}

export interface Pull {
  id: string;
  userId: string;
  boxId: string;
  cardId: string;
  cardValue: number | null;
  timestamp: Date;
}

export interface PackResult {
  id: string;
  name: string;
  rarity: string;
  imageUrl: string;
  setName: string;
  cardValue?: number;
  type?: 'card' | 'boosterBox';
  pullRate?: number;
  coinValue?: number;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  coins: number;
  stripePaymentId: string | null;
  status: PaymentStatus;
  timestamp: Date;
}

export interface SealedProductCatalog {
  id: string;
  slug: string;
  name: string;
  setName: string | null;
  setCode: string | null;
  productType: string;
  imageUrl: string;
  description?: string | null;
  contents?: string | null;
  releaseDate?: Date | null;
  priceAvg?: number | null;
}

export interface BoxSealedProduct {
  id: string;
  catalogId?: string | null;
  name: string;
  imageUrl: string;
  setName?: string | null;
  setCode?: string | null;
  productType: string;
  pullRate: number;
  coinValue: number;
  priceAvg?: number | null;
  catalog?: SealedProductCatalog | null;
}




