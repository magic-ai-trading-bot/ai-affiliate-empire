/**
 * K6 Load Testing Configuration
 * Centralized configuration for all load test scenarios
 */

// Environment-based configuration
export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
export const ENVIRONMENT = __ENV.ENVIRONMENT || 'local';

// Test duration constants (in seconds)
export const DURATION = {
  WARM_UP: 30,
  SHORT: 60 * 5, // 5 minutes
  MEDIUM: 60 * 10, // 10 minutes
  LONG: 60 * 30, // 30 minutes
  SOAK: 60 * 120, // 2 hours
};

// Virtual user (VU) constants
export const VU_COUNT = {
  BASELINE: 10,
  LIGHT: 25,
  MEDIUM: 50,
  HEAVY: 100,
  STRESS: 200,
};

// Performance thresholds - acceptance criteria
export const THRESHOLDS = {
  // HTTP request duration (95th percentile should be below 500ms)
  http_req_duration: ['p(95)<500', 'p(99)<1000'],

  // HTTP request failure rate (should be less than 1%)
  http_req_failed: ['rate<0.01'],

  // Request rate (requests per second)
  http_reqs: ['rate>10'],

  // Iteration duration (overall test iteration)
  iteration_duration: ['p(95)<5000'],
};

// API endpoints
export const ENDPOINTS = {
  // Health check
  HEALTH: '/health',
  METRICS: '/metrics',

  // Products
  PRODUCTS_LIST: '/products',
  PRODUCTS_TOP: '/products/top',
  PRODUCTS_SYNC: '/products/sync',
  PRODUCT_BY_ID: (id) => `/products/${id}`,

  // Analytics
  ANALYTICS_OVERVIEW: '/analytics/overview',
  ANALYTICS_REVENUE: '/analytics/revenue',
  ANALYTICS_TOP_PRODUCTS: '/analytics/top-products',
  ANALYTICS_PLATFORM_COMPARISON: '/analytics/platform-comparison',

  // Orchestrator
  ORCHESTRATOR_START: '/orchestrator/start',
  ORCHESTRATOR_STATUS: '/orchestrator/status',

  // Content
  CONTENT_GENERATE_SCRIPT: '/content/generate-script',

  // Video
  VIDEO_GENERATE: '/video/generate',

  // Publisher
  PUBLISHER_PUBLISH: '/publisher/publish',

  // Optimizer
  OPTIMIZER_ANALYZE: '/optimizer/analyze',
  OPTIMIZER_OPTIMIZE: '/optimizer/optimize',
};

// Load test scenarios configuration
export const SCENARIOS = {
  baseline: {
    executor: 'constant-vus',
    vus: VU_COUNT.BASELINE,
    duration: `${DURATION.SHORT}s`,
  },

  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: `${DURATION.MEDIUM}s`, target: VU_COUNT.HEAVY },
      { duration: `${DURATION.SHORT}s`, target: VU_COUNT.HEAVY },
      { duration: `${DURATION.SHORT}s`, target: VU_COUNT.STRESS },
      { duration: `${DURATION.SHORT}s`, target: 0 },
    ],
  },

  spike: {
    executor: 'ramping-vus',
    startVUs: VU_COUNT.BASELINE,
    stages: [
      { duration: '10s', target: VU_COUNT.BASELINE },
      { duration: '10s', target: VU_COUNT.HEAVY }, // Sudden spike
      { duration: `${DURATION.SHORT}s`, target: VU_COUNT.HEAVY },
      { duration: '10s', target: VU_COUNT.BASELINE },
    ],
  },

  soak: {
    executor: 'constant-vus',
    vus: VU_COUNT.MEDIUM,
    duration: `${DURATION.SOAK}s`,
  },
};

// Request options
export const REQUEST_OPTIONS = {
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: '30s',
  tags: {
    environment: ENVIRONMENT,
  },
};

// Metrics collection configuration
export const METRICS_CONFIG = {
  // Custom metrics names
  CUSTOM_METRICS: {
    PRODUCT_SYNC_DURATION: 'product_sync_duration',
    CONTENT_GENERATION_DURATION: 'content_generation_duration',
    VIDEO_GENERATION_DURATION: 'video_generation_duration',
    ORCHESTRATOR_WORKFLOW_DURATION: 'orchestrator_workflow_duration',
  },

  // Metric tags
  TAGS: {
    ENDPOINT: 'endpoint',
    METHOD: 'method',
    STATUS: 'status',
    ERROR_TYPE: 'error_type',
  },
};

// Database pool monitoring thresholds
export const DB_POOL_THRESHOLDS = {
  MAX_CONNECTIONS: 100,
  WARNING_THRESHOLD: 80, // 80% of max
  CRITICAL_THRESHOLD: 95, // 95% of max
};

// Memory monitoring thresholds (in MB)
export const MEMORY_THRESHOLDS = {
  WARNING: 512,
  CRITICAL: 1024,
};

// CPU monitoring thresholds (percentage)
export const CPU_THRESHOLDS = {
  WARNING: 70,
  CRITICAL: 90,
};

// Expected daily load
export const DAILY_LOAD = {
  TOTAL_VIDEOS: 1000,
  PRODUCTS_SYNCED: 100,
  ANALYTICS_QUERIES: 500,
  ORCHESTRATOR_WORKFLOWS: 10,
};

// Realistic test data
export const TEST_DATA = {
  PRODUCT_IDS: [
    'B09XYZ1234',
    'B08ABC5678',
    'B07DEF9012',
    'B06GHI3456',
    'B05JKL7890',
  ],

  PLATFORMS: ['youtube', 'tiktok', 'instagram', 'blog'],

  NICHES: ['tech', 'fitness', 'beauty', 'home', 'fashion'],

  LANGUAGES: ['en', 'vi', 'es'],
};

// Sleep/think time configuration (simulating user behavior)
export const THINK_TIME = {
  MIN: 1, // minimum 1 second
  MAX: 5, // maximum 5 seconds
};

// Retry configuration for failed requests
export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
};

// Report configuration
export const REPORT_CONFIG = {
  OUTPUT_DIR: './test/load/reports',
  HTML_REPORT: true,
  JSON_SUMMARY: true,
  CSV_EXPORT: true,
};

export default {
  BASE_URL,
  ENVIRONMENT,
  DURATION,
  VU_COUNT,
  THRESHOLDS,
  ENDPOINTS,
  SCENARIOS,
  REQUEST_OPTIONS,
  METRICS_CONFIG,
  DB_POOL_THRESHOLDS,
  MEMORY_THRESHOLDS,
  CPU_THRESHOLDS,
  DAILY_LOAD,
  TEST_DATA,
  THINK_TIME,
  RETRY_CONFIG,
  REPORT_CONFIG,
};
