import Image from 'next/image'

interface AuthorBioProps {
  author: {
    name: string
    title?: string
    bio?: string
    avatar?: string
    social?: {
      twitter?: string
      linkedin?: string
      website?: string
    }
  }
}

export default function AuthorBio({ author }: AuthorBioProps) {
  return (
    <section
      className="mt-16 mb-12 p-6 bg-background-secondary rounded-xl border border-border"
      aria-label="Author information"
    >
      <h2 className="sr-only">About the Author</h2>
      <div className="flex flex-col sm:flex-row gap-4 items-start">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {author.avatar ? (
            <Image
              src={author.avatar}
              alt={author.name}
              width={80}
              height={80}
              className="rounded-full object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">
                {author.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-foreground mb-1">{author.name}</h3>
          {author.title && (
            <p className="text-sm text-foreground-secondary mb-2">{author.title}</p>
          )}
          {author.bio && (
            <p className="text-base text-foreground-secondary leading-relaxed mb-3 line-clamp-3">
              {author.bio}
            </p>
          )}

          {/* Social Links */}
          {author.social && (
            <div className="flex gap-3">
              {author.social.twitter && (
                <a
                  href={author.social.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-foreground-secondary hover:text-primary transition-colors"
                  aria-label="Twitter profile"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"></path>
                  </svg>
                  Twitter
                </a>
              )}

              {author.social.linkedin && (
                <a
                  href={author.social.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-foreground-secondary hover:text-primary transition-colors"
                  aria-label="LinkedIn profile"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"></path>
                    <circle cx="4" cy="4" r="2"></circle>
                  </svg>
                  LinkedIn
                </a>
              )}

              {author.social.website && (
                <a
                  href={author.social.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-foreground-secondary hover:text-primary transition-colors"
                  aria-label="Personal website"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                    />
                  </svg>
                  Website
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
