'use client'

import { useEffect, useState } from 'react'

interface Heading {
  id: string
  text: string
  level: number
}

interface TableOfContentsProps {
  className?: string
}

export default function TableOfContents({ className = '' }: TableOfContentsProps) {
  const [headings, setHeadings] = useState<Heading[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const article = document.querySelector('article')
    if (!article) return

    const elements = article.querySelectorAll('h2, h3')
    const headingElements = Array.from(elements).map((elem) => ({
      id: elem.id,
      text: elem.textContent || '',
      level: parseInt(elem.tagName.substring(1)),
    }))

    setHeadings(headingElements)

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      {
        rootMargin: '-80px 0px -80% 0px',
      }
    )

    elements.forEach((elem) => observer.observe(elem))

    return () => observer.disconnect()
  }, [])

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      const offset = 100
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset
      window.scrollTo({
        top: elementPosition - offset,
        behavior: 'smooth',
      })
      setIsOpen(false)
    }
  }

  if (headings.length === 0) return null

  return (
    <>
      {/* Mobile: Collapsible Accordion */}
      <div className={`lg:hidden mb-8 ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-4 bg-background-secondary rounded-lg border border-border hover:bg-card-hover transition-colors"
          aria-expanded={isOpen}
        >
          <span className="font-semibold text-sm">Table of Contents</span>
          <svg
            className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {isOpen && (
          <nav className="mt-2 p-4 bg-background-secondary rounded-lg border border-border">
            <ul className="space-y-2">
              {headings.map((heading) => (
                <li key={heading.id} style={{ paddingLeft: heading.level === 3 ? '16px' : '0' }}>
                  <button
                    onClick={() => scrollToHeading(heading.id)}
                    className={`text-left text-sm transition-colors hover:text-primary w-full ${
                      activeId === heading.id
                        ? 'text-primary font-semibold'
                        : 'text-foreground-secondary'
                    }`}
                  >
                    {heading.text}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>

      {/* Desktop: Sticky Sidebar */}
      <nav
        className={`hidden lg:block sticky top-32 max-h-[calc(100vh-160px)] overflow-y-auto ${className}`}
        aria-label="Table of Contents"
      >
        <div className="text-sm font-semibold mb-4 text-foreground">Table of Contents</div>
        <ul className="space-y-2">
          {headings.map((heading) => (
            <li key={heading.id} style={{ paddingLeft: heading.level === 3 ? '16px' : '0' }}>
              <button
                onClick={() => scrollToHeading(heading.id)}
                className={`text-left text-sm transition-all duration-200 hover:text-primary w-full relative ${
                  activeId === heading.id
                    ? 'text-primary font-semibold before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-primary before:-ml-4'
                    : 'text-foreground-secondary'
                }`}
              >
                {heading.text}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </>
  )
}
