# API Reference - AI Affiliate Empire

**Last Updated**: 2025-11-01
**Status**: Complete
**Base URL**: `http://localhost:3000` (development) or `https://your-domain.com` (production)

---

## Table of Contents

- [Authentication](#authentication)
- [Products API](#products-api)
- [Content Generation API](#content-generation-api)
- [Video Generation API](#video-generation-api)
- [Publishing API](#publishing-api)
- [Analytics API](#analytics-api)
- [Optimizer API](#optimizer-api)
- [Orchestration API](#orchestration-api)
- [Health & Monitoring](#health--monitoring)
- [Error Handling](#error-handling)

---

## Authentication

All API endpoints require JWT token authentication (except `/health`).

### Get Authentication Token

**Endpoint**: `POST /auth/login`

**Request Body**:
```json
{
  "email": "admin@ai-affiliate-empire.com",
  "password": "your-password"
}
```

**Response** (200 OK):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600,
  "user": {
    "id": "user-123",
    "email": "admin@ai-affiliate-empire.com",
    "role": "ADMIN"
  }
}
```

**Headers for Authenticated Requests**:
```
Authorization: Bearer {access_token}
```

### Refresh Token

**Endpoint**: `POST /auth/refresh`

**Request Body**:
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response** (200 OK):
```json
{
  "access_token": "new-jwt-token",
  "expires_in": 3600
}
```

---

## Products API

### List Products

**Endpoint**: `GET /api/products`

**Query Parameters**:
- `skip` (integer, optional): Number of records to skip. Default: 0
- `take` (integer, optional): Number of records to take. Default: 10. Max: 100
- `status` (string, optional): Filter by status (ACTIVE, ARCHIVED, POOR_PERFORMER)
- `networkId` (string, optional): Filter by affiliate network
- `sortBy` (string, optional): Sort field (id, trendScore, profitScore, createdAt)
- `sortOrder` (string, optional): asc or desc. Default: desc

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "prod-123",
      "title": "iPhone 15 Pro Max",
      "description": "Latest flagship smartphone",
      "price": 1199.99,
      "commission": 2.5,
      "networkId": "network-amazon",
      "trendScore": 85,
      "profitScore": 72,
      "status": "ACTIVE",
      "createdAt": "2025-11-01T10:30:00Z",
      "updatedAt": "2025-11-01T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 1250,
    "skip": 0,
    "take": 10,
    "pages": 125
  }
}
```

### Get Product Details

**Endpoint**: `GET /api/products/{productId}`

**Response** (200 OK):
```json
{
  "id": "prod-123",
  "title": "iPhone 15 Pro Max",
  "description": "Latest flagship smartphone",
  "price": 1199.99,
  "commission": 2.5,
  "networkId": "network-amazon",
  "affiliateUrl": "https://amazon.com/dp/B0CH2...",
  "imageUrl": "https://images.amazon.com/...",
  "trendScore": 85,
  "profitScore": 72,
  "trendingReason": "New product launch with high search volume",
  "status": "ACTIVE",
  "metadata": {
    "category": "Electronics",
    "subcategory": "Smartphones",
    "brand": "Apple",
    "asin": "B0CH2P8..."
  },
  "createdAt": "2025-11-01T10:30:00Z",
  "updatedAt": "2025-11-01T15:45:00Z"
}
```

### Sync Products from Amazon

**Endpoint**: `POST /api/products/sync`

**Request Body**:
```json
{
  "networkId": "network-amazon",
  "category": "Electronics",
  "limit": 100
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "synced": 87,
  "skipped": 13,
  "errors": [],
  "message": "Successfully synced 87 products from Amazon"
}
```

### Get Top Products

**Endpoint**: `GET /api/products/top`

**Query Parameters**:
- `limit` (integer, optional): Number of results. Default: 10. Max: 50
- `networkId` (string, optional): Filter by network
- `metric` (string, optional): Sort metric (trendScore, profitScore, composite). Default: composite

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "prod-123",
      "title": "iPhone 15 Pro Max",
      "score": 9.2,
      "trendScore": 85,
      "profitScore": 72,
      "contentCount": 15,
      "totalRevenue": 450.00
    }
  ]
}
```

---

## Content Generation API

### Generate Video Script

**Endpoint**: `POST /api/content/scripts`

**Request Body**:
```json
{
  "productId": "prod-123",
  "tone": "enthusiastic",
  "language": "en",
  "style": "short-form",
  "includeDisclosure": true
}
```

**Response** (200 OK):
```json
{
  "id": "script-456",
  "productId": "prod-123",
  "content": "Hey everyone! Are you tired of slow internet? Check out the new... [full script]",
  "duration": 58,
  "language": "en",
  "hooks": [
    "Hey everyone! Are you tired of slow internet?",
    "In this video, I'm reviewing..."
  ],
  "callToAction": "Click the link in my bio to get 5% off!",
  "ftcDisclosure": "I earn a small commission if you make a purchase.",
  "createdAt": "2025-11-01T12:00:00Z"
}
```

### Generate Blog Post

**Endpoint**: `POST /api/content/blogs`

**Request Body**:
```json
{
  "productId": "prod-123",
  "title": "iPhone 15 Pro Max Review",
  "language": "en",
  "seoKeywords": ["iPhone 15", "smartphone review", "best camera"],
  "includeDisclosure": true
}
```

**Response** (200 OK):
```json
{
  "id": "blog-789",
  "productId": "prod-123",
  "title": "iPhone 15 Pro Max Review",
  "slug": "iphone-15-pro-max-review",
  "content": "[Full HTML blog content]",
  "excerpt": "The iPhone 15 Pro Max is Apple's flagship smartphone with...",
  "seoKeywords": ["iPhone 15", "smartphone review", "best camera"],
  "readTime": 5,
  "createdAt": "2025-11-01T12:30:00Z",
  "publishedAt": null
}
```

---

## Video Generation API

### Create Video

**Endpoint**: `POST /api/videos`

**Request Body**:
```json
{
  "scriptId": "script-456",
  "voiceStyle": "professional",
  "music": "upbeat",
  "format": "short-form",
  "platform": "youtube-shorts"
}
```

**Response** (202 Accepted):
```json
{
  "id": "video-abc123",
  "scriptId": "script-456",
  "status": "PROCESSING",
  "progress": 0,
  "estimatedTime": 90,
  "createdAt": "2025-11-01T13:00:00Z"
}
```

### Get Video Status

**Endpoint**: `GET /api/videos/{videoId}`

**Response** (200 OK):
```json
{
  "id": "video-abc123",
  "scriptId": "script-456",
  "status": "COMPLETED",
  "progress": 100,
  "duration": 58,
  "fileSize": 45000000,
  "videoUrl": "https://storage.example.com/videos/video-abc123.mp4",
  "thumbnailUrl": "https://storage.example.com/thumbnails/video-abc123.jpg",
  "captions": {
    "en": "https://storage.example.com/captions/video-abc123-en.vtt"
  },
  "createdAt": "2025-11-01T13:00:00Z",
  "completedAt": "2025-11-01T14:35:00Z"
}
```

---

## Publishing API

### Publish Content

**Endpoint**: `POST /api/publisher/publish`

**Request Body**:
```json
{
  "videoId": "video-abc123",
  "platforms": ["youtube", "tiktok", "instagram"],
  "scheduleTime": "2025-11-02T14:00:00Z",
  "metadata": {
    "title": "iPhone 15 Pro Max Review",
    "description": "Full review of the new iPhone 15 Pro Max...",
    "hashtags": ["#iPhone15", "#Tech", "#Review"]
  }
}
```

**Response** (200 OK):
```json
{
  "id": "publication-xyz",
  "videoId": "video-abc123",
  "platforms": [
    {
      "platform": "youtube",
      "status": "PUBLISHED",
      "videoId": "dQw4w9WgXcQ",
      "url": "https://youtube.com/watch?v=dQw4w9WgXcQ",
      "publishedAt": "2025-11-02T14:00:00Z"
    },
    {
      "platform": "tiktok",
      "status": "PUBLISHED",
      "videoId": "1234567890",
      "url": "https://tiktok.com/@channel/video/1234567890",
      "publishedAt": "2025-11-02T14:05:00Z"
    }
  ],
  "createdAt": "2025-11-01T13:30:00Z"
}
```

### Get Publication Status

**Endpoint**: `GET /api/publisher/publications/{publicationId}`

**Response** (200 OK):
```json
{
  "id": "publication-xyz",
  "videoId": "video-abc123",
  "status": "PUBLISHED",
  "platforms": [
    {
      "platform": "youtube",
      "status": "PUBLISHED",
      "metrics": {
        "views": 1250,
        "likes": 45,
        "comments": 8,
        "shares": 3
      }
    }
  ]
}
```

---

## Analytics API

### Get Dashboard Overview

**Endpoint**: `GET /api/analytics/overview`

**Query Parameters**:
- `days` (integer, optional): Number of days for analytics. Default: 7. Max: 90
- `networkId` (string, optional): Filter by affiliate network

**Response** (200 OK):
```json
{
  "period": {
    "startDate": "2025-10-25",
    "endDate": "2025-11-01",
    "days": 7
  },
  "summary": {
    "totalViews": 12450,
    "totalClicks": 385,
    "totalConversions": 12,
    "totalRevenue": 285.60,
    "ctr": 3.09,
    "conversionRate": 3.12,
    "avgRevenuePerView": 0.023
  },
  "trends": {
    "viewsTrend": 8.5,
    "conversionsTrend": 15.2,
    "revenueTrend": 12.8
  }
}
```

### Get Revenue Data

**Endpoint**: `GET /api/analytics/revenue`

**Query Parameters**:
- `days` (integer, optional): Number of days. Default: 7
- `granularity` (string, optional): daily or hourly. Default: daily
- `networkId` (string, optional): Filter by network

**Response** (200 OK):
```json
{
  "data": [
    {
      "date": "2025-11-01",
      "revenue": 42.50,
      "conversions": 2,
      "cost": 3.50,
      "profit": 39.00,
      "roi": 1114
    }
  ],
  "summary": {
    "totalRevenue": 285.60,
    "totalConversions": 12,
    "totalCost": 24.50,
    "totalProfit": 261.10
  }
}
```

### Get Top Products

**Endpoint**: `GET /api/analytics/top-products`

**Query Parameters**:
- `limit` (integer, optional): Default: 10. Max: 50
- `metric` (string, optional): revenue, conversions, roi, views. Default: revenue
- `days` (integer, optional): Default: 7

**Response** (200 OK):
```json
{
  "data": [
    {
      "productId": "prod-123",
      "productTitle": "iPhone 15 Pro Max",
      "revenue": 125.40,
      "conversions": 5,
      "views": 2500,
      "clicks": 95,
      "roi": 3.8,
      "contentCount": 15
    }
  ]
}
```

### Get Platform Comparison

**Endpoint**: `GET /api/analytics/platforms`

**Query Parameters**:
- `days` (integer, optional): Default: 7
- `metric` (string, optional): revenue, views, conversions. Default: revenue

**Response** (200 OK):
```json
{
  "platforms": [
    {
      "name": "youtube",
      "revenue": 145.60,
      "views": 6250,
      "conversions": 7,
      "roi": 4.2
    },
    {
      "name": "tiktok",
      "revenue": 89.20,
      "views": 4100,
      "conversions": 3,
      "roi": 2.6
    },
    {
      "name": "instagram",
      "revenue": 50.80,
      "views": 2100,
      "conversions": 2,
      "roi": 1.5
    }
  ]
}
```

---

## Optimizer API

### Run Optimization

**Endpoint**: `POST /api/optimizer/optimize`

**Request Body**:
```json
{
  "strategy": "auto",
  "parameters": {
    "roiThreshold": 0.5,
    "killThreshold": 0.3,
    "scaleThreshold": 2.0
  }
}
```

**Response** (200 OK):
```json
{
  "id": "optimization-op123",
  "status": "COMPLETED",
  "timestamp": "2025-11-01T15:00:00Z",
  "changes": {
    "killed": 3,
    "scaled": 5,
    "prompts_tested": 8
  },
  "recommendations": [
    "Increase allocation to iPhone-related content (ROI: 4.2)",
    "Scale YouTube Shorts strategy (35% higher conversion rate)"
  ]
}
```

### Get A/B Test Results

**Endpoint**: `GET /api/optimizer/ab-tests`

**Query Parameters**:
- `status` (string, optional): ACTIVE, COMPLETED, PAUSED
- `limit` (integer, optional): Default: 10

**Response** (200 OK):
```json
{
  "tests": [
    {
      "id": "test-123",
      "name": "Hook A vs Hook B",
      "type": "prompt",
      "status": "COMPLETED",
      "variant_a": {
        "name": "Hook A",
        "conversions": 8,
        "views": 2100,
        "conversionRate": 0.0381
      },
      "variant_b": {
        "name": "Hook B",
        "conversions": 12,
        "views": 2050,
        "conversionRate": 0.0585
      },
      "winner": "variant_b",
      "confidence": 0.94,
      "startDate": "2025-10-25",
      "endDate": "2025-11-01"
    }
  ]
}
```

### Get Recommendations

**Endpoint**: `GET /api/optimizer/recommendations`

**Response** (200 OK):
```json
{
  "recommendations": [
    {
      "priority": "high",
      "type": "scale",
      "title": "Scale iPhone Content",
      "description": "iPhone-related content has ROI of 4.2, significantly above threshold",
      "impact": "Estimated +$150/week revenue"
    },
    {
      "priority": "medium",
      "type": "kill",
      "title": "Retire Watch Content",
      "description": "Smart watch content has negative ROI, consider discontinuing",
      "impact": "Save $50/week in costs"
    }
  ]
}
```

---

## Orchestration API

### Start Daily Control Loop

**Endpoint**: `POST /api/orchestrator/start`

**Request Body**:
```json
{
  "force": false,
  "skipSteps": []
}
```

**Response** (200 OK):
```json
{
  "workflowId": "workflow-123",
  "status": "STARTED",
  "estimatedDuration": 71,
  "steps": [
    {
      "name": "Discover Products",
      "status": "IN_PROGRESS",
      "estimatedTime": 5
    },
    {
      "name": "Rank Products",
      "status": "PENDING",
      "estimatedTime": 2
    }
  ],
  "startedAt": "2025-11-01T15:30:00Z"
}
```

### Get Workflow Status

**Endpoint**: `GET /api/orchestrator/status/{workflowId}`

**Response** (200 OK):
```json
{
  "workflowId": "workflow-123",
  "status": "COMPLETED",
  "progress": 100,
  "steps": [
    {
      "name": "Discover Products",
      "status": "COMPLETED",
      "duration": 5,
      "completedAt": "2025-11-01T15:35:00Z"
    },
    {
      "name": "Generate Content",
      "status": "COMPLETED",
      "duration": 10,
      "completedAt": "2025-11-01T15:45:00Z"
    }
  ],
  "totalDuration": 71,
  "startedAt": "2025-11-01T15:30:00Z",
  "completedAt": "2025-11-01T16:41:00Z"
}
```

---

## Health & Monitoring

### Health Check

**Endpoint**: `GET /health`

**Response** (200 OK):
```json
{
  "status": "healthy",
  "timestamp": "2025-11-01T16:45:00Z",
  "services": {
    "database": "connected",
    "cache": "connected",
    "temporal": "connected",
    "external_apis": {
      "openai": "available",
      "pikalabs": "available"
    }
  },
  "metrics": {
    "uptime": 3600,
    "memory": {
      "used": 256,
      "available": 512
    }
  }
}
```

### Get System Metrics

**Endpoint**: `GET /api/health/metrics`

**Response** (200 OK):
```json
{
  "cpu": 35.2,
  "memory": 50.1,
  "uptime": 86400,
  "requests": {
    "total": 15420,
    "rate": 45.6
  },
  "errors": {
    "rate": 0.2,
    "recent": []
  }
}
```

---

## Error Handling

### Error Response Format

All error responses follow this format:

```json
{
  "statusCode": 400,
  "message": "Validation error",
  "error": "BadRequestError",
  "details": [
    {
      "field": "productId",
      "message": "Product ID is required"
    }
  ],
  "timestamp": "2025-11-01T16:50:00Z",
  "path": "/api/content/scripts"
}
```

### Common Error Codes

| Code | Error | Description |
|------|-------|-------------|
| 400 | BadRequestError | Invalid request parameters |
| 401 | UnauthorizedError | Missing or invalid authentication |
| 403 | ForbiddenError | Insufficient permissions |
| 404 | NotFoundError | Resource not found |
| 429 | RateLimitError | Too many requests |
| 500 | InternalServerError | Server error |
| 503 | ServiceUnavailableError | Service temporarily unavailable |

### Retry Policy

- **Retryable errors**: 429, 503, 504
- **Retry delay**: Exponential backoff (1s, 2s, 4s, 8s)
- **Max retries**: 3

---

## Rate Limiting

All endpoints are rate-limited:

- **Default**: 100 requests per minute per API key
- **Authentication**: 10 login attempts per minute per IP
- **Publishing**: 20 publications per hour

**Rate limit headers**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1635784200
```

---

## SDK Examples

### JavaScript/TypeScript

```typescript
import { AffiliateEmpireSDK } from '@ai-affiliate-empire/sdk';

const sdk = new AffiliateEmpireSDK({
  baseUrl: 'https://api.example.com',
  apiKey: 'your-api-key'
});

// Generate content
const script = await sdk.content.generateScript({
  productId: 'prod-123',
  tone: 'enthusiastic'
});

// Publish
const publication = await sdk.publisher.publish({
  videoId: 'video-abc123',
  platforms: ['youtube', 'tiktok']
});

// Get analytics
const analytics = await sdk.analytics.getDashboard({ days: 7 });
```

---

## Webhooks

Subscribe to real-time events:

**Endpoint**: `POST /api/webhooks/subscribe`

**Supported Events**:
- `video.completed` - Video generation complete
- `publication.published` - Content published
- `conversion.tracked` - Conversion recorded
- `optimization.completed` - Optimization cycle complete

**Example**:
```json
{
  "event": "video.completed",
  "url": "https://your-domain.com/webhooks/video",
  "active": true
}
```

---

**Last Updated**: 2025-11-01
**Version**: 1.0.0
**Maintainer**: Development Team
