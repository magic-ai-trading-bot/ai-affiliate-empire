/**
 * Stress Load Test
 *
 * Purpose: Find the breaking point and maximum capacity of the system
 *
 * Scenario:
 * - Ramp up from 0 to 100 VUs over 10 minutes
 * - Hold 100 VUs for 5 minutes
 * - Spike to 200 VUs for 5 minutes (find breaking point)
 * - Ramp down to 0 over 5 minutes
 *
 * Success Criteria:
 * - System remains stable up to 100 VUs
 * - Error rate < 5% under stress
 * - Graceful degradation (no crashes)
 * - Auto-scaling triggers correctly
 *
 * Usage:
 *   k6 run test/load/scenarios/stress-test.js
 */

import http from 'k6/http';
import { check } from 'k6';
import { Trend } from 'k6/metrics';
import { BASE_URL, ENDPOINTS, REQUEST_OPTIONS, VU_COUNT, DURATION } from '../config.js';
import {
  checkResponse,
  httpGet,
  httpPost,
  randomSleep,
  randomItem,
  testGroup,
  parseJson,
  logMetric
} from '../helpers/utils.js';

// Custom metrics
const degradationTrend = new Trend('degradation_factor');
const errorTrend = new Trend('error_count_per_iteration');

// Test configuration with ramping stages
export const options = {
  stages: [
    // Warm-up phase
    { duration: '1m', target: 10 },

    // Ramp up to normal load
    { duration: '5m', target: 50 },

    // Increase to high load
    { duration: '4m', target: 100 },

    // Hold at high load
    { duration: '5m', target: 100 },

    // Stress phase - push beyond normal capacity
    { duration: '5m', target: 200 },

    // Hold stress load
    { duration: '5m', target: 200 },

    // Recovery - ramp down
    { duration: '5m', target: 0 },
  ],
  thresholds: {
    'http_req_duration': ['p(95)<1000', 'p(99)<2000'], // More relaxed under stress
    'http_req_failed': ['rate<0.05'], // Allow 5% errors under stress
    'degradation_factor': ['p(95)<3'], // Response time shouldn't triple
  },
  tags: {
    test_type: 'stress',
  },
};

/**
 * Setup function
 */
export function setup() {
  console.log(`Starting stress test against ${BASE_URL}`);
  console.log('Stages:');
  console.log('  1m: Warm-up to 10 VUs');
  console.log('  5m: Ramp to 50 VUs');
  console.log('  4m: Ramp to 100 VUs');
  console.log('  5m: Hold at 100 VUs');
  console.log('  5m: Stress to 200 VUs');
  console.log('  5m: Hold at 200 VUs');
  console.log('  5m: Recovery to 0 VUs');

  // Get baseline response time
  const baseline = http.get(`${BASE_URL}${ENDPOINTS.HEALTH}`);
  const baselineTime = baseline.timings.duration;

  return {
    startTime: Date.now(),
    baseUrl: BASE_URL,
    baselineResponseTime: baselineTime,
  };
}

/**
 * Main test function
 */
export default function (data) {
  const { baseUrl, baselineResponseTime } = data;
  let errors = 0;

  // Test critical endpoints under stress
  testGroup('Critical Path - Products', () => {
    const startTime = Date.now();

    // List products
    const listResponse = httpGet(`${baseUrl}${ENDPOINTS.PRODUCTS_LIST}`, REQUEST_OPTIONS);
    const listSuccess = checkResponse(listResponse, 'List Products (Stress)', {
      'status is 2xx': (r) => r.status >= 200 && r.status < 300,
      'response time acceptable': (r) => r.timings.duration < 2000,
    });

    if (!listSuccess) errors++;

    randomSleep(0.5, 1);

    // Top products
    const topResponse = httpGet(`${baseUrl}${ENDPOINTS.PRODUCTS_TOP}?limit=10`, REQUEST_OPTIONS);
    const topSuccess = checkResponse(topResponse, 'Top Products (Stress)');

    if (!topSuccess) errors++;

    const duration = Date.now() - startTime;
    const degradation = duration / baselineResponseTime;
    degradationTrend.add(degradation);
  });

  randomSleep(1, 2);

  // Test analytics under load
  testGroup('Analytics Under Stress', () => {
    const overviewResponse = httpGet(`${baseUrl}${ENDPOINTS.ANALYTICS_OVERVIEW}`, REQUEST_OPTIONS);
    const success = checkResponse(overviewResponse, 'Analytics Overview (Stress)', {
      'not too slow': (r) => r.timings.duration < 3000, // Allow slower response under stress
    });

    if (!success) errors++;

    randomSleep(1, 2);

    // Revenue analytics
    const revenueResponse = httpGet(
      `${baseUrl}${ENDPOINTS.ANALYTICS_REVENUE}?period=7d`,
      REQUEST_OPTIONS
    );

    if (!checkResponse(revenueResponse, 'Revenue (Stress)')) errors++;
  });

  randomSleep(1, 2);

  // Test orchestrator status
  testGroup('Orchestrator Status', () => {
    const statusResponse = httpGet(`${baseUrl}${ENDPOINTS.ORCHESTRATOR_STATUS}`, REQUEST_OPTIONS);
    if (!checkResponse(statusResponse, 'Status (Stress)')) errors++;
  });

  // Record error count for this iteration
  errorTrend.add(errors);

  randomSleep(2, 4);
}

/**
 * Teardown function
 */
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`\nStress test completed in ${duration.toFixed(2)}s`);
  console.log('Analyzing system behavior under stress...');
}

/**
 * Handle summary
 */
export function handleSummary(data) {
  const summary = generateStressSummary(data);

  return {
    stdout: summary,
    './test/load/reports/stress-test-summary.json': JSON.stringify(data, null, 2),
    './test/load/reports/stress-test-summary.txt': summary,
  };
}

/**
 * Generate stress test summary
 */
function generateStressSummary(data) {
  let output = '\n';
  output += '═'.repeat(60) + '\n';
  output += '  STRESS TEST SUMMARY\n';
  output += '═'.repeat(60) + '\n\n';

  // Test configuration
  output += 'Configuration:\n';
  output += `  Max VUs: 200\n`;
  output += `  Total Duration: 30 minutes\n`;
  output += `  Base URL: ${BASE_URL}\n\n`;

  // Performance metrics
  if (data.metrics) {
    output += 'Performance Metrics:\n';
    output += '─'.repeat(60) + '\n';

    if (data.metrics.http_req_duration) {
      const duration = data.metrics.http_req_duration.values;
      output += `  Response Time:\n`;
      output += `    Min:  ${duration.min?.toFixed(2)}ms\n`;
      output += `    Avg:  ${duration.avg?.toFixed(2)}ms\n`;
      output += `    p50:  ${duration.med?.toFixed(2)}ms\n`;
      output += `    p95:  ${duration['p(95)']?.toFixed(2)}ms `;
      output += duration['p(95)'] < 1000 ? '✓\n' : '✗ (threshold: <1000ms)\n';
      output += `    p99:  ${duration['p(99)']?.toFixed(2)}ms\n`;
      output += `    Max:  ${duration.max?.toFixed(2)}ms\n\n`;
    }

    if (data.metrics.http_reqs) {
      const reqs = data.metrics.http_reqs.values;
      output += `  Request Statistics:\n`;
      output += `    Total Requests: ${reqs.count}\n`;
      output += `    Requests/sec:   ${reqs.rate?.toFixed(2)}\n\n`;
    }

    if (data.metrics.http_req_failed) {
      const failed = data.metrics.http_req_failed.values;
      const failRate = (failed.rate * 100).toFixed(2);
      output += `  Error Rate: ${failRate}% `;
      output += failRate < 5 ? '✓\n' : '✗ (threshold: <5%)\n';
      output += `    Failed Requests: ${failed.passes || 0}\n`;
      output += `    Successful Requests: ${failed.fails || 0}\n\n`;
    }

    if (data.metrics.degradation_factor) {
      const degradation = data.metrics.degradation_factor.values;
      output += `  Performance Degradation:\n`;
      output += `    Avg Factor: ${degradation.avg?.toFixed(2)}x\n`;
      output += `    p95 Factor: ${degradation['p(95)']?.toFixed(2)}x `;
      output += degradation['p(95)'] < 3 ? '✓\n' : '✗ (threshold: <3x)\n';
      output += `    Max Factor: ${degradation.max?.toFixed(2)}x\n\n`;
    }

    if (data.metrics.iterations) {
      const iterations = data.metrics.iterations.values;
      output += `  Test Iterations: ${iterations.count}\n\n`;
    }
  }

  // Analysis and recommendations
  output += 'Analysis:\n';
  output += '─'.repeat(60) + '\n';

  const errorRate = data.metrics?.http_req_failed?.values.rate || 0;
  const p95Duration = data.metrics?.http_req_duration?.values['p(95)'] || 0;
  const degradation = data.metrics?.degradation_factor?.values['p(95)'] || 0;

  if (errorRate < 0.01 && p95Duration < 500) {
    output += `  ✓ System performs excellently under stress\n`;
  } else if (errorRate < 0.05 && p95Duration < 1000) {
    output += `  ⚠ System stable but showing degradation\n`;
  } else {
    output += `  ✗ System struggling under stress load\n`;
  }

  if (degradation > 3) {
    output += `  ⚠ Significant performance degradation detected\n`;
  }

  output += '\nRecommendations:\n';
  output += '─'.repeat(60) + '\n';

  if (errorRate > 0.05) {
    output += `  • Investigate error causes (${(errorRate * 100).toFixed(2)}% error rate)\n`;
    output += `  • Consider scaling resources\n`;
  }

  if (p95Duration > 1000) {
    output += `  • Optimize slow endpoints (p95: ${p95Duration.toFixed(2)}ms)\n`;
    output += `  • Consider database query optimization\n`;
    output += `  • Review caching strategy\n`;
  }

  if (degradation > 3) {
    output += `  • Investigate bottlenecks causing ${degradation.toFixed(2)}x degradation\n`;
    output += `  • Consider horizontal scaling\n`;
  }

  output += '\n' + '═'.repeat(60) + '\n';

  return output;
}
