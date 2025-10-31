# Blog Search Feature - Quick Start Guide

## For Users

### Searching for Blog Articles

1. **Navigate to Search Page**
   - Go to `/search` in your browser
   - Or use the SearchBar component anywhere in the dashboard

2. **Enter Search Query**
   - Type your search term (e.g., "headphones", "review", "best laptop")
   - Autocomplete suggestions will appear as you type
   - See recent searches and popular searches

3. **Use Filters**
   - **Category Filter**: Select specific category (Electronics, Home, etc.)
   - **Sort Options**:
     - Relevance (best matches first)
     - Recent (newest first)
     - Popular (most viewed - coming soon)

4. **View Results**
   - See highlighted search terms in yellow
   - Click blog title to read full article
   - View product image, category, and excerpt

5. **Navigate Pages**
   - Use Previous/Next buttons for more results
   - See current page and total pages

---

## For Developers

### Backend Integration

#### Search Blogs
```typescript
// Basic search
const response = await fetch('/content/blog/search?q=headphones');
const data = await response.json();

// With filters
const response = await fetch(
  '/content/blog/search?q=wireless&category=Electronics&sortBy=recent&page=1&limit=20'
);

// Response structure
interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
  query: string;
  suggestions?: string[];
}
```

#### Get Popular Searches
```typescript
const response = await fetch('/content/blog/popular-searches?limit=10');
const popularSearches: string[] = await response.json();
```

#### Get Categories
```typescript
const response = await fetch('/content/blog/categories');
const categories: string[] = await response.json();
```

### Frontend Integration

#### Using SearchBar Component
```tsx
import SearchBar from '@/components/SearchBar';

// Basic usage
<SearchBar />

// With props
<SearchBar
  initialQuery="headphones"
  onSearch={(query) => console.log('Searching for:', query)}
  placeholder="Search articles..."
  className="w-full max-w-2xl"
/>
```

#### Standalone Search Page
```tsx
// Already implemented at /dashboard/app/search/page.tsx
// Access at: http://localhost:3001/search
```

#### Embedding Search in Other Pages
```tsx
import SearchBar from '@/components/SearchBar';
import { useRouter } from 'next/navigation';

function MyComponent() {
  const router = useRouter();

  return (
    <div>
      <h1>My Page</h1>
      <SearchBar
        onSearch={(query) => {
          router.push(`/search?q=${encodeURIComponent(query)}`);
        }}
      />
    </div>
  );
}
```

---

## API Reference

### Endpoints

#### 1. Search Blogs
```
GET /content/blog/search
```

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| q | string | Yes | - | Search query |
| category | string | No | - | Filter by category |
| tags | string | No | - | Comma-separated tags |
| sortBy | enum | No | relevance | Sort order: relevance, recent, popular |
| page | number | No | 1 | Page number |
| limit | number | No | 10 | Results per page (max 50) |

**Response:**
```json
{
  "results": [
    {
      "id": "cm38vz7h60000e6n8r7m4qgxk",
      "title": "Best Wireless Headphones 2025",
      "slug": "best-wireless-headphones-2025",
      "excerpt": "Comprehensive review of top wireless headphones",
      "content": "Full article content here...",
      "metaDescription": "SEO description",
      "keywords": "headphones,wireless,review",
      "publishedAt": "2025-10-31T00:00:00.000Z",
      "product": {
        "id": "prod123",
        "title": "Sony WH-1000XM5",
        "category": "Electronics",
        "imageUrl": "https://..."
      },
      "relevanceScore": 12
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 10,
  "totalPages": 5,
  "hasMore": true,
  "query": "headphones",
  "suggestions": ["wireless headphones", "noise cancelling"]
}
```

#### 2. Popular Searches
```
GET /content/blog/popular-searches?limit=10
```

**Response:**
```json
["headphones", "laptop", "smartphone", "camera", "keyboard"]
```

#### 3. List Categories
```
GET /content/blog/categories
```

**Response:**
```json
["Electronics", "Home & Kitchen", "Fashion", "Sports"]
```

#### 4. List Blogs
```
GET /content/blog?page=1&limit=10
```

**Response:**
```json
{
  "data": [...],
  "meta": {
    "currentPage": 1,
    "totalPages": 10,
    "totalItems": 95,
    "itemsPerPage": 10,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

---

## Advanced Usage

### Custom Search Implementation

```typescript
// Custom search hook
import { useState, useEffect } from 'react';

interface SearchOptions {
  query: string;
  category?: string;
  sortBy?: 'relevance' | 'recent' | 'popular';
  page?: number;
}

function useSearchBlogs(options: SearchOptions) {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function search() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          q: options.query,
          page: options.page?.toString() || '1',
          limit: '10',
          sortBy: options.sortBy || 'relevance',
        });

        if (options.category) {
          params.append('category', options.category);
        }

        const response = await fetch(
          `/content/blog/search?${params}`
        );

        if (!response.ok) throw new Error('Search failed');

        const data = await response.json();
        setResults(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (options.query) {
      search();
    }
  }, [options.query, options.category, options.sortBy, options.page]);

  return { results, loading, error };
}

// Usage
function SearchComponent() {
  const [query, setQuery] = useState('');
  const { results, loading, error } = useSearchBlogs({ query });

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      {results && (
        <ul>
          {results.results.map((result) => (
            <li key={result.id}>{result.title}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### Search History Management

```typescript
// Get recent searches
const recentSearches = JSON.parse(
  localStorage.getItem('blog-recent-searches') || '[]'
);

// Add search to history
function addToSearchHistory(query: string) {
  const recent = JSON.parse(
    localStorage.getItem('blog-recent-searches') || '[]'
  );

  const updated = [
    query,
    ...recent.filter((s) => s !== query)
  ].slice(0, 10);

  localStorage.setItem('blog-recent-searches', JSON.stringify(updated));
}

// Clear search history
function clearSearchHistory() {
  localStorage.removeItem('blog-recent-searches');
}
```

### Highlighting Search Terms

```typescript
// Highlight matches in text
function highlightSearchTerms(text: string, query: string): string {
  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(
    regex,
    '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>'
  );
}

// Usage in component
<div
  dangerouslySetInnerHTML={{
    __html: highlightSearchTerms(blog.title, searchQuery)
  }}
/>
```

---

## Troubleshooting

### Search Returns No Results

1. **Check Query**
   - Ensure search term is not too specific
   - Try broader terms
   - Check spelling

2. **Check Filters**
   - Clear category filter
   - Try different sort order

3. **Check Database**
   - Ensure blogs are published (status = 'PUBLISHED')
   - Verify publishedAt is set
   - Check blog content is not empty

### Autocomplete Not Working

1. **Check API Connection**
   - Verify NEXT_PUBLIC_API_URL is set
   - Check backend is running
   - Check CORS settings

2. **Check Browser Console**
   - Look for network errors
   - Check localStorage permissions

### Slow Search Performance

1. **Add Database Indexes**
   ```sql
   CREATE INDEX idx_blog_title ON "Blog"(title);
   CREATE INDEX idx_blog_keywords ON "Blog"(keywords);
   CREATE INDEX idx_blog_status_published ON "Blog"(status, "publishedAt");
   ```

2. **Enable Query Caching**
   - Use Redis for popular searches
   - Cache category list

3. **Optimize Query**
   - Limit search to specific fields
   - Reduce result set size

---

## Best Practices

### For Users
- ✅ Use specific search terms for better results
- ✅ Utilize category filters to narrow results
- ✅ Check recent searches for quick access
- ✅ Try popular searches for discovery

### For Developers
- ✅ Always validate user input
- ✅ Debounce search inputs (300ms+)
- ✅ Show loading states
- ✅ Handle errors gracefully
- ✅ Cache API responses when possible
- ✅ Use pagination for large result sets
- ✅ Implement analytics tracking

---

## Examples

### Example 1: Product Review Search
```
Query: "sony headphones review"
Filter: Category = Electronics
Sort: Relevance
```

### Example 2: Category Browse
```
Query: ""
Filter: Category = Home & Kitchen
Sort: Recent
```

### Example 3: Tag Search
```
Query: "budget"
Tags: "affordable,cheap,under-100"
Sort: Popular
```

---

## Support

For issues or questions:
1. Check this documentation
2. Review implementation docs: `/docs/BLOG-SEARCH-IMPLEMENTATION.md`
3. Check backend logs for API errors
4. Contact development team

---

**Last Updated**: 2025-10-31
**Version**: 1.0.0
