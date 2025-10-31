/**
 * Baseline Load Test
 *
 * Purpose: Establish performance baselines under normal load conditions
 *
 * Scenario:
 * - 10 VUs (virtual users) running constantly for 5 minutes
 * - Tests all critical endpoints
 * - Establishes baseline metrics for comparison
 *
 * Success Criteria:
 * - p95 response time < 500ms
 * - Error rate < 1%
 * - All endpoints return 200 status
 *
 * Usage:
 *   k6 run test/load/scenarios/baseline.js
 *   k6 run --env BASE_URL=https://staging.example.com test/load/scenarios/baseline.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, ENDPOINTS, THRESHOLDS, REQUEST_OPTIONS, VU_COUNT, DURATION } from '../config.js';
import {
  checkResponse,
  httpGet,
  httpPost,
  randomSleep,
  randomItem,
  testGroup,
  parseJson
} from '../helpers/utils.js';

// Test configuration
export const options = {
  vus: VU_COUNT.BASELINE,
  duration: `${DURATION.SHORT}s`,
  thresholds: THRESHOLDS,
  tags: {
    test_type: 'baseline',
  },
};

/**
 * Setup function - runs once before test
 */
export function setup() {
  console.log(`Starting baseline load test against ${BASE_URL}`);
  console.log(`VUs: ${VU_COUNT.BASELINE}, Duration: ${DURATION.SHORT}s`);

  // Verify API is accessible
  const healthCheck = http.get(`${BASE_URL}${ENDPOINTS.HEALTH}`);
  check(healthCheck, {
    'API is accessible': (r) => r.status === 200,
  });

  return {
    startTime: Date.now(),
    baseUrl: BASE_URL,
  };
}

/**
 * Main test function - runs continuously for each VU
 */
export default function (data) {
  const { baseUrl } = data;

  // Test Group 1: Health & Metrics
  testGroup('Health Check', () => {
    const response = httpGet(`${baseUrl}${ENDPOINTS.HEALTH}`, REQUEST_OPTIONS);
    checkResponse(response, 'Health Check', {
      'status is 200': (r) => r.status === 200,
      'has status field': (r) => {
        const body = parseJson(r);
        return body && body.status === 'ok';
      },
    });
  });

  randomSleep(1, 2);

  // Test Group 2: Product Endpoints
  testGroup('Product Operations', () => {
    // List products
    const listResponse = httpGet(`${baseUrl}${ENDPOINTS.PRODUCTS_LIST}`, REQUEST_OPTIONS);
    checkResponse(listResponse, 'List Products', {
      'status is 200': (r) => r.status === 200,
      'has products array': (r) => {
        const body = parseJson(r);
        return body && Array.isArray(body.data);
      },
    });

    randomSleep(1, 2);

    // Get top products
    const topResponse = httpGet(`${baseUrl}${ENDPOINTS.PRODUCTS_TOP}`, REQUEST_OPTIONS);
    checkResponse(topResponse, 'Top Products', {
      'status is 200': (r) => r.status === 200,
    });
  });

  randomSleep(2, 3);

  // Test Group 3: Analytics Endpoints
  testGroup('Analytics Operations', () => {
    // Overview
    const overviewResponse = httpGet(`${baseUrl}${ENDPOINTS.ANALYTICS_OVERVIEW}`, REQUEST_OPTIONS);
    checkResponse(overviewResponse, 'Analytics Overview', {
      'status is 200': (r) => r.status === 200,
      'has metrics': (r) => {
        const body = parseJson(r);
        return body && body.data;
      },
    });

    randomSleep(1, 2);

    // Revenue analytics
    const revenueResponse = httpGet(
      `${baseUrl}${ENDPOINTS.ANALYTICS_REVENUE}?period=7d`,
      REQUEST_OPTIONS
    );
    checkResponse(revenueResponse, 'Revenue Analytics', {
      'status is 200': (r) => r.status === 200,
    });

    randomSleep(1, 2);

    // Top products analytics
    const topProductsResponse = httpGet(
      `${baseUrl}${ENDPOINTS.ANALYTICS_TOP_PRODUCTS}?limit=10`,
      REQUEST_OPTIONS
    );
    checkResponse(topProductsResponse, 'Top Products Analytics', {
      'status is 200': (r) => r.status === 200,
    });
  });

  randomSleep(2, 3);

  // Test Group 4: Orchestrator Status
  testGroup('Orchestrator Operations', () => {
    const statusResponse = httpGet(`${baseUrl}${ENDPOINTS.ORCHESTRATOR_STATUS}`, REQUEST_OPTIONS);
    checkResponse(statusResponse, 'Orchestrator Status', {
      'status is 200': (r) => r.status === 200,
      'has workflow status': (r) => {
        const body = parseJson(r);
        return body && body.data;
      },
    });
  });

  randomSleep(3, 5);
}

/**
 * Teardown function - runs once after test
 */
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Baseline test completed in ${duration.toFixed(2)}s`);
  console.log('Check the summary below for detailed metrics');
}

/**
 * Handle summary - custom summary output
 */
export function handleSummary(data) {
  return {
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
    './test/load/reports/baseline-summary.json': JSON.stringify(data),
  };
}

// Helper function to create text summary
function textSummary(data, options = {}) {
  const { indent = '', enableColors = false } = options;
  let output = '\n';

  output += `${indent}✓ Baseline Load Test Summary\n`;
  output += `${indent}${'='.repeat(50)}\n\n`;

  // Test configuration
  output += `${indent}Configuration:\n`;
  output += `${indent}  VUs: ${options.vus || VU_COUNT.BASELINE}\n`;
  output += `${indent}  Duration: ${DURATION.SHORT}s\n`;
  output += `${indent}  Base URL: ${BASE_URL}\n\n`;

  // Key metrics
  if (data.metrics) {
    output += `${indent}Key Metrics:\n`;

    if (data.metrics.http_req_duration) {
      const duration = data.metrics.http_req_duration;
      output += `${indent}  Response Time:\n`;
      output += `${indent}    p50: ${duration.values.med?.toFixed(2)}ms\n`;
      output += `${indent}    p95: ${duration.values['p(95)']?.toFixed(2)}ms\n`;
      output += `${indent}    p99: ${duration.values['p(99)']?.toFixed(2)}ms\n`;
    }

    if (data.metrics.http_reqs) {
      const reqs = data.metrics.http_reqs;
      output += `${indent}  Request Rate: ${reqs.values.rate?.toFixed(2)} req/s\n`;
      output += `${indent}  Total Requests: ${reqs.values.count}\n`;
    }

    if (data.metrics.http_req_failed) {
      const failed = data.metrics.http_req_failed;
      const failRate = (failed.values.rate * 100).toFixed(2);
      output += `${indent}  Error Rate: ${failRate}%\n`;
    }

    if (data.metrics.iterations) {
      const iterations = data.metrics.iterations;
      output += `${indent}  Iterations: ${iterations.values.count}\n`;
    }
  }

  output += `\n${indent}${'='.repeat(50)}\n`;

  return output;
}
