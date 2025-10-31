'use client'

import { useState } from 'react'

interface SocialShareProps {
  url: string
  title: string
  className?: string
}

export default function SocialShare({ url, title, className = '' }: SocialShareProps) {
  const [showToast, setShowToast] = useState(false)

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setShowToast(true)
      setTimeout(() => setShowToast(false), 2000)
    } catch (err) {
      // Failed to copy - silently handle
    }
  }

  const nativeShare = async () => {
    if ('share' in navigator) {
      try {
        await navigator.share({
          title,
          url,
        })
      } catch (err) {
        // Share cancelled or failed - silently ignore
      }
    }
  }

  return (
    <>
      {/* Desktop: Sticky Left Sidebar */}
      <div className={`hidden lg:flex lg:flex-col lg:gap-3 lg:sticky lg:top-32 ${className}`}>
        <a
          href={shareLinks.twitter}
          target="_blank"
          rel="noopener noreferrer"
          className="w-12 h-12 flex items-center justify-center rounded-full bg-background-secondary border border-border hover:bg-[#1DA1F2] hover:text-white hover:scale-110 transition-all duration-200"
          aria-label="Share on Twitter"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"></path>
          </svg>
        </a>

        <a
          href={shareLinks.facebook}
          target="_blank"
          rel="noopener noreferrer"
          className="w-12 h-12 flex items-center justify-center rounded-full bg-background-secondary border border-border hover:bg-[#1877F2] hover:text-white hover:scale-110 transition-all duration-200"
          aria-label="Share on Facebook"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"></path>
          </svg>
        </a>

        <a
          href={shareLinks.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          className="w-12 h-12 flex items-center justify-center rounded-full bg-background-secondary border border-border hover:bg-[#0A66C2] hover:text-white hover:scale-110 transition-all duration-200"
          aria-label="Share on LinkedIn"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"></path>
            <circle cx="4" cy="4" r="2"></circle>
          </svg>
        </a>

        <button
          onClick={copyToClipboard}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-background-secondary border border-border hover:bg-primary hover:text-white hover:scale-110 transition-all duration-200"
          aria-label="Copy link"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </button>
      </div>

      {/* Mobile: Fixed Bottom Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-lg border-t border-border z-40">
        <div className="flex items-center justify-around p-4 max-w-md mx-auto">
          <a
            href={shareLinks.twitter}
            target="_blank"
            rel="noopener noreferrer"
            className="w-12 h-12 flex items-center justify-center rounded-full bg-background-secondary hover:bg-[#1DA1F2] hover:text-white transition-colors"
            aria-label="Share on Twitter"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"></path>
            </svg>
          </a>

          <a
            href={shareLinks.facebook}
            target="_blank"
            rel="noopener noreferrer"
            className="w-12 h-12 flex items-center justify-center rounded-full bg-background-secondary hover:bg-[#1877F2] hover:text-white transition-colors"
            aria-label="Share on Facebook"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"></path>
            </svg>
          </a>

          <a
            href={shareLinks.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="w-12 h-12 flex items-center justify-center rounded-full bg-background-secondary hover:bg-[#0A66C2] hover:text-white transition-colors"
            aria-label="Share on LinkedIn"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"></path>
              <circle cx="4" cy="4" r="2"></circle>
            </svg>
          </a>

          {typeof navigator !== 'undefined' && 'share' in navigator ? (
            <button
              onClick={nativeShare}
              className="w-12 h-12 flex items-center justify-center rounded-full bg-background-secondary hover:bg-primary hover:text-white transition-colors"
              aria-label="Share"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
            </button>
          ) : (
            <button
              onClick={copyToClipboard}
              className="w-12 h-12 flex items-center justify-center rounded-full bg-background-secondary hover:bg-primary hover:text-white transition-colors"
              aria-label="Copy link"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-foreground text-background px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
          Link copied to clipboard!
        </div>
      )}
    </>
  )
}
