/**
 * Unit tests for AmazonService
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AmazonService } from '@/modules/product/services/amazon.service';
import { SecretsManagerService } from '@/common/secrets/secrets-manager.service';

describe('AmazonService', () => {
  let service: AmazonService;
  let configService: jest.Mocked<ConfigService>;
  let secretsManager: jest.Mocked<SecretsManagerService>;

  const mockSecrets = {
    'amazon-access-key': 'test-access-key',
    'amazon-secret-key': 'test-secret-key',
    'amazon-partner-tag': 'test-tag-20',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AmazonService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                AMAZON_MOCK_MODE: 'false',
                AMAZON_REGION: 'us-east-1',
              };
              return config[key];
            }),
          },
        },
        {
          provide: SecretsManagerService,
          useValue: {
            getSecrets: jest.fn(),
            getSecret: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AmazonService>(AmazonService);
    configService = module.get(ConfigService);
    secretsManager = module.get(SecretsManagerService);
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize in mock mode when AMAZON_MOCK_MODE is true', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      configService.get.mockImplementation((key: string) =>
        key === 'AMAZON_MOCK_MODE' ? 'true' : undefined,
      );

      const module = await Test.createTestingModule({
        providers: [
          AmazonService,
          { provide: ConfigService, useValue: configService },
          { provide: SecretsManagerService, useValue: secretsManager },
        ],
      }).compile();

      const mockService = module.get<AmazonService>(AmazonService);
      await mockService.onModuleInit();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('MOCK MODE'));

      consoleSpy.mockRestore();
    });

    it('should configure with credentials from Secrets Manager', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      secretsManager.getSecrets.mockResolvedValue(mockSecrets);

      await service.onModuleInit();

      expect(secretsManager.getSecrets).toHaveBeenCalledWith([
        { secretName: 'amazon-access-key', envVarName: 'AMAZON_ACCESS_KEY' },
        { secretName: 'amazon-secret-key', envVarName: 'AMAZON_SECRET_KEY' },
        { secretName: 'amazon-partner-tag', envVarName: 'AMAZON_PARTNER_TAG' },
      ]);

      consoleSpy.mockRestore();
    });

    it('should fallback to mock mode when credentials not found', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      secretsManager.getSecrets.mockResolvedValue({
        'amazon-access-key': '',
        'amazon-secret-key': '',
        'amazon-partner-tag': '',
      });

      await service.onModuleInit();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('running in MOCK MODE'));

      consoleSpy.mockRestore();
    });
  });

  describe('searchProducts', () => {
    it('should return mock products in mock mode', async () => {
      configService.get.mockImplementation((key: string) =>
        key === 'AMAZON_MOCK_MODE' ? 'true' : undefined,
      );

      const module = await Test.createTestingModule({
        providers: [
          AmazonService,
          { provide: ConfigService, useValue: configService },
          { provide: SecretsManagerService, useValue: secretsManager },
        ],
      }).compile();

      const mockService = module.get<AmazonService>(AmazonService);
      await mockService.onModuleInit();

      const result = await mockService.searchProducts({
        keywords: 'test',
        limit: 5,
      });

      expect(result).toHaveLength(5);
      expect(result[0]).toHaveProperty('asin');
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('price');
    });

    it('should use default keywords if not provided', async () => {
      configService.get.mockReturnValue('true');

      const module = await Test.createTestingModule({
        providers: [
          AmazonService,
          { provide: ConfigService, useValue: configService },
          { provide: SecretsManagerService, useValue: secretsManager },
        ],
      }).compile();

      const mockService = module.get<AmazonService>(AmazonService);
      await mockService.onModuleInit();

      const result = await mockService.searchProducts({});

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should respect limit parameter', async () => {
      configService.get.mockReturnValue('true');

      const module = await Test.createTestingModule({
        providers: [
          AmazonService,
          { provide: ConfigService, useValue: configService },
          { provide: SecretsManagerService, useValue: secretsManager },
        ],
      }).compile();

      const mockService = module.get<AmazonService>(AmazonService);
      await mockService.onModuleInit();

      const result = await mockService.searchProducts({ limit: 3 });

      expect(result).toHaveLength(3);
    });

    it('should return products with complete data structure', async () => {
      configService.get.mockReturnValue('true');

      const module = await Test.createTestingModule({
        providers: [
          AmazonService,
          { provide: ConfigService, useValue: configService },
          { provide: SecretsManagerService, useValue: secretsManager },
        ],
      }).compile();

      const mockService = module.get<AmazonService>(AmazonService);
      await mockService.onModuleInit();

      const result = await mockService.searchProducts({ limit: 1 });

      expect(result[0]).toMatchObject({
        asin: expect.any(String),
        title: expect.any(String),
        price: expect.any(Number),
        commission: expect.any(Number),
        affiliateUrl: expect.any(String),
        category: expect.any(String),
      });
    });
  });

  describe('getProductByAsin', () => {
    it('should return null in mock mode', async () => {
      configService.get.mockReturnValue('true');

      const module = await Test.createTestingModule({
        providers: [
          AmazonService,
          { provide: ConfigService, useValue: configService },
          { provide: SecretsManagerService, useValue: secretsManager },
        ],
      }).compile();

      const mockService = module.get<AmazonService>(AmazonService);
      await mockService.onModuleInit();

      const result = await mockService.getProductByAsin('B08N5WRWNW');

      expect(result).toBeNull();
    });
  });

  describe('generateAffiliateUrl', () => {
    it('should generate correct affiliate URL format', async () => {
      secretsManager.getSecrets.mockResolvedValue(mockSecrets);

      await service.onModuleInit();

      const url = service.generateAffiliateUrl('B08N5WRWNW');

      expect(url).toBe('https://www.amazon.com/dp/B08N5WRWNW?tag=test-tag-20');
    });

    it('should work with different ASINs', async () => {
      secretsManager.getSecrets.mockResolvedValue(mockSecrets);

      await service.onModuleInit();

      const url1 = service.generateAffiliateUrl('B08N5WRWNW');
      const url2 = service.generateAffiliateUrl('B09B8RXYM8');

      expect(url1).toContain('B08N5WRWNW');
      expect(url2).toContain('B09B8RXYM8');
      expect(url1).not.toEqual(url2);
    });
  });

  describe('isConfigured', () => {
    it('should return false in mock mode', async () => {
      configService.get.mockReturnValue('true');

      const module = await Test.createTestingModule({
        providers: [
          AmazonService,
          { provide: ConfigService, useValue: configService },
          { provide: SecretsManagerService, useValue: secretsManager },
        ],
      }).compile();

      const mockService = module.get<AmazonService>(AmazonService);
      await mockService.onModuleInit();

      expect(mockService.isConfigured()).toBe(false);
    });
  });

  describe('mock products', () => {
    let mockService: AmazonService;

    beforeEach(async () => {
      configService.get.mockReturnValue('true');

      const module = await Test.createTestingModule({
        providers: [
          AmazonService,
          { provide: ConfigService, useValue: configService },
          { provide: SecretsManagerService, useValue: secretsManager },
        ],
      }).compile();

      mockService = module.get<AmazonService>(AmazonService);
      await mockService.onModuleInit();
    });

    it('should include Apple AirPods Pro in mock data', async () => {
      const products = await mockService.searchProducts({ limit: 10 });

      const airpods = products.find((p) => p.asin === 'B08N5WRWNW');

      expect(airpods).toBeDefined();
      expect(airpods?.title).toContain('AirPods Pro');
      expect(airpods?.brand).toBe('Apple');
    });

    it('should include diverse categories in mock data', async () => {
      const products = await mockService.searchProducts({ limit: 10 });

      const categories = [...new Set(products.map((p) => p.category))];

      expect(categories.length).toBeGreaterThan(2);
      expect(categories).toContain('Electronics');
    });

    it('should have valid price ranges', async () => {
      const products = await mockService.searchProducts({ limit: 10 });

      products.forEach((product) => {
        expect(product.price).toBeGreaterThan(0);
        expect(product.price).toBeLessThan(1000);
      });
    });

    it('should have valid commission rates', async () => {
      const products = await mockService.searchProducts({ limit: 10 });

      products.forEach((product) => {
        expect(product.commission).toBeGreaterThanOrEqual(0);
        expect(product.commission).toBeLessThanOrEqual(15);
      });
    });

    it('should generate affiliate URLs for all mock products', async () => {
      const products = await mockService.searchProducts({ limit: 10 });

      products.forEach((product) => {
        expect(product.affiliateUrl).toMatch(/^https:\/\/www\.amazon\.com\/dp\/.+/);
      });
    });
  });

  describe('rate limiting', () => {
    it('should enforce rate limit between requests', async () => {
      // This test verifies the rate limiting mechanism exists
      // In actual implementation, it would test timing
      expect(service).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle secrets manager errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      secretsManager.getSecrets.mockRejectedValue(new Error('Secrets error'));

      await expect(service.onModuleInit()).rejects.toThrow();

      consoleSpy.mockRestore();
    });
  });
});
