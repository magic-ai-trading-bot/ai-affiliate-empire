'use client';

import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';
import { ThemeToggle, SimpleThemeToggle, AdvancedThemeToggle } from '@/components/ThemeToggle';
import { Moon, Sun, Monitor, Check } from 'lucide-react';

export default function DarkModeDemo() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="container-wide py-12">Loading...</div>;
  }

  return (
    <div className="container-wide py-12 space-y-12">
      {/* Hero Section */}
      <section className="text-center space-y-4">
        <h1 className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Dark Mode System Demo
        </h1>
        <p className="text-xl text-foreground-secondary max-w-3xl mx-auto">
          A comprehensive showcase of all dark mode features, components, and styling capabilities
          implemented in the AI Affiliate Blog.
        </p>
      </section>

      {/* Current Theme Status */}
      <section className="bg-card border border-border rounded-lg p-8 space-y-4">
        <h2 className="text-2xl font-bold">Current Theme Status</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <p className="text-sm text-foreground-secondary">Theme Preference</p>
            <p className="text-2xl font-bold capitalize">{theme}</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-foreground-secondary">Resolved Theme</p>
            <p className="text-2xl font-bold capitalize">{resolvedTheme}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-4">
          <button
            onClick={() => setTheme('light')}
            className={`px-4 py-2 rounded-lg border transition-all flex items-center gap-2 ${
              theme === 'light'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border hover:bg-card-hover'
            }`}
          >
            <Sun className="w-4 h-4" />
            Light
            {theme === 'light' && <Check className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`px-4 py-2 rounded-lg border transition-all flex items-center gap-2 ${
              theme === 'dark'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border hover:bg-card-hover'
            }`}
          >
            <Moon className="w-4 h-4" />
            Dark
            {theme === 'dark' && <Check className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setTheme('system')}
            className={`px-4 py-2 rounded-lg border transition-all flex items-center gap-2 ${
              theme === 'system'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border hover:bg-card-hover'
            }`}
          >
            <Monitor className="w-4 h-4" />
            System
            {theme === 'system' && <Check className="w-4 h-4" />}
          </button>
        </div>
      </section>

      {/* Theme Toggle Components */}
      <section className="space-y-6">
        <h2 className="text-3xl font-bold">Theme Toggle Components</h2>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold">Standard Toggle</h3>
            <p className="text-sm text-foreground-secondary">
              Uses ThemeContext with sun/moon icons
            </p>
            <div className="flex justify-center py-4">
              <ThemeToggle />
            </div>
            <code className="text-xs block">
              {`<ThemeToggle />`}
            </code>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold">Simple Toggle</h3>
            <p className="text-sm text-foreground-secondary">
              Standalone version without context
            </p>
            <div className="flex justify-center py-4">
              <SimpleThemeToggle />
            </div>
            <code className="text-xs block">
              {`<SimpleThemeToggle />`}
            </code>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold">Advanced Toggle</h3>
            <p className="text-sm text-foreground-secondary">
              With dropdown for system preference
            </p>
            <div className="flex justify-center py-4">
              <AdvancedThemeToggle />
            </div>
            <code className="text-xs block">
              {`<AdvancedThemeToggle />`}
            </code>
          </div>
        </div>
      </section>

      {/* Color Palette */}
      <section className="space-y-6">
        <h2 className="text-3xl font-bold">Color Palette</h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Backgrounds */}
          <ColorSwatch
            name="Background"
            variable="--background"
            description="Main background color"
          />
          <ColorSwatch
            name="Background Secondary"
            variable="--background-secondary"
            description="Secondary surfaces"
          />
          <ColorSwatch
            name="Background Tertiary"
            variable="--background-tertiary"
            description="Tertiary surfaces"
          />

          {/* Foregrounds */}
          <ColorSwatch
            name="Foreground"
            variable="--foreground"
            description="Primary text color"
          />
          <ColorSwatch
            name="Foreground Secondary"
            variable="--foreground-secondary"
            description="Secondary text"
          />
          <ColorSwatch
            name="Foreground Muted"
            variable="--foreground-muted"
            description="Muted text"
          />

          {/* Interactive */}
          <ColorSwatch
            name="Primary"
            variable="--primary"
            description="Primary brand color"
          />
          <ColorSwatch
            name="Primary Hover"
            variable="--primary-hover"
            description="Primary hover state"
          />

          {/* Status */}
          <ColorSwatch
            name="Success"
            variable="--success"
            description="Success state"
          />
          <ColorSwatch
            name="Warning"
            variable="--warning"
            description="Warning state"
          />
          <ColorSwatch
            name="Danger"
            variable="--danger"
            description="Danger state"
          />
          <ColorSwatch
            name="Info"
            variable="--info"
            description="Info state"
          />
        </div>
      </section>

      {/* Status Colors Demo */}
      <section className="space-y-6">
        <h2 className="text-3xl font-bold">Status Colors</h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="p-4 rounded-lg border-l-4" style={{
              backgroundColor: 'hsl(var(--success-bg))',
              borderColor: 'hsl(var(--success))'
            }}>
              <p className="font-semibold" style={{ color: 'hsl(var(--success))' }}>
                Success Message
              </p>
              <p className="text-sm text-foreground-secondary">
                Your changes have been saved successfully.
              </p>
            </div>

            <div className="p-4 rounded-lg border-l-4" style={{
              backgroundColor: 'hsl(var(--warning-bg))',
              borderColor: 'hsl(var(--warning))'
            }}>
              <p className="font-semibold" style={{ color: 'hsl(var(--warning))' }}>
                Warning Message
              </p>
              <p className="text-sm text-foreground-secondary">
                Please review your changes before proceeding.
              </p>
            </div>

            <div className="p-4 rounded-lg border-l-4" style={{
              backgroundColor: 'hsl(var(--danger-bg))',
              borderColor: 'hsl(var(--danger))'
            }}>
              <p className="font-semibold" style={{ color: 'hsl(var(--danger))' }}>
                Error Message
              </p>
              <p className="text-sm text-foreground-secondary">
                An error occurred while processing your request.
              </p>
            </div>

            <div className="p-4 rounded-lg border-l-4" style={{
              backgroundColor: 'hsl(var(--info-bg))',
              borderColor: 'hsl(var(--info))'
            }}>
              <p className="font-semibold" style={{ color: 'hsl(var(--info))' }}>
                Info Message
              </p>
              <p className="text-sm text-foreground-secondary">
                Did you know you can customize your theme preferences?
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <button className="w-full px-6 py-3 rounded-lg font-medium transition-colors"
              style={{
                backgroundColor: 'hsl(var(--success))',
                color: 'hsl(var(--success-foreground))'
              }}>
              Success Button
            </button>

            <button className="w-full px-6 py-3 rounded-lg font-medium transition-colors"
              style={{
                backgroundColor: 'hsl(var(--warning))',
                color: 'hsl(var(--warning-foreground))'
              }}>
              Warning Button
            </button>

            <button className="w-full px-6 py-3 rounded-lg font-medium transition-colors"
              style={{
                backgroundColor: 'hsl(var(--danger))',
                color: 'hsl(var(--danger-foreground))'
              }}>
              Danger Button
            </button>

            <button className="w-full px-6 py-3 rounded-lg font-medium transition-colors"
              style={{
                backgroundColor: 'hsl(var(--info))',
                color: 'hsl(var(--info-foreground))'
              }}>
              Info Button
            </button>
          </div>
        </div>
      </section>

      {/* Code Syntax Highlighting */}
      <section className="space-y-6">
        <h2 className="text-3xl font-bold">Code Syntax Highlighting</h2>
        <p className="text-foreground-secondary">
          Custom color scheme optimized for both light and dark modes
        </p>

        <pre className="overflow-x-auto">
          <code>
{`// TypeScript Example
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';

/**
 * Custom hook for theme management
 * @returns Theme utilities
 */
function useCustomTheme() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return { theme, toggleTheme, mounted };
}

// Usage
const MyComponent = () => {
  const { theme, toggleTheme } = useCustomTheme();
  const isActive = true;
  const count = 42;

  return (
    <div className="container">
      <h1>Current theme: {theme}</h1>
      <button onClick={toggleTheme}>
        Toggle Theme
      </button>
    </div>
  );
};

export default MyComponent;`}
          </code>
        </pre>
      </section>

      {/* Features List */}
      <section className="space-y-6">
        <h2 className="text-3xl font-bold">Implemented Features</h2>

        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, index) => (
            <div key={index} className="bg-card border border-border rounded-lg p-6 space-y-2">
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className="text-sm text-foreground-secondary">{feature.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// Color Swatch Component
function ColorSwatch({ name, variable, description }: { name: string; variable: string; description: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      <div
        className="w-full h-20 rounded-md border border-border"
        style={{ backgroundColor: `hsl(var(${variable}))` }}
      />
      <div>
        <p className="font-semibold">{name}</p>
        <p className="text-xs text-foreground-muted">{variable}</p>
        <p className="text-sm text-foreground-secondary mt-1">{description}</p>
      </div>
    </div>
  );
}

// Features data
const features = [
  {
    title: 'System Preference Detection',
    description: 'Automatically detects and respects user\'s system theme preference'
  },
  {
    title: 'Persistent Storage',
    description: 'Stores user\'s theme choice in localStorage'
  },
  {
    title: 'Smooth Transitions',
    description: '200ms animations for seamless theme switching'
  },
  {
    title: 'WCAG AAA Contrast',
    description: '7:1+ contrast ratios for optimal accessibility'
  },
  {
    title: 'Code Highlighting',
    description: 'Custom syntax colors for both light and dark modes'
  },
  {
    title: 'Reduced Motion',
    description: 'Respects prefers-reduced-motion preference'
  },
  {
    title: 'Focus States',
    description: 'Clear focus indicators for keyboard navigation'
  },
  {
    title: 'Multiple Implementations',
    description: 'Choose between next-themes, context, or hooks'
  }
];
