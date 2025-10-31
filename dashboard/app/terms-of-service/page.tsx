import fs from 'fs';
import path from 'path';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Terms of Service - AI Affiliate Empire',
  description: 'Terms of Service for AI Affiliate Empire - Understand your rights and responsibilities',
};

async function getTermsOfService() {
  const filePath = path.join(process.cwd(), '..', 'docs', 'legal', 'terms-of-service.md');
  const fileContents = fs.readFileSync(filePath, 'utf8');
  return fileContents;
}

export default async function TermsOfServicePage() {
  const content = await getTermsOfService();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 md:px-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Button>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 md:px-6 md:py-12">
        <article className="prose prose-slate dark:prose-invert max-w-4xl mx-auto">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <h1 className="text-4xl font-bold mb-4 text-foreground">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-3xl font-semibold mt-8 mb-4 text-foreground">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-2xl font-semibold mt-6 mb-3 text-foreground">{children}</h3>
              ),
              p: ({ children }) => (
                <p className="text-base leading-7 text-muted-foreground mb-4">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-inside space-y-2 mb-4 text-muted-foreground">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-inside space-y-2 mb-4 text-muted-foreground">{children}</ol>
              ),
              li: ({ children }) => (
                <li className="text-base leading-7">{children}</li>
              ),
              a: ({ href, children }) => (
                <a
                  href={href}
                  className="text-primary hover:underline font-medium"
                  target={href?.startsWith('http') ? '_blank' : undefined}
                  rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                >
                  {children}
                </a>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-foreground">{children}</strong>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto my-6">
                  <table className="min-w-full border border-border rounded-lg">
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="bg-muted">{children}</thead>
              ),
              th: ({ children }) => (
                <th className="px-4 py-2 text-left font-semibold border-b border-border">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="px-4 py-2 border-b border-border">{children}</td>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-primary pl-4 italic my-4 text-muted-foreground">
                  {children}
                </blockquote>
              ),
              code: ({ children }) => (
                <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono">
                  {children}
                </code>
              ),
              hr: () => <hr className="my-8 border-border" />,
            }}
          >
            {content}
          </ReactMarkdown>
        </article>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card/30 mt-12">
        <div className="container mx-auto px-4 py-6 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              Last updated: October 31, 2025
            </p>
            <div className="flex gap-4">
              <Link href="/privacy-policy" className="text-sm text-primary hover:underline">
                Privacy Policy
              </Link>
              <Link href="/cookie-policy" className="text-sm text-primary hover:underline">
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
