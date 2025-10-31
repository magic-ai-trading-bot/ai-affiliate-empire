'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Menu,
  X,
  ChevronDown,
  Moon,
  Sun,
  Sparkles,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

interface Category {
  name: string;
  slug: string;
  description: string;
}

const categories: Category[] = [
  { name: 'Technology', slug: 'technology', description: 'Latest tech reviews and guides' },
  { name: 'Lifestyle', slug: 'lifestyle', description: 'Health, fitness, and wellness' },
  { name: 'Home & Garden', slug: 'home-garden', description: 'Home improvement and decor' },
  { name: 'Business', slug: 'business', description: 'Productivity and entrepreneurship' },
];

const navigationItems = [
  { name: 'Home', href: '/' },
  { name: 'Categories', href: '#', hasDropdown: true },
  { name: 'About', href: '/about' },
  { name: 'Contact', href: '/contact' },
];

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);

  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsCategoriesOpen(false);
  }, [pathname]);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
        setIsCategoriesOpen(false);
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isMobileMenuOpen]);

  // Mock search autocomplete (replace with real API call)
  useEffect(() => {
    if (searchQuery.length > 2) {
      const mockResults = [
        'Best laptops for programming',
        'Smart home automation guide',
        'Fitness trackers comparison',
        'Sustainable living tips',
      ].filter(item =>
        item.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(mockResults);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <>
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          isScrolled
            ? 'bg-background/95 backdrop-blur-md shadow-md border-b border-border'
            : 'bg-transparent'
        )}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-2 group"
            >
              <motion.div
                whileHover={{ rotate: 180 }}
                transition={{ duration: 0.3 }}
                className="text-primary"
              >
                <Sparkles className="w-6 h-6 lg:w-8 lg:h-8" />
              </motion.div>
              <div className="flex flex-col">
                <span className="text-xl lg:text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                  AI Affiliate
                </span>
                <span className="text-xs text-muted-foreground -mt-1">
                  Smart Reviews
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navigationItems.map((item) => (
                <div key={item.name} className="relative">
                  {item.hasDropdown ? (
                    <div
                      className="relative"
                      onMouseEnter={() => setIsCategoriesOpen(true)}
                      onMouseLeave={() => setIsCategoriesOpen(false)}
                    >
                      <button
                        className={cn(
                          'px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1',
                          'hover:bg-accent hover:text-accent-foreground',
                          isCategoriesOpen && 'bg-accent text-accent-foreground'
                        )}
                      >
                        {item.name}
                        <ChevronDown
                          className={cn(
                            'w-4 h-4 transition-transform duration-200',
                            isCategoriesOpen && 'rotate-180'
                          )}
                        />
                      </button>

                      {/* Categories Dropdown */}
                      <AnimatePresence>
                        {isCategoriesOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="absolute top-full left-0 mt-2 w-80 bg-popover border border-border rounded-lg shadow-lg overflow-hidden"
                          >
                            <div className="p-2">
                              {categories.map((category) => (
                                <Link
                                  key={category.slug}
                                  href={`/category/${category.slug}`}
                                  className="block px-4 py-3 rounded-md hover:bg-accent transition-colors group"
                                >
                                  <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                                    {category.name}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    {category.description}
                                  </div>
                                </Link>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <Link
                      href={item.href}
                      className={cn(
                        'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                        'hover:bg-accent hover:text-accent-foreground',
                        pathname === item.href && 'bg-accent text-accent-foreground'
                      )}
                    >
                      {item.name}
                    </Link>
                  )}
                </div>
              ))}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              {/* Search Button */}
              <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="p-2 rounded-lg hover:bg-accent transition-colors"
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* Dark Mode Toggle */}
              {mounted && (
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg hover:bg-accent transition-colors"
                  aria-label="Toggle theme"
                >
                  {theme === 'dark' ? (
                    <Sun className="w-5 h-5" />
                  ) : (
                    <Moon className="w-5 h-5" />
                  )}
                </button>
              )}

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-accent transition-colors"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <AnimatePresence>
          {isSearchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-border overflow-hidden"
            >
              <div className="container mx-auto px-4 py-4">
                <form onSubmit={handleSearchSubmit} className="relative max-w-2xl mx-auto">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search articles..."
                    className="w-full px-4 py-3 pr-12 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Search className="w-5 h-5" />
                  </button>

                  {/* Autocomplete Results */}
                  {searchResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-lg shadow-lg overflow-hidden"
                    >
                      {searchResults.map((result, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setSearchQuery(result);
                            setSearchResults([]);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-accent transition-colors text-sm"
                        >
                          {result}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Menu Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-16 right-0 bottom-0 w-80 max-w-[85vw] bg-background border-l border-border z-40 lg:hidden overflow-y-auto"
            >
              <nav className="p-4 space-y-2">
                {navigationItems.map((item) => (
                  <div key={item.name}>
                    {item.hasDropdown ? (
                      <>
                        <button
                          onClick={() => setIsCategoriesOpen(!isCategoriesOpen)}
                          className="w-full px-4 py-3 rounded-lg text-left font-medium hover:bg-accent transition-colors flex items-center justify-between"
                        >
                          {item.name}
                          <ChevronDown
                            className={cn(
                              'w-4 h-4 transition-transform duration-200',
                              isCategoriesOpen && 'rotate-180'
                            )}
                          />
                        </button>

                        <AnimatePresence>
                          {isCategoriesOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="ml-4 mt-2 space-y-1 overflow-hidden"
                            >
                              {categories.map((category) => (
                                <Link
                                  key={category.slug}
                                  href={`/category/${category.slug}`}
                                  className="block px-4 py-2 rounded-md text-sm hover:bg-accent transition-colors"
                                >
                                  {category.name}
                                </Link>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </>
                    ) : (
                      <Link
                        href={item.href}
                        className={cn(
                          'block px-4 py-3 rounded-lg font-medium hover:bg-accent transition-colors',
                          pathname === item.href && 'bg-accent'
                        )}
                      >
                        {item.name}
                      </Link>
                    )}
                  </div>
                ))}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Spacer to prevent content from going under fixed header */}
      <div className="h-16 lg:h-20" />
    </>
  );
}
