import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import ArticleCard from '@/components/ArticleCard';
import CategoryNav, { getCategoryIcon } from '@/components/CategoryNav';
import { mockCategories, mockArticles } from '@/lib/mockData';
import { Article, Category } from '@/lib/types';
import { generateCategoryMetadata, generateBreadcrumbSchema, SITE_CONFIG } from '@/lib/seo';

interface CategoryPageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    page?: string;
    sort?: 'latest' | 'popular' | 'oldest';
  }>;
}

// Generate static params for all categories
export async function generateStaticParams() {
  return mockCategories.map((category) => ({
    slug: category.slug,
  }));
}

// Generate metadata for SEO
export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = mockCategories.find((cat) => cat.slug === slug);

  if (!category) {
    return {
      title: 'Category Not Found',
    };
  }

  return generateCategoryMetadata(category);
}

// Filter and sort articles
function getFilteredArticles(
  categorySlug: string,
  sortBy: 'latest' | 'popular' | 'oldest' = 'latest'
): Article[] {
  let filtered = mockArticles.filter((article) => article.category.slug === categorySlug);

  switch (sortBy) {
    case 'latest':
      filtered = filtered.sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
      break;
    case 'oldest':
      filtered = filtered.sort(
        (a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
      );
      break;
    case 'popular':
      // Sort by featured first, then by date
      filtered = filtered.sort((a, b) => {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      });
      break;
  }

  return filtered;
}

// Breadcrumb component
function Breadcrumb({ category }: { category: Category }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-8">
      <ol className="flex items-center gap-2 text-sm text-muted-foreground">
        <li>
          <Link
            href="/"
            className="flex items-center gap-1 transition-colors hover:text-foreground"
          >
            <Home className="h-4 w-4" />
            <span>Home</span>
          </Link>
        </li>
        <ChevronRight className="h-4 w-4" />
        <li>
          <Link
            href="/categories"
            className="transition-colors hover:text-foreground"
          >
            Categories
          </Link>
        </li>
        <ChevronRight className="h-4 w-4" />
        <li>
          <span className="font-semibold text-foreground">{category.name}</span>
        </li>
      </ol>
    </nav>
  );
}

// Sort selector component
function SortSelector({
  currentSort,
  categorySlug,
}: {
  currentSort: 'latest' | 'popular' | 'oldest';
  categorySlug: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Sort by:</span>
      <div className="flex gap-2">
        {(['latest', 'popular', 'oldest'] as const).map((sort) => (
          <Link
            key={sort}
            href={`/category/${categorySlug}?sort=${sort}`}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              currentSort === sort
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            {sort.charAt(0).toUpperCase() + sort.slice(1)}
          </Link>
        ))}
      </div>
    </div>
  );
}

// Popular categories sidebar
function PopularCategories({ currentCategorySlug }: { currentCategorySlug: string }) {
  const popularCategories = mockCategories
    .filter((cat) => cat.slug !== currentCategorySlug)
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, 5);

  return (
    <div className="rounded-2xl border-2 border-border bg-card p-6">
      <h3 className="mb-4 text-lg font-bold">Popular Categories</h3>
      <div className="space-y-3">
        {popularCategories.map((category) => {
          const Icon = getCategoryIcon(category.slug);
          return (
            <Link
              key={category.id}
              href={`/category/${category.slug}`}
              className="group flex items-center gap-3 rounded-lg p-3 transition-all hover:bg-accent"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground transition-transform group-hover:scale-110">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold transition-colors group-hover:text-primary">
                  {category.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {category.count} articles
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const { sort = 'latest' } = await searchParams;

  // Find category
  const category = mockCategories.find((cat) => cat.slug === slug);

  if (!category) {
    notFound();
  }

  // Get filtered and sorted articles
  const articles = getFilteredArticles(slug, sort);
  const Icon = getCategoryIcon(slug);

  // Generate breadcrumb structured data
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: SITE_CONFIG.url },
    { name: 'Categories', url: `${SITE_CONFIG.url}/categories` },
    { name: category.name, url: `${SITE_CONFIG.url}/category/${category.slug}` },
  ]);

  return (
    <>
      {/* JSON-LD Breadcrumb */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <div className="container mx-auto px-4 py-12">
      {/* Breadcrumb */}
      <Breadcrumb category={category} />

      {/* Category Header */}
      <div className="mb-12 text-center">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-lg">
          <Icon className="h-12 w-12" />
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">
          {category.name}
        </h1>
        {category.description && (
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            {category.description}
          </p>
        )}
        <div className="mt-4 flex items-center justify-center gap-4 text-sm text-muted-foreground">
          <span>{articles.length} articles</span>
          <span>•</span>
          <span>Updated regularly</span>
        </div>
      </div>

      {/* Category Navigation */}
      <div className="mb-12">
        <CategoryNav categories={mockCategories} showAll={true} variant="horizontal" />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
        {/* Articles Section */}
        <div className="lg:col-span-2">
          {/* Sort Controls */}
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-2xl font-bold">
              All Articles ({articles.length})
            </h2>
            <SortSelector currentSort={sort} categorySlug={slug} />
          </div>

          {/* Articles Grid */}
          {articles.length > 0 ? (
            <div className="grid gap-8">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} variant="standard" />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-border bg-muted/50 p-12 text-center">
              <p className="text-lg text-muted-foreground">
                No articles found in this category yet.
              </p>
              <Link
                href="/articles"
                className="mt-4 inline-block text-primary hover:underline"
              >
                Browse all articles →
              </Link>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Popular Categories */}
          <PopularCategories currentCategorySlug={slug} />

          {/* Newsletter CTA */}
          <div className="rounded-2xl border-2 border-primary bg-primary/5 p-6">
            <h3 className="mb-2 text-lg font-bold">Stay Updated</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Get the latest {category.name.toLowerCase()} articles delivered to your inbox.
            </p>
            <Link
              href="/?newsletter=true"
              className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground transition-transform hover:scale-105"
            >
              Subscribe Now
            </Link>
          </div>

          {/* Back to Categories */}
          <Link
            href="/categories"
            className="flex items-center justify-center gap-2 rounded-lg border-2 border-border bg-card p-4 font-semibold transition-colors hover:border-primary hover:bg-accent"
          >
            View All Categories
          </Link>
        </div>
      </div>
    </div>
    </>
  );
}
