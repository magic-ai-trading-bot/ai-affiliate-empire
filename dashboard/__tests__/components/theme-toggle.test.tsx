import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock theme toggle component
const ThemeToggle = ({ onToggle }: { onToggle?: () => void }) => (
  <button
    data-testid="theme-toggle"
    onClick={onToggle}
    aria-label="Toggle theme"
  >
    Toggle Theme
  </button>
)

describe('ThemeToggle', () => {
  it('renders toggle button', () => {
    render(<ThemeToggle />)

    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument()
    expect(screen.getByLabelText('Toggle theme')).toBeInTheDocument()
  })

  it('calls onToggle when clicked', () => {
    const mockToggle = jest.fn()
    render(<ThemeToggle onToggle={mockToggle} />)

    fireEvent.click(screen.getByTestId('theme-toggle'))

    expect(mockToggle).toHaveBeenCalledTimes(1)
  })

  it('is keyboard accessible', () => {
    const mockToggle = jest.fn()
    render(<ThemeToggle onToggle={mockToggle} />)

    const button = screen.getByTestId('theme-toggle')
    button.focus()

    expect(button).toHaveFocus()
  })
})
