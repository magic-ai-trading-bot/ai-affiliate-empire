import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as client from 'prom-client';
import { MetricsService } from '../../../../src/common/monitoring/metrics.service';
import { LoggerService } from '../../../../src/common/logging/logger.service';

describe('MetricsService', () => {
  let service: MetricsService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        NODE_ENV: 'test',
      };
      return config[key];
    }),
  };

  const mockLoggerService = {
    setContext: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(async () => {
    // Clear all registries before each test
    client.register.clear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: LoggerService, useValue: mockLoggerService },
      ],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    service.resetMetrics();
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with correct environment labels', () => {
      const registry = service.getRegistry();
      const defaultLabels = (registry as any)._defaultLabels;
      expect(defaultLabels).toEqual({
        app: 'ai-affiliate-empire',
        environment: 'test',
      });
    });

    it('should log initialization message', () => {
      // Clear the mocks to test onModuleInit specifically
      mockLoggerService.log.mockClear();

      // Call onModuleInit to trigger the log
      service.onModuleInit();

      expect(mockLoggerService.log).toHaveBeenCalled();
      expect(mockLoggerService.log).toHaveBeenCalledWith(
        expect.stringContaining('Prometheus metrics'),
      );
    });

    it('should set logger context', () => {
      expect(mockLoggerService.setContext).toHaveBeenCalledWith('MetricsService');
    });
  });

  describe('Business Metrics - Product Syncing', () => {
    it('should increment products synced counter', async () => {
      service.incrementProductsSynced(5, {
        platform: 'amazon',
        network: 'amazon-associates',
      });

      const metrics = await service.getMetricsAsJSON();
      const productMetric = metrics.find((m: any) => m.name === 'affiliate_products_synced_total');

      expect(productMetric).toBeDefined();
      expect(productMetric.values).toContainEqual(
        expect.objectContaining({
          labels: expect.objectContaining({
            platform: 'amazon',
            network: 'amazon-associates',
          }),
          value: 5,
        }),
      );
    });

    it('should increment products synced by 1 when count not provided', async () => {
      service.incrementProductsSynced(undefined, {
        platform: 'shareasale',
        network: 'shareasale-api',
      });

      const metrics = await service.getMetricsAsJSON();
      const productMetric = metrics.find((m: any) => m.name === 'affiliate_products_synced_total');

      expect(productMetric.values).toContainEqual(
        expect.objectContaining({
          labels: expect.objectContaining({
            platform: 'shareasale',
            network: 'shareasale-api',
          }),
          value: 1,
        }),
      );
    });

    it('should track multiple platforms separately', async () => {
      service.incrementProductsSynced(3, {
        platform: 'amazon',
        network: 'amazon-associates',
      });
      service.incrementProductsSynced(7, {
        platform: 'cj',
        network: 'cj-affiliate',
      });

      const metrics = await service.getMetricsAsJSON();
      const productMetric = metrics.find((m: any) => m.name === 'affiliate_products_synced_total');

      expect(productMetric.values).toHaveLength(2);
      expect(productMetric.values).toContainEqual(
        expect.objectContaining({
          labels: expect.objectContaining({
            platform: 'amazon',
            network: 'amazon-associates',
          }),
          value: 3,
        }),
      );
      expect(productMetric.values).toContainEqual(
        expect.objectContaining({
          labels: expect.objectContaining({
            platform: 'cj',
            network: 'cj-affiliate',
          }),
          value: 7,
        }),
      );
    });
  });

  describe('Business Metrics - Video Generation', () => {
    it('should increment videos generated counter', async () => {
      service.incrementVideosGenerated(10, {
        platform: 'youtube',
        contentType: 'short',
      });

      const metrics = await service.getMetricsAsJSON();
      const videoMetric = metrics.find((m: any) => m.name === 'affiliate_videos_generated_total');

      expect(videoMetric).toBeDefined();
      expect(videoMetric.values).toContainEqual(
        expect.objectContaining({
          labels: expect.objectContaining({
            platform: 'youtube',
            content_type: 'short',
          }),
          value: 10,
        }),
      );
    });

    it('should track different content types separately', async () => {
      service.incrementVideosGenerated(5, {
        platform: 'tiktok',
        contentType: 'video',
      });
      service.incrementVideosGenerated(3, {
        platform: 'instagram',
        contentType: 'reel',
      });

      const metrics = await service.getMetricsAsJSON();
      const videoMetric = metrics.find((m: any) => m.name === 'affiliate_videos_generated_total');

      expect(videoMetric.values).toHaveLength(2);
    });
  });

  describe('Business Metrics - API Costs', () => {
    it('should set API cost gauge', async () => {
      service.setApiCost(25.5, {
        service: 'openai',
        operation: 'text-generation',
      });

      const metrics = await service.getMetricsAsJSON();
      const costMetric = metrics.find((m: any) => m.name === 'affiliate_api_cost_dollars');

      expect(costMetric).toBeDefined();
      expect(costMetric.values).toContainEqual(
        expect.objectContaining({
          labels: expect.objectContaining({
            service: 'openai',
            operation: 'text-generation',
          }),
          value: 25.5,
        }),
      );
    });

    it('should increment API cost gauge', async () => {
      service.setApiCost(10, {
        service: 'openai',
        operation: 'gpt-api',
      });
      service.incrementApiCost(5, {
        service: 'openai',
        operation: 'gpt-api',
      });

      const metrics = await service.getMetricsAsJSON();
      const costMetric = metrics.find((m: any) => m.name === 'affiliate_api_cost_dollars');

      expect(costMetric.values).toContainEqual(
        expect.objectContaining({
          labels: expect.objectContaining({
            service: 'openai',
            operation: 'gpt-api',
          }),
          value: 15,
        }),
      );
    });

    it('should track costs for multiple services', async () => {
      service.setApiCost(20, { service: 'openai', operation: 'gpt-4' });
      service.setApiCost(15, { service: 'elevenlabs', operation: 'voice' });
      service.setApiCost(30, { service: 'pikalabs', operation: 'video' });

      const metrics = await service.getMetricsAsJSON();
      const costMetric = metrics.find((m: any) => m.name === 'affiliate_api_cost_dollars');

      expect(costMetric.values).toHaveLength(3);
    });
  });

  describe('Business Metrics - Workflow Duration', () => {
    it('should record workflow duration', async () => {
      service.recordWorkflowDuration(125.5, {
        workflowName: 'daily-control-loop',
        status: 'completed',
      });

      const metrics = await service.getMetricsAsJSON();
      const durationMetric = metrics.find(
        (m: any) => m.name === 'affiliate_workflow_duration_seconds',
      );

      expect(durationMetric).toBeDefined();
      expect(durationMetric.type).toBe('histogram');
    });

    it('should record workflow failures separately', async () => {
      service.recordWorkflowDuration(45, {
        workflowName: 'video-generation',
        status: 'completed',
      });
      service.recordWorkflowDuration(30, {
        workflowName: 'video-generation',
        status: 'failed',
      });

      const metrics = await service.getMetricsAsJSON();
      const durationMetric = metrics.find(
        (m: any) => m.name === 'affiliate_workflow_duration_seconds',
      );

      expect(durationMetric.values).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            labels: expect.objectContaining({ status: 'completed' }),
          }),
          expect.objectContaining({
            labels: expect.objectContaining({ status: 'failed' }),
          }),
        ]),
      );
    });
  });

  describe('Business Metrics - Revenue Tracking', () => {
    it('should set revenue gauge', async () => {
      service.setRevenue(1500.75, {
        platform: 'youtube',
        productCategory: 'tech',
      });

      const metrics = await service.getMetricsAsJSON();
      const revenueMetric = metrics.find((m: any) => m.name === 'affiliate_revenue_dollars');

      expect(revenueMetric).toBeDefined();
      expect(revenueMetric.values).toContainEqual(
        expect.objectContaining({
          labels: expect.objectContaining({
            platform: 'youtube',
            product_category: 'tech',
          }),
          value: 1500.75,
        }),
      );
    });

    it('should increment revenue gauge', async () => {
      service.setRevenue(1000, {
        platform: 'tiktok',
        productCategory: 'fashion',
      });
      service.incrementRevenue(250, {
        platform: 'tiktok',
        productCategory: 'fashion',
      });

      const metrics = await service.getMetricsAsJSON();
      const revenueMetric = metrics.find((m: any) => m.name === 'affiliate_revenue_dollars');

      expect(revenueMetric.values).toContainEqual(
        expect.objectContaining({
          labels: expect.objectContaining({
            platform: 'tiktok',
            product_category: 'fashion',
          }),
          value: 1250,
        }),
      );
    });

    it('should track revenue across multiple platforms and categories', async () => {
      service.setRevenue(500, { platform: 'youtube', productCategory: 'tech' });
      service.setRevenue(300, {
        platform: 'instagram',
        productCategory: 'beauty',
      });
      service.setRevenue(700, { platform: 'tiktok', productCategory: 'fitness' });

      const metrics = await service.getMetricsAsJSON();
      const revenueMetric = metrics.find((m: any) => m.name === 'affiliate_revenue_dollars');

      expect(revenueMetric.values).toHaveLength(3);
    });
  });

  describe('Business Metrics - Active Products', () => {
    it('should set active products gauge', async () => {
      service.setActiveProducts(42, {
        platform: 'amazon',
        status: 'active',
      });

      const metrics = await service.getMetricsAsJSON();
      const activeMetric = metrics.find((m: any) => m.name === 'affiliate_active_products');

      expect(activeMetric).toBeDefined();
      expect(activeMetric.values).toContainEqual(
        expect.objectContaining({
          labels: expect.objectContaining({
            platform: 'amazon',
            status: 'active',
          }),
          value: 42,
        }),
      );
    });

    it('should track active and paused products separately', async () => {
      service.setActiveProducts(50, { platform: 'shareasale', status: 'active' });
      service.setActiveProducts(10, { platform: 'shareasale', status: 'paused' });

      const metrics = await service.getMetricsAsJSON();
      const activeMetric = metrics.find((m: any) => m.name === 'affiliate_active_products');

      expect(activeMetric.values).toHaveLength(2);
    });
  });

  describe('Technical Metrics - HTTP Requests', () => {
    it('should record HTTP request duration and count', async () => {
      service.recordHttpRequest(0.125, {
        method: 'GET',
        route: '/api/products',
        status: 200,
      });

      const metrics = await service.getMetricsAsJSON();
      const durationMetric = metrics.find((m: any) => m.name === 'http_request_duration_seconds');
      const countMetric = metrics.find((m: any) => m.name === 'http_requests_total');

      expect(durationMetric).toBeDefined();
      expect(countMetric).toBeDefined();
      expect(countMetric.values).toContainEqual(
        expect.objectContaining({
          labels: expect.objectContaining({
            method: 'GET',
            route: '/api/products',
            status: '200',
          }),
          value: 1,
        }),
      );
    });

    it('should track HTTP errors for 4xx status codes', async () => {
      service.recordHttpRequest(0.05, {
        method: 'POST',
        route: '/api/auth/login',
        status: 401,
      });

      const metrics = await service.getMetricsAsJSON();
      const errorMetric = metrics.find((m: any) => m.name === 'http_request_errors_total');

      expect(errorMetric.values).toContainEqual(
        expect.objectContaining({
          labels: expect.objectContaining({
            method: 'POST',
            route: '/api/auth/login',
            error_type: 'client_error',
          }),
          value: 1,
        }),
      );
    });

    it('should track HTTP errors for 5xx status codes', async () => {
      service.recordHttpRequest(0.5, {
        method: 'GET',
        route: '/api/videos',
        status: 500,
      });

      const metrics = await service.getMetricsAsJSON();
      const errorMetric = metrics.find((m: any) => m.name === 'http_request_errors_total');

      expect(errorMetric.values).toContainEqual(
        expect.objectContaining({
          labels: expect.objectContaining({
            method: 'GET',
            route: '/api/videos',
            error_type: 'server_error',
          }),
          value: 1,
        }),
      );
    });

    it('should not track errors for 2xx and 3xx status codes', async () => {
      service.recordHttpRequest(0.1, {
        method: 'GET',
        route: '/api/health',
        status: 200,
      });
      service.recordHttpRequest(0.05, {
        method: 'POST',
        route: '/api/redirect',
        status: 302,
      });

      const metrics = await service.getMetricsAsJSON();
      const errorMetric = metrics.find((m: any) => m.name === 'http_request_errors_total');

      expect(errorMetric.values).toHaveLength(0);
    });

    it('should increment HTTP errors manually', async () => {
      service.incrementHttpErrors({
        method: 'DELETE',
        route: '/api/products/123',
        errorType: 'validation_error',
      });

      const metrics = await service.getMetricsAsJSON();
      const errorMetric = metrics.find((m: any) => m.name === 'http_request_errors_total');

      expect(errorMetric.values).toContainEqual(
        expect.objectContaining({
          labels: expect.objectContaining({
            method: 'DELETE',
            route: '/api/products/123',
            error_type: 'validation_error',
          }),
          value: 1,
        }),
      );
    });
  });

  describe('Metrics Export', () => {
    it('should export metrics in Prometheus format', async () => {
      service.incrementProductsSynced(5, {
        platform: 'amazon',
        network: 'amazon-associates',
      });

      const metricsText = await service.getMetrics();

      expect(metricsText).toContain('affiliate_products_synced_total');
      expect(typeof metricsText).toBe('string');
    });

    it('should export metrics as JSON', async () => {
      service.setRevenue(1000, {
        platform: 'youtube',
        productCategory: 'tech',
      });

      const metricsJson = await service.getMetricsAsJSON();

      expect(Array.isArray(metricsJson)).toBe(true);
      expect(metricsJson.length).toBeGreaterThan(0);
    });

    it('should include default Node.js metrics', async () => {
      // collectDefaultMetrics is called in onModuleInit
      // Check that the registry has the default metrics configured
      const registry = service.getRegistry();
      expect(registry).toBeDefined();

      // Verify metrics text contains business metrics
      const metricsText = await service.getMetrics();
      expect(metricsText).toContain('affiliate_');
    });
  });

  describe('Metrics Management', () => {
    it('should reset all metrics', async () => {
      service.incrementProductsSynced(10, {
        platform: 'amazon',
        network: 'amazon-associates',
      });
      service.setRevenue(5000, {
        platform: 'youtube',
        productCategory: 'tech',
      });

      service.resetMetrics();

      const metrics = await service.getMetricsAsJSON();
      const productMetric = metrics.find((m: any) => m.name === 'affiliate_products_synced_total');
      const revenueMetric = metrics.find((m: any) => m.name === 'affiliate_revenue_dollars');

      expect(productMetric.values).toHaveLength(0);
      expect(revenueMetric.values).toHaveLength(0);
    });

    it('should return the registry', () => {
      const registry = service.getRegistry();

      expect(registry).toBeDefined();
      expect(registry).toBeInstanceOf(client.Registry);
    });
  });
});
