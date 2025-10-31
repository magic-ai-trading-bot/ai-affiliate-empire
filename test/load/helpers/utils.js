/**
 * K6 Load Testing Utilities
 * Helper functions for load tests
 */

import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import http from 'k6/http';
import { THINK_TIME, RETRY_CONFIG } from '../config.js';

/**
 * Custom metrics
 */
export const errorRate = new Rate('errors');
export const successRate = new Rate('success');
export const customTrend = (name) => new Trend(name);
export const customCounter = (name) => new Counter(name);

/**
 * Sleep for a random duration (simulate realistic user behavior)
 * @param {number} min - Minimum sleep time in seconds
 * @param {number} max - Maximum sleep time in seconds
 */
export function randomSleep(min = THINK_TIME.MIN, max = THINK_TIME.MAX) {
  const duration = min + Math.random() * (max - min);
  sleep(duration);
}

/**
 * Get random item from array
 * @param {Array} array - Array to pick from
 * @returns {*} Random item
 */
export function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Generate random integer between min and max (inclusive)
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random integer
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Check HTTP response and record metrics
 * @param {Object} response - HTTP response object
 * @param {string} name - Name for the check
 * @param {Object} checks - Object with check conditions
 * @returns {boolean} True if all checks pass
 */
export function checkResponse(response, name, checks = {}) {
  const defaultChecks = {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'response has body': (r) => r.body && r.body.length > 0,
    ...checks,
  };

  const result = check(response, defaultChecks, { name });

  // Record error/success rates
  errorRate.add(!result);
  successRate.add(result);

  return result;
}

/**
 * Perform HTTP GET request with error handling
 * @param {string} url - URL to request
 * @param {Object} params - Request parameters
 * @returns {Object} HTTP response
 */
export function httpGet(url, params = {}) {
  try {
    const response = http.get(url, params);
    return response;
  } catch (error) {
    console.error(`Error in GET ${url}: ${error}`);
    errorRate.add(1);
    return null;
  }
}

/**
 * Perform HTTP POST request with error handling
 * @param {string} url - URL to request
 * @param {Object} payload - Request body
 * @param {Object} params - Request parameters
 * @returns {Object} HTTP response
 */
export function httpPost(url, payload, params = {}) {
  try {
    const response = http.post(url, JSON.stringify(payload), params);
    return response;
  } catch (error) {
    console.error(`Error in POST ${url}: ${error}`);
    errorRate.add(1);
    return null;
  }
}

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delay - Initial delay in milliseconds
 * @returns {*} Function result
 */
export function retry(fn, maxRetries = RETRY_CONFIG.MAX_RETRIES, delay = RETRY_CONFIG.RETRY_DELAY) {
  let lastError;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries) {
        const backoffDelay = delay * Math.pow(2, i);
        sleep(backoffDelay / 1000); // Convert to seconds for k6
      }
    }
  }

  throw lastError;
}

/**
 * Execute a group of requests
 * @param {string} name - Group name
 * @param {Function} fn - Function to execute
 */
export function testGroup(name, fn) {
  group(name, () => {
    try {
      fn();
    } catch (error) {
      console.error(`Error in group ${name}: ${error}`);
      errorRate.add(1);
    }
  });
}

/**
 * Parse JSON response safely
 * @param {Object} response - HTTP response
 * @returns {Object|null} Parsed JSON or null
 */
export function parseJson(response) {
  try {
    return JSON.parse(response.body);
  } catch (error) {
    console.error(`Error parsing JSON: ${error}`);
    return null;
  }
}

/**
 * Create URL with query parameters
 * @param {string} baseUrl - Base URL
 * @param {Object} params - Query parameters
 * @returns {string} URL with query string
 */
export function buildUrl(baseUrl, params = {}) {
  const url = new URL(baseUrl);
  Object.keys(params).forEach((key) => {
    url.searchParams.append(key, params[key]);
  });
  return url.toString();
}

/**
 * Generate realistic test data for product
 * @returns {Object} Product data
 */
export function generateProductData() {
  return {
    asin: `B${randomInt(10, 99)}${randomAlphaNum(6)}`,
    title: `Test Product ${randomInt(1000, 9999)}`,
    price: randomInt(10, 500),
    category: randomItem(['Electronics', 'Home', 'Fashion', 'Sports']),
    commission: randomInt(5, 20) / 100, // 5-20%
  };
}

/**
 * Generate random alphanumeric string
 * @param {number} length - String length
 * @returns {string} Random string
 */
export function randomAlphaNum(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate random email
 * @returns {string} Random email
 */
export function randomEmail() {
  return `test${randomInt(1000, 9999)}@loadtest.local`;
}

/**
 * Format duration in human-readable format
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration
 */
export function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(2)}m`;
}

/**
 * Check if response is successful (2xx status code)
 * @param {Object} response - HTTP response
 * @returns {boolean} True if successful
 */
export function isSuccess(response) {
  return response && response.status >= 200 && response.status < 300;
}

/**
 * Extract error message from response
 * @param {Object} response - HTTP response
 * @returns {string} Error message
 */
export function getErrorMessage(response) {
  if (!response) return 'No response';

  const body = parseJson(response);
  if (body && body.message) return body.message;
  if (body && body.error) return body.error;

  return `HTTP ${response.status}: ${response.status_text}`;
}

/**
 * Log test metrics
 * @param {string} name - Metric name
 * @param {Object} data - Metric data
 */
export function logMetric(name, data) {
  console.log(`[METRIC] ${name}:`, JSON.stringify(data));
}

/**
 * Create performance summary
 * @param {Array} results - Array of test results
 * @returns {Object} Performance summary
 */
export function createSummary(results) {
  const total = results.length;
  const successful = results.filter((r) => r.success).length;
  const failed = total - successful;
  const durations = results.map((r) => r.duration).filter((d) => d !== undefined);

  return {
    total,
    successful,
    failed,
    successRate: (successful / total) * 100,
    avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
    minDuration: Math.min(...durations),
    maxDuration: Math.max(...durations),
  };
}

/**
 * Assert condition and log error if failed
 * @param {boolean} condition - Condition to check
 * @param {string} message - Error message
 */
export function assert(condition, message) {
  if (!condition) {
    console.error(`[ASSERTION FAILED] ${message}`);
    errorRate.add(1);
  }
}

export default {
  errorRate,
  successRate,
  customTrend,
  customCounter,
  randomSleep,
  randomItem,
  randomInt,
  checkResponse,
  httpGet,
  httpPost,
  retry,
  testGroup,
  parseJson,
  buildUrl,
  generateProductData,
  randomAlphaNum,
  randomEmail,
  formatDuration,
  isSuccess,
  getErrorMessage,
  logMetric,
  createSummary,
  assert,
};
