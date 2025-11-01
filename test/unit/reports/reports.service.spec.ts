/**
 * Unit tests for ReportsService
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from '@/modules/reports/reports.service';
import { WeeklyReportService } from '@/modules/reports/services/weekly-report.service';

describe('ReportsService', () => {
  let service: ReportsService;
  let weeklyReportService: WeeklyReportService;

  const mockWeeklyReport = {
    period: {
      start: '2024-01-01',
      end: '2024-01-07',
      week: 1,
    },
    revenue: {
      total: 5000,
      byPlatform: [
        { platform: 'YOUTUBE', revenue: 3000 },
        { platform: 'TIKTOK', revenue: 2000 },
      ],
      byProduct: [
        { productTitle: 'Product 1', revenue: 3000 },
        { productTitle: 'Product 2', revenue: 2000 },
      ],
      growth: 25.5,
    },
    content: {
      videosCreated: 100,
      videosPublished: 95,
      blogsPublished: 10,
      avgCTR: 2.5,
      avgConversionRate: 3.2,
    },
    performance: {
      topProducts: [
        { title: 'Product 1', roi: 250, revenue: 3000 },
        { title: 'Product 2', roi: 180, revenue: 2000 },
      ],
      topPlatforms: [
        { platform: 'YOUTUBE', views: 100000, revenue: 3000 },
        { platform: 'TIKTOK', views: 150000, revenue: 2000 },
      ],
      worstPerformers: [{ title: 'Product 3', roi: 0.3 }],
    },
    optimization: {
      productsKilled: 2,
      productsScaled: 3,
      abTestsRun: 5,
      promptVersions: 8,
    },
    costs: {
      total: 500,
      fixed: 86,
      variable: 414,
      costPerVideo: 0.27,
    },
    roi: {
      overall: 900,
      profit: 4500,
      breakeven: true,
    },
    recommendations: [
      'Strong ROI! Consider scaling production.',
      'Focus on YOUTUBE platform for maximum views.',
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        {
          provide: WeeklyReportService,
          useValue: {
            generateWeeklyReport: jest.fn().mockResolvedValue(mockWeeklyReport),
          },
        },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    weeklyReportService = module.get<WeeklyReportService>(WeeklyReportService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getWeeklyReport', () => {
    it('should return weekly report data', async () => {
      const result = await service.getWeeklyReport();

      expect(result).toEqual(mockWeeklyReport);
      expect(weeklyReportService.generateWeeklyReport).toHaveBeenCalledTimes(1);
    });

    it('should delegate to WeeklyReportService', async () => {
      await service.getWeeklyReport();

      expect(weeklyReportService.generateWeeklyReport).toHaveBeenCalled();
    });

    it('should handle empty report data', async () => {
      const emptyReport = {
        period: { start: '2024-01-01', end: '2024-01-07', week: 1 },
        revenue: { total: 0, byPlatform: [], byProduct: [], growth: 0 },
        content: {
          videosCreated: 0,
          videosPublished: 0,
          blogsPublished: 0,
          avgCTR: 0,
          avgConversionRate: 0,
        },
        performance: { topProducts: [], topPlatforms: [], worstPerformers: [] },
        optimization: { productsKilled: 0, productsScaled: 0, abTestsRun: 0, promptVersions: 0 },
        costs: { total: 86, fixed: 86, variable: 0, costPerVideo: 0 },
        roi: { overall: -100, profit: -86, breakeven: false },
        recommendations: [],
      };

      (weeklyReportService.generateWeeklyReport as jest.Mock).mockResolvedValue(emptyReport);

      const result = await service.getWeeklyReport();

      expect(result.revenue.total).toBe(0);
      expect(result.content.videosCreated).toBe(0);
      expect(result.roi.breakeven).toBe(false);
    });

    it('should handle service errors', async () => {
      (weeklyReportService.generateWeeklyReport as jest.Mock).mockRejectedValue(
        new Error('Report generation failed'),
      );

      await expect(service.getWeeklyReport()).rejects.toThrow('Report generation failed');
    });
  });

  describe('getWeeklyReportHTML', () => {
    it('should return HTML formatted report', async () => {
      const result = await service.getWeeklyReportHTML();

      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('<html>');
      expect(result).toContain('</html>');
    });

    it('should include report title with week number', async () => {
      const result = await service.getWeeklyReportHTML();

      expect(result).toContain('AI Affiliate Empire - Weekly Report');
      expect(result).toContain('Week 1');
    });

    it('should include period information', async () => {
      const result = await service.getWeeklyReportHTML();

      expect(result).toContain('2024-01-01');
      expect(result).toContain('2024-01-07');
    });

    it('should display revenue metrics', async () => {
      const result = await service.getWeeklyReportHTML();

      expect(result).toContain('$5000.00');
      expect(result).toContain('25.5%');
    });

    it('should display content production stats', async () => {
      const result = await service.getWeeklyReportHTML();

      expect(result).toContain('100'); // videos created
      expect(result).toContain('95'); // videos published
      expect(result).toContain('10'); // blogs published
      expect(result).toContain('2.50%'); // avg CTR
    });

    it('should include revenue by platform table', async () => {
      const result = await service.getWeeklyReportHTML();

      expect(result).toContain('YOUTUBE');
      expect(result).toContain('$3000.00');
      expect(result).toContain('TIKTOK');
      expect(result).toContain('$2000.00');
    });

    it('should include top products table', async () => {
      const result = await service.getWeeklyReportHTML();

      expect(result).toContain('Product 1');
      expect(result).toContain('Product 2');
    });

    it('should display top performers with ROI', async () => {
      const result = await service.getWeeklyReportHTML();

      expect(result).toContain('250.0%');
      expect(result).toContain('180.0%');
    });

    it('should include worst performers if any', async () => {
      const result = await service.getWeeklyReportHTML();

      expect(result).toContain('Product 3');
      expect(result).toContain('0.3%');
    });

    it('should not show worst performers section if empty', async () => {
      const reportWithoutWorst = { ...mockWeeklyReport };
      reportWithoutWorst.performance.worstPerformers = [];

      (weeklyReportService.generateWeeklyReport as jest.Mock).mockResolvedValue(reportWithoutWorst);

      const result = await service.getWeeklyReportHTML();

      expect(result).not.toContain('Worst Performers');
    });

    it('should display costs breakdown', async () => {
      const result = await service.getWeeklyReportHTML();

      expect(result).toContain('$500.00'); // total costs
      expect(result).toContain('$4500.00'); // profit
      expect(result).toContain('900.0%'); // ROI
    });

    it('should include optimization actions', async () => {
      const result = await service.getWeeklyReportHTML();

      expect(result).toContain('Products Killed: 2');
      expect(result).toContain('Products Scaled: 3');
      expect(result).toContain('A/B Tests Run: 5');
      expect(result).toContain('Prompt Versions: 8');
    });

    it('should display recommendations', async () => {
      const result = await service.getWeeklyReportHTML();

      expect(result).toContain('Strong ROI! Consider scaling production.');
      expect(result).toContain('Focus on YOUTUBE platform for maximum views.');
    });

    it('should include CSS styles', async () => {
      const result = await service.getWeeklyReportHTML();

      expect(result).toContain('<style>');
      expect(result).toContain('font-family');
      expect(result).toContain('.metric');
      expect(result).toContain('.positive');
      expect(result).toContain('.negative');
    });

    it('should mark positive growth with up arrow', async () => {
      const result = await service.getWeeklyReportHTML();

      expect(result).toContain('↑');
      expect(result).toContain('25.5%');
    });

    it('should mark negative growth with down arrow', async () => {
      const reportWithNegativeGrowth = { ...mockWeeklyReport };
      reportWithNegativeGrowth.revenue.growth = -15.5;

      (weeklyReportService.generateWeeklyReport as jest.Mock).mockResolvedValue(
        reportWithNegativeGrowth,
      );

      const result = await service.getWeeklyReportHTML();

      expect(result).toContain('↓');
      expect(result).toContain('15.5%');
    });

    it('should style positive ROI correctly', async () => {
      const result = await service.getWeeklyReportHTML();

      expect(result).toContain('positive');
      expect(result).toContain('900.0%');
    });

    it('should style negative ROI correctly', async () => {
      const reportWithNegativeROI = { ...mockWeeklyReport };
      reportWithNegativeROI.roi.overall = -50;

      (weeklyReportService.generateWeeklyReport as jest.Mock).mockResolvedValue(
        reportWithNegativeROI,
      );

      const result = await service.getWeeklyReportHTML();

      expect(result).toContain('negative');
      expect(result).toContain('-50.0%');
    });

    it('should include generation timestamp', async () => {
      const result = await service.getWeeklyReportHTML();

      expect(result).toContain('Generated automatically by AI Affiliate Empire');
      expect(result).toMatch(/\d{4}-\d{2}-\d{2}T/); // ISO date format
    });

    it('should be valid HTML structure', async () => {
      const result = await service.getWeeklyReportHTML();

      // Check essential HTML structure
      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('<head>');
      expect(result).toContain('</head>');
      expect(result).toContain('<body>');
      expect(result).toContain('</body>');
      expect(result).toContain('<meta charset="UTF-8">');
    });

    it('should handle empty recommendations', async () => {
      const reportWithoutRecommendations = { ...mockWeeklyReport };
      reportWithoutRecommendations.recommendations = [];

      (weeklyReportService.generateWeeklyReport as jest.Mock).mockResolvedValue(
        reportWithoutRecommendations,
      );

      const result = await service.getWeeklyReportHTML();

      expect(result).toContain('Recommendations');
      // Should not throw error even with empty recommendations
    });

    it('should use grid layout for metrics', async () => {
      const result = await service.getWeeklyReportHTML();

      expect(result).toContain('grid-template-columns');
    });

    it('should include responsive table styles', async () => {
      const result = await service.getWeeklyReportHTML();

      expect(result).toContain('<table>');
      expect(result).toContain('<th>');
      expect(result).toContain('<td>');
    });
  });

  describe('HTML generation edge cases', () => {
    it('should handle very large numbers', async () => {
      const reportWithLargeNumbers = { ...mockWeeklyReport };
      reportWithLargeNumbers.revenue.total = 1000000;
      reportWithLargeNumbers.roi.profit = 999999;

      (weeklyReportService.generateWeeklyReport as jest.Mock).mockResolvedValue(
        reportWithLargeNumbers,
      );

      const result = await service.getWeeklyReportHTML();

      expect(result).toContain('$1000000.00');
      expect(result).toContain('$999999.00');
    });

    it('should handle decimal values correctly', async () => {
      const reportWithDecimals = { ...mockWeeklyReport };
      reportWithDecimals.revenue.total = 1234.56;
      reportWithDecimals.costs.costPerVideo = 0.27;

      (weeklyReportService.generateWeeklyReport as jest.Mock).mockResolvedValue(reportWithDecimals);

      const result = await service.getWeeklyReportHTML();

      expect(result).toContain('$1234.56');
    });

    it('should handle special characters in product names', async () => {
      const reportWithSpecialChars = { ...mockWeeklyReport };
      reportWithSpecialChars.performance.topProducts = [
        { title: 'Product <>&"\'', roi: 250, revenue: 3000 },
      ];

      (weeklyReportService.generateWeeklyReport as jest.Mock).mockResolvedValue(
        reportWithSpecialChars,
      );

      const result = await service.getWeeklyReportHTML();

      // Should not break HTML structure
      expect(result).toContain('<!DOCTYPE html>');
    });
  });
});
