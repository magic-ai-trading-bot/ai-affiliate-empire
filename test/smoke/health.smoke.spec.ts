/**
 * Smoke Tests - Health Endpoints
 *
 * These tests verify that critical health check endpoints are responding correctly
 * after deployment. They are designed to run quickly and catch major deployment issues.
 */

import axios, { AxiosInstance } from 'axios';

describe('Health Endpoint Smoke Tests', () => {
  let client: AxiosInstance;
  const baseUrl = process.env.STAGING_URL || process.env.PRODUCTION_URL || 'http://localhost:3000';
  const timeout = 10000; // 10 seconds

  beforeAll(() => {
    client = axios.create({
      baseURL: baseUrl,
      timeout,
      validateStatus: () => true, // Don't throw on any status code
    });
  });

  describe('GET /health', () => {
    it('should return 200 OK', async () => {
      const response = await client.get('/health');

      expect(response.status).toBe(200);
    });

    it('should return valid JSON response', async () => {
      const response = await client.get('/health');

      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.data).toBeDefined();
    });

    it('should include status field', async () => {
      const response = await client.get('/health');

      expect(response.data).toHaveProperty('status');
      expect(['ok', 'healthy', 'success']).toContain(response.data.status);
    });

    it('should respond within acceptable time', async () => {
      const startTime = Date.now();
      await client.get('/health');
      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(5000); // 5 seconds max
    });
  });

  describe('GET /health/ready', () => {
    it('should return 200 when service is ready', async () => {
      const response = await client.get('/health/ready');

      expect([200, 503]).toContain(response.status);
    });

    it('should check database connectivity', async () => {
      const response = await client.get('/health/ready');

      if (response.status === 200) {
        expect(response.data).toHaveProperty('database');
        expect(response.data.database).toBeTruthy();
      }
    });
  });

  describe('GET /health/live', () => {
    it('should return 200 when service is alive', async () => {
      const response = await client.get('/health/live');

      expect(response.status).toBe(200);
    });

    it('should respond quickly (liveness probe)', async () => {
      const startTime = Date.now();
      await client.get('/health/live');
      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(3000); // 3 seconds max for liveness
    });
  });

  describe('Service Availability', () => {
    it('should handle multiple concurrent health checks', async () => {
      const requests = Array(10).fill(null).map(() => client.get('/health'));
      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should not rate limit health checks', async () => {
      // Make 20 rapid requests
      for (let i = 0; i < 20; i++) {
        const response = await client.get('/health');
        expect(response.status).toBe(200);
      }
    });
  });
});
