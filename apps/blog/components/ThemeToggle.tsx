'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * ThemeToggle Component
 *
 * A beautiful, animated theme toggle button with icon transitions.
 * Features:
 * - Smooth icon animations
 * - Accessible with ARIA labels
 * - Keyboard navigation support
 * - Visual feedback on hover/focus
 * - Sun/Moon icons with rotation effect
 */
export function ThemeToggle() {
  const { theme, resolvedTheme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <button
        className="theme-toggle theme-toggle-skeleton"
        aria-label="Toggle theme"
        disabled
      >
        <div className="theme-toggle-icon">
          <SunIcon />
        </div>
      </button>
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      aria-pressed={isDark}
      type="button"
    >
      <div className="theme-toggle-icon-wrapper">
        {isDark ? (
          <MoonIcon className="theme-toggle-icon theme-toggle-icon-active" />
        ) : (
          <SunIcon className="theme-toggle-icon theme-toggle-icon-active" />
        )}
      </div>
      <span className="sr-only">
        {isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      </span>
    </button>
  );
}

/**
 * Simple ThemeToggle variant without context (uses hook directly)
 */
export function SimpleThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggle = () => {
    const root = document.documentElement;
    const newTheme = root.classList.contains('dark') ? 'light' : 'dark';

    if (newTheme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }

    localStorage.setItem('blog-theme-preference', newTheme);
    setIsDark(newTheme === 'dark');
  };

  if (!mounted) {
    return (
      <button className="theme-toggle theme-toggle-skeleton" disabled>
        <SunIcon />
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className="theme-toggle"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? <MoonIcon className="theme-toggle-icon-active" /> : <SunIcon className="theme-toggle-icon-active" />}
    </button>
  );
}

// Sun Icon Component
function SunIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`sun-icon ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="M4.93 4.93l1.41 1.41" />
      <path d="M17.66 17.66l1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="M6.34 17.66l-1.41 1.41" />
      <path d="M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

// Moon Icon Component
function MoonIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`moon-icon ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

/**
 * Advanced ThemeToggle with dropdown for system preference
 */
export function AdvancedThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <button className="theme-toggle theme-toggle-skeleton" disabled><SunIcon /></button>;
  }

  return (
    <div className="theme-toggle-dropdown">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="theme-toggle"
        aria-label="Theme options"
        aria-expanded={showMenu}
      >
        {theme === 'dark' ? <MoonIcon /> : theme === 'light' ? <SunIcon /> : <SystemIcon />}
      </button>

      {showMenu && (
        <div className="theme-menu">
          <button
            onClick={() => {
              setTheme('light');
              setShowMenu(false);
            }}
            className={theme === 'light' ? 'active' : ''}
          >
            <SunIcon /> Light
          </button>
          <button
            onClick={() => {
              setTheme('dark');
              setShowMenu(false);
            }}
            className={theme === 'dark' ? 'active' : ''}
          >
            <MoonIcon /> Dark
          </button>
          <button
            onClick={() => {
              setTheme('system');
              setShowMenu(false);
            }}
            className={theme === 'system' ? 'active' : ''}
          >
            <SystemIcon /> System
          </button>
        </div>
      )}
    </div>
  );
}

// System Icon Component
function SystemIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
    </svg>
  );
}
