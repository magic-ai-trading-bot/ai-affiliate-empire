import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock Pagination component
const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) => (
  <nav aria-label="Pagination" data-testid="pagination">
    <button
      onClick={() => onPageChange(currentPage - 1)}
      disabled={currentPage === 1}
      aria-label="Previous page"
    >
      Previous
    </button>
    <span aria-current="page">Page {currentPage} of {totalPages}</span>
    <button
      onClick={() => onPageChange(currentPage + 1)}
      disabled={currentPage === totalPages}
      aria-label="Next page"
    >
      Next
    </button>
  </nav>
)

describe('Pagination', () => {
  const mockOnPageChange = jest.fn()

  beforeEach(() => {
    mockOnPageChange.mockClear()
  })

  it('renders current page and total pages', () => {
    render(
      <Pagination
        currentPage={2}
        totalPages={5}
        onPageChange={mockOnPageChange}
      />
    )

    expect(screen.getByText('Page 2 of 5')).toBeInTheDocument()
  })

  it('calls onPageChange when next button clicked', () => {
    render(
      <Pagination
        currentPage={2}
        totalPages={5}
        onPageChange={mockOnPageChange}
      />
    )

    fireEvent.click(screen.getByLabelText('Next page'))

    expect(mockOnPageChange).toHaveBeenCalledWith(3)
  })

  it('calls onPageChange when previous button clicked', () => {
    render(
      <Pagination
        currentPage={2}
        totalPages={5}
        onPageChange={mockOnPageChange}
      />
    )

    fireEvent.click(screen.getByLabelText('Previous page'))

    expect(mockOnPageChange).toHaveBeenCalledWith(1)
  })

  it('disables previous button on first page', () => {
    render(
      <Pagination
        currentPage={1}
        totalPages={5}
        onPageChange={mockOnPageChange}
      />
    )

    expect(screen.getByLabelText('Previous page')).toBeDisabled()
  })

  it('disables next button on last page', () => {
    render(
      <Pagination
        currentPage={5}
        totalPages={5}
        onPageChange={mockOnPageChange}
      />
    )

    expect(screen.getByLabelText('Next page')).toBeDisabled()
  })

  it('has proper ARIA labels for accessibility', () => {
    render(
      <Pagination
        currentPage={2}
        totalPages={5}
        onPageChange={mockOnPageChange}
      />
    )

    const nav = screen.getByTestId('pagination')
    expect(nav).toHaveAttribute('aria-label', 'Pagination')
  })
})
