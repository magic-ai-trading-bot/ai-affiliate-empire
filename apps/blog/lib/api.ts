import { Article } from './types';
import { getRelatedArticles } from './mockData';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';

/**
 * Fetch related articles for a given article slug
 * Algorithm: same category, similar tags, trending
 *
 * @param slug - Article slug
 * @param limit - Maximum number of related articles (default: 6)
 * @returns Promise<Article[]>
 */
export async function fetchRelatedArticles(
  slug: string,
  limit: number = 6
): Promise<Article[]> {
  // Use mock data in development or when configured
  if (USE_MOCK_DATA || process.env.NODE_ENV === 'development') {
    // Simulate API delay for realistic testing
    await new Promise((resolve) => setTimeout(resolve, 500));
    return getRelatedArticles(slug, limit);
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/blog/articles/${slug}/related?limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        next: {
          revalidate: 3600, // Cache for 1 hour
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch related articles: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching related articles:', error);
    // Fallback to mock data on error
    return getRelatedArticles(slug, limit);
  }
}

/**
 * Track click on related article recommendation
 * Used for analytics and improving recommendation algorithm
 *
 * @param articleSlug - Current article slug
 * @param relatedSlug - Clicked related article slug
 * @param position - Position of the clicked article in the list
 */
export async function trackRelatedArticleClick(
  articleSlug: string,
  relatedSlug: string,
  position: number
): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/blog/analytics/click`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'related_article',
        sourceArticle: articleSlug,
        targetArticle: relatedSlug,
        position,
        timestamp: new Date().toISOString(),
      }),
      // Use keepalive to ensure tracking completes even if user navigates away
      keepalive: true,
    });
  } catch (error) {
    // Silently fail - tracking shouldn't affect user experience
    console.error('Error tracking related article click:', error);
  }
}
