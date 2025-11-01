# Newsletter System - Quick Setup Guide

## Prerequisites

- Node.js 18+
- PostgreSQL database running
- Backend API running on port 3000
- Blog app will run on port 3002

## Installation Steps

### 1. Database Migration

```bash
# From project root
npx prisma generate
npx prisma migrate dev --name add_newsletter_system

# Or if database is already initialized
npx prisma db push
```

This creates:
- `NewsletterSubscriber` table
- `NewsletterCampaign` table
- Required enums and indexes

### 2. Backend Setup

No additional dependencies needed. The newsletter module is already integrated into `app.module.ts`.

Start the backend:
```bash
npm run start:dev
```

Backend will be available at: http://localhost:3000

API endpoints:
- `POST /blog/newsletter/subscribe` - Subscribe
- `GET /blog/newsletter/confirm?token={token}` - Confirm subscription
- `GET /blog/newsletter/unsubscribe?token={token}` - Unsubscribe
- `GET /blog/newsletter/stats` - Get statistics

### 3. Blog App Setup

```bash
# Navigate to blog app
cd apps/blog

# Install dependencies (if not already done)
npm install

# Create environment file
cat > .env.local << EOF
NEXT_PUBLIC_BACKEND_API_URL=http://localhost:3000
BLOG_URL=http://localhost:3002
EOF

# Start development server
npm run dev
```

Blog will be available at: http://localhost:3002

### 4. Integration with Existing Pages

#### Option A: Add Modal Popup (First-time visitors)

Edit `/apps/blog/app/layout.tsx`:

```tsx
import { NewsletterModal } from '@/components/NewsletterModal';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        {/* Add modal at the end of body */}
        <NewsletterModal />
      </body>
    </html>
  );
}
```

#### Option B: Add Inline Form (Article pages)

Edit any page, e.g., `/apps/blog/app/articles/[slug]/page.tsx`:

```tsx
import { NewsletterForm } from '@/components/NewsletterForm';

export default function ArticlePage() {
  return (
    <article>
      <h1>Article Title</h1>
      {/* Article content */}

      {/* Newsletter signup at the end */}
      <div className="mt-12">
        <NewsletterForm variant="inline" />
      </div>
    </article>
  );
}
```

Or use featured variant for landing sections:
```tsx
<NewsletterForm variant="featured" />
```

## Testing the Flow

### 1. Subscribe Test

1. Open http://localhost:3002
2. Wait 3 seconds for modal to appear (or scroll to inline form)
3. Enter email: `test@example.com`
4. Click "Subscribe Now"
5. Check backend console for confirmation link

### 2. Confirmation Test

1. Copy the confirmation URL from backend console
2. Open in browser: `http://localhost:3002/newsletter/confirm?token={token}`
3. Should see success message

### 3. Check Database

```bash
# Connect to PostgreSQL
psql -d your_database_name

# Check subscribers
SELECT email, status, "confirmedAt" FROM "NewsletterSubscriber";
```

### 4. Unsubscribe Test

1. Get unsubscribe token from database:
```sql
SELECT "unsubscribeToken" FROM "NewsletterSubscriber" WHERE email = 'test@example.com';
```

2. Open: `http://localhost:3002/newsletter/unsubscribe?token={unsubscribeToken}`
3. Should see unsubscribe confirmation

## Email Integration (Next Step)

Currently, confirmation emails are logged to console. To send real emails:

### Option 1: SendGrid (Recommended)

```bash
npm install @sendgrid/mail
```

Update `newsletter.service.ts`:

```typescript
import sgMail from '@sendgrid/mail';

// In constructor or module init
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Update sendConfirmationEmail method
private async sendConfirmationEmail(email: string, token: string): Promise<void> {
  const confirmUrl = `${process.env.BLOG_URL}/newsletter/confirm?token=${token}`;

  const msg = {
    to: email,
    from: 'noreply@yourdomain.com', // Use verified sender
    subject: 'Confirm your newsletter subscription',
    html: this.getConfirmationEmailTemplate(confirmUrl),
  };

  await sgMail.send(msg);
}
```

Add to `.env`:
```bash
SENDGRID_API_KEY=your_sendgrid_api_key
```

### Option 2: AWS SES

```bash
npm install @aws-sdk/client-ses
```

Similar integration with AWS SES client.

## Environment Variables Reference

### Backend `.env`
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/ai_affiliate_empire
BLOG_URL=http://localhost:3002

# Optional: Email service
SENDGRID_API_KEY=your_key
# or
AWS_SES_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
```

### Blog `.env.local`
```bash
NEXT_PUBLIC_BACKEND_API_URL=http://localhost:3000
BLOG_URL=http://localhost:3002
```

## Customization

### Change Modal Timing

Edit `/apps/blog/components/NewsletterModal.tsx`:

```typescript
const MODAL_DELAY_MS = 5000; // Show after 5 seconds instead of 3
```

### Change Modal Expiry

```typescript
const expiryDate = new Date();
expiryDate.setDate(expiryDate.getDate() + 7); // 7 days instead of 30
```

### Customize Copy

Edit the benefit bullets in `NewsletterModal.tsx`:

```typescript
const benefits = [
  'Your custom benefit 1',
  'Your custom benefit 2',
  'Your custom benefit 3',
];
```

### Style Customization

All components use Tailwind CSS. Colors are defined in `tailwind.config.js` using CSS variables.

Edit `/apps/blog/app/globals.css` to change colors:

```css
:root {
  --primary: 220 90% 56%;
  --success: 142 76% 36%;
  /* ... other colors */
}
```

## Troubleshooting

### Modal not appearing?
- Clear localStorage: `localStorage.clear()`
- Refresh page and wait 3 seconds

### API connection errors?
- Verify backend is running: `curl http://localhost:3000/health`
- Check `NEXT_PUBLIC_BACKEND_API_URL` in `.env.local`
- Check CORS settings in backend

### Database errors?
- Run migrations: `npx prisma migrate dev`
- Check DATABASE_URL in backend `.env`
- Verify PostgreSQL is running

### Styling issues?
- Ensure Tailwind is configured
- Check `globals.css` is imported in layout
- Verify CSS variables are defined

## Production Deployment

### 1. Database
```bash
npx prisma migrate deploy
```

### 2. Backend
```bash
npm run build
npm run start:prod
```

### 3. Blog
```bash
cd apps/blog
npm run build
npm start
```

### 4. Environment Variables

Update production URLs:
- `NEXT_PUBLIC_BACKEND_API_URL=https://api.yourdomain.com`
- `BLOG_URL=https://blog.yourdomain.com`

### 5. HTTPS

Ensure all URLs use HTTPS in production.

## Support

See full documentation in:
- `/NEWSLETTER-IMPLEMENTATION-REPORT.md` - Complete implementation details
- `/apps/blog/README.md` - Blog app documentation
- `/src/modules/newsletter/` - Backend code with inline comments

## Quick Commands Reference

```bash
# Start everything (from project root)
npm run start:dev                    # Backend (port 3000)
cd apps/blog && npm run dev          # Blog (port 3002)

# Database
npx prisma studio                    # Visual database browser
npx prisma migrate dev               # Apply migrations

# Check subscribers
psql -d your_db -c "SELECT email, status FROM \"NewsletterSubscriber\";"

# Test API
curl -X POST http://localhost:3000/blog/newsletter/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

## Next Steps

1. ✅ Database migration
2. ✅ Test signup flow
3. ✅ Integrate email service (SendGrid/SES)
4. ✅ Test confirmation emails
5. ✅ Deploy to production
6. 📊 Monitor signup rates
7. 🚀 Create first newsletter campaign
