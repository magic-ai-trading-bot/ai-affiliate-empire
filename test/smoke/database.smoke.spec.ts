/**
 * Smoke Tests - Database Connectivity
 *
 * These tests verify that the database connection is working correctly
 * and that critical tables exist and are accessible.
 */

import axios, { AxiosInstance } from 'axios';

describe('Database Connectivity Smoke Tests', () => {
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

  describe('Database Health', () => {
    it('should connect to database successfully', async () => {
      const response = await client.get('/health/ready');

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('database');
      expect(response.data.database).toBeTruthy();
    });

    it('should report database status in health check', async () => {
      const response = await client.get('/health/ready');

      if (response.status === 200 && response.data.database) {
        expect(response.data.database).toMatchObject({
          connected: true,
        });
      }
    });

    it('should handle database query within timeout', async () => {
      const startTime = Date.now();
      await client.get('/health/ready');
      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(10000); // 10 seconds max
    });
  });

  describe('Database Migrations', () => {
    it('should have all migrations applied', async () => {
      const response = await client.get('/health/migrations');

      // If migrations endpoint exists, verify it
      if (response.status === 200) {
        expect(response.data).toHaveProperty('applied');
        expect(response.data).toHaveProperty('pending');
        expect(response.data.pending).toEqual([]);
      }
    });

    it('should report migration status', async () => {
      const response = await client.get('/health/ready');

      if (response.status === 200 && response.data.migrations) {
        expect(response.data.migrations.upToDate).toBe(true);
      }
    });
  });

  describe('Critical Tables Access', () => {
    it('should be able to query products table', async () => {
      const response = await client.get('/api/products', {
        headers: {
          'Authorization': `Bearer ${process.env.HEALTH_CHECK_TOKEN || 'test'}`,
        },
      });

      // Should either succeed or be unauthorized, but not have DB errors
      expect([200, 401, 403, 404]).toContain(response.status);

      if (response.status >= 500) {
        expect(response.data?.message).not.toMatch(/database/i);
      }
    });

    it('should be able to query analytics table', async () => {
      const response = await client.get('/api/analytics', {
        headers: {
          'Authorization': `Bearer ${process.env.HEALTH_CHECK_TOKEN || 'test'}`,
        },
      });

      expect([200, 401, 403, 404]).toContain(response.status);

      if (response.status >= 500) {
        expect(response.data?.message).not.toMatch(/database/i);
      }
    });
  });

  describe('Database Connection Pool', () => {
    it('should handle multiple concurrent database queries', async () => {
      const requests = Array(5).fill(null).map(() =>
        client.get('/health/ready')
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect([200, 503]).toContain(response.status);
      });

      // At least some should succeed
      const successCount = responses.filter(r => r.status === 200).length;
      expect(successCount).toBeGreaterThan(0);
    });

    it('should recover from connection pool exhaustion', async () => {
      // Make many concurrent requests
      const heavyLoad = Array(20).fill(null).map(() =>
        client.get('/health/ready')
      );

      await Promise.allSettled(heavyLoad);

      // After heavy load, should still respond
      const response = await client.get('/health/ready');
      expect([200, 503]).toContain(response.status);
    });
  });

  describe('Database Performance', () => {
    it('should execute simple queries quickly', async () => {
      const startTime = Date.now();
      const response = await client.get('/health/ready');
      const queryTime = Date.now() - startTime;

      if (response.status === 200) {
        expect(queryTime).toBeLessThan(5000); // 5 seconds max
      }
    });

    it('should maintain connection across multiple requests', async () => {
      // Make several sequential requests
      for (let i = 0; i < 5; i++) {
        const response = await client.get('/health/ready');
        expect(response.status).toBe(200);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    });
  });

  describe('Database Error Handling', () => {
    it('should gracefully handle database unavailability', async () => {
      const response = await client.get('/health/ready');

      if (response.status === 503) {
        expect(response.data).toHaveProperty('database');
        expect(response.data.database).toBe(false);
      }
    });

    it('should not expose database credentials in errors', async () => {
      const response = await client.get('/health/ready');

      const responseText = JSON.stringify(response.data);

      // Should not contain common password patterns
      expect(responseText).not.toMatch(/password/i);
      expect(responseText).not.toMatch(/DATABASE_URL/);
      expect(responseText).not.toMatch(/postgresql:\/\//);
    });
  });
});
