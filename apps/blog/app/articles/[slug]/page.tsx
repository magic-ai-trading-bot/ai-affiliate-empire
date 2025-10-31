import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import SocialShare from '../../../components/SocialShare';
import RelatedArticles from '../../../components/article/RelatedArticles';
import { getBlurDataURL } from '@/lib/imageUtils';
import { mockArticles, mockAuthors } from '@/lib/mockData';
import { generateArticleSchema, generateBreadcrumbSchema, SITE_CONFIG } from '@/lib/seo';
import type { Article } from '@/lib/types';

interface ArticlePageProps {
  params: {
    slug: string;
  };
}

// Get article by slug
function getArticleBySlug(slug: string): Article | undefined {
  return mockArticles.find((article) => article.slug === slug);
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const article = getArticleBySlug(params.slug);

  if (!article) {
    return {
      title: 'Article Not Found',
    };
  }

  const articleUrl = `${SITE_CONFIG.url}/articles/${article.slug}`;
  const imageUrl = article.image || SITE_CONFIG.ogImage;

  return {
    title: article.title,
    description: article.excerpt,
    keywords: [...SITE_CONFIG.keywords, ...article.tags],
    authors: [{ name: article.author.name }],
    openGraph: {
      type: 'article',
      url: articleUrl,
      title: article.title,
      description: article.excerpt,
      siteName: SITE_CONFIG.name,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: article.title,
        },
      ],
      publishedTime: new Date(article.publishedAt).toISOString(),
      modifiedTime: new Date(article.publishedAt).toISOString(),
      authors: [article.author.name],
      section: article.category.name,
      tags: article.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.excerpt,
      images: [imageUrl],
      creator: '@AIAffiliateEmpire',
      site: '@AIAffiliateEmpire',
    },
    alternates: {
      canonical: articleUrl,
    },
    robots: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  };
}

// Enable ISR - revalidate every 3600 seconds (1 hour)
export const revalidate = 3600;

// Generate static params for static generation
export async function generateStaticParams() {
  return mockArticles.map((article) => ({
    slug: article.slug,
  }));
}

export default function ArticlePage({ params }: ArticlePageProps) {
  const article = getArticleBySlug(params.slug);

  if (!article) {
    notFound();
  }

  const articleUrl = `${SITE_CONFIG.url}/articles/${article.slug}`;

  // Generate JSON-LD structured data
  const articleSchema = generateArticleSchema(article);
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: SITE_CONFIG.url },
    { name: 'Articles', url: `${SITE_CONFIG.url}/articles` },
    { name: article.category.name, url: `${SITE_CONFIG.url}/category/${article.category.slug}` },
    { name: article.title, url: articleUrl },
  ]);

  // Generate article content (in production, this would come from CMS)
  const articleContent = `
    <article itemscope itemtype="https://schema.org/BlogPosting">
      <div itemprop="articleBody">
        <h2>Introduction</h2>
        <p>${article.excerpt}</p>

        <h2>Key Insights</h2>
        <p>This article explores cutting-edge strategies and techniques in ${article.category.name.toLowerCase()}. Our analysis is based on real-world data and proven results.</p>

        <h3>Main Points</h3>
        <ul>
          <li>Comprehensive analysis of current trends</li>
          <li>Actionable strategies you can implement today</li>
          <li>Real-world case studies and examples</li>
          <li>Expert insights and recommendations</li>
        </ul>

        <h2>Implementation Guide</h2>
        <p>Follow these steps to implement the strategies discussed in this article and start seeing results in your affiliate marketing efforts.</p>

        <h2>Conclusion</h2>
        <p>By applying these proven tactics, you'll be well on your way to building a successful affiliate marketing business powered by AI automation.</p>
      </div>
    </article>
  `;

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <main className="min-h-screen bg-background">
        <article className="max-w-4xl mx-auto px-4 py-8" itemScope itemType="https://schema.org/BlogPosting">
          {/* Article Header */}
          <header className="mb-8">
            <div className="mb-4">
              <span className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                {article.category.name}
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4" itemProp="headline">
              {article.title}
            </h1>

            <p className="text-xl text-muted-foreground mb-6" itemProp="description">
              {article.excerpt}
            </p>

            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
              <div className="flex items-center gap-2" itemProp="author" itemScope itemType="https://schema.org/Person">
                {article.author.avatar && (
                  <Image
                    src={article.author.avatar}
                    alt={article.author.name}
                    width={40}
                    height={40}
                    className="rounded-full"
                    itemProp="image"
                  />
                )}
                <span className="font-medium text-foreground" itemProp="name">
                  {article.author.name}
                </span>
              </div>
              <span>•</span>
              <time dateTime={article.publishedAt} itemProp="datePublished">
                {new Date(article.publishedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
              <span>•</span>
              <span>{article.readTime} min read</span>
            </div>

            {/* Featured Image */}
            {article.image && (
              <div className="mb-8 rounded-lg overflow-hidden relative aspect-video" itemProp="image" itemScope itemType="https://schema.org/ImageObject">
                <Image
                  src={article.image}
                  alt={article.title}
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 896px"
                  placeholder="blur"
                  blurDataURL={getBlurDataURL(1200, 630)}
                  itemProp="url"
                />
                <meta itemProp="width" content="1200" />
                <meta itemProp="height" content="630" />
              </div>
            )}
          </header>

          {/* Social Share - Top */}
          <div className="mb-8 border-t border-b border-border py-6">
            <SocialShare
              url={articleUrl}
              title={article.title}
              description={article.excerpt}
              image={article.image}
              author={article.author.name}
              publishedTime={article.publishedAt}
              modifiedTime={article.publishedAt}
              section={article.category.name}
              tags={article.tags}
              type="article"
              hashtags={article.tags.slice(0, 3)}
              via="AIAffiliateEmpire"
              showCounts={true}
              twitterSite="@AIAffiliateEmpire"
              twitterCreator="@AIAffiliateEmpire"
            >
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                  Share this article
                </h3>
              </div>
            </SocialShare>
          </div>

          {/* Article Content */}
          <section
            className="prose prose-lg dark:prose-invert max-w-none mb-12"
            dangerouslySetInnerHTML={{ __html: articleContent }}
          />

          {/* Tags */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
              Tags
            </h3>
            <div className="flex flex-wrap gap-2" itemProp="keywords">
              {article.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-accent text-accent-foreground rounded-full text-sm hover:bg-accent/80 transition-colors cursor-pointer"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {/* FTC Disclosure */}
          <div className="mb-8 p-4 bg-accent/50 border border-border rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Disclosure:</strong> This article may contain affiliate links. If you make a purchase through these links, we may earn a commission at no additional cost to you. We only recommend products and services we genuinely believe in.
            </p>
          </div>

          {/* Social Share - Bottom */}
          <div className="border-t border-b border-border py-6 mb-12">
            <SocialShare
              url={articleUrl}
              title={article.title}
              description={article.excerpt}
              image={article.image}
              hashtags={article.tags.slice(0, 3)}
              via="AIAffiliateEmpire"
              showCounts={false}
              vertical={false}
            >
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                  Enjoyed this article? Share it!
                </h3>
              </div>
            </SocialShare>
          </div>

          {/* Author Bio */}
          <div className="bg-card rounded-lg p-6 shadow-sm mb-12" itemProp="author" itemScope itemType="https://schema.org/Person">
            <div className="flex items-start gap-4">
              {article.author.avatar && (
                <Image
                  src={article.author.avatar}
                  alt={article.author.name}
                  width={64}
                  height={64}
                  className="rounded-full flex-shrink-0"
                  itemProp="image"
                />
              )}
              <div>
                <h3 className="text-lg font-bold text-foreground mb-1" itemProp="name">
                  {article.author.name}
                </h3>
                <p className="text-muted-foreground text-sm" itemProp="description">
                  {article.author.bio}
                </p>
              </div>
            </div>
          </div>

          {/* Meta tags for schema.org */}
          <meta itemProp="publisher" content="AI Affiliate Empire" />
          <meta itemProp="dateModified" content={new Date(article.publishedAt).toISOString()} />
          <meta itemProp="mainEntityOfPage" content={articleUrl} />
        </article>

        {/* Related Articles */}
        <div className="max-w-4xl mx-auto px-4">
          <RelatedArticles articleSlug={params.slug} minArticles={3} maxArticles={6} />
        </div>
      </main>
    </>
  );
}
