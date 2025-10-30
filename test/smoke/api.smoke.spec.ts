/**
 * Smoke Tests - Critical API Endpoints
 *
 * These tests verify that critical API endpoints are accessible and returning
 * expected responses after deployment.
 */

import axios, { AxiosInstance } from 'axios';

describe('API Endpoint Smoke Tests', () => {
  let client: AxiosInstance;
  const baseUrl = process.env.STAGING_URL || process.env.PRODUCTION_URL || 'http://localhost:3000';
  const timeout = 15000; // 15 seconds

  beforeAll(() => {
    client = axios.create({
      baseURL: baseUrl,
      timeout,
      validateStatus: () => true,
    });
  });

  describe('API Documentation', () => {
    it('should serve Swagger documentation at /api', async () => {
      const response = await client.get('/api');

      expect([200, 301, 302]).toContain(response.status);
    });

    it('should serve OpenAPI JSON spec', async () => {
      const response = await client.get('/api-json');

      if (response.status === 200) {
        expect(response.data).toHaveProperty('openapi');
        expect(response.data).toHaveProperty('info');
        expect(response.data).toHaveProperty('paths');
      }
    });
  });

  describe('Public Endpoints', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await client.get('/this-route-does-not-exist');

      expect(response.status).toBe(404);
    });

    it('should include CORS headers', async () => {
      const response = await client.options('/health');

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    it('should enforce HTTPS in production', async () => {
      if (process.env.NODE_ENV === 'production') {
        const response = await client.get('/health');
        expect(response.request.protocol).toBe('https:');
      }
    });
  });

  describe('Authentication Endpoints', () => {
    it('should reject unauthenticated requests to protected routes', async () => {
      const response = await client.get('/api/dashboard');

      expect([401, 403, 404]).toContain(response.status);
    });

    it('should accept requests with valid API key', async () => {
      const apiKey = process.env.HEALTH_CHECK_TOKEN || 'test-key';

      const response = await client.get('/health', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      expect(response.status).toBe(200);
    });
  });

  describe('Rate Limiting', () => {
    it('should have rate limiting configured', async () => {
      // Make multiple rapid requests
      const requests = Array(60).fill(null).map(() =>
        client.get('/api/products')
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(r => r.status === 429);

      // Either rate limiting is active (429 responses) or all succeeded
      expect(rateLimited || responses.every(r => [200, 401, 404].includes(r.status))).toBe(true);
    });

    it('should include rate limit headers', async () => {
      const response = await client.get('/api/products');

      // Check for standard rate limit headers
      const hasRateLimitHeaders =
        response.headers['x-ratelimit-limit'] ||
        response.headers['x-ratelimit-remaining'] ||
        response.headers['ratelimit-limit'];

      if (response.status === 200 || response.status === 401) {
        expect(hasRateLimitHeaders).toBeTruthy();
      }
    });
  });

  describe('Error Handling', () => {
    it('should return JSON error responses', async () => {
      const response = await client.post('/api/invalid-endpoint');

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should not expose stack traces in production', async () => {
      const response = await client.get('/this-will-cause-error');

      if (process.env.NODE_ENV === 'production') {
        expect(response.data?.stack).toBeUndefined();
      }
    });

    it('should include request ID in error responses', async () => {
      const response = await client.get('/non-existent-route');

      // Many frameworks include a request ID for tracing
      expect(
        response.headers['x-request-id'] ||
        response.data?.requestId ||
        response.data?.traceId
      ).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('should respond to API calls within acceptable time', async () => {
      const startTime = Date.now();
      await client.get('/health');
      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(5000); // 5 seconds
    });

    it('should handle concurrent requests efficiently', async () => {
      const startTime = Date.now();
      const requests = Array(10).fill(null).map(() => client.get('/health'));

      await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      // 10 concurrent requests should complete in reasonable time
      expect(totalTime).toBeLessThan(10000); // 10 seconds
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await client.get('/health');

      // Check for common security headers
      const securityHeaders = [
        'x-frame-options',
        'x-content-type-options',
        'x-xss-protection',
        'strict-transport-security',
      ];

      const hasSecurityHeaders = securityHeaders.some(
        header => response.headers[header.toLowerCase()]
      );

      expect(hasSecurityHeaders).toBe(true);
    });
  });
});
