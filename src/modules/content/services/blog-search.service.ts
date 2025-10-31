import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/database/prisma.service';
import { SearchBlogDto, BlogSortBy } from '../dto/search-blog.dto';
import { Prisma } from '@prisma/client';

export interface SearchResult {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  metaTitle: string | null;
  metaDescription: string | null;
  keywords: string | null;
  publishedAt: Date | null;
  product: {
    id: string;
    title: string;
    category: string | null;
    imageUrl: string | null;
  };
  relevanceScore?: number;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
  query: string;
  suggestions?: string[];
}

@Injectable()
export class BlogSearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(dto: SearchBlogDto): Promise<SearchResponse> {
    const { q, category, tags, sortBy, page = 1, limit = 10 } = dto;
    const skip = (page - 1) * limit;

    // Build search conditions
    const andConditions: Prisma.BlogWhereInput[] = [
      // Full-text search across multiple fields
      {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { content: { contains: q, mode: 'insensitive' } },
          { excerpt: { contains: q, mode: 'insensitive' } },
          { keywords: { contains: q, mode: 'insensitive' } },
          { metaDescription: { contains: q, mode: 'insensitive' } },
        ],
      },
    ];

    // Add category filter if provided
    const productFilter: Prisma.ProductWhereInput | undefined = category
      ? { category: { equals: category, mode: 'insensitive' } }
      : undefined;

    // Add tags filter if provided (search in keywords field)
    if (tags) {
      const tagArray = tags.split(',').map((t) => t.trim());
      andConditions.push({
        OR: tagArray.map((tag) => ({
          keywords: { contains: tag, mode: 'insensitive' },
        })),
      });
    }

    const searchConditions: Prisma.BlogWhereInput = {
      status: 'PUBLISHED',
      AND: andConditions,
      ...(productFilter && { product: productFilter }),
    };

    // Determine sort order
    let orderBy: Prisma.BlogOrderByWithRelationInput = {};
    switch (sortBy) {
      case BlogSortBy.RECENT:
        orderBy = { publishedAt: 'desc' };
        break;
      case BlogSortBy.POPULAR:
        // TODO: Add views/clicks tracking to Blog model
        orderBy = { publishedAt: 'desc' };
        break;
      case BlogSortBy.RELEVANCE:
      default:
        // For relevance, we'll sort by publishedAt for now
        // In production, consider using PostgreSQL full-text search with ranking
        orderBy = { publishedAt: 'desc' };
        break;
    }

    // Execute search query
    const [blogs, total] = await Promise.all([
      this.prisma.blog.findMany({
        where: searchConditions,
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
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.blog.count({ where: searchConditions }),
    ]);

    // Calculate relevance scores (simple implementation)
    const results: SearchResult[] = blogs.map((blog) => ({
      ...blog,
      relevanceScore: this.calculateRelevance(blog, q),
    }));

    // Sort by relevance if requested
    if (sortBy === BlogSortBy.RELEVANCE) {
      results.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
    }

    const totalPages = Math.ceil(total / limit);

    return {
      results,
      total,
      page,
      limit,
      totalPages,
      hasMore: page < totalPages,
      query: q,
      suggestions: await this.getSuggestions(q),
    };
  }

  /**
   * Calculate simple relevance score based on query matches
   */
  private calculateRelevance(
    blog: {
      title: string;
      content: string;
      excerpt: string | null;
      keywords: string | null;
    },
    query: string,
  ): number {
    const queryLower = query.toLowerCase();
    let score = 0;

    // Title matches are most important (weight: 5)
    if (blog.title.toLowerCase().includes(queryLower)) {
      score += 5;
    }

    // Excerpt matches (weight: 3)
    if (blog.excerpt?.toLowerCase().includes(queryLower)) {
      score += 3;
    }

    // Keywords matches (weight: 4)
    if (blog.keywords?.toLowerCase().includes(queryLower)) {
      score += 4;
    }

    // Content matches (weight: 1)
    const contentMatches = (
      blog.content.toLowerCase().match(new RegExp(queryLower, 'g')) || []
    ).length;
    score += Math.min(contentMatches, 5); // Cap at 5 to avoid too much weight

    return score;
  }

  /**
   * Get search suggestions based on popular searches
   */
  async getSuggestions(query: string): Promise<string[]> {
    // Get recent published blogs for suggestions
    const recentBlogs = await this.prisma.blog.findMany({
      where: {
        status: 'PUBLISHED',
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { keywords: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        title: true,
        keywords: true,
      },
      take: 5,
    });

    const suggestions = new Set<string>();

    // Extract keywords from matching blogs
    recentBlogs.forEach((blog) => {
      if (blog.keywords) {
        blog.keywords
          .split(',')
          .map((k) => k.trim())
          .filter((k) => k.toLowerCase().includes(query.toLowerCase()))
          .forEach((k) => suggestions.add(k));
      }
    });

    return Array.from(suggestions).slice(0, 5);
  }

  /**
   * Get popular searches based on blog categories and keywords
   */
  async getPopularSearches(limit: number = 10): Promise<string[]> {
    // Get most common categories
    const blogs = await this.prisma.blog.findMany({
      where: { status: 'PUBLISHED' },
      include: {
        product: {
          select: { category: true },
        },
      },
      take: 100,
      orderBy: { publishedAt: 'desc' },
    });

    const categoryCount = new Map<string, number>();
    const keywordCount = new Map<string, number>();

    blogs.forEach((blog) => {
      // Count categories
      if (blog.product.category) {
        categoryCount.set(
          blog.product.category,
          (categoryCount.get(blog.product.category) || 0) + 1,
        );
      }

      // Count keywords
      if (blog.keywords) {
        blog.keywords
          .split(',')
          .map((k) => k.trim())
          .forEach((keyword) => {
            if (keyword) {
              keywordCount.set(keyword, (keywordCount.get(keyword) || 0) + 1);
            }
          });
      }
    });

    // Combine and sort by frequency
    const allSearches = [
      ...Array.from(categoryCount.entries()),
      ...Array.from(keywordCount.entries()),
    ]
      .sort((a, b) => b[1] - a[1])
      .map(([search]) => search)
      .slice(0, limit);

    return allSearches;
  }

  /**
   * Get all unique categories for filtering
   */
  async getCategories(): Promise<string[]> {
    const products = await this.prisma.product.findMany({
      where: {
        category: { not: null },
        blogs: {
          some: { status: 'PUBLISHED' },
        },
      },
      select: { category: true },
      distinct: ['category'],
    });

    return products
      .map((p) => p.category)
      .filter((c): c is string => c !== null);
  }

  /**
   * Highlight search terms in text
   */
  highlightSearchTerms(text: string, query: string): string {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }
}
