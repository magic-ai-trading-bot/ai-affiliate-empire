export default function CommentsPlaceholder() {
  return (
    <section className="mt-16 mb-12" aria-label="Comments section">
      <h2 className="text-2xl font-bold mb-6 text-foreground">Comments (0)</h2>

      <div className="border border-border rounded-xl p-8 text-center bg-background-secondary">
        <svg
          className="w-12 h-12 mx-auto mb-4 text-foreground-muted"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>

        <h3 className="text-lg font-semibold mb-2 text-foreground">Be the first to comment</h3>
        <p className="text-foreground-secondary mb-4">
          Share your thoughts and join the conversation
        </p>

        <button
          disabled
          className="px-6 py-2 bg-primary/10 text-primary rounded-lg font-medium cursor-not-allowed"
        >
          Sign in to comment (Coming Soon)
        </button>

        <p className="text-xs text-foreground-muted mt-4">
          Comments feature will be available in a future update
        </p>
      </div>
    </section>
  )
}
