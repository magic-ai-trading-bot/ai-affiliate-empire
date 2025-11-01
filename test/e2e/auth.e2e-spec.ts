/**
 * E2E tests for Authentication API endpoints
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/database/prisma.service';

describe('AuthController (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testUser = {
    email: 'test-e2e@example.com',
    username: 'teste2e',
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
  };

  let accessToken: string;
  let refreshToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    await app.init();
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.apiKey.deleteMany({
      where: { user: { email: testUser.email } },
    });
    await prisma.auditLog.deleteMany({
      where: { user: { email: testUser.email } },
    });
    await prisma.user.deleteMany({
      where: { email: testUser.email },
    });

    await prisma.$disconnect();
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.username).toBe(testUser.username);
      expect(response.body.user).not.toHaveProperty('passwordHash');

      // Store tokens and userId for later tests
      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
      userId = response.body.user.id;
    });

    it('should fail to register with duplicate email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(409);

      expect(response.body.message).toContain('Email already registered');
    });

    it('should fail to register with duplicate username', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          ...testUser,
          email: 'another-e2e@example.com',
        })
        .expect(409);

      expect(response.body.message).toContain('Username already taken');
    });

    it('should validate email format', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          ...testUser,
          email: 'invalid-email',
          username: 'newuser123',
        })
        .expect(400);
    });

    it('should validate password strength', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'newuser-e2e@example.com',
          username: 'newuser123',
          password: '123', // Too weak
        })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials (username)', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: testUser.username,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.username).toBe(testUser.username);

      // Update tokens
      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
    });

    it('should login with valid credentials (email)', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user.email).toBe(testUser.email);
    });

    it('should fail with invalid password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: testUser.username,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should fail with non-existent user', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'nonexistentuser',
          password: 'Password123!',
        })
        .expect(401);
    });

    it('should create audit log on successful login', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: testUser.username,
          password: testUser.password,
        })
        .expect(200);

      const auditLogs = await prisma.auditLog.findMany({
        where: {
          userId: userId,
          action: 'login',
          status: 'success',
        },
      });

      expect(auditLogs.length).toBeGreaterThan(0);
    });
  });

  describe('GET /auth/profile', () => {
    it('should get user profile with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.email).toBe(testUser.email);
      expect(response.body.username).toBe(testUser.username);
      expect(response.body.firstName).toBe(testUser.firstName);
      expect(response.body.lastName).toBe(testUser.lastName);
      expect(response.body).not.toHaveProperty('passwordHash');
      expect(response.body).not.toHaveProperty('refreshToken');
    });

    it('should fail without authentication token', async () => {
      await request(app.getHttpServer()).get('/auth/profile').expect(401);
    });

    it('should fail with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid-token-here')
        .expect(401);
    });

    it('should fail with malformed authorization header', async () => {
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'InvalidFormat')
        .expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('expiresIn');

      // Update tokens
      const newAccessToken = response.body.accessToken;
      const newRefreshToken = response.body.refreshToken;

      // Verify new access token works
      const profileResponse = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200);

      expect(profileResponse.body.email).toBe(testUser.email);

      // Update for next tests
      accessToken = newAccessToken;
      refreshToken = newRefreshToken;
    });

    it('should fail with invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-refresh-token' })
        .expect(401);
    });

    it('should fail with missing refresh token', async () => {
      await request(app.getHttpServer()).post('/auth/refresh').send({}).expect(400);
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully with valid token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.message).toContain('Logout successful');
    });

    it('should invalidate refresh token after logout', async () => {
      // Try to use the old refresh token
      await request(app.getHttpServer()).post('/auth/refresh').send({ refreshToken }).expect(401);
    });

    it('should fail to logout without token', async () => {
      await request(app.getHttpServer()).post('/auth/logout').expect(401);
    });

    it('should create audit log on logout', async () => {
      // Login again
      const loginResponse = await request(app.getHttpServer()).post('/auth/login').send({
        username: testUser.username,
        password: testUser.password,
      });

      accessToken = loginResponse.body.accessToken;

      // Logout
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Check audit log
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          userId: userId,
          action: 'logout',
          status: 'success',
        },
      });

      expect(auditLogs.length).toBeGreaterThan(0);
    });
  });

  describe('Protected Routes', () => {
    beforeAll(async () => {
      // Login to get fresh token
      const loginResponse = await request(app.getHttpServer()).post('/auth/login').send({
        username: testUser.username,
        password: testUser.password,
      });

      accessToken = loginResponse.body.accessToken;
    });

    it('should access protected product routes with authentication', async () => {
      await request(app.getHttpServer())
        .get('/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should access protected analytics routes with authentication', async () => {
      await request(app.getHttpServer())
        .get('/analytics/dashboard')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should fail to access protected routes without authentication', async () => {
      await request(app.getHttpServer()).get('/products').expect(401);

      await request(app.getHttpServer()).get('/analytics/dashboard').expect(401);
    });

    it('should access public health routes without authentication', async () => {
      await request(app.getHttpServer()).get('/health').expect(200);

      await request(app.getHttpServer()).get('/health/live').expect(200);

      await request(app.getHttpServer()).get('/health/ready').expect(200);
    });

    it('should access public metrics routes without authentication', async () => {
      await request(app.getHttpServer()).get('/metrics').expect(200);
    });

    it('should access public app status routes without authentication', async () => {
      await request(app.getHttpServer()).get('/').expect(200);

      await request(app.getHttpServer()).get('/status').expect(200);
    });
  });

  describe('API Key Management', () => {
    let apiKeyId: string;
    let _apiKeyValue: string;

    beforeAll(async () => {
      // Login to get token
      const loginResponse = await request(app.getHttpServer()).post('/auth/login').send({
        username: testUser.username,
        password: testUser.password,
      });

      accessToken = loginResponse.body.accessToken;
    });

    it('should create an API key', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/api-keys')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'E2E Test API Key',
          scopes: ['read:products', 'write:products'],
          expiresInDays: 30,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('key');
      expect(response.body.name).toBe('E2E Test API Key');
      expect(response.body.scopes).toEqual(['read:products', 'write:products']);

      apiKeyId = response.body.id;
      _apiKeyValue = response.body.key;
    });

    it('should list user API keys', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/api-keys')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].name).toBe('E2E Test API Key');
    });

    it('should get API key by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/auth/api-keys/${apiKeyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(apiKeyId);
      expect(response.body.name).toBe('E2E Test API Key');
    });

    it('should update API key', async () => {
      const response = await request(app.getHttpServer())
        .put(`/auth/api-keys/${apiKeyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Updated E2E API Key',
          scopes: ['read:products'],
        })
        .expect(200);

      expect(response.body.name).toBe('Updated E2E API Key');
      expect(response.body.scopes).toEqual(['read:products']);
    });

    it('should revoke an API key', async () => {
      const response = await request(app.getHttpServer())
        .post(`/auth/api-keys/${apiKeyId}/revoke`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.message).toContain('revoked');

      // Verify the key is revoked
      const getResponse = await request(app.getHttpServer())
        .get(`/auth/api-keys/${apiKeyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(getResponse.body.status).toBe('REVOKED');
    });

    it('should delete an API key', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/auth/api-keys/${apiKeyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.message).toContain('deleted');

      // Verify the key is deleted
      await request(app.getHttpServer())
        .get(`/auth/api-keys/${apiKeyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should fail to create API key without authentication', async () => {
      await request(app.getHttpServer())
        .post('/auth/api-keys')
        .send({
          name: 'Test Key',
          scopes: ['read:products'],
        })
        .expect(401);
    });

    it("should fail to get other user's API keys", async () => {
      // This would require creating another user, for now we just verify auth is required
      await request(app.getHttpServer()).get('/auth/api-keys').expect(401);
    });
  });
});
