import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ContentService } from './content.service';
import { GenerateScriptDto } from './dto/generate-script.dto';

@ApiTags('content')
@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

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
}
