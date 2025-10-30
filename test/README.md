# Test Suite - AI Affiliate Empire

Comprehensive test coverage for autonomous affiliate marketing system.

## Quick Start

```bash
# Install dependencies (if not already done)
npm install

# Run all tests
npm test

# Run specific test suites
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests
npm run test:e2e           # End-to-end API tests

# Development
npm run test:watch         # Watch mode
npm run test:coverage      # Generate coverage report

# Debugging
npm run test:debug         # Debug mode with inspector
```

## Directory Structure

```
test/
├── unit/                  # Unit tests for services
│   ├── product/           # Product ranking, discovery
│   ├── analytics/         # ROI, metrics, performance
│   └── temporal/          # Workflow tests
│       └── workflows/
├── integration/           # Integration tests (pending)
├── e2e/                   # End-to-end API tests
│   └── product.e2e-spec.ts
├── fixtures/              # Test data factories
│   ├── product.fixtures.ts
│   └── analytics.fixtures.ts
├── mocks/                 # Mock implementations
│   └── prisma.mock.ts
├── utils/                 # Test utilities
│   └── test-helpers.ts
├── setup.ts               # Global test setup
├── e2e-setup.ts          # E2E database cleanup
└── jest-e2e.json         # E2E configuration
```

## Test Coverage

### ✅ Implemented (51 tests)
- **ProductRanker Service**: 18 tests - Ranking algorithms, scoring logic
- **ROICalculator Service**: 15 tests - ROI calculations, cost analysis
- **Temporal Workflows**: 6 tests - Daily control loop, optimization
- **Product API Endpoints**: 12 tests - CRUD operations, validation

### ⚠️ Pending (High Priority)
- Content Generation (OpenAI, Claude, Script Generator)
- Video Services (PikaLabs, ElevenLabs, Video Composer)
- Publisher Services (YouTube, TikTok, Instagram)
- Optimizer Services (Strategy, Auto-scaling, A/B Testing)
- Analytics Services (Metrics Collector, Performance Analyzer)
- Reports Module (Weekly Reports)
- Temporal Activities
- Integration Tests

## Writing Tests

### Unit Test Example

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { YourService } from '@/modules/your-module/your.service';

describe('YourService', () => {
  let service: YourService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [YourService],
    }).compile();

    service = module.get<YourService>(YourService);
  });

  it('should do something', () => {
    const result = service.doSomething();
    expect(result).toBe('expected');
  });
});
```

### E2E Test Example

```typescript
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '@/app.module';

describe('YourController (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/your-endpoint (GET)', () => {
    return request(app.getHttpServer())
      .get('/your-endpoint')
      .expect(200)
      .expect('expected response');
  });
});
```

## Test Utilities

### Random Data Generation
```typescript
import { randomString, randomPrice, randomCommission } from './utils/test-helpers';

const productName = randomString(20);
const price = randomPrice();        // $10-$510
const commission = randomCommission(); // 1-16%
```

### Mock Factories
```typescript
import { createMockProduct, createMockProducts } from './fixtures/product.fixtures';

const product = createMockProduct({ title: 'Custom Title' });
const products = createMockProducts(10);
```

### Prisma Mock
```typescript
import { MockPrismaService } from './mocks/prisma.mock';

const module = await Test.createTestingModule({
  providers: [
    YourService,
    { provide: PrismaService, useClass: MockPrismaService },
  ],
}).compile();
```

## Configuration

### Coverage Thresholds
Configured in `jest.config.js`:
- Branches: 80%
- Functions: 80%
- Lines: 80%
- Statements: 80%

### Test Timeout
- Unit tests: 30s (default)
- E2E tests: 60s

### Path Aliases
- `@/` → `src/`
- `@modules/` → `src/modules/`
- `@common/` → `src/common/`
- `@temporal/` → `src/temporal/`

## CI/CD Integration

### GitHub Actions (Recommended)
```yaml
- name: Run tests
  run: npm run test:coverage

- name: Check coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

## Database Setup for E2E Tests

### Option 1: PostgreSQL (Recommended)
```bash
# Set test database URL
export TEST_DATABASE_URL="postgresql://test:test@localhost:5432/affiliate_test"

# Run migrations
npx prisma migrate deploy

# Run E2E tests
npm run test:e2e
```

### Option 2: Docker
```bash
# Start test database
docker run -d \
  --name affiliate-test-db \
  -e POSTGRES_PASSWORD=test \
  -e POSTGRES_DB=affiliate_test \
  -p 5433:5432 \
  postgres:14

# Run tests
TEST_DATABASE_URL="postgresql://postgres:test@localhost:5433/affiliate_test" \
  npm run test:e2e
```

## Troubleshooting

### Tests timing out
Increase timeout in test file:
```typescript
jest.setTimeout(60000); // 60 seconds
```

### Database connection issues
Check:
1. PostgreSQL is running
2. TEST_DATABASE_URL is set
3. Database migrations are applied

### Module not found errors
Check:
1. Path aliases in `jest.config.js`
2. tsconfig.json paths match
3. Run `npm install`

### Temporal workflow tests failing
Ensure:
1. @temporalio/testing is installed
2. Worker is properly configured
3. Activity mocks return complete objects

## Best Practices

1. **Test Naming**: Use descriptive test names
   - ✅ `should calculate ROI correctly for profitable product`
   - ❌ `test1`

2. **AAA Pattern**: Arrange, Act, Assert
   ```typescript
   // Arrange
   const input = createMockProduct();

   // Act
   const result = service.process(input);

   // Assert
   expect(result).toBe('expected');
   ```

3. **Test Independence**: Each test should be isolated
   - Use `beforeEach` for setup
   - Clean up in `afterEach`
   - Don't rely on test execution order

4. **Mock External Dependencies**:
   - Database (Prisma)
   - External APIs (OpenAI, Pika Labs, etc.)
   - File system operations
   - Network requests

5. **Test Both Paths**:
   - Happy path (success)
   - Error path (failures)
   - Edge cases (null, undefined, extremes)

## Resources

- [Jest Documentation](https://jestjs.io/)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Temporal Testing](https://docs.temporal.io/typescript/testing)
- [Supertest](https://github.com/ladjs/supertest)

## Contributing

1. Write tests for new features
2. Ensure tests pass: `npm test`
3. Check coverage: `npm run test:coverage`
4. Aim for 80%+ coverage
5. Update this README if adding new test patterns

---

**Last Updated**: 2025-10-31
**Coverage**: ~40% (Target: 80%)
**Total Tests**: 51
