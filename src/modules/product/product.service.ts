import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/database/prisma.service';
import { ProductRanker } from './services/product-ranker.service';
import { AmazonService } from './services/amazon.service';
import { CreateProductDto } from './dto/create-product.dto';
import { GetProductsDto } from './dto/get-products.dto';
import { ProductStatus } from '@prisma/client';

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
        status: status as ProductStatus,
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
      data: {
        ...dto,
        status: dto.status ? (dto.status as ProductStatus) : 'ACTIVE',
      },
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

    // Get or create Amazon network once
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

    // Batch check existing products
    const asins = amazonProducts.map((p) => p.asin).filter(Boolean);
    const existingProducts = await this.prisma.product.findMany({
      where: { asin: { in: asins } },
      select: { asin: true },
    });
    const existingAsins = new Set(existingProducts.map((p: { asin: string | null }) => p.asin));

    // Filter out existing products
    const newProducts = amazonProducts.filter(
      (p) => !existingAsins.has(p.asin)
    );

    if (newProducts.length === 0) {
      console.log('No new products to sync');
      return { synced: 0, products: [] };
    }

    // Bulk insert new products using createMany
    const productsData = newProducts.map((amazonProduct) => ({
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
      status: 'ACTIVE' as const,
    }));

    await this.prisma.product.createMany({
      data: productsData,
      skipDuplicates: true,
    });

    // Fetch created products for ranking
    const createdProducts = await this.prisma.product.findMany({
      where: { asin: { in: newProducts.map((p) => p.asin) } },
    });

    // Rank all new products using optimized bulk ranking
    if (createdProducts.length > 0) {
      const updates = [];
      for (const product of createdProducts) {
        try {
          const scores = await this.ranker.calculateScores({
            ...product,
            price: Number(product.price),
            commission: Number(product.commission),
            category: product.category ?? undefined,
            brand: product.brand ?? undefined
          });
          updates.push({
            where: { id: product.id },
            data: {
              trendScore: scores.trendScore,
              profitScore: scores.profitScore,
              viralityScore: scores.viralityScore,
              overallScore: scores.overallScore,
              lastRankedAt: new Date(),
            },
          });
        } catch (error) {
          console.error(`Error ranking product ${product.id}:`, error);
        }
      }

      if (updates.length > 0) {
        await this.prisma.$transaction(
          updates.map((update) => this.prisma.product.update(update))
        );
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

    const scores = await this.ranker.calculateScores({
      ...product,
      price: Number(product.price),
      commission: Number(product.commission),
      category: product.category ?? undefined,
      brand: product.brand ?? undefined
    });

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

    // Calculate scores for all products in memory
    const updates = [];
    for (const product of products) {
      try {
        const scores = await this.ranker.calculateScores({
          ...product,
          price: Number(product.price),
          commission: Number(product.commission),
          category: product.category ?? undefined,
          brand: product.brand ?? undefined
        });
        updates.push({
          where: { id: product.id },
          data: {
            trendScore: scores.trendScore,
            profitScore: scores.profitScore,
            viralityScore: scores.viralityScore,
            overallScore: scores.overallScore,
            lastRankedAt: new Date(),
          },
        });
      } catch (error) {
        console.error(`Error ranking product ${product.id}:`, error);
      }
    }

    // Bulk update using transaction - 1 query instead of N queries
    if (updates.length > 0) {
      await this.prisma.$transaction(
        updates.map((update) => this.prisma.product.update(update))
      );
    }

    console.log('✅ All products ranked');
  }
}
