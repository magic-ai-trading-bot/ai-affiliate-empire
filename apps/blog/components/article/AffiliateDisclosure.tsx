'use client'

import { useState, useEffect } from 'react'

export default function AffiliateDisclosure() {
  const [isDismissed, setIsDismissed] = useState(true)

  useEffect(() => {
    const dismissed = localStorage.getItem('affiliateDisclosureDismissed')
    setIsDismissed(dismissed === 'true')
  }, [])

  const handleDismiss = () => {
    localStorage.setItem('affiliateDisclosureDismissed', 'true')
    setIsDismissed(true)
  }

  if (isDismissed) return null

  return (
    <div
      className="mb-8 p-4 bg-warning-bg border border-warning rounded-lg relative"
      role="alert"
      aria-label="Affiliate disclosure"
    >
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-foreground-secondary hover:text-foreground transition-colors"
        aria-label="Dismiss disclosure"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      <div className="flex items-start gap-3 pr-8">
        <svg
          className="w-5 h-5 text-warning flex-shrink-0 mt-0.5"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
        <div className="flex-1">
          <h3 className="text-sm font-semibold mb-1 text-foreground">
            Affiliate Disclosure
          </h3>
          <p className="text-sm text-foreground-secondary leading-relaxed">
            This article contains affiliate links. We may earn a commission if you purchase
            through these links at no extra cost to you.{' '}
            <a href="/affiliate-disclosure" className="text-primary hover:underline">
              Learn more
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
