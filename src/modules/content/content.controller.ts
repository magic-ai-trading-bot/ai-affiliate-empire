import { Controller, Post, Body, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ContentService } from './content.service';
import { GenerateScriptDto } from './dto/generate-script.dto';
import { SearchBlogDto } from './dto/search-blog.dto';
import { BlogSearchService } from './services/blog-search.service';

@ApiTags('content')
@Controller('content')
export class ContentController {
  constructor(
    private readonly contentService: ContentService,
    private readonly blogSearchService: BlogSearchService,
  ) {}

  @Post('script/generate')
  @ApiOperation({ summary: 'Generate video script for product' })
  @ApiResponse({ status: 200, description: 'Script generated successfully' })
  async generateScript(@Body() dto: GenerateScriptDto) {
    return this.contentService.generateScript(dto);
  }

  @Post('blog/generate')
  @ApiOperation({ summary: 'Generate blog post for product' })
  @ApiResponse({ status: 200, description: 'Blog post generated' })
  async generateBlogPost(@Body() body: { productId: string; language?: string }) {
    return this.contentService.generateBlogPost(body.productId, body.language);
  }

  @Get('script/:productId')
  @ApiOperation({ summary: 'Get generated scripts for product' })
  async getScripts(@Param('productId') productId: string) {
    return this.contentService.getScriptsByProduct(productId);
  }

  @Get('blog')
  @ApiOperation({ summary: 'List all published blog articles with pagination' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of published blog articles',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10, max: 50)' })
  async listBlogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedPage = page ? Math.max(1, parseInt(page, 10)) : 1;
    const parsedLimit = limit ? Math.min(50, Math.max(1, parseInt(limit, 10))) : 10;
    return this.contentService.listBlogs(parsedPage, parsedLimit);
  }

  @Get('blog/search')
  @ApiOperation({ summary: 'Search blog articles' })
  @ApiResponse({
    status: 200,
    description: 'Search results with pagination and filtering',
  })
  async searchBlogs(@Query() dto: SearchBlogDto) {
    return this.blogSearchService.search(dto);
  }

  @Get('blog/popular-searches')
  @ApiOperation({ summary: 'Get popular search terms' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of results',
  })
  async getPopularSearches(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    return this.blogSearchService.getPopularSearches(parsedLimit);
  }

  @Get('blog/categories')
  @ApiOperation({ summary: 'Get all blog categories for filtering' })
  async getCategories() {
    return this.blogSearchService.getCategories();
  }
}
