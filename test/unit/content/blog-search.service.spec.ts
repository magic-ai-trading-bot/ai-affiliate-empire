/**
 * Unit tests for BlogSearchService
 * Coverage: Blog search, filtering, sorting, relevance scoring, suggestions, categories
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BlogSearchService, SearchResult } from '@/modules/content/services/blog-search.service';
import { PrismaService } from '@/common/database/prisma.service';
import { SearchBlogDto, BlogSortBy } from '@/modules/content/dto/search-blog.dto';
import { MockPrismaService, mockPrismaService } from '../../../test/mocks/prisma.mock';

describe('BlogSearchService', () => {
  let service: BlogSearchService;
  let prisma: MockPrismaService;

  const mockBlog = {
    id: 'blog-1',
    title: 'Best Wireless Headphones 2024',
    slug: 'best-wireless-headphones-2024',
    excerpt: 'Discover the top wireless headphones for music lovers',
    content: 'Detailed review of wireless headphones with noise cancellation...',
    metaTitle: 'Best Wireless Headphones - Expert Reviews',
    metaDescription: 'Find the perfect wireless headphones with our comprehensive guide',
    keywords: 'wireless headphones, bluetooth, noise cancellation',
    status: 'PUBLISHED',
    publishedAt: new Date('2024-01-15'),
    product: {
      id: 'prod-1',
      title: 'Sony WH-1000XM5',
      category: 'Electronics',
      imageUrl: 'https://example.com/image.jpg',
    },
  };

  const mockBlogs = [
    mockBlog,
    {
      ...mockBlog,
      id: 'blog-2',
      title: 'Gaming Headphones Guide',
      slug: 'gaming-headphones-guide',
      keywords: 'gaming headphones, surround sound',
      publishedAt: new Date('2024-01-20'),
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlogSearchService,
        {
          provide: PrismaService,
          useClass: MockPrismaService,
        },
      ],
    }).compile();

    service = module.get<BlogSearchService>(BlogSearchService);
    prisma = module.get<MockPrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have PrismaService injected', () => {
      expect(prisma).toBeDefined();
    });
  });

  describe('search - basic functionality', () => {
    it('should search blogs by query', async () => {
      mockPrismaService.blog.findMany.mockResolvedValue([mockBlog] as any);
      mockPrismaService.blog.count.mockResolvedValue(1);

      const dto: SearchBlogDto = { q: 'wireless' };
      const result = await service.search(dto);

      expect(result.results).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.query).toBe('wireless');
    });

    it('should search across title, content, excerpt, keywords, meta description', async () => {
      mockPrismaService.blog.findMany.mockResolvedValue([]);
      mockPrismaService.blog.count.mockResolvedValue(0);

      await service.search({ q: 'test query' });

      expect(mockPrismaService.blog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                OR: expect.arrayContaining([
                  { title: { contains: 'test query', mode: 'insensitive' } },
                  { content: { contains: 'test query', mode: 'insensitive' } },
                  { excerpt: { contains: 'test query', mode: 'insensitive' } },
                  { keywords: { contains: 'test query', mode: 'insensitive' } },
                  { metaDescription: { contains: 'test query', mode: 'insensitive' } },
                ]),
              }),
            ]),
          }),
        })
      );
    });

    it('should only return published blogs', async () => {
      mockPrismaService.blog.findMany.mockResolvedValue([]);
      mockPrismaService.blog.count.mockResolvedValue(0);

      await service.search({ q: 'test' });

      expect(mockPrismaService.blog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'PUBLISHED',
          }),
        })
      );
    });

    it('should use default pagination (page 1, limit 10)', async () => {
      mockPrismaService.blog.findMany.mockResolvedValue([]);
      mockPrismaService.blog.count.mockResolvedValue(0);

      const result = await service.search({ q: 'test' });

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(mockPrismaService.blog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
        })
      );
    });

    it('should apply custom pagination', async () => {
      mockPrismaService.blog.findMany.mockResolvedValue([]);
      mockPrismaService.blog.count.mockResolvedValue(0);

      await service.search({ q: 'test', page: 3, limit: 20 });

      expect(mockPrismaService.blog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 40, // (3-1) * 20
          take: 20,
        })
      );
    });

    it('should include product details in results', async () => {
      mockPrismaService.blog.findMany.mockResolvedValue([mockBlog] as any);
      mockPrismaService.blog.count.mockResolvedValue(1);

      await service.search({ q: 'test' });

      expect(mockPrismaService.blog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            product: {
              select: {
                id: true,
                title: true,
                category: true,
                imageUrl: true,
              },
            },
          },
        })
      );
    });
  });

  describe('search - filtering', () => {
    it('should filter by category', async () => {
      mockPrismaService.blog.findMany.mockResolvedValue([]);
      mockPrismaService.blog.count.mockResolvedValue(0);

      await service.search({ q: 'test', category: 'Electronics' });

      expect(mockPrismaService.blog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            product: { category: { equals: 'Electronics', mode: 'insensitive' } },
          }),
        })
      );
    });

    it('should filter by single tag', async () => {
      mockPrismaService.blog.findMany.mockResolvedValue([]);
      mockPrismaService.blog.count.mockResolvedValue(0);

      await service.search({ q: 'test', tags: 'bluetooth' });

      expect(mockPrismaService.blog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                OR: [{ keywords: { contains: 'bluetooth', mode: 'insensitive' } }],
              }),
            ]),
          }),
        })
      );
    });

    it('should filter by multiple tags', async () => {
      mockPrismaService.blog.findMany.mockResolvedValue([]);
      mockPrismaService.blog.count.mockResolvedValue(0);

      await service.search({ q: 'test', tags: 'bluetooth, wireless, headphones' });

      expect(mockPrismaService.blog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                OR: [
                  { keywords: { contains: 'bluetooth', mode: 'insensitive' } },
                  { keywords: { contains: 'wireless', mode: 'insensitive' } },
                  { keywords: { contains: 'headphones', mode: 'insensitive' } },
                ],
              }),
            ]),
          }),
        })
      );
    });

    it('should combine category and tags filters', async () => {
      mockPrismaService.blog.findMany.mockResolvedValue([]);
      mockPrismaService.blog.count.mockResolvedValue(0);

      await service.search({
        q: 'test',
        category: 'Electronics',
        tags: 'bluetooth',
      });

      const call = mockPrismaService.blog.findMany.mock.calls[0][0];
      expect(call.where).toHaveProperty('product');
      expect(call.where.AND).toBeDefined();
    });
  });

  describe('search - sorting', () => {
    it('should sort by recent (publishedAt desc) by default', async () => {
      mockPrismaService.blog.findMany.mockResolvedValue([]);
      mockPrismaService.blog.count.mockResolvedValue(0);

      await service.search({ q: 'test' });

      expect(mockPrismaService.blog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { publishedAt: 'desc' },
        })
      );
    });

    it('should sort by recent when explicitly requested', async () => {
      mockPrismaService.blog.findMany.mockResolvedValue([]);
      mockPrismaService.blog.count.mockResolvedValue(0);

      await service.search({ q: 'test', sortBy: BlogSortBy.RECENT });

      expect(mockPrismaService.blog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { publishedAt: 'desc' },
        })
      );
    });

    it('should handle POPULAR sort (fallback to recent for now)', async () => {
      mockPrismaService.blog.findMany.mockResolvedValue([]);
      mockPrismaService.blog.count.mockResolvedValue(0);

      await service.search({ q: 'test', sortBy: BlogSortBy.POPULAR });

      expect(mockPrismaService.blog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { publishedAt: 'desc' },
        })
      );
    });

    it('should sort by relevance when requested', async () => {
      mockPrismaService.blog.findMany.mockResolvedValue(mockBlogs as any);
      mockPrismaService.blog.count.mockResolvedValue(2);

      const result = await service.search({ q: 'wireless', sortBy: BlogSortBy.RELEVANCE });

      expect(result.results).toBeDefined();
      expect(result.results[0]).toHaveProperty('relevanceScore');
    });
  });

  describe('relevance scoring', () => {
    it('should calculate relevance scores for all results', async () => {
      mockPrismaService.blog.findMany.mockResolvedValue([mockBlog] as any);
      mockPrismaService.blog.count.mockResolvedValue(1);

      const result = await service.search({ q: 'wireless' });

      expect(result.results[0].relevanceScore).toBeDefined();
      expect(result.results[0].relevanceScore).toBeGreaterThan(0);
    });

    it('should score title matches highest (weight 5)', async () => {
      const blog = {
        ...mockBlog,
        title: 'Wireless headphones',
        excerpt: null,
        keywords: null,
        content: 'Content without query',
      };
      mockPrismaService.blog.findMany.mockResolvedValue([blog] as any);
      mockPrismaService.blog.count.mockResolvedValue(1);

      const result = await service.search({ q: 'wireless' });

      expect(result.results[0].relevanceScore).toBeGreaterThanOrEqual(5);
    });

    it('should score keyword matches (weight 4)', async () => {
      const blog = {
        ...mockBlog,
        title: 'Test',
        excerpt: null,
        keywords: 'wireless, bluetooth',
        content: 'test',
      };
      mockPrismaService.blog.findMany.mockResolvedValue([blog] as any);
      mockPrismaService.blog.count.mockResolvedValue(1);

      const result = await service.search({ q: 'wireless' });

      expect(result.results[0].relevanceScore).toBeGreaterThanOrEqual(4);
    });

    it('should score excerpt matches (weight 3)', async () => {
      const blog = {
        ...mockBlog,
        title: 'Test',
        excerpt: 'Find wireless options',
        keywords: null,
        content: 'test',
      };
      mockPrismaService.blog.findMany.mockResolvedValue([blog] as any);
      mockPrismaService.blog.count.mockResolvedValue(1);

      const result = await service.search({ q: 'wireless' });

      expect(result.results[0].relevanceScore).toBeGreaterThanOrEqual(3);
    });

    it('should score content matches (weight 1 per match, max 5)', async () => {
      const blog = {
        ...mockBlog,
        title: 'Test',
        excerpt: null,
        keywords: null,
        content: 'wireless wireless wireless wireless wireless wireless',
      };
      mockPrismaService.blog.findMany.mockResolvedValue([blog] as any);
      mockPrismaService.blog.count.mockResolvedValue(1);

      const result = await service.search({ q: 'wireless' });

      expect(result.results[0].relevanceScore).toBeLessThanOrEqual(5);
    });

    it('should combine multiple match types', async () => {
      const blog = {
        ...mockBlog,
        title: 'Wireless headphones',
        excerpt: 'Best wireless options',
        keywords: 'wireless',
        content: 'wireless wireless',
      };
      mockPrismaService.blog.findMany.mockResolvedValue([blog] as any);
      mockPrismaService.blog.count.mockResolvedValue(1);

      const result = await service.search({ q: 'wireless' });

      // Title (5) + excerpt (3) + keywords (4) + content (2) = 14
      expect(result.results[0].relevanceScore).toBeGreaterThanOrEqual(10);
    });

    it('should be case insensitive', async () => {
      const blog = {
        ...mockBlog,
        title: 'WIRELESS HEADPHONES',
        excerpt: null,
        keywords: null,
        content: 'test',
      };
      mockPrismaService.blog.findMany.mockResolvedValue([blog] as any);
      mockPrismaService.blog.count.mockResolvedValue(1);

      const result = await service.search({ q: 'wireless' });

      expect(result.results[0].relevanceScore).toBeGreaterThan(0);
    });
  });

  describe('pagination metadata', () => {
    it('should calculate total pages correctly', async () => {
      mockPrismaService.blog.findMany.mockResolvedValue([]);
      mockPrismaService.blog.count.mockResolvedValue(25);

      const result = await service.search({ q: 'test', limit: 10 });

      expect(result.totalPages).toBe(3); // 25 / 10 = 3
    });

    it('should set hasMore to true when more pages exist', async () => {
      mockPrismaService.blog.findMany.mockResolvedValue([]);
      mockPrismaService.blog.count.mockResolvedValue(30);

      const result = await service.search({ q: 'test', page: 1, limit: 10 });

      expect(result.hasMore).toBe(true);
    });

    it('should set hasMore to false on last page', async () => {
      mockPrismaService.blog.findMany.mockResolvedValue([]);
      mockPrismaService.blog.count.mockResolvedValue(25);

      const result = await service.search({ q: 'test', page: 3, limit: 10 });

      expect(result.hasMore).toBe(false);
    });

    it('should return correct page number', async () => {
      mockPrismaService.blog.findMany.mockResolvedValue([]);
      mockPrismaService.blog.count.mockResolvedValue(0);

      const result = await service.search({ q: 'test', page: 5 });

      expect(result.page).toBe(5);
    });
  });

  describe('getSuggestions', () => {
    it('should return search suggestions based on query', async () => {
      const blogsWithKeywords = [
        {
          title: 'Test',
          keywords: 'wireless headphones, bluetooth headphones',
        },
        {
          title: 'Test 2',
          keywords: 'wireless speakers, wifi',
        },
      ];
      mockPrismaService.blog.findMany.mockResolvedValue(blogsWithKeywords as any);

      const suggestions = await service.getSuggestions('wireless');

      expect(suggestions).toBeDefined();
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should extract keywords from matching blogs', async () => {
      mockPrismaService.blog.findMany.mockResolvedValue([
        { title: 'Test', keywords: 'wireless headphones' },
      ] as any);

      const suggestions = await service.getSuggestions('wireless');

      expect(suggestions).toContain('wireless headphones');
    });

    it('should limit suggestions to 5', async () => {
      const manyKeywords = Array(10)
        .fill(null)
        .map((_, i) => ({
          title: `Test ${i}`,
          keywords: `wireless${i}, bluetooth${i}`,
        }));
      mockPrismaService.blog.findMany.mockResolvedValue(manyKeywords as any);

      const suggestions = await service.getSuggestions('wireless');

      expect(suggestions.length).toBeLessThanOrEqual(5);
    });

    it('should return unique suggestions', async () => {
      mockPrismaService.blog.findMany.mockResolvedValue([
        { title: 'Test', keywords: 'wireless, wireless, bluetooth' },
      ] as any);

      const suggestions = await service.getSuggestions('wireless');

      const uniqueSuggestions = new Set(suggestions);
      expect(suggestions.length).toBe(uniqueSuggestions.size);
    });

    it('should handle blogs without keywords', async () => {
      mockPrismaService.blog.findMany.mockResolvedValue([
        { title: 'Test', keywords: null },
      ] as any);

      const suggestions = await service.getSuggestions('wireless');

      expect(suggestions).toEqual([]);
    });
  });

  describe('getPopularSearches', () => {
    it('should return popular searches from categories and keywords', async () => {
      mockPrismaService.blog.findMany.mockResolvedValue([
        {
          ...mockBlog,
          keywords: 'wireless, bluetooth',
          product: { category: 'Electronics' },
        },
      ] as any);

      const popular = await service.getPopularSearches();

      expect(popular).toBeDefined();
      expect(popular.length).toBeGreaterThan(0);
    });

    it('should limit results to specified limit', async () => {
      mockPrismaService.blog.findMany.mockResolvedValue([mockBlog] as any);

      const popular = await service.getPopularSearches(5);

      expect(popular.length).toBeLessThanOrEqual(5);
    });

    it('should count category frequency', async () => {
      const blogs = [
        { ...mockBlog, product: { category: 'Electronics' } },
        { ...mockBlog, product: { category: 'Electronics' } },
        { ...mockBlog, product: { category: 'Fashion' } },
      ];
      mockPrismaService.blog.findMany.mockResolvedValue(blogs as any);

      const popular = await service.getPopularSearches();

      expect(popular).toContain('Electronics');
    });

    it('should count keyword frequency', async () => {
      const blogs = [
        { ...mockBlog, keywords: 'wireless, bluetooth' },
        { ...mockBlog, keywords: 'wireless, headphones' },
      ];
      mockPrismaService.blog.findMany.mockResolvedValue(blogs as any);

      const popular = await service.getPopularSearches();

      expect(popular).toContain('wireless');
    });

    it('should sort by frequency (most common first)', async () => {
      const blogs = [
        { ...mockBlog, keywords: 'popular, common', product: { category: 'Popular' } },
        { ...mockBlog, keywords: 'popular, common', product: { category: 'Popular' } },
        { ...mockBlog, keywords: 'popular', product: { category: 'Popular' } },
        { ...mockBlog, keywords: 'rare', product: { category: 'Rare' } },
      ];
      mockPrismaService.blog.findMany.mockResolvedValue(blogs as any);

      const popular = await service.getPopularSearches();

      // 'popular' appears 3 times in keywords + 3 times in category = 6 total
      // 'Popular' (category) appears 3 times
      expect(popular).toContain('popular');
      expect(popular).toContain('Popular');
    });
  });

  describe('getCategories', () => {
    it('should return unique categories from published blogs', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([
        { category: 'Electronics' },
        { category: 'Fashion' },
      ] as any);

      const categories = await service.getCategories();

      expect(categories).toEqual(['Electronics', 'Fashion']);
    });

    it('should filter out null categories', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([
        { category: 'Electronics' },
        { category: null },
      ] as any);

      const categories = await service.getCategories();

      expect(categories).not.toContain(null);
      expect(categories).toEqual(['Electronics']);
    });

    it('should only include products with published blogs', async () => {
      await service.getCategories();

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            blogs: {
              some: { status: 'PUBLISHED' },
            },
          }),
        })
      );
    });
  });

  describe('highlightSearchTerms', () => {
    it('should wrap search terms in <mark> tags', () => {
      const text = 'This is a wireless headphones review';
      const highlighted = service.highlightSearchTerms(text, 'wireless');

      expect(highlighted).toContain('<mark>wireless</mark>');
    });

    it('should be case insensitive', () => {
      const text = 'Wireless and WIRELESS';
      const highlighted = service.highlightSearchTerms(text, 'wireless');

      expect(highlighted).toContain('<mark>Wireless</mark>');
      expect(highlighted).toContain('<mark>WIRELESS</mark>');
    });

    it('should highlight all occurrences', () => {
      const text = 'wireless test wireless test wireless';
      const highlighted = service.highlightSearchTerms(text, 'wireless');

      const matches = highlighted.match(/<mark>wireless<\/mark>/gi);
      expect(matches?.length).toBe(3);
    });

    it('should handle special regex characters', () => {
      const text = 'Test ($99)';
      const highlighted = service.highlightSearchTerms(text, '$99');

      expect(highlighted).toBeDefined();
    });
  });
});
