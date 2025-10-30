# Testing Guide - AI Affiliate Empire

**Comprehensive testing documentation for developers**

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Test Structure](#test-structure)
3. [Running Tests](#running-tests)
4. [Writing Tests](#writing-tests)
5. [Test Coverage](#test-coverage)
6. [CI/CD Integration](#cicd-integration)
7. [Best Practices](#best-practices)

---

## Overview

The AI Affiliate Empire uses a comprehensive testing strategy:

- **Unit Tests**: Test individual functions and services
- **Integration Tests**: Test API endpoints and database operations
- **E2E Tests**: Test complete workflows end-to-end
- **Coverage Target**: 85%+ code coverage

### Testing Stack

- **Framework**: Jest
- **HTTP Testing**: Supertest
- **Database**: In-memory PostgreSQL for tests
- **Mocking**: Jest mocks + custom test utilities
- **Temporal Testing**: @temporalio/testing

---

## Test Structure

```
test/
├── unit/                      # Unit tests
│   ├── product/
│   │   ├── product-ranker.service.spec.ts
│   │   └── amazon.service.spec.ts
│   ├── analytics/
│   │   ├── roi-calculator.service.spec.ts
│   │   └── metrics-collector.service.spec.ts
│   └── temporal/
│       └── workflows/
│           └── daily-control-loop.spec.ts
├── integration/               # Integration tests
│   ├── product.controller.spec.ts
│   ├── analytics.controller.spec.ts
│   └── database/
│       └── prisma.integration.spec.ts
├── e2e/                      # End-to-end tests
│   ├── full-workflow.e2e-spec.ts
│   └── api.e2e-spec.ts
├── fixtures/                 # Test data
│   ├── products.fixture.ts
│   └── analytics.fixture.ts
└── utils/                    # Test utilities
    ├── test-db.ts
    └── mocks.ts
```

---

## Running Tests

### All Tests

```bash
# Run entire test suite
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Specific Test Types

```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# E2E tests only
npm run test:e2e
```

### Specific Test Files

```bash
# Run single file
npm test -- product-ranker.service.spec.ts

# Run tests matching pattern
npm test -- --testNamePattern="should rank products"

# Run tests in specific directory
npm test -- test/unit/product
```

### Debug Mode

```bash
# Run tests in debug mode
npm run test:debug

# Then attach debugger on port 9229
# In VS Code: Run "Attach to Jest" configuration
```

---

## Writing Tests

### Unit Test Example

```typescript
// test/unit/product/product-ranker.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ProductRanker } from '@/modules/product/services/product-ranker.service';
import { PrismaService } from '@/common/database/prisma.service';

describe('ProductRanker', () => {
  let service: ProductRanker;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductRanker,
        {
          provide: PrismaService,
          useValue: {
            product: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ProductRanker>(ProductRanker);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('rank', () => {
    it('should rank products by score', async () => {
      const mockProducts = [
        { id: '1', trendScore: 0.8, commission: 10 },
        { id: '2', trendScore: 0.6, commission: 15 },
      ];

      jest.spyOn(prisma.product, 'findMany').mockResolvedValue(mockProducts);

      const result = await service.rank(mockProducts);

      expect(result).toBeDefined();
      expect(result[0].id).toBe('2'); // Higher commission wins
      expect(prisma.product.findMany).toHaveBeenCalledTimes(1);
    });

    it('should handle empty array', async () => {
      const result = await service.rank([]);
      expect(result).toEqual([]);
    });

    it('should throw error on invalid data', async () => {
      await expect(service.rank(null)).rejects.toThrow();
    });
  });
});
```

### Integration Test Example

```typescript
// test/integration/product.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';

describe('ProductController (Integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /products', () => {
    it('should return products array', () => {
      return request(app.getHttpServer())
        .get('/products')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should filter by status', () => {
      return request(app.getHttpServer())
        .get('/products?status=ACTIVE')
        .expect(200)
        .expect((res) => {
          expect(res.body.every((p) => p.status === 'ACTIVE')).toBe(true);
        });
    });
  });

  describe('POST /products/sync', () => {
    it('should sync products', () => {
      return request(app.getHttpServer())
        .post('/products/sync')
        .send({ category: 'Electronics' })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('syncedCount');
        });
    });
  });
});
```

### E2E Test Example

```typescript
// test/e2e/full-workflow.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/common/database/prisma.service';

describe('Full Workflow (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('should complete product discovery to publishing workflow', async () => {
    // 1. Sync products
    const syncResult = await prisma.product.create({
      data: {
        title: 'Test Product',
        price: 99.99,
        commission: 10,
        affiliateUrl: 'https://example.com/product',
        networkId: 'test-network',
      },
    });

    expect(syncResult).toBeDefined();

    // 2. Generate content
    const content = await prisma.video.create({
      data: {
        productId: syncResult.id,
        status: 'PENDING',
        title: 'Test Video',
      },
    });

    expect(content).toBeDefined();

    // 3. Verify analytics
    const analytics = await prisma.productAnalytics.findMany({
      where: { productId: syncResult.id },
    });

    expect(analytics).toBeDefined();
  });
});
```

### Testing Temporal Workflows

```typescript
// test/unit/temporal/workflows/daily-control-loop.spec.ts
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker } from '@temporalio/worker';
import { dailyControlLoop } from '@/temporal/workflows/daily-control-loop';
import * as activities from '@/temporal/activities';

describe('Daily Control Loop Workflow', () => {
  let testEnv: TestWorkflowEnvironment;

  beforeAll(async () => {
    testEnv = await TestWorkflowEnvironment.createLocal();
  });

  afterAll(async () => {
    await testEnv?.teardown();
  });

  it('should complete workflow successfully', async () => {
    const { client, nativeConnection } = testEnv;

    const worker = await Worker.create({
      connection: nativeConnection,
      taskQueue: 'test-queue',
      workflowsPath: require.resolve('@/temporal/workflows'),
      activities,
    });

    await worker.runUntil(async () => {
      const handle = await client.workflow.start(dailyControlLoop, {
        taskQueue: 'test-queue',
        workflowId: 'test-workflow',
      });

      const result = await handle.result();
      expect(result).toBeDefined();
    });
  });
});
```

---

## Test Coverage

### Viewing Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# Open HTML report
open coverage/lcov-report/index.html
```

### Coverage Requirements

- **Overall**: 85%+ coverage
- **Statements**: 85%+
- **Branches**: 80%+
- **Functions**: 85%+
- **Lines**: 85%+

### Coverage Configuration

```json
// jest.config.js
{
  "coverageThreshold": {
    "global": {
      "statements": 85,
      "branches": 80,
      "functions": 85,
      "lines": 85
    }
  },
  "collectCoverageFrom": [
    "src/**/*.ts",
    "!src/**/*.spec.ts",
    "!src/**/*.e2e-spec.ts",
    "!src/main.ts"
  ]
}
```

---

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma Client
        run: npm run prisma:generate

      - name: Run migrations
        run: npm run prisma:migrate:dev
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test

      - name: Run tests
        run: npm run test:coverage
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

### Pre-commit Hooks

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run tests before commit
npm run test:unit

# Check coverage threshold
npm run test:coverage -- --passWithNoTests
```

---

## Best Practices

### 1. Test Organization

- **Group related tests**: Use `describe` blocks
- **Clear test names**: Use "should..." pattern
- **One assertion per test**: Keep tests focused
- **Arrange-Act-Assert**: Structure tests clearly

```typescript
describe('ProductRanker', () => {
  describe('rank', () => {
    it('should rank products by commission', async () => {
      // Arrange
      const products = createMockProducts();

      // Act
      const result = await service.rank(products);

      // Assert
      expect(result[0].commission).toBeGreaterThan(result[1].commission);
    });
  });
});
```

### 2. Mocking External Dependencies

```typescript
// Mock external API
jest.mock('@/modules/product/services/amazon.service');

// Mock with custom implementation
const mockAmazonService = {
  searchProducts: jest.fn().mockResolvedValue([...mockProducts]),
};
```

### 3. Test Data Management

```typescript
// Use fixtures for consistent test data
// test/fixtures/products.fixture.ts
export const productFixtures = {
  basic: {
    id: '1',
    title: 'Test Product',
    price: 99.99,
    commission: 10,
  },
  premium: {
    id: '2',
    title: 'Premium Product',
    price: 199.99,
    commission: 20,
  },
};
```

### 4. Async Testing

```typescript
// Use async/await
it('should fetch products', async () => {
  const result = await service.getProducts();
  expect(result).toBeDefined();
});

// Test error cases
it('should handle errors', async () => {
  await expect(service.invalidOperation()).rejects.toThrow();
});
```

### 5. Database Testing

```typescript
// Clean up after each test
afterEach(async () => {
  await prisma.product.deleteMany();
  await prisma.video.deleteMany();
});

// Use transactions for isolation
it('should rollback on error', async () => {
  await prisma.$transaction(async (tx) => {
    // Test operations
  });
});
```

### 6. Performance Testing

```typescript
it('should complete within time limit', async () => {
  const start = Date.now();

  await service.expensiveOperation();

  const duration = Date.now() - start;
  expect(duration).toBeLessThan(1000); // 1 second
});
```

---

## Troubleshooting

### Common Issues

**1. Tests timing out**:
```typescript
// Increase timeout for specific test
it('long running test', async () => {
  // test code
}, 10000); // 10 second timeout
```

**2. Database connection issues**:
```bash
# Ensure test database exists
createdb test_ai_affiliate_empire

# Check DATABASE_URL in test env
echo $DATABASE_URL
```

**3. Module resolution errors**:
```bash
# Clear Jest cache
npm test -- --clearCache

# Reinstall dependencies
rm -rf node_modules
npm install
```

**4. Coverage not updating**:
```bash
# Remove old coverage data
rm -rf coverage

# Run with --no-cache
npm run test:coverage -- --no-cache
```

---

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing NestJS](https://docs.nestjs.com/fundamentals/testing)
- [Supertest](https://github.com/visionmedia/supertest)
- [Temporal Testing](https://docs.temporal.io/typescript/testing)

---

**Last Updated**: 2025-10-31
**Status**: Active
**Maintainer**: Development Team
