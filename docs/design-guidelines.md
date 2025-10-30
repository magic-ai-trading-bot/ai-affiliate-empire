# AI Affiliate Empire - Design Guidelines

**Version:** 1.0.0
**Last Updated:** 2025-10-31
**Status:** Production

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Spacing & Layout](#spacing--layout)
5. [Components](#components)
6. [Animation & Motion](#animation--motion)
7. [Accessibility](#accessibility)
8. [Responsive Design](#responsive-design)

---

## Design Philosophy

### Core Principles

**1. Clarity Over Cleverness**
- Information hierarchy is paramount
- Users should understand data at a glance
- No unnecessary decoration or complexity

**2. Speed & Performance**
- 60fps animations mandatory
- Smooth transitions, no jank
- Progressive loading, skeleton states
- Optimistic UI updates

**3. Accessibility First**
- WCAG 2.1 AA compliance minimum
- Keyboard navigation for all features
- Screen reader support
- Color contrast ratios meet standards

**4. Data-Driven Design**
- Visualizations tell stories
- Metrics have context (trends, comparisons)
- Real-time updates where valuable
- Empty states guide next actions

**5. Mobile-First Responsive**
- Start with mobile constraints
- Progressive enhancement for larger screens
- Touch-friendly interactions
- Gesture support where appropriate

### Visual Language

**Minimalist & Modern**
- Inspired by Linear, Vercel, Stripe
- Neutral base colors (grays, whites, blacks)
- Strategic accent colors for meaning
- Generous whitespace
- Subtle depth through shadows

**Professional SaaS Aesthetic**
- Clean, polished, trustworthy
- Data density without clutter
- Consistent patterns across features
- Attention to micro-details

---

## Color System

### Semantic Color Tokens

#### Light Mode

```css
:root {
  /* Background */
  --background: 0 0% 100%;              /* hsl(0 0% 100%) - Pure white */
  --background-secondary: 240 4.8% 95.9%; /* hsl(240 4.8% 95.9%) - Gray-50 */
  --background-tertiary: 240 5.9% 90%;  /* hsl(240 5.9% 90%) - Gray-100 */

  /* Foreground */
  --foreground: 240 10% 3.9%;           /* hsl(240 10% 3.9%) - Gray-950 */
  --foreground-secondary: 240 3.8% 46.1%; /* hsl(240 3.8% 46.1%) - Gray-600 */
  --foreground-muted: 240 5% 64.9%;     /* hsl(240 5% 64.9%) - Gray-400 */

  /* Borders */
  --border: 240 5.9% 90%;               /* hsl(240 5.9% 90%) - Gray-200 */
  --border-strong: 240 4.9% 83.9%;      /* hsl(240 4.9% 83.9%) - Gray-300 */

  /* Card */
  --card: 0 0% 100%;                    /* White */
  --card-hover: 240 4.8% 95.9%;         /* Gray-50 */

  /* Accents */
  --primary: 262.1 83.3% 57.8%;         /* Purple-500 */
  --primary-hover: 262.1 83.3% 47.8%;   /* Purple-600 */

  --success: 142.1 76.2% 36.3%;         /* Green-600 */
  --success-bg: 142.1 76.2% 96%;        /* Green-50 */

  --warning: 32.1 94.6% 43.7%;          /* Orange-500 */
  --warning-bg: 32.1 95% 95%;           /* Orange-50 */

  --danger: 0 72.2% 50.6%;              /* Red-500 */
  --danger-bg: 0 70% 96%;               /* Red-50 */

  --info: 221.2 83.2% 53.3%;            /* Blue-600 */
  --info-bg: 221.2 83% 96%;             /* Blue-50 */

  /* Chart Colors */
  --chart-1: 221.2 83.2% 53.3%;         /* Blue-600 */
  --chart-2: 142.1 76.2% 36.3%;         /* Green-600 */
  --chart-3: 262.1 83.3% 57.8%;         /* Purple-500 */
  --chart-4: 32.1 94.6% 43.7%;          /* Orange-500 */
  --chart-5: 340.6 82.2% 52.1%;         /* Pink-500 */
}
```

#### Dark Mode

```css
.dark {
  /* Background */
  --background: 240 10% 3.9%;           /* Gray-950 */
  --background-secondary: 240 3.7% 15.9%; /* Gray-900 */
  --background-tertiary: 240 5.9% 10%;  /* Gray-950 darker */

  /* Foreground */
  --foreground: 0 0% 98%;               /* Gray-50 */
  --foreground-secondary: 240 5% 64.9%; /* Gray-400 */
  --foreground-muted: 240 3.8% 46.1%;   /* Gray-600 */

  /* Borders */
  --border: 240 3.7% 15.9%;             /* Gray-800 */
  --border-strong: 240 5.9% 25%;        /* Gray-700 */

  /* Card */
  --card: 240 3.7% 15.9%;               /* Gray-900 */
  --card-hover: 240 5.9% 20%;           /* Gray-850 */

  /* Accents - Same hue, adjusted for dark bg */
  --primary: 262.1 83.3% 67.8%;         /* Purple-400 */
  --primary-hover: 262.1 83.3% 57.8%;   /* Purple-500 */

  --success: 142.1 70.6% 45.3%;         /* Green-500 */
  --success-bg: 142.1 76.2% 10%;        /* Green-950 */

  --warning: 32.1 94.6% 53.7%;          /* Orange-400 */
  --warning-bg: 32.1 95% 12%;           /* Orange-950 */

  --danger: 0 72.2% 60.6%;              /* Red-400 */
  --danger-bg: 0 70% 12%;               /* Red-950 */

  --info: 221.2 83.2% 63.3%;            /* Blue-400 */
  --info-bg: 221.2 83% 12%;             /* Blue-950 */

  /* Chart Colors - Brighter for dark bg */
  --chart-1: 221.2 83.2% 63.3%;         /* Blue-400 */
  --chart-2: 142.1 70.6% 45.3%;         /* Green-500 */
  --chart-3: 262.1 83.3% 67.8%;         /* Purple-400 */
  --chart-4: 32.1 94.6% 53.7%;          /* Orange-400 */
  --chart-5: 340.6 82.2% 62.1%;         /* Pink-400 */
}
```

### Usage Guidelines

**Backgrounds**
- Primary: Main page background
- Secondary: Section backgrounds, hover states
- Tertiary: Disabled states, inactive elements

**Foregrounds**
- Primary: Headlines, important text
- Secondary: Body text, descriptions
- Muted: Labels, captions, placeholders

**Borders**
- Default: Card borders, dividers
- Strong: Focused inputs, active elements

**Semantic Colors**
- Success: Positive trends, completed actions
- Warning: Attention needed, moderate issues
- Danger: Errors, critical alerts, negative trends
- Info: Neutral information, tips
- Primary: CTAs, links, interactive elements

**Chart Colors**
- Use sequential order for multiple metrics
- Maintain consistent color per metric across dashboard
- Ensure sufficient contrast in dark mode

---

## Typography

### Font Family

**Primary:** Inter (Google Fonts)
- Supports Vietnamese characters
- Clean, modern, highly legible
- Variable font for performance

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

body {
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11'; /* Inter alternates */
}
```

### Type Scale

| Name | Size | Line Height | Weight | Usage |
|------|------|-------------|--------|-------|
| **Display** | 48px (3rem) | 56px (3.5rem) | 900 | Dashboard title (rare) |
| **H1** | 36px (2.25rem) | 40px (2.5rem) | 800 | Page sections |
| **H2** | 30px (1.875rem) | 36px (2.25rem) | 700 | Card titles |
| **H3** | 24px (1.5rem) | 32px (2rem) | 600 | Subsections |
| **Body Large** | 18px (1.125rem) | 28px (1.75rem) | 500 | Key metrics |
| **Body** | 16px (1rem) | 24px (1.5rem) | 400 | Default text |
| **Small** | 14px (0.875rem) | 20px (1.25rem) | 400 | Labels |
| **Tiny** | 12px (0.75rem) | 16px (1rem) | 500 | Captions |

### Usage Guidelines

**Hierarchy**
1. One H1 per page maximum
2. H2 for major sections
3. H3 for card titles
4. Body for paragraphs
5. Small for labels, metadata
6. Tiny for timestamps, footnotes

**Weights**
- 400: Regular body text
- 500: Emphasized text, button labels
- 600: Subheadings, small headlines
- 700: Card titles, section headers
- 800: Page headers
- 900: Hero text (rare)

**Line Height**
- Headlines: 1.1-1.2 (tight)
- Body text: 1.5 (comfortable reading)
- UI elements: 1.4 (compact but readable)

**Letter Spacing**
- Default: 0 (Inter has good spacing)
- Headlines 24px+: -0.02em (tighten slightly)
- All caps: 0.05em (loosen)

---

## Spacing & Layout

### Spacing Scale

**8px Base Unit**

```css
/* Tailwind config equivalent */
{
  0: '0px',
  0.5: '2px',   /* 0.125rem */
  1: '4px',     /* 0.25rem */
  2: '8px',     /* 0.5rem */
  3: '12px',    /* 0.75rem */
  4: '16px',    /* 1rem */
  5: '20px',    /* 1.25rem */
  6: '24px',    /* 1.5rem */
  8: '32px',    /* 2rem */
  10: '40px',   /* 2.5rem */
  12: '48px',   /* 3rem */
  16: '64px',   /* 4rem */
  20: '80px',   /* 5rem */
  24: '96px',   /* 6rem */
}
```

### Layout Grid

**12-Column Responsive Grid**

```css
.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 32px; /* Desktop */
}

@media (max-width: 768px) {
  .container {
    padding: 0 16px; /* Mobile */
  }
}
```

**Grid Gap:** 24px (1.5rem)

### Component Spacing

**Cards**
- Padding: 24px (desktop), 16px (mobile)
- Gap between cards: 24px
- Inner content spacing: 16px

**Sections**
- Margin bottom: 32px
- Padding: 0 (use container padding)

**Lists**
- Item padding: 12px
- Item gap: 8px

---

## Components

### Card

**Variants:**
1. **Default** - Subtle border, white bg, no shadow
2. **Elevated** - Border + subtle shadow
3. **Interactive** - Hover state with elevation
4. **Ghost** - No border, transparent bg

**Anatomy:**
```tsx
<Card variant="elevated">
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Optional description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Main content */}
  </CardContent>
  <CardFooter>
    {/* Optional footer */}
  </CardFooter>
</Card>
```

**Styling:**
- Border radius: 12px (0.75rem)
- Border width: 1px
- Padding: 24px (1.5rem)
- Shadow (elevated): `0 1px 3px 0 rgb(0 0 0 / 0.1)`

### Button

**Variants:**
1. **Primary** - Solid bg, white text
2. **Secondary** - Border, no fill
3. **Ghost** - No border, transparent bg
4. **Destructive** - Red bg, white text
5. **Link** - Underline on hover

**Sizes:**
- Small: 32px height, 12px padding
- Default: 40px height, 16px padding
- Large: 48px height, 24px padding

**States:**
- Default
- Hover (subtle bg change)
- Active (pressed state)
- Disabled (50% opacity, no pointer)
- Loading (spinner + disabled)

### Stats Card

**Structure:**
- Icon (top-right, colored)
- Label (top-left, muted)
- Large value (center, bold)
- Trend indicator (bottom, colored)
- Optional sparkline (bottom)

**Interaction:**
- Hover: Subtle elevation
- Click: Navigate to detail view (future)

### Charts

**Common Features:**
- Responsive container
- Tooltip on hover
- Legend (toggleable)
- Loading skeleton
- Empty state
- Export button (future)

**Types:**
1. **Line** - Trends over time
2. **Area** - Cumulative trends
3. **Bar** - Comparisons
4. **Pie/Donut** - Distribution
5. **Sparkline** - Micro trends in cards

---

## Animation & Motion

### Timing Functions

```css
--ease-linear: cubic-bezier(0, 0, 1, 1);
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
```

### Duration Scale

| Duration | Timing | Use Case |
|----------|--------|----------|
| **Instant** | 100ms | Micro-interactions (button press) |
| **Fast** | 200ms | Hover, focus states |
| **Normal** | 300ms | Content transitions, modals |
| **Slow** | 500ms | Layout changes, page transitions |
| **Very Slow** | 1000ms | Large content loads |

### Animation Principles

**1. Purposeful Motion**
- Animations guide attention
- Feedback for user actions
- Show relationships between elements

**2. Performance**
- Only animate transform and opacity
- Use `will-change` sparingly
- Avoid animating layout properties (width, height, margin)

**3. Respect User Preferences**
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Common Patterns

**Fade In**
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
.fade-in {
  animation: fadeIn 300ms ease-out;
}
```

**Slide Up**
```css
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.slide-up {
  animation: slideUp 300ms ease-out;
}
```

**Pulse (Loading)**
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

**Number Count Up**
- Use JavaScript to animate value changes
- Duration: 500-1000ms depending on magnitude
- Easing: ease-out for natural deceleration

---

## Accessibility

### WCAG 2.1 AA Requirements

**Color Contrast**
- Normal text (< 18px): 4.5:1 minimum
- Large text (≥ 18px): 3:1 minimum
- UI components: 3:1 minimum
- Test with tools: Stark, axe DevTools

**Focus Indicators**
- Visible on all interactive elements
- 2px solid outline
- Color: primary accent
- Offset: 2px from element

```css
:focus-visible {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
}
```

**Keyboard Navigation**
- Tab: Move forward through interactive elements
- Shift+Tab: Move backward
- Enter/Space: Activate buttons, links
- Escape: Close modals, cancel actions
- Arrow keys: Navigate within components (charts, lists)

**Screen Readers**
- Use semantic HTML (`<button>`, `<nav>`, `<main>`)
- ARIA labels for icons: `<Icon aria-label="Dashboard" />`
- ARIA live regions for dynamic updates: `<div aria-live="polite">Updated 2 mins ago</div>`
- Alt text for images: `<img alt="Revenue trend chart showing 15% growth" />`

### ARIA Patterns

**Stats Card**
```tsx
<div role="region" aria-labelledby="revenue-title">
  <h3 id="revenue-title">Total Revenue</h3>
  <div aria-label="$12,345 revenue, up 15% from last week">
    <span className="sr-only">$12,345 revenue, up 15% from last week</span>
    <div aria-hidden="true">$12,345</div>
    <div aria-hidden="true">+15%</div>
  </div>
</div>
```

**Interactive Chart**
```tsx
<div role="img" aria-label="Revenue chart showing 7-day trend from $100 to $150">
  <ResponsiveContainer>
    {/* Chart JSX */}
  </ResponsiveContainer>
</div>
```

**Loading State**
```tsx
<div role="status" aria-live="polite" aria-label="Loading dashboard data">
  <Spinner aria-hidden="true" />
  <span className="sr-only">Loading dashboard data...</span>
</div>
```

---

## Responsive Design

### Breakpoints

```css
/* Mobile */
@media (min-width: 320px) { /* Styles */ }

/* Tablet */
@media (min-width: 768px) { /* Styles */ }

/* Desktop */
@media (min-width: 1024px) { /* Styles */ }

/* Large Desktop */
@media (min-width: 1440px) { /* Styles */ }
```

### Mobile-First Approach

**Always start with mobile styles, enhance for larger screens:**

```tsx
// ❌ Wrong
<div className="grid grid-cols-4 md:grid-cols-1">

// ✅ Correct
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
```

### Component Adaptations

**Stats Cards**
- Mobile: 1 column, full width
- Tablet: 2 columns
- Desktop: 4 columns

**Charts**
- Mobile: Full width, height: 250px
- Desktop: 8-column span, height: 400px

**Top Products**
- Mobile: Full width, simplified layout
- Desktop: 4-column span, full details

**Touch Targets**
- Minimum: 44x44px (Apple HIG)
- Preferred: 48x48px (Material Design)
- Spacing: 8px between targets

### Typography Scaling

```css
/* Mobile */
h1 { font-size: 24px; }
h2 { font-size: 20px; }
body { font-size: 16px; }

/* Desktop */
@media (min-width: 1024px) {
  h1 { font-size: 36px; }
  h2 { font-size: 30px; }
  body { font-size: 16px; /* Same */ }
}
```

### Images & Media

- Use `next/image` for optimization
- Serve WebP with fallbacks
- Lazy load below fold
- Responsive srcset for different densities

---

## Best Practices

### Do's ✅

1. **Use design tokens** - Always reference CSS variables, never hardcode colors
2. **Mobile-first** - Design and code for mobile, enhance for desktop
3. **Semantic HTML** - Use proper elements (`<button>`, `<nav>`, `<article>`)
4. **Test accessibility** - Use keyboard, screen readers, check contrast
5. **Respect motion preferences** - Disable animations for users who prefer reduced motion
6. **Loading states** - Show skeletons/spinners, never blank screens
7. **Error boundaries** - Catch errors gracefully, provide recovery
8. **Empty states** - Guide users when data is missing
9. **Consistent patterns** - Reuse components, maintain familiarity
10. **Performance** - Optimize images, lazy load, code split

### Don'ts ❌

1. **Hardcode colors** - Always use design tokens
2. **Skip loading states** - Users need feedback
3. **Ignore mobile** - Mobile traffic often > 50%
4. **Animate layout** - Only animate transform/opacity
5. **Skip focus states** - Keyboard users need visibility
6. **Use low contrast** - Check WCAG ratios
7. **Forget empty states** - "No data" needs design too
8. **Mix patterns** - Inconsistency confuses users
9. **Over-animate** - Subtle is better
10. **Skip dark mode** - Users expect it in 2025

---

## Tools & Resources

### Design Tools
- Figma - Design mockups
- Stark - Accessibility checker
- Contrast Checker - WCAG compliance

### Development Tools
- Tailwind CSS IntelliSense - VSCode extension
- axe DevTools - Browser extension
- React DevTools - Component inspection

### Testing
- Lighthouse - Performance, accessibility
- WAVE - Accessibility testing
- Browser DevTools - Responsive testing

### References
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Recharts Documentation](https://recharts.org/)
- [Radix UI Primitives](https://www.radix-ui.com/)

---

**Version History**
- 1.0.0 (2025-10-31): Initial design system documentation
