/**
 * Minimal test server for load testing
 * Provides mock endpoints that mimic the actual API responses
 */

const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.json());

// Mock data
const mockProducts = Array.from({ length: 100 }, (_, i) => ({
  id: `prod-${i + 1}`,
  asin: `B${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
  title: `Test Product ${i + 1}`,
  price: Math.floor(Math.random() * 500) + 10,
  category: ['Electronics', 'Home', 'Fashion', 'Sports'][Math.floor(Math.random() * 4)],
  commission: (Math.floor(Math.random() * 15) + 5) / 100,
  trendScore: Math.floor(Math.random() * 100),
  profitScore: Math.floor(Math.random() * 100),
  status: 'active',
  createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
}));

const mockAnalytics = {
  totalRevenue: Math.floor(Math.random() * 10000) + 1000,
  totalViews: Math.floor(Math.random() * 100000) + 10000,
  totalClicks: Math.floor(Math.random() * 10000) + 1000,
  totalConversions: Math.floor(Math.random() * 1000) + 100,
  conversionRate: 0.02 + Math.random() * 0.03,
  avgOrderValue: 50 + Math.random() * 100,
};

// Add random delay to simulate database queries
const randomDelay = (min = 10, max = 100) => {
  return new Promise(resolve => setTimeout(resolve, min + Math.random() * (max - min)));
};

// Health endpoint
app.get('/health', async (req, res) => {
  await randomDelay(5, 20);
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  await randomDelay(10, 30);
  res.json({
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
  });
});

// Products endpoints
app.get('/products', async (req, res) => {
  await randomDelay(50, 150);
  const { limit = 20, offset = 0 } = req.query;
  const products = mockProducts.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
  res.json({
    data: products,
    total: mockProducts.length,
    limit: parseInt(limit),
    offset: parseInt(offset),
  });
});

app.get('/products/top', async (req, res) => {
  await randomDelay(30, 100);
  const { limit = 10 } = req.query;
  const topProducts = mockProducts
    .sort((a, b) => (b.trendScore + b.profitScore) - (a.trendScore + a.profitScore))
    .slice(0, parseInt(limit));
  res.json({ data: topProducts });
});

app.post('/products/sync', async (req, res) => {
  await randomDelay(500, 1000);
  res.json({
    message: 'Products synced successfully',
    synced: Math.floor(Math.random() * 50) + 10,
    timestamp: new Date().toISOString(),
  });
});

app.get('/products/:id', async (req, res) => {
  await randomDelay(20, 50);
  const product = mockProducts.find(p => p.id === req.params.id) || mockProducts[0];
  res.json({ data: product });
});

// Analytics endpoints
app.get('/analytics/overview', async (req, res) => {
  await randomDelay(100, 200);
  res.json({
    data: {
      ...mockAnalytics,
      period: req.query.period || '7d',
      timestamp: new Date().toISOString(),
    },
  });
});

app.get('/analytics/revenue', async (req, res) => {
  await randomDelay(80, 150);
  const days = parseInt(req.query.period?.replace('d', '')) || 7;
  const revenueData = Array.from({ length: days }, (_, i) => ({
    date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    revenue: Math.floor(Math.random() * 1000) + 100,
    views: Math.floor(Math.random() * 10000) + 1000,
    clicks: Math.floor(Math.random() * 1000) + 100,
    conversions: Math.floor(Math.random() * 50) + 5,
  })).reverse();
  res.json({ data: revenueData });
});

app.get('/analytics/top-products', async (req, res) => {
  await randomDelay(60, 120);
  const { limit = 10 } = req.query;
  const topProducts = mockProducts
    .map(p => ({
      ...p,
      revenue: Math.floor(Math.random() * 5000) + 500,
      views: Math.floor(Math.random() * 50000) + 5000,
      conversions: Math.floor(Math.random() * 500) + 50,
      roi: 1.5 + Math.random() * 3,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, parseInt(limit));
  res.json({ data: topProducts });
});

app.get('/analytics/platform-comparison', async (req, res) => {
  await randomDelay(70, 140);
  const platforms = ['youtube', 'tiktok', 'instagram', 'blog'];
  const comparison = platforms.map(platform => ({
    platform,
    revenue: Math.floor(Math.random() * 5000) + 1000,
    views: Math.floor(Math.random() * 100000) + 10000,
    clicks: Math.floor(Math.random() * 10000) + 1000,
    conversions: Math.floor(Math.random() * 1000) + 100,
    conversionRate: 0.01 + Math.random() * 0.05,
  }));
  res.json({ data: comparison });
});

// Orchestrator endpoints
app.get('/orchestrator/status', async (req, res) => {
  await randomDelay(30, 80);
  res.json({
    data: {
      workflowId: `workflow-${Date.now()}`,
      status: ['running', 'completed', 'idle'][Math.floor(Math.random() * 3)],
      lastRun: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
      nextRun: new Date(Date.now() + Math.random() * 24 * 60 * 60 * 1000).toISOString(),
      stats: {
        totalRuns: Math.floor(Math.random() * 1000) + 100,
        successfulRuns: Math.floor(Math.random() * 950) + 90,
        failedRuns: Math.floor(Math.random() * 50) + 5,
      },
    },
  });
});

app.post('/orchestrator/start', async (req, res) => {
  await randomDelay(100, 300);
  res.json({
    message: 'Workflow started successfully',
    workflowId: `workflow-${Date.now()}`,
    status: 'running',
    timestamp: new Date().toISOString(),
  });
});

// Content endpoints
app.post('/content/generate-script', async (req, res) => {
  await randomDelay(1000, 3000);
  res.json({
    data: {
      id: `script-${Date.now()}`,
      content: 'This is a mock script for testing purposes...',
      productId: req.body.productId,
      duration: 60,
      createdAt: new Date().toISOString(),
    },
  });
});

// Video endpoints
app.post('/video/generate', async (req, res) => {
  await randomDelay(2000, 5000);
  res.json({
    data: {
      id: `video-${Date.now()}`,
      url: `https://example.com/video-${Date.now()}.mp4`,
      status: 'processing',
      duration: 60,
      createdAt: new Date().toISOString(),
    },
  });
});

// Publisher endpoints
app.post('/publisher/publish', async (req, res) => {
  await randomDelay(500, 1500);
  res.json({
    data: {
      id: `publication-${Date.now()}`,
      platform: req.body.platform || 'youtube',
      status: 'published',
      url: `https://example.com/video-${Date.now()}`,
      publishedAt: new Date().toISOString(),
    },
  });
});

// Optimizer endpoints
app.post('/optimizer/optimize', async (req, res) => {
  await randomDelay(200, 500);
  res.json({
    message: 'Optimization completed',
    changes: {
      productsKilled: Math.floor(Math.random() * 5),
      productsScaled: Math.floor(Math.random() * 10) + 5,
      strategyAdjusted: true,
    },
    timestamp: new Date().toISOString(),
  });
});

app.get('/optimizer/analyze', async (req, res) => {
  await randomDelay(150, 400);
  res.json({
    data: {
      recommendations: [
        'Scale product prod-15 (ROI: 3.2x)',
        'Kill product prod-42 (ROI: 0.3x)',
        'Increase TikTok budget by 20%',
      ],
      timestamp: new Date().toISOString(),
    },
  });
});

// Error handling
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.path });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Test server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log('Ready for load testing!');
});
