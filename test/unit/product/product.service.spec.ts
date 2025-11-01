/**
 * Unit tests for ProductService
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProductService } from '@/modules/product/product.service';
import { PrismaService } from '@/common/database/prisma.service';
import { ProductRanker } from '@/modules/product/services/product-ranker.service';
import { AmazonService } from '@/modules/product/services/amazon.service';
import { MockPrismaService, mockPrismaService } from '../../mocks/prisma.mock';
import { CreateProductDto } from '@/modules/product/dto/create-product.dto';
import { GetProductsDto } from '@/modules/product/dto/get-products.dto';

describe('ProductService', () => {
  let service: ProductService;
  let _prisma: MockPrismaService;
  let ranker: jest.Mocked<ProductRanker>;
  let amazonService: jest.Mocked<AmazonService>;

  const mockNetwork = {
    id: 'net-1',
    name: 'Amazon Associates',
    commissionRate: 3.0,
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProduct = {
    id: 'prod-1',
    asin: 'B08N5WRWNW',
    externalId: null,
    title: 'Test Product',
    description: 'Test description',
    price: 99.99,
    currency: 'USD',
    commission: 5.0,
    commissionType: 'percentage',
    affiliateUrl: 'https://amazon.com/dp/test',
    imageUrl: 'https://example.com/image.jpg',
    category: 'Electronics',
    brand: 'TestBrand',
    networkId: 'net-1',
    status: 'ACTIVE',
    trendScore: 0.8,
    profitScore: 0.7,
    viralityScore: 0.6,
    overallScore: 0.7,
    lastRankedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRankingScores = {
    trendScore: 0.8,
    profitScore: 0.7,
    viralityScore: 0.6,
    overallScore: 0.7,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: PrismaService,
          useClass: MockPrismaService,
        },
        {
          provide: ProductRanker,
          useValue: {
            calculateScores: jest.fn(),
            rankProducts: jest.fn(),
          },
        },
        {
          provide: AmazonService,
          useValue: {
            searchProducts: jest.fn(),
            getProductByAsin: jest.fn(),
            generateAffiliateUrl: jest.fn(),
            isConfigured: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    _prisma = module.get<MockPrismaService>(PrismaService);
    ranker = module.get(ProductRanker);
    amazonService = module.get(AmazonService);
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('getRankedProducts', () => {
    it('should return ranked products with default parameters', async () => {
      const products = [mockProduct, { ...mockProduct, id: 'prod-2' }];
      mockPrismaService.product.findMany.mockResolvedValue(products as any);

      const query: GetProductsDto = {};
      const result = await service.getRankedProducts(query);

      expect(result).toEqual(products);
      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith({
        where: {
          status: 'ACTIVE',
        },
        include: {
          network: true,
        },
        orderBy: {
          overallScore: 'desc',
        },
        take: 10,
      });
    });

    it('should filter by category when provided', async () => {
      const products = [mockProduct];
      mockPrismaService.product.findMany.mockResolvedValue(products as any);

      const query: GetProductsDto = { category: 'Electronics' };
      await service.getRankedProducts(query);

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith({
        where: {
          status: 'ACTIVE',
          category: 'Electronics',
        },
        include: {
          network: true,
        },
        orderBy: {
          overallScore: 'desc',
        },
        take: 10,
      });
    });

    it('should filter by status when provided', async () => {
      const products = [mockProduct];
      mockPrismaService.product.findMany.mockResolvedValue(products as any);

      const query: GetProductsDto = { status: 'PAUSED' };
      await service.getRankedProducts(query);

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith({
        where: {
          status: 'PAUSED',
        },
        include: {
          network: true,
        },
        orderBy: {
          overallScore: 'desc',
        },
        take: 10,
      });
    });

    it('should respect custom limit', async () => {
      const products = [mockProduct];
      mockPrismaService.product.findMany.mockResolvedValue(products as any);

      const query: GetProductsDto = { limit: 25 };
      await service.getRankedProducts(query);

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 25,
        }),
      );
    });

    it('should return empty array when no products found', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);

      const query: GetProductsDto = {};
      const result = await service.getRankedProducts(query);

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should find product by id with all relations', async () => {
      const productWithRelations = {
        ...mockProduct,
        network: mockNetwork,
        videos: [{ id: 'vid-1', title: 'Video 1' }],
        blogs: [{ id: 'blog-1', title: 'Blog 1' }],
        analytics: [{ id: 'ana-1', date: new Date() }],
      };

      mockPrismaService.product.findUnique.mockResolvedValue(productWithRelations as any);

      const result = await service.findById('prod-1');

      expect(result).toEqual(productWithRelations);
      expect(mockPrismaService.product.findUnique).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        include: {
          network: true,
          videos: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
          blogs: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
          analytics: {
            orderBy: { date: 'desc' },
            take: 30,
          },
        },
      });
    });

    it('should throw NotFoundException when product not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
      await expect(service.findById('non-existent')).rejects.toThrow(
        'Product with ID non-existent not found',
      );
    });
  });

  describe('create', () => {
    const createDto: CreateProductDto = {
      asin: 'B08N5WRWNW',
      title: 'New Product',
      description: 'Test description',
      price: 99.99,
      commission: 5.0,
      affiliateUrl: 'https://amazon.com/dp/test',
      category: 'Electronics',
      networkId: 'net-1',
    };

    it('should create product with provided data', async () => {
      mockPrismaService.product.create.mockResolvedValue(mockProduct as any);
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct as any);
      mockPrismaService.product.update.mockResolvedValue(mockProduct as any);
      ranker.calculateScores.mockResolvedValue(mockRankingScores);

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(mockPrismaService.product.create).toHaveBeenCalledWith({
        data: {
          ...createDto,
          status: 'ACTIVE',
        },
        include: {
          network: true,
        },
      });
    });

    it('should use provided status', async () => {
      mockPrismaService.product.create.mockResolvedValue(mockProduct as any);
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct as any);
      mockPrismaService.product.update.mockResolvedValue(mockProduct as any);
      ranker.calculateScores.mockResolvedValue(mockRankingScores);

      const dtoWithStatus = { ...createDto, status: 'PAUSED' };
      await service.create(dtoWithStatus);

      expect(mockPrismaService.product.create).toHaveBeenCalledWith({
        data: {
          ...createDto,
          status: 'PAUSED',
        },
        include: {
          network: true,
        },
      });
    });

    it('should rank product after creation', async () => {
      mockPrismaService.product.create.mockResolvedValue(mockProduct as any);
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct as any);
      mockPrismaService.product.update.mockResolvedValue(mockProduct as any);
      ranker.calculateScores.mockResolvedValue(mockRankingScores);

      await service.create(createDto);

      expect(ranker.calculateScores).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockProduct.id,
        }),
      );
    });

    it('should handle creation errors', async () => {
      mockPrismaService.product.create.mockRejectedValue(new Error('Database error'));

      await expect(service.create(createDto)).rejects.toThrow('Database error');
    });
  });

  describe('syncFromAmazon', () => {
    const mockAmazonProducts = [
      {
        asin: 'B08N5WRWNW',
        title: 'Amazon Product 1',
        description: 'Description 1',
        price: 99.99,
        commission: 4.0,
        affiliateUrl: 'https://amazon.com/dp/B08N5WRWNW',
        imageUrl: 'https://example.com/img1.jpg',
        category: 'Electronics',
        brand: 'Brand1',
      },
      {
        asin: 'B09B8RXYM8',
        title: 'Amazon Product 2',
        description: 'Description 2',
        price: 49.99,
        commission: 6.0,
        affiliateUrl: 'https://amazon.com/dp/B09B8RXYM8',
        imageUrl: 'https://example.com/img2.jpg',
        category: 'Electronics',
        brand: 'Brand2',
      },
    ];

    it('should sync new products from Amazon', async () => {
      amazonService.searchProducts.mockResolvedValue(mockAmazonProducts);
      mockPrismaService.affiliateNetwork.findUnique.mockResolvedValue(mockNetwork as any);
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.product.createMany.mockResolvedValue({ count: 2 } as any);
      mockPrismaService.product.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([mockProduct, { ...mockProduct, id: 'prod-2' }] as any);
      ranker.calculateScores.mockResolvedValue(mockRankingScores);
      mockPrismaService.$transaction.mockImplementation((fn: any) =>
        Promise.resolve(Array.isArray(fn) ? fn.map(() => mockProduct) : fn()),
      );

      const result = await service.syncFromAmazon('Electronics', 'trending');

      expect(amazonService.searchProducts).toHaveBeenCalledWith({
        keywords: 'trending',
        category: 'Electronics',
      });
      expect(result.synced).toBe(2);
    });

    it('should create Amazon network if not exists', async () => {
      amazonService.searchProducts.mockResolvedValue(mockAmazonProducts);
      mockPrismaService.affiliateNetwork.findUnique.mockResolvedValue(null);
      mockPrismaService.affiliateNetwork.create.mockResolvedValue(mockNetwork as any);
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.product.createMany.mockResolvedValue({ count: 2 } as any);
      mockPrismaService.product.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([mockProduct] as any);
      ranker.calculateScores.mockResolvedValue(mockRankingScores);
      mockPrismaService.$transaction.mockImplementation((fn: any) =>
        Promise.resolve(Array.isArray(fn) ? fn.map(() => mockProduct) : fn()),
      );

      await service.syncFromAmazon();

      expect(mockPrismaService.affiliateNetwork.create).toHaveBeenCalledWith({
        data: {
          name: 'Amazon Associates',
          commissionRate: 3.0,
          status: 'ACTIVE',
        },
      });
    });

    it('should skip existing products by ASIN', async () => {
      const existingProduct = { asin: 'B08N5WRWNW' };
      amazonService.searchProducts.mockResolvedValue(mockAmazonProducts);
      mockPrismaService.affiliateNetwork.findUnique.mockResolvedValue(mockNetwork as any);
      mockPrismaService.product.findMany
        .mockResolvedValueOnce([existingProduct] as any)
        .mockResolvedValueOnce([mockProduct] as any);
      mockPrismaService.product.createMany.mockResolvedValue({ count: 1 } as any);
      ranker.calculateScores.mockResolvedValue(mockRankingScores);
      mockPrismaService.$transaction.mockImplementation((fn: any) =>
        Promise.resolve(Array.isArray(fn) ? fn.map(() => mockProduct) : fn()),
      );

      const result = await service.syncFromAmazon();

      expect(result.synced).toBe(1);
    });

    it('should return zero synced when no new products', async () => {
      const existingProducts = mockAmazonProducts.map((p) => ({ asin: p.asin }));
      amazonService.searchProducts.mockResolvedValue(mockAmazonProducts);
      mockPrismaService.affiliateNetwork.findUnique.mockResolvedValue(mockNetwork as any);
      mockPrismaService.product.findMany.mockResolvedValue(existingProducts as any);

      const result = await service.syncFromAmazon();

      expect(result.synced).toBe(0);
      expect(result.products).toEqual([]);
    });

    it('should use default keywords when not provided', async () => {
      amazonService.searchProducts.mockResolvedValue([]);
      mockPrismaService.affiliateNetwork.findUnique.mockResolvedValue(mockNetwork as any);
      mockPrismaService.product.findMany.mockResolvedValue([]);

      await service.syncFromAmazon();

      expect(amazonService.searchProducts).toHaveBeenCalledWith({
        keywords: 'trending',
        category: undefined,
      });
    });

    it('should rank all synced products', async () => {
      amazonService.searchProducts.mockResolvedValue(mockAmazonProducts);
      mockPrismaService.affiliateNetwork.findUnique.mockResolvedValue(mockNetwork as any);
      mockPrismaService.product.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([mockProduct, { ...mockProduct, id: 'prod-2' }] as any);
      mockPrismaService.product.createMany.mockResolvedValue({ count: 2 } as any);
      ranker.calculateScores.mockResolvedValue(mockRankingScores);
      mockPrismaService.$transaction.mockImplementation((fn: any) =>
        Promise.resolve(Array.isArray(fn) ? fn.map(() => mockProduct) : fn()),
      );

      await service.syncFromAmazon();

      expect(ranker.calculateScores).toHaveBeenCalledTimes(2);
    });

    it('should handle ranking errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      amazonService.searchProducts.mockResolvedValue([mockAmazonProducts[0]]);
      mockPrismaService.affiliateNetwork.findUnique.mockResolvedValue(mockNetwork as any);
      mockPrismaService.product.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([mockProduct] as any);
      mockPrismaService.product.createMany.mockResolvedValue({ count: 1 } as any);
      ranker.calculateScores.mockRejectedValue(new Error('Ranking failed'));
      mockPrismaService.$transaction.mockImplementation((fn: any) =>
        Promise.resolve(Array.isArray(fn) ? [] : fn()),
      );

      await service.syncFromAmazon();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error ranking product'),
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('rankProduct', () => {
    it('should rank single product successfully', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct as any);
      mockPrismaService.product.update.mockResolvedValue(mockProduct as any);
      ranker.calculateScores.mockResolvedValue(mockRankingScores);

      const result = await service.rankProduct('prod-1');

      expect(ranker.calculateScores).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'prod-1',
          price: mockProduct.price,
          commission: mockProduct.commission,
        }),
      );
      expect(mockPrismaService.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: {
          trendScore: mockRankingScores.trendScore,
          profitScore: mockRankingScores.profitScore,
          viralityScore: mockRankingScores.viralityScore,
          overallScore: mockRankingScores.overallScore,
          lastRankedAt: expect.any(Date),
        },
      });
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when product not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.rankProduct('non-existent')).rejects.toThrow(NotFoundException);
      await expect(service.rankProduct('non-existent')).rejects.toThrow(
        'Product with ID non-existent not found',
      );
    });

    it('should handle products with null category and brand', async () => {
      const productNoOptionals = { ...mockProduct, category: null, brand: null };
      mockPrismaService.product.findUnique.mockResolvedValue(productNoOptionals as any);
      mockPrismaService.product.update.mockResolvedValue(productNoOptionals as any);
      ranker.calculateScores.mockResolvedValue(mockRankingScores);

      await service.rankProduct('prod-1');

      expect(ranker.calculateScores).toHaveBeenCalledWith(
        expect.objectContaining({
          category: undefined,
          brand: undefined,
        }),
      );
    });
  });

  describe('rankAllProducts', () => {
    it('should rank all active products', async () => {
      const products = [
        mockProduct,
        { ...mockProduct, id: 'prod-2' },
        { ...mockProduct, id: 'prod-3' },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(products as any);
      ranker.calculateScores.mockResolvedValue(mockRankingScores);
      mockPrismaService.$transaction.mockImplementation((fn: any) =>
        Promise.resolve(Array.isArray(fn) ? fn.map(() => mockProduct) : fn()),
      );

      await service.rankAllProducts();

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith({
        where: { status: 'ACTIVE' },
      });
      expect(ranker.calculateScores).toHaveBeenCalledTimes(3);
    });

    it('should use transaction for bulk updates', async () => {
      const products = [mockProduct, { ...mockProduct, id: 'prod-2' }];

      mockPrismaService.product.findMany.mockResolvedValue(products as any);
      ranker.calculateScores.mockResolvedValue(mockRankingScores);
      mockPrismaService.$transaction.mockImplementation((fn: any) =>
        Promise.resolve(Array.isArray(fn) ? fn.map(() => mockProduct) : fn()),
      );

      await service.rankAllProducts();

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should handle errors for individual products', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const products = [mockProduct, { ...mockProduct, id: 'prod-2' }];

      mockPrismaService.product.findMany.mockResolvedValue(products as any);
      ranker.calculateScores
        .mockResolvedValueOnce(mockRankingScores)
        .mockRejectedValueOnce(new Error('Ranking failed'));
      mockPrismaService.$transaction.mockImplementation((fn: any) =>
        Promise.resolve(Array.isArray(fn) ? [mockProduct] : fn()),
      );

      await service.rankAllProducts();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error ranking product'),
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle empty product list', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);

      await service.rankAllProducts();

      expect(ranker.calculateScores).not.toHaveBeenCalled();
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });

    it('should not update if all rankings fail', async () => {
      jest.spyOn(console, 'error').mockImplementation();
      const products = [mockProduct];

      mockPrismaService.product.findMany.mockResolvedValue(products as any);
      ranker.calculateScores.mockRejectedValue(new Error('Ranking failed'));

      await service.rankAllProducts();

      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('console logging', () => {
    it('should log sync progress', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      amazonService.searchProducts.mockResolvedValue([]);
      mockPrismaService.affiliateNetwork.findUnique.mockResolvedValue(mockNetwork as any);
      mockPrismaService.product.findMany.mockResolvedValue([]);

      await service.syncFromAmazon();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Syncing products from Amazon'),
      );

      consoleSpy.mockRestore();
    });

    it('should log ranking progress', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      mockPrismaService.product.findMany.mockResolvedValue([mockProduct] as any);
      ranker.calculateScores.mockResolvedValue(mockRankingScores);
      mockPrismaService.$transaction.mockImplementation((fn: any) =>
        Promise.resolve(Array.isArray(fn) ? fn.map(() => mockProduct) : fn()),
      );

      await service.rankAllProducts();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Ranking'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('All products ranked'));

      consoleSpy.mockRestore();
    });
  });
});
