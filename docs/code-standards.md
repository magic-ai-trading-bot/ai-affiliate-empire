# Code Standards - AI Affiliate Empire

**Last Updated**: 2025-10-31
**Status**: Active

## General Principles

### Core Philosophy
- **YAGNI**: You Aren't Gonna Need It - avoid over-engineering
- **KISS**: Keep It Simple, Stupid - prefer simple solutions
- **DRY**: Don't Repeat Yourself - eliminate code duplication
- **SOLID**: Single responsibility, Open/closed, Liskov substitution, Interface segregation, Dependency inversion

### File Organization
- **File Size Limit**: Max 500 lines per file
- **Module Structure**: One primary export per file
- **Naming**: Descriptive, follows TypeScript conventions
- **Location**: Group by feature, not by type

## TypeScript Standards

### Type Safety
```typescript
// ✅ Good - Explicit types
interface Product {
  id: string;
  title: string;
  price: number;
  commission: number;
}

function rankProduct(product: Product): number {
  return product.commission * product.price;
}

// ❌ Bad - Any types
function rankProduct(product: any): any {
  return product.commission * product.price;
}
```

### Naming Conventions
```typescript
// Interfaces: PascalCase
interface AffiliateNetwork {}

// Classes: PascalCase
class ProductRanker {}

// Functions: camelCase
function calculateROI() {}

// Constants: UPPER_SNAKE_CASE
const MAX_VIDEOS_PER_DAY = 50;

// Enums: PascalCase
enum VideoStatus {
  Pending = 'PENDING',
  Processing = 'PROCESSING',
  Published = 'PUBLISHED',
}
```

### Async/Await
```typescript
// ✅ Good - Async/await with error handling
async function generateVideo(productId: string): Promise<Video> {
  try {
    const script = await generateScript(productId);
    const voice = await synthesizeVoice(script);
    const visuals = await generateVisuals(script);
    return await combineAssets(voice, visuals);
  } catch (error) {
    logger.error('Video generation failed', { productId, error });
    throw new VideoGenerationError('Failed to generate video', { cause: error });
  }
}

// ❌ Bad - Callback hell
function generateVideo(productId: string, callback: (error, video) => void) {
  generateScript(productId, (err, script) => {
    if (err) return callback(err, null);
    synthesizeVoice(script, (err, voice) => {
      if (err) return callback(err, null);
      // ... callback hell continues
    });
  });
}
```

## Nest.js Standards

### Module Structure
```typescript
// product.module.ts
@Module({
  imports: [DatabaseModule, CacheModule],
  controllers: [ProductController],
  providers: [ProductService, ProductRanker],
  exports: [ProductService],
})
export class ProductModule {}
```

### Controller Pattern
```typescript
// product.controller.ts
@Controller('products')
@UseGuards(AuthGuard)
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @ApiOperation({ summary: 'Get ranked products' })
  @ApiResponse({ status: 200, type: [ProductDto] })
  async getRankedProducts(
    @Query() query: GetProductsDto,
  ): Promise<ProductDto[]> {
    return this.productService.getRankedProducts(query);
  }

  @Post()
  @ApiOperation({ summary: 'Create product' })
  async createProduct(@Body() dto: CreateProductDto): Promise<ProductDto> {
    return this.productService.create(dto);
  }
}
```

### Service Pattern
```typescript
// product.service.ts
@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly ranker: ProductRanker,
    private readonly cache: CacheService,
  ) {}

  async getRankedProducts(query: GetProductsDto): Promise<Product[]> {
    const cacheKey = `products:ranked:${JSON.stringify(query)}`;

    // Check cache first
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    // Fetch and rank
    const products = await this.productRepo.find({ where: query });
    const ranked = await this.ranker.rank(products);

    // Cache result
    await this.cache.set(cacheKey, ranked, 3600);

    return ranked;
  }
}
```

## Database Standards (Prisma)

### Schema Design
```prisma
// schema.prisma
model Product {
  id              String   @id @default(cuid())
  title           String
  description     String?
  price           Decimal  @db.Decimal(10, 2)
  commission      Decimal  @db.Decimal(5, 2)
  affiliateUrl    String
  network         AffiliateNetwork @relation(fields: [networkId], references: [id])
  networkId       String
  trendScore      Float    @default(0)
  status          ProductStatus @default(ACTIVE)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  videos          Video[]
  blogs           Blog[]
  analytics       ProductAnalytics[]

  @@index([status, trendScore])
  @@index([networkId])
}

enum ProductStatus {
  ACTIVE
  PAUSED
  ARCHIVED
}
```

### Query Patterns
```typescript
// ✅ Good - Efficient query with relations
const products = await prisma.product.findMany({
  where: { status: 'ACTIVE' },
  include: {
    network: true,
    analytics: {
      where: { createdAt: { gte: lastWeek } },
      orderBy: { revenue: 'desc' },
    },
  },
  orderBy: { trendScore: 'desc' },
  take: 10,
});

// ❌ Bad - N+1 query problem
const products = await prisma.product.findMany();
for (const product of products) {
  const network = await prisma.affiliateNetwork.findUnique({
    where: { id: product.networkId },
  });
}
```

## Error Handling

### Custom Error Classes
```typescript
// errors/video-generation.error.ts
export class VideoGenerationError extends Error {
  constructor(
    message: string,
    public readonly context?: Record<string, any>,
  ) {
    super(message);
    this.name = 'VideoGenerationError';
  }
}

// Usage
throw new VideoGenerationError('Pika Labs API failed', {
  productId,
  attempt: 3,
  statusCode: 500,
});
```

### Global Exception Filter
```typescript
// filters/http-exception.filter.ts
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof Error
        ? exception.message
        : 'Internal server error';

    this.logger.error('Exception caught', {
      statusCode: status,
      message,
      path: request.url,
      stack: exception instanceof Error ? exception.stack : undefined,
    });

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

## Logging Standards

### Structured Logging
```typescript
// Use structured logging with context
logger.info('Video generated successfully', {
  productId: product.id,
  duration: 45,
  format: 'mp4',
  size: '12.5MB',
});

logger.error('YouTube upload failed', {
  videoId: video.id,
  platform: 'youtube',
  error: error.message,
  retryAttempt: 2,
});

// ❌ Bad - Unstructured logging
logger.info('Video generated for product ' + product.id);
logger.error('Upload failed: ' + error);
```

### Log Levels
- **error**: System failures, exceptions requiring attention
- **warn**: Degraded functionality, rate limits approaching
- **info**: Normal operations, business events
- **debug**: Detailed debugging information (disabled in production)

## Testing Standards

### Unit Tests
```typescript
// product.service.spec.ts
describe('ProductService', () => {
  let service: ProductService;
  let repo: MockRepository<Product>;
  let ranker: MockProductRanker;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: getRepositoryToken(Product),
          useValue: createMockRepository(),
        },
        {
          provide: ProductRanker,
          useValue: createMockRanker(),
        },
      ],
    }).compile();

    service = module.get(ProductService);
    repo = module.get(getRepositoryToken(Product));
    ranker = module.get(ProductRanker);
  });

  describe('getRankedProducts', () => {
    it('should return ranked products', async () => {
      const mockProducts = [
        { id: '1', trendScore: 0.8 },
        { id: '2', trendScore: 0.6 },
      ];

      repo.find.mockResolvedValue(mockProducts);
      ranker.rank.mockResolvedValue(mockProducts);

      const result = await service.getRankedProducts({});

      expect(result).toEqual(mockProducts);
      expect(repo.find).toHaveBeenCalledTimes(1);
      expect(ranker.rank).toHaveBeenCalledWith(mockProducts);
    });
  });
});
```

### Integration Tests
```typescript
// product.e2e-spec.ts
describe('ProductController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  it('/products (GET)', () => {
    return request(app.getHttpServer())
      .get('/products')
      .expect(200)
      .expect((res) => {
        expect(res.body).toBeInstanceOf(Array);
        expect(res.body[0]).toHaveProperty('id');
        expect(res.body[0]).toHaveProperty('trendScore');
      });
  });

  afterAll(async () => {
    await app.close();
  });
});
```

## API Design Standards

### REST Endpoints
```typescript
// ✅ Good - RESTful design
GET    /products           // List products
GET    /products/:id       // Get specific product
POST   /products           // Create product
PATCH  /products/:id       // Update product
DELETE /products/:id       // Delete product

GET    /products/:id/videos     // Get product videos
POST   /products/:id/generate   // Trigger content generation

// ❌ Bad - Non-RESTful
GET    /getProducts
POST   /createProduct
GET    /product/get/:id
```

### Response Format
```typescript
// Success response
{
  "data": {
    "id": "prod_123",
    "title": "Product Name",
    "price": 29.99
  },
  "meta": {
    "timestamp": "2025-10-31T10:00:00Z"
  }
}

// Error response
{
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "Product with ID prod_123 not found",
    "details": {
      "productId": "prod_123"
    }
  },
  "meta": {
    "timestamp": "2025-10-31T10:00:00Z",
    "requestId": "req_abc123"
  }
}
```

## Security Standards

### Input Validation
```typescript
// Use class-validator
export class CreateProductDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @IsNumber()
  @Min(0)
  @Max(10000)
  price: number;

  @IsUrl()
  affiliateUrl: string;

  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus;
}
```

### Secrets Management
```typescript
// ✅ Good - Use environment variables
const apiKey = process.env.OPENAI_API_KEY;

// ❌ Bad - Hardcoded secrets
const apiKey = 'sk-proj-abc123...';
```

### Rate Limiting
```typescript
// Apply rate limiting to public endpoints
@Controller('products')
@UseGuards(ThrottlerGuard)
export class ProductController {
  @Get()
  @Throttle(10, 60) // 10 requests per 60 seconds
  async getProducts() {
    // ...
  }
}
```

## Performance Standards

### Caching Strategy
```typescript
// Cache frequently accessed data
@Injectable()
export class ProductService {
  private readonly CACHE_TTL = 3600; // 1 hour

  async getRankedProducts(): Promise<Product[]> {
    const cacheKey = 'products:ranked';

    // Try cache first
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    // Compute and cache
    const products = await this.computeRankedProducts();
    await this.cache.set(cacheKey, products, this.CACHE_TTL);

    return products;
  }
}
```

### Database Indexes
```prisma
// Add indexes for frequently queried fields
model Product {
  // ...

  @@index([status, trendScore])     // List ranked active products
  @@index([networkId, status])      // Filter by network
  @@index([createdAt])              // Sort by date
}
```

### Batch Processing
```typescript
// ✅ Good - Batch operations
async function processProducts(productIds: string[]) {
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
  });

  await Promise.all(
    products.map(product => generateContent(product))
  );
}

// ❌ Bad - Sequential processing
async function processProducts(productIds: string[]) {
  for (const id of productIds) {
    const product = await prisma.product.findUnique({ where: { id } });
    await generateContent(product);
  }
}
```

## Documentation Standards

### Code Comments
```typescript
/**
 * Ranks products by profitability using AI scoring algorithm.
 *
 * @param products - Array of products to rank
 * @param options - Ranking options (weights, filters)
 * @returns Products sorted by profitability score (highest first)
 *
 * @example
 * ```typescript
 * const ranked = await ranker.rank(products, {
 *   trendWeight: 0.4,
 *   commissionWeight: 0.6,
 * });
 * ```
 */
async rank(
  products: Product[],
  options: RankingOptions
): Promise<Product[]> {
  // Implementation
}
```

### API Documentation (Swagger)
```typescript
@ApiTags('products')
@Controller('products')
export class ProductController {
  @Get(':id')
  @ApiOperation({
    summary: 'Get product by ID',
    description: 'Retrieves detailed product information including analytics',
  })
  @ApiParam({
    name: 'id',
    description: 'Product ID',
    example: 'prod_123',
  })
  @ApiResponse({
    status: 200,
    description: 'Product found',
    type: ProductDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  async getProduct(@Param('id') id: string): Promise<ProductDto> {
    // Implementation
  }
}
```

## Git Commit Standards

### Conventional Commits
```bash
# Format: <type>(<scope>): <description>

# Features
feat(product): add AI ranking algorithm
feat(video): integrate Pika Labs API

# Bug fixes
fix(youtube): resolve upload timeout issue
fix(analytics): correct revenue calculation

# Refactoring
refactor(content): simplify script generation logic

# Documentation
docs(readme): update setup instructions

# Tests
test(product): add ranking algorithm tests

# CI/CD
ci(docker): optimize build caching
```

### Commit Message Rules
- Use imperative mood ("add" not "added")
- Keep subject line under 72 characters
- Add body for complex changes
- Reference issues: `fixes #123`
- No AI attribution in messages

---

**Status**: Active
**Enforcement**: Required for all code contributions
**Review**: Code reviews enforce these standards before merge
