import * as Joi from 'joi';

export const validationSchema = Joi.object({
  // Environment
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),

  // Database
  DATABASE_URL: Joi.string().required(),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),

  // OpenAI
  OPENAI_API_KEY: Joi.string().required(),
  OPENAI_MODEL: Joi.string().default('gpt-4-turbo-preview'),

  // Anthropic Claude
  ANTHROPIC_API_KEY: Joi.string().required(),
  ANTHROPIC_MODEL: Joi.string().default('claude-3-5-sonnet-20241022'),

  // ElevenLabs
  ELEVENLABS_API_KEY: Joi.string().required(),
  ELEVENLABS_VOICE_ID: Joi.string().required(),

  // Pika Labs
  PIKALABS_API_KEY: Joi.string().required(),
  PIKALABS_API_URL: Joi.string().default('https://api.pikalabs.com/v1'),

  // Amazon Associates
  AMAZON_ACCESS_KEY: Joi.string().optional(),
  AMAZON_SECRET_KEY: Joi.string().optional(),
  AMAZON_PARTNER_TAG: Joi.string().optional(),
  AMAZON_REGION: Joi.string().default('us-east-1'),

  // YouTube
  YOUTUBE_CLIENT_ID: Joi.string().optional(),
  YOUTUBE_CLIENT_SECRET: Joi.string().optional(),
  YOUTUBE_REDIRECT_URI: Joi.string().optional(),

  // TikTok
  TIKTOK_CLIENT_KEY: Joi.string().optional(),
  TIKTOK_CLIENT_SECRET: Joi.string().optional(),

  // Instagram
  INSTAGRAM_ACCESS_TOKEN: Joi.string().optional(),
  INSTAGRAM_BUSINESS_ACCOUNT_ID: Joi.string().optional(),

  // Cloudflare R2
  R2_ACCOUNT_ID: Joi.string().optional(),
  R2_ACCESS_KEY_ID: Joi.string().optional(),
  R2_SECRET_ACCESS_KEY: Joi.string().optional(),
  R2_BUCKET_NAME: Joi.string().default('ai-affiliate-videos'),
  R2_PUBLIC_URL: Joi.string().optional(),

  // Temporal
  TEMPORAL_ADDRESS: Joi.string().default('localhost:7233'),
  TEMPORAL_NAMESPACE: Joi.string().default('default'),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug', 'verbose')
    .default('info'),

  // Security
  JWT_SECRET: Joi.string().min(32).required(),
  ENCRYPTION_KEY: Joi.string().min(32).required(),

  // Rate Limiting
  RATE_LIMIT_TTL: Joi.number().default(60),
  RATE_LIMIT_MAX: Joi.number().default(100),

  // CORS
  CORS_ORIGIN: Joi.string().default('http://localhost:3000'),

  // Optional
  SENTRY_DSN: Joi.string().allow('').optional(),
  DISCORD_WEBHOOK_URL: Joi.string().allow('').optional(),
});
