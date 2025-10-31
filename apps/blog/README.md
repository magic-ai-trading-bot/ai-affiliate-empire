# AI Affiliate Empire - Blog

Beautiful, accessible, and performant blog application built with Next.js 14, featuring an award-winning article detail page design.

## Features

### Article Detail Page

- ✅ **Optimal Reading Experience** - Typography-first design with 19px body text, 1.7 line-height, Inter font
- ✅ **Table of Contents** - Sticky sidebar (desktop), collapsible accordion (mobile), auto-highlighting
- ✅ **Progress Indicator** - Smooth gradient bar showing reading progress
- ✅ **Social Sharing** - Sticky buttons (desktop), fixed bottom bar (mobile), native share API
- ✅ **Author Bio** - Credibility section with avatar, bio, social links
- ✅ **Related Articles** - Smart recommendations with responsive grid
- ✅ **Comments** - Placeholder for future integration (Giscus, Disqus, custom)
- ✅ **Breadcrumb Navigation** - Clear path with Home > Category > Article
- ✅ **Reading Time** - Estimated reading duration in header
- ✅ **Code Highlighting** - Design tokens ready for Shiki integration
- ✅ **Image Galleries** - Next.js Image optimization with lazy loading
- ✅ **Affiliate Disclosure** - FTC-compliant banner with dismiss functionality

### Comprehensive Footer

- **Responsive Design**: Mobile-first design that works on all devices
- **Dark Mode Support**: Built-in dark mode with Tailwind CSS
- Site information and description
- Quick links (Home, Categories, Privacy, Terms)
- Social media links (Twitter, Facebook, Instagram, LinkedIn, YouTube)
- Newsletter signup form with email validation
- Copyright notice with FTC disclosure
- Back to top button (appears on scroll)
- Smooth animations and transitions

## Getting Started

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3002](http://localhost:3002) in your browser.

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
apps/blog/
├── app/
│   ├── [slug]/
│   │   └── page.tsx           # Article detail page
│   ├── layout.tsx              # Root layout with footer
│   ├── page.tsx                # Homepage
│   ├── globals.css             # Global styles + design tokens
│   ├── categories/             # Categories page
│   ├── privacy/                # Privacy policy
│   └── terms/                  # Terms of service
├── components/
│   ├── article/
│   │   ├── ProgressBar.tsx          # Reading progress indicator
│   │   ├── TableOfContents.tsx      # Sticky TOC with auto-highlighting
│   │   ├── SocialShare.tsx          # Social sharing buttons
│   │   ├── AffiliateDisclosure.tsx  # FTC-compliant disclosure
│   │   ├── AuthorBio.tsx            # Author information card
│   │   ├── RelatedArticles.tsx      # Related content grid
│   │   └── CommentsPlaceholder.tsx  # Future comments section
│   ├── ui/
│   │   └── Breadcrumb.tsx           # Navigation breadcrumbs
│   └── Footer.tsx                   # Comprehensive footer component
├── styles/
│   └── article.module.css     # Article typography styles
└── public/                     # Static assets
```

## Footer Component Features

### 1. Site Information
- Brand name and description
- Contact email with icon
- Responsive text sizing

### 2. Quick Links
- Home, Categories, Privacy, Terms
- Hover effects
- Accessible navigation

### 3. Social Media
- 5 social platforms with icons
- Custom hover colors per platform
- Opens in new tab with proper rel attributes
- Scale animation on hover

### 4. Newsletter Signup
- Email validation
- Loading state during submission
- Success/error status messages
- Disabled state during processing
- Privacy notice

### 5. Back to Top Button
- Appears after scrolling 300px
- Fixed position (bottom-right)
- Smooth scroll animation
- Scale effect on hover
- Focus ring for accessibility

### 6. Copyright & FTC Disclosure
- Dynamic year
- Full FTC affiliate disclosure
- Responsive layout

### 7. Dark Mode Support
- Uses Tailwind CSS dark mode classes
- Smooth color transitions
- Proper contrast ratios
- Works with system preferences

### 8. Responsive Design
- Mobile: Single column layout
- Tablet: 2 column layout
- Desktop: 4 column layout
- Flexible spacing and padding

## Customization

### Update Social Links
Edit the `socialLinks` array in `components/Footer.tsx`:

```typescript
const socialLinks = [
  { name: 'Twitter', icon: Twitter, href: 'YOUR_TWITTER_URL', color: 'hover:text-blue-400' },
  // ...
];
```

### Update Quick Links
Edit the `quickLinks` array in `components/Footer.tsx`:

```typescript
const quickLinks = [
  { name: 'Home', href: '/' },
  // ...
];
```

### Newsletter Integration
Update the `handleNewsletterSubmit` function in `components/Footer.tsx` to integrate with your newsletter service (Mailchimp, ConvertKit, etc.).

## Technologies

- **Next.js 14**: React framework with App Router
- **React 18**: UI library
- **TypeScript**: Type safety
- **Tailwind CSS 3**: Utility-first CSS
- **Lucide React**: Icon library
- **Next Themes**: Dark mode support (ready to integrate)

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT
