import { Article, Author, Category } from './types';

export const mockAuthors: Author[] = [
  {
    id: '1',
    name: 'Sarah Chen',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    bio: 'AI Marketing Strategist & Automation Expert',
  },
  {
    id: '2',
    name: 'Michael Rodriguez',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    bio: 'Affiliate Marketing Consultant',
  },
  {
    id: '3',
    name: 'Emily Watson',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
    bio: 'Content Strategy & SEO Specialist',
  },
];

export const mockCategories: Category[] = [
  {
    id: '1',
    name: 'AI Automation',
    slug: 'ai-automation',
    description: 'Harness the power of AI to automate your affiliate marketing',
    count: 12,
  },
  {
    id: '2',
    name: 'Content Strategy',
    slug: 'content-strategy',
    description: 'Create compelling content that converts',
    count: 8,
  },
  {
    id: '3',
    name: 'Revenue Growth',
    slug: 'revenue-growth',
    description: 'Proven tactics to scale your affiliate income',
    count: 15,
  },
  {
    id: '4',
    name: 'Platform Optimization',
    slug: 'platform-optimization',
    description: 'Master YouTube, TikTok, Instagram & more',
    count: 10,
  },
  {
    id: '5',
    name: 'Case Studies',
    slug: 'case-studies',
    description: 'Real-world success stories and lessons',
    count: 6,
  },
];

export const mockArticles: Article[] = [
  {
    id: '1',
    title: 'How We Built a $10K/Month Affiliate System with AI Automation',
    excerpt:
      'Discover the exact framework we used to build a fully autonomous affiliate marketing system that generates $10,000+ monthly revenue without manual intervention.',
    content: '',
    slug: 'how-we-built-10k-month-affiliate-system',
    category: mockCategories[0],
    author: mockAuthors[0],
    publishedAt: '2025-10-25',
    readTime: 8,
    featured: true,
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=450&fit=crop',
    tags: ['AI', 'Automation', 'Revenue'],
  },
  {
    id: '2',
    title: '7 AI Tools That Revolutionized Our Content Creation Process',
    excerpt:
      'From GPT-4 Turbo to Pika Labs, explore the AI tools we use daily to create high-converting video and written content at scale.',
    content: '',
    slug: '7-ai-tools-revolutionized-content-creation',
    category: mockCategories[1],
    author: mockAuthors[2],
    publishedAt: '2025-10-28',
    readTime: 6,
    featured: true,
    image: 'https://images.unsplash.com/photo-1676573409801-6f07b73c5c93?w=800&h=450&fit=crop',
    tags: ['AI Tools', 'Content', 'Productivity'],
  },
  {
    id: '3',
    title: 'YouTube Shorts vs TikTok: Which Platform Converts Better?',
    excerpt:
      'We analyzed 1,000+ videos across both platforms to determine which one delivers the highest ROI for affiliate marketers in 2025.',
    content: '',
    slug: 'youtube-shorts-vs-tiktok-conversion-analysis',
    category: mockCategories[3],
    author: mockAuthors[1],
    publishedAt: '2025-10-30',
    readTime: 10,
    featured: true,
    image: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&h=450&fit=crop',
    tags: ['YouTube', 'TikTok', 'Analytics'],
  },
  {
    id: '4',
    title: 'The Psychology Behind High-Converting Affiliate Content',
    excerpt:
      'Understanding the cognitive triggers that drive purchase decisions can 10x your conversion rates. Here\'s what we learned.',
    content: '',
    slug: 'psychology-high-converting-affiliate-content',
    category: mockCategories[1],
    author: mockAuthors[2],
    publishedAt: '2025-10-27',
    readTime: 7,
    featured: false,
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=450&fit=crop',
    tags: ['Psychology', 'Conversion', 'Strategy'],
  },
  {
    id: '5',
    title: 'From $0 to $2K: Our First Month with AI-Generated Videos',
    excerpt:
      'A transparent breakdown of our first 30 days using AI video generation for affiliate marketing, including all costs and revenues.',
    content: '',
    slug: 'from-zero-to-2k-first-month-ai-videos',
    category: mockCategories[4],
    author: mockAuthors[0],
    publishedAt: '2025-10-26',
    readTime: 12,
    featured: false,
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=450&fit=crop',
    tags: ['Case Study', 'Revenue', 'AI Video'],
  },
  {
    id: '6',
    title: 'SEO Strategies That Actually Work for Affiliate Blogs in 2025',
    excerpt:
      'The SEO landscape has changed dramatically. Here are the only strategies that still deliver consistent organic traffic.',
    content: '',
    slug: 'seo-strategies-affiliate-blogs-2025',
    category: mockCategories[1],
    author: mockAuthors[2],
    publishedAt: '2025-10-29',
    readTime: 9,
    featured: false,
    image: 'https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?w=800&h=450&fit=crop',
    tags: ['SEO', 'Traffic', 'Blog'],
  },
];

export function getFeaturedArticles(): Article[] {
  return mockArticles.filter((article) => article.featured);
}

export function getLatestArticles(limit: number = 6): Article[] {
  return mockArticles
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, limit);
}

export function getArticlesByCategory(categorySlug: string): Article[] {
  return mockArticles.filter((article) => article.category.slug === categorySlug);
}

export function getCategoryBySlug(slug: string): Category | undefined {
  return mockCategories.find((category) => category.slug === slug);
}

export function getPopularCategories(limit: number = 5): Category[] {
  return mockCategories
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, limit);
}

export function getAllCategories(): Category[] {
  return mockCategories;
}

/**
 * Get related articles for a given article slug
 * Algorithm: same category, similar tags, trending
 *
 * @param slug - Article slug
 * @param limit - Maximum number of related articles
 * @returns Related articles sorted by relevance
 */
export function getRelatedArticles(slug: string, limit: number = 6): Article[] {
  const article = mockArticles.find((a) => a.slug === slug);
  if (!article) return [];

  // Score-based matching
  const scored = mockArticles
    .filter((a) => a.slug !== slug) // Exclude current article
    .map((a) => {
      let score = 0;

      // Same category: +3 points
      if (a.category.id === article.category.id) {
        score += 3;
      }

      // Similar tags: +1 point per matching tag
      const matchingTags = a.tags.filter((tag) => article.tags.includes(tag));
      score += matchingTags.length;

      // Featured articles: +1 point (trending)
      if (a.featured) {
        score += 1;
      }

      // Recent articles: +0.5 points if published within last 7 days
      const daysDiff =
        (new Date().getTime() - new Date(a.publishedAt).getTime()) /
        (1000 * 60 * 60 * 24);
      if (daysDiff <= 7) {
        score += 0.5;
      }

      return { article: a, score };
    })
    .filter((item) => item.score > 0) // Only articles with some relevance
    .sort((a, b) => {
      // Sort by score first, then by date
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return (
        new Date(b.article.publishedAt).getTime() -
        new Date(a.article.publishedAt).getTime()
      );
    })
    .slice(0, limit)
    .map((item) => item.article);

  return scored;
}
