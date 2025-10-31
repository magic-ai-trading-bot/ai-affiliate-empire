import { Metadata } from 'next'
import Image from 'next/image'
import Breadcrumb from '@/components/ui/Breadcrumb'
import ProgressBar from '@/components/article/ProgressBar'
import TableOfContents from '@/components/article/TableOfContents'
import SocialShare from '@/components/article/SocialShare'
import AffiliateDisclosure from '@/components/article/AffiliateDisclosure'
import AuthorBio from '@/components/article/AuthorBio'
import RelatedArticles from '@/components/article/RelatedArticles'
import CommentsPlaceholder from '@/components/article/CommentsPlaceholder'
import articleStyles from '@/styles/article.module.css'

// Mock data - replace with actual data fetching
const mockArticle = {
  slug: 'best-wireless-headphones-2025',
  title: 'Best Wireless Headphones in 2025: Complete Buyer\'s Guide',
  subtitle: 'Expert reviews and comparisons to help you find the perfect wireless headphones for your needs and budget',
  content: `
    <p>Finding the perfect wireless headphones can be overwhelming with so many options available in 2025. Whether you're looking for premium noise-canceling headphones for your daily commute, budget-friendly options for the gym, or professional studio monitors, this comprehensive guide will help you make an informed decision.</p>

    <h2 id="key-factors">Key Factors to Consider</h2>

    <p>Before diving into our top picks, let's explore the essential factors you should consider when choosing wireless headphones:</p>

    <h3 id="sound-quality">Sound Quality</h3>

    <p>Sound quality is subjective, but there are objective metrics like frequency response, driver size, and codec support (aptX, LDAC, AAC) that indicate audio performance. Look for headphones with wide frequency ranges (20Hz-20kHz minimum) and support for high-quality Bluetooth codecs.</p>

    <h3 id="noise-cancellation">Active Noise Cancellation (ANC)</h3>

    <p>If you frequently travel or work in noisy environments, active noise cancellation is essential. The best ANC headphones use multiple microphones and advanced algorithms to eliminate ambient noise without affecting sound quality.</p>

    <blockquote>
      "The difference between good and great wireless headphones often comes down to how well they handle noise cancellation and maintain battery life." - Audio Expert
    </blockquote>

    <h3 id="battery-life">Battery Life</h3>

    <p>Modern wireless headphones should offer at least 20-30 hours of playback time. Premium models often provide 40+ hours, with quick charging features that give you several hours of playback from just 10-15 minutes of charging.</p>

    <h2 id="top-picks">Our Top Picks for 2025</h2>

    <h3 id="premium-choice">Premium Choice: Sony WH-1000XM6</h3>

    <p>The Sony WH-1000XM6 continues the legacy of excellence with industry-leading noise cancellation, exceptional sound quality, and 40-hour battery life. The adaptive sound control adjusts ambient sound based on your activity, making these perfect for any situation.</p>

    <p><strong>Pros:</strong></p>
    <ul>
      <li>Outstanding noise cancellation</li>
      <li>Superior sound quality with LDAC support</li>
      <li>40-hour battery life with quick charging</li>
      <li>Comfortable for extended wear</li>
    </ul>

    <p><strong>Cons:</strong></p>
    <ul>
      <li>Premium price point ($399)</li>
      <li>Not ideal for intense workouts</li>
    </ul>

    <h3 id="best-value">Best Value: Anker Soundcore Life Q35</h3>

    <p>For those on a budget, the Anker Soundcore Life Q35 offers impressive performance at a fraction of the cost. With multi-mode ANC, 40-hour battery life, and LDAC support, these headphones punch well above their weight class.</p>

    <h2 id="conclusion">Final Thoughts</h2>

    <p>Choosing the right wireless headphones depends on your specific needs, budget, and use cases. Whether you opt for premium features or maximize value, the market in 2025 offers exceptional options for every type of listener.</p>
  `,
  category: 'Reviews',
  image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200&h=675&fit=crop',
  publishedAt: '2025-10-31',
  readingTime: '8 min read',
  author: {
    name: 'Sarah Johnson',
    title: 'Audio Technology Expert',
    bio: 'Tech journalist and audiophile with 10+ years of experience reviewing audio equipment. Passionate about helping people find the perfect sound.',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop',
    social: {
      twitter: 'https://twitter.com/sarahaudio',
      linkedin: 'https://linkedin.com/in/sarahjohnson',
      website: 'https://sarahaudioreviews.com',
    },
  },
  relatedArticles: [
    {
      slug: 'best-budget-earbuds-2025',
      title: 'Best Budget Wireless Earbuds Under $100',
      excerpt: 'Quality audio doesn\'t have to break the bank. Our top picks for affordable wireless earbuds.',
      category: 'Reviews',
      image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=225&fit=crop',
      author: 'Sarah Johnson',
      date: 'Oct 28, 2025',
      readingTime: '6 min read',
    },
    {
      slug: 'noise-cancelling-explained',
      title: 'How Active Noise Cancellation Actually Works',
      excerpt: 'Understanding the technology behind ANC and what makes some headphones better than others.',
      category: 'Technology',
      image: 'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=400&h=225&fit=crop',
      author: 'Mike Chen',
      date: 'Oct 25, 2025',
      readingTime: '5 min read',
    },
    {
      slug: 'wireless-vs-wired-headphones',
      title: 'Wireless vs Wired Headphones: Which is Better in 2025?',
      excerpt: 'An honest comparison of wireless and wired headphones for different use cases.',
      category: 'Guides',
      image: 'https://images.unsplash.com/photo-1545127398-14699f92334b?w=400&h=225&fit=crop',
      author: 'Sarah Johnson',
      date: 'Oct 20, 2025',
      readingTime: '7 min read',
    },
  ],
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  // In production, fetch actual article data
  return {
    title: `${mockArticle.title} | AI Affiliate Empire Blog`,
    description: mockArticle.subtitle,
    openGraph: {
      title: mockArticle.title,
      description: mockArticle.subtitle,
      type: 'article',
      publishedTime: mockArticle.publishedAt,
      authors: [mockArticle.author.name],
      images: [{ url: mockArticle.image }],
    },
    twitter: {
      card: 'summary_large_image',
      title: mockArticle.title,
      description: mockArticle.subtitle,
      images: [mockArticle.image],
    },
  }
}

export default function ArticlePage({ params }: { params: { slug: string } }) {
  const article = mockArticle
  const currentUrl = `https://ai-affiliate-empire.com/${article.slug}`

  return (
    <>
      <ProgressBar />

      <div className="min-h-screen bg-background">
        {/* Main Container */}
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          {/* Three-column layout on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_80px] gap-8 xl:gap-12">
            {/* Left Sidebar: Table of Contents (Desktop) */}
            <aside className="hidden lg:block">
              <div className="lg:sticky lg:top-32">
                <TableOfContents />
              </div>
            </aside>

            {/* Main Content */}
            <main className="min-w-0">
              {/* Breadcrumb */}
              <Breadcrumb
                items={[
                  { label: 'Home', href: '/' },
                  { label: article.category, href: `/category/${article.category.toLowerCase()}` },
                  { label: article.title },
                ]}
              />

              {/* Mobile: Table of Contents */}
              <div className="lg:hidden">
                <TableOfContents />
              </div>

              {/* Article Header */}
              <header className="mb-8">
                <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4 text-balance">
                  {article.title}
                </h1>

                {article.subtitle && (
                  <p className="text-xl text-foreground-secondary mb-6 text-balance">
                    {article.subtitle}
                  </p>
                )}

                {/* Meta Info */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-foreground-secondary mb-6">
                  <div className="flex items-center gap-2">
                    {article.author.avatar && (
                      <Image
                        src={article.author.avatar}
                        alt={article.author.name}
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                    )}
                    <span className="font-medium text-foreground">{article.author.name}</span>
                  </div>
                  <span>·</span>
                  <time dateTime={article.publishedAt}>
                    {new Date(article.publishedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </time>
                  <span>·</span>
                  <span>{article.readingTime}</span>
                </div>

                {/* Featured Image */}
                {article.image && (
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-background-secondary mb-8">
                    <Image
                      src={article.image}
                      alt={article.title}
                      fill
                      className="object-cover"
                      priority
                    />
                  </div>
                )}
              </header>

              {/* Affiliate Disclosure */}
              <AffiliateDisclosure />

              {/* Article Content */}
              <article
                className={articleStyles.article}
                dangerouslySetInnerHTML={{ __html: article.content }}
              />

              {/* Author Bio */}
              <AuthorBio author={article.author} />

              {/* Related Articles */}
              <RelatedArticles articleSlug={article.slug} />

              {/* Comments */}
              <CommentsPlaceholder />
            </main>

            {/* Right Sidebar: Social Share (Desktop) */}
            <aside className="hidden lg:block">
              <SocialShare url={currentUrl} title={article.title} />
            </aside>
          </div>
        </div>
      </div>

      {/* Mobile: Social Share Fixed Bottom */}
      <div className="lg:hidden">
        <SocialShare url={currentUrl} title={article.title} />
      </div>
    </>
  )
}
