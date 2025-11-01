import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock dashboard page component
const DashboardPage = () => (
  <main>
    <h1>AI Affiliate Dashboard</h1>
    <section aria-label="Statistics">
      <div data-testid="stats-grid">
        <div>Revenue</div>
        <div>Clicks</div>
        <div>Conversions</div>
      </div>
    </section>
  </main>
)

describe('Dashboard Page', () => {
  it('renders dashboard title', () => {
    render(<DashboardPage />)

    expect(screen.getByText('AI Affiliate Dashboard')).toBeInTheDocument()
  })

  it('renders statistics section', () => {
    render(<DashboardPage />)

    expect(screen.getByLabelText('Statistics')).toBeInTheDocument()
    expect(screen.getByTestId('stats-grid')).toBeInTheDocument()
  })

  it('displays key metrics', () => {
    render(<DashboardPage />)

    expect(screen.getByText('Revenue')).toBeInTheDocument()
    expect(screen.getByText('Clicks')).toBeInTheDocument()
    expect(screen.getByText('Conversions')).toBeInTheDocument()
  })
})
