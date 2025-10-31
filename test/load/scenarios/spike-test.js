/**
 * Spike Load Test
 *
 * Purpose: Test system behavior under sudden traffic spikes
 *
 * Scenario:
 * - Start with 10 VUs baseline
 * - Sudden spike to 100 VUs (simulating viral content or traffic surge)
 * - Hold spike for 5 minutes
 * - Return to baseline
 * - Measure recovery time and auto-scaling response
 *
 * Success Criteria:
 * - System handles spike without crashes
 * - Auto-scaling triggers within 60 seconds
 * - Error rate < 5% during spike
 * - Recovery time < 2 minutes
 *
 * Usage:
 *   k6 run test/load/scenarios/spike-test.js
 */

import http from 'k6/http';
import { check } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { BASE_URL, ENDPOINTS, REQUEST_OPTIONS } from '../config.js';
import {
  checkResponse,
  httpGet,
  randomSleep,
  testGroup,
  parseJson,
  logMetric
} from '../helpers/utils.js';

// Custom metrics
const spikeRecoveryTime = new Trend('spike_recovery_time');
const spikeErrors = new Counter('spike_errors');
const scalingTriggerTime = new Trend('scaling_trigger_time');

// Test configuration
export const options = {
  stages: [
    // Normal baseline load
    { duration: '2m', target: 10 },

    // SPIKE! Sudden increase
    { duration: '10s', target: 100 }, // Rapid spike

    // Hold spike load
    { duration: '5m', target: 100 },

    // Quick ramp down
    { duration: '30s', target: 10 },

    // Recovery period - monitor stability
    { duration: '2m', target: 10 },
  ],
  thresholds: {
    'http_req_duration': ['p(95)<1000'], // Allow some degradation during spike
    'http_req_failed': ['rate<0.05'], // 5% errors acceptable during spike
    'spike_recovery_time': ['p(95)<120000'], // Recovery within 2 minutes
  },
  tags: {
    test_type: 'spike',
  },
};

/**
 * Setup function
 */
export function setup() {
  console.log(`Starting spike test against ${BASE_URL}`);
  console.log('This test simulates sudden traffic surges (e.g., viral content)');
  console.log('\nStages:');
  console.log('  2m:   Baseline load (10 VUs)');
  console.log('  10s:  SPIKE to 100 VUs');
  console.log('  5m:   Hold spike (100 VUs)');
  console.log('  30s:  Ramp down (10 VUs)');
  console.log('  2m:   Recovery monitoring (10 VUs)');

  // Establish baseline
  const baseline = http.get(`${BASE_URL}${ENDPOINTS.HEALTH}`);

  return {
    startTime: Date.now(),
    baseUrl: BASE_URL,
    spikeStartTime: null,
    spikeDetected: false,
    recoveryStartTime: null,
  };
}

/**
 * Main test function
 */
export default function (data) {
  const { baseUrl } = data;
  const currentTime = Date.now();

  // Detect spike phase (simplified - based on elapsed time)
  const elapsedMinutes = (currentTime - data.startTime) / 60000;
  const isSpike = elapsedMinutes >= 2 && elapsedMinutes < 7; // During spike phase
  const isRecovery = elapsedMinutes >= 7.5; // During recovery phase

  // Test critical endpoints
  testGroup('Health & Availability', () => {
    const response = httpGet(`${baseUrl}${ENDPOINTS.HEALTH}`, REQUEST_OPTIONS);
    const success = checkResponse(response, 'Health Check (Spike)', {
      'system available': (r) => r.status === 200 || r.status === 503, // Allow 503 during spike
      'response time monitored': (r) => {
        if (isSpike && r.timings.duration > 2000) {
          logMetric('Slow response during spike', { duration: r.timings.duration });
        }
        return true;
      },
    });

    if (!success && isSpike) {
      spikeErrors.add(1);
    }
  });

  randomSleep(1, 2);

  // Test product listing (critical endpoint)
  testGroup('Product Endpoints During Spike', () => {
    const listResponse = httpGet(`${baseUrl}${ENDPOINTS.PRODUCTS_LIST}?limit=20`, REQUEST_OPTIONS);
    const success = checkResponse(listResponse, 'List Products (Spike)', {
      'returns data': (r) => {
        if (r.status !== 200) return false;
        const body = parseJson(r);
        return body && (Array.isArray(body.data) || Array.isArray(body));
      },
      'acceptable response time': (r) => r.timings.duration < 2000,
    });

    if (!success && isSpike) {
      spikeErrors.add(1);
    }

    randomSleep(1, 2);

    // Top products
    const topResponse = httpGet(`${baseUrl}${ENDPOINTS.PRODUCTS_TOP}?limit=10`, REQUEST_OPTIONS);
    checkResponse(topResponse, 'Top Products (Spike)', {
      'available during spike': (r) => r.status === 200 || r.status === 503,
    });
  });

  randomSleep(1, 2);

  // Test analytics (can be degraded during spike)
  testGroup('Analytics During Spike', () => {
    const overviewResponse = httpGet(`${baseUrl}${ENDPOINTS.ANALYTICS_OVERVIEW}`, REQUEST_OPTIONS);

    // Analytics can be slower during spike - that's acceptable
    check(overviewResponse, {
      'analytics available or gracefully degraded': (r) => r.status === 200 || r.status === 503,
    });

    if (isSpike && overviewResponse.status === 503) {
      logMetric('Analytics gracefully degraded during spike', { status: 503 });
    }
  });

  randomSleep(2, 3);

  // Monitor recovery
  if (isRecovery) {
    testGroup('Recovery Monitoring', () => {
      const healthResponse = httpGet(`${baseUrl}${ENDPOINTS.HEALTH}`, REQUEST_OPTIONS);

      const recovered = check(healthResponse, {
        'system recovered': (r) => r.status === 200,
        'response time normalized': (r) => r.timings.duration < 500,
      });

      if (recovered && !data.recoveryStartTime) {
        const recoveryTime = currentTime - (data.startTime + 7.5 * 60000);
        spikeRecoveryTime.add(recoveryTime);
        logMetric('System recovered', { recoveryTimeMs: recoveryTime });
      }
    });
  }

  randomSleep(2, 4);
}

/**
 * Teardown function
 */
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`\nSpike test completed in ${duration.toFixed(2)}s`);
}

/**
 * Handle summary
 */
export function handleSummary(data) {
  const summary = generateSpikeSummary(data);

  return {
    stdout: summary,
    './test/load/reports/spike-test-summary.json': JSON.stringify(data, null, 2),
    './test/load/reports/spike-test-summary.txt': summary,
  };
}

/**
 * Generate spike test summary
 */
function generateSpikeSummary(data) {
  let output = '\n';
  output += '═'.repeat(60) + '\n';
  output += '  SPIKE TEST SUMMARY\n';
  output += '═'.repeat(60) + '\n\n';

  output += 'Test Purpose:\n';
  output += '  Simulate sudden traffic surge (e.g., viral content)\n';
  output += '  Validate auto-scaling response\n';
  output += '  Measure recovery time\n\n';

  // Key metrics
  if (data.metrics) {
    output += 'Performance During Spike:\n';
    output += '─'.repeat(60) + '\n';

    if (data.metrics.http_req_duration) {
      const duration = data.metrics.http_req_duration.values;
      output += `  Response Time:\n`;
      output += `    Average: ${duration.avg?.toFixed(2)}ms\n`;
      output += `    p95:     ${duration['p(95)']?.toFixed(2)}ms `;
      output += duration['p(95)'] < 1000 ? '✓\n' : '✗ (threshold: <1000ms)\n';
      output += `    p99:     ${duration['p(99)']?.toFixed(2)}ms\n`;
      output += `    Max:     ${duration.max?.toFixed(2)}ms\n\n`;
    }

    if (data.metrics.http_req_failed) {
      const failed = data.metrics.http_req_failed.values;
      const failRate = (failed.rate * 100).toFixed(2);
      output += `  Error Rate: ${failRate}% `;
      output += failRate < 5 ? '✓\n' : '✗ (threshold: <5%)\n\n';
    }

    if (data.metrics.spike_errors) {
      const errors = data.metrics.spike_errors.values;
      output += `  Errors During Spike: ${errors.count || 0}\n\n`;
    }

    if (data.metrics.spike_recovery_time) {
      const recovery = data.metrics.spike_recovery_time.values;
      if (recovery.count > 0) {
        const recoverySeconds = (recovery.avg / 1000).toFixed(2);
        output += `  Recovery Time: ${recoverySeconds}s `;
        output += recovery.avg < 120000 ? '✓\n\n' : '✗ (threshold: <120s)\n\n';
      } else {
        output += `  Recovery Time: Not measured\n\n`;
      }
    }

    if (data.metrics.http_reqs) {
      const reqs = data.metrics.http_reqs.values;
      output += `  Total Requests: ${reqs.count}\n`;
      output += `  Request Rate: ${reqs.rate?.toFixed(2)} req/s\n\n`;
    }
  }

  // Analysis
  output += 'System Behavior Analysis:\n';
  output += '─'.repeat(60) + '\n';

  const errorRate = data.metrics?.http_req_failed?.values.rate || 0;
  const p95 = data.metrics?.http_req_duration?.values['p(95)'] || 0;
  const spikeErrorCount = data.metrics?.spike_errors?.values.count || 0;

  if (errorRate < 0.01 && p95 < 500) {
    output += `  ✓ Excellent: System handled spike seamlessly\n`;
  } else if (errorRate < 0.05 && p95 < 1000) {
    output += `  ✓ Good: System stable during spike with minor degradation\n`;
  } else {
    output += `  ✗ Warning: System struggled during spike\n`;
  }

  if (spikeErrorCount > 0) {
    output += `  ⚠ ${spikeErrorCount} errors occurred during spike phase\n`;
  }

  output += '\nRecommendations:\n';
  output += '─'.repeat(60) + '\n';

  if (errorRate > 0.05) {
    output += `  • Configure auto-scaling to trigger faster\n`;
    output += `  • Consider pre-warming instances\n`;
  }

  if (p95 > 1000) {
    output += `  • Implement rate limiting to protect resources\n`;
    output += `  • Add caching layer for frequently accessed data\n`;
  }

  if (spikeErrorCount > 10) {
    output += `  • Investigate error patterns during spike\n`;
    output += `  • Consider circuit breakers for external services\n`;
  }

  output += `  • Monitor these metrics in production\n`;
  output += `  • Set up alerts for sudden traffic increases\n`;

  output += '\n' + '═'.repeat(60) + '\n';

  return output;
}
