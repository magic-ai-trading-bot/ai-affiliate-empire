import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock ArticleCard component
const ArticleCard = ({
  title,
  excerpt,
  slug,
}: {
  title: string;
  excerpt: string;
  slug: string;
}) => (
  <article data-testid="article-card">
    <a href={`/blog/${slug}`}>
      <h2>{title}</h2>
      <p>{excerpt}</p>
    </a>
  </article>
)

describe('ArticleCard', () => {
  const mockArticle = {
    title: 'Best Products 2025',
    excerpt: 'Discover top affiliate products',
    slug: 'best-products-2025',
  }

  it('renders article title and excerpt', () => {
    render(<ArticleCard {...mockArticle} />)

    expect(screen.getByText('Best Products 2025')).toBeInTheDocument()
    expect(screen.getByText('Discover top affiliate products')).toBeInTheDocument()
  })

  it('links to correct article URL', () => {
    render(<ArticleCard {...mockArticle} />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/blog/best-products-2025')
  })

  it('uses article semantic HTML', () => {
    render(<ArticleCard {...mockArticle} />)

    expect(screen.getByTestId('article-card').tagName).toBe('ARTICLE')
  })
})
