import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock the stats card component inline for testing
const StatsCard = ({ title, value, change }: { title: string; value: string; change?: string }) => (
  <div data-testid="stats-card">
    <h3>{title}</h3>
    <p data-testid="value">{value}</p>
    {change && <span data-testid="change">{change}</span>}
  </div>
)

describe('StatsCard', () => {
  it('renders title and value', () => {
    render(<StatsCard title="Revenue" value="$1,234" />)

    expect(screen.getByText('Revenue')).toBeInTheDocument()
    expect(screen.getByTestId('value')).toHaveTextContent('$1,234')
  })

  it('renders change indicator when provided', () => {
    render(<StatsCard title="Clicks" value="1,000" change="+15%" />)

    expect(screen.getByTestId('change')).toHaveTextContent('+15%')
  })

  it('does not render change when not provided', () => {
    render(<StatsCard title="Revenue" value="$1,234" />)

    expect(screen.queryByTestId('change')).not.toBeInTheDocument()
  })
})
