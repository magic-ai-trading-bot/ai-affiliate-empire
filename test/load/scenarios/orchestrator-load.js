/**
 * Orchestrator Endpoint Load Test
 *
 * Purpose: Test workflow orchestration endpoints under load
 *
 * Endpoints Tested:
 * - POST /orchestrator/start (trigger workflow execution)
 * - GET /orchestrator/status (check workflow status)
 *
 * Success Criteria:
 * - p95 response time < 1000ms for status checks
 * - p95 response time < 3000ms for workflow triggers
 * - Error rate < 1%
 * - Support 10+ concurrent workflow executions
 *
 * Usage:
 *   k6 run test/load/scenarios/orchestrator-load.js
 */

import http from 'k6/http';
import { check } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';
import { BASE_URL, ENDPOINTS, REQUEST_OPTIONS } from '../config.js';
import {
  checkResponse,
  httpGet,
  httpPost,
  randomSleep,
  randomItem,
  testGroup,
  parseJson,
  logMetric,
} from '../helpers/utils.js';

// Custom metrics
const workflowTriggerDuration = new Trend('workflow_trigger_duration');
const workflowStatusDuration = new Trend('workflow_status_duration');
const workflowsTriggered = new Counter('workflows_triggered');
const workflowSuccessRate = new Rate('workflow_success_rate');

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 5 }, // Gentle ramp up for workflows
    { duration: '5m', target: 10 }, // Normal workflow load
    { duration: '2m', target: 15 }, // Peak workflow load
    { duration: '2m', target: 0 }, // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<3000'],
    'http_req_failed': ['rate<0.01'],
    'workflow_trigger_duration': ['p(95)<3000'],
    'workflow_status_duration': ['p(95)<500'],
    'workflow_success_rate': ['rate>0.95'],
  },
  tags: {
    test_type: 'orchestrator_endpoints',
  },
};

/**
 * Setup function
 */
export function setup() {
  console.log('Starting orchestrator endpoints load test');
  console.log(`Target: ${BASE_URL}`);
  console.log('Testing workflow orchestration and status tracking\n');

  // Get initial workflow status
  const statusResponse = http.get(`${BASE_URL}${ENDPOINTS.ORCHESTRATOR_STATUS}`);
  console.log(`Initial workflow status: ${statusResponse.status}\n`);

  return {
    baseUrl: BASE_URL,
    workflowIds: [], // Will collect workflow IDs during test
  };
}

/**
 * Main test function
 */
export default function (data) {
  const { baseUrl, workflowIds } = data;

  // Test 1: Check workflow status (most frequent operation)
  testGroup('Workflow Status', () => {
    const startTime = Date.now();

    const response = httpGet(`${baseUrl}${ENDPOINTS.ORCHESTRATOR_STATUS}`, REQUEST_OPTIONS);

    const duration = Date.now() - startTime;
    workflowStatusDuration.add(duration);

    checkResponse(response, 'Workflow Status', {
      'status is 200': (r) => r.status === 200,
      'has status data': (r) => {
        const body = parseJson(r);
        return body && body.data;
      },
      'fast status check': (r) => r.timings.duration < 800,
      'includes workflow info': (r) => {
        const body = parseJson(r);
        if (!body || !body.data) return true; // Allow empty state
        return body.data.active !== undefined || body.data.workflows;
      },
    });
  });

  randomSleep(3, 5);

  // Test 2: Trigger workflow execution (less frequent, more expensive)
  // Only 20% of iterations trigger workflows to avoid overload
  if (Math.random() < 0.2) {
    testGroup('Trigger Daily Control Loop', () => {
      const workflowPayload = {
        videoCount: 10,
        dryRun: true, // Use dry run for load testing
      };

      const startTime = Date.now();

      const response = httpPost(
        `${baseUrl}${ENDPOINTS.ORCHESTRATOR_START}`,
        workflowPayload,
        REQUEST_OPTIONS
      );

      const duration = Date.now() - startTime;
      workflowTriggerDuration.add(duration);
      workflowsTriggered.add(1);

      const success = checkResponse(response, 'Trigger Workflow', {
        'workflow triggered': (r) => r.status === 200 || r.status === 202 || r.status === 409,
        'acceptable trigger time': (r) => r.timings.duration < 5000,
        'has workflow ID or status': (r) => {
          if (r.status === 409) return true; // Already running is acceptable
          const body = parseJson(r);
          return body && (body.workflowId || body.runId || body.data);
        },
      });

      workflowSuccessRate.add(success);

      // Collect workflow ID for later status checks
      if (success && response.status === 200) {
        const body = parseJson(response);
        if (body && (body.workflowId || body.runId)) {
          workflowIds.push(body.workflowId || body.runId);
          logMetric('Workflow triggered', { id: body.workflowId || body.runId });
        }
      }

      // If already running (409), that's actually a good sign
      if (response.status === 409) {
        logMetric('Workflow already running', { status: 409 });
      }
    });

    randomSleep(5, 8);
  }

  // Test 3: Check specific workflow status (if we have IDs)
  if (workflowIds.length > 0 && Math.random() < 0.3) {
    testGroup('Specific Workflow Status', () => {
      const workflowId = randomItem(workflowIds);

      const response = httpGet(
        `${baseUrl}${ENDPOINTS.ORCHESTRATOR_STATUS}/${workflowId}`,
        REQUEST_OPTIONS
      );

      checkResponse(response, 'Specific Workflow Status', {
        'has workflow details': (r) => r.status === 200 || r.status === 404,
        'quick response': (r) => r.timings.duration < 500,
      });
    });

    randomSleep(2, 3);
  }

  // Test 4: Health check of orchestration system
  if (Math.random() < 0.1) {
    testGroup('Orchestrator Health', () => {
      // Check that the orchestrator is responsive
      const response = httpGet(`${baseUrl}${ENDPOINTS.HEALTH}`, REQUEST_OPTIONS);

      check(response, {
        'orchestrator healthy': (r) => r.status === 200,
      });
    });

    randomSleep(1, 2);
  }

  randomSleep(4, 6);
}

/**
 * Teardown function
 */
export function teardown(data) {
  console.log('\nOrchestrator endpoints load test completed');
  console.log(`Workflows triggered during test: ${data.workflowIds.length}`);
}

/**
 * Handle summary
 */
export function handleSummary(data) {
  const summary = generateOrchestratorSummary(data);

  return {
    stdout: summary,
    './test/load/reports/orchestrator-load-summary.json': JSON.stringify(data, null, 2),
  };
}

/**
 * Generate orchestrator test summary
 */
function generateOrchestratorSummary(data) {
  let output = '\n';
  output += '═'.repeat(60) + '\n';
  output += '  ORCHESTRATOR ENDPOINTS LOAD TEST SUMMARY\n';
  output += '═'.repeat(60) + '\n\n';

  output += 'Test Purpose:\n';
  output += '  Validate workflow orchestration under concurrent load\n';
  output += '  Ensure Temporal workflows can handle multiple executions\n';
  output += '  Test status tracking performance\n\n';

  if (data.metrics) {
    output += 'Workflow Performance:\n';
    output += '─'.repeat(60) + '\n';

    if (data.metrics.workflow_trigger_duration) {
      const trigger = data.metrics.workflow_trigger_duration.values;
      output += `  Workflow Trigger:\n`;
      output += `    p50: ${trigger.med?.toFixed(2)}ms\n`;
      output += `    p95: ${trigger['p(95)']?.toFixed(2)}ms `;
      output += trigger['p(95)'] < 3000 ? '✓\n' : '✗ (threshold: <3000ms)\n';
      output += `    Max: ${trigger.max?.toFixed(2)}ms\n\n`;
    }

    if (data.metrics.workflow_status_duration) {
      const status = data.metrics.workflow_status_duration.values;
      output += `  Status Check:\n`;
      output += `    p50: ${status.med?.toFixed(2)}ms\n`;
      output += `    p95: ${status['p(95)']?.toFixed(2)}ms `;
      output += status['p(95)'] < 500 ? '✓\n' : '✗ (threshold: <500ms)\n';
      output += `    Max: ${status.max?.toFixed(2)}ms\n\n`;
    }

    if (data.metrics.workflows_triggered) {
      const triggered = data.metrics.workflows_triggered.values;
      output += `  Workflows Triggered: ${triggered.count || 0}\n`;
    }

    if (data.metrics.workflow_success_rate) {
      const success = data.metrics.workflow_success_rate.values;
      const successPct = (success.rate * 100).toFixed(2);
      output += `  Success Rate: ${successPct}% `;
      output += success.rate > 0.95 ? '✓\n' : '✗ (threshold: >95%)\n';
    }

    output += '\n';

    if (data.metrics.http_req_failed) {
      const failed = data.metrics.http_req_failed.values;
      output += `  Error Rate: ${(failed.rate * 100).toFixed(2)}% `;
      output += failed.rate < 0.01 ? '✓\n' : '✗\n';
    }

    if (data.metrics.http_reqs) {
      const reqs = data.metrics.http_reqs.values;
      output += `  Total Requests: ${reqs.count}\n`;
    }
  }

  output += '\n';
  output += 'System Analysis:\n';
  output += '─'.repeat(60) + '\n';

  const triggerP95 = data.metrics?.workflow_trigger_duration?.values['p(95)'] || 0;
  const statusP95 = data.metrics?.workflow_status_duration?.values['p(95)'] || 0;
  const successRate = data.metrics?.workflow_success_rate?.values.rate || 0;
  const triggered = data.metrics?.workflows_triggered?.values.count || 0;

  if (successRate > 0.95 && triggerP95 < 3000) {
    output += `  ✓ Workflow orchestration performing well\n`;
  } else if (successRate > 0.9) {
    output += `  ⚠ Acceptable performance with minor issues\n`;
  } else {
    output += `  ✗ Workflow orchestration needs optimization\n`;
  }

  if (statusP95 > 500) {
    output += `  ⚠ Status checks slower than expected (${statusP95.toFixed(2)}ms)\n`;
  }

  output += `\n  Concurrent Workflows: ${triggered}\n`;

  if (triggered > 0) {
    output += `  ✓ System handled concurrent workflow execution\n`;
  }

  output += '\n';
  output += 'Recommendations:\n';
  output += '─'.repeat(60) + '\n';

  if (triggerP95 > 3000) {
    output += `  • Optimize workflow initialization (${triggerP95.toFixed(2)}ms)\n`;
    output += `  • Consider async workflow triggering\n`;
  }

  if (statusP95 > 500) {
    output += `  • Cache workflow status data\n`;
    output += `  • Optimize Temporal queries\n`;
  }

  if (successRate < 0.95) {
    output += `  • Investigate workflow failures (${((1 - successRate) * 100).toFixed(2)}% fail rate)\n`;
    output += `  • Review Temporal worker capacity\n`;
  }

  if (successRate > 0.98 && triggerP95 < 2000 && statusP95 < 300) {
    output += `  ✓ Orchestration system is production-ready\n`;
    output += `  • Can handle multiple concurrent workflows\n`;
    output += `  • Status tracking is fast and reliable\n`;
  }

  output += '\n' + '═'.repeat(60) + '\n';

  return output;
}
