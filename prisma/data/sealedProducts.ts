import { SealedProductType } from '@prisma/client';

export type SealedProductSeed = {
  slug: string;
  name: string;
  productType: SealedProductType;
  setCode: string;
  setName: string;
  imageUrl: string;
  description?: string;
  contents?: string;
  releaseDate?: string;
  tcgplayerId?: number;
  sourceUri?: string;
  priceAvg?: number;
};

export const sealedProductSeeds: SealedProductSeed[] = [
  {
    slug: 'woe-set-booster-display',
    name: 'Wilds of Eldraine Set Booster Display',
    productType: SealedProductType.SET_BOOSTER_DISPLAY,
    setCode: 'WOE',
    setName: 'Wilds of Eldraine',
    imageUrl: 'https://product-images.tcgplayer.com/fit-in/437x437/528237.jpg',
    description: 'Display of Wilds of Eldraine Set Boosters featuring fae glamour and storybook legends.',
    contents: '30 Wilds of Eldraine Set Booster packs',
    releaseDate: '2023-09-08',
    tcgplayerId: 528237,
    sourceUri: 'https://www.tcgplayer.com/product/528237/magic-wilds-of-eldraine-set-booster-box',
  },
  {
    slug: 'woe-draft-booster-display',
    name: 'Wilds of Eldraine Draft Booster Display',
    productType: SealedProductType.DRAFT_BOOSTER_DISPLAY,
    setCode: 'WOE',
    setName: 'Wilds of Eldraine',
    imageUrl: 'https://product-images.tcgplayer.com/fit-in/437x437/528233.jpg',
    description: '36 Wilds of Eldraine Draft Boosters optimized for Limited play at tabletop events.',
    contents: '36 Wilds of Eldraine Draft Booster packs',
    releaseDate: '2023-09-08',
    tcgplayerId: 528233,
    sourceUri: 'https://www.tcgplayer.com/product/528233/magic-wilds-of-eldraine-draft-booster-box',
  },
  {
    slug: 'woe-collector-booster-display',
    name: 'Wilds of Eldraine Collector Booster Display',
    productType: SealedProductType.COLLECTOR_BOOSTER_DISPLAY,
    setCode: 'WOE',
    setName: 'Wilds of Eldraine',
    imageUrl: 'https://product-images.tcgplayer.com/fit-in/437x437/528241.jpg',
    description: 'High-end Collector Boosters packed with foil treatments, showcase frames, and extended art.',
    contents: '12 Wilds of Eldraine Collector Booster packs',
    releaseDate: '2023-09-08',
    tcgplayerId: 528241,
    sourceUri: 'https://www.tcgplayer.com/product/528241/magic-wilds-of-eldraine-collector-booster-box',
  },
  {
    slug: 'woe-set-booster-pack',
    name: 'Wilds of Eldraine Set Booster Pack',
    productType: SealedProductType.SET_BOOSTER_PACK,
    setCode: 'WOE',
    setName: 'Wilds of Eldraine',
    imageUrl: 'https://product-images.tcgplayer.com/fit-in/437x437/528238.jpg',
    description: 'Single Wilds of Eldraine Set Booster with art card, wildcards, and showcase treatments.',
    contents: '1 Wilds of Eldraine Set Booster pack',
    releaseDate: '2023-09-08',
    tcgplayerId: 528238,
    sourceUri: 'https://www.tcgplayer.com/product/528238/magic-wilds-of-eldraine-set-booster-pack',
  },
  {
    slug: 'woe-draft-booster-pack',
    name: 'Wilds of Eldraine Draft Booster Pack',
    productType: SealedProductType.DRAFT_BOOSTER_PACK,
    setCode: 'WOE',
    setName: 'Wilds of Eldraine',
    imageUrl: 'https://product-images.tcgplayer.com/fit-in/437x437/528242.jpg',
    description: 'Classic 15-card booster ready for Limited play and cracking with friends.',
    contents: '1 Wilds of Eldraine Draft Booster pack',
    releaseDate: '2023-09-08',
    tcgplayerId: 528242,
    sourceUri: 'https://www.tcgplayer.com/product/528242/magic-wilds-of-eldraine-draft-booster-pack',
  },
  {
    slug: 'woe-collector-booster-pack',
    name: 'Wilds of Eldraine Collector Booster Pack',
    productType: SealedProductType.COLLECTOR_BOOSTER_PACK,
    setCode: 'WOE',
    setName: 'Wilds of Eldraine',
    imageUrl: 'https://product-images.tcgplayer.com/fit-in/437x437/528243.jpg',
    description: 'Collector Booster loaded with foils, showcase frames, and extended-art upgrades.',
    contents: '1 Wilds of Eldraine Collector Booster pack',
    releaseDate: '2023-09-08',
    tcgplayerId: 528243,
    sourceUri: 'https://www.tcgplayer.com/product/528243/magic-wilds-of-eldraine-collector-booster-pack',
  },
];

