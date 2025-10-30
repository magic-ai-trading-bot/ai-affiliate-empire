import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { GetProductsDto } from './dto/get-products.dto';

@ApiTags('products')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @ApiOperation({ summary: 'Get ranked products' })
  @ApiResponse({ status: 200, description: 'List of ranked products' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'category', required: false, type: String })
  async getRankedProducts(@Query() query: GetProductsDto) {
    return this.productService.getRankedProducts(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiResponse({ status: 200, description: 'Product found' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getProduct(@Param('id') id: string) {
    return this.productService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create product manually' })
  @ApiResponse({ status: 201, description: 'Product created' })
  async createProduct(@Body() dto: CreateProductDto) {
    return this.productService.create(dto);
  }

  @Post('sync/amazon')
  @ApiOperation({ summary: 'Sync products from Amazon PA-API' })
  @ApiResponse({ status: 200, description: 'Products synced' })
  async syncAmazonProducts(@Body() body: { category?: string; keywords?: string }) {
    return this.productService.syncFromAmazon(body.category, body.keywords);
  }

  @Post(':id/rank')
  @ApiOperation({ summary: 'Re-rank product score' })
  @ApiResponse({ status: 200, description: 'Product ranked' })
  async rankProduct(@Param('id') id: string) {
    return this.productService.rankProduct(id);
  }
}
