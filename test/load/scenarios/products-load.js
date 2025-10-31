/**
 * Products Endpoint Load Test
 *
 * Purpose: Test product discovery and management endpoints under load
 *
 * Endpoints Tested:
 * - GET /products (list all products with pagination)
 * - GET /products/top (top performing products)
 * - POST /products/sync (trigger product synchronization)
 * - GET /products/:id (individual product details)
 *
 * Success Criteria:
 * - p95 response time < 500ms for reads
 * - p95 response time < 2000ms for sync operations
 * - Error rate < 1%
 * - Handle 1000 product syncs per day
 *
 * Usage:
 *   k6 run test/load/scenarios/products-load.js
 */

import http from 'k6/http';
import { check } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { BASE_URL, ENDPOINTS, REQUEST_OPTIONS, TEST_DATA } from '../config.js';
import {
  checkResponse,
  httpGet,
  httpPost,
  randomSleep,
  randomItem,
  randomInt,
  testGroup,
  parseJson,
} from '../helpers/utils.js';

// Custom metrics
const productListDuration = new Trend('product_list_duration');
const productSyncDuration = new Trend('product_sync_duration');
const productReadDuration = new Trend('product_read_duration');
const syncOperations = new Counter('sync_operations');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 20 }, // Ramp up
    { duration: '5m', target: 50 }, // Normal load
    { duration: '3m', target: 0 }, // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500'],
    'http_req_failed': ['rate<0.01'],
    'product_list_duration': ['p(95)<500'],
    'product_sync_duration': ['p(95)<2000'],
  },
  tags: {
    test_type: 'product_endpoints',
  },
};

/**
 * Setup function
 */
export function setup() {
  console.log('Starting product endpoints load test');
  console.log(`Target: ${BASE_URL}`);
  console.log('Testing product discovery and sync operations\n');

  // Verify API is accessible
  const health = http.get(`${BASE_URL}${ENDPOINTS.HEALTH}`);
  check(health, { 'API accessible': (r) => r.status === 200 });

  // Get some product IDs for testing
  const productsResponse = http.get(`${BASE_URL}${ENDPOINTS.PRODUCTS_LIST}?limit=10`);
  let productIds = TEST_DATA.PRODUCT_IDS;

  if (productsResponse.status === 200) {
    const body = parseJson(productsResponse);
    if (body && body.data && Array.isArray(body.data)) {
      productIds = body.data.map((p) => p.id || p.asin).filter(Boolean);
    }
  }

  return {
    baseUrl: BASE_URL,
    productIds: productIds.length > 0 ? productIds : TEST_DATA.PRODUCT_IDS,
  };
}

/**
 * Main test function
 */
export default function (data) {
  const { baseUrl, productIds } = data;

  // Test 1: List products with pagination
  testGroup('List Products', () => {
    const limit = randomInt(10, 50);
    const offset = randomInt(0, 100);
    const startTime = Date.now();

    const response = httpGet(
      `${baseUrl}${ENDPOINTS.PRODUCTS_LIST}?limit=${limit}&offset=${offset}`,
      REQUEST_OPTIONS
    );

    const duration = Date.now() - startTime;
    productListDuration.add(duration);

    checkResponse(response, 'List Products', {
      'status is 200': (r) => r.status === 200,
      'has products array': (r) => {
        const body = parseJson(r);
        return body && (Array.isArray(body.data) || Array.isArray(body));
      },
      'response time acceptable': (r) => r.timings.duration < 500,
      'has pagination info': (r) => {
        const body = parseJson(r);
        return body && (body.total !== undefined || body.data !== undefined);
      },
    });
  });

  randomSleep(1, 2);

  // Test 2: Get top products
  testGroup('Top Products', () => {
    const limit = randomInt(5, 20);
    const startTime = Date.now();

    const response = httpGet(
      `${baseUrl}${ENDPOINTS.PRODUCTS_TOP}?limit=${limit}`,
      REQUEST_OPTIONS
    );

    const duration = Date.now() - startTime;
    productReadDuration.add(duration);

    checkResponse(response, 'Top Products', {
      'status is 200': (r) => r.status === 200,
      'has top products': (r) => {
        const body = parseJson(r);
        return body && (Array.isArray(body.data) || Array.isArray(body));
      },
      'fast response': (r) => r.timings.duration < 500,
    });
  });

  randomSleep(2, 3);

  // Test 3: Get individual product (10% of requests)
  if (Math.random() < 0.1 && productIds.length > 0) {
    testGroup('Get Product Details', () => {
      const productId = randomItem(productIds);
      const startTime = Date.now();

      const response = httpGet(
        `${baseUrl}${ENDPOINTS.PRODUCT_BY_ID(productId)}`,
        REQUEST_OPTIONS
      );

      const duration = Date.now() - startTime;
      productReadDuration.add(duration);

      checkResponse(response, 'Product Details', {
        'status is 200 or 404': (r) => r.status === 200 || r.status === 404,
        'quick response': (r) => r.timings.duration < 300,
      });
    });

    randomSleep(1, 2);
  }

  // Test 4: Trigger product sync (5% of requests - expensive operation)
  if (Math.random() < 0.05) {
    testGroup('Product Sync', () => {
      const syncPayload = {
        source: randomItem(['amazon', 'shareasale', 'cj']),
        categories: [randomItem(TEST_DATA.NICHES)],
        limit: randomInt(10, 50),
      };

      const startTime = Date.now();

      const response = httpPost(
        `${baseUrl}${ENDPOINTS.PRODUCTS_SYNC}`,
        syncPayload,
        REQUEST_OPTIONS
      );

      const duration = Date.now() - startTime;
      productSyncDuration.add(duration);
      syncOperations.add(1);

      checkResponse(response, 'Product Sync', {
        'sync initiated': (r) => r.status === 200 || r.status === 202,
        'acceptable sync time': (r) => r.timings.duration < 3000,
        'has job info': (r) => {
          if (r.status !== 200 && r.status !== 202) return true;
          const body = parseJson(r);
          return body && (body.jobId || body.status || body.data);
        },
      });
    });

    randomSleep(3, 5);
  }

  // Test 5: Search/filter products (20% of requests)
  if (Math.random() < 0.2) {
    testGroup('Filter Products', () => {
      const category = randomItem(TEST_DATA.NICHES);
      const minPrice = randomInt(10, 50);
      const maxPrice = randomInt(100, 500);

      const response = httpGet(
        `${baseUrl}${ENDPOINTS.PRODUCTS_LIST}?category=${category}&minPrice=${minPrice}&maxPrice=${maxPrice}&limit=20`,
        REQUEST_OPTIONS
      );

      checkResponse(response, 'Filter Products', {
        'filtered results': (r) => r.status === 200,
        'fast filtering': (r) => r.timings.duration < 800,
      });
    });

    randomSleep(1, 2);
  }

  randomSleep(2, 4);
}

/**
 * Teardown function
 */
export function teardown(data) {
  console.log('\nProduct endpoints load test completed');
  console.log('Review metrics for product operations performance');
}

/**
 * Handle summary
 */
export function handleSummary(data) {
  const summary = generateProductsSummary(data);

  return {
    stdout: summary,
    './test/load/reports/products-load-summary.json': JSON.stringify(data, null, 2),
  };
}

/**
 * Generate products test summary
 */
function generateProductsSummary(data) {
  let output = '\n';
  output += '═'.repeat(60) + '\n';
  output += '  PRODUCTS ENDPOINTS LOAD TEST SUMMARY\n';
  output += '═'.repeat(60) + '\n\n';

  if (data.metrics) {
    output += 'Operation Performance:\n';
    output += '─'.repeat(60) + '\n';

    if (data.metrics.product_list_duration) {
      const list = data.metrics.product_list_duration.values;
      output += `  List Products:\n`;
      output += `    p50: ${list.med?.toFixed(2)}ms\n`;
      output += `    p95: ${list['p(95)']?.toFixed(2)}ms `;
      output += list['p(95)'] < 500 ? '✓\n' : '✗\n';
    }

    if (data.metrics.product_read_duration) {
      const read = data.metrics.product_read_duration.values;
      output += `  Read Operations:\n`;
      output += `    p50: ${read.med?.toFixed(2)}ms\n`;
      output += `    p95: ${read['p(95)']?.toFixed(2)}ms\n`;
    }

    if (data.metrics.product_sync_duration) {
      const sync = data.metrics.product_sync_duration.values;
      output += `  Product Sync:\n`;
      output += `    p50: ${sync.med?.toFixed(2)}ms\n`;
      output += `    p95: ${sync['p(95)']?.toFixed(2)}ms `;
      output += sync['p(95)'] < 2000 ? '✓\n' : '✗\n';
    }

    if (data.metrics.sync_operations) {
      const syncs = data.metrics.sync_operations.values;
      output += `\n  Sync Operations: ${syncs.count || 0}\n`;
    }

    if (data.metrics.http_req_failed) {
      const failed = data.metrics.http_req_failed.values;
      output += `  Error Rate: ${(failed.rate * 100).toFixed(2)}% `;
      output += failed.rate < 0.01 ? '✓\n' : '✗\n';
    }
  }

  output += '\n' + '═'.repeat(60) + '\n';

  return output;
}
