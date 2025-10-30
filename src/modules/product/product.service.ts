import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/database/prisma.service';
import { ProductRanker } from './services/product-ranker.service';
import { AmazonService } from './services/amazon.service';
import { CreateProductDto } from './dto/create-product.dto';
import { GetProductsDto } from './dto/get-products.dto';

@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ranker: ProductRanker,
    private readonly amazonService: AmazonService,
  ) {}

  async getRankedProducts(query: GetProductsDto) {
    const { limit = 10, category, status = 'ACTIVE' } = query;

    const products = await this.prisma.product.findMany({
      where: {
        status,
        ...(category && { category }),
      },
      include: {
        network: true,
      },
      orderBy: {
        overallScore: 'desc',
      },
      take: limit,
    });

    return products;
  }

  async findById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        network: true,
        videos: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        blogs: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        analytics: {
          orderBy: { date: 'desc' },
          take: 30,
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  async create(dto: CreateProductDto) {
    const product = await this.prisma.product.create({
      data: dto,
      include: {
        network: true,
      },
    });

    // Rank product after creation
    await this.rankProduct(product.id);

    return product;
  }

  async syncFromAmazon(category?: string, keywords?: string) {
    console.log('🔄 Syncing products from Amazon PA-API...');

    const amazonProducts = await this.amazonService.searchProducts({
      keywords: keywords || 'trending',
      category,
    });

    const createdProducts = [];

    for (const amazonProduct of amazonProducts) {
      try {
        // Check if product already exists
        const existing = await this.prisma.product.findUnique({
          where: { asin: amazonProduct.asin },
        });

        if (existing) {
          console.log(`Product ${amazonProduct.asin} already exists, skipping`);
          continue;
        }

        // Get Amazon network
        let network = await this.prisma.affiliateNetwork.findUnique({
          where: { name: 'Amazon Associates' },
        });

        if (!network) {
          network = await this.prisma.affiliateNetwork.create({
            data: {
              name: 'Amazon Associates',
              commissionRate: 3.0,
              status: 'ACTIVE',
            },
          });
        }

        // Create product
        const product = await this.prisma.product.create({
          data: {
            asin: amazonProduct.asin,
            title: amazonProduct.title,
            description: amazonProduct.description,
            price: amazonProduct.price,
            commission: amazonProduct.commission || 3.0,
            affiliateUrl: amazonProduct.affiliateUrl,
            imageUrl: amazonProduct.imageUrl,
            category: amazonProduct.category,
            brand: amazonProduct.brand,
            networkId: network.id,
            status: 'ACTIVE',
          },
        });

        // Rank product
        await this.rankProduct(product.id);

        createdProducts.push(product);
      } catch (error) {
        console.error(`Error creating product ${amazonProduct.asin}:`, error);
      }
    }

    console.log(`✅ Synced ${createdProducts.length} products from Amazon`);

    return {
      synced: createdProducts.length,
      products: createdProducts,
    };
  }

  async rankProduct(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const scores = await this.ranker.calculateScores(product);

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: {
        trendScore: scores.trendScore,
        profitScore: scores.profitScore,
        viralityScore: scores.viralityScore,
        overallScore: scores.overallScore,
        lastRankedAt: new Date(),
      },
    });

    return updated;
  }

  async rankAllProducts() {
    const products = await this.prisma.product.findMany({
      where: { status: 'ACTIVE' },
    });

    console.log(`🎯 Ranking ${products.length} products...`);

    for (const product of products) {
      try {
        await this.rankProduct(product.id);
      } catch (error) {
        console.error(`Error ranking product ${product.id}:`, error);
      }
    }

    console.log('✅ All products ranked');
  }
}
