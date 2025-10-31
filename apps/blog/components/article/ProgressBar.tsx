'use client'

import { useEffect, useState } from 'react'

export default function ProgressBar() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const updateProgress = () => {
      const article = document.querySelector('article')
      if (!article) return

      const articleTop = article.offsetTop
      const articleHeight = article.offsetHeight
      const windowHeight = window.innerHeight
      const scrollY = window.scrollY

      const startProgress = articleTop
      const endProgress = articleTop + articleHeight - windowHeight

      if (scrollY < startProgress) {
        setProgress(0)
      } else if (scrollY > endProgress) {
        setProgress(100)
      } else {
        const currentProgress =
          ((scrollY - startProgress) / (endProgress - startProgress)) * 100
        setProgress(currentProgress)
      }
    }

    window.addEventListener('scroll', updateProgress, { passive: true })
    updateProgress()

    return () => window.removeEventListener('scroll', updateProgress)
  }, [])

  return (
    <div
      className="fixed top-0 left-0 right-0 h-[3px] z-50 bg-background-secondary"
      role="progressbar"
      aria-label="Reading progress"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full bg-gradient-to-r from-primary to-primary-hover transition-all duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}
