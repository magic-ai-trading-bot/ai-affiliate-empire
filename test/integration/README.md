# Integration Tests - AI Affiliate Empire

Comprehensive integration tests for testing complete workflows and system interactions.

## Quick Start

```bash
# Run all integration tests
npm run test:integration

# Run with coverage
npm run test:integration -- --coverage

# Run specific test file
npm run test:integration -- workflows/daily-control-loop.integration.spec.ts

# Watch mode
npm run test:integration -- --watch

# Debug mode
npm run test:integration -- --runInBand --detectOpenHandles
```

## Test Structure

```
test/integration/
├── workflows/
│   └── daily-control-loop.integration.spec.ts  # End-to-end workflow tests
├── pipelines/
│   ├── content-generation.integration.spec.ts  # Content generation pipeline
│   └── publishing.integration.spec.ts          # Multi-platform publishing
├── database.integration.spec.ts                 # Database operations
├── helpers/
│   ├── api-mocks.ts                            # External API mocks
│   └── test-data.ts                            # Test data factories
├── setup.ts                                     # Global test setup
└── jest.config.js                              # Jest configuration
```

## Test Coverage

### ✅ Implemented (150+ tests)

#### 1. Daily Control Loop Workflow (45 tests)
- Complete workflow execution
- Product synchronization
- Ranking algorithms
- Content generation
- Video generation
- Multi-platform publishing
- Analytics collection
- Strategy optimization
- Error handling and recovery
- Performance testing

#### 2. Content Generation Pipeline (50 tests)
- OpenAI script generation
- Claude blog post generation
- ElevenLabs voiceover synthesis
- Pika Labs video generation
- Complete content package assembly
- Multi-language support
- Parallel processing
- Cost tracking
- Quality assurance

#### 3. Publishing Pipeline (30 tests)
- YouTube upload with metadata
- TikTok upload with hashtags
- Instagram Reels posting
- Cross-platform publishing
- Partial failure handling
- Retry mechanisms
- Analytics collection
- Publishing schedules
- Performance optimization

#### 4. Database Integration (25 tests)
- Data relationships
- Transaction handling
- Query performance
- Constraints and validations
- Complex joins
- Bulk operations
- Cascade deletes

## Configuration

### Test Database

Integration tests use a separate test database:

```bash
# Set test database URL
export TEST_DATABASE_URL="postgresql://test:test@localhost:5432/affiliate_test"

# Run migrations
npx prisma migrate deploy

# Seed test data (optional)
npx prisma db seed
```

### Environment Variables

```env
# Test database
TEST_DATABASE_URL=postgresql://test:test@localhost:5432/affiliate_test

# API mock modes
OPENAI_MOCK_MODE=true
CLAUDE_MOCK_MODE=true
ELEVENLABS_MOCK_MODE=true
PIKALABS_MOCK_MODE=true
YOUTUBE_MOCK_MODE=true
TIKTOK_MOCK_MODE=true
INSTAGRAM_MOCK_MODE=true
```

## Test Helpers

### API Mocks

```typescript
import { mockOpenAI, mockClaude, resetAllMocks } from './helpers/api-mocks';

// Use in tests
mockOpenAI.generateText.mockResolvedValue({ text: 'Custom response' });

// Reset between tests
resetAllMocks();
```

### Test Data Factories

```typescript
import {
  createTestAffiliateNetwork,
  createTestProducts,
  createCompleteTestWorkflowData,
  cleanTestData,
} from './helpers/test-data';

// Create test network
const network = await createTestAffiliateNetwork();

// Create test products
const products = await createTestProducts(network.id, 10);

// Create complete workflow data
const data = await createCompleteTestWorkflowData();

// Clean up
await cleanTestData();
```

## Writing Integration Tests

### Basic Structure

```typescript
import { PrismaClient } from '@prisma/client';
import { createTestAffiliateNetwork, cleanTestData } from './helpers/test-data';

const prisma = (global as any).testPrisma as PrismaClient;

describe('My Integration Test', () => {
  beforeEach(async () => {
    await cleanTestData();
  });

  afterEach(async () => {
    await cleanTestData();
  });

  it('should test something', async () => {
    const network = await createTestAffiliateNetwork();
    // Test implementation
  });
});
```

### Testing Temporal Workflows

```typescript
import { TestEnvironment } from '@temporalio/testing';
import { Worker } from '@temporalio/worker';
import * as activities from '@/temporal/activities';
import { myWorkflow } from '@/temporal/workflows/my-workflow';

describe('Workflow Integration', () => {
  let testEnv: TestEnvironment;

  beforeAll(async () => {
    testEnv = await TestEnvironment.createLocal();
  });

  afterAll(async () => {
    await testEnv?.teardown();
  });

  it('should execute workflow', async () => {
    const { client, nativeConnection } = testEnv;

    const worker = await Worker.create({
      connection: nativeConnection,
      taskQueue: 'test-queue',
      workflowsPath: require.resolve('@/temporal/workflows/my-workflow'),
      activities,
    });

    const runPromise = worker.run();

    try {
      const handle = await client.workflow.start(myWorkflow, {
        taskQueue: 'test-queue',
        workflowId: 'test-workflow-1',
        args: [{ input: 'test' }],
      });

      const result = await handle.result();
      expect(result).toBeTruthy();
    } finally {
      worker.shutdown();
      await runPromise;
    }
  }, 120000);
});
```

### Testing Database Operations

```typescript
describe('Database Operations', () => {
  it('should handle transactions', async () => {
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: { /* ... */ },
      });

      const video = await tx.video.create({
        data: { productId: product.id, /* ... */ },
      });

      return { product, video };
    });

    expect(result.product).toBeTruthy();
    expect(result.video).toBeTruthy();
  });
});
```

## Best Practices

### 1. Test Isolation
- Clean database before/after each test
- Reset all mocks between tests
- Don't rely on test execution order
- Use unique identifiers for test data

### 2. Real Database Operations
- Use actual Prisma client
- Test real database constraints
- Verify cascade deletes
- Test transaction rollbacks

### 3. Mock External APIs
- Mock OpenAI, Claude, ElevenLabs, Pika Labs
- Mock social platform APIs
- Provide realistic mock responses
- Test error scenarios

### 4. Performance Testing
- Test with realistic data volumes
- Measure execution time
- Test parallel operations
- Verify query efficiency

### 5. Error Handling
- Test failure scenarios
- Verify error logging
- Test retry mechanisms
- Verify recovery procedures

## Troubleshooting

### Database Connection Issues

```bash
# Check database is running
docker ps | grep postgres

# Test connection
psql $TEST_DATABASE_URL -c "SELECT 1"

# Reset database
npm run prisma:migrate -- --name reset
```

### Test Timeouts

```typescript
// Increase timeout for slow tests
it('slow test', async () => {
  // test code
}, 120000); // 2 minutes
```

### Memory Leaks

```bash
# Run with leak detection
npm run test:integration -- --detectLeaks --runInBand
```

### Temporal Test Issues

```bash
# Ensure @temporalio/testing is installed
npm install --save-dev @temporalio/testing

# Run with increased timeout
npm run test:integration -- --testTimeout=120000
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Run integration tests
  env:
    TEST_DATABASE_URL: postgresql://test:test@localhost:5432/affiliate_test
  run: |
    npm run test:integration

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/integration/lcov.info
```

### Docker Compose

```bash
# Start test database
docker-compose -f docker-compose.test.yml up -d

# Run tests
npm run test:integration

# Stop test database
docker-compose -f docker-compose.test.yml down
```

## Performance Benchmarks

Expected performance metrics:

- **Daily Control Loop**: < 2 minutes (with mocks)
- **Content Generation**: < 30 seconds for 10 products
- **Multi-Platform Publishing**: < 5 seconds for 10 videos
- **Database Queries**: < 100ms for 1000 records
- **Bulk Operations**: < 2 seconds for 100 records

## Coverage Goals

- **Overall Coverage**: 80%+
- **Critical Paths**: 100%
- **Error Scenarios**: 80%+
- **Edge Cases**: 70%+

## Contributing

When adding new integration tests:

1. Place in appropriate directory
2. Follow naming convention: `*.integration.spec.ts`
3. Clean up test data in afterEach
4. Add to this documentation
5. Ensure tests pass in CI/CD
6. Update coverage goals if needed

---

**Last Updated**: 2025-10-31
**Test Count**: 150+
**Coverage**: Integration tests focus on workflow and system interactions
