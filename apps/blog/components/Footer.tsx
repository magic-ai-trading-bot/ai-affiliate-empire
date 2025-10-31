'use client';

import React, { useState, useEffect } from 'react';
import { 
  ArrowUp, 
  Mail, 
  Twitter, 
  Facebook, 
  Instagram, 
  Linkedin, 
  Youtube,
  Send
} from 'lucide-react';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [subscribeStatus, setSubscribeStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Show back to top button when scrolled down
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll to top handler
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Newsletter subscription handler
  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      setSubscribeStatus('error');
      setTimeout(() => setSubscribeStatus('idle'), 3000);
      return;
    }

    setIsSubmitting(true);
    
    try {
      // TODO: Integrate with actual newsletter API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSubscribeStatus('success');
      setEmail('');
      setTimeout(() => setSubscribeStatus('idle'), 3000);
    } catch (error) {
      setSubscribeStatus('error');
      setTimeout(() => setSubscribeStatus('idle'), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { name: 'Home', href: '/' },
    { name: 'Categories', href: '/categories' },
    { name: 'Privacy Policy', href: '/privacy' },
    { name: 'Terms of Service', href: '/terms' },
  ];

  const socialLinks = [
    { name: 'Twitter', icon: Twitter, href: 'https://twitter.com', color: 'hover:text-blue-400' },
    { name: 'Facebook', icon: Facebook, href: 'https://facebook.com', color: 'hover:text-blue-600' },
    { name: 'Instagram', icon: Instagram, href: 'https://instagram.com', color: 'hover:text-pink-500' },
    { name: 'LinkedIn', icon: Linkedin, href: 'https://linkedin.com', color: 'hover:text-blue-700' },
    { name: 'YouTube', icon: Youtube, href: 'https://youtube.com', color: 'hover:text-red-600' },
  ];

  return (
    <footer className="relative bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 transition-colors duration-200">
      {/* Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label="Back to top"
        >
          <ArrowUp className="w-6 h-6" />
        </button>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Site Information */}
          <div className="space-y-4">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              AI Affiliate Empire
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              Discover the best products through AI-powered content. We help you make informed purchasing decisions with honest reviews and comparisons.
            </p>
            <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
              <Mail className="w-4 h-4" />
              <a 
                href="mailto:hello@aiaffiliateempire.com" 
                className="text-sm hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                hello@aiaffiliateempire.com
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Quick Links
            </h4>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-sm"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Social Media */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Follow Us
            </h4>
            <div className="flex flex-wrap gap-3">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-2 bg-gray-200 dark:bg-gray-800 rounded-full text-gray-600 dark:text-gray-400 ${social.color} transition-all duration-200 hover:scale-110`}
                    aria-label={social.name}
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-4">
              Stay updated with our latest content and product recommendations.
            </p>
          </div>

          {/* Newsletter Signup */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Newsletter
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Get exclusive deals and product recommendations directly to your inbox.
            </p>
            <form onSubmit={handleNewsletterSubmit} className="space-y-3">
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full px-4 py-2.5 pr-10 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  disabled={isSubmitting}
                  required
                />
                <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <span>{isSubmitting ? 'Subscribing...' : 'Subscribe'}</span>
                <Send className="w-4 h-4" />
              </button>
              
              {/* Status Messages */}
              {subscribeStatus === 'success' && (
                <p className="text-xs text-green-600 dark:text-green-400">
                  Successfully subscribed! Check your inbox.
                </p>
              )}
              {subscribeStatus === 'error' && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  Something went wrong. Please try again.
                </p>
              )}
            </form>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-3">
              We respect your privacy. Unsubscribe at any time.
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            {/* Copyright */}
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center md:text-left">
              &copy; {currentYear} AI Affiliate Empire. All rights reserved.
            </p>

            {/* FTC Disclosure */}
            <p className="text-xs text-gray-500 dark:text-gray-500 text-center md:text-right max-w-2xl">
              <strong>Disclosure:</strong> As an Amazon Associate and affiliate of other programs, we earn from qualifying purchases. This comes at no additional cost to you.
            </p>
          </div>

          {/* Additional Info */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Made with ❤️ by AI • Powered by Next.js & Tailwind CSS
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
