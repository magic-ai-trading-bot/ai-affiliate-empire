import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import SocialShare from '../../../components/SocialShare';
import RelatedArticles from '../../../components/article/RelatedArticles';
import { getBlurDataURL } from '@/lib/imageUtils';

// Example article data (in production, fetch from database/CMS)
interface Article {
  slug: string;
  title: string;
  description: string;
  content: string;
  author: string;
  publishedAt: string;
  updatedAt: string;
  image: string;
  category: string;
  tags: string[];
}

// Mock article data
const articles: Record<string, Article> = {
  'best-tech-gadgets-2025': {
    slug: 'best-tech-gadgets-2025',
    title: 'Top 10 Must-Have Tech Gadgets in 2025',
    description:
      'Discover the latest and greatest tech gadgets that are revolutionizing our daily lives. From AI-powered devices to sustainable tech solutions.',
    content: `
      <article>
        <h2>Introduction</h2>
        <p>Technology continues to evolve at an unprecedented pace, and 2025 is no exception. Here are the top 10 tech gadgets that are making waves this year.</p>

        <h2>1. AI-Powered Smart Assistant 3.0</h2>
        <p>The latest generation of smart assistants brings unprecedented capabilities...</p>

        <h2>2. Wireless Charging Station Pro</h2>
        <p>Say goodbye to cable clutter with this innovative charging solution...</p>

        <!-- More content sections -->
      </article>
    `,
    author: 'Tech Reviewer',
    publishedAt: '2025-01-15T10:00:00Z',
    updatedAt: '2025-01-20T15:30:00Z',
    image: 'https://example.com/images/tech-gadgets-2025.jpg',
    category: 'Technology',
    tags: ['gadgets', 'technology', 'reviews', '2025'],
  },
};

interface ArticlePageProps {
  params: {
    slug: string;
  };
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const article = articles[params.slug];

  if (!article) {
    return {
      title: 'Article Not Found',
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://example.com';
  const articleUrl = `${baseUrl}/articles/${article.slug}`;

  return {
    title: article.title,
    description: article.description,
    authors: [{ name: article.author }],
    openGraph: {
      type: 'article',
      url: articleUrl,
      title: article.title,
      description: article.description,
      images: [
        {
          url: article.image,
          width: 1200,
          height: 630,
          alt: article.title,
        },
      ],
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      authors: [article.author],
      section: article.category,
      tags: article.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.description,
      images: [article.image],
      creator: '@yourhandle',
    },
  };
}

// Enable ISR - revalidate every 3600 seconds (1 hour)
export const revalidate = 3600;

// Generate static params for static generation
export async function generateStaticParams() {
  return Object.keys(articles).map((slug) => ({
    slug,
  }));
}

export default function ArticlePage({ params }: ArticlePageProps) {
  const article = articles[params.slug];

  if (!article) {
    notFound();
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://example.com';
  const articleUrl = `${baseUrl}/articles/${article.slug}`;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Article Header */}
        <header className="mb-8">
          <div className="mb-4">
            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              {article.category}
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {article.title}
          </h1>

          <p className="text-xl text-gray-600 mb-6">{article.description}</p>

          <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-gray-600 font-medium">
                  {article.author[0]}
                </span>
              </div>
              <span className="font-medium text-gray-700">
                {article.author}
              </span>
            </div>
            <span>•</span>
            <time dateTime={article.publishedAt}>
              {new Date(article.publishedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
            <span>•</span>
            <span>5 min read</span>
          </div>

          {/* Featured Image */}
          {article.image && (
            <div className="mb-8 rounded-lg overflow-hidden relative aspect-video">
              <Image
                src={article.image}
                alt={article.title}
                fill
                priority
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 896px"
                placeholder="blur"
                blurDataURL={getBlurDataURL(1200, 630)}
              />
            </div>
          )}
        </header>

        {/* Social Share - Top */}
        <div className="mb-8 border-t border-b border-gray-200 py-6">
          <SocialShare
            url={articleUrl}
            title={article.title}
            description={article.description}
            image={article.image}
            author={article.author}
            publishedTime={article.publishedAt}
            modifiedTime={article.updatedAt}
            section={article.category}
            tags={article.tags}
            type="article"
            hashtags={article.tags.slice(0, 3)}
            via="AIAffiliateEmpire"
            showCounts={true}
            twitterSite="@AIAffiliateEmpire"
            twitterCreator="@AIAffiliateEmpire"
          >
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Share this article
              </h3>
            </div>
          </SocialShare>
        </div>

        {/* Article Content */}
        <article
          className="prose prose-lg max-w-none mb-12"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        {/* Tags */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Tags
          </h3>
          <div className="flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm hover:bg-gray-300 transition-colors cursor-pointer"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* Social Share - Bottom */}
        <div className="border-t border-b border-gray-200 py-6 mb-12">
          <SocialShare
            url={articleUrl}
            title={article.title}
            description={article.description}
            image={article.image}
            hashtags={article.tags.slice(0, 3)}
            via="AIAffiliateEmpire"
            showCounts={false}
            vertical={false}
          >
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Enjoyed this article? Share it!
              </h3>
            </div>
          </SocialShare>
        </div>

        {/* Author Bio */}
        <div className="bg-white rounded-lg p-6 shadow-sm mb-12">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-gray-600 font-medium text-xl">
                {article.author[0]}
              </span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                {article.author}
              </h3>
              <p className="text-gray-600 text-sm">
                Passionate about technology and innovation. Always exploring the
                latest gadgets and trends to help readers make informed
                decisions.
              </p>
            </div>
          </div>
        </div>

        {/* Related Articles */}
        <RelatedArticles articleSlug={params.slug} minArticles={3} maxArticles={6} />
      </div>
    </main>
  );
}
