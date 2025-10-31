# Dark Mode Implementation Guide

## Overview

Complete dark mode system for AI Affiliate Blog with system preference detection, localStorage persistence, smooth transitions, and accessibility features.

## Features Implemented ✅

### 1. Theme Toggle Button
- Sun/Moon icons with smooth animations
- Multiple variants (Simple, Standard, Advanced)
- Accessible ARIA labels
- Keyboard navigation
- Hydration-safe

### 2. System Preference Detection
- Detects `(prefers-color-scheme: dark)`
- Real-time system theme change listening
- Graceful fallback

### 3. Persistent Storage
- localStorage key: `blog-theme-preference`
- Modes: `light`, `dark`, `system`
- Survives refreshes

### 4. Smooth Transitions
- 200ms color transitions
- `prefers-reduced-motion` support
- No jarring switches

### 5. Complete Color Palette
- 40+ CSS custom properties
- Semantic naming
- Proper contrast ratios (WCAG AAA)
- Status colors

### 6. Code Syntax Highlighting
- Custom light/dark themes
- Prism.js compatible
- High contrast

### 7. Accessibility
- WCAG AAA contrast (7:1+)
- Focus indicators
- Reduced motion support
- Screen reader labels

## Implementation Options

### Option 1: next-themes (Current)

```tsx
import { useTheme } from 'next-themes';

function Component() {
  const { theme, setTheme } = useTheme();
  return <button onClick={() => setTheme('dark')}>Dark</button>;
}
```

### Option 2: Custom ThemeContext

```tsx
import { useTheme } from '@/contexts/ThemeContext';

function Component() {
  const { theme, toggleTheme } = useTheme();
  return <button onClick={toggleTheme}>Toggle</button>;
}
```

### Option 3: useDarkMode Hook

```tsx
import { useDarkMode } from '@/hooks/useDarkMode';

function Component() {
  const { isDark, toggleTheme } = useDarkMode();
  return <button onClick={toggleTheme}>Toggle</button>;
}
```

## Color Variables

### Usage

```css
/* CSS */
.element {
  background: hsl(var(--background));
  color: hsl(var(--foreground));
}
```

```tsx
{/* Tailwind */}
<div className="bg-background text-foreground border-border">
  Content
</div>
```

### Available Variables

**Backgrounds**: --background, --background-secondary, --background-tertiary
**Foregrounds**: --foreground, --foreground-secondary, --foreground-muted
**Interactive**: --primary, --primary-hover, --primary-foreground
**Status**: --success, --warning, --danger, --info
**Code**: --code-bg, --code-text, --code-keyword, --code-string

## Components

### ThemeToggle

```tsx
import { ThemeToggle } from '@/components/ThemeToggle';
<ThemeToggle />
```

### SimpleThemeToggle

```tsx
import { SimpleThemeToggle } from '@/components/ThemeToggle';
<SimpleThemeToggle />
```

### AdvancedThemeToggle

```tsx
import { AdvancedThemeToggle } from '@/components/ThemeToggle';
<AdvancedThemeToggle />
```

## File Structure

```
apps/blog/
├── app/
│   ├── globals.css          # Dark mode styles + syntax highlighting
│   └── layout.tsx            # ThemeProvider integration
├── components/
│   ├── ThemeToggle.tsx       # Toggle components (3 variants)
│   ├── theme-provider.tsx    # next-themes wrapper
│   └── Header.tsx            # Header with toggle
├── contexts/
│   └── ThemeContext.tsx      # Custom theme context
└── hooks/
    └── useDarkMode.ts        # Standalone hook
```

## Testing Checklist

- [ ] Toggle works in header
- [ ] System preference detected
- [ ] Theme persists on refresh
- [ ] Code blocks themed correctly
- [ ] Smooth transitions (no flash)
- [ ] Keyboard navigation works
- [ ] Screen reader announces theme
- [ ] Reduced motion respected
- [ ] Works in Chrome, Firefox, Safari

## Browser Support

Chrome/Edge 88+, Firefox 85+, Safari 14+

## Performance

- CSS Variables for O(1) switching
- No FOUC (Flash of Unstyled Content)
- GPU-accelerated transitions

## Troubleshooting

**Theme not persisting**: Check localStorage in DevTools
**Hydration mismatch**: Add `suppressHydrationWarning` to `<html>`
**Slow transitions**: Check `prefers-reduced-motion`
**Colors wrong**: Verify CSS variables in globals.css
