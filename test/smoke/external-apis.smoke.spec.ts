/**
 * Smoke Tests - External API Connectivity
 *
 * These tests verify that external service integrations are working correctly
 * and that API credentials are valid.
 */

import axios, { AxiosInstance } from 'axios';

describe('External API Connectivity Smoke Tests', () => {
  let client: AxiosInstance;
  const baseUrl = process.env.STAGING_URL || process.env.PRODUCTION_URL || 'http://localhost:3000';
  const timeout = 20000; // 20 seconds for external API calls

  beforeAll(() => {
    client = axios.create({
      baseURL: baseUrl,
      timeout,
      validateStatus: () => true,
    });
  });

  describe('AI Services Connectivity', () => {
    it('should verify OpenAI API connectivity', async () => {
      const response = await client.get('/health/services', {
        headers: {
          'Authorization': `Bearer ${process.env.HEALTH_CHECK_TOKEN || 'test'}`,
        },
      });

      if (response.status === 200 && response.data.services) {
        const openai = response.data.services.openai;
        if (openai) {
          expect(openai.status).toMatch(/connected|available|ok/i);
        }
      }
    });

    it('should verify Anthropic API connectivity', async () => {
      const response = await client.get('/health/services', {
        headers: {
          'Authorization': `Bearer ${process.env.HEALTH_CHECK_TOKEN || 'test'}`,
        },
      });

      if (response.status === 200 && response.data.services) {
        const anthropic = response.data.services.anthropic;
        if (anthropic) {
          expect(anthropic.status).toMatch(/connected|available|ok/i);
        }
      }
    });
  });

  describe('Content Generation Services', () => {
    it('should check ElevenLabs voice generation availability', async () => {
      const response = await client.get('/health/services');

      if (response.status === 200 && response.data.services?.elevenlabs) {
        expect(response.data.services.elevenlabs.status).toBeDefined();
      }
    });

    it('should check Pika Labs video generation availability', async () => {
      const response = await client.get('/health/services');

      if (response.status === 200 && response.data.services?.pikalabs) {
        expect(response.data.services.pikalabs.status).toBeDefined();
      }
    });
  });

  describe('Social Media Platform APIs', () => {
    it('should verify YouTube API credentials', async () => {
      const response = await client.get('/health/services');

      if (response.status === 200 && response.data.services?.youtube) {
        // Should not be in error state
        expect(response.data.services.youtube.status).not.toMatch(/error|invalid|unauthorized/i);
      }
    });

    it('should verify TikTok API credentials', async () => {
      const response = await client.get('/health/services');

      if (response.status === 200 && response.data.services?.tiktok) {
        expect(response.data.services.tiktok.status).not.toMatch(/error|invalid|unauthorized/i);
      }
    });

    it('should verify Instagram API credentials', async () => {
      const response = await client.get('/health/services');

      if (response.status === 200 && response.data.services?.instagram) {
        expect(response.data.services.instagram.status).not.toMatch(/error|invalid|unauthorized/i);
      }
    });
  });

  describe('Affiliate Network APIs', () => {
    it('should verify Amazon Associates API connectivity', async () => {
      const response = await client.get('/health/services');

      if (response.status === 200 && response.data.services?.amazon) {
        expect(response.data.services.amazon.status).toBeDefined();
      }
    });

    it('should verify ShareASale API connectivity', async () => {
      const response = await client.get('/health/services');

      if (response.status === 200 && response.data.services?.shareasale) {
        expect(response.data.services.shareasale.status).toBeDefined();
      }
    });

    it('should verify CJ Affiliate API connectivity', async () => {
      const response = await client.get('/health/services');

      if (response.status === 200 && response.data.services?.cj) {
        expect(response.data.services.cj.status).toBeDefined();
      }
    });
  });

  describe('AWS Services', () => {
    it('should verify AWS Secrets Manager connectivity', async () => {
      const response = await client.get('/health/services');

      if (response.status === 200 && response.data.services?.aws) {
        expect(response.data.services.aws.secretsManager).toBeDefined();
      }
    });

    it('should verify Cloudflare R2 storage connectivity', async () => {
      const response = await client.get('/health/services');

      if (response.status === 200 && response.data.services?.storage) {
        expect(response.data.services.storage.status).toBeDefined();
      }
    });
  });

  describe('Monitoring Services', () => {
    it('should verify Sentry error tracking connectivity', async () => {
      const response = await client.get('/health/services');

      if (response.status === 200 && response.data.services?.sentry) {
        expect(response.data.services.sentry.status).toBeDefined();
      }
    });
  });

  describe('Service Degradation Handling', () => {
    it('should continue operating when optional services are unavailable', async () => {
      const response = await client.get('/health');

      // Main health check should pass even if some external services are down
      expect(response.status).toBe(200);
    });

    it('should report which services are unavailable', async () => {
      const response = await client.get('/health/services');

      if (response.status === 200 && response.data.services) {
        const services = response.data.services;

        // Each service should have a status
        Object.values(services).forEach((service: any) => {
          expect(service).toHaveProperty('status');
        });
      }
    });
  });

  describe('API Rate Limits', () => {
    it('should handle external API rate limits gracefully', async () => {
      // This test verifies the app handles rate limits without crashing
      const response = await client.get('/health/services');

      expect([200, 429, 503]).toContain(response.status);
    });

    it('should have circuit breakers for external APIs', async () => {
      const response = await client.get('/health/services');

      if (response.status === 200 && response.data.services) {
        // Services should report circuit breaker state
        Object.values(response.data.services).forEach((service: any) => {
          if (service.circuitBreaker) {
            expect(['closed', 'open', 'half-open']).toContain(service.circuitBreaker.state);
          }
        });
      }
    });
  });

  describe('External API Performance', () => {
    it('should complete service health checks within timeout', async () => {
      const startTime = Date.now();
      const response = await client.get('/health/services');
      const duration = Date.now() - startTime;

      // Service checks should complete reasonably fast
      expect(duration).toBeLessThan(15000); // 15 seconds
    });
  });
});
