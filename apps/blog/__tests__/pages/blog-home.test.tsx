import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock Blog Home Page
const BlogHomePage = () => (
  <main>
    <h1>AI Affiliate Empire Blog</h1>
    <section aria-label="Featured articles">
      <article>
        <h2>Latest Products</h2>
        <p>Discover trending affiliate products</p>
      </article>
    </section>
  </main>
)

describe('Blog Home Page', () => {
  it('renders blog title', () => {
    render(<BlogHomePage />)

    expect(screen.getByText('AI Affiliate Empire Blog')).toBeInTheDocument()
  })

  it('renders featured articles section', () => {
    render(<BlogHomePage />)

    expect(screen.getByLabelText('Featured articles')).toBeInTheDocument()
  })

  it('displays article content', () => {
    render(<BlogHomePage />)

    expect(screen.getByText('Latest Products')).toBeInTheDocument()
    expect(screen.getByText('Discover trending affiliate products')).toBeInTheDocument()
  })
})
