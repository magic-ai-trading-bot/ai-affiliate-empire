import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { ProductRanker } from './services/product-ranker.service';
import { AmazonService } from './services/amazon.service';

@Module({
  controllers: [ProductController],
  providers: [ProductService, ProductRanker, AmazonService],
  exports: [ProductService],
})
export class ProductModule {}
