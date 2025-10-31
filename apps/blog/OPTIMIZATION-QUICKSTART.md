# Performance Optimization Quick Start Guide

## Installation & Setup

### 1. Install Dependencies

```bash
cd /Users/dungngo97/Documents/ai-affiliate-empire/apps/blog
npm install
```

This will install the new `web-vitals` package required for performance monitoring.

### 2. Build the Application

```bash
npm run build
```

Expected output:
- Optimized bundles with code splitting
- Image optimization configuration applied
- Service worker generated
- ISR routes configured

### 3. Start Production Server

```bash
npm run start
```

Access the blog at: http://localhost:3002

---

## Verification Checklist

### ✅ Image Optimization
1. Open browser DevTools → Network tab
2. Navigate to homepage
3. Verify:
   - Images load as WebP/AVIF
   - Blur placeholders appear before images load
   - Below-fold images lazy load
   - No layout shift during image load

### ✅ Font Optimization
1. Check Network tab for font requests
2. Verify:
   - Fonts load from self-hosted files
   - No external font CDN requests
   - Fallback fonts prevent FOIT
   - Font files are preloaded

### ✅ Code Splitting
1. Open Network tab → JS filter
2. Navigate through pages
3. Verify:
   - Main bundle < 200KB
   - Dynamic chunks load on demand
   - Newsletter component loads client-side only
   - Smooth loading transitions

### ✅ Service Worker
1. Open DevTools → Application → Service Workers
2. Verify:
   - Service worker registered
   - Status: Activated and running
   - Scope: /
3. Test offline mode:
   - Load a page
   - Disable network (DevTools → Network → Offline)
   - Navigate to other pages
   - Verify offline page appears for uncached routes

### ✅ Performance Monitoring
1. Open Console
2. Look for performance logs:
   - Navigation timing
   - Memory usage
   - Resource timing
3. Check for Web Vitals reports

### ✅ ISR (Incremental Static Regeneration)
1. Build the application
2. Check `.next/server/app` directory
3. Verify static HTML files generated
4. Pages should serve instantly from static files

### ✅ Suspense Boundaries
1. Navigate to different routes
2. Verify:
   - Loading states appear during navigation
   - Skeleton screens show immediately
   - No blank screens during loads
   - Error boundaries catch errors gracefully

---

## Performance Testing

### Run Lighthouse Audit

```bash
# Install lighthouse globally
npm install -g lighthouse

# Run audit on production build
npm run build && npm run start

# In another terminal
lighthouse http://localhost:3002 --view
```

**Expected Scores:**
- Performance: 95+
- Accessibility: 90+
- Best Practices: 100
- SEO: 100

### Bundle Analysis

```bash
# Analyze bundle size
npm run build

# Check output for bundle sizes
# Main bundle should be < 200KB gzipped
```

### Web Vitals Testing

1. Open: http://localhost:3002
2. Open Chrome DevTools → Console
3. Look for Web Vitals logs:
   - LCP < 2.5s
   - FID < 100ms
   - CLS < 0.1

---

## Common Issues & Solutions

### Issue: Service Worker Not Registering

**Solution:**
```bash
# Clear browser cache and service workers
# Chrome DevTools → Application → Clear Storage → Clear site data
# Reload page
```

### Issue: Images Not Loading

**Solution:**
```javascript
// Check next.config.js remotePatterns
// Ensure your image domains are whitelisted
```

### Issue: Font Not Loading

**Solution:**
```bash
# Verify font imports in app/layout.tsx
# Check browser Network tab for 404s
# Clear .next folder and rebuild
rm -rf .next && npm run build
```

### Issue: Bundle Size Too Large

**Solution:**
```bash
# Check dynamic imports are working
# Verify experimental.optimizePackageImports in next.config.js
# Analyze bundle to find large dependencies
```

---

## Performance Monitoring Setup

### Backend API Endpoints (Required)

Create these API endpoints to receive performance data:

**1. `/api/analytics/vitals` - Web Vitals**
```typescript
// POST endpoint to receive Core Web Vitals
{
  name: string,
  value: number,
  rating: string,
  delta: number,
  id: string
}
```

**2. `/api/analytics/custom` - Custom Metrics**
```typescript
// POST endpoint for custom metrics
{
  name: string,
  value: number,
  unit: string,
  timestamp: number,
  url: string
}
```

**3. `/api/analytics/error` - Error Tracking**
```typescript
// POST endpoint for error tracking
{
  error: string,
  errorInfo: object,
  url: string,
  timestamp: number
}
```

---

## Production Deployment

### Environment Variables

```env
NEXT_PUBLIC_BASE_URL=https://your-domain.com
NEXT_PUBLIC_BACKEND_API_URL=https://api.your-domain.com
NODE_ENV=production
```

### Deployment Checklist

- [ ] Build passes without errors
- [ ] All tests pass
- [ ] Service worker configured for production domain
- [ ] Image CDN configured (if using)
- [ ] Performance monitoring endpoints active
- [ ] ISR revalidation times appropriate for content
- [ ] Lighthouse score > 90

### Deploy Commands

```bash
# Production build
npm run build

# Start production server
npm run start

# Or deploy to Vercel/Netlify
vercel deploy --prod
# or
netlify deploy --prod
```

---

## Monitoring in Production

### Key Metrics to Track

1. **Core Web Vitals**
   - LCP (Largest Contentful Paint) < 2.5s
   - FID (First Input Delay) < 100ms
   - CLS (Cumulative Layout Shift) < 0.1

2. **Load Times**
   - TTFB (Time to First Byte) < 600ms
   - FCP (First Contentful Paint) < 1.8s
   - TTI (Time to Interactive) < 3.5s

3. **Bundle Sizes**
   - Main bundle < 200KB
   - Total JavaScript < 400KB
   - Images optimized and lazy loaded

### Set Up Alerts

Monitor these thresholds and alert when exceeded:
- LCP > 3s
- FID > 200ms
- CLS > 0.15
- Error rate > 1%
- Bundle size increase > 20%

---

## Next Steps

1. **Install dependencies** and verify build
2. **Run performance tests** to validate improvements
3. **Deploy to staging** for testing
4. **Monitor metrics** in production
5. **Iterate and optimize** based on real user data

---

## Support & Resources

- **Full Report:** See `PERFORMANCE-OPTIMIZATION-REPORT.md`
- **Next.js Docs:** https://nextjs.org/docs/app/building-your-application/optimizing
- **Web Vitals:** https://web.dev/vitals/
- **Lighthouse:** https://developer.chrome.com/docs/lighthouse/

---

**Last Updated:** October 31, 2025
