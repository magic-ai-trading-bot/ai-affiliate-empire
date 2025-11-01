import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock empty state component
const EmptyState = ({
  title,
  description
}: {
  title: string;
  description?: string
}) => (
  <div data-testid="empty-state" role="status" aria-live="polite">
    <h2>{title}</h2>
    {description && <p>{description}</p>}
  </div>
)

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="No data available" />)

    expect(screen.getByText('No data available')).toBeInTheDocument()
  })

  it('renders description when provided', () => {
    render(
      <EmptyState
        title="No data"
        description="Start by adding some products"
      />
    )

    expect(screen.getByText('Start by adding some products')).toBeInTheDocument()
  })

  it('has proper ARIA attributes for accessibility', () => {
    render(<EmptyState title="No data" />)

    const emptyState = screen.getByTestId('empty-state')
    expect(emptyState).toHaveAttribute('role', 'status')
    expect(emptyState).toHaveAttribute('aria-live', 'polite')
  })
})
