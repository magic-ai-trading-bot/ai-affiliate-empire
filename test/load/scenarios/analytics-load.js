/**
 * Analytics Endpoint Load Test
 *
 * Purpose: Test analytics and reporting endpoints under load
 *
 * Endpoints Tested:
 * - GET /analytics/overview (overall performance metrics)
 * - GET /analytics/revenue (revenue analytics with date ranges)
 * - GET /analytics/top-products (top performing products)
 * - GET /analytics/platform-comparison (compare platform performance)
 *
 * Success Criteria:
 * - p95 response time < 1000ms for complex queries
 * - p95 response time < 500ms for simple queries
 * - Error rate < 1%
 * - Support 500+ analytics queries per day
 *
 * Usage:
 *   k6 run test/load/scenarios/analytics-load.js
 */

import http from 'k6/http';
import { check } from 'k6';
import { Trend } from 'k6/metrics';
import { BASE_URL, ENDPOINTS, REQUEST_OPTIONS, TEST_DATA } from '../config.js';
import {
  checkResponse,
  httpGet,
  randomSleep,
  randomItem,
  randomInt,
  testGroup,
  parseJson,
} from '../helpers/utils.js';

// Custom metrics
const overviewQueryDuration = new Trend('analytics_overview_duration');
const revenueQueryDuration = new Trend('analytics_revenue_duration');
const topProductsQueryDuration = new Trend('analytics_top_products_duration');
const platformComparisonDuration = new Trend('analytics_platform_comparison_duration');

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 10 }, // Ramp up
    { duration: '5m', target: 30 }, // Normal load
    { duration: '2m', target: 50 }, // Peak load
    { duration: '2m', target: 0 }, // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<1000'],
    'http_req_failed': ['rate<0.01'],
    'analytics_overview_duration': ['p(95)<800'],
    'analytics_revenue_duration': ['p(95)<1000'],
  },
  tags: {
    test_type: 'analytics_endpoints',
  },
};

/**
 * Setup function
 */
export function setup() {
  console.log('Starting analytics endpoints load test');
  console.log(`Target: ${BASE_URL}`);
  console.log('Testing analytics and reporting queries\n');

  return {
    baseUrl: BASE_URL,
    periods: ['1d', '7d', '30d', '90d'],
    platforms: TEST_DATA.PLATFORMS,
  };
}

/**
 * Main test function
 */
export default function (data) {
  const { baseUrl, periods, platforms } = data;

  // Test 1: Analytics Overview (most common query)
  testGroup('Analytics Overview', () => {
    const startTime = Date.now();

    const response = httpGet(`${baseUrl}${ENDPOINTS.ANALYTICS_OVERVIEW}`, REQUEST_OPTIONS);

    const duration = Date.now() - startTime;
    overviewQueryDuration.add(duration);

    checkResponse(response, 'Analytics Overview', {
      'status is 200': (r) => r.status === 200,
      'has metrics data': (r) => {
        const body = parseJson(r);
        return body && body.data;
      },
      'contains key metrics': (r) => {
        const body = parseJson(r);
        if (!body || !body.data) return false;
        const { data } = body;
        return (
          data.totalRevenue !== undefined ||
          data.totalViews !== undefined ||
          data.totalClicks !== undefined
        );
      },
      'acceptable response time': (r) => r.timings.duration < 1000,
    });
  });

  randomSleep(2, 4);

  // Test 2: Revenue Analytics with different time periods
  testGroup('Revenue Analytics', () => {
    const period = randomItem(periods);
    const startTime = Date.now();

    const response = httpGet(
      `${baseUrl}${ENDPOINTS.ANALYTICS_REVENUE}?period=${period}`,
      REQUEST_OPTIONS
    );

    const duration = Date.now() - startTime;
    revenueQueryDuration.add(duration);

    checkResponse(response, `Revenue Analytics (${period})`, {
      'status is 200': (r) => r.status === 200,
      'has revenue data': (r) => {
        const body = parseJson(r);
        return body && (body.data || body.revenue !== undefined);
      },
      'includes time series': (r) => {
        const body = parseJson(r);
        if (!body || !body.data) return true; // Allow different response formats
        return Array.isArray(body.data) || body.data.timeSeries;
      },
    });
  });

  randomSleep(1, 3);

  // Test 3: Top Products Analytics
  testGroup('Top Products Analytics', () => {
    const limit = randomInt(5, 20);
    const period = randomItem(periods);
    const startTime = Date.now();

    const response = httpGet(
      `${baseUrl}${ENDPOINTS.ANALYTICS_TOP_PRODUCTS}?limit=${limit}&period=${period}`,
      REQUEST_OPTIONS
    );

    const duration = Date.now() - startTime;
    topProductsQueryDuration.add(duration);

    checkResponse(response, 'Top Products Analytics', {
      'status is 200': (r) => r.status === 200,
      'has products list': (r) => {
        const body = parseJson(r);
        return body && (Array.isArray(body.data) || Array.isArray(body));
      },
      'fast query': (r) => r.timings.duration < 1000,
    });
  });

  randomSleep(2, 3);

  // Test 4: Platform Comparison (25% of requests)
  if (Math.random() < 0.25) {
    testGroup('Platform Comparison', () => {
      const period = randomItem(periods);
      const startTime = Date.now();

      const response = httpGet(
        `${baseUrl}${ENDPOINTS.ANALYTICS_PLATFORM_COMPARISON}?period=${period}`,
        REQUEST_OPTIONS
      );

      const duration = Date.now() - startTime;
      platformComparisonDuration.add(duration);

      checkResponse(response, 'Platform Comparison', {
        'status is 200': (r) => r.status === 200,
        'has platform data': (r) => {
          const body = parseJson(r);
          return body && (body.data || body.platforms);
        },
        'acceptable query time': (r) => r.timings.duration < 1500,
      });
    });

    randomSleep(2, 3);
  }

  // Test 5: Custom date range queries (15% of requests)
  if (Math.random() < 0.15) {
    testGroup('Custom Date Range', () => {
      const daysAgo = randomInt(7, 90);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      const response = httpGet(
        `${baseUrl}${ENDPOINTS.ANALYTICS_REVENUE}?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
        REQUEST_OPTIONS
      );

      checkResponse(response, 'Custom Date Range', {
        'handles custom range': (r) => r.status === 200 || r.status === 400,
        'not too slow': (r) => r.timings.duration < 2000,
      });
    });

    randomSleep(2, 3);
  }

  // Test 6: Filtered analytics (20% of requests)
  if (Math.random() < 0.2) {
    testGroup('Filtered Analytics', () => {
      const platform = randomItem(platforms);
      const period = randomItem(periods);

      const response = httpGet(
        `${baseUrl}${ENDPOINTS.ANALYTICS_OVERVIEW}?platform=${platform}&period=${period}`,
        REQUEST_OPTIONS
      );

      checkResponse(response, `Filtered Analytics (${platform})`, {
        'filtered data': (r) => r.status === 200,
      });
    });

    randomSleep(1, 2);
  }

  randomSleep(3, 5);
}

/**
 * Teardown function
 */
export function teardown(data) {
  console.log('\nAnalytics endpoints load test completed');
}

/**
 * Handle summary
 */
export function handleSummary(data) {
  const summary = generateAnalyticsSummary(data);

  return {
    stdout: summary,
    './test/load/reports/analytics-load-summary.json': JSON.stringify(data, null, 2),
  };
}

/**
 * Generate analytics test summary
 */
function generateAnalyticsSummary(data) {
  let output = '\n';
  output += '═'.repeat(60) + '\n';
  output += '  ANALYTICS ENDPOINTS LOAD TEST SUMMARY\n';
  output += '═'.repeat(60) + '\n\n';

  if (data.metrics) {
    output += 'Query Performance:\n';
    output += '─'.repeat(60) + '\n';

    if (data.metrics.analytics_overview_duration) {
      const overview = data.metrics.analytics_overview_duration.values;
      output += `  Overview Queries:\n`;
      output += `    p50: ${overview.med?.toFixed(2)}ms\n`;
      output += `    p95: ${overview['p(95)']?.toFixed(2)}ms `;
      output += overview['p(95)'] < 800 ? '✓\n' : '✗\n';
      output += `    Max: ${overview.max?.toFixed(2)}ms\n\n`;
    }

    if (data.metrics.analytics_revenue_duration) {
      const revenue = data.metrics.analytics_revenue_duration.values;
      output += `  Revenue Queries:\n`;
      output += `    p50: ${revenue.med?.toFixed(2)}ms\n`;
      output += `    p95: ${revenue['p(95)']?.toFixed(2)}ms `;
      output += revenue['p(95)'] < 1000 ? '✓\n' : '✗\n';
      output += `    Max: ${revenue.max?.toFixed(2)}ms\n\n`;
    }

    if (data.metrics.analytics_top_products_duration) {
      const topProducts = data.metrics.analytics_top_products_duration.values;
      output += `  Top Products Queries:\n`;
      output += `    p50: ${topProducts.med?.toFixed(2)}ms\n`;
      output += `    p95: ${topProducts['p(95)']?.toFixed(2)}ms\n`;
      output += `    Max: ${topProducts.max?.toFixed(2)}ms\n\n`;
    }

    if (data.metrics.analytics_platform_comparison_duration) {
      const platform = data.metrics.analytics_platform_comparison_duration.values;
      output += `  Platform Comparison Queries:\n`;
      output += `    p50: ${platform.med?.toFixed(2)}ms\n`;
      output += `    p95: ${platform['p(95)']?.toFixed(2)}ms\n`;
      output += `    Max: ${platform.max?.toFixed(2)}ms\n\n`;
    }

    if (data.metrics.http_req_failed) {
      const failed = data.metrics.http_req_failed.values;
      output += `  Error Rate: ${(failed.rate * 100).toFixed(2)}% `;
      output += failed.rate < 0.01 ? '✓\n' : '✗\n';
    }

    if (data.metrics.http_reqs) {
      const reqs = data.metrics.http_reqs.values;
      output += `  Total Queries: ${reqs.count}\n`;
      output += `  Query Rate: ${reqs.rate?.toFixed(2)} q/s\n`;
    }
  }

  output += '\n';
  output += 'Optimization Recommendations:\n';
  output += '─'.repeat(60) + '\n';

  const overviewP95 = data.metrics?.analytics_overview_duration?.values['p(95)'] || 0;
  const revenueP95 = data.metrics?.analytics_revenue_duration?.values['p(95)'] || 0;

  if (overviewP95 > 800) {
    output += `  • Consider caching overview metrics (${overviewP95.toFixed(2)}ms)\n`;
  }

  if (revenueP95 > 1000) {
    output += `  • Optimize revenue queries with database indexes (${revenueP95.toFixed(2)}ms)\n`;
    output += `  • Consider pre-aggregating revenue data\n`;
  }

  if (overviewP95 < 500 && revenueP95 < 800) {
    output += `  ✓ Analytics performance is excellent\n`;
  }

  output += '\n' + '═'.repeat(60) + '\n';

  return output;
}
