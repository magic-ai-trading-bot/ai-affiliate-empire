/**
 * Analytics test fixtures
 */

import { randomString, randomNumber } from '../utils/test-helpers';

export const createMockAnalytics = (overrides?: Partial<any>) => ({
  id: randomString(10),
  productId: randomString(10),
  videoId: randomString(10),
  platform: 'YOUTUBE',
  views: randomNumber(100, 10000),
  clicks: randomNumber(10, 500),
  conversions: randomNumber(1, 50),
  revenue: parseFloat((Math.random() * 100 + 10).toFixed(2)),
  cost: parseFloat((Math.random() * 10 + 1).toFixed(2)),
  date: new Date(),
  createdAt: new Date(),
  ...overrides,
});

export const createMockAnalyticsArray = (count: number = 10): any[] => {
  return Array.from({ length: count }, () => createMockAnalytics());
};

export const createMockNetworkAnalytics = (overrides?: Partial<any>) => ({
  id: randomString(10),
  networkId: randomString(10),
  totalClicks: randomNumber(100, 5000),
  totalConversions: randomNumber(10, 500),
  totalRevenue: parseFloat((Math.random() * 1000 + 100).toFixed(2)),
  date: new Date(),
  createdAt: new Date(),
  ...overrides,
});

export const createMockROIData = () => ({
  revenue: {
    total: 5000,
    breakdown: [
      { network: 'Amazon Associates', revenue: 3000 },
      { network: 'ShareASale', revenue: 2000 },
    ],
  },
  costs: {
    total: 500,
    fixed: 86,
    variable: 414,
    breakdown: {
      fixed: {
        hosting: 30,
        pikaLabs: 28,
        elevenLabs: 28,
      },
      variable: {
        scripts: 100,
        videos: 70,
        voices: 50,
        thumbnails: 194,
        blogs: 0,
      },
    },
  },
  roi: {
    percentage: 900,
    profit: 4500,
    breakEven: 500,
  },
  content: {
    videos: 5000,
    blogs: 0,
    avgCostPerVideo: 0.1,
    avgRevenuePerVideo: 1.0,
  },
});
