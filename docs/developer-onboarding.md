# Developer Onboarding Guide - AI Affiliate Empire

**Last Updated**: 2025-11-01
**Status**: Complete
**Target Audience**: New developers joining the project

---

## Table of Contents

1. [Welcome](#welcome)
2. [Development Environment Setup](#development-environment-setup)
3. [Project Structure Overview](#project-structure-overview)
4. [Key Technologies](#key-technologies)
5. [Development Workflow](#development-workflow)
6. [Common Tasks](#common-tasks)
7. [Testing Requirements](#testing-requirements)
8. [Code Review Process](#code-review-process)
9. [Deployment](#deployment)
10. [Getting Help](#getting-help)

---

## Welcome

Welcome to the AI Affiliate Empire development team! This guide will help you get up and running quickly.

### What You're Building

A fully autonomous AI-powered affiliate marketing system that:
- Discovers and ranks products
- Generates AI content (videos, blogs)
- Publishes to multiple platforms
- Tracks analytics and optimizes ROI
- Self-heals and scales automatically

### Project Status

✅ Production Ready (10/10)
✅ 80%+ Test Coverage
✅ Docker Deployment
✅ Authentication & Security
✅ Compliance (GDPR, FTC)

---

## Development Environment Setup

### Prerequisites

**Required**:
- Node.js 18+ (`node --version`)
- Docker & Docker Compose (`docker --version`)
- Git (`git --version`)
- VS Code or your preferred editor

**Recommended**:
- Postman or Insomnia (API testing)
- MongoDB Compass (database viewing)
- TablePlus (PostgreSQL client)

### Step 1: Clone Repository

```bash
git clone https://github.com/magic-ai-trading-bot/ai-affiliate-empire.git
cd ai-affiliate-empire
```

### Step 2: Install Dependencies

```bash
# Install backend dependencies
npm install

# Generate Prisma client
npm run prisma:generate
```

### Step 3: Set Up Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

**Minimum Required Variables**:
```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/affiliate_empire"

# Required APIs
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."

# Optional (use mock mode in development)
OPENAI_MOCK_MODE=true
ANTHROPIC_MOCK_MODE=true
ELEVENLABS_MOCK_MODE=true
PIKALABS_MOCK_MODE=true
AMAZON_MOCK_MODE=true
```

### Step 4: Start Docker Services

```bash
# Start PostgreSQL, Redis, Temporal, and other services
docker-compose up -d

# Verify services are running
docker-compose ps
```

### Step 5: Set Up Database

```bash
# Run migrations
npm run prisma:migrate:dev

# Seed database with test data (optional)
npm run prisma:seed
```

### Step 6: Start Development Server

```bash
# Start NestJS backend in watch mode
npm run start:dev

# In another terminal, start the Next.js dashboard
cd dashboard
npm install
npm run dev
```

**Access**:
- API: http://localhost:3000
- API Docs: http://localhost:3000/api
- Dashboard: http://localhost:3001
- Temporal UI: http://localhost:8233

---

## Project Structure Overview

```
ai-affiliate-empire/
├── .claude/                    # Claude Code configuration
│   ├── agents/                # AI agents for development
│   ├── commands/              # Slash command definitions
│   └── workflows/             # Development workflows
├── .github/                   # GitHub Actions CI/CD
│   └── workflows/            # Automated tests and deployments
├── .opencode/                # Open Code CLI agents
├── apps/
│   ├── blog/                 # Next.js blog application
│   └── dashboard/            # Next.js admin dashboard
├── database/                 # Database documentation
│   ├── OPTIMIZATION_GUIDE.md
│   └── IMPLEMENTATION-CHECKLIST.md
├── docs/                     # Complete documentation
├── plans/                    # Implementation plans and reports
├── prisma/                   # Database schema
│   ├── schema.prisma        # Data models
│   ├── migrations/          # Migration history
│   └── seed.ts              # Database seeding
├── src/                      # Backend source code
│   ├── common/              # Shared utilities
│   │   ├── circuit-breaker/ # Resilience patterns
│   │   ├── config/          # Configuration
│   │   ├── database/        # Database setup
│   │   ├── encryption/      # Data encryption
│   │   ├── exceptions/      # Custom errors
│   │   ├── health/          # Health checks
│   │   └── logging/         # Winston logger
│   ├── modules/             # Feature modules
│   │   ├── analytics/       # Analytics & ROI tracking
│   │   ├── content/         # Content generation
│   │   ├── optimizer/       # Self-optimization
│   │   ├── orchestrator/    # Temporal workflows
│   │   ├── product/         # Product discovery
│   │   ├── publisher/       # Multi-platform publishing
│   │   ├── reports/         # Reporting system
│   │   └── video/           # Video generation
│   ├── temporal/            # Temporal workflows
│   │   ├── activities/      # Activity definitions
│   │   ├── workflows/       # Workflow logic
│   │   ├── client.ts        # Temporal client
│   │   └── worker.ts        # Temporal worker
│   ├── app.module.ts        # Root module
│   └── main.ts              # Application entry
├── test/                    # Test suites
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   ├── e2e/                # End-to-end tests
│   ├── fixtures/           # Test data
│   └── utils/              # Test helpers
├── docker-compose.yml      # Local development stack
├── Dockerfile              # Backend container
├── nest-cli.json          # NestJS configuration
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
├── CLAUDE.md              # Claude Code instructions
└── README.md              # Project overview
```

---

## Key Technologies

### Backend Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | 18+ | JavaScript runtime |
| NestJS | ^11 | Backend framework |
| TypeScript | ^5 | Type safety |
| Prisma | ^6 | Database ORM |
| Temporal | ^1.13 | Workflow orchestration |
| Winston | ^3 | Structured logging |
| Axios | ^1.13 | HTTP client |

### Frontend Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | ^15 | React framework |
| React | ^18 | UI library |
| Tailwind CSS | ^4 | Styling |
| TypeScript | ^5 | Type safety |

### External Services

| Service | Purpose | Mock Available |
|---------|---------|-----------------|
| OpenAI GPT-4 | Script generation | ✅ |
| Anthropic Claude | Blog generation | ✅ |
| ElevenLabs | Voice synthesis | ✅ |
| Pika Labs | Video generation | ✅ |
| DALL-E 3 | Thumbnails | ✅ |
| Amazon PA-API | Product discovery | ✅ |
| PostgreSQL | Data storage | ✅ |
| Redis | Caching & queuing | ✅ |

---

## Development Workflow

### 1. Feature Development Process

```bash
# 1. Create feature branch
git checkout -b feature/your-feature-name

# 2. Make changes
# - Write code
# - Write tests
# - Update documentation

# 3. Test locally
npm test
npm run test:integration

# 4. Commit with conventional commits
git add .
git commit -m "feat: add new feature"
# Types: feat, fix, docs, refactor, test, ci

# 5. Push and create PR
git push origin feature/your-feature-name
```

### 2. Commit Message Format

**Format**: `<type>(<scope>): <description>`

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `test`: Adding tests
- `ci`: CI/CD changes
- `chore`: Maintenance tasks

**Examples**:
```bash
feat(product): add Amazon PA-API integration
fix(publisher): handle YouTube rate limits
docs(api): update endpoint documentation
refactor(analytics): optimize ROI calculation
test(optimizer): add A/B testing unit tests
```

### 3. Branch Strategy

- **main**: Production code (CI/CD pipeline runs automatically)
- **develop**: Integration branch (for staging)
- **feature/**: Feature branches (feature/*, hotfix/*)
- **bugfix/**: Bug fixes (bugfix/*)

---

## Common Tasks

### Task: Create a New API Endpoint

**1. Define the route in a controller**:
```typescript
// src/modules/product/product.controller.ts
@Controller('products')
export class ProductController {
  @Get('trending')
  async getTrendingProducts() {
    return this.productService.getTrending();
  }
}
```

**2. Implement the service**:
```typescript
// src/modules/product/product.service.ts
@Injectable()
export class ProductService {
  async getTrending() {
    return this.prisma.product.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { trendScore: 'desc' },
      take: 10
    });
  }
}
```

**3. Write tests**:
```typescript
// test/unit/product/product.service.test.ts
describe('ProductService', () => {
  it('should return trending products', async () => {
    const result = await service.getTrending();
    expect(result).toHaveLength(10);
  });
});
```

**4. Update API documentation**:
- Add endpoint to `/docs/api-reference.md`
- Include request/response examples

### Task: Add a New Database Model

**1. Update Prisma schema**:
```prisma
// prisma/schema.prisma
model ProductReview {
  id String @id @default(cuid())
  productId String
  product Product @relation(fields: [productId], references: [id])
  rating Int
  content String
  createdAt DateTime @default(now())

  @@index([productId])
}
```

**2. Create migration**:
```bash
npm run prisma:migrate:dev -- --name add_product_reviews
```

**3. Generate client**:
```bash
npm run prisma:generate
```

**4. Update services to use new model**

### Task: Integrate a New API

**1. Create a service**:
```typescript
// src/modules/external/newapi.service.ts
@Injectable()
export class NewApiService {
  private readonly apiKey = this.config.get('NEW_API_KEY');

  async fetchData(params: any) {
    // Implementation
  }
}
```

**2. Add configuration**:
```env
# .env
NEW_API_KEY=your-key
NEW_API_MOCK_MODE=true
```

**3. Add to module**:
```typescript
@Module({
  providers: [NewApiService],
  exports: [NewApiService]
})
export class ExternalModule {}
```

**4. Write tests**:
```typescript
// Use jest.mock() for API calls
jest.mock('src/modules/external/newapi.service');
```

### Task: Write Tests

```typescript
// test/unit/product/product-ranker.test.ts
describe('ProductRanker', () => {
  let service: ProductRankerService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ProductRankerService]
    }).compile();

    service = module.get(ProductRankerService);
  });

  it('should rank products by score', () => {
    const products = [
      { title: 'A', trendScore: 80, profitScore: 70 },
      { title: 'B', trendScore: 60, profitScore: 90 }
    ];

    const ranked = service.rank(products);
    expect(ranked[0].title).toBe('A');
  });
});
```

---

## Testing Requirements

### Test Coverage Requirements

- **Minimum**: 80% overall coverage
- **Critical modules**: 90%+ coverage
- **Controllers**: All happy paths + error cases
- **Services**: All business logic paths

### Run Tests

```bash
# Run all tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# With coverage report
npm run test:coverage

# Watch mode (auto-run on file changes)
npm test -- --watch
```

### Test File Structure

```
test/
├── unit/
│   └── product/
│       ├── product.service.test.ts
│       └── product-ranker.service.test.ts
├── integration/
│   └── api/
│       └── products.e2e.test.ts
├── fixtures/
│   ├── product.fixture.ts
│   └── user.fixture.ts
└── utils/
    ├── test-database.ts
    └── mock-factories.ts
```

---

## Code Review Process

### Before Creating a PR

1. **Run tests locally**:
   ```bash
   npm test
   npm run test:coverage
   ```

2. **Check code quality**:
   ```bash
   npm run lint
   npm run format
   ```

3. **Update documentation**:
   - API docs if endpoints changed
   - Code comments for complex logic
   - Database docs if schema changed

4. **Self-review**:
   - Does code follow standards in `/docs/code-standards.md`?
   - Are all edge cases handled?
   - Are error messages helpful?
   - Is performance acceptable?

### PR Template

```markdown
## Description
Brief summary of changes.

## Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] Documentation update
- [ ] Performance improvement

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Manual testing done

## Documentation
- [ ] README updated
- [ ] API docs updated
- [ ] Code comments added
- [ ] Database docs updated

## Checklist
- [ ] Code follows style guide
- [ ] No console.log statements
- [ ] No hardcoded values
- [ ] Error handling complete
```

---

## Deployment

### Local Testing

```bash
# Build Docker image
docker build -t affiliate-empire:latest .

# Run in Docker
docker run -p 3000:3000 --env-file .env affiliate-empire:latest
```

### Staging Deployment

```bash
# Staging uses GitHub Actions on push to develop branch
# Check .github/workflows/deploy-staging.yml
git push origin develop
```

### Production Deployment

```bash
# Production deploys on push to main branch
# Triggered by semantic-release after tests pass
git push origin main
```

**Important**: Always use pull requests and have code reviewed before merging to main.

---

## Common Errors & Solutions

### Error: "Database connection failed"

**Solution**:
```bash
# Check if PostgreSQL is running
docker-compose ps

# Check connection string in .env
echo $DATABASE_URL

# Rebuild containers
docker-compose down -v
docker-compose up -d
```

### Error: "OPENAI_API_KEY is required"

**Solution**:
```bash
# Use mock mode in development
OPENAI_MOCK_MODE=true

# Or provide real API key
OPENAI_API_KEY=sk-...
```

### Error: "Port 3000 already in use"

**Solution**:
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3002 npm run start:dev
```

### Error: "Test timeout"

**Solution**:
```typescript
// Increase timeout for specific test
it('should complete workflow', async () => {
  // test code
}, 30000); // 30 seconds
```

---

## Getting Help

### Documentation

1. **API Documentation**: `/docs/api-reference.md`
2. **Code Standards**: `/docs/code-standards.md`
3. **System Architecture**: `/docs/system-architecture.md`
4. **Testing Guide**: `/docs/testing-guide.md`
5. **Deployment Guide**: `/docs/deployment-guide.md`

### GitHub Issues

- Check existing issues before creating new ones
- Use issue templates for consistent reporting
- Include reproduction steps for bugs

### Team Communication

- **Slack**: #ai-affiliate-empire
- **GitHub Discussions**: For architectural questions
- **Weekly Standup**: Tuesday 10am

### Code Examples

Browse existing implementations:
- Product module: `src/modules/product/`
- Content module: `src/modules/content/`
- Publisher module: `src/modules/publisher/`

All modules follow consistent patterns and best practices.

---

## Next Steps

1. **Complete setup**: Follow steps 1-6 above
2. **Read architecture**: Review `/docs/system-architecture.md`
3. **Check code standards**: Review `/docs/code-standards.md`
4. **Pick a task**: Contact team lead for initial task
5. **Make a PR**: Follow code review process
6. **Celebrate**: You're now a contributor!

---

## Quick Reference

### Useful Commands

```bash
# Development
npm run start:dev          # Start with hot reload
npm run build              # Build for production
npm run start:prod         # Run production build

# Database
npm run prisma:generate    # Generate Prisma client
npm run prisma:migrate:dev # Create and run migration
npm run prisma:studio      # Open Prisma Studio UI
npm run prisma:seed        # Seed database

# Testing
npm test                   # Run all tests
npm run test:coverage      # Coverage report
npm test -- --watch       # Watch mode

# Code Quality
npm run lint              # Run ESLint
npm run format            # Format code with Prettier
npm run type-check        # TypeScript check

# Docker
docker-compose up -d      # Start services
docker-compose down       # Stop services
docker-compose ps         # List services
```

### Important Files

| File | Purpose |
|------|---------|
| `.env.example` | Environment variables template |
| `.eslintrc.js` | Linting rules |
| `.prettierrc` | Code formatting config |
| `jest.config.js` | Testing configuration |
| `tsconfig.json` | TypeScript configuration |

---

**Welcome to the team! Happy coding!**

For questions or issues, reach out to the team on Slack or create an issue on GitHub.

**Last Updated**: 2025-11-01
**Version**: 1.0.0
**Maintainer**: Development Team
