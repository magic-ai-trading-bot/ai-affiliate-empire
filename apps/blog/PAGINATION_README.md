# Blog Pagination System

## Overview
Comprehensive pagination implementation for the blog with page numbers, navigation controls, URL synchronization, keyboard shortcuts, and responsive design.

## Features

### ✅ Implemented Features
1. **Page Number Buttons** - Display page numbers with intelligent ellipsis for large page counts
2. **Previous/Next Navigation** - Buttons with disabled states at boundaries
3. **Total Items Count** - Shows "Showing X to Y of Z articles"
4. **Configurable Items Per Page** - Default 10 items, configurable up to 50
5. **URL Query Parameters** - Page state synchronized with URL (`?page=2`)
6. **Loading States** - Skeleton loaders and disabled controls during data fetching
7. **Keyboard Navigation** - Arrow keys, Home, and End key support
8. **Responsive Design** - Optimized layouts for mobile, tablet, and desktop
9. **Accessibility** - ARIA labels and semantic HTML
10. **Error Handling** - User-friendly error messages with retry capability

## File Structure

```
apps/blog/
├── components/
│   └── Pagination.tsx          # Main pagination component
├── app/
│   └── articles/
│       └── page.tsx            # Articles listing page with pagination
├── lib/
│   └── types.ts                # TypeScript interfaces (PaginationMeta, ArticlesResponse)
└── .env.local.example          # Environment variables template
```

## Backend API

### Endpoint
```
GET /content/blog?page={n}&limit={m}
```

### Request Parameters
- `page` (optional): Page number, default 1, minimum 1
- `limit` (optional): Items per page, default 10, minimum 1, maximum 50

### Response Format
```typescript
{
  data: [
    {
      id: string;
      title: string;
      slug: string;
      excerpt: string | null;
      createdAt: string;
      product: {
        id: string;
        title: string;
        category: string | null;
        imageUrl: string | null;
      };
    }
  ],
  meta: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  }
}
```

## Usage

### Basic Implementation

The pagination is already integrated in `/articles` page. To use in other pages:

```tsx
'use client';

import { useState, useEffect } from 'next/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Pagination from '@/components/Pagination';

export default function YourPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  const [items, setItems] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const handlePageChange = (page: number) => {
    router.push(`/your-page?page=${page}`);
  };

  return (
    <div>
      {/* Your content */}
      <Pagination
        currentPage={currentPage}
        totalItems={totalItems}
        itemsPerPage={10}
        onPageChange={handlePageChange}
        isLoading={isLoading}
      />
    </div>
  );
}
```

### Props Interface

```typescript
interface PaginationProps {
  currentPage: number;        // Current active page
  totalItems: number;          // Total number of items across all pages
  itemsPerPage: number;        // Number of items per page
  onPageChange: (page: number) => void; // Callback when page changes
  maxPageButtons?: number;     // Max page buttons to show (default: 7)
  showItemCount?: boolean;     // Show items count (default: true)
  isLoading?: boolean;         // Loading state (default: false)
}
```

## Keyboard Shortcuts

- **Arrow Left (←)**: Go to previous page
- **Arrow Right (→)**: Go to next page
- **Home**: Jump to first page
- **End**: Jump to last page

## Responsive Breakpoints

### Mobile (< 768px)
- Simplified pagination with "Page X of Y" indicator
- Previous/Next buttons only
- Item count hidden

### Tablet (768px - 1024px)
- Shows 5-7 page number buttons
- Previous/Next buttons with text
- Item count visible

### Desktop (> 1024px)
- Full pagination with up to 7 page buttons
- Complete item count display
- All features visible

## Page Number Display Logic

The component intelligently displays page numbers:

### Few Pages (totalPages ≤ 7)
```
[1] [2] [3] [4] [5]
```

### Near Start
```
[1] [2] [3] [4] [5] ... [20]
```

### Middle
```
[1] ... [5] [6] [7] [8] [9] ... [20]
```

### Near End
```
[1] ... [16] [17] [18] [19] [20]
```

## Styling

The component uses Tailwind CSS with the following design tokens:

### Colors
- Primary: Blue-600 (active page)
- Background: White
- Border: Gray-300
- Text: Gray-700
- Disabled: Opacity-50

### States
- **Default**: White background, gray border
- **Hover**: Gray-50 background
- **Active**: Blue-600 background, white text
- **Disabled**: Reduced opacity, no hover effect
- **Loading**: All controls disabled

## Environment Variables

Create `.env.local` file in `apps/blog/`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

For production:
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

## Testing Checklist

- [x] Page navigation works via button clicks
- [x] URL updates correctly on page change
- [x] Browser back/forward buttons work
- [x] Keyboard shortcuts function properly
- [x] Loading states display during API calls
- [x] Error messages show on API failures
- [x] Responsive on mobile devices
- [x] Responsive on tablets
- [x] Responsive on desktop
- [x] Accessibility features (ARIA, keyboard-only navigation)
- [x] Edge cases (page 1, last page, 0 items, invalid page)

## Code Quality

### Standards Met
✅ TypeScript strict mode enabled
✅ Component under 500 lines
✅ Comprehensive error handling
✅ YAGNI - No over-engineering
✅ KISS - Simple, readable code
✅ DRY - Reusable logic
✅ Semantic HTML elements
✅ ARIA attributes for accessibility

### Performance
- Efficient re-renders with React hooks
- Debounced keyboard events
- Optimized page number calculation
- Minimal DOM updates

## Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ✅ Full support

## Accessibility

- Semantic `<nav>` element with `aria-label`
- `aria-current="page"` for active page
- `aria-label` for navigation buttons
- Keyboard navigation support
- Focus management
- Screen reader friendly

## Future Enhancements

Potential improvements (not in current scope):
- Jump to page input field
- Items per page selector
- Compact/expanded view toggle
- Persistent page state in localStorage
- Smooth scroll animations
- Virtual scrolling for very large datasets

## Troubleshooting

### Pagination not showing
- Verify `totalItems > itemsPerPage`
- Check API response format matches `ArticlesResponse` interface

### Page doesn't change
- Ensure `onPageChange` callback is properly wired
- Check browser console for errors
- Verify API endpoint is accessible

### Keyboard navigation not working
- Check if other event listeners are preventing defaults
- Ensure component is mounted and visible
- Verify browser window has focus

## Support

For issues or questions:
1. Check this README
2. Review implementation plan: `/plans/blog-pagination-plan.md`
3. Check code comments in `Pagination.tsx`
4. Review backend API documentation

---

**Version**: 1.0.0
**Last Updated**: 2025-10-31
**Status**: Production Ready ✅
