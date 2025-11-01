/**
 * Unit tests for ContentService
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ContentService } from '@/modules/content/content.service';
import { PrismaService } from '@/common/database/prisma.service';
import { ScriptGeneratorService } from '@/modules/content/services/script-generator.service';
import { FtcDisclosureService } from '@/common/compliance/ftc-disclosure.service';
import { MockPrismaService, mockPrismaService } from '../../mocks/prisma.mock';

describe('ContentService', () => {
  let service: ContentService;
  let _prisma: MockPrismaService;
  let scriptGenerator: jest.Mocked<ScriptGeneratorService>;
  let ftcDisclosure: jest.Mocked<FtcDisclosureService>;

  const mockProduct = {
    id: 'prod-1',
    title: 'Test Product',
    description: 'Test description',
    price: 99.99,
    category: 'Electronics',
    affiliateUrl: 'https://example.com/affiliate',
    status: 'ACTIVE',
    network: { id: 'net-1', name: 'Amazon' },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockScriptContent = {
    script: 'This is a test script about the product',
    estimatedDuration: 60,
    hooks: ['Hook 1', 'Hook 2'],
    cta: 'Check link in description',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentService,
        {
          provide: PrismaService,
          useClass: MockPrismaService,
        },
        {
          provide: ScriptGeneratorService,
          useValue: {
            generate: jest.fn(),
          },
        },
        {
          provide: FtcDisclosureService,
          useValue: {
            addDisclosure: jest.fn((content) => content + ' [Disclosure]'),
          },
        },
      ],
    }).compile();

    service = module.get<ContentService>(ContentService);
    _prisma = module.get<MockPrismaService>(PrismaService);
    scriptGenerator = module.get(ScriptGeneratorService);
    ftcDisclosure = module.get(FtcDisclosureService);
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('generateScript', () => {
    it('should generate script for a product', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct as any);
      scriptGenerator.generate.mockResolvedValue(mockScriptContent as any);
      mockPrismaService.video.create.mockResolvedValue({
        id: 'video-1',
        script: mockScriptContent.script + ' [Disclosure]',
      } as any);

      const result = await service.generateScript({
        productId: 'prod-1',
      });

      expect(result).toBeDefined();
      expect(result.script).toBe(mockScriptContent.script);
      expect(result.estimatedDuration).toBe(60);
      expect(mockPrismaService.product.findUnique).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        include: { network: true },
      });
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.generateScript({ productId: 'non-existent' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should use default language and tone', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct as any);
      scriptGenerator.generate.mockResolvedValue(mockScriptContent as any);
      mockPrismaService.video.create.mockResolvedValue({ id: 'video-1' } as any);

      await service.generateScript({ productId: 'prod-1' });

      expect(scriptGenerator.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          language: 'en',
          tone: 'engaging',
        }),
      );
    });

    it('should use custom language and tone', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct as any);
      scriptGenerator.generate.mockResolvedValue(mockScriptContent as any);
      mockPrismaService.video.create.mockResolvedValue({ id: 'video-1' } as any);

      await service.generateScript({
        productId: 'prod-1',
        language: 'es',
        tone: 'professional',
      });

      expect(scriptGenerator.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          language: 'es',
          tone: 'professional',
        }),
      );
    });

    it('should add FTC disclosure to script', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct as any);
      scriptGenerator.generate.mockResolvedValue(mockScriptContent as any);
      mockPrismaService.video.create.mockResolvedValue({ id: 'video-1' } as any);

      await service.generateScript({ productId: 'prod-1' });

      expect(ftcDisclosure.addDisclosure).toHaveBeenCalledWith(
        mockScriptContent.script,
        'video',
        expect.objectContaining({
          enabled: true,
          position: 'bottom',
        }),
      );
    });

    it('should create video record with script', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct as any);
      scriptGenerator.generate.mockResolvedValue(mockScriptContent as any);
      mockPrismaService.video.create.mockResolvedValue({ id: 'video-1' } as any);

      await service.generateScript({ productId: 'prod-1' });

      expect(mockPrismaService.video.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          productId: 'prod-1',
          title: expect.stringContaining(mockProduct.title),
          script: expect.any(String),
          duration: mockScriptContent.estimatedDuration,
          language: 'en',
          status: 'PENDING',
        }),
      });
    });
  });

  describe('generateBlogPost', () => {
    it('should generate blog post for a product', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct as any);
      mockPrismaService.blog.create.mockResolvedValue({
        id: 'blog-1',
        title: 'Test Product Review: Is It Worth It?',
        slug: 'test-product-review-is-it-worth-it',
      } as any);

      const result = await service.generateBlogPost('prod-1');

      expect(result).toBeDefined();
      expect(mockPrismaService.blog.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.generateBlogPost('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should add FTC disclosure to blog content', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct as any);
      mockPrismaService.blog.create.mockResolvedValue({ id: 'blog-1' } as any);

      await service.generateBlogPost('prod-1');

      expect(ftcDisclosure.addDisclosure).toHaveBeenCalledWith(
        expect.any(String),
        'blog',
        expect.objectContaining({
          enabled: true,
          position: 'bottom',
        }),
      );
    });

    it('should generate slug from title', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct as any);
      mockPrismaService.blog.create.mockResolvedValue({ id: 'blog-1' } as any);

      await service.generateBlogPost('prod-1');

      expect(mockPrismaService.blog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          slug: expect.stringMatching(/^[a-z0-9-]+$/),
        }),
      });
    });

    it('should use custom language', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct as any);
      mockPrismaService.blog.create.mockResolvedValue({ id: 'blog-1' } as any);

      await service.generateBlogPost('prod-1', 'es');

      expect(mockPrismaService.blog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          language: 'es',
        }),
      });
    });

    it('should create blog with DRAFT status', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct as any);
      mockPrismaService.blog.create.mockResolvedValue({ id: 'blog-1' } as any);

      await service.generateBlogPost('prod-1');

      expect(mockPrismaService.blog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'DRAFT',
        }),
      });
    });
  });

  describe('getScriptsByProduct', () => {
    it('should get all scripts for a product', async () => {
      const mockVideos = [
        { id: 'video-1', script: 'Script 1' },
        { id: 'video-2', script: 'Script 2' },
      ];
      mockPrismaService.video.findMany.mockResolvedValue(mockVideos as any);

      const result = await service.getScriptsByProduct('prod-1');

      expect(result).toEqual(mockVideos);
      expect(mockPrismaService.video.findMany).toHaveBeenCalledWith({
        where: { productId: 'prod-1' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array if no scripts found', async () => {
      mockPrismaService.video.findMany.mockResolvedValue([]);

      const result = await service.getScriptsByProduct('prod-1');

      expect(result).toEqual([]);
    });
  });

  describe('listBlogs', () => {
    it('should list published blogs with pagination', async () => {
      const mockBlogs = [
        {
          id: 'blog-1',
          title: 'Blog 1',
          slug: 'blog-1',
          excerpt: 'Excerpt 1',
          createdAt: new Date(),
          product: { id: 'prod-1', title: 'Product 1' },
        },
      ];
      mockPrismaService.blog.findMany.mockResolvedValue(mockBlogs as any);
      mockPrismaService.blog.count.mockResolvedValue(1);

      const result = await service.listBlogs(1, 10);

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({
        currentPage: 1,
        totalPages: 1,
        totalItems: 1,
        itemsPerPage: 10,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it('should use default pagination values', async () => {
      mockPrismaService.blog.findMany.mockResolvedValue([]);
      mockPrismaService.blog.count.mockResolvedValue(0);

      await service.listBlogs();

      expect(mockPrismaService.blog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
        }),
      );
    });

    it('should calculate pagination correctly', async () => {
      mockPrismaService.blog.findMany.mockResolvedValue([]);
      mockPrismaService.blog.count.mockResolvedValue(25);

      const result = await service.listBlogs(2, 10);

      expect(result.meta.totalPages).toBe(3);
      expect(result.meta.hasNextPage).toBe(true);
      expect(result.meta.hasPreviousPage).toBe(true);
    });

    it('should only return published blogs', async () => {
      mockPrismaService.blog.findMany.mockResolvedValue([]);
      mockPrismaService.blog.count.mockResolvedValue(0);

      await service.listBlogs();

      expect(mockPrismaService.blog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'PUBLISHED' },
        }),
      );
    });
  });

  describe('slug generation', () => {
    it('should convert title to lowercase slug', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct as any);
      mockPrismaService.blog.create.mockResolvedValue({ id: 'blog-1' } as any);

      await service.generateBlogPost('prod-1');

      const createCall = mockPrismaService.blog.create.mock.calls[0][0];
      expect(createCall.data.slug).toMatch(/^[a-z0-9-]+$/);
    });

    it('should replace spaces with hyphens', async () => {
      const productWithSpaces = {
        ...mockProduct,
        title: 'Product With Many Spaces',
      };
      mockPrismaService.product.findUnique.mockResolvedValue(productWithSpaces as any);
      mockPrismaService.blog.create.mockResolvedValue({ id: 'blog-1' } as any);

      await service.generateBlogPost('prod-1');

      const createCall = mockPrismaService.blog.create.mock.calls[0][0];
      expect(createCall.data.slug).not.toContain(' ');
      expect(createCall.data.slug).toContain('-');
    });

    it('should remove special characters', async () => {
      const productWithSpecialChars = {
        ...mockProduct,
        title: 'Product!@#$%^&*()',
      };
      mockPrismaService.product.findUnique.mockResolvedValue(productWithSpecialChars as any);
      mockPrismaService.blog.create.mockResolvedValue({ id: 'blog-1' } as any);

      await service.generateBlogPost('prod-1');

      const createCall = mockPrismaService.blog.create.mock.calls[0][0];
      expect(createCall.data.slug).toMatch(/^[a-z0-9-]+$/);
    });
  });

  describe('console logging', () => {
    it('should log script generation', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct as any);
      scriptGenerator.generate.mockResolvedValue(mockScriptContent as any);
      mockPrismaService.video.create.mockResolvedValue({ id: 'video-1' } as any);

      await service.generateScript({ productId: 'prod-1' });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Generating script'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Script generated'));

      consoleSpy.mockRestore();
    });

    it('should log blog generation', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct as any);
      mockPrismaService.blog.create.mockResolvedValue({ id: 'blog-1' } as any);

      await service.generateBlogPost('prod-1');

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Generating blog post'));

      consoleSpy.mockRestore();
    });
  });
});
