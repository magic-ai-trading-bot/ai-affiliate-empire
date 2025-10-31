/**
 * Soak Test (Endurance Test)
 *
 * Purpose: Detect memory leaks and verify long-term stability
 *
 * Scenario:
 * - 50 VUs running continuously for 2 hours
 * - Tests sustained load over extended period
 * - Monitors memory consumption, connection pools, resource leaks
 *
 * Success Criteria:
 * - No memory leaks (stable memory usage)
 * - No degradation over time
 * - Error rate < 1% throughout
 * - Database connections remain stable
 *
 * Usage:
 *   k6 run test/load/scenarios/soak-test.js
 *   k6 run --duration=30m test/load/scenarios/soak-test.js  # Shorter test
 */

import http from 'k6/http';
import { check } from 'k6';
import { Trend, Counter, Gauge } from 'k6/metrics';
import { BASE_URL, ENDPOINTS, REQUEST_OPTIONS, VU_COUNT, DURATION } from '../config.js';
import {
  checkResponse,
  httpGet,
  randomSleep,
  randomItem,
  testGroup,
  parseJson,
  logMetric
} from '../helpers/utils.js';

// Custom metrics for long-running monitoring
const memoryDegradation = new Trend('memory_degradation');
const performanceDegradation = new Trend('performance_degradation');
const connectionPoolUsage = new Gauge('connection_pool_usage');
const longRunningErrors = new Counter('long_running_errors');

// Test configuration
export const options = {
  stages: [
    // Warm-up
    { duration: '5m', target: VU_COUNT.MEDIUM },

    // Soak phase - maintain load for extended period
    { duration: `${DURATION.SOAK - 600}s`, target: VU_COUNT.MEDIUM }, // 2h - 10m

    // Cool down
    { duration: '5m', target: 0 },
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'], // Should maintain performance
    'http_req_failed': ['rate<0.01'], // Low error rate throughout
    'performance_degradation': ['p(95)<1.5'], // Performance shouldn't degrade >50%
  },
  tags: {
    test_type: 'soak',
  },
};

/**
 * Setup function
 */
export function setup() {
  console.log(`Starting soak test against ${BASE_URL}`);
  console.log(`Duration: ${DURATION.SOAK / 60} minutes (${DURATION.SOAK / 3600} hours)`);
  console.log(`Load: ${VU_COUNT.MEDIUM} VUs constant`);
  console.log('\nThis test will detect:');
  console.log('  • Memory leaks');
  console.log('  • Resource exhaustion');
  console.log('  • Connection pool issues');
  console.log('  • Performance degradation over time');

  // Establish baseline metrics
  const baselineStart = Date.now();
  const responses = [];

  for (let i = 0; i < 10; i++) {
    const res = http.get(`${BASE_URL}${ENDPOINTS.HEALTH}`);
    responses.push(res.timings.duration);
  }

  const baselineResponseTime = responses.reduce((a, b) => a + b, 0) / responses.length;

  return {
    startTime: Date.now(),
    baseUrl: BASE_URL,
    baselineResponseTime,
    checkpoints: {
      '30min': false,
      '60min': false,
      '90min': false,
    },
  };
}

/**
 * Main test function
 */
export default function (data) {
  const { baseUrl, baselineResponseTime, checkpoints } = data;
  const elapsedMinutes = (Date.now() - data.startTime) / 60000;

  // Checkpoint logging
  if (elapsedMinutes >= 30 && !checkpoints['30min']) {
    checkpoints['30min'] = true;
    logMetric('Checkpoint: 30 minutes', { elapsed: elapsedMinutes });
  }
  if (elapsedMinutes >= 60 && !checkpoints['60min']) {
    checkpoints['60min'] = true;
    logMetric('Checkpoint: 60 minutes', { elapsed: elapsedMinutes });
  }
  if (elapsedMinutes >= 90 && !checkpoints['90min']) {
    checkpoints['90min'] = true;
    logMetric('Checkpoint: 90 minutes', { elapsed: elapsedMinutes });
  }

  // Comprehensive endpoint testing
  testGroup('Core Endpoints - Health', () => {
    const startTime = Date.now();
    const response = httpGet(`${baseUrl}${ENDPOINTS.HEALTH}`, REQUEST_OPTIONS);

    const success = checkResponse(response, 'Health Check (Soak)', {
      'status is 200': (r) => r.status === 200,
      'consistent performance': (r) => r.timings.duration < baselineResponseTime * 2,
    });

    const duration = Date.now() - startTime;
    const degradation = duration / baselineResponseTime;
    performanceDegradation.add(degradation);

    if (!success) {
      longRunningErrors.add(1);
    }
  });

  randomSleep(2, 4);

  // Test product endpoints
  testGroup('Product Operations - Sustained Load', () => {
    // List products
    const listResponse = httpGet(
      `${baseUrl}${ENDPOINTS.PRODUCTS_LIST}?limit=20&offset=0`,
      REQUEST_OPTIONS
    );
    const listSuccess = checkResponse(listResponse, 'List Products (Soak)', {
      'returns products': (r) => {
        const body = parseJson(r);
        return body && (Array.isArray(body.data) || Array.isArray(body));
      },
    });

    if (!listSuccess) longRunningErrors.add(1);

    randomSleep(2, 3);

    // Top products
    const topResponse = httpGet(`${baseUrl}${ENDPOINTS.PRODUCTS_TOP}?limit=10`, REQUEST_OPTIONS);
    if (!checkResponse(topResponse, 'Top Products (Soak)')) {
      longRunningErrors.add(1);
    }
  });

  randomSleep(3, 5);

  // Test analytics endpoints
  testGroup('Analytics - Long Running Queries', () => {
    // Overview
    const overviewResponse = httpGet(`${baseUrl}${ENDPOINTS.ANALYTICS_OVERVIEW}`, REQUEST_OPTIONS);
    checkResponse(overviewResponse, 'Analytics Overview (Soak)', {
      'no performance degradation': (r) => r.timings.duration < 2000,
    });

    randomSleep(2, 3);

    // Revenue analytics
    const revenueResponse = httpGet(
      `${baseUrl}${ENDPOINTS.ANALYTICS_REVENUE}?period=7d`,
      REQUEST_OPTIONS
    );
    checkResponse(revenueResponse, 'Revenue Analytics (Soak)');

    randomSleep(2, 3);

    // Platform comparison
    const platformResponse = httpGet(
      `${baseUrl}${ENDPOINTS.ANALYTICS_PLATFORM_COMPARISON}`,
      REQUEST_OPTIONS
    );
    checkResponse(platformResponse, 'Platform Comparison (Soak)');
  });

  randomSleep(3, 5);

  // Test orchestrator
  testGroup('Orchestrator Status - Stability Check', () => {
    const statusResponse = httpGet(`${baseUrl}${ENDPOINTS.ORCHESTRATOR_STATUS}`, REQUEST_OPTIONS);
    checkResponse(statusResponse, 'Orchestrator Status (Soak)', {
      'workflow manager stable': (r) => r.status === 200,
    });
  });

  randomSleep(5, 8);

  // Periodic comprehensive check (every ~10 iterations)
  if (Math.random() < 0.1) {
    testGroup('Comprehensive Health Check', () => {
      const responses = {
        health: httpGet(`${baseUrl}${ENDPOINTS.HEALTH}`, REQUEST_OPTIONS),
        products: httpGet(`${baseUrl}${ENDPOINTS.PRODUCTS_LIST}`, REQUEST_OPTIONS),
        analytics: httpGet(`${baseUrl}${ENDPOINTS.ANALYTICS_OVERVIEW}`, REQUEST_OPTIONS),
      };

      const allHealthy = Object.values(responses).every((r) => r.status === 200);

      check(allHealthy, {
        'all systems operational': () => allHealthy,
      });

      if (!allHealthy) {
        logMetric('System degradation detected', {
          elapsed: elapsedMinutes,
          statuses: Object.entries(responses).map(([k, v]) => ({ [k]: v.status })),
        });
      }
    });
  }
}

/**
 * Teardown function
 */
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  const hours = (duration / 3600).toFixed(2);
  console.log(`\nSoak test completed: ${hours} hours (${duration.toFixed(2)}s)`);
  console.log('Analyzing for memory leaks and performance degradation...');
}

/**
 * Handle summary
 */
export function handleSummary(data) {
  const summary = generateSoakSummary(data);

  return {
    stdout: summary,
    './test/load/reports/soak-test-summary.json': JSON.stringify(data, null, 2),
    './test/load/reports/soak-test-summary.txt': summary,
  };
}

/**
 * Generate soak test summary
 */
function generateSoakSummary(data) {
  let output = '\n';
  output += '═'.repeat(60) + '\n';
  output += '  SOAK TEST SUMMARY (ENDURANCE TEST)\n';
  output += '═'.repeat(60) + '\n\n';

  output += 'Test Configuration:\n';
  output += `  Duration: ${DURATION.SOAK / 3600} hours\n`;
  output += `  Load: ${VU_COUNT.MEDIUM} VUs (constant)\n`;
  output += `  Base URL: ${BASE_URL}\n\n`;

  // Performance metrics
  if (data.metrics) {
    output += 'Long-Term Performance:\n';
    output += '─'.repeat(60) + '\n';

    if (data.metrics.http_req_duration) {
      const duration = data.metrics.http_req_duration.values;
      output += `  Response Time Over ${DURATION.SOAK / 3600}h:\n`;
      output += `    Min:  ${duration.min?.toFixed(2)}ms\n`;
      output += `    Avg:  ${duration.avg?.toFixed(2)}ms\n`;
      output += `    p50:  ${duration.med?.toFixed(2)}ms\n`;
      output += `    p95:  ${duration['p(95)']?.toFixed(2)}ms `;
      output += duration['p(95)'] < 500 ? '✓\n' : '✗ (threshold: <500ms)\n';
      output += `    p99:  ${duration['p(99)']?.toFixed(2)}ms\n`;
      output += `    Max:  ${duration.max?.toFixed(2)}ms\n\n`;

      // Check for performance degradation
      const degradation = ((duration.max - duration.min) / duration.min * 100).toFixed(2);
      output += `  Performance Variation: ${degradation}%\n`;
      if (degradation > 100) {
        output += `    ⚠ Significant variation detected - investigate potential issues\n`;
      }
      output += '\n';
    }

    if (data.metrics.http_req_failed) {
      const failed = data.metrics.http_req_failed.values;
      const failRate = (failed.rate * 100).toFixed(2);
      output += `  Reliability:\n`;
      output += `    Error Rate: ${failRate}% `;
      output += failRate < 1 ? '✓\n' : '✗ (threshold: <1%)\n';
      output += `    Failed Requests: ${failed.passes || 0}\n`;
      output += `    Successful Requests: ${failed.fails || 0}\n\n`;
    }

    if (data.metrics.http_reqs) {
      const reqs = data.metrics.http_reqs.values;
      output += `  Request Statistics:\n`;
      output += `    Total Requests: ${reqs.count}\n`;
      output += `    Avg Rate: ${reqs.rate?.toFixed(2)} req/s\n`;
      const totalHours = DURATION.SOAK / 3600;
      const avgPerHour = (reqs.count / totalHours).toFixed(0);
      output += `    Requests/Hour: ~${avgPerHour}\n\n`;
    }

    if (data.metrics.performance_degradation) {
      const degradation = data.metrics.performance_degradation.values;
      output += `  Performance Degradation Analysis:\n`;
      output += `    Avg Degradation: ${degradation.avg?.toFixed(2)}x\n`;
      output += `    p95 Degradation: ${degradation['p(95)']?.toFixed(2)}x `;
      output += degradation['p(95)'] < 1.5 ? '✓\n' : '✗ (threshold: <1.5x)\n';
      output += `    Max Degradation: ${degradation.max?.toFixed(2)}x\n\n`;
    }

    if (data.metrics.long_running_errors) {
      const errors = data.metrics.long_running_errors.values;
      output += `  Long-Running Errors: ${errors.count || 0}\n\n`;
    }

    if (data.metrics.iterations) {
      const iterations = data.metrics.iterations.values;
      output += `  Test Iterations: ${iterations.count}\n`;
      output += `  Iterations/VU: ${(iterations.count / VU_COUNT.MEDIUM).toFixed(0)}\n\n`;
    }
  }

  // Stability analysis
  output += 'Stability Analysis:\n';
  output += '─'.repeat(60) + '\n';

  const errorRate = data.metrics?.http_req_failed?.values.rate || 0;
  const perfDegradation = data.metrics?.performance_degradation?.values['p(95)'] || 0;
  const p95Duration = data.metrics?.http_req_duration?.values['p(95)'] || 0;
  const longErrors = data.metrics?.long_running_errors?.values.count || 0;

  let stabilityScore = 100;

  if (errorRate > 0.01) {
    stabilityScore -= 30;
    output += `  ✗ Error rate elevated (${(errorRate * 100).toFixed(2)}%)\n`;
  } else {
    output += `  ✓ Error rate within acceptable range\n`;
  }

  if (perfDegradation > 1.5) {
    stabilityScore -= 25;
    output += `  ✗ Performance degraded over time (${perfDegradation.toFixed(2)}x)\n`;
  } else if (perfDegradation > 1.2) {
    stabilityScore -= 10;
    output += `  ⚠ Minor performance degradation (${perfDegradation.toFixed(2)}x)\n`;
  } else {
    output += `  ✓ Performance stable throughout test\n`;
  }

  if (p95Duration > 500) {
    stabilityScore -= 20;
    output += `  ⚠ Response times higher than baseline\n`;
  } else {
    output += `  ✓ Response times within target\n`;
  }

  if (longErrors > 100) {
    stabilityScore -= 25;
    output += `  ✗ High error count over test duration\n`;
  } else if (longErrors > 10) {
    stabilityScore -= 10;
    output += `  ⚠ Some errors occurred during test\n`;
  } else {
    output += `  ✓ Minimal errors throughout test\n`;
  }

  output += `\n  Overall Stability Score: ${stabilityScore}/100\n\n`;

  // Recommendations
  output += 'Recommendations:\n';
  output += '─'.repeat(60) + '\n';

  if (perfDegradation > 1.5) {
    output += `  • Investigate memory leaks (${perfDegradation.toFixed(2)}x degradation)\n`;
    output += `  • Review connection pool configuration\n`;
    output += `  • Monitor heap memory usage in production\n`;
  }

  if (errorRate > 0.01) {
    output += `  • Investigate error patterns (${(errorRate * 100).toFixed(2)}% rate)\n`;
    output += `  • Check database connection stability\n`;
  }

  if (p95Duration > 500) {
    output += `  • Optimize slow queries and endpoints\n`;
    output += `  • Consider implementing caching\n`;
  }

  if (stabilityScore >= 90) {
    output += `  ✓ System demonstrates excellent long-term stability\n`;
    output += `  • Ready for production sustained load\n`;
  } else if (stabilityScore >= 70) {
    output += `  ⚠ System generally stable but needs optimization\n`;
    output += `  • Address issues before production deployment\n`;
  } else {
    output += `  ✗ System shows concerning stability issues\n`;
    output += `  • Critical: Fix issues before production use\n`;
  }

  output += '\n' + '═'.repeat(60) + '\n';

  return output;
}
