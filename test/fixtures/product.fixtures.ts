/**
 * Product test fixtures
 */

import { randomPrice, randomCommission, randomString } from '../utils/test-helpers';

export const createMockProduct = (overrides?: Partial<any>) => ({
  id: randomString(10),
  title: 'Test Product',
  description: 'Test product description',
  price: randomPrice(),
  commission: randomCommission(),
  category: 'Electronics',
  brand: 'TestBrand',
  asin: randomString(10),
  affiliateUrl: 'https://amazon.com/test',
  imageUrl: 'https://images.amazon.com/test.jpg',
  rating: 4.5,
  reviewCount: 100,
  isActive: true,
  networkId: randomString(10),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockProducts = (count: number = 5): any[] => {
  return Array.from({ length: count }, (_, i) => createMockProduct({
    title: `Test Product ${i + 1}`,
  }));
};

export const createMockProductWithScores = (overrides?: Partial<any>) => ({
  ...createMockProduct(overrides),
  trendScore: 0.7,
  profitScore: 0.8,
  viralityScore: 0.6,
  overallScore: 0.72,
});

export const mockAmazonProduct = {
  ASIN: 'B08N5WRWNW',
  Title: 'Apple AirPods Pro',
  DetailPageURL: 'https://amazon.com/dp/B08N5WRWNW',
  Images: {
    Primary: {
      Large: {
        URL: 'https://images.amazon.com/test.jpg',
      },
    },
  },
  Offers: {
    Listings: [
      {
        Price: {
          Amount: 249.99,
          Currency: 'USD',
        },
      },
    ],
  },
  ItemInfo: {
    Title: {
      DisplayValue: 'Apple AirPods Pro',
    },
    ByLineInfo: {
      Brand: {
        DisplayValue: 'Apple',
      },
    },
    Classifications: {
      Binding: {
        DisplayValue: 'Electronics',
      },
    },
  },
  CustomerReviews: {
    StarRating: {
      Value: 4.5,
    },
    Count: 25000,
  },
};
