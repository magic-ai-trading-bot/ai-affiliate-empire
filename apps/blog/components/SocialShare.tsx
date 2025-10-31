'use client';

import React from 'react';
import Head from 'next/head';
import ShareButtons, { ShareButtonsProps } from './ShareButtons';

export interface SocialShareProps extends Omit<ShareButtonsProps, 'url'> {
  url?: string;
  title: string;
  description?: string;
  image?: string;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
  tags?: string[];
  type?: 'article' | 'website' | 'product';
  siteName?: string;
  locale?: string;
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  twitterSite?: string;
  twitterCreator?: string;
  enableMetaTags?: boolean;
  enableTwitterCard?: boolean;
  enableFacebookMeta?: boolean;
  children?: React.ReactNode;
}

/**
 * SocialShare Component
 *
 * Provides comprehensive social sharing functionality with:
 * - Open Graph meta tags for rich social previews
 * - Twitter Card meta tags
 * - Share buttons for multiple platforms
 * - Native mobile share API support
 * - Analytics tracking
 * - Share count display
 */
export const SocialShare: React.FC<SocialShareProps> = ({
  url,
  title,
  description = '',
  image,
  author,
  publishedTime,
  modifiedTime,
  section,
  tags = [],
  type = 'article',
  siteName = 'AI Affiliate Empire',
  locale = 'en_US',
  twitterCard = 'summary_large_image',
  twitterSite,
  twitterCreator,
  hashtags = [],
  via = '',
  onShare,
  showCounts = false,
  vertical = false,
  className = '',
  enableMetaTags = true,
  enableTwitterCard = true,
  enableFacebookMeta = true,
  children,
}) => {
  // Get current URL if not provided
  const shareUrl =
    url || (typeof window !== 'undefined' ? window.location.href : '');

  // Analytics tracking wrapper
  const handleShare = (platform: string) => {
    // Track share event
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'share', {
        method: platform,
        content_type: type,
        item_id: shareUrl,
      });
    }

    // Custom analytics callback
    onShare?.(platform);
  };

  // Generate meta tags
  const renderMetaTags = () => {
    if (!enableMetaTags) return null;

    const metaTags = [];

    // Basic Open Graph tags
    metaTags.push(
      <meta key="og:type" property="og:type" content={type} />,
      <meta key="og:url" property="og:url" content={shareUrl} />,
      <meta key="og:title" property="og:title" content={title} />,
      <meta key="og:site_name" property="og:site_name" content={siteName} />,
      <meta key="og:locale" property="og:locale" content={locale} />
    );

    if (description) {
      metaTags.push(
        <meta
          key="og:description"
          property="og:description"
          content={description}
        />
      );
    }

    if (image) {
      metaTags.push(
        <meta key="og:image" property="og:image" content={image} />,
        <meta key="og:image:alt" property="og:image:alt" content={title} />
      );
    }

    // Article-specific Open Graph tags
    if (type === 'article') {
      if (author) {
        metaTags.push(
          <meta
            key="article:author"
            property="article:author"
            content={author}
          />
        );
      }

      if (publishedTime) {
        metaTags.push(
          <meta
            key="article:published_time"
            property="article:published_time"
            content={publishedTime}
          />
        );
      }

      if (modifiedTime) {
        metaTags.push(
          <meta
            key="article:modified_time"
            property="article:modified_time"
            content={modifiedTime}
          />
        );
      }

      if (section) {
        metaTags.push(
          <meta
            key="article:section"
            property="article:section"
            content={section}
          />
        );
      }

      if (tags.length > 0) {
        tags.forEach((tag, index) => {
          metaTags.push(
            <meta
              key={`article:tag:${index}`}
              property="article:tag"
              content={tag}
            />
          );
        });
      }
    }

    // Twitter Card tags
    if (enableTwitterCard) {
      metaTags.push(
        <meta key="twitter:card" name="twitter:card" content={twitterCard} />,
        <meta key="twitter:title" name="twitter:title" content={title} />
      );

      if (description) {
        metaTags.push(
          <meta
            key="twitter:description"
            name="twitter:description"
            content={description}
          />
        );
      }

      if (image) {
        metaTags.push(
          <meta key="twitter:image" name="twitter:image" content={image} />,
          <meta
            key="twitter:image:alt"
            name="twitter:image:alt"
            content={title}
          />
        );
      }

      if (twitterSite) {
        metaTags.push(
          <meta key="twitter:site" name="twitter:site" content={twitterSite} />
        );
      }

      if (twitterCreator) {
        metaTags.push(
          <meta
            key="twitter:creator"
            name="twitter:creator"
            content={twitterCreator}
          />
        );
      }
    }

    // Facebook-specific meta tags
    if (enableFacebookMeta && process.env.NEXT_PUBLIC_FACEBOOK_APP_ID) {
      metaTags.push(
        <meta
          key="fb:app_id"
          property="fb:app_id"
          content={process.env.NEXT_PUBLIC_FACEBOOK_APP_ID}
        />
      );
    }

    return metaTags;
  };

  return (
    <>
      {/* Meta tags for social previews */}
      {typeof window === 'undefined' && enableMetaTags && (
        <Head>{renderMetaTags()}</Head>
      )}

      {/* Share buttons container */}
      <div className="social-share">
        {children && <div className="mb-4">{children}</div>}

        <ShareButtons
          url={shareUrl}
          title={title}
          description={description}
          hashtags={hashtags}
          via={via}
          onShare={handleShare}
          showCounts={showCounts}
          vertical={vertical}
          className={className}
        />
      </div>

      {/* Structured data for rich snippets */}
      {type === 'article' && enableMetaTags && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Article',
              headline: title,
              description: description,
              image: image,
              author: author
                ? {
                    '@type': 'Person',
                    name: author,
                  }
                : undefined,
              datePublished: publishedTime,
              dateModified: modifiedTime,
              publisher: {
                '@type': 'Organization',
                name: siteName,
              },
            }),
          }}
        />
      )}
    </>
  );
};

export default SocialShare;
