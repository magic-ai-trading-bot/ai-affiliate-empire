import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock Newsletter component
const Newsletter = ({ onSubmit }: { onSubmit?: (email: string) => void }) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    onSubmit?.(email)
  }

  return (
    <section data-testid="newsletter" aria-label="Newsletter signup">
      <h2>Subscribe to our newsletter</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          name="email"
          placeholder="Enter your email"
          required
          aria-label="Email address"
        />
        <button type="submit">Subscribe</button>
      </form>
    </section>
  )
}

describe('Newsletter', () => {
  it('renders newsletter heading', () => {
    render(<Newsletter />)

    expect(screen.getByText('Subscribe to our newsletter')).toBeInTheDocument()
  })

  it('has email input field', () => {
    render(<Newsletter />)

    const input = screen.getByLabelText('Email address')
    expect(input).toHaveAttribute('type', 'email')
    expect(input).toHaveAttribute('required')
  })

  it('calls onSubmit with email when form submitted', () => {
    const mockSubmit = jest.fn()
    render(<Newsletter onSubmit={mockSubmit} />)

    const input = screen.getByLabelText('Email address')
    const button = screen.getByText('Subscribe')

    fireEvent.change(input, { target: { value: 'test@example.com' } })
    fireEvent.click(button)

    expect(mockSubmit).toHaveBeenCalledWith('test@example.com')
  })

  it('has proper ARIA labels for accessibility', () => {
    render(<Newsletter />)

    const section = screen.getByTestId('newsletter')
    expect(section).toHaveAttribute('aria-label', 'Newsletter signup')
  })
})
