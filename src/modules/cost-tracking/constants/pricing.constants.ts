/**
 * Pricing constants for all service providers
 * Updated: 2025-10-31
 * Source: Official provider pricing pages
 */

export const PRICING = {
  OPENAI: {
    'gpt-4-turbo': {
      input: 0.01 / 1000, // $0.01 per 1K tokens
      output: 0.03 / 1000, // $0.03 per 1K tokens
    },
    'gpt-4': {
      input: 0.03 / 1000,
      output: 0.06 / 1000,
    },
    'gpt-3.5-turbo': {
      input: 0.0005 / 1000,
      output: 0.0015 / 1000,
    },
    'gpt-4o': {
      input: 0.005 / 1000,
      output: 0.015 / 1000,
    },
    'gpt-4o-mini': {
      input: 0.00015 / 1000,
      output: 0.0006 / 1000,
    },
  },
  CLAUDE: {
    'claude-3.5-sonnet': {
      input: 0.003 / 1000,
      output: 0.015 / 1000,
    },
    'claude-3-opus': {
      input: 0.015 / 1000,
      output: 0.075 / 1000,
    },
    'claude-3-sonnet': {
      input: 0.003 / 1000,
      output: 0.015 / 1000,
    },
    'claude-3-haiku': {
      input: 0.00025 / 1000,
      output: 0.00125 / 1000,
    },
  },
  ELEVENLABS: {
    characterCost: 0.30 / 1000, // $0.30 per 1K characters
    // Pro subscription: $99/month for 500K characters
    subscriptionMonthly: 99,
    subscriptionCharacters: 500000,
  },
  PIKA: {
    // $28/month for 2000 videos (60s each)
    subscriptionMonthly: 28,
    videosPerMonth: 2000,
    avgDuration: 60, // seconds
    // Cost per second: $28 / (2000 videos * 60 seconds)
    secondCost: 28 / (2000 * 60), // ~$0.000233 per second
  },
  DALLE: {
    '1024x1024': 0.04,
    '1024x1792': 0.08,
    '1792x1024': 0.08,
    '512x512': 0.02,
  },
  STORAGE: {
    // S3 standard storage pricing
    s3: 0.023 / (1024 * 1024 * 1024), // $0.023 per GB/month
    // Cloudflare R2 (no egress fees)
    r2: 0.015 / (1024 * 1024 * 1024), // $0.015 per GB/month
  },
  COMPUTE: {
    // Fly.io estimated costs
    flyio: 50 / (30 * 24 * 60), // $50/month to per-minute
    // Temporal Cloud (if used)
    temporal: 0.00002, // $0.00002 per workflow action
  },
  DATABASE: {
    // PostgreSQL storage
    storage: 0.115 / (1024 * 1024 * 1024), // $0.115 per GB/month
    // Compute time (if applicable)
    computeHour: 0.10, // $0.10 per hour
  },
} as const;

/**
 * Budget configuration defaults
 */
export const BUDGET_DEFAULTS = {
  MONTHLY_LIMIT: 412, // $412/month
  DAILY_LIMIT: 14, // ~$14/day (412/30)
  WARNING_THRESHOLD: 80, // 80% = $329.60
  CRITICAL_THRESHOLD: 100, // 100% = $412
  EMERGENCY_THRESHOLD: 150, // 150% = $618
} as const;

/**
 * Cost estimation templates for different content types
 */
export const CONTENT_COST_ESTIMATES = {
  VIDEO_SHORT: {
    script: {
      service: 'OPENAI',
      model: 'gpt-4-turbo',
      estimatedTokens: 1500, // input + output
      estimatedCost: 0.10,
    },
    voice: {
      service: 'ELEVENLABS',
      estimatedCharacters: 300,
      estimatedCost: 0.09,
    },
    video: {
      service: 'PIKA',
      estimatedDuration: 60,
      estimatedCost: 0.014,
    },
    thumbnail: {
      service: 'DALLE',
      resolution: '1024x1024',
      estimatedCost: 0.04,
    },
    total: 0.27, // Total cost per video
  },
  BLOG_POST: {
    content: {
      service: 'CLAUDE',
      model: 'claude-3.5-sonnet',
      estimatedTokens: 3000,
      estimatedCost: 0.05,
    },
    total: 0.05,
  },
} as const;

/**
 * Alert message templates
 */
export const ALERT_MESSAGES = {
  WARNING: {
    subject: '⚠️ Budget Warning: 80% Threshold Reached',
    template: (currentSpend: number, limit: number) =>
      `Your current spending of $${currentSpend.toFixed(2)} has reached 80% of your monthly budget ($${limit.toFixed(2)}). Consider reviewing your usage.`,
  },
  CRITICAL: {
    subject: '🚨 Budget Critical: 100% Threshold Reached',
    template: (currentSpend: number, limit: number) =>
      `Your current spending of $${currentSpend.toFixed(2)} has reached your monthly budget limit of $${limit.toFixed(2)}. Immediate action required.`,
  },
  EMERGENCY: {
    subject: '🔴 Budget Emergency: 150% Threshold Exceeded!',
    template: (currentSpend: number, limit: number) =>
      `EMERGENCY: Your spending of $${currentSpend.toFixed(2)} has exceeded 150% of your budget ($${limit.toFixed(2)}). Emergency actions have been triggered.`,
  },
} as const;

/**
 * Provider names for display
 */
export const PROVIDER_NAMES = {
  openai: 'OpenAI',
  anthropic: 'Anthropic (Claude)',
  elevenlabs: 'ElevenLabs',
  pika: 'Pika Labs',
  dalle: 'DALL-E',
  s3: 'AWS S3',
  r2: 'Cloudflare R2',
  flyio: 'Fly.io',
  temporal: 'Temporal',
  postgres: 'PostgreSQL',
} as const;

/**
 * Service display names
 */
export const SERVICE_NAMES = {
  OPENAI: 'OpenAI',
  CLAUDE: 'Claude',
  ELEVENLABS: 'ElevenLabs',
  PIKA: 'Pika Labs',
  DALLE: 'DALL-E',
  S3: 'Storage',
  DATABASE: 'Database',
  COMPUTE: 'Compute',
  OTHER: 'Other',
} as const;
