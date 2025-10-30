# AI Affiliate Empire - Dashboard

Real-time monitoring dashboard for the autonomous AI affiliate marketing system.

## Features

- **Real-time metrics**: Revenue, products, videos, publications
- **Revenue charts**: 7-day revenue trends with clicks and conversions
- **Top products**: Performance leaderboard with ROI tracking
- **System health**: Monitor workflow status and system health
- **Manual controls**: Start daily control loop manually

## Tech Stack

- **Next.js 15** - React framework
- **Tailwind CSS** - Styling
- **Recharts** - Data visualization
- **Lucide React** - Icons

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Start development server:
```bash
npm run dev
```

Dashboard will be available at http://localhost:3001

## API Integration

The dashboard connects to the backend API running on port 3000:

- `/analytics/overview` - Dashboard overview
- `/analytics/revenue?days=7` - Revenue data
- `/analytics/top-products` - Top performing products
- `/orchestrator/start` - Start workflow manually

## Production Build

```bash
npm run build
npm start
```

## Auto-refresh

Dashboard automatically refreshes data every 30 seconds to show real-time updates.
