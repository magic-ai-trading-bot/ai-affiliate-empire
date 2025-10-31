import { Metadata } from 'next';
import type { Article, Category } from './types';

export const SITE_CONFIG = {
  name: 'AI Affiliate Empire Blog',
  description:
    'Master affiliate marketing with AI automation. Discover cutting-edge strategies, tools, and proven tactics to build a profitable affiliate empire.',
  url: process.env.NEXT_PUBLIC_BASE_URL || 'https://blog.ai-affiliate-empire.com',
  ogImage: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://blog.ai-affiliate-empire.com'}/og-image.jpg`,
  links: {
    twitter: 'https://twitter.com/AIAffiliateEmpire',
    github: 'https://github.com/ai-affiliate-empire',
  },
  keywords: [
    'affiliate marketing',
    'AI automation',
    'passive income',
    'content marketing',
    'revenue optimization',
    'YouTube automation',
    'TikTok marketing',
    'Instagram Reels',
    'video content',
    'AI tools',
    'marketing automation',
    'affiliate income',
    'online business',
    'digital marketing',
  ],
};

export function generateSiteMetadata(): Metadata {
  return {
    metadataBase: new URL(SITE_CONFIG.url),
    title: {
      default: SITE_CONFIG.name,
      template: `%s | ${SITE_CONFIG.name}`,
    },
    description: SITE_CONFIG.description,
    keywords: SITE_CONFIG.keywords,
    authors: [{ name: 'AI Affiliate Empire', url: SITE_CONFIG.url }],
    creator: 'AI Affiliate Empire',
    publisher: 'AI Affiliate Empire',
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: SITE_CONFIG.url,
      title: SITE_CONFIG.name,
      description: SITE_CONFIG.description,
      siteName: SITE_CONFIG.name,
      images: [
        {
          url: SITE_CONFIG.ogImage,
          width: 1200,
          height: 630,
          alt: SITE_CONFIG.name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: SITE_CONFIG.name,
      description: SITE_CONFIG.description,
      images: [SITE_CONFIG.ogImage],
      creator: '@AIAffiliateEmpire',
      site: '@AIAffiliateEmpire',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    alternates: {
      canonical: SITE_CONFIG.url,
    },
    verification: {
      google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || '',
      yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION || '',
    },
  };
}

export function generateArticleMetadata(article: Article): Metadata {
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
  };
}

export function generateCategoryMetadata(category: Category): Metadata {
  const categoryUrl = `${SITE_CONFIG.url}/category/${category.slug}`;
  const description = category.description || `Browse ${category.name} articles and insights`;

  return {
    title: category.name,
    description,
    keywords: [...SITE_CONFIG.keywords, category.name, category.slug],
    openGraph: {
      type: 'website',
      url: categoryUrl,
      title: `${category.name} - ${SITE_CONFIG.name}`,
      description,
      siteName: SITE_CONFIG.name,
      images: [
        {
          url: SITE_CONFIG.ogImage,
          width: 1200,
          height: 630,
          alt: category.name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${category.name} - ${SITE_CONFIG.name}`,
      description,
      images: [SITE_CONFIG.ogImage],
      creator: '@AIAffiliateEmpire',
      site: '@AIAffiliateEmpire',
    },
    alternates: {
      canonical: categoryUrl,
    },
  };
}

// JSON-LD Structured Data Generators
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'AI Affiliate Empire',
    url: SITE_CONFIG.url,
    logo: `${SITE_CONFIG.url}/logo.png`,
    description: SITE_CONFIG.description,
    sameAs: [SITE_CONFIG.links.twitter, SITE_CONFIG.links.github],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Support',
      email: 'support@ai-affiliate-empire.com',
    },
  };
}

export function generateWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_CONFIG.name,
    url: SITE_CONFIG.url,
    description: SITE_CONFIG.description,
    publisher: {
      '@type': 'Organization',
      name: 'AI Affiliate Empire',
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_CONFIG.url}/logo.png`,
      },
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_CONFIG.url}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function generateArticleSchema(article: Article) {
  const articleUrl = `${SITE_CONFIG.url}/articles/${article.slug}`;
  const imageUrl = article.image || SITE_CONFIG.ogImage;

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    description: article.excerpt,
    image: imageUrl,
    datePublished: new Date(article.publishedAt).toISOString(),
    dateModified: new Date(article.publishedAt).toISOString(),
    author: {
      '@type': 'Person',
      name: article.author.name,
      image: article.author.avatar,
      description: article.author.bio,
    },
    publisher: {
      '@type': 'Organization',
      name: 'AI Affiliate Empire',
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_CONFIG.url}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': articleUrl,
    },
    url: articleUrl,
    keywords: article.tags.join(', '),
    articleSection: article.category.name,
    articleBody: article.content,
    wordCount: article.content?.split(/\s+/).length || 0,
    timeRequired: `PT${article.readTime}M`,
  };
}

export function generateBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function generateBlogSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: SITE_CONFIG.name,
    description: SITE_CONFIG.description,
    url: SITE_CONFIG.url,
    publisher: {
      '@type': 'Organization',
      name: 'AI Affiliate Empire',
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_CONFIG.url}/logo.png`,
      },
    },
    inLanguage: 'en-US',
    keywords: SITE_CONFIG.keywords.join(', '),
  };
}

export function generateFAQSchema(faqs: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}
